// DRAGHI E SEGRETE, la voce narrante del master. Server (voce.js): si parla con un Edge finto (un server WebSocket
// locale che risponde come quello vero) e si controlla il token, le intestazioni, l'SSML, l'audio rimesso insieme, la
// memoria delle frasi, i limiti e il passaggio alla voce del browser quando Edge è giù. Browser
// (public/js/giochi3/draghi-voce.js): la pulizia del testo, le frasi, e che si legga solo il master nuovo.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WebSocket = require('ws');
const V = require('../../voce');

// ---------- il token e i messaggi ----------
{
  const a = V.secMsGec(1793000000), b = V.secMsGec(1793000000 + 10);
  assert.ok(/^[0-9A-F]{64}$/.test(a), 'Sec-MS-GEC: SHA-256 maiuscolo');
  assert.strictEqual(a, b, 'lo stesso token per 5 minuti');
  assert.notStrictEqual(a, V.secMsGec(1793000000 + 400), 'cambia dopo 5 minuti');
  assert.ok(/^\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT\+0000 \(Coordinated Universal Time\)$/.test(V.dataEdge(new Date(Date.UTC(2026, 9, 24, 9, 5, 7)))), V.dataEdge());
  const x = V.ssml('Tom & <Jerry> dice \'ciao\'', 'it-IT-DiegoNeural', '-4%', '-2Hz');
  assert.ok(x.includes('Tom &amp; &lt;Jerry&gt; dice &apos;ciao&apos;'), 'SSML: testo protetto');
  assert.ok(x.includes("name='Microsoft Server Speech Text to Speech Voice (it-IT, DiegoNeural)'"), 'nome lungo della voce');
  const testa = Buffer.from('X-RequestId:1\r\nContent-Type:audio/mpeg\r\nPath:audio\r\n');
  const msg = Buffer.concat([Buffer.from([0, testa.length]), testa, Buffer.from('MP3')]);
  assert.strictEqual(String(V.pezzoAudio(msg)), 'MP3');
  assert.strictEqual(V.pulisci('a\u0000b\n\n  c'), 'a b c');
  assert.ok(V.pulisci('x'.repeat(2000)).length <= V.MAX_TESTO);
}

// ---------- il browser ----------
const FILE = path.join(__dirname, '../../public/js/giochi3/draghi-voce.js');
function carica() {
  const chieste = [], intervalli = [];
  const nodo = () => ({ connect: (x) => x, gain: { value: 1 }, start() {}, stop() {} });
  // il tempo dell'audio avanza un po' a ogni lettura
  class AudioFinto { constructor() { this.t = 0; this.state = 'running'; this.destination = nodo(); } get currentTime() { this.t += 0.1; return this.t; } createGain() { return nodo(); } createBufferSource() { return nodo(); } decodeAudioData() { return Promise.resolve({ duration: 1 }); } }
  const pannello = { querySelector: () => null, appendChild() {} };
  const finestra = {
    AudioContext: AudioFinto, AbortController,
    fetch: (u) => { chieste.push(decodeURIComponent(u.split('t=')[1])); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) }); },
  };
  const sandbox = {
    window: finestra, localStorage: { getItem: () => null, setItem() {} }, console, Math, Date, Promise,
    document: { addEventListener() {}, getElementById: () => ({ getAttribute: () => 'true' }), querySelector: (q) => (q === '#panno .dr' ? pannello : null), createElement: () => ({ classList: { toggle() {}, add() {}, contains: () => false }, setAttribute() {}, addEventListener() {} }) },
    setInterval: (f) => { intervalli.push(f); return 1; }, setTimeout: (f) => { f(); return 1; }, clearTimeout() {},
  };
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), sandbox, { filename: FILE });
  return { VO: finestra.DraghiVoce, chieste };
}
{
  const { VO } = carica();
  const t = VO.pulisci('## La cripta\n**Kael** entra 🗡️🔥 nella *cripta* — buio.\n- una porta\n- [un link](http://x.it)\nHai 7 PF... ✨');
  assert.ok(!/[*#🗡🔥✨]/u.test(t) && !t.includes('http') && !t.includes('—'), `pulito: ${t}`);
  assert.ok(t.includes('Kael entra') && t.includes('nella cripta, buio.') && t.includes('una porta') && t.includes('un link') && t.includes('7 punti ferita…'), t);
  assert.strictEqual(VO.pulisci('il nome_del_file resta'), 'il nome_del_file resta', 'i trattini bassi nelle parole restano');
  const lungo = 'La nebbia sale dalla palude. ' + Array.from({ length: 12 }, (_, i) => `Il vento porta la voce numero ${i}, lontana e stanca, che chiama il vostro nome.`).join(' ') + '\n\n«Chi va là?» grida la guardia! Silenzio.';
  const f = VO.frasi(lungo);
  assert.strictEqual(f[0].testo, 'La nebbia sale dalla palude.', 'la prima frase da sola: la voce parte subito');
  assert.ok(f.every((x) => x.testo.length <= 260 && x.testo.length > 0), 'pezzi corti');
  assert.ok(f.length >= 4 && f.length < 12, `frasi unite: ${f.length}`);
  const parole = (s) => VO.pulisci(s).split(/\s+/).filter(Boolean);
  assert.deepStrictEqual(f.map((x) => x.testo).join(' ').split(/\s+/), parole(lungo), 'nessuna parola persa né doppia');
  const fine1 = f.findIndex((x) => x.testo.includes('numero 11'));
  assert.strictEqual(f[fine1].pausa, 0.45, 'pausa lunga a fine paragrafo');
  assert.strictEqual(f[f.length - 1].testo, '«Chi va là?» grida la guardia! Silenzio.');
  const unaFrase = 'E poi ' + 'ancora e ancora, '.repeat(40) + 'fine.';
  assert.ok(VO.frasi(unaFrase).every((x) => x.testo.length <= 260), 'frase lunghissima spezzata alle virgole');
  assert.deepStrictEqual(VO.frasi('🎲🎲 ✨').length, 0, 'solo emoji: niente da leggere');
}
(async () => {
  // si legge solo il master nuovo, non il racconto di prima né le azioni dei giocatori
  {
    const { VO, chieste } = carica();
    const p = { racconto: [{ id: 1, tipo: 'master', testo: 'Vecchia storia.' }] };
    VO.aggiorna({ partita: p });
    assert.strictEqual(chieste.length, 0, 'il racconto vecchio non si legge');
    p.racconto.push({ id: 2, tipo: 'pg', testo: 'Attacco il goblin.' }, { id: 3, tipo: 'master', testo: '**Il goblin** cade. 💀 Arriva un altro goblin.' });
    VO.aggiorna({ partita: p });
    await new Promise((ok) => setImmediate(ok));
    assert.deepStrictEqual(chieste, ['Il goblin cade.', 'Arriva un altro goblin.'], `chieste: ${chieste}`);
    VO.aggiorna({ partita: p });
    assert.strictEqual(chieste.length, 2, 'non si rilegge');
    VO.aggiorna({ partita: { racconto: [{ id: 1, tipo: 'master', testo: 'Partita nuova.' }] } });
    assert.strictEqual(chieste.length, 2, 'partita nuova: si riparte senza rileggere');
  }

  // ---------- il server con un Edge finto ----------
  const edge = new WebSocket.Server({ port: 0 });
  await new Promise((ok) => edge.on('listening', ok));
  const url = `ws://127.0.0.1:${edge.address().port}/edge?TrustedClientToken=X`;
  let visti = null;
  edge.on('connection', (ws, req) => {
    const q = new URL(req.url, 'http://x').searchParams;
    const msg = [];
    ws.on('message', (d) => {
      msg.push(String(d));
      if (msg.length < 2) return;
      visti = { q, origine: req.headers.origin, msg };
      const pezzo = (s) => { const t = Buffer.from(`X-RequestId:1\r\nContent-Type:audio/mpeg\r\nPath:audio\r\n`); return Buffer.concat([Buffer.from([0, t.length]), t, Buffer.from(s)]); };
      ws.send('X-RequestId:1\r\nPath:turn.start\r\n\r\n{}');
      ws.send(pezzo('AAA')); ws.send(pezzo('BBB'));
      ws.send('X-RequestId:1\r\nPath:turn.end\r\n\r\n{}');
    });
  });
  const audio = await V.chiediEdge('Il drago & la torre', 'it-IT-DiegoNeural', { url });
  assert.strictEqual(String(audio), 'AAABBB', 'audio rimesso insieme');
  assert.ok(/^[0-9A-F]{64}$/.test(visti.q.get('Sec-MS-GEC')) && visti.q.get('Sec-MS-GEC-Version').startsWith('1-') && visti.q.get('ConnectionId'), 'parametri del token');
  assert.strictEqual(visti.origine, 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold');
  assert.ok(visti.msg[0].includes('Path:speech.config') && visti.msg[0].includes('audio-24khz-48kbitrate-mono-mp3'));
  assert.ok(visti.msg[1].includes('Path:ssml') && visti.msg[1].includes('Il drago &amp; la torre'));
  await assert.rejects(V.chiediEdge('x', 'it-IT-DiegoNeural', { url: 'ws://127.0.0.1:1/?a=1', timeout: 2000 }), 'Edge irraggiungibile: errore');
  edge.close();

  // memoria, limiti, Edge giù
  {
    let n = 0, rompi = false;
    const voce = new V.Voce({ chiedi: async (t) => { n++; if (rompi) throw new Error('giù'); return Buffer.from(t); }, frasiAlMinuto: 5 });
    assert.strictEqual(String((await voce.leggi('Ciao a tutti.', 'diego', 'a')).audio), 'Ciao a tutti.');
    await voce.leggi('Ciao a tutti.', 'diego', 'b');
    assert.strictEqual(n, 1, 'la stessa frase per tutto il tavolo: Edge la legge una volta');
    assert.strictEqual((await voce.leggi('x', 'nessuna', 'a')).stato, 400, 'solo le voci dell\'elenco');
    assert.strictEqual((await voce.leggi('   ', 'diego', 'a')).stato, 400);
    for (let i = 0; i < 5; i++) await voce.leggi(`frase ${i}`, 'diego', 'c');
    assert.strictEqual((await voce.leggi('una di troppo', 'diego', 'c')).stato, 429, 'tetto di frasi al minuto');
    rompi = true;
    for (let i = 0; i < 3; i++) assert.strictEqual((await voce.leggi(`rotta ${i}`, 'diego', 'd')).stato, 503);
    assert.ok(voce.giu, 'dopo 3 errori Edge è giù');
    const prima = n;
    assert.strictEqual((await voce.leggi('altra', 'diego', 'e')).stato, 503);
    assert.strictEqual(n, prima, 'mentre è giù non si chiama Edge (il browser usa la sua voce)');
    assert.strictEqual(String((await voce.leggi('Ciao a tutti.', 'diego', 'e')).audio), 'Ciao a tutti.', 'le frasi in memoria si sentono anche con Edge giù');
  }
  console.log('✓ Draghi e Segrete, voce narrante: Edge (token, SSML, audio), memoria e limiti, testo pulito, frasi in coda');
})().catch((e) => { console.error(e); process.exit(1); });
