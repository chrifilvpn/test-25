// CALCIO BALILLA: stecche, chi comanda cosa (1 contro 1 e 2 contro 2), tiro, rimbalzi, gol, rimessa, e tante partite
// complete tra computer.
const assert = require('assert');
// caso ripetibile: le partite tra computer danno sempre lo stesso esito
{ let s = 20251017; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const { GIOCHI } = require('../../giochi');
const M = GIOCHI.calcetto;
const { STECCHE, W, H, PORTA } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 25; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.025); k++) { g.tempoRound += 0.025; if (g.passo(0.025)) return true; } return false; };

assert.strictEqual(M.meta.id, 'calcetto');
assert.deepStrictEqual(M.meta.giocatori, [2, 4]);
assert.ok(M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)));

// ---- le stecche: 8, alternate, con 1-2-5-3 omini per squadra ----
{
  assert.strictEqual(STECCHE.length, 8);
  for (const sq of [0, 1]) assert.deepStrictEqual(STECCHE.filter((s) => s.sq === sq).map((s) => s.base.length).sort(), [1, 2, 3, 5]);
  for (let i = 1; i < 8; i++) assert.ok(STECCHE[i].y < STECCHE[i - 1].y, 'dal basso verso l\'alto');
  for (const s of STECCHE) for (const b of s.base) { assert.ok(b + s.min >= 0 && b + s.max <= W, 'gli omini restano dentro'); }
  const g2 = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
  assert.ok(g2.aste.every((a) => a.chi === a.sq), 'in 2 ognuno comanda tutta la squadra');
  const g4 = M.crea({ n: 4, opzioni: {}, bot: [null, null, null, null] });
  const chi = (p) => g4.aste.filter((a) => a.chi === p).map((a) => a.ruolo).sort();
  assert.deepStrictEqual(chi(0), ['difesa', 'portiere']); assert.deepStrictEqual(chi(2), ['attacco', 'centrocampo']);
  assert.deepStrictEqual(chi(1), ['difesa', 'portiere']); assert.deepStrictEqual(chi(3), ['attacco', 'centrocampo']);
}

// ---- comandi: l'omino più vicino va dove si punta; per chi è in alto il campo è girato ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g);
  g.input(0, { mx: 150, my: 500 }); passa(g, 0.6);
  for (const a of g.aste.filter((x) => x.sq === 0)) {
    const vicino = Math.min(...g.omini(a).map((x) => Math.abs(x - 150)));
    if (a.ruolo !== 'portiere') assert.ok(vicino < 1, `${a.ruolo}: un omino in x = 150`);
  }
  const gk = g.aste.find((a) => a.sq === 0 && a.ruolo === 'portiere');
  assert.ok(gk.s >= gk.min - 1e-9 && gk.base[0] + gk.s < 200, 'il portiere va fin dove può');
  g.input(1, { mx: 150, my: 500 }); passa(g, 0.6);
  const mid = g.aste.find((a) => a.sq === 1 && a.ruolo === 'centrocampo');
  assert.ok(g.omini(mid).some((x) => Math.abs(x - (W - 150)) < 1), 'per la squadra in alto il campo è girato');
  // con le frecce
  const att = g.aste.find((a) => a.sq === 0 && a.ruolo === 'attacco'), s0 = att.s;
  g.input(0, { x: 1 }); passa(g, 0.15); g.input(0, { x: 0 });
  assert.ok(att.s > s0, 'freccia a destra: le stecche vanno a destra');
  // la stecca non va più veloce del massimo
  g.input(0, { mx: 590, my: 0 }); g.tempoRound += 0.025; g.passo(0.025);
  assert.ok(Math.abs(att.v) <= 1100 + 1);
}

// ---- tiro, rimbalzi, gol, rimessa, fine ----
{
  const g = M.crea({ n: 2, opzioni: { gol: 3 }, bot: [null, null] }); parti(g);
  const att = g.aste.find((a) => a.sq === 0 && a.ruolo === 'attacco');
  att.s = 0; att.meta = 0; g.input(0, { x: 0 }); g.mira[0] = 300;
  Object.assign(g.palla, { x: 300, y: att.y - 18, vx: 0, vy: 0 });
  g.inp[0].tocchi++; g.tempoRound += 0.025; g.passo(0.025);
  assert.ok(g.palla.vy < -1000 && Math.abs(g.palla.vx) < 200, 'il tiro manda la pallina dritta verso la porta avversaria');
  // tiro di lato: la pallina parte di lato
  Object.assign(g.palla, { x: 315, y: att.y - 18, vx: 0, vy: 0 }); att.tiro = 0;
  g.inp[0].tocchi++; g.tempoRound += 0.025; g.passo(0.025);
  assert.ok(g.palla.vx > 200, 'colpita di lato va di lato');
  // senza tiro la pallina rimbalza sull'omino
  Object.assign(g.palla, { x: 300, y: att.y + 40, vx: 0, vy: -600 }); att.tiro = 0;
  for (let k = 0; k < 6; k++) { g.tempoRound += 0.025; g.passo(0.025); }
  assert.ok(g.palla.vy > 0, 'rimbalza sull\'omino');
  // sponde
  Object.assign(g.palla, { x: 20, y: 500, vx: -800, vy: 0 }); passa(g, 0.05);
  assert.ok(g.palla.vx > 0 && g.palla.x >= 11, 'rimbalza sulla sponda');
  // fuori dalla porta il fondo è una sponda; dentro è gol
  Object.assign(g.palla, { x: 40, y: 30, vx: 0, vy: -900 }); for (const a of g.aste) a.s = a.meta = a.max; passa(g, 0.1);
  assert.ok(g.gol[0] === 0 && g.palla.vy > 0, 'fondo: rimbalza');
  Object.assign(g.palla, { x: W / 2, y: 40, vx: 0, vy: -1200 }); for (const a of g.aste) { const s = a.ruolo === 'portiere' ? a.max : a.s; a.s = a.meta = s; }
  passa(g, 0.15);
  assert.deepStrictEqual(g.gol, [1, 0], 'gol della squadra in basso');
  assert.deepStrictEqual(g.punti, [1, 0]);
  passa(g, 2);
  const midB = g.aste.find((a) => a.sq === 1 && a.ruolo === 'centrocampo');
  assert.ok(Math.abs(g.palla.y - midB.y) < 40 && g.batte === 1, 'batte chi ha subito, dal suo centrocampo');
  g.gol = [2, 2]; Object.assign(g.palla, { x: W / 2, y: H - 40, vx: 0, vy: 1500 });
  for (const a of g.aste) { a.s = a.meta = a.ruolo === 'portiere' ? a.max : a.s; }
  let fine = false; for (let k = 0; k < 200 && !fine; k++) { g.tempoRound += 0.025; fine = g.passo(0.025); }
  assert.ok(fine, 'a 3 gol finisce');
  g.chiudi();
  assert.deepStrictEqual(g.risultato.vincitori, [1]);
  assert.strictEqual(g.risultato.etichetta, 'gol');
  // la pallina ferma dove nessuno arriva si rimette in gioco
  const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(h);
  Object.assign(h.palla, { x: 10 + 1, y: 250, vx: 0, vy: 0 }); passa(h, 5);
  assert.ok(Math.hypot(h.palla.vx, h.palla.vy) > 0 || h.palla.y !== 250, 'non resta ferma per sempre');
  // in 4: le squadre
  const q = M.crea({ n: 4, opzioni: {}, bot: [null, null, null, null] }); parti(q); q.gol = [5, 1]; q.chiudi();
  assert.deepStrictEqual(q.risultato.vincitori, [0, 2]);
  assert.deepStrictEqual(q.risultato.fazioni.map((f) => f.posti), [[0, 2], [1, 3]]);
  assert.ok(JSON.stringify(q.vistaTick(0)).length < 600, 'tick piccolo');
  assert.ok(PORTA > 100);
}

// ---- partite complete tra computer ----
{
  const liv = ['facile', 'medio', 'difficile'];
  const vinte = { facile: 0, medio: 0, difficile: 0 }, sfide = {};
  let partite = 0, gol = 0;
  const t0 = Date.now();
  for (const n of [2, 4]) for (let k = 0; k < (n === 2 ? 120 : 60); k++) {
    const bot = n === 2 ? [liv[k % 3], liv[(k + 1 + Math.floor(k / 3)) % 3]] : Array.from({ length: 4 }, (_, i) => liv[(i + k) % 3]);
    const g = M.crea({ n, opzioni: { gol: k % 4 === 0 ? 5 : 3 }, bot });
    let ora = Date.now(), passi = 0;
    while (!g.finita) { ora += 25; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora); assert.ok(++passi < 200000, 'la partita finisce'); }
    assert.ok(Math.max(...g.gol) === g.obiettivo && g.risultato.vincitori.length === n / 2);
    gol += g.gol[0] + g.gol[1];
    if (n === 2 && bot[0] !== bot[1]) { const v = bot[g.risultato.vincitori[0]], p = bot[1 - g.risultato.vincitori[0]]; vinte[v]++; const c = `${v}>${p}`; sfide[c] = (sfide[c] || 0) + 1; }
    partite++;
  }
  // in più, una serie dedicata difficile contro medio (sono vicini: con poche partite il caso conterebbe troppo)
  for (let k = 0; k < 50; k++) {
    const bot = k % 2 ? ['difficile', 'medio'] : ['medio', 'difficile'];
    const g = M.crea({ n: 2, opzioni: { gol: 3 }, bot });
    let ora = Date.now();
    while (!g.finita) { ora += 25; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora); }
    const v = bot[g.risultato.vincitori[0]], c = `${v}>${v === 'medio' ? 'difficile' : 'medio'}`; sfide[c] = (sfide[c] || 0) + 1; partite++;
  }
  const batte = (a, b) => (sfide[`${a}>${b}`] || 0) > (sfide[`${b}>${a}`] || 0);
  assert.ok(batte('medio', 'facile') && batte('difficile', 'facile') && batte('difficile', 'medio'), `il più forte vince di più ${JSON.stringify(sfide)}`);
  console.log(`✓ Calcio balilla: 8 stecche alternate (1-2-5-3), comandi in 1 contro 1 e 2 contro 2, campo girato per chi è in alto, tiro dritto e di lato, rimbalzi su omini e sponde, gol e rimessa, ${partite} partite tra computer (${gol} gol; sfide ${JSON.stringify(sfide)}) in ${Date.now() - t0} ms`);
}
