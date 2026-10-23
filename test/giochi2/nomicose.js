// Nomi cose città: elenchi, convalida (lettera, articolo, accenti), STOP, voto delle risposte dubbie, punti
// 20/10/5, partite intere tra computer per livello
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/nomicose');
const D = require('../../giochi2/nomicose-dati');
const { giudica, rispostePer, votoBot, LETTERE, TUTTE } = M._test;

// ---- elenchi: per ogni lettera del gioco c'è almeno una risposta nelle categorie classiche ----
for (const c of TUTTE) {
  assert.ok(D.ELENCHI[c].length >= 100, `${c}: almeno 100 parole (${D.ELENCHI[c].length})`);
  for (const w of D.ELENCHI[c]) assert.ok(/^[a-zàèéìòù' -]+$/.test(w), `${c}: «${w}» scritta bene`);
}
for (const l of LETTERE) for (const c of ['nomi', 'cose', 'citta', 'animali', 'mestieri']) assert.ok(D.ELENCHI[c].some((w) => D.normalizza(w)[0] === l), `${c} con la ${l}`);
// ---- convalida ----
assert.strictEqual(giudica('citta', 'l', "L'Aquila"), 'ok');
assert.strictEqual(giudica('citta', 'l', 'la spezia'), 'ok');
assert.strictEqual(giudica('citta', 'f', 'Forlì'), 'ok');
assert.strictEqual(giudica('animali', 'c', 'il Cane'), 'ok', 'articolo ignorato');
assert.strictEqual(giudica('animali', 'c', ''), 'vuota');
assert.strictEqual(giudica('animali', 'c', 'gatto'), 'no', 'lettera sbagliata');
assert.strictEqual(giudica('cose', 'c', 'cappellino'), 'dubbia');
assert.ok(votoBot('cose', 'cappellino'), 'parola vera: il computer la accetta');
assert.ok(!votoBot('cose', 'cane'), 'un animale non è una cosa');
assert.ok(!votoBot('cose', 'cxzq'), 'parola inventata');
// ---- un giro tra due persone: STOP, voto, punti ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: { categorie: 'classiche', round: 3 }, bot: [null, null] });
  g.lettera = 'c';
  g.lettere = ['c', ...g.lettere.filter((l) => l !== 'c')]; // la C è la lettera di questo giro: nei giri dopo non torna
  assert.ok(g.azione(0, { tipo: 'stop' }).errore, 'STOP solo con tutte le caselle piene');
  const mie = { nomi: 'Carlo', cose: 'cappellino', citta: 'Como', animali: 'cane', frutta: 'ciliegia', mestieri: 'cuoco' };
  for (const [cat, testo] of Object.entries(mie)) assert.ok(g.azione(0, { tipo: 'risposta', cat, testo }).ok);
  g.azione(1, { tipo: 'risposta', cat: 'nomi', testo: 'Carlo' });
  g.azione(1, { tipo: 'risposta', cat: 'citta', testo: 'Cagliari' });
  g.azione(1, { tipo: 'risposta', cat: 'animali', testo: 'gatto' });
  const v = g.vista(1);
  assert.ok(!JSON.stringify(v).includes('Carlo') || v.mie.nomi === 'Carlo', 'si vedono solo le proprie risposte');
  assert.ok(!JSON.stringify(v.piene).includes('Carlo') && v.piene[0] === 6);
  assert.ok(g.azione(0, { tipo: 'stop' }).ok);
  assert.strictEqual(g.chiStop, 0);
  assert.ok(g.fine - Date.now() <= 10000);
  g.fine = 0; g.controllaTempo();
  assert.strictEqual(g.fase, 'voto', 'cappellino è dubbia: si vota');
  assert.ok(g.azione(0, { tipo: 'voto', posto: 0, cat: 'cose', si: true }).errore, 'la propria non si vota');
  assert.ok(g.azione(0, { tipo: 'voto', posto: 1, cat: 'nomi', si: true }).errore, 'Carlo è già valido');
  assert.ok(g.azione(1, { tipo: 'voto', posto: 0, cat: 'cose', si: false }).ok);
  g.azione(0, { tipo: 'conferma' });
  assert.strictEqual(g.fase, 'voto');
  g.azione(1, { tipo: 'conferma' });
  assert.strictEqual(g.fase, 'punti');
  const c0 = g.esito.celle[0], c1 = g.esito.celle[1];
  assert.strictEqual(c0.nomi, 5, 'Carlo tutti e due: 5');
  assert.strictEqual(c1.nomi, 5);
  assert.strictEqual(c0.citta, 10, 'città diverse: 10');
  assert.strictEqual(c1.citta, 10);
  assert.strictEqual(c0.cose || 0, 0, 'cappellino bocciato dal voto');
  assert.strictEqual(c0.animali, 20, "unico animale valido (gatto ha la lettera sbagliata): 20");
  assert.strictEqual(c0.frutta, 20);
  assert.deepStrictEqual(g.esito.punti, [5 + 10 + 20 + 20 + 20, 15]);
  g.azione(0, { tipo: 'pronto' }); g.azione(1, { tipo: 'pronto' });
  assert.strictEqual(g.round, 2);
  assert.notStrictEqual(g.lettera, 'c');
}
// ---- da soli: niente voto, decide il gioco ----
{
  const g = M.crea({ n: 1, primo: 0, opzioni: {}, bot: [null] });
  g.lettera = 'c';
  g.azione(0, { tipo: 'risposta', cat: 'cose', testo: 'cappellino' });
  g.azione(0, { tipo: 'risposta', cat: 'nomi', testo: 'Cxzqw' });
  g.fine = 0; g.controllaTempo();
  assert.strictEqual(g.fase, 'punti');
  assert.strictEqual(g.esito.celle[0].cose, 10);
  assert.strictEqual(g.esito.celle[0].nomi, 10, 'i nomi non li può sapere tutti: valgono');
}
// ---- computer: partite intere ----
{
  const t0 = Date.now();
  const tot = { facile: 0, medio: 0, difficile: 0 }, vinte = { facile: 0, medio: 0, difficile: 0 };
  const N = 200;
  for (let k = 0; k < N; k++) {
    const g = M.crea({ n: 3, primo: 0, opzioni: { categorie: ['classiche', 'miste', 'tutte'][k % 3], round: 3 }, bot: ['facile', 'medio', 'difficile'] });
    let giri = 0;
    while (!g.finita && giri++ < 50) {
      if (g.fase === 'scrivi') { g.inizio -= g.durata; g.controllaTempo(); g.fine = 0; } else if (g.fase === 'voto') g.fineVoto = 0; else g.finePunti = 0;
      g.controllaTempo();
    }
    assert.ok(g.finita, 'la partita finisce');
    ['facile', 'medio', 'difficile'].forEach((l, i) => { tot[l] += g.punti[i]; if (g.risultato.vincitori.includes(i)) vinte[l]++; });
  }
  const r = rispostePer(['nomi', 'cose', 'citta'], 'm', 'difficile');
  for (const [c, w] of Object.entries(r)) assert.strictEqual(giudica(c, 'm', w), 'ok');
  console.log(`✓ Nomi cose città: elenchi (${TUTTE.map((c) => D.ELENCHI[c].length).join('/')}), lettera, articoli, STOP, voto, punti 20/10/5; ${N} partite tra computer: vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
  assert.ok(tot.difficile > tot.medio && tot.medio > tot.facile);
}
