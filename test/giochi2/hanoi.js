// TORRE DI HANOI: regole delle mosse, soluzione ottima da qualunque posizione, annulla, fine da soli con il minimo
// di mosse, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/hanoi');
const { prossima, mancano, piccolo, DISCHI } = M._test;

// ---- la strategia ottima: 2^n − 1 dalla partenza, e da posizioni a caso arriva sempre ----
for (const n of DISCHI) assert.strictEqual(mancano(new Array(n + 1).fill(0), n), (1 << n) - 1, `${n} dischi`);
for (let k = 0; k < 500; k++) {
  const n = 3 + (k % 6), pos = [0, ...Array.from({ length: n }, () => Math.floor(Math.random() * 3))];
  let m = 0; const p = pos.slice();
  for (let x = prossima(p, n, 2); x; x = prossima(p, n, 2)) {
    const d = piccolo(p, n, x[0]), s = piccolo(p, n, x[1]);
    assert.ok(d && (!s || s > d), 'mossa lecita');
    p[d] = x[1]; m++;
    assert.ok(m <= (1 << n), 'non gira a vuoto');
  }
  assert.ok(p.every((x, d) => d === 0 || x === 2));
  assert.strictEqual(m, mancano(pos, n));
}
// ---- mosse da soli ----
{
  const g = M.crea({ n: 1, opzioni: { dischi: 3 }, bot: [null] });
  assert.ok(g.azione(0, { tipo: 'sposta', da: 1, a: 2 }).errore, 'piolo vuoto');
  assert.ok(g.azione(0, { tipo: 'sposta', da: 0, a: 1 }).ok);
  assert.ok(g.azione(0, { tipo: 'sposta', da: 0, a: 1 }).errore, 'grande sopra piccolo');
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.strictEqual(g.tavole[0].mosse, 2, 'anche annullare conta');
  assert.ok(g.azione(0, { tipo: 'ricomincia' }).errore, 'già all\'inizio');
  for (let x = prossima(g.tavole[0].pos, 3, 2); x; x = prossima(g.tavole[0].pos, 3, 2)) g.azione(0, { tipo: 'sposta', da: x[0], a: x[1] });
  assert.ok(g.finita && /7 mosse/.test(g.risultato.titolo) === false && /mosse/.test(g.risultato.titolo));
  const h = M.crea({ n: 1, opzioni: { dischi: 4 }, bot: [null] });
  for (let x = prossima(h.tavole[0].pos, 4, 2); x; x = prossima(h.tavole[0].pos, 4, 2)) h.azione(0, { tipo: 'sposta', da: x[0], a: x[1] });
  assert.ok(h.finita && /il minimo/.test(h.risultato.titolo), 'medaglia del minimo');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const mosse = { facile: 0, medio: 0, difficile: 0 };
  const N = 120;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { dischi: DISCHI[k % DISCHI.length] }, bot: liv });
    let giri = 0;
    // ognuno muove a turno (stesso ritmo in prova): vince chi fa meno mosse
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    liv.forEach((l, i) => { mosse[l] += g.tavole[i].mosse; });
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  console.log(`✓ Torre di Hanoi: soluzione ottima da 500 posizioni a caso, regole, annulla, medaglia; ${N} sfide tra computer: mosse f/m/d ${mosse.facile}/${mosse.medio}/${mosse.difficile} (${Date.now() - t0} ms)`);
  assert.ok(mosse.facile > mosse.medio && mosse.medio >= mosse.difficile);
}
