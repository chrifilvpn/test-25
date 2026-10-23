// SUDOKU: griglia 9×9 generata ogni volta, sempre con una sola soluzione. 4 difficoltà.
// Da soli o in collaborazione (tutti sulla stessa griglia, in tempo reale). Solo persone, niente computer.
// "Schema tuo": si parte da una griglia vuota, si copiano i numeri (per esempio da un giornale) e poi si risolve.
const DIFFICOLTA = {
  facile: { nome: 'Facile', indizi: 40 },
  medio: { nome: 'Medio', indizi: 32 },
  difficile: { nome: 'Difficile', indizi: 27 },
  esperto: { nome: 'Esperto', indizi: 23 },
};
const MIO = 'mio';
const MIN_INDIZI = 17; // nessun sudoku con meno di 17 numeri ha una sola soluzione
const RECORD = {};

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const riga = (i) => Math.floor(i / 9), col = (i) => i % 9, box = (i) => Math.floor(riga(i) / 3) * 3 + Math.floor(col(i) / 3);
const VICINI = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (let j = 0; j < 81; j++) if (j !== i && (riga(j) === riga(i) || col(j) === col(i) || box(j) === box(i))) s.add(j);
  return [...s];
});
const puo = (g, i, v) => VICINI[i].every((j) => g[j] !== v);

// riempie la griglia con il backtracking (a caso); conta fino a "limite" soluzioni
function risolvi(g, limite = 1, casuale = false) {
  let conta = 0;
  const giro = () => {
    let migliore = -1, opzioni = null;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const o = [];
      for (let v = 1; v <= 9; v++) if (puo(g, i, v)) o.push(v);
      if (!o.length) return false;
      if (!opzioni || o.length < opzioni.length) { migliore = i; opzioni = o; if (o.length === 1) break; }
    }
    if (migliore === -1) { conta++; return conta >= limite; }
    for (const v of casuale ? mescola(opzioni) : opzioni) {
      g[migliore] = v;
      if (giro()) return true;
    }
    g[migliore] = 0;
    return false;
  };
  giro();
  return conta;
}

function genera(livello) {
  const sol = new Array(81).fill(0);
  risolvi(sol, 1, true);
  const g = sol.slice();
  const obiettivo = DIFFICOLTA[livello].indizi;
  let indizi = 81;
  for (const i of mescola([...Array(81).keys()])) {
    if (indizi <= obiettivo) break;
    const v = g[i];
    g[i] = 0;
    if (risolvi(g.slice(), 2) !== 1) g[i] = v; // se le soluzioni diventano più di una, il numero resta
    else indizi--;
  }
  return { griglia: g, soluzione: sol };
}

class Sudoku {
  constructor({ n, opzioni = {} }) {
    this.id = 'sudoku';
    this.n = n;
    this.livello = DIFFICOLTA[opzioni.difficolta] || opzioni.difficolta === MIO ? opzioni.difficolta : 'facile';
    this.mostraErrori = opzioni.errori !== 'nascosti';
    // schema tuo: prima si scrivono i numeri di partenza (inserimento), il cronometro parte con "Inizia a risolvere"
    this.inserimento = this.livello === MIO;
    const { griglia, soluzione } = this.inserimento ? { griglia: new Array(81).fill(0), soluzione: null } : genera(this.livello);
    this.dati = griglia.map(Boolean);   // i numeri di partenza non si toccano
    this.griglia = griglia;
    this.soluzione = soluzione;
    this.chi = new Array(81).fill(null); // chi ha scritto il numero
    this.errori = 0;
    this.messi = new Array(n).fill(0);
    this.tempo = 0; this.dal = this.inserimento ? null : Date.now(); this.inPausa = false;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  cronometro() { return this.tempo + (this.dal && !this.inPausa && !this.finita ? Date.now() - this.dal : 0); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (!this.inserimento) { if (si) this.tempo += Date.now() - this.dal; else this.dal = Date.now(); }
    this.inPausa = si;
  }

  // caselle in contrasto (stesso numero nella stessa riga, colonna o riquadro): servono mentre si copia lo schema
  conflitti() { return this.griglia.map((v, i) => !!v && VICINI[i].some((j) => this.griglia[j] === v)); }

  // schema tuo: le mosse mentre si copiano i numeri di partenza
  azioneInserimento(p, a) {
    if (a && a.tipo === 'svuota') { this.griglia.fill(0); this.chi.fill(null); return { ok: true }; }
    if (a && a.tipo === 'inizia') {
      const n = this.griglia.filter(Boolean).length;
      if (n < MIN_INDIZI) return { errore: `Servono almeno ${MIN_INDIZI} numeri (ora ${n})` };
      if (this.conflitti().some(Boolean)) return { errore: 'Ci sono numeri ripetuti nella stessa riga, colonna o riquadro' };
      const quante = risolvi(this.griglia.slice(), 2);
      if (quante === 0) return { errore: 'Questo schema non ha soluzione: controlla di aver copiato bene i numeri' };
      if (quante > 1) return { errore: 'Questo schema ha più di una soluzione: controlla di aver copiato tutti i numeri' };
      const sol = this.griglia.slice();
      risolvi(sol, 1);
      this.soluzione = sol;
      this.dati = this.griglia.map(Boolean);
      this.chi.fill(null);
      this.inserimento = false;
      this.dal = Date.now();
      this.annuncia(p, `ha fatto partire lo schema (${n} numeri dati): buona fortuna!`, `schema pronto (${n} numeri dati): il cronometro è partito`);
      return { ok: true };
    }
    const i = Number(a && a.cella), v = Number(a && a.valore);
    if (!a || a.tipo !== 'metti' || !Number.isInteger(i) || i < 0 || i > 80 || !Number.isInteger(v) || v < 0 || v > 9) return { errore: 'Mossa non valida' };
    this.griglia[i] = v;
    this.chi[i] = v ? p : null;
    return { ok: true };
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    if (this.inserimento) return this.azioneInserimento(p, a);
    if (a && a.tipo === 'aiuto') return this.aiuto(p);
    const i = Number(a && a.cella), v = Number(a && a.valore);
    if (!a || a.tipo !== 'metti' || !Number.isInteger(i) || i < 0 || i > 80 || !Number.isInteger(v) || v < 0 || v > 9) return { errore: 'Mossa non valida' };
    if (this.dati[i]) return { errore: 'Questo numero fa parte dello schema' };
    if (this.mostraErrori && this.griglia[i] && this.griglia[i] === this.soluzione[i]) return { errore: 'Questo numero è già giusto' };
    this.griglia[i] = v;
    this.chi[i] = v ? p : null;
    if (v) {
      this.messi[p]++;
      if (v !== this.soluzione[i]) this.errori++;
    }
    if (this.griglia.every((x, k) => x === this.soluzione[k])) this.chiudi();
    return { ok: true };
  }

  // AIUTO: scrive il numero giusto in una casella, scegliendo (se c'è) quella con un solo numero possibile, così si
  // capisce il ragionamento; costa 30 secondi sul cronometro. Prima toglie l'eventuale numero sbagliato di quella casella.
  // la casella da aiutare: quella (non ancora giusta) con meno numeri possibili
  casellaAiuto() {
    const g = this.griglia.map((x, k) => (x === this.soluzione[k] ? x : 0));
    let meglio = -1, minimo = 10;
    for (let k = 0; k < 81; k++) {
      if (this.griglia[k] === this.soluzione[k]) continue;
      let n = 0; for (let v = 1; v <= 9; v++) if (puo(g, k, v)) n++;
      if (n < minimo) { minimo = n; meglio = k; }
    }
    return { meglio, minimo };
  }
  aiuto(p) {
    const { meglio, minimo } = this.casellaAiuto();
    if (meglio < 0) return { errore: 'Non c\'è niente da aiutare' };
    this.griglia[meglio] = this.soluzione[meglio];
    this.chi[meglio] = null;
    this.aiuti = (this.aiuti || 0) + 1;
    this.ultimoAiuto = { cella: meglio, unico: minimo === 1, id: this.aiuti };
    this.tempo += 30000; // il prezzo dell'aiuto
    const dove = `riga ${riga(meglio) + 1}, colonna ${col(meglio) + 1}`;
    this.annuncia(p, `chiede un aiuto: ${this.soluzione[meglio]} in ${dove} (+30 s)`, `aiuto: ${this.soluzione[meglio]} in ${dove}${minimo === 1 ? ', l\'unico numero possibile lì' : ''} (+30 s)`);
    if (this.griglia.every((x, k) => x === this.soluzione[k])) this.chiudi();
    return { ok: true };
  }

  // !win banana: il numero giusto della casella più facile, solo per chi l'ha chiesto (gratis, niente annunci)
  suggerimentoWin() {
    if (this.inserimento) return null;
    const { meglio } = this.casellaAiuto();
    if (meglio < 0) return null;
    return `💡 Riga ${riga(meglio) + 1}, colonna ${col(meglio) + 1}: ${this.soluzione[meglio]}`;
  }

  chiudi() {
    this.tempo = this.cronometro(); this.dal = null;
    this.finita = true;
    const chiave = `${this.livello}:${this.n === 1 ? 'solo' : 'coop'}`;
    // gli schemi copiati a mano non vanno in classifica (ognuno è diverso)
    const lista = this.livello === MIO ? [] : (RECORD[chiave] = RECORD[chiave] || []);
    const voce = { ms: this.tempo, errori: this.errori, aiuti: this.aiuti || 0, giocatori: this.n, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    this.annuncia(null, 'Sudoku completato! 🎉', '', true);
    this.risultato = { fazioni: this.messi.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'numeri messi', pareggio: false, vincitori: Array.from({ length: this.n }, (_, i) => i) };
  }

  vista() {
    const chiave = `${this.livello}:${this.n === 1 ? 'solo' : 'coop'}`;
    return {
      gioco: this.id, n: this.n, livello: this.livello, nomeLivello: this.livello === MIO ? 'Schema tuo' : DIFFICOLTA[this.livello].nome, mostraErrori: this.mostraErrori,
      griglia: this.griglia, dati: this.dati, chi: this.chi,
      inserimento: this.inserimento, conflitti: this.inserimento ? this.conflitti() : null, minIndizi: MIN_INDIZI,
      // gli errori si segnano solo se l'opzione è attiva (o a fine partita)
      sbagliate: (this.mostraErrori || this.finita) && !this.inserimento ? this.griglia.map((x, k) => !!x && x !== this.soluzione[k]) : null,
      errori: this.mostraErrori ? this.errori : null, messi: this.messi, aiuti: this.aiuti || 0, ultimoAiuto: this.ultimoAiuto || null,
      tempo: this.cronometro(), corre: !this.finita && !this.inPausa && !this.inserimento, record: this.livello === MIO ? [] : RECORD[chiave] || [], posizioneRecord: this.finita ? this.posizioneRecord : -1,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

module.exports = {
  meta: {
    id: 'sudoku',
    nome: 'Sudoku',
    tipo: 'tabellone',
    soloPersone: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Il classico 9×9 con 4 difficoltà, sempre con una sola soluzione. Da soli o insieme.',
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: [...Object.keys(DIFFICOLTA), MIO], etichette: [...Object.values(DIFFICOLTA).map((d) => `${d.nome} · circa ${d.indizi} numeri dati`), 'Schema tuo · scrivi tu i numeri (da carta o giornale)'], predefinito: 'facile' },
      { id: 'errori', nome: 'Errori', valori: ['visibili', 'nascosti'], etichette: ['Segna subito i numeri sbagliati', 'Non segnarli (più difficile)'], predefinito: 'visibili' },
    ],
    regole: [
      'Riempi la griglia 9×9 in modo che ogni riga, ogni colonna e ognuno dei nove riquadri 3×3 contenga tutti i numeri da 1 a 9, senza ripetizioni.',
      'I numeri di partenza (in grassetto) non si possono cambiare. Lo schema è creato ogni volta ed ha sempre una sola soluzione.',
      'Clicca una casella e poi un numero (anche dalla tastiera, da 1 a 9; 0 o Canc per cancellare; le frecce per spostarti). Con "Appunti" attivo scrivi dei numeri piccoli come promemoria: li vedi solo tu.',
      'Difficoltà: Facile (circa 40 numeri dati), Medio (32), Difficile (27), Esperto (23).',
      '"Schema tuo": la griglia parte vuota e scrivi tu i numeri di partenza (per esempio un sudoku visto sul giornale o lasciato a metà su carta). Quando hai finito premi "Inizia a risolvere": lo schema viene controllato (almeno 17 numeri, nessun numero ripetuto, una sola soluzione), i numeri diventano fissi e parte il cronometro. Questi schemi non vanno in classifica.',
      'Con "Segna subito i numeri sbagliati" un numero sbagliato diventa rosso e viene contato tra gli errori; un numero giusto non si può più cambiare. Con "Non segnarli" lo scopri solo alla fine.',
      'In collaborazione tutti lavorano sulla stessa griglia nello stesso momento: si vedono le caselle scelte dagli altri e ogni numero ha il colore di chi l\'ha scritto. Si vince insieme quando la griglia è completa; il tempo finisce nella classifica di squadra.',
      '"💡 Aiuto" scrive il numero giusto in una casella (di solito una dove c\'è un solo numero possibile, così vedi il ragionamento), ma aggiunge 30 secondi al cronometro.',
      'Il cronometro parte subito. Se qualcuno apre le dispense la partita e il cronometro si fermano per tutti. Si gioca solo tra persone.',
    ],
  },
  crea: (o) => new Sudoku(o),
  _test: { genera, risolvi, DIFFICOLTA, MIN_INDIZI },
};
