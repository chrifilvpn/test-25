// PONTE FRAGILE: un ponte di vetro sospeso nel vuoto, a righe di due pannelli (sinistra e destra). In ogni riga un
// pannello è di vetro temperato e regge, l'altro si rompe. Si attraversa in fila, uno dopo l'altro: chi è davanti
// sceglie dove saltare; se il vetro regge va avanti e la riga diventa nota a tutti, se si rompe cade e tocca al
// prossimo, che parte dalla riga dove si è fermato il compagno (e ora sa da che parte andare). Chi arriva dall'altra
// parte è salvo. Ogni giocatore ha un "riflesso" per round: guarda il vetro della riga davanti e ha un indizio
// (giusto 3 volte su 4) che vede solo lui. Più round: l'ordine della fila gira, così tutti partono davanti.
const LUNGHEZZE = { corto: 10, medio: 14, lungo: 18 };
const BONUS_ARRIVO = 10;
const PROB_INDIZIO = 0.75;
const PAUSA_CADUTA = 1800, PAUSA_ARRIVO = 1100, PAUSA_ROUND = 3800;
const TEMPO_SALTO = 20000; // chi è davanti ha 20 secondi per saltare, poi salta a caso

class Ponte {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'ponte';
    this.n = n;
    this.lunghezza = LUNGHEZZE[opzioni.lunghezza] ? opzioni.lunghezza : 'medio';
    this.L = LUNGHEZZE[this.lunghezza];
    this.nRound = [1, 3, 5].includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.primo = primo % n;
    this.round = 0;
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.inAttesa = false;
    this.pausaMs = PAUSA_CADUTA;
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoRound() {
    this.round++;
    this.sicuro = Array.from({ length: this.L }, () => (Math.random() < 0.5 ? 0 : 1)); // 0 = sinistra, 1 = destra
    this.noto = new Array(this.L).fill(null); // lato sicuro scoperto
    this.rotto = new Array(this.L).fill(null); // lato rotto (se qualcuno ci è caduto)
    this.fronte = 0; // prima riga ancora da scoprire
    const k = (this.primo + this.round - 1) % this.n;
    this.ordine = Array.from({ length: this.n }, (_, i) => (k + i) % this.n);
    this.stato = new Array(this.n).fill('fila'); // fila | ponte | salvo | caduto
    this.passi = new Array(this.n).fill(0); // righe superate in questo round
    this.riflessi = new Array(this.n).fill(1);
    this.indizi = new Array(this.n).fill(null); // { riga, lato } visto solo da chi l'ha chiesto
    this.ultimo = null; // { posto, riga, lato, regge }
    this.fase = 'gioco';
    this.turno = null;
    this.prossimo();
  }

  // il prossimo della fila sale sul ponte e cammina fino alla prima riga sconosciuta
  prossimo() {
    this.turno = null;
    for (const p of this.ordine) {
      if (this.stato[p] !== 'fila') continue;
      this.stato[p] = 'ponte';
      this.passi[p] = this.fronte;
      if (this.fronte >= this.L) { this.stato[p] = 'salvo'; this.annuncia(p, 'attraversa tutto il ponte sui vetri già scoperti', 'attraversi il ponte sui vetri già scoperti'); continue; }
      this.turno = p;
      this.fineSalto = Date.now() + TEMPO_SALTO;
      return;
    }
    this.fineRound();
  }

  fineRound() {
    this.turno = null;
    const del = this.passi.map((x, p) => x + (this.stato[p] === 'salvo' ? BONUS_ARRIVO : 0));
    del.forEach((x, p) => { this.punti[p] += x; });
    this.storico.push(del);
    if (this.round >= this.nRound) return this.chiudi();
    this.fase = 'fineRound';
    this.inAttesa = true;
    this.pausaMs = PAUSA_ROUND;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a && a.tipo === 'riflesso') {
      if (!this.riflessi[p]) return { errore: 'Hai già usato il riflesso in questo round' };
      this.riflessi[p] = 0;
      const giusto = Math.random() < PROB_INDIZIO;
      this.indizi[p] = { riga: this.fronte, lato: giusto ? this.sicuro[this.fronte] : 1 - this.sicuro[this.fronte] };
      this.annuncia(p, 'guarda il riflesso del vetro…', 'guardi il riflesso del vetro…');
      return { ok: true };
    }
    if (!a || a.tipo !== 'salta' || (a.lato !== 0 && a.lato !== 1 && a.lato !== '0' && a.lato !== '1')) return { errore: 'Scegli sinistra o destra' };
    const lato = Number(a.lato);
    const r = this.fronte;
    const regge = this.sicuro[r] === lato;
    this.ultimo = { posto: p, riga: r, lato, regge, id: this.nEv + 1 };
    this.noto[r] = this.sicuro[r];
    this.fronte++;
    if (regge) {
      this.passi[p] = this.fronte;
      if (this.fronte >= this.L) {
        this.stato[p] = 'salvo';
        this.annuncia(p, 'arriva dall\'altra parte! 🎉', 'sei arrivato dall\'altra parte! 🎉', true);
        this.inAttesa = true; this.pausaMs = PAUSA_ARRIVO; this.fase = 'arrivo';
      } else this.annuncia(p, `il vetro regge (riga ${this.fronte})`, `il vetro regge! Riga ${this.fronte}`);
      return { ok: true };
    }
    this.rotto[r] = lato;
    this.stato[p] = 'caduto';
    this.passi[p] = r;
    this.annuncia(p, 'cade! Il vetro si è rotto 💥', 'il vetro si rompe… sei caduto 💥', true);
    this.inAttesa = true; this.pausaMs = PAUSA_CADUTA; this.fase = 'caduta';
    return { ok: true };
  }

  // l'orologio del salto: allo scadere chi è davanti salta a caso (il server chiama controllaTempo)
  scadenza() { return this.finita || this.inAttesa || this.turno === null ? null : this.fineSalto; }
  controllaTempo() {
    if (this.finita || this.inAttesa || this.turno === null || Date.now() < this.fineSalto) return false;
    const p = this.turno;
    this.azione(p, { tipo: 'salta', lato: Math.random() < 0.5 ? 0 : 1 });
    if (this.evento && this.evento.posto === p) this.evento = { ...this.evento, testo: `non si decide: salta a caso e ${this.evento.testo}`, testoIo: `tempo scaduto, salti a caso: ${this.evento.testoIo}` };
    return true;
  }

  // !win banana: quando tocca a te saltare, i vetri che reggono da qui alla fine (S = sinistra, D = destra)
  suggerimentoWin(posto) {
    if (this.finita || this.inAttesa || this.fase !== 'gioco' || this.turno !== posto || this.fronte >= this.L) return null;
    return `💡 Vetri buoni da qui: ${this.sicuro.slice(this.fronte).map((l) => (l ? 'D' : 'S')).join(' ')}`;
  }

  // dopo una caduta, un arrivo o la fine del round
  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    const eraFine = this.fase === 'fineRound';
    this.fase = 'gioco';
    if (eraFine) this.nuovoRound();
    else this.prossimo();
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.fase = 'fine';
    this.turno = null;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    return { ok: true };
  }

  vista(posto) {
    const ind = this.indizi[posto];
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      L: this.L, round: this.round, nRound: this.nRound, fronte: this.fronte, noto: this.noto, rotto: this.rotto,
      ordine: this.ordine, stato: this.stato, passi: this.passi, punti: this.punti, storico: this.storico,
      riflessi: this.riflessi, restaSalto: this.turno !== null && !this.inAttesa ? Math.max(0, this.fineSalto - Date.now()) : null, indizio: ind && ind.riga === this.fronte && this.turno === posto ? ind.lato : null,
      ultimo: this.ultimo, sicuroFinale: this.fase === 'fineRound' || this.finita ? this.sicuro : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Nessuno sa dove sono i vetri buoni: il facile salta a caso, il medio usa il riflesso ogni tanto, il difficile lo usa
// sempre (subito, è la riga più rischiosa per lui) e si fida dell'indizio.
function bot(g, p, livello) {
  const ind = g.indizi[p] && g.indizi[p].riga === g.fronte ? g.indizi[p].lato : null;
  if (ind === null && g.riflessi[p]) {
    if (livello === 'difficile' || (livello === 'medio' && Math.random() < 0.5)) return { tipo: 'riflesso' };
  }
  if (ind !== null && livello !== 'facile') return { tipo: 'salta', lato: ind };
  return { tipo: 'salta', lato: Math.random() < 0.5 ? 0 : 1 };
}

module.exports = {
  meta: {
    id: 'ponte',
    nome: 'Ponte fragile',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Attraversa il ponte di vetro: a ogni riga un pannello regge e l\'altro si rompe. Chi cade apre la strada agli altri.',
    alias: ['ponte di vetro', 'squid game', 'vetro', 'glass bridge'],
    opzioni: [
      { id: 'lunghezza', nome: 'Ponte', valori: ['medio', 'corto', 'lungo'], etichette: ['14 righe', '10 righe', '18 righe'], predefinito: 'medio' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Il ponte ha 14 righe (oppure 10 o 18) di due pannelli di vetro, a sinistra e a destra. In ogni riga uno regge e l\'altro si rompe.',
      'Si attraversa in fila. Chi è davanti sceglie dove saltare: se il vetro regge avanza di una riga e tutti vedono il pannello buono; se si rompe cade e tocca al prossimo della fila.',
      'Chi sale sul ponte cammina da solo sui vetri già scoperti fino alla prima riga sconosciuta: chi è più indietro nella fila rischia meno.',
      'Chi è davanti ha 20 secondi per saltare: se non si decide, salta a caso.',
      'Una volta per round puoi usare il 🔍 riflesso: guardi il vetro della riga davanti e vedi (solo tu) da che parte sembra temperato. Ha ragione 3 volte su 4.',
      'Punti del round: 1 per ogni riga superata, più 10 se arrivi dall\'altra parte. A ogni round l\'ordine della fila gira, così tutti partono davanti almeno una volta (con abbastanza round).',
      'Dopo l\'ultimo round vince chi ha più punti. A parità è pareggio.',
      'Il computer facile salta a caso, il medio usa il riflesso ogni tanto, il difficile lo usa sempre e si fida.',
    ],
  },
  crea: (o) => new Ponte(o),
  bot,
  _test: { LUNGHEZZE, BONUS_ARRIVO },
};
