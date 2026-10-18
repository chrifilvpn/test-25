// SOLITARIO PIRAMIDE: carte libere, coppie da 13, re da solo, tallone e giri, risolutore (le soluzioni si giocano
// davvero con le regole della partita), aiuto, annulla e sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi3/piramide');
const { risolvi, distribuzione, libera, SOPRA } = M._test;

// ---- struttura: ogni carta (tranne l'ultima fila) ha due carte sopra ----
assert.deepStrictEqual(SOPRA[0], [1, 2]);
assert.deepStrictEqual(SOPRA[5], [8, 9]);
assert.deepStrictEqual(SOPRA[21], []);
assert.ok(libera(0, 27) && !libera(0, 20), 'all\'inizio è libera solo l\'ultima fila');
// ---- distribuzioni vincibili: la soluzione si gioca con le regole della partita ----
{
  const t0 = Date.now();
  for (const giri of ['uno', 'tre', 'cinque']) for (let k = 0; k < 8; k++) {
    const g = M.crea({ n: 1, opzioni: { giri }, bot: [null] });
    for (const m of g.soluzione) { const r = g.azione(0, m); assert.ok(r.ok, `mossa della soluzione: ${JSON.stringify(m)} ${JSON.stringify(r)}`); }
    assert.ok(g.finita && g.tavole[0].fatto != null, `${giri}: piramide svuotata`);
  }
  assert.ok(Date.now() - t0 < 20000, 'distribuzioni pronte in fretta');
}
// ---- regole ----
{
  const g = M.crea({ n: 1, opzioni: { giri: 'tre' }, bot: [null] });
  const t = g.tavole[0];
  assert.ok(g.azione(0, { tipo: 'togli', a: { p: 0 } }).errore, 'la cima è coperta');
  const non13 = [21, 22, 23, 24, 25, 26, 27].find((k) => g.pir[k].rango !== 13);
  assert.ok(g.azione(0, { tipo: 'togli', a: { p: non13 } }).errore, 'da sola solo il re');
  // due carte libere che non fanno 13
  const lib = [21, 22, 23, 24, 25, 26, 27];
  const coppiaNo = lib.flatMap((a) => lib.map((b) => [a, b])).find(([a, b]) => a < b && g.pir[a].rango + g.pir[b].rango !== 13);
  assert.ok(g.azione(0, { tipo: 'coppia', a: { p: coppiaNo[0] }, b: { p: coppiaNo[1] } }).errore, 'non fanno 13');
  assert.ok(g.azione(0, { tipo: 'coppia', a: { p: 21 }, b: { p: 21 } }).errore, 'due carte diverse');
  // pescare tutto il tallone, poi i giri
  for (let k = 0; k < 24; k++) assert.ok(g.azione(0, { tipo: 'pesca' }).ok);
  assert.strictEqual(g.vista(0).tallone, 0);
  assert.ok(g.vista(0).puoRigirare);
  g.azione(0, { tipo: 'pesca' }); assert.strictEqual(t.giro, 2);
  for (let k = 0; k < 24; k++) g.azione(0, { tipo: 'pesca' });
  g.azione(0, { tipo: 'pesca' }); assert.strictEqual(t.giro, 3);
  for (let k = 0; k < 24; k++) g.azione(0, { tipo: 'pesca' });
  assert.ok(g.azione(0, { tipo: 'pesca' }).errore, 'finiti i giri');
  // annulla torna indietro
  g.azione(0, { tipo: 'annulla' });
  assert.strictEqual(t.sp, 23);
  // l'aiuto da qui: o una mossa giusta o "non si vince più"
  const r = g.azione(0, { tipo: 'aiuto' });
  assert.ok(r.ok ? t.suggerimento && t.penale === 15000 : /annulla/.test(r.errore));
}
// ---- il risolutore da metà partita: dopo metà soluzione ritrova la strada ----
{
  const d = distribuzione(3);
  const g = M.crea({ n: 1, opzioni: { giri: 'tre' }, bot: [null] });
  Object.assign(g, { pir: d.pir, tal: d.tal, soluzione: d.soluzione });
  for (const m of d.soluzione.slice(0, Math.floor(d.soluzione.length / 2))) g.azione(0, m);
  const r = risolvi(g.pir, g.tal, 3, g.tavole[0], 100000);
  assert.ok(r.mosse, 'da metà strada si vince ancora');
  for (const m of r.mosse) assert.ok(g.azione(0, m).ok);
  assert.ok(g.finita);
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 90;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'].map((_, i, a) => a[(i + k) % 3]);
    const g = M.crea({ n: 3, opzioni: { giri: ['tre', 'cinque', 'uno'][k % 3] }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(primi.difficile > primi.facile, JSON.stringify(primi));
  console.log(`✓ Solitario Piramide: carte libere, coppie da 13, re, giri del tallone, annulla, aiuto; distribuzioni sempre vincibili (soluzioni giocate fino in fondo); ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile} (${Date.now() - t0} ms)`);
}
