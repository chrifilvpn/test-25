// BATTAGLIA NAVALE SOLITARIA: risolutore (confronto con la ricerca completa su una griglia 5×5), flotte a caso
// valide, schemi salvati con una sola soluzione, mosse, riempimento d'acqua, aiuto, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/navale');
const NL = require('../../giochi2/navale-logica');
const { dati, ACQUA, NAVE } = M._test;

// la griglia sol contiene esattamente la flotta, con navi dritte che non si toccano?
function flottaValida(L, flotta, sol) {
  const vis = new Uint8Array(L * L), lunghezze = [];
  for (let i = 0; i < L * L; i++) {
    if (!sol[i] || vis[i]) continue;
    const comp = [i]; vis[i] = 1;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k], x = c % L, y = (c - x) / L;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < L && b < L && sol[b * L + a] && !vis[b * L + a]) { vis[b * L + a] = 1; comp.push(b * L + a); } }
    }
    const xs = new Set(comp.map((c) => c % L)), ys = new Set(comp.map((c) => Math.floor(c / L)));
    if (xs.size > 1 && ys.size > 1) return false; // non dritta (o due navi che si toccano)
    lunghezze.push(comp.length);
  }
  return lunghezze.sort().join() === flotta.slice().sort().join();
}

// ---- risolutore contro forza bruta: flotta [2,1,1] in 5×5 ----
{
  const L = 5, flotta = [2, 1, 1];
  const tutte = [];
  for (let m = 0; m < 1 << 25; m += 1) {
    // solo griglie con 4 pezzi: si saltano le altre in fretta
    let b = m, c = 0; while (b) { b &= b - 1; c++; if (c > 4) break; }
    if (c !== 4) continue;
    const sol = Array.from({ length: 25 }, (_, i) => (m >> i) & 1);
    if (flottaValida(L, flotta, sol)) tutte.push(sol);
  }
  let provati = 0;
  for (let k = 0; k < 60; k++) {
    const vera = tutte[Math.floor(Math.random() * tutte.length)];
    const { righe, colonne } = NL.conteggi(L, vera);
    const indizi = new Map();
    if (k % 2) { const i = Math.floor(Math.random() * 25); indizi.set(i, NL.forma(L, vera, i)); }
    const attese = tutte.filter((s) => { const c = NL.conteggi(L, s); return c.righe.join() === righe.join() && c.colonne.join() === colonne.join() && [...indizi].every(([i, f]) => NL.forma(L, s, i) === f); });
    const r = NL.risolvi(L, flotta, righe, colonne, indizi, 1000);
    assert.strictEqual(r.soluzioni.length, attese.length, 'stesso numero di soluzioni della ricerca completa');
    provati++;
  }
  assert.strictEqual(provati, 60);
}
// ---- flotte a caso valide ----
for (const g of Object.keys(NL.LATI)) for (let k = 0; k < 30; k++) assert.ok(flottaValida(NL.LATI[g], NL.FLOTTE[g], NL.flottaCaso(NL.LATI[g], NL.FLOTTE[g])), `flotta ${g}`);
// ---- schemi salvati ----
{
  const D = dati();
  let tot = 0;
  for (const g of Object.keys(NL.LATI)) {
    const L = NL.LATI[g], fl = NL.FLOTTE[g];
    assert.ok(D[g].length >= 30, `abbastanza schemi ${g}`);
    D[g].forEach((sc, k) => {
      const sol = sc.s.split('').map(Number);
      assert.ok(flottaValida(L, fl, sol), `${g} ${k}: flotta giusta`);
      if (k % 5 === 0) {
        const { righe, colonne } = NL.conteggi(L, sol), ind = new Map(sc.i.split('.').map((x) => { const i = parseInt(x, 36); return [i, NL.forma(L, sol, i)]; }));
        const r = NL.risolvi(L, fl, righe, colonne, ind, 2);
        assert.ok(!r.troppo && r.soluzioni.length === 1 && r.soluzioni[0].join('') === sc.s, `${g} ${k}: una sola soluzione`);
      }
      tot++;
    });
  }
  console.log(`  (battaglia navale solitaria: ${tot} schemi)`);
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { grandezza: 'piccola', errori: 'subito' }, bot: [null] });
  const t = g.tavole[0], L = g.L;
  assert.ok(flottaValida(L, g.flotta, g.soluzione), 'lo schema girato resta valido');
  for (const i of Object.keys(g.indizi)) assert.strictEqual(t.celle[i], g.soluzione[i] ? NAVE : ACQUA, 'le caselle scoperte si vedono già');
  const ind = Number(Object.keys(g.indizi)[0]);
  assert.ok(g.azione(0, { tipo: 'segna', i: ind, v: 0 }).errore, 'le caselle scoperte non si cambiano');
  // una riga: si mettono le sue navi, poi "riempi d'acqua"
  const y = g.righe.findIndex((n) => n > 0);
  const riga = Array.from({ length: L }, (_, x) => y * L + x);
  assert.ok(g.azione(0, { tipo: 'riempiAcqua', dir: 'riga', k: y }).errore || riga.filter((i) => t.celle[i] === NAVE).length === g.righe[y], 'prima le navi');
  g.azione(0, { tipo: 'segna', celle: riga.filter((i) => g.soluzione[i]), v: NAVE });
  const r = g.azione(0, { tipo: 'riempiAcqua', dir: 'riga', k: y });
  if (!r.errore) assert.ok(riga.every((i) => t.celle[i] !== 0), 'riga riempita');
  const acquaSbagliata = g.soluzione.findIndex((v, i) => v && t.celle[i] === 0);
  if (acquaSbagliata >= 0) { g.azione(0, { tipo: 'segna', i: acquaSbagliata, v: ACQUA }); assert.ok(g.vista(0).sbagliate.includes(acquaSbagliata)); }
  g.azione(0, { tipo: 'aiuto' });
  assert.strictEqual(t.penale, 20000);
  g.azione(0, { tipo: 'segna', celle: g.soluzione.map((v, i) => (v ? i : -1)).filter((i) => i >= 0), v: NAVE });
  const resto = t.celle.map((v, i) => (v === NAVE && !g.soluzione[i] ? i : -1)).filter((i) => i >= 0);
  if (resto.length) g.azione(0, { tipo: 'segna', celle: resto, v: 0 });
  assert.ok(g.finita && t.fatto >= 20000, 'flotta trovata');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 120;
  for (let k = 0; k < N; k++) {
    // i posti girano: a parità di mosse arriva prima chi muove per primo nel giro
    const liv = ['facile', 'medio', 'difficile'].map((_, i, a) => a[(i + k) % 3]);
    const g = M.crea({ n: 3, opzioni: { grandezza: Object.keys(NL.LATI)[k % 3] }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    primi[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(primi.difficile > primi.facile, JSON.stringify(primi));
  console.log(`✓ Battaglia navale solitaria: risolutore controllato con la ricerca completa, flotte valide, schemi con una sola soluzione, file d'acqua, aiuto; ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile} (${Date.now() - t0} ms)`);
}
