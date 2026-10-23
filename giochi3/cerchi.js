// CERCHI A TEMPO: sul campo compaiono dei cerchi numerati a tempo di musica; un anello si stringe su ognuno e quando
// lo tocca bisogna cliccarci sopra. Giudizio: 300, 100, 50 o mancato secondo la precisione; i colpi di fila fanno
// crescere i punti. La mappa nasce da un seme (public/js/giochi3/cerchi-logica.js, uguale nel browser).
// Il tempo lo misura il browser (la rete non deve spostare il giudizio): il browser manda lo scarto di ogni colpo e il
// server tiene il conto. In sfida (2-8) tutti suonano la stessa mappa insieme: vince chi fa più punti.
const C = require('../public/js/giochi3/cerchi-logica');
const T = require('../giochi/trucco');
const { ora: adesso } = require('../giochi/orologio');

const LIVELLI = ['facile', 'medio', 'difficile'];
const DURATE = [60, 90, 120];
const ATTESA_INIZIO = 4500; // ms tra la creazione e la musica (il browser carica e conta 3, 2, 1)
const TOLLERANZA = 3000;    // un cerchio senza risposta dopo tanto è mancato (browser chiuso, rete persa)
const RECORD = {};
// i computer: probabilità di 300, 100, 50 (il resto mancati) e quanto sbagliano il tempo
const BOT = { facile: [0.42, 0.3, 0.13], medio: [0.7, 0.2, 0.06], difficile: [0.9, 0.08, 0.015] };

class Cerchi {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'cerchi';
    this.n = n;
    this.sfida = n > 1;
    this.botLiv = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.livello = LIVELLI.includes(opzioni.difficolta) ? opzioni.difficolta : 'medio';
    this.secondi = DURATE.includes(Number(opzioni.durata)) ? Number(opzioni.durata) : 60;
    this.seme = Math.floor(Math.random() * 2 ** 31);
    this.mappa = C.genera(this.seme, this.livello, this.secondi);
    this.inizioMappa = adesso() + ATTESA_INIZIO;
    this.stati = Array.from({ length: n }, () => C.nuovoStato());
    this.fortuna = new Array(n).fill(0); // !win: i prossimi colpi valgono 300
    this.seqDi = new Array(n).fill(0);
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attesi() { return []; }
  impostaBot(p, livello) { this.botLiv[p] = livello || 'medio'; }
  // tempo della musica (ms)
  tempo() { return adesso() - this.inizioMappa; }

  // il giudizio del computer su un cerchio: sempre lo stesso per quel posto e quel cerchio (così le prove si ripetono)
  esitoBot(p, i, livello) {
    const r = { a: (this.seme ^ Math.imul(p + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0 };
    const caso = () => { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const [a, b, c] = BOT[livello] || BOT.medio, x = caso(), f = this.mappa.finestre, segno = caso() < 0.5 ? -1 : 1;
    if (x < a) return Math.round(segno * caso() * f[0]);
    if (x < a + b) return Math.round(segno * (f[0] + 1 + caso() * (f[1] - f[0] - 1)));
    if (x < a + b + c) return Math.round(segno * (f[1] + 1 + caso() * (f[2] - f[1] - 1)));
    return null;
  }
  segnaPer(p, scarto) {
    const s = this.stati[p];
    if (this.fortuna[p] > 0 && scarto !== null) { this.fortuna[p]--; scarto = 0; }
    const prima = s.serie, g = C.segna(s, this.mappa, scarto);
    if (g === 3 && prima >= 30) this.annuncia(p, `perde una serie di ${prima}! 💔`, `Serie di ${prima} persa 💔`);
    else if (s.serie > 0 && s.serie % 50 === 0) this.annuncia(p, `è a ${s.serie} colpi di fila! 🔥`, `${s.serie} colpi di fila! 🔥`);
    return g;
  }

  azione(p, a) {
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (Number.isInteger(a.seq) && a.seq > this.seqDi[p]) this.seqDi[p] = a.seq;
    if (this.finita) return { errore: 'La partita è finita' };
    if (a.tipo === 'pensa') return { ok: true };
    if (a.tipo !== 'colpo') return { errore: 'Mossa non valida' };
    const s = this.stati[p], i = Number(a.i);
    if (i !== s.prossimo || i >= this.mappa.cerchi.length) return { ok: true, vecchio: true }; // già contato (mancato dal server)
    // un colpo prima che il cerchio si veda non vale (con un po' di margine per l'orologio)
    const c = this.mappa.cerchi[i];
    if (this.tempo() < c.t - this.mappa.appare - 1500) return { errore: 'Troppo presto' };
    const scarto = a.d === null || a.d === undefined ? null : Math.max(-1000, Math.min(1000, Math.round(Number(a.d))));
    this.segnaPer(p, Number.isFinite(scarto) ? scarto : null);
    this.controllaFine();
    return { ok: true };
  }

  // i computer colpiscono quando arriva il loro cerchio; le persone che non rispondono perdono i cerchi vecchi
  scadenza() {
    if (this.finita) return null;
    let min = this.inizioMappa + this.mappa.fine + TOLLERANZA;
    for (let p = 0; p < this.n; p++) {
      const s = this.stati[p], c = this.mappa.cerchi[s.prossimo];
      if (!c) continue;
      min = Math.min(min, this.inizioMappa + c.t + (this.botLiv[p] ? 40 : TOLLERANZA));
    }
    return min;
  }
  controllaTempo() {
    if (this.finita) return false;
    const t = this.tempo();
    let cambiato = false;
    for (let p = 0; p < this.n; p++) {
      const s = this.stati[p];
      while (s.prossimo < this.mappa.cerchi.length) {
        const c = this.mappa.cerchi[s.prossimo];
        if (this.botLiv[p]) { if (t < c.t + 40) break; this.segnaPer(p, this.esitoBot(p, s.prossimo, this.botLiv[p])); }
        else { if (t < c.t + TOLLERANZA) break; this.segnaPer(p, null); }
        cambiato = true;
      }
    }
    if (t >= this.mappa.fine + TOLLERANZA) { this.chiudi(); return true; }
    this.controllaFine();
    return cambiato || this.finita;
  }
  controllaFine() { if (!this.finita && this.stati.every((s) => s.prossimo >= this.mappa.cerchi.length)) this.chiudi(); }

  // !win + parola segreta: i prossimi 20 colpi presi valgono tutti 300
  trucco(posto) { if (T.consuma(this, posto)) this.fortuna[posto] = 20; }

  chiudi() {
    if (this.finita) return;
    this.finita = true;
    // i cerchi rimasti (partita chiusa prima) sono mancati
    for (let p = 0; p < this.n; p++) while (this.stati[p].prossimo < this.mappa.cerchi.length) C.segna(this.stati[p], this.mappa, null);
    const punti = this.stati.map((s) => s.punti);
    if (!this.sfida) {
      const s = this.stati[0], k = `${this.livello}:${this.secondi}`;
      const lista = (RECORD[k] = RECORD[k] || []);
      const voce = { punti: s.punti, prec: Math.round(C.precisione(s) * 100) / 100, id: Math.random() };
      lista.push(voce); lista.sort((a, b) => b.punti - a.punti); lista.splice(5);
      this.posizioneRecord = lista.indexOf(voce);
      const fc = s.conteggi[3] === 0 ? ' · nessun cerchio mancato! 🏅' : '';
      this.risultato = { fazioni: [{ posti: [0], punti: s.punti }], etichetta: 'punti', pareggio: false, vincitori: [0], titolo: `${s.punti} punti · precisione ${C.precisione(s).toFixed(2)}% · serie massima ${s.serieMax}${fc}` };
      return;
    }
    const max = Math.max(...punti), primi = punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: primi.length > 1, vincitori: primi.length === 1 ? primi : [] };
  }

  vista(p) {
    const s = this.stati[p] || this.stati[0];
    return {
      gioco: this.id, n: this.n, sfida: this.sfida, seme: this.seme, livello: this.livello, secondi: this.secondi,
      traMs: this.inizioMappa - adesso(), seq: this.seqDi[p] || 0,
      mio: { ...s, conteggi: s.conteggi.slice(), prec: C.precisione(s) },
      altri: this.stati.map((x) => ({ punti: x.punti, serie: x.serie, prec: Math.round(C.precisione(x) * 100) / 100, fatti: x.prossimo })),
      totale: this.mappa.cerchi.length,
      record: this.sfida ? [] : RECORD[`${this.livello}:${this.secondi}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

module.exports = {
  meta: {
    id: 'cerchi',
    nome: 'Cerchi a tempo',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Clicca i cerchi a tempo di musica quando l\'anello li tocca: 300, 100, 50 o mancato. Serie di colpi, precisione e sfida sulla stessa mappa.',
    alias: ['cerchi a tempo', 'cerchi', 'osu', 'osu!', 'ritmo', 'cerchietti', 'clicca a tempo', 'rhythm'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile (100 bpm, cerchi grandi)', 'Media (120 bpm)', 'Difficile (140 bpm, cerchi piccoli e veloci)'], predefinito: 'medio' },
      { id: 'durata', nome: 'Durata della mappa', valori: DURATE, etichette: ['1 minuto', '1 minuto e mezzo', '2 minuti'], predefinito: 60 },
    ],
    regole: [
      'Sul campo compaiono dei cerchi numerati, a tempo con la musica. Attorno a ogni cerchio un anello si stringe: quando l\'anello tocca il cerchio, clicca (o tocca) il cerchio.',
      'Il giudizio dipende da quanto sei preciso: 300 se sei proprio a tempo, poi 100, poi 50; troppo presto o troppo tardi è mancato (❌). Va colpito prima il cerchio col numero più basso: un clic su quello dopo non vale finché c\'è quello prima.',
      'Ogni colpo preso allunga la SERIE e i punti crescono con la serie (un 300 con 50 colpi di fila vale il triplo). Un cerchio mancato azzera la serie.',
      'La precisione è come nel gioco vero: (300 × i 300 + 100 × i 100 + 50 × i 50) diviso (300 × tutti i cerchi).',
      'Le mappe sono sempre nuove (nascono da un seme). Facile: 100 battiti al minuto, cerchi grandi che si vedono presto; difficile: 140, cerchi piccoli, pochi istanti per vederli e raffiche di cerchi vicini. Sul computer conviene il mouse, sul telefono il dito.',
      'Il tempo lo misura il tuo browser, così la rete non cambia il giudizio. Il gioco non si ferma con le dispense: la musica continua!',
      'In sfida (da 2 a 8) tutti suonano la stessa mappa nello stesso momento: vince chi fa più punti. Il computer facile prende spesso 100 e 50 e manca qualche cerchio, il medio è buono, il difficile quasi sempre 300.',
    ],
  },
  crea: (o) => new Cerchi(o),
  bot: () => ({ tipo: 'pensa' }),
  _test: { C, Cerchi, ATTESA_INIZIO, TOLLERANZA },
};
