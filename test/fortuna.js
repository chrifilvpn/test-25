// LA FORTUNA DEI TEST: i numeri "a caso" sono sempre gli stessi (generatore con un seme fisso). fissa(nome) fa ripartire
// la sequenza da un seme ricavato dal nome del gruppo di test: così una differenza dentro un gruppo (per esempio un
// gioco che usa l'ora vera) non sposta la fortuna di tutti i gruppi dopo. Nei test i computer che pensano a tempo
// usano anche un orologio finto (giochi/orologio.js).
function fissa(nome = '') {
  let seme = 20261023;
  for (const c of String(nome)) seme = (seme * 31 + c.charCodeAt(0)) % 2147483647;
  if (seme <= 0) seme += 2147483646;
  Math.random = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
module.exports = { fissa };
