// Non t'arrabbiare: uscita col 6, ritiro col 6, mangiare, arrivo esatto, obblighi, partite tra computer
const assert = require('assert');
const M = require('../../giochi2/ludo');
const VELOCE = !!process.env.TEST_VELOCE;
const { assoluta } = M._test;

// tiri del dado decisi dal test
const conDadi = (seq, fn) => {
  const orig = Math.random;
  let i = 0;
  Math.random = () => (i < seq.length ? (seq[i++] - 1) / 6 + 0.01 : orig());
  try { return fn(); } finally { Math.random = orig; }
};
const nuova = (n = 2, opzioni = {}) => M.crea({ n, primo: 0, opzioni, bot: new Array(n).fill(null) });

// ---- inizio: si esce solo col 6, 3 tentativi, col 6 si ritira ----
{
  const g = nuova(2);
  assert.deepStrictEqual(g.colore, [0, 2], 'in due ci si mette di fronte');
  assert.ok(g.azione(1, { tipo: 'tira' }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'muovi', pedina: 0 }).errore, 'prima si tira');
  assert.ok(g.azione(0, null).errore);
  assert.ok(g.azione(0, { tipo: 'boh' }).errore);
  conDadi([3], () => g.azione(0, { tipo: 'tira' }));
  assert.strictEqual(g.turno, 0, 'primo tentativo fallito: ritira');
  conDadi([2], () => g.azione(0, { tipo: 'tira' }));
  assert.strictEqual(g.turno, 0);
  conDadi([5], () => g.azione(0, { tipo: 'tira' }));
  assert.ok(g.inAttesa && g.fase === 'passa', 'al terzo tentativo fallito il turno passa');
  assert.ok(g.azione(0, { tipo: 'tira' }).errore, 'durante la pausa non si gioca');
  g.avanza();
  assert.strictEqual(g.turno, 1);
  conDadi([6], () => g.azione(1, { tipo: 'tira' }));
  assert.strictEqual(g.fase, 'muovi');
  assert.strictEqual(g.mosse.length, 4, 'col 6 può uscire con una qualunque delle 4 pedine');
  assert.ok(g.azione(1, { tipo: 'muovi', pedina: 7 }).errore, 'pedina non valida');
  assert.ok(g.azione(1, { tipo: 'muovi', pedina: 'x' }).errore);
  assert.ok(g.azione(1, { tipo: 'muovi', pedina: 2 }).ok);
  assert.strictEqual(g.pos[1][2], 0, 'la pedina è sulla partenza');
  assert.strictEqual(g.turno, 1, 'col 6 si tira ancora');
  assert.strictEqual(g.fase, 'tira');
  // un altro 6: la partenza è occupata da una sua pedina, quindi deve spostare quella
  conDadi([6], () => g.azione(1, { tipo: 'tira' }));
  assert.deepStrictEqual(g.mosse.map((m) => m.k), [2], 'prima si libera la partenza');
  g.azione(1, { tipo: 'muovi', pedina: 2 });
  conDadi([4], () => g.azione(1, { tipo: 'tira' }));
  assert.deepStrictEqual(g.mosse.map((m) => m.k), [2]);
  g.azione(1, { tipo: 'muovi', pedina: 2 });
  assert.strictEqual(g.pos[1][2], 10);
  assert.strictEqual(g.turno, 0, 'senza 6 il turno passa');
}

// ---- mangiare ----
{
  const g = nuova(2);
  // il rosso (colore 0) in posizione 5 = casella 5; il giallo (colore 2) in posizione 23 → casella (20 + 23) % 40 = 3
  g.pos[0] = [5, -1, -1, -1];
  g.pos[1] = [23, -1, -1, -1];
  assert.strictEqual(assoluta(2, 23), 3);
  g.turno = 1;
  conDadi([2], () => g.azione(1, { tipo: 'tira' }));
  assert.ok(g.mosse[0].mangia, 'arriva sulla pedina rossa');
  g.azione(1, { tipo: 'muovi', pedina: 0 });
  assert.strictEqual(g.pos[0][0], -1, 'la pedina mangiata torna a casa');
  assert.strictEqual(g.ultima.mangiata.posto, 0);
  assert.strictEqual(g.mangiate[1], 1);
  // uscire sulla partenza occupata da un avversario lo mangia
  const h = nuova(2);
  h.pos[1] = [20, -1, -1, -1]; // giallo sulla casella 0 = partenza del rosso
  conDadi([6], () => h.azione(0, { tipo: 'tira' }));
  assert.ok(h.mosse.every((m) => m.mangia));
  h.azione(0, { tipo: 'muovi', pedina: 1 });
  assert.strictEqual(h.pos[1][0], -1);
  // non ci si ferma su una propria pedina
  const k = nuova(2);
  k.pos[0] = [3, 5, -1, -1];
  conDadi([2], () => k.azione(0, { tipo: 'tira' }));
  assert.deepStrictEqual(k.mosse.map((m) => m.k), [1], 'la pedina 0 non può andare sulla 1');
}

// ---- arrivo: numero esatto, niente scavalcamenti ----
{
  const g = nuova(2);
  g.pos[0] = [38, 43, -1, -1];
  conDadi([5], () => g.azione(0, { tipo: 'tira' }));
  // 38 + 5 = 43: occupata dalla sua pedina → non può; nessun'altra mossa (in casa serve il 6)
  assert.strictEqual(g.mosse.length, 0);
  const h = nuova(2);
  h.pos[0] = [38, 41, -1, -1];
  conDadi([5], () => h.azione(0, { tipo: 'tira' }));
  assert.strictEqual(h.mosse.length, 0, 'non si scavalca la propria pedina nell\'arrivo');
  conDadi([1], () => { h.fase = 'tira'; h.inAttesa = false; h.turno = 0; h.azione(0, { tipo: 'tira' }); });
  assert.deepStrictEqual(h.mosse.map((m) => [m.k, m.a]).sort(), [[0, 39], [1, 42]].sort());
  const e = nuova(2);
  e.pos[0] = [37, -1, -1, -1];
  conDadi([6], () => e.azione(0, { tipo: 'tira' }));
  // col 6 deve uscire (obbligo), non può muovere la 37
  assert.ok(e.mosse.every((m) => m.da === -1));
  const f = nuova(2);
  f.pos[0] = [39, 40, 41, 42];
  conDadi([5], () => f.azione(0, { tipo: 'tira' }));
  assert.strictEqual(f.mosse.length, 0, 'con 5 andrebbe oltre l\'ultima casella');
  const s = nuova(2, { esatto: 'no' });
  s.pos[0] = [39, 41, 42, 43];
  conDadi([5], () => s.azione(0, { tipo: 'tira' }));
  assert.deepStrictEqual(s.mosse.map((m) => m.a), [40], 'senza numero esatto si ferma nella casella libera più avanti');
  s.azione(0, { tipo: 'muovi', pedina: 0 });
  assert.ok(s.finita && s.risultato.vincitori[0] === 0, 'tutte arrivate: vince');
  assert.strictEqual(s.risultato.fazioni[0].punti, 4);
}

// ---- opzioni: 2 pedine, un solo tentativo ----
{
  const g = nuova(3, { pedine: 2, tretiri: 'no' });
  assert.strictEqual(g.pos[0].length, 2);
  assert.deepStrictEqual(g.colore, [0, 1, 2]);
  conDadi([4], () => g.azione(0, { tipo: 'tira' }));
  assert.ok(g.inAttesa, 'un solo tentativo');
}

// ---- il computer difficile evita i rischi e mangia ----
{
  const g = nuova(2);
  g.pos[0] = [10, 20, -1, -1];
  g.pos[1] = [8, -1, -1, -1]; // giallo sulla casella 28 = posizione 28 del rosso
  // con 4: la pedina 20 può arrivare a 24 (4 caselle davanti al giallo: rischio) o mangiare? 20+4=24 no;
  // la 10 arriva a 14. Il giallo è in 28 assoluta: davanti a lui (29..34) è pericoloso
  conDadi([4], () => g.azione(0, { tipo: 'tira' }));
  const scelta = M.bot(g, 0, 'difficile');
  assert.ok(g.mosse.some((m) => m.k === scelta.pedina));
  const h = nuova(2);
  h.pos[0] = [10, 26, -1, -1];
  h.pos[1] = [8, -1, -1, -1]; // in 28 assoluta
  conDadi([2], () => h.azione(0, { tipo: 'tira' }));
  assert.strictEqual(M.bot(h, 0, 'difficile').pedina, 1, 'mangia la pedina avversaria');
}

// ---- partite complete tra computer ----
{
  const LIV = ['facile', 'medio', 'difficile'];
  const t0 = Date.now();
  const righe = [];
  for (const n of [2, 3, 4]) {
    const N = VELOCE ? 150 : 400;
    const vinte = { facile: 0, medio: 0, difficile: 0 }, giocate = { facile: 0, medio: 0, difficile: 0 };
    let mosseTot = 0;
    for (let i = 0; i < N; i++) {
      const liv = Array.from({ length: n }, (_, k) => LIV[(i + k) % 3]);
      const opzioni = { esatto: i % 5 === 0 ? 'no' : 'si', pedine: i % 7 === 0 ? 3 : 4, tretiri: i % 9 === 0 ? 'no' : 'si' };
      const g = M.crea({ n, primo: i % n, opzioni, bot: liv });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 20000, 'la partita finisce');
        if (g.inAttesa) { g.avanza(); continue; }
        const t = g.turno;
        const a = M.bot(g, t, liv[t]);
        const r = g.azione(t, a);
        assert.ok(r.ok, `mossa del computer rifiutata: ${r.errore}`);
        mosseTot++;
        // controlli di coerenza: due pedine dello stesso colore mai sulla stessa casella, nessuna pedina sulla stessa casella del percorso
        const occupate = new Map();
        for (let q = 0; q < n; q++) {
          const arr = g.pos[q].filter((x) => x >= 40);
          assert.strictEqual(new Set(arr).size, arr.length, 'caselle di arrivo doppie');
          g.pos[q].forEach((x) => {
            assert.ok(x >= -1 && x <= 43);
            if (x >= 0 && x < 40) { const c = assoluta(g.colore[q], x); assert.ok(!occupate.has(c), 'due pedine sulla stessa casella'); occupate.set(c, q); }
          });
        }
      }
      for (const l of liv) giocate[l]++;
      vinte[liv[g.risultato.vincitori[0]]]++;
      assert.strictEqual(g.risultato.fazioni[g.risultato.vincitori[0]].punti, g.npd);
    }
    const q = (l) => vinte[l] / giocate[l];
    // nel ludo conta molto il dado: difficile e medio sono vicini, si chiede solo che difficile non sia peggio di medio (con un 10% di margine per il caso)
    assert.ok(q('difficile') >= q('medio') * 0.9 && q('medio') > q('facile') && q('difficile') > q('facile'), `in ${n}: difficile ${vinte.difficile}, medio ${vinte.medio}, facile ${vinte.facile}`);
    righe.push(`${n} giocatori ${N} partite (vinte: difficile ${vinte.difficile}, medio ${vinte.medio}, facile ${vinte.facile})`);
  }
  console.log(`✓ Non t'arrabbiare: uscita col 6, ritiro, mangiare, arrivo esatto e obblighi; ${righe.join('; ')} in ${Date.now() - t0} ms`);
}
