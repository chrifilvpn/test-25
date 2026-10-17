// ANAGRAMMI A SQUADRE: due squadre (posti pari contro posti dispari) hanno lo stesso mazzo di parole con le
// lettere mescolate. Chiunque della squadra può risolvere qualunque parola: quando un compagno ne trova una, è
// trovata per tutta la squadra (ci si divide il lavoro). Vale ogni parola italiana che usa tutte le lettere.
// Punti: tante quante le lettere, +3 alla squadra che la trova per prima, −2 per ogni lettera chiesta in aiuto.
// I computer risolvono le parole una dopo l'altra con tempi che dipendono dal livello e dalla lunghezza (scadenza).
const D = require('./paroliere-dati');

const TEST = !!process.env.TEST_VELOCE;
const PAUSA_FINE = TEST ? 50 : 40000;
const SQUADRE = ['Squadra Sole', 'Squadra Luna'];

// le parole del gioco: comuni, da 5 a 8 lettere, niente forme verbali poco adatte a un indovinello
const NO_FINALI = /(iamo|iate|ete|iano|ebbe|ebbero|arono|irono|erono|avano|evano|ivano|assero|essero|issero|ando|endo|rono|remo|rete)$/;
const PAROLE = D.dizionario().filter((w) => w.length >= 5 && w.length <= 8 && D.fascia(w) === 3 && /^[a-z]+$/.test(w) && !NO_FINALI.test(w));
const chiave = (w) => w.split('').sort().join('');

function mescola(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// le lettere mescolate: diverse dalla parola, non una parola anche loro, con almeno metà lettere spostate
function anagramma(w) {
  let m = w;
  for (let k = 0; k < 60; k++) {
    m = mescola(w.split('')).join('');
    const spostate = m.split('').filter((c, i) => c !== w[i]).length;
    if (m !== w && !D.esiste(m) && spostate >= Math.ceil(w.length / 2)) return m;
  }
  return m === w ? w.split('').reverse().join('') : m;
}
// il mazzo: parole di lunghezze varie (corte prima), senza due parole con le stesse lettere
function mazzo(n, gia = new Set()) {
  const scelte = [], chiavi = new Set();
  const per = { 5: [], 6: [], 7: [], 8: [] };
  for (const w of mescola(PAROLE.slice())) if (!gia.has(w)) per[w.length].push(w);
  const lunghezze = Array.from({ length: n }, (_, i) => 5 + Math.floor((i * 4) / n));
  for (const l of lunghezze) {
    const w = per[l].find((x) => !chiavi.has(chiave(x)) && !scelte.includes(x));
    if (!w) continue;
    scelte.push(w); chiavi.add(chiave(w));
  }
  return scelte.map((w) => ({ parola: w, lettere: anagramma(w), chiave: chiave(w) }));
}

// ---------------- computer ----------------
// secondi per lettera (oltre la terza) e probabilità di non trovarla proprio
const LIVELLI = {
  facile: { sec: 9, perde: 0.35 },
  medio: { sec: 5, perde: 0.14 },
  difficile: { sec: 2.6, perde: 0.03 },
};

class Anagrammi {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'anagrammi';
    this.n = n;
    this.nRound = [1, 2, 3].includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.nParole = [6, 8, 10].includes(Number(opzioni.parole)) ? Number(opzioni.parole) : 8;
    this.durata = ([2, 3, 4].includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 3) * 60000;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    // le squadre: posti pari e posti dispari (da soli una squadra sola)
    this.nSq = n === 1 ? 1 : 2;
    this.sq = Array.from({ length: n }, (_, i) => i % this.nSq);
    this.membri = Array.from({ length: this.nSq }, (_, s) => this.sq.map((x, i) => (x === s ? i : -1)).filter((i) => i >= 0));
    this.punti = new Array(this.nSq).fill(0);
    this.trovatePer = new Array(n).fill(0); // le parole trovate da ognuno (per i complimenti)
    this.usate = new Set();
    this.storico = [];
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
    this.parole = mazzo(this.nParole, this.usate);
    for (const x of this.parole) this.usate.add(x.parola);
    // per ogni squadra e parola: chi l'ha trovata, con che parola, quante lettere d'aiuto, i punti
    this.stato = Array.from({ length: this.nSq }, () => this.parole.map(() => ({ chi: null, come: null, aiuti: 0, punti: 0, prima: false })));
    this.fase = 'gioco';
    this.inizio = Date.now();
    this.fine = this.inizio + this.durata;
    this.pronto = new Array(this.n).fill(false);
    this.puntiRound = new Array(this.nSq).fill(0);
    // i computer: un ordine delle parole e quanto ci mettono per ognuna
    this.piano = this.bot.map((l) => {
      if (!l) return null;
      const L = LIVELLI[l] || LIVELLI.medio;
      let t = 2000;
      return mescola(this.parole.map((_, i) => i)).map((i) => {
        const w = this.parole[i].parola;
        const dur = Math.round((w.length - 3) * L.sec * 1000 * (0.55 + Math.random() * 1.1));
        t += dur;
        return { i, ms: t, dur, riesce: Math.random() >= L.perde };
      }).filter((x) => x.riesce);
    });
  }

  attesi() {
    if (this.finita) return [];
    if (this.fase === 'gioco') return [];
    return this.pronto.map((f, i) => (!f && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
  }

  scadenza() {
    if (this.finita) return null;
    if (this.fase === 'fine') return this.finePausa;
    let t = this.fine;
    for (const pi of this.piano) if (pi && pi.length) t = Math.min(t, this.inizio + pi[0].ms);
    return t;
  }

  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    if (this.fase === 'fine') { if (ora >= this.finePausa) { this.avanti(); return true; } return false; }
    let cambiato = false;
    for (let p = 0; p < this.n && this.fase === 'gioco'; p++) {
      const pi = this.piano[p];
      while (pi && pi.length && this.inizio + pi[0].ms <= Math.min(ora, this.fine) && this.fase === 'gioco') {
        const x = pi.shift();
        // se un compagno l'ha già trovata, il computer passa alla prossima (e recupera il tempo)
        if (this.stato[this.sq[p]][x.i].chi !== null) { const anticipo = Math.round(x.dur / 2); pi.forEach((y) => { y.ms -= anticipo; }); continue; }
        this.trova(p, x.i, this.parole[x.i].parola);
        cambiato = true;
      }
    }
    if (this.fase === 'gioco' && ora >= this.fine) { this.chiudiRound(); return true; }
    return cambiato;
  }

  trova(p, i, come) {
    const s = this.sq[p], st = this.stato[s][i];
    const w = this.parole[i].parola;
    const prima = this.nSq > 1 && this.stato.every((x, t) => t === s || x[i].chi === null);
    st.chi = p; st.come = come; st.prima = prima;
    st.punti = Math.max(1, w.length + (prima ? 3 : 0) - 2 * st.aiuti);
    this.punti[s] += st.punti;
    this.puntiRound[s] += st.punti;
    this.trovatePer[p]++;
    if (this.stato[s].every((x) => x.chi !== null)) {
      if (this.nSq > 1) this.annuncia(p, `${SQUADRE[s]} ha trovato tutte le parole! 🏁`, `la tua squadra le ha trovate tutte! 🏁`, true);
      if (this.stato.every((sq) => sq.every((x) => x.chi !== null))) this.chiudiRound(true);
    } else if (w.length >= 8) this.annuncia(p, `trova ${come.toUpperCase()} (${w.length} lettere) 🔥`, `${come.toUpperCase()}: ${w.length} lettere! 🔥`);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (this.fase === 'fine') {
      if (a.tipo !== 'pronto') return { errore: 'Il round è finito: premi Avanti' };
      if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
      return { ok: true };
    }
    const s = this.sq[p];
    if (a.tipo === 'aiuto') {
      const i = Number(a.i);
      const st = this.stato[s] && this.stato[s][i];
      if (!st) return { errore: 'Parola non valida' };
      if (st.chi !== null) return { errore: 'Questa parola l\'avete già trovata' };
      if (st.aiuti >= 2) return { errore: 'Al massimo due lettere d\'aiuto per parola' };
      st.aiuti++;
      return { ok: true };
    }
    if (a.tipo !== 'prova') return { errore: 'Mossa non valida' };
    if (Date.now() > this.fine + 1500) return { errore: 'Tempo scaduto!' };
    const w = D.normalizza(a.parola);
    if (w.length < 5) return { errore: 'Le parole hanno almeno 5 lettere' };
    const k = chiave(w);
    const libere = this.parole.map((x, i) => i).filter((i) => this.parole[i].chiave === k && this.stato[s][i].chi === null);
    if (!libere.length) {
      const gia = this.parole.findIndex((x, i) => x.chiave === k && this.stato[s][i].chi !== null);
      if (gia >= 0) return { errore: `${w.toUpperCase()}: l'avete già trovata` };
      return { errore: `${w.toUpperCase()} non usa le lettere di nessuna parola` };
    }
    // la parola giusta, o un'altra parola vera con le stesse lettere (con gli aiuti deve cominciare come l'aiuto)
    const i = libere.find((j) => this.parole[j].parola === w) ?? libere.find((j) => w.startsWith(this.parole[j].parola.slice(0, this.stato[s][j].aiuti)) && D.esiste(w));
    if (i === undefined) return { errore: `${w.toUpperCase()} non è nel dizionario italiano del gioco` };
    this.trova(p, i, w);
    return { ok: true };
  }

  salta(p) {
    if (this.fase === 'fine' && !this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
  }

  chiudiRound(tutte = false) {
    if (this.fase !== 'gioco') return;
    this.piano = this.piano.map(() => null);
    this.fase = 'fine';
    this.finePausa = Date.now() + PAUSA_FINE;
    this.storico.push(this.puntiRound.slice());
    const max = Math.max(...this.puntiRound);
    const v = this.puntiRound.map((x, s) => (x === max ? s : -1)).filter((s) => s >= 0);
    if (this.nSq === 1) this.annuncia(null, tutte ? 'Tutte trovate! 🏁' : '⏰ Tempo scaduto!', '', true);
    else if (v.length === 1) this.annuncia(null, `${SQUADRE[v[0]]} vince il round ${this.puntiRound[v[0]]} a ${this.puntiRound[1 - v[0]]}`, '', true);
    else this.annuncia(null, `Round pari, ${max} a ${max}`, '', true);
  }

  avanti() {
    if (this.fase !== 'fine') return;
    if (this.round >= this.nRound) return this.chiudi();
    this.nuovoRound();
  }

  chiudi() {
    this.finita = true;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, s) => (x === max ? s : -1)).filter((s) => s >= 0);
    this.risultato = {
      fazioni: this.membri.map((m, s) => ({ posti: m, punti: this.punti[s], nome: SQUADRE[s] })), etichetta: 'punti',
      pareggio: this.nSq > 1 && v.length > 1, vincitori: v.length === 1 ? this.membri[v[0]] : [],
    };
    if (this.nSq === 1) this.risultato.titolo = `${max} punti`;
  }

  vista(p) {
    const q = Number.isInteger(p) && p >= 0 && p < this.n ? p : 0;
    const s = this.sq[q];
    const gioco = this.fase === 'gioco';
    return {
      gioco: this.id, n: this.n, fase: this.fase, round: this.round, nRound: this.nRound, durata: this.durata,
      resta: gioco ? Math.max(0, this.fine - Date.now()) : 0,
      restaPausa: !gioco && !this.finita ? Math.max(0, this.finePausa - Date.now()) : 0,
      squadre: SQUADRE.slice(0, this.nSq), sq: this.sq, mia: s, punti: this.punti, puntiRound: this.puntiRound, storico: this.storico,
      // le parole: le lettere mescolate per tutti; la soluzione solo a chi l'ha trovata (o a fine round); l'aiuto
      parole: this.parole.map((x, i) => {
        const st = this.stato[s][i];
        return {
          lettere: x.lettere, n: x.parola.length,
          trovata: st.chi !== null, chi: st.chi, come: st.come, punti: st.punti, prima: st.prima,
          aiuto: x.parola.slice(0, st.aiuti),
          soluzione: st.chi !== null || !gioco ? x.parola : null,
          altre: this.stato.map((y, t) => (t === s ? null : y[i].chi !== null)).filter((y) => y !== null),
          // a fine round le risposte delle altre squadre
          perSquadra: gioco ? null : this.stato.map((y) => ({ chi: y[i].chi, come: y[i].come, punti: y[i].punti })),
        };
      }),
      trovate: this.stato.map((y) => y.filter((x) => x.chi !== null).length),
      pronto: this.pronto, trovatePer: this.trovatePer,
      turno: null, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

function bot(g) {
  return g.fase === 'fine' ? { tipo: 'pronto' } : null;
}

module.exports = {
  meta: {
    id: 'anagrammi',
    nome: 'Anagrammi a squadre',
    tipo: 'tabellone',
    saltaAssenti: true,
    giocatori: [1, 2, 4, 6, 8],
    descrizione: 'Due squadre, lo stesso mazzo di parole con le lettere mescolate: dividetevi il lavoro e rimettetele in ordine prima degli altri.',
    alias: ['anagrammi', 'anagramma', 'lettere mescolate', 'parole mescolate', 'riordina lettere', 'squadre parole'],
    opzioni: [
      { id: 'parole', nome: 'Parole', valori: [8, 6, 10], etichette: ['8 parole per round', '6 parole per round', '10 parole per round'], predefinito: 8 },
      { id: 'tempo', nome: 'Tempo', valori: [3, 2, 4], etichette: ['3 minuti', '2 minuti', '4 minuti'], predefinito: 3 },
      { id: 'round', nome: 'Round', valori: [3, 1, 2], etichette: ['3 round', '1 round', '2 round'], predefinito: 3 },
    ],
    regole: [
      'Si gioca in due squadre: Sole (1°, 3°, 5° e 7° posto al tavolo) contro Luna (2°, 4°, 6° e 8°). Da soli si gioca contro il tempo.',
      'A ogni round le due squadre hanno lo stesso mazzo di 8 parole (o 6, o 10) da 5 a 8 lettere, con le lettere mescolate. Ci sono 3 minuti (o 2, o 4).',
      'Chiunque della squadra può risolvere qualunque parola: basta scriverla e premere Invio, il gioco capisce da solo di quale si tratta. Quando un compagno ne trova una è trovata per tutta la squadra: conviene dividersi le parole.',
      'Vale anche un\'altra parola italiana che usa esattamente tutte le stesse lettere.',
      'Punti: una parola vale tante quante le sue lettere, +3 se la tua squadra la trova prima dell\'altra. Si può chiedere un aiuto (la prima lettera, poi la seconda): ogni lettera d\'aiuto toglie 2 punti a quella parola.',
      'Il round finisce allo scadere del tempo o quando entrambe le squadre hanno trovato tutto. Dell\'altra squadra si vede solo quali parole ha già trovato. Alla fine del round si vedono tutte le soluzioni.',
      'Vince la squadra con più punti dopo 3 round (o 1, o 2).',
      'Il computer facile ci mette tanto e molte parole non le trova; il medio è svelto; il difficile le trova quasi tutte in pochi secondi.',
    ],
  },
  crea: (o) => new Anagrammi(o),
  bot,
  _test: { PAROLE, anagramma, mazzo, chiave, LIVELLI, SQUADRE },
};
