// ASSO PIGLIATUTTO: la scopa con le carte napoletane in cui l'asso, giocato, prende tutte le carte in tavola.
// Carte napoletane da 40: semi denari (d), coppe (c), spade (s), bastoni (b); rango 1..7, 8 = fante, 9 = cavallo,
// 10 = re (il rango è anche il valore per le prese). Da 2 a 4 giocatori (in 4 a coppie, con chi sta di fronte).
// Opzioni: si vince a 11/21/31, asso su asso (prende solo l'asso o tutto), presa con l'asso che vale scopa, napola.
const { mescola, casuale } = require('../giochi/carte');

const SEMI = ['d', 'c', 's', 'b'];
const NOMI_SEMI = { d: 'denari', c: 'coppe', s: 'spade', b: 'bastoni' };
const NOMI_RANGHI = { 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' };
const PRIMIERA = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };
const SETTEBELLO = '7d';

function mazzo40() {
  const m = [];
  for (const s of SEMI) for (let r = 1; r <= 10; r++) m.push({ id: `${r}${s}`, rango: r, seme: s });
  return m;
}
const nomeCarta = (c) => `${NOMI_RANGHI[c.rango] || c.rango} di ${NOMI_SEMI[c.seme]}`;

// tutte le combinazioni di almeno due carte del tavolo che sommano v
function combinazioni(tavolo, v) {
  const out = [];
  const rec = (i, somma, scelte) => {
    if (somma === v) { if (scelte.length >= 2) out.push(scelte.slice()); return; }
    for (let j = i; j < tavolo.length; j++) {
      const x = tavolo[j].rango;
      if (somma + x <= v) { scelte.push(tavolo[j].id); rec(j + 1, somma + x, scelte); scelte.pop(); }
    }
  };
  rec(0, 0, []);
  return out;
}

// Prese possibili giocando "carta". L'asso prende tutto il tavolo; se in tavola c'è già un asso, con la regola
// "solo" prende solo un asso (con "tutto" prende comunque tutto). Le altre carte come nella scopa: la carta dello
// stesso valore è obbligatoria, altrimenti una somma.
function presePossibili(carta, tavolo, assoSuAsso = 'solo') {
  if (!tavolo.length) return [];
  if (carta.rango === 1) {
    const assi = tavolo.filter((c) => c.rango === 1);
    if (assi.length && assoSuAsso === 'solo') return assi.map((c) => [c.id]);
    return [tavolo.map((c) => c.id)];
  }
  const singole = tavolo.filter((c) => c.rango === carta.rango);
  if (singole.length) return singole.map((c) => [c.id]);
  return combinazioni(tavolo, carta.rango);
}
// la presa è un "piglia tutto" dell'asso (che di solito non vale scopa)?
const pigliaTutto = (carta, presi) => carta.rango === 1 && !(presi.length === 1 && presi[0].rango === 1);

const stessoInsieme = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// napola: asso, 2 e 3 di denari = 3 punti, più uno per ogni denaro successivo in fila (4, 5, …); tutti i 10 = 10
function napola(prese) {
  const d = new Set(prese.filter((c) => c.seme === 'd').map((c) => c.rango));
  if (!(d.has(1) && d.has(2) && d.has(3))) return 0;
  let k = 3;
  while (d.has(k + 1)) k++;
  return k;
}

function contaSmazzata(prese, scope, conNapola) {
  return prese.map((pr, f) => {
    const migliori = SEMI.map((s) => Math.max(0, ...pr.filter((c) => c.seme === s).map((c) => PRIMIERA[c.rango])));
    return {
      carte: pr.length,
      denari: pr.filter((c) => c.seme === 'd').length,
      settebello: pr.some((c) => c.id === SETTEBELLO),
      primiera: migliori.every((x) => x > 0) ? migliori.reduce((a, b) => a + b, 0) : 0,
      napola: conNapola ? napola(pr) : 0,
      scope: scope[f],
      punti: 0,
    };
  });
}
// indice dell'unico massimo, -1 se pari o nessuno
function unico(valori) {
  const m = Math.max(...valori);
  if (m <= 0) return -1;
  return valori.filter((x) => x === m).length === 1 ? valori.indexOf(m) : -1;
}

class AssoPiglia {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'assopiglia';
    this.n = n;
    this.aSquadre = n === 4;
    this.nFazioni = this.aSquadre ? 2 : n;
    this.obiettivo = [11, 21, 31].includes(Number(opzioni.punti)) ? Number(opzioni.punti) : 11;
    this.assoSuAsso = opzioni.assoSuAsso === 'tutto' ? 'tutto' : 'solo';
    this.scopaAsso = opzioni.scopaAsso === true || opzioni.scopaAsso === 'true';
    this.conNapola = !(opzioni.napola === false || opzioni.napola === 'false');
    this.totali = new Array(this.nFazioni).fill(0);
    this.mazziere = (primo - 1 + n) % n;
    this.nSmazzata = 0;
    this.nEv = 0;
    this.evento = null;
    this.finita = false;
    this.risultato = null;
    this.nuovaSmazzata();
  }

  fazione(p) { return this.aSquadre ? p % 2 : p; }
  postiFazione(f) { return this.aSquadre ? [f, f + 2] : [f]; }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovaSmazzata() {
    this.mazziere = (this.mazziere + 1) % this.n;
    for (;;) {
      this.mazzo = mescola(mazzo40());
      this.tavolo = this.mazzo.splice(-4);
      // un asso in tavola all'inizio (o tre re) e si rimescola: l'asso deve arrivare in mano a qualcuno
      if (!this.tavolo.some((c) => c.rango === 1) && this.tavolo.filter((c) => c.rango === 10).length < 3) break;
    }
    this.mani = Array.from({ length: this.n }, () => []);
    this.distribuisci();
    this.prese = Array.from({ length: this.nFazioni }, () => []);
    this.scope = new Array(this.nFazioni).fill(0);
    this.ultimaPresa = null;
    this.uscite = []; // carte giocate in questa smazzata, in ordine (le vedono tutti)
    this.turno = (this.mazziere + 1) % this.n; // gioca per primo chi sta dopo il mazziere
    this.fase = 'gioco';
    this.inAttesa = false;
    this.inCorso = null;
    this.riepilogo = null;
    this.pausaMs = 1300;
  }

  distribuisci() {
    const da = (this.mazziere + 1) % this.n;
    for (let g = 0; g < 3; g++) for (let i = 0; i < this.n; i++) this.mani[(da + i) % this.n].push(this.mazzo.pop());
  }

  opzioniDi(p) {
    const o = {};
    for (const c of this.mani[p]) o[c.id] = presePossibili(c, this.tavolo, this.assoSuAsso);
    return o;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta un attimo' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'gioca') return { errore: 'Mossa non valida' };
    const mano = this.mani[p];
    const i = mano.findIndex((c) => c.id === a.carta);
    if (i < 0) return { errore: 'Non hai questa carta' };
    const carta = mano[i];
    const opzioni = presePossibili(carta, this.tavolo, this.assoSuAsso);
    const scelta = Array.isArray(a.presa) ? a.presa.map(String) : [];
    let presa = null;
    if (opzioni.length) {
      if (scelta.length) presa = opzioni.find((o) => stessoInsieme(o, scelta));
      else if (opzioni.length === 1) presa = opzioni[0];
      if (!presa) return { errore: opzioni.length > 1 && !scelta.length ? 'Scegli quali carte prendere' : 'Questa presa non è valida' };
    } else if (scelta.length) return { errore: 'Con questa carta non puoi prendere nulla' };

    mano.splice(i, 1);
    this.uscite.push(carta.id);
    if (!presa) {
      this.tavolo.push(carta);
      this.passa(p);
      return { ok: true };
    }
    // la presa resta in vista un attimo prima di essere raccolta
    this.inCorso = { posto: p, carta, presa };
    this.inAttesa = true;
    this.turno = null;
    this.pausaMs = 1300;
    return { ok: true };
  }

  avanza() {
    if (this.fase === 'riepilogo') { if (!this.finita) this.nuovaSmazzata(); return; }
    if (!this.inCorso) return;
    const { posto: p, carta, presa } = this.inCorso;
    this.inCorso = null;
    const presi = this.tavolo.filter((c) => presa.includes(c.id));
    this.tavolo = this.tavolo.filter((c) => !presa.includes(c.id));
    const f = this.fazione(p);
    this.prese[f].push(carta, ...presi);
    this.ultimaPresa = p;
    const ultimaGiocata = this.mazzo.length === 0 && this.mani.every((m) => m.length === 0);
    const tutto = pigliaTutto(carta, presi);
    if (this.tavolo.length === 0 && !ultimaGiocata && (!tutto || this.scopaAsso)) {
      this.scope[f]++;
      this.annuncia(p, tutto ? 'piglia tutto con l\'asso: scopa!' : 'fa scopa!', tutto ? 'pigli tutto con l\'asso: scopa!' : 'fai scopa!', true);
    } else if (tutto && presi.length >= 3) {
      this.annuncia(p, `piglia tutto con l'asso (${presi.length} carte)`, `pigli tutto con l'asso: ${presi.length} carte!`);
    }
    this.inAttesa = false;
    this.passa(p);
  }

  passa(p) {
    if (this.mani.every((m) => m.length === 0)) {
      if (this.mazzo.length) { this.distribuisci(); this.turno = (p + 1) % this.n; } else this.fineSmazzata();
    } else this.turno = (p + 1) % this.n;
  }

  fineSmazzata() {
    // le carte rimaste in tavola vanno a chi ha preso per ultimo
    if (this.tavolo.length && this.ultimaPresa != null) this.prese[this.fazione(this.ultimaPresa)].push(...this.tavolo);
    const avanzo = this.tavolo.length;
    this.tavolo = [];
    const righe = contaSmazzata(this.prese, this.scope, this.conNapola);
    const assegnati = {
      carte: unico(righe.map((r) => r.carte)),
      denari: unico(righe.map((r) => r.denari)),
      settebello: righe.findIndex((r) => r.settebello),
      primiera: unico(righe.map((r) => r.primiera)),
    };
    for (const k of Object.keys(assegnati)) if (assegnati[k] >= 0) righe[assegnati[k]].punti++;
    righe.forEach((r, f) => { r.punti += r.scope + r.napola; this.totali[f] += r.punti; r.totale = this.totali[f]; r.posti = this.postiFazione(f); });
    this.nSmazzata++;
    this.riepilogo = { righe, assegnati, smazzata: this.nSmazzata, avanzo, ultimaPresa: this.ultimaPresa, napola: this.conNapola };
    const max = Math.max(...this.totali);
    // tutta la napola (i 10 denari) vince subito la partita
    const napolaPiena = righe.findIndex((r) => r.napola === 10);
    if (napolaPiena >= 0 || (max >= this.obiettivo && this.totali.filter((t) => t === max).length === 1)) {
      const fv = napolaPiena >= 0 ? napolaPiena : this.totali.indexOf(max);
      this.finita = true;
      if (napolaPiena >= 0) this.annuncia(this.postiFazione(fv)[0], 'fa napola piena e vince!', 'napola piena: vinci!', true);
      this.risultato = {
        fazioni: this.totali.map((t, f) => ({ posti: this.postiFazione(f), punti: t })),
        etichetta: 'punti', pareggio: false, vincitori: this.postiFazione(fv),
      };
    }
    this.fase = 'riepilogo';
    this.turno = null;
    this.inAttesa = !this.finita;
    this.pausaMs = 14000;
  }

  vista(p) {
    const mioTurno = this.turno === p && !this.inAttesa;
    return {
      gioco: this.id, n: this.n, aSquadre: this.aSquadre,
      mano: this.mani[p] || [],
      carteInMano: this.mani.map((m) => m.length),
      tavolo: this.tavolo,
      inCorso: this.inCorso ? { posto: this.inCorso.posto, carta: this.inCorso.carta, presa: this.inCorso.presa } : null,
      opzioni: mioTurno ? this.opzioniDi(p) : null,
      mazzo: this.mazzo.length,
      assiUsciti: this.uscite.filter((id) => id[0] === '1' && id[1] !== '0').length,
      turno: this.turno, inAttesa: this.inAttesa, fase: this.fase, mazziere: this.mazziere,
      preseCarte: this.prese.map((x) => x.length),
      preseDenari: this.prese.map((x) => x.filter((c) => c.seme === 'd').length),
      settebello: this.prese.findIndex((x) => x.some((c) => c.id === SETTEBELLO)),
      scope: this.scope, totali: this.totali, obiettivo: this.obiettivo,
      assoSuAsso: this.assoSuAsso, scopaAsso: this.scopaAsso, conNapola: this.conNapola,
      riepilogo: this.riepilogo, pausaMs: this.pausaMs,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// valore delle carte prese: una per la carta, denari, settebello, carte buone per la primiera
function valoreCarte(cs, conNapola) {
  let s = 0;
  for (const c of cs) {
    s += 1;
    if (c.seme === 'd') { s += 1; if (conNapola && c.rango <= 3) s += 1.2; }
    if (c.id === SETTEBELLO) s += 7;
    if (c.rango === 7) s += 2.5;
    else if (c.rango === 6) s += 1.2;
    else if (c.rango === 1) s += 0.8;
  }
  return s;
}
const SCOPA = 12;

// mosse possibili di una mano: ogni carta con ogni presa (o senza presa)
function mosseDi(mano, tavolo, assoSuAsso) {
  const out = [];
  for (const c of mano) {
    const op = presePossibili(c, tavolo, assoSuAsso);
    if (op.length) for (const o of op) out.push({ carta: c, presa: o });
    else out.push({ carta: c, presa: [] });
  }
  return out;
}
// guadagno immediato di una mossa e tavolo che resta
function effetto(g, m, ultima) {
  if (!m.presa.length) return { s: -valoreCarte([m.carta], g.conNapola) * 0.6, dopo: [...g.tavolo, m.carta], presi: [] };
  const presi = g.tavolo.filter((t) => m.presa.includes(t.id));
  const dopo = g.tavolo.filter((t) => !m.presa.includes(t.id));
  let s = valoreCarte([m.carta, ...presi], g.conNapola);
  if (!dopo.length && !ultima && (!pigliaTutto(m.carta, presi) || g.scopaAsso)) s += SCOPA;
  return { s, dopo, presi };
}
// il miglior guadagno che un avversario con "mano" può fare sul tavolo "tav"
function miglioreRisposta(g, mano, tav) {
  let best = 0;
  for (const c of mano) {
    for (const o of presePossibili(c, tav, g.assoSuAsso)) {
      const presi = tav.filter((t) => o.includes(t.id));
      let s = valoreCarte([c, ...presi], g.conNapola);
      if (presi.length === tav.length && (!pigliaTutto(c, presi) || g.scopaAsso)) s += SCOPA;
      if (s > best) best = s;
    }
  }
  return best;
}

function bot(g, p, livello) {
  const mano = g.mani[p];
  const mosse = mosseDi(mano, g.tavolo, g.assoSuAsso);
  const comeAzione = (m) => ({ tipo: 'gioca', carta: m.carta.id, presa: m.presa });
  if (livello === 'facile') {
    // prende quando capita, a caso tra le prese; non pensa a cosa lascia in tavola
    const prese = mosse.filter((m) => m.presa.length);
    return comeAzione(prese.length && Math.random() < 0.7 ? casuale(prese) : casuale(mosse));
  }
  const ultima = g.mazzo.length === 0 && g.mani.reduce((s, m) => s + m.length, 0) === 1;
  const prossimo = (p + 1) % g.n;
  const nProssimo = g.mani[prossimo].length;

  if (livello === 'medio') {
    // goloso, con un'idea semplice del pericolo: lasciare poche carte basse (scopa facile) o il settebello
    let best = null, bv = -Infinity;
    for (const m of mosse) {
      const e = effetto(g, m, ultima);
      let s = e.s;
      if (!ultima && e.dopo.length) {
        const somma = e.dopo.reduce((x, c) => x + c.rango, 0);
        if (somma <= 10 && e.dopo.length <= 2) s -= 7;
        if (e.dopo.some((c) => c.id === SETTEBELLO)) s -= 4;
        s -= e.dopo.length >= 4 ? 2 : 0; // tavolo ricco: un asso avversario lo prenderebbe tutto
      }
      // non sprecare l'asso su un tavolo povero
      if (m.carta.rango === 1 && m.presa.length && e.presi.length <= 1 && !ultima) s -= 3;
      s += Math.random() * 1.2;
      if (s > bv) { bv = s; best = m; }
    }
    return comeAzione(best);
  }

  // DIFFICILE: per ogni mossa guarda la risposta migliore dell'avversario che gioca dopo, su tante mani possibili
  // costruite con le carte che non ha visto (mazzo e mani degli altri), e tiene conto degli assi ancora in giro.
  const viste = new Set([...mano.map((c) => c.id), ...g.tavolo.map((c) => c.id), ...g.uscite]);
  const ignote = mazzo40().filter((c) => !viste.has(c.id));
  const compagno = g.aSquadre ? (p + 2) % g.n : -1;
  const campioni = [];
  const K = process.env.TEST_VELOCE ? 24 : 60;
  if (!ultima && nProssimo > 0 && ignote.length >= nProssimo) {
    for (let k = 0; k < K; k++) {
      const a = ignote.slice();
      for (let i = 0; i < nProssimo; i++) { const j = i + Math.floor(Math.random() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
      campioni.push(a.slice(0, nProssimo));
    }
  }
  const assiFuori = ignote.filter((c) => c.rango === 1).length;
  let best = null, bv = -Infinity;
  for (const m of mosse) {
    const e = effetto(g, m, ultima);
    let s = e.s;
    if (campioni.length && prossimo !== compagno) {
      let r = 0;
      for (const h of campioni) r += miglioreRisposta(g, h, e.dopo);
      s -= (r / campioni.length) * 0.9;
    }
    // l'asso in mano vale oro finché ce ne sono altri in giro: si tiene per un tavolo ricco
    if (m.carta.rango === 1 && !ultima) {
      const valoreTavolo = valoreCarte(g.tavolo, g.conNapola);
      if (m.presa.length && e.presi.length >= 1 && valoreTavolo < 6 && mano.length > 1) s -= 2.5;
      if (!m.presa.length) s -= assiFuori ? 3 : 1; // asso buttato su tavolo vuoto: l'avversario lo riprende con un asso
    }
    // alla fine della smazzata l'ultima presa porta via il resto
    if (g.mazzo.length === 0 && m.presa.length) s += 0.3 * valoreCarte(e.dopo, g.conNapola) / Math.max(1, g.mani.reduce((x, mm) => x + mm.length, 0));
    if (s > bv) { bv = s; best = m; }
  }
  return comeAzione(best);
}

module.exports = {
  meta: {
    id: 'assopiglia',
    nome: 'Asso pigliatutto',
    tipo: 'carte',
    giocatori: [2, 3, 4],
    descrizione: 'La scopa con le carte napoletane dove l\'asso prende tutte le carte in tavola. Con la napola dei denari.',
    alias: ['asso piglia tutto', 'asso pigliatutto', 'scopa d\'assi', 'asso prende tutto', 'carte napoletane', 'napola'],
    opzioni: [
      { id: 'punti', nome: 'Si vince a', valori: [11, 21, 31], predefinito: 11 },
      { id: 'assoSuAsso', nome: 'Se in tavola c\'è un asso', valori: ['solo', 'tutto'], etichette: ['L\'asso prende solo l\'asso', 'L\'asso prende tutto lo stesso'], predefinito: 'solo' },
      { id: 'scopaAsso', nome: 'Pigliatutto con l\'asso', valori: [false, true], etichette: ['Non vale scopa', 'Vale scopa'], predefinito: false },
      { id: 'napola', nome: 'Napola', valori: [true, false], etichette: ['Sì', 'No'], predefinito: true },
    ],
    regole: [
      'Si gioca con le 40 carte napoletane: denari, coppe, spade e bastoni, dall\'asso al 7 più fante (vale 8), cavallo (9) e re (10). In 2 o 3 ognuno per sé, in 4 a coppie con chi sta di fronte.',
      'Ognuno riceve 3 carte e 4 vanno scoperte in tavola (se tra queste c\'è un asso, o tre re, si rimescola). Finite le carte in mano se ne danno altre 3, finché il mazzo non finisce.',
      'A turno si gioca una carta: si prende la carta dello stesso valore in tavola, oppure più carte la cui somma fa il valore giocato. Se c\'è la carta uguale si deve prendere quella; se si può prendere, la presa è obbligatoria. Se le prese possibili sono più di una scegli tu toccando le carte in tavola.',
      'L\'ASSO PIGLIA TUTTO: giocando un asso prendi tutte le carte in tavola. Se in tavola c\'è già un asso, l\'asso giocato prende solo quello (oppure tutto lo stesso, se si sceglie così prima di iniziare). Su tavola vuota l\'asso resta in tavola.',
      'Se prendi tutte le carte in tavola fai scopa (1 punto). La presa di tutto con l\'asso di solito NON vale scopa (si può cambiare nelle opzioni); la scopa con l\'ultima carta della smazzata non conta.',
      'A fine smazzata le carte rimaste in tavola vanno a chi ha preso per ultimo. Punti: 1 a chi ha più carte, 1 a chi ha più denari, 1 per il settebello (7 di denari), 1 per la primiera, più le scope. In caso di parità il punto non si assegna.',
      'Primiera: per ogni seme si conta la carta migliore (7 = 21, 6 = 18, asso = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12, figure = 10). Serve almeno una carta per seme; vince la somma più alta.',
      'NAPOLA (se attiva): chi ha preso asso, 2 e 3 di denari fa 3 punti, più uno per ogni denaro successivo in fila (con anche il 4 sono 4, con 4 e 5 sono 5…). La napola piena, tutti i 10 denari, vince subito la partita.',
      'Vince chi arriva per primo a 11 punti (o 21, 31). Se due arrivano pari si gioca un\'altra smazzata.',
      'Il computer facile prende quando capita, senza pensare a cosa lascia; il medio sceglie la presa più ricca e cerca di non lasciare scope facili; il difficile, per ogni carta, immagina tante mani possibili dell\'avversario (con le carte che non ha ancora visto) e gioca quella che gli lascia meno; tiene gli assi per i tavoli ricchi finché ce ne sono altri in giro.',
    ],
  },
  crea: (o) => new AssoPiglia(o),
  bot,
  _test: { presePossibili, combinazioni, contaSmazzata, napola, unico, mazzo40, nomeCarta, pigliaTutto },
};
