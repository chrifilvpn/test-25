// ALIEN: ISOLATION 3D — le due intelligenze dello xenomorfo, come nel gioco:
// - la DIRETTRICE non muove la creatura: misura la tensione (quanto è vicina, se vi insegue) e il tempo senza incontri.
//   Con la tensione alta troppo a lungo la richiama nei condotti per una tregua breve (il gioco deve restare frenetico);
//   quando è tutto troppo calmo le dà un INDIZIO: la zona dove siete, sbagliata di qualche metro (sempre meno)
// - la MENTE della creatura: gira, ascolta (passi, corsa, il bip del rilevatore, porte, generatori, razzi), vede (meglio
//   chi ha la torcia accesa o sta nella luce, poco chi è accucciato), va a controllare i rumori, insegue, fruga negli
//   armadietti (chi trattiene il respiro può salvarsi), guarda sotto le scrivanie, scappa nei condotti col fuoco.
//   Impara le vostre abitudini: più ripetete un trucco, peggio funziona
// Le funzioni ricevono il gioco (g) e lavorano su g.alieno; non dipendono dal browser.
const M = require('./mappa');

const { T } = M;
const VEL = { giro: 17, indaga: 33, caccia: 58, cerca: 26, condotto: 95, fuga: 62 };
const R_ALIENO = 5;
const PRESA = 14; // a questa distanza ti prende
const PRESA_SOTTO = 24; // chi è sotto una scrivania lo tira fuori da un po' più lontano
const IMPARA = { armadietto: 0.22, sotto: 0.25, corsa: 0.08, fuoco: 0.3, diversivo: 0.34 };
const CALMA = { facile: 20, normale: 13, difficile: 9 };
const TREGUA = { facile: [14, 20], normale: [9, 14], difficile: [6, 10] };
const caso = (a, b) => a + Math.random() * (b - a);
const scegli = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const GRATE = M.OGGETTI.V.map(M.centro);

function nuovo(difficolta) {
  const v = GRATE[5]; // parte dai condotti sopra la mensa
  return {
    x: v.x, y: v.y, yaw: 0, stato: 'condotto', anim: 'condotto', inCondotto: true, verso: { ...v }, t: 0, attesa: caso(18, 26), // all'inizio un po' di respiro per orientarsi
    percorso: null, meta: null, bersaglio: null, ultimoVisto: null, timer: 0, vel: 0, preda: null, armadietto: null,
    difficolta, k: { facile: 0.85, normale: 1, difficile: 1.1 }[difficolta] || 1,
    mente: { abitudini: { armadietto: 0, sotto: 0, corsa: 0, fuoco: 0, diversivo: 0 }, tensione: 0, picco: 0, calma: 0, indizi: 0, tregua: 20 },
    imparato: [], // le frasi "ha capito il trucco" da annunciare
  };
}
function impara(A, tipo, k = 1) {
  const m = A.mente.abitudini, prima = m[tipo];
  m[tipo] = Math.min(1, prima + IMPARA[tipo] * k);
  if (prima < 0.5 && m[tipo] >= 0.5) A.imparato.push(tipo);
}

// ---------- vedere e sentire ----------
// la creatura vede l'umano u? (cono davanti, la luce, la torcia, accucciati, nascosti)
function vedeUmano(g, A, u) {
  if (!u.vivo || u.fuggito || u.nascosto || g.invisibile(u.k)) return false;
  const d = dist(A, u);
  if (u.sotto) { if (d > 30 || Math.random() > 0.15 + A.mente.abitudini.sotto * 0.8) return false; }
  const luce = M.luce(u, g.accesi);
  let portata = 45 + 150 * luce;
  if (u.torcia) portata = Math.max(portata, 230);
  if (u.accucciato) portata *= 0.55;
  if (u.corre) portata *= 1.3;
  if (d > portata) return false;
  const a = Math.abs(angolo(Math.atan2(u.y - A.y, u.x - A.x) - A.yaw));
  if (a > 1.25 && d > 28) return false; // alle spalle vede solo da vicino
  return M.vede(A, u, g.aperte);
}
// il rumore più forte che la creatura sente adesso (i rumori sono in g.rumori: { x, y, r, tipo })
function sente(g, A) {
  let meglio = null, forza = 0;
  for (const n of g.rumori) {
    const d = dist(A, n), r = n.r * (M.vede(A, n, g.aperte) ? 1 : 0.6) * (A.inCondotto ? 1.25 : 1);
    if (d > r) continue;
    const f = 1 - d / r + (n.tipo === 'razzo' ? 0.3 : 0);
    if (f > forza) { forza = f; meglio = n; }
  }
  return meglio;
}

// ---------- muoversi ----------
function vai(g, A, meta) {
  const da = M.quadretto(A), a = M.quadretto(meta);
  A.meta = { x: meta.x, y: meta.y };
  A.percorso = M.strada(da, a, g.sbloccato) || null;
  if (!A.percorso) { // la meta è dentro qualcosa: il quadretto libero più vicino
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const p = M.strada(da, [a[0] + dx, a[1] + dy], g.sbloccato);
      if (p) { A.percorso = p; A.meta = M.centro([a[0] + dx, a[1] + dy]); break; }
    }
  }
  return !!A.percorso;
}
// un passo lungo il percorso; true quando è arrivata
function cammina(g, A, vel, dt) {
  if (!A.percorso || !A.percorso.length) return true;
  // si salta ai quadretti successivi che si vedono già (curve morbide)
  while (A.percorso.length > 1 && M.vede(A, M.centro(A.percorso[1]), g.aperte) && dist(A, M.centro(A.percorso[0])) < T * 0.9) A.percorso.shift();
  const ultimo = A.percorso.length === 1;
  const p = ultimo ? A.meta : M.centro(A.percorso[0]);
  const dx = p.x - A.x, dy = p.y - A.y, l = Math.hypot(dx, dy);
  const passo = vel * A.k * dt;
  if (l < Math.max(3, passo)) {
    A.percorso.shift();
    if (!A.percorso.length) { A.vel = 0; return true; }
    return false;
  }
  const voluto = Math.atan2(dy, dx), da = angolo(voluto - A.yaw);
  A.yaw = angolo(A.yaw + Math.sign(da) * Math.min(Math.abs(da), 7 * dt));
  const prima = { x: A.x, y: A.y };
  M.muovi(A, (dx / l) * passo, (dy / l) * passo, R_ALIENO, g.aperte, false);
  A.vel = dist(prima, A) / dt;
  if (A.vel < passo / dt * 0.2) { A.bloccato = (A.bloccato || 0) + dt; if (A.bloccato > 1.2) { A.bloccato = 0; vai(g, A, A.meta); } } else A.bloccato = 0;
  return false;
}
function stato(A, s, anim) { A.stato = s; A.anim = anim || s; A.t = 0; }
// nei condotti: va verso la grata scelta passando sopra i soffitti (si vede solo col rilevatore)
function nelCondotto(g, A, grata, attesa = 0) {
  A.inCondotto = true; A.verso = { ...grata }; A.attesa = attesa; A.percorso = null;
  stato(A, 'condotto', 'entra');
  g.ev(['condotto', Math.round(A.x), Math.round(A.y)]);
}
const grataVicina = (p, escludi) => GRATE.filter((v) => !escludi || dist(v, escludi) > 1).reduce((a, b) => (dist(a, p) <= dist(b, p) ? a : b));

// ---------- la direttrice ----------
function direttrice(g, A, dt) {
  const m = A.mente, vivi = g.umaniInGioco();
  if (!vivi.length) return;
  const dMin = Math.min(...vivi.map((u) => dist(A, u)));
  let d = -10;
  if (!A.inCondotto && dMin < 80) d = 22; else if (!A.inCondotto && dMin < 150) d = 8; else if (dMin < 100) d = 2;
  if (A.stato === 'caccia') d += 16;
  m.tensione = Math.max(0, Math.min(140, m.tensione + d * dt));
  m.picco = m.tensione > 100 ? m.picco + dt : Math.max(0, m.picco - dt);
  m.calma = dMin > 150 || A.inCondotto ? m.calma + dt : 0;
  if (m.tregua > 0) { m.tregua -= dt; return; }
  // troppa paura troppo a lungo: tregua (non mentre vi vede o vi sta prendendo)
  if (m.picco > 9 && A.stato !== 'caccia' && A.stato !== 'uccide' && !A.inCondotto) {
    m.picco = 0; m.tensione = 40; m.tregua = caso(...(TREGUA[A.difficolta] || TREGUA.normale));
    nelCondotto(g, A, grataVicina(A), m.tregua);
    return;
  }
  // troppo calmo: un indizio (chi è solo o fa rumore è più facile da trovare)
  if (m.calma > (CALMA[A.difficolta] || 13) && ['giro', 'condotto'].includes(A.stato)) {
    m.calma = 0; m.indizi++;
    const pesi = vivi.map((u) => 1 + (vivi.every((v) => v === u || dist(v, u) > 60) ? 1.5 : 0) + (u.corre ? 1 : 0) + (u.torcia ? 0.5 : 0));
    let r = Math.random() * pesi.reduce((s, x) => s + x, 0), u = vivi[0];
    for (let i = 0; i < vivi.length; i++) { r -= pesi[i]; if (r <= 0) { u = vivi[i]; break; } }
    const errore = Math.max(15, 90 - m.indizi * 12);
    const p = { x: u.x + caso(-errore, errore), y: u.y + caso(-errore, errore) };
    A.zona = p;
    if (A.inCondotto) { A.verso = grataVicina(p); A.attesa = 0; } else if (dist(A, p) > 200) nelCondotto(g, A, grataVicina(p), 0);
    else { stato(A, 'indaga', 'cammina'); vai(g, A, p); }
  }
}

// ---------- un passo della creatura (IA) ----------
function passo(g, A, dt) {
  A.t += dt;
  direttrice(g, A, dt);
  // cosa sente e cosa vede
  const visti = A.inCondotto || A.stato === 'uccide' ? [] : g.umaniInGioco().filter((u) => vedeUmano(g, A, u));
  if (visti.length && !['fuga', 'uccide'].includes(A.stato)) {
    const u = visti.reduce((a, b) => (dist(A, a) <= dist(A, b) ? a : b));
    if (A.stato !== 'caccia') { g.ev(['urlo', Math.round(A.x), Math.round(A.y)]); stato(A, 'caccia', 'corre'); }
    A.preda = u.k; A.ultimoVisto = { x: u.x, y: u.y, vx: u.vx || 0, vy: u.vy || 0 }; A.timer = 0;
  }
  switch (A.stato) {
    case 'condotto': {
      // si muove sopra i soffitti fino alla grata scelta, poi aspetta (tregua) e scende
      if (A.t < 0.9) break; // l'animazione dell'entrata
      A.anim = 'condotto';
      const dx = A.verso.x - A.x, dy = A.verso.y - A.y, l = Math.hypot(dx, dy), p = VEL.condotto * dt;
      if (l > p) { A.x += (dx / l) * p; A.y += (dy / l) * p; A.vel = VEL.condotto; break; }
      A.x = A.verso.x; A.y = A.verso.y; A.vel = 0;
      A.attesa -= dt;
      // dai condotti sente anche da lontano: se c'è un rumore vicino a un'altra grata ci va
      const n = sente(g, A);
      if (n && dist(grataVicina(n), A) > 1 && A.mente.tregua <= 0) { A.verso = grataVicina(n); A.attesa = 0; break; }
      if (A.attesa <= 0 && A.mente.tregua <= 0) {
        A.inCondotto = false; stato(A, 'giro', 'esce');
        g.ev(['esce', Math.round(A.x), Math.round(A.y)]);
        A.attesa = 1.3;
      }
      break;
    }
    case 'giro': {
      if (A.attesa > 0) { A.attesa -= dt; A.vel = 0; break; }
      const n = sente(g, A);
      if (n) { indaga(g, A, n); break; }
      A.anim = 'cammina';
      if (!A.percorso || !A.percorso.length) {
        // controlla un armadietto qui vicino (più spesso se ha capito che vi ci nascondete)
        const vicini = M.OGGETTI.L.map((t) => ({ t, c: M.centro(t) })).filter((o) => dist(o.c, A) < 110 && M.vede(A, o.c, g.aperte));
        if (vicini.length && Math.random() < 0.18 + A.mente.abitudini.armadietto * 0.6) { controlla(g, A, scegli(vicini).t); break; }
        // un punto intorno alla zona che le ha dato la direttrice, o a caso nel settore
        const centro = A.zona || A;
        for (let k = 0; k < 6; k++) {
          const p = { x: centro.x + caso(-100, 100), y: centro.y + caso(-100, 100) };
          const [tx, ty] = M.quadretto(p);
          if (M.cella(tx, ty) === '.' && vai(g, A, M.centro([tx, ty]))) break;
        }
        if (!A.percorso) vai(g, A, M.centro(scegli(M.OGGETTI.S)));
      }
      if (cammina(g, A, VEL.giro, dt)) { A.attesa = caso(1.2, 2.6); A.anim = 'fiuta'; }
      break;
    }
    case 'indaga': {
      const n = sente(g, A);
      if (n && dist(n, A.meta || A) > 40 && A.t > 0.6) indaga(g, A, n);
      A.anim = 'corre';
      if (cammina(g, A, VEL.indaga, dt)) {
        // arrivata: annusa; un razzo che non nasconde nessuno le insegna a non fidarsi
        if (A.razzo) { impara(A, 'diversivo'); A.razzo = false; }
        stato(A, 'cerca', 'fiuta'); A.timer = caso(5, 8); A.attesa = caso(1.5, 2.5);
      }
      break;
    }
    case 'caccia': {
      const u = g.umano(A.preda);
      if (!u || !u.vivo || u.fuggito) { stato(A, 'giro', 'fiuta'); A.attesa = 1.5; A.percorso = null; break; }
      const visto = visti.includes(u);
      A.anim = 'corre';
      if (visto) {
        const d = dist(A, u);
        if (d < (u.sotto ? PRESA_SOTTO : PRESA)) { uccide(g, A, u); break; }
        // dritta se lo vede vicino, altrimenti col percorso (aggiornato spesso)
        if (d < 40 && M.vede(A, u, g.aperte)) { A.percorso = [M.quadretto(u)]; A.meta = { x: u.x, y: u.y }; }
        else if (!A.percorso || A.t - (A.ricalcolo || 0) > 0.35) { A.ricalcolo = A.t; vai(g, A, u); }
        cammina(g, A, VEL.caccia, dt);
        if (u.corre) impara(A, 'corsa', dt * 0.3);
      } else {
        A.timer += dt;
        // l'ha perso: corre dove l'ha visto l'ultima volta (più avanti se ha imparato che scappate correndo)
        if (A.timer < dt * 1.5) {
          const k = 1 + A.mente.abitudini.corsa * 1.5, U = A.ultimoVisto;
          const p = { x: U.x + U.vx * k, y: U.y + U.vy * k };
          if (!vai(g, A, p)) vai(g, A, U);
        }
        if (cammina(g, A, VEL.caccia * 0.85, dt) || A.timer > 4) { stato(A, 'cerca', 'fiuta'); A.timer = caso(7, 11); A.attesa = 1; }
      }
      break;
    }
    case 'cerca': {
      // gira lì intorno annusando: armadietti e scrivanie vicine
      A.timer -= dt;
      if (A.timer <= 0) { stato(A, 'giro', 'cammina'); A.percorso = null; break; }
      const n = sente(g, A);
      if (n && A.attesa <= 0) { indaga(g, A, n); break; }
      if (A.attesa > 0) { A.attesa -= dt; A.vel = 0; A.anim = 'fiuta'; break; }
      A.anim = 'cammina';
      if (!A.percorso || !A.percorso.length) {
        const vicini = M.OGGETTI.L.filter((t) => dist(M.centro(t), A) < 90);
        // chi si è nascosto davanti ai suoi occhi: va dritta a quell'armadietto
        const visto = A.armadiettoVisto && dist(M.centro(A.armadiettoVisto), A) < 160 ? A.armadiettoVisto : null;
        if (visto) { A.armadiettoVisto = null; controlla(g, A, visto); break; }
        if (vicini.length && Math.random() < 0.3 + A.mente.abitudini.armadietto * 0.6) { controlla(g, A, scegli(vicini)); break; }
        for (let k = 0; k < 6; k++) { const [tx, ty] = M.quadretto({ x: A.x + caso(-60, 60), y: A.y + caso(-60, 60) }); if (M.cella(tx, ty) === '.' && vai(g, A, M.centro([tx, ty]))) break; }
      }
      if (cammina(g, A, VEL.cerca, dt)) A.attesa = caso(0.8, 1.8);
      break;
    }
    case 'armadietto': {
      // davanti all'armadietto: ci arriva, poi annusa le fessure (chi è dentro deve trattenere il respiro)
      if (A.timer === 0) {
        if (cammina(g, A, VEL.indaga * 0.8, dt)) { A.timer = 0.001; const c = M.centro(A.armadietto); A.yaw = Math.atan2(c.y - A.y, c.x - A.x); }
        A.anim = 'cammina';
        break;
      }
      A.timer += dt; A.anim = 'annusa'; A.vel = 0;
      const dentro = g.umaniInGioco().find((u) => u.nascosto && u.nascosto.x === A.armadietto[0] && u.nascosto.y === A.armadietto[1]);
      if (dentro) {
        dentro.annusato = true;
        // ogni attimo senza fiato trattenuto (o col fiato finito) la creatura lo sente
        if (!dentro.trattiene || dentro.fiato <= 0) dentro.sentito = (dentro.sentito || 0) + dt;
        if (dentro.sentito > 0.35 + (1 - A.mente.abitudini.armadietto) * 0.4) { impara(A, 'armadietto'); uccide(g, A, dentro, true); break; }
      }
      if (A.timer > 2.6) {
        if (dentro) { dentro.annusato = false; dentro.sentito = 0; }
        stato(A, 'cerca', 'fiuta'); A.timer = caso(3, 5); A.attesa = 0.5;
      }
      break;
    }
    case 'uccide': {
      A.vel = 0;
      if (A.t > 2.4) { stato(A, 'giro', 'fiuta'); A.attesa = 1.2; A.percorso = null; }
      break;
    }
    case 'fuga': {
      // bruciata: scappa nella grata più vicina e resta nei condotti
      A.anim = 'corre';
      if (cammina(g, A, VEL.fuga, dt) || A.t > 6) nelCondotto(g, A, grataVicina(A, A), caso(10, 20) * (1 - A.mente.abitudini.fuoco * 0.6));
      break;
    }
    default: stato(A, 'giro');
  }
}
function indaga(g, A, n) {
  if (n.tipo === 'razzo' && Math.random() < A.mente.abitudini.diversivo * 0.8) return; // non ci casca più
  A.razzo = n.tipo === 'razzo';
  stato(A, 'indaga', 'corre');
  if (!vai(g, A, n)) { stato(A, 'giro'); A.percorso = null; }
}
function controlla(g, A, t) {
  const [fx, fy] = M.verso[`${t[0]},${t[1]}`] || [0, 1];
  A.armadietto = t; stato(A, 'armadietto', 'cammina'); A.timer = 0;
  if (!vai(g, A, M.centro([t[0] + fx, t[1] + fy]))) { stato(A, 'giro'); A.percorso = null; }
}
function uccide(g, A, u, armadietto = false) {
  stato(A, 'uccide', armadietto ? 'tira' : 'attacca');
  A.yaw = Math.atan2(u.y - A.y, u.x - A.x);
  g.morte(u, armadietto);
}
// il fuoco la colpisce: scappa (sempre meno a lungo se ha imparato)
function brucia(g, A) {
  impara(A, 'fuoco');
  g.ev(['brucia', Math.round(A.x), Math.round(A.y)]);
  if (A.inCondotto) return;
  stato(A, 'fuga', 'brucia'); A.mente.tensione = 30; A.mente.picco = 0;
  const v = grataVicina(A);
  if (!vai(g, A, v)) nelCondotto(g, A, v, 12);
}
// qualcuno si è nascosto davanti ai suoi occhi
function vistoNascondersi(g, A, t) { A.armadiettoVisto = t; impara(A, 'armadietto', 0.5); }

module.exports = { nuovo, passo, brucia, vedeUmano, sente, vistoNascondersi, impara, GRATE, R_ALIENO, PRESA, PRESA_SOTTO, VEL, grataVicina };
