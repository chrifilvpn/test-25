// Indovina l'anno: dati (almeno 400 eventi, anni validi, nessun doppione), punti per vicinanza secondo l'epoca,
// domande simultanee a tempo, soluzione, partita completa, computer per livello
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/anno');
const { EVENTI, puntiPer, scegli, scritto } = M._test;

assert.ok(EVENTI.length >= 400, `almeno 400 eventi (${EVENTI.length})`);
const visti = new Set();
for (const e of EVENTI) {
  assert.ok(Number.isInteger(e.anno) && e.anno !== 0 && e.anno >= -3000 && e.anno <= new Date().getFullYear(), `anno valido: ${e.anno}`);
  assert.ok(['s', 'i', 'c', 'p'].includes(e.arg), `argomento: ${e.testo}`);
  assert.ok(e.testo.length > 8 && !/[?…]/.test(e.testo), `testo pulito: ${e.testo}`);
  assert.ok(!e.testo.includes(String(Math.abs(e.anno))), `il testo non dice l'anno: ${e.testo}`);
  const k = e.testo.toLowerCase();
  assert.ok(!visti.has(k), `doppione: ${e.testo}`);
  visti.add(k);
}
// ---- punti ----
assert.strictEqual(puntiPer(1969, 1969), 100);
assert.ok(puntiPer(1969, 1970) > puntiPer(1969, 1972) && puntiPer(1969, 1972) > puntiPer(1969, 1980));
assert.strictEqual(puntiPer(1969, 1999), 0, 'troppo lontano: zero');
assert.ok(puntiPer(-44, -54) > puntiPer(1944, 1954), "nell'antichità 10 anni di errore valgono di più");
assert.strictEqual(puntiPer(1969, null), 0);
for (let k = 0; k < 20000; k++) assert.notStrictEqual(M._test.rispostaBot({ anno: [-5, -1, 1, 3][k % 4] }, 'facile'), 0, 'il computer non dice mai anno zero');
assert.strictEqual(scritto(-44), '44 a.C.');
for (const arg of ['tutti', 's', 'i', 'c', 'p']) {
  const d = scegli(arg, 20);
  assert.strictEqual(d.length, 20, `20 domande per ${arg}`);
  assert.strictEqual(new Set(d.map((e) => e.id)).size, 20, 'senza ripetizioni');
  assert.ok(d.every((e) => arg === 'tutti' || e.arg === arg));
}
// ---- partita tra due persone ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { domande: 10 }, bot: [null, null] });
  g.e = { id: -1, anno: 1969, testo: 'Lo sbarco sulla Luna', arg: 'i' };
  assert.ok(g.azione(0, { tipo: 'anno', anno: 0 }).errore, 'anno zero');
  assert.ok(g.azione(0, { tipo: 'anno', anno: 3000 }).errore, 'nel futuro');
  assert.ok(g.azione(0, { tipo: 'anno', anno: 'ciao' }).errore);
  assert.ok(g.azione(0, { tipo: 'anno', anno: 1969 }).ok);
  assert.ok(g.azione(0, { tipo: 'anno', anno: 1970 }).errore, 'una risposta sola');
  const v = g.vista(1);
  assert.ok(v.altri[0].risposto && v.mia === null && v.esito === null);
  assert.ok(!JSON.stringify(v).includes('1969'), 'la risposta e la soluzione non si vedono prima del tempo');
  assert.deepStrictEqual(g.attesi(), [1]);
  assert.ok(g.azione(1, { tipo: 'anno', anno: 1972 }).ok);
  assert.strictEqual(g.fase, 'rivela');
  assert.deepStrictEqual(g.esito.punti, [100, puntiPer(1969, 1972)]);
  assert.ok(g.azione(0, { tipo: 'anno', anno: 1969 }).errore, 'nella soluzione si preme solo Avanti');
  g.azione(0, { tipo: 'pronto' }); g.azione(1, { tipo: 'pronto' });
  assert.strictEqual(g.fase, 'domanda');
  assert.strictEqual(g.k, 1);
  // tempo scaduto: chi non risponde fa zero
  g.azione(0, { tipo: 'anno', anno: g.e.anno });
  g.fine = Date.now() - 1; g.controllaTempo();
  assert.strictEqual(g.fase, 'rivela');
  assert.strictEqual(g.esito.punti[1], 0);
  for (let k = 2; k < 10; k++) { g.fineRivela = 0; g.controllaTempo(); assert.strictEqual(g.k, k); g.fine = 0; g.controllaTempo(); }
  g.fineRivela = 0; g.controllaTempo();
  assert.ok(g.finita && g.risultato.vincitori[0] === 0);
  assert.strictEqual(g.vista(0).riepilogo.length, 10);
}
// ---- computer: punti medi per livello, partite intere ----
{
  const t0 = Date.now();
  const tot = { facile: 0, medio: 0, difficile: 0 }, vinte = { facile: 0, medio: 0, difficile: 0 };
  const N = 300;
  for (let k = 0; k < N; k++) {
    const g = M.crea({ n: 3, primo: 0, opzioni: { domande: [10, 15, 20][k % 3], argomento: ['tutti', 's', 'i', 'c', 'p'][k % 5] }, bot: ['facile', 'medio', 'difficile'] });
    let giri = 0;
    while (!g.finita && giri++ < 100) {
      if (g.fase === 'domanda') g.fine = 0; else g.fineRivela = 0;
      g.controllaTempo();
      for (const r of g.fase === 'rivela' ? g.esito.risposte : []) assert.ok(Number.isInteger(r) && r !== 0, `risposta valida: ${r}`);
    }
    assert.ok(g.finita, 'la partita finisce');
    ['facile', 'medio', 'difficile'].forEach((l, i) => { tot[l] += g.punti[i]; if (g.risultato.vincitori.includes(i)) vinte[l]++; });
  }
  console.log(`✓ Indovina l'anno: ${EVENTI.length} eventi, punti per epoca, risposte simultanee, soluzione, ${N} partite tra computer: vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
  assert.ok(tot.difficile > tot.medio && tot.medio > tot.facile);
  assert.ok(vinte.difficile > N * 0.6, 'il difficile vince quasi sempre');
}
// ---- i computer rispondono durante il tempo: quando hanno risposto tutti si va subito alla soluzione ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {}, bot: [null, 'medio'] });
  g.azione(0, { tipo: 'anno', anno: 1900 });
  assert.strictEqual(g.fase, 'domanda', 'il computer non ha ancora risposto');
  g.inizio -= 60000; g.fine += 60000; // il computer è pronto ma il tempo non è finito
  g.controllaTempo();
  assert.strictEqual(g.fase, 'rivela', 'risposto anche il computer: soluzione');
}
