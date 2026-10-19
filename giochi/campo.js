// MINESWEEPER su una griglia condivisa: tutti cliccano insieme, in tempo reale (niente turni).
// Collaborazione: una mina fa perdere tutti. Sfida: +1 per ogni casella scoperta, -15 per una mina, vince chi ha più punti.
// Da 1 a 8 giocatori, solo persone. Il primo clic è sempre sicuro e apre una zona.
const DIFFICOLTA = {
  facile: { c: 10, r: 10, m: 15, nome: 'Facile' },
  normale: { c: 18, r: 14, m: 45, nome: 'Normale' },
  difficile: { c: 30, r: 16, m: 110, nome: 'Difficile' },
  estremo: { c: 45, r: 24, m: 260, nome: 'Estremo' },
  impossibile: { c: 60, r: 32, m: 480, nome: 'Impossibile' },
};
const PENALITA_MINA = 15;
const RECORD = {}; // migliori tempi per difficoltà e modalità (in memoria finché il server è acceso)

class Campo {
  constructor({ n, opzioni = {} }) {
    this.id = 'campo';
    this.n = n;
    this.livello = DIFFICOLTA[opzioni.difficolta] ? opzioni.difficolta : 'facile';
    this.modo = n > 1 && opzioni.modo === 'sfida' ? 'sfida' : 'coop';
    const d = DIFFICOLTA[this.livello];
    this.C = d.c; this.R = d.r; this.M = d.m;
    this.mine = null; // si piazzano al primo clic
    this.aperte = new Uint8Array(this.C * this.R);
    this.bandiere = new Map(); // casella → posto di chi l'ha messa
    this.esplose = new Map();  // sfida: casella → posto di chi ci è finito sopra
    this.punti = new Array(n).fill(0);
    this.daAprire = this.C * this.R - this.M;
    this.aperteTot = 0;
    this.turno = null;
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.tempo = 0;       // ms accumulati
    this.dal = null;      // quando il cronometro è ripartito
    this.inPausa = false;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  vicini(i) {
    const r = Math.floor(i / this.C), c = i % this.C, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < this.R && cc >= 0 && cc < this.C) out.push(rr * this.C + cc);
    }
    return out;
  }
  piazza(primo) {
    const vietate = new Set([primo, ...this.vicini(primo)]);
    const libere = [];
    for (let i = 0; i < this.C * this.R; i++) if (!vietate.has(i)) libere.push(i);
    for (let k = libere.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [libere[k], libere[j]] = [libere[j], libere[k]]; }
    this.mine = new Uint8Array(this.C * this.R);
    for (let k = 0; k < this.M; k++) this.mine[libere[k]] = 1;
    this.numeri = new Uint8Array(this.C * this.R);
    for (let i = 0; i < this.C * this.R; i++) this.numeri[i] = this.vicini(i).reduce((s, j) => s + this.mine[j], 0);
    this.dal = Date.now();
  }
  cronometro() { return this.tempo + (this.dal && !this.inPausa && !this.finita ? Date.now() - this.dal : 0); }
  // il server la chiama quando qualcuno apre o chiude le dispense (pausa per tutti)
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si && this.dal) this.tempo += Date.now() - this.dal;
    if (!si && this.mine) this.dal = Date.now();
    this.inPausa = si;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    const i = Number(a && a.cella);
    if (!Number.isInteger(i) || i < 0 || i >= this.C * this.R) return { errore: 'Casella non valida' };
    if (a.tipo === 'bandiera') {
      if (this.aperte[i]) return { ok: true };
      if (this.bandiere.has(i)) this.bandiere.delete(i); else this.bandiere.set(i, p);
      return { ok: true };
    }
    if (a.tipo !== 'apri') return { errore: 'Mossa non valida' };
    if (this.aperte[i] || this.bandiere.has(i)) return { ok: true }; // le bandierine proteggono dai clic sbagliati
    if (!this.mine) this.piazza(i);
    if (this.mine[i]) {
      if (this.modo === 'coop') {
        this.aperte[i] = 1;
        this.scoppiata = i;
        this.annuncia(p, 'ha trovato una mina! 💥', 'hai trovato una mina! 💥', true);
        return this.chiudi(false);
      }
      // sfida: la mina esplode solo per te
      this.esplose.set(i, p);
      this.aperte[i] = 1;
      this.punti[p] -= PENALITA_MINA;
      this.annuncia(p, `trova una mina (−${PENALITA_MINA})`, `mina! −${PENALITA_MINA} punti`);
      return { ok: true };
    }
    // apertura a cascata delle zone vuote
    const coda = [i];
    let nuove = 0;
    while (coda.length) {
      const k = coda.pop();
      if (this.aperte[k] || this.mine[k]) continue;
      this.aperte[k] = 1;
      this.bandiere.delete(k);
      nuove++;
      if (this.numeri[k] === 0) for (const j of this.vicini(k)) if (!this.aperte[j]) coda.push(j);
    }
    this.aperteTot += nuove;
    this.punti[p] += nuove;
    if (this.aperteTot >= this.daAprire) return this.chiudi(true);
    return { ok: true };
  }

  // !win banana: una casella sicura da scoprire (meglio se vicina a quelle già aperte e senza mine intorno)
  suggerimentoWin() {
    if (!this.mine) return null; // prima del primo clic è tutto sicuro
    let meglio = -1, voto = -1;
    for (let i = 0; i < this.C * this.R; i++) {
      if (this.aperte[i] || this.mine[i] || this.bandiere.has(i)) continue;
      const v = (this.vicini(i).some((j) => this.aperte[j] && !this.mine[j]) ? 2 : 0) + (this.numeri[i] === 0 ? 1 : 0);
      if (v > voto) { voto = v; meglio = i; }
    }
    if (meglio < 0) return null;
    return `💡 Casella sicura: riga ${Math.floor(meglio / this.C) + 1}, colonna ${(meglio % this.C) + 1}`;
  }

  chiudi(vinta) {
    if (this.dal && !this.inPausa) this.tempo += Date.now() - this.dal;
    this.dal = null;
    this.finita = true;
    this.vinta = vinta;
    const ms = this.tempo;
    let vincitori;
    if (this.modo === 'coop') {
      vincitori = vinta ? Array.from({ length: this.n }, (_, i) => i) : [];
      if (vinta) {
        const chiave = `${this.livello}:${this.n === 1 ? 'solo' : 'coop'}`;
        const lista = (RECORD[chiave] = RECORD[chiave] || []);
        lista.push({ ms, giocatori: this.n, quando: Date.now(), id: this.nEv });
        lista.sort((a, b) => a.ms - b.ms);
        lista.splice(5);
        this.posizioneRecord = lista.findIndex((x) => x.id === this.nEv && x.ms === ms);
        this.annuncia(null, `Campo sminato in ${fmt(ms)}!`, '', true);
      }
    } else {
      const max = Math.max(...this.punti);
      vincitori = this.punti.map((x, k) => (x === max ? k : -1)).filter((k) => k >= 0);
      this.annuncia(vincitori.length === 1 ? vincitori[0] : null, 'vince la sfida!', 'hai vinto la sfida!', true);
    }
    this.risultato = {
      fazioni: this.punti.map((x, k) => ({ posti: [k], punti: x })),
      etichetta: this.modo === 'coop' ? 'caselle scoperte' : 'punti',
      pareggio: this.modo === 'sfida' && vincitori.length > 1,
      vincitori,
    };
    return { ok: true };
  }

  vista() {
    // la griglia viaggia come testo: h = coperta, f = bandiera, 0-8 = aperta, m = mina (a fine partita), x = mina esplosa
    let g = '';
    for (let i = 0; i < this.C * this.R; i++) {
      if (this.aperte[i]) g += this.mine && this.mine[i] ? 'x' : String(this.numeri[i]);
      else if (this.finita && this.mine && this.mine[i]) g += this.bandiere.has(i) ? 'F' : 'm'; // F = bandiera giusta
      else if (this.bandiere.has(i)) g += this.finita && this.mine ? 'W' : 'f';              // W = bandiera sbagliata
      else g += 'h';
    }
    const chiave = `${this.livello}:${this.n === 1 ? 'solo' : 'coop'}`;
    return {
      gioco: this.id, n: this.n, livello: this.livello, nomeLivello: DIFFICOLTA[this.livello].nome, modo: this.modo,
      colonne: this.C, righe: this.R, mine: this.M, griglia: g,
      bandiere: Object.fromEntries(this.bandiere), esplose: Object.fromEntries(this.esplose), scoppiata: this.scoppiata ?? null,
      bandiereTot: this.bandiere.size, punti: this.punti, aperte: this.aperteTot, daAprire: this.daAprire,
      tempo: this.cronometro(), corre: !!this.dal && !this.inPausa && !this.finita, inPausaCampo: this.inPausa,
      record: RECORD[chiave] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1, vinta: this.vinta ?? null,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}
function fmt(ms) { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

module.exports = {
  meta: {
    id: 'campo',
    nome: 'Campo minato',
    tipo: 'tabellone',
    soloPersone: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Minesweeper su una griglia condivisa: da soli, insieme o in sfida. 5 difficoltà.',
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: Object.keys(DIFFICOLTA), etichette: Object.values(DIFFICOLTA).map((d) => `${d.nome} · ${d.c}×${d.r}, ${d.m} mine`), predefinito: 'facile' },
      { id: 'modo', nome: 'Modalità (in più giocatori)', valori: ['coop', 'sfida'], etichette: ['Collaborazione', 'Sfida a punti'], predefinito: 'coop' },
    ],
    regole: [
      'Nella griglia sono nascoste delle mine. Clic sinistro: scopri una casella. Clic destro: metti o togli una bandierina dove pensi ci sia una mina.',
      'Il numero su una casella scoperta dice quante mine ci sono nelle 8 caselle intorno. Una casella senza mine vicine apre da sola tutta la zona.',
      'Il primo clic è sempre sicuro. Il cronometro parte al primo clic. Una casella con la bandierina non si può scoprire per sbaglio: togli prima la bandierina.',
      'Difficoltà: Facile 10×10 con 15 mine, Normale 18×14 con 45, Difficile 30×16 con 110, Estremo 45×24 con 260, Impossibile 60×32 con 480.',
      'In più giocatori la griglia è una sola: tutti cliccano quando vogliono e vedono subito le mosse e i cursori degli altri. Si gioca solo tra persone.',
      'Collaborazione: vincete insieme quando sono scoperte tutte le caselle senza mine; se qualcuno scopre una mina perdete tutti. I tempi migliori finiscono in classifica.',
      'Sfida: +1 punto per ogni casella che scopri (anche quelle aperte a cascata), −15 se scopri una mina (la mina resta segnata e si continua). Quando il campo è pulito vince chi ha più punti.',
      'Se qualcuno apre le dispense (Esc) la partita e il cronometro si fermano per tutti.',
    ],
  },
  crea: (o) => new Campo(o),
  _test: { DIFFICOLTA },
};
