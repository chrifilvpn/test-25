// Parole per Disegna e indovina: cose che si possono disegnare, in italiano, divise per categoria.
// Si esporta l'elenco completo (tutte le categorie); PAROLE.categorie ha le parole di ogni categoria.
const CATEGORIE = {
  animali: { nome: 'Animali', parole: [
    'gatto', 'cane', 'cavallo', 'mucca', 'maiale', 'pecora', 'gallina', 'pulcino', 'anatra', 'coniglio', 'topo', 'elefante', 'giraffa',
    'leone', 'tigre', 'zebra', 'scimmia', 'orso', 'panda', 'volpe', 'lupo', 'serpente', 'coccodrillo', 'tartaruga', 'rana', 'pesce',
    'squalo', 'balena', 'delfino', 'polpo', 'medusa', 'granchio', 'stella marina', 'lumaca', 'farfalla', 'ape', 'ragno', 'formica',
    'coccinella', 'pinguino', 'gufo', 'pappagallo', 'aquila', 'fenicottero', 'canguro', 'dinosauro', 'drago', 'unicorno', 'riccio',
    'pipistrello', 'cammello', 'cigno', 'pavone', 'gambero', 'cavalluccio marino', 'lucertola', 'camaleonte', 'gorilla', 'koala',
    'rinoceronte', 'ippopotamo', 'struzzo', 'tucano', 'scoiattolo', 'castoro', 'talpa', 'criceto', 'pesce rosso', 'vespa', 'zanzara',
    'verme', 'bruco', 'cervo', 'alce', 'lama', 'orca', 'tricheco', 'foca', 'lontra',
  ] },
  cibo: { nome: 'Cibo', parole: [
    'pizza', 'mela', 'banana', 'fragola', 'anguria', 'uva', 'ananas', 'limone', 'carota', 'pomodoro', 'fungo', 'formaggio', 'uovo',
    'panino', 'gelato', 'torta', 'biscotto', 'caramella', 'cioccolato', 'spaghetti', 'hamburger', 'patatine', 'popcorn', 'ciambella',
    'cornetto', 'pane', 'caffè', 'latte', 'lecca lecca', 'zucca', 'pera', 'ciliegia', 'melanzana', 'peperoncino', 'pesca', 'kiwi', 'cocco',
    'avocado', 'broccolo', 'cipolla', 'aglio', 'mais', 'patata', 'insalata', 'salame', 'prosciutto', 'sushi', 'lasagna', 'tortellini',
    'polpetta', 'hot dog', 'toast', 'frittata', 'muffin', 'cupcake', 'panettone', 'pandoro', 'cannolo', 'crostata', 'gelatina',
  ] },
  casa: { nome: 'Casa e oggetti', parole: [
    'casa', 'porta', 'finestra', 'letto', 'sedia', 'tavolo', 'divano', 'lampada', 'orologio', 'sveglia', 'televisione', 'telefono',
    'computer', 'tastiera', 'forbici', 'matita', 'penna', 'libro', 'quaderno', 'zaino', 'ombrello', 'occhiali', 'chiave', 'lucchetto',
    'candela', 'specchio', 'spazzolino', 'pettine', 'vasca', 'doccia', 'frigorifero', 'forno', 'pentola', 'forchetta', 'cucchiaio',
    'coltello', 'tazza', 'bottiglia', 'bicchiere', 'scopa', 'secchio', 'martello', 'chiodo', 'cacciavite', 'scala', 'sapone', 'regalo',
    'palloncino', 'aquilone', 'robot', 'calamita', 'batteria', 'lampadina', 'microfono', 'chitarra', 'pianoforte', 'tamburo', 'violino',
    'tromba', 'cuffie', 'macchina fotografica', 'armadio', 'scrivania', 'libreria', 'cuscino', 'coperta', 'tappeto', 'attaccapanni',
    'lavatrice', 'aspirapolvere', 'ventilatore', 'termosifone', 'camino', 'campanello', 'cassetta postale', 'chiave inglese', 'pinza',
    'trapano', 'sega', 'pennello', 'spugna', 'mollette', 'cestino',
  ] },
  vestiti: { nome: 'Vestiti', parole: [
    'cappello', 'scarpa', 'calzino', 'maglietta', 'pantaloni', 'gonna', 'sciarpa', 'guanto', 'cravatta', 'corona', 'anello', 'borsa',
    'giacca', 'cappotto', 'felpa', 'pigiama', 'costume da bagno', 'stivali', 'ciabatte', 'cintura', 'bretelle', 'orecchini', 'collana',
    'braccialetto', 'zainetto', 'berretto', 'casco',
  ] },
  natura: { nome: 'Natura e luoghi', parole: [
    'sole', 'luna', 'stella', 'nuvola', 'pioggia', 'neve', 'fulmine', 'arcobaleno', 'vulcano', 'montagna', 'isola', 'fiume', 'mare',
    'spiaggia', 'albero', 'fiore', 'cactus', 'foglia', 'palma', 'girasole', 'fuoco', 'onda', 'deserto', 'castello', 'piramide', 'faro',
    'ponte', 'chiesa', 'scuola', 'ospedale', 'tenda', 'igloo', 'grattacielo', 'fontana', 'giardino', 'pupazzo di neve', 'pianeta', 'razzo',
    'astronauta', 'cometa', 'tornado', 'ghiacciaio', 'cascata', 'grotta', 'lago', 'bosco', 'prato', 'collina', 'oasi', 'conchiglia',
    'sasso', 'tronco', 'quadrifoglio', 'rosa', 'tulipano', 'margherita', 'fattoria', 'mulino a vento', 'stazione', 'aeroporto', 'stadio',
    'museo',
  ] },
  trasporti: { nome: 'Trasporti', parole: [
    'macchina', 'bicicletta', 'moto', 'autobus', 'treno', 'aereo', 'elicottero', 'nave', 'barca', 'sottomarino', 'trattore', 'camion',
    'ambulanza', 'semaforo', 'monopattino', 'mongolfiera', 'skateboard', 'paracadute', 'taxi', 'tram', 'metropolitana', 'funivia',
    'gommone', 'canoa', 'zattera', 'carro armato', 'ruspa', 'gru', 'carriola', 'slitta',
  ] },
  persone: { nome: 'Persone e corpo', parole: [
    'occhio', 'naso', 'bocca', 'orecchio', 'mano', 'piede', 'cuore', 'dente', 'scheletro', 'pirata', 'fantasma', 'strega', 'mago', 're',
    'regina', 'cavaliere', 'cuoco', 'pompiere', 'poliziotto', 'dottore', 'pagliaccio', 'sirena', 'vampiro', 'ninja', 'cowboy', 'supereroe',
    'spalla', 'ginocchio', 'cervello', 'baffi', 'barba', 'capelli', 'lingua', 'sopracciglio', 'postino', 'giardiniere', 'pittore',
    'ballerina', 'sub', 'principessa', 'elfo', 'gnomo', 'zombie', 'mummia',
  ] },
  sport: { nome: 'Sport e giochi', parole: [
    'pallone', 'porta da calcio', 'canestro', 'racchetta', 'bowling', 'scacchi', 'dado', 'carte da gioco', 'altalena', 'scivolo', 'piscina',
    'medaglia', 'coppa', 'fischietto', 'bersaglio', 'freccia', 'arco', 'spada', 'scudo', 'mappa del tesoro', 'bussola', 'binocolo', 'sci',
    'snowboard', 'surf', 'pattini', 'tennis', 'golf', 'boxe', 'karate', 'tuffo', 'arrampicata', 'corda per saltare', 'yo yo', 'trottola',
    'puzzle', 'burattino',
  ] },
  altro: { nome: 'Altro', parole: [
    'bandiera', 'busta', 'francobollo', 'soldi', 'salvadanaio', 'calendario', 'clessidra', 'microscopio', 'telescopio', 'ancora', 'catena',
    'ragnatela', 'impronta', 'nuvola parlante', 'cuore spezzato', 'mostro', 'alieno', 'ufo', 'bomba', 'trofeo', 'lavagna', 'torre',
    'calamaio', 'pergamena', 'corona di fiori', 'mappa', 'globo', 'lanterna', 'caramella gommosa', 'candelina', 'regalo di natale',
    'albero di natale', 'zucca di halloween', 'uovo di pasqua', 'coriandoli', 'fuochi d\'artificio',
  ] },
};
const PAROLE = Object.values(CATEGORIE).flatMap((c) => c.parole);
PAROLE.categorie = CATEGORIE;
module.exports = PAROLE;
