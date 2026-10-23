// DRAGHI E SEGRETE, il master umano: si sceglie al tavolo (non crea un personaggio), le richieste aspettano lui, la
// sua risposta (racconto, prove, eventi, combattimento) la applica il gioco, l'IA gli fa da consigliere, scrive una
// bozza, risponde al posto suo o fa tutto in automatico; se il master è via risponde l'IA; i giocatori non vedono le
// sue cose; anche nelle ambientazioni horror (vede tutta la stazione).
const assert = require('assert');
const G = require('../../giochi3/draghi');

const aspetta = () => new Promise((r) => setImmediate(r));
async function finoA(g, cond, n = 40) { for (let k = 0; k < n && !cond(); k++) { await aspetta(); g.controllaTempo(); } }

(async () => {
  const t0 = Date.now();
  const g = G.crea({ n: 3, bot: [null, null, 'medio'], opzioni: {} });
  g.chiave = ''; // niente Gemini: consiglieri e bozze dal master di riserva
  // la scelta del master: chi ha aperto il tavolo sceglie, il computer no
  assert.ok(g.azione(1, { tipo: 'dm-scegli', posto: 0 }).errore, 'solo chi ha aperto il tavolo sceglie un altro');
  assert.ok(g.azione(0, { tipo: 'dm-scegli', posto: 2 }).errore, 'il computer non fa il master');
  assert.ok(!g.azione(0, { tipo: 'dm-scegli', posto: 1 }).errore);
  assert.strictEqual(g.dm, 1);
  assert.ok(g.azione(1, { tipo: 'crea', casuale: true, scelte: {} }).errore, 'il master non crea il personaggio');
  assert.ok(!g.attesiTutti().includes(1), 'nella creazione non si aspetta il master');
  assert.ok(!g.azione(1, { tipo: 'idea', testo: 'un faro maledetto' }).errore, 'il master scrive l\'idea');
  g.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
  assert.strictEqual(g.fase, 'creazione');
  assert.ok(!g.azione(1, { tipo: 'inizia' }).errore, 'il master può far partire');
  assert.strictEqual(g.fase, 'avventura');
  assert.ok(g.pg[0] && g.pg[2] && !g.pg[1], 'personaggi per tutti tranne il master');
  // l'inizio aspetta il master, non l'IA
  assert.ok(g.attesaIA && g.attesaDM, 'la prima scena la racconta il master');
  assert.deepStrictEqual(g.attesi(), [1], 'il server aspetta il master');
  assert.ok(g.vista(1).dmInfo.richiesta.testo.includes('un faro maledetto'), 'il master vede la richiesta');
  assert.strictEqual(g.vista(0).dmInfo, null, 'i giocatori non vedono le cose del master');
  assert.ok(g.vista(0).attesaIA, 'i giocatori vedono che il master sta pensando');
  assert.ok(g.azione(0, { tipo: 'dm-rispondi', risposta: { narrazione: 'x' } }).errore, 'solo il master risponde');
  assert.ok(g.azione(1, { tipo: 'dm-rispondi', risposta: {} }).errore, 'una risposta vuota non va');
  // il consigliere (senza IA: consigli scritti a mano) e la bozza
  assert.ok(!g.azione(1, { tipo: 'dm-chiedi', testo: 'che CD do per scassinare?' }).errore);
  await finoA(g, () => !g.attesaConsiglio);
  assert.strictEqual(g.consigli.length, 2); assert.ok(/CD/.test(g.consigli[1].testo), 'il consigliere risponde');
  assert.ok(!g.azione(1, { tipo: 'dm-bozza' }).errore);
  await finoA(g, () => !g.attesaBozza);
  assert.ok(g.vista(1).dmInfo.bozza && g.vista(1).dmInfo.bozza.r.narrazione, 'la bozza dell\'IA arriva al master');
  assert.ok(g.attesaDM, 'la bozza non risponde da sola');
  // la risposta del master: racconto, evento e una prova
  const nome = g.pg[0].nome;
  assert.ok(!g.azione(1, { tipo: 'dm-rispondi', risposta: { narrazione: 'Il faro è buio.', eventi: [{ tipo: 'oro', chi: nome, quantita: 7 }], prove: [{ chi: nome, tipo: 'percezione', cd: 12 }], scelte: ['Salire', 'Scendere'] } }).errore);
  assert.ok(!g.attesaIA && !g.attesaDM);
  assert.ok(g.racconto.some((v) => v.tipo === 'master' && v.testo === 'Il faro è buio.'), 'il racconto del master');
  assert.strictEqual(g.fase, 'prove'); assert.deepStrictEqual(g.scelte, ['Salire', 'Scendere']);
  g.azione(0, { tipo: 'tira' });
  await finoA(g, () => g.prove.every((x) => x.esito));
  assert.ok(g.attesaDM && g.attesaDM.tipo === 'esiti', 'gli esiti tornano al master');
  // "fai rispondere l'IA" una volta
  assert.ok(!g.azione(1, { tipo: 'dm-ia' }).errore);
  await finoA(g, () => !g.attesaIA);
  assert.ok(!g.attesaDM && !g.attesaIA, 'ha risposto l\'IA (di riserva)');
  // (il master di riserva a volte fa partire uno scontro o chiede una prova: qui si torna al racconto)
  g.combattimento = null; g.prove = []; g.fase = 'avventura';
  // le dichiarazioni dei giocatori vanno al master; il master può intervenire anche senza richiesta
  assert.ok(!g.azione(1, { tipo: 'dm-narra', testo: 'Un tuono scuote le finestre.' }).errore);
  g.azione(0, { tipo: 'dichiara', testo: 'salgo le scale' });
  await finoA(g, () => g.attesaDM);
  assert.ok(g.attesaDM && /salgo le scale/.test(g.attesaDM.richiesta));
  // un combattimento deciso dal master: il racconto dei round non lo fa l'IA, le azioni libere le giudica il master
  g.azione(1, { tipo: 'dm-rispondi', risposta: { narrazione: 'Goblin!', combattimento: { nemici: [{ id: 'goblin', n: 2 }], scena: 'dungeon' } } });
  assert.strictEqual(g.fase, 'combattimento');
  const c = g.creaturaDi(0); c.turno = { ...(c.turno || { bonus: true, movimento: 9, attacchi: 0, attacchiMax: 1 }), azione: true }; g.combattimento.indice = g.combattimento.ordine.indexOf(c.id);
  assert.ok(!g.azione(0, { tipo: 'libera', testo: 'lancio la lanterna sul goblin' }).errore);
  assert.ok(g.liberaDM && g.attesiTutti().includes(1), 'l\'azione libera aspetta il master');
  assert.strictEqual(g.vista(1).dmInfo.libera.testo, 'lancio la lanterna sul goblin');
  const gob = g.combattimento.creature.find((x) => x.lato === 'nemici');
  const pf = gob.ref.pf;
  assert.ok(!g.azione(1, { tipo: 'dm-libera', esito: { narrazione: 'La lanterna esplode.', effetti: [{ bersaglio: gob.ref.nome, danno: '3', tipoDanno: 'fuoco' }] } }).errore);
  assert.ok(gob.ref.pf < pf || gob.ref.morto, 'l\'effetto deciso dal master si applica');
  assert.ok(!g.liberaDM && !g.attesaLibera);
  // il master è via: risponde l'IA (la mossa del computer per il master)
  g.combattimento = null; g.fase = 'avventura';
  g.chiediMaster('azioni', 'Cosa fanno i personaggi: niente');
  assert.deepStrictEqual(G.bot(g, 1), { tipo: 'dm-ia' });
  g.azione(1, G.bot(g, 1));
  await finoA(g, () => !g.attesaIA);
  assert.ok(!g.attesaDM);
  // automatico: l'IA risponde da sola finché il master non riprende
  g.azione(1, { tipo: 'dm-auto', si: true });
  g.chiediMaster('azioni', 'Cosa fanno: niente');
  assert.ok(!g.attesaDM, 'in automatico non si aspetta il master');
  await finoA(g, () => !g.attesaIA);
  g.azione(1, { tipo: 'dm-auto', si: false });
  // il master lascia: torna l'IA, e il suo posto resta senza personaggio
  g.chiediMaster('azioni', 'Cosa fanno: niente');
  assert.ok(g.attesaDM);
  assert.ok(!g.azione(0, { tipo: 'dm-lascia' }).errore, 'chi ha aperto il tavolo può ridare il master all\'IA');
  assert.ok(g.dm == null && !g.attesaDM);
  await finoA(g, () => !g.attesaIA);
  // non nello stesso computer né in tempo reale, e non da soli
  const loc = G.crea({ n: 3, bot: [null, 'medio', null], opzioni: { stessoPc: 2 } });
  assert.ok(loc.azione(0, { tipo: 'dm-scegli', posto: 1 }).errore, 'chi gioca sul computer passato non fa il master');
  assert.ok(!loc.azione(0, { tipo: 'dm-scegli', posto: 2 }).errore, 'un amico col suo dispositivo sì');
  assert.ok(G.crea({ n: 2, bot: [null, null], opzioni: { modalita: 'reale', ambientazione: 'sevastopol' } }).azione(0, { tipo: 'dm-scegli', posto: 1 }).errore);
  assert.ok(G.crea({ n: 1, bot: [null], opzioni: {} }).azione(0, { tipo: 'dm-scegli', posto: 0 }).errore);
  // horror a turni: il master vede tutta la stazione e i segreti della creatura
  const h = G.crea({ n: 2, bot: [null, null], opzioni: { ambientazione: 'sevastopol' } });
  h.chiave = '';
  h.azione(1, { tipo: 'dm-scegli', posto: 1 });
  h.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
  h.azione(0, { tipo: 'inizia' });
  assert.strictEqual(h.fase, 'avventura'); assert.ok(h.attesaDM);
  const vd = h.vista(1), vg = h.vista(0);
  assert.strictEqual(vd.incubo.aree.length, h.cp.aree.length, 'il master vede tutti i settori');
  assert.ok(vg.incubo.aree.length < h.cp.aree.length, 'i giocatori solo quelli scoperti');
  assert.ok(/CREATURA/.test(vd.dmInfo.segreti) && vd.dmInfo.bestiario.length, 'segreti e bestiario dell\'ambientazione');
  // gli eventi horror del master: un settore vicino (anche chiuso: decide lui), rumore, oggetti della stazione
  const prima = h.incubo.area, dove = vd.incubo.strade[0].id;
  h.azione(1, { tipo: 'dm-rispondi', risposta: { narrazione: 'Avanzate.', eventi: [{ tipo: 'vai', area: dove, forza: true }, { tipo: 'rumore', quantita: 2 }, { tipo: 'oggetto', chi: 'tutti', id: vd.dmInfo.oggettiTema[0].id, n: 1 }] } });
  assert.ok(h.incubo.area === dove && dove !== prima, 'il gruppo cambia settore');
  assert.ok(h.incubo.rumore >= 2, 'il rumore sale');
  assert.ok(vd.dmInfo.chiaviTema.length, 'gli oggetti chiave della stazione');
  console.log(`✓ Draghi e Segrete col master umano: scelta al tavolo, richieste che aspettano lui, consigliere, bozza, IA al posto suo e in automatico, azioni libere, horror (${Date.now() - t0} ms)`);
})().catch((e) => { console.error(e); process.exit(1); });
