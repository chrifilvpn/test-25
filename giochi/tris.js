// TRIS: classico 3×3, 4×4 (quattro in fila) e Ultimate Tris (9 tris dentro un tris grande).
// Le celle contengono null oppure il posto (0 o 1) di chi le ha segnate.
const { casuale } = require('./carte');
const ANN = require('./annulla');

function lineeDi(lato, fila) {
  const L = [];
  const id = (r, c) => r * lato + c;
  for (let r = 0; r < lato; r++) for (let c = 0; c < lato; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const fr = r + dr * (fila - 1), fc = c + dc * (fila - 1);
      if (fr < 0 || fr >= lato || fc < 0 || fc >= lato) continue;
      L.push(Array.from({ length: fila }, (_, k) => id(r + dr * k, c + dc * k)));
    }
  }
  return L;
}
const L3 = lineeDi(3, 3);
const L4 = lineeDi(4, 4);
const MAX_MOSSE_FANTASMA = 100; // nel Ghost Tris la griglia non si riempie mai: dopo 100 segni è pareggio
const VARIANTI = { classico: { lato: 3, linee: L3 }, quattro: { lato: 4, linee: L4 }, ultimate: { lato: 9 } };

// chi ha fatto una linea? { v: posto, linea } | { v: 'pari' } se pieno | null
function esito(celle, linee) {
  for (const l of linee) {
    const v = celle[l[0]];
    if (v !== null && v !== 'pari' && l.every((i) => celle[i] === v)) return { v, linea: l };
  }
  return celle.every((c) => c !== null) ? { v: 'pari' } : null;
}

// ---------- Ultimate: stato compatto usato sia dalla partita sia dal computer ----------
// c: 81 celle (riquadro*9 + cella), w: esito dei 9 riquadri (null, posto o 'pari'), next: riquadro obbligato o null
function mosseU(u) {
  const tabs = u.next !== null ? [u.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((t) => u.w[t] === null);
  const out = [];
  for (const t of tabs) for (let i = 0; i < 9; i++) if (u.c[t * 9 + i] === null) out.push([t, i]);
  return out;
}
function applicaU(u, t, i, chi) {
  const c = u.c.slice();
  const w = u.w.slice();
  c[t * 9 + i] = chi;
  const e = esito(c.slice(t * 9, t * 9 + 9), L3);
  if (e) w[t] = e.v;
  return { c, w, next: w[i] === null ? i : null };
}
// vincitore del tris grande; se tutti i riquadri sono chiusi senza linea vince chi ne ha di più
function esitoU(u) {
  for (const l of L3) {
    const v = u.w[l[0]];
    if (v !== null && v !== 'pari' && l.every((k) => u.w[k] === v)) return { v, linea: l };
  }
  if (u.w.every((x) => x !== null)) {
    const a = u.w.filter((x) => x === 0).length;
    const b = u.w.filter((x) => x === 1).length;
    return { v: a === b ? 'pari' : a > b ? 0 : 1, conteggio: true };
  }
  return null;
}

class Tris {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'tris';
    this.n = n;
    this.variante = VARIANTI[opzioni.variante] ? opzioni.variante : 'classico';
    this.turno = primo;
    this.simboli = [];
    this.simboli[primo] = 'X';
    this.simboli[1 - primo] = 'O';
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultima = null;
    this.linea = null;
    if (this.variante === 'ultimate') this.u = { c: new Array(81).fill(null), w: new Array(9).fill(null), next: null };
    else this.celle = new Array(VARIANTI[this.variante].lato ** 2).fill(null);
    // Ghost Tris (3×3 e 4×4): ognuno tiene al massimo 3 segni (4 nel 4×4); il segno in più fa sparire il più vecchio
    this.fantasma = opzioni.fantasma === 'si' && this.variante !== 'ultimate';
    if (this.fantasma) { this.limite = VARIANTI[this.variante].lato; this.code = [[], []]; this.mosse = 0; this.sparito = null; }
    ANN.prepara(this, bot, ['turno', 'ultima', 'u', 'celle', 'code', 'mosse', 'sparito']);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'segna') return { errore: 'Mossa non valida' };
    // si salva la partita per "Annulla mossa"; se poi la mossa non è valida la copia si butta
    const prima = this.annIndietro.length;
    ANN.salva(this, p);
    const r = this.segna(p, a);
    if (r && r.errore && this.annIndietro.length > prima) this.annIndietro.pop();
    return r;
  }

  segna(p, a) {
    const i = Number(a.cella);
    if (this.variante === 'ultimate') {
      const t = Number(a.tab);
      if (!mosseU(this.u).some(([x, y]) => x === t && y === i)) return { errore: this.u.next !== null && t !== this.u.next ? 'Devi giocare nel riquadro evidenziato' : 'Casella non disponibile' };
      const prima = this.u.w[t];
      this.u = applicaU(this.u, t, i, p);
      this.ultima = { tab: t, cella: i };
      if (prima === null && this.u.w[t] === p) this.annuncia(p, 'conquista un riquadro', 'conquisti un riquadro');
      const e = esitoU(this.u);
      if (e) return this.chiudi(e);
    } else {
      if (!(i >= 0 && i < this.celle.length) || this.celle[i] !== null) return { errore: 'Casella già occupata' };
      this.sparito = null;
      if (this.fantasma) {
        const q = this.code[p];
        if (q.length >= this.limite) { const via = q.shift(); this.celle[via] = null; this.sparito = via; }
        q.push(i);
        this.mosse++;
      }
      this.celle[i] = p;
      this.ultima = { cella: i };
      const e = esito(this.celle, VARIANTI[this.variante].linee);
      if (e) return this.chiudi(e);
      if (this.fantasma && this.mosse >= MAX_MOSSE_FANTASMA) return this.chiudi({ v: 'pari' });
    }
    this.turno = 1 - p;
    return { ok: true };
  }

  chiudi(e) {
    this.finita = true;
    this.turno = null;
    this.linea = e.linea || null;
    const vince = e.v === 'pari' ? null : e.v;
    if (vince !== null) this.annuncia(vince, e.conteggio ? 'vince ai punti' : 'fa tris!', e.conteggio ? 'vinci ai punti!' : 'hai fatto tris!', true);
    else this.annuncia(null, 'Pareggio', 'pareggio', true);
    const ult = this.variante === 'ultimate';
    const punti = (p) => (ult ? this.u.w.filter((x) => x === p).length : vince === p ? 1 : 0);
    this.risultato = {
      fazioni: [0, 1].map((p) => ({ posti: [p], punti: punti(p) })),
      etichetta: ult ? 'riquadri' : 'punti',
      pareggio: vince === null,
      vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  // trucco segreto (!win): la mossa migliore del computer difficile, senza il suo errore "umano"
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    const errori = this.erroriBot;
    this.erroriBot = [1, 1];
    let a;
    try { a = bot(this, p, 'difficile'); } finally { this.erroriBot = errori; }
    if (this.u) return `💡 Riquadro ${NOMI_POS[a.tab]}, casella ${NOMI_POS[a.cella]}`;
    const lato = VARIANTI[this.variante].lato;
    return lato === 3 ? `💡 Segna la casella ${NOMI_POS[a.cella]}` : `💡 Segna riga ${Math.floor(a.cella / lato) + 1}, colonna ${(a.cella % lato) + 1}`;
  }

  vista(p) {
    const v = {
      gioco: this.id, n: this.n, variante: this.variante, simboli: this.simboli, puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato,
      evento: this.evento, ultima: this.ultima, linea: this.linea,
    };
    if (this.u) Object.assign(v, { tabs: this.u.c, vinte: this.u.w, prossima: this.u.next });
    else Object.assign(v, { celle: this.celle, lato: VARIANTI[this.variante].lato });
    if (this.fantasma) {
      // il prossimo segno che sparirà di ognuno (quello più vecchio, quando si è al limite)
      Object.assign(v, { fantasma: true, limite: this.limite, sparito: this.sparito, mosse: this.mosse, maxMosse: MAX_MOSSE_FANTASMA,
        prossimoVia: this.code.map((q) => (q.length >= this.limite ? q[0] : null)) });
    }
    return v;
  }
}

const NOMI_POS = ['in alto a sinistra', 'in alto al centro', 'in alto a destra', 'al centro a sinistra', 'al centro', 'al centro a destra', 'in basso a sinistra', 'in basso al centro', 'in basso a destra'];

// =================== COMPUTER ===================
const VINCE = 100000;

// ---- tris su una sola griglia (3×3 e 4×4) ----
function valutaLinee(celle, linee, chi) {
  const PESO = [0, 1, 12, 150, 2000];
  let s = 0;
  for (const l of linee) {
    let m = 0, a = 0;
    for (const i of l) { if (celle[i] === chi) m++; else if (celle[i] !== null) a++; }
    if (m && !a) s += PESO[m];
    else if (a && !m) s -= PESO[a];
  }
  return s;
}
function negamax(celle, chi, linee, prof, alfa, beta, ctx) {
  const e = esito(celle, linee);
  if (e) return e.v === 'pari' ? 0 : e.v === chi ? VINCE + prof : -(VINCE + prof);
  if (prof === 0 || ++ctx.nodi > ctx.max) return valutaLinee(celle, linee, chi);
  let best = -Infinity;
  for (let i = 0; i < celle.length; i++) {
    if (celle[i] !== null) continue;
    celle[i] = chi;
    const v = -negamax(celle, 1 - chi, linee, prof - 1, -beta, -alfa, ctx);
    celle[i] = null;
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  return best;
}
// punteggio di ogni mossa possibile, dal punto di vista di chi muove
function classifica(celle, chi, linee, prof, max) {
  const ctx = { nodi: 0, max };
  const libere = celle.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  return libere.map((i) => {
    celle[i] = chi;
    const v = -negamax(celle, 1 - chi, linee, prof - 1, -Infinity, Infinity, ctx);
    celle[i] = null;
    return { m: i, v: v + Math.random() * 0.5 }; // piccolo rumore: tra mosse equivalenti sceglie a caso
  }).sort((a, b) => b.v - a.v);
}
function vincente(celle, chi, linee) {
  for (let i = 0; i < celle.length; i++) {
    if (celle[i] !== null) continue;
    celle[i] = chi;
    const e = esito(celle, linee);
    celle[i] = null;
    if (e && e.v === chi) return i;
  }
  return -1;
}
// il difficile ogni tanto sbaglia: "quasi imbattibile ma non sempre"
// Al massimo un errore a partita, e solo con una certa probabilità a ogni mossa.
function conErrore(lista, prob, g, p) {
  g.erroriBot = g.erroriBot || [0, 0];
  if (lista.length > 1 && !g.erroriBot[p] && Math.random() < prob) { g.erroriBot[p]++; return lista[1].m; }
  return lista[0].m;
}

function botGriglia(g, p, livello) {
  const celle = g.celle.slice();
  const { linee } = VARIANTI[g.variante];
  const libere = celle.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  const mia = vincente(celle, p, linee);
  const sua = vincente(celle, 1 - p, linee);
  if (livello === 'facile') {
    if (mia >= 0 && Math.random() < 0.6) return mia;
    if (sua >= 0 && Math.random() < 0.3) return sua;
    return casuale(libere);
  }
  if (livello === 'medio') {
    if (mia >= 0) return mia;
    if (sua >= 0 && Math.random() < 0.85) return sua;
    const lista = classifica(celle, p, linee, 2, 20000);
    return Math.random() < 0.25 ? casuale(lista.slice(0, 3)).m : lista[0].m;
  }
  if (g.variante === 'classico') return conErrore(classifica(celle, p, linee, 9, Infinity), 0.05, g, p);
  if (mia >= 0) return mia;
  return conErrore(classifica(celle, p, linee, libere.length > 12 ? 4 : 6, 250000), 0.04, g, p);
}

// ---- Ultimate ----
const PESO_RIQ = [1.2, 1, 1.2, 1, 1.5, 1, 1.2, 1, 1.2];
function valutaU(u, chi) {
  let s = 0;
  for (const l of L3) { // linee del tris grande
    let m = 0, a = 0, morta = false;
    for (const k of l) { const x = u.w[k]; if (x === chi) m++; else if (x === 'pari') morta = true; else if (x !== null) a++; }
    if (morta) continue;
    if (m && !a) s += [0, 60, 400][m];
    else if (a && !m) s -= [0, 60, 400][a];
  }
  for (let t = 0; t < 9; t++) {
    const x = u.w[t];
    if (x === chi) { s += 100 * PESO_RIQ[t]; continue; }
    if (x !== null) { if (x !== 'pari') s -= 100 * PESO_RIQ[t]; continue; }
    const sub = u.c.slice(t * 9, t * 9 + 9);
    for (const l of L3) {
      let m = 0, a = 0;
      for (const i of l) { if (sub[i] === chi) m++; else if (sub[i] !== null) a++; }
      if (m && !a) s += (m === 2 ? 8 : 1) * PESO_RIQ[t];
      else if (a && !m) s -= (a === 2 ? 8 : 1) * PESO_RIQ[t];
    }
  }
  return s;
}
function negamaxU(u, chi, prof, alfa, beta, ctx) {
  const e = esitoU(u);
  if (e) return e.v === 'pari' ? 0 : e.v === chi ? VINCE + prof : -(VINCE + prof);
  if (prof === 0 || ++ctx.nodi > ctx.max) return valutaU(u, chi);
  let best = -Infinity;
  const mosse = mosseU(u);
  if (!mosse.length) return 0;
  for (const [t, i] of mosse) {
    const v = -negamaxU(applicaU(u, t, i, chi), 1 - chi, prof - 1, -beta, -alfa, ctx);
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  return best;
}
function botUltimate(g, p, livello) {
  const mosse = mosseU(g.u);
  if (livello === 'facile') {
    const conquista = mosse.find(([t, i]) => { const u = applicaU(g.u, t, i, p); return u.w[t] === p; });
    if (conquista && Math.random() < 0.45) return conquista;
    return casuale(mosse);
  }
  const prof = livello === 'medio' ? 2 : mosse.length > 30 ? 3 : 4;
  const ctx = { nodi: 0, max: livello === 'medio' ? 20000 : 150000 };
  const lista = mosse.map((m) => ({ m, v: -negamaxU(applicaU(g.u, m[0], m[1], p), 1 - p, prof - 1, -Infinity, Infinity, ctx) + Math.random() }))
    .sort((a, b) => b.v - a.v);
  if (livello === 'medio') return Math.random() < 0.2 ? casuale(lista.slice(0, 3)).m : lista[0].m;
  return conErrore(lista, 0.04, g, p);
}

// ---- Ghost Tris: la mossa toglie anche il segno più vecchio ----
function applicaF(st, i, chi, limite) {
  const celle = st.celle.slice(), code = [st.code[0].slice(), st.code[1].slice()];
  if (code[chi].length >= limite) celle[code[chi].shift()] = null;
  code[chi].push(i); celle[i] = chi;
  return { celle, code };
}
function negamaxF(st, chi, linee, limite, prof, alfa, beta, ctx) {
  const e = esito(st.celle, linee);
  if (e && e.v !== 'pari') return e.v === chi ? VINCE + prof : -(VINCE + prof);
  if (prof === 0 || ++ctx.nodi > ctx.max) return valutaLinee(st.celle, linee, chi);
  let best = -Infinity;
  for (let i = 0; i < st.celle.length; i++) {
    if (st.celle[i] !== null) continue;
    const v = -negamaxF(applicaF(st, i, chi, limite), 1 - chi, linee, limite, prof - 1, -beta, -alfa, ctx);
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  return best === -Infinity ? 0 : best;
}
function botFantasma(g, p, livello) {
  const { linee } = VARIANTI[g.variante];
  const st = { celle: g.celle.slice(), code: g.code };
  const libere = st.celle.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  const vince = (chi) => libere.find((i) => { const e = esito(applicaF(st, i, chi, g.limite).celle, linee); return e && e.v === chi; });
  const mia = vince(p);
  if (livello === 'facile') {
    if (mia !== undefined && Math.random() < 0.6) return mia;
    return casuale(libere);
  }
  if (mia !== undefined) return mia;
  const prof = livello === 'medio' ? 2 : g.variante === 'classico' ? 8 : 5;
  const ctx = { nodi: 0, max: livello === 'medio' ? 20000 : 300000 };
  const lista = libere.map((i) => ({ m: i, v: -negamaxF(applicaF(st, i, p, g.limite), 1 - p, linee, g.limite, prof - 1, -Infinity, Infinity, ctx) + Math.random() * 0.5 }))
    .sort((a, b) => b.v - a.v);
  if (livello === 'medio') return Math.random() < 0.25 ? casuale(lista.slice(0, 3)).m : lista[0].m;
  return conErrore(lista, 0.04, g, p);
}

function bot(g, p, livello) {
  if (g.fantasma) return { tipo: 'segna', cella: botFantasma(g, p, livello) };
  if (g.variante === 'ultimate') {
    const [tab, cella] = botUltimate(g, p, livello);
    return { tipo: 'segna', tab, cella };
  }
  return { tipo: 'segna', cella: botGriglia(g, p, livello) };
}

module.exports = {
  meta: {
    id: 'tris',
    nome: 'Tris',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Classico 3×3, 4×4, Ultimate Tris o Ghost Tris, dove i segni vecchi spariscono.',
    alias: ['ghost tris', 'tris fantasma'],
    opzioni: [
      { id: 'variante', nome: 'Variante', valori: ['classico', 'quattro', 'ultimate'], etichette: ['Classico 3×3', '4×4 (quattro in fila)', 'Ultimate Tris'], predefinito: 'classico' },
      { id: 'fantasma', nome: 'Ghost Tris', valori: ['no', 'si'], etichette: ['No', 'Sì: i segni vecchi spariscono'], predefinito: 'no' },
    ],
    regole: [
      'Si gioca in due: chi inizia usa ✕, l\'altro ◯. A turno si segna una casella libera. Alla rivincita inizia l\'altro.',
      'Classico 3×3: vince chi mette per primo tre simboli in fila, in orizzontale, verticale o diagonale. Se la griglia si riempie è pareggio.',
      '4×4: la griglia è 4×4 e servono quattro simboli in fila.',
      'Ultimate Tris: il tabellone è un tris grande fatto di 9 tris piccoli (i riquadri). Chi fa tris in un riquadro lo conquista.',
      'Ultimate Tris: la casella in cui giochi decide il riquadro dove dovrà giocare l\'avversario. Se segni la casella in alto a destra di un riquadro, lui dovrà giocare nel riquadro in alto a destra.',
      'Ultimate Tris: se il riquadro indicato è già conquistato o pieno, l\'avversario può giocare in qualsiasi riquadro libero. I riquadri dove puoi giocare sono evidenziati.',
      'Ultimate Tris: vince chi conquista tre riquadri in fila. Se tutti i riquadri si chiudono senza una fila, vince chi ne ha conquistati di più; a parità è pareggio.',
      'Ghost Tris (si sceglie prima di iniziare, vale per il 3×3 e il 4×4): ognuno può avere in griglia al massimo 3 segni (4 nel 4×4). Quando metti il quarto (il quinto nel 4×4), il tuo segno più vecchio sparisce. Il segno che sparirà alla tua prossima mossa è mezzo trasparente, e lo stesso si vede per l\'avversario.',
      'Ghost Tris: la griglia non si riempie mai, quindi si continua finché qualcuno fa la fila. Il segno che sparisce se ne va prima di controllare la fila: non conta più. Se dopo 100 segni in tutto nessuno ha vinto, è pareggio. Nell\'Ultimate Tris l\'opzione non si usa.',
      'Il computer difficile è quasi imbattibile, ma ogni tanto sbaglia: approfittane!',
      'Contro il computer c\'è "↶ Annulla mossa": torna a prima della tua ultima mossa (si annulla anche la risposta del computer).',
    ],
  },
  crea: (o) => new Tris(o),
  bot,
  _test: { esito, L3, L4, mosseU, applicaU, esitoU },
};
