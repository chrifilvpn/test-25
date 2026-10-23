// IL TRUCCO SEGRETO: chi scrive in chat "!win banana" (al tavolo, durante una partita) non manda nessun messaggio e
// nessuno viene avvisato: nella prossima mano / giro / round la fortuna gira dalla sua parte, oppure gli compare per
// qualche secondo un suggerimento segreto (la mossa migliore, la parola giusta, chi è l'alieno…) che poi sparisce.
//
// Come lo usa un gioco:
// - FORTUNA: nel punto in cui si mescola, si pesca, si tira o si gira, `T.consuma(this, posto)` dice se quel posto ha
//   il trucco attivo (e lo spegne: vale una volta sola). Se sì, il gioco trucca quel risultato.
//   `T.armato(this, posto)` lo guarda senza spegnerlo (es. nei giochi in tempo reale che lo usano per tutto un round).
// - SUGGERIMENTO: il gioco ha un metodo `suggerimentoWin(posto)` che restituisce il testo da mostrare (o null se in
//   quel momento non ha senso, per esempio non è il turno di quel giocatore). Il server lo chiama dopo ogni
//   aggiornamento finché il trucco è attivo; appena c'è un testo lo manda solo a quel giocatore e spegne il trucco.
// - In qualsiasi momento il gioco può mandare un messaggio segreto con `T.sussurra(this, posto, testo)`.
// - `trucco(posto)` (facoltativo) viene chiamato subito quando il comando arriva, per gli effetti immediati.

const COMANDO = /^!win\s+banana$/i;
const eComando = (testo) => COMANDO.test(String(testo || '').trim());

function arma(g, posto) { g._win = g._win || {}; g._win[posto] = true; }
const armato = (g, posto) => !!(g && g._win && g._win[posto]);
function consuma(g, posto) {
  if (!armato(g, posto)) return false;
  delete g._win[posto];
  return true;
}
function sussurra(g, posto, testo, durata = 4500) { (g._sussurri = g._sussurri || []).push({ posto, testo: String(testo), durata }); }
// i messaggi segreti da mandare (e li toglie dalla coda)
function prendiSussurri(g) { const s = (g && g._sussurri) || []; if (g) g._sussurri = []; return s; }
// dopo ogni aggiornamento: i suggerimenti che ora si possono dare
function controllaSuggerimenti(g) {
  if (!g || !g._win || typeof g.suggerimentoWin !== 'function' || g.finita) return;
  for (const posto of Object.keys(g._win).map(Number)) {
    let t = null;
    try { t = g.suggerimentoWin(posto); } catch (e) { t = null; }
    if (t) { consuma(g, posto); sussurra(g, posto, t); }
  }
}

// ---- aiutini comuni ----
// mette in cima al mazzo (l'ultima carta, quella che si pesca con pop) la prima carta che soddisfa la condizione;
// restituisce la carta spostata o null. Con `inizio` vale per i giochi che pescano con shift.
function inCima(mazzo, condizione, { inizio = false } = {}) {
  const i = mazzo.findIndex(condizione);
  if (i < 0) return null;
  const [c] = mazzo.splice(i, 1);
  if (inizio) mazzo.unshift(c); else mazzo.push(c);
  return c;
}
// sceglie tra le carte quella col punteggio più alto secondo la funzione data
function migliore(lista, punteggio) { let best = null, bv = -Infinity; for (const x of lista) { const v = punteggio(x); if (v > bv) { bv = v; best = x; } } return best; }

module.exports = { eComando, arma, armato, consuma, sussurra, prendiSussurri, controllaSuggerimenti, inCima, migliore };
