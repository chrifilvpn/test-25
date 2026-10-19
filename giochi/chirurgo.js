// ALLEGRO CHIRURGO: un percorso stretto da seguire trascinando il mouse o il dito, senza toccare i bordi.
// Tutti hanno lo stesso percorso nello stesso momento: vince il round chi arriva prima. Se tocchi il bordo (o lasci
// andare il mouse o il dito) ricominci da zero, dalla partenza. In tempo reale: il browser controlla i bordi al
// volo e manda al server la posizione; il server ricalcola l'avanzamento e rifiuta i salti impossibili.
const W = 1000, H = 620;
const LIVELLI = ['facile', 'normale', 'difficile', 'esperto', 'impossibile', 'estremo'];
const NOMI = { facile: 'Facile', normale: 'Normale', difficile: 'Difficile', esperto: 'Esperto', impossibile: 'Impossibile', estremo: 'Impossibile estremo' };
// righe del serpentone, larghezza del corridoio, ampiezza delle curve, passo tra le curve
const PARAM = {
  facile: { righe: 1, w: 76, amp: 60, passo: 150 },
  normale: { righe: 2, w: 56, amp: 45, passo: 120 },
  difficile: { righe: 2, w: 40, amp: 52, passo: 90 },
  esperto: { righe: 3, w: 30, amp: 36, passo: 80 },
  impossibile: { righe: 3, w: 20, amp: 40, passo: 62 },
  estremo: { righe: 4, w: 16, amp: 30, passo: 55, pulsa: true },
};
const ROUND = [3, 1, 5];
const VIA_MS = 3500, PAUSA_MS = 4500, MAX_MS = 150000, DOPO_PRIMO_MS = 20000;
const R_PARTENZA = 26; // raggio della zona di partenza e di arrivo
// computer: velocità (px/s) e probabilità di toccare ogni 100 px (moltiplicata per la difficoltà del percorso)
const BOT = { facile: { v: 170, p: 0.05 }, medio: { v: 250, p: 0.03 }, difficile: { v: 360, p: 0.017 } };
const T = require('./trucco');
const LARGO = 2.2; // il trucco segreto (!win): per tutto il round i bordi per lui sono molto più tolleranti (e il computer non tocca)
const MOLT = { facile: [1, 0.3], normale: [0.85, 0.6], difficile: [0.7, 1], esperto: [0.55, 1.6], impossibile: [0.42, 2.4], estremo: [0.33, 3.4] };

// larghezza del corridoio nel tempo (solo nell'estremo "respira": si stringe e si allarga)
const larghezza = (liv, t) => (PARAM[liv].pulsa ? PARAM[liv].w * (0.78 + 0.22 * Math.sin(t / 420)) : PARAM[liv].w);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

// PERCORSI: a ogni round se ne sceglie uno a caso tra più famiglie, così non sono mai uguali:
// - serpentone: righe orizzontali ondulate collegate alle estremità
// - labirinto: una camminata a caso su una griglia (senza mai ripassare sulla stessa casella), poi arrotondata
// - spirale: si entra girando verso il centro
// - zig-zag: diagonali strette avanti e indietro
const CELLA = { facile: 190, normale: 150, difficile: 120, esperto: 100, impossibile: 80, estremo: 64 };
const FAMIGLIE = {
  facile: ['serpentone', 'labirinto', 'zigzag'],
  normale: ['serpentone', 'labirinto', 'spirale', 'zigzag'],
  difficile: ['labirinto', 'spirale', 'zigzag', 'serpentone'],
  esperto: ['labirinto', 'spirale', 'zigzag'],
  impossibile: ['labirinto', 'spirale', 'labirinto'],
  estremo: ['labirinto', 'spirale'],
};
const M_BORDO = 60;

function serpentone(liv) {
  const { righe, amp, passo } = PARAM[liv];
  const spazio = H / (righe + 1);
  const ctrl = [];
  for (let r = 0; r < righe; r++) {
    const y0 = spazio * (r + 1);
    const xs = [];
    for (let x = M_BORDO + 10; x <= W - M_BORDO - 10; x += passo) xs.push(x);
    if (xs[xs.length - 1] < W - M_BORDO - 10) xs.push(W - M_BORDO - 10);
    if (r % 2) xs.reverse();
    xs.forEach((x, i) => ctrl.push([x, y0 + (i === 0 || i === xs.length - 1 ? 0 : (Math.random() * 2 - 1) * amp)]));
  }
  return ctrl;
}
// camminata a caso su una griglia, la più lunga trovata in qualche tentativo (niente incroci per costruzione)
function labirinto(liv) {
  const c = CELLA[liv];
  const cols = Math.floor((W - 2 * M_BORDO) / c) + 1, rows = Math.floor((H - 2 * M_BORDO) / c) + 1;
  const ox = (W - (cols - 1) * c) / 2, oy = (H - (rows - 1) * c) / 2;
  const obiettivo = Math.floor(cols * rows * (liv === 'facile' ? 0.45 : 0.62));
  let migliore = [];
  for (let prova = 0; prova < 60 && migliore.length < obiettivo; prova++) {
    const visti = new Set();
    let cur = [0, Math.floor(Math.random() * rows)];
    const cam = [cur]; visti.add(cur.join());
    for (;;) {
      const dirs = [[1, 0], [0, 1], [0, -1], [-1, 0]].sort(() => Math.random() - 0.5);
      // un po' di spinta verso destra, così il percorso attraversa la tavola
      dirs.sort((a, b) => (b[0] - a[0]) * (Math.random() < 0.35 ? 1 : 0));
      const libere = dirs.map(([dx, dy]) => [cur[0] + dx, cur[1] + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !visti.has(`${x},${y}`));
      if (!libere.length) break;
      // meglio non chiudersi da soli: si preferiscono le caselle con più vicini liberi
      libere.sort((a, b) => [[1, 0], [0, 1], [0, -1], [-1, 0]].filter(([dx, dy]) => !visti.has(`${a[0] + dx},${a[1] + dy}`)).length - [[1, 0], [0, 1], [0, -1], [-1, 0]].filter(([dx, dy]) => !visti.has(`${b[0] + dx},${b[1] + dy}`)).length);
      cur = Math.random() < 0.7 ? libere[0] : libere[Math.floor(Math.random() * libere.length)];
      visti.add(cur.join()); cam.push(cur);
    }
    if (cam.length > migliore.length) migliore = cam;
  }
  // a volte si tolgono i passi dritti di mezzo così le curve si vedono meglio
  return migliore.map(([x, y]) => [ox + x * c + (Math.random() - 0.5) * c * 0.18, oy + y * c + (Math.random() - 0.5) * c * 0.18]);
}
function spirale(liv) {
  const c = CELLA[liv];
  const cx = W / 2 + (Math.random() - 0.5) * 60, cy = H / 2;
  const giri = Math.max(1.3, Math.min(3.2, (H / 2 - M_BORDO) / c));
  const pts = [];
  const verso = Math.random() < 0.5 ? 1 : -1;
  for (let t = 0; t <= giri * Math.PI * 2; t += 0.35) {
    const r = (H / 2 - M_BORDO) * (1 - t / (giri * Math.PI * 2) * (1 - 0.8 * c / (H / 2)));
    pts.push([cx + Math.cos(verso * t) * r * (W - 2 * M_BORDO) / (H - 2 * M_BORDO) * 0.95, cy + Math.sin(verso * t) * r]);
  }
  return pts;
}
function zigzag(liv) {
  const c = CELLA[liv];
  const pts = [];
  const n = Math.floor((W - 2 * M_BORDO) / (c * 0.9));
  for (let i = 0; i <= n; i++) {
    const x = M_BORDO + (i * (W - 2 * M_BORDO)) / n;
    const alto = i % 2 === 0;
    pts.push([x, alto ? M_BORDO + Math.random() * 40 : H - M_BORDO - Math.random() * 40]);
  }
  return pts;
}

function liscia(ctrl) {
  const pts = [];
  const est = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  for (let i = 1; i < est.length - 2; i++) {
    const d = Math.hypot(est[i + 1][0] - est[i][0], est[i + 1][1] - est[i][1]);
    const passi = Math.max(2, Math.ceil(d / 4));
    for (let s = 0; s < passi; s++) pts.push(catmull(est[i - 1], est[i], est[i + 1], est[i + 2], s / passi).map((v) => Math.round(v * 10) / 10));
  }
  pts.push(ctrl[ctrl.length - 1]);
  return pts;
}
// i giri del percorso non devono toccarsi: punti lontani lungo il percorso devono essere lontani anche sulla tavola
function valido(pts, liv) {
  const w = PARAM[liv].w;
  if (!pts.every(([x, y]) => x > 25 && x < W - 25 && y > 25 && y < H - 25)) return false;
  const lung = [0];
  for (let i = 1; i < pts.length; i++) lung.push(lung[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  for (let i = 0; i < pts.length; i += 5) for (let j = i + 5; j < pts.length; j += 5) {
    if (lung[j] - lung[i] > 3 * w + 60 && Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < w + 18) return false;
  }
  return true;
}

function generaPercorso(liv, famiglia = null) {
  const scelte = famiglia ? [famiglia] : FAMIGLIE[liv];
  let pts = null, fam = null;
  for (let prova = 0; prova < 30 && !pts; prova++) {
    fam = scelte[Math.floor(Math.random() * scelte.length)];
    const ctrl = { serpentone, labirinto, spirale, zigzag }[fam](liv);
    if (ctrl.length < 3) continue;
    const q = liscia(ctrl);
    if (valido(q, liv)) pts = q;
  }
  if (!pts) { fam = 'serpentone'; pts = liscia(serpentone(liv)); }
  const lung = [0];
  for (let i = 1; i < pts.length; i++) lung.push(lung[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lung, totale: lung[lung.length - 1], famiglia: fam };
}

// punto più vicino del percorso: distanza e avanzamento (0..1). Con "da" si cerca solo intorno all'ultimo punto
// raggiunto (finestra): così dove due giri del percorso passano vicini non si "salta" sull'altro giro per errore.
function vicino(perc, x, y, da = null, finestra = 90) {
  let best = Infinity, bi = 0, bt = 0;
  const p = perc.pts;
  const i0 = da === null ? 0 : Math.max(0, da - finestra), i1 = da === null ? p.length - 1 : Math.min(p.length - 1, da + finestra);
  for (let i = i0; i < i1; i++) {
    const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < best) { best = d; bi = i; bt = t; }
  }
  const s = perc.lung[bi] + bt * (perc.lung[bi + 1] - perc.lung[bi]);
  return { d: best, prog: s / perc.totale, idx: bi };
}

class Chirurgo {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'chirurgo';
    this.n = n;
    this.livello = LIVELLI.includes(opzioni.difficolta) ? opzioni.difficolta : 'normale';
    this.nRound = ROUND.includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.tickMs = 50;
    this.punti = new Array(n).fill(0);
    this.tempiTot = new Array(n).fill(0);
    this.tocchiTot = new Array(n).fill(0);
    this.storico = [];
    this.round = 0;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
    this.nuovoRound(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) {
      const d = Date.now() - this.pausaDal;
      this.inizio += d; this.fineFase += d;
      this.g.forEach((x) => { if (x.dal) x.dal += d; if (x.ultimo) x.ultimo += d; });
      // chi stava correndo riparte dalla partenza: il dito o il mouse si saranno spostati
      this.g.forEach((x, p) => { if (!this.bot[p] && x.stato === 'corre') this.azzera(p, false); });
    }
    this.inPausa = si;
  }

  nuovoRound(ora) {
    this.round++;
    this.percorso = generaPercorso(this.livello);
    this.fase = 'via';
    this.inizio = ora + VIA_MS;
    this.fineFase = this.inizio + MAX_MS;
    this.primoArrivo = null;
    this.arrivi = [];
    this.g = Array.from({ length: this.n }, () => ({ stato: 'pronto', prog: 0, pos: null, tocchi: 0, tempo: null, dal: null, ultimo: null }));
  }

  azzera(p, tocco = true) {
    const x = this.g[p];
    x.stato = 'pronto'; x.prog = 0; x.dal = null;
    if (tocco) { x.tocchi++; x.flash = Date.now(); }
  }

  // comandi dal browser: { t: 'via', x, y } partenza premuta; { t: 'pos', x, y } posizione; { t: 'tocca' }
  input(p, d) {
    if (this.bot[p] || this.fase !== 'corsa' || this.inPausa) return;
    const x = this.g[p];
    if (!x || x.tempo !== null || !d) return;
    const px = Number(d.x), py = Number(d.y);
    if (d.t === 'tocca') { if (x.stato === 'corre') this.azzera(p); return; }
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    const pp = this.percorso.pts;
    if (d.t === 'via') {
      if (Math.hypot(px - pp[0][0], py - pp[0][1]) > R_PARTENZA + 6) return;
      x.stato = 'corre'; x.prog = 0; x.pos = [px, py]; x.dal = Date.now(); x.idx = 0;
      return;
    }
    if (d.t !== 'pos' || x.stato !== 'corre') return;
    // si cerca intorno all'ultimo punto (finestra larga: tra un messaggio e l'altro ci si può muovere parecchio)
    const v = vicino(this.percorso, px, py, x.idx || 0, 160);
    const w = larghezza(this.livello, Date.now()) * (this.largo(p) ? LARGO : 1);
    // fuori dal corridoio (con un po' di tolleranza per il ritardo della rete): si ricomincia
    const inizio = pp[0], fineP = pp[pp.length - 1];
    const salvo = Math.hypot(px - inizio[0], py - inizio[1]) <= R_PARTENZA + 4 || (x.prog > 0.9 && Math.hypot(px - fineP[0], py - fineP[1]) <= R_PARTENZA + 4);
    if (v.d > w / 2 + 8 && !salvo) { this.azzera(p); return; }
    x.idx = v.idx;
    x.prog = Math.max(x.prog, v.prog);
    x.pos = [Math.round(px), Math.round(py)];
    const fine = pp[pp.length - 1];
    if (x.prog > 0.97 && Math.hypot(px - fine[0], py - fine[1]) <= R_PARTENZA) this.arriva(p, Date.now());
  }

  arriva(p, ora) {
    const x = this.g[p];
    x.tempo = ora - this.inizio;
    x.stato = 'arrivato';
    x.prog = 1;
    this.arrivi.push(p);
    if (this.primoArrivo === null) {
      this.primoArrivo = ora;
      this.fineFase = Math.min(this.fineFase, ora + DOPO_PRIMO_MS);
      this.annuncia(p, `arriva per primo in ${(x.tempo / 1000).toFixed(1)} s! 🏁`, `arrivi per primo in ${(x.tempo / 1000).toFixed(1)} s! 🏁`, true);
    }
    this.cambiato = true;
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    this.cambiato = false;
    if (this.fase === 'via') {
      if (ora < this.inizio) return false;
      this.fase = 'corsa';
      return true;
    }
    if (this.fase === 'corsa') {
      const tot = this.percorso.totale;
      const [mv, mp] = MOLT[this.livello];
      this.g.forEach((x, p) => {
        const liv = this.bot[p];
        if (!liv || x.tempo !== null) return;
        if (x.stato === 'pronto') { if (!x.attesa) x.attesa = ora + 350 + Math.random() * 500; if (ora >= x.attesa) { x.stato = 'corre'; x.dal = ora; x.attesa = null; x.ultimo = ora; } return; }
        const dt = (ora - (x.ultimo || ora)) / 1000;
        x.ultimo = ora;
        const win = this.largo(p);
        const dist = BOT[liv].v * mv * (0.8 + Math.random() * 0.4) * dt * (win ? 1.2 : 1);
        // probabilità di toccare il bordo in questo tratto
        if (!win && Math.random() < 1 - Math.pow(1 - BOT[liv].p * mp, dist / 100)) { this.azzera(p); x.attesa = ora + 500 + Math.random() * 500; this.cambiato = true; return; }
        x.prog = Math.min(1, x.prog + dist / tot);
        const i = Math.min(this.percorso.pts.length - 1, this.percorso.lung.findIndex((l) => l >= x.prog * tot));
        const q = this.percorso.pts[i < 0 ? this.percorso.pts.length - 1 : i];
        x.pos = [Math.round(q[0]), Math.round(q[1])];
        if (x.prog >= 1) this.arriva(p, ora);
      });
      if (this.g.every((x) => x.tempo !== null) || ora >= this.fineFase) return this.fineRound(ora);
      return this.cambiato;
    }
    if (this.fase === 'pausa' && ora >= this.fineFase) {
      if (this.round >= this.nRound) { this.chiudi(); return true; }
      this.nuovoRound(ora);
      return true;
    }
    return false;
  }

  // il trucco segreto vale per il round in corso (si segna appena lo usa, e si spegne a fine round)
  largo(p) {
    const x = this.g[p];
    if (x && !x.win && (this.fase === 'via' || this.fase === 'corsa') && T.armato(this, p)) x.win = true;
    return !!(x && x.win);
  }

  fineRound(ora) {
    this.g.forEach((x, p) => { if (x.win) T.consuma(this, p); });
    // punti: il primo ne prende quanti sono i giocatori, il secondo uno in meno… chi non arriva zero
    this.arrivi.forEach((p, k) => { this.punti[p] += this.n - k; });
    this.g.forEach((x, p) => {
      this.tempiTot[p] += x.tempo !== null ? x.tempo : MAX_MS;
      this.tocchiTot[p] += x.tocchi;
    });
    this.storico.push({ tempi: this.g.map((x) => x.tempo), tocchi: this.g.map((x) => x.tocchi), arrivi: this.arrivi.slice() });
    if (!this.arrivi.length) this.annuncia(null, 'Nessuno è arrivato alla fine 😵', '');
    this.fase = 'pausa';
    this.fineFase = ora + PAUSA_MS;
    return true;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    let vincitori;
    if (this.n === 1) vincitori = this.storico.some((s) => s.tempi[0] !== null) ? [0] : [];
    else {
      const max = Math.max(...this.punti);
      let cand = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
      if (cand.length > 1) { const min = Math.min(...cand.map((i) => this.tempiTot[i])); cand = cand.filter((i) => this.tempiTot[i] === min); }
      vincitori = cand;
    }
    this.risultato = {
      fazioni: (this.n === 1 ? this.tempiTot.map((x) => Number((x / 1000).toFixed(1))) : this.punti).map((x, i) => ({ posti: [i], punti: x })),
      etichetta: this.n === 1 ? 'secondi' : 'punti', crescente: this.n === 1,
      pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori,
    };
    if (this.n === 1) this.risultato.titolo = `${this.storico.filter((s) => s.tempi[0] !== null).length} percorsi su ${this.nRound} · ${this.tocchiTot[0]} tocchi`;
  }

  vistaTick() {
    const ora = Date.now();
    return {
      fase: this.fase, round: this.round, pausa: this.inPausa,
      via: this.fase === 'via' ? Math.max(0, this.inizio - ora) : 0,
      t: this.fase === 'corsa' ? ora - this.inizio : 0,
      resta: this.fase === 'corsa' ? Math.max(0, this.fineFase - ora) : 0,
      primo: this.primoArrivo !== null,
      g: this.g.map((x) => ({ s: x.stato, p: Math.round(x.prog * 1000) / 1000, pos: x.pos, k: x.tocchi, t: x.tempo })),
    };
  }

  vista(p) {
    const largo = p != null && this.largo(p);
    return {
      ...(largo ? { largo: LARGO } : {}), // solo per chi ha il trucco: il suo browser è più tollerante sui bordi
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      livello: this.livello, nomeLivello: NOMI[this.livello], nRound: this.nRound, W, H, R: R_PARTENZA,
      w: PARAM[this.livello].w, pulsa: !!PARAM[this.livello].pulsa,
      percorso: this.fase === 'via' || this.fase === 'corsa' || this.fase === 'pausa' || this.finita ? this.percorso.pts : null, famiglia: this.percorso.famiglia,
      punti: this.punti, tempiTot: this.tempiTot, tocchiTot: this.tocchiTot, storico: this.storico, stato: this.vistaTick(), bot: this.bot.map(Boolean),
    };
  }
}

module.exports = {
  meta: {
    id: 'chirurgo',
    nome: 'Allegro chirurgo',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Trascina il mouse o il dito lungo il percorso senza toccare i bordi. Se tocchi, si ricomincia!',
    alias: ['chirurgo', 'operation', 'filo', 'mano ferma', 'percorso', 'labirinto', 'buzz wire'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: ['normale', 'facile', 'difficile', 'esperto', 'impossibile', 'estremo'], etichette: ['Normale', 'Facile', 'Difficile', 'Esperto', 'Impossibile', 'Impossibile estremo'], predefinito: 'normale' },
      { id: 'round', nome: 'Round', valori: ROUND, etichette: ['3 percorsi', '1 percorso', '5 percorsi'], predefinito: 3 },
    ],
    regole: [
      'A ogni round compare un percorso, lo stesso per tutti: un corridoio che va dalla partenza (il cerchio verde) all\'arrivo (la bandiera a scacchi).',
      'Premi sulla partenza e, tenendo premuto il mouse o il dito, trascina fino all\'arrivo senza toccare i bordi del corridoio.',
      'Se tocchi un bordo, esci dal corridoio o lasci andare il mouse o il dito, ricominci da zero: torna sulla partenza e riprova. Non c\'è limite ai tentativi.',
      'Si gioca tutti insieme: vedi i pallini degli altri che avanzano sul percorso. Il primo che arriva prende tanti punti quanti sono i giocatori, il secondo uno in meno, e così via; chi non arriva prende 0.',
      'Quando arriva il primo, gli altri hanno ancora 20 secondi. Un round dura al massimo 2 minuti e mezzo.',
      'I percorsi cambiano a ogni round e sono di tanti tipi: serpentone, labirinto (una strada a caso piena di curve ad angolo), spirale e zig-zag.',
      'Sei difficoltà: Facile (corridoio largo e percorso corto), Normale, Difficile, Esperto, Impossibile e Impossibile estremo, dove il corridoio è strettissimo, lunghissimo e si stringe e si allarga di continuo.',
      'Il cerchio del VIA e la bandiera sono zone sicure: lì dentro non si tocca nessun bordo.',
      'Dopo 3 round (o 1, o 5) vince chi ha più punti; a parità, chi ci ha messo meno tempo in totale. Da soli conta il tempo totale.',
      'Il gioco è in tempo reale: se qualcuno apre le dispense (Esc) si ferma per tutti; alla ripresa chi stava correndo riparte dalla partenza.',
      'Il computer facile va piano e tocca spesso, il medio è più sicuro, il difficile è veloce e ha la mano fermissima; nei percorsi più difficili rallentano e sbagliano di più anche loro.',
    ],
  },
  crea: (o) => new Chirurgo(o),
  bot: () => ({}),
  _test: { generaPercorso, vicino, larghezza, PARAM, LIVELLI, W, H, FAMIGLIE },
};
