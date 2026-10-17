// Anagrammi a squadre: parole e mescolate valide, squadre pari/dispari, parola trovata per tutta la squadra,
// altri anagrammi validi, aiuti, bonus della prima squadra, fine round, partite intere tra computer
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/anagrammi');
const D = require('../../giochi2/paroliere-dati');
const { PAROLE, anagramma, mazzo, chiave } = M._test;

assert.ok(PAROLE.length > 2000, `tante parole (${PAROLE.length})`);
for (let k = 0; k < 300; k++) {
  const w = PAROLE[Math.floor(Math.random() * PAROLE.length)];
  const m = anagramma(w);
  assert.strictEqual(chiave(m), chiave(w), 'stesse lettere');
  assert.notStrictEqual(m, w, 'mescolata davvero');
  assert.ok(!D.esiste(m), `la mescolata ${m} non è già una parola`);
}
for (const n of [6, 8, 10]) {
  const z = mazzo(n);
  assert.strictEqual(z.length, n);
  assert.strictEqual(new Set(z.map((x) => x.chiave)).size, n, 'niente parole con le stesse lettere');
  assert.ok(z.every((x, i) => i === 0 || x.parola.length >= z[i - 1].parola.length), 'dalle corte alle lunghe');
}
// ---- una partita in quattro: squadre, prove, aiuti ----
{
  const g = M.crea({ n: 4, primo: 0, opzioni: { parole: 6, round: 1 }, bot: [null, null, null, null] });
  assert.deepStrictEqual(g.membri, [[0, 2], [1, 3]]);
  const x0 = g.parole[0];
  assert.ok(g.azione(0, { tipo: 'prova', parola: 'abc' }).errore, 'troppo corta');
  assert.ok(g.azione(0, { tipo: 'prova', parola: 'zzzzzz' }).errore, 'lettere di nessuna parola');
  // aiuto: toglie 2 punti e la soluzione deve cominciare così
  assert.ok(g.azione(1, { tipo: 'aiuto', i: 0 }).ok);
  assert.strictEqual(g.vista(1).parole[0].aiuto, x0.parola[0]);
  assert.strictEqual(g.vista(0).parole[0].aiuto, '', "l'aiuto è solo per la squadra che l'ha chiesto");
  assert.ok(g.azione(2, { tipo: 'prova', parola: x0.parola.toUpperCase() }).ok);
  const v0 = g.vista(0);
  assert.ok(v0.parole[0].trovata && v0.parole[0].chi === 2, 'trovata per tutta la squadra');
  assert.strictEqual(v0.parole[0].punti, x0.parola.length + 3, 'prima squadra: +3');
  assert.ok(g.azione(0, { tipo: 'prova', parola: x0.parola }).errore, 'già trovata');
  const v1 = g.vista(1);
  assert.ok(!v1.parole[0].trovata && v1.parole[0].soluzione === null && v1.parole[0].altre[0] === true, "l'altra squadra vede solo il segno");
  assert.ok(!JSON.stringify(v1.parole.map((x) => x.soluzione)).includes(x0.parola));
  assert.ok(g.azione(3, { tipo: 'prova', parola: x0.parola }).ok);
  assert.strictEqual(g.stato[1][0].punti, x0.parola.length - 2, 'seconda squadra con un aiuto: lettere −2');
  // tutte le parole a tutte e due le squadre: il round finisce subito
  for (let i = 1; i < g.parole.length; i++) { g.azione(0, { tipo: 'prova', parola: g.parole[i].parola }); g.azione(1, { tipo: 'prova', parola: g.parole[i].parola }); }
  assert.strictEqual(g.fase, 'fine');
  assert.ok(g.vista(1).parole.every((x) => x.soluzione), 'a fine round si vedono le soluzioni');
  g.azione(0, { tipo: 'pronto' }); g.azione(1, { tipo: 'pronto' }); g.azione(2, { tipo: 'pronto' }); g.azione(3, { tipo: 'pronto' });
  assert.ok(g.finita && g.risultato.vincitori.join() === '0,2', 'Sole ha più punti');
}
// ---- un altro anagramma valido ----
{
  const g = M.crea({ n: 1, primo: 0, opzioni: {}, bot: [null] });
  g.parole[0] = { parola: 'carne', lettere: 'nreca', chiave: chiave('carne') };
  const altra = ['cerna', 'nacre', 'crena'].find((w) => D.esiste(w));
  assert.ok(altra, 'il dizionario ha un altro anagramma di carne');
  assert.ok(g.azione(0, { tipo: 'prova', parola: altra }).ok, `anche ${altra} vale`);
  assert.strictEqual(g.stato[0][0].come, altra);
  assert.ok(g.azione(0, { tipo: 'prova', parola: 'xcarn' }).errore);
}
// ---- computer: partite intere ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 }, tot = { facile: 0, medio: 0, difficile: 0 };
  const N = 150;
  for (let k = 0; k < N; k++) {
    // a coppie: [livello A, livello B] in 2 o 4
    const coppie = [['facile', 'medio'], ['medio', 'difficile'], ['facile', 'difficile']][k % 3];
    const quattro = k % 2 === 0;
    const bot = quattro ? [coppie[0], coppie[1], coppie[0], coppie[1]] : coppie;
    const g = M.crea({ n: bot.length, primo: 0, opzioni: { parole: [6, 8, 10][k % 3], round: 2 }, bot });
    let giri = 0;
    while (!g.finita && giri++ < 200) {
      if (g.fase === 'gioco') { g.inizio -= 15000; g.controllaTempo(); if (giri % 20 === 0) g.fine = 0; } else g.finePausa = 0;
      g.controllaTempo();
    }
    assert.ok(g.finita, 'la partita finisce');
    coppie.forEach((l, s) => { tot[l] += g.punti[s]; if (g.risultato.vincitori.includes(s)) vinte[l]++; });
  }
  console.log(`✓ Anagrammi a squadre: ${PAROLE.length} parole, mescolate valide, squadre, aiuti, bonus, ${N} partite tra computer: vittorie f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
  assert.ok(tot.difficile > tot.medio && tot.medio > tot.facile);
}
