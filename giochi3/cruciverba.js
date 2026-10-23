// CRUCIVERBA GENERATI: ogni partita ha uno schema nuovo, costruito incrociando parole del dizionario delle
// definizioni (cruciverba-dati.js, scritte a mano). Il generatore parte da una parola lunga al centro e aggiunge
// una parola alla volta dove incrocia più lettere già scritte, rispettando le regole dei cruciverba: due parole
// parallele non si toccano, prima e dopo ogni parola c'è una casella nera (o il bordo). Prova tante volte e tiene
// lo schema più pieno e intrecciato, poi lo ritaglia e numera le definizioni.
// Da soli si gioca per il tempo; in sfida (2-8) tutti hanno lo stesso schema e vince chi lo completa prima.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('../giochi2/rompicapo-sfida');
const TESTO = require('./cruciverba-dati');

const GRANDEZZE = { piccolo: 9, medio: 11, grande: 13 };
const LIVELLI = ['facile', 'medio', 'difficile'];
// quante lettere si vedono già all'inizio
const SCOPERTE = { facile: 0.25, medio: 0.1, difficile: 0 };
const AIUTO_MS = 20000, CONTROLLA_MS = 5000;
const RECORD = {};

// parola → definizioni (una parola può averne più d'una: se ne sceglie una a caso)
const DIZ = (() => {
  const m = new Map();
  for (const riga of TESTO.split('\n')) {
    const [w, d] = riga.split('|');
    if (!d) continue;
    const p = w.trim().toLowerCase();
    if (!/^[a-z]{3,13}$/.test(p)) continue;
    if (!m.has(p)) m.set(p, []);
    if (!m.get(p).includes(d.trim())) m.get(p).push(d.trim());
  }
  return m;
})();
const PAROLE = [...DIZ.keys()];

// ---------- generatore ----------
function prova(S) {
  const g = new Array(S * S).fill(null);
  const usoO = new Array(S * S).fill(false), usoV = new Array(S * S).fill(false);
  const voci = [], usate = new Set();
  const vuota = (r, c) => r < 0 || c < 0 || r >= S || c >= S || g[r * S + c] == null;
  // quante lettere incrocia la parola w messa in (r, c) nella direzione dir, o -1 se non ci sta
  function incroci(w, r, c, dir) {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'o' ? 1 : 0;
    const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
    if (r < 0 || c < 0 || er >= S || ec >= S) return -1;
    if (!vuota(r - dr, c - dc) || !vuota(er + dr, ec + dc)) return -1;
    let n = 0;
    for (let k = 0; k < w.length; k++) {
      const rr = r + dr * k, cc = c + dc * k, i = rr * S + cc;
      if (g[i] != null) {
        if (g[i] !== w[k] || (dir === 'o' ? usoO[i] : usoV[i])) return -1;
        n++;
      } else if (!vuota(rr + dc, cc + dr) || !vuota(rr - dc, cc - dr)) return -1; // niente lettere accanto
    }
    return n === w.length ? -1 : n;
  }
  function metti(w, r, c, dir) {
    const dr = dir === 'v' ? 1 : 0, dc = dir === 'o' ? 1 : 0;
    for (let k = 0; k < w.length; k++) { const i = (r + dr * k) * S + c + dc * k; g[i] = w[k]; (dir === 'o' ? usoO : usoV)[i] = true; }
    voci.push({ w, r, c, dir });
    usate.add(w);
  }
  const lista = mescola(PAROLE.filter((w) => w.length <= S));
  const prima = lista.find((w) => w.length >= S - 3 && w.length <= S) || lista[0];
  metti(prima, Math.floor(S / 2), Math.floor(Math.random() * (S - prima.length + 1)), 'o');
  for (let giro = 0; giro < 6; giro++) {
    let messe = 0;
    for (const w of lista) {
      if (usate.has(w)) continue;
      let meglio = null, mv = 0;
      for (let i = 0; i < S * S; i++) {
        if (g[i] == null) continue;
        const r0 = Math.floor(i / S), c0 = i % S;
        for (let k = 0; k < w.length; k++) {
          if (w[k] !== g[i]) continue;
          for (const dir of ['o', 'v']) {
            const r = dir === 'v' ? r0 - k : r0, c = dir === 'o' ? c0 - k : c0;
            const n = incroci(w, r, c, dir);
            const v = n + Math.random() * 0.5;
            if (n >= 1 && v > mv) { mv = v; meglio = [r, c, dir]; }
          }
        }
      }
      if (meglio) { metti(w, ...meglio); messe++; }
    }
    if (!messe) break;
  }
  const lettere = g.filter((x) => x != null).length;
  const incr = usoO.filter((x, i) => x && usoV[i]).length;
  return { S, g, voci, valore: voci.length * 2 + incr * 3 + lettere * 0.3 };
}

// lo schema finito: ritagliato, con i numeri e le definizioni
function genera(S, tentativi = 30) {
  let meglio = null;
  for (let t = 0; t < tentativi; t++) { const p = prova(S); if (!meglio || p.valore > meglio.valore) meglio = p; }
  const { g, voci } = meglio;
  let r0 = S, r1 = -1, c0 = S, c1 = -1;
  for (let i = 0; i < S * S; i++) if (g[i] != null) { const r = Math.floor(i / S), c = i % S; r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  const righe = r1 - r0 + 1, colonne = c1 - c0 + 1;
  const sol = new Array(righe * colonne).fill(null);
  for (let r = 0; r < righe; r++) for (let c = 0; c < colonne; c++) sol[r * colonne + c] = g[(r + r0) * S + c + c0];
  // numerazione: in ordine di lettura, ogni casella dove comincia una parola
  const inizi = new Map();
  for (const v of voci) { const i = (v.r - r0) * colonne + v.c - c0; inizi.set(i, true); v.i = i; }
  const numeri = new Array(righe * colonne).fill(0);
  let n = 0;
  for (let i = 0; i < sol.length; i++) if (inizi.has(i)) numeri[i] = ++n;
  const definizioni = voci.map((v) => {
    const passo = v.dir === 'o' ? 1 : colonne;
    return { n: numeri[v.i], dir: v.dir, w: v.w, def: caso(DIZ.get(v.w)), celle: Array.from({ length: v.w.length }, (_, k) => v.i + k * passo) };
  }).sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'o' ? -1 : 1));
  return { righe, colonne, sol, numeri, definizioni };
}

class Cruciverba extends SfidaRompicapo {
  constructor(o) {
    super('cruciverba', o, 30 * 60000);
    const op = o.opzioni || {};
    this.grandezza = GRANDEZZE[op.grandezza] ? op.grandezza : 'medio';
    this.livello = LIVELLI.includes(op.difficolta) ? op.difficolta : 'medio';
    const sc = genera(GRANDEZZE[this.grandezza]);
    Object.assign(this, sc);
    const lett = sc.sol.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    this.nLettere = lett.length;
    const quante = Math.round(lett.length * SCOPERTE[this.livello]);
    this.fisse = new Set(mescola(lett.slice()).slice(0, quante));
    const iniziali = sc.sol.map((x, i) => (this.fisse.has(i) ? x : ''));
    this.tavole = Array.from({ length: this.n }, () => ({ lettere: iniziali.slice(), errate: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, controlli: 0, penale: 0 }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  giuste(t) { let k = 0; for (let i = 0; i < this.sol.length; i++) if (this.sol[i] && t.lettere[i] === this.sol[i]) k++; return k; }
  progresso(i, t) { return this.giuste(t) / this.nLettere; }
  risolta(p, t) { return this.giuste(t) === this.nLettere; }
  fraseArrivo(p, t) {
    const extra = t.aiuti ? ` (${t.aiuti} ${t.aiuti === 1 ? 'aiuto' : 'aiuti'})` : ' senza aiuti! 🏅';
    return { altri: `completa il cruciverba${extra}`, io: `Cruciverba completato${extra}` };
  }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  mossa(p, t, a) {
    if (a.tipo === 'scrivi') {
      const i = Number(a.i), l = typeof a.l === 'string' ? a.l.toLowerCase() : '';
      if (!Number.isInteger(i) || i < 0 || i >= this.sol.length || !this.sol[i]) return { errore: 'Casella non valida' };
      if (!/^[a-z]?$/.test(l)) return { errore: 'Solo lettere' };
      if (this.fisse.has(i)) return { errore: 'Questa lettera è già data' };
      t.lettere[i] = l; t.mosse++;
      t.errate = t.errate.filter((j) => j !== i);
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      // la lettera della casella scelta (o di una casella vuota o sbagliata a caso)
      let i = Number(a.i);
      const sbagliate = this.sol.map((x, k) => (x && t.lettere[k] !== x ? k : -1)).filter((k) => k >= 0);
      if (!sbagliate.length) return { errore: 'È tutto giusto!' };
      if (!sbagliate.includes(i)) i = caso(sbagliate);
      t.lettere[i] = this.sol[i]; t.mosse++;
      t.errate = t.errate.filter((j) => j !== i);
      t.aiuti++; t.penale += AIUTO_MS;
      this.annuncia(p, 'chiede una lettera (+20 s)', `ecco la lettera "${this.sol[i].toUpperCase()}" (+20 s)`);
      return { ok: true, i };
    }
    if (a.tipo === 'controlla') {
      // segna in rosso le lettere scritte sbagliate
      const err = this.sol.map((x, k) => (x && t.lettere[k] && t.lettere[k] !== x ? k : -1)).filter((k) => k >= 0);
      t.errate = err; t.controlli++; t.penale += CONTROLLA_MS;
      this.annuncia(p, 'controlla le lettere (+5 s)', err.length ? `${err.length} ${err.length === 1 ? 'lettera sbagliata' : 'lettere sbagliate'} in rosso (+5 s)` : 'Nessuna lettera sbagliata! (+5 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // !win + parola segreta: le parole giuste delle prime definizioni non ancora risolte
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const da = this.definizioni.filter((d) => d.celle.some((k) => t.lettere[k] !== this.sol[k]));
    if (!da.length) return null;
    return `💡 ${da.slice(0, 2).map((d) => `${d.n} ${d.dir === 'o' ? 'orizzontale' : 'verticale'}: ${d.w.toUpperCase()}`).join(' · ')}`;
  }

  // ---- computer: riempie una parola alla volta, con il suo ritmo; il facile ogni tanto sbaglia una lettera e poi
  // la corregge quando la parola che la incrocia non torna ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const sec = 2.1 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale: this.nLettere * sec * 1000, passi: this.nLettere, voce: null });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 3 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], m = this.pianoBot(p, livello);
    const sbagliate = this.sol.map((x, k) => (x && t.lettere[k] && t.lettere[k] !== x ? k : -1)).filter((k) => k >= 0);
    if (sbagliate.length && Math.random() < 0.4) return { tipo: 'scrivi', i: sbagliate[0], l: this.sol[sbagliate[0]] };
    const manca = (d) => d.celle.some((k) => !t.lettere[k]);
    if (!m.voce || !manca(m.voce)) {
      const da = this.definizioni.filter(manca);
      if (!da.length) return sbagliate.length ? { tipo: 'scrivi', i: sbagliate[0], l: this.sol[sbagliate[0]] } : { tipo: 'pensa' };
      // le parole già in parte scritte vengono prima (come una persona che sfrutta gli incroci)
      da.sort((a, b) => b.celle.filter((k) => t.lettere[k]).length / b.celle.length - a.celle.filter((k) => t.lettere[k]).length / a.celle.length + (Math.random() - 0.5) * 0.3);
      m.voce = da[0];
    }
    const i = m.voce.celle.find((k) => !t.lettere[k]);
    const svista = { facile: 0.08, medio: 0.03, difficile: 0 }[livello] || 0;
    const l = Math.random() < svista ? 'aeiou'[Math.floor(Math.random() * 5)] : this.sol[i];
    return { tipo: 'scrivi', i, l };
  }

  risultatoSolo(t) {
    const k = `${this.grandezza}:${this.livello}`;
    const lista = (RECORD[k] = RECORD[k] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.aiuti ? `Completato con ${t.aiuti} ${t.aiuti === 1 ? 'aiuto' : 'aiuti'}` : 'Completato senza aiuti! 🏅';
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const svela = this.finita || t.fatto != null;
    return {
      ...this.vistaComune(p),
      grandezza: this.grandezza, livello: this.livello, righe: this.righe, colonne: this.colonne,
      nere: this.sol.map((x) => !x), numeri: this.numeri, fisse: [...this.fisse],
      definizioni: this.definizioni.map((d) => ({ n: d.n, dir: d.dir, def: d.def, celle: d.celle, ...(svela ? { w: d.w } : {}) })),
      lettere: t.lettere, errate: t.errate, aiuti: t.aiuti, penale: t.penale, nLettere: this.nLettere, giuste: t.fatto != null ? this.nLettere : null,
      soluzione: svela ? this.sol : null,
      record: this.sfida ? [] : RECORD[`${this.grandezza}:${this.livello}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'cruciverba',
    nome: 'Cruciverba',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Uno schema sempre nuovo, generato incrociando centinaia di parole con le loro definizioni. Da soli o in sfida a chi lo completa prima.',
    alias: ['cruciverba', 'parole crociate', 'crociate', 'cruciverba generati', 'definizioni', 'orizzontali e verticali', 'settimana enigmistica'],
    opzioni: [
      { id: 'grandezza', nome: 'Grandezza', valori: Object.keys(GRANDEZZE), etichette: ['Piccolo (9×9)', 'Medio (11×11)', 'Grande (13×13)'], predefinito: 'medio' },
      { id: 'difficolta', nome: 'Difficoltà', valori: LIVELLI, etichette: ['Facile (un quarto delle lettere già scritte)', 'Media (qualche lettera già scritta)', 'Difficile (schema vuoto)'], predefinito: 'medio' },
    ],
    regole: [
      'Ogni partita ha uno schema nuovo: il computer incrocia parole prese da un elenco di centinaia di definizioni (animali, cibi, città, mestieri, contrari…). Le parole sono senza accenti.',
      'Scrivi nelle caselle bianche la parola che risponde a ogni definizione: ORIZZONTALI da sinistra a destra, VERTICALI dall\'alto in basso. Il numero nella casella dice dove comincia la parola.',
      'Clicca o tocca una casella per sceglierla (toccala di nuovo per passare da orizzontale a verticale), oppure tocca una definizione. Scrivi con la tastiera (o con le lettere sullo schermo): si va avanti da soli. Cancella per tornare indietro, frecce per muoversi.',
      'Aiuti: 🔎 Controlla segna in rosso le lettere sbagliate (+5 secondi); 💡 Lettera scrive la lettera giusta nella casella scelta (+20 secondi).',
      'Si vince scrivendo tutte le lettere giuste. Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno lo stesso schema: vince chi lo completa per primo. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer scrive una parola alla volta: il difficile è veloce e non sbaglia, il medio è più lento, il facile è lento e ogni tanto sbaglia una lettera (poi se ne accorge).',
    ],
  },
  crea: (o) => new Cruciverba(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { genera, DIZ, PAROLE, GRANDEZZE },
};
