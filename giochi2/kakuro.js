// KAKURO (le "parole crociate dei numeri"): ogni fila di caselle bianche ha una somma scritta nella casella nera
// davanti (a sinistra per le file orizzontali, sopra per quelle verticali). Si scrivono le cifre da 1 a 9 in modo che
// ogni fila dia la sua somma, senza ripetere una cifra nella stessa fila.
// Gli schemi sono generati da un risolutore (generatore qui sotto) e salvati, già verificati, in kakuro-dati.js:
// ognuno ha UNA sola soluzione e la difficoltà dice quali ragionamenti servono. A ogni partita lo schema può essere
// anche ruotato sulla diagonale o "rovesciato" (ogni cifra d diventa 10 − d): la soluzione resta unica.
// Da soli o in sfida (2-8 sullo stesso schema: vince chi finisce prima).
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('./rompicapo-sfida');

const GRANDEZZE = { piccola: 8, media: 10, grande: 12 };
const LIVELLI = ['facile', 'medio', 'difficile'];
const AIUTO_MS = 30000;
const RECORD = {};
const NERA = -1;

const bit = (v) => 1 << v;
const conta = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
const cifre = (m) => { const o = []; for (let v = 1; v < 10; v++) if (m & bit(v)) o.push(v); return o; };
const TUTTE = 0b1111111110;

// COMBO[k][s]: gli insiemi di k cifre diverse (maschere di bit) che sommano a s
const COMBO = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 0; m < 1024; m += 2) { let s = 0; for (const v of cifre(m)) s += v; COMBO[conta(m)][s].push(m); }
const SOMMA = new Int16Array(1024); for (let m = 0; m < 1024; m++) for (const v of cifre(m)) SOMMA[m] += v;

// ---------------- schema ----------------
// da una griglia (NERA o cifra della soluzione) ricava le file: { celle, somma, dir, capo }
function file(L, g) {
  const out = [];
  for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) {
    const i = r * L + c;
    if (g[i] !== NERA) continue;
    for (const [dir, dr, dc] of [['o', 0, 1], ['v', 1, 0]]) {
      const celle = [];
      for (let rr = r + dr, cc = c + dc; rr < L && cc < L && g[rr * L + cc] !== NERA; rr += dr, cc += dc) celle.push(rr * L + cc);
      if (celle.length) out.push({ celle, somma: celle.reduce((a, j) => a + g[j], 0), dir, capo: i });
    }
  }
  return out;
}
function prepara(L, g) {
  const fl = file(L, g);
  const diCella = Array.from({ length: L * L }, () => []);
  fl.forEach((f, k) => f.celle.forEach((i) => diCella[i].push(k)));
  const bianche = []; for (let i = 0; i < L * L; i++) if (g[i] !== NERA) bianche.push(i);
  return { L, file: fl, diCella, bianche };
}

// ---------------- risolutore ----------------
// filtro di una fila "da principiante": restano le cifre che stanno in almeno una combinazione possibile della somma
// (che contiene le cifre già sicure); le cifre sicure si tolgono dalle altre caselle della fila
function filtraSemplice(f, cand) {
  let sicure = 0, cambiato = false;
  for (const i of f.celle) { const m = cand[i]; if (!m) return false; if (!(m & (m - 1))) { if (sicure & m) return false; sicure |= m; } }
  let unione = 0;
  for (const M of COMBO[f.celle.length][f.somma]) {
    if ((M & sicure) !== sicure) continue;
    // ogni casella deve poter prendere almeno una cifra della combinazione
    if (f.celle.every((i) => cand[i] & M)) unione |= M;
  }
  if (!unione) return false;
  for (const i of f.celle) {
    let m = cand[i] & unione;
    if (m & (m - 1)) m &= ~sicure;
    if (!m) return false;
    if (m !== cand[i]) { cand[i] = m; cambiato = true; }
  }
  return cambiato ? 1 : 0;
}

// filtro completo di una fila (coerenza esatta): una cifra resta in una casella solo se esiste un modo di riempire
// tutta la fila (cifre diverse, somma giusta) con quella cifra lì. Programmazione dinamica sulle cifre usate.
const STATI = Array.from({ length: 11 }, () => new Int32Array(1024));
const BUONO = Array.from({ length: 11 }, () => new Uint8Array(1024));
let timbro = 0;
const VISTO = Array.from({ length: 11 }, () => new Int32Array(1024));
const LISTE = Array.from({ length: 11 }, () => new Int32Array(1024));
const NLISTA = new Int32Array(11);
const VALIDE = new Uint8Array(1024);
function filtraCompleto(f, cand) {
  const k = f.celle.length;
  const combo = COMBO[k][f.somma];
  if (!combo.length) return false;
  let unione = 0;
  for (const M of combo) { VALIDE[M] = 1; unione |= M; }
  timbro++;
  NLISTA[0] = 1; LISTE[0][0] = 0; VISTO[0][0] = timbro;
  for (let j = 0; j < k; j++) {
    const cj = cand[f.celle[j]] & unione;
    NLISTA[j + 1] = 0;
    for (let x = 0; x < NLISTA[j]; x++) {
      const u = LISTE[j][x];
      let libere = cj & ~u;
      while (libere) {
        const b = libere & -libere; libere &= libere - 1;
        const nu = u | b;
        if (VISTO[j + 1][nu] !== timbro) { VISTO[j + 1][nu] = timbro; LISTE[j + 1][NLISTA[j + 1]++] = nu; BUONO[j + 1][nu] = 0; }
      }
    }
  }
  // all'indietro: quali stati portano a una combinazione valida
  for (let x = 0; x < NLISTA[k]; x++) { const u = LISTE[k][x]; BUONO[k][u] = VALIDE[u]; }
  for (let j = k - 1; j >= 0; j--) {
    const cj = cand[f.celle[j]] & unione;
    for (let x = 0; x < NLISTA[j]; x++) {
      const u = LISTE[j][x];
      let ok = 0, libere = cj & ~u;
      while (libere) {
        const b = libere & -libere; libere &= libere - 1;
        if (VISTO[j + 1][u | b] === timbro && BUONO[j + 1][u | b]) { ok = 1; break; }
      }
      BUONO[j][u] = ok;
    }
  }
  for (const M of combo) VALIDE[M] = 0;
  // in avanti solo sugli stati buoni: le cifre che compaiono sono quelle possibili
  const sup = new Array(k).fill(0);
  let vivi = BUONO[0][0] ? [0] : [];
  if (!vivi.length) return false;
  for (let j = 0; j < k; j++) {
    const cj = cand[f.celle[j]] & unione;
    const prossimi = new Set();
    for (const u of vivi) {
      let libere = cj & ~u;
      while (libere) {
        const b = libere & -libere; libere &= libere - 1;
        if (VISTO[j + 1][u | b] === timbro && BUONO[j + 1][u | b]) { sup[j] |= b; prossimi.add(u | b); }
      }
    }
    vivi = [...prossimi];
  }
  let cambiato = false;
  for (let j = 0; j < k; j++) {
    const i = f.celle[j];
    if (!sup[j]) return false;
    if (sup[j] !== cand[i]) { cand[i] = sup[j]; cambiato = true; }
  }
  return cambiato ? 1 : 0;
}

// propaga fino a che non cambia più niente; livello 1 = filtro semplice, 2 = filtro completo
function propaga(S, cand, livello, coda = null) {
  const filtro = livello >= 2 ? filtraCompleto : filtraSemplice;
  const nf = S.file.length;
  const inCoda = new Uint8Array(nf);
  const lista = coda ? coda.slice() : Array.from({ length: nf }, (_, k) => k);
  for (const k of lista) inCoda[k] = 1;
  let giri = 0;
  while (lista.length) {
    if (++giri > 20000) break;
    const k = lista.shift(); inCoda[k] = 0;
    const f = S.file[k];
    const prima = f.celle.map((i) => cand[i]);
    const r = filtro(f, cand);
    if (r === false) return false;
    if (!r) continue;
    f.celle.forEach((i, j) => {
      if (cand[i] === prima[j]) return;
      for (const k2 of S.diCella[i]) if (k2 !== k && !inCoda[k2]) { inCoda[k2] = 1; lista.push(k2); }
    });
  }
  return true;
}
const finita = (S, cand) => S.bianche.every((i) => !(cand[i] & (cand[i] - 1)));
function candIniziali(S) { const cand = new Array(S.L * S.L).fill(0); for (const i of S.bianche) cand[i] = TUTTE; return cand; }

// risolve con un livello di logica (3 = filtro completo + "se metto questa cifra arrivo a una contraddizione")
function risolviCon(S, liv, partenza = null) {
  const cand = partenza ? partenza.slice() : candIniziali(S);
  const ordine = [], visto = new Set();
  const segna = () => { for (const i of S.bianche) if (!(cand[i] & (cand[i] - 1)) && !visto.has(i)) { visto.add(i); ordine.push(i); } };
  for (let giro = 0; giro < 2000; giro++) {
    if (!propaga(S, cand, liv)) return null;
    segna();
    if (finita(S, cand)) return { cand, ordine };
    if (liv < 3) return null;
    let ok = false;
    for (const i of S.bianche) {
      if (!(cand[i] & (cand[i] - 1))) continue;
      for (const v of cifre(cand[i])) {
        const prova = cand.slice(); prova[i] = bit(v);
        if (!propaga(S, prova, 2, S.diCella[i])) { cand[i] &= ~bit(v); ok = true; break; }
      }
      if (ok) break;
    }
    if (!ok) return null;
  }
  return null;
}
function risolviLogica(S, livelloMax = 3, partenza = null) {
  for (let liv = 1; liv <= livelloMax; liv++) { const r = risolviCon(S, liv, partenza); if (r) return { ...r, livello: liv }; }
  return null;
}
// quante caselle restano incerte dopo la logica di un livello (serve al generatore per migliorare lo schema)
function incerte(S, liv) {
  const cand = candIniziali(S);
  if (liv >= 3) { const r = risolviCon(S, 3); if (r) return { n: 0, cand: r.cand }; }
  if (!propaga(S, cand, Math.min(liv, 2))) return { n: 1e9, cand };
  return { n: S.bianche.filter((i) => cand[i] & (cand[i] - 1)).length, cand };
}

// conta le soluzioni (fino a "limite") con il filtro completo e la ricerca; restituisce anche una soluzione diversa
function contaSoluzioni(S, limite = 2, nodiMax = 200000) {
  let trovate = 0, nodi = 0;
  const soluzioni = [];
  const giro = (cand) => {
    if (++nodi > nodiMax || trovate >= limite) return;
    if (!propaga(S, cand, 2)) return;
    let mi = -1, mk = 99;
    for (const i of S.bianche) { const k = conta(cand[i]); if (k > 1 && k < mk) { mk = k; mi = i; } }
    if (mi < 0) { trovate++; soluzioni.push(cand.map((m) => (m ? 31 - Math.clz32(m) : 0))); return; }
    for (const v of cifre(cand[mi])) { const c = cand.slice(); c[mi] = bit(v); giro(c); if (trovate >= limite) return; }
  };
  giro(candIniziali(S));
  return { soluzioni: nodi > nodiMax ? -1 : trovate, esempi: soluzioni };
}

// ---------------- generatore (usato per creare kakuro-dati.js e nei test) ----------------
// disegno delle caselle nere: simmetrico (rotazione di mezzo giro), file lunghe da 2 a 9, caselle bianche collegate
function disegno(L, nere = 0.24) {
  for (let tent = 0; tent < 2000; tent++) {
    const g = new Array(L * L).fill(0);
    for (let k = 0; k < L; k++) { g[k] = NERA; g[k * L] = NERA; }
    const metti = (r, c) => { g[r * L + c] = NERA; g[(L - r) * L + (L - c)] = NERA; };
    const interne = (L - 1) * (L - 1);
    for (let k = 0; k < interne * nere / 2; k++) metti(1 + Math.floor(Math.random() * (L - 1)), 1 + Math.floor(Math.random() * (L - 1)));
    // sistema le file da una casella (e quelle più lunghe di 9 o di "lungaMax")
    const lungaMax = Math.min(9, L - 1);
    for (let giro = 0; giro < 50; giro++) {
      let cambiato = false;
      for (let r = 1; r < L; r++) for (let c = 1; c < L; c++) {
        if (g[r * L + c] === NERA) continue;
        let o = 1, v = 1;
        for (let x = c - 1; x >= 1 && g[r * L + x] !== NERA; x--) o++;
        for (let x = c + 1; x < L && g[r * L + x] !== NERA; x++) o++;
        for (let x = r - 1; x >= 1 && g[x * L + c] !== NERA; x--) v++;
        for (let x = r + 1; x < L && g[x * L + c] !== NERA; x++) v++;
        if (o === 1 || v === 1) { metti(r, c); cambiato = true; }
      }
      for (const f of file(L, g.map((x) => (x === NERA ? NERA : 1)))) {
        if (f.celle.length > lungaMax) { const i = f.celle[1 + Math.floor(Math.random() * (f.celle.length - 2))]; metti(Math.floor(i / L), i % L); cambiato = true; }
      }
      if (!cambiato) break;
    }
    const bianche = []; for (let i = 0; i < L * L; i++) if (g[i] !== NERA) bianche.push(i);
    if (bianche.length < (L - 1) * (L - 1) * 0.55) continue;
    // tutte collegate
    const visto = new Set([bianche[0]]), coda = [bianche[0]];
    while (coda.length) {
      const i = coda.pop(), r = Math.floor(i / L), c = i % L;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const j = (r + dr) * L + c + dc; if (r + dr < L && c + dc < L && g[j] !== NERA && !visto.has(j)) { visto.add(j); coda.push(j); } }
    }
    if (visto.size !== bianche.length) continue;
    return g;
  }
  return null;
}
// riempie le caselle bianche con cifre a caso (diverse in ogni fila)
function riempi(L, g) {
  const S = prepara(L, g.map((x) => (x === NERA ? NERA : 1)));
  const sol = g.map((x) => (x === NERA ? NERA : 0));
  const ordine = S.bianche.slice();
  let nodi = 0;
  const giro = (k) => {
    if (k === ordine.length) return true;
    if (++nodi > 20000) return false;
    const i = ordine[k];
    let usate = 0;
    for (const f of S.diCella[i]) for (const j of S.file[f].celle) if (sol[j] > 0) usate |= bit(sol[j]);
    for (const v of mescola([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (usate & bit(v)) continue;
      sol[i] = v;
      if (giro(k + 1)) return true;
    }
    sol[i] = 0;
    return false;
  };
  return giro(0) ? sol : null;
}
// difficoltà di uno schema: facile = il filtro semplice delle combinazioni scopre almeno il 60% delle caselle (o tutte);
// medio = serve il filtro completo;
// difficile = il filtro semplice da solo scopre meno di un quarto delle caselle, oppure serve ragionare per assurdo.
// null = la logica non basta (o la soluzione non è unica)
function grado(S) {
  const r = risolviLogica(S, 3);
  if (!r) return null;
  if (r.livello === 1) return { livello: 'facile', ordine: r.ordine, quota: 1 };
  const cand = candIniziali(S);
  propaga(S, cand, 1);
  const quota = S.bianche.filter((i) => !(cand[i] & (cand[i] - 1))).length / S.bianche.length;
  return { livello: r.livello === 3 || quota < 0.25 ? 'difficile' : quota >= 0.6 ? 'facile' : 'medio', ordine: r.ordine, quota };
}
// genera uno schema: riempie a caso e poi cambia una cifra alla volta dove la logica non arriva, finché lo schema si
// risolve tutto ragionando (quindi ha una sola soluzione). Per il facile si usa solo il filtro semplice.
// ms = limite di tempo. Restituisce lo schema con la sua difficoltà (che può non essere quella chiesta).
function genera(L, livello, ms = 3000) {
  const lv = livello === 'facile' ? 1 : 2;
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    const g = disegno(L, L <= 8 ? 0.2 : 0.24);
    if (!g) continue;
    let sol = riempi(L, g);
    if (!sol) continue;
    let S = prepara(L, sol);
    let stima = incerte(S, lv);
    for (let passo = 0; passo < 300 * L && stima.n > 0 && Date.now() < fine; passo++) {
      const dubbie = S.bianche.filter((i) => stima.cand[i] & (stima.cand[i] - 1));
      const i = dubbie.length ? caso(dubbie) : caso(S.bianche);
      let usate = 0;
      for (const f of S.diCella[i]) for (const j of S.file[f].celle) if (j !== i) usate |= bit(sol[j]);
      const scelte = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !(usate & bit(v)) && v !== sol[i]);
      if (!scelte.length) continue;
      const prova = sol.slice(); prova[i] = caso(scelte);
      const S2 = prepara(L, prova);
      const s2 = incerte(S2, lv);
      if (s2.n <= stima.n || Math.random() < 0.05) { sol = prova; S = S2; stima = s2; }
    }
    if (stima.n > 0) continue;
    const gr = grado(S);
    if (!gr) continue;
    return { L, griglia: sol, livello: gr.livello, ordine: gr.ordine, quota: gr.quota };
  }
  return null;
}

// ---------------- codifica degli schemi salvati ----------------
// una riga di testo: '#' nera, '1'-'9' la cifra della soluzione
const codifica = (g) => g.map((x) => (x === NERA ? '#' : String(x))).join('');
const decodifica = (t) => t.split('').map((x) => (x === '#' ? NERA : Number(x)));
// varianti che non cambiano la difficoltà: scambio righe/colonne e cifre rovesciate (d → 10 − d)
function variante(L, g, trasposta, rovescia) {
  const out = new Array(L * L);
  for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) {
    const x = g[trasposta ? c * L + r : r * L + c];
    out[r * L + c] = x === NERA ? NERA : rovescia ? 10 - x : x;
  }
  return out;
}

// ---------------- partita ----------------
let DATI = null;
const dati = () => DATI || (DATI = require('./kakuro-dati'));

class Kakuro extends SfidaRompicapo {
  constructor(o) {
    super('kakuro', o, 45 * 60000);
    const op = o.opzioni || {};
    this.grandezza = GRANDEZZE[op.grandezza] ? op.grandezza : 'piccola';
    this.livello = LIVELLI.includes(op.difficolta) ? op.difficolta : 'facile';
    this.mostraErrori = op.errori === 'subito';
    this.L = GRANDEZZE[this.grandezza];
    const lista = dati()[`${this.L}:${this.livello}`];
    const base = decodifica(caso(lista));
    this.soluzione = variante(this.L, base, Math.random() < 0.5, Math.random() < 0.5);
    this.S = prepara(this.L, this.soluzione);
    const r = risolviLogica(this.S, 3);
    this.ordine = r ? r.ordine : this.S.bianche.slice();
    // le somme da mostrare: per ogni casella nera [somma in orizzontale, somma in verticale] (0 = niente)
    this.somme = {};
    for (const f of this.S.file) { const s = (this.somme[f.capo] = this.somme[f.capo] || [0, 0]); s[f.dir === 'o' ? 0 : 1] = f.somma; }
    const NN = this.L * this.L;
    this.tavole = Array.from({ length: this.n }, () => ({ valori: new Array(NN).fill(0), note: new Array(NN).fill(0), indietro: [], avanti: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, ultimoAiuto: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) { return this.S.bianche.filter((k) => t.valori[k]).length / this.S.bianche.length; }
  risolta(p, t) { return this.S.bianche.every((i) => t.valori[i] === this.soluzione[i]); }
  fraseArrivo() { return { altri: 'completa il kakuro! 🎉', io: 'Kakuro completato! 🎉' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  applica(t, cambi) {
    const prima = cambi.map(([i]) => [i, t.valori[i], t.note[i]]);
    for (const [i, v, n] of cambi) { t.valori[i] = v; t.note[i] = n; }
    return prima;
  }
  registra(t, cambi) {
    t.indietro.push(this.applica(t, cambi)); if (t.indietro.length > 500) t.indietro.shift();
    t.avanti = []; t.mosse++;
  }

  mossa(p, t, a) {
    const NN = this.L * this.L;
    if (a.tipo === 'annulla' || a.tipo === 'ripeti') {
      const da = a.tipo === 'annulla' ? t.indietro : t.avanti, a2 = a.tipo === 'annulla' ? t.avanti : t.indietro;
      if (!da.length) return { errore: a.tipo === 'annulla' ? 'Non c\'è niente da annullare' : 'Non c\'è niente da ripetere' };
      a2.push(this.applica(t, da.pop()));
      return { ok: true };
    }
    if (a.tipo === 'aiuto') return this.aiuto(p, t);
    if (a.tipo === 'ricomincia') {
      const cambi = [];
      for (const i of this.S.bianche) if (t.valori[i] || t.note[i]) cambi.push([i, 0, 0]);
      if (!cambi.length) return { errore: 'La griglia è già vuota' };
      this.registra(t, cambi);
      return { ok: true };
    }
    const i = Number(a.i), v = Number(a.v);
    if (!Number.isInteger(i) || i < 0 || i >= NN || !Number.isInteger(v) || v < 0 || v > 9) return { errore: 'Mossa non valida' };
    if (this.soluzione[i] === NERA) return { errore: 'Quella è una casella nera' };
    if (a.tipo === 'nota') {
      if (!v) { if (!t.note[i]) return { errore: 'Niente da cancellare' }; this.registra(t, [[i, t.valori[i], 0]]); return { ok: true }; }
      if (t.valori[i]) return { errore: 'La casella ha già una cifra' };
      this.registra(t, [[i, 0, t.note[i] ^ bit(v)]]);
      return { ok: true };
    }
    if (a.tipo !== 'metti') return { errore: 'Mossa non valida' };
    if (t.valori[i] === v && v) return { ok: true };
    if (!v && !t.valori[i] && !t.note[i]) return { ok: true };
    const cambi = [[i, v, v ? t.note[i] : 0]];
    // la cifra messa si toglie dagli appunti delle sue due file
    if (v) for (const k of this.S.diCella[i]) for (const j of this.S.file[k].celle) if (j !== i && t.note[j] & bit(v) && !cambi.some((x) => x[0] === j)) cambi.push([j, t.valori[j], t.note[j] & ~bit(v)]);
    this.registra(t, cambi);
    return { ok: true };
  }

  // AIUTO: corregge uno sbaglio oppure scrive la cifra della prima casella che il ragionamento scopre; +30 secondi
  aiuto(p, t) {
    let scelta = this.S.bianche.find((i) => t.valori[i] && t.valori[i] !== this.soluzione[i]);
    if (scelta == null) scelta = this.ordine.find((i) => !t.valori[i]);
    if (scelta == null) scelta = this.S.bianche.find((i) => !t.valori[i]);
    if (scelta == null) return { errore: 'Non c\'è niente da aiutare' };
    this.registra(t, [[scelta, this.soluzione[scelta], 0]]);
    t.aiuti++; t.penale += AIUTO_MS;
    t.ultimoAiuto = { cella: scelta, id: t.aiuti };
    this.annuncia(p, 'chiede un aiuto (+30 s)', `aiuto: ${this.soluzione[scelta]} nella casella che lampeggia (+30 s)`);
    return { ok: true };
  }

  // !win + parola segreta: la cifra giusta di una casella (prima uno sbaglio da correggere, poi la prossima del ragionamento)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const sbaglio = this.S.bianche.find((i) => t.valori[i] && t.valori[i] !== this.soluzione[i]);
    let i = sbaglio != null ? sbaglio : this.ordine.find((k) => !t.valori[k]);
    if (i == null) i = this.S.bianche.find((k) => !t.valori[k]);
    if (i == null) return null;
    return `💡 Riga ${Math.floor(i / this.L) + 1}, colonna ${(i % this.L) + 1}: ${sbaglio != null ? `correggi in ${this.soluzione[i]}` : this.soluzione[i]}`;
  }

  // ---- computer: riempie le caselle nell'ordine del ragionamento, a un ritmo che dipende dal suo livello
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const secCella = { facile: 3.5, medio: 6.5, difficile: 10 }[this.livello];
    const nb = this.S.bianche.length;
    const totale = nb * secCella * 1000 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale, passi: nb + 2 });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    this.pianoBot(p, livello);
    const sbaglio = this.S.bianche.find((i) => t.valori[i] && t.valori[i] !== this.soluzione[i]);
    if (sbaglio != null) return { tipo: 'metti', i: sbaglio, v: this.soluzione[sbaglio] };
    let i = this.ordine.find((k) => !t.valori[k]);
    if (i == null) i = this.S.bianche.find((k) => !t.valori[k]);
    if (i == null) return { tipo: 'pensa' };
    const svista = { facile: 0.12, medio: 0.04, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) return { tipo: 'metti', i, v: caso([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== this.soluzione[i])) };
    return { tipo: 'metti', i, v: this.soluzione[i] };
  }

  risultatoSolo(t) {
    const chiave = `${this.L}:${this.livello}`;
    const lista = (RECORD[chiave] = RECORD[chiave] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    return super.risultatoSolo(t);
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      L: this.L, grandezza: this.grandezza, livello: this.livello,
      nere: this.soluzione.map((x) => x === NERA), somme: this.somme, valori: t.valori, note: t.note,
      sbagliate: this.mostraErrori || this.finita || t.fatto != null ? t.valori.map((v, i) => !!v && v !== this.soluzione[i]) : null,
      mostraErrori: this.mostraErrori, aiuti: t.aiuti, ultimoAiuto: t.ultimoAiuto, penale: t.penale,
      puoAnnullare: t.indietro.length > 0, puoRipetere: t.avanti.length > 0,
      soluzione: this.finita ? this.soluzione : null,
      record: this.sfida ? [] : RECORD[`${this.L}:${this.livello}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'kakuro',
    nome: 'Kakuro',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Le parole crociate dei numeri: ogni fila deve dare la sua somma, senza ripetere le cifre. Da soli o in sfida.',
    alias: ['kakuro', 'cross sums', 'somme crociate', 'parole crociate dei numeri', 'kakro', 'somme', 'numeri crociati'],
    opzioni: [
      { id: 'grandezza', nome: 'Griglia', valori: ['piccola', 'media', 'grande'], etichette: ['Piccola (8×8)', 'Media (10×10)', 'Grande (12×12)'], predefinito: 'piccola' },
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile', 'Media', 'Difficile'], predefinito: 'facile' },
      { id: 'errori', nome: 'Errori', valori: ['regole', 'subito'], etichette: ['Segna solo doppioni e somme sbagliate', 'Segna subito le cifre sbagliate'], predefinito: 'regole' },
    ],
    regole: [
      'Scrivi una cifra da 1 a 9 in ogni casella bianca. Ogni fila di caselle bianche (in orizzontale e in verticale) ha una somma, scritta nella casella nera che la precede: il numero in alto a destra è la somma della fila orizzontale che parte lì, quello in basso a sinistra è la somma della fila verticale sotto.',
      'Le cifre di una fila devono dare la sua somma e devono essere tutte diverse: "4 in due caselle" può essere solo 1 + 3 (non 2 + 2).',
      'Trucco: alcune somme hanno una sola combinazione (3 in due caselle = 1 + 2, 17 in due = 8 + 9, 6 in tre = 1 + 2 + 3…). Il riquadro "Combinazioni" mostra tutte le combinazioni possibili delle due file della casella scelta; quelle barrate non vanno più bene con le cifre che hai già scritto.',
      'Ogni schema è stato creato da un risolutore e ha una sola soluzione, che si trova ragionando. Facile: bastano le combinazioni delle somme. Media: bisogna incrociare le combinazioni con le cifre già messe e i posti dove possono andare. Difficile: a volte serve fare un\'ipotesi e vedere che porta a una contraddizione. Griglie 8×8, 10×10 o 12×12.',
      'Comandi: clicca una casella bianca (o spostati con le frecce) e scrivi la cifra con la tastiera o con i tasti accanto alla griglia; 0, Canc o Backspace cancellano. Con "Appunti" (tasto N o barra spaziatrice) scrivi cifre piccole come promemoria. Ctrl+Z annulla, Ctrl+Y ripete. Le cifre doppie in una fila e le file complete con la somma sbagliata diventano rosse.',
      '💡 Aiuto: scrive la cifra giusta in una casella (prima corregge un tuo sbaglio, se c\'è) ma aggiunge 30 secondi al tuo tempo.',
      'Sfida (da 2 a 8): tutti ricevono lo stesso schema e lo risolvono ognuno sulla propria griglia; degli altri vedi solo a che punto sono. Vince chi finisce prima (con gli aiuti nel tempo). Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere. Chi è via troppo a lungo si ritira; c\'è un limite di 45 minuti.',
      'Il computer ragiona e riempie una casella alla volta: il facile è lento e ogni tanto sbaglia (poi corregge), il medio ci mette quanto un buon giocatore, il difficile è veloce. Il tempo dipende dalla grandezza e dalla difficoltà dello schema.',
    ],
  },
  crea: (o) => new Kakuro(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { genera, grado, prepara, file, risolviLogica, risolviCon, contaSoluzioni, codifica, decodifica, variante, disegno, riempi, COMBO, GRANDEZZE, LIVELLI, NERA, dati },
};
