// NOMI COSE CITTÀ: gli elenchi delle risposte valide per categoria. Servono a convalidare da sole le risposte
// sicure (le altre si votano) e a far rispondere il computer. Una parola per riga, divise per spazi o virgole;
// le risposte di più parole sono scritte con il trattino basso al posto dello spazio.
const L = {
  nomi: `
abele achille ada adamo adele adelaide adriana adriano agata agnese agostino alba alberto alda aldo alessandra alessandro alessia alessio alfio alfonso alfredo alice alida alma alvise amalia ambra ambrogio amedeo amelia amerigo anastasia andrea angela angelica angelo anita anna annalisa annamaria antonella antonio antonino anselmo arianna aristide arnaldo arturo asia assunta attilio augusto aurelio aurora azzurra
barbara bartolomeo battista beatrice benedetta benedetto beniamino benito bernardo bettino bianca bonifacio brando brigida bruna bruno
camilla camillo carla carlo carlotta carmela carmelo carmine carolina caterina cecilia celeste cesare chiara cinzia ciro clara claudia claudio clelia clemente clotilde concetta corrado cosimo costantino costanza cristiana cristiano cristina cristoforo
dafne damiano daniela daniele dante dario davide debora delia demetrio denis desiree diana diego dino dionigi domenica domenico donatella donato dora doriana dorotea
edoardo egidio elda elena eleonora elia elio elisa elisabetta ella elvira emanuela emanuele emilia emiliano emilio emma enea enrica enrico enzo ercole erica ermanno ernesto ester ettore eugenia eugenio eva evelina ezio
fabiana fabio fabiola fabrizio fausta fausto federica federico fedele felice ferdinando fernanda fernando ferruccio filippa filippo fiorella flavia flavio franca francesca francesco franco fulvio furio
gabriele gabriella gaetano gaia gaspare gastone gemma gennaro gerardo germana giacomo giada gianna gianni gilberto gilda gina gino gioele giorgia giorgio giovanna giovanni gisella giuditta giulia giuliana giuliano giulio giuseppe giuseppina giusy goffredo graziella grazia gregorio guglielmo guido gustavo
ida ignazio igor ilaria ilario ines ingrid irene iris irma isabella isacco isidoro italo ivan ivana ivo
jacopo
lara laura lavinia lazzaro lea leandro leda lelio lena leo leonardo leone leopoldo letizia lia liana licia lidia liliana lina lino livia livio lodovico lorena lorenzo loredana luana luca lucia luciana luciano lucio ludovica ludovico luigi luigia luisa lupo
maddalena mafalda manfredi manuela manuel mara marcella marcello marco margherita maria marianna mariano marina marino mario marisa marta martina martino massimiliano massimo matilde matteo mattia maura maurizio mauro melania melissa mia michela michele milena mirco mirella miriam monica
nadia natale natalia nazareno nello nicola nicoletta nicolò nina nino noemi nora norberto norma
olga oliviero olivia omar ondina orazio oreste oriana orlando ornella oscar osvaldo ottavia ottavio
paola paolo pasquale patrizia patrizio pierluigi piero pietro pio piera prisca priscilla
quintino quirino
rachele raffaele raffaella raimondo ramona rebecca regina remo renata renato riccardo rina rinaldo rino rita roberta roberto rocco rodolfo romana romano romeo romolo rosa rosalba rosalia rosanna rosaria rosario rossana rossella ruggero
sabina sabrina salvatore samuele samuela sandra sandro sara saverio sebastiano selene selvaggia serafina serena sergio silvana silvano silvia silvio simona simone sofia sonia stefania stefano susanna
tamara tancredi tea teresa teodoro tiziana tiziano tobia tommaso tullio
ubaldo uberto ugo ulisse umberto ursula
valentina valentino valeria valerio vanessa vanna vasco veronica vincenzo viola violetta virgilio virginia vito vittoria vittorio viviana
walter wanda
zaccaria zeno zita zoe`,

  cose: `
accappatoio aeroplano affettatrice agenda alambicco ancora apriscatole arcolaio armonica ascensore asciugamano asciugacapelli aspirina astrolabio attizzatoio
bacinella badge baldacchino bambolotto barattolo barometro bauletto bavaglino bilancia biliardino bisaccia blocchetto boccale boccia bollitore borsetta bracciale braciere brocca bulldozer burattino
caleidoscopio calice cammeo cancello candeliere canna cannocchiale cantinetta capanna caricabatterie carillon cassapanca cassaforte cavalletto ceppo cestino cesto cetra chitarra ciambella cinepresa ciotola citofono clessidra colapasta collana colino comodino compasso coppa corno corona cotton_fioc credenza crocifisso
damigiana dentiera divisa doccia
evidenziatore
falce fanale faro fascia fermacarte fermaglio fiala fiaccola fiasco fibbia fischietto fodera fontana forcina fornello francobollo frullatore fuso
gavetta gemello gessetto ghirlanda giocattolo giradischi gong grammofono graffetta griglia gruccia
icona incensiere inchiostro interfono imbuto
lacci laccio lametta lavastoviglie lente lettino leggio lenza lettiera libretto lucidalabbra lume
mandolino mangianastri manicotto mappamondo maracas mascherina mattarello mazza mazzuolo metronomo mestolo mezzaluna microscopio mitra mocassino mollette monopattino mortaio
navetta nebulizzatore necessaire
oblò occhialino oliera ombrellone orcio organo orsacchiotto ovatta
pacco paletta paralume parafango parabrezza passeggino pastello pattumiera pedana pendolo pentagramma piastrella piccone piffero pinza pipa piroscafo pistola piumino plafoniera pneumatico portaombrelli portacenere posata pupazzo
radiatore raganella ramazza rastrelliera reggiseno ricetrasmittente rivista rocchetto rosario rullo
saliera sacchetto salvagente scacchiera scalpello scaldabagno scarpone scettro schermo sciabola scolapasta scivolo sdraio segnalibro sella sgabello slip smartphone soprammobile spada spatola spremiagrumi stampante stendino stereo stuzzicadenti sveglia
tablet tagliere tagliaerba tagliacarte telecomando telescopio temperamatite tenaglia termos teschio tessera timone tostapane torcia tracolla trapano treppiede triciclo tromba trombone tuta
ukulele ugello
ventosa vanga veliero ventaglio videocamera vinile violoncello
zampogna zanzariera zerbino zuccheriera
abaco accendino acquario ago album altalena amaca ampolla anello annaffiatoio antenna appendiabiti aquilone arancia armadio aspirapolvere astuccio attaccapanni autobus automobile
bacchetta badile bambola banco bandiera barattolo barca barile bastone batteria baule becco bicchiere bicicletta bidone biglietto binocolo biro bisturi bottiglia bottone borsa borraccia braccialetto bretelle bussola busta
cacciavite caffettiera calamita calcolatrice calendario calza camicia caminetto campana campanello candela canestro canotto cappello cappotto caraffa carrello carriola carta cartella casco cassetto catena cavatappi cerotto chiave chiodo ciabatta cintura clacson coltello computer coperta coperchio corda cornice cravatta cucchiaio cuscino
dado davanzale dentifricio diadema diamante disco ditale divano dizionario
elastico elicottero elmo enciclopedia
fazzoletto fermaglio ferro fiammifero filo fionda fischietto fisarmonica flauto forbici forchetta forno frigorifero frusta fucile
gabbia gancio gelato gesso giacca ginocchiera giornale giostra gomitolo gomma gonna grattugia grembiule gruccia guanto
imbuto impermeabile incudine innaffiatoio interruttore
lampada lampadario lampadina lanterna lavagna lavatrice lavello lenzuolo letto libro lima lucchetto lucerna
macchina magnete maglia maglione manico manopola mantello martello maschera matita materasso mattone medaglia mestolo microfono mobile moneta motore mouse mozzicone
nastro navicella nave nodo
occhiali ombrello orologio orecchino
padella pala palla pallone panca panchina pantaloni pantofola paracadute parasole pattini pennello penna pentola pettine pianoforte piatto piuma poltrona portafoglio portachiavi pozzo
quaderno quadro
racchetta radio rasoio rastrello registratore remo rete righello robot rossetto rubinetto ruota
sacco salvadanaio sandalo sapone sasso scaffale scala scarpa scatola sciarpa scodella scopa scrivania secchio sedia sega siringa slitta specchio spazzola spazzolino spillo spugna stampella stivale strofinaccio
tamburo tappeto tappo tastiera tavolo tazza teiera telefono televisore tenda termometro termosifone timbro tovaglia tovagliolo treno trombetta trottola tubo
uncinetto uovo
valigia vaso vassoio ventaglio ventilatore vestito violino vite
zaino zappa zattera zerbino zoccolo zufolo`,

  citta: `
agrigento alessandria ancona aosta arezzo ascoli_piceno asti avellino bari barletta belluno benevento bergamo biella bologna bolzano brescia brindisi cagliari caltanissetta campobasso carbonia caserta catania catanzaro chieti como cosenza cremona crotone cuneo enna fermo ferrara firenze foggia forlì frosinone genova gorizia grosseto imperia isernia l'aquila la_spezia latina lecce lecco livorno lodi lucca macerata mantova massa matera messina milano modena monza napoli novara nuoro oristano padova palermo parma pavia perugia pesaro pescara piacenza pisa pistoia pordenone potenza prato ragusa ravenna reggio_calabria reggio_emilia rieti rimini roma rovigo salerno sassari savona siena siracusa sondrio taranto teramo terni torino trapani trento treviso trieste udine urbino varese venezia verbania vercelli verona vibo_valentia vicenza viterbo
acireale alba albenga alghero altamura amalfi andria anzio aprilia arzachena assisi aversa bagheria bassano_del_grappa battipaglia bitonto bra busto_arsizio capri carpi carrara cassino castellammare_di_stabia cattolica cefalù cerignola cervia cesena chioggia cinisello_balsamo città_di_castello civitavecchia conegliano cortina_d'ampezzo cortona crema empoli faenza fano fiumicino foligno formia gaeta gallarate gela giugliano gubbio imola ischia ivrea jesolo lamezia_terme lanciano legnano lipari lucera manfredonia marsala merano mestre modica molfetta moncalieri montepulciano monza nardò nettuno noto olbia orvieto ostuni otranto padula paestum pinerolo piombino pompei portofino positano pozzuoli rapallo riccione rovereto saluzzo san_marino sanremo sansepolcro sassuolo scafati senigallia sesto_san_giovanni sorrento spoleto sulmona taormina termoli tivoli trani tropea velletri ventimiglia viareggio vigevano vittoria volterra
aberdeen accra addis_abeba adelaide algeri alessandria_d'egitto amburgo amman amsterdam ankara anversa asuncion atene atlanta auckland avana baghdad baku bangkok barcellona basilea belfast belgrado berlino berna betlemme bilbao birmingham bogotà bombay bonn bordeaux boston brasilia bratislava brema brisbane bristol bruges bruxelles bucarest budapest buenos_aires cairo calcutta calgary canberra cannes caracas cardiff casablanca chicago colonia copenaghen cordova cracovia dakar dallas damasco delhi denver detroit dresda dubai dublino dubrovnik edimburgo eindhoven francoforte friburgo gerusalemme ginevra glasgow granada graz guadalajara helsinki hong_kong houston innsbruck istanbul kabul kiev kyoto la_paz lagos las_vegas leeds lione lipsia lisbona liverpool londra los_angeles lima lubiana lussemburgo madrid malaga manchester manila marrakech marsiglia melbourne miami minsk monaco montevideo montreal mosca monaco_di_baviera nairobi nantes nizza norimberga new_york oslo ottawa oxford parigi pechino perth philadelphia porto praga quebec quito rabat reykjavik riga rio_de_janeiro riad rotterdam salisburgo salonicco san_francisco san_pietroburgo santiago san_paolo sarajevo seattle seul shanghai siviglia singapore smirne sofia stoccarda stoccolma strasburgo sydney tallinn tangeri teheran tel_aviv tirana tokyo toledo toronto tolosa tunisi valencia valletta vancouver varsavia vienna vilnius washington zagabria zurigo`,

  animali: `
acaro alano allodola anaconda anfibio ape_regina aringa asinello assiolo avvoltoio
balestruccio balia barbo beagle bertuccia biscia bisonte boxer bufalo bulldog
cagnolino calabrone calamaro canguro capinera capodoglio cardellino carpa cavedano cernia chihuahua chiocciola cinciarella cocker colibrì corallo cormorano cozza crostaceo
dalmata diavolo_della_tasmania drago_di_komodo dentice
eider elefante_marino emù
falena folaga fennec formichiere fringuello
gabbiano gattino germano giraffa gorgonia granchio grifone gruccione
ibis ippocampo ittiosauro
lamantino lemming leprotto lince lepre_artica lombrico luccio lumacone
macaone maggiolino martin_pescatore merluzzo millepiedi mitilo moscardino mosca muflone
nasello nibbio
ocelot oritteropo orso_bruno orso_polare oca_selvatica
panda pangolino pavoncella persico pesce_palla pettirosso piovra platessa poiana procellaria
rana_toro razza rinoceronte rombo
san_bernardo sanguisuga scricciolo scorfano sciacallo scoiattolo sgombro sparviere spinarello stella_marina storno suricato
tarabuso tarlo tarma termite testuggine tilapia tricheco triglia
uistitì uria
vitellino volpe_artica vombato
wapiti
zigolo
abramide acciuga airone albatro alce allocco alpaca anaconda anatra anguilla antilope ape aquila aragosta armadillo asino assiolo avvoltoio
babbuino balena balenottera barbagianni barracuda bassotto beccaccia bisonte boa bombo bradipo bruco bue bufalo
cammello camaleone canarino cane canguro capodoglio capra capriolo carpa castoro cavalletta cavallo cavalluccio_marino cerbiatto cervo cicala cicogna cigno cimice cincillà cinghiale cinciallegra civetta cobra coccinella coccodrillo colibrì colomba condor coniglio corvo coyote criceto cuculo
daino delfino dingo donnola dromedario
elefante ermellino
fagiano faina falco farfalla fenicottero foca formica fringuello furetto
gabbiano gallina gallo gamberetto gambero gattopardo gatto gazza gazzella geco ghepardo ghiro giaguaro gibbone giraffa gnu gorilla grillo gru gufo
iena iguana impala ippopotamo istrice
koala
labrador lama lemure leone leopardo lepre libellula lince lombrico lontra lucertola lucciola lumaca lupo
macaco maiale mammut mandrillo mangusta mantide marmotta martora medusa merlo moffetta mosca moscerino mucca mulo murena
narvalo nutria
oca orango orata orca orso ornitorinco ostrica ottarda
pantera pappagallo passero pavone pecora pellicano pernice pesce_rosso pesce_spada pettirosso picchio piccione pinguino pipistrello piranha pitone polipo pollo polpo porcellino_d'india porcospino procione puma puledro pulce
quaglia
ragno rana renna riccio rinoceronte rondine rospo
salamandra salmone sardina scarafaggio scimmia scimpanzé scoiattolo scorpione seppia serpente sogliola sparviero spigola squalo stambecco storione struzzo
talpa tacchino tafano tapiro tarantola tartaruga tasso tigre tonno topo tordo trota tucano
upupa usignolo
vacca vespa vipera vitello volpe
yak
zanzara zebra zebù zibellino`,

  frutta: `
alchechengi arachide asparago agretti amarena
bacca bergamotto bietola biete borragine broccoletti
cappero cardo cavolo_nero cavoletto ceci cedro cetriolino cicerchia cime_di_rapa cipollotto clementina corbezzolo crescione cumquat
dattero dragoncello
edamame erba_cipollina endivia
fico_d'india fragolina frutto_della_passione
germoglio giuggiola granoturco guava
insalata
lattuga lime loto lupino
mais maracuja melograno mirtillo_rosso mora_di_gelso
nespola
okra origano
pak_choi papaya pastinaca peperoncino pinolo platano pomodorino porcino puntarelle
quinoa
rabarbaro ribes_nero
scarola soia scorzonera
taccola tamarindo tartufo
uva_spina
verza_rossa
zucchina_trombetta
albicocca ananas anguria arachide arancia asparago avocado
banana barbabietola basilico bietola broccolo
cachi carciofo cardo carota castagna catalogna cavolfiore cavolo cedro cetriolo ciliegia cipolla cocco cocomero corbezzolo cicoria
dattero
fagiolino fagiolo fava fico finocchio fragola
giuggiola gelso
indivia
kiwi kumquat
lampone lattuga lenticchia limone litchi
mandarino mandorla mango melagrana melanzana mela melone mirtillo mora
nespola nocciola noce
oliva
papaya patata peperone pera pesca pisello pistacchio pomodoro pompelmo porro prezzemolo prugna
radicchio rapa ravanello ribes rucola
scalogno sedano sedano_rapa susina spinacio
tarassaco topinambur
uva uvetta
valeriana verza
zucca zucchina zenzero`,

  mestieri: `
accompagnatore addestratore addetto agente agronomo albergatore alpinista amministratore analista animatore annunciatore archeologo arredatore assicuratore assistente
badante bagnino batterista bracciante broker
calciatore cantiniere capitano capostazione capotreno cardiologo cartografo cavaliere centralinista chef ciclista clown collaboratore conciatore consulente corista costumista croupier
dattilografo decoratore deputato detective doganiere domatore
editore educatore enologo erborista esploratore estetista
fantino ferroviere filosofo fonico fumettista funambolo
gommista gondoliere grafico gruista
igienista illustratore imprenditore indossatore informatico istruttore
lavapiatti legatore logopedista
maggiordomo magazziniere manager mago marmista massaggiatore matematico metalmeccanico meteorologo minatore mobiliere modellista mozzo
naturalista neurologo nutrizionista
odontoiatra oste ottico
paramedico parroco pediatra pellettiere pianista portalettere presentatore prete procuratore produttore
radiologo receptionist redattore rigattiere
sacerdote saldatore scenografo segretaria senatore sindacalista soldato speaker spedizioniere stalliere steward stuccatore
tappezziere tatuatore tenore tornitore tranviere trapezista
ufficiale urologo
valletto venditore verniciatore vetrinista vivaista
zincatore
acrobata agricoltore allenatore ambasciatore antiquario apicoltore architetto armatore arbitro artigiano astronauta astronomo attore autista avvocato
ballerino bancario barbiere barista benzinaio bibliotecario bidello biologo boscaiolo bottegaio
calzolaio cameriere camionista cantante carabiniere carpentiere cartolaio casaro cassiere chimico chirurgo ciabattino commercialista commesso conducente contadino cuoco corriere
dentista designer dietologo direttore disegnatore dottore
ebanista economista edicolante elettricista esattore
fabbro facchino falegname farmacista fattorino fioraio fisico fisioterapista fornaio fotografo fruttivendolo
geometra gelataio giardiniere giornalaio giornalista giudice gioielliere guardia guida
idraulico imbianchino impiegato infermiere ingegnere insegnante interprete
lattaio lavandaio libraio liutaio
macellaio maestro magistrato manovale marinaio meccanico medico minatore modista mugnaio muratore musicista
netturbino notaio
oculista operaio orafo orologiaio ortolano ostetrica
panettiere parrucchiere pasticciere pastore pescatore pescivendolo pilota pittore pizzaiolo poliziotto pompiere portiere portinaio postino professore programmatore psicologo
questore
ragioniere regista restauratore
salumiere sarto scienziato scrittore scultore segretario sindaco sommelier spazzacamino stilista
tabaccaio tassista tecnico tipografo traduttore tranviere
usciere
vasaio veterinario vetraio vigile vignaiolo vinaio
zampognaro zoologo`,

  nazioni: `
afghanistan albania algeria andorra angola arabia_saudita argentina armenia australia austria azerbaigian
bahamas bahrein bangladesh barbados belgio belize benin bhutan bielorussia bolivia bosnia botswana brasile brunei bulgaria burkina_faso burundi
cambogia camerun canada capo_verde ciad cile cina cipro colombia comore congo corea costa_d'avorio costa_rica croazia cuba
danimarca dominica
ecuador egitto el_salvador emirati_arabi eritrea estonia etiopia
figi filippine finlandia francia
gabon gambia georgia germania ghana giamaica giappone gibuti giordania grecia grenada guatemala guinea guyana
haiti honduras
india indonesia iran iraq irlanda islanda israele italia
kazakistan kenya kirghizistan kiribati kosovo kuwait
laos lesotho lettonia libano liberia libia liechtenstein lituania lussemburgo
macedonia madagascar malawi malesia maldive mali malta marocco mauritania maurizio messico micronesia moldavia monaco mongolia montenegro mozambico myanmar
namibia nauru nepal nicaragua niger nigeria norvegia nuova_zelanda
oman olanda
paesi_bassi pakistan palau panama papua paraguay perù polonia portogallo
qatar
regno_unito repubblica_ceca romania ruanda russia
salomone samoa san_marino senegal serbia seychelles sierra_leone singapore siria slovacchia slovenia somalia spagna sri_lanka stati_uniti sudafrica sudan suriname svezia svizzera
tagikistan taiwan tanzania thailandia togo tonga trinidad tunisia turchia turkmenistan tuvalu
ucraina uganda ungheria uruguay uzbekistan
vanuatu vaticano venezuela vietnam
yemen
zambia zimbabwe`,

  fiori: `
abrotano achillea agapanto alchemilla aloe_vera amaranto ambrosia aquilegia aster
basilico belladonna bergenia borragine buganvillea
caprifoglio cardo carpino ceppo cerro clematide clivia corbezzolo
datura digitale dittamo
echinacea elleboro erba_cipollina euforbia
fico fior_di_loto forsizia frangipane
gardenia giglio gramigna
ilex
kenzia
lauro lentisco ligustro lino
maggiorana mandorlo margheritina melo mirtillo
nasturzio nespolo noce
olmo origano
pervinca petunia pitosforo pruno
rafia rovo ruta
saponaria sempreverde stella_alpina stella_di_natale
tamerice tasso trifoglio tuia
valeriana
yucca
zucca_ornamentale
abete acacia acero agave agrifoglio alloro aloe amarillide anemone azalea
bambù begonia betulla biancospino bosso bouganvillea
cactus calendula calla camelia campanula canna castagno cedro ciclamino ciliegio cipresso crisantemo croco
dalia
edera erica eucalipto
faggio felce ficus fiordaliso frassino fucsia
garofano gelsomino genziana geranio gerbera giacinto giaggiolo ginepro ginestra girasole gladiolo glicine
ibisco iris ippocastano iperico
lavanda larice leccio lillà lilium loto
magnolia malva margherita menta mimosa mirto mughetto
narciso ninfea nontiscordardimé
oleandro olivo olmo orchidea ortensia ortica
palma papavero peonia pino pioppo platano primula
quercia
ranuncolo rododendro rosa rosmarino
salice salvia sambuco sequoia
tarassaco tiglio timo tulipano
verbena viola violetta vischio
zafferano zagara zinnia`,
};

const CATEGORIE = {
  nomi: { nome: 'Nomi', icona: '🧑', spiega: 'nome di persona' },
  cose: { nome: 'Cose', icona: '🧸', spiega: 'oggetto che si può toccare' },
  citta: { nome: 'Città', icona: '🏙️', spiega: 'città italiana o del mondo' },
  animali: { nome: 'Animali', icona: '🐾', spiega: 'animale' },
  frutta: { nome: 'Frutta e verdura', icona: '🍎', spiega: 'frutto, verdura o legume' },
  mestieri: { nome: 'Mestieri', icona: '🔧', spiega: 'mestiere o professione' },
  nazioni: { nome: 'Nazioni', icona: '🌍', spiega: 'Stato del mondo' },
  fiori: { nome: 'Fiori e piante', icona: '🌸', spiega: 'fiore, pianta o albero' },
};

// "Cappello", " l'Aquila ", "Forlì" → "cappello", "laquila", "forli"
function normalizza(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}
// la forma da mostrare: "reggio_emilia" → "reggio emilia"
const bella = (w) => w.replace(/_/g, ' ');

const ELENCHI = {};
const SET = {};
for (const [cat, testo] of Object.entries(L)) {
  const parole = [...new Set(testo.trim().split(/[\s,]+/).filter(Boolean))].map(bella);
  ELENCHI[cat] = parole;
  SET[cat] = new Map(parole.map((w) => [normalizza(w), w]));
}

module.exports = { CATEGORIE, ELENCHI, SET, normalizza };
