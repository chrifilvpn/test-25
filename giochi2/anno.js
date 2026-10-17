// INDOVINA L'ANNO: compare un evento storico e tutti insieme, entro il tempo, scrivono l'anno in cui è successo.
// Più ci si avvicina più punti si fanno; la tolleranza dipende dall'epoca (sbagliare di 5 anni sull'antica Roma è
// quasi giusto, sul Novecento no). Poi si vede l'anno vero e le risposte di tutti sulla linea del tempo.
// I computer rispondono durante il tempo (scadenza) con un errore che dipende dal livello e dall'epoca.
const RIGHE = require('./anno-dati').trim().split('\n');

const ARGOMENTI = {
  s: { nome: 'Storia', icona: '🏛️' },
  i: { nome: 'Scienza e invenzioni', icona: '🔭' },
  c: { nome: 'Arte, libri, cinema e musica', icona: '🎭' },
  p: { nome: 'Sport', icona: '🏅' },
};
const EVENTI = RIGHE.map((r, id) => { const [a, testo, arg] = r.split('|'); return { id, anno: Number(a), testo, arg }; });

const TEST = !!process.env.TEST_VELOCE;
const PAUSA_RIVELA = TEST ? 50 : 9000; // si guarda la soluzione: si va avanti quando tutti sono pronti (o dopo 9 s)

// quanti anni di errore dimezzano i punti, secondo l'epoca
function scala(anno) {
  if (anno < 0) return 60;
  if (anno < 1000) return 30;
  if (anno < 1500) return 15;
  if (anno < 1800) return 8;
  if (anno < 1900) return 4;
  return 2.5;
}
function puntiPer(vero, dato) {
  if (dato === null || dato === undefined) return 0;
  const err = Math.abs(dato - vero);
  if (err === 0) return 100;
  const p = Math.round(90 * Math.pow(0.5, (err - 1) / scala(vero)));
  return p < 5 ? 0 : p;
}
// "1492", "44 a.C."
const scritto = (a) => (a < 0 ? `${-a} a.C.` : String(a));

function mescola(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// la scelta delle domande: argomento, poi epoche varie (non tutte del Novecento)
function scegli(arg, n) {
  const pool = EVENTI.filter((e) => arg === 'tutti' || e.arg === arg);
  const vecchi = mescola(pool.filter((e) => e.anno < 1800)), nuovi = mescola(pool.filter((e) => e.anno >= 1800));
  const quanti = Math.min(vecchi.length, Math.round(n * (arg === 'p' ? 0.1 : 0.35)));
  const scelti = [...vecchi.slice(0, quanti), ...nuovi.slice(0, n - quanti)];
  if (scelti.length < n) scelti.push(...vecchi.slice(quanti, quanti + n - scelti.length));
  return mescola(scelti).slice(0, n);
}

// ---------------- computer ----------------
// sa l'anno esatto con una certa probabilità, altrimenti sbaglia di un errore proporzionale all'epoca
const LIVELLI = {
  facile: { esatto: 0.05, errore: 4.2, tempo: [6000, 15000] },
  medio: { esatto: 0.16, errore: 1.7, tempo: [4000, 12000] },
  difficile: { esatto: 0.4, errore: 0.65, tempo: [2500, 9000] },
};
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function rispostaBot(e, livello) {
  const L = LIVELLI[livello] || LIVELLI.medio;
  if (Math.random() < L.esatto) return e.anno;
  const s = scala(e.anno) * L.errore;
  let d = Math.round(gauss() * s * 1.4);
  if (d === 0) d = Math.random() < 0.5 ? 1 : -1;
  const a = Math.min(new Date().getFullYear(), e.anno + d);
  return a === 0 ? (d > 0 ? 1 : -1) : a; // l'anno zero non esiste
}

class Anno {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'anno';
    this.n = n;
    this.nDomande = [10, 15, 20].includes(Number(opzioni.domande)) ? Number(opzioni.domande) : 10;
    this.durata = ([20, 30, 45].includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 30) * 1000;
    this.arg = ['tutti', 's', 'i', 'c', 'p'].includes(opzioni.argomento) ? opzioni.argomento : 'tutti';
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.domande = scegli(this.arg, this.nDomande);
    this.nDomande = this.domande.length;
    this.punti = new Array(n).fill(0);
    this.esatti = new Array(n).fill(0);
    this.storico = []; // { anno, testo, risposte, punti }
    this.k = -1;
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 0;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.prossima();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  prossima() {
    this.k++;
    this.e = this.domande[this.k];
    this.fase = 'domanda';
    this.risposte = new Array(this.n).fill(null);
    this.ms = new Array(this.n).fill(null);
    this.pronto = new Array(this.n).fill(false);
    this.inizio = Date.now();
    this.fine = this.inizio + this.durata;
    // i computer: quando rispondono e cosa
    this.piano = this.bot.map((l) => {
      if (!l) return null;
      const L = LIVELLI[l] || LIVELLI.medio;
      const t = L.tempo[0] + Math.random() * (L.tempo[1] - L.tempo[0]);
      return { ms: Math.min(this.durata - 1500, Math.round(t * this.durata / 30000)), anno: rispostaBot(this.e, l) };
    });
  }

  attesi() {
    if (this.finita) return [];
    if (this.fase === 'domanda') return this.risposte.map((r, i) => (r === null && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
    return this.pronto.map((f, i) => (!f && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
  }

  scadenza() {
    if (this.finita) return null;
    if (this.fase === 'rivela') return this.fineRivela;
    let t = this.fine;
    for (const pi of this.piano) if (pi) t = Math.min(t, this.inizio + pi.ms);
    return t;
  }

  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    if (this.fase === 'rivela') {
      if (ora >= this.fineRivela) { this.avanti(); return true; }
      return false;
    }
    let cambiato = false;
    this.piano.forEach((pi, p) => {
      if (pi && this.inizio + pi.ms <= ora) { this.piano[p] = null; this.rispondi(p, pi.anno); cambiato = true; }
    });
    if (this.fase === 'domanda' && ora >= this.fine) { this.rivela(); return true; }
    return cambiato;
  }

  rispondi(p, anno) {
    this.risposte[p] = anno;
    this.ms[p] = Date.now() - this.inizio;
    if (this.fase === 'domanda' && !this.attesi().length && this.piano.every((x) => !x)) this.rivela();
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (this.fase === 'rivela') {
      if (a.tipo !== 'pronto') return { errore: 'Guarda la soluzione e premi Avanti' };
      if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
      return { ok: true };
    }
    if (a.tipo !== 'anno') return { errore: 'Mossa non valida' };
    if (this.risposte[p] !== null) return { errore: 'Hai già risposto: aspetta gli altri' };
    if (Date.now() > this.fine + 1500) return { errore: 'Tempo scaduto!' };
    const anno = Number(a.anno);
    if (!Number.isInteger(anno)) return { errore: 'Scrivi un anno' };
    if (anno === 0) return { errore: "L'anno zero non esiste: dopo l'1 a.C. viene l'1 d.C." };
    if (anno < -5000 || anno > new Date().getFullYear()) return { errore: `L'anno deve essere tra il 5000 a.C. e il ${new Date().getFullYear()}` };
    this.rispondi(p, anno);
    return { ok: true };
  }

  salta(p) {
    if (this.finita) return;
    if (this.fase === 'domanda') { if (this.risposte[p] === null) { this.risposte[p] = undefined; if (!this.attesi().length && this.piano.every((x) => !x)) this.rivela(); } }
    else if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
  }

  rivela() {
    if (this.fase !== 'domanda') return;
    // i computer che non hanno ancora risposto rispondono adesso
    this.piano.forEach((pi, p) => { if (pi) { this.risposte[p] = pi.anno; this.ms[p] = pi.ms; } });
    this.piano = this.piano.map(() => null);
    const vero = this.e.anno;
    const risposte = this.risposte.map((r) => (r === undefined ? null : r));
    const punti = risposte.map((r) => puntiPer(vero, r));
    punti.forEach((x, p) => { this.punti[p] += x; if (x === 100) this.esatti[p]++; });
    this.esito = { anno: vero, risposte, punti, ms: this.ms };
    this.storico.push({ anno: vero, testo: this.e.testo, arg: this.e.arg, risposte, punti });
    this.fase = 'rivela';
    this.fineRivela = Date.now() + PAUSA_RIVELA;
    const esatti = punti.map((x, i) => (x === 100 ? i : -1)).filter((i) => i >= 0);
    if (esatti.length === 1 && this.n > 1) this.annuncia(esatti[0], `indovina l'anno esatto: ${scritto(vero)}! 🎯`, `anno esatto! 🎯 +100`, true);
    else if (esatti.length > 1) this.annuncia(null, `Anno esatto per ${esatti.length} giocatori 🎯`, '', true);
    else this.annuncia(null, `Era il ${scritto(vero)}`, '', false);
  }

  avanti() {
    if (this.fase !== 'rivela') return;
    if (this.k + 1 >= this.nDomande) return this.chiudi();
    this.prossima();
  }

  chiudi() {
    this.finita = true;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti',
      pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 || v.length === 1 ? v : [],
    };
    if (this.n === 1) this.risultato.titolo = `${max} punti su ${this.nDomande * 100}`;
  }

  vista(p) {
    const q = Number.isInteger(p) && p >= 0 && p < this.n ? p : 0;
    const dom = this.fase === 'domanda';
    return {
      gioco: this.id, n: this.n, fase: this.fase, k: this.k, nDomande: this.nDomande, durata: this.durata, argomento: this.arg,
      testo: this.e.testo, arg: this.e.arg, nomeArg: ARGOMENTI[this.e.arg].nome, icona: ARGOMENTI[this.e.arg].icona,
      resta: dom ? Math.max(0, this.fine - Date.now()) : 0,
      restaRivela: !dom && !this.finita ? Math.max(0, this.fineRivela - Date.now()) : 0,
      mia: this.risposte[q] === undefined ? null : this.risposte[q],
      mioPronto: this.pronto[q],
      // durante la domanda degli altri si vede solo se hanno risposto
      altri: this.risposte.map((r, i) => ({ risposto: r !== null, pronto: this.pronto[i] })),
      esito: dom ? null : this.esito,
      punti: this.punti, esatti: this.esatti,
      riepilogo: this.finita ? this.storico.map((s) => ({ anno: s.anno, testo: s.testo, arg: s.arg, mia: s.risposte[q], punti: s.punti[q] })) : null,
      turno: null, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// il server lo chiama per un computer messo al posto di chi è uscito: risponde come il medio, oppure è pronto
function bot(g) {
  if (g.fase === 'rivela') return { tipo: 'pronto' };
  return { tipo: 'anno', anno: rispostaBot(g.e, 'medio') };
}

module.exports = {
  meta: {
    id: 'anno',
    nome: "Indovina l'anno",
    tipo: 'tabellone',
    saltaAssenti: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: `Compare un fatto storico, un'invenzione, un film o un'impresa sportiva: in che anno è successo? Più ti avvicini, più punti fai. ${EVENTI.length} eventi.`,
    alias: ['indovina anno', 'anno', 'date storiche', 'quiz storia', 'linea del tempo', 'timeline', 'cronologia', 'in che anno'],
    opzioni: [
      { id: 'domande', nome: 'Domande', valori: [10, 15, 20], etichette: ['10 eventi', '15 eventi', '20 eventi'], predefinito: 10 },
      { id: 'tempo', nome: 'Tempo', valori: [30, 20, 45], etichette: ['30 secondi', '20 secondi', '45 secondi'], predefinito: 30 },
      { id: 'argomento', nome: 'Argomento', valori: ['tutti', 's', 'i', 'c', 'p'], etichette: ['Tutti', 'Storia', 'Scienza e invenzioni', 'Arte, libri, cinema e musica', 'Sport'], predefinito: 'tutti' },
    ],
    regole: [
      `Compare un evento (ce ne sono ${EVENTI.length}, dall'antichità a oggi): una battaglia, una scoperta, un libro, un film, un'impresa sportiva. Tutti insieme scrivono l'anno in cui è successo, entro 30 secondi (o 20, o 45).`,
      'Sul computer basta scrivere le cifre con la tastiera e premere Invio; con i tasti freccia l\'anno sale e scende (con Maiusc di 10 in 10). Per gli anni prima di Cristo si preme il tasto "a.C." (o il tasto meno). Si può anche trascinare la linea del tempo.',
      'Anno esatto: 100 punti. Altrimenti i punti calano con la distanza, e la tolleranza dipende dall\'epoca: per il Novecento si dimezzano ogni 2-3 anni di errore, per l\'Ottocento ogni 4, dal 1500 al 1800 ogni 8, nel Medioevo ogni 15-30, prima di Cristo ogni 60.',
      'Chi non risponde in tempo fa 0 punti. L\'anno zero non esiste: dopo l\'1 a.C. viene l\'1 d.C.',
      'Quando tutti hanno risposto (o il tempo finisce) si vede l\'anno vero e le risposte di tutti sulla linea del tempo, con i punti fatti.',
      'Vince chi ha più punti dopo 10 eventi (o 15, o 20). Da soli si gioca per il record: il massimo è 100 punti per evento.',
      'Il computer facile sbaglia spesso anche di parecchio, il medio se la cava bene, il difficile conosce molte date esatte e sbaglia di poco.',
    ],
  },
  crea: (o) => new Anno(o),
  bot,
  _test: { EVENTI, ARGOMENTI, scala, puntiPer, scegli, rispostaBot, LIVELLI, scritto },
};
