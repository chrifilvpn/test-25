// CONQUISTA DEL MONDO: mappa (confini simmetrici e tutta collegata), battaglie (a parità vince la difesa), rinforzi
// con i continenti, attacco, occupazione, spostamento solo tra territori collegati, carte, eliminazione, vittoria e
// tante partite tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
{ let s = 3; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/conquista');
const { T, CONTINENTI, VICINI, battaglia, probVittoria, esiti, NT } = M._test;

// ---- mappa ----
assert.strictEqual(NT, 24);
for (const t of T) for (const j of VICINI[t.i]) assert.ok(VICINI[j].includes(t.i), 'confini simmetrici');
{ const vis = new Set([0]), coda = [0]; for (let k = 0; k < coda.length; k++) for (const j of VICINI[coda[k]]) if (!vis.has(j)) { vis.add(j); coda.push(j); } assert.strictEqual(vis.size, 24, 'la mappa è tutta collegata'); }
assert.strictEqual(Object.values(CONTINENTI).reduce((s, c) => s + c.bonus, 0), 17);
// ---- battaglie ----
{
  const e = esiti(1, 1);
  assert.ok(Math.abs(e.find((x) => x.pd === 1).p - 15 / 36) < 1e-9, 'un dado contro uno: l\'attacco vince 15 volte su 36 (a parità vince la difesa)');
  assert.ok(probVittoria(10, 2) > 0.85 && probVittoria(2, 5) < 0.05 && probVittoria(5, 5) < 0.5);
  for (let k = 0; k < 200; k++) { const b = battaglia(4, 2); assert.ok(b.a.length === 3 && b.d.length === 2 && b.perseA + b.perseD === 2); }
}
// ---- un turno a mano ----
{
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  assert.strictEqual(g.territori(0).length + g.territori(1).length, 24);
  assert.strictEqual(g.armate.reduce((s, x) => s + x, 0), 2 * 26, 'armate iniziali');
  const miei = g.territori(0);
  assert.strictEqual(g.daPiazzare, Math.max(3, Math.floor(miei.length / 3)) + Object.keys(CONTINENTI).filter((k) => T.every((x) => x.cont !== k || g.padrone[x.i] === 0)).reduce((s, k) => s + CONTINENTI[k].bonus, 0));
  assert.ok(g.azione(0, { tipo: 'attacca', da: miei[0], a: 0 }).errore, 'prima i rinforzi');
  const nemico = g.territori(1)[0];
  assert.ok(g.azione(0, { tipo: 'metti', t: nemico, quanti: 1 }).errore, 'i rinforzi vanno sui propri territori');
  // tutto su un territorio di confine
  const confine = miei.find((t) => VICINI[t].some((j) => g.padrone[j] === 1));
  g.azione(0, { tipo: 'metti', t: confine, quanti: 99 });
  assert.strictEqual(g.fase, 'attacco');
  const bers = VICINI[confine].find((j) => g.padrone[j] === 1);
  g.armate[confine] = 30; g.armate[bers] = 1;
  assert.ok(g.azione(0, { tipo: 'attacca', da: confine, a: miei.find((t) => t !== confine) }).errore, 'non si attacca un proprio territorio');
  const prima = g.armate[confine];
  g.azione(0, { tipo: 'attacca', da: confine, a: bers, fino: true });
  assert.strictEqual(g.padrone[bers], 0, 'conquistato');
  if (g.fase === 'occupa') { assert.ok(g.azione(0, { tipo: 'attacca', da: confine, a: bers }).errore, 'prima si occupa'); g.azione(0, { tipo: 'occupa', quanti: 5 }); }
  assert.strictEqual(g.armate[confine] + g.armate[bers], prima - g.attacco.perseA, 'nessuna armata persa per strada');
  g.azione(0, { tipo: 'fineAttacchi' });
  assert.strictEqual(g.fase, 'spostamento');
  // spostamento solo tra territori collegati
  const isolato = g.territori(0).find((t) => !g.collegati(0, confine).includes(t) && t !== confine);
  if (isolato != null) assert.ok(g.azione(0, { tipo: 'sposta', da: confine, a: isolato, quanti: 1 }).errore);
  g.azione(0, { tipo: 'fine' });
  assert.strictEqual(g.carte[0], 1, 'una carta per la conquista');
  assert.strictEqual(g.turno, 1);
  // carte: con 3 si prendono 8 armate
  g.carte[1] = 3; const d0 = g.daPiazzare; g.azione(1, { tipo: 'carte' });
  assert.ok(g.daPiazzare === d0 + 8 && g.carte[1] === 0);
}
// ---- partite complete tra computer ----
{
  const t0 = Date.now();
  const vinte = { facile: 0, medio: 0, difficile: 0 };
  let turni = 0;
  const N = 300;
  for (let k = 0; k < N; k++) {
    const n = 2 + (k % 4);
    const liv = Array.from({ length: n }, (_, i) => ['facile', 'medio', 'difficile'][(i + k) % 3]);
    const g = M.crea({ n, primo: k % n, opzioni: { obiettivo: k % 5 === 0 ? 'mondo' : 'sedici' } });
    let giri = 0;
    while (!g.finita && giri++ < 30000) {
      const p = g.turno;
      const r = g.azione(p, M.bot(g, p, liv[p]));
      assert.ok(r.ok, `mossa del computer ${JSON.stringify(r)} in fase ${g.fase}`);
      if (g.fase !== 'occupa') assert.ok(g.armate.every((x) => x >= 1), 'ogni territorio ha almeno un\'armata');
    }
    assert.ok(g.finita, `la partita finisce (giro ${g.giro})`);
    turni += g.nTurno;
    vinte[liv[g.risultato.vincitori[0]]]++;
  }
  assert.ok(vinte.difficile > vinte.medio && vinte.medio > vinte.facile, JSON.stringify(vinte));
  console.log(`✓ Conquista del mondo: mappa collegata, battaglie (a parità la difesa), rinforzi e continenti, attacco, occupazione, spostamento, carte; ${N} partite tra computer da 2 a 5 (${Math.round(turni / N)} turni in media): vinte f/m/d ${vinte.facile}/${vinte.medio}/${vinte.difficile} (${Date.now() - t0} ms)`);
}
