// Controlli di sfida del giorno, torneo e serata (chiamato da test/simula.js)
const assert = require('assert');
const os = require('os');
const path = require('path');
process.env.ARCHIVIO_CARTELLA = path.join(os.tmpdir(), `if-test-${process.pid}`);
const { GIOCHI, pulisciOpzioni } = require('../giochi');
const sfida = require('../sfida');
const archivio = require('../archivio');

{
  // stessa data e stesso gioco: stessa partita (e le mosse dopo usano lo stesso caso); un altro giorno è diverso
  const crea = (g, data) => sfida.creaConSeme(GIOCHI[g], { n: 1, primo: 0, opzioni: sfida.SFIDE[g].opzioni, fiche: [1000], bot: [null] }, sfida.hash(`${data}:${g}`));
  assert.deepStrictEqual(crea('sudoku', '2026-01-01').griglia, crea('sudoku', '2026-01-01').griglia, 'sudoku uguale per tutti');
  assert.notDeepStrictEqual(crea('sudoku', '2026-01-01').griglia, crea('sudoku', '2026-01-02').griglia, 'un altro giorno, un altro sudoku');
  assert.strictEqual(crea('wordle', '2026-01-01').segreta, crea('wordle', '2026-01-01').segreta, 'wordle: stessa parola');
  const b1 = crea('bandiere', '2026-01-01'), b2 = crea('bandiere', '2026-01-01');
  assert.deepStrictEqual(b1.ordine, b2.ordine, 'bandiere: stessa sequenza');
  assert.deepStrictEqual(crea('kakuro', '2026-01-01').soluzione, crea('kakuro', '2026-01-01').soluzione, 'kakuro: stessa griglia');
  assert.strictEqual(crea('sokoban', '2026-01-01').lv.mappa, crea('sokoban', '2026-01-01').lv.mappa, 'casse: stesso livello');
  assert.deepStrictEqual(crea('mahjong', '2026-01-01').iniziali, crea('mahjong', '2026-01-01').iniziali, 'mahjong: stesse tessere');
  assert.ok(crea('sokoban', '2026-01-01').lv.gruppo === 'difficile' && crea('mahjong', '2026-01-01').figura === 'piramide');
  // casse: si gioca la soluzione; il risultato è tempo e spinte (un aiuto aggiunge la sua penalità al tempo)
  const k = crea('sokoban', '2026-01-03');
  assert.strictEqual(sfida.SFIDE.sokoban.misura(k), null, 'non finito: nessun risultato');
  k.tavole[0].penale = 20000; k.tavole[0].aiuti = 1; // come dopo un aiuto
  for (const d of k.lv.soluzione.toLowerCase()) k.azione(0, { tipo: 'passo', dir: d });
  assert.ok(k.finita, 'casse finito');
  const mk = sfida.SFIDE.sokoban.misura(k);
  assert.ok(mk.valore <= -20 && /spinte/.test(mk.testo) && /1 aiuti/.test(mk.testo), `risultato casse ${JSON.stringify(mk)}`);
  assert.ok(Math.random() !== Math.random(), 'fuori dalla sfida Math.random torna normale');
  assert.match(sfida.oggi(Date.UTC(2026, 0, 1, 23, 30)), /^2026-01-02$/, 'il giorno cambia a mezzanotte italiana');
  // classifica: conta solo il primo tentativo
  const s = { gioco: 'bandiere', sfida: { gioco: 'bandiere', data: '2026-01-01', id: 'u1', nome: 'Ada' } };
  b1.punti[0] = 7;
  assert.ok(sfida.registra(s, b1).posizione === 0, 'primo in classifica');
  const s2 = { gioco: 'bandiere', sfida: { gioco: 'bandiere', data: '2026-01-01', id: 'u1', nome: 'Ada' } };
  b2.punti[0] = 10;
  assert.ok(sfida.registra(s2, b2).prova, 'il secondo tentativo non conta');
  assert.deepStrictEqual(sfida.classifiche('2026-01-01').giochi.bandiere.lista, [{ nome: 'Ada', testo: '7/10' }]);
  console.log('✓ Sfida del giorno: stessa partita per tutti (Sudoku, Wordle, Sblocca, Bandiere, Kakuro, Spingi le casse, Mahjong), giorno italiano, classifica col primo tentativo');
}

{
  // torneo e serata con un finto server
  const stanze = new Map();
  const messaggi = [];
  let iniziate = 0;
  const api = {
    io: { to: () => ({ emit() {} }) }, GIOCHI, stanze, FICHE_INIZIALI: 1000, pulisciOpzioni, NOMI_BOT: ['Ada', 'Alan', 'Grace', 'Linus', 'Tim', 'Margaret', 'Dennis'],
    messaggioSistema: (s, t) => messaggi.push(t), aggiorna() {},
    iniziaPartita(s) { iniziate++; s.partita = GIOCHI[s.gioco].crea({ n: s.posti.length, primo: 0, opzioni: s.opzioni, bot: s.posti.map((g) => g.bot) }); },
  };
  const T = require('../tornei')(api);
  const s = { codice: 'TEST', gioco: 'morra', opzioni: {}, posti: [{ id: 'a', nome: 'Anna', socketId: 'sa' }, { id: 'b', nome: 'Bruno', socketId: 'sb' }], vittorie: [0, 0], spettatori: new Map([['sc', { id: 'c', nome: 'Carla', segue: 0 }]]), chat: [] };
  stanze.set(s.codice, s);
  assert.strictEqual(T.iniziaTorneo(s, 4), null);
  assert.strictEqual(s.torneo.giocatori.filter((x) => x.bot).length, 1, 'il quarto posto lo prende il computer');
  const persone = new Set(s.posti.map((g) => g.id));
  assert.ok(s.posti.every((g) => g.idTorneo) && persone.size === 2, 'due al tavolo');
  // chi non gioca guarda
  assert.ok([...s.spettatori.values()].every((sp) => !persone.has(sp.id)), 'gli altri sono spettatori');
  // si finge che vinca sempre il posto 0
  const chiudi = () => { s.partita.finita = true; s.partita.risultato = { vincitori: [0], fazioni: [], pareggio: false }; T.finePartita(s, s.partita); clearTimeout(s.timerTorneo); };
  for (let k = 0; k < 6 && !s.torneo.finito; k++) { chiudi(); T._prossimo(s); }
  assert.ok(s.torneo.finito && s.torneo.campione !== null, 'il torneo finisce con un campione');
  assert.strictEqual(s.torneo.turni.length, 2, 'semifinali e finale');
  assert.ok(messaggi.some((m) => /vince il torneo/.test(m)));
  assert.ok(messaggi.some((m) => /batte/.test(m)), 'il vincitore passa il turno');
  // serata
  T.annulla(s);
  s.posti = [{ id: 'a', nome: 'Anna' }, { id: 'b', nome: 'Bruno', bot: 'medio' }];
  assert.ok(T.iniziaSerata(s, ['tris']), 'servono almeno 2 giochi');
  assert.ok(T.iniziaSerata(s, ['tris', 'sudoku']), 'il sudoku è solo tra persone: con un computer no');
  assert.strictEqual(T.iniziaSerata(s, ['tris', 'forza4']), null);
  assert.strictEqual(s.gioco, 'tris');
  s.partita.finita = true; s.partita.risultato = { vincitori: [1], fazioni: [{ posti: [0] }, { posti: [1] }], pareggio: false }; T.finePartita(s, s.partita); clearTimeout(s.timerSerata);
  assert.deepStrictEqual(s.serata.punti, [0, 3], '3 punti a chi vince');
  assert.strictEqual(s.serata.k, 1);
  T.annulla(s);
  console.log('✓ Torneo a eliminazione (spettatori in attesa, computer nei posti mancanti) e serata a giochi misti (3 punti a gioco)');
}
archivio._dati.clear();
