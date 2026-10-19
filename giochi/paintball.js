// PAINTBALL: sparatutto visto dall'alto. Ti muovi con la tastiera (o il joystick) e spari palline di vernice verso il
// mouse (o dove tocchi il campo). Chi viene colpito si sporca e riparte da un angolo. Vince chi fa più centri.
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
const W = 1000, H = 620, R = 16, V = 215, V_PALLA = 640, VITA_PALLA = 1.3, RICARICA = 0.35, DURATA = 75, RINASCITA = 1.5, PROTEZIONE = 1.2;
// CAMPI a tema, simmetrici rispetto al centro (così nessun angolo è avvantaggiato). Ogni blocco è
// [x, y, larghezza, altezza, tipo]: il tipo serve solo al disegno; le palline si fermano su tutti.
// Si scrive mezzo campo e l'altra metà si ottiene ruotandolo di mezzo giro intorno al centro.
const specchio = (meta) => {
  const out = [];
  for (const [x, y, w, h, t] of meta) {
    out.push([x, y, w, h, t]);
    const m = [W - x - w, H - y - h, w, h, t];
    if (m[0] !== x || m[1] !== y) out.push(m);
  }
  return out;
};
const CAMPI = [
  { tema: 'bosco', blocchi: specchio([[170, 120, 130, 28, 'tronco'], [120, 250, 30, 120, 'tronco'], [310, 230, 64, 64, 'roccia'], [430, 80, 40, 130, 'siepe'], [460, 285, 80, 50, 'roccia'], [230, 430, 150, 30, 'siepe'], [640, 170, 50, 50, 'roccia']]) },
  { tema: 'cantiere', blocchi: specchio([[140, 100, 170, 50, 'container'], [390, 170, 46, 46, 'bidone'], [170, 300, 46, 46, 'bidone'], [280, 400, 190, 50, 'container'], [470, 125, 44, 100, 'container'], [600, 250, 46, 46, 'bidone'], [110, 440, 60, 60, 'cassa']]) },
  { tema: 'fortino', blocchi: specchio([[190, 110, 120, 24, 'sacchi'], [190, 134, 24, 80, 'sacchi'], [420, 200, 160, 24, 'sacchi'], [110, 380, 24, 110, 'sacchi'], [300, 330, 100, 24, 'sacchi'], [376, 354, 24, 70, 'sacchi'], [620, 90, 60, 60, 'cassa']]) },
  { tema: 'citta', blocchi: specchio([[150, 110, 140, 100, 'edificio'], [370, 60, 100, 90, 'edificio'], [360, 250, 110, 44, 'auto'], [150, 360, 110, 120, 'edificio'], [560, 190, 44, 44, 'cassonetto'], [320, 420, 44, 44, 'cassonetto']]) },
  { tema: 'deserto', blocchi: specchio([[200, 130, 70, 70, 'roccia'], [360, 90, 34, 34, 'cactus'], [140, 300, 34, 34, 'cactus'], [300, 260, 150, 30, 'rovina'], [300, 290, 30, 90, 'rovina'], [220, 440, 90, 60, 'roccia'], [480, 420, 40, 40, 'cactus'], [620, 60, 34, 34, 'cactus']]) },
];
const ANGOLI = [[50, 50], [W - 50, H - 50], [W - 50, 50], [50, H - 50], [W / 2, 40], [W / 2, H - 40], [40, H / 2], [W - 40, H / 2]];

const dentroRett = (x, y, [rx, ry, w, h], m = 0) => x > rx - m && x < rx + w + m && y > ry - m && y < ry + h + m;
function spingi(e, blocchi) {
  e.x = Math.max(R, Math.min(W - R, e.x)); e.y = Math.max(R, Math.min(H - R, e.y));
  for (const [x, y, w, h] of blocchi) {
    const cx = Math.max(x, Math.min(x + w, e.x)), cy = Math.max(y, Math.min(y + h, e.y)), dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < R && d > 0.001) { e.x = cx + (dx / d) * R; e.y = cy + (dy / d) * R; }
  }
}
// si vede in linea retta da a a b senza blocchi in mezzo?
function libera(a, b, blocchi) {
  const passi = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
  for (let k = 1; k < passi; k++) { const x = a.x + ((b.x - a.x) * k) / passi, y = a.y + ((b.y - a.y) * k) / passi; if (blocchi.some((r) => dentroRett(x, y, r, 3))) return false; }
  return true;
}

class Paintball extends Arena {
  constructor(o) { super(o, { id: 'paintball', round: 2 }); this.W = W; this.H = H; this.avvia(); }
  iniziaRound() {
    // a ogni round un campo diverso, il primo a caso
    if (this.campo0 === undefined) this.campo0 = Math.floor(Math.random() * CAMPI.length);
    this.campo = CAMPI[(this.campo0 + this.round - 1) % CAMPI.length];
    this.blocchi = this.campo.blocchi;
    this.griglia = null;
    this.palle = []; this.macchie = []; this.nP = 0;
    this.e = Array.from({ length: this.n }, (_, i) => ({ id: i, x: ANGOLI[i % 8][0], y: ANGOLI[i % 8][1], ricarica: 0, morto: 0, prot: PROTEZIONE, centri: 0, salto: 0, ax: W / 2, ay: H / 2 }));
    this.mente = {}; this.colpi = [];
  }
  spara(p) {
    const e = this.e[p], i = this.inp[p];
    if (e.ricarica > 0 || e.morto > 0) return;
    const tx = i.mx ?? e.ax, ty = i.my ?? e.ay;
    const d = Math.hypot(tx - e.x, ty - e.y) || 1;
    this.palle.push({ id: ++this.nP, x: e.x + ((tx - e.x) / d) * (R + 4), y: e.y + ((ty - e.y) / d) * (R + 4), vx: ((tx - e.x) / d) * V_PALLA, vy: ((ty - e.y) / d) * V_PALLA, da: p, t: 0 });
    e.ricarica = RICARICA;
    this.colpi.push(p);
  }
  passo(dt) {
    const win = this.e.map((_, p) => conTrucco(this, p)); // il trucco segreto: le sue palle prendono da più lontano e lui non viene colpito
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p], i = this.inp[p];
      e.ricarica = Math.max(0, e.ricarica - dt); e.prot = Math.max(0, e.prot - dt);
      if (i.mx !== null) { e.ax = i.mx; e.ay = i.my; }
      if (e.morto > 0) {
        e.morto -= dt; this.nuoviTocchi(p);
        if (e.morto <= 0) {
          // si riparte dall'angolo più lontano dagli altri
          const a = ANGOLI.slice(0, 4).reduce((m, q) => { const d = Math.min(...this.e.filter((o, k) => k !== p && o.morto <= 0).map((o) => Math.hypot(o.x - q[0], o.y - q[1])), 9999); return d > m.d ? { d, q } : m; }, { d: -1, q: ANGOLI[0] }).q;
          e.x = a[0]; e.y = a[1]; e.prot = PROTEZIONE; e.salto++; this.cambiato = true;
        }
        continue;
      }
      e.x += i.x * V * dt; e.y += i.y * V * dt;
      spingi(e, this.blocchi);
      if (this.nuoviTocchi(p) || i.a) this.spara(p);
    }
    for (const b of this.palle) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.t > VITA_PALLA || b.x < 0 || b.y < 0 || b.x > W || b.y > H || this.blocchi.some((r) => dentroRett(b.x, b.y, r))) { b.fine = true; this.macchie.push({ x: Math.round(b.x), y: Math.round(b.y), c: b.da, r: 8 }); continue; }
      for (let q = 0; q < this.n; q++) {
        const e = this.e[q];
        if (q === b.da || e.morto > 0 || e.prot > 0 || win[q]) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < R + (win[b.da] ? 26 : 5)) {
          b.fine = true; e.morto = RINASCITA; this.punti[b.da]++; this.e[b.da].centri++;
          this.macchie.push({ x: Math.round(e.x), y: Math.round(e.y), c: b.da, r: 22 });
          this.cambiato = true;
          this.annuncia(b.da, 'colpisce @! 🎯', 'hai colpito @! 🎯', false, { bersaglio: q, testoTe: 'ti ha colpito! 🎨' });
          break;
        }
      }
    }
    this.palle = this.palle.filter((b) => !b.fine);
    if (this.macchie.length > 160) this.macchie.splice(0, this.macchie.length - 160);
    return this.tempoRound >= DURATA;
  }
  fineRound() { fineTrucco(this); }
  pensa(p, liv) {
    const e = this.e[p];
    if (e.morto > 0) return {};
    const m = this.mente[p] || (this.mente[p] = { fino: 0, x: 0, y: 0, mx: W / 2, my: H / 2, lato: 1 });
    const ora = this.tempoRound;
    if (ora < m.fino) return { x: m.x, y: m.y, mx: m.mx, my: m.my };
    m.fino = ora + { facile: 0.35, medio: 0.22, difficile: 0.06 }[liv];
    // bersaglio: il più vicino, meglio se si vede
    let bers = null, vb = Infinity;
    for (let q = 0; q < this.n; q++) { if (q === p || this.e[q].morto > 0) continue; const o = this.e[q]; const v = Math.hypot(o.x - e.x, o.y - e.y) + (libera(e, o, this.blocchi) ? 0 : 300); if (v < vb) { vb = v; bers = q; } }
    if (bers === null) { m.x = 0; m.y = 0; return {}; }
    const o = this.e[bers], io = this.inp[bers];
    const d = Math.hypot(o.x - e.x, o.y - e.y), vede = libera(e, o, this.blocchi);
    // mira: il difficile anticipa il movimento; tutti sbagliano un po'
    const t = d / V_PALLA, ant = liv === 'difficile' ? 1 : liv === 'medio' ? 0.5 : 0;
    const err = { facile: 70, medio: 38, difficile: 6 }[liv];
    m.mx = o.x + io.x * V * t * ant + casuale(-err, err); m.my = o.y + io.y * V * t * ant + casuale(-err, err);
    // movimento: avvicinarsi se lontano, allontanarsi se vicino, spostarsi di lato; ogni tanto si cambia lato
    const dist = { facile: 200, medio: 260, difficile: 300 }[liv];
    const ux = (o.x - e.x) / (d || 1), uy = (o.y - e.y) / (d || 1);
    if (Math.random() < 0.04) m.lato = -m.lato;
    let mx = 0, my = 0;
    if (!vede) {
      // non lo vede: cerca la strada tra i ripari (il facile va quasi dritto e si incastra più spesso)
      const st = liv === 'facile' ? null : this.strada(e, o);
      if (st) { mx = st.x; my = st.y; } else { mx = ux; my = uy; mx += -uy * 0.8 * m.lato; my += ux * 0.8 * m.lato; }
    } else {
      const avanti = d > dist ? 1 : d < dist - 80 ? -1 : 0;
      mx = ux * avanti - uy * m.lato * (liv === 'facile' ? 0.3 : 0.9); my = uy * avanti + ux * m.lato * (liv === 'facile' ? 0.3 : 0.9);
    }
    // il difficile schiva le palle in arrivo
    if (liv === 'difficile') for (const b of this.palle) { if (b.da === p) continue; const rx = e.x - b.x, ry = e.y - b.y, vv = Math.hypot(b.vx, b.vy), proiez = (rx * b.vx + ry * b.vy) / vv; if (proiez > 0 && proiez < 180) { const lat = Math.abs(rx * b.vy - ry * b.vx) / vv; if (lat < R + 12) { mx += -b.vy / vv * 1.5 * m.lato; my += b.vx / vv * 1.5 * m.lato; } } }
    const l = Math.hypot(mx, my) || 1; m.x = mx / l; m.y = my / l;
    const spara = vede && Math.random() < { facile: 0.35, medio: 0.6, difficile: 0.95 }[liv];
    return { x: m.x, y: m.y, mx: m.mx, my: m.my, tocco: spara };
  }
  // strada più corta (griglia da 20 px, visita in ampiezza) da e verso o: restituisce la direzione del prossimo passo
  strada(e, o) {
    const C = 20, cols = W / C, righe = Math.ceil(H / C);
    if (!this.griglia) {
      this.griglia = new Uint8Array(cols * righe);
      for (let r = 0; r < righe; r++) for (let c = 0; c < cols; c++) { const x = c * C + C / 2, y = r * C + C / 2; this.griglia[r * cols + c] = x < R || y < R || x > W - R || y > H - R || this.blocchi.some((b) => dentroRett(x, y, b, R + 1)) ? 1 : 0; }
    }
    const cella = (p) => Math.max(0, Math.min(righe - 1, Math.floor(p.y / C))) * cols + Math.max(0, Math.min(cols - 1, Math.floor(p.x / C)));
    const da = cella(e), a = cella(o);
    const prec = new Int32Array(cols * righe).fill(-1); prec[da] = da;
    const coda = [da];
    for (let q = 0; q < coda.length && prec[a] < 0; q++) {
      const k = coda[q], r = Math.floor(k / cols), c = k % cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= righe || cc >= cols) continue; const kk = rr * cols + cc; if (prec[kk] >= 0 || (this.griglia[kk] && kk !== a)) continue; prec[kk] = k; coda.push(kk); }
    }
    if (prec[a] < 0) return null;
    let k = a; const cam = [];
    while (k !== da && cam.length < 300) { cam.push(k); k = prec[k]; }
    const pr = cam[Math.max(0, cam.length - 2)];
    if (pr === undefined) return null;
    const tx = (pr % cols) * C + C / 2, ty = Math.floor(pr / cols) * C + C / 2, d = Math.hypot(tx - e.x, ty - e.y) || 1;
    return { x: (tx - e.x) / d, y: (ty - e.y) / d };
  }
  statoTick() {
    return {
      te: this.campo.tema, bl: this.blocchi, resta: Math.max(0, Math.round(DURATA - this.tempoRound)),
      e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), m: e.morto > 0 ? 1 : 0, pr: e.prot > 0 ? 1 : 0, ax: Math.round(e.ax), ay: Math.round(e.ay), salto: e.salto })),
      pa: this.palle.map((b) => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), c: b.da })), mc: this.macchie.slice(-40),
    };
  }
}

module.exports = {
  meta: {
    id: 'paintball',
    nome: 'Paintball',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Sparatutto visto dall\'alto con le palline di vernice: muoviti, mira col mouse, ripariti dietro i muretti e fai centro!',
    alias: ['paintball', 'sparatutto', 'shooter', 'vernice', 'spara', 'top down'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [2, 1, 3], etichette: ['2 round', '1 round', '3 round'], predefinito: 2 }],
    regole: [
      'Ti muovi con WASD o le frecce e miri con il mouse: clicca (o premi spazio, o tieni premuto) per sparare una pallina di vernice. Sul telefono: joystick per muoverti e tocca il campo dove vuoi sparare.',
      'Le palline si fermano sui muretti, che servono da riparo. Tra un colpo e l\'altro c\'è un attimo di ricarica.',
      'Chi viene colpito si sporca di vernice e riparte dopo un secondo e mezzo dall\'angolo più lontano dagli avversari, protetto per poco più di un secondo. Ogni centro vale un punto.',
      'Campi (simmetrici, così nessun angolo è avvantaggiato): bosco (tronchi, rocce e siepi), cantiere (container, bidoni e casse), fortino (sacchi di sabbia a U), città (palazzi, auto e cassonetti) e deserto (rocce, cactus e rovine). Un round dura 75 secondi e a ogni round cambia il campo. Dopo 2 round (o 1, o 3) vince chi ha fatto più centri.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile mira male, si muove poco e si incastra dietro i ripari; il medio cerca la strada tra i ripari, si sposta di lato e mira bene; il difficile anticipa dove andrai, schiva le palline e non sbaglia quasi mai.',
    ],
  },
  crea: (o) => new Paintball(o),
  bot: () => ({}),
  _test: { Paintball, CAMPI, ANGOLI },
};
