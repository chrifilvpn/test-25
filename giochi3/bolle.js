// BOLLE COLORATE: la griglia di bolle attaccata al soffitto; dal cannone in basso si tira una bolla alla volta, che
// rimbalza sui lati e si attacca dove tocca. 3 o più dello stesso colore scoppiano e cadono le bolle rimaste appese al
// niente. Ogni tanto il soffitto scende. Da soli si gioca per il tempo; in sfida (2-8) tutti hanno la stessa griglia e le
// stesse bolle: vince chi la svuota prima. Regole in public/js/giochi3/bolle-logica.js (uguali nel browser).
const B = require('../public/js/giochi3/bolle-logica');
const { SfidaRompicapo } = require('../giochi2/rompicapo-sfida');
const { ora: adesso } = require('../giochi/orologio');
const VELOCE = !!process.env.TEST_VELOCE;

const LIVELLI = ['facile', 'medio', 'difficile'];
const RECORD = {};
const RITMO = { facile: 2.8, medio: 2.0, difficile: 1.4 }; // secondi tra un tiro e l'altro del computer
const ANGOLI = Array.from({ length: 113 }, (_, k) => -1.4 + k * 0.025);

class Bolle extends SfidaRompicapo {
  constructor(o) {
    super('bolle', o, 12 * 60000);
    const op = o.opzioni || {};
    this.livello = LIVELLI.includes(op.difficolta) ? op.difficolta : 'medio';
    this.seme = Math.floor(Math.random() * 2 ** 31);
    const t0 = B.nuova(this.seme, this.livello);
    this.iniziali = B.quante(t0);
    this.tavole = Array.from({ length: this.n }, () => ({ ...B.copia(t0), mosse: 0, seq: 0, fatto: null }));
    this.avvia();
  }

  progresso(i, t) { return t.perso ? 0 : Math.max(0, Math.min(0.99, 1 - B.quante(t) / Math.max(1, this.iniziali))); }
  risolta(p, t) { return !t.perso && B.quante(t) === 0; }
  fraseArrivo(p, t) { return { altri: `svuota la griglia in ${t.colpi} tiri 🫧`, io: `Griglia vuota in ${t.colpi} tiri! 🫧` }; }
  // classifica: chi ha svuotato (in ordine di tempo), poi chi gioca ancora (meno bolle è meglio), poi chi è arrivato in fondo
  ordineArrivo() {
    const fatti = this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto);
    const altri = this.tavole.map((_, i) => i).filter((i) => !fatti.includes(i)).sort((a, b) => {
      const ta = this.tavole[a], tb = this.tavole[b];
      if (!!ta.perso !== !!tb.perso) return ta.perso ? 1 : -1;
      return B.quante(ta) - B.quante(tb) || tb.punti - ta.punti;
    });
    return [...fatti, ...altri];
  }
  chiudi() {
    if (this.finita) return;
    if (!this.sfida && this.tavole[0].fatto == null) {
      const t = this.tavole[0];
      this.fineMs = adesso(); this.finita = true;
      this.risultato = { fazioni: [{ posti: [0], punti: t.punti }], etichetta: 'punti', pareggio: false, vincitori: [], titolo: t.perso ? `Le bolle sono arrivate in fondo (${t.punti} punti)` : 'Partita interrotta' };
      return;
    }
    super.chiudi();
  }

  mossa(p, t, a) {
    if (a.tipo === 'scambia') { B.scambia(t); return { ok: true }; }
    if (a.tipo !== 'tira') return { errore: 'Mossa non valida' };
    const r = B.tira(t, Number(a.angolo));
    if (r.errore) return r;
    t.mosse++;
    if (r.cadute.length >= 8) this.annuncia(p, `fa cadere ${r.cadute.length} bolle! 🫧`, `${r.cadute.length} bolle giù! 🫧`);
    if (r.perso) {
      t.ritirato = true;
      this.annuncia(p, 'ha le bolle in fondo: fuori! 💥', 'Le bolle sono arrivate in fondo 💥', true);
      this.controllaFine();
    }
    return { ok: true };
  }

  // il tiro migliore tra tanti angoli; voto: quanto vale un tiro per quel livello
  migliore(t, livello) {
    let meglio = null, mv = -Infinity;
    for (const a of ANGOLI) {
      const v = B.prova(t, a);
      if (!v) continue;
      let x = v.scoppiate * 2 + v.cadute * 3 + v.vicini * 0.8 - v.riga * 0.05 - (v.perso ? 100 : 0);
      if (livello === 'facile') x += Math.random() * 4;
      else if (livello === 'medio') x += Math.random() * 1.2;
      if (x > mv) { mv = x; meglio = { a, v }; }
    }
    return meglio;
  }
  // !win + parola segreta: dove mirare per il tiro migliore
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const m = this.migliore(t, 'difficile');
    if (!m) return null;
    const gradi = Math.round((m.a * 180) / Math.PI);
    const dove = gradi === 0 ? 'dritto in su' : `${Math.abs(gradi)}° verso ${gradi < 0 ? 'sinistra' : 'destra'}`;
    return `💡 Tira ${dove}: ${m.v.scoppiate ? `scoppiano ${m.v.scoppiate} bolle${m.v.cadute ? ` e ne cadono ${m.v.cadute}` : ''}` : 'prepari un bel gruppo'}`;
  }

  // ---- computer: prova tutti gli angoli; il difficile sceglie il migliore e scambia la bolla se conviene ----
  ritmoBot(p, livello, primo) {
    if (VELOCE) return 1;
    return (RITMO[livello] || 2) * 1000 * (0.7 + Math.random() * 0.6) * (primo ? 1.8 : 1);
  }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    if (t.perso || !B.quante(t)) return { tipo: 'pensa' };
    const m = this.migliore(t, livello);
    if (livello === 'difficile' && t.prossima !== t.attuale) {
      // e se tirasse l'altra bolla?
      const k = B.copia(t); B.scambia(k);
      const m2 = this.migliore(k, livello);
      if (m2 && m && m2.v.scoppiate + m2.v.cadute > m.v.scoppiate + m.v.cadute + 1) return { tipo: 'scambia' };
    }
    if (livello === 'facile' && Math.random() < 0.2) return { tipo: 'tira', angolo: ANGOLI[Math.floor(Math.random() * ANGOLI.length)] };
    return { tipo: 'tira', angolo: m ? m.a : 0 };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.livello] = RECORD[this.livello] || []);
    const voce = { ms: t.fatto, tiri: t.colpi, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = `Griglia vuota in ${t.colpi} tiri · ${t.punti} punti 🫧`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      livello: this.livello, g: t.g, sfasa: t.sfasa, r: t.r.a, colori: t.colori, ogni: t.ogni, mancati: t.mancati, punti: t.punti, colpi: t.colpi,
      attuale: t.attuale, prossima: t.prossima, perso: !!t.perso, iniziali: this.iniziali,
      bolleAltri: this.tavole.map((x) => B.quante(x)), persiAltri: this.tavole.map((x) => !!x.perso),
      record: this.sfida ? [] : RECORD[this.livello] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'bolle',
    nome: 'Bolle colorate',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Mira e tira: 3 bolle dello stesso colore scoppiano e cadono quelle rimaste appese. In sfida tutti hanno la stessa griglia: vince chi la svuota prima.',
    alias: ['bolle colorate', 'bolle', 'bubble shooter', 'bubble', 'spara bolle', 'puzzle bobble', 'palline colorate'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile (4 colori)', 'Media (5 colori)', 'Difficile (6 colori)'], predefinito: 'medio' },
    ],
    regole: [
      'In alto c\'è una griglia di bolle colorate. Muovi il mouse (o il dito) per mirare e clicca (o alza il dito) per tirare la bolla del cannone: rimbalza sui lati e si attacca dove tocca.',
      'Se la bolla tocca altre bolle del suo colore e insieme sono almeno 3, scoppiano tutte. Le bolle che restano senza appiglio (non più attaccate al soffitto) cadono e valgono il doppio.',
      'Sotto il cannone si vede la bolla dopo: clicca sul cannone (o premi spazio o il tasto destro) per scambiarle. Arrivano solo bolle dei colori ancora in gioco.',
      'Dopo un certo numero di tiri senza far scoppiare niente (8 nel facile, 6 nel medio, 5 nel difficile) il soffitto scende di una riga. Se le bolle arrivano alla linea in fondo hai perso.',
      'Punti: 10 per bolla scoppiata, 20 per bolla caduta, più un premio se ne cadono almeno 5 insieme.',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno la stessa griglia e le stesse bolle: vince chi la svuota prima; chi arriva in fondo è fuori. Se finisce il tempo (12 minuti) conta chi ha meno bolle.',
      'Il computer prova tutti gli angoli: il facile sceglie spesso male ed è lento, il medio sceglie bene ma non sempre, il difficile è veloce, tira il colpo migliore e sa scambiare la bolla.',
    ],
  },
  crea: (o) => new Bolle(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { B, LIVELLI },
};
