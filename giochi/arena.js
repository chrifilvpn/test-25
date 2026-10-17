// MOTORE COMUNE dei giochi d'azione in tempo reale (Palloncini, Gatto e topi, Ladro di colori, Bumper Balls, ecc.).
// Ogni gioco estende Arena e scrive solo le sue regole:
//   iniziaRound(ora)            prepara il campo del round
//   passo(dt, ora)              fa avanzare il mondo di dt secondi; restituisce true quando il round è finito
//   pensa(p, livello, ora)      l'input del computer { x, y, a, mx, my } (x e y da -1 a 1, a = azione)
//   fineRound()                 assegna i punti del round (this.punti)
//   statoTick()                 quello che il browser disegna (piccolo: parte a ogni tick)
// Il motore pensa a: conto alla rovescia, round, pausa (dispense), input dal browser, computer, risultato finale.
const VIA_MS = 3000, PAUSA_ROUND_MS = 4000;

class Arena {
  constructor({ n, opzioni = {}, bot = [] }, { id, tickMs = 33, round = 3 } = {}) {
    this.id = id;
    this.n = n;
    this.opzioni = opzioni;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.tickMs = tickMs;
    this.nRound = Number(opzioni.round) > 0 ? Number(opzioni.round) : round;
    this.round = 0;
    this.punti = new Array(n).fill(0);
    this.inp = Array.from({ length: n }, () => ({ x: 0, y: 0, a: false, tocchi: 0, mx: null, my: null }));
    this.tocchiVisti = new Array(n).fill(0);
    this.usciti = new Array(n).fill(false);
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
    this.storico = [];
  }
  avvia() { this.nuovoRound(Date.now()); return this; }
  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; }
  esce(p) { this.usciti[p] = true; if (!this.bot[p]) this.bot[p] = 'medio'; }
  rientra(p) { this.usciti[p] = false; }
  attesi() { return []; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) { const d = Date.now() - this.pausaDal; this.fineFase += d; this.ultimoTick = null; if (this.spostaTempi) this.spostaTempi(d); }
    this.inPausa = si;
  }

  nuovoRound(ora) {
    this.round++;
    this.fase = 'via';
    // un gioco può accorciare le attese (this.viaMs, this.pausaRoundMs): per esempio Wanted!, con tanti round brevi
    this.fineFase = ora + (this.round > 1 && this.viaMs ? this.viaMs : VIA_MS);
    this.tempoRound = 0; // secondi di gioco nel round
    this.ultimoTick = null;
    for (const i of this.inp) i.px = i.py = null; // posizioni vecchie del browser: non valgono nel round nuovo
    this.iniziaRound(ora);
  }

  // comandi dal browser: { x, y } direzione (-1..1), { a } tasto azione tenuto, { t } quante volte è stato premuto
  // (un contatore: così un tocco non si perde anche se un messaggio arriva in ritardo), { mx, my } mira o bersaglio
  input(p, d) {
    if (!d || this.finita || this.bot[p]) return;
    const i = this.inp[p];
    const lim = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
    if (d.x !== undefined) i.x = lim(d.x);
    if (d.y !== undefined) i.y = lim(d.y);
    const l = Math.hypot(i.x, i.y); if (l > 1) { i.x /= l; i.y /= l; }
    if (d.a !== undefined) i.a = !!d.a;
    if (Number.isFinite(Number(d.t)) && Number(d.t) > i.tocchi && Number(d.t) - i.tocchi < 50) i.tocchi = Number(d.t);
    // posizione calcolata dal browser (giochi con il movimento previsto): il server la insegue con le sue regole
    if (d.px !== undefined && Number.isFinite(Number(d.px)) && Number.isFinite(Number(d.py))) { i.px = Math.max(-1e5, Math.min(1e5, Number(d.px))); i.py = Math.max(-1e5, Math.min(1e5, Number(d.py))); }
    else if (d.px === null) i.px = i.py = null;
    if (d.mx !== undefined && Number.isFinite(Number(d.mx))) { i.mx = Math.max(-50, Math.min(this.W + 50, Number(d.mx))); i.my = Math.max(-50, Math.min(this.H + 50, Number(d.my) || 0)); }
  }
  // direzione verso la posizione che il browser ha già calcolato (movimento previsto): il server la raggiunge alla sua
  // velocità (al massimo il 25% in più per recuperare un ritardo della rete) e con i suoi muri. Una posizione troppo
  // lontana (vecchia, o dopo un teletrasporto) non si insegue: vale la direzione dei tasti.
  verso(p, e, v, dt) {
    const i = this.inp[p];
    if (this.bot[p] || i.px === null || i.px === undefined) return { x: i.x, y: i.y };
    const dx = i.px - e.x, dy = i.py - e.y, l = Math.hypot(dx, dy);
    if (l > 250) { i.px = i.py = null; return { x: i.x, y: i.y }; }
    if (l < 0.5) return { x: 0, y: 0 };
    const k = Math.min(1.25, l / Math.max(1e-6, v * dt));
    return { x: (dx / l) * k, y: (dy / l) * k };
  }
  // quante volte p ha premuto l'azione dall'ultima volta che il gioco l'ha chiesto
  nuoviTocchi(p) { const k = this.inp[p].tocchi - this.tocchiVisti[p]; this.tocchiVisti[p] = this.inp[p].tocchi; return Math.max(0, k); }

  tick(ora) {
    this.nTick = (this.nTick || 0) + 1;
    if (this.finita || this.inPausa) return false;
    if (this.fase === 'via') { if (ora >= this.fineFase) { this.fase = 'gioco'; this.ultimoTick = ora; this.tocchiVisti = this.inp.map((x) => x.tocchi); return true; } return false; }
    if (this.fase === 'pausaRound') {
      if (ora < this.fineFase) return false;
      if (this.round >= this.nRound) { this.chiudi(); return true; }
      this.nuovoRound(ora);
      return true;
    }
    if (this.fase !== 'gioco') return false;
    const dt = Math.min(0.06, (ora - (this.ultimoTick || ora)) / 1000);
    this.ultimoTick = ora;
    this.tempoRound += dt;
    // i computer decidono il loro input
    for (let p = 0; p < this.n; p++) if (this.bot[p]) {
      const d = this.pensa(p, this.bot[p], ora) || {};
      const i = this.inp[p];
      i.x = d.x || 0; i.y = d.y || 0; i.a = !!d.a;
      if (d.tocco) i.tocchi++;
      if (d.mx !== undefined) { i.mx = d.mx; i.my = d.my; }
    }
    this.cambiato = false;
    const fine = this.passo(dt, ora);
    if (fine) {
      this.fineRound();
      this.storico.push(this.punti.slice());
      this.fase = 'pausaRound';
      this.fineFase = ora + (this.pausaRoundMs || PAUSA_ROUND_MS);
      return true;
    }
    return this.cambiato;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: Math.round(x) })), etichetta: this.etichettaPunti || 'punti', pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 ? [0] : v.length > 1 ? [] : v };
  }

  // Molti giochi in statoTick "consumano" gli effetti del tick (const x = this.x; this.x = []): il server chiama
  // vistaTick una volta per ogni giocatore, quindi gli effetti arrivavano solo al primo. Qui, dal secondo giocatore
  // in poi dello stesso tick, si rimettono per un attimo gli elenchi consumati dal primo.
  vistaTick(posto) {
    if (this._effTick !== this.nTick) {
      this._effTick = this.nTick;
      this._effPrima = {};
      for (const k of Object.keys(this)) if (Array.isArray(this[k])) this._effPrima[k] = this[k];
      this._effConsumati = null;
      const v = this.vistaTick0(posto);
      // gli elenchi che statoTick ha sostituito con uno vuoto: erano effetti da dare anche agli altri
      this._effConsumati = {};
      for (const [k, vecchio] of Object.entries(this._effPrima)) if (this[k] !== vecchio && Array.isArray(this[k]) && !this[k].length && vecchio.length) this._effConsumati[k] = vecchio;
      return v;
    }
    const c = this._effConsumati || {};
    const ora = {};
    for (const k of Object.keys(c)) { ora[k] = this[k]; this[k] = c[k]; }
    const v = this.vistaTick0(posto);
    for (const k of Object.keys(c)) this[k] = ora[k];
    return v;
  }
  vistaTick0(posto) {
    const ora = Date.now();
    const rif = this.inPausa ? this.pausaDal : ora;
    return { ts: ora, fase: this.fase, round: this.round, pausa: this.inPausa, via: this.fase === 'via' ? Math.max(0, this.fineFase - rif) : 0, t: Math.round(this.tempoRound * 100) / 100, s: this.statoTick(posto) }; // statoTick(posto): alcuni giochi mostrano cose diverse a ognuno
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      W: this.W, H: this.H, nRound: this.nRound, punti: this.punti.map((x) => Math.round(x)), storico: this.storico, bot: this.bot.map(Boolean),
      stato: this.vistaTick(p), extra: this.vistaExtra ? this.vistaExtra(p) : null,
    };
  }
}

// ---------- piccoli attrezzi comuni ----------
const casuale = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const verso = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
const limita = (v, a, b) => Math.max(a, Math.min(b, v));
// il computer "sbaglia" un po' (più il livello è basso): mira o direzione rumorosa
const rumore = (livello) => ({ facile: 0.55, medio: 0.25, difficile: 0.08 }[livello] || 0.25);
const reazione = (livello) => ({ facile: 0.45, medio: 0.22, difficile: 0.08 }[livello] || 0.22); // secondi di ritardo
const COLORI = ['#e8453c', '#2f7fd8', '#2e9d57', '#e0a91c', '#8e55c9', '#e36fa5', '#1fa3a3', '#e07b2c'];

module.exports = { Arena, casuale, dist, verso, limita, rumore, reazione, COLORI, VIA_MS, PAUSA_ROUND_MS };
