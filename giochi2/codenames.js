// NOMI IN CODICE: due squadre (rossi e blu) e una griglia 5×5 di parole. In ogni squadra un capitano conosce la mappa
// segreta (9 parole della squadra che inizia, 8 dell'altra, 7 neutrali, 1 assassino) e dà un indizio: UNA parola e un
// numero. Gli agenti della sua squadra scoprono le parole che pensano siano loro (fino a numero + 1), e possono
// fermarsi quando vogliono. Una parola dell'altra squadra o neutrale chiude il turno, l'assassino fa perdere subito.
// Vince la squadra che scopre per prima tutte le sue parole.
// Le squadre si formano alternando i posti (pari = rossi, dispari = blu); il capitano gira a ogni partita.
// Gli agenti "votano" toccando una parola (i compagni vedono il segno) e la gira il primo che preme Scopri.
const { TEMI, ASSOCIAZIONI } = require('./codenames-dati');

const ROSSI = 0, BLU = 1, NEUTRO = 2, ASSASSINO = 3;
const NOMI_SQ = ['rossi', 'blu'];
const TUTTE = Object.keys(ASSOCIAZIONI);
const PAUSA_CAMBIO = 1700; // a fine turno un attimo per vedere che cosa è successo
const TEMPI = ['no', 90, 150];
// il tema "pensato" dal capitano computer viaggia con la sua mossa in una chiave Symbol: dal browser non può arrivare
const PENSATO = Symbol('tema del computer');

// ---------------- parole e indizi ----------------
const NORMALI = new Map(); // le parole della raccolta e dei temi tornano spesso: si normalizzano una volta sola
function norm(t) {
  const k = String(t ?? '');
  let v = NORMALI.get(k);
  if (v === undefined) { v = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); if (NORMALI.size < 20000) NORMALI.set(k, v); }
  return v;
}
const radice = (w) => w.replace(/[aeiou]+$/, '');
const VOC = /^[a-zàèéìíòóù]+$/;

// due parole sono "la stessa" o una è parte dell'altra (gatto / gatti / gattino, sole / girasole)
function inConflitto(indizio, parola) {
  const a = norm(indizio), b = norm(parola);
  if (a === b) return true;
  const corta = a.length < b.length ? a : b;
  if (corta.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  const ra = radice(a), rb = radice(b);
  return ra.length >= 3 && ra === rb;
}

// controlla un indizio rispetto alle parole ancora coperte: null se va bene, altrimenti il motivo
function controllaIndizio(parola, numero, coperte) {
  const t = String(parola ?? '').normalize('NFC').toLowerCase().trim();
  if (!t) return 'Scrivi la parola dell\'indizio';
  if (/\s/.test(t)) return 'L\'indizio è UNA parola sola, senza spazi';
  if (!VOC.test(t)) return 'L\'indizio deve essere una parola con sole lettere (niente numeri, apostrofi o simboli)';
  if (t.length < 2 || t.length > 20) return 'L\'indizio deve avere da 2 a 20 lettere';
  const n = Number(numero);
  if (!Number.isInteger(n) || n < 1 || n > 9) return 'Il numero va da 1 a 9';
  const c = coperte.find((w) => inConflitto(t, w));
  if (c) return norm(t) === norm(c) ? `«${t}» è una delle parole sul tavolo` : `«${t}» somiglia troppo a «${c}», che è sul tavolo`;
  return null;
}

// come un agente computer capisce un indizio: { tema: peso }
function interpreta(parola) {
  const w = norm(parola);
  const pesi = {};
  const metti = (t, p) => { pesi[t] = Math.max(pesi[t] || 0, p); };
  for (const [t, nomi] of Object.entries(TEMI)) {
    for (const nome of nomi.map(norm)) {
      if (nome === w) metti(t, 1);
      else if (radice(nome).length >= 3 && radice(nome) === radice(w)) metti(t, 0.85);
      else if (w.length >= 5 && nome.length >= 5 && w.slice(0, 5) === nome.slice(0, 5)) metti(t, 0.6);
    }
  }
  // l'indizio è una parola della raccolta (non sul tavolo): valgono i suoi temi
  const nota = ASSOCIAZIONI[w] || ASSOCIAZIONI[TUTTE.find((x) => radice(x).length >= 3 && radice(x) === radice(w))];
  if (nota) for (const t of nota) metti(t, 0.6);
  return pesi;
}

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const caso = (a) => a[Math.floor(Math.random() * a.length)];

class NomiInCodice {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'codenames';
    this.n = n;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.tempo = TEMPI.includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : null;
    this.membri = [[], []];
    for (let i = 0; i < n; i++) this.membri[i % 2].push(i);
    const k = Math.max(0, Number(primo) || 0);
    this.capitani = [this.membri[0][k % this.membri[0].length], this.membri[1][k % this.membri[1].length]];
    this.iniziale = Math.random() < 0.5 ? ROSSI : BLU;
    this.parole = mescola([...TUTTE]).slice(0, 25);
    const mappa = [...new Array(9).fill(this.iniziale), ...new Array(8).fill(1 - this.iniziale), ...new Array(7).fill(NEUTRO), ASSASSINO];
    this.mappa = mescola(mappa);
    this.scoperte = new Array(25).fill(null); // { colore, chi }
    this.registro = []; // { squadra, capitano, parola, numero, temi, esiti: [{ carta, colore, chi }] }
    this.voti = new Array(n).fill(null);
    this.scelte = new Array(n).fill(null); // la scelta dell'agente computer, tenuta per il turno
    this.sq = this.iniziale;
    this.vincitore = null;
    this.motivo = null;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.inAttesa = false;
    this.pausaMs = PAUSA_CAMBIO;
    this.iniziaIndizio();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  squadraDi(p) { return p % 2; }
  agenti(sq) { return this.membri[sq].filter((i) => i !== this.capitani[sq]); }
  coperte() { return this.parole.filter((_, i) => !this.scoperte[i]); }
  restano(sq) { return this.mappa.filter((c, i) => c === sq && !this.scoperte[i]).length; }
  get indizio() { const r = this.registro[this.registro.length - 1]; return r && this.fase === 'ricerca' ? r : null; }
  get fatti() { const r = this.indizio; return r ? r.esiti.length : 0; }
  // il computer capitano "pensa" un po' di più; gli agenti si muovono a ritmo di discussione
  get velocitaBot() { return this.fase === 'indizio' ? 3 : 1.3; }

  iniziaIndizio() {
    this.fase = 'indizio';
    this.turno = this.capitani[this.sq];
    this.voti.fill(null);
    this.fineTempo = this.tempo ? Date.now() + this.tempo * 1000 : null;
  }

  // gli agenti della squadra di turno che devono ancora fare qualcosa (il server fa muovere i computer tra questi)
  attesi() {
    if (this.finita || this.fase !== 'ricerca' || this.inAttesa) return [];
    const ag = this.agenti(this.sq);
    const persone = ag.filter((i) => !this.bot[i]);
    return ag.filter((i) => {
      if (!this.bot[i] || !persone.length) return true;
      // con compagni in carne e ossa il computer dà solo un consiglio (vota) e lascia decidere a loro
      const s = this.sceltaAgente(i, this.bot[i]);
      return s.carta != null && this.voti[i] !== s.carta;
    });
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    const sq = this.squadraDi(p);
    if (a.tipo === 'indizio') {
      if (this.fase !== 'indizio') return { errore: 'Adesso gli agenti stanno cercando le parole' };
      if (p !== this.turno) return { errore: p === this.capitani[sq] ? 'Non è il turno della tua squadra' : 'L\'indizio lo dà il capitano' };
      const motivo = controllaIndizio(a.parola, a.numero, this.coperte());
      if (motivo) return { errore: motivo };
      const parola = String(a.parola).normalize('NFC').toLowerCase().trim();
      const numero = Number(a.numero);
      this.registro.push({ squadra: sq, capitano: p, parola, numero, temi: a[PENSATO] || interpreta(parola), esiti: [] });
      this.fase = 'ricerca';
      this.turno = null;
      this.voti.fill(null);
      this.fineTempo = this.tempo ? Date.now() + this.tempo * 1000 : null;
      this.annuncia(p, `dà l'indizio: «${parola.toUpperCase()}» ${numero}`, `hai dato l'indizio «${parola.toUpperCase()}» ${numero}`);
      return { ok: true };
    }
    if (!['vota', 'scopri', 'passa'].includes(a.tipo)) return { errore: 'Mossa non valida' };
    if (this.fase !== 'ricerca') return { errore: 'Aspetta l\'indizio del capitano' };
    if (p === this.capitani[sq]) return { errore: 'Il capitano non può scoprire le parole: dà solo gli indizi' };
    if (sq !== this.sq) return { errore: 'È il turno dell\'altra squadra' };
    if (a.tipo === 'passa') {
      if (this.fatti < 1) return { errore: 'Scoprite almeno una parola prima di passare' };
      this.annuncia(p, 'passa: fine del turno', 'passi: fine del turno');
      this.fineTurno();
      return { ok: true };
    }
    if (a.tipo === 'vota' && (a.carta === null || a.carta === undefined)) { this.voti[p] = null; return { ok: true }; }
    const c = Number(a.carta);
    if (!Number.isInteger(c) || c < 0 || c >= 25) return { errore: 'Parola non valida' };
    if (this.scoperte[c]) return { errore: 'Questa parola è già scoperta' };
    if (a.tipo === 'vota') { this.voti[p] = this.voti[p] === c ? null : c; return { ok: true }; }
    this.scopri(p, c);
    return { ok: true };
  }

  scopri(p, c) {
    const sq = this.sq;
    const colore = this.mappa[c];
    const r = this.indizio;
    this.scoperte[c] = { colore, chi: p };
    r.esiti.push({ carta: c, colore, chi: p });
    this.voti.fill(null);
    const w = this.parole[c].toUpperCase();
    if (colore === ASSASSINO) {
      this.annuncia(p, `scopre ${w}: era l'ASSASSINO! 💀`, `hai scoperto ${w}: era l'ASSASSINO! 💀`, true);
      return this.chiudi(1 - sq, 'assassino');
    }
    if (colore !== NEUTRO && this.restano(colore) === 0) {
      this.annuncia(p, `scopre ${w}: ${colore === sq ? 'l\'ultima parola!' : `l'ultima dei ${NOMI_SQ[colore]}…`}`, `hai scoperto ${w}`, true);
      return this.chiudi(colore, colore === sq ? 'tutte' : 'regalo');
    }
    if (colore === sq) {
      const resta = r.numero + 1 - r.esiti.length;
      this.annuncia(p, `scopre ${w}: giusta! ✔`, `${w}: giusta! ✔`);
      if (resta <= 0) this.fineTurno();
      return;
    }
    this.annuncia(p, colore === NEUTRO ? `scopre ${w}: neutrale, fine del turno` : `scopre ${w}: è dei ${NOMI_SQ[colore]}! Fine del turno`,
      colore === NEUTRO ? `${w} è neutrale: fine del turno` : `${w} è dei ${NOMI_SQ[colore]}! Fine del turno`);
    this.fineTurno();
  }

  // a fine turno una pausa breve (si vede l'ultima parola girata), poi tocca al capitano dell'altra squadra
  fineTurno() {
    this.voti.fill(null);
    this.turno = null;
    this.fineTempo = null;
    this.inAttesa = true;
    this.pausaMs = PAUSA_CAMBIO;
  }
  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.sq = 1 - this.sq;
    this.iniziaIndizio();
  }

  // orologio (opzione): allo scadere il computer dà l'indizio al posto del capitano, o finisce il turno degli agenti
  scadenza() { return this.finita || this.inAttesa || !this.fineTempo ? null : this.fineTempo; }
  controllaTempo() {
    if (this.finita || this.inAttesa || !this.fineTempo || Date.now() < this.fineTempo) return false;
    if (this.fase === 'indizio') {
      const p = this.turno;
      const r = this.azione(p, capitanoComputer(this, p, 'medio'));
      if (r.errore) { this.fineTempo = null; return false; }
      if (this.evento) this.evento = { ...this.evento, testo: `tempo scaduto: il computer suggerisce «${this.indizio.parola.toUpperCase()}» ${this.indizio.numero}`, testoIo: `tempo scaduto: il computer ha dato l'indizio «${this.indizio.parola.toUpperCase()}» ${this.indizio.numero}` };
    } else {
      this.annuncia(null, `Tempo scaduto: tocca ai ${NOMI_SQ[1 - this.sq]}`, '');
      this.fineTurno();
    }
    return true;
  }

  chiudi(vincitore, motivo) {
    this.finita = true;
    this.inAttesa = false;
    this.turno = null;
    this.fase = 'fine';
    this.vincitore = vincitore;
    this.motivo = motivo;
    const trovate = [ROSSI, BLU].map((s) => this.mappa.filter((c, i) => c === s && this.scoperte[i]).length);
    this.risultato = {
      fazioni: [ROSSI, BLU].map((s) => ({ posti: this.membri[s], punti: trovate[s] })),
      etichetta: 'parole', pareggio: false, vincitori: this.membri[vincitore],
    };
  }

  // la chat: i capitani conoscono la mappa, quindi durante la partita parlano solo tra loro (niente indizi in più)
  leggiChat(p, testo) {
    if (this.finita || !this.capitani.includes(p)) return {};
    return { soloPer: [...new Set(this.capitani)], privato: '🤐 Sei capitano: durante la partita il tuo messaggio lo legge solo l\'altro capitano' };
  }

  puoReagire(p) { return this.finita || !this.capitani.includes(p); } // anche un'emoji sarebbe un indizio
  // ---------------- computer ----------------
  // l'agente computer sceglie (e ricorda per questo momento del turno) quale parola girare, o se passare
  sceltaAgente(p, livello) {
    const chiave = `${this.registro.length}:${this.fatti}`;
    const s = this.scelte[p];
    if (s && s.chiave === chiave && (s.carta == null || !this.scoperte[s.carta])) return s;
    const nuova = { chiave, ...agenteComputer(this, p, livello) };
    this.scelte[p] = nuova;
    return nuova;
  }

  // il trucco segreto (!win): all'agente, quando cerca la sua squadra, sussurra le parole della squadra ancora coperte;
  // al capitano, quando deve dare l'indizio, quello del computer difficile
  suggerimentoWin(posto) {
    if (this.finita || this.inAttesa) return null;
    const sq = this.squadraDi(posto);
    if (sq !== this.sq) return null;
    if (posto === this.capitani[sq]) {
      if (this.fase !== 'indizio') return null;
      const a = capitanoComputer(this, posto, 'difficile');
      return `💡 ${a.parola.toUpperCase()} ${a.numero}`;
    }
    if (this.fase !== 'ricerca') return null;
    return `${sq === ROSSI ? '🟥' : '🟦'} ${this.parole.filter((_, i) => this.mappa[i] === sq && !this.scoperte[i]).join(', ').toUpperCase()}`;
  }

  vista(posto) {
    const sq = this.squadraDi(Math.max(0, posto));
    const capitano = this.capitani.includes(posto);
    const r = this.indizio;
    const mieVoti = this.fase === 'ricerca' && sq === this.sq;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      aSquadre: true, parole: this.parole, scoperte: this.scoperte,
      // la mappa segreta la vedono solo i capitani (e tutti a fine partita)
      mappa: capitano || this.finita ? this.mappa : null,
      capitani: this.capitani, sq: this.sq, iniziale: this.iniziale,
      indizio: r ? { parola: r.parola, numero: r.numero, squadra: r.squadra, fatti: r.esiti.length, resta: r.numero + 1 - r.esiti.length } : null,
      restano: [this.restano(ROSSI), this.restano(BLU)],
      totali: [ROSSI, BLU].map((s) => this.mappa.filter((c) => c === s).length),
      voti: mieVoti ? this.voti : null,
      registro: this.registro.map((x) => ({ squadra: x.squadra, capitano: x.capitano, parola: x.parola, numero: x.numero, esiti: x.esiti.map((e) => ({ parola: this.parole[e.carta], colore: e.colore })) })),
      tempoFine: this.scadenza(), ora: Date.now(),
      vincitore: this.vincitore, motivo: this.motivo,
      // chi ha perso legge "Vincono i Blu" (chi ha vinto "Avete vinto!", scritto dal sito)
      finita: this.finita, risultato: this.risultato && !this.membri[this.vincitore].includes(posto) ? { ...this.risultato, titolo: `Vincono i ${NOMI_SQ[this.vincitore][0].toUpperCase()}${NOMI_SQ[this.vincitore].slice(1)}!` } : this.risultato,
      evento: this.evento,
    };
  }
}

// che cosa sa il capitano: per ogni tema quante parole copre di ogni colore (solo parole ancora coperte)
function analisiTemi(g, sq) {
  const conti = {};
  g.parole.forEach((w, i) => {
    if (g.scoperte[i]) return;
    const c = g.mappa[i];
    for (const t of ASSOCIAZIONI[w]) {
      const x = conti[t] || (conti[t] = { tema: t, mie: [], avv: 0, neu: 0, ass: 0 });
      if (c === sq) x.mie.push(i);
      else if (c === ASSASSINO) x.ass++;
      else if (c === NEUTRO) x.neu++;
      else x.avv++;
    }
  });
  return Object.values(conti).filter((x) => x.mie.length > 0);
}
// il primo nome del tema che si può dire con queste parole sul tavolo
function nomeValido(t, coperte, usati) {
  return TEMI[t].find((nome) => !usati.has(nome) && !controllaIndizio(nome, 1, coperte)) || null;
}

// la parola della raccolta che, come indizio, separa meglio le parole della squadra da tutte le altre:
// { parola, numero, pesi } con numero = quante parole della squadra hanno più temi in comune con l'indizio di
// qualsiasi parola avversaria, neutrale o dell'assassino (così un agente attento le trova per prime, senza rischi)
// (i temi come numeri, per contare in fretta i temi in comune tra due parole)
const N_TEMA = Object.fromEntries(Object.keys(TEMI).map((t, i) => [t, i]));
const TEMI_N = Object.fromEntries(TUTTE.map((w) => [w, ASSOCIAZIONI[w].map((t) => N_TEMA[t])]));
const SEGNO = new Uint8Array(Object.keys(TEMI).length);
function indizioParola(g, sq, coperte, usati) {
  const tavolo = g.parole.map((w, i) => ({ temi: TEMI_N[w], c: g.mappa[i], i })).filter((x) => !g.scoperte[x.i]);
  let meglio = null;
  for (const w of mescola([...TUTTE])) {
    if (usati.has(w) || g.parole.includes(w)) continue;
    const suoi = TEMI_N[w];
    for (const t of suoi) SEGNO[t] = 1;
    let peggiore = 0, numero = 0;
    const mie = [];
    for (const x of tavolo) {
      let v = 0;
      for (const t of x.temi) v += SEGNO[t];
      if (x.c === sq) { if (v >= 2) mie.push(v); } else if (v > peggiore) peggiore = v;
    }
    for (const t of suoi) SEGNO[t] = 0;
    for (const v of mie) if (v > peggiore) numero++;
    if (numero < 2 || (meglio && numero <= meglio.numero)) continue;
    if (controllaIndizio(w, 1, coperte)) continue;
    meglio = { parola: w, numero, pesi: Object.fromEntries(ASSOCIAZIONI[w].map((t) => [t, 1])) };
  }
  return meglio;
}

const PRUDENZA = {
  // quali temi accetta: niente assassino mai; avversari e neutrali dipendono dal livello
  difficile: (x) => x.ass === 0 && x.avv === 0 && x.neu === 0,
  medio: (x) => x.ass === 0 && x.avv === 0 && x.neu <= 1,
  facile: (x) => x.ass === 0,
};
const MASSIMO = { facile: 2, medio: 3, difficile: 9 };

function capitanoComputer(g, p, livello) {
  const L = PRUDENZA[livello] ? livello : 'medio';
  const sq = g.squadraDi(p);
  const coperte = g.coperte();
  const usati = new Set(g.registro.map((r) => r.parola));
  const temi = mescola(analisiTemi(g, sq)).map((x) => ({ ...x, nome: nomeValido(x.tema, coperte, usati) })).filter((x) => x.nome);
  let scelto = null;
  if (L === 'facile') {
    // indizi da 1 o 2, a volte senza badare alle parole degli avversari o neutrali
    const sicuri = temi.filter((x) => x.ass === 0 && x.avv === 0);
    const tra = Math.random() < 0.55 && sicuri.length ? sicuri : temi.filter(PRUDENZA.facile);
    scelto = caso(tra.filter((x) => x.mie.length >= 2).length && Math.random() < 0.5 ? tra.filter((x) => x.mie.length >= 2) : tra);
  } else {
    const buoni = temi.filter(PRUDENZA[L]);
    // più parole possibile; a parità, meno neutrali
    buoni.sort((a, b) => Math.min(b.mie.length, MASSIMO[L]) - Math.min(a.mie.length, MASSIMO[L]) || a.neu - b.neu);
    scelto = buoni[0] || null;
    if (L === 'difficile') {
      // se il meglio "pulito" è una parola sola, si può rischiare un neutrale per prenderne tre o più
      const audace = temi.filter((x) => x.ass === 0 && x.avv === 0 && x.neu === 1 && x.mie.length >= 3).sort((a, b) => b.mie.length - a.mie.length)[0];
      if ((!scelto || scelto.mie.length <= 1) && audace) scelto = audace;
    }
    if (!scelto) scelto = temi.filter(PRUDENZA.facile).sort((a, b) => (a.avv + a.neu) - (b.avv + b.neu))[0] || null;
  }
  if (L === 'difficile') {
    // il difficile prova anche le parole della raccolta (non sul tavolo) come indizio: valgono tutti i loro temi
    // insieme, e conta solo le parole della squadra che "somigliano" all'indizio più di ogni altra sul tavolo
    const meglio = indizioParola(g, sq, coperte, usati);
    if (meglio && meglio.numero > (scelto ? Math.min(scelto.mie.length, MASSIMO[L]) : 0) && !(scelto && scelto.neu)) {
      return { tipo: 'indizio', parola: meglio.parola, numero: meglio.numero, [PENSATO]: meglio.pesi };
    }
  }
  if (scelto) {
    const numero = Math.max(1, Math.min(scelto.mie.length, MASSIMO[L]));
    return { tipo: 'indizio', parola: scelto.nome, numero, [PENSATO]: { [scelto.tema]: 1 } };
  }
  // (quasi impossibile) nessun tema utile: un indizio qualsiasi valido per una parola della squadra
  for (const t of Object.keys(TEMI)) {
    const nome = nomeValido(t, coperte, new Set());
    if (nome) return { tipo: 'indizio', parola: nome, numero: 1, [PENSATO]: { [t]: 1 } };
  }
  return { tipo: 'indizio', parola: 'indizio', numero: 1 };
}

// quanto spesso l'agente computer "capisce male" e gira una parola fuori tema
const SVISTA = { facile: 0.2, medio: 0.07, difficile: 0.02 };

function agenteComputer(g, p, livello) {
  const L = SVISTA[livello] != null ? livello : 'medio';
  const r = g.indizio;
  const fatti = r.esiti.length;
  const coperte = g.parole.map((_, i) => i).filter((i) => !g.scoperte[i]);
  const punteggio = (temi, i) => ASSOCIAZIONI[g.parole[i]].reduce((s, t) => s + (temi[t] || 0), 0);
  const candidati = mescola(coperte.filter((i) => punteggio(r.temi, i) > 0)).sort((a, b) => punteggio(r.temi, b) - punteggio(r.temi, a));
  // gli indizi vecchi della squadra con parole ancora da trovare (per il tentativo in più)
  const vecchi = [];
  for (const x of g.registro.slice(0, -1)) {
    if (x.squadra !== r.squadra) continue;
    const giuste = x.esiti.filter((e) => e.colore === x.squadra).length;
    if (giuste >= x.numero) continue;
    for (const i of coperte) if (punteggio(x.temi, i) > 0 && !candidati.includes(i) && !vecchi.includes(i)) vecchi.push(i);
  }
  const fuori = coperte.filter((i) => !candidati.includes(i));
  const svista = () => (fuori.length && Math.random() < SVISTA[L] ? { carta: caso(fuori) } : null);
  if (fatti < r.numero) {
    if (fatti > 0 && L === 'facile' && Math.random() < 0.12) return { carta: null, passa: true };
    if (candidati.length) return svista() || { carta: candidati[0] };
    if (fatti === 0) return { carta: caso(coperte) }; // indizio incomprensibile: bisogna pur provarne una
    return { carta: null, passa: true };
  }
  // il tentativo in più: solo se c'è qualcosa di un indizio vecchio (il facile non ci prova)
  const prova = L === 'difficile' ? 0.9 : L === 'medio' ? 0.4 : 0;
  if (vecchi.length && Math.random() < prova) return { carta: vecchi[0] };
  return { carta: null, passa: true };
}

function bot(g, p, livello) {
  if (g.fase === 'indizio' && g.turno === p) return capitanoComputer(g, p, livello);
  const s = g.sceltaAgente(p, livello);
  if (s.carta == null) return { tipo: 'passa' };
  // da solo (o al posto di chi è via) gira la parola; tra computer prima la "propone" ai compagni
  const persone = g.agenti(g.sq).filter((i) => !g.bot[i] && i !== p);
  if (g.bot[p] && (persone.length || g.voti[p] !== s.carta)) {
    if (g.voti[p] !== s.carta) return { tipo: 'vota', carta: s.carta };
  }
  return { tipo: 'scopri', carta: s.carta };
}

module.exports = {
  meta: {
    id: 'codenames',
    squadreSala: { nomi: ['🟥 Rossi', '🟦 Blu'], min: 4 }, // la sala mostra la squadra di ogni posto
    nome: 'Nomi in codice',
    tipo: 'tabellone',
    giocatori: [4, 5, 6, 7, 8],
    descrizione: 'Due squadre, 25 parole e un capitano che dà indizi di una parola sola. Trovate le vostre, evitate l\'assassino!',
    alias: ['codenames', 'nomi in codice', 'spie', 'agenti segreti', 'indizi', 'parole segrete'],
    opzioni: [
      { id: 'tempo', nome: 'Tempo per turno', valori: ['no', 90, 150], etichette: ['Senza limite', '90 secondi', '150 secondi'], predefinito: 'no' },
    ],
    regole: [
      'Due squadre, i Rossi e i Blu, da 4 a 8 giocatori: le squadre si formano alternando i posti (1º rossi, 2º blu, 3º rossi…). In ogni squadra c\'è un capitano, che cambia a ogni partita; gli altri sono agenti.',
      'Sul tavolo ci sono 25 parole. Solo i capitani vedono la mappa segreta: 9 parole sono della squadra che inizia, 8 dell\'altra, 7 sono neutrali e 1 è l\'assassino.',
      'Il capitano di turno dà un indizio: UNA parola e un numero (da 1 a 9), cioè quante parole della squadra c\'entrano. L\'indizio non può essere una delle parole coperte sul tavolo né una loro parte o forma (con «girasole» in gioco non si può dire «sole»; con «gatto» non si può dire «gatti»).',
      'Gli agenti della squadra scoprono le parole una alla volta, fino a numero + 1 (il tentativo in più serve a recuperare un indizio vecchio). Possono fermarsi quando vogliono, dopo averne scoperta almeno una, con «Passa».',
      'Come si sceglie: tocca una parola per proporla, così i compagni vedono il tuo segno sopra; per girarla premi «Scopri». Decide il primo agente che conferma, quindi mettetevi d\'accordo in chat!',
      'I capitani non possono parlare con la squadra: durante la partita i loro messaggi in chat li legge solo l\'altro capitano (e la chat globale è chiusa per chi è al tavolo).',
      'Se la parola è della tua squadra si continua; se è neutrale o degli avversari il turno passa all\'altra squadra (e la parola avversaria resta scoperta per loro). Se è l\'assassino la tua squadra perde subito.',
      'Vince la squadra che scopre per prima tutte le sue parole (anche se l\'ultima l\'hanno scoperta per sbaglio gli avversari).',
      'Con l\'opzione del tempo, il capitano e gli agenti hanno 90 o 150 secondi per turno: se il capitano non decide, il computer suggerisce un indizio per lui; se gli agenti non finiscono, il turno passa.',
      'Il computer sa fare sia il capitano sia l\'agente, usando una rete di temi (per esempio «mela» → frutta, albero, rosso). Il capitano facile dà indizi da 1 o 2 parole e a volte rischia; il medio fino a 3 parole sicure; il difficile cerca l\'indizio più lungo senza nessun rischio. L\'agente facile si confonde più spesso, il difficile quasi mai e usa bene il tentativo in più. Se in squadra ci sono persone, gli agenti computer propongono la loro parola (il segno sopra) e lasciano decidere a voi.',
    ],
  },
  crea: (o) => new NomiInCodice(o),
  bot,
  _test: { controllaIndizio, inConflitto, interpreta, capitanoComputer, agenteComputer, ROSSI, BLU, NEUTRO, ASSASSINO },
};
