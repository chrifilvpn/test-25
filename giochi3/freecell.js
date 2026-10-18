// FREECELL: 52 carte scoperte in 8 colonne, 4 celle libere (ognuna tiene una carta) e 4 basi (dall'asso al re per
// seme). In colonna si mette una carta sopra una di colore diverso e di un numero in più. Si sposta una carta alla
// volta, ma con celle e colonne vuote si possono spostare anche pile ordinate (tante quante si potrebbero spostare
// una per una). Le carte che servono solo sulle basi ci vanno da sole. Ogni distribuzione è controllata da un
// risolutore (ricerca "best-first"): si può sempre vincere, e la soluzione guida aiuto e computer.
// Da soli per il tempo; in sfida (2-8) tutti hanno la stessa distribuzione.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, mescola } = require('../giochi2/rompicapo-sfida');

const SEMI = ['c', 'q', 'f', 'p'];
const ROSSO = { c: true, q: true };
const AIUTO_MS = 15000;
const RECORD = [];
const rango = (id) => parseInt(id, 10);
const seme = (id) => id[id.length - 1];
const rosso = (id) => !!ROSSO[seme(id)];

// stato: { col: [[id…]×8], celle: [id|null ×4], basi: {c,q,f,p: rango in cima} }
const copia = (s) => ({ col: s.col.map((c) => c.slice()), celle: s.celle.slice(), basi: { ...s.basi } });
const sopraOk = (sotto, c) => rosso(sotto) !== rosso(c) && rango(sotto) === rango(c) + 1;
const suBase = (s, c) => s.basi[seme(c)] === rango(c) - 1;
// quante carte si possono spostare in una volta verso una colonna (piena o vuota)
const capienza = (s, versoVuota) => {
  const celle = s.celle.filter((x) => !x).length, vuote = s.col.filter((c) => !c.length).length - (versoVuota ? 1 : 0);
  return (celle + 1) * 2 ** Math.max(0, vuote);
};
// da dove parte la pila ordinata in fondo a una colonna
function inizioPila(col) { let k = col.length - 1; while (k > 0 && sopraOk(col[k - 1], col[k])) k--; return k; }

// le carte che vanno da sole sulle basi: quelle che non servono più a nessuno (le carte di colore opposto un numero
// sotto sono già tutte sulle basi)
function sicura(s, c) {
  if (!suBase(s, c)) return false;
  const r = rango(c);
  if (r <= 2) return true;
  const opposti = rosso(c) ? ['f', 'p'] : ['c', 'q'];
  return opposti.every((x) => s.basi[x] >= r - 1);
}
function automatiche(s) {
  const fatte = [];
  for (let giro = true; giro;) {
    giro = false;
    for (let i = 0; i < 8; i++) { const col = s.col[i], c = col[col.length - 1]; if (c && sicura(s, c)) { col.pop(); s.basi[seme(c)]++; fatte.push(c); giro = true; } }
    for (let i = 0; i < 4; i++) { const c = s.celle[i]; if (c && sicura(s, c)) { s.celle[i] = null; s.basi[seme(c)]++; fatte.push(c); giro = true; } }
  }
  return fatte;
}
// una mossa: { da: {c,k}|{f}, a: {c}|{f}|{b} }. Restituisce un messaggio d'errore o null (e cambia s)
function applica(s, m) {
  const { da, a } = m;
  let carte;
  if (da && Number.isInteger(da.c) && da.c >= 0 && da.c < 8) {
    const col = s.col[da.c], k = Number.isInteger(da.k) ? da.k : col.length - 1;
    if (k < 0 || k >= col.length) return 'Carta non valida';
    if (k < inizioPila(col)) return 'Si spostano solo pile ordinate (colori alternati, a scendere)';
    carte = col.slice(k);
  } else if (da && Number.isInteger(da.f) && s.celle[da.f]) carte = [s.celle[da.f]];
  else return 'Carta non valida';
  if (a && a.b) {
    if (carte.length !== 1 || !suBase(s, carte[0])) return 'Sulla base va solo la carta successiva dello stesso seme';
  } else if (a && Number.isInteger(a.f) && a.f >= 0 && a.f < 4) {
    if (carte.length !== 1) return 'In una cella va una carta sola';
    if (s.celle[a.f]) return 'La cella è occupata';
  } else if (a && Number.isInteger(a.c) && a.c >= 0 && a.c < 8) {
    if (da.c === a.c) return 'È la stessa colonna';
    const dest = s.col[a.c];
    if (dest.length && !sopraOk(dest[dest.length - 1], carte[0])) return 'Va sopra una carta di colore diverso e di un numero in più';
    if (carte.length > capienza(s, !dest.length)) return `Con le celle e le colonne vuote che hai puoi spostare al massimo ${capienza(s, !dest.length)} carte insieme`;
  } else return 'Destinazione non valida';
  // si fa
  if (da.c != null) s.col[da.c].length -= carte.length; else s.celle[da.f] = null;
  if (a.b) s.basi[seme(carte[0])]++;
  else if (a.f != null) s.celle[a.f] = carte[0];
  else s.col[a.c].push(...carte);
  return null;
}
const chiave = (s) => `${s.col.map((c) => c.join(',')).sort().join('|')}#${s.celle.filter(Boolean).sort().join(',')}`;
const sulleBasi = (s) => SEMI.reduce((t, x) => t + s.basi[x], 0);

// le mosse sensate da una posizione
function mosse(s) {
  const out = [];
  const celleVuote = s.celle.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  const vuota = s.col.findIndex((c) => !c.length);
  for (let i = 0; i < 8; i++) {
    const col = s.col[i]; if (!col.length) continue;
    const top = col[col.length - 1];
    if (suBase(s, top)) out.push({ da: { c: i, k: col.length - 1 }, a: { b: 1 } });
    const k0 = inizioPila(col);
    for (let j = 0; j < 8; j++) {
      if (j === i) continue;
      const dest = s.col[j];
      if (dest.length) {
        // la carta della pila che va sopra la cima di dest (una sola possibile)
        const sotto = dest[dest.length - 1];
        for (let k = k0; k < col.length; k++) if (sopraOk(sotto, col[k])) { if (col.length - k <= capienza(s, false)) out.push({ da: { c: i, k }, a: { c: j } }); break; }
      } else if (j === vuota && k0 > 0) {
        // verso la colonna vuota: la pila più lunga che ci sta (se la colonna non è già tutta una pila)
        const k = Math.max(k0, col.length - capienza(s, true));
        out.push({ da: { c: i, k }, a: { c: j } });
      }
    }
    if (celleVuote.length) out.push({ da: { c: i, k: col.length - 1 }, a: { f: celleVuote[0] } });
  }
  for (let f = 0; f < 4; f++) {
    const c = s.celle[f]; if (!c) continue;
    if (suBase(s, c)) out.push({ da: { f }, a: { b: 1 } });
    for (let j = 0; j < 8; j++) { const dest = s.col[j]; if (!dest.length ? j === vuota : sopraOk(dest[dest.length - 1], c)) out.push({ da: { f }, a: { c: j } }); }
  }
  return out;
}
// stima di quanto manca (più bassa = meglio): carte non sulle basi, carte "incastrate" sopra carte più basse, celle usate
function stima(s) {
  let h = (52 - sulleBasi(s)) * 3;
  for (const col of s.col) {
    let minimo = 99;
    for (const c of col) { const r = rango(c); if (r > minimo) h += 2; minimo = Math.min(minimo, r); }
  }
  h += s.celle.filter(Boolean).length * 1.5;
  h -= s.col.filter((c) => !c.length).length * 2;
  return h;
}
// RISOLUTORE: best-first con un mucchio (heap) e memoria delle posizioni viste
function risolvi(inizio, limite = 60000) {
  const s0 = copia(inizio); automatiche(s0);
  if (sulleBasi(s0) === 52) return { mosse: [], nodi: 0 };
  const heap = [], viste = new Map();
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a].f < heap[m].f) m = a; if (b < heap.length && heap[b].f < heap[m].f) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
  const k0 = chiave(s0);
  viste.set(k0, null);
  push({ s: s0, k: k0, g: 0, f: stima(s0) });
  let nodi = 0;
  while (heap.length) {
    const n = pop();
    if (++nodi > limite) return { mosse: null, nodi, troppo: true };
    for (const m of mosse(n.s)) {
      const t = copia(n.s);
      if (applica(t, m)) continue;
      automatiche(t);
      const k = chiave(t);
      if (viste.has(k)) continue;
      viste.set(k, { da: n.k, m });
      if (sulleBasi(t) === 52) {
        const out = [];
        for (let x = k; viste.get(x); x = viste.get(x).da) out.push(viste.get(x).m);
        return { mosse: out.reverse(), nodi };
      }
      push({ s: t, k, g: n.g + 1, f: stima(t) + (n.g + 1) * 0.5 });
    }
  }
  return { mosse: null, nodi };
}

function nuovaDistribuzione() {
  const m = []; for (const x of SEMI) for (let r = 1; r <= 13; r++) m.push(`${r}${x}`);
  for (let t = 0; t < 50; t++) {
    const carte = mescola(m.slice());
    const s = { col: Array.from({ length: 8 }, () => []), celle: [null, null, null, null], basi: { c: 0, q: 0, f: 0, p: 0 } };
    carte.forEach((c, i) => s.col[i % 8].push(c));
    const r = risolvi(s, 40000);
    if (r.mosse) return { s, soluzione: r.mosse };
  }
  throw new Error('nessuna distribuzione risolta');
}

class FreeCell extends SfidaRompicapo {
  constructor(o) {
    super('freecell', o, 30 * 60000);
    const d = nuovaDistribuzione();
    this.iniziale = d.s; this.soluzione = d.soluzione;
    this.tavole = Array.from({ length: this.n }, () => ({ s: copia(d.s), indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, suggerimento: null, ultime: [] }));
    for (const t of this.tavole) automatiche(t.s);
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  progresso(i, t) { return sulleBasi(t.s) / 52; }
  risolta(p, t) { return sulleBasi(t.s) === 52; }
  fraseArrivo(p, t) { return { altri: `mette tutte le carte sulle basi in ${t.mosse} mosse! 🃏`, io: 'Tutte le carte sulle basi! 🃏' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  mossa(p, t, a) {
    if (a.tipo === 'sposta') {
      const prova = copia(t.s);
      const err = applica(prova, { da: a.da, a: a.a });
      if (err) return { errore: err };
      t.indietro.push(copia(t.s)); if (t.indietro.length > 500) t.indietro.shift();
      t.s = prova; t.ultime = automatiche(t.s); t.mosse++; t.suggerimento = null;
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      t.s = u; t.mosse++; t.suggerimento = null; t.ultime = [];
      return { ok: true };
    }
    if (a.tipo === 'ricomincia') {
      if (!t.indietro.length) return { errore: 'Sei già all\'inizio' };
      t.indietro.push(copia(t.s)); t.s = copia(this.iniziale); automatiche(t.s); t.suggerimento = null; t.ultime = [];
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const r = risolvi(t.s, 20000);
      if (!r.mosse || !r.mosse.length) return { errore: r.troppo ? 'Posizione troppo complicata per l\'aiuto: prova ad annullare qualche mossa' : 'Da qui non si vince più: annulla qualche mossa' };
      t.suggerimento = r.mosse[0];
      t.aiuti++; t.penale += AIUTO_MS;
      this.annuncia(p, 'chiede un aiuto (+15 s)', 'aiuto: la mossa giusta lampeggia (+15 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // ---- computer: segue la soluzione (o la ricalcola); il facile ogni tanto parcheggia una carta e poi la riprende ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const t = this.tavole[p];
    const r = t.mosse === 0 ? { mosse: this.soluzione.slice() } : risolvi(t.s, 30000);
    const passi = r.mosse ? r.mosse.length : 1;
    const sec = 3.2 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { coda: r.mosse ? r.mosse.slice() : [], totale: passi * sec * 1000, passi, annulla: 0 });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const m = this.pianoBot(p, livello), t = this.tavole[p];
    if (m.annulla) { m.annulla = 0; return { tipo: 'annulla' }; }
    const svista = { facile: 0.07, medio: 0.02, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) { const tutte = mosse(t.s); if (tutte.length) { m.annulla = 1; const x = tutte[Math.floor(Math.random() * tutte.length)]; return { tipo: 'sposta', da: x.da, a: x.a }; } }
    if (!m.coda.length) { this.menti[p] = null; return t.indietro.length ? { tipo: 'annulla' } : { tipo: 'pensa' }; }
    const x = m.coda.shift();
    return { tipo: 'sposta', da: x.da, a: x.a };
  }

  risultatoSolo(t) {
    const voce = { ms: t.fatto, mosse: t.mosse, id: Math.random() };
    RECORD.push(voce); RECORD.sort((x, y) => x.ms - y.ms); RECORD.splice(5);
    this.posizioneRecord = RECORD.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = `Vinto in ${t.mosse} mosse${t.aiuti ? ` (${t.aiuti} aiuti)` : ''}`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      colonne: t.s.col, celle: t.s.celle, basi: t.s.basi, mosse: t.mosse, ultime: t.ultime,
      capienza: capienza(t.s, false), capienzaVuota: capienza(t.s, true),
      suggerimento: t.suggerimento, aiuti: t.aiuti, penale: t.penale, puoAnnullare: t.indietro.length > 0,
      basiAltri: this.tavole.map((x) => sulleBasi(x.s)),
      record: this.sfida ? [] : RECORD, posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'freecell',
    nome: 'FreeCell',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Il solitario a carte scoperte: 8 colonne, 4 celle libere e 4 basi. Ogni distribuzione si può vincere. Da soli o in gara.',
    alias: ['freecell', 'free cell', 'celle libere', 'solitario freecell'],
    opzioni: [],
    regole: [
      'Tutte le 52 carte sono scoperte in 8 colonne. In alto a sinistra ci sono 4 CELLE libere (ognuna tiene una carta qualsiasi), a destra le 4 BASI, una per seme.',
      'Lo scopo è mettere tutte le carte sulle basi, in ordine dall\'asso al re dello stesso seme.',
      'In colonna una carta va sopra una carta di colore diverso e di un numero in più (per esempio un 7 nero su un 8 rosso). In una colonna vuota va qualsiasi carta.',
      'Si sposta una carta alla volta (l\'ultima di una colonna o quella di una cella). Si possono spostare anche pile ordinate tutte insieme, se ci sono abbastanza celle e colonne vuote per farlo una carta per volta: il numero massimo è scritto in alto.',
      'Le carte che non servono più in colonna vanno sulle basi da sole. Comandi: tocca una carta (o una pila) e poi dove metterla; doppio tocco: sulla base o in una cella libera. Ctrl+Z annulla.',
      'Ogni distribuzione si può vincere: lo ha controllato il computer. 💡 Aiuto: la mossa giusta lampeggia (+15 secondi). Da soli per il tempo; in sfida (da 2 a 8) stessa distribuzione per tutti, vince chi finisce prima.',
      'Il computer conosce una soluzione: il difficile è veloce, il medio più lento, il facile è lento e ogni tanto fa una mossa inutile e la annulla.',
    ],
  },
  crea: (o) => new FreeCell(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { risolvi, applica, automatiche, capienza, inizioPila, sicura, mosse, nuovaDistribuzione, copia, sulleBasi },
};
