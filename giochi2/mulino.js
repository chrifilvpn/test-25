// FILETTO (MULINO): tre quadrati uno dentro l'altro uniti dalle linee di mezzo, 24 punti. Ognuno ha 9 pedine.
// Prima si piazzano a turno, poi si muovono lungo le linee verso un punto vicino libero; chi resta con 3 pedine
// "vola" (salta in qualsiasi punto libero). Chi mette tre pedine in fila su una linea fa MULINO e toglie una pedina
// all'avversario (non una che sta in un mulino, se ce ne sono altre). Perde chi resta con 2 pedine o non può muovere.
// Le celle contengono null oppure il posto (0 o 1) del proprietario.
const ANN = require('../giochi/annulla');

// punti numerati riga per riga; coordinate su una griglia 7×7 (servono al disegno)
const COORD = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
];
const MULINI = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];
// due punti sono vicini se stanno uno dopo l'altro in una delle linee dei mulini
const VICINI = Array.from({ length: 24 }, () => []);
for (const [a, b, c] of MULINI) { VICINI[a].push(b); VICINI[b].push(a, c); VICINI[c].push(b); }
VICINI.forEach((v) => v.sort((x, y) => x - y));
const MULINI_DI = Array.from({ length: 24 }, () => []);
MULINI.forEach((m) => m.forEach((i) => MULINI_DI[i].push(m)));

const PEDINE = 9;
const MAX_SENZA_MULINO = 100; // 50 mosse a testa senza mulini → patta

// il punto i (occupato da celle[i]) fa parte di un mulino completo?
function inMulino(celle, i) {
  const v = celle[i];
  return MULINI_DI[i].some((m) => celle[m[0]] === v && celle[m[1]] === v && celle[m[2]] === v);
}
function mulinoCon(celle, i) {
  const v = celle[i];
  return MULINI_DI[i].find((m) => celle[m[0]] === v && celle[m[1]] === v && celle[m[2]] === v) || null;
}
// pedine dell'avversario di chi che si possono togliere: prima quelle fuori dai mulini
function togliibili(celle, chi, vuoto = null) {
  const sue = [];
  for (let i = 0; i < 24; i++) if (celle[i] !== vuoto && celle[i] === 1 - chi) sue.push(i);
  const fuori = sue.filter((i) => !inMulino(celle, i));
  return fuori.length ? fuori : sue;
}
const conta = (celle, chi) => { let n = 0; for (let i = 0; i < 24; i++) if (celle[i] === chi) n++; return n; };

class Mulino {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'mulino';
    this.n = n;
    this.volo = opzioni.volo !== 'no';
    this.colori = [];
    this.colori[primo] = 'bianco'; // il bianco inizia
    this.colori[1 - primo] = 'nero';
    this.celle = new Array(24).fill(null);
    this.mano = [PEDINE, PEDINE];
    this.turno = primo;
    this.daTogliere = false;
    this.ultima = null;      // { da, a, posto } dell'ultima mossa
    this.tolta = null;       // { punto, posto } dell'ultima pedina tolta
    this.mulino = null;      // mulino appena chiuso (tre punti)
    this.senzaMulino = 0;
    this.viste = {};         // posizioni già viste (ripetizione)
    this.nMosse = 0;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    ANN.prepara(this, bot, ['celle', 'mano', 'turno', 'daTogliere', 'ultima', 'tolta', 'mulino', 'senzaMulino', 'viste', 'nMosse']);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  // fase di un giocatore: piazza (ha ancora pedine in mano), vola (3 pedine e volo permesso), muovi
  fase(p) {
    if (this.mano[p] > 0) return 'piazza';
    return this.volo && conta(this.celle, p) === 3 ? 'vola' : 'muovi';
  }
  // spostamenti possibili di p: { da: [a, ...] }
  spostamenti(p) {
    const out = {};
    const f = this.fase(p);
    if (f === 'piazza') return out;
    const vuote = [];
    for (let i = 0; i < 24; i++) if (this.celle[i] === null) vuote.push(i);
    for (let i = 0; i < 24; i++) {
      if (this.celle[i] !== p) continue;
      const a = f === 'vola' ? vuote : VICINI[i].filter((k) => this.celle[k] === null);
      if (a.length) out[i] = a;
    }
    return out;
  }
  puoMuovere(p) { return this.fase(p) === 'piazza' ? this.celle.includes(null) : Object.keys(this.spostamenti(p)).length > 0; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    const punto = (x) => { const i = Number(x); return Number.isInteger(i) && i >= 0 && i < 24 ? i : -1; };
    if (this.daTogliere) {
      if (a.tipo !== 'togli') return { errore: 'Hai fatto mulino: prima togli una pedina dell\'avversario' };
      const i = punto(a.punto);
      if (i < 0) return { errore: 'Punto non valido' };
      if (this.celle[i] !== 1 - p) return { errore: 'Scegli una pedina dell\'avversario' };
      if (!togliibili(this.celle, p).includes(i)) return { errore: 'Questa pedina è in un mulino: togline un\'altra' };
      ANN.salva(this, p);
      this.celle[i] = null;
      this.tolta = { punto: i, posto: p };
      this.daTogliere = false;
      return this.dopoMossa(p);
    }
    const f = this.fase(p);
    if (f === 'piazza') {
      if (a.tipo !== 'metti') return { errore: 'Devi ancora piazzare le tue pedine' };
      const i = punto(a.punto);
      if (i < 0) return { errore: 'Punto non valido' };
      if (this.celle[i] !== null) return { errore: 'Punto già occupato' };
      ANN.salva(this, p);
      this.celle[i] = p;
      this.mano[p]--;
      this.ultima = { da: null, a: i, posto: p };
      return this.dopoArrivo(p, i);
    }
    if (a.tipo !== 'muovi') return { errore: 'Sposta una delle tue pedine' };
    const da = punto(a.da), i = punto(a.a);
    if (da < 0 || i < 0) return { errore: 'Punto non valido' };
    if (this.celle[da] !== p) return { errore: 'Scegli una tua pedina' };
    if (this.celle[i] !== null) return { errore: 'Punto già occupato' };
    if (f !== 'vola' && !VICINI[da].includes(i)) return { errore: 'Puoi spostarti solo in un punto vicino, lungo una linea' };
    ANN.salva(this, p);
    this.celle[da] = null;
    this.celle[i] = p;
    this.ultima = { da, a: i, posto: p };
    return this.dopoArrivo(p, i);
  }

  // una pedina è arrivata in i: mulino?
  dopoArrivo(p, i) {
    this.nMosse++;
    this.tolta = null;
    const m = mulinoCon(this.celle, i);
    this.mulino = m;
    if (m) {
      this.senzaMulino = 0;
      this.viste = {};
      if (this.celle.includes(1 - p)) {
        this.daTogliere = true;
        this.annuncia(p, 'fa mulino!', 'mulino! Togli una pedina dell\'avversario');
        return { ok: true };
      }
    } else if (this.mano[0] === 0 && this.mano[1] === 0) this.senzaMulino++;
    return this.dopoMossa(p);
  }

  dopoMossa(p) {
    const altro = 1 - p;
    if (conta(this.celle, altro) + this.mano[altro] < 3) return this.chiudi(p, 'resta con due pedine');
    if (!this.puoMuovere(altro)) return this.chiudi(p, 'non può più muovere');
    this.turno = altro;
    if (this.mano[0] === 0 && this.mano[1] === 0) {
      if (this.senzaMulino >= MAX_SENZA_MULINO) return this.chiudi(null, '50 mosse a testa senza mulini');
      const k = this.celle.map((x) => (x === null ? '.' : x)).join('') + altro;
      this.viste[k] = (this.viste[k] || 0) + 1;
      if (this.viste[k] >= 3) return this.chiudi(null, 'la stessa posizione si è ripetuta tre volte');
    }
    return { ok: true };
  }

  chiudi(vince, motivo) {
    this.finita = true;
    this.turno = null;
    this.daTogliere = false;
    this.motivo = motivo;
    if (vince !== null) {
      this.annuncia(vince, `vince: l'avversario ${motivo}!`, `hai vinto: l'avversario ${motivo}!`, true);
    } else this.annuncia(null, `Patta: ${motivo}`, '', true);
    this.risultato = {
      fazioni: [0, 1].map((x) => ({ posti: [x], punti: vince === x ? 1 : 0 })),
      etichetta: 'punti', pareggio: vince === null, vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  vista(p) {
    const t = this.turno;
    let mosse = null;
    if (!this.finita && t != null) {
      if (this.daTogliere) mosse = { tipo: 'togli', punti: togliibili(this.celle, t) };
      else if (this.fase(t) === 'piazza') mosse = { tipo: 'metti', punti: this.celle.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0) };
      else mosse = { tipo: 'muovi', da: this.spostamenti(t) };
    }
    return {
      gioco: this.id, n: this.n, celle: this.celle, colori: this.colori, mano: this.mano, volo: this.volo,
      sulTavolo: [conta(this.celle, 0), conta(this.celle, 1)], fasi: [this.fase(0), this.fase(1)],
      daTogliere: this.daTogliere, mosse, ultima: this.ultima, tolta: this.tolta, mulino: this.mulino,
      senzaMulino: this.senzaMulino, nMosse: this.nMosse, motivo: this.motivo || null,
      puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: t, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// Motore: celle Int8Array (-1 vuoto), pedine in mano, chi muove. Una "mossa" è completa: { da (-1 se si piazza),
// a, togli (-1 se non si fa mulino) }. Ricerca negamax alfa-beta con approfondimento progressivo e tabella delle
// posizioni (chiavi di Zobrist).
const VINCE = 100000;
const rnd = () => (Math.random() * 0x40000000) | 0;
const Z = Array.from({ length: 24 }, () => [rnd(), rnd()]);
const ZM = Array.from({ length: 2 }, () => Array.from({ length: 10 }, rnd));
const ZT = rnd();

class Motore {
  constructor(celle, mano, volo) {
    this.b = Int8Array.from(celle, (x) => (x === null ? -1 : x));
    this.mano = [mano[0], mano[1]];
    this.n = [0, 0];
    for (let i = 0; i < 24; i++) if (this.b[i] >= 0) this.n[this.b[i]]++;
    this.volo = volo;
    this.tt = new Map();
    this.nodi = 0; this.stop = false; this.fino = Infinity;
  }
  chiave(chi) {
    let k = chi ? ZT : 0;
    for (let i = 0; i < 24; i++) if (this.b[i] >= 0) k ^= Z[i][this.b[i]];
    return k ^ ZM[0][this.mano[0]] ^ ZM[1][this.mano[1]];
  }
  formaMulino(i, chi) {
    const b = this.b;
    for (const m of MULINI_DI[i]) if (b[m[0]] === chi && b[m[1]] === chi && b[m[2]] === chi) return true;
    return false;
  }
  togliibili(chi) { return togliibili(this.b, chi, -1); }
  // tutte le mosse complete di chi
  mosse(chi) {
    const b = this.b, out = [];
    const arrivi = [];
    if (this.mano[chi] > 0) {
      for (let a = 0; a < 24; a++) if (b[a] === -1) arrivi.push(-1, a);
    } else if (this.volo && this.n[chi] === 3) {
      for (let d = 0; d < 24; d++) if (b[d] === chi) for (let a = 0; a < 24; a++) if (b[a] === -1) arrivi.push(d, a);
    } else {
      for (let d = 0; d < 24; d++) if (b[d] === chi) for (const a of VICINI[d]) if (b[a] === -1) arrivi.push(d, a);
    }
    for (let k = 0; k < arrivi.length; k += 2) {
      const d = arrivi[k], a = arrivi[k + 1];
      if (d >= 0) b[d] = -1;
      b[a] = chi;
      if (this.formaMulino(a, chi) && this.n[1 - chi] > 0) {
        for (const t of this.togliibili(chi)) out.push([d, a, t]);
      } else out.push([d, a, -1]);
      b[a] = -1;
      if (d >= 0) b[d] = chi;
    }
    return out;
  }
  fai(m, chi) {
    const [d, a, t] = m;
    if (d >= 0) this.b[d] = -1; else { this.mano[chi]--; this.n[chi]++; }
    this.b[a] = chi;
    if (t >= 0) { this.b[t] = -1; this.n[1 - chi]--; }
  }
  disfai(m, chi) {
    const [d, a, t] = m;
    if (t >= 0) { this.b[t] = 1 - chi; this.n[1 - chi]++; }
    this.b[a] = -1;
    if (d >= 0) this.b[d] = chi; else { this.mano[chi]++; this.n[chi]--; }
  }
  bloccato(chi) { // chi (con le pedine già tutte piazzate) non ha mosse?
    if (this.mano[chi] > 0) return false;
    if (this.volo && this.n[chi] === 3) return false;
    const b = this.b;
    for (let d = 0; d < 24; d++) if (b[d] === chi) for (const a of VICINI[d]) if (b[a] === -1) return false;
    return true;
  }
  // valutazione statica dal punto di vista di chi
  valuta(chi) {
    const b = this.b, avv = 1 - chi;
    const tot = [this.n[0] + this.mano[0], this.n[1] + this.mano[1]];
    let s = (tot[chi] - tot[avv]) * 120;
    let mulini = 0, aperti = 0, mob = 0, bloc = 0;
    for (const m of MULINI) {
      let mie = 0, sue = 0, vuote = 0;
      for (const i of m) { if (b[i] === chi) mie++; else if (b[i] === avv) sue++; else vuote++; }
      if (mie === 3) mulini++; else if (sue === 3) mulini--;
      else if (mie === 2 && vuote === 1) aperti++;
      else if (sue === 2 && vuote === 1) aperti--;
    }
    const piazzando = this.mano[0] > 0 || this.mano[1] > 0;
    for (let d = 0; d < 24; d++) {
      if (b[d] === -1) continue;
      let lib = 0;
      for (const a of VICINI[d]) if (b[a] === -1) lib++;
      if (b[d] === chi) { mob += lib; if (!lib) bloc--; } else { mob -= lib; if (!lib) bloc++; }
    }
    s += mulini * 14 + aperti * (piazzando ? 10 : 7) + mob * (piazzando ? 1 : 3) + bloc * 4;
    // mulino "che si apre e si chiude": una pedina del mulino può uscire e rientrare (vicino libero)
    if (!piazzando) {
      for (const m of MULINI) {
        const v = b[m[0]];
        if (v === -1 || b[m[1]] !== v || b[m[2]] !== v) continue;
        let apribile = false;
        for (const i of m) for (const a of VICINI[i]) if (b[a] === -1) apribile = true;
        if (apribile) s += v === chi ? 10 : -10;
      }
    }
    return s;
  }
  negamax(chi, prof, alfa, beta, ply) {
    if ((++this.nodi & 511) === 0 && Date.now() > this.fino) this.stop = true;
    if (this.stop) return 0;
    if (this.bloccato(chi)) return -VINCE + ply;
    if (prof <= 0) return this.valuta(chi);
    const chiave = this.chiave(chi);
    const t = this.tt.get(chiave);
    const alfa0 = alfa;
    let prima = null;
    if (t) {
      if (t.prof >= prof) {
        if (t.tipo === 0) return t.v;
        if (t.tipo === 1 && t.v > alfa) alfa = t.v;
        else if (t.tipo === 2 && t.v < beta) beta = t.v;
        if (alfa >= beta) return t.v;
      }
      prima = t.best;
    }
    const mosse = this.mosse(chi);
    if (!mosse.length) return -VINCE + ply;
    // prima la mossa migliore già trovata, poi quelle che tolgono una pedina
    mosse.sort((x, y) => (y[2] >= 0) - (x[2] >= 0));
    if (prima) {
      const k = mosse.findIndex((m) => m[0] === prima[0] && m[1] === prima[1] && m[2] === prima[2]);
      if (k > 0) mosse.unshift(mosse.splice(k, 1)[0]);
    }
    let best = -Infinity, bestM = mosse[0];
    for (const m of mosse) {
      this.fai(m, chi);
      let v;
      if (this.n[1 - chi] + this.mano[1 - chi] < 3) v = VINCE - ply - 1;
      else v = -this.negamax(1 - chi, prof - 1, -beta, -alfa, ply + 1);
      this.disfai(m, chi);
      if (this.stop) return 0;
      if (v > best) { best = v; bestM = m; }
      if (best > alfa) alfa = best;
      if (alfa >= beta) break;
    }
    if (this.tt.size > 300000) this.tt.clear();
    this.tt.set(chiave, { prof, v: best, tipo: best <= alfa0 ? 2 : best >= beta ? 1 : 0, best: bestM });
    return best;
  }
}

// valore di ogni mossa completa (approfondimento progressivo finché c'è tempo)
function classifica(celle, mano, volo, chi, profMax, ms, soloTogli = false, pieno = false) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 4);
  const m = new Motore(celle, mano, volo);
  m.fino = Date.now() + ms;
  // se si deve solo togliere (mulino già fatto), le mosse sono "togli t" (da = a = -1)
  let mosse = soloTogli ? m.togliibili(chi).map((t) => [-2, -2, t]) : m.mosse(chi);
  const fai = (x) => { if (x[0] === -2) { m.b[x[2]] = -1; m.n[1 - chi]--; } else m.fai(x, chi); };
  const disfai = (x) => { if (x[0] === -2) { m.b[x[2]] = 1 - chi; m.n[1 - chi]++; } else m.disfai(x, chi); };
  let migliore = mosse.map((x) => ({ m: x, v: 0 }));
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    let alfa = -Infinity;
    for (const { m: x } of migliore) {
      fai(x);
      let v;
      if (m.n[1 - chi] + m.mano[1 - chi] < 3) v = VINCE;
      else v = -m.negamax(1 - chi, prof - 1, -Infinity, pieno ? Infinity : -alfa + 1, 1);
      disfai(x);
      if (m.stop) break;
      giro.push({ m: x, v });
      if (v > alfa) alfa = v;
    }
    if (m.stop) {
      // giro interrotto: la mossa migliore di prima è stata cercata per prima; un'altra che la batte è più sicura
      if (giro.length > 1) {
        const top = giro.slice(1).reduce((a, b) => (b.v > a.v ? b : a));
        if (top.v > giro[0].v) migliore = [top, ...migliore.filter((x) => x.m !== top.m)];
      }
      break;
    }
    migliore = giro.sort((a, b) => b.v - a.v);
    classifica.prof = prof;
    if (Math.abs(migliore[0].v) > VINCE / 2) break;
  }
  return migliore;
}

const casuale = (a) => a[Math.floor(Math.random() * a.length)];
function azioneDa(g, mossa) {
  if (mossa[0] === -2) return { tipo: 'togli', punto: mossa[2] };
  if (mossa[0] === -1) return { tipo: 'metti', punto: mossa[1] };
  return { tipo: 'muovi', da: mossa[0], a: mossa[1] };
}

function bot(g, p, livello) {
  if (g.daTogliere) {
    const tg = togliibili(g.celle, p);
    if (livello === 'facile') return { tipo: 'togli', punto: casuale(tg) };
    const lista = classifica(g.celle, g.mano, g.volo, p, livello === 'medio' ? 2 : 30, livello === 'medio' ? 60 : 250, true);
    return { tipo: 'togli', punto: lista[0].m[2] };
  }
  const m = new Motore(g.celle, g.mano, g.volo);
  const mosse = m.mosse(p);
  if (!mosse.length) return { tipo: 'metti', punto: 0 }; // non succede: chi non può muovere ha già perso
  if (livello === 'facile') {
    // quasi a caso: chiude un mulino solo a volte e blocca quello dell'avversario ancora più di rado
    const mulini = mosse.filter((x) => x[2] >= 0);
    if (mulini.length && Math.random() < 0.5) return azioneDa(g, casuale(mulini));
    if (Math.random() < 0.25) {
      const sue = new Motore(g.celle, g.mano, g.volo).mosse(1 - p).filter((x) => x[2] >= 0).map((x) => x[1]);
      const blocchi = mosse.filter((x) => sue.includes(x[1]));
      if (blocchi.length) return azioneDa(g, casuale(blocchi));
    }
    return azioneDa(g, casuale(mosse));
  }
  if (livello === 'medio') {
    const lista = classifica(g.celle, g.mano, g.volo, p, 3, 80, false, true);
    // ogni tanto sceglie la seconda mossa, se non è molto peggio
    if (lista.length > 1 && Math.random() < 0.2 && lista[1].v > lista[0].v - 40) return azioneDa(g, lista[1].m);
    return azioneDa(g, lista[0].m);
  }
  const lista = classifica(g.celle, g.mano, g.volo, p, 40, 250);
  // tra mosse che valgono uguale ne sceglie una a caso (così non gioca sempre la stessa partita)
  const pari = lista.filter((x) => x.v === lista[0].v);
  return azioneDa(g, casuale(pari).m);
}

module.exports = {
  meta: {
    id: 'mulino',
    nome: 'Filetto (Mulino)',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Piazza e muovi le tue 9 pedine sui tre quadrati: tre in fila fanno mulino e mangiano una pedina avversaria.',
    alias: ['mulino', 'filetto', 'tris a nove', 'nine men\'s morris', 'merels', 'trilla'],
    opzioni: [
      { id: 'volo', nome: 'Con 3 pedine', valori: ['si', 'no'], etichette: ['Si vola in qualsiasi punto libero', 'Si muove come sempre (senza volo)'], predefinito: 'si' },
    ],
    regole: [
      'Si gioca in due su un tavoliere di tre quadrati uno dentro l\'altro, uniti a metà dei lati: 24 punti in tutto. Ognuno ha 9 pedine; il bianco inizia. Alla rivincita inizia l\'altro.',
      'Prima fase: a turno si mette una pedina in un punto libero qualsiasi, finché tutte e 18 non sono sul tavoliere (o tolte).',
      'Seconda fase: a turno si sposta una propria pedina lungo una linea fino al punto vicino, se è libero. Non si salta e non si sta fermi.',
      'Chi mette tre pedine in fila sulla stessa linea (in piazzamento o spostando) fa MULINO e toglie subito una pedina dell\'avversario a scelta. Non si può togliere una pedina che fa parte di un mulino, a meno che l\'avversario non abbia solo pedine nei mulini. Aprire un mulino e richiuderlo con la mossa dopo vale un nuovo mulino.',
      'Volo: chi resta con 3 pedine può spostarle in qualsiasi punto libero del tavoliere (si può togliere con l\'opzione).',
      'Perde chi resta con 2 pedine o, al suo turno, non può muovere nessuna pedina perché sono tutte bloccate.',
      'Patta se la stessa posizione si ripete tre volte con lo stesso giocatore di turno, oppure dopo 50 mosse a testa senza mulini.',
      'Come si gioca qui: clicca un punto libero per piazzare; poi clicca una tua pedina (si illuminano i punti dove può andare) e il punto di arrivo. Dopo un mulino le pedine che puoi togliere lampeggiano in rosso.',
      'Il computer facile muove quasi a caso e vede un mulino solo ogni tanto; il medio guarda 3 mosse avanti; il difficile cerca più a fondo che può in un terzo di secondo (alfa-beta con mobilità, mulini aperti e pedine bloccate).',
      'Contro il computer c\'è "↶ Annulla mossa": torna a prima della tua ultima mossa (si annulla anche la risposta del computer).',
    ],
  },
  crea: (o) => new Mulino(o),
  bot,
  _test: { COORD, MULINI, VICINI, togliibili, inMulino, classifica, Motore, PEDINE },
};
