// STICK WAR: minatori e oro, addestramento (costo, coda, posti), ordini, combattimento (gittata, area,
// armatura), comando a mano, potenziamenti, statue, campagna, sfida, non morti, !win e partite intere tra computer.
const assert = require('assert');
const M = require('../../giochi3/stickwar');
const T = require('../../giochi/trucco');
const { UNITA, LIVELLI, POTENZIAMENTI, L, STATUA } = M._test;

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 50; g.fineFase = ora; g.tick(ora); } return ora; };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.05); k++) { g.tempoRound += 0.05; if (g.passo(0.05)) return true; } return false; };
const sgombra = (g) => { g.u = []; };

assert.strictEqual(M.meta.id, 'stickwar');
assert.ok(M.meta.regole.length >= 5 && M.meta.tempoReale && M.meta.pausaBoss);
assert.strictEqual(LIVELLI.length, 8);
// ---- inizio: due minatori e un soldato per parte, 500 monete ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
  assert.strictEqual(g.u.filter((u) => u.lato === 0 && u.tipo === 'minatore').length, 2);
  assert.ok(g.eserciti.every((e) => e.oro === 500 && e.statua === 3000));
  assert.deepStrictEqual(g.eserciti[0].tipi, ['minatore', 'spada'], 'livello 1: solo minatori e spadaccini');
  assert.ok(g.azione(0, { tipo: 'addestra', unita: 'arciere' }).errore, 'arciere non ancora');
}
// ---- i minatori portano l'oro ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g); sgombra(g);
  g.nasce(0, 'minatore');
  const oro = g.eserciti[0].oro;
  passa(g, 25);
  assert.ok(g.eserciti[0].oro >= oro + 100, `il minatore porta oro (${g.eserciti[0].oro - oro})`);
  g.eserciti[0].oro = 1000; assert.ok(g.azione(0, { tipo: 'potenzia', quale: 'miniera' }).ok);
  assert.ok(g.azione(0, { tipo: 'potenzia', quale: 'miniera' }).errore, 'una volta sola');
}
// ---- addestrare: costo, coda, annulla, posti ----
{
  const g = M.crea({ n: 1, opzioni: { livello: 8 }, bot: [null] }); parti(g); sgombra(g);
  const e = g.eserciti[0]; e.oro = 10000;
  for (let k = 0; k < 5; k++) assert.ok(g.azione(0, { tipo: 'addestra', unita: 'spada' }).ok);
  assert.ok(/coda/.test(g.azione(0, { tipo: 'addestra', unita: 'spada' }).errore));
  assert.strictEqual(e.oro, 10000 - 5 * UNITA.spada.costo);
  assert.ok(g.azione(0, { tipo: 'annulla', unita: 'spada' }).ok && e.oro === 10000 - 4 * UNITA.spada.costo, 'annullato e restituito');
  passa(g, UNITA.spada.tempo + 0.1);
  assert.strictEqual(g.u.filter((u) => u.lato === 0 && u.tipo === 'spada').length, 1, 'uno alla volta');
  for (let k = 0; k < 10; k++) g.nasce(0, 'gigante');
  assert.ok(g.pop(0) > 40);
  const prima = g.u.length; passa(g, 10); assert.ok(g.u.filter((u) => u.lato === 0).length <= prima, 'esercito pieno: aspetta');
  e.oro = 0; assert.ok(/Servono/.test(g.azione(0, { tipo: 'addestra', unita: 'mago' }).errore));
}
// ---- combattimento: lo spadaccino attacca, l'arciere da lontano, il mago ad area, l'armatura ----
{
  const g = M.crea({ n: 2, opzioni: { modo: 'sfida' }, bot: [null, null] }); parti(g); sgombra(g);
  g.eserciti.forEach((e) => { e.ordine = 'attacco'; });
  const a = g.nasce(0, 'spada', 0, 1500), b = g.nasce(1, 'spada', 0, 1600);
  passa(g, 3);
  assert.ok(a.vita < a.max || b.vita < b.max, 'si colpiscono');
  sgombra(g);
  const arc = g.nasce(0, 'arciere', 0, 1200), n = g.nasce(1, 'gigante', 0, 1550); n.x = 1550;
  g.eserciti[1].ordine = 'difesa';
  const v0 = n.vita; arc.ric = 0; g.muovi(arc, 0.05);
  assert.ok(n.vita < v0 && Math.abs(arc.x - 1200) < 10, 'l\'arciere tira da 350 senza muoversi');
  sgombra(g);
  const mago = g.nasce(0, 'mago', 0, 1300), z = [1550, 1570, 1590].map((x) => g.nasce(1, 'spada', 0, x));
  g.eserciti[0].ordine = 'attacco'; mago.ric = 0; g.muovi(mago, 0.05);
  assert.ok(z.every((u) => u.vita < u.max), 'magia ad area');
  sgombra(g);
  const s1 = g.nasce(0, 'spada', 0, 1500), l1 = g.nasce(1, 'lanciere', 0, 1520);
  s1.ric = 0; g.attacca(s1, UNITA.spada, l1);
  assert.ok(Math.abs(l1.max - l1.vita - UNITA.spada.danno * 0.7) < 1e-6, 'armatura del lanciere');
}
// ---- ordini: difesa davanti alla statua, attacco fino alla statua nemica ----
{
  const g = M.crea({ n: 2, opzioni: { modo: 'sfida' }, bot: [null, null] }); parti(g); sgombra(g);
  const s = g.nasce(0, 'spada', 600);
  assert.ok(g.azione(0, { tipo: 'ordine', quale: 'difesa' }).ok); passa(g, 6);
  assert.ok(Math.abs(s.x - (STATUA + 260)) < 40, `in difesa davanti alla statua (${s.x})`);
  assert.ok(g.azione(0, { tipo: 'ordine', quale: 'boh' }).errore);
  g.azione(0, { tipo: 'ordine', quale: 'attacco' }); passa(g, 40);
  assert.ok(g.eserciti[1].statua < 3000, 'arriva alla statua e la colpisce');
}
// ---- comando a mano ----
{
  const g = M.crea({ n: 2, opzioni: { modo: 'sfida' }, bot: [null, null] }); parti(g); sgombra(g);
  const s = g.nasce(0, 'spada', 300), m = g.nasce(0, 'minatore'), nem = g.nasce(1, 'spada', 0, 0);
  assert.ok(g.azione(0, { tipo: 'controlla', id: m.id }).errore, 'i minatori no');
  assert.ok(g.azione(1, { tipo: 'controlla', id: s.id }).errore, 'solo i propri');
  assert.ok(g.azione(0, { tipo: 'controlla', id: s.id }).ok && s.chi === 0);
  const x0 = s.x; g.azione(0, { tipo: 'muovi', dir: 1 }); passa(g, 1);
  assert.ok(s.x > x0 + UNITA.spada.v, 'più veloce del solito');
  g.azione(0, { tipo: 'muovi', dir: 0 }); nem.x = s.x + 20; nem.lato = 1; g.eserciti[1].ordine = 'difesa';
  s.ric = 0; g.azione(0, { tipo: 'colpisci' }); g.muovi(s, 0.05);
  assert.ok(Math.abs(nem.max - nem.vita - UNITA.spada.danno * 1.5) < 1e-6, 'colpo a mano: +50%');
  g.azione(0, { tipo: 'lascia' }); assert.ok(s.chi === -1 && g.comando[0] === null);
}
// ---- potenziamenti ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
  const e = g.eserciti[0]; e.oro = 5000;
  for (const q of Object.keys(POTENZIAMENTI)) assert.ok(g.azione(0, { tipo: 'potenzia', quale: q }).ok, q);
  assert.strictEqual(e.max, 4500); assert.ok(g.u.filter((u) => u.lato === 0).every((u) => u.max === UNITA[u.tipo].vita * 1.25));
  assert.strictEqual(g.danno(0, UNITA.spada), UNITA.spada.danno * 1.25);
}
// ---- statua distrutta: fine ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
  g.eserciti[1].statua = 1; g.ferisciStatua(1, 5, { lato: 0 });
  assert.ok(passa(g, 0.05) && g.vinto === 0);
}
// ---- non morti: giorno, notte, ondate dalla cripta ----
{
  const g = M.crea({ n: 1, opzioni: { modo: 'nonmorti', notti: 5 }, bot: [null] }); parti(g);
  assert.ok(g.eserciti[1].nessuna && !g.u.some((u) => u.lato === 1));
  passa(g, 26);
  assert.strictEqual(g.notte, 1); passa(g, 3);
  assert.ok(g.u.some((u) => u.lato === 1 && u.tipo === 'zombi' && u.x > L - 100), 'gli zombi arrivano da destra');
  assert.ok(g.compOndata(5).some((x) => x[1] === 'gigante') && g.compOndata(10).some((x) => x[1] === 'medusa'));
}
// ---- torneo Crown of Inamorta: 5 battaglie, alla prima sconfitta si è fuori ----
{
  const g = M.crea({ n: 1, opzioni: { modo: 'torneo' }, bot: [null] }); parti(g);
  assert.strictEqual(g.nRound, 5); assert.strictEqual(g.livello, M._test.TORNEO[0]);
  assert.strictEqual(g.eserciti[0].tipi.length, 6, 'tutte le unità');
  g.eserciti[1].statua = 0; passa(g, 0.05); g.vinto = 0; g.fineRound();
  assert.strictEqual(g.nRound, 5, 'vinta: si va avanti');
  g.round = 2; g.vinto = 1; g.fineRound(); assert.strictEqual(g.nRound, 2, 'persa: fuori');
  g.chiudi(); assert.ok(/eliminato alla battaglia 2/.test(g.risultato.titolo) && !g.risultato.vincitori.length);
}
// ---- con persone e computer: le persone insieme a sinistra, i computer guidano la tribù nemica ----
{
  const g = M.crea({ n: 3, opzioni: {}, bot: [null, 'medio', null] });
  assert.deepStrictEqual(g.lati, [0, 1, 0]);
  const s = M.crea({ n: 4, opzioni: { modo: 'sfida' }, bot: [null, null, null, null] });
  assert.deepStrictEqual(s.lati, [0, 1, 0, 1]);
}
// ---- !win: 1500 monete e doppi danni ----
{
  const g = M.crea({ n: 1, opzioni: {}, bot: [null] }); parti(g);
  T.arma(g, 0); const oro = g.eserciti[0].oro; passa(g, 0.05);
  assert.ok(g.eserciti[0].oro >= oro + 1500 && g.danno(0, UNITA.spada) === UNITA.spada.danno * 2);
  passa(g, 26); assert.ok(!T.armato(g, 0), 'dura 25 secondi');
}
// ---- partite intere tra computer ----
{
  const t0 = Date.now(), vinte = { facile: 0, difficile: 0 };
  const gioca = (opz, bot) => { const g = M.crea({ n: bot.length, opzioni: opz, bot }); let ora = Date.now(), k = 0; while (!g.finita) { ora += 50; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora); g.tick(ora); assert.ok(k++ < 40000, 'finisce'); } JSON.stringify(g.vista(0)); return g; };
  for (let k = 0; k < 4; k++) { const l = k % 2 ? ['facile', 'difficile'] : ['difficile', 'facile']; const g = gioca({ modo: 'sfida' }, l); vinte[l[g.vinto]]++; }
  assert.ok(vinte.difficile > vinte.facile, `il difficile vince di più (${JSON.stringify(vinte)})`);
  for (let lv = 1; lv <= 8; lv++) gioca({ livello: lv }, ['medio']);
  const nm = gioca({ modo: 'nonmorti', notti: 5 }, ['medio']);
  const to = gioca({ modo: 'torneo' }, ['difficile']); assert.ok(/Crown|Torneo/.test(to.risultato.titolo));
  assert.ok(nm.risultato.titolo);
  console.log(`✓ Stick War: minatori e oro, addestramento (coda, annulla, posti), combattimento (arcieri, magia ad area, armatura), ordini, comando a mano, potenziamenti, statue, non morti, posti, !win; partite tra computer: sfida f/d ${vinte.facile}/${vinte.difficile}, 8 livelli, notti (${Date.now() - t0} ms)`);
}
