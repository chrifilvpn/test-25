// Backgammon: mosse legali (barra, punte chiuse, uscita, obbligo dei due dadi e del più alto), doppi, colpi,
// gammon e backgammon, cubo con Crawford e partite tra computer
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/backgammon');
const { iniziale, sequenze, passoLegale, pip, colpibili } = M._test;
const vuoto = () => new Array(26).fill(0);

assert.strictEqual(pip(iniziale()), 167, 'pip iniziale 167');
assert.strictEqual(iniziale().reduce((s, x) => s + x, 0), 15);
// ---- passi ----
{
  const mie = vuoto(), sue = vuoto();
  mie[13] = 1; mie[25] = 1; sue[22] = 2; // la mia punta 3 è chiusa (25 - 22)
  assert.strictEqual(passoLegale(mie, sue, 13, 2), -1, 'con una pedina sulla barra si rientra prima');
  assert.strictEqual(passoLegale(mie, sue, 25, 3), 22, 'rientro col 3 sulla punta 22');
  sue[3] = 2; // la mia punta 22 è chiusa
  assert.strictEqual(passoLegale(mie, sue, 25, 3), -1, 'punta chiusa');
}
{
  const mie = vuoto(), sue = vuoto();
  mie[5] = 2; mie[3] = 1; mie[8] = 0;
  assert.strictEqual(passoLegale(mie, sue, 5, 5), 0, 'esce col numero giusto');
  assert.strictEqual(passoLegale(mie, sue, 3, 6), -1, 'col 6 esce solo la più lontana');
  assert.strictEqual(passoLegale(mie, sue, 5, 6), 0, 'col 6 esce la pedina più lontana');
  mie[7] = 1;
  assert.strictEqual(passoLegale(mie, sue, 5, 5), -1, 'non si esce con pedine fuori casa');
}
// ---- obbligo di usare tutti e due i dadi / il più alto ----
{
  // una sola pedina sulla 10; la punta 4 (10-6) è chiusa, la 5 (10-5) libera, poi 5-6 = -1 (fuori non si può)
  const mie = vuoto(), sue = vuoto();
  mie[10] = 1; mie[24] = 14; sue[25 - 4] = 2; sue[25 - 9] = 2; sue[25 - 18] = 2;
  const s = sequenze(mie, sue, [6, 5]);
  assert.ok(s.every((x) => x.passi.length === 2), 'si usano tutti e due i dadi quando si può');
}
{
  // si può usare un dado solo: deve essere il più alto
  const mie = vuoto(), sue = vuoto();
  mie[8] = 1; sue[25 - 2] = 2; sue[25 - 3] = 2; sue[25 - 7] = 2; sue[25 - 1] = 2; // 8-6=2 chiusa, 8-5=3 chiusa…
  mie[20] = 14; sue[25 - 14] = 2; sue[25 - 15] = 2; sue[25 - 9] = 2; // blocca anche le pedine sulla 20
  const s = sequenze(mie, sue, [6, 1]);
  assert.ok(s.length > 0);
  for (const x of s) if (x.passi.length === 1) assert.strictEqual(x.passi[0].d, 6, 'si usa il dado più alto');
}
// ---- doppi: quattro passi ----
{
  const s = sequenze(iniziale(), iniziale(), [3, 3]);
  assert.ok(s.every((x) => x.passi.length === 4));
}
// ---- colpo ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { punti: 1, cubo: false } });
  g.t = [vuoto(), vuoto()];
  g.t[0][13] = 15; g.t[1][25 - 10] = 1; g.t[1][1] = 14; // pedina sola avversaria sulla mia punta 10
  g.turno = 0; g.fase = 'tira'; g.inAttesa = false;
  g.iniziaTurno([3, 1]);
  assert.ok(g.azione(0, { tipo: 'passo', da: 13, a: 10 }).ok);
  assert.strictEqual(g.t[1][25], 1, 'la pedina colpita va sulla barra');
  assert.ok(g.azione(0, { tipo: 'conferma' }).errore, 'resta un dado da usare');
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.strictEqual(g.t[1][25], 0, 'annullando il colpo la pedina torna');
  assert.ok(g.azione(0, { tipo: 'passo', da: 13, a: 2 }).errore, 'mossa impossibile');
  assert.ok(g.azione(1, { tipo: 'tira' }).errore, 'non è il suo turno');
}
// ---- gammon e backgammon ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { punti: 7, cubo: true } });
  g.t = [vuoto(), vuoto()];
  g.t[0][0] = 14; g.t[0][1] = 1; g.t[1][25 - 3] = 15; // avversario tutto nella mia casa, nessuna fuori
  g.turno = 0; g.iniziaTurno([2, 1]);
  const r = g.azione(0, { tipo: 'gioca', passi: [{ da: 1, a: 0 }] });
  assert.ok(r.ok, r.errore);
  assert.strictEqual(g.punti[0], 3, 'backgammon: 3 punti');
  const h = M.crea({ n: 2, primo: 0, opzioni: { punti: 7 } });
  h.t = [vuoto(), vuoto()];
  h.t[0][0] = 14; h.t[0][2] = 1; h.t[1][10] = 15; h.cubo = 2;
  h.turno = 0; h.iniziaTurno([2, 1]);
  assert.ok(h.azione(0, { tipo: 'gioca', passi: [{ da: 2, a: 0 }] }).errore, 'si devono usare tutti e due i dadi: 2-1 e 1-fuori');
  assert.ok(h.azione(0, { tipo: 'gioca', passi: [{ da: 2, a: 1 }, { da: 1, a: 0 }] }).ok);
  assert.strictEqual(h.punti[0], 4, 'gammon col cubo a 2: 4 punti');
}
// ---- cubo e Crawford ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { punti: 5, cubo: true } });
  g.inAttesa = false; g.fase = 'tira'; g.turno = 0; g.passi = [];
  assert.ok(g.azione(0, { tipo: 'raddoppia' }).ok);
  assert.strictEqual(g.turno, 1, 'risponde l\'avversario');
  assert.ok(g.azione(0, { tipo: 'tira' }).errore);
  assert.ok(g.azione(1, { tipo: 'accetta' }).ok);
  assert.ok(g.cubo === 2 && g.padroneCubo === 1 && g.turno === 0);
  assert.ok(g.azione(0, { tipo: 'raddoppia' }).errore, 'il cubo è dell\'altro');
  assert.ok(g.azione(0, { tipo: 'tira' }).ok);
  // rifiuto
  const h = M.crea({ n: 2, primo: 0, opzioni: { punti: 5, cubo: true } });
  h.inAttesa = false; h.fase = 'tira'; h.turno = 1; h.passi = [];
  h.azione(1, { tipo: 'raddoppia' });
  assert.ok(h.azione(0, { tipo: 'rifiuta' }).ok);
  assert.deepStrictEqual(h.punti, [0, 1], 'chi rifiuta perde la posta attuale');
  // Crawford
  const c = M.crea({ n: 2, primo: 0, opzioni: { punti: 3, cubo: true } });
  c.punti = [2, 0]; c.nuovaPartita();
  assert.ok(c.crawford, 'partita Crawford');
  c.fase = 'tira'; c.inAttesa = false;
  assert.ok(!c.puoRaddoppiare(c.turno));
  c.nuovaPartita();
  assert.ok(!c.crawford, 'solo una partita Crawford');
}
// ---- colpi possibili ----
{
  const mie = vuoto(), sue = vuoto();
  mie[20] = 1; sue[25 - 14] = 1; // a 6 punti di distanza: 17 tiri su 36 (diretti e combinati)
  mie[1] = 14;
  assert.ok(Math.abs(colpibili(mie, sue) - 17 / 36) < 1e-9, `colpi a distanza 6: ${colpibili(mie, sue) * 36}`);
}
console.log('✓ Backgammon: barra e rientro, punte chiuse, uscita, obbligo dei due dadi e del più alto, doppi, colpi, gammon e backgammon, cubo con rifiuto e Crawford, conteggio dei colpi');

// ---- partite tra computer ----
{
  const sfide = { 'difficile-medio': [0, 0], 'medio-facile': [0, 0] };
  const N = process.env.TEST_VELOCE ? 160 : 400;
  const t0 = Date.now();
  let partite = 0;
  for (let k = 0; k < N; k++) {
    const coppia = k % 2 ? ['difficile', 'medio'] : ['medio', 'facile'];
    const liv = k % 4 < 2 ? coppia : [coppia[1], coppia[0]];
    const g = M.crea({ n: 2, primo: k % 2, opzioni: { punti: k % 3 === 0 ? 3 : 1, cubo: k % 3 !== 2 } });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 20000, 'la sfida finisce');
      if (g.inAttesa) { g.avanza(); continue; }
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      assert.ok(r.ok, `mossa rifiutata (${liv[t]}, ${g.fase}): ${r.errore}`);
      const tot = (x) => x.reduce((s, y) => s + y, 0);
      assert.ok(tot(g.t[0]) === 15 && tot(g.t[1]) === 15, 'sempre 15 pedine a testa');
      for (let i = 1; i <= 24; i++) assert.ok(!(g.t[0][i] > 0 && g.t[1][25 - i] > 0), 'mai pedine dei due colori sulla stessa punta');
    }
    partite += g.nPartita;
    const v = g.risultato.vincitori[0];
    const ch = `${liv[0]}-${liv[1]}`, rv = `${liv[1]}-${liv[0]}`;
    if (sfide[ch]) sfide[ch][v === 0 ? 0 : 1]++; else sfide[rv][v === 1 ? 0 : 1]++;
  }
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  console.log(`✓ Backgammon: ${N} sfide tra computer (${partite} partite), difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2} (${Date.now() - t0} ms)`);
  assert.ok(dv > mv, 'il difficile batte il medio');
  assert.ok(m2 > f2 * 1.5, 'il medio batte nettamente il facile');
}
