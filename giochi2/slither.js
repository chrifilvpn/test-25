// SERPENTONI: arena rotonda e grande, vista dall'alto, con la telecamera che segue il proprio serpente. Il serpente va
// sempre avanti e gira verso il mouse o il dito (o con le frecce/joystick); tenendo premuto accelera ma perde
// lunghezza (lascia cibo dietro di sé). Si cresce mangiando il cibo sparso. Chi sbatte la testa contro il corpo di un
// altro serpente (o contro il bordo) muore e si trasforma in tanto cibo; dopo 3 secondi rinasce piccolo. Si gioca a
// tempo: alla fine vince chi è più lungo. Oltre ai giocatori ci sono serpenti del computer di riempimento.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');
// !win banana: un vantaggio per il round in corso (al massimo 25 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }

const VISTA = 1000; // lo schermo (in unità del browser): il mouse dice la direzione rispetto al centro
const PASSO = 10; // distanza tra i punti del corpo
const L_INIZIO = 150, L_MIN_TURBO = 80, V = 185, V_TURBO = 360, COSTO_TURBO = 22, GIRO = 4.2;
const RINASCITA = 3, CELLA = 90;
const NOMI = ['Biscia', 'Vipera', 'Cobra', 'Boa', 'Pitone', 'Anaconda', 'Mamba', 'Saettone', 'Colubro', 'Aspide', 'Natrice', 'Crotalo', 'Taipan', 'Bongaro', 'Serpentello', 'Ramarro'];
const COL_EXTRA = ['#f28c28', '#3cb4e6', '#a3d14b', '#d14bb4', '#e6d23c', '#4be6b4', '#b47cf0', '#f05a5a', '#5a8cf0', '#8cf05a', '#f0b45a', '#5af0f0', '#f05ab4', '#c8c8c8', '#9a6b3c', '#3c9a6b'];

const raggioDi = (L) => Math.min(34, 9 + Math.sqrt(L) * 0.42);
// quanta parte del mondo vede ognuno (più si è grandi più la telecamera si allontana)
const larghezzaVista = (r) => Math.min(2000, 1000 + (r - 9) * 32);
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

class Serpentoni extends Arena {
  constructor(o) {
    super(o, { id: 'slither', round: 1, tickMs: 40 });
    this.nRound = 1;
    this.W = VISTA; this.H = VISTA;
    const op = o.opzioni || {};
    this.durata = ([2, 3, 5].includes(Number(op.minuti)) ? Number(op.minuti) : 3) * 60;
    this.nExtra = [0, 3, 6, 10, 15].includes(Number(op.computer)) ? Number(op.computer) : 6;
    this.forzaExtra = ['misti', 'facile', 'medio', 'difficile'].includes(op.forza) ? op.forza : 'misti';
    this.etichettaPunti = 'lunghezza';
    this.avvia();
  }
  iniziaRound() {
    const tot = this.n + this.nExtra;
    this.R = Math.max(1700, Math.min(3200, 1300 + tot * 110));
    this.s = [];
    for (let i = 0; i < tot; i++) {
      const extra = i >= this.n;
      const liv = extra ? (this.forzaExtra === 'misti' ? ['facile', 'medio', 'difficile'][i % 3] : this.forzaExtra) : null;
      this.s.push({ id: i, extra, liv, col: extra ? COL_EXTRA[(i - this.n) % COL_EXTRA.length] : null, nome: extra ? NOMI[(i - this.n) % NOMI.length] : null, vivo: false, morto: -RINASCITA, uccisioni: 0, record: 0, L: 0 });
    }
    for (const s of this.s) this.nasci(s);
    this.cibo = new Map(); this.nC = 0; this.griglia = new Map();
    const quanto = this.ciboVoluto();
    for (let k = 0; k < quanto; k++) this.metti(this.puntoACaso(this.R - 40), 3 + Math.floor(Math.random() * 6));
    this.mente = {};
    this.cambiato = true;
  }
  ciboVoluto() { return Math.round(260 + this.s.length * 30 + this.R * 0.08); }
  puntoACaso(max) { const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * max; return { x: Math.cos(a) * d, y: Math.sin(a) * d }; }
  nasci(s) {
    // un posto lontano dagli altri serpenti
    let meglio = null, dm = -1;
    for (let k = 0; k < 14; k++) {
      const q = this.puntoACaso(this.R * 0.75);
      let d = Infinity;
      for (const o of this.s) if (o !== s && o.vivo) for (let j = 0; j < o.p.length; j += 4) d = Math.min(d, Math.hypot(o.p[j].x - q.x, o.p[j].y - q.y));
      if (d > dm) { dm = d; meglio = q; }
      if (d > 500) break;
    }
    const ang = Math.atan2(-meglio.y, -meglio.x) + (Math.random() - 0.5); // verso il centro, più o meno
    Object.assign(s, { vivo: true, x: meglio.x, y: meglio.y, ang, meta: ang, L: L_INIZIO, r: raggioDi(L_INIZIO), turbo: false, nato: this.tempoRound || 0, scia: 0 });
    s.p = [];
    for (let k = 0; k <= Math.ceil(L_INIZIO / PASSO) + 1; k++) s.p.push({ x: s.x - Math.cos(ang) * k * PASSO, y: s.y - Math.sin(ang) * k * PASSO });
  }
  // ---------- cibo (con una griglia per trovarlo in fretta) ----------
  chiave(x, y) { return `${Math.floor(x / CELLA)},${Math.floor(y / CELLA)}`; }
  metti(q, v, c = Math.floor(Math.random() * 8)) {
    if (Math.hypot(q.x, q.y) > this.R - 15) return;
    const f = { id: ++this.nC, x: q.x, y: q.y, v, c };
    this.cibo.set(f.id, f);
    const k = this.chiave(f.x, f.y);
    if (!this.griglia.has(k)) this.griglia.set(k, new Set());
    this.griglia.get(k).add(f);
  }
  togli(f) { this.cibo.delete(f.id); const g = this.griglia.get(this.chiave(f.x, f.y)); if (g) g.delete(f); }
  ciboVicino(x, y, raggio, fn) {
    const c0 = Math.floor((x - raggio) / CELLA), c1 = Math.floor((x + raggio) / CELLA), r0 = Math.floor((y - raggio) / CELLA), r1 = Math.floor((y + raggio) / CELLA);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) { const g = this.griglia.get(`${c},${r}`); if (g) for (const f of g) fn(f); }
  }
  // ---------- i corpi (griglia ricostruita a ogni passo) ----------
  costruisciCorpi() {
    this.corpi = new Map();
    for (const s of this.s) {
      if (!s.vivo) continue;
      s.r = raggioDi(s.L);
      const n = Math.min(s.p.length, Math.ceil(s.L / PASSO) + 1);
      for (let j = 0; j < n; j++) {
        const q = s.p[j], k = this.chiave(q.x, q.y);
        let g = this.corpi.get(k); if (!g) { g = []; this.corpi.set(k, g); }
        g.push(q.x, q.y, s.id, j);
      }
    }
    // dove saranno le teste tra poco (serve solo al computer per non tagliare la strada a chi arriva)
    this.futuri = new Map();
    for (const s of this.s) {
      if (!s.vivo) continue;
      const v = s.inTurbo ? V_TURBO : V;
      for (let k = 1; k <= 5; k++) {
        const x = s.x + Math.cos(s.ang) * v * 0.12 * k, y = s.y + Math.sin(s.ang) * v * 0.12 * k, c = this.chiave(x, y);
        let g = this.futuri.get(c); if (!g) { g = []; this.futuri.set(c, g); }
        g.push(x, y, s.id, 0);
      }
    }
  }
  vicinoAlFuturo(x, y, r, io) {
    const g = this.futuri.get(this.chiave(x, y));
    if (!g) return false;
    for (let k = 0; k < g.length; k += 4) if (g[k + 2] !== io && Math.hypot(g[k] - x, g[k + 1] - y) < r + this.s[g[k + 2]].r + 10) return true;
    return false;
  }
  // il primo corpo (di un altro serpente) che si tocca in (x, y) con raggio r: restituisce il serpente o null
  tocca(x, y, r, io, testaAltri = true) {
    const c0 = Math.floor((x - r - 40) / CELLA), c1 = Math.floor((x + r + 40) / CELLA), r0 = Math.floor((y - r - 40) / CELLA), r1 = Math.floor((y + r + 40) / CELLA);
    for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) {
      const g = this.corpi.get(`${c},${rr}`); if (!g) continue;
      for (let k = 0; k < g.length; k += 4) {
        const id = g[k + 2]; if (id === io) continue;
        if (!testaAltri && g[k + 3] < 2) continue;
        const o = this.s[id], d = Math.hypot(g[k] - x, g[k + 1] - y);
        if (d < r + o.r * 0.85) return o;
      }
    }
    return null;
  }
  muori(s, da) {
    s.vivo = false; s.morto = this.tempoRound;
    // il corpo diventa cibo (più o meno metà della lunghezza, in palline grandi)
    const n = Math.min(s.p.length, Math.ceil(s.L / PASSO));
    const ogni = Math.max(1, Math.floor(n / Math.max(4, s.L / 26)));
    const valore = Math.max(4, (s.L * 0.55) / Math.ceil(n / ogni));
    for (let j = 0; j < n; j += ogni) { const q = s.p[j]; this.metti({ x: q.x + (Math.random() - 0.5) * s.r, y: q.y + (Math.random() - 0.5) * s.r }, Math.round(Math.min(30, valore)), 9); }
    const chi = (x) => (x.id < this.n ? null : x.nome);
    if (da) { da.uccisioni++; }
    if (s.id < this.n) {
      if (da && da.id < this.n) this.annuncia(s.id, `sbatte contro @! 💥`, 'hai sbattuto contro @! 💥', false, { bersaglio: da.id, testoTe: 'ti è venuto addosso 💥' });
      else this.annuncia(s.id, da ? `sbatte contro ${chi(da)} 💥` : 'esce dall\'arena 💥', da ? `hai sbattuto contro ${chi(da)} 💥` : 'sei uscito dall\'arena 💥');
    } else if (da && da.id < this.n) this.annuncia(da.id, `fa sbattere ${s.nome}! 🐍`, `hai fatto sbattere ${s.nome}! 🐍`);
    this.cambiato = true;
  }

  // ---------- il movimento ----------
  direzioneGiocatore(p, s) {
    const i = this.inp[p];
    if (Math.hypot(i.x, i.y) > 0.3) return Math.atan2(i.y, i.x);
    if (i.mx !== null && i.mx !== undefined) { const dx = i.mx - VISTA / 2, dy = i.my - VISTA / 2; if (Math.hypot(dx, dy) > 12) return Math.atan2(dy, dx); }
    return s.meta;
  }
  avanza(s, dt) {
    s.r = raggioDi(s.L);
    const giro = GIRO * (1 - Math.min(0.5, (s.r - 9) / 50));
    const d = angolo(s.meta - s.ang);
    s.ang = angolo(s.ang + Math.max(-giro * dt, Math.min(giro * dt, d)));
    const turbo = s.turbo && s.L > L_MIN_TURBO;
    const v = turbo ? V_TURBO : V;
    s.x += Math.cos(s.ang) * v * dt; s.y += Math.sin(s.ang) * v * dt;
    if (turbo && !(s.id < this.n && this.winOn && this.winOn[s.id])) { // con il trucco il turbo è gratis
      s.L -= COSTO_TURBO * dt;
      s.scia += dt;
      if (s.scia > 0.15) { s.scia = 0; const t = s.p[Math.min(s.p.length - 1, Math.ceil(s.L / PASSO))]; if (t) this.metti({ x: t.x, y: t.y }, 2, 8); }
    }
    s.inTurbo = turbo;
    // il corpo: un punto nuovo ogni PASSO di strada
    let t0 = s.p[0], dd = Math.hypot(s.x - t0.x, s.y - t0.y);
    for (let giri = 0; dd >= PASSO && giri < 20; giri++) {
      const k = PASSO / dd;
      t0 = { x: t0.x + (s.x - t0.x) * k, y: t0.y + (s.y - t0.y) * k };
      s.p.unshift(t0);
      dd = Math.hypot(s.x - t0.x, s.y - t0.y);
    }
    const max = Math.ceil(s.L / PASSO) + 2;
    if (s.p.length > max) s.p.length = max;
  }
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound;
    // input dei giocatori e computer di riempimento
    for (let p = 0; p < this.n; p++) {
      const s = this.s[p];
      if (!s.vivo) continue;
      if (!this.bot[p]) { s.meta = this.direzioneGiocatore(p, s); s.turbo = !!this.inp[p].a; }
    }
    for (let i = this.n; i < this.s.length; i++) if (this.s[i].vivo) this.guida(this.s[i], this.s[i].liv);
    // due mezzi passi (con il turbo si va veloci: le collisioni non si saltano)
    for (let k = 0; k < 2; k++) {
      for (const s of this.s) if (s.vivo) this.avanza(s, dt / 2);
      this.costruisciCorpi();
      const morti = [];
      for (const s of this.s) {
        if (!s.vivo) continue;
        if (Math.hypot(s.x, s.y) > this.R - s.r * 0.6) { morti.push([s, null]); continue; }
        const o = s.id < this.n && this.winOn[s.id] ? null : this.tocca(s.x, s.y, s.r * 0.6, s.id); // con il trucco si passa attraverso gli altri
        if (o) morti.push([s, o]);
      }
      for (const [s, o] of morti) if (s.vivo) this.muori(s, o);
    }
    // mangiare
    for (const s of this.s) {
      if (!s.vivo) continue;
      const rag = s.r + 14;
      const presi = [];
      this.ciboVicino(s.x, s.y, rag + 10, (f) => { if (Math.hypot(f.x - s.x, f.y - s.y) < rag) presi.push(f); });
      for (const f of presi) { this.togli(f); s.L += f.v; }
      s.record = Math.max(s.record, s.L);
    }
    // si rinasce dopo 3 secondi
    for (const s of this.s) if (!s.vivo && t - s.morto >= RINASCITA && t < this.durata - 1) { this.nasci(s); if (s.id < this.n) this.cambiato = true; }
    // il cibo naturale ricresce
    let manca = this.ciboVoluto() - this.cibo.size;
    while (manca-- > 0) this.metti(this.puntoACaso(this.R - 40), 3 + Math.floor(Math.random() * 6));
    // classifica: aggiornata nel punteggio in alto ogni 3 secondi (la classifica dal vivo è nel tick)
    if (t - (this.ultimoAgg || -9) > 3) { this.ultimoAgg = t; for (let p = 0; p < this.n; p++) this.punti[p] = this.s[p].vivo ? Math.round(this.s[p].L / 10) : 0; this.cambiato = true; }
    return t >= this.durata;
  }
  fineRound() {
    fineWin(this);
    for (let p = 0; p < this.n; p++) this.punti[p] = this.s[p].vivo ? Math.round(this.s[p].L / 10) : 0;
    const m = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0);
    if (v.length === 1) this.annuncia(v[0], `è il serpentone più lungo! 🐍🏆 (${m})`, `sei il serpentone più lungo! 🐍🏆 (${m})`, true);
  }

  // ---------- il computer ----------
  // quanta strada libera c'è davanti in direzione a (fino a "fino"): corpi degli altri e bordo
  liberoVerso(s, a, fino, futuro) {
    const cx = Math.cos(a), cy = Math.sin(a);
    for (let d = 20; d <= fino; d += 20) {
      const x = s.x + cx * d, y = s.y + cy * d;
      if (Math.hypot(x, y) > this.R - s.r - 10) return d;
      if (this.tocca(x, y, s.r + 4, s.id, true)) return d;
      if (futuro && d < 260 && this.vicinoAlFuturo(x, y, s.r, s.id)) return d;
    }
    return fino;
  }
  guida(s, liv) {
    const L = { facile: { ogni: 0.3, vede: 170, dirs: 8, turbo: 0 }, medio: { ogni: 0.16, vede: 240, dirs: 10, turbo: 0.4 }, difficile: { ogni: 0.08, vede: 400, dirs: 16, turbo: 1 } }[liv] || { ogni: 0.14, vede: 280, dirs: 12, turbo: 0.4 };
    const m = this.mente[s.id] || (this.mente[s.id] = { fino: -1 });
    if (this.tempoRound < m.fino) return;
    m.fino = this.tempoRound + L.ogni * (0.7 + Math.random() * 0.6);
    if (!this.corpi) this.costruisciCorpi();
    // la preda (il difficile, se è abbastanza lungo): taglia la strada o si arrotola attorno a un serpente più piccolo
    let caccia = null;
    if (liv === 'difficile' && s.L > 500) {
      let dm = 320;
      for (const o of this.s) {
        if (!o.vivo || o === s || o.L * 2.5 > s.L) continue;
        const d = Math.hypot(o.x - s.x, o.y - s.y);
        if (d < dm) { dm = d; caccia = o; }
      }
    }
    let meglio = s.ang, voto = -Infinity, turbo = false, liberoMeglio = 0;
    for (let k = 0; k < L.dirs; k++) {
      const a = s.ang + ((k / (L.dirs - 1)) * 2 - 1) * Math.PI * 0.85;
      const libero = this.liberoVerso(s, a, L.vede, liv === 'difficile');
      const chiuso = Math.max(0, Math.min(L.vede, 260) - libero);
      let v = -(chiuso ** 2) / 40 + (liv === 'difficile' ? libero / 40 : 0);
      // cibo nella direzione
      let cibo = 0;
      for (const dist of liv === 'difficile' ? [140, 320] : [140]) {
        const px = s.x + Math.cos(a) * dist, py = s.y + Math.sin(a) * dist;
        this.ciboVicino(px, py, 130, (f) => { cibo += (f.v / (1 + Math.hypot(f.x - px, f.y - py) / 60)) * (dist > 200 ? 0.6 : 1); });
      }
      v += cibo * (liv === 'facile' ? 0.6 : 1);
      if (caccia) {
        // gli gira attorno a distanza (il corpo lungo fa da recinto) e, chiuso il giro, stringe pian piano
        const d = Math.hypot(caccia.x - s.x, caccia.y - s.y), verso = Math.atan2(caccia.y - s.y, caccia.x - s.x);
        const lato = m.lato || (m.lato = Math.random() < 0.5 ? 1 : -1);
        const at = verso + lato * (Math.PI / 2 - Math.max(-0.5, Math.min(0.5, (d - 130) / 200)));
        if (libero >= L.vede * 0.8) v += 22 * Math.cos(angolo(a - at)); // solo se la strada è libera
      }
      // verso il centro se si è vicini al bordo
      const db = this.R - Math.hypot(s.x, s.y);
      if (db < 400) v += (400 - db) / 20 * Math.cos(angolo(a - Math.atan2(-s.y, -s.x)));
      v -= Math.abs(angolo(a - s.ang)) * 2; // meglio non girare troppo
      v += Math.random() * (liv === 'facile' ? 12 : 3);
      if (v > voto) { voto = v; meglio = a; liberoMeglio = libero; turbo = false; }
    }
    // il medio a volte accelera verso il cibo grande; tutti accelerano per scappare se davanti è chiuso
    // si accelera per scappare solo se davanti si sta chiudendo e la strada nuova è libera (e girando poco)
    const davanti = this.liberoVerso(s, s.ang, L.vede * 0.6, liv === 'difficile');
    if (davanti < L.vede * 0.3 && L.turbo && liberoMeglio >= L.vede && Math.abs(angolo(meglio - s.ang)) < 0.6) turbo = Math.random() < L.turbo;
    s.meta = meglio; s.turbo = turbo;
  }
  pensa(p, liv) { const s = this.s[p]; if (s.vivo) this.guida(s, liv); return {}; }

  vistaExtra() {
    return { R: this.R, VISTA, durata: this.durata, nomi: this.s.map((s) => s.nome), col: this.s.map((s) => s.col) };
  }
  statoTick(posto) {
    const io = this.s[posto];
    const r0 = (v) => Math.round(v);
    // quello che si vede dal proprio serpente (o da dove si è morti)
    const cx = io.x, cy = io.y, larga = larghezzaVista(io.vivo ? raggioDi(io.L) : 12) * 0.75 + 60;
    const dentro = (q) => Math.abs(q.x - cx) < larga && Math.abs(q.y - cy) < larga;
    const serpenti = [];
    for (const s of this.s) {
      if (!s.vivo) continue;
      const r = raggioDi(s.L), n = Math.min(s.p.length, Math.ceil(s.L / PASSO) + 1);
      const salto = Math.max(1, Math.floor(r / 9)); // i cerchi del corpo si sovrappongono comunque
      const pt = [];
      let visto = false;
      for (let j = 0; j < n; j += salto) { const q = s.p[j]; if (dentro(q)) { visto = true; pt.push(r0(q.x), r0(q.y)); } else if (pt.length && pt[pt.length - 1] !== null) pt.push(null); }
      if (!visto && !dentro(s)) continue;
      while (pt.length && pt[pt.length - 1] === null) pt.pop();
      serpenti.push({ id: s.id, x: r0(s.x), y: r0(s.y), a: Math.round(s.ang * 100) / 100, r: Math.round(r * 10) / 10, t: s.inTurbo ? 1 : 0, p: pt });
    }
    const cibo = [];
    this.ciboVicino(cx, cy, larga, (f) => { if (dentro(f)) cibo.push(r0(f.x), r0(f.y), f.v * 10 + f.c); }); // valore e colore insieme
    const classifica = this.s.filter((s) => s.vivo).sort((a, b) => b.L - a.L).slice(0, 5).map((s) => [s.id, Math.round(s.L / 10)]);
    return {
      io: [io.vivo ? 1 : 0, r0(cx), r0(cy), Math.round(io.L / 10), io.vivo ? 0 : Math.max(0, Math.ceil(RINASCITA - (this.tempoRound - io.morto))), io.uccisioni, Math.round(io.record / 10)],
      s: serpenti, f: cibo, cl: classifica,
      mm: this.s.filter((s) => s.vivo && (s.L > 500 || s.id === posto)).map((s) => [s.id, r0(s.x / 20), r0(s.y / 20)]),
      resta: Math.max(0, Math.ceil(this.durata - this.tempoRound)),
    };
  }
}

module.exports = {
  meta: {
    id: 'slither',
    nome: 'Serpentoni',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Un\'arena enorme piena di cibo: cresci, accelera e fai sbattere gli altri serpenti contro il tuo corpo. Vince il più lungo.',
    alias: ['slither', 'slither.io', 'serpenti', 'serpente', 'vermi', 'worm', 'snake io'],
    opzioni: [
      { id: 'minuti', nome: 'Durata', valori: [3, 2, 5], etichette: ['3 minuti', '2 minuti', '5 minuti'], predefinito: 3 },
      { id: 'computer', nome: 'Serpenti del computer in più', valori: [6, 0, 3, 10, 15], etichette: ['6 serpenti del computer', 'Nessuno', '3 serpenti del computer', '10 serpenti del computer', '15 serpenti del computer'], predefinito: 6 },
      { id: 'forza', nome: 'Forza dei serpenti in più', valori: ['misti', 'facile', 'medio', 'difficile'], etichette: ['Forza mista', 'Tutti facili', 'Tutti medi', 'Tutti difficili'], predefinito: 'misti' },
    ],
    regole: [
      'Ognuno guida un serpente in un\'arena rotonda e grandissima: lo schermo segue il tuo serpente (visto dall\'alto) e si allontana man mano che cresci. In basso a destra c\'è la mappa piccola con te e i serpenti più grandi.',
      'Il serpente va sempre avanti: gira verso il mouse (o verso il punto dove tocchi il campo), oppure con le frecce/WASD o il joystick sul telefono.',
      'Tenendo premuto il tasto del mouse, lo spazio o il pulsante 🚀 accelera, ma perde un po\' di lunghezza (lascia una scia di cibo). Sotto una certa lunghezza non si può accelerare.',
      'Mangiando le palline colorate si diventa più lunghi e più grossi.',
      'Chi sbatte la testa contro il corpo di un altro serpente, o esce dal bordo dell\'arena, muore: il suo corpo diventa tanto cibo (le palline grandi). Toccare il proprio corpo invece non fa niente. Dopo 3 secondi si rinasce piccoli in un posto libero.',
      'Si gioca a tempo (3 minuti, o 2 o 5): alla fine vince chi è più lungo. Chi in quel momento è morto conta zero. La classifica dal vivo è in alto a destra.',
      'Oltre ai giocatori ci sono serpenti del computer di riempimento (da 0 a 15, si sceglie prima di iniziare): fanno numero ma non sono in classifica finale.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile vede poco davanti a sé e cerca il cibo un po\' a caso; il medio evita bene i corpi degli altri, scappa accelerando quando è chiuso e insegue il cibo; il difficile vede lontano e, quando è grande, taglia la strada ai serpenti più piccoli e prova a girargli attorno per chiuderli.',
    ],
  },
  crea: (o) => new Serpentoni(o),
  bot: () => ({}),
  _test: { Serpentoni, raggioDi, larghezzaVista, L_INIZIO, RINASCITA, VISTA },
};
