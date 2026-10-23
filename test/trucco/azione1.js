// Il trucco segreto nei giochi d'azione e in tempo reale (gruppo azione1): vantaggi per il round in corso, colpi che
// entrano, suggerimenti giusti al momento giusto.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

const veroNow = Date.now;
let ora = veroNow();
const orologio = (t) => { ora = t; Date.now = () => ora; };
function nuova(id, n, bot = [], opzioni = {}) {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  orologio(veroNow());
  return mod.crea({ n, primo: 0, opzioni: opz, bot });
}
function passa(g, k = 1) { for (let i = 0; i < k && !g.finita; i++) { orologio(ora + (g.tickMs || 50)); g.tick(ora); } }
// i giochi sul motore Arena: si salta il conto alla rovescia
function avvia(g) { orologio(Math.max(ora, g.fineFase)); g.tick(ora); assert.strictEqual(g.fase, 'gioco'); passa(g); }
// arma il trucco e restituisce il suggerimento arrivato a quel posto (o null)
function chiedi(g, posto) {
  if (!T.armato(g, posto)) T.arma(g, posto);
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g).filter((m) => m.posto === posto);
  return s.length ? s[0].testo : null;
}
const fatti = [];
try {
  // SNAKE: davanti al muro il serpente col trucco gira da solo, e negli scontri non muore; dopo 25 s si spegne
  {
    const g = nuova('snake', 2, [null, null]);
    orologio(g.via + 1);
    const s = g.serpenti[0];
    s.corpo = [[1, 5], [2, 5], [3, 5]]; s.dir = 'sx'; s.coda = [];
    T.arma(g, 0);
    passa(g, 4);
    assert.ok(s.vivo && !T.armato(g, 0), 'snake: il serpente scansa il muro');
    assert.ok(g.conTrucco(0, ora + 24000) && !g.conTrucco(0, ora + 26000), 'snake: dura 25 secondi');
    fatti.push('snake');
  }
  // TETRIS: col trucco arriva il pezzo che serve (pozzo largo una colonna: la I) e la caduta è più lenta
  {
    const { pezzoComodo, W, H } = GIOCHI.tetris._test;
    const g = nuova('tetris', 2, [null, null]);
    const b = g.tab[0];
    b.g.fill(0);
    for (let y = H - 4; y < H; y++) for (let x = 0; x < W - 1; x++) b.g[y * W + x] = 1;
    assert.strictEqual(pezzoComodo(b), 'I');
    orologio(g.via + 10); T.arma(g, 0);
    b.nuovo();
    assert.strictEqual(b.t, 'I', 'tetris: col trucco arriva la I');
    fatti.push('tetris');
  }
  // AIR HOCKEY: il colpo di chi ha il trucco va dritto verso la porta avversaria
  {
    const g = nuova('airhockey', 2, [null, null]);
    orologio(g.fermoFino + 10);
    T.arma(g, 0);
    const m = g.mazze[0];
    Object.assign(m, { x: 150, y: 800, tx: 150, ty: 800 });
    g.disco = { x: 150, y: 735, vx: 0, vy: 0 };
    g.tick(ora); orologio(ora + 20); m.ty = 650; g.tick(ora);
    const c = g.disco, k = (0 - c.y) / c.vy, xPorta = c.x + c.vx * k;
    assert.ok(c.vy < 0 && Math.abs(xPorta - 300) < 115, `airhockey: il disco va in porta (${Math.round(xPorta)})`);
    fatti.push('airhockey');
  }
  // POMPA IL PALLONE: al suo turno gli si dice quante pompate regge il pallone
  {
    const g = nuova('pallone', 2);
    g.turno = 1;
    assert.strictEqual(chiedi(g, 0), null, 'pallone: non al turno degli altri');
    g.turno = 0;
    const s = chiedi(g, 0);
    assert.ok(s && (s.includes(String(g.scoppio)) || g.scoppio <= 1) && !T.armato(g, 0), 'pallone: il punto di scoppio');
    fatti.push('pallone');
  }
  // TASTI IN ORDINE: la sequenza in anteprima durante il conto alla rovescia, e gli errori non costano
  {
    const g = nuova('tasti', 2, [null, 'medio']);
    T.arma(g, 0);
    passa(g);
    const s = T.prendiSussurri(g).filter((m) => m.posto === 0);
    assert.ok(s.length && s[0].testo.replace(/[^A-Z]/g, '') === g.sequenza, 'tasti: la sequenza in anteprima');
    orologio(g.inizio); g.tick(ora);
    g.premi(0, 'ù', ora); g.premi(0, 'ù', ora);
    for (const ch of g.sequenza) g.premi(0, ch, ora + 1000);
    assert.strictEqual(g.g[0].errori, 0, 'tasti: errori gratis');
    while (g.fase === 'corsa') passa(g);
    assert.ok(!T.armato(g, 0), 'tasti: a fine round si spegne');
    fatti.push('tasti');
  }
  // THE MIND: il suggerimento arriva solo quando la sua carta è la più bassa di tutte
  {
    const g = nuova('mind', 2, [null, 'medio']);
    g.fase = 'gioco'; g.mani = [[30, 70], [50]];
    assert.ok(/30/.test(chiedi(g, 0)), 'mind: gioca il 30');
    T.arma(g, 1);
    assert.strictEqual(chiedi(g, 1), null, 'mind: non ancora il momento');
    g.mani[0] = [70];
    assert.ok(/50/.test(chiedi(g, 1)), 'mind: gioca il 50');
    fatti.push('mind');
  }
  // ALLEGRO CHIRURGO: per chi ha il trucco i bordi sono molto più tolleranti (anche nel suo browser), per gli altri no
  {
    const g = nuova('chirurgo', 2, [null, null]);
    T.arma(g, 0);
    assert.ok(g.vista(0).largo > 1 && g.vista(1).largo === undefined, 'chirurgo: solo lui ha la tolleranza');
    orologio(g.inizio); g.tick(ora);
    const pp = g.percorso.pts, w = g.vista(0).w;
    // un punto appena fuori dal corridoio (e lontano dagli altri giri del percorso)
    const { vicino } = GIOCHI.chirurgo._test;
    let fuori = null;
    for (let i = 30; i < pp.length - 30 && !fuori; i += 5) {
      const d = [pp[i + 1][1] - pp[i - 1][1], pp[i - 1][0] - pp[i + 1][0]], l = Math.hypot(...d) || 1;
      const x = pp[i][0] + (d[0] / l) * (w / 2 + 20), y = pp[i][1] + (d[1] / l) * (w / 2 + 20), v = vicino(g.percorso, x, y);
      if (v.d > w / 2 + 14 && v.idx > i - 20 && v.idx < i + 20) fuori = { x, y, i };
    }
    for (const p of [0, 1]) {
      g.input(p, { t: 'via', x: pp[0][0], y: pp[0][1] });
      g.g[p].idx = fuori.i;
      g.input(p, { t: 'pos', x: fuori.x, y: fuori.y });
    }
    assert.ok(g.g[0].stato === 'corre' && g.g[1].stato === 'pronto', 'chirurgo: lui fuori dal bordo resta in corsa, l\'altro ricomincia');
    while (g.fase === 'corsa') { orologio(ora + 60000); g.tick(ora); }
    assert.ok(!T.armato(g, 0), 'chirurgo: a fine round si spegne');
    fatti.push('chirurgo');
  }
  // HUMAN BENCHMARK: chi ha il trucco vince la prova in corso (di poco)
  {
    for (const tipo of ['reazione', 'sequenza']) {
      const g = nuova('benchmark', 2, [null, null]);
      g.tipo = tipo; g.fase = 'prova';
      T.arma(g, 1);
      g.finisci(0, tipo === 'reazione' ? 200 : 12); g.finisci(1, tipo === 'reazione' ? 340 : 5);
      assert.deepStrictEqual(g.punti, [0, 1], `benchmark: vince la prova ${tipo}`);
    }
    fatti.push('benchmark');
  }
  // PUTT PARTY: il prossimo tiro va in buca (in quasi tutte le buche di tutte le course, ovunque si miri)
  {
    const P = GIOCHI.putt, B = P._test.B;
    let buche = 0, inUno = 0;
    for (const c of B.NOMI_COURSE) for (let i = 0; i < B.COURSE[c].buche.length; i++) {
      const g = nuova('putt', 1, [], { prima: c });
      g.ordine = [[c, i]]; g.k = -1; g.prossimaBuca(ora);
      assert.strictEqual(chiedi(g, 0), null, 'putt: durante il via no');
      orologio(g.inizio); g.tick(ora);
      assert.ok(chiedi(g, 0), 'putt: il suggerimento');
      g.input(0, { t: 'tiro', a: Math.random() * 6.28, f: 0.3 + Math.random() * 0.7 });
      for (let k = 0; k < 2000 && !g.palle[0].dentro; k++) passa(g);
      buche++; if (g.palle[0].dentro && g.palle[0].colpi === 1) inUno++;
    }
    assert.ok(inUno >= buche - 2, `putt: buca in uno ${inUno} su ${buche}`);
    fatti.push('putt');
  }
  // PALLONCINI: col trucco gli spuntoni non lo fanno scoppiare
  {
    const g = nuova('palloncini', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    const b = g.pal[0];
    g.spuntoni.push({ id: 999, x: b.x, y: GIOCHI.palloncini._test.Y_PALLONE, r: 20, vx: 0, giro: 0 }, { id: 998, x: g.pal[1].x, y: GIOCHI.palloncini._test.Y_PALLONE, r: 20, vx: 0, giro: 0 });
    g.velocita = 0; g.L = { ...g.L, v0: 0, acc: 0 };
    passa(g);
    assert.ok(g.pal[0].vivo && !g.pal[1].vivo, 'palloncini: lui resta in aria');
    fatti.push('palloncini');
  }
  // IL GATTO E I TOPI: il topo col trucco non viene preso
  {
    const g = nuova('gattotopi', 3, [null, null, null]); avvia(g);
    const gatto = g.gatto, topi = [0, 1, 2].filter((p) => p !== gatto);
    T.arma(g, topi[0]);
    for (const p of topi) { Object.assign(g.e[p], { x: g.e[gatto].x, y: g.e[gatto].y, scudo: 0, fermo: 0 }); }
    passa(g);
    assert.ok(g.e[topi[0]].fermo <= 0 && g.e[topi[1]].fermo > 0, 'gattotopi: il topo col trucco scappa');
    fatti.push('gattotopi');
  }
  // LADRO DI COLORI: col trucco si colora di più (pennello largo e passo veloce)
  {
    const g = nuova('colori', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    g.e[0].x = 300; g.e[0].y = 300; g.e[1].x = 700; g.e[1].y = 300;
    g.inp[0].x = 1; g.inp[1].x = 1;
    g.conta.fill(0); g.griglia.fill(-1);
    passa(g, 30);
    assert.ok(g.conta[0] > g.conta[1] * 1.6, `colori: ${g.conta}`);
    fatti.push('colori');
  }
  // BUMPER BALLS: col trucco il bordo lo trattiene
  {
    const g = nuova('bumper', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    for (const p of [0, 1]) Object.assign(g.b[p], { x: 500 + (p ? -1 : 1) * 285, y: 310, vx: (p ? -1 : 1) * 300, vy: 0 });
    passa(g, 5);
    assert.ok(!g.b[0].fuori && g.b[1].fuori, 'bumper: lui resta sull\'arena');
    fatti.push('bumper');
  }
  // FUGA DAI FANTASMI e MONETE IN SALITA: col trucco non resta indietro, e le monete arrivano da più lontano
  {
    const g = nuova('fuga', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    g.ostacoli = [];
    for (const e of g.e) e.y = g.cam + 600;
    passa(g, 3);
    assert.ok(!g.e[0].fuori && g.e[1].fuori, 'fuga: i fantasmi non lo prendono');
    const h = nuova('monete', 2, [null, null]); avvia(h);
    T.arma(h, 0);
    h.ostacoli = []; h.monete = [{ id: 1, x: h.e[0].x + 40, y: h.e[0].y }, { id: 2, x: h.e[1].x + 40, y: h.e[1].y }];
    passa(h);
    assert.ok(h.e[0].monete === 1 && h.e[1].monete === 0, 'monete: calamita');
    fatti.push('fuga', 'monete');
  }
  // CASELLE COLORATE: col trucco non cade nel vuoto (vola su una casella buona, senza annunci)
  {
    const g = nuova('arcobaleno', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    for (const e of g.e) { e.x = -30; e.y = -30; }
    const ev = g.nEv;
    passa(g);
    assert.ok(!g.e[0].fuori && g.e[1].fuori, 'arcobaleno: lui non cade');
    assert.ok(g.evento.posto !== 0 || g.nEv === ev, 'arcobaleno: nessun annuncio');
    fatti.push('arcobaleno');
  }
  // PIOGGIA DI MONETE: col trucco nessuno lo travolge
  {
    const g = nuova('pioggia', 3, [null, null, null]); avvia(g);
    T.arma(g, 0);
    Object.assign(g.e[0], { x: 500, y: 310, monete: 10 }); Object.assign(g.e[1], { x: 520, y: 310, monete: 10 }); Object.assign(g.e[2], { x: 480, y: 310, scatto: 0.2, dx: 1, dy: 0, monete: 0 });
    g.e[2].colpiti = new Set();
    passa(g);
    assert.ok(g.e[0].monete >= 10 && g.e[1].monete < 10, 'pioggia: lui non perde monete');
    fatti.push('pioggia');
  }
  // PAINTBALL: col trucco non viene colpito e le sue palle prendono anche se passano un po' di lato
  {
    const g = nuova('paintball', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    g.blocchi = [];
    Object.assign(g.e[0], { x: 200, y: 300, prot: 0 }); Object.assign(g.e[1], { x: 600, y: 300, prot: 0 });
    g.palle.push({ id: 900, x: 190, y: 300, vx: 640, vy: 0, da: 1, t: 0 }, { id: 901, x: 580, y: 322, vx: 640, vy: 0, da: 0, t: 0 });
    passa(g);
    assert.ok(g.e[0].morto <= 0 && g.e[1].morto > 0, 'paintball: lui colpisce e non viene colpito');
    fatti.push('paintball');
  }
  // SALTA E CORRI: col trucco gli spuntoni non lo fermano
  {
    const g = nuova('piattaforme', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    const morti = g.morti.length;
    g.punta = () => true;
    passa(g, 3);
    assert.ok(g.e[0].cade <= 0 && g.e[1].cade > 0 && g.morti.length === morti + 1, 'piattaforme: invincibile');
    fatti.push('piattaforme');
  }
  // MASSI: chi sale col trucco non viene preso; chi tira col trucco ha i massi che piegano verso chi sale
  {
    const g = nuova('massi', 3, [null, null, null]); avvia(g);
    const su = [0, 1, 2].filter((p) => p !== g.tira);
    T.arma(g, su[0]);
    for (const p of su) { g.e[p].y = 300; g.massi.push({ id: 900 + p, x: g.e[p].x, y: 300, vy: 0, giro: 0, oscilla: 0 }); }
    passa(g);
    assert.ok(g.e[su[0]].stordito <= 0 && g.e[su[1]].stordito > 0, 'massi: il masso non lo prende');
    const h = nuova('massi', 2, [null, null]); avvia(h);
    T.arma(h, h.tira);
    const r = h.e[1 - h.tira]; r.x = 560; r.y = 500;
    h.massi.push({ id: 1, x: 300, y: 100, vy: 300, giro: 0, oscilla: 0 });
    for (let k = 0; k < 60 && !r.stordito; k++) passa(h);
    assert.ok(r.colpi === 1, 'massi: il masso truccato lo prende');
    fatti.push('massi');
  }
  // WANTED!: gli si sussurra dov'è il ricercato, e il clic vale anche un po' fuori
  {
    const g = nuova('wanted', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    passa(g);
    const s = T.prendiSussurri(g).filter((m) => m.posto === 0);
    assert.ok(s.length && s[0].testo.includes(g.ricercato) && s[0].testo.includes(g.zona(g.facce[g.quale])), 'wanted: dov\'è il ricercato');
    const f = g.facce[g.quale];
    g.input(0, { t: 1, mx: f.x + (f.x < 500 ? 1 : -1) * g.L.r * 1.5, my: f.y });
    passa(g, 2);
    assert.ok(g.punti[0] >= 1, 'wanted: trovato');
    passa(g, 3);
    assert.ok(!T.armato(g, 0), 'wanted: vale un round');
    fatti.push('wanted');
  }
  // DUELLO: col trucco i colpi non gli tolgono cuori, e cadendo nel vuoto non perde il cuore
  {
    const g = nuova('duello', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    g.ferisci(0, 1, 100, -100, 1); g.ferisci(1, 1, 100, -100, 0);
    g.perdiCuore(0, 'vuoto');
    assert.ok(g.e[0].cuori === 3 && g.e[1].cuori === 2, 'duello: invulnerabile');
    fatti.push('duello');
  }
  // ATTRAVERSA LA STRADA: col trucco le auto non lo investono
  {
    const M = require('../../giochi/strada-mondo');
    const g = nuova('strada', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    let r = 3; while (g.mondo.corsia(r).k !== 's' || !M.oggetti(g.mondo.corsia(r), g.tempoRound + 0.04).length) r++;
    const c = g.mondo.corsia(r), a = M.oggetti(c, g.tempoRound + 0.04)[0];
    for (const e of g.e) { e.r = r; e.px = a + c.l / 2; e.coda = []; e.cam = r - 4; }
    passa(g);
    assert.ok(g.e[0].vivo && !g.e[1].vivo, 'strada: l\'auto non lo prende');
    fatti.push('strada');
  }
  // TIRO AL BERSAGLIO: la freccia col trucco fa centro, ovunque si miri
  {
    const g = nuova('bersaglio', 2, [null, null]); avvia(g);
    T.arma(g, 0);
    g.tiro(0, 50, 50, g.tempoRound);
    assert.ok(g.frecce[0].esito === 'centro' && !T.armato(g, 0), 'bersaglio: centro');
    fatti.push('bersaglio');
  }
  // MANGIATUTTO: il mangiatore col trucco non viene preso
  {
    const g = nuova('mangiatutto', 2, [null, null]); avvia(g);
    T.arma(g, g.pac);
    const vite = g.vite;
    for (const f of g.f) Object.assign(f, { x: g.m.x, y: g.m.y, stato: 'caccia', paura: false });
    passa(g);
    assert.strictEqual(g.vite, vite, 'mangiatutto: non lo prendono');
    fatti.push('mangiatutto');
  }
  // TIGERBALL: il tiro col trucco si corregge da solo ed entra nel cesto
  {
    let dentro = 0;
    for (let k = 0; k < 3; k++) {
      const g = nuova('tigerball', 2, [null, null]); avvia(g);
      T.arma(g, 0);
      g.tira(0, -0.3, 0.2);
      for (let i = 0; i < 300 && g.b[0].stato === 'vola'; i++) passa(g);
      if (g.b[0].stato === 'dentro') dentro++;
    }
    assert.ok(dentro >= 2, `tigerball: dentro ${dentro} su 3`);
    fatti.push('tigerball');
  }
} finally { Date.now = veroNow; }
console.log(`✓ Trucco nei giochi d'azione (azione1): ${fatti.join(', ')}`);
