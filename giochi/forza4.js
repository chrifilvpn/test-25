// FORZA 4: griglia classica di 7 colonne e 6 righe. Celle: null oppure il posto (0/1) di chi ha calato.
// La riga 0 è quella in alto.
const COL = 7;
const RIG = 6;
const id = (r, c) => r * COL + c;

// tutte le "finestre" di 4 caselle in fila
const FINESTRE = [];
for (let r = 0; r < RIG; r++) for (let c = 0; c < COL; c++) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const fr = r + dr * 3, fc = c + dc * 3;
    if (fr < 0 || fr >= RIG || fc < 0 || fc >= COL) continue;
    FINESTRE.push([0, 1, 2, 3].map((k) => id(r + dr * k, c + dc * k)));
  }
}
// per ogni casella, le finestre che la contengono (serve a controllare la vittoria solo attorno all'ultima mossa)
const FIN_DI = Array.from({ length: COL * RIG }, () => []);
FINESTRE.forEach((f) => f.forEach((i) => FIN_DI[i].push(f)));

function rigaLibera(celle, c) {
  for (let r = RIG - 1; r >= 0; r--) if (celle[id(r, c)] === null) return r;
  return -1;
}
function vinceCon(celle, i) {
  const v = celle[i];
  return FIN_DI[i].find((f) => f.every((k) => celle[k] === v)) || null;
}

const ANN = require('./annulla');
const { ora } = require('./orologio'); // orologio vero (nel sito) o finto (nei test)

class Forza4 {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'forza4';
    this.n = n;
    this.celle = new Array(COL * RIG).fill(null);
    this.turno = primo;
    this.colori = [];
    this.colori[primo] = 'rosso'; // chi inizia ha le pedine rosse
    this.colori[1 - primo] = 'giallo';
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultima = null;
    this.linea = null;
    this.mosse = 0;
    ANN.prepara(this, bot, ['celle', 'turno', 'ultima', 'mosse']);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'cala') return { errore: 'Mossa non valida' };
    const c = Number(a.colonna);
    if (!(c >= 0 && c < COL)) return { errore: 'Colonna non valida' };
    const r = rigaLibera(this.celle, c);
    if (r < 0) return { errore: 'Questa colonna è piena' };
    ANN.salva(this, p);
    const i = id(r, c);
    this.celle[i] = p;
    this.mosse++;
    this.ultima = { riga: r, colonna: c, cella: i };
    const linea = vinceCon(this.celle, i);
    if (linea) return this.chiudi(p, linea);
    if (this.mosse === COL * RIG) return this.chiudi(null, null);
    this.turno = 1 - p;
    return { ok: true };
  }

  chiudi(vince, linea) {
    this.finita = true;
    this.turno = null;
    this.linea = linea;
    if (vince !== null) this.annuncia(vince, 'fa forza 4!', 'hai fatto forza 4!', true);
    else this.annuncia(null, 'Griglia piena: pareggio', 'pareggio', true);
    this.risultato = {
      fazioni: [0, 1].map((p) => ({ posti: [p], punti: vince === p ? 1 : 0 })),
      etichetta: 'punti',
      pareggio: vince === null,
      vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  // trucco segreto (!win): la colonna che sceglierebbe il computer difficile
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    return `💡 Colonna ${bot(this, p, 'difficile').colonna + 1} (da sinistra)`;
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, colonne: COL, righe: RIG, celle: this.celle, colori: this.colori, puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato,
      evento: this.evento, ultima: this.ultima, linea: this.linea,
    };
  }
}

// =================== COMPUTER ===================
// Motore veloce: griglia Int8Array (-1 vuota), altezza di ogni colonna, controllo della vittoria
// solo attorno all'ultima pedina e tabella delle posizioni già viste (chiavi di Zobrist).
const VINCE = 1000000;
const ORDINE = [3, 2, 4, 1, 5, 0, 6]; // prima le colonne centrali: potano molto di più
const rnd32 = () => (Math.random() * 0x100000000) >>> 0;
const Z = Array.from({ length: COL * RIG }, () => [[rnd32(), rnd32() & 0x7ffff], [rnd32(), rnd32() & 0x7ffff]]);
const DIREZIONI = [[0, 1], [1, 0], [1, 1], [1, -1]];

function valuta(b, chi) {
  let s = 0;
  for (const f of FINESTRE) {
    let m = 0, a = 0;
    for (const k of f) { const v = b[k]; if (v === chi) m++; else if (v !== -1) a++; }
    if (m && a) continue;
    if (m) s += m === 3 ? 60 : m === 2 ? 6 : 1;
    else if (a) s -= a === 3 ? 70 : a === 2 ? 6 : 1;
  }
  for (let r = 0; r < RIG; r++) { const v = b[id(r, 3)]; if (v === chi) s += 4; else if (v !== -1) s -= 4; }
  return s;
}

class Motore {
  constructor(celle) {
    this.b = Int8Array.from(celle, (x) => (x === null ? -1 : x));
    this.h = new Int8Array(COL);
    this.k1 = 0; this.k2 = 0;
    for (let c = 0; c < COL; c++) for (let r = RIG - 1; r >= 0 && this.b[id(r, c)] !== -1; r--) this.h[c]++;
    this.b.forEach((v, i) => { if (v !== -1) { this.k1 ^= Z[i][v][0]; this.k2 ^= Z[i][v][1]; } });
    this.liberi = this.b.filter((v) => v === -1).length;
    this.tt = new Map();
    this.nodi = 0;
  }
  metti(c, chi) {
    const i = id(RIG - 1 - this.h[c], c);
    this.b[i] = chi; this.h[c]++; this.liberi--;
    this.k1 ^= Z[i][chi][0]; this.k2 ^= Z[i][chi][1];
    return i;
  }
  togli(c) {
    this.h[c]--; this.liberi++;
    const i = id(RIG - 1 - this.h[c], c);
    const chi = this.b[i];
    this.k1 ^= Z[i][chi][0]; this.k2 ^= Z[i][chi][1];
    this.b[i] = -1;
  }
  vinceIn(c, chi) { // chi vincerebbe calando in c?
    if (this.h[c] >= RIG) return false;
    const r0 = RIG - 1 - this.h[c];
    for (const [dr, dc] of DIREZIONI) {
      let n = 1;
      for (let s = -1; s <= 1; s += 2) {
        let r = r0 + dr * s, cc = c + dc * s;
        while (r >= 0 && r < RIG && cc >= 0 && cc < COL && this.b[id(r, cc)] === chi) { n++; r += dr * s; cc += dc * s; }
      }
      if (n >= 4) return true;
    }
    return false;
  }
  negamax(chi, prof, alfa, beta) {
    if (this.liberi === 0) return 0;
    for (const c of ORDINE) if (this.vinceIn(c, chi)) return VINCE + prof;
    if (prof === 0) return valuta(this.b, chi);
    if ((++this.nodi & 1023) === 0 && ora(5) > this.fino) this.stop = true;
    if (this.stop) return 0;
    // mosse obbligate: se l'avversario minaccia di vincere, devo bloccare
    const minacce = ORDINE.filter((c) => this.vinceIn(c, 1 - chi));
    if (minacce.length > 1) return -(VINCE + prof - 1);
    const chiave = (this.k1 * 524288 + this.k2) * 2 + chi;
    const alfa0 = alfa;
    const t = this.tt.get(chiave);
    let prima = -1;
    if (t) {
      if (t.prof >= prof) {
        if (t.tipo === 0) return t.v;
        if (t.tipo === 1 && t.v > alfa) alfa = t.v;
        else if (t.tipo === 2 && t.v < beta) beta = t.v;
        if (alfa >= beta) return t.v;
      }
      prima = t.best;
    }
    const mosse = minacce.length ? minacce : ORDINE.filter((c) => this.h[c] < RIG);
    if (prima >= 0 && mosse.includes(prima)) { mosse.splice(mosse.indexOf(prima), 1); mosse.unshift(prima); }
    let best = -Infinity, bestC = mosse[0];
    for (const c of mosse) {
      this.metti(c, chi);
      const v = -this.negamax(1 - chi, prof - 1, -beta, -alfa);
      this.togli(c);
      if (this.stop) return 0;
      if (v > best) { best = v; bestC = c; }
      if (best > alfa) alfa = best;
      if (alfa >= beta) break;
    }
    if (this.tt.size > 400000) this.tt.clear();
    this.tt.set(chiave, { prof, v: best, tipo: best <= alfa0 ? 2 : best >= beta ? 1 : 0, best: bestC });
    return best;
  }
}

// valore di ogni colonna giocabile, con approfondimento progressivo finché c'è tempo
function classifica(celle, chi, profMax, ms) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 25);
  const m = new Motore(celle);
  m.fino = ora() + ms;
  m.stop = false;
  const colonne = ORDINE.filter((c) => m.h[c] < RIG);
  let migliore = colonne.map((c) => ({ c, v: 0 }));
  for (let prof = 1; prof <= Math.min(profMax, m.liberi); prof++) {
    const giro = [];
    for (const c of colonne) {
      let v;
      if (m.vinceIn(c, chi)) v = VINCE + prof;
      else { m.metti(c, chi); v = -m.negamax(1 - chi, prof - 1, -Infinity, Infinity); m.togli(c); }
      if (m.stop) break;
      giro.push({ c, v });
    }
    if (m.stop) break;
    migliore = giro.sort((a, b) => b.v - a.v || Math.abs(3 - a.c) - Math.abs(3 - b.c));
    classifica.prof = prof;
    if (Math.abs(migliore[0].v) >= VINCE / 2) break; // esito già deciso
  }
  return migliore;
}

function colonnaVincente(celle, chi) {
  for (const c of ORDINE) {
    const r = rigaLibera(celle, c);
    if (r < 0) continue;
    const i = id(r, c);
    celle[i] = chi;
    const v = vinceCon(celle, i);
    celle[i] = null;
    if (v) return c;
  }
  return -1;
}

function bot(g, p, livello) {
  const celle = g.celle.slice();
  const cala = (colonna) => ({ tipo: 'cala', colonna });
  const libere = ORDINE.filter((c) => rigaLibera(celle, c) >= 0);
  if (livello === 'facile') {
    const mia = colonnaVincente(celle, p);
    if (mia >= 0 && Math.random() < 0.7) return cala(mia);
    const sua = colonnaVincente(celle, 1 - p);
    if (sua >= 0 && Math.random() < 0.45) return cala(sua);
    // preferenza leggera per il centro
    const pesi = libere.map((c) => 4 - Math.abs(3 - c));
    let x = Math.random() * pesi.reduce((a, b) => a + b, 0);
    for (let k = 0; k < libere.length; k++) { x -= pesi[k]; if (x <= 0) return cala(libere[k]); }
    return cala(libere[0]);
  }
  if (livello === 'medio') {
    const lista = classifica(celle, p, 4, 300);
    // ogni tanto non sceglie la mossa migliore (ma non butta via una vittoria e non ignora una minaccia)
    if (lista.length > 1 && Math.random() < 0.18 && lista[1].v > -VINCE / 2 && lista[0].v < VINCE) return cala(lista[1].c);
    return cala(lista[0].c);
  }
  return cala(classifica(celle, p, 42, 450)[0].c);
}

module.exports = {
  meta: {
    id: 'forza4',
    pensaLento: true, // il computer difficile pensa a lungo: lo fa in un thread a parte (giochi/pensatore.js)
    nome: 'Forza 4',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Cala le pedine nella griglia e metti quattro in fila prima dell\'avversario.',
    opzioni: [],
    regole: [
      'Si gioca in due su una griglia verticale di 7 colonne e 6 righe. Chi inizia ha le pedine rosse, l\'altro le gialle. Alla rivincita inizia l\'altro.',
      'A turno si sceglie una colonna: la pedina scende fino alla prima casella libera dal basso.',
      'Vince chi mette per primo quattro pedine del suo colore in fila, in orizzontale, in verticale o in diagonale.',
      'Non si può giocare in una colonna piena. Se la griglia si riempie senza un vincitore, è pareggio.',
      'Suggerimento: le colonne centrali permettono più combinazioni. Il computer difficile calcola molte mosse in avanti.',
      'Contro il computer c\'è "↶ Annulla mossa": torna a prima della tua ultima pedina (si annulla anche la risposta del computer).',
    ],
  },
  crea: (o) => new Forza4(o),
  bot,
  _test: { rigaLibera, vinceCon, COL, RIG, classifica },
};
