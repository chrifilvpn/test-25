// SCACCHI CINESI: numero di mosse esatto dalla posizione iniziale (perft 44, 1920, 79666 come nei motori noti), regole
// dei singoli pezzi (cannone, cavallo bloccato, elefante e fiume, palazzo, soldato), generali faccia a faccia, matto e
// stallo (che nello xiangqi è una sconfitta), annulla e partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
// caso ripetibile (le partite tra computer danno sempre lo stesso esito)
{ let s = 7; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/xiangqi');
const { iniziale, legali, pseudo, scacco, nomeCasa, C } = M._test;

const sq = (s) => { const c = 'abcdefghi'.indexOf(s[0]), r = 10 - Number(s.slice(1)); return r * C + c; };
const perft = (b, col, d) => { if (!d) return 1; let n = 0; for (const [da, a] of legali(b, col)) { const x = b[a]; b[a] = b[da]; b[da] = 0; n += perft(b, 1 - col, d - 1); b[da] = b[a]; b[a] = x; } return n; };
{
  const b = iniziale();
  assert.deepStrictEqual([perft(b, 0, 1), perft(b, 0, 2), perft(b, 0, 3)], [44, 1920, 79666], 'perft dalla posizione iniziale');
}
const vuota = () => new Int8Array(90);
const da = (b, col, s) => legali(b, col).filter(([x]) => x === sq(s)).map(([, y]) => nomeCasa(y)).sort();
// ---- cannone: si muove come il carro, mangia solo saltando un pezzo ----
{
  const b = vuota(); b[sq('e1')] = 1; b[sq('d10')] = -1; b[sq('b3')] = 6; b[sq('b5')] = 7; b[sq('b8')] = -5; b[sq('b9')] = -4;
  const m = da(b, 0, 'b3');
  assert.ok(m.includes('b4') && !m.includes('b5') && m.includes('b8') && !m.includes('b9'), `cannone: ${m}`);
}
// ---- cavallo bloccato, elefante e fiume ----
{
  const b = vuota(); b[sq('e1')] = 1; b[sq('d10')] = -1; b[sq('c3')] = 4; b[sq('c4')] = 7;
  assert.ok(!da(b, 0, 'c3').includes('b5') && !da(b, 0, 'c3').includes('d5') && da(b, 0, 'c3').includes('e4'), 'il cavallo è bloccato davanti');
  const e = vuota(); e[sq('e1')] = 1; e[sq('d10')] = -1; e[sq('c5')] = 3;
  assert.deepStrictEqual(da(e, 0, 'c5'), ['a3', 'e3'], 'l\'elefante non attraversa il fiume');
  e[sq('d4')] = 7; assert.deepStrictEqual(da(e, 0, 'c5'), ['a3'], 'l\'elefante è bloccato dall\'occhio');
}
// ---- palazzo, soldato ----
{
  const b = vuota(); b[sq('d1')] = 1; b[sq('e10')] = -1; b[sq('e2')] = 2;
  assert.deepStrictEqual(da(b, 0, 'd1'), ['d2', 'e1'], 'il generale resta nel palazzo');
  assert.deepStrictEqual(da(b, 0, 'e2'), ['d3', 'f1', 'f3'], 'il consigliere in diagonale nel palazzo');
  const s = vuota(); s[sq('e1')] = 1; s[sq('d10')] = -1; s[sq('c4')] = 7; s[sq('g6')] = 7;
  assert.deepStrictEqual(da(s, 0, 'c4'), ['c5'], 'prima del fiume solo avanti');
  assert.deepStrictEqual(da(s, 0, 'g6'), ['f6', 'g7', 'h6'], 'dopo il fiume anche di lato');
}
// ---- generali faccia a faccia: illegale ----
{
  const b = vuota(); b[sq('e1')] = 1; b[sq('e10')] = -1; b[sq('e5')] = 5;
  assert.ok(!legali(b, 0).some(([x, y]) => x === sq('e5') && y % C !== 4), 'il carro non può lasciare la colonna dei generali');
  b[sq('e5')] = 0;
  assert.ok(scacco(b, 0), 'generali che si guardano: scacco');
}
// ---- matto e stallo ----
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, null] });
  // matto del carro: il nero ha il generale in e10 chiuso dai suoi consiglieri, il carro rosso arriva in e9? qui: due carri
  g.b = Array.from(vuota()); g.b[sq('e1')] = 1; g.b[sq('d10')] = -1; g.b[sq('a9')] = 5; g.b[sq('b2')] = 5;
  assert.ok(g.azione(0, { tipo: 'muovi', da: sq('b2'), a: sq('b10') }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'scacco matto con due carri');
  // stallo = sconfitta: il generale nero in d10 non può andare in d9 (carro sulla riga 9) né in e10 (faccia a faccia
  // con il generale rosso in e1), e non è sotto scacco
  const h = M.crea({ n: 2, primo: 0, bot: [null, null] });
  h.b = Array.from(vuota()); h.b[sq('e1')] = 1; h.b[sq('d10')] = -1; h.b[sq('a1')] = 5;
  assert.ok(h.azione(0, { tipo: 'muovi', da: sq('a1'), a: sq('a9') }).ok);
  assert.ok(h.finita && h.risultato.vincitori[0] === 0 && /più mosse/.test(h.evento.testo), 'lo stallo è una sconfitta');
}
// ---- annulla e partite tra computer ----
{
  const g = M.crea({ n: 2, primo: 0, bot: [null, 'medio'] });
  const [x, y] = legali(Int8Array.from(g.b), 0)[0];
  g.azione(0, { tipo: 'muovi', da: x, a: y });
  g.azione(1, M.bot(g, 1, 'medio'));
  assert.ok(g.azione(0, { tipo: 'annulla' }).ok && g.nMosse === 0);
  assert.ok(g.azione(0, { tipo: 'muovi', da: sq('e1'), a: sq('e3') }).errore, 'mossa non valida');
  const t0 = Date.now();
  const sfida = (a, b, k) => {
    const liv = k % 2 ? [a, b] : [b, a];
    const x = M.crea({ n: 2, primo: k % 2, bot: liv });
    let giri = 0;
    while (!x.finita && giri++ < 300) { const p = x.turno; assert.ok(x.azione(p, M.bot(x, p, liv[p])).ok); }
    return !x.finita || x.risultato.pareggio ? 0.5 : liv[x.risultato.vincitori[0]] === a ? 1 : 0;
  };
  let mf = 0, dm = 0;
  for (let k = 0; k < 16; k++) mf += sfida('medio', 'facile', k);
  for (let k = 0; k < 6; k++) dm += sfida('difficile', 'medio', k);
  assert.ok(mf > 11 && dm > 4, `medio-facile ${mf}/16, difficile-medio ${dm}/6`);
  console.log(`✓ Scacchi cinesi: perft 44/1920/79666, cannone, cavallo bloccato, elefante e fiume, palazzo, soldato, generali faccia a faccia, matto, annulla; partite tra computer: medio-facile ${mf}/16, difficile-medio ${dm}/6 (${Date.now() - t0} ms)`);
  void pseudo;
}
