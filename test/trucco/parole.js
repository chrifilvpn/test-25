// Il trucco segreto nei giochi di parole, quiz e deduzione: la risposta giusta sussurrata al momento giusto.
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

// crea una partita con le opzioni predefinite (più quelle date)
function nuova(id, n, opzioni = {}, bot = []) {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  return mod.crea({ n, primo: 0, opzioni: opz, bot });
}
// arma il trucco e restituisce il suggerimento arrivato a quel posto (null se non è ancora il momento: resta armato)
function chiedi(g, posto) {
  if (!T.armato(g, posto)) T.arma(g, posto);
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g).filter((m) => m.posto === posto);
  if (!s.length) { assert.ok(T.armato(g, posto), 'senza suggerimento il trucco resta attivo'); return null; }
  assert.ok(!T.armato(g, posto), 'il suggerimento spegne il trucco');
  return s[0].testo;
}
const senzaEmoji = (t) => t.replace(/^\S+\s/, '');

// numero: al suo turno il numero segreto (non al turno degli altri)
{
  const g = nuova('numero', 2);
  assert.strictEqual(chiedi(g, 1), null);
  const t = chiedi(g, 0);
  assert.ok(t.includes(String(g.segreto)));
  g.azione(0, { tipo: 'prova', numero: g.segreto });
  assert.deepStrictEqual(g.risultato.vincitori, [0]);
}
// wordle: la parola segreta, e con quella si vince al primo colpo
{
  const g = nuova('wordle', 2);
  const t = chiedi(g, 0);
  assert.strictEqual(senzaEmoji(t), g.segreta.toUpperCase());
  g.azione(0, { tipo: 'prova', parola: senzaEmoji(t) });
  assert.ok(g.fatto[0].vinto && g.fatto[0].tentativi === 1);
}
// impiccato (niente computer): chi sceglie la parola non riceve niente, chi indovina sì e vince il giro
{
  const g = nuova('impiccato', 3);
  assert.strictEqual(g.boia, 0);
  assert.strictEqual(chiedi(g, 1), null, 'mentre si sceglie la parola niente');
  g.azione(0, { tipo: 'parola', parola: 'farfalla' });
  assert.strictEqual(chiedi(g, 0), null, 'chi l\'ha scelta non ne ha bisogno');
  delete g._win[0];
  assert.strictEqual(g.turno, 1);
  const t = chiedi(g, 1);
  assert.strictEqual(senzaEmoji(t), 'FARFALLA');
  g.azione(1, { tipo: 'prova', parola: senzaEmoji(t) });
  assert.strictEqual(g.esitoRound.esito, 'indovinata');
  assert.strictEqual(g.esitoRound.chi, 1);
}
// impostore (niente computer): all'impostore la parola, agli altri il nome dell'impostore
{
  const g = nuova('impostore', 4);
  g.nomiGiocatori = ['Anna', 'Bruno', 'Carla', 'Dario'];
  const imp = g.impostore, altro = (imp + 1) % 4;
  assert.ok(chiedi(g, imp).includes(g.parola.toUpperCase()));
  assert.ok(chiedi(g, altro).includes(g.nomiGiocatori[imp]));
  // senza nomi (es. nei test) dice il numero del posto
  const h = nuova('impostore', 3);
  assert.ok(chiedi(h, (h.impostore + 1) % 3).includes(`giocatore ${h.impostore + 1}`));
}
// coccodrillo: per tutta la bocca chi ha il trucco non viene morso (in due: vince sempre)
for (let k = 0; k < 300; k++) {
  const m = GIOCHI.coccodrillo;
  const g = nuova('coccodrillo', 2, { passo: k % 2 ? 'si' : 'no' });
  if (k % 3 === 0) g.turno = 1;
  T.arma(g, 0);
  for (let i = 0; i < 40 && !g.finita; i++) { const p = g.turno; g.azione(p, m.bot(g, p, 'medio')); }
  assert.ok(g.finita && !T.armato(g, 0));
  assert.deepStrictEqual(g.risultato.vincitori, [0], 'il posto 0 non viene morso');
  assert.strictEqual(g.premuti.filter(Boolean).length <= 13, true);
}
// angolo: la misura giusta finché non ha risposto
{
  const g = nuova('angolo', 2);
  g.azione(1, { tipo: 'stima', gradi: 10 });
  assert.strictEqual(chiedi(g, 1), null);
  delete g._win[1];
  assert.strictEqual(senzaEmoji(chiedi(g, 0)), `${g.angolo}°`);
}
// mensola: solo quando si risponde; l'ordine giusto ripiano per ripiano, o l'oggetto cambiato
{
  const g = nuova('mensola', 2, { modo: 'ordine' });
  assert.strictEqual(chiedi(g, 0), null, 'mentre si guarda niente');
  g.fineFase = 0; g.controllaTempo();
  const t = senzaEmoji(chiedi(g, 0));
  const ordine = t.split(/ \/ |, /);
  assert.deepStrictEqual(ordine, g.mensola);
  g.azione(0, { tipo: 'ordine', ordine });
  g.azione(1, { tipo: 'ordine', ordine: g.mescolati });
  assert.strictEqual(g.ultimiPunti[0], g.k + 2);
  const h = nuova('mensola', 2, { modo: 'cambiato' });
  h.fineFase = 0; h.controllaTempo(); h.fineFase = 0; h.controllaTempo();
  assert.strictEqual(h.fase, 'rispondi');
  const ogg = senzaEmoji(chiedi(h, 0)).replace('Tocca: ', '');
  h.azione(0, { tipo: 'cambiato', posto: h.dopo.indexOf(ogg) });
  h.azione(1, { tipo: 'cambiato', posto: 0 });
  assert.strictEqual(h.ultimiPunti[0], 3);
}
// disegna: chi disegna niente; chi indovina riceve la parola (dopo la scelta) e indovina
{
  const g = nuova('disegna', 3);
  assert.strictEqual(g.disegnatore, 0);
  assert.strictEqual(chiedi(g, 1), null, 'parola non ancora scelta');
  g.azione(0, { tipo: 'scegli', i: 1 });
  assert.strictEqual(chiedi(g, 0), null);
  delete g._win[0];
  const t = senzaEmoji(chiedi(g, 1));
  assert.strictEqual(t, g.parola.toUpperCase());
  g.leggiChat(1, t.toLowerCase());
  assert.notStrictEqual(g.indovinato[1], null);
}
// differenze: il numero del disegno diverso
{
  const g = nuova('differenze', 2);
  const t = chiedi(g, 0);
  assert.ok(t.includes(`n° ${g.diversa + 1}`));
}
// bandiere, capitali, monumenti, sagome, quiz: la risposta giusta, e scegliendola è giusta
for (const id of ['bandiere', 'capitali', 'monumenti', 'sagome', 'quiz']) {
  const g = nuova(id, 2, {}, [null, null]);
  const t = senzaEmoji(chiedi(g, 0));
  const E = g.banca.elementi;
  assert.strictEqual(t, E[g.giusta].nome, id);
  const scelta = g.opzioni.findIndex((i) => E[i].nome === t);
  g.azione(0, { tipo: 'risposta', scelta });
  assert.ok(g.risposte[0].giusto, id);
  assert.strictEqual(chiedi(g, 0), null, `${id}: dopo la risposta niente`);
}
// anno: l'anno giusto, e rispondendo fa 100 punti
{
  const g = nuova('anno', 2, {}, [null, null]);
  const t = senzaEmoji(chiedi(g, 0));
  const anno = /a\.C\./.test(t) ? -parseInt(t, 10) : parseInt(t, 10);
  assert.strictEqual(anno, g.e.anno);
  g.azione(0, { tipo: 'anno', anno });
  g.azione(1, { tipo: 'anno', anno: 1 });
  assert.strictEqual(g.esito.punti[0], 100);
}
// anagrammi: le soluzioni più lunghe non ancora trovate dalla squadra, tutte accettate
{
  const g = nuova('anagrammi', 2, {}, [null, null]);
  const parole = senzaEmoji(chiedi(g, 0)).toLowerCase().split(', ');
  assert.ok(parole.length >= 1 && parole.length <= 4);
  for (const w of parole) assert.ok(g.azione(0, { tipo: 'prova', parola: w }).ok, w);
  const lunghe = [...g.parole].map((x) => x.parola.length).sort((a, b) => b - a).slice(0, parole.length);
  assert.deepStrictEqual(parole.map((w) => w.length).sort((a, b) => b - a), lunghe);
}
// codenames: all'agente le parole della sua squadra, al capitano un indizio valido
{
  const g = nuova('codenames', 4, {}, [null, null, null, null]);
  const sq = g.sq, cap = g.capitani[sq], agente = g.agenti(sq)[0], avv = g.capitani[1 - sq];
  assert.strictEqual(chiedi(g, avv), null, 'non al turno dell\'altra squadra');
  delete g._win[avv];
  assert.strictEqual(chiedi(g, agente), null, 'l\'agente aspetta l\'indizio');
  delete g._win[agente];
  const ind = senzaEmoji(chiedi(g, cap)).split(' ');
  assert.ok(g.azione(cap, { tipo: 'indizio', parola: ind[0].toLowerCase(), numero: Number(ind[1]) }).ok, 'indizio valido');
  const mie = senzaEmoji(chiedi(g, agente)).toLowerCase().split(', ');
  const attese = g.parole.filter((w, i) => g.mappa[i] === sq).map((w) => w.toLowerCase());
  assert.deepStrictEqual(mie.sort(), attese.sort());
}
// connessioni: i gruppi che mancano (i più difficili), e provandoli sono giusti
{
  const g = nuova('connessioni', 2, {}, [null, null]);
  const gruppi = senzaEmoji(chiedi(g, 0)).split(' / ').map((x) => x.split(' '));
  assert.strictEqual(gruppi.length, 3);
  assert.ok(!gruppi.some((x) => g.gruppoDi[x[0]] === g.gruppi.findIndex((y) => y.livello === 0)), 'il giallo viene da sé');
  for (const parole of gruppi) g.azione(0, { tipo: 'prova', parole });
  assert.ok(g.giocatori[0].fatto.vinto && g.giocatori[0].errori === 0);
}
// nomicose: una risposta valida (negli elenchi) per ogni categoria
{
  const g = nuova('nomicose', 2, {}, [null, null]);
  const D = require('../../giochi2/nomicose-dati');
  const t = chiedi(g, 0);
  const icone = Object.fromEntries(g.cats.map((c) => [D.CATEGORIE[c].icona, c]));
  let quante = 0;
  for (const c of g.cats) {
    const ic = D.CATEGORIE[c].icona;
    const i = t.indexOf(`${ic} `);
    if (i < 0) continue;
    const resto = t.slice(i + ic.length + 1);
    const fine = Math.min(...Object.keys(icone).map((x) => resto.indexOf(`  ${x}`)).filter((x) => x >= 0), resto.length);
    const w = resto.slice(0, fine);
    assert.strictEqual(D.SET[c].has(D.normalizza(w)), true, `${c}: ${w}`);
    assert.strictEqual(D.normalizza(w)[0], g.lettera);
    quante++;
  }
  assert.ok(quante >= g.cats.length - 1, 'quasi tutte le categorie');
}
// paroliere: le parole più lunghe della griglia, tutte accettate
{
  const g = nuova('paroliere', 2, {}, [null, null]);
  const parole = senzaEmoji(chiedi(g, 0)).toLowerCase().split(', ');
  assert.strictEqual(parole.length, 5);
  assert.deepStrictEqual(parole, g.tutte.slice(0, 5));
  for (const w of parole) assert.ok(g.azione(0, { tipo: 'parola', parola: w }).ok, w);
}
// catena: al suo turno una parola che la catena accetta
for (let k = 0; k < 20; k++) {
  const g = nuova('catena', 2, { lettere: k % 2 ? 'una' : 'due' });
  assert.strictEqual(chiedi(g, 1), null);
  delete g._win[1];
  const w = senzaEmoji(chiedi(g, 0)).toLowerCase();
  assert.ok(g.azione(0, { tipo: 'parola', testo: w }).ok, w);
}
// alieno: all'equipaggio il nome dell'Alieno; all'Alieno l'eliminazione subito pronta
{
  const g = nuova('alieno', 5);
  g.fase = 'gioco';
  g.nomiGiocatori = ['Anna', 'Bruno', 'Carla', 'Dario', 'Elia'];
  const a = g.e.find((e) => e.alieno).id, u = g.e.find((e) => !e.alieno).id;
  assert.ok(chiedi(g, u).includes(g.nomiGiocatori[a]));
  assert.ok(g.e[a].prontoUccidi > 0);
  assert.ok(chiedi(g, a).startsWith('🗡️'));
  assert.strictEqual(g.e[a].prontoUccidi, 0);
}
console.log('✓ Trucco nei giochi di parole e quiz: numero, wordle, impiccato, impostore, coccodrillo, angolo, mensola, disegna, differenze, bandiere, capitali, monumenti, sagome, quiz, anno, anagrammi, codenames, connessioni, nomicose, paroliere, catena, alieno');
