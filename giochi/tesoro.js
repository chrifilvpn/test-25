// SCAVA IL TESORO: griglia coperta, sotto ci sono monete, gemme, bombe o niente. Hai 10 scavi e scegli tu dove.
// La bomba ti fa perdere 2 scavi. Dove non trovi niente compare un numero: quanti tesori (monete o gemme) ci sono
// nelle caselle vicine, anche in diagonale. Così si può ragionare su dove scavare.
// Modalità "sfida": ognuno ha la sua griglia, uguale per tutti, e si scava tutti insieme.
// Modalità "a turni": una sola griglia condivisa, uno scavo a testa a turno.
const VALORE = { moneta: 1, gemma: 5 };
const SCAVI = 10;

function crea(lato) {
  const tot = lato * lato;
  const gemme = Math.round(tot * 0.08), monete = Math.round(tot * 0.28), bombe = Math.round(tot * 0.12);
  const contenuto = [...Array(gemme).fill('gemma'), ...Array(monete).fill('moneta'), ...Array(bombe).fill('bomba')];
  while (contenuto.length < tot) contenuto.push('niente');
  for (let i = contenuto.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [contenuto[i], contenuto[j]] = [contenuto[j], contenuto[i]]; }
  return contenuto;
}
function vicini(i, lato) {
  const r = Math.floor(i / lato), c = i % lato, v = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < lato && cc >= 0 && cc < lato) v.push(rr * lato + cc);
  }
  return v;
}
const tesoro = (x) => x === 'moneta' || x === 'gemma';

class Tesoro {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'tesoro';
    this.n = n;
    this.modo = n > 1 && opzioni.modo === 'turni' ? 'turni' : 'sfida';
    this.lato = this.modo === 'sfida' ? 5 : n <= 2 ? 5 : n <= 4 ? 6 : 7;
    this.contenuto = crea(this.lato);
    this.numeri = this.contenuto.map((x, i) => (x === 'niente' ? vicini(i, this.lato).filter((k) => tesoro(this.contenuto[k])).length : null));
    const cap = this.modo === 'turni' ? Math.min(SCAVI, Math.floor((this.lato * this.lato * 0.8) / n)) : SCAVI;
    this.scaviIniziali = cap;
    this.scavi = new Array(n).fill(cap);
    this.punti = new Array(n).fill(0);
    this.trovati = Array.from({ length: n }, () => ({ moneta: 0, gemma: 0, bomba: 0 }));
    // sfida: una griglia per giocatore (stesso contenuto); a turni: una sola, condivisa
    this.griglie = this.modo === 'sfida' ? Array.from({ length: n }, () => new Array(this.lato ** 2).fill(null)) : [new Array(this.lato ** 2).fill(null)];
    this.turno = this.modo === 'turni' ? primo % n : null;
    this.fase = 'scavo';
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultimo = new Array(n).fill(null);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  grigliaDi(p) { return this.modo === 'sfida' ? this.griglie[p] : this.griglie[0]; }
  // fasi simultanee: chi deve ancora scavare
  attesi() { return this.modo === 'sfida' && !this.finita ? this.scavi.map((s, i) => (s > 0 ? i : -1)).filter((i) => i >= 0) : []; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a || a.tipo !== 'scava') return { errore: 'Scegli una casella da scavare' };
    if (this.modo === 'turni' && p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (this.scavi[p] <= 0) return { errore: 'Hai finito gli scavi' };
    const g = this.grigliaDi(p);
    const c = Number(a.cella);
    if (!Number.isInteger(c) || c < 0 || c >= g.length) return { errore: 'Casella non valida' };
    if (g[c]) return { errore: 'Qui si è già scavato' };
    const x = this.contenuto[c];
    g[c] = { posto: p, cosa: x, numero: this.numeri[c] };
    this.scavi[p]--;
    this.ultimo[p] = c;
    if (x === 'bomba') {
      this.scavi[p] = Math.max(0, this.scavi[p] - 2);
      this.trovati[p].bomba++;
      this.annuncia(p, 'trova una bomba! 💣 −2 scavi', 'bomba! 💣 Perdi 2 scavi', this.modo === 'turni');
    } else if (tesoro(x)) {
      this.punti[p] += VALORE[x];
      this.trovati[p][x]++;
      if (this.modo === 'turni' || x === 'gemma') this.annuncia(p, x === 'gemma' ? 'trova una gemma! 💎 +5' : 'trova una moneta 🪙 +1', x === 'gemma' ? 'una gemma! 💎 +5' : 'una moneta! 🪙 +1', x === 'gemma');
    }
    if (this.modo === 'turni') {
      const libere = g.some((y) => !y);
      if (!libere || this.scavi.every((s) => s <= 0)) return this.chiudi();
      for (let k = 1; k <= this.n; k++) { const i = (p + k) % this.n; if (this.scavi[i] > 0) { this.turno = i; break; } }
    } else if (this.scavi.every((s) => s <= 0)) return this.chiudi();
    return { ok: true };
  }

  // chi è assente nella sfida: il server fa scavare il computer al suo posto (vedi server.js)
  chiudi() {
    this.finita = true;
    this.turno = null;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    if (this.n === 1) Object.assign(this.risultato, { pareggio: false, vincitori: [0], titolo: `Hai trovato ${this.punti[0]} punti di tesoro` });
    return { ok: true };
  }

  // trucco segreto (!win): dove sono le gemme e le monete ancora coperte (prima le gemme), tante quanti gli scavi rimasti
  suggerimentoWin(p) {
    if (this.finita || this.scavi[p] <= 0 || (this.modo === 'turni' && this.turno !== p)) return null;
    const g = this.grigliaDi(p);
    const buone = this.contenuto.map((x, i) => (tesoro(x) && !g[i] ? i : -1)).filter((i) => i >= 0)
      .sort((a, b) => VALORE[this.contenuto[b]] - VALORE[this.contenuto[a]]).slice(0, Math.min(this.scavi[p], 5));
    if (!buone.length) return null;
    const nome = (i) => `${this.contenuto[i] === 'gemma' ? '💎' : '🪙'} riga ${Math.floor(i / this.lato) + 1} col ${(i % this.lato) + 1}`;
    return `💡 Scava qui: ${buone.map(nome).join(', ')}`;
  }

  vista(p) {
    const mia = this.grigliaDi(p);
    return {
      gioco: this.id, n: this.n, modo: this.modo, lato: this.lato, turno: this.turno, fase: this.fase, inAttesa: false,
      griglia: mia, scavi: this.scavi, scaviIniziali: this.scaviIniziali, punti: this.punti, trovati: this.trovati, ultimo: this.ultimo[p],
      // a fine partita si vede tutto quello che c'era sotto
      tutto: this.finita ? this.contenuto : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Stima per ogni casella coperta la probabilità che ci sia un tesoro, usando i numeri scoperti vicino.
function stima(g, griglia) {
  const lato = g.lato;
  const coperte = griglia.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  const tesoriTot = g.contenuto.filter(tesoro).length;
  const trovatiTot = griglia.filter((x) => x && tesoro(x.cosa)).length;
  const base = (tesoriTot - trovatiTot) / Math.max(1, coperte.length);
  const somma = new Map(coperte.map((i) => [i, { s: 0, k: 0 }]));
  griglia.forEach((x, i) => {
    if (!x || x.cosa !== 'niente') return;
    const v = vicini(i, lato);
    const cop = v.filter((k) => !griglia[k]);
    if (!cop.length) return;
    const noti = v.filter((k) => griglia[k] && tesoro(griglia[k].cosa)).length;
    const pr = Math.max(0, x.numero - noti) / cop.length;
    for (const k of cop) { const o = somma.get(k); o.s += pr; o.k++; }
  });
  return coperte.map((i) => { const o = somma.get(i); return { i, p: o.k ? o.s / o.k : base }; });
}
function bot(g, p, livello) {
  const griglia = g.grigliaDi(p);
  const lista = stima(g, griglia);
  const caso = lista[Math.floor(Math.random() * lista.length)].i;
  if (livello === 'facile') return { tipo: 'scava', cella: caso };
  lista.sort((a, b) => b.p - a.p + (Math.random() - 0.5) * (livello === 'medio' ? 0.25 : 0.02));
  if (livello === 'medio' && Math.random() < 0.3) return { tipo: 'scava', cella: caso };
  return { tipo: 'scava', cella: lista[0].i };
}

module.exports = {
  meta: {
    id: 'tesoro',
    nome: 'Scava il tesoro',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Griglia coperta e 10 scavi: trova monete e gemme, evita le bombe. Da soli, in sfida o a turni.',
    alias: ['tesoro', 'scavo'],
    opzioni: [
      { id: 'modo', nome: 'Modalità', valori: ['sfida', 'turni'], etichette: ['Sfida: una griglia a testa, uguale per tutti', 'A turni: una griglia condivisa'], predefinito: 'sfida' },
    ],
    regole: [
      'C\'è una griglia 5×5 coperta. Sotto ogni casella c\'è una moneta (1 punto), una gemma (5 punti), una bomba o niente.',
      'Hai 10 scavi: a ogni scavo scegli tu la casella. La bomba non toglie punti ma ti fa perdere 2 scavi in più.',
      'Dove non trovi niente compare un numero: quanti tesori (monete o gemme) ci sono nelle 8 caselle intorno, diagonali comprese. Usalo per capire dove scavare. Le bombe non vengono contate.',
      'Sfida (anche da soli): ognuno ha la sua griglia, con gli stessi tesori negli stessi posti per tutti, e si scava tutti insieme senza vedere le griglie degli altri. Si vedono solo i punti e gli scavi rimasti.',
      'A turni: una sola griglia per tutti (5×5 in due, 6×6 in tre o quattro, 7×7 in cinque o sei), uno scavo a testa a turno. Quello che scopre uno lo vedono tutti e resta suo. Gli scavi a testa sono 10, o meno se si è in tanti, perché la griglia basti per tutti.',
      'Quando tutti hanno finito gli scavi (o la griglia è tutta scavata) vince chi ha più punti. A fine partita si vede tutto quello che c\'era sotto.',
      'Il computer facile scava a caso, il medio guarda i numeri ma si distrae, il difficile calcola dove è più probabile un tesoro.',
    ],
  },
  crea: (o) => new Tesoro(o),
  bot,
  _test: { vicini, crea },
};
