// DRAGHI E SEGRETE, in più sullo stesso computer (a turni): i posti del computer diventano posti locali di chi ha
// aperto il tavolo, le azioni con "per" valgono per quel giocatore, il master parte solo quando hanno scritto tutti,
// i comandi di chi ha aperto il tavolo valgono anche per i locali e in tempo reale l'opzione non c'è.
const assert = require('assert');
const G = require('../../giochi3/draghi');

const aspetta = () => new Promise((r) => setImmediate(r));

(async () => {
  const t0 = Date.now();
  const g = G.crea({ n: 3, bot: [null, 'medio', 'medio'], opzioni: { stessoPc: 3 } });
  g.chiave = ''; // niente Gemini: master di riserva
  assert.deepStrictEqual(g.locali, [0, 1, 2], 'tre posti sullo stesso computer');
  assert.ok(g.bot.every((b) => !b), 'i posti locali non li gioca il computer');
  assert.deepStrictEqual(g.attesi(), [0], 'il server aspetta solo chi ha il computer');
  assert.deepStrictEqual(g.attesiTutti(), [0, 1, 2]);
  // creazione per conto di ciascuno
  for (const k of [0, 1, 2]) {
    if (k === 2) assert.ok(!g.azione(0, { tipo: 'idea', testo: 'una stazione abbandonata', per: 1 }).errore, 'i comandi di chi ha il computer valgono per i locali');
    assert.ok(!g.azione(0, { tipo: 'crea', casuale: true, scelte: {}, per: k }).errore, `crea ${k}`);
  }
  assert.ok(g.pg.every(Boolean), 'tre personaggi creati dallo stesso computer');
  const v = g.vista(0);
  assert.deepStrictEqual(Object.keys(v.perPosto).map(Number), [0, 1, 2], 'la vista porta i dati di ogni posto locale');
  assert.strictEqual(v.perPosto[2].mioPg, g.pg[2].uid);
  assert.strictEqual(g.vista(1).perPosto, null, 'gli altri posti non vedono i dati locali');
  // "per" vale solo per i posti locali e solo da chi ha il computer
  assert.ok(g.eHost(2) && !g.eHost(5));
  for (let k = 0; k < 5 && g.fase === 'creazione'; k++) { await aspetta(); g.controllaTempo(); }
  if (g.fase === 'creazione') g.azione(0, { tipo: 'inizia' });
  for (let k = 0; k < 20 && (g.fase !== 'avventura' || g.attesaIA); k++) { await aspetta(); g.controllaTempo(); }
  assert.strictEqual(g.fase, 'avventura');
  // il master parte solo dopo l'ultima dichiarazione
  g.azione(0, { tipo: 'dichiara', testo: 'apro la porta', per: 0 });
  assert.ok(!g.attesaIA && g.dichiarazioni[0], 'dopo il primo il master aspetta');
  g.azione(0, { tipo: 'dichiara', testo: 'guardo in giro', per: 1 });
  assert.ok(!g.attesaIA && g.dichiarazioni[1], 'dopo il secondo il master aspetta ancora');
  g.azione(0, { tipo: 'dichiara', testo: 'resto di guardia', per: 2 });
  assert.ok(g.attesaIA || g.rispostaIA || g.storia.length, 'dopo il terzo parte il master');
  assert.ok(['apro la porta', 'guardo in giro', 'resto di guardia'].every((t) => g.racconto.some((d) => d.tipo === 'azione' && d.testo === t)), 'tre dichiarazioni nel racconto');
  // con una persona sola o in tempo reale non c'è niente da passarsi
  assert.deepStrictEqual(G.crea({ n: 3, bot: [null, 'medio', 'medio'], opzioni: {} }).locali, []);
  assert.deepStrictEqual(G.crea({ n: 3, bot: [null, 'medio', 'medio'], opzioni: { stessoPc: 3, modalita: 'reale', ambientazione: 'sevastopol' } }).locali, []);
  const due = G.crea({ n: 3, bot: [null, 'medio', 'medio'], opzioni: { stessoPc: 2 } });
  assert.deepStrictEqual(due.locali, [0, 1]); assert.ok(due.bot[2], 'il terzo resta al computer');
  console.log(`✓ Draghi e Segrete sullo stesso computer: posti locali, azioni per conto di ciascuno, master dopo l'ultima dichiarazione, niente in tempo reale (${Date.now() - t0} ms)`);
})().catch((e) => { console.error(e); process.exit(1); });
