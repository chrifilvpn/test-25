// Gioco dell'oca: oche a catena, primo tiro col 9, ponte, locanda, pozzo, labirinto, prigione, scheletro, rimbalzo
const assert = require('assert');
const M = require('../../giochi2/oca');
const VELOCE = !!process.env.TEST_VELOCE;
const nuova = (n = 2, opzioni = {}) => M.crea({ n, primo: 0, opzioni, bot: new Array(n).fill(null) });
const fine = (g) => { if (g.inAttesa) g.avanza(); };

// ---- primo tiro: 9 con 6+3 al 26, con 5+4 al 53 ----
{
  const g = nuova(2);
  g.tira(0, [6, 3]);
  assert.strictEqual(g.pos[0], 26);
  fine(g);
  g.tira(1, [4, 5]);
  assert.strictEqual(g.pos[1], 53);
  fine(g);
  // non al primo tiro: 9 è un'oca → 18 è un'oca → 27 è un'oca → 36 è un'oca → 45 …
  const h = nuova(2);
  h.tiri[0] = 1;
  h.tira(0, [6, 3]);
  assert.strictEqual(h.pos[0], 63, 'di oca in oca fino al 63');
  assert.ok(h.finita && h.risultato.vincitori[0] === 0);
}

// ---- oca semplice, ponte, labirinto, scheletro ----
{
  const g = nuova(2);
  g.tira(0, [3, 2]); // 5 è oca → 10
  assert.strictEqual(g.pos[0], 10);
  assert.deepStrictEqual(g.ultimo.passi.map((x) => x.c), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  fine(g);
  g.tira(1, [4, 2]); // ponte → 12
  assert.strictEqual(g.pos[1], 12);
  assert.ok(g.ultimo.passi[g.ultimo.passi.length - 1].salto);
  fine(g);
  g.pos[0] = 39; g.tira(0, [1, 2]); // 42 → 39
  assert.strictEqual(g.pos[0], 39, 'labirinto');
  fine(g);
  g.pos[1] = 55; g.tira(1, [1, 2]); // 58 → 0
  assert.strictEqual(g.pos[1], 0, 'scheletro');
  fine(g);
}

// ---- rimbalzo sul 63, anche su un'oca ----
{
  const g = nuova(2);
  g.tiri = [1, 1];
  g.pos[0] = 60; g.tira(0, [3, 2]); // 60 + 5 = 65 → 61
  assert.strictEqual(g.pos[0], 61);
  fine(g);
  g.pos[1] = 56; g.tira(1, [6, 5]); // 56 + 11 = 67 → 59 (oca) → indietro di 11 → 48
  assert.strictEqual(g.pos[1], 48);
  fine(g);
}

// ---- locanda, pozzo, prigione, casella occupata ----
{
  const g = nuova(3);
  g.tiri = [1, 1, 1];
  g.pos[0] = 15; g.tira(0, [2, 2]); // 19 locanda
  assert.strictEqual(g.fermo[0], 1);
  fine(g);
  assert.strictEqual(g.turno, 1);
  g.pos[1] = 27 - 0; g.pos[1] = 28; g.tira(1, [2, 1]); // 31 pozzo
  assert.strictEqual(g.bloccato[1], 'pozzo');
  fine(g);
  assert.strictEqual(g.turno, 2);
  g.pos[2] = 30; g.tira(2, [1, 0]); // 31: libera il secondo
  assert.strictEqual(g.bloccato[1], null);
  assert.strictEqual(g.bloccato[2], 'pozzo');
  fine(g);
  assert.strictEqual(g.turno, 1, 'il primo salta il turno (locanda), il secondo è libero');
  assert.strictEqual(g.fermo[0], 0);
  // casella occupata: chi c'era torna dove era partito chi arriva
  g.pos[0] = 20; g.pos[1] = 22;
  g.tira(1, [0, 0]); // fermo: non cambia niente (stessa casella di partenza)
  fine(g);
  const h = nuova(2);
  h.tiri = [1, 1];
  h.pos = [20, 24];
  h.tira(0, [2, 2]);
  assert.deepStrictEqual(h.pos, [24, 20]);
  assert.strictEqual(h.ultimo.spostati.length, 1);
  const k = nuova(2, { scambio: 'no', locanda: 3 });
  k.tiri = [1, 1];
  k.pos = [20, 24];
  k.tira(0, [2, 2]);
  assert.deepStrictEqual(k.pos, [24, 24], 'senza scambio si sta insieme');
  fine(k);
  k.pos[1] = 16; k.tira(1, [2, 1]);
  assert.strictEqual(k.fermo[1], 3);
  // due giocatori, entrambi bloccati: si liberano
  const b = nuova(2);
  b.tiri = [1, 1];
  b.pos = [28, 49];
  b.tira(0, [2, 1]); fine(b);
  b.tira(1, [2, 1]); fine(b);
  assert.deepStrictEqual(b.bloccato, [null, null], 'tutti bloccati: si liberano');
}

// ---- input non valido ----
{
  const g = nuova(2);
  assert.ok(g.azione(1, { tipo: 'tira' }).errore);
  assert.ok(g.azione(0, null).errore);
  assert.ok(g.azione(0, { tipo: 'muovi' }).errore);
  assert.ok(g.azione(0, { tipo: 'tira' }).ok);
  assert.ok(g.azione(0, { tipo: 'tira' }).errore, 'durante la camminata non si tira');
}

// ---- partite complete ----
{
  const t0 = Date.now();
  let tot = 0;
  for (let n = 2; n <= 6; n++) {
    const N = VELOCE ? 100 : 300;
    for (let i = 0; i < N; i++) {
      const g = M.crea({ n, primo: i % n, opzioni: { scambio: i % 2 ? 'si' : 'no', locanda: i % 3 ? 1 : 3 }, bot: new Array(n).fill(null) });
      let k = 0;
      while (!g.finita) {
        assert.ok(++k < 20000, 'la partita finisce');
        if (g.inAttesa) { assert.ok(g.pausaMs > 0 && g.pausaMs <= 9000); g.avanza(); continue; }
        const t = g.turno;
        assert.ok(!g.bloccato[t], 'chi è bloccato non tira');
        const r = g.azione(t, M.bot(g, t, 'medio'));
        assert.ok(r.ok, r.errore);
        assert.ok(g.pos.every((x) => x >= 0 && x <= 63));
        assert.ok(!g.pos.some((x) => x === 42 || x === 58 || x === 6), 'mai fermi su labirinto, scheletro o ponte');
      }
      assert.strictEqual(g.pos[g.risultato.vincitori[0]], 63);
      tot++;
    }
  }
  console.log(`✓ Gioco dell'oca: oche a catena, primo tiro col 9, ponte, locanda, pozzo, prigione, labirinto, scheletro, rimbalzo; ${tot} partite da 2 a 6 giocatori in ${Date.now() - t0} ms`);
}
