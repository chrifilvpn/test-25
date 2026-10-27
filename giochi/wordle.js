// WORDLE in italiano: indovina la parola segreta in 6 tentativi. Lunghezza da 4 a 8 lettere (o a caso).
// Da soli, oppure in scontro: tutti cercano la STESSA parola, ognuno sul suo schermo, senza vedere i tentativi degli altri.
const { ora } = require('./orologio'); // orologio vero (nel sito) o finto (nei test)
const ELENCO = `casa cane mare sole luna vino pane nave rosa vita anno mano naso orto ramo lago dito lupo topo gufo pera mela uovo sale riso foca orso seta
lana moto auto arco nodo muro tela vaso sera zero dado neve fumo onda voce idea aria arte dama faro fata fico gola lima meta nido olio pino polo remo rete riva
sugo tazza torre vela zona erba cena cuoco miele succo gatto libro fiore piano sedia porta tempo verde bosco campo carta festa fuoco gioco lampo latte mondo
notte pesce pizza ponte prato scala sogno treno tigre torta vento zaino amico banco borsa burro calma corda cuore danza fiume forno frase grano isola lente magia
mappa menta museo panda perla piede pollo radio regno salto sposa tetto volpe zebra fungo lupo razzo riccio ruota scudo sasso spada tasca tenda tromba stella
nuvola scuola albero chiave cucina domani estate foglia giallo giorno lavoro limone maglia marito matita moneta natale pianta pirata quadro regalo sabato
sapone scarpa strada tavolo teatro bianco cavolo cestino cometa conchiglia coperta cortile cravatta cuscino delfino diamante dinosauro elefante farfalla
fragola gabbiano gelato giardino giraffa gomitolo lampada lucertola mattina montagna ombrello orologio ospedale palazzo palestra panino pantera
pappagallo pattini pennello pianeta pinguino piscina pomodoro quaderno ragnatela ristorante sorriso spiaggia stazione tartaruga telefono temporale
tesoro tramonto vacanza vulcano zucchero ananas arancia banana biscotto bottiglia bussola cammello candela cannone capanna cappello caramella carota
castello cavallo cervello ciliegia cipolla coniglio coltello corona criceto dentista divano drago fantasma fattoria finestra formica fumetto galassia
gallina gomma grotta guanto inverno lavagna leone libreria lumaca maestro maiale mantello medusa mercato messaggio mulino nonno ombra orecchio pagina
palla pallone panchina paracadute pecora pentola piuma poltrona polpo porcino postino ragazzo robot rospo sabbia salame scatola scimmia sciarpa
secchio segreto semaforo sentiero serpente sirena soldato specchio spugna squalo stivale tamburo tappeto tastiera tavola tempesta topolino tortellino
treccia trottola uccello uragano valigia vaniglia ventaglio vestito violino zanzara zucca armadio bagno balena barca becco bicchiere binario brodo
calcio camino camion canale canguro canzone cartello cassa cena chitarra cielo cinema cintura colla colore compasso computer cono coppa corsa costume
cuoca disco dolce doccia duomo fabbro fagiolo favola fiocco fischio focaccia foresta frigo frutta gallo gamba gelo gente ghiaccio gioiello gonna gradino
grillo lampone lettera letto limonata lupino marmo martello maschera medaglia melone miniera moneta mucca musica neve nocciola noce nuoto oliva onda
orchestra padella paglia palma pantofola parco passero pasta patata pepe perla pesca piatto pioggia pista pizzo porto prugna pugno quercia rana razza
regina riso rondine rubino sacco sale salsa sandalo sapore scoglio scopa sella sentiero sigaro slitta sorella stufa tacchino talpa tappo tigre timone
tonno torrone tubo ufficio uovo vagone vaso vetro video villa vite volante zampa zio`;

const PAROLE = {};
for (const w of new Set(ELENCO.split(/\s+/).filter(Boolean))) {
  if (!/^[a-z]+$/.test(w) || w.length < 4 || w.length > 8) continue;
  (PAROLE[w.length] = PAROLE[w.length] || []).push(w);
}
// le parole segrete: quelle scelte a mano qui sopra più le parole molto comuni del dizionario italiano dei giochi
// di parole (giochi2/paroliere-dati.js) che hanno anche il plurale (così restano soprattutto nomi e aggettivi).
// Si prepara la prima volta che serve. Le parole ammesse come tentativo sono tutte quelle del dizionario.
const D = require('../giochi2/paroliere-dati');
let segrete = null;
function SEGRETE(l) {
  if (!segrete) {
    segrete = {};
    for (const k of Object.keys(PAROLE)) segrete[k] = [...PAROLE[k]];
    const plurale = (w) => {
      const r = w.slice(0, -1), u = w.slice(-1);
      return u === 'o' ? [r + 'i'] : u === 'a' ? [r + 'e', r + 'he'] : [];
    };
    for (const w of D.decodifica(D.COMUNI[0])) {
      if (w.length < 4 || w.length > 8 || !D.esiste(w) || !plurale(w).some(D.esiste)) continue;
      if (/(are|ere|ire|ndo|amo|ava|eva|iva|rlo|rla|sse|sso)$/.test(w) || segrete[w.length].includes(w)) continue;
      segrete[w.length].push(w);
    }
  }
  return segrete[l];
}
const nelDizionario = (w) => PAROLE[w.length]?.includes(w) || D.esiste(w);
const TENTATIVI = 6;
const normalizza = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// colori di un tentativo: 2 = lettera giusta al posto giusto, 1 = c'è ma altrove, 0 = non c'è (rispettando le doppie)
function valuta(tentativo, segreta) {
  const esito = new Array(segreta.length).fill(0);
  const resto = {};
  for (let i = 0; i < segreta.length; i++) {
    if (tentativo[i] === segreta[i]) esito[i] = 2;
    else resto[segreta[i]] = (resto[segreta[i]] || 0) + 1;
  }
  for (let i = 0; i < segreta.length; i++) {
    if (esito[i] === 2) continue;
    if (resto[tentativo[i]]) { esito[i] = 1; resto[tentativo[i]]--; }
  }
  return esito;
}

// MODALITÀ DIFFICILE: gli indizi trovati vanno usati. Le lettere verdi restano al loro posto, quelle ocra (e verdi)
// devono comparire nel tentativo, almeno tante volte quante ne sono state scoperte. Restituisce l'errore o null.
function controllaDifficile(w, righe) {
  for (const r of righe) {
    const conta = {};
    for (let i = 0; i < r.parola.length; i++) {
      if (r.esito[i] === 2 && w[i] !== r.parola[i]) return `Modalità difficile: la ${i + 1}ª lettera deve essere ${r.parola[i].toUpperCase()}`;
      if (r.esito[i] > 0) conta[r.parola[i]] = (conta[r.parola[i]] || 0) + 1;
    }
    for (const [c, k] of Object.entries(conta)) {
      if ([...w].filter((x) => x === c).length < k) return `Modalità difficile: la parola deve contenere ${k > 1 ? `${k} volte la ` : 'la '}${c.toUpperCase()}`;
    }
  }
  return null;
}

class Wordle {
  constructor({ n, opzioni = {} }) {
    this.id = 'wordle';
    this.n = n;
    const lung = Number(opzioni.lunghezza);
    this.lunghezza = PAROLE[lung] ? lung : [4, 5, 6, 7, 8][Math.floor(Math.random() * 5)];
    this.soloDizionario = opzioni.controllo === 'dizionario';
    this.difficile = opzioni.modo === 'difficile';
    const elenco = SEGRETE(this.lunghezza);
    this.segreta = elenco[Math.floor(Math.random() * elenco.length)];
    this.righe = Array.from({ length: n }, () => []); // { parola, esito }
    this.fatto = new Array(n).fill(null);               // null = gioca ancora, { vinto, tentativi, ms }
    this.inizio = ora();
    this.pausaBoss = n === 1; // da soli: con le dispense aperte la partita aspetta
    // nella sfida chi ha finito conosce la soluzione: i suoi messaggi li leggono solo gli altri che hanno finito
    // (con leggiChat il server chiude anche la chat globale per chi è al tavolo)
    if (n > 1) {
      this.leggiChat = (p) => {
        if (this.finita || !(this.fatto[p])) return {};
        const finiti = Array.from({ length: this.n }, (_, i) => i).filter((i) => i === p || this.fatto[i]);
        return { soloPer: finiti, privato: '🤐 Hai finito: finché la sfida non è chiusa ti leggono solo gli altri che hanno finito' };
      };
    }
    this.turno = null;
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attesi() { return this.finita ? [] : this.fatto.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0); }

  // la parola da far controllare a fantasIA (server.js) prima della mossa: solo quelle fuori dal dizionario del gioco
  parolaDaControllare(p, a) {
    if (this.finita || this.fatto[p] || this.soloDizionario || !a || a.tipo !== 'prova') return null;
    const w = normalizza(a.parola);
    if (w.length !== this.lunghezza || nelDizionario(w)) return null;
    if (this.difficile && controllaDifficile(w, this.righe[p])) return null; // la mossa sarà rifiutata comunque
    return w;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.fatto[p]) return { errore: 'Hai già finito: aspetta gli altri' };
    if (!a || a.tipo !== 'prova') return { errore: 'Mossa non valida' };
    const w = normalizza(a.parola);
    if (w.length !== this.lunghezza) return { errore: `La parola deve avere ${this.lunghezza} lettere` };
    if (this.difficile) { const e = controllaDifficile(w, this.righe[p]); if (e) return { errore: e }; }
    if (this.soloDizionario && !nelDizionario(w)) return { errore: 'Questa parola non è nel dizionario del sito' };
    const esito = valuta(w, this.segreta);
    this.righe[p].push({ parola: w, esito });
    const vinto = w === this.segreta;
    if (vinto || this.righe[p].length >= TENTATIVI) {
      this.fatto[p] = { vinto, tentativi: this.righe[p].length, ms: ora() - this.inizio };
      if (this.n > 1) this.annuncia(p, vinto ? `ha indovinato in ${this.righe[p].length}!` : 'ha finito i tentativi', vinto ? `indovinata in ${this.righe[p].length}! 🎉` : 'tentativi finiti…', vinto);
      if (!this.attesi().length) this.chiudi();
    }
    return { ok: true };
  }

  // assente o sulle dispense per troppo tempo: nello scontro rinuncia (con un solo giocatore la partita aspetta)
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
    this.annuncia(null, `La parola era ${this.segreta.toUpperCase()}`, '', true);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: false, vincitori };
    return { ok: true };
  }

  // il trucco segreto (!win): finché sta ancora giocando gli sussurra la parola
  suggerimentoWin(posto) { return !this.finita && !this.fatto[posto] ? `🟩 ${this.segreta.toUpperCase()}` : null; }

  vista(p) {
    const svela = this.finita;
    return {
      gioco: this.id, n: this.n, lunghezza: this.lunghezza, tentativi: TENTATIVI, soloDizionario: this.soloDizionario, difficile: this.difficile,
      mie: this.righe[p], mioFatto: this.fatto[p],
      // degli altri si vede solo quanti tentativi hanno fatto (e se hanno finito), non le lettere
      altri: this.righe.map((r, i) => ({ tentativi: r.length, fatto: this.fatto[i], righe: svela ? r : r.map((x) => ({ esito: this.fatto[p] ? x.esito : null })) })),
      segreta: svela || this.fatto[p] ? this.segreta : null,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// sceglie parole compatibili con tutti i colori visti finora
function compatibile(w, righe) { return righe.every((r) => valuta(r.parola, w).join('') === r.esito.join('')); }
function bot(g, posto, livello) {
  const righe = g.righe[posto];
  const elenco = SEGRETE(g.lunghezza);
  const possibili = elenco.filter((w) => compatibile(w, righe));
  if (livello === 'facile' && Math.random() < 0.45) {
    const altre = elenco.filter((w) => !righe.some((r) => r.parola === w) && !(g.difficile && controllaDifficile(w, righe)));
    return { tipo: 'prova', parola: altre[Math.floor(Math.random() * altre.length)] || elenco[0] };
  }
  if (livello === 'difficile' && righe.length === 0) {
    // prima parola: quella con più lettere diverse e frequenti
    const freq = {};
    for (const w of elenco) for (const c of new Set(w)) freq[c] = (freq[c] || 0) + 1;
    const punteggio = (w) => [...new Set(w)].reduce((s, c) => s + freq[c], 0);
    return { tipo: 'prova', parola: [...elenco].sort((a, b) => punteggio(b) - punteggio(a))[0] };
  }
  const tra = possibili.length ? possibili : elenco;
  return { tipo: 'prova', parola: tra[Math.floor(Math.random() * tra.length)] };
}

module.exports = {
  meta: {
    id: 'wordle',
    nome: 'Wordle',
    tipo: 'tabellone',
    saltaAssenti: true, // nello scontro chi è via troppo a lungo si ritira (il computer non gioca al suo posto)
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Indovina la parola in 6 tentativi, da 4 a 8 lettere. Da soli o in scontro sulla stessa parola.',
    opzioni: [
      { id: 'lunghezza', nome: 'Lunghezza', valori: ['caso', 4, 5, 6, 7, 8], etichette: ['A caso (4-8)', '4 lettere', '5 lettere', '6 lettere', '7 lettere', '8 lettere'], predefinito: 5 },
      { id: 'modo', nome: 'Modalità', valori: ['normale', 'difficile'], etichette: ['Normale', 'Difficile: gli indizi trovati vanno usati'], predefinito: 'normale' },
      { id: 'controllo', nome: 'Parole ammesse', valori: ['libero', 'dizionario'], etichette: ['Parole vere (controllate da fantasIA)', 'Solo parole del dizionario italiano del sito'], predefinito: 'libero' },
    ],
    regole: [
      'Devi indovinare una parola italiana segreta in 6 tentativi. La lunghezza (da 4 a 8 lettere, oppure a caso) si sceglie prima di iniziare ed è mostrata dalle caselle.',
      'Scrivi una parola della lunghezza giusta (con la tastiera del computer o quella sullo schermo) e premi Invio. Gli accenti non contano.',
      'Ogni lettera si colora: verde se è nella parola e al posto giusto, ocra se è nella parola ma in un altro posto, grigia se non c\'è. Le lettere doppie contano: se la parola segreta ha una sola A, solo una A del tuo tentativo si colora.',
      'Con l\'opzione "Solo parole del dizionario" i tentativi devono essere parole del dizionario italiano del sito (lo stesso del Paroliere, con plurali e voci dei verbi). Con "Parole vere" puoi scrivere qualsiasi parola italiana: fantasIA, l\'intelligenza artificiale del sito, controlla che esista davvero (parole inventate o lettere a caso non sono accettate e il tentativo non si perde).',
      'Modalità difficile: gli indizi vanno sempre usati. Una lettera verde deve restare al suo posto nei tentativi successivi e una lettera ocra deve comparire di nuovo (da qualche parte). Un tentativo che non li rispetta viene rifiutato senza perderlo.',
      'Da soli: provi a trovarla nel minor numero di tentativi. C\'è anche la Sfida del giorno: la stessa parola per tutti, con la classifica di oggi (dalla home).',
      'Scontro (da 2 giocatori in su): tutti cercano la stessa parola, ognuno per conto suo e nello stesso momento. Non vedi le lettere degli altri, solo quanti tentativi hanno fatto e, quando hai finito anche tu, i loro colori. Vince chi la indovina con meno tentativi; a parità vince chi ci è arrivato prima. Punti: 7 meno i tentativi usati.',
      'Chi è assente o sulle dispense a lungo nello scontro si ritira; da soli la partita aspetta che torni.',
      'Il computer facile prova anche parole a caso, il medio sceglie sempre parole compatibili con i colori visti, il difficile in più apre con la parola più ricca di lettere frequenti.',
    ],
  },
  crea: (o) => new Wordle(o),
  bot,
  _test: { controllaDifficile, valuta, PAROLE, SEGRETE, normalizza },
};
