// INTERRUTTORI: un pannello di interruttori, uno solo (segreto) è collegato alla bomba. A turno se ne accende uno.
// Chi accende la bomba è eliminato, poi arriva un pannello nuovo con la bomba altrove. L'ultimo rimasto vince.
// Il numero di interruttori si sceglie prima della partita.
const PAUSA_BOTTO = 2600;
const QUANTI = [5, 6, 8, 10, 12, 16, 20];

class Interruttori {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'interruttori';
    this.n = n;
    this.quanti = QUANTI.includes(Number(opzioni.quanti)) ? Number(opzioni.quanti) : 8;
    this.conPasso = opzioni.passo === 'si';
    this.vivi = new Array(n).fill(true);
    this.eliminati = [];
    this.turno = primo % n;
    this.botti = 0;
    this.nuovoPannello();
    this.fase = 'gioco';
    this.inAttesa = false;
    this.pausaMs = PAUSA_BOTTO;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultimo = null;
  }

  nuovoPannello() {
    this.accesi = new Array(this.quanti).fill(null); // null oppure il posto di chi l'ha acceso
    this.bomba = Math.floor(Math.random() * this.quanti);
    this.passi = new Array(this.n).fill(this.conPasso);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  prossimo(da) {
    for (let k = 1; k <= this.n; k++) { const i = (da + k) % this.n; if (this.vivi[i]) return i; }
    return null;
  }
  liberi() { return this.accesi.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0); }

  // !win banana: nel tuo turno ti dice quale interruttore è collegato alla bomba (vale per questo pannello)
  suggerimentoWin(posto) {
    if (this.finita || this.inAttesa || posto !== this.turno) return null;
    return `💡 La bomba è l'interruttore ${this.bomba + 1}: non toccarlo!`;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Arriva un pannello nuovo…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a && a.tipo === 'passa') {
      if (!this.passi[p]) return { errore: this.conPasso ? 'Hai già passato su questo pannello' : 'In questa partita non si può passare' };
      if (this.liberi().length <= 1) return { errore: 'Resta un solo interruttore: tocca a te!' };
      this.passi[p] = false;
      this.annuncia(p, 'passa 😅', 'hai passato');
      this.ultimo = null;
      this.turno = this.prossimo(p);
      return { ok: true };
    }
    if (!a || a.tipo !== 'accendi') return { errore: 'Accendi un interruttore' };
    const k = Number(a.interruttore);
    if (!Number.isInteger(k) || k < 0 || k >= this.quanti) return { errore: 'Interruttore non valido' };
    if (this.accesi[k] !== null) return { errore: 'Questo è già acceso' };
    this.accesi[k] = p;
    if (k !== this.bomba) {
      this.ultimo = { k, posto: p, bomba: false };
      this.annuncia(p, 'accende… niente! 😮‍💨', 'niente, salvo! 😮‍💨');
      this.turno = this.prossimo(p);
      return { ok: true };
    }
    this.botti++;
    this.ultimo = { k, posto: p, bomba: true, botto: this.botti };
    this.vivi[p] = false;
    this.eliminati.push(p);
    this.annuncia(p, 'ha acceso la bomba! 💣💥', 'hai acceso la bomba! 💥', true);
    if (this.vivi.filter(Boolean).length <= 1) return this.chiudi();
    this.fase = 'botto';
    this.inAttesa = true;
    this.turno = null;
    this.prossimoDopo = this.prossimo(p);
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.fase = 'gioco';
    this.nuovoPannello();
    this.ultimo = null;
    this.turno = this.prossimoDopo;
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.fase = 'fine';
    this.turno = null;
    const vincitore = this.vivi.indexOf(true);
    const punti = new Array(this.n).fill(0);
    this.eliminati.forEach((posto, k) => { punti[posto] = k + 1; });
    if (vincitore >= 0) punti[vincitore] = this.n;
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'sopravvivenza', pareggio: false, vincitori: vincitore >= 0 ? [vincitore] : [] };
    return { ok: true };
  }

  vista() {
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      quanti: this.quanti, accesi: this.accesi, vivi: this.vivi, eliminati: this.eliminati, botti: this.botti,
      conPasso: this.conPasso, passi: this.passi, ultimo: this.ultimo,
      bomba: this.ultimo && this.ultimo.bomba ? this.ultimo.k : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// La bomba è davvero a caso: nessuno può saperla. I livelli cambiano solo l'uso del passo (se attivo).
function bot(g, posto, livello) {
  const liberi = g.liberi();
  const rischio = 1 / liberi.length;
  if (g.conPasso && g.passi[posto] && liberi.length > 1) {
    const soglia = livello === 'difficile' ? 1 / 3 : livello === 'medio' ? 1 / 2 : 0;
    if (livello === 'facile' ? Math.random() < 0.15 : rischio >= soglia) return { tipo: 'passa' };
  }
  return { tipo: 'accendi', interruttore: liberi[Math.floor(Math.random() * liberi.length)] };
}

module.exports = {
  meta: {
    id: 'interruttori',
    nome: 'Interruttori',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Un pannello di interruttori e uno solo fa saltare tutto. A turno se ne accende uno…',
    alias: ['bomba', 'interruttore'],
    opzioni: [
      { id: 'quanti', nome: 'Interruttori', valori: QUANTI, etichette: QUANTI.map((q) => `${q} interruttori`), predefinito: 8 },
      { id: 'passo', nome: 'Passo', valori: ['no', 'si'], etichette: ['Niente passo', 'Un passo a testa per pannello'], predefinito: 'no' },
    ],
    regole: [
      'C\'è un pannello con degli interruttori (da 5 a 20, si sceglie prima della partita). Uno solo, scelto a caso e segreto, è collegato alla bomba. Non lo sa nessuno, nemmeno il computer.',
      'A turno ognuno accende un interruttore spento a scelta. Se non succede niente, l\'interruttore resta acceso e tocca al prossimo.',
      'Chi accende la bomba è eliminato. Poi arriva un pannello nuovo, tutto spento, con la bomba in un altro posto, e si continua dal giocatore dopo.',
      'L\'ultimo giocatore rimasto vince. In classifica: chi salta per primo 1 punto, il secondo 2 punti e così via, il vincitore tanti punti quanti sono i giocatori.',
      'Variante "passo" (da scegliere prima): su ogni pannello ognuno può una volta sola passare invece di accendere. Non si può passare quando resta un solo interruttore.',
      'È un gioco di fortuna e di nervi: il computer non può sapere dov\'è la bomba. I livelli cambiano solo quanto è furbo a usare il passo.',
    ],
  },
  crea: (o) => new Interruttori(o),
  bot,
  _test: { QUANTI },
};
