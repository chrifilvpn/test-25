// Asso pigliatutto: prese (asso piglia tutto, asso su asso), napola, conteggio, e partite tra computer in 2, 3 e 4
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/assopiglia');
const { presePossibili, napola, contaSmazzata, mazzo40 } = M._test;
const C = (id) => ({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
const Cs = (s) => s.split(' ').map(C);
const ids = (x) => JSON.stringify(x.map((o) => [...o].sort()).sort());

// ---- prese ----
assert.strictEqual(ids(presePossibili(C('1c'), Cs('7d 3s 10b'))), ids([['7d', '3s', '10b']]), 'l\'asso prende tutto');
assert.strictEqual(ids(presePossibili(C('1c'), Cs('7d 1s 10b'))), ids([['1s']]), 'asso su asso: solo l\'asso');
assert.strictEqual(ids(presePossibili(C('1c'), Cs('7d 1s 10b'), 'tutto')), ids([['7d', '1s', '10b']]), 'asso su asso: tutto');
assert.deepStrictEqual(presePossibili(C('1c'), []), [], 'su tavola vuota l\'asso resta giù');
assert.strictEqual(ids(presePossibili(C('7c'), Cs('7d 3s 4b'))), ids([['7d']]), 'la carta uguale è obbligatoria');
assert.strictEqual(ids(presePossibili(C('10c'), Cs('6d 4s 3b 1c'))), ids([['6d', '4s'], ['6d', '3b', '1c']]), 'somme');
assert.strictEqual(presePossibili(C('9c'), Cs('2d 3s')).length, 0);
assert.strictEqual(mazzo40().length, 40);
// ---- napola ----
assert.strictEqual(napola(Cs('1d 2d 3d 5d')), 3);
assert.strictEqual(napola(Cs('1d 2d 3d 4d 5d 7d')), 5);
assert.strictEqual(napola(Cs('1d 2d 4d')), 0);
assert.strictEqual(napola(mazzo40().filter((c) => c.seme === 'd')), 10);
// ---- conteggio ----
{
  const r = contaSmazzata([Cs('7d 7c 7s 7b 1d 2d 3d'), Cs('6c 6s 6b')], [1, 0], true);
  assert.strictEqual(r[0].primiera, 84);
  assert.strictEqual(r[1].primiera, 0, 'senza un seme niente primiera');
  assert.ok(r[0].settebello && r[0].denari === 4 && r[0].napola === 3);
}

// ---- una presa con l'asso: niente scopa (salvo opzione) ----
for (const scopaAsso of [false, true]) {
  const g = M.crea({ n: 2, primo: 0, opzioni: { scopaAsso } });
  g.tavolo = Cs('5d 3c'); g.mani = [Cs('1s 9b 8c'), Cs('2s 4b 6c')]; g.turno = 0; g.mazzo = mazzo40().filter((c) => !['5d', '3c', '1s', '9b', '8c', '2s', '4b', '6c'].includes(c.id)).slice(0, 10);
  assert.ok(g.azione(1, { tipo: 'gioca', carta: '2s' }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'gioca', carta: '7d' }).errore, 'carta non sua');
  assert.ok(g.azione(0, { tipo: 'gioca', carta: '1s', presa: ['5d'] }).errore, 'presa non valida');
  assert.ok(g.azione(0, { tipo: 'gioca', carta: '1s' }).ok);
  g.avanza();
  assert.strictEqual(g.tavolo.length, 0);
  assert.strictEqual(g.scope[0], scopaAsso ? 1 : 0, 'pigliatutto con l\'asso e scopa');
  assert.strictEqual(g.prese[0].length, 3);
}
// ---- vista: niente carte degli altri ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  const v = g.vista(1);
  assert.strictEqual(v.mano.length, 3);
  const testo = JSON.stringify(v);
  for (const c of [...g.mani[0], ...g.mani[2], ...g.mazzo]) assert.ok(!testo.includes(`"${c.id}"`), 'la vista non mostra le carte degli altri né il mazzo');
  assert.deepStrictEqual(v.carteInMano, [3, 3, 3]);
  assert.ok(!('mani' in v) && !('mazzoCarte' in v));
  assert.ok(!g.tavolo.some((c) => c.rango === 1), 'niente assi in tavola all\'inizio');
}
console.log('✓ Asso pigliatutto: l\'asso prende tutto, asso su asso, napola, primiera, scopa con l\'asso solo se scelta');

// ---- partite complete tra computer ----
{
  const LIV = ['facile', 'medio', 'difficile'];
  const quante = process.env.TEST_VELOCE ? { 2: 400, 3: 150, 4: 150 } : { 2: 800, 3: 300, 4: 300 };
  const t0 = Date.now();
  const sfide = { 'difficile-medio': [0, 0], 'medio-facile': [0, 0] };
  for (const n of [2, 3, 4]) {
    for (let k = 0; k < quante[n]; k++) {
      const opzioni = { punti: [11, 21][k % 2], assoSuAsso: k % 3 ? 'solo' : 'tutto', scopaAsso: k % 4 === 0, napola: k % 5 !== 0 };
      let liv;
      if (n === 2) { const a = k % 2 ? 'difficile' : 'medio', b = k % 4 < 2 ? 'medio' : 'facile'; liv = a === b ? ['difficile', 'medio'] : [a, b]; if (k % 2 === 0 && k % 8 >= 4) liv.reverse(); }
      else liv = Array.from({ length: n }, (_, i) => LIV[(i + k) % 3]);
      if (n === 4) liv = [LIV[k % 3], LIV[(k + 1) % 3], LIV[k % 3], LIV[(k + 1) % 3]];
      const g = M.crea({ n, primo: k % n, opzioni, bot: liv });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 20000, 'la partita finisce');
        if (g.inAttesa) { g.avanza(); continue; }
        const t = g.turno;
        const r = g.azione(t, M.bot(g, t, liv[t]));
        assert.ok(r.ok, `mossa rifiutata: ${r.errore}`);
        if (g.fase === 'gioco') {
          const tot = g.mazzo.length + g.mani.flat().length + g.prese.flat().length + g.tavolo.length + (g.inCorso ? 1 : 0);
          assert.strictEqual(tot, 40, 'nessuna carta persa');
        }
      }
      const f = g.risultato.fazioni;
      assert.ok(g.risultato.vincitori.length >= 1);
      if (n === 2) {
        const chiave = `${liv[0]}-${liv[1]}`, rov = `${liv[1]}-${liv[0]}`, v = g.risultato.vincitori[0];
        if (sfide[chiave]) sfide[chiave][v === 0 ? 0 : 1]++;
        else if (sfide[rov]) sfide[rov][v === 1 ? 0 : 1]++;
      }
      assert.ok(f.every((x) => x.punti >= 0));
    }
  }
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  console.log(`✓ Asso pigliatutto: ${quante[2] + quante[3] + quante[4]} partite tra computer in 2, 3 e 4 senza carte perse (difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2}, ${Date.now() - t0} ms)`);
  assert.ok(dv > mv, 'il difficile batte il medio');
  assert.ok(m2 > f2, 'il medio batte il facile');
}
