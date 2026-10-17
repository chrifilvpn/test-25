// Quiz di cultura generale: domande ben formate (4 risposte diverse, difficoltà), mazzi per argomento, partite
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/quiz');
const { BANCA, DOMANDE, ARGOMENTI } = M._test;

assert.ok(DOMANDE.length >= 600, `almeno 600 domande (${DOMANDE.length})`);
const testi = new Set();
for (const i of DOMANDE) {
  const e = BANCA.elementi[i];
  assert.ok(e.domanda && /[?]$/.test(e.domanda.trim()), `domanda con il punto interrogativo: ${e.domanda}`);
  assert.ok([1, 2, 3].includes(e.fama));
  const op = BANCA.scelte(i).map((k) => BANCA.elementi[k].nome);
  assert.strictEqual(op.length, 4);
  assert.strictEqual(new Set(op.map((x) => x.toLowerCase())).size, 4, `risposte tutte diverse: ${e.domanda}`);
  const chiave = `${e.domanda}|${e.nome}`;
  assert.ok(!testi.has(chiave), `domanda ripetuta: ${e.domanda}`);
  testi.add(chiave);
}
for (const a of Object.keys(ARGOMENTI)) assert.ok(BANCA.mazzi[a].length >= 60, `almeno 60 domande di ${a}`);
// partite: da soli e in sfida, con i computer
{
  let giuste = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 30; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { argomento: Object.keys(BANCA.mazzi)[k % 10], domande: 20 }, bot: liv });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 500);
      if (g.inAttesa) { g.avanza(); continue; }
      for (let p = 0; p < 3; p++) if (!g.risposte[p]) assert.ok(g.azione(p, M.bot(g, p, liv[p])).ok);
    }
    liv.forEach((l, p) => { giuste[l] += g.giuste[p]; });
  }
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] });
  assert.ok(g.azione(0, { tipo: 'risposta', scelta: 9 }).errore);
  const v = g.vista(0);
  assert.ok(v.testo && v.opzioni.length === 4 && v.giusta === null, 'la risposta giusta non si vede prima');
  console.log(`✓ Quiz: ${DOMANDE.length} domande in ${Object.keys(ARGOMENTI).length} argomenti, tutte con 4 risposte diverse; 30 sfide (giuste f/m/d ${giuste.facile}/${giuste.medio}/${giuste.difficile})`);
  assert.ok(giuste.difficile > giuste.medio && giuste.medio > giuste.facile);
}
