// DRAGHI E SEGRETE: regole (dadi, prove, creazione dei personaggi di tutte le classi e stirpi, livelli, riposi, morte),
// mappe (mondo e scene tattiche sempre collegate), combattimento (centinaia di battaglie tra computer, attacchi,
// incantesimi ad area, condizioni), il master (risposte JSON lette anche se sporche) e una campagna intera con un
// finto Gemini: creazione, racconto, prove, eventi, mostri inventati, combattimento, esperienza, fine.
const assert = require('assert');
const G = require('../../giochi3/draghi');
const { R, B, CLASSI, INCANTESIMI, MOSTRI, MAP, Combattimento, MASTER } = G._test;

(async () => {
  const t0 = Date.now();
  // ---------- dadi e caratteristiche ----------
  for (let k = 0; k < 2000; k++) { const t = R.tira('2d6+3'); assert.ok(t.totale >= 5 && t.totale <= 15); }
  assert.strictEqual(R.tira('1d4', { massimo: true }).totale, 4);
  assert.strictEqual(R.tira('1d8+2d6-1', { critico: true }).dadi.length, 6, 'il critico raddoppia i dadi');
  assert.strictEqual(R.media('2d6+3'), 10);
  { let v = 0, s = 0; for (let k = 0; k < 4000; k++) { v += R.d20({ vantaggio: true }).valore; s += R.d20({ svantaggio: true }).valore; } assert.ok(v / 4000 > 13 && s / 4000 < 8, 'vantaggio e svantaggio'); }
  assert.deepStrictEqual([8, 10, 11, 12, 13, 15, 20].map(R.mod), [-1, 0, 0, 1, 1, 2, 5]);
  assert.strictEqual(R.controllaCaratteristiche({ for: 15, des: 15, cos: 15, int: 8, sag: 8, car: 8 }, 'punti'), null, '27 punti esatti');
  assert.ok(R.controllaCaratteristiche({ for: 15, des: 15, cos: 15, int: 15, sag: 8, car: 8 }, 'punti'), 'più di 27 punti no');
  assert.ok(R.controllaCaratteristiche({ for: 16, des: 14, cos: 13, int: 12, sag: 10, car: 8 }, 'standard'), 'la serie standard va usata così com\'è');
  { const t = R.tiraCaratteristiche(); assert.ok(t.length === 6 && t.every((x) => x >= 3 && x <= 18)); }

  // ---------- creazione: tutte le classi, tutte le stirpi, vari livelli ----------
  let creati = 0;
  for (const cl of Object.keys(CLASSI)) for (const st of Object.keys(B.STIRPI)) for (const L of [1, 3, 5, 10, 20]) {
    const r = R.creaPersonaggio(R.completaScelte({ classe: cl, stirpe: st, livello: L }));
    assert.ok(!r.errore, `${cl} ${st} ${L}: ${r.errore}`);
    const p = r.pg;
    assert.ok(p.pf === p.pfMax && p.pfMax >= L && p.ca >= 10 && p.attacchi.length >= 1);
    if (CLASSI[cl].magia && L >= 2) assert.ok(p.magia.slot.length >= 1 && p.magia.cd >= 10, `${cl} ha gli slot`);
    creati++;
  }
  {
    const s = R.completaScelte({ classe: 'mago', stirpe: 'umano', nome: 'Zefiro' });
    assert.ok(R.creaPersonaggio({ ...s, nome: '' }).errore, 'il nome serve');
    assert.ok(R.creaPersonaggio({ ...s, abilita: ['furtivita', 'atletica'] }).errore, 'abilità fuori dalla classe');
    assert.ok(R.creaPersonaggio({ ...s, trucchetti: ['fiammaSacra'] }).errore, 'trucchetti di un\'altra classe');
    const p = R.creaPersonaggio(s).pg;
    assert.strictEqual(p.pfMax, 6 + p.mod.cos, 'mago: d6 + Costituzione al 1° livello');
    assert.strictEqual(p.magia.slot[0], 2);
    assert.strictEqual(p.magia.cd, 8 + 2 + p.mod.int);
    // salire di livello
    for (let k = 0; k < 4; k++) R.saliLivello(p);
    assert.ok(p.livello === 5 && p.magia.slot.length === 3 && p.comp === 3, 'al 5° livello: slot di 3° e competenza +3');
    R.aggiungiPx(p, 100000);
    assert.strictEqual(p.livello, 12, '100000 PX: 12° livello');
    // riposi
    p.pf = 1; p.magia.slotUsati[0] = 2;
    R.riposo(p, 'lungo');
    assert.ok(p.pf === p.pfMax && p.magia.slotUsati[0] === 0);
  }
  {
    // CA: armatura, scudo, stili, difesa senza armatura
    const g = R.creaPersonaggio(R.completaScelte({ classe: 'guerriero', stirpe: 'umano', stili: ['difesa'], equip: 0 })).pg;
    assert.strictEqual(g.ca, 16 + 2 + 1, 'cotta di maglia + scudo + stile difesa');
    const b = R.creaPersonaggio(R.completaScelte({ classe: 'barbaro', stirpe: 'mezzorco' })).pg;
    assert.strictEqual(b.ca, 10 + b.mod.des + b.mod.cos);
    const m = R.creaPersonaggio(R.completaScelte({ classe: 'monaco', stirpe: 'umano' })).pg;
    assert.strictEqual(m.ca, 10 + m.mod.des + m.mod.sag);
    // prove: competenza e maestria
    const l = R.creaPersonaggio(R.completaScelte({ classe: 'ladro', stirpe: 'halfling', background: 'nobile', abilita: ['furtivita', 'acrobazia', 'percezione', 'inganno'], maestria: ['furtivita', 'percezione'] })).pg;
    assert.strictEqual(R.bonusAbilita(l, 'furtivita'), l.mod.des + 2 * l.comp, 'maestria raddoppia');
    const pr = R.prova(l, 'furtivita', { cd: 10 });
    assert.ok(pr.totale === pr.d20.valore + pr.bonus && typeof pr.riuscita === 'boolean');
    // morte: a 0 punti ferita si tira contro la morte, tre fallimenti e si muore
    const v = R.creaPersonaggio(R.completaScelte({ classe: 'chierico', stirpe: 'umano' })).pg;
    R.applicaDanno(v, v.pf, 'taglio');
    assert.ok(v.pf === 0 && v.condizioni.includes('privo') && !v.morto);
    R.applicaDanno(v, 1, 'taglio'); R.applicaDanno(v, 1, 'taglio'); R.applicaDanno(v, 1, 'taglio');
    assert.ok(v.morto, 'tre colpi a terra: morto');
    const w = R.creaPersonaggio(R.completaScelte({ classe: 'mago', stirpe: 'elfo' })).pg;
    R.applicaDanno(w, w.pf + w.pfMax, 'fuoco');
    assert.ok(w.morto, 'danno enorme: morte istantanea');
    // resistenze
    const t = R.creaPersonaggio(R.completaScelte({ classe: 'warlock', stirpe: 'tiefling' })).pg;
    const pf = t.pf; R.applicaDanno(t, 10, 'fuoco'); assert.strictEqual(t.pf, pf - 5, 'tiefling: resistenza al fuoco');
  }
  // ---------- mostri ----------
  for (const id of Object.keys(MOSTRI)) { const m = R.mostroDa(id); assert.ok(m && m.pf > 0 && m.ca > 0 && m.attacchi.length, id); }
  {
    const inv = R.mostroDa({ nome: 'Ombra affamata', pf: 40, ca: 15, gs: 3, attacchi: [{ nome: 'Morso', bonus: 6, danno: '2d8+3', tipo: 'necrotico' }], resistente: ['freddo', 'nonEsiste'], simbolo: '👤' });
    assert.ok(inv.pf === 40 && inv.ca === 15 && inv.attacchi[0].danno === '2d8+3' && inv.resistente.join() === 'freddo');
    const male = R.mostroDa({ nome: 'X', pf: 99999, ca: 99, attacchi: [{ danno: 'rm -rf' }] });
    assert.ok(male.pf <= 700 && male.ca <= 25 && male.attacchi[0].danno === '1d6+2', 'i valori assurdi si limitano');
  }
  // ---------- mappe ----------
  for (let k = 0; k < 120; k++) {
    const sc = MAP.scena(MAP.STILI_SCENA[k % MAP.STILI_SCENA.length], k * 97 + 3);
    assert.ok(sc.partenzaGruppo.length >= 6 && sc.partenzaNemici.length >= 8, sc.stile);
    const d = MAP.distanze(sc, sc.partenzaGruppo[0].x, sc.partenzaGruppo[0].y);
    for (const p of sc.partenzaNemici.slice(0, 8)) assert.ok(d[p.y * sc.w + p.x] < Infinity, `${sc.stile}: i nemici sono raggiungibili`);
  }
  {
    const m = MAP.generaMondo(42);
    assert.strictEqual(m.celle.length, m.w * m.h);
    const l1 = MAP.aggiungiLuogo(m, { nome: 'Borgo', tipo: 'villaggio' });
    const l2 = MAP.aggiungiLuogo(m, { nome: 'Cripta nera', tipo: 'cripta', vicinoA: l1.id });
    assert.ok(l1 && l2 && Math.hypot(l1.x - l2.x, l1.y - l2.y) < 20 && MAP.aggiungiLuogo(m, { nome: 'borgo' }) === l1, 'luoghi vicini, niente doppioni');
  }
  // ---------- combattimenti tra computer ----------
  {
    const incontri = [['goblin', 'goblin', 'goblin', 'goblin'], ['orco', 'orco', 'goblin'], ['scheletro', 'scheletro', 'zombi', 'zombi'], ['bugbear', 'hobgoblin', 'hobgoblin'], ['ghoul', 'ghoul'], ['lupo', 'lupo', 'lupoCrudele'], ['fanatico', 'cultista', 'cultista'], ['ogre'], ['ragno', 'ragno'], ['bandito', 'bandito', 'capoBandito']];
    const classi = Object.keys(CLASSI);
    let vinte = 0, finite = 0, eventi = 0, inc = 0;
    const N = 200;
    for (let k = 0; k < N; k++) {
      const L = [1, 3, 5][k % 3];
      const gruppo = [0, 1, 2, 3].map((i) => R.creaPersonaggio(R.completaScelte({ classe: classi[(k + i * 3) % classi.length], livello: L })).pg);
      const nem = incontri[k % incontri.length].map((id) => R.mostroDa(id));
      if (L >= 3) nem.push(R.mostroDa('orco'), R.mostroDa('orco'));
      if (L >= 5) nem.push(R.mostroDa('ogre'));
      const cb = new Combattimento({ scena: MAP.scena(MAP.STILI_SCENA[k % MAP.STILI_SCENA.length], k * 13 + 1), gruppo, nemici: nem, livelloIA: ['facile', 'medio', 'difficile'][k % 3] });
      let giri = 0;
      while (!cb.finito && giri++ < 2000) cb.turnoAutomatico();
      if (cb.finito) finite++;
      if (cb.finito === 'vittoria') vinte++;
      eventi += cb.eventi.length;
      inc += cb.eventi.filter((e) => e.tipo === 'incantesimo').length;
      for (const c of cb.creature) { assert.ok(c.x >= 0 && c.y >= 0 && c.x < cb.scena.w && c.y < cb.scena.h); assert.ok(MAP.passabile(cb.scena.g[c.y * cb.scena.w + c.x]), 'nessuno dentro i muri'); }
      const pos = cb.creature.filter((c) => cb.vivo(c)).map((c) => `${c.x},${c.y}`);
      assert.strictEqual(new Set(pos).size, pos.length, 'due creature non stanno nella stessa casella');
    }
    assert.strictEqual(finite, N, 'tutti i combattimenti finiscono');
    assert.ok(vinte > N * 0.5 && vinte < N, `il gruppo vince spesso ma non sempre (${vinte}/${N})`);
    assert.ok(inc > N, 'gli incantatori lanciano incantesimi');
    console.log(`  ${N} combattimenti tra computer: ${vinte} vinti dal gruppo, ${Math.round(eventi / N)} eventi e ${(inc / N).toFixed(1)} incantesimi in media`);
  }
  // ---------- combattimento a mano: attacco, area, opportunità ----------
  {
    const sc = MAP.scena('taverna', 5);
    const gu = R.creaPersonaggio(R.completaScelte({ classe: 'guerriero', livello: 5 })).pg;
    const ma = R.creaPersonaggio(R.completaScelte({ classe: 'mago', livello: 5, incantesimi: ['pallaDiFuoco', 'dardoIncantato', 'scudo', 'sonno', 'raggioRovente', 'passoVelato', 'fulmine', 'blocca'] })).pg;
    const gob = [R.mostroDa('goblin'), R.mostroDa('goblin'), R.mostroDa('goblin')];
    const cb = new Combattimento({ scena: sc, gruppo: [gu, ma], nemici: gob });
    // si mettono tutti vicini a mano
    const [cg, cm, g1, g2, g3] = cb.creature;
    const libere = []; for (let y = 2; y < sc.h - 2; y++) for (let x = 2; x < sc.w - 2; x++) if (MAP.passabile(sc.g[y * sc.w + x])) libere.push({ x, y });
    const posto = (c, x, y) => { c.x = x; c.y = y; };
    const base = libere.find((p) => [0, 1, 2, 3].every((dx) => MAP.passabile(sc.g[p.y * sc.w + p.x + dx])) && [0, 1].every((dy) => MAP.passabile(sc.g[(p.y + dy) * sc.w + p.x])));
    posto(cg, base.x, base.y); posto(g1, base.x + 1, base.y); posto(g2, base.x + 2, base.y); posto(g3, base.x + 3, base.y); posto(cm, base.x, base.y + 1 > sc.h - 2 ? base.y - 1 : base.y + 1);
    cb.ordine = [cg.id, cm.id, g1.id, g2.id, g3.id]; cb.indice = 0; cb.iniziaTurno();
    const r1 = cb.attacca(cg.id, g1.id);
    assert.ok(r1.ok && cb.attivo === cg && cg.turno.attacchi === 1, 'primo dei due attacchi');
    assert.ok(cb.attacca(cg.id, cb.vivo(g1) ? g1.id : g2.id).ok, 'secondo attacco (attacco extra)');
    assert.ok(cb.attacca(cg.id, cb.vivo(g2) ? g2.id : g3.id).errore, 'finiti gli attacchi');
    cb.fineTurno(cg.id);
    assert.strictEqual(cb.attivo, cm);
    const pfPrima = gob.map((g) => g.pf);
    const r2 = cb.lancia(cm.id, 'pallaDiFuoco', { punto: { x: g3.x, y: g3.y } });
    assert.ok(r2.ok, JSON.stringify(r2));
    assert.ok(gob.some((g, i) => g.pf < pfPrima[i] || g.morto), 'la palla di fuoco fa danni');
    assert.strictEqual(ma.magia.slotUsati[2], 1, 'spende uno slot di 3°');
    assert.ok(cb.lancia(cm.id, 'dardoIncantato', { bersagli: [g3.id] }).errore, 'una sola azione');
    assert.ok(cb.lancia(cm.id, 'desiderio', {}).errore, 'non conosce quell\'incantesimo');
  }
  // ---------- master: lettura delle risposte ----------
  {
    const r = MASTER.leggiRisposta('Ecco:\n```json\n{"narrazione":"Ciao","prove":[{"chi":"Ada","tipo":"furtivita","cd":12}],"scelte":["a","b"]}\n```');
    assert.ok(r.narrazione === 'Ciao' && r.prove.length === 1 && r.scelte.length === 2);
    const s = MASTER.leggiRisposta('Solo testo, niente JSON.');
    assert.ok(s.narrazione.includes('Solo testo') && Array.isArray(s.eventi));
    assert.ok(MASTER.istruzioni({ ambientazione: 'oscura', difficolta: 'mortale', lunghezza: 'lunghe', regoleBrevi: '' }).includes('nessun limite'));
  }
  // ---------- una campagna con un finto Gemini ----------
  {
    const risposte = [
      { narrazione: 'Benvenuti a Vallegrigia. Una campana suona a morto.', eventi: [{ tipo: 'luogo', nome: 'Vallegrigia', luogoTipo: 'villaggio', vaiQui: true }, { tipo: 'png', nome: 'Mastro Oreste', descrizione: 'Il borgomastro, spaventato', atteggiamento: 'amico' }, { tipo: 'missione', titolo: 'La campana', descrizione: 'Chi suona la campana di notte?', stato: 'nuova' }], scelte: ['Andare alla torre', 'Parlare con Oreste'] },
      { narrazione: 'Salite le scale buie della torre…', prove: [{ chi: 'tutti', tipo: 'percezione', cd: 12, motivo: 'notare la trappola' }] },
      { narrazione: 'Un dardo scatta dal muro!', salvezze: [{ chi: 'tutti', car: 'des', cd: 11, danno: '1d4', tipoDanno: 'perforante', meta: true }] },
      { narrazione: 'In cima, una creatura d\'ombra vi aspetta.', combattimento: { nemici: [{ nome: 'Ombra della campana', pf: 12, ca: 11, gs: 0.5, attacchi: [{ nome: 'Tocco gelido', bonus: 3, danno: '1d6+1', tipo: 'freddo' }], simbolo: '👤', colore: '#333333' }, { id: 'ratto', n: 2 }], scena: 'castello', luce: 'buio' } },
      { narrazione: 'L\'ombra si dissolve. Trovate una spada.', eventi: [{ tipo: 'oggetto', chi: 'tutti', nome: 'Spada della campana +1', arma: 'spadalunga', bonus: 1 }, { tipo: 'oro', chi: 'gruppo', quantita: 100 }, { tipo: 'px', quantita: 300 }, { tipo: 'missione', titolo: 'La campana', stato: 'completata' }, { tipo: 'riposo', durata: 'lungo' }], diario: 'Il gruppo ha liberato la torre della campana.' },
    ];
    let chiamate = 0;
    const fintoFetch = async (url, opz) => {
      const corpo = JSON.parse(opz.body);
      assert.ok(corpo.safetySettings.every((s) => s.threshold === 'BLOCK_NONE'), 'nessun filtro');
      assert.ok(corpo.contents[0].parts[0].text.includes('IL GRUPPO'), 'il master riceve il contesto');
      const testo = corpo.contents[0].parts[0].text;
      // il racconto dei round di combattimento
      if (testo.includes('Raccontalo in modo vivido')) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"narrazione":"Lame e ombre si scontrano."}' }] } }] }) };
      const r = risposte[Math.min(chiamate++, risposte.length - 1)];
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
    };
    const g = G.crea({ n: 3, bot: [null, null, 'medio'], opzioni: { livello: 3 } });
    g.chiave = 'finta'; g.fetch = fintoFetch;
    const aspetta = async () => { for (let k = 0; k < 50; k++) { await new Promise((r) => setImmediate(r)); g.controllaTempo(); if (!g.attesaIA) break; } };
    assert.strictEqual(g.fase, 'creazione');
    assert.ok(g.azione(1, { tipo: 'idea', testo: 'x' }).errore, 'l\'idea la scrive chi apre il tavolo');
    assert.ok(g.azione(0, { tipo: 'idea', testo: 'Una campana che suona da sola' }).ok);
    assert.ok(g.azione(0, { tipo: 'crea', scelte: { nome: '' } }).errore);
    assert.ok(g.azione(0, { tipo: 'tiraCaratteristiche' }).ok && g.vista(0).tirati.length === 6);
    const s0 = R.completaScelte({ classe: 'paladino', stirpe: 'umano', nome: 'Aldo', livello: 3, metodo: 'dadi', tirati: g.tirati[0].valori });
    assert.ok(g.azione(0, { tipo: 'crea', scelte: s0 }).ok, 'crea con i dadi tirati');
    assert.strictEqual(g.pg[0].livello, 3);
    assert.deepStrictEqual(g.attesi(), [1, 2]);
    assert.ok(g.azione(2, G.bot(g, 2)).ok, 'il compagno del computer si crea da solo');
    assert.ok(g.azione(1, { tipo: 'crea', casuale: true, scelte: { classe: 'mago' } }).ok);
    assert.strictEqual(g.fase, 'avventura');
    assert.ok(g.attesaIA);
    await aspetta();
    assert.ok(g.racconto.some((x) => x.tipo === 'master' && x.testo.includes('Vallegrigia')));
    assert.ok(g.png.length === 1 && g.missioni.length === 1 && g.mondo.luoghi.some((l) => l.nome === 'Vallegrigia'));
    assert.deepStrictEqual(g.attesi(), [0, 1], 'aspettano le persone (il compagno lo muove il master)');
    assert.ok(g.azione(0, { tipo: 'dichiara', testo: 'Salgo sulla torre con la spada in pugno' }).ok);
    assert.ok(!g.attesaIA);
    assert.ok(g.azione(1, { tipo: 'dichiara', testo: 'Lo seguo con una luce' }).ok);
    assert.ok(g.attesaIA, 'quando hanno scritto tutti parte il master');
    await aspetta();
    assert.strictEqual(g.fase, 'prove');
    assert.strictEqual(g.prove.length, 3, 'percezione per tutti');
    assert.ok(g.azione(0, { tipo: 'tira' }).ok);
    assert.ok(g.azione(0, { tipo: 'tira' }).errore, 'un tiro a testa');
    g.azione(1, { tipo: 'tira' }); g.azione(2, G.bot(g, 2));
    assert.ok(g.attesaIA);
    await aspetta();
    assert.strictEqual(g.fase, 'prove', 'ora i tiri salvezza');
    const pfPrima = g.pg.map((p) => p.pf);
    for (const p of [0, 1, 2]) g.azione(p, { tipo: 'tira' });
    await aspetta();
    assert.ok(g.pg.some((p, i) => p.pf < pfPrima[i]) || g.racconto.some((x) => /0 danni|RIUSCITA/.test(x.testo)));
    assert.strictEqual(g.fase, 'combattimento');
    const cb = g.combattimento;
    assert.ok(cb.creature.some((c) => c.ref.nome === 'Ombra della campana') && cb.creature.filter((c) => c.lato === 'nemici').length === 3);
    // si gioca: le persone col pulsante "turno automatico", i mostri da soli
    let giri = 0;
    while (g.fase === 'combattimento' && giri++ < 400) {
      const att = g.attesi();
      if (att.length) { const r = g.azione(att[0], { tipo: 'autoTurno' }); assert.ok(r.ok, JSON.stringify(r)); }
      g.prossimaMossaMostro = 0;
      g.controllaTempo();
      await new Promise((r) => setImmediate(r));
    }
    await aspetta();
    assert.notStrictEqual(g.fase, 'combattimento', 'il combattimento finisce');
    if (!g.finita) {
      assert.ok(g.pg.some((p) => p.armiMagiche && p.armiMagiche.length), 'la spada magica è stata data');
      assert.ok(g.missioni[0].stato === 'completata' && g.diario.includes('torre'));
      assert.ok(g.pg.every((p) => p.morto || p.pf === p.pfMax), 'riposo lungo');
    }
    const v = g.vista(0);
    assert.ok(v.mondo.celle.length === v.mondo.w * v.mondo.h && v.racconto.length > 5 && v.pg.length === 3);
    assert.ok(JSON.stringify(v).length < 400000, 'la vista non è enorme');
    assert.ok(g.azione(1, { tipo: 'termina' }).errore);
    assert.ok(g.azione(0, { tipo: 'termina' }).ok && g.finita && g.risultato.fazioni.length === 3);
    console.log(`  campagna di prova con il finto master: ${chiamate} risposte, ${g.racconto.length} voci nel racconto`);
  }
  // ---------- azione libera in combattimento: decide il master, il gioco applica gli effetti ----------
  {
    const g = G.crea({ n: 1, bot: [null], opzioni: {} });
    g.chiave = 'finta';
    g.fetch = async (url, o) => { const t = JSON.parse(o.body).contents[0].parts[0].text; assert.ok(t.includes('rovescio il braciere') && t.includes('d20 =')); const nem = g.combattimento.creature.find((c) => c.lato === 'nemici'); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ narrazione: 'Le braci investono il nemico.', riuscita: true, effetti: [{ bersaglio: nem.ref.nome, danno: '50', tipoDanno: 'fuoco', condizione: 'prono', turni: 1 }] }) }] } }] }) }; };
    g.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
    g.attesaIA = false; g.rispostaIA = null; g.ultimaRichiesta = null;
    g.iniziaCombattimento({ nemici: [{ id: 'ogre' }], scena: 'taverna' });
    const cb = g.combattimento;
    for (let k = 0; k < 10 && cb.attivo.ref !== g.pg[0]; k++) { cb.turnoAutomatico('medio'); }
    if (!cb.finito && cb.attivo.ref === g.pg[0]) {
      const nem = cb.creature.find((c) => c.lato === 'nemici'), prima = nem.ref.pf;
      assert.ok(g.azione(0, { tipo: 'libera', testo: '' }).errore, 'serve un testo');
      assert.ok(g.azione(0, { tipo: 'libera', testo: 'rovescio il braciere addosso all\'ogre' }).ok);
      assert.ok(g.azione(0, { tipo: 'libera', testo: 'ancora' }).errore, 'una sola azione');
      for (let k = 0; k < 10 && !g.liberaPronta; k++) await new Promise((r) => setImmediate(r));
      g.controllaTempo();
      assert.ok(nem.ref.pf < prima, 'il danno deciso dal master è applicato');
      assert.ok(g.racconto.some((x) => x.tipo === 'master' && x.testo.includes('braci')));
    }
  }
  // ---------- modalità pazza: casella che si aggiunge a qualsiasi ambientazione ----------
  {
    const g = G.crea({ n: 1, bot: [null], opzioni: { ambientazione: 'pirati', pazza: 'true' } });
    assert.ok(g.pazza && g.ambientazione === 'pirati' && g.vista(0).pazza);
    assert.ok(g.sistema().includes('AVVENTURA PAZZA') && g.sistema().includes('pirati'));
    assert.ok(!G.crea({ n: 1, bot: [null], opzioni: {} }).sistema().includes('AVVENTURA PAZZA'), 'di solito il master è serio');
    assert.ok(MASTER.masterRiserva({ pazza: true }).narrazione.length > 20);
  }
  // ---------- senza IA: il master di riserva ----------
  {
    const g = G.crea({ n: 1, bot: [null], opzioni: {} });
    g.chiave = '';
    g.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
    for (let k = 0; k < 5; k++) await new Promise((r) => setImmediate(r));
    g.controllaTempo();
    assert.ok(g.racconto.some((x) => x.tipo === 'master'), 'il master di riserva racconta');
    for (let giro = 0; giro < 30 && !g.finita; giro++) {
      if (g.fase === 'avventura' && !g.attesaIA) g.azione(0, { tipo: 'dichiara', testo: 'Vado avanti' });
      else if (g.fase === 'prove') g.azione(0, { tipo: 'tira' });
      else if (g.fase === 'combattimento') { const att = g.attesi(); if (att.length) g.azione(0, { tipo: 'autoTurno' }); g.prossimaMossaMostro = 0; }
      for (let k = 0; k < 3; k++) { await new Promise((r) => setImmediate(r)); g.controllaTempo(); }
    }
    assert.ok(g.racconto.filter((x) => x.tipo === 'master').length >= 3);
  }
  console.log(`✓ Draghi e Segrete: dadi, ${creati} personaggi (12 classi × 9 stirpi × 5 livelli), livelli e riposi, morte, ${Object.keys(MOSTRI).length} mostri e mostri inventati, ${Object.keys(INCANTESIMI).length} incantesimi, mappe collegate, combattimenti tattici, master IA con finto Gemini e master di riserva (${Date.now() - t0} ms)`);
})().catch((e) => { console.error(e); process.exit(1); });
