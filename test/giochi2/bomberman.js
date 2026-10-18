// BOMBE E MATTONI: regole (bombe, fiamme a croce, mattoni, catene, potenziamenti, calcio, blocchi che cadono) e
// tante partite complete tra computer con 2, 3 e 4 giocatori.
const assert = require('assert');
const { GIOCHI } = require('../../giochi');
const M = GIOCHI.bomberman;
const { C, R, idx, MICCIA, RESTRINGE, SPIRALE } = M._test;
const veloce = !!process.env.SOLO_REGOLE; // (TEST_VELOCE lo imposta sempre test/simula.js: qui non accorcia)

const parti = (g) => { let ora = Date.now(); while (g.fase !== 'gioco') { ora += 33; g.fineFase = ora; g.tick(ora); } return ora; };
// una griglia tutta libera (solo il bordo e i pilastri), senza mattoni
const svuota = (g) => { for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (!(c % 2 === 0 && r % 2 === 0)) g.g[idx(c, r)] = '.'; g.nascosti.clear(); };
const passa = (g, sec) => { for (let k = 0; k < Math.round(sec / 0.02); k++) { g.tempoRound += 0.02; if (g.passo(0.02)) return true; } return false; };

assert.strictEqual(M.meta.id, 'bomberman');
assert.deepStrictEqual(M.meta.giocatori, [2, 3, 4]);
assert.ok(M.meta.regole.length >= 8 && M.meta.regole.some((r) => /facile/.test(r) && /difficile/.test(r)), 'regole complete con i livelli del computer');

// ---- labirinto: bordo e pilastri fissi, angoli di partenza liberi ----
{
  const g = M.crea({ n: 4, opzioni: { mattoni: 'tanti' }, bot: [null, null, null, null] });
  assert.ok(g.W === C * 48 && g.H === R * 48);
  for (let c = 0; c < C; c++) assert.ok(g.g[idx(c, 0)] === '#' && g.g[idx(c, R - 1)] === '#');
  assert.ok(g.g[idx(2, 2)] === '#' && g.g[idx(4, 6)] === '#', 'pilastri nelle caselle pari');
  for (const e of g.e) for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const ch = g.g[idx(e.x + dc, e.y + dr)]; assert.ok(ch !== 'm', 'niente mattoni attorno alle partenze'); }
  assert.ok(g.g.filter((x) => x === 'm').length > 60, 'tanti mattoni');
  assert.strictEqual(g.vista(0).stato.s.g.length, C * R);
  assert.ok(!JSON.stringify(g.vista(0)).includes('nascosti'), 'i potenziamenti sotto i mattoni non arrivano al browser');
}

// ---- bomba: esplode dopo 2,5 s con fiamme a croce, fermate da muri e mattoni ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); svuota(g);
  const [a, b] = g.e;
  Object.assign(a, { x: 5, y: 5 }); Object.assign(b, { x: 13, y: 11 });
  g.g[idx(5, 3)] = 'm'; g.g[idx(5, 2)] = '.'; // un mattone sopra, a distanza 2
  g.inp[0].tocchi = 1; g.passo(0.02);
  assert.strictEqual(g.bombe.length, 1, 'bomba piazzata con il tasto azione');
  assert.ok(g.bombe[0].x === 5 && g.bombe[0].y === 5 && g.bombe[0].f === 2);
  g.inp[0].tocchi = 2; g.passo(0.02); assert.strictEqual(g.bombe.length, 1, 'all\'inizio una bomba alla volta');
  // chi ci sta sopra può uscire, ma non rientrare
  a.x = 5; a.y = 5; g.inp[0].x = 1; passa(g, 0.4); g.inp[0].x = 0;
  assert.ok(a.x >= 6, 'si esce dalla casella della propria bomba');
  g.inp[0].x = -1; passa(g, 0.3); g.inp[0].x = 0;
  assert.ok(a.x >= 6 - 1e-9, 'non si rientra sulla bomba');
  Object.assign(a, { x: 7, y: 7 });
  assert.ok(!passa(g, MICCIA - 0.9) && g.bombe.length === 1, 'la miccia dura 2,5 secondi');
  passa(g, 0.6);
  assert.strictEqual(g.bombe.length, 0, 'esplosa');
  for (const [c, r] of [[5, 5], [4, 5], [3, 5], [6, 5], [7, 5], [5, 6], [5, 7], [5, 4], [5, 3]]) assert.ok(g.fiamme.has(idx(c, r)), `fiamma in ${c},${r}`);
  assert.ok(!g.fiamme.has(idx(8, 5)) && !g.fiamme.has(idx(5, 2)), 'la fiamma è lunga 2 e il mattone la ferma');
  assert.ok(!g.fiamme.has(idx(6, 6)), 'solo a croce, niente diagonali');
  assert.strictEqual(g.g[idx(5, 3)], '.', 'il mattone si rompe');
  // pilastro: (4,4) è un muro, una bomba in (4,5) non brucia sopra
  passa(g, 0.6); assert.strictEqual(g.fiamme.size, 0, 'le fiamme si spengono');
  g.bombe.push({ id: 90, x: 4, y: 5, t: 0.01, f: 3, p: 1, mov: null }); passa(g, 0.04);
  assert.ok(!g.fiamme.has(idx(4, 4)) && !g.fiamme.has(idx(4, 3)), 'il pilastro ferma la fiamma');
  assert.ok(a.x === 7 && a.y === 7 && a.vivo, 'lontano dalle fiamme si resta vivi');
}

// ---- reazione a catena, chi tocca la fiamma è fuori, punti per chi fa saltare un avversario ----
{
  const g = M.crea({ n: 3, opzioni: {}, bot: [null, null, null] }); parti(g); svuota(g);
  const [a, b, c] = g.e;
  Object.assign(a, { x: 1, y: 1 }); Object.assign(b, { x: 9, y: 3 }); Object.assign(c, { x: 13, y: 11 });
  g.bombe.push({ id: 1, x: 5, y: 3, t: 0.05, f: 2, p: 0, mov: null }, { id: 2, x: 7, y: 3, t: 2, f: 2, p: 2, mov: null });
  passa(g, 0.1);
  assert.strictEqual(g.bombe.length, 0, 'la fiamma fa esplodere subito l\'altra bomba');
  assert.ok(!b.vivo, 'la catena arriva fino a chi era a 2 caselle dalla seconda bomba');
  assert.strictEqual(g.punti[2], 1, 'il punto va a chi ha messo la bomba che ha colpito');
  // la propria bomba fa male anche a sé
  const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(h); svuota(h);
  Object.assign(h.e[0], { x: 3, y: 3 }); h.bombe.push({ id: 1, x: 3, y: 3, t: 0.01, f: 1, p: 0, mov: null }); passa(h, 0.05);
  assert.ok(!h.e[0].vivo && h.punti[0] === 0, 'saltato sulla sua bomba, nessun punto');
  passa(h, 1);
  assert.ok(h.e[1].vivo, 'l\'altro resta');
}

// ---- potenziamenti: bomba in più, fiamma, velocità, calcio ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); svuota(g);
  const a = g.e[0]; Object.assign(a, { x: 3, y: 1 }); Object.assign(g.e[1], { x: 13, y: 11 });
  for (const [k, t] of [[4, 'b'], [5, 'f'], [6, 'v'], [7, 'k']]) g.poteri.set(idx(k, 1), t);
  g.inp[0].x = 1; passa(g, 1.6); g.inp[0].x = 0;
  assert.ok(a.bombe === 2 && a.fiamma === 3 && a.vel === 1 && a.calcio, 'presi tutti e quattro');
  assert.strictEqual(g.poteri.size, 0);
  assert.ok(g.velocita(a) > 3.5, 'più veloce');
  // calcio: camminando contro una bomba la si spinge, e scivola fino all'ostacolo
  Object.assign(a, { x: 3, y: 3 }); g.bombe = [{ id: 5, x: 5, y: 3, t: 2, f: 1, p: 1, mov: null }];
  g.inp[0].x = 1; passa(g, 0.4); g.inp[0].x = 0; passa(g, 1.0);
  assert.ok(g.bombe[0].x === C - 2 && !g.bombe[0].mov, `la bomba calciata scivola fino al muro (${g.bombe[0].x})`);
  // due bombe alla volta
  Object.assign(a, { x: 1, y: 7 }); g.bombe = [];
  g.inp[0].tocchi++; passa(g, 0.02); a.x = 1; a.y = 9; g.inp[0].tocchi++; passa(g, 0.02);
  assert.strictEqual(g.bombe.length, 2, 'con il potenziamento due bombe insieme');
  // i potenziamenti escono dai mattoni rotti e bruciano se li colpisce un'altra esplosione
  const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(h); svuota(h);
  Object.assign(h.e[0], { x: 1, y: 11 }); Object.assign(h.e[1], { x: 13, y: 11 });
  h.g[idx(7, 5)] = 'm'; h.nascosti.set(idx(7, 5), 'f');
  h.bombe.push({ id: 1, x: 5, y: 5, t: 0.01, f: 3, p: 0, mov: null }); passa(h, 0.05);
  assert.strictEqual(h.poteri.get(idx(7, 5)), 'f', 'il mattone rotto lascia il potenziamento (e la stessa fiamma non lo brucia)');
  passa(h, 1);
  h.bombe.push({ id: 2, x: 7, y: 3, t: 0.01, f: 3, p: 0, mov: null }); passa(h, 0.05);
  assert.ok(!h.poteri.has(idx(7, 5)), 'una fiamma dopo lo brucia');
}

// ---- la mappa si restringe: i blocchi cadono a spirale e schiacciano ----
{
  assert.strictEqual(new Set(SPIRALE).size, SPIRALE.length);
  assert.strictEqual(SPIRALE.length, (C - 2) * (R - 2), 'la spirale copre tutto l\'interno');
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); parti(g); svuota(g);
  Object.assign(g.e[0], { x: 1, y: 1 }); Object.assign(g.e[1], { x: 7, y: 5 });
  g.tempoRound = RESTRINGE - 0.1; passa(g, 1);
  assert.ok(!g.e[0].vivo, 'chi resta sul bordo viene schiacciato');
  assert.strictEqual(g.g[idx(1, 1)], '#', 'il blocco caduto diventa muro');
  const fine = passa(g, 2);
  assert.ok(fine, 'resta uno solo: il round finisce');
  const giu = g.g.filter((x) => x === '#').length; passa(g, 2);
  assert.strictEqual(g.g.filter((x) => x === '#').length, giu, 'con un solo superstite i blocchi smettono di cadere');
  g.fineRound(); assert.strictEqual(g.punti[1], 3, '3 punti a chi vince il round');
}

// ---- input dal browser: posizione prevista e comandi strani ----
{
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, 'medio'] }); parti(g); svuota(g);
  const a = g.e[0]; Object.assign(a, { x: 1, y: 1 });
  g.input(0, { x: 'boh', y: null, a: 1, t: 'x', px: 'nan', mx: {} });
  g.input(0, { px: 3 * 48, py: 1 * 48, x: 1, y: 0 }); passa(g, 1);
  assert.ok(Math.abs(a.x - 3) < 0.05 && a.y === 1, `il server raggiunge la posizione prevista dal browser (${a.x})`);
  g.input(0, { px: 3 * 48, py: 9 * 48 }); passa(g, 0.5);
  assert.ok(a.y === 1 || a.x % 2 === 1, 'non si passa attraverso i pilastri per raggiungerla');
  g.input(0, { px: 99999, py: -99999 }); passa(g, 0.3);
  assert.ok(a.x >= 1 && a.x <= C - 2 && a.y >= 1 && a.y <= R - 2, 'resta dentro al labirinto');
}

// ---- partite complete tra computer ----
{
  const liv = ['facile', 'medio', 'difficile'];
  const stat = { facile: { v: 0, s: 0, k: 0 }, medio: { v: 0, s: 0, k: 0 }, difficile: { v: 0, s: 0, k: 0 } };
  const B = M._test.Bombe, el = B.prototype.elimina;
  let livelli = null;
  B.prototype.elimina = function (p, da) {
    if (this.e[p].vivo && livelli) { if (da === p) stat[livelli[p]].s++; else if (da !== null && da !== undefined) stat[livelli[da]].k++; }
    return el.call(this, p, da);
  };
  let partite = 0, bombe = 0, pari = 0;
  const t0 = Date.now();
  for (const n of [2, 3, 4]) {
    const quante = veloce ? 12 : 100;
    for (let k = 0; k < quante; k++) {
      livelli = Array.from({ length: n }, (_, i) => liv[(i + k) % 3]);
      const g = M.crea({ n, opzioni: { round: 3, mattoni: ['normali', 'pochi', 'tanti'][k % 3] }, bot: livelli });
      if (k % 4) g.nRound = 1; // tre partite su quattro in un round solo, per fare più in fretta
      const piazza = g.piazza.bind(g); g.piazza = (p, d) => { const ok = piazza(p, d); if (ok) bombe++; return ok; };
      let ora = Date.now(), passi = 0;
      while (!g.finita) {
        ora += 33; if (g.fase !== 'gioco') g.fineFase = Math.min(g.fineFase, ora);
        g.tick(ora);
        assert.ok(++passi < 60000, 'la partita finisce');
        if (g.fase === 'gioco') assert.ok(g.tempoRound < 60 + (C - 2) * (R - 2) * 0.32 + 5, 'il round finisce prima che la spirale abbia riempito tutto');
      }
      const ris = g.risultato;
      assert.ok(ris.fazioni.length === n && ris.fazioni.every((f) => Number.isInteger(f.punti)));
      if (ris.vincitori.length) { stat[livelli[ris.vincitori[0]]].v++; assert.ok(!ris.pareggio); } else pari++;
      for (const e of g.e) assert.ok(e.x >= 1 && e.x <= C - 2 && e.y >= 1 && e.y <= R - 2, 'sempre dentro al labirinto');
      partite++;
    }
  }
  B.prototype.elimina = el;
  assert.ok(bombe > partite * 10, `i computer piazzano bombe (${bombe} in ${partite} partite)`);
  assert.ok(pari < partite * 0.3, `quasi sempre c'è un vincitore (${pari} pari su ${partite})`);
  if (!veloce) { // con poche partite il caso conta troppo
    assert.ok(stat.medio.v > stat.facile.v && stat.difficile.v > stat.facile.v, `il facile vince meno ${JSON.stringify(stat)}`);
    assert.ok(stat.difficile.k > stat.facile.k, `il difficile fa saltare più avversari del facile ${JSON.stringify(stat)}`);
  }
  console.log(`✓ Bombe e mattoni: labirinto con pilastri e mattoni, bomba dopo 2,5 s con fiamme a croce, catene, eliminazione, potenziamenti (bomba, fiamma, velocità, calcio), blocchi a spirale, posizione prevista dal browser, ${partite} partite tra computer in 2-4 (${pari} pari; vittorie f/m/d ${stat.facile.v}/${stat.medio.v}/${stat.difficile.v}, avversari colpiti ${stat.facile.k}/${stat.medio.k}/${stat.difficile.k}) in ${Date.now() - t0} ms`);
}
// ---- a squadre (due contro due) ----
{
  const g = M.crea({ n: 4, opzioni: { squadre: 'si' }, bot: [null, null, null, null] }); parti(g); svuota(g);
  assert.ok(g.aSquadre && g.squadra(0) === g.squadra(2) && g.squadra(1) === g.squadra(3) && g.squadra(0) !== g.squadra(1));
  assert.ok(!M.crea({ n: 3, opzioni: { squadre: 'si' }, bot: [null, null, null] }).aSquadre, 'squadre solo in 4');
  // il compagno (posto 2) accanto alla bomba di 0 non salta; l'avversario (posto 1) sì
  g.e[0].x = 1; g.e[0].y = 1; g.e[2].x = 2; g.e[2].y = 1; g.e[1].x = 1; g.e[1].y = 2; g.e[3].x = C - 2; g.e[3].y = R - 2;
  g.bombe.push({ id: 99, p: 0, x: 3, y: 3, t: 0.01, f: 3 });
  g.fiamme.set(idx(2, 1), { fino: g.tempoRound + 0.5, o: 1, da: 0 });
  g.fiamme.set(idx(1, 2), { fino: g.tempoRound + 0.5, o: 2, da: 0 });
  g.passo(0.02);
  assert.ok(g.e[2].vivo && !g.e[1].vivo, 'le fiamme del compagno non fanno male');
  assert.strictEqual(g.punti[0], 1, 'un punto per l\'avversario colpito');
  // la squadra che resta vince il round: +3 a tutti e due
  g.e[3].vivo = false;
  g.fineRound();
  assert.ok(g.punti[0] === 4 && g.punti[2] === 3 && g.vittorieRound[2] === 1);
  // partite intere tra computer
  let vinte = 0;
  for (let k = 0; k < 20; k++) {
    const h = M.crea({ n: 4, opzioni: { squadre: 'si', round: 3 }, bot: ['medio', 'difficile', 'facile', 'medio'] });
    h.nRound = 1;
    let ora = Date.now(), passi = 0;
    while (!h.finita) { ora += 33; if (h.fase !== 'gioco') h.fineFase = Math.min(h.fineFase, ora); h.tick(ora); assert.ok(++passi < 60000); }
    assert.strictEqual(h.risultato.fazioni.length, 2);
    if (h.risultato.vincitori.length) { vinte++; assert.ok([[0, 2], [1, 3]].some((v) => v.join() === h.risultato.vincitori.join())); }
  }
  assert.ok(vinte >= 14, `quasi sempre vince una squadra (${vinte}/20)`);
  console.log(`✓ Bombe e mattoni a squadre: due contro due, fiamme del compagno innocue, round alla squadra che resta, ${vinte}/20 partite vinte da una squadra`);
}
