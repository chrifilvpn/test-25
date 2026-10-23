// UNBLOCK ME ("Sblocca il blocco rosso"): griglia 6×6 piena di blocchi di legno. Quelli orizzontali scorrono solo a destra
// e a sinistra, quelli verticali solo su e giù. Bisogna far uscire il blocco rosso dall'apertura sul lato destro.
// Sfida: tutti ricevono lo stesso puzzle nello stesso momento e lo risolvono ognuno sulla propria griglia; conta chi
// finisce per primo. Da soli contano le mosse (le stelle). I puzzle sono generati a caso e il server li risolve prima
// di darli, così sono sempre risolvibili e si sa il numero minimo di mosse.
const RACCOLTA = require('./sblocca-puzzle');
const L = 6, USCITA = 2, TEMPO = 180000;
const LIVELLI = { facile: [4, 8], medio: [9, 14], difficile: [15, 60] };
const casuale = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// celle occupate da un blocco { o: 'h' | 'v', l, r, c }
const celle = (b) => Array.from({ length: b.l }, (_, k) => (b.o === 'h' ? [b.r, b.c + k] : [b.r + k, b.c]));
function griglia(bl) { const g = Array.from({ length: L }, () => new Array(L).fill(-1)); bl.forEach((b, i) => celle(b).forEach(([r, c]) => { g[r][c] = i; })); return g; }
// posizioni raggiungibili dal blocco i (scivolando finché la strada è libera)
function posizioni(bl, i, g = griglia(bl)) {
  const b = bl[i], out = [];
  for (const d of [-1, 1]) for (let s = 1; s < L; s++) {
    const r = b.o === 'v' ? b.r + d * s : b.r, c = b.o === 'h' ? b.c + d * s : b.c;
    const testa = b.o === 'h' ? [r, d > 0 ? c + b.l - 1 : c] : [d > 0 ? r + b.l - 1 : r, c];
    if (testa[0] < 0 || testa[1] < 0 || testa[0] >= L || testa[1] >= L || g[testa[0]][testa[1]] !== -1) break;
    out.push({ r, c });
  }
  return out;
}
const risolto = (bl) => bl[0].c + bl[0].l === L;
const chiave = (bl) => bl.map((b) => b.r * L + b.c).join('.');
// ricerca in ampiezza: la strada più corta (lista di mosse) dalla situazione attuale
function risolvi(bl, limite = 60000) {
  const inizio = bl.map((b) => ({ ...b }));
  const da = new Map([[chiave(inizio), null]]), stati = [inizio];
  for (let q = 0; q < stati.length; q++) {
    if (stati.length > limite) return null;
    const s = stati[q];
    if (risolto(s)) {
      const mosse = []; let k = chiave(s);
      while (da.get(k)) { const x = da.get(k); mosse.unshift(x.mossa); k = x.prima; }
      return mosse;
    }
    const g = griglia(s), ks = chiave(s);
    for (let i = 0; i < s.length; i++) for (const p of posizioni(s, i, g)) {
      const n = s.map((b, j) => (j === i ? { ...b, r: p.r, c: p.c } : b)), kn = chiave(n);
      if (da.has(kn)) continue;
      da.set(kn, { prima: ks, mossa: { b: i, r: p.r, c: p.c } }); stati.push(n);
    }
  }
  return null;
}
// tutte le posizioni raggiungibili da una disposizione di blocchi e, per ognuna, quante mosse mancano alla soluzione
// (le mosse sono reversibili: si parte da tutte le posizioni risolte e si va all'indietro)
function mappaDistanze(bl, limite = 40000) {
  const stati = [bl], indice = new Map([[chiave(bl), 0]]), vicini = [];
  for (let q = 0; q < stati.length; q++) {
    if (stati.length > limite) return null;
    const st = stati[q], g = griglia(st), v = [];
    for (let i = 0; i < st.length; i++) for (const p of posizioni(st, i, g)) {
      const n = st.map((x, j) => (j === i ? { ...x, r: p.r, c: p.c } : x)), k = chiave(n);
      if (!indice.has(k)) { indice.set(k, stati.length); stati.push(n); }
      v.push(indice.get(k));
    }
    vicini.push(v);
  }
  const dist = new Int32Array(stati.length).fill(-1), coda = [];
  stati.forEach((st, i) => { if (risolto(st)) { dist[i] = 0; coda.push(i); } });
  for (let q = 0; q < coda.length; q++) for (const j of vicini[coda[q]]) if (dist[j] < 0) { dist[j] = dist[coda[q]] + 1; coda.push(j); }
  return { stati, dist };
}
// un puzzle nuovo con un numero minimo di mosse nella fascia voluta (si tiene il più vicino trovato)
function genera(livello, ms = 900, fascia = null) {
  const [min, max] = fascia || LIVELLI[livello] || LIVELLI.medio;
  let meglio = null, distanza = Infinity;
  const fine = Date.now() + ms, limite = Date.now() + ms * 4;
  for (let tentativo = 0; tentativo < 5000 && (Date.now() < fine || (!meglio && Date.now() < limite)); tentativo++) {
    const bl = [{ o: 'h', l: 2, r: USCITA, c: casuale(0, 1) }];
    const g = griglia(bl), quanti = casuale(9, 13);
    for (let k = 0; k < 80 && bl.length < quanti; k++) {
      const o = Math.random() < 0.55 ? 'v' : 'h', l = Math.random() < 0.72 ? 2 : 3;
      const r = casuale(0, o === 'v' ? L - l : L - 1), c = casuale(0, o === 'h' ? L - l : L - 1);
      if (o === 'h' && r === USCITA) continue; // un blocco orizzontale nella riga dell'uscita la chiuderebbe per sempre
      const b = { o, l, r, c };
      if (celle(b).some(([x, y]) => g[x][y] !== -1)) continue;
      celle(b).forEach(([x, y]) => { g[x][y] = bl.length; });
      bl.push(b);
    }
    const m = mappaDistanze(bl);
    if (!m) continue;
    // la partenza più adatta tra tutte quelle raggiungibili (il blocco rosso non deve essere già vicino all'uscita)
    let scelta = -1, d = Infinity;
    for (let i = 0; i < m.stati.length; i++) {
      const x = m.dist[i]; if (x < 3) continue;
      const dd = x < min ? min - x : x > max ? x - max : 0;
      if (dd < d || (dd === d && dd === 0 && Math.random() < 0.05)) { d = dd; scelta = i; }
    }
    if (scelta < 0) continue;
    if (d < distanza) { distanza = d; meglio = { blocchi: m.stati[scelta].map((x) => ({ ...x })), minimo: m.dist[scelta] }; }
    if (d === 0) break;
  }
  return meglio;
}

class Sblocca {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'sblocca';
    this.n = n;
    // i computer li fa muovere la partita stessa, ognuno col suo ritmo (le mosse degli altri non li fanno aspettare)
    this.botLiv = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.livello = LIVELLI[opzioni.livello] ? opzioni.livello : 'medio';
    this.nRound = [1, 3, 5].includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.round = 0;
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inAttesa = false; this.pausaMs = 3500; this.turno = null;
    this.nuovoRound();
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  nuovoRound() {
    this.round++;
    // un puzzle della raccolta (verificata) che non è ancora uscito in questa partita
    this.usati = this.usati || new Set();
    const lista = RACCOLTA[this.livello].filter((x) => !this.usati.has(x));
    const scelto = (lista.length ? lista : RACCOLTA[this.livello])[Math.floor(Math.random() * (lista.length || RACCOLTA[this.livello].length))];
    this.usati.add(scelto);
    const [cod, m] = scelto.split(':');
    const pz = { blocchi: cod.match(/.{4}/g).map((x) => ({ o: x[0], l: Number(x[1]), r: Number(x[2]), c: Number(x[3]) })), minimo: Number(m) };
    this.iniziale = pz.blocchi; this.minimo = pz.minimo;
    // indietro: le posizioni prima di ogni mossa (per "Annulla"); aiuto: la prossima mossa giusta chiesta con "Aiuto"
    this.tavole = Array.from({ length: this.n }, () => ({ blocchi: pz.blocchi.map((b) => ({ ...b })), mosse: 0, fatto: null, indietro: [], aiuto: null, aiuti: 0 }));
    this.arrivi = [];
    this.inizio = Date.now(); this.fine = this.inizio + TEMPO;
    this.menti = {};
    this.prossimaBot = this.botLiv.map((l) => (l ? this.inizio + ritmo(l) + 1500 : null));
  }
  attesi() { return this.inAttesa || this.finita ? [] : this.tavole.map((t, i) => (t.fatto === null && !this.botLiv[i] ? i : -1)).filter((i) => i >= 0); }
  scadenza() {
    if (this.inAttesa || this.finita) return null;
    const bot = this.prossimaBot.filter((x, i) => x !== null && this.tavole[i].fatto === null);
    return Math.min(this.fine, ...bot);
  }
  controllaTempo() {
    if (this.finita || this.inAttesa) return false;
    const ora = Date.now();
    let cambiato = false;
    for (let p = 0; p < this.n; p++) {
      if (!this.botLiv[p] || this.tavole[p].fatto !== null || this.prossimaBot[p] > ora) continue;
      const r = this.azione(p, bot(this, p, this.botLiv[p]));
      if (r.errore) this.menti[p] = null;
      this.prossimaBot[p] = ora + ritmo(this.botLiv[p]);
      cambiato = true;
      if (this.inAttesa) return true;
    }
    if (ora >= this.fine) { this.chiudiRound(true); return true; }
    return cambiato;
  }
  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo: arriva il prossimo puzzle' };
    const t = this.tavole[p];
    if (!t || t.fatto !== null) return { errore: 'Hai già risolto questo puzzle' };
    if (!a) return { errore: 'Mossa non valida' };
    if (a.tipo === 'pensa') return { ok: true };
    if (a.tipo === 'ricomincia') { t.indietro.push(t.blocchi); t.blocchi = this.iniziale.map((b) => ({ ...b })); t.aiuto = null; return { ok: true }; }
    // annulla l'ultima mossa: vale come una mossa (è come rimettere il blocco dov'era)
    if (a.tipo === 'annulla') {
      if (!t.indietro.length) return { errore: 'Non c\'è niente da annullare' };
      t.blocchi = t.indietro.pop(); t.mosse++; t.aiuto = null;
      return { ok: true };
    }
    // aiuto: la prossima mossa della strada più corta, al prezzo di 2 mosse
    if (a.tipo === 'aiuto') {
      if (t.aiuto) return { ok: true };
      const strada = risolvi(t.blocchi);
      if (!strada || !strada.length) return { errore: 'Nessun aiuto disponibile' };
      t.aiuto = strada[0]; t.mosse += 2; t.aiuti++;
      return { ok: true };
    }
    if (a.tipo !== 'muovi') return { errore: 'Mossa non valida' };
    const i = Number(a.b), r = Number(a.r), c = Number(a.c);
    if (!t.blocchi[i]) return { errore: 'Blocco sconosciuto' };
    if (!posizioni(t.blocchi, i).some((q) => q.r === r && q.c === c)) return { errore: 'Il blocco non può arrivare lì' };
    t.indietro.push(t.blocchi.map((b) => ({ ...b })));
    if (t.indietro.length > 200) t.indietro.shift();
    t.blocchi[i] = { ...t.blocchi[i], r, c }; t.mosse++;
    t.aiuto = null;
    if (risolto(t.blocchi)) {
      t.fatto = Date.now() - this.inizio; this.arrivi.push(p);
      const pos = this.arrivi.length;
      const stelle = t.mosse <= this.minimo ? 3 : t.mosse <= Math.ceil(this.minimo * 1.5) ? 2 : 1;
      t.stelle = stelle;
      const guadagno = this.n === 1 ? stelle : ([3, 2, 1][pos - 1] || 0) + (stelle === 3 ? 1 : 0);
      this.punti[p] += guadagno;
      this.annuncia(p, `libera il blocco rosso in ${t.mosse} mosse${this.n > 1 ? ` (${pos}°)` : ''}! ${'⭐'.repeat(stelle)}`, `blocco liberato in ${t.mosse} mosse (minimo ${this.minimo})! ${'⭐'.repeat(stelle)}`, pos === 1);
      if (this.attesi().length === 0) this.chiudiRound(false);
    }
    return { ok: true };
  }
  // !win + parola segreta: le prossime mosse della strada più corta (gratis e solo per te)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || this.inAttesa || !t || t.fatto !== null) return null;
    const strada = risolvi(t.blocchi);
    if (!strada || !strada.length) return null;
    const bl = t.blocchi.map((b) => ({ ...b })), frasi = [];
    for (const m of strada.slice(0, 3)) {
      const b = bl[m.b];
      const nome = m.b === 0 ? 'rosso' : b.o === 'v' ? `verticale in colonna ${b.c + 1} (righe ${b.r + 1}-${b.r + b.l})` : `orizzontale in riga ${b.r + 1} (colonne ${b.c + 1}-${b.c + b.l})`;
      const d = b.o === 'v' ? m.r - b.r : m.c - b.c;
      const verso = b.o === 'v' ? (d > 0 ? 'giù' : 'su') : d > 0 ? 'a destra' : 'a sinistra';
      frasi.push(`Blocco ${nome} ${verso} di ${Math.abs(d)}`);
      bl[m.b] = { ...b, r: m.r, c: m.c };
    }
    return `💡 ${frasi.join(' → ')}`;
  }
  chiudiRound(tempo) {
    this.storico.push(this.tavole.map((t) => (t.fatto === null ? null : { mosse: t.mosse, ms: t.fatto, stelle: t.stelle })));
    if (tempo) this.annuncia(null, 'Tempo scaduto!', 'Tempo scaduto!', true);
    this.inAttesa = true;
  }
  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    if (this.round >= this.nRound) return this.chiudi();
    this.nuovoRound();
  }
  chiudi() {
    this.finita = true; this.inAttesa = false;
    const max = Math.max(...this.punti), v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: this.n === 1 ? 'stelle' : 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    return { ok: true };
  }
  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      gioco: this.id, n: this.n, round: this.round, nRound: this.nRound, livello: this.livello, lato: L, uscita: USCITA,
      blocchi: t.blocchi, mosse: t.mosse, fatto: t.fatto, stelle: t.stelle || 0, minimo: this.minimo,
      aiuto: t.aiuto, aiuti: t.aiuti, puoAnnullare: t.indietro.length > 0,
      altri: this.tavole.map((x) => ({ mosse: x.mosse, fatto: x.fatto, stelle: x.stelle || 0 })), arrivi: this.arrivi,
      resta: Math.max(0, this.fine - Date.now()), punti: this.punti, storico: this.storico,
      turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// quanto aspetta tra una mossa e l'altra (millisecondi)
const ritmo = (l) => ({ facile: 1500 + Math.random() * 2200, medio: 1000 + Math.random() * 1500, difficile: 700 + Math.random() * 900 })[l] || 1500;
// segue la strada più corta; il facile e il medio ogni tanto si fermano a pensare o fanno una mossa a caso
function bot(g, p, livello) {
  const t = g.tavole[p];
  const m = g.menti[p] || (g.menti[p] = { strada: null });
  const caso = { facile: 0.3, medio: 0.1, difficile: 0 }[livello];
  if (Math.random() < caso) {
    const scelte = []; t.blocchi.forEach((_, i) => posizioni(t.blocchi, i).forEach((q) => scelte.push({ b: i, ...q })));
    m.strada = null;
    const x = scelte[Math.floor(Math.random() * scelte.length)];
    return { tipo: 'muovi', ...x };
  }
  if (!m.strada || !m.strada.length) m.strada = risolvi(t.blocchi) || [];
  const x = m.strada.shift();
  return x ? { tipo: 'muovi', ...x } : { tipo: 'pensa' };
}

module.exports = {
  meta: {
    id: 'sblocca',
    nome: 'Sblocca il blocco',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Il classico Unblock Me: fai scorrere i blocchi di legno e libera quello rosso. Tutti con lo stesso puzzle: chi lo risolve prima?',
    alias: ['unblock me', 'unblock', 'rush hour', 'blocchi', 'sblocca', 'puzzle', 'blocco rosso'],
    velocitaBot: 1,
    opzioni: [
      { id: 'livello', nome: 'Difficoltà', valori: ['medio', 'facile', 'difficile'], etichette: ['Media (9-14 mosse)', 'Facile (4-8 mosse)', 'Difficile (15 mosse o più)'], predefinito: 'medio' },
      { id: 'round', nome: 'Puzzle', valori: [3, 1, 5], etichette: ['3 puzzle', '1 puzzle', '5 puzzle'], predefinito: 3 },
    ],
    regole: [
      'Una griglia 6×6 piena di blocchi di legno. I blocchi orizzontali scorrono solo a destra e a sinistra, quelli verticali solo su e giù, e non si possono scavalcare. Trascina un blocco con il mouse o con il dito: si ferma sulla casella dove lo lasci.',
      'Devi far uscire il blocco rosso dall\'apertura sul lato destro della griglia.',
      'Ogni puzzle è generato a caso e risolto dal server prima di dartelo: è sempre risolvibile e si sa il numero minimo di mosse (una mossa = far scorrere un blocco, anche di più caselle). Difficoltà: facile 4-8 mosse, media 9-14, difficile 15 o più.',
      'Sfida: tutti ricevono lo stesso puzzle nello stesso momento, ognuno sulla sua griglia; si vede quante mosse hanno fatto gli altri e chi ha finito. Il primo prende 3 punti, il secondo 2, il terzo 1; chi usa il numero minimo di mosse prende 1 punto in più. Ci sono 3 minuti per puzzle.',
      'Da soli: ogni puzzle vale da 1 a 3 stelle (3 stelle con il numero minimo di mosse, 2 fino a una volta e mezza).',
      '"Ricomincia" rimette il puzzle com\'era (le mosse fatte restano contate). "Annulla" rimette il blocco dov\'era prima dell\'ultima mossa (conta come una mossa).',
      '"💡 Aiuto" fa vedere la prossima mossa della strada più corta (il blocco da spostare e dove), ma costa 2 mosse.',
      'Il computer conosce la strada più corta: il difficile la segue velocemente, il medio è più lento e ogni tanto sbaglia, il facile è lento e fa spesso mosse a caso.',
    ],
  },
  crea: (o) => new Sblocca(o),
  bot,
  _test: { genera, risolvi, posizioni, risolto, LIVELLI, mappaDistanze, RACCOLTA },
};
