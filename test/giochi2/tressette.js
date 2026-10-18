// Tressette: regole (presa, obbligo di rispondere, terzi, accusi, pescata in due) e partite complete tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const M = require('../../giochi2/tressette');
const { vincitoreDi, valide, accusiDi, terzi, scriviTerzi } = M._test;
const C = (id) => ({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
const LIVELLI = ['facile', 'medio', 'difficile'];

// ---- regole di base ----
// prende la più forte del seme uscito: 3 > 2 > asso > re > cavallo > fante > 7 … 4; gli altri semi non prendono
assert.strictEqual(vincitoreDi([{ posto: 0, carta: C('4c') }, { posto: 1, carta: C('3p') }]), 0, 'un altro seme non prende');
assert.strictEqual(vincitoreDi([{ posto: 0, carta: C('1c') }, { posto: 1, carta: C('2c') }]), 1, 'il 2 batte l\'asso');
assert.strictEqual(vincitoreDi([{ posto: 0, carta: C('13c') }, { posto: 1, carta: C('1c') }, { posto: 2, carta: C('3c') }, { posto: 3, carta: C('2c') }]), 2, 'il 3 è il più forte');
assert.strictEqual(vincitoreDi([{ posto: 0, carta: C('7q') }, { posto: 1, carta: C('11q') }]), 1, 'il fante batte il 7');
// obbligo di rispondere al seme
const mano = [C('4c'), C('7p'), C('1p')];
assert.deepStrictEqual(valide(mano, [{ posto: 0, carta: C('3p') }]).map((c) => c.id), ['7p', '1p'], 'si risponde a picche');
assert.strictEqual(valide(mano, [{ posto: 0, carta: C('3q') }]).length, 3, 'senza quadri si gioca quello che si vuole');
// terzi: 32 nel mazzo (+3 l'ultima presa = 35, cioè 11 punti con i terzi persi)
assert.strictEqual(require('../../giochi/carte').mazzo40().reduce((s, c) => s + terzi(c), 0), 32);
assert.strictEqual(scriviTerzi(8), '2 ⅔');
assert.strictEqual(scriviTerzi(1), '⅓');
// accusi
assert.deepStrictEqual(accusiDi([C('1c'), C('2c'), C('3c'), C('5p')]).map((a) => [a.tipo, a.punti]), [['napoletana', 3]]);
assert.deepStrictEqual(accusiDi([C('1c'), C('1q'), C('1f'), C('1p'), C('2c'), C('3c')]).map((a) => [a.tipo, a.punti]), [['napoletana', 3], ['gruppo', 4]]);
assert.deepStrictEqual(accusiDi([C('3c'), C('3q'), C('3f'), C('2p')]).map((a) => [a.tipo, a.punti]), [['gruppo', 3]]);
assert.strictEqual(accusiDi([C('1c'), C('2c'), C('3q')]).length, 0);

// ---- l'azione rifiuta le mosse sbagliate ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.mani[0] = [C('4c'), C('5c'), C('6c'), C('7c'), C('4q'), C('5q'), C('6q'), C('7q'), C('4f'), C('5f')];
  g.mani[1] = [C('1c'), C('1q'), C('1f'), C('1p'), C('2c'), C('2q'), C('2f'), C('2p'), C('3c'), C('6p')];
  // il mazzo: le carte che non sono nelle mani scelte qui (sennò si potrebbe pescare un doppione)
  const inMano = new Set([...g.mani[0], ...g.mani[1]].map((c) => c.id));
  g.mazzo = require('../../giochi/carte').mazzo40().filter((c) => !inMano.has(c.id));
  g.accusiMano = g.mani.map(accusiDi);
  g.turno = 0;
  assert.ok(g.azione(1, { tipo: 'gioca', carta: '1c' }).errore, 'fuori turno');
  assert.ok(g.azione(0, { tipo: 'gioca', carta: '1c' }).errore, 'carta non sua');
  assert.ok(g.azione(0, { tipo: 'gioca' }).errore, 'senza carta');
  assert.ok(g.azione(0, null).errore, 'azione vuota');
  assert.ok(!g.azione(0, { tipo: 'gioca', carta: '4c' }).errore);
  assert.ok(g.azione(1, { tipo: 'gioca', carta: '6p' }).errore, 'deve rispondere a cuori');
  assert.ok(!g.azione(1, { tipo: 'gioca', carta: '2c' }).errore);
  assert.deepStrictEqual(g.accusati.map((a) => [a.posto, a.tipo, a.punti]), [[1, 'napoletana', 3], [1, 'gruppo', 4], [1, 'gruppo', 4]], 'accusa alla prima carta: napoletana, quattro assi, quattro due');
  assert.ok(g.inAttesa && g.vista(0).vince === 1);
  const mazzoPrima = g.mazzo.length;
  g.avanza();
  assert.strictEqual(g.turno, 1, 'apre chi ha preso');
  assert.strictEqual(g.mazzo.length, mazzoPrima - 2, 'in due si pesca');
  assert.deepStrictEqual(g.pescate.map((x) => x.posto), [1, 0], 'pesca prima chi ha preso');
  const v0 = g.vista(0);
  assert.ok(v0.pescate.every((x) => x.carta && x.carta.id), 'le carte pescate le vedono tutti');
  assert.ok(!('mani' in v0), 'niente mani degli altri nella vista');
  // la vista di 0 non contiene carte di 1 che non siano pubbliche (pescate o accusate)
  const pubbliche = new Set([...g.noti[1]]);
  const ids = new Set(); JSON.stringify(v0, (k, v) => { if (v && typeof v === 'object' && typeof v.id === 'string' && v.seme) ids.add(v.id); return v; });
  for (const c of g.mani[1]) assert.ok(!ids.has(c.id) || pubbliche.has(c.id), `la vista mostra ${c.id} di un altro`);
}
// accuso spento: niente accusi
{
  const g = M.crea({ n: 4, primo: 0, opzioni: { accuso: false } });
  g.mani[0] = [C('1c'), C('2c'), C('3c'), ...g.mani[0].filter((c) => !['1c', '2c', '3c'].includes(c.id)).slice(0, 7)];
  assert.ok(g.accusiMano.every((a) => a.length === 0), 'senza accuso non si accusa');
}

// ---- partite complete tra computer ----
for (const n of [2, 4]) {
  const N = 200;
  let smazzate = 0;
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const opzioni = { punti: [21, 31][k % 2], accuso: k % 3 !== 0 };
    const g = M.crea({ n, primo: k % n, opzioni });
    const livelli = Array.from({ length: n }, (_, i) => LIVELLI[(i + k) % 3]);
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 20000, 'la partita deve finire');
      if (g.inAttesa) {
        if (g.fase === 'riepilogo') {
          smazzate++;
          const r = g.riepilogo;
          assert.strictEqual(r.righe.reduce((s, x) => s + x.puntiCarte, 0), 11, 'ogni smazzata vale 11 punti (terzi persi)');
          assert.strictEqual(r.righe.reduce((s, x) => s + x.carte, 0), 40, 'tutte le carte prese');
          assert.strictEqual(r.righe.filter((x) => x.ultima).length, 1);
        }
        g.avanza();
        continue;
      }
      const t = g.turno;
      const a = M.bot(g, t, livelli[t]);
      const giusta = valide(g.mani[t], g.tavolo).map((c) => c.id);
      assert.ok(giusta.includes(a.carta), 'il computer risponde al seme');
      const r = g.azione(t, a);
      assert.ok(!r.errore, `mossa del computer rifiutata: ${r.errore}`);
      const tot = g.mani.flat().length + g.mazzo.length + g.prese.flat().length + g.tavolo.length;
      assert.strictEqual(tot, 40, 'nessuna carta persa');
      if (n === 4) assert.strictEqual(g.mazzo.length, 0, 'in quattro non si pesca');
    }
    const r = g.risultato;
    assert.ok(Math.max(...g.totali) >= g.obiettivo && g.totali[0] !== g.totali[1], 'si vince arrivando ai punti, senza pari');
    assert.deepStrictEqual(r.vincitori, n === 4 ? [g.totali.indexOf(Math.max(...g.totali)), g.totali.indexOf(Math.max(...g.totali)) + 2] : [g.totali.indexOf(Math.max(...g.totali))]);
  }
  console.log(`✓ Tressette in ${n}: ${N} partite tra computer (${smazzate} smazzate), sempre 11 punti a smazzata, nessuna mossa rifiutata (${Date.now() - t0} ms)`);
}

// ---- forza del computer ----
function sfida(n, a, b, N) {
  const vinte = { [a]: 0, [b]: 0 };
  for (let k = 0; k < N; k++) {
    const g = M.crea({ n, primo: k % n, opzioni: { punti: 21 } });
    const liv = Array.from({ length: n }, (_, i) => ((i + k) % 2 ? a : b));
    while (!g.finita) {
      if (g.inAttesa) { g.avanza(); continue; }
      g.azione(g.turno, M.bot(g, g.turno, liv[g.turno]));
    }
    vinte[liv[g.risultato.vincitori[0]]]++;
  }
  return vinte;
}
{
  const fm = sfida(2, 'facile', 'medio', 120);
  assert.ok(fm.medio > fm.facile, `il medio batte il facile (${fm.medio}/${fm.facile})`);
  const md = sfida(2, 'medio', 'difficile', 30);
  assert.ok(md.difficile >= 18, `il difficile batte il medio in due (${md.difficile}/${md.medio})`);
  const md4 = sfida(4, 'medio', 'difficile', 24);
  assert.ok(md4.difficile >= 14, `la coppia difficile batte la coppia media (${md4.difficile}/${md4.medio})`);
  console.log(`✓ Tressette: medio contro facile ${fm.medio}-${fm.facile}, difficile contro medio ${md.difficile}-${md.medio} in due e ${md4.difficile}-${md4.medio} a coppie`);
}
