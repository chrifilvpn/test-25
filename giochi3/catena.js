// CATENA DI PAROLE: si parte da una parola; a turno ognuno deve dirne un'altra che cominci con le ULTIME DUE lettere
// della precedente (o con l'ultima, a scelta): "cane" → "neve" → "verde"… Le parole devono esistere (dizionario
// italiano dei giochi di parole), non si possono ripetere e devono lasciare almeno una parola per continuare. Chi non
// trova la parola in tempo (o passa) perde una vita, e la catena riparte dalla stessa parola con il giocatore dopo.
// Chi finisce le vite è fuori: vince l'ultimo rimasto. Da soli si gioca contro il tempo, per fare la catena più lunga.
const D = require('../giochi2/paroliere-dati');

const VELOCE = !!process.env.TEST_VELOCE;
const TEMPI = [20, 12, 30];
// le parole che il computer conosce e da cui si parte: indice per inizio (1 o 2 lettere), con la fascia di frequenza
let INDICE = null;
function indice() {
  if (INDICE) return INDICE;
  INDICE = { 1: new Map(), 2: new Map() };
  for (const w of D.dizionario()) {
    if (w.length < 4 || w.length > 11) continue;
    const f = D.fascia(w);
    if (!f) continue;
    for (const n of [1, 2]) { const k = w.slice(0, n); if (!INDICE[n].has(k)) INDICE[n].set(k, []); INDICE[n].get(k).push(w); }
  }
  return INDICE;
}
const coda = (w, n) => w.slice(-n);
// quante parole (conosciute dal computer) cominciano con queste lettere, tolte quelle già dette (poche: si contano
// quelle invece di scorrere tutta la lista)
const continuazioni = (k, n, usate) => {
  const l = indice()[n].get(k);
  if (!l) return 0;
  let c = l.length;
  for (const w of usate) if (w.startsWith(k) && D.fascia(w) && w.length >= 4 && w.length <= 11) c--;
  return c;
};
// le parole di partenza possibili, una volta sola per ogni modo di attaccare
const PARTENZE = {};
function partenze(n) {
  if (!PARTENZE[n]) PARTENZE[n] = indice()[1] && [...indice()[1].values()].flat().filter((w) => w.length >= 5 && w.length <= 7 && D.fascia(w) === 3 && /^[a-z]+$/.test(w) && continuazioni(coda(w, n), n, new Set()) > 30);
  return PARTENZE[n];
}

class Catena {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'catena';
    this.n = n;
    this.nLettere = opzioni.lettere === 'una' ? 1 : 2;
    this.tempo = (TEMPI.includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 20) * 1000;
    this.vite = new Array(n).fill([1, 3, 5].includes(Number(opzioni.vite)) ? Number(opzioni.vite) : 3);
    this.punti = new Array(n).fill(0);
    this.usate = new Set();
    // la parola di partenza: comune, di 5-7 lettere, con tante continuazioni
    const scelte = partenze(this.nLettere);
    const w0 = scelte[Math.floor(Math.random() * scelte.length)];
    this.catena = [{ w: w0, chi: null }];
    this.usate.add(w0);
    this.fuori = [];
    this.turno = primo;
    this.fineTurno = Date.now() + this.tempo + 1500;
    this.velocitaBot = 2.2; // i computer "pensano" un po' prima di rispondere
    this.ultimoErrore = null;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  ultima() { return this.catena[this.catena.length - 1].w; }
  attacco() { return coda(this.ultima(), this.nLettere); }
  vivi() { return this.vite.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0); }
  prossimo(p) { for (let k = 1; k <= this.n; k++) { const q = (p + k) % this.n; if (this.vite[q] > 0) return q; } return p; }
  passaA(q) { this.turno = q; this.fineTurno = Date.now() + this.tempo; this.ultimoErrore = null; }

  // controlla una parola (senza giocarla): restituisce un errore o null
  controlla(w) {
    if (w.length < 3) return 'Troppo corta: almeno 3 lettere';
    if (!w.startsWith(this.attacco())) return `Deve cominciare con "${this.attacco().toUpperCase()}"`;
    if (this.usate.has(w)) return 'Questa parola è già stata detta';
    if (!D.esiste(w)) return `"${w}" non è nel dizionario`;
    const c = coda(w, this.nLettere);
    if (!D.prefisso(c)) return `Nessuna parola comincia con "${c.toUpperCase()}": scegline un'altra`;
    return null;
  }
  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    if (a.tipo === 'passo') { this.perdeVita(p, 'passa'); return { ok: true }; }
    if (a.tipo !== 'parola') return { errore: 'Mossa non valida' };
    const w = D.normalizza(a.testo);
    const err = this.controlla(w);
    if (err) { this.ultimoErrore = { chi: p, testo: err }; return { errore: err }; }
    this.catena.push({ w, chi: p });
    this.usate.add(w);
    this.punti[p] += 1;
    if (w.length >= 9) this.annuncia(p, `dice "${w}": che parolona!`, `"${w}": che parolona!`);
    this.passaA(this.n === 1 ? p : this.prossimo(p));
    return { ok: true };
  }
  perdeVita(p, come) {
    this.vite[p]--;
    if (this.vite[p] === 0) { this.fuori.push(p); this.annuncia(p, `${come === 'passa' ? 'passa' : 'non trova la parola'} ed è fuori!`, 'hai finito le vite: sei fuori', true); }
    else this.annuncia(p, `${come === 'passa' ? 'passa' : 'non trova la parola in tempo'}: perde una vita`, `${come === 'passa' ? 'passi' : 'tempo scaduto'}: perdi una vita`);
    const vivi = this.vivi();
    if ((this.n > 1 && vivi.length <= 1) || !vivi.length) return this.chiudi();
    // la catena riparte dalla stessa parola con chi viene dopo
    this.passaA(this.n === 1 ? p : this.prossimo(p));
    return null;
  }
  // il trucco segreto (!win): al suo turno gli sussurra la parola del computer difficile (valida e difficile da continuare)
  suggerimentoWin(posto) {
    if (this.finita || this.turno !== posto) return null;
    for (let k = 0; k < 5; k++) { const a = bot(this, posto, 'difficile'); if (a.tipo === 'parola' && !this.controlla(a.testo)) return `⛓️ ${a.testo.toUpperCase()}`; }
    return null;
  }
  scadenza() { return this.finita ? null : this.fineTurno; }
  controllaTempo() {
    if (this.finita || Date.now() < this.fineTurno) return false;
    this.perdeVita(this.turno, 'tempo');
    return true;
  }
  salta(p) { if (p === this.turno && !this.finita) this.perdeVita(p, 'passa'); }
  chiudi() {
    this.finita = true; this.turno = null;
    const vivi = this.vivi();
    let vincitori;
    if (this.n === 1) { vincitori = [0]; this.annuncia(0, `catena di ${this.punti[0]} parole`, `la tua catena: ${this.punti[0]} parole!`, true); } else {
      vincitori = vivi.length ? vivi : [this.fuori[this.fuori.length - 1]];
      this.annuncia(vincitori[0], 'resta l\'ultimo in gara: vince!', 'sei l\'ultimo rimasto: hai vinto!', true);
    }
    // classifica: prima chi è rimasto, poi in ordine inverso di uscita; a parità le parole dette
    const posto = new Array(this.n).fill(0);
    this.fuori.forEach((q, k) => { posto[q] = k; });
    for (const q of vivi) posto[q] = this.n;
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: this.n === 1 ? x : posto[i] * 100 + x })), etichetta: this.n === 1 ? 'parole' : 'punti', pareggio: false, vincitori };
    if (this.n > 1) this.risultato.fazioni.forEach((f, i) => { f.parole = this.punti[i]; });
    return { ok: true };
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, nLettere: this.nLettere, catena: this.catena.slice(-14), lunghezza: this.catena.length - 1,
      attacco: this.finita ? null : this.attacco(), vite: this.vite, punti: this.punti, fuori: this.fuori,
      resta: this.finita ? 0 : Math.max(0, this.fineTurno - Date.now()), tempo: this.tempo,
      ultimoErrore: this.ultimoErrore && this.ultimoErrore.chi === p ? this.ultimoErrore.testo : null,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// conosce le parole secondo il livello (il facile solo le molto comuni); il difficile sceglie parole che finiscono con
// lettere difficili da continuare, per mettere in difficoltà chi viene dopo
// le parole già dette contate per inizio (tutte quelle che il computer conosce, e le comuni), per sapere quante
// continuazioni restano senza scorrere le liste
const COMUNI = { 1: new Map(), 2: new Map() };
const comuniDi = (k, n) => {
  if (!COMUNI[n].has(k)) COMUNI[n].set(k, (indice()[n].get(k) || []).filter((x) => D.fascia(x) >= 2).length);
  return COMUNI[n].get(k);
};
function dette(usate, n) {
  const tutte = new Map(), com = new Map();
  for (const w of usate) {
    const f = D.fascia(w);
    if (!f || w.length < 4 || w.length > 11) continue;
    const k = w.slice(0, n);
    tutte.set(k, (tutte.get(k) || 0) + 1);
    if (f >= 2) com.set(k, (com.get(k) || 0) + 1);
  }
  return {
    restano: (k) => (indice()[n].get(k) || []).length - (tutte.get(k) || 0),
    comuni: (k) => comuniDi(k, n) - (com.get(k) || 0),
  };
}

// le parole che ogni livello conosce, per inizio
const CONOSCE = new Map();

function bot(g, p, livello) {
  const n = g.nLettere, k = g.attacco();
  const minFascia = { facile: 3, medio: 2, difficile: 1 }[livello];
  const sbaglia = { facile: 0.12, medio: 0.04, difficile: 0.01 }[livello];
  if (Math.random() < sbaglia) return { tipo: 'passo' };
  const chiave = `${n}${livello}${k}`;
  if (!CONOSCE.has(chiave)) CONOSCE.set(chiave, (indice()[n].get(k) || []).filter((w) => D.fascia(w) >= minFascia && w.length <= (livello === 'facile' ? 7 : 11)));
  const cand = CONOSCE.get(chiave).filter((w) => !g.usate.has(w));
  const dd = dette(g.usate, n);
  const buone = cand.filter((w) => dd.restano(coda(w, n)) > 0);
  if (!buone.length) return { tipo: 'passo' };
  if (livello === 'difficile') {
    // la più "cattiva": meno continuazioni comuni possibile (ma almeno una)
    const conVal = buone.map((w) => ({ w, c: dd.comuni(coda(w, n)) }));
    conVal.sort((a, b) => a.c - b.c || Math.random() - 0.5);
    const scelta = conVal.find((x) => x.c > 0) || conVal[0];
    return { tipo: 'parola', testo: scelta.w };
  }
  return { tipo: 'parola', testo: buone[Math.floor(Math.random() * buone.length)] };
}

module.exports = {
  meta: {
    id: 'catena',
    nome: 'Catena di parole',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    tipo: 'tabellone',
    descrizione: 'Ogni parola comincia con le ultime due lettere della precedente: cane, neve, verde… Contro il tempo, con tre vite.',
    alias: ['catena di parole', 'parole a catena', 'catena', 'parole concatenate', 'ultima sillaba', 'shiritori'],
    opzioni: [
      { id: 'lettere', nome: 'Si attacca con', valori: ['due', 'una'], etichette: ['Le ultime due lettere', 'L\'ultima lettera (più facile)'], predefinito: 'due' },
      { id: 'tempo', nome: 'Tempo per parola', valori: TEMPI, etichette: ['20 secondi', '12 secondi (veloce)', '30 secondi'], predefinito: 20 },
      { id: 'vite', nome: 'Vite', valori: [3, 1, 5], etichette: ['3 vite', '1 vita', '5 vite'], predefinito: 3 },
    ],
    regole: [
      'Si parte da una parola scelta dal computer. A turno ognuno scrive una parola che cominci con le ULTIME DUE lettere della parola prima (con l\'altra opzione basta l\'ultima): cane → NEve → VErde → DEnte…',
      'Valgono le parole italiane del dizionario dei giochi di parole (anche plurali, femminili e voci dei verbi), di almeno 3 lettere, senza accenti. Non si può ripetere una parola già detta.',
      'La parola deve lasciare almeno una parola per continuare: se nessuna parola comincia con le sue ultime lettere, non vale.',
      'Ognuno ha il suo tempo (20 secondi, o quello scelto). Se scade, o se passi, perdi una vita e la catena continua dalla stessa parola con chi viene dopo. Chi finisce le vite è fuori: vince l\'ultimo rimasto.',
      'Da soli si gioca contro il tempo: fai la catena più lunga che puoi prima di finire le vite.',
      'Il computer facile conosce solo le parole più comuni e ogni tanto non trova niente; il medio ne conosce di più; il difficile sceglie apposta parole che finiscono con lettere difficili da continuare.',
    ],
  },
  crea: (o) => new Catena(o),
  bot,
  _test: { indice, continuazioni, coda },
};
