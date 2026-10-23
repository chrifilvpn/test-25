// COLLEGA I COLORI: generatore (una sola soluzione, controllata col risolutore completo), regole dei tubi (tagli,
// pallini degli altri, capi), livelli di fila, aiuto, trucco, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi3/collega');
const T = require('../../giochi/trucco');
const { L, LATI } = M._test;

// ---- generatore e risolutore ----
{
  for (const N of LATI) for (let k = 0; k < 4; k++) {
    const pz = L.genera(N);
    assert.ok(pz && pz.N === N, `${N}×${N}: un puzzle`);
    assert.ok(pz.coppie.length >= N - 1 && pz.coppie.length <= N + 3, `${N}×${N}: ${pz.coppie.length} colori`);
    // la soluzione riempie tutto, ogni tubo unisce i suoi pallini
    const tubi = pz.coppie.map(() => []);
    pz.soluzione.forEach((s, c) => { assert.ok(!L.traccia(N, pz.coppie, tubi, c, s).errore, 'tubo della soluzione valido'); });
    assert.ok(L.conta(N, pz.coppie, tubi).risolto, 'la soluzione risolve');
    assert.ok(pz.soluzione.every((s) => s.length >= 3 && !L.toccaSeStesso(N, s)), 'tubi di almeno 3 caselle che non si toccano da soli');
    if (N <= 7) assert.strictEqual(L.risolvi(N, pz.coppie, { max: 3, budget: 2e6 }).soluzioni.length, 1, 'una sola soluzione');
  }
  // un 3×3 a mano: un solo colore che gira tutta la griglia ha più strade, il risolutore le conta
  const giro = L.risolvi(3, [[0, 2], [3, 5], [6, 8]], { max: 5, budget: 1e5 });
  assert.strictEqual(giro.soluzioni.length, 1, 'tre righe: una sola soluzione');
  const impossibile = L.risolvi(3, [[0, 8], [2, 6]], { max: 2 });
  assert.strictEqual(impossibile.soluzioni.length, 0, 'i tubi non si incrociano');
}
// ---- regole dei tubi ----
{
  const N = 4, coppie = [[0, 3], [12, 15]], tubi = [[], []];
  assert.ok(L.traccia(N, coppie, tubi, 0, [1, 2]).errore, 'si parte da un pallino');
  assert.ok(L.traccia(N, coppie, tubi, 0, [0, 2]).errore, 'caselle vicine');
  assert.ok(L.traccia(N, coppie, tubi, 0, [0, 4, 8, 12]).errore, 'non sui pallini degli altri');
  assert.ok(L.traccia(N, coppie, tubi, 0, [0, 1, 2, 3, 7]).errore, 'il tubo finisce sull\'altro pallino');
  assert.ok(L.traccia(N, coppie, tubi, 1, [12, 8, 9, 10, 11, 15]).ok);
  assert.ok(L.collegato(coppie, tubi, 1));
  assert.ok(L.traccia(N, coppie, tubi, 0, [3, 7, 6, 10, 14, 13]).ok, 'dall\'altro pallino, tagliando il blu');
  assert.deepStrictEqual(tubi[1], [12, 8, 9], 'il tubo tagliato si accorcia prima dell\'incrocio');
  assert.ok(!L.collegato(coppie, tubi, 0) && !L.conta(N, coppie, tubi).risolto);
}
// ---- partita da soli, 3 livelli ----
{
  const g = M.crea({ n: 1, opzioni: { lato: 6, livelli: 3 }, bot: [null] });
  assert.strictEqual(g.livelli.length, 3);
  assert.ok(g.livelli[0].N === 5 && g.livelli[2].N === 6, 'i livelli crescono fino alla griglia scelta');
  const t = g.tavole[0];
  assert.ok(g.azione(0, { tipo: 'traccia', c: 0, celle: [999] }).errore);
  assert.ok(g.azione(0, { tipo: 'ricomincia' }).errore, 'già all\'inizio');
  g.azione(0, { tipo: 'aiuto' });
  assert.ok(t.penale === 15000 && L.collegato(g.livelli[0].coppie, t.tubi, 0), 'l\'aiuto mette a posto un colore');
  // !win: il percorso giusto a parole
  T.arma(g, 0); T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.length === 1 && /parti da riga \d+, colonna \d+ e vai [↑↓←→]+/.test(s[0].testo), s[0] && s[0].testo);
  for (let liv = 0; liv < 3; liv++) {
    const lv = g.livelli[liv];
    lv.soluzione.forEach((sol, c) => g.azione(0, { tipo: 'traccia', c, celle: sol.slice().reverse() }));
    if (liv < 2) assert.strictEqual(t.liv, liv + 1, 'si passa al livello dopo');
  }
  assert.ok(g.finita && t.fatto != null, 'tre livelli finiti');
  assert.ok(g.risultato.fazioni[0].punti >= 15 && /aiut/.test(g.risultato.titolo));
  const v = g.vista(0);
  assert.ok(v.record.length === 1 && v.posizioneRecord === 0);
}
// ---- sfide tra computer, e ogni livello da solo (quanti tubi disegna per finire) ----
{
  const t0 = Date.now();
  for (let k = 0; k < 20; k++) {
    const g = M.crea({ n: 3, opzioni: { lato: LATI[k % LATI.length], livelli: [1, 3][k % 2] }, bot: ['facile', 'medio', 'difficile'] });
    let giri = 0;
    while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.finita && g.tavole.some((t) => t.fatto != null), 'la sfida finisce');
    assert.strictEqual(g.risultato.vincitori.length, 1);
  }
  const mosse = {};
  for (const liv of ['facile', 'medio', 'difficile']) {
    mosse[liv] = 0;
    for (let k = 0; k < 25; k++) {
      const g = M.crea({ n: 1, opzioni: { lato: 7, livelli: 1 }, bot: [liv] });
      let giri = 0;
      while (!g.finita && giri++ < 20000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
      assert.ok(g.finita && g.tavole[0].fatto != null);
      mosse[liv] += g.tavole[0].mosse - g.livelli[0].coppie.length; // i tubi in più del minimo
    }
  }
  assert.ok(mosse.facile > mosse.medio && mosse.medio > mosse.difficile && mosse.difficile === 0, JSON.stringify(mosse));
  console.log(`✓ Collega i colori: generatore con una sola soluzione (risolutore), tubi che si tagliano, livelli di fila, aiuto, !win, sfide tra computer; tubi rifatti in 25 partite f/m/d ${mosse.facile}/${mosse.medio}/${mosse.difficile} (${Date.now() - t0} ms)`);
}
