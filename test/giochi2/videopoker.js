// Video poker: valutazione delle mani, tabella, valore atteso esatto, strategia e tante mani giocate dal computer.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const M = require('../../giochi2/videopoker');
const { categoria, numero, valoreAtteso, migliorScelta, pagamenti, strategiaSemplice, strategiaFacile, CAT } = M._test;
const C = (id) => ({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
const Cs = (s) => s.split(' ').map(C);
const cat = (s) => categoria(Cs(s).map(numero));

// ---- categorie ----
assert.strictEqual(cat('10p 11p 12p 13p 1p'), CAT.royal);
assert.strictEqual(cat('9p 10p 11p 12p 13p'), CAT.scalaColore);
assert.strictEqual(cat('1c 2c 3c 4c 5c'), CAT.scalaColore, 'scala colore all\'asso basso');
assert.strictEqual(cat('1c 2q 3c 4f 5c'), CAT.scala, 'A-2-3-4-5');
assert.strictEqual(cat('10c 11q 12c 13f 1c'), CAT.scala);
assert.strictEqual(cat('12c 13q 1c 2f 3c'), CAT.nulla, 'niente giro dal re al 2');
assert.strictEqual(cat('7c 7q 7f 7p 2c'), CAT.poker);
assert.strictEqual(cat('7c 7q 7f 2p 2c'), CAT.full);
assert.strictEqual(cat('2c 7c 9c 11c 13c'), CAT.colore);
assert.strictEqual(cat('7c 7q 7f 2p 3c'), CAT.tris);
assert.strictEqual(cat('7c 7q 3f 3p 2c'), CAT.doppia);
assert.strictEqual(cat('11c 11q 3f 4p 2c'), CAT.coppia, 'coppia di fanti paga');
assert.strictEqual(cat('1c 1q 3f 4p 2c'), CAT.coppia, 'coppia d\'assi paga');
assert.strictEqual(cat('10c 10q 3f 4p 2c'), CAT.nulla, 'coppia di dieci non paga');
// tabella
assert.strictEqual(pagamenti('96', 5)[CAT.royal], 800);
assert.strictEqual(pagamenti('96', 4)[CAT.royal], 250);
assert.strictEqual(pagamenti('96', 1)[CAT.full], 9);
assert.strictEqual(pagamenti('85', 1)[CAT.colore], 5);

// ---- valore atteso esatto: valori noti della 9/6 ----
const paga = pagamenti('96', 5);
const ev = (mano, tieni) => { const cs = Cs(mano); const resto = []; const fuori = new Set(cs.map(numero)); for (let c = 0; c < 52; c++) if (!fuori.has(c)) resto.push(c); return valoreAtteso(Cs(tieni).map(numero), resto, paga); };
assert.ok(Math.abs(ev('11c 11q 3f 7p 9c', '11c 11q') - 1.5365) < 0.0005, 'coppia di fanti: 1,5365');
assert.ok(Math.abs(ev('2c 5c 8c 9c 11p', '2c 5c 8c 9c') - 9 * 6 / 47) < 1e-9, 'quattro a colore senza carte alte');
assert.strictEqual(ev('10p 11p 12p 13p 1p', '10p 11p 12p 13p 1p'), 800);
// scelte giuste
const tieni = (s) => migliorScelta(Cs(s), [], paga).tieni.sort().join(' ');
assert.strictEqual(tieni('1p 13p 12p 11p 9p'), ['1p', '13p', '12p', '11p'].sort().join(' '), 'si rompe il colore per 4 a scala reale');
assert.strictEqual(tieni('4c 4q 8c 9c 2c'), ['4c', '8c', '9c', '2c'].sort().join(' '), 'quattro a colore meglio della coppia bassa');
assert.strictEqual(tieni('11c 11q 2c 5c 8c'), ['11c', '11q'].sort().join(' '), 'coppia alta meglio di tre a colore');
assert.strictEqual(tieni('7c 7q 7f 7p 2c').split(' ').length >= 4, true);
assert.ok(Math.abs(migliorScelta(Cs('2c 7q 9f 4p 3c'), [], paga).ev - 0.3606) < 0.002, 'cambia tutto ≈ 0,36');
console.log('✓ Video poker: mani, tabella e valore atteso esatto');

// ---- azioni ----
{
  const g = M.crea({ n: 1, fiche: [1000], opzioni: { credito: 5, tabella: '96' } });
  assert.ok(g.azione(0, { tipo: 'cambia', tieni: [] }).errore, 'prima si distribuisce');
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 6 }).errore, 'massimo 5 crediti');
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 0 }).errore);
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 'x' }).errore);
  assert.ok(g.azione(1, { tipo: 'distribuisci', crediti: 1 }).errore, 'solo il posto 0');
  assert.ok(g.azione(0, null).errore);
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 5 }).ok);
  assert.strictEqual(g.fiche[0], 975);
  assert.strictEqual(g.carte.length, 5);
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 5 }).errore, 'una mano alla volta');
  assert.ok(g.azione(0, { tipo: 'cambia', tieni: ['99x'] }).errore, 'carte non sue');
  assert.ok(g.azione(0, { tipo: 'cambia', tieni: 'abc' }).errore);
  const v = g.vista(0);
  assert.ok(v.consiglio && v.consiglio.tieni, 'il consiglio c\'è durante il cambio');
  const tenute = g.carte.slice(0, 2).map((c) => c.id);
  assert.ok(g.azione(0, { tipo: 'cambia', tieni: tenute }).ok);
  assert.ok(tenute.every((id) => g.carte.some((c) => c.id === id)), 'le tenute restano');
  assert.strictEqual(new Set(g.carte.map((c) => c.id)).size, 5, 'niente carte doppie');
  assert.strictEqual(g.fase, 'esito');
  assert.strictEqual(g.fiche[0], 975 + g.esito.vinto);
  // ultime fiche
  g.fiche[0] = 3;
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 2 }).errore);
  assert.ok(g.azione(0, { tipo: 'distribuisci', crediti: 1 }).ok, 'le ultime fiche come un credito');
  assert.strictEqual(g.fiche[0], 0);
  g.salta(0);
  assert.strictEqual(g.fase, 'esito', 'assente: si chiude col consiglio');
}

// ---- tante mani del computer ----
{
  const t0 = Date.now();
  const resa = {};
  for (const liv of ['facile', 'medio']) {
    const g = M.crea({ n: 1, fiche: [1e9], opzioni: { credito: 1, tabella: '96' } });
    for (let k = 0; k < 20000; k++) {
      for (let passo = 0; passo < 2; passo++) { const r = g.azione(0, M.bot(g, 0, liv)); assert.ok(r.ok, r.errore); }
      assert.strictEqual(g.fase, 'esito');
    }
    resa[liv] = g.conti.vinte / g.conti.puntate;
  }
  // il difficile (strategia esatta) contro il medio sulle stesse mani: il suo valore atteso non è mai più basso
  let evD = 0, evM = 0, evF = 0;
  const N = 120;
  for (let k = 0; k < N; k++) {
    const g = M.crea({ n: 1, fiche: [1000], opzioni: {} });
    g.azione(0, M.bot(g, 0, 'difficile'));
    const tutte = g.calcolaConsiglio().tutte;
    const evDi = (ids) => tutte.find((s) => s.m === g.carte.reduce((m, c, i) => m | (ids.includes(c.id) ? 1 << i : 0), 0)).ev;
    const d = evDi(M.bot(g, 0, 'difficile').tieni), m = evDi(strategiaSemplice(g.carte)), f = evDi(strategiaFacile(g.carte));
    assert.ok(d >= m - 1e-9 && d >= f - 1e-9, 'la scelta ottimale è la migliore');
    evD += d; evM += m; evF += f;
    assert.ok(g.azione(0, M.bot(g, 0, 'difficile')).ok);
  }
  console.log(`✓ Video poker: 40000 mani del computer, resa facile ${(resa.facile * 100).toFixed(1)}% medio ${(resa.medio * 100).toFixed(1)}%; valore atteso medio su ${N} mani difficile ${(evD / N * 100).toFixed(1)}% medio ${(evM / N * 100).toFixed(1)}% facile ${(evF / N * 100).toFixed(1)}% (${Date.now() - t0} ms)`);
  assert.ok(resa.medio > 0.85 && resa.medio < 1.2, 'il medio rende vicino al 99% (la scala reale da 4000 crediti sposta molto la media)');
  assert.ok(evD >= evM && evM > evF, 'difficile ≥ medio > facile');
}
