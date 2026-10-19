// IL GATTO E I TOPI: a ogni round uno è il gatto (si muove seguendo il mouse o il dito) e gli altri sono topi (tastiera
// o joystick). I topi raccolgono formaggi senza farsi prendere; il gatto prende i topi. Il gatto cambia a ogni round.
const { Arena, casuale, dist, verso } = require('./arena');
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
const W = 1000, H = 620, R_TOPO = 14, R_GATTO = 24, V_TOPO = 240, V_GATTO = 275, DURATA = 50;
const PUNTI_PRESA = 3, PUNTI_FORMAGGIO = 1, MAX_FORMAGGI = 6;

// stanze a tema: ogni mobile è [x, y, larghezza, altezza, tipo] (il tipo serve solo al disegno). Gli ostacoli sono
// sempre rettangoli e le tane agli angoli restano libere. Si sceglie una stanza a caso a ogni round.
const STANZE = [
  { tema: 'soggiorno', mobili: [[180, 120, 140, 60, 'divano'], [680, 120, 140, 60, 'divano'], [440, 280, 120, 70, 'tavolino'], [180, 440, 140, 60, 'libreria'], [680, 440, 140, 60, 'credenza']] },
  { tema: 'cucina', mobili: [[300, 90, 60, 170, 'bancone'], [640, 360, 60, 170, 'bancone'], [450, 250, 100, 100, 'tavolo'], [120, 300, 120, 50, 'forno'], [760, 270, 120, 50, 'lavello']] },
  { tema: 'cantina', mobili: [[250, 180, 500, 40, 'scaffale'], [250, 400, 500, 40, 'scaffale'], [80, 280, 60, 60, 'botte'], [860, 280, 60, 60, 'botte']] },
  { tema: 'camera', mobili: [[150, 110, 150, 110, 'letto'], [700, 110, 150, 110, 'letto'], [455, 265, 90, 90, 'baule'], [160, 450, 130, 50, 'armadio'], [710, 450, 130, 50, 'armadio']] },
  { tema: 'biblioteca', mobili: [[160, 150, 40, 320, 'libreria'], [800, 150, 40, 320, 'libreria'], [330, 110, 340, 40, 'libreria'], [330, 470, 340, 40, 'libreria'], [455, 270, 90, 80, 'scrivania']] },
];
const tane = [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]];

function spingiFuori(e, r, mobili) {
  e.x = Math.max(r, Math.min(W - r, e.x)); e.y = Math.max(r, Math.min(H - r, e.y));
  for (const [x, y, w, h] of mobili) {
    const cx = Math.max(x, Math.min(x + w, e.x)), cy = Math.max(y, Math.min(y + h, e.y));
    const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d > 0.001) { e.x = cx + (dx / d) * r; e.y = cy + (dy / d) * r; } else {
        // dentro il mobile: si esce dal lato più vicino
        const l = [e.x - x, x + w - e.x, e.y - y, y + h - e.y], m = Math.min(...l);
        if (m === l[0]) e.x = x - r; else if (m === l[1]) e.x = x + w + r; else if (m === l[2]) e.y = y - r; else e.y = y + h + r;
      }
    }
  }
}
const libero = (x, y, r, mobili) => mobili.every(([mx, my, w, h]) => x < mx - r || x > mx + w + r || y < my - r || y > my + h + r);

class GattoTopi extends Arena {
  constructor(o) {
    super(o, { id: 'gattotopi', round: Math.max(2, o.n) });
    this.W = W; this.H = H;
    if (!Number(o.opzioni && o.opzioni.round)) this.nRound = o.n; // ognuno fa il gatto una volta
    this.prese = new Array(this.n).fill(0); this.formaggi = new Array(this.n).fill(0);
    this.avvia();
  }
  iniziaRound() {
    this.gatto = (this.round - 1) % this.n;
    this.stanza = STANZE[Math.floor(Math.random() * STANZE.length)];
    this.mobili = this.stanza.mobili;
    this.formaggio = []; this.nF = 0; this.prossimo = 0;
    this.e = Array.from({ length: this.n }, (_, i) => {
      if (i === this.gatto) return { id: i, x: W / 2, y: H / 2 - 170, fermo: 0, salto: 0 };
      const t = tane[(i + this.round) % 4];
      return { id: i, x: t[0], y: t[1], fermo: 0, scudo: 1.5, salto: 0 };
    });
    // il gatto parte nel primo posto libero vicino al centro
    for (const [x, y] of [[W / 2, H / 2 - 170], [W / 2, H / 2], [W / 2, H / 2 + 170], [W / 2 - 200, H / 2], [W / 2 + 200, H / 2]]) if (libero(x, y, R_GATTO + 4, this.mobili)) { this.e[this.gatto].x = x; this.e[this.gatto].y = y; break; }
    this.memoria = {};
    this.annuncia(this.gatto, 'è il gatto 🐱', 'sei il gatto 🐱: prendi i topi col mouse (o col dito)', true);
  }
  spostaTempi() {}
  passo(dt) {
    this.prossimo -= dt;
    if (this.prossimo <= 0 && this.formaggio.length < MAX_FORMAGGI) {
      for (let k = 0; k < 20; k++) {
        const x = casuale(60, W - 60), y = casuale(60, H - 60);
        if (libero(x, y, 18, this.mobili)) { this.formaggio.push({ id: ++this.nF, x, y }); break; }
      }
      this.prossimo = casuale(0.7, 1.5);
    }
    const win = this.e.map((_, p) => conTrucco(this, p)); // il trucco segreto: più veloce; da gatto prende da più lontano, da topo non viene preso
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p], i = this.inp[p];
      if (e.fermo > 0) { e.fermo -= dt; continue; }
      if (e.scudo) e.scudo = Math.max(0, e.scudo - dt);
      if (p === this.gatto) {
        // il gatto va verso il puntatore; se non c'è (tastiera o joystick) usa la direzione
        let dx = i.x, dy = i.y;
        if (i.mx !== null && (Math.abs(i.x) + Math.abs(i.y) < 0.1)) { const d = Math.hypot(i.mx - e.x, i.my - e.y); if (d > 6) { dx = (i.mx - e.x) / d; dy = (i.my - e.y) / d; } else { dx = 0; dy = 0; } }
        e.x += dx * V_GATTO * dt * (win[p] ? 1.3 : 1); e.y += dy * V_GATTO * dt * (win[p] ? 1.3 : 1);
        spingiFuori(e, R_GATTO, this.mobili);
      } else {
        e.x += i.x * V_TOPO * dt * (win[p] ? 1.3 : 1); e.y += i.y * V_TOPO * dt * (win[p] ? 1.3 : 1);
        spingiFuori(e, R_TOPO, this.mobili);
        // formaggi
        for (const f of this.formaggio) if (!f.preso && Math.hypot(f.x - e.x, f.y - e.y) < R_TOPO + 14) { f.preso = true; this.punti[p] += PUNTI_FORMAGGIO; this.formaggi[p]++; this.cambiato = true; }
      }
    }
    this.formaggio = this.formaggio.filter((f) => !f.preso);
    // prese
    const g = this.e[this.gatto];
    for (let p = 0; p < this.n; p++) {
      if (p === this.gatto) continue;
      const t = this.e[p];
      if (t.fermo > 0 || t.scudo > 0 || win[p]) continue;
      if (Math.hypot(t.x - g.x, t.y - g.y) < R_TOPO + R_GATTO - 4 + (win[this.gatto] ? 22 : 0)) {
        this.punti[this.gatto] += PUNTI_PRESA; this.prese[this.gatto]++;
        const tana = tane[Math.floor(Math.random() * 4)];
        t.x = tana[0]; t.y = tana[1]; t.fermo = 1.5; t.scudo = 1.5; t.salto++;
        this.annuncia(this.gatto, `prende ${this.n > 2 ? 'un topo' : 'il topo'}! +${PUNTI_PRESA} 🐱`, `preso! +${PUNTI_PRESA} 🐱`, false, { bersaglio: p, testoTe: 'ti ha preso! Torni in una tana 🐭' });
        this.cambiato = true;
      }
    }
    return this.tempoRound >= DURATA;
  }
  fineRound() { fineTrucco(this); }
  pensa(p, liv) {
    const e = this.e[p], ora = this.tempoRound;
    const m = this.memoria[p] || (this.memoria[p] = { fino: 0, dir: { x: 0, y: 0 }, bers: null });
    if (ora < m.fino) return p === this.gatto ? { mx: m.bers ? m.bers.x : e.x, my: m.bers ? m.bers.y : e.y } : { x: m.dir.x, y: m.dir.y };
    m.fino = ora + { facile: 0.35, medio: 0.26, difficile: 0.06 }[liv];
    const errore = { facile: 60, medio: 20, difficile: 5 }[liv];
    if (p === this.gatto) {
      // il gatto punta il topo più vicino (il difficile anticipa dove andrà)
      let meglio = null, dm = Infinity;
      for (let q = 0; q < this.n; q++) {
        if (q === p) continue;
        const t = this.e[q]; if (t.fermo > 0 || t.scudo > 0.3) continue;
        const d = Math.hypot(t.x - e.x, t.y - e.y);
        if (d < dm) { dm = d; meglio = q; }
      }
      if (meglio === null) { m.bers = { x: W / 2, y: H / 2 }; return { mx: W / 2, my: H / 2 }; }
      const t = this.e[meglio], it = this.inp[meglio];
      const anticipo = liv === 'difficile' ? Math.min(0.6, dm / V_GATTO) : 0;
      m.bers = { x: t.x + it.x * V_TOPO * anticipo + casuale(-errore, errore), y: t.y + it.y * V_TOPO * anticipo + casuale(-errore, errore) };
      return { mx: m.bers.x, my: m.bers.y };
    }
    // topo: scappa dal gatto e va verso il formaggio
    const g = this.e[this.gatto];
    const dg = Math.hypot(g.x - e.x, g.y - e.y) || 1;
    let fx = 0, fy = 0;
    const paura = { facile: 170, medio: 200, difficile: 290 }[liv];
    if (dg < paura) { fx += ((e.x - g.x) / dg) * (paura / dg) * 1.8; fy += ((e.y - g.y) / dg) * (paura / dg) * 1.8; }
    let fb = null, fd = Infinity;
    for (const f of this.formaggio) {
      const d = Math.hypot(f.x - e.x, f.y - e.y) + (liv === 'difficile' ? Math.max(0, 200 - Math.hypot(f.x - g.x, f.y - g.y)) * 1.5 : 0);
      if (d < fd) { fd = d; fb = f; }
    }
    if (fb) { const v = verso(e, fb); fx += v.x; fy += v.y; }
    // lontano dai muri (negli angoli il gatto ti prende)
    if (liv !== 'facile') { if (e.x < 80) fx += 0.6; if (e.x > W - 80) fx -= 0.6; if (e.y < 80) fy += 0.6; if (e.y > H - 80) fy -= 0.6; }
    fx += casuale(-1, 1) * { facile: 0.8, medio: 0.45, difficile: 0.1 }[liv]; fy += casuale(-1, 1) * { facile: 0.8, medio: 0.45, difficile: 0.1 }[liv];
    const l = Math.hypot(fx, fy) || 1;
    m.dir = { x: fx / l, y: fy / l };
    return { x: m.dir.x, y: m.dir.y };
  }
  statoTick() {
    return { g: this.gatto, te: this.stanza.tema, mob: this.round && this.mobili, e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), f: e.fermo > 0 ? 1 : 0, sc: e.scudo > 0 ? 1 : 0, salto: e.salto })), fo: this.formaggio.map((f) => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y) })), resta: Math.max(0, Math.round(DURATA - this.tempoRound)) };
  }
  vistaExtra() { return { prese: this.prese, formaggi: this.formaggi }; }
}

module.exports = {
  meta: {
    id: 'gattotopi',
    nome: 'Il gatto e i topi',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Uno è il gatto e si muove col mouse, gli altri sono topi con la tastiera: formaggi da rubare senza farsi prendere.',
    alias: ['gatto', 'topi', 'topo', 'acchiapparella', 'formaggio', 'cat and mouse'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [0, 2, 4], etichette: ['Ognuno fa il gatto una volta', '2 round', '4 round'], predefinito: 0 }],
    regole: [
      'A ogni round un giocatore è il GATTO 🐱 e tutti gli altri sono TOPI 🐭. Il gatto cambia a ogni round: di solito ognuno lo fa una volta.',
      'Il gatto segue il puntatore del mouse (sul telefono: il dito sul campo, o il joystick). I topi si muovono con WASD o le frecce (sul telefono: il joystick). Il gatto è un po\' più veloce dei topi, ma i mobili della stanza lo intralciano.',
      'A ogni round si gioca in una stanza diversa, scelta a caso: soggiorno, cucina, cantina, camera da letto o biblioteca, ognuna con i suoi mobili che fanno da ostacolo (tappeti e piante no: ci si passa sopra). Le tane dei topi sono nei quattro angoli.',
      'I topi raccolgono i formaggi 🧀 che compaiono nella stanza: 1 punto ciascuno.',
      'Se il gatto tocca un topo lo prende: 3 punti al gatto, e il topo torna in una tana d\'angolo, fermo per un attimo e protetto per un secondo e mezzo.',
      'Un round dura 50 secondi. Alla fine di tutti i round vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile è lento a reagire e un po\' distratto; il medio insegue e scappa bene; il difficile da gatto anticipa dove andranno i topi e da topo sceglie i formaggi lontani dal gatto e sta lontano dagli angoli.',
    ],
  },
  crea: (o) => new GattoTopi(o),
  bot: () => ({}),
  _test: { GattoTopi, STANZE },
};
