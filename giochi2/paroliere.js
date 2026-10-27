// PAROLIERE: una griglia di dadi con le lettere (4×4, o 5×5 con l'opzione), si lanciano e in 3 minuti si cercano più
// parole possibile collegando lettere vicine (anche in diagonale), senza usare due volte lo stesso dado. Tutti insieme,
// ognuno per conto suo: degli altri durante il round si vede solo quante parole hanno trovato. Alla fine si vedono le
// parole di tutti: quelle trovate da più giocatori (con l'opzione classica) non valgono. Punti per lunghezza.
// A SQUADRE (4, 6 o 8 giocatori, due squadre a posti alterni): i compagni cercano insieme sulla stessa griglia e
// vedono subito le parole degli altri della squadra (una parola vale una volta per squadra); con l'opzione classica
// si annullano le parole trovate da tutte e due le squadre.
// Le parole devono essere nel dizionario italiano del gioco (paroliere-dati.js: più di 330.000 parole, comprese tutte
// le forme flesse). I computer hanno un orologio loro (scadenza): trovano le parole un po' alla volta durante il round.
const D = require('./paroliere-dati');

// I DADI: lettere italiane bilanciate (tante vocali, la Q solo come "Qu" su un dado, niente J K W X Y).
// 16 dadi per la griglia 4×4; per la 5×5 se ne aggiungono altri 9.
const DADI4 = [
  ['a', 'e', 'i', 'o', 'n', 's'], ['a', 'e', 'i', 'o', 'u', 'r'], ['e', 'i', 'o', 'n', 'r', 't'], ['a', 'e', 'i', 'l', 'n', 's'],
  ['a', 'i', 'o', 'c', 'r', 't'], ['e', 'o', 'i', 'l', 's', 't'], ['a', 'e', 'o', 'n', 'r', 'c'], ['a', 'e', 'i', 't', 's', 'd'],
  ['e', 'i', 'o', 'l', 'n', 'p'], ['a', 'i', 'o', 'r', 'm', 'v'], ['a', 'e', 'o', 'c', 'p', 'd'], ['e', 'i', 'u', 'l', 'n', 'g'],
  ['a', 'i', 'o', 't', 's', 'g'], ['e', 'o', 'r', 't', 'l', 'v'], ['a', 'e', 'i', 'c', 'm', 'p'], ['qu', 'b', 'f', 'z', 'h', 'd'],
];
const DADI5 = [
  ...DADI4,
  ['a', 'e', 'i', 'o', 'u', 'a'], ['e', 'i', 'o', 'r', 's', 't'], ['a', 'e', 'n', 'l', 'r', 'c'], ['a', 'o', 'i', 's', 't', 'n'],
  ['e', 'i', 'o', 'm', 'p', 'c'], ['a', 'e', 'u', 'd', 'g', 'v'], ['e', 'i', 'o', 'n', 't', 'l'], ['a', 'i', 'o', 'r', 's', 'z'],
  ['e', 'a', 'i', 'b', 'f', 't'],
];
// punti per lunghezza (il "Qu" conta 2 lettere): 3-4 lettere 1 punto, 5 → 2, 6 → 3, 7 → 5, 8 o più → 11
const puntiDi = (w) => (w.length <= 4 ? 1 : w.length === 5 ? 2 : w.length === 6 ? 3 : w.length === 7 ? 5 : 11);
const PAUSA_RISULTATI = 75000; // dopo il round si leggono le parole: si va avanti quando tutti sono pronti (o dopo 75 s)

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// lancia i dadi: ogni dado in una casella a caso, con una faccia a caso
function lancia(lato) {
  const dadi = mescola([...(lato === 5 ? DADI5 : DADI4)]);
  return dadi.map((d) => d[Math.floor(Math.random() * 6)]);
}

// le caselle vicine (anche in diagonale)
const VICINI = {};
for (const lato of [4, 5]) {
  VICINI[lato] = Array.from({ length: lato * lato }, (_, i) => {
    const r = Math.floor(i / lato), c = i % lato, v = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < lato && cc >= 0 && cc < lato) v.push(rr * lato + cc);
    }
    return v;
  });
}

// la parola si può comporre sulla griglia? Restituisce il percorso (indici delle caselle) o null
function percorso(griglia, lato, w) {
  const usate = new Array(griglia.length).fill(false);
  const via = [];
  const cerca = (i, k) => {
    const f = griglia[i];
    if (!w.startsWith(f, k)) return false;
    usate[i] = true; via.push(i);
    const k2 = k + f.length;
    if (k2 === w.length) return true;
    for (const j of VICINI[lato][i]) if (!usate[j] && cerca(j, k2)) return true;
    usate[i] = false; via.pop();
    return false;
  };
  for (let i = 0; i < griglia.length; i++) if (cerca(i, 0)) return via;
  return null;
}

// TUTTE le parole della griglia (con almeno "minimo" lettere): visita con potatura sui prefissi del dizionario
function risolvi(griglia, lato, minimo = 3) {
  const trovate = new Set();
  const usate = new Array(griglia.length).fill(false);
  const visita = (i, pref) => {
    const p = pref + griglia[i];
    if (!D.prefisso(p)) return;
    if (p.length >= minimo && D.esiste(p)) trovate.add(p);
    if (p.length >= 16) return;
    usate[i] = true;
    for (const j of VICINI[lato][i]) if (!usate[j]) visita(j, p);
    usate[i] = false;
  };
  for (let i = 0; i < griglia.length; i++) visita(i, '');
  return [...trovate].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
}

class Paroliere {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'paroliere';
    this.n = n;
    this.lato = Number(opzioni.griglia) === 5 ? 5 : 4;
    this.durata = ([2, 3, 4].includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 3) * 60000;
    this.minimo = Number(opzioni.minimo) === 4 ? 4 : 3;
    this.doppieAnnullate = opzioni.doppie !== 'valgono';
    this.nRound = [1, 2, 3].includes(Number(opzioni.round)) ? Number(opzioni.round) : 1;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.aSquadre = opzioni.squadre === 'si' && n >= 4 && n % 2 === 0;
    this.squadra = Array.from({ length: n }, (_, i) => (this.aSquadre ? i % 2 : i));
    this.punti = new Array(n).fill(0);
    this.storico = []; // i round finiti: { griglia, parole: [[...]], punti: [...] }
    this.round = 0;
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 0;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoRound() {
    this.round++;
    // si rilancia finché la griglia non ha abbastanza parole (succede quasi sempre al primo colpo)
    let griglia, tutte;
    for (let k = 0; k < 30; k++) {
      griglia = lancia(this.lato);
      tutte = risolvi(griglia, this.lato, this.minimo);
      if (tutte.length >= (this.lato === 5 ? 60 : 30)) break;
    }
    this.griglia = griglia;
    this.tutte = tutte;
    this.parole = Array.from({ length: this.n }, () => []); // { w, ms } in ordine di scoperta
    this.finito = new Array(this.n).fill(false); // ha premuto "Ho finito"
    this.pronto = new Array(this.n).fill(false); // ha letto i risultati
    this.fase = 'gioco';
    this.inizio = Date.now();
    this.fine = this.inizio + this.durata;
    this.esitoRound = null;
    // i computer: le parole che "vedranno" e quando
    this.piano = this.bot.map((l) => (l ? pianoBot(this, l) : null));
  }

  // durante il round si aspettano le persone che non hanno finito; nei risultati quelle non ancora pronte
  attesi() {
    if (this.finita) return [];
    if (this.fase === 'gioco') return this.finito.map((f, i) => (!f && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
    return this.pronto.map((f, i) => (!f && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
  }

  scadenza() {
    if (this.finita) return null;
    if (this.fase === 'risultati') return this.fineRisultati;
    let t = this.fine;
    for (const pi of this.piano) if (pi && pi.length) t = Math.min(t, pi[0].ms + this.inizio);
    return t;
  }

  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    if (this.fase === 'risultati') {
      if (ora >= this.fineRisultati) { this.avanti(); return true; }
      return false;
    }
    let cambiato = false;
    for (let p = 0; p < this.n; p++) {
      const pi = this.piano[p];
      while (pi && pi.length && pi[0].ms + this.inizio <= Math.min(ora, this.fine)) {
        const x = pi.shift();
        this.aggiungi(p, x.w);
        cambiato = true;
      }
    }
    if (ora >= this.fine) { this.chiudiRound(); return true; }
    return cambiato;
  }

  // le parole della squadra di p (da soli o senza squadre: le sue), con chi le ha trovate, in ordine di scoperta
  diSquadra(p) {
    if (!this.aSquadre) return this.parole[p].map((x) => ({ ...x, chi: p }));
    const out = [];
    for (let q = 0; q < this.n; q++) if (this.squadra[q] === this.squadra[p]) for (const x of this.parole[q]) out.push({ ...x, chi: q });
    return out.sort((a, b) => a.ms - b.ms);
  }
  aggiungi(p, w) {
    // a squadre un computer non riporta una parola già trovata da un compagno
    if (this.aSquadre && this.diSquadra(p).some((x) => x.w === w)) return;
    this.parole[p].push({ w, ms: Date.now() - this.inizio });
    if (w.length >= 8 && this.n > 1) this.annuncia(p, `trova una parola da ${w.length} lettere! 🔥`, `parola da ${w.length} lettere! 🔥`);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (this.fase === 'risultati') {
      if (a.tipo !== 'pronto') return { errore: 'Il round è finito: guarda le parole e premi Avanti' };
      if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
      return { ok: true };
    }
    if (a.tipo === 'finito') {
      if (this.finito[p]) return { errore: 'Hai già finito' };
      this.finito[p] = true;
      if (!this.attesi().length) this.chiudiRound(true);
      return { ok: true };
    }
    if (a.tipo !== 'parola') return { errore: 'Mossa non valida' };
    if (this.finito[p]) return { errore: 'Hai già finito: aspetta gli altri' };
    if (Date.now() > this.fine + 1500) return { errore: 'Tempo scaduto!' };
    const w = D.normalizza(a.parola);
    if (w.length < this.minimo) return { errore: `Servono almeno ${this.minimo} lettere` };
    if (w.length > 25) return { errore: 'Parola troppo lunga' };
    const gia = this.diSquadra(p).find((x) => x.w === w);
    if (gia) return { errore: gia.chi === p ? `${w.toUpperCase()}: l'hai già trovata` : `${w.toUpperCase()}: l'ha già trovata un compagno` };
    if (!percorso(this.griglia, this.lato, w)) return { errore: `${w.toUpperCase()} non si può comporre sulla griglia (lettere vicine, ogni dado una volta)` };
    if (!D.esiste(w)) return { errore: `${w.toUpperCase()} non è nel dizionario italiano del gioco` };
    this.aggiungi(p, w);
    return { ok: true };
  }

  // chi è assente a lungo: durante il round ha finito, nei risultati è pronto
  salta(p) {
    if (this.finita) return;
    if (this.fase === 'gioco') { if (!this.finito[p]) { this.finito[p] = true; if (!this.attesi().length) this.chiudiRound(true); } }
    else if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
  }

  chiudiRound(prima = false) {
    if (this.fase !== 'gioco') return;
    // se le persone hanno finito prima del tempo, i computer completano quello che avrebbero trovato
    for (let p = 0; p < this.n; p++) {
      const pi = this.piano[p];
      while (pi && pi.length) this.aggiungi(p, pi.shift().w);
    }
    // quante squadre (o giocatori, senza squadre) hanno trovato ogni parola
    const quanti = {}, chi = {};
    this.parole.forEach((el, q) => { for (const x of el) { (chi[x.w] = chi[x.w] || new Set()).add(this.squadra[q]); quanti[x.w] = chi[x.w].size; } });
    const conta = this.doppieAnnullate && this.n > 1;
    const puntiRound = this.parole.map((el) => el.reduce((s, x) => s + (conta && quanti[x.w] > 1 ? 0 : puntiDi(x.w)), 0));
    puntiRound.forEach((x, p) => { this.punti[p] += x; });
    const puntiSquadre = this.aSquadre ? [0, 1].map((t) => puntiRound.reduce((s, x, q) => s + (this.squadra[q] === t ? x : 0), 0)) : null;
    const trovate = new Set(Object.keys(quanti));
    this.esitoRound = {
      prima,
      parole: this.parole.map((el) => el.map((x) => ({ w: x.w, punti: puntiDi(x.w), doppia: quanti[x.w] > 1 })).sort((a, b) => b.w.length - a.w.length || (a.w < b.w ? -1 : 1))),
      punti: puntiRound, puntiSquadre,
      totale: this.tutte.length,
      mancate: this.tutte.filter((w) => !trovate.has(w)).slice(0, 40).map((w) => ({ w, punti: puntiDi(w) })),
    };
    this.storico.push({ griglia: this.griglia, punti: puntiRound });
    this.piano = this.piano.map(() => null);
    this.fase = 'risultati';
    this.fineRisultati = Date.now() + PAUSA_RISULTATI;
    const migliore = Math.max(...puntiRound);
    const primi = puntiRound.map((x, i) => (x === migliore ? i : -1)).filter((i) => i >= 0);
    if (puntiSquadre) {
      const t = puntiSquadre[0] === puntiSquadre[1] ? null : puntiSquadre[0] > puntiSquadre[1] ? 0 : 1;
      if (t == null) this.annuncia(null, `Round pari: ${puntiSquadre[0]} a ${puntiSquadre[1]}`, '', true);
      else this.annuncia(t, `la sua squadra vince il round ${Math.max(...puntiSquadre)} a ${Math.min(...puntiSquadre)}`, `la tua squadra vince il round ${Math.max(...puntiSquadre)} a ${Math.min(...puntiSquadre)}! 🎉`, true);
    } else if (this.n > 1 && primi.length === 1) this.annuncia(primi[0], `vince il round con ${migliore} punti`, `round vinto con ${migliore} punti! 🎉`, true);
    else this.annuncia(null, prima ? 'Round finito' : '⏰ Tempo scaduto!', '', true);
  }

  // il trucco segreto (!win): durante il round gli sussurra le parole più lunghe della griglia che non ha ancora trovato
  suggerimentoWin(posto) {
    if (this.finita || this.fase !== 'gioco' || this.finito[posto]) return null;
    const gia = new Set(this.diSquadra(posto).map((x) => x.w));
    const lunghe = this.tutte.filter((w) => !gia.has(w)).slice(0, 5);
    return lunghe.length ? `🔠 ${lunghe.join(', ').toUpperCase()}` : null;
  }

  avanti() {
    if (this.fase !== 'risultati') return;
    if (this.round >= this.nRound) return this.chiudi();
    this.nuovoRound();
  }

  chiudi() {
    this.finita = true;
    if (this.aSquadre) {
      const fazioni = [0, 1].map((t) => { const posti = this.squadra.map((s, q) => (s === t ? q : -1)).filter((q) => q >= 0); return { posti, punti: posti.reduce((s, q) => s + this.punti[q], 0) }; });
      const pari = fazioni[0].punti === fazioni[1].punti;
      this.risultato = { fazioni, etichetta: 'punti', pareggio: pari, vincitori: pari ? [] : fazioni[fazioni[0].punti > fazioni[1].punti ? 0 : 1].posti };
      return;
    }
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti',
      pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 || v.length === 1 ? v : [],
    };
    if (this.n === 1) this.risultato.titolo = `${max} punti`;
  }

  vista(p) {
    const q = Number.isInteger(p) && p >= 0 && p < this.n ? p : 0;
    const gioco = this.fase === 'gioco';
    return {
      gioco: this.id, n: this.n, lato: this.lato, griglia: this.griglia, fase: this.fase, round: this.round, nRound: this.nRound,
      minimo: this.minimo, doppieAnnullate: this.doppieAnnullate, durata: this.durata,
      resta: gioco ? Math.max(0, this.fine - Date.now()) : 0,
      restaRisultati: !gioco && !this.finita ? Math.max(0, this.fineRisultati - Date.now()) : 0,
      mie: this.diSquadra(q).map((x) => x.w), mieChi: this.diSquadra(q).map((x) => x.chi),
      aSquadre: this.aSquadre, squadra: this.squadra,
      mioFinito: this.finito[q], mioPronto: this.pronto[q],
      // degli altri durante il round si vede solo quante parole hanno (e se hanno finito)
      altri: this.parole.map((el, i) => ({ quante: el.length, finito: this.finito[i], pronto: this.pronto[i] })),
      esito: gioco ? null : this.esitoRound,
      punti: this.punti, storico: this.storico.map((s) => s.punti),
      turno: null, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Il computer "vede" ogni parola della griglia con una probabilità che dipende dal livello, da quanto è comune la
// parola (fascia del dizionario) e dalla lunghezza. Le parole che vede le trova un po' alla volta nel round: prima
// quelle corte e comuni, poi le altre.
const VISTA = {
  //          rare  meno  comuni molto
  facile: [0.004, 0.03, 0.12, 0.3],
  medio: [0.025, 0.1, 0.28, 0.55],
  difficile: [0.09, 0.3, 0.6, 0.85],
};
function pianoBot(g, livello) {
  const V = VISTA[livello] || VISTA.medio;
  const scelte = [];
  for (const w of g.tutte) {
    let pr = V[D.fascia(w)];
    if (w.length >= 7) pr *= livello === 'difficile' ? 0.8 : 0.45;
    else if (w.length >= 5) pr *= livello === 'facile' ? 0.75 : 0.95;
    if (Math.random() < pr) scelte.push(w);
  }
  const T = g.durata;
  const piano = scelte.map((w) => {
    // le parole corte e comuni arrivano prima; il facile è più lento
    const peso = (w.length - 3) / 6 + (3 - D.fascia(w)) / 6;
    const lento = livello === 'facile' ? 0.15 : livello === 'medio' ? 0.08 : 0.03;
    const f = Math.min(0.97, lento + Math.random() * 0.6 + peso * 0.35);
    return { w, ms: Math.round(Math.max(2500, T * f)) };
  });
  return piano.sort((a, b) => a.ms - b.ms);
}

// il server lo chiama per una persona assente da molto (o per un computer messo al posto di chi è uscito): finisce
function bot(g) {
  return g.fase === 'risultati' ? { tipo: 'pronto' } : { tipo: 'finito' };
}

module.exports = {
  meta: {
    id: 'paroliere',
    squadreSala: { nomi: ['🅰️ Squadra A', '🅱️ Squadra B'], min: 4, pari: true, se: { squadre: ['si'] } },
    nome: 'Paroliere',
    tipo: 'tabellone',
    saltaAssenti: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Lancia i dadi delle lettere e trova più parole possibile collegando lettere vicine prima che finisca il tempo.',
    alias: ['boggle', 'ruzzle', 'paroliere', 'griglia di lettere', 'dadi lettere', 'trova parole', 'cerca parole'],
    opzioni: [
      { id: 'tempo', nome: 'Tempo', valori: [3, 2, 4], etichette: ['3 minuti', '2 minuti', '4 minuti'], predefinito: 3 },
      { id: 'griglia', nome: 'Griglia', valori: [4, 5], etichette: ['4×4 (16 dadi)', '5×5 (25 dadi)'], predefinito: 4 },
      { id: 'doppie', nome: 'Parole uguali', valori: ['annullate', 'valgono'], etichette: ['Trovate da più giocatori: non valgono (classico)', 'Valgono per tutti'], predefinito: 'annullate' },
      { id: 'minimo', nome: 'Lettere minime', valori: [3, 4], etichette: ['Almeno 3 lettere', 'Almeno 4 lettere'], predefinito: 3 },
      { id: 'squadre', nome: 'Squadre', valori: ['no', 'si'], etichette: ['Ognuno per sé', 'Due squadre (con 4, 6 o 8 giocatori)'], predefinito: 'no' },
      { id: 'round', nome: 'Round', valori: [1, 2, 3], etichette: ['1 round', '2 round', '3 round'], predefinito: 1 },
    ],
    regole: [
      'Si lanciano i dadi delle lettere: 16 in una griglia 4×4 (o 25 in una 5×5). Un dado ha la "Qu", che vale come due lettere.',
      'Hai 3 minuti (o 2, o 4) per trovare più parole italiane possibile, di almeno 3 lettere (o 4, con l\'opzione). Una parola si forma collegando lettere vicine, anche in diagonale, senza usare due volte lo stesso dado.',
      'Valgono tutte le parole del dizionario: nomi, aggettivi, verbi anche coniugati, plurali e femminili. Non valgono nomi propri, sigle e parole straniere poco comuni. Gli accenti non contano.',
      'Sul computer basta scrivere con la tastiera (senza cliccare da nessuna parte) e premere Invio, oppure trascinare il mouse sulle lettere: quando lasci il tasto la parola parte. Sul telefono trascini il dito o tocchi le lettere una dopo l\'altra. Esc o Canc cancellano la parola che stai scrivendo.',
      'Il gioco controlla subito la parola: se è nel dizionario ed è sulla griglia entra nel tuo elenco, altrimenti ti dice perché no. Degli altri vedi solo quante parole hanno trovato.',
      'Punti per lunghezza: 3 o 4 lettere 1 punto, 5 lettere 2, 6 lettere 3, 7 lettere 5, 8 o più lettere 11 punti.',
      'Alla fine del round si vedono le parole di tutti. Con l\'opzione classica le parole trovate da più di un giocatore si cancellano e non valgono per nessuno: conviene cercare quelle che gli altri non vedono. Si vedono anche le parole migliori che nessuno ha trovato (passa sopra una parola per vederla sulla griglia).',
      'A SQUADRE (con 4, 6 o 8 giocatori): due squadre a posti alterni. I compagni cercano insieme: ognuno vede subito le parole trovate dagli altri della squadra, e una parola vale una volta sola per squadra. Con l\'opzione classica si annullano le parole trovate da tutte e due le squadre. Vince la squadra con più punti.',
      'Si possono giocare 1, 2 o 3 round: vince chi ha più punti in totale. "Ho finito" chiude il tuo round prima del tempo (se finiscono tutti, il round finisce subito).',
      'Il computer trova le parole un po\' alla volta durante il round. Il facile ne trova poche e quasi solo corte e comuni; il medio ne trova un buon numero; il difficile ne trova tante, anche lunghe e rare.',
    ],
  },
  crea: (o) => new Paroliere(o),
  bot,
  _test: { DADI4, DADI5, lancia, percorso, risolvi, puntiDi, VICINI, VISTA, pianoBot },
};
