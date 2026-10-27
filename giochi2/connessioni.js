// CONNESSIONI: 16 parole da dividere in 4 gruppi di 4 con un legame (giallo facile, verde, blu, viola difficile).
// Scegli 4 parole e confermi: se sono un gruppo, il gruppo sale in alto con il suo colore e la spiegazione; se 3 su 4
// sono giuste il gioco dice "quasi!". Dopo 4 errori (o 6, con l'opzione) la partita è persa.
// Da soli, oppure in sfida da 2 a 8: tutti lo stesso puzzle, ognuno per conto suo; degli altri si vede solo quanti
// gruppi hanno trovato (e di che colore) e quanti errori hanno fatto. Vince chi trova tutto con meno errori, poi chi
// fa prima. I computer della sfida pensano con un ritmo umano: il loro orologio è dentro la partita (scadenza), così
// le mosse degli altri non lo fanno ripartire da capo.
const { PUZZLE, COLORI } = require('./connessioni-dati');

const ERRORI = [4, 6];
// probabilità che il computer indovini un gruppo al primo colpo, per livello e colore (giallo → viola)
const BRAVURA = {
  facile: [0.55, 0.38, 0.1, 0.04],
  medio: [0.72, 0.55, 0.34, 0.2],
  difficile: [0.95, 0.88, 0.74, 0.6],
};
// quando restano solo due gruppi, trovarne uno vuol dire trovarli tutti e due: si ragiona per esclusione
const ESCLUSIONE = { facile: 0.04, medio: 0.12, difficile: 0.25 };
// secondi "di riflessione" del computer tra una prova e l'altra (a caso tra min e max)
const RITMO = { facile: [16, 34], medio: [13, 28], difficile: [9, 22] };
const RECENTI = []; // gli ultimi puzzle usati in questo server: si evita di riproporli subito

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normalizza = (t) => String(t ?? '').normalize('NFC').trim().toUpperCase();
const chiave = (parole) => [...parole].sort().join('|');

function scegliPuzzle(richiesto) {
  if (Number.isInteger(richiesto) && PUZZLE[richiesto]) return richiesto;
  const liberi = PUZZLE.map((_, i) => i).filter((i) => !RECENTI.includes(i));
  const k = liberi[Math.floor(Math.random() * liberi.length)];
  RECENTI.push(k);
  while (RECENTI.length > Math.min(40, PUZZLE.length - 1)) RECENTI.shift();
  return k;
}

class Connessioni {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'connessioni';
    this.n = n;
    this.maxErrori = ERRORI.includes(Number(opzioni.errori)) ? Number(opzioni.errori) : 4;
    this.indice = scegliPuzzle(opzioni.puzzle);
    this.gruppi = PUZZLE[this.indice];
    this.gruppoDi = {}; // parola → indice del gruppo
    this.gruppi.forEach((g, i) => g.parole.forEach((p) => { this.gruppoDi[p] = i; }));
    const tutte = this.gruppi.flatMap((g) => g.parole);
    this.giocatori = Array.from({ length: n }, () => ({
      ordine: mescola([...tutte]), // ognuno ha le tessere in un ordine suo
      trovati: [],                 // indici dei gruppi, nell'ordine in cui li ha trovati
      errori: 0,
      prove: [],                   // { parole, esito: 'giusto' | 'quasi' | 'sbagliato', gruppo? }
      fatto: null,                 // null = gioca ancora; poi { vinto, errori, ms, ritirato? }
      ultimo: null,                // l'esito dell'ultima prova, per l'animazione: { n, esito, gruppo? }
    }));
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.prossimaBot = this.bot.map((l) => (l ? Date.now() + this.ritmo(l) : null));
    this.inizio = Date.now();
    this.pausaBoss = n === 1; // da soli: con le dispense aperte la partita aspetta
    // nella sfida chi ha finito conosce la soluzione: i suoi messaggi li leggono solo gli altri che hanno finito
    // (con leggiChat il server chiude anche la chat globale per chi è al tavolo)
    if (n > 1) {
      this.leggiChat = (p) => {
        if (this.finita || !(this.giocatori[p].fatto)) return {};
        const finiti = Array.from({ length: this.n }, (_, i) => i).filter((i) => i === p || this.giocatori[i].fatto);
        return { soloPer: finiti, privato: '🤐 Hai finito: finché la sfida non è chiusa ti leggono solo gli altri che hanno finito' };
      };
    }
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 0;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
  }

  ritmo(livello) {
    if (process.env.TEST_VELOCE) return 1;
    const [a, b] = RITMO[livello] || RITMO.medio;
    return Math.round((a + Math.random() * (b - a)) * 1000);
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  rimaste(p) { const t = new Set(this.giocatori[p].trovati); return this.giocatori[p].ordine.filter((w) => !t.has(this.gruppoDi[w])); }

  // chi deve ancora giocare: le persone (i computer hanno il loro orologio, vedi scadenza)
  attesi() { return this.finita ? [] : this.giocatori.map((g, i) => (!g.fatto && !this.bot[i] ? i : -1)).filter((i) => i >= 0); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    const g = this.giocatori[p];
    if (g.fatto) return { errore: 'Hai già finito: aspetta gli altri' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (a.tipo === 'arrenditi') { this.termina(p, false, true); return { ok: true }; }
    if (a.tipo !== 'prova') return { errore: 'Mossa non valida' };
    if (!Array.isArray(a.parole) || a.parole.length !== 4) return { errore: 'Scegli esattamente 4 parole' };
    const parole = a.parole.map(normalizza);
    if (new Set(parole).size !== 4) return { errore: 'Scegli 4 parole diverse' };
    const rimaste = new Set(this.rimaste(p));
    if (parole.some((w) => !rimaste.has(w))) return { errore: 'Puoi scegliere solo parole ancora sul tavolo' };
    const k = chiave(parole);
    if (g.prove.some((x) => chiave(x.parole) === k)) return { errore: 'Hai già provato queste quattro parole' };

    // quante parole stanno nello stesso gruppo (il gruppo più rappresentato)
    const conta = {};
    for (const w of parole) conta[this.gruppoDi[w]] = (conta[this.gruppoDi[w]] || 0) + 1;
    const [gruppo, quante] = Object.entries(conta).map(([x, c]) => [Number(x), c]).sort((x, y) => y[1] - x[1])[0];
    const nProva = g.prove.length + 1;
    if (quante === 4) {
      g.trovati.push(gruppo);
      g.prove.push({ parole, esito: 'giusto', gruppo });
      g.ultimo = { n: nProva, esito: 'giusto', gruppo };
      // con tre gruppi trovati l'ultimo è per forza quello rimasto: si scopre da solo
      if (g.trovati.length === 3) {
        const ultimo = [0, 1, 2, 3].find((x) => !g.trovati.includes(x));
        g.trovati.push(ultimo);
        g.ultimo.anche = ultimo;
      }
      if (g.trovati.length === 4) this.termina(p, true);
      else if (this.n > 1) this.annuncia(p, `trova un gruppo ${COLORI[gruppo]}`, `gruppo ${COLORI[gruppo]} trovato!`);
      return { ok: true };
    }
    g.errori++;
    const esito = quante === 3 ? 'quasi' : 'sbagliato';
    g.prove.push({ parole, esito });
    g.ultimo = { n: nProva, esito };
    if (g.errori >= this.maxErrori) this.termina(p, false);
    return { ok: true };
  }

  termina(p, vinto, ritirato = false) {
    const g = this.giocatori[p];
    if (g.fatto) return;
    g.fatto = { vinto, errori: g.errori, ms: Date.now() - this.inizio, gruppi: g.trovati.length, ...(ritirato ? { ritirato: true } : {}) };
    this.prossimaBot[p] = null;
    if (this.n > 1) {
      if (vinto) this.annuncia(p, `ha trovato tutti i gruppi con ${g.errori} ${g.errori === 1 ? 'errore' : 'errori'}! 🎉`, `tutti i gruppi trovati con ${g.errori} ${g.errori === 1 ? 'errore' : 'errori'}! 🎉`, true);
      else this.annuncia(p, ritirato ? 'si arrende' : 'ha finito gli errori', ritirato ? 'ti sei arreso' : 'errori finiti…');
    }
    if (this.giocatori.every((x) => x.fatto)) this.chiudi();
  }

  // assente o sulle dispense a lungo: nella sfida si ritira (da soli la partita aspetta)
  salta(p) { if (!this.finita && !this.giocatori[p].fatto) this.termina(p, false, true); }

  // l'orologio dei computer: il server chiama controllaTempo quando scade il primo
  scadenza() {
    if (this.finita) return null;
    const t = this.prossimaBot.filter((x, i) => x !== null && !this.giocatori[i].fatto);
    return t.length ? Math.min(...t) : null;
  }
  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    let mosso = false;
    for (let p = 0; p < this.n; p++) {
      if (this.prossimaBot[p] === null || this.prossimaBot[p] > ora || this.giocatori[p].fatto) continue;
      const r = this.azione(p, bot(this, p, this.bot[p]));
      if (r.errore) this.termina(p, false, true); // non dovrebbe mai succedere: il computer si ritira invece di bloccare
      if (!this.giocatori[p].fatto) this.prossimaBot[p] = ora + this.ritmo(this.bot[p]);
      mosso = true;
      if (this.finita) break;
    }
    return mosso;
  }

  chiudi() {
    this.finita = true;
    const f = this.giocatori.map((g) => g.fatto);
    const vinti = f.map((x, i) => (x && x.vinto ? i : -1)).filter((i) => i >= 0);
    let vincitori = [];
    if (vinti.length) {
      // vince chi ha trovato tutto con meno errori; a parità chi ha finito prima
      const minE = Math.min(...vinti.map((i) => f[i].errori));
      const pari = vinti.filter((i) => f[i].errori === minE);
      const minMs = Math.min(...pari.map((i) => f[i].ms));
      vincitori = pari.filter((i) => f[i].ms === minMs);
    }
    // punti: 10 per gruppo trovato, più 5 per ogni errore risparmiato se si finisce il puzzle
    const punti = this.giocatori.map((g) => g.trovati.length * 10 + (g.fatto && g.fatto.vinto ? (this.maxErrori - g.errori) * 5 : 0));
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: false, vincitori };
    if (!vincitori.length) this.risultato.titolo = this.n === 1 ? 'Puzzle non risolto' : 'Nessuno ha risolto il puzzle';
    if (this.n > 1) this.annuncia(null, vincitori.length ? 'Sfida finita!' : 'Sfida finita: nessuno ha risolto il puzzle', '', true);
  }

  // il trucco segreto (!win): finché gioca gli sussurra i gruppi che gli mancano (i più difficili; l'ultimo viene da sé)
  suggerimentoWin(posto) {
    const g = this.giocatori[posto];
    if (this.finita || !g || g.fatto) return null;
    const mancano = [0, 1, 2, 3].filter((i) => !g.trovati.includes(i)).sort((a, b) => this.gruppi[b].livello - this.gruppi[a].livello);
    return `🔗 ${mancano.slice(0, 3).map((i) => this.gruppi[i].parole.join(' ')).join(' / ')}`;
  }

  gruppoVisto(i) { const g = this.gruppi[i]; return { tema: g.tema, parole: g.parole, spiegazione: g.spiegazione, colore: g.colore, livello: g.livello }; }

  vista(p) {
    const q = this.giocatori[p] ? p : 0;
    const io = this.giocatori[q];
    const svela = this.finita || !!io.fatto;
    return {
      gioco: this.id, n: this.n, maxErrori: this.maxErrori, numero: this.indice + 1, totale: PUZZLE.length,
      parole: this.rimaste(q), trovati: io.trovati.map((i) => this.gruppoVisto(i)), errori: io.errori,
      prove: io.prove.map((x) => ({ parole: x.parole, esito: x.esito, colore: x.gruppo != null ? COLORI[x.gruppo] : null })),
      ultimo: io.ultimo, mioFatto: io.fatto,
      // degli altri si vedono solo i colori dei gruppi trovati e gli errori (le parole a fine partita)
      altri: this.giocatori.map((g, i) => ({ colori: g.trovati.map((x) => COLORI[x]), errori: g.errori, fatto: g.fatto, bot: !!this.bot[i] })),
      soluzione: svela ? this.gruppi.map((_, i) => this.gruppoVisto(i)) : null,
      turno: null, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Il computer conosce la soluzione ma "sbaglia" con una probabilità che dipende dal livello e dal colore del gruppo:
// prova sempre il gruppo che gli sembra più facile; quando sbaglia mette 3 parole giuste e una di un altro gruppo
// (o 2 e 2), senza mai ripetere una prova già fatta.
function bot(g, p, livello) {
  const L = BRAVURA[livello] ? livello : 'medio';
  const me = g.giocatori[p];
  const rimaste = g.rimaste(p);
  const restano = [0, 1, 2, 3].filter((x) => !me.trovati.includes(x));
  const provate = new Set(me.prove.map((x) => chiave(x.parole)));
  const bersaglio = Math.min(...restano); // il colore più facile ancora da trovare
  let prob = BRAVURA[L][bersaglio];
  if (restano.length === 2) prob = Math.min(0.98, prob + ESCLUSIONE[L] + BRAVURA[L][Math.max(...restano)] * 0.5);
  const giusto = g.gruppi[bersaglio].parole;
  if (Math.random() < prob && !provate.has(chiave(giusto))) return { tipo: 'prova', parole: mescola([...giusto]) };
  // prova sbagliata ma credibile
  const altre = rimaste.filter((w) => g.gruppoDi[w] !== bersaglio);
  for (let k = 0; k < 40; k++) {
    const tre = Math.random() < 0.65;
    const scelta = [...mescola([...giusto]).slice(0, tre ? 3 : 2), ...mescola([...altre]).slice(0, tre ? 1 : 2)];
    if (!provate.has(chiave(scelta))) return { tipo: 'prova', parole: mescola(scelta) };
  }
  // tutte le prove "credibili" già fatte: una combinazione qualsiasi non ancora provata (ce ne sono sempre)
  for (let k = 0; k < 400; k++) {
    const scelta = mescola([...rimaste]).slice(0, 4);
    if (!provate.has(chiave(scelta))) return { tipo: 'prova', parole: scelta };
  }
  return { tipo: 'prova', parole: [...giusto] };
}

module.exports = {
  meta: {
    id: 'connessioni',
    nome: 'Connessioni',
    tipo: 'tabellone',
    saltaAssenti: true, // nella sfida chi è via troppo a lungo si ritira (il computer non gioca al suo posto)
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: '16 parole, 4 gruppi nascosti: trova i legami prima di fare 4 errori. Da soli o in sfida sullo stesso puzzle.',
    alias: ['connections', 'collegamenti', 'gruppi', 'legami', 'quattro gruppi', 'parole collegate'],
    opzioni: [
      { id: 'errori', nome: 'Errori ammessi', valori: [4, 6], etichette: ['4 errori (classico)', '6 errori (più facile)'], predefinito: 4 },
    ],
    regole: [
      'Sul tavolo ci sono 16 parole: vanno divise in 4 gruppi di 4 che hanno qualcosa in comune (una categoria, una frase fatta come "___ di mare", una parola nascosta dentro, un anagramma…).',
      'Tocca 4 parole e premi Conferma. Se formano un gruppo, il gruppo sale in alto con il suo colore e la spiegazione del legame. Quando ne hai trovati 3, l\'ultimo si scopre da solo.',
      'I colori dicono la difficoltà: giallo (il più facile), verde, blu e viola (il più difficile, di solito un gioco di parole).',
      'Se sbagli perdi un errore; se 3 parole su 4 sono giuste il gioco ti dice "Quasi!". Con 4 errori (o 6, con l\'opzione più facile) la partita è persa. La stessa combinazione non si può provare due volte.',
      'Attenti alle trappole: alcune parole sembrano andare in due gruppi, ma c\'è un solo modo di dividerle tutte e sedici.',
      'Mescola rimette in ordine sparso le tessere (aiuta a vedere legami nuovi); Deseleziona toglie la scelta.',
      'Sfida (da 2 a 8): tutti hanno lo stesso puzzle e giocano per conto loro, nello stesso momento. Degli altri vedi solo i colori dei gruppi trovati e gli errori. Vince chi trova tutti i gruppi con meno errori; a parità, chi ha finito prima. Punti: 10 per ogni gruppo, più 5 per ogni errore risparmiato se risolvi il puzzle.',
      'Chi è assente o sulle dispense a lungo nella sfida si ritira; da soli la partita aspetta che torni.',
      'Il computer pensa con calma, come una persona (qualche decina di secondi per prova). Il facile trova da solo quasi solo i gruppi gialli e verdi e sbaglia spesso; il medio a volte arriva al viola; il difficile sbaglia di rado anche i gruppi più difficili.',
    ],
  },
  crea: (o) => new Connessioni(o),
  bot,
  _test: { PUZZLE, BRAVURA, chiave, normalizza },
};
