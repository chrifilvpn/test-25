// OGGETTI SULLA MENSOLA (memoria), su uno scaffale con più ripiani: al primo round un ripiano, poi due, poi tre.
// Due versioni, da scegliere prima:
// - "ordine": gli oggetti restano in vista qualche secondo, poi si mescolano: rimettili sulla mensola nell'ordine giusto.
//   A ogni round ci sono più oggetti (da 5 fino a 15) su più ripiani.
// - "cambiato": guardi la mensola, si spegne la luce, si riaccende e una cosa è cambiata (un oggetto sostituito o due
//   oggetti scambiati): trova dove.
// Tutti rispondono insieme. Il computer "ricorda" con una certa probabilità, a seconda del livello.
const OGGETTI = ['tazza', 'libro', 'vaso', 'lampada', 'sveglia', 'pianta', 'candela', 'palla', 'cubo', 'bottiglia', 'cornice', 'orsetto', 'mela', 'teiera',
  'chiave', 'ombrello', 'cappello', 'scarpa', 'pesce', 'telefono', 'dado', 'fiore'];
// quanti oggetti a ogni round (per numero di round) e come si dividono sui ripiani (al massimo 5 per ripiano)
const OGGETTI_ROUND = { ordine: [5, 7, 9, 11, 12, 13, 15], cambiato: [5, 7, 9, 10, 12, 13, 15] };
function ripiani(k) { const n = Math.ceil(k / 5); const base = Math.floor(k / n), resto = k % n; return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0)); }
const ROUND = 5;
const GUARDA_MS = (k) => 1500 + k * 850;   // tempo per guardare, cresce con gli oggetti
const RISPOSTA_MS = 45000;
const MEMORIA = { facile: 0.55, medio: 0.75, difficile: 0.92 };
const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class Mensola {
  constructor({ n, opzioni = {} }) {
    this.id = 'mensola';
    this.n = n;
    this.modo = opzioni.modo === 'cambiato' ? 'cambiato' : 'ordine';
    this.nRound = [3, 5, 7].includes(Number(opzioni.round)) ? Number(opzioni.round) : ROUND;
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.round = 0;
    this.turno = null; this.inAttesa = false; this.pausaMs = 4000;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.nuovoRound();
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoRound() {
    this.round++;
    const k = OGGETTI_ROUND[this.modo][Math.min(this.round, 7) - 1];
    this.k = k;
    this.piani = ripiani(k);
    this.mensola = mescola([...OGGETTI]).slice(0, k);
    this.risposte = {};
    this.esiti = null;
    if (this.modo === 'cambiato') {
      const dopo = this.mensola.slice();
      if (Math.random() < 0.5) {
        // un oggetto sostituito con uno nuovo
        const i = Math.floor(Math.random() * k);
        const nuovi = OGGETTI.filter((o) => !this.mensola.includes(o));
        dopo[i] = nuovi[Math.floor(Math.random() * nuovi.length)];
        this.cambio = { tipo: 'sostituito', posti: [i] };
      } else {
        // due oggetti scambiati di posto
        const i = Math.floor(Math.random() * k);
        let j = Math.floor(Math.random() * (k - 1)); if (j >= i) j++;
        [dopo[i], dopo[j]] = [dopo[j], dopo[i]];
        this.cambio = { tipo: 'scambiati', posti: [i, j].sort((a, b) => a - b) };
      }
      this.dopo = dopo;
    } else this.mescolati = mescola(this.mensola.slice());
    this.fase = 'guarda';
    this.fineFase = Date.now() + GUARDA_MS(k);
  }

  attesi() { return this.fase === 'rispondi' && !this.finita ? Array.from({ length: this.n }, (_, i) => i).filter((i) => this.risposte[i] === undefined) : []; }
  scadenza() { return (this.fase === 'guarda' || this.fase === 'buio' || this.fase === 'rispondi') && !this.finita ? this.fineFase : null; }
  controllaTempo() {
    if (Date.now() < this.fineFase) return false;
    if (this.fase === 'guarda') {
      // nella versione "cambiato" c'è un attimo di buio prima di riaccendere la luce
      if (this.modo === 'cambiato') { this.fase = 'buio'; this.fineFase = Date.now() + 1200; return true; }
      this.fase = 'rispondi'; this.fineFase = Date.now() + RISPOSTA_MS; return true;
    }
    if (this.fase === 'buio') { this.fase = 'rispondi'; this.fineFase = Date.now() + RISPOSTA_MS; return true; }
    if (this.fase === 'rispondi') { this.valuta(); return true; }
    return false;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.fase !== 'rispondi') return { errore: this.fase === 'guarda' ? 'Guarda bene la mensola…' : 'Un attimo…' };
    if (this.risposte[p] !== undefined) return { errore: 'Hai già risposto' };
    if (this.modo === 'ordine') {
      if (!a || a.tipo !== 'ordine' || !Array.isArray(a.ordine)) return { errore: 'Rimetti tutti gli oggetti sulla mensola' };
      const o = a.ordine.map(String);
      if (o.length !== this.k || [...o].sort().join() !== [...this.mensola].sort().join()) return { errore: 'Devi mettere tutti gli oggetti, una volta ciascuno' };
      this.risposte[p] = o;
    } else {
      if (!a || a.tipo !== 'cambiato') return { errore: 'Tocca l\'oggetto che è cambiato' };
      const i = Number(a.posto);
      if (!Number.isInteger(i) || i < 0 || i >= this.k) return { errore: 'Scegli un oggetto della mensola' };
      this.risposte[p] = i;
    }
    if (!this.attesi().length) this.valuta();
    return { ok: true };
  }

  salta(p) { if (this.attesi().includes(p)) this.risposte[p] = null; if (!this.attesi().length && this.fase === 'rispondi') this.valuta(); return { ok: true }; }

  valuta() {
    this.esiti = this.risposte;
    const fatti = new Array(this.n).fill(0);
    for (let p = 0; p < this.n; p++) {
      const r = this.risposte[p];
      if (r == null) continue;
      if (this.modo === 'ordine') {
        const giusti = r.filter((o, i) => o === this.mensola[i]).length;
        fatti[p] = giusti + (giusti === this.k ? 2 : 0); // tutto giusto: 2 punti in più
      } else fatti[p] = this.cambio.posti.includes(r) ? 3 : 0;
    }
    fatti.forEach((x, p) => { this.punti[p] += x; });
    this.storico.push({ fatti, k: this.k });
    this.ultimiPunti = fatti;
    const max = Math.max(...fatti);
    if (max > 0 && this.n > 1) { const chi = fatti.indexOf(max); this.annuncia(chi, `fa ${max} punti in questo round`, `${max} punti in questo round! 🧠`); }
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
    if (this.n === 1) this.risultato.titolo = `Hai fatto ${this.punti[0]} punti`;
  }

  // il trucco segreto (!win): quando tocca rispondere gli sussurra la soluzione (l'ordine, ripiano per ripiano, o l'oggetto cambiato)
  suggerimentoWin(posto) {
    if (this.finita || this.fase !== 'rispondi' || this.risposte[posto] !== undefined) return null;
    if (this.modo === 'cambiato') return `🧠 Tocca: ${this.dopo[this.cambio.posti[0]]}`;
    let i = 0;
    return `🧠 ${this.piani.map((k) => this.mensola.slice(i, (i += k)).join(', ')).join(' / ')}`;
  }

  vista(p) {
    const f = this.fase;
    const scopri = f === 'esito' || this.finita;
    return {
      gioco: this.id, n: this.n, modo: this.modo, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs, fase: f,
      round: this.round, nRound: this.nRound, k: this.k, piani: this.piani, fineFase: this.fineFase, restaMs: Math.max(0, this.fineFase - Date.now()),
      // durante "guarda" si vede la mensola; dopo, nella versione ordine, solo gli oggetti mescolati
      mensola: f === 'guarda' || scopri ? this.mensola : null,
      mescolati: this.modo === 'ordine' && f === 'rispondi' ? this.mescolati : null,
      dopo: this.modo === 'cambiato' && (f === 'rispondi' || scopri) ? this.dopo : null,
      cambio: scopri && this.modo === 'cambiato' ? this.cambio : null,
      mia: this.risposte[p] ?? (this.esiti ? this.esiti[p] ?? null : null), risposto: this.risposte[p] !== undefined,
      pronti: Array.from({ length: this.n }, (_, i) => this.risposte[i] !== undefined),
      ultimiPunti: scopri ? this.ultimiPunti : null, punti: this.punti,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Si ricorda ogni oggetto con una probabilità che scende un po' con il numero di oggetti.
function bot(g, p, livello) {
  const pr = Math.max(0.2, MEMORIA[livello] - (g.k - 5) * 0.03);
  if (g.modo === 'cambiato') {
    const giusto = Math.random() < pr + 0.05;
    const r = giusto ? g.cambio.posti[Math.floor(Math.random() * g.cambio.posti.length)] : Math.floor(Math.random() * g.k);
    return { tipo: 'cambiato', posto: r };
  }
  const ordine = new Array(g.k).fill(null);
  const restano = new Set(g.mensola);
  g.mensola.forEach((o, i) => { if (Math.random() < pr) { ordine[i] = o; restano.delete(o); } });
  const altri = mescola([...restano]);
  for (let i = 0; i < g.k; i++) if (ordine[i] === null) ordine[i] = altri.pop();
  return { tipo: 'ordine', ordine };
}

module.exports = {
  meta: {
    id: 'mensola',
    nome: 'Oggetti sulla mensola',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Memoria: ricorda com\'erano disposti gli oggetti sulla mensola, oppure scopri cosa è cambiato.',
    alias: ['memoria', 'memory', 'mensola'],
    opzioni: [
      { id: 'modo', nome: 'Versione', valori: ['ordine', 'cambiato'], etichette: ['Rimetti in ordine', 'Cosa è cambiato?'], predefinito: 'ordine' },
      { id: 'round', nome: 'Round', valori: [5, 3, 7], etichette: ['5 round', '3 round', '7 round'], predefinito: 5 },
    ],
    regole: [
      'Si sceglie prima la versione: "Rimetti in ordine" oppure "Cosa è cambiato?". Tutti giocano insieme la stessa mensola e rispondono nello stesso momento.',
      'Gli oggetti stanno su uno scaffale a più ripiani: al primo round un ripiano con 5 oggetti, poi due ripiani, poi tre, fino a 15 oggetti (al massimo 5 per ripiano).',
      'Rimetti in ordine: li vedi per qualche secondo (di più se sono tanti), poi spariscono e compaiono mescolati sotto.',
      'Rimetti in ordine: tocca gli oggetti uno dopo l\'altro nell\'ordine in cui erano, ripiano per ripiano dall\'alto in basso e da sinistra a destra (toccando un oggetto già messo lo togli). Quando sono tutti sullo scaffale premi "Conferma". 1 punto per ogni oggetto al posto giusto, 2 punti in più se sono tutti giusti.',
      'Cosa è cambiato: guardi la mensola, la luce si spegne un attimo e quando si riaccende una cosa è cambiata: un oggetto è stato sostituito con un altro, oppure due oggetti si sono scambiati di posto. Tocca l\'oggetto cambiato (se ne sono scambiati due, va bene uno dei due): 3 punti.',
      'Per rispondere ci sono 45 secondi. A fine round si vede la soluzione e i punti di tutti. Dopo 5 round (o 3, o 7) vince chi ha più punti. Si può giocare anche da soli.',
      'Il computer facile si ricorda poco, il medio abbastanza, il difficile quasi tutto; tutti fanno più fatica quando gli oggetti sono tanti.',
    ],
  },
  crea: (o) => new Mensola(o),
  bot,
  _test: { OGGETTI, ripiani, OGGETTI_ROUND },
};
