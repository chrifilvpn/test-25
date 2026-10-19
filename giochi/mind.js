// THE MIND: gioco di collaborazione con le carte da 1 a 100. A ogni livello ognuno riceve tante carte quanto il numero
// del livello; tutti insieme, senza parlare e senza turni, bisogna mettere giù le carte in ordine crescente.
// Niente vite e niente stelle: se qualcuno gioca una carta mentre un altro ne ha una più bassa, il livello
// ricomincia da capo con carte nuove, all'infinito (per smettere: Termina o Torna al tavolo).
// Si gioca "a tempo": il server fa girare il ciclo a tick per i computer, che aspettano più o meno a lungo secondo
// la distanza tra la loro carta e l'ultima giocata. Nessun livello del computer: è un compagno di squadra.
const LIVELLI = { 2: 12, 3: 10, 4: 8 };
const PAUSA_FALLITO = 4500, PAUSA_LIVELLO = 3400, VIA_MS = 1200;

class Mind {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'mind';
    this.n = n;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.velocita = ['normale', 'lenta', 'veloce'].includes(opzioni.velocita) ? opzioni.velocita : 'normale';
    this.msNumero = { lenta: 520, normale: 380, veloce: 260 }[this.velocita]; // attesa del computer per ogni numero di distanza
    this.maxLivello = LIVELLI[n] || 8;
    this.livello = 0;
    this.giocate = new Array(n).fill(0);
    this.errori = 0;
    this.fallimenti = 0;
    this.tentativi = 1;
    this.tickMs = 100;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.chatDa = [];
    this.inPausa = false; this.pausaDal = null;
    this.nuovoLivello(Date.now());
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; this.pianificaBot(Date.now()); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) {
      const d = Date.now() - this.pausaDal;
      if (this.fineFase) this.fineFase += d;
      this.rif += d;
      this.quando = this.quando.map((q) => (q ? q + d : q));
    }
    this.inPausa = si;
  }

  nuovoLivello(ora, rifai = false) {
    // dopo un errore si rifà lo stesso livello con carte nuove
    if (rifai) this.tentativi++;
    else { this.livello++; this.tentativi = 1; }
    const mazzo = Array.from({ length: 100 }, (_, i) => i + 1);
    for (let i = mazzo.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]]; }
    this.mani = Array.from({ length: this.n }, () => mazzo.splice(0, this.livello).sort((a, b) => a - b));
    this.pila = [];
    this.ultimoErrore = null;
    this.concentrazione();
    this.quando = new Array(this.n).fill(null);
    this.rif = ora;
  }

  // prima di ogni livello (anche quando lo si rifà dopo un errore): tutti si concentrano e premono "Pronto"
  concentrazione() {
    this.fase = 'pronti';
    this.pronti = this.mani.map((m) => m.length === 0); // chi non ha più carte è già pronto
    this.fineFase = null;
  }

  cima() { return this.pila.length ? this.pila[this.pila.length - 1].carta : 0; }
  restanti() { return this.mani.reduce((s, m) => s + m.length, 0); }

  // quando giocherà ogni computer: più la sua carta è lontana dall'ultima giocata, più aspetta
  pianificaBot(ora) {
    this.rif = ora;
    this.quando = this.mani.map((m, p) => {
      if (!this.bot[p] || !m.length || this.fase !== 'gioco') return null;
      const gap = m[0] - this.cima();
      // un po' di incertezza, come una persona che conta nella testa; i numeri vicini si giocano quasi subito
      const base = 450 + gap * this.msNumero;
      return ora + base * (0.88 + Math.random() * 0.24);
    });
  }

  attesi() {
    if (this.finita || this.inPausa) return [];
    if (this.fase === 'pronti') return this.pronti.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
    // durante il livello le persone con carte in mano: se qualcuno resta disconnesso a lungo, il server gioca per lui
    if (this.fase === 'gioco') return this.mani.map((m, i) => (m.length && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
    return [];
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'La partita è in pausa' };
    if (!a || !a.tipo) return { errore: 'Mossa non valida' };
    const ora = Date.now();
    if (a.tipo === 'pronto') {
      if (this.fase !== 'pronti') return { errore: 'Non serve adesso' };
      this.pronti[p] = true;
      if (this.pronti.every(Boolean)) { this.fase = 'via'; this.fineFase = ora + VIA_MS; }
      return { ok: true };
    }
    if (a.tipo === 'gioca') {
      if (this.fase !== 'gioco') return { errore: this.fase === 'via' ? 'Un attimo: si parte tra poco' : 'Aspetta che tutti siano pronti' };
      if (!this.mani[p].length) return { errore: 'Non hai più carte' };
      return this.gioca(p, ora);
    }
    return { errore: 'Mossa non valida' };
  }

  gioca(p, ora) {
    const carta = this.mani[p].shift();
    this.giocate[p]++;
    // chi aveva carte più basse? errore: il livello ricomincia da capo con carte nuove (niente vite)
    const piuBasse = [];
    this.mani.forEach((m, i) => { for (const c of m) if (c < carta) piuBasse.push({ posto: i, carta: c }); });
    this.pila.push({ posto: p, carta, errore: piuBasse.length > 0 });
    if (piuBasse.length) {
      this.errori++;
      this.fallimenti++;
      this.ultimoErrore = { id: this.nEv + 1, posto: p, carta, basse: piuBasse };
      this.annuncia(p, `gioca ${carta}… ma c'era ${piuBasse.map((x) => x.carta).join(', ')}! Si ricomincia il livello ${this.livello}`, `hai giocato ${carta}… ma c'era ${piuBasse.map((x) => x.carta).join(', ')}! Si ricomincia il livello ${this.livello}`, true);
      this.fase = 'fallito';
      this.fineFase = ora + PAUSA_FALLITO;
      return { ok: true };
    }
    if (!this.restanti()) return this.fineLivello(ora);
    this.pianificaBot(ora);
    return { ok: true };
  }

  // il trucco segreto (!win): appena la sua carta più bassa è la più bassa di tutte, gli si dice di giocarla
  suggerimentoWin(p) {
    if (this.finita || this.inPausa || this.fase !== 'gioco' || !this.mani[p] || !this.mani[p].length) return null;
    const mia = this.mani[p][0];
    if (this.mani.some((m, i) => i !== p && m.length && m[0] < mia)) return null;
    return `💡 Gioca adesso il tuo ${mia}: è la carta più bassa di tutte`;
  }

  fineLivello(ora) {
    if (this.livello >= this.maxLivello) return this.chiudi(true);
    this.annuncia(null, `Livello ${this.livello} superato!`, '', true);
    this.fase = 'livello';
    this.fineFase = ora + PAUSA_LIVELLO;
    return { ok: true };
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    if (this.fase === 'via' && ora >= this.fineFase) { this.fase = 'gioco'; this.fineFase = null; this.pianificaBot(ora); return true; }
    if (this.fase === 'livello' && ora >= this.fineFase) { this.nuovoLivello(ora); return true; }
    if (this.fase === 'fallito' && ora >= this.fineFase) { this.nuovoLivello(ora, true); return true; }
    if (this.fase !== 'gioco') return false;
    // il computer che deve giocare per primo
    let chi = -1, t = Infinity;
    this.quando.forEach((q, i) => { if (q && q <= ora && q < t && this.bot[i] && this.mani[i].length) { t = q; chi = i; } });
    if (chi >= 0) { this.gioca(chi, ora); return true; }
    return false;
  }

  chiudi(vinto) {
    this.finita = true;
    this.fase = 'fine';
    this.vinto = vinto;
    this.risultato = {
      fazioni: this.giocate.map((x, i) => ({ posti: [i], punti: x })),
      etichetta: 'carte giocate',
      pareggio: false,
      vincitori: vinto ? Array.from({ length: this.n }, (_, i) => i) : [],
      titolo: vinto ? `Avete vinto! Tutti i ${this.maxLivello} livelli superati 🧠` : `Avete perso al livello ${this.livello} di ${this.maxLivello}`,
    };
    this.annuncia(null, vinto ? 'Siete una mente sola: avete vinto! 🧠' : 'Partita finita', '', true);
    return { ok: true };
  }

  vistaTick() { return { fase: this.fase, pausa: this.inPausa, resta: this.fineFase ? Math.max(0, this.fineFase - Date.now()) : 0 }; }

  vista(p) {
    const aperto = this.finita;
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      fase: this.fase, livello: this.livello, maxLivello: this.maxLivello,
      mano: this.mani[p] || [], carte: this.mani.map((m) => m.length),
      mani: aperto ? this.mani : null, // a fine partita si vedono le carte rimaste
      pila: this.pila.slice(-14), giocateLivello: this.pila.length, cima: this.cima(), tentativi: this.tentativi, fallimenti: this.fallimenti,
      ultimoErrore: this.ultimoErrore, pronti: this.pronti,
      giocate: this.giocate, errori: this.errori, bot: this.bot.map(Boolean),
      stato: this.vistaTick(), inPausa: this.inPausa,
    };
  }
}

// il computer non ha livelli: è un compagno di squadra. Qui risponde solo quando il server glielo chiede
// (pronto a inizio livello); le carte le gioca da solo nel ciclo a tick.
function bot(g, p) {
  if (g.fase === 'pronti') return { tipo: 'pronto' };
  if (g.fase === 'gioco' && g.mani[p].length) return { tipo: 'gioca' }; // chi è disconnesso da troppo gioca la più bassa
  return { tipo: 'pronto' };
}

module.exports = {
  meta: {
    id: 'mind',
    nome: 'The Mind',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    senzaLivelli: true, // si può giocare col computer, ma come compagno: niente facile/medio/difficile
    giocatori: [2, 3, 4],
    descrizione: 'Tutti insieme, senza parlare: mettete giù le carte da 1 a 100 in ordine crescente. Una mente sola.',
    alias: ['mind', 'la mente', 'carte da 1 a 100', 'collaborazione'],
    opzioni: [
      { id: 'velocita', nome: 'Computer', valori: ['normale', 'lenta', 'veloce'], etichette: ['Conta normale', 'Conta lento', 'Conta veloce'], predefinito: 'normale' },
    ],
    regole: [
      'Si gioca tutti insieme, nella stessa squadra: o vincete tutti o perdete tutti. Le carte vanno da 1 a 100.',
      'Si superano i livelli uno alla volta: al livello 1 ognuno ha 1 carta, al livello 2 ne ha 2, e così via. In 2 i livelli sono 12, in 3 sono 10, in 4 sono 8.',
      'Scopo di ogni livello: mettere giù tutte le carte di tutti in un\'unica pila, in ordine crescente. Non ci sono turni: chi pensa di avere la carta più bassa la gioca, quando vuole.',
      'Non si può comunicare niente sulle proprie carte: niente numeri in chat, niente segnali. Conta solo il tempo: più la tua carta è alta, più aspetti.',
      'Si gioca sempre la propria carta più bassa: il pulsante mette giù quella.',
      'Prima di ogni livello tutti premono "Pronto" per concentrarsi; quando tutti sono pronti si parte.',
      'Niente vite e niente stelle ninja. Errore: se qualcuno gioca una carta mentre un altro ha in mano una carta più bassa, si vedono le carte che erano più basse e il livello ricomincia da capo, con carte nuove. Si rifà all\'infinito, tutte le volte che serve.',
      'La partita finisce con la vittoria quando superate l\'ultimo livello.',
      'Per smettere prima: qualcuno propone "Termina" (decide la maggioranza) oppure chi vuole esce con "Torna al tavolo" e al suo posto gioca il computer.',
      'Col computer: è un compagno di squadra, non un avversario, quindi non ha livelli di difficoltà. Aspetta più o meno a lungo in base a quanto la sua carta è lontana dall\'ultima giocata. Si può scegliere quanto conta veloce.',
      'È un gioco di collaborazione: se qualcuno apre le dispense (Esc) la partita si ferma per tutti, e il tempo della pausa non conta.',
    ],
  },
  crea: (o) => new Mind(o),
  bot,
  _test: { Mind, LIVELLI },
};
