// BASE COMUNE DEI ROMPICAPO (kakuro, gabbie aritmetiche, torre di Hanoi, spingi le casse, mahjong solitario).
// Non è un gioco (non esporta meta): giochi/index.js lo ignora.
// Da soli: un tavolo, il cronometro si ferma se si aprono le dispense. In sfida (2-8): tutti ricevono lo STESSO
// puzzle e lo risolvono ognuno sulla propria copia, nello stesso momento; vince chi finisce prima (o come dice il
// gioco). I computer li fa muovere la partita stessa (scadenza/controllaTempo), ognuno col suo ritmo, così finiscono
// in un tempo che dipende dal livello e non aspettano le mosse degli altri.
const VELOCE = !!process.env.TEST_VELOCE;
const PUNTI_POSTO = [10, 7, 5, 4, 3, 2, 1, 1];

class SfidaRompicapo {
  // o: le opzioni di crea(); limiteMs: tempo massimo della sfida (poi chi non ha finito è fuori)
  constructor(id, { n, bot = [] }, limiteMs = 30 * 60000) {
    this.id = id;
    this.n = n;
    this.botLiv = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.sfida = n > 1;
    this.pausaBoss = n === 1; // da soli la partita aspetta chi apre le dispense; in sfida no
    this.limiteMs = limiteMs;
    this.inizio = Date.now();
    this.tempoFermo = 0; this.fermoDal = null; this.inPausa = false;
    this.arrivi = [];
    this.menti = {};
    this.assenze = new Array(n).fill(0);
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }

  // da chiamare alla fine del costruttore del gioco, quando le tavole esistono già
  avvia() {
    this.prossimaBot = this.botLiv.map((l, p) => (l ? Date.now() + this.ritmoBot(p, l, true) : null));
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  // millisecondi di gioco (senza le pause delle dispense)
  cronometro() { const ora = this.fineMs != null ? this.fineMs : Date.now(); return ora - this.inizio - this.tempoFermo - (this.fermoDal ? ora - this.fermoDal : 0); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.fermoDal = Date.now();
    else if (this.fermoDal) {
      const d = Date.now() - this.fermoDal;
      this.tempoFermo += d; this.fermoDal = null;
      // i computer (non ci sono da soli, ma per sicurezza) ripartono da dove erano
      if (this.prossimaBot) this.prossimaBot = this.prossimaBot.map((x) => (x == null ? x : x + d));
    }
    this.inPausa = si;
  }
  // tempo personale: chi ha finito ha il suo tempo fermo
  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro(); }

  // chi deve ancora finire tra le persone (i computer li muove controllaTempo)
  attesi() { return this.finita || this.inAttesa ? [] : this.tavole.map((t, i) => (t.fatto == null && !t.ritirato && !this.botLiv[i] ? i : -1)).filter((i) => i >= 0); }
  inGioco() { return this.tavole.map((t, i) => (t.fatto == null && !t.ritirato ? i : -1)).filter((i) => i >= 0); }

  scadenza() {
    if (this.finita || this.inPausa) return null;
    const bot = (this.prossimaBot || []).filter((x, i) => x != null && this.botLiv[i] && this.tavole[i].fatto == null && !this.tavole[i].ritirato);
    const fine = this.sfida ? [this.inizio + this.limiteMs + this.tempoFermo] : [];
    const tutti = [...bot, ...fine];
    return tutti.length ? Math.min(...tutti) : null;
  }
  controllaTempo() {
    if (this.finita || this.inPausa) return false;
    const ora = Date.now();
    let cambiato = false;
    for (let p = 0; p < this.n && !this.finita; p++) {
      const t = this.tavole[p];
      if (!this.botLiv[p] || t.fatto != null || t.ritirato || this.prossimaBot[p] > ora) continue;
      let r;
      try { r = this.azione(p, this.mossaBot(p, this.botLiv[p])); } catch (e) { r = { errore: e.message }; }
      if (r.errore) this.menti[p] = null; // ricomincia a pensare da capo
      this.prossimaBot[p] = Date.now() + this.ritmoBot(p, this.botLiv[p], false);
      cambiato = true;
    }
    if (!this.finita && this.sfida && this.cronometro() >= this.limiteMs) {
      this.annuncia(null, 'Tempo scaduto!', 'Tempo scaduto!', true);
      this.chiudi();
      return true;
    }
    return cambiato;
  }
  // chi esce dalla partita viene sostituito dal computer (medio)
  impostaBot(p, livello) {
    if (!this.tavole[p]) return;
    this.botLiv[p] = livello || 'medio';
    this.menti[p] = null;
    this.prossimaBot[p] = Date.now() + this.ritmoBot(p, this.botLiv[p], true);
  }
  // chi è via a lungo nella sfida si ritira (dopo 4 richiami di fila, circa 100 secondi); da soli la partita aspetta
  salta(p) {
    if (this.finita || !this.sfida || !this.tavole[p] || this.tavole[p].fatto != null) return;
    if (++this.assenze[p] < 4) return;
    this.ritira(p, 'è via da troppo tempo e si ritira');
  }
  ritira(p, testo = 'si ritira') {
    const t = this.tavole[p];
    t.ritirato = true;
    this.annuncia(p, testo, testo === 'si ritira' ? 'ti sei ritirato' : 'sei stato via troppo: ritirato');
    this.controllaFine();
  }

  // AZIONE: controlli comuni, poi la mossa del gioco (this.mossa) sulla tavola di chi gioca
  azione(p, a) {
    const t = this.tavole && this.tavole[p];
    if (!t) return { errore: 'Posto non valido' };
    if (!a || typeof a !== 'object' || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    // numero d'ordine delle mosse del browser: serve a disegnare subito le mosse senza aspettare il server
    if (Number.isInteger(a.seq) && a.seq > t.seq && a.seq < t.seq + 1000) t.seq = a.seq;
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    this.assenze[p] = 0;
    if (a.tipo === 'pensa') return { ok: true };
    if (t.fatto != null) return { errore: 'Hai già finito: aspetta gli altri' };
    if (t.ritirato) return { errore: 'Ti sei ritirato' };
    if (a.tipo === 'arrenditi') {
      if (!this.sfida) { this.chiudi(); return { ok: true }; }
      this.ritira(p);
      return { ok: true };
    }
    let r;
    try { r = this.mossa(p, t, a); } catch (e) { r = { errore: 'Mossa non valida' }; }
    if (!r || r.errore) return r || { errore: 'Mossa non valida' };
    if (this.risolta(p, t)) this.arriva(p);
    return { ok: true };
  }

  arriva(p) {
    const t = this.tavole[p];
    t.fatto = this.cronometro() + (t.penale || 0); // il tempo finale comprende le penalità (aiuti, rimescolate)
    this.arrivi.push(p);
    const pos = this.arrivi.length;
    const frase = this.fraseArrivo(p, t);
    if (this.sfida) this.annuncia(p, `${frase.altri} (${pos}°)`, `${frase.io}${pos === 1 ? ' Sei il primo!' : ` Sei ${pos}°.`}`, pos === 1);
    else this.annuncia(p, frase.altri, frase.io, true);
    this.controllaFine();
  }
  // la sfida finisce quando hanno finito tutti, quando le persone hanno finito (i computer rimasti sono dietro),
  // oppure quando il gioco dice che nessuno può più fare meglio (vincitoreSicuro)
  controllaFine() {
    if (this.finita) return;
    const resta = this.inGioco();
    const personeInGioco = resta.filter((i) => !this.botLiv[i]);
    if (!resta.length || !personeInGioco.length || this.vincitoreSicuro()) this.chiudi();
  }
  vincitoreSicuro() { return false; }

  // classifica della sfida: prima chi ha finito (nell'ordine del gioco), poi gli altri
  ordineArrivo() { return this.arrivi.slice(); }
  chiudi() {
    if (this.finita) return;
    this.fineMs = Date.now();
    if (this.fermoDal) { this.tempoFermo += this.fineMs - this.fermoDal; this.fermoDal = null; }
    this.finita = true;
    if (!this.sfida) {
      const t = this.tavole[0];
      this.risultato = t.fatto != null ? this.risultatoSolo(t)
        : { fazioni: [{ posti: [0], punti: 0 }], etichetta: 'punti', pareggio: false, vincitori: [], titolo: 'Partita interrotta' };
      return;
    }
    const ordine = this.ordineArrivo();
    const punti = new Array(this.n).fill(0);
    ordine.forEach((p, k) => { punti[p] = PUNTI_POSTO[k] || 1; });
    this.classifica = ordine;
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: false, vincitori: ordine.length ? [ordine[0]] : [] };
    if (!ordine.length) this.risultato.titolo = 'Nessuno ha finito';
  }
  risultatoSolo(t) { return { fazioni: [{ posti: [0], punti: Math.round(t.fatto / 1000) }], etichetta: 'secondi', crescente: true, pareggio: false, vincitori: [0] }; }

  // parte comune della vista: tempi, chi ha finito, a che punto sono gli altri (non le loro mosse)
  vistaComune(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      gioco: this.id, n: this.n, sfida: this.sfida, seq: t.seq,
      tempo: this.tempoDi(this.tavole[p] ? p : 0), corre: !this.finita && !this.inPausa && t.fatto == null,
      limite: this.sfida ? Math.max(0, this.limiteMs - this.cronometro()) : null,
      fatto: t.fatto, ritirato: !!t.ritirato, arrivi: this.arrivi,
      altri: this.tavole.map((x, i) => ({ prog: Math.round(this.progresso(i, x) * 100), fatto: x.fatto, ritirato: !!x.ritirato, mosse: x.mosse || 0 })),
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ritmo dei computer: un tempo totale scelto in base al livello, diviso tra i passi da fare (con un po' di caso)
const FATTORE_LIVELLO = { facile: 1.55, medio: 1.0, difficile: 0.62 };
function passoBot(totaleMs, passi) {
  if (VELOCE) return 1;
  const medio = totaleMs / Math.max(1, passi);
  return Math.max(120, medio * (0.55 + Math.random() * 0.9));
}
const caso = (a) => a[Math.floor(Math.random() * a.length)];
const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

module.exports = { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola, VELOCE, PUNTI_POSTO };
