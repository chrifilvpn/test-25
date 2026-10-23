// BLOCK BLAST: griglia 8×8, tre pezzi alla volta da incastrare. Le righe e le colonne piene si cancellano.
// Da soli, in collaborazione (una griglia, si mette un pezzo a testa a turno) o in sfida (una griglia a testa,
// stessi pezzi nello stesso ordine per tutti; vince chi fa più punti o chi resiste di più).
const L = 8;

// forme: celle [riga, colonna]
const FORME = (() => {
  const f = {
    p1: [[0, 0]],
    o2h: [[0, 0], [0, 1]], o2v: [[0, 0], [1, 0]],
    o3h: [[0, 0], [0, 1], [0, 2]], o3v: [[0, 0], [1, 0], [2, 0]],
    o4h: [[0, 0], [0, 1], [0, 2], [0, 3]], o4v: [[0, 0], [1, 0], [2, 0], [3, 0]],
    o5h: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], o5v: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    q2: [[0, 0], [0, 1], [1, 0], [1, 1]],
    q3: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    r23: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], r32: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
    a1: [[0, 0], [1, 0], [1, 1]], a2: [[0, 0], [0, 1], [1, 0]], a3: [[0, 0], [0, 1], [1, 1]], a4: [[0, 1], [1, 0], [1, 1]],
    g1: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], g2: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
    g3: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], g4: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],
    l1: [[0, 0], [1, 0], [2, 0], [2, 1]], l2: [[0, 0], [0, 1], [0, 2], [1, 0]], l3: [[0, 0], [0, 1], [1, 1], [2, 1]], l4: [[0, 2], [1, 0], [1, 1], [1, 2]],
    j1: [[0, 1], [1, 1], [2, 0], [2, 1]], j2: [[0, 0], [1, 0], [1, 1], [1, 2]], j3: [[0, 0], [0, 1], [1, 0], [2, 0]], j4: [[0, 0], [0, 1], [0, 2], [1, 2]],
    t1: [[0, 0], [0, 1], [0, 2], [1, 1]], t2: [[0, 1], [1, 0], [1, 1], [2, 1]], t3: [[0, 1], [1, 0], [1, 1], [1, 2]], t4: [[0, 0], [1, 0], [1, 1], [2, 0]],
    s1: [[0, 1], [0, 2], [1, 0], [1, 1]], s2: [[0, 0], [1, 0], [1, 1], [2, 1]], z1: [[0, 0], [0, 1], [1, 1], [1, 2]], z2: [[0, 1], [1, 0], [1, 1], [2, 0]],
    d2: [[0, 0], [1, 1]], d2b: [[0, 1], [1, 0]],
  };
  return f;
})();
// quanto spesso esce ogni forma (i pezzi piccoli e le linee un po' più spesso)
const PESI = {
  p1: 3, o2h: 4, o2v: 4, o3h: 4, o3v: 4, o4h: 3, o4v: 3, o5h: 2, o5v: 2, q2: 5, q3: 2, r23: 2, r32: 2,
  a1: 3, a2: 3, a3: 3, a4: 3, g1: 1, g2: 1, g3: 1, g4: 1,
  l1: 2, l2: 2, l3: 2, l4: 2, j1: 2, j2: 2, j3: 2, j4: 2, t1: 2, t2: 2, t3: 2, t4: 2, s1: 2, s2: 2, z1: 2, z2: 2, d2: 1, d2b: 1,
};
const NOMI_FORME = Object.keys(FORME);
const COLORE_DI = (() => { // un colore per famiglia di forme
  const c = {};
  for (const k of NOMI_FORME) {
    c[k] = /^p1|^d2/.test(k) ? 1 : /^o[23]/.test(k) ? 2 : /^o[45]/.test(k) ? 3 : /^q/.test(k) ? 4 : /^r/.test(k) ? 5
      : /^a/.test(k) ? 6 : /^g/.test(k) ? 7 : /^[lj]/.test(k) ? 8 : /^t/.test(k) ? 9 : 10;
  }
  return c;
})();

// generatore pseudo-casuale con seme: tutti i giocatori della sfida ricevono gli stessi pezzi
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TOT_PESI = NOMI_FORME.reduce((s, k) => s + PESI[k], 0);
function estrai(rnd) {
  let x = rnd() * TOT_PESI;
  for (const k of NOMI_FORME) { x -= PESI[k]; if (x < 0) return k; }
  return NOMI_FORME[0];
}

const entra = (griglia, forma, r, c) => FORME[forma].every(([dr, dc]) => {
  const rr = r + dr, cc = c + dc;
  return rr >= 0 && rr < L && cc >= 0 && cc < L && !griglia[rr * L + cc];
});
function posizioni(griglia, forma) {
  const out = [];
  for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) if (entra(griglia, forma, r, c)) out.push([r, c]);
  return out;
}
const ciSta = (griglia, forma) => { for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) if (entra(griglia, forma, r, c)) return true; return false; };

// mette il pezzo e cancella righe e colonne piene; restituisce la nuova griglia e cosa è successo
function metti(griglia, forma, r, c) {
  const g = griglia.slice();
  const col = COLORE_DI[forma];
  for (const [dr, dc] of FORME[forma]) g[(r + dr) * L + c + dc] = col;
  const righe = [], colonne = [];
  for (let i = 0; i < L; i++) {
    let rp = true, cp = true;
    for (let j = 0; j < L; j++) { if (!g[i * L + j]) rp = false; if (!g[j * L + i]) cp = false; }
    if (rp) righe.push(i);
    if (cp) colonne.push(i);
  }
  const cancellate = new Set();
  for (const i of righe) for (let j = 0; j < L; j++) cancellate.add(i * L + j);
  for (const i of colonne) for (let j = 0; j < L; j++) cancellate.add(j * L + i);
  for (const k of cancellate) g[k] = 0;
  return { griglia: g, righe, colonne, linee: righe.length + colonne.length, cancellate: [...cancellate] };
}

// punti: 1 per quadretto messo; per le linee 10 × linee × linee (più linee insieme valgono molto di più),
// moltiplicato per la combo (mosse di fila che cancellano almeno una linea); griglia vuota +300
function punteggio(forma, esito, combo) {
  let p = FORME[forma].length;
  if (esito.linee) p += 10 * esito.linee * esito.linee * combo;
  if (esito.linee && esito.griglia.every((x) => !x)) p += 300;
  return p;
}

const RECORD = {}; // migliori punteggi in memoria finché il server è acceso: chiave "solo" o "coop"

class Plancia {
  constructor(serie) {
    this.griglia = new Array(L * L).fill(0);
    this.serie = serie; // funzione: numero del pezzo → forma
    this.prossimo = 0;
    this.vassoio = [];
    this.punti = 0;
    this.combo = 0;      // mosse di fila con linee
    this.linee = 0;
    this.pezzi = 0;
    this.vivo = true;
    this.ultimo = null;  // per le animazioni
    this.riempi();
  }
  riempi() { this.vassoio = [0, 1, 2].map(() => this.serie(this.prossimo++)); }
  puoGiocare() { return this.vassoio.some((f) => f && ciSta(this.griglia, f)); }
}

class BlockBlast {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'blockblast';
    this.n = n;
    this.modo = n === 1 ? 'solo' : opzioni.modo === 'sfida' ? 'sfida' : 'coop';
    this.vittoria = opzioni.vittoria === 'resistenza' ? 'resistenza' : 'punti';
    // da soli e in collaborazione la partita si ferma per tutti se qualcuno apre le dispense; nella sfida no
    this.pausaBoss = this.modo !== 'sfida';
    const rnd = mulberry32((Math.random() * 2 ** 32) >>> 0);
    const pezzi = [];
    this.serie = (k) => { while (pezzi.length <= k) pezzi.push(estrai(rnd)); return pezzi[k]; };
    this.plance = this.modo === 'sfida' ? Array.from({ length: n }, () => new Plancia(this.serie)) : [new Plancia(this.serie)];
    this.morti = []; // ordine di chi resta bloccato (sfida)
    this.turno = this.modo === 'sfida' ? null : primo % n;
    this.mosseDi = new Array(n).fill(0);
    this.puntiDi = new Array(n).fill(0); // in collaborazione: i punti portati da ognuno
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nMossa = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  planciaDi(p) { return this.modo === 'sfida' ? this.plance[p] : this.plance[0]; }

  attesi() {
    if (this.modo !== 'sfida' || this.finita) return [];
    return this.plance.map((b, i) => (b.vivo ? i : -1)).filter((i) => i >= 0);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    if (this.modo !== 'sfida' && p !== this.turno) return { errore: 'Tocca a un altro giocatore' };
    const b = this.planciaDi(p);
    if (!b.vivo) return { errore: 'La tua griglia è bloccata' };
    if (!a || a.tipo !== 'metti') return { errore: 'Mossa non valida' };
    const k = Number(a.pezzo), r = Number(a.r), c = Number(a.c);
    if (![0, 1, 2].includes(k) || !b.vassoio[k]) return { errore: 'Pezzo non disponibile' };
    if (!Number.isInteger(r) || !Number.isInteger(c)) return { errore: 'Posizione non valida' };
    const forma = b.vassoio[k];
    if (!entra(b.griglia, forma, r, c)) return { errore: 'Il pezzo non entra lì' };
    const esito = metti(b.griglia, forma, r, c);
    b.combo = esito.linee ? b.combo + 1 : 0;
    const guadagno = punteggio(forma, esito, Math.max(1, b.combo));
    b.griglia = esito.griglia;
    b.punti += guadagno;
    b.linee += esito.linee;
    b.pezzi++;
    b.vassoio[k] = null;
    b.ultimo = { id: ++this.nMossa, forma, r, c, cancellate: esito.cancellate, righe: esito.righe, colonne: esito.colonne, guadagno, combo: b.combo, posto: p };
    this.mosseDi[p]++;
    this.puntiDi[p] += guadagno;
    if (esito.linee >= 2 || b.combo >= 3) this.annuncia(p, `${esito.linee >= 2 ? `${esito.linee} linee insieme` : `combo ×${b.combo}`}! +${guadagno}`, `${esito.linee >= 2 ? `${esito.linee} linee insieme` : `combo ×${b.combo}`}! +${guadagno}`);
    if (b.vassoio.every((x) => !x)) b.riempi();
    if (!b.puoGiocare()) this.blocca(p, b);
    if (this.finita) return { ok: true };
    if (this.modo !== 'sfida') this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  blocca(p, b) {
    b.vivo = false;
    if (this.modo !== 'sfida') { this.annuncia(null, 'Nessun pezzo entra più: partita finita!', '', true); this.chiudi(); return; }
    this.morti.push(p);
    const vivi = this.attesi();
    this.annuncia(p, 'è rimasto senza spazio!', 'nessun pezzo entra più nella tua griglia!', true);
    if (this.vittoria === 'resistenza' ? vivi.length <= 1 : vivi.length === 0) this.chiudi();
  }

  // !win banana: la mossa migliore (quella del computer difficile), quando puoi giocare
  suggerimentoWin(posto) {
    if (this.finita || this.inPausa || (this.modo !== 'sfida' && posto !== this.turno)) return null;
    const b = this.planciaDi(posto);
    if (!b || !b.vivo || !b.puoGiocare()) return null;
    const m = bot(this, posto, 'difficile');
    return `💡 Pezzo ${m.pezzo + 1} (da sinistra) con l'angolo in alto a sinistra in riga ${m.r + 1}, colonna ${m.c + 1}`;
  }

  impostaPausa(si) { this.inPausa = !!si && this.pausaBoss; }

  chiudi() {
    this.finita = true;
    this.turno = null;
    let vincitori, fazioni, etichetta = 'punti';
    if (this.modo === 'sfida') {
      const punti = this.plance.map((b) => b.punti);
      if (this.vittoria === 'resistenza') {
        const vivi = this.plance.map((b, i) => (b.vivo ? i : -1)).filter((i) => i >= 0);
        vincitori = vivi.length ? vivi : [this.morti[this.morti.length - 1]];
      } else {
        const max = Math.max(...punti);
        vincitori = punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
      }
      fazioni = punti.map((x, i) => ({ posti: [i], punti: x }));
    } else {
      const b = this.plance[0];
      vincitori = Array.from({ length: this.n }, (_, i) => i);
      fazioni = this.modo === 'solo' ? [{ posti: [0], punti: b.punti }] : this.puntiDi.map((x, i) => ({ posti: [i], punti: x }));
      etichetta = this.modo === 'solo' ? 'punti' : 'punti portati';
      const lista = (RECORD[this.modo] = RECORD[this.modo] || []);
      const voce = { punti: b.punti, giocatori: this.n, quando: Date.now(), id: Math.random() };
      lista.push(voce);
      lista.sort((x, y) => y.punti - x.punti);
      lista.splice(5);
      this.posizioneRecord = lista.indexOf(voce);
    }
    this.risultato = { fazioni, etichetta, pareggio: this.modo === 'sfida' && vincitori.length > 1, vincitori };
    return { ok: true };
  }

  vista(p) {
    const ser = (b) => ({ griglia: b.griglia.map((x) => x.toString(36)).join(''), vassoio: b.vassoio, punti: b.punti, combo: b.combo, linee: b.linee, pezzi: b.pezzi, vivo: b.vivo, ultimo: b.ultimo });
    return {
      gioco: this.id, n: this.n, modo: this.modo, vittoria: this.vittoria, lato: L,
      plance: this.plance.map(ser), mia: this.modo === 'sfida' ? p : 0,
      forme: FORME, colori: COLORE_DI, morti: this.morti, puntiDi: this.puntiDi,
      record: this.modo === 'sfida' ? [] : RECORD[this.modo] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
      inPausaGioco: !!this.inPausa,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// valuta una griglia: meno buchi isolati e più spazio per i pezzi grandi = meglio
function valutaGriglia(g) {
  let v = 0;
  let vuote = 0;
  for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) {
    const i = r * L + c;
    if (g[i]) continue;
    vuote++;
    let chiusi = 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= L || cc < 0 || cc >= L || g[rr * L + cc]) chiusi++;
    }
    if (chiusi === 4) v -= 12; else if (chiusi === 3) v -= 3;
  }
  // transizioni pieno/vuoto: una griglia "a macchie" è peggiore
  for (let r = 0; r < L; r++) for (let c = 0; c < L - 1; c++) if (!!g[r * L + c] !== !!g[r * L + c + 1]) v -= 0.6;
  for (let c = 0; c < L; c++) for (let r = 0; r < L - 1; r++) if (!!g[r * L + c] !== !!g[(r + 1) * L + c]) v -= 0.6;
  if (!ciSta(g, 'q3')) v -= 18;
  if (!ciSta(g, 'o5h') && !ciSta(g, 'o5v')) v -= 8;
  return v + vuote * 0.9;
}

function bot(g, posto, livello) {
  const b = g.planciaDi(posto);
  const pezzi = b.vassoio.map((f, k) => ({ f, k })).filter((x) => x.f);
  const mosse = [];
  for (const { f, k } of pezzi) for (const [r, c] of posizioni(b.griglia, f)) mosse.push({ f, k, r, c });
  if (!mosse.length) return { tipo: 'metti', pezzo: 0, r: 0, c: 0 };
  if (livello === 'facile' && Math.random() < 0.75) {
    const m = mosse[Math.floor(Math.random() * mosse.length)];
    return { tipo: 'metti', pezzo: m.k, r: m.r, c: m.c };
  }
  let migliore = null, vMigliore = -Infinity;
  for (const m of mosse) {
    const e = metti(b.griglia, m.f, m.r, m.c);
    let v = e.linee * 25 + valutaGriglia(e.griglia);
    if (livello === 'difficile') {
      // guarda un passo avanti: la mossa migliore con gli altri pezzi rimasti
      const altri = pezzi.filter((x) => x.k !== m.k);
      if (altri.length) {
        let meglio = -Infinity;
        for (const o of altri) for (const [r2, c2] of posizioni(e.griglia, o.f)) {
          const e2 = metti(e.griglia, o.f, r2, c2);
          const v2 = e2.linee * 25 + valutaGriglia(e2.griglia);
          if (v2 > meglio) meglio = v2;
        }
        v = meglio === -Infinity ? v - 200 : v * 0.4 + meglio * 0.6; // se dopo non entra niente è pessima
      }
    } else if (livello === 'medio') v += Math.random() * 6;
    else v += Math.random() * 20;
    if (v > vMigliore) { vMigliore = v; migliore = m; }
  }
  return { tipo: 'metti', pezzo: migliore.k, r: migliore.r, c: migliore.c };
}

module.exports = {
  meta: {
    id: 'blockblast',
    nome: 'Block Blast',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Incastra i pezzi nella griglia 8×8 e cancella righe e colonne. Da soli, insieme o in sfida.',
    opzioni: [
      { id: 'modo', nome: 'Modalità (in più giocatori)', valori: ['coop', 'sfida'], etichette: ['Collaborazione: una griglia per tutti', 'Sfida: una griglia a testa'], predefinito: 'sfida' },
      { id: 'vittoria', nome: 'Nella sfida vince', valori: ['punti', 'resistenza'], etichette: ['Chi fa più punti', 'Chi resiste di più'], predefinito: 'punti' },
    ],
    regole: [
      'La griglia è di 8×8 caselle. Sotto la griglia ci sono 3 pezzi: trascinali nella griglia (o tocca un pezzo e poi la casella dove vuoi il suo angolo in alto a sinistra). I pezzi non si ruotano.',
      'Quando una riga o una colonna è tutta piena si cancella. Si possono cancellare più righe e colonne insieme.',
      'Quando hai messo tutti e 3 i pezzi ne arrivano altri 3. Se nessuno dei pezzi rimasti entra più nella griglia, la partita (o la tua griglia, nella sfida) è finita.',
      'Punti: 1 per ogni quadretto messo. Per le linee: 10 × linee × linee (1 linea 10, 2 insieme 40, 3 insieme 90…), moltiplicato per la combo, cioè quante mosse di fila hanno cancellato almeno una linea. Svuotare tutta la griglia vale 300 punti in più.',
      'Da soli: una maratona a punti. I punteggi migliori finiscono in classifica.',
      'Collaborazione: una sola griglia per tutti. A turno ognuno mette un pezzo. Si vince o si perde insieme e il punteggio va nella classifica di squadra; alla fine si vede anche quanti punti ha portato ognuno. Se qualcuno apre le dispense la partita si ferma per tutti.',
      'Sfida: ognuno ha la sua griglia e gioca quando vuole, senza turni. Tutti ricevono gli stessi pezzi nello stesso ordine. Si vedono le griglie degli altri in piccolo. Si può scegliere se vince chi fa più punti (si gioca finché tutti sono bloccati) oppure chi resiste di più (vince l\'ultimo che riesce ancora a mettere pezzi).',
      'Il computer facile mette i pezzi quasi a caso, il medio cerca linee e lascia pochi buchi, il difficile guarda anche la mossa successiva.',
    ],
  },
  crea: (o) => new BlockBlast(o),
  bot,
  _test: { FORME, metti, entra, punteggio, L },
};
