// GUESS THE ANGLE: a ogni round compare un angolo e tutti, insieme e in segreto, stimano quanti gradi misura
// (oppure, nella variante "Costruisci", ruotano un lato per formare l'angolo richiesto). Più sei preciso, più punti fai.
const PAUSA_RIVELA = Number(process.env.ANGOLO_PAUSA) || 4500;

function puntiPer(errore) {
  if (errore === 0) return 150;           // centro perfetto
  return Math.max(0, Math.round(100 - errore * 2.5));
}

class Angolo {
  constructor({ n, opzioni = {} }) {
    this.id = 'angolo';
    this.n = n;
    this.modo = opzioni.modo === 'costruisci' ? 'costruisci' : 'indovina';
    this.massimo = Number(opzioni.ampiezza) === 180 ? 180 : 360;
    this.totaleRound = [5, 10].includes(Number(opzioni.round)) ? Number(opzioni.round) : 5;
    this.round = 0;
    this.punti = new Array(n).fill(0);
    this.storia = [];
    this.inAttesa = false;
    this.pausaMs = PAUSA_RIVELA;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.turno = null;
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoRound() {
    this.round++;
    // niente angoli troppo "facili" (multipli di 45) per metà delle volte
    let a;
    do a = 3 + Math.floor(Math.random() * (this.massimo - 5)); while (a % 45 === 0 && Math.random() < 0.7);
    this.angolo = a;
    this.rotazione = Math.floor(Math.random() * 360); // il disegno è ruotato a caso, così non basta guardare l'orizzontale
    this.risposte = new Array(this.n).fill(null);
    this.fase = 'stima';
    this.inAttesa = false;
  }

  attesi() {
    if (this.fase !== 'stima' || this.finita) return [];
    return this.risposte.map((r, i) => (r == null ? i : -1)).filter((i) => i >= 0);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa || this.fase !== 'stima') return { errore: 'Aspetta il prossimo angolo' };
    if (!a || a.tipo !== 'stima') return { errore: 'Mossa non valida' };
    const g = Math.round(Number(a.gradi));
    if (!Number.isFinite(g) || g < 0 || g > this.massimo) return { errore: `Scrivi un numero da 0 a ${this.massimo}` };
    this.risposte[p] = g; // si può cambiare finché non hanno risposto tutti
    if (!this.attesi().length) this.rivela();
    return { ok: true };
  }

  rivela() {
    const esiti = this.risposte.map((r) => {
      if (r == null || r < 0) return { gradi: null, errore: null, punti: 0 };
      const errore = Math.abs(r - this.angolo);
      return { gradi: r, errore, punti: puntiPer(errore) };
    });
    esiti.forEach((e, i) => { this.punti[i] += e.punti; });
    this.storia.push({ round: this.round, angolo: this.angolo, esiti });
    const migliore = Math.min(...esiti.filter((e) => e.errore != null).map((e) => e.errore));
    const chi = esiti.findIndex((e) => e.errore === migliore);
    this.annuncia(chi >= 0 ? chi : null, `era ${this.angolo}°: il più vicino (${migliore}° di errore)`, `era ${this.angolo}°: sei il più vicino! (${migliore}° di errore)`);
    this.fase = 'rivela';
    this.inAttesa = true;
  }

  avanza() {
    if (!this.inAttesa) return;
    if (this.round >= this.totaleRound) { this.chiudi(); return; }
    this.nuovoRound();
  }

  // chi è assente o sulle dispense salta il round (0 punti)
  salta(p) {
    if (this.fase !== 'stima' || this.risposte[p] != null) return;
    this.risposte[p] = -1;
    if (!this.attesi().length) this.rivela();
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const vincitori = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: this.n > 1 && vincitori.length > 1, vincitori };
    return { ok: true };
  }

  // il trucco segreto (!win): finché non ha risposto gli sussurra la misura giusta
  suggerimentoWin(posto) { return this.fase === 'stima' && !this.inAttesa && this.risposte[posto] == null ? `📐 ${this.angolo}°` : null; }

  vista(p) {
    const scoperto = this.fase !== 'stima';
    return {
      gioco: this.id, n: this.n, modo: this.modo, massimo: this.massimo, round: this.round, totaleRound: this.totaleRound, fase: this.fase,
      // nella variante "costruisci" si sa il numero ma non si vede il disegno; in "indovina" il contrario
      angolo: this.modo === 'costruisci' || scoperto ? this.angolo : null,
      disegno: this.modo === 'indovina' || scoperto ? this.angolo : null,
      rotazione: this.rotazione,
      miaRisposta: this.risposte[p] != null && this.risposte[p] >= 0 ? this.risposte[p] : null,
      pronti: this.risposte.map((r) => r != null),
      ultimo: scoperto ? this.storia[this.storia.length - 1] : null,
      storia: this.storia, punti: this.punti,
      turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// il computer "vede" l'angolo con un errore che dipende dal livello
function bot(g, posto, livello) {
  const sigma = livello === 'difficile' ? 4 : livello === 'medio' ? 11 : 26;
  const rumore = (Math.random() + Math.random() + Math.random() - 1.5) * sigma * 1.4;
  return { tipo: 'stima', gradi: Math.max(0, Math.min(g.massimo, Math.round(g.angolo + rumore))) };
}

module.exports = {
  meta: {
    id: 'angolo',
    nome: 'Guess the angle',
    tipo: 'tabellone',
    saltaAssenti: true, // chi è via salta il round: il computer non risponde al suo posto
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Quanti gradi misura l\'angolo? Stima o costruisci, più sei preciso più punti fai.',
    opzioni: [
      { id: 'modo', nome: 'Modalità', valori: ['indovina', 'costruisci'], etichette: ['Indovina: vedi l\'angolo e stimi i gradi', 'Costruisci: sai i gradi e disegni l\'angolo'], predefinito: 'indovina' },
      { id: 'ampiezza', nome: 'Angoli', valori: [360, 180], etichette: ['Da 0° a 360°', 'Da 0° a 180°'], predefinito: 360 },
      { id: 'round', nome: 'Round', valori: [5, 10], etichette: ['5 round', '10 round'], predefinito: 5 },
    ],
    regole: [
      'A ogni round compare un angolo nuovo, disegnato in una posizione ruotata a caso. Tutti rispondono nello stesso momento e in segreto; finché non hanno risposto tutti puoi cambiare la risposta.',
      'Indovina: vedi l\'angolo e scrivi quanti gradi misura (o trascini la lancetta dello strumento). Costruisci: vedi solo il numero di gradi e devi ruotare il lato mobile finché l\'angolo non ti sembra giusto; il goniometro non c\'è, ci sei solo tu.',
      'Quando hanno risposto tutti si scopre la misura vera e si vedono le risposte di tutti.',
      'Punti: 100 meno 2,5 punti per ogni grado di errore (mai sotto zero); se sei esatto al grado prendi 150 punti.',
      'Si gioca 5 o 10 round, con angoli da 0° a 360° oppure da 0° a 180°. Vince chi ha più punti alla fine.',
      'Chi è assente o sulle dispense per 25 secondi salta il round.',
      'Il computer facile sbaglia anche di 30-40 gradi, il medio di una decina, il difficile di pochi gradi.',
    ],
  },
  crea: (o) => new Angolo(o),
  bot,
  _test: { puntiPer },
};
