// CARAMELLE IN FILA: file, caramelle speciali e loro esplosioni, cadute col seme (stesse mosse = stessa tavola),
// mosse non valide, tempo, trucco, sfide tra computer (il difficile fa più punti del facile).
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi3/caramelle');
const T = require('../../giochi/trucco');
const { C } = M._test;
const { N } = C;

// una tavola a mano: colori a scacchiera di 4 (nessuna fila), poi si mettono le caramelle che servono
const scacchi = () => ({ c: Array.from({ length: N * N }, (_, i) => ((i % N) + 2 * Math.floor(i / N)) % 4), s: new Array(N * N).fill(0), r: { a: 99 }, punti: 0 });
const at = (x, y) => y * N + x;

// ---- schema nuovo ----
{
  const a = C.nuova(42), b = C.nuova(42);
  assert.deepStrictEqual(a, b, 'stesso seme, stesso schema');
  assert.ok(!C.file(a).length && C.mosse(a).length > 0, 'nessuna fila già fatta, almeno una mossa');
  assert.ok(a.c.every((v) => v >= 0 && v < C.COLORI));
}
// ---- una fila di 3 ----
{
  const t = scacchi();
  assert.ok(C.file(t).length === 0);
  // riga 0: colori 0 1 2 3 0 1 2 3; si mette un 5 in (0,0) (1,0) e (2,1): scambiando (2,1) con (2,0) si fa 5 5 5
  t.c[at(0, 0)] = 5; t.c[at(1, 0)] = 5; t.c[at(2, 1)] = 5;
  assert.ok(C.scambia(C.copia(t), at(0, 3), at(1, 3)).errore, 'scambio senza fila: rifiutato');
  assert.ok(C.scambia(C.copia(t), at(0, 0), at(2, 0)).errore, 'solo caramelle vicine');
  const r = C.scambia(t, at(2, 0), at(2, 1));
  assert.ok(r.ok && r.passi.length >= 1);
  assert.deepStrictEqual(r.passi[0].via.sort((x, y) => x - y), [at(0, 0), at(1, 0), at(2, 0)]);
  assert.ok(r.punti >= 60 && t.punti === r.punti, 'tre caramelle da 20');
  assert.ok(t.c.every((v) => v !== null) && !C.file(t).length, 'tutto pieno e nessuna fila rimasta');
  assert.strictEqual(r.passi[0].nuove.length, 3, 'tre caramelle nuove dall\'alto');
}
// ---- 4 in fila: caramella a strisce; 5 in fila: bomba; L: incartata ----
{
  const t = scacchi();
  for (const x of [0, 1, 3]) t.c[at(x, 4)] = 5;
  t.c[at(2, 5)] = 5;
  const r = C.scambia(t, at(2, 5), at(2, 4));
  assert.deepStrictEqual(r.passi[0].speciali.map((s) => [s.i, s.s, s.c]), [[at(2, 4), C.COLONNA, 5]], 'quattro in orizzontale: strisce verticali dove è arrivata la caramella');
  const u = scacchi();
  for (const x of [0, 1, 3, 4]) u.c[at(x, 4)] = 5;
  u.c[at(2, 5)] = 5;
  const r2 = C.scambia(u, at(2, 5), at(2, 4));
  assert.strictEqual(r2.passi[0].speciali[0].s, C.BOMBA, 'cinque in fila: bomba');
  const v = scacchi();
  // L: (0,2) (1,2) e (2,3) (2,4) + la caramella che arriva in (2,2)
  for (const [x, y] of [[0, 2], [1, 2], [2, 3], [2, 4]]) v.c[at(x, y)] = 5;
  v.c[at(3, 2)] = 5; v.c[at(2, 2)] = 0;
  const r3 = C.scambia(v, at(3, 2), at(2, 2));
  assert.strictEqual(r3.passi[0].speciali[0].s, C.INCARTATA, 'a L: incartata');
}
// ---- le speciali esplodono ----
{
  const t = scacchi();
  t.s[at(3, 3)] = C.RIGA; t.c[at(3, 3)] = 5;
  t.c[at(1, 3)] = 5; t.c[at(2, 3)] = 5; t.c[at(4, 2)] = 5;
  const r = C.scambia(t, at(4, 2), at(4, 3));
  assert.ok(r.passi[0].via.length >= N - 1 && [0, 5, 6, 7].every((x) => r.passi[0].via.includes(at(x, 3))), 'la caramella a strisce svuota la riga');
  const b = scacchi();
  b.s[at(5, 5)] = C.BOMBA; b.c[at(5, 5)] = -1;
  const colore = b.c[at(5, 6)], quante = b.c.filter((x) => x === colore).length;
  const rb = C.scambia(b, at(5, 5), at(5, 6));
  assert.ok(rb.ok && rb.passi[0].via.length >= quante, 'la bomba toglie tutto un colore');
  const d = scacchi();
  d.s[at(1, 1)] = C.RIGA; d.s[at(2, 1)] = C.COLONNA;
  const rd = C.scambia(d, at(1, 1), at(2, 1));
  assert.ok(rd.ok && rd.passi[0].via.length === 2 * N - 1, 'strisce + strisce: una croce');
}
// ---- stesso seme e stesse mosse: stessa tavola (server e browser, e tutti i giocatori) ----
{
  const a = C.nuova(7), b = C.nuova(7);
  for (let k = 0; k < 300; k++) {
    const m = C.mosse(a)[k % C.mosse(a).length];
    const ra = C.scambia(a, m[0], m[1]), rb = C.scambia(b, m[0], m[1]);
    assert.ok(ra.ok && rb.ok);
    assert.ok(!C.file(a).length && a.c.every((v) => v !== null) && C.mosse(a).length, 'dopo ogni mossa: niente file, niente buchi, una mossa c\'è');
  }
  assert.deepStrictEqual(a, b);
}
// ---- partita da soli: tempo e record ----
{
  const g = M.crea({ n: 1, opzioni: { durata: 60 }, bot: [null] });
  const t = g.tavole[0];
  assert.ok(g.azione(0, { tipo: 'scambia', i: 0, j: 63 }).errore);
  const [i, j] = C.mosse(t)[0];
  assert.ok(g.azione(0, { tipo: 'scambia', i, j }).ok && t.mosse === 1 && t.punti > 0);
  T.arma(g, 0); T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.length === 1 && /Scambia la caramella di riga \d, colonna \d .* vale \d+ punti/.test(s[0].testo), s[0] && s[0].testo);
  assert.ok(!g.controllaTempo() && !g.finita, 'il tempo non è finito');
  g.inizio -= 61000;
  assert.ok(g.scadenza() <= g.inizio + 60000 + g.tempoFermo);
  g.controllaTempo();
  assert.ok(g.finita && g.risultato.fazioni[0].punti === t.punti && g.vista(0).posizioneRecord >= 0, 'tempo scaduto: punti e record');
  assert.ok(g.azione(0, { tipo: 'scambia', i, j }).errore, 'a tempo scaduto non si gioca più');
}
// ---- sfide tra computer ----
{
  const t0 = Date.now(), punti = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 8; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { durata: 120 }, bot: liv });
    assert.ok(g.tavole.every((t) => t.c.join() === g.tavole[0].c.join()), 'stesso schema per tutti');
    for (let m = 0; m < 40; m++) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
    assert.ok(g.tavole.every((t) => t.mosse === 40), 'ognuno fa le sue mosse');
    g.inizio -= 121000; g.controllaTempo();
    assert.ok(g.finita && g.risultato.fazioni.length === 3);
    liv.forEach((l, i) => { punti[l] += g.tavole[i].punti; });
  }
  assert.ok(punti.difficile > punti.medio && punti.medio > punti.facile, JSON.stringify(punti));
  console.log(`✓ Caramelle in fila: file, strisce, incartate, bombe e loro incroci, cadute col seme uguali per tutti, tempo e record, !win; punti in 8 sfide da 40 mosse f/m/d ${punti.facile}/${punti.medio}/${punti.difficile} (${Date.now() - t0} ms)`);
}
