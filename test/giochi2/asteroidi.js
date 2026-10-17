// ASTEROIDI: campo che si avvolge, spinta e attrito, colpi, massi che si spezzano (grande → medi → piccoli), punti,
// vite e protezione, ondate, disco volante, modo tutti contro tutti, e partite complete tra computer.
const assert = require('assert');
const M = require('../../giochi2/asteroidi');
const { W, H, RAGGI, PUNTI } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec, dt = 1 / 30) => { for (let k = 0; k < Math.round(sec / dt); k++) { g.tempoRound += dt; if (g.passo(dt)) return true; } return false; };
const nuovo = (n, opzioni = {}) => { const g = M.crea({ n, opzioni, bot: new Array(n).fill(null) }); parti(g); g.prossimoUfo = 1e9; return g; };

assert.strictEqual(M.meta.id, 'asteroidi');
// ---- movimento e campo che si avvolge ----
{
  const g = nuovo(1); g.massi = [{ id: 99, x: 100, y: 100, t: 0, vx: 0, vy: 0, rot: 0, ang: 0 }];
  const n = g.navi[0]; n.protetto = 0;
  Object.assign(n, { x: W - 30, y: H / 2, a: 0 });
  g.input(0, { x: 1, y: 0 });
  passa(g, 0.6);
  assert.ok(n.x < 200, `uscita a destra, rientrata a sinistra (x = ${n.x.toFixed(0)})`);
  g.input(0, { x: 0, y: 0 });
  const v0 = Math.hypot(n.vx, n.vy); passa(g, 1); const v1 = Math.hypot(n.vx, n.vy);
  assert.ok(v1 < v0 && v1 > v0 * 0.4, 'senza spinta scivola e rallenta piano');
}
// ---- colpi e massi che si spezzano ----
{
  const g = nuovo(1);
  const n = g.navi[0]; Object.assign(n, { x: 300, y: 380, vx: 0, vy: 0, a: 0, protetto: 0 });
  g.massi = [{ id: 99, x: 520, y: 380, t: 0, vx: 0, vy: 0, rot: 0, ang: 0 }];
  g.inp[0].tocchi++; passa(g, 0.6);
  assert.strictEqual(g.punti[0], PUNTI[0]);
  assert.strictEqual(g.massi.length, 2, 'il grande si spezza in due medi');
  assert.ok(g.massi.every((m) => m.t === 1));
  for (const m of g.massi) { m.t = 2; g.rompi(m, 0); }
  g.massi = g.massi.filter((m) => !m.via);
  assert.strictEqual(g.massi.length, 0, 'i piccoli spariscono');
  passa(g, 0.05);
  assert.ok(g.ondata === 2 && g.massi.length >= 4, 'ondata nuova, più fitta');
}
// ---- vite, protezione, rinascita, fine ----
{
  const g = nuovo(1);
  const n = g.navi[0];
  g.massi = [{ id: 99, x: n.x, y: n.y, t: 0, vx: 0, vy: 0, rot: 0, ang: 0 }];
  passa(g, 0.1);
  assert.ok(n.vivo, 'appena partita è protetta');
  n.protetto = 0; passa(g, 0.05);
  assert.ok(!n.vivo && n.vite === 2, 'masso addosso: una vita in meno');
  g.massi = [{ id: 98, x: 50, y: 50, t: 2, vx: 0, vy: 0, rot: 0, ang: 0 }];
  passa(g, 2);
  assert.ok(n.vivo && n.protetto > 0 && Math.abs(n.x - W / 2) < 40, 'riappare al centro, protetta');
  n.vite = 1; n.protetto = 0; g.massi = [{ id: 97, x: n.x, y: n.y, t: 0, vx: 0, vy: 0, rot: 0, ang: 0 }];
  assert.ok(passa(g, 0.1), 'finite le vite di tutti: partita finita');
  assert.ok(n.fuori);
}
// ---- tutti contro tutti ----
for (const modo of ['massi', 'contro']) {
  const g = nuovo(2, { modo });
  const [a, b] = g.navi;
  g.massi = [{ id: 99, x: 50, y: 50, t: 2, vx: 0, vy: 0, rot: 0, ang: 0 }];
  Object.assign(a, { x: 300, y: 380, vx: 0, vy: 0, a: 0, protetto: 0 }); Object.assign(b, { x: 450, y: 380, vx: 0, vy: 0, protetto: 0 });
  g.inp[0].tocchi++; passa(g, 0.4);
  if (modo === 'contro') assert.ok(!b.vivo && g.punti[0] === 150, 'colpita l\'altra navicella');
  else assert.ok(b.vivo && g.punti[0] === 0, 'i colpi passano attraverso le altre navicelle');
}
// ---- disco volante ----
{
  const g = nuovo(1); g.prossimoUfo = 0; passa(g, 0.05);
  assert.ok(g.ufo, 'arriva il disco');
  const n = g.navi[0]; Object.assign(n, { x: g.ufo.x < W / 2 ? g.ufo.x + 150 : g.ufo.x - 150, y: g.ufo.y, a: g.ufo.x < W / 2 ? Math.PI : 0, protetto: 1, vx: 0, vy: 0 });
  g.massi = [{ id: 99, x: n.x, y: (n.y + H / 2) % H, t: 2, vx: 0, vy: 0, rot: 0, ang: 0 }];
  g.ufo.vy = 0; g.ufo.cambia = 9; g.ufo.vx = 0;
  g.inp[0].tocchi++; passa(g, 0.4);
  assert.ok(g.punti[0] === 200 && !g.ufo, 'disco abbattuto: 200 punti');
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const punti = { facile: 0, medio: 0, difficile: 0 };
  let somma = 0, quanti = 0;
  const N = 12;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { tempo: 2, modo: k % 2 ? 'contro' : 'massi' }, bot: liv });
    let ora = Date.now();
    while (!g.finita) {
      ora += 33; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
      const t = process.hrtime.bigint(); g.tick(ora);
      if (g.fase === 'gioco') { somma += Number(process.hrtime.bigint() - t) / 1e6; quanti++; }
      for (const n of g.navi) assert.ok(n.x >= 0 && n.x < W && n.y >= 0 && n.y < H);
    }
    liv.forEach((l, i) => { punti[l] += g.punti[i]; });
    assert.ok(JSON.stringify(g.vistaTick(0)).length < 1500, 'tick piccolo');
  }
  console.log(`✓ Asteroidi: campo avvolto, spinta e attrito, massi che si spezzano, vite, ondate, disco volante, tutti contro tutti; ${N} partite tra computer: punti f/m/d ${punti.facile}/${punti.medio}/${punti.difficile}, tick medio ${(somma / quanti).toFixed(3)} ms (${Date.now() - t0} ms)`);
  assert.ok(punti.difficile > punti.medio && punti.medio > punti.facile);
  assert.ok(somma / quanti < 1);
}
