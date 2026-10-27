// PONTE FRAGILE (come nella serie Squid Game): un ponte di vetro sospeso nel vuoto, a righe di due pannelli (sinistra e
// destra). In ogni riga un pannello è di vetro temperato e regge, l'altro si rompe. Non ci sono turni: tutti partono
// dalla piattaforma e chiunque può saltare sulla riga davanti quando vuole. Sui vetri già scoperti si va avanti sicuri;
// sulla prima riga sconosciuta chi salta rischia, e chi aspetta lascia che sia un altro a scoprirla. Ma il tempo è
// uno solo per tutti: allo scadere il ponte crolla e chi non è arrivato cade. Si può anche spingere chi sta sulla
// tua stessa riga verso il vetro sconosciuto (la spinta si ricarica molto lentamente). Ognuno ha un "riflesso" per
// round: guarda il vetro della riga davanti e ha un indizio (giusto 3 volte su 4) che vede solo lui.
const LUNGHEZZE = { corto: 10, medio: 14, lungo: 18 };
const TEMPI = { normale: 6, stretto: 4, largo: 9 }; // secondi per riga: il tempo del round è righe × questo
const BONUS_ARRIVO = 10;
const PROB_INDIZIO = 0.75;
const PAUSA_ROUND = 3800;
const EQUILIBRIO = 700; // dopo un salto serve un attimo per ritrovare l'equilibrio prima del prossimo
const SPINTA_PRIMA = 25000, SPINTA_RICARICA = 60000; // la prima spinta dopo 25 s, poi una ogni minuto

class Ponte {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'ponte';
    this.n = n;
    this.lunghezza = LUNGHEZZE[opzioni.lunghezza] ? opzioni.lunghezza : 'medio';
    this.L = LUNGHEZZE[this.lunghezza];
    this.tempo = TEMPI[opzioni.tempo] ? opzioni.tempo : 'normale';
    this.durata = this.L * TEMPI[this.tempo] * 1000;
    this.nRound = [1, 3, 5].includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.primo = primo % n;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.round = 0;
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.turno = null; // si gioca tutti insieme: niente turni
    this.inAttesa = false;
    this.pausaMs = PAUSA_ROUND;
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; this.prossimaBot[p] = Date.now() + 800; }
  esce(p) { if (!this.bot[p]) this.impostaBot(p, 'medio'); }
  rientra(p) { this.bot[p] = null; }

  nuovoRound() {
    this.round++;
    this.sicuro = Array.from({ length: this.L }, () => (Math.random() < 0.5 ? 0 : 1)); // 0 = sinistra, 1 = destra
    this.noto = new Array(this.L).fill(null); // lato sicuro scoperto
    this.rotto = new Array(this.L).fill(null); // lato rotto (se qualcuno ci è caduto)
    this.fronte = 0; // prima riga ancora da scoprire
    // l'ordine serve solo a disegnare la piattaforma (gira a ogni round)
    const k = (this.primo + this.round - 1) % this.n;
    this.ordine = Array.from({ length: this.n }, (_, i) => (k + i) % this.n);
    this.pos = new Array(this.n).fill(-1); // -1 = sulla piattaforma di partenza, 0..L-1 = riga, L = arrivato
    this.lato = new Array(this.n).fill(null); // su che pannello sta (per il disegno)
    this.stato = new Array(this.n).fill('ponte'); // ponte | salvo | caduto
    this.riflessi = new Array(this.n).fill(1);
    this.indizi = new Array(this.n).fill(null); // { riga, lato } visto solo da chi l'ha chiesto
    const ora = Date.now();
    this.inizio = ora;
    this.fine = ora + this.durata;
    this.spinta = new Array(this.n).fill(ora + SPINTA_PRIMA); // da quando si può spingere
    this.fermo = new Array(this.n).fill(0); // fino a quando ritrova l'equilibrio
    this.ultimo = null; // { posto, riga, lato, regge, spinto, id }
    this.cadute = []; // le cadute del round, per il disegno
    this.fase = 'gioco';
    this.inAttesa = false;
    this.menti = {};
    this.prossimaBot = this.bot.map((b) => (b ? ora + 1500 + Math.random() * 2500 : null));
  }

  inGioco(p) { return this.stato[p] === 'ponte' && !this.finita && !this.inAttesa; }
  // chi sta davanti alla prima riga sconosciuta (e rischia saltando)
  davanti(p) { return this.inGioco(p) && this.pos[p] + 1 === this.fronte && this.fronte < this.L; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    if (this.stato[p] === 'salvo') return { errore: 'Sei già arrivato dall\'altra parte' };
    if (this.stato[p] === 'caduto') return { errore: 'Sei caduto: guarda gli altri' };
    const ora = Date.now();
    if (ora >= this.fine) { this.crolla(); return { errore: 'Il tempo è finito' }; }
    if (a.tipo === 'riflesso') {
      if (!this.riflessi[p]) return { errore: 'Hai già usato il riflesso in questo round' };
      if (!this.davanti(p)) return { errore: 'Il riflesso si usa sul vetro sconosciuto davanti a te' };
      this.riflessi[p] = 0;
      const giusto = Math.random() < PROB_INDIZIO;
      this.indizi[p] = { riga: this.fronte, lato: giusto ? this.sicuro[this.fronte] : 1 - this.sicuro[this.fronte] };
      this.annuncia(p, 'guarda il riflesso del vetro…', 'guardi il riflesso del vetro…');
      return { ok: true };
    }
    if (a.tipo === 'salta') {
      if (ora < this.fermo[p]) return { errore: 'Ritrova l\'equilibrio…' };
      const r = this.pos[p] + 1;
      // sui vetri già scoperti si va sul pannello buono; su quello nuovo bisogna scegliere
      if (this.noto[r] !== null) return this.atterra(p, this.noto[r], false, null);
      if (a.lato !== 0 && a.lato !== 1 && a.lato !== '0' && a.lato !== '1') return { errore: 'Scegli sinistra o destra' };
      return this.atterra(p, Number(a.lato), false, null);
    }
    if (a.tipo === 'spingi') {
      const q = Number(a.chi);
      if (!Number.isInteger(q) || q < 0 || q >= this.n || q === p) return { errore: 'Chi vuoi spingere?' };
      if (ora < this.spinta[p]) return { errore: `La spinta si ricarica: ancora ${Math.ceil((this.spinta[p] - ora) / 1000)} s` };
      if (this.stato[q] !== 'ponte' || this.pos[q] !== this.pos[p]) return { errore: 'Puoi spingere solo chi sta sulla tua stessa riga' };
      if (!this.davanti(q)) return { errore: 'Davanti a voi il vetro è già scoperto: spingere non serve' };
      this.spinta[p] = ora + SPINTA_RICARICA;
      // la spinta lo butta sulla riga sconosciuta, da una parte a caso
      return this.atterra(q, Math.random() < 0.5 ? 0 : 1, true, p);
    }
    return { errore: 'Mossa non valida' };
  }

  // p atterra sul pannello "lato" della riga davanti (da solo o spinto da "chi")
  atterra(p, lato, spinto, chi) {
    const r = this.pos[p] + 1, nuova = this.noto[r] === null;
    const regge = this.sicuro[r] === lato;
    this.fermo[p] = Date.now() + EQUILIBRIO;
    if (nuova || !regge) this.ultimo = { posto: p, riga: r, lato, regge, spinto, da: chi, id: this.nEv + 1 };
    if (nuova) { this.noto[r] = this.sicuro[r]; this.fronte = r + 1; }
    const da = spinto ? `viene spinto da ${this.nome(chi)} e ` : '';
    const daIo = spinto ? `${this.nome(chi)} ti spinge e ` : '';
    if (!regge) {
      this.rotto[r] = lato;
      this.stato[p] = 'caduto';
      this.cadute.push({ posto: p, riga: r, lato });
      this.annuncia(p, `${da}cade! Il vetro si è rotto 💥`, `${daIo}il vetro si rompe… sei caduto 💥`, true);
      this.controllaFine();
      return { ok: true };
    }
    this.pos[p] = r; this.lato[p] = lato;
    if (r === this.L - 1) {
      // l'ultima riga regge: un passo ed è dall'altra parte
      this.pos[p] = this.L; this.lato[p] = null; this.stato[p] = 'salvo';
      this.annuncia(p, `${da}arriva dall'altra parte! 🎉`, `${daIo}sei arrivato dall'altra parte! 🎉`, true);
      this.controllaFine();
    } else if (nuova) this.annuncia(p, `${da}trova il vetro buono (riga ${r + 1})`, `${daIo}il vetro regge! Riga ${r + 1}`);
    return { ok: true };
  }
  nome(p) { return (this.nomiGiocatori && this.nomiGiocatori[p]) || `Giocatore ${p + 1}`; }

  // il round finisce quando nessuno è più sul ponte
  controllaFine() { if (!this.stato.includes('ponte')) this.fineRound(); }
  // tempo scaduto: il ponte crolla e chi non è arrivato cade
  crolla() {
    if (this.finita || this.inAttesa) return;
    const presi = [];
    for (let p = 0; p < this.n; p++) if (this.stato[p] === 'ponte') { this.stato[p] = 'caduto'; this.cadute.push({ posto: p, riga: this.pos[p], lato: this.lato[p], tempo: true }); presi.push(p); }
    if (presi.length) this.annuncia(null, `⏰ Tempo scaduto: il ponte crolla! ${presi.length === 1 ? 'Cade' : 'Cadono'} ${presi.map((p) => this.nome(p)).join(', ')}`, '', true);
    this.crollato = presi.length > 0;
    this.fineRound();
  }

  fineRound() {
    // punti: 1 per ogni riga superata, più il bonus a chi arriva
    const del = this.pos.map((x, p) => (this.stato[p] === 'salvo' ? this.L + BONUS_ARRIVO : Math.max(0, x + 1)));
    del.forEach((x, p) => { this.punti[p] += x; });
    this.storico.push(del);
    if (this.round >= this.nRound) return this.chiudi();
    this.fase = 'fineRound';
    this.inAttesa = true;
    this.pausaMs = PAUSA_ROUND;
  }

  // l'orologio: il server chiama controllaTempo() a questo istante (fine del tempo o mossa di un computer)
  scadenza() {
    if (this.finita || this.inAttesa) return null;
    const bot = this.prossimaBot.filter((x, p) => x !== null && this.bot[p] && this.stato[p] === 'ponte');
    return Math.min(this.fine, ...bot);
  }
  controllaTempo() {
    if (this.finita || this.inAttesa) return false;
    const ora = Date.now();
    if (ora >= this.fine) { this.crolla(); return true; }
    let cambiato = false;
    for (let p = 0; p < this.n; p++) {
      if (!this.bot[p] || this.stato[p] !== 'ponte' || this.prossimaBot[p] === null || this.prossimaBot[p] > ora) continue;
      const a = bot(this, p, this.bot[p]);
      this.prossimaBot[p] = ora + (a.dopo || 1500);
      if (a.tipo !== 'aspetta') { const r = this.azione(p, a); if (r && r.ok) cambiato = true; }
      if (this.finita || this.inAttesa) return true;
    }
    return cambiato;
  }

  // !win + parola segreta: i vetri che reggono da dove sei alla fine (S = sinistra, D = destra)
  suggerimentoWin(posto) {
    if (!this.inGioco(posto) || this.fronte >= this.L) return null;
    return `💡 Vetri buoni dalla riga ${this.fronte + 1}: ${this.sicuro.slice(this.fronte).map((l) => (l ? 'D' : 'S')).join(' ')}`;
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.crollato = false;
    this.nuovoRound();
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
    const ind = this.indizi[posto], ora = Date.now();
    const gioca = !this.finita && !this.inAttesa;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      L: this.L, round: this.round, nRound: this.nRound, fronte: this.fronte, noto: this.noto, rotto: this.rotto,
      ordine: this.ordine, stato: this.stato, pos: this.pos, lato: this.lato, punti: this.punti, storico: this.storico,
      riflessi: this.riflessi, indizio: ind && ind.riga === this.fronte && this.davanti(posto) ? ind.lato : null,
      resta: gioca ? Math.max(0, this.fine - ora) : null, durata: this.durata,
      spintaFra: posto >= 0 && posto < this.n ? Math.max(0, this.spinta[posto] - ora) : null, ricarica: SPINTA_RICARICA,
      ultimo: this.ultimo, cadute: this.cadute, crollato: !!this.crollato,
      sicuroFinale: this.fase === 'fineRound' || this.finita ? this.sicuro : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Il computer va avanti da solo sui vetri già scoperti. Davanti al vetro sconosciuto aspetta che salti qualcun altro,
// finché il tempo comincia a mancare: il facile si butta presto (e salta a caso), il medio aspetta un po' e usa il
// riflesso ogni tanto, il difficile aspetta più di tutti, usa sempre il riflesso e, quando ha la spinta carica, spinge
// chi gli sta accanto davanti al vetro sconosciuto.
function bot(g, p, livello) {
  const ora = Date.now(), resta = g.fine - ora;
  if (ora < g.fermo[p]) return { tipo: 'aspetta', dopo: g.fermo[p] - ora + 50 };
  const r = g.pos[p] + 1;
  if (g.noto[r] !== null) return { tipo: 'salta', dopo: 500 + Math.random() * 700 }; // vetro noto: avanti
  // davanti al vetro sconosciuto
  const m = g.menti[p] || (g.menti[p] = { coraggio: { facile: 0.35, medio: 0.15, difficile: 0.07 }[livello] || 0.15 });
  const vicini = [...Array(g.n).keys()].filter((q) => q !== p && g.stato[q] === 'ponte' && g.pos[q] === g.pos[p]);
  if (livello !== 'facile' && vicini.length && ora >= g.spinta[p] && (livello === 'difficile' || Math.random() < 0.3)) {
    return { tipo: 'spingi', chi: vicini[Math.floor(Math.random() * vicini.length)], dopo: 900 };
  }
  // quanto tempo serve ancora: circa 1,2 s per ognuna delle righe che mancano
  const serve = (g.L - r) * 1200 * { facile: 1, medio: 1.4, difficile: 1.7 }[livello];
  // chi è dietro: se nessun altro può scoprire la riga, aspettare non serve
  const altri = [...Array(g.n).keys()].some((q) => q !== p && g.stato[q] === 'ponte');
  const urgente = resta < serve + 3000 || !altri;
  if (!urgente && Math.random() >= m.coraggio) return { tipo: 'aspetta', dopo: 1200 + Math.random() * 1600 };
  const ind = g.indizi[p] && g.indizi[p].riga === g.fronte ? g.indizi[p].lato : null;
  if (ind === null && g.riflessi[p] && (livello === 'difficile' || (livello === 'medio' && Math.random() < 0.5))) return { tipo: 'riflesso', dopo: 700 };
  const lato = ind !== null && livello !== 'facile' ? ind : Math.random() < 0.5 ? 0 : 1;
  return { tipo: 'salta', lato, dopo: 800 + Math.random() * 600 };
}

module.exports = {
  meta: {
    id: 'ponte',
    nome: 'Ponte fragile',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Attraversa il ponte di vetro prima che scada il tempo: a ogni riga un pannello regge e l\'altro si rompe. Salti quando vuoi, oppure aspetti che rischi un altro… o lo spingi.',
    alias: ['ponte di vetro', 'squid game', 'vetro', 'glass bridge'],
    opzioni: [
      { id: 'lunghezza', nome: 'Ponte', valori: ['medio', 'corto', 'lungo'], etichette: ['14 righe', '10 righe', '18 righe'], predefinito: 'medio' },
      { id: 'tempo', nome: 'Tempo', valori: ['normale', 'stretto', 'largo'], etichette: ['Normale (6 s per riga)', 'Stretto (4 s per riga)', 'Largo (9 s per riga)'], predefinito: 'normale' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Il ponte ha 14 righe (oppure 10 o 18) di due pannelli di vetro, a sinistra e a destra. In ogni riga uno regge e l\'altro si rompe.',
      'Non ci sono turni: si parte tutti dalla piattaforma e ognuno salta sulla riga davanti quando vuole (pulsanti, pannelli o frecce ← → e ↑). Sui vetri già scoperti si va avanti sicuri, sul primo vetro sconosciuto bisogna scegliere sinistra o destra: se regge tutti vedono il pannello buono, se si rompe cadi.',
      'Il tempo è uno solo per tutti (6 secondi per riga, oppure 4 o 9): allo scadere il ponte crolla e chi non è arrivato cade. Puoi aspettare che rischi un altro, ma se aspettate tutti… perdete tutti.',
      '🤚 Spinta: puoi spingere chi sta sulla tua stessa riga davanti al vetro sconosciuto; finisce su un pannello a caso. La prima spinta è pronta dopo 25 secondi, poi si ricarica molto lentamente (un minuto).',
      'Una volta per round, quando sei davanti al vetro sconosciuto, puoi usare il 🔍 riflesso: vedi (solo tu) da che parte sembra temperato. Ha ragione 3 volte su 4.',
      'Punti del round: 1 per ogni riga superata, più 10 se arrivi dall\'altra parte.',
      'Dopo l\'ultimo round vince chi ha più punti. A parità è pareggio.',
      'Il computer facile si butta presto e salta a caso; il medio aspetta un po\' e usa il riflesso ogni tanto; il difficile aspetta il più possibile, usa sempre il riflesso e spinge chi gli sta accanto.',
    ],
  },
  crea: (o) => new Ponte(o),
  bot,
  _test: { LUNGHEZZE, BONUS_ARRIVO, TEMPI, SPINTA_PRIMA, SPINTA_RICARICA, EQUILIBRIO },
};
