// TIRO ALLA FUNE (Squid Game): due piattaforme sospese nel vuoto, una corda in mezzo. Si tira premendo la barra
// spaziatrice (o il pulsante sul telefono): conta quante volte al secondo la premi. Vince la parte che trascina l'altra
// fino al bordo: chi perde cade dalla piattaforma (animazione, macchia rossa stilizzata, nome grigio).
// Due modi: a squadre (i giocatori divisi in due squadre, rimescolate a ogni round) e uno contro uno (torneo a
// eliminazione: una sfida alla volta, chi vince va avanti).
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// !win + parola segreta: un vantaggio per il round in corso (al massimo 25 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }
const W = 1000, H = 620, BORDO = 150, K = 12, MAX_RITMO = 15, DURATA = 40, INERZIA = 3;
const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class Fune extends Arena {
  constructor(o) {
    const uno = o.opzioni && o.opzioni.modo === 'uno';
    super(o, { id: 'fune', round: uno ? Math.max(1, o.n - 1) : 1 });
    this.W = W; this.H = H;
    this.uno = uno;
    if (uno) this.nRound = Math.max(1, o.n - 1); // torneo: servono n-1 sfide
    this.coda = mescola([...Array(o.n).keys()]); // chi aspetta di sfidare (torneo)
    this.fuoriTorneo = new Array(o.n).fill(false);
    this.avvia();
  }
  iniziaRound() {
    if (this.uno) {
      const a = this.coda.shift(), b = this.coda.shift();
      this.squadre = [[a], [b]];
    } else {
      // squadre nuove a ogni round, il più possibile pari
      const tutti = mescola([...Array(this.n).keys()]);
      this.squadre = [tutti.filter((_, k) => k % 2 === 0), tutti.filter((_, k) => k % 2 === 1)];
    }
    this.c = 0; this.v = 0;          // posizione della corda (positivo = verso destra) e velocità
    this.ritmo = new Array(this.n).fill(0); // colpi al secondo di ognuno (media che si aggiorna)
    this.budget = new Array(this.n).fill(3); // niente "autoclick": al massimo 15 colpi al secondo
    this.colpiTot = new Array(this.n).fill(0);
    this.perdente = null; this.cadutaT = null;
    this.mente = {};
    this.annuncia(null, this.uno ? 'Sfida uno contro uno!' : 'Tirate!', this.uno ? 'Sfida uno contro uno: tira!' : 'Tira!', true);
  }
  squadraDi(p) { return this.squadre[0].includes(p) ? 0 : this.squadre[1].includes(p) ? 1 : -1; }
  // con il trucco i colpi di quel giocatore valgono quasi il doppio
  forza(s) { const m = this.squadre[s]; return m.length ? m.reduce((t, p) => t + this.ritmo[p] * (this.winOn && this.winOn[p] ? 1.9 : 1), 0) / m.length : 0; }
  passo(dt) {
    aggiornaWin(this, dt);
    if (this.perdente !== null) return this.tempoRound - this.cadutaT > 2.2; // si guarda la caduta
    for (let p = 0; p < this.n; p++) {
      this.budget[p] = Math.min(3, this.budget[p] + MAX_RITMO * dt);
      let colpi = this.nuoviTocchi(p);
      if (this.squadraDi(p) < 0) continue;
      colpi = Math.min(colpi, Math.floor(this.budget[p])); this.budget[p] -= colpi;
      this.colpiTot[p] += colpi;
      // ritmo: media mobile dei colpi al secondo (circa l'ultimo secondo)
      const k = Math.exp(-dt / 0.8);
      this.ritmo[p] = this.ritmo[p] * k + (colpi / dt) * (1 - k);
    }
    const spinta = (this.forza(1) - this.forza(0)) * K; // la squadra di destra tira verso destra
    this.v += (spinta - this.v) * Math.min(1, INERZIA * dt);
    this.c += this.v * dt;
    // chi arriva al bordo perde
    if (Math.abs(this.c) >= BORDO || this.tempoRound >= DURATA) {
      const perde = this.c >= 0 ? 0 : 1; // corda a destra: ha perso la squadra di sinistra
      this.c = Math.max(-BORDO, Math.min(BORDO, this.c));
      this.perdente = perde; this.cadutaT = this.tempoRound; this.cambiato = true;
      const vince = 1 - perde;
      for (const p of this.squadre[vince]) this.punti[p] += this.uno ? 1 : 3;
      if (this.uno) {
        const w = this.squadre[vince][0], l = this.squadre[perde][0];
        this.fuoriTorneo[l] = true; this.coda.push(w);
        if (this.round >= this.nRound) this.punti[w] += 2; // il campione
        this.annuncia(w, `trascina @ giù dalla piattaforma! 🪢`, `hai trascinato @ giù! 🪢`, true, { bersaglio: l, testoTe: 'sei stato trascinato giù dalla piattaforma…' });
      } else this.annuncia(null, `vince la squadra ${vince ? 'rossa' : 'blu'}! La squadra ${perde ? 'rossa' : 'blu'} cade 🪢`, `vince la squadra ${vince ? 'rossa' : 'blu'}!`, true);
    }
    return false;
  }
  fineRound() { fineWin(this); }
  pensa(p, liv) {
    if (this.squadraDi(p) < 0 || this.perdente !== null) return {};
    const m = this.mente[p] || (this.mente[p] = { acc: 0, base: { facile: casuale(4.5, 6), medio: casuale(7, 8.2), difficile: casuale(9.3, 10.5) }[liv] });
    // un ritmo che oscilla un po' (chi si stanca, chi dà strappi)
    const ritmo = m.base * (1 + 0.15 * Math.sin(this.tempoRound * 1.3 + p)) * (liv === 'facile' && Math.sin(this.tempoRound * 0.7 + p * 2) > 0.7 ? 0.5 : 1);
    m.acc += ritmo * 0.033;
    if (m.acc >= 1) { m.acc -= 1; return { tocco: true }; }
    return {};
  }
  vistaExtra() { return { uno: this.uno, bordo: BORDO, durata: DURATA }; }
  statoTick() {
    return {
      c: Math.round(this.c * 10) / 10, sq: this.squadre, rt: this.ritmo.map((x) => Math.round(x * 10) / 10), f: [this.forza(0), this.forza(1)].map((x) => Math.round(x * 10) / 10),
      pe: this.perdente, cd: this.cadutaT, ft: this.fuoriTorneo.map((x) => (x ? 1 : 0)), resta: Math.max(0, Math.round(DURATA - this.tempoRound)), coda: this.coda,
    };
  }
}

module.exports = {
  meta: {
    id: 'fune',
    nome: 'Tiro alla fune',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Squid Game: due piattaforme nel vuoto e una corda. Premi la barra spaziatrice più veloce che puoi e trascina giù gli avversari!',
    alias: ['fune', 'tiro alla fune', 'tug of war', 'squid game', 'corda'],
    opzioni: [
      { id: 'modo', nome: 'Modo', valori: ['squadre', 'uno'], etichette: ['A squadre', 'Uno contro uno (torneo)'], predefinito: 'squadre' },
      { id: 'round', nome: 'Round (a squadre)', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Due piattaforme sospese nel vuoto, una corda tesa sopra il burrone. Si tira premendo la barra spaziatrice (o Invio, o il pulsante 🪢 sul telefono): conta quante volte al secondo la premi. Tenerla giù non serve, bisogna premerla e ripremerla.',
      'La corda si sposta verso la parte che tira di più. Quando il fiocco rosso arriva al bordo, chi è dall\'altra parte viene trascinato giù dalla piattaforma e cade (macchia rossa stilizzata e nome grigio). Se dopo 40 secondi nessuno è caduto, perde chi è più vicino al bordo.',
      'A squadre: i giocatori sono divisi in due squadre (blu a sinistra, rossa a destra), rimescolate a ogni round. Conta il ritmo medio della squadra, così una squadra con un giocatore in più non è avvantaggiata. Chi vince prende 3 punti; dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Uno contro uno: un torneo a eliminazione diretta, una sfida alla volta (gli altri guardano). Chi vince va avanti, chi perde cade ed è fuori dal torneo. Ogni sfida vinta vale 1 punto, il campione ne prende 2 in più.',
      'Più di 15 colpi al secondo non contano (niente trucchi con l\'autoclick).',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile tira piano e ogni tanto si stanca; il medio tira come una persona veloce; il difficile ha un ritmo altissimo e costante.',
    ],
  },
  crea: (o) => new Fune(o),
  bot: () => ({}),
  _test: { Fune, BORDO, MAX_RITMO },
};
