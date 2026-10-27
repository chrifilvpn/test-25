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
  assert.ok(Array.isArray(s.pi) && s.me.length === 4, 'il mostro ha i puntini dei rumori e il fiato');
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

// ================= MODALITÀ SURVIVAL =================
{
  const { STAZIONI, MINIGIOCHI, TASK_MIN, FERMO, ATTACCATO, BOTOLA } = G._test;
  // le opzioni della survival si vedono solo scegliendola
  const opz = Object.fromEntries(G.meta.opzioni.map((o) => [o.id, o]));
  assert.deepStrictEqual(opz.alieni.se, { modalita: ['survival'] });
  assert.deepStrictEqual(opz.mostro.se, { modalita: ['classica'] });
  assert.ok(G.meta.regole.some((r) => /SURVIVAL/.test(r) && /task/i.test(r)));
  assert.strictEqual(MINIGIOCHI.length, 4);
  assert.strictEqual(STAZIONI.length, M.OGGETTI.m.length + M.OGGETTI.G.length);
  // le botole: a coppie, su pavimento libero, mai dentro l'attracco (si scapperebbe senza finire le task)
  assert.strictEqual(M.OGGETTI.P.length % 2, 0);
  for (const t of M.OGGETTI.P) { assert.strictEqual(M.cella(...t), '.', `botola ${t} sul pavimento`); assert.notStrictEqual((M.stanzaDi(M.centro(t)) || {}).id, 'attracco'); }
  for (const t of M.OGGETTI.c) assert.ok(M.verso[`${t[0]},${t[1]}`], 'ogni cassa ha un lato libero');

  // i posti degli xenomorfi
  {
    const g = G.crea({ n: 6, opzioni: { modalita: 'survival', alieni: 2, chiS: 3 }, bot: Array(6).fill(null) });
    assert.strictEqual(g.mostri.length, 2); assert.strictEqual(g.mostri[0], 2);
    assert.strictEqual(g.umani.length, 4); assert.strictEqual(g.alieni.length, 2);
    assert.ok(g.alieni.every((A) => g.mostri.includes(A.giocatore)));
    assert.deepStrictEqual(g.vistaExtra(0).mostri, g.mostri);
    const g2 = G.crea({ n: 2, opzioni: { modalita: 'survival', alieni: 3 }, bot: [null, null] });
    assert.strictEqual(g2.mostri.length, 1, 'resta almeno un sopravvissuto');
    const g3 = G.crea({ n: 1, opzioni: { modalita: 'survival', alieni: 2 }, bot: [null] });
    assert.ok(g3.mostri.length === 0 && g3.alieni.length === 2, 'da soli gli xenomorfi sono del computer');
  }

  // le task: E alla stazione, il minigioco finito nel browser, il tempo minimo, il rumore, la fuga
  {
    const g = G.crea({ n: 2, opzioni: { modalita: 'survival', chiS: 2, task: 20 }, bot: [null, null] }); parti(g);
    for (const A of g.alieni) Object.assign(A, { inCondotto: true, stato: 'condotto', x: 30, y: 30 });
    const u = g.umani[0];
    g.stazioni.forEach((S) => { S.pausa = 0; });
    const vaiA = (si) => { const t = STAZIONI[si].t, d = davantiA(t), c = M.centro(t); Object.assign(u, { x: d.x, y: d.y, yaw: Math.atan2(c.y - d.y, c.x - d.x) }); g.cmd[0].yaw = u.yaw; };
    vaiA(0); g.interagisci(u);
    assert.ok(u.task && u.task.s === 0 && g.stazioni[0].chi === 0, 'la task comincia');
    assert.ok(g.statoTick(0).me[5], 'il browser sa che minigioco aprire');
    const S = g.stazioni[0];
    g.input(0, { tf: [0, S.seme + 1] }); passa(g, 4);
    assert.strictEqual(g.fatte, 0, 'seme sbagliato: niente');
    g.interagisci(u); assert.ok(!u.task, 'E lascia la task'); g.interagisci(u);
    g.input(0, { tf: [0, S.seme] }); passa(g, 0.5);
    assert.strictEqual(g.fatte, 0, 'troppo in fretta: si aspetta il tempo minimo');
    passa(g, TASK_MIN[S.diff]);
    assert.strictEqual(g.fatte, 1, 'task completata');
    assert.ok(S.pausa > 20 && S.chi === null && !u.task, 'la stazione si riposa');
    g.interagisci(u); assert.ok(!u.task, 'in riposo non si può rifare');
    // fino all'obiettivo: parte la fuga
    while (g.fatte < g.obiettivo) {
      const si = g.stazioni.findIndex((x) => x.pausa <= 0 && x.chi === null);
      if (si < 0) { g.stazioni.forEach((x) => { x.pausa = 0; }); continue; }
      vaiA(si); g.interagisci(u); g.input(0, { tf: [si, g.stazioni[si].seme] }); passa(g, 4);
    }
    assert.ok(g.sbloccato, 'task finite: si fugge');
    assert.ok(g.alieni[0].zona || g.alieni[0].pings, 'gli xenomorfi corrono all\'attracco');
  }

  // chi sta fermo è invisibile allo xenomorfo giocatore (se non gli è attaccato); il colpo davanti lo prende lo stesso
  {
    const g = G.crea({ n: 2, opzioni: { modalita: 'survival', chiS: 1 }, bot: [null, null] }); parti(g);
    const A = g.alieni[0], u = g.umani[0];
    assert.strictEqual(A.giocatore, 0);
    // tutti e due nel corridoio principale, a 6 m
    Object.assign(A, { inCondotto: false, stato: 'giro', x: 20.5 * M.T, y: 15.5 * M.T, yaw: 0, anim: 'fermo' });
    Object.assign(u, { x: 20.5 * M.T + 60, y: 15.5 * M.T, fermo: 0 });
    assert.ok(g.statoTick(0).u.some((x) => x[0] === 1), 'chi si muove si vede');
    passa(g, FERMO + 0.3);
    assert.ok(!g.statoTick(0).u.some((x) => x[0] === 1), 'chi sta fermo sparisce');
    assert.ok(!AI.vedeUmano(g, A, u), 'anche per l\'IA');
    u.x = A.x + ATTACCATO - 5;
    assert.ok(g.statoTick(0).u.some((x) => x[0] === 1), 'attaccato si vede');
    u.x = A.x + 18;
    // attacco di lato: niente; davanti: preso con un colpo solo
    g.cmd[0].yaw = Math.PI / 2; g.cmd[0].c[0]++; passa(g, 0.05);
    assert.ok(u.vivo, 'il colpo è solo davanti');
    passa(g, 0.8);
    g.cmd[0].yaw = 0; g.cmd[0].c[0]++; passa(g, 0.05);
    assert.ok(!u.vivo, 'un colpo, morto');
  }

  // il lanciafiamme stordisce lo xenomorfo giocatore (fermo per qualche secondo)
  {
    const g = G.crea({ n: 2, opzioni: { modalita: 'survival', chiS: 1 }, bot: [null, null] }); parti(g);
    const A = g.alieni[0], u = g.umani[0];
    Object.assign(A, { inCondotto: false, stato: 'giro', x: 20.5 * M.T + 30, y: 15.5 * M.T, yaw: Math.PI });
    Object.assign(u, { x: 20.5 * M.T, y: 15.5 * M.T, yaw: 0 });
    g.fiamma(u);
    assert.ok(A.stordito > 2, 'stordito');
    const x0 = A.x; g.inp[0].y = -1; passa(g, 1);
    assert.ok(Math.abs(A.x - x0) < 0.5, 'stordito non si muove');
    g.inp[0].y = 0;
  }

  // casse e passaggi di servizio
  {
    const g = G.crea({ n: 1, opzioni: { modalita: 'survival' }, bot: [null] }); parti(g); lontano(g);
    const u = g.umani[0];
    const c = M.OGGETTI.c[0], d = davantiA(c), cc = M.centro(c);
    Object.assign(u, { x: d.x, y: d.y, yaw: Math.atan2(cc.y - d.y, cc.x - d.x) });
    g.interagisci(u);
    assert.ok(u.nascosto && u.nascosto.x === c[0], 'dentro la cassa');
    g.interagisci(u); assert.ok(!u.nascosto);
    const b = M.centro(M.OGGETTI.P[0]); Object.assign(u, { x: b.x, y: b.y });
    g.interagisci(u);
    assert.ok(u.botola, 'nel passaggio');
    assert.ok(!AI.vedeUmano(g, g.alieni[0], u), 'nel passaggio nessuno ti vede');
    passa(g, BOTOLA + 0.2);
    const e = M.centro(M.OGGETTI.P[1]);
    assert.ok(!u.botola && Math.hypot(u.x - e.x, u.y - e.y) < 1, 'esce dalla botola gemella');
  }

  // partite tra computer: finiscono tutte (anche con tre xenomorfi)
  for (const [n, op] of [[1, {}], [4, {}], [6, { alieni: 2 }], [8, { alieni: 3, task: 40, tempoS: 5 }], [3, { chiS: 1 }]]) {
    const g = G.crea({ n, opzioni: { modalita: 'survival', ...op }, bot: Array.from({ length: n }, () => 'medio') });
    let ora = Date.now(), t = 0;
    while (!g.finita && t < 21 * 60 * 20) { ora += 50; t++; g.tick(ora); for (let p = 0; p < n; p++) g.statoTick(p); }
    assert.ok(g.finita && ['umani', 'alieno'].includes(g.vittoria), `survival ${n} ${JSON.stringify(op)} finita`);
  }
  console.log('✓ Alien: Isolation 3D, survival: posti degli xenomorfi, task e fuga, invisibili da fermi, colpo davanti, fuoco che stordisce, casse e botole');
}

// ---- i bug sistemati (27/10/2026) e le migliorie ----
{
  const { STAZIONI } = G._test;
  // B1: il razzo acceso continua a fare rumore e lo xenomorfo lo sente mentre brucia
  {
    const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
    g.razzi.push({ x: 300, y: 300, t: 18 });
    let sentiti = 0; const orig = AI.passo;
    AI.passo = (gg, A, dt) => { sentiti += gg.rumori.filter((n) => n.tipo === 'razzo').length; return orig(gg, A, dt); };
    passa(g, 5);
    AI.passo = orig;
    assert.ok(sentiti > 3, `il razzo acceso fa rumore per lo xenomorfo: ${sentiti}`);
  }
  // B2: nella survival, dopo lo sblocco, i compagni del computer vicini a un generatore vanno all'uscita
  for (let gi = 0; gi < M.OGGETTI.G.length; gi++) {
    const g = G.crea({ n: 2, opzioni: { modalita: 'survival', chiS: 1 }, bot: ['medio', 'medio'] }); parti(g);
    for (const A of g.alieni) { Object.assign(A, { inCondotto: true, stato: 'condotto', attesa: 1e9, x: 30, y: 30 }); A.mente.tregua = 1e9; }
    g.sbloccato = true;
    const u = g.umani[0]; Object.assign(u, davantiA(M.OGGETTI.G[gi]));
    const x0 = u.x, y0 = u.y;
    passa(g, 6);
    assert.ok(u.fuggito || Math.hypot(u.x - x0, u.y - y0) > 30, `il compagno non resta fermo al generatore ${gi}`);
  }
  // B3: dopo una ricarica della pagina i contatori ripartono e i tasti funzionano subito
  {
    const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
    g.input(0, { c: [0, 0, 5, 0] }); g.premuti(0);
    g.input(0, { c: [0, 0, 0, 0] }); g.input(0, { c: [0, 0, 1, 0] });
    assert.strictEqual(g.premuti(0)[2], 1, 'F conta anche dopo la ricarica');
  }
  // B4: lo xenomorfo giocatore stordito non apre gli armadietti
  {
    const g = G.crea({ n: 2, opzioni: { modalita: 'survival', chiS: 1 }, bot: [null, null] }); parti(g);
    const A = g.alieni[0], u = g.umani[0], t = M.OGGETTI.L[0], c = davantiA(t), cl = M.centro(t);
    Object.assign(u, { x: c.x, y: c.y, yaw: Math.atan2(cl.y - c.y, cl.x - c.x) }); g.interagisci(u);
    Object.assign(A, { inCondotto: false, stato: 'giro', x: c.x, y: c.y, yaw: Math.atan2(cl.y - c.y, cl.x - c.x), stordito: 3, colpoT: 3 });
    g.cmd[0].yaw = A.yaw; g.cmd[0].c[1] = 1; g.passo(0.05);
    assert.ok(u.vivo, 'stordito non tira fuori nessuno');
    A.stordito = 0; A.colpoT = 0; g.cmd[0].c[1] = 2; g.passo(0.05);
    assert.ok(!u.vivo, 'ripreso, apre l\'armadietto');
  }
  // B5: nella survival lo xenomorfo del computer esce presto (8 secondi)
  {
    const g = G.crea({ n: 1, opzioni: { modalita: 'survival' }, bot: [null] }); parti(g);
    let t = 0; while (g.alieno.inCondotto && t < 30) { g.tempoRound += 0.05; g.passo(0.05); t += 0.05; }
    assert.ok(t < 12, `esce dopo ${t.toFixed(1)} s`);
  }
  // B10: un generatore lo riaccende una persona alla volta
  {
    const g = G.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); lontano(g);
    const [a, b] = g.umani, t = M.OGGETTI.G[0], d = davantiA(t), cg = M.centro(t);
    for (const u of [a, b]) Object.assign(u, { x: d.x, y: d.y, yaw: Math.atan2(cg.y - d.y, cg.x - d.x) });
    g.interagisci(a); g.interagisci(b);
    assert.strictEqual(a.gen, 0); assert.strictEqual(b.gen, null, 'il secondo aspetta');
  }
  // B12: lo xenomorfo giocatore non riceve chi è nascosto (anche nella classica)
  {
    const g = G.crea({ n: 2, opzioni: { mostro: 'giocatore', chi: 1 }, bot: [null, null] }); parti(g);
    const u = g.umani[0], t = M.OGGETTI.L[0], c = davantiA(t), cl = M.centro(t);
    Object.assign(u, { x: c.x, y: c.y, yaw: Math.atan2(cl.y - c.y, cl.x - c.x) }); g.interagisci(u);
    assert.ok(!g.statoTick(0).u.some((x) => x[0] === u.k), 'il nascosto non arriva allo xenomorfo');
    assert.ok(g.statoTick(1).u.some((x) => x[0] === u.k), 'a sé stesso sì');
  }
  // le scorte prese ricompaiono dopo un po'
  {
    const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); lontano(g);
    const u = g.umani[0]; u.batteria = 10; Object.assign(u, M.centro(M.OGGETTI.b[0])); g.raccogli(u);
    assert.ok(g.raccolti[0] && g.ricarica[0] >= 50 && g.ricarica[0] <= 120, 'ricompare tra un po'); Object.assign(u, M.centro(M.OGGETTI.S[0])); g.ricarica[0] = 0.01; passa(g, 0.1); assert.ok(!g.raccolti[0], 'la batteria è ricomparsa');
  }
  // le task diventano più difficili verso la fine
  {
    const g = G.crea({ n: 1, opzioni: { modalita: 'survival' }, bot: [null] }); parti(g);
    g.fatte = 0; const prima = Array.from({ length: 200 }, () => g.nuovaTask().diff);
    g.fatte = g.obiettivo; const dopo = Array.from({ length: 200 }, () => g.nuovaTask().diff);
    assert.ok(!prima.includes(3) && !dopo.includes(1), 'all\'inizio 1-2 stelle, alla fine 2-3');
    assert.ok(STAZIONI.length > 0);
  }
  // porte, generatori, scorte e task partono solo quando cambiano (e due volte al secondo); lo stato completo li ha sempre
  {
    const g = G.crea({ n: 1, opzioni: { modalita: 'survival' }, bot: [null] }); parti(g); lontano(g);
    let senza = 0, ora = Date.now();
    for (let k = 0; k < 40; k++) { ora += 50; g.tick(ora); if (!('o' in g.statoTick(0))) senza++; }
    assert.ok(senza > 20, `scorte non rimandate a ogni tick: ${senza}`);
    const v = g.vista(0); assert.ok(v.stato.s.p && v.stato.s.g && v.stato.s.o !== undefined && v.stato.s.ts, 'lo stato completo ha tutto');
    assert.ok(g.vistaExtra(0).idPartita, 'il segno della partita');
  }
  // le scorte cambiano posto a ogni partita (quelle che non compaiono risultano già raccolte)
  {
    const viste = new Set();
    for (let k = 0; k < 8; k++) { const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); viste.add(g.raccolti.join('')); assert.ok(g.raccolti.some((x) => !x), 'qualcosa compare'); }
    assert.ok(viste.size > 1, 'le scorte non sono sempre nelle stesse caselle');
  }
  // la strada più breve (A* col mucchio): uguale a prima da ogni partenza a ogni generatore
  for (const s of M.OGGETTI.S) for (const t of M.OGGETTI.G) { const p = M.strada(s, M.quadretto(davantiA(t)), false); assert.ok(p && p.length > 1); }
  console.log('✓ Alien: Isolation 3D, bug sistemati: razzo acceso, compagni ai generatori, tasti dopo la ricarica, stordito, uscita presto, generatore a uno, nascosti, scorte, task, dati leggeri');
}

// ================= WORKING JOE, FACEHUGGER, NUOVI SETTORI, TESSERA E FUSIBILE =================
{
  const CR = require('../../giochi3/isolation/creature');
  const tutto = { obiettivi: 'si', androidi: 'pochi', facehugger: 'si' };
  // la mappa: i nuovi settori, la tessera, il fusibile, le uova e le partenze dei Joe si raggiungono dall'inizio
  for (const id of ['sicurezza', 'lorenz', 'nido']) assert.ok(M.STANZE.some((s) => s.id === id), `settore ${id}`);
  for (const c of ['k', 'z', 'J', 'U']) for (const t of M.OGGETTI[c]) {
    assert.strictEqual(M.cella(...t), '.', `${c} ${t} sul pavimento`);
    assert.ok(M.strada(M.OGGETTI.S[0], t, false), `${c} ${t} raggiungibile`);
  }
  assert.strictEqual(M.stanzaDi(M.centro(M.OGGETTI.k[0])).id, 'sicurezza');
  assert.strictEqual(M.stanzaDi(M.centro(M.OGGETTI.z[0])).id, 'lorenz');
  // senza opzioni (e nella survival) niente Joe, uova, obiettivi
  {
    const g = G.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
    assert.ok(!g.joe.length && !g.uova.length && !g.obiettivi);
    const s = G.crea({ n: 1, opzioni: { modalita: 'survival', ...tutto }, bot: [null] }); parti(s);
    assert.ok(!s.joe.length && !s.uova.length && !s.obiettivi, 'la survival non li ha');
    const t = G.crea({ n: 1, opzioni: { ...tutto, androidi: 'tanti' }, bot: [null] }); parti(t);
    assert.ok(t.joe.length === 4 && t.uova.length === M.OGGETTI.U.length && t.obiettivi);
  }
  // gli obiettivi: il generatore vuole il suo oggetto, si raccoglie, poi parte
  {
    const g = G.crea({ n: 1, opzioni: { obiettivi: 'si' }, bot: [null] }); parti(g); lontano(g);
    const u = g.umani[0], ev = []; const e0 = g.ev.bind(g); g.ev = (e) => { ev.push(e); return e0(e); };
    const alGen = () => { Object.assign(u, davantiA(M.OGGETTI.G[1])); const c = M.centro(M.OGGETTI.G[1]); u.yaw = Math.atan2(c.y - u.y, c.x - u.x); };
    alGen(); g.interagisci(u);
    assert.ok(ev.some((e) => e[0] === 'serve' && e[2] === 'z') && !u.gen, 'Ingegneria vuole il fusibile');
    Object.assign(u, M.centro(M.OGGETTI.z[0])); g.raccogli(u);
    assert.ok(g.chiavi.z && g.lentiOra().ob[1] === 1, 'fusibile preso');
    alGen(); g.interagisci(u);
    assert.ok(!g.manca(1) && g.generatori[1].chi === 0, 'ora parte');
    assert.ok(g.manca(2) === 'k', 'le Comunicazioni vogliono ancora la tessera');
  }
  // il Working Joe: ti vede, ti prende per il collo, E per divincolarsi; se no ti strangola
  {
    const g = G.crea({ n: 1, opzioni: { androidi: 'pochi' }, bot: [null] }); parti(g); lontano(g);
    const u = g.umani[0], J = g.joe[0]; g.joe.length = 1;
    Object.assign(u, M.centro(M.OGGETTI.S[0])); Object.assign(J, { x: u.x + 6, y: u.y, yaw: Math.PI, stato: 'giro', stordito: 0 });
    passa(g, 0.1);
    assert.ok(u.presa && J.stato === 'stringe', 'preso');
    assert.ok(g.statoTick(0).u[0][5] & 8192, 'il bit della presa');
    assert.strictEqual(g.velocita(u), 0, 'non si cammina');
    for (let k = 0; k < CR.JOE.colpi; k++) g.interagisci(u);
    assert.ok(!u.presa && J.stordito > 0 && u.vivo, 'divincolato');
    // la seconda volta non si divincola: muore
    J.stordito = 0; passa(g, 0.1); passa(g, 0.1);
    assert.ok(u.presa, 'ripreso'); passa(g, CR.JOE.stretta + 0.5);
    assert.ok(!u.vivo && !u.presa, 'strangolato');
  }
  // il fuoco: un compagno libera chi è preso, il Joe resta stordito
  {
    const g = G.crea({ n: 2, opzioni: { androidi: 'pochi' }, bot: [null, null] }); parti(g); lontano(g);
    const [a, b] = g.umani, J = g.joe[0]; g.joe.length = 1;
    Object.assign(a, M.centro(M.OGGETTI.S[0])); Object.assign(J, { x: a.x + 6, y: a.y, yaw: Math.PI });
    g.presa(a, J); J.stato = 'stringe'; J.preda = a.k;
    Object.assign(b, { x: a.x + 30, y: a.y, yaw: Math.PI, carburante: 100, fiamma: 0 }); g.fiamma(b);
    assert.ok(!a.presa && J.stordito > 0 && J.stato === 'giro', 'liberato col fuoco');
  }
  // le uova: chi passa vicino le sveglia (accucciato si passa); il facehugger salta in faccia; il fuoco lo brucia
  {
    const g = G.crea({ n: 1, opzioni: { facehugger: 'si' }, bot: [null] }); parti(g); lontano(g);
    const u = g.umani[0], U = g.uova[0];
    Object.assign(u, { x: U.x + 30, y: U.y, accucciato: true }); for (let k = 0; k < 4; k++) CR.passo(g, 0.05); // senza passa: i tasti lo rialzerebbero
    if (M.vede(U, u, g.aperte)) assert.strictEqual(U.stato, 0, 'accucciato non si sveglia');
    Object.assign(u, { x: U.x + 12, y: U.y, accucciato: false }); passa(g, 0.1);
    assert.strictEqual(U.stato, 1, 'si apre'); passa(g, CR.FH.apre + 0.1);
    assert.ok(U.stato === 2 && g.facehugger.length === 1, 'esce il facehugger');
    const F = g.facehugger[0]; Object.assign(u, { yaw: Math.atan2(F.y - u.y, F.x - u.x), carburante: 100, fiamma: 0 }); g.fiamma(u);
    assert.ok(!g.facehugger.length || g.facehugger[0].stato === 'morto', 'bruciato');
    passa(g, 0.1); assert.ok(!g.facehugger.includes(F), 'tolto');
    // un altro: ti salta in faccia
    g.uova[1].stato = 1; g.uova[1].t = 0; Object.assign(u, { x: g.uova[1].x + 10, y: g.uova[1].y }); passa(g, CR.FH.apre + 1.5);
    assert.ok(!u.vivo, 'preso dal facehugger');
  }
  // tante partite tra computer con tutto acceso: finiscono, e gli obiettivi si prendono
  let presi = 0;
  for (const n of [1, 3]) for (let k = 0; k < 2; k++) {
    const g = G.crea({ n, opzioni: { ...tutto, androidi: k ? 'tanti' : 'pochi' }, bot: Array.from({ length: n }, () => 'medio') });
    let ora = Date.now(), t = 0;
    while (!g.finita && t < 31 * 60 * 20) { ora += 50; t++; g.tick(ora); g.statoTick(0); }
    assert.ok(g.finita && ['umani', 'alieno'].includes(g.vittoria), `partita ${n} con Joe e facehugger finita`);
    presi += g.chiavi.k + g.chiavi.z;
  }
  assert.ok(presi > 0, 'i compagni del computer vanno a prendere tessera e fusibile');
  const opz = Object.fromEntries(G.meta.opzioni.map((o) => [o.id, o]));
  for (const id of ['obiettivi', 'androidi', 'facehugger']) assert.deepStrictEqual(opz[id].se, { modalita: ['classica'] });
  console.log('✓ Alien: Isolation 3D, Working Joe, facehugger, nuovi settori, tessera e fusibile');
}
