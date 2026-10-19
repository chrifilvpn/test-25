// HIGHER OR LOWER: c'è una carta scoperta; tutti puntano insieme su "più alta" o "più bassa" della prossima.
// Ordine: 2 < 3 < ... < 10 < J < Q < K < A. A carta uguale la puntata viene restituita.
// La vincita dipende dalla probabilità, calcolata sulle carte rimaste nel mazzo (un solo mazzo da 52).
const { Casino, scarpa, puntataBot } = require('./casino');
const T = require('./trucco');

const forza = (c) => (c.rango === 1 ? 14 : c.rango); // l'asso è la carta più alta
const MARGINE = 0.96; // il banco trattiene il 4%

function quote(mazzo, carta) {
  const f = forza(carta);
  const n = mazzo.length;
  const alte = mazzo.filter((c) => forza(c) > f).length;
  const basse = mazzo.filter((c) => forza(c) < f).length;
  // la carta uguale restituisce la puntata, quindi la quota si calcola solo sulle carte che decidono
  const decisive = alte + basse;
  const q = (k) => (k ? Math.max(1.01, Math.floor((MARGINE * decisive / k) * 100) / 100) : null);
  return { alta: q(alte), bassa: q(basse), pAlta: alte / n, pBassa: basse / n, pUguale: (n - alte - basse) / n };
}

class HigherLower extends Casino {
  constructor(o) {
    super(o);
    this.id = 'higherlower';
    this.mazzo = scarpa(1);
    this.carta = this.mazzo.pop();
    this.storia = [this.carta];
    this.serie = 0; // quante volte di fila è andata come diceva la maggioranza, solo per curiosità
    this.pausaMs = 3200;
    this.apriPuntate();
  }

  apriPuntate() {
    super.apriPuntate();
    this.mescolata = false;
    if (this.mazzo.length < 8) { this.mazzo = scarpa(1).filter((c) => c.id !== this.carta.id); this.mescolata = true; }
    this.puntate = Array.from({ length: this.n }, () => null);
    this.quote = quote(this.mazzo, this.carta);
    this.uscita = null;
    this.esiti = null;
  }

  azione(p, a) {
    if (!a) return { errore: 'Mossa non valida' };
    if (this.inAttesa || this.fase !== 'puntate') return { errore: 'Aspetta la prossima carta' };
    if (a.tipo === 'passa') return this.passa(p);
    if (a.tipo !== 'punta' || !['alta', 'bassa'].includes(a.scelta)) return { errore: 'Scegli più alta o più bassa' };
    if (this.puntato[p] || this.passato[p]) return { errore: 'Hai già puntato' };
    if (!this.quote[a.scelta]) return { errore: `Non esiste una carta più ${a.scelta} di questa` };
    const r = this.controllaImporto(p, a.importo);
    if (r.errore) return r;
    this.fiche[p] -= r.importo;
    this.puntate[p] = { scelta: a.scelta, importo: r.importo, quota: this.quote[a.scelta] };
    this.segnaPuntata(p);
    return { ok: true };
  }

  gioca() {
    this.fase = 'rivela';
    // il trucco segreto (!win): la prossima carta va dalla parte su cui il giocatore truccato ha puntato
    const chi = this.puntate.findIndex((q, i) => q && T.consuma(this, i));
    if (chi >= 0) {
      const f = forza(this.carta), su = this.puntate[chi].scelta === 'alta';
      T.inCima(this.mazzo, (c) => (su ? forza(c) > f : forza(c) < f));
    }
    const nuova = this.mazzo.pop();
    const d = forza(nuova) - forza(this.carta);
    const esito = d > 0 ? 'alta' : d < 0 ? 'bassa' : 'uguale';
    this.uscita = { carta: nuova, esito, prima: this.carta };
    this.esiti = this.puntate.map((q, p) => {
      if (!q) return null;
      let ritorno = 0;
      if (esito === 'uguale') ritorno = q.importo;
      else if (esito === q.scelta) ritorno = Math.floor(q.importo * q.quota);
      this.fiche[p] += ritorno;
      return { netto: ritorno - q.importo, esito: esito === 'uguale' ? 'pari' : esito === q.scelta ? 'vince' : 'perde' };
    });
    this.annuncia(null, esito === 'uguale' ? 'Carta uguale: puntate restituite' : `Più ${esito}!`, '', true);
    this.inAttesa = true;
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.carta = this.uscita.carta;
    this.storia.push(this.carta);
    if (this.storia.length > 12) this.storia.shift();
    this.apriPuntate();
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: null, inAttesa: this.inAttesa,
      fiche: this.fiche, puntato: this.puntato, passato: this.passato,
      carta: this.carta, quote: this.quote, uscita: this.uscita, esiti: this.esiti,
      puntate: this.puntate.map((q, i) => (i === p || this.fase !== 'puntate' ? q : q ? { nascosta: true } : null)),
      storia: this.storia.slice(0, -1).slice(-10), carteMazzo: this.mazzo.length, mescolata: this.mescolata,
      tempoPuntate: this.tempoPuntateMs(), nMano: this.nMano,
      finita: false, risultato: null, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
function bot(g, p, livello) {
  const q = g.quote;
  const scelta = !q.alta ? 'bassa' : !q.bassa ? 'alta' : livello === 'facile' ? (Math.random() < 0.5 ? 'alta' : 'bassa') : q.pAlta >= q.pBassa ? 'alta' : 'bassa';
  let importo = puntataBot(g.fiche[p], livello);
  if (livello === 'difficile') {
    // punta di più quando la probabilità è alta (ma senza esagerare)
    const pr = scelta === 'alta' ? q.pAlta : q.pBassa;
    const f = pr > 0.75 ? 0.12 : pr > 0.6 ? 0.07 : 0.03;
    importo = Math.max(1, Math.min(g.fiche[p], Math.round(g.fiche[p] * f)));
  }
  return { tipo: 'punta', scelta, importo };
}

module.exports = {
  meta: {
    id: 'higherlower',
    nome: 'Higher or Lower',
    tipo: 'tabellone',
    fiche: true,
    saltaAssenti: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'La prossima carta sarà più alta o più bassa? Punta le fiche, tutti insieme.',
    opzioni: [],
    regole: [
      'Ogni giocatore parte con 1000 fiche; quando le finisci puoi scrivere !ricarica in chat per averne altre 1000.',
      'C\'è una carta scoperta. Tutti insieme scelgono se la prossima sarà più alta o più bassa e quante fiche puntare. Dopo la prima puntata gli altri hanno 20 secondi; puoi anche passare.',
      'Ordine delle carte: 2, 3, 4, 5, 6, 7, 8, 9, 10, fante, donna, re, asso. L\'asso è la carta più alta. Il seme non conta.',
      'Se la carta è uguale (stesso valore) la puntata viene restituita.',
      'Quanto si vince dipende da quanto è difficile: la vincita è calcolata sulle carte ancora nel mazzo (un solo mazzo da 52, che si rimescola quando restano poche carte). Su ogni pulsante vedi il moltiplicatore: con ×1,50 se punti 100 e indovini ricevi 150. Il banco trattiene il 4%.',
      'Chi ricorda le carte già uscite ha un vantaggio: le ultime uscite sono mostrate sotto la carta.',
      'Si continua finché hai fiche. I computer seduti al tavolo si ricaricano da soli.',
    ],
  },
  crea: (o) => new HigherLower(o),
  bot,
  _test: { quote, forza },
};
