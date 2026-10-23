// DISPENSE — Informatica: gli argomenti, ognuno con la sua pagina (usa gli aiuti di boss-pagina.js: nota, ide, terminale, figura…).
(() => {
  const { nota, ide, terminale, figura, tabella, BOX_SVG, H_PAGINA, C_STILE, annoScolastico } = window.BossAiuti;
  void ide; void terminale; void figura; void tabella;
  // ---------- schemi, tabelle di esempio e codice degli argomenti SQL avanzato, transazioni, NoSQL, sicurezza dei dati ----------
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
  const MONO = 'font-family="Consolas, monospace"';
  const freccia = (id, colore) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="${colore}"/></marker>`;
  const NULLO = '<i style="color:#8a96a3">NULL</i>';

  // il database di esempio usato in tutta la lezione di SQL avanzato
  const DB_CLASSI = tabella(['id_classe', 'sezione'], [['1', '5A'], ['2', '5B'], ['3', '5C']]);
  const DB_STUDENTI = tabella(['matricola', 'cognome', 'nome', 'id_classe'], [['101', 'Rossi', 'Anna', '1'], ['102', 'Bianchi', 'Luca', '1'], ['103', 'Verdi', 'Sara', '2'], ['104', 'Neri', 'Marco', '2'], ['105', 'Romano', 'Elisa', NULLO]]);
  const DB_MATERIE = tabella(['id_materia', 'nome'], [['1', 'Informatica'], ['2', 'Sistemi'], ['3', 'TPSIT']]);
  const DB_VOTI = tabella(['id_voto', 'matricola', 'id_materia', 'voto'], [['1', '101', '1', '8'], ['2', '101', '2', '7'], ['3', '102', '1', '5'], ['4', '102', '1', '6'], ['5', '103', '1', '9'], ['6', '103', '3', '8'], ['7', '104', '2', '4'], ['8', '104', '1', '6']]);

  const cerchi = (x, sx, dx, centro, titolo) => `<g transform="translate(${x} 0)">
      <circle cx="60" cy="58" r="40" fill="${sx ? '#9cc6e8' : '#fff'}" stroke="#1a5fb4" stroke-width="1.6"/>
      <circle cx="110" cy="58" r="40" fill="${dx ? '#9cc6e8' : '#fff'}" stroke="#1a5fb4" stroke-width="1.6"/>
      <path d="M85 26.8a40 40 0 0 1 0 62.4a40 40 0 0 1 0-62.4z" fill="${centro ? '#1a5fb4' : '#fff'}" opacity="${centro ? 0.75 : 1}" stroke="#1a5fb4" stroke-width="1.6"/>
      <circle cx="60" cy="58" r="40" fill="none" stroke="#1a5fb4" stroke-width="1.6"/><circle cx="110" cy="58" r="40" fill="none" stroke="#1a5fb4" stroke-width="1.6"/>
      <text x="44" y="62" font-size="12" text-anchor="middle">S</text><text x="126" y="62" font-size="12" text-anchor="middle">C</text>
      <text x="85" y="122" text-anchor="middle" font-weight="600" ${MONO} font-size="12.5">${titolo}</text></g>`;
  const JOIN_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 140" role="img" aria-label="Tipi di JOIN">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      ${cerchi(0, false, false, true, 'INNER JOIN')}${cerchi(170, true, false, true, 'LEFT JOIN')}${cerchi(340, false, true, true, 'RIGHT JOIN')}${cerchi(510, true, true, true, 'FULL OUTER JOIN')}
    </g></svg>`;

  const LOST_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 270" role="img" aria-label="Aggiornamento perso">
    <defs>${freccia('st-fr-lu', '#9aa7b5')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="40" y="10" width="170" height="30" rx="6" fill="#e3f0ff" stroke="#1a5fb4"/><text x="125" y="30" text-anchor="middle" font-weight="600">Transazione T1</text>
      <rect x="235" y="10" width="170" height="30" rx="6" fill="#f4f6f9" stroke="#7c8a99"/><text x="320" y="30" text-anchor="middle" font-weight="600">posti liberi</text>
      <rect x="430" y="10" width="170" height="30" rx="6" fill="#e8f5ee" stroke="#3f9b6b"/><text x="515" y="30" text-anchor="middle" font-weight="600">Transazione T2</text>
      <line x1="20" y1="50" x2="20" y2="250" stroke="#9aa7b5" stroke-width="1.6" marker-end="url(#st-fr-lu)"/><text x="12" y="150" font-size="11" fill="#5b6b7f" transform="rotate(-90 12 150)" text-anchor="middle">tempo</text>
      ${[[70, 'legge: 1', '1', ''], [110, '', '1', 'legge: 1'], [150, 'scrive: 0', '0', ''], [190, '', '0', 'scrive: 0'], [230, 'COMMIT', '0', 'COMMIT']].map(([y, a, v, b]) => `
        ${a ? `<text x="125" y="${y}" text-anchor="middle" ${MONO} font-size="12.5">${a}</text>` : ''}
        <text x="320" y="${y}" text-anchor="middle" ${MONO} font-size="12.5" font-weight="600">${v}</text>
        ${b ? `<text x="515" y="${y}" text-anchor="middle" ${MONO} font-size="12.5">${b}</text>` : ''}`).join('')}
      <text x="320" y="262" text-anchor="middle" font-size="12" fill="#a33a30">Un solo posto, due prenotazioni confermate: l'aggiornamento di T1 è perso.</text>
    </g></svg>`;

  const SCALA_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 230" role="img" aria-label="Scalabilità verticale e orizzontale">
    <defs>${freccia('st-fr-sc', '#5b6b7f')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <text x="160" y="20" text-anchor="middle" font-weight="600">Scalabilità verticale</text>
      <text x="500" y="20" text-anchor="middle" font-weight="600">Scalabilità orizzontale (sharding)</text>
      <rect x="40" y="110" width="60" height="70" rx="5" fill="#eef2f7" stroke="#7c8a99"/><text x="70" y="200" text-anchor="middle" font-size="12">server</text>
      <line x1="110" y1="140" x2="170" y2="140" stroke="#5b6b7f" stroke-width="1.6" marker-end="url(#st-fr-sc)"/>
      <rect x="185" y="45" width="90" height="135" rx="5" fill="#e3f0ff" stroke="#1a5fb4"/><text x="230" y="200" text-anchor="middle" font-size="12">server più potente</text>
      <line x1="340" y1="35" x2="340" y2="215" stroke="#c8d1dc" stroke-dasharray="4 4"/>
      <rect x="440" y="40" width="120" height="30" rx="6" fill="#1a5fb4"/><text x="500" y="60" text-anchor="middle" fill="#fff" font-size="12">router delle richieste</text>
      ${[['A–F', 380], ['G–O', 465], ['P–Z', 550]].map(([t, x], i) => `<line x1="500" y1="70" x2="${x + 35}" y2="110" stroke="#5b6b7f" stroke-width="1.4"/>
        <rect x="${x}" y="110" width="70" height="70" rx="5" fill="#e8f5ee" stroke="#3f9b6b"/><text x="${x + 35}" y="140" text-anchor="middle" font-weight="600" font-size="12">nodo ${i + 1}</text>
        <text x="${x + 35}" y="160" text-anchor="middle" ${MONO} font-size="12">${t}</text>`).join('')}
      <text x="500" y="205" text-anchor="middle" font-size="12">i documenti sono divisi tra i nodi in base alla chiave</text>
    </g></svg>`;

  const INJ_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 210" role="img" aria-label="Query concatenata e query preparata">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <text x="10" y="22" font-weight="600" fill="#a33a30">Query concatenata: il dato diventa codice</text>
      <rect x="10" y="32" width="660" height="44" rx="6" fill="#fdeaea" stroke="#c5483c"/>
      <text x="20" y="59" ${MONO} font-size="12.5">SELECT * FROM utenti WHERE user = '<tspan fill="#c5483c" font-weight="700">' OR '1'='1' -- </tspan>' AND pwd = ''</text>
      <text x="10" y="112" font-weight="600" fill="#2f7d55">Query preparata: il dato resta un dato</text>
      <rect x="10" y="122" width="330" height="44" rx="6" fill="#e8f5ee" stroke="#3f9b6b"/>
      <text x="20" y="149" ${MONO} font-size="12.5">SELECT * FROM utenti WHERE user = ?</text>
      <text x="355" y="149" font-size="18" fill="#5b6b7f">+</text>
      <rect x="380" y="122" width="290" height="44" rx="6" fill="#fff4e0" stroke="#e0a33a"/>
      <text x="390" y="149" ${MONO} font-size="12.5">parametro 1: "' OR '1'='1' -- "</text>
      <text x="340" y="196" text-anchor="middle" font-size="12" fill="#5b6b7f">Il DBMS compila prima il comando, poi inserisce il valore: nessuna riga ha quello strano nome utente.</text>
    </g></svg>`;

  const P_BONIFICO = String.raw`
<?php
$db = new PDO('mysql:host=localhost;dbname=banca;charset=utf8mb4', 'app', 'segreta', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,   // ogni errore diventa un'eccezione
]);
$importo = 100;
try {
    $db->beginTransaction();
    $q = $db->prepare('SELECT saldo FROM conti WHERE id = ? FOR UPDATE');   // lock sulla riga
    $q->execute([1]);
    if ($q->fetchColumn() < $importo) {
        throw new RuntimeException('Saldo insufficiente');
    }
    $db->prepare('UPDATE conti SET saldo = saldo - ? WHERE id = ?')->execute([$importo, 1]);
    $db->prepare('UPDATE conti SET saldo = saldo + ? WHERE id = ?')->execute([$importo, 2]);
    $db->commit();
    echo 'Bonifico eseguito';
} catch (Exception $e) {
    $db->rollBack();                               // annulla tutto: atomicità
    echo 'Bonifico annullato: ' . $e->getMessage();
}`;
  const P_INJ = String.raw`
<?php
// VULNERABILE: il testo scritto dall'utente entra nella query
$sql = "SELECT id, nome FROM utenti WHERE email = '" . $_POST['email'] . "'";
$righe = $db->query($sql);

// CORRETTO: query preparata con un segnaposto con nome
$q = $db->prepare('SELECT id, nome, hash_password FROM utenti WHERE email = :email');
$q->execute([':email' => $_POST['email'] ?? '']);
$utente = $q->fetch(PDO::FETCH_ASSOC);

if ($utente && password_verify($_POST['password'] ?? '', $utente['hash_password'])) {
    echo 'Benvenuto, ' . htmlspecialchars($utente['nome']);
}

// alla registrazione la password si salva solo come hash (con salt incluso)
$hash = password_hash($_POST['password'], PASSWORD_DEFAULT);`;
  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.informatica = {
    id: 'informatica', nome: 'Informatica',
    argomenti: [
      { id: 'htmlcss', titolo: 'HTML e CSS: struttura della pagina e box model', minuti: 11, giorni: -30, corpo: () => `
        <p class="st-intro">Una pagina web è fatta di <b>contenuto</b> (HTML), <b>presentazione</b> (CSS) e <b>comportamento</b> (JavaScript). In questa lezione costruiamo la struttura di una pagina con i tag semantici di HTML5 e impariamo come il browser calcola le dimensioni di ogni elemento.</p>
        <h2 id="st-s1">1. Lo scheletro di un documento HTML5</h2>
        <p>Ogni pagina inizia con il <code>&lt;!DOCTYPE html&gt;</code>. Nell'<code>&lt;head&gt;</code> vanno le informazioni sulla pagina (codifica, titolo, fogli di stile); nel <code>&lt;body&gt;</code> il contenuto visibile.</p>
        ${ide('index.html', 'html', H_PAGINA, 'Esempio 1 – Pagina con i tag semantici header, nav, main, article e footer.')}
        <h2 id="st-s2">2. Tag semantici</h2>
        <p>I tag semantici descrivono il <i>ruolo</i> del contenuto: <code>&lt;header&gt;</code> per l'intestazione, <code>&lt;nav&gt;</code> per i menu, <code>&lt;main&gt;</code> per il contenuto principale, <code>&lt;article&gt;</code> per un contenuto autonomo e <code>&lt;footer&gt;</code> per il piè di pagina. Aiutano i motori di ricerca e gli screen reader, e rendono il codice più leggibile di una serie di <code>&lt;div&gt;</code>.</p>
        <h2 id="st-s3">3. Collegare il foglio di stile</h2>
        ${ide('style.css', 'css', C_STILE, 'Esempio 2 – Foglio di stile con Flexbox per l\'intestazione.')}
        <div class="st-browser"><div class="st-browser-barra"><span class="st-pallini"><i></i><i></i><i></i></span><span class="st-url">localhost:5500/index.html</span></div>
          <div class="st-anteprima"><div class="an-head"><b>Laboratorio 5B</b><span><u>Home</u><u>Orario</u><u>Progetti</u></span></div>
          <div class="an-scheda"><b>Progetto: stazione meteo</b><p>Arduino, sensore DHT11 e pagina web con i dati.</p></div><div class="an-foot">ITIS - Anno scolastico ${annoScolastico}</div></div></div>
        <p class="st-didascalia">Figura 1 – Il risultato nel browser (estensione Live Server).</p>
        <h2 id="st-s4">4. Il box model</h2>
        <p>Il browser tratta ogni elemento come un rettangolo formato da quattro aree: <b>content</b>, <b>padding</b>, <b>border</b> e <b>margin</b>. Con il valore predefinito <code>box-sizing: content-box</code> la larghezza impostata vale solo per il contenuto; con <code>border-box</code> comprende anche padding e bordo.</p>
        ${figura(BOX_SVG, 'Figura 2 – Le aree del box model.')}
        ${nota('info', 'Esempio di calcolo', 'Con <code>width: 320px</code>, <code>padding: 16px</code> e <code>border: 2px</code>: in <code>content-box</code> la scheda occupa 320 + 32 + 4 = <b>356px</b>; in <code>border-box</code> occupa esattamente <b>320px</b> e il contenuto si riduce a 284px.')}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Aggiungi alla pagina una sezione con tre schede affiancate usando Flexbox.</li>
          <li>Calcola lo spazio occupato da un <code>div</code> con <code>width: 200px; padding: 10px 20px; border: 3px solid; margin: 15px</code>.</li>
          <li>Valida la pagina con il validatore del W3C e correggi gli eventuali errori.</li>
        </ol>` },
      { id: 'database', titolo: 'Database relazionali', minuti: 10, giorni: -25, corpo: () => `
        <p class="st-intro">Un <b>database relazionale</b> organizza i dati in <b>tabelle</b> (relazioni) collegate tra loro. Il <b>DBMS</b> (MySQL, PostgreSQL, SQLite…) li gestisce garantendo integrità, sicurezza e accesso concorrente.</p>
        <h2 id="st-s1">1. Termini</h2>
        ${tabella(['Termine', 'Significato'], [['Tabella (relazione)', 'insieme di righe con la stessa struttura'], ['Riga (tupla, record)', 'un elemento, per esempio uno studente'], ['Colonna (attributo, campo)', 'una proprietà, con il suo dominio (tipo)'], ['Chiave primaria', 'attributo (o insieme) che identifica ogni riga in modo univoco'], ['Chiave esterna', 'attributo che fa riferimento alla chiave primaria di un\'altra tabella']])}
        <h2 id="st-s2">2. Integrità</h2>
        <ul><li><b>Integrità di entità</b>: la chiave primaria non può essere NULL né ripetuta.</li><li><b>Integrità referenziale</b>: una chiave esterna deve corrispondere a una riga esistente (o essere NULL).</li><li><b>Vincoli di dominio</b>: tipi di dato, CHECK, NOT NULL.</li></ul>
        <h2 id="st-s3">3. Transazioni e proprietà ACID</h2>
        <p>Una <b>transazione</b> è un gruppo di operazioni che vanno eseguite tutte o nessuna: <b>A</b>tomicità, <b>C</b>onsistenza, <b>I</b>solamento, <b>D</b>urabilità.</p>
        ${nota('info', 'Esempio', 'Un bonifico toglie da un conto e aggiunge a un altro: se si interrompe a metà, il DBMS annulla tutto (ROLLBACK).')}` },
      { id: 'sql', titolo: 'Il linguaggio SQL', minuti: 14, giorni: -20, corpo: () => `
        <p class="st-intro"><b>SQL</b> è il linguaggio standard dei database relazionali. Si divide in <b>DDL</b> (definire le strutture), <b>DML</b> (manipolare i dati), <b>DCL</b> (permessi) e <b>DQL</b> (interrogazioni, SELECT).</p>
        <h2 id="st-s1">1. Creare le tabelle</h2>
        ${ide('scuola.sql', 'sql', `CREATE TABLE classi (
  id_classe INT PRIMARY KEY,
  sezione   VARCHAR(5) NOT NULL
);
CREATE TABLE studenti (
  matricola INT PRIMARY KEY,
  cognome   VARCHAR(40) NOT NULL,
  nome      VARCHAR(40) NOT NULL,
  id_classe INT,
  FOREIGN KEY (id_classe) REFERENCES classi(id_classe)
);`, 'DDL: due tabelle collegate da una chiave esterna.')}
        <h2 id="st-s2">2. Interrogazioni</h2>
        ${ide('query.sql', 'sql', `-- studenti della 5B in ordine alfabetico
SELECT s.cognome, s.nome
FROM studenti s JOIN classi c ON s.id_classe = c.id_classe
WHERE c.sezione = '5B'
ORDER BY s.cognome;

-- quanti studenti per classe, solo le classi con più di 20 studenti
SELECT c.sezione, COUNT(*) AS numero
FROM studenti s JOIN classi c ON s.id_classe = c.id_classe
GROUP BY c.sezione
HAVING COUNT(*) > 20;`, 'JOIN, WHERE, GROUP BY e HAVING.')}
        ${tabella(['Clausola', 'A cosa serve'], [['WHERE', 'filtra le righe prima del raggruppamento'], ['GROUP BY', 'raggruppa le righe con lo stesso valore'], ['HAVING', 'filtra i gruppi (dopo le funzioni di aggregazione)'], ['ORDER BY', 'ordina il risultato (ASC o DESC)'], ['COUNT, SUM, AVG, MIN, MAX', 'funzioni di aggregazione']])}
        <h2 id="st-s3">3. Modificare i dati</h2>
        ${ide('dml.sql', 'sql', `INSERT INTO studenti (matricola, cognome, nome, id_classe) VALUES (42, 'Rossi', 'Anna', 3);
UPDATE studenti SET id_classe = 4 WHERE matricola = 42;
DELETE FROM studenti WHERE matricola = 42;`, 'DML: INSERT, UPDATE, DELETE.')}
        ${nota('avviso', 'Attenzione', 'UPDATE e DELETE senza WHERE modificano o cancellano tutte le righe della tabella.')}` },
      { id: 'normalizzazione', titolo: 'La normalizzazione', minuti: 12, giorni: -15, corpo: () => `
        <p class="st-intro">La <b>normalizzazione</b> elimina le ridondanze da una tabella, per evitare le <b>anomalie</b> di inserimento, modifica e cancellazione. Si procede per <b>forme normali</b>.</p>
        <h2 id="st-s1">1. Le forme normali</h2>
        ${tabella(['Forma', 'Condizione'], [['1NF', 'ogni attributo contiene un solo valore atomico (niente elenchi o gruppi ripetuti) e c\'è una chiave primaria'], ['2NF', '1NF e ogni attributo non chiave dipende da tutta la chiave, non da una sua parte'], ['3NF', '2NF e nessun attributo non chiave dipende da un altro attributo non chiave (niente dipendenze transitive)']])}
        <h2 id="st-s2">2. Un esempio</h2>
        <p>Tabella <code>Esami(matricola, codCorso, nomeStudente, nomeCorso, voto)</code> con chiave (matricola, codCorso). <code>nomeStudente</code> dipende solo da <code>matricola</code> e <code>nomeCorso</code> solo da <code>codCorso</code>: è in 1NF ma non in 2NF.</p>
        <p>Si scompone in: <code>Studenti(matricola, nomeStudente)</code>, <code>Corsi(codCorso, nomeCorso)</code>, <code>Esami(matricola, codCorso, voto)</code>.</p>
        <h2 id="st-s3">3. Dipendenza transitiva</h2>
        <p>In <code>Studenti(matricola, cap, citta)</code> la città dipende dal CAP, che dipende dalla matricola: è una dipendenza transitiva. Per la 3NF si sposta <code>(cap, citta)</code> in una tabella a parte.</p>
        ${nota('info', 'Anomalie', 'Se il nome di un corso è ripetuto su mille righe, cambiarlo richiede mille modifiche (anomalia di aggiornamento): è il segno che la tabella va normalizzata.')}` },
      { id: 'er', titolo: 'Progettazione: il modello E/R', minuti: 12, giorni: -10, corpo: () => `
        <p class="st-intro">La progettazione di un database parte dal modello concettuale <b>Entità/Relazioni</b> (E/R), passa allo <b>schema logico</b> (le tabelle) e arriva allo schema fisico nel DBMS.</p>
        <h2 id="st-s1">1. Elementi del modello E/R</h2>
        ${tabella(['Elemento', 'Rappresentazione', 'Esempio'], [['Entità', 'rettangolo', 'Studente, Corso'], ['Attributo', 'ovale (o pallino)', 'nome, data di nascita'], ['Identificatore', 'attributo sottolineato', 'matricola'], ['Associazione', 'rombo', 'Studente <i>frequenta</i> Corso']])}
        <h2 id="st-s2">2. Cardinalità</h2>
        <ul><li><b>1:1</b> — una persona ha una sola carta d'identità.</li><li><b>1:N</b> — una classe ha molti studenti, ogni studente una classe.</li><li><b>N:M</b> — uno studente segue molti corsi e ogni corso ha molti studenti.</li></ul>
        <h2 id="st-s3">3. Dal modello E/R alle tabelle</h2>
        <ul><li>Ogni entità diventa una tabella, l'identificatore diventa chiave primaria.</li><li>Associazione <b>1:N</b>: la chiave del lato 1 diventa chiave esterna nella tabella del lato N.</li><li>Associazione <b>N:M</b>: si crea una tabella nuova con le due chiavi esterne (e gli attributi dell'associazione).</li></ul>
        ${nota('info', 'Esempio', 'Studente N:M Corso → Iscrizioni(matricola, codCorso, anno), con chiave primaria (matricola, codCorso).')}` },
      { id: 'php', titolo: 'Programmazione lato server con PHP', minuti: 13, giorni: -5, corpo: () => `
        <p class="st-intro">I linguaggi <b>lato server</b> (PHP, Node.js, Python, Java) generano le pagine sul server, leggono i dati inviati dai moduli e dialogano con il database. Il browser riceve solo il risultato, di solito HTML o JSON.</p>
        <h2 id="st-s1">1. Leggere un modulo</h2>
        ${ide('saluto.php', 'php', `<?php
$nome = trim($_POST['nome'] ?? '');
if ($nome === '') { http_response_code(400); exit('Nome mancante'); }
echo '<p>Ciao, ' . htmlspecialchars($nome) . '!</p>';`, 'I dati del modulo arrivano in $_POST (o $_GET); htmlspecialchars evita di inserire codice HTML nella pagina.')}
        <h2 id="st-s2">2. Interrogare il database con PDO</h2>
        ${ide('studenti.php', 'php', `<?php
$db = new PDO('mysql:host=localhost;dbname=scuola;charset=utf8mb4', 'utente', 'password');
$q = $db->prepare('SELECT cognome, nome FROM studenti WHERE id_classe = ?');
$q->execute([$_GET['classe'] ?? 0]);
foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $s) {
    echo htmlspecialchars($s['cognome'] . ' ' . $s['nome']) . '<br>';
}`, 'Query preparata: i parametri non vengono mai incollati nel testo della query.')}
        <h2 id="st-s3">3. Sessioni</h2>
        <p>Con <code>session_start()</code> PHP associa al browser un identificativo (in un cookie) e conserva i dati in <code>$_SESSION</code>: è il modo classico per gestire il login.</p>
        ${nota('avviso', 'SQL injection', 'Mai costruire una query concatenando i dati dell\'utente: si usano sempre le query preparate (prepare/execute).')}` },
      { id: 'sqlavanzato', titolo: 'SQL avanzato: JOIN, raggruppamenti e subquery', minuti: 18, giorni: -4, corpo: () => `
        <p class="st-intro">Le interrogazioni utili davvero combinano più tabelle, calcolano totali e medie e usano il risultato di una query dentro un'altra. In questa lezione lavoriamo su un piccolo database di esempio e, per ogni query, guardiamo il <b>risultato</b> riga per riga: è il modo migliore per capire che cosa fa ogni clausola.</p>
        <h2 id="st-s1">1. Il database di esempio</h2>
        <p>Quattro tabelle: <code>classi</code>, <code>studenti</code> (con la chiave esterna <code>id_classe</code>), <code>materie</code> e <code>voti</code> (con le chiavi esterne <code>matricola</code> e <code>id_materia</code>). Notate due casi particolari, scelti apposta: la studentessa <b>Romano</b> non ha ancora una classe (<code>id_classe</code> è NULL) e non ha voti; la classe <b>5C</b> non ha ancora studenti.</p>
        <div class="st-griglia-db">
          <div><p class="st-etichetta-db">classi</p>${DB_CLASSI}</div>
          <div><p class="st-etichetta-db">materie</p>${DB_MATERIE}</div>
          <div><p class="st-etichetta-db">studenti</p>${DB_STUDENTI}</div>
          <div><p class="st-etichetta-db">voti</p>${DB_VOTI}</div>
        </div>
        <h2 id="st-s2">2. I tipi di JOIN</h2>
        <p>Un <b>JOIN</b> affianca le righe di due tabelle secondo una condizione, di solito l'uguaglianza tra chiave esterna e chiave primaria. I tipi di JOIN differiscono per quello che fanno delle righe <b>senza corrispondenza</b>.</p>
        ${figura(JOIN_SVG, "Figura 1 – S = studenti, C = classi. La parte colorata è quella che compare nel risultato.")}
        ${ide("join.sql", "sql", `-- INNER JOIN: solo gli studenti che hanno una classe
SELECT s.cognome, c.sezione
FROM studenti s
INNER JOIN classi c ON s.id_classe = c.id_classe;

-- LEFT JOIN: tutti gli studenti, anche quelli senza classe
SELECT s.cognome, c.sezione
FROM studenti s
LEFT JOIN classi c ON s.id_classe = c.id_classe;

-- RIGHT JOIN: tutte le classi, anche quelle senza studenti
SELECT s.cognome, c.sezione
FROM studenti s
RIGHT JOIN classi c ON s.id_classe = c.id_classe;`, "Esempio 1 – Le tre forme più usate. La parola INNER si può omettere.")}
        ${tabella(["INNER JOIN", "LEFT JOIN", "RIGHT JOIN"], [
          ["Bianchi · 5A", "Bianchi · 5A", "Bianchi · 5A"],
          ["Neri · 5B", "Neri · 5B", "Rossi · 5A"],
          ["Rossi · 5A", "Romano · " + NULLO, "Neri · 5B"],
          ["Verdi · 5B", "Rossi · 5A", "Verdi · 5B"],
          ["", "Verdi · 5B", NULLO + " · 5C"],
        ])}
        <p class="st-didascalia">I risultati (cognome · sezione): l'INNER JOIN dà 4 righe, il LEFT JOIN 5 (c'è Romano con sezione NULL), il RIGHT JOIN 5 (c'è la 5C senza studenti).</p>
        <p>Il <b>FULL OUTER JOIN</b> tiene le righe senza corrispondenza di <b>entrambe</b> le tabelle. MySQL non lo supporta: si ottiene con l'unione di un LEFT e di un RIGHT JOIN (<code>UNION</code> elimina i doppioni). Il <b>CROSS JOIN</b> produce il prodotto cartesiano, ogni riga con ogni riga (3 classi × 5 studenti = 15 righe): serve raramente, e spesso è il risultato di una condizione di join dimenticata. Il <b>self join</b> unisce una tabella con se stessa, usando due alias.</p>
        ${ide("join2.sql", "sql", `-- FULL OUTER JOIN in MySQL
SELECT s.cognome, c.sezione FROM studenti s LEFT JOIN classi c ON s.id_classe = c.id_classe
UNION
SELECT s.cognome, c.sezione FROM studenti s RIGHT JOIN classi c ON s.id_classe = c.id_classe;

-- self join: le coppie di compagni della stessa classe
SELECT a.cognome AS studente1, b.cognome AS studente2
FROM studenti a
JOIN studenti b ON a.id_classe = b.id_classe AND a.matricola < b.matricola;

-- tre tabelle: i voti di Informatica con il nome dello studente
SELECT s.cognome, m.nome AS materia, v.voto
FROM voti v
JOIN studenti s ON v.matricola = s.matricola
JOIN materie m  ON v.id_materia = m.id_materia
WHERE m.nome = 'Informatica'
ORDER BY v.voto DESC;`, "Esempio 2 – FULL OUTER JOIN simulato, self join (risultato: Rossi–Bianchi e Verdi–Neri) e JOIN su tre tabelle.")}
        <h2 id="st-s3">3. Funzioni di aggregazione e GROUP BY</h2>
        <p>Le funzioni <code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code> e <code>MAX</code> riassumono più righe in un solo valore. Con <b>GROUP BY</b> le righe vengono divise in gruppi con lo stesso valore e la funzione si calcola per ogni gruppo.</p>
        ${ide("gruppi.sql", "sql", `SELECT m.nome, COUNT(*) AS n_voti, AVG(v.voto) AS media,
       MIN(v.voto) AS minimo, MAX(v.voto) AS massimo
FROM voti v
JOIN materie m ON v.id_materia = m.id_materia
GROUP BY m.nome;`, "Esempio 3 – Statistiche dei voti per materia.")}
        ${tabella(["nome", "n_voti", "media", "minimo", "massimo"], [["Informatica", "5", "6.8", "5", "9"], ["Sistemi", "2", "5.5", "4", "7"], ["TPSIT", "1", "8.0", "8", "8"]])}
        ${nota("avviso", "La regola d'oro del GROUP BY", "Nella SELECT di una query raggruppata possono comparire solo le colonne del GROUP BY e le funzioni di aggregazione. Scrivere <code>SELECT cognome, AVG(voto) … GROUP BY id_classe</code> è un errore: quale cognome dovrebbe mostrare, per un gruppo che ne contiene tanti?")}
        <h2 id="st-s4">4. WHERE e HAVING</h2>
        <p><b>WHERE</b> filtra le <b>righe</b> prima del raggruppamento; <b>HAVING</b> filtra i <b>gruppi</b> dopo, e quindi può usare le funzioni di aggregazione. L'ordine logico di esecuzione di una SELECT è: <code>FROM</code> e <code>JOIN</code> → <code>WHERE</code> → <code>GROUP BY</code> → <code>HAVING</code> → <code>SELECT</code> → <code>ORDER BY</code>.</p>
        ${ide("having.sql", "sql", `-- studenti con la media insufficiente
SELECT s.cognome, AVG(v.voto) AS media
FROM studenti s
JOIN voti v ON v.matricola = s.matricola
GROUP BY s.matricola, s.cognome
HAVING AVG(v.voto) < 6;

-- quanti studenti ha ogni classe, comprese le classi vuote
SELECT c.sezione, COUNT(s.matricola) AS studenti
FROM classi c
LEFT JOIN studenti s ON s.id_classe = c.id_classe
GROUP BY c.sezione;`, "Esempio 4 – Risultati: Bianchi 5.5 e Neri 5.0; 5A 2, 5B 2, 5C 0.")}
        ${nota("info", "COUNT(*) o COUNT(colonna)?", "<code>COUNT(*)</code> conta le righe, <code>COUNT(colonna)</code> conta solo i valori non NULL. Nella seconda query di sopra, con <code>COUNT(*)</code> la 5C risulterebbe avere 1 studente, perché il LEFT JOIN produce per lei una riga con lo studente NULL.")}
        <h2 id="st-s5">5. Le subquery</h2>
        <p>Una <b>subquery</b> è una SELECT scritta tra parentesi dentro un'altra istruzione. Può restituire un solo valore (si confronta con <code>=</code>, <code>&lt;</code>, <code>&gt;</code>), una colonna di valori (si usa con <code>IN</code>, <code>ANY</code>, <code>ALL</code>) o semplicemente dire se esistono righe (<code>EXISTS</code>).</p>
        ${ide("subquery.sql", "sql", `-- 1. studenti con la media sopra la media generale (6.625)
SELECT s.cognome, AVG(v.voto) AS media
FROM studenti s JOIN voti v ON v.matricola = s.matricola
GROUP BY s.matricola, s.cognome
HAVING AVG(v.voto) > (SELECT AVG(voto) FROM voti);

-- 2. studenti che hanno almeno un'insufficienza
SELECT cognome FROM studenti
WHERE matricola IN (SELECT matricola FROM voti WHERE voto < 6);

-- 3. studenti senza nessun voto (subquery correlata)
SELECT cognome, nome FROM studenti s
WHERE NOT EXISTS (SELECT * FROM voti v WHERE v.matricola = s.matricola);

-- 4. chi ha preso il voto più alto in Informatica
SELECT s.cognome, v.voto
FROM voti v JOIN studenti s ON s.matricola = v.matricola
WHERE v.id_materia = 1
  AND v.voto = (SELECT MAX(voto) FROM voti WHERE id_materia = 1);`, "Esempio 5 – Risultati: 1) Rossi 7.5, Verdi 8.5; 2) Bianchi, Neri; 3) Romano Elisa; 4) Verdi 9.")}
        <p>Nella query 3 la subquery è <b>correlata</b>: usa <code>s.matricola</code> della query esterna, quindi viene valutata per ogni studente. Molte subquery si possono riscrivere come JOIN (la 3 equivale a un LEFT JOIN con <code>WHERE v.id_voto IS NULL</code>); scegliete la forma più leggibile.</p>
        ${nota("avviso", "NOT IN e i valori NULL", "Se la subquery di un <code>NOT IN</code> restituisce anche un solo NULL, la condizione non è mai vera e la query non restituisce nulla. Con colonne che possono essere NULL è più sicuro <code>NOT EXISTS</code>.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Scrivi la query che mostra, per ogni classe, la media di tutti i voti dei suoi studenti, ordinata dalla più alta. Che cosa succede alla 5C?</li>
          <li>Trova le materie in cui nessuno studente della 5B ha un voto.</li>
          <li>Mostra gli studenti che hanno più di un voto in Informatica, con il numero di voti.</li>
          <li>Riscrivi la query 2 delle subquery usando un JOIN e <code>DISTINCT</code>.</li>
        </ol>` },
      { id: 'transazioni', titolo: 'Transazioni, proprietà ACID e concorrenza', minuti: 14, giorni: -3, corpo: () => `
        <p class="st-intro">Un DBMS serve molti utenti contemporaneamente: centinaia di genitori che consultano il registro, decine di docenti che inseriscono voti. Le <b>transazioni</b> garantiscono che ogni operazione complessa venga eseguita per intero o per niente, e che le operazioni contemporanee non si disturbino a vicenda.</p>
        <h2 id="st-s1">1. Che cos'è una transazione</h2>
        <p>Una <b>transazione</b> è una sequenza di operazioni che il DBMS tratta come un'unità indivisibile. Si apre con <code>START TRANSACTION</code> (o <code>BEGIN</code>) e si chiude con <code>COMMIT</code>, che rende definitive le modifiche, oppure con <code>ROLLBACK</code>, che le annulla tutte.</p>
        ${ide("bonifico.sql", "sql", `START TRANSACTION;
UPDATE conti SET saldo = saldo - 100 WHERE id = 1;
UPDATE conti SET saldo = saldo + 100 WHERE id = 2;
COMMIT;      -- oppure ROLLBACK; per annullare entrambe le modifiche`, "Esempio 1 – Il bonifico: non deve mai succedere che i soldi escano da un conto senza entrare nell'altro.")}
        <p>In MySQL ogni istruzione isolata è già una piccola transazione (modalità <i>autocommit</i>). Le transazioni sono gestite dal motore <b>InnoDB</b>, quello predefinito. Con <code>SAVEPOINT nome</code> e <code>ROLLBACK TO nome</code> si può annullare solo una parte della transazione.</p>
        <h2 id="st-s2">2. Le proprietà ACID</h2>
        ${tabella(["Proprietà", "Significato", "Nel bonifico"], [
          ["<b>A</b>tomicità", "tutte le operazioni o nessuna", "se il server si spegne tra i due UPDATE, al riavvio il primo viene annullato"],
          ["<b>C</b>onsistenza", "la transazione porta il database da uno stato valido a un altro, rispettando i vincoli", "un vincolo <code>CHECK (saldo &gt;= 0)</code> fa fallire il bonifico scoperto"],
          ["<b>I</b>solamento", "le transazioni contemporanee non vedono i risultati intermedi delle altre", "chi legge i saldi a metà bonifico non vede 100 € spariti"],
          ["<b>D</b>urabilità", "dopo il COMMIT le modifiche sopravvivono anche ai guasti", "il bonifico confermato resta anche dopo un blackout"],
        ])}
        <p>Per garantire atomicità e durabilità il DBMS scrive ogni modifica in un <b>log</b> (registro delle transazioni) prima di applicarla ai dati: dopo un guasto, rilegge il log, rifà le transazioni confermate e disfa quelle rimaste a metà.</p>
        <h2 id="st-s3">3. I problemi della concorrenza</h2>
        <p>Se due transazioni lavorano sugli stessi dati senza controllo, possono nascere anomalie:</p>
        ${tabella(["Anomalia", "Che cosa succede"], [
          ["Aggiornamento perso (lost update)", "due transazioni leggono lo stesso valore e lo riscrivono: una modifica sovrascrive l'altra"],
          ["Lettura sporca (dirty read)", "si legge un dato scritto da una transazione che poi fa ROLLBACK"],
          ["Lettura non ripetibile", "rileggendo la stessa riga nella stessa transazione si trova un valore diverso"],
          ["Righe fantasma (phantom)", "rieseguendo la stessa query compaiono righe nuove inserite da altri"],
        ])}
        ${figura(LOST_SVG, "Figura 1 – Aggiornamento perso: due prenotazioni contemporanee per l'ultimo posto della gita.")}
        <h2 id="st-s4">4. I lock</h2>
        <p>Per evitare le anomalie il DBMS usa i <b>lock</b> (blocchi) sui dati:</p>
        <ul><li><b>lock condiviso</b> (in lettura, S): più transazioni possono leggere lo stesso dato insieme;</li>
          <li><b>lock esclusivo</b> (in scrittura, X): una sola transazione può modificare il dato, e nessun'altra può bloccarlo finché non termina.</li></ul>
        <p>Con il protocollo <b>2PL</b> (two-phase locking) una transazione prima acquisisce tutti i lock che le servono e poi li rilascia, in genere al COMMIT: così l'esecuzione contemporanea dà lo stesso risultato di un'esecuzione una dopo l'altra (<i>serializzabilità</i>). InnoDB blocca le singole <b>righe</b>, non l'intera tabella, e usa anche il <b>MVCC</b> (versioni multiple dei dati): chi legge vede una fotografia coerente senza bloccare chi scrive.</p>
        ${nota("avviso", "Deadlock", "T1 blocca la riga A e aspetta la riga B; T2 ha bloccato B e aspetta A: nessuna delle due può proseguire. È uno <b>stallo</b> (deadlock). Il DBMS lo rileva e annulla una delle due transazioni, che l'applicazione deve ripetere. Per ridurre il rischio si accede alle tabelle sempre nello stesso ordine e si tengono le transazioni brevi.")}
        <h2 id="st-s5">5. I livelli di isolamento</h2>
        <p>Isolare completamente le transazioni costa in prestazioni, quindi SQL prevede quattro livelli, impostabili con <code>SET TRANSACTION ISOLATION LEVEL …</code>:</p>
        ${tabella(["Livello", "Letture sporche", "Letture non ripetibili", "Fantasmi"], [
          ["READ UNCOMMITTED", "possibili", "possibili", "possibili"],
          ["READ COMMITTED", "evitate", "possibili", "possibili"],
          ["REPEATABLE READ (predefinito in MySQL)", "evitate", "evitate", "possibili per lo standard (InnoDB li evita quasi sempre)"],
          ["SERIALIZABLE", "evitate", "evitate", "evitate"],
        ])}
        <h2 id="st-s6">6. Transazioni in PHP</h2>
        <p>Con PDO si usano <code>beginTransaction()</code>, <code>commit()</code> e <code>rollBack()</code>. Per evitare l'aggiornamento perso, la riga da controllare si legge con <code>SELECT … FOR UPDATE</code>, che la blocca in modo esclusivo fino alla fine della transazione.</p>
        ${ide("bonifico.php", "php", P_BONIFICO, "Esempio 2 – Bonifico con controllo del saldo: se qualcosa va storto, il catch annulla tutto.")}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Riscrivi l'esempio della gita (figura 1) con una transazione e <code>SELECT … FOR UPDATE</code>, e spiega perché ora il secondo studente riceve «posti esauriti».</li>
          <li>Descrivi uno scenario di deadlock tra due docenti che modificano i voti di due studenti in ordine inverso.</li>
          <li>Per ogni proprietà ACID, indica che cosa potrebbe andare storto nel registro elettronico se mancasse.</li>
        </ol>` },
      { id: 'nosql', titolo: 'Database NoSQL e big data', minuti: 13, giorni: -2, corpo: () => `
        <p class="st-intro">I database relazionali sono perfetti per dati ben strutturati e per le transazioni. Ma un social network con milioni di utenti, i dati di migliaia di sensori o il catalogo di un negozio online con prodotti tutti diversi pongono problemi nuovi: volumi enormi, strutture che cambiano, necessità di distribuire i dati su molti server. Per questi casi sono nati i database <b>NoSQL</b> («Not only SQL»).</p>
        <h2 id="st-s1">1. Perché NoSQL</h2>
        ${tabella(["", "Relazionale (SQL)", "NoSQL"], [
          ["Struttura dei dati", "tabelle con schema fisso", "documenti, coppie chiave-valore, colonne, grafi; schema flessibile"],
          ["Scalabilità", "soprattutto verticale (un server più potente)", "orizzontale (più server economici)"],
          ["Relazioni", "JOIN tra tabelle normalizzate", "dati spesso duplicati o annidati, pochi JOIN"],
          ["Consistenza", "ACID", "spesso BASE: consistenza «alla fine» (eventual consistency)"],
          ["Linguaggio", "SQL standard", "API e linguaggi diversi per ogni prodotto"],
        ])}
        ${figura(SCALA_SVG, "Figura 1 – Scalare in verticale ha un limite fisico e un costo alto; con lo sharding i dati si dividono tra più nodi.")}
        <p>Il <b>teorema CAP</b> afferma che un sistema distribuito, quando la rete si divide (<b>P</b>artition tolerance), deve scegliere tra <b>C</b>onsistenza (tutti vedono lo stesso dato) e <b>D</b>isponibilità (<i>Availability</i>: tutti ricevono una risposta). Molti database NoSQL scelgono la disponibilità e accettano che le copie siano allineate dopo qualche istante.</p>
        <h2 id="st-s2">2. Le famiglie di database NoSQL</h2>
        ${tabella(["Tipo", "Come organizza i dati", "Usi tipici", "Esempi"], [
          ["Documentale", "documenti JSON (o BSON) raggruppati in collezioni", "cataloghi, profili utente, contenuti", "MongoDB, CouchDB"],
          ["Chiave-valore", "una chiave unica associata a un valore qualsiasi", "cache, sessioni, carrelli, contatori", "Redis, DynamoDB"],
          ["A colonne", "righe con famiglie di colonne, anche diverse tra loro", "dati di sensori, log, serie temporali enormi", "Cassandra, HBase"],
          ["A grafo", "nodi e archi con proprietà", "reti sociali, raccomandazioni, percorsi", "Neo4j"],
        ])}
        <h2 id="st-s3">3. Un database documentale</h2>
        <p>In un database documentale ogni elemento è un <b>documento</b> autodescrittivo, in formato JSON. Documenti della stessa collezione possono avere campi diversi, e i dati collegati si possono <b>annidare</b> invece di distribuirli in più tabelle:</p>
        ${ide("studente.json", "js", `{
  "_id": 101,
  "cognome": "Rossi",
  "nome": "Anna",
  "classe": { "sezione": "5A", "indirizzo": "Informatica" },
  "voti": [
    { "materia": "Informatica", "voto": 8 },
    { "materia": "Sistemi", "voto": 7 }
  ],
  "certificazioni": ["Inglese B2", "Reti di calcolatori, livello base"]
}`, "Esempio 1 – Lo studente con la classe e i voti annidati: una sola lettura restituisce tutto, senza JOIN.")}
        ${ide("query.js", "js", `// tutti gli studenti della 5A
db.studenti.find({ "classe.sezione": "5A" })

// studenti con almeno un voto di Informatica maggiore o uguale a 8
db.studenti.find({ voti: { $elemMatch: { materia: "Informatica", voto: { $gte: 8 } } } })

// aggiungere un voto a un documento esistente
db.studenti.updateOne({ _id: 101 }, { $push: { voti: { materia: "TPSIT", voto: 9 } } })

// media dei voti per materia (pipeline di aggregazione)
db.studenti.aggregate([
  { $unwind: "$voti" },
  { $group: { _id: "$voti.materia", media: { $avg: "$voti.voto" } } }
])`, "Esempio 2 – Interrogazioni nel linguaggio di MongoDB: i filtri sono a loro volta documenti JSON.")}
        ${nota("info", "Annidare o collegare?", "Si <b>annidano</b> i dati che si leggono sempre insieme e che non crescono all'infinito (i voti di uno studente in un anno). Si usano <b>riferimenti</b> (un campo con l'_id di un altro documento) quando i dati sono condivisi da molti documenti o crescono senza limite. Duplicare dati velocizza le letture ma complica gli aggiornamenti: è il prezzo della denormalizzazione.")}
        <h2 id="st-s4">4. Un database chiave-valore</h2>
        <p>È il modello più semplice: si salva un valore sotto una chiave e lo si rilegge con la stessa chiave, in tempi brevissimi, perché i dati sono tenuti in memoria. Si usa come <b>cache</b> davanti a un database relazionale o per le <b>sessioni</b> di un sito.</p>
        ${terminale("redis-cli", `127.0.0.1:6379> SET sessione:a81f3c '{"utente":101,"ruolo":"studente"}' EX 1800
OK
127.0.0.1:6379> GET sessione:a81f3c
"{\\"utente\\":101,\\"ruolo\\":\\"studente\\"}"
127.0.0.1:6379> TTL sessione:a81f3c
(integer) 1795
127.0.0.1:6379> INCR visite:pagina:orario
(integer) 1532`, "La sessione scade da sola dopo 1800 secondi (EX); INCR incrementa un contatore in modo atomico.")}
        <h2 id="st-s5">5. Big data</h2>
        <p>Si parla di <b>big data</b> quando i dati sono così tanti, così veloci o così vari che gli strumenti tradizionali non bastano. Si descrivono con le <b>5 V</b>:</p>
        ${tabella(["V", "Significato", "Esempio"], [["Volume", "quantità enormi (terabyte, petabyte)", "le misure di tutti i contatori elettrici di una regione"], ["Velocità", "dati prodotti e da elaborare in tempo reale", "i passaggi ai caselli autostradali"], ["Varietà", "dati strutturati, semi-strutturati (JSON, log) e non strutturati (testi, immagini)", "post, foto e video di un social"], ["Veridicità", "affidabilità e qualità dei dati", "sensori guasti, dati duplicati"], ["Valore", "l'utilità che se ne ricava", "prevedere i guasti di un macchinario"]])}
        <p>Per elaborarli si divide il lavoro su molti computer: il modello <b>MapReduce</b> (la fase <i>map</i> elabora in parallelo pezzi di dati, la fase <i>reduce</i> combina i risultati parziali) e i framework come <b>Hadoop</b> e <b>Spark</b>. I dati grezzi si raccolgono in un <b>data lake</b>; quelli puliti e organizzati per le analisi in un <b>data warehouse</b>. Dall'analisi dei big data nascono le statistiche, i cruscotti per le decisioni e l'addestramento dei modelli di intelligenza artificiale.</p>
        ${nota("avviso", "SQL non è morto", "NoSQL non sostituisce i database relazionali: li affianca. Un negozio online può tenere ordini e pagamenti in un DBMS relazionale (servono le transazioni ACID), il catalogo in un database documentale e il carrello in un database chiave-valore. Si parla di <b>persistenza poliglotta</b>.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Trasforma in un documento JSON lo studente Verdi del database di esempio della lezione sul SQL avanzato, con i suoi voti annidati.</li>
          <li>Per ognuno di questi casi scegli il tipo di database e motiva: carrello di un e-commerce, rete di amicizie, registro dei pagamenti, letture di 5000 sensori al secondo.</li>
          <li>Spiega con un esempio che cosa significa «eventual consistency».</li>
        </ol>` },
      { id: 'gdpr', titolo: 'Sicurezza dei dati e GDPR', minuti: 15, giorni: -1, corpo: () => `
        <p class="st-intro">Un database contiene spesso le informazioni più delicate di un'organizzazione: dati anagrafici, voti, dati sanitari, pagamenti. Proteggerli è un dovere tecnico e un obbligo di legge. In questa lezione vediamo le difese sul piano del <b>codice</b> (SQL injection e query preparate), del <b>DBMS</b> (utenti e permessi) e delle <b>regole</b>, con il Regolamento europeo sulla protezione dei dati (<b>GDPR</b>).</p>
        <h2 id="st-s1">1. La SQL injection</h2>
        <p>Se un programma costruisce una query <b>concatenando</b> i dati scritti dall'utente, l'utente può scrivere pezzi di SQL che cambiano il significato della query: è la <b>SQL injection</b>, uno degli attacchi più antichi e ancora più diffusi.</p>
        ${figura(INJ_SVG, "Figura 1 – Con la concatenazione l'apostrofo chiude la stringa e il resto diventa SQL; con la query preparata il valore non viene mai interpretato.")}
        <p>Con l'input <code>' OR '1'='1' -- </code> la condizione diventa sempre vera e il resto della riga è trasformato in commento: la query restituisce tutti gli utenti. Con altri input un attaccante può leggere tabelle intere (<code>UNION SELECT …</code>), modificare o cancellare dati.</p>
        <h2 id="st-s2">2. Le query preparate in PHP</h2>
        <p>Una <b>query preparata</b> (prepared statement) si invia al DBMS in due momenti: prima il <b>testo del comando</b> con dei segnaposto (<code>?</code> oppure <code>:nome</code>), che il DBMS analizza e compila; poi i <b>valori</b>, che vengono trattati sempre e solo come dati.</p>
        ${ide("login.php", "php", P_INJ, "Esempio 1 – La versione vulnerabile e quella corretta con PDO; le password si salvano solo come hash con password_hash.")}
        ${nota("avviso", "Non basta «pulire» l'input", "Togliere gli apostrofi o usare funzioni di escape a mano è fragile: basta dimenticarne uno, o un caso particolare della codifica dei caratteri. La difesa giusta è la query preparata, sempre, per <b>ogni</b> valore che arriva da fuori (moduli, URL, cookie, intestazioni). In più, i messaggi di errore del database non vanno mai mostrati all'utente.")}
        <h2 id="st-s3">3. Utenti, permessi e viste</h2>
        <p>Il secondo livello di difesa è il DBMS stesso. Vale il <b>principio del privilegio minimo</b>: ogni utente, e ogni applicazione, ha solo i permessi che le servono. Così, anche se un'applicazione viene violata, il danno resta limitato. I permessi si gestiscono con le istruzioni <b>DCL</b>:</p>
        ${ide("permessi.sql", "sql", `-- l'applicazione del registro: legge e scrive i voti, ma non cancella tabelle
CREATE USER 'registro_app'@'localhost' IDENTIFIED BY 'Una-password-lunga-e-casuale!';
GRANT SELECT, INSERT, UPDATE ON scuola.voti TO 'registro_app'@'localhost';
GRANT SELECT ON scuola.studenti TO 'registro_app'@'localhost';

-- una vista che nasconde i dati personali non necessari
CREATE VIEW scuola.elenco_classi AS
  SELECT s.cognome, s.nome, c.sezione
  FROM scuola.studenti s JOIN scuola.classi c ON s.id_classe = c.id_classe;

-- la segreteria vede solo la vista, non codice fiscale e indirizzo
CREATE ROLE 'segreteria';
GRANT SELECT ON scuola.elenco_classi TO 'segreteria';
GRANT 'segreteria' TO 'mbianchi'@'%';

REVOKE UPDATE ON scuola.voti FROM 'registro_app'@'localhost';`, "Esempio 2 – GRANT assegna i permessi, REVOKE li toglie; ruoli e viste limitano che cosa vede ciascuno (sintassi MySQL 8).")}
        <p>Altre misure tecniche: <b>cifratura</b> dei dati in transito (connessioni TLS al database) e a riposo (dischi e backup cifrati), password solo come <b>hash</b>, <b>backup</b> regolari e provati, <b>log</b> degli accessi per scoprire usi anomali, aggiornamenti del DBMS.</p>
        <h2 id="st-s4">4. Il GDPR: definizioni</h2>
        <p>Il <b>GDPR</b> (Regolamento UE 2016/679, applicato dal 25 maggio 2018) protegge le persone fisiche nel trattamento dei loro dati personali. Vale per chiunque tratti dati di persone che si trovano nell'Unione europea, anche se l'azienda ha sede altrove.</p>
        ${tabella(["Termine", "Significato", "Esempio a scuola"], [
          ["Dato personale", "qualsiasi informazione che riguarda una persona identificata o identificabile", "nome, email, voti, foto, indirizzo IP"],
          ["Categorie particolari", "dati che rivelano salute, origine, religione, opinioni politiche, dati biometrici…: protezione rafforzata", "certificato medico, piano didattico personalizzato"],
          ["Interessato", "la persona a cui si riferiscono i dati", "lo studente (e i genitori, se minorenne)"],
          ["Titolare del trattamento", "chi decide perché e come trattare i dati", "la scuola, rappresentata dal dirigente"],
          ["Responsabile del trattamento", "chi tratta i dati per conto del titolare", "l'azienda che fornisce il registro elettronico"],
          ["DPO (Responsabile della protezione dei dati)", "esperto che vigila sul rispetto del regolamento; obbligatorio negli enti pubblici", "consulente nominato dalla scuola"],
        ])}
        <h2 id="st-s5">5. Principi, basi giuridiche e diritti</h2>
        <p>I dati devono essere trattati secondo questi <b>principi</b> (art. 5): liceità, correttezza e trasparenza; <b>limitazione della finalità</b> (si raccolgono per scopi precisi e dichiarati); <b>minimizzazione</b> (solo i dati necessari); esattezza; <b>limitazione della conservazione</b> (non oltre il tempo necessario); integrità e riservatezza (sicurezza); <b>responsabilizzazione</b> (<i>accountability</i>: il titolare deve saper dimostrare di rispettare le regole).</p>
        <p>Ogni trattamento deve avere una <b>base giuridica</b>: il consenso dell'interessato, un contratto, un obbligo di legge, un interesse vitale, un compito di interesse pubblico (il caso della scuola pubblica per la didattica) o un legittimo interesse del titolare. L'interessato ha diritto di <b>accesso</b> ai propri dati, di <b>rettifica</b>, di <b>cancellazione</b> («diritto all'oblio»), di limitazione, di <b>portabilità</b> (riceverli in un formato leggibile da una macchina) e di <b>opposizione</b>.</p>
        ${nota("info", "Privacy by design e by default", "La protezione dei dati va prevista fin dalla progettazione del software (<b>by design</b>): campi strettamente necessari, cifratura, pseudonimizzazione, cancellazione automatica dei dati scaduti. E le impostazioni predefinite devono essere le più protettive (<b>by default</b>): un profilo nasce privato, non pubblico. Per un progettista di database significa anche chiedersi, per ogni colonna, se serve davvero.")}
        <h2 id="st-s6">6. Violazioni e sanzioni</h2>
        <p>Una <b>violazione dei dati personali</b> (<i>data breach</i>) è un incidente che porta alla distruzione, perdita, modifica o diffusione non autorizzata di dati: un database rubato, un portatile perso con dati non cifrati, un'email inviata ai destinatari sbagliati. Il titolare deve <b>notificarla all'autorità di controllo</b> (in Italia il Garante per la protezione dei dati personali) <b>entro 72 ore</b> da quando ne è venuto a conoscenza e, se il rischio per le persone è elevato, avvisare anche gli interessati. Le sanzioni arrivano fino a 20 milioni di euro o al 4 per cento del fatturato mondiale annuo.</p>
        ${tabella(["Tecnica", "Che cosa fa", "I dati restano personali?"], [["Pseudonimizzazione", "sostituisce i dati identificativi con un codice; la tabella di corrispondenza è tenuta a parte", "sì: con la tabella si può risalire alla persona"], ["Anonimizzazione", "elimina in modo irreversibile ogni possibilità di identificare la persona", "no: il GDPR non si applica più"]])}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Trova la vulnerabilità in <code>$db-&gt;query("DELETE FROM voti WHERE id_voto = " . $_GET['id'])</code>, scrivi un input che cancella tutti i voti e correggi il codice.</li>
          <li>Scrivi le istruzioni GRANT per un utente che deve solo leggere i voti della propria classe attraverso una vista.</li>
          <li>Per il modulo di iscrizione a un corso pomeridiano, elenca i dati da chiedere applicando il principio di minimizzazione, e indica per quanto tempo conservarli.</li>
        </ol>` },
    ],
  };
})();
