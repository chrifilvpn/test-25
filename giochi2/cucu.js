// CUCÙ (Asso che corre): una carta coperta a testa, a turno la si tiene o la si scambia con quella di chi viene
// dopo; chi ha un re lo mostra ("cucù!") e blocca lo scambio. Il mazziere, per ultimo, può cambiarla con quella
// in cima al mazzo. Poi si scopre tutto: chi ha la carta più bassa perde una vita. Vince l'ultimo che resta.
const { mazzo40, mescola, casuale } = require('../giochi/carte');
const T = require('../giochi/trucco');

// valore della carta: asso 1 (la più bassa) … 7, fante 8, cavallo 9, re 10 (la più alta)
const valore = (c) => (c.rango <= 7 ? c.rango : c.rango - 3);
const re = (c) => c.rango === 13;
const NOMI_SEMI = { c: 'cuori', q: 'quadri', f: 'fiori', p: 'picche' };
const NOMI = { 1: 'asso', 11: 'fante', 12: 'cavallo', 13: 're' };
const nomeCarta = (c) => `${NOMI[c.rango] || c.rango} di ${NOMI_SEMI[c.seme]}`;
const TUTTE = mazzo40();

class Cucu {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'cucu';
    this.n = n;
    this.viteIniziali = Number(opzioni.vite) === 5 ? 5 : 3;
    this.vite = new Array(n).fill(this.viteIniziali);
    this.mazziere = (primo - 1 + n) % n;
    this.giro = 0;
    this.nEv = 0;
    this.nMosse = 0;
    this.evento = null;
    this.finita = false;
    this.risultato = null;
    this.eliminati = []; // in ordine di uscita
    this.nuovoGiro();
  }

  vivo(i) { return this.vite[i] > 0; }
  dopo(i) { for (let k = 1; k <= this.n; k++) { const j = (i + k) % this.n; if (this.vivo(j)) return j; } return i; }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoGiro() {
    this.giro++;
    this.mazziere = this.dopo(this.mazziere);
    this.mazzo = mescola(mazzo40());
    this.carte = new Array(this.n).fill(null);
    this.originali = new Array(this.n).fill(null);
    // l'ordine del giro: da chi è dopo il mazziere fino al mazziere
    this.ordine = [];
    for (let j = this.dopo(this.mazziere); ; j = this.dopo(j)) { this.ordine.push(j); if (j === this.mazziere) break; }
    for (const j of this.ordine) {
      // il trucco segreto (!win): arriva un re (cucù: nessuno può portargliela via), o la carta più alta rimasta
      if (T.consuma(this, j)) { const alta = T.migliore(this.mazzo, valore); T.inCima(this.mazzo, (c) => c === alta); }
      this.carte[j] = this.originali[j] = this.mazzo.pop();
    }
    this.k = 0;
    this.storia = []; // quello che hanno visto tutti: { posto, tipo: tiene|scambia|bloccato|cucu|mazzo, con }
    this.mostrati = []; // chi ha mostrato il re
    this.sa = Array.from({ length: this.n }, () => []); // per ognuno: carte di cui sa dove sono { posto, carta }
    this.scartata = null; // la carta lasciata dal mazziere se cambia col mazzo
    this.esito = null;
    this.ultimo = null;
    this.fase = 'scambi';
    this.inAttesa = false;
    this.pausaMs = 900;
    this.turno = null;
    this.daiTurno();
  }

  // il turno passa a ordine[k]; chi ha un re lo mostra e tiene (cucù!) senza bisogno di scegliere
  daiTurno() {
    const t = this.ordine[this.k];
    if (re(this.carte[t])) {
      if (!this.mostrati.includes(t)) this.mostrati.push(t);
      this.storia.push({ posto: t, tipo: 'cucu' });
      this.ultimo = { id: ++this.nMosse, tipo: 'cucu', da: t };
      this.annuncia(t, 'ha il re: cucù! 👑', 'hai il re: cucù! 👑', true);
      this.turno = null;
      this.inAttesa = true;
      this.pausaMs = 1300;
      return;
    }
    this.turno = t;
    this.inAttesa = false;
  }

  // ognuno sa dove sono le carte che ha visto: quando due si scambiano, le carte note si spostano con loro
  sposta(a, b) {
    for (const lista of this.sa) for (const x of lista) { if (x.posto === a) x.posto = b; else if (x.posto === b) x.posto = a; }
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa || this.fase !== 'scambi') return { errore: 'Aspetta un attimo' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || (a.tipo !== 'tieni' && a.tipo !== 'scambia')) return { errore: 'Mossa non valida' };
    const mia = this.carte[p];
    this.turno = null;
    this.inAttesa = true;
    if (a.tipo === 'tieni') {
      this.storia.push({ posto: p, tipo: 'tiene' });
      this.ultimo = { id: ++this.nMosse, tipo: 'tiene', da: p };
      this.annuncia(p, 'tiene la sua carta', 'tieni la tua carta');
      this.pausaMs = 650;
      return { ok: true };
    }
    if (p === this.mazziere) {
      // il mazziere cambia con la carta in cima al mazzo e se la tiene, qualunque sia (anche un re)
      const nuova = this.mazzo.pop();
      this.scartata = mia;
      this.carte[p] = nuova;
      this.storia.push({ posto: p, tipo: 'mazzo' });
      this.ultimo = { id: ++this.nMosse, tipo: 'mazzo', da: p };
      if (re(nuova)) {
        this.mostrati.push(p);
        this.annuncia(p, 'cambia col mazzo… e pesca un re! 👑', 'cambi col mazzo… e peschi un re! 👑', true);
      } else this.annuncia(p, 'cambia la carta col mazzo', 'cambi la carta col mazzo');
      this.pausaMs = 1100;
      return { ok: true };
    }
    const q = this.dopo(p);
    if (re(this.carte[q])) {
      // chi ha il re lo mostra e blocca lo scambio
      if (!this.mostrati.includes(q)) this.mostrati.push(q);
      this.storia.push({ posto: p, tipo: 'bloccato', con: q });
      this.ultimo = { id: ++this.nMosse, tipo: 'bloccato', da: p, a: q };
      this.evento = { id: ++this.nEv, posto: q, bersaglio: p, testo: 'ha il re: cucù! 👑 Lo scambio con @ salta', testoIo: 'hai il re: cucù! 👑 Lo scambio salta', testoTe: 'ha il re: cucù! 👑 Tieni la tua carta', forte: true };
      this.pausaMs = 1400;
      return { ok: true };
    }
    this.carte[p] = this.carte[q];
    this.carte[q] = mia;
    this.sposta(p, q);
    this.sa[p].push({ posto: q, carta: mia });
    this.sa[q].push({ posto: p, carta: this.carte[p] });
    this.storia.push({ posto: p, tipo: 'scambia', con: q });
    this.ultimo = { id: ++this.nMosse, tipo: 'scambia', da: p, a: q };
    this.evento = { id: ++this.nEv, posto: p, bersaglio: q, testo: 'scambia la carta con @', testoIo: 'scambi la carta con @', testoTe: 'scambia la carta con te', forte: false };
    this.pausaMs = 1100;
    return { ok: true };
  }

  avanza() {
    if (this.finita || !this.inAttesa) return;
    if (this.fase === 'scoperta') { this.nuovoGiro(); return; }
    this.k++;
    if (this.k < this.ordine.length) { this.daiTurno(); return; }
    this.scopri();
  }

  // si scoprono le carte: chi ha la più bassa perde una vita (tutti, se sono pari)
  scopri() {
    const vivi = this.ordine;
    const min = Math.min(...vivi.map((j) => valore(this.carte[j])));
    const perdenti = vivi.filter((j) => valore(this.carte[j]) === min);
    // se uscissero tutti insieme il giro non conta
    const annullato = vivi.every((j) => perdenti.includes(j) && this.vite[j] === 1);
    const usciti = [];
    if (!annullato) {
      for (const j of perdenti) { this.vite[j]--; if (!this.vite[j]) usciti.push(j); }
      this.eliminati.push(...usciti);
    }
    this.esito = { perdenti, minimo: min, annullato, usciti };
    this.fase = 'scoperta';
    this.turno = null;
    this.inAttesa = true;
    this.pausaMs = 4200;
    this.ultimo = { id: ++this.nMosse, tipo: 'scoperta' };
    const nomeMin = nomeCarta(this.carte[perdenti[0]]).split(' di ')[0];
    if (annullato) this.annuncia(null, 'Tutti con la stessa carta: il giro non conta');
    else if (perdenti.length === 1) this.annuncia(perdenti[0], `ha la carta più bassa (${nomeMin}): perde una vita${usciti.length ? ' ed è fuori!' : ''}`, `hai la carta più bassa (${nomeMin}): perdi una vita${usciti.length ? ' e sei fuori!' : ''}`, true);
    else this.annuncia(null, `Carta più bassa (${nomeMin}) per ${perdenti.length} giocatori: perdono una vita`, '', true);
    const rimasti = vivi.filter((j) => this.vivo(j));
    if (rimasti.length <= 1) {
      this.finita = true;
      this.inAttesa = false;
      const v = rimasti[0];
      // classifica: chi è uscito più tardi sta più in alto
      this.risultato = {
        fazioni: Array.from({ length: this.n }, (_, i) => ({ posti: [i], punti: this.vite[i] })),
        etichetta: 'vite', pareggio: false, vincitori: [v],
      };
    }
  }

  vista(p) {
    const scoperta = this.fase === 'scoperta' || this.finita;
    return {
      gioco: this.id,
      n: this.n,
      vite: this.vite,
      viteIniziali: this.viteIniziali,
      giro: this.giro,
      mazziere: this.mazziere,
      ordine: this.ordine,
      k: this.k,
      // si vedono: la propria carta, i re mostrati e, alla scoperta, tutte
      carte: this.carte.map((c, i) => (c && (i === p || scoperta || this.mostrati.includes(i)) ? c : null)),
      coperte: this.carte.map((c) => !!c),
      mostrati: this.mostrati,
      storia: this.storia,
      so: (this.sa[p] || []).filter((x) => x.posto !== p).map((x) => ({ posto: x.posto, carta: x.carta })),
      scartata: this.scartata,
      mazzo: this.mazzo.length,
      esito: scoperta ? this.esito : null,
      ultimo: this.ultimo,
      fase: this.fase,
      turno: this.turno,
      inAttesa: this.inAttesa,
      pausaMs: this.pausaMs,
      finita: this.finita,
      risultato: this.risultato,
      evento: this.evento,
    };
  }
}

// ======================= COMPUTER =======================
// probabilità che un giocatore "normale" scambi una carta di questo valore
const pScambia = (v) => 1 / (1 + Math.exp(2 * (v - 5.5)));

// Il difficile immagina tante volte le carte che non conosce (in modo coerente con quello che ha visto: le carte
// che gli sono passate per le mani, i re mostrati, chi ha tenuto e chi ha scambiato), gioca il resto del giro
// e sceglie la mossa con cui perde meno spesso.
function stimaDifficile(g, p) {
  const io = g.ordine.indexOf(p);
  const quante = process.env.TEST_VELOCE ? 60 : 260;
  // cosa so con certezza: la mia carta di partenza, quella che ho ora, quelle che ho visto passare, i re mostrati
  const fissi = new Map(); // slot (= posto che l'aveva all'inizio) -> carta
  fissi.set(p, g.originali[p]);
  // ripercorro il giro: tiene[x] = slot che x ha in mano
  const tiene = new Array(g.n).fill(-1);
  for (const j of g.ordine) tiene[j] = j;
  const decisioni = []; // { slot, tipo }
  for (const e of g.storia) {
    const j = e.posto;
    if (e.tipo === 'cucu') { fissi.set(tiene[j], g.carte[j]); continue; }
    if (e.tipo === 'mazzo') continue; // (succede solo dopo di me)
    decisioni.push({ slot: tiene[j], tipo: e.tipo === 'tiene' ? 'tiene' : 'scambia', chi: j });
    if (e.tipo === 'bloccato') fissi.set(tiene[e.con], g.carte[e.con]);
    if (e.tipo === 'scambia') { const t = tiene[j]; tiene[j] = tiene[e.con]; tiene[e.con] = t; }
  }
  fissi.set(tiene[p], g.carte[p]);
  for (const x of g.sa[p]) fissi.set(tiene[x.posto], x.carta);
  const noti = new Set([...fissi.values()].map((c) => c.id));
  if (g.scartata) noti.add(g.scartata.id);
  const pool = TUTTE.filter((c) => !noti.has(c.id));
  const tot = { tiene: 0, scambia: 0 }, perso = { tiene: 0, scambia: 0 };
  for (let s = 0; s < quante; s++) {
    const resto = mescola([...pool]);
    const val = new Map(fissi);
    let peso = 1;
    // le carte su cui qualcuno ha già deciso non erano re (altrimenti avrebbe fatto cucù)
    for (const d of decisioni) {
      if (!val.has(d.slot)) {
        const i = resto.findIndex((c) => !re(c));
        val.set(d.slot, resto.splice(i, 1)[0]);
      }
      if (d.chi !== p) { const pr = pScambia(valore(val.get(d.slot))); peso *= d.tipo === 'scambia' ? pr : 1 - pr; }
    }
    for (const j of g.ordine) if (!val.has(tiene[j])) val.set(tiene[j], resto.pop());
    if (!(peso > 1e-9)) continue;
    for (const mossa of ['tiene', 'scambia']) {
      const carte = new Array(g.n).fill(null);
      for (const j of g.ordine) carte[j] = val.get(tiene[j]);
      const mazzo = [...resto];
      const giocaUno = (j, scambia) => {
        if (re(carte[j]) || !scambia) return;
        if (j === g.mazziere) { carte[j] = mazzo.pop(); return; }
        const q = g.dopo(j);
        if (re(carte[q])) return;
        [carte[j], carte[q]] = [carte[q], carte[j]];
      };
      giocaUno(p, mossa === 'scambia');
      for (let k = io + 1; k < g.ordine.length; k++) {
        const j = g.ordine[k];
        giocaUno(j, Math.random() < pScambia(valore(carte[j])));
      }
      const min = Math.min(...g.ordine.map((j) => valore(carte[j])));
      tot[mossa] += peso;
      if (valore(carte[p]) === min) perso[mossa] += peso;
    }
  }
  if (!tot.tiene) return null;
  const rischio = { tiene: perso.tiene / tot.tiene, scambia: perso.scambia / tot.scambia };
  return rischio;
}

function bot(g, p, livello) {
  const c = g.carte[p];
  if (re(c)) return { tipo: 'tieni' };
  const v = valore(c);
  if (livello === 'facile') return { tipo: casuale(['tieni', 'scambia']) };
  const q = g.dopo(p);
  const reAccanto = p !== g.mazziere && g.mostrati.includes(q);
  if (livello === 'medio') return { tipo: v <= 5 && !reAccanto ? 'scambia' : 'tieni' };
  if (reAccanto) return { tipo: 'tieni' };
  const s = stimaDifficile(g, p);
  if (!s) return { tipo: v <= 5 ? 'scambia' : 'tieni' };
  return { tipo: s.scambia < s.tiene - 0.005 ? 'scambia' : 'tieni' };
}

module.exports = {
  meta: {
    id: 'cucu',
    nome: 'Cucù (Asso che corre)',
    tipo: 'carte',
    giocatori: [3, 4, 5, 6, 7, 8],
    alias: ['cucu', 'cucù', 'asso che corre', 'stu', 'cuccù', 'gnao', 'ciapa no'],
    descrizione: 'Una carta a testa: la tieni o la passi a chi viene dopo? Chi resta con la più bassa perde una vita.',
    opzioni: [
      { id: 'vite', nome: 'Vite', valori: [3, 5], predefinito: 3 },
    ],
    regole: [
      'Si gioca con le 40 carte. Ognuno ha 3 vite (o 5, se scelto prima di iniziare). Il mazziere cambia a ogni giro.',
      'A ogni giro il mazziere dà una carta coperta a testa: ognuno vede solo la sua.',
      'A turno, partendo da chi è dopo il mazziere, ognuno decide se tenere la sua carta o scambiarla con quella del giocatore successivo (che non può rifiutare).',
      'Chi ha un re lo mostra subito: "cucù!". Se qualcuno voleva scambiare con lui, lo scambio salta e resta con la sua carta. Chi ha il re non scambia mai.',
      'Il mazziere decide per ultimo: può tenere la sua carta o cambiarla con quella in cima al mazzo, e deve tenere quella che pesca (anche se è un re).',
      'Poi si scoprono tutte le carte. Valori: asso 1 (la più bassa), poi 2, 3 … 7, fante 8, cavallo 9, re 10 (la più alta). Chi ha la carta più bassa perde una vita; se sono in più con la stessa carta più bassa, perdono tutti. Se dovessero uscire tutti insieme, il giro non conta.',
      'Chi finisce le vite è fuori. Vince l\'ultimo che resta in gioco.',
      'Sul tavolo vedi le carte che sai dove sono: se scambi, sai chi ha la tua vecchia carta; se ti passano una carta, sai che chi te l\'ha data ha la tua.',
      'Il computer: il facile decide a caso; il medio scambia quando ha una carta fino al 5; il difficile ragiona sulle carte che ha visto in quel giro (cosa gli è passato per le mani, i re mostrati, chi ha tenuto e chi ha scambiato) e sulla sua posizione, e sceglie la mossa con cui rischia meno.',
    ],
  },
  crea: (o) => new Cucu(o),
  bot,
  _test: { valore, pScambia, stimaDifficile },
};
