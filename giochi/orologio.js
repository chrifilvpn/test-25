// L'OROLOGIO DEI COMPUTER CHE PENSANO A TEMPO (scacchi, dama, go…). Nel sito è l'ora vera. Nei test (TEST_VELOCE)
// è un orologio finto che avanza di "passo" millisecondi a ogni controllo: così quanto pensa il computer non dipende
// da quanto è carico il computer che fa i test, e con la stessa fortuna le partite tra computer escono sempre uguali.
// Il passo di ogni gioco è circa il tempo vero tra un controllo e l'altro (misurato), così la forza resta quella di prima.
const TEST = !!process.env.TEST_VELOCE;
let finto = 0;
const ora = (passo = 0) => (TEST ? (finto += passo) : Date.now());
module.exports = { ora };
