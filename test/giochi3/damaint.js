// DAMA INTERNAZIONALE: mosse delle pedine, presa all'indietro, presa massima obbligatoria, dama volante (mossa e presa
// da lontano), promozione solo a fine mossa, niente doppio salto dello stesso pezzo, vittoria e partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
// caso ripetibile (le partite tra computer danno sempre lo stesso esito)
{ let s = 11; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/damaint');
const { mosseDi, esegui, iniziale, L } = M._test;

const sq = (s) => { const c = 'abcdefghij'.indexOf(s[0]), r = L - Number(s.slice(1)); return r * L + c; };
const vuota = () => new Array(L * L).fill(0);
// ---- posizione iniziale ----
{
  const b = iniziale();
  assert.strictEqual(b.filter((x) => x === 1).length, 20); assert.strictEqual(b.filter((x) => x === 3).length, 20);
  const m = mosseDi(b, 0);
  assert.strictEqual(m.length, 9, 'il bianco all\'inizio ha 9 mosse');
  assert.ok(m.every((x) => !x.prese.length && Math.floor(x.a / L) === 5));
}
// ---- la pedina mangia anche all'indietro, e la presa è obbligatoria ----
{
  const b = vuota(); b[sq('e5')] = 1; b[sq('d4')] = 3; b[sq('a1')] = 1;
  const m = mosseDi(b, 0);
  assert.strictEqual(m.length, 1); assert.deepStrictEqual([m[0].a, m[0].prese], [sq('c3'), [sq('d4')]], 'presa all\'indietro, ed è l\'unica mossa');
}
// ---- presa massima: tra una presa da 1 e una da 2 si deve fare quella da 2 ----
{
  const b = vuota();
  b[sq('c3')] = 1; b[sq('d4')] = 3; b[sq('f6')] = 3; // c3xe5xg7: due pezzi
  b[sq('h2')] = 1; b[sq('g3')] = 3; // h2xf4: uno
  const m = mosseDi(b, 0);
  assert.ok(m.length === 1 && m[0].prese.length === 2 && m[0].a === sq('g7'), 'solo la presa più lunga');
}
// ---- dama volante: muove lontano e mangia da lontano, atterrando dove vuole dopo il pezzo ----
{
  const b = vuota(); b[sq('a1')] = 2; b[sq('e5')] = 3;
  const m = mosseDi(b, 0);
  assert.ok(m.every((x) => x.prese.length === 1));
  assert.deepStrictEqual(m.map((x) => x.a).sort((x, y) => x - y), [sq('f6'), sq('g7'), sq('h8'), sq('i9'), sq('j10')].sort((x, y) => x - y), 'atterra in qualsiasi casella libera dopo');
  const b2 = vuota(); b2[sq('a1')] = 2;
  assert.strictEqual(mosseDi(b2, 0).length, 9, 'la dama da sola vola su tutta la diagonale');
}
// ---- promozione solo se la mossa finisce sull'ultima fila ----
{
  const b = vuota(); b[sq('c9')] = 1; b[sq('d10')] = 0; b[sq('b10')] = 0;
  const m = mosseDi(b, 0);
  const c = b.slice(); assert.ok(esegui(c, m[0]) && c[m[0].a] === 2, 'arriva in fondo: dama');
  // passa dall'ultima fila durante una presa e continua: resta pedina
  const p = vuota(); p[sq('b8')] = 1; p[sq('c9')] = 3; p[sq('e9')] = 3;
  const mp = mosseDi(p, 0);
  assert.ok(mp.length === 1 && mp[0].prese.length === 2 && mp[0].a === sq('f8'), 'b8xd10xf8');
  const d = p.slice(); esegui(d, mp[0]); assert.strictEqual(d[sq('f8')], 1, 'resta pedina');
}
// ---- colpo turco: lo stesso pezzo non si salta due volte, i pezzi si tolgono alla fine ----
{
  const b = vuota(); b[sq('a1')] = 2; b[sq('c3')] = 3; b[sq('e3')] = 3; b[sq('e5')] = 3;
  for (const m of mosseDi(b, 0)) assert.strictEqual(new Set(m.prese).size, m.prese.length, 'nessun pezzo mangiato due volte');
}
// ---- partita: errore se non si fa la presa massima, vittoria quando l'altro non ha più pezzi ----
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, null] });
  g.b = vuota(); g.b[sq('c3')] = 1; g.b[sq('d4')] = 3; g.b[sq('f6')] = 3; g.b[sq('h2')] = 1; g.b[sq('g3')] = 3;
  const sbagliata = mosseDi(g.b.map((x) => x), 0);
  assert.strictEqual(sbagliata.length, 1);
  assert.ok(/più pezzi/.test(g.azione(0, { tipo: 'muovi', mossa: `${sq('h2')}-${sq('f4')}x${sq('g3')}` }).errore));
  assert.ok(g.azione(0, { tipo: 'muovi', mossa: g.vista(0).mosse[0].k }).ok);
  assert.ok(!g.finita);
  const h = M.crea({ n: 2, primo: 0, bot: [null, null] });
  h.b = vuota(); h.b[sq('e5')] = 1; h.b[sq('d6')] = 3;
  h.azione(0, { tipo: 'muovi', mossa: h.vista(0).mosse[0].k });
  assert.ok(h.finita && h.risultato.vincitori[0] === 0);
}
// ---- annulla e partite tra computer ----
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, 'medio'] });
  g.azione(0, { tipo: 'muovi', mossa: g.vista(0).mosse[0].k });
  g.azione(1, M.bot(g, 1, 'medio'));
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok && g.nMosse === 0);
  const t0 = Date.now();
  const sfida = (a, b, k) => {
    const liv = k % 2 ? [a, b] : [b, a];
    const x = M.crea({ n: 2, primo: k % 2, bot: liv });
    let giri = 0;
    while (!x.finita && giri++ < 500) { const p = x.turno; assert.ok(x.azione(p, M.bot(x, p, liv[p])).ok); }
    assert.ok(x.finita, 'la partita finisce');
    return x.risultato.pareggio ? 0.5 : liv[x.risultato.vincitori[0]] === a ? 1 : 0;
  };
  let mf = 0, dm = 0;
  for (let k = 0; k < 60; k++) mf += sfida('medio', 'facile', k);
  for (let k = 0; k < 10; k++) dm += sfida('difficile', 'medio', k);
  assert.ok(mf > 50 && dm > 7, `medio-facile ${mf}/60, difficile-medio ${dm}/10`);
  console.log(`✓ Dama internazionale: 9 mosse iniziali, presa all'indietro, presa massima obbligatoria, dama volante, promozione solo a fine mossa, colpo turco, vittoria, annulla; partite tra computer: medio-facile ${mf}/60, difficile-medio ${dm}/10 (${Date.now() - t0} ms)`);
}
