// Il trucco segreto: il comando, l'arma/consuma, i suggerimenti e il blackjack servito.
const assert = require('assert');
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

// la parola segreta viene da TRUCCO_PAROLA (su Render); senza, il trucco è spento
{
  const prima = process.env.TRUCCO_PAROLA;
  delete process.env.TRUCCO_PAROLA;
  assert.ok(!T.attivo() && !T.eComando('!win') && !T.eComando('!win banana') && !T.eComando('!win '), 'senza la variabile non scatta mai');
  process.env.TRUCCO_PAROLA = '  Pàtata  Fritta ';
  assert.ok(T.attivo() && T.eComando('!win patata fritta') && T.eComando('  !WIN   Patata   FRITTA ') && T.eComando('!win pàtata fritta'), 'maiuscole, accenti e spazi non contano');
  assert.ok(!T.eComando('!win') && !T.eComando('!win patata') && !T.eComando('!win banana') && !T.eComando('ciao !win patata fritta') && !T.eComando('!winpatata fritta'), 'solo la parola giusta');
  if (prima === undefined) delete process.env.TRUCCO_PAROLA; else process.env.TRUCCO_PAROLA = prima;
}
{
  const g = {};
  assert.ok(!T.armato(g, 0) && !T.consuma(g, 0));
  T.arma(g, 0);
  assert.ok(T.armato(g, 0) && T.consuma(g, 0) && !T.consuma(g, 0), 'vale una volta sola');
  // i suggerimenti arrivano solo quando il gioco ne ha uno da dare
  let pronto = false;
  const h = { suggerimentoWin: (p) => (pronto && p === 1 ? 'mossa giusta' : null) };
  T.arma(h, 1); T.controllaSuggerimenti(h);
  assert.deepStrictEqual(T.prendiSussurri(h), [], 'non ancora');
  pronto = true; T.controllaSuggerimenti(h);
  const s = T.prendiSussurri(h);
  assert.ok(s.length === 1 && s[0].posto === 1 && s[0].testo === 'mossa giusta' && !T.armato(h, 1));
  assert.deepStrictEqual(T.prendiSussurri(h), [], 'la coda si svuota');
  const m = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.strictEqual(T.inCima(m, (c) => c.id === 'a').id, 'a'); assert.strictEqual(m[m.length - 1].id, 'a');
  assert.strictEqual(T.inCima(m, (c) => c.id === 'c', { inizio: true }).id, 'c'); assert.strictEqual(m[0].id, 'c');
}
// blackjack: con il trucco la prossima mano è un blackjack e il banco non ce l'ha
{
  const B = GIOCHI.blackjack;
  let vinte = 0;
  for (let k = 0; k < 200; k++) {
    const g = B.crea({ n: 2, primo: 0, opzioni: {}, bot: [null, 'medio'] });
    const prima = g.scarpa.length;
    T.arma(g, 0);
    g.azione(0, { tipo: 'punta', importo: 10 });
    g.azione(1, B.bot(g, 1, 'medio'));
    while (g.fase === 'puntate' && g.inAttesa) g.avanza();
    const m = g.mani[0][0];
    const tot = m.carte.reduce((s, c) => s + (c.rango === 1 ? 11 : Math.min(10, c.rango)), 0);
    assert.strictEqual(tot, 21, 'blackjack servito');
    assert.ok(!T.armato(g, 0), 'trucco usato');
    const bancoTot = g.banco.reduce((s, c) => s + (c.rango === 1 ? 11 : Math.min(10, c.rango)), 0);
    if (g.banco.length === 2 && bancoTot !== 21) vinte++;
    const ids = [...g.scarpa, ...g.banco, ...g.mani.flat().flatMap((x) => x.carte)].map((c) => `${c.id}:${c.mazzo ?? ''}`);
    assert.ok(g.scarpa.length + g.banco.length + g.mani.flat().reduce((s, x) => s + x.carte.length, 0) >= prima, 'nessuna carta sparita');
    assert.ok(ids.length > 0);
  }
  assert.strictEqual(vinte, 200, 'il banco non ha mai blackjack quando il trucco è attivo');
}
console.log('✓ Trucco segreto: comando, una volta sola, suggerimenti solo a chi li chiede, blackjack servito');
