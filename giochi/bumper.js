// BUMPER BALLS: ognuno è una palla su un'arena rotonda che si restringe col tempo. Ci si spinge con le collisioni:
// chi finisce fuori dal bordo cade. L'ultimo che resta sopra vince il round.
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
// a fine round si spegne (se è servito almeno un secondo; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 1)) T.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const W = 1000, H = 620, CX = W / 2, CY = H / 2, R_PALLA = 24;
const R_INIZIO = 290, R_FINE = 95, RESTRINGE_DOPO = 8, DURATA_RESTRINGE = 45;
const ACC = 820, V_MAX = 360, ATTRITO = 1.1, RIMBALZO = 1.25;

class Bumper extends Arena {
  constructor(o) { super(o, { id: 'bumper', round: 3 }); this.W = W; this.H = H; this.avvia(); }
  raggio() { const t = Math.max(0, this.tempoRound - RESTRINGE_DOPO) / DURATA_RESTRINGE; return R_INIZIO - (R_INIZIO - R_FINE) * Math.min(1, t); }
  iniziaRound() {
    this.b = Array.from({ length: this.n }, (_, i) => {
      const a = (i / this.n) * Math.PI * 2 + this.round;
      return { id: i, x: CX + Math.cos(a) * 180, y: CY + Math.sin(a) * 180, vx: 0, vy: 0, fuori: false, cade: 0 };
    });
    this.ordine = [];
    this.mente = {};
    this.urti = [];
  }
  passo(dt) {
    const R = this.raggio();
    const win = this.b.map((_, p) => conTrucco(this, p)); // il trucco segreto: palla pesante e il bordo lo trattiene
    for (let p = 0; p < this.n; p++) {
      const b = this.b[p];
      if (b.fuori) { b.cade += dt; continue; }
      const i = this.inp[p];
      b.vx += i.x * ACC * dt * (win[p] ? 1.3 : 1); b.vy += i.y * ACC * dt * (win[p] ? 1.3 : 1);
      const k = Math.exp(-ATTRITO * dt); b.vx *= k; b.vy *= k;
      const v = Math.hypot(b.vx, b.vy); if (v > V_MAX * 1.8) { b.vx *= (V_MAX * 1.8) / v; b.vy *= (V_MAX * 1.8) / v; }
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    // urti tra palle (elastici, con un po' di "molla" in più)
    for (let a = 0; a < this.n; a++) for (let c = a + 1; c < this.n; c++) {
      const A = this.b[a], B = this.b[c];
      if (A.fuori || B.fuori) continue;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d >= R_PALLA * 2 || d === 0) continue;
      const nx = dx / d, ny = dy / d, sovr = R_PALLA * 2 - d;
      A.x -= nx * sovr / 2; A.y -= ny * sovr / 2; B.x += nx * sovr / 2; B.y += ny * sovr / 2;
      const vr = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if (vr < 0) {
        const j = -vr * RIMBALZO, ka = win[a] && !win[c] ? 0.25 : win[c] && !win[a] ? 1.75 : 1; // chi ha il trucco quasi non si sposta
        A.vx -= nx * j * ka; A.vy -= ny * j * ka; B.vx += nx * j * (2 - ka); B.vy += ny * j * (2 - ka);
        if (-vr > 120) { this.urti.push([Math.round((A.x + B.x) / 2), Math.round((A.y + B.y) / 2)]); A.ultimo = c; B.ultimo = a; }
      }
    }
    // chi esce dal bordo cade
    for (let p = 0; p < this.n; p++) {
      const b = this.b[p];
      if (b.fuori) continue;
      const dc = Math.hypot(b.x - CX, b.y - CY);
      if (win[p] && dc > R - 2) { b.x = CX + ((b.x - CX) / dc) * (R - 2); b.y = CY + ((b.y - CY) / dc) * (R - 2); const vr = (b.vx * (b.x - CX) + b.vy * (b.y - CY)) / dc; if (vr > 0) { b.vx -= (vr * (b.x - CX)) / dc; b.vy -= (vr * (b.y - CY)) / dc; } continue; }
      if (dc > R) {
        b.fuori = true; this.ordine.push(p); this.cambiato = true;
        const chi = b.ultimo;
        if (chi !== undefined && !this.b[chi].fuori) this.annuncia(chi, 'butta giù @! 💥', 'butti giù @! 💥', false, { bersaglio: p, testoTe: 'ti ha buttato giù 💥' });
        else this.annuncia(p, 'cade dall\'arena! 😱', 'sei caduto! 😱');
      }
    }
    const rimasti = this.b.filter((b) => !b.fuori).length;
    return this.n === 1 ? rimasti === 0 || this.tempoRound > 60 : rimasti <= 1 || this.tempoRound > 70;
  }
  fineRound() {
    fineTrucco(this);
    // punti: uno per ogni giocatore caduto prima di te; l'ultimo rimasto ne prende 2 in più
    this.ordine.forEach((p, k) => { this.punti[p] += k; });
    const rimasti = this.b.map((b, p) => (b.fuori ? -1 : p)).filter((p) => p >= 0);
    for (const p of rimasti) this.punti[p] += this.ordine.length + (rimasti.length === 1 ? 2 : 0);
    if (rimasti.length === 1 && this.n > 1) this.annuncia(rimasti[0], 'è l\'ultimo sull\'arena! 🏆', 'sei l\'ultimo sull\'arena! 🏆', true);
  }
  // il computer: resta lontano dal bordo e carica gli altri; il difficile arriva dal lato del centro, per spingerli fuori
  pensa(p, liv) {
    const b = this.b[p];
    if (b.fuori) return {};
    const R = this.raggio(), ora = this.tempoRound;
    const m = this.mente[p] || (this.mente[p] = { fino: 0, x: 0, y: 0 });
    if (ora < m.fino) return { x: m.x, y: m.y };
    m.fino = ora + { facile: 0.35, medio: 0.15, difficile: 0.05 }[liv];
    const dc = Math.hypot(b.x - CX, b.y - CY);
    let tx, ty;
    const pericolo = dc > R - { facile: 40, medio: 70, difficile: 90 }[liv];
    if (pericolo) { tx = CX; ty = CY; } else {
      let bers = null, db = Infinity;
      for (let q = 0; q < this.n; q++) { if (q === p || this.b[q].fuori) continue; const d = Math.hypot(this.b[q].x - b.x, this.b[q].y - b.y) - (liv === 'difficile' ? Math.hypot(this.b[q].x - CX, this.b[q].y - CY) * 0.8 : 0); if (d < db) { db = d; bers = this.b[q]; } }
      if (!bers || (liv === 'facile' && Math.random() < 0.4)) { tx = CX + casuale(-80, 80); ty = CY + casuale(-80, 80); } else if (liv === 'difficile') {
        // punta al lato del bersaglio che guarda il centro: così la spinta va verso il bordo
        const ux = bers.x - CX, uy = bers.y - CY, l = Math.hypot(ux, uy) || 1;
        const dietro = { x: bers.x - (ux / l) * 30, y: bers.y - (uy / l) * 30 };
        const vicino = Math.hypot(dietro.x - b.x, dietro.y - b.y) < 45;
        tx = vicino ? bers.x + (ux / l) * 40 : dietro.x; ty = vicino ? bers.y + (uy / l) * 40 : dietro.y;
      } else { tx = bers.x; ty = bers.y; }
    }
    // frenata: se si va troppo veloce verso fuori, si corregge
    let dx = tx - b.x - b.vx * 0.25, dy = ty - b.y - b.vy * 0.25;
    const l = Math.hypot(dx, dy) || 1;
    m.x = dx / l; m.y = dy / l;
    const errore = { facile: 0.5, medio: 0.2, difficile: 0.05 }[liv];
    m.x += casuale(-errore, errore); m.y += casuale(-errore, errore);
    return { x: m.x, y: m.y };
  }
  statoTick() {
    const urti = this.urti; this.urti = [];
    return { r: Math.round(this.raggio()), b: this.b.map((b) => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), f: b.fuori ? Math.min(1, b.cade) : 0 })), u: urti };
  }
}

module.exports = {
  meta: {
    id: 'bumper',
    nome: 'Bumper Balls',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Palle che si scontrano su un\'arena rotonda che si restringe: spingi gli altri giù dal bordo. L\'ultimo sopra vince.',
    alias: ['bumper', 'palle', 'spintoni', 'sumo', 'arena', 'mario party'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 }],
    regole: [
      'Ognuno è una palla su un\'arena rotonda. Ti muovi con WASD o le frecce (sul telefono col joystick): la palla accelera piano e scivola, come sul ghiaccio.',
      'Quando due palle si scontrano rimbalzano via: più forte vai, più forte spingi. Chi esce dal bordo dell\'arena cade ed è fuori per il resto del round.',
      'Dopo 8 secondi l\'arena comincia a restringersi, sempre di più: alla fine non c\'è più spazio per tutti.',
      'Punti del round: un punto per ogni giocatore caduto prima di te; l\'ultimo che resta sull\'arena prende 2 punti in più. Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile gira un po\' a caso e si accorge tardi del bordo; il medio carica chi ha vicino e sta attento al bordo; il difficile arriva sugli altri dal lato del centro, così li spinge fuori.',
    ],
  },
  crea: (o) => new Bumper(o),
  bot: () => ({}),
  _test: { Bumper },
};
