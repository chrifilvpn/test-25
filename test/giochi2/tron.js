// MOTO DI LUCE: movimento a quadretti, svolte in coda (niente marcia indietro), schianti contro bordo, scie e
// frontali, turbo, bordo che si stringe, punti, e tante partite complete tra computer (con i tempi di calcolo).
const assert = require('assert');
const M = require('../../giochi2/tron');
const { DX, DY, STRINGE_DOPO } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec, dt = 1 / 30) => { for (let k = 0; k < Math.round(sec / dt); k++) { g.tempoRound += dt; if (g.passo(dt)) return true; } return false; };

assert.strictEqual(M.meta.id, 'tron');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));

// ---- partenza, avanti da sola, svolte in coda, niente marcia indietro ----
{
  const g = M.crea({ n: 2, opzioni: { extra: 0 }, bot: [null, null] }); parti(g);
  assert.strictEqual(g.tot, 2);
  const b = g.m[0], x0 = b.x, y0 = b.y, d0 = b.dir;
  passa(g, 0.5);
  assert.ok(Math.abs(b.x - x0) + Math.abs(b.y - y0) >= 5, 'la moto va avanti da sola');
  g.input(0, { g: [1, (b.dir + 2) % 4] });
  assert.strictEqual(b.coda.length, 0, 'marcia indietro: ignorata');
  const su = (b.dir + 1) % 4, poi = b.dir;
  g.input(0, { g: [2, su] }); g.input(0, { g: [3, poi] });
  assert.deepStrictEqual(b.coda, [su, poi], 'due svolte veloci: in coda');
  g.input(0, { g: [3, su] });
  assert.strictEqual(b.coda.length, 2, 'un numero vecchio non vale');
  passa(g, 0.2);
  assert.strictEqual(b.dir, poi, 'fatte una dopo l\'altra');
  assert.ok(b.c.length >= 3, 'gli angoli della scia');
  // la scia resta nella griglia
  const k = b.c[1][1] * g.cols + b.c[1][0];
  assert.strictEqual(g.griglia[k], 1);
}
// ---- schianti: bordo, scia, frontale ----
{
  const g = M.crea({ n: 2, opzioni: { extra: 0, turbo: 'no' }, bot: [null, null] }); parti(g);
  const [a, b] = g.m;
  // a verso il bordo di sinistra
  a.x = 1; a.y = 10; a.dir = 2; a.segDir = 2; a.c = [[1, 10]]; a.coda = [];
  b.x = 40; b.y = 30; b.dir = 0; b.segDir = 0; b.c = [[40, 30]]; b.coda = [];
  const fine = passa(g, 0.4);
  assert.ok(!a.vivo && a.da === null, 'contro il bordo');
  assert.ok(fine && b.vivo, 'l\'ultimo rimasto vince il round');
  g.fineRound();
  assert.deepStrictEqual(g.punti, [0, 3], 'uno per chi è caduto prima + 2 all\'ultimo');
  // frontale nello stesso quadretto: cadono tutti e due
  const h = M.crea({ n: 2, opzioni: { extra: 0, turbo: 'no' }, bot: [null, null] }); parti(h);
  h.griglia.fill(0);
  Object.assign(h.m[0], { x: 20, y: 20, dir: 0, segDir: 0, c: [[20, 20]], coda: [] });
  Object.assign(h.m[1], { x: 22, y: 20, dir: 2, segDir: 2, c: [[22, 20]], coda: [] });
  passa(h, 0.2);
  assert.ok(!h.m[0].vivo && !h.m[1].vivo, 'frontale: tutti e due a terra');
  // contro una scia
  const s = M.crea({ n: 2, opzioni: { extra: 0, turbo: 'no' }, bot: [null, null] }); parti(s);
  s.griglia.fill(0);
  for (let y = 5; y < 30; y++) s.griglia[y * s.cols + 30] = 2; // la scia di b
  Object.assign(s.m[0], { x: 25, y: 15, dir: 0, segDir: 0, c: [[25, 15]], coda: [] });
  Object.assign(s.m[1], { x: 60, y: 40, dir: 1, segDir: 1, c: [[60, 40]], coda: [] });
  passa(s, 0.5);
  assert.ok(!s.m[0].vivo && s.m[0].da === 1, 'sulla scia di b');
}
// ---- turbo e bordo che si stringe ----
{
  const g = M.crea({ n: 1, opzioni: { extra: 1 }, bot: [null] }); parti(g);
  const b = g.m[0];
  Object.assign(b, { x: 10, y: 27, dir: 0, segDir: 0, c: [[10, 27]], coda: [] });
  g.griglia.fill(0);
  const x0 = b.x; passa(g, 0.5); const lento = b.x - x0;
  g.inp[0].tocchi++; const x1 = b.x; passa(g, 0.5); const veloce = b.x - x1;
  assert.ok(veloce > lento * 1.6, `col turbo va al doppio (${lento} → ${veloce})`);
  assert.strictEqual(b.carica, 0);
  g.tempoRound = STRINGE_DOPO; g.prossimoAnello = STRINGE_DOPO; g.passo(0.001);
  assert.strictEqual(g.anello, 1);
  assert.strictEqual(g.griglia[0], 255, 'il bordo è diventato muro');
}
// ---- partite complete tra computer: ognuno contro gli altri, tempi di calcolo ----
{
  const t0 = Date.now();
  const vinti = { facile: 0, medio: 0, difficile: 0 };
  let somma = 0, quanti = 0, round = 0;
  const N = 40;
  for (let k = 0; k < N; k++) {
    const liv = [['facile', 'medio'], ['medio', 'difficile'], ['facile', 'difficile'], ['facile', 'medio', 'difficile']][k % 4];
    const g = M.crea({ n: liv.length, opzioni: { round: 3, arena: ['media', 'piccola', 'grande'][k % 3], extra: 0 }, bot: liv });
    let ora = Date.now(), giri = 0;
    while (!g.finita && giri++ < 30000) {
      ora += 33;
      if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
      const t = process.hrtime.bigint();
      g.tick(ora);
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      if (g.fase === 'gioco') { somma += ms; quanti++; }
    }
    assert.ok(g.finita, 'la partita finisce');
    round += g.round;
    for (const v of g.risultato.vincitori) vinti[liv[v]]++;
  }
  console.log(`✓ Moto di luce: svolte, schianti, frontali, turbo, bordo che si stringe; ${N} partite (${round} round) tra computer: vittorie f/m/d ${vinti.facile}/${vinti.medio}/${vinti.difficile}, tick medio ${(somma / quanti).toFixed(3)} ms (${Date.now() - t0} ms)`);
  assert.ok(vinti.difficile > vinti.medio && vinti.medio > vinti.facile);
  assert.ok(somma / quanti < 1, 'un tick sotto 1 ms in media');
}
// ---- da soli con 3 moto del computer: la classifica le conta ----
{
  const g = M.crea({ n: 1, opzioni: { round: 3 }, bot: ['difficile'] });
  assert.strictEqual(g.tot, 4);
  let ora = Date.now();
  while (!g.finita) { ora += 33; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora); }
  assert.ok(/posto/.test(g.risultato.titolo));
  g.vistaTick(0); // il primo tick manda le scie intere, i successivi solo gli ultimi angoli
  const t = g.vistaTick(0);
  assert.ok(JSON.stringify(t).length < 1000, `tick piccolo (${JSON.stringify(t).length} caratteri)`);
}
