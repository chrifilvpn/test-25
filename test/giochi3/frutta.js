// AFFETTA LA FRUTTA: taglio con la lama (anche sulle posizioni di un attimo prima), bomba e stordimento, combo,
// frutti condivisi (li prende il primo), !win, fine a tempo e sfide tra computer dei tre livelli.
const assert = require('assert');
{ let s = 11; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/frutta');
const T = require('../../giochi/trucco');
const { FRUTTI, BOMBA, STELLA, W, H, distSeg } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.033); k++) { g.tempoRound += 0.033; if (g.passo(0.033)) return true; } return false; };
// un frutto in cima al suo volo (adesso è fermo, poi ricade)
const metti = (g, tipo, x, y) => { const t = g.tempoRound; const f = { id: ++g.nId, tipo, x0: x, y0: y, vx: 0, vy: 0, t0: t, rot: 0, giro: 0, chi: -1, tt: 0, ang: 0 }; g.frutti.push(f); return f; };
// la lama di p da (x0, y0) a (x1, y1) in "passi" tick
const colpo = (g, p, x0, y0, x1, y1, passi = 6) => {
  const i = g.inp[p];
  i.a = true; i.mx = x0; i.my = y0; passa(g, 0.033);
  for (let k = 1; k <= passi; k++) { i.mx = x0 + ((x1 - x0) * k) / passi; i.my = y0 + ((y1 - y0) * k) / passi; passa(g, 0.033); }
  i.a = false; passa(g, 0.033);
};
const nuova = (n = 1, bot = [], opzioni = {}) => { const g = M.crea({ n, opzioni, bot }); parti(g); g.prossimo = 1e9; g.frutti = []; return g; };

assert.strictEqual(M.meta.id, 'frutta');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));
assert.ok(FRUTTI[BOMBA].id === 'bomba' && FRUTTI[STELLA].p === 5);
assert.ok(Math.abs(distSeg(5, 5, 0, 0, 10, 0) - 5) < 1e-9 && Math.abs(distSeg(15, 0, 0, 0, 10, 0) - 5) < 1e-9);

// ---- taglio, punti, stella ----
{
  const g = nuova();
  const f = metti(g, 0, 300, 300), s = metti(g, STELLA, 600, 200);
  // la lama ferma o lontana non taglia
  g.inp[0].a = true; g.inp[0].mx = 300; g.inp[0].my = 100; passa(g, 0.2); g.inp[0].a = false; passa(g, 0.05);
  assert.strictEqual(f.chi, -1, 'lama lontana: niente taglio');
  // un movimento senza tenere premuto non taglia
  g.inp[0].mx = 250; g.inp[0].my = 300; passa(g, 0.033); g.inp[0].mx = 350; passa(g, 0.033);
  assert.strictEqual(f.chi, -1, 'senza premere non si taglia');
  colpo(g, 0, 250, 290, 350, 310);
  assert.ok(f.chi === 0 && g.punti[0] === 1 && g.tagliati[0] === 1, 'tagliato: 1 punto');
  colpo(g, 0, 600, 150, 600, 250);
  assert.ok(s.chi === 0 && g.punti[0] === 6, 'la stella vale 5');
}
// ---- si taglia quello che si vede: la posizione di un attimo prima vale ----
{
  const g = nuova();
  const f = metti(g, 0, 300, 300); f.vx = 600; // corre a destra: 0,2 s fa era 120 più a sinistra
  passa(g, 0.2);
  const q = g.dove(f, g.tempoRound);
  assert.ok(q.x > 400, 'il frutto è già più in là');
  colpo(g, 0, 300, 250, 300, 350, 2);
  assert.strictEqual(f.chi, 0, 'tagliato dove era un attimo prima');
  const h = metti(g, 1, 300, 300); h.vx = 2000; passa(g, 0.5);
  colpo(g, 0, 300, 250, 300, 350, 2);
  assert.strictEqual(h.chi, -1, 'ma non dove era mezzo secondo fa');
}
// ---- bomba: −10 e lama stordita ----
{
  const g = nuova();
  g.punti[0] = 15;
  const b = metti(g, BOMBA, 400, 300);
  colpo(g, 0, 350, 300, 450, 300);
  assert.ok(b.chi === 0 && g.punti[0] === 5 && /bomba/.test(g.evento.testo), 'bomba: −10');
  const f = metti(g, 0, 400, 200);
  colpo(g, 0, 350, 200, 450, 200, 3);
  assert.strictEqual(f.chi, -1, 'stordito: la lama non taglia');
  passa(g, 1.3);
  const f2 = metti(g, 0, 400, 200);
  colpo(g, 0, 350, 200, 450, 200);
  assert.strictEqual(f2.chi, 0, 'passato lo stordimento si taglia di nuovo');
  const g2 = nuova(); metti(g2, BOMBA, 400, 300); colpo(g2, 0, 350, 300, 450, 300);
  assert.strictEqual(g2.punti[0], 0, 'i punti non vanno sotto zero');
}
// ---- combo: tre in un colpo ----
{
  const g = nuova();
  const fs = [200, 400, 600].map((x) => metti(g, 2, x, 300));
  colpo(g, 0, 100, 300, 700, 300, 12);
  assert.ok(fs.every((f) => f.chi === 0), 'tutti e tre tagliati');
  assert.strictEqual(g.punti[0], 6, 'tre frutti + 3 di combo');
  // due colpi separati non fanno combo
  const h = nuova();
  [200, 400, 600].forEach((x) => metti(h, 2, x, 300));
  colpo(h, 0, 100, 300, 300, 300); colpo(h, 0, 300, 300, 500, 300); colpo(h, 0, 500, 300, 700, 300);
  assert.strictEqual(h.punti[0], 3, 'colpi separati: niente combo');
}
// ---- in due: il frutto è di chi lo taglia per primo ----
{
  const g = nuova(2, [null, null]);
  const f = metti(g, 0, 300, 300);
  colpo(g, 1, 250, 300, 350, 300);
  colpo(g, 0, 250, 300, 350, 300);
  assert.ok(f.chi === 1 && g.punti[1] === 1 && g.punti[0] === 0, 'lo prende il primo');
  const st = g.statoTick();
  assert.ok(st.f.some((x) => x[0] === f.id && x[5] === 1) && st.e.some((e) => e[0] === 'c' && e[2] === 1) && st.pt[1] === 1);
  assert.strictEqual(g.statoTick().e.length, 0, 'gli effetti partono una volta sola');
}
// ---- !win: lama larga, le bombe non contano, dura 25 secondi ----
{
  const g = nuova();
  T.arma(g, 0);
  const b = metti(g, BOMBA, 400, 300), f = metti(g, 0, 400, 355);
  colpo(g, 0, 330, 300, 470, 300);
  assert.ok(b.chi === -1 && f.chi === 0 && g.punti[0] === 1, 'col trucco: lama larga e bombe innocue');
  passa(g, 26);
  assert.ok(!T.armato(g, 0), 'il trucco si consuma dopo 25 s');
}
// ---- partita intera: lanci, fine a tempo, risultato ----
{
  const g = M.crea({ n: 1, opzioni: { durata: 60, bombe: 'nessuna' }, bot: [null] });
  let ora = parti(g), lanciati = 0;
  while (!g.finita && ora < Date.now() + 80000) { ora += 33; g.tick(ora); lanciati = Math.max(lanciati, g.nId); assert.ok(g.frutti.every((f) => f.tipo !== BOMBA), 'senza bombe'); }
  assert.ok(g.finita && lanciati > 40, `finita, ${lanciati} frutti lanciati`);
  assert.ok(/0 punti · 0 frutti tagliati/.test(g.risultato.titolo));
}
// ---- sfide tra computer ----
{
  const t0 = Date.now(), tot = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 2; k++) {
    for (const liv of Object.keys(tot)) {
      const g = M.crea({ n: 1, opzioni: {}, bot: [liv] });
      let ora = parti(g);
      while (!g.finita) { ora += 33; g.tick(ora); }
      tot[liv] += g.punti[0];
    }
  }
  assert.ok(tot.facile < tot.medio && tot.medio < tot.difficile, JSON.stringify(tot));
  const g = M.crea({ n: 3, opzioni: { bombe: 'tante' }, bot: ['facile', 'medio', 'difficile'] });
  let ora = parti(g);
  while (!g.finita) { ora += 33; g.tick(ora); }
  assert.ok(g.risultato.vincitori.length === 1 && g.tagliati.reduce((a, b) => a + b) > 50);
  assert.ok(g.punti[2] > g.punti[0], `in sfida il difficile batte il facile: ${g.punti}`);
  console.log(`✓ Affetta la frutta: taglio (anche dove il frutto era un attimo prima), stella, bomba e stordimento, combo, frutti condivisi, !win, fine a tempo; punti in 2 partite f/m/d ${tot.facile}/${tot.medio}/${tot.difficile} (${Date.now() - t0} ms)`);
}
