// BOLLE COLORATE: griglia a nido d'ape, tiro con rimbalzi, scoppio di 3, bolle che cadono, soffitto che scende,
// bolle in fondo, stesso seme e stessi tiri = stessa partita, trucco, sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi3/bolle');
const T = require('../../giochi/trucco');
const { B } = M._test;

// una tavola a mano: righe vuote (-1), si mettono le bolle che servono
const vuota = (righe = 3) => {
  const t = B.nuova(1, 'medio');
  t.g = Array.from({ length: righe }, (_, r) => new Array(B.larghezza(t, r)).fill(-1));
  t.attuale = 0; t.prossima = 1; t.mancati = 0;
  return t;
};

// ---- geometria ----
{
  const t = vuota();
  assert.strictEqual(B.larghezza(t, 0), B.COL); assert.strictEqual(B.larghezza(t, 1), B.COL - 1, 'righe alterne più corte');
  assert.deepStrictEqual(B.vicine(t, 0, 0).sort(), [[0, 1], [1, 0]].sort());
  assert.strictEqual(B.vicine(t, 1, 3).length, 6, 'sei vicine in mezzo');
  // tiro dritto in su su un soffitto vuoto: si attacca alla riga 0 al centro
  const tr = B.traiettoria(t, 0);
  assert.ok(tr.r === 0 && Math.abs(B.centro(t, 0, tr.c)[0] - B.W / 2) <= B.R, 'dritto in su: in alto al centro');
  // tiro di lato: rimbalza sulla parete
  const tl = B.traiettoria(t, -1.2);
  assert.ok(tl.punti.some(([x]) => x === B.R), 'rimbalza sulla parete sinistra');
}
// ---- scoppio, caduta, soffitto ----
{
  const t = vuota();
  t.g[0][4] = 0; t.g[0][6] = 0; t.g[1][4] = 2; t.g[2][4] = 3; // la 3 e la 2 sono appese sotto la [0][4]
  t.g[0][5] = 1; // in mezzo una blu: tirando lo 0 sotto le due rosse…
  const prima = B.quante(t);
  // si tira contro la [0][4]/[0][5]: la bolla 0 si attacca e tocca solo la [0][4] → niente scoppio
  t.attuale = 0;
  const r = B.tira(t, -0.15);
  assert.ok(r.ok && !r.scoppiate.length && B.quante(t) === prima + 1 && t.mancati === 1);
  // ora una tavola dove il tiro fa 3: due rosse in alto a sinistra e la terza arriva
  const u = vuota();
  u.g[0][0] = 0; u.g[0][1] = 0; u.g[1][0] = 2; u.g[0][5] = 3; u.g[1][5] = 3;
  u.attuale = 0;
  // la [1][0] è appesa sotto le rosse: quando scoppiano cade. Si cerca un angolo che le fa scoppiare.
  let ang = null;
  for (let a = -1.4; a <= 1.4 && ang === null; a += 0.01) { const v = B.prova(u, a); if (v && v.scoppiate >= 3) ang = a; }
  assert.ok(ang !== null, 'c\'è un tiro che fa scoppiare');
  const r2 = B.tira(u, ang);
  assert.ok(r2.scoppiate.length >= 3, `scoppiano: ${JSON.stringify(r2.scoppiate)} ${r2.r},${r2.c}`);
  assert.ok(r2.cadute.some(([a, b, c]) => c === 2), 'la bolla rimasta appesa al niente cade');
  assert.ok(u.punti === r2.scoppiate.length * 10 + r2.cadute.length * 20 + (r2.cadute.length >= 5 ? r2.cadute.length * 10 : 0));
  // il soffitto scende dopo "ogni" tiri a vuoto
  const s = B.nuova(5, 'difficile');
  const righe = s.g.length, sf = s.sfasa;
  let scesa = false;
  for (let k = 0; k < 20 && !scesa; k++) {
    // bolle di un colore che non c'è (non scoppiano mai) finché non scende
    s.attuale = 10 + k;
    const r3 = B.tira(s, 1.38);
    if (r3.scende) scesa = true;
  }
  assert.ok(scesa && s.sfasa !== sf && s.g.length >= righe, 'il soffitto scende di una riga');
}
// ---- bolle in fondo: perso ----
{
  const u = B.nuova(3, 'facile');
  u.g = Array.from({ length: B.RIGHE_MAX }, (_, r) => new Array(B.larghezza(u, r)).fill(r % 2 ? 1 : 2));
  u.attuale = 3; u.prossima = 3;
  const r = B.tira(u, 0);
  assert.ok(r.perso && u.perso && B.tira(u, 0).errore, 'una bolla oltre la linea: perso');
}
// ---- stesso seme e stessi tiri: stessa partita ----
{
  const a = B.nuova(77, 'medio'), b = B.nuova(77, 'medio');
  for (let k = 0; k < 40 && !a.perso && B.quante(a); k++) { const ang = Math.sin(k * 1.7) * 1.3; B.tira(a, ang); B.tira(b, ang); if (k % 7 === 3) { B.scambia(a); B.scambia(b); } }
  assert.deepStrictEqual(a, b);
}
// ---- partita da soli ----
{
  const g = M.crea({ n: 1, opzioni: { difficolta: 'facile' }, bot: [null] });
  const t = g.tavole[0];
  assert.ok(g.azione(0, { tipo: 'boh' }).errore);
  const [a0, p0] = [t.attuale, t.prossima];
  g.azione(0, { tipo: 'scambia' });
  assert.ok(t.attuale === p0 && t.prossima === a0, 'scambio delle bolle');
  T.arma(g, 0); T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.length === 1 && /^💡 Tira (dritto in su|\d+° verso (sinistra|destra))/.test(s[0].testo), s[0] && s[0].testo);
  // gioca il computer difficile per lei finché non svuota
  let k = 0;
  while (!g.finita && k++ < 300) g.azione(0, g.mossaBot(0, 'difficile'));
  assert.ok(g.finita && t.fatto != null && /Griglia vuota in \d+ tiri/.test(g.risultato.titolo), g.risultato && g.risultato.titolo);
}
// ---- sfide tra computer ----
{
  const t0 = Date.now(), tiri = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 3; k++) {
    for (const liv of ['facile', 'medio', 'difficile']) {
      const g = M.crea({ n: 1, opzioni: { difficolta: 'medio' }, bot: [liv] });
      let giri = 0;
      while (!g.finita && giri++ < 600) { g.prossimaBot = [0]; g.controllaTempo(); }
      assert.ok(g.finita, `${liv}: finisce`);
      tiri[liv] += g.tavole[0].perso ? 200 : g.tavole[0].colpi;
    }
  }
  const g = M.crea({ n: 3, opzioni: { difficolta: 'difficile' }, bot: ['facile', 'medio', 'difficile'] });
  assert.ok(g.tavole.every((t) => JSON.stringify(t.g) === JSON.stringify(g.tavole[0].g)), 'stessa griglia per tutti');
  let giri = 0;
  while (!g.finita && giri++ < 3000) { g.prossimaBot = g.prossimaBot.map(() => 0); g.controllaTempo(); }
  assert.ok(g.finita && g.risultato.vincitori.length === 1);
  assert.ok(tiri.facile > tiri.difficile, JSON.stringify(tiri));
  console.log(`✓ Bolle colorate: nido d'ape, rimbalzi, scoppi e cadute, soffitto che scende, bolle in fondo, stesso seme = stessa partita, scambio, !win; tiri per svuotare (3 partite) f/m/d ${tiri.facile}/${tiri.medio}/${tiri.difficile} (${Date.now() - t0} ms)`);
}
