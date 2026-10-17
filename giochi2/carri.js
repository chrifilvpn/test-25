// CARRI ARMATI NEL LABIRINTO: vista dall'alto, un labirinto nuovo a ogni round. Ogni carro ha il cingolato (si
// muove verso la direzione dei tasti o del joystick: prima gira, poi parte) e la torretta che mira dove punta il mouse
// (sul telefono dove si tocca il campo, o nella direzione in cui si va). I proiettili rimbalzano sui muri e durano
// qualche secondo: si colpisce anche di sponda, e si può colpire se stessi. Un colpo e il carro salta.
// Punti: 1 per ogni carro colpito, 1 in più a chi resta l'ultimo. Casse: tripla, scudo, turbo.
// Il computer calcola i tiri di sponda (simula i rimbalzi), schiva i proiettili in arrivo e trova la strada nel labirinto.
const { Arena } = require('../giochi/arena');

const S = 80; // lato di una cella del labirinto
const SPESSORE = 8; // spessore dei muri
const R = 16; // raggio del carro
const RP = 4; // raggio del proiettile
const V_CARRO = 135, V_GIRO = 4.2; // pixel/s e radianti/s del cingolato
const V_PROIETTILE = 300, VITA_PROIETTILE = 7, MAX_PROIETTILI = 5, RICARICA = 0.28;
const PIU_TARDI = 2; // secondi dopo che resta un solo carro: i proiettili in volo possono ancora colpire
const DURATA_MAX = 120; // poi il round finisce senza vincitore
const CASSE = ['tripla', 'scudo', 'turbo'];
const DIMENSIONI = (n) => (n <= 3 ? [9, 6] : n <= 5 ? [11, 7] : [13, 8]);
const LIV = {
  facile: { ogni: 0.32, rimbalzi: 0, giro: 3, schiva: 0.15, rumore: 0.09, orizzonte: 0.35 },
  medio: { ogni: 0.16, rimbalzi: 1, giro: 6, schiva: 0.6, rumore: 0.035, orizzonte: 0.6 },
  difficile: { ogni: 0.07, rimbalzi: 3, giro: 12, schiva: 1, rumore: 0.006, orizzonte: 0.9 },
};

const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const ruota = (da, a, max) => { const d = angolo(a - da); return Math.abs(d) <= max ? a : da + Math.sign(d) * max; };

// ---------------- il labirinto ----------------
// h[r][c] = muro sopra la cella (r, c) (r da 0 a righe), v[r][c] = muro a sinistra della cella (c da 0 a colonne)
function labirinto(C, Rr) {
  const h = Array.from({ length: Rr + 1 }, () => new Array(C).fill(1));
  const v = Array.from({ length: Rr }, () => new Array(C + 1).fill(1));
  const vis = Array.from({ length: Rr }, () => new Array(C).fill(false));
  const pila = [[Math.floor(Math.random() * Rr), Math.floor(Math.random() * C)]];
  vis[pila[0][0]][pila[0][1]] = true;
  while (pila.length) {
    const [r, c] = pila[pila.length - 1];
    const vicini = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < Rr && b < C && !vis[a][b]);
    if (!vicini.length) { pila.pop(); continue; }
    const [a, b] = vicini[Math.floor(Math.random() * vicini.length)];
    if (a < r) h[r][c] = 0; else if (a > r) h[a][c] = 0; else if (b < c) v[r][c] = 0; else v[r][b] = 0;
    vis[a][b] = true; pila.push([a, b]);
  }
  // si tolgono altri muri interni: così ci sono più strade (e più tiri di sponda)
  for (let r = 1; r < Rr; r++) for (let c = 0; c < C; c++) if (h[r][c] && Math.random() < 0.3) h[r][c] = 0;
  for (let r = 0; r < Rr; r++) for (let c = 1; c < C; c++) if (v[r][c] && Math.random() < 0.3) v[r][c] = 0;
  return { h, v };
}
// i muri come rettangoli, e per ogni cella quelli vicini (per controllare solo quelli)
function rettangoli(L, C, Rr) {
  const t = SPESSORE / 2, muri = [];
  for (let r = 0; r <= Rr; r++) for (let c = 0; c < C; c++) if (L.h[r][c]) muri.push([c * S - t, r * S - t, (c + 1) * S + t, r * S + t]);
  for (let r = 0; r < Rr; r++) for (let c = 0; c <= C; c++) if (L.v[r][c]) muri.push([c * S - t, r * S - t, c * S + t, (r + 1) * S + t]);
  const vicino = Array.from({ length: Rr * C }, () => []);
  muri.forEach((m, i) => {
    const c0 = Math.max(0, Math.floor(m[0] / S) - 1), c1 = Math.min(C - 1, Math.floor(m[2] / S) + 1);
    const r0 = Math.max(0, Math.floor(m[1] / S) - 1), r1 = Math.min(Rr - 1, Math.floor(m[3] / S) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) vicino[r * C + c].push(i);
  });
  return { muri, vicino };
}
// il labirinto in poche lettere (per il browser): un bit per muro interno, in base 36 a pezzi
function codifica(L, C, Rr) {
  const bit = [];
  for (let r = 1; r < Rr; r++) for (let c = 0; c < C; c++) bit.push(L.h[r][c]);
  for (let r = 0; r < Rr; r++) for (let c = 1; c < C; c++) bit.push(L.v[r][c]);
  let s = '';
  for (let i = 0; i < bit.length; i += 4) s += (bit[i] * 8 + (bit[i + 1] || 0) * 4 + (bit[i + 2] || 0) * 2 + (bit[i + 3] || 0)).toString(16);
  return s;
}

class Carri extends Arena {
  constructor(o) {
    super(o, { id: 'carri', round: 7, tickMs: 33 });
    const op = o.opzioni || {};
    this.nRound = [7, 5, 10].includes(Number(op.round)) ? Number(op.round) : 7;
    this.conCasse = op.casse !== 'no';
    [this.C, this.Rr] = DIMENSIONI(this.n);
    this.W = this.C * S; this.H = this.Rr * S;
    this.etichettaPunti = 'punti';
    this.avvia();
  }

  // ---------- il round: labirinto nuovo, carri lontani tra loro ----------
  iniziaRound() {
    const C = this.C, Rr = this.Rr;
    this.L = labirinto(C, Rr);
    ({ muri: this.muri, vicino: this.vicino } = rettangoli(this.L, C, Rr));
    this.codice = codifica(this.L, C, Rr);
    // celle di partenza: la prima a caso, poi sempre la più lontana da quelle già scelte
    const celle = [];
    for (let k = 0; k < this.n; k++) {
      let meglio = null, dm = -1;
      for (let r = 0; r < Rr; r++) for (let c = 0; c < C; c++) {
        if (celle.some((x) => x[0] === r && x[1] === c)) continue;
        const d = celle.length ? Math.min(...celle.map(([a, b]) => Math.abs(a - r) + Math.abs(b - c))) + Math.random() * 0.5 : Math.random();
        if (d > dm) { dm = d; meglio = [r, c]; }
      }
      celle.push(meglio);
    }
    this.c = celle.map(([r, c], i) => {
      const a = Math.atan2(this.H / 2 - (r + 0.5) * S, this.W / 2 - (c + 0.5) * S);
      const giusto = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      return { id: i, x: (c + 0.5) * S, y: (r + 0.5) * S, a: giusto, t: giusto, vivo: true, ricarica: 0, scudo: 0, tripla: 0, turbo: 0, uccisioni: 0, da: null };
    });
    this.p = []; this.nP = 0;
    this.casse = []; this.nC = 0; this.prossimaCassa = 6 + Math.random() * 4;
    this.fineDopo = null;
    this.botti = []; this.nB = this.nB || Math.floor(Date.now() / 10) % 1e9; // esplosioni e spari da far vedere: numerati (vedi statoTick), il numero cresce anche da una partita all'altra
    this.mente = {};
    this.cambiato = true;
  }

  botto(x) { this.botti.push([++this.nB, ...x, this.tempoRound]); }

  // ---------- fisica ----------
  cella(x, y) { const c = Math.min(this.C - 1, Math.max(0, Math.floor(x / S))), r = Math.min(this.Rr - 1, Math.max(0, Math.floor(y / S))); return r * this.C + c; }
  // il carro (un cerchio) non entra nei muri: si spinge fuori lungo il lato più vicino
  spingiFuori(e) {
    for (let giro = 0; giro < 2; giro++) for (const i of this.vicino[this.cella(e.x, e.y)]) {
      const m = this.muri[i];
      const qx = Math.max(m[0], Math.min(e.x, m[2])), qy = Math.max(m[1], Math.min(e.y, m[3]));
      const dx = e.x - qx, dy = e.y - qy, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > 1e-6) { e.x = qx + (dx / d) * R; e.y = qy + (dy / d) * R; }
      else { // il centro è dentro il muro: si esce dal lato più vicino
        const l = [e.x - m[0], m[2] - e.x, e.y - m[1], m[3] - e.y], k = l.indexOf(Math.min(...l));
        if (k === 0) e.x = m[0] - R; else if (k === 1) e.x = m[2] + R; else if (k === 2) e.y = m[1] - R; else e.y = m[3] + R;
      }
    }
    e.x = Math.max(R, Math.min(this.W - R, e.x)); e.y = Math.max(R, Math.min(this.H - R, e.y));
  }
  // un passo del proiettile: rimbalza sul lato del muro che ha attraversato
  muoviProiettile(b, dt, lungo = 5) {
    const passi = Math.max(1, Math.ceil((V_PROIETTILE * dt) / lungo));
    const h = dt / passi;
    for (let k = 0; k < passi; k++) {
      const px = b.x, py = b.y;
      b.x += b.vx * h; b.y += b.vy * h;
      for (const i of this.vicino[this.cella(b.x, b.y)]) {
        const m = this.muri[i];
        if (b.x + RP <= m[0] || b.x - RP >= m[2] || b.y + RP <= m[1] || b.y - RP >= m[3]) continue;
        const fuoriX = px + RP <= m[0] || px - RP >= m[2], fuoriY = py + RP <= m[1] || py - RP >= m[3];
        if (fuoriX || !fuoriY) b.vx = -b.vx;
        if (fuoriY || !fuoriX) b.vy = -b.vy;
        b.x = px; b.y = py; b.rimbalzi++;
        break;
      }
    }
  }
  spara(e, a, piccolo = false) {
    const x = e.x + Math.cos(a) * (R + 6), y = e.y + Math.sin(a) * (R + 6);
    // la canna dentro un muro: il colpo parte dal centro del carro (non si spara attraverso i muri)
    const dentro = this.vicino[this.cella(x, y)].some((i) => { const m = this.muri[i]; return x > m[0] - RP && x < m[2] + RP && y > m[1] - RP && y < m[3] + RP; });
    this.p.push({ id: ++this.nP, x: dentro ? e.x : x, y: dentro ? e.y : y, vx: Math.cos(a) * V_PROIETTILE, vy: Math.sin(a) * V_PROIETTILE, vita: piccolo ? 4 : VITA_PROIETTILE, di: e.id, nato: this.tempoRound, rimbalzi: 0, piccolo });
  }
  fuoco(e) {
    if (!e.vivo || e.ricarica > 0) return;
    const miei = this.p.filter((b) => b.di === e.id).length;
    if (e.tripla > 0) {
      if (miei > MAX_PROIETTILI + 4) return;
      for (const d of [-0.22, 0, 0.22]) this.spara(e, e.t + d, true);
      e.tripla--;
    } else {
      if (miei >= MAX_PROIETTILI) return;
      this.spara(e, e.t);
    }
    e.ricarica = RICARICA;
    this.botto([0, Math.round(e.x + Math.cos(e.t) * (R + 8)), Math.round(e.y + Math.sin(e.t) * (R + 8))]);
    this.cambiato = true;
  }
  colpito(e, b) {
    if (e.scudo > 0) { e.scudo = 0; this.botto([2, Math.round(e.x), Math.round(e.y)]); this.annuncia(e.id, 'para un colpo con lo scudo 🛡️', 'lo scudo ti ha salvato 🛡️'); return; }
    e.vivo = false; e.da = b.di;
    this.botto([1, Math.round(e.x), Math.round(e.y)]);
    const chi = b.di;
    if (chi === e.id) this.annuncia(e.id, 'si colpisce da solo 🙈', 'ti sei colpito da solo 🙈');
    else { this.c[chi].uccisioni++; this.punti[chi]++; this.annuncia(chi, 'fa saltare @ 💥', 'colpito! 💥', false, { bersaglio: e.id, testoTe: 'ti ha fatto saltare 💥' }); }
    this.cambiato = true;
  }

  passo(dt) {
    const t = this.tempoRound;
    // comandi: le persone dai tasti/joystick/mouse, i computer da pensa() (this.mente)
    for (const e of this.c) {
      if (!e.vivo) continue;
      e.ricarica = Math.max(0, e.ricarica - dt);
      if (e.turbo > 0) e.turbo = Math.max(0, e.turbo - dt);
      if (e.scudo > 0) e.scudo = Math.max(0, e.scudo - dt);
      const bot = this.bot[e.id], i = this.inp[e.id];
      let dx, dy, mira = null, spara = false;
      if (bot) {
        const m = this.mente[e.id] || {};
        dx = m.dx || 0; dy = m.dy || 0; spara = !!m.fuoco; m.fuoco = false;
        if (m.mira !== undefined && m.mira !== null) e.t = ruota(e.t, m.mira, (LIV[bot] || LIV.medio).giro * dt);
      } else {
        dx = i.x; dy = i.y;
        if (i.mx !== null && i.mx !== undefined) mira = Math.atan2(i.my - e.y, i.mx - e.x);
        spara = this.nuoviTocchi(e.id) > 0;
      }
      // il cingolato: gira verso la direzione voluta e va avanti quando è quasi girato (indietro se è opposta)
      const forza = Math.min(1, Math.hypot(dx, dy));
      if (forza > 0.15) {
        const voglio = Math.atan2(dy, dx);
        let diff = angolo(voglio - e.a);
        let verso = 1;
        if (Math.abs(diff) > Math.PI * 0.75) { verso = -1; diff = angolo(voglio + Math.PI - e.a); } // retromarcia
        e.a = angolo(e.a + Math.sign(diff) * Math.min(Math.abs(diff), V_GIRO * dt * (e.turbo > 0 ? 1.4 : 1)));
        const allineato = Math.cos(angolo((verso > 0 ? voglio : voglio + Math.PI) - e.a));
        if (allineato > 0.5) {
          const v = V_CARRO * (e.turbo > 0 ? 1.6 : 1) * forza * allineato * (verso < 0 ? 0.7 : 1);
          e.x += Math.cos(e.a) * v * dt * verso; e.y += Math.sin(e.a) * v * dt * verso;
        }
        this.spingiFuori(e);
        if (!bot && mira === null) e.t = ruota(e.t, voglio, 10 * dt); // senza mouse la torretta guarda dove si va
      }
      if (!bot && mira !== null) e.t = mira;
      if (spara) this.fuoco(e);
    }
    // i carri non si attraversano
    for (let a = 0; a < this.n; a++) for (let b = a + 1; b < this.n; b++) {
      const A = this.c[a], B = this.c[b];
      if (!A.vivo || !B.vivo) continue;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 2 * R && d > 1e-6) { const k = (2 * R - d) / 2; A.x -= (dx / d) * k; A.y -= (dy / d) * k; B.x += (dx / d) * k; B.y += (dy / d) * k; this.spingiFuori(A); this.spingiFuori(B); }
    }
    // proiettili
    for (const b of this.p) {
      this.muoviProiettile(b, dt);
      b.vita -= dt;
      for (const e of this.c) {
        if (!e.vivo || b.vita <= 0) continue;
        if (e.id === b.di && t - b.nato < 0.12) continue; // appena sparato non colpisce chi l'ha sparato
        if (Math.hypot(e.x - b.x, e.y - b.y) < R + RP) { b.vita = 0; this.colpito(e, b); }
      }
    }
    const prima = this.p.length;
    this.p = this.p.filter((b) => b.vita > 0);
    if (this.p.length !== prima) this.cambiato = true;
    // casse
    if (this.conCasse) {
      this.prossimaCassa -= dt;
      if (this.prossimaCassa <= 0 && this.casse.length < 2) {
        this.prossimaCassa = 7 + Math.random() * 6;
        const libere = [];
        for (let k = 0; k < this.C * this.Rr; k++) { const x = (k % this.C + 0.5) * S, y = (Math.floor(k / this.C) + 0.5) * S; if (this.c.every((e) => !e.vivo || Math.hypot(e.x - x, e.y - y) > 2 * S)) libere.push([x, y]); }
        if (libere.length) { const [x, y] = libere[Math.floor(Math.random() * libere.length)]; this.casse.push({ id: ++this.nC, x, y, tipo: CASSE[Math.floor(Math.random() * CASSE.length)] }); this.cambiato = true; }
      }
      for (const e of this.c) {
        if (!e.vivo) continue;
        const k = this.casse.findIndex((q) => Math.hypot(q.x - e.x, q.y - e.y) < R + 14);
        if (k < 0) continue;
        const q = this.casse.splice(k, 1)[0];
        if (q.tipo === 'tripla') e.tripla = 4; else if (q.tipo === 'scudo') e.scudo = 15; else e.turbo = 8;
        this.annuncia(e.id, `prende ${q.tipo === 'tripla' ? 'il colpo triplo' : q.tipo === 'scudo' ? 'lo scudo' : 'il turbo'}`, q.tipo === 'tripla' ? 'colpo triplo per 4 spari! 🔱' : q.tipo === 'scudo' ? 'scudo: para un colpo 🛡️' : 'turbo per 8 secondi! 🚀');
        this.cambiato = true;
      }
    }
    // fine del round: resta un carro (o nessuno), si aspetta un attimo per i proiettili in volo
    const vivi = this.c.filter((e) => e.vivo).length;
    if (vivi <= 1 && this.fineDopo === null) this.fineDopo = t + PIU_TARDI;
    return (this.fineDopo !== null && t >= this.fineDopo) || t >= DURATA_MAX || vivi === 0;
  }

  fineRound() {
    const vivi = this.c.filter((e) => e.vivo);
    if (vivi.length === 1 && this.tempoRound < DURATA_MAX) {
      this.punti[vivi[0].id]++;
      this.annuncia(vivi[0].id, 'resta l\'ultimo carro in piedi! 🏆', 'sei l\'ultimo in piedi! 🏆', true);
    } else this.annuncia(null, vivi.length ? '⏰ Tempo scaduto: nessun punto in più' : 'Saltati tutti: nessun punto in più', '', true);
  }

  // ---------- il computer ----------
  // la strada nel labirinto: BFS sulle celle (i muri sono quelli del labirinto)
  passa(r, c, d) {
    const L = this.L;
    if (d === 0) return c + 1 < this.C && !L.v[r][c + 1];
    if (d === 1) return r + 1 < this.Rr && !L.h[r + 1][c];
    if (d === 2) return c > 0 && !L.v[r][c];
    return r > 0 && !L.h[r][c];
  }
  strada(da, a) {
    const C = this.C, N = C * this.Rr, prec = new Int32Array(N).fill(-1);
    prec[da] = da;
    const coda = [da];
    for (let q = 0; q < coda.length; q++) {
      const k = coda[q]; if (k === a) break;
      const r = Math.floor(k / C), c = k % C;
      for (let d = 0; d < 4; d++) {
        if (!this.passa(r, c, d)) continue;
        const kk = k + [1, C, -1, -C][d];
        if (prec[kk] < 0) { prec[kk] = k; coda.push(kk); }
      }
    }
    if (prec[a] < 0) return null;
    const via = []; for (let k = a; k !== da; k = prec[k]) via.push(k);
    return via.reverse();
  }
  // dove va un proiettile sparato da (x, y) con angolo a: chi colpisce per primo (o null), entro "rimbalzi" rimbalzi
  traiettoria(x0, y0, a, rimbalzi, io, maxT = 4) {
    const b = { x: x0 + Math.cos(a) * (R + 6), y: y0 + Math.sin(a) * (R + 6), vx: Math.cos(a) * V_PROIETTILE, vy: Math.sin(a) * V_PROIETTILE, rimbalzi: 0 };
    const dt = 1 / 37.5; // 8 pixel a passo: i muri (con il proiettile) sono larghi 16, non si attraversano
    for (let t = 0; t < maxT; t += dt) {
      this.muoviProiettile(b, dt, 8);
      if (b.rimbalzi > rimbalzi) return null;
      for (const e of this.c) {
        if (!e.vivo) continue;
        if (e.id === io && t < 0.15) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < R + RP + (e.id === io ? 4 : -2)) return { chi: e.id, t };
      }
    }
    return null;
  }
  // un proiettile in arrivo: tra quanto passa vicino al punto (x, y)?
  pericolo(x, y, orizzonte) {
    let peggio = Infinity;
    const dt = 1 / 40;
    for (const p of this.p) {
      if (Math.hypot(p.x - x, p.y - y) > V_PROIETTILE * orizzonte + 40) continue;
      const b = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, rimbalzi: 0 };
      for (let t = 0; t < Math.min(orizzonte, p.vita); t += dt) {
        this.muoviProiettile(b, dt, 8);
        if (Math.hypot(b.x - x, b.y - y) < R + RP + 6) { peggio = Math.min(peggio, t); break; }
      }
    }
    return peggio;
  }
  pensa(p, liv) {
    const e = this.c[p], L = LIV[liv] || LIV.medio, t = this.tempoRound;
    const m = this.mente[p] || (this.mente[p] = { prossimo: 0, dx: 0, dy: 0, mira: null, fuoco: false, sparo: null });
    if (!e.vivo) { m.dx = m.dy = 0; return {}; }
    if (t < m.prossimo) return {};
    m.prossimo = t + L.ogni * (0.7 + Math.random() * 0.6);
    // 1) schivare: un proiettile sta per passarmi addosso?
    const arriva = Math.random() < L.schiva ? this.pericolo(e.x, e.y, L.orizzonte) : Infinity;
    if (arriva < L.orizzonte) {
      let meglio = null, bv = -1;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, dist = V_CARRO * Math.min(0.5, arriva + 0.1);
        const q = { x: e.x + Math.cos(a) * dist, y: e.y + Math.sin(a) * dist };
        this.spingiFuori(q);
        const mosso = Math.hypot(q.x - e.x, q.y - e.y);
        // si preferiscono le direzioni dove ci si sposta davvero e dove non arriva niente; girarsi costa tempo
        const v = Math.min(this.pericolo(q.x, q.y, L.orizzonte), 2) * 100 + mosso * 0.5 + Math.cos(angolo(a - e.a)) * 15;
        if (v > bv) { bv = v; meglio = a; }
      }
      m.dx = Math.cos(meglio); m.dy = Math.sin(meglio);
    } else {
      // 2) andare verso il nemico più vicino (lungo il labirinto), oppure verso una cassa vicina
      const io = this.cella(e.x, e.y);
      let meta = null, lung = Infinity;
      for (const o of this.c) {
        if (!o.vivo || o === e) continue;
        const via = this.strada(io, this.cella(o.x, o.y));
        if (via && via.length < lung) { lung = via.length; meta = via; }
      }
      for (const q of this.casse) {
        const via = this.strada(io, this.cella(q.x, q.y));
        if (via && via.length + 2 < lung && liv !== 'facile') { lung = via.length; meta = via.length ? via : [this.cella(q.x, q.y)]; }
      }
      // vicino al nemico (2 celle) ci si ferma a sparare, invece di andargli addosso
      if (meta && meta.length > (liv === 'facile' ? 0 : 1)) {
        const k = meta[0], tx = (k % this.C + 0.5) * S, ty = (Math.floor(k / this.C) + 0.5) * S;
        // dal centro della cella successiva: si punta lì (curve pulite, senza strisciare sui muri)
        const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy) || 1;
        m.dx = dx / l; m.dy = dy / l;
      } else { m.dx = 0; m.dy = 0; }
    }
    // 3) mirare: la torretta cerca un angolo da cui il colpo (anche di sponda) prende un nemico e non me. I tiri
    // dritti si provano sempre; quelli di sponda 24 angoli alla volta (96 in tutto), così il calcolo resta leggero
    if (m.sparo && (t > m.sparo.fino || !this.c[m.sparo.chi].vivo)) m.sparo = null;
    const nemici = this.c.filter((o) => o.vivo && o !== e);
    const prova = (a, rb, maxT) => {
      const r = this.traiettoria(e.x, e.y, a, rb, e.id, maxT);
      if (!r || r.chi === e.id) return;
      // conta quanto bisogna girare la torretta e quanto ci mette il colpo ad arrivare
      const v = Math.abs(angolo(a - e.t)) / L.giro + r.t * 0.5;
      if (!m.sparo || v < m.sparo.v) m.sparo = { a, chi: r.chi, v, fino: t + 0.6 };
    };
    for (const o of nemici) prova(Math.atan2(o.y - e.y, o.x - e.x), 0, 2);
    if (L.rimbalzi > 0) {
      m.giro = ((m.giro || 0) + 1) % 4;
      for (let k = m.giro; k < 96; k += 4) prova((k * 2 * Math.PI) / 96 + (Math.random() - 0.5) * 0.06, L.rimbalzi, 2.6);
    }
    if (m.sparo) {
      m.mira = m.sparo.a + (Math.random() - 0.5) * L.rumore * 2;
      if (Math.abs(angolo(e.t - m.sparo.a)) < 0.05 + L.rumore && e.ricarica <= 0) {
        // si spara solo se il colpo non torna indietro su di me
        const r = this.traiettoria(e.x, e.y, e.t, Math.max(1, L.rimbalzi + 1), e.id, 2.5);
        if (r && r.chi !== e.id) { m.fuoco = true; m.sparo = null; }
        else if (liv === 'facile' && Math.random() < 0.3) m.fuoco = true; // il facile a volte spara lo stesso
      }
    } else {
      // nessun tiro buono: la torretta guarda il nemico più vicino; il facile spara un po' a caso
      const o = this.c.filter((x) => x.vivo && x !== e).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
      if (o) m.mira = Math.atan2(o.y - e.y, o.x - e.x);
      if (liv === 'facile' && Math.random() < 0.08) m.fuoco = true;
    }
    return {};
  }

  // ---------- quello che vede il browser ----------
  vistaExtra() { return { C: this.C, Rr: this.Rr, S, SPESSORE, R, RP }; }
  statoTick() {
    // gli effetti degli ultimi istanti, numerati: ogni giocatore li riceve (anche se un tick si perde) e il browser
    // salta quelli già visti
    const ora = this.tempoRound; this.botti = this.botti.filter((x) => ora - x[4] < 0.5);
    const botti = this.botti.map((x) => x.slice(0, 4));
    const r = (v) => Math.round(v), a2 = (v) => Math.round(v * 100) / 100;
    return {
      L: this.codice,
      c: this.c.map((e) => [r(e.x), r(e.y), a2(e.a), a2(e.t), e.vivo ? 1 : 0, e.scudo > 0 ? 1 : 0, e.tripla, e.turbo > 0 ? 1 : 0]),
      p: this.p.map((b) => [b.id, r(b.x), r(b.y), b.di, b.piccolo ? 1 : 0]),
      q: this.casse.map((q) => [q.id, q.x, q.y, CASSE.indexOf(q.tipo)]),
      b: botti,
    };
  }
}

module.exports = {
  meta: {
    id: 'carri',
    nome: 'Carri armati nel labirinto',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Carri armati in un labirinto visto dall\'alto: i proiettili rimbalzano sui muri, si colpisce di sponda (e anche se stessi!). Un colpo e salti.',
    alias: ['carri', 'carro armato', 'tank', 'tanks', 'labirinto', 'proiettili', 'rimbalzi', 'sparatutto'],
    opzioni: [
      { id: 'round', nome: 'Round', valori: [7, 5, 10], etichette: ['7 round', '5 round', '10 round'], predefinito: 7 },
      { id: 'casse', nome: 'Casse', valori: ['si', 'no'], etichette: ['Con le casse (colpo triplo, scudo, turbo)', 'Senza casse'], predefinito: 'si' },
    ],
    regole: [
      'Ognuno guida un carro armato in un labirinto visto dall\'alto. A ogni round il labirinto è nuovo e i carri partono lontani tra loro.',
      'Il carro va nella direzione delle frecce (o WASD, o del joystick): prima gira il cingolato, poi parte; se la direzione è quella opposta va in retromarcia. La torretta mira dove punti il mouse; sul telefono si mira toccando il campo (il tocco spara subito in quella direzione), oppure la torretta guarda dove vai.',
      'Si spara con il clic, con lo spazio o con il pulsante 💥 Fuoco. Al massimo 5 proiettili in giro per carro. I proiettili rimbalzano sui muri e durano 7 secondi: si può colpire di sponda, ma attenzione, anche se stessi!',
      'Un colpo e il carro salta. Chi colpisce un altro carro prende 1 punto; chi colpisce se stesso no. L\'ultimo carro rimasto prende 1 punto in più (i proiettili in volo valgono ancora per 2 secondi: se salta anche lui, niente punto).',
      'Casse (se attive): ogni tanto ne compare una, si prende passandoci sopra. 🔱 Colpo triplo: i prossimi 4 spari partono a ventaglio. 🛡️ Scudo: para un colpo (dura 15 secondi). 🚀 Turbo: più veloce per 8 secondi.',
      'Si giocano 7 round (o 5, o 10): vince chi ha più punti. Un round dura al massimo 2 minuti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile spara quasi solo dritto, mira male e schiva poco; il medio fa anche i tiri di sponda con un rimbalzo e schiva i colpi che vede arrivare; il difficile calcola tiri fino a tre rimbalzi, gira la torretta in fretta, non spara mai colpi che tornano indietro su di lui e schiva quasi tutto.',
    ],
  },
  crea: (o) => new Carri(o),
  bot: () => ({}),
  _test: { Carri, labirinto, rettangoli, codifica, S, R, RP, V_PROIETTILE, LIV, DIMENSIONI },
};
