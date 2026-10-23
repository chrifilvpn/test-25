// TROVA LE DIFFERENZE: compaiono per poco 4 disegni quasi uguali; uno ha una piccola differenza (un colore, un oggetto
// in più o in meno, spostato, più grande o girato). Quando spariscono bisogna dire quale era quello diverso.
// I disegni sono descritti qui (oggetti con tipo, posizione, grandezza, colore) e il browser li disegna in SVG.
const TIPI = ['casa', 'albero', 'sole', 'nuvola', 'fiore', 'uccello', 'palla', 'stella', 'barca', 'montagna', 'fungo', 'aquilone'];
const COLORI = ['#e8453c', '#2f7fd8', '#2e9d57', '#f2c230', '#8e55c9', '#e36fa5', '#f08a24', '#1fa3a3', '#8b5a2b', '#ffffff'];
const CAMBI = ['colore', 'manca', 'sposta', 'grande', 'gira', 'extra'];
const SCEGLI_MS = 12000;
const rnd = (a, b) => a + Math.random() * (b - a);
const scegli = (a) => a[Math.floor(Math.random() * a.length)];

function scena(k) {
  const ogg = [];
  for (let i = 0; i < k; i++) {
    for (let prova = 0; prova < 30; prova++) {
      const o = { tipo: scegli(TIPI), x: Math.round(rnd(12, 88)), y: Math.round(rnd(18, 86)), s: Math.round(rnd(11, 19)), c: scegli(COLORI), g: 0 };
      if (o.tipo === 'sole' || o.tipo === 'nuvola' || o.tipo === 'uccello' || o.tipo === 'aquilone') o.y = Math.round(rnd(10, 40));
      if (ogg.every((q) => Math.hypot(q.x - o.x, q.y - o.y) > (q.s + o.s) * 0.7)) { ogg.push(o); break; }
    }
  }
  return { cielo: scegli(['#bfe3ff', '#ffd9a8', '#d6c8ff', '#c8f0d8']), prato: scegli(['#8fcf6a', '#e6d28a', '#7fc4b8']), ogg };
}
function modifica(sc, tipo) {
  const s = JSON.parse(JSON.stringify(sc));
  // "girato" si vede solo sugli oggetti che non sono uguali allo specchio
  const asimmetrici = s.ogg.map((q, k) => (['uccello', 'barca', 'aquilone', 'casa'].includes(q.tipo) ? k : -1)).filter((k) => k >= 0);
  if (tipo === 'gira' && !asimmetrici.length) tipo = 'colore';
  const i = tipo === 'gira' ? asimmetrici[Math.floor(Math.random() * asimmetrici.length)] : Math.floor(Math.random() * s.ogg.length);
  const o = s.ogg[i];
  if (tipo === 'colore') o.c = scegli(COLORI.filter((c) => c !== o.c));
  else if (tipo === 'manca') s.ogg.splice(i, 1);
  else if (tipo === 'sposta') { o.x = Math.max(8, Math.min(92, o.x + scegli([-1, 1]) * Math.round(rnd(7, 11)))); o.y = Math.max(10, Math.min(90, o.y + scegli([-1, 1]) * Math.round(rnd(4, 8)))); }
  else if (tipo === 'grande') o.s = Math.round(o.s * 1.45);
  else if (tipo === 'gira') o.g = o.g ? 0 : 1;
  else if (tipo === 'extra') { const n = { tipo: scegli(TIPI), x: Math.round(rnd(12, 88)), y: Math.round(rnd(20, 86)), s: Math.round(rnd(8, 12)), c: scegli(COLORI), g: 0 }; s.ogg.push(n); }
  // dove sta la differenza (per cerchiarla nella soluzione): l'oggetto cambiato, o il posto dove mancava
  const q = tipo === 'extra' ? s.ogg[s.ogg.length - 1] : tipo === 'manca' ? sc.ogg[i] : s.ogg[i];
  const segno = { x: q.x, y: q.y, s: q.s };
  if (tipo === 'sposta') segno.prima = { x: sc.ogg[i].x, y: sc.ogg[i].y };
  return { scena: s, indice: i, tipo, segno };
}

class Differenze {
  constructor({ n, opzioni = {} }) {
    this.id = 'differenze';
    this.n = n;
    this.nRound = [8, 5, 12].includes(Number(opzioni.round)) ? Number(opzioni.round) : 8;
    this.punti = new Array(n).fill(0);
    this.giuste = new Array(n).fill(0);
    this.round = 0;
    this.turno = null; this.inAttesa = false; this.pausaMs = 4500;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.nuovoRound();
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  nuovoRound() {
    this.round++;
    // più si va avanti, più oggetti, meno tempo e differenze più piccole
    const k = Math.min(14, 6 + this.round);
    const base = scena(k);
    this.cambio = scegli(this.round <= 2 ? ['colore', 'manca', 'grande'] : CAMBI);
    const { scena: diversa, tipo, segno } = modifica(base, this.cambio);
    this.cambio = tipo; this.segno = segno;
    this.diversa = Math.floor(Math.random() * 4);
    this.immagini = [0, 1, 2, 3].map((i) => (i === this.diversa ? diversa : base));
    this.guardaMs = Math.max(2500, 6500 - this.round * 350);
    this.fase = 'guarda';
    this.fineFase = Date.now() + this.guardaMs;
    this.risposte = {};
    this.quando = {};
  }
  attesi() { return this.fase === 'scegli' && !this.finita ? Array.from({ length: this.n }, (_, i) => i).filter((i) => this.risposte[i] === undefined) : []; }
  scadenza() { return (this.fase === 'guarda' || this.fase === 'scegli') && !this.finita ? this.fineFase : null; }
  controllaTempo() {
    if (Date.now() < this.fineFase) return false;
    if (this.fase === 'guarda') { this.fase = 'scegli'; this.inizioScelta = Date.now(); this.fineFase = Date.now() + SCEGLI_MS; return true; }
    if (this.fase === 'scegli') { this.valuta(); return true; }
    return false;
  }
  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.fase !== 'scegli') return { errore: 'Guarda bene i quattro disegni…' };
    if (this.risposte[p] !== undefined) return { errore: 'Hai già risposto' };
    const i = Number(a && a.quale);
    if (![0, 1, 2, 3].includes(i)) return { errore: 'Scegli uno dei quattro disegni' };
    this.risposte[p] = i;
    this.quando[p] = Date.now() - this.inizioScelta;
    if (!this.attesi().length) this.valuta();
    return { ok: true };
  }
  salta(p) { if (this.attesi().includes(p)) this.risposte[p] = null; if (this.fase === 'scegli' && !this.attesi().length) this.valuta(); return { ok: true }; }
  valuta() {
    // giusto: 100 punti più fino a 50 per la velocità; il più veloce tra chi indovina prende 25 in più
    const giusti = Object.keys(this.risposte).map(Number).filter((p) => this.risposte[p] === this.diversa).sort((a, b) => this.quando[a] - this.quando[b]);
    const fatti = new Array(this.n).fill(0);
    giusti.forEach((p, k) => { fatti[p] = 100 + Math.round(50 * Math.max(0, 1 - this.quando[p] / SCEGLI_MS)) + (k === 0 && this.n > 1 ? 25 : 0); this.giuste[p]++; });
    fatti.forEach((x, p) => { this.punti[p] += x; });
    this.ultimi = fatti;
    if (giusti.length && this.n > 1) this.annuncia(giusti[0], 'trova per primo quella diversa! 👀', 'l\'hai trovata per primo! 👀');
    if (this.round >= this.nRound) return this.chiudi();
    this.fase = 'esito';
    this.inAttesa = true;
  }
  avanza() { if (!this.inAttesa) return; this.inAttesa = false; this.nuovoRound(); }
  chiudi() {
    this.finita = true; this.inAttesa = false; this.fase = 'fine';
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 ? [0] : v.length > 1 ? [] : v };
    if (this.n === 1) this.risultato.titolo = `${this.giuste[0]} su ${this.nRound} trovate`;
  }
  // il trucco segreto (!win): appena compaiono i disegni gli sussurra qual è quello diverso e cosa cambia
  suggerimentoWin(posto) {
    if (this.finita || (this.fase !== 'guarda' && this.fase !== 'scegli') || this.risposte[posto] !== undefined) return null;
    const cosa = { colore: 'un colore', manca: 'manca un oggetto', sposta: 'un oggetto spostato', grande: 'un oggetto più grande', gira: 'un oggetto girato', extra: 'un oggetto in più' }[this.cambio];
    return `👀 Il n° ${this.diversa + 1} (${cosa})`;
  }

  vista(p) {
    const f = this.fase, scopri = f === 'esito' || this.finita;
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs, fase: f, round: this.round, nRound: this.nRound,
      immagini: f === 'guarda' || scopri ? this.immagini : null, restaMs: Math.max(0, this.fineFase - Date.now()), guardaMs: this.guardaMs,
      diversa: scopri ? this.diversa : null, cambio: scopri ? this.cambio : null, segno: scopri ? this.segno : null, mia: this.risposte[p] ?? null, risposto: this.risposte[p] !== undefined,
      pronti: Array.from({ length: this.n }, (_, i) => this.risposte[i] !== undefined), ultimi: scopri ? this.ultimi : null, punti: this.punti, giuste: this.giuste,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// il computer indovina con una certa probabilità, più bassa quando la differenza è piccola e gli oggetti sono tanti
function bot(g, p, livello) {
  const base = { facile: 0.45, medio: 0.68, difficile: 0.9 }[livello];
  const sottile = { colore: 0, manca: 0.05, grande: 0, sposta: 0.12, gira: 0.15, extra: 0.08 }[g.cambio] + (g.round > 5 ? 0.08 : 0);
  const giusto = Math.random() < base - sottile;
  return { tipo: 'scegli', quale: giusto ? g.diversa : [0, 1, 2, 3].filter((i) => i !== g.diversa)[Math.floor(Math.random() * 3)] };
}

module.exports = {
  meta: {
    id: 'differenze',
    nome: 'Trova le differenze',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Quattro disegni per pochi secondi: uno è leggermente diverso. Quando spariscono, quale era?',
    alias: ['differenze', 'trova la differenza', 'osservazione', 'memoria visiva', 'diverso'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [8, 5, 12], etichette: ['8 round', '5 round', '12 round'], predefinito: 8 }],
    regole: [
      'A ogni round compaiono per pochi secondi quattro disegni uguali… quasi: uno ha una piccola differenza.',
      'Le differenze possibili: un oggetto di un altro colore, un oggetto che manca, un oggetto in più, un oggetto spostato, più grande o girato al contrario.',
      'Quando i disegni spariscono hai 12 secondi per toccare il riquadro (1, 2, 3 o 4) dove c\'era quello diverso.',
      'Punti: 100 se indovini, più fino a 50 se rispondi in fretta; il più veloce tra quelli che indovinano prende altri 25.',
      'Round dopo round i disegni hanno più oggetti, restano in vista meno tempo (da 6 secondi e mezzo fino a 2 e mezzo) e le differenze diventano più sottili.',
      'Dopo 8 round (o 5, o 12) vince chi ha più punti. Si può giocare anche da soli.',
      'Il computer facile indovina meno di metà delle volte, il medio due volte su tre, il difficile quasi sempre; tutti sbagliano di più con le differenze piccole.',
    ],
  },
  crea: (o) => new Differenze(o),
  bot,
  _test: { scena, modifica, CAMBI },
};
