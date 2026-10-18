// CORSA DI MACCHININE: piste chiuse e senza incroci, semaforo, fisica (gas, freno, sterzo, erba, guard-rail, urti),
// giri con i checkpoint (niente scorciatoie), classifica, e tante gare tra computer su tutte le piste.
const assert = require('assert');
const { GIOCHI } = require('../../giochi');
const M = GIOCHI.corsa;
const { PISTE, lineaDi, SEMAFORO, N_CP, V_MAX, PASSO_C } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.033); k++) { g.tempoRound += 0.033; if (g.passo(0.033)) return true; } return false; };

assert.strictEqual(M.meta.id, 'corsa');
assert.deepStrictEqual(M.meta.giocatori, [2, 3, 4, 5, 6]);
assert.ok(Object.keys(PISTE).length >= 3, 'almeno 3 piste');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));

// ---- le piste: chiuse, punti regolari, tratti lontani tra loro (l'erba in mezzo) ----
for (const [id, p] of Object.entries(PISTE)) {
  const C = lineaDi(p.punti), N = C.length;
  assert.ok(N > 200, `${id}: pista abbastanza lunga`);
  for (let i = 0; i < N; i++) { const d = Math.hypot(C[(i + 1) % N].x - C[i].x, C[(i + 1) % N].y - C[i].y); assert.ok(Math.abs(d - PASSO_C) < 3, `${id}: punti a distanza costante`); }
  for (let i = 0; i < N; i += 2) for (let j = i + 40; j < N; j += 2) {
    if (N - (j - i) < 40) continue;
    assert.ok(Math.hypot(C[i].x - C[j].x, C[i].y - C[j].y) > p.larga * 1.9, `${id}: due tratti della pista non si toccano (${i}, ${j})`);
  }
}

// ---- semaforo: prima del verde si sta fermi ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g);
  const c = g.auto[0], x0 = c.x, y0 = c.y;
  g.input(0, { y: -1 }); passa(g, SEMAFORO - 0.2);
  assert.ok(Math.hypot(c.x - x0, c.y - y0) < 1, 'col rosso non si parte');
  passa(g, 1.2);
  assert.ok(Math.hypot(c.x - x0, c.y - y0) > 30, 'col verde si va');
  // gas, freno, sterzo
  const v1 = Math.hypot(c.vx, c.vy); assert.ok(v1 > 300, `accelera (${Math.round(v1)})`);
  g.input(0, { y: 1 }); passa(g, 0.3); assert.ok(Math.hypot(c.vx, c.vy) < v1 - 200, 'il freno rallenta');
  g.input(0, { y: -1, x: 1 }); const a0 = c.a; passa(g, 0.4); assert.ok(Math.abs(c.a - a0) > 0.3, 'sterza');
  g.input(0, { x: 0, y: 0 });
  // retromarcia
  const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(h); h.tempoRound = SEMAFORO;
  const d = h.auto[1]; h.input(1, { y: 1 }); passa(h, 1);
  assert.ok(d.vx * Math.cos(d.a) + d.vy * Math.sin(d.a) < -50, 'da fermi il freno è la retromarcia');
}

// ---- erba, guard-rail, urti ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); g.tempoRound = SEMAFORO;
  const c = g.auto[0], p = g.C[c.idx];
  Object.assign(c, { x: p.x + p.nx * (g.mezza + 60), y: p.y + p.ny * (g.mezza + 60), a: Math.atan2(p.ty, p.tx), vx: 0, vy: 0 });
  g.auto[1].x = 99999;
  g.input(0, { y: -1 });
  let maxErba = 0, tickErba = 0;
  for (let k = 0; k < 90; k++) { g.tempoRound += 0.033; g.passo(0.033); if (c.erba) { tickErba++; if (tickErba > 20) maxErba = Math.max(maxErba, Math.hypot(c.vx, c.vy)); } else tickErba = 0; }
  assert.ok(maxErba > 100 && maxErba < 300, `sull'erba si va piano (${Math.round(maxErba)})`);
  // contro il guard-rail si rimbalza indietro
  const q = g.C[c.idx];
  Object.assign(c, { x: q.x + q.nx * (g.mezza + 100), y: q.y + q.ny * (g.mezza + 100), a: Math.atan2(q.ny, q.nx), vx: q.nx * 400, vy: q.ny * 400 });
  passa(g, 0.5);
  const lat = (c.x - g.C[c.idx].x) * g.C[c.idx].nx + (c.y - g.C[c.idx].y) * g.C[c.idx].ny;
  assert.ok(Math.abs(lat) <= g.mezza + 130 + 2, 'il guard-rail non si passa');
  // urto tra due macchine
  const u = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(u);
  const [A, B] = u.auto; Object.assign(A, { x: 0, y: 0, vx: 300, vy: 0 }); Object.assign(B, { x: 36, y: 0, vx: 0, vy: 0 });
  u.urtiTraAuto();
  assert.ok(B.vx > 100 && A.vx < 200 && Math.hypot(B.x - A.x, B.y - A.y) >= 37.9, 'l\'urto spinge l\'altra macchina');
  const n = M.crea({ n: 2, opzioni: { urti: 'no' }, bot: [null, null] }); assert.strictEqual(n.collisioni, false);
}

// ---- giri e checkpoint: un giro vale solo passando da tutti, niente scorciatoie ----
{
  const g = M.crea({ n: 2, opzioni: { giri: 1 }, bot: [null, null] }); parti(g); g.tempoRound = SEMAFORO + 1;
  const c = g.auto[0], N = g.N;
  const metti = (i) => { const p = g.C[i % N]; c.x = p.x; c.y = p.y; g.aggiornaGiro(c); };
  // avanti a passetti per tutta la pista: un giro intero
  for (let i = c.idx; i <= c.idx + 20; i += 10) metti(i);
  assert.strictEqual(c.giri, 0, 'passata la linea di partenza si comincia il primo giro');
  for (let i = 10; i <= N + 10; i += 10) metti(i);
  assert.ok(c.giri === 1 && c.fine !== null && g.arrivati[0] === 0, 'giro completo: arrivato');
  // scorciatoia: salto da metà pista al traguardo senza passare dai checkpoint
  const h = M.crea({ n: 2, opzioni: { giri: 1 }, bot: [null, null] }); parti(h); h.tempoRound = SEMAFORO + 1;
  const d = h.auto[0];
  const vai = (i) => { const p = h.C[(i + h.N) % h.N]; d.x = p.x; d.y = p.y; h.aggiornaGiro(d); };
  for (let i = d.idx; i <= d.idx + 20; i += 10) vai(i);
  for (let i = 10; i < h.N / 2; i += 10) vai(i);
  d.idx = h.N - 20; for (let i = h.N - 20; i <= h.N + 10; i += 10) vai(i);
  assert.ok(d.giri === 0 && d.fine === null, 'senza i checkpoint il giro non conta');
  // all'indietro non si contano i checkpoint
  const b = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(b);
  const e = b.auto[0]; const cp0 = e.cp;
  for (let i = e.idx; i > e.idx - 100; i -= 10) { const p = b.C[(i + b.N) % b.N]; e.x = p.x; e.y = p.y; b.aggiornaGiro(e); }
  assert.strictEqual(e.cp, cp0, 'andando al contrario non si avanza');
  assert.strictEqual(N_CP, 8);
}

// ---- classifica e punti ----
{
  const g = M.crea({ n: 3, opzioni: { giri: 1 }, bot: [null, null, null] }); parti(g);
  g.auto[2].fine = 50; g.auto[1].giri = 0; g.auto[1].cp = 4; g.auto[0].giri = 0; g.auto[0].cp = 1;
  assert.deepStrictEqual(g.classifica(), [2, 1, 0]);
  g.fineRound(); g.chiudi();
  assert.deepStrictEqual(g.risultato.fazioni.map((f) => f.punti), [0, 1, 2]);
  assert.deepStrictEqual(g.risultato.vincitori, [2]);
  assert.ok(JSON.stringify(g.vistaTick(0)).length < 1500, 'tick piccolo');
}

// ---- gare complete tra computer, su tutte le piste e con 2-6 macchine ----
{
  const liv = ['facile', 'medio', 'difficile'];
  const vinte = { facile: 0, medio: 0, difficile: 0 }, tempi = { facile: [], medio: [], difficile: [] };
  let gare = 0, finite = 0, macchine = 0;
  const t0 = Date.now();
  const piste = Object.keys(PISTE);
  for (const n of [2, 3, 4, 5, 6]) for (let k = 0; k < 60; k++) {
    const bot = Array.from({ length: n }, (_, i) => liv[(i + k) % 3]);
    const g = M.crea({ n, opzioni: { pista: piste[k % piste.length], giri: k % 5 === 0 ? 3 : 1, urti: k % 3 === 2 ? 'no' : 'si' }, bot });
    let ora = Date.now(), passi = 0;
    while (!g.finita) { ora += 33; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora); assert.ok(++passi < 40000, 'la gara finisce'); }
    assert.strictEqual(g.risultato.vincitori.length, 1, 'c\'è sempre un vincitore');
    vinte[bot[g.risultato.vincitori[0]]]++;
    for (const c of g.auto) { macchine++; if (c.fine !== null) { finite++; if (g.nGiri === 1 && g.idPista === 'parco') tempi[bot[c.id]].push(c.fine); } }
    gare++;
  }
  const media = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  assert.ok(finite > macchine * 0.9, `quasi tutti i computer finiscono la gara (${finite}/${macchine})`);
  assert.ok(media(tempi.difficile) < media(tempi.medio) && media(tempi.medio) < media(tempi.facile), `il difficile gira più forte ${JSON.stringify({ f: media(tempi.facile), m: media(tempi.medio), d: media(tempi.difficile) })}`);
  assert.ok(vinte.difficile > vinte.medio && vinte.medio >= vinte.facile, `vittorie ${JSON.stringify(vinte)}`);
  assert.ok(V_MAX > 500);
  console.log(`✓ Corsa di macchinine: ${Object.keys(PISTE).length} piste chiuse senza incroci, semaforo, gas/freno/retromarcia/sterzo, erba, guard-rail, urti, giri con 8 checkpoint (niente scorciatoie), classifica e punti, ${gare} gare tra computer con 2-6 macchine (${finite}/${macchine} arrivate; vittorie f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile}) in ${Date.now() - t0} ms`);
}
// ---- pista disegnata ----
{
  const { controllaPista, dalDisegno, pistaACaso, MONDO_W, MONDO_H } = M._test;
  // un cerchio disegnato va bene; un otto (si incrocia) no; un ghirigoro con curve strettissime no; un giro aperto no
  const cerchio = Array.from({ length: 120 }, (_, i) => [0.5 + 0.4 * Math.cos((i / 120) * 2 * Math.PI), 0.5 + 0.4 * Math.sin((i / 120) * 2 * Math.PI)]);
  const r = dalDisegno(cerchio);
  assert.ok(r.punti && r.punti.length >= 8, JSON.stringify(r));
  for (const q of r.punti) assert.ok(q[0] >= 0 && q[0] <= MONDO_W && q[1] >= 0 && q[1] <= MONDO_H, 'dentro la mappa');
  const otto = Array.from({ length: 200 }, (_, i) => { const t = (i / 200) * 2 * Math.PI; return [0.5 + 0.4 * Math.sin(t), 0.5 + 0.3 * Math.sin(2 * t)]; });
  assert.ok(/incrocia|vicini/.test(dalDisegno(otto).errore || ''), 'l\'otto si incrocia');
  const zig = Array.from({ length: 200 }, (_, i) => { const t = (i / 200) * 2 * Math.PI; return [0.5 + 0.4 * Math.cos(t) + 0.04 * Math.cos(t * 25), 0.5 + 0.4 * Math.sin(t) + 0.04 * Math.sin(t * 25)]; });
  assert.ok(dalDisegno(zig).errore, 'troppe curve strette');
  assert.ok(/Chiudi/.test(dalDisegno(cerchio.slice(0, 60)).errore || ''), 'mezzo giro non vale');
  assert.ok(dalDisegno('ciao').errore && dalDisegno([[1, 'a']]).errore, 'disegni non validi');
  for (let k = 0; k < 20; k++) assert.ok(controllaPista(pistaACaso()).ok, 'le piste a caso vanno bene');
  // il disegno a tavolo: solo chi disegna, poi via
  const g = M.crea({ n: 2, opzioni: { pista: 'disegnata', giri: 1 }, bot: [null, 'medio'] });
  assert.strictEqual(g.fase, 'disegno');
  assert.ok(g.vista(1).extra.disegno && g.vistaTick(0).fase === 'disegno');
  assert.ok(g.azione(1, { tipo: 'caso' }).errore, 'disegna solo il primo');
  assert.ok(g.azione(0, { tipo: 'via' }).errore, 'prima si disegna');
  assert.ok(g.azione(0, { tipo: 'traccia', punti: otto }).errore);
  assert.ok(g.azione(0, { tipo: 'traccia', punti: cerchio }).ok && g.bozza);
  assert.ok(!g.tick(Date.now()), 'durante il disegno non si corre');
  assert.ok(g.azione(0, { tipo: 'via' }).ok && g.fase === 'via' && g.pista.nome === 'Pista disegnata');
  assert.ok(g.azione(0, { tipo: 'caso' }).errore, 'a gara cominciata non si disegna più');
  // tempo scaduto: si parte con una pista a caso
  const h = M.crea({ n: 2, opzioni: { pista: 'disegnata' }, bot: [null, null] });
  h.fineDisegno = Date.now() - 1; assert.ok(h.tick(Date.now()) && h.fase === 'via');
  // tutti computer: pista inventata subito, e le gare finiscono
  let finite = 0, macchine = 0;
  for (let k = 0; k < 12; k++) {
    const c = M.crea({ n: 3, opzioni: { pista: 'disegnata', giri: 1 }, bot: ['facile', 'medio', 'difficile'] });
    assert.strictEqual(c.pista.nome, 'Pista inventata');
    let ora = Date.now(), passi = 0;
    while (!c.finita) { ora += 33; if (c.fase !== 'gioco') c.fineFase = Math.min(c.fineFase, ora); c.tick(ora); assert.ok(++passi < 40000); }
    for (const a of c.auto) { macchine++; if (a.fine !== null) finite++; }
  }
  assert.ok(finite > macchine * 0.85, `i computer finiscono le piste inventate (${finite}/${macchine})`);
  console.log(`✓ Corsa con la pista disegnata: disegno lisciato e ingrandito, giri che si incrociano o con curve troppo strette rifiutati, pista a caso, tempo per disegnare, ${finite}/${macchine} macchine arrivate su piste inventate`);
}
