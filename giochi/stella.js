// 1, 2, 3 STELLA (Squid Game): si parte dalla linea a sinistra e si deve arrivare al traguardo a destra, dove c'è
// la bambola. Quando la bambola conta ("1, 2, 3… stella!") è girata e ci si può muovere; quando si gira bisogna
// restare immobili: chi si muove è eliminato (piccola animazione, macchia rossa stilizzata, nome grigio).
// Due modi: la bambola la fa il computer (si sente la canzoncina: si capisce quando sta per girarsi), oppure un
// giocatore vero (a turno). La bambola-giocatore mentre conta NON vede gli altri; decide lei quando girarsi.
// Due tolleranze: "Spietata" (appena si gira, chi si muove è fuori: solo 0,1 s per compensare la rete) e
// "Con margine" (0,4 s per fermarsi).
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// !win + parola segreta: un vantaggio per il round in corso (al massimo 30 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 30) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }
const W = 1000, H = 620, R = 14, V = 105, PARTENZA = 70, TRAGUARDO = 880, DURATA = 45;
const TOLLERANZA = { spietata: 0.1, margine: 0.4 };
const MIN_CONTA = 1.5, MAX_CONTA = 7, MIN_GUARDA = 1.2, MAX_GUARDA = 5;

class Stella extends Arena {
  constructor(o) {
    super(o, { id: 'stella', round: 3 });
    this.W = W; this.H = H;
    this.bambolaGiocatore = o.opzioni && o.opzioni.bambola === 'giocatore' && o.n >= 2;
    this.tolleranza = TOLLERANZA[o.opzioni && o.opzioni.eliminazione] ?? TOLLERANZA.margine;
    this.modoElim = this.tolleranza === TOLLERANZA.spietata ? 'spietata' : 'margine';
    this.contiVisti = {}; // quanto ha contato ogni bambola-giocatore (il computer difficile lo ricorda)
    this.avvia();
  }
  iniziaRound() {
    // la bambola-giocatore cambia a ogni round
    this.bambola = this.bambolaGiocatore ? (this.round - 1) % this.n : null;
    const corridori = [...Array(this.n).keys()].filter((p) => p !== this.bambola);
    this.e = Array.from({ length: this.n }, (_, i) => {
      const k = corridori.indexOf(i);
      return { id: i, x: PARTENZA - 30, y: 90 + (k + 0.5) * ((H - 180) / Math.max(1, corridori.length)), fuori: false, el: null, arrivo: null, corre: i !== this.bambola, mosso: 0 };
    });
    this.arrivi = [];
    this.presi = 0;
    this.mente = {};
    this.laser = [];
    this.nuovaConta();
  }
  // la bambola si gira di spalle e conta
  nuovaConta() {
    this.fase2 = 'conta';
    this.dal = this.tempoRound;
    // bambola del computer: conta a velocità diverse (a volte velocissima)
    this.durata = Math.random() < 0.18 ? casuale(1.2, 1.8) : casuale(2, 5.5);
  }
  girati() {
    this.fase2 = 'guarda'; this.dal = this.tempoRound; this.guarda = casuale(2, 3.5); this.cambiato = true;
    for (const e of this.e) e.mosso = 0;
    if (this.bambola !== null) { const v = this.contiVisti[this.bambola] || (this.contiVisti[this.bambola] = []); v.push(this.tempoRound - this.dalConta); }
  }
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound - this.dal;
    // la bambola
    if (this.bambola === null) {
      if (this.fase2 === 'conta' && t >= this.durata) { this.dalConta = this.dal; this.girati(); }
      else if (this.fase2 === 'guarda' && t >= this.guarda) this.nuovaConta();
    } else {
      const tocchi = this.nuoviTocchi(this.bambola);
      if (this.fase2 === 'conta' && ((tocchi && t >= MIN_CONTA) || t >= MAX_CONTA)) { this.dalConta = this.dal; this.girati(); }
      else if (this.fase2 === 'guarda' && ((tocchi && t >= MIN_GUARDA) || t >= MAX_GUARDA)) this.nuovaConta();
    }
    // i corridori
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p];
      if (!e.corre || e.fuori || e.arrivo !== null) continue;
      const i = this.inp[p];
      const x0 = e.x, y0 = e.y;
      e.x = Math.max(R, Math.min(W - 60, e.x + i.x * V * dt));
      e.y = Math.max(40 + R, Math.min(H - 20 - R, e.y + i.y * V * dt));
      const mosso = Math.hypot(e.x - x0, e.y - y0);
      // la bambola guarda: dopo la tolleranza, chi si muove è eliminato
      // (con il trucco la bambola non ti vede muovere)
      if (this.fase2 === 'guarda' && this.tempoRound - this.dal > this.tolleranza && mosso > 0.3 && !this.winOn[p]) this.elimina(p, 'si è mosso');
      if (!e.fuori && e.x >= TRAGUARDO) {
        e.arrivo = this.tempoRound; this.arrivi.push(p); this.cambiato = true;
        const bonus = [2, 1][this.arrivi.length - 1] || 0;
        this.punti[p] += 3 + bonus;
        this.annuncia(p, `supera il traguardo! +${3 + bonus} ⭐`, `sei arrivato! +${3 + bonus} ⭐`);
      }
    }
    const inGara = this.e.filter((e) => e.corre && !e.fuori && e.arrivo === null).length;
    if (this.tempoRound >= DURATA) {
      // tempo scaduto: chi non è arrivato è eliminato
      for (let p = 0; p < this.n; p++) { const e = this.e[p]; if (e.corre && !e.fuori && e.arrivo === null) this.elimina(p, 'tempo scaduto'); }
      return true;
    }
    return inGara === 0 && this.tempoRound - Math.max(0, ...this.e.map((e) => e.el || 0)) > 1.2;
  }
  elimina(p, perche) {
    const e = this.e[p];
    e.fuori = true; e.el = this.tempoRound; this.presi++; this.cambiato = true;
    this.laser.push([Math.round(e.x), Math.round(e.y)]);
    if (this.bambola !== null) this.punti[this.bambola] += 1;
    this.annuncia(p, perche === 'tempo scaduto' ? 'non ce l\'ha fatta in tempo: eliminato' : 'si è mosso: eliminato!', perche === 'tempo scaduto' ? 'tempo scaduto: eliminato' : 'ti sei mosso: eliminato!', false);
  }
  fineRound() {
    fineWin(this);
    if (this.bambola !== null && this.presi) this.annuncia(this.bambola, `ha eliminato ${this.presi} ${this.presi === 1 ? 'giocatore' : 'giocatori'} 🎎`, `hai eliminato ${this.presi} ${this.presi === 1 ? 'giocatore' : 'giocatori'} 🎎`, true);
  }
  // ---------------- computer ----------------
  pensa(p, liv) {
    // la bambola del computer quando la bambola è un posto del computer
    if (p === this.bambola) {
      const m = this.mente[p] || (this.mente[p] = {});
      const t = this.tempoRound - this.dal;
      if (m.fase !== this.fase2 || m.dal !== this.dal) { m.fase = this.fase2; m.dal = this.dal; m.quando = this.fase2 === 'conta' ? (Math.random() < 0.25 ? casuale(1.5, 2) : casuale(2.2, 5.5)) : casuale(1.6, 3); }
      return { tocco: t >= m.quando };
    }
    const e = this.e[p];
    if (!e.corre || e.fuori || e.arrivo !== null) return {};
    const m = this.mente[p] || (this.mente[p] = { ferma: false, riparti: 0, dalGiro: -1 });
    const t = this.tempoRound - this.dal;
    const reazione = { facile: casuale(0.25, 0.6), medio: casuale(0.12, 0.3), difficile: 0.05 }[liv];
    // la direzione: verso il traguardo, un po' di lato se davanti c'è qualcuno
    const vai = () => ({ x: liv === 'facile' ? 0.85 : 1, y: Math.abs(e.y - (m.y ?? e.y)) > 3 ? Math.sign(m.y - e.y) * 0.3 : 0 });
    if (m.y === undefined) m.y = e.y;
    if (this.fase2 === 'guarda') {
      if (m.dalGiro !== this.dal) { m.dalGiro = this.dal; m.fermaA = this.dal + reazione; m.sbadato = liv === 'facile' && Math.random() < 0.18; }
      // si ferma dopo il tempo di reazione (se era già fermo, resta fermo); il facile a volte si muove ancora un attimo
      if (m.ferma) return m.sbadato && t < 0.8 && Math.random() < 0.2 ? vai() : {};
      if (this.tempoRound < m.fermaA) return vai();
      m.ferma = true;
      return {};
    }
    // la bambola conta: si corre, ma ci si ferma prima che si giri
    if (m.dalConta !== this.dal) { m.dalConta = this.dal; m.ferma = false; m.riparti = this.dal + reazione; m.stopA = null; }
    if (this.tempoRound < m.riparti) return {};
    if (this.bambola === null) {
      // si sente la canzoncina: si sa quanto manca
      const manca = this.durata - t;
      const soglia = { facile: casuale(0.05, 0.7), medio: casuale(0.3, 0.55), difficile: 0.2 }[liv];
      if (m.stopA === null) m.stopA = soglia;
      if (manca < m.stopA) { m.ferma = true; return {}; }
      return vai();
    }
    // bambola-giocatore: non si sa quando si girerà. Il difficile ricorda quanto ha contato finora quella bambola
    if (m.stopA === null) {
      const visti = this.contiVisti[this.bambola] || [];
      if (liv === 'difficile') m.stopA = Math.max(MIN_CONTA - 0.15, (visti.length ? Math.min(...visti) : MIN_CONTA) - 0.25);
      else if (liv === 'medio') m.stopA = casuale(1.3, 2.3);
      else m.stopA = casuale(1.2, 3.8);
    }
    if (t > m.stopA) { m.ferma = true; return {}; }
    return vai();
  }
  vistaExtra() { return { bambola: this.bambolaGiocatore, modo: this.modoElim, partenza: PARTENZA, traguardo: TRAGUARDO, durata: DURATA, tolleranza: this.tolleranza }; }
  statoTick(posto) {
    const laser = this.laser; this.laser = [];
    const t = this.tempoRound - this.dal;
    // la bambola-giocatore, mentre conta, non vede nessuno
    const cieca = this.bambola !== null && posto === this.bambola && this.fase2 === 'conta';
    return {
      f2: this.fase2, bb: this.bambola, tc: Math.round(t * 100) / 100,
      pr: this.bambola === null && this.fase2 === 'conta' ? Math.min(1, t / this.durata) : null,
      resta: Math.max(0, Math.round(DURATA - this.tempoRound)), cieca: cieca ? 1 : 0,
      e: this.e.map((e) => (cieca && e.corre ? { id: e.id, n: 1, f: e.fuori ? 1 : 0 } : { id: e.id, x: Math.round(e.x), y: Math.round(e.y), f: e.fuori ? 1 : 0, el: e.el, a: e.arrivo !== null ? 1 : 0, c: e.corre ? 1 : 0 })),
      la: cieca ? [] : laser,
    };
  }
}

module.exports = {
  meta: {
    id: 'stella',
    nome: '1, 2, 3 Stella',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Squid Game: corri verso il traguardo mentre la bambola conta, e resta immobile quando si gira. Chi si muove è fuori!',
    alias: ['stella', '123 stella', 'squid game', 'luce rossa', 'luce verde', 'red light green light', 'bambola'],
    opzioni: [
      { id: 'bambola', nome: 'La bambola', valori: ['computer', 'giocatore'], etichette: ['La fa il computer', 'La fa un giocatore (a turno)'], predefinito: 'computer' },
      { id: 'eliminazione', nome: 'Eliminazione', valori: ['margine', 'spietata'], etichette: ['Con margine (0,4 s per fermarsi)', 'Spietata'], predefinito: 'margine' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Tutti partono dalla linea a sinistra; il traguardo è a destra, sotto l\'albero dove sta la bambola. Ci si muove con WASD o le frecce (sul telefono col joystick). Ogni round dura 45 secondi.',
      'Quando la bambola è girata di spalle e conta ("1, 2, 3… stella!") ci si può muovere. Quando si gira a guardare bisogna restare immobili: chi si muove mentre guarda è eliminato per il resto del round.',
      'Eliminazione "Con margine": dopo che la bambola si è girata hai 0,4 secondi per fermarti. "Spietata": chi si muove anche un istante dopo il giro è fuori (c\'è solo un decimo di secondo, per compensare il ritardo della rete).',
      'La bambola del computer canta la canzoncina a velocità diverse, a volte velocissima: guardando le parole che si accendono si capisce quando sta per girarsi. Resta girata da 2 a 3,5 secondi.',
      'La bambola fatta da un giocatore (una persona diversa a ogni round): mentre conta NON vede gli altri, e decide lei quando girarsi premendo spazio (o il pulsante 👁️), dopo almeno 1,5 secondi di conta (al massimo 7). Girata vede tutto; si rigira di spalle premendo di nuovo (dopo almeno 1,2 secondi, al massimo 5). Gli altri vedono solo da quanto sta contando.',
      'Punti: chi supera il traguardo prende 3 punti (il primo 2 in più, il secondo 1 in più). La bambola-giocatore prende 1 punto per ogni eliminato. Allo scadere del tempo chi non è arrivato è eliminato. Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Gli eliminati restano sul campo con una macchia rossa stilizzata e il nome grigio; al round dopo si riparte tutti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile reagisce tardi e a volte si muove ancora quando la bambola guarda; il medio si ferma per tempo; il difficile si ferma all\'ultimo momento e, con una bambola-giocatore, ricorda quanto poco ha contato le volte prima.',
    ],
  },
  crea: (o) => new Stella(o),
  bot: () => ({}),
  _test: { Stella, TOLLERANZA, TRAGUARDO },
};
