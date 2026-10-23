// DRAGHI E SEGRETE: i dati di base delle regole (dalle regole libere del gioco di ruolo fantasy più famoso, il
// documento di riferimento SRD 5.1 con licenza Creative Commons, tradotto e riscritto in italiano): caratteristiche,
// abilità, condizioni, stirpi, background, armi, armature ed equipaggiamento.

const CARATTERISTICHE = {
  for: { nome: 'Forza', breve: 'FOR', desc: 'Potenza fisica: colpire in mischia, sollevare, spingere, arrampicarsi.' },
  des: { nome: 'Destrezza', breve: 'DES', desc: 'Agilità e riflessi: armi a distanza e leggere, schivare, muoversi in silenzio.' },
  cos: { nome: 'Costituzione', breve: 'COS', desc: 'Resistenza: punti ferita, resistere a veleni e fatica, mantenere la concentrazione.' },
  int: { nome: 'Intelligenza', breve: 'INT', desc: 'Ragionamento e memoria: magia arcana dei maghi, conoscenze, indagini.' },
  sag: { nome: 'Saggezza', breve: 'SAG', desc: 'Percezione e intuito: magia divina e della natura, accorgersi delle cose, capire le persone.' },
  car: { nome: 'Carisma', breve: 'CAR', desc: 'Forza di personalità: convincere, ingannare, intimidire, magia di bardi, stregoni e warlock.' },
};
const ORDINE_CAR = ['for', 'des', 'cos', 'int', 'sag', 'car'];

const ABILITA = {
  acrobazia: { nome: 'Acrobazia', car: 'des' },
  animali: { nome: 'Addestrare Animali', car: 'sag' },
  arcano: { nome: 'Arcano', car: 'int' },
  atletica: { nome: 'Atletica', car: 'for' },
  furtivita: { nome: 'Furtività', car: 'des' },
  indagare: { nome: 'Indagare', car: 'int' },
  inganno: { nome: 'Inganno', car: 'car' },
  intimidire: { nome: 'Intimidire', car: 'car' },
  intrattenere: { nome: 'Intrattenere', car: 'car' },
  intuizione: { nome: 'Intuizione', car: 'sag' },
  medicina: { nome: 'Medicina', car: 'sag' },
  natura: { nome: 'Natura', car: 'int' },
  percezione: { nome: 'Percezione', car: 'sag' },
  persuasione: { nome: 'Persuasione', car: 'car' },
  rapidita: { nome: 'Rapidità di mano', car: 'des' },
  religione: { nome: 'Religione', car: 'int' },
  sopravvivenza: { nome: 'Sopravvivenza', car: 'sag' },
  storia: { nome: 'Storia', car: 'int' },
};

const CONDIZIONI = {
  accecato: { nome: 'Accecato', desc: 'Non vede: fallisce le prove che richiedono la vista; i suoi attacchi hanno svantaggio, quelli contro di lui vantaggio.' },
  affascinato: { nome: 'Affascinato', desc: 'Non può attaccare chi lo ha affascinato; chi lo ha affascinato ha vantaggio nelle prove sociali contro di lui.' },
  afferrato: { nome: 'Afferrato', desc: 'Velocità 0 finché non si libera (prova di Atletica o Acrobazia contro chi lo tiene).' },
  assordato: { nome: 'Assordato', desc: 'Non sente: fallisce le prove che richiedono l\'udito.' },
  avvelenato: { nome: 'Avvelenato', desc: 'Svantaggio ai tiri per colpire e alle prove di caratteristica.' },
  incapacitato: { nome: 'Incapacitato', desc: 'Non può fare azioni né reazioni.' },
  invisibile: { nome: 'Invisibile', desc: 'Non si vede: i suoi attacchi hanno vantaggio, quelli contro di lui svantaggio.' },
  paralizzato: { nome: 'Paralizzato', desc: 'Incapacitato, non si muove né parla; fallisce i tiri salvezza su Forza e Destrezza; gli attacchi contro di lui hanno vantaggio e da vicino sono critici.' },
  pietrificato: { nome: 'Pietrificato', desc: 'Trasformato in pietra: incapacitato, resistenza a tutti i danni.' },
  prono: { nome: 'Prono', desc: 'A terra: si muove strisciando; i suoi attacchi hanno svantaggio; gli attacchi da vicino contro di lui vantaggio, quelli a distanza svantaggio.' },
  privo: { nome: 'Privo di sensi', desc: 'Incapacitato, cade prono, lascia cadere quello che tiene; fallisce i tiri salvezza su Forza e Destrezza; gli attacchi da vicino sono critici.' },
  spaventato: { nome: 'Spaventato', desc: 'Svantaggio a prove e attacchi finché vede la fonte della paura; non può avvicinarsi a lei.' },
  stordito: { nome: 'Stordito', desc: 'Incapacitato, parla a fatica; fallisce i tiri salvezza su Forza e Destrezza; gli attacchi contro di lui hanno vantaggio.' },
  trattenuto: { nome: 'Trattenuto', desc: 'Velocità 0; i suoi attacchi e i tiri salvezza su Destrezza hanno svantaggio; gli attacchi contro di lui vantaggio.' },
  esausto: { nome: 'Esaurimento', desc: 'Livelli di fatica (da 1 a 6): prove con svantaggio, velocità dimezzata, poi attacchi e tiri salvezza con svantaggio, punti ferita massimi dimezzati, velocità 0, morte.' },
};

const TIPI_DANNO = {
  taglio: 'taglio', perforante: 'perforante', contundente: 'contundente', fuoco: 'fuoco', freddo: 'freddo', fulmine: 'fulmine',
  tuono: 'tuono', acido: 'acido', veleno: 'veleno', necrotico: 'necrotico', radioso: 'radioso', psichico: 'psichico', forza: 'forza',
};

const LINGUE = ['Comune', 'Nanico', 'Elfico', 'Gigante', 'Gnomesco', 'Goblin', 'Halfling', 'Orchesco', 'Abissale', 'Celestiale', 'Draconico', 'Linguaggio delle profondità', 'Infernale', 'Primordiale', 'Silvano', 'Sottocomune'];

// ---------- STIRPI ----------
// bonus: aumenti alle caratteristiche; tratti: descrizioni (alcuni con un effetto che il motore conosce: chiave "effetto")
const STIRPI = {
  umano: {
    nome: 'Umano', velocita: 30, taglia: 'Media', scuro: 0, lingue: ['Comune'], lingueScelte: 1,
    bonus: { for: 1, des: 1, cos: 1, int: 1, sag: 1, car: 1 },
    desc: 'I più numerosi e ambiziosi: versatili, si adattano a tutto. +1 a tutte le caratteristiche.',
    tratti: [{ nome: 'Versatilità', desc: '+1 a tutte le caratteristiche e una lingua in più.' }],
    nomi: { m: ['Aldo', 'Bruno', 'Corrado', 'Dario', 'Enrico', 'Fosco', 'Guido', 'Ivo', 'Leone', 'Marco', 'Oreste', 'Rinaldo', 'Tancredi', 'Ugo', 'Valerio'], f: ['Adele', 'Bianca', 'Clelia', 'Delia', 'Elena', 'Flavia', 'Gilda', 'Irene', 'Livia', 'Marta', 'Nives', 'Ofelia', 'Rosalba', 'Selvaggia', 'Viola'] },
  },
  elfo: {
    nome: 'Alto elfo', velocita: 30, taglia: 'Media', scuro: 60, lingue: ['Comune', 'Elfico'], lingueScelte: 1,
    bonus: { des: 2, int: 1 },
    desc: 'Eleganti e longevi, legati alla magia e alla natura. Vedono al buio, non dormono ma meditano, e la magia non li fa addormentare.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede nella penombra fino a 18 metri come in piena luce, e al buio come in penombra (senza colori).' },
      { nome: 'Sensi acuti', desc: 'Competenza in Percezione.', abilita: ['percezione'] },
      { nome: 'Retaggio fatato', desc: 'Vantaggio ai tiri salvezza contro l\'essere affascinato; la magia non lo può addormentare.', effetto: 'fatato' },
      { nome: 'Trance', desc: 'Medita 4 ore invece di dormire 8.' },
      { nome: 'Addestramento elfico', desc: 'Competenza con spada lunga, spada corta, arco corto e arco lungo.', armi: ['spadalunga', 'spadacorta', 'arcocorto', 'arcolungo'] },
      { nome: 'Trucchetto', desc: 'Conosce un trucchetto da mago (usa l\'Intelligenza).', trucchetto: 'mago' },
    ],
    nomi: { m: ['Aelar', 'Beiro', 'Carric', 'Erevan', 'Galinndan', 'Hadarai', 'Ivellios', 'Laucian', 'Mindartis', 'Riardon', 'Thamior', 'Varis'], f: ['Adrie', 'Birel', 'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Ielenia', 'Keyleth', 'Leshanna', 'Naivara', 'Quelenna', 'Sariel', 'Valanthe'] },
  },
  nano: {
    nome: 'Nano delle colline', velocita: 25, taglia: 'Media', scuro: 60, lingue: ['Comune', 'Nanico'], lingueScelte: 0,
    bonus: { cos: 2, sag: 1 },
    desc: 'Robusti, testardi e fieri, maestri della pietra e del metallo. Resistono ai veleni e non rallentano con l\'armatura pesante.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede al buio fino a 18 metri.' },
      { nome: 'Resilienza nanica', desc: 'Vantaggio ai tiri salvezza contro il veleno e resistenza ai danni da veleno.', effetto: 'resVeleno' },
      { nome: 'Addestramento nanico', desc: 'Competenza con ascia da battaglia, ascia, martello leggero e martello da guerra.', armi: ['asciabattaglia', 'ascia', 'martelloleggero', 'martelloguerra'] },
      { nome: 'Esperto della pietra', desc: 'Raddoppia la competenza nelle prove di Storia sulle opere in pietra.' },
      { nome: 'Robustezza nanica', desc: '+1 punto ferita massimo a ogni livello.', effetto: 'robusto' },
      { nome: 'Passo pesante', desc: 'L\'armatura pesante non riduce la velocità.' },
    ],
    nomi: { m: ['Adrik', 'Baern', 'Brottor', 'Dain', 'Eberk', 'Gardain', 'Harbek', 'Kildrak', 'Orsik', 'Rurik', 'Thorin', 'Vondal'], f: ['Amber', 'Bardryn', 'Dagnal', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Mardred', 'Riswynn', 'Torbera', 'Vistra'] },
  },
  halfling: {
    nome: 'Halfling piedelesto', velocita: 25, taglia: 'Piccola', scuro: 0, lingue: ['Comune', 'Halfling'], lingueScelte: 0,
    bonus: { des: 2, car: 1 },
    desc: 'Piccoli, allegri e incredibilmente fortunati. Si nascondono dietro creature più grandi e non hanno paura di niente.',
    tratti: [
      { nome: 'Fortunato', desc: 'Quando tira 1 al d20 per un attacco, una prova o un tiro salvezza, ritira il dado.', effetto: 'fortunato' },
      { nome: 'Coraggioso', desc: 'Vantaggio ai tiri salvezza contro l\'essere spaventato.', effetto: 'coraggio' },
      { nome: 'Agilità halfling', desc: 'Può passare nello spazio di creature più grandi.' },
      { nome: 'Furtività naturale', desc: 'Può nascondersi anche dietro una creatura più grande di lui.' },
    ],
    nomi: { m: ['Alton', 'Ander', 'Cade', 'Corrin', 'Eldon', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Perrin', 'Reed', 'Roscoe', 'Wellby'], f: ['Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Seraphina', 'Verna'] },
  },
  gnomo: {
    nome: 'Gnomo delle rocce', velocita: 25, taglia: 'Piccola', scuro: 60, lingue: ['Comune', 'Gnomesco'], lingueScelte: 0,
    bonus: { int: 2, cos: 1 },
    desc: 'Curiosi, inventori instancabili e pieni di entusiasmo. La loro mente resiste alla magia.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede al buio fino a 18 metri.' },
      { nome: 'Astuzia gnomesca', desc: 'Vantaggio ai tiri salvezza su Intelligenza, Saggezza e Carisma contro la magia.', effetto: 'astuzia' },
      { nome: 'Conoscenza degli artefici', desc: 'Raddoppia la competenza nelle prove di Storia su oggetti magici, alchemici o meccanici.' },
      { nome: 'Inventore', desc: 'Con gli attrezzi da artigiano costruisce piccoli congegni meccanici (giocattoli, accendini, carillon).' },
    ],
    nomi: { m: ['Alston', 'Boddynock', 'Brocc', 'Burgell', 'Dimble', 'Eldon', 'Fonkin', 'Frug', 'Gimble', 'Glim', 'Orryn', 'Wrenn', 'Zook'], f: ['Bimpnottin', 'Breena', 'Caramip', 'Carlin', 'Donella', 'Ella', 'Lilli', 'Lorilla', 'Nissa', 'Orla', 'Roywyn', 'Tana', 'Zanna'] },
  },
  mezzelfo: {
    nome: 'Mezzelfo', velocita: 30, taglia: 'Media', scuro: 60, lingue: ['Comune', 'Elfico'], lingueScelte: 1,
    bonus: { car: 2 }, bonusScelti: 2,
    desc: 'Tra due mondi, carismatici e adattabili: +2 al Carisma e +1 a due caratteristiche a scelta, due abilità in più.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede al buio fino a 18 metri.' },
      { nome: 'Retaggio fatato', desc: 'Vantaggio ai tiri salvezza contro l\'essere affascinato; la magia non lo può addormentare.', effetto: 'fatato' },
      { nome: 'Versatilità nelle abilità', desc: 'Competenza in due abilità a scelta.', abilitaScelte: 2 },
    ],
    nomi: { m: ['Aron', 'Davian', 'Elric', 'Faelan', 'Ioran', 'Kael', 'Lorien', 'Merrik', 'Soren', 'Thalion'], f: ['Arwen', 'Cerys', 'Elara', 'Ilyana', 'Liora', 'Mirelle', 'Nimue', 'Sylvie', 'Tamsin', 'Yara'] },
  },
  mezzorco: {
    nome: 'Mezzorco', velocita: 30, taglia: 'Media', scuro: 60, lingue: ['Comune', 'Orchesco'], lingueScelte: 0,
    bonus: { for: 2, cos: 1 },
    desc: 'Forti, feroci e duri a morire. Quando cadono si rialzano, e i loro colpi critici sono devastanti.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede al buio fino a 18 metri.' },
      { nome: 'Minaccioso', desc: 'Competenza in Intimidire.', abilita: ['intimidire'] },
      { nome: 'Tenacia implacabile', desc: 'Una volta per riposo lungo, quando scende a 0 punti ferita resta invece a 1.', effetto: 'tenacia' },
      { nome: 'Attacchi selvaggi', desc: 'Con un colpo critico in mischia aggiunge un altro dado di danno dell\'arma.', effetto: 'selvaggio' },
    ],
    nomi: { m: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront', 'Shump', 'Thokk'], f: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka', 'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda'] },
  },
  dragonide: {
    nome: 'Dragonide', velocita: 30, taglia: 'Media', scuro: 0, lingue: ['Comune', 'Draconico'], lingueScelte: 0,
    bonus: { for: 2, car: 1 },
    desc: 'Discendenti dei draghi, alti e coperti di scaglie: soffiano un elemento e ne resistono il danno.',
    tratti: [
      { nome: 'Discendenza draconica', desc: 'Il colore del drago antenato decide l\'elemento del soffio e della resistenza.', discendenza: true },
      { nome: 'Soffio', desc: 'Con un\'azione soffia il suo elemento (2d6, poi di più ai livelli 6, 11 e 16): tiro salvezza (CD 8 + COS + competenza) per dimezzare. Una volta per riposo.', effetto: 'soffio' },
      { nome: 'Resistenza', desc: 'Resistenza ai danni del suo elemento.', effetto: 'resElemento' },
    ],
    nomi: { m: ['Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash', 'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Torinn'], f: ['Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Havilar', 'Jheri', 'Kava', 'Korinn', 'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Thava', 'Uadjit'] },
  },
  tiefling: {
    nome: 'Tiefling', velocita: 30, taglia: 'Media', scuro: 60, lingue: ['Comune', 'Infernale'], lingueScelte: 0,
    bonus: { int: 1, car: 2 },
    desc: 'Con un\'eredità infernale nel sangue: corna, coda, occhi senza pupille. Resistono al fuoco e conoscono un po\' di magia oscura.',
    tratti: [
      { nome: 'Scurovisione', desc: 'Vede al buio fino a 18 metri.' },
      { nome: 'Resistenza infernale', desc: 'Resistenza ai danni da fuoco.', effetto: 'resFuoco' },
      { nome: 'Eredità infernale', desc: 'Conosce il trucchetto Taumaturgia; dal 3° livello lancia Intimorire infernale e dal 5° Oscurità, una volta al giorno ciascuno (usa il Carisma).', effetto: 'ereditaInfernale' },
    ],
    nomi: { m: ['Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis', 'Melech', 'Mordai', 'Morthos', 'Pelaios', 'Skamos', 'Therai'], f: ['Akta', 'Anakis', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna', 'Phelaia', 'Rieta'] },
  },
};
const DISCENDENZE = {
  rosso: { nome: 'Drago rosso', danno: 'fuoco', forma: 'cono' }, oro: { nome: 'Drago d\'oro', danno: 'fuoco', forma: 'cono' }, ottone: { nome: 'Drago d\'ottone', danno: 'fuoco', forma: 'linea' },
  blu: { nome: 'Drago blu', danno: 'fulmine', forma: 'linea' }, bronzo: { nome: 'Drago di bronzo', danno: 'fulmine', forma: 'linea' },
  nero: { nome: 'Drago nero', danno: 'acido', forma: 'linea' }, rame: { nome: 'Drago di rame', danno: 'acido', forma: 'linea' },
  bianco: { nome: 'Drago bianco', danno: 'freddo', forma: 'cono' }, argento: { nome: 'Drago d\'argento', danno: 'freddo', forma: 'cono' },
  verde: { nome: 'Drago verde', danno: 'veleno', forma: 'cono' },
};

// ---------- BACKGROUND ----------
const BACKGROUND = {
  accolito: { nome: 'Accolito', abilita: ['intuizione', 'religione'], lingue: 2, oro: 15, equip: ['simbolosacro', 'libropreghiere', 'incenso', 'abiti'], privilegio: 'Rifugio dei fedeli: i templi della tua fede ti danno ospitalità e cure.', desc: 'Hai servito in un tempio, tra riti e preghiere.' },
  criminale: { nome: 'Criminale', abilita: ['inganno', 'furtivita'], attrezzi: ['grimaldelli'], oro: 15, equip: ['piedediporco', 'abitiscuri'], privilegio: 'Contatto criminale: conosci qualcuno nella malavita che porta messaggi e procura informazioni.', desc: 'Furti, contrabbando, ricatti: conosci il lato oscuro delle città.' },
  eroe: { nome: 'Eroe popolare', abilita: ['animali', 'sopravvivenza'], attrezzi: ['artigiano'], oro: 10, equip: ['pala', 'pentola', 'abiti'], privilegio: 'Ospitalità rustica: la gente comune ti nasconde e ti aiuta.', desc: 'Vieni dal popolo e hai già difeso il tuo villaggio da un pericolo.' },
  nobile: { nome: 'Nobile', abilita: ['storia', 'persuasione'], lingue: 1, oro: 25, equip: ['abitipregiati', 'anellosigillo'], privilegio: 'Posizione privilegiata: i nobili ti ricevono, la gente comune ti rispetta.', desc: 'Sei nato in una famiglia potente, con titoli, terre e doveri.' },
  sapiente: { nome: 'Sapiente', abilita: ['arcano', 'storia'], lingue: 2, oro: 10, equip: ['inchiostro', 'pennino', 'lettera', 'abiti'], privilegio: 'Ricercatore: se non sai una cosa, sai dove trovarla o a chi chiederla.', desc: 'Hai passato anni tra biblioteche e manoscritti.' },
  soldato: { nome: 'Soldato', abilita: ['atletica', 'intimidire'], attrezzi: ['dadi'], oro: 10, equip: ['insegna', 'trofeo', 'abiti'], privilegio: 'Grado militare: i soldati riconoscono il tuo grado e ti obbediscono.', desc: 'Hai combattuto in un esercito, in guerre vere.' },
  vagabondo: { nome: 'Monello di strada', abilita: ['rapidita', 'furtivita'], attrezzi: ['grimaldelli', 'travestimento'], oro: 10, equip: ['coltellino', 'mappacitta', 'topolino', 'abiti'], privilegio: 'Segreti della città: conosci passaggi e scorciatoie, ti muovi in città al doppio della velocità.', desc: 'Sei cresciuto per strada, orfano e povero.' },
  eremita: { nome: 'Eremita', abilita: ['medicina', 'religione'], attrezzi: ['erborista'], lingue: 1, oro: 5, equip: ['custodia', 'coperta', 'abiti'], privilegio: 'Scoperta: nella solitudine hai scoperto una verità che può cambiare il mondo.', desc: 'Hai vissuto da solo, lontano da tutti, per anni.' },
  marinaio: { nome: 'Marinaio', abilita: ['atletica', 'percezione'], attrezzi: ['navigazione'], oro: 10, equip: ['caviglia', 'corda', 'portafortuna', 'abiti'], privilegio: 'Passaggio a bordo: trovi sempre un passaggio su una nave per te e i compagni.', desc: 'Hai navigato per anni su navi mercantili o pirata.' },
  artista: { nome: 'Artista', abilita: ['acrobazia', 'intrattenere'], attrezzi: ['strumento', 'travestimento'], oro: 15, equip: ['strumento', 'ricordo', 'costume'], privilegio: 'A grande richiesta: trovi sempre un posto dove esibirti in cambio di vitto e alloggio.', desc: 'Canti, reciti, balli: vivi del pubblico.' },
  ciarlatano: { nome: 'Ciarlatano', abilita: ['inganno', 'rapidita'], attrezzi: ['travestimento', 'falsario'], oro: 15, equip: ['abitipregiati', 'travestimento', 'boccette'], privilegio: 'Falsa identità: hai una seconda identità con documenti e conoscenze.', desc: 'Vivi di truffe e di bugie ben raccontate.' },
  forestiero: { nome: 'Forestiero', abilita: ['atletica', 'sopravvivenza'], attrezzi: ['strumento'], lingue: 1, oro: 10, equip: ['bastone', 'trappola', 'trofeo', 'abiti'], privilegio: 'Viandante: ricordi sempre la strada e trovi cibo per te e altre cinque persone.', desc: 'Sei cresciuto tra boschi e montagne, lontano dalla civiltà.' },
};

// ---------- ARMI ----------
// tipo: semplice/guerra; mischia/distanza; proprieta: leggera, accurata, lancio, portata, pesante, due mani, versatile(dado), munizioni, ricarica
const ARMI = {
  pugnale: { nome: 'Pugnale', cat: 'semplice', mischia: true, danno: '1d4', tipo: 'perforante', prop: ['accurata', 'leggera', 'lancio'], gittata: [20, 60], costo: 2 },
  randello: { nome: 'Randello', cat: 'semplice', mischia: true, danno: '1d4', tipo: 'contundente', prop: ['leggera'], costo: 0.1 },
  ascia: { nome: 'Ascia', cat: 'semplice', mischia: true, danno: '1d6', tipo: 'taglio', prop: ['leggera', 'lancio'], gittata: [20, 60], costo: 5 },
  giavellotto: { nome: 'Giavellotto', cat: 'semplice', mischia: true, danno: '1d6', tipo: 'perforante', prop: ['lancio'], gittata: [30, 120], costo: 0.5 },
  martelloleggero: { nome: 'Martello leggero', cat: 'semplice', mischia: true, danno: '1d4', tipo: 'contundente', prop: ['leggera', 'lancio'], gittata: [20, 60], costo: 2 },
  mazza: { nome: 'Mazza', cat: 'semplice', mischia: true, danno: '1d6', tipo: 'contundente', prop: [], costo: 5 },
  bastone: { nome: 'Bastone ferrato', cat: 'semplice', mischia: true, danno: '1d6', tipo: 'contundente', prop: ['versatile'], versatile: '1d8', costo: 0.2 },
  falcetto: { nome: 'Falcetto', cat: 'semplice', mischia: true, danno: '1d4', tipo: 'taglio', prop: ['leggera'], costo: 1 },
  lancia: { nome: 'Lancia', cat: 'semplice', mischia: true, danno: '1d6', tipo: 'perforante', prop: ['lancio', 'versatile'], versatile: '1d8', gittata: [20, 60], costo: 1 },
  balestraleggera: { nome: 'Balestra leggera', cat: 'semplice', mischia: false, danno: '1d8', tipo: 'perforante', prop: ['munizioni', 'ricarica', 'due mani'], gittata: [80, 320], costo: 25 },
  arcocorto: { nome: 'Arco corto', cat: 'semplice', mischia: false, danno: '1d6', tipo: 'perforante', prop: ['munizioni', 'due mani'], gittata: [80, 320], costo: 25 },
  fionda: { nome: 'Fionda', cat: 'semplice', mischia: false, danno: '1d4', tipo: 'contundente', prop: ['munizioni'], gittata: [30, 120], costo: 0.1 },
  dardo: { nome: 'Dardo', cat: 'semplice', mischia: false, danno: '1d4', tipo: 'perforante', prop: ['accurata', 'lancio'], gittata: [20, 60], costo: 0.05 },
  asciabattaglia: { nome: 'Ascia da battaglia', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'taglio', prop: ['versatile'], versatile: '1d10', costo: 10 },
  mazzafrusto: { nome: 'Mazzafrusto', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'contundente', prop: [], costo: 10 },
  alabarda: { nome: 'Alabarda', cat: 'guerra', mischia: true, danno: '1d10', tipo: 'taglio', prop: ['pesante', 'portata', 'due mani'], costo: 20 },
  ascia2: { nome: 'Ascia bipenne', cat: 'guerra', mischia: true, danno: '1d12', tipo: 'taglio', prop: ['pesante', 'due mani'], costo: 30 },
  spadone: { nome: 'Spadone', cat: 'guerra', mischia: true, danno: '2d6', tipo: 'taglio', prop: ['pesante', 'due mani'], costo: 50 },
  spadalunga: { nome: 'Spada lunga', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'taglio', prop: ['versatile'], versatile: '1d10', costo: 15 },
  maglio: { nome: 'Maglio', cat: 'guerra', mischia: true, danno: '2d6', tipo: 'contundente', prop: ['pesante', 'due mani'], costo: 10 },
  morningstar: { nome: 'Morning star', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'perforante', prop: [], costo: 15 },
  stocco: { nome: 'Stocco', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'perforante', prop: ['accurata'], costo: 25 },
  scimitarra: { nome: 'Scimitarra', cat: 'guerra', mischia: true, danno: '1d6', tipo: 'taglio', prop: ['accurata', 'leggera'], costo: 25 },
  spadacorta: { nome: 'Spada corta', cat: 'guerra', mischia: true, danno: '1d6', tipo: 'perforante', prop: ['accurata', 'leggera'], costo: 10 },
  tridente: { nome: 'Tridente', cat: 'guerra', mischia: true, danno: '1d6', tipo: 'perforante', prop: ['lancio', 'versatile'], versatile: '1d8', gittata: [20, 60], costo: 5 },
  martelloguerra: { nome: 'Martello da guerra', cat: 'guerra', mischia: true, danno: '1d8', tipo: 'contundente', prop: ['versatile'], versatile: '1d10', costo: 15 },
  frusta: { nome: 'Frusta', cat: 'guerra', mischia: true, danno: '1d4', tipo: 'taglio', prop: ['accurata', 'portata'], costo: 2 },
  picca: { nome: 'Picca', cat: 'guerra', mischia: true, danno: '1d10', tipo: 'perforante', prop: ['pesante', 'portata', 'due mani'], costo: 5 },
  balestrapesante: { nome: 'Balestra pesante', cat: 'guerra', mischia: false, danno: '1d10', tipo: 'perforante', prop: ['munizioni', 'pesante', 'ricarica', 'due mani'], gittata: [100, 400], costo: 50 },
  arcolungo: { nome: 'Arco lungo', cat: 'guerra', mischia: false, danno: '1d8', tipo: 'perforante', prop: ['munizioni', 'pesante', 'due mani'], gittata: [150, 600], costo: 50 },
  balestramano: { nome: 'Balestra a mano', cat: 'guerra', mischia: false, danno: '1d6', tipo: 'perforante', prop: ['munizioni', 'leggera', 'ricarica'], gittata: [30, 120], costo: 75 },
  colpo: { nome: 'Colpo senz\'armi', cat: 'semplice', mischia: true, danno: '1', tipo: 'contundente', prop: [], costo: 0, nascosta: true },
};

// ---------- ARMATURE ----------
const ARMATURE = {
  imbottita: { nome: 'Armatura imbottita', cat: 'leggera', ca: 11, des: true, furtivita: true, costo: 5 },
  cuoio: { nome: 'Armatura di cuoio', cat: 'leggera', ca: 11, des: true, costo: 10 },
  cuoiobor: { nome: 'Cuoio borchiato', cat: 'leggera', ca: 12, des: true, costo: 45 },
  pelle: { nome: 'Armatura di pelle', cat: 'media', ca: 12, des: 2, costo: 10 },
  giaco: { nome: 'Giaco di maglia', cat: 'media', ca: 13, des: 2, costo: 50 },
  scaglie: { nome: 'Corazza a scaglie', cat: 'media', ca: 14, des: 2, furtivita: true, costo: 50 },
  corazza: { nome: 'Corazza di piastre', cat: 'media', ca: 14, des: 2, costo: 400 },
  mezza: { nome: 'Mezza armatura', cat: 'media', ca: 15, des: 2, furtivita: true, costo: 750 },
  anelli: { nome: 'Armatura ad anelli', cat: 'pesante', ca: 14, des: false, furtivita: true, costo: 30 },
  maglia: { nome: 'Cotta di maglia', cat: 'pesante', ca: 16, des: false, forza: 13, furtivita: true, costo: 75 },
  stecche: { nome: 'Armatura a stecche', cat: 'pesante', ca: 17, des: false, forza: 15, furtivita: true, costo: 200 },
  piastre: { nome: 'Armatura completa', cat: 'pesante', ca: 18, des: false, forza: 15, furtivita: true, costo: 1500 },
  scudo: { nome: 'Scudo', cat: 'scudo', ca: 2, costo: 10 },
};

// ---------- EQUIPAGGIAMENTO ----------
const OGGETTI = {
  zaino: 'Zaino', sacco: 'Sacco a pelo', razioni: 'Razioni (10 giorni)', otre: 'Otre d\'acqua', corda: 'Corda di canapa (15 m)', torcia: 'Torce (10)',
  acciarino: 'Acciarino', gavetta: 'Gavetta', lanterna: 'Lanterna schermabile', olio: 'Fiaschette d\'olio (2)', piedediporco: 'Piede di porco',
  martello: 'Martello', chiodi: 'Chiodi da roccia (10)', grimaldelli: 'Attrezzi da scasso', erborista: 'Borsa da erborista', simbolosacro: 'Simbolo sacro',
  libropreghiere: 'Libro di preghiere', incenso: 'Bastoncini d\'incenso (5)', abiti: 'Abiti comuni', abitiscuri: 'Abiti scuri con cappuccio',
  abitipregiati: 'Abiti pregiati', anellosigillo: 'Anello con sigillo', inchiostro: 'Boccetta d\'inchiostro', pennino: 'Pennino', lettera: 'Lettera di un collega con una domanda senza risposta',
  insegna: 'Insegna del grado', trofeo: 'Trofeo di un nemico caduto', dadi: 'Dadi d\'osso', coltellino: 'Coltellino', mappacitta: 'Mappa della città natale',
  topolino: 'Topolino addomesticato', custodia: 'Custodia per pergamene con appunti', coperta: 'Coperta invernale', caviglia: 'Caviglia (cavicchio)',
  portafortuna: 'Portafortuna', strumento: 'Strumento musicale', ricordo: 'Ricordo di un ammiratore', costume: 'Costume', travestimento: 'Trucchi per travestimento',
  boccette: 'Boccette di liquido colorato', trappola: 'Trappola da caccia', pala: 'Pala', pentola: 'Pentola di ferro', librodimago: 'Libro degli incantesimi',
  focusarcano: 'Focus arcano (cristallo)', focusdruidico: 'Focus druidico (ramo di vischio)', faretra: 'Faretra con 20 frecce', dardi: 'Custodia con 20 dardi',
  pozione: 'Pozione di guarigione', borsacomponenti: 'Borsa dei componenti', kitguaritore: 'Kit da guaritore', campanella: 'Campanella', gessetto: 'Gessetti (10)',
  specchio: 'Specchietto d\'acciaio', librostudi: 'Libro di studi', candele: 'Candele (5)', pergamena: 'Fogli di pergamena (10)',
};
// pacchetti di equipaggiamento
const PACCHETTI = {
  esploratore: { nome: 'Dotazione da esploratore', oggetti: ['zaino', 'sacco', 'gavetta', 'acciarino', 'torcia', 'razioni', 'otre', 'corda'] },
  dungeon: { nome: 'Dotazione da dungeon', oggetti: ['zaino', 'piedediporco', 'martello', 'chiodi', 'torcia', 'acciarino', 'razioni', 'otre', 'corda'] },
  sacerdote: { nome: 'Dotazione da sacerdote', oggetti: ['zaino', 'coperta', 'candele', 'acciarino', 'incenso', 'razioni', 'otre'] },
  studioso: { nome: 'Dotazione da studioso', oggetti: ['zaino', 'librostudi', 'inchiostro', 'pennino', 'pergamena'] },
  scassinatore: { nome: 'Dotazione da scassinatore', oggetti: ['zaino', 'campanella', 'candele', 'piedediporco', 'martello', 'chiodi', 'lanterna', 'olio', 'razioni', 'acciarino', 'otre', 'corda'] },
  intrattenitore: { nome: 'Dotazione da intrattenitore', oggetti: ['zaino', 'sacco', 'costume', 'candele', 'razioni', 'otre', 'travestimento'] },
};

// le armi, le armature, gli oggetti e i passati delle ambientazioni horror (horror.js): hanno "tema", così la creazione
// fantasy non li propone
{
  const H = require('./horror');
  Object.assign(ARMI, H.ARMI); Object.assign(ARMATURE, H.ARMATURE); Object.assign(BACKGROUND, H.BACKGROUND);
  for (const [id, o] of Object.entries(H.OGGETTI)) if (!OGGETTI[id]) OGGETTI[id] = o.nome;
}

module.exports = { CARATTERISTICHE, ORDINE_CAR, ABILITA, CONDIZIONI, TIPI_DANNO, LINGUE, STIRPI, DISCENDENZE, BACKGROUND, ARMI, ARMATURE, OGGETTI, PACCHETTI };
