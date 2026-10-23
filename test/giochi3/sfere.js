// CATENA DI BIGLIE: percorso campionato, catena che avanza e spinge, tiro e inserimento (davanti o dietro), scoppio di
// tre, calamita e reazione a catena, buco, catena distrutta, scambio, stesso seme = stesse biglie, !win e sfide.
const assert = require('assert');
{ let s = 7; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/sfere');
const T = require('../../giochi/trucco');
const { D, percorso, PASSO } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.033); k++) { g.tempoRound += 0.033; if (g.passo(0.033)) return true; } return false; };
// una catena fatta a mano: colori dati, contigue a partire da s0
const catena = (g, p, colori, s0 = 600) => { const t = g.tav[p]; t.da = 0; t.cat = colori.map((c, i) => ({ id: ++t.nId, c, s: s0 + i * D })); return t; };
// spara la biglia di colore c contro la biglia i (dritto verso il suo centro)
const tiraContro = (g, p, i, c) => {
  const t = g.tav[p]; t.att = c; t.attesa = 0;
  const [x, y] = g.pos(t.cat[i].s);
  g.inp[p].mx = x; g.inp[p].my = y; g.inp[p].tocchi++;
  for (let k = 0; k < 40 && (k === 0 || t.colpi.length); k++) passa(g, 0.033);
};

assert.strictEqual(M.meta.id, 'sfere');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));
// ---- i percorsi ----
for (const nome of ['spirale', 'serpente']) {
  const P = percorso(nome);
  for (let i = 1; i < P.punti.length; i++) { const d = Math.hypot(P.punti[i][0] - P.punti[i - 1][0], P.punti[i][1] - P.punti[i - 1][1]); assert.ok(Math.abs(d - PASSO) < 0.3, `${nome}: passo costante (${d})`); }
  assert.ok(P.punti.every(([x, y]) => x >= -12 && x <= 900 && y >= 0 && y <= 600), `${nome}: dentro il campo`);
  // il percorso non passa sopra la rana e due tratti diversi non si toccano
  assert.ok(P.punti.every(([x, y]) => Math.hypot(x - P.tiratore.x, y - P.tiratore.y) > 70), `${nome}: lontano dalla rana`);
  const step = Math.round(120 / PASSO);
  for (let i = 0; i < P.punti.length; i += 3) for (let j = i + step; j < P.punti.length; j += 3) assert.ok(Math.hypot(P.punti[i][0] - P.punti[j][0], P.punti[i][1] - P.punti[j][1]) > D + 8, `${nome}: tratti separati`);
  assert.ok(P.punti.length * PASSO > 2000, `${nome}: abbastanza lungo`);
}
// ---- la catena esce, avanza e spinge ----
{
  const g = M.crea({ n: 1, opzioni: { difficolta: 'facile' }, bot: [null] }); parti(g);
  passa(g, 2);
  const t = g.tav[0];
  assert.ok(t.cat.length > 10 && t.cat.length + t.da === 60, 'le biglie escono dalla tana');
  for (let i = 1; i < t.cat.length; i++) assert.ok(Math.abs(t.cat[i].s - t.cat[i - 1].s - D) < 0.01, 'tutte attaccate');
  const testa = t.cat[t.cat.length - 1].s; passa(g, 5); assert.ok(t.cat[t.cat.length - 1].s > testa, 'avanza');
}
// ---- tiro, inserimento e scoppio ----
{
  const g = M.crea({ n: 1, opzioni: { percorso: 'serpente' }, bot: [null] }); parti(g);
  g.tempoRound = 10; // finita la corsa iniziale
  T.arma(g, 0); passa(g, 0.05); // la catena ferma: si mira al centro esatto della biglia
  const t = catena(g, 0, [0, 1, 1, 2, 3, 3, 0], 200);
  tiraContro(g, 0, 1, 2); // un colore che non fa niente: entra e basta
  assert.strictEqual(t.cat.length, 8, 'la biglia è entrata');
  assert.ok(t.cat.some((b, i) => b.c === 2 && i <= 2), 'vicino alla biglia colpita');
  for (let i = 1; i < t.cat.length; i++) assert.ok(t.cat[i].s - t.cat[i - 1].s >= D - 0.01, 'nessuna sovrapposizione');
  const prima = t.cat.length, pt = t.pt;
  const k3 = t.cat.findIndex((b) => b.c === 3);
  tiraContro(g, 0, k3, 3);
  assert.strictEqual(t.cat.length, prima - 2, 'tre gialle: scoppiano (2 nella catena + quella sparata)');
  assert.ok(t.pt === pt + 30 && g.punti[0] === t.pt, '10 punti a biglia');
  assert.ok(!t.cat.some((b) => b.c === 3));
}
// ---- calamita e reazione a catena ----
{
  const g = M.crea({ n: 1, opzioni: { percorso: 'serpente' }, bot: [null] }); parti(g);
  g.tempoRound = 10; T.arma(g, 0); passa(g, 0.05); // col trucco la catena sta ferma: si guarda solo la calamita
  const t = catena(g, 0, [2, 0, 0, 1, 1, 0, 3], 200);
  const i1 = t.cat.findIndex((b) => b.c === 1);
  tiraContro(g, 0, i1, 1);
  assert.deepStrictEqual(t.cat.map((b) => b.c), [2, 0, 0, 0, 3], 'le tre blu scoppiano');
  assert.ok(t.cat[3].s - t.cat[2].s > D + 1, 'resta un vuoto');
  // le tre blu scoppiano, il vuoto ha rosse ai due lati: la parte davanti torna indietro e scoppia anche lei
  passa(g, 1.5);
  assert.deepStrictEqual(t.cat.map((b) => b.c), [2, 3], 'reazione a catena');
  assert.strictEqual(t.pt, 30 + 30 * 2, 'la reazione vale doppio');
  assert.ok(t.cat[1].s - t.cat[0].s > D + 1, 'colori diversi ai lati del vuoto: niente calamita');
  T.consuma(g, 0); passa(g, 6);
  assert.ok(Math.abs(t.cat[1].s - t.cat[0].s - D) < 0.01, 'la catena che avanza richiude il vuoto spingendo');
}
// ---- il buco, la catena distrutta, lo scambio ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
  g.tempoRound = 10;
  const t = catena(g, 0, [0, 1, 2], g.L - 3 * D + 10);
  passa(g, 2);
  assert.ok(t.stato === 'perso' && g.tick, 'arrivate al buco');
  let ora = Date.now(); while (!g.finita) { ora += 33; g.tick(ora); }
  assert.ok(/arrivate al buco/.test(g.risultato.titolo) && g.risultato.vincitori.length === 0);
  const h = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(h); h.tempoRound = 10;
  const u = catena(h, 0, [1, 1], 500);
  const [a, b] = [u.att, u.pro];
  assert.ok(h.azione(0, { tipo: 'scambia' }).ok && u.att === b && u.pro === a, 'scambio');
  assert.ok(h.azione(0, { tipo: 'boh' }).errore);
  tiraContro(h, 0, 0, 1);
  passa(h, 0.1);
  assert.ok(u.stato === 'vuota' && u.pt > 30, 'catena distrutta: premio');
  ora = Date.now(); while (!h.finita) { ora += 33; h.tick(ora); }
  assert.ok(/Catena distrutta in \d:\d\d/.test(h.risultato.titolo) && h.risultato.vincitori[0] === 0);
}
// ---- stesso seme: stesse biglie per tutti; il colore da sparare è sempre nella catena ----
{
  const g = M.crea({ n: 2, opzioni: { difficolta: 'difficile' }, bot: [null, null] }); parti(g);
  passa(g, 6);
  const [a, b] = g.tav;
  assert.deepStrictEqual(a.cat.map((x) => x.c), b.cat.map((x) => x.c), 'stessa catena');
  for (let k = 0; k < 20; k++) { const c = g.colore(a); assert.ok(a.cat.some((x) => x.c === c)); }
  const st = g.statoTick(1);
  assert.ok(st.c.length === b.cat.length && st.o.length === 2 && Array.isArray(st.e));
}
// ---- !win: la catena si ferma per 25 secondi ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); passa(g, 5);
  const t = g.tav[0]; T.arma(g, 0); passa(g, 0.05);
  const testa = t.cat[t.cat.length - 1].s; passa(g, 5);
  assert.ok(Math.abs(t.cat[t.cat.length - 1].s - testa) < 0.01, 'col trucco la catena è ferma');
  passa(g, 21);
  assert.ok(!T.armato(g, 0), 'il trucco si consuma');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now(), vinte = { facile: 0, medio: 0, difficile: 0 }, tempi = { facile: 0, medio: 0, difficile: 0 };
  for (const per of ['spirale', 'serpente']) {
    for (const liv of Object.keys(vinte)) {
      const g = M.crea({ n: 1, opzioni: { percorso: per, difficolta: 'facile' }, bot: [liv] });
      let ora = parti(g);
      while (!g.finita) { ora += 33; g.tick(ora); }
      if (g.tav[0].stato === 'vuota') vinte[liv]++;
      tempi[liv] += g.tav[0].stato === 'vuota' ? g.tav[0].fine : 600;
    }
  }
  assert.ok(vinte.difficile === 2 && tempi.difficile < tempi.facile, JSON.stringify({ vinte, tempi }));
  const g = M.crea({ n: 3, opzioni: { percorso: 'serpente' }, bot: ['facile', 'medio', 'difficile'] });
  let ora = parti(g);
  while (!g.finita) { ora += 33; g.tick(ora); }
  assert.ok(g.risultato.vincitori.length === 1, JSON.stringify(g.risultato));
  console.log(`✓ Catena di biglie: percorsi, catena che spinge, tiro e scoppio, calamita e reazione a catena, buco, catena distrutta, scambio, stesso seme, !win; computer (catene facili vinte su 2) f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile}, vince il ${g.bot[g.risultato.vincitori[0]]} (${Date.now() - t0} ms)`);
}
