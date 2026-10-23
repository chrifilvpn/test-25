// DISPENSE — GPOI (Gestione Progetto e Organizzazione d'Impresa): "Dall'idea all'impresa", nozioni di creatività.
// Gli argomenti seguono le slide del corso; usa gli aiuti di boss-pagina.js (nota, figura, tabella) e qualche schema SVG.
(() => {
  const { nota, figura, tabella, esc } = window.BossAiuti;
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';

  // matrice 2×2 con due assi: celle [titolo, testo, colore di sfondo, colore del bordo] da in alto a sinistra
  function matrice(asseX, asseY, celle, etichetta) {
    const pos = [[70, 20], [330, 20], [70, 150], [330, 150]];
    return `<svg class="st-svg-largo" viewBox="0 0 600 310" role="img" aria-label="${esc(etichetta)}"><g ${FONT} fill="#1f2d3d">
      <line x1="60" y1="285" x2="595" y2="285" stroke="#5b6b7f" stroke-width="2"/><path d="M595 285l-9-5v10z" fill="#5b6b7f"/>
      <line x1="60" y1="285" x2="60" y2="8" stroke="#5b6b7f" stroke-width="2"/><path d="M60 8l-5 9h10z" fill="#5b6b7f"/>
      <text x="590" y="304" text-anchor="end" font-size="13" font-weight="700" fill="#a3302a">${esc(asseX)}</text>
      <text x="50" y="16" text-anchor="end" font-size="13" font-weight="700" fill="#a3302a" transform="rotate(-90 50 16)">${esc(asseY)}</text>
      ${celle.map(([t, d, sf, bo], i) => `<rect x="${pos[i][0]}" y="${pos[i][1]}" width="250" height="118" rx="10" fill="${sf}" stroke="${bo}"/>
        <text x="${pos[i][0] + 125}" y="${pos[i][1] + 34}" text-anchor="middle" font-size="15" font-weight="700" fill="${bo}">${esc(t)}</text>
        ${d.map((r, k) => `<text x="${pos[i][0] + 125}" y="${pos[i][1] + 60 + k * 19}" text-anchor="middle" font-size="12.5">${esc(r)}</text>`).join('')}`).join('')}
    </g></svg>`;
  }

  // fasi in fila collegate da frecce: [titolo, sottotitolo]
  function fasi(passi, etichetta, colore = '#1a5fb4') {
    const w = 132, gap = 22, W = passi.length * w + (passi.length - 1) * gap + 20;
    return `<svg class="st-svg-largo" viewBox="0 0 ${W} 110" role="img" aria-label="${esc(etichetta)}"><g ${FONT}>
      ${passi.map(([t, s], i) => { const x = 10 + i * (w + gap); return `<rect x="${x}" y="18" width="${w}" height="74" rx="10" fill="${i === passi.length - 1 ? colore : '#eef5fe'}" stroke="${colore}"/>
        <text x="${x + w / 2}" y="49" text-anchor="middle" font-size="14.5" font-weight="700" fill="${i === passi.length - 1 ? '#fff' : '#16365f'}">${i + 1}. ${esc(t)}</text>
        <text x="${x + w / 2}" y="71" text-anchor="middle" font-size="11.5" fill="${i === passi.length - 1 ? '#eaf1fb' : '#5b6b7f'}">${esc(s)}</text>
        ${i < passi.length - 1 ? `<path d="M${x + w + 3} 55h${gap - 8}" stroke="#5b6b7f" stroke-width="2"/><path d="M${x + w + gap - 2} 55l-7-4v8z" fill="#5b6b7f"/>` : ''}`; }).join('')}
    </g></svg>`;
  }

  // fase divergente (tante idee che si aprono) e fase convergente (si sceglie la migliore)
  const DIVERGENTE_SVG = `<svg class="st-svg-largo" viewBox="0 0 600 200" role="img" aria-label="Fase divergente e fase convergente"><g ${FONT}>
    <circle cx="40" cy="100" r="16" fill="#1a5fb4"/><text x="40" y="136" text-anchor="middle" font-size="12" fill="#5b6b7f">problema</text>
    ${[-80, -48, -16, 16, 48, 80].map((d) => `<path d="M56 100 Q170 ${100 + d * 0.4} 280 ${100 + d}" stroke="#8fb4e3" stroke-width="2" fill="none"/><circle cx="288" cy="${100 + d}" r="8" fill="#e0a33a"/>`).join('')}
    ${[-80, -48, -16, 16, 48, 80].map((d) => `<path d="M296 ${100 + d} Q420 ${100 + d * 0.4} 530 100" stroke="#b9dcc8" stroke-width="2" fill="none"/>`).join('')}
    <circle cx="548" cy="100" r="18" fill="#3f9b6b"/><text x="548" y="105" text-anchor="middle" font-size="16" fill="#fff">★</text>
    <text x="170" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#1a5fb4">FASE DIVERGENTE</text>
    <text x="170" y="190" text-anchor="middle" font-size="12" fill="#5b6b7f">principio generatore: tante idee, senza giudicare</text>
    <text x="430" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="#3f9b6b">FASE CONVERGENTE</text>
    <text x="430" y="190" text-anchor="middle" font-size="12" fill="#5b6b7f">principio regolatore: si valuta e si sceglie</text>
  </g></svg>`;

  // ruota delle intelligenze multiple di Gardner
  const GARDNER = [['Linguistica', 'le parole giuste'], ['Logico-matematica', 'ipotesi e prove'], ['Spaziale', 'il mondo in 3D'], ['Musicale', 'suoni e ritmo'],
    ['Corporeo-cinestetica', 'mente e corpo'], ['Interpersonale', 'capire gli altri'], ['Intrapersonale', 'capire sé stessi'], ['Naturalistica', 'gli esseri viventi'], ['Esistenziale', 'le grandi domande']];
  const GARDNER_SVG = (() => {
    const cx = 300, cy = 175, R = 128, COL = ['#1a5fb4', '#3f9b6b', '#e0a33a', '#c5483c', '#7a5cc4', '#0f8a8a', '#b5651d', '#5b8c2a', '#5b6b7f'];
    return `<svg class="st-svg-largo" viewBox="0 0 600 350" role="img" aria-label="Le nove intelligenze di Gardner"><g ${FONT}>
      <circle cx="${cx}" cy="${cy}" r="58" fill="#16365f"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">Intelligenze</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="13" fill="#cfe0f5">di Gardner</text>
      ${GARDNER.map(([t, s], i) => { const a = (i / GARDNER.length) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R * 1.55, y = cy + Math.sin(a) * R * 1.05;
        return `<line x1="${cx + Math.cos(a) * 60}" y1="${cy + Math.sin(a) * 60}" x2="${x}" y2="${y}" stroke="${COL[i]}" stroke-width="2"/>
          <rect x="${x - 72}" y="${y - 19}" width="144" height="38" rx="8" fill="#fff" stroke="${COL[i]}" stroke-width="1.6"/>
          <text x="${x}" y="${y - 3}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${COL[i]}">${t}</text>
          <text x="${x}" y="${y + 12}" text-anchor="middle" font-size="10.5" fill="#5b6b7f">${s}</text>`; }).join('')}
    </g></svg>`;
  })();

  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.gpoi = {
    id: 'gpoi', nome: 'GPOI', prof: 'Prof. M. Ferri',
    argomenti: [
      // ============================== TROVARE L'IDEA ==============================
      { id: 'idea', titolo: 'Dall\'idea all\'impresa: come trovare la giusta idea', minuti: 9, giorni: -9, corpo: () => `
        <p class="st-intro">Ogni impresa nasce da un'<b>idea</b>. Sviluppare un'idea imprenditoriale significa porsi quattro domande, che seguiremo in tutto il modulo: <b>come trovare la giusta idea?</b> <b>Come valutare la bontà dell'idea?</b> <b>Come trasformare l'idea in impresa?</b> <b>Come realizzare l'idea?</b></p>
        ${fasi([['Trovare', 'la giusta idea'], ['Valutare', 'la bontà dell\'idea'], ['Trasformare', 'l\'idea in impresa'], ['Realizzare', 'l\'idea']], 'Le quattro domande di chi vuole fare impresa')}
        <h2 id="st-s1">1. Due pregiudizi da smontare</h2>
        <p>Per trovare nuove idee occorre mettere in atto un <b>processo creativo</b>, che spesso però è frenato da alcuni pregiudizi:</p>
        ${tabella(['Pregiudizio', 'Perché è falso'], [
          ['Solo le persone con caratteristiche speciali, i cosiddetti <i>creativi</i>, sanno far nascere idee nuove', 'Ognuno di noi è in grado di produrre idee, e in gran quantità'],
          ['La giusta idea è un\'illuminazione, un momento magico «sceso dal cielo» che solo pochi hanno il privilegio di vivere', 'Tutto nasce dall\'<b>osservazione</b>, dalla <b>curiosità</b> e dai <b>bisogni</b> della gente'],
        ])}
        <h2 id="st-s2">2. Tutto nasce dall'osservazione</h2>
        <p>Per trovare idee bisogna essere curiosi e osservare ciò che ci circonda. Alcuni punti di partenza:</p>
        <ul><li>partire da <b>prodotti o servizi esistenti</b> (e chiedersi come migliorarli);</li><li>pensare se ci sono <b>attività da semplificare</b>;</li><li>pensare a quali <b>bisogni</b> hanno le persone;</li><li>pensare ai <b>problemi della vita quotidiana</b> e cercare di risolverli;</li><li>partire dai propri <b>hobby e interessi</b>;</li><li>chiedere ad <b>amici e familiari</b>.</li></ul>
        <h2 id="st-s3">3. Soddisfare i bisogni della gente</h2>
        ${nota('info', 'Dal film «Robots»', '«Se vedi un bisogno, comincia a pensare e fatti venire delle idee per soddisfarlo. Un\'idea ne farà nascere un\'altra e in men che non si dica avrai la soluzione. Se vedi un bisogno, soddisfalo!»')}
        <p>Prima di partire conviene chiedersi che cosa vogliamo realizzare:</p>
        <ul><li>un <b>prodotto</b> o un <b>servizio</b>?</li><li>qualcosa che <b>non esiste</b> o qualcosa di <b>già esistente</b>?</li><li>un'idea <b>innovativa</b> o il <b>miglioramento</b> di un'idea che qualcun altro ha già avuto?</li><li>qualcosa che soddisfi <b>bisogni esistenti</b> o che crei <b>nuovi bisogni</b>?</li></ul>
        ${nota('avviso', 'Esempio', 'Un gruppo di studenti nota che in mensa si formano lunghe code. Osservando il problema nasce l\'idea di un\'app per prenotare il pasto e ritirarlo a un orario preciso: non è un\'illuminazione, è un bisogno osservato e soddisfatto.')}
        <h2 id="st-s4">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Elenca tre problemi della tua giornata a scuola e, per ognuno, un prodotto o un servizio che potrebbe risolverlo.</li>
          <li>Scegli un oggetto che usi tutti i giorni: come potresti migliorarlo? Per chi sarebbe utile la nuova versione?</li>
          <li>Spiega con parole tue perché la frase «solo i geni hanno idee» è un pregiudizio.</li>
        </ol>` },

      // ============================== LA CREATIVITÀ ==============================
      { id: 'creativita', titolo: 'Che cos\'è la creatività', minuti: 12, giorni: -8, corpo: () => `
        <p class="st-intro">Sulla creatività circolano tanti <b>falsi miti</b>. In realtà non è un dono di pochi: non è facile, ma ognuno di noi, con apposite tecniche, può <b>migliorare il proprio lato creativo</b>.</p>
        <h2 id="st-s1">1. I falsi miti</h2>
        <ul><li>la creatività è libertà assoluta, priva di regole;</li><li>più si è intelligenti e più si è creativi;</li><li>i giovani sono più creativi dei vecchi;</li><li>la creatività non è per gli adulti o per le persone serie;</li><li>i creativi sono pochi eletti che osano assumersi rischi;</li><li>la creatività è un atto solitario.</li></ul>
        ${nota('avviso', 'Tutto falso', 'Nessuna di queste affermazioni è vera: la creatività si allena, ha delle regole, si esercita a ogni età e spesso nasce dal lavoro di gruppo.')}
        <h2 id="st-s2">2. Una definizione</h2>
        <p>La creatività è la capacità di creare qualcosa di <b>originale</b>, <b>rilevante</b>, <b>realizzabile</b> e <b>utile</b>. È anche la capacità dell'individuo di:</p>
        <ul><li><b>rompere gli schemi</b> di pensiero ordinari;</li><li><b>generare una molteplicità di idee</b> e punti di vista innovativi e realizzabili;</li><li>abbandonare percorsi mentali noti per <b>avventurarsi in territori inesplorati</b>;</li><li>percepire, cogliere e pensare oltre.</li></ul>
        <h2 id="st-s3">3. Fase divergente e fase convergente</h2>
        <p>Nel percorso creativo si alternano due fasi:</p>
        ${figura(DIVERGENTE_SVG, 'Prima ci si apre a tante idee (divergenza), poi si restringe il campo fino alla soluzione migliore (convergenza).')}
        <ul><li>la <b>fase divergente</b> (<i>principio generatore</i>): si generano a ruota libera tante idee per affrontare una situazione;</li><li>la <b>fase convergente</b> (<i>principio regolatore</i>): si valutano le idee e si scelgono, in base a determinati criteri, le soluzioni più praticabili.</li></ul>
        <h2 id="st-s4">4. Gli ostacoli</h2>
        <p>Il percorso creativo è disseminato di ostacoli, quasi tutti dentro di noi:</p>
        <ul><li>la convinzione negativa di <b>non essere creativi</b>;</li><li>la difficoltà ad abbandonare modelli di pensiero consolidati;</li><li>l'incostanza: fermarsi ai primi deboli risultati;</li><li>il timore di sbagliare o di passare per stravaganti, la paura di essere criticati o di trovarsi in minoranza;</li><li>l'abitudine di guardare le situazioni da un <b>unico punto di vista</b>;</li><li>il desiderio di conformarsi ai modelli sociali (bisogno di appartenenza);</li><li>la <b>paura del cambiamento</b> («si è sempre fatto così»);</li><li>pensare che immaginare e inventare sia uno spreco di tempo;</li><li>la comodità di riproporre soluzioni già collaudate;</li><li>un'eccessiva fiducia nelle statistiche, nella logica, nell'esperienza passata.</li></ul>
        <h2 id="st-s5">5. Lo scenario attuale</h2>
        <p>Il mondo cambia sempre più in fretta: l'<b>era agricola</b> è durata millenni (circa 10.000 anni), l'<b>era industriale</b> circa due secoli, l'<b>era della conoscenza</b> procede per decenni. Si dice che le dieci professioni oggi più richieste dieci anni fa non esistessero.</p>
        <p>Per il <b>World Economic Forum</b> (Top 10 skills of 2023) il <b>pensiero creativo</b> (<i>creative thinking</i>) è la seconda abilità più importante nel lavoro, subito dopo il pensiero analitico.</p>
        ${tabella(['#', 'Abilità (WEF 2023)', '#', 'Abilità (WEF 2023)'], [
          ['1', 'Pensiero analitico', '6', 'Alfabetizzazione tecnologica'],
          ['<b>2</b>', '<b>Pensiero creativo</b>', '7', 'Affidabilità e attenzione ai dettagli'],
          ['3', 'Resilienza, flessibilità e agilità', '8', 'Empatia e ascolto attivo'],
          ['4', 'Motivazione e consapevolezza di sé', '9', 'Leadership e influenza sociale'],
          ['5', 'Curiosità e apprendimento continuo', '10', 'Controllo di qualità'],
        ])}
        <h2 id="st-s6">6. Riconoscere le idee creative</h2>
        <p>Un'idea creativa è originale, rilevante, realizzabile e utile, cioè <b>ha valore</b>. Incrociando <b>novità</b> e <b>utilità</b> si ottengono quattro tipi di prodotto:</p>
        ${figura(matrice('Utilità', 'Novità', [
          ['MODE', ['il prodotto scompare', 'quando la novità si esaurisce'], '#fff4e0', '#b5651d'],
          ['PRODOTTI CREATIVI', ['originali e rispondenti', 'a un bisogno'], '#e8f5ee', '#3f9b6b'],
          ['RIPETIZIONE DI ERRORI', ['tradizioni o abitudini', 'improduttive'], '#fdeaea', '#c5483c'],
          ['PRODOTTI FUNZIONALI', ['resistono al tempo e', 'continuano a servire allo scopo'], '#eef5fe', '#1a5fb4'],
        ], 'Matrice novità-utilità'), 'In alto a destra (tanta novità, tanta utilità) ci sono i prodotti davvero creativi.')}
        <h2 id="st-s7">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Scegli due dei falsi miti sulla creatività e spiega con un esempio perché sono falsi.</li>
          <li>Colloca nella matrice novità-utilità: il fidget spinner, lo smartphone, la penna a sfera, un'abitudine inutile della tua classe.</li>
          <li>Quale ostacolo alla creatività senti più tuo? Proponi un modo per superarlo.</li>
        </ol>` },

      // ============================== GARDNER ==============================
      { id: 'intelligenze', titolo: 'Le intelligenze multiple di Gardner', minuti: 11, giorni: -7, corpo: () => `
        <p class="st-intro">La <b>teoria delle intelligenze multiple</b> è stata proposta all'inizio degli anni '80 dallo psicologo statunitense <b>Howard Gardner</b>. Secondo Gardner è sbagliato pensare che l'intelligenza si possa misurare in modo oggettivo e ridurre a un solo numero, il <b>QI</b> (quoziente di intelligenza).</p>
        <h2 id="st-s1">1. Nove tipi di intelligenza</h2>
        <p>Ogni persona possiede almeno <b>9 tipi di intelligenza</b>: alcuni hanno livelli alti in quasi tutte, altri ne hanno sviluppate di più solo alcune. Tutti però possono sviluppare le proprie intelligenze, se messi nelle condizioni giuste di <b>incoraggiamento, arricchimento e istruzione</b>, fino a livelli di competenza soddisfacenti.</p>
        ${figura(GARDNER_SVG, 'Le nove intelligenze secondo Howard Gardner.')}
        ${tabella(['Intelligenza', 'Che cosa permette di fare'], [
          ['Linguistica', 'trovare le parole giuste per esprimere quello che si vuole dire'],
          ['Logico-matematica', 'quantificare le cose, formulare ipotesi e dimostrarle'],
          ['Spaziale', 'visualizzare il mondo in tre dimensioni'],
          ['Musicale', 'distinguere i suoni, il loro passo, il tono, il ritmo e il timbro'],
          ['Corporeo-cinestetica', 'coordinare la mente con il corpo'],
          ['Interpersonale', 'percepire i sentimenti e le motivazioni delle altre persone'],
          ['Intrapersonale', 'capire sé stessi, quello che si sente e ciò che si vuole'],
          ['Naturalistica', 'comprendere gli esseri viventi e «leggere» la natura'],
          ['Esistenziale', 'interrogarsi sul perché si vive e si muore'],
        ])}
        <h2 id="st-s2">2. Le cinque «nuove» intelligenze</h2>
        <p>Big data, IoT, robotica e intelligenza artificiale richiedono un nuovo modo di pensare. Gardner ha individuato <b>5 intelligenze</b> da sviluppare per stare al passo con lo scenario attuale:</p>
        ${tabella(['Intelligenza', 'Significato', 'In breve'], [
          ['Disciplinare', 'padroneggiare una disciplina e lavorare con costanza per migliorare e acquisire nuove conoscenze', 'apprendimento continuo'],
          ['Sintetica', 'scegliere tra le innumerevoli informazioni che arrivano da fonti diverse e organizzarle in modo comprensibile', 'capacità di sintesi'],
          ['<b>Creativa</b>', 'proporre nuove idee, fare domande insolite, trovare risposte anomale e cercare nuovi modi di pensare', 'capacità di innovare'],
          ['Rispettosa', 'accogliere le diversità tra le persone e reagire in modo empatico e costruttivo', 'collaborare con gli altri'],
          ['Etica', 'riflettere sul proprio ruolo nel lavoro e nella società e agire per costruire una società migliore', 'coscienza collettiva'],
        ])}
        <h2 id="st-s3">3. La creatività secondo Gardner</h2>
        <p>Per Gardner la creatività nasce dall'incontro tra il <b>tipo di intelligenza prevalente</b> di una persona e le <b>condizioni culturali e sociali</b> che le permettono di esprimersi; si manifesta in una disciplina, in relazione all'intelligenza (o alle intelligenze) dominanti.</p>
        ${nota('info', 'La definizione da ricordare', 'Creativi sono coloro che, avendo raggiunto un alto grado di <b>competenza</b> in un settore, sono in grado di elaborare <b>soluzioni nuove</b>.')}
        <h2 id="st-s4">4. Gli ingredienti delle idee creative</h2>
        <ul><li><b>Expertise</b>: conoscenze, capacità pratiche in una certa disciplina ed esperienze professionali.</li><li><b>Pensiero creativo</b>: pensare «out of the box», giocare con le idee (fluidità mentale), perseveranza e propensione al rischio.</li><li><b>Motivazione</b>: estrinseca (il dovere) e intrinseca (la passione).</li></ul>
        <h2 id="st-s5">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Quali sono, secondo te, le tue due intelligenze più sviluppate? Porta un esempio per ciascuna.</li>
          <li>Abbina ogni «nuova» intelligenza a una situazione di lavoro in un'azienda informatica.</li>
          <li>Perché per Gardner non basta il QI per descrivere una persona?</li>
        </ol>` },

      // ============================== CERVELLO E PROCESSO CREATIVO ==============================
      { id: 'processo', titolo: 'Il cervello creativo: emisferi, momenti e fasi', minuti: 13, giorni: -6, corpo: () => `
        <p class="st-intro">Da dove vengono le idee? In questo capitolo vediamo come «lavora» il cervello, quali momenti della giornata favoriscono la creatività e quali sono le fasi del <b>processo creativo</b>.</p>
        <h2 id="st-s1">1. I due emisferi del cervello</h2>
        <p>Il cervello è formato da due sezioni principali, l'<b>emisfero sinistro</b> e l'<b>emisfero destro</b>, ognuna con punti di forza e di debolezza. Il <b>sinistro</b> eccelle nelle funzioni intellettuali, razionali, verbali e analitiche, è sede dei processi linguistici e procede in modo logico. Il <b>destro</b> presiede la creatività, l'intuizione, la sintesi e le abilità artistiche, ed è specializzato nella percezione globale degli stimoli.</p>
        ${tabella(['Emisfero sinistro (pratico, scientifico)', 'Emisfero destro (magico, artistico)'], [
          ['Razionalità e logica · <b>pensiero convergente</b>', 'Creatività e intuito · <b>pensiero divergente</b>'],
          ['Prevede (prepara il futuro)', 'Immagina (crea il futuro)'],
          ['È reattivo (si adatta al cambiamento)', 'È attivo (causa il cambiamento)'],
          ['È preveggente (anticipa)', 'Progetta (dà origine)'],
          ['Stabilisce le finalità (focalizza i risultati)', 'Immagina (si focalizza sui sogni)'],
          ['Si pone obiettivi (specifica gli esiti)', 'Crea storie (propone situazioni)'],
          ['È sistematico (è strutturato)', 'È inventivo (fantastica)'],
        ])}
        <p>L'educazione, soprattutto nelle culture occidentali, spinge a sviluppare di più l'emisfero sinistro, frenando l'immaginazione del destro. L'emisfero destro coglie la realtà come un'<b>«arborescenza»</b>: intorno a una parola convergono associazioni di altre parole e immagini.</p>
        <h2 id="st-s2">2. I momenti favorevoli</h2>
        <p>Raramente le idee arrivano alla scrivania: è più facile che vengano mentre si chiacchiera, durante un'attività ripetitiva (guidare, fare jogging), sotto la doccia o mentre ci si addormenta.</p>
        <ul><li>Le <b>«allodole»</b> si svegliano presto, sono subito attive e danno il meglio al mattino; la sera rallentano.</li><li>I <b>«gufi»</b> faticano ad attivarsi e rendono di più nella parte finale della giornata.</li><li>Quasi tutti stanno in mezzo: dipende da fattori biologici ma anche sociali (abitudini di studio e di lavoro). Conoscere i propri ritmi di sonno ed energia aiuta a trovare i momenti più creativi.</li></ul>
        ${nota('info', 'Le tre «B» della creatività', '«All great ideas come in the <b>bus</b>, <b>bed</b> and <b>bath</b>» (attribuita a Ludwig Wittgenstein): le idee migliori arrivano in autobus, a letto e in bagno.')}
        <p><b>La «carezza» creativa della sera</b>: dopo una giornata faticosa l'organismo rallenta e la corteccia frontale, sensibile alla dopamina, riduce l'attività. Questo «allentamento» lascia ad altre aree del cervello la libertà di collegarsi e creare connessioni nuove, che di solito il lobo frontale interromperebbe.</p>
        <p><b>Le idee sotto la doccia</b>: si è soli, lontani da telefonate e notifiche, e il rumore regolare dell'acqua aiuta i pensieri a scorrere. Nello stesso momento ci sono rilassamento fisico e mentale, più consapevolezza dei propri pensieri, più dopamina e una maggiore <b>de-focalizzazione</b>, che aiuta a pensare fuori dagli schemi.</p>
        <h2 id="st-s3">3. Le quattro fasi di Graham Wallas</h2>
        <p>Secondo il sociologo <b>Graham Wallas</b> il processo creativo passa per quattro fasi:</p>
        ${figura(fasi([['Preparazione', 'si studia il problema'], ['Incubazione', 'lavora l\'inconscio'], ['Illuminazione', 'arriva l\'idea'], ['Verifica', 'funziona davvero?']], 'Le quattro fasi del processo creativo secondo Wallas', '#3f9b6b'), 'Il processo creativo secondo Graham Wallas.')}
        <ul><li><b>Preparazione</b>: si definisce il problema e si raccolgono i dati; si lavora coscientemente, concentrandosi solo su quello.</li><li><b>Incubazione</b>: elaborazione inconscia; il problema viene accantonato e ci si dedica ad altro, pensandoci ogni tanto.</li><li><b>Illuminazione</b>: l'intuizione, la scoperta della soluzione.</li><li><b>Verifica</b>: l'idea viene messa alla prova per vedere se funziona.</li></ul>
        <h2 id="st-s4">4. I cinque livelli di Taylor</h2>
        <p>Il filosofo <b>Alfred Edward Taylor</b> ha individuato cinque livelli di creatività, dal più semplice al più alto:</p>
        ${tabella(['Livello', 'Che cos\'è', 'Che cosa richiede'], [
          ['1. Espressiva', 'espressione spontanea (per esempio un disegno libero)', 'nessuna abilità o talento particolare'],
          ['2. Tecnica', 'creare nuovi strumenti o usare strumenti noti in situazioni nuove', 'abilità e conoscenze in un campo'],
          ['3. Inventiva', 'produrre qualcosa di unico e originale (idee nuove)', 'grande immaginazione e pensiero creativo'],
          ['4. Innovativa', 'inventare qualcosa che ha un impatto significativo sul mondo (per esempio nuove correnti di pensiero)', 'visione e pensiero fuori dagli schemi'],
          ['5. Emergente', 'creare qualcosa che cambia il modo in cui vediamo il mondo', 'una grande quantità di genio e visione'],
        ])}
        <h2 id="st-s5">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Sei un'allodola o un gufo? In quali momenti della giornata ti vengono le idee migliori?</li>
          <li>Racconta un problema (anche di scuola) che hai risolto passando per le quattro fasi di Wallas.</li>
          <li>Trova un esempio per ognuno dei cinque livelli di creatività di Taylor.</li>
        </ol>` },

      // ============================== VALUTARE L'IDEA ==============================
      { id: 'valutare', titolo: 'Come valutare la bontà dell\'idea: mercato e analisi SWOT', minuti: 12, giorni: -5, corpo: () => `
        <p class="st-intro">Nell'idea d'impresa non conta tanto l'<b>originalità</b> (anche se spesso le iniziative di maggior successo sono le più innovative), quanto la <b>realizzabilità</b>. Un'idea è realizzabile quando l'imprenditore produce in base alle <b>esigenze del consumatore</b>, non quando produce qualunque cosa (anche di qualità) e poi cerca di venderla.</p>
        ${nota('info', 'Thomas Edison', '«Il valore di un\'idea sta nel metterla in pratica.»')}
        <h2 id="st-s1">1. Le domande per valutare un'idea</h2>
        ${tabella(['Area', 'Domande'], [
          ['<b>Il prodotto / servizio</b>', 'Cosa voglio vendere? Quali sono le sue caratteristiche?'],
          ['<b>Il cliente</b>', 'A chi voglio vendere? Qual è il suo mercato di riferimento? Quale sarà il costo?'],
          ['<b>La concorrenza</b>', 'Che valore aggiunto offre la mia idea rispetto ai concorrenti (<i>competitors</i>)? Quali ostacoli e opportunità offre il mercato?'],
          ['<b>Gli «economics»</b>', 'Dove trovo i soldi per iniziare? Come trasformo l\'idea in profitto? Come la promuovo per far crescere le vendite?'],
        ])}
        <h2 id="st-s2">2. Il mercato: il vero padrone è il cliente</h2>
        <p>Deciso il prodotto o il servizio, bisogna chiedersi: <b>chi lo comprerà?</b></p>
        ${nota('avviso', 'La regola d\'oro', 'Non vendere ciò che vuoi produrre, ma <b>produci ciò che puoi vendere</b>.')}
        <p>Un'impresa di successo non è <i>product oriented</i> (concentrata sul prodotto) ma <b><i>market oriented</i></b> (concentrata sul mercato). E un prodotto mai visto prima, quali bisogni soddisfa? Spesso quelli che il consumatore <b>non sapeva di avere</b>.</p>
        <h2 id="st-s3">3. L'analisi di mercato</h2>
        <p>Per individuare il mercato di riferimento e i potenziali clienti si fa uno <b>studio di marketing</b>, cioè un'attività che mira a offrire il <b>prodotto giusto</b>, al <b>prezzo giusto</b>, con la <b>distribuzione giusta</b> e la <b>comunicazione giusta</b>, al <b>cliente giusto</b>.</p>
        <ul><li><b>Conoscere i consumatori</b>: chi sono, da dove vengono, che cosa influenza le loro scelte d'acquisto (età, sesso, luogo, professione, stipendio, istruzione…).</li><li><b>Conoscere i concorrenti</b>: in che cosa sono diversi da noi, punti di forza e di debolezza, strategie di marketing, prezzi, canali di vendita.</li></ul>
        <h2 id="st-s4">4. L'analisi SWOT</h2>
        <p>L'<b>analisi SWOT</b> è una tecnica per individuare i punti di forza (<b>S</b>trengths), di debolezza (<b>W</b>eaknesses), le opportunità (<b>O</b>pportunities) e le minacce (<b>T</b>hreats) di un'impresa o di un progetto. Forze e debolezze sono fattori <b>interni</b>; opportunità e minacce vengono dall'<b>esterno</b>. Aiuta a trovare occasioni di miglioramento per restare al passo con il mercato.</p>
        ${figura(matrice('fattori interni → esterni', 'positivi ↑ negativi ↓', [
          ['S · PUNTI DI FORZA', ['Cosa facciamo bene?', 'Cosa abbiamo di unico?'], '#e8f5ee', '#3f9b6b'],
          ['O · OPPORTUNITÀ', ['Spazi di mercato scoperti,', 'risorse da sfruttare'], '#eef5fe', '#1a5fb4'],
          ['W · PUNTI DI DEBOLEZZA', ['Cosa funziona poco?', 'Cosa va migliorato?'], '#fff4e0', '#b5651d'],
          ['T · MINACCE', ['Concorrenti, nuove tendenze,', 'cambiamenti del settore'], '#fdeaea', '#c5483c'],
        ], 'Matrice dell\'analisi SWOT'), 'La matrice SWOT: a sinistra i fattori interni, a destra quelli esterni.')}
        ${tabella(['Quadrante', 'Domande guida'], [
          ['Punti di forza', 'Cosa facciamo bene? Cosa ha di unico la nostra organizzazione? Cosa apprezza di noi il nostro pubblico?'],
          ['Punti di debolezza', 'Quali iniziative rendono poco e perché? Cosa può essere migliorato? Quali risorse migliorerebbero le prestazioni?'],
          ['Opportunità', 'Quali risorse possiamo usare per migliorare i punti deboli? Ci sono parti del mercato non coperte dai nostri servizi? Quali sono i nostri obiettivi per l\'anno?'],
          ['Minacce', 'Quali cambiamenti nel settore ci preoccupano? Quali nuove tendenze si vedono all\'orizzonte? Dove la concorrenza fa meglio di noi?'],
        ])}
        <h2 id="st-s5">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Fai l'analisi SWOT di un'app per prenotare il pranzo nella mensa della scuola.</li>
          <li>Spiega la differenza tra un'impresa <i>product oriented</i> e una <i>market oriented</i> con due esempi.</li>
          <li>Per la tua idea d'impresa rispondi alle domande delle quattro aree: prodotto, cliente, concorrenza, economics.</li>
        </ol>` },

      // ============================== DALL'IDEA ALL'IMPRESA ==============================
      { id: 'impresa', titolo: 'Trasformare l\'idea in impresa: mission, vision e brand', minuti: 9, giorni: -4, corpo: () => `
        <p class="st-intro">Per trasformare l'idea in impresa bisogna prima di tutto definire con chiarezza l'<b>obiettivo</b> e lo <b>scopo</b> dell'idea, cioè stabilire la <b>mission</b> e la <b>vision</b> aziendale.</p>
        <h2 id="st-s1">1. Mission e vision</h2>
        ${tabella(['', 'Mission', 'Vision'], [
          ['Che cos\'è', 'definisce <b>che cosa fa</b> l\'impresa e <b>perché esiste</b> sul mercato (che cosa la rende unica rispetto ai concorrenti)', 'è la <b>meta finale</b> che proietta l\'azienda nel futuro e ne definisce il ruolo, anche economico e sociale'],
          ['In una frase', '<b>come</b> l\'impresa vuole realizzare il suo obiettivo', '<b>che cosa</b> l\'impresa vuole essere'],
        ])}
        ${nota('info', 'Per ricordarle', 'La <b>vision</b> rappresenta cosa l\'impresa vuole <b>essere</b>; la <b>mission</b> come l\'impresa vuole <b>realizzare</b> tale obiettivo.')}
        <h2 id="st-s2">2. Due esempi</h2>
        ${tabella(['Azienda', 'Vision', 'Mission'], [
          ['IKEA', 'permettere una vita quotidiana migliore alle persone', 'offrire un vasto assortimento di oggetti d\'arredamento funzionali e di buon design a prezzi così vantaggiosi che il maggior numero possibile di persone possa comprarli'],
          ['Disney', 'rendere felici i bambini e immergerli nei loro sogni', 'essere l\'azienda di divertimento più grande di tutti i tempi a livello globale'],
        ])}
        <h2 id="st-s3">3. La brand identity</h2>
        <p>Non basta trovare l'idea vincente: serve anche la <b>giusta immagine</b> per comunicarla alle persone in modo efficace. Gli elementi su cui concentrarsi per un'immagine unica e vincente sono:</p>
        <ul><li>il <b>nome</b>;</li><li>il <b>logo</b>;</li><li>la <b>mission</b>, cioè lo slogan aziendale.</li></ul>
        <h2 id="st-s4">4. Realizzare l'idea</h2>
        <p>Alla fine l'idea va realizzata: questo significa avviare un <b>progetto</b> e gestirlo in tutte le sue fasi con le tecniche del <b>Project Management</b>. Durante questa fase bisogna valutare con attenzione i <b>costi</b>, per stabilire il <b>prezzo di vendita</b> del prodotto, ricordando che lo scopo di un'impresa è il <b>profitto</b> (non vogliamo fallire, giusto?).</p>
        ${nota('avviso', 'Collegamento', 'Le tecniche di Project Management (WBS, diagramma di Gantt, cammino critico, stima dei costi) sono l\'argomento dei prossimi moduli di GPOI.')}
        <h2 id="st-s5">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Scrivi mission e vision per una piccola software house che sviluppa app per le scuole.</li>
          <li>Cerca la mission di un'azienda che conosci e spiega se ti sembra efficace.</li>
          <li>Inventa nome, logo (descritto a parole) e slogan per la tua idea d'impresa.</li>
        </ol>` },

      // ============================== TECNICHE DI CREATIVITÀ ==============================
      { id: 'tecniche', titolo: 'Sviluppare la creatività: brainstorming, pensiero laterale, sei cappelli', minuti: 15, giorni: -2, corpo: () => `
        <p class="st-intro">Certe persone nascono con una maggiore abilità creativa, ma oggi si concorda che la creatività è presente in <b>tutti</b>: il vero problema è saperla sviluppare, creando condizioni favorevoli e seguendo alcune regole. Si può fare in due modi: <b>arricchendo esperienze e conoscenze</b> e <b>applicando tecniche di creatività</b>.</p>
        <h2 id="st-s1">1. Arricchire esperienze e conoscenze</h2>
        <p>La mente ha bisogno di esercizio, ma anche di materiale con cui costruire le idee. Il materiale più fertile è l'esperienza personale:</p>
        <ul><li><b>viaggiare</b>, che alimenta l'immaginazione;</li><li>avere <b>contatti personali</b>, soprattutto con i giovani;</li><li>coltivare <b>hobby</b>, lavori manuali, interesse per l'arte;</li><li><b>leggere</b> libri, meglio se prendendo appunti;</li><li><b>scrivere</b> su qualsiasi argomento.</li></ul>
        <h2 id="st-s2">2. Le tecniche di creatività</h2>
        <p>Soprattutto negli Stati Uniti sono nate tecniche per allenare la creatività (molte università americane tengono corsi di creatività). Si dividono in:</p>
        <ul><li><b>tecniche di gruppo</b>: le idee nascono dal lavoro di un gruppo di persone; la più usata è il <b>brainstorming</b>;</li><li><b>tecniche individuali</b>: migliorano la creatività della singola persona; molto utile è il <b>pensiero laterale</b> (<i>lateral thinking</i>) di Edward De Bono.</li></ul>
        <h2 id="st-s3">3. Il brainstorming</h2>
        <p>Il <b>brainstorming</b> («tempesta di cervelli») è stato ideato dal pubblicitario <b>A. F. Osborn</b> nel <b>1938</b>. È una discussione di gruppo guidata da un <b>moderatore</b>, che ha lo scopo di far esprimere, in modo del tutto libero, il <b>maggior numero possibile di idee</b>. Ha due fasi: nella <b>fase divergente</b> si producono più idee possibile in assoluta libertà; nella <b>fase convergente</b> si valutano e si scelgono le migliori.</p>
        ${tabella(['Caratteristica', 'In pratica'], [
          ['Durata breve', '30-45 minuti al massimo'],
          ['Pochi partecipanti', 'un gruppo piccolo, in cui tutti possono parlare'],
          ['Un moderatore (leader)', 'guida la seduta e fa rispettare le regole'],
          ['Prima regola', 'non giudicare né valutare: tutte le idee sono ben accette'],
          ['Seconda regola', 'privilegiare la <b>quantità</b> delle idee e ascoltare gli altri'],
          ['Terza regola', 'promuovere l\'<b>associazione di idee</b>: partire dalle idee degli altri, collaborare'],
        ])}
        <p><b>I compiti del leader</b>: favorire lo scambio di idee; bloccare subito ogni tentativo di valutazione; far intervenire tutti; assicurarsi che il co-trainer abbia trascritto tutto; rileggere le idee espresse; dare stimoli quando il flusso rallenta; curare inizio, organizzazione e fine della seduta.</p>
        ${nota('info', 'Per un brainstorming di successo', 'Sospendere ogni giudizio · produrre tante idee · annotarle tutte · accogliere anche le più folli (le idee altrui sono sempre un valore aggiunto) · associare e condividere le idee · non interrompere nessuno · non deridere le idee degli altri (attenzione ai più introversi) · non avere paura di sfidare dogmi e preconcetti · non ragionare solo con la logica: l\'istinto è ben accetto.')}
        <h2 id="st-s4">4. De Bono e il pensiero laterale</h2>
        <p><b>Edward De Bono</b> è il padre del <b>pensiero laterale</b>, che si contrappone al <b>pensiero verticale</b> basato sulla logica. Per De Bono il cervello vede solo ciò che è abituato a vedere: la realtà che percepiamo è filtrata dalle nostre esperienze, quindi non è assoluta. Il pensiero laterale è un atteggiamento mentale non convenzionale che permette di trovare idee nuove superando i pregiudizi.</p>
        <ol><li><b>Identificare le idee dominanti</b>, perché non condizionino le successive: vanno distorte e poi distrutte.</li><li><b>Usare nuovi metodi di indagine</b>: guardare il problema senza pregiudizi per trovare soluzioni originali.</li><li><b>Liberarsi dal controllo del pensiero verticale</b>, che non ammette il caos (l'unico ambiente che può generare innovazione).</li><li><b>Sfruttare il caso e l'errore</b>: grandi invenzioni sono nate «per caso» (pneumatici, penicillina, teflon, raggi X, post-it…).</li></ol>
        <h2 id="st-s5">5. I sei cappelli per pensare</h2>
        <p>De Bono propone <b>6 modi di pensare</b> un problema, ognuno rappresentato da un <b>cappello colorato</b> che si può mettere e togliere. Prima si inquadra il problema; poi si indossano a turno i cappelli e ci si chiede come quel punto di vista aiuta a risolverlo.</p>
        ${tabella(['Cappello', 'Approccio', 'Esempio'], [
          ['⚪ Bianco', 'neutrale e imparziale: solo i fatti, senza giudicare', '«Quest\'anno le vendite di mele sono aumentate del 25%, quelle di pere sono scese del 15%.»'],
          ['🔴 Rosso', 'emotivo: dire cosa si prova, senza giustificarlo (istinto)', '«Sento che questo progetto ci darà grandi soddisfazioni.»'],
          ['⚫ Nero', 'pessimista: i punti deboli, ciò che può non funzionare', '«Il magazzino non riuscirà a sostenere questi ritmi; i costi sono troppo alti.»'],
          ['🟡 Giallo', 'ottimista: punti di forza, opportunità, benefici', '«Con un concorso a premi potremmo fidelizzare i clienti.»'],
          ['🟢 Verde', 'creativo e originale: idee nuove senza censura, anche ironiche', '«E se pagassimo i clienti per farli comprare di più?»'],
          ['🔵 Azzurro', 'razionale: pensiero strutturato, calma, controllo della discussione', '«Tiriamo le somme: chi fa cosa, entro quando? Cosa manca da fare?»'],
        ])}
        <h2 id="st-s6">Esercizi</h2>
        <ol class="st-esercizi">
          <li>Organizzate in classe un brainstorming di 30 minuti sul tema «come rendere la scuola più sostenibile»: chi fa il leader? Quante idee avete prodotto?</li>
          <li>Analizza con i sei cappelli la proposta «la scuola adotta il registro elettronico anche per le giustificazioni».</li>
          <li>Cerca la storia di un'invenzione nata per caso e spiega quale principio del pensiero laterale illustra.</li>
        </ol>` },
    ],
  };
})();
