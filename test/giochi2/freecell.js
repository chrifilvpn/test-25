// FREECELL: regole delle mosse (colori alternati, celle, basi, pile con la capienza giusta), carte automatiche sulle
// basi, risolutore (le soluzioni si giocano con le regole della partita, anche da metà strada), aiuto, sfide.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/freecell');
const { risolvi, applica, automatiche, capienza, inizioPila, sicura, copia, sulleBasi } = M._test;

const vuoto = () => ({ col: Array.from({ length: 8 }, () => []), celle: [null, null, null, null], basi: { c: 0, q: 0, f: 0, p: 0 } });
// ---- regole ----
{
  const s = vuoto();
  s.col[0] = ['13p', '9c', '8f', '7q']; s.col[1] = ['5f', '10f']; s.col[2] = ['2c'];
  assert.strictEqual(inizioPila(s.col[0]), 1, 'la pila ordinata parte dal 9 di cuori');
  assert.strictEqual(capienza(s, false), 5 * 2 ** 5, 'quattro celle e cinque colonne vuote');
  assert.strictEqual(applica(copia(s), { da: { c: 0, k: 0 }, a: { c: 1 } }) != null, true, 'il re non fa parte della pila');
  const t = copia(s);
  assert.strictEqual(applica(t, { da: { c: 0, k: 1 }, a: { c: 1 } }), null, '9 rosso sul 10 nero, con tutta la pila');
  assert.deepStrictEqual(t.col[1], ['5f', '10f', '9c', '8f', '7q']);
  assert.ok(applica(copia(s), { da: { c: 2 }, a: { b: 1 } }), 'il 2 non va sulla base vuota');
  const u = copia(s); u.celle = ['1c', '1q', '1f', '1p'];
  // celle piene e due colonne vuote verso una piena: (0 + 1) * 2^5? no: colonne vuote 5 → 32
  assert.strictEqual(capienza(u, false), 32);
  const w = copia(s); w.celle = ['3c', '3q', '3f', '3p']; w.col = [['13p', '9c', '8f', '7q'], ['10f'], ['6c'], ['6q'], ['6f'], ['6p'], ['4c'], ['4q']];
  assert.strictEqual(capienza(w, false), 1, 'niente celle e niente colonne vuote: una carta alla volta');
  assert.ok(/al massimo 1/.test(applica(copia(w), { da: { c: 0, k: 1 }, a: { c: 1 } })), 'la pila di 3 non si sposta');
}
// ---- automatiche: assi e due sempre, il resto solo se sicuro ----
{
  const s = vuoto();
  s.col[0] = ['3c', '1c']; s.col[1] = ['2c']; s.col[2] = ['1f'];
  automatiche(s);
  assert.deepStrictEqual(s.basi, { c: 2, q: 0, f: 1, p: 0 }, 'assi e 2 salgono');
  assert.ok(!sicura(s, '3c'), 'il 3 di cuori serve ancora (i neri sono indietro)');
}
// ---- distribuzioni: la soluzione salvata si gioca davvero ----
{
  const t0 = Date.now();
  for (let k = 0; k < 15; k++) {
    const g = M.crea({ n: 1, opzioni: {}, bot: [null] });
    for (const m of g.soluzione) assert.ok(g.azione(0, { tipo: 'sposta', da: m.da, a: m.a }).ok, `mossa della soluzione ${JSON.stringify(m)}`);
    assert.ok(g.finita, 'tutte sulle basi');
    assert.strictEqual(sulleBasi(g.tavole[0].s), 52);
  }
  // da metà strada (dopo qualche mossa a caso) il risolutore ritrova la via
  let ritrovate = 0;
  for (let k = 0; k < 10; k++) {
    const g = M.crea({ n: 1, opzioni: {}, bot: [null] });
    for (const m of g.soluzione.slice(0, 15)) g.azione(0, { tipo: 'sposta', da: m.da, a: m.a });
    const r = risolvi(g.tavole[0].s, 40000);
    if (r.mosse) { ritrovate++; for (const m of r.mosse) assert.ok(g.azione(0, { tipo: 'sposta', da: m.da, a: m.a }).ok); assert.ok(g.finita); }
  }
  assert.ok(ritrovate >= 9, `da metà strada (${ritrovate}/10)`);
  assert.ok(Date.now() - t0 < 30000);
}
// ---- annulla, ricomincia, aiuto ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] });
  const t = g.tavole[0], prima = JSON.stringify(t.s);
  const m = g.soluzione[0];
  g.azione(0, { tipo: 'sposta', da: m.da, a: m.a });
  g.azione(0, { tipo: 'annulla' });
  assert.strictEqual(JSON.stringify(t.s), prima, 'annulla');
  g.azione(0, { tipo: 'sposta', da: m.da, a: m.a });
  g.azione(0, { tipo: 'ricomincia' });
  assert.strictEqual(JSON.stringify(t.s), prima, 'ricomincia');
  assert.ok(g.azione(0, { tipo: 'aiuto' }).ok && t.suggerimento && t.penale === 15000);
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 60;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'].map((_, i, a) => a[(i + k) % 3]);
    const g = M.crea({ n: 3, opzioni: {}, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(primi.difficile > primi.facile, JSON.stringify(primi));
  console.log(`✓ FreeCell: colori alternati, celle, basi, pile con la capienza giusta, carte automatiche, annulla, aiuto; distribuzioni sempre vincibili (soluzioni giocate fino in fondo, anche da metà strada); ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile} (${Date.now() - t0} ms)`);
}
