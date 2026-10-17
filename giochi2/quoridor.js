// MURI E PEDINE: tavola 9×9, ognuno deve portare la sua pedina sul lato opposto. A turno si sposta la pedina di una
// casella (in orizzontale o verticale) oppure si mette un muro lungo due caselle nelle scanalature tra le caselle.
// I muri non possono sovrapporsi né incrociarsi e non possono mai chiudere del tutto la strada a nessuno.
// Se la pedina avversaria è accanto si salta; se dietro c'è un muro (o il bordo) si va di lato in diagonale.
// Caselle numerate r*9+c (riga 0 in alto). Muri: indice o*64 + r*8 + c, con o = 0 orizzontale e o = 1 verticale;
// il muro (r, c) sta sull'incrocio tra le caselle (r, c), (r, c+1), (r+1, c), (r+1, c+1).
const L = 9;
const MAX_MOSSE = 150; // mosse a testa: oltre, vince chi è più vicino all'arrivo

// lati della tavola: 0 in basso (va in alto), 1 a sinistra (va a destra), 2 in alto (va in basso), 3 a destra
const PARTENZA = [8 * L + 4, 4 * L + 0, 0 * L + 4, 4 * L + 8];
const ARRIVO = [
  (i) => Math.floor(i / L) === 0, (i) => i % L === 8, (i) => Math.floor(i / L) === 8, (i) => i % L === 0,
];
const CASELLE_ARRIVO = ARRIVO.map((f) => Array.from({ length: L * L }, (_, i) => i).filter(f));
const NOMI_LATI = ['in alto', 'a destra', 'in basso', 'a sinistra'];

const mw = (o, r, c) => o * 64 + r * 8 + c;
// PASSI[i]: per ogni direzione (su, giù, sinistra, destra) [casella vicina, muro1, muro2] oppure null al bordo
const DIR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const PASSI = Array.from({ length: L * L }, (_, i) => {
  const r = Math.floor(i / L), c = i % L;
  return DIR.map(([dr, dc], d) => {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= L || cc < 0 || cc >= L) return null;
    const ok = (o, a, b) => (a >= 0 && a < 8 && b >= 0 && b < 8 ? mw(o, a, b) : -1);
    let m1, m2;
    if (d === 0) { m1 = ok(0, r - 1, c); m2 = ok(0, r - 1, c - 1); }
    else if (d === 1) { m1 = ok(0, r, c); m2 = ok(0, r, c - 1); }
    else if (d === 2) { m1 = ok(1, r, c - 1); m2 = ok(1, r - 1, c - 1); }
    else { m1 = ok(1, r, c); m2 = ok(1, r - 1, c); }
    return [rr * L + cc, m1, m2];
  });
});
const aperto = (muri, passo) => passo && !(passo[1] >= 0 && muri[passo[1]]) && !(passo[2] >= 0 && muri[passo[2]]);
// muri che si sovrappongono o si incrociano con w
const CONFLITTI = Array.from({ length: 128 }, (_, w) => {
  const o = w >> 6, r = (w >> 3) & 7, c = w & 7, out = [w, mw(1 - o, r, c)];
  if (o === 0) { if (c > 0) out.push(mw(0, r, c - 1)); if (c < 7) out.push(mw(0, r, c + 1)); }
  else { if (r > 0) out.push(mw(1, r - 1, c)); if (r < 7) out.push(mw(1, r + 1, c)); }
  return out;
});
// i due passaggi che un muro chiude: [casella, direzione]
const CHIUDE = Array.from({ length: 128 }, (_, w) => {
  const o = w >> 6, r = (w >> 3) & 7, c = w & 7;
  return o === 0 ? [[r * L + c, 1], [r * L + c + 1, 1]] : [[r * L + c, 3], [(r + 1) * L + c, 3]];
});

// distanze di tutte le caselle dall'arrivo di un lato (i pedoni non contano); 99 = irraggiungibile
const CODA = new Int16Array(L * L);
function distanze(muri, lato, out = new Uint8Array(L * L)) {
  out.fill(99);
  let t = 0;
  for (const i of CASELLE_ARRIVO[lato]) { out[i] = 0; CODA[t++] = i; }
  for (let h = 0; h < t; h++) {
    const i = CODA[h], d = out[i] + 1;
    for (const p of PASSI[i]) if (p && out[p[0]] === 99 && aperto(muri, p)) { out[p[0]] = d; CODA[t++] = p[0]; }
  }
  return out;
}
// distanza dall'arrivo partendo da una casella (si ferma appena arriva)
const VISTO = new Uint8Array(L * L);
function distanza(muri, lato, da) {
  if (ARRIVO[lato](da)) return 0;
  VISTO.fill(0);
  const D = new Uint8Array(L * L);
  let t = 0;
  CODA[t++] = da; VISTO[da] = 1;
  for (let h = 0; h < t; h++) {
    const i = CODA[h];
    for (const p of PASSI[i]) {
      if (!p || VISTO[p[0]] || !aperto(muri, p)) continue;
      const k = p[0];
      D[k] = D[i] + 1;
      if (ARRIVO[lato](k)) return D[k];
      VISTO[k] = 1; CODA[t++] = k;
    }
  }
  return 99;
}
// caselle dove può andare la pedina di chi (con i salti)
function destinazioni(muri, pos, chi) {
  const occ = (i) => pos.some((x, k) => k !== chi && x === i);
  const da = pos[chi], out = [];
  PASSI[da].forEach((p, d) => {
    if (!aperto(muri, p)) return;
    const n = p[0];
    if (!occ(n)) { out.push(n); return; }
    const oltre = PASSI[n][d];
    if (aperto(muri, oltre) && !occ(oltre[0])) { out.push(oltre[0]); return; }
    // salto bloccato (muro, bordo o un'altra pedina): si va di lato
    for (const dl of d < 2 ? [2, 3] : [0, 1]) {
      const lat = PASSI[n][dl];
      if (aperto(muri, lat) && !occ(lat[0]) && lat[0] !== da && !out.includes(lat[0])) out.push(lat[0]);
    }
  });
  return out;
}
// si può mettere il muro w? (non sovrapposto e nessuno resta chiuso)
function muroValido(muri, w, pos, lati) {
  for (const k of CONFLITTI[w]) if (muri[k]) return false;
  muri[w] = 1;
  let ok = true;
  for (let k = 0; k < pos.length && ok; k++) if (distanza(muri, lati[k], pos[k]) >= 99) ok = false;
  muri[w] = 0;
  return ok;
}

class MuriPedine {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'quoridor';
    this.n = n === 4 ? 4 : 2;
    this.lati = this.n === 2 ? [0, 2] : [0, 1, 2, 3];
    this.pos = this.lati.map((l) => PARTENZA[l]);
    this.muri = new Array(128).fill(null); // posto di chi l'ha messo
    this.rimasti = new Array(this.n).fill(this.n === 2 ? 10 : 5);
    this.turno = primo % this.n;
    this.nMosse = 0;
    this.mosseDi = new Array(this.n).fill(0);
    this.ultima = null;
    this.bot = bot;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.cache = null;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  bitMuri() { return Uint8Array.from(this.muri, (x) => (x === null ? 0 : 1)); }
  distanzaDi(p, muri = this.bitMuri()) { return distanza(muri, this.lati[p], this.pos[p]); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    const muri = this.bitMuri();
    if (a.tipo === 'muovi') {
      const i = Number(a.cella);
      if (!Number.isInteger(i) || i < 0 || i >= L * L) return { errore: 'Casella non valida' };
      if (!destinazioni(muri, this.pos, p).includes(i)) return { errore: 'Non puoi andare lì: scegli una casella evidenziata' };
      this.ultima = { posto: p, tipo: 'muovi', da: this.pos[p], a: i };
      this.pos[p] = i;
      this.cache = null;
      if (ARRIVO[this.lati[p]](i)) return this.chiudi(p);
      return this.passa(p);
    }
    if (a.tipo === 'muro') {
      const o = a.o === 'v' || a.o === 1 ? 1 : a.o === 'h' || a.o === 0 ? 0 : -1;
      const r = Number(a.r), c = Number(a.c);
      if (o < 0 || !Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > 7 || c < 0 || c > 7) return { errore: 'Muro non valido' };
      if (this.rimasti[p] <= 0) return { errore: 'Hai finito i muri: puoi solo muovere la pedina' };
      const w = mw(o, r, c);
      if (CONFLITTI[w].some((k) => muri[k])) return { errore: 'Lì c\'è già un muro' };
      if (!muroValido(muri, w, this.pos, this.lati)) return { errore: 'Questo muro chiuderebbe del tutto la strada a qualcuno' };
      this.muri[w] = p;
      this.rimasti[p]--;
      this.ultima = { posto: p, tipo: 'muro', muro: w };
      this.cache = null;
      return this.passa(p);
    }
    return { errore: 'Mossa non valida' };
  }

  passa(p) {
    this.nMosse++;
    this.mosseDi[p]++;
    if (this.mosseDi.every((x) => x >= MAX_MOSSE)) {
      // troppo lunga: vince chi è più vicino all'arrivo
      const muri = this.bitMuri();
      const d = this.pos.map((_, k) => this.distanzaDi(k, muri));
      const min = Math.min(...d);
      const chi = d.map((x, k) => (x === min ? k : -1)).filter((k) => k >= 0);
      return this.chiudi(chi.length === 1 ? chi[0] : null, true);
    }
    this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  chiudi(vince, perTempo = false) {
    this.finita = true;
    this.turno = null;
    this.cache = null;
    if (vince === null) this.annuncia(null, 'Partita troppo lunga: pareggio', '', true);
    else if (perTempo) this.annuncia(vince, 'vince: è il più vicino all\'arrivo', 'hai vinto: sei il più vicino all\'arrivo!', true);
    else this.annuncia(vince, 'arriva dall\'altra parte e vince!', 'sei arrivato dall\'altra parte: hai vinto!', true);
    const muri = this.bitMuri();
    this.risultato = {
      fazioni: this.pos.map((_, k) => ({ posti: [k], punti: k === vince ? 1 : 0, distanza: this.distanzaDi(k, muri) })),
      etichetta: 'punti', pareggio: vince === null, vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  // muri che chi è di turno può mettere (calcolati una volta per mossa)
  calcola() {
    if (this.cache) return this.cache;
    const muri = this.bitMuri();
    const t = this.turno;
    const c = { distanze: this.pos.map((_, k) => this.distanzaDi(k, muri)), mosse: [], muriOk: [] };
    if (!this.finita && t != null) {
      c.mosse = destinazioni(muri, this.pos, t);
      if (this.rimasti[t] > 0) for (let w = 0; w < 128; w++) if (muroValido(muri, w, this.pos, this.lati)) c.muriOk.push(w);
    }
    this.cache = c;
    return c;
  }

  vista(p) {
    const c = this.calcola();
    const muri = [];
    this.muri.forEach((x, w) => { if (x !== null) muri.push([w, x]); });
    return {
      gioco: this.id, n: this.n, lati: this.lati, pos: this.pos, muri, rimasti: this.rimasti, distanze: c.distanze,
      mosse: c.mosse, muriOk: c.muriOk, ultima: this.ultima, nMosse: this.nMosse,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
const VINCE = 100000;
const casuale = (a) => a[Math.floor(Math.random() * a.length)];
const daMuro = (w) => ({ tipo: 'muro', o: w >> 6 ? 'v' : 'h', r: (w >> 3) & 7, c: w & 7 });

// una strada più corta dall'arrivo: le caselle dalla pedina all'arrivo, seguendo le distanze
function strada(muri, lato, da) {
  const D = distanze(muri, lato);
  const out = [da];
  let i = da;
  while (D[i] > 0 && D[i] < 99) {
    const p = PASSI[i].find((x) => x && aperto(muri, x) && D[x[0]] === D[i] - 1);
    if (!p) break;
    i = p[0]; out.push(i);
  }
  return out;
}
// muri che tagliano la strada più corta di un giocatore (candidati per rallentarlo)
function muriSullaStrada(muri, lato, da, quanti = 99) {
  const s = strada(muri, lato, da);
  const out = new Set();
  for (let k = 0; k + 1 < s.length && k < quanti; k++) {
    const a = s[k], b = s[k + 1];
    const d = PASSI[a].findIndex((x) => x && x[0] === b);
    const p = PASSI[a][d];
    if (p[1] >= 0) out.add(p[1]);
    if (p[2] >= 0) out.add(p[2]);
  }
  return [...out];
}
const libero = (muri, w) => { for (const k of CONFLITTI[w]) if (muri[k]) return false; return true; };

// Ricerca in due (negamax alfa-beta): valuta = differenza delle distanze + muri rimasti
class Motore {
  constructor(g) {
    this.muri = g.bitMuri();
    this.pos = g.pos.slice();
    this.lati = g.lati.slice();
    this.rimasti = g.rimasti.slice();
    this.n = g.n;
    this.nodi = 0; this.stop = false; this.fino = Infinity;
  }
  valuta(chi) {
    const avv = 1 - chi;
    const dm = distanza(this.muri, this.lati[chi], this.pos[chi]);
    const da = distanza(this.muri, this.lati[avv], this.pos[avv]);
    let v = (da - dm) * 100 + 50; // chi deve muovere ha mezzo passo di vantaggio
    v += (Math.sqrt(this.rimasti[chi]) - Math.sqrt(this.rimasti[avv])) * 70;
    // corsa senza muri: se l'avversario non ne ha più e io arrivo prima, è fatta (quasi sempre)
    if (this.rimasti[avv] === 0 && dm <= da) v += 2000;
    if (this.rimasti[chi] === 0 && da < dm) v -= 2000;
    return v;
  }
  // mosse di chi: pedina + muri utili (che allungano la strada all'avversario più che a me)
  mosse(chi, quantiMuri) {
    const out = destinazioni(this.muri, this.pos, chi).map((i) => [0, i]);
    // la pedina: prima i passi che accorciano
    const D = distanze(this.muri, this.lati[chi]);
    out.sort((a, b) => D[a[1]] - D[b[1]]);
    if (this.rimasti[chi] > 0 && quantiMuri > 0) {
      const avv = 1 - chi;
      const dA = distanza(this.muri, this.lati[avv], this.pos[avv]);
      const dM = distanza(this.muri, this.lati[chi], this.pos[chi]);
      const cand = [];
      for (const w of muriSullaStrada(this.muri, this.lati[avv], this.pos[avv])) {
        if (!libero(this.muri, w)) continue;
        this.muri[w] = 1;
        const nA = distanza(this.muri, this.lati[avv], this.pos[avv]);
        const nM = distanza(this.muri, this.lati[chi], this.pos[chi]);
        this.muri[w] = 0;
        if (nA >= 99 || nM >= 99) continue;
        const guadagno = (nA - dA) - (nM - dM);
        if (nA > dA) cand.push([guadagno, w]);
      }
      cand.sort((a, b) => b[0] - a[0]);
      for (const [, w] of cand.slice(0, quantiMuri)) out.push([1, w]);
    }
    return out;
  }
  fai(m, chi) {
    if (m[0] === 0) { const da = this.pos[chi]; this.pos[chi] = m[1]; return da; }
    this.muri[m[1]] = 1; this.rimasti[chi]--; return -1;
  }
  disfai(m, chi, da) {
    if (m[0] === 0) this.pos[chi] = da;
    else { this.muri[m[1]] = 0; this.rimasti[chi]++; }
  }
  negamax(chi, prof, alfa, beta, ply) {
    if ((++this.nodi & 63) === 0 && Date.now() > this.fino) this.stop = true;
    if (this.stop) return 0;
    if (prof <= 0) return this.valuta(chi);
    const mosse = this.mosse(chi, prof >= 2 ? 6 : 4);
    let best = -Infinity;
    for (const m of mosse) {
      const da = this.fai(m, chi);
      let v;
      if (m[0] === 0 && ARRIVO[this.lati[chi]](m[1])) v = VINCE - ply;
      else v = -this.negamax(1 - chi, prof - 1, -beta, -alfa, ply + 1);
      this.disfai(m, chi, da);
      if (this.stop) return 0;
      if (v > best) best = v;
      if (best > alfa) alfa = best;
      if (alfa >= beta) break;
    }
    return best;
  }
}

function cercaDue(g, chi, profMax, ms) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 8);
  const m = new Motore(g);
  m.fino = Date.now() + ms;
  let lista = m.mosse(chi, 14).map((x) => ({ m: x, v: 0 }));
  // arrivo subito: si vince
  const vinci = lista.find((x) => x.m[0] === 0 && ARRIVO[m.lati[chi]](x.m[1]));
  if (vinci) return [vinci];
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    let alfa = -Infinity;
    for (const { m: x } of lista) {
      const da = m.fai(x, chi);
      const v = -m.negamax(1 - chi, prof - 1, -Infinity, -alfa + 1, 1);
      m.disfai(x, chi, da);
      if (m.stop) break;
      giro.push({ m: x, v });
      if (v > alfa) alfa = v;
    }
    if (m.stop) {
      if (giro.length > 1) {
        const top = giro.slice(1).reduce((a, b) => (b.v > a.v ? b : a));
        if (top.v > giro[0].v) lista = [top, ...lista.filter((x) => x.m !== top.m)];
      }
      break;
    }
    lista = giro.sort((a, b) => b.v - a.v || a.m[0] - b.m[0]);
    cercaDue.prof = prof;
    if (Math.abs(lista[0].v) > VINCE / 2) break;
  }
  return lista;
}

// in quattro: punteggio di un giocatore = quanto è avanti rispetto all'avversario più pericoloso
function valutaMolti(muri, pos, lati, rimasti, chi, turnoDopo, n) {
  const d = pos.map((x, k) => distanza(muri, lati[k], x));
  // chi muove prima ha un passo di vantaggio: si conta quante mosse servono a ognuno contando l'ordine
  const ordine = (k) => (k - turnoDopo + n) % n;
  const arrivo = d.map((x, k) => x * n + ordine(k));
  let peggio = Infinity;
  for (let k = 0; k < n; k++) if (k !== chi) peggio = Math.min(peggio, arrivo[k]);
  return (peggio - arrivo[chi]) * 10 + rimasti[chi] * 6 - d[chi] * 2;
}
function cercaMolti(g, chi, ms, profondo) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 8);
  const fino = Date.now() + ms;
  const muri = g.bitMuri(), pos = g.pos.slice(), lati = g.lati, rimasti = g.rimasti.slice(), n = g.n;
  const prossimo = (chi + 1) % n;
  const mosse = destinazioni(muri, pos, chi).map((i) => [0, i]);
  if (rimasti[chi] > 0) {
    const ws = new Set();
    for (let k = 0; k < n; k++) if (k !== chi) for (const w of muriSullaStrada(muri, lati[k], pos[k])) if (libero(muri, w)) ws.add(w);
    for (const w of ws) mosse.push([1, w]);
  }
  const prova = (m, f) => {
    let da = -1;
    if (m[0] === 0) { da = pos[chi]; pos[chi] = m[1]; } else { muri[m[1]] = 1; rimasti[chi]--; }
    const v = f();
    if (m[0] === 0) pos[chi] = da; else { muri[m[1]] = 0; rimasti[chi]++; }
    return v;
  };
  const lista = [];
  for (const m of mosse) {
    if (m[0] === 1) {
      // il muro deve lasciare una strada a tutti
      muri[m[1]] = 1;
      const chiude = pos.some((x, k) => distanza(muri, lati[k], x) >= 99);
      muri[m[1]] = 0;
      if (chiude) continue;
    }
    if (m[0] === 0 && ARRIVO[lati[chi]](m[1])) return [{ m, v: VINCE }];
    const v = prova(m, () => valutaMolti(muri, pos, lati, rimasti, chi, prossimo, n));
    lista.push({ m, v });
  }
  lista.sort((a, b) => b.v - a.v);
  if (!profondo) return lista;
  // le mosse migliori si controllano contro la risposta migliore dell'avversario più vicino all'arrivo
  for (const x of lista.slice(0, 10)) {
    if (Date.now() > fino) break;
    x.v2 = prova(x.m, () => {
      const d = pos.map((p, k) => distanza(muri, lati[k], p));
      let nemico = -1;
      for (let k = 0; k < n; k++) if (k !== chi && (nemico < 0 || d[k] < d[nemico])) nemico = k;
      if (rimasti[nemico] <= 0) return valutaMolti(muri, pos, lati, rimasti, chi, prossimo, n);
      let peggio = valutaMolti(muri, pos, lati, rimasti, chi, prossimo, n);
      for (const w of muriSullaStrada(muri, lati[chi], pos[chi])) {
        if (!libero(muri, w)) continue;
        muri[w] = 1; rimasti[nemico]--;
        if (!pos.some((p, k) => distanza(muri, lati[k], p) >= 99)) peggio = Math.min(peggio, valutaMolti(muri, pos, lati, rimasti, chi, prossimo, n));
        muri[w] = 0; rimasti[nemico]++;
      }
      return peggio;
    });
  }
  lista.sort((a, b) => (b.v2 ?? -Infinity) - (a.v2 ?? -Infinity) || b.v - a.v);
  return lista;
}

const azioneDa = (m) => (m[0] === 0 ? { tipo: 'muovi', cella: m[1] } : daMuro(m[1]));

function bot(g, p, livello) {
  const muri = g.bitMuri();
  const dest = destinazioni(muri, g.pos, p);
  const D = distanze(muri, g.lati[p]);
  const passoAvanti = () => {
    const migliori = dest.filter((i) => D[i] === Math.min(...dest.map((k) => D[k])));
    return { tipo: 'muovi', cella: casuale(migliori.length ? migliori : dest) };
  };
  if (!dest.length) { // circondato dalle pedine: resta solo un muro
    for (let w = 0; w < 128; w++) if (g.rimasti[p] > 0 && muroValido(muri, w, g.pos, g.lati)) return daMuro(w);
    return { tipo: 'muovi', cella: g.pos[p] };
  }
  if (livello === 'facile') {
    // va quasi sempre avanti per la strada più corta; ogni tanto mette un muro a caso davanti a qualcuno
    if (g.rimasti[p] > 0 && Math.random() < 0.15) {
      const altri = g.pos.map((_, k) => k).filter((k) => k !== p);
      const k = casuale(altri);
      const ws = muriSullaStrada(muri, g.lati[k], g.pos[k], 3).filter((w) => muroValido(muri, w, g.pos, g.lati));
      if (ws.length) return daMuro(casuale(ws));
    }
    if (Math.random() < 0.2) return { tipo: 'muovi', cella: casuale(dest) };
    return passoAvanti();
  }
  if (g.n === 2) {
    if (livello === 'medio') {
      // guarda solo una mossa avanti (con la risposta dell'avversario) e ogni tanto sbaglia
      const lista = cercaDue(g, p, 2, 60);
      if (lista.length > 1 && Math.random() < 0.2) return azioneDa(lista[1].m);
      return azioneDa(lista[0].m);
    }
    const lista = cercaDue(g, p, 12, 250);
    return azioneDa(lista[0].m);
  }
  const lista = cercaMolti(g, p, 250, livello === 'difficile');
  if (livello === 'medio' && lista.length > 1 && Math.random() < 0.25) return azioneDa(lista[1].m);
  return azioneDa(lista[0].m);
}

module.exports = {
  meta: {
    id: 'quoridor',
    nome: 'Muri e pedine',
    tipo: 'tabellone',
    giocatori: [2, 4],
    descrizione: 'Porta la tua pedina dall\'altra parte della tavola 9×9, mettendo muri per allungare la strada agli altri.',
    alias: ['quoridor', 'muri', 'labirinto', 'pedine e muri', 'corridoio'],
    opzioni: [],
    regole: [
      'Si gioca su una tavola di 9×9 caselle, in 2 o in 4. Ognuno parte dal centro del suo lato e deve arrivare per primo in una casella qualsiasi del lato opposto.',
      'In 2 ognuno ha 10 muri, in 4 ne ha 5. Un muro è lungo due caselle e si mette nelle scanalature tra le caselle, in orizzontale o in verticale.',
      'A turno si fa una cosa sola: spostare la pedina di una casella (avanti, indietro o di lato, mai in diagonale e mai attraverso un muro) oppure mettere un muro.',
      'I muri non possono sovrapporsi né incrociarsi, e non si può mai chiudere del tutto la strada a qualcuno: ogni pedina deve sempre avere almeno un percorso per arrivare (il gioco lo controlla da solo).',
      'Se la tua pedina è davanti a un\'altra, puoi saltarla. Se dietro c\'è un muro, il bordo o un\'altra pedina, puoi invece andare in diagonale, a destra o a sinistra della pedina.',
      'Vince chi arriva per primo dall\'altra parte. Dopo 150 mosse a testa vince chi è più vicino all\'arrivo.',
      'Come si gioca qui: clicca una delle caselle evidenziate per muovere. Per un muro passa col mouse sulle scanalature: vedi l\'anteprima (verde se si può, rossa se no) e clicca per metterlo. Sul telefono il primo tocco mostra l\'anteprima e il secondo la conferma. Il numero sulle pedine è quante caselle mancano all\'arrivo.',
      'Il computer facile va quasi sempre avanti e mette pochi muri a caso; il medio sceglie la mossa migliore guardando la risposta dell\'avversario; il difficile calcola più mosse in avanti (alfa-beta sulle distanze più corte) e mette i muri dove allungano di più la strada agli altri.',
    ],
  },
  crea: (o) => new MuriPedine(o),
  bot,
  _test: { destinazioni, muroValido, distanza, distanze, mw, CONFLITTI, PARTENZA, cercaDue, MAX_MOSSE },
};
