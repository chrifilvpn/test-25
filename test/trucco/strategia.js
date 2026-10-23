// Il trucco segreto nei giochi di strategia: la mossa del computer difficile al proprio turno, l'informazione
// nascosta giusta (navi, codice, tesori, nemici…) e i dadi truccati di Conquista.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

function nuova(id, n, opzioni = {}, bot = []) {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  return mod.crea({ n, primo: 0, opzioni: opz, bot });
}
// arma il trucco e restituisce il suggerimento arrivato a quel posto (null se non è il momento: resta armato)
function chiedi(g, posto) {
  if (!T.armato(g, posto)) T.arma(g, posto);
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g).filter((m) => m.posto === posto);
  if (!s.length) { assert.ok(T.armato(g, posto), 'senza suggerimento il trucco resta attivo'); return null; }
  assert.ok(!T.armato(g, posto), 'il suggerimento spegne il trucco');
  assert.ok(T.prendiSussurri(g).every((m) => m.posto === posto), 'gli altri non ricevono niente');
  return s[0].testo;
}
const casa8 = (n) => (8 - Number(n[1])) * 8 + 'abcdefgh'.indexOf(n[0]);

// tris: la mossa che vince subito; il trucco non consuma l'errore "umano" del computer
{
  const g = nuova('tris', 2);
  g.celle = [0, 0, null, 1, 1, null, null, null, null];
  assert.strictEqual(chiedi(g, 1), null, 'non è il suo turno');
  assert.ok(chiedi(g, 0).includes('in alto a destra'));
  assert.strictEqual(g.erroriBot, undefined);
  const u = nuova('tris', 2, { variante: 'ultimate' });
  assert.ok(/Riquadro .+, casella .+/.test(chiedi(u, 0)));
}
// forza 4: tre in fila in basso → la quarta colonna
{
  const g = nuova('forza4', 2);
  for (const c of [0, 1, 2]) g.celle[5 * 7 + c] = 0;
  for (const c of [0, 1, 2]) g.celle[4 * 7 + c] = 1;
  g.mosse = 6;
  assert.ok(chiedi(g, 0).includes('Colonna 4'));
}
// scacchi: il matto del barbiere, in notazione con le coordinate
{
  const g = nuova('scacchi', 2);
  for (const [da, a] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6']]) assert.ok(g.azione(g.turno, { tipo: 'muovi', da: casa8(da), a: casa8(a) }).ok);
  assert.strictEqual(chiedi(g, 1), null);
  delete process.env.TEST_VELOCE; // il computer difficile con il suo tempo vero (con 25 ms può non finire il primo giro)
  assert.strictEqual(chiedi(g, 0), '💡 Donna h5 × f7');
  process.env.TEST_VELOCE = '1';
  const h = nuova('scacchi', 2);
  const t = chiedi(h, 0), [da, a] = t.match(/[a-h][1-8]/g);
  assert.ok(h.legaliOra.some((m) => m.da === casa8(da) && m.a === casa8(a)), `mossa legale: ${t}`);
}
// dama, dama internazionale, reversi, go, hex, forza 3D, filetto, muri, dama cinese, scacchi cinesi:
// il suggerimento arriva solo al proprio turno e la mossa indicata si può fare
{
  const d = nuova('dama', 2);
  const t = chiedi(d, 0), caselle = t.match(/[a-h][1-8]/g).map(casa8);
  assert.ok(d.legali.some((m) => m.percorso.every((k, j) => k === caselle[j])), `dama: ${t}`);
  const di = nuova('damaint', 2);
  const nome = (i) => `${'abcdefghij'[i % 10]}${10 - Math.floor(i / 10)}`;
  const ti = chiedi(di, 0), [x, y] = ti.match(/[a-j]\d+/g);
  assert.ok(di.mosse(0).some((m) => nome(m.da) === x && nome(m.a) === y), `damaint: ${ti}`);
  const o = nuova('otello', 2);
  const to = chiedi(o, 0), c = to.match(/[a-h][1-8]/)[0];
  assert.ok(GIOCHI.otello._test.mossePossibili(o.celle, 0).map(GIOCHI.otello._test.nomeCasella).includes(c), `otello: ${to}`);
  for (const id of ['go', 'hex', 'forza3d', 'mulino', 'quoridor', 'damacinese', 'xiangqi']) {
    const g = nuova(id, 2);
    assert.strictEqual(chiedi(g, 1), null, `${id}: non al turno degli altri`);
    const s = chiedi(g, 0);
    assert.ok(s && s.startsWith('💡'), `${id}: ${s}`);
    assert.ok(GIOCHI[id].bot(g, 0, 'medio'), id);
  }
  // muri: la tavola girata del secondo giocatore (parte in alto, la vede in basso): il primo passo è "avanti"
  const q = nuova('quoridor', 2);
  q.azione(0, { tipo: 'muovi', cella: q.pos[0] - 9 });
  assert.ok(/e1 → e2 \(avanti\)|Muro/.test(chiedi(q, 1)));
}
// battaglia navale: la casella indicata ha davvero una nave non ancora colpita
{
  const B = GIOCHI.battaglia;
  const g = nuova('battaglia', 2);
  for (const p of [0, 1]) g.azione(p, B.bot(g, p, 'medio'));
  const t = chiedi(g, 0), cella = t.match(/in ([A-J])(\d+)/);
  const i = 'ABCDEFGHIJ'.indexOf(cella[1]) * 10 + Number(cella[2]) - 1;
  assert.ok(g.navi[1].some((x) => x.celle.includes(i)) && !g.colpi[1][i]);
}
// codice segreto: il codice giusto, con i nomi dei colori
{
  const g = nuova('mastermind', 1);
  const nomi = ['rosso', 'blu', 'verde', 'giallo', 'arancio', 'viola', 'azzurro', 'rosa'];
  assert.strictEqual(chiedi(g, 0), `💡 Il codice è: ${g.segreto.map((k) => nomi[k]).join(' · ')}`);
}
// conquista: con il trucco l'attacco non perde armate finché non conquista, poi il trucco è usato
for (let k = 0; k < 30; k++) {
  const g = nuova('conquista', 2);
  g.fase = 'attacco'; g.daPiazzare = 0;
  let dove = -1, origine = -1;
  // i confini si provano chiedendo al gioco: un attacco non confinante dà errore senza toccare niente
  outer: for (const t of g.territori(0)) for (const j of g.territori(1)) {
    const prima = g.armate[t]; g.armate[t] = 1;
    const r = g.azione(0, { tipo: 'attacca', da: t, a: j });
    g.armate[t] = prima;
    if (r.errore === 'Servono almeno 2 armate per attaccare') { origine = t; dove = j; break outer; }
  }
  assert.ok(origine >= 0);
  g.armate[origine] = 4; g.armate[dove] = 6;
  T.arma(g, 0);
  let giri = 0;
  while (g.padrone[dove] !== 0 && giri++ < 20) {
    const prima = g.armate[origine];
    assert.ok(g.azione(0, { tipo: 'attacca', da: origine, a: dove }).ok);
    assert.strictEqual(g.attacco.perseA, 0, 'il truccato non perde armate');
    if (g.padrone[dove] !== 0) assert.strictEqual(g.armate[origine], prima);
  }
  assert.strictEqual(g.padrone[dove], 0, 'territorio conquistato');
  assert.ok(!T.armato(g, 0), 'trucco usato alla conquista');
}
// dadi bugiardi: dubita del bluff, calza quando sono giusti, se no la puntata vera più alta
{
  const g = nuova('bugiardi', 2);
  g.dadi = [[2, 2, 3, 5, 6], [1, 2, 4, 4, 6]];
  g.turno = 1; g.puntata = { q: 5, f: 4, chi: 0 };
  assert.strictEqual(chiedi(g, 0), null);
  assert.ok(chiedi(g, 1).startsWith('💡 Dubito! In tutto ce ne sono solo 3'));
  g.puntata = { q: 4, f: 2, chi: 0 }; g.nDadi = [5, 4]; g.dadi[1] = [1, 2, 4, 4];
  assert.ok(chiedi(g, 1).startsWith('💡 Calza! Sono proprio 4 dadi da 2'));
  g.puntata = { q: 2, f: 3, chi: 0 }; g.nDadi = [5, 5]; g.dadi[1] = [1, 2, 4, 4, 6];
  assert.ok(chiedi(g, 1).startsWith('💡 Punta 4 dadi da 2'));
}
// battaglia navale solitaria: le caselle dette sono una nave intera della soluzione
{
  const g = nuova('navale', 1);
  const t = chiedi(g, 0), m = t.match(/Nave da (\d+): (riga|colonna) (\d+)(?:, (?:colonne|righe) (\d+)–(\d+)|, colonna (\d+))/);
  const L = g.L, fissa = Number(m[3]) - 1;
  const da = m[4] ? Number(m[4]) - 1 : Number(m[6]) - 1, a = m[5] ? Number(m[5]) - 1 : da;
  for (let k = da; k <= a; k++) assert.ok(g.soluzione[m[2] === 'riga' ? fissa * L + k : k * L + fissa], t);
  assert.strictEqual(a - da + 1, Number(m[1]));
}
// scava il tesoro: sotto le caselle dette ci sono davvero gemme e monete
{
  const g = nuova('tesoro', 1);
  const t = chiedi(g, 0);
  for (const [, cosa, r, c] of t.matchAll(/(💎|🪙) riga (\d) col (\d)/g)) assert.strictEqual(g.contenuto[(r - 1) * g.lato + (c - 1)], cosa === '💎' ? 'gemma' : 'moneta');
  assert.ok(t.includes('💎'));
}
// numeri coperti: al suo turno tutti i numeri ancora coperti
{
  const g = nuova('coperti', 2);
  assert.strictEqual(chiedi(g, 1), null);
  assert.strictEqual(chiedi(g, 0), `💡 I numeri coperti sono: ${g.numeri.join(' ')}`);
}
// la mappa nascosta: seguendo le frecce si esce senza incontrare nemici
for (let k = 0; k < 20; k++) {
  const g = nuova('mappa', 1);
  const frecce = chiedi(g, 0).replace('💡 Strada sicura: ', '').split(' ');
  for (const f of frecce) {
    const c = f === '⬆️' ? g.g[0].pos - 5 : f === '⬇️' ? g.g[0].pos + 5 : f === '⬅️' ? g.g[0].pos - 1 : g.g[0].pos + 1;
    assert.ok(g.azione(0, { tipo: 'muovi', cella: c }).ok);
  }
  assert.ok(['uscito'].includes(g.storico.length ? g.storico[0][0].stato : g.g[0].stato), 'uscito senza nemici');
}
// nascondino: niente mentre ci si nasconde; poi chi caccia sa dov'è il nascosto, chi è nascosto dove andare
{
  const N = GIOCHI.nascondino;
  const g = nuova('nascondino', 2);
  assert.strictEqual(chiedi(g, 0), null, 'il cacciatore aspetta');
  g.azione(1, N.bot(g, 1, 'medio'));
  const t = chiedi(g, 0);
  assert.ok(t.startsWith('💡 Il nascosto più vicino è a '), t);
  assert.ok(chiedi(g, 1).startsWith('💡 Il cacciatore più vicino è a '));
}
console.log('✓ Trucco segreto nei giochi di strategia: mosse del computer difficile, navi, codici, tesori, nemici e dadi');
