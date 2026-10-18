// DADI BUGIARDI: regole delle puntate (anche con gli 1), conteggio con i jolly, dubito e calza, eliminazione, e
// tante partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
{ let s = 5; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/bugiardi');
const { piuAlta, conta, almeno, esatto } = M._test;

// ---- puntate ----
assert.ok(piuAlta(2, 3, null, null) && !piuAlta(2, 1, null, null), 'si apre da 2 a 6');
assert.ok(piuAlta(4, 5, 4, 3) && !piuAlta(4, 3, 4, 5) && piuAlta(5, 2, 4, 6), 'più dadi o faccia più alta');
assert.ok(piuAlta(3, 1, 6, 4) && !piuAlta(2, 1, 6, 4), 'verso gli 1: la metà arrotondata in su');
assert.ok(piuAlta(7, 2, 3, 1) && !piuAlta(6, 6, 3, 1), 'dagli 1: più del doppio');
assert.ok(piuAlta(4, 1, 3, 1) && !piuAlta(3, 1, 3, 1));
// ---- conteggio con i jolly ----
assert.strictEqual(conta([1, 1, 3, 5, 5], 5), 4);
assert.strictEqual(conta([1, 1, 3, 5, 5], 1), 2, 'sugli 1 contano solo gli 1');
// ---- probabilità ----
assert.ok(Math.abs(almeno(3, 1, 0.5) - 0.875) < 1e-9 && Math.abs(esatto(3, 2, 0.5) - 0.375) < 1e-9);
// ---- dubito e calza ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  g.dadi = [[1, 2, 3, 4, 5], [5, 5, 6, 6, 2], [1, 3, 3, 4, 6]];
  assert.ok(g.azione(1, { tipo: 'punta', q: 3, f: 5 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'dubito' }).errore, 'niente da dubitare');
  assert.ok(g.azione(0, { tipo: 'punta', q: 3, f: 5 }).ok);
  assert.ok(g.azione(1, { tipo: 'punta', q: 3, f: 4 }).errore, 'bisogna alzare');
  assert.ok(g.azione(1, { tipo: 'punta', q: 3, f: 6 }).ok);
  // i 6 sono 6,6 (di 1) + 6 (di 2) + 1,1 jolly = 5: almeno 3 → chi dubita perde
  assert.ok(g.azione(2, { tipo: 'dubito' }).ok);
  assert.strictEqual(g.rivela.conta, 5); assert.strictEqual(g.nDadi[2], 4);
  g.avanza();
  assert.strictEqual(g.turno, 2, 'chi perde apre il giro dopo');
  assert.strictEqual(g.dadi[2].length, 4);
  g.dadi = [[2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4]];
  g.azione(2, { tipo: 'punta', q: 5, f: 3 });
  assert.ok(g.azione(0, { tipo: 'calza' }).ok);
  assert.strictEqual(g.nDadi[0], 5, 'calza giusta: già al massimo');
  g.avanza();
  g.dadi = [[2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4]];
  g.azione(0, { tipo: 'punta', q: 6, f: 2 });
  assert.ok(g.azione(1, { tipo: 'dubito' }).ok);
  assert.strictEqual(g.nDadi[0], 4, 'bluff scoperto: perde chi ha puntato');
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 };
  const N = 400;
  for (let k = 0; k < N; k++) {
    const n = 2 + (k % 5);
    const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
    const g = M.crea({ n, primo: k % n, opzioni: { dadi: k % 4 === 0 ? 3 : 5, calza: k % 2 ? 'si' : 'no' } });
    let giri = 0;
    while (!g.finita && giri++ < 5000) {
      if (g.inAttesa) { g.avanza(); continue; }
      const p = g.turno;
      const r = g.azione(p, M.bot(g, p, liv[p]));
      assert.ok(r.ok, `mossa del computer ${JSON.stringify(r)}`);
    }
    assert.ok(g.finita, 'la partita finisce');
    assert.strictEqual(g.vivi().length, 1);
    vinte[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(vinte.difficile > vinte.medio && vinte.medio > vinte.facile, JSON.stringify(vinte));
  console.log(`✓ Dadi bugiardi: puntate (anche con gli 1 jolly), conteggio, dubito, calza, eliminazione; ${N} partite tra computer da 2 a 6: vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
}
