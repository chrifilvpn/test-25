// CARAMELLE IN FILA: si scambiano due caramelle vicine per fare file di 3 o più dello stesso colore; le file spariscono,
// le caramelle sopra cadono e dall'alto ne arrivano di nuove. Con 4, 5 o a L si fanno le caramelle speciali.
// Si gioca a tempo (2 minuti): vince chi fa più punti. Tutti partono dallo stesso schema e le caramelle nuove arrivano
// nello stesso ordine per tutti (stesso seme). Regole in public/js/giochi3/caramelle-logica.js (uguali nel browser).
const C = require('../public/js/giochi3/caramelle-logica');
const { SfidaRompicapo } = require('../giochi2/rompicapo-sfida');
const { ora: adesso } = require('../giochi/orologio');
const VELOCE = !!process.env.TEST_VELOCE;

const DURATE = [120, 60, 180];
const RECORD = {};
// secondi tra una mossa e l'altra del computer
const RITMO = { facile: 2.6, medio: 1.7, difficile: 1.1 };

class Caramelle extends SfidaRompicapo {
  constructor(o) {
    super('caramelle', o, 0);
    const op = o.opzioni || {};
    this.durata = (DURATE.includes(Number(op.durata)) ? Number(op.durata) : 120) * 1000;
    this.limiteMs = this.durata;
    this.seme = Math.floor(Math.random() * 2 ** 31);
    const t0 = C.nuova(this.seme);
    this.tavole = Array.from({ length: this.n }, () => ({ ...C.copia(t0), mosse: 0, seq: 0, fatto: null, combo: 0, ultima: null }));
    this.avvia();
  }

  // si gioca a tempo anche da soli: finisce quando il cronometro arriva alla durata
  scadenza() {
    if (this.finita || this.inPausa) return null;
    const bot = (this.prossimaBot || []).filter((x, i) => x != null && this.botLiv[i] && !this.tavole[i].ritirato);
    return Math.min(...bot, this.inizio + this.durata + this.tempoFermo);
  }
  controllaTempo() {
    if (this.finita || this.inPausa) return false;
    if (this.cronometro() >= this.durata) { this.annuncia(null, 'Tempo scaduto! ⏰', 'Tempo scaduto! ⏰', true); this.chiudi(); return true; }
    return super.controllaTempo();
  }
  progresso(i, t) { const max = Math.max(1, ...this.tavole.map((x) => x.punti)); return t.punti / max; }
  risolta() { return false; }
  // la sfida a tempo non finisce quando restano solo i computer: si va fino in fondo (o finché resta una persona)
  controllaFine() {
    if (this.finita) return;
    const persone = this.tavole.filter((t, i) => !this.botLiv[i] && !t.ritirato);
    if (!persone.length && this.botLiv.some((b) => !b)) this.chiudi();
  }

  mossa(p, t, a) {
    if (a.tipo !== 'scambia') return { errore: 'Mossa non valida' };
    const r = C.scambia(t, Number(a.i), Number(a.j));
    if (r.errore) return r;
    t.mosse++;
    t.ultima = { punti: r.punti, catene: r.passi.length };
    if (r.passi.length >= 4 && r.punti >= 600) this.annuncia(p, `fa una catena da ${r.punti} punti! 🍬`, `Catena da ${r.punti} punti! 🍬`);
    return { ok: true };
  }

  // !win + parola segreta: la mossa che vale di più (provata fino in fondo, con le caramelle che arriveranno)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.ritirato) return null;
    const m = this.migliore(t, (v) => v.punti);
    if (!m) return null;
    const [i, j] = m, [x, y] = C.xy(i);
    const verso = j === i + 1 ? 'con quella a destra' : 'con quella sotto';
    return `💡 Scambia la caramella di riga ${y + 1}, colonna ${x + 1} ${verso}: vale ${C.valuta(t, i, j).punti} punti`;
  }
  migliore(t, voto) {
    let meglio = null, mv = -Infinity;
    for (const [i, j] of C.mosse(t)) { const v = C.valuta(t, i, j); if (v === -1) continue; const x = voto(v); if (x > mv) { mv = x; meglio = [i, j]; } }
    return meglio;
  }

  // ---- computer: il facile sceglie a caso tra le mosse buone, il medio guarda la prima fila, il difficile pensa
  // anche alle caramelle speciali ----
  ritmoBot(p, livello, primo) {
    if (VELOCE) return 1;
    return (RITMO[livello] || 1.7) * 1000 * (0.7 + Math.random() * 0.6) * (primo ? 1.6 : 1);
  }
  mossaBot(p, livello) {
    const t = this.tavole[p], tutte = C.mosse(t);
    if (!tutte.length) return { tipo: 'pensa' };
    let m;
    if (livello === 'facile') m = tutte[Math.floor(Math.random() * tutte.length)];
    else if (livello === 'medio') m = Math.random() < 0.3 ? tutte[Math.floor(Math.random() * tutte.length)] : this.migliore(t, (v) => v.primo);
    else m = this.migliore(t, (v) => v.primo + v.speciali * 150 + v.punti * 0.2);
    return { tipo: 'scambia', i: m[0], j: m[1] };
  }

  chiudi() {
    if (this.finita) return;
    this.fineMs = adesso();
    if (this.fermoDal) { this.tempoFermo += this.fineMs - this.fermoDal; this.fermoDal = null; }
    this.finita = true;
    if (!this.sfida) {
      const t = this.tavole[0];
      const lista = (RECORD[this.durata] = RECORD[this.durata] || []);
      const voce = { punti: t.punti, id: Math.random() };
      lista.push(voce); lista.sort((x, y) => y.punti - x.punti); lista.splice(5);
      this.posizioneRecord = lista.indexOf(voce);
      this.risultato = { fazioni: [{ posti: [0], punti: t.punti }], etichetta: 'punti', pareggio: false, vincitori: [0], titolo: `${t.punti} punti in ${t.mosse} mosse` };
      return;
    }
    const ordine = this.tavole.map((_, i) => i).filter((i) => !this.tavole[i].ritirato).sort((a, b) => this.tavole[b].punti - this.tavole[a].punti);
    const max = ordine.length ? this.tavole[ordine[0]].punti : 0;
    const primi = ordine.filter((i) => this.tavole[i].punti === max);
    this.classifica = ordine;
    this.arrivi = ordine;
    this.risultato = { fazioni: this.tavole.map((t, i) => ({ posti: [i], punti: t.punti })), etichetta: 'punti', pareggio: primi.length > 1, vincitori: primi.length === 1 ? primi : [] };
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      c: t.c, s: t.s, r: t.r.a, punti: t.punti, mosse: t.mosse, durata: this.durata,
      resta: Math.max(0, this.durata - this.cronometro()),
      puntiAltri: this.tavole.map((x) => x.punti), mosseAltri: this.tavole.map((x) => x.mosse),
      record: this.sfida ? [] : RECORD[this.durata] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'caramelle',
    nome: 'Caramelle in fila',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Scambia due caramelle vicine per fare file di 3: con 4, 5 o a L nascono le caramelle speciali. Due minuti, stesso schema per tutti: chi fa più punti?',
    alias: ['caramelle in fila', 'caramelle', 'candy crush', 'candy', 'match 3', 'tre in fila', 'dolcetti', 'bejeweled'],
    opzioni: [
      { id: 'durata', nome: 'Durata', valori: DURATE, etichette: ['2 minuti', '1 minuto', '3 minuti'], predefinito: 120 },
    ],
    regole: [
      'Trascina una caramella su quella vicina (o toccale una dopo l\'altra) per scambiarle: lo scambio vale solo se fa una fila di almeno 3 caramelle dello stesso colore, in orizzontale o in verticale.',
      'Le file spariscono, le caramelle sopra cadono e dall\'alto ne arrivano di nuove: se si formano altre file sparisce anche quelle, e ogni passo della catena vale di più.',
      'Caramelle speciali: 4 in fila = caramella a STRISCE (quando sparisce svuota tutta la riga o la colonna); 5 a L o a T = caramella INCARTATA (esplode e porta via le 8 intorno); 5 in fila = BOMBA DI COLORE (scambiala con una caramella: spariscono tutte quelle del suo colore).',
      'Due speciali scambiate tra loro esplodono insieme: strisce + strisce fanno una croce, strisce + incartata tre righe e tre colonne, due incartate un quadrato 5×5, bomba + speciale trasforma tutto quel colore, due bombe svuotano tutto.',
      'Punti: 20 per caramella, moltiplicati per il passo della catena; in più 60 per una caramella a strisce, 100 per un\'incartata, 200 per una bomba. Se non ci sono più mosse la griglia si rimescola.',
      'Si gioca a tempo (2 minuti, o 1, o 3). In sfida (da 2 a 8) tutti partono dalla stessa griglia e le caramelle nuove arrivano nello stesso ordine per tutti: vince chi fa più punti. Da soli si gioca per il record.',
      'Il computer facile sceglie a caso tra le mosse buone ed è lento; il medio cerca la fila che vale di più; il difficile è veloce e cerca anche le caramelle speciali.',
    ],
  },
  crea: (o) => new Caramelle(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { C, DURATE },
};
