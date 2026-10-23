// ALIEN: ISOLATION 3D: la mappa della Sevastopol (muri, porte, strade), armadietti, generatori, fuga sul Torrens,
// lanciafiamme, l'IA dello xenomorfo che prende chi resta allo scoperto, lo xenomorfo giocatore, il trucco !win
// e tante partite tra computer (da soli, in 4, col mostro giocatore).
const assert = require('assert');
{ let s = 7; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const G = require('../../giochi3/isolation');
const { M, AI, FIATO } = G._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 50; g.fineFase = ora; g.tick(ora); } };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.05); k++) { g.tempoRound += 0.05; if (g.passo(0.05)) return true; } return false; };
// lo xenomorfo lontano e tranquillo nei condotti (per provare il resto senza che arrivi)
const lontano = (g) => Object.assign(g.alieno, { stato: 'condotto', inCondotto: true, attesa: 1e9, x: 30, y: 30 });
const davantiA = (t) => { const [fx, fy] = M.verso[`${t[0]},${t[1]}`]; return M.centro([t[0] + fx, t[1] + fy]); };

assert.strictEqual(G.meta.id, 'isolation');
assert.ok(G.meta.tempoReale && G.meta.giocatori.includes(1) && G.meta.giocatori.includes(8));
assert.ok(G.meta.regole.some((r) => /GENERATORI/.test(r) && /Torrens/.test(r)));
assert.ok(!G.meta.regole.some((r) => /telefono: joystick/.test(r)), 'si gioca solo al computer');

// ---- la mappa ----
assert.strictEqual(M.griglia.length, M.RIGHE);
assert.ok(M.griglia.every((r) => r.length === M.COLS));
assert.strictEqual(M.OGGETTI.G.length, 3, 'tre generatori');
assert.ok(M.OGGETTI.S.length >= 8 && M.OGGETTI.E.length > 0 && M.OGGETTI.L.length > 5);
for (let x = 0; x < M.COLS; x++) assert.ok(M.solida(x, 0, {}) && M.solida(x, M.RIGHE - 1, {}), 'il bordo è muro');
// da ogni partenza si arriva a ogni generatore e (con l'attracco aperto) all'uscita
{
  for (const s of M.OGGETTI.S) {
    for (const t of M.OGGETTI.G) assert.ok(M.strada(s, M.quadretto(davantiA(t)), false), `strada da ${s} verso il generatore ${t}`);
    assert.ok(!M.strada(s, M.OGGETTI.E[0], false), 'l\'attracco è chiuso finché non si riaccendono i generatori');
    assert.ok(M.strada(s, M.OGGETTI.E[0], true), 'strada verso il Torrens');
  }
}
// l'armadietto è solido solo contro il muro: davanti ci si può avvicinare
{
  const t = M.OGGETTI.L[0], r = M.rettangolo(t[0], t[1], {}, false);
  assert.ok(r && (r[2] - r[0] < M.T || r[3] - r[1] < M.T), 'l\'armadietto non riempie tutto il quadretto');
}

// ---- armadietti, generatori, fuga ----
{
  const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); lontano(g);
  const u = g.umani[0];
  assert.strictEqual(g.mostro, null, 'da soli il mostro è l\'IA');
  // nell'armadietto e fuori
  const t = M.OGGETTI.L[0], c = davantiA(t), cl = M.centro(t);
  Object.assign(u, { x: c.x, y: c.y, yaw: Math.atan2(cl.y - c.y, cl.x - c.x) });
  g.interagisci(u);
  assert.ok(u.nascosto && u.nascosto.x === t[0] && u.nascosto.y === t[1], 'entra nell\'armadietto');
  // trattenere il respiro dura poco
  u.trattiene = true; passa(g, 0.1); g.cmd[0].k = 8; passa(g, FIATO + 1);
  assert.ok(u.fiato < 0.5, `il fiato finisce: ${u.fiato}`);
  g.cmd[0].k = 0; passa(g, 0.1);
  g.interagisci(u);
  assert.ok(!u.nascosto, 'esce dall\'armadietto');
  // i generatori: si sta vicino e si aspetta
  g.generatori.forEach((_, i) => {
    const tg = M.OGGETTI.G[i], d = davantiA(tg), cg = M.centro(tg);
    Object.assign(u, { x: d.x, y: d.y, yaw: Math.atan2(cg.y - d.y, cg.x - d.x) });
    g.cmd[0].yaw = u.yaw;
    g.interagisci(u);
    assert.strictEqual(u.gen, i, `inizia il generatore ${i}`);
    passa(g, 3);
    assert.ok(!g.generatori[i].acceso && g.generatori[i].carica > 0.2, 'si carica piano');
    lontano(g); passa(g, 9);
    assert.ok(g.generatori[i].acceso, `generatore ${i} acceso`);
  });
  assert.ok(g.sbloccato, 'con tre generatori l\'attracco si apre');
  assert.ok(g.porte.filter((p, i) => M.PORTE[i].bloccata).every((p) => !p.bloccata), 'le porte bloccate si sbloccano');
  // all'uscita: salvo, e la partita finisce con la vittoria dei sopravvissuti
  const e = M.centro(M.OGGETTI.E[0]); u.x = e.x - 4; u.y = e.y;
  g.muoviUmano(u, 1, 0, 0.05);
  assert.ok(u.fuggito, 'sale sul Torrens');
  assert.ok(passa(g, 0.1) && g.vittoria === 'umani');
}

// ---- lo xenomorfo IA: chi resta fermo allo scoperto con la torcia viene preso; il fuoco lo scaccia ----
{
  const g = G.crea({ n: 1, opzioni: { difficolta: 'difficile' }, bot: [null] }); parti(g);
  const u = g.umani[0];
  let fine = false;
  for (let k = 0; k < 240 && !fine; k++) fine = passa(g, 1);
  assert.ok(!u.vivo && g.vittoria === 'alieno', 'chi non fa niente viene preso');
  const g2 = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g2);
  const v = g2.umani[0], A = g2.alieno;
  Object.assign(A, { inCondotto: false, stato: 'caccia', x: v.x + 30, y: v.y, attesa: 0 });
  v.yaw = 0;
  if (M.vede(v, A, g2.aperte)) {
    g2.fiamma(v);
    assert.strictEqual(A.stato, 'fuga', 'col fuoco scappa');
    assert.ok(A.mente.abitudini.fuoco > 0, 'e impara');
    assert.strictEqual(v.carburante, 0);
  }
}

// ---- lo xenomorfo giocatore ----
{
  const g = G.crea({ n: 3, opzioni: { mostro: 'giocatore', chi: 2 }, bot: [null, null, null] }); parti(g);
  assert.strictEqual(g.mostro, 1, 'il 2° posto è lo xenomorfo');
  assert.deepStrictEqual(g.umani.map((u) => u.k), [0, 2]);
  assert.strictEqual(g.vistaExtra(0).mostro, 1);
  const s = g.statoTick(1);
  assert.ok(Array.isArray(s.pi) && s.me.length === 3, 'il mostro ha i puntini dei rumori e il fiato');
  // un rumore vicino diventa un puntino
  const A = g.alieno; g.rumori.push({ x: A.x + 10, y: A.y, r: 60, tipo: 'passi', chi: 0, dura: 1 }); passa(g, 0.05);
  assert.ok(g.statoTick(1).pi.length >= 1, 'sente il rumore');
  // con il trucco: chi lo ha non fa rumore
  const T = require('../../giochi/trucco');
  T.arma(g, 0); passa(g, 0.05);
  const prima = g.rumori.length; g.rumore(A.x, A.y, 60, 'passi', 0);
  assert.strictEqual(g.rumori.length, prima, '!win: niente rumore');
  passa(g, 26);
  assert.ok(!T.armato(g, 0), 'il trucco dura 25 secondi');
}

// ---- tante partite tra computer: finiscono tutte ----
for (const [n, op] of [[1, {}], [4, {}], [3, { mostro: 'giocatore', chi: 1 }], [4, { difficolta: 'facile' }], [2, { difficolta: 'difficile', durata: 15 }]]) {
  for (let k = 0; k < 2; k++) {
    const g = G.crea({ n, opzioni: op, bot: Array.from({ length: n }, () => 'medio') });
    let ora = Date.now(), t = 0;
    while (!g.finita && t < 31 * 60 * 20) { ora += 50; t++; g.tick(ora); g.statoTick(0); }
    assert.ok(g.finita && ['umani', 'alieno'].includes(g.vittoria), `partita ${n} ${JSON.stringify(op)} finita`);
    assert.ok(g.risultato.fazioni.length === (g.mostro === null ? 1 : 2));
  }
}
console.log('✓ Alien: Isolation 3D');
