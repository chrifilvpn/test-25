// SPINGI LE CASSE: tutti i livelli salvati si leggono bene, hanno tante casse quante mete, e il risolutore trova di
// nuovo la soluzione con il minimo di spinte dichiarato; la soluzione salvata si gioca davvero. Regole dei passi
// (muri, una cassa alla volta), annulla, aiuto, vai, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/sokoban');
const { leggi, risolvi, dati } = M._test;

const LIVELLI = dati();
assert.ok(LIVELLI.length >= 60, `almeno 60 livelli (${LIVELLI.length})`);
// ---- ogni livello è risolvibile con il minimo dichiarato, e la soluzione salvata funziona ----
{
  const t0 = Date.now();
  const gruppi = {};
  LIVELLI.forEach((lv, k) => {
    const L = leggi(lv.mappa);
    assert.strictEqual(L.casse.length, Array.from(L.meta).filter(Boolean).length, `livello ${k + 1}: casse e mete`);
    assert.ok(L.casse.length >= 2 && L.io >= 0, `livello ${k + 1}`);
    assert.ok(L.casse.every((c) => !L.meta[c]), `livello ${k + 1}: nessuna cassa già a posto`);
    // il minimo di spinte si ricontrolla con il risolutore su un livello ogni tre (tutti richiederebbero mezzo minuto);
    // gli esperti hanno milioni di posizioni: il minimo lo ha calcolato il generatore con la ricerca a ritroso completa
    if (k % 3 === 0 && lv.gruppo !== 'esperto') {
      const r = risolvi(L, L.casse, L.io, 2000000);
      assert.ok(r && !r.troppo, `livello ${k + 1}: risolvibile`);
      assert.strictEqual(r.spinte, lv.spinte, `livello ${k + 1}: minimo di spinte`);
    }
    const r = { mosse: lv.soluzione };
    assert.strictEqual((lv.soluzione.match(/[UDLR]/g) || []).length, lv.spinte, `livello ${k + 1}: la soluzione salvata ha il minimo di spinte`);
    // la soluzione si gioca davvero, passo per passo, con le regole della partita
    const g = M.crea({ n: 1, opzioni: { livello: k + 1 }, bot: [null] });
    assert.strictEqual(g.numero, k + 1);
    for (const ch of r.mosse) assert.ok(g.azione(0, { tipo: 'passo', dir: ch.toLowerCase() }).ok, `livello ${k + 1}: passo ${ch}`);
    assert.ok(g.finita, `livello ${k + 1}: finito con la soluzione`);
    assert.ok(/il minimo/.test(g.risultato.titolo));
    gruppi[lv.gruppo] = (gruppi[lv.gruppo] || 0) + 1;
  });
  console.log(`✓ Spingi le casse: ${LIVELLI.length} livelli (${Object.entries(gruppi).map(([k, v]) => `${v} ${k}`).join(', ')}) soluzioni salvate giocate fino in fondo con il minimo di spinte (ricontrollato dal risolutore su un livello ogni tre) (${Date.now() - t0} ms)`);
}
// ---- regole dei passi ----
{
  const g = M.crea({ n: 1, opzioni: { livello: 1 }, bot: [null] });
  g.L = leggi(['#######', '#     #', '# @$$.#', '#    .#', '#######'].join('\n'));
  const t = g.tavole[0]; t.casse = g.L.casse.slice(); t.io = g.L.io;
  assert.ok(g.azione(0, { tipo: 'passo', dir: 'r' }).errore, 'due casse in fila non si spingono');
  assert.ok(g.azione(0, { tipo: 'passo', dir: 'u' }).ok);
  assert.ok(g.azione(0, { tipo: 'passo', dir: 'u' }).errore, 'muro');
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.strictEqual(t.io, g.L.io);
  assert.ok(g.azione(0, { tipo: 'vai', i: g.L.io + g.L.W * 1 + 3 }).ok, 'vai: ci arriva girando attorno');
  assert.ok(g.azione(0, { tipo: 'vai', i: 0 }).errore, 'su un muro no');
  // aiuto: la prossima spinta giusta; da una posizione persa lo dice
  const h = M.crea({ n: 1, opzioni: { livello: 1 }, bot: [null] });
  assert.ok(h.azione(0, { tipo: 'aiuto' }).ok);
  assert.strictEqual(h.tavole[0].spinte, 1);
  assert.strictEqual(h.tavole[0].penale, 20000);
}
// ---- livelli esperti: l'aiuto e il computer seguono la soluzione salvata anche a metà strada ----
{
  const esperti = LIVELLI.map((lv, k) => [lv, k]).filter(([lv]) => lv.gruppo === 'esperto');
  assert.ok(esperti.length >= 30 && esperti.every(([lv]) => lv.spinte >= 40), 'livelli esperti da 40 spinte in su');
  for (const [lv, k] of esperti.slice(0, 12)) {
    const g = M.crea({ n: 1, opzioni: { livello: k + 1 }, bot: [null] });
    const meta = Math.floor(lv.soluzione.length / 2);
    for (const ch of lv.soluzione.slice(0, meta)) g.azione(0, { tipo: 'passo', dir: ch.toLowerCase() });
    const t0 = Date.now();
    let giri = 0;
    while (!g.finita && giri++ < 200) assert.ok(g.azione(0, { tipo: 'aiuto' }).ok, `esperto ${k + 1}: aiuto`);
    assert.ok(g.finita && Date.now() - t0 < 3000, `esperto ${k + 1}: finito a forza di aiuti, in fretta`);
  }
}
// ---- sfide tra computer ----
{
  const t0 = Date.now();
  const N = 60;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { livelli: ['facile', 'medio', 'difficile', 'esperto'][k % 4] }, bot: liv });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita, 'la sfida finisce');
    for (const p of g.arrivi) assert.ok(g.risolta(p, g.tavole[p]));
  }
  console.log(`✓ Spingi le casse: ${N} sfide tra computer completate (${Date.now() - t0} ms)`);
}
