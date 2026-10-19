// BACCARAT (Punto Banco): si punta su Punto, Banco o Pareggio; le carte seguono regole fisse.
// Da 1 a 8 giocatori, 8 mazzi. Punto paga 1:1, Banco 1:1 meno il 5% di commissione, Pareggio 8:1
// (col pareggio le puntate su Punto e Banco tornano indietro).
const { Casino, scarpa, puntataBot } = require('./casino');
const T = require('./trucco');

const MAZZI = 8;
const valore = (c) => (c.rango >= 10 ? 0 : c.rango);
const punti = (carte) => carte.reduce((s, c) => s + valore(c), 0) % 10;

// il banco pesca la terza carta? (t3 = valore della terza carta del Punto, null se il Punto non ha pescato)
function bancoPesca(b, t3) {
  if (t3 === null) return b <= 5;
  if (b <= 2) return true;
  if (b === 3) return t3 !== 8;
  if (b === 4) return t3 >= 2 && t3 <= 7;
  if (b === 5) return t3 >= 4 && t3 <= 7;
  if (b === 6) return t3 === 6 || t3 === 7;
  return false;
}

// una mano completa, già decisa: l'ordine in cui scoprire le carte
function distribuisci(pesca) {
  const P = [pesca()], B = [pesca()];
  P.push(pesca()); B.push(pesca());
  const ordine = [['punto', 0], ['banco', 0], ['punto', 1], ['banco', 1]];
  let t3 = null;
  const naturale = punti(P) >= 8 || punti(B) >= 8;
  if (!naturale) {
    if (punti(P) <= 5) { const c = pesca(); P.push(c); t3 = valore(c); ordine.push(['punto', 2]); }
    if (bancoPesca(punti(B), t3)) { B.push(pesca()); ordine.push(['banco', 2]); }
  }
  const p = punti(P), b = punti(B);
  return { P, B, ordine, naturale, vince: p > b ? 'punto' : b > p ? 'banco' : 'pareggio' };
}

class Baccarat extends Casino {
  constructor(o) {
    super(o);
    this.id = 'baccarat';
    this.scarpa = scarpa(MAZZI);
    this.totale = this.scarpa.length;
    this.storia = [];
    this.pausaMs = 800;
    this.apriPuntate();
  }
  pesca() { if (!this.scarpa.length) this.scarpa = scarpa(MAZZI); return this.scarpa.pop(); }

  apriPuntate() {
    super.apriPuntate();
    this.puntate = Array.from({ length: this.n }, () => ({ punto: 0, banco: 0, pareggio: 0 }));
    this.mano = null;
    this.scoperte = 0;
    this.esiti = null;
    this.mescolata = false;
    if (this.scarpa && this.scarpa.length < 60) { this.scarpa = scarpa(MAZZI); this.mescolata = true; }
  }

  azione(p, a) {
    if (!a) return { errore: 'Mossa non valida' };
    if (this.inAttesa || this.fase !== 'puntate') return { errore: 'Aspetta la prossima mano' };
    if (a.tipo === 'passa') return this.passa(p);
    if (a.tipo !== 'punta') return { errore: 'Mossa non valida' };
    if (this.puntato[p] || this.passato[p]) return { errore: 'Hai già deciso per questa mano' };
    const q = a.puntate || {};
    const v = ['punto', 'banco', 'pareggio'].map((k) => Number(q[k] || 0));
    if (v.some((x) => !Number.isInteger(x) || x < 0)) return { errore: 'Puntata non valida' };
    const tot = v[0] + v[1] + v[2];
    if (!tot) return { errore: 'Metti almeno una fiche su Punto, Banco o Pareggio' };
    if (tot > this.fiche[p]) return { errore: `Hai solo ${this.fiche[p]} fiche` };
    this.fiche[p] -= tot;
    this.puntate[p] = { punto: v[0], banco: v[1], pareggio: v[2] };
    this.segnaPuntata(p);
    return { ok: true };
  }

  gioca() {
    this.fase = 'carte';
    // il trucco segreto (!win): vince la parte su cui il giocatore truccato ha puntato di più
    const chi = this.puntate.findIndex((q, i) => this.puntato[i] && T.consuma(this, i));
    if (chi >= 0) this.truccaScarpa(this.preferita(this.puntate[chi]));
    this.mano = distribuisci(() => this.pesca());
    this.scoperte = 0;
    this.pausaMs = 800;
    this.inAttesa = true; // le carte si scoprono una alla volta
    return { ok: true };
  }

  preferita(q) { return ['punto', 'banco', 'pareggio'].reduce((a, b) => (q[b] > q[a] ? b : a)); }
  // rimescola le prime carte della scarpa finché la mano non esce come serve (le carte restano le stesse;
  // la scarpa ha sempre almeno 60 carte, vedi apriPuntate)
  truccaScarpa(vince) {
    for (let prova = 0; prova < 3000; prova++) {
      let k = this.scarpa.length;
      if (distribuisci(() => this.scarpa[--k]).vince === vince) return true;
      for (let j = this.scarpa.length - 6; j < this.scarpa.length; j++) {
        const x = Math.floor(Math.random() * this.scarpa.length);
        [this.scarpa[j], this.scarpa[x]] = [this.scarpa[x], this.scarpa[j]];
      }
    }
    return false;
  }

  avanza() {
    if (!this.inAttesa) return;
    if (this.fase === 'carte') {
      this.scoperte++;
      if (this.scoperte >= this.mano.ordine.length) this.paga();
      return;
    }
    if (this.fase === 'pagamenti') { this.inAttesa = false; this.apriPuntate(); }
  }

  paga() {
    this.fase = 'pagamenti';
    const v = this.mano.vince;
    this.storia.push(v);
    if (this.storia.length > 60) this.storia.shift();
    this.esiti = this.puntate.map((q, p) => {
      let ritorno = 0;
      if (v === 'pareggio') ritorno = q.pareggio * 9 + q.punto + q.banco;
      else if (v === 'punto') ritorno = q.punto * 2;
      else ritorno = q.banco + Math.floor(q.banco * 0.95);
      this.fiche[p] += ritorno;
      return { netto: ritorno - (q.punto + q.banco + q.pareggio), puntato: q.punto + q.banco + q.pareggio };
    });
    const n = { punto: 'Vince il Punto', banco: 'Vince il Banco', pareggio: 'Pareggio!' }[v];
    this.annuncia(null, `${n} (${punti(this.mano.P)} a ${punti(this.mano.B)})`, '', true);
    this.pausaMs = 4500;
    return { ok: true };
  }

  vista() {
    let mano = null;
    if (this.mano) {
      const vis = new Set(this.mano.ordine.slice(0, this.fase === 'pagamenti' ? this.mano.ordine.length : this.scoperte).map(([l, k]) => `${l}${k}`));
      const lato = (l, carte) => carte.map((c, k) => (vis.has(`${l}${k}`) ? c : null)).filter((c, k) => k < 2 || vis.has(`${l}${k}`));
      const P = lato('punto', this.mano.P), B = lato('banco', this.mano.B);
      mano = { punto: P, banco: B, puntiP: punti(P.filter(Boolean)), puntiB: punti(B.filter(Boolean)), vince: this.fase === 'pagamenti' ? this.mano.vince : null, naturale: this.mano.naturale };
    }
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: null, inAttesa: this.inAttesa,
      fiche: this.fiche, puntato: this.puntato, passato: this.passato, puntate: this.puntate,
      mano, esiti: this.esiti, storia: this.storia.slice(-40), mescolata: this.mescolata,
      tempoPuntate: this.tempoPuntateMs(), carteScarpa: this.scarpa.length, nMano: this.nMano,
      finita: false, risultato: null, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// Il Banco è la puntata con lo svantaggio più basso (circa 1,06%), il Pareggio la peggiore (circa 14%).
function bot(g, p, livello) {
  const x = puntataBot(g.fiche[p], livello);
  const q = { punto: 0, banco: 0, pareggio: 0 };
  if (livello === 'difficile') q.banco = x;
  else if (livello === 'medio') q[Math.random() < 0.6 ? 'banco' : 'punto'] = x;
  else q[['punto', 'banco', 'pareggio'][Math.random() < 0.2 ? 2 : Math.floor(Math.random() * 2)]] = x;
  return { tipo: 'punta', puntate: q };
}

module.exports = {
  meta: {
    id: 'baccarat',
    nome: 'Baccarat',
    tipo: 'tabellone',
    fiche: true,
    saltaAssenti: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Punto Banco con le fiche: scommetti su Punto, Banco o Pareggio.',
    opzioni: [],
    regole: [
      'Ogni giocatore parte con 1000 fiche; quando le finisci puoi scrivere !ricarica in chat per averne altre 1000.',
      'Prima delle carte tutti puntano insieme: puoi mettere fiche su Punto, su Banco, su Pareggio, anche su più di uno. Non ci sono minimo e massimo. Dopo la prima puntata gli altri hanno 20 secondi; puoi anche passare la mano.',
      'Valori: dal 2 al 9 il numero della carta, l\'asso vale 1, il 10 e le figure valgono 0. Conta solo l\'ultima cifra della somma: 7 + 8 = 15 vale 5. Il punteggio massimo è 9.',
      'Si danno due carte al Punto e due al Banco. Se uno dei due ha 8 o 9 (naturale) ci si ferma subito.',
      'Terza carta del Punto: la prende con 0-5, sta con 6 o 7.',
      'Terza carta del Banco: se il Punto non ha pescato, il Banco pesca con 0-5 e sta con 6-7. Se il Punto ha pescato, dipende dalla sua terza carta: il Banco con 0-2 pesca sempre; con 3 pesca tranne se la terza del Punto è un 8; con 4 pesca se è da 2 a 7; con 5 se è da 4 a 7; con 6 se è 6 o 7; con 7 sta.',
      'Vince chi si avvicina di più a 9. Pagamenti: Punto 1 a 1; Banco 1 a 1 meno il 5% di commissione (punti 100, vinci 95); Pareggio 8 a 1. Se esce il pareggio le puntate su Punto e Banco ti vengono restituite.',
      'Si gioca con 8 mazzi. Le carte si scoprono una alla volta; sotto vedi gli esiti delle ultime mani. I computer seduti al tavolo si ricaricano da soli.',
    ],
  },
  crea: (o) => new Baccarat(o),
  bot,
  _test: { distribuisci, bancoPesca, punti },
};
