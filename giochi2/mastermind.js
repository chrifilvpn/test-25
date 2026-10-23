// CODICE SEGRETO: indovina la combinazione di pioli colorati scelta dal computer in 10 tentativi. A ogni tentativo
// la risposta dice quanti pioli sono del colore giusto al posto giusto (neri) e quanti del colore giusto ma al posto
// sbagliato (bianchi), senza dire quali. Da soli, oppure in sfida (come lo scontro di Wordle): tutti cercano lo
// STESSO codice, ognuno per conto suo; vince chi usa meno tentativi e, a parità, chi finisce prima.
const { ora } = require('../giochi/orologio'); // orologio vero (nel sito) o finto (nei test)
const TENTATIVI = 10;
const NOMI_COLORI = ['rosso', 'blu', 'verde', 'giallo', 'arancio', 'viola', 'azzurro', 'rosa'];

// risposta a un tentativo: [neri, bianchi]
const CONTA_A = new Int8Array(8), CONTA_B = new Int8Array(8);
// la stessa risposta in un numero solo (neri × 8 + bianchi), senza creare oggetti: il computer la usa milioni di volte
function codiceRisposta(tentativo, segreto) {
  let neri = 0;
  CONTA_A.fill(0); CONTA_B.fill(0);
  for (let i = 0; i < segreto.length; i++) {
    if (tentativo[i] === segreto[i]) neri++;
    else { CONTA_A[tentativo[i]]++; CONTA_B[segreto[i]]++; }
  }
  let bianchi = 0;
  for (let c = 0; c < 8; c++) bianchi += CONTA_A[c] < CONTA_B[c] ? CONTA_A[c] : CONTA_B[c];
  return neri * 8 + bianchi;
}
function risposta(tentativo, segreto) {
  const k = codiceRisposta(tentativo, segreto);
  return [k >> 3, k & 7];
}

// tutti i codici possibili con queste regole (al massimo 8^5 = 32768)
const CACHE = new Map();
function tuttiICodici(colori, pioli, ripetuti) {
  const k = `${colori}:${pioli}:${ripetuti}`;
  if (CACHE.has(k)) return CACHE.get(k);
  const out = [];
  const giro = (pref) => {
    if (pref.length === pioli) { out.push(pref.slice()); return; }
    for (let c = 0; c < colori; c++) { if (!ripetuti && pref.includes(c)) continue; pref.push(c); giro(pref); pref.pop(); }
  };
  giro([]);
  CACHE.set(k, out);
  return out;
}

class CodiceSegreto {
  constructor({ n, opzioni = {} }) {
    this.id = 'mastermind';
    this.n = n;
    this.colori = Number(opzioni.colori) === 8 ? 8 : 6;
    this.pioli = Number(opzioni.pioli) === 5 ? 5 : 4;
    this.ripetuti = opzioni.ripetuti !== 'no';
    const tutti = tuttiICodici(this.colori, this.pioli, this.ripetuti);
    this.segreto = tutti[Math.floor(Math.random() * tutti.length)].slice();
    this.righe = Array.from({ length: n }, () => []); // { codice, neri, bianchi }
    this.fatto = new Array(n).fill(null);               // null = gioca ancora, { vinto, tentativi, ms }
    this.inizio = ora();
    this.pausaBoss = n === 1; // da soli: con le dispense aperte la partita aspetta
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.menti = {};
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attesi() { return this.finita ? [] : this.fatto.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.fatto[p]) return { errore: 'Hai già finito: aspetta gli altri' };
    if (!a || a.tipo !== 'prova' || !Array.isArray(a.codice)) return { errore: 'Mossa non valida' };
    const c = a.codice.map(Number);
    if (c.length !== this.pioli) return { errore: `Servono ${this.pioli} pioli` };
    if (c.some((x) => !Number.isInteger(x) || x < 0 || x >= this.colori)) return { errore: 'Colore non valido' };
    if (!this.ripetuti && new Set(c).size !== c.length) return { errore: 'In questa partita i colori non si ripetono' };
    const [neri, bianchi] = risposta(c, this.segreto);
    this.righe[p].push({ codice: c, neri, bianchi });
    const vinto = neri === this.pioli;
    if (vinto || this.righe[p].length >= TENTATIVI) {
      const t = this.righe[p].length;
      this.fatto[p] = { vinto, tentativi: t, ms: ora() - this.inizio };
      if (this.n > 1) this.annuncia(p, vinto ? `ha trovato il codice in ${t}!` : 'ha finito i tentativi', vinto ? `codice trovato in ${t}! 🎉` : 'tentativi finiti…', vinto);
      else this.annuncia(p, '', vinto ? `codice trovato in ${t} ${t === 1 ? 'tentativo' : 'tentativi'}! 🎉` : 'tentativi finiti…', true);
      if (!this.attesi().length) this.chiudi();
    }
    return { ok: true };
  }

  // nella sfida chi resta via troppo a lungo si ritira (da soli la partita aspetta)
  salta(p) {
    if (this.finita || this.fatto[p]) return;
    this.fatto[p] = { vinto: false, tentativi: this.righe[p].length, ms: ora() - this.inizio, ritirato: true };
    if (!this.attesi().length) this.chiudi();
  }

  chiudi() {
    this.finita = true;
    const punti = this.fatto.map((f) => (f && f.vinto ? TENTATIVI + 1 - f.tentativi : 0));
    const vinti = this.fatto.map((f, i) => (f && f.vinto ? i : -1)).filter((i) => i >= 0);
    let vincitori = [];
    if (vinti.length) {
      // vince chi ha usato meno tentativi; a parità chi ha finito prima
      const minT = Math.min(...vinti.map((i) => this.fatto[i].tentativi));
      const pari = vinti.filter((i) => this.fatto[i].tentativi === minT);
      const minMs = Math.min(...pari.map((i) => this.fatto[i].ms));
      vincitori = pari.filter((i) => this.fatto[i].ms === minMs);
    }
    if (this.n > 1) this.annuncia(null, vinti.length ? 'Codice svelato!' : 'Nessuno ha trovato il codice', '', true);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: false, vincitori };
    if (this.n === 1 && !vinti.length) this.risultato.titolo = 'Codice non trovato';
    return { ok: true };
  }

  // trucco segreto (!win): il codice segreto, per pochi secondi (stessi nomi dei colori della tastiera)
  suggerimentoWin(p) {
    if (this.finita || !this.righe[p] || this.fatto[p]) return null;
    return `💡 Il codice è: ${this.segreto.map((k) => NOMI_COLORI[k]).join(' · ')}`;
  }

  vista(p) {
    const svela = this.finita;
    return {
      gioco: this.id, n: this.n, colori: this.colori, pioli: this.pioli, ripetuti: this.ripetuti, tentativi: TENTATIVI,
      mie: this.righe[p] || [], mioFatto: this.fatto[p] || null,
      // degli altri si vedono solo i pioli della risposta, e i colori solo a fine partita
      altri: this.righe.map((r, i) => ({ tentativi: r.length, fatto: this.fatto[i], righe: r.map((x) => ({ codice: svela ? x.codice : null, neri: x.neri, bianchi: x.bianchi })) })),
      segreto: svela || this.fatto[p] ? this.segreto : null,
      inizio: this.inizio,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
const compatibile = (c, righe) => righe.every((r) => codiceRisposta(r.codice, c) === r.neri * 8 + r.bianchi);
const aCaso = (a) => a[Math.floor(Math.random() * a.length)];

// Strategia di Knuth: tra i tentativi possibili sceglie quello che, nel caso peggiore, lascia meno codici compatibili.
// Con tanti codici (8 colori, 5 pioli) si guardano un campione dei tentativi e un campione dei codici rimasti, così
// la scelta resta veloce.
function knuth(rimasti, tutti, colori, pioli) {
  if (rimasti.length <= 2) return rimasti[0];
  const LIMITE = process.env.TEST_VELOCE && tutti.length > 1296 ? 40000 : 1500000; // confronti al massimo
  let candidati = rimasti.length * tutti.length <= LIMITE ? tutti : null;
  let bersagli = rimasti;
  if (!candidati) {
    if (bersagli.length > 600) bersagli = Array.from({ length: 600 }, () => aCaso(rimasti));
    const quanti = Math.max(20, Math.floor(LIMITE / bersagli.length));
    const da = rimasti.length >= quanti ? rimasti : tutti;
    candidati = [...new Set(Array.from({ length: Math.min(quanti, da.length) }, () => aCaso(da)))];
    candidati.push(...rimasti.slice(0, Math.min(rimasti.length, 50)));
  }
  const dentro = new Set(rimasti);
  let meglio = null, peggiore = Infinity, eDentro = false;
  const conti = new Int32Array(64);
  for (const g of candidati) {
    conti.fill(0);
    let max = 0;
    for (const s of bersagli) {
      const k = codiceRisposta(g, s);
      if (++conti[k] > max) { max = conti[k]; if (max > peggiore) break; }
    }
    const d = dentro.has(g);
    // a parità si preferisce un codice che potrebbe essere quello giusto
    if (max < peggiore || (max === peggiore && d && !eDentro)) { meglio = g; peggiore = max; eDentro = d; }
  }
  return meglio || rimasti[0];
}

function bot(g, p, livello) {
  const righe = g.righe[p] || [];
  const tutti = tuttiICodici(g.colori, g.pioli, g.ripetuti);
  const prova = (codice) => ({ tipo: 'prova', codice: codice.slice() });
  if (livello === 'facile') {
    // guarda solo l'ultima risposta (e non ripete i tentativi già fatti)
    const ultima = righe.slice(-1);
    const fatti = new Set(righe.map((r) => r.codice.join('')));
    const ok = tutti.filter((c) => !fatti.has(c.join('')) && compatibile(c, ultima));
    return prova(ok.length ? aCaso(ok) : aCaso(tutti));
  }
  // i codici ancora compatibili si tengono aggiornati tra un tentativo e l'altro
  const m = g.menti[p] && g.menti[p].fatte <= righe.length ? g.menti[p] : (g.menti[p] = { fatte: 0, rimasti: tutti });
  while (m.fatte < righe.length) { const r = righe[m.fatte++]; m.rimasti = m.rimasti.filter((c) => compatibile(c, [r])); }
  const rimasti = m.rimasti.length ? m.rimasti : tutti;
  if (livello === 'medio') return prova(aCaso(rimasti));
  if (!righe.length) {
    // apertura classica: due colori ripetuti (1122) o, senza ripetizioni, colori tutti diversi
    if (g.ripetuti) return prova(Array.from({ length: g.pioli }, (_, i) => (i < Math.ceil(g.pioli / 2) ? 0 : 1)));
    return prova(Array.from({ length: g.pioli }, (_, i) => i));
  }
  return prova(knuth(rimasti, tutti, g.colori, g.pioli));
}

module.exports = {
  meta: {
    id: 'mastermind',
    nome: 'Codice segreto',
    tipo: 'tabellone',
    saltaAssenti: true, // nella sfida chi è via troppo a lungo si ritira
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Indovina la combinazione di colori in 10 tentativi con i pioli neri e bianchi. Da soli o in sfida sullo stesso codice.',
    alias: ['codice', 'combinazione', 'pioli', 'colori', 'decifra'],
    opzioni: [
      { id: 'colori', nome: 'Colori', valori: [6, 8], etichette: ['6 colori', '8 colori (più difficile)'], predefinito: 6 },
      { id: 'pioli', nome: 'Pioli', valori: [4, 5], etichette: ['Codice di 4 pioli', 'Codice di 5 pioli'], predefinito: 4 },
      { id: 'ripetuti', nome: 'Colori ripetuti', valori: ['si', 'no'], etichette: ['Sì, un colore può ripetersi', 'No, tutti diversi'], predefinito: 'si' },
    ],
    regole: [
      'Il computer sceglie un codice segreto di 4 pioli colorati (5 con l\'opzione) presi tra 6 colori (8 con l\'opzione). Con "Colori ripetuti" lo stesso colore può comparire più volte, altrimenti sono tutti diversi.',
      'Hai 10 tentativi. Componi un codice toccando i colori (o con i tasti da 1 a 8, Canc per togliere) e premi "Prova".',
      'A ogni tentativo ricevi la risposta: un piolino nero per ogni piolo del colore giusto al posto giusto, un piolino bianco per ogni piolo del colore giusto ma al posto sbagliato. La risposta non dice quali pioli sono giusti! I colori ripetuti contano una volta sola per piolo.',
      'Trovi il codice quando hai tutti piolini neri. Se finisci i 10 tentativi il codice viene svelato.',
      'Sfida (da 2 a 6): tutti cercano lo stesso codice, ognuno per conto suo e nello stesso momento. Degli altri vedi solo le risposte (i piolini), non i colori. Vince chi trova il codice con meno tentativi; a parità chi ci arriva prima. Punti: 11 meno i tentativi usati.',
      'Chi è assente o sulle dispense a lungo nella sfida si ritira; da soli la partita aspetta.',
      'Il computer facile tiene conto solo dell\'ultima risposta, il medio prova a caso un codice compatibile con tutte le risposte, il difficile usa la strategia di Knuth: sceglie il tentativo che nel caso peggiore lascia meno possibilità (di solito trova 4 pioli e 6 colori in 4-5 tentativi).',
    ],
  },
  crea: (o) => new CodiceSegreto(o),
  bot,
  _test: { risposta, tuttiICodici, compatibile, knuth, TENTATIVI },
};
