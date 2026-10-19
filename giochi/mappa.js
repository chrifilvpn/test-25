// LA MAPPA NASCOSTA (campo minato + tattica): griglia 5×5 con nemici fermi e nascosti. Parti in basso e devi arrivare
// all'uscita in alto in al massimo 6 mosse, una casella per volta (su, giù, destra, sinistra). Ogni casella dove
// metti piede mostra un numero: quanti nemici ci sono nelle 8 caselle intorno. Se entri in una casella con un nemico
// sei preso. Tutti giocano la stessa mappa insieme, ognuno vede solo quello che ha scoperto lui. Più mappe di fila.
const LATO = 5;
const MOSSE = 6;
const NEMICI = { facile: 4, normale: 6, difficile: 8 };

const xy = (c) => [c % LATO, Math.floor(c / LATO)];
const cella = (x, y) => y * LATO + x;
function intorno(c) {
  const [x, y] = xy(c), v = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && y + dy >= 0 && x + dx < LATO && y + dy < LATO) v.push(cella(x + dx, y + dy));
  return v;
}
function passi(c) {
  const [x, y] = xy(c), v = [];
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (x + dx >= 0 && y + dy >= 0 && x + dx < LATO && y + dy < LATO) v.push(cella(x + dx, y + dy));
  return v;
}
// distanza a piedi (solo caselle permesse)
function distanze(da, ok) {
  const d = new Array(LATO * LATO).fill(Infinity);
  d[da] = 0;
  const coda = [da];
  while (coda.length) { const c = coda.shift(); for (const v of passi(c)) if (ok(v) && d[v] === Infinity) { d[v] = d[c] + 1; coda.push(v); } }
  return d;
}

function nuovaMappa(nNemici) {
  for (;;) {
    const partenza = cella(Math.floor(Math.random() * LATO), LATO - 1);
    const [px] = xy(partenza);
    const colonne = [0, 1, 2, 3, 4].filter((x) => Math.abs(x - px) <= 2 && Math.abs(x - px) >= 1);
    const uscita = cella(colonne[Math.floor(Math.random() * colonne.length)], 0);
    const vietate = new Set([partenza, uscita, ...intorno(partenza)]); // attorno alla partenza niente nemici: si parte tranquilli
    const posti = Array.from({ length: LATO * LATO }, (_, i) => i).filter((c) => !vietate.has(c));
    for (let i = posti.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [posti[i], posti[j]] = [posti[j], posti[i]]; }
    const nemici = new Set(posti.slice(0, nNemici));
    const d = distanze(partenza, (c) => !nemici.has(c));
    if (d[uscita] <= MOSSE) {
      const numeri = Array.from({ length: LATO * LATO }, (_, c) => intorno(c).filter((v) => nemici.has(v)).length);
      return { partenza, uscita, nemici, numeri, minima: d[uscita] };
    }
  }
}

class Mappa {
  constructor({ n, opzioni = {} }) {
    this.id = 'mappa';
    this.n = n;
    this.livello = NEMICI[opzioni.nemici] ? opzioni.nemici : 'normale';
    this.nMappe = [1, 3, 5].includes(Number(opzioni.mappe)) ? Number(opzioni.mappe) : 3;
    this.punti = new Array(n).fill(0);
    this.storico = []; // risultati di ogni mappa
    this.nMappa = 0;
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 3500;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nuova();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuova() {
    this.nMappa++;
    this.m = nuovaMappa(NEMICI[this.livello]);
    this.g = Array.from({ length: this.n }, () => ({ pos: this.m.partenza, strada: [this.m.partenza], visti: new Set([this.m.partenza]), stato: 'viaggio', mosse: 0, punti: 0 }));
    this.scelte = {};
    this.fase = 'gioco';
  }

  attesi() { return this.finita || this.fase !== 'gioco' ? [] : this.g.map((x, i) => (x.stato === 'viaggio' && this.scelte[i] === undefined ? i : -1)).filter((i) => i >= 0); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.fase !== 'gioco') return { errore: 'Arriva la prossima mappa…' };
    const x = this.g[p];
    if (x.stato !== 'viaggio') return { errore: 'Per questa mappa hai finito: aspetta gli altri' };
    if (!a || a.tipo !== 'muovi') return { errore: 'Scegli la casella dove andare' };
    const c = Number(a.cella);
    if (!passi(x.pos).includes(c)) return { errore: 'Ti muovi di una casella: su, giù, destra o sinistra' };
    this.scelte[p] = c;
    if (!this.attesi().length) this.risolvi();
    return { ok: true };
  }

  salta(p) {
    // chi è assente: il gioco lo fa andare avanti con prudenza
    if (this.attesi().includes(p)) return this.azione(p, bot(this, p, 'medio'));
    return { ok: true };
  }

  risolvi() {
    for (const [ps, c] of Object.entries(this.scelte)) {
      const p = Number(ps), x = this.g[p];
      x.pos = c; x.mosse++; x.strada.push(c); x.visti.add(c);
      if (this.m.nemici.has(c)) {
        x.stato = 'preso'; x.punti = 0;
        this.annuncia(p, 'è finito addosso a un nemico! 👾', 'sei finito addosso a un nemico! 👾', true);
      } else if (c === this.m.uscita) {
        x.stato = 'uscito'; x.punti = 10 + (MOSSE - x.mosse) * 2;
        this.annuncia(p, `è uscito! +${x.punti}`, `sei uscito! +${x.punti} 🚪`, true);
      } else if (x.mosse >= MOSSE) {
        const d = distanze(c, () => true)[this.m.uscita];
        x.stato = 'fermo'; x.punti = Math.max(0, 4 - d);
        this.annuncia(p, 'ha finito le mosse', `mosse finite: +${x.punti}`);
      }
    }
    this.scelte = {};
    if (this.g.every((x) => x.stato !== 'viaggio')) this.fineMappa();
  }

  fineMappa() {
    this.g.forEach((x, i) => { this.punti[i] += x.punti; });
    this.storico.push(this.g.map((x) => ({ stato: x.stato, punti: x.punti, mosse: x.mosse })));
    if (this.nMappa >= this.nMappe) return this.chiudi();
    this.fase = 'riassunto';
    this.inAttesa = true;
  }

  avanza() { if (!this.inAttesa) return; this.inAttesa = false; this.nuova(); }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    this.inAttesa = false;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1 && this.n > 1, vincitori: this.n === 1 ? [0] : v.length > 1 ? [] : v };
    if (this.n === 1) this.risultato.titolo = `Hai fatto ${this.punti[0]} punti`;
  }

  // trucco segreto (!win): la strada più corta senza nemici da dove sei all'uscita, a frecce
  suggerimentoWin(p) {
    const x = this.g[p];
    if (this.finita || this.fase !== 'gioco' || !x || x.stato !== 'viaggio' || this.scelte[p] !== undefined) return null;
    const d = distanze(this.m.uscita, (c) => !this.m.nemici.has(c));
    if (d[x.pos] === Infinity) return null;
    const frecce = [];
    for (let c = x.pos; c !== this.m.uscita;) {
      const v = passi(c).find((k) => d[k] === d[c] - 1);
      const [cx, cy] = xy(c), [vx, vy] = xy(v);
      frecce.push(vy < cy ? '⬆️' : vy > cy ? '⬇️' : vx < cx ? '⬅️' : '➡️');
      c = v;
    }
    return `💡 Strada sicura: ${frecce.join(' ')}`;
  }

  vista(p) {
    const x = this.g[p];
    const tutto = this.fase !== 'gioco' || this.finita; // la mappa si scopre quando hanno finito tutti (niente suggerimenti in chat)
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: this.inAttesa, fase: this.fase, pausaMs: this.pausaMs,
      lato: LATO, maxMosse: MOSSE, nMappa: this.nMappa, nMappe: this.nMappe, livello: this.livello, nNemici: NEMICI[this.livello],
      partenza: this.m.partenza, uscita: this.m.uscita, pos: x.pos, strada: x.strada, stato: x.stato, mosse: x.mosse,
      numeri: this.m.numeri.map((k, c) => (x.visti.has(c) || tutto ? k : null)),
      nemici: tutto ? [...this.m.nemici] : null, minima: tutto ? this.m.minima : null,
      // degli altri si vede solo com'è andata, e le loro strade a mappa finita
      altri: this.g.map((y, i) => ({ stato: y.stato, mosse: y.mosse, punti: y.punti, pronto: this.scelte[i] !== undefined, strada: this.fase !== 'gioco' || this.finita ? y.strada : null })),
      possibili: x.stato === 'viaggio' && this.scelte[p] === undefined && this.fase === 'gioco' ? passi(x.pos) : [], scelto: this.scelte[p] ?? null,
      punti: this.punti, storico: this.storico,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Probabilità che ogni casella nascosta abbia un nemico, usando solo i numeri che il giocatore ha visto.
// Si contano tutte le disposizioni dei nemici attorno alle caselle scoperte compatibili con i numeri.
function probabilita(g, p) {
  const x = g.g[p], m = g.m, tot = LATO * LATO, nN = NEMICI[g.livello];
  const noti = [...x.visti];
  const sicure = new Set(noti);
  const fronte = [...new Set(noti.flatMap(intorno))].filter((c) => !sicure.has(c));
  const altre = Array.from({ length: tot }, (_, i) => i).filter((c) => !sicure.has(c) && !fronte.includes(c));
  const pesi = new Array(tot).fill(0);
  let somma = 0;
  const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  const F = fronte.length;
  for (let mask = 0; mask < 1 << F; mask++) {
    let k = 0;
    const on = new Set();
    for (let i = 0; i < F; i++) if (mask & (1 << i)) { on.add(fronte[i]); k++; }
    if (k > nN) continue;
    if (!noti.every((c) => intorno(c).filter((v) => on.has(v)).length === m.numeri[c])) continue;
    const w = binom(altre.length, nN - k);
    if (!w) continue;
    somma += w;
    for (const c of on) pesi[c] += w;
    for (const c of altre) pesi[c] += (w * (nN - k)) / altre.length;
  }
  return pesi.map((w, c) => (sicure.has(c) ? 0 : somma ? w / somma : nN / tot));
}
function bot(g, p, livello) {
  const x = g.g[p], m = g.m;
  const scelte = passi(x.pos);
  const restano = MOSSE - x.mosse;
  const dUscita = distanze(m.uscita, () => true);
  const caso = scelte[Math.floor(Math.random() * scelte.length)];
  let rischio;
  if (livello === 'facile') {
    // guarda solo il numero della casella dove è: se è 0 i vicini sono sicuri, altrimenti rischia a caso
    if (Math.random() < 0.25) return { tipo: 'muovi', cella: caso };
    rischio = (c) => (x.visti.has(c) ? 0 : m.numeri[x.pos] === 0 ? 0 : 0.3);
  } else if (livello === 'medio') {
    // regole semplici: vicino a uno 0 è sicuro; vicino a numeri alti è pericoloso
    rischio = (c) => {
      if (x.visti.has(c)) return 0;
      const vicini = intorno(c).filter((v) => x.visti.has(v));
      if (vicini.some((v) => m.numeri[v] === 0)) return 0;
      return vicini.reduce((t, v) => t + m.numeri[v], 0) / (vicini.length * 4 || 1) + 0.1;
    };
  } else {
    const pr = probabilita(g, p);
    rischio = (c) => pr[c];
  }
  // tra le caselle, prima quelle da cui si arriva ancora in tempo all'uscita, poi la meno rischiosa, poi la più vicina
  const valuta = (c) => {
    const arriva = dUscita[c] <= restano - 1 ? 0 : 1;
    return arriva * 10 + rischio(c) * 5 + dUscita[c] * 0.3 + (x.strada.includes(c) ? 0.2 : 0) + Math.random() * 0.05;
  };
  return { tipo: 'muovi', cella: [...scelte].sort((a, b) => valuta(a) - valuta(b))[0] };
}

module.exports = {
  meta: {
    id: 'mappa',
    nome: 'La mappa nascosta',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Come il campo minato, ma ti muovi: 6 mosse per arrivare all\'uscita evitando i nemici nascosti.',
    alias: ['campo minato', 'into the breach', 'nemici'],
    opzioni: [
      { id: 'nemici', nome: 'Nemici', valori: ['normale', 'facile', 'difficile'], etichette: ['6 nemici', '4 nemici', '8 nemici'], predefinito: 'normale' },
      { id: 'mappe', nome: 'Mappe', valori: [3, 1, 5], etichette: ['3 mappe', '1 mappa', '5 mappe'], predefinito: 3 },
    ],
    regole: [
      'La mappa è una griglia 5×5 con dei nemici nascosti (6, oppure 4 o 8) che stanno fermi. Parti da una casella della riga in basso (🧭) e devi arrivare all\'uscita (🚪) nella riga in alto.',
      'A ogni turno ti sposti di una casella: su, giù, destra o sinistra (non in diagonale). Hai al massimo 6 mosse. C\'è sempre almeno una strada sicura che arriva in tempo.',
      'Ogni casella dove metti piede mostra un numero, come nel campo minato: quanti nemici ci sono nelle 8 caselle intorno (anche in diagonale). La casella di partenza è già scoperta e attorno a lei non ci sono nemici.',
      'Se entri in una casella con un nemico sei preso: 0 punti per quella mappa. Se arrivi all\'uscita prendi 10 punti più 2 per ogni mossa avanzata. Se finisci le mosse prima di uscire prendi 3 punti se eri a un passo dall\'uscita, 2 se eri a due passi, 1 se eri a tre.',
      'Si gioca tutti sulla stessa mappa e nello stesso momento: ognuno sceglie la sua mossa, e quando hanno scelto tutti ci si muove insieme. Ognuno vede solo i numeri che ha scoperto lui. Quando hanno finito tutti si vedono i nemici e le strade di ognuno.',
      'Dopo 3 mappe (o 1, o 5) vince chi ha più punti. Si può giocare anche da soli.',
      'Il computer facile guarda solo il numero sotto i piedi, il medio usa le regole semplici (vicino a uno 0 è tutto sicuro), il difficile calcola la probabilità esatta di trovare un nemico in ogni casella.',
    ],
  },
  crea: (o) => new Mappa(o),
  bot,
  _test: { intorno, passi, nuovaMappa, probabilita },
};
