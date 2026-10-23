// BIGLIE (PARI O DISPARI), come nella puntata di Squid Game: due giocatori, ognuno con il suo sacchetto di biglie
// (10, o 20). A ogni mano uno NASCONDE in pugno da 1 a tutte le sue biglie; l'altro SCOMMETTE un numero delle sue
// (da 1 a tutte) e dice "pari" o "dispari". Si apre la mano: se ha indovinato prende dall'avversario tante biglie
// quante ne ha scommesse (al massimo quelle che l'avversario ha); se ha sbagliato le dà lui all'avversario.
// Poi i ruoli si scambiano. Vince chi prende tutte le biglie dell'altro (oppure, con il limite di mani, chi ne ha
// di più alla fine). Attenzione: chi ha una biglia sola può nascondere solo quella, cioè per forza "dispari".
const PAUSA = 2600;

class Biglie {
  constructor({ n = 2, primo = 0, opzioni = {} }) {
    this.id = 'biglie';
    this.n = 2;
    this.iniziali = Number(opzioni.biglie) === 20 ? 20 : 10;
    this.limite = [0, 10, 20].includes(Number(opzioni.mani)) ? Number(opzioni.mani) : 0;
    this.biglie = [this.iniziali, this.iniziali];
    this.mano = 0;                 // mani giocate
    this.nasconde = primo % 2;     // chi nasconde in questa mano
    this.storia = [];              // { nasconde, quante, punta, pari, vinto, passate }
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inAttesa = false; this.pausaMs = PAUSA;
    this.nuovaMano();
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  get indovina() { return 1 - this.nasconde; }
  nuovaMano() {
    this.mano++;
    this.fase = 'nascondi';
    this.inPugno = null;           // segreto: lo vede solo chi nasconde
    this.scommessa = null;         // { punta, pari }
    this.ultima = null;
    this.turno = this.nasconde;
  }
  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    const mie = this.biglie[p];
    if (a.tipo === 'nascondi') {
      if (this.fase !== 'nascondi') return { errore: 'Adesso non si nasconde' };
      const k = Number(a.quante);
      if (!Number.isInteger(k) || k < 1 || k > mie) return { errore: `Nascondi da 1 a ${mie} biglie` };
      this.inPugno = k;
      this.fase = 'scommetti';
      this.turno = this.indovina;
      return { ok: true };
    }
    if (a.tipo === 'scommetti') {
      if (this.fase !== 'scommetti') return { errore: 'Prima l\'altro deve nascondere le biglie' };
      const punta = Number(a.punta);
      if (!Number.isInteger(punta) || punta < 1 || punta > mie) return { errore: `Scommetti da 1 a ${mie} biglie` };
      if (typeof a.pari !== 'boolean') return { errore: 'Scegli pari o dispari' };
      return this.apri(punta, a.pari);
    }
    return { errore: 'Mossa non valida' };
  }
  // si apre la mano
  apri(punta, pari) {
    const h = this.nasconde, g = this.indovina, k = this.inPugno;
    const giusto = (k % 2 === 0) === pari;
    const passate = giusto ? Math.min(punta, this.biglie[h]) : punta, aveva = this.biglie[h];
    if (giusto) { this.biglie[h] -= passate; this.biglie[g] += passate; } else { this.biglie[g] -= passate; this.biglie[h] += passate; }
    this.ultima = { nasconde: h, quante: k, aveva, punta, pari, vinto: giusto ? g : h, passate };
    this.storia.push(this.ultima);
    this.scommessa = { punta, pari };
    const dice = pari ? 'pari' : 'dispari';
    if (giusto) this.annuncia(g, `dice "${dice}" e indovina: erano ${k}! Prende ${passate} ${passate === 1 ? 'biglia' : 'biglie'}`, `hai detto "${dice}" e hai indovinato: erano ${k}! Prendi ${passate} ${passate === 1 ? 'biglia' : 'biglie'}`);
    else this.annuncia(g, `dice "${dice}" e sbaglia: erano ${k}. Perde ${passate} ${passate === 1 ? 'biglia' : 'biglie'}`, `hai detto "${dice}" e hai sbagliato: erano ${k}. Perdi ${passate} ${passate === 1 ? 'biglia' : 'biglie'}`);
    this.fase = 'aperta';
    this.turno = null;
    this.inAttesa = true; this.pausaMs = PAUSA;
    return { ok: true };
  }
  // !win + parola segreta: quando tocchi a te scommettere, quante biglie ha in pugno l'avversario
  suggerimentoWin(posto) {
    if (this.finita || this.inAttesa || this.fase !== 'scommetti' || this.turno !== posto || this.inPugno === null) return null;
    return `💡 Ne ha ${this.inPugno} in pugno: ${this.inPugno % 2 ? 'DISPARI' : 'PARI'}`;
  }
  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    const vuoto = this.biglie.findIndex((x) => x <= 0);
    if (vuoto >= 0) return this.chiudi();
    if (this.limite && this.mano >= this.limite) return this.chiudi();
    this.nasconde = 1 - this.nasconde;
    this.nuovaMano();
  }
  chiudi() {
    this.finita = true; this.turno = null; this.fase = 'finita'; this.inAttesa = false;
    const [a, b] = this.biglie;
    const v = a === b ? [] : [a > b ? 0 : 1];
    this.risultato = { fazioni: [{ posti: [0], punti: a }, { posti: [1], punti: b }], etichetta: 'biglie', pareggio: a === b, vincitori: v };
    if (v.length) {
      const tutte = this.biglie[1 - v[0]] === 0;
      this.annuncia(v[0], tutte ? 'prende tutte le biglie! 🔮' : `vince con ${this.biglie[v[0]]} biglie! 🔮`, tutte ? 'hai preso tutte le biglie! 🔮' : `hai vinto con ${this.biglie[v[0]]} biglie! 🔮`, true);
    } else this.annuncia(null, 'Pareggio: stesse biglie a testa', '', true);
  }
  vista(posto) {
    const io = posto === 0 || posto === 1 ? posto : null;
    return {
      gioco: this.id, n: 2, turno: this.turno, fase: this.fase, finita: this.finita, risultato: this.risultato, evento: this.evento,
      inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      biglie: this.biglie.slice(), iniziali: this.iniziali, limite: this.limite, mano: this.mano,
      nasconde: this.nasconde, indovina: this.indovina,
      // quante sono in pugno: solo chi le ha nascoste (gli altri le vedono quando la mano si apre)
      inPugno: this.fase === 'aperta' || (io !== null && io === this.nasconde) ? this.inPugno : null,
      haNascosto: this.inPugno !== null,
      ultima: this.ultima, storia: this.storia.slice(-12), nStoria: this.storia.length,
    };
  }
}

// ---------------- computer ----------------
const caso = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const limita = (v, a, b) => Math.max(a, Math.min(b, v));
// un numero a caso tra 1 e max con la parità voluta (se possibile)
function conParita(max, pari) {
  const ok = []; for (let k = 1; k <= max; k++) if ((k % 2 === 0) === pari) ok.push(k);
  return ok.length ? ok[Math.floor(Math.random() * ok.length)] : 1;
}

// quanto è probabile che l'avversario nasconda un numero pari, guardando la sua storia. Si mettono insieme alcuni
// "esperti", ognuno con la sua idea, e si dà più peso a chi finora ci ha preso di più (le mani recenti contano di più):
//   - 50 e 50;  - quanto spesso nasconde pari;  - cosa fa dopo un pari o dopo un dispari (ripete o alterna?);
//   - cosa fa dopo le stesse due ultime scelte;  - "un numero a caso tra 1 e quelle che ha": con 3 biglie, per
//     esempio, due numeri su tre (1 e 3) sono dispari;  - dopo due volte uguali si cambia;  - si alterna.
// Restituisce { p, fiducia } (fiducia da 0 a 1).
const ESPERTI = [
  () => 0.5,
  (seq, i) => (seq.slice(0, i).filter((s) => s.pari).length + 1) / (i + 2),
  (seq, i) => { if (i < 1) return 0.5; const u = seq[i - 1].pari; let si = 1, n = 2; for (let k = 1; k < i; k++) if (seq[k - 1].pari === u) { n++; if (seq[k].pari) si++; } return si / n; },
  (seq, i) => { if (i < 2) return 0.5; const a = seq[i - 2].pari, b = seq[i - 1].pari; let si = 1, n = 2; for (let k = 2; k < i; k++) if (seq[k - 2].pari === a && seq[k - 1].pari === b) { n++; if (seq[k].pari) si++; } return si / n; },
  (seq, i) => Math.floor(seq[i].aveva / 2) / seq[i].aveva,
  // chi ha nascosto due volte di fila la stessa parità di solito cambia (pochi la ripetono tre volte)
  (seq, i) => (i >= 2 && seq[i - 1].pari === seq[i - 2].pari ? (seq[i - 1].pari ? 0.2 : 0.8) : 0.5),
  // chi alterna
  (seq, i) => (i >= 1 ? (seq[i - 1].pari ? 0.35 : 0.65) : 0.5),
];
function stimaPari(storia, chi, aveva = 10) {
  const seq = storia.filter((s) => s.nasconde === chi).map((s) => ({ pari: s.quante % 2 === 0, aveva: s.aveva || 10 }));
  const pesi = ESPERTI.map(() => 1);
  seq.forEach((s, i) => ESPERTI.forEach((f, k) => {
    const q = Math.min(0.97, Math.max(0.03, f(seq, i)));
    pesi[k] = Math.pow(pesi[k], 0.93) * (s.pari ? q : 1 - q) * 2; // si dimentica piano il passato
  }));
  const ora = [...seq, { pari: false, aveva }];
  const tot = pesi.reduce((a, b) => a + b, 0);
  const p = ESPERTI.reduce((somma, f, k) => somma + (pesi[k] / tot) * f(ora, seq.length), 0);
  return { p: limita(p, 0.05, 0.95), fiducia: Math.min(1, Math.abs(p - 0.5) * 2) };
}

// IL CALCOLO DEL DIFFICILE: la probabilità di vincere da ogni situazione (quante biglie ho, se tocca a me scommettere
// o nascondere, quante mani restano), giocando al meglio contro un avversario che gioca al meglio e nasconde pari o
// dispari a caso (50 e 50, tranne con una biglia sola: dispari per forza). Si calcola una volta per tipo di partita.
const TABELLE = new Map();
function tabella(T, limite) {
  const chiave = `${T}-${limite}`;
  if (TABELLE.has(chiave)) return TABELLE.get(chiave);
  const fine = (a) => (a > T / 2 ? 1 : a === T / 2 ? 0.5 : 0);
  // da un livello (W = valori dopo la mano, per il ruolo che avrò) al livello prima
  const passo = (Wd, Wn) => {
    const S = new Array(T + 1), N = new Array(T + 1); // S: scommetto io; N: nascondo io
    for (let a = 0; a <= T; a++) {
      const b = T - a;
      if (a === 0 || a === T) { S[a] = N[a] = a === T ? 1 : 0; continue; }
      // scommetto io (l'altro nasconde): dopo la mano nascondo io (Wn)
      if (b === 1) S[a] = Wn[T]; else { let m = 0; for (let x = 1; x <= a; x++) m = Math.max(m, 0.5 * Wn[a + Math.min(x, b)] + 0.5 * Wn[a - x]); S[a] = m; }
      // nascondo io (scommette l'altro): dopo la mano scommetto io (Wd)
      if (a === 1) N[a] = Wd[0]; else { let m = 1; for (let y = 1; y <= b; y++) m = Math.min(m, 0.5 * Wd[a - Math.min(y, a)] + 0.5 * Wd[a + y]); N[a] = m; }
    }
    return [S, N];
  };
  let t;
  if (limite) {
    // t[r] = [S, N] con r mani ancora da giocare
    t = [[Array.from({ length: T + 1 }, (_, a) => fine(a)), Array.from({ length: T + 1 }, (_, a) => fine(a))]];
    for (let r = 1; r <= limite; r++) t.push(passo(t[r - 1][0], t[r - 1][1]));
  } else {
    let S = Array.from({ length: T + 1 }, (_, a) => a / T), N = S.slice();
    for (let k = 0; k < 300; k++) [S, N] = passo(S, N);
    t = { S, N };
  }
  TABELLE.set(chiave, t);
  return t;
}
// probabilità di vincere dopo la mano, con a biglie mie (dopo una mia scommessa toccherà a me nascondere)
function dopoScommessa(g, a) {
  const T = g.iniziali * 2;
  if (a <= 0) return 0; if (a >= T) return 1;
  const t = tabella(T, g.limite);
  if (!g.limite) return t.N[a];
  const r = g.limite - g.mano; // mani che resteranno
  return t[Math.max(0, r)][1][a];
}

function bot(g, p, livello) {
  const mie = g.biglie[p], sue = g.biglie[1 - p];
  const manoRimaste = g.limite ? g.limite - g.mano + 1 : Infinity;
  if (g.fase === 'nascondi') {
    if (livello === 'facile') return { tipo: 'nascondi', quante: caso(1, mie) };
    if (mie === 1) return { tipo: 'nascondi', quante: 1 };
    // le mie ultime scelte da nascondere
    const mieStorie = g.storia.filter((s) => s.nasconde === p).map((s) => s.quante % 2 === 0);
    let pari = Math.random() < 0.5;
    if (livello === 'medio') {
      // niente schemi ovvi: mai tre volte di fila la stessa parità
      const n = mieStorie.length;
      if (n >= 2 && mieStorie[n - 1] === mieStorie[n - 2]) pari = !mieStorie[n - 1];
      return { tipo: 'nascondi', quante: conParita(mie, pari) };
    }
    // difficile: guarda cosa dice di solito l'avversario quando indovina e fa il contrario (ma non sempre: resta
    // imprevedibile), e non ripete più di due volte la stessa parità
    const detti = g.storia.filter((s) => s.nasconde === p).map((s) => s.pari);
    if (detti.length >= 3) {
      const pd = (detti.filter(Boolean).length + 1) / (detti.length + 2); // quanto spesso l'altro dice "pari"
      const ult = detti[detti.length - 1];
      const ripete = detti.slice(1).filter((x, i) => x === detti[i]).length / (detti.length - 1);
      const prossimo = 0.5 * pd + 0.5 * (ult ? ripete : 1 - ripete); // probabilità che dica "pari"
      pari = Math.random() < limita(1 - prossimo, 0.2, 0.8);
    }
    const n = mieStorie.length;
    if (n >= 2 && mieStorie[n - 1] === mieStorie[n - 2] && mieStorie[n - 1] === pari && Math.random() < 0.7) pari = !pari;
    return { tipo: 'nascondi', quante: conParita(mie, pari) };
  }
  // ---- scommessa ----
  if (livello === 'facile') return { tipo: 'scommetti', punta: caso(1, mie), pari: Math.random() < 0.5 };
  // chi ha una biglia sola nasconde per forza 1: dispari sicuro
  if (sue === 1) return { tipo: 'scommetti', punta: 1, pari: false };
  if (livello === 'medio') {
    // in proporzione al vantaggio: davanti rischia di più, dietro va piano
    const quota = mie / (mie + sue);
    const punta = limita(Math.round(mie * (0.15 + quota * 0.4) + (Math.random() - 0.5) * 2), 1, mie);
    return { tipo: 'scommetti', punta: Math.min(punta, Math.max(1, sue)), pari: Math.random() < 0.5 };
  }
  // difficile: studia la persona (la sua frequenza di pari e le sue abitudini) e gestisce il rischio
  const { p: pp, fiducia } = stimaPari(g.storia, 1 - p, sue);
  // non è prevedibile: di solito segue la stima, ma non sempre (se è incerta tira quasi a caso)
  const pari = Math.random() < (pp > 0.5 ? Math.min(0.97, pp + fiducia * 0.6) : Math.max(0.03, pp - fiducia * 0.6));
  const pVince = pari ? pp : 1 - pp;
  const totale = mie + sue;
  let punta;
  if (g.limite && manoRimaste <= 3) {
    // ultime mani: la puntata che dà più probabilità di vincere (calcolata in anticipo per ogni situazione), così
    // punta tutto se deve rimontare e poco se deve solo difendere il vantaggio
    let meglio = -1;
    for (let x = 1; x <= mie; x++) {
      const v = pVince * dopoScommessa(g, mie + Math.min(x, sue)) + (1 - pVince) * dopoScommessa(g, mie - x);
      if (v > meglio + 1e-9) { meglio = v; punta = x; }
    }
  } else {
    let quota;
    if (pVince >= 0.62 && sue <= mie) quota = 1;                       // può chiudere la partita: tutto
    else if (mie < totale * 0.3) quota = 0.5 + Math.random() * 0.5;      // molto indietro: rischia per rimontare
    else if (mie >= sue) quota = 0.12 + Math.random() * 0.18;            // davanti: tante puntate piccole
    else quota = 0.25 + Math.random() * 0.2;
    // inutile puntare più delle biglie dell'avversario (al massimo si prendono quelle)
    punta = quota >= 1 ? Math.min(mie, sue) : limita(Math.round(mie * quota), 1, Math.min(mie, sue));
    // la trappola: lasciarlo con una biglia sola (ne potrà puntare una sola, e nascondere solo un dispari)
    if (quota < 1 && sue >= 3 && sue - 1 <= mie * 0.5 && pVince >= 0.5) punta = sue - 1;
    // mai restare con una biglia sola se si perde: o una in meno, o tutte
    if (mie - punta === 1) punta = punta > 1 ? punta - 1 : mie;
  }
  return { tipo: 'scommetti', punta, pari };
}

module.exports = {
  meta: {
    id: 'biglie',
    nome: 'Biglie (pari o dispari)',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Squid Game: nascondi le biglie in pugno, l\'altro scommette pari o dispari. Chi indovina prende, chi sbaglia paga. Vince chi le prende tutte.',
    alias: ['biglie', 'pari o dispari', 'pari dispari', 'marbles', 'squid game', 'palline'],
    opzioni: [
      { id: 'biglie', nome: 'Biglie a testa', valori: [10, 20], etichette: ['10 biglie', '20 biglie'], predefinito: 10 },
      { id: 'mani', nome: 'Fine', valori: [0, 10, 20], etichette: ['Finché uno le prende tutte', 'Dopo 10 mani: vince chi ne ha di più', 'Dopo 20 mani: vince chi ne ha di più'], predefinito: 0 },
    ],
    regole: [
      'Si gioca in due, come nella quarta puntata di Squid Game. Ognuno parte con il suo sacchetto di 10 biglie di vetro (o 20).',
      'A ogni mano uno NASCONDE in pugno un numero di biglie a scelta: da 1 a tutte quelle che ha. L\'altro non le vede.',
      'L\'altro SCOMMETTE: sceglie quante delle sue biglie mettere in gioco (da 1 a tutte le sue) e dice "pari" o "dispari".',
      'Si apre la mano. Se ha indovinato la parità prende dall\'avversario tante biglie quante ne ha scommesse (ma al massimo quelle che l\'avversario ha). Se ha sbagliato le dà lui all\'avversario.',
      'Poi i ruoli si scambiano: chi ha nascosto scommette, e viceversa.',
      'Vince chi prende tutte le biglie dell\'altro. Con l\'opzione "Dopo 10 mani" (o 20) la partita finisce prima, e vince chi ha più biglie (pari = pareggio).',
      'Attenzione: chi ha una biglia sola può nasconderne solo una, cioè per forza un numero dispari!',
      'Il computer facile nasconde e scommette a caso; il medio evita gli schemi ovvi (mai tre volte di fila la stessa parità) e scommette in proporzione al vantaggio; il difficile studia le tue abitudini (quanto spesso nascondi pari o dispari, se ripeti o alterni) e gestisce il rischio: punta tutto quando può chiudere o deve rimontare, poco quando è avanti, e non è prevedibile.',
    ],
  },
  crea: (o) => new Biglie(o),
  bot,
  _test: { Biglie, stimaPari, conParita, tabella },
};
