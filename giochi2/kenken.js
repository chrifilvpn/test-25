// GABBIE ARITMETICHE (il gioco conosciuto come KenKen): griglia N×N (da 4 a 7) da riempire con le cifre da 1 a N,
// senza ripetizioni in ogni riga e in ogni colonna. La griglia è divisa in gabbie: ogni gabbia mostra un risultato e
// un'operazione (+ − × ÷) e le sue cifre, combinate con quell'operazione, devono dare quel risultato.
// Ogni schema è generato ogni volta e un risolutore controlla che abbia UNA sola soluzione, trovabile con la logica
// (la difficoltà dipende dai ragionamenti che servono). Da soli o in sfida (2-8 sullo stesso schema).
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('./rompicapo-sfida');

const LATI = [4, 5, 6, 7];
const LIVELLI = ['facile', 'medio', 'difficile'];
const AIUTO_MS = 30000;
const RECORD = {};

const bit = (v) => 1 << v;
const conta = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
const unico = (m) => (m && !(m & (m - 1)) ? 31 - Math.clz32(m) : 0);
const cifre = (m) => { const o = []; for (let v = 1; v < 10; v++) if (m & bit(v)) o.push(v); return o; };

// ---------------- generazione ----------------
// quadrato latino a caso (backtracking con l'ordine delle cifre mescolato)
function quadrato(N) {
  const g = new Array(N * N).fill(0);
  const giro = (i) => {
    if (i === N * N) return true;
    const r = Math.floor(i / N), c = i % N;
    for (const v of mescola(Array.from({ length: N }, (_, k) => k + 1))) {
      let ok = true;
      for (let k = 0; k < N && ok; k++) if (g[r * N + k] === v || g[k * N + c] === v) ok = false;
      if (!ok) continue;
      g[i] = v;
      if (giro(i + 1)) return true;
      g[i] = 0;
    }
    return false;
  };
  giro(0);
  return g;
}

// quanto sono grandi le gabbie (probabilità di 1, 2, 3, 4 caselle) per ogni difficoltà
const MISURE = { facile: [0.12, 0.6, 0.28, 0], medio: [0.07, 0.45, 0.36, 0.12], difficile: [0.03, 0.34, 0.4, 0.23] };
function divisione(N, livello) {
  const gabbia = new Array(N * N).fill(-1);
  const gabbie = [];
  const pesi = MISURE[livello];
  for (const i of mescola(Array.from({ length: N * N }, (_, k) => k))) {
    if (gabbia[i] >= 0) continue;
    let x = Math.random(), misura = 1;
    for (let k = 0; k < pesi.length; k++) { if (x < pesi[k]) { misura = k + 1; break; } x -= pesi[k]; }
    const celle = [i]; gabbia[i] = gabbie.length;
    while (celle.length < misura) {
      const vicini = [];
      for (const j of celle) {
        const r = Math.floor(j / N), c = j % N;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < N && cc < N && gabbia[rr * N + cc] < 0) vicini.push(rr * N + cc);
        }
      }
      if (!vicini.length) break;
      const j = caso(vicini); gabbia[j] = gabbie.length; celle.push(j);
    }
    gabbie.push(celle.sort((a, b) => a - b));
  }
  // una casella sola rimasta isolata si unisce, se può, a una gabbia vicina piccola (meno caselle date)
  const singole = gabbie.filter((g) => g.length === 1).length;
  if (singole > Math.ceil(N / 2)) return null;
  return gabbie;
}

// sceglie l'operazione di una gabbia e il risultato
function operazione(celle, sol, opzOp) {
  const v = celle.map((i) => sol[i]);
  if (v.length === 1) return { op: '=', tot: v[0] };
  if (v.length === 2) {
    const [a, b] = [Math.max(...v), Math.min(...v)];
    const scelte = [];
    if (opzOp !== 'piu-meno' && a % b === 0 && Math.random() < 0.75) scelte.push('÷', '÷');
    scelte.push('−', '−', '+');
    if (opzOp !== 'piu-meno') scelte.push('×');
    const op = caso(scelte);
    return { op, tot: op === '÷' ? a / b : op === '−' ? a - b : op === '+' ? a + b : a * b };
  }
  const prod = v.reduce((x, y) => x * y, 1);
  const op = opzOp !== 'piu-meno' && prod <= 2000 && Math.random() < 0.45 ? '×' : '+';
  return { op, tot: op === '×' ? prod : v.reduce((x, y) => x + y, 0) };
}

// ---------------- risolutore ----------------
// prepara le strutture di uno schema: per ogni gabbia le caselle, l'operazione e quali caselle stanno sulla stessa linea
function prepara(N, gabbie) {
  const diGabbia = new Array(N * N).fill(-1);
  gabbie.forEach((g, k) => g.celle.forEach((i) => { diGabbia[i] = k; }));
  const linee = [];
  for (let r = 0; r < N; r++) linee.push(Array.from({ length: N }, (_, c) => r * N + c));
  for (let c = 0; c < N; c++) linee.push(Array.from({ length: N }, (_, r) => r * N + c));
  return { N, gabbie, diGabbia, linee, tutte: (1 << (N + 1)) - 2 };
}

// filtra le cifre possibili di una gabbia: restano solo quelle che compaiono in almeno una combinazione valida
function filtraGabbia(S, cand, g) {
  const { N } = S, k = g.celle.length, celle = g.celle;
  const nuovo = new Array(k).fill(0);
  const val = new Array(k);
  let trovate = 0;
  const vale = () => {
    if (g.op === '+') return val.reduce((a, b) => a + b, 0) === g.tot;
    if (g.op === '×') return val.reduce((a, b) => a * b, 1) === g.tot;
    if (g.op === '−') return Math.abs(val[0] - val[1]) === g.tot;
    if (g.op === '÷') return Math.max(val[0], val[1]) === g.tot * Math.min(val[0], val[1]);
    return val[0] === g.tot;
  };
  const giro = (j, somma, prod) => {
    if (j === k) { if (vale()) { trovate++; for (let x = 0; x < k; x++) nuovo[x] |= bit(val[x]); } return; }
    // potatura per somma e prodotto
    for (const v of cifre(cand[celle[j]])) {
      if (g.op === '+' && somma + v + (k - j - 1) > g.tot) break;
      if (g.op === '×' && g.tot % (prod * v) !== 0) continue;
      let ok = true;
      for (let x = 0; x < j && ok; x++) {
        if (val[x] === v && (Math.floor(celle[x] / N) === Math.floor(celle[j] / N) || celle[x] % N === celle[j] % N)) ok = false;
      }
      if (!ok) continue;
      val[j] = v;
      giro(j + 1, somma + v, prod * v);
    }
  };
  giro(0, 0, 1);
  if (!trovate) return false;
  let cambiato = false;
  for (let x = 0; x < k; x++) {
    const m = cand[celle[x]] & nuovo[x];
    if (m !== cand[celle[x]]) { cand[celle[x]] = m; cambiato = true; }
  }
  return cambiato ? 1 : 0;
}

// propagazione a livelli: 1 = gabbie + cifre già sicure tolte dalla linea; 2 = anche "unico posto nella linea" e coppie
// nude; restituisce false se c'è una contraddizione
function propaga(S, cand, livello) {
  const { linee, gabbie } = S;
  let giri = 0;
  for (;;) {
    let cambiato = false;
    if (++giri > 200) break;
    for (const g of gabbie) {
      const r = filtraGabbia(S, cand, g);
      if (r === false) return false;
      if (r) cambiato = true;
    }
    for (const l of linee) {
      // cifre sicure: si tolgono dalle altre caselle della linea
      for (const i of l) {
        const v = cand[i];
        if (!v) return false;
        if (v & (v - 1)) continue;
        for (const j of l) if (j !== i && cand[j] & v) { cand[j] &= ~v; cambiato = true; if (!cand[j]) return false; }
      }
      if (livello < 2) continue;
      // unico posto: una cifra che nella linea può andare in una sola casella
      for (let v = 1; v <= S.N; v++) {
        let dove = -1, quanti = 0;
        for (const i of l) if (cand[i] & bit(v)) { quanti++; dove = i; }
        if (!quanti) return false;
        if (quanti === 1 && cand[dove] !== bit(v)) { cand[dove] = bit(v); cambiato = true; }
      }
      // coppie nude: due caselle con le stesse due cifre le tolgono al resto della linea
      for (let a = 0; a < l.length; a++) {
        const m = cand[l[a]];
        if (conta(m) !== 2) continue;
        for (let b = a + 1; b < l.length; b++) {
          if (cand[l[b]] !== m) continue;
          for (const j of l) if (j !== l[a] && j !== l[b] && cand[j] & m) { cand[j] &= ~m; cambiato = true; if (!cand[j]) return false; }
        }
      }
    }
    if (!cambiato) break;
  }
  return true;
}
const risolta = (cand) => cand.every((m) => m && !(m & (m - 1)));

// risolve con la logica di un livello (1, 2 o 3 = prova una cifra e vede se porta a una contraddizione)
// restituisce { cand, ordine in cui si scoprono le caselle } oppure null se quel livello non basta
function risolviCon(S, liv, partenza) {
  const cand = partenza ? partenza.slice() : new Array(S.N * S.N).fill(S.tutte);
  const ordine = [], visto = new Set();
  const segna = () => { cand.forEach((m, i) => { if (!(m & (m - 1)) && !visto.has(i)) { visto.add(i); ordine.push(i); } }); };
  for (let giro = 0; giro < 500; giro++) {
    if (!propaga(S, cand, Math.min(liv, 2))) return null;
    segna();
    if (risolta(cand)) return { cand, ordine };
    if (liv < 3) return null;
    let ok = false;
    for (let i = 0; i < cand.length && !ok; i++) {
      if (!(cand[i] & (cand[i] - 1))) continue;
      for (const v of cifre(cand[i])) {
        const prova = cand.slice(); prova[i] = bit(v);
        if (!propaga(S, prova, 2)) { cand[i] &= ~bit(v); ok = true; break; }
      }
    }
    if (!ok) return null;
  }
  return null;
}
// il livello più basso che basta a risolvere lo schema (null se non basta neanche il 3)
function risolviLogica(S, livelloMax = 3, partenza = null) {
  for (let liv = 1; liv <= livelloMax; liv++) {
    const r = risolviCon(S, liv, partenza);
    if (r) return { ...r, livello: liv };
  }
  return null;
}

// conta le soluzioni (fino a "limite") con la logica di livello 2 e la ricerca
function contaSoluzioni(S, limite = 2, nodiMax = 20000) {
  let trovate = 0, nodi = 0;
  const giro = (cand) => {
    if (++nodi > nodiMax || trovate >= limite) return;
    if (!propaga(S, cand, 2)) return;
    let mi = -1, mk = 99;
    for (let i = 0; i < cand.length; i++) { const k = conta(cand[i]); if (k > 1 && k < mk) { mk = k; mi = i; } }
    if (mi < 0) { trovate++; return; }
    for (const v of cifre(cand[mi])) { const c = cand.slice(); c[mi] = bit(v); giro(c); if (trovate >= limite) return; }
  };
  giro(new Array(S.N * S.N).fill(S.tutte));
  return nodi > nodiMax ? -1 : trovate;
}

// genera uno schema: prova finché trova uno schema con una sola soluzione e del livello giusto (con un limite di tempo)
function genera(N, livello, opzOp = 'tutte', ms = 2500) {
  const lv = { facile: 1, medio: 2, difficile: 3 }[livello] || 2;
  const fine = Date.now() + ms;
  let riserva = null;
  for (let tent = 0; ; tent++) {
    if (Date.now() > fine && (riserva || tent > 3000)) break;
    const sol = quadrato(N);
    const celle = divisione(N, livello);
    if (!celle) continue;
    const gabbie = celle.map((c) => ({ celle: c, ...operazione(c, sol, opzOp) }));
    const S = prepara(N, gabbie);
    const r = risolviLogica(S, 3);
    if (!r) continue;
    const ris = { N, gabbie, soluzione: sol, livello: r.livello, ordine: r.ordine };
    if (r.livello === lv) return ris;
    // tiene il più vicino come riserva (meglio più facile che impossibile)
    if (!riserva || Math.abs(r.livello - lv) < Math.abs(riserva.livello - lv)) riserva = ris;
  }
  return riserva;
}

// ---------------- partita ----------------
class Gabbie extends SfidaRompicapo {
  constructor(o) {
    super('kenken', o, 40 * 60000);
    const op = o.opzioni || {};
    this.N = LATI.includes(Number(op.lato)) ? Number(op.lato) : 5;
    this.livello = LIVELLI.includes(op.difficolta) ? op.difficolta : 'facile';
    this.opzOp = op.operazioni === 'piu-meno' ? 'piu-meno' : 'tutte';
    this.mostraErrori = op.errori === 'subito';
    const s = genera(this.N, this.livello, this.opzOp);
    this.gabbie = s.gabbie;
    this.soluzione = s.soluzione;
    this.ordine = s.ordine;
    this.livelloVero = s.livello;
    this.S = prepara(this.N, this.gabbie);
    const NN = this.N * this.N;
    this.tavole = Array.from({ length: this.n }, () => ({ valori: new Array(NN).fill(0), note: new Array(NN).fill(0), indietro: [], avanti: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, ultimoAiuto: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  arriva(p) { super.arriva(p); }
  progresso(i, t) { return t.valori.filter(Boolean).length / t.valori.length; }
  risolta(p, t) { return t.valori.every((v, i) => v === this.soluzione[i]); }
  fraseArrivo(p, t) { return { altri: 'completa lo schema! 🎉', io: 'Schema completato! 🎉' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  // applica una lista di cambi [i, valore, note] e restituisce quella che la annulla
  applica(t, cambi) {
    const prima = cambi.map(([i]) => [i, t.valori[i], t.note[i]]);
    for (const [i, v, n] of cambi) { t.valori[i] = v; t.note[i] = n; }
    return prima;
  }
  registra(t, cambi) {
    const prima = this.applica(t, cambi);
    t.indietro.push(prima); if (t.indietro.length > 500) t.indietro.shift();
    t.avanti = [];
    t.mosse++;
  }

  mossa(p, t, a) {
    const NN = this.N * this.N, N = this.N;
    if (a.tipo === 'annulla' || a.tipo === 'ripeti') {
      const da = a.tipo === 'annulla' ? t.indietro : t.avanti, a2 = a.tipo === 'annulla' ? t.avanti : t.indietro;
      if (!da.length) return { errore: a.tipo === 'annulla' ? 'Non c\'è niente da annullare' : 'Non c\'è niente da ripetere' };
      a2.push(this.applica(t, da.pop()));
      return { ok: true };
    }
    if (a.tipo === 'aiuto') return this.aiuto(p, t);
    if (a.tipo === 'ricomincia') {
      const cambi = [];
      for (let i = 0; i < NN; i++) if (t.valori[i] || t.note[i]) cambi.push([i, 0, 0]);
      if (!cambi.length) return { errore: 'La griglia è già vuota' };
      this.registra(t, cambi);
      return { ok: true };
    }
    const i = Number(a.i), v = Number(a.v);
    if (!Number.isInteger(i) || i < 0 || i >= NN || !Number.isInteger(v) || v < 0 || v > N) return { errore: 'Mossa non valida' };
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
    // mettendo una cifra si tolgono i suoi appunti dalla stessa riga e dalla stessa colonna
    if (v) {
      const r = Math.floor(i / N), c = i % N;
      for (let k = 0; k < N; k++) for (const j of [r * N + k, k * N + c]) if (j !== i && t.note[j] & bit(v) && !cambi.some((x) => x[0] === j)) cambi.push([j, t.valori[j], t.note[j] & ~bit(v)]);
    }
    this.registra(t, cambi);
    if (v && v !== this.soluzione[i]) t.errori = (t.errori || 0) + 1;
    return { ok: true };
  }

  // AIUTO: scrive la cifra giusta in una casella, se c'è prima dove c'è uno sbaglio, poi dove la logica arriva più
  // facilmente (la prima che il risolutore scoprirebbe); costa 30 secondi
  aiuto(p, t) {
    const NN = this.N * this.N;
    let scelta = -1;
    for (let i = 0; i < NN && scelta < 0; i++) if (t.valori[i] && t.valori[i] !== this.soluzione[i]) scelta = i;
    if (scelta < 0) {
      const giuste = t.valori.map((v, i) => (v && v === this.soluzione[i] ? bit(v) : this.S.tutte));
      const r = risolviLogica(this.S, 2, giuste);
      const cand = r ? r.cand : giuste.slice();
      if (!r) propaga(this.S, cand, 2);
      const certe = []; for (let i = 0; i < NN; i++) if (!t.valori[i] && unico(cand[i])) certe.push(i);
      const vuote = []; for (let i = 0; i < NN; i++) if (!t.valori[i]) vuote.push(i);
      // la prima casella nell'ordine del risolutore tra quelle vuote
      const ord = this.ordine.filter((i) => !t.valori[i]);
      scelta = ord.length ? ord[0] : certe.length ? certe[0] : vuote.length ? vuote[0] : -1;
    }
    if (scelta < 0) return { errore: 'Non c\'è niente da aiutare' };
    this.registra(t, [[scelta, this.soluzione[scelta], 0]]);
    t.aiuti++; t.penale += AIUTO_MS;
    t.ultimoAiuto = { cella: scelta, id: t.aiuti };
    const dove = `riga ${Math.floor(scelta / this.N) + 1}, colonna ${(scelta % this.N) + 1}`;
    this.annuncia(p, 'chiede un aiuto (+30 s)', `aiuto: ${this.soluzione[scelta]} in ${dove} (+30 s)`);
    return { ok: true };
  }

  // ---- computer: riempie le caselle nell'ordine in cui le scoprirebbe ragionando, con un ritmo che dipende dal livello
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const secCella = { facile: 3.2, medio: 6, difficile: 9.5 }[this.livello] * Math.sqrt(this.N / 5);
    const NN = this.N * this.N;
    const totale = NN * secCella * 1000 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale, passi: NN + 2 });
  }
  ritmoBot(p, livello, primo) {
    const m = this.pianoBot(p, livello);
    return passoBot(m.totale, m.passi) * (primo ? 2 : 1);
  }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    this.pianoBot(p, livello);
    // prima corregge gli sbagli (i suoi o quelli lasciati da chi c'era prima di lui)
    const sbaglio = t.valori.findIndex((v, i) => v && v !== this.soluzione[i]);
    if (sbaglio >= 0) return { tipo: 'metti', i: sbaglio, v: this.soluzione[sbaglio] };
    const i = this.ordine.find((k) => !t.valori[k]);
    const libera = i != null ? i : t.valori.findIndex((v) => !v);
    if (libera < 0) return { tipo: 'pensa' };
    // il facile ogni tanto sbaglia una cifra (poi se ne accorge e la corregge)
    const svista = { facile: 0.12, medio: 0.04, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) {
      const altre = Array.from({ length: this.N }, (_, k) => k + 1).filter((v) => v !== this.soluzione[libera]);
      return { tipo: 'metti', i: libera, v: caso(altre) };
    }
    return { tipo: 'metti', i: libera, v: this.soluzione[libera] };
  }

  risultatoSolo(t) {
    const chiave = `${this.N}:${this.livello}`;
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
      N: this.N, livello: this.livello, gabbie: this.gabbie, valori: t.valori, note: t.note,
      sbagliate: this.mostraErrori || this.finita || t.fatto != null ? t.valori.map((v, i) => !!v && v !== this.soluzione[i]) : null,
      mostraErrori: this.mostraErrori, aiuti: t.aiuti, ultimoAiuto: t.ultimoAiuto, penale: t.penale,
      puoAnnullare: t.indietro.length > 0, puoRipetere: t.avanti.length > 0,
      soluzione: this.finita ? this.soluzione : null,
      record: this.sfida ? [] : RECORD[`${this.N}:${this.livello}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'kenken',
    nome: 'Gabbie aritmetiche',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Riempi la griglia con le cifre senza ripetizioni: ogni gabbia deve dare il suo risultato con + − × ÷. Da soli o in sfida.',
    alias: ['kenken', 'ken ken', 'kendoku', 'calcudoku', 'mathdoku', 'gabbie', 'sudoku matematico', 'operazioni', 'aritmetica'],
    opzioni: [
      { id: 'lato', nome: 'Griglia', valori: [5, 4, 6, 7], etichette: ['5×5', '4×4 (per iniziare)', '6×6', '7×7 (grande)'], predefinito: 5 },
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile', 'Media', 'Difficile'], predefinito: 'facile' },
      { id: 'operazioni', nome: 'Operazioni', valori: ['tutte', 'piu-meno'], etichette: ['Tutte: + − × ÷', 'Solo + e −'], predefinito: 'tutte' },
      { id: 'errori', nome: 'Errori', valori: ['regole', 'subito'], etichette: ['Segna solo doppioni e gabbie sbagliate', 'Segna subito le cifre sbagliate'], predefinito: 'regole' },
    ],
    regole: [
      'Riempi la griglia N×N con le cifre da 1 a N (da 1 a 5 in una griglia 5×5): in ogni riga e in ogni colonna ogni cifra compare una volta sola.',
      'La griglia è divisa in gabbie dal bordo spesso. Nell\'angolo di ogni gabbia c\'è un risultato con un\'operazione: le cifre della gabbia, combinate con quell\'operazione, devono dare quel risultato. Per esempio "12×" su tre caselle può essere 1·3·4 oppure 2·2·3 (se i due 2 non sono sulla stessa riga o colonna).',
      'Nelle gabbie di due caselle con − e ÷ si parte dalla cifra più grande: "2−" può essere 3 e 1 oppure 1 e 3. Una gabbia di una sola casella ti dà già la cifra. In una gabbia la stessa cifra può ripetersi, se non è sulla stessa riga o colonna.',
      'Ogni schema è generato al momento e un risolutore controlla che abbia una sola soluzione, trovabile ragionando. Facile: bastano le gabbie e le cifre già messe. Media: servono anche i ragionamenti su righe e colonne (l\'unico posto per una cifra, le coppie). Difficile: a volte bisogna provare un\'ipotesi e vedere che porta a una contraddizione.',
      'Comandi: clicca una casella (o spostati con le frecce) e scrivi la cifra con la tastiera o con i tasti sotto la griglia; 0, Canc o Backspace cancellano. Con "Appunti" (tasto N o barra spaziatrice) scrivi cifre piccole come promemoria. Ctrl+Z annulla, Ctrl+Y ripete. Le cifre doppie sulla stessa riga o colonna e le gabbie complete sbagliate si colorano di rosso.',
      '💡 Aiuto: scrive la cifra giusta in una casella (prima corregge un tuo sbaglio, se c\'è) ma aggiunge 30 secondi al tuo tempo.',
      'Sfida (da 2 a 8): tutti ricevono lo stesso schema e lo risolvono ognuno sulla propria griglia; degli altri vedi solo a che punto sono. Vince chi finisce prima (con gli aiuti nel tempo). Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere. Chi è via troppo a lungo si ritira; c\'è un limite di 40 minuti.',
      'Il computer ragiona come una persona e riempie una casella alla volta: il facile è lento e ogni tanto sbaglia una cifra (poi la corregge), il medio ci mette quanto un buon giocatore, il difficile è veloce. Il tempo dipende dalla grandezza e dalla difficoltà dello schema.',
    ],
  },
  crea: (o) => new Gabbie(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { genera, prepara, risolviLogica, contaSoluzioni, quadrato, propaga, LATI, LIVELLI },
};
