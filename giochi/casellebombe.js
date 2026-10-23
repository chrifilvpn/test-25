// CASELLE E BOMBE: una griglia con bombe nascoste (nessun numero, come richiesto). Nel tuo turno scopri caselle una
// dopo l'altra: ogni casella sicura mette 1 punto nel tuo piatto del turno. Puoi fermarti e incassare quando vuoi.
// Se trovi una bomba perdi il piatto del turno e il turno passa. Più caselle sicure escono, più le bombe diventano
// fitte tra quelle rimaste: la tensione cresce. Quando le caselle sicure sono finite vince chi ha più punti.
const GRIGLIE = { piccola: { lato: 5, bombe: 5 }, media: { lato: 6, bombe: 8 }, grande: { lato: 7, bombe: 12 } };
const PAUSA_BOMBA = 1600;

class CaselleBombe {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'casellebombe';
    this.n = n;
    this.griglia = GRIGLIE[opzioni.griglia] ? opzioni.griglia : 'media';
    const { lato, bombe } = GRIGLIE[this.griglia];
    this.lato = lato;
    this.nBombe = bombe;
    const celle = Array.from({ length: lato * lato }, (_, i) => i);
    for (let i = celle.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [celle[i], celle[j]] = [celle[j], celle[i]]; }
    this.bombe = new Set(celle.slice(0, bombe));
    this.scoperte = new Array(lato * lato).fill(null); // null | { posto, bomba }
    this.punti = new Array(n).fill(0);
    this.piatto = 0;
    this.turno = primo % n;
    this.fase = 'gioco';
    this.inAttesa = false;
    this.pausaMs = PAUSA_BOMBA;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultima = null;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  rimaste() { return this.scoperte.filter((x) => x === null).length; }
  bombeRimaste() { let k = 0; for (const b of this.bombe) if (!this.scoperte[b]) k++; return k; }
  sicureRimaste() { return this.rimaste() - this.bombeRimaste(); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a && a.tipo === 'fermati') {
      if (!this.piatto) return { errore: 'Scopri almeno una casella prima di fermarti' };
      this.punti[p] += this.piatto;
      this.annuncia(p, `si ferma e incassa ${this.piatto}`, `hai incassato ${this.piatto}`);
      this.piatto = 0;
      return this.passa(p);
    }
    if (!a || a.tipo !== 'scopri') return { errore: 'Scegli una casella' };
    const c = Number(a.cella);
    if (!Number.isInteger(c) || c < 0 || c >= this.scoperte.length) return { errore: 'Casella non valida' };
    if (this.scoperte[c]) return { errore: 'Casella già scoperta' };
    const bomba = this.bombe.has(c);
    this.scoperte[c] = { posto: p, bomba };
    this.ultima = c;
    if (bomba) {
      const perso = this.piatto;
      this.piatto = 0;
      this.annuncia(p, `trova una bomba! 💣${perso ? ` (perde ${perso})` : ''}`, `bomba! 💣${perso ? ` Perdi ${perso}` : ''}`, true);
      if (this.sicureRimaste() === 0) return this.chiudi();
      this.fase = 'bomba';
      this.inAttesa = true;
      this.dopoBomba = p;
      return { ok: true };
    }
    this.piatto++;
    if (this.sicureRimaste() === 0) { this.punti[p] += this.piatto; this.piatto = 0; return this.chiudi(); }
    return { ok: true };
  }

  // !win + parola segreta: nel tuo turno, qualche casella sicura (senza bomba) ancora coperta
  suggerimentoWin(posto) {
    if (this.finita || this.inAttesa || posto !== this.turno) return null;
    const sicure = [];
    for (let i = 0; i < this.scoperte.length; i++) if (!this.scoperte[i] && !this.bombe.has(i)) sicure.push(i);
    if (!sicure.length) return null;
    for (let i = sicure.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sicure[i], sicure[j]] = [sicure[j], sicure[i]]; }
    const dove = sicure.slice(0, 3).map((i) => `riga ${Math.floor(i / this.lato) + 1} col ${(i % this.lato) + 1}`);
    return `💡 Caselle sicure: ${dove.join(' · ')}`;
  }

  passa(p) { this.turno = (p + 1) % this.n; return { ok: true }; }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.fase = 'gioco';
    this.passa(this.dopoBomba);
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.fase = 'fine';
    this.turno = null;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    return { ok: true };
  }

  vista() {
    const tutto = this.finita;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      lato: this.lato, nBombe: this.nBombe, punti: this.punti, piatto: this.piatto, ultima: this.ultima,
      scoperte: this.scoperte, bombeRimaste: this.bombeRimaste(), rimaste: this.rimaste(),
      tutteBombe: tutto ? [...this.bombe] : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Non sa dove sono le bombe; il rischio della prossima casella è bombe rimaste / caselle rimaste.
function bot(g, p, livello) {
  const libere = g.scoperte.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0);
  const cella = libere[Math.floor(Math.random() * libere.length)];
  const rischio = g.bombeRimaste() / Math.max(1, g.rimaste());
  const piatto = g.piatto;
  if (!piatto) return { tipo: 'scopri', cella };
  let fermati;
  if (livello === 'facile') fermati = Math.random() < 0.3;
  else if (livello === 'medio') fermati = piatto >= 3 || rischio > 0.3;
  else {
    // conviene continuare se il guadagno atteso supera la perdita attesa: (1-r)·1 > r·piatto
    const indietro = Math.max(...g.punti.map((x, i) => (i === p ? -1 : x))) > g.punti[p] + piatto + g.sicureRimaste() * 0.5;
    fermati = !indietro && (1 - rischio) <= rischio * piatto;
  }
  return fermati ? { tipo: 'fermati' } : { tipo: 'scopri', cella };
}

module.exports = {
  meta: {
    id: 'casellebombe',
    nome: 'Caselle e bombe',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Scopri caselle a turno: ogni casella sicura vale un punto, ma una bomba ti fa perdere tutto il turno.',
    alias: ['campo minato a coppie', 'bombe'],
    opzioni: [
      { id: 'griglia', nome: 'Griglia', valori: ['media', 'piccola', 'grande'], etichette: ['6×6 con 8 bombe', '5×5 con 5 bombe', '7×7 con 12 bombe'], predefinito: 'media' },
    ],
    regole: [
      'C\'è una griglia coperta con delle bombe nascoste: 8 bombe in una griglia 6×6 (oppure 5 in 5×5, 12 in 7×7, da scegliere prima). Non ci sono numeri: non si sa dove sono.',
      'Nel tuo turno scopri una casella. Se è sicura guadagni 1 punto nel piatto del turno e puoi scoprirne un\'altra, oppure fermarti e incassare il piatto.',
      'Se scopri una bomba perdi tutto il piatto del turno e il turno passa al prossimo. I punti già incassati non si perdono mai.',
      'Le bombe scoperte restano visibili. Più caselle sicure escono, più le bombe sono fitte tra quelle rimaste: in basso vedi il rischio della prossima casella.',
      'Quando tutte le caselle sicure sono state scoperte la partita finisce (chi scopre l\'ultima incassa il suo piatto) e vince chi ha più punti. A parità è pareggio.',
      'Il computer facile si ferma a caso, il medio si accontenta presto, il difficile calcola se gli conviene rischiare e, se è molto indietro, rischia di più.',
    ],
  },
  crea: (o) => new CaselleBombe(o),
  bot,
  _test: { GRIGLIE },
};
