// Esecuzione pubblica: riconosce "67", "sessantasette", "sessanta sette" in un messaggio di chat.
// Maiuscole, accenti e punteggiatura non contano; 167 o 670 non valgono (deve essere proprio 67).
const eSessantasette = (t) => {
  const x = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /(^|[^0-9])67([^0-9]|$)/.test(x) || /sessanta[\s\-_.]*sette/.test(x);
};
// Video di Enrico Papi: "enrico papi" in un messaggio (maiuscole, accenti, spazi o punti in mezzo non contano)
const eEnricoPapi = (t) => /(^|[^a-z])enrico[\s\-_.]*papi([^a-z]|$)/.test(String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
module.exports = { eSessantasette, eEnricoPapi };
