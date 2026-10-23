// DRAGHI E SEGRETE, la colonna sonora (public/js/giochi3/draghi-musica.js): ogni ambientazione ha la sua musica, ogni
// area delle campagne horror, ogni tipo di luogo fantasy e ogni scena di battaglia ha la sua zona con un letto di
// rumori che esiste, ogni rumore sparso ha il suo suono. Poi la si fa suonare con un Web Audio finto (tutti i temi,
// tutte le zone, tutti gli umori) e si controlla che l'umore segua il gioco: a turni, in combattimento con la creatura
// e in tempo reale (creatura vista, inseguimento, sott'acqua), e che senza audio del sito non parta niente.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('../../giochi3/draghi/horror');
const MP = require('../../giochi3/draghi/mappe');
const ST = require('../../giochi3/draghi/stazione');

const FILE = path.join(__dirname, '../../public/js/giochi3/draghi-musica.js');
const sorgente = fs.readFileSync(FILE, 'utf8');

// ---------- un Web Audio finto: nodi che si collegano e parametri che accettano tutto ----------
let nodi = 0;
const parametro = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime(v) { assert.ok(v > 0, 'rampa esponenziale verso 0'); }, setTargetAtTime() {}, cancelScheduledValues() {} });
function nodo() {
  nodi++;
  return { connect: (x) => x, disconnect() {}, start() {}, stop() {}, frequency: parametro(), detune: parametro(), gain: parametro(), Q: parametro(), delayTime: parametro(), threshold: parametro(), ratio: parametro(), type: '', buffer: null, loop: false, loopStart: 0 };
}
class AudioFinto {
  constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 3000; this.destination = nodo(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createBuffer(c, n) { const d = Array.from({ length: c }, () => new Float32Array(n)); return { getChannelData: (k) => d[k] }; }
}
for (const k of ['Gain', 'Oscillator', 'BiquadFilter', 'BufferSource', 'Convolver', 'Delay', 'DynamicsCompressor']) AudioFinto.prototype[`create${k}`] = nodo;

function carica({ suono = 'true', inGioco = true } = {}) {
  const intervalli = [];
  const bottone = { getAttribute: () => suono };
  const pannello = { querySelector: () => null, appendChild() {} };
  const finestra = {
    AudioContext: AudioFinto,
    Boss: { attivo: false, muto: suono === 'false' },
  };
  const sandbox = {
    window: finestra, performance: { now: () => Date.now() }, localStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: (id) => (id === 'suono' ? bottone : null), querySelector: (q) => (inGioco && q === '#panno .dr' ? pannello : null), createElement: () => ({ classList: { toggle() {}, add() {} }, setAttribute() {}, addEventListener() {}, blur() {} }) },
    setInterval: (f) => { intervalli.push(f); return intervalli.length; }, clearInterval() {}, setTimeout: () => 0, Math, console,
  };
  vm.runInNewContext(sorgente, sandbox, { filename: FILE });
  return { MU: finestra.DraghiMusica, intervalli };
}

// ---------- i dati: niente zone, letti o suoni mancanti ----------
{
  const { MU } = carica();
  const scene = new Set([...MP.STILI_SCENA, ...ST.STILI]);
  const ambientazioni = ['classica', 'oscura', 'pirati', 'citta', 'selvaggia', ...H.TEMI];
  for (const a of ambientazioni) assert.ok(MU.TEMI[a], `manca la musica dell'ambientazione ${a}`);
  for (const [id, cp] of Object.entries(H.CAMPAGNE)) for (const ar of cp.aree) assert.ok(MU.ZONE[ar.stile] || MU.AREE[ar.id], `${id}: l'area ${ar.id} (stile ${ar.stile}) non ha musica`);
  for (const t of MP.TIPI_LUOGO) assert.ok(MU.ZONE[t], `il tipo di luogo ${t} non ha musica`);
  for (const s of scene) assert.ok(MU.ZONE[s], `la scena di battaglia ${s} non ha musica`);
  const eventi = new Set();
  for (const z of [...Object.values(MU.ZONE), ...Object.values(MU.AREE)]) if (z.letto) assert.ok(MU.LETTI[z.letto], `manca il letto di rumori ${z.letto}`);
  for (const L of Object.values(MU.LETTI)) for (const k of Object.keys(L.eventi || {})) eventi.add(k);
  for (const k of eventi) assert.ok(sorgente.includes(`case '${k}'`), `il rumore «${k}» non ha un suono`);
  for (const T of Object.values(MU.TEMI)) assert.ok(T.giro.every((g) => Number.isInteger(g) && g >= 0 && g < 7));
  // ogni ambientazione suona diversa: radice, scala o strumenti
  const firme = new Set(Object.values(MU.TEMI).map((T) => `${T.radice}${T.scala}${T.pad}${T.mel}`));
  assert.strictEqual(firme.size, Object.keys(MU.TEMI).length, 'due ambientazioni con la stessa musica');
}

// ---------- suona tutto: ogni tema in ogni zona in ogni umore ----------
{
  const { MU } = carica();
  const { S, M, avvia, passo, evento, colpo, cambiaLetto } = MU._prova;
  assert.ok(avvia());
  M.suona = true;
  for (const tema of Object.keys(MU.TEMI)) {
    for (const zona of [...Object.keys(MU.ZONE), ...Object.keys(MU.AREE)]) {
      S.tema = tema; S.zona = zona;
      const z = MU.AREE[zona] || MU.ZONE[zona];
      cambiaLetto(z.letto ? MU.LETTI[z.letto] : null);
      for (const u of Object.keys(MU.UMORI)) { S.umore = u; for (let n = 0; n < 64; n += 1) passo(n * 0.1, n); }
    }
    colpo();
  }
  for (const L of Object.values(MU.LETTI)) for (const k of Object.keys(L.eventi)) evento(k, 1);
  assert.ok(nodi > 10000, 'la musica non ha suonato niente');
}

// ---------- l'umore segue il gioco ----------
const ctxDi = (p) => ({ partita: { fase: 'avventura', ambientazione: 'classica', atmosfera: 'calma', ...p } });
{
  const { MU } = carica();
  const { S } = MU._prova;
  // fantasy: il luogo dove si è dà la zona, l'atmosfera del master l'umore
  MU.aggiorna(ctxDi({ ambientazione: 'pirati', mondo: { posizione: 'l1', luoghi: [{ id: 'l1', tipo: 'porto' }] }, atmosfera: 'festa' }));
  assert.deepStrictEqual([S.tema, S.zona, S.umore], ['pirati', 'porto', 'festa']);
  MU.aggiorna(ctxDi({ ambientazione: 'pirati', mondo: { posizione: 'l1', luoghi: [{ id: 'l1', tipo: 'porto' }] }, combattimento: { scena: { stile: 'taverna' }, creature: [{ lato: 'nemici', mostro: 'goblin' }] } }));
  assert.deepStrictEqual([S.zona, S.umore], ['taverna', 'battaglia']);
  // la creazione del personaggio: il tema dell'ambientazione, calmo, senza rumori
  MU.aggiorna(ctxDi({ fase: 'creazione', ambientazione: 'oscura' }));
  assert.strictEqual(S.zona, 'menu');
  // horror a turni: l'area, la caccia, il combattimento con la creatura, la scelta morale
  const inc = (x) => ({ id: 'pathos', area: 'fondale', aree: H.CAMPAGNE.pathos.aree.map((a) => ({ id: a.id, stile: a.stile })), ...x });
  const { MU: MU2 } = carica();
  MU2.aggiorna(ctxDi({ ambientazione: 'pathos', incubo: inc({}) }));
  assert.deepStrictEqual([MU2._prova.S.tema, MU2._prova.S.zona, MU2._prova.S.umore], ['pathos', 'fondale', 'esplora']);
  MU2.aggiorna(ctxDi({ ambientazione: 'pathos', incubo: inc({ cacciaAttiva: true }) }));
  assert.strictEqual(MU2._prova.S.umore, 'pericolo');
  MU2.aggiorna(ctxDi({ ambientazione: 'pathos', incubo: inc({ area: 'upsilon' }), combattimento: { scena: { stile: 'sottomarina' }, creature: [{ lato: 'nemici', mostro: 'akers' }] } }));
  assert.deepStrictEqual([MU2._prova.S.zona, MU2._prova.S.umore], ['sottomarina', 'caccia']);
  MU2.aggiorna(ctxDi({ ambientazione: 'pathos', incubo: inc({ area: 'abisso' }) }));
  assert.strictEqual(MU2._prova.S.zona, 'abisso');
  // la paura non passa subito: dalla caccia all'esplorazione si torna solo dopo qualche secondo
  assert.strictEqual(MU2._prova.S.umore, 'caccia');
  MU2._prova.S.tenutoFino = 0;
  MU2.aggiorna(ctxDi({ ambientazione: 'pathos', incubo: inc({ area: 'abisso', scelta: { testo: 'Copiare la mente?' } }) }));
  assert.strictEqual(MU2._prova.S.umore, 'sospeso');
}
// tempo reale: la zona dalla posizione, l'umore da cosa si vede e si sente
{
  const { MU } = carica();
  const { S } = MU._prova;
  const aree = H.CAMPAGNE.sevastopol.aree.map((a) => ({ id: a.id, gx: a.gx, gy: a.gy, stile: a.stile }));
  const nido = aree.find((a) => a.id === 'nido'), lorenz = aree.find((a) => a.id === 'lorenz');
  const ctx = { partita: { fase: 'reale', ambientazione: 'sevastopol', incubo: { id: 'sevastopol' }, reale: { aree, sw: 40, sh: 30 } } };
  const dove = (a) => ({ x: a.gx * 40 + 20, y: a.gy * 30 + 15 });
  const d = (x) => ({ occhi: 0, g: [{ ...dove(lorenz) }], ent: [], blip: [], suoni: [], ...x });
  MU.tick(ctx, d({}));
  assert.deepStrictEqual([S.tema, S.zona, S.umore], ['sevastopol', 'uffici', 'esplora']);
  MU.tick(ctx, d({ blip: [[dove(lorenz).x + 3, dove(lorenz).y]] }));
  assert.strictEqual(S.umore, 'tensione', 'il rilevatore segna qualcosa vicino');
  MU.tick(ctx, d({ ent: [{ k: 'creatura', st: 'cerca' }] }));
  assert.strictEqual(S.umore, 'pericolo', 'la creatura si vede');
  MU.tick(ctx, d({ allarme: true }));
  assert.strictEqual(S.umore, 'caccia', 'la creatura insegue');
  S.tenutoFino = 0;
  MU.tick(ctx, d({ g: [{ ...dove(nido) }] }));
  assert.deepStrictEqual([S.zona, S.umore], ['nido', 'tensione'], 'nel nido non si è mai tranquilli');
  MU.tick(ctx, d({ vicina: 3 }));
  assert.strictEqual(S.umore, 'caccia');
}
// senza audio del sito (🔇, com'è all'apertura) non parte niente; fuori dal gioco si spegne
{
  const { MU, intervalli } = carica({ suono: 'false' });
  MU.aggiorna(ctxDi({}));
  assert.strictEqual(MU.stato().suona, false, 'la musica parte con l\'audio del sito spento');
  const acceso = carica();
  acceso.MU.aggiorna(ctxDi({}));
  assert.strictEqual(acceso.MU.stato().suona, true);
  const fuori = carica({ inGioco: false });
  fuori.MU.aggiorna(ctxDi({}));
  fuori.intervalli[0]();
  assert.strictEqual(fuori.MU.stato().suona, false, 'la musica resta accesa fuori dal gioco');
  assert.ok(intervalli.length >= 1);
}
console.log('✓ Draghi e Segrete: colonna sonora per ogni ambientazione, zona e momento (tempo reale e a turni), spenta col sito muto');
