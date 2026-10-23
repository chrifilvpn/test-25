// DIFESA DELLA TORRE: strade e caselle, costruire/migliorare/vendere, i colpi delle torrette (arciere, cannone ad area,
// ghiaccio che rallenta, fulmine che salta e passa l'armatura), ondate e "Pronto!", vite, squadra e sfida, !win e
// partite intere tra computer.
const assert = require('assert');
{ let s = 3; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/difesa');
const T = require('../../giochi/trucco');
const { TORRI, MOSTRI, strade, ondata } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 50; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.05); k++) { g.tempoRound += 0.05; if (g.passo(0.05)) return true; } return false; };
// un mostro fermo in un punto della strada v (alla distanza s)
const mostro = (g, tipo, v, s, vita = 1000) => { const m = { id: ++g.nId, tipo, v, s, vita, max: vita, lento: 0 }; g.mostri.push(m); return m; };
const fermi = (g) => { for (const m of g.mostri) m.s = m.s0 === undefined ? (m.s0 = m.s) : m.s0; };
const vicina = (g, v, s, zona = v) => { const [x, y] = g.pos(v, s); return g.celle.filter((c) => c.zona === zona).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; };

assert.strictEqual(M.meta.id, 'difesa');
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));
// ---- strade e caselle ----
for (const n of [1, 2, 3, 4]) {
  const g = M.crea({ n, opzioni: {}, bot: [] });
  assert.strictEqual(g.vie.length, n);
  if (n > 1) { const L = g.vie.map((v) => Math.round(v.L)); assert.ok(L.every((x) => x === L[0]), `strade uguali in ${n}: ${L}`); }
  for (let z = 0; z < n; z++) assert.ok(g.celle.filter((c) => c.zona === z).length > 30, 'caselle per tutti');
  assert.ok(g.celle.every((c) => g.vie.every((v) => v.p.every(([x, y]) => Math.hypot(x - c.x, y - c.y) > 30))), 'nessuna casella sulla strada');
}
// ---- costruire, migliorare, vendere ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g);
  const c0 = g.celle.find((c) => c.zona === 0), c1 = g.celle.find((c) => c.zona === 1);
  assert.ok(g.azione(0, { tipo: 'costruisci', i: c1.i, j: c1.j, torre: 'arciere' }).errore, 'non vicino alla strada degli altri');
  assert.ok(g.azione(0, { tipo: 'costruisci', i: 0, j: 7, torre: 'boh' }).errore);
  const oro = g.oro[0];
  assert.ok(g.azione(0, { tipo: 'costruisci', i: c0.i, j: c0.j, torre: 'arciere' }).ok);
  assert.strictEqual(g.oro[0], oro - TORRI.arciere.costo);
  assert.ok(g.azione(0, { tipo: 'costruisci', i: c0.i, j: c0.j, torre: 'cannone' }).errore, 'casella occupata');
  const t = g.torri[0];
  assert.ok(g.azione(1, { tipo: 'migliora', id: t.id }).errore, 'solo le proprie');
  g.oro[0] = 1000;
  assert.ok(g.azione(0, { tipo: 'migliora', id: t.id }).ok && g.azione(0, { tipo: 'migliora', id: t.id }).ok && t.liv === 3);
  assert.ok(g.azione(0, { tipo: 'migliora', id: t.id }).errore, 'livello massimo');
  assert.ok(g.stat(t).raggio > TORRI.arciere.raggio && g.stat(t).danno > TORRI.arciere.danno);
  const spesa = t.spesa; g.oro[0] = 0;
  assert.ok(g.azione(0, { tipo: 'vendi', id: t.id }).ok && g.oro[0] === Math.floor(spesa * 0.7) && !g.torri.length, 'venduta al 70%');
  g.oro[0] = 10;
  assert.ok(/Servono/.test(g.azione(0, { tipo: 'costruisci', i: c0.i, j: c0.j, torre: 'arciere' }).errore), 'senza monete no');
}
// ---- i colpi ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); g.fino = 1e9; g.oro[0] = 5000;
  const c = vicina(g, 0, 300);
  g.costruisci(0, c.i, c.j, 'arciere');
  const m = mostro(g, 'goblin', 0, 300, 100);
  for (let k = 0; k < 40; k++) { passa(g, 0.05); fermi(g); }
  assert.ok(m.vita < 100 - TORRI.arciere.danno * 2, `l'arciere colpisce (${m.vita})`);
  // l'armatura toglie danni (tranne al fulmine)
  const s1 = mostro(g, 'scudo', 0, 300, 100); g.mostri = [s1]; g.torri[0].ric = 0; passa(g, 0.05); fermi(g);
  assert.strictEqual(Math.round(100 - s1.vita), TORRI.arciere.danno - MOSTRI.scudo.armatura, 'armatura');
  // ghiaccio: rallenta
  g.torri = []; g.costruisci(0, c.i, c.j, 'ghiaccio');
  const lento = mostro(g, 'goblin', 0, 300, 1000); g.mostri = [lento]; passa(g, 0.05);
  assert.ok(lento.lento > 0, 'rallentato');
  const s0 = lento.s; passa(g, 0.5);
  assert.ok(lento.s - s0 < MOSTRI.goblin.v * g.veloce * 0.5 * 0.55 + 1, 'va a metà velocità');
  // cannone: tutti i mostri vicini
  g.torri = []; g.costruisci(0, c.i, c.j, 'cannone');
  const a = mostro(g, 'goblin', 0, 300, 100), b = mostro(g, 'goblin', 0, 320, 100), lontano = mostro(g, 'goblin', 0, 600, 100);
  g.mostri = [a, b, lontano]; passa(g, 0.05);
  assert.ok(a.vita < 100 && b.vita < 100 && lontano.vita === 100, 'il cannone colpisce ad area');
  // fulmine: salta e passa l'armatura
  g.torri = []; g.costruisci(0, c.i, c.j, 'fulmine');
  const f = [0, 1, 2].map((k) => mostro(g, 'scudo', 0, 300 + k * 30, 100)); g.mostri = f.slice(); passa(g, 0.05);
  assert.ok(f.every((x) => x.vita < 100) && Math.round(100 - f[2].vita) === TORRI.fulmine.danno, 'il fulmine (sul più avanti) salta tra tre mostri e passa l\'armatura');
  // ucciso: monete e punti a chi l'ha ucciso
  g.torri = []; g.costruisci(0, c.i, c.j, 'arciere'); const oro = g.oro[0], pt = g.punti[0];
  g.mostri = [mostro(g, 'goblin', 0, 300, 1)]; passa(g, 0.05);
  assert.ok(!g.mostri.length && g.oro[0] === oro + MOSTRI.goblin.oro && g.punti[0] === pt + MOSTRI.goblin.oro);
}
// ---- ondate, "Pronto!", vite ----
{
  assert.deepStrictEqual(ondata(5, 10, { a: 9 }), ondata(5, 10, { a: 9 }), 'stessa ondata per lo stesso seme');
  assert.ok(ondata(5, 10, { a: 1 }).some((x) => x[1] === 'drago') && !ondata(4, 10, { a: 1 }).some((x) => x[1] === 'drago'), 'il drago ogni 5 ondate');
  const g = M.crea({ n: 2, opzioni: { modo: 'squadra' }, bot: [null, null] }); parti(g);
  assert.strictEqual(g.stadio, 'attesa');
  const oro = g.oro[0];
  g.azione(0, { tipo: 'pronto' }); passa(g, 0.1);
  assert.strictEqual(g.stadio, 'attesa', 'aspetta che siano pronti tutti');
  g.azione(1, { tipo: 'pronto' }); passa(g, 0.1);
  assert.ok(g.stadio === 'onda' && g.k === 1 && g.oro[0] > oro + 20, 'partita prima: premio');
  assert.ok(g.azione(0, { tipo: 'pronto' }).errore);
  passa(g, 3);
  assert.ok(g.mostri.length >= 2 && g.mostri.some((m) => m.v === 0) && g.mostri.some((m) => m.v === 1), 'un mostro per strada');
  // nessuna torretta: i mostri arrivano e tolgono vite in comune
  const vite = g.vite;
  passa(g, 30);
  assert.ok(g.vite < vite, 'le vite calano');
  while (!passa(g, 1));
  assert.ok(g.esito === 'persa' && g.vite === 0);
  let ora = Date.now(); while (!g.finita) { ora += 50; g.tick(ora); }
  assert.ok(g.risultato.vincitori.length === 0 && /caduta/.test(g.risultato.titolo));
}
// ---- sfida: ognuno la sua porta ----
{
  const g = M.crea({ n: 2, opzioni: { modo: 'sfida' }, bot: [null, 'difficile'] }); parti(g);
  assert.strictEqual(g.vite, null);
  let ora = Date.now(); while (!g.finita) { ora += 50; g.tick(ora); }
  assert.ok(g.fuori[0] && !g.fuori[1] && g.risultato.vincitori[0] === 1, 'resta in piedi chi difende');
}
// ---- !win: triplo danno per 25 secondi ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); g.fino = 1e9; g.oro[0] = 500;
  const c = vicina(g, 0, 300); g.costruisci(0, c.i, c.j, 'arciere');
  T.arma(g, 0);
  const m = mostro(g, 'goblin', 0, 300, 1000); passa(g, 0.05);
  assert.strictEqual(Math.round(1000 - m.vita), TORRI.arciere.danno * 3);
  g.mostri = []; passa(g, 26);
  assert.ok(!T.armato(g, 0));
}
// ---- partite intere tra computer ----
{
  const t0 = Date.now(), ondate = {};
  for (const liv of ['facile', 'difficile']) {
    const g = M.crea({ n: 1, opzioni: { ondate: 20, difficolta: 'difficile' }, bot: [liv] });
    let ora = parti(g); while (!g.finita) { ora += 50; g.tick(ora); }
    ondate[liv] = g.esito === 'vinta' ? 21 : g.k;
  }
  assert.ok(ondate.difficile > ondate.facile, JSON.stringify(ondate));
  const g = M.crea({ n: 4, opzioni: { modo: 'squadra', ondate: 10 }, bot: ['medio', 'medio', 'difficile', 'facile'] });
  let ora = parti(g); while (!g.finita) { ora += 50; g.tick(ora); }
  assert.ok(g.esito === 'vinta' && g.risultato.vincitori.length === 4, g.risultato.titolo);
  console.log(`✓ Difesa della torre: strade e caselle, costruire/migliorare/vendere, arciere, armatura, ghiaccio, cannone, fulmine, ondate e Pronto!, vite, squadra e sfida, !win; ondate retta (20, difficile) facile ${ondate.facile} · difficile ${ondate.difficile > 20 ? 'tutte' : ondate.difficile} (${Date.now() - t0} ms)`);
}
