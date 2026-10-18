// QUIZ DI CULTURA GENERALE: più di 800 domande in otto argomenti, 4 risposte, con il motore di "Indovina la
// bandiera" (giochi/bandiere.js: tempo, punti per velocità in sfida, serie, ripasso). Le risposte sbagliate sono
// scritte apposta per ogni domanda (sono "elementi" che non finiscono mai nei mazzi).
const { Bandiere, mescola, bot } = require('../giochi/bandiere');
const PARTI = [require('./quiz-dati-a'), require('./quiz-dati-b'), require('./quiz-dati-c'), require('./quiz-dati-d')];

const ARGOMENTI = {
  storia: ['Storia', '🏛️'], geografia: ['Geografia', '🌍'], scienze: ['Scienze e natura', '🔬'], arte: ['Arte, letteratura e musica', '🎨'],
  sport: ['Sport e giochi', '⚽'], spettacolo: ['Cinema, musica e tv', '🎬'], varie: ['Lingua, cucina e curiosità', '💡'], italia: ['Italia: città, feste, cucina e dialetti', '🇮🇹'],
};
// le parti possono avere lo stesso argomento: le righe si sommano
const TESTI = {};
for (const parte of PARTI) for (const [arg, testo] of Object.entries(parte)) TESTI[arg] = (TESTI[arg] || '') + testo;
const elementi = [];
const sbagliate = new Map(); // indice della risposta giusta -> indici delle 3 sbagliate
const DOMANDE = [];
for (const [arg, testo] of Object.entries(TESTI)) {
  for (const riga of testo.trim().split('\n').filter((r) => r.trim())) {
    const [domanda, giusta, s1, s2, s3, liv] = riga.split('|');
    const i = elementi.length;
    elementi.push({ nome: giusta, domanda, fama: Number(liv), argomento: arg, icona: ARGOMENTI[arg][1] });
    const ids = [s1, s2, s3].map((nome) => { elementi.push({ nome, distrattore: true }); return elementi.length - 1; });
    sbagliate.set(i, ids);
    DOMANDE.push(i);
  }
}
const mazzi = { tutte: DOMANDE, facili: DOMANDE.filter((i) => elementi[i].fama === 1), difficili: DOMANDE.filter((i) => elementi[i].fama >= 2) };
for (const a of Object.keys(ARGOMENTI)) mazzi[a] = DOMANDE.filter((i) => elementi[i].argomento === a);

const BANCA = {
  id: 'quiz', elementi, mazzi, chiaveMazzo: 'argomento', cosa: 'Domanda', domanda: '',
  scelte: (giusta) => mescola([giusta, ...sbagliate.get(giusta)]),
};
const valori = ['tutte', ...Object.keys(ARGOMENTI), 'facili', 'difficili'];
const etichette = valori.map((v) => `${v === 'tutte' ? 'Tutti gli argomenti' : v === 'facili' ? 'Solo domande facili' : v === 'difficili' ? 'Solo domande difficili' : `${ARGOMENTI[v][1]} ${ARGOMENTI[v][0]}`} (${mazzi[v].length})`);

module.exports = {
  meta: {
    id: 'quiz',
    nome: 'Quiz di cultura generale',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: `${DOMANDE.length} domande su storia, geografia, scienze, arte, sport, spettacolo, curiosità e Italia: 4 risposte, una sola giusta. Da soli o in sfida.`,
    alias: ['quiz', 'cultura generale', 'domande', 'trivia', 'sapientino', 'chi vuol essere', 'risposte'],
    opzioni: [
      { id: 'argomento', nome: 'Argomento', valori, etichette, predefinito: 'tutte' },
      { id: 'domande', nome: 'Domande', valori: [10, 20, 30], etichette: ['10 domande', '20 domande', '30 domande'], predefinito: 10 },
      { id: 'tempo', nome: 'Tempo', valori: [15, 10, 6], etichette: ['15 secondi', '10 secondi', '6 secondi (veloce)'], predefinito: 15 },
    ],
    regole: [
      `Ci sono ${DOMANDE.length} domande divise in otto argomenti: ${Object.values(ARGOMENTI).map((x) => x[0].toLowerCase()).join(', ')}. Prima di iniziare puoi sceglierne uno, oppure solo le facili o solo le difficili.`,
      'Compare una domanda con 4 risposte: tocca quella giusta (o premi i tasti da 1 a 4) prima che finisca il tempo. Si può rispondere una volta sola.',
      'Quando hanno risposto tutti, o quando finisce il tempo, si vede la risposta giusta (in verde) e la tua se era sbagliata (in rosso), poi arriva la domanda dopo.',
      'Da soli: 1 punto per ogni risposta giusta; si tiene anche la serie di risposte giuste di fila.',
      'Sfida (da 2 a 8): tutti vedono la stessa domanda nello stesso momento. Una risposta giusta vale 10 punti più un bonus fino a 10 per la velocità. Vince chi ha più punti alla fine.',
      'A fine partita compare il ripasso: le domande sbagliate, con la risposta giusta.',
      'Il computer facile sa quasi solo le domande facili ed è lento; il medio ne sa di più; il difficile le sa quasi tutte e risponde in fretta.',
    ],
  },
  crea: (o) => new Bandiere(o, BANCA),
  bot,
  _test: { BANCA, DOMANDE, ARGOMENTI },
};
