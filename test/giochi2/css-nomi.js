// CSS DEI GIOCHI: ogni gioco ha il suo prefisso. Una classe che apre un selettore (es. ".cs { … }") non deve stare
// anche in un altro foglio di stile: Mastermind usava ".cs", lo stesso nome dei tavoli del casinò, e il blackjack
// sul computer si ritrovava il banco di lato invece che sopra. Si salvano solo le classi comuni (carte, bottoni…).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../../public');
const COMUNI = new Set(['carta', 'mano', 'c-valore', 'conti', 'bottone', 'piccolo', 'tavolo', 'panno']);
function radici(testo) {
  const r = new Set();
  testo = testo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  for (const m of testo.matchAll(/([^{}@;]+)\{/g)) {
    for (const sel of m[1].split(',')) { const k = sel.trim().match(/^\.([a-zA-Z][\w-]*)/); if (k && !COMUNI.has(k[1])) r.add(k[1]); }
  }
  return r;
}
const fogli = {};
for (const f of ['style.css', 'nuovi.css', 'boss.css']) if (fs.existsSync(path.join(dir, f))) fogli[f] = radici(fs.readFileSync(path.join(dir, f), 'utf8'));
for (const cart of ['giochi2', 'giochi3']) for (const f of fs.readdirSync(path.join(dir, 'js', cart)).filter((x) => x.endsWith('.css'))) fogli[`${cart}/${f}`] = radici(fs.readFileSync(path.join(dir, 'js', cart, f), 'utf8'));
const nomi = Object.keys(fogli), doppi = [];
for (let i = 0; i < nomi.length; i++) {
  if (!/^giochi[23]\//.test(nomi[i])) continue; // si controllano i fogli dei giochi nuovi contro tutti gli altri
  for (let j = 0; j < nomi.length; j++) if (j !== i) for (const c of fogli[nomi[i]]) if (fogli[nomi[j]].has(c)) doppi.push(`.${c} in ${nomi[i]} e ${nomi[j]}`);
}
assert.deepStrictEqual([...new Set(doppi)], [], 'classi con lo stesso nome in fogli diversi');
console.log(`✓ CSS dei giochi: nessuna classe in comune tra ${nomi.length} fogli di stile (ogni gioco col suo prefisso)`);
