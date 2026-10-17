// GABBIE ARITMETICHE: schemi generati con una sola soluzione e del livello chiesto, mosse (cifre, appunti, annulla,
// aiuto), fine da soli, sfida tra computer (classifica e tempi per livello).
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/kenken');
const { genera, prepara, contaSoluzioni, LATI, LIVELLI } = M._test;

// ---- generatore: una sola soluzione, gabbie giuste ----
{
  const t0 = Date.now();
  let n = 0;
  for (const N of LATI) for (const liv of LIVELLI) for (let k = 0; k < 4; k++) {
    const s = genera(N, liv, k % 2 ? 'piu-meno' : 'tutte');
    assert.ok(s, `schema ${N} ${liv}`);
    const sol = s.soluzione;
    for (let r = 0; r < N; r++) { assert.strictEqual(new Set(sol.slice(r * N, r * N + N)).size, N, 'riga senza doppioni'); assert.strictEqual(new Set(Array.from({ length: N }, (_, c) => sol[c * N + r])).size, N, 'colonna senza doppioni'); }
    const coperte = new Set();
    for (const g of s.gabbie) {
      const v = g.celle.map((i) => sol[i]);
      g.celle.forEach((i) => { assert.ok(!coperte.has(i), 'gabbie che non si sovrappongono'); coperte.add(i); });
      if (k % 2) assert.ok(!['×', '÷', '*', '/', 'x'].includes(g.op), 'solo + e −');
      const ris = g.op === '+' ? v.reduce((a, b) => a + b) : g.op === '×' || g.op === '*' ? v.reduce((a, b) => a * b) : g.op === '−' || g.op === '-' ? Math.max(...v) - Math.min(...v) : g.op === '÷' || g.op === '/' ? Math.max(...v) / Math.min(...v) : v[0];
      assert.strictEqual(ris, g.tot, `gabbia ${g.op} ${g.tot}`);
    }
    assert.strictEqual(coperte.size, N * N);
    const c = contaSoluzioni(prepara(N, s.gabbie), 2, 200000);
    assert.strictEqual(c.soluzioni !== undefined ? c.soluzioni : c, 1, 'una sola soluzione');
    n++;
  }
  console.log(`✓ Gabbie aritmetiche: ${n} schemi generati (4×4…7×7, tre livelli), tutti con una sola soluzione (${Date.now() - t0} ms)`);
}
// ---- mosse da soli ----
{
  const g = M.crea({ n: 1, opzioni: { lato: 4, difficolta: 'facile' }, bot: [null] });
  const N = 4, sol = g.soluzione;
  assert.ok(g.azione(0, { tipo: 'metti', i: 0, v: 9 }).errore, 'cifra fuori misura');
  const sbagliata = sol[0] === 1 ? 2 : 1;
  assert.ok(g.azione(0, { tipo: 'metti', i: 0, v: sbagliata }).ok);
  assert.ok(g.azione(0, { tipo: 'nota', i: 1, v: 3 }).ok);
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.strictEqual(g.tavole[0].note[1], 0, 'annullato l\'appunto');
  assert.ok(g.azione(0, { tipo: 'aiuto' }).ok);
  assert.strictEqual(g.tavole[0].valori[0], sol[0], "l'aiuto corregge prima lo sbaglio");
  assert.strictEqual(g.tavole[0].penale, 30000);
  for (let i = 0; i < N * N; i++) if (g.tavole[0].valori[i] !== sol[i]) g.azione(0, { tipo: 'metti', i, v: sol[i] });
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'schema completato');
  assert.ok(g.vista(0).soluzione, 'a fine partita si vede la soluzione');
}
// ---- sfida tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 30;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { lato: LATI[k % 4], difficolta: LIVELLI[k % 3] }, bot: liv });
    // tempi simulati: i computer muovono quando tocca a loro, in ordine di orario
    let giri = 0;
    while (!g.finita && giri++ < 5000) {
      const prossimo = Math.min(...g.prossimaBot.filter((x, i) => x != null && g.tavole[i].fatto == null));
      g.prossimaBot = g.prossimaBot.map((x) => (x === prossimo ? 0 : x));
      g.controllaTempo();
    }
    assert.ok(g.finita, 'la sfida finisce');
    for (let p = 0; p < 3; p++) if (g.tavole[p].fatto != null) assert.ok(g.risolta(p, g.tavole[p]));
    primi[liv[g.risultato.vincitori[0]]]++;
    assert.strictEqual(g.risultato.fazioni[g.risultato.vincitori[0]].punti, 10);
  }
  console.log(`✓ Gabbie aritmetiche: ${N} sfide tra computer completate (vinte f/m/d ${primi.facile}/${primi.medio}/${primi.difficile}) (${Date.now() - t0} ms)`);
}
