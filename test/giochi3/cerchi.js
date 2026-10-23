// CERCHI A TEMPO: mappa dal seme (uguale ovunque, cerchi dentro il campo e a tempo di musica), giudizi e finestre,
// punti con la serie, precisione, ordine dei colpi, cerchi mancati da chi non risponde, computer, trucco.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi3/cerchi');
const T = require('../../giochi/trucco');
const { C, TOLLERANZA } = M._test;

// ---- mappe ----
for (const liv of ['facile', 'medio', 'difficile']) {
  const a = C.genera(123, liv, 60), b = C.genera(123, liv, 60);
  assert.deepStrictEqual(a, b, 'stesso seme, stessa mappa');
  assert.ok(a.cerchi.length > 30, `${liv}: ${a.cerchi.length} cerchi`);
  assert.ok(a.cerchi.every((c) => c.x >= 60 && c.x <= C.W - 60 && c.y >= 60 && c.y <= C.H - 60), 'dentro il campo');
  // ogni cerchio cade su un quarto di battito
  assert.ok(a.cerchi.every((c, k) => Math.abs(((c.t - C.INIZIO) / (a.battito / 4)) - Math.round((c.t - C.INIZIO) / (a.battito / 4))) < 0.05 && (!k || c.t > a.cerchi[k - 1].t)), 'a tempo e in ordine');
  assert.ok(a.cerchi.at(-1).t < 60000 && a.fine > a.cerchi.at(-1).t);
  // un cerchio non copre quello appena prima (tranne nelle raffiche da un quarto di battito)
  assert.ok(a.cerchi.every((c, k) => !k || c.t - a.cerchi[k - 1].t < a.battito / 2 - 1 || Math.hypot(c.x - a.cerchi[k - 1].x, c.y - a.cerchi[k - 1].y) >= a.raggio * 2), 'cerchi che non si coprono');
}
assert.ok(C.genera(1, 'difficile', 60).cerchi.length > C.genera(1, 'facile', 60).cerchi.length, 'il difficile ha più cerchi');
// ---- giudizi e punti ----
{
  const m = C.genera(5, 'medio', 60), [f3, f1, f5] = m.finestre;
  assert.deepStrictEqual([0, f3, -f3, f3 + 1, f1, f1 + 1, -f5, f5 + 1, null].map((d) => C.giudizio(m, d)), [0, 0, 0, 1, 1, 2, 2, 3, 3]);
  const s = C.nuovoStato();
  C.segna(s, m, 0); C.segna(s, m, 0);
  assert.strictEqual(s.punti, 300 + Math.round(300 * (1 + 1 / 25)), 'la serie fa crescere i punti');
  C.segna(s, m, null);
  assert.ok(s.serie === 0 && s.serieMax === 2 && s.prossimo === 3);
  assert.strictEqual(Math.round(C.precisione(s) * 100) / 100, 66.67);
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { difficolta: 'facile', durata: 60 }, bot: [null] });
  const cc = g.mappa.cerchi;
  assert.ok(g.vista(0).traMs > 4000 && g.vista(0).totale === cc.length);
  assert.ok(g.azione(0, { tipo: 'colpo', i: 0, d: 0 }).errore, 'prima che si veda il cerchio non vale');
  g.inizioMappa -= cc[0].t + 4000; // la musica è al primo cerchio
  assert.ok(g.azione(0, { tipo: 'colpo', i: 0, d: 5 }).ok && g.stati[0].conteggi[0] === 1);
  assert.ok(g.azione(0, { tipo: 'colpo', i: 0, d: 5 }).vecchio, 'lo stesso cerchio non conta due volte');
  assert.ok(g.azione(0, { tipo: 'colpo', i: 2, d: 5 }).vecchio, 'prima il cerchio col numero più basso');
  g.azione(0, { tipo: 'colpo', i: 1, d: 130 });
  assert.strictEqual(g.stati[0].conteggi[1], 1, '130 ms in ritardo nel facile: 100');
  // nessuna risposta: dopo la tolleranza il server segna mancato
  g.inizioMappa -= cc[3].t - cc[0].t + TOLLERANZA + 10;
  g.controllaTempo();
  assert.ok(g.stati[0].prossimo >= 3 && g.stati[0].conteggi[3] >= 1, 'i cerchi vecchi senza risposta sono mancati');
  // !win: i prossimi colpi valgono 300 anche se imprecisi
  T.arma(g, 0); g.trucco(0);
  assert.ok(!T.armato(g, 0) && g.fortuna[0] === 20);
  const i = g.stati[0].prossimo, prima = g.stati[0].conteggi[0];
  g.azione(0, { tipo: 'colpo', i, d: 150 });
  assert.strictEqual(g.stati[0].conteggi[0], prima + 1, 'con il trucco: 300');
  g.inizioMappa -= 1e6; // la musica è alla fine (senza controllaTempo nessuno segna i mancati)
  for (let k = g.stati[0].prossimo; k < cc.length; k++) g.azione(0, { tipo: 'colpo', i: k, d: 0 });
  assert.ok(g.finita && /punti · precisione \d+\.\d\d%/.test(g.risultato.titolo) && g.vista(0).posizioneRecord === 0);
}
// ---- computer e sfida ----
{
  const prec = {};
  for (const liv of ['facile', 'medio', 'difficile']) {
    const g = M.crea({ n: 1, opzioni: { difficolta: 'medio', durata: 90 }, bot: [liv] });
    const prima = g.esitoBot(0, 3, liv);
    assert.strictEqual(g.esitoBot(0, 3, liv), prima, 'stesso cerchio, stesso esito');
    g.inizioMappa -= g.mappa.fine + TOLLERANZA + 5000;
    g.controllaTempo();
    assert.ok(g.finita);
    prec[liv] = C.precisione(g.stati[0]);
  }
  assert.ok(prec.difficile > prec.medio && prec.medio > prec.facile, JSON.stringify(prec));
  const g = M.crea({ n: 3, opzioni: { difficolta: 'difficile', durata: 60 }, bot: [null, 'medio', 'difficile'] });
  g.inizioMappa -= 30000;
  assert.ok(g.controllaTempo() && g.stati[1].prossimo > 0 && g.stati[0].prossimo < g.stati[1].prossimo, 'i computer suonano da soli');
  assert.ok(g.scadenza() > 0);
  g.inizioMappa -= 60000; g.controllaTempo();
  assert.ok(g.finita && g.risultato.fazioni.length === 3 && g.stati[0].conteggi[3] === g.mappa.cerchi.length, 'chi non c\'è manca tutto');
  console.log(`✓ Cerchi a tempo: mappe dal seme a tempo di musica, giudizi 300/100/50, serie e precisione, ordine dei colpi, mancati per chi non risponde, !win; precisione dei computer f/m/d ${prec.facile.toFixed(1)}/${prec.medio.toFixed(1)}/${prec.difficile.toFixed(1)}%`);
}
