// ARCHIVIO: dove il sito tiene i dati che devono durare più di una partita (classifiche della sfida del giorno,
// record dei giochi). Per ora i dati stanno in memoria e vengono copiati ogni tanto in un file (.dati/archivio.json),
// così sopravvivono a un riavvio sul proprio computer. Su Render gratuito il file si perde quando il sito si
// riavvia: per tenerli davvero basterà collegare un database esterno qui sotto (vedi README, "Dati che durano"),
// senza toccare il resto del sito, che usa solo leggi / scrivi / aggiungiInClassifica.
const fs = require('fs');
const path = require('path');

const CARTELLA = process.env.ARCHIVIO_CARTELLA || path.join(__dirname, '.dati');
const FILE = path.join(CARTELLA, 'archivio.json');
const MAX_CHIAVI = 5000; // un tetto, per non riempire la memoria del server
const dati = new Map();
let sporco = false;

// all'avvio si ricarica quello che c'era (se c'era)
try {
  const x = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  for (const [k, v] of Object.entries(x)) dati.set(k, v);
} catch { /* niente file: si parte vuoti */ }

function salva() {
  if (!sporco || process.env.TEST_VELOCE) return;
  sporco = false;
  try {
    fs.mkdirSync(CARTELLA, { recursive: true });
    fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(Object.fromEntries(dati)));
    fs.renameSync(`${FILE}.tmp`, FILE);
  } catch (e) { console.warn('[archivio] non riesco a salvare:', e.message); }
}
const timer = setInterval(salva, 30000);
if (timer.unref) timer.unref();
process.once('beforeExit', salva);

const leggi = (chiave, predefinito = null) => (dati.has(chiave) ? dati.get(chiave) : predefinito);
function scrivi(chiave, valore) {
  if (!dati.has(chiave) && dati.size >= MAX_CHIAVI) {
    // si butta la chiave più vecchia (le Map ricordano l'ordine di inserimento), ma prima i segni "sfida già fatta":
    // così chi apre tante sfide con identificativi nuovi non può far sparire le classifiche
    let via = null;
    for (const k of dati.keys()) if (k.startsWith('sfidaFatta:')) { via = k; break; }
    dati.delete(via !== null ? via : dati.keys().next().value);
  }
  dati.set(chiave, valore);
  sporco = true;
}

// classifica: una lista ordinata (dal migliore) di al massimo "quanti" risultati { nome, valore, ... }.
// crescente = true quando vince il valore più basso (tempi, mosse). Restituisce la posizione (0 = primo) o -1.
function aggiungiInClassifica(chiave, voce, { quanti = 10, crescente = false, unoPerNome = true } = {}) {
  const lista = (leggi(chiave, []) || []).slice();
  const meglio = (a, b) => (crescente ? a.valore < b.valore : a.valore > b.valore);
  if (unoPerNome) {
    const i = lista.findIndex((x) => x.nome === voce.nome);
    if (i >= 0) { if (!meglio(voce, lista[i])) return -1; lista.splice(i, 1); } // conta solo il proprio risultato migliore
  }
  const nuova = { ...voce, quando: Date.now() };
  lista.push(nuova);
  lista.sort((a, b) => (crescente ? a.valore - b.valore : b.valore - a.valore) || a.quando - b.quando);
  lista.splice(quanti);
  scrivi(chiave, lista);
  return lista.indexOf(nuova);
}

module.exports = { leggi, scrivi, aggiungiInClassifica, salva, _dati: dati };
