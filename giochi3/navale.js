// BATTAGLIA NAVALE SOLITARIA: la flotta è nascosta nella griglia. I numeri accanto a righe e colonne dicono quanti
// pezzi di nave ci sono; alcune caselle sono già scoperte. Le navi sono dritte e non si toccano mai, nemmeno in
// diagonale. Bisogna trovare tutte le navi. Gli schemi (navale-dati.js) sono stati creati al computer e il risolutore
// di navale-logica.js ha controllato che abbiano UNA sola soluzione; in partita si girano e si specchiano a caso.
// Da soli per il tempo; in sfida (2-8) tutti hanno lo stesso schema.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('../giochi2/rompicapo-sfida');
const { FLOTTE, LATI, forma, conteggi, trasforma } = require('./navale-logica');

const AIUTO_MS = 20000;
const VUOTA = 0, ACQUA = 1, NAVE = 2;
const RECORD = {};
let DATI = null;
const dati = () => DATI || (DATI = require('./navale-dati'));

class Navale extends SfidaRompicapo {
  constructor(o) {
    super('navale', o, 40 * 60000);
    const op = o.opzioni || {};
    this.grandezza = LATI[op.grandezza] ? op.grandezza : 'media';
    this.mostraErrori = op.errori === 'subito';
    this.L = LATI[this.grandezza];
    this.flotta = FLOTTE[this.grandezza];
    const sc = caso(dati()[this.grandezza]);
    const k = Math.floor(Math.random() * 8);
    const segno = new Array(this.L * this.L).fill(0);
    for (const x of sc.i.split('.')) segno[parseInt(x, 36)] = 1;
    this.soluzione = trasforma(this.L, sc.s.split('').map(Number), k);
    const scoperte = trasforma(this.L, segno, k);
    // le caselle scoperte: acqua o pezzo di nave con la sua forma
    this.indizi = {};
    scoperte.forEach((v, i) => { if (v) this.indizi[i] = forma(this.L, this.soluzione, i); });
    Object.assign(this, conteggi(this.L, this.soluzione));
    this.nNave = this.soluzione.filter(Boolean).length;
    this.tavole = Array.from({ length: this.n }, () => {
      const celle = new Array(this.L * this.L).fill(VUOTA);
      for (const i of Object.keys(this.indizi)) celle[i] = this.soluzione[i] ? NAVE : ACQUA;
      return { celle, indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, ultimoAiuto: null };
    });
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) {
    let giuste = 0, sbagliate = 0;
    t.celle.forEach((v, k) => { if (this.indizi[k]) return; if (v === NAVE) { if (this.soluzione[k]) giuste++; else sbagliate++; } });
    const daTrovare = this.nNave - Object.keys(this.indizi).filter((k) => this.soluzione[k]).length;
    return Math.max(0, (giuste - sbagliate) / Math.max(1, daTrovare));
  }
  risolta(p, t) { return t.celle.every((v, k) => (v === NAVE) === !!this.soluzione[k]); }
  fraseArrivo() { return { altri: 'trova tutta la flotta! ⚓', io: 'Flotta trovata! ⚓' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }
  sbagliate(t) { return t.celle.map((v, k) => ((v === NAVE && !this.soluzione[k]) || (v === ACQUA && this.soluzione[k]) ? k : -1)).filter((k) => k >= 0); }

  mossa(p, t, a) {
    const N = this.L * this.L;
    if (a.tipo === 'segna') {
      const lista = Array.isArray(a.celle) ? a.celle.slice(0, N) : [a.i];
      const v = Number(a.v);
      if (![VUOTA, ACQUA, NAVE].includes(v)) return { errore: 'Mossa non valida' };
      const cambi = [];
      for (const x of lista) {
        const i = Number(x);
        if (!Number.isInteger(i) || i < 0 || i >= N || this.indizi[i] || t.celle[i] === v) continue;
        cambi.push([i, t.celle[i]]); t.celle[i] = v;
      }
      if (!cambi.length) return { errore: 'Niente da cambiare' };
      t.indietro.push(cambi); if (t.indietro.length > 2000) t.indietro.shift();
      t.mosse++;
      return { ok: true };
    }
    if (a.tipo === 'riempiAcqua') {
      // le caselle vuote di una riga o colonna già completa diventano acqua
      const k = Number(a.k), riga = a.dir === 'riga';
      if (!Number.isInteger(k) || k < 0 || k >= this.L) return { errore: 'Mossa non valida' };
      const celle = Array.from({ length: this.L }, (_, j) => (riga ? k * this.L + j : j * this.L + k));
      const navi = celle.filter((i) => t.celle[i] === NAVE).length;
      if (navi !== (riga ? this.righe[k] : this.colonne[k])) return { errore: 'Prima metti tutte le navi di quella fila' };
      const cambi = celle.filter((i) => t.celle[i] === VUOTA).map((i) => [i, VUOTA]);
      if (!cambi.length) return { errore: 'Niente da riempire' };
      for (const [i] of cambi) t.celle[i] = ACQUA;
      t.indietro.push(cambi); t.mosse++;
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      for (const [i, v] of u.slice().reverse()) t.celle[i] = v;
      return { ok: true };
    }
    if (a.tipo === 'cancella') {
      const cambi = t.celle.map((v, i) => [i, v]).filter(([i, v]) => v !== VUOTA && !this.indizi[i]);
      if (!cambi.length) return { errore: 'La griglia è già vuota' };
      t.indietro.push(cambi); for (const [i] of cambi) t.celle[i] = VUOTA;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const sb = this.sbagliate(t);
      const vuote = t.celle.map((v, k) => (v === VUOTA && this.soluzione[k] ? k : -1)).filter((k) => k >= 0);
      const i = sb.length ? caso(sb) : vuote.length ? caso(vuote) : -1;
      if (i < 0) return { errore: 'Non serve nessun aiuto' };
      t.indietro.push([[i, t.celle[i]]]); t.celle[i] = this.soluzione[i] ? NAVE : ACQUA;
      t.aiuti++; t.penale += AIUTO_MS; t.ultimoAiuto = i;
      this.annuncia(p, 'chiede un aiuto (+20 s)', sb.length ? 'aiuto: c\'era una casella sbagliata, ora è giusta (+20 s)' : 'aiuto: un pezzo di nave in più (+20 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // ---- computer: mette i pezzi di nave in un ordine qualsiasi, al suo ritmo; il facile ogni tanto sbaglia ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const t = this.tavole[p];
    const coda = mescola(this.soluzione.map((v, k) => (v && t.celle[k] !== NAVE ? k : -1)).filter((k) => k >= 0));
    const sec = { piccola: 4, media: 5, grande: 6 }[this.grandezza] * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { coda, totale: Math.max(1, coda.length) * sec * 1000, passi: Math.max(1, coda.length) });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 3 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], m = this.pianoBot(p, livello);
    const sb = this.sbagliate(t);
    if (sb.length && Math.random() < 0.5) return { tipo: 'segna', i: sb[0], v: VUOTA };
    const svista = { facile: 0.1, medio: 0.025, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) {
      const acqua = this.soluzione.map((v, k) => (!v && t.celle[k] === VUOTA ? k : -1)).filter((k) => k >= 0);
      if (acqua.length) return { tipo: 'segna', i: caso(acqua), v: NAVE };
    }
    while (m.coda.length && t.celle[m.coda[0]] === NAVE) m.coda.shift();
    if (m.coda.length) return { tipo: 'segna', i: m.coda.shift(), v: NAVE };
    if (sb.length) return { tipo: 'segna', i: sb[0], v: VUOTA };
    this.menti[p] = null;
    return { tipo: 'pensa' };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.grandezza] = RECORD[this.grandezza] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.aiuti ? `Flotta trovata con ${t.aiuti} ${t.aiuti === 1 ? 'aiuto' : 'aiuti'}` : 'Flotta trovata senza aiuti! 🏅';
    return r;
  }

  // trucco segreto (!win): dov'è la nave più grande che non hai ancora segnato tutta (righe dall'alto, colonne da sinistra)
  suggerimentoWin(p) {
    const t = this.tavole[p];
    if (this.finita || !t || t.fatto != null) return null;
    const L = this.L, visti = new Set();
    let meglio = null;
    for (let i = 0; i < L * L; i++) {
      if (!this.soluzione[i] || visti.has(i)) continue;
      // la nave che parte da qui: verso destra o verso il basso (le navi sono dritte)
      const nave = [i];
      const passo = (i % L < L - 1 && this.soluzione[i + 1]) ? 1 : L;
      for (let k = i + passo; k < L * L && this.soluzione[k] && (passo === L || k % L !== 0); k += passo) nave.push(k);
      nave.forEach((k) => visti.add(k));
      if (nave.some((k) => t.celle[k] !== NAVE) && (!meglio || nave.length > meglio.length)) meglio = nave;
    }
    if (!meglio) return null;
    const r = (k) => Math.floor(k / L) + 1, c = (k) => (k % L) + 1;
    const a = meglio[0], b = meglio[meglio.length - 1];
    if (meglio.length === 1) return `💡 Nave da 1: riga ${r(a)}, colonna ${c(a)}`;
    return r(a) === r(b) ? `💡 Nave da ${meglio.length}: riga ${r(a)}, colonne ${c(a)}–${c(b)}` : `💡 Nave da ${meglio.length}: colonna ${c(a)}, righe ${r(a)}–${r(b)}`;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const finita = this.finita || t.fatto != null;
    return {
      ...this.vistaComune(p),
      L: this.L, grandezza: this.grandezza, flotta: this.flotta, righe: this.righe, colonne: this.colonne, indizi: this.indizi,
      celle: t.celle, mosse: t.mosse, mostraErrori: this.mostraErrori, sbagliate: this.mostraErrori && !finita ? this.sbagliate(t) : [],
      soluzione: this.finita ? this.soluzione : null,
      aiuti: t.aiuti, penale: t.penale, ultimoAiuto: t.ultimoAiuto, puoAnnullare: t.indietro.length > 0,
      record: this.sfida ? [] : RECORD[this.grandezza] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'navale',
    nome: 'Battaglia navale solitaria',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Trova la flotta nascosta con i numeri di righe e colonne: le navi non si toccano mai, nemmeno in diagonale. Una sola soluzione.',
    alias: ['battaglia navale solitaria', 'battaglia navale da soli', 'navale', 'bimaru', 'navi', 'flotta', 'battleships'],
    opzioni: [
      { id: 'grandezza', nome: 'Griglia', valori: Object.keys(LATI), etichette: ['Piccola (6×6, 6 navi)', 'Media (8×8, 8 navi)', 'Grande (10×10, 10 navi: la classica)'], predefinito: 'media' },
      { id: 'errori', nome: 'Errori', valori: ['regole', 'subito'], etichette: ['Segna solo navi che si toccano e file piene', 'Segna subito le caselle sbagliate'], predefinito: 'regole' },
    ],
    regole: [
      'Nella griglia è nascosta una flotta: le navi sono lunghe da 1 a 4 caselle, dritte (in orizzontale o in verticale). L\'elenco delle navi è sotto la griglia.',
      'I numeri accanto a ogni riga e sopra ogni colonna dicono quanti pezzi di nave ci sono in quella fila. Due navi non si toccano mai, nemmeno in diagonale: intorno a ogni nave c\'è solo acqua.',
      'Alcune caselle sono già scoperte: acqua 🌊 o un pezzo di nave con la sua forma (la punta, il centro o una nave da una casella sola).',
      'Comandi: un clic (o tocco) mette un pezzo di nave, il secondo l\'acqua, il terzo svuota. Tasto destro: acqua. Trascinando si segnano più caselle insieme. Cliccando un numero si riempie d\'acqua il resto di una fila già completa. Ctrl+Z annulla.',
      '💡 Aiuto: sistema una casella (prima una sbagliata, se c\'è) al costo di 20 secondi. Ogni schema ha una sola soluzione, controllata dal computer.',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno lo stesso schema: vince chi trova per primo tutta la flotta. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce la soluzione: il difficile è veloce, il medio più lento, il facile è lento e ogni tanto sbaglia (poi si corregge).',
    ],
  },
  crea: (o) => new Navale(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { dati, VUOTA, ACQUA, NAVE },
};
