// DISPENSE — Sistemi e Reti: gli argomenti, ognuno con la sua pagina (usa gli aiuti di boss-pagina.js: nota, ide, terminale, figura…).
(() => {
  const { nota, ide, terminale, figura, tabella, RETE_SVG } = window.BossAiuti;
  void ide; void figura;
  // ---------- schemi e codice degli argomenti NAT, IPv6, crittografia, TLS/VPN, wireless, backup ----------
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
  const MONO = 'font-family="Consolas, monospace"';
  const freccia = (id, colore) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="${colore}"/></marker>`;
  const pc = (x, y) => `<rect x="${x}" y="${y}" width="34" height="22" rx="2" fill="#f4f6f9" stroke="#7c8a99"/><rect x="${x + 11}" y="${y + 23}" width="12" height="4" fill="#7c8a99"/>`;

  const NAT_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 250" role="img" aria-label="Traduzione degli indirizzi con il PAT">
    <defs>${freccia('st-fr-nat', '#5b6b7f')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="10" y="44" width="200" height="190" rx="10" fill="#e8f5ee" stroke="#3f9b6b"/>
      <text x="110" y="66" text-anchor="middle" font-weight="600">LAN 192.168.10.0/24</text>
      ${[['.37', 88], ['.38', 138], ['.40', 188]].map(([h, y]) => `${pc(26, y)}<text x="70" y="${y + 16}" ${MONO} font-size="12.5">192.168.10${h}</text>
        <line x1="184" y1="${y + 11}" x2="252" y2="140" stroke="#5b6b7f" stroke-width="1.6"/>`).join('')}
      <rect x="252" y="116" width="104" height="48" rx="8" fill="#1a5fb4"/>
      <text x="304" y="137" text-anchor="middle" fill="#fff" font-weight="600">R1</text>
      <text x="304" y="155" text-anchor="middle" fill="#fff" font-size="11.5">NAT / PAT</text>
      <text x="236" y="108" font-size="11" fill="#5b6b7f">inside</text><text x="356" y="108" font-size="11" fill="#5b6b7f">outside</text>
      <line x1="356" y1="140" x2="440" y2="140" stroke="#5b6b7f" stroke-width="2"/>
      <ellipse cx="530" cy="140" rx="96" ry="58" fill="#eaf1fb" stroke="#8fb4e3"/>
      <text x="530" y="124" text-anchor="middle" font-weight="600">Internet</text>
      <text x="530" y="145" text-anchor="middle" font-size="12">server web</text>
      <text x="530" y="164" text-anchor="middle" ${MONO} font-size="12">93.184.215.14:443</text>
      <rect x="36" y="4" width="226" height="28" rx="5" fill="#fff4e0" stroke="#e0a33a"/>
      <text x="149" y="23" text-anchor="middle" ${MONO} font-size="12.5">src 192.168.10.37:51000</text>
      <line x1="266" y1="18" x2="352" y2="18" stroke="#5b6b7f" stroke-width="1.6" marker-end="url(#st-fr-nat)"/>
      <text x="309" y="44" text-anchor="middle" font-size="11" fill="#5b6b7f">traduzione</text>
      <rect x="358" y="4" width="210" height="28" rx="5" fill="#e3f0ff" stroke="#1a5fb4"/>
      <text x="463" y="23" text-anchor="middle" ${MONO} font-size="12.5">src 80.20.114.6:1025</text>
    </g></svg>`;

  const IPV6_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 160" role="img" aria-label="Struttura di un indirizzo IPv6 globale">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="20" y="20" width="225" height="62" fill="#e3f0ff" stroke="#1a5fb4"/>
      <rect x="245" y="20" width="75" height="62" fill="#e8f5ee" stroke="#3f9b6b"/>
      <rect x="320" y="20" width="300" height="62" fill="#fff4e0" stroke="#e0a33a"/>
      <text x="132" y="44" text-anchor="middle" font-weight="600">Prefisso globale · 48 bit</text>
      <text x="132" y="68" text-anchor="middle" ${MONO}>2001:db8:acad</text>
      <text x="282" y="44" text-anchor="middle" font-weight="600">Subnet</text>
      <text x="282" y="68" text-anchor="middle" ${MONO}>0010</text>
      <text x="470" y="44" text-anchor="middle" font-weight="600">Interface ID · 64 bit</text>
      <text x="470" y="68" text-anchor="middle" ${MONO}>0000:0000:0000:0025</text>
      <g stroke="#5b6b7f" stroke-width="1.4" fill="none"><path d="M20 96v8h300v-8"/><path d="M322 96v8h298v-8"/></g>
      <text x="170" y="124" text-anchor="middle" font-size="12.5">prefisso della sottorete: /64</text>
      <text x="470" y="124" text-anchor="middle" font-size="12.5">l'host dentro la sottorete</text>
      <text x="320" y="150" text-anchor="middle" ${MONO} font-size="12.5" fill="#1a5fb4">2001:db8:acad:10::25/64</text>
    </g></svg>`;

  const CRIPTO_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 220" role="img" aria-label="Cifratura asimmetrica tra Alice e Bob">
    <defs>${freccia('st-fr-cr', '#5b6b7f')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <text x="65" y="54" text-anchor="middle" font-weight="600">Alice</text>
      <text x="335" y="54" text-anchor="middle" font-style="italic" fill="#5b6b7f">in rete</text>
      <text x="605" y="54" text-anchor="middle" font-weight="600">Bob</text>
      ${[[10, 'Testo in chiaro', 'Voto: 8', '#f4f6f9', '#1f2d3d'], [145, 'Cifra', 'RSA', '#1a5fb4', '#fff'], [280, 'Testo cifrato', 'x9#Fq2!aL', '#fdeaea', '#1f2d3d'], [415, 'Decifra', 'RSA', '#1a5fb4', '#fff'], [550, 'Testo in chiaro', 'Voto: 8', '#f4f6f9', '#1f2d3d']].map(([x, t, v, f, c]) => `
        <rect x="${x}" y="66" width="110" height="56" rx="8" fill="${f}" stroke="#7c8a99"/>
        <text x="${x + 55}" y="89" text-anchor="middle" font-weight="600" fill="${c}">${t}</text>
        <text x="${x + 55}" y="110" text-anchor="middle" ${MONO} font-size="12" fill="${c}">${v}</text>`).join('')}
      <g stroke="#5b6b7f" stroke-width="1.6" marker-end="url(#st-fr-cr)">${[120, 255, 390, 525].map((x) => `<line x1="${x}" y1="94" x2="${x + 23}" y2="94"/>`).join('')}</g>
      <g stroke-width="2" fill="none"><circle cx="186" cy="150" r="7" stroke="#3f9b6b"/><path d="M193 150h22m-6 0v7m-6-7v5" stroke="#3f9b6b"/>
        <circle cx="456" cy="150" r="7" stroke="#c5483c"/><path d="M463 150h22m-6 0v7m-6-7v5" stroke="#c5483c"/></g>
      <text x="200" y="180" text-anchor="middle" font-size="12" fill="#2f7d55">chiave PUBBLICA di Bob</text>
      <text x="470" y="180" text-anchor="middle" font-size="12" fill="#a33a30">chiave PRIVATA di Bob</text>
      <text x="340" y="210" text-anchor="middle" font-size="12" fill="#5b6b7f">Solo chi possiede la chiave privata di Bob può leggere il messaggio.</text>
    </g></svg>`;

  const TLS_SVG = `<svg class="st-svg-largo" viewBox="0 0 640 330" role="img" aria-label="Handshake TLS 1.3">
    <defs>${freccia('st-fr-tls', '#44546a')}</defs>
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="120" y="136" width="400" height="170" fill="#fff7e8"/>
      <text x="320" y="300" text-anchor="middle" font-size="11.5" fill="#a0702a">dentro l'area colorata i messaggi viaggiano cifrati</text>
      <rect x="60" y="8" width="120" height="32" rx="6" fill="#e3f0ff" stroke="#1a5fb4"/><text x="120" y="29" text-anchor="middle" font-weight="600">Client</text>
      <rect x="460" y="8" width="120" height="32" rx="6" fill="#e8f5ee" stroke="#3f9b6b"/><text x="520" y="29" text-anchor="middle" font-weight="600">Server</text>
      <g stroke="#9aa7b5" stroke-dasharray="4 4"><line x1="120" y1="40" x2="120" y2="320"/><line x1="520" y1="40" x2="520" y2="320"/></g>
      <g stroke="#44546a" stroke-width="1.6" marker-end="url(#st-fr-tls)">
        <line x1="122" y1="80" x2="516" y2="80"/><line x1="518" y1="122" x2="124" y2="122"/><line x1="518" y1="162" x2="124" y2="162"/>
        <line x1="122" y1="204" x2="516" y2="204"/><line x1="122" y1="240" x2="516" y2="240"/><line x1="518" y1="276" x2="124" y2="276"/></g>
      <text x="320" y="72" text-anchor="middle">ClientHello · cipher suite · key share (ECDHE)</text>
      <text x="320" y="114" text-anchor="middle">ServerHello · key share</text>
      <text x="320" y="154" text-anchor="middle">Certificate · CertificateVerify · Finished</text>
      <text x="320" y="196" text-anchor="middle">Finished</text>
      <text x="320" y="232" text-anchor="middle" ${MONO} font-size="12.5">GET / HTTP/1.1</text>
      <text x="320" y="268" text-anchor="middle" ${MONO} font-size="12.5">HTTP/1.1 200 OK</text>
      <text x="40" y="128" text-anchor="middle" font-size="11.5" fill="#5b6b7f">1 RTT</text>
      <path d="M58 80v80" stroke="#5b6b7f" stroke-width="1.4"/><path d="M54 80h8M54 160h8" stroke="#5b6b7f" stroke-width="1.4"/>
    </g></svg>`;

  const VPN_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 260" role="img" aria-label="VPN site-to-site e di accesso remoto">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="8" y="40" width="168" height="96" rx="10" fill="#e8f5ee" stroke="#3f9b6b"/>
      <text x="92" y="66" text-anchor="middle" font-weight="600">Sede</text><text x="92" y="86" text-anchor="middle" ${MONO} font-size="12">192.168.10.0/24</text>
      ${pc(54, 98)}${pc(100, 98)}
      <rect x="504" y="40" width="168" height="96" rx="10" fill="#e8f5ee" stroke="#3f9b6b"/>
      <text x="588" y="66" text-anchor="middle" font-weight="600">Succursale</text><text x="588" y="86" text-anchor="middle" ${MONO} font-size="12">192.168.20.0/24</text>
      ${pc(550, 98)}${pc(596, 98)}
      <ellipse cx="340" cy="88" rx="96" ry="62" fill="#eaf1fb" stroke="#8fb4e3"/>
      <text x="340" y="50" text-anchor="middle" font-weight="600">Internet</text>
      <path d="M222 112 L300 200" stroke="#e0a33a" stroke-width="12" stroke-linecap="round" opacity=".45"/>
      <path d="M222 112 L300 200" stroke="#a0702a" stroke-width="1.5" stroke-dasharray="5 4"/>
      <rect x="226" y="78" width="228" height="20" rx="10" fill="#fff4e0" stroke="#e0a33a" stroke-width="2"/>
      <line x1="232" y1="88" x2="448" y2="88" stroke="#a0702a" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="340" y="124" text-anchor="middle" font-size="12">tunnel IPsec (site-to-site)</text>
      <rect x="182" y="68" width="48" height="40" rx="6" fill="#1a5fb4"/><text x="206" y="93" text-anchor="middle" fill="#fff" font-weight="600" font-size="12">FW1</text>
      <rect x="450" y="68" width="48" height="40" rx="6" fill="#1a5fb4"/><text x="474" y="93" text-anchor="middle" fill="#fff" font-weight="600" font-size="12">FW2</text>
      <rect x="290" y="196" width="46" height="28" rx="3" fill="#f4f6f9" stroke="#7c8a99"/><path d="M282 226h62l-6 6h-50z" fill="#7c8a99"/>
      <text x="356" y="210" font-weight="600">docente da casa</text>
      <text x="356" y="228" font-size="12">VPN di accesso remoto (WireGuard)</text>
    </g></svg>`;

  const WIFI_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 280" role="img" aria-label="Rete wireless della scuola">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <rect x="286" y="10" width="108" height="40" rx="8" fill="#1a5fb4"/><text x="340" y="35" text-anchor="middle" fill="#fff" font-weight="600">Router / FW</text>
      <rect x="286" y="88" width="108" height="34" rx="5" fill="#e8f5ee" stroke="#3f9b6b"/><text x="340" y="110" text-anchor="middle" font-weight="600">Switch</text>
      <rect x="20" y="88" width="150" height="34" rx="5" fill="#f4f6f9" stroke="#7c8a99"/><text x="95" y="110" text-anchor="middle" font-weight="600">Server RADIUS</text>
      <rect x="510" y="88" width="150" height="34" rx="5" fill="#f4f6f9" stroke="#7c8a99"/><text x="585" y="110" text-anchor="middle" font-weight="600">Controller Wi-Fi</text>
      <g stroke="#5b6b7f" stroke-width="2"><line x1="340" y1="50" x2="340" y2="88"/><line x1="170" y1="105" x2="286" y2="105"/><line x1="394" y1="105" x2="510" y2="105"/>
        <line x1="320" y1="122" x2="200" y2="168"/><line x1="360" y1="122" x2="480" y2="168"/></g>
      <text x="255" y="138" text-anchor="end" font-size="11" fill="#5b6b7f">trunk (VLAN 20, 99)</text>
      ${[200, 480].map((x, i) => `<rect x="${x - 34}" y="168" width="68" height="26" rx="13" fill="#fff4e0" stroke="#e0a33a"/>
        <text x="${x}" y="186" text-anchor="middle" font-weight="600" font-size="12">AP${i + 1}</text>
        <g fill="none" stroke="#e0a33a" stroke-width="2"><path d="M${x - 14} 162a20 20 0 0 1 28 0"/><path d="M${x - 24} 155a34 34 0 0 1 48 0"/></g>`).join('')}
      ${[[120, '#1a5fb4'], [200, '#1a5fb4'], [280, '#3f9b6b'], [400, '#1a5fb4'], [480, '#3f9b6b'], [560, '#3f9b6b']].map(([x, c]) => `<rect x="${x - 10}" y="214" width="20" height="30" rx="4" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('')}
      <rect x="20" y="254" width="12" height="12" fill="#1a5fb4"/><text x="38" y="265" font-size="12">SSID Staff → VLAN 20, WPA3-Enterprise (802.1X)</text>
      <rect x="370" y="254" width="12" height="12" fill="#3f9b6b"/><text x="388" y="265" font-size="12">SSID Ospiti → VLAN 99, solo Internet</text>
    </g></svg>`;

  const disco = (x, titolo, blocchi) => `<rect x="${x}" y="52" width="90" height="148" fill="#eef2f7" stroke="#7c8a99"/><ellipse cx="${x + 45}" cy="52" rx="45" ry="10" fill="#dfe6ee" stroke="#7c8a99"/>
    ${blocchi.map((b, i) => `<rect x="${x + 10}" y="${76 + i * 38}" width="70" height="28" rx="4" fill="${b.endsWith('p') ? '#fff4e0' : '#e3f0ff'}" stroke="${b.endsWith('p') ? '#e0a33a' : '#1a5fb4'}"/>
      <text x="${x + 45}" y="${95 + i * 38}" text-anchor="middle" ${MONO} font-weight="600">${b.endsWith('p') ? b[0] + '<tspan font-size="10">P</tspan>' : b}</text>`).join('')}
    <text x="${x + 45}" y="220" text-anchor="middle" font-size="12">${titolo}</text>`;
  const RAID_SVG = `<svg class="st-svg-largo" viewBox="0 0 680 240" role="img" aria-label="RAID 1 e RAID 5">
    <g ${FONT} font-size="13" fill="#1f2d3d">
      <text x="140" y="22" text-anchor="middle" font-weight="600">RAID 1 – mirroring</text>
      <text x="505" y="22" text-anchor="middle" font-weight="600">RAID 5 – parità distribuita</text>
      ${disco(40, 'Disco 1', ['A1', 'A2', 'A3'])}${disco(150, 'Disco 2', ['A1', 'A2', 'A3'])}
      <line x1="290" y1="30" x2="290" y2="230" stroke="#c8d1dc" stroke-dasharray="4 4"/>
      ${disco(330, 'Disco 1', ['A1', 'B1', 'Cp'])}${disco(440, 'Disco 2', ['A2', 'Bp', 'C1'])}${disco(550, 'Disco 3', ['Ap', 'B2', 'C2'])}
    </g></svg>`;

  const J_HASH = String.raw`
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public class Impronta {
    public static String sha256(String testo) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(testo.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash); // 32 byte = 64 cifre esadecimali
    }

    public static void main(String[] args) throws NoSuchAlgorithmException {
        System.out.println(sha256("ciao"));
        System.out.println(sha256("Ciao"));
        // integrità: si confronta l'impronta ricevuta con quella ricalcolata
        String attesa = "b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2";
        System.out.println(sha256("ciao").equals(attesa) ? "Integro" : "Modificato");
    }
}`;
  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.sistemi = {
    id: 'sistemi', nome: 'Sistemi e Reti',
    argomenti: [
      { id: 'osi', titolo: 'Il modello ISO/OSI', minuti: 12, giorni: -30, corpo: () => `
        <p class="st-intro">Il modello <b>ISO/OSI</b> (Open Systems Interconnection) divide la comunicazione in rete in <b>7 livelli</b>. Ogni livello offre servizi a quello superiore e usa quelli del livello inferiore: così ogni parte si può progettare e cambiare senza toccare le altre.</p>
        <h2 id="st-s1">1. I sette livelli</h2>
        ${tabella(['N.', 'Livello', 'Funzione', 'Esempi', 'Unità di dati'], [
          ['7', 'Applicazione', 'Servizi per l\'utente e i programmi', 'HTTP, SMTP, DNS, FTP', 'dati'],
          ['6', 'Presentazione', 'Formato dei dati, codifica, cifratura, compressione', 'TLS, JPEG, UTF-8', 'dati'],
          ['5', 'Sessione', 'Apertura, gestione e chiusura del dialogo', 'RPC, NetBIOS', 'dati'],
          ['4', 'Trasporto', 'Comunicazione tra processi, affidabilità, controllo di flusso', 'TCP, UDP', 'segmento'],
          ['3', 'Rete', 'Indirizzamento logico e instradamento', 'IP, ICMP', 'pacchetto'],
          ['2', 'Collegamento', 'Consegna sulla stessa rete, indirizzi fisici, rilevazione errori', 'Ethernet, Wi-Fi (802.11)', 'frame'],
          ['1', 'Fisico', 'Trasmissione dei bit sul mezzo', 'cavo UTP, fibra, onde radio', 'bit'],
        ])}
        <h2 id="st-s2">2. Incapsulamento</h2>
        <p>Scendendo dai livelli alti verso il fisico, ogni livello aggiunge al dato una propria <b>intestazione</b> (header): è l'<b>incapsulamento</b>. Il destinatario fa il percorso inverso (<b>decapsulamento</b>) e ogni livello legge solo l'intestazione che gli spetta.</p>
        <ul><li>Livello 4: header TCP (porte, numeri di sequenza).</li><li>Livello 3: header IP (indirizzi IP di origine e destinazione).</li><li>Livello 2: header e trailer Ethernet (indirizzi MAC, FCS per il controllo errori).</li></ul>
        ${nota('info', 'Per ricordarli', 'Dal basso: «<b>F</b>isico, <b>C</b>ollegamento, <b>R</b>ete, <b>T</b>rasporto, <b>S</b>essione, <b>P</b>resentazione, <b>A</b>pplicazione».')}
        <h2 id="st-s3">3. Dispositivi e livelli</h2>
        <ul><li><b>Hub</b> e ripetitori: livello 1 (ripetono i bit su tutte le porte).</li><li><b>Switch</b>: livello 2 (inoltrano i frame in base al MAC).</li><li><b>Router</b>: livello 3 (instradano i pacchetti in base all'IP).</li></ul>
        ${nota('avviso', 'Attenzione', 'ISO/OSI è un modello di riferimento: Internet usa in pratica la pila TCP/IP, che accorpa alcuni livelli.')}` },
      { id: 'tcpip', titolo: 'Il modello TCP/IP', minuti: 10, giorni: -27, corpo: () => `
        <p class="st-intro">La pila <b>TCP/IP</b> è il modello usato davvero in Internet. Ha <b>4 livelli</b> (in alcuni testi 5, separando fisico e collegamento).</p>
        <h2 id="st-s1">1. Confronto con ISO/OSI</h2>
        ${tabella(['TCP/IP', 'Corrisponde in ISO/OSI a', 'Protocolli'], [
          ['Applicazione', 'Applicazione, Presentazione, Sessione', 'HTTP, HTTPS, DNS, DHCP, SMTP, IMAP, SSH'],
          ['Trasporto', 'Trasporto', 'TCP, UDP'],
          ['Internet', 'Rete', 'IPv4, IPv6, ICMP, ARP*'],
          ['Accesso alla rete', 'Collegamento e Fisico', 'Ethernet, Wi-Fi, PPP'],
        ])}
        <p><small>* ARP lavora tra livello 2 e livello 3: traduce un indirizzo IP nell'indirizzo MAC corrispondente.</small></p>
        <h2 id="st-s2">2. Porte e socket</h2>
        <p>Al livello di trasporto ogni applicazione è identificata da un numero di <b>porta</b> (16 bit, da 0 a 65535). La coppia <i>indirizzo IP + porta</i> si chiama <b>socket</b>.</p>
        ${tabella(['Porta', 'Servizio'], [['20/21', 'FTP'], ['22', 'SSH'], ['25', 'SMTP'], ['53', 'DNS'], ['67/68', 'DHCP'], ['80', 'HTTP'], ['443', 'HTTPS']])}
        <h2 id="st-s3">3. Strumenti da terminale</h2>
        ${terminale('Prompt dei comandi', 'C:\\> ipconfig /all\nC:\\> ping 8.8.8.8\nC:\\> tracert www.example.com\nC:\\> netstat -an', 'ipconfig mostra la configurazione, ping verifica la raggiungibilità (ICMP), tracert mostra i router attraversati, netstat le connessioni aperte.')}` },
      { id: 'ipv4', titolo: 'Indirizzamento IPv4 e subnetting', minuti: 14, giorni: -24, corpo: () => `
        <p class="st-intro">Ogni dispositivo collegato a una rete IP ha bisogno di un indirizzo che lo identifichi. In questa lezione vediamo com'è fatto un indirizzo IPv4, a cosa serve la <b>subnet mask</b> e come si divide una rete in sottoreti più piccole, con un esempio completo sulla rete del nostro istituto.</p>
        <h2 id="st-s1">1. Com'è fatto un indirizzo IPv4</h2>
        <p>Un indirizzo IPv4 è un numero di <b>32 bit</b>. Per leggerlo più facilmente lo scriviamo in <i>notazione decimale puntata</i>: quattro numeri da 0 a 255 (gli <b>ottetti</b>), separati da un punto.</p>
        <div class="st-tabella"><table><thead><tr><th>Decimale</th><th>192</th><th>168</th><th>10</th><th>37</th></tr></thead>
          <tbody><tr><td>Binario</td><td><code>11000000</code></td><td><code>10101000</code></td><td><code>00001010</code></td><td><code>00100101</code></td></tr></tbody></table></div>
        <p>L'indirizzo è diviso in due parti: la <b>parte di rete</b>, uguale per tutti i dispositivi della stessa rete, e la <b>parte host</b>, che identifica il singolo dispositivo.</p>
        <h2 id="st-s2">2. La subnet mask</h2>
        <p>La subnet mask indica quanti bit appartengono alla rete. Ha tutti 1 nella parte di rete e tutti 0 nella parte host. Si può scrivere per esteso (<code>255.255.255.0</code>) o in notazione <b>CIDR</b> (<code>/24</code>, cioè 24 bit a 1).</p>
        <p>Per trovare l'indirizzo di rete si fa l'<b>AND bit a bit</b> tra indirizzo e maschera. Con <code>192.168.10.37/24</code> otteniamo la rete <code>192.168.10.0</code> e il broadcast <code>192.168.10.255</code>: restano 2<sup>8</sup> − 2 = <b>254 host</b> utilizzabili.</p>
        ${nota('info', 'Indirizzi privati (RFC 1918)', 'Non sono instradati su Internet e si usano nelle reti locali: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> e <code>192.168.0.0/16</code>. Per uscire su Internet il router usa il NAT.')}
        <h2 id="st-s3">3. Esempio: la rete dell'istituto</h2>
        <p>Dobbiamo dividere <code>192.168.10.0/24</code> in <b>4 sottoreti</b> uguali: due laboratori, la segreteria e il Wi-Fi. Per avere 4 sottoreti servono 2 bit in più (2<sup>2</sup> = 4), quindi la nuova maschera è <code>/26</code> (<code>255.255.255.192</code>). Ogni sottorete ha 2<sup>6</sup> − 2 = <b>62 host</b>.</p>
        <div class="st-tabella"><table><thead><tr><th>Sottorete</th><th>Indirizzo di rete</th><th>Primo host (gateway)</th><th>Ultimo host</th><th>Broadcast</th></tr></thead><tbody>
          <tr><td>LAB1</td><td><code>192.168.10.0/26</code></td><td><code>.1</code></td><td><code>.62</code></td><td><code>.63</code></td></tr>
          <tr><td>LAB2</td><td><code>192.168.10.64/26</code></td><td><code>.65</code></td><td><code>.126</code></td><td><code>.127</code></td></tr>
          <tr><td>SEGRETERIA</td><td><code>192.168.10.128/26</code></td><td><code>.129</code></td><td><code>.190</code></td><td><code>.191</code></td></tr>
          <tr><td>WI-FI</td><td><code>192.168.10.192/26</code></td><td><code>.193</code></td><td><code>.254</code></td><td><code>.255</code></td></tr></tbody></table></div>
        ${figura(RETE_SVG, 'Figura 1 – Topologia logica: il router R1 ha un\'interfaccia per ogni sottorete e fa da gateway.')}
        <h2 id="st-s4">4. Verifica dalla riga di comando</h2>
        <p>Da un PC del LAB1 controlliamo la configurazione con <code>ipconfig</code> e proviamo a raggiungere il gateway con <code>ping</code>. La maschera <code>255.255.255.192</code> conferma che il PC è nella sottorete /26.</p>
        ${terminale('Prompt dei comandi', String.raw`
C:\Users\studente>ipconfig

Configurazione IP di Windows

Scheda Ethernet Ethernet:

   Suffisso DNS specifico per connessione: lab.itis.local
   Indirizzo IPv4. . . . . . . . . . . . : 192.168.10.37
   Subnet mask . . . . . . . . . . . . . : 255.255.255.192
   Gateway predefinito . . . . . . . . . : 192.168.10.1

C:\Users\studente>ping 192.168.10.1

Esecuzione di Ping 192.168.10.1 con 32 byte di dati:
Risposta da 192.168.10.1: byte=32 durata<1ms TTL=255
Risposta da 192.168.10.1: byte=32 durata<1ms TTL=255
Risposta da 192.168.10.1: byte=32 durata=1ms TTL=255
Risposta da 192.168.10.1: byte=32 durata<1ms TTL=255

Statistiche Ping per 192.168.10.1:
    Pacchetti: Trasmessi = 4, Ricevuti = 4, Persi = 0 (0% persi),

C:\Users\studente>`, 'Figura 2 – Output di ipconfig e ping su un PC del laboratorio.')}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Dato l'indirizzo <code>172.16.45.130/20</code>, calcola indirizzo di rete, broadcast e numero di host.</li>
          <li>Dividi <code>10.0.8.0/22</code> in 8 sottoreti uguali e scrivi la tabella come nell'esempio.</li>
          <li>Il PC <code>192.168.10.70/26</code> può comunicare direttamente con <code>192.168.10.60/26</code>? Motiva la risposta.</li>
        </ol>
        ${nota('avviso', 'Per la verifica', 'Portate la calcolatrice non programmabile: le conversioni binario ↔ decimale vanno fatte a mano.')}` },
      { id: 'dns', titolo: 'DNS: il sistema dei nomi', minuti: 9, giorni: -20, corpo: () => `
        <p class="st-intro">Il <b>DNS</b> (Domain Name System) traduce i nomi di dominio, come <code>www.scuola.it</code>, negli indirizzi IP che servono per comunicare. È un database <b>distribuito</b> e <b>gerarchico</b>.</p>
        <h2 id="st-s1">1. La gerarchia dei domini</h2>
        <p>Si legge da destra a sinistra: la <b>radice</b> (il punto finale, di solito sottinteso), i domini di primo livello (<b>TLD</b>: <code>.it</code>, <code>.com</code>, <code>.org</code>), i domini di secondo livello (<code>scuola.it</code>) e i nomi degli host (<code>www</code>).</p>
        <h2 id="st-s2">2. Come avviene una risoluzione</h2>
        <ol><li>Il PC chiede il nome al suo <b>resolver</b> (di solito il DNS del router o del provider).</li><li>Se non ha la risposta in cache, il resolver interroga un <b>root server</b>, che lo rimanda ai server del TLD <code>.it</code>.</li><li>I server <code>.it</code> lo rimandano ai server <b>autoritativi</b> di <code>scuola.it</code>, che danno la risposta.</li><li>La risposta resta in <b>cache</b> per il tempo indicato dal <b>TTL</b>.</li></ol>
        <h2 id="st-s3">3. I record principali</h2>
        ${tabella(['Record', 'Significato'], [['A', 'nome → indirizzo IPv4'], ['AAAA', 'nome → indirizzo IPv6'], ['CNAME', 'alias verso un altro nome'], ['MX', 'server di posta del dominio'], ['NS', 'server autoritativi del dominio'], ['PTR', 'indirizzo → nome (risoluzione inversa)']])}
        ${terminale('Terminale', '$ nslookup www.example.com\nServer:  192.168.1.1\nName:    www.example.com\nAddress: 93.184.215.14', 'nslookup (o dig su Linux) interroga il DNS.')}
        ${nota('info', 'Trasporto', 'Il DNS usa soprattutto UDP sulla porta 53; usa TCP per risposte grandi e per i trasferimenti di zona tra server.')}` },
      { id: 'dhcp', titolo: 'DHCP: configurazione automatica', minuti: 8, giorni: -18, corpo: () => `
        <p class="st-intro">Il <b>DHCP</b> (Dynamic Host Configuration Protocol) assegna in automatico a ogni dispositivo la configurazione di rete: indirizzo IP, subnet mask, gateway predefinito e server DNS.</p>
        <h2 id="st-s1">1. Lo scambio DORA</h2>
        ${tabella(['Messaggio', 'Da → a', 'Significato'], [['Discover', 'client → broadcast', 'c\'è un server DHCP?'], ['Offer', 'server → client', 'ti propongo questo indirizzo'], ['Request', 'client → broadcast', 'accetto l\'offerta di quel server'], ['Acknowledge', 'server → client', 'confermato, ecco la configurazione']])}
        <p>Il client usa la porta UDP <b>68</b>, il server la porta UDP <b>67</b>. All'inizio il client non ha un indirizzo, perciò Discover e Request viaggiano in broadcast (<code>255.255.255.255</code>).</p>
        <h2 id="st-s2">2. Lease, pool e prenotazioni</h2>
        <ul><li><b>Pool</b>: l'intervallo di indirizzi che il server può assegnare.</li><li><b>Lease</b>: la durata del prestito; a metà del tempo il client prova a rinnovarlo.</li><li><b>Prenotazione</b>: un indirizzo fisso legato al MAC di un dispositivo (utile per stampanti e server).</li><li><b>Esclusioni</b>: indirizzi del pool da non assegnare (per esempio quello del router).</li></ul>
        ${nota('avviso', 'Attenzione', 'Se non trova un server DHCP, Windows si assegna un indirizzo 169.254.x.x (APIPA): è il segno che la configurazione automatica non ha funzionato.')}
        <h2 id="st-s3">3. Più sottoreti</h2>
        <p>I messaggi broadcast non attraversano i router: se il server DHCP è in un'altra sottorete, il router deve fare da <b>relay agent</b> (comando <code>ip helper-address</code> sui router Cisco).</p>` },
      { id: 'http', titolo: 'HTTP e HTTPS', minuti: 11, giorni: -15, corpo: () => `
        <p class="st-intro"><b>HTTP</b> (HyperText Transfer Protocol) è il protocollo del web: il client (il browser) manda una <b>richiesta</b>, il server risponde con una <b>risposta</b>. È <b>senza stato</b>: ogni richiesta è indipendente dalle altre.</p>
        <h2 id="st-s1">1. Richiesta e risposta</h2>
        ${terminale('Richiesta e risposta HTTP', 'GET /index.html HTTP/1.1\nHost: www.example.com\nUser-Agent: Mozilla/5.0\n\nHTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nContent-Length: 1256\n\n<!DOCTYPE html> ...', 'La prima riga della richiesta contiene metodo, risorsa e versione; la risposta inizia con il codice di stato.')}
        <h2 id="st-s2">2. Metodi e codici di stato</h2>
        ${tabella(['Metodo', 'Uso'], [['GET', 'leggere una risorsa'], ['POST', 'inviare dati (es. un modulo)'], ['PUT', 'sostituire una risorsa'], ['PATCH', 'modificare in parte una risorsa'], ['DELETE', 'eliminare una risorsa']])}
        ${tabella(['Classe', 'Significato', 'Esempi'], [['2xx', 'successo', '200 OK, 201 Created'], ['3xx', 'reindirizzamento', '301 Moved Permanently, 304 Not Modified'], ['4xx', 'errore del client', '400 Bad Request, 401, 403 Forbidden, 404 Not Found'], ['5xx', 'errore del server', '500 Internal Server Error, 503']])}
        <h2 id="st-s3">3. HTTPS</h2>
        <p>HTTPS è HTTP dentro una connessione cifrata con <b>TLS</b> (porta 443). Il server presenta un <b>certificato</b> firmato da un'autorità di certificazione (CA): il browser lo verifica, poi client e server concordano una chiave di sessione simmetrica con cui cifrano i dati.</p>
        ${nota('info', 'Stato e cookie', 'Per ricordarsi di un utente tra una richiesta e l\'altra (per esempio il login) si usano i cookie: il server li imposta con Set-Cookie e il browser li rimanda a ogni richiesta.')}` },
      { id: 'vlan', titolo: 'Switch e VLAN', minuti: 10, giorni: -12, corpo: () => `
        <p class="st-intro">Lo <b>switch</b> collega i dispositivi di una LAN e inoltra i frame solo verso la porta giusta, grazie alla sua <b>tabella MAC</b>. Le <b>VLAN</b> permettono di dividere uno stesso switch in più reti logiche separate.</p>
        <h2 id="st-s1">1. Come impara lo switch</h2>
        <ul><li>Quando riceve un frame legge il <b>MAC di origine</b> e lo associa alla porta di ingresso.</li><li>Se conosce il MAC di destinazione, inoltra il frame solo su quella porta; altrimenti lo invia su tutte le altre (<b>flooding</b>).</li><li>I frame broadcast (<code>FF:FF:FF:FF:FF:FF</code>) vanno a tutti: lo switch separa i domini di collisione ma <b>non</b> il dominio di broadcast.</li></ul>
        <h2 id="st-s2">2. Le VLAN</h2>
        <p>Una VLAN è un dominio di broadcast separato. Porte di VLAN diverse non si vedono: per farle comunicare serve un <b>router</b> (o uno switch di livello 3).</p>
        ${tabella(['Tipo di porta', 'Uso'], [['Access', 'appartiene a una sola VLAN; ci si collegano i PC'], ['Trunk', 'trasporta più VLAN tra switch o verso il router; i frame hanno il tag 802.1Q']])}
        ${terminale('Switch Cisco (Packet Tracer)', 'Switch(config)# vlan 10\nSwitch(config-vlan)# name LAB1\nSwitch(config)# interface fa0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10\nSwitch(config)# interface gi0/1\nSwitch(config-if)# switchport mode trunk', 'Creazione della VLAN 10, porta access e porta trunk.')}
        ${nota('info', 'Router-on-a-stick', 'Un solo cavo trunk tra switch e router e una sottointerfaccia per VLAN (es. gi0/0.10 con encapsulation dot1Q 10): è il modo classico di fare routing tra VLAN.')}` },
      { id: 'routing', titolo: 'Routing statico e dinamico', minuti: 12, giorni: -9, corpo: () => `
        <p class="st-intro">Il <b>routing</b> è la scelta del percorso che un pacchetto segue per arrivare in un'altra rete. Ogni router decide consultando la propria <b>tabella di routing</b>.</p>
        <h2 id="st-s1">1. La tabella di routing</h2>
        <p>Ogni riga contiene una rete di destinazione, la maschera, il <b>next hop</b> (il prossimo router) o l'interfaccia di uscita. Vince la riga con il <b>prefisso più lungo</b> che corrisponde (longest prefix match). La <b>default route</b> <code>0.0.0.0/0</code> vale per tutto ciò che non ha una riga più precisa.</p>
        ${terminale('Router Cisco', 'Router(config)# ip route 192.168.20.0 255.255.255.0 10.0.0.2\nRouter(config)# ip route 0.0.0.0 0.0.0.0 10.0.0.1\nRouter# show ip route', 'Una rotta statica verso 192.168.20.0/24 e la rotta di default.')}
        <h2 id="st-s2">2. Statico o dinamico</h2>
        ${tabella(['', 'Statico', 'Dinamico'], [['Configurazione', 'a mano, rotta per rotta', 'i router si scambiano le informazioni'], ['Adattamento ai guasti', 'no', 'sì, ricalcola i percorsi'], ['Adatto a', 'reti piccole, rotta di default', 'reti medie e grandi']])}
        <h2 id="st-s3">3. Protocolli di routing</h2>
        <ul><li><b>RIP</b> (distance vector): sceglie il percorso con meno salti (hop), massimo 15.</li><li><b>OSPF</b> (link state): ogni router conosce la mappa della rete e calcola i percorsi con l'algoritmo di Dijkstra; il costo dipende dalla banda.</li><li><b>BGP</b>: collega i grandi sistemi autonomi di Internet.</li></ul>
        ${nota('avviso', 'TTL', 'Ogni router diminuisce di 1 il campo TTL del pacchetto: a 0 il pacchetto viene scartato. Così un errore di routing non fa girare i pacchetti all\'infinito.')}` },
      { id: 'trasporto', titolo: 'Livello di trasporto: TCP e UDP', minuti: 11, giorni: -6, corpo: () => `
        <p class="st-intro">Il livello di trasporto porta i dati da un <b>processo</b> a un altro, usando i numeri di porta. I due protocolli principali sono <b>TCP</b> e <b>UDP</b>.</p>
        <h2 id="st-s1">1. Confronto</h2>
        ${tabella(['', 'TCP', 'UDP'], [['Connessione', 'sì (three-way handshake)', 'no'], ['Affidabilità', 'riscontri (ACK) e ritrasmissioni', 'nessuna garanzia'], ['Ordine dei dati', 'garantito (numeri di sequenza)', 'non garantito'], ['Controllo di flusso e congestione', 'sì (finestra scorrevole)', 'no'], ['Header', '20 byte (minimo)', '8 byte'], ['Usato da', 'HTTP, SMTP, SSH, FTP', 'DNS, DHCP, streaming, giochi online, VoIP']])}
        <h2 id="st-s2">2. Il three-way handshake</h2>
        <ol><li>Il client manda un segmento <b>SYN</b> con il suo numero di sequenza iniziale.</li><li>Il server risponde con <b>SYN-ACK</b>.</li><li>Il client conferma con <b>ACK</b>: la connessione è aperta.</li></ol>
        <p>La chiusura avviene con i segmenti <b>FIN</b> e <b>ACK</b> in entrambe le direzioni.</p>
        <h2 id="st-s3">3. La finestra</h2>
        <p>Con la <b>finestra scorrevole</b> il mittente può inviare più segmenti senza aspettare ogni ACK; il destinatario comunica quanta memoria ha libera (<i>receive window</i>), così non viene sommerso di dati.</p>
        ${nota('info', 'Perché UDP?', 'Per una videochiamata un pacchetto in ritardo è inutile: meglio perderlo che aspettarlo. UDP è più leggero e veloce, e l\'applicazione gestisce da sola eventuali perdite.')}` },
      { id: 'sicurezza', titolo: 'Sicurezza di rete e firewall', minuti: 12, giorni: -3, corpo: () => `
        <p class="st-intro">Proteggere una rete significa garantire <b>riservatezza</b>, <b>integrità</b> e <b>disponibilità</b> dei dati (la triade CIA). Il <b>firewall</b> è uno degli strumenti principali.</p>
        <h2 id="st-s1">1. Tipi di firewall</h2>
        ${tabella(['Tipo', 'Come lavora'], [['Packet filter', 'controlla ogni pacchetto in base a IP, porta e protocollo (livelli 3 e 4)'], ['Stateful', 'ricorda le connessioni aperte e lascia passare le risposte'], ['Application gateway / proxy', 'analizza il contenuto a livello applicazione'], ['Next generation (NGFW)', 'unisce le funzioni precedenti a IPS e controllo delle applicazioni']])}
        <h2 id="st-s2">2. Regole e ACL</h2>
        <p>Le regole si leggono dall'alto in basso e si applica la <b>prima</b> che corrisponde; alla fine c'è di solito un <b>deny implicito</b>. Una buona politica è «vieta tutto, poi permetti solo ciò che serve».</p>
        ${terminale('ACL estesa (Cisco)', 'Router(config)# access-list 110 permit tcp 192.168.10.0 0.0.0.255 any eq 443\nRouter(config)# access-list 110 deny ip any any\nRouter(config)# interface gi0/0\nRouter(config-if)# ip access-group 110 in', 'Solo HTTPS in uscita dalla rete 192.168.10.0/24; tutto il resto è bloccato. Le ACL usano la wildcard mask (0.0.0.255).')}
        <h2 id="st-s3">3. DMZ, VPN e attacchi comuni</h2>
        <ul><li><b>DMZ</b>: una zona separata per i server raggiungibili da Internet (web, posta), così un attacco non arriva direttamente alla LAN interna.</li><li><b>VPN</b>: un tunnel cifrato attraverso Internet (IPsec, OpenVPN, WireGuard).</li><li>Attacchi: <b>DoS/DDoS</b>, <b>phishing</b>, <b>man in the middle</b>, <b>scansione delle porte</b>, <b>malware</b>.</li></ul>
        ${nota('avviso', 'NAT non è un firewall', 'Il NAT nasconde gli indirizzi interni, ma non sostituisce un firewall con regole precise.')}` },
      { id: 'nat', titolo: 'NAT e PAT', minuti: 11, giorni: -11, corpo: () => `
        <p class="st-intro">Gli indirizzi IPv4 pubblici sono finiti da tempo: una scuola o una casa ne ricevono di solito <b>uno solo</b>, mentre i dispositivi collegati sono decine. Il <b>NAT</b> (Network Address Translation) permette a tutta la rete locale, che usa indirizzi privati, di uscire su Internet con l'indirizzo pubblico del router.</p>
        <h2 id="st-s1">1. L'idea</h2>
        <p>Il router di confine ha un'interfaccia <b>inside</b> (verso la LAN) e una <b>outside</b> (verso il provider). Quando un pacchetto esce, il router <b>sostituisce l'indirizzo IP sorgente</b> privato con il proprio indirizzo pubblico e annota la sostituzione in una <b>tabella di traduzione</b>. Quando arriva la risposta, consulta la tabella e rimette l'indirizzo privato originale come destinazione.</p>
        ${figura(NAT_SVG, "Figura 1 – Con il PAT tre PC della LAN escono con lo stesso indirizzo pubblico: il router li distingue dalla porta.")}
        <h2 id="st-s2">2. Tre tipi di NAT</h2>
        ${tabella(["Tipo", "Traduzione", "Uso tipico"], [
          ["NAT statico", "1 indirizzo privato ↔ 1 indirizzo pubblico, sempre lo stesso", "un server interno che deve essere raggiungibile da fuori"],
          ["NAT dinamico", "indirizzi privati ↔ un gruppo (<i>pool</i>) di indirizzi pubblici, assegnati quando servono", "aziende con più indirizzi pubblici"],
          ["PAT (NAT overload)", "molti indirizzi privati ↔ 1 indirizzo pubblico, distinti dal <b>numero di porta</b>", "case, scuole, quasi tutte le LAN"],
        ])}
        <p>Il <b>PAT</b> (Port Address Translation) cambia anche la <b>porta sorgente</b> quando serve: ogni connessione in uscita riceve una porta pubblica diversa, e la coppia <i>IP pubblico + porta</i> identifica in modo univoco la connessione interna. Con 16 bit di porta, un solo indirizzo pubblico può gestire decine di migliaia di connessioni contemporanee.</p>
        ${tabella(["Protocollo", "Inside local (privato)", "Inside global (pubblico)", "Destinazione"], [
          ["TCP", "<code>192.168.10.37:51000</code>", "<code>80.20.114.6:1025</code>", "<code>93.184.215.14:443</code>"],
          ["TCP", "<code>192.168.10.38:51000</code>", "<code>80.20.114.6:1026</code>", "<code>93.184.215.14:443</code>"],
          ["UDP", "<code>192.168.10.40:62011</code>", "<code>80.20.114.6:1027</code>", "<code>8.8.8.8:53</code>"],
        ])}
        <p class="st-didascalia">Tabella di traduzione PAT: due PC usano la stessa porta sorgente (51000), ma il router assegna porte pubbliche diverse.</p>
        <h2 id="st-s3">3. Configurazione su un router Cisco</h2>
        ${terminale("Router Cisco (Packet Tracer)", `Router(config)# interface gi0/0
Router(config-if)# ip nat inside
Router(config)# interface gi0/1
Router(config-if)# ip nat outside
Router(config)# access-list 1 permit 192.168.10.0 0.0.0.255
Router(config)# ip nat inside source list 1 interface gi0/1 overload
Router(config)# ip nat inside source static tcp 192.168.10.20 80 80.20.114.6 80
Router# show ip nat translations
Pro  Inside global       Inside local         Outside local       Outside global
tcp  80.20.114.6:80      192.168.10.20:80     ---                 ---
tcp  80.20.114.6:1025    192.168.10.37:51000  93.184.215.14:443   93.184.215.14:443`, "L'ACL 1 dice quali indirizzi tradurre; «overload» attiva il PAT sull'indirizzo dell'interfaccia gi0/1. La riga static pubblica il server web interno.")}
        <h2 id="st-s4">4. Port forwarding</h2>
        <p>Con il PAT le connessioni possono partire solo dall'interno: un pacchetto che arriva da Internet senza una riga nella tabella viene scartato. Per rendere raggiungibile un server della LAN si crea una traduzione statica di porta, il <b>port forwarding</b>: tutto ciò che arriva su <code>80.20.114.6:80</code> va a <code>192.168.10.20:80</code>. È quello che fa la riga <code>static</code> dell'esempio.</p>
        ${nota("avviso", "I limiti del NAT", "Il NAT rompe il principio «end-to-end» di Internet: un host esterno non può aprire una connessione verso un host interno, e alcune applicazioni (VoIP, giochi, peer-to-peer) hanno bisogno di tecniche apposite. Molti provider usano anche il <b>CGNAT</b> (NAT su larga scala), per cui il router di casa riceve a sua volta un indirizzo privato. La soluzione definitiva è IPv6.")}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega perché due PC della stessa LAN possono usare la stessa porta sorgente senza creare confusione nella tabella PAT.</li>
          <li>Scrivi i comandi per pubblicare sulla porta 2222 dell'indirizzo pubblico il servizio SSH (porta 22) del server <code>192.168.10.30</code>.</li>
          <li>Un PC con indirizzo <code>192.168.10.37</code> visita un sito: quale indirizzo IP sorgente vede il server web? E il PC, nella risposta, quale indirizzo di destinazione trova?</li>
        </ol>` },
      { id: 'ipv6', titolo: 'IPv6: indirizzi e configurazione', minuti: 14, giorni: -8, corpo: () => `
        <p class="st-intro"><b>IPv6</b> è la nuova versione del protocollo IP. Nasce per risolvere l'esaurimento degli indirizzi IPv4, ma ne approfitta per semplificare l'intestazione, eliminare il broadcast e rendere automatica la configurazione degli host.</p>
        <h2 id="st-s1">1. Com'è fatto un indirizzo IPv6</h2>
        <p>Un indirizzo IPv6 ha <b>128 bit</b>: 2<sup>128</sup> indirizzi, circa 3,4 · 10<sup>38</sup>. Si scrive in <b>esadecimale</b>, in 8 gruppi da 16 bit (4 cifre) separati da due punti:</p>
        <p><code>2001:0db8:0000:0000:0000:ff00:0042:8329</code></p>
        <p>Per accorciarlo ci sono due regole:</p>
        <ol><li>in ogni gruppo si possono togliere gli <b>zeri iniziali</b>: <code>0db8</code> → <code>db8</code>, <code>0042</code> → <code>42</code>;</li>
          <li>una sola sequenza di gruppi tutti a zero si sostituisce con <b>::</b> (una sola volta, altrimenti non si saprebbe quanti zeri rimettere).</li></ol>
        <p>Il risultato è <code>2001:db8::ff00:42:8329</code>. Come in IPv4 si usa la notazione con il prefisso: <code>2001:db8:acad:10::1/64</code>.</p>
        ${figura(IPV6_SVG, "Figura 1 – Struttura di un indirizzo globale: il provider assegna alla sede un /48, la sede ha 16 bit per le sottoreti, l'host ha 64 bit di interface ID.")}
        <h2 id="st-s2">2. Tipi di indirizzi</h2>
        ${tabella(["Tipo", "Prefisso", "Esempio", "A cosa serve"], [
          ["Global unicast", "<code>2000::/3</code>", "<code>2001:db8:acad:10::25</code>", "indirizzo pubblico, instradato su Internet"],
          ["Link-local", "<code>fe80::/10</code>", "<code>fe80::21a:2bff:fe3c:4d5e</code>", "solo sul collegamento locale; ogni interfaccia ne ha sempre uno"],
          ["Unique local", "<code>fc00::/7</code> (in pratica <code>fd00::/8</code>)", "<code>fd12:3456:789a:1::10</code>", "rete privata, simile a 192.168.x.x"],
          ["Multicast", "<code>ff00::/8</code>", "<code>ff02::1</code> (tutti i nodi)", "un mittente, un gruppo di destinatari"],
          ["Loopback", "<code>::1/128</code>", "<code>::1</code>", "l'host stesso, come 127.0.0.1"],
        ])}
        ${nota("info", "Niente broadcast", "IPv6 non ha indirizzi di broadcast: al loro posto si usano gruppi multicast come <code>ff02::1</code> (tutti i nodi del link) e <code>ff02::2</code> (tutti i router). Inoltre il prefisso <code>2001:db8::/32</code> è riservato agli esempi e alla documentazione.")}
        <h2 id="st-s3">3. Configurazione automatica: SLAAC e NDP</h2>
        <p>In una sottorete IPv6 il prefisso è quasi sempre <b>/64</b>. Un host può configurarsi da solo con <b>SLAAC</b> (Stateless Address Autoconfiguration):</p>
        <ol><li>si crea l'indirizzo link-local <code>fe80::…</code> e controlla che nessuno lo usi già (DAD, Duplicate Address Detection);</li>
          <li>chiede ai router un <b>Router Advertisement</b> (messaggio ICMPv6), che contiene il prefisso della rete e il gateway;</li>
          <li>unisce il prefisso con un interface ID di 64 bit, casuale oppure ricavato dal MAC con il metodo <b>EUI-64</b>.</li></ol>
        <p>Con EUI-64 il MAC <code>00:1A:2B:3C:4D:5E</code> si divide a metà, si inserisce <code>FFFE</code> al centro e si inverte il 7° bit del primo byte (<code>00</code> → <code>02</code>): l'interface ID è <code>021a:2bff:fe3c:4d5e</code>. Per la privacy i sistemi operativi moderni preferiscono interface ID casuali e temporanei.</p>
        <p>Il protocollo <b>NDP</b> (Neighbor Discovery, basato su ICMPv6) sostituisce ARP: con i messaggi <i>Neighbor Solicitation</i> e <i>Neighbor Advertisement</i> un host scopre il MAC di un vicino. Se servono informazioni in più (per esempio i server DNS gestiti centralmente) si usa anche <b>DHCPv6</b>.</p>
        <h2 id="st-s4">4. L'intestazione IPv6</h2>
        ${tabella(["", "IPv4", "IPv6"], [
          ["Lunghezza dell'header", "variabile, da 20 a 60 byte", "fissa, 40 byte (le opzioni vanno in header di estensione)"],
          ["Checksum dell'header", "sì, ricalcolato da ogni router", "no (ci pensano i livelli 2 e 4)"],
          ["Frammentazione", "anche nei router", "solo nel mittente"],
          ["Tempo di vita", "TTL", "Hop Limit"],
          ["Configurazione automatica", "DHCP", "SLAAC, DHCPv6"],
        ])}
        <h2 id="st-s5">5. Configurazione e verifica</h2>
        ${terminale("Router Cisco e PC Linux", `Router(config)# ipv6 unicast-routing
Router(config)# interface gi0/0
Router(config-if)# ipv6 address 2001:db8:acad:10::1/64
Router(config-if)# no shutdown

studente@lab4:~$ ip -6 addr show dev eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet6 2001:db8:acad:10:5c1e:9d02:7b4a:31f0/64 scope global dynamic
    inet6 fe80::21a:2bff:fe3c:4d5e/64 scope link
studente@lab4:~$ ping -6 -c 2 2001:db8:acad:10::1
64 bytes from 2001:db8:acad:10::1: icmp_seq=1 ttl=64 time=0.41 ms
64 bytes from 2001:db8:acad:10::1: icmp_seq=2 ttl=64 time=0.38 ms`, "Il router annuncia il prefisso 2001:db8:acad:10::/64; il PC si è configurato da solo con SLAAC e ha anche il suo indirizzo link-local.")}
        ${nota("avviso", "La transizione", "IPv4 e IPv6 non sono compatibili tra loro. Oggi convivono con il <b>dual stack</b> (ogni dispositivo ha entrambi gli indirizzi), con i <b>tunnel</b> (pacchetti IPv6 dentro pacchetti IPv4) e con <b>NAT64/DNS64</b>, che permette a una rete solo IPv6 di raggiungere i siti solo IPv4.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Abbrevia <code>2001:0db8:0000:0001:0000:0000:0000:00a0</code> e riscrivi per esteso <code>fe80::1:2</code>.</li>
          <li>Una sede riceve il prefisso <code>2001:db8:acad::/48</code>: quante sottoreti /64 può creare? Scrivi il prefisso della sottorete numero 10 (in esadecimale).</li>
          <li>Ricava con EUI-64 l'interface ID della scheda con MAC <code>3C:52:82:11:22:33</code>.</li>
        </ol>` },
      { id: 'crittografia', titolo: 'Crittografia, firma digitale e certificati', minuti: 16, giorni: -5, corpo: () => `
        <p class="st-intro">La <b>crittografia</b> è la base di tutta la sicurezza in rete. Serve a garantire la <b>riservatezza</b> (solo il destinatario legge), l'<b>integrità</b> (nessuno ha modificato il messaggio), l'<b>autenticità</b> (sappiamo chi l'ha scritto) e il <b>non ripudio</b> (l'autore non può negare di averlo scritto).</p>
        <h2 id="st-s1">1. Concetti di base</h2>
        <p>Un algoritmo di cifratura trasforma il <b>testo in chiaro</b> in <b>testo cifrato</b> usando una <b>chiave</b>. Per il <b>principio di Kerckhoffs</b> la sicurezza deve dipendere solo dalla segretezza della chiave, non da quella dell'algoritmo: gli algoritmi buoni sono pubblici e studiati da tutti. La robustezza dipende dalla lunghezza della chiave: con 128 bit le combinazioni sono 2<sup>128</sup>, troppe per un attacco a forza bruta.</p>
        <h2 id="st-s2">2. Crittografia simmetrica</h2>
        <p>Mittente e destinatario usano <b>la stessa chiave</b> per cifrare e decifrare. È molto veloce e si usa per cifrare grandi quantità di dati: dischi, file, il traffico di una connessione.</p>
        ${tabella(["Algoritmo", "Chiave", "Note"], [
          ["DES", "56 bit", "obsoleto: si rompe a forza bruta in poche ore"],
          ["3DES", "112/168 bit", "DES applicato tre volte; lento, in dismissione"],
          ["AES", "128, 192 o 256 bit", "lo standard attuale, a blocchi da 128 bit"],
          ["ChaCha20", "256 bit", "cifrario a flusso, veloce anche senza hardware dedicato"],
        ])}
        <p>Il problema è la <b>distribuzione delle chiavi</b>: la chiave va scambiata in modo sicuro prima di comunicare, e con <i>n</i> persone che vogliono parlarsi a due a due servono <i>n</i>(<i>n</i> − 1)/2 chiavi diverse (per una classe di 25 studenti, 300 chiavi).</p>
        ${terminale("studente@lab4: ~", `studente@lab4:~$ openssl enc -aes-256-cbc -pbkdf2 -in voti.txt -out voti.enc
enter AES-256-CBC encryption password:
Verifying - enter AES-256-CBC encryption password:
studente@lab4:~$ openssl enc -d -aes-256-cbc -pbkdf2 -in voti.enc
enter AES-256-CBC decryption password:
Voto di Rossi: 8`, "Cifratura simmetrica di un file con AES-256: la chiave è ricavata dalla password con PBKDF2.")}
        <h2 id="st-s3">3. Crittografia asimmetrica</h2>
        <p>Ogni utente ha una <b>coppia di chiavi</b> legate matematicamente: una <b>chiave pubblica</b>, che può dare a tutti, e una <b>chiave privata</b>, che tiene solo per sé. Quello che si cifra con una delle due si decifra solo con l'altra, e dalla pubblica non si può ricavare la privata.</p>
        <ul><li><b>Riservatezza</b>: per scrivere a Bob, Alice cifra con la chiave <b>pubblica di Bob</b>; solo Bob, con la sua privata, può leggere.</li>
          <li><b>Autenticità</b>: se Alice cifra (firma) con la propria chiave <b>privata</b>, chiunque può verificare con la sua pubblica che il messaggio viene da lei.</li></ul>
        ${figura(CRIPTO_SVG, "Figura 1 – Riservatezza con la crittografia asimmetrica: si cifra con la chiave pubblica del destinatario.")}
        <p>Gli algoritmi più usati sono <b>RSA</b> (chiavi da 2048 o 3072 bit) e quelli a <b>curve ellittiche</b> (ECC, con chiavi molto più corte a parità di sicurezza). Sono però lenti: in pratica si usa la <b>crittografia ibrida</b>. Con l'asimmetrica si scambia (o si concorda, con Diffie-Hellman) una <b>chiave di sessione</b> simmetrica, e con questa si cifrano i dati. È quello che fa TLS.</p>
        <h2 id="st-s4">4. Funzioni di hash</h2>
        <p>Una funzione di hash trasforma un dato di qualsiasi lunghezza in un'<b>impronta</b> (digest) di lunghezza fissa. Una buona funzione di hash crittografica è:</p>
        <ul><li><b>deterministica</b>: lo stesso input dà sempre lo stesso hash;</li><li><b>non invertibile</b>: dall'hash non si risale al dato;</li><li><b>resistente alle collisioni</b>: è impraticabile trovare due input con lo stesso hash;</li><li>con <b>effetto valanga</b>: cambiando un solo bit dell'input, l'hash cambia completamente.</li></ul>
        ${terminale("studente@lab4: ~", `studente@lab4:~$ echo -n "ciao" | sha256sum
b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2  -
studente@lab4:~$ echo -n "Ciao" | sha256sum
25c73520e69f4bf229811e8e46ffe7d80471544b9bee15ed25044b86be4115ad  -`, "Effetto valanga: basta una maiuscola per cambiare tutti i 256 bit dell'impronta.")}
        <p>Si usano <b>SHA-256</b>, SHA-512 e SHA-3; <b>MD5</b> e <b>SHA-1</b> non sono più sicuri (si conoscono collisioni). Gli hash servono a verificare l'integrità dei file scaricati, a firmare i documenti e a conservare le <b>password</b>: nel database non si salva la password ma il suo hash, calcolato con un <b>salt</b> casuale e con algoritmi lenti apposta (bcrypt, Argon2), così un attacco a dizionario diventa molto costoso.</p>
        ${ide("Impronta.java", "java", J_HASH, "Esempio 1 – Calcolo dell'impronta SHA-256 di un testo con la classe MessageDigest (Java 17 o successivo).")}
        <h2 id="st-s5">5. Firma digitale</h2>
        <p>Firmare tutto il documento con RSA sarebbe lento, quindi si firma la sua impronta:</p>
        <ol><li>il mittente calcola l'<b>hash</b> del documento;</li><li>cifra l'hash con la propria <b>chiave privata</b>: questa è la firma;</li><li>invia documento e firma (in Italia, per esempio, il file firmato <code>.p7m</code>);</li><li>il destinatario decifra la firma con la <b>chiave pubblica</b> del mittente, ricalcola l'hash del documento e confronta i due valori: se coincidono, il documento è integro e autentico.</li></ol>
        ${terminale("studente@lab4: ~", `studente@lab4:~$ openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out privata.pem
studente@lab4:~$ openssl pkey -in privata.pem -pubout -out pubblica.pem
studente@lab4:~$ openssl dgst -sha256 -sign privata.pem -out firma.bin voti.txt
studente@lab4:~$ openssl dgst -sha256 -verify pubblica.pem -signature firma.bin voti.txt
Verified OK
studente@lab4:~$ echo "Voto di Rossi: 9" > voti.txt
studente@lab4:~$ openssl dgst -sha256 -verify pubblica.pem -signature firma.bin voti.txt
Verification failure`, "Generazione delle chiavi, firma e verifica. Dopo la modifica del file la firma non è più valida.")}
        ${nota("avviso", "Firma digitale e cifratura sono cose diverse", "La firma garantisce integrità, autenticità e non ripudio, ma <b>non</b> la riservatezza: il documento firmato resta leggibile da tutti. Per tenerlo segreto va anche cifrato.")}
        <h2 id="st-s6">6. Certificati e PKI</h2>
        <p>Resta un problema: come faccio a sapere che una chiave pubblica appartiene davvero alla mia banca e non a un impostore? Serve un garante. Un <b>certificato digitale</b> (standard <b>X.509</b>) è un documento che lega una chiave pubblica a un'identità (per esempio il nome di dominio <code>www.scuola.example</code>) ed è <b>firmato da un'autorità di certificazione</b> (CA).</p>
        ${tabella(["Campo del certificato", "Esempio"], [
          ["Soggetto", "CN=www.scuola.example"],
          ["Emittente (CA)", "CN=Esempio CA Intermedia"],
          ["Validità", "dal 1° settembre al 30 novembre (i certificati per siti web durano pochi mesi)"],
          ["Chiave pubblica", "RSA 2048 bit oppure EC P-256"],
          ["Nomi alternativi (SAN)", "www.scuola.example, scuola.example"],
          ["Firma della CA", "sha256WithRSAEncryption"],
        ])}
        <p>La <b>PKI</b> (Public Key Infrastructure) è l'insieme di CA, regole e procedure che emettono, rinnovano e revocano i certificati. Le CA sono organizzate a <b>catena</b>: una <b>CA radice</b> (root), il cui certificato è già installato nel sistema operativo o nel browser, firma i certificati delle <b>CA intermedie</b>, che firmano i certificati dei server. Il browser risale la catena fino a una radice di cui si fida. Un certificato compromesso si <b>revoca</b>: lo stato si controlla con le liste CRL o con il protocollo OCSP.</p>
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Quante chiavi servono per far comunicare in modo riservato 10 persone a due a due con la crittografia simmetrica? E con l'asimmetrica?</li>
          <li>Alice vuole mandare a Bob un messaggio riservato e firmato: quali chiavi usa, e in che ordine?</li>
          <li>Apri il certificato di un sito HTTPS dal lucchetto del browser e individua soggetto, emittente, validità e catena di certificazione.</li>
        </ol>` },
      { id: 'tls', titolo: 'TLS e VPN', minuti: 13, giorni: -4, corpo: () => `
        <p class="st-intro">Internet è una rete pubblica: chiunque si trovi lungo il percorso può leggere o modificare i pacchetti. <b>TLS</b> protegge le singole connessioni delle applicazioni (è la «S» di HTTPS); una <b>VPN</b> crea un tunnel cifrato in cui far passare tutto il traffico tra due reti, o tra un utente e la sua rete.</p>
        <h2 id="st-s1">1. Che cosa offre TLS</h2>
        <p><b>TLS</b> (Transport Layer Security, erede del vecchio SSL) si colloca tra il livello di trasporto (TCP) e l'applicazione. Garantisce:</p>
        <ul><li><b>riservatezza</b>: i dati sono cifrati con una chiave simmetrica di sessione (AES-GCM o ChaCha20);</li><li><b>integrità</b>: ogni blocco di dati ha un codice di autenticazione, e una modifica viene scoperta;</li><li><b>autenticazione del server</b> (e, se serve, anche del client) tramite il suo <b>certificato</b>.</li></ul>
        <p>Le versioni da usare oggi sono <b>TLS 1.2</b> e <b>TLS 1.3</b>; SSL 3.0, TLS 1.0 e 1.1 sono deprecati.</p>
        <h2 id="st-s2">2. L'handshake di TLS 1.3</h2>
        ${figura(TLS_SVG, "Figura 1 – Handshake TLS 1.3 semplificato: dopo un solo scambio di andata e ritorno (1-RTT) il client può già inviare dati cifrati.")}
        <ol><li><b>ClientHello</b>: il client propone le versioni e gli algoritmi che conosce (le <i>cipher suite</i>) e manda la sua parte dello scambio di chiavi <b>Diffie-Hellman su curve ellittiche</b> (ECDHE).</li>
          <li><b>ServerHello</b>: il server sceglie gli algoritmi e manda la sua parte dello scambio. Da questo momento entrambi calcolano la stessa chiave segreta, che non è mai transitata in rete, e tutto il resto viaggia cifrato.</li>
          <li>Il server invia il suo <b>certificato</b>, una firma che prova di possedere la chiave privata corrispondente (<i>CertificateVerify</i>) e il messaggio <b>Finished</b>.</li>
          <li>Il client verifica il certificato (nome di dominio, date di validità, catena fino a una CA fidata, revoca), risponde con il suo Finished e inizia a inviare la richiesta HTTP cifrata.</li></ol>
        ${nota("info", "Forward secrecy", "Le chiavi Diffie-Hellman sono generate nuove a ogni connessione (effimere). Se un giorno la chiave privata del server venisse rubata, il traffico registrato in passato resterebbe comunque indecifrabile.")}
        ${terminale("studente@lab4: ~", `studente@lab4:~$ curl -v https://www.example.com/ -o /dev/null
*   Trying 93.184.215.14:443...
* Connected to www.example.com (93.184.215.14) port 443
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=www.example.com
*  issuer: C=US; O=Esempio Trust; CN=Esempio TLS CA 2024
*  SSL certificate verify ok.
> GET / HTTP/1.1`, "Con l'opzione -v curl mostra le fasi dell'handshake, la cipher suite scelta e il certificato del server.")}
        <h2 id="st-s3">3. TLS negli altri protocolli</h2>
        ${tabella(["Protocollo in chiaro", "Con TLS", "Porta"], [["HTTP", "HTTPS", "443"], ["SMTP (invio posta)", "SMTP con STARTTLS / SMTPS", "587 / 465"], ["IMAP", "IMAPS", "993"], ["FTP", "FTPS (oppure SFTP, che usa SSH)", "990"], ["DNS", "DNS over TLS / over HTTPS", "853 / 443"]])}
        <h2 id="st-s4">4. Le VPN</h2>
        <p>Una <b>VPN</b> (Virtual Private Network) crea un <b>tunnel</b>: i pacchetti della rete privata vengono cifrati e incapsulati dentro altri pacchetti che attraversano Internet. Per chi è dentro la VPN, è come essere collegati alla stessa rete locale.</p>
        ${figura(VPN_SVG, "Figura 2 – VPN site-to-site tra la sede e la succursale, e VPN di accesso remoto per un docente da casa.")}
        ${tabella(["Tipo", "Chi collega", "Esempio"], [["Site-to-site", "due reti intere, tramite i loro router o firewall", "sede centrale e succursale della scuola"], ["Accesso remoto (remote access)", "un singolo dispositivo alla rete aziendale", "un docente che da casa usa il registro della segreteria"]])}
        <h2 id="st-s5">5. Protocolli per le VPN</h2>
        <ul><li><b>IPsec</b> lavora al livello 3. Usa <b>IKE</b> per concordare le chiavi, <b>ESP</b> per cifrare e autenticare i pacchetti (AH autentica soltanto). In <b>modalità tunnel</b> cifra l'intero pacchetto originale e aggiunge un nuovo header IP; in <b>modalità trasporto</b> protegge solo il contenuto. È il classico per le VPN site-to-site.</li>
          <li><b>VPN TLS</b> (come OpenVPN): il tunnel è una connessione TLS, che passa facilmente attraverso firewall e NAT.</li>
          <li><b>WireGuard</b>: moderno e molto semplice, su UDP (porta 51820), con chiavi a curve ellittiche e ChaCha20.</li></ul>
        ${ide("wg0.conf", "ini", `[Interface]
# chiave privata del portatile del docente
PrivateKey = <chiave privata del client>
Address = 10.8.0.2/24
DNS = 10.8.0.1

[Peer]
# il server VPN della scuola
PublicKey = <chiave pubblica del server>
Endpoint = vpn.scuola.example:51820
AllowedIPs = 10.8.0.0/24, 192.168.10.0/24
PersistentKeepalive = 25`, "Esempio 1 – Configurazione WireGuard di un client. AllowedIPs elenca le reti raggiungibili attraverso il tunnel.")}
        ${nota("avviso", "Split tunnel o full tunnel", "Nell'esempio passa nel tunnel solo il traffico verso le reti della scuola (<b>split tunneling</b>); il resto esce direttamente da casa. Con <code>AllowedIPs = 0.0.0.0/0</code> tutto il traffico passerebbe dalla scuola (<b>full tunnel</b>): più controllo, ma più carico sulla connessione della scuola.")}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Perché TLS usa la crittografia asimmetrica solo all'inizio e poi passa a quella simmetrica?</li>
          <li>Che cosa succede se il nome nel certificato non corrisponde al nome del sito visitato? Che attacco potrebbe esserci dietro?</li>
          <li>La scuola apre una succursale: proponi il tipo di VPN e il protocollo, motivando la scelta, e disegna lo schema con gli indirizzi delle due reti.</li>
        </ol>` },
      { id: 'wireless', titolo: 'Reti wireless e loro sicurezza', minuti: 13, giorni: -2, corpo: () => `
        <p class="st-intro">Le reti <b>wireless</b> (Wi-Fi, standard <b>IEEE 802.11</b>) collegano i dispositivi via radio. Sono comode e veloci da installare, ma il mezzo è condiviso e il segnale esce dalle pareti: chiunque nei dintorni può ricevere i frame. Per questo la sicurezza è fondamentale.</p>
        <h2 id="st-s1">1. Gli standard 802.11</h2>
        ${tabella(["Standard", "Nome commerciale", "Frequenze", "Velocità massima teorica"], [
          ["802.11b", "–", "2,4 GHz", "11 Mbit/s"],
          ["802.11g", "–", "2,4 GHz", "54 Mbit/s"],
          ["802.11n", "Wi-Fi 4", "2,4 e 5 GHz", "600 Mbit/s"],
          ["802.11ac", "Wi-Fi 5", "5 GHz", "circa 3,5 Gbit/s"],
          ["802.11ax", "Wi-Fi 6 / 6E", "2,4, 5 e (6E) 6 GHz", "circa 9,6 Gbit/s"],
          ["802.11be", "Wi-Fi 7", "2,4, 5 e 6 GHz", "oltre 40 Gbit/s"],
        ])}
        <p>La banda a <b>2,4 GHz</b> arriva più lontano e attraversa meglio i muri, ma ha pochi canali e molte interferenze: in Europa i canali che non si sovrappongono sono <b>1, 6 e 11</b> (o 1, 5, 9, 13). Le bande a <b>5 e 6 GHz</b> hanno più canali e più velocità, ma una portata minore.</p>
        <h2 id="st-s2">2. Architettura</h2>
        <ul><li><b>Access point</b> (AP): collega i client wireless alla rete cablata. Un AP con i suoi client forma un <b>BSS</b>; più AP con lo stesso nome di rete formano un <b>ESS</b>, in cui i client passano da un AP all'altro (<b>roaming</b>).</li>
          <li><b>SSID</b>: il nome della rete, annunciato dall'AP nei frame <i>beacon</i>.</li>
          <li>Modalità <b>ad hoc</b> (IBSS): i dispositivi comunicano direttamente, senza AP.</li>
          <li>Nelle reti grandi gli AP sono gestiti da un <b>controller</b> centrale, che distribuisce configurazioni e canali.</li></ul>
        ${figura(WIFI_SVG, "Figura 1 – Il Wi-Fi della scuola: due SSID su VLAN diverse, autenticazione del personale con 802.1X e server RADIUS.")}
        <h2 id="st-s3">3. Accesso al mezzo: CSMA/CA</h2>
        <p>Una stazione radio non può trasmettere e ascoltare contemporaneamente, quindi non può rilevare le collisioni come Ethernet (CSMA/CD). Il Wi-Fi le <b>evita</b> con <b>CSMA/CA</b>: prima di trasmettere ascolta il canale, se è libero aspetta un tempo casuale (<i>backoff</i>) e poi trasmette; il destinatario conferma ogni frame con un <b>ACK</b>. Contro il problema del <b>terminale nascosto</b> (due client che non si sentono tra loro ma sentono entrambi l'AP) si possono usare i messaggi <b>RTS/CTS</b> per prenotare il canale.</p>
        <h2 id="st-s4">4. La sicurezza: da WEP a WPA3</h2>
        ${tabella(["Protocollo", "Cifratura", "Stato"], [
          ["WEP", "RC4 con chiave statica", "violato: si rompe in pochi minuti, da non usare"],
          ["WPA", "TKIP (ancora RC4)", "soluzione di passaggio, deprecato"],
          ["WPA2", "AES-CCMP", "ancora diffuso; debole se la password è debole"],
          ["WPA3", "AES-CCMP/GCMP, autenticazione SAE", "lo standard attuale"],
        ])}
        <p>WPA2 e WPA3 esistono in due modalità:</p>
        <ul><li><b>Personal</b> (PSK in WPA2, SAE in WPA3): una password condivisa da tutti. Adatta a casa e ai piccoli uffici.</li>
          <li><b>Enterprise</b> (<b>802.1X</b>): ogni utente entra con le proprie credenziali, verificate da un server <b>RADIUS</b>; l'AP fa solo da intermediario. Si può disattivare un singolo utente senza cambiare la password a tutti.</li></ul>
        <p>Con WPA2-Personal l'AP e il client derivano le chiavi di sessione con il <b>4-way handshake</b>. Chi registra questo scambio può provare le password di un dizionario <b>offline</b>, sul proprio computer, senza limiti di tentativi. WPA3 sostituisce la PSK con <b>SAE</b> (Simultaneous Authentication of Equals): ogni tentativo richiede uno scambio con l'AP, quindi l'attacco offline non funziona più, e offre la <i>forward secrecy</i>. WPA3 rende anche obbligatori i frame di gestione protetti (PMF), che bloccano gli attacchi di disconnessione forzata.</p>
        ${nota("avviso", "Falsi rimedi", "Nascondere l'SSID e filtrare gli indirizzi MAC <b>non</b> proteggono la rete: l'SSID compare comunque nei frame dei client e un MAC si copia in un attimo. Va disattivato anche il <b>WPS</b>, il cui PIN si indovina facilmente.")}
        <h2 id="st-s5">5. Attacchi tipici e buone pratiche</h2>
        <ul><li><b>Evil twin</b>: un AP falso con lo stesso SSID di quello vero, per intercettare il traffico. Nelle reti Enterprise il client deve verificare il certificato del server RADIUS.</li>
          <li><b>Rogue AP</b>: un access point collegato di nascosto alla rete interna; i controller lo rilevano.</li>
          <li><b>Disconnessione forzata</b> (deauthentication) per catturare l'handshake: si previene con PMF.</li></ul>
        <p>Buone pratiche: WPA3 (o almeno WPA2-AES con password lunga), 802.1X per il personale, rete <b>ospiti</b> separata su una VLAN isolata dalla LAN interna (eventualmente con <i>captive portal</i>), firmware degli AP aggiornato, potenza del segnale regolata per non coprire il parcheggio.</p>
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Progetta il Wi-Fi di un piano della scuola con tre AP nella banda a 2,4 GHz: quali canali assegni e perché?</li>
          <li>Confronta WPA2-Personal e WPA2-Enterprise per una scuola di 900 studenti: quale scegli?</li>
          <li>Spiega perché WPA3-SAE rende inutile un attacco a dizionario fatto su un handshake registrato.</li>
        </ol>` },
      { id: 'backup', titolo: 'Disaster recovery, backup e RAID', minuti: 14, giorni: -1, corpo: () => `
        <p class="st-intro">Un guasto a un disco, un incendio, un ransomware o un semplice errore umano possono cancellare in un attimo i dati di un'organizzazione. La <b>continuità di servizio</b> si progetta prima che succeda: con la <b>ridondanza</b> per non fermarsi, con i <b>backup</b> per recuperare i dati, con un <b>piano di disaster recovery</b> per ripartire.</p>
        <h2 id="st-s1">1. Business continuity e disaster recovery</h2>
        <p>Il <b>piano di continuità operativa</b> (BCP) stabilisce come l'organizzazione continua a lavorare durante un'emergenza. Il <b>piano di disaster recovery</b> (DRP) ne è la parte tecnica: quali sistemi ripristinare, in che ordine, con quali copie e chi deve farlo. Due parametri guidano tutte le scelte:</p>
        ${tabella(["Parametro", "Domanda", "Esempio per il registro elettronico"], [
          ["<b>RPO</b> (Recovery Point Objective)", "quanti dati posso permettermi di perdere?", "al massimo 1 ora di lavoro → backup almeno ogni ora"],
          ["<b>RTO</b> (Recovery Time Objective)", "in quanto tempo il servizio deve tornare disponibile?", "entro 4 ore dal guasto"],
        ])}
        <p>Più RPO e RTO sono piccoli, più la soluzione costa: un sito di riserva sempre acceso (<b>hot site</b>) riparte in minuti, uno con l'hardware pronto ma spento (<b>warm site</b>) in ore, uno con i soli locali (<b>cold site</b>) in giorni.</p>
        <h2 id="st-s2">2. I tipi di backup</h2>
        ${tabella(["Tipo", "Che cosa copia", "Ripristino"], [
          ["Completo (full)", "tutti i dati", "basta l'ultimo backup completo; è il più lento da fare e il più grande"],
          ["Incrementale", "ciò che è cambiato dall'<b>ultimo backup di qualsiasi tipo</b>", "ultimo completo + <b>tutti</b> gli incrementali successivi, in ordine"],
          ["Differenziale", "ciò che è cambiato dall'<b>ultimo backup completo</b>", "ultimo completo + <b>l'ultimo</b> differenziale"],
        ])}
        ${nota("info", "Esempio", "Backup completo la domenica e incrementale gli altri giorni: se il disco si guasta giovedì, si ripristinano il completo di domenica e gli incrementali di lunedì, martedì e mercoledì. Con i differenziali basterebbero il completo e il differenziale di mercoledì, ma ogni differenziale cresce giorno dopo giorno.")}
        <h2 id="st-s3">3. La regola 3-2-1</h2>
        <p>Una buona strategia tiene almeno <b>3 copie</b> dei dati, su <b>2 supporti</b> diversi (per esempio NAS e nastro, o NAS e cloud), di cui <b>1 fuori sede</b>. Contro il ransomware si aggiunge una copia <b>offline o immutabile</b>, che non può essere cancellata né cifrata da chi entra nella rete. E un backup vale solo se si <b>prova il ripristino</b> periodicamente.</p>
        ${terminale("studente@lab4: ~", `studente@lab4:~$ rsync -a --delete /srv/registro/ /mnt/nas/backup/registro/
studente@lab4:~$ tar -czf /mnt/nas/archivio/registro-$(date +%F).tar.gz /srv/registro
studente@lab4:~$ crontab -l
# backup ogni giorno alle 23:30
30 23 * * * tar -czf /mnt/nas/archivio/registro-$(date +\\%F).tar.gz /srv/registro`, "rsync copia solo le differenze; tar crea un archivio compresso con la data nel nome; cron lo ripete ogni sera (in crontab il % va scritto \\%).")}
        <h2 id="st-s4">4. RAID</h2>
        <p>Il <b>RAID</b> (Redundant Array of Independent Disks) unisce più dischi per aumentare le prestazioni, l'affidabilità o entrambe. Con i livelli ridondanti, se un disco si guasta il sistema continua a funzionare e il disco si sostituisce, spesso «a caldo» (<i>hot swap</i>).</p>
        ${figura(RAID_SVG, "Figura 1 – RAID 1 (mirroring) e RAID 5 (striping con parità distribuita, P = parità).")}
        ${tabella(["Livello", "Come funziona", "Dischi minimi", "Capacità utile (n dischi da C)", "Guasti tollerati"], [
          ["RAID 0", "striping: i dati sono divisi a blocchi tra i dischi", "2", "n · C", "nessuno"],
          ["RAID 1", "mirroring: ogni disco è la copia dell'altro", "2", "C", "n − 1"],
          ["RAID 5", "striping con un blocco di parità distribuito", "3", "(n − 1) · C", "1"],
          ["RAID 6", "striping con doppia parità", "4", "(n − 2) · C", "2"],
          ["RAID 10", "mirroring + striping (coppie in RAID 1, unite in RAID 0)", "4", "n · C / 2", "1 per coppia"],
        ])}
        <p>La <b>parità</b> del RAID 5 è lo XOR dei blocchi dati della stessa riga: se si perde un blocco, si ricalcola con lo XOR dei rimanenti. Per esempio, con i blocchi <code>1011</code> e <code>0110</code> la parità è <code>1101</code>; se si perde il primo, <code>0110 XOR 1101 = 1011</code>.</p>
        ${nota("avviso", "Il RAID non è un backup", "Il RAID protegge dal guasto di un disco, ma se un file viene cancellato per errore o cifrato da un ransomware, la modifica è copiata subito su tutti i dischi. Servono comunque i backup.")}
        <h2 id="st-s5">5. Ridondanza e alta disponibilità</h2>
        <ul><li><b>Alimentazione</b>: gruppi di continuità (UPS), doppio alimentatore nei server, generatore.</li>
          <li><b>Rete</b>: due collegamenti a Internet con provider diversi, link aggregati tra gli switch, router ridondati con un gateway virtuale condiviso (protocolli <b>VRRP</b> o HSRP).</li>
          <li><b>Server</b>: <b>cluster</b> con <b>failover</b> automatico, bilanciatori di carico (<i>load balancer</i>), macchine virtuali che si spostano da un host all'altro.</li>
          <li><b>Dati</b>: replica su un secondo sito, sincrona (nessun dato perso, ma sedi vicine) o asincrona (anche a grande distanza, con un piccolo RPO).</li></ul>
        <p>La <b>disponibilità</b> si misura come frazione del tempo in cui il servizio funziona: «tre nove» (99,9 per cento) significano circa 8 ore e 45 minuti di fermo all'anno, «cinque nove» (99,999 per cento) circa 5 minuti.</p>
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Un server ha 4 dischi da 4 TB. Calcola la capacità utile e i guasti tollerati in RAID 0, 5, 6 e 10.</li>
          <li>Con backup completo il lunedì e differenziali gli altri giorni, quali copie servono per ripristinare i dati di sabato mattina?</li>
          <li>Scrivi un piano di backup per il server della segreteria, indicando RPO, RTO, tipi di backup, supporti e luogo delle copie.</li>
        </ol>` },
    ],
  };
})();
