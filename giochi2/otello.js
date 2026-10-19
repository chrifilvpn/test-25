// REVERSI: damiera 8×8, pedine nere e bianche. Si cattura "a sandwich" in tutte le 8 direzioni: le pedine avversarie
// chiuse in linea retta tra la pedina appena messa e un'altra del proprio colore si girano. Se non si può muovere si
// passa; la partita finisce quando nessuno dei due può più muovere. Vince chi ha più pedine.
// Le celle contengono null oppure il posto (0 o 1) del proprietario.
const ANN = require('../giochi/annulla');

const L = 8;
const DIREZIONI = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// per ogni casella e direzione, le caselle in fila fino al bordo (precalcolate: il computer le usa milioni di volte)
const RAGGI = Array.from({ length: L * L }, (_, i) => DIREZIONI.map(([dr, dc]) => {
  const out = [];
  for (let r = Math.floor(i / L) + dr, c = (i % L) + dc; r >= 0 && r < L && c >= 0 && c < L; r += dr, c += dc) out.push(r * L + c);
  return out;
}).filter((x) => x.length > 1));

// pedine che girerebbe "chi" mettendo in i (celle: array con null/0/1, oppure Int8Array con -1/0/1)
function girate(celle, i, chi, vuoto = null) {
  if (celle[i] !== vuoto) return [];
  const out = [];
  for (const raggio of RAGGI[i]) {
    let k = 0;
    while (k < raggio.length && celle[raggio[k]] === 1 - chi) k++;
    if (k > 0 && k < raggio.length && celle[raggio[k]] === chi) for (let j = 0; j < k; j++) out.push(raggio[j]);
  }
  return out;
}
function mossePossibili(celle, chi, vuoto = null) {
  const out = [];
  for (let i = 0; i < L * L; i++) if (celle[i] === vuoto && puoMettere(celle, i, chi, vuoto)) out.push(i);
  return out;
}
function puoMettere(celle, i, chi, vuoto = null) {
  for (const raggio of RAGGI[i]) {
    let k = 0;
    while (k < raggio.length && celle[raggio[k]] === 1 - chi) k++;
    if (k > 0 && k < raggio.length && celle[raggio[k]] === chi) return true;
  }
  return false;
}
function iniziale() {
  const c = new Array(L * L).fill(null);
  // al centro: bianche in d4 ed e5, nere in e4 e d5 (il nero è il posto 0 di questa funzione)
  c[27] = 1; c[36] = 1; c[28] = 0; c[35] = 0;
  return c;
}
const conta = (celle, chi) => celle.reduce((s, x) => s + (x === chi ? 1 : 0), 0);
const nomeCasella = (i) => `${'abcdefgh'[i % L]}${Math.floor(i / L) + 1}`;

class Reversi {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'otello';
    this.n = n;
    this.nero = primo;           // chi inizia ha il nero
    this.colori = [];
    this.colori[primo] = 'nero';
    this.colori[1 - primo] = 'bianco';
    // le celle usano il posto: la posizione iniziale ha il nero in e4 e d5
    this.celle = iniziale().map((x) => (x === null ? null : x === 0 ? this.nero : 1 - this.nero));
    this.turno = primo;
    this.ultima = null; this.girate = []; this.passato = null; this.nMosse = 0;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    ANN.prepara(this, bot, ['celle', 'turno', 'ultima', 'girate', 'passato', 'nMosse']);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'metti') return { errore: 'Mossa non valida' };
    const i = Number(a.cella);
    if (!Number.isInteger(i) || i < 0 || i >= L * L) return { errore: 'Casella non valida' };
    if (this.celle[i] !== null) return { errore: 'Casella già occupata' };
    const g = girate(this.celle, i, p);
    if (!g.length) return { errore: 'Lì non giri nessuna pedina: scegli una casella evidenziata' };
    ANN.salva(this, p);
    this.celle[i] = p;
    for (const k of g) this.celle[k] = p;
    this.ultima = i; this.girate = g; this.passato = null; this.nMosse++;
    const altro = 1 - p;
    if (mossePossibili(this.celle, altro).length) this.turno = altro;
    else if (mossePossibili(this.celle, p).length) {
      // l'avversario non può muovere: passa, e tocca di nuovo a chi ha mosso
      this.passato = altro;
      this.annuncia(altro, 'non può muovere e passa', 'non puoi muovere: passi il turno');
    } else return this.chiudi();
    return { ok: true };
  }

  chiudi() {
    this.finita = true;
    this.turno = null;
    const punti = [conta(this.celle, 0), conta(this.celle, 1)];
    // le caselle vuote rimaste vanno a chi vince (regola dei tornei)
    const vuote = 64 - punti[0] - punti[1];
    const vince = punti[0] === punti[1] ? null : punti[0] > punti[1] ? 0 : 1;
    if (vince !== null) punti[vince] += vuote;
    if (vince !== null) this.annuncia(vince, `vince ${punti[vince]} a ${punti[1 - vince]}`, `vinci ${punti[vince]} a ${punti[1 - vince]}!`, true);
    else this.annuncia(null, `Pareggio ${punti[0]} a ${punti[1]}`, '', true);
    this.risultato = { fazioni: [0, 1].map((x) => ({ posti: [x], punti: punti[x] })), etichetta: 'pedine', pareggio: vince === null, vincitori: vince === null ? [] : [vince] };
    return { ok: true };
  }

  // trucco segreto (!win): la casella che sceglierebbe il computer difficile (coordinate scritte sulla damiera)
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p || !mossePossibili(this.celle, p).length) return null;
    const i = bot(this, p, 'difficile').cella;
    return `💡 Metti la pedina in ${nomeCasella(i)} (giri ${girate(this.celle.slice(), i, p).length})`;
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, celle: this.celle, colori: this.colori,
      mosse: this.finita || this.turno == null ? [] : mossePossibili(this.celle, this.turno),
      ultima: this.ultima, girate: this.girate, passato: this.passato, nMosse: this.nMosse,
      conteggio: [conta(this.celle, 0), conta(this.celle, 1)],
      puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// Pesi classici delle caselle: gli angoli valgono tantissimo, le caselle accanto (X e C) sono pericolose finché
// l'angolo è vuoto.
const PESI = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];
const ANGOLI = [0, 7, 56, 63];
// caselle vicine a ogni angolo (C e X): il loro peso negativo vale solo se l'angolo è ancora vuoto
const VICINE = { 0: [1, 8, 9], 7: [6, 15, 14], 56: [57, 48, 49], 63: [62, 55, 54] };
const VINCE = 1e6;

// pedine stabili (che non si possono più girare), stima semplice: partendo da ogni angolo occupato, le file di
// pedine dello stesso colore lungo i due bordi
function stabili(b, chi) {
  let s = 0;
  const lati = [[0, 1, 8], [7, -1, 8], [56, 1, -8], [63, -1, -8]];
  for (const [a, dx, dy] of lati) {
    if (b[a] !== chi) continue;
    for (const passo of [dx, dy]) {
      for (let k = 1, i = a + passo; k < 7 && b[i] === chi; k++, i += passo) s++;
    }
    s++;
  }
  return s;
}

class Motore {
  constructor(celle) {
    this.b = Int8Array.from(celle, (x) => (x === null ? -1 : x));
    this.nodi = 0; this.stop = false; this.fino = Infinity;
  }
  mosse(chi) { return mossePossibili(this.b, chi, -1); }
  metti(i, chi) {
    const g = girate(this.b, i, chi, -1);
    this.b[i] = chi;
    for (const k of g) this.b[k] = chi;
    return g;
  }
  togli(i, g, chi) { this.b[i] = -1; for (const k of g) this.b[k] = 1 - chi; }
  vuote() { let v = 0; for (let i = 0; i < 64; i++) if (this.b[i] === -1) v++; return v; }
  differenza(chi) { let d = 0; for (let i = 0; i < 64; i++) if (this.b[i] === chi) d++; else if (this.b[i] === 1 - chi) d--; return d; }
  valuta(chi, mieMosse, sueMosse) {
    const b = this.b, avv = 1 - chi;
    let pos = 0;
    for (let i = 0; i < 64; i++) if (b[i] !== -1) pos += b[i] === chi ? PESI[i] : -PESI[i];
    // le caselle vicine agli angoli già presi non sono più pericolose: si toglie la penalità
    for (const a of ANGOLI) if (b[a] !== -1) for (const k of VICINE[a]) if (b[k] !== -1) pos += (b[k] === chi ? 1 : -1) * -PESI[k];
    let angoli = 0;
    for (const a of ANGOLI) if (b[a] === chi) angoli++; else if (b[a] === avv) angoli--;
    const mob = mieMosse + sueMosse ? (100 * (mieMosse - sueMosse)) / (mieMosse + sueMosse + 2) : 0;
    const stab = stabili(b, chi) - stabili(b, avv);
    const vuote = this.vuote();
    const pedine = vuote < 14 ? this.differenza(chi) * (14 - vuote) * 0.6 : 0; // verso la fine contano le pedine
    return pos + 40 * angoli + mob * 1.2 + 12 * stab + pedine;
  }
  negamax(chi, prof, alfa, beta, passato = false) {
    if ((++this.nodi & 127) === 0 && Date.now() > this.fino) this.stop = true;
    if (this.stop) return 0;
    const mie = this.mosse(chi);
    if (!mie.length) {
      if (passato) { const d = this.differenza(chi); return d > 0 ? VINCE + d : d < 0 ? -VINCE + d : 0; }
      return -this.negamax(1 - chi, prof, -beta, -alfa, true);
    }
    if (prof <= 0) return this.valuta(chi, mie.length, this.mosse(1 - chi).length);
    // prima le mosse che sembrano migliori (angoli), così il taglio alfa-beta lavora di più
    if (mie.length > 1) mie.sort((a, b) => PESI[b] - PESI[a]);
    let best = -Infinity;
    for (const i of mie) {
      const g = this.metti(i, chi);
      const v = -this.negamax(1 - chi, prof - 1, -beta, -alfa);
      this.togli(i, g, chi);
      if (this.stop) return 0;
      if (v > best) best = v;
      if (best > alfa) alfa = best;
      if (alfa >= beta) break;
    }
    return best;
  }
}

// valore di ogni mossa possibile, con approfondimento progressivo finché c'è tempo (alla fine della partita
// cerca fino all'ultima mossa)
function classifica(celle, chi, profMax, ms) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 2); // nei test le partite devono essere tante e veloci
  const m = new Motore(celle);
  m.fino = Date.now() + ms;
  const mosse = m.mosse(chi).sort((a, b) => PESI[b] - PESI[a]);
  let migliore = mosse.map((i) => ({ i, v: PESI[i] }));
  const vuote = m.vuote();
  const fine = vuote <= 12 ? vuote : profMax;
  for (let prof = 1; prof <= Math.max(profMax, fine); prof++) {
    const giro = [];
    let alfa = -Infinity;
    // la mossa migliore del giro prima si prova per prima
    for (const { i } of migliore) {
      const g = m.metti(i, chi);
      const v = -m.negamax(1 - chi, prof - 1, -Infinity, -alfa);
      m.togli(i, g, chi);
      if (m.stop) break;
      giro.push({ i, v });
      if (v > alfa) alfa = v;
    }
    if (m.stop) break;
    migliore = giro.sort((a, b) => b.v - a.v);
    classifica.prof = prof;
    if (prof >= vuote) break;
  }
  return migliore;
}

function bot(g, p, livello) {
  const mosse = mossePossibili(g.celle, p);
  const metti = (cella) => ({ tipo: 'metti', cella });
  if (!mosse.length) return metti(0); // non succede: chi non può muovere passa da solo
  if (livello === 'facile') {
    // quasi a caso: ogni tanto prende la mossa che gira più pedine, e un angolo libero lo vede solo a volte
    const angolo = mosse.find((i) => ANGOLI.includes(i));
    if (angolo !== undefined && Math.random() < 0.35) return metti(angolo);
    if (Math.random() < 0.3) return metti(mosse.reduce((a, b) => (girate(g.celle, b, p).length > girate(g.celle, a, p).length ? b : a)));
    return metti(mosse[Math.floor(Math.random() * mosse.length)]);
  }
  if (livello === 'medio') {
    // goloso: peso della casella più le pedine girate, senza guardare la risposta dell'avversario
    const lista = mosse.map((i) => {
      const b = g.celle.slice(); const gi = girate(b, i, p);
      let v = PESI[i] + gi.length * 1.5 + Math.random() * 3;
      for (const a of ANGOLI) if (b[a] !== null && VICINE[a].includes(i)) v -= PESI[i]; // vicino a un angolo già preso: va bene
      return { i, v };
    }).sort((a, b) => b.v - a.v);
    return metti(lista[0].i);
  }
  return metti(classifica(g.celle, p, 6, 220)[0].i);
}

module.exports = {
  meta: {
    id: 'otello',
    nome: 'Reversi',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Damiera 8×8: chiudi a sandwich le pedine avversarie e girale del tuo colore. Vince chi ne ha di più.',
    alias: ['reversi', 'pedine', 'bianco e nero', 'girare pedine'],
    opzioni: [],
    regole: [
      'Si gioca in due su una damiera 8×8. Chi inizia ha le pedine nere, l\'altro le bianche; si parte con quattro pedine al centro (due per colore, in diagonale). Alla rivincita inizia l\'altro.',
      'A turno si mette una pedina in una casella vuota, in modo da chiudere in linea retta (in orizzontale, verticale o diagonale) una o più pedine avversarie tra quella appena messa e un\'altra del proprio colore. Tutte le pedine chiuse si girano e diventano tue, in tutte le direzioni insieme.',
      'Si può mettere una pedina solo dove gira almeno una pedina avversaria: le caselle possibili sono segnate con un puntino.',
      'Se non hai nessuna mossa possibile passi il turno (succede da solo). La partita finisce quando nessuno dei due può più muovere, di solito a damiera piena.',
      'Vince chi ha più pedine del suo colore; le caselle rimaste vuote vanno a chi vince. Con lo stesso numero di pedine è pareggio.',
      'Consiglio: gli angoli non si possono più girare e valgono tantissimo; le caselle accanto a un angolo vuoto sono pericolose perché lo regalano all\'avversario.',
      'Il computer facile gioca quasi a caso; il medio sceglie la casella migliore secondo una tabella dei pesi (angoli, bordi) senza guardare avanti; il difficile calcola 5-6 mosse in avanti con mobilità, angoli e pedine stabili e, alle ultime 12 caselle, gioca la fine perfetta.',
      'Contro il computer c\'è "↶ Annulla mossa": torna a prima della tua ultima mossa (si annulla anche la risposta del computer).',
    ],
  },
  crea: (o) => new Reversi(o),
  bot,
  _test: { girate, mossePossibili, classifica, iniziale, nomeCasella, PESI },
};
