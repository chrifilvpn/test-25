// Test di SINTONIA: gli spettri e i loro esempi, i punti (4/3/2), l'indizio (niente numeri, non un estremo), chi vede
// il bersaglio, la manopola condivisa (gira, blocca, Psichico escluso), la scommessa sinistra/destra degli avversari,
// la rimonta, la cooperativa con le carte bonus, i computer (consigliano con persone in squadra) e tante partite
// complete tra computer (il difficile deve fare più punti del facile).
const assert = require('assert');
const { GIOCHI } = require('../../giochi');

const M = GIOCHI.sintonia;
const { puntiPer, controllaIndizio, stima, SPETTRI, VIOLA, VERDI } = M._test;

// ---- gli spettri ----
assert.ok(SPETTRI.length >= 50, `servono almeno 50 spettri (sono ${SPETTRI.length})`);
let esempi = 0;
const coppie = new Set();
for (const sp of SPETTRI) {
  assert.ok(sp.s && sp.d && sp.s !== sp.d, 'due estremi diversi');
  assert.ok(!coppie.has(`${sp.s}|${sp.d}`), `spettro doppio ${sp.s} ↔ ${sp.d}`);
  coppie.add(`${sp.s}|${sp.d}`);
  assert.ok(sp.e.length >= 10, `${sp.s} ↔ ${sp.d}: almeno 10 esempi`);
  const pos = sp.e.map(([, p]) => p);
  assert.ok(Math.min(...pos) <= 10 && Math.max(...pos) >= 90, `${sp.s} ↔ ${sp.d}: esempi da un capo all'altro`);
  assert.strictEqual(new Set(sp.e.map(([t]) => t)).size, sp.e.length, `${sp.s} ↔ ${sp.d}: esempi ripetuti`);
  for (const [t, p] of sp.e) {
    assert.ok(Number.isInteger(p) && p >= 0 && p <= 100, `${t}: posizione da 0 a 100`);
    assert.strictEqual(controllaIndizio(t, sp), null, `l'esempio «${t}» deve essere un indizio valido`);
    esempi++;
  }
}
console.log(`✓ Sintonia: ${SPETTRI.length} spettri e ${esempi} esempi, ognuno da un capo all'altro e valido come indizio`);

// ---- punti e indizio ----
assert.strictEqual(puntiPer(50, 50), 4); assert.strictEqual(puntiPer(52, 50), 4); assert.strictEqual(puntiPer(47, 50), 3);
assert.strictEqual(puntiPer(55, 50), 3); assert.strictEqual(puntiPer(56, 50), 2); assert.strictEqual(puntiPer(42, 50), 2);
assert.strictEqual(puntiPer(41, 50), 0); assert.strictEqual(puntiPer(0, 97), 0);
const caldo = SPETTRI.find((x) => x.s === 'Freddo');
assert.strictEqual(controllaIndizio('Una vacanza alle Maldive', caldo), null, 'più parole vanno bene');
assert.strictEqual(controllaIndizio('caffè', caldo), null);
assert.ok(controllaIndizio('costa 250.000 euro', caldo), 'niente numeri');
assert.ok(controllaIndizio('al 70%', caldo) && controllaIndizio('settanta per cento', caldo), 'niente percentuali');
assert.ok(controllaIndizio('caldo', caldo) && controllaIndizio('FREDDO', caldo), 'non un estremo');
assert.ok(controllaIndizio('', caldo) && controllaIndizio('   ', caldo) && controllaIndizio('!!!', caldo));
assert.ok(controllaIndizio('a'.repeat(41), caldo), 'al massimo 40 caratteri');
console.log('✓ Sintonia: centro 4, vicino 3, zona 2; l\'indizio è un esempio senza numeri né percentuali, non un estremo');

// ---- una partita a squadre, passo per passo ----
function nuova(n = 4, opzioni = {}) {
  const g = M.crea({ n, primo: 0, opzioni });
  return g;
}
{
  const g = nuova(4);
  assert.strictEqual(g.modo, 'squadre');
  assert.deepStrictEqual(g.membri, [[0, 2], [1, 3]], 'squadre a posti alterni');
  assert.strictEqual(g.sq, VIOLA); assert.strictEqual(g.psichico, 0); assert.strictEqual(g.turno, 0);
  assert.strictEqual(g.fase, 'indizio');
  // chi vede che cosa
  for (let p = 0; p < 4; p++) {
    const v = g.vista(p);
    if (p === 0) { assert.strictEqual(v.bersaglio, g.bersaglio); assert.strictEqual(v.carte.length, 2); }
    else { assert.strictEqual(v.bersaglio, null, 'il bersaglio lo vede solo lo Psichico'); assert.strictEqual(v.carte, null); }
  }
  assert.ok(g.azione(2, { tipo: 'indizio', carta: 0, testo: 'neve' }).errore, 'l\'indizio lo dà lo Psichico');
  assert.ok(g.azione(0, { tipo: 'indizio', carta: 0, testo: 'trenta gradi 30' }).errore);
  assert.ok(g.azione(0, { tipo: 'indizio', carta: 2, testo: 'neve' }).errore, 'uno dei due spettri');
  assert.ok(g.azione(2, { tipo: 'gira', valore: 30 }).errore, 'prima l\'indizio');
  g.bersaglio = 70;
  assert.ok(g.azione(0, { tipo: 'indizio', carta: 1, testo: 'qualcosa di bello' }).ok);
  assert.strictEqual(g.spettro, g.carte[1]); assert.strictEqual(g.fase, 'manopola'); assert.strictEqual(g.turno, null);
  assert.deepStrictEqual(g.attesi(), [2], 'gira la manopola la squadra, senza lo Psichico');
  assert.ok(g.azione(0, { tipo: 'gira', valore: 70 }).errore, 'lo Psichico non tocca la manopola');
  assert.ok(g.azione(1, { tipo: 'gira', valore: 70 }).errore, 'gli avversari nemmeno');
  assert.ok(g.azione(2, { tipo: 'gira', valore: 140 }).errore && g.azione(2, { tipo: 'gira', valore: 'x' }).errore);
  assert.ok(g.azione(2, { tipo: 'gira', valore: 60.4 }).ok);
  assert.strictEqual(g.manopola, 60); assert.strictEqual(g.vista(3).manopola, 60, 'tutti vedono la manopola');
  assert.strictEqual(g.vista(2).bersaglio, null, 'chi gira non vede il bersaglio');
  assert.ok(g.azione(2, { tipo: 'blocca', valore: 66 }).ok);
  assert.strictEqual(g.fase, 'previsione'); assert.deepStrictEqual(g.attesi(), [1, 3], 'scommettono gli avversari');
  assert.ok(g.azione(2, { tipo: 'lato', lato: 'destra' }).errore, 'la squadra attiva non scommette');
  assert.ok(g.azione(1, { tipo: 'confermaLato' }).errore, 'prima si sceglie');
  assert.ok(g.azione(1, { tipo: 'lato', lato: 'su' }).errore);
  assert.ok(g.azione(1, { tipo: 'lato', lato: 'sinistra' }).ok);
  assert.ok(g.azione(3, { tipo: 'lato', lato: 'destra' }).ok, 'un compagno cambia idea');
  assert.ok(g.azione(3, { tipo: 'confermaLato' }).ok);
  // 66 contro 70: 3 punti ai Viola; il centro è a destra e i Verdi lo indovinano
  assert.deepStrictEqual(g.punti, [3, 1]);
  assert.ok(g.inAttesa && g.fase === 'rivela');
  for (let p = 0; p < 4; p++) assert.strictEqual(g.vista(p).bersaglio, 70, 'quando si scopre lo vedono tutti');
  assert.strictEqual(g.vista(2).rivelato.punti, 3);
  g.avanza();
  assert.strictEqual(g.sq, VERDI); assert.strictEqual(g.psichico, 1, 'tocca ai Verdi'); assert.strictEqual(g.manopola, 50);
  // centro pieno: niente punto per il lato
  g.bersaglio = 20;
  g.azione(1, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  g.azione(3, { tipo: 'blocca', valore: 21 });
  g.azione(0, { tipo: 'lato', lato: 'sinistra', conferma: true });
  assert.deepStrictEqual(g.punti, [3, 5], 'centro pieno: 4 punti e la scommessa non conta');
  g.avanza();
  assert.strictEqual(g.sq, VIOLA); assert.strictEqual(g.psichico, 2, 'lo Psichico gira dentro la squadra');
  // rimonta: i Viola fanno 4 e restano indietro → giocano ancora
  g.punti = [1, 8];
  g.bersaglio = 50;
  g.azione(2, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  g.azione(0, { tipo: 'blocca', valore: 50 });
  g.azione(1, { tipo: 'lato', lato: 'destra', conferma: true });
  assert.deepStrictEqual(g.punti, [5, 8]);
  assert.ok(g.storia[g.storia.length - 1].rimonta);
  g.avanza();
  assert.strictEqual(g.sq, VIOLA, 'rimonta: tocca di nuovo ai Viola'); assert.strictEqual(g.psichico, 0);
  // vittoria a 10
  g.punti = [8, 8];
  g.bersaglio = 50;
  g.azione(0, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  g.azione(2, { tipo: 'blocca', valore: 54 });
  g.azione(1, { tipo: 'lato', lato: 'destra', conferma: true });
  assert.ok(g.finita); assert.strictEqual(g.vincitore, VIOLA);
  assert.deepStrictEqual(g.risultato.vincitori, [0, 2]);
  assert.strictEqual(g.vista(1).risultato.titolo, 'Vincono i Viola!');
  assert.ok(!g.vista(0).risultato.titolo, 'chi vince legge "Avete vinto!" (lo scrive il sito)');
}
{
  // arrivati insieme a 10 a pari punti si continua
  const g = nuova(4, { obiettivo: 6 });
  assert.strictEqual(g.obiettivo, 6);
  g.punti = [5, 4]; g.bersaglio = 50;
  g.azione(0, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  g.azione(2, { tipo: 'blocca', valore: 59 }); // 0 punti
  g.azione(1, { tipo: 'lato', lato: 'sinistra', conferma: true }); // giusto: +1
  assert.deepStrictEqual(g.punti, [5, 5]);
  assert.ok(!g.finita);
  g.avanza(); g.punti = [6, 4]; g.bersaglio = 50;
  g.azione(1, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  g.azione(3, { tipo: 'blocca', valore: 48 }); // centro pieno: 4 + 4 = 8
  g.azione(0, { tipo: 'lato', lato: 'sinistra', conferma: true });
  assert.ok(g.finita && g.vincitore === VERDI, 'vince chi arriva primo all\'obiettivo davanti');
}
{
  // in 6: tre per squadra; con persone in squadra i computer consigliano e non toccano la manopola
  const g = M.crea({ n: 6, primo: 0, opzioni: {}, bot: [null, null, null, 'medio', null, 'medio'] });
  g.azione(0, { tipo: 'indizio', carta: 0, testo: SPETTRI[g.carte[0]].e[0][0] });
  assert.deepStrictEqual(g.attesi(), [2, 4]);
  // una squadra solo di computer: il primo blocca subito
  const h = M.crea({ n: 6, primo: 1, opzioni: {}, bot: [null, 'medio', null, 'medio', null, 'medio'] });
  h.sq = VERDI; h.nuovoTurno();
  const a = M.bot(h, h.psichico, 'medio');
  assert.ok(h.azione(h.psichico, a).ok, 'il computer Psichico dà un indizio valido');
  const chi = h.attesi();
  assert.ok(chi.length === 2 && chi.every((p) => p % 2 === 1));
  const m = M.bot(h, chi[0], 'medio');
  assert.strictEqual(m.tipo, 'blocca');
  h.azione(chi[0], m);
  assert.strictEqual(h.fase, 'previsione');
  assert.deepStrictEqual(h.attesi(), [0, 2, 4], 'scommettono le persone dell\'altra squadra');
  // squadra mista: il computer consiglia
  const k = M.crea({ n: 4, primo: 0, opzioni: {}, bot: [null, null, 'medio', null] });
  k.azione(0, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  assert.deepStrictEqual(k.attesi(), [2]);
  const c = M.bot(k, 2, 'medio');
  assert.ok(c.tipo === 'blocca', 'da solo con lo Psichico persona il computer decide');
  const j = M.crea({ n: 6, primo: 0, opzioni: {}, bot: [null, null, 'medio', null, null, null] });
  j.azione(0, { tipo: 'indizio', carta: 0, testo: 'esempio' });
  const cj = M.bot(j, 2, 'medio');
  assert.strictEqual(cj.tipo, 'consiglia', 'con un compagno persona il computer consiglia');
  assert.ok(j.azione(2, cj).ok);
  assert.deepStrictEqual(j.attesi(), [4], 'dopo il consiglio il computer non è più atteso');
  assert.strictEqual(j.manopola, 50, 'il consiglio non muove la manopola');
  assert.ok(j.vista(4).consigli[2].valore != null, 'il consiglio si vede');
}
console.log('✓ Sintonia a squadre: Psichico a turno, manopola condivisa, scommessa sinistra/destra, centro pieno, rimonta, vittoria all\'obiettivo');

// ---- cooperativa ----
{
  const g = nuova(3);
  assert.strictEqual(g.modo, 'cooperativa', 'in 3 si gioca tutti insieme');
  assert.deepStrictEqual(g.membri, [[0, 1, 2]]);
  const h = M.crea({ n: 6, primo: 0, opzioni: { modo: 'cooperativa', carte: 10 } });
  assert.strictEqual(h.modo, 'cooperativa'); assert.strictEqual(h.totCarte, 10);
  let carte = 0;
  while (!g.finita) {
    const ps = g.psichico;
    g.bersaglio = 50;
    assert.ok(g.azione(ps, { tipo: 'indizio', carta: 0, testo: 'esempio' }).ok);
    const altro = g.membri[0].find((x) => x !== ps);
    assert.deepStrictEqual(g.attesi(), g.membri[0].filter((x) => x !== ps));
    g.azione(altro, { tipo: 'blocca', valore: carte < 2 ? 50 : 70 }); // due centri pieni, poi fuori
    carte++;
    if (!g.finita) { assert.ok(g.inAttesa); g.avanza(); }
  }
  assert.strictEqual(carte, 9, '7 carte + 2 bonus per i centri pieni');
  assert.strictEqual(g.punti[0], 8);
  assert.deepStrictEqual(g.risultato.vincitori, [0, 1, 2]);
  assert.ok(/8 punti in 9 carte/.test(g.risultato.titolo));
  assert.ok(g.psichico !== undefined && new Set(g.storia.map((r) => r.psichico)).size === 3, 'lo Psichico gira tra tutti');
}
console.log('✓ Sintonia cooperativa: tutti insieme (anche in 2 o 3), Psichico a giro, carte bonus col centro pieno, giudizio finale');

// ---- il computer ----
{
  const g = nuova(4);
  g.bersaglio = 90;
  const a = M.bot(g, 0, 'difficile');
  const sp = SPETTRI[g.carte[a.carta]];
  const pos = sp.e.find(([t]) => t === a.testo)[1];
  const meglio = Math.min(...g.carte.flatMap((i) => SPETTRI[i].e.map(([, p]) => Math.abs(p - 90))));
  assert.strictEqual(Math.abs(pos - 90), meglio, 'il difficile sceglie l\'esempio più vicino tra i due spettri');
  g.azione(0, a);
  for (let k = 0; k < 30; k++) assert.ok(Math.abs(stima(g, 'difficile') - pos) <= 6, 'e il compagno computer lo capisce');
  g.indizio = 'zxqw'; // non lo conosce: tira a indovinare
  for (let k = 0; k < 30; k++) { const v = stima(g, 'medio'); assert.ok(v >= 0 && v <= 100); }
}
// tante partite tra computer, senza errori, e il difficile fa più punti del facile
for (const [n, modo] of [[4, 'squadre'], [5, 'squadre'], [8, 'squadre'], [2, 'cooperativa'], [6, 'cooperativa']]) {
  const media = {};
  for (const L of ['facile', 'difficile']) {
    let tot = 0, turni = 0;
    for (let k = 0; k < 120; k++) {
      const g = M.crea({ n, primo: k, opzioni: { modo }, bot: Array(n).fill(L) });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 5000, 'la partita deve finire');
        if (g.inAttesa) { g.avanza(); continue; }
        const chi = g.turno != null ? [g.turno] : g.attesi();
        assert.ok(chi.length, `bloccata in fase ${g.fase}`);
        for (const p of chi) {
          if (g.finita || g.inAttesa) break;
          const a = M.bot(g, p, L);
          if (!a) continue;
          const r = g.azione(p, a);
          assert.ok(!r.errore, `mossa del computer non valida: ${r.errore}`);
        }
      }
      tot += modo === 'cooperativa' ? g.punti[0] / g.carteGiocate : g.storia.reduce((s, r) => s + r.punti, 0) / g.storia.length;
      turni += g.storia.length;
    }
    media[L] = tot / 120;
  }
  assert.ok(media.difficile > media.facile + 0.4, `${n} ${modo}: il difficile deve indovinare meglio (${media.difficile.toFixed(2)} contro ${media.facile.toFixed(2)})`);
  console.log(`✓ Sintonia ${modo} in ${n}: 240 partite tra computer, punti a turno facile ${media.facile.toFixed(2)} / difficile ${media.difficile.toFixed(2)}`);
}
