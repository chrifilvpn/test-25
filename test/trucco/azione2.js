// Il trucco segreto nei giochi del gruppo "azione2": giochi d'azione in tempo reale, i giochi di Squid Game e Draghi e
// Segrete. Nei giochi in tempo reale il vantaggio dura il round in corso (al massimo 25-30 secondi di gioco), poi il
// trucco si spegne; a Draghi e Segrete il prossimo d20 del personaggio è un 20 naturale.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');
const R = require('../../giochi3/draghi/regole');

const veroNow = Date.now;
let ora = veroNow();
Date.now = () => ora;
const crea = (id, n, opzioni = {}, bot) => {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  return mod.crea({ n, primo: 0, opzioni: opz, bot: bot || Array.from({ length: n }, () => 'medio') });
};
// finisce il conto alla rovescia del round
const via = (g) => { ora = Math.max(ora, g.fineFase); g.tick(ora); assert.strictEqual(g.fase, 'gioco'); };
// gioca sec secondi (si ferma prima se ogni() restituisce true)
function gioca(g, sec, ogni) {
  const passi = Math.round((sec * 1000) / g.tickMs);
  for (let k = 0; k < passi && !g.finita; k++) { ora += g.tickMs; g.tick(ora); if (ogni && ogni()) return true; }
  return false;
}
const finoA = (g, sec, cond) => gioca(g, sec, cond);

try {
  // ---- 1, 2, 3 stella: con il trucco la bambola non ti vede muovere ----
  for (const trucco of [true, false]) {
    const g = crea('stella', 2, {}, [null, 'medio']);
    if (trucco) T.arma(g, 0);
    via(g);
    g.input(0, { x: 1, y: 0 }); // corre sempre, anche quando la bambola guarda
    finoA(g, 20, () => g.e[0].fuori || g.e[0].arrivo !== null);
    if (trucco) assert.ok(!g.e[0].fuori && g.e[0].arrivo !== null, 'stella: con il trucco si arriva correndo sempre');
    else assert.ok(g.e[0].fuori, 'stella: senza trucco chi corre sempre è eliminato');
  }
  // ---- tiro alla fune: la squadra truccata tira più forte (anche contro il computer difficile) ----
  for (let k = 0; k < 4; k++) {
    const g = crea('fune', 2, { modo: 'uno' }, ['medio', 'difficile']);
    T.arma(g, 0);
    via(g);
    finoA(g, 45, () => g.perdente !== null);
    assert.notStrictEqual(g.perdente, null, 'fune: qualcuno cade');
    assert.notStrictEqual(g.perdente, g.squadraDi(0), 'fune: vince chi ha il trucco');
  }
  // ---- dalgona: il biscotto non si incrina finché dura il trucco, poi il trucco si spegne ----
  {
    const g = crea('dalgona', 2, {}, ['facile', 'medio']);
    T.arma(g, 0);
    via(g);
    gioca(g, 29, () => { if (T.armato(g, 0)) assert.strictEqual(g.b[0].danno, 0, 'dalgona: niente crepe con il trucco'); return g.round > 1; }); // (finito il round il trucco si spegne)
    gioca(g, 2);
    assert.ok(!T.armato(g, 0), 'dalgona: il trucco si spegne dopo una trentina di secondi');
  }
  // ---- occhi nel buio: il Cercatore con il trucco non lascia nuvole rosse ----
  {
    const g = crea('buio', 2);
    assert.strictEqual(g.cercatore, 0);
    T.arma(g, 0);
    via(g);
    gioca(g, 24, () => { assert.ok(!g.nuvole.some((q) => q.c === 'rossa'), 'buio: niente nuvola rossa'); return false; });
    gioca(g, 2);
    assert.ok(!T.armato(g, 0), 'buio: il trucco dura al massimo 25 secondi');
  }
  // ---- ponte fragile: il suggerimento dice i vetri buoni da qui alla fine ----
  {
    const g = crea('ponte', 3);
    assert.strictEqual(g.turno, null);
    g.stato[1] = 'caduto';
    T.arma(g, 1);
    assert.strictEqual(g.suggerimentoWin(1), null, 'ponte: niente suggerimento a chi non è più sul ponte');
    T.arma(g, 0);
    T.controllaSuggerimenti(g);
    const s = T.prendiSussurri(g).find((m) => m.posto === 0);
    assert.ok(s && s.testo.endsWith(g.sicuro.map((l) => (l ? 'D' : 'S')).join(' ')), 'ponte: la strada giusta');
    assert.ok(!T.armato(g, 0) && T.armato(g, 1));
    // seguendola si arriva dall'altra parte (aspettando l'equilibrio dopo ogni salto)
    const vero = Date.now; let ora = vero(); Date.now = () => ora;
    try { for (const l of g.sicuro) { ora += 1000; const r = g.azione(0, { tipo: 'salta', lato: l }); assert.ok(r.ok, r.errore); } } finally { Date.now = vero; }
    assert.strictEqual(g.stato[0], 'salvo');
  }
  // ---- biglie: chi scommette sa quante biglie ha in pugno l'altro ----
  {
    const g = crea('biglie', 2);
    T.arma(g, 1);
    assert.strictEqual(g.suggerimentoWin(1), null, 'biglie: mentre l\'altro nasconde niente');
    g.azione(0, { tipo: 'nascondi', quante: 3 });
    T.controllaSuggerimenti(g);
    const s = T.prendiSussurri(g).find((m) => m.posto === 1);
    assert.ok(s && /3/.test(s.testo) && /DISPARI/.test(s.testo), 'biglie: 3, dispari');
    assert.ok(!T.armato(g, 1));
  }
  // ---- calamaro: con il trucco non ti butta fuori nessuno ----
  for (let k = 0; k < 3; k++) {
    const g = crea('calamaro', 4);
    T.arma(g, 1); // posto 1: difensore nel primo round
    via(g);
    gioca(g, 24, () => { assert.ok(!g.e[1].fuori, 'calamaro: il truccato resta nel disegno'); return false; });
  }
  // ---- asteroidi: invulnerabile per 25 secondi ----
  {
    const g = crea('asteroidi', 2, {}, [null, 'medio']);
    T.arma(g, 0);
    via(g);
    g.input(0, { x: 1, y: 0.3 }); // va a sbattere contro tutto
    gioca(g, 24);
    assert.strictEqual(g.navi[0].vite, 3, 'asteroidi: nessuna vita persa');
    gioca(g, 2);
    assert.ok(!T.armato(g, 0));
  }
  // ---- battitura: punti doppi nel testo in corso ----
  {
    const g = crea('battitura', 2, { lunghezza: 'corta' }, ['difficile', 'facile']);
    T.arma(g, 0);
    via(g);
    finoA(g, 120, () => g.fase === 'pausaRound');
    assert.strictEqual(g.punti[0], (2 - g.g[0].pos + 1) * 2, 'battitura: punti doppi');
    assert.strictEqual(g.punti[1], g.g[1].pos ? 2 - g.g[1].pos + 1 : 0);
    assert.ok(!T.armato(g, 0));
  }
  // ---- bomberman: le fiamme non bruciano chi ha il trucco ----
  {
    const { idx } = GIOCHI.bomberman._test;
    const g = crea('bomberman', 2);
    T.arma(g, 0);
    via(g);
    gioca(g, 0.1);
    for (const p of [0, 1]) { const e = g.e[p]; g.fiamme.set(idx(Math.round(e.x), Math.round(e.y)), { fino: g.tempoRound + 1, o: 0, da: 1 - p }); }
    gioca(g, 0.05);
    assert.ok(g.e[0].vivo, 'bomberman: il truccato resta vivo');
    assert.ok(!g.e[1].vivo, 'bomberman: l\'altro brucia');
  }
  // ---- calcio balilla: il tiro va dritto in porta, nell'angolo lontano dal portiere ----
  {
    const g = crea('calcetto', 2, {}, [null, null]);
    T.arma(g, 0);
    via(g);
    gioca(g, 0.05);
    const a = g.aste.find((x) => x.sq === 0 && x.ruolo === 'attacco');
    const x = g.omini(a)[1];
    Object.assign(g.palla, { x, y: a.y - 20, vx: 0, vy: 0 });
    a.tiro = 0.26;
    g.fisica(0.002);
    const b = g.palla, t = -b.y / b.vy; // quando arriva alla riga di porta (y = 0)
    assert.ok(b.vy < 0 && Math.abs(b.x + b.vx * t - 300) < 90, 'calcetto: il tiro punta dentro la porta');
  }
  // ---- carri: il colpo non fa saltare chi ha il trucco ----
  {
    const g = crea('carri', 2);
    T.arma(g, 0);
    via(g);
    gioca(g, 0.05);
    g.colpito(g.c[0], { di: 1 });
    assert.ok(g.c[0].vivo, 'carri: il truccato resta in piedi');
    g.colpito(g.c[1], { di: 0 });
    assert.ok(!g.c[1].vivo);
  }
  // ---- corsa: con il trucco la macchina va oltre la velocità massima ----
  {
    const { SEMAFORO, V_MAX } = GIOCHI.corsa._test;
    const g = crea('corsa', 2, {}, [null, 'medio']);
    T.arma(g, 0);
    via(g);
    gioca(g, SEMAFORO + 0.1);
    const c = g.auto[0];
    c.vx = Math.cos(c.a) * V_MAX; c.vy = Math.sin(c.a) * V_MAX;
    for (let k = 0; k < 8; k++) g.guidaAuto(c, { x: 0, y: -1 }, 0.025, null);
    assert.ok(Math.hypot(c.vx, c.vy) > V_MAX * 1.04, 'corsa: più veloce del massimo');
  }
  // ---- patata bollente: non parte da te e non ti scoppia in mano ----
  {
    const g = crea('patata', 4);
    T.arma(g, 0);
    via(g);
    gioca(g, 0.1);
    for (let k = 0; k < 40; k++) { g.daiBomba(); assert.notStrictEqual(g.bomba.chi, 0, 'patata: non parte dal truccato'); }
    g.bomba = { chi: 0, da: null, dal: g.tempoRound, accesa: g.tempoRound - 50, durata: 1 };
    gioca(g, 0.5);
    assert.ok(!g.e[0].fuori, 'patata: in mano al truccato non scoppia');
  }
  // ---- pong a quattro: la porta del truccato respinge la pallina ----
  {
    const g = crea('pong4', 2, {}, [null, 'medio']);
    T.arma(g, 0);
    via(g);
    gioca(g, 22); // la racchetta del posto 0 resta ferma
    assert.strictEqual(g.r[0].vite, g.viteIniziali, 'pong4: nessuna vita persa');
  }
  // ---- serpentoni: il turbo è gratis e si passa attraverso gli altri ----
  {
    const g = crea('slither', 2);
    T.arma(g, 0);
    via(g);
    gioca(g, 0.1);
    const s = g.s[0], L = s.L;
    s.turbo = true; g.avanza(s, 0.5);
    assert.strictEqual(s.L, L, 'slither: il turbo non accorcia');
    // un altro serpente proprio sopra la testa
    const o = g.s[1];
    o.p = Array.from({ length: 30 }, (_, k) => ({ x: s.x + (k - 15) * 5, y: s.y }));
    o.x = o.p[0].x; o.y = o.p[0].y; o.L = 300;
    g.costruisciCorpi();
    assert.ok(g.tocca(s.x, s.y, s.r * 0.6, 0), 'slither: c\'è un corpo sulla testa');
    gioca(g, 0.05);
    assert.ok(s.vivo, 'slither: il truccato ci passa attraverso');
  }
  // ---- moto di luce: la moto non si schianta (gira da sola) ----
  for (const trucco of [true, false]) {
    const g = crea('tron', 2, { extra: 0 }, [null, 'medio']);
    if (trucco) T.arma(g, 0);
    via(g);
    gioca(g, 15); // il posto 0 non tocca niente: andrebbe dritto contro il bordo
    if (trucco) assert.ok(g.m[0].vivo, 'tron: con il trucco la moto si salva da sola');
    else assert.ok(!g.m[0].vivo || g.round > 1 || g.fase === 'pausaRound', 'tron: senza trucco si schianta');
  }
  // ---- hockey: il tiro del truccato passa il portiere ----
  for (const trucco of [true, false]) {
    const { W, H, portaX } = GIOCHI.hockey._test;
    const g = crea('hockey', 2);
    if (trucco) T.arma(g, 0);
    via(g);
    gioca(g, 0.05);
    for (const p of g.g) { p.x = 300; p.y = 80 + p.k * 40; p.vx = p.vy = 0; p.pausa = 5; }
    const q = g.portieri[1];
    q.x = portaX(1) - 26; q.y = H / 2; q.mente.fino = 99; q.mente.tx = q.x; q.mente.ty = q.y;
    Object.assign(g.disco, { x: W - 300, y: H / 2, vx: 900, vy: 0, chi: null, ultimo: 0, assist: null });
    g.tiro = { k: 0, t: g.tempoRound };
    gioca(g, 0.6);
    if (trucco) assert.strictEqual(g.gol[0], 1, 'hockey: con il trucco il tiro entra');
    else assert.strictEqual(g.gol[0], 0, 'hockey: senza trucco il portiere para');
  }
  // ---- draghi e segrete: il prossimo d20 è un 20 naturale ----
  {
    for (let k = 0; k < 20; k++) {
      assert.strictEqual(R.d20({ venti: true }).valore, 20);
      const v = R.d20({ venti: true, vantaggio: true });
      assert.ok(v.valore === 20 && v.dadi.includes(20) && v.modo === 'vantaggio');
    }
    const g = crea('draghi', 2, {}, [null, 'medio']);
    g.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
    for (let i = 0; i < 2; i++) if (!g.pg[i]) g.azioneCreazione(i, { tipo: 'crea', casuale: true, scelte: {} });
    assert.ok(g.pg[0] && g.pg[1], 'draghi: personaggi creati');
    // una prova difficilissima: con il trucco esce 20
    g.attesaIA = false; g.fase = 'prove';
    g.prove = [{ id: 1, posto: 0, tipo: 'percezione', cd: 35 }, { id: 2, posto: 1, tipo: 'percezione', cd: 35 }];
    T.arma(g, 0);
    g.trucco(0);
    assert.ok(T.prendiSussurri(g).some((m) => m.posto === 0), 'draghi: un cenno segreto a chi l\'ha scritto');
    assert.ok(g.azione(0, { tipo: 'tira', id: 1 }).ok);
    assert.strictEqual(g.prove.length ? g.prove[0].esito.naturale : g.ultimiEsiti[0].naturale, 20, 'draghi: 20 naturale nella prova');
    assert.ok(!T.armato(g, 0), 'draghi: vale una volta');
    // in combattimento: il prossimo tiro salvezza (o attacco) del personaggio
    g.attesaIA = false; g.rispostaIA = null; g.prove = [];
    g.iniziaCombattimento({ nemici: [{ id: 'lupo', n: 2 }] });
    const cb = g.combattimento, c = g.creaturaDi(0);
    assert.ok(cb && c);
    assert.ok(!cb.ventiPer(c));
    T.arma(g, 0);
    const ts = cb.tiroSalvezza(c, 'des', 40);
    assert.strictEqual(ts.d20.valore, 20, 'draghi: 20 naturale nel tiro salvezza');
    assert.ok(!T.armato(g, 0));
    T.arma(g, 0);
    const lupo = cb.creature.find((x) => x.lato === 'nemici'), att = c.ref.attacchi[0];
    assert.ok(att, 'draghi: il personaggio ha un attacco');
    const ev = cb.risolviAttacco(c, lupo, att);
    assert.ok(!T.armato(g, 0), 'draghi: l\'attacco usa il trucco');
    assert.ok(!ev || ev.valore === undefined || ev.valore === 20, 'draghi: attacco con 20 naturale');
  }
} finally {
  Date.now = veroNow;
}
console.log('✓ Trucco nei giochi d\'azione e di Squid Game: stella, fune, dalgona, buio, ponte, biglie, calamaro, asteroidi, battitura, bomberman, calcetto, carri, corsa, patata, pong4, slither, tron, hockey, draghi');
