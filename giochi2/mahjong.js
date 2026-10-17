// MAHJONG SOLITARIO: le tessere sono impilate in una figura (la Tartaruga classica da 144, o la Piramide da 80); si
// tolgono a coppie uguali, ma solo quelle libere: niente sopra e almeno un lato (destro o sinistro) libero. I fiori
// vanno con qualsiasi fiore e le stagioni con qualsiasi stagione. Lo schema è SEMPRE risolvibile: si costruisce al
// contrario, togliendo dalla figura piena due posti liberi alla volta e dando a ognuna di queste coppie due facce uguali
// (quindi quell'ordine è una soluzione). Se si resta senza mosse si possono rimescolare le tessere rimaste (di nuovo in
// modo risolvibile). Da soli o in sfida (stesso schema per tutti, vince chi finisce prima).
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso, mescola } = require('./rompicapo-sfida');

const AIUTO_MS = 15000, MESCOLA_MS = 30000;
const RECORD = {};

// ---------------- figure: posti [x, y, z] in mezze tessere (una tessera occupa 2×2) ----------------
function tartaruga() {
  const p = [];
  const fila = (y, da, a, z = 0) => { for (let c = da; c <= a; c++) p.push([c * 2, y * 2, z]); };
  fila(0, 1, 12); fila(1, 3, 10); fila(2, 2, 11); fila(3, 1, 12); fila(4, 1, 12); fila(5, 2, 11); fila(6, 3, 10); fila(7, 1, 12);
  p.push([0, 7, 0], [26, 7, 0], [28, 7, 0]); // le tre tessere ai lati (a metà altezza)
  for (let y = 1; y <= 6; y++) fila(y, 4, 9, 1);
  for (let y = 2; y <= 5; y++) fila(y, 5, 8, 2);
  for (let y = 3; y <= 4; y++) fila(y, 6, 7, 3);
  p.push([13, 7, 4]); // la cima
  return p;
}
function piramide() {
  const p = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) p.push([x * 2, y * 2, 0]);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) p.push([x * 2 + 2, y * 2 + 2, 1]);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) p.push([x * 2 + 4, y * 2 + 4, 2]);
  return p;
}
const FIGURE = { tartaruga: { nome: 'Tartaruga', posti: tartaruga() }, piramide: { nome: 'Piramide', posti: piramide() } };

// ---------------- facce: 'c1'..'c9' cerchi, 'b1'..'b9' bambù, 'n1'..'n9' caratteri, 've','vs','vo','vn' venti,
// 'dr','dv','db' draghi, 'f1'..'f4' fiori, 's1'..'s4' stagioni ----------------
const SEMI = ['c', 'b', 'n'];
const NORMALI = [...SEMI.flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => `${s}${v}`)), 've', 'vs', 'vo', 'vn', 'dr', 'dv', 'db'];
const gruppo = (f) => (f[0] === 'f' && f.length === 2 && /\d/.test(f[1]) ? 'f' : f[0] === 's' && /\d/.test(f[1]) ? 's' : f);
const uguali = (a, b) => gruppo(a) === gruppo(b);
// le coppie di facce per n tessere: tutte le 34 normali ×4 più fiori e stagioni per 144; per figure più piccole un
// sottoinsieme a caso di tipi (sempre a quattro a quattro)
function coppie(n) {
  const out = [];
  if (n === 144) {
    for (const f of NORMALI) out.push([f, f], [f, f]);
    out.push(['f1', 'f2'], ['f3', 'f4'], ['s1', 's2'], ['s3', 's4']);
  } else {
    const tipi = mescola(NORMALI.slice()).slice(0, n / 4);
    for (const f of tipi) out.push([f, f], [f, f]);
  }
  return mescola(out);
}

// ---------------- libere ----------------
// per ogni posto: chi gli sta sopra e chi gli sta di fianco (a sinistra / a destra), calcolato una volta per figura
function vicini(posti) {
  return posti.map(([x, y, z]) => ({
    sopra: posti.map((q, j) => (q[2] === z + 1 && Math.abs(q[0] - x) < 2 && Math.abs(q[1] - y) < 2 ? j : -1)).filter((j) => j >= 0),
    sx: posti.map((q, j) => (q[2] === z && q[0] === x - 2 && Math.abs(q[1] - y) < 2 ? j : -1)).filter((j) => j >= 0),
    dx: posti.map((q, j) => (q[2] === z && q[0] === x + 2 && Math.abs(q[1] - y) < 2 ? j : -1)).filter((j) => j >= 0),
  }));
}
function libera(V, c, i) {
  if (!c[i]) return false;
  const v = V[i];
  if (v.sopra.some((j) => c[j])) return false;
  return !v.sx.some((j) => c[j]) || !v.dx.some((j) => c[j]);
}
// riempie i posti "c" (true = c'è una tessera) con facce in modo risolvibile: si tolgono coppie di posti liberi a caso
// fino a vuotare; restituisce { facce, ordine } (ordine = le coppie di posti, una soluzione) o null
function riempi(V, c, facce) {
  for (let prova = 0; prova < 300; prova++) {
    const resto = c.slice(), ordine = [];
    let n = resto.filter(Boolean).length, ok = true;
    while (n > 0) {
      const lib = []; for (let i = 0; i < resto.length; i++) if (libera(V, resto, i)) lib.push(i);
      if (lib.length < 2) { ok = false; break; }
      // si preferiscono i posti più in alto e quelli che liberano altro: così non si resta incastrati
      mescola(lib);
      lib.sort((a, b) => V[b].sopra.length - V[a].sopra.length);
      const a = lib[0], b = lib[1 + Math.floor(Math.random() * Math.min(lib.length - 1, 4))];
      resto[a] = false; resto[b] = false; n -= 2;
      ordine.push([a, b]);
    }
    if (!ok) continue;
    const f = new Array(c.length).fill(null);
    const cp = facce.length === ordine.length ? facce : null;
    ordine.forEach(([a, b], k) => { f[a] = cp[k][0]; f[b] = cp[k][1]; });
    return { facce: f, ordine }; // l'ordine in cui si sono tolti i posti è anche una soluzione
  }
  return null;
}
// rimescola le facce rimaste in modo risolvibile
function rimescola(V, facce) {
  const c = facce.map(Boolean);
  const rimaste = facce.filter(Boolean);
  // le facce rimaste a coppie uguali (fiori con fiori, stagioni con stagioni)
  const per = new Map();
  for (const f of rimaste) { const g = gruppo(f); if (!per.has(g)) per.set(g, []); per.get(g).push(f); }
  const cp = [];
  for (const l of per.values()) for (let k = 0; k + 1 < l.length; k += 2) cp.push([l[k], l[k + 1]]);
  return riempi(V, c, mescola(cp));
}

class Mahjong extends SfidaRompicapo {
  constructor(o) {
    super('mahjong', o, 40 * 60000);
    const op = o.opzioni || {};
    this.figura = FIGURE[op.figura] ? op.figura : 'tartaruga';
    this.posti = FIGURE[this.figura].posti;
    this.V = vicini(this.posti);
    let r = null;
    while (!r) r = riempi(this.V, this.posti.map(() => true), coppie(this.posti.length));
    this.iniziali = r.facce;
    this.soluzione = r.ordine;
    this.tavole = Array.from({ length: this.n }, () => ({ facce: r.facce.slice(), indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, mescolate: 0, penale: 0, piano: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) { return 1 - t.facce.filter(Boolean).length / this.posti.length; }
  risolta(p, t) { return t.facce.every((f) => !f); }
  fraseArrivo() { return { altri: 'toglie tutte le tessere! 🀄', io: 'Tutte le tessere tolte! 🀄' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tempoDi(a) - this.tempoDi(b)); }

  libere(t) { const c = t.facce.map(Boolean); return t.facce.map((f, i) => libera(this.V, c, i)); }
  mosseLibere(t) {
    const lib = this.libere(t), out = [];
    for (let a = 0; a < lib.length; a++) if (lib[a]) for (let b = a + 1; b < lib.length; b++) if (lib[b] && uguali(t.facce[a], t.facce[b])) out.push([a, b]);
    return out;
  }

  mossa(p, t, a) {
    if (a.tipo === 'togli') {
      const x = Number(a.a), y = Number(a.b);
      if (!Number.isInteger(x) || !Number.isInteger(y) || x === y || !t.facce[x] || !t.facce[y]) return { errore: 'Tessere non valide' };
      const lib = this.libere(t);
      if (!lib[x] || !lib[y]) return { errore: 'Si possono togliere solo le tessere libere (niente sopra e un lato libero)' };
      if (!uguali(t.facce[x], t.facce[y])) return { errore: 'Le due tessere non sono uguali' };
      t.indietro.push([[x, t.facce[x]], [y, t.facce[y]]]);
      t.facce[x] = null; t.facce[y] = null; t.mosse++;
      if (!this.risolta(p, t) && !this.mosseLibere(t).length) this.annuncia(p, 'è rimasto senza mosse', 'niente più coppie libere: annulla o rimescola (+30 s)');
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      if (u.mescola) { t.facce = u.mescola; } else for (const [i, f] of u) t.facce[i] = f;
      t.piano = null;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const m = this.mosseLibere(t);
      if (!m.length) return { errore: 'Non ci sono coppie libere: annulla o rimescola' };
      // la coppia della soluzione, se è ancora possibile; altrimenti una coppia qualsiasi
      const giusta = this.soluzione.find(([x, y]) => t.facce[x] && t.facce[y] && m.some((q) => (q[0] === x && q[1] === y) || (q[0] === y && q[1] === x)));
      t.suggerimento = giusta || caso(m);
      t.aiuti++; t.penale += AIUTO_MS;
      this.annuncia(p, 'chiede un aiuto (+15 s)', 'aiuto: le due tessere che lampeggiano (+15 s)');
      return { ok: true };
    }
    if (a.tipo === 'mescola') {
      const r = rimescola(this.V, t.facce);
      if (!r) return { errore: 'Non si riesce a rimescolare: annulla qualche mossa' };
      t.indietro.push({ mescola: t.facce.slice() });
      t.facce = r.facce; t.piano = r.ordine; t.mescolate++; t.penale += MESCOLA_MS;
      this.annuncia(p, 'rimescola le tessere (+30 s)', 'tessere rimescolate (+30 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // ---- computer: toglie le coppie nell'ordine della soluzione; il facile a volte prende una coppia libera a caso
  // (e se resta senza mosse rimescola) ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const coppieN = this.posti.length / 2;
    const secCoppia = { tartaruga: 6, piramide: 5 }[this.figura] * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale: coppieN * secCoppia * 1000, passi: coppieN });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    this.pianoBot(p, livello);
    const m = this.mosseLibere(t);
    // senza mosse: si rimescola; se nemmeno così si può (per esempio due tessere una sopra l'altra) si annulla
    if (!m.length) return rimescola(this.V, t.facce) ? { tipo: 'mescola' } : { tipo: 'annulla' };
    const svista = { facile: 0.25, medio: 0.06, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) { const [a, b] = caso(m); return { tipo: 'togli', a, b }; }
    const piano = t.piano || this.soluzione;
    const giusta = piano.find(([x, y]) => t.facce[x] && t.facce[y]);
    if (giusta && m.some((q) => (q[0] === giusta[0] && q[1] === giusta[1]) || (q[0] === giusta[1] && q[1] === giusta[0]))) return { tipo: 'togli', a: giusta[0], b: giusta[1] };
    // il piano non va più bene (dopo una svista): si sceglie la coppia che libera più tessere
    let meglio = m[0], mv = -1;
    for (const [a, b] of m) {
      const prova = t.facce.slice(); prova[a] = null; prova[b] = null;
      const c = prova.map(Boolean), v = prova.filter((f, i) => libera(this.V, c, i)).length;
      if (v > mv) { mv = v; meglio = [a, b]; }
    }
    return { tipo: 'togli', a: meglio[0], b: meglio[1] };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.figura] = RECORD[this.figura] || []);
    const voce = { ms: this.tempoDi(0), aiuti: t.aiuti, mescolate: t.mescolate, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    return super.risultatoSolo(t);
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const lib = this.libere(t);
    return {
      ...this.vistaComune(p),
      figura: this.figura, nomeFigura: FIGURE[this.figura].nome, posti: this.posti, facce: t.facce, libere: lib,
      coppieLibere: t.fatto == null ? this.mosseLibere(t).length : 0,
      suggerimento: t.suggerimento && t.facce[t.suggerimento[0]] && t.facce[t.suggerimento[1]] ? t.suggerimento : null,
      aiuti: t.aiuti, mescolate: t.mescolate, penale: t.penale, puoAnnullare: t.indietro.length > 0,
      rimasteAltri: this.tavole.map((x) => x.facce.filter(Boolean).length),
      record: this.sfida ? [] : RECORD[this.figura] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'mahjong',
    nome: 'Mahjong solitario',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Togli le tessere a coppie uguali, solo quelle libere, fino a svuotare la figura. Ogni schema ha sempre una soluzione.',
    alias: ['mahjong', 'mahjongg', 'majong', 'mah jong', 'tessere', 'shanghai', 'tartaruga', 'solitario cinese'],
    opzioni: [
      { id: 'figura', nome: 'Figura', valori: ['tartaruga', 'piramide'], etichette: ['Tartaruga (144 tessere, la classica)', 'Piramide (80 tessere, più breve)'], predefinito: 'tartaruga' },
    ],
    regole: [
      'Le tessere sono impilate a strati in una figura. Bisogna toglierle tutte, a coppie di tessere uguali.',
      'Si possono togliere solo le tessere libere: quelle che non hanno niente sopra (nemmeno in parte) e che hanno libero almeno il lato destro o il lato sinistro. Le tessere libere sono più chiare; quelle bloccate sono un po\' più scure.',
      'Le tessere: cerchi, bambù e caratteri dall\'1 al 9, i quattro venti (Est, Sud, Ovest, Nord), i tre draghi (rosso, verde e bianco), ognuna in quattro copie. Nella Tartaruga ci sono anche quattro fiori e quattro stagioni: un fiore va con qualsiasi altro fiore e una stagione con qualsiasi stagione.',
      'Comandi: clicca (o tocca) una tessera libera e poi la sua uguale. Ctrl+Z annulla, H chiede un aiuto, M rimescola.',
      'Ogni schema ha sempre una soluzione (è costruito al contrario, togliendo coppie dalla figura piena), ma l\'ordine conta: si può restare senza coppie libere. Allora si annulla qualche mossa, oppure si rimescolano le tessere rimaste (di nuovo in modo risolvibile) con 30 secondi di penalità. 💡 Aiuto: mostra una coppia buona (+15 secondi).',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno lo stesso schema e vince chi finisce prima (penalità comprese). Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer: il difficile toglie le coppie nell\'ordine giusto ed è veloce; il medio è più lento e sbaglia di rado; il facile è lento e spesso prende la prima coppia che vede (a volte resta senza mosse e deve rimescolare).',
    ],
  },
  crea: (o) => new Mahjong(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { FIGURE, vicini, libera, riempi, rimescola, coppie, uguali, NORMALI },
};
