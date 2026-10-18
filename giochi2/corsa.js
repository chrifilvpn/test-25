// CORSA DI MACCHININE: piste chiuse viste dall'alto, da 2 a 6 macchine (i posti vuoti li fa il computer). Fisica
// semplice: acceleratore, freno (e retromarcia), sterzo, derapata quando si gira forte (o col freno a mano), l'erba
// fa rallentare, le macchine si urtano. Partenza col semaforo, giri a scelta, checkpoint lungo la pista (niente
// scorciatoie: un giro vale solo se si passa da tutti), classifica dal vivo. Il computer segue la linea ideale.
// PISTA DISEGNATA: prima della gara chi ha aperto il tavolo disegna un giro col mouse o col dito; il server lo liscia
// (punti a distanza costante, curva morbida), lo ingrandisce a tutta la mappa e controlla che l'asfalto non si
// sovrapponga e che le curve non siano troppo strette. Se tutti i posti sono del computer (o il tempo finisce) la
// pista la inventa il gioco.
const { Arena } = require('../giochi/arena');

// ---------- le piste: punti di controllo di una curva chiusa (Catmull-Rom), larghezza ----------
const PISTE = {
  parco: { nome: 'Anello del parco', larga: 170, punti: [[700, 380], [1500, 330], [2300, 380], [2780, 640], [2900, 1050], [2700, 1480], [2150, 1700], [1500, 1560], [900, 1720], [430, 1520], [250, 1050], [380, 620]] },
  citta: { nome: 'Giro della città', larga: 150, punti: [[450, 300], [1400, 300], [1560, 420], [1580, 860], [1720, 1000], [2600, 1000], [2760, 1140], [2760, 1680], [2600, 1820], [1500, 1820], [1300, 1640], [1100, 1820], [450, 1820], [300, 1660], [300, 460]] },
  collina: { nome: 'Collina tortuosa', larga: 145, punti: [[350, 1050], [520, 520], [1000, 300], [1450, 520], [1600, 980], [2000, 1180], [2420, 900], [2700, 450], [3150, 520], [3300, 1000], [3100, 1550], [2550, 1820], [1900, 1650], [1350, 1850], [800, 1800], [420, 1500]] },
  porto: { nome: 'Molo del porto', larga: 160, punti: [[400, 400], [2600, 400], [2900, 650], [2700, 950], [1300, 950], [1100, 1150], [1300, 1350], [2700, 1350], [2900, 1650], [2600, 1900], [400, 1900], [200, 1600], [200, 700]] },
};
const PASSO_C = 20; // distanza tra i punti della linea di mezzo
// la linea di mezzo, con punti a distanza costante: la stessa funzione è nel browser (public/js/giochi2/corsa.js)
function lineaDi(punti) {
  const n = punti.length, fitta = [];
  for (let i = 0; i < n; i++) {
    const p0 = punti[(i - 1 + n) % n], p1 = punti[i], p2 = punti[(i + 1) % n], p3 = punti[(i + 2) % n];
    const passi = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 8));
    for (let k = 0; k < passi; k++) {
      const t = k / passi, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      fitta.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  // ricampiona a passo costante
  let tot = 0; const lun = [0];
  for (let i = 1; i <= fitta.length; i++) { const a = fitta[i - 1], b = fitta[i % fitta.length]; tot += Math.hypot(b[0] - a[0], b[1] - a[1]); lun.push(tot); }
  const N = Math.round(tot / PASSO_C), out = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = (k / N) * tot;
    while (lun[j + 1] < s) j++;
    const a = fitta[j], b = fitta[(j + 1) % fitta.length], u = (s - lun[j]) / Math.max(1e-9, lun[j + 1] - lun[j]);
    out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });
  }
  for (let i = 0; i < N; i++) {
    const a = out[(i - 1 + N) % N], b = out[(i + 1) % N], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    out[i].tx = (b.x - a.x) / l; out[i].ty = (b.y - a.y) / l; out[i].nx = -out[i].ty; out[i].ny = out[i].tx;
  }
  return out;
}
// ---------- piste disegnate ----------
const MONDO_W = 3300, MONDO_H = 2150, BORDO = 330, LARGA_DIS = 160, SPAZIO_DIS = 230, TEMPO_DISEGNO = 150000;
// la pista va bene? L'asfalto non si tocca con un altro pezzo di pista e le curve non sono più strette della pista
function controllaPista(punti, larga = LARGA_DIS) {
  const C = lineaDi(punti), N = C.length;
  if (N * PASSO_C < 4200) return { errore: 'La pista è troppo corta: disegna un giro più lungo' };
  const salto = Math.ceil((larga * Math.PI) / PASSO_C); // più lontani di mezzo giro di curva stretta
  for (let i = 0; i < N; i++) {
    for (let j = i + salto; j < N; j++) {
      if (N - (j - i) < salto) break;
      if ((C[i].x - C[j].x) ** 2 + (C[i].y - C[j].y) ** 2 < (larga * 1.3) ** 2) return { errore: 'La pista si incrocia o due tratti sono troppo vicini: disegna un giro che non si tocca' };
    }
  }
  for (let i = 0; i < N; i++) {
    const a = C[(i - 3 + N) % N], b = C[(i + 3) % N];
    const k = Math.abs(angolo(Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx))) / (6 * PASSO_C);
    if (k > 1 / (larga * 0.5)) return { errore: 'C\'è una curva troppo stretta: disegna curve più larghe' };
  }
  return { ok: true };
}
// dal tratto disegnato (punti tra 0 e 1 nel riquadro del disegno) ai punti di controllo della pista
function dalDisegno(tratto) {
  if (!Array.isArray(tratto) || tratto.length < 10 || tratto.length > 2000) return { errore: 'Disegna un giro intero, tenendo premuto' };
  const pt = [];
  for (const q of tratto) {
    if (!Array.isArray(q) || !Number.isFinite(q[0]) || !Number.isFinite(q[1])) return { errore: 'Disegno non valido' };
    pt.push([Math.max(-0.2, Math.min(1.2, q[0])) * MONDO_W, Math.max(-0.2, Math.min(1.2, q[1])) * MONDO_H]);
  }
  // ingrandito (o rimpicciolito) per riempire la mappa, al centro
  const xs = pt.map((q) => q[0]), ys = pt.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (Math.max(x1 - x0, y1 - y0) < 60) return { errore: 'Disegno troppo piccolo' };
  const s = Math.min((MONDO_W - 2 * BORDO) / Math.max(1, x1 - x0), (MONDO_H - 2 * BORDO) / Math.max(1, y1 - y0), 6);
  const ox = (MONDO_W - (x1 - x0) * s) / 2, oy = (MONDO_H - (y1 - y0) * s) / 2;
  const mondo = pt.map((q) => [ox + (q[0] - x0) * s, oy + (q[1] - y0) * s]);
  // il giro si chiude da solo; il tratto si ricampiona a distanza costante (così la curva viene morbida)
  if (Math.hypot(mondo[0][0] - mondo[mondo.length - 1][0], mondo[0][1] - mondo[mondo.length - 1][1]) > (MONDO_W + MONDO_H) * 0.22) return { errore: 'Chiudi il giro: finisci vicino a dove hai cominciato' };
  mondo.push(mondo[0]);
  let tot = 0; const lun = [0];
  for (let i = 1; i < mondo.length; i++) { tot += Math.hypot(mondo[i][0] - mondo[i - 1][0], mondo[i][1] - mondo[i - 1][1]); lun.push(tot); }
  const K = Math.max(8, Math.min(48, Math.round(tot / SPAZIO_DIS)));
  const punti = [];
  let j = 0;
  for (let k = 0; k < K; k++) {
    const d = (k / K) * tot;
    while (lun[j + 1] < d) j++;
    const a = mondo[j], b = mondo[j + 1], u = (d - lun[j]) / Math.max(1e-9, lun[j + 1] - lun[j]);
    punti.push([Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u)]);
  }
  const c = controllaPista(punti);
  return c.errore ? c : { punti };
}
// una pista inventata: un giro "a stella" con raggi a caso intorno al centro, finché non va bene
function pistaACaso() {
  for (let t = 0; t < 400; t++) {
    const K = 9 + Math.floor(Math.random() * 6), rx = (MONDO_W - 2 * BORDO) / 2, ry = (MONDO_H - 2 * BORDO) / 2;
    const punti = [];
    for (let k = 0; k < K; k++) {
      const a = ((k + (Math.random() - 0.5) * 0.5) / K) * Math.PI * 2, r = 0.5 + Math.random() * 0.5;
      punti.push([Math.round(MONDO_W / 2 + Math.cos(a) * rx * r), Math.round(MONDO_H / 2 + Math.sin(a) * ry * r)]);
    }
    if (Math.random() < 0.5) punti.reverse();
    if (controllaPista(punti).ok) return punti;
  }
  return PISTE.parco.punti;
}
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

const ACC = 560, FRENO = 1300, RETRO = 190, V_MAX = 640, V_ERBA = 250, STERZO = 2.7, R_AUTO = 19;
const SEMAFORO = 3, VERDE = SEMAFORO, N_CP = 8, FUORI = 130;
// i computer: quanto spingono (velocità massima), quanta tenuta in curva pensano di avere, quanto sbagliano
const LIV = {
  facile: { vmax: 0.74, presa: 560, rumore: 0.18, linea: 0.2, ogni: 0.16, errore: 0.012 },
  medio: { vmax: 0.88, presa: 760, rumore: 0.07, linea: 0.6, ogni: 0.09, errore: 0.004 },
  difficile: { vmax: 0.995, presa: 930, rumore: 0.015, linea: 1, ogni: 0.04, errore: 0 },
};

class Corsa extends Arena {
  constructor(o) {
    super(o, { id: 'corsa', round: 1, tickMs: 33 });
    this.nRound = 1;
    this.W = 1000; this.H = 640;
    const op = o.opzioni || {};
    this.idPista = PISTE[op.pista] || op.pista === 'disegnata' ? op.pista : 'parco';
    this.nGiri = [3, 5, 1].includes(Number(op.giri)) ? Number(op.giri) : 3;
    this.collisioni = op.urti !== 'no';
    this.etichettaPunti = 'punti';
    if (this.idPista === 'disegnata') {
      // prima si disegna: la pista la disegna la prima persona al tavolo (con soli computer la inventa il gioco)
      this.disegnatore = this.bot.findIndex((b) => !b);
      if (this.disegnatore < 0) { this.usaPista(pistaACaso(), 'Pista inventata'); this.avvia(); return; }
      this.fase = 'disegno'; this.bozza = null; this.fineDisegno = Date.now() + TEMPO_DISEGNO;
      return;
    }
    this.usaPista(PISTE[this.idPista].punti, PISTE[this.idPista].nome, PISTE[this.idPista].larga);
    this.avvia();
  }
  usaPista(punti, nome, larga = LARGA_DIS) {
    this.pista = { nome, larga, punti };
    this.C = lineaDi(punti);
    this.N = this.C.length;
    this.mezza = larga / 2;
    this.porte = Array.from({ length: N_CP }, (_, k) => Math.floor((k * this.N) / N_CP));
    this.preparaLinea();
  }
  // ---- il disegno della pista (solo con la pista disegnata, prima della gara) ----
  azione(p, a) {
    if (this.fase !== 'disegno') return { errore: 'La gara è già cominciata' };
    if (p !== this.disegnatore) return { errore: 'La pista la disegna chi ha aperto il tavolo' };
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    if (a.tipo === 'traccia') { const r = dalDisegno(a.punti); if (r.errore) return r; this.bozza = r.punti; return { ok: true }; }
    if (a.tipo === 'caso') { this.bozza = pistaACaso(); return { ok: true }; }
    if (a.tipo === 'cancella') { this.bozza = null; return { ok: true }; }
    if (a.tipo === 'via') {
      if (!this.bozza) return { errore: 'Prima disegna la pista' };
      this.partiDisegnata();
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }
  partiDisegnata() {
    this.usaPista(this.bozza || pistaACaso(), this.bozza ? 'Pista disegnata' : 'Pista inventata');
    this.annuncia(this.disegnatore, 'ha disegnato la pista: si parte! ✏️🏁', 'la tua pista è pronta: si parte! ✏️🏁', true);
    this.avvia();
  }
  tick(ora) {
    if (this.fase === 'disegno') {
      if (this.finita || this.inPausa) return false;
      // tempo finito, o chi disegnava è uscito (al suo posto c'è il computer): si parte con la bozza o una pista a caso
      if (ora >= this.fineDisegno || this.bot[this.disegnatore]) { this.partiDisegnata(); return true; }
      return false;
    }
    return super.tick(ora);
  }
  impostaPausa(si) {
    if (this.fase === 'disegno') { if (si !== this.inPausa && !si && this.pausaDal) this.fineDisegno += Date.now() - this.pausaDal; this.pausaDal = si ? Date.now() : null; this.inPausa = si; return; }
    super.impostaPausa(si);
  }
  vistaTick(posto) {
    if (this.fase === 'disegno') return { ts: Date.now(), fase: 'disegno', round: 0, pausa: this.inPausa, via: 0, t: 0, s: null };
    return super.vistaTick(posto);
  }
  // la linea ideale: verso l'interno delle curve (curvatura media dei punti vicini), e la curvatura che serve
  // al computer per sapere quanto frenare
  preparaLinea() {
    const N = this.N, C = this.C;
    const curv = C.map((p, i) => { const a = C[(i - 3 + N) % N], b = C[(i + 3) % N]; return angolo(Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx)) / (6 * PASSO_C); });
    this.curv = curv.map((_, i) => { let s = 0; for (let k = -6; k <= 6; k++) s += curv[(i + k + N) % N]; return s / 13; });
    this.spost = this.curv.map((_, i) => { let s = 0; for (let k = -2; k <= 14; k++) s += this.curv[(i + k + N) % N]; return Math.max(-0.62, Math.min(0.62, (s / 17) * 260)) * this.mezza; });
  }
  nuovoRound(ora) { super.nuovoRound(ora); this.fineFase = ora + 1200; } // il conto alla rovescia vero è il semaforo
  iniziaRound() {
    const N = this.N;
    this.auto = Array.from({ length: this.n }, (_, i) => {
      const fila = Math.floor(i / 2), lato = i % 2 ? 1 : -1;
      const k = (N - 3 - fila * 4) % N, c = this.C[k];
      const x = c.x + c.nx * lato * this.mezza * 0.42 - c.tx * (i % 2) * 26, y = c.y + c.ny * lato * this.mezza * 0.42 - c.ty * (i % 2) * 26;
      return { id: i, x, y, a: Math.atan2(c.ty, c.tx), vx: 0, vy: 0, sterzo: 0, idx: k, giri: -1, cp: N_CP - 1, fine: null, deriva: 0, erba: false, contromano: 0, urto: 0, bloccato: 0 };
    });
    this.arrivati = [];
    this.primoArrivo = null;
    this.mente = {};
    this.urti = [];
    this.cambiato = true;
  }
  spostaTempi() {}

  // il punto della linea di mezzo più vicino (cerca vicino all'ultimo, la pista non si "salta")
  vicino(c) {
    let meglio = c.idx, dm = Infinity;
    for (let k = -30; k <= 30; k++) { const i = (c.idx + k + this.N) % this.N, p = this.C[i], d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < dm) { dm = d; meglio = i; } }
    return [meglio, Math.sqrt(dm)];
  }
  avanti(da, a) { return (a - da + this.N) % this.N; }
  progresso(c) {
    if (c.fine !== null) return 1e9 - c.fine;
    const da = this.porte[c.cp], verso = this.porte[(c.cp + 1) % N_CP];
    const tratto = this.avanti(da, verso) || this.N;
    const frac = Math.min(0.999, this.avanti(da, c.idx) / tratto);
    return c.giri * N_CP + c.cp + (this.avanti(da, c.idx) > tratto * 1.5 ? 0 : frac);
  }
  classifica() { return this.auto.slice().sort((a, b) => this.progresso(b) - this.progresso(a)).map((c) => c.id); }

  guidaAuto(c, ingresso, dt, liv) {
    const via = this.tempoRound >= SEMAFORO;
    let gas = 0, freno = 0, sterzo = 0, manoFreno = false;
    if (via && c.fine === null) { gas = Math.max(0, -ingresso.y); freno = Math.max(0, ingresso.y); sterzo = Math.max(-1, Math.min(1, ingresso.x)); manoFreno = !!ingresso.a; }
    if (c.fine !== null) freno = 0.4;
    const dir = [Math.cos(c.a), Math.sin(c.a)], nor = [-dir[1], dir[0]];
    let vf = c.vx * dir[0] + c.vy * dir[1], vl = c.vx * nor[0] + c.vy * nor[1];
    const [i, d] = this.vicino(c);
    const erba = d > this.mezza;
    c.erba = erba;
    const vmax = (erba ? V_ERBA : V_MAX) * (liv ? LIV[liv].vmax : 1);
    // motore e freni
    if (gas > 0.05) { if (vf < vmax) vf = Math.min(vmax, vf + ACC * gas * dt * (vf < 0 ? 2 : 1)); }
    if (freno > 0.05) { if (vf > 15) vf = Math.max(0, vf - FRENO * freno * dt); else vf = Math.max(-RETRO, vf - ACC * 0.6 * freno * dt); }
    if (gas <= 0.05 && freno <= 0.05) vf *= Math.exp(-0.45 * dt);
    if (vf > vmax) vf = Math.max(vmax, vf - (erba ? 900 : 400) * dt); // sull'erba si rallenta in fretta
    if (manoFreno) vf *= Math.exp(-0.9 * dt);
    // sterzo (morbido) e derapata: la parte di velocità di lato si perde piano se si gira forte o col freno a mano
    c.sterzo += (sterzo - c.sterzo) * Math.min(1, dt * 10);
    const vel = Math.abs(vf);
    const giro = c.sterzo * STERZO * Math.min(1, vel / 140) * (1 - 0.32 * Math.min(1, vel / V_MAX)) * Math.sign(vf || 1) * (manoFreno ? 1.35 : 1);
    c.a = angolo(c.a + giro * dt);
    const presa = manoFreno ? 1.6 : erba ? 3.5 : Math.abs(vl) > 120 ? 4.2 : 9;
    vl *= Math.exp(-presa * dt);
    c.deriva = Math.abs(vl) > 70 ? Math.min(1, Math.abs(vl) / 220) : 0;
    const nd = [Math.cos(c.a), Math.sin(c.a)], nn = [-nd[1], nd[0]];
    c.vx = nd[0] * vf + nn[0] * vl; c.vy = nd[1] * vf + nn[1] * vl;
    c.x += c.vx * dt; c.y += c.vy * dt;
    // il guard-rail oltre l'erba
    const p = this.C[i];
    const lat = (c.x - p.x) * p.nx + (c.y - p.y) * p.ny;
    if (Math.abs(lat) > this.mezza + FUORI) {
      const s = Math.sign(lat), troppo = Math.abs(lat) - (this.mezza + FUORI);
      c.x -= p.nx * s * troppo; c.y -= p.ny * s * troppo;
      const vn = c.vx * p.nx * s + c.vy * p.ny * s;
      if (vn > 0) { c.vx -= p.nx * s * vn * 1.4; c.vy -= p.ny * s * vn * 1.4; c.vx *= 0.75; c.vy *= 0.75; if (vn > 150) this.urti.push([Math.round(c.x), Math.round(c.y)]); }
    }
    this.aggiornaGiro(c);
  }
  aggiornaGiro(c) {
    const prima = c.idx;
    const [i, d] = this.vicino(c);
    if (d > this.mezza + FUORI + 40) return;
    c.idx = i;
    const passo = this.avanti(prima, i);
    if (passo === 0 || passo > this.N / 2) return; // fermi o all'indietro
    // le porte attraversate (in ordine): l'ultima è il traguardo
    const prossima = (c.cp + 1) % N_CP;
    const g = this.porte[prossima];
    if (this.avanti(prima, g) <= passo && this.avanti(prima, g) > 0 || (g === i)) {
      if (prossima === 0) {
        c.giri++; c.cp = 0;
        if (c.giri >= 1 && c.giri < this.nGiri && c.id < this.n) this.cambiato = true;
        if (c.giri >= this.nGiri && c.fine === null) {
          c.fine = this.tempoRound; this.arrivati.push(c.id); this.cambiato = true;
          if (this.primoArrivo === null) this.primoArrivo = this.tempoRound;
          const pos = this.arrivati.length;
          this.annuncia(c.id, pos === 1 ? `vince la corsa! 🏁🏆 (${this.tempo(c.fine)})` : `arriva ${pos}° 🏁`, pos === 1 ? `hai vinto la corsa! 🏁🏆 (${this.tempo(c.fine)})` : `sei arrivato ${pos}° 🏁`, pos === 1);
        }
      } else c.cp = prossima;
    }
  }
  tempo(t) { const s = t - SEMAFORO; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; }
  // urti tra macchine: cerchi che si spingono
  urtiTraAuto() {
    for (let a = 0; a < this.n; a++) for (let b = a + 1; b < this.n; b++) {
      const A = this.auto[a], B = this.auto[b];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d >= R_AUTO * 2 || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, sov = R_AUTO * 2 - d;
      A.x -= nx * sov / 2; A.y -= ny * sov / 2; B.x += nx * sov / 2; B.y += ny * sov / 2;
      const vr = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if (vr < 0) {
        const j = -vr * 0.75;
        A.vx -= nx * j; A.vy -= ny * j; B.vx += nx * j; B.vy += ny * j;
        if (-vr > 90) { this.urti.push([Math.round((A.x + B.x) / 2), Math.round((A.y + B.y) / 2)]); A.urto = B.urto = 0.3; }
      }
    }
  }
  passo(dt) {
    const t = this.tempoRound;
    for (let k = 0; k < 2; k++) {
      for (let p = 0; p < this.n; p++) this.guidaAuto(this.auto[p], this.inp[p], dt / 2, this.bot[p]);
      if (this.collisioni) this.urtiTraAuto();
    }
    for (const c of this.auto) {
      c.urto = Math.max(0, c.urto - dt);
      // contromano: si va al contrario della pista
      const p = this.C[c.idx], v = Math.hypot(c.vx, c.vy);
      c.contromano = v > 80 && (c.vx * p.tx + c.vy * p.ty) / v < -0.5 ? c.contromano + dt : 0;
    }
    if (this.arrivati.length === this.n) return true;
    if (this.primoArrivo !== null && t > this.primoArrivo + 30) return true;
    return t > SEMAFORO + this.nGiri * 100 + 30;
  }
  fineRound() {
    const ordine = this.classifica();
    ordine.forEach((id, pos) => { this.punti[id] = this.n - 1 - pos; });
    this.ordineFinale = ordine;
    if (!this.arrivati.length) this.annuncia(ordine[0], 'è il più avanti allo scadere del tempo 🏁', 'eri il più avanti allo scadere del tempo 🏁', true);
  }

  // ---------- il computer: segue la linea ideale guardando avanti ----------
  pensa(p, liv) {
    const c = this.auto[p], L = LIV[liv] || LIV.medio, N = this.N;
    const m = this.mente[p] || (this.mente[p] = { fino: -1, ingresso: { x: 0, y: 0 }, sbaglia: 0, indietro: 0 });
    if (this.tempoRound < SEMAFORO) return { x: 0, y: 0 };
    if (this.tempoRound < m.fino) return m.ingresso;
    m.fino = this.tempoRound + L.ogni;
    const dir = [Math.cos(c.a), Math.sin(c.a)];
    const vf = c.vx * dir[0] + c.vy * dir[1];
    // bloccato (contro il guard-rail o contro un'altra macchina): un po' di retromarcia sterzando al contrario
    if (Math.abs(vf) < 40 && c.fine === null) m.fermo = (m.fermo || 0) + L.ogni; else m.fermo = 0;
    if (m.fermo > 1.4) { m.indietro = this.tempoRound + 0.9; m.fermo = 0; }
    const davanti = Math.round(5 + Math.max(0, vf) / 55);
    const ti = (c.idx + davanti) % N, q = this.C[ti];
    const off = this.spost[ti] * L.linea;
    const tx = q.x + q.nx * off, ty = q.y + q.ny * off;
    let d = angolo(Math.atan2(ty - c.y, tx - c.x) - c.a);
    if (this.tempoRound < m.indietro) { m.ingresso = { x: d > 0 ? -1 : 1, y: 1 }; return m.ingresso; }
    // velocità giusta per la curva più stretta che arriva (v² = presa / curvatura)
    let kmax = 0;
    const guarda = Math.round(4 + Math.max(0, vf) / 18);
    for (let k = 0; k < guarda; k++) kmax = Math.max(kmax, Math.abs(this.curv[(c.idx + k) % N]));
    let vt = Math.min(V_MAX * L.vmax, Math.sqrt(L.presa / Math.max(1e-5, kmax)));
    // il computer facile ogni tanto arriva lungo in curva
    if (m.sbaglia > this.tempoRound) vt *= 1.35; else if (Math.random() < L.errore) m.sbaglia = this.tempoRound + 1.2;
    let sterzo = Math.max(-1, Math.min(1, d * 2.6 + (Math.random() - 0.5) * L.rumore * 2));
    if (Math.abs(d) > 1.3 && vf < 120) sterzo = Math.sign(d); // girato male: sterza tutto
    const y = vf > vt + 25 ? 1 : vf < vt ? -1 : 0;
    m.ingresso = { x: sterzo, y };
    return m.ingresso;
  }

  vistaExtra() {
    if (this.fase === 'disegno') return { disegno: true, disegnatore: this.disegnatore, bozza: this.bozza, larga: LARGA_DIS, mondo: [MONDO_W, MONDO_H], resta: Math.max(0, this.fineDisegno - (this.inPausa ? this.pausaDal : Date.now())), giri: this.nGiri };
    return { pista: this.idPista, nome: this.pista.nome, punti: this.pista.punti, larga: this.pista.larga, porte: this.porte, giri: this.nGiri, semaforo: SEMAFORO, verde: VERDE, fuori: FUORI }; }
  statoTick() {
    const r1 = (v) => Math.round(v * 10) / 10;
    const urti = this.urti; this.urti = [];
    const cl = this.classifica();
    return {
      a: this.auto.map((c) => ({ id: c.id, x: r1(c.x), y: r1(c.y), r: Math.round(c.a * 100) / 100, v: Math.round(Math.hypot(c.vx, c.vy)), g: Math.max(0, c.giri), f: c.fine !== null ? Math.round((c.fine - SEMAFORO) * 10) / 10 : null, d: c.deriva > 0 ? 1 : 0, e: c.erba ? 1 : 0, cm: c.contromano > 1.5 ? 1 : 0, cp: c.cp })),
      cl,
      u: urti,
      sem: Math.min(SEMAFORO + 2, Math.round(this.tempoRound * 10) / 10),
      cr: Math.max(0, Math.round((this.tempoRound - SEMAFORO) * 10) / 10),
      fine: this.primoArrivo !== null ? Math.max(0, Math.ceil(this.primoArrivo + 30 - this.tempoRound)) : null,
    };
  }
}

module.exports = {
  meta: {
    id: 'corsa',
    nome: 'Corsa di macchinine',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Macchinine viste dall\'alto su quattro piste: semaforo, derapate, sorpassi e spintoni. Vince chi finisce i giri per primo.',
    alias: ['macchine', 'macchinine', 'auto', 'gara', 'formula', 'racing', 'micro machines', 'kart'],
    opzioni: [
      { id: 'pista', nome: 'Pista', valori: ['parco', 'citta', 'collina', 'porto', 'disegnata'], etichette: ['Anello del parco (facile)', 'Giro della città (curve a gomito)', 'Collina tortuosa (difficile)', 'Molo del porto (tornante)', 'La disegni tu ✏️'], predefinito: 'parco' },
      { id: 'giri', nome: 'Giri', valori: [3, 5, 1], etichette: ['3 giri', '5 giri', '1 giro'], predefinito: 3 },
      { id: 'urti', nome: 'Urti tra le macchine', valori: ['si', 'no'], etichette: ['Le macchine si urtano', 'Le macchine si passano attraverso'], predefinito: 'si' },
    ],
    regole: [
      'Da 2 a 6 macchinine su una pista chiusa vista dall\'alto (i posti vuoti li fa il computer). Si sceglie la pista (4) e i giri (1, 3 o 5).',
      'Si parte col semaforo: si accendono le luci rosse e quando diventa verde si va. Prima del verde la macchina resta ferma.',
      'Comandi sul computer: freccia su (o W) accelera, freccia giù (o S) frena e poi va in retromarcia, frecce destra e sinistra (o A e D) sterzano, spazio è il freno a mano (si gira più stretto, derapando).',
      'PISTA DISEGNATA: prima della gara chi ha aperto il tavolo disegna un giro col mouse o col dito (gli altri lo vedono comparire). Il gioco lo rende morbido e lo allarga a tutta la mappa; non vale se la pista si incrocia, se due tratti sono troppo vicini o se c\'è una curva troppo stretta. Si parte nel verso in cui è stata disegnata. C\'è anche il pulsante per una pista a caso; dopo due minuti e mezzo si parte comunque.',
      'Sul telefono ci sono due modi (si cambia col pulsante 🕹️): i pulsanti ◀ ▶ per sterzare con ⏫ gas e 🛑 freno, oppure "dito" dove l\'acceleratore è sempre premuto e si sterza trascinando il dito a destra o a sinistra sul campo (🛑 frena).',
      'Se si gira forte ad alta velocità la macchina derapa (scivola di lato) e perde velocità. Fuori dall\'asfalto, sull\'erba, si va molto più piano; più in là c\'è il guard-rail. Le macchine si urtano e si spingono (si può togliere con un\'opzione).',
      'Lungo la pista ci sono 8 checkpoint invisibili: un giro conta solo se si passa da tutti, in ordine. Tagliare per l\'erba non serve, e andare contromano nemmeno (compare la scritta).',
      'La classifica dal vivo è sul campo; vince chi completa per primo tutti i giri. Dopo il primo arrivato gli altri hanno 30 secondi per finire, poi conta chi è più avanti. Punti: 0 all\'ultimo, uno in più per ogni posizione guadagnata.',
      'La telecamera segue la tua macchina; col pulsante 🎥 si vede tutta la pista (sullo schermo grande parte già così).',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer segue la linea ideale guardando avanti e frena prima delle curve: il facile va piano e ogni tanto arriva lungo in curva, il medio va forte e stringe le curve, il difficile tiene la traiettoria migliore quasi al massimo della velocità.',
    ],
  },
  crea: (o) => new Corsa(o),
  bot: () => ({}),
  _test: { Corsa, PISTE, lineaDi, SEMAFORO, N_CP, V_MAX, PASSO_C, controllaPista, dalDisegno, pistaACaso, MONDO_W, MONDO_H },
};
