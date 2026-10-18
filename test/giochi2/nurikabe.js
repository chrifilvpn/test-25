// NURIKABE: il risolutore (confronto con la ricerca completa su griglie 4×4 e 5×4), gli schemi salvati (una sola
// soluzione, regole rispettate), le trasformazioni, le mosse, l'aiuto e le sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/nurikabe');
const { risolvi, trasforma } = require('../../giochi2/nurikabe-logica');
const { GRANDEZZE, dati, MARE, PUNTO } = M._test;

// una griglia (1 = isola, 0 = mare) rispetta le regole con questi numeri?
function valida(W, H, numeri, sol) {
  const N = W * H, V = (i) => { const x = i % W, v = []; if (x > 0) v.push(i - 1); if (x < W - 1) v.push(i + 1); if (i >= W) v.push(i - W); if (i + W < N) v.push(i + W); return v; };
  for (let i = 0; i < N; i++) if (numeri[i] && !sol[i]) return false;
  for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) { const i = y * W + x; if (!sol[i] && !sol[i + 1] && !sol[i + W] && !sol[i + W + 1]) return false; }
  const vis = new Uint8Array(N);
  let compMare = 0;
  for (let i = 0; i < N; i++) {
    if (vis[i]) continue;
    const comp = [i]; vis[i] = 1;
    for (let k = 0; k < comp.length; k++) for (const j of V(comp[k])) if (!vis[j] && sol[j] === sol[i]) { vis[j] = 1; comp.push(j); }
    if (sol[i]) { const num = comp.filter((c) => numeri[c]); if (num.length !== 1 || numeri[num[0]] !== comp.length) return false; } else compMare++;
  }
  return compMare <= 1;
}

// ---- risolutore contro ricerca completa ----
{
  let provati = 0, uniche = 0;
  for (const [W, H, quanti] of [[4, 4, 150], [5, 4, 40]]) {
    const N = W * H;
    // tutte le griglie con il mare collegato e senza 2×2, con le loro isole (calcolate una volta sola)
    const griglie = [];
    for (let m = 0; m < 1 << N; m++) {
      const g = Array.from({ length: N }, (_, i) => (m >> i) & 1);
      let ok = true;
      for (let y = 0; y + 1 < H && ok; y++) for (let x = 0; x + 1 < W; x++) { const i = y * W + x; if (!g[i] && !g[i + 1] && !g[i + W] && !g[i + W + 1]) { ok = false; break; } }
      if (!ok) continue;
      const vis = new Int32Array(N).fill(-1), isole = []; let mari = 0;
      for (let i = 0; i < N; i++) {
        if (vis[i] >= 0) continue;
        const comp = [i]; vis[i] = isole.length;
        for (let k = 0; k < comp.length; k++) { const c = comp[k], x = c % W; for (const j of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W]) if (j >= 0 && j < N && vis[j] < 0 && g[j] === g[i]) { vis[j] = isole.length; comp.push(j); } }
        if (g[i]) isole.push(comp); else { mari++; comp.forEach((c) => { vis[c] = 1e9; }); }
      }
      if (mari > 1) continue;
      griglie.push({ g, isole });
    }
    for (let k = 0; k < quanti; k++) {
      const { g: sol, isole } = griglie[Math.floor(Math.random() * griglie.length)];
      if (!isole.length) continue;
      const numeri = new Array(N).fill(0);
      for (const c of isole) numeri[c[Math.floor(Math.random() * c.length)]] = c.length;
      const conNumeri = numeri.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      const forza = griglie.filter(({ g, isole: is }) => conNumeri.every((i) => g[i]) && is.every((c) => { const nn = c.filter((i) => numeri[i]); return nn.length === 1 && numeri[nn[0]] === c.length; })).length;
      const r = risolvi(W, H, numeri, 1e6, 1e7);
      assert.strictEqual(r.soluzioni.length, forza, `soluzioni ${W}×${H}: ${numeri.join(',')}`);
      for (const x of r.soluzioni) assert.ok(valida(W, H, numeri, x), 'ogni soluzione trovata è valida');
      void sol;
      provati++; if (forza === 1) uniche++;
    }
  }
  assert.ok(provati > 150 && uniche > 3, `${provati} ${uniche}`);
}
// ---- trasformazioni: 8 diverse e invertibili sul quadrato ----
{
  const a = Array.from({ length: 9 }, (_, i) => i), viste = new Set();
  for (let k = 0; k < 8; k++) { const b = trasforma(3, 3, a, k); assert.deepStrictEqual(b.slice().sort((x, y) => x - y), a); viste.add(b.join()); }
  assert.strictEqual(viste.size, 8);
}
// ---- gli schemi salvati: una sola soluzione, che è quella salvata ----
{
  const D = dati();
  let tot = 0;
  for (const [g, [W, H]] of Object.entries(GRANDEZZE)) {
    assert.ok(D[g].length >= 30, `abbastanza schemi ${g} (${D[g].length})`);
    D[g].forEach((sc, k) => {
      assert.strictEqual(sc.n.length, W * H); assert.strictEqual(sc.s.length, W * H);
      const numeri = sc.n.split('').map((c) => parseInt(c, 36)), sol = sc.s.split('').map(Number);
      assert.ok(valida(W, H, numeri, sol), `${g} ${k}: la soluzione salvata rispetta le regole`);
      if (k % 6 === 0) { const r = risolvi(W, H, numeri, 2, 2e6); assert.ok(!r.troppo && r.soluzioni.length === 1 && r.soluzioni[0].join('') === sc.s, `${g} ${k}: una sola soluzione`); }
      tot++;
    });
  }
  console.log(`  (nurikabe: ${tot} schemi)`);
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { grandezza: 'piccola', errori: 'subito' }, bot: [null] });
  const t = g.tavole[0], N = g.W * g.H;
  assert.ok(valida(g.W, g.H, g.numeri, g.soluzione), 'lo schema girato resta valido');
  const num = g.numeri.findIndex(Boolean);
  assert.ok(g.azione(0, { tipo: 'segna', i: num, v: MARE }).errore, 'sui numeri non si scrive');
  const isola = g.soluzione.findIndex((v, i) => v && !g.numeri[i]);
  if (isola >= 0) { g.azione(0, { tipo: 'segna', i: isola, v: MARE }); assert.ok(g.vista(0).sbagliate.includes(isola), 'errore segnato subito'); }
  g.azione(0, { tipo: 'aiuto' });
  if (isola >= 0) assert.strictEqual(t.celle[isola], PUNTO, 'l\'aiuto corregge prima le sbagliate');
  assert.strictEqual(t.penale, 20000);
  g.azione(0, { tipo: 'annulla' });
  const mare = []; for (let i = 0; i < N; i++) if (!g.soluzione[i]) mare.push(i);
  g.azione(0, { tipo: 'cancella' });
  assert.ok(t.celle.every((v) => !v));
  g.azione(0, { tipo: 'segna', celle: mare.slice(0, -1), v: MARE });
  assert.ok(!g.finita);
  g.azione(0, { tipo: 'segna', celle: mare.slice(-1), v: MARE });
  assert.ok(g.finita && t.fatto >= 20000, 'finito, con la penalità nel tempo');
  assert.ok(Array.isArray(g.vista(0).soluzione));
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 120;
  for (let k = 0; k < N; k++) {
    // i posti girano: a parità di mosse arriva prima chi muove per primo nel giro
    const liv = ['facile', 'medio', 'difficile'].map((_, i, a) => a[(i + k) % 3]);
    const g = M.crea({ n: 3, opzioni: { grandezza: Object.keys(GRANDEZZE)[k % 3] }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(primi.difficile > primi.facile, JSON.stringify(primi));
  console.log(`✓ Nurikabe: risolutore controllato con la ricerca completa, schemi con una sola soluzione, trasformazioni, mosse a tratti, aiuto, errori; ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile} (${Date.now() - t0} ms)`);
}
