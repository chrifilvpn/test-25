// Contenuto della pagina finta: un sito di dispense scolastiche credibile.
// Tutto è disegnato in HTML/SVG (niente immagini esterne): finestre di codice, terminali, schemi di rete.
window.BossPagina = (() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


  // ---------- date sempre attuali: le lezioni e le scadenze si calcolano a partire da oggi ----------
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const tra = (giorni) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + giorni); return d; };
  const breve = (giorni) => { const d = tra(giorni); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const lunga = (giorni) => { const d = tra(giorni); return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`; };
  const corta = (giorni) => { const d = tra(giorni); return `${d.getDate()} ${MESI[d.getMonth()].slice(0, 3)}`; };
  const annoScolastico = (() => { const d = new Date(); const a = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; return `${a}/${String(a + 1).slice(2)}`; })();

  // ---------- evidenziatore di sintassi (minimo, per le "schermate" di codice) ----------
  const REGOLE = {
    java: /(?<c>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<s>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])')|(?<a>@\w+)|(?<k>\b(?:public|private|protected|class|static|void|int|long|boolean|new|return|if|else|while|for|this|synchronized|throws|throw|try|catch|finally|extends|implements|import|package|final|true|false|null|interface)\b)|(?<n>\b\d[\d_]*L?\b)|(?<t>\b[A-Z]\w*\b)/g,
    html: /(?<c><!--[\s\S]*?-->)|(?<k><!DOCTYPE[^>]*>|<\/?[a-zA-Z][\w-]*|\/?>)|(?<a>\b[\w-]+(?==))|(?<s>"[^"]*")/g,
    css: /(?<c>\/\*[\s\S]*?\*\/)|(?<t>^[^{}\n:]+(?=\s*\{)|^[^{}\n]+:(?:hover|focus|first-child)(?=\s*\{))|(?<k>[\w-]+(?=\s*:))|(?<n>#[0-9a-fA-F]{3,6}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|fr|s)?\b)/gm,
  };
  function evidenzia(codice, lingua) {
    const re = REGOLE[lingua];
    if (!re) return esc(codice);
    let out = '';
    let da = 0;
    re.lastIndex = 0;
    for (const m of codice.matchAll(re)) {
      out += esc(codice.slice(da, m.index));
      const tipo = Object.keys(m.groups).find((k) => m.groups[k] !== undefined);
      out += `<span class="hl-${tipo}">${esc(m[0])}</span>`;
      da = m.index + m[0].length;
    }
    return out + esc(codice.slice(da));
  }

  // ---------- componenti "screenshot" ----------
  function ide(file, lingua, codice, didascalia) {
    const righe = codice.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const num = righe.map((_, i) => i + 1).join('\n');
    return `<figure class="st-fig">
      <div class="st-ide">
        <div class="st-ide-barra"><span class="st-pallini"><i></i><i></i><i></i></span>
          <span class="st-ide-tab attiva">${esc(file)}</span><span class="st-ide-tab">Main.java</span><span class="st-ide-titolo">Visual Studio Code</span></div>
        <div class="st-ide-corpo"><pre class="st-num">${num}</pre><pre class="st-codice">${evidenzia(righe.join('\n'), lingua)}</pre></div>
        <div class="st-ide-stato"><span>⎇ main</span><span>${lingua === 'java' ? 'Java' : lingua.toUpperCase()}</span><span>UTF-8</span><span>Ln ${righe.length}, Col 1</span></div>
      </div>
      ${didascalia ? `<figcaption>${didascalia}</figcaption>` : ''}</figure>`;
  }
  function terminale(titolo, testo, didascalia) {
    const righe = testo.replace(/^\n/, '').replace(/\s+$/, '').split('\n').map((r) => {
      const p = r.match(/^((?:C:\\[^>]*>)|(?:studente@lab4:[^$]*\$))(.*)$/);
      return p ? `<span class="st-prompt">${esc(p[1])}</span><span class="st-cmd">${esc(p[2])}</span>` : esc(r);
    });
    return `<figure class="st-fig">
      <div class="st-term"><div class="st-term-barra"><span>${esc(titolo)}</span><span class="st-term-bt">— ▢ ✕</span></div>
      <pre>${righe.join('\n')}<span class="st-cursore">█</span></pre></div>
      ${didascalia ? `<figcaption>${didascalia}</figcaption>` : ''}</figure>`;
  }
  const figura = (svg, didascalia) => `<figure class="st-fig st-schema">${svg}<figcaption>${didascalia}</figcaption></figure>`;
  const nota = (tipo, titolo, testo) => `<div class="st-nota st-nota-${tipo}"><b>${titolo}</b><p>${testo}</p></div>`;

  // ---------- schemi SVG ----------
  const RETE_SVG = `<svg viewBox="0 0 720 400" role="img" aria-label="Schema della rete della scuola">
    <defs><marker id="st-fr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="#5b6b7f"/></marker></defs>
    <g font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" fill="#1f2d3d">
      <path d="M318 40c0-16 20-26 36-18 8-14 34-14 42 2 18-4 32 10 26 26 12 6 10 26-6 28H322c-16-2-20-26-4-38z" fill="#eaf1fb" stroke="#8fb4e3"/>
      <text x="370" y="60" text-anchor="middle" font-weight="600">Internet</text>
      <line x1="370" y1="86" x2="370" y2="128" stroke="#5b6b7f" stroke-width="2"/>
      <text x="380" y="112" font-size="11" fill="#5b6b7f">WAN 80.20.114.6/30</text>
      <rect x="320" y="130" width="100" height="44" rx="8" fill="#1a5fb4"/>
      <circle cx="340" cy="152" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M335 152h10M340 147v10" stroke="#fff" stroke-width="2"/>
      <text x="382" y="157" text-anchor="middle" fill="#fff" font-weight="600">R1</text>
      <g stroke="#5b6b7f" stroke-width="2"><line x1="340" y1="174" x2="110" y2="240"/><line x1="360" y1="174" x2="285" y2="240"/><line x1="380" y1="174" x2="460" y2="240"/><line x1="400" y1="174" x2="630" y2="240"/></g>
      <g font-size="10.5" fill="#5b6b7f"><text x="176" y="200">G0/0 .1</text><text x="238" y="228">G0/1 .65</text><text x="458" y="228">G0/2 .129</text><text x="540" y="200">G0/3 .193</text></g>
      ${[['LAB1', 110, '192.168.10.0/26'], ['LAB2', 285, '192.168.10.64/26'], ['SEGRETERIA', 460, '192.168.10.128/26'], ['WI-FI', 630, '192.168.10.192/26']].map(([n, x, net], i) => `
        <rect x="${x - 48}" y="240" width="96" height="30" rx="5" fill="${i === 3 ? '#fff4e0' : '#e8f5ee'}" stroke="${i === 3 ? '#e0a33a' : '#3f9b6b'}"/>
        <text x="${x}" y="259" text-anchor="middle" font-weight="600">${i === 3 ? 'AP ' : 'SW '}${n}</text>
        <g stroke="#9aa7b5">${[-40, 0, 40].map((d) => `<line x1="${x}" y1="270" x2="${x + d}" y2="310"/>`).join('')}</g>
        ${[-40, 0, 40].map((d) => `<rect x="${x + d - 15}" y="310" width="30" height="20" rx="2" fill="#f4f6f9" stroke="#7c8a99"/><rect x="${x + d - 6}" y="331" width="12" height="4" fill="#7c8a99"/>`).join('')}
        <text x="${x}" y="360" text-anchor="middle" font-family="Consolas, monospace" font-size="11.5">${net}</text>
        <text x="${x}" y="377" text-anchor="middle" font-size="10.5" fill="#5b6b7f">62 host utilizzabili</text>`).join('')}
    </g></svg>`;

  const THREAD_SVG = `<svg viewBox="0 0 720 300" role="img" aria-label="Ciclo di vita di un thread">
    <defs><marker id="st-fr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="#44546a"/></marker></defs>
    <g font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12.5" fill="#1f2d3d">
      ${[['NEW', 70, 150, '#eef2f7'], ['RUNNABLE', 270, 150, '#e3f0ff'], ['TERMINATED', 640, 150, '#eef2f7'], ['BLOCKED', 470, 50, '#fdeaea'], ['WAITING', 470, 150, '#fff4e0'], ['TIMED_WAITING', 470, 250, '#fff4e0']].map(([t, x, y, c]) => `
        <rect x="${x - 62}" y="${y - 20}" width="124" height="40" rx="20" fill="${c}" stroke="#7c8a99"/>
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-weight="600" font-family="Consolas, monospace" font-size="12">${t}</text>`).join('')}
      <g stroke="#44546a" stroke-width="1.6" fill="none" marker-end="url(#st-fr2)">
        <line x1="132" y1="150" x2="206" y2="150"/>
        <path d="M300 130 C340 70 380 55 406 52"/><path d="M406 62 C370 80 340 110 312 132"/>
        <line x1="332" y1="146" x2="406" y2="146"/><line x1="406" y1="156" x2="332" y2="156"/>
        <path d="M300 170 C340 230 380 245 406 248"/><path d="M406 238 C370 220 340 190 312 168"/>
        <path d="M290 172 C360 300 560 300 620 172"/>
      </g>
      <g font-size="11" fill="#44546a">
        <text x="169" y="140" text-anchor="middle">start()</text>
        <text x="330" y="76">attesa lock</text><text x="366" y="104" text-anchor="middle">lock ottenuto</text>
        <text x="369" y="140" text-anchor="middle">wait() / join()</text><text x="369" y="172" text-anchor="middle">notify()</text>
        <text x="322" y="232">sleep(ms)</text>
        <text x="460" y="296" text-anchor="middle">run() termina</text>
      </g></g></svg>`;

  const BOX_SVG = `<svg viewBox="0 0 560 300" role="img" aria-label="Box model CSS">
    <g font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" fill="#1f2d3d">
      <rect x="20" y="20" width="520" height="260" fill="#fbe7c6" stroke="#c9a15a" stroke-dasharray="5 4"/>
      <text x="32" y="40" font-weight="600">margin</text><text x="280" y="40" text-anchor="middle">20px</text>
      <rect x="70" y="55" width="420" height="190" fill="#f6d27d" stroke="#1f2d3d" stroke-width="2"/>
      <text x="82" y="75" font-weight="600">border</text><text x="280" y="75" text-anchor="middle">2px</text>
      <rect x="110" y="88" width="340" height="124" fill="#c4dfb8"/>
      <text x="122" y="106" font-weight="600">padding</text><text x="280" y="106" text-anchor="middle">16px</text>
      <rect x="160" y="120" width="240" height="60" fill="#9cc6e8"/>
      <text x="280" y="148" text-anchor="middle" font-weight="600">content</text>
      <text x="280" y="166" text-anchor="middle" font-family="Consolas, monospace" font-size="11.5">240 × 60</text>
    </g></svg>`;

  // ---------- codice degli esempi ----------
  const J_RUNNABLE = String.raw`
public class Contatore implements Runnable {
    private final String nome;

    public Contatore(String nome) {
        this.nome = nome;
    }

    @Override
    public void run() {
        for (int i = 1; i <= 5; i++) {
            System.out.println(nome + ": " + i);
            try {
                Thread.sleep(100); // simula un lavoro
            } catch (InterruptedException e) {
                return;
            }
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(new Contatore("T1"));
        Thread t2 = new Thread(new Contatore("T2"));
        t1.start();
        t2.start();
        t1.join(); // il main aspetta la fine di t1 e t2
        t2.join();
        System.out.println("Fine del main");
    }
}`;
  const J_CONTO = String.raw`
public class Conto {
    private int saldo = 0;

    // SENZA synchronized: due thread possono leggere lo stesso valore
    public void deposita(int importo) {
        saldo = saldo + importo;
    }

    public int getSaldo() {
        return saldo;
    }

    public static void main(String[] args) throws InterruptedException {
        Conto c = new Conto();
        Runnable r = () -> {
            for (int i = 0; i < 100_000; i++) c.deposita(1);
        };
        Thread a = new Thread(r), b = new Thread(r);
        a.start(); b.start();
        a.join();  b.join();
        System.out.println("Saldo finale: " + c.getSaldo() + " (atteso 200000)");
    }
}`;
  const J_BUFFER = String.raw`
public class Buffer {
    private final int[] dati = new int[5];
    private int quanti = 0, testa = 0, coda = 0;

    public synchronized void inserisci(int x) throws InterruptedException {
        while (quanti == dati.length) wait();   // buffer pieno: il produttore aspetta
        dati[coda] = x;
        coda = (coda + 1) % dati.length;
        quanti++;
        notifyAll();                             // sveglia i consumatori
    }

    public synchronized int preleva() throws InterruptedException {
        while (quanti == 0) wait();              // buffer vuoto: il consumatore aspetta
        int x = dati[testa];
        testa = (testa + 1) % dati.length;
        quanti--;
        notifyAll();
        return x;
    }
}`;
  const H_PAGINA = String.raw`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Il mio primo sito</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Laboratorio 5B</h1>
    <nav>
      <a href="index.html">Home</a>
      <a href="orario.html">Orario</a>
      <a href="progetti.html">Progetti</a>
    </nav>
  </header>
  <main>
    <article class="scheda">
      <h2>Progetto: stazione meteo</h2>
      <p>Arduino, sensore DHT11 e pagina web con i dati.</p>
    </article>
  </main>
  <footer>ITIS - Anno scolastico ${annoScolastico}</footer>
</body>
</html>`;
  const C_STILE = String.raw`
/* style.css */
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f4f6f9;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #1a5fb4;
  color: #ffffff;
}
nav a {
  color: #ffffff;
  margin-left: 16px;
}
.scheda {
  box-sizing: border-box;
  width: 320px;
  margin: 20px;
  padding: 16px;
  border: 2px solid #1f2d3d;
  border-radius: 8px;
  background: #ffffff;
}`;

  // ---------- le lezioni ----------
  // tabella semplice: intestazioni e righe (celle già in HTML)
  const tabella = (testa, righe) => `<div class="st-tabella"><table><thead><tr>${testa.map((t) => `<th>${t}</th>`).join('')}</tr></thead><tbody>${righe.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // ---------- formato delle domande (usato dai file boss-contenuti/esercizi-*.js) ----------
  const domande = {
    S: (d, o, r, s) => ({ t: 'scelta', d, o, r, s }),                // scelta multipla: r = indice della giusta
    VF: (d, r, s) => ({ t: 'vf', d, r, s }),                          // vero/falso
    C: (d, r, s) => ({ t: 'completa', d, r, s }),                     // completa: r = risposte accettate
    A: (d, coppie, s) => ({ t: 'abbina', d, coppie, s }),             // abbina: coppie [sinistra, destra]
    K: (d, campi, s) => ({ t: 'calcolo', d, campi, s }),              // calcolo guidato: campi [etichetta, [risposte]]
    O: (d, modello, chiavi) => ({ t: 'aperta', d, modello, chiavi, s: modello }), // aperta: risposta modello e parole chiave
    G: (g) => ({ t: 'genera', g }),                                   // esercizio nuovo a ogni giro
  };
  // subnetting con numeri sempre nuovi
  function subnetCasuale() {
    const a = [192, 168, Math.floor(Math.random() * 250) + 1, 0], nuovi = 1 + Math.floor(Math.random() * 3), cidr = 24 + nuovi;
    const blocco = 256 >> nuovi, k = Math.floor(Math.random() * (1 << nuovi)), rete = k * blocco;
    const ip = `${a[0]}.${a[1]}.${a[2]}`;
    return { t: 'calcolo', d: `La rete ${ip}.0/24 va divisa in ${1 << nuovi} sottoreti uguali. Completa i dati della sottorete numero ${k + 1}.`,
      campi: [['Maschera (CIDR)', [`/${cidr}`, String(cidr)]], ['Indirizzo di rete', [`${ip}.${rete}`]], ['Broadcast', [`${ip}.${rete + blocco - 1}`]], ['Host utilizzabili', [String(blocco - 2)]]],
      s: `Per ${1 << nuovi} sottoreti servono ${nuovi} bit in più: /${cidr}. Ogni blocco ha ${blocco} indirizzi, quindi la sottorete ${k + 1} va da ${ip}.${rete} (rete) a ${ip}.${rete + blocco - 1} (broadcast), con ${blocco} − 2 = ${blocco - 2} host.` };
  }
  window.BossAiuti = { esc, nota, ide, terminale, figura, tabella, annoScolastico, domande, RETE_SVG, THREAD_SVG, BOX_SVG, J_RUNNABLE, J_CONTO, J_BUFFER, H_PAGINA, C_STILE };

  // ================= NAVIGAZIONE =================
  // materia → argomento → sezioni. La posizione vive solo in memoria: l'indirizzo resta /dispense, nessuna voce
  // nella cronologia; ricaricando si riparte dall'indice.
  const ORDINE = ['sistemi', 'tpsit', 'informatica', 'gpoi', 'inglese', 'matematica', 'italiano', 'storia'];
  const materie = () => ORDINE.map((id) => (window.BossContenuti || {})[id]).filter(Boolean);
  const materia = (id) => (window.BossContenuti || {})[id];
  const argomento = (m, a) => materia(m) && materia(m).argomenti.find((x) => x.id === a);
  // capitolo = l'ultimo capitolo visitato: ogni volta che si aprono le dispense si riparte da lì (solo in memoria:
  // ricaricando la pagina si riparte da un capitolo a caso di Sistemi e Reti). ultimoPer = l'ultimo capitolo di ogni materia
  const st = { vista: 'argomento', m: null, a: null, ultimaM: null, menu: false, capitolo: null, ultimoPer: {} };
  function capitoloIniziale() {
    const m = materia('sistemi') || materie()[0];
    if (!m) return null;
    return { m: m.id, a: m.argomenti[Math.floor(Math.random() * m.argomenti.length)].id };
  }
  // il capitolo da aprire per una materia: l'ultimo letto lì, altrimenti il primo
  const capitoloDi = (mid) => st.ultimoPer[mid] || (materia(mid) && materia(mid).argomenti[0].id);
  let root;

  function html() {
    return `<div class="st-app">
      <header class="st-top">
        <button type="button" class="st-hamburger" data-menu aria-label="Indice">☰</button>
        <div class="st-logo"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="5" width="26" height="17" rx="2" fill="#1a5fb4"/><rect x="6" y="8" width="20" height="11" fill="#eaf1fb"/><path d="M10 12l3 2-3 2M16 16h5" stroke="#1a5fb4" stroke-width="1.6" fill="none"/><rect x="11" y="24" width="10" height="3" rx="1" fill="#1a5fb4"/></svg>
          <div><b>Informatica Facile</b><small>Dispense e materiali per il triennio</small></div></div>
        <nav class="st-nav">${materie().map((m) => `<button type="button" data-vai-m="${m.id}">${m.nome}</button>`).join('')}<button type="button" data-vai-e="esercitazioni">Esercitazioni</button><button type="button" data-vai-e="verifiche">Verifiche</button></nav>
        <label class="st-cerca"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.8"/></svg><input type="search" placeholder="Cerca negli argomenti…" aria-label="Cerca"></label>
        <div class="st-utente"><button type="button" class="st-campana" aria-label="Notifiche">🔔<span class="st-badge" hidden>1</span></button><span class="st-avatar">S</span><span class="st-nome-ut">Studente · 5ªB</span></div>
      </header>
      <div class="st-corpo">
        <aside class="st-indice" id="st-menu"></aside>
        <main class="st-articolo"><div id="st-v-lettura"></div><div id="st-v-esercitazioni" hidden></div><div id="st-v-verifiche" hidden></div></main>
        <aside class="st-lato"><div id="st-toc-box"><p class="st-etichetta">In questa pagina</p><ul id="st-toc"></ul></div>
          <div class="st-box"><p class="st-etichetta">Scadenze</p>
            <ul class="st-scadenze"><li><b>${corta(7)}</b> TPSIT · consegna esercizi sui thread</li><li><b>${corta(14)}</b> Sistemi e Reti · verifica subnetting</li><li><b>${corta(21)}</b> Informatica · progetto SQL</li></ul></div>
          <div class="st-box"><p class="st-etichetta">Materiali allegati</p>
            <ul class="st-allegati"><li>📄 Tabella potenze di 2.pdf</li><li>📄 Esercitazione 3 - testo.pdf</li><li>🗂️ Packet Tracer - lab2.pkt</li></ul></div></aside>
      </div>
      <footer class="st-piede">Informatica Facile · materiale didattico a uso interno · aggiornato il ${breve(0)}/${tra(0).getFullYear()}</footer>
      <div class="st-notifica" hidden role="status"><div class="st-notifica-icona">📎</div>
        <div><b>Nuovo materiale pubblicato</b><p>Prof. M. Rossi ha caricato «Esercitazione subnetting – testo e griglia di correzione».</p><small>Sistemi e Reti · adesso</small></div>
        <button type="button" class="st-chiudi-notifica" aria-label="Chiudi">✕</button></div>
    </div>`;
  }
  // il menu laterale: solo i capitoli della materia in cui si è (su telefono si apre con ☰); la materia si cambia
  // dal selettore nelle briciole o dalla barra in alto
  function menu() {
    const m = materia((al[st.vista] && al[st.vista].m) || st.m) || materie()[0];
    if (!m) return '';
    return `<p class="st-etichetta">${m.nome}</p><ol class="st-lezioni">${m.argomenti.map((a) => {
      const qui = st.vista === 'argomento' && st.m === m.id && st.a === a.id;
      return `<li class="${qui ? 'qui' : ''}"><button type="button" data-vai-a="${m.id}:${a.id}">${a.titolo}</button></li>`;
    }).join('')}</ol>` + `<p class="st-etichetta">Allenamento</p><ol class="st-lezioni"><li class="${st.vista === 'esercitazioni' ? 'qui' : ''}"><button type="button" data-vai-e="esercitazioni">Esercitazioni</button></li><li class="${st.vista === 'verifiche' ? 'qui' : ''}"><button type="button" data-vai-e="verifiche">Verifiche</button></li></ol>`;
  }
  // nelle briciole la materia è un selettore: si cambia materia da qui (anche sul telefono)
  const scegliMateria = (mid) => `<label class="st-sel-materia"><span class="st-nascosto">Materia</span><select data-cambia-m aria-label="Materia">${materie().map((m) => `<option value="${m.id}" ${m.id === mid ? 'selected' : ''}>${m.nome}</option>`).join('')}</select></label>`;
  const briciole = (pezzi) => `<nav class="st-briciole"><button type="button" class="st-link" data-vai-home>Home</button>${pezzi.map(([t, att, grezzo]) => ` <span>›</span> ${grezzo ? t : att ? `<button type="button" class="st-link" ${att}>${t}</button>` : `<b>${t}</b>`}`).join('')}</nav>`;

  function disegna() {
    const lett = root.querySelector('#st-v-lettura');
    root.querySelector('#st-v-lettura').hidden = !['home', 'materia', 'argomento'].includes(st.vista);
    root.querySelector('#st-v-esercitazioni').hidden = st.vista !== 'esercitazioni';
    root.querySelector('#st-v-verifiche').hidden = st.vista !== 'verifiche';
    if (st.vista === 'home') {
      lett.innerHTML = `${briciole([])}<h1>Dispense del quinto anno</h1><p class="st-intro">Scegli una materia e un argomento. Ogni argomento ha la sua pagina; da ogni pagina puoi passare alle esercitazioni sullo stesso argomento.</p>
        <div class="st-schede">${materie().map((m) => `<section class="st-scheda"><h2>${m.nome}</h2><small>${m.prof} · ${m.argomenti.length} argomenti</small><ol>${m.argomenti.map((a) => `<li><button type="button" class="st-link" data-vai-a="${m.id}:${a.id}">${a.titolo}</button></li>`).join('')}</ol></section>`).join('')}</div>`;
    } else if (st.vista === 'materia') {
      const m = materia(st.m);
      lett.innerHTML = `${briciole([[m.nome]])}<h1>${m.nome}</h1><p class="st-intro">${m.prof} · Classe 5ª. Indice degli argomenti:</p>
        <ol class="st-indice-mat">${m.argomenti.map((a, i) => `<li><button type="button" class="st-link" data-vai-a="${m.id}:${a.id}"><b>${i + 1}.</b> ${a.titolo}</button><small>${a.minuti} min di lettura</small></li>`).join('')}</ol>
        <div class="st-fine-lezione"><button type="button" class="st-bt" data-vai-e="esercitazioni">✎ Esercitazioni di ${m.nome}</button><button type="button" class="st-bt secondario" data-vai-e="verifiche">Verifica di ${m.nome}</button></div>`;
    } else if (st.vista === 'argomento') {
      const m = materia(st.m), a = argomento(st.m, st.a), i = m.argomenti.indexOf(a);
      const prec = m.argomenti[i - 1], succ = m.argomenti[i + 1];
      lett.innerHTML = `${briciole([[scegliMateria(m.id), null, true], [a.titolo]])}<h1>${a.titolo}</h1>
        <div class="st-meta"><span class="st-avatar st-avatar-p">${m.prof.split(' ').pop()[0]}</span><span>${m.prof}</span><span>·</span><span>Aggiornato il ${lunga(a.giorni)}</span><span>·</span><span>${a.minuti} min di lettura</span><span class="st-tag">${m.nome}</span><span class="st-tag">Classe 5ª</span></div>
        ${a.corpo()}
        <div class="st-fine-lezione"><button type="button" class="st-bt" data-vai-e="esercitazioni">✎ Esercitati su questo argomento</button><button type="button" class="st-bt secondario">⬇ Scarica PDF</button></div>
        <div class="st-pagine">${prec ? `<button type="button" class="st-link" data-vai-a="${m.id}:${prec.id}">← ${prec.titolo}</button>` : '<span></span>'}${succ ? `<button type="button" class="st-link" data-vai-a="${m.id}:${succ.id}">${succ.titolo} →</button>` : ''}</div>`;
    }
    if (st.vista === 'esercitazioni' || st.vista === 'verifiche') allenamento(st.vista);
    root.querySelector('#st-menu').innerHTML = menu();
    root.querySelector('#st-menu').classList.toggle('aperto', st.menu);
    const toc = st.vista === 'argomento' ? [...lett.querySelectorAll('h2')] : [];
    root.querySelector('#st-toc-box').hidden = !toc.length;
    root.querySelector('#st-toc').innerHTML = toc.map((h) => `<li><a href="#${h.id}" data-sezione="${h.id}">${h.textContent.replace(/^\d+\.\s*/, '')}</a></li>`).join('');
    for (const b of root.querySelectorAll('.st-nav [data-vai-m]')) b.classList.toggle('attiva', st.m === b.dataset.vaiM && (st.vista === 'argomento' || st.vista === 'materia'));
    for (const b of root.querySelectorAll('.st-nav [data-vai-e]')) b.classList.toggle('attiva', st.vista === b.dataset.vaiE);
  }
  function vai(vista, m, a) {
    // la materia porta sempre dentro un capitolo (l'ultimo letto lì o il primo), mai in un indice
    if (vista === 'materia') { vista = 'argomento'; a = capitoloDi(m); }
    st.vista = vista; if (m !== undefined) st.m = m; if (a !== undefined) st.a = a; st.menu = false;
    if (st.m) st.ultimaM = st.m;
    if (vista === 'argomento' && st.m && st.a) { st.capitolo = { m: st.m, a: st.a }; st.ultimoPer[st.m] = st.a; }
    disegna(); root.scrollTop = 0;
  }

  // ================= ESERCITAZIONI E VERIFICHE =================
  const mescola = (x) => { const a = [...x]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (x) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim();
  // una domanda pronta da mostrare: opzioni mescolate, esercizi generati con numeri nuovi
  function prepara(q) {
    if (q.t === 'genera') return prepara(subnetCasuale());
    if (q.t === 'scelta') { const ord = mescola(q.o.map((_, i) => i)); return { ...q, o: ord.map((i) => q.o[i]), r: ord.indexOf(q.r) }; }
    if (q.t === 'abbina') return { ...q, destra: mescola(q.coppie.map((c) => c[1])) };
    return { ...q };
  }
  // corretta? (le domande aperte: se la risposta contiene almeno metà delle parole chiave)
  function corretta(q, r) {
    if (q.t === 'scelta') return Number(r) === q.r;
    if (q.t === 'vf') return r === (q.r ? 'v' : 'f');
    if (q.t === 'completa') return q.r.some((x) => norm(x) === norm(r));
    if (q.t === 'abbina') return q.coppie.every((c, i) => r && r[i] === c[1]);
    if (q.t === 'calcolo') return q.campi.every((c, i) => r && c[1].some((x) => norm(x) === norm(r[i])));
    if (q.t === 'aperta') { const t = norm(r); return !!t && q.chiavi.filter((k) => t.includes(norm(k))).length >= Math.ceil(q.chiavi.length / 2); }
    return false;
  }
  const rispostaGiusta = (q) => ({ scelta: () => q.o[q.r], vf: () => (q.r ? 'Vero' : 'Falso'), completa: () => q.r[0], abbina: () => q.coppie.map((c) => `${c[0]} → ${c[1]}`).join('; '), calcolo: () => q.campi.map((c) => `${c[0]}: ${c[1][0]}`).join('; '), aperta: () => q.modello }[q.t] || (() => ''))();
  function htmlDomanda(q, k, conControlla) {
    const n = `q${k}-${Math.random().toString(36).slice(2, 7)}`;
    let campo = '';
    if (q.t === 'scelta') campo = q.o.map((o, i) => `<label class="st-opz"><input type="radio" name="${n}" value="${i}"> ${esc(o)}</label>`).join('');
    else if (q.t === 'vf') campo = `<label class="st-opz"><input type="radio" name="${n}" value="v"> Vero</label><label class="st-opz"><input type="radio" name="${n}" value="f"> Falso</label>`;
    else if (q.t === 'completa') campo = '<input type="text" class="st-campo" autocomplete="off" spellcheck="false" aria-label="Risposta">';
    else if (q.t === 'abbina') campo = q.coppie.map((c) => `<label class="st-abbina"><span>${esc(c[0])}</span><select><option value="">—</option>${q.destra.map((d) => `<option>${esc(d)}</option>`).join('')}</select></label>`).join('');
    else if (q.t === 'calcolo') campo = q.campi.map((c) => `<label class="st-abbina"><span>${esc(c[0])}</span><input type="text" class="st-campo" autocomplete="off" spellcheck="false"></label>`).join('');
    else if (q.t === 'aperta') campo = '<textarea class="st-campo" rows="3" placeholder="Scrivi la tua risposta…"></textarea>';
    const tipo = { scelta: 'Scelta multipla', vf: 'Vero o falso', completa: 'Completa', abbina: 'Abbina', calcolo: 'Calcolo guidato', aperta: 'Domanda aperta' }[q.t];
    return `<div class="st-domanda" data-k="${k}"><p class="st-dom-testa"><b>${k + 1}.</b> <small>${tipo}</small></p><p>${esc(q.d)}</p><div class="st-risposte">${campo}</div>
      ${conControlla ? '<button type="button" class="st-bt secondario" data-controlla>Controlla</button>' : ''}<div class="st-esito" hidden></div></div>`;
  }
  function leggi(div, q) {
    if (q.t === 'scelta' || q.t === 'vf') { const x = div.querySelector('input[type=radio]:checked'); return x ? x.value : null; }
    if (q.t === 'completa' || q.t === 'aperta') return div.querySelector('.st-campo').value;
    if (q.t === 'abbina') return [...div.querySelectorAll('select')].map((x) => x.value);
    if (q.t === 'calcolo') return [...div.querySelectorAll('.st-campo')].map((x) => x.value);
    return null;
  }
  function mostraEsito(div, q, ok) {
    const e = div.querySelector('.st-esito'); e.hidden = false; e.className = `st-esito ${ok ? 'giusta' : 'sbagliata'}`;
    e.innerHTML = q.t === 'aperta'
      ? `<b>${ok ? '✓ Risposta vicina a quella modello' : '✎ Confronta con la risposta modello'}</b><p>${esc(q.modello)}</p>`
      : `<b>${ok ? '✓ Corretto' : `✗ Risposta giusta: ${esc(rispostaGiusta(q))}`}</b><p>${esc(q.s || '')}</p>`;
  }
  // stato dell'allenamento (resta finché la pagina è aperta)
  const al = { esercitazioni: { m: null, a: 'tutti', domande: null, chiave: null }, verifiche: { m: null, a: 'tutti', n: 15, timer: false, domande: null, fine: null, consegnata: false, chiave: null } };
  function selettori(tipo) {
    const x = al[tipo];
    return `<div class="st-selettori"><label>Materia <select data-sel="m"><option value="">— scegli —</option>${materie().map((m) => `<option value="${m.id}" ${m.id === x.m ? 'selected' : ''}>${m.nome}</option>`).join('')}</select></label>
      ${x.m ? `<label>Argomento <select data-sel="a"><option value="tutti">Tutti gli argomenti</option>${materia(x.m).argomenti.map((a) => `<option value="${a.id}" ${a.id === x.a ? 'selected' : ''}>${a.titolo}</option>`).join('')}</select></label>` : ''}
      ${tipo === 'verifiche' && x.m ? `<label>Domande <select data-sel="n">${[15, 20].map((n) => `<option ${n === x.n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="st-spunta"><input type="checkbox" data-sel="timer" ${x.timer ? 'checked' : ''}> Timer (20 min)</label>` : ''}</div>`;
  }
  function pesca(tipo) {
    const x = al[tipo], E = (window.BossEsercizi || {})[x.m] || {};
    const per = x.a === 'tutti' ? Object.keys(E) : [x.a];
    if (tipo === 'esercitazioni') return mescola(per.flatMap((a) => E[a] || [])).map(prepara);
    // verifica: domande prese a turno dagli argomenti, fino a N
    const code = per.map((a) => mescola(E[a] || []));
    const out = []; let i = 0;
    while (out.length < x.n && code.some((c) => c.length)) { const c = code[i++ % code.length]; if (c.length) out.push(c.pop()); }
    return mescola(out).map(prepara);
  }
  function allenamento(tipo) {
    const box = root.querySelector(`#st-v-${tipo}`), x = al[tipo];
    const chiave = `${x.m}|${x.a}|${x.n}|${x.timer}|${x.domande ? 1 : 0}|${x.consegnata}`;
    if (x.chiave === chiave && box.innerHTML) return; // niente da rifare: le risposte date restano
    x.chiave = chiave;
    const titolo = tipo === 'esercitazioni' ? 'Esercitazioni' : 'Verifiche';
    const testa = `${briciole([[titolo]])}<h1>${titolo}</h1>${selettori(tipo)}`;
    if (!x.m) { box.innerHTML = `${testa}<p class="st-intro">Scegli la materia:</p><div class="st-schede">${materie().map((m) => `<button type="button" class="st-scheda st-scegli" data-scegli-m="${m.id}"><h2>${m.nome}</h2><small>${m.argomenti.length} argomenti</small></button>`).join('')}</div>`; return; }
    if (tipo === 'esercitazioni') {
      x.domande = pesca(tipo);
      box.innerHTML = `${testa}<p class="st-intro">Rispondi e premi «Controlla»: vedrai subito la correzione con la spiegazione. Le domande e le risposte sono mescolate a ogni giro.</p>
        <div class="st-lista">${x.domande.map((q, k) => htmlDomanda(q, k, true)).join('')}</div><div class="st-fine-lezione"><button type="button" class="st-bt" data-giro>↻ Nuovo giro</button></div>`;
      return;
    }
    if (!x.domande) {
      box.innerHTML = `${testa}<p class="st-intro">Prova simulata: ${x.n} domande miste${x.a === 'tutti' ? ' su tutti gli argomenti' : ''}, correzione alla fine con il riepilogo degli errori.${x.timer ? ' Hai 20 minuti.' : ''}</p><button type="button" class="st-bt" data-inizia>Inizia la verifica</button>`;
      return;
    }
    const tempo = x.fine && !x.consegnata ? `<p class="st-timer" data-timer>⏱ ${fmtTempo(x.fine - Date.now())}</p>` : '';
    box.innerHTML = `${testa}${tempo}<div class="st-lista">${x.domande.map((q, k) => htmlDomanda(q, k, false)).join('')}</div>
      <div class="st-fine-lezione"><button type="button" class="st-bt" data-consegna>Consegna</button><button type="button" class="st-bt secondario" data-annulla>Annulla la verifica</button></div><div id="st-risultato"></div>`;
  }
  const fmtTempo = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function consegna() {
    const x = al.verifiche, box = root.querySelector('#st-v-verifiche');
    if (!x.domande || x.consegnata) return;
    x.consegnata = true; x.chiave = `${x.m}|${x.a}|${x.n}|${x.timer}|1|true`; // la pagina resta com'è, si aggiunge il risultato
    let giuste = 0; const errori = [];
    box.querySelectorAll('.st-domanda').forEach((div) => {
      const q = x.domande[Number(div.dataset.k)], ok = corretta(q, leggi(div, q));
      if (ok) giuste++; else errori.push(Number(div.dataset.k));
      mostraEsito(div, q, ok);
      div.querySelectorAll('input, select, textarea').forEach((el) => { el.disabled = true; });
    });
    box.querySelector('[data-consegna]').disabled = true;
    const t = box.querySelector('[data-timer]'); if (t) t.remove();
    box.querySelector('#st-risultato').innerHTML = `<div class="st-risultato"><h2>Punteggio: ${giuste} su ${x.domande.length}</h2>
      ${errori.length ? `<p>Domande da ripassare: ${errori.map((k) => `<b>${k + 1}</b>`).join(', ')} (la correzione è sotto ogni domanda).</p>` : '<p>Nessun errore.</p>'}
      <button type="button" class="st-bt" data-nuova>Nuova verifica</button></div>`;
    box.querySelector('#st-risultato').scrollIntoView({ block: 'center' });
  }

  function avvia(el) {
    root = el;
    st.capitolo = capitoloIniziale();
    if (st.capitolo) vai('argomento', st.capitolo.m, st.capitolo.a); else { st.vista = 'home'; disegna(); }
    root.addEventListener('click', (e) => {
      const t = e.target;
      const b = (sel) => t.closest(sel);
      let x;
      if (b('[data-menu]')) { st.menu = !st.menu; root.querySelector('#st-menu').classList.toggle('aperto', st.menu); if (st.menu) root.scrollTop = 0; return; }
      if (b('[data-vai-home]')) return vai('home', null, null);
      if ((x = b('[data-vai-m]'))) return vai('materia', x.dataset.vaiM, null);
      if ((x = b('[data-vai-a]'))) { const [m, a] = x.dataset.vaiA.split(':'); return vai('argomento', m, a); }
      if ((x = b('[data-vai-e]'))) {
        // contestuale: se stavi leggendo un argomento, si apre sulla sua materia e sul suo argomento
        const tipo = x.dataset.vaiE, al0 = al[tipo];
        // si parte dalla materia in cui si è e, se si stava leggendo un capitolo, proprio da quel capitolo
        if (st.vista === 'argomento') { al0.m = st.m; al0.a = st.a; al0.domande = tipo === 'verifiche' && al0.consegnata ? null : al0.domande; }
        else if (st.vista !== tipo) { const m0 = (al[st.vista] && al[st.vista].m) || st.m; if (m0 && al0.m !== m0) { al0.m = m0; al0.a = st.capitolo && st.capitolo.m === m0 ? st.capitolo.a : 'tutti'; al0.domande = null; } }
        return vai(tipo);
      }
      if ((x = b('[data-scegli-m]'))) { const tipo = st.vista; al[tipo].m = x.dataset.scegliM; al[tipo].a = 'tutti'; st.ultimaM = st.m = al[tipo].m; return disegna(); }
      if ((x = b('[data-sezione]'))) { e.preventDefault(); const h = root.querySelector(`#${x.dataset.sezione}`); if (h) root.scrollTo({ top: h.offsetTop - 70, behavior: 'smooth' }); return; }
      if ((x = b('[data-controlla]'))) { const div = x.closest('.st-domanda'), q = al.esercitazioni.domande[Number(div.dataset.k)]; mostraEsito(div, q, corretta(q, leggi(div, q))); return; }
      if (b('[data-giro]')) { al.esercitazioni.chiave = null; allenamento('esercitazioni'); root.querySelector('#st-v-esercitazioni').scrollIntoView(); return; }
      if (b('[data-inizia]')) { const v = al.verifiche; v.domande = pesca('verifiche'); v.consegnata = false; v.fine = v.timer ? Date.now() + 20 * 60000 : null; return allenamento('verifiche'); }
      if (b('[data-consegna]')) return consegna();
      if (b('[data-annulla]') || b('[data-nuova]')) { const v = al.verifiche; v.domande = null; v.consegnata = false; v.fine = null; return allenamento('verifiche'); }
      if (b('.st-chiudi-notifica')) { root.querySelector('.st-notifica').hidden = true; return; }
      if (b('.st-campana')) { root.querySelector('.st-notifica').hidden = false; root.querySelector('.st-badge').hidden = true; return; }
    });
    root.addEventListener('change', (e) => {
      const cm = e.target.closest('[data-cambia-m]');
      if (cm) return vai('argomento', cm.value, capitoloDi(cm.value));
      const s = e.target.closest('[data-sel]'); if (!s) return;
      const tipo = st.vista, x = al[tipo]; if (!x) return;
      const k = s.dataset.sel;
      if (k === 'm') { x.m = s.value || null; x.a = 'tutti'; if (x.m) st.ultimaM = st.m = x.m; root.querySelector('#st-menu').innerHTML = menu(); }
      else if (k === 'a') x.a = s.value;
      else if (k === 'n') x.n = Number(s.value);
      else if (k === 'timer') x.timer = s.checked;
      if (tipo === 'verifiche') { x.domande = null; x.consegnata = false; x.fine = null; }
      allenamento(tipo);
    });
    // ricerca: va al primo argomento il cui titolo contiene il testo
    root.querySelector('.st-cerca input').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = norm(e.target.value);
      for (const m of materie()) for (const a of m.argomenti) if (q && norm(a.titolo).includes(q)) { e.target.value = ''; return vai('argomento', m.id, a.id); }
      e.target.value = ''; e.target.placeholder = 'Nessun argomento trovato';
    });
    // il timer della verifica: allo scadere si consegna da sola
    setInterval(() => {
      const v = al.verifiche; if (!v.fine || v.consegnata || !root) return;
      const t = root.querySelector('[data-timer]'); if (t) t.textContent = `⏱ ${fmtTempo(v.fine - Date.now())}`;
      if (Date.now() >= v.fine) consegna();
    }, 1000);
  }
  // l'indirizzo resta sempre /dispense: la posizione nelle dispense non va nell'URL
  function query() { return ''; }

  let notificata = false;
  function mostrata() {
    // a ogni apertura si riapre l'ultimo capitolo visitato (mai un indice)
    if (st.capitolo && root) vai('argomento', st.capitolo.m, st.capitolo.a);
    if (notificata) return;
    notificata = true;
    setTimeout(() => {
      if (!window.Boss || !window.Boss.attivo) { notificata = false; return; }
      root.querySelector('.st-notifica').hidden = false;
      root.querySelector('.st-badge').hidden = false;
      setTimeout(() => { root.querySelector('.st-notifica').hidden = true; }, 7000);
    }, 3500 + Math.random() * 2500);
  }

  return { html, avvia, query, mostrata, _test: { corretta, prepara, norm, subnetCasuale, ORDINE, stato: () => st, esercizi: () => al } };
})();
