// PICROSS A COLORI: indizi con i colori, risolutore di una fila (confronto con tutte le file possibili), ogni disegno
// si risolve con la logica (con le caselle scoperte), mosse, aiuto e sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/picross');
const PL = require('../../giochi2/picross-logica');
const { prepara, DISEGNI, CROCE } = M._test;

// ---- indizi ----
assert.deepStrictEqual(PL.indiziFila([1, 1, 2, 0, 2, 2, 1]), [[2, 1], [1, 2], [2, 2], [1, 1]]);
assert.deepStrictEqual(PL.indiziFila([0, 0, 0]), []);
// ---- una fila: il risolutore trova esattamente i valori possibili (confronto con tutte le file di 3 colori) ----
{
  const n = 6, q = 3; // valori 0..2
  const tutte = [];
  for (let m = 0; m < q ** n; m++) { const f = []; let x = m; for (let i = 0; i < n; i++) { f.push(x % q); x = Math.floor(x / q); } tutte.push(f); }
  for (let k = 0; k < 400; k++) {
    const vera = tutte[Math.floor(Math.random() * tutte.length)], ind = PL.indiziFila(vera);
    // possibilità iniziali: tutto, con qualche casella già nota
    const poss = vera.map((v) => (Math.random() < 0.3 ? 1 << v : (1 << q) - 1));
    const attese = new Array(n).fill(0);
    for (const f of tutte) if (f.every((v, i) => poss[i] & (1 << v)) && JSON.stringify(PL.indiziFila(f)) === JSON.stringify(ind)) f.forEach((v, i) => { attese[i] |= 1 << v; });
    assert.deepStrictEqual(Array.from(PL.risolviFila(poss, ind)), attese, `fila ${vera.join('')}`);
  }
}
// ---- disegni: righe uguali, colori usati, risolvibili con la logica (con le caselle scoperte) ----
{
  for (const [k, d] of DISEGNI.entries()) {
    const L = d.righe[0].length;
    assert.ok(d.righe.every((r) => r.length === L) && d.righe.length === L, `${d.nome}: quadrato`);
    assert.strictEqual(L, d.grandezza === 'piccola' ? 10 : 15, d.nome);
    const lettere = new Set(d.righe.join('').replace(/\./g, ''));
    assert.deepStrictEqual([...lettere].sort(), Object.keys(d.colori).sort(), `${d.nome}: colori usati tutti e solo quelli`);
    for (const sp of [false, true]) {
      const p = prepara(k, sp);
      const note = new Map(p.scoperte.map((i) => [i, p.img[i]]));
      const r = PL.risolviLogica(p.W, p.H, p.indizi, p.colori.length, note);
      assert.ok(r.risolto, `${d.nome}: si risolve con la logica`);
      assert.ok([...r.poss].every((v, i) => v === 1 << p.img[i]), `${d.nome}: la soluzione è il disegno`);
      assert.ok(p.scoperte.length <= 6, `${d.nome}: poche caselle scoperte (${p.scoperte.length})`);
    }
  }
  assert.ok(DISEGNI.filter((d) => d.grandezza === 'piccola').length >= 15 && DISEGNI.filter((d) => d.grandezza === 'grande').length >= 8);
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { disegno: 1, errori: 'subito' }, bot: [null] });
  const t = g.tavole[0], img = g.d.img;
  assert.strictEqual(g.vista(0).nomeDisegno, null, 'il nome del disegno si vede solo alla fine');
  assert.ok(g.azione(0, { tipo: 'segna', i: 0, v: 7 }).errore, 'colore non valido');
  const vuota = img.findIndex((v) => !v);
  g.azione(0, { tipo: 'segna', i: vuota, v: 1 });
  assert.ok(g.vista(0).sbagliate.includes(vuota));
  g.azione(0, { tipo: 'segna', i: vuota, v: CROCE });
  assert.ok(!g.vista(0).sbagliate.includes(vuota), 'la croce sul vuoto va bene');
  g.azione(0, { tipo: 'aiuto' });
  assert.strictEqual(t.penale, 20000);
  for (let c = 1; c <= g.d.colori.length; c++) g.azione(0, { tipo: 'segna', celle: img.map((v, i) => (v === c ? i : -1)).filter((i) => i >= 0), v: c });
  assert.ok(g.finita && /Cuore/.test(g.risultato.titolo), 'disegno completato');
  assert.strictEqual(g.vista(0).nomeDisegno, 'Cuore');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 120;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'].map((_, i, a) => a[(i + k) % 3]);
    const g = M.crea({ n: 3, opzioni: { disegni: ['piccola', 'grande', 'tutti'][k % 3] }, bot: liv });
    assert.ok(g.tavole.every((t) => t.celle.join() === g.tavole[0].celle.join()), 'stesso disegno per tutti');
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(primi.difficile > primi.facile, JSON.stringify(primi));
  console.log(`✓ Picross a colori: indizi colorati, risolutore delle file controllato con tutte le file possibili, ${DISEGNI.length} disegni risolvibili con la logica (anche specchiati), mosse, aiuto; ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile} (${Date.now() - t0} ms)`);
}
