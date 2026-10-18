// IL TRUCCO SEGRETO (!win banana): in ogni gioco, con il posto 0 che lo attiva, la partita tra computer va avanti
// senza errori e il trucco fa effetto (la fortuna lo spegne usandolo, oppure arriva un suggerimento segreto).
// I controlli precisi di ogni gioco (blackjack servito, numero della roulette…) sono in test/trucco/*.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
process.env.TEST_VELOCE = '1';
const { GIOCHI } = require('../giochi');
const T = require('../giochi/trucco');

// gioca una partita (o un pezzo) con i computer; il posto 0 attiva il trucco all'inizio e dopo ogni effetto
function prova(id, { n, passiMax = 4000, opzioni = {}, riarma = 3 } = {}) {
  const mod = GIOCHI[id];
  n = n || mod.meta.giocatori.find((x) => x >= 2) || mod.meta.giocatori[0];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  const g = mod.crea({ n, primo: 0, opzioni: opz, bot: Array.from({ length: n }, () => 'medio') });
  const effetti = { usati: 0, sussurri: [] };
  const arma = () => { T.arma(g, 0); if (typeof g.trucco === 'function') g.trucco(0); };
  arma();
  let ora = Date.now();
  for (let passo = 0; passo < passiMax && !g.finita; passo++) {
    T.controllaSuggerimenti(g);
    for (const m of T.prendiSussurri(g)) if (m.posto === 0) effetti.sussurri.push(m.testo);
    if (!T.armato(g, 0)) { effetti.usati++; if (effetti.usati > riarma) break; arma(); }
    if (g.tick) { ora += g.tickMs || 50; Date.now = () => ora; g.tick(ora); if (g.attesi && g.attesi().length) for (const p of g.attesi()) { const a = mod.bot(g, p, 'medio'); if (a) g.azione(p, a); } continue; }
    if (g.inAttesa && g.avanza) { g.avanza(); continue; }
    if (g.controllaTempo && g.scadenza && g.scadenza() != null && (!g.attesi || !g.attesi().length) && g.turno == null) { ora += 2000; Date.now = () => ora; g.controllaTempo(); continue; }
    const chi = g.turno != null ? [g.turno] : g.attesi ? g.attesi() : [];
    if (!chi.length) { ora += 1000; Date.now = () => ora; if (g.controllaTempo) g.controllaTempo(); else break; continue; }
    for (const p of chi) { if (g.finita) break; const a = mod.bot(g, p, 'medio'); if (!a) continue; const r = g.azione(p, a); if (r && r.errore && g.sblocca) g.sblocca(p); }
  }
  return effetti;
}

const veroNow = Date.now;
const senza = [];
let provati = 0;
const t0 = veroNow();
for (const id of Object.keys(GIOCHI)) {
  const mod = GIOCHI[id];
  if (!mod.bot) continue;
  let e;
  try { e = prova(id); } catch (err) { Date.now = veroNow; throw new Error(`${id}: ${err.stack}`); }
  Date.now = veroNow;
  provati++;
  if (!e.usati && !e.sussurri.length) senza.push(id);
}
// i controlli precisi gioco per gioco
const cartella = path.join(__dirname, 'trucco');
if (fs.existsSync(cartella)) for (const f of fs.readdirSync(cartella).filter((x) => x.endsWith('.js')).sort()) require(path.join(cartella, f));
if (process.env.TRUCCO_ELENCO) console.log('senza effetto:', senza.join(' '));
assert.deepStrictEqual(senza, [], `!win non fa niente in: ${senza.join(', ')}`);
console.log(`✓ Trucco segreto (!win banana): ${provati} giochi provati con i computer, in tutti ha effetto (${veroNow() - t0} ms)`);
module.exports = { prova };
