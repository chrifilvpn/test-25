// PUTT PARTY 2D: minigolf in tempo reale, tutti insieme. Sei course (Classica, Spiaggia dei pirati, Ghiaccio, Tempio
// nella giungla, Spazio, Open Course): di ogni course si giocano 6 buche estratte a caso; nella lobby si sceglie quante
// course in fila (1, 3, 5 o tutte e 6). Le buche sono più grandi dello schermo: la telecamera segue la pallina.
// Fisica: attrito "vero" (un po' costante, un po' proporzionale alla velocità: la pallina scorre a lungo e si ferma
// piano), buca controllata a ogni piccolo passo (non si "salta" più), respingenti che danno una spinta decisa,
// terreni (sabbia, neve, fango, ghiaccio), acqua e buchi neri, rampe per saltare, tubi, cerchi che si muovono.
// Power-up: scatole sul percorso (una per giocatore per scatola); se ne tengono al massimo 3.
const B = require('./putt-buche');
const { R_PALLA, R_BUCA, R_TUBO, R_SCATOLA, COURSE, NOMI_COURSE, BUCHE_PER_COURSE, segmentiFissi, segmentiBassi, segmentiMobili, mobiliAl, dentro, dentroPoligono } = B;
const T = require('./trucco');

const V_MAX = 1500; // px/s del tiro più forte
const ATTRITO_C = 40, ATTRITO_K = 0.45; // decelerazione = ATTRITO_C + ATTRITO_K * velocità (px/s²)
const TERRENO = { sabbia: 5, neve: 2.6, fango: 8, ghiaccio: 0.22 }; // quanto rallenta ogni terreno (1 = erba)
const V_STOP = 5, V_BUCA = 420; // sotto V_BUCA la pallina sulla buca ci cade
const RIMBALZO = 0.72, SPINTA_RESP = 1.3, V_MIN_RESP = 720; // i respingenti rilanciano almeno a 720 px/s
const TEMPO_BUCA = 180000, PENALITA_TEMPO = 3, PAUSA_FINE_BUCA = 4500, VIA_MS = 2500;
const COLORI = ['#ffffff', '#ffd23f', '#ff6b6b', '#5fd3ff', '#9dff7a', '#ff9ff3', '#c49bff', '#ffa94d'];
const POTERI = ['turbo', 'calamita', 'rifai', 'nebbia', 'mira', 'terremoto'];
const MAX_POTERI = 3, NEBBIA_S = 10;
const NOMI_POTERI = { turbo: 'Turbo', calamita: 'Calamita', rifai: 'Rifai', nebbia: 'Nebbia', mira: 'Mira nascosta', terremoto: 'Terremoto' };

function mescola(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// terreno sotto la pallina (il più "forte" vince)
function terreno(b, x, y) {
  for (const t of ['fango', 'sabbia', 'neve', 'ghiaccio']) if ((b[t] || []).some((r) => dentro(x, y, r))) return t;
  return null;
}

// muove una pallina di dt secondi, con piccoli passi per non attraversare i muri (e per non saltare la buca).
// Restituisce 'buca' se è entrata, 'acqua' se è finita in acqua o in un buco nero, altrimenti null.
function passo(b, p, dt, t, segs, bassi, cerchiMobili, opz = {}) {
  let v = Math.hypot(p.vx, p.vy);
  if (v <= 0) return null;
  const inAria = p.aria > 0;
  if (inAria) p.aria = Math.max(0, p.aria - dt);
  // attrito: costante + proporzionale alla velocità (in aria quasi niente)
  const ter = inAria ? null : terreno(b, p.x, p.y);
  const k = inAria ? 0.1 : ter ? TERRENO[ter] : 1;
  const nv = Math.max(0, v - (ATTRITO_C + ATTRITO_K * v) * k * dt);
  p.vx *= nv / v; p.vy *= nv / v; v = nv;
  // buchi neri: attirano verso il centro
  if (!inAria) for (const h of b.buchiNeri || []) {
    const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy);
    if (d < h.r && d > 1) { const a = h.f * (1 - d / h.r) * dt; p.vx += (dx / d) * a; p.vy += (dy / d) * a; }
  }
  // calamita: la buca attira la pallina quando ci passa vicino
  if (p.calamita && !inAria) {
    const dx = b.buca[0] - p.x, dy = b.buca[1] - p.y, d = Math.hypot(dx, dy);
    if (d < 120 && d > 1) { const a = 1100 * (1 - d / 120) * dt; p.vx += (dx / d) * a; p.vy += (dy / d) * a; }
  }
  v = Math.hypot(p.vx, p.vy);
  const n = Math.max(1, Math.ceil((v * dt) / 3));
  for (let s = 0; s < n; s++) {
    p.x += (p.vx * dt) / n; p.y += (p.vy * dt) / n;
    for (const sg of segs) collisioneSegmento(p, sg);
    if (!(p.aria > 0)) for (const sg of bassi) collisioneSegmento(p, sg);
    // gli ostacoli rotondi spostano la pallina: se la spinta la porterebbe oltre un muro (un ostacolo mobile che la
    // schiaccia contro il bordo), la pallina resta dov'era e cambia solo la velocità
    const px = p.x, py = p.y;
    for (const [cx, cy, r] of b.respingenti || []) urtoCerchio(p, cx, cy, r, true);
    for (const [cx, cy, r] of b.rocce || []) urtoCerchio(p, cx, cy, r, false);
    for (const [cx, cy, r] of cerchiMobili) urtoCerchio(p, cx, cy, r, false);
    if ((p.x !== px || p.y !== py) && segs.some((sg) => siTaglia(px, py, p.x, p.y, sg))) { p.x = px; p.y = py; }
    if (p.aria > 0) continue;
    // rampa: se ci passa abbastanza veloce nella sua direzione, salta
    for (const r of b.rampe || []) {
      if (!dentro(p.x, p.y, r.r)) continue;
      const lungo = p.vx * Math.cos(r.a) + p.vy * Math.sin(r.a);
      if (lungo > 250) { p.aria = Math.max(0.4, Math.min(1, lungo / 1000)); p.salto = true; break; }
    }
    if (p.aria > 0) continue;
    // tubi: entri da una parte ed esci dall'altra con la stessa velocità
    if (!(p.tubo > t)) for (const tu of b.tubi || []) {
      if (Math.hypot(p.x - tu.a[0], p.y - tu.a[1]) < R_TUBO) { const vv = Math.hypot(p.vx, p.vy) || 1; p.x = tu.b[0] + (p.vx / vv) * (R_TUBO + 6); p.y = tu.b[1] + (p.vy / vv) * (R_TUBO + 6); p.tubo = t + 0.5; p.passaTubo = true; break; }
    }
    // la buca: controllata a ogni piccolo passo; con poca velocità entra anche "di labbro"
    const vv = Math.hypot(p.vx, p.vy), d = Math.hypot(p.x - b.buca[0], p.y - b.buca[1]), vb = V_BUCA * (p.calamita ? 1.6 : 1);
    if ((d < R_BUCA && vv < vb) || (d < R_BUCA + R_PALLA * 0.6 && vv < vb * 0.45)) return 'buca';
    if ((b.acqua || []).some((r) => dentro(p.x, p.y, r))) return 'acqua';
    for (const h of b.buchiNeri || []) if (Math.hypot(p.x - h.x, p.y - h.y) < 16) return 'acqua';
  }
  // vicino alla buca e lenta: la pendenza la tira dentro (come nel minigolf vero)
  if (!(p.aria > 0)) {
    const dx = b.buca[0] - p.x, dy = b.buca[1] - p.y, d = Math.hypot(dx, dy);
    if (d < 28 && d > 1 && v < 160) { p.vx += (dx / d) * 260 * dt; p.vy += (dy / d) * 260 * dt; }
  }
  return null;
}
function urtoCerchio(p, cx, cy, r, respingente) {
  const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
  if (d >= r + R_PALLA || d <= 0) return;
  const nx = dx / d, ny = dy / d;
  p.x = cx + nx * (r + R_PALLA); p.y = cy + ny * (r + R_PALLA);
  const vn = p.vx * nx + p.vy * ny;
  if (vn >= 0) return;
  p.vx -= (1 + RIMBALZO) * vn * nx; p.vy -= (1 + RIMBALZO) * vn * ny; p.urto = true;
  if (respingente) {
    // spinta decisa: la pallina riparte più veloce di prima, e almeno a V_MIN_RESP
    const v = Math.hypot(p.vx, p.vy) || 1, nuova = Math.max(v * SPINTA_RESP, V_MIN_RESP);
    p.vx = (p.vx / v) * nuova; p.vy = (p.vy / v) * nuova; p.respinta = true;
  }
}
// il tratto (ax,ay)-(bx,by) attraversa il muro?
function siTaglia(ax, ay, bx, by, [x1, y1, x2, y2]) {
  const d = (bx - ax) * (y2 - y1) - (by - ay) * (x2 - x1);
  if (!d) return false;
  const t = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / d, u = ((x1 - ax) * (by - ay) - (y1 - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function collisioneSegmento(p, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / l2));
  const cx = x1 + u * dx, cy = y1 + u * dy;
  const ex = p.x - cx, ey = p.y - cy, d = Math.hypot(ex, ey);
  if (d >= R_PALLA) return;
  let nx, ny;
  if (d > 1e-6) { nx = ex / d; ny = ey / d; } else { const l = Math.sqrt(l2); nx = -dy / l; ny = dx / l; }
  p.x = cx + nx * R_PALLA; p.y = cy + ny * R_PALLA;
  const vn = p.vx * nx + p.vy * ny;
  if (vn < 0) { p.vx -= (1 + RIMBALZO) * vn * nx; p.vy -= (1 + RIMBALZO) * vn * ny; p.urto = true; }
}

// IL TRUCCO SEGRETO (!win): il prossimo tiro va in buca. Al momento del tiro si cerca una strada libera dalla pallina
// alla buca (griglia da 12 px, visita in ampiezza, poi tratti dritti dove si vede); la pallina la segue rallentando.
const CELLA_G = 12;
function percorsoGuidato(b, x0, y0, segs, salta = false) {
  const xs = b.bordo.map((q) => q[0]), ys = b.bordo.map((q) => q[1]);
  const ox = Math.min(...xs), oy = Math.min(...ys);
  const cols = Math.ceil((Math.max(...xs) - ox) / CELLA_G) + 1, righe = Math.ceil((Math.max(...ys) - oy) / CELLA_G) + 1;
  const m = R_PALLA + 3;
  const vicinoSeg = (x, y, [x1, y1, x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2)); return Math.hypot(x - x1 - u * dx, y - y1 - u * dy) < m; };
  const cerchi = [...(b.respingenti || []), ...(b.rocce || [])];
  const libero = new Uint8Array(cols * righe);
  for (let r = 0; r < righe; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * CELLA_G, y = oy + r * CELLA_G;
    if (!dentroPoligono(x, y, b.bordo) || segs.some((sg) => vicinoSeg(x, y, sg))) continue;
    if (!salta && (b.acqua || []).some((q) => dentro(x, y, [q[0] - m, q[1] - m, q[2] + 2 * m, q[3] + 2 * m]))) continue;
    if (cerchi.some(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) < rr + m)) continue;
    if (!salta && (b.buchiNeri || []).some((h) => Math.hypot(x - h.x, y - h.y) < h.r * 0.6)) continue;
    if ((b.tubi || []).some((tu) => Math.hypot(x - tu.a[0], y - tu.a[1]) < R_TUBO + m)) continue;
    libero[r * cols + c] = 1;
  }
  const cella = (x, y) => [Math.max(0, Math.min(cols - 1, Math.round((x - ox) / CELLA_G))), Math.max(0, Math.min(righe - 1, Math.round((y - oy) / CELLA_G)))];
  const [c0, r0] = cella(x0, y0), [c1, r1] = cella(b.buca[0], b.buca[1]);
  const inizio = r0 * cols + c0, meta = r1 * cols + c1;
  libero[inizio] = 1; libero[meta] = 1;
  const prec = new Int32Array(cols * righe).fill(-1); prec[inizio] = inizio;
  const coda = [inizio];
  for (let q = 0; q < coda.length && prec[meta] < 0; q++) {
    const k = coda[q], c = k % cols, r = (k - c) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr, j = nr * cols + nc;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= righe || !libero[j] || prec[j] >= 0) continue;
      if (dc && dr && (!libero[r * cols + nc] || !libero[nr * cols + c])) continue; // niente angoli tagliati
      prec[j] = k; coda.push(j);
    }
  }
  if (prec[meta] < 0) return null;
  const celle = [];
  for (let k = meta; ; k = prec[k]) { celle.push(k); if (k === inizio) break; }
  celle.reverse();
  const pt = (k) => [ox + (k % cols) * CELLA_G, oy + Math.floor(k / cols) * CELLA_G];
  const pieni = [[x0, y0], ...celle.slice(1, -1).map(pt), [b.buca[0], b.buca[1]]];
  // tratti dritti: si salta ai punti che si vedono senza passare da caselle occupate
  const vede = ([ax, ay], [bx, by]) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 5); for (let i = 1; i < n; i++) { const [c, r] = cella(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n); if (!libero[r * cols + c]) return false; } return true; };
  const punti = [pieni[0]];
  for (let i = 0; i < pieni.length - 1;) {
    let j = pieni.length - 1;
    while (j > i + 1 && !vede(pieni[i], pieni[j])) j--;
    punti.push(pieni[j]); i = j;
  }
  return { punti, k: 1 };
}

class Putt {
  constructor({ n, opzioni = {} }) {
    this.id = 'putt';
    this.n = n;
    // quante course e quali: la prima (se scelta) e poi le altre a caso, senza ripetere
    const quante = [1, 3, 5, 6].includes(Number(opzioni.course)) ? Number(opzioni.course) : 1;
    const prima = COURSE[opzioni.prima] ? opzioni.prima : null;
    const altre = mescola(NOMI_COURSE.filter((c) => c !== prima));
    this.course = (prima ? [prima, ...altre] : altre).slice(0, quante);
    // le buche: 6 a caso per ogni course (l'Open Course le ha sempre tutte e 6, in ordine)
    this.ordine = [];
    for (const c of this.course) {
      const lista = COURSE[c].buche.map((_, i) => i);
      const scelte = COURSE[c].fisse ? lista : mescola(lista).slice(0, BUCHE_PER_COURSE);
      for (const i of scelte) this.ordine.push([c, i]);
    }
    this.k = -1;
    this.colpi = Array.from({ length: n }, () => []); // colpi per buca
    this.usciti = new Array(n).fill(false);
    this.poteri = Array.from({ length: n }, () => []); // i power-up che ognuno ha in tasca (al massimo 3)
    this.tickMs = 33;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
    this.prossimaBuca(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attesi() { return []; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) { const d = Date.now() - this.pausaDal; this.inizio += d; this.fineFase += d; this.ultimoTick = null; }
    this.inPausa = si;
  }

  get buca() { const [c, i] = this.ordine[this.k]; return COURSE[c].buche[i]; }

  prossimaBuca(ora) {
    this.k++;
    if (this.k >= this.ordine.length) return this.chiudi();
    const b = this.buca;
    this.fissi = segmentiFissi(b); this.bassi = segmentiBassi(b);
    this.fase = 'via';
    this.inizio = ora + VIA_MS; // il tempo degli ostacoli e della buca parte da qui
    this.fineFase = this.inizio + TEMPO_BUCA;
    this.ultimoTick = null;
    const prima = this.palle || [];
    this.palle = Array.from({ length: this.n }, (_, i) => ({ x: b.partenza[0], y: b.partenza[1], vx: 0, vy: 0, dentro: false, colpi: 0, da: [...b.partenza], tempo: null,
      aria: 0, tubo: 0, prese: [], turbo: false, calamita: false, cieco: false, nebbia: 0, rifai: null, colpoBuono: !!(prima[i] && prima[i].colpoBuono) }));
    this.usciti.forEach((u, i) => { if (u) this.palle[i].dentro = true; });
  }

  // il tiro: { t: 'tiro', a: angolo in radianti, f: forza da 0 a 1 }; un power-up: { t: 'usa', i: posizione in tasca }
  input(p, d) {
    if (this.finita || this.inPausa || this.fase !== 'buca' || !d) return;
    const x = this.palle[p];
    if (!x || x.dentro) return;
    if (d.t === 'usa') return this.usa(p, Number(d.i));
    if (d.t !== 'tiro' || Math.hypot(x.vx, x.vy) > 0) return;
    const f = Math.max(0.02, Math.min(1, Number(d.f) || 0)), a = Number(d.a);
    if (!Number.isFinite(a)) return;
    x.da = [x.x, x.y]; x.rifai = { x: x.x, y: x.y }; // da qui si torna con l'acqua (e con Rifai)
    const v = f * V_MAX * (x.turbo ? 1.6 : 1);
    x.calamita = x.calamitaPronta || false; x.calamitaPronta = false;
    x.turbo = false; x.cieco = false;
    x.vx = Math.cos(a) * v; x.vy = Math.sin(a) * v;
    x.colpi++;
    // il trucco segreto: questo tiro segue la strada fino alla buca
    if (x.colpoBuono) {
      x.colpoBuono = false;
      // prima per terra; se non si può (acqua o muretti da saltare) si passa anche sopra, come con una rampa
      x.guida = percorsoGuidato(this.buca, x.x, x.y, this.fissi.concat(this.bassi)) || percorsoGuidato(this.buca, x.x, x.y, this.fissi, true);
      if (x.guida) x.guida.v = Math.max(650, v);
      else x.calamita = true;
    }
    this.cambiato = true;
  }

  // la pallina del trucco segreto avanza lungo la sua strada, rallentando verso la buca
  guidata(x, dt) {
    const g = x.guida;
    let resto = g.v * dt;
    g.v = Math.max(170, g.v - (ATTRITO_C + ATTRITO_K * g.v) * dt * 0.8);
    while (resto > 0 && g.k < g.punti.length) {
      const [tx, ty] = g.punti[g.k], d = Math.hypot(tx - x.x, ty - x.y);
      if (d <= resto) { x.x = tx; x.y = ty; resto -= d; g.k++; continue; }
      x.vx = ((tx - x.x) / d) * g.v; x.vy = ((ty - x.y) / d) * g.v;
      x.x += ((tx - x.x) / d) * resto; x.y += ((ty - x.y) / d) * resto; resto = 0;
    }
    if (g.k >= g.punti.length) { x.guida = null; return 'buca'; }
    return null;
  }
  // il trucco segreto (!win): appena può tirare gli si dice che il prossimo tiro entra, e così sarà
  suggerimentoWin(p) {
    const x = this.palle && this.palle[p];
    if (this.finita || this.inPausa || this.fase !== 'buca' || !x || x.dentro || this.usciti[p] || x.vx || x.vy) return null;
    x.colpoBuono = true;
    return '⛳ Il tuo prossimo tiro va in buca: tira dove vuoi';
  }

  usa(p, i) {
    const tasca = this.poteri[p], x = this.palle[p];
    if (!Number.isInteger(i) || i < 0 || i >= tasca.length) return;
    const tipo = tasca[i], ferma = !(x.vx || x.vy);
    if (tipo === 'rifai' && (!ferma || !x.rifai || x.colpi < 1)) return;
    if ((tipo === 'turbo' || tipo === 'calamita') && !ferma) return;
    tasca.splice(i, 1);
    const t = (Date.now() - this.inizio) / 1000;
    if (tipo === 'turbo') x.turbo = true;
    else if (tipo === 'calamita') x.calamitaPronta = true;
    else if (tipo === 'rifai') { x.x = x.rifai.x; x.y = x.rifai.y; x.colpi--; x.rifai = null; }
    else for (let q = 0; q < this.n; q++) {
      const y = this.palle[q];
      if (q === p || y.dentro || this.usciti[q]) continue;
      if (tipo === 'nebbia') y.nebbia = t + NEBBIA_S;
      else if (tipo === 'mira') y.cieco = true;
      else if (tipo === 'terremoto' && !(y.vx || y.vy)) { const a = Math.random() * Math.PI * 2, v = 260 + Math.random() * 120; y.vx = Math.cos(a) * v; y.vy = Math.sin(a) * v; y.da = [y.x, y.y]; }
    }
    const nomi = { turbo: 'usa il Turbo 🚀', calamita: 'usa la Calamita 🧲', rifai: 'usa Rifai ⏪', nebbia: 'manda la Nebbia sugli altri 🌫️', mira: 'nasconde la mira agli altri 🙈', terremoto: 'fa tremare le palline degli altri 🌋' };
    this.annuncia(p, nomi[tipo], nomi[tipo].replace(/^usa /, 'hai usato ').replace(/^manda /, 'hai mandato ').replace(/^nasconde /, 'hai nascosto ').replace(/^fa tremare/, 'hai fatto tremare'));
    this.cambiato = true;
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    this.cambiato = false;
    if (this.fase === 'via') { if (ora >= this.inizio) { this.fase = 'buca'; this.ultimoTick = ora; return true; } return false; }
    if (this.fase === 'fineBuca') { if (ora >= this.fineFase) { this.prossimaBuca(ora); return true; } return false; }
    const dt = Math.min(0.08, (ora - (this.ultimoTick || ora)) / 1000);
    this.ultimoTick = ora;
    const b = this.buca, t = (ora - this.inizio) / 1000;
    const segs = this.fissi.concat(segmentiMobili(b, t)), cerchi = mobiliAl(b, t);
    this.palle.forEach((x, p) => {
      if (x.dentro) return;
      // le scatole dei power-up: ognuno può prendere ogni scatola una volta
      (b.pu || []).forEach(([sx, sy], k) => {
        if (x.prese.includes(k) || x.aria > 0 || Math.hypot(x.x - sx, x.y - sy) > R_SCATOLA + R_PALLA) return;
        x.prese.push(k);
        if (this.poteri[p].length >= MAX_POTERI) { this.annuncia(p, 'ha già 3 power-up in tasca', 'hai già 3 power-up: questa scatola è sprecata', false); return; }
        const tipo = POTERI[Math.floor(Math.random() * POTERI.length)];
        this.poteri[p].push(tipo); this.cambiato = true;
        this.annuncia(p, `prende un power-up 🎁`, `hai preso: ${NOMI_POTERI[tipo]} 🎁`);
      });
      if (x.vx || x.vy) {
        const r = x.guida ? this.guidata(x, dt) : passo(b, x, dt, t, segs, this.bassi, cerchi);
        if (r === 'acqua') {
          // acqua (o buco nero): la pallina torna dove era stata tirata, con un colpo di penalità
          x.x = x.da[0]; x.y = x.da[1]; x.vx = 0; x.vy = 0; x.aria = 0; x.colpi++; x.calamita = false;
          this.annuncia(p, (b.buchiNeri || []).length ? 'finisce nel vuoto! 🌀 +1' : 'finisce in acqua! 💦 +1', 'un colpo di penalità: si torna indietro');
          this.cambiato = true;
          return;
        }
        if (r === 'buca') {
          x.dentro = true; x.vx = 0; x.vy = 0; x.x = b.buca[0]; x.y = b.buca[1]; x.calamita = false; x.guida = null;
          x.tempo = ora - this.inizio;
          const par = b.par, c = x.colpi;
          const nome = c === 1 ? 'BUCA IN UNO! ⛳🎉' : c <= par - 2 ? 'Eagle! 🦅' : c === par - 1 ? 'Birdie! 🐦' : c === par ? 'Par 👍' : `${c} colpi`;
          this.annuncia(p, `in buca: ${nome}`, `in buca: ${nome}`, c === 1);
          this.cambiato = true;
        } else if (Math.hypot(x.vx, x.vy) < V_STOP && !(x.aria > 0)) { x.vx = 0; x.vy = 0; x.calamita = false; this.cambiato = true; }
      } else {
        // un ostacolo che si muove può spingere una pallina ferma
        const prima = [x.x, x.y];
        for (const s of segs) collisioneSegmento(x, s);
        for (const [cx, cy, r] of cerchi) urtoCerchio(x, cx, cy, r, false);
        if (x.x !== prima[0] || x.y !== prima[1]) { const vv = Math.hypot(x.vx, x.vy); if (vv < 40) { x.vx = 0; x.vy = 0; } }
        else { x.vx = 0; x.vy = 0; }
      }
    });
    if (this.palle.every((x) => x.dentro) || ora >= this.fineFase) this.fineBuca(ora);
    return this.cambiato;
  }

  fineBuca(ora) {
    this.palle.forEach((x, p) => {
      if (this.usciti[p] && !x.colpi) { this.colpi[p].push(null); return; }
      this.colpi[p].push(x.dentro ? x.colpi : x.colpi + PENALITA_TEMPO);
    });
    if (ora >= this.fineFase) this.annuncia(null, `⏰ Tempo scaduto: chi non è in buca prende ${PENALITA_TEMPO} colpi in più`, '');
    this.fase = 'fineBuca';
    this.fineFase = ora + PAUSA_FINE_BUCA;
    this.cambiato = true;
  }

  totale(p) { return this.colpi[p].reduce((s, x) => s + (x || 0), 0); }
  esce(p) { this.usciti[p] = true; if (this.palle[p]) { this.palle[p].dentro = true; } if (this.usciti.every(Boolean)) this.chiudi(); }
  rientra(p) { this.usciti[p] = false; }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    const tot = Array.from({ length: this.n }, (_, i) => this.totale(i));
    const validi = tot.map((x, i) => (this.usciti[i] ? Infinity : x));
    const min = Math.min(...validi);
    const v = validi.map((x, i) => (x === min ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: tot.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'colpi', crescente: true, pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
  }

  vistaTick() {
    const ora = Date.now();
    const rif = this.inPausa ? this.pausaDal : ora;
    const t = (rif - this.inizio) / 1000;
    return {
      fase: this.fase, k: this.k, pausa: this.inPausa, t,
      via: this.fase === 'via' ? Math.max(0, this.inizio - rif) : 0,
      resta: this.fase === 'buca' ? Math.max(0, this.fineFase - rif) : 0,
      palle: (this.palle || []).map((x) => ({ x: Math.round(x.x * 10) / 10, y: Math.round(x.y * 10) / 10, m: !!(x.vx || x.vy), d: x.dentro, c: x.colpi,
        z: x.aria > 0 ? Math.round(x.aria * 100) / 100 : 0, pr: x.prese, tb: x.turbo ? 1 : 0, cm: x.calamitaPronta || x.calamita ? 1 : 0, ci: x.cieco ? 1 : 0, nb: x.nebbia > t ? Math.ceil(x.nebbia - t) : 0, rf: x.rifai && x.colpi > 0 ? 1 : 0 })),
      poteri: this.poteri,
    };
  }

  vista() {
    const cur = this.finita ? null : this.ordine[Math.min(this.k, this.ordine.length - 1)];
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      ordine: this.ordine, k: Math.min(this.k, this.ordine.length - 1), buca: cur, course: this.course,
      colpi: this.colpi, totali: Array.from({ length: this.n }, (_, i) => this.totale(i)), usciti: this.usciti,
      colori: COLORI, stato: this.vistaTick(), tempoBuca: TEMPO_BUCA, nomiPoteri: NOMI_POTERI,
    };
  }
}

module.exports = {
  meta: {
    id: 'putt',
    nome: 'Putt Party 2D',
    tipo: 'tabellone',
    soloPersone: true,
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Minigolf con sei course (Classica, Pirati, Ghiaccio, Giungla, Spazio e l\'Open Course): tutti tirano insieme, con i power-up. Vince chi fa meno colpi.',
    alias: ['putt party', 'minigolf', 'golf', 'mini golf', 'putt'],
    opzioni: [
      { id: 'course', nome: 'Course da giocare', valori: [1, 3, 5, 6], etichette: ['1 course (6 buche)', '3 course (18 buche)', '5 course (30 buche)', 'Tutte e 6 (36 buche)'], predefinito: 1 },
      { id: 'prima', nome: 'Course', valori: ['casuale', 'classica', 'pirati', 'ghiaccio', 'giungla', 'spazio', 'open'], etichette: ['A caso', 'Classica', 'Spiaggia dei pirati', 'Ghiaccio', 'Tempio nella giungla', 'Spazio', 'Open Course'], predefinito: 'casuale' },
    ],
    regole: [
      'Minigolf da soli o tra amici (niente computer). Ci sono sei course, ognuna col suo tema: Classica (le buche di sempre), Spiaggia dei pirati (acqua, palme, relitti, passerelle per saltare), Ghiaccio (piste che scivolano, neve che frena, pinguini che si muovono), Tempio nella giungla (sabbie mobili, statue, tronchi che girano, il fiume da saltare), Spazio (asteroidi in movimento, buchi neri che attirano la pallina, portali) e l\'Open Course (vedi sotto).',
      'Nella lobby si sceglie quante course giocare di fila (1, 3, 5 o tutte e 6) e, se si vuole, con quale cominciare. Ogni course ha più di 6 buche disegnate: a ogni partita se ne giocano 6 estratte a caso.',
      'Open Course: una mappa unica e grande, una corsia a serpentina con 6 buche in fila (si parte dove era la buca prima). Ci sono rampe per saltare l\'acqua e i muretti, tubi che passano sotto le altre corsie e ti portano alla fila dopo (attenzione: lontano dalla buca giusta), respingenti, mulini e ostacoli che si muovono.',
      'Si gioca tutti insieme: ognuno ha la sua pallina e tira quando vuole, senza aspettare gli altri. Le palline non si toccano tra loro; quelle degli altri le vedi un po\' trasparenti.',
      'Le buche sono più grandi dello schermo: la telecamera segue la tua pallina e, mentre miri, guarda un po\' nella direzione del tiro. In un angolo c\'è la minimappa con tutta la buca, le palline e la bandierina.',
      'Per tirare: premi sul campo (con il mouse o col dito) e trascina all\'indietro, come una fionda. La freccia mostra direzione e forza; lascia andare per tirare. Si può tirare solo quando la propria pallina è ferma. La pallina scorre a lungo e rallenta piano, come su un vero green.',
      'La pallina rimbalza sui bordi e sui muri; i respingenti rotondi la rilanciano con una spinta decisa. Sabbia, neve e fango la rallentano, il ghiaccio la fa scivolare. Se finisce in acqua (o nel centro di un buco nero) torna dove l\'avevi tirata, con un colpo di penalità. Sulle rampe, se ci passa abbastanza veloce, salta sopra acqua, sabbia e muretti.',
      'La pallina entra se passa sulla buca non troppo veloce (anche sfiorandola piano); se è troppo forte ci passa sopra. Vicino alla buca, se è lenta, la pendenza la aiuta a entrare.',
      'Power-up: sul percorso ci sono delle scatole 🎁; passandoci sopra prendi un power-up (ogni scatola una volta a testa). Se ne tengono al massimo 3 e si usano con i pulsanti sotto il campo (o i tasti 1, 2, 3). Per te: 🚀 Turbo (il prossimo tiro è più forte del 60%), 🧲 Calamita (nel prossimo tiro la buca attira la pallina quando passa vicino), ⏪ Rifai (annulla il tuo ultimo tiro: la pallina torna dov\'era e il colpo non conta). Contro gli altri: 🌫️ Nebbia (per 10 secondi vedono solo intorno alla loro pallina), 🙈 Mira nascosta (al loro prossimo tiro non vedono la freccia), 🌋 Terremoto (le loro palline ferme si spostano un po\' a caso).',
      'Non c\'è limite di colpi. Ogni buca dura al massimo 3 minuti: chi allo scadere non è in buca prende i colpi fatti più 3 di penalità. Quando sono tutti in buca si passa alla prossima.',
      'Alla fine vince chi ha fatto meno colpi in totale; a parità è pareggio. Accanto a ogni buca c\'è il par (i colpi che servono a un buon giocatore): un colpo in meno è un birdie, due un eagle.',
      'Il gioco è in tempo reale e si ferma per tutti quando qualcuno apre le dispense.',
    ],
  },
  crea: (o) => new Putt(o),
  bot: () => ({}),
  _test: { Putt, passo, collisioneSegmento, urtoCerchio, B, V_MAX, V_BUCA, POTERI, MAX_POTERI },
};
