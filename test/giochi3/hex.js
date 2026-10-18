// HEX: vicini (sei), collegamento dei lati giusti per ognuno, scambio (regola della torta), annulla, niente pareggi,
// partite tra computer (il più forte vince di più).
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
// caso ripetibile (le partite tra computer danno sempre lo stesso esito)
{ let s = 11; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/hex');
const { catena, distanza, vicini } = M._test;

assert.deepStrictEqual(vicini(5, 12).sort((a, b) => a - b), [7, 8, 11, 13, 16, 17], 'sei vicini al centro');
assert.strictEqual(vicini(5, 0).length, 2, 'angolo acuto: due vicini');
// collegamenti: una colonna dritta collega sopra-sotto, non sinistra-destra
{
  const N = 5, c = new Array(25).fill(null);
  for (let r = 0; r < 5; r++) c[r * 5 + 2] = 0;
  assert.ok(catena(N, c, 0, 0) && !catena(N, c, 0, 1));
  // la diagonale "corta" (verso sinistra-giù) è collegata nel Hex
  const d = new Array(25).fill(null);
  for (let r = 0; r < 5; r++) d[r * 5 + (4 - r)] = 1;
  assert.ok(catena(N, d, 1, 0), 'la diagonale da destra-sopra a sinistra-sotto collega');
  const e = new Array(25).fill(null);
  for (let r = 0; r < 5; r++) e[r * 5 + r] = 1;
  assert.ok(!catena(N, e, 1, 0), 'la diagonale lunga non è collegata');
  assert.strictEqual(distanza(N, c, 0, 0), 0);
  assert.strictEqual(distanza(N, new Array(25).fill(null), 1, 1), 5);
}
// partita: mosse, scambio, vittoria
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { lato: 7 }, bot: [null, 'medio'] });
  assert.ok(g.azione(1, { tipo: 'metti', cella: 3 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'scambia' }).errore, 'il primo non può scambiare');
  g.azione(0, { tipo: 'metti', cella: 1 * 7 + 3 });
  assert.ok(g.puoScambiare(1));
  g.azione(1, { tipo: 'scambia' });
  assert.strictEqual(g.celle[3 * 7 + 1], 1, 'la pedina diventa blu, specchiata');
  assert.strictEqual(g.celle[1 * 7 + 3], null);
  assert.strictEqual(g.turno, 0);
  assert.ok(g.azione(0, { tipo: 'metti', cella: 3 * 7 + 1 }).errore, 'occupata');
  // il rosso collega la colonna 5
  for (let r = 0; r < 7; r++) { g.azione(0, { tipo: 'metti', cella: r * 7 + 5 }); if (!g.finita) g.azione(1, { tipo: 'metti', cella: g.celle.findIndex((x, i) => x === null && i % 7 === 0) }); }
  assert.ok(g.finita && g.risultato.vincitori[0] === 0 && g.vincente.length >= 7);
}
// annulla contro il computer
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { lato: 7, torta: 'no' }, bot: [null, 'medio'] });
  g.azione(0, { tipo: 'metti', cella: 24 });
  g.azione(1, M.bot(g, 1, 'medio'));
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.ok(g.celle.every((x) => x === null) && g.turno === 0);
}
// partite tra computer: finiscono sempre con un vincitore; il più forte vince di più
{
  const t0 = Date.now();
  const sfida = (a, b, k, lato) => {
    const liv = k % 2 ? [a, b] : [b, a];
    const g = M.crea({ n: 2, primo: k % 2, opzioni: { lato } , bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 400) { const p = g.turno; const r = g.azione(p, M.bot(g, p, liv[p])); assert.ok(r.ok, JSON.stringify(r)); }
    assert.ok(g.finita && g.risultato.vincitori.length === 1, 'c\'è sempre un vincitore');
    return liv[g.risultato.vincitori[0]] === a;
  };
  let mf = 0, dm = 0, partite = 0;
  for (let k = 0; k < 120; k++) { if (sfida('medio', 'facile', k, [7, 9, 11][k % 3])) mf++; partite++; }
  for (let k = 0; k < 24; k++) { if (sfida('difficile', 'medio', k, [7, 9][k % 2])) dm++; partite++; }
  assert.ok(mf > 70, `medio contro facile ${mf}/120`);
  assert.ok(dm > 16, `difficile contro medio ${dm}/24`);
  console.log(`✓ Hex: sei vicini, collegamenti dei lati giusti, scambio della torta, annulla; ${partite} partite tra computer sempre con un vincitore: medio-facile ${mf}/120, difficile-medio ${dm}/24 (${Date.now() - t0} ms)`);
}
