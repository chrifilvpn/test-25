// Poker Omaha: regola delle 2 + 3, valutazione veloce uguale a quella del motore, Pot Limit, ante e partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const M = require('../../giochi2/omaha');
const { valuta5, nomeMano } = require('../../giochi/poker-motore');
const { scarpa } = require('../../giochi/casino');
const { punti5, num, miglioreOmaha, equitaOmaha } = M._test;
const C = (id) => ({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
const Cs = (s) => s.split(' ').map(C);
const LIVELLI = ['facile', 'medio', 'difficile'];

// valutazione veloce = valuta5 del motore
for (let k = 0; k < 5000; k++) { const d = scarpa(1).slice(0, 5); assert.strictEqual(punti5(...d.map(num)), valuta5(d).punti); }
// 2 + 3: con quattro cuori in tavola e un cuore solo in mano non c'è colore
assert.notStrictEqual(miglioreOmaha(Cs('1c 13p 2f 3q'), Cs('5c 7c 9c 11c 4p')).cat, 5, 'niente colore con una carta sola del seme');
assert.strictEqual(miglioreOmaha(Cs('1c 13c 2f 3q'), Cs('5c 7c 9c 11p 4p')).cat, 5, 'colore con due carte in mano');
// poker d'assi in mano: solo una coppia
assert.strictEqual(nomeMano(miglioreOmaha(Cs('1c 1q 1f 1p'), Cs('2c 7q 9f 11p 4c'))), 'Coppia di assi');
// la scala in tavola non conta da sola
assert.strictEqual(miglioreOmaha(Cs('2c 2q 13f 13p'), Cs('5c 6q 7f 8p 9c')).cat, 1, 'scala in tavola: serve usarne solo 3');
// sempre esattamente 2 carte della mano
for (let k = 0; k < 300; k++) {
  const d = scarpa(1); const mano = d.slice(0, 4), tav = d.slice(4, 9);
  const r = miglioreOmaha(mano, tav);
  assert.strictEqual(r.carte.filter((c) => mano.includes(c)).length, 2);
}
// equità: AAKK dello stesso seme contro una mano a caso vince più di metà delle volte
process.env.TEST_VELOCE = '';
assert.ok(equitaOmaha(Cs('1c 1q 13c 13q'), [], 1, 1500) > 0.6, 'AAKK è forte');
process.env.TEST_VELOCE = '1';
console.log('✓ Poker Omaha: regola delle 2 + 3 e valutazione veloce');

// ---- ante e Pot Limit ----
{
  const g = M.crea({ n: 3, primo: 0, fiche: [1000, 1000, 1000], opzioni: { limite: 'pot', ante: 5 } });
  assert.strictEqual(g.piatto(), 15, 'ante da 5 a testa');
  assert.ok(g.carte.every((c) => c.length === 4), '4 carte a testa');
  const t = g.turno;
  const az = g.azioniPossibili(t);
  assert.strictEqual(az.punta.max, 15, 'pot limit: si apre al massimo col piatto');
  assert.ok(g.azione(t, { tipo: 'punta', fino: 20 }).errore, 'oltre il piatto no');
  assert.ok(g.azione(t, { tipo: 'punta', fino: 15 }).ok);
  const t2 = g.turno;
  // piatto 30, devo 15: rilancio massimo a 15 + 30 + 15 = 60
  assert.strictEqual(g.azioniPossibili(t2).punta.max, 60);
  const v = g.vista(t2);
  assert.ok(v.carte.every((cs, i) => i === t2 || cs.every((c) => c === null)), 'le carte degli altri non si vedono');
  const n = M.crea({ n: 2, primo: 0, fiche: [1000, 1000], opzioni: { limite: 'nolimit', ante: 0 } });
  assert.strictEqual(n.piatto(), 0);
  assert.strictEqual(n.azioniPossibili(n.turno).punta.max, 1000, 'no limit');
}

// ---- partite tra computer ----
for (const n of [2, 3, 4, 6, 8]) {
  const t0 = Date.now();
  let mani = 0, confronti = 0;
  const vinte = [0, 0, 0];
  for (let k = 0; k < (n <= 4 ? 40 : 20); k++) {
    const g = M.crea({ n, primo: k % n, fiche: new Array(n).fill(300), opzioni: { limite: k % 2 ? 'nolimit' : 'pot', ante: [5, 10, 0][k % 3] } });
    const livelli = Array.from({ length: n }, (_, i) => LIVELLI[(i + k) % 3]);
    const totale = () => g.fiche.reduce((a, b) => a + b, 0) + (g.fase !== 'fine' && g.contrib ? g.piatto() : 0);
    let passi = 0;
    while (mani < 1e9) {
      assert.ok(++passi < 5000, 'la mano deve finire');
      if (g.fase === 'attesa') break;
      if (g.inAttesa) {
        if (g.fase === 'fine') {
          mani++;
          if (g.mostrate) {
            confronti++;
            for (const [i, m] of Object.entries(g.mostrate)) assert.strictEqual(m.carte.filter((id) => g.carte[i].some((c) => c.id === id)).length, 2, 'al confronto 2 carte proprie');
          }
          assert.strictEqual(g.fiche.reduce((a, b) => a + b, 0), 300 * n, 'nessuna fiche persa');
          if (passi > 400) break;
        }
        g.avanza();
        continue;
      }
      const t = g.turno;
      const a = M.bot(g, t, livelli[t]);
      const r = g.azione(t, a);
      assert.ok(r.ok, `mossa del computer rifiutata: ${r.errore} ${JSON.stringify(a)}`);
      assert.strictEqual(totale(), 300 * n);
    }
    g.fiche.forEach((f, i) => { vinte[LIVELLI.indexOf(livelli[i])] += f - 300; });
  }
  console.log(`✓ Poker Omaha in ${n}: ${mani} mani tra computer (${confronti} al confronto), fiche guadagnate facile/medio/difficile ${vinte.join('/')} (${Date.now() - t0} ms)`);
}
