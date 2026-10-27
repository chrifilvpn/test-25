// DISEGNA E INDOVINA: a turno uno disegna, gli altri scrivono in chat cosa pensano che sia.
// Chi disegna sceglie tra 3 parole; ha 80 secondi. Chi indovina prima prende più punti; chi disegna prende punti
// per ogni persona che indovina. Le parole indovinate non compaiono in chat (le legge la partita: leggiChat).
// I tratti del disegno arrivano con l'evento 'input' e ripartono a tutti col ciclo a tick (solo quelli nuovi).
const PAROLE = require('./disegna-parole');

const SCELTA_MS = 15000, RIVELA_MS = 5000;
const DURATE = [80, 60, 120];
const GIRI = [2, 1, 3];
const COLORI = ['#1f2430', '#ffffff', '#8a8f99', '#e0473c', '#f08a24', '#f2c230', '#3aa655', '#2f7fd8', '#8e55c9', '#e36fa5', '#8b5a2b', '#9adcd4'];
const SPESSORI = [3, 7, 14, 28];
const MAX_SEGMENTI = 5000;

// confronto tollerante: minuscole, senza accenti, senza spazi doppi né punteggiatura
const pulisci = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function distanza(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

class Disegna {
  constructor({ n, opzioni = {} }) {
    this.id = 'disegna';
    this.n = n;
    this.durata = (DURATE.includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 80) * 1000;
    this.giri = GIRI.includes(Number(opzioni.giri)) ? Number(opzioni.giri) : 2;
    this.punti = new Array(n).fill(0);
    this.usciti = new Array(n).fill(false);
    this.usate = new Set();
    const cat = PAROLE.categorie[opzioni.categoria];
    this.elenco = cat ? cat.parole : PAROLE; // le parole della categoria scelta (o tutte)
    this.turnoN = -1; // quanti turni di disegno sono stati fatti
    this.tickMs = 100;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.chatSistema = [];
    this.inPausa = false; this.pausaDal = null;
    this.storico = [];
    this.prossimoTurno(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attesi() { return []; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) { const d = Date.now() - this.pausaDal; this.fineFase += d; this.inizio += d; }
    this.inPausa = si;
  }

  prossimoTurno(ora) {
    // ognuno disegna una volta per giro, nell'ordine dei posti (chi è uscito si salta)
    for (;;) {
      this.turnoN++;
      if (this.turnoN >= this.giri * this.n) return this.chiudi();
      if (!this.usciti[this.turnoN % this.n]) break;
    }
    this.disegnatore = this.turnoN % this.n;
    this.giro = Math.floor(this.turnoN / this.n) + 1;
    const tutte = this.elenco;
    const pool = tutte.filter((p) => !this.usate.has(p));
    const scelte = [];
    while (scelte.length < 3) { const w = (pool.length ? pool : tutte)[Math.floor(Math.random() * (pool.length || tutte.length))]; if (!scelte.includes(w)) scelte.push(w); }
    this.scelte = scelte;
    this.parola = null;
    this.fase = 'scelta';
    this.fineFase = ora + SCELTA_MS;
    this.segmenti = [];
    this.nSeg = 0;
    this.versione = (this.versione || 0) + 1; // cambia quando il disegno si cancella o si annulla un tratto
    this.indovinato = new Array(this.n).fill(null); // tempo in cui ha indovinato
    this.ordine = [];
    this.puntiTurno = new Array(this.n).fill(0);
    this.aiuti = [];
  }

  scegli(i, ora) {
    this.parola = this.scelte[i];
    this.usate.add(this.parola);
    this.fase = 'disegno';
    this.inizio = ora;
    this.fineFase = ora + this.durata;
    this.aiuti = [];
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'La partita è in pausa' };
    if (!a || !a.tipo) return { errore: 'Mossa non valida' };
    if (p !== this.disegnatore) return { errore: 'Adesso disegna un altro: tu indovina scrivendo in chat' };
    if (a.tipo === 'scegli') {
      if (this.fase !== 'scelta') return { errore: 'La parola è già stata scelta' };
      const i = Number(a.i);
      if (![0, 1, 2].includes(i)) return { errore: 'Scegli una delle tre parole' };
      this.scegli(i, Date.now());
      this.annuncia(p, 'ha scelto la parola: si comincia! ✏️', 'hai scelto: disegna!');
      return { ok: true };
    }
    if (this.fase !== 'disegno') return { errore: 'Aspetta' };
    if (a.tipo === 'pulisci') { this.segmenti = []; this.versione++; return { ok: true }; }
    if (a.tipo === 'annulla') {
      const ultimo = this.segmenti.length ? this.segmenti[this.segmenti.length - 1].k : null;
      if (ultimo === null) return { ok: true };
      this.segmenti = this.segmenti.filter((s) => s.k !== ultimo);
      this.versione++;
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // tratti del disegno: { t: 'seg', k: numero del tratto, c: colore, s: spessore, p: [[x, y], ...] } (x 0..1000, y 0..700)
  input(p, d) {
    if (this.finita || this.inPausa || p !== this.disegnatore || this.fase !== 'disegno' || !d || d.t !== 'seg') return;
    if (this.segmenti.length >= MAX_SEGMENTI) return;
    const c = COLORI.includes(d.c) ? d.c : COLORI[0];
    const s = SPESSORI.includes(Number(d.s)) ? Number(d.s) : SPESSORI[1];
    const k = Math.floor(Number(d.k)) || 0;
    const punti = (Array.isArray(d.p) ? d.p : []).slice(0, 80).map((q) => [Math.max(0, Math.min(1000, Math.round(Number(q[0]) || 0))), Math.max(0, Math.min(700, Math.round(Number(q[1]) || 0)))]);
    if (!punti.length) return;
    this.segmenti.push({ id: ++this.nSeg, k, c, s, p: punti, f: !!d.f });
  }

  // la chat: chi disegna (o chi ha già indovinato) non può scrivere la parola; chi la scrive giusta indovina
  leggiChat(p, testo) {
    if (this.fase !== 'disegno' || !this.parola || this.usciti[p]) return {};
    const t = pulisci(testo), w = pulisci(this.parola);
    const contiene = t === w || (` ${t} `).includes(` ${w} `);
    if (p === this.disegnatore) return contiene ? { nascondi: true, privato: 'Non puoi scrivere la parola in chat!' } : {};
    if (this.indovinato[p] !== null) return contiene ? { nascondi: true, privato: 'Hai già indovinato: non svelarla agli altri 🤫' } : {};
    // vale anche la parola dentro una frase ("secondo me è un gatto"): altrimenti il messaggio la svelerebbe a tutti
    if (contiene) {
      const ora = Date.now();
      this.indovinato[p] = ora - this.inizio;
      this.ordine.push(p);
      const resta = Math.max(0, this.fineFase - ora) / this.durata;
      const pt = Math.round(50 + 250 * resta) + (this.ordine.length === 1 ? 50 : 0);
      this.punti[p] += pt; this.puntiTurno[p] += pt;
      this.punti[this.disegnatore] += 60; this.puntiTurno[this.disegnatore] += 60;
      this.chatSistema.push(`✅ ${'@' + p} ha indovinato! (+${pt})`);
      this.annuncia(p, `ha indovinato! +${pt}`, `hai indovinato: «${this.parola}»! +${pt}`);
      // tutti hanno indovinato: il turno finisce prima
      if (this.indovini().every((i) => this.indovinato[i] !== null)) this.rivela(ora);
      return { nascondi: true, cambiato: true };
    }
    if (w.length >= 4 && distanza(t, w) === 1) return { privato: `«${testo}» ci sei quasi! 🔥` };
    return {};
  }
  indovini() { return Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.disegnatore && !this.usciti[i]); }

  // una lettera in più come aiuto a metà tempo e a tre quarti (mai più di un terzo della parola)
  suggerimento() {
    if (!this.parola) return null;
    return [...this.parola].map((ch, i) => (ch === ' ' || ch === '-' || ch === '\'' ? ch : this.aiuti.includes(i) ? ch : '_'));
  }

  rivela(ora) {
    this.fase = 'rivela';
    this.fineFase = ora + RIVELA_MS;
    this.storico.push({ disegnatore: this.disegnatore, parola: this.parola, indovinato: this.indovinato.map((x) => x !== null) });
    this.chatSistema.push(`La parola era: «${this.parola}»`);
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    if (this.fase === 'scelta' && ora >= this.fineFase) { this.scegli(Math.floor(Math.random() * 3), ora); this.annuncia(this.disegnatore, 'non ha scelto: parola a caso ✏️', 'tempo scaduto: ti tocca una parola a caso'); return true; }
    if (this.fase === 'disegno') {
      const passato = (ora - this.inizio) / this.durata;
      const lettere = [...this.parola].map((ch, i) => (/[a-zàèéìòù]/i.test(ch) ? i : -1)).filter((i) => i >= 0);
      const quanti = passato >= 0.75 ? 2 : passato >= 0.5 ? 1 : 0;
      const max = Math.floor(lettere.length / 3);
      if (this.aiuti.length < Math.min(quanti, max)) {
        const libere = lettere.filter((i) => !this.aiuti.includes(i));
        this.aiuti.push(libere[Math.floor(Math.random() * libere.length)]);
        return true;
      }
      if (ora >= this.fineFase) { this.rivela(ora); return true; }
      return false;
    }
    if (this.fase === 'rivela' && ora >= this.fineFase) { this.prossimoTurno(ora); return true; }
    return false;
  }

  esce(p) {
    this.usciti[p] = true;
    if (this.finita) return;
    if (this.usciti.filter((x) => !x).length < 2) return this.chiudi();
    if (p === this.disegnatore && (this.fase === 'scelta' || this.fase === 'disegno')) { this.parola = this.parola || this.scelte[0]; this.rivela(Date.now()); }
    else if (this.fase === 'disegno' && this.indovini().every((i) => this.indovinato[i] !== null)) this.rivela(Date.now());
  }
  rientra(p) { this.usciti[p] = false; }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    // il primo tra chi è rimasto (se il primo in classifica è uscito vince chi era dietro di lui)
    const presenti = this.punti.filter((_, i) => !this.usciti[i]);
    const max = presenti.length ? Math.max(...presenti) : Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max && !this.usciti[i] ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
  }

  // il trucco segreto (!win): quando tocca a lui indovinare gli sussurra la parola del disegno
  suggerimentoWin(posto) {
    if (this.fase !== 'disegno' || !this.parola || posto === this.disegnatore || this.usciti[posto] || this.indovinato[posto] !== null) return null;
    return `✏️ ${this.parola.toUpperCase()}`;
  }

  // (server.js) a chi ha già il disegno di questa versione si mandano solo i tratti nuovi
  alleggerisci(v, memo) {
    if (!v.segmenti) return;
    if (memo.v === this.versione && Number.isInteger(memo.id)) { v.segmenti = v.segmenti.filter((x) => x.id > memo.id); v.segmentiNuovi = true; }
    memo.v = this.versione;
    memo.id = this.nSeg;
  }

  vistaTick() {
    const ora = Date.now();
    return {
      fase: this.fase, pausa: this.inPausa, resta: Math.max(0, (this.inPausa ? this.pausaDal : ora) < this.fineFase ? this.fineFase - (this.inPausa ? this.pausaDal : ora) : 0),
      v: this.versione, seg: this.segmenti.slice(-40), // gli ultimi tratti: il browser tiene quelli che non ha
    };
  }

  vista(p) {
    const io = p === this.disegnatore;
    const vedo = io || this.fase === 'rivela' || this.finita || (this.indovinato[p] !== null && this.indovinato[p] !== undefined);
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      fase: this.fase, disegnatore: this.disegnatore, giro: this.giro, giri: this.giri, durata: this.durata,
      scelte: io && this.fase === 'scelta' ? this.scelte : null,
      parola: vedo ? this.parola : null,
      suggerimento: this.fase === 'disegno' ? this.suggerimento() : null,
      lunghezze: this.parola ? this.parola.split(' ').map((x) => x.length) : null,
      punti: this.punti, puntiTurno: this.puntiTurno, indovinato: this.indovinato.map((x) => x !== null), ordine: this.ordine,
      usciti: this.usciti, segmenti: this.segmenti, stato: this.vistaTick(), storico: this.storico,
      colori: COLORI, spessori: SPESSORI,
    };
  }
}

module.exports = {
  meta: {
    id: 'disegna',
    nome: 'Disegna e indovina',
    tipo: 'tabellone',
    soloPersone: true,
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Uno disegna, gli altri indovinano scrivendo in chat. Più sei veloce, più punti fai.',
    alias: ['disegna', 'pictionary', 'skribbl', 'indovina il disegno', 'disegno', 'gartic'],
    opzioni: [
      { id: 'tempo', nome: 'Tempo per disegnare', valori: DURATE, etichette: ['80 secondi', '60 secondi', '120 secondi'], predefinito: 80 },
      { id: 'giri', nome: 'Giri', valori: GIRI, etichette: ['2 giri', '1 giro', '3 giri'], predefinito: 2 },
      { id: 'categoria', nome: 'Parole', valori: ['tutte', ...Object.keys(PAROLE.categorie)], etichette: ['Tutte le categorie', ...Object.values(PAROLE.categorie).map((c) => c.nome)], predefinito: 'tutte' },
    ],
    regole: [
      'Si gioca solo tra persone, da 2 a 8 (è più divertente in 3 o più). A turno uno disegna e gli altri indovinano; in ogni giro tutti disegnano una volta.',
      'Chi disegna sceglie una parola tra 3 (ha 15 secondi, poi ne viene data una a caso) e la disegna sulla lavagna in 80 secondi (o 60, o 120), con i colori, gli spessori, la gomma, "annulla" e "cancella tutto".',
      'Le parole sono oltre 450; nelle opzioni si può giocare con una sola categoria: animali, cibo, casa e oggetti, vestiti, natura e luoghi, trasporti, persone, sport e giochi, altro.',
      'Non si scrivono lettere o parole sul disegno e non si dice la parola in chat: se chi disegna la scrive, il messaggio non viene mostrato.',
      'Gli altri scrivono in chat cosa pensano che sia. Maiuscole, accenti e punteggiatura non contano. Se scrivi la parola giusta (da sola o dentro una frase), il tuo messaggio non si vede (così non la sveli) e compare "ha indovinato!". Se sbagli di una sola lettera ricevi un avviso solo per te: ci sei quasi!',
      'In alto c\'è la parola nascosta con le lettere come trattini; a metà tempo e a tre quarti viene svelata una lettera (al massimo un terzo della parola).',
      'Punti di chi indovina: da 50 a 300, più ne fai quanto prima indovini (in base al tempo che resta), più 50 per il primo. Chi disegna prende 60 punti per ogni persona che indovina.',
      'Il turno finisce quando scade il tempo o quando hanno indovinato tutti; poi si vede la parola e disegna il prossimo.',
      'Dopo tutti i giri vince chi ha più punti. Chi ha già indovinato non può scrivere la parola in chat.',
      'Si ferma per tutti quando qualcuno apre le dispense: il tempo della pausa non conta.',
    ],
  },
  crea: (o) => new Disegna(o),
  bot: () => ({}),
  _test: { Disegna, pulisci, distanza, PAROLE },
};
