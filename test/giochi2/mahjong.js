// MAHJONG SOLITARIO: figure giuste (144 e 80 posti, niente tessere sovrapposte nello stesso strato), regola delle
// tessere libere, schemi sempre risolvibili (la soluzione di costruzione si gioca davvero), coppie di fiori e stagioni,
// annulla, aiuto, rimescola risolvibile, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/mahjong');
const { FIGURE, vicini, libera, riempi, rimescola, coppie, uguali } = M._test;

assert.strictEqual(FIGURE.tartaruga.posti.length, 144);
assert.strictEqual(FIGURE.piramide.posti.length, 80);
for (const f of Object.values(FIGURE)) {
  const P = f.posti;
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
    if (P[a][2] === P[b][2]) assert.ok(Math.abs(P[a][0] - P[b][0]) >= 2 || Math.abs(P[a][1] - P[b][1]) >= 2, `${f.nome}: tessere sovrapposte`);
  }
  // ogni tessera sopra il primo strato poggia su qualcosa
  for (const [x, y, z] of P) if (z > 0) assert.ok(P.some((q) => q[2] === z - 1 && Math.abs(q[0] - x) < 2 && Math.abs(q[1] - y) < 2), `${f.nome}: tessera sospesa`);
}
assert.ok(uguali('f1', 'f3') && uguali('s2', 's4') && !uguali('f1', 's1') && uguali('c3', 'c3') && !uguali('c3', 'b3'));
{
  const cp = coppie(144).flat();
  assert.strictEqual(cp.length, 144);
  const conta = {}; for (const f of cp) conta[f] = (conta[f] || 0) + 1;
  assert.ok(Object.entries(conta).every(([f, n]) => (/^[fs]\d$/.test(f) ? n === 1 : n === 4)), 'quattro copie (fiori e stagioni una)');
}
// ---- regola delle tessere libere ----
{
  const P = [[0, 0, 0], [2, 0, 0], [4, 0, 0], [2, 0, 1]];
  const V = vicini(P), c = [true, true, true, true];
  assert.ok(libera(V, c, 0) && libera(V, c, 2), 'i lati liberi');
  assert.ok(!libera(V, c, 1), 'quella in mezzo ha una tessera sopra (e i lati occupati)');
  assert.ok(libera(V, c, 3), 'quella sopra è libera');
  c[3] = false;
  assert.ok(!libera(V, c, 1), 'ancora bloccata: a destra e a sinistra c\'è qualcuno');
  c[0] = false;
  assert.ok(libera(V, c, 1));
}
// ---- schemi sempre risolvibili: si gioca la soluzione di costruzione ----
{
  const t0 = Date.now();
  let n = 0;
  for (const nome of Object.keys(FIGURE)) for (let k = 0; k < 100; k++) {
    const P = FIGURE[nome].posti, V = vicini(P);
    const r = riempi(V, P.map(() => true), coppie(P.length));
    assert.ok(r, 'schema creato');
    const c = r.facce.map(Boolean);
    for (const [a, b] of r.ordine) { assert.ok(libera(V, c, a) && libera(V, c, b) && uguali(r.facce[a], r.facce[b])); c[a] = c[b] = false; }
    assert.ok(c.every((x) => !x));
    n++;
  }
  console.log(`✓ Mahjong: figure, tessere libere, ${n} schemi tutti risolti con la loro soluzione (${Date.now() - t0} ms)`);
}
// ---- mosse, annulla, aiuto, rimescola ----
{
  const g = M.crea({ n: 1, opzioni: { figura: 'piramide' }, bot: [null] });
  const t = g.tavole[0];
  const bloccata = t.facce.findIndex((f, i) => !g.libere(t)[i]);
  const compagna = t.facce.findIndex((f, i) => i !== bloccata && uguali(f, t.facce[bloccata]));
  assert.ok(g.azione(0, { tipo: 'togli', a: bloccata, b: compagna }).errore, 'bloccata: non si toglie');
  const [a, b] = g.mosseLibere(t)[0];
  assert.ok(g.azione(0, { tipo: 'togli', a, b }).ok);
  assert.ok(!t.facce[a] && !t.facce[b]);
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.ok(t.facce[a] && t.facce[b], 'annullato');
  assert.ok(g.azione(0, { tipo: 'aiuto' }).ok);
  assert.ok(g.vista(0).suggerimento && t.penale === 15000);
  // si gioca a caso fino a restare senza mosse, poi si rimescola: si arriva sempre in fondo
  let giri = 0;
  while (!g.finita && giri++ < 2000) {
    const m = g.mosseLibere(t);
    if (!m.length) { if (g.azione(0, { tipo: 'mescola' }).errore) assert.ok(g.azione(0, { tipo: 'annulla' }).ok, 'se non si può rimescolare si annulla'); continue; }
    const [x, y] = m[Math.floor(Math.random() * m.length)];
    assert.ok(g.azione(0, { tipo: 'togli', a: x, b: y }).ok);
  }
  assert.ok(g.finita, 'finita anche giocando a caso, grazie al rimescolare');
}
// ---- rimescola: sempre risolvibile e con le stesse facce ----
{
  const P = FIGURE.tartaruga.posti, V = vicini(P);
  const r = riempi(V, P.map(() => true), coppie(144));
  const f = r.facce.slice();
  for (const [a, b] of r.ordine.slice(0, 30)) { f[a] = null; f[b] = null; }
  const m = rimescola(V, f);
  assert.ok(m);
  assert.deepStrictEqual(m.facce.filter(Boolean).sort(), f.filter(Boolean).sort());
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const mescolate = { facile: 0, medio: 0, difficile: 0 }, aiuti = { facile: 0, medio: 0, difficile: 0 };
  const N = 40;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { figura: k % 2 ? 'tartaruga' : 'piramide' }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 5000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    // in prova muovono tutti allo stesso ritmo: si finisce la partita di tutti e tre
    while (g.tavole.some((t) => t.facce.some(Boolean)) && giri++ < 10000) for (let p = 0; p < 3; p++) if (g.tavole[p].facce.some(Boolean)) { const r = g.mossa(p, g.tavole[p], g.mossaBot(p, liv[p])); assert.ok(r.ok, r.errore); }
    assert.ok(g.finita, 'la sfida finisce');
    liv.forEach((l, p) => { mescolate[l] += g.tavole[p].mescolate; });
  }
  console.log(`✓ Mahjong: ${N} sfide tra computer completate; rimescolate f/m/d ${mescolate.facile}/${mescolate.medio}/${mescolate.difficile} (${Date.now() - t0} ms)`);
  assert.strictEqual(mescolate.difficile, 0, 'il difficile segue la soluzione: non resta mai senza mosse');
  assert.ok(mescolate.facile > mescolate.medio);
}
