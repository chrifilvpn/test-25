// TEXAS HOLD'EM no-limit, senza bui: 2 carte a testa, 5 carte comuni (flop, turn, river).
const { Poker, migliore, nomeMano, equita, forzaMano, decidi, MINIMO } = require('./poker-motore');

const T = require('./trucco');

const STRADE = ['preflop', 'flop', 'turn', 'river'];
const CAT_DI = (punti) => Math.floor(punti / 759375); // 15^5: la categoria della mano dai punti di valuta5

class Texas extends Poker {
  constructor(o) { super(o); this.id = 'texas'; }

  distribuisci() {
    this.tavola = [];
    this.strada = 0;
    this.truccaMano(2, (mano, tavola) => migliore([...mano, ...tavola]).punti);
    for (let giro = 0; giro < 2; giro++) for (let k = 1; k <= this.n; k++) {
      const i = (this.dealer + k) % this.n;
      if (this.inMano[i]) this.carte[i].push(this.pesca());
    }
  }
  valuta(i) { return migliore([...this.carte[i], ...this.tavola]); }

  // il trucco segreto (!win): si rimescola il mazzo finché il giocatore truccato non avrà, a fine mano, la mano
  // migliore del tavolo e almeno una scala (stesse 52 carte, solo in un altro ordine). Lo usa anche l'Omaha.
  truccaMano(perMano, punti) {
    let chi = -1;
    for (let i = 0; i < this.n && chi < 0; i++) if (this.inMano[i] && T.consuma(this, i)) chi = i;
    if (chi < 0) return false;
    const ordine = [];
    for (let giro = 0; giro < perMano; giro++) for (let k = 1; k <= this.n; k++) { const i = (this.dealer + k) % this.n; if (this.inMano[i]) ordine.push(i); }
    const m = this.mazzo;
    let scorta = null;
    for (let prova = 0; prova < 5000; prova++) {
      for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
      let k = m.length;
      const mani = Array.from({ length: this.n }, () => []);
      for (const i of ordine) mani[i].push(m[--k]);
      const tav = [];
      for (const q of [3, 1, 1]) { k--; for (let x = 0; x < q; x++) tav.push(m[--k]); } // carta bruciata, poi la strada
      const mio = punti(mani[chi], tav);
      let meglio = true;
      for (let i = 0; i < this.n && meglio; i++) if (i !== chi && this.inMano[i] && punti(mani[i], tav) >= mio) meglio = false;
      if (!meglio) continue;
      if (CAT_DI(mio) >= 4) return true;
      if (!scorta) scorta = m.slice();
    }
    if (scorta) this.mazzo = scorta;
    return true;
  }

  scopriStrada() {
    this.strada++;
    this.pesca(); // carta bruciata
    const quante = this.strada === 1 ? 3 : 1;
    for (let k = 0; k < quante; k++) this.tavola.push(this.pesca());
  }

  fineGiro() {
    if (this.strada === 3) return this.confronto();
    const possono = this.inMano.filter((x, i) => x && !this.allin[i]).length;
    if (possono < 2) { // nessuno può più puntare: le carte escono da sole, una strada alla volta
      this.fase = 'corsa';
      this.turno = null;
      this.pausaMs = 1400;
      this.inAttesa = true;
      return { ok: true };
    }
    this.scopriStrada();
    this.iniziaGiro();
    return { ok: true };
  }
  avanzaCorsa() {
    if (this.fase !== 'corsa') return;
    this.scopriStrada();
    if (this.strada === 3) { this.inAttesa = false; this.confronto(); }
  }

  azione(p, a) {
    if (!a) return { errore: 'Mossa non valida' };
    if (this.inAttesa) return { errore: 'Aspetta un momento' };
    if (this.fase === 'attesa') return { errore: 'Servono almeno due giocatori con le fiche' };
    return this.azioneGiro(p, a);
  }

  vista(p) {
    const v = this.vistaComune(p);
    v.tavola = this.tavola || [];
    v.strada = STRADE[this.strada || 0];
    v.miaMano = this.inMano && this.carte && this.carte[p] && this.carte[p].length ? nomeMano(migliore([...this.carte[p], ...(this.tavola || [])])) : null;
    v.forza = this.finita || this.fase !== 'giro' && this.fase !== 'cambio' ? null : forzaMano(this, p, { tavola: this.tavola || [] });
    return v;
  }
}

function bot(g, p, livello) {
  const avversari = g.inMano.filter((x, i) => x && i !== p).length;
  const eq = equita(g.carte[p], g.tavola, Math.max(1, avversari), { giri: livello === 'facile' ? 60 : 220 });
  return decidi(g, p, livello, eq);
}

module.exports = {
  meta: {
    id: 'texas',
    nome: 'Texas Hold\'em',
    tipo: 'tabellone',
    fiche: true,
    saltaAssenti: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Poker no-limit con 2 carte a testa e 5 comuni. Senza bui, con le fiche.',
    opzioni: [],
    regole: [
      'Ogni giocatore parte con 1000 fiche; chi le finisce guarda le mani successive finché non scrive !ricarica in chat (1000 fiche, solo quando è a zero). I computer si ricaricano da soli.',
      'Non ci sono bui né puntate obbligatorie: all\'inizio di ogni giro si può passare. Il mazziere (bottone D) gira a ogni mano e parla per primo chi gli siede a sinistra.',
      'Ognuno riceve 2 carte coperte. Poi, con un giro di puntate prima di ognuna, escono le carte comuni: 3 insieme (flop), una (turn) e l\'ultima (river).',
      'Al tuo turno: Passa (se nessuno ha puntato), Punta (almeno 5 fiche), Vedi (metti quanto l\'ultima puntata), Rilancia (almeno quanto l\'ultimo rilancio) o Lascia (abbandoni la mano). No-limit: puoi puntare fino a tutte le tue fiche (all-in). Hai 30 secondi, poi passi o lasci automaticamente.',
      'Se tutti gli altri lasciano, vinci il piatto senza mostrare le carte. Altrimenti, dopo il river, vince chi forma la mano migliore di 5 carte usando le sue 2 e le 5 comuni.',
      'Mani dalla più forte: scala reale, scala colore, poker, full, colore, scala, tris, doppia coppia, coppia, carta alta. L\'asso vale come carta più alta ma anche per la scala A-2-3-4-5. A parità conta la carta più alta (il "kicker"); se è tutto uguale il piatto si divide.',
      'All-in: se vai all-in con meno fiche degli altri puoi vincere solo quanto hai messo tu da ciascuno; il resto forma un piatto laterale tra gli altri.',
    ],
  },
  crea: (o) => new Texas(o),
  bot,
  _test: { CAT_DI },
};
