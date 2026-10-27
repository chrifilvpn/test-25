// ALIEN: ISOLATION 3D — gli altri pericoli della Sevastopol, come nel gioco (solo nella modalità classica):
// - i WORKING JOE, gli androidi della Seegson: lenti, gentili a parole, ostinati. Girano per il settore, se vedono
//   qualcuno lo seguono camminando (chi cammina li distanzia, chi va accucciato no) e lo afferrano per il collo.
//   Chi è preso si divincola premendo E più volte (o un compagno lo libera col fuoco); se no, dopo qualche secondo è
//   finita. Il fuoco non li ferma per sempre: li blocca qualche secondo. Non guardano negli armadietti
// - i FACEHUGGER: escono dalle uova nel Nido e nei settori bui quando qualcuno passa vicino (accucciati ci si può
//   passare accanto). Corrono veloci e saltano in faccia a chi è allo scoperto; il fuoco li brucia
// Le funzioni ricevono il gioco (g); non dipendono dal browser.
const M = require('./mappa');

const VEL = { joeGiro: 13, joe: 21, fh: 68 };
const R_JOE = 4.5;
const JOE = { vede: 115, cono: 1.0, presa: 9, stretta: 3.6, colpi: 6, stordito: 4.5 };
const FH = { sveglia: 45, svegliaAcc: 18, apre: 1.1, vede: 150, salto: 24, vita: 45, presa: 1.3 };
const FRASI = [
  'Sembra agitato.',
  'Lei non dovrebbe essere qui.',
  'Siamo qui per aiutarla.',
  'Questa zona è riservata al personale.',
  'Mi segua, prego.',
  'La prego di calmarsi.',
  'È tutto sotto controllo.',
  'Seegson: una vita migliore, sintetica.',
];
const caso = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// i punti di giro dei Working Joe: il centro di ogni stanza (non l'attracco)
const GIRO = M.STANZE.filter((s) => s.id !== 'attracco').map((s) => M.centro([Math.floor((s.x0 + s.x1) / 2), Math.floor((s.y0 + s.y1) / 2)]));

function nuoviJoe(n) {
  const partenze = M.OGGETTI.J.slice().sort(() => Math.random() - 0.5);
  return Array.from({ length: n }, (_, i) => {
    const c = M.centro(partenze[i % partenze.length]);
    return { id: i, x: c.x, y: c.y, yaw: caso(-Math.PI, Math.PI), stato: 'giro', anim: 'cammina', vel: 0, preda: null, percorso: null, meta: null, t: 0, stordito: 0, parla: caso(3, 8), ricalcolo: 0 };
  });
}
function nuoveUova() { return M.OGGETTI.U.map((t) => ({ ...M.centro(t), stato: 0, t: 0 })); } // 0 chiuso, 1 si apre, 2 vuoto

// un passo lungo un percorso di quadretti; true se arrivato
function segui(g, e, vel, dt) {
  if (!e.percorso || !e.percorso.length) return true;
  while (e.percorso.length > 1 && dist(e, M.centro(e.percorso[0])) < M.T * 0.6) e.percorso.shift();
  const p = e.percorso.length === 1 ? e.meta : M.centro(e.percorso[0]);
  const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy);
  if (l < 3) { e.percorso.shift(); return !e.percorso.length; }
  const voluto = Math.atan2(dy, dx), da = angolo(voluto - e.yaw);
  e.yaw = angolo(e.yaw + Math.sign(da) * Math.min(Math.abs(da), 4 * dt));
  const prima = { x: e.x, y: e.y }, passo = Math.min(l, vel * dt);
  M.muovi(e, (dx / l) * passo, (dy / l) * passo, R_JOE, g.aperte, false);
  e.vel = dist(prima, e) / dt;
  return false;
}
function vai(g, e, meta) { e.meta = { x: meta.x, y: meta.y }; e.percorso = M.strada(M.quadretto(e), M.quadretto(meta), g.sbloccato) || null; return !!e.percorso; }

// ---------- i Working Joe ----------
function vedeJoe(g, J, u) {
  if (!u.vivo || u.fuggito || u.nascosto || u.botola || g.invisibile(u.k)) return false;
  const d = dist(J, u);
  if (d > (u.torcia ? JOE.vede * 1.3 : JOE.vede) || (u.sotto && d > 20)) return false;
  if (Math.abs(angolo(Math.atan2(u.y - J.y, u.x - J.x) - J.yaw)) > JOE.cono && d > 22) return false;
  return M.vede(J, u, g.aperte);
}
function passoJoe(g, J, dt) {
  J.t += dt; J.parla -= dt;
  if (J.stordito > 0) { J.stordito -= dt; J.vel = 0; J.anim = 'brucia'; if (J.stordito <= 0) { J.stato = 'giro'; J.percorso = null; } return; }
  // chi sta stringendo
  if (J.stato === 'stringe') {
    const u = g.umano(J.preda);
    J.vel = 0; J.anim = 'stringe';
    if (!u || !u.vivo || !u.presa || u.presa.j !== J.id) { J.stato = 'giro'; J.preda = null; J.percorso = null; J.stordito = 1.5; }
    return;
  }
  const visti = g.umaniInGioco().filter((u) => !u.presa && vedeJoe(g, J, u));
  if (visti.length) {
    const u = visti.reduce((a, b) => (dist(J, a) <= dist(J, b) ? a : b));
    if (J.stato !== 'insegue' || J.preda !== u.k) { J.stato = 'insegue'; J.preda = u.k; J.ricalcolo = 0; if (J.parla < 2) J.parla = 0; }
    J.ultimo = { x: u.x, y: u.y };
  }
  if (J.parla <= 0) { J.parla = caso(6, 12); g.ev(['joe', J.id, FRASI[Math.floor(Math.random() * FRASI.length)], Math.round(J.x), Math.round(J.y)]); }
  if (J.stato === 'insegue') {
    const u = g.umano(J.preda);
    if (!u || !u.vivo || u.fuggito || u.nascosto || u.presa) { J.stato = 'giro'; J.percorso = null; return; }
    const d = dist(J, u);
    if (d < JOE.presa && visti.includes(u)) {
      // l'afferra per il collo
      J.stato = 'stringe'; J.anim = 'stringe'; J.yaw = Math.atan2(u.y - J.y, u.x - J.x);
      g.presa(u, J);
      return;
    }
    J.ricalcolo -= dt;
    const meta = visti.includes(u) ? u : J.ultimo;
    if (J.ricalcolo <= 0 || !J.percorso) { J.ricalcolo = 0.5; vai(g, J, meta); }
    J.anim = 'cammina';
    if (segui(g, J, VEL.joe, dt) && !visti.includes(u)) { J.stato = 'giro'; J.percorso = null; }
    return;
  }
  // il giro: da una stanza all'altra, con calma
  J.anim = J.vel > 1 ? 'cammina' : 'fermo';
  if (!J.percorso || !J.percorso.length) {
    if ((J.attesa = (J.attesa || 0) - dt) > 0) { J.vel = 0; return; }
    const meta = GIRO[Math.floor(Math.random() * GIRO.length)];
    vai(g, J, { x: meta.x + caso(-30, 30), y: meta.y + caso(-30, 30) }) || vai(g, J, meta);
    J.attesa = caso(2, 5);
  }
  segui(g, J, VEL.joeGiro, dt);
}

// ---------- uova e facehugger ----------
function passoUova(g, dt) {
  for (const U of g.uova) {
    if (U.stato === 2) continue;
    if (U.stato === 0) {
      const vicino = g.umaniInGioco().some((u) => !u.nascosto && !u.botola && dist(u, U) < (u.accucciato ? FH.svegliaAcc : FH.sveglia) && M.vede(U, u, g.aperte));
      if (vicino) { U.stato = 1; U.t = 0; g.ev(['uovo', g.uova.indexOf(U)]); }
      continue;
    }
    U.t += dt;
    if (U.t >= FH.apre) {
      U.stato = 2;
      g.facehugger.push({ x: U.x, y: U.y, yaw: 0, stato: 'cerca', vita: FH.vita, vel: 0, salto: 0, preda: null });
      g.ev(['fhNasce', Math.round(U.x), Math.round(U.y)]);
    }
  }
}
function passoFacehugger(g, F, dt) {
  if (F.stato === 'morto') return; // bruciato: si toglie a fine passo
  F.vita -= dt;
  if (F.stato === 'salta') {
    F.salto += dt;
    const u = g.umano(F.preda);
    if (u && u.vivo && !u.fuggito) { F.x += (u.x - F.x) * Math.min(1, dt * 8); F.y += (u.y - F.y) * Math.min(1, dt * 8); }
    if (F.salto > 0.35) {
      if (u && u.vivo && !u.fuggito && !u.nascosto && dist(F, u) < 12) { F.stato = 'morto'; g.morte(u, false, F, 'facehugger'); }
      else { F.stato = 'cerca'; F.salto = 0; }
    }
    return;
  }
  if (F.vita <= 0) { F.stato = 'morto'; return; }
  const visti = g.umaniInGioco().filter((u) => !u.nascosto && !u.botola && !g.invisibile(u.k) && dist(F, u) < FH.vede && M.vede(F, u, g.aperte));
  if (!visti.length) { F.vel = 0; return; }
  const u = visti.reduce((a, b) => (dist(F, a) <= dist(F, b) ? a : b)), d = dist(F, u);
  F.preda = u.k; F.yaw = Math.atan2(u.y - F.y, u.x - F.x);
  if (d < FH.salto) { F.stato = 'salta'; F.salto = 0; g.ev(['fhSalta', Math.round(F.x), Math.round(F.y)]); return; }
  F.ricalcolo = (F.ricalcolo || 0) - dt;
  if (F.ricalcolo <= 0 || !F.percorso) { F.ricalcolo = 0.4; vai(g, F, u); }
  segui(g, F, VEL.fh, dt);
}
// il fuoco: i Working Joe si bloccano, i facehugger bruciano
function brucia(g, u) {
  let colpiti = 0;
  const preso = (e, r) => { const d = dist(e, u), a = Math.abs(angolo(Math.atan2(e.y - u.y, e.x - u.x) - u.yaw)); return d < r && (a < 0.6 || d < 14) && M.vede(u, e, g.aperte); };
  for (const J of g.joe) if (J.stordito <= 0 && preso(J, 65)) {
    if (J.stato === 'stringe') { const v = g.umano(J.preda); if (v && v.presa) g.liberato(v, true); }
    J.stordito = JOE.stordito; J.stato = 'giro'; J.percorso = null; colpiti++;
    g.ev(['joeBrucia', J.id]);
  }
  for (const F of g.facehugger) if (F.stato !== 'morto' && preso(F, 70)) { F.stato = 'morto'; colpiti++; g.ev(['fhBrucia', Math.round(F.x), Math.round(F.y)]); }
  return colpiti;
}
function passo(g, dt) {
  for (const J of g.joe) passoJoe(g, J, dt);
  passoUova(g, dt);
  for (const F of g.facehugger) passoFacehugger(g, F, dt);
  g.facehugger = g.facehugger.filter((F) => F.stato !== 'morto');
}

module.exports = { nuoviJoe, nuoveUova, passo, brucia, vedeJoe, FRASI, JOE, FH, VEL };
