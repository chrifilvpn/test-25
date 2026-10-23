// INDOVINA IL NUMERO: il computer pensa un numero tra 1 e un massimo casuale (visibile a tutti).
// Si prova a turno; a ogni tentativo il computer risponde "più alto" o "più basso". Vince chi lo indovina.
// Si può giocare da soli (conta i tentativi) o con altri, persone o computer.
const INTERVALLI = { normale: [50, 1000], grande: [1000, 100000] };
const tra = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

class IndovinaNumero {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'numero';
    this.n = n;
    const [a, b] = INTERVALLI[opzioni.massimo] || INTERVALLI.normale;
    this.massimo = tra(a, b);
    this.segreto = tra(1, this.massimo);
    this.basso = 1;              // il numero è sicuramente tra basso e alto
    this.alto = this.massimo;
    this.tentativi = [];         // { posto, n, esito: 'su' | 'giu' | 'giusto' }
    this.conta = new Array(n).fill(0);
    this.turno = n === 1 ? 0 : primo;
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'prova') return { errore: 'Mossa non valida' };
    const x = Number(a.numero);
    if (!Number.isInteger(x) || x < 1 || x > this.massimo) return { errore: `Scrivi un numero intero da 1 a ${this.massimo}` };
    this.conta[p]++;
    if (x === this.segreto) {
      this.tentativi.push({ posto: p, n: x, esito: 'giusto' });
      this.annuncia(p, `indovina: era ${x}!`, `hai indovinato: era ${x}!`, true);
      return this.chiudi(p);
    }
    const esito = x < this.segreto ? 'su' : 'giu';
    this.tentativi.push({ posto: p, n: x, esito });
    if (esito === 'su') this.basso = Math.max(this.basso, x + 1); else this.alto = Math.min(this.alto, x - 1);
    this.annuncia(p, `dice ${x}: ${esito === 'su' ? 'più alto ⬆' : 'più basso ⬇'}`, `${x}: ${esito === 'su' ? 'più alto ⬆' : 'più basso ⬇'}`);
    this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  chiudi(v) {
    this.finita = true;
    this.turno = null;
    this.risultato = {
      fazioni: this.conta.map((c, i) => ({ posti: [i], punti: c })),
      etichetta: 'tentativi',
      crescente: true, // meno tentativi è meglio
      pareggio: false,
      vincitori: [v],
    };
    return { ok: true };
  }

  // il trucco segreto (!win): al suo turno gli sussurra il numero
  suggerimentoWin(posto) { return !this.finita && this.turno === posto ? `🔢 È il ${this.segreto}` : null; }

  vista() {
    return {
      gioco: this.id, n: this.n, massimo: this.massimo, basso: this.basso, alto: this.alto,
      tentativi: this.tentativi.slice(-30), totale: this.tentativi.length, conta: this.conta,
      segreto: this.finita ? this.segreto : null,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
function bot(g, p, livello) {
  const { basso, alto } = g;
  let x;
  if (livello === 'facile') x = tra(basso, alto); // tira a caso, ma dentro l'intervallo giusto
  else if (livello === 'medio') x = Math.round(basso + (alto - basso) * (0.3 + Math.random() * 0.4)); // circa a metà
  else x = Math.floor((basso + alto) / 2); // ricerca binaria: sempre esattamente a metà
  return { tipo: 'prova', numero: Math.min(alto, Math.max(basso, x)) };
}

module.exports = {
  meta: {
    id: 'numero',
    nome: 'Indovina il numero',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Più alto o più basso? Da soli o a turni con gli amici: vince chi lo indovina.',
    opzioni: [
      { id: 'massimo', nome: 'Numero massimo', valori: ['normale', 'grande'], etichette: ['Casuale tra 50 e 1000', 'Casuale tra 1000 e 100000'], predefinito: 'normale' },
    ],
    regole: [
      'All\'inizio il computer sceglie un numero massimo a caso (lo vedono tutti) e poi pensa un numero segreto tra 1 e quel massimo.',
      'A turno si prova un numero. Il computer risponde "più alto" se il numero segreto è più grande, "più basso" se è più piccolo.',
      'Tutti vedono i tentativi di tutti: sfrutta anche le risposte date agli altri. La barra mostra in che intervallo si trova ancora il numero.',
      'Vince chi indovina il numero per primo.',
      'Da soli: provi finché non lo trovi, e alla fine vedi quanti tentativi ti sono serviti. Con il metodo migliore (dire sempre il numero a metà dell\'intervallo) bastano circa 10 tentativi fino a 1000 e 17 fino a 100000.',
      'Il computer facile tira a caso, il medio prova più o meno a metà, il difficile sempre esattamente a metà.',
    ],
  },
  crea: (o) => new IndovinaNumero(o),
  bot,
};
