// HOCKEY SU GHIACCIO: pista e porte, scivolata, presa del disco, tiro, passaggio, furto, spintoni, parate, gol e
// ingaggio, tempo e supplementari, e tante partite tra computer (2 contro 2, in 2 e in 4).
const assert = require('assert');
{ let s = 5; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/hockey');
const { W, H, dentro, gabbia, fuoriGabbia, LINEA_PORTA, BOCCA, portaX } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.02); k++) { g.tempoRound += 0.02; if (g.passo(0.02)) return true; } return false; };
const fermi = (g) => { for (const p of g.g) { p.vx = p.vy = 0; } };

assert.strictEqual(M.meta.id, 'hockey');
assert.deepStrictEqual(M.meta.giocatori, [2, 4]);
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));
// ---- pista ----
assert.strictEqual(dentro(W / 2, H / 2, 10), null, 'al centro si è dentro');
assert.ok(dentro(5, H / 2, 10).nx === 1 && dentro(W - 2, H / 2, 10).nx === -1, 'balaustre ai lati');
assert.ok(dentro(10, 10, 10) && Math.hypot(dentro(10, 10, 10).x - 150, dentro(10, 10, 10).y - 150) <= 140.01, 'angoli arrotondati');
assert.ok(fuoriGabbia({ x: LINEA_PORTA - 10, y: H / 2 }, 6, gabbia(0)), 'la gabbia della porta è un ostacolo');
assert.ok(portaX(0) < W / 2 && portaX(1) > W / 2);
// ---- pattinare, prendere il disco, tirare ----
{
  const g = M.crea({ n: 4, opzioni: {}, bot: [null, null, null, null] }); parti(g);
  assert.strictEqual(g.g.length, 4);
  const p = g.g[0];
  // sul ghiaccio si scivola: lasciati i tasti si rallenta piano
  g.inp[0].x = 1; passa(g, 0.6); g.inp[0].x = 0;
  const v1 = Math.hypot(p.vx, p.vy); passa(g, 0.2); const v2 = Math.hypot(p.vx, p.vy);
  assert.ok(v1 > 250 && v2 > v1 * 0.6 && v2 < v1, `scivola: ${v1.toFixed(0)} → ${v2.toFixed(0)}`);
  // disco davanti al bastone: lo prende
  fermi(g); g.ingaggio(0); fermi(g);
  for (const q of g.g) if (q.k !== 0) { q.x = 200 + q.k * 100; q.y = 80; }
  p.x = 700; p.y = H / 2; p.a = 0; g.disco.x = 700 + 21; g.disco.y = H / 2; g.disco.vx = g.disco.vy = 0;
  passa(g, 0.05);
  assert.strictEqual(g.disco.chi, 0, 'il disco sul bastone si prende');
  // tiro guardando la porta (a destra per i Rossi): gol
  // il portiere resta fermo fuori dalla traiettoria (qui si prova il gol, non la parata)
  Object.assign(g.portieri[1], { x: portaX(1) - 30, y: H / 2 + 34 }); Object.assign(g.portieri[1].mente, { fino: Infinity, tx: portaX(1) - 30, ty: H / 2 + 34 });
  g.inp[0].tocchi++;
  passa(g, 0.05);
  assert.strictEqual(g.disco.chi, null, 'tirato');
  assert.ok(g.disco.vx > 700, 'verso la porta, forte');
  for (let k = 0; k < 60 && !g.gol[0]; k++) passa(g, 0.02);
  assert.deepStrictEqual(g.gol, [1, 0], 'gol dei Rossi');
  assert.ok(g.pausaGol > 0 && /Gol|segna/.test(g.evento.testo));
  passa(g, 3);
  assert.ok(Math.hypot(g.disco.x - W / 2, g.disco.y - H / 2) < 20 && g.disco.chi === null, 'ingaggio al centro dopo il gol');
}
// ---- passaggio, furto, spintone, parata ----
{
  const g = M.crea({ n: 4, opzioni: {}, bot: [null, null, null, null] }); parti(g); fermi(g);
  const [a, b, c] = [g.g[0], g.g[1], g.g[2]];
  for (const q of g.g) { q.x = 100 + q.k * 40; q.y = 60; }
  a.x = 250; a.y = 300; a.a = 0; c.x = 450; c.y = 300; g.disco.chi = 0; // lontano dalla porta: non è un tiro
  passa(g, 0.02);
  g.inp[0].tocchi++; passa(g, 0.02);
  assert.ok(g.disco.chi === null && g.disco.vx > 400 && Math.abs(g.disco.vy) < 80, 'passaggio verso il compagno (il posto 2) che si guarda');
  for (let k = 0; k < 40 && g.disco.chi === null; k++) passa(g, 0.02);
  assert.strictEqual(g.disco.chi, 2, 'il compagno lo riceve');
  // furto col tasto azione: l'avversario vicino al disco
  fermi(g);
  b.x = c.x + 40; b.y = c.y; b.a = Math.PI; b.pausa = 0;
  let rubato = false;
  for (let k = 0; k < 20 && !rubato; k++) { g.inp[1].tocchi++; passa(g, 0.04); rubato = g.disco.chi === 1; c.x = 450; c.y = 300; c.vx = c.vy = 0; b.x = c.x + 40; b.y = 300; b.vx = b.vy = 0; b.a = Math.PI; }
  assert.ok(rubato, 'col bastone sul disco l\'avversario lo ruba');
  // spintone forte: chi porta il disco lo perde
  fermi(g);
  g.disco.chi = 1; b.x = 500; b.y = 300; a.x = 476; a.y = 300; a.vx = 330; b.vx = -60;
  g.urti();
  assert.strictEqual(g.disco.chi, null, 'spintone: disco perso');
  // parata: tiro lento contro il portiere, lo blocca e poi lo passa a un compagno
  fermi(g);
  const q = g.portieri[0];
  g.disco.chi = null; g.disco.x = q.x + 60; g.disco.y = q.y; g.disco.vx = -300; g.disco.vy = 0;
  for (let k = 0; k < 20 && !q.tiene; k++) passa(g, 0.02);
  assert.ok(q.tiene > 0, 'tiro lento: il portiere lo blocca');
  passa(g, 1);
  assert.ok(q.tiene <= 0 && Math.hypot(g.disco.vx, g.disco.vy) > 200, 'poi lo passa');
}
// ---- tempo e supplementari ----
{
  const g = M.crea({ n: 2, opzioni: { durata: 2 }, bot: [null, null] }); parti(g);
  assert.strictEqual(g.durata, 120);
  g.tempoRound = 120; g.gol = [1, 1];
  assert.ok(!g.passo(0.02) && g.supplementari, 'parità: supplementari');
  g.gol = [2, 1];
  assert.ok(g.passo(0.02), 'gol d\'oro: finita');
  g.fineRound(); g.chiudi();
  assert.ok(g.risultato.vincitori.join() === '0' && g.risultato.fazioni.length === 2);
  const h = M.crea({ n: 4, opzioni: {}, bot: [null, null, null, null] }); parti(h);
  h.tempoRound = h.durata; h.passo(0.02); h.tempoRound = h.durata + 61;
  assert.ok(h.passo(0.02), 'supplementari finiti senza gol');
  h.fineRound(); h.chiudi();
  assert.ok(h.risultato.pareggio && !h.risultato.vincitori.length);
}
// ---- partite tra computer ----
{
  const t0 = Date.now();
  const liv = ['facile', 'medio', 'difficile'];
  const vinte = { facile: 0, medio: 0, difficile: 0 }, giocate = { facile: 0, medio: 0, difficile: 0 };
  let gol = 0, partite = 0, pari = 0;
  for (const n of [2, 4]) for (let k = 0; k < 15; k++) {
    // due livelli diversi, uno per squadra
    const la = liv[k % 3], lb = liv[(k + 1) % 3];
    const bot = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? la : lb));
    const g = M.crea({ n, opzioni: { durata: 2 }, bot });
    let ora = Date.now(), passi = 0;
    while (!g.finita) {
      ora += 33; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora);
      assert.ok(++passi < 20000, 'la partita finisce');
      for (const p of g.g) assert.ok(p.x > 0 && p.x < W && p.y > 0 && p.y < H, 'i pattinatori restano in pista');
      assert.ok(g.disco.x > -5 && g.disco.x < W + 5 && g.disco.y > -5 && g.disco.y < H + 5, 'il disco resta in pista');
    }
    gol += g.gol[0] + g.gol[1]; partite++; giocate[la]++; giocate[lb]++;
    if (g.risultato.pareggio) pari++; else vinte[g.gol[0] > g.gol[1] ? la : lb]++;
    assert.strictEqual(g.risultato.fazioni.length, 2);
  }
  assert.ok(gol / partite > 1.5 && gol / partite < 15, `gol per partita: ${(gol / partite).toFixed(1)}`);
  const quota = (l) => vinte[l] / Math.max(1, giocate[l]);
  assert.ok(quota('difficile') > quota('medio') && quota('medio') > quota('facile'), JSON.stringify({ vinte, giocate }));
  console.log(`✓ Hockey su ghiaccio: pista e porte, scivolata, presa, tiro, passaggio, furto, spintone, parata, gol e ingaggio, supplementari; ${partite} partite tra computer in 2 e in 4 (${(gol / partite).toFixed(1)} gol a partita, ${pari} pari; vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile}) in ${Date.now() - t0} ms`);
}
