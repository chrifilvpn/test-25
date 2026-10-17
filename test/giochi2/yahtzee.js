// Cinque dadi: punteggi delle 13 caselle, bonus della parte alta, jolly e bonus da 100, turni e partite tra computer
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/yahtzee');
const { punteggio: P, totale, ESITI } = M._test;

assert.strictEqual(P([1, 1, 3, 4, 1], 'uno'), 3);
assert.strictEqual(P([6, 6, 3, 4, 1], 'sei'), 12);
assert.strictEqual(P([3, 3, 3, 4, 1], 'tris'), 14);
assert.strictEqual(P([3, 3, 2, 4, 1], 'tris'), 0);
assert.strictEqual(P([5, 5, 5, 5, 2], 'poker'), 22);
assert.strictEqual(P([5, 5, 5, 2, 2], 'full'), 25);
assert.strictEqual(P([5, 5, 5, 5, 5], 'full'), 0, 'cinque uguali non è full (senza jolly)');
assert.strictEqual(P([5, 5, 5, 5, 5], 'full', true), 25, 'col jolly sì');
assert.strictEqual(P([1, 2, 3, 4, 6], 'scalaP'), 30);
assert.strictEqual(P([3, 4, 5, 6, 6], 'scalaP'), 30);
assert.strictEqual(P([1, 2, 3, 5, 6], 'scalaP'), 0);
assert.strictEqual(P([2, 3, 4, 5, 6], 'scalaG'), 40);
assert.strictEqual(P([1, 2, 3, 4, 6], 'scalaG'), 0);
assert.strictEqual(P([4, 4, 4, 4, 4], 'cinque5'), 50);
assert.strictEqual(P([4, 4, 2, 4, 4], 'somma'), 18);
{
  const s = { uno: 3, due: 6, tre: 9, quattro: 12, cinque: 15, sei: 18, tris: 0, poker: 0, full: 25, scalaP: 30, scalaG: 0, cinque5: 0, somma: 20 };
  assert.strictEqual(totale(s, 0), 63 + 35 + 75, 'bonus con 63');
  s.uno = 2;
  assert.strictEqual(totale(s, 100), 62 + 75 + 100);
}
for (let k = 0; k <= 5; k++) assert.ok(Math.abs(ESITI[k].reduce((t, o) => t + o.p, 0) - 1) < 1e-12, 'probabilità che sommano a 1');
assert.strictEqual(ESITI[5].length, 252);

// ---- partita: tre tiri, tenuti, segna, jolly ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  assert.ok(g.azione(0, { tipo: 'segna', cat: 'uno' }).errore, 'prima si tira');
  assert.ok(g.azione(1, { tipo: 'tira' }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'tira' }).ok);
  const tenuto = g.dadi[2];
  assert.ok(g.azione(0, { tipo: 'tira', tieni: [2] }).ok);
  assert.strictEqual(g.dadi[2], tenuto, 'il dado tenuto non cambia');
  assert.ok(g.azione(0, { tipo: 'tira', tieni: [9] }).errore);
  assert.ok(g.azione(0, { tipo: 'tira' }).ok);
  assert.ok(g.azione(0, { tipo: 'tira' }).errore, 'massimo tre tiri');
  assert.ok(g.azione(0, { tipo: 'segna', cat: 'boh' }).errore);
  assert.ok(g.azione(0, { tipo: 'segna', cat: 'somma' }).ok);
  assert.strictEqual(g.turno, 1);
  assert.strictEqual(g.schede[0].somma, g.ultima.punti);
  // jolly: cinque 3 con la casella 50 già piena → 100 di bonus, prima nella casella Tre
  g.schede[1].cinque5 = 50; g.turno = 1; g.tiri = 1; g.dadi = [3, 3, 3, 3, 3];
  assert.ok(g.azione(1, { tipo: 'segna', cat: 'full' }).errore, 'col jolly prima la casella alta del numero');
  assert.ok(g.azione(1, { tipo: 'segna', cat: 'tre' }).ok);
  assert.strictEqual(g.schede[1].tre, 15);
  assert.strictEqual(g.extra[1], 100);
  g.turno = 1; g.tiri = 1; g.dadi = [3, 3, 3, 3, 3];
  assert.deepStrictEqual(g.possibili(1).scalaG, 40, 'jolly: la scala grande vale 40');
}
console.log('✓ Cinque dadi: 13 caselle, bonus della parte alta, tre tiri con dadi tenuti, jolly e bonus da 100');

// ---- partite tra computer: punteggi medi da soli e sfide ----
{
  const t0 = Date.now();
  const media = {};
  const N = process.env.TEST_VELOCE ? 150 : 300;
  for (const liv of ['facile', 'medio', 'difficile']) {
    let tot = 0;
    for (let k = 0; k < N; k++) {
      const g = M.crea({ n: 1, primo: 0, opzioni: {} });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 100, 'la partita finisce');
        const r = g.azione(0, M.bot(g, 0, liv));
        assert.ok(r.ok, `mossa rifiutata (${liv}): ${r.errore}`);
      }
      assert.ok(Object.values(g.schede[0]).every((x) => x !== null), 'tutte le caselle piene');
      tot += g.risultato.fazioni[0].punti;
    }
    media[liv] = tot / N;
  }
  // partite a più giocatori
  for (const n of [2, 3, 6]) {
    for (let k = 0; k < 10; k++) {
      const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
      const g = M.crea({ n, primo: k % n, opzioni: {} });
      while (!g.finita) { const t = g.turno; const r = g.azione(t, M.bot(g, t, liv[t])); assert.ok(r.ok, r.errore); }
    }
  }
  console.log(`✓ Cinque dadi: ${N * 3} partite da soli (media facile ${media.facile.toFixed(0)}, medio ${media.medio.toFixed(0)}, difficile ${media.difficile.toFixed(0)}) e 30 a più giocatori in ${Date.now() - t0} ms`);
  assert.ok(media.difficile > media.medio + 8 && media.medio > media.facile + 20, 'difficile > medio > facile');
  assert.ok(media.difficile > 215, 'il difficile fa in media più di 215 punti');
}
