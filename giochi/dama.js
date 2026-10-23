// DAMA ITALIANA: damiera 8×8, si gioca sulle caselle scure, 12 pedine a testa, il Bianco muove per primo.
// La pedina muove e cattura solo in avanti e non può catturare la dama; la dama muove di una casella in ogni direzione.
// Presa obbligatoria con le priorità del regolamento italiano.
const { casuale } = require('./carte');

const scura = (r, c) => (r + c) % 2 === 0; // l'angolo in basso a destra (7,7) è scuro
const dentro = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const PATTA_MOSSE = 80; // 40 mosse a testa senza catture né mosse di pedina

// Pezzo: { l: 0 bianco | 1 nero, d: true se dama }. Il bianco sta in basso (righe 5-7) e sale.
function avanti(l) { return l === 0 ? -1 : 1; }

function prese(b, da) {
  const pz = b[da];
  const risultati = [];
  const r0 = Math.floor(da / 8), c0 = da % 8;
  const dirs = pz.d ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[avanti(pz.l), -1], [avanti(pz.l), 1]];
  function cerca(r, c, percorso, presi) {
    let continua = false;
    const promossa = !pz.d && r === (pz.l === 0 ? 0 : 7);
    if (!promossa) {
      for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc, ar = r + 2 * dr, ac = c + 2 * dc;
        if (!dentro(ar, ac)) continue;
        const m = mr * 8 + mc, a = ar * 8 + ac;
        const vittima = b[m];
        if (!vittima || vittima.l === pz.l || presi.includes(m)) continue;
        if (!pz.d && vittima.d) continue; // la pedina non cattura la dama
        if (b[a] && a !== da) continue;
        continua = true;
        cerca(ar, ac, [...percorso, a], [...presi, m]);
      }
    }
    if (!continua && presi.length) risultati.push({ percorso, presi });
  }
  cerca(r0, c0, [da], []);
  return risultati;
}

// mosse legali del colore l (con le priorità di presa)
function mosseLegali(b, l) {
  let catture = [];
  for (let i = 0; i < 64; i++) if (b[i] && b[i].l === l) for (const x of prese(b, i)) catture.push({ ...x, dama: b[i].d });
  if (catture.length) {
    const max = (f) => { const m = Math.max(...catture.map(f)); catture = catture.filter((x) => f(x) === m); };
    max((x) => x.presi.length);                                              // 1. più pezzi
    max((x) => (x.dama ? 1 : 0));                                            // 2. con la dama
    max((x) => x.presi.filter((k) => b[k].d).length);                        // 3. più dame
    max((x) => { const j = x.presi.findIndex((k) => b[k].d); return j < 0 ? -99 : -j; }); // 4. prima una dama
    return catture.map(({ percorso, presi }) => ({ percorso, presi }));
  }
  const semplici = [];
  for (let i = 0; i < 64; i++) {
    const pz = b[i];
    if (!pz || pz.l !== l) continue;
    const r = Math.floor(i / 8), c = i % 8;
    const dirs = pz.d ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[avanti(l), -1], [avanti(l), 1]];
    for (const [dr, dc] of dirs) if (dentro(r + dr, c + dc) && !b[(r + dr) * 8 + c + dc]) semplici.push({ percorso: [i, (r + dr) * 8 + c + dc], presi: [] });
  }
  return semplici;
}

function applica(b, m) {
  const n = b.slice();
  const da = m.percorso[0], a = m.percorso[m.percorso.length - 1];
  const pz = { ...n[da] };
  n[da] = null;
  for (const k of m.presi) n[k] = null;
  const r = Math.floor(a / 8);
  const promossa = !pz.d && r === (pz.l === 0 ? 0 : 7);
  if (promossa) pz.d = true;
  n[a] = pz;
  return { b: n, promossa };
}

function iniziale() {
  const b = new Array(64).fill(null);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (!scura(r, c)) continue;
    if (r <= 2) b[r * 8 + c] = { l: 1, d: false };
    if (r >= 5) b[r * 8 + c] = { l: 0, d: false };
  }
  return b;
}

const ANN = require('./annulla');

class Dama {
  constructor({ n, primo = 0, bot = [] }) {
    this.id = 'dama';
    this.n = n;
    this.b = iniziale();
    this.lato = [];
    this.lato[primo] = 0; // chi inizia ha il Bianco
    this.lato[1 - primo] = 1;
    this.posto = [primo, 1 - primo]; // posto del bianco e del nero
    this.turno = primo;
    this.quiete = 0; // mezze mosse senza catture né mosse di pedina
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultima = null;
    this.legali = mosseLegali(this.b, 0);
    ANN.prepara(this, bot, ['b', 'turno', 'quiete', 'ultima', 'legali']);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a) return { errore: 'Mossa non valida' };
    if (a.tipo === 'abbandona') {
      if (p !== 0 && p !== 1) return { errore: 'Mossa non valida' };
      this.annuncia(p, 'abbandona', 'hai abbandonato', true);
      return this.chiudi(1 - p, 'abbandono');
    }
    if (a.tipo === 'annulla') return ANN.annulla(this, p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a.tipo !== 'muovi' || !Array.isArray(a.percorso)) return { errore: 'Mossa non valida' };
    const perc = a.percorso.map(Number);
    const m = this.legali.find((x) => x.percorso.length === perc.length && x.percorso.every((k, j) => k === perc[j]));
    if (!m) {
      const obbligo = this.legali[0] && this.legali[0].presi.length;
      return { errore: obbligo ? 'La presa è obbligatoria: devi catturare (con la presa che vale di più)' : 'Mossa non valida' };
    }
    ANN.salva(this, p);
    const eraPedina = !this.b[perc[0]].d;
    const { b, promossa } = applica(this.b, m);
    this.b = b;
    this.ultima = { percorso: m.percorso, presi: m.presi };
    this.quiete = m.presi.length || eraPedina ? 0 : this.quiete + 1;
    if (m.presi.length > 1) this.annuncia(p, `cattura ${m.presi.length} pezzi!`, `catturi ${m.presi.length} pezzi!`, true);
    else if (promossa) this.annuncia(p, 'fa dama!', 'fai dama!', true);
    const l = 1 - this.lato[p];
    this.legali = mosseLegali(this.b, l);
    if (!this.legali.length) {
      const senzaPezzi = !this.b.some((x) => x && x.l === l);
      return this.chiudi(p, senzaPezzi ? 'pezzi' : 'bloccato');
    }
    if (this.quiete >= PATTA_MOSSE) return this.chiudi(null, 'patta');
    this.turno = 1 - p;
    return { ok: true };
  }

  chiudi(vince, motivo) {
    this.finita = true;
    this.turno = null;
    this.motivo = motivo;
    if (motivo === 'patta') this.annuncia(null, 'Patta: 40 mosse a testa senza catture', '', true);
    else if (motivo === 'bloccato') this.annuncia(vince, 'vince: l\'avversario non può più muovere', 'vinci: l\'avversario è bloccato', true);
    else if (motivo === 'pezzi') this.annuncia(vince, 'vince: ha catturato tutti i pezzi', 'hai catturato tutti i pezzi!', true);
    const conta = (p) => this.b.filter((x) => x && x.l === this.lato[p]).length;
    this.risultato = {
      fazioni: [0, 1].map((p) => ({ posti: [p], punti: conta(p) })),
      etichetta: 'pezzi rimasti',
      pareggio: vince === null,
      vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  // trucco segreto (!win): la mossa del computer difficile, con le caselle viste dal giocatore (a-h da sinistra,
  // 1-8 dal suo lato: il nero vede la damiera girata)
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    const perc = bot(this, p, 'difficile').percorso;
    const nero = this.lato[p] === 1;
    const nome = (i) => { const r = Math.floor(i / 8), c = i % 8; return nero ? `${'abcdefgh'[7 - c]}${r + 1}` : `${'abcdefgh'[c]}${8 - r}`; };
    const m = this.legali.find((x) => x.percorso.length === perc.length && x.percorso.every((k, j) => k === perc[j]));
    const pezzo = this.b[perc[0]].d ? 'Dama' : 'Pedina';
    return `💡 ${pezzo} ${perc.map(nome).join(m && m.presi.length ? ' × ' : ' → ')} (colonne a-h da sinistra, righe 1-8 dal tuo lato)`;
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, b: this.b, lato: this.lato, turno: this.turno, inAttesa: false,
      finita: this.finita, risultato: this.risultato, evento: this.evento, ultima: this.ultima, motivo: this.motivo || null,
      mosse: this.turno === p ? this.legali : [], obbligo: !!(this.legali[0] && this.legali[0].presi.length),
      quiete: this.quiete, puoAnnullare: ANN.puo(this, p), annullate: this.annullate,
    };
  }
}

// =================== COMPUTER ===================
function valuta(b, l) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const x = b[i];
    if (!x) continue;
    const r = Math.floor(i / 8), c = i % 8;
    let v;
    if (x.d) v = 260 + (3.5 - Math.abs(3.5 - r)) * 2 + (3.5 - Math.abs(3.5 - c)) * 2;
    else {
      const avanzamento = x.l === 0 ? 7 - r : r; // 0 in partenza, 7 alla promozione
      v = 100 + avanzamento * 4 + (avanzamento >= 5 ? 10 : 0);
      if (avanzamento === 0) v += 6; // la riga di fondo protegge dalle dame avversarie
      if (c === 0 || c === 7) v -= 3;
    }
    s += x.l === l ? v : -v;
  }
  return s;
}
const VINCE = 100000;
function negamax(b, l, prof, alfa, beta, ctx) {
  const mosse = mosseLegali(b, l);
  if (!mosse.length) return -(VINCE + prof);
  // le catture si guardano sempre fino in fondo (niente "orizzonte" a metà scambio)
  if (prof <= 0 && !mosse[0].presi.length) return valuta(b, l);
  if (prof < -6) return valuta(b, l);
  if ((++ctx.nodi & 511) === 0 && Date.now() > ctx.fino) ctx.stop = true;
  if (ctx.stop) return 0;
  let best = -Infinity;
  for (const m of mosse) {
    const v = -negamax(applica(b, m).b, 1 - l, prof - 1, -beta, -alfa, ctx);
    if (ctx.stop) return 0;
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  return best;
}
function classifica(b, l, profMax, ms) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 25);
  const mosse = mosseLegali(b, l);
  const ctx = { nodi: 0, fino: Date.now() + ms, stop: false };
  let lista = mosse.map((m) => ({ m, v: 0 }));
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    for (const { m } of lista) {
      const v = -negamax(applica(b, m).b, 1 - l, prof - 1, -Infinity, Infinity, ctx);
      if (ctx.stop) break;
      giro.push({ m, v: v + Math.random() * 2 });
    }
    if (ctx.stop) break;
    lista = giro.sort((x, y) => y.v - x.v);
    if (Math.abs(lista[0].v) > VINCE / 2) break;
  }
  return lista;
}

function bot(g, p, livello) {
  const l = g.lato[p];
  const muovi = (m) => ({ tipo: 'muovi', percorso: m.percorso });
  if (g.legali.length === 1) return muovi(g.legali[0]);
  if (livello === 'facile') {
    if (Math.random() < 0.55) return muovi(casuale(g.legali));
    return muovi(classifica(g.b, l, 2, 200)[0].m);
  }
  if (livello === 'medio') {
    const lista = classifica(g.b, l, 4, 300);
    if (lista.length > 1 && Math.random() < 0.15 && lista[1].v > lista[0].v - 60) return muovi(lista[1].m);
    return muovi(lista[0].m);
  }
  return muovi(classifica(g.b, l, 30, 500)[0].m);
}

module.exports = {
  meta: {
    id: 'dama',
    nome: 'Dama',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Dama all\'italiana: presa obbligatoria, le pedine non mangiano le dame.',
    opzioni: [],
    regole: [
      'Si gioca in due su una damiera 8×8, solo sulle caselle scure. Ognuno ha 12 pedine. Chi inizia ha il Bianco e muove per primo; alla rivincita si scambiano i colori.',
      'La pedina si muove in diagonale di una casella, solo in avanti.',
      'Si cattura saltando un pezzo avversario vicino in diagonale, se la casella subito dopo è libera. Dopo un salto, se si può, si continua a saltare con lo stesso pezzo (presa multipla).',
      'La pedina cattura solo in avanti e non può catturare la dama.',
      'Quando una pedina arriva all\'ultima riga diventa dama (compare la corona) e la mossa finisce. La dama si muove di una casella in diagonale in tutte le direzioni e cattura sia in avanti sia all\'indietro.',
      'La presa è obbligatoria. Se ci sono più prese possibili si deve scegliere, nell\'ordine: quella che cattura più pezzi; a parità, quella fatta con la dama; a parità, quella che cattura più dame; a parità, quella in cui si incontra prima una dama. Il sito ti lascia scegliere solo tra le prese valide.',
      'Vince chi cattura tutti i pezzi avversari o lascia l\'avversario senza mosse possibili. Si può anche abbandonare.',
      'Patta: se per 40 mosse a testa nessuno cattura e nessuno muove una pedina (si muovono solo le dame).',
      'Come si gioca sul sito: clicca un tuo pezzo (sono evidenziati quelli che possono muovere), poi la casella di arrivo. Nelle prese multiple clicca una casella dopo l\'altra.',
      'Contro il computer c\'è "↶ Annulla mossa": torna a prima della tua ultima mossa (si annulla anche la risposta del computer).',
    ],
  },
  crea: (o) => new Dama(o),
  bot,
  _test: { mosseLegali, applica, iniziale, prese },
};
