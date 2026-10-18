// SOLITARIO PIRAMIDE: 28 carte a piramide (7 file), le altre 24 nel tallone. Si tolgono le carte a coppie che fanno
// 13 (asso 1, fante 11, donna 12; il re vale 13 e si toglie da solo). Si possono usare solo le carte libere: quelle
// della piramide che non hanno carte sopra, e la carta in cima agli scarti. Dal tallone si gira una carta alla volta
// sugli scarti; finito il tallone si può rigirare (quante volte dipende dall'opzione). Si vince svuotando la piramide.
// Le distribuzioni sono controllate da un risolutore: ognuna si può vincere, e la sua soluzione guida aiuto e computer.
// Da soli per il tempo; in sfida (2-8) tutti hanno la stessa distribuzione.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, mescola } = require('../giochi2/rompicapo-sfida');

const SEMI = ['c', 'q', 'f', 'p'];
const GIRI = { tre: 3, uno: 1, cinque: 5 };
const AIUTO_MS = 15000;
const RECORD = {};
const sopra = (k) => { const r = Math.floor((Math.sqrt(8 * k + 1) - 1) / 2), i = k - (r * (r + 1)) / 2; return r === 6 ? [] : [(r + 1) * (r + 2) / 2 + i, (r + 1) * (r + 2) / 2 + i + 1]; };
const SOPRA = Array.from({ length: 28 }, (_, k) => sopra(k));

// libere: carte della piramide ancora in gioco senza carte sopra
const libera = (tolte, k) => !(tolte & (1 << k)) && SOPRA[k].every((j) => tolte & (1 << j));
// la carta in cima agli scarti (indice nel tallone) oppure -1
function cimaScarti(sp, tolteT) { for (let i = sp - 1; i >= 0; i--) if (!(tolteT & (1 << i))) return i; return -1; }

// RISOLUTORE (ricerca in profondità con memoria). Stato: carte tolte dalla piramide (28 bit), carte girate dal
// tallone (sp), carte tolte dal tallone (24 bit), giro. Restituisce le mosse oppure null.
function risolvi(pir, tal, maxGiri, inizio = { tolte: 0, sp: 0, tolteT: 0, giro: 1 }, limite = 200000) {
  const visti = new Set();
  const PIENA = (1 << 28) - 1;
  let nodi = 0;
  const mosse = [];
  const val = (c) => c.rango;
  const rec = (tolte, sp, tolteT, giro) => {
    if (tolte === PIENA) return true;
    if (++nodi > limite) return false;
    const k = `${tolte},${sp},${tolteT},${giro}`;
    if (visti.has(k)) return false;
    visti.add(k);
    const lib = [];
    for (let i = 0; i < 28; i++) if (libera(tolte, i)) lib.push(i);
    const w = cimaScarti(sp, tolteT);
    // 1) re da soli, 2) coppie nella piramide, 3) coppie con lo scarto
    for (const i of lib) if (val(pir[i]) === 13) { mosse.push({ tipo: 'togli', a: { p: i } }); if (rec(tolte | (1 << i), sp, tolteT, giro)) return true; mosse.pop(); }
    for (let x = 0; x < lib.length; x++) for (let y = x + 1; y < lib.length; y++) {
      const a = lib[x], b = lib[y];
      if (val(pir[a]) + val(pir[b]) === 13) { mosse.push({ tipo: 'coppia', a: { p: a }, b: { p: b } }); if (rec(tolte | (1 << a) | (1 << b), sp, tolteT, giro)) return true; mosse.pop(); }
    }
    if (w >= 0) {
      if (val(tal[w]) === 13) { mosse.push({ tipo: 'togli', a: { s: 1 } }); if (rec(tolte, sp, tolteT | (1 << w), giro)) return true; mosse.pop(); }
      for (const i of lib) if (val(pir[i]) + val(tal[w]) === 13) { mosse.push({ tipo: 'coppia', a: { p: i }, b: { s: 1 } }); if (rec(tolte | (1 << i), sp, tolteT | (1 << w), giro)) return true; mosse.pop(); }
    }
    // 4) girare una carta, o rigirare il tallone
    let nsp = sp;
    while (nsp < 24 && tolteT & (1 << nsp)) nsp++; // le carte già tolte del tallone si saltano
    if (nsp < 24) { mosse.push({ tipo: 'pesca' }); if (rec(tolte, nsp + 1, tolteT, giro)) return true; mosse.pop(); }
    else if (giro < maxGiri) { mosse.push({ tipo: 'pesca' }); if (rec(tolte, 0, tolteT, giro + 1)) return true; mosse.pop(); }
    return false;
  };
  const ok = rec(inizio.tolte, inizio.sp, inizio.tolteT, inizio.giro);
  return ok ? { mosse, nodi } : { mosse: null, nodi, troppo: nodi > limite };
}

function mazzo52() { const m = []; for (const s of SEMI) for (let r = 1; r <= 13; r++) m.push({ id: `${r}${s}`, rango: r, seme: s }); return m; }
// una distribuzione vincibile (si riprova finché il risolutore trova la soluzione)
function distribuzione(maxGiri) {
  for (let t = 0; t < 3000; t++) {
    const m = mescola(mazzo52());
    const pir = m.slice(0, 28), tal = m.slice(28);
    const r = risolvi(pir, tal, maxGiri, undefined, 3000); // poche migliaia di posizioni: le distribuzioni difficili si scartano in fretta
    if (r.mosse) return { pir, tal, soluzione: r.mosse };
  }
  throw new Error('nessuna distribuzione vincibile');
}

class Piramide extends SfidaRompicapo {
  constructor(o) {
    super('piramide', o, 20 * 60000);
    const op = o.opzioni || {};
    this.idGiri = GIRI[op.giri] ? op.giri : 'tre';
    this.maxGiri = GIRI[this.idGiri];
    const d = distribuzione(this.maxGiri);
    this.pir = d.pir; this.tal = d.tal; this.soluzione = d.soluzione;
    this.tavole = Array.from({ length: this.n }, () => ({ tolte: 0, sp: 0, tolteT: 0, giro: 1, indietro: [], mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, suggerimento: null }));
    this.avvia();
  }

  tempoDi(p) { const t = this.tavole[p]; return t.fatto != null ? t.fatto : this.cronometro() + t.penale; }
  quante(t) { let n = 0; for (let i = 0; i < 28; i++) if (t.tolte & (1 << i)) n++; return n; }
  progresso(i, t) { return this.quante(t) / 28; }
  risolta(p, t) { return t.tolte === (1 << 28) - 1; }
  fraseArrivo(p, t) { return { altri: `svuota la piramide in ${t.mosse} mosse! 🔺`, io: 'Piramide svuotata! 🔺' }; }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }
  // il valore di una carta indicata dal browser: { p: indice della piramide } o { s: 1 } (cima degli scarti)
  carta(t, r) {
    if (r && Number.isInteger(r.p) && r.p >= 0 && r.p < 28) return libera(t.tolte, r.p) ? this.pir[r.p] : null;
    if (r && r.s) { const w = cimaScarti(t.sp, t.tolteT); return w >= 0 ? this.tal[w] : null; }
    return null;
  }
  togliRif(t, r) { if (r.p != null) t.tolte |= 1 << r.p; else t.tolteT |= 1 << cimaScarti(t.sp, t.tolteT); }
  salva(t) { t.indietro.push([t.tolte, t.sp, t.tolteT, t.giro]); if (t.indietro.length > 500) t.indietro.shift(); }

  mossa(p, t, a) {
    if (a.tipo === 'togli' || a.tipo === 'coppia') {
      const x = this.carta(t, a.a), y = a.tipo === 'coppia' ? this.carta(t, a.b) : null;
      if (!x || (a.tipo === 'coppia' && !y)) return { errore: 'Si possono usare solo le carte libere' };
      if (a.tipo === 'togli' && x.rango !== 13) return { errore: 'Da sola si toglie solo il re' };
      if (a.tipo === 'coppia') {
        if ((a.a.s && a.b.s) || (a.a.p != null && a.a.p === a.b.p)) return { errore: 'Servono due carte diverse' };
        if (x.rango + y.rango !== 13) return { errore: 'Le due carte devono fare 13' };
      }
      this.salva(t);
      this.togliRif(t, a.a); if (a.tipo === 'coppia') this.togliRif(t, a.b);
      t.mosse++; t.suggerimento = null;
      return { ok: true };
    }
    if (a.tipo === 'pesca') {
      let nsp = t.sp;
      while (nsp < 24 && t.tolteT & (1 << nsp)) nsp++;
      if (nsp < 24) { this.salva(t); t.sp = nsp + 1; }
      else if (t.giro < this.maxGiri) { this.salva(t); t.sp = 0; t.giro++; }
      else return { errore: 'Il tallone è finito e non si può più rigirare' };
      t.mosse++; t.suggerimento = null;
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      [t.tolte, t.sp, t.tolteT, t.giro] = u; t.suggerimento = null; t.mosse++;
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      const r = risolvi(this.pir, this.tal, this.maxGiri, t, 40000);
      if (!r.mosse) return { errore: r.troppo ? 'Posizione troppo complicata per l\'aiuto: prova ad annullare' : 'Da qui non si vince più: annulla qualche mossa' };
      t.suggerimento = r.mosse[0];
      t.aiuti++; t.penale += AIUTO_MS;
      this.annuncia(p, 'chiede un aiuto (+15 s)', 'aiuto: la mossa giusta lampeggia (+15 s)');
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  // ---- computer: segue la soluzione (o la ricalcola); il facile ogni tanto pesca a vuoto ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const t = this.tavole[p];
    const r = t.mosse === 0 ? { mosse: this.soluzione.slice() } : risolvi(this.pir, this.tal, this.maxGiri, t, 40000);
    const passi = r.mosse ? r.mosse.length : 1;
    const sec = 2.1 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { coda: r.mosse ? r.mosse.slice() : [], totale: passi * sec * 1000, passi });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const m = this.pianoBot(p, livello), t = this.tavole[p];
    const svista = { facile: 0.06, medio: 0.015, difficile: 0 }[livello] || 0;
    if (Math.random() < svista && t.sp < 24) { this.menti[p] = null; return { tipo: 'pesca' }; }
    if (!m.coda.length) { this.menti[p] = null; return t.indietro.length ? { tipo: 'annulla' } : { tipo: 'pensa' }; }
    return m.coda.shift();
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.idGiri] = RECORD[this.idGiri] || []);
    const voce = { ms: t.fatto, mosse: t.mosse, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = `Piramide svuotata in ${t.mosse} mosse${t.aiuti ? ` (${t.aiuti} aiuti)` : ''}`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const w = cimaScarti(t.sp, t.tolteT);
    let restano = 0; for (let i = t.sp; i < 24; i++) if (!(t.tolteT & (1 << i))) restano++;
    const sotto = []; // le due carte sotto la cima degli scarti (si vedono un po')
    for (let i = w - 1; i >= 0 && sotto.length < 2; i--) if (!(t.tolteT & (1 << i))) sotto.push(this.tal[i]);
    return {
      ...this.vistaComune(p),
      piramide: this.pir.map((c, i) => (t.tolte & (1 << i) ? null : c)), libere: Array.from({ length: 28 }, (_, i) => libera(t.tolte, i)),
      scarto: w >= 0 ? this.tal[w] : null, sottoScarto: sotto, tallone: restano, giro: t.giro, maxGiri: this.maxGiri,
      puoRigirare: restano === 0 && t.giro < this.maxGiri, tolte: this.quante(t), mosse: t.mosse,
      suggerimento: t.suggerimento, aiuti: t.aiuti, penale: t.penale, puoAnnullare: t.indietro.length > 0,
      tolteAltri: this.tavole.map((x) => this.quante(x)),
      record: this.sfida ? [] : RECORD[this.idGiri] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'piramide',
    nome: 'Solitario Piramide',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Togli le carte a coppie che fanno 13 (il re da solo) fino a svuotare la piramide. Ogni distribuzione si può vincere. Da soli o in gara.',
    alias: ['piramide', 'solitario piramide', 'pyramid', 'tredici', 'solitario del 13'],
    opzioni: [
      { id: 'giri', nome: 'Tallone', valori: Object.keys(GIRI), etichette: ['Si gira 3 volte', 'Una volta sola (difficile)', 'Si gira 5 volte (facile)'], predefinito: 'tre' },
    ],
    regole: [
      'Le carte sono 52: 28 formano una piramide di 7 file, le altre 24 stanno nel tallone. Valori: asso 1, dal 2 al 10 quello che c\'è scritto, fante 11, donna 12, re 13.',
      'Si tolgono due carte alla volta che insieme fanno 13 (per esempio 6 e 7, asso e donna, 3 e 10). Il re fa già 13: si toglie da solo.',
      'Si possono usare solo le carte LIBERE: quelle della piramide senza nessuna carta sopra (all\'inizio solo l\'ultima fila) e la carta in cima agli scarti.',
      'Toccando il tallone si gira una carta sugli scarti. Finito il tallone lo si può rigirare: 3 volte in tutto (o una sola, o 5, secondo l\'opzione).',
      'Si vince quando la piramide è vuota (il tallone può restare). Comandi: tocca una carta e poi l\'altra della coppia (il re basta toccarlo). Ctrl+Z annulla. 💡 Aiuto: la mossa giusta lampeggia (+15 secondi).',
      'Ogni distribuzione si può vincere: lo ha controllato il computer prima di darla. Da soli si gioca per il tempo; in sfida (da 2 a 8) tutti hanno le stesse carte e vince chi svuota prima la piramide.',
      'Il computer conosce una soluzione: il difficile è veloce, il medio più lento, il facile è lento e ogni tanto gira una carta a vuoto.',
    ],
  },
  crea: (o) => new Piramide(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { risolvi, distribuzione, libera, cimaScarti, SOPRA, mazzo52 },
};
