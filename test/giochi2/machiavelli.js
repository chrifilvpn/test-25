// Machiavelli: combinazioni, mossa con la tavola rimescolata (controllata dal server), ricerca del computer e partite
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
const M = require('../../giochi2/machiavelli');
const { valuta, cercaMossa, mossaSemplice, daId, mazzoDoppio } = M._test;
const Cs = (s) => s.split(' ').map(daId);
const ok = (s) => !!valuta(Cs(s));

// ---- combinazioni ----
assert.ok(ok('5c 6c 7c'));
assert.ok(ok('7c 5c 6c'), 'in qualsiasi ordine');
assert.ok(ok('1c 2c 3c'), 'asso basso');
assert.ok(ok('12c 13c 1c'), 'asso alto');
assert.ok(!ok('13c 1c 2c'), 'niente giro dal re al 2');
assert.ok(ok('1c 2c 3c 4c 5c 6c 7c 8c 9c 10c 11c 12c 13c 1cb'), 'dall\'asso all\'asso con due mazzi');
assert.ok(!ok('5c 6c'), 'almeno 3 carte');
assert.ok(!ok('5c 6q 7c'), 'stesso seme');
assert.ok(!ok('5c 5cb 6c 7c'), 'niente doppioni nella scala');
assert.ok(ok('7c 7q 7f'));
assert.ok(ok('7c 7q 7f 7p'));
assert.ok(!ok('7c 7cb 7q'), 'semi diversi nel tris');
assert.ok(!ok('7c 7q 7f 7p 7cb'), 'massimo 4');
assert.deepStrictEqual(valuta(Cs('1c 13c 12c')).carte.map((c) => c.id), ['12c', '13c', '1c']);
assert.strictEqual(mazzoDoppio().length, 104);

// ---- la mossa: il server controlla tutto ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.tavolo = [Cs('5c 6c 7c'), Cs('9q 9f 9p')];
  g.mani[0] = Cs('8c 9c 4c 2p');
  assert.ok(g.azione(1, { tipo: 'pesca' }).errore, 'non è il suo turno');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c'], ['9q', '9f', '9p']] }).errore, 'almeno una carta');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c', '8c'], ['9q', '9f']] }).errore, 'gruppo non valido');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c', '8c']] }).errore, 'carte della tavola sparite');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c', '8c', '8c'], ['9q', '9f', '9p']] }).errore, 'doppione');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c', '8cb'], ['9q', '9f', '9p']] }).errore, 'carta non sua');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: 'x' }).errore);
  // rimescolo: 4c-5c-6c-7c-8c, e il 9c va col tris dei 9 che diventa poker
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['4c', '5c', '6c', '7c', '8c'], ['9q', '9f', '9p', '9c']] }).ok);
  assert.deepStrictEqual(g.mani[0].map((c) => c.id), ['2p']);
  assert.strictEqual(g.turno, 1);
  assert.ok(g.azione(1, { tipo: 'passa' }).errore, 'col mazzo pieno non si passa');
  const prima = g.mani[1].length;
  assert.ok(g.azione(1, { tipo: 'pesca' }).ok);
  assert.strictEqual(g.mani[1].length, prima + 1);
  // spezzare una scala in due: 4-5-6 e 7-8-9 con il 9 di cuori
  g.mani[0] = Cs('9c 3p');
  g.tavolo = [Cs('4c 5c 6c 7c 8c')];
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['4c', '5c', '6c'], ['7c', '8c', '9c']] }).ok);
  assert.strictEqual(g.tavolo.length, 2);
  assert.ok(g.ultima.nuove.includes('9c'));
}
// ---- fine: ultima carta ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  g.tavolo = [Cs('5c 6c 7c')];
  g.mani[0] = Cs('8c');
  assert.ok(g.azione(0, { tipo: 'gioca', tavolo: [['5c', '6c', '7c', '8c']] }).ok);
  assert.ok(g.finita && g.risultato.vincitori[0] === 0);
}
// ---- mazzo finito: si passa, e dopo un giro di passaggi vince chi ha meno punti ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.mazzo = [];
  g.mani = [Cs('2c 3q'), Cs('13p 1f')];
  assert.ok(g.azione(0, { tipo: 'pesca' }).errore);
  assert.ok(g.azione(0, { tipo: 'passa' }).ok);
  assert.ok(g.azione(1, { tipo: 'passa' }).ok);
  assert.ok(g.finita);
  assert.deepStrictEqual(g.risultato.vincitori, [0]);
}
// ---- la vista non mostra le carte degli altri ----
{
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  const v = JSON.stringify(g.vista(1));
  for (const c of [...g.mani[0], ...g.mani[2], ...g.mazzo]) assert.ok(!v.includes(`"${c.id}"`) || g.mani[1].some((x) => x.id === c.id));
}

// ---- il computer difficile rimescola ----
{
  // in tavola 4-5-6-7 di cuori e tris di 8; in mano 8c e 9c: per calarle deve spezzare il tris? no: 4-5-6-7-8-9c
  const tav = [Cs('4c 5c 6c 7c'), Cs('8q 8f 8p')];
  const r = cercaMossa(tav, Cs('8c 9c'), 200);
  assert.strictEqual(r.usate, 2, 'attacca 8 e 9 alla scala');
  // qui serve davvero rimescolare: 3-4-5-6-7 di picche e 7 di cuori e di quadri; in mano il 7 di fiori:
  // si tolgono il 7 di picche dalla scala e il 7 di quadri dalla sua: tris 7p 7q 7f.
  const tav2 = [Cs('3p 4p 5p 6p 7p'), Cs('7c 8c 9c'), Cs('7q 8q 9q 10q')];
  const r2 = cercaMossa(tav2, Cs('7f'), 300);
  assert.ok(r2 && r2.usate === 1, 'cala il 7 di fiori rimescolando');
  const tutti = r2.gruppi.map((x) => valuta(x.map(daId)));
  assert.ok(tutti.every(Boolean), 'gruppi validi');
  assert.strictEqual(r2.gruppi.flat().length, 13);
  // la mossa semplice (senza rimescolare) qui non trova niente
  assert.strictEqual(mossaSemplice(tav2, Cs('7f')).usate, 0);
  // nuove combinazioni dalla mano, anche con l'asso alto
  assert.strictEqual(mossaSemplice([], Cs('12p 13p 1p 5c')).usate, 3);
}
console.log('✓ Machiavelli: scale (asso basso e alto, niente giro), tris e poker, tavola rimescolata controllata dal server, pesca, passo a mazzo finito, il difficile rimescola');

// ---- partite complete tra computer ----
{
  const LIV = ['facile', 'medio', 'difficile'];
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 }, giocate = { facile: 0, medio: 0, difficile: 0 };
  const sfide = { 'difficile-medio': [0, 0], 'medio-facile': [0, 0] };
  const N = { 2: 100, 3: 30, 4: 20, 5: 12 };
  let tot = 0, maxMs = 0;
  for (const n of [2, 3, 4, 5]) {
    for (let k = 0; k < N[n]; k++) {
      const liv = n === 2 ? [[ 'difficile', 'medio'], ['medio', 'difficile'], ['medio', 'facile'], ['facile', 'medio']][k % 4] : Array.from({ length: n }, (_, i) => LIV[(i + k) % 3]);
      const g = M.crea({ n, primo: k % n, opzioni: { carte: k % 3 === 2 ? 13 : 10 }, bot: liv });
      let passi = 0;
      while (!g.finita) {
        assert.ok(++passi < 3000, 'la partita finisce');
        const t = g.turno;
        const t1 = Date.now();
        const az = M.bot(g, t, liv[t]);
        maxMs = Math.max(maxMs, Date.now() - t1);
        const r = g.azione(t, az);
        assert.ok(r.ok, `mossa rifiutata (${liv[t]}): ${r.errore}`);
        assert.strictEqual(g.mazzo.length + g.mani.flat().length + g.tavolo.flat().length, 104, 'nessuna carta persa');
        for (const gr of g.tavolo) assert.ok(valuta(gr), 'in tavola solo combinazioni valide');
      }
      for (const v of g.risultato.vincitori) vinte[liv[v]]++;
      liv.forEach((l) => giocate[l]++);
      if (n === 2 && g.risultato.vincitori.length === 1) {
        const v = g.risultato.vincitori[0], ch = `${liv[0]}-${liv[1]}`, rv = `${liv[1]}-${liv[0]}`;
        if (sfide[ch]) sfide[ch][v === 0 ? 0 : 1]++; else if (sfide[rv]) sfide[rv][v === 1 ? 0 : 1]++;
      }
      tot++;
    }
  }
  const [dv, mv] = sfide['difficile-medio'], [m2, f2] = sfide['medio-facile'];
  console.log(`✓ Machiavelli: ${tot} partite tra computer da 2 a 5 (difficile-medio ${dv}-${mv}, medio-facile ${m2}-${f2}, mossa più lenta ${maxMs} ms, ${Date.now() - t0} ms)`);
  assert.ok(dv > mv, 'il difficile batte il medio');
  assert.ok(m2 > f2, 'il medio batte il facile');
}
