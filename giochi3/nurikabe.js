// NURIKABE (isole nel mare): una griglia con dei numeri. Si colorano di scuro le caselle di mare in modo che ogni
// numero stia in un'isola grande quanto il numero (un numero per isola, le isole non si toccano di lato), che il
// mare sia tutto collegato e che non ci siano quadrati 2×2 di mare. Gli schemi (nurikabe-dati.js) sono stati creati
// al computer e il risolutore di nurikabe-logica.js ha controllato che ognuno abbia UNA sola soluzione; durante la
// partita si gira o si specchia lo schema a caso. Da soli per il tempo; in sfida (2-8) tutti hanno lo stesso schema.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('../giochi2/rompicapo-sfida');
const { trasforma } = require('./nurikabe-logica');

const GRANDEZZE = { piccola: [7, 7], media: [10, 10], grande: [12, 12] };
const AIUTO_MS = 20000;
const VUOTA = 0, MARE = 1, PUNTO = 2;
const RECORD = {};
let DATI = null;
const dati = () => DATI || (DATI = require('./nurikabe-dati'));

class Nurikabe extends SfidaRompicapo {
  constructor(o) {
    super('nurikabe', o, 40 * 60000);
    const op = o.opzioni || {};
    this.grandezza = GRANDEZZE[op.grandezza] ? op.grandezza : 'piccola';
    this.mostraErrori = op.errori === 'subito';
    [this.W, this.H] = GRANDEZZE[this.grandezza];
    const lista = dati()[this.grandezza];
    const sc = caso(lista);
    const k = Math.floor(Math.random() * 8);
    const numeri = sc.n.split('').map((c) => parseInt(c, 36));
    this.numeri = trasforma(this.W, this.H, numeri, k);
    this.soluzione = trasforma(this.W, this.H, sc.s.split('').map(Number), k); // 1 = isola, 0 = mare
    this.nMare = this.soluzione.filter((v) => !v).length;
    const N = this.W * this.H;
    this.tavole = Array.from({ length: this.n }, () => ({ celle: new Array(N).fill(VUOTA), indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, ultimoAiuto: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  // a che punto è: caselle di mare giuste meno quelle sbagliate
  progresso(i, t) {
    let giuste = 0, sbagliate = 0;
    t.celle.forEach((v, k) => { if (v === MARE) { if (this.soluzione[k]) sbagliate++; else giuste++; } });
    return Math.max(0, (giuste - sbagliate) / this.nMare);
  }
  risolta(p, t) { return t.celle.every((v, k) => (v === MARE) === !this.soluzione[k]); }
  fraseArrivo() { return { altri: 'trova tutto il mare! 🏝️', io: 'Schema risolto! 🏝️' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }
  sbagliate(t) { return t.celle.map((v, k) => ((v === MARE && this.soluzione[k]) || (v === PUNTO && !this.soluzione[k]) ? k : -1)).filter((k) => k >= 0); }

  mossa(p, t, a) {
    const N = this.W * this.H;
    if (a.tipo === 'segna') {
      // una o più caselle (trascinando) prendono lo stesso valore
      const lista = Array.isArray(a.celle) ? a.celle.slice(0, N) : [a.i];
      const v = Number(a.v);
      if (![VUOTA, MARE, PUNTO].includes(v)) return { errore: 'Mossa non valida' };
      const cambi = [];
      for (const x of lista) {
        const i = Number(x);
        if (!Number.isInteger(i) || i < 0 || i >= N || this.numeri[i] || t.celle[i] === v) continue;
        cambi.push([i, t.celle[i]]); t.celle[i] = v;
      }
      if (!cambi.length) return { errore: 'Niente da cambiare' };
      t.indietro.push(cambi); if (t.indietro.length > 2000) t.indietro.shift();
      t.mosse++;
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      for (const [i, v] of u.slice().reverse()) t.celle[i] = v;
      return { ok: true };
    }
    if (a.tipo === 'cancella') {
      const cambi = t.celle.map((v, i) => [i, v]).filter(([, v]) => v !== VUOTA);
      if (!cambi.length) return { errore: 'La griglia è già vuota' };
      t.indietro.push(cambi); t.celle.fill(VUOTA);
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      // si sistema una casella: prima una sbagliata, altrimenti una di mare ancora vuota
      const sb = this.sbagliate(t);
      const vuote = t.celle.map((v, k) => (v === VUOTA && !this.soluzione[k] ? k : -1)).filter((k) => k >= 0);
      const i = sb.length ? caso(sb) : vuote.length ? caso(vuote) : -1;
      if (i < 0) return { errore: 'Non serve nessun aiuto' };
      const giusto = this.soluzione[i] ? PUNTO : MARE;
      t.indietro.push([[i, t.celle[i]]]); t.celle[i] = giusto;
      t.aiuti++; t.penale += AIUTO_MS; t.ultimoAiuto = i;
      this.annuncia(p, 'chiede un aiuto (+20 s)', sb.length ? 'aiuto: c\'era una casella sbagliata, ora è giusta (+20 s)' : 'aiuto: una casella di mare in più (+20 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // !win + parola segreta: una casella sbagliata da sistemare, altrimenti qualche casella di mare ancora da colorare
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const dove = (k) => `riga ${Math.floor(k / this.W) + 1} col ${(k % this.W) + 1}`;
    const sb = this.sbagliate(t);
    if (sb.length) return `💡 ${dove(sb[0])} è ${this.soluzione[sb[0]] ? 'isola, non mare' : 'mare'}`;
    const vuote = t.celle.map((v, k) => (v === VUOTA && !this.soluzione[k] ? k : -1)).filter((k) => k >= 0);
    if (!vuote.length) return null;
    return `💡 Mare in: ${mescola(vuote).slice(0, 3).sort((a, b) => a - b).map(dove).join(' · ')}`;
  }

  // ---- computer: colora il mare in un ordine sensato (prima le caselle vicine a quelle già decise), a un ritmo che
  // dipende dal livello e dalla grandezza; il facile ogni tanto sbaglia e poi si corregge ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const t = this.tavole[p];
    const mare = mescola(this.soluzione.map((v, k) => (!v && t.celle[k] !== MARE ? k : -1)).filter((k) => k >= 0));
    const secCasella = { piccola: 2.2, media: 2.6, grande: 3 }[this.grandezza] * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { coda: mare, totale: Math.max(1, mare.length) * secCasella * 1000, passi: Math.max(1, mare.length) });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 3 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], m = this.pianoBot(p, livello);
    const sb = this.sbagliate(t);
    if (sb.length && Math.random() < 0.5) return { tipo: 'segna', i: sb[0], v: this.soluzione[sb[0]] ? VUOTA : MARE };
    const svista = { facile: 0.1, medio: 0.025, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) {
      const isola = this.soluzione.map((v, k) => (v && !this.numeri[k] && t.celle[k] === VUOTA ? k : -1)).filter((k) => k >= 0);
      if (isola.length) return { tipo: 'segna', i: caso(isola), v: MARE };
    }
    while (m.coda.length && t.celle[m.coda[0]] === MARE) m.coda.shift();
    if (m.coda.length) return { tipo: 'segna', i: m.coda.shift(), v: MARE };
    if (sb.length) return { tipo: 'segna', i: sb[0], v: this.soluzione[sb[0]] ? VUOTA : MARE };
    this.menti[p] = null;
    return { tipo: 'pensa' };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.grandezza] = RECORD[this.grandezza] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.aiuti ? `Schema risolto con ${t.aiuti} ${t.aiuti === 1 ? 'aiuto' : 'aiuti'}` : 'Schema risolto senza aiuti! 🏅';
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const finita = this.finita || t.fatto != null;
    return {
      ...this.vistaComune(p),
      W: this.W, H: this.H, grandezza: this.grandezza, numeri: this.numeri, celle: t.celle, mosse: t.mosse,
      mostraErrori: this.mostraErrori, sbagliate: this.mostraErrori && !finita ? this.sbagliate(t) : [],
      soluzione: this.finita ? this.soluzione : null,
      aiuti: t.aiuti, penale: t.penale, ultimoAiuto: t.ultimoAiuto, puoAnnullare: t.indietro.length > 0,
      record: this.sfida ? [] : RECORD[this.grandezza] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'nurikabe',
    nome: 'Nurikabe (isole nel mare)',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Colora il mare: ogni numero è un\'isola grande quanto il numero, il mare è tutto collegato e senza quadrati 2×2. Una sola soluzione.',
    alias: ['nurikabe', 'isole', 'isole nel mare', 'mare', 'arcipelago', 'islands'],
    opzioni: [
      { id: 'grandezza', nome: 'Griglia', valori: Object.keys(GRANDEZZE), etichette: ['Piccola (7×7)', 'Media (10×10)', 'Grande (12×12)'], predefinito: 'piccola' },
      { id: 'errori', nome: 'Errori', valori: ['regole', 'subito'], etichette: ['Segna solo le regole rotte (2×2, isole)', 'Segna subito le caselle sbagliate'], predefinito: 'regole' },
    ],
    regole: [
      'Nella griglia ci sono dei numeri: ogni numero sta in un\'isola fatta di tante caselle quante dice il numero (il numero conta anche la sua casella). Ogni isola ha un solo numero.',
      'Tutte le altre caselle sono mare 🌊. Il mare deve essere tutto collegato (in orizzontale e in verticale) e non può avere quadrati 2×2 tutti di mare. Due isole non si toccano mai di lato (in diagonale sì).',
      'Comandi: un clic (o tocco) colora una casella di mare; il secondo clic ci mette un puntino (isola sicura); il terzo la svuota. Tasto destro: puntino. Trascinando si colorano più caselle insieme. Ctrl+Z annulla.',
      'Il trucco: le caselle tra due numeri vicini sono mare; un "1" è circondato dal mare; il mare non può restare chiuso in un angolo; ogni 2×2 deve avere almeno una casella di isola.',
      '💡 Aiuto: sistema una casella (prima una sbagliata, se c\'è) al costo di 20 secondi. Ogni schema ha una sola soluzione, controllata dal computer.',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno lo stesso schema: vince chi lo risolve per primo. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce la soluzione: il difficile è veloce, il medio più lento, il facile è lento e ogni tanto sbaglia una casella (poi la corregge).',
    ],
  },
  crea: (o) => new Nurikabe(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { GRANDEZZE, dati, VUOTA, MARE, PUNTO },
};
