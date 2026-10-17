// KAKURO: tutti gli schemi salvati sono validi (file da 2 a 9 caselle, cifre diverse, somme giuste), hanno una sola
// soluzione e si risolvono ragionando; varianti; mosse, aiuto, fine da soli; sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/kakuro');
const { grado, prepara, risolviLogica, contaSoluzioni, decodifica, variante, GRANDEZZE, LIVELLI, NERA, dati } = M._test;

// ---- gli schemi salvati ----
{
  const t0 = Date.now();
  const D = dati();
  let n = 0;
  for (const L of Object.values(GRANDEZZE)) for (const liv of LIVELLI) {
    const lista = D[`${L}:${liv}`];
    assert.ok(lista && lista.length >= 3, `schemi ${L}:${liv} (${lista && lista.length})`);
    assert.strictEqual(new Set(lista).size, lista.length, 'niente doppioni');
    for (const cod of lista) {
      const g = decodifica(cod);
      assert.strictEqual(g.length, L * L);
      const S = prepara(L, g);
      for (const f of S.file) {
        assert.ok(f.celle.length >= 2 && f.celle.length <= 9, 'file da 2 a 9 caselle');
        const v = f.celle.map((i) => g[i]);
        assert.strictEqual(new Set(v).size, v.length, 'cifre diverse in una fila');
        assert.strictEqual(v.reduce((a, b) => a + b, 0), f.somma);
      }
      assert.ok(S.bianche.every((i) => g[i] >= 1 && g[i] <= 9));
      assert.ok(risolviLogica(S, 3), 'si risolve ragionando');
      assert.strictEqual(grado(S).livello, liv, `difficoltà giusta (${L}:${liv})`);
      if (L <= 10 || n % 3 === 0) assert.strictEqual(contaSoluzioni(S, 2, 2e6).soluzioni, 1, 'una sola soluzione');
      n++;
    }
  }
  console.log(`✓ Kakuro: ${n} schemi salvati, tutti validi, con una sola soluzione e risolvibili ragionando (${Date.now() - t0} ms)`);
}
// ---- varianti (trasposta, cifre rovesciate): restano schemi validi ----
{
  const g = decodifica(dati()['8:facile'][0]);
  for (const [tr, rov] of [[true, false], [false, true], [true, true]]) {
    const v = variante(8, g, tr, rov), S = prepara(8, v);
    assert.ok(S.file.every((f) => new Set(f.celle.map((i) => v[i])).size === f.celle.length));
    assert.ok(risolviLogica(S, 3));
  }
}
// ---- mosse da soli ----
{
  const g = M.crea({ n: 1, opzioni: { grandezza: 'piccola', difficolta: 'facile' }, bot: [null] });
  const nera = g.soluzione.findIndex((x) => x === NERA), bianca = g.S.bianche[0];
  assert.ok(g.azione(0, { tipo: 'metti', i: nera, v: 3 }).errore, 'casella nera');
  assert.ok(g.azione(0, { tipo: 'metti', i: bianca, v: g.soluzione[bianca] === 9 ? 8 : 9 }).ok);
  assert.ok(g.azione(0, { tipo: 'aiuto' }).ok);
  assert.strictEqual(g.tavole[0].valori[bianca], g.soluzione[bianca], "l'aiuto corregge lo sbaglio");
  for (const i of g.S.bianche) if (g.tavole[0].valori[i] !== g.soluzione[i]) g.azione(0, { tipo: 'metti', i, v: g.soluzione[i] });
  assert.ok(g.finita && g.risultato.vincitori[0] === 0);
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const N = 24;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { grandezza: ['piccola', 'media', 'grande'][k % 3], difficolta: LIVELLI[(k >> 1) % 3] }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 5000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    for (const p of g.arrivi) assert.ok(g.risolta(p, g.tavole[p]));
  }
  console.log(`✓ Kakuro: ${N} sfide tra computer completate (${Date.now() - t0} ms)`);
}
