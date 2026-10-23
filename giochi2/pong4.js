// PONG A QUATTRO: un campo quadrato, ogni giocatore difende un lato con la sua racchetta (in 2 i lati sotto e sopra,
// in 3 tre lati e il quarto è un muro, in 4 tutti e quattro). Ognuno vede il campo girato con la sua porta in basso.
// Chi lascia passare la pallina perde una vita; senza vite il suo lato diventa un muro. L'ultimo rimasto vince il round.
// La pallina accelera a ogni colpo e prende l'effetto dal punto della racchetta dove batte (e da come si muove).
// Negli angoli ci sono dei blocchi su cui la pallina rimbalza.
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

const L = 600; // lato del campo
const ANGOLO = 56; // blocchi negli angoli
const RACCHETTA = 96, SPESSA = 12, DISTANZA = 20; // la racchetta sta a 20 pixel dal suo lato
const RP = 8, V0 = 330, V_MAX = 760, ACCELERA = 1.05;
const V_RACCHETTA = 760;
const PAUSA_GOL = 1.1;
// i lati: 0 sotto, 1 sinistra, 2 sopra, 3 destra (in 2: sotto e sopra; in 3: sotto, sinistra, destra)
const LATI = { 2: [0, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3] };
const LIV = {
  facile: { ogni: 0.22, errore: 34, vel: 0.5, mira: 0, anticipa: false },
  medio: { ogni: 0.13, errore: 30, vel: 0.72, mira: 0.4, anticipa: true },
  difficile: { ogni: 0.04, errore: 3, vel: 1, mira: 1, anticipa: true },
};

// la posizione lungo il proprio lato vista sullo schermo di chi gioca (da sinistra a destra) ↔ coordinate del campo
function lungoLato(lato, x, y) { return lato === 0 ? x : lato === 2 ? L - x : lato === 1 ? y : L - y; }
function centroRacchetta(lato, s) {
  if (lato === 0) return { x: s, y: L - DISTANZA };
  if (lato === 2) return { x: L - s, y: DISTANZA };
  if (lato === 1) return { x: DISTANZA, y: s };
  return { x: L - DISTANZA, y: L - s };
}

class Pong4 extends Arena {
  constructor(o) {
    super(o, { id: 'pong4', round: 3, tickMs: 25 });
    const op = o.opzioni || {};
    this.nRound = [3, 1, 5].includes(Number(op.round)) ? Number(op.round) : 3;
    this.viteIniziali = [5, 3, 10].includes(Number(op.vite)) ? Number(op.vite) : 5;
    this.nPalle = op.palle === '1' || op.palle === 1 ? 1 : op.palle === '2' || op.palle === 2 ? 2 : (this.n >= 3 ? 2 : 1);
    this.W = L; this.H = L;
    this.lati = LATI[this.n] || LATI[4];
    this.avvia();
  }

  iniziaRound() {
    this.r = Array.from({ length: this.n }, (_, i) => ({ id: i, lato: this.lati[i], s: L / 2, v: 0, vite: this.viteIniziali, fuori: false, colpi: 0 }));
    this.palle = [];
    this.nP = this.nP || 0;
    for (let k = 0; k < this.nPalle; k++) this.lancia(k * 0.8 + 0.4);
    this.ordine = []; // chi è uscito, in ordine
    this.prossimaPalla = 45;
    this.mente = {};
    this.botti = []; this.nB = this.nB || Math.floor(Date.now() / 10) % 1e9;
  }
  botto(x) { this.botti.push([++this.nB, ...x, this.tempoRound]); }
  // una pallina nuova dal centro, verso un giocatore ancora in gara (a caso), dopo un attimo
  lancia(attesa = PAUSA_GOL) {
    const vivi = this.r.filter((x) => !x.fuori);
    const verso = vivi[Math.floor(Math.random() * vivi.length)] || this.r[0];
    const c = centroRacchetta(verso.lato, L / 2 + (Math.random() - 0.5) * 200);
    const a = Math.atan2(c.y - L / 2, c.x - L / 2);
    this.palle.push({ id: ++this.nP, x: L / 2, y: L / 2, vx: Math.cos(a) * V0, vy: Math.sin(a) * V0, attesa, ultimo: null });
  }
  // il lato è chiuso (muro) se non c'è nessuno o chi c'era è uscito
  chiuso(lato) { const g = this.r.find((x) => x.lato === lato); return !g || g.fuori; }
  // !win + parola segreta: la porta di chi ha il trucco respinge la pallina come un muro (niente vite perse)
  protetto(lato) { const g = this.r.find((x) => x.lato === lato); return !!(g && this.winOn && this.winOn[g.id]); }

  passo(dt) {
    aggiornaWin(this, dt);
    // racchette: le persone con tasti o mouse, i computer con pensa() (this.mente)
    for (const g of this.r) {
      if (g.fuori) continue;
      let meta = null, dir = 0;
      if (this.bot[g.id]) { const m = this.mente[g.id]; if (m && m.meta !== undefined) meta = m.meta; }
      else {
        const i = this.inp[g.id];
        // i tasti comandano finché il mouse non si muove di nuovo (il browser continua a mandare l'ultima posizione)
        if (Math.abs(i.x) > 0.1) { dir = i.x; g.mxTasti = i.mx; }
        else if (i.mx !== null && i.mx !== undefined && i.mx !== g.mxTasti) meta = i.mx; // il mouse: x sullo schermo = posizione lungo il lato
      }
      const vmax = V_RACCHETTA * (this.bot[g.id] ? (LIV[this.bot[g.id]] || LIV.medio).vel : 1);
      const prima = g.s;
      if (meta !== null) g.s += Math.max(-vmax * dt, Math.min(vmax * dt, meta - g.s));
      else g.s += dir * vmax * dt;
      g.s = Math.max(ANGOLO + RACCHETTA / 2, Math.min(L - ANGOLO - RACCHETTA / 2, g.s));
      g.v = (g.s - prima) / Math.max(dt, 1e-3);
    }
    // palline, a piccoli passi
    for (const b of this.palle) {
      if (b.attesa > 0) { b.attesa -= dt; continue; }
      const passi = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 5));
      for (let k = 0; k < passi && !b.via; k++) this.muovi(b, dt / passi);
    }
    // palline contro palline: si scambiano la velocità
    for (let a = 0; a < this.palle.length; a++) for (let c = a + 1; c < this.palle.length; c++) {
      const A = this.palle[a], B = this.palle[c];
      if (A.attesa > 0 || B.attesa > 0) continue;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 2 * RP && d > 1e-6 && (B.vx - A.vx) * dx + (B.vy - A.vy) * dy < 0) {
        const nx = dx / d, ny = dy / d, p = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        A.vx -= p * nx; A.vy -= p * ny; B.vx += p * nx; B.vy += p * ny;
        for (const Q of [A, B]) { const v = Math.hypot(Q.vx, Q.vy); if (v > V_MAX) { Q.vx *= V_MAX / v; Q.vy *= V_MAX / v; } }
      }
    }
    const prima = this.palle.length;
    this.palle = this.palle.filter((b) => !b.via);
    // scambi lunghissimi: ogni 45 secondi entra una pallina in più (al massimo 4)
    if (this.tempoRound >= this.prossimaPalla) { this.prossimaPalla += 45; if (this.palle.length < 4) { this.lancia(0.5); this.annuncia(null, 'Una pallina in più! ⚪', '', false); } }
    for (let k = this.palle.length; k < prima && this.r.filter((x) => !x.fuori).length > 1; k++) this.lancia();
    return this.r.filter((x) => !x.fuori).length <= 1;
  }
  muovi(b, h) {
    b.x += b.vx * h; b.y += b.vy * h;
    // racchette
    for (const g of this.r) {
      if (g.fuori) continue;
      const c = centroRacchetta(g.lato, g.s);
      const orizz = g.lato === 0 || g.lato === 2;
      const dentro = orizz ? (b.vy > 0) === (g.lato === 0) : (b.vx < 0) === (g.lato === 1);
      if (!dentro) continue; // va verso il centro: niente
      const lx = orizz ? RACCHETTA / 2 : SPESSA / 2, ly = orizz ? SPESSA / 2 : RACCHETTA / 2;
      if (Math.abs(b.x - c.x) > lx + RP || Math.abs(b.y - c.y) > ly + RP) continue;
      // il punto della racchetta dove batte (−1 a sinistra … +1 a destra, visto da chi gioca) dà l'angolo di uscita
      const lungo = lungoLato(g.lato, b.x, b.y);
      const off = Math.max(-1, Math.min(1, (lungo - g.s) / (RACCHETTA / 2 + RP)));
      const v = Math.min(V_MAX, Math.hypot(b.vx, b.vy) * ACCELERA);
      // in coordinate "di chi gioca": esce verso l'alto, con l'angolo dall'offset e un po' di effetto dal movimento
      let ax = off * 0.95 + Math.max(-0.25, Math.min(0.25, g.v / 3000));
      ax = Math.max(-1.1, Math.min(1.1, ax));
      const sx = Math.sin(ax) * v, sy = -Math.cos(ax) * v; // sullo schermo di chi gioca
      if (g.lato === 0) { b.vx = sx; b.vy = sy; b.y = c.y - ly - RP; }
      else if (g.lato === 2) { b.vx = -sx; b.vy = -sy; b.y = c.y + ly + RP; }
      else if (g.lato === 1) { b.vx = -sy; b.vy = sx; b.x = c.x + lx + RP; }
      else { b.vx = sy; b.vy = -sx; b.x = c.x - lx - RP; }
      b.ultimo = g.id; g.colpi++;
      this.botto([0, Math.round(b.x), Math.round(b.y)]);
      return;
    }
    // blocchi negli angoli
    for (const [x0, y0] of [[0, 0], [L - ANGOLO, 0], [0, L - ANGOLO], [L - ANGOLO, L - ANGOLO]]) {
      const qx = Math.max(x0, Math.min(b.x, x0 + ANGOLO)), qy = Math.max(y0, Math.min(b.y, y0 + ANGOLO));
      const dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
      if (d >= RP || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, p = b.vx * nx + b.vy * ny;
      if (p < 0) { b.vx -= 2 * p * nx; b.vy -= 2 * p * ny; }
      b.x = qx + nx * RP; b.y = qy + ny * RP;
      this.botto([1, Math.round(b.x), Math.round(b.y)]);
    }
    // i lati: muro se chiuso, gol se aperto
    const fuori = b.y > L - RP ? 0 : b.x < RP ? 1 : b.y < RP ? 2 : b.x > L - RP ? 3 : -1;
    if (fuori < 0) return;
    if (this.chiuso(fuori) || this.protetto(fuori)) {
      if (fuori === 0 || fuori === 2) { b.vy = -b.vy; b.y = fuori === 0 ? L - RP : RP; } else { b.vx = -b.vx; b.x = fuori === 1 ? RP : L - RP; }
      this.botto([1, Math.round(b.x), Math.round(b.y)]);
      // niente palline che rimbalzano per sempre in orizzontale/verticale tra due muri
      const v = Math.hypot(b.vx, b.vy);
      if (Math.abs(b.vx) < v * 0.15) b.vx = Math.sign(b.vx || 1) * v * 0.15;
      if (Math.abs(b.vy) < v * 0.15) b.vy = Math.sign(b.vy || 1) * v * 0.15;
      const v2 = Math.hypot(b.vx, b.vy); b.vx *= v / v2; b.vy *= v / v2;
      return;
    }
    if ((fuori === 0 && b.y < L + RP * 2) || (fuori === 2 && b.y > -RP * 2) || (fuori === 1 && b.x > -RP * 2) || (fuori === 3 && b.x < L + RP * 2)) return; // deve uscire del tutto
    b.via = true;
    const g = this.r.find((x) => x.lato === fuori);
    g.vite--;
    this.botto([2, Math.round(Math.max(0, Math.min(L, b.x))), Math.round(Math.max(0, Math.min(L, b.y)))]);
    const chi = b.ultimo !== null && b.ultimo !== g.id ? b.ultimo : null;
    if (g.vite <= 0) {
      g.fuori = true; this.ordine.push(g.id);
      this.annuncia(g.id, 'è fuori! 💀', 'sei fuori: il tuo lato diventa un muro');
    } else if (chi !== null) this.annuncia(chi, 'fa gol a @ ⚡', 'gol! ⚡', false, { bersaglio: g.id, testoTe: `ti ha fatto gol: ${g.vite === 1 ? 'ti resta 1 vita' : `ti restano ${g.vite} vite`}` });
    else this.annuncia(g.id, `perde una vita (${g.vite})`, `una vita in meno: ne restano ${g.vite}`);
    this.cambiato = true;
  }
  fineRound() {
    fineWin(this);
    // punti come in una classifica: chi esce per primo 0, poi 1, … l'ultimo rimasto n − 1 + 1
    this.ordine.forEach((id, k) => { this.punti[id] += k; });
    const vivo = this.r.find((x) => !x.fuori);
    if (vivo) { this.punti[vivo.id] += this.n; this.annuncia(vivo.id, 'vince il round! 🏆', 'hai vinto il round! 🏆', true); }
  }

  // ---------- il computer ----------
  // dove la pallina arriverà sul mio lato (simulata con i rimbalzi sui muri e sui blocchi, senza le racchette altrui)
  arrivo(b, lato, maxT = 3) {
    const q = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
    const dt = 1 / 120;
    for (let t = 0; t < maxT; t += dt) {
      q.x += q.vx * dt; q.y += q.vy * dt;
      const c = centroRacchetta(lato, L / 2);
      if (lato === 0 && q.y >= c.y - SPESSA / 2 - RP) return { s: q.x, t };
      if (lato === 2 && q.y <= c.y + SPESSA / 2 + RP) return { s: L - q.x, t };
      if (lato === 1 && q.x <= c.x + SPESSA / 2 + RP) return { s: q.y, t };
      if (lato === 3 && q.x >= c.x - SPESSA / 2 - RP) return { s: L - q.y, t };
      for (const [x0, y0] of [[0, 0], [L - ANGOLO, 0], [0, L - ANGOLO], [L - ANGOLO, L - ANGOLO]]) {
        const qx = Math.max(x0, Math.min(q.x, x0 + ANGOLO)), qy = Math.max(y0, Math.min(q.y, y0 + ANGOLO));
        const dx = q.x - qx, dy = q.y - qy, d = Math.hypot(dx, dy);
        if (d >= RP || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, p = q.vx * nx + q.vy * ny;
        if (p < 0) { q.vx -= 2 * p * nx; q.vy -= 2 * p * ny; }
        q.x = qx + nx * RP; q.y = qy + ny * RP;
      }
      // gli altri lati: muri se chiusi; se aperti la pallina passa da un'altra racchetta (prima o poi torna)
      if (q.y > L - RP && lato !== 0) { if (!this.chiuso(0)) return null; q.vy = -Math.abs(q.vy); }
      if (q.y < RP && lato !== 2) { if (!this.chiuso(2)) return null; q.vy = Math.abs(q.vy); }
      if (q.x < RP && lato !== 1) { if (!this.chiuso(1)) return null; q.vx = Math.abs(q.vx); }
      if (q.x > L - RP && lato !== 3) { if (!this.chiuso(3)) return null; q.vx = -Math.abs(q.vx); }
    }
    return null;
  }
  pensa(p, liv) {
    const g = this.r[p], Lv = LIV[liv] || LIV.medio, t = this.tempoRound;
    const m = this.mente[p] || (this.mente[p] = { prossimo: 0, meta: L / 2, errore: 0, perPalla: null });
    if (g.fuori || t < m.prossimo) return {};
    m.prossimo = t + Lv.ogni * (0.7 + Math.random() * 0.6);
    // la pallina più pericolosa: quella che arriva prima sul mio lato
    let meglio = null;
    for (const b of this.palle) {
      if (b.attesa > 0.3) continue;
      const verso = g.lato === 0 ? b.vy > 0 : g.lato === 2 ? b.vy < 0 : g.lato === 1 ? b.vx < 0 : b.vx > 0;
      let a;
      if (Lv.anticipa) a = this.arrivo(b, g.lato);
      else if (verso) a = { s: lungoLato(g.lato, b.x, b.y), t: 0.5 }; // il facile segue solo la pallina
      if (a && (!meglio || a.t < meglio.t)) meglio = { ...a, id: b.id };
    }
    if (!meglio) { m.meta = L / 2; return {}; } // al centro, in attesa
    // un errore che cambia solo quando cambia la pallina da prendere (così non trema)
    if (m.perPalla !== meglio.id || Math.random() < 0.05) { m.perPalla = meglio.id; m.errore = (Math.random() - 0.5) * 2 * Lv.errore; }
    // mirare: colpire con il bordo della racchetta per mandare la pallina lontano dal giocatore che sta meglio
    let off = 0;
    if (Lv.mira > 0 && meglio.t < 0.9) {
      const altri = this.r.filter((x) => !x.fuori && x !== g);
      const bersaglio = altri.sort((a, b) => a.vite - b.vite)[0];
      if (bersaglio) {
        // il lato del bersaglio rispetto a me (visto dal mio schermo): a sinistra o a destra?
        const giro = (bersaglio.lato - g.lato + 4) % 4; // 1 = alla mia sinistra, 3 = alla mia destra, 2 = davanti
        const dir = giro === 1 ? -1 : giro === 3 ? 1 : (bersaglio.s > L / 2 ? 1 : -1); // davanti: dalla parte opposta alla sua racchetta
        off = -dir * RACCHETTA * 0.32 * Lv.mira;
      }
    }
    m.meta = meglio.s + off + m.errore;
    return {};
  }

  // ---------- quello che vede il browser ----------
  vistaExtra() { return { L, ANGOLO, RACCHETTA, SPESSA, DISTANZA, RP, lati: this.lati, vite: this.viteIniziali }; }
  statoTick() {
    const ora = this.tempoRound; this.botti = this.botti.filter((x) => ora - x[4] < 0.5);
    const r = (v) => Math.round(v * 10) / 10;
    return {
      r: this.r.map((g) => [r(g.s), g.vite, g.fuori ? 1 : 0]),
      p: this.palle.map((b) => [b.id, r(b.x), r(b.y), b.attesa > 0 ? 1 : 0]),
      b: this.botti.map((x) => x.slice(0, 4)),
    };
  }
}

module.exports = {
  meta: {
    id: 'pong4',
    nome: 'Pong a quattro',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4],
    descrizione: 'Il ping pong elettronico in un campo quadrato: fino a quattro racchette, una per lato. Non far passare la pallina!',
    alias: ['pong', 'pong a 4', 'ping pong', 'racchette', 'tennis elettronico', 'pallina'],
    opzioni: [
      { id: 'vite', nome: 'Vite', valori: [5, 3, 10], etichette: ['5 vite', '3 vite', '10 vite'], predefinito: 5 },
      { id: 'palle', nome: 'Palline', valori: ['auto', 1, 2], etichette: ['1 in 2 giocatori, 2 in 3 o 4', 'Sempre 1', 'Sempre 2'], predefinito: 'auto' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Il campo è quadrato e ogni giocatore difende un lato con la sua racchetta: in 2 i lati di sotto e di sopra (gli altri due sono muri), in 3 tre lati, in 4 tutti e quattro. Ognuno vede il campo girato, con la sua porta in basso.',
      'La racchetta si muove con le frecce (o A e D) o il joystick, oppure segue il mouse o il dito sul campo.',
      'La pallina rimbalza sui muri e sui blocchi negli angoli. Colpita con il centro della racchetta torna dritta, con i bordi esce di lato; se la racchetta si sta muovendo le dà anche un po\' di effetto. A ogni colpo va un po\' più veloce.',
      'Chi lascia passare la pallina perde una vita (all\'inizio sono 5, o 3, o 10). Senza vite si è fuori e il proprio lato diventa un muro. In 3 o 4 giocatori ci sono 2 palline in campo (si può scegliere).',
      'Se gli scambi vanno avanti a lungo, ogni 45 secondi entra in campo una pallina in più (al massimo 4).',
      'L\'ultimo rimasto vince il round. Punti a ogni round come in una classifica: chi esce per primo 0, il secondo 1 e così via; chi vince prende tanti punti quanti sono i giocatori più quelli della classifica. Si giocano 3 round (o 1, o 5).',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile segue la pallina solo quando arriva, è lento e sbaglia spesso; il medio calcola dove arriverà con i rimbalzi; il difficile ci arriva sempre in tempo e colpisce con il bordo della racchetta per mandare la pallina verso chi ha meno vite.',
    ],
  },
  crea: (o) => new Pong4(o),
  bot: () => ({}),
  _test: { Pong4, L, ANGOLO, RACCHETTA, DISTANZA, V0, V_MAX, LATI, centroRacchetta, lungoLato },
};
