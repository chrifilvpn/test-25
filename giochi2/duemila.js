// 2048: griglia 4×4, si fanno scorrere tutte le tessere in una direzione; due tessere uguali che si toccano si
// fondono in una sola che vale il doppio. Dopo ogni mossa compare una tessera nuova (2, a volte 4).
// Da soli: si gioca finché ci sono mosse. Sfida (da 2 a 4): ognuno sulla sua griglia, TUTTI con la stessa sequenza
// di tessere nuove (generatore con seme); vince chi arriva prima a 2048, altrimenti chi ha più punti allo scadere.
// I computer della sfida li muove la partita stessa, ognuno col suo ritmo (come in Sblocca il blocco).
const L = 4;
const OBIETTIVO = 2048;
const RECORD = {};
const DIREZIONI = ['su', 'giu', 'sx', 'dx'];

// generatore pseudo-casuale con seme: la k-esima tessera nuova è uguale per tutti
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// la k-esima tessera nuova: valore (2 o 4) e un numero tra 0 e 1 che sceglie tra le caselle vuote
function tesseraN(seme, k) { const r = mulberry((seme ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0); r(); return { v: r() < 0.9 ? 2 : 4, x: r() }; }

// le 4 linee da comprimere per ogni direzione (indici delle caselle, dal lato verso cui si scorre)
const LINEE = {};
for (const d of DIREZIONI) {
  LINEE[d] = [];
  for (let k = 0; k < L; k++) {
    const linea = [];
    for (let j = 0; j < L; j++) {
      if (d === 'sx') linea.push(k * L + j);
      if (d === 'dx') linea.push(k * L + (L - 1 - j));
      if (d === 'su') linea.push(j * L + k);
      if (d === 'giu') linea.push((L - 1 - j) * L + k);
    }
    LINEE[d].push(linea);
  }
}

// mossa su una griglia di valori (0 = vuota): { celle, punti, mosso, fusioni } (non cambia la griglia di partenza).
// Scritta con cicli semplici: il computer difficile la chiama decine di migliaia di volte a mossa.
function scorri(celle, dir) {
  const out = celle.slice();
  let punti = 0, mosso = false, fusioni = 0;
  const linee = LINEE[dir];
  for (let k = 0; k < L; k++) {
    const linea = linee[k];
    let j = 0, attesa = 0; // attesa: l'ultima tessera messa che può ancora fondersi
    for (let t = 0; t < L; t++) {
      const v = celle[linea[t]];
      if (!v) continue;
      if (attesa === v) { out[linea[j - 1]] = v * 2; punti += v * 2; fusioni++; attesa = 0; } else { out[linea[j++]] = v; attesa = v; }
    }
    for (let t = j; t < L; t++) out[linea[t]] = 0;
    if (!mosso) for (let t = 0; t < L; t++) if (out[linea[t]] !== celle[linea[t]]) { mosso = true; break; }
  }
  return { celle: out, punti, mosso, fusioni };
}
const puoMuovere = (celle) => DIREZIONI.some((d) => scorri(celle, d).mosso);

// una griglia con le tessere che hanno un nome (id), per le animazioni nel browser
class Griglia {
  constructor(seme) {
    this.seme = seme; this.k = 0; this.nId = 0;
    this.t = new Array(L * L).fill(null); // { id, v } oppure null
    this.punti = 0; this.mosse = 0; this.max = 0;
    this.fusioni = []; this.nuova = null; this.nMossa = 0;
    this.fatto = null; // null finché gioca; poi { ms, motivo: '2048' | 'bloccato' }
    this.aggiungi(); this.aggiungi();
  }
  valori() { return this.t.map((x) => (x ? x.v : 0)); }
  aggiungi() {
    const vuote = this.t.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
    if (!vuote.length) return;
    const { v, x } = tesseraN(this.seme, this.k++);
    const i = vuote[Math.floor(x * vuote.length)];
    this.t[i] = { id: ++this.nId, v };
    this.nuova = this.t[i].id;
    if (v > this.max) this.max = v;
  }
  muovi(dir) {
    const nuove = new Array(L * L).fill(null);
    let mosso = false, punti = 0;
    const fusioni = [];
    for (const linea of LINEE[dir]) {
      const presenti = linea.map((i) => this.t[i]).filter(Boolean);
      let j = 0;
      for (let k = 0; k < presenti.length; k++) {
        const a = presenti[k], b = presenti[k + 1];
        if (b && a.v === b.v) {
          const f = { id: ++this.nId, v: a.v * 2 };
          fusioni.push({ id: f.id, da: [a.id, b.id], dove: linea[j] });
          nuove[linea[j]] = f; punti += f.v; if (f.v > this.max) this.max = f.v; k++;
        } else nuove[linea[j]] = a;
        j++;
      }
    }
    for (let i = 0; i < L * L; i++) if ((nuove[i] && nuove[i].id) !== (this.t[i] && this.t[i].id)) mosso = true;
    if (!mosso) return false;
    this.t = nuove; this.punti += punti; this.mosse++; this.nMossa++;
    this.fusioni = fusioni; this.nuova = null;
    this.aggiungi();
    return true;
  }
}

class Duemila {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'duemila';
    this.n = n;
    this.minuti = [2, 3, 5].includes(Number(opzioni.minuti)) ? Number(opzioni.minuti) : 3;
    this.botLiv = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.seme = (Math.random() * 2 ** 32) >>> 0;
    this.idPartita = Math.random().toString(36).slice(2);
    this.griglie = Array.from({ length: n }, () => new Griglia(this.seme));
    this.inizio = Date.now();
    this.fine = n > 1 ? this.inizio + this.minuti * 60000 : null;
    this.arrivi = []; // chi è arrivato a 2048, in ordine
    this.prossimaBot = this.botLiv.map((l) => (l ? this.inizio + 1500 + ritmo(l) : null));
    // da soli: con le dispense aperte si ferma tutto (nella sfida il tempo corre per tutti)
    this.pausaBoss = n === 1;
    this.inPausa = false; this.tempoPausa = 0; this.pausaDal = null;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now(); else { this.tempoPausa += Date.now() - this.pausaDal; this.pausaDal = null; }
    this.inPausa = si;
  }
  trascorso() { return (this.finita ? this.chiusa : Date.now()) - this.inizio - this.tempoPausa - (this.pausaDal ? Date.now() - this.pausaDal : 0); }
  // il server aspetta solo le persone; i computer li muove controllaTempo
  attesi() { return this.finita ? [] : this.griglie.map((g, i) => (g.fatto === null && !this.botLiv[i] ? i : -1)).filter((i) => i >= 0); }
  scadenza() {
    if (this.finita) return null;
    const bot = this.prossimaBot.filter((x, i) => x !== null && this.griglie[i].fatto === null);
    const tutte = [...bot];
    if (this.fine) tutte.push(this.fine);
    return tutte.length ? Math.min(...tutte) : null;
  }
  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    let cambiato = false;
    if (this.fine && ora >= this.fine) { this.annuncia(null, 'Tempo scaduto!', '', true); this.chiudi(); return true; }
    for (let p = 0; p < this.n; p++) {
      if (!this.botLiv[p] || this.griglie[p].fatto !== null || this.prossimaBot[p] > ora) continue;
      this.azione(p, bot(this, p, this.botLiv[p]));
      this.prossimaBot[p] = ora + ritmo(this.botLiv[p]);
      cambiato = true;
      if (this.finita) return true;
    }
    return cambiato;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    const g = this.griglie[p];
    if (!g || g.fatto !== null) return { errore: 'La tua partita è finita: aspetta gli altri' };
    if (!a || a.tipo !== 'muovi' || !DIREZIONI.includes(a.dir)) return { errore: 'Mossa non valida' };
    if (!g.muovi(a.dir)) return { ok: true }; // niente si muove: la mossa non conta
    if (g.max >= OBIETTIVO && !g.vinto) {
      g.vinto = true;
      if (this.n > 1) {
        g.fatto = { ms: this.trascorso(), motivo: '2048' };
        this.arrivi.push(p);
        this.annuncia(p, 'arriva a 2048! 🏆', 'sei arrivato a 2048! 🏆', true);
        return this.chiudi();
      }
      this.annuncia(p, '', 'hai fatto 2048! 🏆 Puoi continuare', true);
    }
    if (!puoMuovere(g.valori())) {
      g.fatto = { ms: this.trascorso(), motivo: 'bloccato' };
      if (this.n > 1) this.annuncia(p, `è bloccato con ${g.punti} punti`, `niente più mosse: ${g.punti} punti`);
      if (!this.attesi().length && this.griglie.every((x) => x.fatto !== null)) return this.chiudi();
    }
    return { ok: true };
  }

  // il trucco segreto (!win): le prossime mosse migliori, calcolate sapendo già quali tessere usciranno
  suggerimentoWin(p) {
    const g = this.griglie[p];
    if (this.finita || this.inPausa || !g || g.fatto !== null) return null;
    const mosse = prossimeMosse(g.valori(), g.seme, g.k, 4);
    if (!mosse.length) return null;
    return `💡 ${mosse.map((d) => NOMI_DIR[d]).join(', ')}`;
  }

  // nella sfida chi resta via troppo a lungo smette di giocare (i suoi punti restano)
  salta(p) {
    const g = this.griglie[p];
    if (this.finita || !g || g.fatto !== null) return;
    g.fatto = { ms: this.trascorso(), motivo: 'ritirato' };
    if (this.griglie.every((x) => x.fatto !== null)) this.chiudi();
  }

  chiudi() {
    this.chiusa = Date.now();
    this.finita = true;
    const punti = this.griglie.map((g) => g.punti);
    let vincitori;
    if (this.n === 1) {
      const lista = (RECORD.solo = RECORD.solo || []);
      const voce = { punti: punti[0], max: this.griglie[0].max, mosse: this.griglie[0].mosse, id: Math.random() };
      lista.push(voce); lista.sort((a, b) => b.punti - a.punti); lista.splice(5);
      this.posizioneRecord = lista.indexOf(voce);
      vincitori = this.griglie[0].vinto ? [0] : [];
      this.risultato = { fazioni: [{ posti: [0], punti: punti[0] }], etichetta: 'punti', pareggio: false, vincitori };
      if (!vincitori.length) this.risultato.titolo = `Niente più mosse · tessera più alta ${this.griglie[0].max}`;
      this.annuncia(0, '', `niente più mosse: ${punti[0]} punti`, true);
      return { ok: true };
    }
    if (this.arrivi.length) vincitori = [this.arrivi[0]];
    else {
      const max = Math.max(...punti);
      vincitori = punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    }
    const chiave = `sfida:${this.minuti}`;
    const lista = (RECORD[chiave] = RECORD[chiave] || []);
    const meglio = Math.max(...punti), chi = punti.indexOf(meglio);
    const voce = { punti: meglio, max: this.griglie[chi].max, mosse: this.griglie[chi].mosse, id: Math.random() };
    lista.push(voce); lista.sort((a, b) => b.punti - a.punti); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    if (!this.evento || !this.evento.forte) this.annuncia(null, 'Partita finita', '', true);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori };
    return { ok: true };
  }

  vista(p) {
    const g = this.griglie[p] || this.griglie[0];
    const chiave = this.n === 1 ? 'solo' : `sfida:${this.minuti}`;
    return {
      gioco: this.id, n: this.n, lato: L, obiettivo: OBIETTIVO, minuti: this.minuti, partita: this.idPartita,
      tessere: g.t.map((x, i) => (x ? { id: x.id, v: x.v, i } : null)).filter(Boolean),
      fusioni: g.fusioni, nuova: g.nuova, nMossa: g.nMossa, punti: g.punti, mosse: g.mosse, max: g.max, fatto: g.fatto, vinto: !!g.vinto,
      // degli altri si vedono punti, tessera più alta e una griglia in miniatura
      altri: this.griglie.map((x) => ({ punti: x.punti, max: x.max, fatto: x.fatto, mini: x.valori() })),
      resta: this.fine ? Math.max(0, this.fine - Date.now()) : null, trascorso: this.trascorso(), inPausa: this.inPausa,
      record: RECORD[chiave] || [], posizioneRecord: this.finita ? this.posizioneRecord : -1,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// quanto aspetta tra una mossa e l'altra (millisecondi): il difficile pensa meglio, non solo più in fretta
const ritmo = (l) => ({ facile: 650 + Math.random() * 700, medio: 450 + Math.random() * 450, difficile: 380 + Math.random() * 300 }[l] || 700);

// valutazione di una griglia: caselle vuote, tessere in fila crescente (monotonia), vicine simili (liscia) e la più
// grande in un angolo
const LIV = new Int8Array(16);
function valuta(c) {
  let vuote = 0, liscia = 0, m0 = 0, m1 = 0, m2 = 0, m3 = 0, max = 0;
  const l = LIV;
  for (let i = 0; i < 16; i++) { const v = c[i]; l[i] = v ? 31 - Math.clz32(v) : 0; if (!v) vuote++; if (l[i] > max) max = l[i]; }
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
    const a = l[r * 4 + k], b = l[r * 4 + k + 1];
    if (a > b) m0 += b - a; else m1 += a - b;
    if (a && b) liscia -= a > b ? a - b : b - a;
  }
  for (let cc = 0; cc < 4; cc++) for (let k = 0; k < 3; k++) {
    const a = l[k * 4 + cc], b = l[(k + 1) * 4 + cc];
    if (a > b) m2 += b - a; else m3 += a - b;
    if (a && b) liscia -= a > b ? a - b : b - a;
  }
  const angolo = l[0] === max || l[3] === max || l[12] === max || l[15] === max ? max * 2 : 0;
  return vuote * 2.7 + Math.max(m0, m1) + Math.max(m2, m3) + liscia * 0.1 + angolo;
}
// expectimax: la mossa (max) e poi la tessera nuova (media su tutte le caselle vuote, 2 al 90% e 4 al 10%)
function expectimax(c, prof) {
  let meglio = -Infinity;
  for (const d of DIREZIONI) {
    const s = scorri(c, d);
    if (!s.mosso) continue;
    const v = caso(s.celle, prof - 1) + s.punti * 0.002;
    if (v > meglio) meglio = v;
  }
  return meglio === -Infinity ? -1000 : meglio;
}
function caso(c, prof) {
  if (prof <= 0) return valuta(c);
  const vuote = []; for (let i = 0; i < 16; i++) if (!c[i]) vuote.push(i);
  if (!vuote.length) return valuta(c);
  // con tante caselle vuote se ne guarda un campione (le mosse restano veloci)
  const campione = vuote.length > 6 ? vuote.filter((_, k) => k % Math.ceil(vuote.length / 6) === 0) : vuote;
  let tot = 0;
  for (const i of campione) {
    for (const [v, p] of [[2, 0.9], [4, 0.1]]) { c[i] = v; tot += p * expectimax(c, prof); c[i] = 0; }
  }
  return tot / campione.length;
}

// la mossa del difficile, senza caso
function mossaMigliore(c) {
  let meglio = null, v = -Infinity;
  for (const d of DIREZIONI) {
    const s = scorri(c, d);
    if (!s.mosso) continue;
    const val = caso(s.celle, c.filter((x) => !x).length <= 4 ? 2 : 1) + s.punti * 0.002;
    if (val > v) { v = val; meglio = d; }
  }
  return meglio;
}
// le prossime "quante" mosse migliori: le tessere nuove sono già decise dal seme, quindi si possono prevedere
const NOMI_DIR = { su: '⬆️ su', giu: '⬇️ giù', sx: '⬅️ sinistra', dx: '➡️ destra' };
function prossimeMosse(c, seme, k, quante) {
  const out = [];
  for (let n = 0; n < quante; n++) {
    const d = mossaMigliore(c);
    if (!d) break;
    out.push(d);
    c = scorri(c, d).celle;
    const vuote = []; for (let i = 0; i < 16; i++) if (!c[i]) vuote.push(i);
    if (!vuote.length) break;
    const t = tesseraN(seme, k++);
    c[vuote[Math.floor(t.x * vuote.length)]] = t.v;
  }
  return out;
}

function bot(g, p, livello) {
  const gr = g.griglie[p];
  const c = gr.valori();
  const possibili = DIREZIONI.filter((d) => scorri(c, d).mosso);
  const muovi = (dir) => ({ tipo: 'muovi', dir });
  if (!possibili.length) return muovi('giu');
  if (livello === 'facile') {
    // a caso, ma con una preferenza per giù e sinistra (il trucco che conoscono tutti)
    const pesi = possibili.map((d) => ({ giu: 4, sx: 3, dx: 1.5, su: 0.6 }[d]));
    let x = Math.random() * pesi.reduce((a, b) => a + b, 0);
    for (let k = 0; k < possibili.length; k++) { x -= pesi[k]; if (x <= 0) return muovi(possibili[k]); }
    return muovi(possibili[0]);
  }
  if (livello === 'medio') {
    // goloso: la mossa che lascia più caselle vuote e fa più fusioni subito
    let meglio = null, v = -Infinity;
    for (const d of possibili) {
      const s = scorri(c, d);
      const val = s.celle.filter((x) => !x).length * 10 + s.fusioni * 4 + Math.log2(s.punti + 1) + ({ giu: 1, sx: 0.8, dx: 0.3, su: 0 }[d]) + Math.random();
      if (val > v) { v = val; meglio = d; }
    }
    return muovi(meglio);
  }
  // difficile: expectimax a profondità 2 (3 quando la griglia è piena e serve più attenzione)
  const vuote = c.filter((x) => !x).length;
  const prof = vuote <= 4 ? 3 : 2;
  let meglio = possibili[0], v = -Infinity;
  for (const d of possibili) {
    const s = scorri(c, d);
    // un pizzico di caso tra mosse quasi uguali: due computer difficili non giocano proprio identici
    const val = caso(s.celle, prof - 1) + s.punti * 0.002 + Math.random() * 0.2;
    if (val > v) { v = val; meglio = d; }
  }
  return muovi(meglio);
}

module.exports = {
  meta: {
    id: 'duemila',
    nome: '2048',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4],
    descrizione: 'Fai scorrere le tessere e fondi quelle uguali fino a 2048. Da soli o in sfida con le stesse tessere per tutti.',
    alias: ['duemila', '2048', 'tessere', 'numeri', 'somma'],
    opzioni: [
      { id: 'minuti', nome: 'Tempo della sfida', valori: [3, 2, 5], etichette: ['3 minuti', '2 minuti', '5 minuti'], predefinito: 3 },
    ],
    regole: [
      'Sulla griglia 4×4 ci sono tessere con dei numeri. Con le frecce (o W A S D) oppure facendo scorrere il dito sulla griglia, sposti TUTTE le tessere in quella direzione finché si fermano.',
      'Due tessere con lo stesso numero che si scontrano si fondono in una sola che vale la somma (2+2=4, 4+4=8…) e i punti aumentano di quel valore. Dopo ogni mossa compare una tessera nuova: un 2 (a volte un 4).',
      'Da soli: l\'obiettivo è arrivare alla tessera 2048 (poi puoi continuare per fare più punti). La partita finisce quando la griglia è piena e non ci sono più fusioni possibili. I punteggi migliori finiscono in classifica.',
      'Sfida (da 2 a 4): ognuno gioca sulla sua griglia, ma le tessere nuove arrivano per tutti nello stesso ordine e con la stessa regola, quindi conta solo la bravura. Vince chi arriva prima a 2048; altrimenti, allo scadere del tempo (2, 3 o 5 minuti, si sceglie prima), chi ha più punti. Chi resta senza mosse si ferma con i punti che ha.',
      'Consiglio: tieni la tessera più grande in un angolo e le altre in fila decrescente vicino a lei.',
      'Il computer della sfida muove col suo ritmo: il facile a caso (preferendo giù e sinistra), il medio sceglie la mossa che lascia più caselle libere e fa più fusioni, il difficile guarda avanti di 2-3 mosse calcolando le tessere che possono uscire (expectimax) e tiene la tessera più grande in un angolo.',
      'Da soli, con le dispense aperte la partita si ferma; nella sfida il tempo corre per tutti.',
    ],
  },
  crea: (o) => new Duemila(o),
  bot,
  _test: { scorri, puoMuovere, tesseraN, Griglia, ritmo, OBIETTIVO, RECORD, prossimeMosse },
};
