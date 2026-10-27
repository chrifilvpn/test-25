// SISTEMAZIONI dei giochi d'azione e strategia (27/10/2026): Go che aspetta il computer al conteggio, computer
// difficile che pensa in un thread a parte, Calza dei Dadi bugiardi, vita dei mostri di Difesa, Stick War (guardia,
// chi esce, computer del tavolo, scritte), round della bambola-giocatore di Stella, disco fermo dell'Air Hockey,
// categoria Rompicapo.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const { GIOCHI } = require('../../giochi');

(async () => {
  // ---- Go: al conteggio si aspetta chi non ha accettato (così il server fa accettare il computer) ----
  {
    const g = GIOCHI.go.crea({ n: 2, primo: 0, opzioni: { tavola: 9 } });
    assert.deepStrictEqual(g.attesi(), [], 'durante la partita nessuna attesa');
    g.azione(0, { tipo: 'passa' }); g.azione(1, { tipo: 'passa' });
    assert.strictEqual(g.fase, 'conteggio');
    assert.deepStrictEqual(g.attesi(), [0, 1], 'al conteggio si aspettano tutti e due');
    g.azione(0, GIOCHI.go.bot(g, 0, 'medio'));
    assert.deepStrictEqual(g.attesi(), [1], 'poi solo chi non ha accettato');
    g.azione(1, GIOCHI.go.bot(g, 1, 'difficile'));
    assert.ok(g.finita && g.attesi().length === 0, 'il computer accetta e la partita finisce');
  }

  // ---- computer che pensa a parte: mossa valida, e intanto il server va avanti ----
  {
    const P = require('../../giochi/pensatore');
    for (const id of Object.keys(GIOCHI)) if (GIOCHI[id].meta.pensaLento) assert.ok(GIOCHI[id].bot, `${id}: ha il computer`);
    assert.deepStrictEqual(Object.keys(GIOCHI).filter((id) => GIOCHI[id].meta.pensaLento).sort(), ['dama', 'damaint', 'forza3d', 'forza4', 'go', 'hex', 'scacchi', 'xiangqi']);
    // i thread si provano in un processo a parte: in npm test gli altri test tengono occupato questo processo per
    // molti secondi e il tempo massimo del pensatore scadrebbe prima di leggere la risposta
    const prova = `const { GIOCHI } = require('./giochi'); const P = require('./giochi/pensatore');
      (async () => { for (const id of ['scacchi', 'go', 'forza4']) {
        const crea = { n: 2, primo: 0, opzioni: {}, bot: [null, 'difficile'] }, g = GIOCHI[id].crea(crea);
        const m = await P.pensa(id, g, g.turno, 'difficile', crea);
        if (g.azione(g.turno, m).errore) throw new Error(id + ': mossa non valida');
      } console.log('ok'); })().catch((e) => { console.error(e.message); process.exit(1); });`;
    const esce = require('child_process').execFileSync(process.execPath, ['-e', prova], { cwd: require('path').join(__dirname, '../..'), env: { ...process.env, TEST_VELOCE: '1' }, encoding: 'utf8' });
    assert.strictEqual(esce.trim(), 'ok', 'le mosse pensate a parte sono valide');
    // le classi tornano al loro posto dopo la copia
    const go = GIOCHI.go.crea({ n: 2, primo: 0, opzioni: {} }), copia = structuredClone({ ...go });
    P.rimettiClassi(copia, go);
    assert.strictEqual(Object.getPrototypeOf(copia.t), Object.getPrototypeOf(go.t), 'la Tavola del Go torna una Tavola');
  }

  // ---- Dadi bugiardi: il difficile non dice "Calza!" se ha meno di una possibilità su due ----
  {
    const M = GIOCHI.bugiardi;
    const g = M.crea({ n: 2, primo: 0, opzioni: {}, bot: [null, 'difficile'] });
    g.dadi[0] = [2, 3, 4, 5, 6]; g.dadi[1] = [2, 2, 3, 4, 5];
    g.nDadi = [5, 4]; g.turno = 1; g.puntata = { q: 3, f: 6, chi: 0 };
    for (let k = 0; k < 50; k++) assert.notStrictEqual(M.bot(g, 1, 'difficile').tipo, 'calza', 'calza improbabile: no');
  }

  // ---- Difesa: dopo l'ondata 10 la vita dei mostri cresce dell'8% a ondata ----
  {
    const g = GIOCHI.difesa.crea({ n: 1, primo: 0, opzioni: { ondate: 20 }, bot: [null] });
    const vita = (k) => { g.k = k; const m = g.nuovoMostro('goblin', 0, 0); g.mostri.pop(); return m.vita; };
    assert.ok(Math.abs(vita(10) / vita(9) - 1.17) < 1e-9, 'fino alla 10: +17%');
    assert.ok(Math.abs(vita(11) / vita(10) - 1.08) < 1e-9 && Math.abs(vita(20) / vita(19) - 1.08) < 1e-9, 'poi +8%');
  }

  // ---- Stick War ----
  {
    const M = GIOCHI.stickwar, { LIVELLI } = M._test;
    // la guardia di Medusa resta a difendere e non conta per decidere l'attacco
    const g = M.crea({ n: 1, opzioni: { livello: 8 }, bot: [null] });
    const med = g.u.find((u) => u.tipo === 'medusa');
    assert.ok(med && med.guardia, 'livello 8: Medusa fa la guardia');
    assert.strictEqual(g.valore(1, false), g.valore(1) - M._test.UNITA.medusa.costo, 'la guardia non conta per chi attacca');
    // chi esce lascia il soldato che comandava
    const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
    const sp = h.u.find((u) => u.tipo === 'spada' && u.lato === 0);
    h.fase = 'gioco';
    assert.ok(!h.azione(0, { tipo: 'controlla', id: sp.id }).errore && sp.chi === 0);
    h.esce(0);
    assert.ok(sp.chi === -1 && h.comando[0] === null, 'uscito: il soldato torna con gli altri');
    // computer del tavolo nella squadra delle persone (la tribù nemica la guida il gioco)
    assert.deepStrictEqual(M.crea({ n: 3, opzioni: { modo: 'nonmorti' }, bot: [null, 'medio', 'facile'] }).lati, [0, 0, 0]);
    assert.deepStrictEqual(M.crea({ n: 2, opzioni: { modo: 'sfida' }, bot: [null, 'medio'] }).lati, [0, 1], 'in sfida restano avversari');
    // "sconfitta/sconfitti/sconfitto" secondo il nome
    assert.deepStrictEqual(LIVELLI.map((l) => l.vinta), ['sconfitta', 'sconfitti', 'sconfitti', 'sconfitti', 'sconfitti', 'sconfitta', 'sconfitto', 'sconfitta']);
    g.vinto = 0; g.chiudi();
    assert.ok(/Medusa, regina del Chaos sconfitta!/.test(g.risultato.titolo), g.risultato.titolo);
    const g2 = M.crea({ n: 1, opzioni: { livello: 2 }, bot: [null] }); g2.vinto = 0; g2.chiudi();
    assert.ok(/Archidonis del bosco sconfitti!/.test(g2.risultato.titolo), g2.risultato.titolo);
  }

  // ---- Stella: con la bambola-giocatore tutti la fanno lo stesso numero di volte ----
  {
    const M = GIOCHI.stella;
    const r = (n, round) => M.crea({ n, primo: 0, opzioni: { bambola: 'giocatore', round }, bot: Array(n).fill(null) }).nRound;
    assert.deepStrictEqual([r(2, 3), r(4, 3), r(6, 3), r(3, 1), r(2, 5)], [4, 4, 6, 3, 6]);
    assert.strictEqual(M.crea({ n: 4, primo: 0, opzioni: { round: 3 }, bot: Array(4).fill(null) }).nRound, 3, 'bambola del computer: round scelti');
  }

  // ---- Air Hockey: disco fermo in una metà per 5 secondi → batte l'altra squadra ----
  {
    const M = GIOCHI.airhockey, { H } = M._test;
    const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
    let ora = Date.now() + 4000;
    g.fermoFino = 0;
    g.disco = { x: 150, y: H * 0.8, vx: 0, vy: 0 }; // nella metà in basso (squadra A), lontano dalle racchette
    for (let k = 0; k < 4.5 * 50; k++) { ora += 20; g.tick(ora); }
    assert.ok(g.disco.y > H / 2, 'dopo 4,5 secondi è ancora lì');
    for (let k = 0; k < 1 * 50; k++) { ora += 20; g.tick(ora); }
    assert.ok(g.disco.y < H / 2, 'dopo 5 secondi batte la squadra B');
    assert.ok(/fermo/.test(g.evento.testo));
  }

  // ---- categoria Rompicapo ----
  {
    for (const id of ['sudoku', 'sokoban', 'hanoi', 'nurikabe', 'caramelle', 'bolle', 'mahjong']) assert.strictEqual(GIOCHI[id].meta.categoria, 'rompicapo', id);
    for (const id of ['scacchi', 'go', 'draghi']) assert.strictEqual(GIOCHI[id].meta.categoria, 'strategia', id);
  }

  console.log('✓ Sistemazioni azione/strategia: Go aspetta il computer al conteggio, computer difficile a parte, Calza, vita dei mostri, Stick War (guardia, chi esce, squadre, scritte), round di Stella, disco fermo, Rompicapo');
})().catch((e) => { console.error(e); process.exit(1); });
