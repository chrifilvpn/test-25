// SPINGI LE CASSE (il gioco conosciuto come Sokoban): il magazziniere spinge le casse sulle caselle segnate. Si spinge
// una cassa alla volta (mai tirare, mai due casse in fila). I livelli (sokoban-dati.js) sono stati creati al computer
// "tirando indietro" le casse dalle loro mete e poi controllati uno per uno con il risolutore qui sotto, che trova il
// numero minimo di spinte: ognuno ha una soluzione. Da soli si fanno i livelli in ordine; in sfida (2-8) tutti hanno lo
// stesso livello e vince chi finisce prima. Il computer segue la soluzione (il facile ogni tanto fa un passo di troppo).
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso } = require('./rompicapo-sfida');

const DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const NOMI_DIR = ['u', 'd', 'l', 'r'];
const AIUTO_MS = 20000;
const RECORD = {};

// ---------------- livelli: testo XSB ('#' muro, ' ' pavimento, '.' meta, '$' cassa, '*' cassa sulla meta,
// '@' magazziniere, '+' magazziniere sulla meta) ----------------
function leggi(testo) {
  const righe = testo.replace(/\r/g, '').split('\n').filter((r) => r.length);
  const H = righe.length, W = Math.max(...righe.map((r) => r.length));
  const muro = new Uint8Array(W * H), meta = new Uint8Array(W * H), casse = [];
  let io = -1;
  righe.forEach((r, y) => {
    for (let x = 0; x < W; x++) {
      const ch = r[x] || ' ', i = y * W + x;
      if (ch === '#') muro[i] = 1;
      if (ch === '.' || ch === '*' || ch === '+') meta[i] = 1;
      if (ch === '$' || ch === '*') casse.push(i);
      if (ch === '@' || ch === '+') io = i;
    }
  });
  // il fuori (spazi oltre i muri) diventa muro: si riempie da dentro a partire dal magazziniere
  const dentro = new Uint8Array(W * H), coda = [io]; dentro[io] = 1;
  while (coda.length) {
    const i = coda.pop(), x = i % W, y = (i - x) / W;
    for (const [dx, dy] of Object.values(DIR)) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (!muro[j] && !dentro[j]) { dentro[j] = 1; coda.push(j); }
    }
  }
  for (let i = 0; i < W * H; i++) if (!dentro[i]) muro[i] = 1;
  return { W, H, muro, meta, casse: casse.sort((a, b) => a - b), io };
}

// caselle "morte": una cassa lì non arriverà mai a una meta (si calcola tirando le casse indietro dalle mete)
function morte(L) {
  const { W, H, muro, meta } = L, viva = new Uint8Array(W * H), coda = [];
  for (let i = 0; i < W * H; i++) if (meta[i]) { viva[i] = 1; coda.push(i); }
  while (coda.length) {
    const i = coda.pop();
    for (const [dx, dy] of Object.values(DIR)) {
      const j = i - dx - dy * W, k = j - dx - dy * W; // la cassa va da i a j tirata da chi sta in k
      if (j < 0 || k < 0 || j >= W * H || k >= W * H || muro[j] || muro[k] || viva[j]) continue;
      viva[j] = 1; coda.push(j);
    }
  }
  return viva.map((v, i) => (!v && !muro[i] ? 1 : 0));
}

// il RISOLUTORE: ricerca in ampiezza sulle spinte (minimo numero di spinte). Lo stato è dato dalle casse e dalla zona
// dove il magazziniere può camminare (rappresentata dalla casella più piccola che raggiunge). Si scartano le spinte su
// caselle morte e i blocchi 2×2 di casse e muri. Restituisce { spinte, mosse: 'udlr…' (minuscole = passi, maiuscole =
// spinte), nodi } oppure null (o { troppo: true } se supera il limite di stati).
function risolvi(L, casseIn = L.casse, ioIn = L.io, limite = 400000) {
  const { W, H, muro, meta } = L, N = W * H, morta = L.morta || (L.morta = morte(L));
  const passi = [-W, W, -1, 1];
  // due segnalini: "giro" = dove arriva il magazziniere nello stato che si sta espandendo; "prova" = per la chiave
  const occ = new Uint8Array(N), giro = new Int32Array(N), prova = new Int32Array(N), coda = new Int32Array(N);
  let gGiro = 0, gProva = 0;
  // flood fill dal magazziniere con le casse segnate in occ; restituisce la casella più piccola raggiunta
  const riempi = (io, vis, g) => {
    let min = io, testa = 0, fine = 0; coda[fine++] = io; vis[io] = g;
    while (testa < fine) {
      const i = coda[testa++]; if (i < min) min = i;
      for (let d = 0; d < 4; d++) { const j = i + passi[d]; if (!muro[j] && !occ[j] && vis[j] !== g) { vis[j] = g; coda[fine++] = j; } }
    }
    return min;
  };
  const bloccata = (c) => {
    // blocco 2×2: la cassa appena spinta forma con muri e casse un quadrato pieno, con almeno una cassa fuori meta
    for (const a of [c, c - 1, c - W, c - W - 1]) {
      const q = [a, a + 1, a + W, a + W + 1];
      if (q.every((i) => muro[i] || occ[i]) && q.some((i) => occ[i] && !meta[i])) return true;
    }
    return false;
  };
  const finita = (casse) => casse.every((c) => meta[c]);
  const start = casseIn.slice().sort((a, b) => a - b);
  for (const c of start) occ[c] = 1;
  const k0 = `${start.join(',')}|${riempi(ioIn, prova, ++gProva)}`;
  for (const c of start) occ[c] = 0;
  const padre = new Map([[k0, null]]);
  if (finita(start)) return { spinte: 0, mosse: '', nodi: 1 };
  let livello = [{ casse: start, io: ioIn, k: k0 }];
  let nodi = 0;
  while (livello.length) {
    const prossimo = [];
    for (const st of livello) {
      for (const c of st.casse) occ[c] = 1;
      const g = ++gGiro;
      riempi(st.io, giro, g);
      for (let b = 0; b < st.casse.length; b++) {
        const c = st.casse[b];
        for (let d = 0; d < 4; d++) {
          const s = passi[d], dietro = c - s, avanti = c + s;
          if (giro[dietro] !== g || muro[avanti] || occ[avanti] || morta[avanti]) continue;
          occ[c] = 0; occ[avanti] = 1;
          let k = null;
          if (!bloccata(avanti)) {
            const nuove = st.casse.slice(); nuove[b] = avanti; nuove.sort((x, y) => x - y);
            k = `${nuove.join(',')}|${riempi(c, prova, ++gProva)}`;
            if (!padre.has(k)) {
              padre.set(k, { da: st.k, io: st.io, c, d }); // poco in memoria: le casse di prima stanno nella chiave "da"
              if (++nodi > limite) { occ.fill(0); return { troppo: true, nodi }; }
              if (finita(nuove)) { occ.fill(0); return ricostruisci(L, padre, k, nodi); }
              prossimo.push({ casse: nuove, io: c, k });
            }
          }
          occ[avanti] = 0; occ[c] = 1;
        }
      }
      for (const c of st.casse) occ[c] = 0;
    }
    livello = prossimo;
  }
  return null;
}
// dalle spinte alla sequenza completa di passi: tra una spinta e l'altra il percorso più corto del magazziniere
function ricostruisci(L, padre, k, nodi) {
  const spinte = [];
  for (let x = padre.get(k); x; x = padre.get(x.da)) spinte.push(x);
  spinte.reverse();
  const { W, muro } = L, passi = [-W, W, -1, 1];
  let mosse = '';
  for (const s of spinte) {
    const occ = new Set(s.da.split('|')[0].split(',').map(Number)), dest = s.c - passi[s.d];
    // percorso dal magazziniere (s.io) alla casella dietro la cassa
    const prec = new Map([[s.io, -1]]), coda = [s.io];
    for (let q = 0; q < coda.length && !prec.has(dest); q++) {
      const i = coda[q];
      for (let d = 0; d < 4; d++) { const j = i + passi[d]; if (!muro[j] && !occ.has(j) && !prec.has(j)) { prec.set(j, [i, d]); coda.push(j); } }
    }
    const tratto = [];
    for (let i = dest; i !== s.io; i = prec.get(i)[0]) tratto.push(NOMI_DIR[prec.get(i)[1]]);
    mosse += tratto.reverse().join('') + NOMI_DIR[s.d].toUpperCase();
  }
  return { spinte: spinte.length, mosse, nodi };
}

// ---------------- partita ----------------
let DATI = null;
const dati = () => DATI || (DATI = require('./sokoban-dati'));

class Casse extends SfidaRompicapo {
  constructor(o) {
    super('sokoban', o, 30 * 60000);
    const op = o.opzioni || {};
    const lista = dati();
    this.gruppo = ['facile', 'medio', 'difficile', 'esperto', 'tutti'].includes(op.livelli) ? op.livelli : 'facile';
    const scelti = lista.filter((x) => this.gruppo === 'tutti' || x.gruppo === this.gruppo);
    // da soli si parte dal livello scelto (numero) e si va avanti; in sfida un livello a caso del gruppo
    const n = Number(op.livello);
    const lv = this.sfida || !Number.isInteger(n) ? caso(scelti) : lista[Math.max(0, Math.min(lista.length - 1, n - 1))];
    this.carica(lv);
    this.avvia();
  }
  carica(lv) {
    this.lv = lv; this.numero = DATI.indexOf(lv) + 1;
    this.L = leggi(lv.mappa);
    this.L.morta = morte(this.L);
    this.tavole = Array.from({ length: this.n }, () => ({ casse: this.L.casse.slice(), io: this.L.io, indietro: [], mosse: 0, spinte: 0, seq: 0, fatto: null, aiuti: 0, penale: 0 }));
    // le "tappe" della soluzione salvata: per ogni posizione prima di una spinta (casse + zona del magazziniere),
    // dove mettersi e in che direzione spingere. Servono all'aiuto e al computer anche sui livelli grandi, dove
    // il risolutore durante la partita sarebbe troppo lento.
    this.tappe = new Map();
    const t = { casse: this.L.casse.slice(), io: this.L.io, indietro: [], mosse: 0, spinte: 0 };
    let mancano = (lv.soluzione || '').replace(/[a-z]/g, '').length;
    for (const ch of lv.soluzione || '') {
      if (ch === ch.toUpperCase()) { const k = this.chiave(t); if (!this.tappe.has(k)) this.tappe.set(k, { da: t.io, dir: ch.toLowerCase(), mancano }); mancano--; }
      this.passo(t, ch.toLowerCase());
    }
  }
  // la posizione: casse in ordine + la casella più piccola della zona dove può camminare il magazziniere
  chiave(t) {
    const { W, muro } = this.L, occ = new Set(t.casse), vis = new Set([t.io]), coda = [t.io];
    let min = t.io;
    for (let q = 0; q < coda.length; q++) {
      const i = coda[q]; if (i < min) min = i;
      for (const d of NOMI_DIR) { const j = i + DIR[d][0] + DIR[d][1] * W; if (!muro[j] && !occ.has(j) && !vis.has(j)) { vis.add(j); coda.push(j); } }
    }
    return `${t.casse.slice().sort((a, b) => a - b).join(',')}|${min}`;
  }
  // il percorso a piedi (senza spingere) da t.io a dest: lettere udlr, o null
  strada(t, dest) {
    const { W, muro } = this.L, prec = new Map([[t.io, null]]), coda = [t.io];
    for (let q = 0; q < coda.length && !prec.has(dest); q++) {
      const i = coda[q];
      for (const d of NOMI_DIR) { const j = i + DIR[d][0] + DIR[d][1] * W; if (!muro[j] && !t.casse.includes(j) && !prec.has(j)) { prec.set(j, [i, d]); coda.push(j); } }
    }
    if (!prec.has(dest)) return null;
    const out = [];
    for (let i = dest; prec.get(i); i = prec.get(i)[0]) out.push(prec.get(i)[1]);
    return out.reverse();
  }
  // la prossima spinta giusta: dalla soluzione salvata se si è sulla sua strada, altrimenti col risolutore.
  // Restituisce { passi: 'udlr…' (l'ultima lettera è la spinta), mancano } oppure { errore }
  prossimaSpinta(t, limite = 25000) {
    const tappa = this.tappe.get(this.chiave(t));
    if (tappa) {
      const a = this.strada(t, tappa.da);
      if (a) return { passi: [...a, tappa.dir], mancano: tappa.mancano };
    }
    const r = risolvi(this.L, t.casse, t.io, limite);
    if (!r) return { errore: 'Da qui non si può più risolvere: annulla qualche mossa (o ricomincia)' };
    if (r.troppo) return { errore: 'Questa posizione è troppo complicata per l\'aiuto: prova ad annullare qualche mossa (o ricomincia)' };
    const fino = r.mosse.search(/[UDLR]/);
    return { passi: r.mosse.slice(0, fino + 1).toLowerCase().split(''), mancano: r.spinte };
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) { return t.casse.filter((c) => this.L.meta[c]).length / t.casse.length; }
  risolta(p, t) { return t.casse.every((c) => this.L.meta[c]); }
  fraseArrivo(p, t) { return { altri: `porta tutte le casse a posto (${t.spinte} spinte)`, io: `Tutte le casse a posto! ${t.mosse} passi, ${t.spinte} spinte` }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  // un passo in una direzione (spingendo la cassa davanti, se si può)
  passo(t, dir) {
    const { W, muro } = this.L, [dx, dy] = DIR[dir], s = dx + dy * W;
    const avanti = t.io + s;
    if (muro[avanti]) return { errore: 'C\'è un muro' };
    const k = t.casse.indexOf(avanti);
    if (k >= 0) {
      const oltre = avanti + s;
      if (muro[oltre] || t.casse.includes(oltre)) return { errore: 'La cassa non si muove' };
      t.indietro.push({ io: t.io, cassa: k, da: avanti }); t.casse[k] = oltre; t.spinte++;
    } else t.indietro.push({ io: t.io, cassa: -1 });
    if (t.indietro.length > 3000) t.indietro.shift();
    t.io = avanti; t.mosse++;
    return { ok: true, spinta: k >= 0 };
  }
  mossa(p, t, a) {
    if (a.tipo === 'passo') {
      if (!DIR[a.dir]) return { errore: 'Mossa non valida' };
      return this.passo(t, a.dir);
    }
    if (a.tipo === 'vai') {
      // camminare fino a una casella (senza spingere): il percorso più corto
      const dest = Number(a.i), { W, muro } = this.L;
      if (!Number.isInteger(dest) || dest < 0 || dest >= W * this.L.H || muro[dest] || t.casse.includes(dest)) return { errore: 'Lì non si può andare' };
      const strada = this.strada(t, dest);
      if (!strada) return { errore: 'Lì non si arriva senza spingere casse' };
      for (const d of strada) this.passo(t, d);
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      if (u.cassa >= 0) { t.casse[u.cassa] = u.da; t.spinte--; }
      t.io = u.io; t.mosse--;
      return { ok: true };
    }
    if (a.tipo === 'ricomincia') {
      if (!t.mosse) return { errore: 'Sei già all\'inizio' };
      t.casse = this.L.casse.slice(); t.io = this.L.io; t.indietro = []; t.mosse = 0; t.spinte = 0;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') return this.aiuto(p, t);
    return { errore: 'Mossa non valida' };
  }
  // AIUTO: la prossima spinta giusta da qui (il risolutore riparte dalla posizione attuale); costa 20 secondi.
  // Se da qui non c'è più soluzione lo dice: bisogna annullare.
  aiuto(p, t) {
    const r = this.prossimaSpinta(t); // il risolutore al massimo un paio di decimi di secondo
    if (r.errore) return r;
    for (const d of r.passi) this.passo(t, d);
    t.aiuti++; t.penale += AIUTO_MS;
    this.annuncia(p, 'chiede un aiuto (+20 s)', `aiuto: una spinta giusta (+20 s)${r.mancano > 1 ? ` · ne mancano ${r.mancano - 1}` : ''}`);
    return { ok: true };
  }

  // ---- computer: segue la soluzione del livello (calcolata da qui), un passo alla volta ----
  pianoBot(p, livello) {
    if (this.menti[p] && this.menti[p].strada) return this.menti[p];
    const t = this.tavole[p];
    // dall'inizio del livello segue la soluzione salvata (niente calcoli durante la partita); da un'altra posizione
    // (per esempio dopo aver preso il posto di una persona) la cerca, con un limite, oppure ricomincia
    const allInizio = t.io === this.L.io && t.casse.every((c, k) => c === this.L.casse[k]);
    let mosse = allInizio ? this.lv.soluzione : null;
    if (!mosse && this.tappe.has(this.chiave(t))) {
      // sulla strada della soluzione salvata: si va avanti una spinta alla volta (poi si ripensa)
      const r = this.prossimaSpinta(t);
      mosse = r.errore ? null : r.passi.join('');
    }
    if (!mosse) { const r = risolvi(this.L, t.casse, t.io, 25000); mosse = r && !r.troppo ? r.mosse : null; }
    if (!mosse) return (this.menti[p] = { strada: [], ricomincia: true, totale: 1000, passi: 1, annulla: 0 });
    const strada = mosse.toLowerCase().split('');
    const secPasso = 0.75 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    const vecchio = this.menti[p];
    return (this.menti[p] = { strada, totale: Math.max(1, strada.length) * secPasso * 1000, passi: Math.max(1, strada.length), annulla: vecchio ? vecchio.annulla : 0 });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 4 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], m = this.pianoBot(p, livello);
    if (m.ricomincia) { this.menti[p] = null; return t.mosse ? { tipo: 'ricomincia' } : { tipo: 'pensa' }; }
    // il facile ogni tanto fa un passo a vuoto e poi torna indietro
    if (m.annulla) { m.annulla = 0; return { tipo: 'annulla' }; }
    if (livello !== 'difficile' && Math.random() < (livello === 'facile' ? 0.08 : 0.02)) {
      const d = caso(NOMI_DIR), { W, muro } = this.L, j = t.io + DIR[d][0] + DIR[d][1] * W;
      if (!muro[j] && !t.casse.includes(j)) { m.annulla = 1; return { tipo: 'passo', dir: d }; }
    }
    const d = m.strada.shift();
    if (!d) { this.menti[p] = null; return { tipo: 'pensa' }; }
    return { tipo: 'passo', dir: d };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.numero] = RECORD[this.numero] || []);
    const voce = { ms: t.fatto, spinte: t.spinte, mosse: t.mosse, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.spinte === this.lv.spinte ? `Livello ${this.numero}: ${t.spinte} spinte, il minimo! 🏅` : `Livello ${this.numero} completato (${t.spinte} spinte, il minimo è ${this.lv.spinte})`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      numero: this.numero, totaleLivelli: DATI.length, gruppo: this.lv.gruppo, minimo: this.lv.spinte,
      W: this.L.W, H: this.L.H, muri: Array.from(this.L.muro), mete: Array.from(this.L.meta),
      casse: t.casse, io: t.io, mosse: t.mosse, spinte: t.spinte, aiuti: t.aiuti, penale: t.penale, puoAnnullare: t.indietro.length > 0,
      ultimo: t.indietro.length ? t.indietro[t.indietro.length - 1] : null,
      altriMosse: this.tavole.map((x) => x.spinte),
      record: this.sfida ? [] : RECORD[this.numero] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'sokoban',
    nome: 'Spingi le casse',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Il magazziniere deve spingere tutte le casse sulle caselle segnate, senza incastrarle. Livelli dal facile al difficilissimo.',
    alias: ['sokoban', 'casse', 'spingi le casse', 'magazziniere', 'magazzino', 'spingere'],
    opzioni: [
      { id: 'livelli', nome: 'Livelli', valori: ['facile', 'medio', 'difficile', 'esperto', 'tutti'], etichette: ['Facili', 'Medi', 'Difficili', 'Esperti (40-55 spinte)', 'Tutti'], predefinito: 'facile' },
      { id: 'livello', nome: 'Da soli: livello', valori: ['caso', ...dati().map((_, i) => i + 1)], etichette: ['Uno a caso del gruppo', ...dati().map((x, i) => `Livello ${i + 1} (${x.gruppo})`)], predefinito: 'caso' },
    ],
    regole: [
      'Sei il magazziniere 👷: devi portare tutte le casse sulle caselle segnate (le mete). Quando una cassa è sulla meta diventa verde.',
      'Ti muovi di una casella alla volta in orizzontale o in verticale. Le casse si possono solo spingere, una alla volta: non si tirano e non se ne spingono due in fila. Attento a non incastrarle negli angoli o contro i muri!',
      'Comandi: frecce o WASD (sul telefono i tasti freccia sotto il livello, o strisciando il dito). Cliccando una casella libera il magazziniere ci va da solo. Ctrl+Z (o U) annulla l\'ultimo passo, R ricomincia il livello.',
      `I livelli sono ${dati().length}, divisi in facili, medi, difficili ed esperti (da 40 a 55 spinte: stanze grandi, con tante casse); sono stati creati al computer e un risolutore ha controllato che ognuno abbia una soluzione e il minimo di spinte che serve. Da soli scegli il livello (o uno a caso); finisci con il minimo di spinte per la medaglia.`,
      '💡 Aiuto: fa da solo la prossima spinta giusta partendo da dove sei (+20 secondi). Se le casse sono ormai incastrate, l\'aiuto te lo dice: annulla qualche passo.',
      'Sfida (da 2 a 8): tutti hanno lo stesso livello; vince chi porta per primo tutte le casse a posto. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce la soluzione: il difficile è veloce e preciso, il medio più lento, il facile è lento e ogni tanto fa un passo inutile.',
    ],
  },
  crea: (o) => new Casse(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { leggi, morte, risolvi, dati, DIR },
};
