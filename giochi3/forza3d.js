// FORZA 4 IN 3D: una base con 16 pioli (4×4); in ogni piolo si infilano fino a 4 palline, che scendono in fondo. A
// turno si mette una pallina in un piolo non pieno. Vince chi fa 4 palline in fila in qualsiasi direzione dello spazio:
// in orizzontale su un piano, in verticale su un piolo, in diagonale su un piano, in verticale-diagonale, e sulle
// quattro diagonali lunghe del cubo (76 linee in tutto). Con il cubo pieno senza file è pareggio.
const ANN = require('../giochi/annulla');

const L = 4, N = 64;
const idx = (x, y, z) => z * 16 + y * 4 + x;
// le 76 linee
const LINEE = [];
{
  const visti = new Set();
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dy && !dz) continue;
    for (let x = 0; x < L; x++) for (let y = 0; y < L; y++) for (let z = 0; z < L; z++) {
      const ex = x + 3 * dx, ey = y + 3 * dy, ez = z + 3 * dz;
      if (ex < 0 || ey < 0 || ez < 0 || ex >= L || ey >= L || ez >= L) continue;
      const linea = [0, 1, 2, 3].map((k) => idx(x + k * dx, y + k * dy, z + k * dz));
      const k = linea.slice().sort((a, b) => a - b).join(',');
      if (!visti.has(k)) { visti.add(k); LINEE.push(linea); }
    }
  }
}
const LINEE_DI = Array.from({ length: N }, (_, i) => LINEE.filter((l) => l.includes(i)));

function vincente(celle, i) {
  const chi = celle[i];
  for (const l of LINEE_DI[i]) if (l.every((j) => celle[j] === chi)) return l;
  return null;
}

class Forza3D {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'forza3d';
    this.n = n;
    this.primo = primo;
    this.celle = new Array(N).fill(null);
    this.altezze = new Array(16).fill(0);
    this.turno = primo;
    this.nMosse = 0; this.ultima = null; this.fila = null;
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    ANN.prepara(this, bot, ['celle', 'altezze', 'turno', 'nMosse', 'ultima']);
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'metti') return { errore: 'Mossa non valida' };
    const c = Number(a.piolo);
    if (!Number.isInteger(c) || c < 0 || c >= 16) return { errore: 'Piolo non valido' };
    if (this.altezze[c] >= L) return { errore: 'Il piolo è pieno' };
    ANN.salva(this, p);
    const i = this.altezze[c] * 16 + c;
    this.celle[i] = p; this.altezze[c]++; this.ultima = i; this.nMosse++;
    const f = vincente(this.celle, i);
    if (f) { this.fila = f; return this.chiudi(p); }
    if (this.nMosse === N) return this.chiudi(null);
    this.turno = 1 - p;
    return { ok: true };
  }
  chiudi(v) {
    this.finita = true; this.turno = null;
    if (v === null) this.annuncia(null, 'Cubo pieno: pareggio', '', true);
    else this.annuncia(v, 'fa quattro in fila!', 'quattro in fila: hai vinto!', true);
    this.risultato = { fazioni: [0, 1].map((x) => ({ posti: [x], punti: x === v ? 1 : 0 })), etichetta: 'vittorie', pareggio: v === null, vincitori: v === null ? [] : [v] };
    return { ok: true };
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, celle: this.celle, altezze: this.altezze, primo: this.primo, ultima: this.ultima, nMosse: this.nMosse, fila: this.fila,
      puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// valutazione: per ogni linea non bloccata, quante palline ci sono (1, 2 o 3) di uno solo dei due
const PESO = [0, 1, 6, 40];
const VINCE = 1e6;
class Motore {
  constructor(celle, altezze) { this.b = Int8Array.from(celle, (x) => (x === null ? -1 : x)); this.h = Int8Array.from(altezze); this.nodi = 0; this.stop = false; this.fino = Infinity; }
  valuta(chi) {
    let v = 0;
    for (const l of LINEE) {
      let m = 0, s = 0;
      for (const j of l) { const x = this.b[j]; if (x === chi) m++; else if (x !== -1) s++; }
      if (m && !s) v += PESO[m]; else if (s && !m) v -= PESO[s] * 1.1;
    }
    return v;
  }
  mosse() {
    // prima i pioli che stanno su più linee (angoli e centro), poi gli altri
    const out = [];
    for (const c of ORDINE) if (this.h[c] < L) out.push(c);
    return out;
  }
  negamax(chi, prof, alfa, beta) {
    // nei test ci si ferma dopo un numero fisso di posizioni (così le partite tra computer vengono sempre uguali)
    if ((++this.nodi & 255) === 0 && (process.env.TEST_VELOCE ? this.nodi > 25000 : Date.now() > this.fino)) this.stop = true;
    if (this.stop) return 0;
    const mosse = this.mosse();
    if (!mosse.length) return 0;
    // vittoria immediata
    for (const c of mosse) { const i = this.h[c] * 16 + c; this.b[i] = chi; const w = vincente(this.b, i); this.b[i] = -1; if (w) return VINCE + prof; }
    if (prof <= 0) return this.valuta(chi);
    let best = -Infinity;
    for (const c of mosse) {
      const i = this.h[c] * 16 + c;
      this.b[i] = chi; this.h[c]++;
      const v = -this.negamax(1 - chi, prof - 1, -beta, -alfa);
      this.h[c]--; this.b[i] = -1;
      if (this.stop) return 0;
      if (v > best) best = v;
      if (best > alfa) alfa = best;
      if (alfa >= beta) break;
    }
    return best;
  }
}
// pioli in ordine di importanza (quante linee passano dalle loro caselle)
const ORDINE = Array.from({ length: 16 }, (_, c) => c).sort((a, b) => [0, 1, 2, 3].reduce((s, z) => s + LINEE_DI[z * 16 + b].length - LINEE_DI[z * 16 + a].length, 0));

function scegli(g, p, profMax, ms, esatti = false) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 25);
  const m = new Motore(g.celle, g.altezze);
  m.fino = Date.now() + ms;
  let lista = m.mosse().map((c) => ({ c, v: 0 }));
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    let alfa = -Infinity;
    for (const { c } of lista) {
      const i = m.h[c] * 16 + c;
      m.b[i] = p; m.h[c]++;
      const w = vincente(m.b, i);
      const v = w ? VINCE + 100 : -m.negamax(1 - p, prof - 1, -Infinity, esatti ? Infinity : -alfa); // esatti: valori veri per tutte
      m.h[c]--; m.b[i] = -1;
      if (m.stop) break;
      giro.push({ c, v });
      if (v > alfa) alfa = v;
    }
    if (m.stop && giro.length < lista.length) break;
    lista = giro.sort((a, b) => b.v - a.v);
  }
  return lista;
}

function bot(g, p, livello) {
  const metti = (piolo) => ({ tipo: 'metti', piolo });
  const liberi = Array.from({ length: 16 }, (_, c) => c).filter((c) => g.altezze[c] < L);
  // vincere subito o bloccare subito (anche il facile, di solito)
  const prova = (chi) => liberi.find((c) => { const i = g.altezze[c] * 16 + c; g.celle[i] = chi; const w = vincente(g.celle, i); g.celle[i] = null; return w; });
  const vinco = prova(p), blocco = prova(1 - p);
  if (vinco != null && (livello !== 'facile' || Math.random() < 0.9)) return metti(vinco);
  if (blocco != null && (livello !== 'facile' || Math.random() < 0.6)) return metti(blocco);
  if (livello === 'facile') return metti(Math.random() < 0.4 ? ORDINE.find((c) => g.altezze[c] < L) : liberi[Math.floor(Math.random() * liberi.length)]);
  if (livello === 'medio') {
    const l = scegli(g, p, 2, 200, true);
    const buone = l.filter((x) => x.v >= l[0].v - 3);
    return metti(buone[Math.floor(Math.random() * buone.length)].c);
  }
  return metti(scegli(g, p, 7, 900)[0].c);
}

module.exports = {
  meta: {
    id: 'forza3d',
    nome: 'Forza 4 in 3D',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Sedici pioli e palline che scendono: fai quattro in fila in qualsiasi direzione dello spazio (76 file possibili).',
    alias: ['forza 4 in 3d', 'forza 4 3d', 'forza quattro 3d', 'cubo', 'quattro in fila 3d', 'pioli', 'score four'],
    opzioni: [],
    regole: [
      'Si gioca in due su una base con 16 pioli (4 file da 4). In ogni piolo si infilano fino a 4 palline, che scendono in fondo: si forma un cubo 4×4×4.',
      'A turno si mette una pallina del proprio colore in un piolo non pieno (inizia il rosso; alla rivincita l\'altro).',
      'Vince chi fa per primo 4 palline in fila in QUALSIASI direzione: su un piano (in orizzontale o in diagonale), lungo un piolo, in diagonale tra un piano e l\'altro, o sulle quattro grandi diagonali del cubo. In tutto le file possibili sono 76.',
      'Se il cubo si riempie senza file è pareggio.',
      'Comandi: tocca un piolo nella vista dall\'alto (o nella base disegnata). Sotto ci sono anche i 4 piani visti dall\'alto, per controllare bene le diagonali.',
      'Consiglio: gli 8 angoli e gli 8 centri del cubo stanno su 7 file ciascuno, le altre caselle solo su 4: valgono molto di più.',
      'Il computer facile gioca quasi a caso (ma vede le file da chiudere); il medio guarda due mosse avanti; il difficile ragiona fino a 6-7 mosse con le file aperte.',
      'Contro il computer c\'è "↶ Annulla mossa".',
    ],
  },
  crea: (o) => new Forza3D(o),
  bot,
  _test: { LINEE, LINEE_DI, vincente, scegli, ORDINE },
};
