// PICROSS A COLORI: come il nonogram, ma i blocchi hanno un colore. I numeri accanto a righe e colonne dicono, in
// ordine, quanto sono lunghi i blocchi e di che colore sono; due blocchi dello stesso colore hanno almeno una casella
// vuota in mezzo, due blocchi di colori diversi possono toccarsi. Colorando le caselle giuste esce un disegno (fatto a
// mano, vedi picross-dati.js). Ogni disegno si risolve con la sola logica delle file: dove non basterebbe, alcune
// caselle sono scoperte fin dall'inizio. Da soli per il tempo; in sfida (2-8) tutti hanno lo stesso disegno.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('../giochi2/rompicapo-sfida');
const PL = require('./picross-logica');
const DISEGNI = require('./picross-dati');

const AIUTO_MS = 20000;
const CROCE = 99; // casella segnata come vuota
const RECORD = {};
const GRUPPI = { piccola: 'Piccoli (10×10)', grande: 'Grandi (15×15)', tutti: 'Tutti' };

// prepara un disegno (eventualmente specchiato): indizi e caselle da scoprire perché basti la logica
const CACHE = new Map();
function prepara(k, specchio) {
  const chiave = `${k}:${specchio}`;
  if (CACHE.has(chiave)) return CACHE.get(chiave);
  const d = DISEGNI[k];
  const base = PL.leggi(d);
  const { W, H } = base;
  const img = specchio ? base.img.map((_, i) => { const x = i % W, y = (i - x) / W; return base.img[y * W + (W - 1 - x)]; }) : base.img;
  const ind = PL.indizi(W, H, img);
  const note = new Map();
  for (let giro = 0; giro < W * H; giro++) {
    const r = PL.risolviLogica(W, H, ind, base.colori.length, note);
    if (r.risolto) break;
    // si scopre la casella incerta più vicina al centro (sempre la stessa: lo schema è uguale per tutti)
    let meglio = -1, dist = Infinity;
    r.poss.forEach((v, i) => { if (v & (v - 1)) { const x = i % W, y = (i - x) / W, dd = Math.abs(x - (W - 1) / 2) + Math.abs(y - (H - 1) / 2) + i * 1e-6; if (dd < dist) { dist = dd; meglio = i; } } });
    note.set(meglio, img[meglio]);
  }
  const p = { k, nome: d.nome, gruppo: d.grandezza, W, H, img, colori: base.colori, indizi: ind, scoperte: [...note.keys()].sort((a, b) => a - b) };
  CACHE.set(chiave, p);
  return p;
}

class Picross extends SfidaRompicapo {
  constructor(o) {
    super('picross', o, 40 * 60000);
    const op = o.opzioni || {};
    this.gruppo = GRUPPI[op.disegni] ? op.disegni : 'piccola';
    this.mostraErrori = op.errori === 'subito';
    const scelti = DISEGNI.map((d, k) => k).filter((k) => this.gruppo === 'tutti' || DISEGNI[k].grandezza === this.gruppo);
    const n = Number(op.disegno);
    const k = !this.sfida && Number.isInteger(n) && DISEGNI[n - 1] ? n - 1 : caso(scelti);
    this.d = prepara(k, Math.random() < 0.5);
    this.numero = k + 1;
    const { W, H, img } = this.d;
    this.nColorate = img.filter(Boolean).length;
    this.tavole = Array.from({ length: this.n }, () => {
      const celle = new Array(W * H).fill(0);
      for (const i of this.d.scoperte) celle[i] = img[i] || CROCE;
      return { celle, indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, ultimoAiuto: null };
    });
    this.scoperte = new Set(this.d.scoperte);
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) {
    let giuste = 0, sbagliate = 0;
    t.celle.forEach((v, k) => { if (v && v !== CROCE) { if (v === this.d.img[k]) giuste++; else sbagliate++; } });
    return Math.max(0, (giuste - sbagliate) / this.nColorate);
  }
  risolta(p, t) { return t.celle.every((v, k) => (this.d.img[k] ? v === this.d.img[k] : v === 0 || v === CROCE)); }
  fraseArrivo() { return { altri: `completa il disegno: ${this.d.nome}! 🎨`, io: `Disegno completato: ${this.d.nome}! 🎨` }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }
  sbagliate(t) { return t.celle.map((v, k) => (v && ((v === CROCE && this.d.img[k]) || (v !== CROCE && v !== this.d.img[k])) ? k : -1)).filter((k) => k >= 0); }

  mossa(p, t, a) {
    const N = this.d.W * this.d.H;
    if (a.tipo === 'segna') {
      const lista = Array.isArray(a.celle) ? a.celle.slice(0, N) : [a.i];
      const v = Number(a.v);
      if (!(v === 0 || v === CROCE || (Number.isInteger(v) && v >= 1 && v <= this.d.colori.length))) return { errore: 'Colore non valido' };
      const cambi = [];
      for (const x of lista) {
        const i = Number(x);
        if (!Number.isInteger(i) || i < 0 || i >= N || this.scoperte.has(i) || t.celle[i] === v) continue;
        cambi.push([i, t.celle[i]]); t.celle[i] = v;
      }
      if (!cambi.length) return { errore: 'Niente da cambiare' };
      t.indietro.push(cambi); if (t.indietro.length > 2000) t.indietro.shift();
      t.mosse++;
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      for (const [i, v] of u.slice().reverse()) t.celle[i] = v;
      return { ok: true };
    }
    if (a.tipo === 'cancella') {
      const cambi = t.celle.map((v, i) => [i, v]).filter(([i, v]) => v && !this.scoperte.has(i));
      if (!cambi.length) return { errore: 'La griglia è già vuota' };
      t.indietro.push(cambi); for (const [i] of cambi) t.celle[i] = 0;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const sb = this.sbagliate(t);
      const mancano = t.celle.map((v, k) => (this.d.img[k] && v !== this.d.img[k] ? k : -1)).filter((k) => k >= 0);
      const i = sb.length ? caso(sb) : mancano.length ? caso(mancano) : -1;
      if (i < 0) return { errore: 'Non serve nessun aiuto' };
      t.indietro.push([[i, t.celle[i]]]); t.celle[i] = this.d.img[i] || CROCE;
      t.aiuti++; t.penale += AIUTO_MS; t.ultimoAiuto = i;
      this.annuncia(p, 'chiede un aiuto (+20 s)', sb.length ? 'aiuto: c\'era una casella sbagliata, ora è giusta (+20 s)' : 'aiuto: una casella colorata in più (+20 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // !win banana: il nome del disegno e la riga con più caselle da sistemare, blocco per blocco con il suo colore
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const { W, H, img } = this.d;
    const giusta = (v, k) => (img[k] ? v === img[k] : v === 0 || v === CROCE);
    let y = -1, peggio = 0;
    for (let r = 0; r < H; r++) { let k = 0; for (let x = 0; x < W; x++) if (!giusta(t.celle[r * W + x], r * W + x)) k++; if (k > peggio) { peggio = k; y = r; } }
    if (y < 0) return null;
    const blocchi = [];
    for (let x = 0; x < W; x++) {
      const v = img[y * W + x];
      if (!v) continue;
      const u = blocchi[blocchi.length - 1];
      if (u && u.v === v && u.b === x - 1) u.b = x; else blocchi.push({ v, a: x, b: x });
    }
    const testo = blocchi.length ? blocchi.map((q) => `col ${q.a + 1}${q.b > q.a ? `-${q.b + 1}` : ''} colore ${q.v}`).join(', ') : 'tutta vuota';
    return `💡 È: ${this.d.nome} · Riga ${y + 1}: ${testo}`;
  }

  // ---- computer: colora le caselle giuste in un ordine qualsiasi; il facile ogni tanto sbaglia colore ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const t = this.tavole[p];
    const coda = mescola(this.d.img.map((v, k) => (v && t.celle[k] !== v ? k : -1)).filter((k) => k >= 0));
    const sec = (this.d.W > 10 ? 1.7 : 1.5) * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { coda, totale: Math.max(1, coda.length) * sec * 1000, passi: Math.max(1, coda.length) });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 3 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], m = this.pianoBot(p, livello), img = this.d.img;
    const sb = this.sbagliate(t);
    if (sb.length && Math.random() < 0.5) return { tipo: 'segna', i: sb[0], v: img[sb[0]] || 0 };
    const svista = { facile: 0.1, medio: 0.025, difficile: 0 }[livello] || 0;
    while (m.coda.length && t.celle[m.coda[0]] === img[m.coda[0]]) m.coda.shift();
    if (m.coda.length) {
      const i = m.coda.shift();
      if (Math.random() < svista && this.d.colori.length > 1) return { tipo: 'segna', i, v: (img[i] % this.d.colori.length) + 1 };
      return { tipo: 'segna', i, v: img[i] };
    }
    if (sb.length) return { tipo: 'segna', i: sb[0], v: img[sb[0]] || 0 };
    this.menti[p] = null;
    return { tipo: 'pensa' };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.numero] = RECORD[this.numero] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = `${this.d.nome}${t.aiuti ? ` (con ${t.aiuti} ${t.aiuti === 1 ? 'aiuto' : 'aiuti'})` : ', senza aiuti! 🏅'}`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const finito = this.finita || t.fatto != null;
    return {
      ...this.vistaComune(p),
      W: this.d.W, H: this.d.H, colori: this.d.colori, indizi: this.d.indizi, scoperte: this.d.scoperte, numero: this.numero,
      nomeDisegno: finito ? this.d.nome : null, celle: t.celle, mosse: t.mosse,
      mostraErrori: this.mostraErrori, sbagliate: this.mostraErrori && !finito ? this.sbagliate(t) : [],
      soluzione: this.finita ? this.d.img : null,
      aiuti: t.aiuti, penale: t.penale, ultimoAiuto: t.ultimoAiuto, puoAnnullare: t.indietro.length > 0,
      record: this.sfida ? [] : RECORD[this.numero] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'picross',
    nome: 'Picross a colori',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Il nonogram con i colori: i numeri colorati di righe e colonne dicono quali caselle dipingere. Alla fine esce un disegno. Da soli o in sfida.',
    alias: ['picross', 'picross a colori', 'nonogram a colori', 'nonogramma', 'griddler', 'disegno nascosto', 'pixel art'],
    opzioni: [
      { id: 'disegni', nome: 'Disegni', valori: Object.keys(GRUPPI), etichette: Object.values(GRUPPI), predefinito: 'piccola' },
      { id: 'disegno', nome: 'Da soli: disegno', valori: ['caso', ...DISEGNI.map((_, k) => k + 1)], etichette: ['Uno a caso', ...DISEGNI.map((d, k) => `Disegno ${k + 1} (${d.grandezza === 'piccola' ? '10×10' : '15×15'})`)], predefinito: 'caso' },
      { id: 'errori', nome: 'Errori', valori: ['regole', 'subito'], etichette: ['Segna solo le file sbagliate', 'Segna subito le caselle sbagliate'], predefinito: 'regole' },
    ],
    regole: [
      'Accanto a ogni riga e sopra ogni colonna ci sono dei numeri colorati: dicono, nell\'ordine, quanto sono lunghi i blocchi di caselle di quel colore. Per esempio "3 rosso, 2 blu" vuol dire tre caselle rosse di fila e poi due blu.',
      'Due blocchi dello STESSO colore hanno sempre almeno una casella vuota in mezzo; due blocchi di colori DIVERSI possono toccarsi (o no: dipende).',
      'Scegli il colore nella tavolozza e tocca (o trascina) le caselle; la ✕ segna le caselle sicuramente vuote. Tasto destro: ✕. Toccare di nuovo con lo stesso colore svuota la casella. Ctrl+Z annulla; i tasti 1-6 scelgono il colore, X la croce.',
      'Quando una fila è giusta i suoi numeri si spengono. Alla fine esce un disegno, fatto a mano: ci sono disegni piccoli (10×10) e grandi (15×15).',
      'Ogni disegno si risolve con la sola logica, senza tirare a indovinare: dove serve, qualche casella è già scoperta all\'inizio. 💡 Aiuto: sistema una casella al costo di 20 secondi.',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno lo stesso disegno: vince chi lo completa per primo. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce il disegno: il difficile è veloce, il medio più lento, il facile è lento e ogni tanto sbaglia colore (poi si corregge).',
    ],
  },
  crea: (o) => new Picross(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { prepara, DISEGNI, CROCE },
};
