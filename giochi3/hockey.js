// HOCKEY SU GHIACCIO 2 CONTRO 2: pista vista dall'alto con le balaustre arrotondate, due porte con il portiere
// (lo muove il gioco) e due pattinatori per squadra. In 4 ognuno comanda il suo pattinatore; in 2 ognuno ha un
// compagno comandato dal computer. Sul ghiaccio si scivola: si accelera nella direzione scelta e si frena piano.
// Chi passa sul disco lo prende col bastone; il tasto azione tira (verso la porta, se la si guarda), passa (se si
// guarda il compagno) o, senza disco, prova a rubarlo. Gli spintoni forti fanno perdere il disco. Si gioca a tempo;
// in parità si va ai supplementari col gol d'oro.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');
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

const W = 1100, H = 600, RAGGIO_ANGOLO = 150;
const LINEA_PORTA = 92, BOCCA = 50, PROF_PORTA = 34; // la porta: da y = H/2 − BOCCA a H/2 + BOCCA, profonda 34
const R_GIOC = 15, R_DISCO = 6, R_PORTIERE = 19, BASTONE = 21;
const ACC = 950, V_MAX = 330, V_CONDISCO = 300, ATTRITO = 0.85, ATTRITO_FERMO = 1.7;
const ATTRITO_DISCO = 0.32, V_DISCO_MAX = 1150, RIMBALZO = 0.72;
const TIRO = 880, PASSAGGIO = 640, PAUSA_GOL = 2.6, SUPPLEMENTARI = 60;
const LIV = {
  facile: { v: 0.8, reazione: 0.32, mira: 0.09, ruba: 0.9, tiraDa: 420, passa: 0.15 },
  medio: { v: 0.92, reazione: 0.18, mira: 0.045, ruba: 1.8, tiraDa: 360, passa: 0.45 },
  difficile: { v: 1, reazione: 0.08, mira: 0.018, ruba: 2.8, tiraDa: 330, passa: 0.8 },
};
const PORTIERI = { facile: { v: 190, lento: 0.16 }, medio: { v: 230, lento: 0.09 }, difficile: { v: 270, lento: 0.05 } };
const verso = (sq) => (sq === 0 ? 1 : -1); // la squadra 0 (rossa) attacca verso destra
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// il punto più vicino dentro la pista (rettangolo con gli angoli arrotondati) a distanza r dalla balaustra, e la normale
function dentro(x, y, r) {
  const R = RAGGIO_ANGOLO;
  const cx = Math.max(R, Math.min(W - R, x)), cy = Math.max(R, Math.min(H - R, y));
  if ((x < R || x > W - R) && (y < R || y > H - R)) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
    if (d <= R - r) return null;
    return { x: cx + (dx / d) * (R - r), y: cy + (dy / d) * (R - r), nx: -dx / d, ny: -dy / d };
  }
  if (x < r) return { x: r, y, nx: 1, ny: 0 };
  if (x > W - r) return { x: W - r, y, nx: -1, ny: 0 };
  if (y < r) return { x, y: r, nx: 0, ny: 1 };
  if (y > H - r) return { x, y: H - r, nx: 0, ny: -1 };
  return null;
}
// la gabbia della porta della squadra sq (dietro la linea di porta): rettangolo che non si attraversa
const gabbia = (sq) => (sq === 0 ? { x0: LINEA_PORTA - PROF_PORTA, x1: LINEA_PORTA, y0: H / 2 - BOCCA, y1: H / 2 + BOCCA } : { x0: W - LINEA_PORTA, x1: W - LINEA_PORTA + PROF_PORTA, y0: H / 2 - BOCCA, y1: H / 2 + BOCCA });
const portaX = (sq) => (sq === 0 ? LINEA_PORTA : W - LINEA_PORTA);
// un cerchio contro la gabbia: lo si spinge fuori (dal lato più vicino)
function fuoriGabbia(o, r, g) {
  const px = Math.max(g.x0, Math.min(g.x1, o.x)), py = Math.max(g.y0, Math.min(g.y1, o.y));
  const dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d > 1e-6) return { nx: dx / d, ny: dy / d, pen: r - d };
  // centro dentro la gabbia: fuori dal lato più vicino
  const lati = [[o.x - g.x0, -1, 0], [g.x1 - o.x, 1, 0], [o.y - g.y0, 0, -1], [g.y1 - o.y, 0, 1]].sort((a, b) => a[0] - b[0]);
  return { nx: lati[0][1], ny: lati[0][2], pen: lati[0][0] + r };
}

class Hockey extends Arena {
  constructor(o) {
    super(o, { id: 'hockey', round: 1, tickMs: 33 });
    this.nRound = 1;
    this.W = W; this.H = H;
    const op = o.opzioni || {};
    this.durata = ([3, 5, 2].includes(Number(op.durata)) ? Number(op.durata) : 3) * 60;
    this.etichettaPunti = 'gol';
    this.gol = [0, 0];
    // il livello dei compagni del computer (in 2) e dei portieri: quello dei computer al tavolo, se ci sono
    const livTavolo = this.bot.find(Boolean) || 'medio';
    this.livCompagno = livTavolo;
    this.livPortieri = [0, 1].map((sq) => { const l = this.bot.filter((b, i) => b && i % 2 === sq); return l[0] || 'medio'; });
    this.avvia();
  }
  squadra(k) { return k % 2; }
  // chi comanda il pattinatore k: il posto k (in 4), oppure in 2 il posto k (0, 1) e il computer per 2 e 3
  livelloDi(k) { return k < this.n ? this.bot[k] : this.livCompagno; }

  iniziaRound() {
    this.g = Array.from({ length: 4 }, (_, k) => ({ k, sq: k % 2, x: 0, y: 0, vx: 0, vy: 0, a: 0, pausa: 0, colpito: 0, mente: { fino: -1, ingresso: { x: 0, y: 0 } } }));
    this.portieri = [0, 1].map((sq) => ({ sq, x: portaX(sq) + verso(sq) * 26, y: H / 2, tiene: 0, mente: { fino: -1, ty: H / 2 } }));
    this.disco = { x: W / 2, y: H / 2, vx: 0, vy: 0, chi: null, ultimo: null, assist: null };
    this.pausaGol = 0;
    this.supplementari = false;
    this.ultimoGol = null;
    this.effetti = [];
    this.ingaggio(Math.random() < 0.5 ? 0 : 1);
    this.cambiato = true;
  }
  spostaTempi() {}
  // tutti al loro posto per l'ingaggio al centro; il disco è un po' più vicino a chi ha subito il gol
  ingaggio(sq) {
    const pos = [[-60, -12], [60, 12], [-210, 110], [210, -110]];
    for (const p of this.g) { const [dx, dy] = pos[p.k]; Object.assign(p, { x: W / 2 + dx, y: H / 2 + dy, vx: 0, vy: 0, a: p.sq === 0 ? 0 : Math.PI, pausa: 0 }); }
    for (const q of this.portieri) Object.assign(q, { x: portaX(q.sq) + verso(q.sq) * 26, y: H / 2, tiene: 0 });
    Object.assign(this.disco, { x: W / 2 + (sq === 0 ? -14 : 14), y: H / 2, vx: 0, vy: 0, chi: null, ultimo: null, assist: null });
  }

  // ---------- un passo del mondo ----------
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound, d = this.disco;
    if (this.pausaGol > 0) {
      this.pausaGol -= dt;
      if (this.pausaGol <= 0) this.ingaggio(this.ultimoGol === 0 ? 1 : 0);
      return false;
    }
    // input: persone (dal browser), computer (Arena li mette in this.inp), compagni del computer (in 2)
    for (const p of this.g) {
      let ing, azione = 0;
      if (p.k < this.n) { ing = this.inp[p.k]; azione = this.nuoviTocchi(p.k); } else { ing = this.pensaPattinatore(p.k, this.livCompagno); if (ing.tocco) azione = 1; }
      this.pattina(p, ing, dt, this.livelloDi(p.k));
      if (azione) this.azioneDi(p, this.livelloDi(p.k));
    }
    this.urti(dt);
    this.muoviPortieri(dt);
    this.muoviDisco(dt);
    // fine del tempo (in parità: supplementari col gol d'oro)
    if (!this.supplementari && t >= this.durata) {
      if (this.gol[0] !== this.gol[1]) return true;
      this.supplementari = true;
      this.annuncia(null, 'Parità: supplementari! Chi segna vince ⚡', 'Parità: supplementari! Chi segna vince ⚡', true);
    }
    if (this.supplementari && (this.gol[0] !== this.gol[1] || t >= this.durata + SUPPLEMENTARI)) return true;
    return false;
  }
  pattina(p, ing, dt, liv) {
    const L = liv ? LIV[liv] : null;
    let ix = Number(ing.x) || 0, iy = Number(ing.y) || 0;
    const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
    if (p.colpito > 0) { p.colpito -= dt; ix *= 0.3; iy *= 0.3; }
    p.vx += ix * ACC * dt; p.vy += iy * ACC * dt;
    const att = l > 0.1 ? ATTRITO : ATTRITO_FERMO;
    p.vx *= Math.exp(-att * dt); p.vy *= Math.exp(-att * dt);
    const vmax = (this.disco.chi === p.k ? V_CONDISCO : V_MAX) * (L ? L.v : 1) * (this.winOn[p.k] ? 1.25 : 1);
    const v = Math.hypot(p.vx, p.vy);
    if (v > vmax) { p.vx *= vmax / v; p.vy *= vmax / v; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // il bastone guarda dove si vuole andare (si gira in fretta ma non di colpo)
    if (l > 0.2) { const voluto = Math.atan2(iy, ix), da = angolo(voluto - p.a); p.a = angolo(p.a + Math.sign(da) * Math.min(Math.abs(da), 11 * dt)); }
    // balaustre e porte
    const b = dentro(p.x, p.y, R_GIOC);
    if (b) { p.x = b.x; p.y = b.y; const vn = p.vx * b.nx + p.vy * b.ny; if (vn < 0) { p.vx -= 1.4 * vn * b.nx; p.vy -= 1.4 * vn * b.ny; } }
    for (const sq of [0, 1]) {
      const f = fuoriGabbia(p, R_GIOC, gabbia(sq));
      if (f) { p.x += f.nx * f.pen; p.y += f.ny * f.pen; const vn = p.vx * f.nx + p.vy * f.ny; if (vn < 0) { p.vx -= 1.3 * vn * f.nx; p.vy -= 1.3 * vn * f.ny; } }
    }
  }
  bastone(p) { return { x: p.x + Math.cos(p.a) * BASTONE, y: p.y + Math.sin(p.a) * BASTONE }; }
  // il tasto azione: con il disco tira o passa; senza prova a rubarlo
  azioneDi(p, liv) {
    const d = this.disco;
    if (d.chi === p.k) {
      const compagno = this.g.find((q) => q.sq === p.sq && q.k !== p.k);
      const avanti = verso(p.sq), px = portaX(1 - p.sq);
      const aPorta = Math.atan2(H / 2 - p.y, px - p.x), dPorta = Math.hypot(px - p.x, H / 2 - p.y);
      const aComp = Math.atan2(compagno.y - p.y, compagno.x - p.x);
      let dir = p.a, vel = TIRO * 0.9;
      if (Math.abs(angolo(aPorta - p.a)) < 1.05 && dPorta < 620 && (p.x - px) * avanti < 0) {
        // tiro: verso l'angolo della porta più lontano dal portiere
        // il lato del portiere rispetto alla linea tiratore → centro della porta: si tira dall'altra parte
        const port = this.portieri[1 - p.sq];
        const lato = (px - p.x) * (port.y - p.y) - (H / 2 - p.y) * (port.x - p.x) > 0 ? -1 : 1;
        const my = H / 2 + lato * BOCCA * 0.66 * Math.sign(px - p.x || 1);
        dir = Math.atan2(my - p.y, px - p.x); vel = TIRO;
        this.tiro = { k: p.k, t: this.tempoRound };
        this.effetti.push(['t', Math.round(p.x), Math.round(p.y)]);
      } else if (Math.abs(angolo(aComp - p.a)) < 0.75) {
        // passaggio: un po' davanti al compagno, dove sta andando
        const anticipo = Math.hypot(compagno.x - p.x, compagno.y - p.y) / PASSAGGIO;
        dir = Math.atan2(compagno.y + compagno.vy * anticipo - p.y, compagno.x + compagno.vx * anticipo - p.x); vel = PASSAGGIO;
        d.assist = p.k;
      }
      const L = liv ? LIV[liv] : null;
      if (L) dir += (Math.random() - 0.5) * 2 * L.mira;
      d.chi = null; d.ultimo = p.k;
      const s = this.bastone(p);
      d.x = s.x; d.y = s.y;
      // la spinta del pattinatore aiuta solo nella direzione del tiro (così la mira non sbanda)
      const spinta = Math.max(0, p.vx * Math.cos(dir) + p.vy * Math.sin(dir)) * 0.3;
      d.vx = Math.cos(dir) * (vel + spinta); d.vy = Math.sin(dir) * (vel + spinta);
      p.pausa = 0.28; // non lo riprende subito
      return;
    }
    // senza disco: colpo di bastone verso il disco vicino (se lo porta un avversario lo può rubare)
    const s = this.bastone(p);
    if (Math.hypot(d.x - s.x, d.y - s.y) < 34 && (d.chi === null || this.g[d.chi].sq !== p.sq)) {
      const riesce = d.chi === null || (Math.random() < 0.6 && !this.winOn[d.chi]); // a chi ha il trucco non si ruba
      if (riesce) { if (d.chi !== null) { this.annuncia(p.k < this.n ? p.k : null, 'ruba il disco! 🏒', 'disco rubato! 🏒'); this.g[d.chi].pausa = 0.5; } d.chi = p.k; d.ultimo = p.k; d.assist = null; }
      else p.pausa = 0.35;
    }
  }
  urti() {
    const d = this.disco;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const A = this.g[a], B = this.g[b];
      const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy);
      if (dist >= 2 * R_GIOC || dist < 1e-6) continue;
      const nx = dx / dist, ny = dy / dist, sov = 2 * R_GIOC - dist;
      A.x -= (nx * sov) / 2; A.y -= (ny * sov) / 2; B.x += (nx * sov) / 2; B.y += (ny * sov) / 2;
      const vr = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if (vr >= 0) continue;
      const j = -vr * 0.85;
      A.vx -= nx * j * 0.5; A.vy -= ny * j * 0.5; B.vx += nx * j * 0.5; B.vy += ny * j * 0.5;
      // spintone forte tra avversari: chi porta il disco lo perde
      if (-vr > 230 && A.sq !== B.sq) {
        this.effetti.push(['u', Math.round((A.x + B.x) / 2), Math.round((A.y + B.y) / 2)]);
        for (const P of [A, B]) if (d.chi === P.k) { d.chi = null; d.vx = P.vx * 0.6 + (Math.random() - 0.5) * 160; d.vy = P.vy * 0.6 + (Math.random() - 0.5) * 160; P.pausa = 0.45; P.colpito = 0.35; }
      }
    }
  }
  muoviPortieri(dt) {
    const d = this.disco;
    for (const q of this.portieri) {
      const P = PORTIERI[this.livPortieri[q.sq]] || PORTIERI.medio;
      const gx = portaX(q.sq), av = verso(q.sq);
      if (q.tiene > 0) {
        // ha bloccato il disco: dopo un attimo lo passa al compagno più libero
        q.tiene -= dt;
        d.x = q.x + av * (R_PORTIERE + 4); d.y = q.y; d.vx = d.vy = 0;
        if (q.tiene <= 0) {
          const amici = this.g.filter((p) => p.sq === q.sq);
          const scelto = amici.reduce((a, b) => (this.libero(a) > this.libero(b) ? a : b));
          const dir = Math.atan2(scelto.y - d.y, scelto.x - d.x);
          d.vx = Math.cos(dir) * PASSAGGIO * 0.9; d.vy = Math.sin(dir) * PASSAGGIO * 0.9; d.ultimo = null;
        }
        continue;
      }
      // davanti alla porta, sulla linea tra il disco e il centro della porta (con un po' di ritardo)
      if (this.tempoRound >= q.mente.fino) {
        q.mente.fino = this.tempoRound + P.lento;
        const a = Math.max(-1.15, Math.min(1.15, Math.atan2(d.y - H / 2, (d.x - gx) * av)));
        const r = 24 + Math.min(16, Math.abs(d.x - gx) / 30);
        q.mente.tx = gx + av * Math.cos(a) * r; q.mente.ty = H / 2 + Math.sin(a) * r;
      }
      const dx = q.mente.tx - q.x, dy = q.mente.ty - q.y, l = Math.hypot(dx, dy), passo = P.v * dt;
      if (l > passo) { q.x += (dx / l) * passo; q.y += (dy / l) * passo; } else { q.x = q.mente.tx; q.y = q.mente.ty; }
    }
  }
  // quanto è libero un pattinatore (distanza dall'avversario più vicino)
  libero(p) { return Math.min(...this.g.filter((q) => q.sq !== p.sq).map((q) => Math.hypot(q.x - p.x, q.y - p.y))); }
  muoviDisco(dt) {
    const d = this.disco;
    if (this.portieri.some((q) => q.tiene > 0)) return;
    for (const p of this.g) p.pausa = Math.max(0, p.pausa - dt);
    if (d.chi !== null) {
      // portato col bastone: sta davanti al pattinatore
      const p = this.g[d.chi], s = this.bastone(p);
      const px = d.x, py = d.y;
      d.x = s.x; d.y = s.y; d.vx = (d.x - px) / dt; d.vy = (d.y - py) / dt;
      const b = dentro(d.x, d.y, R_DISCO);
      if (b) { d.x = b.x; d.y = b.y; }
      // gli avversari col bastone vicino al disco possono rubarlo (i computer: secondo il livello)
      for (const q of this.g) {
        if (q.sq === p.sq || q.pausa > 0 || this.winOn[p.k]) continue;
        const sq = this.bastone(q);
        if (Math.hypot(sq.x - d.x, sq.y - d.y) > 18) continue;
        const liv = this.livelloDi(q.k), prob = (liv ? LIV[liv].ruba : 1.6) * dt;
        if (Math.random() < prob) { d.chi = q.k; d.ultimo = q.k; d.assist = null; p.pausa = 0.5; this.annuncia(q.k < this.n ? q.k : null, 'ruba il disco! 🏒', 'disco rubato! 🏒'); break; }
      }
      return;
    }
    // libero: scivola, rimbalza, entra in porta o lo prende qualcuno
    const passi = Math.max(1, Math.ceil((Math.hypot(d.vx, d.vy) * dt) / 5));
    for (let i = 0; i < passi; i++) {
      const h = dt / passi, x0 = d.x;
      d.x += d.vx * h; d.y += d.vy * h;
      // gol: il disco attraversa la linea di porta tra i pali, venendo da davanti
      for (const sq of [0, 1]) {
        const gx = portaX(sq), av = verso(sq);
        if ((x0 - gx) * av > 0 && (d.x - gx) * av <= 0 && Math.abs(d.y - H / 2) < BOCCA - R_DISCO) return this.segna(1 - sq);
      }
      const b = dentro(d.x, d.y, R_DISCO);
      if (b) { d.x = b.x; d.y = b.y; const vn = d.vx * b.nx + d.vy * b.ny; if (vn < 0) { d.vx -= (1 + RIMBALZO) * vn * b.nx; d.vy -= (1 + RIMBALZO) * vn * b.ny; } }
      for (const sq of [0, 1]) {
        // la bocca della porta è aperta: davanti, tra i pali, il disco passa (e poi è gol)
        if (Math.abs(d.y - H / 2) < BOCCA - R_DISCO && (d.x - portaX(sq)) * verso(sq) >= 0) continue;
        const f = fuoriGabbia(d, R_DISCO, gabbia(sq));
        if (f) { d.x += f.nx * f.pen; d.y += f.ny * f.pen; const vn = d.vx * f.nx + d.vy * f.ny; if (vn < 0) { d.vx -= 1.6 * vn * f.nx; d.vy -= 1.6 * vn * f.ny; } }
      }
      // parata: il disco contro il portiere
      for (const q of this.portieri) {
        const dx = d.x - q.x, dy = d.y - q.y, dist = Math.hypot(dx, dy);
        if (dist >= R_PORTIERE + R_DISCO) continue;
        if (this.tiro && this.winOn[this.tiro.k] && this.tempoRound - this.tiro.t < 1.5 && this.squadra(this.tiro.k) !== q.sq) continue; // !win + parola segreta: il tiro entra
        const v = Math.hypot(d.vx, d.vy);
        const nx = dx / (dist || 1), ny = dy / (dist || 1);
        d.x = q.x + nx * (R_PORTIERE + R_DISCO); d.y = q.y + ny * (R_PORTIERE + R_DISCO);
        if (v < 330) { q.tiene = 0.7; d.vx = d.vy = 0; } // lo blocca
        else { const vn = d.vx * nx + d.vy * ny; d.vx -= 1.5 * vn * nx; d.vy -= 1.5 * vn * ny; d.vx *= 0.55; d.vy *= 0.55; }
        if (this.tiro && this.tempoRound - this.tiro.t < 1.5 && this.squadra(this.tiro.k) !== q.sq) { this.effetti.push(['p', Math.round(q.x), Math.round(q.y)]); this.tiro = null; }
        break;
      }
    }
    d.vx *= Math.exp(-ATTRITO_DISCO * dt); d.vy *= Math.exp(-ATTRITO_DISCO * dt);
    const v = Math.hypot(d.vx, d.vy);
    if (v > V_DISCO_MAX) { d.vx *= V_DISCO_MAX / v; d.vy *= V_DISCO_MAX / v; }
    // chi ha il bastone sul disco lo prende (se il disco non è troppo veloce)
    let meglio = null, md = 19;
    for (const p of this.g) {
      if (p.pausa > 0) continue;
      const s = this.bastone(p), dist = Math.min(Math.hypot(s.x - d.x, s.y - d.y), Math.hypot(p.x - d.x, p.y - d.y) - 3);
      const rel = Math.hypot(d.vx - p.vx, d.vy - p.vy);
      if (dist < md && rel < 760) { md = dist; meglio = p; }
    }
    if (meglio) { if (d.ultimo !== null && this.g[d.ultimo].sq !== meglio.sq) d.assist = null; d.chi = meglio.k; d.ultimo = meglio.k; }
  }
  segna(sq) {
    const d = this.disco;
    this.gol[sq]++;
    for (let p = 0; p < this.n; p++) this.punti[p] = this.gol[p % 2];
    const chi = d.ultimo !== null && this.g[d.ultimo].sq === sq ? d.ultimo : null;
    const nome = ['Rossi', 'Blu'][sq];
    if (chi !== null && chi < this.n && T.consuma(this, chi)) this.winOn[chi] = false; // il trucco vale fino al gol
    if (chi !== null && chi < this.n) this.annuncia(chi, `segna! 🚨 ${this.gol[0]}–${this.gol[1]}`, `gol! 🚨 ${this.gol[0]}–${this.gol[1]}`, true);
    else this.annuncia(null, `Gol dei ${nome}! 🚨 ${this.gol[0]}–${this.gol[1]}`, `Gol dei ${nome}! 🚨 ${this.gol[0]}–${this.gol[1]}`, true);
    this.effetti.push(['g', sq]);
    d.chi = null; d.vx *= 0.15; d.vy *= 0.15;
    this.ultimoGol = sq;
    this.pausaGol = this.supplementari ? 0.01 : PAUSA_GOL;
    this.cambiato = true;
    return false;
  }
  fineRound() {
    fineWin(this);
    for (let p = 0; p < this.n; p++) this.punti[p] = this.gol[p % 2];
    if (this.gol[0] === this.gol[1]) this.annuncia(null, `Finisce pari: ${this.gol[0]}–${this.gol[1]}`, `Finisce pari: ${this.gol[0]}–${this.gol[1]}`, true);
  }
  chiudi() {
    this.finita = true; this.fase = 'fine';
    const fazioni = [0, 1].map((sq) => ({ posti: Array.from({ length: this.n }, (_, p) => p).filter((p) => p % 2 === sq), punti: this.gol[sq] }));
    const pari = this.gol[0] === this.gol[1];
    this.risultato = { fazioni, etichetta: 'gol', pareggio: pari, vincitori: pari ? [] : fazioni[this.gol[0] > this.gol[1] ? 0 : 1].posti };
  }

  // ---------- il computer ----------
  pensa(p, liv) { return this.pensaPattinatore(p, liv); }
  pensaPattinatore(k, liv) {
    const p = this.g[k], L = LIV[liv] || LIV.medio, d = this.disco, m = p.mente;
    if (this.pausaGol > 0) return { x: 0, y: 0 };
    if (this.tempoRound < m.fino) { const r = { ...m.ingresso, tocco: m.tocco }; m.tocco = false; return r; }
    m.fino = this.tempoRound + L.reazione * (0.7 + Math.random() * 0.6);
    const av = verso(p.sq), mia = d.chi !== null && this.g[d.chi].sq === p.sq, loro = d.chi !== null && !mia;
    const compagno = this.g.find((q) => q.sq === p.sq && q.k !== k);
    const avversari = this.g.filter((q) => q.sq !== p.sq);
    const vai = (x, y, piano = 1) => { const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy); return l < 6 ? { x: 0, y: 0 } : { x: (dx / l) * Math.min(1, (l / 60) * piano + 0.15), y: (dy / l) * Math.min(1, (l / 60) * piano + 0.15) }; };
    let ing = { x: 0, y: 0 }, tocco = false;
    const gx = portaX(1 - p.sq), mx = portaX(p.sq);
    if (d.chi === k) {
      // ho il disco: verso la porta, evitando chi è davanti; tiro quando sono abbastanza vicino e la guardo
      const dPorta = Math.hypot(gx - p.x, H / 2 - p.y);
      const davanti = avversari.filter((q) => (q.x - p.x) * av > 0 && Math.hypot(q.x - p.x, q.y - p.y) < 110);
      let ty = H / 2 + (p.y > H / 2 ? 70 : -70), tx = gx - av * 120;
      if (davanti.length) { const q = davanti[0]; ty = p.y + (p.y > q.y ? 1 : -1) * 120; tx = p.x + av * 120; }
      ing = vai(tx, Math.max(60, Math.min(H - 60, ty)));
      const guarda = Math.abs(angolo(Math.atan2(H / 2 - p.y, gx - p.x) - p.a)) < 0.9;
      const dietroPorta = (p.x - gx) * av > -20;
      if (dietroPorta) ing = vai(gx - av * 160, H / 2 + (p.y > H / 2 ? 90 : -90));
      if (dPorta < L.tiraDa && guarda && !dietroPorta) tocco = true;
      else {
        // passaggio al compagno libero e più avanti, se qualcuno mi sta addosso
        const pressato = avversari.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 60);
        const avanti = (compagno.x - p.x) * av > 30 && this.libero(compagno) > 90;
        if (pressato && avanti && Math.random() < L.passa) {
          const aComp = Math.atan2(compagno.y - p.y, compagno.x - p.x);
          ing = { x: Math.cos(aComp), y: Math.sin(aComp) };
          if (Math.abs(angolo(aComp - p.a)) < 0.6) tocco = true;
        }
      }
    } else if (mia) {
      // il compagno ha il disco: mi smarco più avanti, dalla parte opposta
      const c = this.g[d.chi];
      ing = vai(Math.max(150, Math.min(W - 150, c.x + av * 170)), c.y > H / 2 ? H * 0.3 : H * 0.7);
    } else {
      // disco libero o degli avversari: il più vicino lo insegue (anticipando), l'altro torna a difendere
      const io = Math.hypot(d.x - p.x, d.y - p.y), lui = Math.hypot(d.x - compagno.x, d.y - compagno.y);
      if (io <= lui || (loro && io < 140)) {
        const an = Math.min(0.5, io / 600);
        const tx = d.x + d.vx * an, ty = d.y + d.vy * an;
        // si arriva sul disco col bastone: un po' dalla parte della propria porta
        ing = vai(tx - av * 10, ty, 3);
        const s = this.bastone(p);
        if (loro && Math.hypot(s.x - d.x, s.y - d.y) < 30 && Math.random() < L.ruba * 0.25) tocco = true;
      } else {
        // difesa: tra il disco e la propria porta
        const k2 = 0.45;
        ing = vai(mx + (d.x - mx) * k2 + av * 60, H / 2 + (d.y - H / 2) * 0.6);
      }
    }
    m.ingresso = ing; m.tocco = false;
    return { ...ing, tocco };
  }

  vistaExtra() { return { W, H, RAGGIO_ANGOLO, LINEA_PORTA, BOCCA, PROF_PORTA, R_GIOC, R_DISCO, R_PORTIERE, BASTONE, durata: this.durata }; }
  statoTick() {
    const r = (v) => Math.round(v);
    const eff = this.effetti; this.effetti = [];
    const d = this.disco;
    return {
      p: this.g.map((p) => [r(p.x), r(p.y), Math.round(p.a * 100) / 100, Math.round(Math.hypot(p.vx, p.vy))]),
      q: this.portieri.map((q) => [r(q.x), r(q.y), q.tiene > 0 ? 1 : 0]),
      d: [r(d.x), r(d.y), d.chi === null ? -1 : d.chi],
      g: this.gol, ot: this.supplementari ? 1 : 0,
      tr: Math.max(0, Math.ceil((this.supplementari ? this.durata + SUPPLEMENTARI : this.durata) - this.tempoRound)),
      pg: this.pausaGol > 0 ? 1 : 0, ug: this.ultimoGol, e: eff,
    };
  }
}

module.exports = {
  meta: {
    id: 'hockey',
    nome: 'Hockey su ghiaccio',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 4],
    descrizione: 'Due contro due sul ghiaccio, con i portieri: pattina, passa, ruba il disco e tira in porta. In 2 ognuno ha un compagno del computer.',
    alias: ['hockey', 'hockey su ghiaccio', 'ghiaccio', 'disco', 'pattini', 'ice hockey', 'nhl'],
    opzioni: [
      { id: 'durata', nome: 'Durata', valori: [3, 5, 2], etichette: ['3 minuti', '5 minuti', '2 minuti'], predefinito: 3 },
    ],
    regole: [
      'Due squadre, i Rossi (attaccano verso destra) e i Blu (verso sinistra), con due pattinatori e un portiere ciascuna. In 4 ognuno comanda il suo pattinatore (i compagni sono i posti 1 e 3 contro 2 e 4); in 2 ognuno ha un compagno comandato dal computer. I portieri li muove il gioco.',
      'Ti muovi con WASD o le frecce (sul telefono col joystick). Sul ghiaccio si scivola: si accelera piano e ci si ferma piano. Il bastone guarda dove vai.',
      'Passando sul disco lo prendi col bastone. Il tasto azione (spazio, o 🏒 sul telefono): se guardi la porta avversaria TIRI (verso l\'angolo lontano dal portiere); se guardi il compagno gli PASSI il disco; altrimenti lo lanci dritto davanti a te.',
      'Senza disco, il tasto azione è un colpo di bastone: se il disco è vicino lo prendi, anche a un avversario (non sempre riesce). Con il bastone vicino al disco di un avversario si può anche rubarlo. Uno spintone forte fa perdere il disco a chi lo porta.',
      'Il disco rimbalza sulle balaustre e si può girare dietro le porte. Il portiere para: i tiri lenti li blocca e poi passa il disco a un compagno, quelli forti li respinge.',
      'Dopo ogni gol si riparte con l\'ingaggio al centro. Si gioca 3 minuti (o 2, o 5): vince chi ha segnato di più. In parità si giocano fino a 60 secondi di supplementari col gol d\'oro; se nessuno segna è pari.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile pattina piano, reagisce tardi e tira storto; il medio passa il disco quando è pressato; il difficile è veloce, ruba spesso il disco, passa al compagno libero e tira preciso nell\'angolo.',
    ],
  },
  crea: (o) => new Hockey(o),
  bot: () => ({}),
  _test: { Hockey, W, H, dentro, gabbia, fuoriGabbia, LINEA_PORTA, BOCCA, portaX },
};
