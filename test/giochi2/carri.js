// CARRI ARMATI NEL LABIRINTO: labirinto (tutto raggiungibile), muri che fermano carri e proiettili, rimbalzi,
// colpi (anche a se stessi), scudo, casse, punti, e tante partite complete tra computer con i tempi di calcolo.
const assert = require('assert');
const M = require('../../giochi2/carri');
const { labirinto, rettangoli, S, R, V_PROIETTILE } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec, dt = 1 / 30) => { for (let k = 0; k < Math.round(sec / dt); k++) { g.tempoRound += dt; if (g.passo(dt)) return true; } return false; };
const ferma = (g) => { for (let p = 0; p < g.n; p++) { g.bot[p] = null; g.inp[p].x = g.inp[p].y = 0; } };

assert.strictEqual(M.meta.id, 'carri');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));

// ---- il labirinto: bordo chiuso, ogni cella raggiungibile ----
for (let k = 0; k < 200; k++) {
  const C = 9 + (k % 3) * 2, Rr = 6 + (k % 3);
  const L = labirinto(C, Rr);
  for (let c = 0; c < C; c++) assert.ok(L.h[0][c] && L.h[Rr][c], 'bordo sopra e sotto');
  for (let r = 0; r < Rr; r++) assert.ok(L.v[r][0] && L.v[r][C], 'bordo ai lati');
  const vis = new Set(['0,0']), coda = [[0, 0]];
  while (coda.length) {
    const [r, c] = coda.pop();
    const vai = [[r, c + 1, !L.v[r][c + 1]], [r, c - 1, !L.v[r][c]], [r + 1, c, r + 1 < Rr && !L.h[r + 1][c]], [r - 1, c, r > 0 && !L.h[r][c]]];
    for (const [a, b, ok] of vai) if (ok && a >= 0 && b >= 0 && a < Rr && b < C && !vis.has(`${a},${b}`)) { vis.add(`${a},${b}`); coda.push([a, b]); }
  }
  assert.strictEqual(vis.size, C * Rr, 'tutte le celle raggiungibili');
}
// ---- labirinto vuoto per le prove: solo il bordo ----
function vuoto(g) {
  for (const riga of g.L.h) riga.fill(0); for (const riga of g.L.v) riga.fill(0);
  g.L.h[0].fill(1); g.L.h[g.Rr].fill(1); for (const riga of g.L.v) { riga[0] = 1; riga[g.C] = 1; }
  ({ muri: g.muri, vicino: g.vicino } = rettangoli(g.L, g.C, g.Rr));
  g.casse = []; g.prossimaCassa = 1e9;
}
// ---- movimento: gira e poi parte; i muri fermano ----
{
  const g = M.crea({ n: 2, opzioni: { casse: 'no' }, bot: [null, null] }); parti(g); ferma(g); vuoto(g);
  const e = g.c[0];
  Object.assign(e, { x: 2.5 * S, y: 2.5 * S, a: 0, t: 0 });
  g.input(0, { x: 0, y: 1 });
  passa(g, 0.1);
  assert.ok(Math.abs(e.y - 2.5 * S) < 2, 'prima gira sul posto');
  passa(g, 1);
  assert.ok(e.y > 2.5 * S + 60, 'poi va giù');
  g.input(0, { x: 0, y: 1 }); passa(g, 6);
  assert.ok(e.y <= g.H - R + 0.01, 'il bordo lo ferma');
}
// ---- sparo, rimbalzo, colpo a se stessi, scudo, punti ----
{
  const g = M.crea({ n: 2, opzioni: { casse: 'no' }, bot: [null, null] }); parti(g); ferma(g); vuoto(g);
  const [a, b] = g.c;
  Object.assign(a, { x: 1.5 * S, y: 1.5 * S, a: 0, t: 0 });
  Object.assign(b, { x: 5.5 * S, y: 1.5 * S, a: Math.PI, t: Math.PI });
  g.input(0, { mx: b.x, my: b.y }); g.inp[0].tocchi++;
  passa(g, 0.05);
  assert.strictEqual(g.p.length, 1, 'un colpo sparato');
  passa(g, 1.5);
  assert.ok(!b.vivo && b.da === 0 && g.punti[0] === 1, 'colpito: un punto');
  // il colpo verso il muro torna indietro e colpisce chi l'ha sparato
  const h = M.crea({ n: 2, opzioni: { casse: 'no' }, bot: [null, null] }); parti(h); ferma(h); vuoto(h);
  const [x, y] = h.c;
  Object.assign(x, { x: 1.5 * S, y: 1.5 * S }); Object.assign(y, { x: 5.5 * S, y: 4.5 * S });
  h.input(0, { mx: 0, my: 1.5 * S }); h.inp[0].tocchi++;
  passa(h, 1.5);
  assert.ok(!x.vivo && x.da === 0 && h.punti[0] === 0, 'di sponda su se stesso: fuori, nessun punto');
  // lo scudo para un colpo
  const k = M.crea({ n: 2, opzioni: { casse: 'no' }, bot: [null, null] }); parti(k); ferma(k); vuoto(k);
  Object.assign(k.c[0], { x: 1.5 * S, y: 1.5 * S }); Object.assign(k.c[1], { x: 5.5 * S, y: 1.5 * S, scudo: 15 });
  k.input(0, { mx: 5.5 * S, my: 1.5 * S }); k.inp[0].tocchi++;
  passa(k, 1);
  assert.ok(k.c[1].vivo && k.c[1].scudo === 0, 'lo scudo ha parato');
  // al massimo 5 proiettili
  for (let q = 0; q < 12; q++) { k.inp[0].tocchi++; passa(k, 0.3); }
  assert.ok(k.p.filter((p) => p.di === 0).length <= 5);
  // il proiettile rimbalza e non esce mai dal campo
  for (const p of k.p) assert.ok(p.x > 0 && p.x < k.W && p.y > 0 && p.y < k.H);
}
// ---- l'ultimo rimasto prende il punto in più ----
{
  const g = M.crea({ n: 3, opzioni: { casse: 'no' }, bot: [null, null, null] }); parti(g); ferma(g);
  g.c[1].vivo = false; g.c[2].vivo = false;
  assert.ok(passa(g, 3), 'il round finisce dopo i 2 secondi di attesa');
  g.fineRound();
  assert.strictEqual(g.punti[0], 1);
}
// ---- casse ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); ferma(g); vuoto(g);
  g.casse = [{ id: 1, x: g.c[0].x + 5, y: g.c[0].y, tipo: 'tripla' }];
  passa(g, 0.05);
  assert.strictEqual(g.c[0].tripla, 4);
  g.input(0, { mx: g.c[0].x + 100, my: g.c[0].y }); g.inp[0].tocchi++; passa(g, 0.05);
  assert.strictEqual(g.p.length, 3, 'colpo triplo');
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const punti = { facile: 0, medio: 0, difficile: 0 }, vinte = { facile: 0, medio: 0, difficile: 0 };
  let somma = 0, quanti = 0, round = 0;
  const N = 30;
  for (let k = 0; k < N; k++) {
    const liv = [['facile', 'medio'], ['medio', 'difficile'], ['facile', 'difficile'], ['facile', 'medio', 'difficile', 'medio']][k % 4];
    const g = M.crea({ n: liv.length, opzioni: { round: 5, casse: k % 2 ? 'si' : 'no' }, bot: liv });
    let ora = Date.now(), giri = 0;
    while (!g.finita && giri++ < 60000) {
      ora += 33;
      if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
      const t = process.hrtime.bigint();
      g.tick(ora);
      if (g.fase === 'gioco') { somma += Number(process.hrtime.bigint() - t) / 1e6; quanti++; }
      for (const e of g.c) assert.ok(e.x >= R - 0.01 && e.x <= g.W - R + 0.01 && e.y >= R - 0.01 && e.y <= g.H - R + 0.01, 'il carro resta nel campo');
    }
    assert.ok(g.finita, 'la partita finisce');
    round += g.round;
    g.punti.forEach((x, i) => { punti[liv[i]] += x; });
    for (const v of g.risultato.vincitori) vinte[liv[v]]++;
    assert.ok(JSON.stringify(g.vistaTick(0)).length < 1500, 'tick piccolo');
  }
  console.log(`✓ Carri armati: labirinti, muri, rimbalzi, colpi a se stessi, scudo, casse; ${N} partite (${round} round) tra computer: punti f/m/d ${punti.facile}/${punti.medio}/${punti.difficile}, vinte ${vinte.facile}/${vinte.medio}/${vinte.difficile}, tick medio ${(somma / quanti).toFixed(3)} ms (${Date.now() - t0} ms)`);
  assert.ok(vinte.difficile > vinte.medio && vinte.medio > vinte.facile);
  assert.ok(somma / quanti < 1);
}
