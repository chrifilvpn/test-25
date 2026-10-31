// La VOCE NARRANTE del master di Draghi e Segrete: il browser chiede una frase a /voce e il server la fa leggere alle
// voci neurali di Microsoft Edge ("Leggi ad alta voce"), che sono gratis e non chiedono chiavi. Il server parla col
// servizio di Edge come fa il browser Edge (WebSocket, il token Sec-MS-GEC che cambia ogni 5 minuti) e restituisce
// l'mp3. Non è un servizio ufficiale: se smette di rispondere il server se ne accorge, per qualche minuto risponde
// subito 503 e il browser legge con la sua voce (speechSynthesis).
// Limiti: frasi di massimo MAX_TESTO caratteri, solo le voci dell'elenco, poche richieste insieme, un tetto di frasi
// al minuto per indirizzo, e le ultime frasi restano in memoria (tutto il tavolo chiede la stessa frase: Edge la
// legge una volta sola).
const crypto = require('crypto');
const WebSocket = require('ws');

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VERSIONE_CHROMIUM = '143.0.3650.75';
const URL_EDGE = process.env.EDGE_TTS_URL || `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}`;
const MAX_TESTO = 600; // caratteri per frase (il browser manda pezzi più corti)
const MAX_INSIEME = 6; // richieste a Edge nello stesso momento
const TIMEOUT_MS = 12000;
const FRASI_AL_MINUTO = 90; // per indirizzo: un tavolo intero (stesso wifi) che ascolta il master ne usa molte meno
const GIU_MS = 3 * 60 * 1000; // dopo troppi errori di fila, Edge non si chiama per 3 minuti
const ERRORI_GIU = 3;
// le voci italiane di Edge: Diego (calda, da narratore) è quella del master; le altre per chi vuole cambiarla
const VOCI = {
  diego: 'it-IT-DiegoNeural',
  giuseppe: 'it-IT-GiuseppeMultilingualNeural',
  isabella: 'it-IT-IsabellaNeural',
  elsa: 'it-IT-ElsaNeural',
};
const nomeVoce = (v) => `Microsoft Server Speech Text to Speech Voice (it-IT, ${v.replace(/^it-IT-/, '')})`;

// il token che Edge controlla: lo SHA-256 dell'ora (in tick di Windows, arrotondata ai 5 minuti) più il token fisso.
// scarto: la differenza tra l'orologio del server e quello di Microsoft (si corregge se Edge risponde 403)
let scarto = 0;
function secMsGec(ora = Date.now() / 1000 + scarto) {
  let t = Math.floor(ora) + 11644473600;
  t -= t % 300;
  return crypto.createHash('sha256').update(`${t}0000000${TOKEN}`, 'ascii').digest('hex').toUpperCase();
}
const id = () => crypto.randomBytes(16).toString('hex');
// "Fri Oct 24 2026 12:55:55 GMT+0000 (Coordinated Universal Time)", come lo scrive il JavaScript di Edge
function dataEdge(d = new Date()) {
  const [g, n, m, a, h] = d.toUTCString().replace(',', '').split(' ');
  return `${g} ${m} ${n} ${a} ${h} GMT+0000 (Coordinated Universal Time)`;
}
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
// niente caratteri di controllo (Edge chiude la connessione) e niente spazi doppi
const pulisci = (s) => String(s || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TESTO);

function ssml(testo, voce, velocita, tono) {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='it-IT'><voice name='${nomeVoce(voce)}'><prosody pitch='${tono}' rate='${velocita}' volume='+0%'>${escXml(testo)}</prosody></voice></speak>`;
}
// i messaggi binari di Edge: 2 byte con la lunghezza delle intestazioni, le intestazioni, poi l'audio
function pezzoAudio(buf) {
  if (buf.length < 2) return null;
  const n = buf.readUInt16BE(0);
  const testa = buf.subarray(2, 2 + n).toString('utf8');
  if (!/Path:audio\r?\n/.test(testa)) return null;
  return buf.subarray(2 + n);
}

// una frase → mp3 (Buffer). Rifiuta se Edge non risponde, chiude o non manda audio.
function chiediEdge(testo, voce, { velocita = '-4%', tono = '-2Hz', url = URL_EDGE, timeout = TIMEOUT_MS } = {}) {
  return new Promise((ok, no) => {
    const indirizzo = `${url}&ConnectionId=${id()}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${VERSIONE_CHROMIUM}`;
    const maggiore = VERSIONE_CHROMIUM.split('.')[0];
    const ws = new WebSocket(indirizzo, {
      headers: {
        Pragma: 'no-cache', 'Cache-Control': 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${maggiore}.0.0.0 Safari/537.36 Edg/${maggiore}.0.0.0`,
        'Accept-Encoding': 'gzip, deflate, br, zstd', 'Accept-Language': 'en-US,en;q=0.9',
        Cookie: `muid=${id().toUpperCase()};`,
      },
      handshakeTimeout: timeout,
    });
    const pezzi = [];
    let finito = false;
    const fine = (err) => {
      if (finito) return;
      finito = true; clearTimeout(timer);
      try { ws.terminate(); } catch (e) { /* niente */ }
      const audio = Buffer.concat(pezzi);
      if (err) no(err); else if (!audio.length) no(new Error('nessun audio')); else ok(audio);
    };
    const timer = setTimeout(() => fine(new Error('tempo scaduto')), timeout);
    // 403: l'orologio del server è diverso da quello di Microsoft, si prende il loro (vale per la prossima richiesta)
    ws.on('unexpected-response', (_req, res) => {
      const data = Date.parse(res.headers.date || '');
      if (res.statusCode === 403 && data) scarto = data / 1000 - Date.now() / 1000;
      fine(new Error(`Edge risponde ${res.statusCode}`));
    });
    ws.on('error', (e) => fine(e));
    ws.on('close', () => fine(new Error('connessione chiusa')));
    ws.on('open', () => {
      const ora = dataEdge();
      ws.send(`X-Timestamp:${ora}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
      ws.send(`X-RequestId:${id()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ora}Z\r\nPath:ssml\r\n\r\n${ssml(testo, voce, velocita, tono)}`);
    });
    ws.on('message', (dati, binario) => {
      if (binario) { const a = pezzoAudio(Buffer.from(dati)); if (a && a.length) pezzi.push(a); return; }
      if (/Path:turn\.end/.test(String(dati))) fine(null);
    });
  });
}

// ---------- il servizio per il sito: memoria delle ultime frasi, limiti, "Edge è giù" ----------
class Voce {
  constructor({ chiedi = chiediEdge, frasiAlMinuto = FRASI_AL_MINUTO } = {}) {
    this.chiedi = chiedi;
    this.frasiAlMinuto = frasiAlMinuto;
    this.memoria = new Map(); // chiave → Promise<Buffer>, le ultime 300 frasi
    this.insieme = 0;
    this.errori = 0;
    this.giuFino = 0;
    this.perIp = new Map();
  }
  get giu() { return Date.now() < this.giuFino; }
  conta(ip) {
    const ora = Date.now(), m = Math.floor(ora / 60000);
    let c = this.perIp.get(ip);
    if (!c || c.m !== m) { c = { m, n: 0 }; this.perIp.set(ip, c); }
    if (this.perIp.size > 5000) for (const [k, v] of this.perIp) if (v.m !== m) this.perIp.delete(k);
    return ++c.n <= this.frasiAlMinuto;
  }
  // { audio } oppure { errore, stato } (400 richiesta sbagliata, 429 troppe, 503 Edge non c'è)
  async leggi(testoGrezzo, voceGrezza, ip = '') {
    const testo = pulisci(testoGrezzo);
    if (!testo) return { errore: 'manca il testo', stato: 400 };
    const v = String(voceGrezza || 'diego');
    const voce = Object.prototype.hasOwnProperty.call(VOCI, v) ? VOCI[v] : null; // niente "constructor" & co.
    if (!voce) return { errore: 'voce sconosciuta', stato: 400 };
    const chiave = `${voce}|${testo}`;
    const giaFatta = this.memoria.get(chiave);
    if (giaFatta) {
      this.memoria.delete(chiave); this.memoria.set(chiave, giaFatta); // in fondo: è la più recente
      try { return { audio: await giaFatta }; } catch (e) { /* è fallita: si riprova sotto */ }
    }
    if (this.giu) return { errore: 'la voce di Edge non risponde', stato: 503 };
    if (!this.conta(ip)) return { errore: 'troppe frasi', stato: 429 };
    if (this.insieme >= MAX_INSIEME) return { errore: 'troppe richieste insieme', stato: 503 };
    this.insieme++;
    const p = this.chiedi(testo, voce);
    this.memoria.set(chiave, p);
    while (this.memoria.size > 300) this.memoria.delete(this.memoria.keys().next().value);
    try {
      const audio = await p;
      this.errori = 0;
      return { audio };
    } catch (e) {
      this.memoria.delete(chiave);
      if (++this.errori >= ERRORI_GIU) { this.giuFino = Date.now() + GIU_MS; this.errori = 0; console.warn(`[voce] Edge non risponde (${e.message}): per ${GIU_MS / 60000} minuti legge la voce del browser`); }
      return { errore: 'la voce di Edge non risponde', stato: 503 };
    } finally { this.insieme--; }
  }
  // GET /voce?t=frase&v=diego → audio/mpeg
  rotta(ipDi) {
    return async (req, res) => {
      const r = await this.leggi(req.query.t, req.query.v, ipDi(req));
      if (r.errore) { res.status(r.stato).type('text/plain').send(r.errore); return; }
      res.set('Cache-Control', 'private, max-age=86400').type('audio/mpeg').send(r.audio);
    };
  }
}

module.exports = { Voce, chiediEdge, secMsGec, dataEdge, ssml, pezzoAudio, pulisci, VOCI, MAX_TESTO };
