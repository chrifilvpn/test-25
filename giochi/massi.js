// MASSI DALLA MONTAGNA: uno sta in cima e rotola giù i massi, gli altri salgono il pendio schivandoli. Chi viene preso
// resta stordito e scivola un po' indietro. Chi arriva in cima prende punti; chi tira prende punti per ogni colpo.
// Chi tira cambia a ogni round.
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// il trucco segreto (!win): un vantaggio per il resto del round (al massimo 25 secondi di gioco), poi si spegne
function conTrucco(g, p) {
  if (!T.armato(g, p) || g.fase !== 'gioco') return false;
  const da = (g._winDa = g._winDa || {});
  if (da[p] == null || da[p] > g.tempoRound) da[p] = g.tempoRound;
  if (g.tempoRound - da[p] < 25) return true;
  T.consuma(g, p); delete da[p];
  return false;
}
// a fine round si spegne (se è servito almeno 3 secondi; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 3)) T.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const W = 1000, H = 620, CIMA = 92, BASE = 575, R = 16, R_MASSO = 26;
// il sentiero è stretto: ai lati ci sono le pareti di roccia (non si passa)
const SX = 250, DX = 750;
const V_SU = 125, V_LATO = 215, V_TIRATORE = 480, V_MASSO = 300, RICARICA = 0.75, STORDITO = 1.2, INDIETRO = 110, DURATA = 45;

class Massi extends Arena {
  constructor(o) {
    super(o, { id: 'massi', round: Math.max(2, o.n) });
    this.W = W; this.H = H;
    if (!Number(o.opzioni && o.opzioni.round)) this.nRound = o.n;
    this.avvia();
  }
  iniziaRound() {
    this.tira = (this.round - 1) % this.n;
    this.tx = W / 2; this.ricarica = 0.5;
    this.massi = []; this.nM = 0;
    const corridori = Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.tira);
    this.e = Array.from({ length: this.n }, (_, i) => ({ id: i, x: i === this.tira ? W / 2 : SX + 30 + (corridori.indexOf(i) + 0.5) * ((DX - SX - 60) / Math.max(1, corridori.length)), y: i === this.tira ? 40 : BASE, stordito: 0, arrivo: null, colpi: 0 }));
    this.arrivi = []; this.mente = {}; this.botti = [];
    this.annuncia(this.tira, 'è in cima e tira i massi 🪨', 'sei in cima: tira i massi 🪨', true);
  }
  passo(dt) {
    // chi tira: si sposta lungo la cima (tastiera o mouse) e tira con l'azione
    const it = this.inp[this.tira];
    if (it.mx !== null && Math.abs(it.x) < 0.1) { const d = it.mx - this.tx; this.tx += Math.sign(d) * Math.min(Math.abs(d), V_TIRATORE * dt); }
    else this.tx += it.x * V_TIRATORE * dt;
    this.tx = Math.max(SX + 20, Math.min(DX - 20, this.tx));
    this.e[this.tira].x = this.tx;
    this.ricarica = Math.max(0, this.ricarica - dt);
    if ((this.nuoviTocchi(this.tira) || it.a) && this.ricarica <= 0) {
      this.massi.push({ id: ++this.nM, x: this.tx, y: 70, vy: V_MASSO, giro: 0, oscilla: casuale(-1, 1) });
      this.ricarica = RICARICA;
    }
    // il trucco segreto di chi tira: i massi piegano verso chi sale
    if (conTrucco(this, this.tira)) for (const m of this.massi) {
      let bx = null, db = Infinity;
      this.e.forEach((e, q) => { if (q !== this.tira && e.arrivo === null && e.stordito <= 0 && e.y > m.y - 10 && e.y - m.y < db) { db = e.y - m.y; bx = e.x; } });
      if (bx !== null) m.x += Math.sign(bx - m.x) * Math.min(Math.abs(bx - m.x), 260 * dt);
    }
    for (const m of this.massi) { m.y += m.vy * dt; m.vy += 60 * dt; m.giro += dt * 6; m.x += Math.sin(m.y / 60) * m.oscilla * 25 * dt; if (m.x < SX + R_MASSO - 8) { m.x = SX + R_MASSO - 8; m.oscilla = Math.abs(m.oscilla); } if (m.x > DX - R_MASSO + 8) { m.x = DX - R_MASSO + 8; m.oscilla = -Math.abs(m.oscilla); } }
    // chi sale
    for (let p = 0; p < this.n; p++) {
      if (p === this.tira) continue;
      const e = this.e[p], i = this.inp[p];
      if (e.arrivo !== null) continue;
      if (e.stordito > 0) { e.stordito -= dt; continue; }
      const win = conTrucco(this, p); // il trucco segreto di chi sale: più veloce e i massi gli passano accanto
      e.x = Math.max(SX + R, Math.min(DX - R, e.x + i.x * V_LATO * dt));
      e.y = Math.max(CIMA - 10, Math.min(BASE, e.y + i.y * (i.y < 0 ? V_SU * (win ? 1.4 : 1) : V_LATO) * dt));
      for (const m of this.massi) {
        if (m.fatto || win) continue;
        if (Math.hypot(m.x - e.x, m.y - e.y) < R + R_MASSO - 6) {
          m.fatto = true; e.stordito = STORDITO; e.y = Math.min(BASE, e.y + INDIETRO); e.colpi++;
          this.punti[this.tira]++; this.botti.push([Math.round(e.x), Math.round(e.y)]); this.cambiato = true;
          this.annuncia(this.tira, 'colpisce @ con un masso! 🪨', 'colpisci @! 🪨', false, { bersaglio: p, testoTe: 'ti ha preso un masso! 💫' });
        }
      }
      if (e.y <= CIMA) {
        e.arrivo = this.tempoRound; this.arrivi.push(p); this.cambiato = true;
        const pt = [3, 2][this.arrivi.length - 1] ?? 1;
        this.punti[p] += pt;
        this.annuncia(p, `arriva in cima! +${pt} ⛰️`, `sei arrivato in cima! +${pt} ⛰️`);
      }
    }
    this.massi = this.massi.filter((m) => !m.fatto && m.y < H + 40);
    const corridori = this.e.filter((e, p) => p !== this.tira);
    return corridori.every((e) => e.arrivo !== null) || this.tempoRound >= DURATA;
  }
  fineRound() {
    fineTrucco(this);
    if (!this.arrivi.length && this.n > 1) { this.punti[this.tira] += 3; this.annuncia(this.tira, 'non fa arrivare nessuno in cima: +3 🏔️', 'nessuno è arrivato in cima: +3 🏔️', true); }
  }
  pensa(p, liv) {
    const m = this.mente[p] || (this.mente[p] = { fino: 0, x: 0, y: 0, tocco: false });
    if (this.tempoRound < m.fino) return { x: m.x, y: m.y };
    m.fino = this.tempoRound + { facile: 0.3, medio: 0.14, difficile: 0.06 }[liv];
    if (p === this.tira) {
      // mira a chi è più vicino alla cima (il difficile anticipa dove sarà quando arriva il masso)
      let bers = null, yb = Infinity;
      this.e.forEach((e, q) => { if (q !== p && e.arrivo === null && e.stordito <= 0 && e.y < yb) { yb = e.y; bers = q; } });
      if (bers === null) return {};
      const e = this.e[bers], i = this.inp[bers];
      const t = (e.y - 70) / V_MASSO;
      const ant = { facile: 0, medio: 0.4, difficile: 0.9 }[liv];
      const mira = e.x + i.x * V_LATO * t * ant + casuale(-1, 1) * { facile: 60, medio: 25, difficile: 8 }[liv];
      const d = mira - this.tx;
      m.x = Math.abs(d) > 10 ? Math.sign(d) : 0; m.y = 0;
      return { x: m.x, tocco: Math.abs(d) < { facile: 40, medio: 25, difficile: 15 }[liv] && this.ricarica <= 0 };
    }
    const e = this.e[p];
    if (e.arrivo !== null || e.stordito > 0) return {};
    // schiva i massi che stanno per arrivare addosso, altrimenti sale
    let x = 0, y = -1;
    const vista = { facile: 110, medio: 190, difficile: 260 }[liv];
    for (const k of this.massi) {
      const sopra = e.y - k.y;
      if (sopra > -10 && sopra < vista && Math.abs(k.x - e.x) < R + R_MASSO + 12) {
        const via = e.x < SX + 60 ? 1 : e.x > DX - 60 ? -1 : (e.x >= k.x ? 1 : -1);
        x = via; y = liv === 'difficile' ? -0.3 : 0;
      }
    }
    // il difficile evita anche di stare proprio sotto chi tira
    if (liv === 'difficile' && x === 0 && Math.abs(this.tx - e.x) < 40 && this.ricarica < 0.3) x = e.x > this.tx ? 1 : -1;
    if (liv === 'facile' && Math.random() < 0.3) { x = casuale(-1, 1); }
    const l = Math.hypot(x, y) || 1; m.x = x / l; m.y = y / l;
    return { x: m.x, y: m.y };
  }
  statoTick() {
    const botti = this.botti; this.botti = [];
    return { sx: SX, dx: DX, ti: this.tira, tx: Math.round(this.tx), ri: this.ricarica > 0 ? 1 : 0, ma: this.massi.map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), g: Math.round(m.giro * 10) / 10 })), e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), st: e.stordito > 0 ? 1 : 0, a: e.arrivo !== null ? 1 : 0 })), b: botti, resta: Math.max(0, Math.round(DURATA - this.tempoRound)) };
  }
}

module.exports = {
  SX, DX,
  meta: {
    id: 'massi',
    nome: 'Massi dalla montagna',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Uno in cima rotola giù i massi, gli altri salgono schivandoli. Chi viene preso scivola indietro!',
    alias: ['massi', 'montagna', 'schiva', 'rocce', 'mario party', 'sassi'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [0, 2, 4], etichette: ['Ognuno tira una volta', '2 round', '4 round'], predefinito: 0 }],
    regole: [
      'A ogni round uno è in cima alla montagna e tira i massi; tutti gli altri partono dal basso e devono arrivare in cima. Chi tira cambia a ogni round: di solito ognuno lo fa una volta.',
      'Chi tira si sposta lungo la cima con A e D (o le frecce, o seguendo il mouse) e tira un masso con spazio o un clic (sul telefono: joystick e pulsante). Tra un masso e l\'altro c\'è un attimo di ricarica.',
      'Il sentiero è stretto, chiuso tra due pareti di roccia: c\'è poco spazio per schivare. Chi sale si muove con WASD o le frecce (sul telefono col joystick): salire è più lento che spostarsi di lato. Se un masso ti prende resti stordito per un secondo e scivoli un po\' indietro.',
      'Punti: 3 a chi arriva in cima per primo, 2 al secondo, 1 agli altri; chi tira prende un punto per ogni colpo, e 3 punti in più se nessuno arriva in cima nei 45 secondi del round.',
      'Alla fine di tutti i round vince chi ha più punti. Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile tira a caso e schiva tardi; il medio mira bene e schiva per tempo; il difficile tira dove andrai e non si fa quasi mai prendere.',
    ],
  },
  crea: (o) => new Massi(o),
  bot: () => ({}),
  _test: { Massi },
};
