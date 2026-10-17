// Muri e pedine: passi, salti (dritto e di lato), muri che non si incrociano e non chiudono la strada, partite in 2 e in 4
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/quoridor');
const { destinazioni, muroValido, distanza, mw, PARTENZA } = M._test;
const L = 9;
const vuoti = () => new Uint8Array(128);
const ord = (a) => [...a].sort((x, y) => x - y);

// ---- passi e salti ----
{
  const muri = vuoti();
  assert.deepStrictEqual(ord(destinazioni(muri, [8 * L + 4, 0 * L + 4], 0)), ord([7 * L + 4, 8 * L + 3, 8 * L + 5]), 'dalla partenza: avanti e di lato');
  // pedina avversaria davanti: salto dritto
  const pos = [4 * L + 4, 3 * L + 4];
  assert.ok(destinazioni(muri, pos, 0).includes(2 * L + 4), 'salto dritto');
  assert.ok(!destinazioni(muri, pos, 0).includes(3 * L + 4), 'non sulla pedina');
  // muro dietro la pedina avversaria: salto in diagonale
  muri[mw(0, 2, 4)] = 1; // muro orizzontale tra la riga 2 e la 3 sopra la colonna 4-5
  const d = destinazioni(muri, pos, 0);
  assert.ok(!d.includes(2 * L + 4) && d.includes(3 * L + 3) && d.includes(3 * L + 5), 'salto di lato');
}
// ---- muri ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {}, bot: [null, null] });
  assert.ok(g.azione(0, { tipo: 'muro', o: 'h', r: 3, c: 3 }).ok);
  assert.strictEqual(g.rimasti[0], 9);
  assert.ok(g.azione(1, { tipo: 'muro', o: 'h', r: 3, c: 3 }).errore, 'sovrapposto');
  assert.ok(g.azione(1, { tipo: 'muro', o: 'h', r: 3, c: 4 }).errore, 'si sovrappone a metà');
  assert.ok(g.azione(1, { tipo: 'muro', o: 'v', r: 3, c: 3 }).errore, 'incrocio');
  assert.ok(g.azione(1, { tipo: 'muro', o: 'h', r: 9, c: 3 }).errore, 'fuori dalla tavola');
  assert.ok(g.azione(1, { tipo: 'muro', o: 'h', r: 3, c: 5 }).ok, 'accanto va bene');
  assert.ok(g.azione(1, { tipo: 'muovi', cella: 0 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'muovi', cella: 0 }).errore, 'casella lontana');
  assert.ok(g.azione(0, { tipo: 'muovi', cella: 7 * L + 4 }).ok);
}
// ---- un muro non può chiudere la strada ----
{
  const muri = vuoti();
  // la riga 7/8 sbarrata quasi tutta: restano libere solo le colonne 8
  for (const c of [0, 2, 4, 6]) muri[mw(0, 7, c)] = 1;
  const pos = [8 * L + 4, 0 * L + 4];
  assert.strictEqual(distanza(muri, 0, pos[0]) < 99, true);
  // un muro verticale che chiude il passaggio sulla colonna 8 a destra
  const w = mw(0, 7, 7);
  assert.ok(!muroValido(muri, w, pos, [0, 2]), 'chiuderebbe del tutto la strada');
}
// ---- arrivo ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {}, bot: [null, null] });
  g.pos = [1 * L + 4, 7 * L + 0];
  assert.ok(g.azione(0, { tipo: 'muovi', cella: 4 }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 0);
}
assert.deepStrictEqual(PARTENZA.length, 4);
console.log('✓ Muri e pedine: passi, salto dritto e di lato, muri che non si sovrappongono né si incrociano, mai strada chiusa, arrivo');

// ---- partite tra computer ----
{
  const t0 = Date.now();
  const sfide = { 'difficile-medio': [0, 0], 'medio-facile': [0, 0] };
  const N = process.env.TEST_VELOCE ? 80 : 200;
  for (let k = 0; k < N; k++) {
    const coppia = k % 2 ? ['difficile', 'medio'] : ['medio', 'facile'];
    const liv = k % 4 < 2 ? coppia : [coppia[1], coppia[0]];
    const g = M.crea({ n: 2, primo: k % 2, opzioni: {}, bot: liv });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 400, 'la partita finisce');
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      assert.ok(r.ok, `mossa rifiutata (${liv[t]}): ${r.errore}`);
    }
    const v = g.risultato.vincitori[0];
    if (v == null) continue;
    const ch = `${liv[0]}-${liv[1]}`, rv = `${liv[1]}-${liv[0]}`;
    if (sfide[ch]) sfide[ch][v === 0 ? 0 : 1]++; else sfide[rv][v === 1 ? 0 : 1]++;
  }
  let quattro = 0;
  const vinte4 = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < (process.env.TEST_VELOCE ? 30 : 60); k++) {
    const liv = ['facile', 'medio', 'difficile', ['facile', 'medio', 'difficile'][k % 3]];
    const g = M.crea({ n: 4, primo: k % 4, opzioni: {}, bot: liv });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 800, 'la partita in 4 finisce');
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      assert.ok(r.ok, `mossa rifiutata in 4 (${liv[t]}): ${r.errore}`);
    }
    for (const v of g.risultato.vincitori) vinte4[liv[v]]++;
    quattro++;
  }
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  console.log(`✓ Muri e pedine: ${N} partite in 2 (difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2}) e ${quattro} in 4 (vinte ${JSON.stringify(vinte4)}) in ${Date.now() - t0} ms`);
  assert.ok(dv > mv, 'il difficile batte il medio');
  assert.ok(m2 > f2, 'il medio batte il facile');
}
