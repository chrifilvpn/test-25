// FORZA 4 IN 3D: le 76 linee, gravità nei pioli, vittoria in tutte le direzioni, pareggio a cubo pieno, annulla e
// partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
// caso ripetibile (le partite tra computer danno sempre lo stesso esito)
{ let s = 11; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/forza3d');
const { LINEE, LINEE_DI } = M._test;

assert.strictEqual(LINEE.length, 76, '76 linee nel cubo 4×4×4');
// angoli e centri del cubo stanno su 7 linee, le altre caselle su 4
const sette = LINEE_DI.filter((l) => l.length === 7).length, quattro = LINEE_DI.filter((l) => l.length === 4).length;
assert.strictEqual(sette, 16); assert.strictEqual(quattro, 48);
// gravità e piolo pieno
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, null] });
  for (let k = 0; k < 4; k++) g.azione(g.turno, { tipo: 'metti', piolo: 5 });
  assert.deepStrictEqual([5, 21, 37, 53].map((i) => g.celle[i]), [0, 1, 0, 1], 'le palline scendono');
  assert.ok(g.azione(g.turno, { tipo: 'metti', piolo: 5 }).errore, 'piolo pieno');
}
// vittorie: in verticale su un piolo, e sulla grande diagonale del cubo
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, null] });
  for (const [a, b] of [[0, 1], [0, 1], [0, 1]]) { g.azione(0, { tipo: 'metti', piolo: a }); g.azione(1, { tipo: 'metti', piolo: b }); }
  g.azione(0, { tipo: 'metti', piolo: 0 });
  assert.ok(g.finita && g.risultato.vincitori[0] === 0 && g.fila.length === 4, 'quattro sullo stesso piolo');
  // grande diagonale: (0,0,0) (1,1,1) (2,2,2) (3,3,3) → pioli 0, 5, 10, 15 alle altezze 0..3
  const h = M.crea({ n: 2, primo: 0, bot: [null, null] });
  const mosse = [[0, 0], [5, 1], [5, 0], [10, 1], [10, 1], [10, 0], [15, 1], [15, 1], [15, 1], [15, 0]];
  // riempitivi per far tornare i turni: il giocatore 1 mette dove serve, il giocatore 0 le sue
  const seq = [];
  for (const [piolo, chi] of mosse) seq.push({ piolo, chi });
  let i0 = 0;
  for (const m of seq) { while (h.turno !== m.chi && !h.finita) { h.azione(h.turno, { tipo: 'metti', piolo: [3, 12, 6, 9][i0++ % 4] }); } if (!h.finita) h.azione(m.chi, { tipo: 'metti', piolo: m.piolo }); }
  assert.ok(h.finita && h.risultato.vincitori[0] === 0, 'diagonale lunga del cubo');
}
// annulla contro il computer
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, 'medio'] });
  g.azione(0, { tipo: 'metti', piolo: 6 });
  g.azione(1, M.bot(g, 1, 'medio'));
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok && g.nMosse === 0 && g.altezze.every((x) => !x));
}
// partite tra computer
{
  const t0 = Date.now();
  const sfida = (a, b, k) => {
    const liv = k % 2 ? [a, b] : [b, a];
    const g = M.crea({ n: 2, primo: k % 2, bot: liv });
    while (!g.finita) { const p = g.turno; assert.ok(g.azione(p, M.bot(g, p, liv[p])).ok); }
    return g.risultato.pareggio ? 0.5 : liv[g.risultato.vincitori[0]] === a ? 1 : 0;
  };
  let mf = 0, dm = 0;
  for (let k = 0; k < 100; k++) mf += sfida('medio', 'facile', k);
  for (let k = 0; k < 24; k++) dm += sfida('difficile', 'medio', k);
  assert.ok(mf > 80 && dm > 13, `medio-facile ${mf}, difficile-medio ${dm}`);
  console.log(`✓ Forza 4 in 3D: 76 linee (angoli e centri su 7), palline che scendono, piolo pieno, vittoria sul piolo e sulla diagonale del cubo, annulla; partite tra computer: medio-facile ${mf}/100, difficile-medio ${dm}/24 (${Date.now() - t0} ms)`);
}
