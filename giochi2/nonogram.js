// NONOGRAM (Picross): i numeri accanto a ogni riga e sopra ogni colonna dicono quanti blocchi di caselle colorate
// ci sono e quanto sono lunghi, nell'ordine. Colorando le caselle giuste esce un disegno.
// Da 1 a 4 giocatori, tutti insieme sulla stessa griglia in tempo reale (come il sudoku). Solo persone.
// Ogni griglia (a caso o della raccolta) ha UNA sola soluzione: lo controlla un risolutore prima di darla.
const DISEGNI = require('./nonogram-dati');

const LATI = [5, 10, 15];
const RECORD = {};
const AIUTO_MS = 30000;
const VUOTA = 0, PIENA = 1, CROCE = 2;

// ---------------- indizi e risolutore ----------------
function indiziLinea(linea) {
  const out = []; let k = 0;
  for (const x of linea) { if (x) k++; else if (k) { out.push(k); k = 0; } }
  if (k) out.push(k);
  return out;
}
function indizi(sol, lato) {
  const righe = [], colonne = [];
  for (let r = 0; r < lato; r++) righe.push(indiziLinea(sol.slice(r * lato, r * lato + lato)));
  for (let c = 0; c < lato; c++) colonne.push(indiziLinea(Array.from({ length: lato }, (_, r) => sol[r * lato + c])));
  return { righe, colonne };
}

// Una linea: celle note (-1 sconosciuta, 0 vuota, 1 piena) e indizi. Restituisce la linea con tutte le caselle che
// sono uguali in OGNI modo possibile di sistemare i blocchi, oppure null se non c'è nessun modo.
function risolviLinea(linea, ind) {
  const n = linea.length, k = ind.length;
  // pieneDa[i]: quante caselle consecutive da i in poi possono essere piene (nessuna è vuota per certo)
  const puoPiena = new Int32Array(n + 1);
  for (let i = n - 1; i >= 0; i--) puoPiena[i] = linea[i] === 0 ? 0 : puoPiena[i + 1] + 1;
  // nessunaPiena[i]: da i alla fine non c'è nessuna casella piena per certo
  const niente = new Uint8Array(n + 1); niente[n] = 1;
  for (let i = n - 1; i >= 0; i--) niente[i] = niente[i + 1] && linea[i] !== 1 ? 1 : 0;
  // ok[j][i]: i blocchi da j in poi stanno nelle caselle da i in poi
  const ok = Array.from({ length: k + 1 }, () => new Uint8Array(n + 2));
  for (let i = 0; i <= n + 1; i++) ok[k][i] = i >= n || niente[i] ? 1 : 0;
  for (let j = k - 1; j >= 0; j--) {
    const L = ind[j];
    for (let i = n; i >= 0; i--) {
      let v = 0;
      if (i < n && linea[i] !== 1 && ok[j][i + 1]) v = 1;
      if (!v && i + L <= n && puoPiena[i] >= L && (i + L === n || linea[i + L] !== 1) && ok[j + 1][Math.min(n + 1, i + L + 1)]) v = 1;
      ok[j][i] = v;
    }
    ok[j][n + 1] = 0;
  }
  if (!ok[0][0]) return null;
  // in avanti: quali caselle possono essere piene / vuote in almeno una sistemazione valida
  const piena = new Uint8Array(n), vuota = new Uint8Array(n);
  const visto = Array.from({ length: k + 1 }, () => new Uint8Array(n + 2));
  visto[0][0] = 1;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= k; j++) {
      if (!visto[j][i] || !ok[j][i]) continue;
      if (i < n && linea[i] !== 1 && ok[j][i + 1]) { vuota[i] = 1; visto[j][i + 1] = 1; }
      if (j < k) {
        const L = ind[j];
        const fine = Math.min(n + 1, i + L + 1);
        if (i + L <= n && puoPiena[i] >= L && (i + L === n || linea[i + L] !== 1) && ok[j + 1][fine]) {
          for (let t = i; t < i + L; t++) piena[t] = 1;
          if (i + L < n) vuota[i + L] = 1;
          if (fine <= n) visto[j + 1][fine] = 1;
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => (piena[i] && !vuota[i] ? 1 : vuota[i] && !piena[i] ? 0 : linea[i]));
}

// propaga la logica riga per riga e colonna per colonna; false se c'è una contraddizione
function propaga(g, lato, ind) {
  let cambiato = true;
  while (cambiato) {
    cambiato = false;
    for (let r = 0; r < lato; r++) {
      const linea = Array.from(g.subarray(r * lato, r * lato + lato));
      if (!linea.includes(-1)) { if (indiziLinea(linea).join() !== ind.righe[r].join()) return false; continue; }
      const nuova = risolviLinea(linea, ind.righe[r]);
      if (!nuova) return false;
      for (let c = 0; c < lato; c++) if (nuova[c] !== linea[c]) { g[r * lato + c] = nuova[c]; cambiato = true; }
    }
    for (let c = 0; c < lato; c++) {
      const linea = Array.from({ length: lato }, (_, r) => g[r * lato + c]);
      if (!linea.includes(-1)) { if (indiziLinea(linea).join() !== ind.colonne[c].join()) return false; continue; }
      const nuova = risolviLinea(linea, ind.colonne[c]);
      if (!nuova) return false;
      for (let r = 0; r < lato; r++) if (nuova[r] !== linea[r]) { g[r * lato + c] = nuova[r]; cambiato = true; }
    }
  }
  return true;
}

// conta le soluzioni (fino a "limite"): logica di riga e colonna, poi si prova una casella e si va avanti
// soloLogica: se la logica da sola non basta si risponde subito (serve a scegliere griglie risolvibili senza tirare a indovinare)
function contaSoluzioni(ind, lato, limite = 2, soloLogica = false) {
  let trovate = 0, nodi = 0, logica = true;
  const giro = (g) => {
    if (++nodi > 4000) return;
    if (!propaga(g, lato, ind)) return;
    const i = g.indexOf(-1);
    if (i === -1) { trovate++; return; }
    logica = false;
    if (soloLogica) return;
    for (const v of [1, 0]) {
      const h = Int8Array.from(g); h[i] = v;
      giro(h);
      if (trovate >= limite || nodi > 4000) return;
    }
  };
  giro(new Int8Array(lato * lato).fill(-1));
  if (nodi > 4000) return { soluzioni: -1, logica: false };
  return { soluzioni: trovate, logica };
}

// ---------------- griglie ----------------
const daDisegno = (d) => d.righe.join('').split('').map((x) => (x === '#' ? 1 : 0));
// griglia a caso a "macchie" (un po' di rumore lisciato), con una sola soluzione risolvibile con la logica
function generaCasuale(lato) {
  for (let tentativo = 0; tentativo < 3000; tentativo++) {
    const dens = 0.5 + Math.random() * 0.17;
    let sol = Array.from({ length: lato * lato }, () => (Math.random() < dens ? 1 : 0));
    if (lato > 5) {
      // un passo di lisciatura: ogni casella somiglia un po' alle vicine (disegni meno "a coriandoli")
      sol = sol.map((v, i) => {
        const r = Math.floor(i / lato), c = i % lato; let s = 0, t = 0;
        for (const [dr, dc] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < lato && cc < lato) { s += sol[rr * lato + cc]; t++; } }
        return Math.random() < 0.7 ? (s * 2 > t ? 1 : 0) : v;
      });
    }
    const piene = sol.reduce((a, b) => a + b, 0);
    if (piene < lato * lato * 0.35 || piene > lato * lato * 0.8) continue;
    const ind = indizi(sol, lato);
    if (ind.righe.some((x) => !x.length) && ind.colonne.some((x) => !x.length) && lato > 5) continue; // niente righe e colonne vuote insieme
    const v = contaSoluzioni(ind, lato, 2, true);
    if (v.soluzioni === 1 && v.logica) return { sol, nome: null };
  }
  // non succede in pratica: un disegno della raccolta
  return { sol: daDisegno(DISEGNI[lato][0]), nome: DISEGNI[lato][0].nome };
}

class Nonogram {
  constructor({ n, opzioni = {} }) {
    this.id = 'nonogram';
    this.n = n;
    this.lato = LATI.includes(Number(opzioni.lato)) ? Number(opzioni.lato) : 10;
    this.origine = ['caso', 'disegni'].includes(opzioni.origine) ? opzioni.origine : 'disegni';
    this.mostraErrori = opzioni.errori !== 'nascosti';
    if (this.origine === 'disegni') {
      const d = DISEGNI[this.lato][Math.floor(Math.random() * DISEGNI[this.lato].length)];
      this.soluzione = daDisegno(d); this.nomeDisegno = d.nome;
    } else {
      const x = generaCasuale(this.lato);
      this.soluzione = x.sol; this.nomeDisegno = x.nome;
    }
    this.indizi = indizi(this.soluzione, this.lato);
    this.celle = new Array(this.lato * this.lato).fill(VUOTA);
    this.chi = new Array(this.lato * this.lato).fill(null);
    this.sbagliate = new Array(this.lato * this.lato).fill(false); // errori segnati (caselle rivelate vuote)
    this.errori = 0; this.aiuti = 0; this.ultimoAiuto = null;
    this.colorate = new Array(n).fill(0);
    this.tempo = 0; this.dal = Date.now(); this.inPausa = false;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  cronometro() { return this.tempo + (this.dal && !this.inPausa && !this.finita ? Date.now() - this.dal : 0); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.tempo += Date.now() - this.dal; else this.dal = Date.now();
    this.inPausa = si;
  }

  // chi è assente non blocca nessuno: la griglia resta lì per gli altri
  salta() {}

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    if (a && a.tipo === 'aiuto') return this.aiuto(p);
    if (!a || a.tipo !== 'segna' || !Array.isArray(a.celle)) return { errore: 'Mossa non valida' };
    const v = Number(a.valore);
    const N = this.lato * this.lato;
    if (![VUOTA, PIENA, CROCE].includes(v)) return { errore: 'Mossa non valida' };
    if (!a.celle.length || a.celle.length > this.lato) return { errore: 'Mossa non valida' };
    const celle = [...new Set(a.celle.map(Number))];
    if (celle.some((i) => !Number.isInteger(i) || i < 0 || i >= N)) return { errore: 'Casella non valida' };
    // un trascinamento resta su una riga o una colonna
    const stessaRiga = celle.every((i) => Math.floor(i / this.lato) === Math.floor(celle[0] / this.lato));
    const stessaCol = celle.every((i) => i % this.lato === celle[0] % this.lato);
    if (!stessaRiga && !stessaCol) return { errore: 'Si colora lungo una riga o una colonna' };
    let nuoviErrori = 0;
    for (const i of celle) {
      // con gli errori visibili le caselle già controllate (giuste o rivelate) non cambiano più
      if (this.mostraErrori && (this.sbagliate[i] || (this.celle[i] === PIENA && this.soluzione[i]))) continue;
      if (this.mostraErrori && v === PIENA && !this.soluzione[i]) {
        // sbagliato: la casella si rivela vuota (con la croce rossa) e conta come errore
        this.celle[i] = CROCE; this.sbagliate[i] = true; this.chi[i] = p; this.errori++; nuoviErrori++;
        continue;
      }
      if (v === PIENA && this.celle[i] !== PIENA) this.colorate[p]++;
      this.celle[i] = v;
      this.chi[i] = v ? p : null;
    }
    if (nuoviErrori) this.annuncia(p, `sbaglia ${nuoviErrori === 1 ? 'una casella' : `${nuoviErrori} caselle`}`, nuoviErrori === 1 ? 'quella casella è vuota! ✗' : `${nuoviErrori} caselle erano vuote! ✗`);
    if (this.completa()) this.chiudi();
    return { ok: true };
  }

  completa() { return this.soluzione.every((s, i) => (s ? this.celle[i] === PIENA : this.celle[i] !== PIENA)); }

  // aiuto: sistema una casella sbagliata o ne colora una giusta, scegliendo dove la logica è più semplice (+30 s)
  aiuto(p) {
    const N = this.lato * this.lato;
    let scelta = -1;
    for (let i = 0; i < N && scelta < 0; i++) if (this.celle[i] === PIENA && !this.soluzione[i]) scelta = i; // prima gli sbagli
    if (scelta < 0) {
      // una casella che la logica può dedurre da quello che è già giusto
      const g = new Int8Array(N).fill(-1);
      for (let i = 0; i < N; i++) if ((this.celle[i] === PIENA && this.soluzione[i]) || this.sbagliate[i]) g[i] = this.soluzione[i];
      const prima = Int8Array.from(g);
      propaga(g, this.lato, this.indizi);
      const dedotte = [];
      for (let i = 0; i < N; i++) if (prima[i] === -1 && g[i] === 1 && this.celle[i] !== PIENA) dedotte.push(i);
      const mancanti = this.soluzione.map((s, i) => (s && this.celle[i] !== PIENA ? i : -1)).filter((i) => i >= 0);
      const lista = dedotte.length ? dedotte : mancanti;
      if (!lista.length) return { errore: 'Non c\'è niente da aiutare' };
      scelta = lista[Math.floor(Math.random() * lista.length)];
    }
    this.celle[scelta] = this.soluzione[scelta] ? PIENA : CROCE;
    this.chi[scelta] = this.soluzione[scelta] ? p : null;
    this.aiuti++;
    this.tempo += AIUTO_MS;
    this.ultimoAiuto = { cella: scelta, id: this.aiuti };
    const dove = `riga ${Math.floor(scelta / this.lato) + 1}, colonna ${(scelta % this.lato) + 1}`;
    this.annuncia(p, `chiede un aiuto: ${dove} (+30 s)`, `aiuto in ${dove} (+30 s)`);
    if (this.completa()) this.chiudi();
    return { ok: true };
  }

  // !win + parola segreta: il disegno e la riga con più caselle da sistemare (quali colorare); prima uno sbaglio, se c'è
  suggerimentoWin() {
    const L = this.lato;
    const dove = (i) => `riga ${Math.floor(i / L) + 1}, colonna ${(i % L) + 1}`;
    const sbaglio = this.celle.findIndex((v, i) => v === PIENA && !this.soluzione[i]);
    const nome = this.nomeDisegno ? `È: ${this.nomeDisegno} · ` : '';
    if (sbaglio >= 0) return `💡 ${nome}${dove(sbaglio)} va lasciata vuota`;
    let y = -1, peggio = 0;
    for (let r = 0; r < L; r++) { let k = 0; for (let x = 0; x < L; x++) if (this.soluzione[r * L + x] && this.celle[r * L + x] !== PIENA) k++; if (k > peggio) { peggio = k; y = r; } }
    if (y < 0) return null;
    const blocchi = [];
    for (let x = 0; x < L; x++) {
      if (!this.soluzione[y * L + x]) continue;
      const u = blocchi[blocchi.length - 1];
      if (u && u.b === x - 1) u.b = x; else blocchi.push({ a: x, b: x });
    }
    return `💡 ${nome}Riga ${y + 1}: colora ${blocchi.length === 1 && blocchi[0].b === blocchi[0].a ? 'la colonna' : 'le colonne'} ${blocchi.map((q) => `${q.a + 1}${q.b > q.a ? `-${q.b + 1}` : ''}`).join(', ')}`;
  }

  chiudi() {
    this.tempo = this.cronometro(); this.dal = null;
    this.finita = true;
    const chiave = `${this.lato}:${this.n === 1 ? 'solo' : 'coop'}`;
    const lista = (RECORD[chiave] = RECORD[chiave] || []);
    const voce = { ms: this.tempo, errori: this.errori, aiuti: this.aiuti, giocatori: this.n, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    this.annuncia(null, this.nomeDisegno ? `Completato: ${this.nomeDisegno}! 🎉` : 'Nonogram completato! 🎉', '', true);
    // da soli conta il tempo (meno è meglio, anche per il record personale); insieme, quante caselle ha colorato ognuno
    if (this.n === 1) this.risultato = { fazioni: [{ posti: [0], punti: Math.round(this.tempo / 1000) }], etichetta: 'secondi', crescente: true, pareggio: false, vincitori: [0] };
    else this.risultato = { fazioni: this.colorate.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'caselle colorate', pareggio: false, vincitori: Array.from({ length: this.n }, (_, i) => i) };
  }

  vista() {
    const chiave = `${this.lato}:${this.n === 1 ? 'solo' : 'coop'}`;
    return {
      gioco: this.id, n: this.n, lato: this.lato, indizi: this.indizi, celle: this.celle, chi: this.chi,
      sbagliate: this.mostraErrori ? this.sbagliate : this.finita ? this.celle.map((x, i) => x === PIENA && !this.soluzione[i]) : null,
      soluzione: this.finita ? this.soluzione : null, nomeDisegno: this.finita ? this.nomeDisegno : null,
      mostraErrori: this.mostraErrori, errori: this.mostraErrori ? this.errori : null, aiuti: this.aiuti, ultimoAiuto: this.ultimoAiuto,
      colorate: this.colorate, piene: this.soluzione.reduce((a, b) => a + b, 0), fatte: this.celle.filter((x) => x === PIENA).length,
      tempo: this.cronometro(), corre: !this.finita && !this.inPausa, record: RECORD[chiave] || [], posizioneRecord: this.finita ? this.posizioneRecord : -1,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

module.exports = {
  meta: {
    id: 'nonogram',
    nome: 'Nonogram',
    tipo: 'tabellone',
    soloPersone: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'Colora le caselle giuste seguendo i numeri di righe e colonne e scopri il disegno. Da soli o insieme.',
    alias: ['picross', 'griglia', 'pixel', 'disegno nascosto', 'hanjie'],
    opzioni: [
      { id: 'lato', nome: 'Griglia', valori: [10, 5, 15], etichette: ['10×10', '5×5 (facile)', '15×15 (difficile)'], predefinito: 10 },
      { id: 'origine', nome: 'Disegno', valori: ['disegni', 'caso'], etichette: ['Dalla raccolta (cuore, casa, gatto…)', 'Generato a caso'], predefinito: 'disegni' },
      { id: 'errori', nome: 'Errori', valori: ['visibili', 'nascosti'], etichette: ['Segna subito le caselle sbagliate', 'Non segnarle (più difficile)'], predefinito: 'visibili' },
    ],
    regole: [
      'La griglia nasconde un disegno. I numeri a sinistra di ogni riga e sopra ogni colonna dicono quanti blocchi di caselle colorate ci sono in quella linea e quanto sono lunghi, nell\'ordine. Tra due blocchi c\'è sempre almeno una casella vuota. Per esempio "3 1" vuol dire tre caselle colorate di fila, almeno una vuota, poi una colorata.',
      'Tocca una casella per colorarla; trascina il dito o il mouse lungo una riga o una colonna per colorarne tante insieme. Toccando una casella già colorata la cancelli.',
      'Con "✕ Croce" attivo (o con il tasto destro del mouse) segni le caselle che sicuramente sono vuote: è solo un promemoria e aiuta molto. I numeri delle linee già completate diventano grigi.',
      'Griglie 5×5, 10×10 o 15×15. Il disegno viene dalla raccolta (cuore, casa, gatto, razzo…) oppure è generato a caso; in tutti e due i casi un risolutore controlla prima che la soluzione sia una sola e che si possa trovare con la logica, senza tirare a indovinare.',
      'Con "Segna subito le caselle sbagliate" una casella colorata per sbaglio si rivela vuota (croce rossa) e conta come errore; le caselle giuste non si possono più cancellare. Con "Non segnarle" lo scopri solo alla fine.',
      '💡 Aiuto: sistema una casella sbagliata o colora una casella che si può dedurre, ma aggiunge 30 secondi al tempo.',
      'In collaborazione (da 2 a 4) tutti lavorano sulla stessa griglia nello stesso momento: ogni casella ha il colore di chi l\'ha colorata e si vedono le caselle scelte dagli altri. Si vince insieme; il tempo finisce nella classifica.',
      'Il cronometro parte subito. Se qualcuno apre le dispense la partita e il cronometro si fermano per tutti. Si gioca solo tra persone.',
    ],
  },
  crea: (o) => new Nonogram(o),
  _test: { indizi, indiziLinea, risolviLinea, contaSoluzioni, generaCasuale, daDisegno, DISEGNI, VUOTA, PIENA, CROCE },
};
