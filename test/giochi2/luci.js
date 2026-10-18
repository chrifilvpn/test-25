// LUCI SPENTE: il tocco cambia la croce, il minimo di tocchi (confronto con la ricerca completa sul 3×3 e sul 4×4),
// schemi sempre risolvibili, annulla, aiuto, medaglia, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/luci');
const { risolvi, tocca, nuovoSchema, peso, fascia, LATI, TOCCHI } = M._test;

// ---- il tocco ----
{
  const s = new Array(25).fill(0);
  tocca(s, 5, 0, 2); assert.deepStrictEqual([0, 1, 5].map((i) => s[i]), [1, 1, 1]); assert.strictEqual(s.filter(Boolean).length, 3, 'angolo: 3 luci');
  tocca(s, 5, 12, 2); assert.strictEqual(s.filter(Boolean).length, 8, 'centro: 5 luci');
  const t = new Array(9).fill(0); tocca(t, 3, 4, 3); tocca(t, 3, 4, 3); assert.ok(t[4] === 2 && t[1] === 2, 'tre colori: due tocchi = rossa');
}
// ---- minimo esatto: ricerca completa su griglie piccole ----
for (const [lato, q] of [[3, 2], [4, 2], [3, 3]]) {
  const N = lato * lato, tot = q ** N, migliore = new Map();
  for (let m = 0; m < tot; m++) {
    const s = new Array(N).fill(0); let mm = m, w = 0;
    for (let i = 0; i < N; i++) { const v = mm % q; mm = Math.floor(mm / q); if (v) { tocca(s, lato, i, q, v); w += v; } }
    // per spegnere s servono i tocchi "opposti": nel modulo 2 sono gli stessi, nel modulo 3 si contano q − v
    const k = s.join('');
    if (q === 2 && (!migliore.has(k) || migliore.get(k) > w)) migliore.set(k, w);
    if (q === 3) {
      let w2 = 0; mm = m; for (let i = 0; i < N; i++) { const v = mm % q; mm = Math.floor(mm / q); if (v) w2 += q - v; }
      if (!migliore.has(k) || migliore.get(k) > w2) migliore.set(k, w2);
    }
  }
  let provati = 0;
  for (const [k, w] of migliore) {
    if (provati++ > 3000) break;
    const s = k.split('').map(Number), x = risolvi(s, lato, q);
    assert.strictEqual(peso(x), w, `minimo ${lato}×${lato} modulo ${q}: ${k}`);
    const prova = s.slice(); x.forEach((v, i) => v && tocca(prova, lato, i, q, v));
    assert.ok(prova.every((v) => !v), 'la soluzione spegne tutto');
  }
  // il 4×4 a due stati non è invertibile: alcuni schemi non hanno soluzione
  if (lato === 4 && q === 2) assert.ok(migliore.size < 2 ** N);
}
// ---- schemi nuovi: risolvibili e nella fascia del livello ----
for (const lato of LATI) for (const q of [2, 3]) for (const liv of Object.keys(TOCCHI)) {
  for (let k = 0; k < 6; k++) {
    const sc = nuovoSchema(lato, q, liv);
    assert.ok(sc.minimo >= fascia(lato, q, liv)[0] && sc.minimo <= fascia(lato, q, liv)[1], `${lato} ${q} ${liv}: ${sc.minimo}`);
    assert.strictEqual(peso(risolvi(sc.stato, lato, q)), sc.minimo);
  }
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { lato: 5, modo: 'due', difficolta: 'facile' }, bot: [null] });
  const t = g.tavole[0];
  assert.ok(g.azione(0, { tipo: 'tocca', i: 99 }).errore);
  assert.ok(g.azione(0, { tipo: 'ricomincia' }).errore, 'già all\'inizio');
  const prima = t.stato.slice();
  g.azione(0, { tipo: 'tocca', i: 7 });
  assert.notDeepStrictEqual(t.stato, prima);
  g.azione(0, { tipo: 'annulla' });
  assert.deepStrictEqual(t.stato, prima, 'annulla rimette le luci');
  assert.strictEqual(t.mosse, 2, 'anche annullare conta');
  g.azione(0, { tipo: 'aiuto' });
  assert.ok(t.suggerimento != null && t.penale === 15000);
  g.azione(0, { tipo: 'ricomincia' });
  const x = risolvi(t.stato, 5, 2);
  x.forEach((v, i) => { if (v) g.azione(0, { tipo: 'tocca', i }); });
  assert.ok(g.finita && /il minimo/.test(g.risultato.titolo), 'medaglia col minimo');
  assert.ok(g.risultato.fazioni[0].punti >= 15, 'il tempo comprende la penalità dell\'aiuto');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const tocchi = { facile: 0, medio: 0, difficile: 0 }, primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 150;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { lato: LATI[k % 3], modo: k % 2 ? 'tre' : 'due', difficolta: ['facile', 'medio', 'difficile'][k % 3] }, bot: liv });
    const iniz = g.tavole[0].stato.slice();
    assert.ok(g.tavole.every((t) => t.stato.join() === iniz.join()), 'stesso schema per tutti');
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    liv.forEach((l, i) => { tocchi[l] += g.tavole[i].mosse; });
    primi[liv[g.risultato.vincitori[0]]]++;
    if (g.tavole[2].fatto != null) assert.strictEqual(g.tavole[2].mosse, g.minimo, 'il difficile usa il minimo');
  }
  assert.ok(tocchi.facile > tocchi.medio && tocchi.medio > tocchi.difficile);
  console.log(`✓ Luci spente: tocco a croce, minimo esatto (controllato con la ricerca completa), schemi per livello, annulla, aiuto, medaglia; ${N} sfide tra computer: tocchi f/m/d ${tocchi.facile}/${tocchi.medio}/${tocchi.difficile} (${Date.now() - t0} ms)`);
}
