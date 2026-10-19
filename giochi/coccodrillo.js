// COCCODRILLO: 13 denti, a turno se ne preme uno. Uno solo, scelto a caso e segreto, fa chiudere la bocca.
// Chi viene morso è eliminato, i denti tornano su e si ricomincia. L'ultimo rimasto vince. Da 2 a 8, con il computer.
const T = require('./trucco');
const DENTI = 13;
const PAUSA_MORSO = 2600;

class Coccodrillo {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'coccodrillo';
    this.n = n;
    this.conPasso = opzioni.passo === 'si';
    this.vivi = new Array(n).fill(true);
    this.eliminati = [];       // in ordine di morso
    this.turno = primo % n;
    this.morsi = 0;            // quante bocche si sono chiuse (serve al disegno)
    this.nuovaBocca();
    this.fase = 'gioco';
    this.inAttesa = false;
    this.pausaMs = PAUSA_MORSO;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultimo = null;        // { dente, posto, morso }
  }

  nuovaBocca() {
    this.premuti = new Array(DENTI).fill(false);
    this.cattivo = Math.floor(Math.random() * DENTI);
    this.passi = new Array(this.n).fill(this.conPasso); // un passo a testa per ogni bocca
    this.protetti = new Set(); // chi ha il trucco segreto attivo per questa bocca
  }

  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  quantiVivi() { return this.vivi.filter(Boolean).length; }
  prossimo(da) {
    for (let k = 1; k <= this.n; k++) { const i = (da + k) % this.n; if (this.vivi[i]) return i; }
    return null;
  }
  liberi() { return this.premuti.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Il coccodrillo sta riaprendo la bocca…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a) return { errore: 'Mossa non valida' };
    if (a.tipo === 'passa') {
      if (!this.passi[p]) return { errore: this.conPasso ? 'Hai già usato il tuo passo per questa bocca' : 'In questa partita non si può passare' };
      if (this.liberi().length <= 1) return { errore: 'È rimasto un solo dente: tocca a te premerlo!' };
      this.passi[p] = false;
      this.annuncia(p, 'passa la mano 😅', 'hai passato la mano');
      this.ultimo = null;
      this.turno = this.prossimo(p);
      return { ok: true };
    }
    if (a.tipo !== 'premi') return { errore: 'Premi un dente' };
    const d = Number(a.dente);
    if (!Number.isInteger(d) || d < 0 || d >= DENTI) return { errore: 'Dente non valido' };
    if (this.premuti[d]) return { errore: 'Questo dente è già premuto' };
    this.premuti[d] = true;
    // il trucco segreto (!win): per tutta questa bocca chi l'ha attivato non viene morso (il dente cattivo "era"
    // un altro), e se dopo questa pressione gli resterebbe solo il dente cattivo, a mordere è chi preme adesso
    for (let i = 0; i < this.n; i++) if (T.consuma(this, i)) this.protetti.add(i);
    const liberi = this.liberi();
    if (this.protetti.has(p) && d === this.cattivo && liberi.length) this.cattivo = liberi[Math.floor(Math.random() * liberi.length)];
    else if (!this.protetti.has(p) && d !== this.cattivo && liberi.length === 1 && this.protetti.has(this.prossimo(p))) this.cattivo = d;
    if (d !== this.cattivo) {
      this.ultimo = { dente: d, posto: p, morso: false };
      this.annuncia(p, 'preme un dente… salvo!', 'salvo! 😮‍💨', false, { dente: d });
      this.turno = this.prossimo(p);
      return { ok: true };
    }
    // CHOMP!
    this.morsi++;
    this.ultimo = { dente: d, posto: p, morso: true, bocca: this.morsi };
    this.vivi[p] = false;
    this.eliminati.push(p);
    this.annuncia(p, 'è stato morso! 🐊', 'il coccodrillo ti ha morso! 🐊', true, { dente: d, morso: true });
    if (this.quantiVivi() <= 1) return this.chiudi();
    this.fase = 'morso';
    this.inAttesa = true;
    this.turno = null;
    this.prossimoDopo = this.prossimo(p);
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.fase = 'gioco';
    this.nuovaBocca();
    this.ultimo = null;
    this.turno = this.prossimoDopo;
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.fase = 'fine';
    this.turno = null;
    const vincitore = this.vivi.indexOf(true);
    // punti di sopravvivenza: chi è stato morso per primo 1, poi 2... il vincitore n
    const punti = new Array(this.n).fill(0);
    this.eliminati.forEach((posto, k) => { punti[posto] = k + 1; });
    if (vincitore >= 0) punti[vincitore] = this.n;
    this.risultato = {
      fazioni: punti.map((x, i) => ({ posti: [i], punti: x })),
      etichetta: 'sopravvivenza',
      pareggio: false,
      vincitori: vincitore >= 0 ? [vincitore] : [],
    };
    return { ok: true };
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      denti: DENTI, premuti: this.premuti, vivi: this.vivi, eliminati: this.eliminati, morsi: this.morsi,
      conPasso: this.conPasso, passi: this.passi, ultimo: this.ultimo,
      // a bocca chiusa si vede qual era il dente cattivo
      cattivo: this.ultimo && this.ultimo.morso ? this.ultimo.dente : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// Il dente cattivo è davvero a caso: nessuno (nemmeno il computer) può saperlo.
// I livelli cambiano solo il modo di usare il "passo", quando è attivo.
function bot(g, posto, livello) {
  const liberi = g.liberi();
  const rischio = 1 / liberi.length;
  if (g.conPasso && g.passi[posto] && liberi.length > 1) {
    const soglia = livello === 'difficile' ? 1 / 3 : livello === 'medio' ? 1 / 2 : 0;
    if (livello === 'facile' ? Math.random() < 0.15 : rischio >= soglia) return { tipo: 'passa' };
  }
  return { tipo: 'premi', dente: liberi[Math.floor(Math.random() * liberi.length)] };
}

module.exports = {
  meta: {
    id: 'coccodrillo',
    nome: 'Coccodrillo',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Premi un dente alla volta e spera che non chiuda la bocca. L\'ultimo rimasto vince.',
    opzioni: [
      { id: 'passo', nome: 'Passo', valori: ['no', 'si'], etichette: ['Niente passo (classico)', 'Un passo a testa per ogni bocca'], predefinito: 'no' },
    ],
    regole: [
      `Il coccodrillo ha ${DENTI} denti. Uno solo, scelto a caso e segreto, fa chiudere la bocca. Non lo sa nessuno, nemmeno il computer.`,
      'A turno ogni giocatore preme un dente a scelta (clic o tocco sul dente). Il dente premuto si abbassa e resta giù.',
      'Se il dente era quello sbagliato la bocca si chiude di colpo: il giocatore viene morso ed è eliminato. Poi tutti i denti tornano su, il dente cattivo cambia e si continua dal giocatore successivo.',
      'L\'ultimo giocatore rimasto senza morsi vince. Da 2 a 8 giocatori, con amici o contro il computer.',
      'Variante "passo" (da scegliere prima di iniziare): per ogni bocca ognuno può una volta sola passare la mano invece di premere. Non si può passare quando resta un solo dente.',
      'È un gioco di pura fortuna: il computer non può indovinare il dente. I livelli cambiano solo quanto è furbo a usare il passo (il difficile lo tiene per quando il rischio è alto).',
    ],
  },
  crea: (o) => new Coccodrillo(o),
  bot,
  _test: { DENTI },
};
