// Paroliere: dizionario, griglia (lettere vicine, dado usato una volta, "Qu"), parole controllate dal server,
// parole doppie annullate, round a tempo, computer per livello
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/paroliere');
const D = require('../../giochi2/paroliere-dati');
const { percorso, risolvi } = M._test;

assert.ok(D.dizionario().length > 300000, 'dizionario grande');
for (const w of ['casa', 'cane', 'mangiavano', 'bellissime', 'quadro']) assert.ok(D.esiste(w), `${w} c'è`);
for (const w of ['xyzk', 'casaa', 'qwerty']) assert.ok(!D.esiste(w), `${w} non c'è`);
assert.strictEqual(D.normalizza('Perché!'), 'perche');
assert.ok(D.fascia('casa') >= 2, 'casa è comune');
// ---- percorsi sulla griglia ----
{
  const g = ['c', 'a', 'x', 'x', 's', 'a', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'qu'];
  assert.ok(percorso(g, 4, 'casa'), 'casa: c-a-s-a con le diagonali');
  assert.ok(!percorso(g, 4, 'cassa'), 'una sola s');
  assert.ok(!percorso(g, 4, 'cacao'), 'ogni dado una volta');
  const h = ['qu', 'a', 'd', 'r', 'x', 'x', 'x', 'o', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x'];
  assert.ok(percorso(h, 4, 'quadro'), 'il dado Qu');
  const tutte = risolvi(h, 4, 3);
  assert.ok(tutte.includes('quadro') && tutte.every((w) => D.esiste(w) && percorso(h, 4, w)), 'il risolutore trova parole vere e componibili');
}
// ---- round tra due persone ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { doppie: 'annullate' }, bot: [null, null] });
  g.griglia = ['c', 'a', 'n', 'e', 's', 'a', 't', 'o', 'r', 'e', 'l', 'i', 'm', 'o', 'n', 'i'];
  assert.ok(g.azione(0, { tipo: 'parola', parola: 'cane' }).ok);
  assert.ok(g.azione(0, { tipo: 'parola', parola: 'CANE' }).errore, 'già trovata');
  assert.ok(g.azione(0, { tipo: 'parola', parola: 'ca' }).errore, 'troppo corta');
  assert.ok(g.azione(0, { tipo: 'parola', parola: 'xyz' }).errore, 'non componibile');
  assert.ok(g.azione(1, { tipo: 'parola', parola: 'cane' }).ok);
  assert.ok(g.azione(1, { tipo: 'parola', parola: 'casa' }).ok);
  const v = g.vista(0);
  assert.deepStrictEqual(v.mie, ['cane']);
  assert.strictEqual(v.altri[1].quante, 2);
  assert.ok(!JSON.stringify(v).includes('casa'), 'le parole degli altri non si vedono durante il round');
  g.azione(0, { tipo: 'finito' });
  assert.strictEqual(g.fase, 'gioco');
  g.azione(1, { tipo: 'finito' });
  assert.strictEqual(g.fase, 'risultati');
  assert.deepStrictEqual(g.esitoRound.punti, [0, 1], '"cane" trovata da tutti e due non vale');
  g.azione(0, { tipo: 'pronto' }); g.azione(1, { tipo: 'pronto' });
  assert.ok(g.finita);
}
// ---- computer: più parole col livello più alto ----
{
  const t0 = Date.now();
  const conta = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 40; k++) {
    const g = M.crea({ n: 3, primo: 0, opzioni: {}, bot: ['facile', 'medio', 'difficile'] });
    g.fine = Date.now() - 1; // il tempo è scaduto: i computer finiscono
    g.controllaTempo();
    assert.strictEqual(g.fase, 'risultati');
    g.parole.forEach((el, i) => { conta[['facile', 'medio', 'difficile'][i]] += el.length; for (const x of el) assert.ok(D.esiste(x.w) && percorso(g.griglia, g.lato, x.w)); });
  }
  console.log(`✓ Paroliere: dizionario di ${D.dizionario().length} parole, griglia con Qu, parole controllate, doppie annullate, round; computer f/m/d ${conta.facile}/${conta.medio}/${conta.difficile} parole in 40 griglie (${Date.now() - t0} ms)`);
  assert.ok(conta.difficile > conta.medio && conta.medio > conta.facile);
}
