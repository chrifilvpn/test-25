// DISPENSE — Italiano (letteratura dell'Ottocento e del Novecento, classe 5ª): gli argomenti, ognuno con la sua pagina.
// Usa gli aiuti di boss-pagina.js (nota, figura, tabella…) e due schemi SVG propri: la linea del tempo e la mappa concettuale.
(() => {
  const { nota, figura, tabella, esc } = window.BossAiuti;
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
  // spezza un testo in righe di al massimo n caratteri (per i testi dentro gli SVG)
  const avvolgi = (t, n) => {
    const r = []; let l = '';
    for (const p of String(t).split(' ')) { if (l && `${l} ${p}`.length > n) { r.push(l); l = p; } else l = l ? `${l} ${p}` : p; }
    if (l) r.push(l);
    return r;
  };
  // linea del tempo verticale: eventi [anno, testo, evidenziato?]
  function lineaTempo(eventi, etichetta) {
    let y = 22; const righe = [];
    for (const [anno, testo, ev] of eventi) { const ll = avvolgi(testo, 48); righe.push({ anno, ll, y, ev }); y += ll.length * 21 + 16; }
    const H = y + 2;
    return `<svg class="st-alto" viewBox="0 0 540 ${H}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="15" fill="#1f2d3d">
      <line x1="96" y1="12" x2="96" y2="${H - 8}" stroke="#b7c6d6" stroke-width="3"/>
      ${righe.map((r) => `<circle cx="96" cy="${r.y + 5}" r="7" fill="${r.ev ? '#c5483c' : '#1a5fb4'}" stroke="#fff" stroke-width="2"/>
        <text x="80" y="${r.y + 10}" text-anchor="end" font-weight="700" fill="${r.ev ? '#a3302a' : '#16365f'}">${esc(r.anno)}</text>
        ${r.ll.map((l, i) => `<text x="114" y="${r.y + 10 + i * 21}">${esc(l)}</text>`).join('')}`).join('')}
    </g></svg>`;
  }
  // mappa concettuale: un concetto al centro in alto e i rami [titolo, descrizione] su due colonne, collegati da un tronco
  const COLORI = [['#eef5fe', '#1a5fb4'], ['#e8f5ee', '#3f9b6b'], ['#fff4e0', '#e0a33a'], ['#fdeaea', '#c5483c'], ['#f1ecfb', '#7a5cc4'], ['#eef2f7', '#5b6b7f']];
  function mappa(centro, rami, etichetta) {
    const cl = avvolgi(centro, 34), ch = cl.length * 20 + 18;
    let out = `<rect x="110" y="8" width="320" height="${ch}" rx="12" fill="#16365f"/>${cl.map((l, i) => `<text x="270" y="${31 + i * 20}" text-anchor="middle" fill="#fff" font-weight="700" font-size="16">${esc(l)}</text>`).join('')}`;
    let y = ch + 36; const yTronco = ch + 8; let yUltimo = y;
    for (let i = 0; i < rami.length; i += 2) {
      const blocchi = rami.slice(i, i + 2).map(([t, d]) => ({ t: avvolgi(t, 26), d: avvolgi(d, 31) }));
      const h = Math.max(...blocchi.map((b) => b.t.length * 19 + b.d.length * 18 + 22));
      blocchi.forEach((b, j) => {
        const x = j === 0 ? 6 : 289, [f, s] = COLORI[(i + j) % COLORI.length];
        out += `<line x1="270" y1="${y + 22}" x2="${j === 0 ? 251 : 289}" y2="${y + 22}" stroke="#7c8a99" stroke-width="2"/>
          <rect x="${x}" y="${y}" width="245" height="${h}" rx="9" fill="${f}" stroke="${s}" stroke-width="1.5"/>
          ${b.t.map((l, k) => `<text x="${x + 12}" y="${y + 22 + k * 19}" font-weight="700" fill="${s === '#5b6b7f' ? '#1f2d3d' : s}">${esc(l)}</text>`).join('')}
          ${b.d.map((l, k) => `<text x="${x + 12}" y="${y + 24 + b.t.length * 19 + k * 18}" font-size="13.5">${esc(l)}</text>`).join('')}`;
      });
      yUltimo = y + 22; y += h + 16;
    }
    return `<svg class="st-alto" viewBox="0 0 540 ${y}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="14.5" fill="#1f2d3d">
      <line x1="270" y1="${yTronco}" x2="270" y2="${yUltimo}" stroke="#7c8a99" stroke-width="2"/>${out}</g></svg>`;
  }
  // citazione (testo in versi: righe separate da \n)
  const cit = (testo, fonte) => `<blockquote class="st-cit">${testo.trim().split('\n').map((r) => r.trim()).join('<br>')}<cite>${fonte}</cite></blockquote>`;

  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.italiano = {
    id: 'italiano', nome: 'Italiano',
    argomenti: [
      // ============================== LEOPARDI ==============================
      { id: 'leopardi', titolo: 'Giacomo Leopardi', minuti: 18, giorni: -34, corpo: () => `
        <p class="st-intro"><b>Giacomo Leopardi</b> (1798-1837) è il poeta che apre il nostro programma e, per molti aspetti, il primo dei moderni: con lucidità quasi filosofica si interroga sull'infelicità umana, sul rapporto tra l'uomo e la natura e sul senso della poesia in un'epoca che crede nel progresso. In questa dispensa vediamo il contesto, la vita, il pensiero (le fasi del pessimismo), la poetica del «vago e indefinito» e il commento de <i>L'infinito</i>.</p>
        <h2 id="st-s1">1. Il contesto storico-culturale</h2>
        <p>Leopardi vive negli anni della <b>Restaurazione</b> (dopo il Congresso di Vienna, 1815) e dei primi moti risorgimentali. Nasce a Recanati, nello <b>Stato Pontificio</b>, uno degli stati più chiusi e arretrati della penisola. In Europa si afferma il <b>Romanticismo</b>; in Italia, nel 1816, si apre la polemica tra classicisti e romantici dopo l'articolo di Madame de Staël <i>Sulla maniera e l'utilità delle traduzioni</i>.</p>
        <p>Leopardi partecipa alla polemica dalla parte dei classicisti (<i>Discorso di un italiano intorno alla poesia romantica</i>, 1818), ma la sua posizione è originale: difende la poesia degli antichi perché era <b>immaginosa e spontanea</b>, vicina alla natura, mentre i moderni sono dominati dalla ragione, che ha distrutto le illusioni. Non è quindi un classicista di scuola: per temi (l'io, il dolore, l'infinito) è vicinissimo alla sensibilità romantica europea.</p>
        ${nota('info', 'In sintesi', 'Leopardi è <b>classicista</b> per la lingua e i modelli, <b>romantico</b> per i temi e <b>illuminista</b> per il metodo: il suo pensiero è materialista e rifiuta ogni consolazione religiosa o provvidenziale.')}
        <h2 id="st-s2">2. La vita</h2>
        <p>Primogenito del conte Monaldo e di Adelaide Antici, cresce in una famiglia nobile ma in difficoltà economiche, con una madre severa e religiosissima. Tra i dieci e i diciassette anni si chiude nella grande <b>biblioteca paterna</b>: sono i «sette anni di studio matto e disperatissimo» che gli danno una cultura immensa (latino, greco, ebraico, filologia) ma gli rovinano la salute. Il desiderio di uscire da Recanati, il «natio borgo selvaggio», segna tutta la giovinezza: nel 1819 tenta una fuga, scoperta dal padre.</p>
        <p>Solo nel 1822 riesce a partire per Roma, che lo delude. Seguono soggiorni a Milano, Bologna, Firenze e Pisa, dove lavora per l'editore Stella e frequenta gli intellettuali del Gabinetto Vieusseux, dai quali si sente lontano per il loro ottimismo cattolico-liberale. Nel 1828 torna a Recanati («sedici mesi di notte orribile»), poi riparte nel 1830 per Firenze, dove si innamora senza essere ricambiato di Fanny Targioni Tozzetti. Dal 1833 vive a <b>Napoli</b> con l'amico Antonio Ranieri; muore nel 1837, durante un'epidemia di colera.</p>
        ${figura(lineaTempo([
          ['1798', 'Nasce a Recanati (29 giugno), nello Stato Pontificio'],
          ['1809-16', 'Sette anni di «studio matto e disperatissimo» nella biblioteca paterna'],
          ['1817', 'Inizia lo Zibaldone e l\'amicizia epistolare con Pietro Giordani'],
          ['1819', 'Tentata fuga da Recanati; compone L\'infinito', true],
          ['1822-23', 'Primo soggiorno a Roma: una delusione'],
          ['1824', 'Scrive gran parte delle Operette morali (pubblicate nel 1827)'],
          ['1828', 'A Pisa scrive A Silvia: inizia la stagione dei canti pisano-recanatesi', true],
          ['1831', 'Prima edizione dei Canti (Firenze)'],
          ['1833', 'Si trasferisce a Napoli con Antonio Ranieri'],
          ['1836', 'Compone La ginestra a Torre del Greco'],
          ['1837', 'Muore a Napoli il 14 giugno', true],
        ], 'Linea del tempo della vita di Leopardi'), 'Figura 1 – La vita di Leopardi in undici date (in rosso le più importanti).')}
        <h2 id="st-s3">3. Il pensiero: dalla teoria del piacere al pessimismo cosmico</h2>
        <p>Il centro del pensiero leopardiano è la <b>teoria del piacere</b>, elaborata nello <i>Zibaldone</i> (1820): l'uomo desidera un piacere <b>infinito</b> per durata ed estensione, ma la realtà gli offre solo piaceri finiti. Per questo nessun piacere lo soddisfa e l'uomo è strutturalmente infelice. L'unico rimedio sono l'<b>immaginazione</b> e le <b>illusioni</b> (gloria, amore, patria), che fanno intravedere l'infinito.</p>
        ${tabella(['Fase', 'Periodo', 'Idea centrale', 'Chi è il «colpevole»'], [
          ['<b>Pessimismo storico</b>', 'fino al 1823 circa', 'Gli antichi erano più felici perché vivevano di illusioni; la civiltà e la ragione le hanno distrutte.', 'La storia e la ragione; la natura è ancora una madre benigna.'],
          ['<b>Pessimismo cosmico</b>', 'dal 1824 (Operette morali)', 'L\'infelicità è una condizione di tutti gli esseri viventi, in ogni tempo e luogo.', 'La <b>natura</b>, «matrigna», indifferente al destino degli uomini.'],
          ['<b>Pessimismo «eroico»</b>', 'ultimi anni (La ginestra)', 'Riconoscere la verità senza illusioni e unirsi in una «social catena» contro la natura.', 'La natura resta nemica; gli uomini devono essere solidali.'],
        ])}
        <p>Il passaggio decisivo è il <i>Dialogo della Natura e di un Islandese</i> (nelle <i>Operette morali</i>): un islandese, che ha fuggito per tutta la vita il dolore, incontra la Natura in Africa e le chiede conto delle sofferenze degli uomini. La Natura risponde che il mondo non è fatto per loro e che il ciclo di produzione e distruzione della materia va avanti indifferente alla loro felicità. Il dialogo si chiude in modo ironico e crudele: l'islandese viene divorato da due leoni (o sepolto da un turbine di sabbia).</p>
        <h2 id="st-s4">4. Le opere</h2>
        ${tabella(['Opera', 'Genere', 'Anni', 'Contenuto essenziale'], [
          ['<b>Zibaldone di pensieri</b>', 'diario intellettuale', '1817-1832', 'Oltre 4500 pagine di riflessioni su filosofia, lingua, poesia; pubblicato solo nel 1898-1900.'],
          ['<b>Canti</b>', 'poesia lirica', '1831, 1835, 1845 (postuma)', '41 componimenti: canzoni civili, idilli, canti pisano-recanatesi, ciclo di Aspasia, La ginestra.'],
          ['<b>Operette morali</b>', 'prose filosofiche', '1824 (ed. 1827)', '24 dialoghi e novelle satiriche: Dialogo della Natura e di un Islandese, Dialogo di un venditore d\'almanacchi e di un passeggere.'],
          ['<b>Pensieri</b>', 'aforismi', 'postumi (1845)', '111 riflessioni amare sulla società e sugli uomini.'],
        ])}
        <p>Nei <b>Canti</b> si distinguono diversi momenti: le <b>canzoni civili</b> (<i>All'Italia</i>, 1818); i <b>piccoli idilli</b> (1819-21: <i>L'infinito</i>, <i>La sera del dì di festa</i>, <i>Alla luna</i>), «situazioni, affezioni, avventure storiche» dell'animo; i <b>grandi idilli</b> o canti pisano-recanatesi (1828-30: <i>A Silvia</i>, <i>Le ricordanze</i>, <i>La quiete dopo la tempesta</i>, <i>Il sabato del villaggio</i>, <i>Canto notturno di un pastore errante dell'Asia</i>); il <b>ciclo di Aspasia</b> (<i>A se stesso</i>); infine <i>La ginestra o il fiore del deserto</i> (1836), il suo testamento poetico.</p>
        <h2 id="st-s5">5. La poetica del vago e dell'indefinito</h2>
        <p>Se il piacere infinito non esiste nella realtà, la poesia può almeno <b>suggerirlo</b>. Nello <i>Zibaldone</i> Leopardi spiega che sono «poetiche» le immagini e le parole che lasciano spazio all'immaginazione: ciò che è <b>lontano</b>, <b>vago</b>, <b>indefinito</b>, ciò che si sente ma non si vede (un canto che si allontana, una siepe che nasconde l'orizzonte) e soprattutto il <b>ricordo</b>, che rende piacevoli anche cose che nel presente erano indifferenti.</p>
        ${figura(mappa('Poetica del vago e indefinito', [
          ['Teoria del piacere', 'Desideriamo un piacere infinito che la realtà non dà.'],
          ['Immaginazione', 'Supplisce alla realtà e fa «fingere» l\'infinito.'],
          ['Immagini indefinite', 'Siepi, orizzonti, luci notturne, suoni lontani.'],
          ['Parole poetiche', 'Termini vaghi: lontano, antico, notte, eterno.'],
          ['Rimembranza', 'Il ricordo rende dolce ciò che era comune.'],
          ['Antichi e fanciulli', 'Hanno ancora la forza di immaginare.'],
        ], 'Mappa della poetica leopardiana'), 'Figura 2 – Mappa concettuale della poetica del vago e dell\'indefinito.')}
        <h2 id="st-s6">6. Testo commentato: <i>L'infinito</i> (1819)</h2>
        ${cit(`Sempre caro mi fu quest'ermo colle,
          e questa siepe, che da tanta parte
          dell'ultimo orizzonte il guardo esclude.
          Ma sedendo e mirando, interminati
          spazi di là da quella, e sovrumani
          silenzi, e profondissima quiete
          io nel pensier mi fingo; ove per poco
          il cor non si spaura. E come il vento
          odo stormir tra queste piante, io quello
          infinito silenzio a questa voce
          vo comparando: e mi sovvien l'eterno,
          e le morte stagioni, e la presente
          e viva, e il suon di lei. Così tra questa
          immensità s'annega il pensier mio:
          e il naufragar m'è dolce in questo mare.`, 'G. Leopardi, <i>L\'infinito</i>, dai <i>Canti</i>')}
        <p><b>Metrica.</b> Quindici <b>endecasillabi sciolti</b> (senza rima). Gli <b>enjambement</b> sono numerosissimi (<i>interminati / spazi</i>, <i>sovrumani / silenzi</i>): il verso «trabocca» nel successivo e il ritmo stesso imita lo sconfinare del pensiero.</p>
        <p><b>Struttura.</b> Il testo ha due movimenti. Nel primo (vv. 1-8) la <b>siepe</b> impedisce la vista: proprio questo ostacolo spinge l'immaginazione a creare («mi fingo», cioè «mi rappresento») spazi infiniti e silenzi sovrumani, tanto che il cuore quasi si spaventa. Nel secondo (vv. 8-15) è un <b>suono</b>, il vento tra le piante, a riportare il poeta al presente e a fargli confrontare quella voce con il silenzio infinito: nasce l'idea dell'<b>eterno</b> e del tempo («le morte stagioni», cioè le epoche passate, e «la presente / e viva»).</p>
        <p><b>Gli aggettivi dimostrativi.</b> Leopardi usa <i>questo</i> per ciò che è vicino e reale (<i>quest'ermo colle</i>, <i>questa siepe</i>, <i>queste piante</i>) e <i>quello</i> per ciò che è immaginato (<i>quella</i>, <i>quello infinito silenzio</i>). Alla fine però l'infinito diventa «<i>questa</i> immensità» e «<i>questo</i> mare»: il pensiero si è ormai immerso completamente nell'infinito che ha creato.</p>
        <p><b>Il finale.</b> La metafora del <b>naufragio dolce</b> è un ossimoro: perdersi nell'infinito è un abbandono piacevole, non una sconfitta. È la prova pratica della teoria del piacere: l'infinito non si possiede, ma si può <b>immaginare</b>.</p>
        ${nota('avviso', 'Errore frequente', 'L\'infinito di Leopardi non è un infinito religioso o mistico: è un prodotto dell\'<b>immaginazione</b> umana, nato da una sensazione concreta (la siepe, il vento). Nell\'analisi del testo va detto chiaramente.')}
        <p><b>Un secondo testo da confrontare.</b> In <i>A Silvia</i> (1828) il ricordo di una ragazza morta giovane, Teresa Fattorini, diventa il simbolo delle speranze giovanili tradite:</p>
        ${cit(`Silvia, rimembri ancora
          quel tempo della tua vita mortale,
          quando beltà splendea
          negli occhi tuoi ridenti e fuggitivi,
          e tu, lieta e pensosa, il limitare
          di gioventù salivi?`, 'G. Leopardi, <i>A Silvia</i>, vv. 1-6')}
        <p>Si noti la metrica nuova della <b>canzone libera</b> (endecasillabi e settenari alternati liberamente, rime sparse) e l'ossimoro «lieta e pensosa». La morte di Silvia corrisponde alla caduta delle speranze del poeta: la natura promette e non mantiene.</p>
        <h2 id="st-s7">7. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: la Restaurazione e lo Stato Pontificio; l'ottimismo del progresso ottocentesco che Leopardi critica nella <i>Ginestra</i> («le magnifiche sorti e progressive»).</li>
          <li><b>Filosofia</b>: il materialismo illuminista; Schopenhauer, che come Leopardi vede nel desiderio la radice del dolore.</li>
          <li><b>Inglese</b>: i romantici inglesi (Wordsworth, Keats) e il tema della natura; il «sublime».</li>
          <li><b>Educazione civica</b>: la «social catena» della <i>Ginestra</i> come idea di solidarietà tra gli uomini davanti alle catastrofi naturali.</li>
        </ul>
        <h2 id="st-s8">8. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega con parole tue la teoria del piacere e collegala alla poetica del vago e dell'indefinito (10-12 righe).</li>
          <li>Individua in <i>L'infinito</i> tutti gli enjambement e spiega la loro funzione.</li>
          <li>Confronta la Natura del <i>Dialogo della Natura e di un Islandese</i> con quella dei primi idilli: che cosa è cambiato?</li>
          <li>Analizza l'uso di «questo» e «quello» in <i>L'infinito</i> e spiega perché alla fine prevale «questo».</li>
          <li>Prepara una scaletta per il colloquio: «Leopardi e il progresso» (con riferimento alla <i>Ginestra</i>).</li>
        </ol>` },

      // ============================== VERGA ==============================
      { id: 'verga', titolo: 'Naturalismo, Verismo e Giovanni Verga', minuti: 18, giorni: -30, corpo: () => `
        <p class="st-intro">Nella seconda metà dell'Ottocento la letteratura vuole rappresentare la realtà con il metodo delle scienze. In Francia nasce il <b>Naturalismo</b>, in Italia il <b>Verismo</b>, il cui autore maggiore è <b>Giovanni Verga</b> (1840-1922). Studiamo le differenze tra i due movimenti, le tecniche narrative di Verga (impersonalità, regressione, discorso indiretto libero) e il commento dell'inizio di <i>Rosso Malpelo</i>.</p>
        <h2 id="st-s1">1. Il contesto: Positivismo e Naturalismo francese</h2>
        <p>Dopo il 1850 l'Europa vive la <b>seconda rivoluzione industriale</b> e la fiducia nella scienza diventa una filosofia: il <b>Positivismo</b> (Auguste Comte). Il filosofo Hippolyte <b>Taine</b> sostiene che ogni comportamento umano è determinato da tre fattori: <b>razza</b> (ereditarietà), <b>ambiente</b> e <b>momento storico</b>. Darwin (<i>L'origine delle specie</i>, 1859) diffonde l'idea della lotta per l'esistenza.</p>
        <p>Il <b>Naturalismo</b> applica questo metodo al romanzo. I fratelli <b>Goncourt</b> nella prefazione a <i>Germinie Lacerteux</i> (1865) rivendicano il diritto del popolo a entrare nel romanzo; <b>Émile Zola</b> teorizza il «romanzo sperimentale» (1880): lo scrittore osserva come uno scienziato e «sperimenta» come reagiscono i personaggi in un certo ambiente. Il suo ciclo dei <i>Rougon-Macquart</i> (venti romanzi, tra cui <i>L'Assommoir</i>, 1877, e <i>Germinale</i>, 1885) studia una famiglia segnata dall'alcolismo nel Secondo Impero.</p>
        <h2 id="st-s2">2. Il Verismo italiano: somiglianze e differenze</h2>
        <p>In Italia le idee del Naturalismo arrivano grazie a <b>Luigi Capuana</b>, teorico del Verismo, e a Verga. Ma la realtà italiana è diversa: non c'è ancora un grande proletariato urbano, e gli scrittori raccontano soprattutto il mondo <b>contadino e regionale</b>, in particolare il Sud dopo l'Unità.</p>
        ${tabella(['', 'Naturalismo francese', 'Verismo italiano'], [
          ['Ambiente', 'Città industriali, Parigi, proletariato urbano', 'Campagne e paesi del Sud (Sicilia), pescatori, contadini, minatori'],
          ['Ruolo dell\'autore', 'Narratore esterno, ma lo scrittore spesso giudica e spiega', '<b>Impersonalità</b>: l\'autore si «eclissa», la storia sembra raccontarsi da sé'],
          ['Fiducia nel progresso', 'Sì: la letteratura denuncia per migliorare la società', 'No: Verga è pessimista, i deboli sono destinati a soccombere'],
          ['Ideologia', 'Democratica, progressista (Zola nell\'affare Dreyfus)', 'Conservatrice: nessuna fiducia nel cambiamento politico'],
          ['Lingua', 'Francese standard con inserti di gergo', 'Italiano modellato sul parlato siciliano (proverbi, sintassi popolare)'],
        ])}
        <h2 id="st-s3">3. La vita di Verga</h2>
        <p>Nasce a <b>Catania</b> nel 1840 da una famiglia di proprietari terrieri. Giovane, scrive romanzi patriottici e poi, trasferitosi a <b>Firenze</b> (1869) e soprattutto a <b>Milano</b> (1872), romanzi mondani e passionali (<i>Eva</i>, <i>Tigre reale</i>). Nel 1874 pubblica <i>Nedda</i>, «bozzetto siciliano»; la vera svolta arriva nel 1878 con <i>Rosso Malpelo</i>. Dopo l'insuccesso dei <i>Malavoglia</i> e la fatica del <i>Mastro-don Gesualdo</i>, il progetto del ciclo dei Vinti si interrompe. Torna a Catania nel 1893, scrive sempre meno, diventa senatore nel 1920 e muore nel 1922.</p>
        ${figura(lineaTempo([
          ['1840', 'Nasce a Catania'],
          ['1872', 'Si trasferisce a Milano, centro della cultura e dell\'editoria'],
          ['1878', 'Rosso Malpelo: la svolta verista', true],
          ['1880', 'Raccolta Vita dei campi (Rosso Malpelo, La lupa, Fantasticheria)'],
          ['1881', 'I Malavoglia, primo romanzo del ciclo dei Vinti', true],
          ['1883', 'Novelle rusticane (La roba, Libertà)'],
          ['1889', 'Mastro-don Gesualdo', true],
          ['1893', 'Torna a vivere a Catania'],
          ['1922', 'Muore a Catania'],
        ], 'Linea del tempo di Verga'), 'Figura 1 – Le tappe della vita e delle opere di Verga.')}
        <h2 id="st-s4">4. Le tecniche: impersonalità, regressione, straniamento</h2>
        <p>Nella lettera a Salvatore Farina (prefazione a <i>L'amante di Gramigna</i>, 1880) Verga spiega che il romanzo perfetto dovrà sembrare scritto da nessuno: l'opera «sembrerà essersi fatta da sé». Per ottenere questo effetto usa alcune tecniche precise.</p>
        ${figura(mappa('Le tecniche di Verga', [
          ['Impersonalità', 'L\'autore non commenta né giudica: si «eclissa».'],
          ['Regressione', 'Il narratore si abbassa al livello dei personaggi e ne usa il punto di vista.'],
          ['Narratore popolare', 'Una voce anonima del paese, con i suoi pregiudizi.'],
          ['Discorso indiretto libero', 'I pensieri dei personaggi entrano nel racconto senza «disse che».'],
          ['Straniamento', 'Ciò che è normale appare strano e viceversa (es. la bontà di Malpelo).'],
          ['Lingua parlata', 'Proverbi, soprannomi, sintassi siciliana resa in italiano.'],
        ], 'Mappa delle tecniche narrative di Verga'), 'Figura 2 – Mappa delle tecniche narrative veriste.')}
        <h2 id="st-s5">5. L'ideologia: l'«ideale dell'ostrica» e il ciclo dei Vinti</h2>
        <p>Nella novella <i>Fantasticheria</i> Verga formula l'<b>ideale dell'ostrica</b>: come l'ostrica sopravvive finché resta attaccata al suo scoglio, così i poveri si salvano finché restano legati alla famiglia, al lavoro e ai valori tradizionali. Chi cerca di migliorare la propria condizione viene travolto. Nella prefazione ai <i>Malavoglia</i> Verga parla della «<b>fiumana del progresso</b>»: il progresso, visto da lontano, sembra grandioso, ma lascia sulla riva i <b>vinti</b>.</p>
        <p>Il ciclo dei Vinti doveva comprendere cinque romanzi, dal livello sociale più basso al più alto, ciascuno dedicato a una forma di «bramosia»: <i>I Malavoglia</i> (bisogno materiale), <i>Mastro-don Gesualdo</i> (ambizione di ricchezza), <i>La duchessa de Leyra</i> (vanità aristocratica, solo abbozzato), <i>L'onorevole Scipioni</i> (ambizione politica) e <i>L'uomo di lusso</i>, mai scritti.</p>
        ${tabella(['Romanzo', 'Trama in breve', 'Temi'], [
          ['<b>I Malavoglia</b> (1881)', 'Ad Aci Trezza la famiglia Toscano, detta Malavoglia, guidata da padron \'Ntoni, compra a credito un carico di lupini; la barca <i>Provvidenza</i> naufraga, muore Bastianazzo e iniziano debiti e disgrazie. Il giovane \'Ntoni rifiuta la vita del paese, finisce in carcere e alla fine se ne va per sempre; Alessi ricompra la casa del nespolo.', 'Famiglia, «religione della roba e del lavoro», progresso che distrugge, coralità del paese'],
          ['<b>Mastro-don Gesualdo</b> (1889)', 'Gesualdo Motta, muratore arricchito, sposa la nobile Bianca Trao per salire socialmente. Accumula ricchezze ma resta escluso da tutti: muore solo nel palazzo palermitano della figlia Isabella, tra servi che lo disprezzano.', 'La roba come ossessione, solitudine, impossibilità di cambiare classe'],
        ])}
        <h2 id="st-s6">6. Testo commentato: l'inizio di <i>Rosso Malpelo</i> (1878)</h2>
        ${cit('Malpelo si chiamava così perché aveva i capelli rossi; ed aveva i capelli rossi perché era un ragazzo malizioso e cattivo, che prometteva di riescire un fior di birbone.', 'G. Verga, <i>Rosso Malpelo</i>, da <i>Vita dei campi</i>')}
        <p><b>Chi parla?</b> Non l'autore, ma una voce collettiva: la gente della cava di rena rossa dove lavora il ragazzo. È la <b>regressione</b>: il narratore adotta la mentalità superstiziosa del popolo, per cui i capelli rossi sono segno di cattiveria.</p>
        <p><b>Il ragionamento capovolto.</b> La frase contiene un nesso causale assurdo: non «aveva i capelli rossi, e per questo lo chiamavano Malpelo», ma «aveva i capelli rossi <i>perché</i> era cattivo». L'effetto è lo <b>straniamento</b>: il lettore capisce da solo che il pregiudizio è ingiusto, senza che l'autore lo dica. Malpelo è in realtà un ragazzo maltrattato, che dopo la morte del padre (mastro Misciu, sepolto da una frana) si affeziona a Ranocchio, un compagno debole, e finisce per scomparire nelle gallerie della cava.</p>
        <p><b>Lingua.</b> Espressioni popolari come «fior di birbone» e «riescire» (forma toscana del tempo) riproducono il parlato. Non c'è descrizione del personaggio dall'esterno: lo conosciamo attraverso ciò che ne pensa la comunità.</p>
        ${nota('info', 'Un altro inizio famoso', 'I <i>Malavoglia</i> si aprono così: «Un tempo i Malavoglia erano stati numerosi come i sassi della strada vecchia di Trezza». Il paragone con i sassi della strada è tipico del narratore popolare: il lettore viene «gettato» dentro il paese senza presentazioni.')}
        <h2 id="st-s7">7. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: la questione meridionale dopo l'Unità, l'inchiesta Franchetti-Sonnino sulla Sicilia (1876) e il lavoro minorile nelle zolfare e nelle cave; l'emigrazione.</li>
          <li><b>Inglese</b>: Charles Dickens e il romanzo sociale (<i>Hard Times</i>, il lavoro minorile in <i>Oliver Twist</i>).</li>
          <li><b>Educazione civica</b>: i diritti dell'infanzia; la Convenzione ONU sui diritti del fanciullo (1989).</li>
        </ul>
        <h2 id="st-s8">8. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega la differenza tra il narratore di Zola e quello di Verga, con un esempio.</li>
          <li>Riscrivi la prima frase di <i>Rosso Malpelo</i> come la scriverebbe un narratore onnisciente che difende il ragazzo; poi spiega che cosa cambia.</li>
          <li>Che cos'è l'«ideale dell'ostrica»? In quale personaggio dei <i>Malavoglia</i> si vede che chi lo tradisce viene punito?</li>
          <li>Costruisci una tabella con i cinque romanzi previsti del ciclo dei Vinti, indicando quali sono stati scritti.</li>
        </ol>` },

      // ============================== DECADENTISMO E PASCOLI ==============================
      { id: 'pascoli', titolo: 'Il Decadentismo e Giovanni Pascoli', minuti: 18, giorni: -26, corpo: () => `
        <p class="st-intro">Alla fine dell'Ottocento la fiducia positivista nella scienza entra in crisi. Nasce una nuova sensibilità, il <b>Decadentismo</b>, che cerca nella poesia una conoscenza più profonda di quella razionale. In Italia la interpretano in modo molto diverso <b>Giovanni Pascoli</b> (1855-1912) e Gabriele D'Annunzio. Qui studiamo il movimento, la poetica del «fanciullino» e il commento di <i>X Agosto</i>.</p>
        <h2 id="st-s1">1. Il Decadentismo: origine del nome e caratteri</h2>
        <p>Il nome nasce come insulto: i critici chiamavano «decadenti» i giovani poeti parigini degli anni Ottanta, accusati di morbosità. Questi lo rivendicano: nel sonetto <i>Languore</i> (1883) Paul <b>Verlaine</b> scrive «Io sono l'Impero alla fine della decadenza». Il precursore è Charles <b>Baudelaire</b> (<i>I fiori del male</i>, 1857): nella poesia <i>Corrispondenze</i> la natura è «un tempio» pieno di simboli che il poeta sa decifrare.</p>
        ${figura(mappa('Il Decadentismo (1880-1910 circa)', [
          ['Crisi del Positivismo', 'La scienza non spiega tutto: c\'è un mistero dietro le cose.'],
          ['Il poeta veggente', 'Rimbaud: il poeta «vede» l\'ignoto con l\'intuizione.'],
          ['Simbolismo', 'Gli oggetti rimandano a significati nascosti; analogie e sinestesie.'],
          ['Musicalità', 'Verlaine: «la musica prima di ogni cosa». Il suono conta quanto il senso.'],
          ['Estetismo', 'La vita come opera d\'arte: Huysmans, Wilde, D\'Annunzio.'],
          ['Inconscio', 'Freud (1899): l\'io non è padrone in casa propria.'],
        ], 'Mappa del Decadentismo'), 'Figura 1 – I caratteri principali del Decadentismo europeo.')}
        <p>Il Decadentismo non è una scuola con un manifesto, ma un clima culturale. I suoi strumenti sono l'<b>analogia</b> (accostare realtà lontane senza il «come»), la <b>sinestesia</b> (unire sensazioni di sensi diversi: «voce azzurra»), il <b>fonosimbolismo</b> (il suono delle parole comunica un significato). Tra le opere chiave: <i>Controcorrente</i> di Huysmans (1884), <i>Il ritratto di Dorian Gray</i> di Oscar Wilde (1890).</p>
        ${nota('avviso', 'Attenzione ai termini', '<b>Decadentismo</b> è il nome generale del periodo; <b>Simbolismo</b> è la corrente poetica (Baudelaire, Verlaine, Rimbaud, Mallarmé); <b>Estetismo</b> è un atteggiamento di vita (il culto della bellezza). Pascoli è vicino al Simbolismo, D\'Annunzio all\'Estetismo.')}
        <h2 id="st-s2">2. La vita di Pascoli: il «nido» distrutto</h2>
        <p>Pascoli nasce nel 1855 a <b>San Mauro di Romagna</b> (oggi San Mauro Pascoli), quarto di dieci figli. Il <b>10 agosto 1867</b> il padre Ruggero, amministratore di una tenuta dei principi Torlonia, viene ucciso a fucilate mentre torna a casa sul suo calesse: gli assassini non saranno mai puniti. In pochi anni muoiono anche la madre e tre fratelli. Questo lutto segna tutta la sua poesia.</p>
        <p>Studia a Bologna con Carducci grazie a una borsa di studio; da giovane aderisce al movimento socialista e nel 1879 passa alcuni mesi in carcere. Poi diventa professore di liceo e di università (Messina, Pisa) e, nel 1905, succede a Carducci sulla cattedra di Bologna. Cerca di ricostruire il «<b>nido</b>» familiare vivendo con le sorelle Ida e Maria (Mariù); il matrimonio di Ida (1895) è vissuto come un tradimento. Nel 1895 si stabilisce a <b>Castelvecchio di Barga</b>, in Garfagnana. Muore a Bologna nel 1912.</p>
        ${figura(lineaTempo([
          ['1855', 'Nasce a San Mauro di Romagna'],
          ['1867', '10 agosto: il padre viene assassinato', true],
          ['1879', 'Arrestato per manifestazioni socialiste'],
          ['1891', 'Prima edizione di Myricae', true],
          ['1895', 'Si stabilisce a Castelvecchio di Barga con Mariù'],
          ['1897', 'Il fanciullino e i Poemetti'],
          ['1903', 'Canti di Castelvecchio'],
          ['1911', 'Discorso La grande proletaria si è mossa, sulla guerra di Libia'],
          ['1912', 'Muore a Bologna', true],
        ], 'Linea del tempo di Pascoli'), 'Figura 2 – Vita e opere di Pascoli.')}
        <h2 id="st-s3">3. La poetica del fanciullino</h2>
        <p>Nel saggio <i>Il fanciullino</i> (1897) Pascoli spiega che dentro ogni uomo vive un <b>fanciullo</b> che guarda il mondo con stupore, come la prima volta. Il poeta è colui che sa ascoltare questa voce: scopre le somiglianze nascoste tra le cose e dà loro un nome nuovo. La poesia non nasce dal ragionamento ma dall'<b>intuizione</b>; non deve insegnare, ma è di per sé «utile» perché rende gli uomini più buoni e solidali.</p>
        <ul>
          <li>Le <b>piccole cose</b> (un fiore, un uccello, un attrezzo agricolo) diventano simboli: è la poesia delle <i>myricae</i>, le umili tamerici citate da Virgilio.</li>
          <li>Il <b>linguaggio</b> è nuovo: termini precisi della botanica e dell'ornitologia (lingua «pregrammaticale» delle onomatopee e «postgrammaticale» dei termini tecnici, secondo il critico Contini).</li>
          <li>La <b>sintassi</b> è frantumata: frasi brevi, nominali, coordinate, molti puntini e pause.</li>
          <li>Il <b>fonosimbolismo</b>: «<i>il cuculo, il chiù</i>», «<i>videvitt</i>», i suoni degli uccelli trascritti come parole.</li>
        </ul>
        <h2 id="st-s4">4. Le opere</h2>
        ${tabella(['Opera', 'Anno', 'Caratteristiche', 'Testi da conoscere'], [
          ['<b>Myricae</b>', '1891 (poi ampliata fino al 1900)', 'Brevi liriche sulla vita dei campi, cariche di simboli di morte e di mistero', 'X Agosto, Lavandare, Novembre, Temporale, Il lampo, Il tuono'],
          ['<b>Poemetti</b>', '1897', 'Componimenti più lunghi e narrativi, in terzine', 'Digitale purpurea, Italy (sull\'emigrazione)'],
          ['<b>Canti di Castelvecchio</b>', '1903', 'Il paesaggio della Garfagnana; il ricordo dei morti', 'Il gelsomino notturno, La mia sera, Nebbia'],
          ['<b>Il fanciullino</b>', '1897', 'Saggio di poetica in prosa', '—'],
          ['<b>La grande proletaria si è mossa</b>', '1911', 'Discorso a favore della guerra di Libia come riscatto per i lavoratori emigrati', '—'],
        ])}
        <h2 id="st-s5">5. Testo commentato: <i>X Agosto</i> (da <i>Myricae</i>)</h2>
        ${cit(`San Lorenzo, io lo so perché tanto
          di stelle per l'aria tranquilla
          arde e cade, perché sì gran pianto
          nel concavo cielo sfavilla.

          Ritornava una rondine al tetto:
          l'uccisero: cadde tra spini;
          ella aveva nel becco un insetto:
          la cena de' suoi rondinini.

          Ora è là, come in croce, che tende
          quel verme a quel cielo lontano;
          e il suo nido è nell'ombra, che attende,
          che pigola sempre più piano.

          Anche un uomo tornava al suo nido:
          l'uccisero: disse: Perdono;
          e restò negli aperti occhi un grido:
          portava due bambole in dono.

          Ora là, nella casa romita,
          lo aspettano, aspettano in vano:
          egli immobile, attonito, addita
          le bambole al cielo lontano.

          E tu, Cielo, dall'alto dei mondi
          sereni, infinito, immortale,
          oh! d'un pianto di stelle lo inondi
          quest'atomo opaco del Male!`, 'G. Pascoli, <i>X Agosto</i>, da <i>Myricae</i>')}
        <p><b>Metrica.</b> Sei quartine di <b>decasillabi</b> e <b>novenari</b> alternati, con rima alternata (ABAB). Il ritmo cantilenante, quasi da filastrocca, contrasta con la tragicità del contenuto.</p>
        <p><b>Struttura.</b> La prima strofa spiega il titolo: la notte di San Lorenzo (10 agosto) cadono le stelle cadenti, che il poeta interpreta come il <b>pianto del cielo</b>. Seguono due coppie di strofe <b>parallele</b>: la rondine uccisa mentre porta il cibo ai piccoli, l'uomo (il padre del poeta) ucciso mentre porta due bambole alle figlie. Le espressioni si ripetono quasi identiche («Ritornava… / l'uccisero» – «tornava… / l'uccisero»): il parallelismo trasforma il fatto privato in un simbolo universale.</p>
        <p><b>Simboli.</b> Il <b>nido</b> è la famiglia distrutta; la rondine «come in croce» richiama il sacrificio di Cristo, vittima innocente; il «Perdono» dell'uomo morente lo rende una figura cristiana. Nell'ultima strofa il Cielo, «infinito, immortale», piange sulla Terra, «<b>atomo opaco del Male</b>»: la Terra è piccola (atomo), buia (opaca, senza luce propria) e dominata dalla violenza.</p>
        <p><b>Interpretazione.</b> La morte del padre non viene raccontata come cronaca: diventa una domanda sul male nel mondo. Il cielo è lontano e può solo piangere: non c'è una giustizia che intervenga. È la visione di Pascoli: un universo misterioso, in cui l'unico rifugio è il nido.</p>
        ${nota('info', 'Per l\'analisi del testo', 'Quando analizzi una poesia di Pascoli cerca sempre: <b>parole-simbolo</b> (nido, siepe, nebbia, morti), <b>suoni</b> (onomatopee, allitterazioni), <b>sintassi</b> spezzata, e il passaggio dal particolare concreto al significato universale.')}
        <h2 id="st-s6">6. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: l'emigrazione italiana tra Otto e Novecento (il poemetto <i>Italy</i>) e la guerra di Libia (1911-12).</li>
          <li><b>Inglese</b>: Oscar Wilde e l'Estetismo; il simbolismo in W. B. Yeats.</li>
          <li><b>Arte</b>: il Simbolismo in pittura (Böcklin, <i>L'isola dei morti</i>).</li>
        </ul>
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega che cos'è il «fanciullino» e perché, secondo Pascoli, la poesia è «utile».</li>
          <li>In <i>X Agosto</i> individua tutte le parole che appartengono al campo semantico della morte e del dolore.</li>
          <li>Spiega l'espressione «atomo opaco del Male» parola per parola.</li>
          <li>Leggi <i>Lavandare</i> e trova un esempio di onomatopea e uno di analogia.</li>
        </ol>` },

      // ============================== D'ANNUNZIO ==============================
      { id: 'dannunzio', titolo: 'Gabriele D\'Annunzio', minuti: 15, giorni: -23, corpo: () => `
        <p class="st-intro"><b>Gabriele D'Annunzio</b> (1863-1938) è il primo intellettuale-divo della storia italiana: poeta, romanziere, drammaturgo, soldato, uomo politico. Fa della propria vita un'opera d'arte e un prodotto da vendere. Nel suo percorso si riconoscono tre fasi: <b>estetismo</b>, <b>superomismo</b>, <b>panismo</b>. Leggiamo l'inizio de <i>La pioggia nel pineto</i>.</p>
        <h2 id="st-s1">1. Il contesto: l'Italia umbertina e la società di massa</h2>
        <p>D'Annunzio arriva a Roma nel 1881, negli anni della Sinistra storica e di Crispi. La città capitale si riempie di giornali mondani, salotti aristocratici, speculazioni edilizie. Nasce un pubblico borghese di lettori a cui D'Annunzio vende un'immagine di raffinatezza e di eccesso: è uno dei primi a capire il potere della <b>pubblicità</b> e della stampa. Più tardi, tra Ottocento e Novecento, la crisi del liberalismo e il <b>nazionalismo</b> trovano in lui un portavoce.</p>
        <h2 id="st-s2">2. La vita «inimitabile»</h2>
        ${figura(lineaTempo([
          ['1863', 'Nasce a Pescara'],
          ['1879', 'Primo vere, raccolta di versi giovanili'],
          ['1889', 'Il piacere, romanzo dell\'estetismo', true],
          ['1895', 'Le vergini delle rocce: il superuomo'],
          ['1898-1904', 'Legame con l\'attrice Eleonora Duse; Laudi (Alcyone, 1903)', true],
          ['1910', 'Fugge in Francia per i debiti'],
          ['1915', 'Torna e tiene i discorsi interventisti di Quarto e di Roma'],
          ['1918', 'Beffa di Buccari e volo su Vienna'],
          ['1919-20', 'Impresa di Fiume: governa la città per oltre un anno', true],
          ['1921', 'Notturno; si ritira al Vittoriale, sul lago di Garda'],
          ['1938', 'Muore al Vittoriale (Gardone Riviera)'],
        ], 'Linea del tempo di D\'Annunzio'), 'Figura 1 – La «vita inimitabile» di D\'Annunzio.')}
        <p>Durante la Prima guerra mondiale si arruola volontario a 52 anni; perde un occhio in un incidente aereo (1916) e durante la convalescenza, al buio, scrive il <i>Notturno</i> su strisce di carta. Dopo la guerra guida i legionari che occupano <b>Fiume</b> (settembre 1919), rivendicandola all'Italia contro i trattati di pace: è il mito della «vittoria mutilata», che il fascismo farà proprio. Mussolini lo onora, ma lo tiene lontano dalla politica, chiuso nel Vittoriale.</p>
        <h2 id="st-s3">3. Le tre fasi della produzione</h2>
        ${tabella(['Fase', 'Idea', 'Opere', 'Personaggio-simbolo'], [
          ['<b>Estetismo</b> (anni \'80)', 'La vita va vissuta come un\'opera d\'arte; culto del bello, rifiuto della morale borghese', '<i>Il piacere</i> (1889)', 'Andrea Sperelli, esteta raffinato ma senza volontà, diviso tra Elena Muti e Maria Ferres'],
          ['<b>Superomismo</b> (anni \'90)', 'Influenza di Nietzsche: l\'uomo superiore domina le masse e rifonda la nazione', '<i>Le vergini delle rocce</i> (1895), <i>Il fuoco</i> (1900)', 'Claudio Cantelmo, aristocratico che vuole generare il futuro re di Roma'],
          ['<b>Panismo</b> (Alcyone)', 'Fusione dell\'uomo con la natura (dal dio Pan): l\'io diventa pianta, acqua, vento', '<i>Laudi</i>, terzo libro <i>Alcyone</i> (1903)', 'L\'io lirico che si trasforma (metamorfosi)'],
          ['<b>Notturno</b> (1921)', 'Prosa frammentaria, intima, di memoria', '<i>Notturno</i>', 'Il poeta ferito, al buio'],
        ])}
        ${cit('Bisogna fare la propria vita, come si fa un\'opera d\'arte.', 'G. D\'Annunzio, <i>Il piacere</i>, libro I, cap. II (massima del padre di Andrea Sperelli)')}
        <p>Il romanzo mostra però anche il limite dell'esteta: Andrea Sperelli è un uomo debole, incapace di amare davvero e di agire. Per questo D'Annunzio passa al <b>superuomo</b>, figura attiva, eroica e aggressiva, che porta con sé idee antidemocratiche e nazionaliste.</p>
        <h2 id="st-s4">4. Testo commentato: <i>La pioggia nel pineto</i> (da <i>Alcyone</i>)</h2>
        ${cit(`Taci. Su le soglie
          del bosco non odo
          parole che dici
          umane; ma odo
          parole più nuove
          che parlano gocciole e foglie
          lontane.
          Ascolta. Piove
          dalle nuvole sparse.
          Piove su le tamerici
          salmastre ed arse,
          piove su i pini
          scagliosi ed irti,
          piove su i mirti
          divini…`, 'G. D\'Annunzio, <i>La pioggia nel pineto</i>, vv. 1-15')}
        <p><b>Situazione.</b> Il poeta e la donna amata, chiamata con il nome mitologico di <b>Ermione</b>, camminano in una pineta della Versilia sotto un temporale estivo. Il poeta la invita a tacere: le parole umane devono lasciare spazio alle «parole più nuove» della natura, cioè il suono della pioggia sulle foglie.</p>
        <p><b>Metrica e suono.</b> Quattro strofe di 32 versi ciascuna, di misura variabile (dal ternario al novenario), con rime libere e frequenti. Le <b>anafore</b> («piove su… piove su…»), le <b>allitterazioni</b> e le rime interne imitano il ticchettio della pioggia: è un esempio perfetto di <b>musicalità</b> decadente. Gli imperativi «Taci» e «Ascolta» aprono il testo come un rito.</p>
        <p><b>Il panismo.</b> Nelle strofe successive i due amanti si trasformano a poco a poco in creature vegetali: il volto di Ermione è «molle di pioggia / come una foglia», i capelli profumano come le ginestre. È la <b>metamorfosi</b>: l'uomo si fonde con la natura e diventa parte del tutto. Il finale riprende l'inizio, chiudendo il testo in una struttura circolare.</p>
        ${nota('info', 'Confronto con Pascoli', 'Entrambi usano il suono come significato. Ma per <b>Pascoli</b> la natura è misteriosa e spesso minacciosa, e il poeta è un fanciullo stupito; per <b>D\'Annunzio</b> la natura è un\'occasione di piacere sensuale e il poeta è un superuomo che la possiede fondendosi con essa.')}
        <h2 id="st-s5">5. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: l'interventismo del 1915, la «vittoria mutilata», l'impresa di Fiume (1919-20) e il rapporto con il fascismo.</li>
          <li><b>Filosofia</b>: Nietzsche e il superuomo (letto da D'Annunzio in modo semplificato e aristocratico).</li>
          <li><b>Inglese</b>: Oscar Wilde, <i>The Picture of Dorian Gray</i> (1890), e il dandy.</li>
          <li><b>Informatica/comunicazione</b>: D'Annunzio come inventore di slogan e marchi pubblicitari (il nome «La Rinascente», «tramezzino»): la costruzione di un'immagine pubblica.</li>
        </ul>
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega le differenze tra l'esteta Andrea Sperelli e il superuomo Claudio Cantelmo.</li>
          <li>Trova nel testo de <i>La pioggia nel pineto</i> due anafore e un esempio di allitterazione.</li>
          <li>Che cos'è il panismo? Rispondi in 5 righe con un esempio.</li>
          <li>Perché si dice che D'Annunzio fu il primo «divo» della comunicazione di massa?</li>
        </ol>` },

      // ============================== PIRANDELLO ==============================
      { id: 'pirandello', titolo: 'Luigi Pirandello', minuti: 18, giorni: -19, corpo: () => `
        <p class="st-intro"><b>Luigi Pirandello</b> (1867-1936), premio Nobel per la letteratura nel 1934, è lo scrittore italiano che ha raccontato meglio la <b>crisi dell'identità</b> nel Novecento: l'uomo moderno è prigioniero di «maschere» sociali e non sa più chi è. Studiamo il contrasto tra vita e forma, la poetica dell'umorismo, i romanzi, il teatro e un passo de <i>Il fu Mattia Pascal</i>.</p>
        <h2 id="st-s1">1. Il contesto: la crisi delle certezze</h2>
        <p>Nei primi decenni del Novecento crollano le certezze dell'Ottocento. La fisica di Einstein (relatività, 1905) mostra che tempo e spazio dipendono dall'osservatore; Freud scopre l'inconscio; Bergson distingue il tempo della coscienza da quello degli orologi. La società diventa di <b>massa</b>, l'uomo lavora in grandi organizzazioni e nelle fabbriche, si sente un ingranaggio. La letteratura reagisce con il romanzo della crisi: Pirandello, Svevo, Kafka, Joyce, Proust.</p>
        <h2 id="st-s2">2. La vita</h2>
        <p>Nasce nel 1867 ad Agrigento (allora Girgenti), in una villa di campagna chiamata <i>Caos</i>; il padre gestisce zolfare. Studia a Palermo, Roma e Bonn, dove si laurea in filologia romanza. Si stabilisce a Roma e sposa Antonietta Portulano. Nel 1903 l'allagamento della miniera di zolfo in cui erano investiti i capitali di famiglia lo manda in rovina; la moglie, sconvolta, cade in una grave malattia mentale, con crisi di gelosia: Pirandello vive anni di sofferenza domestica e insegna per mantenere la famiglia. Il successo arriva con il <b>teatro</b> negli anni Venti; nel 1924 aderisce pubblicamente al fascismo, pur con rapporti spesso difficili con il regime. Nel 1934 riceve il <b>premio Nobel</b>; muore a Roma nel 1936.</p>
        ${figura(lineaTempo([
          ['1867', 'Nasce ad Agrigento, in località Caos'],
          ['1903', 'Rovina economica e malattia della moglie', true],
          ['1904', 'Il fu Mattia Pascal', true],
          ['1908', 'Il saggio L\'umorismo'],
          ['1917', 'Così è (se vi pare)'],
          ['1921', 'Sei personaggi in cerca d\'autore: fischi a Roma, poi trionfo', true],
          ['1922', 'Enrico IV; inizia a raccogliere le Novelle per un anno'],
          ['1926', 'Uno, nessuno e centomila'],
          ['1934', 'Premio Nobel per la letteratura', true],
          ['1936', 'Muore a Roma'],
        ], 'Linea del tempo di Pirandello'), 'Figura 1 – Vita e opere di Pirandello.')}
        <h2 id="st-s3">3. Il pensiero: la vita e la forma</h2>
        <p>Secondo Pirandello la <b>vita</b> è un flusso continuo, che cambia sempre. Gli uomini però, per vivere in società, si fissano in <b>forme</b>: ruoli, abitudini, l'immagine che gli altri hanno di noi. Queste forme sono <b>maschere</b> che ci imprigionano («trappole»): la famiglia, il lavoro, il nome stesso. Ognuno di noi, poi, appare diverso a ogni persona che lo guarda: siamo «uno, nessuno e centomila».</p>
        ${figura(mappa('Vita e forma', [
          ['La vita', 'Flusso continuo, mutevole, che non si può fermare.'],
          ['La forma', 'Ruoli sociali e convenzioni che ci fissano: le maschere.'],
          ['Le trappole', 'Famiglia, lavoro, società: ci impediscono di essere liberi.'],
          ['Relativismo', 'Non esiste una verità unica: ognuno ha la sua (Così è, se vi pare).'],
          ['Il forestiero della vita', 'Chi capisce il gioco e ne esce: guarda gli altri con distacco.'],
          ['Follia', 'L\'unica via di fuga totale dalle forme (Enrico IV, Moscarda).'],
        ], 'Mappa del pensiero di Pirandello'), 'Figura 2 – Il contrasto tra vita e forma.')}
        <h2 id="st-s4">4. La poetica: l'umorismo</h2>
        <p>Nel saggio <i>L'umorismo</i> (1908) Pirandello distingue il <b>comico</b> dall'<b>umoristico</b> con un esempio celebre: una vecchia signora, «coi capelli ritinti» e «tutta goffamente imbellettata e parata d'abiti giovanili». Chi la vede ride, perché avverte che è il contrario di come una vecchia signora dovrebbe essere: è l'<b>avvertimento del contrario</b>, cioè il comico. Ma se riflettiamo e pensiamo che forse si veste così per trattenere l'amore di un marito più giovane, il riso si mescola alla pietà: è il <b>sentimento del contrario</b>, cioè l'umorismo.</p>
        ${tabella(['', 'Comico', 'Umorismo'], [
          ['Definizione', 'Avvertimento del contrario', 'Sentimento del contrario'],
          ['Come nasce', 'Dalla percezione immediata di un\'incongruenza', 'Dalla <b>riflessione</b>, che scompone le apparenze'],
          ['Effetto', 'Risata', 'Sorriso amaro, misto di riso e pietà'],
        ])}
        <h2 id="st-s5">5. Le opere</h2>
        ${tabella(['Opera', 'Genere', 'Anno', 'Contenuto'], [
          ['<b>Il fu Mattia Pascal</b>', 'romanzo', '1904', 'Mattia, creduto morto, si costruisce una nuova identità (Adriano Meis), ma scopre di non poter vivere fuori dalle forme sociali.'],
          ['<b>Quaderni di Serafino Gubbio operatore</b>', 'romanzo', '1915 (titolo <i>Si gira…</i>), 1925', 'Un operatore cinematografico diventa «una mano che gira la manovella»: l\'uomo ridotto a macchina.'],
          ['<b>Uno, nessuno e centomila</b>', 'romanzo', '1926', 'Vitangelo Moscarda scopre dalla moglie di avere il naso storto: capisce che gli altri vedono centomila Moscarda diversi e rinuncia a ogni identità.'],
          ['<b>Novelle per un anno</b>', 'novelle', '1922 in poi', '<i>Ciàula scopre la luna</i>, <i>Il treno ha fischiato</i> (l\'impiegato Belluca), <i>La patente</i>.'],
          ['<b>Così è (se vi pare)</b>', 'teatro', '1917', 'Chi è davvero la signora Ponza? Ognuno ha la sua verità.'],
          ['<b>Sei personaggi in cerca d\'autore</b>', 'teatro', '1921', 'Sei personaggi rifiutati dal loro autore irrompono in una prova teatrale: è il «teatro nel teatro».'],
          ['<b>Enrico IV</b>', 'teatro', '1922', 'Un uomo, dopo una caduta da cavallo, crede di essere l\'imperatore Enrico IV; quando guarisce sceglie di fingersi pazzo.'],
        ])}
        <h2 id="st-s6">6. Testo commentato: l'inizio de <i>Il fu Mattia Pascal</i></h2>
        ${cit('Una delle poche cose, anzi forse la sola ch\'io sapessi di certo era questa: che mi chiamavo Mattia Pascal.', 'L. Pirandello, <i>Il fu Mattia Pascal</i>, cap. I «Premessa»')}
        <p><b>Il narratore.</b> Il romanzo è raccontato in <b>prima persona</b> da Mattia stesso, a vicenda conclusa, mentre vive nella biblioteca di Miragno. È un narratore che sa già come è andata e commenta con ironia i propri errori.</p>
        <p><b>Il paradosso.</b> L'unica certezza di Mattia è il nome: ma il romanzo racconterà proprio come perde anche questa. Dopo una vincita al gioco a Montecarlo legge sul giornale di essere stato riconosciuto in un cadavere annegato nella gora di un mulino: è libero dalla moglie, dalla suocera, dai debiti. Diventa <b>Adriano Meis</b> e va a Roma; ma senza documenti non può sposarsi, denunciare un furto, avere una vita vera. Simula allora il suicidio di Adriano Meis e torna a casa, dove la moglie si è risposata. Non gli resta che portare fiori sulla propria tomba: è «il fu Mattia Pascal».</p>
        <p><b>Il significato.</b> Uscire da una forma non porta alla libertà ma al vuoto: senza identità sociale non si esiste. Mattia non trova una nuova vita, si limita a guardare la vita degli altri da «forestiero».</p>
        ${nota('avviso', 'Errore frequente', 'Il fu Mattia Pascal <b>non</b> finge la propria morte all\'inizio: è creduto morto per un errore (il riconoscimento sbagliato del cadavere) e ne approfitta. Finge invece il suicidio di Adriano Meis.')}
        <h2 id="st-s7">7. Collegamenti</h2>
        <ul>
          <li><b>Informatica</b>: identità digitale e profili social come nuove «maschere»; l'uomo-macchina di Serafino Gubbio e il rapporto con la tecnologia.</li>
          <li><b>Storia</b>: la crisi dello Stato liberale e il rapporto degli intellettuali con il fascismo.</li>
          <li><b>Inglese</b>: James Joyce e il flusso di coscienza; il teatro dell'assurdo (Beckett).</li>
        </ul>
        <h2 id="st-s8">8. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega con un esempio tuo la differenza tra «avvertimento» e «sentimento» del contrario.</li>
          <li>Perché Adriano Meis non può vivere davvero? Elenca tre situazioni del romanzo.</li>
          <li>Che cosa significa «teatro nel teatro»? Fai riferimento ai <i>Sei personaggi</i>.</li>
          <li>Scrivi un breve testo argomentativo: «I profili social sono le maschere di Pirandello?»</li>
        </ol>` },

      // ============================== SVEVO ==============================
      { id: 'svevo', titolo: 'Italo Svevo', minuti: 15, giorni: -15, corpo: () => `
        <p class="st-intro"><b>Italo Svevo</b> (1861-1928) è lo pseudonimo di Aron Hector Schmitz, scrittore e uomo d'affari triestino. Ignorato per decenni, fu scoperto tardi grazie a James Joyce e a Eugenio Montale. È il narratore dell'<b>inetto</b>, l'uomo incapace di vivere, e con <i>La coscienza di Zeno</i> porta nel romanzo italiano la psicoanalisi e il tempo interiore.</p>
        <h2 id="st-s1">1. Il contesto: Trieste, città di confine</h2>
        <p>Fino al 1918 Trieste appartiene all'<b>Impero austro-ungarico</b>: è il suo grande porto commerciale, città cosmopolita dove convivono italiani, tedeschi, sloveni, ebrei, greci. Vi circolano la cultura tedesca e mitteleuropea (Schopenhauer, Nietzsche, Freud) prima che nel resto d'Italia. Il nome scelto da Schmitz, <b>Italo Svevo</b>, riassume questa doppia identità: italiano per lingua, «svevo» (tedesco) per formazione.</p>
        <h2 id="st-s2">2. La vita</h2>
        <p>Nasce nel 1861 da una famiglia della borghesia ebraica; studia in un collegio in Germania. Il fallimento del padre lo costringe a lavorare come impiegato alla <b>Banca Union</b> di Trieste (1880-1899). Pubblica a sue spese <i>Una vita</i> (1892) e <i>Senilità</i> (1898), che passano inosservati. Sposa Livia Veneziani ed entra nell'azienda del suocero, che produce vernici per le navi: diventa un ricco industriale e quasi smette di scrivere. Nel 1907 prende lezioni di inglese da <b>James Joyce</b>, che diventa suo amico. Nel 1923 pubblica <i>La coscienza di Zeno</i>; grazie a Joyce il romanzo viene apprezzato in Francia, e in Italia Montale gli dedica un <i>Omaggio a Italo Svevo</i> (1925). Muore nel 1928 in seguito a un incidente stradale.</p>
        ${figura(lineaTempo([
          ['1861', 'Nasce a Trieste (Impero austro-ungarico)'],
          ['1880', 'Impiegato alla Banca Union'],
          ['1892', 'Una vita (protagonista: Alfonso Nitti)', true],
          ['1898', 'Senilità (protagonista: Emilio Brentani)', true],
          ['1899', 'Entra nella ditta di vernici della famiglia della moglie'],
          ['1907', 'Lezioni di inglese con James Joyce'],
          ['1918', 'Trieste passa all\'Italia'],
          ['1923', 'La coscienza di Zeno', true],
          ['1925', 'Montale pubblica l\'Omaggio a Italo Svevo'],
          ['1928', 'Muore a Motta di Livenza dopo un incidente d\'auto'],
        ], 'Linea del tempo di Svevo'), 'Figura 1 – Vita e opere di Svevo.')}
        <h2 id="st-s3">3. L'inetto e i tre romanzi</h2>
        <p>Tutti i protagonisti di Svevo sono <b>inetti</b>: uomini insicuri, sognatori, incapaci di agire e di raggiungere ciò che desiderano, che si inventano giustificazioni (<b>autoinganni</b>) per non vedere le proprie debolezze. Ma l'inetto si evolve da un romanzo all'altro.</p>
        ${tabella(['Romanzo', 'Protagonista', 'Vicenda', 'Esito dell\'inettitudine'], [
          ['<b>Una vita</b> (1892)', 'Alfonso Nitti, impiegato di banca', 'Seduce Annetta, figlia del banchiere, ma fugge davanti al matrimonio', 'Si suicida: l\'inetto è sconfitto'],
          ['<b>Senilità</b> (1898)', 'Emilio Brentani, impiegato e scrittore fallito', 'Si innamora di Angiolina, donna libera che lo tradisce; trascura la sorella Amalia, che muore', 'Sopravvive chiuso in una «senilità» spirituale, nel ricordo'],
          ['<b>La coscienza di Zeno</b> (1923)', 'Zeno Cosini, ricco borghese', 'Racconta la sua vita su invito dello psicanalista', 'Si dichiara «guarito»: l\'inettitudine diventa una condizione di tutti'],
        ])}
        <h2 id="st-s4">4. <i>La coscienza di Zeno</i>: struttura e novità</h2>
        <p>Il romanzo si presenta come il memoriale che Zeno ha scritto su consiglio del suo psicanalista, il <b>Dottor S.</b>, il quale lo pubblica «per vendetta» perché il paziente ha interrotto la cura. Già la <b>Prefazione</b> avverte il lettore: in quelle pagine ci sono «tante verità e bugie». Zeno è un <b>narratore inattendibile</b>.</p>
        ${tabella(['Capitolo', 'Contenuto'], [
          ['Prefazione e Preambolo', 'Il Dottor S. presenta il memoriale; Zeno cerca di ricordare l\'infanzia'],
          ['Il fumo', 'Le infinite «ultime sigarette» e i propositi mai mantenuti'],
          ['La morte di mio padre', 'Il padre, morendo, gli dà uno schiaffo: punizione o gesto involontario?'],
          ['La storia del mio matrimonio', 'Corteggia Ada, viene respinto, poi Alberta, e finisce per sposare Augusta, la meno bella: sarà un matrimonio felice'],
          ['La moglie e l\'amante', 'La relazione con Carla, giovane cantante'],
          ['Storia di un\'associazione commerciale', 'La ditta con il cognato Guido, che fallisce e muore; Zeno sbaglia funerale'],
          ['Psico-analisi', 'Diario del 1915-16: Zeno abbandona la cura, si arricchisce con la guerra e si dice guarito'],
        ])}
        <p>Le novità sono tre. Il <b>tempo misto</b>: i capitoli non seguono l'ordine cronologico ma sono organizzati per temi; il passato è filtrato dalla memoria del presente. La <b>psicoanalisi</b>: Zeno interpreta (e contesta) i propri atti mancati, come i lapsus e gli errori «involontari». L'<b>ironia</b>: il lettore deve continuamente chiedersi se credere a Zeno.</p>
        <h2 id="st-s5">5. Testi commentati</h2>
        ${cit('Penso che la sigaretta abbia un gusto più intenso quand\'è l\'ultima.', 'I. Svevo, <i>La coscienza di Zeno</i>, cap. «Il fumo»')}
        <p>Zeno scrive le sigle «U.S.» (ultima sigaretta) su muri, libri e calendari, accompagnate da date «importanti» per dare solennità al proposito. Ma l'ultima sigaretta è piacevole proprio perché è l'ultima: il vizio si nutre del proposito di smettere. È un perfetto esempio di <b>autoinganno</b>: Zeno ama i buoni propositi più della guarigione.</p>
        ${cit('Ci sarà un\'esplosione enorme che nessuno udrà e la terra ritornata alla forma di nebulosa errerà nei cieli priva di parassiti e di malattie.', 'I. Svevo, <i>La coscienza di Zeno</i>, ultime righe')}
        <p>Il romanzo si chiude con una visione apocalittica. Zeno osserva che la vita stessa è «inquinata alle radici»: l'uomo, invece di evolversi nel proprio corpo, costruisce «ordigni» sempre più potenti. Un giorno un uomo «fatto come tutti gli altri» inventerà un esplosivo capace di distruggere la Terra. La malattia non è più solo di Zeno: è la <b>civiltà</b> a essere malata. Molti lettori hanno visto in queste righe, scritte nel 1923, una profezia della bomba atomica.</p>
        ${nota('info', 'Per il colloquio', 'Collegamento efficace: il finale di Zeno, Hiroshima (1945) e la corsa agli armamenti della Guerra fredda; oppure Svevo e Joyce (<i>Ulysses</i>, 1922): due romanzi del 1922-23 costruiti sul tempo interiore.')}
        <h2 id="st-s6">6. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: Trieste asburgica e l'irredentismo; la Prima guerra mondiale vista da Zeno, che si arricchisce con il commercio.</li>
          <li><b>Inglese</b>: James Joyce, <i>Dubliners</i> e <i>Ulysses</i>; lo <i>stream of consciousness</i>.</li>
          <li><b>Filosofia</b>: Freud e la nascita della psicoanalisi (<i>L'interpretazione dei sogni</i>, 1899).</li>
        </ul>
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Confronta Alfonso Nitti, Emilio Brentani e Zeno Cosini in una tabella.</li>
          <li>Perché Zeno è considerato un narratore inattendibile? Porta due esempi.</li>
          <li>Che cosa si intende per «tempo misto»?</li>
          <li>Commenta il finale del romanzo collegandolo a un evento storico del Novecento.</li>
        </ol>` },

      // ============================== UNGARETTI E MONTALE ==============================
      { id: 'ungaretti-montale', titolo: 'Giuseppe Ungaretti ed Eugenio Montale', minuti: 18, giorni: -11, corpo: () => `
        <p class="st-intro">La poesia italiana del primo Novecento rinnova radicalmente forme e linguaggio. <b>Giuseppe Ungaretti</b> (1888-1970) scarnifica il verso fino alla singola parola, nato nell'esperienza della trincea; <b>Eugenio Montale</b> (1896-1981, premio Nobel 1975) racconta il «male di vivere» attraverso gli oggetti. In questa dispensa citiamo solo brevi versi, come si fa in un'analisi: i testi completi vanno letti sull'antologia.</p>
        ${nota('avviso', 'Diritto d\'autore', 'Le poesie di Ungaretti e di Montale sono ancora protette dal diritto d\'autore: qui ne riportiamo soltanto pochi versi a scopo di studio e di commento (citazione breve), come previsto dalla legge. Leggete i testi interi sul libro di testo.')}
        <h2 id="st-s1">1. Il contesto: avanguardie, guerra, ermetismo</h2>
        <p>Il Novecento si apre con le <b>avanguardie</b>: il <b>Futurismo</b> di Filippo Tommaso Marinetti (Manifesto pubblicato su «Le Figaro» nel 1909) esalta la velocità, la macchina, la guerra «sola igiene del mondo», e propone le «parole in libertà». I <b>Crepuscolari</b> (Gozzano, Corazzini) cantano invece le «piccole cose di pessimo gusto» con tono dimesso. Poi arriva la <b>Prima guerra mondiale</b>, che molti intellettuali vivono in prima persona.</p>
        <p>Negli anni Trenta si parla di <b>Ermetismo</b> (dal saggio di Francesco Flora <i>La poesia ermetica</i>, 1936): una poesia difficile, «chiusa», fatta di analogie e parole essenziali, che si rifiuta di parlare il linguaggio retorico del regime. Ne sono considerati maestri Ungaretti e Montale; il poeta ermetico per eccellenza è Salvatore Quasimodo (Nobel 1959).</p>
        ${figura(lineaTempo([
          ['1909', 'Manifesto del Futurismo di Marinetti'],
          ['1915-18', 'Ungaretti soldato sul Carso', true],
          ['1916', 'Il porto sepolto (Ungaretti), stampato in 80 copie a Udine'],
          ['1925', 'Ossi di seppia (Montale)', true],
          ['1931', 'L\'Allegria (Ungaretti), titolo definitivo'],
          ['1933', 'Sentimento del tempo (Ungaretti)'],
          ['1939', 'Le occasioni (Montale)'],
          ['1947', 'Il dolore (Ungaretti)'],
          ['1956', 'La bufera e altro (Montale)'],
          ['1971', 'Satura (Montale)'],
          ['1975', 'Premio Nobel a Montale', true],
        ], 'Linea del tempo di Ungaretti e Montale'), 'Figura 1 – Le opere principali dei due poeti.')}
        <h2 id="st-s2">2. Ungaretti: la vita</h2>
        <p>Nasce ad <b>Alessandria d'Egitto</b> nel 1888 da genitori lucchesi; nel 1912 va a Parigi, dove conosce le avanguardie (Apollinaire, Picasso). Interventista, nel 1915 parte volontario come <b>soldato semplice</b> e combatte sul Carso. Scrive le poesie in trincea, su pezzi di carta, datandole come un diario. Dopo la guerra vive a Roma; insegna letteratura italiana all'università di San Paolo del Brasile (1936-42), dove muore il figlio Antonietto di nove anni. Torna a Roma, insegna all'università; muore a Milano nel 1970.</p>
        <h2 id="st-s3">3. <i>L'Allegria</i>: la parola nuda</h2>
        <p>La raccolta nasce come <i>Il porto sepolto</i> (1916), diventa <i>Allegria di naufragi</i> (1919) e infine <i>L'Allegria</i> (1931). Il titolo è un ossimoro: l'«allegria» è lo slancio vitale di chi è sopravvissuto al «naufragio» della guerra.</p>
        ${figura(mappa('La poetica dell\'Allegria', [
          ['Versicolo', 'Versi brevissimi, anche di una sola parola: ogni parola ha peso.'],
          ['Niente punteggiatura', 'Sostituita dagli spazi bianchi, che diventano pause e silenzio.'],
          ['Analogia', 'Accostamenti improvvisi tra realtà lontane, senza il «come».'],
          ['Diario', 'Ogni poesia ha luogo e data: la guerra vissuta giorno per giorno.'],
          ['Fratellanza', 'Davanti alla morte nasce la solidarietà tra uomini fragili.'],
          ['Attaccamento alla vita', 'L\'orrore fa sentire più forte il valore del vivere.'],
        ], 'Mappa della poetica di Ungaretti'), 'Figura 2 – I caratteri dell\'Allegria.')}
        <p><b><i>Veglia</i></b> (Cima Quattro, 23 dicembre 1915). Il soldato ha passato una notte intera accanto al corpo di un compagno ucciso, con la bocca digrignata rivolta alla luna. Il testo si chiude con un capovolgimento inatteso:</p>
        ${cit(`Non sono mai stato
          tanto
          attaccato alla vita`, 'G. Ungaretti, <i>Veglia</i>, ultimi versi (da <i>L\'Allegria</i>)')}
        <p>Il contatto con la morte non produce disperazione ma il suo contrario: un attaccamento alla vita fortissimo. L'avverbio «tanto», isolato in un verso, riceve tutto l'accento. Il ritmo è spezzato, senza punteggiatura: le pause bianche sono il respiro trattenuto del soldato.</p>
        <p><b><i>Soldati</i></b> (Bosco di Courton, luglio 1918). In quattro brevissimi versi la condizione dei soldati è paragonata a quella delle foglie che in autunno stanno per cadere dagli alberi: un'immagine della <b>precarietà</b> della vita, che riprende un paragone antichissimo (Omero, Virgilio, Dante) ma con un linguaggio scarno e moderno. Il verbo impersonale «si sta» rende la condizione comune a tutti.</p>
        <p><b><i>San Martino del Carso</i></b>. Il paese distrutto dalla guerra diventa il simbolo del cuore del poeta, pieno di croci per i compagni morti. La poesia si chiude con un'analogia forte:</p>
        ${cit(`È il mio cuore
          il paese più straziato`, 'G. Ungaretti, <i>San Martino del Carso</i>, ultimi versi')}
        <h2 id="st-s4">4. Montale: la vita</h2>
        <p>Nasce a <b>Genova</b> nel 1896, ultimo figlio di un commerciante; passa le estati a <b>Monterosso</b>, nelle Cinque Terre: il paesaggio ligure, aspro e assolato, sarà il fondale degli <i>Ossi di seppia</i>. Combatte nella Prima guerra mondiale come ufficiale. Nel 1925 firma il <i>Manifesto degli intellettuali antifascisti</i> di Croce. A Firenze dirige il Gabinetto Vieusseux, da cui viene allontanato nel 1938 perché non iscritto al partito fascista. Dopo la guerra si trasferisce a Milano come giornalista del «Corriere della Sera». È nominato senatore a vita (1967), riceve il <b>Nobel</b> nel 1975 e muore a Milano nel 1981.</p>
        <h2 id="st-s5">5. Montale: il male di vivere e il correlativo oggettivo</h2>
        <p>Per Montale la realtà è una prigione: un «muro» oltre il quale forse c'è un senso, un «varco», che però quasi mai si apre. Il poeta non ha certezze da offrire. Nella poesia <i>Non chiederci la parola</i>, che apre la sezione «Ossi di seppia», lo dice esplicitamente:</p>
        ${cit(`Codesto solo oggi possiamo dirti,
          ciò che non siamo, ciò che non vogliamo.`, 'E. Montale, <i>Non chiederci la parola</i>, ultimi versi (da <i>Ossi di seppia</i>)')}
        <p>È una dichiarazione di <b>poetica negativa</b>: il poeta moderno non è un vate (come D'Annunzio) e non può dare formule che spieghino il mondo; può solo dire ciò che non siamo.</p>
        <p>Per esprimere i sentimenti Montale usa il <b>correlativo oggettivo</b> (termine del poeta anglo-americano T. S. Eliot): invece di descrivere un'emozione, presenta un <b>oggetto</b> o una situazione concreta che la incarna. Il caso più famoso è <i>Spesso il male di vivere ho incontrato</i>: il primo verso dà il tema, poi il male di vivere diventa tre immagini concrete, «il rivo strozzato che gorgoglia», «l'incartocciarsi della foglia / riarsa», «il cavallo stramazzato». L'unico rimedio è la «divina Indifferenza», rappresentata da immagini di distacco (la statua, la nuvola, il falco alto levato).</p>
        ${tabella(['', 'Ungaretti (L\'Allegria)', 'Montale (Ossi di seppia)'], [
          ['Esperienza di partenza', 'La trincea, la morte vicina', 'Il paesaggio ligure arido, la crisi esistenziale'],
          ['Forma', 'Versi brevissimi, niente punteggiatura', 'Versi anche lunghi, sintassi complessa, rime e assonanze'],
          ['Tecnica', 'Analogia', 'Correlativo oggettivo'],
          ['Messaggio', 'Attaccamento alla vita, fratellanza', 'Male di vivere, ricerca di un «varco»'],
          ['Ruolo del poeta', 'Uomo di pena, «docile fibra dell\'universo»', 'Testimone senza certezze'],
        ])}
        <p>Nelle <i>Occasioni</i> (1939) compare la figura femminile di <b>Clizia</b> (la studiosa americana Irma Brandeis), una donna-angelo portatrice di salvezza; in <i>Satura</i> (1971) il tono diventa ironico e quotidiano, con gli <i>Xenia</i> dedicati alla moglie morta, Drusilla Tanzi detta Mosca (celebre l'attacco «Ho sceso, dandoti il braccio, almeno un milione di scale»).</p>
        ${nota('info', 'Come citare i versi', 'Nell\'analisi del testo si citano i versi tra virgolette basse, separando gli a capo con la barra: «l\'incartocciarsi della foglia / riarsa». Bastano poche parole, scelte bene, per sostenere un\'interpretazione.')}
        <h2 id="st-s6">6. Collegamenti</h2>
        <ul>
          <li><b>Storia</b>: la guerra di trincea sul Carso e sull'Isonzo; il fascismo e gli intellettuali (Manifesto degli intellettuali antifascisti, 1925).</li>
          <li><b>Inglese</b>: i <i>war poets</i> (Wilfred Owen, Siegfried Sassoon); T. S. Eliot, <i>The Waste Land</i> (1922) e il correlativo oggettivo.</li>
          <li><b>Arte</b>: il Cubismo (Ungaretti a Parigi) e la scomposizione della forma.</li>
        </ul>
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega che cos'è il «versicolo» e perché Ungaretti lo usa.</li>
          <li>Che cos'è il correlativo oggettivo? Spiegalo con l'esempio di <i>Spesso il male di vivere ho incontrato</i>.</li>
          <li>Confronta il modo in cui Ungaretti e D'Annunzio vissero e raccontarono la Prima guerra mondiale.</li>
          <li>Perché si dice che la poetica di <i>Non chiederci la parola</i> è «negativa»?</li>
        </ol>` },

      // ============================== ESAME DI STATO ==============================
      { id: 'esame', titolo: 'La prima prova dell\'Esame di Stato', minuti: 16, giorni: -6, corpo: () => `
        <p class="st-intro">La <b>prima prova scritta</b> dell'Esame di Stato è la prova di italiano, uguale per tutti gli indirizzi. Dura <b>6 ore</b> e propone <b>sette tracce</b> divise in tre tipologie: il candidato ne sceglie una. In questa dispensa vediamo le tipologie, il metodo per l'analisi del testo, come si costruisce un testo argomentativo e come funziona la griglia di valutazione.</p>
        <h2 id="st-s1">1. Le tre tipologie</h2>
        ${tabella(['Tipologia', 'Che cosa chiede', 'Tracce', 'Consigliata a chi…'], [
          ['<b>A</b> – Analisi e interpretazione di un testo letterario italiano', 'Comprensione, analisi (lessico, stile, metrica, figure retoriche) e interpretazione di un testo in prosa o in poesia, dall\'Unità d\'Italia a oggi', '2', '…conosce bene autori e contesto e sa usare il lessico dell\'analisi'],
          ['<b>B</b> – Analisi e produzione di un testo argomentativo', 'Riconoscere tesi e argomenti di un testo dato (storico, scientifico, economico, sociale) e poi produrre un proprio testo argomentativo', '3', '…sa ragionare su un testo non letterario e costruire un\'argomentazione'],
          ['<b>C</b> – Riflessione critica di carattere espositivo-argomentativo su tematiche di attualità', 'Partendo da un breve spunto, scrivere un testo personale, eventualmente con titolo e paragrafi', '2', '…ha idee chiare e buone letture sull\'attualità'],
        ])}
        ${nota('info', 'Regole pratiche', 'È ammesso l\'uso del <b>dizionario della lingua italiana</b>. Non si può consegnare prima che siano trascorse 3 ore dall\'inizio. Leggete <b>tutte</b> le sette tracce prima di scegliere: dedicate 15-20 minuti alla scelta, non di più.')}
        <h2 id="st-s2">2. Tipologia A: il metodo in tre fasi</h2>
        <ol>
          <li><b>Comprensione</b>: sintesi o parafrasi del testo (rispettando il numero di righe richiesto).</li>
          <li><b>Analisi</b>: rispondere alle domande su lessico, sintassi, metrica, figure retoriche, punto di vista, temi. Ogni osservazione va <b>dimostrata</b> con una citazione breve tra virgolette.</li>
          <li><b>Interpretazione</b>: collocare il testo nell'opera dell'autore e nel suo tempo, confrontarlo con altri testi e autori, esprimere un giudizio motivato.</li>
        </ol>
        <p>Si può rispondere punto per punto o in un testo unico: l'importante è non dimenticare nessuna richiesta. L'interpretazione è la parte che «fa la differenza» e deve essere ampia.</p>
        <h2 id="st-s3">3. Come si scrive un testo argomentativo</h2>
        <p>Un testo argomentativo vuole <b>convincere</b> il lettore di una tesi con ragionamenti e prove. Ha una struttura riconoscibile:</p>
        ${figura(mappa('Struttura del testo argomentativo', [
          ['1. Introduzione', 'Presenta il problema (questione) e perché è importante oggi.'],
          ['2. Tesi', 'La tua opinione, espressa in modo chiaro in una o due frasi.'],
          ['3. Argomenti a sostegno', 'Ragioni e prove: dati, esempi, fatti storici, citazioni di autori.'],
          ['4. Antitesi', 'L\'opinione contraria, presentata in modo corretto.'],
          ['5. Confutazione', 'Perché l\'antitesi non regge, o è valida solo in parte.'],
          ['6. Conclusione', 'Ribadisci la tesi, eventualmente con una proposta.'],
        ], 'Struttura del testo argomentativo'), 'Figura 1 – Le sei parti del testo argomentativo.')}
        <p><b>Tipi di argomenti.</b> I più efficaci sono: i <b>dati</b> e le statistiche (con la fonte); gli <b>esempi</b> concreti; l'argomento di <b>autorità</b> (la citazione di un esperto o di un autore studiato); l'argomento <b>logico</b> (causa-effetto); l'<b>analogia</b> con una situazione simile; l'esperienza personale (solo nella tipologia C e con misura).</p>
        <h3>I connettivi</h3>
        ${tabella(['Funzione', 'Connettivi'], [
          ['Introdurre la tesi', 'ritengo che, a mio parere, sono convinto che, è evidente che'],
          ['Aggiungere argomenti', 'inoltre, in secondo luogo, per di più, non solo… ma anche'],
          ['Portare un esempio', 'per esempio, basti pensare a, come dimostra'],
          ['Presentare l\'antitesi', 'qualcuno potrebbe obiettare che, è vero che, certo'],
          ['Confutare', 'tuttavia, eppure, ciononostante, in realtà'],
          ['Concludere', 'in conclusione, dunque, pertanto, per questi motivi'],
        ])}
        <h3>Esempio guidato (tipologia C)</h3>
        <p><i>Traccia: «La tecnologia ci rende più liberi o più dipendenti?»</i></p>
        ${tabella(['Parte', 'Esempio di contenuto'], [
          ['Introduzione', 'Passiamo in media diverse ore al giorno davanti a uno schermo: è una domanda che riguarda tutti.'],
          ['Tesi', 'La tecnologia rende più liberi solo chi impara a usarla in modo consapevole.'],
          ['Argomenti', 'Accesso al sapere e alla comunicazione (esempio: le lezioni a distanza); possibilità di lavoro nuove; ma anche notifiche progettate per catturare l\'attenzione.'],
          ['Antitesi', 'Qualcuno sostiene che la tecnologia sia di per sé una trappola, come le «forme» di Pirandello.'],
          ['Confutazione', 'Lo strumento in sé è neutro: è l\'educazione digitale a fare la differenza.'],
          ['Conclusione', 'Proposta: insegnare a scuola l\'uso critico dei social e la gestione dei dati personali.'],
        ])}
        ${nota('avviso', 'Errori da evitare', 'Tesi assente o cambiata a metà; elenchi di idee senza collegamenti; frasi fatte («al giorno d\'oggi», «sin dall\'alba dei tempi»); registro troppo colloquiale; nessun riferimento culturale; testo senza paragrafi; mancata rilettura finale (ortografia, accenti, apostrofi).')}
        <h2 id="st-s4">4. Gestire le 6 ore</h2>
        ${tabella(['Tempo', 'Attività'], [
          ['0:00 - 0:20', 'Lettura di tutte le tracce e scelta'],
          ['0:20 - 1:00', 'Brutta copia delle idee: scaletta (tesi, argomenti, esempi, citazioni)'],
          ['1:00 - 3:30', 'Stesura in brutta copia'],
          ['3:30 - 5:00', 'Revisione e copiatura in bella'],
          ['5:00 - 5:45', 'Rilettura finale lenta: ortografia, punteggiatura, ripetizioni'],
        ])}
        <h2 id="st-s5">5. La griglia di valutazione</h2>
        <p>La prova è valutata in <b>centesimi</b> con una griglia nazionale (quadri di riferimento del D.M. 1095/2019): <b>60 punti</b> per gli indicatori generali, uguali per tutte le tipologie, e <b>40 punti</b> per gli indicatori specifici della tipologia scelta. Il punteggio in centesimi si converte in <b>ventesimi</b> dividendo per 5 (con arrotondamento). La ripartizione precisa dei punti tra i singoli indicatori è stabilita dalla commissione: quella sotto è un esempio usato in molte scuole.</p>
        ${tabella(['Indicatori generali (max 60)', 'Punti (esempio)'], [
          ['1a. Ideazione, pianificazione e organizzazione del testo', '10'],
          ['1b. Coesione e coerenza testuale', '10'],
          ['2a. Ricchezza e padronanza lessicale', '10'],
          ['2b. Correttezza grammaticale (ortografia, morfologia, sintassi); uso corretto ed efficace della punteggiatura', '10'],
          ['3a. Ampiezza e precisione delle conoscenze e dei riferimenti culturali', '10'],
          ['3b. Espressione di giudizi critici e valutazioni personali', '10'],
        ])}
        ${tabella(['Tipologia', 'Indicatori specifici (max 40)'], [
          ['A', 'Rispetto dei vincoli della consegna; capacità di comprendere il testo nel senso complessivo e nei suoi snodi; puntualità nell\'analisi lessicale, sintattica, stilistica e retorica; interpretazione corretta e articolata del testo'],
          ['B', 'Individuazione corretta di tesi e argomentazioni nel testo proposto; capacità di sostenere con coerenza un percorso ragionativo adoperando connettivi pertinenti; correttezza e congruenza dei riferimenti culturali'],
          ['C', 'Pertinenza del testo rispetto alla traccia e coerenza nella formulazione dell\'eventuale titolo e paragrafazione; sviluppo ordinato e lineare dell\'esposizione; correttezza e articolazione delle conoscenze e dei riferimenti culturali'],
        ])}
        ${nota('info', 'Esempio di conversione', 'Una prova valutata 72/100 vale 72 : 5 = 14,4 → <b>14/20</b>. Una prova da 78/100 vale 15,6 → <b>16/20</b>.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Scegli una poesia di Montale o di Ungaretti dall'antologia e prepara le risposte di comprensione, analisi e interpretazione (tipologia A).</li>
          <li>Scrivi la scaletta (tesi, tre argomenti, antitesi, confutazione) per la traccia: «Il lavoro nell'epoca dell'intelligenza artificiale».</li>
          <li>Riscrivi un tuo vecchio tema correggendolo con la griglia: assegna i punti a ogni indicatore.</li>
          <li>Trova nel tuo ultimo testo tutte le frasi fatte e sostituiscile con espressioni precise.</li>
        </ol>` },
    ],
  };
})();
