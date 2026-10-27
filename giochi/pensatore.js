// IL COMPUTER CHE PENSA A PARTE: nei giochi da tavolo il computer difficile cerca la mossa per quasi un secondo (negli
// scacchi cinesi 1,5 s). Node fa una cosa alla volta: mentre pensa, tutti gli altri tavoli del sito (anche i giochi in
// tempo reale) restano fermi. Qui la ricerca si fa in un thread a parte (worker_threads): il server manda una copia
// della partita, il thread ricostruisce l'oggetto del gioco, chiama bot() e rimanda la mossa.
// Si usa solo per i giochi con meta.pensaLento; se il thread non c'è o sbaglia, il server fa pensare il computer come
// prima (nello stesso thread), quindi la partita non si blocca mai.
const { Worker, isMainThread, parentPort } = require('worker_threads');

// rimette i prototipi (le classi) agli oggetti copiati, prendendoli da una partita nuova dello stesso gioco: la copia
// strutturata tiene numeri, array, Map, Set e array tipati, ma perde le classi (per esempio la Tavola del Go)
function rimettiClassi(copia, modello, visti = new Set()) {
  if (!copia || typeof copia !== 'object' || !modello || typeof modello !== 'object' || visti.has(copia)) return;
  visti.add(copia);
  if (ArrayBuffer.isView(copia) || copia instanceof Map || copia instanceof Set) return;
  const pr = Object.getPrototypeOf(modello);
  if (pr && pr !== Object.prototype && pr !== Array.prototype && Object.getPrototypeOf(copia) !== pr && !ArrayBuffer.isView(modello)) Object.setPrototypeOf(copia, pr);
  for (const k of Object.keys(copia)) rimettiClassi(copia[k], modello[k], visti);
}

if (!isMainThread && parentPort) {
  const { GIOCHI } = require('./index');
  parentPort.on('message', ({ id, gioco, stato, crea, posto, livello }) => {
    try {
      const mod = GIOCHI[gioco];
      const modello = mod.crea(crea);
      rimettiClassi(stato, modello);
      Object.setPrototypeOf(stato, Object.getPrototypeOf(modello));
      parentPort.postMessage({ id, mossa: mod.bot(stato, posto, livello) });
    } catch (e) {
      parentPort.postMessage({ id, errore: e.message });
    }
  });
} else {
  const QUANTI = 2; // due thread bastano: le mosse lente sono poche e brevi
  const TEMPO_MAX = 15000; // se un thread non risponde, si pensa come prima
  const lavoratori = [];
  let nId = 0;
  const attese = new Map();

  function nuovo() {
    const w = new Worker(__filename);
    w.occupati = 0;
    w.on('message', ({ id, mossa, errore }) => {
      const a = attese.get(id); if (!a) return;
      attese.delete(id); clearTimeout(a.timer); w.occupati--;
      if (errore) a.no(new Error(errore)); else a.si(mossa);
    });
    w.on('error', () => togli(w));
    w.on('exit', () => togli(w));
    w.unref(); // non tiene acceso il processo (test, chiusura del server); dopo i listener, che lo riaccenderebbero
    return w;
  }
  function togli(w) {
    const k = lavoratori.indexOf(w); if (k >= 0) lavoratori.splice(k, 1);
    for (const [id, a] of attese) if (a.w === w) { attese.delete(id); clearTimeout(a.timer); a.no(new Error('thread chiuso')); }
  }
  function libero() {
    while (lavoratori.length < QUANTI) lavoratori.push(nuovo());
    return lavoratori.reduce((a, b) => (b.occupati < a.occupati ? b : a));
  }

  // la mossa del computer pensata nel thread a parte: una Promise con la mossa
  function pensa(gioco, g, posto, livello, crea) {
    return new Promise((si, no) => {
      let stato;
      try { stato = structuredClone({ ...g }); } catch (e) { no(e); return; }
      let w;
      try { w = libero(); } catch (e) { no(e); return; }
      const id = ++nId;
      const timer = setTimeout(() => { attese.delete(id); w.occupati--; no(new Error('troppo tempo')); }, TEMPO_MAX);
      attese.set(id, { si, no, timer, w });
      w.occupati++;
      w.postMessage({ id, gioco, stato, crea, posto, livello });
    });
  }
  module.exports = { pensa, rimettiClassi };
}
