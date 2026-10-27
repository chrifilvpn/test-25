// Test della revisione dei giochi party, di parole e quiz (27/10/2026): Disegna (parola dentro una frase, vincitore tra chi
// è rimasto, categorie, solo i tratti nuovi), Impostore (parole corte, troppi pareggi, categoria), Nomi cose città
// (computer al posto di chi esce, lettere senza rimandare lo stato), Impiccato (giri finiti, pareggio, una lettera a
// testa), Wordle (chat di chi ha finito, dizionario grande), chat di capitani e Psichico, reazioni, dati del quiz.
const assert = require('assert');
const { GIOCHI } = require('../../giochi');

// ---- Disegna e indovina ----
{
  const M = GIOCHI.disegna;
  const g = M.crea({ n: 3, opzioni: {} });
  g.fase = 'disegno'; g.parola = 'camion'; g.inizio = Date.now(); g.fineFase = Date.now() + 60000;
  const ind = g.disegnatore === 0 ? 1 : 0;
  const r = g.leggiChat(ind, 'secondo me è un CAMION!');
  assert.ok(r.nascondi && g.indovinato[ind] !== null, 'la parola dentro una frase vale e non si vede');
  assert.deepStrictEqual(g.leggiChat(g.disegnatore, 'è un camion'), { nascondi: true, privato: 'Non puoi scrivere la parola in chat!' });
  // vince il migliore tra chi è rimasto, anche se chi è uscito aveva più punti
  const h = M.crea({ n: 3, opzioni: {} });
  h.punti = [500, 300, 100]; h.usciti = [true, false, false];
  h.chiudi();
  assert.deepStrictEqual(h.risultato.vincitori, [1], 'vince chi ha più punti tra chi è rimasto');
  // categorie
  const { PAROLE } = M._test;
  assert.ok(PAROLE.length >= 450 && new Set(PAROLE).size === PAROLE.length, `parole diverse: ${PAROLE.length}`);
  for (const [k, c] of Object.entries(PAROLE.categorie)) {
    assert.ok(c.parole.length >= 20, `categoria ${k}: almeno 20 parole`);
    const d = M.crea({ n: 3, opzioni: { categoria: k } });
    assert.ok(d.scelte.every((w) => c.parole.includes(w)), `le 3 scelte vengono dalla categoria ${k}`);
  }
  // solo i tratti nuovi a chi ha già il disegno
  const t = M.crea({ n: 3, opzioni: {} });
  t.fase = 'disegno'; t.inPausa = false;
  const seg = (k) => t.input(t.disegnatore, { t: 'seg', k, c: t.vista(0).colori[0], s: t.vista(0).spessori[0], p: [[1, 1], [5, 5]] });
  seg(1); seg(2);
  const memo = {};
  let v = t.vista(1); t.alleggerisci(v, memo);
  assert.ok(v.segmenti.length === 2 && !v.segmentiNuovi, 'la prima volta il disegno intero');
  seg(3);
  v = t.vista(1); t.alleggerisci(v, memo);
  assert.ok(v.segmenti.length === 1 && v.segmentiNuovi, 'poi solo i tratti nuovi');
  t.azione(t.disegnatore, { tipo: 'pulisci' }); seg(4);
  v = t.vista(1); t.alleggerisci(v, memo);
  assert.ok(v.segmenti.length === 1 && !v.segmentiNuovi, 'disegno cancellato: di nuovo tutto (versione nuova)');
  console.log('✓ Disegna: parola dentro una frase, vincitore tra chi è rimasto, categorie, solo i tratti nuovi');
}

// ---- Chi è l'impostore ----
{
  const M = GIOCHI.impostore;
  const { diceLaParola } = M._test;
  assert.ok(!diceLaParola('bevanda fumante', 'tè'), 'una parola corta dentro un\'altra non conta');
  assert.ok(!diceLaParola('la capelli', 'ape'));
  assert.ok(diceLaParola('un tè caldo', 'tè'), 'la parola corta da sola sì');
  assert.ok(diceLaParola('gattone', 'gatto'), 'le parole lunghe anche dentro un\'altra');
  const g = M.crea({ n: 4, opzioni: { aiuto: 'categoria' } });
  assert.ok(g.vista(g.impostore).categoria, 'con l\'aiuto l\'impostore conosce la categoria');
  console.log('✓ Impostore: parole corte negli indizi, categoria per l\'impostore');
}

// ---- Nomi, cose, città ----
{
  const M = GIOCHI.nomicose;
  const g = M.crea({ n: 3, opzioni: {} });
  assert.strictEqual(g.fase, 'scrivi');
  assert.ok(g.attesi().includes(2));
  g.impostaBot(2, 'medio');
  assert.ok(!g.attesi().includes(2), 'il computer al posto di chi è uscito non si aspetta');
  const m = M.bot(g, 2, 'medio');
  assert.ok(m && m.tipo === 'risposta', 'il computer ha sempre una mossa valida mentre si scrive');
  const cat = g.cats[0];
  assert.strictEqual(g.azione(0, { tipo: 'risposta', cat, testo: 'a' }).silenzioso, false, 'casella che si riempie: gli altri lo vedono');
  assert.strictEqual(g.azione(0, { tipo: 'risposta', cat, testo: 'ab' }).silenzioso, true, 'una lettera in più: niente stato a tutti');
  assert.strictEqual(g.azione(0, { tipo: 'risposta', cat, testo: '' }).silenzioso, false);
  console.log('✓ Nomi, cose, città: computer al posto di chi esce, lettere senza rimandare lo stato a tutti');
}

// ---- Impiccato ----
{
  const M = GIOCHI.impiccato;
  const g = M.crea({ n: 3, opzioni: { turni: 'una' } });
  g.azione(g.turno, { tipo: 'parola', parola: 'gatto' });
  const t = g.turno;
  g.azione(t, { tipo: 'lettera', lettera: 'a' });
  assert.notStrictEqual(g.turno, t, 'una lettera a testa: il turno passa anche se è giusta');
  const c = M.crea({ n: 3, opzioni: {} });
  c.azione(c.turno, { tipo: 'parola', parola: 'gatto' });
  const t2 = c.turno;
  c.azione(t2, { tipo: 'lettera', lettera: 'a' });
  assert.strictEqual(c.turno, t2, 'normale: lettera giusta, tocca ancora a te');
  // pareggio: nessun vincitore
  const p = M.crea({ n: 2, opzioni: {} });
  p.punti = [4, 4];
  p.chiudi();
  assert.ok(p.risultato.pareggio && p.risultato.vincitori.length === 0, 'pareggio senza vincitori');
  // giri finiti saltando chi è uscito: la partita si chiude
  const f = M.crea({ n: 3, opzioni: {} });
  f.round = f.totaleRound - 1; f.fuori = [false, false, false]; f.fuori[(f.primo + f.round) % 3] = true;
  f.iniziaRound();
  assert.ok(f.finita, 'niente giro in più dopo l\'ultimo');
  console.log('✓ Impiccato: una lettera a testa, pareggio, fine dei giri saltando chi è uscito');
}

// ---- Wordle ----
{
  const M = GIOCHI.wordle;
  const { SEGRETE, PAROLE } = M._test;
  for (const l of [4, 5, 6, 7, 8]) {
    assert.ok(SEGRETE(l).length > PAROLE[l].length * 2, `più parole segrete da ${l} lettere (${SEGRETE(l).length})`);
    assert.ok(PAROLE[l].every((w) => SEGRETE(l).includes(w)), 'ci sono ancora quelle scelte a mano');
    assert.strictEqual(new Set(SEGRETE(l)).size, SEGRETE(l).length);
  }
  const d = M.crea({ n: 1, opzioni: { lunghezza: 5, controllo: 'dizionario' } });
  d.segreta = 'gatto';
  assert.ok(d.azione(0, { tipo: 'prova', parola: 'forte' }).ok, 'solo dizionario: vale ogni parola del dizionario del sito');
  const w = M.crea({ n: 1, opzioni: { lunghezza: 5 } });
  assert.strictEqual(w.parolaDaControllare(0, { tipo: 'prova', parola: 'forte' }), null, 'parola del dizionario: niente IA');
  assert.ok(!M.crea({ n: 1, opzioni: {} }).leggiChat, 'da soli la chat è libera');
  const s = M.crea({ n: 3, opzioni: { lunghezza: 5 } });
  s.segreta = 'gatto';
  assert.deepStrictEqual(s.leggiChat(0, 'ciao'), {}, 'chi gioca ancora scrive a tutti');
  s.azione(0, { tipo: 'prova', parola: 'gatto' });
  assert.deepStrictEqual(s.leggiChat(0, 'facile!').soloPer, [0], 'chi ha finito lo leggono solo quelli che hanno finito');
  console.log(`✓ Wordle: ${[4, 5, 6, 7, 8].map((l) => SEGRETE(l).length).join('/')} parole segrete, dizionario del sito, chat di chi ha finito`);
}

// ---- capitani di Codenames, Psichico di Wavelength, reazioni ----
{
  const C = GIOCHI.codenames.crea({ n: 4, opzioni: {} });
  const cap = C.capitani[0];
  const agente = [0, 1, 2, 3].find((i) => !C.capitani.includes(i));
  assert.deepStrictEqual(C.leggiChat(cap, 'ciao').soloPer.sort(), [...new Set(C.capitani)].sort(), 'i capitani parlano solo tra loro');
  assert.deepStrictEqual(C.leggiChat(agente, 'ciao'), {});
  assert.ok(!C.puoReagire(cap) && C.puoReagire(agente), 'i capitani non mandano emoji');
  const W = GIOCHI.wavelength.crea({ n: 4, opzioni: {} });
  if (!W.inAttesa && W.fase !== 'rivela') {
    assert.deepStrictEqual(W.leggiChat(W.psichico, 'ciao').soloPer, [W.psichico], 'lo Psichico non suggerisce in chat');
    assert.ok(!W.puoReagire(W.psichico));
  }
  const A = GIOCHI.alieno.crea({ n: 5, opzioni: {} });
  assert.strictEqual(typeof A.puoReagire(0), 'boolean');
  console.log('✓ Chat: capitani di Codenames, Psichico di Wavelength, reazioni bloccate quando sarebbero un suggerimento');
}

// ---- dati del quiz: niente domande doppie ----
{
  const parti = ['a', 'b', 'c', 'd'].map((x) => require(`../../giochi2/quiz-dati-${x}`));
  const viste = new Map();
  for (const p of parti) for (const testo of Object.values(p)) for (const riga of String(testo).split('\n').filter((r) => r.includes('|'))) {
    const [d, giusta] = riga.split('|');
    const k = `${d.trim().toLowerCase()}|${giusta.trim().toLowerCase().replace(/^(il|lo|la|l'|i|gli|le) ?/, '')}`;
    assert.ok(!viste.has(k), `domanda doppia: ${d}`);
    viste.set(k, true);
  }
  console.log(`✓ Quiz: ${viste.size} domande, nessuna doppia`);
}

// ---- Chi è l'impostore con due impostori ----
{
  const M = GIOCHI.impostore;
  assert.strictEqual(M.crea({ n: 5, opzioni: { impostori: 2 } }).impostori.length, 1, 'con meno di 6 giocatori un impostore solo');
  const nuova = () => {
    const g = M.crea({ n: 6, opzioni: { impostori: 2, giri: 2 } });
    g.impostori = [1, 4]; g.parola = 'gatto'; g.apre = 0; g.turno = 0;
    for (let k = 0; k < 12; k++) g.azione(g.turno, { tipo: 'indizio', testo: `indizio ${k}` });
    assert.strictEqual(g.fase, 'voto');
    return g;
  };
  // tutti votano "chi" (e lui vota un altro)
  const vota = (g, chi) => { for (const i of g.inGioco()) g.azione(i, { tipo: 'vota', posto: i === chi ? g.inGioco().find((x) => x !== chi) : chi }); };
  const g = nuova();
  assert.ok(g.vista(1).sonoImpostore && g.vista(4).sonoImpostore && g.vista(1).impostore === 1, 'ognuno sa solo di sé');
  vota(g, 1);
  assert.strictEqual(g.accusato, 1);
  g.avanza();
  assert.ok(g.fase === 'ultima' && g.turno === 1);
  assert.ok(g.azione(4, { tipo: 'indovina', parola: 'cane' }).errore, 'tenta solo quello scoperto');
  g.azione(1, { tipo: 'indovina', parola: 'cane' });
  assert.ok(g.fase === 'indizi' && g.scoperti.has(1) && !g.finita, 'primo scoperto: si cerca l\'altro');
  assert.ok(g.azione(0, { tipo: 'vota', posto: 1 }).errore);
  for (let k = 0; k < 5; k++) g.azione(g.turno, { tipo: 'indizio', testo: `altro ${k}` });
  assert.strictEqual(g.fase, 'voto');
  assert.ok(!g.inGioco().includes(1), 'lo scoperto non vota più');
  vota(g, 4);
  g.avanza();
  g.azione(4, { tipo: 'indovina', parola: 'topo' });
  assert.strictEqual(g.esito, 'scoperto');
  g.avanza();
  assert.ok(g.finita && !g.risultato.vincitori.includes(1) && !g.risultato.vincitori.includes(4) && g.risultato.vincitori.length === 4, 'scoperti tutti e due: vincono gli altri');
  // il secondo indovina la parola: vincono tutti e due gli impostori
  const h = nuova();
  vota(h, 4); h.avanza();
  h.azione(4, { tipo: 'indovina', parola: 'gatto' });
  h.avanza();
  assert.deepStrictEqual(h.risultato.vincitori.sort(), [1, 4], 'vincono entrambi gli impostori');
  // un innocente accusato: vincono gli impostori
  const k = nuova();
  vota(k, 2); k.avanza(); k.avanza();
  assert.deepStrictEqual(k.risultato.vincitori.sort(), [1, 4]);
  // uno scappa: si continua con l'altro
  const f = nuova();
  f.esce(1);
  assert.ok(!f.finita && f.fase === 'voto');
  console.log('✓ Impostore con due impostori: si cercano tutti e due, vincono insieme, chi scappa');
}
