// BATTAGLIA NAVALE: da 2 a 4 giocatori, tutti contro tutti.
// Fase 1 (schieramento): tutti schierano la flotta nello stesso momento.
// Fase 2 (battaglia): a turno ognuno spara un colpo alla griglia di un avversario ancora in gioco.
const R = require('./navale-regole');
const { LATO, FLOTTE, NOMI, celleNave, intorno } = R;
const { casuale: aCaso } = require('./carte');

class Battaglia {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'battaglia';
    this.n = n;
    this.flotta = FLOTTE[opzioni.flotta] ? opzioni.flotta : 'italiana';
    this.fase = 'schieramento';
    this.primo = primo;
    this.turno = null;
    this.navi = Array.from({ length: n }, () => null);
    this.colpi = Array.from({ length: n }, () => new Array(LATO * LATO).fill(null)); // colpi ricevuti: null, 'a' (acqua), 'x' (colpito)
    this.vivo = new Array(n).fill(true);
    this.eliminati = [];
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultimo = null;
  }

  // testoTe: come lo legge chi è stato colpito
  annuncia(posto, testo, testoIo, bersaglio = null, forte = false, testoTe = null) {
    this.evento = { id: ++this.nEv, posto, testo, testoIo, bersaglio, forte, testoTe };
  }

  // chi deve ancora agire nella fase simultanea (lo usa il server per i giocatori del computer)
  attesi() { return this.fase === 'schieramento' ? this.navi.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0) : []; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a) return { errore: 'Mossa non valida' };
    if (this.fase === 'schieramento') {
      if (a.tipo !== 'schiera') return { errore: 'Prima schiera la flotta' };
      if (this.navi[p]) return { errore: 'Hai già schierato la flotta' };
      const errore = R.valida(a.navi, this.flotta);
      if (errore) return { errore };
      this.navi[p] = a.navi.map((x) => {
        const nave = { r: Number(x.r), c: Number(x.c), lung: Number(x.lung), vert: !!x.vert };
        return { ...nave, celle: celleNave(nave), affondata: false };
      });
      if (this.navi.every(Boolean)) {
        this.fase = 'battaglia';
        this.turno = this.primo;
        this.annuncia(null, 'Flotte schierate: si comincia!', '', null, true);
      }
      return { ok: true };
    }
    if (a.tipo !== 'spara') return { errore: 'Mossa non valida' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    const b = Number(a.bersaglio);
    const i = Number(a.cella);
    if (!(b >= 0 && b < this.n) || b === p) return { errore: 'Scegli la griglia di un avversario' };
    if (!this.vivo[b]) return { errore: 'Questa flotta è già stata affondata' };
    if (!(i >= 0 && i < LATO * LATO)) return { errore: 'Casella non valida' };
    if (this.colpi[b][i]) return { errore: 'Hai già sparato qui' };

    const nave = this.navi[b].find((x) => x.celle.includes(i));
    this.colpi[b][i] = nave ? 'x' : 'a';
    let esito = 'acqua';
    if (nave) {
      esito = 'colpito';
      if (nave.celle.every((k) => this.colpi[b][k] === 'x')) {
        nave.affondata = true;
        esito = 'affondato';
        if (this.navi[b].every((x) => x.affondata)) {
          this.vivo[b] = false;
          this.eliminati.push(b);
        }
      }
    }
    this.ultimo = { da: p, su: b, cella: i, esito };
    if (esito === 'acqua') this.annuncia(p, 'spara a @: acqua', 'acqua', b, false, 'ti spara: acqua');
    else if (esito === 'colpito') this.annuncia(p, 'colpisce una nave di @!', 'colpito!', b, false, 'colpisce una tua nave!');
    else if (!this.vivo[b]) this.annuncia(p, 'affonda l\'ultima nave di @!', 'hai affondato l\'ultima nave di @!', b, true, 'affonda la tua ultima nave: sei fuori');
    else this.annuncia(p, `affonda ${articolo(nave.lung)} di @!`, `affondato! ${cap(articolo(nave.lung))} di @ va a fondo`, b, true, `affonda ${tuo(nave.lung)}!`);

    const rimasti = this.vivo.filter(Boolean).length;
    if (rimasti <= 1) return this.chiudi();
    do this.turno = (this.turno + 1) % this.n; while (!this.vivo[this.turno]);
    return { ok: true };
  }

  // trucco segreto (!win): dove c'è una nave nemica non ancora colpita (prima quelle già colpite, poi la più grande)
  suggerimentoWin(p) {
    if (this.finita || this.fase !== 'battaglia' || this.turno !== p) return null;
    let meglio = null, mv = -1;
    for (let b = 0; b < this.n; b++) {
      if (b === p || !this.vivo[b]) continue;
      for (const x of this.navi[b]) {
        if (x.affondata) continue;
        const v = (x.celle.some((k) => this.colpi[b][k] === 'x') ? 100 : 0) + x.lung;
        if (v > mv) { mv = v; meglio = { b, x }; }
      }
    }
    if (!meglio) return null;
    const { b, x } = meglio;
    const libere = x.celle.filter((k) => !this.colpi[b][k]);
    const nome = (k) => `${'ABCDEFGHIJ'[Math.floor(k / LATO)]}${(k % LATO) + 1}`;
    const di = this.n > 2 && this.nomiGiocatori && this.nomiGiocatori[b] ? ` di ${this.nomiGiocatori[b]}` : '';
    return `💡 Spara in ${nome(libere[0])}: c'è una nave${di}${libere.length > 1 ? ` (anche in ${libere.slice(1).map(nome).join(', ')})` : ''}`;
  }

  galla(p) { return this.navi[p] ? this.navi[p].reduce((s, x) => s + x.celle.filter((k) => this.colpi[p][k] !== 'x').length, 0) : 0; }

  chiudi() {
    this.finita = true;
    this.turno = null;
    const vince = this.vivo.findIndex(Boolean);
    this.risultato = {
      fazioni: Array.from({ length: this.n }, (_, p) => ({ posti: [p], punti: this.galla(p) })),
      etichetta: 'caselle a galla',
      pareggio: false,
      vincitori: [vince],
    };
    return { ok: true };
  }

  griglia(p, mia) {
    const navi = this.navi[p] || [];
    const affondate = navi.filter((x) => x.affondata);
    const acquaCerta = new Set();
    for (const x of affondate) intorno(x.celle).forEach((k) => { if (!this.colpi[p][k]) acquaCerta.add(k); });
    return {
      colpi: this.colpi[p],
      affondate: affondate.map(({ r, c, lung, vert }) => ({ r, c, lung, vert })),
      acquaCerta: [...acquaCerta],
      vivo: this.vivo[p],
      pronto: !!this.navi[p],
      rimaste: navi.filter((x) => !x.affondata).map((x) => x.lung).sort((a, b) => b - a),
      navi: mia || this.finita ? navi.map(({ r, c, lung, vert, affondata }) => ({ r, c, lung, vert, affondata })) : null,
    };
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, lato: LATO, fase: this.fase, flotta: this.flotta, composizione: FLOTTE[this.flotta],
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      ultimo: this.ultimo, eliminati: this.eliminati,
      griglie: Array.from({ length: this.n }, (_, k) => this.griglia(k, k === p)),
    };
  }
}
const articolo = (l) => (l === 5 ? 'la portaerei' : l === 4 ? 'la corazzata' : l === 3 ? 'l\'incrociatore' : l === 2 ? 'il cacciatorpediniere' : 'il sommergibile');
const tuo = (l) => (l === 5 ? 'la tua portaerei' : l === 4 ? 'la tua corazzata' : l === 3 ? 'il tuo incrociatore' : l === 2 ? 'il tuo cacciatorpediniere' : 'il tuo sommergibile');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// =================== COMPUTER ===================
// Cosa sa chi spara sulla griglia di b: colpi, navi affondate e caselle che per forza sono acqua.
function conoscenza(g, b) {
  const colpi = g.colpi[b];
  const navi = g.navi[b];
  const affondateCelle = new Set();
  const vietate = new Set(); // non possono contenere navi ancora a galla
  for (const x of navi) if (x.affondata) { x.celle.forEach((k) => { affondateCelle.add(k); vietate.add(k); }); intorno(x.celle).forEach((k) => vietate.add(k)); }
  const aperti = []; // colpiti di navi non ancora affondate
  colpi.forEach((v, k) => { if (v === 'x' && !affondateCelle.has(k)) aperti.push(k); });
  // la diagonale di un colpito non può essere nave (le navi sono dritte e non si toccano)
  for (const k of aperti) {
    const r = Math.floor(k / LATO), c = k % LATO;
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) if (r + dr >= 0 && r + dr < LATO && c + dc >= 0 && c + dc < LATO) vietate.add((r + dr) * LATO + c + dc);
  }
  colpi.forEach((v, k) => { if (v === 'a') vietate.add(k); });
  const rimaste = navi.filter((x) => !x.affondata).map((x) => x.lung);
  return { colpi, vietate, aperti, rimaste };
}

function libere(con) { return con.colpi.map((v, k) => (v === null && !con.vietate.has(k) ? k : -1)).filter((k) => k >= 0); }

// mappa di probabilità: in quanti modi le navi rimaste possono passare da ogni casella
function densita(con) {
  const peso = new Array(LATO * LATO).fill(0);
  const apertiSet = new Set(con.aperti);
  for (const lung of new Set(con.rimaste)) {
    const quante = con.rimaste.filter((l) => l === lung).length;
    for (let r = 0; r < LATO; r++) for (let c = 0; c < LATO; c++) for (const vert of lung > 1 ? [false, true] : [false]) {
      const n = { r, c, lung, vert };
      if (r + (vert ? lung - 1 : 0) >= LATO || c + (vert ? 0 : lung - 1) >= LATO) continue;
      const cs = celleNave(n);
      if (cs.some((k) => con.vietate.has(k) || con.colpi[k] === 'a')) continue;
      const copre = cs.filter((k) => apertiSet.has(k)).length;
      // una nave vicina a un colpito aperto senza coprirlo è impossibile (si toccherebbero)
      if (con.aperti.length && intorno(cs).some((k) => apertiSet.has(k)) && copre === 0) continue;
      if (con.aperti.length && copre === 0) continue; // in modalità "caccia" contano solo le posizioni che spiegano i colpiti
      const w = quante * (copre ? 40 ** copre : 1);
      for (const k of cs) if (con.colpi[k] === null) peso[k] += w;
    }
  }
  return peso;
}

function mossaMedio(con) {
  const lib = libere(con);
  if (con.aperti.length) {
    // allinea i colpiti: se sono 2+ in fila prosegue sulla linea, altrimenti prova attorno
    const cand = new Set();
    const ap = con.aperti;
    const stessaRiga = ap.length > 1 && ap.every((k) => Math.floor(k / LATO) === Math.floor(ap[0] / LATO));
    const stessaCol = ap.length > 1 && ap.every((k) => k % LATO === ap[0] % LATO);
    for (const k of ap) {
      const r = Math.floor(k / LATO), c = k % LATO;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (stessaRiga && dr) continue;
        if (stessaCol && dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < LATO && cc >= 0 && cc < LATO) cand.add(rr * LATO + cc);
      }
    }
    const buone = lib.filter((k) => cand.has(k));
    if (buone.length) return aCaso(buone);
  }
  const minima = Math.min(...con.rimaste);
  const scacchiera = lib.filter((k) => (Math.floor(k / LATO) + (k % LATO)) % Math.max(2, minima) === 0);
  return aCaso(scacchiera.length ? scacchiera : lib);
}

function mossaDifficile(con) {
  const peso = densita(con);
  let max = -1, migliori = [];
  peso.forEach((w, k) => {
    if (con.colpi[k] !== null || con.vietate.has(k)) return;
    if (w > max) { max = w; migliori = [k]; } else if (w === max) migliori.push(k);
  });
  return migliori.length && max > 0 ? aCaso(migliori) : aCaso(libere(con));
}

function bot(g, p, livello) {
  if (g.fase === 'schieramento') return { tipo: 'schiera', navi: R.casuale(g.flotta) };
  const avversari = [];
  for (let k = 0; k < g.n; k++) if (k !== p && g.vivo[k]) avversari.push(k);
  const conosc = new Map(avversari.map((b) => [b, conoscenza(g, b)]));
  let b;
  const conAperti = avversari.filter((k) => conosc.get(k).aperti.length);
  if (livello === 'facile') {
    b = aCaso(avversari);
    const con = conosc.get(b);
    // il facile a volte "ricorda" un colpo andato a segno
    if (con.aperti.length && Math.random() < 0.5) return { tipo: 'spara', bersaglio: b, cella: mossaMedio(con) };
    return { tipo: 'spara', bersaglio: b, cella: aCaso(con.colpi.map((v, k) => (v === null ? k : -1)).filter((k) => k >= 0)) };
  }
  if (conAperti.length) b = aCaso(conAperti);
  else if (livello === 'difficile') {
    // punta chi ha meno navi a galla: così elimina gli avversari prima
    const galla = (k) => conosc.get(k).rimaste.reduce((s, l) => s + l, 0);
    const minimo = Math.min(...avversari.map(galla));
    b = aCaso(avversari.filter((k) => galla(k) === minimo));
  } else b = aCaso(avversari);
  const con = conosc.get(b);
  return { tipo: 'spara', bersaglio: b, cella: livello === 'medio' ? mossaMedio(con) : mossaDifficile(con) };
}

module.exports = {
  meta: {
    id: 'battaglia',
    nome: 'Battaglia navale',
    tipo: 'tabellone',
    giocatori: [2, 3, 4],
    descrizione: 'Schiera la flotta e affonda le navi degli avversari. Da 3 in su, tutti contro tutti.',
    opzioni: [
      { id: 'flotta', nome: 'Flotta', valori: ['italiana', 'classica'], etichette: ['Italiana (4-3-3-2-2-2-1-1-1-1)', 'Classica (5-4-3-3-2)'], predefinito: 'italiana' },
    ],
    regole: [
      'Ognuno ha una griglia 10×10, con righe da A a J e colonne da 1 a 10, dove schiera la propria flotta senza farla vedere agli altri.',
      'Flotta italiana: 1 corazzata da 4 caselle, 2 incrociatori da 3, 3 cacciatorpedinieri da 2 e 4 sommergibili da 1. Flotta classica: portaerei da 5, corazzata da 4, due navi da 3 e una da 2.',
      'Le navi stanno in orizzontale o in verticale e non possono toccarsi, nemmeno in diagonale.',
      'Schieramento: scegli una nave, clicca sulla griglia per posizionarla e premi R (o il pulsante Ruota) per girarla. Clicca una nave già messa per toglierla. "Casuale" le dispone tutte da solo. Quando hai finito premi Pronto.',
      'Battaglia: a turno si spara un colpo, cliccando una casella nella griglia di un avversario ancora in gioco. Anche se colpisci, il turno passa al giocatore successivo.',
      'Acqua: nessuna nave. Colpito: hai preso una nave. Affondato: hai colpito tutte le sue caselle. Attorno a una nave affondata le caselle vengono segnate come acqua, perché le navi non si toccano.',
      'I colpi sono visibili a tutti. Chi perde tutte le navi è eliminato. Vince l\'ultimo giocatore con almeno una nave a galla.',
    ],
  },
  crea: (o) => new Battaglia(o),
  bot,
  _test: { conoscenza, densita },
};
