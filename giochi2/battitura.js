// GARA DI BATTITURA: tutti scrivono lo stesso testo vero (proverbi, versi e righe famose di autori classici, frasi
// celebri) più veloci che possono; si va avanti solo scrivendo giusto (un errore va cancellato prima di proseguire).
// Ognuno ha la sua corsia: la penna avanza con le lettere scritte. Si misura la velocità in parole al minuto (una
// "parola" = 5 battute, come nelle gare vere) e la precisione. Punti per l'ordine d'arrivo.
// Il browser controlla ogni tasto e manda al server quante lettere giuste ha scritto (e gli errori); il server non
// accetta velocità impossibili. I computer scrivono a una velocità che dipende dal livello, con qualche errore.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');
const RIGHE = require('./battitura-dati').trim().split('\n').map((r) => { const [fonte, testo] = r.split('|'); return { fonte, testo }; });

const LUNGHEZZE = { media: [120, 200], corta: [55, 110], lunga: [230, 330] };
const MAX_CPS = 22; // battute al secondo oltre le quali non ci si crede (più di 260 parole al minuto)
const DOPO_PRIMO = 25; // secondi dopo il primo arrivato: poi il round si chiude
const LIV = {
  facile: { wpm: [22, 32], sbaglia: 0.06 },
  medio: { wpm: [42, 55], sbaglia: 0.035 },
  difficile: { wpm: [80, 95], sbaglia: 0.015 },
};
// due lettere uguali per la gara: maiuscole diverse no, accenti sì (chi non ha la è sulla tastiera scrive e)
const base = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
const uguali = (a, b) => a === b || base(a) === base(b);

function mescola(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// il testo di un round: una riga, e se è corta altre righe dello stesso tipo, fino alla lunghezza voluta
function testo(lung, usate) {
  const [min, max] = LUNGHEZZE[lung] || LUNGHEZZE.media;
  const libere = mescola(RIGHE.map((_, i) => i).filter((i) => !usate.has(i)));
  for (const i of libere) {
    if (RIGHE[i].testo.length > max) continue;
    const pezzi = [i];
    let tot = RIGHE[i].testo.length;
    const proverbio = /^(Proverbio|Scioglilingua|Filastrocca)/.test(RIGHE[i].fonte);
    for (const j of libere) {
      if (tot >= min) break;
      if (pezzi.includes(j) || (/^(Proverbio|Scioglilingua|Filastrocca)/.test(RIGHE[j].fonte) !== proverbio)) continue;
      if (tot + 1 + RIGHE[j].testo.length > max) continue;
      pezzi.push(j); tot += 1 + RIGHE[j].testo.length;
    }
    if (tot < min) continue;
    for (const j of pezzi) usate.add(j);
    return { testo: pezzi.map((j) => RIGHE[j].testo).join(' '), fonti: [...new Set(pezzi.map((j) => RIGHE[j].fonte))] };
  }
  usate.clear();
  return testo(lung, usate);
}
const ppm = (lettere, sec) => (sec > 0.5 ? Math.round((lettere / 5) / (sec / 60)) : 0);

class Battitura extends Arena {
  constructor(o) {
    super(o, { id: 'battitura', round: 3, tickMs: 33 });
    const op = o.opzioni || {};
    this.nRound = [3, 1, 5].includes(Number(op.round)) ? Number(op.round) : 3;
    this.lung = LUNGHEZZE[op.lunghezza] ? op.lunghezza : 'media';
    this.W = 1000; this.H = 70 + 46 * this.n;
    this.usate = new Set();
    this.velocita = Array.from({ length: this.n }, () => []); // le parole al minuto di ogni round
    this.precisione = Array.from({ length: this.n }, () => []);
    this.etichettaPunti = 'punti';
    this.avvia();
  }

  iniziaRound() {
    const t = testo(this.lung, this.usate);
    this.testo = t.testo; this.fonti = t.fonti; this.nT = this.testo.length;
    this.g = Array.from({ length: this.n }, () => ({ k: 0, errori: 0, arrivo: null, pos: null }));
    this.arrivati = 0; this.primoArrivo = null;
    // i computer: una velocità per il round, poi a ogni lettera un po' di variazione (e ogni tanto un errore)
    this.mente = Array.from({ length: this.n }, (_, p) => {
      const L = LIV[this.bot[p]]; if (!L) return null;
      return { cps: ((L.wpm[0] + Math.random() * (L.wpm[1] - L.wpm[0])) * 5) / 60, acc: 0, ferma: 0 };
    });
    this.cambiato = true;
  }
  spostaTempi() {}

  // dal browser: { k: lettere giuste, e: errori }
  input(p, d) {
    if (!d || this.finita || this.bot[p] || this.fase !== 'gioco' || !this.g) return;
    const g = this.g[p];
    if (g.arrivo !== null) return;
    if (Number.isInteger(d.k)) {
      const lecito = Math.floor(MAX_CPS * this.tempoRound) + 3;
      g.k = Math.max(g.k, Math.min(d.k, this.nT, lecito));
    }
    if (Number.isInteger(d.e) && d.e >= g.errori && d.e < 10000) g.errori = d.e;
    if (g.k >= this.nT) this.arriva(p);
  }
  arriva(p) {
    const g = this.g[p];
    g.arrivo = this.tempoRound; g.pos = ++this.arrivati;
    if (this.primoArrivo === null) this.primoArrivo = this.tempoRound;
    const v = ppm(this.nT, g.arrivo);
    const testoPos = g.pos === 1 ? 'primo' : g.pos === 2 ? 'secondo' : g.pos === 3 ? 'terzo' : `${g.pos}°`;
    this.annuncia(p, `arriva ${testoPos}: ${v} parole al minuto${g.pos === 1 ? ' 🏆' : ''}`, `arrivato ${testoPos}! ${v} parole al minuto${g.pos === 1 ? ' 🏆' : ''}`, g.pos === 1);
    this.cambiato = true;
  }

  passo(dt) {
    for (let p = 0; p < this.n; p++) {
      const m = this.mente[p], g = this.g[p];
      if (!m || g.arrivo !== null) continue;
      if (m.ferma > 0) { m.ferma -= dt; continue; }
      m.acc += m.cps * dt * (0.75 + Math.random() * 0.5);
      while (m.acc >= 1 && g.k < this.nT) {
        m.acc -= 1;
        // un errore: si ferma un attimo per cancellare
        if (Math.random() < LIV[this.bot[p]].sbaglia) { g.errori++; m.ferma = 0.35 + Math.random() * 0.4; m.acc = 0; break; }
        g.k++;
        // dopo un segno di punteggiatura si rallenta un po'
        if (/[.,;:!?]/.test(this.testo[g.k - 1])) m.acc -= 0.6;
      }
      if (g.k >= this.nT) this.arriva(p);
    }
    const tutti = this.g.every((g) => g.arrivo !== null);
    const tardi = this.primoArrivo !== null && this.tempoRound - this.primoArrivo > DOPO_PRIMO;
    return tutti || tardi || this.tempoRound > 300;
  }
  fineRound() {
    // punti: il primo n, il secondo n − 1, …; chi non arriva 0 (con il trucco !win banana i punti del testo valgono doppio)
    this.g.forEach((g, p) => {
      const doppi = T.consuma(this, p) ? 2 : 1;
      if (g.pos !== null) this.punti[p] += (this.n - g.pos + 1) * doppi;
      const sec = g.arrivo !== null ? g.arrivo : this.tempoRound;
      this.velocita[p].push(ppm(g.k, sec));
      this.precisione[p].push(g.k + g.errori ? Math.round((100 * g.k) / (g.k + g.errori)) : 100);
    });
  }
  pensa() { return {}; }

  vistaExtra() {
    return { testo: this.testo, fonti: this.fonti, round: this.round, velocita: this.velocita, precisione: this.precisione };
  }
  statoTick() {
    const t = this.tempoRound;
    return {
      nT: this.nT, fr: this.round,
      g: this.g.map((g) => [g.k, g.errori, g.arrivo !== null ? Math.round(g.arrivo * 100) / 100 : -1, g.pos || 0, ppm(g.k, g.arrivo !== null ? g.arrivo : t)]),
      chiude: this.primoArrivo !== null ? Math.max(0, Math.ceil(DOPO_PRIMO - (t - this.primoArrivo))) : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'battitura',
    nome: 'Gara di battitura',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Tutti scrivono lo stesso testo vero (proverbi, Dante, Manzoni, Leopardi…) il più in fretta possibile: chi arriva prima? Con le parole al minuto.',
    alias: ['battitura', 'dattilografia', 'scrivere veloce', 'typing', 'typeracer', 'tastiera', 'parole al minuto', 'velocità di scrittura'],
    opzioni: [
      { id: 'lunghezza', nome: 'Testi', valori: ['media', 'corta', 'lunga'], etichette: ['Medi (2-3 righe)', 'Corti (una riga)', 'Lunghi (4-6 righe)'], predefinito: 'media' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 testi', '1 testo', '5 testi'], predefinito: 3 },
    ],
    regole: [
      `A ogni round compare un testo vero (ce ne sono ${RIGHE.length}: proverbi, scioglilingua, versi e righe famose di Dante, Manzoni, Leopardi, Collodi e altri classici, articoli della Costituzione, frasi celebri). Tutti scrivono lo stesso testo, insieme.`,
      'Si scrive nella casella sotto il testo (sul computer basta cominciare a scrivere). Le lettere giuste diventano verdi; se sbagli la lettera diventa rossa e devi cancellarla (⌫) prima di andare avanti. Maiuscole e punteggiatura contano; le lettere accentate si possono scrivere anche senza accento.',
      'Ognuno ha una corsia: la sua penna avanza con le lettere scritte giuste. Chi arriva prima in fondo vince il round; dopo il primo arrivato gli altri hanno ancora 25 secondi.',
      'Velocità in parole al minuto: una parola vale 5 battute (spazi compresi), come nelle gare di dattilografia. La precisione è la percentuale di tasti giusti.',
      'Punti: il primo arrivato prende tanti punti quanti sono i giocatori, il secondo uno di meno e così via; chi non arriva in tempo 0. Dopo 3 testi (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile scrive a circa 25 parole al minuto, il medio a circa 45, il difficile a circa 80 (quanto un dattilografo esperto); tutti ogni tanto sbagliano e si fermano a correggere.',
    ],
  },
  crea: (o) => new Battitura(o),
  bot: () => ({}),
  _test: { Battitura, RIGHE, testo, LUNGHEZZE, ppm, uguali, MAX_CPS },
};
