// BRISCOLA CHIAMATA: asta (chiamate sempre più basse, poi i punti col 2, passo, tutti passano), scelta del seme e
// socio segreto, prese, punteggio della mano (anche da solo), e tante partite tra computer.
const assert = require('assert');
// caso ripetibile: le partite tra computer danno sempre lo stesso esito
{ let s = 20261018; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi2/chiamata');
const { punti, daLivello, nomeLivello, MAX_LIVELLO, amico } = M._test;

// ---- livelli dell'asta ----
assert.deepStrictEqual(daLivello(0), { rango: 1, soglia: 61 });
assert.deepStrictEqual(daLivello(1), { rango: 3, soglia: 61 });
assert.deepStrictEqual(daLivello(9), { rango: 2, soglia: 61 });
assert.deepStrictEqual(daLivello(10), { rango: 2, soglia: 62 });
assert.deepStrictEqual(daLivello(MAX_LIVELLO), { rango: 2, soglia: 120 });
assert.strictEqual(nomeLivello(0), 'l\'asso');
assert.strictEqual(nomeLivello(12), 'il due a 64');

const finisci = (g, liv = ['medio', 'medio', 'medio', 'medio', 'medio']) => {
  let giri = 0;
  while (!g.finita && giri++ < 5000) {
    if (g.inAttesa) { g.avanza(); continue; }
    const p = g.turno;
    const r = g.azione(p, M.bot(g, p, liv[p]));
    assert.ok(r.ok, `mossa del computer: ${JSON.stringify(r)}`);
  }
  assert.ok(g.finita, 'la partita finisce');
};

// ---- asta ----
{
  const g = M.crea({ n: 5, primo: 0, opzioni: { mani: 1 } });
  assert.strictEqual(g.mani.every((m) => m.length === 8), true, '8 carte a testa');
  const t = g.turno;
  assert.ok(g.azione((t + 1) % 5, { tipo: 'passo' }).errore, 'non è il suo turno');
  assert.ok(g.azione(t, { tipo: 'chiama', livello: 2 }).ok);
  assert.ok(g.azione((t + 1) % 5, { tipo: 'chiama', livello: 2 }).errore, 'bisogna chiamare più in basso');
  assert.ok(g.azione((t + 1) % 5, { tipo: 'chiama', livello: 5 }).ok);
  for (let k = 2; k < 5; k++) assert.ok(g.azione((t + k) % 5, { tipo: 'passo' }).ok);
  // torna al primo, che passa: vince l'asta chi ha chiamato il 7
  assert.strictEqual(g.turno, t);
  g.azione(t, { tipo: 'passo' });
  assert.strictEqual(g.fase, 'seme');
  assert.strictEqual(g.turno, (t + 1) % 5);
  const ch = g.turno;
  // seme in cui il chiamante non ha il 7 (se c'è): il socio è chi lo ha
  const s = ['c', 'q', 'f', 'p'].find((x) => !g.mani[ch].some((c) => c.id === `7${x}`)) || 'c';
  g.azione(ch, { tipo: 'seme', seme: s });
  assert.strictEqual(g.chiamata.carta, `7${s}`);
  assert.ok(g.mani[g.socio].some((c) => c.id === `7${s}`), 'il socio ha la carta chiamata');
  assert.strictEqual(g.fase, 'gioco');
  // il socio lo sa solo lui (e il chiamante no) finché non gioca la carta
  if (!g.solo) {
    assert.strictEqual(g.vista(g.socio).socio, g.socio);
    assert.strictEqual(g.vista(ch).socio, null);
    const altro = [0, 1, 2, 3, 4].find((q) => q !== ch && q !== g.socio);
    assert.strictEqual(amico(g, altro, ch), false, 'il chiamante è nemico dei difensori');
    assert.strictEqual(amico(g, g.socio, ch), true, 'il socio sa di essere amico del chiamante');
    assert.strictEqual(amico(g, ch, g.socio), null, 'il chiamante non sa chi è il socio');
  }
  finisci(g);
  const r = g.riepilogo;
  assert.strictEqual(g.prese.flat().reduce((x, c) => x + punti(c), 0), 120, '120 punti in tutto');
  const somma = r.righe.reduce((x, y) => x + y.unita, 0);
  assert.strictEqual(somma, g.solo ? (r.vinto ? 0 : 0) : (r.vinto ? 0 : 0), 'i punti della mano si compensano');
  assert.strictEqual(r.righe[ch].unita, g.solo ? (r.vinto ? 4 : -4) : (r.vinto ? 2 : -2));
}
// ---- tutti passano: si rimescola ----
{
  const g = M.crea({ n: 5, primo: 0, opzioni: { mani: 1 } });
  const m0 = g.mazziere;
  for (let k = 0; k < 5; k++) g.azione(g.turno, { tipo: 'passo' });
  assert.strictEqual(g.fase, 'rimescola');
  g.avanza();
  assert.strictEqual(g.fase, 'asta');
  assert.strictEqual(g.mazziere, (m0 + 1) % 5, 'cambia il mazziere');
  assert.strictEqual(g.nSmazzata, 0, 'la mano non conta');
}
// ---- da solo: chiama una carta che ha ----
{
  const g = M.crea({ n: 5, primo: 0, opzioni: { mani: 1 } });
  const t = g.turno;
  const mia = g.mani[t][0];
  const L = M._test.ORDINE.indexOf(mia.rango);
  g.azione(t, { tipo: 'chiama', livello: L });
  for (let k = 1; k < 5; k++) g.azione(g.turno, { tipo: 'passo' });
  g.azione(t, { tipo: 'seme', seme: mia.seme });
  assert.ok(g.solo && g.socio === t, 'gioca da solo');
  finisci(g);
  const r = g.riepilogo;
  assert.strictEqual(r.righe[t].unita, r.vinto ? 4 : -4);
  assert.ok(r.righe.every((x, i) => i === t || x.unita === (r.vinto ? -1 : 1)));
}
// ---- partite complete tra computer: il medio fa più punti del facile, il difficile (che simula) più del medio ----
{
  const t0 = Date.now();
  const tot = { facile: 0, medio: 0, difficile: 0 }, conta = { facile: 0, medio: 0, difficile: 0 };
  let mani = 0, vinte = 0, sole = 0;
  const N = 340;
  for (let k = 0; k < N; k++) {
    // le prime 300 tra facile e medio (veloci), le ultime 40 con due difficili contro tre medi
    const liv = k < 300 ? Array.from({ length: 5 }, (_, i) => ['facile', 'medio'][(i + k) % 2]) : Array.from({ length: 5 }, (_, i) => (i === k % 5 || i === (k + 2) % 5 ? 'difficile' : 'medio'));
    const g = M.crea({ n: 5, primo: k % 5, opzioni: { mani: 5 } });
    finisci(g, liv);
    g.totali.forEach((x, i) => { tot[liv[i]] += x; conta[liv[i]]++; });
    assert.strictEqual(g.storicoMani.length, 5);
    for (const h of g.storicoMani) { mani++; if (h.vinto) vinte++; if (h.chiamante === h.socio) sole++; }
    assert.strictEqual(g.totali.reduce((a, b) => a + b, 0), 0, 'la somma dei totali è zero');
  }
  const media = (l) => tot[l] / conta[l];
  assert.ok(media('medio') > media('facile') && media('difficile') > media('medio'), `il più forte fa più punti: ${JSON.stringify(tot)} ${JSON.stringify(conta)}`);
  assert.ok(vinte > mani * 0.25 && vinte < mani * 0.85, `il chiamante vince a volte sì e a volte no (${vinte}/${mani})`);
  console.log(`✓ Briscola chiamata: asta, punti col due, tutti passano, seme e socio segreto, da solo contro quattro, punteggio a somma zero; ${N} partite tra computer (${mani} mani, chiamante vince ${vinte}, da solo ${sole}); media per partita f/m/d ${media('facile').toFixed(2)}/${media('medio').toFixed(2)}/${media('difficile').toFixed(2)} (${Date.now() - t0} ms)`);
}
