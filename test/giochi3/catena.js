// CATENA DI PAROLE: regole delle parole (attacco, dizionario, niente ripetizioni, continuazione possibile), tempo e
// vite, eliminazione, gioco da soli, e tante partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
{ let s = 9; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/catena');
const D = require('../../giochi2/paroliere-dati');

// ---- regole ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  const w0 = g.ultima();
  assert.ok(D.esiste(w0) && D.fascia(w0) === 3, 'si parte da una parola comune');
  g.catena = [{ w: 'cane', chi: null }]; g.usate = new Set(['cane']);
  assert.ok(g.azione(1, { tipo: 'parola', testo: 'neve' }).errore, 'non è il suo turno');
  assert.ok(/NE/.test(g.azione(0, { tipo: 'parola', testo: 'verde' }).errore), 'deve cominciare con NE');
  assert.ok(/dizionario/.test(g.azione(0, { tipo: 'parola', testo: 'nexxo' }).errore));
  assert.ok(g.azione(0, { tipo: 'parola', testo: 'Néve' }).ok, 'maiuscole e accenti si tolgono');
  assert.strictEqual(g.turno, 1);
  g.catena.push({ w: 'vecane', chi: 0 }); g.usate.add('vecane');
  assert.ok(/già/.test(g.azione(1, { tipo: 'parola', testo: 'neve' }).errore), 'niente ripetizioni');
  assert.ok(g.azione(1, { tipo: 'parola', testo: 'nero' }).ok);
  // tempo scaduto: perde una vita, la catena continua dalla stessa parola con l'altro
  g.fineTurno = Date.now() - 1;
  assert.ok(g.controllaTempo());
  assert.strictEqual(g.vite[0], 2); assert.strictEqual(g.turno, 1); assert.strictEqual(g.ultima(), 'nero');
  g.azione(1, { tipo: 'passo' }); g.azione(0, { tipo: 'passo' }); g.azione(1, { tipo: 'passo' }); g.azione(0, { tipo: 'passo' });
  assert.ok(g.vite[0] === 0 && g.finita && g.risultato.vincitori[0] === 1, 'chi finisce le vite perde');
  // con l'ultima lettera
  const h = M.crea({ n: 1, primo: 0, opzioni: { lettere: 'una', vite: 1 } });
  h.catena = [{ w: 'cane', chi: null }]; h.usate = new Set(['cane']);
  assert.ok(h.azione(0, { tipo: 'parola', testo: 'elefante' }).ok);
  assert.strictEqual(h.turno, 0, 'da soli si continua');
  h.azione(0, { tipo: 'passo' });
  assert.ok(h.finita && h.risultato.fazioni[0].punti === 1, 'da soli conta la lunghezza della catena');
}
// ---- partite tra computer ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 };
  let parole = 0;
  const N = 150;
  for (let k = 0; k < N; k++) {
    const n = 2 + (k % 3);
    const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
    const g = M.crea({ n, primo: k % n, opzioni: { lettere: k % 4 === 0 ? 'una' : 'due', vite: k % 2 ? 1 : 3 } });
    let giri = 0;
    while (!g.finita && giri++ < 3000) {
      const p = g.turno, m = M.bot(g, p, liv[p]);
      const r = g.azione(p, m);
      assert.ok(r.ok, `parola del computer: ${JSON.stringify(m)} ${JSON.stringify(r)}`);
    }
    assert.ok(g.finita, 'la partita finisce');
    parole += g.catena.length - 1;
    vinte[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(vinte.difficile > vinte.medio && vinte.medio > vinte.facile, JSON.stringify(vinte));
  console.log(`✓ Catena di parole: attacco con una o due lettere, dizionario, niente ripetizioni, tempo e vite, da soli; ${N} partite tra computer (${parole} parole): vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
}
