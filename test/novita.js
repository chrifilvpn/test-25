// NOVITÀ: Sudoku con lo schema scritto a mano, Briscola al buio, Wanted! senza facce ferme prima del via, filtro
// "mouse / tastiera" nella home, e i due bug sistemati (Mahjong che copriva la finestra di "Esci", Human Benchmark
// che restava in pausa dopo le dispense). Chiamato da test/simula.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { GIOCHI, CONTROLLI } = require('../giochi');
const leggi = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// ---- SUDOKU: schema tuo ----
{
  const M = GIOCHI.sudoku, { genera, MIN_INDIZI } = M._test;
  const o = M.meta.opzioni.find((x) => x.id === 'difficolta');
  assert.ok(o.valori.includes('mio') && o.etichette.length === o.valori.length, 'opzione "Schema tuo"');
  const g = M.crea({ n: 1, opzioni: { difficolta: 'mio' } });
  let v = g.vista(0);
  assert.ok(v.inserimento && !v.corre && v.griglia.every((x) => x === 0) && v.sbagliate === null, 'si parte da una griglia vuota, cronometro fermo');
  assert.ok(g.azione(0, { tipo: 'aiuto' }).errore && !g.suggerimentoWin(0), 'niente aiuti mentre si copia');
  assert.ok(/almeno 17/.test(g.azione(0, { tipo: 'inizia' }).errore), 'servono almeno 17 numeri');
  g.impostaPausa(true); g.impostaPausa(false);
  const { griglia, soluzione } = genera('difficile');
  griglia.forEach((x, i) => { if (x) assert.ok(g.azione(0, { tipo: 'metti', cella: i, valore: x }).ok); });
  // un numero ripetuto nella riga: segnato e non si parte
  const vuota = griglia.indexOf(0), r = Math.floor(vuota / 9), vicino = griglia.findIndex((x, i) => x && Math.floor(i / 9) === r);
  g.azione(0, { tipo: 'metti', cella: vuota, valore: griglia[vicino] });
  assert.ok(g.vista(0).conflitti[vuota] && /ripetuti/.test(g.azione(0, { tipo: 'inizia' }).errore), 'numeri ripetuti segnati');
  g.azione(0, { tipo: 'metti', cella: vuota, valore: 0 });
  // tolti troppi numeri: più soluzioni, non si parte
  const h = M.crea({ n: 1, opzioni: { difficolta: 'mio' } });
  const tolti = griglia.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).slice(0, 6);
  griglia.forEach((x, i) => { if (x && !tolti.includes(i)) h.azione(0, { tipo: 'metti', cella: i, valore: x }); });
  if (griglia.filter(Boolean).length - tolti.length >= MIN_INDIZI) assert.ok(/più di una soluzione/.test(h.azione(0, { tipo: 'inizia' }).errore), 'schema con più soluzioni rifiutato');
  // schema giusto: i numeri diventano fissi, parte il cronometro, si risolve
  assert.ok(g.azione(0, { tipo: 'inizia' }).ok, 'schema accettato');
  v = g.vista(0);
  assert.ok(!v.inserimento && v.corre && v.dati.filter(Boolean).length === griglia.filter(Boolean).length && v.sbagliate, 'numeri fissi e cronometro partito');
  assert.deepStrictEqual(g.soluzione, soluzione, 'soluzione trovata');
  assert.ok(g.suggerimentoWin(0), 'ora il trucco funziona');
  for (let i = 0; i < 81; i++) if (!g.dati[i]) g.azione(0, { tipo: 'metti', cella: i, valore: soluzione[i] });
  assert.ok(g.finita && g.vista(0).record.length === 0 && Number.isFinite(g.tempo), 'risolto, fuori dalla classifica');
  console.log('✓ Sudoku "Schema tuo": griglia vuota da copiare, numeri ripetuti segnati, almeno 17 numeri, una sola soluzione, poi numeri fissi e cronometro');
}

// ---- BRISCOLA al buio ----
{
  const M = GIOCHI.briscola;
  assert.ok(M.meta.opzioni.some((o) => o.id === 'carte' && o.valori.includes('coperte')), 'opzione "Carte in mano"');
  for (const n of [2, 3, 4]) {
    for (let k = 0; k < 60; k++) {
      const g = M.crea({ n, opzioni: { carte: 'coperte' } });
      let giri = 0;
      while (!g.finita && giri++ < 200) {
        if (g.inAttesa) { g.avanza(); continue; }
        const v = g.vista(g.turno);
        assert.ok(v.alBuio && v.mano.every((c) => c.coperta && !c.id && !c.seme && !c.rango), 'la mano non dice quali carte sono');
        assert.ok(v.briscola && v.briscola.seme, 'la briscola si vede');
        const a = M.bot(g, g.turno, 'difficile');
        assert.ok(Number.isInteger(a.pos) && !a.carta, 'anche il computer gioca senza guardare');
        assert.ok(g.azione(g.turno, a).ok);
      }
      assert.ok(g.finita && g.risultato.fazioni.reduce((s, f) => s + f.punti, 0) === 120, 'partita completa: 120 punti');
    }
  }
  const g = M.crea({ n: 2, opzioni: { carte: 'coperte' } });
  assert.ok(g.azione(g.turno, { tipo: 'gioca', carta: g.mani[g.turno][0].id }).errore, 'col nome della carta non si gioca (si scoprirebbe la mano)');
  assert.ok(g.azione(g.turno, { tipo: 'gioca', pos: 3 }).errore, 'posizione fuori dalla mano');
  const p = g.turno, c = g.mani[p][1];
  assert.ok(g.azione(p, { tipo: 'gioca', pos: 1 }).ok && g.tavolo[0].carta === c, 'si gioca la carta in quella posizione e si scopre sul tavolo');
  const s = M.crea({ n: 2 });
  assert.ok(!s.vista(0).alBuio && s.vista(0).mano[0].id, 'senza opzione: carte normali');
  console.log('✓ Briscola al buio: mano coperta anche per sé, briscola visibile, si gioca per posizione, il computer gioca a caso, 180 partite complete');
}

// ---- WANTED: nel conto alla rovescia le facce non si vedono ----
{
  const g = GIOCHI.wanted.crea({ n: 1, opzioni: {}, bot: [null] });
  assert.strictEqual(g.fase, 'via');
  const s0 = g.statoTick(0);
  assert.ok(s0.f.length === 0 && s0.nf > 0, 'prima del via: nessuna faccia mandata (ma si sa quante sono)');
  let k = 0;
  while (g.fase === 'via' && k++ < 200) g.tick(Date.now() + k * 100);
  const s1 = g.statoTick(0);
  assert.ok(g.fase === 'gioco' && s1.f.length === s1.nf, 'al via le facce arrivano');
  g.impostaPausa && g.impostaPausa(true);
  if (g.inPausa) assert.strictEqual(g.statoTick(0).f.length, 0, 'in pausa nascoste anche loro');
  console.log('✓ Wanted!: nel conto alla rovescia (e in pausa) le facce non arrivano al browser');
}

// ---- FILTRO mouse / tastiera ----
{
  const tutti = Object.values(GIOCHI);
  assert.ok(tutti.every((g) => ['mouse', 'tastiera', 'entrambi', 'uno'].includes(g.meta.controlli)), 'ogni gioco ha i suoi controlli');
  for (const ids of Object.values(CONTROLLI)) for (const id of ids) assert.ok(GIOCHI[id], `controlli: ${id} esiste`);
  assert.ok(GIOCHI.snake.meta.controlli === 'tastiera' && GIOCHI.tris.meta.controlli === 'mouse' && GIOCHI.paintball.meta.controlli === 'entrambi', 'esempi');
  const html = leggi('public/index.html'), app = leggi('public/js/app.js'), css = leggi('public/style.css');
  assert.ok(['mouse', 'tastiera', 'entrambi'].every((c) => html.includes(`data-ctrl="${c}"`)), 'i pulsanti del filtro');
  assert.ok(/filtro\.ctrl && !touch\(\)/.test(app) && /#filtro-controlli \{ display: none; \}/.test(css), 'sul telefono il filtro è nascosto e non conta');
  console.log('✓ Filtro "Solo mouse / Solo tastiera / Entrambi": ogni gioco classificato, nascosto sul telefono');
}

// ---- bug sistemati ----
{
  assert.ok(/\.mj-tavolo \{[^}]*isolation: isolate/.test(leggi('public/js/giochi2/mahjong.css')), 'Mahjong: le tessere restano sotto le finestre (Esci, menu)');
  assert.ok(/const k = `\$\{p\.k\}-\$\{t\.fase\}-\$\{t\.nPausa\}-\$\{!!t\.pausa\}/.test(leggi('public/js/giochi/benchmark.js')), 'Human Benchmark: alla ripresa la prova si rimonta');
  console.log('✓ Mahjong: la finestra di "Esci" non è più coperta dalle tessere; Human Benchmark: dopo le dispense la pausa finisce');
}

// ---- ENRICO PAPI: "enrico papi" in chat fa partire il video per tutti ----
{
  const { eEnricoPapi: e } = require('../esecuzione');
  for (const si of ['enrico papi', 'ENRICO  PAPI!', 'ciao enrico.papi', 'Enrìco Papì', 'enricopapi']) assert.ok(e(si), `"${si}" fa partire il video`);
  for (const no of ['enrico', 'papi', 'federico papi', 'enrico papini', 'ciao']) assert.ok(!e(no), `"${no}" no`);
  const server = leggi('server.js'), js = leggi('public/js/esecuzione.js');
  assert.ok(/if \(eEnricoPapi\(testo\)\)/.test(server) && /emit\('papi'/.test(server) && fs.existsSync(path.join(__dirname, '..', 'public', 'video', 'enrico-papi.mp4')), 'al tavolo e nella chat globale, con il video');
  assert.ok(/function papi\(/.test(js) && /Boss\.attivo\) return/.test(js), 'sulle dispense il video non parte');
  console.log('✓ Enrico Papi: "enrico papi" in chat (anche globale) fa partire il video per tutti, il tavolo si ferma, non sulle dispense');
}

// ---- AUDIO DEL SITO: spento all'apertura, un pulsante nella home e uno nel gioco ----
{
  const app = leggi('public/js/app.js'), boss = leggi('public/js/boss.js'), html = leggi('public/index.html');
  assert.ok(/let suono = mem\.get\('audio', 'no'\) === 'si';/.test(app), 'audio spento finché non lo accendi');
  assert.ok(html.includes('id="suono-home"') && html.includes('id="suono"'), 'pulsante nella home e nella barra del gioco');
  assert.ok(/Boss\.silenzio\(!suono\)/.test(app) && /function silenzio\(si\)/.test(boss) && /if \(muto\) this\.muted = true/.test(boss) && /if \(attivo \|\| muto\)/.test(boss), 'spento vuol dire tutto: suoni dei giochi e video');
  console.log('✓ Audio del sito: spento all\'apertura (anche i video partono muti), si accende dalla home o dalla barra del gioco e la scelta resta salvata');
}
