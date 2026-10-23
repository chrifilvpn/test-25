// DISPENSE — TPSIT: gli argomenti, ognuno con la sua pagina (usa gli aiuti di boss-pagina.js: nota, ide, terminale, figura…).
(() => {
  const { nota, ide, terminale, figura, tabella, THREAD_SVG, J_RUNNABLE, J_CONTO, J_BUFFER } = window.BossAiuti;
  void ide; void terminale; void figura; void tabella;
  // ---------- schemi e codice degli argomenti IoT, JavaScript lato client, sicurezza web, gestione del progetto ----------
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
  const MONO = 'font-family="Consolas, monospace"';
  const freccia = (id, colore) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="${colore}"/></marker>`;

  const MQTT_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 280" role="img" aria-label="Modello publish/subscribe di MQTT">
    <defs>${freccia('st-fr-mq', '#44546a')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <text x="95" y="20" text-anchor="middle" font-weight="600" fill="#5b6b7f">PUBLISHER</text>
      <text x="585" y="20" text-anchor="middle" font-weight="600" fill="#5b6b7f">SUBSCRIBER</text>
      ${[['Termometro LAB4', 50], ['Termometro LAB1', 130], ['Sensore porta', 210]].map(([t, y]) => `<rect x="10" y="${y}" width="170" height="42" rx="8" fill="#e8f5ee" stroke="#3f9b6b"/><text x="95" y="${y + 26}" text-anchor="middle">${t}</text>`).join('')}
      <rect x="270" y="105" width="140" height="62" rx="10" fill="#1a5fb4"/>
      <text x="340" y="132" text-anchor="middle" fill="#fff" font-weight="600">Broker MQTT</text>
      <text x="340" y="152" text-anchor="middle" fill="#fff" font-size="11.5">porta 1883 / 8883</text>
      ${[['Dashboard web', 50], ['App sul telefono', 130], ['Condizionatore LAB4', 210]].map(([t, y]) => `<rect x="500" y="${y}" width="170" height="42" rx="8" fill="#fff4e0" stroke="#e0a33a"/><text x="585" y="${y + 26}" text-anchor="middle">${t}</text>`).join('')}
      <g stroke="#44546a" stroke-width="1.6" fill="none" marker-end="url(#st-fr-mq)">
        <path d="M180 71 C230 71 240 120 268 126"/><path d="M180 151 L268 140"/><path d="M180 231 C230 231 240 160 268 154"/>
        <path d="M410 126 C440 120 450 71 498 71"/><path d="M410 140 L498 151"/><path d="M410 154 C440 160 450 231 498 231"/></g>
      <g font-size="10.5" fill="#44546a" ${MONO}>
        <text x="190" y="62">scuola/lab4/temperatura</text>
        <text x="494" y="42" text-anchor="end">scuola/+/temperatura</text>
        <text x="190" y="252">scuola/ingresso/porta</text>
        <text x="494" y="268" text-anchor="end">scuola/lab4/#</text></g>
    </g></svg>`;

  const DOM_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 230" role="img" aria-label="Albero DOM di una pagina">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <g stroke="#9aa7b5" stroke-width="1.6">
        <line x1="320" y1="44" x2="180" y2="88"/><line x1="320" y1="44" x2="460" y2="88"/>
        <line x1="180" y1="112" x2="180" y2="150"/>
        <line x1="460" y1="112" x2="370" y2="150"/><line x1="460" y1="112" x2="460" y2="150"/><line x1="460" y1="112" x2="560" y2="150"/>
        <line x1="560" y1="174" x2="560" y2="198"/></g>
      ${[['document → html', 320, 20, 150, '#e3f0ff'], ['head', 180, 88, 80, '#eef2f7'], ['body', 460, 88, 80, '#eef2f7'], ['title', 180, 150, 80, '#eef2f7'], ['h1', 370, 150, 70, '#eef2f7'], ['input#cerca', 460, 150, 100, '#e8f5ee'], ['ul#elenco', 560, 150, 90, '#e8f5ee'], ['li … li', 560, 198, 80, '#fff4e0']].map(([t, x, y, w, c]) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="24" rx="12" fill="${c}" stroke="#7c8a99"/><text x="${x}" y="${y + 17}" text-anchor="middle" ${MONO} font-size="12">${t}</text>`).join('')}
      <text x="20" y="190" font-size="12" fill="#5b6b7f">Ogni tag è un nodo;</text>
      <text x="20" y="208" font-size="12" fill="#5b6b7f">JavaScript li legge e li modifica.</text>
    </g></svg>`;

  const CSRF_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 220" role="img" aria-label="Attacco CSRF">
    <defs>${freccia('st-fr-cs', '#44546a')}${freccia('st-fr-cs2', '#c5483c')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="220" y="80" width="240" height="60" rx="10" fill="#e3f0ff" stroke="#1a5fb4"/>
      <text x="340" y="105" text-anchor="middle" font-weight="600">Browser dello studente</text>
      <text x="340" y="125" text-anchor="middle" font-size="11.5">ha il cookie di sessione del registro</text>
      <rect x="10" y="20" width="190" height="56" rx="10" fill="#e8f5ee" stroke="#3f9b6b"/>
      <text x="105" y="44" text-anchor="middle" font-weight="600">registro.scuola.example</text>
      <text x="105" y="62" text-anchor="middle" font-size="11.5">1. login: riceve il cookie</text>
      <rect x="480" y="20" width="190" height="56" rx="10" fill="#fdeaea" stroke="#c5483c"/>
      <text x="575" y="44" text-anchor="middle" font-weight="600">sito dell'attaccante</text>
      <text x="575" y="62" text-anchor="middle" font-size="11.5">2. contiene un modulo nascosto</text>
      <g stroke-width="1.6" fill="none">
        <path d="M200 48 C230 48 250 60 270 78" stroke="#44546a" marker-end="url(#st-fr-cs)"/>
        <path d="M480 48 C450 48 430 60 410 78" stroke="#44546a" marker-end="url(#st-fr-cs)"/>
        <path d="M300 140 C260 190 140 190 105 80" stroke="#c5483c" stroke-width="2" marker-end="url(#st-fr-cs2)"/></g>
      <text x="200" y="208" text-anchor="middle" font-size="12" fill="#a33a30">3. POST /cambia-email + cookie inviato in automatico</text>
      <text x="540" y="170" text-anchor="middle" font-size="12" fill="#2f7d55">Difesa: token CSRF</text>
      <text x="540" y="188" text-anchor="middle" font-size="12" fill="#2f7d55">e cookie SameSite</text>
    </g></svg>`;

  const GIT_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 170" role="img" aria-label="Rami in Git">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <line x1="40" y1="50" x2="600" y2="50" stroke="#1a5fb4" stroke-width="3"/>
      <path d="M160 50 C200 50 200 120 240 120 L420 120 C460 120 460 50 500 50" fill="none" stroke="#3f9b6b" stroke-width="3"/>
      ${[[60, 50, 'a07f3b1'], [160, 50, 'c3e19d0'], [330, 50, '91b2e44'], [500, 50, 'merge']].map(([x, y, t]) => `<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="#1a5fb4" stroke-width="3"/><text x="${x}" y="${y - 18}" text-anchor="middle" ${MONO} font-size="11.5">${t}</text>`).join('')}
      ${[[260, 'b5d0a27'], [400, '4c1d9e2']].map(([x, t]) => `<circle cx="${x}" cy="120" r="10" fill="#fff" stroke="#3f9b6b" stroke-width="3"/><text x="${x}" y="148" text-anchor="middle" ${MONO} font-size="11.5">${t}</text>`).join('')}
      <rect x="560" y="64" width="64" height="22" rx="4" fill="#1a5fb4"/><text x="592" y="80" text-anchor="middle" fill="#fff" font-size="12">main</text>
      <text x="330" y="100" text-anchor="middle" font-size="12" fill="#2f7d55">ramo grafico-temperature</text>
    </g></svg>`;

  const J_MQTT = String.raw`
import org.eclipse.paho.client.mqttv3.*;
import java.util.Locale;

public class Termometro {
    public static void main(String[] args) throws MqttException, InterruptedException {
        MqttClient client = new MqttClient("tcp://broker.scuola.example:1883", "termometro-lab4");
        MqttConnectOptions opzioni = new MqttConnectOptions();
        opzioni.setCleanSession(true);
        opzioni.setKeepAliveInterval(30);
        // last will: se il sensore cade, il broker pubblica "offline" al posto suo
        opzioni.setWill("scuola/lab4/termometro/stato", "offline".getBytes(), 1, true);
        client.connect(opzioni);
        client.publish("scuola/lab4/termometro/stato", "online".getBytes(), 1, true);

        for (int i = 0; i < 10; i++) {
            double t = 20 + Math.random() * 5;              // al posto della lettura del sensore
            String testo = String.format(Locale.ROOT, "%.1f", t);
            MqttMessage msg = new MqttMessage(testo.getBytes());
            msg.setQos(1);                                  // almeno una volta
            client.publish("scuola/lab4/temperatura", msg);
            Thread.sleep(5000);
        }
        client.disconnect();
    }
}`;
  const J_MQTT_SUB = String.raw`
MqttClient client = new MqttClient("tcp://broker.scuola.example:1883", "cruscotto-01");
client.setCallback(new MqttCallback() {
    @Override
    public void messageArrived(String topic, MqttMessage m) {
        System.out.println(topic + " = " + new String(m.getPayload()) + " °C");
    }
    @Override
    public void connectionLost(Throwable causa) {
        System.err.println("Connessione persa: " + causa.getMessage());
    }
    @Override
    public void deliveryComplete(IMqttDeliveryToken token) { }
});
client.connect();
client.subscribe("scuola/+/temperatura", 1);   // tutti i laboratori`;
  const H_ELENCO = String.raw`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Studenti</title>
  <script src="elenco.js" defer></script>
</head>
<body>
  <h1>Studenti della 5B</h1>
  <input id="cerca" type="search" placeholder="Cerca per cognome">
  <p id="stato">Caricamento…</p>
  <ul id="elenco"></ul>
</body>
</html>`;
  const JS_ELENCO = String.raw`
const elenco = document.querySelector('#elenco');
const stato = document.querySelector('#stato');
const cerca = document.querySelector('#cerca');
let studenti = [];

function mostra(lista) {
  elenco.replaceChildren();                    // svuota la lista
  for (const s of lista) {
    const li = document.createElement('li');
    li.textContent = s.cognome + ' ' + s.nome;  // textContent: niente HTML interpretato
    elenco.append(li);
  }
  stato.textContent = lista.length + ' studenti';
}

async function carica() {
  try {
    const risposta = await fetch('/api/classi/5B/studenti');
    if (!risposta.ok) throw new Error('errore HTTP ' + risposta.status);
    studenti = await risposta.json();
    mostra(studenti);
  } catch (e) {
    stato.textContent = 'Impossibile caricare i dati: ' + e.message;
  }
}

cerca.addEventListener('input', () => {
  const testo = cerca.value.trim().toLowerCase();
  mostra(studenti.filter((s) => s.cognome.toLowerCase().startsWith(testo)));
});

carica();`;
  const JS_MODULO = String.raw`
const modulo = document.querySelector('#nuovo-voto');

modulo.addEventListener('submit', async (evento) => {
  evento.preventDefault();                       // niente ricaricamento della pagina
  const dati = Object.fromEntries(new FormData(modulo));
  const risposta = await fetch('/api/voti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dati),
  });
  if (risposta.status === 201) {
    modulo.reset();
    document.querySelector('#esito').textContent = 'Voto salvato';
  } else {
    document.querySelector('#esito').textContent = 'Errore: ' + risposta.status;
  }
});`;
  const P_LOGIN = String.raw`
<?php
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/',
    'secure' => true, 'httponly' => true, 'samesite' => 'Lax',
]);
session_start();
require 'db.php';                                  // crea $db (PDO)

$q = $db->prepare('SELECT id, hash_password FROM utenti WHERE email = ?');
$q->execute([$_POST['email'] ?? '']);
$utente = $q->fetch(PDO::FETCH_ASSOC);

if ($utente && password_verify($_POST['password'] ?? '', $utente['hash_password'])) {
    session_regenerate_id(true);                   // contro la session fixation
    $_SESSION['id_utente'] = $utente['id'];
    header('Location: /area-riservata.php');
    exit;
}
http_response_code(401);
echo 'Email o password non corrette';             // stesso messaggio nei due casi`;
  const P_CSRF = String.raw`
<?php
session_start();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));  // token casuale, uno per sessione
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
        http_response_code(403);
        exit('Richiesta non valida');
    }
    // ... qui si cambia davvero l'email
}
?>
<form method="post" action="cambia-email.php">
  <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">
  <input type="email" name="email" required>
  <button>Salva</button>
</form>`;
  const J_PAGELLA = String.raw`
public class Pagella {
    public static double media(double[] voti) {
        if (voti.length == 0) {
            throw new IllegalArgumentException("Nessun voto");
        }
        double somma = 0;
        for (double v : voti) {
            somma += v;
        }
        return somma / voti.length;
    }
}`;
  const J_TEST = String.raw`
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class PagellaTest {
    @Test
    void mediaDiTreVoti() {
        assertEquals(7.0, Pagella.media(new double[] {6, 7, 8}), 0.001);
    }

    @Test
    void mediaConDecimali() {
        assertEquals(6.5, Pagella.media(new double[] {6, 7}), 0.001);
    }

    @Test
    void senzaVotiLanciaEccezione() {
        assertThrows(IllegalArgumentException.class, () -> Pagella.media(new double[] {}));
    }
}`;
  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.tpsit = {
    id: 'tpsit', nome: 'TPSIT',
    argomenti: [
      { id: 'clientserver', titolo: 'Architettura client-server', minuti: 9, giorni: -28, corpo: () => `
        <p class="st-intro">Nell'architettura <b>client-server</b> un programma, il <b>server</b>, offre un servizio e resta in attesa; altri programmi, i <b>client</b>, gli inviano richieste e ricevono risposte.</p>
        <h2 id="st-s1">1. Ruoli</h2>
        ${tabella(['', 'Client', 'Server'], [['Chi inizia', 'apre la comunicazione', 'aspetta le richieste'], ['Quanti', 'molti', 'uno (o un gruppo)'], ['Esempi', 'browser, app, client di posta', 'server web, database, server di posta']])}
        <h2 id="st-s2">2. Architetture a livelli</h2>
        <ul><li><b>Two-tier</b>: il client parla direttamente con il server dei dati.</li><li><b>Three-tier</b>: presentazione (browser), logica applicativa (server web o applicativo), dati (DBMS). È lo schema tipico delle applicazioni web.</li></ul>
        <h2 id="st-s3">3. Server iterativo e concorrente</h2>
        <p>Un server <b>iterativo</b> serve un client alla volta. Un server <b>concorrente</b> crea un <b>thread</b> (o un processo) per ogni client, così più client sono serviti insieme.</p>
        ${nota('info', 'Peer-to-peer', 'Nel modello P2P ogni nodo è contemporaneamente client e server (es. BitTorrent): non c\'è un server centrale.')}` },
      { id: 'thread', titolo: 'Thread in Java: creazione e sincronizzazione', minuti: 18, giorni: -21, corpo: () => `
        <p class="st-intro">Un <b>thread</b> è un flusso di esecuzione all'interno di un processo. I thread dello stesso processo condividono la memoria: questo li rende leggeri e veloci da creare, ma obbliga a <b>sincronizzarli</b> quando accedono agli stessi dati.</p>
        <h2 id="st-s1">1. Processi e thread</h2>
        <p>Un processo ha un proprio spazio di indirizzamento; i suoi thread condividono heap, variabili statiche e file aperti, mentre ognuno ha il proprio <b>stack</b> e il proprio program counter. Il cambio di contesto tra thread è quindi molto più economico di quello tra processi.</p>
        <h2 id="st-s2">2. Ciclo di vita di un thread</h2>
        <p>In Java lo stato di un thread si legge con <code>getState()</code> e appartiene all'enum <code>Thread.State</code>.</p>
        ${figura(THREAD_SVG, 'Figura 1 – Gli stati di Thread.State e le transizioni principali.')}
        <h2 id="st-s3">3. Creare un thread</h2>
        <p>Il modo consigliato è implementare l'interfaccia <code>Runnable</code> e passare l'oggetto al costruttore di <code>Thread</code>. Il metodo <code>start()</code> crea il nuovo flusso ed esegue <code>run()</code>; chiamare direttamente <code>run()</code> lo eseguirebbe nel thread corrente.</p>
        ${ide('Contatore.java', 'java', J_RUNNABLE, 'Esempio 1 – Due thread che contano in parallelo; join() attende la loro terminazione.')}
        <h2 id="st-s4">4. Race condition</h2>
        <p>L'istruzione <code>saldo = saldo + importo</code> non è <b>atomica</b>: il thread legge il valore, lo somma e lo riscrive. Se due thread si alternano in mezzo a queste operazioni, un aggiornamento va perso.</p>
        ${ide('Conto.java', 'java', J_CONTO, 'Esempio 2 – Conto condiviso senza sincronizzazione.')}
        ${terminale('studente@lab4: ~/tpsit/thread', `
studente@lab4:~/tpsit/thread$ javac Conto.java
studente@lab4:~/tpsit/thread$ java Conto
Saldo finale: 137482 (atteso 200000)
studente@lab4:~/tpsit/thread$ java Conto
Saldo finale: 151906 (atteso 200000)
studente@lab4:~/tpsit/thread$ `, 'Figura 2 – Ogni esecuzione dà un risultato diverso: è il segnale tipico di una race condition.')}
        <p>La soluzione è rendere il metodo una <b>sezione critica</b> con <code>synchronized</code>: un solo thread alla volta può eseguirlo sullo stesso oggetto, perché deve prima ottenere il suo <i>monitor</i>.</p>
        <h2 id="st-s5">5. Produttore e consumatore</h2>
        <p>Con <code>wait()</code> un thread rilascia il monitor e si sospende finché un altro non chiama <code>notify()</code> o <code>notifyAll()</code>. La condizione va sempre ricontrollata in un <code>while</code>, per via dei risvegli spuri.</p>
        ${ide('Buffer.java', 'java', J_BUFFER, 'Esempio 3 – Buffer circolare limitato condiviso tra produttori e consumatori.')}
        ${nota('info', 'Approfondimento', 'Nelle applicazioni reali si preferiscono le classi di <code>java.util.concurrent</code>: <code>ReentrantLock</code>, <code>Semaphore</code>, <code>ArrayBlockingQueue</code> ed <code>ExecutorService</code>. Le vedremo nell\'unità 4.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Correggi <code>Conto.java</code> con <code>synchronized</code> e verifica che il saldo sia sempre 200000.</li>
          <li>Scrivi un programma con 3 produttori e 2 consumatori che usano la classe <code>Buffer</code>.</li>
          <li>Spiega perché in <code>preleva()</code> si usa <code>while</code> e non <code>if</code>.</li>
        </ol>` },
      { id: 'socket', titolo: 'Socket in Java', minuti: 14, giorni: -14, corpo: () => `
        <p class="st-intro">Un <b>socket</b> è l'estremità di una comunicazione di rete: indirizzo IP più porta. In Java si usano <code>ServerSocket</code> (lato server) e <code>Socket</code> (lato client) per le connessioni TCP.</p>
        <h2 id="st-s1">1. Il server</h2>
        ${ide('Server.java', 'java', `import java.io.*;
import java.net.*;

public class Server {
    public static void main(String[] args) throws IOException {
        try (ServerSocket server = new ServerSocket(5000)) {
            while (true) {
                Socket client = server.accept();          // aspetta un client
                new Thread(() -> gestisci(client)).start(); // server concorrente
            }
        }
    }
    static void gestisci(Socket s) {
        try (s; BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
             PrintWriter out = new PrintWriter(s.getOutputStream(), true)) {
            String riga;
            while ((riga = in.readLine()) != null) out.println("ECO: " + riga);
        } catch (IOException e) { System.err.println(e.getMessage()); }
    }
}`, 'Server eco concorrente: un thread per ogni client.')}
        <h2 id="st-s2">2. Il client</h2>
        ${ide('Client.java', 'java', `try (Socket s = new Socket("localhost", 5000);
     PrintWriter out = new PrintWriter(s.getOutputStream(), true);
     BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()))) {
    out.println("ciao");
    System.out.println(in.readLine()); // ECO: ciao
}`, 'Il client si collega, invia una riga e legge la risposta.')}
        <h2 id="st-s3">3. TCP e UDP in Java</h2>
        <p>Per UDP si usano <code>DatagramSocket</code> e <code>DatagramPacket</code>: non c'è connessione e ogni pacchetto viaggia da solo.</p>
        ${nota('avviso', 'Attenzione', '<code>accept()</code> e <code>readLine()</code> sono bloccanti: senza thread il server resterebbe fermo sul primo client.')}` },
      { id: 'rest', titolo: 'Servizi web e API REST', minuti: 12, giorni: -10, corpo: () => `
        <p class="st-intro">Un <b>servizio web</b> mette a disposizione funzioni attraverso HTTP. Lo stile più diffuso è <b>REST</b>: ogni <b>risorsa</b> ha un indirizzo (URI) e si manipola con i metodi HTTP.</p>
        <h2 id="st-s1">1. Risorse e metodi</h2>
        ${tabella(['Operazione', 'Metodo', 'URI', 'Codice tipico'], [['Elenco studenti', 'GET', '/api/studenti', '200'], ['Uno studente', 'GET', '/api/studenti/42', '200 o 404'], ['Nuovo studente', 'POST', '/api/studenti', '201 Created'], ['Modifica', 'PUT / PATCH', '/api/studenti/42', '200 o 204'], ['Cancellazione', 'DELETE', '/api/studenti/42', '204 No Content']])}
        <h2 id="st-s2">2. I vincoli di REST</h2>
        <ul><li>Architettura <b>client-server</b>.</li><li><b>Stateless</b>: ogni richiesta contiene tutto ciò che serve (per esempio il token di autenticazione).</li><li>Risposte <b>cacheable</b> quando possibile.</li><li><b>Interfaccia uniforme</b>: URI per le risorse, metodi HTTP per le azioni, rappresentazioni in JSON (o XML).</li></ul>
        <h2 id="st-s3">3. Una chiamata dal browser</h2>
        ${ide('app.js', 'js', `const risposta = await fetch('/api/studenti', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome: 'Anna', classe: '5B' }),
});
if (risposta.status === 201) console.log(await risposta.json());`, 'fetch invia una richiesta POST con un corpo JSON.')}
        ${nota('info', 'Idempotenza', 'GET, PUT e DELETE sono idempotenti: ripeterli dà lo stesso risultato. POST no: ogni chiamata può creare una risorsa nuova.')}` },
      { id: 'xmljson', titolo: 'Formati di dati: XML e JSON', minuti: 10, giorni: -7, corpo: () => `
        <p class="st-intro">Per scambiarsi dati, client e server usano formati di testo strutturati: <b>XML</b> e <b>JSON</b>.</p>
        <h2 id="st-s1">1. Lo stesso dato nei due formati</h2>
        ${ide('studente.xml', 'html', `<?xml version="1.0" encoding="UTF-8"?>
<studente matricola="42">
  <nome>Anna</nome>
  <classe>5B</classe>
  <voti><voto materia="TPSIT">8</voto></voti>
</studente>`, 'XML: elementi con tag di apertura e chiusura, attributi.')}
        ${ide('studente.json', 'js', `{
  "matricola": 42,
  "nome": "Anna",
  "classe": "5B",
  "voti": [{ "materia": "TPSIT", "voto": 8 }]
}`, 'JSON: oggetti tra graffe, array tra quadre, chiavi tra virgolette.')}
        <h2 id="st-s2">2. Confronto</h2>
        ${tabella(['', 'XML', 'JSON'], [['Sintassi', 'tag e attributi', 'coppie chiave: valore'], ['Tipi di dato', 'tutto testo', 'stringa, numero, booleano, null, oggetto, array'], ['Validazione', 'DTD, XML Schema (XSD)', 'JSON Schema'], ['Peso', 'più verboso', 'più compatto']])}
        <h2 id="st-s3">3. Ben formato e valido</h2>
        <p>Un XML è <b>ben formato</b> se rispetta la sintassi (un solo elemento radice, tag chiusi e annidati correttamente). È <b>valido</b> se rispetta anche il suo schema (DTD o XSD).</p>
        ${nota('avviso', 'JSON e JavaScript', 'In JSON le chiavi vanno sempre tra virgolette doppie e non sono ammessi commenti né virgole finali.')}` },
      { id: 'cloud', titolo: 'Il cloud computing', minuti: 9, giorni: -3, corpo: () => `
        <p class="st-intro">Il <b>cloud computing</b> offre risorse informatiche (server, archiviazione, programmi) come servizio attraverso Internet, pagando in base all'uso.</p>
        <h2 id="st-s1">1. Modelli di servizio</h2>
        ${tabella(['Modello', 'Cosa offre', 'Esempi'], [['IaaS', 'macchine virtuali, reti, dischi', 'Amazon EC2, Azure VM'], ['PaaS', 'piattaforma per eseguire le proprie applicazioni', 'Render, Heroku, Google App Engine'], ['SaaS', 'applicazioni pronte all\'uso', 'Gmail, Microsoft 365, Google Docs']])}
        <h2 id="st-s2">2. Modelli di distribuzione</h2>
        <ul><li><b>Pubblico</b>: infrastruttura condivisa del fornitore.</li><li><b>Privato</b>: dedicato a una sola organizzazione.</li><li><b>Ibrido</b>: un misto dei due.</li></ul>
        <h2 id="st-s3">3. Vantaggi e rischi</h2>
        <p>Vantaggi: <b>scalabilità</b> (si aggiungono risorse quando servono), niente investimento iniziale in hardware, accesso da ovunque. Rischi: dipendenza dalla connessione e dal fornitore (<i>lock-in</i>), privacy e posizione dei dati (GDPR).</p>
        ${nota('info', 'Virtualizzazione e container', 'Il cloud si basa sulla virtualizzazione (hypervisor) e sempre più sui container (Docker), più leggeri delle macchine virtuali.')}` },
      { id: 'iot', titolo: 'Internet of Things e protocollo MQTT', minuti: 14, giorni: -6, corpo: () => `
        <p class="st-intro">L'<b>Internet of Things</b> (IoT, Internet delle cose) è l'insieme di oggetti fisici dotati di sensori, attuatori e connessione di rete: termostati, contatori, semafori, macchinari, serre. Gli oggetti raccolgono dati e li inviano a un server, che li elabora e può rimandare comandi. In questa lezione vediamo l'architettura tipica e il protocollo più usato per far parlare i dispositivi: <b>MQTT</b>.</p>
        <h2 id="st-s1">1. Architettura di un sistema IoT</h2>
        ${tabella(["Livello", "Che cosa contiene", "Esempio: aule climatizzate"], [
          ["Dispositivi (percezione)", "sensori, attuatori, microcontrollori", "sensore di temperatura e umidità collegato a un microcontrollore con Wi-Fi"],
          ["Rete e gateway", "collegamento dei dispositivi e traduzione dei protocolli", "Wi-Fi della scuola; per i sensori a batteria, LoRaWAN o Zigbee verso un gateway"],
          ["Elaborazione (broker, server, cloud)", "raccolta, memorizzazione e analisi dei dati", "broker MQTT e database delle misure"],
          ["Applicazione", "interfaccia per le persone, regole automatiche", "cruscotto web, avvisi, accensione del condizionatore"],
        ])}
        <p>I dispositivi IoT hanno spesso <b>poca memoria</b>, <b>poca potenza di calcolo</b>, funzionano <b>a batteria</b> e usano reti lente o instabili. Per questo servono protocolli leggeri. Quando una parte dell'elaborazione si fa vicino ai sensori (per esempio nel gateway) si parla di <b>edge computing</b>: si risparmia banda e si reagisce più in fretta.</p>
        ${tabella(["Protocollo", "Livello", "Caratteristiche"], [["MQTT", "applicazione, su TCP", "publish/subscribe con un broker, leggerissimo"], ["CoAP", "applicazione, su UDP", "simile a un REST compatto per dispositivi piccoli"], ["HTTP/REST", "applicazione, su TCP", "semplice e universale, ma pesante per i sensori"], ["Zigbee, Bluetooth LE", "rete locale a basso consumo", "corto raggio, reti di sensori domestici"], ["LoRaWAN, NB-IoT", "rete geografica a basso consumo", "chilometri di portata, pochi byte al giorno"]])}
        <h2 id="st-s2">2. MQTT: publish e subscribe</h2>
        <p><b>MQTT</b> (Message Queuing Telemetry Transport) non usa lo schema richiesta-risposta di HTTP, ma il modello <b>publish/subscribe</b>. Al centro c'è il <b>broker</b>, un server che riceve tutti i messaggi:</p>
        <ul><li>i <b>publisher</b> pubblicano messaggi su un <b>topic</b> (un argomento), senza sapere chi li leggerà;</li>
          <li>i <b>subscriber</b> si iscrivono ai topic che interessano e il broker inoltra loro i messaggi;</li>
          <li>mittenti e destinatari sono <b>disaccoppiati</b>: non si conoscono e non devono essere connessi nello stesso momento.</li></ul>
        ${figura(MQTT_SVG, "Figura 1 – I sensori pubblicano sul broker; il broker inoltra a ciascun subscriber i messaggi dei topic a cui è iscritto.")}
        <p>Il broker ascolta sulla porta TCP <b>1883</b> (in chiaro) o <b>8883</b> (con TLS). L'intestazione fissa di un messaggio MQTT è di soli 2 byte.</p>
        <h2 id="st-s3">3. Topic e caratteri jolly</h2>
        <p>I topic sono stringhe gerarchiche separate da <code>/</code>, per esempio <code>scuola/lab4/temperatura</code>. Nell'iscrizione si possono usare due caratteri jolly:</p>
        ${tabella(["Jolly", "Significato", "Esempio", "Riceve"], [
          ["<code>+</code>", "esattamente un livello", "<code>scuola/+/temperatura</code>", "<code>scuola/lab1/temperatura</code>, <code>scuola/lab4/temperatura</code>"],
          ["<code>#</code>", "tutti i livelli successivi (solo in fondo)", "<code>scuola/lab4/#</code>", "<code>scuola/lab4/temperatura</code>, <code>scuola/lab4/termometro/stato</code>"],
        ])}
        <h2 id="st-s4">4. Qualità del servizio e altre funzioni</h2>
        ${tabella(["QoS", "Garanzia", "Come funziona"], [["0", "al massimo una volta", "si invia e basta (fire and forget)"], ["1", "almeno una volta", "il destinatario conferma con PUBACK; possibili duplicati"], ["2", "esattamente una volta", "scambio in quattro passi; il più lento"]])}
        <ul><li><b>Retained message</b>: il broker conserva l'ultimo messaggio di un topic e lo manda subito a chi si iscrive dopo (utile per lo stato di un dispositivo).</li>
          <li><b>Last Will and Testament</b>: un messaggio che il client lascia al broker alla connessione; se il client si disconnette in modo anomalo, il broker lo pubblica al posto suo.</li>
          <li><b>Keep alive</b>: il client manda un PINGREQ periodico, così il broker si accorge se è caduto.</li></ul>
        <h2 id="st-s5">5. Provare MQTT dal terminale</h2>
        ${terminale("studente@lab4: ~", `studente@lab4:~$ mosquitto_sub -h broker.scuola.example -t 'scuola/+/temperatura' -v &
studente@lab4:~$ mosquitto_pub -h broker.scuola.example -t scuola/lab4/temperatura -m 22.5 -q 1
scuola/lab4/temperatura 22.5
studente@lab4:~$ mosquitto_pub -h broker.scuola.example -t scuola/lab1/temperatura -m 19.8 -q 1
scuola/lab1/temperatura 19.8`, "Con il client a riga di comando di Mosquitto (un broker open source) ci si iscrive e si pubblica: il subscriber riceve entrambi i messaggi grazie al jolly +.")}
        <h2 id="st-s6">6. Un client MQTT in Java</h2>
        <p>In Java si usa la libreria open source <b>Eclipse Paho</b>. Il termometro si collega, imposta il <i>last will</i> e pubblica una misura ogni 5 secondi:</p>
        ${ide("Termometro.java", "java", J_MQTT, "Esempio 1 – Publisher: il messaggio di stato è retained, così chi si iscrive sa subito se il sensore è online.")}
        ${ide("Cruscotto.java", "java", J_MQTT_SUB, "Esempio 2 – Subscriber: il metodo messageArrived viene chiamato dalla libreria, in un suo thread, a ogni messaggio.")}
        ${nota("avviso", "Sicurezza dell'IoT", "Molti attacchi su larga scala sono partiti da dispositivi IoT con password di fabbrica. Il broker va protetto con <b>TLS</b> (porta 8883), <b>autenticazione</b> (utente e password o certificati client) e <b>ACL</b> sui topic; i dispositivi vanno aggiornati e messi su una rete separata.")}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Progetta la gerarchia dei topic per una serra con 4 zone, ognuna con sensori di temperatura, umidità del terreno e una pompa di irrigazione.</li>
          <li>A quale topic si iscrive un cruscotto che vuole tutte le misure di umidità di tutte le zone? E uno che vuole tutto della zona 2?</li>
          <li>Quale QoS sceglieresti per una lettura di temperatura ogni 5 secondi? E per il comando «apri la valvola»? Motiva.</li>
        </ol>` },
      { id: 'webjs', titolo: 'Applicazioni web con JavaScript lato client', minuti: 15, giorni: -4, corpo: () => `
        <p class="st-intro">Nelle applicazioni web moderne il browser non si limita a mostrare le pagine che arrivano dal server: esegue codice <b>JavaScript</b> che modifica la pagina, reagisce alle azioni dell'utente e chiede dati al server <b>senza ricaricare</b> tutto. In questa lezione vediamo il <b>DOM</b>, gli <b>eventi</b> e le richieste asincrone con <code>fetch</code>.</p>
        <h2 id="st-s1">1. Il DOM</h2>
        <p>Quando carica una pagina, il browser costruisce il <b>DOM</b> (Document Object Model): un <b>albero di oggetti</b> in cui ogni tag è un nodo con i suoi figli. JavaScript può leggere e modificare questo albero, e il browser aggiorna subito la pagina visualizzata.</p>
        ${figura(DOM_SVG, "Figura 1 – L'albero DOM della pagina dell'esempio: l'oggetto document è la radice.")}
        ${tabella(["Operazione", "Codice"], [
          ["Trovare un elemento", "<code>document.querySelector('#elenco')</code>, <code>document.querySelectorAll('li')</code>"],
          ["Cambiare il testo", "<code>el.textContent = 'Ciao'</code>"],
          ["Cambiare stile e classi", "<code>el.classList.add('evidenziato')</code>, <code>el.style.color = 'red'</code>"],
          ["Leggere un campo", "<code>input.value</code>"],
          ["Creare e aggiungere", "<code>const li = document.createElement('li'); ul.append(li)</code>"],
          ["Togliere", "<code>el.remove()</code>"],
        ])}
        ${nota("avviso", "textContent o innerHTML?", "<code>innerHTML</code> interpreta il testo come HTML: se contiene dati scritti da un utente, può inserire nella pagina codice malevolo (attacco <b>XSS</b>). Per mostrare dati si usa <code>textContent</code>, che li tratta sempre come testo.")}
        <h2 id="st-s2">2. Gli eventi</h2>
        <p>Il codice lato client è <b>guidato dagli eventi</b>: si registra una funzione (<i>listener</i>) che il browser chiamerà quando l'evento accade.</p>
        ${tabella(["Evento", "Quando scatta"], [["<code>click</code>", "clic su un elemento"], ["<code>input</code>", "a ogni modifica di un campo"], ["<code>change</code>", "quando un campo cambia e perde il fuoco, o si sceglie un'opzione"], ["<code>submit</code>", "invio di un modulo"], ["<code>keydown</code>", "pressione di un tasto"], ["<code>DOMContentLoaded</code>", "il DOM è pronto"]])}
        <h2 id="st-s3">3. Richieste asincrone: AJAX e fetch</h2>
        <p>Con <b>AJAX</b> (Asynchronous JavaScript and XML) la pagina chiede dati al server in background e aggiorna solo la parte che serve. Il vecchio oggetto <code>XMLHttpRequest</code> oggi è sostituito da <b><code>fetch</code></b>, che restituisce una <b>Promise</b>: un oggetto che rappresenta un risultato che arriverà più avanti. Con <code>async</code>/<code>await</code> il codice asincrono si scrive quasi come quello normale, ma il browser non resta bloccato mentre aspetta la risposta. Oggi i dati viaggiano quasi sempre in <b>JSON</b>, non in XML.</p>
        ${ide("index.html", "html", H_ELENCO, "Esempio 1 – La pagina: l'attributo defer fa eseguire lo script quando il DOM è pronto.")}
        ${ide("elenco.js", "js", JS_ELENCO, "Esempio 2 – Il client chiede l'elenco a un'API REST, costruisce la lista e la filtra mentre l'utente scrive.")}
        <div class="st-browser"><div class="st-browser-barra"><span class="st-pallini"><i></i><i></i><i></i></span><span class="st-url">localhost:8080/index.html</span></div>
          <div class="st-anteprima"><div class="an-scheda"><b>Studenti della 5B</b><p>Cerca per cognome: <u>Ro</u></p><p>2 studenti</p><p>• Romano Luca<br>• Rossi Anna</p></div></div></div>
        <p class="st-didascalia">Figura 2 – Il risultato: scrivendo «Ro» la lista si aggiorna a ogni tasto, senza nessuna nuova richiesta al server.</p>
        <p>Attenzione: <code>fetch</code> considera un errore solo il fallimento della rete. Una risposta <code>404</code> o <code>500</code> arriva normalmente, quindi va controllato <code>risposta.ok</code> (vero per i codici 200–299).</p>
        <h2 id="st-s4">4. Inviare un modulo senza ricaricare la pagina</h2>
        ${ide("voti.js", "js", JS_MODULO, "Esempio 3 – preventDefault blocca l'invio classico; i dati del modulo partono in JSON con una POST.")}
        <h2 id="st-s5">5. Same-origin policy e CORS</h2>
        <p>Per sicurezza il browser permette a uno script di leggere le risposte solo dalla <b>stessa origine</b> della pagina (stesso protocollo, dominio e porta). Se l'API è su un'altra origine, il server deve autorizzarla esplicitamente con le intestazioni <b>CORS</b>, per esempio <code>Access-Control-Allow-Origin: https://www.scuola.example</code>.</p>
        ${nota("info", "Il controllo vero è sul server", "Il codice lato client si può leggere e modificare dagli strumenti per sviluppatori del browser. Le verifiche fatte in JavaScript servono a dare un riscontro immediato all'utente, ma vanno <b>sempre ripetute sul server</b>.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Aggiungi all'esempio 2 un pulsante che ordina la lista per cognome dalla A alla Z o dalla Z alla A.</li>
          <li>Modifica l'esempio 3 in modo che il voto sia accettato solo se è compreso tra 1 e 10, mostrando un messaggio accanto al campo.</li>
          <li>Spiega che cosa succede, passo per passo, tra la pressione di un tasto nel campo di ricerca e l'aggiornamento della lista.</li>
        </ol>` },
      { id: 'owasp', titolo: 'Sicurezza delle applicazioni web', minuti: 15, giorni: -2, corpo: () => `
        <p class="st-intro">Un'applicazione web è esposta a chiunque abbia un browser. La maggior parte degli attacchi non sfrutta la rete, ma <b>errori di programmazione</b>. L'<b>OWASP</b> (Open Worldwide Application Security Project), una comunità senza scopo di lucro, pubblica la <b>Top 10</b>: l'elenco dei rischi più diffusi. Qui vediamo i principali e come si difende il codice.</p>
        <h2 id="st-s1">1. La OWASP Top 10</h2>
        ${tabella(["N.", "Rischio (edizione 2021)", "Esempio"], [
          ["A01", "Broken Access Control", "uno studente cambia l'URL <code>/voti/42</code> in <code>/voti/43</code> e vede i voti di un altro"],
          ["A02", "Cryptographic Failures", "password salvate in chiaro, sito senza HTTPS"],
          ["A03", "Injection (anche XSS)", "SQL injection in un modulo di login"],
          ["A04", "Insecure Design", "recupero password con una domanda segreta facile da indovinare"],
          ["A05", "Security Misconfiguration", "messaggi di errore con i dettagli del database, account predefiniti"],
          ["A06", "Vulnerable and Outdated Components", "librerie mai aggiornate con vulnerabilità note"],
          ["A07", "Identification and Authentication Failures", "nessun limite ai tentativi di login, sessioni che non scadono"],
          ["A08", "Software and Data Integrity Failures", "aggiornamenti scaricati senza verificare la firma"],
          ["A09", "Security Logging and Monitoring Failures", "nessuno si accorge di un attacco in corso"],
          ["A10", "Server-Side Request Forgery", "il server scarica un URL scelto dall'attaccante verso la rete interna"],
        ])}
        <h2 id="st-s2">2. Injection</h2>
        <p>C'è <b>injection</b> quando dati forniti dall'utente finiscono dentro un comando (SQL, del sistema operativo, LDAP…) e vengono interpretati come codice. L'esempio classico è il login costruito concatenando stringhe:</p>
        ${ide("Login.java", "java", `// VULNERABILE: i dati dell'utente diventano parte del comando SQL
String sql = "SELECT id FROM utenti WHERE email = '" + email
           + "' AND password = '" + password + "'";
ResultSet rs = conn.createStatement().executeQuery(sql);

// CORRETTO: query preparata, i dati viaggiano separati dal comando
PreparedStatement ps = conn.prepareStatement(
        "SELECT id, hash_password FROM utenti WHERE email = ?");
ps.setString(1, email);
ResultSet rs2 = ps.executeQuery();`, "Esempio 1 – JDBC: con PreparedStatement il valore del parametro non può mai cambiare la struttura della query.")}
        <p>Se l'attaccante scrive come email <code>' OR '1'='1' -- </code>, la prima query diventa <code>… WHERE email = '' OR '1'='1' -- ' AND password = '…'</code>: la condizione è sempre vera, il resto è commentato e l'attaccante entra senza password. Con la query preparata, invece, quel testo viene cercato letteralmente come email e non trova nessuno.</p>
        <h2 id="st-s3">3. Cross-Site Scripting (XSS)</h2>
        <p>Con l'<b>XSS</b> l'attaccante riesce a far eseguire il proprio JavaScript nel browser di altri utenti, dentro il sito vulnerabile: può rubare i dati della pagina, agire a nome della vittima o modificare ciò che vede.</p>
        ${tabella(["Tipo", "Come avviene"], [["Stored (memorizzato)", "lo script è salvato nel database (per esempio in un commento) e mostrato a tutti i visitatori"], ["Reflected (riflesso)", "lo script è in un parametro dell'URL che il server ricopia nella pagina, per esempio <code>cerca.php?q=…</code>"], ["DOM-based", "è il JavaScript lato client a inserire dati non fidati nella pagina con innerHTML"]])}
        <p>Difese: <b>codificare l'output</b> secondo il contesto (in PHP <code>htmlspecialchars</code>, in JavaScript <code>textContent</code>), validare l'input, usare l'intestazione <b>Content-Security-Policy</b> per vietare gli script non autorizzati e impostare i cookie di sessione come <b>HttpOnly</b>, così JavaScript non può leggerli.</p>
        <h2 id="st-s4">4. Cross-Site Request Forgery (CSRF)</h2>
        <p>Il browser allega automaticamente i cookie a ogni richiesta verso un sito. Con il <b>CSRF</b> un sito malevolo induce il browser della vittima, già autenticata, a inviare una richiesta al sito vero: il server vede un cookie di sessione valido e la esegue.</p>
        ${figura(CSRF_SVG, "Figura 1 – Il sito dell'attaccante invia un modulo al registro: il browser allega da solo il cookie della vittima.")}
        ${ide("cambia-email.php", "php", P_CSRF, "Esempio 2 – Token anti-CSRF: il sito dell'attaccante non può conoscere il valore casuale salvato nella sessione.")}
        <p>Altre difese: l'attributo <code>SameSite=Lax</code> o <code>Strict</code> dei cookie (che non vengono inviati nelle richieste partite da altri siti) e non usare mai GET per operazioni che modificano i dati.</p>
        <h2 id="st-s5">5. Autenticazione e sessioni</h2>
        <ul><li>Le password si salvano solo come <b>hash con salt</b>, con algoritmi lenti: in PHP <code>password_hash()</code> e <code>password_verify()</code>.</li>
          <li><b>Limitare i tentativi</b> di login (o rallentarli) contro gli attacchi a forza bruta; offrire l'<b>autenticazione a due fattori</b>.</li>
          <li>Dopo il login si <b>rigenera l'ID di sessione</b>, contro la <i>session fixation</i>; al logout la sessione si distrugge sul server.</li>
          <li>I cookie di sessione devono essere <b>Secure</b> (solo HTTPS), <b>HttpOnly</b> e <b>SameSite</b>, e la sessione deve scadere dopo un periodo di inattività.</li>
          <li>Il messaggio di errore non deve rivelare se esiste l'account («email o password non corrette»).</li></ul>
        ${ide("login.php", "php", P_LOGIN, "Esempio 3 – Login con query preparata, verifica dell'hash, rigenerazione della sessione e cookie protetti.")}
        ${nota("avviso", "Il controllo degli accessi", "Il rischio numero uno è il controllo degli accessi. Ogni richiesta va verificata sul server: non basta nascondere un pulsante nell'interfaccia. Prima di mostrare i voti dello studente 43, il server deve controllare che l'utente in sessione sia proprio lui, un suo genitore o un docente della classe.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Una pagina mostra «Risultati per: » seguito dal parametro <code>q</code> dell'URL. Scrivi un URL che sfrutta un XSS riflesso e correggi il codice PHP.</li>
          <li>Spiega perché un token anti-CSRF salvato in un cookie, e non nella sessione o nella pagina, non servirebbe a niente.</li>
          <li>Rivedi il login del tuo progetto con la lista della sezione 5 e scrivi quali punti non sono rispettati.</li>
        </ol>` },
      { id: 'progetto', titolo: 'Gestione di un progetto software: Git, metodi agili e test', minuti: 14, giorni: -1, corpo: () => `
        <p class="st-intro">Un programma vero non lo scrive una persona sola in un pomeriggio: lo sviluppa un <b>gruppo</b>, per mesi, mentre i requisiti cambiano. Servono strumenti e metodi per lavorare insieme senza perdere il codice, per organizzare il lavoro e per sapere che il software funziona. Vediamo il controllo di versione con <b>Git</b>, le <b>metodologie agili</b> e i <b>test</b>.</p>
        <h2 id="st-s1">1. Il controllo di versione con Git</h2>
        <p><b>Git</b> è un sistema di controllo di versione <b>distribuito</b>: ogni sviluppatore ha sul proprio computer una copia completa del <b>repository</b>, con tutta la storia del progetto. Ogni <b>commit</b> è una fotografia del codice, con un autore, una data, un messaggio e un identificativo (un hash SHA-1 di 40 cifre esadecimali, di solito abbreviato a 7).</p>
        ${tabella(["Comando", "A cosa serve"], [
          ["<code>git init</code> / <code>git clone URL</code>", "crea un repository nuovo / copia un repository esistente"],
          ["<code>git status</code>", "mostra i file modificati e quelli pronti per il commit"],
          ["<code>git add file</code>", "mette le modifiche nell'area di preparazione (staging)"],
          ["<code>git commit -m \"messaggio\"</code>", "registra le modifiche preparate"],
          ["<code>git log --oneline</code>", "mostra la storia dei commit"],
          ["<code>git switch -c nome</code>", "crea un nuovo ramo e ci si sposta"],
          ["<code>git merge nome</code>", "unisce un ramo a quello corrente"],
          ["<code>git pull</code> / <code>git push</code>", "scarica / invia i commit dal / al repository remoto"],
        ])}
        <h2 id="st-s2">2. Rami e lavoro di gruppo</h2>
        <p>Un <b>ramo</b> (branch) è una linea di sviluppo separata. Il ramo principale (<code>main</code>) contiene la versione stabile; ogni funzionalità nuova si sviluppa in un ramo a parte e si unisce a <code>main</code> quando è pronta e verificata. Sulle piattaforme di hosting dei repository l'unione passa da una <b>pull request</b> (o merge request), in cui i compagni rileggono il codice (<i>code review</i>) prima di accettarlo.</p>
        ${figura(GIT_SVG, "Figura 1 – Il ramo grafico-temperature nasce da main, riceve due commit e viene unito con un commit di merge.")}
        ${terminale("studente@lab4: ~/stazione-meteo", `studente@lab4:~/stazione-meteo$ git switch -c grafico-temperature
Switched to a new branch 'grafico-temperature'
studente@lab4:~/stazione-meteo$ git add grafico.js index.html
studente@lab4:~/stazione-meteo$ git commit -m "Aggiunge il grafico delle temperature"
[grafico-temperature b5d0a27] Aggiunge il grafico delle temperature
 2 files changed, 64 insertions(+), 3 deletions(-)
studente@lab4:~/stazione-meteo$ git switch main
studente@lab4:~/stazione-meteo$ git merge grafico-temperature
Merge made by the 'ort' strategy.
studente@lab4:~/stazione-meteo$ git push origin main`, "Un ramo per la nuova funzionalità, il commit, l'unione in main e l'invio al repository remoto.")}
        ${nota("avviso", "Conflitti", "Se due persone modificano le stesse righe in rami diversi, Git non sa quale versione tenere e segnala un <b>conflitto</b>: il file conterrà entrambe le versioni tra i marcatori <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code> e <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>. Si sceglie a mano il testo giusto, si fa <code>git add</code> e si conclude con un commit. Commit piccoli e frequenti riducono i conflitti. Nel file <code>.gitignore</code> si elencano i file da non versionare (file compilati, password, configurazioni locali).")}
        <h2 id="st-s3">3. Dal modello a cascata ai metodi agili</h2>
        <p>Nel modello <b>a cascata</b> (waterfall) le fasi si susseguono una sola volta: analisi dei requisiti, progettazione, sviluppo, test, rilascio. Funziona se i requisiti sono chiari e stabili, ma il cliente vede il prodotto solo alla fine, quando cambiare è costoso. Le <b>metodologie agili</b> (Manifesto Agile, 2001) lavorano invece per <b>iterazioni brevi</b>: a ogni iterazione si consegna una parte funzionante, il cliente la prova e si decide che cosa fare dopo.</p>
        ${tabella(["", "A cascata", "Agile"], [["Requisiti", "fissati all'inizio", "possono cambiare a ogni iterazione"], ["Consegne", "una, alla fine", "frequenti, ogni 1–4 settimane"], ["Coinvolgimento del cliente", "all'inizio e alla fine", "continuo"], ["Documentazione", "molto dettagliata", "quella che serve"], ["Adatto a", "progetti stabili e regolamentati", "progetti con requisiti incerti"]])}
        <h2 id="st-s4">4. Scrum e Kanban</h2>
        <p><b>Scrum</b> è il metodo agile più diffuso. Il lavoro è diviso in <b>sprint</b> di durata fissa (di solito 2 settimane).</p>
        <ul><li><b>Ruoli</b>: il <i>Product Owner</i> rappresenta il cliente e decide le priorità; lo <i>Scrum Master</i> aiuta il gruppo ad applicare il metodo e rimuove gli ostacoli; gli <i>sviluppatori</i> realizzano il prodotto.</li>
          <li><b>Artefatti</b>: il <i>Product Backlog</i> (tutte le funzionalità desiderate, in ordine di priorità), lo <i>Sprint Backlog</i> (quelle scelte per lo sprint), l'<i>Incremento</i> (il prodotto funzionante alla fine dello sprint).</li>
          <li><b>Eventi</b>: <i>Sprint Planning</i>, <i>Daily Scrum</i> (15 minuti ogni giorno), <i>Sprint Review</i> (si mostra l'incremento) e <i>Retrospective</i> (come migliorare il modo di lavorare).</li></ul>
        <p>I requisiti si scrivono come <b>user story</b>: «Come <i>docente</i> voglio <i>vedere la media dei voti di ogni studente</i> per <i>preparare lo scrutinio</i>», con i <b>criteri di accettazione</b> che dicono quando la storia è finita. <b>Kanban</b> è un metodo più leggero: le attività sono schede su una lavagna a colonne (<i>Da fare</i>, <i>In corso</i>, <i>Fatto</i>) e si limita il numero di attività in corso contemporaneamente.</p>
        <h2 id="st-s5">5. I test</h2>
        ${tabella(["Livello", "Che cosa verifica"], [["Test di unità", "un singolo metodo o classe, isolato dal resto"], ["Test di integrazione", "più componenti insieme (per esempio codice e database)"], ["Test di sistema", "l'applicazione completa, dal punto di vista dell'utente"], ["Test di accettazione", "che il software soddisfi i requisiti del cliente"]])}
        <p>I test di unità si scrivono in codice e si eseguono in automatico. In Java si usa <b>JUnit</b>: ogni metodo annotato con <code>@Test</code> prepara i dati, chiama il codice da provare e controlla il risultato con le <i>asserzioni</i>.</p>
        ${ide("Pagella.java", "java", J_PAGELLA, "Esempio 1 – La classe da verificare.")}
        ${ide("PagellaTest.java", "java", J_TEST, "Esempio 2 – Test JUnit 5: un caso normale, un caso con decimali e un caso limite.")}
        ${nota("info", "TDD e integrazione continua", "Nel <b>Test-Driven Development</b> si scrive prima il test (che fallisce), poi il codice minimo per farlo passare, poi si migliora il codice (<i>refactoring</i>). Con l'<b>integrazione continua</b> (CI) un server esegue tutti i test a ogni push: se qualcosa si rompe, il gruppo lo sa subito.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Scrivi tre user story, con i criteri di accettazione, per un'applicazione di prenotazione dei laboratori.</li>
          <li>Aggiungi a <code>PagellaTest</code> un test che verifichi che la media di un solo voto è il voto stesso.</li>
          <li>Simula con un compagno un conflitto in Git: modificate la stessa riga in due rami, unite i rami e risolvete il conflitto.</li>
        </ol>` },
    ],
  };
})();
