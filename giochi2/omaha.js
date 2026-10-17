// POKER OMAHA: come il Texas Hold'em del sito (stesso motore, stesso tavolo), ma con 4 carte a testa e l'obbligo di
// usare ESATTAMENTE 2 carte proprie e 3 delle 5 comuni. Pot Limit (si punta al massimo quanto c'è nel piatto) oppure
// No Limit; un'ante facoltativa a ogni mano mette qualcosa nel piatto (non ci sono bui).
const texas = require('../giochi/texas');
const { valuta5, nomeMano, MINIMO, decidi } = require('../giochi/poker-motore');

// la classe del Texas del sito: la si riusa così com'è (strade, giri di puntate, corsa all-in, confronto)
const Texas = texas.crea({ n: 2, primo: 0, fiche: [1000, 1000], opzioni: {} }).constructor;

// ---------- valutazione veloce per le simulazioni: stessi punti di valuta5 ----------
// carta → numero: valore 2..14 nei bit alti, seme 0..3 nei due bassi
const SEMI = { c: 0, q: 1, f: 2, p: 3 };
const num = (c) => ((c.rango === 1 ? 14 : c.rango) << 2) | SEMI[c.seme];
function punti5(a, b, c, d, e) {
  // valori ordinati dal più alto
  const v = [a >> 2, b >> 2, c >> 2, d >> 2, e >> 2];
  for (let i = 1; i < 5; i++) { const x = v[i]; let j = i - 1; while (j >= 0 && v[j] < x) { v[j + 1] = v[j]; j--; } v[j + 1] = x; }
  const s = a & 3;
  const colore = (b & 3) === s && (c & 3) === s && (d & 3) === s && (e & 3) === s;
  let scala = 0;
  if (v[0] !== v[1] && v[1] !== v[2] && v[2] !== v[3] && v[3] !== v[4]) {
    if (v[0] - v[4] === 4) scala = v[0];
    else if (v[0] === 14 && v[1] === 5) scala = 5;
  }
  let cat, k0 = 0, k1 = 0, k2 = 0, k3 = 0, k4 = 0;
  if (scala) { cat = colore ? 8 : 4; k0 = scala; }
  else {
    // gruppi: (quanti, valore) ordinati per quanti poi valore
    const g = [];
    for (let i = 0; i < 5;) { let j = i; while (j < 5 && v[j] === v[i]) j++; g.push((j - i) * 16 + v[i]); i = j; }
    g.sort((x, y) => y - x);
    const forme = g.map((x) => x >> 4).join('');
    const ks = g.map((x) => x & 15);
    if (forme === '41') cat = 7; else if (forme === '32') cat = 6; else if (colore) cat = 5;
    else if (forme === '311') cat = 3; else if (forme === '221') cat = 2; else if (forme === '2111') cat = 1; else cat = 0;
    if (cat === 5 || cat === 0) { [k0, k1, k2, k3, k4] = v; } else { [k0, k1, k2, k3, k4] = [ks[0], ks[1] || 0, ks[2] || 0, ks[3] || 0, 0]; }
  }
  return ((((cat * 15 + k0) * 15 + k1) * 15 + k2) * 15 + k3) * 15 + k4;
}
// migliore mano Omaha (numeri): 2 delle carte in mano × 3 del tavolo
function puntiOmaha(mano, tav) {
  let best = -1;
  const nm = mano.length, nt = tav.length;
  for (let i = 0; i < nm; i++) for (let j = i + 1; j < nm; j++) {
    for (let a = 0; a < nt; a++) for (let b = a + 1; b < nt; b++) for (let c = b + 1; c < nt; c++) {
      const p = punti5(mano[i], mano[j], tav[a], tav[b], tav[c]);
      if (p > best) best = p;
    }
  }
  return best;
}
// la migliore Omaha con le carte vere (per il confronto e i nomi): { punti, cat, chiavi, carte }
function miglioreOmaha(mano, tavola) {
  let best = null;
  for (let i = 0; i < mano.length; i++) for (let j = i + 1; j < mano.length; j++) {
    for (let a = 0; a < tavola.length; a++) for (let b = a + 1; b < tavola.length; b++) for (let c = b + 1; c < tavola.length; c++) {
      const cs = [mano[i], mano[j], tavola[a], tavola[b], tavola[c]];
      const r = valuta5(cs);
      if (!best || r.punti > best.punti) best = { ...r, carte: cs };
    }
  }
  return best;
}

// probabilità di vincere contro "avversari" mani a caso (Monte Carlo)
function equitaOmaha(mie, tavola, avversari, giri = 300) {
  if (process.env.TEST_VELOCE) giri = Math.min(giri, 30);
  const note = new Set([...mie, ...tavola].map(num));
  const resto = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) { const x = (r << 2) | s; if (!note.has(x)) resto.push(x); }
  const m = mie.map(num), t0 = tavola.map(num);
  let vinte = 0;
  const serve = avversari * 4 + (5 - t0.length);
  for (let g = 0; g < giri; g++) {
    for (let i = 0; i < serve; i++) { const j = i + Math.floor(Math.random() * (resto.length - i)); const x = resto[i]; resto[i] = resto[j]; resto[j] = x; }
    let k = 0;
    const board = t0.slice();
    while (board.length < 5) board.push(resto[k++]);
    const mio = puntiOmaha(m, board);
    let meglio = true, pari = 0;
    for (let a = 0; a < avversari; a++) {
      const suo = puntiOmaha(resto.slice(k, k + 4), board); k += 4;
      if (suo > mio) { meglio = false; break; }
      if (suo === mio) pari++;
    }
    if (meglio) vinte += pari ? 1 / (pari + 1) : 1;
  }
  return vinte / giri;
}

// forza della mano prima del flop (computer facile e medio, senza simulazioni): coppie alte, carte collegate e dello stesso seme
function forzaPreflop(mano) {
  const v = mano.map((c) => (c.rango === 1 ? 14 : c.rango)).sort((a, b) => b - a);
  let s = 0;
  const conta = {};
  for (const x of v) conta[x] = (conta[x] || 0) + 1;
  for (const [x, n] of Object.entries(conta)) { if (n === 2) s += Number(x) >= 10 ? 3 : 1.5; if (n >= 3) s -= 2; }
  const semi = {};
  for (const c of mano) semi[c.seme] = (semi[c.seme] || 0) + 1;
  for (const n of Object.values(semi)) if (n === 2) s += 1; else if (n >= 3) s += 0.5;
  const uniche = [...new Set(v)];
  for (let i = 0; i + 1 < uniche.length; i++) if (uniche[i] - uniche[i + 1] <= 2) s += 0.7;
  s += v.filter((x) => x >= 11).length * 0.5;
  return s; // tipicamente da 0 a 9
}

class Omaha extends Texas {
  constructor(o) {
    const opz = o.opzioni || {};
    // prima di super(): il costruttore distribuisce già la prima mano
    Omaha.prossime = { potLimit: opz.limite !== 'nolimit', ante: [0, 5, 10].includes(Number(opz.ante)) ? Number(opz.ante) : 5 };
    super(o);
    this.id = 'omaha';
  }
  get potLimit() { return this._pl !== undefined ? this._pl : (this._pl = Omaha.prossime.potLimit); }
  get ante() { return this._ante !== undefined ? this._ante : (this._ante = Omaha.prossime.ante); }

  distribuisci() {
    this.tavola = [];
    this.strada = 0;
    // l'ante: tutti quelli in mano mettono qualcosa nel piatto
    if (this.ante) for (let i = 0; i < this.n; i++) if (this.inMano[i]) this.metti(i, Math.min(this.ante, this.fiche[i]));
    if (this.puntataGiro) this.puntataGiro.fill(0);
    for (let giro = 0; giro < 4; giro++) for (let k = 1; k <= this.n; k++) {
      const i = (this.dealer + k) % this.n;
      if (this.inMano[i]) this.carte[i].push(this.pesca());
    }
  }
  metti(p, quanto) {
    if (!this.puntataGiro) this.puntataGiro = new Array(this.n).fill(0);
    super.metti(p, quanto);
  }
  valuta(i) { return miglioreOmaha(this.carte[i], this.tavola); }

  // Pot Limit: si può portare la puntata al massimo a "quello che c'è da vedere + il piatto dopo aver visto"
  azioniPossibili(p) {
    const az = super.azioniPossibili(p);
    if (!az || !az.punta || !this.potLimit) return az;
    const deve = this.massimo - this.puntataGiro[p];
    const tetto = Math.max(MINIMO, this.massimo + this.piatto() + deve);
    return { ...az, punta: { min: az.punta.min, max: Math.min(az.punta.max, Math.max(tetto, az.punta.min)) } };
  }

  forza(p) {
    if (!this.inMano || !this.inMano[p] || !this.carte[p] || this.carte[p].length !== 4) return null;
    const avversari = this.inMano.filter((x, i) => x && i !== p).length;
    if (!avversari) return null;
    const chiave = `${this.carte[p].map((c) => c.id).join(',')}|${this.tavola.map((c) => c.id).join(',')}|${avversari}`;
    this._forzaO = this._forzaO || {};
    if (!this._forzaO[p] || this._forzaO[p].chiave !== chiave) this._forzaO[p] = { chiave, v: Math.round(100 * equitaOmaha(this.carte[p], this.tavola, avversari, 500)) };
    return { percento: this._forzaO[p].v, avversari };
  }

  vista(p) {
    const v = this.vistaComune(p);
    v.tavola = this.tavola || [];
    v.strada = ['preflop', 'flop', 'turn', 'river'][this.strada || 0];
    const mie = this.inMano && this.carte && this.carte[p] && this.carte[p].length === 4 ? this.carte[p] : null;
    v.miaMano = mie && v.tavola.length >= 3 ? nomeMano(miglioreOmaha(mie, v.tavola)) : null;
    v.mieUsate = mie && v.tavola.length >= 3 ? miglioreOmaha(mie, v.tavola).carte.map((c) => c.id) : null;
    v.forza = this.fase !== 'giro' ? null : this.forza(p);
    v.potLimit = this.potLimit;
    v.ante = this.ante;
    return v;
  }
}

function bot(g, p, livello) {
  const avversari = g.inMano.filter((x, i) => x && i !== p).length;
  let eq;
  if (livello !== 'difficile' && g.tavola.length === 0) {
    // prima del flop facile e medio guardano solo la forma della mano
    const f = forzaPreflop(g.carte[p]);
    eq = Math.min(0.9, (1 / (avversari + 1)) * (0.55 + f * 0.13));
  } else {
    eq = equitaOmaha(g.carte[p], g.tavola, Math.max(1, avversari), livello === 'facile' ? 60 : livello === 'medio' ? 160 : 400);
  }
  // il difficile corregge per il numero di avversari: in Omaha le mani sono vicine, conta essere sopra la media
  if (livello === 'difficile' && avversari > 1) eq = Math.min(1, eq * (1 + 0.08 * (avversari - 1)));
  return decidi(g, p, livello, eq);
}

module.exports = {
  meta: {
    id: 'omaha',
    nome: 'Poker Omaha',
    tipo: 'tabellone',
    fiche: true,
    saltaAssenti: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Come il Texas Hold\'em ma con 4 carte in mano: devi usarne esattamente 2, più 3 delle 5 comuni. Pot Limit, con le fiche.',
    alias: ['omaha', 'poker omaha', 'plo', 'pot limit omaha', 'omaha hold\'em', 'poker 4 carte'],
    opzioni: [
      { id: 'limite', nome: 'Puntate', valori: ['pot', 'nolimit'], etichette: ['Pot Limit (classico)', 'No Limit'], predefinito: 'pot' },
      { id: 'ante', nome: 'Ante a ogni mano', valori: [5, 10, 0], etichette: ['5 fiche', '10 fiche', 'Nessuna'], predefinito: 5 },
    ],
    regole: [
      'Ogni giocatore parte con 1000 fiche; chi le finisce guarda le mani successive finché non scrive !ricarica in chat (1000 fiche, solo quando è a zero). I computer si ricaricano da soli.',
      'Non ci sono bui: a ogni mano ognuno mette nel piatto un\'ante (5 fiche, oppure 10 o niente, da scegliere prima di iniziare). Il mazziere (bottone D) gira a ogni mano e parla per primo chi gli siede a sinistra.',
      'Ognuno riceve 4 carte coperte. Poi, con un giro di puntate prima di ognuna, escono le carte comuni: 3 insieme (flop), una (turn) e l\'ultima (river).',
      'LA REGOLA DELL\'OMAHA: la mano finale si forma con ESATTAMENTE 2 delle tue 4 carte e ESATTAMENTE 3 delle 5 comuni. Per esempio con 4 cuori in tavola e un solo cuore in mano non hai colore; con un poker d\'assi in mano hai solo una coppia d\'assi più quello che c\'è in tavola. Sotto le tue carte vedi sempre il nome della tua mano migliore e quali carte usa.',
      'Al tuo turno: Passa (se nessuno ha puntato), Punta (almeno 5 fiche), Vedi, Rilancia o Lascia. Hai 30 secondi, poi passi o lasci automaticamente.',
      'POT LIMIT (predefinito): la puntata più alta possibile è "il piatto": puoi portare la tua puntata fino a quanto devi vedere più tutto quello che ci sarebbe nel piatto dopo aver visto. Il pulsante Piatto la imposta da solo. Con No Limit puoi puntare tutte le tue fiche quando vuoi.',
      'Se tutti gli altri lasciano vinci il piatto senza mostrare le carte. Altrimenti, dopo il river, vince la mano migliore (scala reale, scala colore, poker, full, colore, scala, tris, doppia coppia, coppia, carta alta); a parità il piatto si divide. Chi va all-in con meno fiche vince solo la parte di piatto che ha coperto (piatti laterali).',
      'Il computer facile e quello medio giudicano la mano prima del flop dalla sua forma (coppie, carte collegate e dello stesso seme), poi con poche simulazioni; il difficile stima sempre con centinaia di simulazioni quante volte vince contro le mani possibili, rispettando la regola delle 2 + 3, e punta in proporzione al piatto, bluffando ogni tanto.',
    ],
  },
  crea: (o) => new Omaha(o),
  bot,
  _test: { punti5, puntiOmaha, miglioreOmaha, equitaOmaha, num, forzaPreflop },
};
