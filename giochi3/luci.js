// LUCI SPENTE (il rompicapo delle lucine): una griglia di luci, alcune accese. Toccando una casella cambiano lei e le
// quattro vicine (sopra, sotto, a destra, a sinistra). Bisogna spegnerle tutte. Variante a tre colori: ogni tocco fa
// spenta → rossa → verde → spenta. Ogni schema nasce da tocchi a caso partendo dal buio, quindi ha sempre una
// soluzione; il minimo di tocchi si calcola con l'algebra (eliminazione di Gauss modulo 2 o modulo 3).
// Da soli si gioca per il tempo e per il minimo di tocchi; in sfida (2-8) tutti hanno lo stesso schema.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso } = require('../giochi2/rompicapo-sfida');

const LATI = [5, 6, 7];
const MODI = ['due', 'tre'];
const LIVELLI = ['facile', 'medio', 'difficile'];
const AIUTO_MS = 15000;
const RECORD = {};
// quanti tocchi a caso per creare lo schema (il minimo vero può essere un po' meno)
const TOCCHI = { facile: [4, 6], medio: [8, 11], difficile: [13, 18] };
// il 5×5 classico ha al massimo 15 tocchi minimi (due soluzioni "gemelle" si annullano a vicenda)
const fascia = (lato, q, livello) => (lato === 5 && q === 2 && livello === 'difficile' ? [12, 15] : TOCCHI[livello]);

const vicine = (lato, i) => {
  const x = i % lato, y = (i - x) / lato, out = [i];
  if (x > 0) out.push(i - 1); if (x < lato - 1) out.push(i + 1);
  if (y > 0) out.push(i - lato); if (y < lato - 1) out.push(i + lato);
  return out;
};
// un tocco sulla casella i (q = 2 o 3 stati)
function tocca(stato, lato, i, q, volte = 1) { for (const j of vicine(lato, i)) stato[j] = (stato[j] + volte) % q; }

// il MINIMO di tocchi per spegnere tutto: si risolve A·x = −s (mod q) dove A dice quali caselle cambia ogni tocco.
// Se A non è invertibile (succede col 5×5 a due stati) si provano tutte le soluzioni (base del nucleo) e si tiene
// quella con meno tocchi. Restituisce x (quante volte toccare ogni casella) oppure null se non si può.
const CACHE = new Map();
function risolvi(stato, lato, q) {
  const N = lato * lato;
  const chiave = `${lato}:${q}`;
  let E = CACHE.get(chiave);
  if (!E) {
    // eliminazione una volta per lato e q: si tiene la matrice ridotta con le operazioni fatte (matrice T)
    const A = Array.from({ length: N }, (_, r) => { const riga = new Array(N).fill(0); for (const j of vicine(lato, r)) riga[j] = 1; return riga; });
    const T = Array.from({ length: N }, (_, r) => { const riga = new Array(N).fill(0); riga[r] = 1; return riga; });
    const inv = (a) => (q === 2 ? 1 : a === 1 ? 1 : 2);
    const perno = []; let r = 0;
    for (let c = 0; c < N && r < N; c++) {
      let k = r; while (k < N && !A[k][c]) k++;
      if (k === N) continue;
      [A[r], A[k]] = [A[k], A[r]]; [T[r], T[k]] = [T[k], T[r]];
      const f = inv(A[r][c]);
      for (let j = 0; j < N; j++) { A[r][j] = (A[r][j] * f) % q; T[r][j] = (T[r][j] * f) % q; }
      for (let k2 = 0; k2 < N; k2++) {
        if (k2 === r || !A[k2][c]) continue;
        const m = A[k2][c];
        for (let j = 0; j < N; j++) { A[k2][j] = (A[k2][j] - m * A[r][j] + q * q) % q; T[k2][j] = (T[k2][j] - m * T[r][j] + q * q) % q; }
      }
      perno.push(c); r++;
    }
    const liberi = [];
    for (let c = 0; c < N; c++) if (!perno.includes(c)) liberi.push(c);
    E = { A, T, perno, liberi, rango: r };
    CACHE.set(chiave, E);
  }
  const { A, T, perno, liberi, rango } = E;
  const b = stato.map((v) => (q - v) % q);
  const tb = T.map((riga) => riga.reduce((s, v, j) => (s + v * b[j]) % q, 0));
  for (let k = rango; k < N; k++) if (tb[k]) return null; // nessuna soluzione
  let meglio = null, peso = Infinity;
  const tot = q ** liberi.length;
  for (let m = 0; m < tot; m++) {
    const x = new Array(N).fill(0);
    let mm = m;
    for (const c of liberi) { x[c] = mm % q; mm = Math.floor(mm / q); }
    for (let k = 0; k < rango; k++) {
      let v = tb[k];
      for (const c of liberi) v = (v - A[k][c] * x[c] + q * q) % q;
      x[perno[k]] = v;
    }
    const w = x.reduce((s, v) => s + v, 0);
    if (w < peso) { peso = w; meglio = x; }
  }
  return meglio;
}
const peso = (x) => (x ? x.reduce((s, v) => s + v, 0) : Infinity);

// uno schema nuovo: tocchi a caso dal buio, finché il minimo è nella fascia del livello
function nuovoSchema(lato, q, livello) {
  const [a, b] = fascia(lato, q, livello);
  for (let giro = 0; giro < 2000; giro++) {
    const s = new Array(lato * lato).fill(0);
    // k caselle DIVERSE (toccarne una due volte sarebbe come non toccarla)
    const k = Math.min(s.length, a + Math.floor(Math.random() * (b - a + 1)));
    const celle = s.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, k);
    // con tre colori si tocca q − 1 volte: per tornare indietro basta un tocco per casella
    for (const i of celle) tocca(s, lato, i, q, q - 1);
    const x = risolvi(s, lato, q), w = peso(x);
    if (w >= a && w <= b) return { stato: s, minimo: w };
  }
  // non dovrebbe succedere: si accetta l'ultimo non vuoto
  const s = new Array(lato * lato).fill(0);
  for (let t = 0; t < a; t++) tocca(s, lato, Math.floor(Math.random() * s.length), q);
  return { stato: s, minimo: peso(risolvi(s, lato, q)) };
}

class Luci extends SfidaRompicapo {
  constructor(o) {
    super('luci', o, 20 * 60000);
    const op = o.opzioni || {};
    this.lato = LATI.includes(Number(op.lato)) ? Number(op.lato) : 5;
    this.modo = MODI.includes(op.modo) ? op.modo : 'due';
    this.q = this.modo === 'tre' ? 3 : 2;
    this.livello = LIVELLI.includes(op.difficolta) ? op.difficolta : 'medio';
    let sc = nuovoSchema(this.lato, this.q, this.livello);
    while (sc.stato.every((v) => !v)) sc = nuovoSchema(this.lato, this.q, this.livello);
    this.iniziale = sc.stato;
    this.minimo = sc.minimo;
    this.tavole = Array.from({ length: this.n }, () => ({ stato: sc.stato.slice(), indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, suggerimento: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  mancano(t) { return peso(risolvi(t.stato, this.lato, this.q)); }
  progresso(i, t) { return Math.max(0, Math.min(1, 1 - this.mancano(t) / Math.max(1, this.minimo))); }
  risolta(p, t) { return t.stato.every((v) => !v); }
  fraseArrivo(p, t) {
    const extra = t.mosse <= this.minimo ? `con il minimo di tocchi (${t.mosse})! 🏅` : `in ${t.mosse} tocchi`;
    return { altri: `spegne tutte le luci ${extra}`, io: `Tutte spente ${extra}` };
  }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  mossa(p, t, a) {
    if (a.tipo === 'tocca') {
      const i = Number(a.i);
      if (!Number.isInteger(i) || i < 0 || i >= t.stato.length) return { errore: 'Casella non valida' };
      tocca(t.stato, this.lato, i, this.q);
      t.mosse++; t.suggerimento = null;
      t.indietro.push(i); if (t.indietro.length > 2000) t.indietro.shift();
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const i = t.indietro.pop();
      if (i == null) return { errore: 'Non c\'è niente da annullare' };
      tocca(t.stato, this.lato, i, this.q, this.q - 1); // toccare q−1 volte = tornare indietro
      t.mosse++; t.suggerimento = null; // anche annullare conta come tocco
      return { ok: true };
    }
    if (a.tipo === 'ricomincia') {
      if (!t.indietro.length && t.stato.every((v, k) => v === this.iniziale[k])) return { errore: 'Sei già all\'inizio' };
      t.stato = this.iniziale.slice(); t.indietro = []; t.mosse = 0; t.suggerimento = null;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const x = risolvi(t.stato, this.lato, this.q);
      const da = x ? x.map((v, k) => (v ? k : -1)).filter((k) => k >= 0) : [];
      if (!da.length) return { errore: 'Non serve nessun aiuto' };
      t.suggerimento = caso(da);
      t.aiuti++; t.penale += AIUTO_MS;
      this.annuncia(p, 'chiede un aiuto (+15 s)', `aiuto: tocca la casella che lampeggia (+15 s) · ne mancano almeno ${peso(x)}`);
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // !win + parola segreta: le caselle da toccare (la soluzione col minimo di tocchi da dove sei)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const x = risolvi(t.stato, this.lato, this.q);
    if (!x) return null;
    const da = x.map((v, k) => (v ? `riga ${Math.floor(k / this.lato) + 1} col ${(k % this.lato) + 1}${v > 1 ? ' (2 volte)' : ''}` : null)).filter(Boolean);
    if (!da.length) return null;
    return `💡 Tocca: ${da.slice(0, 4).join(' · ')}${da.length > 4 ? ` (e altre ${da.length - 4})` : ''}`;
  }

  // ---- computer: conosce i tocchi minimi; il facile e il medio ogni tanto toccano una casella a caso ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const sec = (this.q === 3 ? 2.6 : 2.2) * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale: Math.max(1, this.minimo) * sec * 1000, passi: Math.max(1, this.minimo) });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    this.pianoBot(p, livello);
    const svista = { facile: 0.18, medio: 0.05, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) return { tipo: 'tocca', i: Math.floor(Math.random() * t.stato.length) };
    const x = risolvi(t.stato, this.lato, this.q);
    const da = x ? x.map((v, k) => (v ? k : -1)).filter((k) => k >= 0) : [];
    return da.length ? { tipo: 'tocca', i: caso(da) } : { tipo: 'pensa' };
  }

  risultatoSolo(t) {
    const k = `${this.lato}:${this.modo}`;
    const lista = (RECORD[k] = RECORD[k] || []);
    const voce = { ms: t.fatto, mosse: t.mosse, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.mosse <= this.minimo ? `Perfetto: ${t.mosse} tocchi, il minimo! 🏅` : `${t.mosse} tocchi (il minimo era ${this.minimo})`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      lato: this.lato, modo: this.modo, q: this.q, livello: this.livello, stato: t.stato, mosse: t.mosse, minimo: this.minimo,
      mancano: t.fatto == null ? this.mancano(t) : 0, suggerimento: t.suggerimento, aiuti: t.aiuti, penale: t.penale,
      puoAnnullare: t.indietro.length > 0, mosseAltri: this.tavole.map((x) => x.mosse),
      record: this.sfida ? [] : RECORD[`${this.lato}:${this.modo}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'luci',
    nome: 'Luci spente',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Ogni tocco cambia una luce e le sue quattro vicine: spegnile tutte, con meno tocchi possibile. Anche a tre colori. Da soli o in sfida.',
    alias: ['luci spente', 'luci', 'lights out', 'lucine', 'spegni le luci', 'interruttori luminosi', 'lampadine'],
    opzioni: [
      { id: 'lato', nome: 'Griglia', valori: LATI, etichette: ['5×5 (la classica)', '6×6', '7×7'], predefinito: 5 },
      { id: 'modo', nome: 'Luci', valori: MODI, etichette: ['Accese e spente', 'Tre colori (spenta, rossa, verde)'], predefinito: 'due' },
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile (4-6 tocchi)', 'Media (8-11 tocchi)', 'Difficile (12-18 tocchi)'], predefinito: 'medio' },
    ],
    regole: [
      'Alcune luci della griglia sono accese. Toccando una casella cambiano lei e le quattro vicine (sopra, sotto, destra e sinistra; non in diagonale). Bisogna spegnerle tutte.',
      'Con "tre colori" ogni tocco fa fare un passo alle cinque luci: spenta → rossa → verde → spenta. Una luce verde si spegne con un tocco, una rossa con due.',
      'L\'ordine dei tocchi non conta, e toccare due volte la stessa casella (tre volte nei tre colori) è come non toccarla: il segreto è capire QUALI caselle toccare.',
      'Ogni schema ha una soluzione e il computer conosce il minimo di tocchi: finisci con il minimo per la medaglia. Annullare conta come un tocco.',
      'Comandi: clicca o tocca le caselle; con la tastiera frecce per muoversi e spazio (o Invio) per toccare, Ctrl+Z annulla. 💡 Aiuto: lampeggia una casella giusta da toccare (+15 secondi).',
      'Da soli si gioca per il tempo e per i tocchi. In sfida (da 2 a 8) tutti hanno lo stesso schema: vince chi spegne tutto per primo. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce i tocchi giusti: il difficile è veloce e non sbaglia, il medio è più lento e sbaglia di rado, il facile è lento e ogni tanto tocca a caso.',
    ],
  },
  crea: (o) => new Luci(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { risolvi, tocca, vicine, nuovoSchema, peso, fascia, LATI, TOCCHI },
};
