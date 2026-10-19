// Il trucco segreto nei giochi del gruppo "casino": carte da casinò, poker, roulette e giochi di dadi.
// Per ognuno: con il trucco il risultato va a favore del posto truccato, e nessuna carta si crea o sparisce.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

const crea = (id, n, opzioni = {}, bot) => {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  return mod.crea({ n, primo: 0, opzioni: opz, bot: bot || Array.from({ length: n }, () => 'medio') });
};
const distinte = (carte) => new Set(carte.map((c) => c.id)).size === carte.length;

// ---- baccarat: vince la parte su cui il truccato ha puntato di più ----
for (const lato of ['punto', 'banco', 'pareggio']) {
  for (let k = 0; k < 15; k++) {
    const g = crea('baccarat', 2);
    const prima = g.scarpa.length;
    T.arma(g, 0);
    g.azione(0, { tipo: 'punta', puntate: { punto: lato === 'punto' ? 50 : 10, banco: lato === 'banco' ? 50 : 0, pareggio: lato === 'pareggio' ? 50 : 0 } });
    g.azione(1, { tipo: 'punta', puntate: { banco: 10 } });
    assert.strictEqual(g.mano.vince, lato, `baccarat: vince ${lato}`);
    assert.strictEqual(g.scarpa.length + g.mano.P.length + g.mano.B.length, prima, 'baccarat: le carte tornano');
    assert.ok(!T.armato(g, 0));
  }
}
// ---- higher or lower: la carta va dalla parte puntata ----
for (let k = 0; k < 60; k++) {
  const g = crea('higherlower', 2);
  const scelta = g.quote.alta && (!g.quote.bassa || k % 2) ? 'alta' : 'bassa';
  const prima = g.mazzo.length;
  T.arma(g, 0);
  g.azione(0, { tipo: 'punta', scelta, importo: 10 });
  g.azione(1, { tipo: 'punta', scelta: g.quote.alta ? 'alta' : 'bassa', importo: 10 });
  assert.strictEqual(g.uscita.esito, scelta, 'higherlower: indovinata');
  assert.strictEqual(g.mazzo.length, prima - 1);
}
// ---- roulette: esce il numero (o la puntata) che paga di più ----
{
  const g = crea('roulette', 2);
  T.arma(g, 0);
  g.azione(0, { tipo: 'punta', puntate: { n17: 20, rosso: 5 } });
  g.azione(1, { tipo: 'punta', puntate: { nero: 100 } });
  assert.strictEqual(g.numero, 17, 'roulette: esce il numero puntato');
  const { numeroMigliore, colore } = GIOCHI.roulette._test;
  for (let k = 0; k < 30; k++) assert.strictEqual(colore(numeroMigliore({ rosso: 100, n0: 5 })), 'rosso');
  for (let k = 0; k < 30; k++) { const n = numeroMigliore({ d3: 50, pari: 10 }); assert.ok(n >= 25 && n % 2 === 0); }
}

// ---- poker: la mano migliore del tavolo (almeno una scala quasi sempre) ----
const { migliore, valuta5 } = require('../../giochi/poker-motore');
const { miglioreOmaha } = GIOCHI.omaha._test;
function provaPoker(id, n, finale) {
  let forti = 0;
  const N = 25;
  for (let k = 0; k < N; k++) {
    const g = crea(id, n);
    T.arma(g, 0);
    g.nuovaMano();
    assert.ok(!T.armato(g, 0), `${id}: trucco usato`);
    const tutte = [...g.mazzo, ...g.carte.flat()];
    assert.ok(tutte.length === 52 && distinte(tutte), `${id}: 52 carte diverse`);
    const punti = finale(g);
    for (let i = 1; i < n; i++) assert.ok(punti[0] > punti[i], `${id}: il truccato ha la mano migliore`);
    if (Math.floor(punti[0] / 759375) >= 4) forti++;
  }
  assert.ok(forti >= N * 0.9, `${id}: quasi sempre almeno una scala (${forti}/${N})`);
}
// le carte comuni che usciranno: dalla cima del mazzo, saltando le bruciate
const tavolaFutura = (g) => { const m = g.mazzo.slice(); const t = []; for (const q of [3, 1, 1]) { m.pop(); for (let x = 0; x < q; x++) t.push(m.pop()); } return t; };
provaPoker('texas', 4, (g) => { const t = tavolaFutura(g); return g.carte.map((c) => migliore([...c, ...t]).punti); });
provaPoker('omaha', 4, (g) => { const t = tavolaFutura(g); return g.carte.map((c) => miglioreOmaha(c, t).punti); });
provaPoker('poker5', 4, (g) => g.carte.map((c) => valuta5(c).punti));
{
  const g = crea('poker5', 3);
  T.arma(g, 0); g.nuovaMano();
  assert.ok(valuta5(g.carte[0]).cat >= 5, 'poker5: servito con colore, full o poker');
  assert.deepStrictEqual(GIOCHI.poker5._test.daCambiare(g.carte[0], 'medio').length <= 1, true);
}

// ---- sette e mezzo: figura coperta, poi un 7 alla prima carta chiesta; il banco non lo pareggia ----
for (let k = 0; k < 60; k++) {
  const g = crea('settemezzo', 2);
  T.arma(g, 0);
  g.azione(0, { tipo: 'punta', importo: 10 });
  g.azione(1, { tipo: 'punta', importo: 10 });
  assert.ok(g.mani[0].carte[0].rango >= 8, 'settemezzo: figura servita');
  assert.ok(!T.armato(g, 0));
  if (g.turno === 0) g.azione(0, { tipo: 'carta' });
  const { conta } = GIOCHI.settemezzo._test;
  assert.ok(conta(g.mani[0].carte).setteMezzo, 'settemezzo: sette e mezzo con due carte');
  for (let passi = 0; passi < 50 && g.fase !== 'pagamenti'; passi++) {
    if (g.inAttesa) g.avanza();
    else if (g.turno != null) g.azione(g.turno, GIOCHI.settemezzo.bot(g, g.turno, 'medio'));
  }
  assert.strictEqual(g.mani[0].esito, 'settemezzo', 'settemezzo: paga doppio');
  const tutte = [...g.mazzo, ...g.banco, ...g.mani.flatMap((m) => m.carte)];
  assert.ok(tutte.length === 40 && distinte(tutte), 'settemezzo: 40 carte diverse');
}
// ---- video poker: poker o scala reale servita ----
{
  const { categoria, numero, CAT } = GIOCHI.videopoker._test;
  for (let k = 0; k < 40; k++) {
    const g = crea('videopoker', 1);
    T.arma(g, 0);
    g.azione(0, { tipo: 'distribuisci', crediti: 5 });
    const c = categoria(g.carte.map(numero));
    assert.ok(c === CAT.poker || c === CAT.royal, 'videopoker: poker o scala reale');
    const tutte = [...g.mazzo, ...g.carte];
    assert.ok(tutte.length === 52 && distinte(tutte));
    g.azione(0, { tipo: 'cambia', tieni: g.calcolaConsiglio().tieni });
    assert.ok(g.esito.vinto >= 25 * 5 * 5, 'videopoker: vincita grossa');
  }
}

// ---- affari in città: dalla partenza si finisce su una proprietà libera da comprare ----
{
  const { CASELLE } = GIOCHI.affari._test;
  for (let k = 0; k < 20; k++) {
    const g = crea('affari', 2);
    T.arma(g, 0);
    g.azione(0, { tipo: 'tira' });
    const c = g.pos[0];
    assert.ok(['terreno', 'stazione', 'societa'].includes(CASELLE[c].tipo) && g.fase === 'compra', 'affari: proprietà libera');
    assert.ok(!T.armato(g, 0));
  }
  // in prigione: esce col doppio
  const g = crea('affari', 2);
  g.inPrigione[0] = 0; g.pos[0] = 10;
  T.arma(g, 0);
  g.azione(0, { tipo: 'tira' });
  assert.ok(g.dadi[0] === g.dadi[1] && g.inPrigione[0] === -1, 'affari: doppio per uscire di prigione');
}
// ---- cinque dadi: cinque uguali ----
{
  const g = crea('yahtzee', 2);
  T.arma(g, 0);
  g.azione(0, { tipo: 'tira' });
  assert.ok(g.dadi.every((x) => x === g.dadi[0]), 'yahtzee: cinque dadi uguali');
  g.azione(0, { tipo: 'segna', cat: 'cinque5' });
  // con dadi tenuti diversi tra loro: il tiro migliore possibile (qui la scala grande)
  g.azione(1, { tipo: 'tira' }); g.azione(1, { tipo: 'segna', cat: 'somma' });
  g.dadi = [1, 1, 1, 1, 1]; g.azione(0, { tipo: 'tira' });
  g.dadi = [2, 3, 4, 5, 6]; g.tiri = 1;
  T.arma(g, 0);
  g.azione(0, { tipo: 'tira', tieni: [0, 1, 2] });
  assert.ok(GIOCHI.yahtzee._test === undefined || true);
  assert.ok([[2, 3, 4, 5, 6], [2, 3, 4, 5, 1]].some((d) => d.every((x, i) => g.dadi[i] === x)), `yahtzee: scala (${g.dadi})`);
}
// ---- shut the box: per tutto il turno i dadi migliori, quasi sempre si chiude la scatola ----
{
  let chiuse = 0;
  for (let k = 0; k < 20; k++) {
    const g = crea('shutbox', 2);
    T.arma(g, 0);
    for (let passi = 0; passi < 60 && g.turno === 0 && !g.finita && !g.inAttesa; passi++) g.azione(0, GIOCHI.shutbox.bot(g, 0, 'difficile'));
    if (g.finita && g.scatola === 0) chiuse++;
    assert.ok(!T.armato(g, 0), 'shutbox: il trucco vale un turno');
  }
  assert.ok(chiuse >= 16, `shutbox: scatola chiusa ${chiuse}/20`);
}
// ---- non t'arrabbiare: con tutte le pedine in casa esce il 6; se si può mangiare, il numero giusto ----
{
  const g = crea('ludo', 2);
  T.arma(g, 0);
  g.azione(0, { tipo: 'tira' });
  assert.strictEqual(g.dado, 6, 'ludo: il 6 per uscire');
  const h = crea('ludo', 2);
  h.pos[0] = [5, -1, -1, -1]; h.pos[1] = [-1, -1, -1, -1];
  h.pos[1][0] = (5 + 3 + 20 - 20 * 1) % 40; // il posto 1 (giallo, colore 2) ha una pedina 3 caselle davanti
  h.pos[1][0] = (2 * 10 * 3 + 8) % 40; // casella assoluta 8 vista dal giallo: (20 + r) % 40 = 8 → r = 28
  h.pos[1][0] = 28;
  T.arma(h, 0);
  h.azione(0, { tipo: 'tira' });
  assert.ok(h.dado === 3 || h.dado === 6, `ludo: il numero che mangia o fa uscire (${h.dado})`);
}
// ---- gioco dell'oca: al primo tiro il 9 con 5 e 4 (al 53); dal 57 dritti al 63 ----
{
  const g = crea('oca', 2);
  T.arma(g, 0);
  g.azione(0, { tipo: 'tira' });
  assert.strictEqual(g.pos[0], 53, 'oca: 9 al primo tiro');
  g.avanza(); g.azione(1, { tipo: 'tira' }); g.avanza();
  g.pos[0] = 57;
  if (g.turno === 0) { T.arma(g, 0); g.azione(0, { tipo: 'tira' }); assert.ok(g.finita && g.pos[0] === 63, 'oca: arriva al 63'); }
}
// ---- backgammon: il tiro che lascia la posizione migliore per la rete ----
{
  const { posizioniFinali, rete } = GIOCHI.backgammon._test;
  const g = crea('backgammon', 2);
  for (let passi = 0; passi < 20 && g.fase !== 'tira'; passi++) { if (g.inAttesa) g.avanza(); else g.azione(g.turno, GIOCHI.backgammon.bot(g, g.turno, 'medio')); }
  const p = g.turno;
  const valore = (a, b) => { const f = posizioniFinali(g.t[p], g.t[1 - p], [a, b]); return f.length && f[0].passi.length ? Math.max(...f.map((x) => rete(x.mie, x.sue))) : -1; };
  let max = -Infinity; for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) max = Math.max(max, valore(a, b));
  T.arma(g, p);
  g.azione(p, { tipo: 'tira' });
  assert.ok(Math.abs(valore(g.dadi[0], g.dadi[1]) - max) < 0.002, 'backgammon: il tiro migliore');
  assert.ok(!T.armato(g, p));
}
// ---- 2048: le prossime mosse migliori, in segreto ----
{
  const g = crea('duemila', 1, {}, [null]);
  T.arma(g, 0);
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.length === 1 && s[0].posto === 0 && /^💡 /.test(s[0].testo), '2048: suggerimento');
  const { prossimeMosse, scorri } = GIOCHI.duemila._test;
  const m = prossimeMosse(g.griglie[0].valori(), g.griglie[0].seme, g.griglie[0].k, 4);
  assert.ok(m.length >= 1 && scorri(g.griglie[0].valori(), m[0]).mosso, '2048: mossa legale');
}
// ---- sasso carta forbice: il suggerimento se l'altro ha già scelto, altrimenti si vince alla rivelazione ----
{
  const g = crea('morra', 2);
  T.arma(g, 0);
  g.azione(1, { tipo: 'scegli', mossa: 'sasso' });
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.length === 1 && s[0].testo === '💡 Gioca la carta', 'morra: suggerimento');
  g.azione(0, { tipo: 'scegli', mossa: 'carta' });
  assert.strictEqual(g.rivela.vince, 0);
  g.avanza();
  T.arma(g, 0);
  g.azione(0, { tipo: 'scegli', mossa: 'sasso' });
  T.controllaSuggerimenti(g);
  assert.deepStrictEqual(T.prendiSussurri(g), [], 'morra: niente suggerimento se ha già scelto');
  g.azione(1, { tipo: 'scegli', mossa: 'carta' });
  assert.ok(g.rivela.vince === 0 && g.rivela.scelte[0] === 'forbice', 'morra: indovina');
  // meno uno: tiene la mano che vince
  const h = crea('morra', 2, { modo: 'meno1' });
  T.arma(h, 0);
  h.azione(0, { tipo: 'scegli2', mosse: ['sasso', 'forbice'] });
  h.azione(1, { tipo: 'scegli2', mosse: ['carta', 'carta'] });
  h.azione(0, { tipo: 'tieni', mano: 0 });
  h.azione(1, { tipo: 'tieni', mano: 1 });
  assert.ok(h.rivela.vince === 0 && h.rivela.scelte[0] === 'forbice', 'morra meno uno: indovina');
}

console.log('✓ Trucco segreto, gruppo casino: baccarat, higher or lower, roulette, poker (texas, omaha, 5 carte), sette e mezzo, video poker, affari, cinque dadi, shut the box, ludo, oca, backgammon, 2048, morra');
