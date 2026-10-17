// Uomo nero: mazzo senza fante di fiori, coppie per valore e colore, pescata dal vicino, salvi, fine mano e partite
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/uomonero');
const { mazzo, togliCoppie, chiave, UOMO } = M._test;
const C = (id) => ({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
const Cs = (s) => s.split(' ').map(C);

assert.strictEqual(mazzo(false).length, 51);
assert.strictEqual(mazzo(true).length, 31);
assert.ok(!mazzo(false).some((c) => c.id === '11f') && mazzo(false).some((c) => c.id === UOMO));
// l'uomo nero è l'unica carta senza compagno
{
  const m = mazzo(false);
  const tolte = togliCoppie(m);
  assert.strictEqual(tolte.length, 25);
  assert.deepStrictEqual(m.map((c) => c.id), [UOMO]);
}
assert.strictEqual(chiave(C('7c')), chiave(C('7q')), '7 di cuori e 7 di quadri fanno coppia');
assert.notStrictEqual(chiave(C('7c')), chiave(C('7p')), '7 rosso e 7 nero no');
{
  const mano = Cs('7c 3f 7q 3p 9c 11p');
  const tolte = togliCoppie(mano);
  assert.strictEqual(tolte.length, 2);
  assert.deepStrictEqual(mano.map((c) => c.id), ['9c', '11p'], 'l\'ordine delle carte rimaste non cambia');
}

// ---- pescata, coppia, salvo, fine ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: { mani: 1 } });
  g.mani = [Cs('5c 9f'), Cs('5q 11p'), Cs('9p')];
  g.uscita = []; g.turno = 0; g.nPescate = 0;
  assert.ok(g.azione(1, { tipo: 'pesca', indice: 0 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'pesca', indice: 5 }).errore, 'carta che non c\'è');
  assert.ok(g.azione(0, { tipo: 'pesca', indice: 'a' }).errore);
  assert.ok(g.azione(0, { tipo: 'scambia', da: 0, a: 9 }).errore);
  assert.ok(g.azione(0, { tipo: 'pesca', indice: 0 }).ok, 'pesca il 5 di quadri dal posto 1');
  assert.deepStrictEqual(g.mani[0].map((c) => c.id), ['9f'], 'coppia di 5 rossi scartata');
  assert.strictEqual(g.turno, 1, 'tocca a quello da cui si è pescato');
  assert.ok(g.azione(1, { tipo: 'pesca', indice: 0 }).ok, 'il posto 1 pesca il 9 di picche dal 2');
  assert.ok(g.uscita.includes(2), 'il posto 2 non ha più carte: è salvo');
  assert.strictEqual(g.turno, 0, 'il 2 è fuori: tocca al prossimo con le carte');
  assert.strictEqual(g.daChi(0), 1);
  // il posto 0 pesca dal posto 1, che ha 11p e 9p
  const i9 = g.mani[1].findIndex((c) => c.id === '9p');
  assert.ok(g.azione(0, { tipo: 'pesca', indice: i9 }).ok);
  assert.ok(g.finita, 'resta solo il posto 1 con l\'uomo nero');
  assert.deepStrictEqual(g.perse, [0, 1, 0]);
  assert.deepStrictEqual(g.risultato.vincitori, [0, 2]);
}
// ---- la vista: la carta pescata la vedono solo chi pesca e chi la perde ----
{
  const g = M.crea({ n: 4, primo: 0, opzioni: {} });
  g.mani = [Cs('5c 9f'), Cs('6q 11p'), Cs('9p 2c'), Cs('2q 4f')];
  g.uscita = []; g.turno = 0;
  g.azione(0, { tipo: 'pesca', indice: 0 });
  assert.strictEqual(g.vista(0).ultima.carta, '6q');
  assert.strictEqual(g.vista(1).ultima.carta, '6q');
  assert.strictEqual(g.vista(2).ultima.carta, null);
  assert.ok(!JSON.stringify(g.vista(2)).includes('"11p"'), 'nessuno vede le carte degli altri');
}
// ---- dove mettere l'uomo nero ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  g.mani = [Cs('5c'), Cs('11p 4c 4f'), Cs('9p 9c')];
  g.uscita = []; g.turno = 0;
  g.azione(0, { tipo: 'pesca', indice: 0, mescola: true, uomo: 1 });
  assert.strictEqual(g.mani[0][g.mani[0].length - 1].id, UOMO, 'uomo nero messo in fondo');
}
console.log('✓ Uomo nero: mazzo senza fante di fiori, coppie per valore e colore, pescata dal vicino, salvi, chi resta con l\'uomo nero perde');

// ---- partite tra computer ----
{
  const LIV = ['facile', 'medio', 'difficile'];
  const t0 = Date.now();
  const persePer = { facile: 0, medio: 0, difficile: 0 }, giocatePer = { facile: 0, medio: 0, difficile: 0 };
  const N = process.env.TEST_VELOCE ? 400 : 1000;
  let partite = 0;
  for (const n of [3, 4, 5, 6]) {
    for (let k = 0; k < N / 4; k++) {
      const liv = Array.from({ length: n }, (_, i) => LIV[(i + k) % 3]);
      const g = M.crea({ n, primo: k % n, opzioni: { mani: [1, 3, 5][k % 3], mazzo: k % 2 ? 'corto' : 'completo' }, bot: liv });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 5000, 'la partita finisce');
        if (g.inAttesa) { g.avanza(); continue; }
        const t = g.turno;
        const r = g.azione(t, M.bot(g, t, liv[t]));
        assert.ok(r.ok, `mossa rifiutata: ${r.errore}`);
        const tot = g.mani.flat().length + g.scarti.length * 2;
        assert.strictEqual(tot, g.corto ? 31 : 51, 'nessuna carta persa');
        for (const m of g.mani) assert.strictEqual(new Set(m.map(chiave)).size, m.length, 'nessuna coppia resta in mano');
      }
      g.perse.forEach((x, i) => { persePer[liv[i]] += x; giocatePer[liv[i]] += g.mano; });
      partite++;
    }
  }
  const q = (l) => (persePer[l] / giocatePer[l]);
  console.log(`✓ Uomo nero: ${partite} partite tra computer da 3 a 6 (uomo nero per mano: facile ${(q('facile') * 100).toFixed(1)}%, medio ${(q('medio') * 100).toFixed(1)}%, difficile ${(q('difficile') * 100).toFixed(1)}%, ${Date.now() - t0} ms)`);
  assert.ok(q('difficile') <= q('facile'), 'il difficile resta con l\'uomo nero meno del facile');
}
