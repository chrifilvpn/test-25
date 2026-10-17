// Filetto (Mulino): tavoliere, piazzamento, movimento, volo, mulini e pedine da togliere, fine partita, patte,
// annulla mossa e partite complete tra computer
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/mulino');
const { MULINI, VICINI, togliibili, classifica } = M._test;
const VELOCE = !!process.env.TEST_VELOCE;
const nuova = (opz = {}, bot = [null, null]) => M.crea({ n: 2, primo: 0, opzioni: opz, bot });

// ---- il tavoliere: 24 punti, 16 mulini, vicini simmetrici ----
{
  assert.strictEqual(MULINI.length, 16);
  assert.strictEqual(VICINI.flat().length, 64, '32 segmenti');
  VICINI.forEach((v, i) => v.forEach((k) => assert.ok(VICINI[k].includes(i), 'vicini simmetrici')));
  assert.deepStrictEqual(VICINI[4], [1, 3, 5, 7]);
  assert.deepStrictEqual(VICINI[0], [1, 9]);
}

// ---- piazzamento, mulino e pedina da togliere ----
{
  const g = nuova();
  assert.strictEqual(g.colori[0], 'bianco');
  assert.ok(g.azione(1, { tipo: 'metti', punto: 0 }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'metti', punto: 24 }).errore, 'punto fuori');
  assert.ok(g.azione(0, { tipo: 'metti', punto: 'x' }).errore, 'input non valido');
  assert.ok(g.azione(0, { tipo: 'muovi', da: 0, a: 1 }).errore, 'prima si piazza');
  assert.ok(g.azione(0, null).errore);
  const mosse = [[0, 0], [1, 9], [0, 1], [1, 10], [0, 2]];
  for (const [p, i] of mosse) assert.ok(g.azione(p, { tipo: 'metti', punto: i }).ok);
  assert.ok(g.daTogliere && g.turno === 0, 'mulino 0-1-2: tocca ancora al bianco, che toglie');
  assert.deepStrictEqual(g.vista(0).mosse, { tipo: 'togli', punti: [9, 10] });
  assert.ok(g.azione(0, { tipo: 'metti', punto: 5 }).errore, 'prima si toglie');
  assert.ok(g.azione(0, { tipo: 'togli', punto: 0 }).errore, 'non si toglie una propria pedina');
  assert.ok(g.azione(0, { tipo: 'togli', punto: 9 }).ok);
  assert.strictEqual(g.celle[9], null);
  assert.deepStrictEqual(g.mano, [6, 7]);
  assert.strictEqual(g.turno, 1);
  assert.ok(g.azione(1, { tipo: 'metti', punto: 0 }).errore, 'punto occupato');
}

// ---- le pedine nei mulini sono protette (a meno che non siano tutte nei mulini) ----
{
  const c = new Array(24).fill(null);
  c[0] = 1; c[1] = 1; c[2] = 1; c[9] = 1; c[22] = 0;
  assert.deepStrictEqual(togliibili(c, 0), [9], 'solo la pedina fuori dal mulino');
  c[9] = null;
  assert.deepStrictEqual(togliibili(c, 0), [0, 1, 2], 'tutte nei mulini: si può togliere da un mulino');
}

// ---- movimento lungo le linee, volo con 3 pedine, si perde con 2 ----
{
  const g = nuova();
  g.mano = [0, 0];
  const c = new Array(24).fill(null);
  c[0] = 0; c[1] = 0; c[13] = 0; c[16] = 0;  // bianco: 4 pedine
  c[21] = 1; c[22] = 1; c[5] = 1;            // nero: 3 pedine, vola
  g.celle = c; g.turno = 0;
  assert.ok(g.azione(0, { tipo: 'muovi', da: 13, a: 2 }).errore, '13 e 2 non sono vicini');
  assert.ok(g.azione(0, { tipo: 'muovi', da: 1, a: 4 }).ok, 'movimento lungo la linea');
  assert.strictEqual(g.vista(1).fasi[1], 'vola');
  assert.ok(g.azione(1, { tipo: 'muovi', da: 5, a: 23 }).ok, 'il nero con 3 pedine vola');
  assert.ok(g.daTogliere, '21-22-23: mulino in volo');
  assert.ok(g.azione(1, { tipo: 'togli', punto: 0 }).ok);
  assert.ok(g.azione(0, { tipo: 'muovi', da: 4, a: 1 }).ok);
  // il bianco ha 3 pedine: vola anche lui; con il nero in 21 22 23 il bianco chiude 0-1-2? no: 0 è vuoto ora
  assert.ok(g.azione(1, { tipo: 'muovi', da: 23, a: 2 }).ok);
  assert.ok(g.azione(0, { tipo: 'muovi', da: 13, a: 0 }).ok, 'volo del bianco');
  assert.ok(g.azione(1, { tipo: 'muovi', da: 2, a: 23 }).ok, 'il nero riapre e richiude il mulino');
  assert.ok(g.daTogliere);
  assert.ok(g.azione(1, { tipo: 'togli', punto: 16 }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 1, 'il bianco resta con 2 pedine e perde');
  // senza volo: con 3 pedine si muove come sempre
  const h = nuova({ volo: 'no' });
  h.mano = [0, 0];
  const d = new Array(24).fill(null);
  d[0] = 0; d[1] = 0; d[13] = 0; d[21] = 1; d[22] = 1; d[5] = 1; d[16] = 1;
  h.celle = d; h.turno = 1;
  assert.ok(h.azione(1, { tipo: 'muovi', da: 5, a: 23 }).errore, 'niente volo');
}

// ---- si perde senza mosse ----
{
  const g = nuova();
  g.mano = [0, 0];
  const c = new Array(24).fill(null);
  // il nero in 0 e 2 e 1 bloccati: 0 (vicini 1, 9), 1 (0, 2, 4), 2 (1, 14)
  c[0] = 1; c[1] = 1; c[2] = 1; c[9] = 0; c[4] = 0; c[18] = 0; c[20] = 0; c[23] = 0;
  c[3] = 1;
  c[10] = 0; c[5] = 0; c[13] = 0;
  g.celle = c; g.turno = 0;
  // il bianco chiude l'ultima via del nero: 14
  assert.ok(g.azione(0, { tipo: 'muovi', da: 13, a: 14 }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'il nero non può muovere e perde');
  assert.ok(/non può/.test(g.motivo));
}

// ---- patta per ripetizione e per 50 mosse senza mulini ----
{
  const g = nuova();
  g.mano = [0, 0];
  const c = new Array(24).fill(null);
  c[0] = 0; c[4] = 0; c[17] = 0; c[21] = 1; c[19] = 1; c[8] = 1; c[13] = 1;
  const inizio = c.slice();
  g.celle = c; g.turno = 0;
  for (let k = 0; k < 3 && !g.finita; k++) {
    g.azione(0, { tipo: 'muovi', da: 0, a: 9 }); g.azione(1, { tipo: 'muovi', da: 21, a: 22 });
    g.azione(0, { tipo: 'muovi', da: 9, a: 0 }); g.azione(1, { tipo: 'muovi', da: 22, a: 21 });
  }
  assert.ok(g.finita && g.risultato.pareggio, 'tre volte la stessa posizione: patta');
  const h = nuova();
  h.mano = [0, 0];
  h.celle = inizio; h.turno = 0; h.senzaMulino = 99;
  h.azione(0, { tipo: 'muovi', da: 0, a: 9 });
  assert.ok(h.finita && h.risultato.pareggio && /50 mosse/.test(h.motivo), 'patta dopo 50 mosse a testa senza mulini');
}

// ---- annulla contro il computer ----
{
  const g = nuova({}, [null, 'medio']);
  assert.ok(g.azione(0, { tipo: 'annulla' }).errore);
  g.azione(0, { tipo: 'metti', punto: 4 });
  g.azione(1, M.bot(g, 1, 'medio'));
  assert.ok(g.vista(0).puoAnnullare);
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok);
  assert.ok(g.celle.every((x) => x === null) && g.mano[0] === 9 && g.turno === 0);
}

// ---- il difficile: veloce, chiude il mulino e para quello avversario ----
{
  delete process.env.TEST_VELOCE;
  const c = new Array(24).fill(null);
  c[0] = 0; c[1] = 0; c[21] = 1; c[22] = 1;
  const t0 = Date.now();
  const lista = classifica(c, [7, 7], true, 0, 40, 250);
  const ms = Date.now() - t0;
  assert.ok(ms < 300, `il difficile pensa al massimo 300 ms (${ms} ms)`);
  assert.strictEqual(lista[0].m[1], 2, 'chiude il mulino');
  c[1] = null; c[4] = 0;
  const l2 = classifica(c, [7, 7], true, 0, 40, 250);
  assert.strictEqual(l2[0].m[1], 23, 'para il mulino avversario');
  if (VELOCE) process.env.TEST_VELOCE = '1';
}

// ---- partite complete tra computer ----
{
  const LIV = ['facile', 'medio', 'difficile'];
  const N = VELOCE ? 120 : 300;
  const sfide = { 'difficile-medio': [0, 0, 0], 'medio-facile': [0, 0, 0] };
  let errori = 0, patte = 0;
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const liv = [LIV[k % 3], LIV[(k + 1 + Math.floor(k / 3)) % 3]];
    const g = M.crea({ n: 2, primo: k % 2, opzioni: { volo: k % 7 === 0 ? 'no' : 'si' }, bot: liv });
    let passi = 0;
    while (!g.finita) {
      assert.ok(++passi < 2000, 'la partita finisce');
      const t = g.turno;
      const r = g.azione(t, M.bot(g, t, liv[t]));
      if (r.errore) { errori++; break; }
      // mai più di 9 pedine a testa, mai pedine sovrapposte
      for (const x of [0, 1]) assert.ok(g.celle.filter((v) => v === x).length + g.mano[x] <= 9);
    }
    if (!g.finita) continue;
    if (g.risultato.pareggio) patte++;
    else {
      const v = g.risultato.vincitori[0];
      const tot = g.celle.filter((x) => x === 1 - v).length + g.mano[1 - v];
      assert.ok(tot < 3 || !g.puoMuovere(1 - v), 'chi perde ha 2 pedine o è bloccato');
    }
    for (const [a, b] of [[0, 1], [1, 0]]) {
      const s = sfide[`${liv[a]}-${liv[b]}`];
      if (!s) continue;
      if (g.risultato.pareggio) s[2]++; else if (g.risultato.vincitori[0] === a) s[0]++; else s[1]++;
    }
  }
  assert.strictEqual(errori, 0, 'i computer non fanno mai mosse rifiutate');
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  assert.ok(dv > mv, `il difficile batte il medio (${dv}-${mv})`);
  assert.ok(m2 > f2 * 3, `il medio batte il facile (${m2}-${f2})`);
  console.log(`✓ Filetto (Mulino): piazzamento, movimento, volo, mulini protetti, fine partita, patte, annulla, ${N} partite tra computer (difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2}, patte ${patte}, ${Date.now() - t0} ms)`);
}
