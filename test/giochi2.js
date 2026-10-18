// Controlli dei giochi delle cartelle giochi2 e giochi3: ogni file di test/giochi2 e test/giochi3 si esegue da solo
// (chiamato da test/simula.js)
const fs = require('fs');
const path = require('path');
for (const nome of ['giochi2', 'giochi3']) {
  const dir = path.join(__dirname, nome);
  for (const f of (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((x) => x.endsWith('.js')).sort()) require(path.join(dir, f));
}
