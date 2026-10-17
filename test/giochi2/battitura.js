// GARA DI BATTITURA: testi veri della lunghezza giusta, avanzamento solo con lettere giuste (dal browser), velocità
// impossibili rifiutate, arrivi e punti, parole al minuto, e partite complete tra computer.
const assert = require('assert');
const M = require('../../giochi2/battitura');
const { RIGHE, testo, LUNGHEZZE, ppm, uguali, MAX_CPS } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 50; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec, dt = 1 / 20) => { for (let k = 0; k < Math.round(sec / dt); k++) { g.tempoRound += dt; if (g.passo(dt)) return true; } return false; };

assert.ok(RIGHE.length >= 120, `tante frasi (${RIGHE.length})`);
for (const r of RIGHE) {
  assert.ok(r.fonte && r.testo && r.testo.length >= 8, `riga valida: ${r.testo}`);
  assert.ok(!/ {2}|^\s|\s$/.test(r.testo), `spazi puliti: ${r.testo}`);
  assert.ok(/^[A-Za-zÀ-ÿ0-9 .,;:!?'"«»()…-]+$/.test(r.testo), `solo caratteri che si scrivono con la tastiera: ${r.testo}`);
}
for (const l of Object.keys(LUNGHEZZE)) {
  const usate = new Set();
  for (let k = 0; k < 30; k++) { const t = testo(l, usate); assert.ok(t.testo.length >= LUNGHEZZE[l][0] && t.testo.length <= LUNGHEZZE[l][1], `${l}: ${t.testo.length}`); }
}
assert.ok(uguali('è', 'e') && uguali('’', "'") && !uguali('A', 'a'));
assert.strictEqual(ppm(250, 60), 50, '250 battute in un minuto = 50 parole al minuto');
// ---- una gara tra due persone ----
{
  const g = M.crea({ n: 2, opzioni: { round: 1 }, bot: [null, null] }); parti(g);
  const n = g.nT;
  g.tempoRound = 1; g.input(0, { k: 200, e: 0 });
  assert.ok(g.g[0].k <= MAX_CPS + 3, 'troppo veloce: non ci si crede');
  g.input(0, { k: 5, e: 1 });
  assert.ok(g.g[0].k >= 5 && g.g[0].errori === 1);
  g.input(0, { k: 3 });
  assert.ok(g.g[0].k >= 5, 'non si torna indietro');
  g.tempoRound = 30; g.input(0, { k: n, e: 2 });
  assert.ok(g.g[0].arrivo !== null && g.g[0].pos === 1, 'arrivato primo');
  g.input(1, { k: Math.floor(n / 2) });
  assert.ok(!passa(g, 20), 'gli altri hanno ancora tempo');
  assert.ok(passa(g, 6), 'dopo 25 secondi il round si chiude');
  g.fineRound();
  assert.deepStrictEqual(g.punti, [2, 0]);
  assert.strictEqual(g.velocita[0][0], ppm(n, 30));
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const punti = { facile: 0, medio: 0, difficile: 0 }, v = { facile: [], medio: [], difficile: [] };
  let somma = 0, quanti = 0;
  for (let k = 0; k < 60; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { round: 3, lunghezza: ['media', 'corta', 'lunga'][k % 3] }, bot: liv });
    let ora = Date.now();
    while (!g.finita) {
      ora += 50; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
      const t = process.hrtime.bigint(); g.tick(ora);
      if (g.fase === 'gioco') { somma += Number(process.hrtime.bigint() - t) / 1e6; quanti++; }
    }
    liv.forEach((l, i) => { punti[l] += g.punti[i]; v[l].push(...g.velocita[i]); });
    assert.ok(JSON.stringify(g.vistaTick(0)).length < 400);
  }
  const media = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  console.log(`✓ Gara di battitura: ${RIGHE.length} frasi, testi per lunghezza, controllo velocità, arrivi e punti; 60 partite tra computer: punti f/m/d ${punti.facile}/${punti.medio}/${punti.difficile}, parole al minuto ${media(v.facile)}/${media(v.medio)}/${media(v.difficile)}, tick medio ${(somma / quanti).toFixed(3)} ms (${Date.now() - t0} ms)`);
  assert.ok(punti.difficile > punti.medio && punti.medio > punti.facile);
  assert.ok(media(v.facile) >= 18 && media(v.facile) <= 34 && media(v.difficile) >= 65);
}
