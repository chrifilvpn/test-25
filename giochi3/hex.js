// HEX: scacchiera a rombi di esagoni (7×7 … 13×13). Il rosso (chi inizia) deve collegare il lato di sopra con quello
// di sotto, il blu il lato sinistro con quello destro, con una catena di pedine che si toccano. A turno si mette una
// pedina in una casella vuota; le pedine non si muovono e non si mangiano. Non c'è mai pareggio: alla fine uno dei due
// collega per forza. Regola della torta (a scelta): dopo la prima mossa il secondo giocatore può "scambiare" e
// prendersi quella pedina (così chi inizia non mette la mossa più forte al centro).
const ANN = require('../giochi/annulla');

const LATI = [11, 9, 7, 13];
const vicini = (N, i) => {
  const r = Math.floor(i / N), c = i % N, out = [];
  for (const [dr, dc] of [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]]) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < N && b < N) out.push(a * N + b); }
  return out;
};
const VIC = {};
const vic = (N) => VIC[N] || (VIC[N] = Array.from({ length: N * N }, (_, i) => vicini(N, i)));

// ha collegato? ruolo 0 = sopra-sotto, ruolo 1 = sinistra-destra. Restituisce la catena (per disegnarla) o null.
function catena(N, celle, chi, ruolo) {
  const V = vic(N), prec = new Map(), coda = [];
  for (let k = 0; k < N; k++) { const i = ruolo === 0 ? k : k * N; if (celle[i] === chi) { prec.set(i, -1); coda.push(i); } }
  for (let q = 0; q < coda.length; q++) {
    const i = coda[q];
    if ((ruolo === 0 && Math.floor(i / N) === N - 1) || (ruolo === 1 && i % N === N - 1)) {
      const out = []; for (let x = i; x !== -1; x = prec.get(x)) out.push(x); return out;
    }
    for (const j of V[i]) if (celle[j] === chi && !prec.has(j)) { prec.set(j, i); coda.push(j); }
  }
  return null;
}

class Hex {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'hex';
    this.n = n;
    this.N = LATI.includes(Number(opzioni.lato)) ? Number(opzioni.lato) : 11;
    this.torta = opzioni.torta !== 'no';
    this.rosso = primo; // il rosso inizia e collega sopra-sotto
    this.ruolo = []; this.ruolo[primo] = 0; this.ruolo[1 - primo] = 1;
    this.celle = new Array(this.N * this.N).fill(null);
    this.turno = primo;
    this.nMosse = 0; this.ultima = null; this.scambiato = false; this.vincente = null;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    ANN.prepara(this, bot, ['celle', 'turno', 'nMosse', 'ultima', 'scambiato']);
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  puoScambiare(p) { return this.torta && this.nMosse === 1 && !this.scambiato && p !== this.rosso && this.turno === p; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a && a.tipo === 'scambia') {
      if (!this.puoScambiare(p)) return { errore: 'Lo scambio si può fare solo come prima mossa del secondo giocatore' };
      ANN.salva(this, p);
      // la pedina diventa sua, specchiata sulla diagonale (così vale per lui quanto valeva per il rosso)
      const i = this.ultima, r = Math.floor(i / this.N), c = i % this.N, j = c * this.N + r;
      this.celle[i] = null; this.celle[j] = p;
      this.ultima = j; this.scambiato = true; this.nMosse++;
      this.annuncia(p, 'scambia: si prende la prima pedina (regola della torta)', 'hai scambiato: la prima pedina è tua', true);
      this.turno = 1 - p;
      return { ok: true };
    }
    if (!a || a.tipo !== 'metti') return { errore: 'Mossa non valida' };
    const i = Number(a.cella);
    if (!Number.isInteger(i) || i < 0 || i >= this.celle.length) return { errore: 'Casella non valida' };
    if (this.celle[i] !== null) return { errore: 'Casella già occupata' };
    ANN.salva(this, p);
    this.celle[i] = p; this.ultima = i; this.nMosse++;
    const c = catena(this.N, this.celle, p, this.ruolo[p]);
    if (c) return this.chiudi(p, c);
    this.turno = 1 - p;
    return { ok: true };
  }
  chiudi(v, c) {
    this.finita = true; this.turno = null; this.vincente = c;
    this.annuncia(v, `collega i suoi lati in ${this.nMosse} mosse!`, 'hai collegato i tuoi lati!', true);
    this.risultato = { fazioni: [0, 1].map((x) => ({ posti: [x], punti: x === v ? 1 : 0 })), etichetta: 'vittorie', pareggio: false, vincitori: [v] };
    return { ok: true };
  }
  // trucco segreto (!win): la mossa del computer difficile (righe contate dall'alto, caselle della riga da sinistra)
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    const a = bot(this, p, 'difficile');
    if (a.tipo === 'scambia') return '💡 Scambia: prenditi la prima pedina (regola della torta)';
    return `💡 Metti la pedina in riga ${Math.floor(a.cella / this.N) + 1} (dall'alto), casella ${(a.cella % this.N) + 1} (da sinistra)`;
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, N: this.N, celle: this.celle, ruolo: this.ruolo, rosso: this.rosso, ultima: this.ultima, nMosse: this.nMosse,
      puoScambiare: this.puoScambiare(p), scambiato: this.scambiato, torta: this.torta, vincente: this.vincente,
      puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// distanza di collegamento: quante pedine mancano al massimo per collegare (le proprie pedine costano 0, le caselle
// vuote 1, quelle avversarie sono muri). Con i "ponti" (due proprie pedine con due caselle vuote in comune) contati.
function distanza(N, celle, chi, ruolo) {
  const V = vic(N), d = new Array(N * N).fill(Infinity), coda = [];
  const costo = (i) => (celle[i] === chi ? 0 : celle[i] === null ? 1 : Infinity);
  for (let k = 0; k < N; k++) { const i = ruolo === 0 ? k : k * N; const c = costo(i); if (c < Infinity) { d[i] = c; coda.push(i); } }
  // Dijkstra con due code (costi 0 e 1)
  const deque = [...coda.filter((i) => d[i] === 0), ...coda.filter((i) => d[i] === 1)];
  for (let q = 0; q < deque.length; q++) {
    const i = deque[q];
    for (const j of V[i]) {
      const c = costo(j); if (c === Infinity) continue;
      if (d[i] + c < d[j]) { d[j] = d[i] + c; if (c === 0) deque.splice(q + 1, 0, j); else deque.push(j); }
    }
  }
  let m = Infinity;
  for (let k = 0; k < N; k++) { const i = ruolo === 0 ? (N - 1) * N + k : k * N + N - 1; m = Math.min(m, d[i]); }
  return m;
}

// MCTS (alberi di Monte Carlo) con RAVE: si gioca tante volte la partita fino in fondo riempiendo la scacchiera a
// caso, e si impara quali caselle portano più spesso alla vittoria
function mcts(g, p, ms) {
  const N = g.N, NN = N * N, ruoloP = g.ruolo[p];
  const fine = Date.now() + ms;
  const base = Int8Array.from(g.celle, (x) => (x === null ? -1 : x));
  const radice = { n: 0, w: 0, figli: null, mossa: -1, chi: 1 - p, amafN: new Float64Array(NN), amafW: new Float64Array(NN) };
  const vuoteDi = (b) => { const out = []; for (let i = 0; i < NN; i++) if (b[i] === -1) out.push(i); return out; };
  const espandi = (nodo, b, chi) => { nodo.figli = vuoteDi(b).map((m) => ({ n: 0, w: 0, figli: null, mossa: m, chi, amafN: new Float64Array(NN), amafW: new Float64Array(NN) })); };
  const ruoloDi = (x) => g.ruolo[x];
  let giri = 0;
  const b = new Int8Array(NN);
  // nei test un numero fisso di partite immaginarie (così le partite tra computer vengono sempre uguali)
  while (process.env.TEST_VELOCE ? giri < 400 : Date.now() < fine || giri < 50) {
    giri++;
    b.set(base);
    const strada = [radice];
    let nodo = radice, chi = p;
    // selezione (UCT + RAVE)
    for (;;) {
      if (!nodo.figli) { if (nodo.n >= 2 || nodo === radice) espandi(nodo, b, chi); break; }
      if (!nodo.figli.length) break;
      let meglio = null, v = -Infinity;
      const lnN = Math.log(nodo.n + 1);
      for (const f of nodo.figli) {
        const an = nodo.amafN[f.mossa], aw = nodo.amafW[f.mossa];
        const beta = an / (f.n + an + 4 * f.n * an * 0.0025 + 1e-9);
        const q = f.n ? f.w / f.n : 0.5, qa = an ? aw / an : 0.5;
        const val = (1 - beta) * q + beta * qa + 0.25 * Math.sqrt(lnN / (f.n + 1));
        if (val > v) { v = val; meglio = f; }
      }
      nodo = meglio; b[nodo.mossa] = chi; strada.push(nodo); chi = 1 - chi;
      if (nodo.n === 0) break;
    }
    // simulazione: le caselle vuote si riempiono a caso, alternando
    const vuote = vuoteDi(b);
    for (let i = vuote.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vuote[i], vuote[j]] = [vuote[j], vuote[i]]; }
    let c = chi;
    for (const i of vuote) { b[i] = c; c = 1 - c; }
    // con la scacchiera piena vince chi ha collegato (uno dei due di sicuro)
    const vinceP = catena(N, b, p, ruoloP) !== null;
    void ruoloDi;
    // aggiornamento (e AMAF: ogni casella del colore di chi muove conta come se fosse stata la sua mossa)
    for (const s of strada) {
      s.n++;
      const vinto = s.chi === p ? vinceP : !vinceP;
      if (s !== radice) s.w += vinto ? 1 : 0;
      // per i figli di s (mossi da 1 - s.chi): le caselle finite a quel colore
      const daMuove = s === radice ? p : 1 - s.chi;
      const vintoFigli = daMuove === p ? vinceP : !vinceP;
      for (let i = 0; i < NN; i++) if (b[i] === daMuove && base[i] === -1) { s.amafN[i]++; if (vintoFigli) s.amafW[i]++; }
    }
  }
  const figli = radice.figli || [];
  figli.sort((a, z) => z.n - a.n);
  return { mossa: figli.length ? figli[0].mossa : -1, giri };
}

function bot(g, p, livello) {
  const N = g.N, metti = (cella) => ({ tipo: 'metti', cella });
  const vuote = g.celle.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0);
  // scambio: se la prima pedina è vicina al centro conviene prenderla
  if (g.puoScambiare(p) && livello !== 'facile') {
    const r = Math.floor(g.ultima / N), c = g.ultima % N, centro = (N - 1) / 2;
    if (Math.abs(r - centro) + Math.abs(c - centro) <= N / 3) return { tipo: 'scambia' };
  }
  // prima mossa del rosso: non al centro (con la torta verrebbe presa), una casella un po' di lato
  if (g.nMosse === 0) {
    if (!g.torta) return metti(Math.floor(N / 2) * N + Math.floor(N / 2));
    const r = 1 + Math.floor(Math.random() * 2), c = Math.floor(Math.random() * N);
    return metti(r * N + c);
  }
  const avv = 1 - p;
  // mossa che vince subito / che blocca la vittoria subito dell'avversario
  for (const i of vuote) { g.celle[i] = p; const v = catena(N, g.celle, p, g.ruolo[p]); g.celle[i] = null; if (v) return metti(i); }
  for (const i of vuote) { g.celle[i] = avv; const v = catena(N, g.celle, avv, g.ruolo[avv]); g.celle[i] = null; if (v) return metti(i); }
  if (livello === 'difficile') {
    const ms = process.env.TEST_VELOCE ? 60 : 900;
    const m = mcts(g, p, ms);
    if (m.mossa >= 0) return metti(m.mossa);
  }
  // medio (e facile a volte): la casella che accorcia di più la mia strada e allunga quella dell'avversario
  if (livello === 'facile' && Math.random() < 0.5) {
    const vicine = vuote.filter((i) => vic(N)[i].some((j) => g.celle[j] !== null));
    const lista = vicine.length ? vicine : vuote;
    return metti(lista[Math.floor(Math.random() * lista.length)]);
  }
  let meglio = [], v = -Infinity;
  for (const i of vuote) {
    g.celle[i] = p;
    const val = distanza(N, g.celle, avv, g.ruolo[avv]) * 1.05 - distanza(N, g.celle, p, g.ruolo[p]) + Math.random() * 0.3;
    g.celle[i] = null;
    if (val > v + 1e-9) { v = val; meglio = [i]; } else if (Math.abs(val - v) < 1e-9) meglio.push(i);
  }
  return metti(meglio[Math.floor(Math.random() * meglio.length)]);
}

module.exports = {
  meta: {
    id: 'hex',
    nome: 'Hex',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Scacchiera di esagoni: collega i tuoi due lati prima che l\'avversario colleghi i suoi. Non c\'è mai pareggio.',
    alias: ['hex', 'esagoni', 'collega i lati', 'nash', 'polygon'],
    opzioni: [
      { id: 'lato', nome: 'Scacchiera', valori: LATI, etichette: ['11×11 (la classica)', '9×9', '7×7 (veloce)', '13×13'], predefinito: 11 },
      { id: 'torta', nome: 'Regola della torta', valori: ['si', 'no'], etichette: ['Sì: il secondo può prendersi la prima pedina', 'No'], predefinito: 'si' },
    ],
    regole: [
      'Si gioca in due su una scacchiera a rombo fatta di esagoni. Il ROSSO (chi inizia) deve collegare il lato di sopra con quello di sotto; il BLU il lato sinistro con quello destro. I lati sono colorati.',
      'A turno si mette una pedina del proprio colore in una casella vuota qualsiasi. Le pedine non si spostano e non si mangiano.',
      'Vince chi forma per primo una catena di pedine che si toccano (ogni esagono ha sei vicini) da un suo lato all\'altro. Non può finire pari: quando la scacchiera è piena, uno dei due ha collegato per forza.',
      'Regola della torta: chi inizia ha un vantaggio, così dopo la prima pedina rossa il blu può "scambiare" e prendersela (diventa blu, specchiata). Il rosso allora non mette la prima pedina troppo forte.',
      'Consiglio: due pedine con due caselle vuote in comune formano un "ponte" e sono già collegate (se l\'avversario entra in una, tu metti nell\'altra).',
      'Il computer facile mette spesso pedine a caso vicino al gioco; il medio cerca la casella che accorcia di più la sua strada e allunga quella dell\'avversario; il difficile gioca migliaia di partite immaginarie a ogni mossa (ricerca Monte Carlo).',
      'Contro il computer c\'è "↶ Annulla mossa".',
    ],
  },
  crea: (o) => new Hex(o),
  bot,
  _test: { catena, distanza, mcts, vicini, LATI },
};
