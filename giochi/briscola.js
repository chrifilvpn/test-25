const { mazzo40, mescola, valore40, casuale, nomeCarta } = require('./carte');
const T = require('./trucco');

const ORDINE = [1, 3, 10, 9, 8, 7, 6, 5, 4, 2]; // asso, tre, re, donna, fante, 7 ... 2
const PUNTI = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 };
const forza = (c) => 10 - ORDINE.indexOf(valore40(c));
const punti = (c) => PUNTI[valore40(c)] || 0;

function vincitoreDi(tavolo, semeBriscola) {
  let m = tavolo[0];
  for (const g of tavolo.slice(1)) {
    if (g.carta.seme === m.carta.seme) { if (forza(g.carta) > forza(m.carta)) m = g; }
    else if (g.carta.seme === semeBriscola) m = g;
  }
  return m.posto;
}

class Briscola {
  constructor({ n, primo = 0 }) {
    this.id = 'briscola';
    this.n = n;
    this.aSquadre = n === 4;
    let mazzo = mazzo40();
    if (n === 3) mazzo = mazzo.filter((c) => c.id !== '2c'); // in tre si toglie il 2 di cuori
    this.mazzo = mescola(mazzo);
    this.mani = Array.from({ length: n }, () => []);
    this.prese = Array.from({ length: n }, () => []);
    this.tavolo = [];
    this.turno = primo;
    this.inAttesa = false;
    this.pausaMs = 1500;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    for (let g = 0; g < 3; g++) for (let k = 0; k < n; k++) this.mani[(primo + k) % n].push(this.mazzo.pop());
    this.briscola = this.mazzo.pop();
    this.mazzo.unshift(this.briscola); // scoperta sotto il mazzo: sarà l'ultima pescata
  }

  annuncia(posto, testo, testoIo, forte = false) {
    this.evento = { id: ++this.nEv, posto, testo, testoIo, forte };
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta che si raccolga la mano' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'gioca') return { errore: 'Mossa non valida' };
    const i = this.mani[p].findIndex((c) => c.id === a.carta);
    if (i < 0) return { errore: 'Non hai questa carta' };
    const [c] = this.mani[p].splice(i, 1);
    this.tavolo.push({ posto: p, carta: c });
    if (this.tavolo.length === this.n) { this.inAttesa = true; this.turno = null; }
    else this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    const v = vincitoreDi(this.tavolo, this.briscola.seme);
    const carte = this.tavolo.map((g) => g.carta);
    const pt = carte.reduce((s, c) => s + punti(c), 0);
    this.prese[v].push(...carte);
    this.annuncia(v, `prende ${pt} ${pt === 1 ? 'punto' : 'punti'}`, `prendi ${pt} ${pt === 1 ? 'punto' : 'punti'}`);
    this.tavolo = [];
    if (this.mazzo.length >= this.n) for (let k = 0; k < this.n; k++) {
      const q = (v + k) % this.n;
      if (T.consuma(this, q)) this.truccaPescata();
      this.mani[q].push(this.mazzo.pop());
    }
    this.inAttesa = false;
    this.turno = v;
    if (this.mani.every((m) => m.length === 0)) this.chiudi();
  }

  // il trucco segreto (!win): in cima al mazzo la briscola più alta che c'è ancora (non quella scoperta sotto)
  truccaPescata() {
    const B = this.briscola.seme;
    const alte = this.mazzo.filter((c) => c.seme === B && c !== this.briscola);
    const c = T.migliore(alte, forza);
    if (c) T.inCima(this.mazzo, (x) => x === c);
  }

  // a mazzo finito non si pesca più: il trucco diventa il consiglio della carta da giocare
  suggerimentoWin(p) {
    if (this.mazzo.length >= this.n || this.turno !== p || this.inAttesa || !this.mani[p].length) return null;
    const a = bot(this, p, 'difficile');
    const c = this.mani[p].find((x) => x.id === a.carta);
    return c ? `💡 Gioca ${nomeCarta(c)}` : null;
  }

  chiudi() {
    this.finita = true;
    this.turno = null;
    const pg = this.prese.map((p) => p.reduce((s, c) => s + punti(c), 0));
    const fazioni = this.aSquadre
      ? [{ posti: [0, 2], punti: pg[0] + pg[2] }, { posti: [1, 3], punti: pg[1] + pg[3] }]
      : pg.map((x, i) => ({ posti: [i], punti: x }));
    const max = Math.max(...fazioni.map((f) => f.punti));
    const top = fazioni.filter((f) => f.punti === max);
    this.risultato = { fazioni, etichetta: 'punti', pareggio: top.length > 1, vincitori: top.length === 1 ? top[0].posti : [] };
  }

  vista(p) {
    return {
      gioco: this.id,
      n: this.n,
      aSquadre: this.aSquadre,
      mano: this.mani[p] || [],
      carteInMano: this.mani.map((m) => m.length),
      tavolo: this.tavolo,
      briscola: this.briscola,
      mazzo: this.mazzo.length,
      turno: this.turno,
      inAttesa: this.inAttesa,
      maniPrese: this.prese.map((x) => x.length / this.n),
      finita: this.finita,
      risultato: this.risultato,
      evento: this.evento,
    };
  }
}

// ---------- Computer ----------
function bot(g, p, livello) {
  const mano = g.mani[p];
  const gioca = (c) => ({ tipo: 'gioca', carta: c.id });
  if (livello === 'facile') return gioca(casuale(mano));

  const B = g.briscola.seme;
  const isB = (c) => c.seme === B;
  // "liscio": la carta che costa meno buttare
  const costo = (c) => (isB(c) ? 20 + forza(c) : 0) + punti(c) * 2 + forza(c) * 0.1;
  const perCosto = [...mano].sort((a, b) => costo(a) - costo(b));
  const liscio = perCosto[0];

  if (g.tavolo.length === 0) {
    if (livello === 'difficile' && g.mazzo.length === 0) {
      // a fine mazzo: se ho la briscola più alta rimasta, la gioco per prendere
      const giocate = new Set([...g.prese.flat(), ...mano].map((c) => c.id));
      const briscoleFuori = mazzo40().filter((c) => c.seme === B && !giocate.has(c.id));
      const mieB = mano.filter(isB).sort((a, b) => forza(b) - forza(a));
      if (mieB.length && briscoleFuori.every((c) => forza(c) < forza(mieB[0]))) return gioca(mieB[0]);
    }
    return gioca(liscio);
  }

  const puntiTavolo = g.tavolo.reduce((s, x) => s + punti(x.carta), 0);
  const vinceOra = vincitoreDi(g.tavolo, B);
  const compagnoVince = g.aSquadre && vinceOra % 2 === p % 2;
  const ultimo = g.tavolo.length === g.n - 1;

  if (compagnoVince) {
    // il compagno sta prendendo: se sono ultimo (o al difficile) gli carico punti
    if (ultimo || livello === 'difficile') {
      const carichi = mano.filter((c) => !isB(c) && punti(c) > 0).sort((a, b) => punti(b) - punti(a));
      if (carichi.length && (ultimo || forza(g.tavolo.find((x) => x.posto === vinceOra).carta) >= 8)) return gioca(carichi[0]);
    }
    return gioca(liscio);
  }

  const vincenti = mano.filter((c) => vincitoreDi([...g.tavolo, { posto: p, carta: c }], B) === p);
  const lisciVincenti = vincenti.filter((c) => !isB(c)).sort((a, b) => punti(b) - punti(a));
  const briscoleVincenti = vincenti.filter(isB).sort((a, b) => forza(a) - forza(b));

  if (lisciVincenti.length) return gioca(lisciVincenti[0]); // prendo senza sprecare briscole
  const soglia = livello === 'difficile' ? (ultimo ? 3 : 10) : 10;
  if (briscoleVincenti.length && puntiTavolo >= soglia) {
    const b = briscoleVincenti[0];
    // non sprecare asso o tre di briscola per pochi punti
    if (punti(b) < 10 || puntiTavolo >= 10) return gioca(b);
  }
  return gioca(liscio);
}

module.exports = {
  meta: {
    id: 'briscola',
    nome: 'Briscola',
    giocatori: [2, 3, 4],
    descrizione: 'Il classico: prendi più punti degli altri. In quattro si gioca in coppia.',
    opzioni: [],
    regole: [
      'Si gioca con 40 carte: dall\'asso al 7, più fante, donna e re. In tre si toglie il 2 di cuori.',
      'Ognuno riceve 3 carte. Una carta scoperta sotto il mazzo indica il seme di briscola, e sarà l\'ultima pescata.',
      'A turno ognuno gioca una carta. Prende la briscola più alta; se non ci sono briscole prende la carta più alta del seme giocato per primo.',
      'Ordine di forza: asso, tre, re, donna, fante, 7, 6, 5, 4, 2.',
      'Punti: asso 11, tre 10, re 4, donna 3, fante 2. In tutto sono 120: vince chi ne fa almeno 61.',
      'Chi prende pesca per primo e gioca per primo la mano successiva.',
      'In quattro giocano in coppia i giocatori seduti uno di fronte all\'altro.',
      'Le carte in mano sono in ordine di seme (la briscola in fondo) e dalla più debole alla più forte. Sulle carte che valgono punti c\'è un numerino in alto a destra: asso 11, tre 10, re 4, donna 3, fante 2.',
    ],
  },
  crea: (o) => new Briscola(o),
  bot,
  _test: { vincitoreDi, punti, forza },
};
