// DAMA INTERNAZIONALE (10×10): 20 pedine a testa sulle caselle scure. Le pedine si muovono in avanti in diagonale di
// una casella, ma MANGIANO anche all'indietro, saltando una pedina avversaria vicina. Mangiare è obbligatorio, e tra le
// prese possibili bisogna fare quella che mangia PIÙ pezzi (le pedine e le dame contano uguale). Chi arriva in fondo
// (e finisce lì la mossa) diventa dama: la dama "vola", si muove di quante caselle vuole in diagonale e mangia anche
// da lontano, atterrando in qualsiasi casella libera dopo il pezzo mangiato. I pezzi mangiati si tolgono alla fine
// della presa e non si possono saltare due volte. Vince chi mangia o blocca tutti i pezzi dell'avversario.
// Pareggio: 25 mosse a testa solo con le dame senza prese, o la stessa posizione per la terza volta.
const ANN = require('../giochi/annulla');

const L = 10;
const VUOTA = 0;
// pezzi: 1 pedina del giocatore 0 (bianco, parte dal basso), 2 sua dama, 3 pedina del giocatore 1 (nero), 4 sua dama
const di = (v) => (v === 1 || v === 2 ? 0 : v === 3 || v === 4 ? 1 : -1);
const dama = (v) => v === 2 || v === 4;
const DIR = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const dentro = (r, c) => r >= 0 && c >= 0 && r < L && c < L;
const nome = (i) => `${'abcdefghij'[i % L]}${L - Math.floor(i / L)}`;

function iniziale() {
  const b = new Array(L * L).fill(VUOTA);
  for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) if ((r + c) % 2 === 1) { if (r < 4) b[r * L + c] = 3; else if (r > 5) b[r * L + c] = 1; }
  return b;
}

// tutte le mosse legali di chi: [{ da, a, via: [caselle toccate], prese: [caselle dei pezzi mangiati] }]
function mosseDi(b, chi) {
  const prese = [];
  let max = 0;
  for (let i = 0; i < L * L; i++) {
    if (di(b[i]) !== chi) continue;
    const r0 = Math.floor(i / L), c0 = i % L, isDama = dama(b[i]);
    // ricerca in profondità delle sequenze di presa (il pezzo che salta è tolto dalla sua casella di partenza)
    const v0 = b[i]; b[i] = VUOTA;
    const rec = (r, c, via, mangiati) => {
      let continua = false;
      for (const [dr, dc] of DIR) {
        if (isDama) {
          let rr = r + dr, cc = c + dc;
          while (dentro(rr, cc) && b[rr * L + cc] === VUOTA) { rr += dr; cc += dc; }
          if (!dentro(rr, cc)) continue;
          const j = rr * L + cc;
          if (di(b[j]) !== 1 - chi || mangiati.includes(j)) continue;
          let ar = rr + dr, ac = cc + dc;
          while (dentro(ar, ac) && b[ar * L + ac] === VUOTA) {
            continua = true;
            rec(ar, ac, [...via, ar * L + ac], [...mangiati, j]);
            ar += dr; ac += dc;
          }
        } else {
          const rr = r + dr, cc = c + dc, ar = r + 2 * dr, ac = c + 2 * dc;
          if (!dentro(ar, ac)) continue;
          const j = rr * L + cc;
          if (di(b[j]) !== 1 - chi || mangiati.includes(j) || b[ar * L + ac] !== VUOTA) continue;
          continua = true;
          rec(ar, ac, [...via, ar * L + ac], [...mangiati, j]);
        }
      }
      if (!continua && mangiati.length) {
        if (mangiati.length > max) { max = mangiati.length; prese.length = 0; }
        if (mangiati.length === max) prese.push({ da: i, a: via[via.length - 1], via, prese: mangiati });
      }
    };
    rec(r0, c0, [i], []);
    b[i] = v0;
  }
  if (prese.length) return prese;
  const out = [];
  const avanti = chi === 0 ? -1 : 1;
  for (let i = 0; i < L * L; i++) {
    if (di(b[i]) !== chi) continue;
    const r = Math.floor(i / L), c = i % L;
    if (dama(b[i])) {
      for (const [dr, dc] of DIR) for (let rr = r + dr, cc = c + dc; dentro(rr, cc) && b[rr * L + cc] === VUOTA; rr += dr, cc += dc) out.push({ da: i, a: rr * L + cc, via: [i, rr * L + cc], prese: [] });
    } else {
      for (const dc of [-1, 1]) { const rr = r + avanti, cc = c + dc; if (dentro(rr, cc) && b[rr * L + cc] === VUOTA) out.push({ da: i, a: rr * L + cc, via: [i, rr * L + cc], prese: [] }); }
    }
  }
  return out;
}
// esegue una mossa su b (cambia b); restituisce se è diventata dama
function esegui(b, m) {
  const v = b[m.da];
  b[m.da] = VUOTA;
  for (const j of m.prese) b[j] = VUOTA;
  const r = Math.floor(m.a / L);
  let nuovo = v;
  if (v === 1 && r === 0) nuovo = 2;
  if (v === 3 && r === L - 1) nuovo = 4;
  b[m.a] = nuovo;
  return nuovo !== v;
}
const chiaveMossa = (m) => m.via.join('-') + (m.prese.length ? `x${m.prese.slice().sort((a, b) => a - b).join('.')}` : '');

class DamaInt {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'damaint';
    this.n = n;
    this.bianco = primo; // il bianco inizia e parte dal basso (il posto "0" del motore)
    this.b = iniziale();
    this.turno = primo;
    this.nMosse = 0; this.ultima = null; this.senzaPrese = 0; this.posizioni = {};
    this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    ANN.prepara(this, bot, ['b', 'turno', 'nMosse', 'ultima', 'senzaPrese', 'posizioni']);
    this.ricorda();
  }
  colore(p) { return p === this.bianco ? 0 : 1; } // 0 = bianco (pezzi 1/2), 1 = nero (pezzi 3/4)
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  ricorda() { const k = `${this.b.join('')}${this.turno}`; this.posizioni[k] = (this.posizioni[k] || 0) + 1; return this.posizioni[k]; }
  mosse(p) { return mosseDi(this.b, this.colore(p)); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (a && a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'muovi' || typeof a.mossa !== 'string') return { errore: 'Mossa non valida' };
    const lecite = this.mosse(p);
    const m = lecite.find((x) => chiaveMossa(x) === a.mossa);
    if (!m) {
      if (lecite.length && lecite[0].prese.length) return { errore: `Devi mangiare, e prendere più pezzi possibile (${lecite[0].prese.length})` };
      return { errore: 'Mossa non valida' };
    }
    ANN.salva(this, p);
    const eraPedina = !dama(this.b[m.da]);
    const promossa = esegui(this.b, m);
    this.ultima = m; this.nMosse++;
    this.senzaPrese = m.prese.length || eraPedina ? 0 : this.senzaPrese + 1;
    if (promossa) this.annuncia(p, 'fa dama! 👑', 'hai fatto dama! 👑');
    else if (m.prese.length >= 3) this.annuncia(p, `mangia ${m.prese.length} pezzi in una volta!`, `mangi ${m.prese.length} pezzi!`, true);
    const altro = 1 - p;
    this.turno = altro;
    if (!this.mosse(altro).length) return this.chiudi(p, mosseDi(this.b, this.colore(altro)).length === 0 && !this.b.some((v) => di(v) === this.colore(altro)) ? 'ha mangiato tutti i pezzi' : 'ha bloccato l\'avversario');
    if (this.senzaPrese >= 50) return this.chiudi(null, '25 mosse a testa con le dame senza prese');
    if (this.ricorda() >= 3) return this.chiudi(null, 'la stessa posizione per la terza volta');
    return { ok: true };
  }
  chiudi(v, perche) {
    this.finita = true; this.turno = null;
    if (v === null) this.annuncia(null, `Pareggio: ${perche}`, '', true);
    else this.annuncia(v, `vince: ${perche}!`, `hai vinto: ${perche}!`, true);
    const pezzi = (p) => this.b.filter((x) => di(x) === this.colore(p)).length;
    this.risultato = { fazioni: [0, 1].map((x) => ({ posti: [x], punti: pezzi(x) })), etichetta: 'pezzi', pareggio: v === null, vincitori: v === null ? [] : [v] };
    return { ok: true };
  }
  vista(p) {
    const mio = this.turno === p && !this.finita;
    return {
      gioco: this.id, n: this.n, b: this.b, bianco: this.bianco, ultima: this.ultima, nMosse: this.nMosse,
      mosse: mio ? this.mosse(p).map((m) => ({ ...m, k: chiaveMossa(m) })) : [],
      pezzi: [0, 1].map((x) => ({ pedine: this.b.filter((v) => v === (this.colore(x) ? 3 : 1)).length, dame: this.b.filter((v) => v === (this.colore(x) ? 4 : 2)).length })),
      puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// valutazione dal punto di vista del colore col: materiale (dama = 3 pedine), avanzamento, centro, ultima fila difesa
function valuta(b, col) {
  let v = 0;
  for (let i = 0; i < L * L; i++) {
    const x = b[i]; if (!x) continue;
    const mio = di(x) === col ? 1 : -1, r = Math.floor(i / L), c = i % L;
    if (dama(x)) { v += mio * 320; continue; }
    const avanz = di(x) === 0 ? L - 1 - r : r;
    let s = 100 + avanz * 3;
    if (c >= 3 && c <= 6 && r >= 3 && r <= 6) s += 6;
    if (avanz === 0) s += 4; // difende la base (la dama avversaria)
    v += mio * s;
  }
  return v;
}
const VINCE = 1e6;
function negamax(b, col, prof, alfa, beta, ctx) {
  // nei test ci si ferma dopo un numero fisso di posizioni (così le partite tra computer vengono sempre uguali)
  if ((++ctx.nodi & 255) === 0 && (process.env.TEST_VELOCE ? ctx.nodi > 8000 : Date.now() > ctx.fino)) ctx.stop = true;
  if (ctx.stop) return 0;
  const mosse = mosseDi(b, col);
  if (!mosse.length) return -VINCE - prof;
  // le prese non contano come profondità (si va avanti finché la posizione è tranquilla)
  if (prof <= 0 && !mosse[0].prese.length) return valuta(b, col);
  if (prof <= -6) return valuta(b, col);
  mosse.sort((x, y) => y.prese.length - x.prese.length);
  let best = -Infinity;
  for (const m of mosse) {
    const copia = b.slice();
    esegui(copia, m);
    const v = -negamax(copia, 1 - col, prof - 1, -beta, -alfa, ctx);
    if (ctx.stop) return 0;
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  return best;
}
function scegli(g, p, profMax, ms, esatti = false) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 40);
  const col = g.colore(p);
  const ctx = { nodi: 0, stop: false, fino: Date.now() + ms };
  let lista = mosseDi(g.b, col).map((m) => ({ m, v: 0 }));
  if (lista.length === 1) return lista;
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    let alfa = -Infinity;
    for (const { m } of lista) {
      const copia = g.b.slice(); esegui(copia, m);
      const v = -negamax(copia, 1 - col, prof - 1, -Infinity, esatti ? Infinity : -alfa, ctx); // esatti: valori veri per tutte
      if (ctx.stop) break;
      giro.push({ m, v });
      if (v > alfa) alfa = v;
    }
    if (ctx.stop) break;
    lista = giro.sort((a, b) => b.v - a.v);
  }
  return lista;
}
function bot(g, p, livello) {
  const muovi = (m) => ({ tipo: 'muovi', mossa: chiaveMossa(m) });
  const lecite = g.mosse(p);
  if (livello === 'facile') {
    if (Math.random() < 0.6) return muovi(lecite[Math.floor(Math.random() * lecite.length)]);
    return muovi(scegli(g, p, 1, 100)[0].m);
  }
  if (livello === 'medio') {
    const l = scegli(g, p, 2, 300, true);
    const buone = l.filter((x) => x.v >= l[0].v - 15);
    return muovi(buone[Math.floor(Math.random() * buone.length)].m);
  }
  const l = scegli(g, p, 8, 1200);
  return muovi(l[0].m);
}

module.exports = {
  meta: {
    id: 'damaint',
    nome: 'Dama internazionale',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'La dama 10×10 dei tornei: 20 pedine a testa, si mangia anche all\'indietro, presa più lunga obbligatoria, dame che volano.',
    alias: ['dama internazionale', 'dama 10x10', 'dama polacca', 'draughts', 'dama francese', 'dama a 100 caselle'],
    opzioni: [],
    regole: [
      'Si gioca in due su una damiera 10×10, sulle caselle scure. Ognuno ha 20 pedine; il bianco (chi inizia) parte dal basso, il nero dall\'alto. Alla rivincita si scambiano.',
      'Le pedine si muovono in avanti, in diagonale, di una casella. Mangiano saltando una pedina avversaria vicina (anche all\'indietro!) e atterrando nella casella libera dopo. Si possono fare più salti di seguito.',
      'Mangiare è OBBLIGATORIO, e bisogna scegliere la presa che mangia più pezzi (pedine e dame contano uguale). I pezzi mangiati si tolgono alla fine della presa e non si possono saltare due volte.',
      'Una pedina che FINISCE la mossa sull\'ultima fila diventa dama (se ci passa durante una presa e continua, resta pedina). La dama "vola": si muove di quante caselle vuole in diagonale, e mangia anche da lontano, atterrando in qualsiasi casella libera dopo il pezzo mangiato.',
      'Vince chi mangia tutti i pezzi dell\'avversario o lo lascia senza mosse. È pareggio se per 25 mosse a testa si muovono solo dame senza prese, o se la stessa posizione si ripete tre volte.',
      'Comandi: tocca un tuo pezzo (quelli che possono muovere sono evidenziati) e poi la casella d\'arrivo. Se due prese diverse arrivano nella stessa casella, scegli quale fare dai pulsanti.',
      'Il computer facile gioca quasi a caso; il medio guarda due mosse avanti; il difficile calcola molte mosse avanti seguendo le prese fino in fondo.',
      'Contro il computer c\'è "↶ Annulla mossa".',
    ],
  },
  crea: (o) => new DamaInt(o),
  bot,
  _test: { mosseDi, esegui, iniziale, chiaveMossa, valuta, nome, L },
};
