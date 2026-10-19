// NASCONDINO: griglia 7×7. Un cacciatore parte dal centro, gli altri si nascondono.
// A ogni round tutti si muovono insieme, in segreto: i cacciatori di 1 o 2 caselle in linea retta, chi è nascosto di
// una casella (su, giù, destra, sinistra) oppure resta fermo. Chi finisce sulla casella di un cacciatore (o si
// incrocia con lui) viene preso e diventa cacciatore.
// I cacciatori ricevono indizi: il "fruscio" (quanti nascosti a 2 caselle o meno), le impronte lasciate da chi si è
// appena spostato, e ogni 3 round la direzione in cui si trova il nascosto più vicino.
const LATO = 7;
const CENTRO = 24; // (3, 3)
const ROUND = [10, 8, 14];
const PUNTI_PRESA = 4;
const RAGGIO = 2; // il fruscio arriva da chi è a 2 caselle o meno
const PRESA = 1; // la torcia: preso chi è sulla casella del cacciatore o su una casella accanto
const VISTA = 2; // chi è nascosto vede i cacciatori solo quando sono così vicini
const OGNI_DIREZIONE = 3; // ogni quanti round arriva l'indizio della direzione
const DIREZIONI = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const NOMI_DIR = { N: 'nord ⬆️', NE: 'nord-est ↗️', E: 'est ➡️', SE: 'sud-est ↘️', S: 'sud ⬇️', SO: 'sud-ovest ↙️', O: 'ovest ⬅️', NO: 'nord-ovest ↖️' };

const xy = (c) => [c % LATO, Math.floor(c / LATO)];
const cella = (x, y) => y * LATO + x;
const dentro = (x, y) => x >= 0 && y >= 0 && x < LATO && y < LATO;
const dist = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.abs(ax - bx) + Math.abs(ay - by); };
// mosse del cacciatore: resta, oppure 1 o 2 caselle in linea retta
function mosseCaccia(c) {
  const [x, y] = xy(c), out = [c];
  for (const [dx, dy] of DIREZIONI) for (const k of [1, 2]) if (dentro(x + dx * k, y + dy * k)) out.push(cella(x + dx * k, y + dy * k));
  return out;
}
// mosse di chi è nascosto: resta, oppure una casella in su, giù, destra o sinistra
function mosseNascosto(c) {
  const [x, y] = xy(c), out = [c];
  for (const [dx, dy] of DIREZIONI) if (dentro(x + dx, y + dy)) out.push(cella(x + dx, y + dy));
  return out;
}
// direzione (tra 8) da a verso b; il nord è in alto
function direzione(a, b) {
  const [ax, ay] = xy(a), [bx, by] = xy(b);
  const ang = Math.atan2(ay - by, bx - ax);
  const set = ['E', 'NE', 'N', 'NO', 'O', 'SO', 'S', 'SE'];
  return set[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
}
const inDirezione = (a, c, d) => c !== a && direzione(a, c) === d;

class Nascondino {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'nascondino';
    this.n = n;
    this.round = ROUND.includes(Number(opzioni.round)) ? Number(opzioni.round) : ROUND[0];
    this.ruolo = new Array(n).fill('nascosto');
    this.ruolo[primo % n] = 'caccia';
    this.pos = new Array(n).fill(CENTRO);
    this.libere = Array.from({ length: LATO * LATO }, (_, i) => i).filter((c) => dist(c, CENTRO) > 2); // dove ci si può nascondere
    this.punti = new Array(n).fill(0);
    this.prese = new Array(n).fill(0);
    this.sopravvissuti = new Array(n).fill(0);
    this.nRound = 1;
    this.scelte = {};
    this.visitate = new Set([CENTRO]);
    this.storia = []; // per round: { round, prese, frusci: { posto: n }, impronte: [celle], indizi: { posto: direzione }, cacciatori: { posto: cella } }
    this.turno = null;
    this.fase = 'nascondi'; // nascondi | caccia | fine
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  nascosti() { return this.ruolo.map((r, i) => (r === 'nascosto' ? i : -1)).filter((i) => i >= 0); }
  cacciatori() { return this.ruolo.map((r, i) => (r === 'caccia' ? i : -1)).filter((i) => i >= 0); }
  // all'inizio scelgono i nascosti; poi a ogni round tutti (i cacciatori e chi è ancora nascosto)
  chiSceglie() { return this.fase === 'nascondi' ? this.nascosti() : this.fase === 'caccia' ? Array.from({ length: this.n }, (_, i) => i) : []; }
  mossePer(p) {
    if (this.fase === 'nascondi') return this.ruolo[p] === 'nascosto' ? this.libere : [];
    if (this.fase !== 'caccia') return [];
    return this.ruolo[p] === 'caccia' ? mosseCaccia(this.pos[p]) : mosseNascosto(this.pos[p]);
  }
  attesi() { return this.finita ? [] : this.chiSceglie().filter((i) => this.scelte[i] === undefined); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!this.chiSceglie().includes(p)) return { errore: 'Il cacciatore aspetta che tutti si nascondano' };
    if (!a || !['muovi', 'caso', 'resta'].includes(a.tipo)) return { errore: 'Scegli una casella' };
    if (this.scelte[p] !== undefined) return { errore: 'Hai già scelto: aspetta gli altri' };
    let c;
    if (a.tipo === 'caso' && this.fase === 'nascondi') c = this.libere[Math.floor(Math.random() * this.libere.length)];
    else if (a.tipo === 'resta') c = this.pos[p];
    else c = Number(a.cella);
    if (!this.mossePer(p).includes(c)) {
      if (this.fase === 'nascondi') return { errore: 'Lì è troppo vicino al centro: nasconditi più lontano' };
      return { errore: this.ruolo[p] === 'caccia' ? 'Ti muovi di 1 o 2 caselle in linea retta' : 'Ti muovi di una casella (su, giù, destra o sinistra) o resti fermo' };
    }
    this.scelte[p] = c;
    if (!this.attesi().length) this.risolvi();
    return { ok: true };
  }

  salta(p) {
    if (!this.attesi().includes(p)) return { ok: true };
    return this.azione(p, this.fase === 'nascondi' ? { tipo: 'caso' } : { tipo: 'resta' });
  }

  risolvi() {
    if (this.fase === 'nascondi') {
      for (const v of this.nascosti()) this.pos[v] = this.scelte[v];
      this.scelte = {};
      this.fase = 'caccia';
      this.annuncia(null, 'Tutti nascosti: comincia la caccia! 🔦', 'tutti nascosti: comincia la caccia!', true);
      return;
    }
    const caccia = this.cacciatori(), nasc = this.nascosti();
    const prima = this.pos.slice();
    for (const i of [...caccia, ...nasc]) this.pos[i] = this.scelte[i];
    for (const h of caccia) this.visitate.add(this.pos[h]);
    // prese: stessa casella di un cacciatore, oppure scambio di posto con lui
    const prese = [];
    for (const v of nasc) {
      const h = caccia.find((k) => dist(this.pos[k], this.pos[v]) <= PRESA || (this.pos[k] === prima[v] && this.pos[v] === prima[k]));
      if (h !== undefined) {
        prese.push({ chi: h, preso: v, cella: this.pos[h], incrocio: this.pos[h] !== this.pos[v] });
        this.ruolo[v] = 'caccia';
        this.pos[v] = this.pos[h];
        this.prese[h]++;
        this.punti[h] += PUNTI_PRESA;
      }
    }
    // impronte: le caselle appena lasciate da chi si è spostato (ed è ancora nascosto)
    const impronte = this.nascosti().filter((v) => this.pos[v] !== prima[v]).map((v) => prima[v]);
    for (const v of this.nascosti()) { this.punti[v]++; this.sopravvissuti[v]++; }
    // gli indizi per i cacciatori (anche per chi lo è appena diventato)
    const frusci = {}, indizi = {}, cacciatori = {};
    const bussola = this.nRound % OGNI_DIREZIONE === 0;
    for (const h of this.cacciatori()) {
      cacciatori[h] = this.pos[h];
      frusci[h] = this.nascosti().filter((v) => dist(this.pos[v], this.pos[h]) <= RAGGIO).length;
      if (bussola && this.nascosti().length) {
        const vicino = this.nascosti().reduce((a, b) => (dist(this.pos[b], this.pos[h]) < dist(this.pos[a], this.pos[h]) ? b : a));
        indizi[h] = direzione(this.pos[h], this.pos[vicino]);
      }
    }
    this.storia.push({ round: this.nRound, prese, frusci, impronte, indizi, cacciatori });
    if (prese.length) {
      const t = prese.length;
      this.annuncia(prese[0].chi, `ha trovato ${t === 1 ? 'qualcuno' : `${t} giocatori`}! 👀`, `hai trovato ${t === 1 ? 'qualcuno' : `${t} giocatori`}! 👀`, true);
    } else if (Object.keys(indizi).length) this.annuncia(null, '🧭 Bussola: i cacciatori sanno da che parte è il nascosto più vicino', '');
    this.scelte = {};
    if (!this.nascosti().length || this.nRound >= this.round) return this.chiudi();
    this.nRound++;
  }

  // chi è nascosto vede un cacciatore solo quando è vicino (a VISTA caselle o meno); i cacciatori si vedono tra loro
  vedeCacciatore(p, h) { return this.ruolo[p] === 'caccia' || this.fase !== 'caccia' || dist(this.pos[p], this.pos[h]) <= VISTA; }

  esce(p) { if (this.attesi().includes(p)) this.salta(p); }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
  }

  // trucco segreto (!win): nel round in corso. Chi caccia sa dov'è il nascosto più vicino e la mossa che lo prende
  // (anche se lui si sposta); chi è nascosto sa dove sono i cacciatori e dove andare per non farsi prendere.
  suggerimentoWin(p) {
    if (this.finita || this.fase !== 'caccia' || this.scelte[p] !== undefined) return null;
    const qui = this.pos[p];
    const rel = (c) => { const [ax, ay] = xy(qui), [bx, by] = xy(c), dx = bx - ax, dy = by - ay; return [dy ? `${Math.abs(dy)}${dy < 0 ? '⬆️' : '⬇️'}` : '', dx ? `${Math.abs(dx)}${dx < 0 ? '⬅️' : '➡️'}` : ''].filter(Boolean).join(' ') || 'qui'; };
    const mossa = (c) => (c === qui ? 'resta fermo' : `vai ${rel(c)}`);
    if (this.ruolo[p] === 'caccia') {
      const nasc = this.nascosti();
      if (!nasc.length) return null;
      // la mossa che copre più caselle dove i nascosti possono finire
      const copre = (m) => nasc.reduce((t, v) => { const dopo = mosseNascosto(this.pos[v]); return t + dopo.filter((d) => dist(d, m) <= PRESA).length / dopo.length; }, 0);
      const vicinanza = (m) => Math.min(...nasc.map((v) => dist(this.pos[v], m))); // a parità, verso il più vicino
      const m = mosseCaccia(qui).reduce((a, b) => (copre(b) > copre(a) + 1e-9 || (Math.abs(copre(b) - copre(a)) < 1e-9 && vicinanza(b) < vicinanza(a)) ? b : a));
      const vicino = nasc.reduce((a, b) => (dist(this.pos[b], qui) < dist(this.pos[a], qui) ? b : a));
      return `💡 Il nascosto più vicino è a ${rel(this.pos[vicino])} da te: ${mossa(m)}`;
    }
    const caccia = this.cacciatori();
    const pericolo = (c) => caccia.filter((h) => mosseCaccia(this.pos[h]).some((d) => dist(d, c) <= PRESA)).length;
    const lontano = (c) => Math.min(...caccia.map((h) => dist(this.pos[h], c)));
    const m = mosseNascosto(qui).reduce((a, b) => (pericolo(b) < pericolo(a) || (pericolo(b) === pericolo(a) && lontano(b) > lontano(a)) ? b : a));
    const vicino = caccia.reduce((a, b) => (dist(this.pos[b], qui) < dist(this.pos[a], qui) ? b : a));
    return `💡 Il cacciatore più vicino è a ${rel(this.pos[vicino])} da te: ${mossa(m)}${pericolo(m) ? '' : ' (lì non ti prende)'}`;
  }

  vista(p) {
    const cacciatore = this.ruolo[p] === 'caccia';
    // chi è nascosto vede sé stesso e i cacciatori; chi caccia vede i cacciatori e gli indizi
    const visibili = this.pos.map((c, i) => (this.finita || (i === p && (this.fase !== 'nascondi' || cacciatore)) || (this.ruolo[i] === 'caccia' && this.vedeCacciatore(p, i)) ? c : null));
    const ultimo = this.storia[this.storia.length - 1] || null;
    return {
      gioco: this.id, n: this.n, lato: LATO, centro: CENTRO, turno: null, fase: this.fase, inAttesa: false,
      round: this.round, nRound: this.nRound, ruolo: this.ruolo, pos: visibili, punti: this.punti, prese: this.prese, sopravvissuti: this.sopravvissuti,
      mosse: this.finita || this.scelte[p] !== undefined ? [] : this.mossePer(p), scelto: this.scelte[p] ?? null,
      devo: this.attesi().includes(p), pronti: Array.from({ length: this.n }, (_, i) => this.scelte[i] !== undefined),
      // gli indizi li vedono solo i cacciatori (e tutti a partita finita); chi è nascosto sa solo delle prese
      indizi: cacciatore || this.finita ? ultimo : (ultimo ? { round: ultimo.round, prese: ultimo.prese, bussola: Object.keys(ultimo.indizi).length > 0 } : null),
      visitate: cacciatore || this.finita ? [...this.visitate] : [],
      libere: this.fase === 'nascondi' ? this.libere : null, puntiPresa: PUNTI_PRESA, ogniDirezione: OGNI_DIREZIONE, nomiDir: NOMI_DIR,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// I cacciatori (medio e difficile) tengono una mappa di probabilità di dove può essere un nascosto: a ogni round la
// mappa "si allarga" (i nascosti possono spostarsi di una casella) e poi si restringe con gli indizi.
function aggiornaMappa(g, livello) {
  const tot = LATO * LATO;
  g._mappe = g._mappe || {};
  let st = g._mappe[livello];
  if (!st) { st = { round: 0, m: Array.from({ length: tot }, (_, c) => (g.libere.includes(c) ? 1 : 0)) }; g._mappe[livello] = st; }
  for (const r of g.storia.filter((x) => x.round > st.round)) {
    let m = st.m;
    // chi si nasconde può muoversi: la probabilità si sparge un po' sulle caselle vicine
    const muove = livello === 'difficile' ? 0.35 : 0.25;
    const nuova = new Array(tot).fill(0);
    for (let c = 0; c < tot; c++) {
      if (!m[c]) continue;
      const vic = mosseNascosto(c).filter((d) => d !== c);
      nuova[c] += m[c] * (1 - muove);
      for (const d of vic) nuova[d] += (m[c] * muove) / vic.length;
    }
    m = nuova;
    for (const c of Object.values(r.cacciatori)) m[c] = 0; // dove sta un cacciatore non c'è nessuno
    for (const [h, f] of Object.entries(r.frusci)) {
      const hc = r.cacciatori[h];
      for (let c = 0; c < tot; c++) {
        const vicino = dist(c, hc) <= RAGGIO;
        if (f === 0 && vicino) m[c] = 0;
        if (f > 0) m[c] *= vicino ? 2 + f : 0.6;
      }
    }
    // impronte: chi le ha lasciate adesso è su una casella accanto
    for (const f of r.impronte || []) for (const d of mosseNascosto(f)) if (d !== f && !Object.values(r.cacciatori).includes(d)) m[d] = m[d] * 3 + 0.4;
    // la bussola: il nascosto più vicino è in quella direzione (la usa solo il difficile)
    if (livello === 'difficile') for (const [h, d] of Object.entries(r.indizi || {})) {
      const hc = r.cacciatori[h];
      for (let c = 0; c < tot; c++) if (!inDirezione(hc, c, d)) m[c] *= 0.35;
    }
    const s = m.reduce((a, b) => a + b, 0) || 1;
    st.m = m.map((x) => x / s);
    st.round = r.round;
  }
  return st.m;
}

function bot(g, p, livello) {
  const mosse = g.mossePer(p);
  if (!mosse.length) return { tipo: 'resta' };
  const caso = () => ({ tipo: 'muovi', cella: mosse[Math.floor(Math.random() * mosse.length)] });
  if (g.fase === 'nascondi') {
    if (livello === 'facile') return { tipo: 'caso' };
    const val = (c) => dist(c, CENTRO) + Math.random() * (livello === 'difficile' ? 2 : 4);
    return { tipo: 'muovi', cella: [...mosse].sort((a, b) => val(b) - val(a))[0] };
  }
  const caccia = g.cacciatori();
  if (g.ruolo[p] === 'nascosto') {
    // il computer nascosto usa solo quello che vede: i cacciatori vicini
    const visti = caccia.filter((h) => g.vedeCacciatore(p, h));
    if (livello === 'facile') return Math.random() < 0.5 ? { tipo: 'resta' } : caso();
    const qui = g.pos[p];
    // pericolo di una casella: quanti cacciatori ci possono arrivare al prossimo round
    const raggiungibile = (c) => visti.filter((h) => mosseCaccia(g.pos[h]).some((d) => dist(d, c) <= PRESA)).length;
    const vicinanza = (c) => (visti.length ? Math.min(...visti.map((h) => dist(g.pos[h], c))) : 6);
    if (livello === 'medio') {
      // scappa solo quando un cacciatore visto lo può raggiungere, verso una casella sicura qualsiasi
      if (!raggiungibile(qui)) return { tipo: 'resta' };
      const sicure = mosse.filter((c) => !raggiungibile(c));
      if (sicure.length) return { tipo: 'muovi', cella: sicure[Math.floor(Math.random() * sicure.length)] };
      return { tipo: 'muovi', cella: [...mosse].sort((a, b) => vicinanza(b) - vicinanza(a))[0] };
    }
    // difficile: evita le caselle raggiungibili, sta fuori dal raggio del fruscio, e si muove solo se serve
    // (muoversi lascia un'impronta, tanto più pericolosa quanto più un cacciatore è vicino)
    // ricorda dove ha visto i cacciatori l'ultima volta: da lì possono arrivare anche se ora non li vede
    g._ricordo = g._ricordo || {};
    const ric = g._ricordo[p] = (g._ricordo[p] || []).filter((x) => g.nRound - x.round <= 2);
    for (const h of visti) ric.push({ c: g.pos[h], round: g.nRound });
    const minacciaRicordo = (c) => ric.filter((x) => x.round < g.nRound && dist(x.c, c) <= 2 + 2 * (g.nRound - x.round)).length;
    const valuta = (c) => {
      let v = -1000 * raggiungibile(c) + 2 * Math.min(vicinanza(c), 5) - (vicinanza(c) <= RAGGIO ? 3 : 0);
      v -= minacciaRicordo(c);
      if (c !== qui && !visti.length) v -= 3; // muoversi senza motivo lascia impronte
      v += 0.3 * mosseNascosto(c).filter((d) => !raggiungibile(d)).length; // non finire chiusi in un angolo
      return v + Math.random() * 0.2;
    };
    return { tipo: 'muovi', cella: [...mosse].sort((a, b) => valuta(b) - valuta(a))[0] };
  }
  // cacciatore
  if (livello === 'facile' && Math.random() < 0.6) return caso();
  let m = aggiornaMappa(g, livello === 'difficile' ? 'difficile' : 'medio');
  if (livello === 'difficile') {
    // il difficile prevede la prossima mossa dei nascosti: chi vede un cacciatore vicino scappa verso una casella
    // che la torcia non può raggiungere; chi non vede nessuno di solito resta fermo
    const tot = LATO * LATO;
    const minacciata = (d) => caccia.some((h) => mosseCaccia(g.pos[h]).some((e) => dist(e, d) <= PRESA));
    const prev = new Array(tot).fill(0);
    for (let c = 0; c < tot; c++) {
      if (!m[c]) continue;
      const vede = caccia.some((h) => dist(g.pos[h], c) <= VISTA);
      const opz = mosseNascosto(c);
      if (vede && minacciata(c)) {
        const sicure = opz.filter((d) => !minacciata(d));
        const dove = sicure.length ? sicure : opz;
        for (const d of dove) prev[d] += m[c] / dove.length;
      } else { prev[c] += m[c] * 0.8; for (const d of opz) if (d !== c) prev[d] += (m[c] * 0.2) / (opz.length - 1); }
    }
    m = prev;
  }
  const altri = caccia.filter((h) => h !== p).map((h) => g.scelte[h]).filter((c) => c !== undefined);
  // valore di una casella: probabilità lì (presa) e intorno (dove potrebbe scappare, e per il fruscio del round dopo)
  const valuta = (c) => {
    let v = 0;
    for (let d = 0; d < LATO * LATO; d++) if (dist(c, d) <= PRESA) v += m[d] * 5; // caselle illuminate dalla torcia
    v += mosseNascosto(c).filter((d) => d !== c).reduce((t, d) => t + m[d], 0) * (livello === 'difficile' ? 1.4 : 0.6);
    if (livello === 'difficile') for (let d = 0; d < LATO * LATO; d++) if (dist(c, d) <= RAGGIO) v += m[d] * 0.15;
    if (altri.includes(c)) v -= 1; // i cacciatori non vanno tutti nello stesso posto
    return v + Math.random() * 1e-6;
  };
  return { tipo: 'muovi', cella: [...mosse].sort((a, b) => valuta(b) - valuta(a))[0] };
}

module.exports = {
  meta: {
    id: 'nascondino',
    nome: 'Nascondino',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Uno cerca e gli altri si nascondono su una griglia 7×7, e possono spostarsi. Il cacciatore ha gli indizi.',
    alias: ['nascondersi', 'cerca', 'caccia'],
    opzioni: [
      { id: 'round', nome: 'Round', valori: ROUND, etichette: ['10 round', '8 round', '14 round'], predefinito: 10 },
    ],
    regole: [
      'Si gioca su una griglia 7×7. Un giocatore è il cacciatore e parte dal centro; tutti gli altri si nascondono.',
      'All\'inizio chi si nasconde sceglie in segreto la sua casella (cliccandola) oppure preme "A caso". Non ci si può nascondere a 2 caselle o meno dal centro. Gli altri nascosti non si vedono.',
      'A ogni round tutti scelgono insieme e in segreto la mossa. Il cacciatore si sposta di 1 o 2 caselle in linea retta (su, giù, destra o sinistra, mai in diagonale) oppure resta fermo. Chi è nascosto può spostarsi di una casella (su, giù, destra o sinistra) oppure restare fermo; vede sempre dove sono i cacciatori.',
      'Preso! Se alla fine del round un nascosto è sulla stessa casella di un cacciatore, oppure si sono incrociati (si sono scambiati di posto), è stato trovato: diventa cacciatore anche lui, da quella casella.',
      'Gli indizi per i cacciatori, dopo ogni round: il "fruscio" (quanti nascosti ci sono a 2 caselle o meno da ciascun cacciatore); le impronte, cioè le caselle appena lasciate da chi si è spostato (si vedono per un round); e ogni 3 round la bussola, che indica la direzione del nascosto più vicino.',
      'Per chi si nasconde restare fermo non lascia impronte, ma se il cacciatore si avvicina conviene scappare: scegliere quando muoversi è il cuore del gioco.',
      'Le caselle dove un cacciatore è già passato restano grigie (in quel momento lì non c\'era nessuno, ma poi qualcuno potrebbe essersi spostato lì).',
      'Punti: chi è ancora nascosto alla fine di un round prende 1 punto; ogni cacciatore prende 4 punti per ogni giocatore trovato.',
      'La partita finisce dopo 10 round (o 8, o 14, da scegliere prima) oppure quando sono stati trovati tutti. Vince chi ha più punti.',
      'Il computer facile si nasconde e cerca quasi a caso. Il medio scappa quando un cacciatore può raggiungerlo e da cacciatore segue frusci e impronte. Il difficile si muove solo quando conviene (per non lasciare impronte) e da cacciatore tiene una mappa di dove possono essere i nascosti, bussola compresa.',
    ],
  },
  crea: (o) => new Nascondino(o),
  bot,
  _test: { mosseCaccia, mosseNascosto, dist, cella, direzione, Nascondino, LATO, CENTRO },
};
