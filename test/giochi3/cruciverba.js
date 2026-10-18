// CRUCIVERBA: ogni schema generato rispetta le regole (le parole lette nella griglia sono tutte e sole quelle con
// la definizione, lettere coerenti agli incroci, numeri in ordine di lettura, tutto collegato); scrittura, lettere
// date, controllo, aiuto, fine; sfide tra computer.
const assert = require('assert');
process.env.TEST_VELOCE = process.env.TEST_VELOCE || '1';
{ let s = 11; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const M = require('../../giochi3/cruciverba');
const { genera, DIZ, PAROLE, GRANDEZZE } = M._test;

// ---- dizionario ----
assert.ok(PAROLE.length >= 300, `parole con definizione: ${PAROLE.length}`);
for (const w of PAROLE) { assert.ok(/^[a-z]{3,13}$/.test(w), w); for (const d of DIZ.get(w)) assert.ok(!d.toLowerCase().split(/[^a-zàèéìòù]+/).includes(w), `la definizione non contiene la parola: ${w}`); }

// ---- schemi generati ----
{
  const t0 = Date.now();
  let tot = 0, parole = 0, pieno = 0;
  for (const S of Object.values(GRANDEZZE)) {
    for (let k = 0; k < 25; k++) {
      const g = genera(S, 10);
      const { righe: R, colonne: C, sol, numeri, definizioni } = g;
      assert.ok(R <= S && C <= S);
      // le parole lette nella griglia (sequenze di 2+ lettere) sono esattamente quelle con la definizione
      const lette = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const i = r * C + c;
        if (!sol[i]) continue;
        if ((c === 0 || !sol[i - 1]) && c + 1 < C && sol[i + 1]) { let w = '', j = c; while (j < C && sol[r * C + j]) w += sol[r * C + j++]; lette.push(`o${i}:${w}`); }
        if ((r === 0 || !sol[i - C]) && r + 1 < R && sol[i + C]) { let w = '', j = r; while (j < R && sol[j * C + c]) w += sol[j * C + c], j++; lette.push(`v${i}:${w}`); }
      }
      const attese = definizioni.map((d) => `${d.dir}${d.celle[0]}:${d.w}`);
      assert.deepStrictEqual(lette.sort(), attese.slice().sort(), 'nessuna parola "per caso" e nessuna mancante');
      // ogni lettera fa parte di una parola; numeri crescenti in ordine di lettura
      const coperte = new Set(definizioni.flatMap((d) => d.celle));
      sol.forEach((x, i) => assert.strictEqual(!!x, coperte.has(i)));
      let ultimo = 0;
      numeri.forEach((n) => { if (n) { assert.strictEqual(n, ultimo + 1); ultimo = n; } });
      for (const d of definizioni) { assert.ok(numeri[d.celle[0]] === d.n && DIZ.get(d.w).includes(d.def)); }
      assert.strictEqual(new Set(definizioni.map((d) => d.w)).size, definizioni.length, 'niente parole ripetute');
      // tutto collegato
      const vis = new Set([definizioni[0].celle[0]]), coda = [definizioni[0].celle[0]];
      while (coda.length) { const i = coda.pop(); for (const j of [i - 1, i + 1, i - C, i + C]) { if (j < 0 || j >= sol.length || !sol[j] || vis.has(j) || (Math.abs(j - i) === 1 && Math.floor(j / C) !== Math.floor(i / C))) continue; vis.add(j); coda.push(j); } }
      assert.strictEqual(vis.size, coperte.size, 'schema tutto collegato');
      assert.ok(definizioni.length >= { 9: 7, 11: 11, 13: 15 }[S], `abbastanza parole in ${S}×${S}: ${definizioni.length}`);
      tot++; parole += definizioni.length; pieno += coperte.size / (R * C);
    }
  }
  console.log(`  ${tot} schemi: ${(parole / tot).toFixed(1)} parole e ${Math.round((100 * pieno) / tot)}% di caselle bianche in media (${Date.now() - t0} ms)`);
}

// ---- una partita a mano ----
{
  const g = M.crea({ n: 1, opzioni: { grandezza: 'piccolo', difficolta: 'difficile' } });
  let v = g.vista(0);
  assert.ok(v.lettere.every((x) => x === '') && !v.soluzione && v.definizioni.every((d) => !d.w), 'schema vuoto, soluzione nascosta');
  const nera = v.nere.indexOf(true);
  if (nera >= 0) assert.ok(g.azione(0, { tipo: 'scrivi', i: nera, l: 'a' }).errore, 'niente lettere nelle caselle nere');
  const i0 = v.definizioni[0].celle[0];
  assert.ok(g.azione(0, { tipo: 'scrivi', i: i0, l: '7' }).errore, 'solo lettere');
  const giusta = g.sol[i0], sbagliata = giusta === 'z' ? 'a' : 'z';
  assert.ok(g.azione(0, { tipo: 'scrivi', i: i0, l: sbagliata.toUpperCase() }).ok);
  g.azione(0, { tipo: 'controlla' });
  assert.deepStrictEqual(g.vista(0).errate, [i0], 'il controllo segna la lettera sbagliata');
  assert.strictEqual(g.tavole[0].penale, 5000);
  g.azione(0, { tipo: 'scrivi', i: i0, l: '' });
  assert.deepStrictEqual(g.vista(0).errate, [], 'cancellata, non è più segnata');
  const r = g.azione(0, { tipo: 'aiuto', i: i0 });
  assert.ok(r.ok && g.tavole[0].lettere[i0] === giusta && g.tavole[0].penale === 25000, 'l\'aiuto scrive la lettera giusta');
  // tutto il resto
  g.sol.forEach((x, i) => { if (x && i !== i0) g.azione(0, { tipo: 'scrivi', i, l: x }); });
  assert.ok(g.finita && g.risultato.vincitori[0] === 0 && /1 aiuto/.test(g.risultato.titolo));
  v = g.vista(0);
  assert.ok(v.soluzione && v.definizioni.every((d) => d.w), 'alla fine si vede la soluzione');
  // lettere già date (facile): non si cambiano
  const f = M.crea({ n: 1, opzioni: { grandezza: 'medio', difficolta: 'facile' } });
  const fv = f.vista(0);
  assert.ok(fv.fisse.length >= Math.floor(f.nLettere * 0.2) && fv.fisse.every((i) => fv.lettere[i] === f.sol[i]));
  assert.ok(f.azione(0, { tipo: 'scrivi', i: fv.fisse[0], l: 'q' }).errore, 'le lettere date restano');
}

// ---- sfide tra computer ----
// ogni computer ha il suo orologio: il passo dopo arriva dopo il tempo che gli dà il suo livello (come nel gioco vero,
// dove in prova i passi sono immediati); si muove sempre quello che arriva prima
{
  const t0 = Date.now();
  const posti = { facile: 0, medio: 0, difficile: 0 }, primi = { facile: 0, medio: 0, difficile: 0 };
  const N = 60;
  for (let k = 0; k < N; k++) {
    const liv = ['facile', 'medio', 'difficile'];
    const ordine = [liv[k % 3], liv[(k + 1) % 3], liv[(k + 2) % 3]];
    const g = M.crea({ n: 3, bot: ordine, opzioni: { grandezza: ['piccolo', 'medio', 'grande'][k % 3], difficolta: liv[k % 3] } });
    const ora = [0, 1, 2].map((p) => { const m = g.pianoBot(p, ordine[p]); return (m.totale / m.passi) * 3; });
    let giri = 0;
    while (!g.finita && giri++ < 20000) {
      let p = -1;
      for (let q = 0; q < 3; q++) if (g.tavole[q].fatto == null && (p < 0 || ora[q] < ora[p])) p = q;
      const r = g.azione(p, M.bot(g, p, ordine[p]));
      assert.ok(r.ok, JSON.stringify(r));
      const m = g.pianoBot(p, ordine[p]);
      ora[p] += (m.totale / m.passi) * (0.55 + Math.random() * 0.9);
    }
    assert.ok(g.finita, 'la sfida finisce');
    // senza persone la sfida finisce al primo arrivo: per gli altri conta a che punto erano
    for (let q = 0; q < 3; q++) posti[ordine[q]] += g.progresso(q, g.tavole[q]);
    primi[ordine[g.classifica[0]]]++;
  }
  assert.ok(posti.difficile > posti.medio && posti.medio > posti.facile, JSON.stringify(posti));
  console.log(`✓ Cruciverba: ${PAROLE.length} parole con definizione, schemi generati corretti (parole incrociate, nessuna parola per caso, tutto collegato), scrittura, lettere date, controllo, aiuto; ${N} sfide tra computer: primi f/m/d ${primi.facile}/${primi.medio}/${primi.difficile}, schema completato in media ${Math.round((100 * posti.facile) / N)}%/${Math.round((100 * posti.medio) / N)}%/${Math.round((100 * posti.difficile) / N)}% (${Date.now() - t0} ms)`);
}
