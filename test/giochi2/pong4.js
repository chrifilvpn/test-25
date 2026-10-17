// PONG A QUATTRO: lati per 2/3/4 giocatori, comandi dal punto di vista di chi gioca, rimbalzi su racchette, muri e
// blocchi, angolo dal punto d'impatto, accelerazione, vite, lato chiuso, palline in più, partite tra computer.
const assert = require('assert');
const M = require('../../giochi2/pong4');
const { L, RACCHETTA, DISTANZA, V0, V_MAX, centroRacchetta, lungoLato } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 25; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec, dt = 1 / 40) => { for (let k = 0; k < Math.round(sec / dt); k++) { g.tempoRound += dt; if (g.passo(dt)) return true; } return false; };
const nuovo = (n, opzioni = {}) => { const g = M.crea({ n, opzioni, bot: new Array(n).fill(null) }); parti(g); return g; };

assert.strictEqual(M.meta.id, 'pong4');
assert.deepStrictEqual(M.meta.giocatori, [2, 3, 4]);
// ---- lati e coordinate ----
assert.deepStrictEqual(nuovo(2).lati, [0, 2]);
assert.deepStrictEqual(nuovo(3).lati, [0, 1, 3]);
for (const lato of [0, 1, 2, 3]) for (const s of [100, 300, 450]) { const c = centroRacchetta(lato, s); assert.ok(Math.abs(lungoLato(lato, c.x, c.y) - s) < 1e-9, 'andata e ritorno'); }
// ---- comandi: la freccia a destra va a destra sullo schermo di chi gioca, il mouse sposta la racchetta ----
{
  const g = nuovo(4);
  for (let p = 0; p < 4; p++) { const s0 = g.r[p].s; g.input(p, { x: 1 }); passa(g, 0.1); g.input(p, { x: 0 }); assert.ok(g.r[p].s > s0, `posto ${p}: a destra`); }
  g.input(1, { mx: 150, my: 300 }); passa(g, 0.5);
  assert.ok(Math.abs(g.r[1].s - 150) < 1, 'segue il mouse');
  g.input(1, { x: 1 }); passa(g, 0.2); g.input(1, { x: 0 }); const s1 = g.r[1].s; passa(g, 0.3);
  assert.strictEqual(g.r[1].s, s1, 'dopo i tasti non torna dove era il mouse');
}
// ---- rimbalzo sulla racchetta: dritto dal centro, di lato dal bordo, più veloce ----
{
  const g = nuovo(2, { palle: 1 }); g.palle = [];
  g.r[0].s = 300;
  g.palle.push({ id: 1, x: 300, y: 400, vx: 0, vy: V0, attesa: 0, ultimo: null });
  passa(g, 0.6);
  const b = g.palle[0];
  assert.ok(b.vy < 0 && Math.abs(b.vx) < 30, 'colpo al centro: torna dritta');
  assert.ok(Math.hypot(b.vx, b.vy) > V0 * 1.04, 'accelera');
  g.palle = [{ id: 2, x: 300 + RACCHETTA * 0.45, y: 400, vx: 0, vy: V0, attesa: 0, ultimo: null }];
  passa(g, 0.6);
  assert.ok(g.palle[0].vx > 150, 'colpo sul bordo destro: esce a destra');
  // stessa cosa per chi gioca a sinistra (in 4): a destra sul suo schermo
  const h = nuovo(4, { palle: 1 }); h.palle = []; h.r[1].s = 300;
  h.palle.push({ id: 1, x: 200, y: 300 + RACCHETTA * 0.45, vx: -V0, vy: 0, attesa: 0, ultimo: null });
  passa(h, 0.6);
  assert.ok(h.palle[0].vx > 0 && h.palle[0].vy > 150, 'sinistra: torna verso il centro e va verso il "suo" destra');
}
// ---- gol, vite, lato che diventa muro, fine del round ----
{
  const g = nuovo(2, { palle: 1, vite: 3 }); g.palle = [];
  g.r[0].s = 100;
  g.palle.push({ id: 1, x: 450, y: 450, vx: 0, vy: V0, attesa: 0, ultimo: 1 });
  passa(g, 1);
  assert.strictEqual(g.r[0].vite, 2, 'gol: una vita in meno');
  assert.strictEqual(g.palle.length, 1, 'una pallina nuova');
  g.r[0].vite = 1; g.palle = [{ id: 9, x: 450, y: 450, vx: 0, vy: V0, attesa: 0, ultimo: 1 }];
  const fine = passa(g, 1);
  assert.ok(g.r[0].fuori && fine, 'senza vite: fuori, round finito');
  g.fineRound();
  assert.deepStrictEqual(g.punti, [0, 2], 'il primo fuori 0, chi vince n');
  // in 3 il lato senza giocatore è un muro
  const h = nuovo(3, { palle: 1 }); h.palle = [{ id: 1, x: 300, y: 200, vx: 0, vy: -V0, attesa: 0, ultimo: null }];
  passa(h, 0.6);
  assert.ok(h.palle[0].vy > 0 && h.r.every((x) => x.vite === 5), 'il lato di sopra è un muro');
}
// ---- palline in più dopo 45 secondi ----
{
  const g = nuovo(2, { palle: 1 }); g.tempoRound = 45; g.passo(0.01);
  assert.strictEqual(g.palle.length, 2);
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 };
  let somma = 0, quanti = 0;
  const N = 24;
  for (let k = 0; k < N; k++) {
    const liv = [['facile', 'medio'], ['medio', 'difficile'], ['facile', 'difficile'], ['facile', 'medio', 'difficile'], ['facile', 'medio', 'difficile', 'medio']][k % 5];
    const bot = k % 2 ? liv : liv.slice().reverse();
    const g = M.crea({ n: bot.length, opzioni: { round: 1 }, bot });
    let ora = Date.now(), giri = 0;
    while (!g.finita && giri++ < 100000) {
      ora += 25; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
      const t = process.hrtime.bigint(); g.tick(ora);
      if (g.fase === 'gioco') { somma += Number(process.hrtime.bigint() - t) / 1e6; quanti++; }
      for (const b of g.palle) assert.ok(b.x > -40 && b.x < L + 40 && b.y > -40 && b.y < L + 40 && Math.hypot(b.vx, b.vy) <= V_MAX + 1, `la pallina resta nel campo ${JSON.stringify(b)}`);
    }
    assert.ok(g.finita, 'la partita finisce');
    for (const v of g.risultato.vincitori) vinte[bot[v]]++;
    assert.ok(JSON.stringify(g.vistaTick(0)).length < 600);
  }
  console.log(`✓ Pong a quattro: lati in 2/3/4, comandi girati, effetto dal punto d'impatto, accelerazione, vite, muri, palline in più; ${N} partite tra computer: vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile}, tick medio ${(somma / quanti).toFixed(3)} ms (${Date.now() - t0} ms)`);
  assert.ok(vinte.difficile > vinte.medio && vinte.medio > vinte.facile);
  assert.ok(somma / quanti < 1);
}
