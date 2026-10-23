// TASTI IN ORDINE: a ogni round compare la stessa sequenza di 10 tasti per tutti. Si premono in ordine il più in fretta
// possibile: un tasto sbagliato vale +1 secondo (e bisogna comunque premere quello giusto). Vince il tempo totale più basso.
// In tempo reale: la partita ha tick(ora) e i tasti arrivano con input(posto, { k }). Il tempo lo misura il server.
const LETTERE = 'ASDFGHJKLQWERTYUIOPZXCVBNM';
const LUNGHEZZE = [10, 6, 15];
const ROUND = [5, 3, 8];
const VIA_MS = 3000, PAUSA_MS = 3500, MAX_MS = 30000, PENALITA_MS = 1000;
// velocità del computer: ms per tasto (media) e probabilità di sbagliare
const BOT = { facile: [720, 0.12], medio: [430, 0.06], difficile: [260, 0.025] };
const T = require('./trucco');

class Tasti {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'tasti';
    this.n = n;
    this.lunghezza = LUNGHEZZE.includes(Number(opzioni.lunghezza)) ? Number(opzioni.lunghezza) : 10;
    this.nRound = ROUND.includes(Number(opzioni.round)) ? Number(opzioni.round) : 5;
    this.bot = bot.slice();
    this.tickMs = 50;
    this.totali = new Array(n).fill(0);
    this.storico = [];
    this.round = 0;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
    this.nuovoRound(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) {
      // la pausa non conta: si spostano in avanti tutti gli orologi
      const d = Date.now() - this.pausaDal;
      this.inizio += d; this.fineFase += d;
      this.g.forEach((x) => { if (x.prossimo) x.prossimo += d; });
    }
    this.inPausa = si;
  }

  nuovoRound(ora) {
    this.round++;
    let s = '';
    while (s.length < this.lunghezza) { const c = LETTERE[Math.floor(Math.random() * LETTERE.length)]; if (c !== s[s.length - 1]) s += c; }
    this.sequenza = s;
    this.fase = 'via';
    this.inizio = ora + VIA_MS;
    this.fineFase = this.inizio + MAX_MS;
    this.g = Array.from({ length: this.n }, () => ({ idx: 0, errori: 0, tempo: null, prossimo: null }));
  }

  // un tasto premuto
  premi(p, k, ora) {
    const x = this.g[p];
    if (this.fase !== 'corsa' || !x || x.tempo !== null) return false;
    const giusto = String(k || '').toUpperCase() === this.sequenza[x.idx];
    if (T.armato(this, p)) x.win = true;
    if (!giusto) { if (!x.win) x.errori++; return false; } // col trucco segreto gli errori non costano
    x.idx++;
    if (x.idx >= this.sequenza.length) {
      x.tempo = ora - this.inizio + x.errori * PENALITA_MS;
      return true;
    }
    return false;
  }

  input(p, d) { if (!this.bot[p] && d && d.k) this.premi(p, d.k, Date.now()); }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    if (this.fase === 'via') {
      // il trucco segreto (!win): la sequenza in anteprima, solo a lui, durante il conto alla rovescia
      this.g.forEach((x, p) => { if (!x.win && T.armato(this, p)) { x.win = true; T.sussurra(this, p, `💡 ${this.sequenza.split('').join(' ')}`, Math.max(1500, this.inizio - ora)); } });
      if (ora < this.inizio) return false;
      this.fase = 'corsa';
      this.g.forEach((x, p) => { if (this.bot[p]) x.prossimo = ora + tempoBot(this.bot[p]) + 250; });
      return true;
    }
    if (this.fase === 'corsa') {
      let cambiato = false;
      this.g.forEach((x, p) => {
        const liv = this.bot[p];
        if (!liv || x.tempo !== null) return;
        while (x.prossimo && ora >= x.prossimo && x.tempo === null) {
          const sbaglia = Math.random() < BOT[liv][1];
          cambiato = this.premi(p, sbaglia ? 'ù' : this.sequenza[x.idx], x.prossimo) || cambiato;
          x.prossimo += tempoBot(liv) * (sbaglia ? 1.6 : 1);
        }
      });
      if (this.g.every((x) => x.tempo !== null) || ora >= this.fineFase) return this.fineRound(ora);
      return cambiato;
    }
    if (this.fase === 'pausa' && ora >= this.fineFase) {
      if (this.round >= this.nRound) { this.chiudi(); return true; }
      this.nuovoRound(ora);
      return true;
    }
    return false;
  }

  fineRound(ora) {
    this.g.forEach((x, p) => { if (x.win) T.consuma(this, p); }); // il trucco vale per questo round
    // chi non ha finito in 30 secondi prende 30 secondi più le penalità
    this.g.forEach((x) => { if (x.tempo === null) x.tempo = MAX_MS + x.errori * PENALITA_MS + (this.sequenza.length - x.idx) * PENALITA_MS; });
    this.g.forEach((x, p) => { this.totali[p] += x.tempo; });
    const tempi = this.g.map((x) => x.tempo);
    const migliore = tempi.indexOf(Math.min(...tempi));
    this.storico.push({ sequenza: this.sequenza, tempi, errori: this.g.map((x) => x.errori) });
    this.annuncia(migliore, `vince il round in ${(tempi[migliore] / 1000).toFixed(2)} s ⚡`, `round vinto in ${(tempi[migliore] / 1000).toFixed(2)} s ⚡`);
    this.fase = 'pausa';
    this.fineFase = ora + PAUSA_MS;
    return true;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    const min = Math.min(...this.totali);
    const v = this.totali.map((x, i) => (x === min ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.totali.map((x, i) => ({ posti: [i], punti: Number((x / 1000).toFixed(2)) })),
      etichetta: 'secondi', crescente: true, pareggio: v.length > 1, vincitori: this.n === 1 ? [0] : v.length > 1 ? [] : v,
    };
    if (this.n === 1) this.risultato.titolo = `Tempo totale: ${(this.totali[0] / 1000).toFixed(2)} s`;
  }

  vistaTick() {
    const ora = Date.now();
    return {
      fase: this.fase, round: this.round, pausa: this.inPausa,
      via: this.fase === 'via' ? Math.max(0, this.inizio - ora) : 0,
      t: this.fase === 'corsa' ? ora - this.inizio : 0,
      idx: this.g.map((x) => x.idx), errori: this.g.map((x) => x.errori), tempi: this.g.map((x) => x.tempo),
    };
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      lunghezza: this.lunghezza, nRound: this.nRound, penalita: PENALITA_MS, maxMs: MAX_MS,
      // la sequenza si vede solo quando parte la corsa
      sequenza: this.fase === 'via' ? null : this.sequenza, totali: this.totali, storico: this.storico, stato: this.vistaTick(), mio: p,
    };
  }
}
const tempoBot = (l) => BOT[l][0] * (0.7 + Math.random() * 0.6);

module.exports = {
  meta: {
    id: 'tasti',
    nome: 'Tasti in ordine',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Compare una sequenza di lettere: premile in ordine sulla tastiera più veloce degli altri.',
    alias: ['tastiera', 'velocità', 'digita', 'typing'],
    opzioni: [
      { id: 'lunghezza', nome: 'Tasti', valori: LUNGHEZZE, etichette: ['10 tasti', '6 tasti', '15 tasti'], predefinito: 10 },
      { id: 'round', nome: 'Round', valori: ROUND, etichette: ['5 round', '3 round', '8 round'], predefinito: 5 },
    ],
    regole: [
      'A ogni round compare una sequenza di lettere (10, oppure 6 o 15), la stessa per tutti. Prima c\'è un conto alla rovescia di 3 secondi.',
      'Premi le lettere in ordine sulla tastiera, il più velocemente possibile. Sul telefono compare una tastiera sullo schermo. Maiuscole e minuscole sono uguali.',
      'Se premi un tasto sbagliato hai 1 secondo di penalità e resti fermo sulla stessa lettera: devi premere quella giusta.',
      'Il tempo lo misura il server, dal via fino all\'ultima lettera giusta, più le penalità. Si vede la barra di avanzamento di tutti.',
      'Chi non finisce entro 30 secondi prende 30 secondi più 1 secondo per ogni lettera mancante e per ogni errore.',
      'Dopo 5 round (o 3, o 8) vince chi ha il tempo totale più basso. Si può giocare anche da soli, per migliorare il proprio tempo.',
      'Il gioco è in tempo reale: se qualcuno apre le dispense (Esc) si ferma per tutti e il tempo della pausa non conta.',
      'Il computer facile scrive piano e sbaglia spesso, il medio è un buon dattilografo, il difficile è velocissimo e quasi non sbaglia.',
    ],
  },
  crea: (o) => new Tasti(o),
  bot: () => ({}),
  _test: { LETTERE, PENALITA_MS },
};
