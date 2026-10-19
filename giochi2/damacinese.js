// DAMA CINESE: tavola a stella di 121 buche, sei punte da 10. Ognuno parte da una punta con 10 biglie e deve
// portarle tutte nella punta opposta. A turno si muove una biglia: di un passo in una buca vicina libera, oppure con
// uno o più salti (a catena) sopra una biglia qualsiasi vicina, atterrando nella buca libera subito dietro.
// Vince chi riempie per primo la punta opposta (se qualche buca è occupata da biglie avversarie che non se ne vanno,
// basta riempire tutte le altre). In 2, 3, 4 o 6.
//
// Coordinate cubiche (q, r, s) con q + r + s = 0: la stella sono le buche con tutte le coordinate ≥ -4 (triangolo)
// oppure tutte ≤ 4 (triangolo rovesciato). Le punte: q > 4, s < -4, r > 4, q < -4, s > 4, r < -4 (in giro).
const CELLE = [];
for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++) {
  const s = -q - r;
  if (s < -8 || s > 8) continue;
  if ((q >= -4 && r >= -4 && s >= -4) || (q <= 4 && r <= 4 && s <= 4)) CELLE.push([q, r, s]);
}
const INDICE = new Map(CELLE.map((c, i) => [c.join(','), i]));
const DIR = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
const VICINI = CELLE.map(([q, r, s]) => DIR.map(([a, b, c]) => { const k = INDICE.get(`${q + a},${r + b},${s + c}`); return k === undefined ? -1 : k; }));
// le sei punte, in giro: ogni punta ha la sua opposta (k + 3) % 6
const IN_PUNTA = [([q]) => q > 4, ([, , s]) => s < -4, ([, r]) => r > 4, ([q]) => q < -4, ([, , s]) => s > 4, ([, r]) => r < -4];
const PUNTE = IN_PUNTA.map((f) => CELLE.map((c, i) => (f(c) ? i : -1)).filter((i) => i >= 0));
// la buca più lontana di ogni punta (la cima)
const CIMA = PUNTE.map((pt) => pt.reduce((a, b) => (Math.max(...CELLE[b].map(Math.abs)) > Math.max(...CELLE[a].map(Math.abs)) ? b : a)));
const dist = (a, b) => { const A = CELLE[a], B = CELLE[b]; return (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2])) / 2; };
// distanze di ogni buca dalla cima di ogni punta
const DIST_CIMA = CIMA.map((c) => CELLE.map((_, i) => dist(i, c)));
const PUNTE_PER = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
const MAX_MOSSE = 200; // mosse a testa: oltre, vince chi è più avanti

// dove può arrivare la biglia in "da": passi semplici e salti a catena. Restituisce Map(arrivo -> percorso)
function arrivi(occ, da) {
  const out = new Map();
  for (const v of VICINI[da]) if (v >= 0 && occ[v] < 0) out.set(v, [da, v]);
  const coda = [[da, [da]]];
  const visti = new Set([da]);
  while (coda.length) {
    const [c, strada] = coda.shift();
    for (let d = 0; d < 6; d++) {
      const v = VICINI[c][d];
      if (v < 0 || occ[v] < 0 || v === da) continue;
      const w = VICINI[v][d];
      if (w < 0 || occ[w] >= 0 || visti.has(w)) continue;
      visti.add(w);
      const s = [...strada, w];
      if (!out.has(w)) out.set(w, s);
      coda.push([w, s]);
    }
  }
  return out;
}

// righe e buche come le disegna il browser con la punta k in basso (stessa rotazione di public/js/giochi2/damacinese.js)
const VISTE = {};
function vistaBuche(k) {
  if (VISTE[k]) return VISTE[k];
  const base = ([q, r]) => [q + r / 2, (r * Math.sqrt(3)) / 2];
  let cx = 0, cy = 0;
  for (const i of PUNTE[k]) { const [x, y] = base(CELLE[i]); cx += x; cy += y; }
  const rot = Math.PI / 2 - Math.atan2(cy, cx), cos = Math.cos(rot), sin = Math.sin(rot);
  const pos = CELLE.map((c) => { const [x, y] = base(c); return [x * cos - y * sin, Math.round((x * sin + y * cos) * 100) / 100]; });
  const ys = [...new Set(pos.map((x) => x[1]))].sort((a, b) => b - a); // dal basso (y più grande) in su
  const out = pos.map(([x, y]) => ({ riga: ys.indexOf(y) + 1, x, y }));
  for (const o of out) o.buca = out.filter((z) => z.y === o.y && z.x < o.x - 1e-6).length + 1;
  return (VISTE[k] = out);
}

class DamaCinese {
  constructor({ n, primo = 0 }) {
    this.id = 'damacinese';
    this.n = [2, 3, 4, 6].includes(n) ? n : 2;
    this.punta = PUNTE_PER[this.n];               // punta di partenza di ogni posto
    this.meta = this.punta.map((k) => (k + 3) % 6); // punta da riempire
    this.occ = new Int8Array(CELLE.length).fill(-1);
    this.punta.forEach((k, p) => { for (const i of PUNTE[k]) this.occ[i] = p; });
    this.manca0 = this.manca(0); // strada che manca alla partenza (uguale per tutti)
    this.turno = primo % this.n;
    this.mosseDi = new Array(this.n).fill(0);
    this.nMosse = 0;
    this.ultima = null;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inAttesa = false; this.pausaMs = 0;
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  biglie(p) { const out = []; for (let i = 0; i < CELLE.length; i++) if (this.occ[i] === p) out.push(i); return out; }
  // quanta strada manca: somma delle distanze dalla cima della meta, meno il minimo possibile (punta piena)
  manca(p) {
    const D = DIST_CIMA[this.meta[p]];
    let s = 0; for (const i of this.biglie(p)) s += D[i];
    return s - 20; // a punta piena la somma è 0+1+1+2+2+2+3+3+3+3 = 20
  }
  arrivato(p) {
    const meta = PUNTE[this.meta[p]];
    if (!meta.every((i) => this.occ[i] >= 0)) return false;
    // tutte le buche della meta occupate: almeno una mia, le altre mie o di avversari
    return meta.some((i) => this.occ[i] === p);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'muovi') return { errore: 'Mossa non valida' };
    const da = Number(a.da), aa = Number(a.a);
    if (!Number.isInteger(da) || da < 0 || da >= CELLE.length || this.occ[da] !== p) return { errore: 'Scegli una tua biglia' };
    const arr = arrivi(this.occ, da);
    if (!Number.isInteger(aa) || !arr.has(aa)) return { errore: 'Lì non ci puoi arrivare' };
    this.occ[da] = -1; this.occ[aa] = p;
    this.ultima = { posto: p, strada: arr.get(aa), n: ++this.nMosse };
    this.mosseDi[p]++;
    if (this.arrivato(p)) return this.chiudi(p);
    if (this.mosseDi.every((x) => x >= MAX_MOSSE)) {
      const m = this.punta.map((_, k) => this.manca(k));
      return this.chiudi(m.indexOf(Math.min(...m)), true);
    }
    this.turno = (p + 1) % this.n;
    return { ok: true };
  }
  chiudi(v, perTempo = false) {
    this.finita = true; this.turno = null;
    this.annuncia(v, perTempo ? 'vince: è il più avanti' : 'riempie la punta e vince!', perTempo ? 'hai vinto: sei il più avanti!' : 'hai riempito la punta: hai vinto!', true);
    // classifica: chi ha più strada fatta
    this.risultato = { fazioni: this.punta.map((_, k) => ({ posti: [k], punti: k === v ? 100 : Math.max(0, 100 - this.manca(k)) })), etichetta: 'punti', pareggio: false, vincitori: [v] };
    return { ok: true };
  }
  // trucco segreto (!win): la mossa del computer difficile. Le buche non hanno nomi: si dicono come le vede il
  // giocatore, con la stella girata e la sua punta in basso (riga contata dal basso, buca contata da sinistra)
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    const a = bot(this, p, 'difficile');
    const dove = vistaBuche(this.punta[p]);
    const t = (i) => `riga ${dove[i].riga} dal basso, ${dove[i].buca}ª buca da sinistra`;
    return `💡 Sposta la biglia (${t(a.da)}) → (${t(a.a)})`;
  }

  vista(p) {
    const mosse = {};
    if (this.turno === p && !this.finita) for (const i of this.biglie(p)) { const a = arrivi(this.occ, i); if (a.size) mosse[i] = [...a.keys()]; }
    return {
      gioco: this.id, n: this.n, occ: Array.from(this.occ), punta: this.punta, meta: this.meta, mosse,
      manca: this.punta.map((_, k) => this.manca(k)),
      avanti: this.punta.map((_, k) => Math.max(0, Math.round(100 * (1 - this.manca(k) / this.manca0)))), ultima: this.ultima, nMosse: this.nMosse,
      turno: this.turno, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// valutazione di un posto: strada che manca (verso la cima della meta), più una penalità per le biglie rimaste
// indietro (le ultime sono quelle che fanno perdere) e per le buche della meta ancora vuote quando si è vicini
function valutaPosto(occ, p, metaK) {
  const D = DIST_CIMA[metaK];
  let s = 0, peggio = 0;
  for (let i = 0; i < occ.length; i++) if (occ[i] === p) { s += D[i]; if (D[i] > peggio) peggio = D[i]; }
  return -(s + peggio * 0.8);
}
function mosseDi(occ, p) {
  const out = [];
  for (let i = 0; i < occ.length; i++) if (occ[i] === p) for (const [a] of arrivi(occ, i)) out.push([i, a]);
  return out;
}
function bot(g, p, livello) {
  const D = DIST_CIMA[g.meta[p]];
  const tutte = mosseDi(g.occ, p);
  const az = ([da, a]) => ({ tipo: 'muovi', da, a });
  const avanzo = ([da, a]) => D[da] - D[a];
  // una mossa che fa vincere subito
  for (const m of tutte) { g.occ[m[0]] = -1; g.occ[m[1]] = p; const v = g.arrivato(p); g.occ[m[1]] = -1; g.occ[m[0]] = p; if (v) return az(m); }
  if (livello === 'facile') {
    // spesso a caso tra quelle che vanno avanti, a volte la più lunga
    const avanti = tutte.filter((m) => avanzo(m) > 0);
    if (avanti.length && Math.random() < 0.55) return az(avanti[Math.floor(Math.random() * avanti.length)]);
    if (avanti.length) return az(avanti.reduce((x, y) => (avanzo(y) > avanzo(x) ? y : x)));
    return az(tutte[Math.floor(Math.random() * tutte.length)]);
  }
  const occ = g.occ;
  const prova = (m, f) => { occ[m[0]] = -1; occ[m[1]] = p; const v = f(); occ[m[1]] = -1; occ[m[0]] = p; return v; };
  let lista = tutte.map((m) => ({ m, v: prova(m, () => valutaPosto(occ, p, g.meta[p])) + Math.random() * 0.01 }));
  lista.sort((a, b) => b.v - a.v);
  if (livello === 'medio') return az(lista[0].m);
  // difficile: guarda anche la sua mossa dopo (le "scale" di salti che si preparano), sulle 14 mosse migliori
  const ms = Date.now() + (process.env.TEST_VELOCE ? 15 : 200);
  let best = lista[0], bv = -Infinity;
  for (const x of lista.slice(0, 14)) {
    if (Date.now() > ms) break;
    const v = prova(x.m, () => {
      let b = -Infinity;
      for (const m2 of mosseDi(occ, p)) { const w = prova(m2, () => valutaPosto(occ, p, g.meta[p])); if (w > b) b = w; }
      return x.v * 0.4 + b * 0.6;
    });
    if (v > bv) { bv = v; best = x; }
  }
  return az(best.m);
}

module.exports = {
  meta: {
    id: 'damacinese',
    nome: 'Dama cinese',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 6],
    descrizione: 'Porta le tue 10 biglie dall\'altra parte della stella, saltando a catena sopra le biglie di tutti. In 2, 3, 4 o 6.',
    alias: ['dama cinese', 'stella', 'biglie', 'salti', 'halma', 'chinese checkers'],
    opzioni: [],
    regole: [
      'La tavola è una stella a sei punte. Ognuno parte con 10 biglie del suo colore in una punta e deve portarle tutte nella punta opposta. Si gioca in 2, 3, 4 o 6 (in 2 e in 4 ci sono punte vuote).',
      'A turno si muove una sola biglia: di un passo in una buca vicina libera (in sei direzioni), oppure saltando sopra una biglia vicina (tua o di altri) e atterrando nella buca libera subito dietro, sulla stessa linea.',
      'I salti si possono fare a catena, in direzioni diverse, quanti se ne vuole: si clicca direttamente la buca d\'arrivo e il percorso lo trova il gioco. Non si mangia niente: le biglie saltate restano dove sono.',
      'Vince chi per primo riempie la punta opposta. Se qualche buca della tua punta è occupata da biglie avversarie che non si spostano, basta riempire tutte le altre.',
      'Dopo 200 mosse a testa vince chi è più avanti.',
      'Come si gioca: clicca una tua biglia (si illuminano le buche dove può arrivare), poi la buca. La percentuale accanto a ogni giocatore dice quanta strada ha già fatto.',
      'Il computer facile va avanti un po\' a caso; il medio sceglie la mossa che lo porta più avanti senza lasciare biglie indietro; il difficile pensa anche alla sua mossa dopo, preparandosi le scale di salti.',
    ],
  },
  crea: (o) => new DamaCinese(o),
  bot,
  _test: { CELLE, PUNTE, VICINI, arrivi, CIMA, DIST_CIMA, INDICE },
};
