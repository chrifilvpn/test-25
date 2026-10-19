// Scopa e scopone scientifico: stesse regole di presa e di conteggio, cambia la distribuzione.
const { mazzo40, mescola, valore40, casuale, SEMI } = require('./carte');
const T = require('./trucco');

const PRIMIERA = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 11: 10, 12: 10, 13: 10 };

// Tutte le combinazioni di almeno due carte del tavolo che sommano v
function combinazioni(tavolo, v) {
  const out = [];
  const rec = (i, somma, scelte) => {
    if (somma === v) { if (scelte.length >= 2) out.push(scelte.slice()); return; }
    for (let j = i; j < tavolo.length; j++) {
      const x = valore40(tavolo[j]);
      if (somma + x <= v) { scelte.push(tavolo[j].id); rec(j + 1, somma + x, scelte); scelte.pop(); }
    }
  };
  rec(0, 0, []);
  return out;
}

// Prese possibili con una carta: se c'è una carta uguale si deve prendere quella (presa singola obbligatoria)
// quindici = scopa 15: si prendono le carte che, sommate alla carta giocata, fanno 15
function presePossibili(carta, tavolo, assoPigliaTutto, quindici = false) {
  if (quindici) {
    const t = 15 - valore40(carta);
    return [...tavolo.filter((c) => valore40(c) === t).map((c) => [c.id]), ...combinazioni(tavolo, t)];
  }
  if (assoPigliaTutto && carta.rango === 1) {
    const assi = tavolo.filter((c) => c.rango === 1);
    if (assi.length) return assi.map((c) => [c.id]);
    return tavolo.length ? [tavolo.map((c) => c.id)] : [];
  }
  const v = valore40(carta);
  const singole = tavolo.filter((c) => valore40(c) === v);
  if (singole.length) return singole.map((c) => [c.id]);
  return combinazioni(tavolo, v);
}

// il trucco segreto (!win): porta nella mano la prima carta che va bene, presa da una delle fonti (mazzo o mani degli
// altri), dando in cambio la carta peggiore tra quelle non da tenere: niente doppioni, il numero di carte non cambia
function prendiCarta(mano, fonti, vuoi, tieni, peggiore) {
  const gia = mano.find((c) => vuoi(c) && !tieni.has(c));
  if (gia) { tieni.add(gia); return gia; }
  const via = peggiore(mano.filter((c) => !tieni.has(c)));
  if (!via) return null;
  for (const f of fonti) {
    const i = f.findIndex(vuoi);
    if (i < 0) continue;
    const c = f[i];
    f[i] = via;
    mano[mano.indexOf(via)] = c;
    tieni.add(c);
    return c;
  }
  return null;
}

const stessoInsieme = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function contaSmazzata(prese, scope) {
  return prese.map((pr, f) => {
    const migliori = SEMI.map((s) => Math.max(0, ...pr.filter((c) => c.seme === s).map((c) => PRIMIERA[c.rango])));
    return {
      carte: pr.length,
      quadri: pr.filter((c) => c.seme === 'q').length,
      settebello: pr.some((c) => c.id === '7q'),
      primiera: migliori.every((x) => x > 0) ? migliori.reduce((a, b) => a + b, 0) : 0,
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

class Scopa {
  constructor({ n, primo = 0, opzioni = {}, variante = 'scopa' }) {
    this.id = variante;
    this.variante = variante;
    this.n = n;
    this.aSquadre = n === 4;
    this.nFazioni = this.aSquadre ? 2 : n;
    this.obiettivo = Number(opzioni.punti) || 11;
    this.quindici = variante === 'scopa' && opzioni.modo === 'quindici';
    // nella scopa 15 l'asso piglia tutto non c'è
    this.assoPigliaTutto = !this.quindici && (opzioni.assoPigliaTutto === true || opzioni.assoPigliaTutto === 'true');
    this.totali = new Array(this.nFazioni).fill(0);
    this.mazziere = (primo - 1 + n) % n;
    this.nSmazzata = 0;
    this.nEv = 0;
    this.evento = null;
    this.finita = false;
    this.risultato = null;
    this.pausaMs = 1300;
    this.nuovaSmazzata();
  }

  fazione(p) { return this.aSquadre ? p % 2 : p; }
  postiFazione(f) { return this.aSquadre ? [f, f + 2] : [f]; }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovaSmazzata() {
    const n = this.n;
    this.mazziere = (this.mazziere + 1) % n;
    const primo = (this.mazziere + 1) % n; // gioca per primo chi sta a destra del mazziere
    for (;;) {
      this.mazzo = mescola(mazzo40());
      this.tavolo = this.variante === 'scopone' ? [] : this.mazzo.splice(-4);
      // tre o quattro re in tavola all'inizio: si rimescola
      if (this.tavolo.filter((c) => c.rango === 13).length < 3) break;
    }
    this.mani = Array.from({ length: n }, () => []);
    this.distribuisci(this.variante === 'scopone' ? 10 : 3);
    this.prese = Array.from({ length: this.nFazioni }, () => []);
    this.scope = new Array(this.nFazioni).fill(0);
    this.ultimaPresa = null;
    this.turno = primo;
    this.fase = 'gioco';
    this.inAttesa = false;
    this.inCorso = null;
    this.riepilogo = null;
    this.pausaMs = 1300;
  }

  distribuisci(k) {
    const da = (this.mazziere + 1) % this.n;
    for (let g = 0; g < k; g++) for (let i = 0; i < this.n; i++) this.mani[(da + i) % this.n].push(this.mazzo.pop());
    for (let p = 0; p < this.n; p++) if (T.consuma(this, p)) this.truccaMano(p);
  }

  // il trucco segreto (!win): nella mano appena data arrivano le carte buone, prese dal mazzo o dalle mani appena
  // date agli avversari (in cambio delle carte peggiori): la carta che fa scopa con la tavola, il settebello, i 7
  truccaMano(p) {
    const mano = this.mani[p];
    const altri = this.mani.filter((m, q) => m !== mano && (!this.aSquadre || q % 2 !== p % 2));
    const fonti = [this.mazzo, ...altri];
    const tieni = new Set();
    const peggiore = (cs) => T.migliore(cs, (c) => -valoreCarte([c]));
    if (this.tavolo.length) {
      // con una carta sola si prende tutto il tavolo: scopa (se tocca a lui per primo, non può sfuggire)
      const fa = (c) => presePossibili(c, this.tavolo, this.assoPigliaTutto, this.quindici).some((o) => o.length === this.tavolo.length);
      prendiCarta(mano, fonti, fa, tieni, peggiore);
    }
    prendiCarta(mano, fonti, (c) => c.id === '7q', tieni, peggiore);
    const k = this.variante === 'scopone' ? 4 : 1; // nello scopone con 10 carte: anche gli altri 7 e un po' di quadri
    for (let i = 0; i < k; i++) prendiCarta(mano, fonti, (c) => c.rango === 7, tieni, peggiore);
    if (this.variante === 'scopone') for (let i = 0; i < 2; i++) prendiCarta(mano, fonti, (c) => c.seme === 'q', tieni, peggiore);
  }

  opzioniDi(p) {
    const o = {};
    for (const c of this.mani[p]) o[c.id] = presePossibili(c, this.tavolo, this.assoPigliaTutto, this.quindici);
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
    const opzioni = presePossibili(carta, this.tavolo, this.assoPigliaTutto, this.quindici);
    let presa = null;
    const scelta = Array.isArray(a.presa) ? a.presa.map(String) : [];
    if (opzioni.length) {
      if (scelta.length) presa = opzioni.find((o) => stessoInsieme(o, scelta));
      else if (opzioni.length === 1) presa = opzioni[0];
      if (!presa) return { errore: opzioni.length > 1 && !scelta.length ? 'Scegli quali carte prendere' : 'Questa presa non è valida' };
    } else if (scelta.length) return { errore: 'Con questa carta non puoi prendere nulla' };

    mano.splice(i, 1);
    if (!presa) {
      this.tavolo.push(carta);
      this.passa(p);
      return { ok: true };
    }
    // la presa resta visibile un attimo prima di essere raccolta
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
    const prese = this.tavolo.filter((c) => presa.includes(c.id));
    this.tavolo = this.tavolo.filter((c) => !presa.includes(c.id));
    const f = this.fazione(p);
    this.prese[f].push(carta, ...prese);
    this.ultimaPresa = p;
    const ultimaGiocata = this.mazzo.length === 0 && this.mani.every((m) => m.length === 0);
    const pigliaTutto = this.assoPigliaTutto && carta.rango === 1 && !prese.some((c) => c.rango === 1);
    // la scopa all'ultima giocata della smazzata non vale, e nemmeno quella dell'asso piglia tutto
    if (this.tavolo.length === 0 && !ultimaGiocata && !pigliaTutto) {
      this.scope[f]++;
      this.annuncia(p, 'fa scopa!', 'fai scopa!', true);
    }
    this.inAttesa = false;
    this.passa(p);
  }

  passa(p) {
    if (this.mani.every((m) => m.length === 0)) {
      if (this.mazzo.length) { this.distribuisci(3); this.turno = (p + 1) % this.n; }
      else this.fineSmazzata();
    } else this.turno = (p + 1) % this.n;
  }

  fineSmazzata() {
    // le carte rimaste in tavola vanno a chi ha preso per ultimo
    if (this.tavolo.length && this.ultimaPresa != null) this.prese[this.fazione(this.ultimaPresa)].push(...this.tavolo);
    const avanzo = this.tavolo.length;
    this.tavolo = [];
    const righe = contaSmazzata(this.prese, this.scope);
    const assegnati = {
      carte: unico(righe.map((r) => r.carte)),
      quadri: unico(righe.map((r) => r.quadri)),
      settebello: righe.findIndex((r) => r.settebello),
      primiera: unico(righe.map((r) => r.primiera)),
    };
    for (const k of Object.keys(assegnati)) if (assegnati[k] >= 0) righe[assegnati[k]].punti++;
    righe.forEach((r, f) => { r.punti += r.scope; this.totali[f] += r.punti; r.totale = this.totali[f]; r.posti = this.postiFazione(f); });
    this.nSmazzata++;
    this.riepilogo = { righe, assegnati, smazzata: this.nSmazzata, avanzo, ultimaPresa: this.ultimaPresa };

    const max = Math.max(...this.totali);
    if (max >= this.obiettivo && this.totali.filter((t) => t === max).length === 1) {
      const fv = this.totali.indexOf(max);
      this.finita = true;
      this.risultato = {
        fazioni: this.totali.map((t, f) => ({ posti: this.postiFazione(f), punti: t })),
        etichetta: 'punti',
        pareggio: false,
        vincitori: this.postiFazione(fv),
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
      gioco: this.id,
      n: this.n,
      aSquadre: this.aSquadre,
      mano: this.mani[p] || [],
      carteInMano: this.mani.map((m) => m.length),
      tavolo: this.tavolo,
      inCorso: this.inCorso ? { posto: this.inCorso.posto, carta: this.inCorso.carta, presa: this.inCorso.presa } : null,
      opzioni: mioTurno ? this.opzioniDi(p) : null,
      mazzo: this.mazzo.length,
      turno: this.turno,
      inAttesa: this.inAttesa,
      fase: this.fase,
      mazziere: this.mazziere,
      preseCarte: this.prese.map((x) => x.length),
      scope: this.scope,
      totali: this.totali,
      obiettivo: this.obiettivo,
      assoPigliaTutto: this.assoPigliaTutto, quindici: this.quindici,
      riepilogo: this.riepilogo,
      pausaMs: this.pausaMs,
      finita: this.finita,
      risultato: this.risultato,
      evento: this.evento,
    };
  }
}

// ---------- Computer ----------
const rangoDaValore = (v) => (v <= 7 ? v : v + 3);

function valoreCarte(cs) {
  let s = 0;
  for (const c of cs) {
    s += 1;
    if (c.seme === 'q') s += 1;
    if (c.id === '7q') s += 7;
    if (c.rango === 7) s += 2.5;
    else if (c.rango === 6) s += 1.2;
    else if (c.rango === 1) s += 0.8;
  }
  return s;
}

function bot(g, p, livello) {
  const mano = g.mani[p];
  const mosse = [];
  for (const c of mano) {
    const op = presePossibili(c, g.tavolo, g.assoPigliaTutto, g.quindici);
    if (op.length) for (const o of op) mosse.push({ carta: c, presa: o });
    else mosse.push({ carta: c, presa: [] });
  }
  const comeAzione = (m) => ({ tipo: 'gioca', carta: m.carta.id, presa: m.presa });
  if (livello === 'facile') {
    const prese = mosse.filter((m) => m.presa.length);
    return comeAzione(prese.length && Math.random() < 0.6 ? casuale(prese) : casuale(mosse));
  }

  const ultimaGiocata = g.mazzo.length === 0 && g.mani.reduce((s, m) => s + m.length, 0) === 1;
  // carte che non ho visto (in mano agli altri o nel mazzo)
  const viste = new Set([...mano, ...g.tavolo, ...g.prese.flat()].map((c) => c.id));
  const ignote = mazzo40().filter((c) => !viste.has(c.id));
  const prossimo = (p + 1) % g.n;
  const cartePross = Math.max(1, g.mani[prossimo].length - (g.mani[prossimo].length > 0 && prossimo !== p ? 0 : 0));

  const guadagno = (carta, tavolo) => {
    let best = 0;
    for (const o of presePossibili(carta, tavolo, g.assoPigliaTutto, g.quindici)) {
      const presi = tavolo.filter((t) => o.includes(t.id));
      let s = valoreCarte([carta, ...presi]);
      const pigliaTutto = g.assoPigliaTutto && carta.rango === 1 && !presi.some((c) => c.rango === 1);
      if (presi.length === tavolo.length && !pigliaTutto) s += 12;
      best = Math.max(best, s);
    }
    return best;
  };

  const rischio = (tavolo) => {
    if (!tavolo.length) return 0;
    if (livello === 'medio') {
      const somma = tavolo.reduce((s, c) => s + valore40(c), 0);
      let r = somma <= 10 ? 9 : 0;
      if (tavolo.some((c) => c.id === '7q')) r += 4;
      return r + tavolo.filter((c) => c.rango === 7).length;
    }
    // difficile: probabilità che l'avversario abbia una carta di quel valore, per quanto guadagnerebbe
    let r = 0;
    for (let v = 1; v <= 10; v++) {
      const k = ignote.filter((c) => valore40(c) === v && !tavolo.some((t) => t.id === c.id)).length;
      if (!k || !ignote.length) continue;
      const prob = 1 - Math.pow(1 - k / ignote.length, cartePross);
      const esempio = ignote.find((c) => valore40(c) === v) || { rango: rangoDaValore(v), seme: 'x', id: 'x' };
      r = Math.max(r, prob * guadagno(esempio, tavolo));
    }
    return r;
  };

  let migliore = null;
  let punteggio = -Infinity;
  for (const m of mosse) {
    let s;
    let tavoloDopo;
    if (m.presa.length) {
      const presi = g.tavolo.filter((t) => m.presa.includes(t.id));
      tavoloDopo = g.tavolo.filter((t) => !m.presa.includes(t.id));
      s = valoreCarte([m.carta, ...presi]);
      const pigliaTutto = g.assoPigliaTutto && m.carta.rango === 1 && !presi.some((c) => c.rango === 1);
      if (tavoloDopo.length === 0 && !ultimaGiocata && !pigliaTutto) s += 12;
    } else {
      tavoloDopo = [...g.tavolo, m.carta];
      s = -valoreCarte([m.carta]) * 0.6;
    }
    if (!ultimaGiocata) s -= rischio(tavoloDopo);
    if (livello === 'medio') s += Math.random() * 1.5;
    if (s > punteggio) { punteggio = s; migliore = m; }
  }
  return comeAzione(migliore);
}

const regoleComuni = [
  'Si gioca con 40 carte francesi: dall\'asso al 7 più fante, donna e re. L\'asso vale 1, il fante 8, la donna 9, il re 10.',
  'Giocando una carta si prende una carta dello stesso valore in tavola, oppure più carte la cui somma è uguale al valore giocato.',
  'Se in tavola c\'è una carta dello stesso valore bisogna prendere quella, non una somma. Se la carta giocata può prendere, la presa è obbligatoria.',
  'Se si prendono tutte le carte in tavola si fa scopa, che vale un punto. La scopa fatta con l\'ultima carta della smazzata non conta.',
  'A fine smazzata le carte rimaste in tavola vanno a chi ha preso per ultimo.',
  'Punti di ogni smazzata: uno per chi ha più carte, uno per chi ha più quadri (i denari), uno per il settebello (7 di quadri), uno per la primiera, più le scope. In caso di parità il punto non si assegna.',
  'Primiera: per ogni seme si conta la carta migliore (7 = 21, 6 = 18, asso = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12, figure = 10). Serve almeno una carta per seme.',
  'Vince chi arriva per primo ai punti stabiliti. Se due arrivano pari, si gioca un\'altra smazzata.',
];

module.exports = {
  scopa: {
    meta: {
      id: 'scopa',
      nome: 'Scopa',
      alias: ['scopa 15', 'scopa quindici', 'quindici', 'escoba'], // per la ricerca nella home
      giocatori: [2, 3, 4],
      descrizione: 'Prendi le carte con somme e uguaglianze, fai scopa e conquista il settebello.',
      opzioni: [
        { id: 'modo', nome: 'Modalità', valori: ['classica', 'quindici'], etichette: ['Scopa classica', 'Scopa 15'], predefinito: 'classica' },
        { id: 'punti', nome: 'Si vince a', valori: [11, 16, 21], predefinito: 11 },
        { id: 'assoPigliaTutto', nome: 'Asso piglia tutto', valori: [false, true], etichette: ['No', 'Sì'], predefinito: false },
      ],
      regole: [
        'Ognuno riceve 3 carte e 4 vanno scoperte in tavola (se ci sono tre o quattro re si rimescola). Finite le carte in mano se ne danno altre 3.',
        'Le carte in mano e in tavola sono in ordine di valore. Sulle figure c\'è un numerino in alto a destra con il loro valore: fante 8, donna 9, re 10.',
        ...regoleComuni,
        'Scopa 15 (si sceglie prima di iniziare, nella modalità): la presa cambia. Con la carta che giochi prendi una o più carte in tavola che, sommate alla tua, fanno esattamente 15 (per esempio un 7 prende un 8, oppure un 5 e un 3). Non vale la regola della carta uguale. Se puoi prendere devi prendere; se ci sono più prese possibili scegli tu. Tutto il resto (scope, punti, primiera, settebello) è uguale alla scopa classica. Nella scopa 15 l\'asso piglia tutto non si usa.',
        'Con "asso piglia tutto" l\'asso prende tutte le carte in tavola (non conta come scopa); se in tavola c\'è un asso, prende solo quello.',
        'In quattro si gioca in coppia con chi sta di fronte.',
      ],
    },
    crea: (o) => new Scopa({ ...o, variante: 'scopa' }),
    bot,
  },
  scopone: {
    meta: {
      id: 'scopone',
      nome: 'Scopone scientifico',
      giocatori: [4],
      descrizione: 'La scopa a coppie con tutte le carte in mano: 10 a testa, tavola vuota.',
      opzioni: [
        { id: 'punti', nome: 'Si vince a', valori: [11, 21], predefinito: 11 },
      ],
      regole: [
        'Si gioca in quattro, a coppie: il compagno è quello seduto di fronte.',
        'Si distribuiscono tutte le carte, 10 a testa, e la tavola parte vuota.',
        'Le carte in mano e in tavola sono in ordine di valore. Sulle figure c\'è un numerino in alto a destra con il loro valore: fante 8, donna 9, re 10.',
        ...regoleComuni,
      ],
    },
    crea: (o) => new Scopa({ ...o, variante: 'scopone' }),
    bot,
  },
  _test: { presePossibili, combinazioni, contaSmazzata, unico, prendiCarta },
};
