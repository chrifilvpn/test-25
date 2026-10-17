// Affari in città: tabellone, affitti, case pari, ipoteche, prigione, carte, aste, scambi, bancarotta e partite tra computer
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/affari');
const { CASELLE, DEL_GRUPPO } = M._test;

assert.strictEqual(CASELLE.length, 40);
assert.strictEqual(Object.keys(DEL_GRUPPO).length, 8);
assert.strictEqual(CASELLE.filter((c) => c.tipo === 'stazione').length, 4);
// ---- comprare, affitto, monopolio e case ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.tira(0, [1, 2]); // arriva su Potenza (3)
  assert.strictEqual(g.fase, 'compra');
  assert.ok(g.azione(1, { tipo: 'compra' }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'compra' }).ok);
  assert.strictEqual(g.padrone[3], 0); assert.strictEqual(g.soldi[0], 1440);
  assert.strictEqual(g.fase, 'fine');
  assert.ok(g.azione(0, { tipo: 'costruisci', casella: 3 }).errore, 'senza tutto il gruppo non si costruisce');
  g.padrone[1] = 0;
  assert.ok(g.monopolio(3));
  assert.strictEqual(g.affitto(3, 7), 8, 'affitto doppio col gruppo completo');
  assert.ok(g.azione(0, { tipo: 'costruisci', casella: 3 }).ok);
  assert.ok(g.azione(0, { tipo: 'costruisci', casella: 3 }).errore, 'costruzione pari');
  assert.ok(g.azione(0, { tipo: 'costruisci', casella: 1 }).ok);
  assert.strictEqual(g.affitto(3, 7), 20);
  assert.ok(g.azione(0, { tipo: 'ipoteca', casella: 1 }).errore, 'prima si vendono le case');
  assert.ok(g.azione(0, { tipo: 'fine' }).ok);
  assert.strictEqual(g.turno, 1);
  // il posto 1 arriva su Potenza: paga 20
  g.pos[1] = 0;
  const prima = g.soldi[1];
  g.tira(1, [1, 2]);
  assert.strictEqual(g.soldi[1], prima - 20);
  assert.strictEqual(g.fase, 'fine');
}
// ---- doppi, tre doppi in prigione, uscita ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.padrone.fill(1); g.padrone[0] = null; // niente da comprare
  g.tira(0, [2, 2]); assert.strictEqual(g.fase, 'tira', 'col doppio si ritira');
  g.tira(0, [3, 3]); assert.strictEqual(g.fase, 'tira');
  g.tira(0, [1, 1]);
  assert.strictEqual(g.pos[0], 10); assert.strictEqual(g.inPrigione[0], 0, 'tre doppi: prigione');
  g.azione(0, { tipo: 'fine' });
  g.iniziaTurno(0);
  assert.ok(g.azione(0, { tipo: 'pagaPrigione' }).ok);
  assert.strictEqual(g.inPrigione[0], -1);
}
// ---- asta ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  g.tira(0, [2, 3]); // Stazione Nord
  assert.ok(g.azione(0, { tipo: 'asta' }).ok);
  assert.strictEqual(g.turno, 1);
  assert.ok(g.azione(1, { tipo: 'offri', importo: 50 }).ok);
  assert.ok(g.azione(2, { tipo: 'offri', importo: 40 }).errore, 'offerta troppo bassa');
  assert.ok(g.azione(2, { tipo: 'passa' }).ok);
  assert.ok(g.azione(0, { tipo: 'offri', importo: 60 }).ok);
  assert.ok(g.azione(1, { tipo: 'passa' }).ok);
  assert.strictEqual(g.padrone[5], 0); assert.strictEqual(g.soldi[0], 1440);
  assert.strictEqual(g.turno, 0);
}
// ---- scambio ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.padrone[1] = 0; g.padrone[3] = 1;
  assert.ok(g.azione(0, { tipo: 'proponi', a: 1, dai: { soldi: 100, caselle: [] }, chiedi: { caselle: [1] } }).errore, 'non si chiede ciò che è proprio');
  assert.ok(g.azione(0, { tipo: 'proponi', a: 1, dai: { soldi: 100, caselle: [] }, chiedi: { caselle: [3] } }).ok);
  assert.strictEqual(g.turno, 1);
  assert.ok(g.azione(1, { tipo: 'accetta' }).ok);
  assert.strictEqual(g.padrone[3], 0); assert.strictEqual(g.soldi[1], 1600); assert.strictEqual(g.turno, 0);
}
// ---- bancarotta ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: { giri: 0 } });
  g.padrone[39] = 1; g.case[39] = 5; g.padrone[37] = 1; g.case[37] = 5;
  g.soldi[0] = 100; g.padrone[1] = 0;
  g.pos[0] = 34;
  g.tira(0, [2, 3]); // Milano con l'albergo: 2000
  assert.ok(!g.vivo[0], 'bancarotta');
  assert.strictEqual(g.padrone[1], 1, 'le proprietà vanno al creditore');
  assert.strictEqual(g.turno, 1, 'tocca al prossimo');
  assert.strictEqual(g.fase, 'tira');
}
console.log('✓ Affari in città: compravendita, affitti doppi e con case, costruzione pari, doppi e prigione, aste, scambi, bancarotta');

// ---- partite tra computer ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 }, giocate = { facile: 0, medio: 0, difficile: 0 };
  const N = process.env.TEST_VELOCE ? 300 : 600;
  for (let k = 0; k < N; k++) {
    const n = 2 + (k % 5);
    const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
    const g = M.crea({ n, primo: k % n, opzioni: { giri: [40, 25, 0][k % 3], parcheggio: k % 4 === 0 } });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 60000, 'la partita finisce');
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      assert.ok(r.ok, `mossa rifiutata (${liv[t]}, ${g.fase}): ${r.errore}`);
      assert.ok(g.soldi.every((x) => x >= 0), 'mai soldi negativi');
      const b = g.casePrese();
      assert.ok(b.case <= 32 && b.alberghi <= 12, 'case e alberghi della banca');
    }
    for (const v of g.risultato.vincitori) vinte[liv[v]]++;
    for (const l of liv) giocate[l]++;
  }
  const q = (l) => (vinte[l] / giocate[l] * 100).toFixed(0);
  console.log(`✓ Affari in città: ${N} partite tra computer da 2 a 6 (vittorie: facile ${q('facile')}%, medio ${q('medio')}%, difficile ${q('difficile')}%) in ${Date.now() - t0} ms`);
  assert.ok(vinte.difficile / giocate.difficile > vinte.medio / giocate.medio && vinte.medio / giocate.medio > vinte.facile / giocate.facile, 'difficile > medio > facile');
}
