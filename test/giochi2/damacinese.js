// Dama cinese: la stella da 121 buche, passi e salti a catena, vittoria, partite tra computer in 2, 3, 4 e 6
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/damacinese');
const { CELLE, PUNTE, VICINI, arrivi, INDICE } = M._test;
const I = (q, r) => INDICE.get(`${q},${r},${-q - r}`);

assert.strictEqual(CELLE.length, 121, '121 buche');
assert.ok(PUNTE.every((p) => p.length === 10), 'sei punte da 10');
assert.strictEqual(new Set(PUNTE.flat()).size, 60);
assert.ok(VICINI[I(0, 0)].every((v) => v >= 0), 'al centro sei vicini');
// passi e salti a catena
{
  const occ = new Int8Array(121).fill(-1);
  occ[I(0, 0)] = 0;
  assert.strictEqual(arrivi(occ, I(0, 0)).size, 6, 'sei passi');
  occ[I(1, -1)] = 1;       // biglia da saltare
  occ[I(3, -3)] = 1;       // un'altra più avanti: salto a catena
  const a = arrivi(occ, I(0, 0));
  assert.ok(a.has(I(2, -2)), 'salto');
  assert.ok(a.has(I(4, -4)), 'salto a catena');
  assert.deepStrictEqual(a.get(I(4, -4)), [I(0, 0), I(2, -2), I(4, -4)]);
  assert.ok(!a.has(I(1, -1)), 'non sulla biglia');
  assert.ok(!a.has(I(3, -3)));
}
// partita: mosse non valide e vittoria
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  assert.ok(g.azione(1, { tipo: 'muovi', da: 0, a: 1 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'muovi', da: PUNTE[3][0], a: 0 }).errore, 'biglia non sua');
  const mia = PUNTE[0].find((i) => arrivi(g.occ, i).size);
  const dove = [...arrivi(g.occ, mia).keys()][0];
  assert.ok(g.azione(0, { tipo: 'muovi', da: mia, a: 999 }).errore);
  assert.ok(g.azione(0, { tipo: 'muovi', da: mia, a: dove }).ok);
  // vittoria: punta 3 piena (con una biglia avversaria che non se ne va)
  g.occ.fill(-1);
  PUNTE[3].forEach((i, k) => { g.occ[i] = k === 0 ? 1 : 0; });
  g.occ[I(0, 0)] = 0;
  g.turno = 0;
  // una buca della punta sul bordo verso il centro: la si libera e ci si arriva da fuori
  const ultima = PUNTE[3].find((i, k) => k > 0 && VICINI[i].some((v) => v >= 0 && !PUNTE[3].includes(v) && v !== I(0, 0)));
  g.occ[ultima] = -1;
  const vicino = VICINI[ultima].find((v) => v >= 0 && g.occ[v] === -1 && !PUNTE[3].includes(v));
  g.occ[vicino] = 0;
  assert.ok(g.azione(0, { tipo: 'muovi', da: vicino, a: ultima }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'punta piena (con una biglia avversaria) = vittoria');
}
console.log('✓ Dama cinese: stella da 121 buche, sei punte, passi, salti a catena, vittoria anche con biglie avversarie nella punta');

// ---- partite tra computer ----
{
  const t0 = Date.now();
  const sfide = { 'difficile-medio': [0, 0], 'medio-facile': [0, 0] };
  const N = process.env.TEST_VELOCE ? 60 : 120;
  for (let k = 0; k < N; k++) {
    const coppia = k % 2 ? ['difficile', 'medio'] : ['medio', 'facile'];
    const liv = k % 4 < 2 ? coppia : [coppia[1], coppia[0]];
    const g = M.crea({ n: 2, primo: k % 2, opzioni: {} });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 1000, 'la partita finisce');
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      assert.ok(r.ok, `mossa rifiutata: ${r.errore}`);
      assert.strictEqual(g.occ.filter((x) => x >= 0).length, 20, 'sempre 20 biglie');
    }
    const v = g.risultato.vincitori[0];
    const ch = `${liv[0]}-${liv[1]}`, rv = `${liv[1]}-${liv[0]}`;
    if (sfide[ch]) sfide[ch][v === 0 ? 0 : 1]++; else sfide[rv][v === 1 ? 0 : 1]++;
  }
  const altre = {};
  for (const n of [3, 4, 6]) {
    for (let k = 0; k < 12; k++) {
      const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
      const g = M.crea({ n, primo: k % n, opzioni: {} });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 3000, 'la partita finisce');
        const t = g.turno;
        const r = g.azione(t, M.bot(g, t, liv[t]));
        assert.ok(r.ok, `mossa rifiutata in ${n}: ${r.errore}`);
      }
      const l = liv[g.risultato.vincitori[0]];
      altre[l] = (altre[l] || 0) + 1;
    }
  }
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  console.log(`✓ Dama cinese: ${N} partite in 2 (difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2}) e 36 in 3, 4 e 6 (vinte ${JSON.stringify(altre)}) in ${Date.now() - t0} ms`);
  assert.ok(dv > mv && m2 > f2, 'difficile > medio > facile');
}
