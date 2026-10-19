// DADI BUGIARDI: ognuno ha 5 dadi sotto il suo bicchiere e vede solo i propri. A turno si fa una puntata su TUTTI i dadi
// in gioco: "ci sono almeno 4 cinque". Gli 1 sono jolly: contano come qualsiasi faccia (tranne quando si punta proprio
// sugli 1). Chi viene dopo deve alzare la puntata, oppure dire "Dubito!": si alzano i bicchieri e si contano. Se ce ne
// sono almeno quanti detti, perde un dado chi ha dubitato; altrimenti chi ha puntato. Con "Calza!" si scommette che
// siano proprio quanti detti: se è vero si riprende un dado, se no se ne perde uno. Chi resta senza dadi è fuori;
// vince l'ultimo con dei dadi.
const PAUSA_RIVELA = process.env.TEST_VELOCE ? 10 : 5200;

const dado = () => 1 + Math.floor(Math.random() * 6);
// una puntata (q, f) è più alta di (Q, F)?
function piuAlta(q, f, Q, F) {
  if (!Number.isInteger(q) || !Number.isInteger(f) || f < 1 || f > 6 || q < 1) return false;
  if (Q == null) return f !== 1; // si apre con una faccia da 2 a 6
  if (F === 1 && f === 1) return q > Q;
  if (F === 1) return q >= 2 * Q + 1; // dagli 1 a un'altra faccia: più del doppio
  if (f === 1) return q >= Math.ceil(Q / 2); // verso gli 1: basta la metà (arrotondata in su)
  return q > Q || (q === Q && f > F);
}
// le puntate minime possibili sopra (Q, F), una per faccia
function minimeSopra(Q, F, totale) {
  const out = [];
  for (let f = 1; f <= 6; f++) {
    for (let q = 1; q <= totale; q++) if (piuAlta(q, f, Q, F)) { out.push({ q, f }); break; }
  }
  return out;
}
const conta = (dadi, f) => dadi.reduce((s, d) => s + (d === f || (f !== 1 && d === 1) ? 1 : 0), 0);

class Bugiardi {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'bugiardi';
    this.n = n;
    this.calza = opzioni.calza !== 'no';
    this.nDadi = new Array(n).fill(Number(opzioni.dadi) === 3 ? 3 : 5);
    this.massimo = this.nDadi[0];
    this.fuori = []; // ordine di eliminazione
    this.nEv = 0; this.evento = null; this.finita = false; this.risultato = null;
    this.nGiro = 0;
    this.nuovoGiro(primo);
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  vivi() { return this.nDadi.map((x, i) => (x > 0 ? i : -1)).filter((i) => i >= 0); }
  prossimo(p) { for (let k = 1; k <= this.n; k++) { const q = (p + k) % this.n; if (this.nDadi[q] > 0) return q; } return p; }
  totale() { return this.nDadi.reduce((a, b) => a + b, 0); }
  nuovoGiro(chi) {
    this.nGiro++;
    this.dadi = this.nDadi.map((k) => Array.from({ length: k }, dado).sort((a, b) => a - b));
    this.puntata = null; this.storia = [];
    this.fase = 'puntata';
    this.turno = this.nDadi[chi] > 0 ? chi : this.prossimo(chi);
    this.inAttesa = false; this.rivela = null; this.pausaMs = 0;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta: si contano i dadi' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    const P = this.puntata;
    if (a.tipo === 'punta') {
      const q = Number(a.q), f = Number(a.f);
      if (q > this.totale()) return { errore: `In gioco ci sono solo ${this.totale()} dadi` };
      if (!piuAlta(q, f, P && P.q, P && P.f)) return { errore: P ? 'Devi alzare la puntata (con gli 1: almeno la metà; dagli 1 a un\'altra faccia: più del doppio)' : 'Si apre con una faccia dal 2 al 6' };
      this.puntata = { q, f, chi: p };
      this.storia.push({ chi: p, q, f });
      this.turno = this.prossimo(p);
      return { ok: true };
    }
    if (a.tipo === 'dubito' || a.tipo === 'calza') {
      if (!P) return { errore: 'Non c\'è ancora nessuna puntata' };
      if (a.tipo === 'calza' && !this.calza) return { errore: 'Calza non è attivo in questa partita' };
      const tutti = this.dadi.flat(), c = conta(tutti, P.f);
      let perde = null, guadagna = null, testo;
      const faccia = P.f === 1 ? 'uno' : `${P.f}`;
      if (a.tipo === 'dubito') {
        if (c >= P.q) { perde = p; testo = `c'erano ${c} ${faccia}: aveva ragione chi ha puntato`; } else { perde = P.chi; testo = `c'erano solo ${c} ${faccia}: era un bluff!`; }
      } else if (c === P.q) { guadagna = p; testo = `c'erano proprio ${c} ${faccia}: calza giusta!`; } else { perde = p; testo = `c'erano ${c} ${faccia}, non ${P.q}: calza sbagliata`; }
      this.rivela = { tipo: a.tipo, chi: p, puntata: P, dadi: this.dadi.map((d) => d.slice()), conta: c, perde, guadagna };
      if (perde != null) this.nDadi[perde]--;
      if (guadagna != null) this.nDadi[guadagna] = Math.min(this.massimo, this.nDadi[guadagna] + 1);
      const chiNome = a.tipo === 'dubito' ? 'Dubito!' : 'Calza!';
      this.annuncia(p, `${chiNome} ${testo}`, `${chiNome} ${testo}`, true);
      if (perde != null && this.nDadi[perde] === 0) this.fuori.push(perde);
      this.fase = 'rivela'; this.turno = null; this.inAttesa = true; this.pausaMs = PAUSA_RIVELA;
      this.prossimoPrimo = perde != null ? perde : guadagna;
      if (this.vivi().length === 1) this.chiudi();
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }
  avanza() { if (this.fase === 'rivela' && !this.finita) this.nuovoGiro(this.prossimoPrimo); }
  chiudi() {
    this.finita = true; this.inAttesa = false; this.turno = null;
    const v = this.vivi()[0];
    // punti: quanti giocatori sono usciti prima (chi vince ne ha n − 1)
    const punti = new Array(this.n).fill(0);
    this.fuori.forEach((p, k) => { punti[p] = k; });
    punti[v] = this.n - 1;
    this.annuncia(v, 'resta l\'ultimo con i dadi: vince!', 'sei l\'ultimo con i dadi: hai vinto!', true);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'posizione', pareggio: false, vincitori: [v] };
  }
  // trucco segreto (!win): sotto tutti i bicchieri, solo per chi l'ha chiesto. Dice se dubitare, se calzare, o la
  // puntata vera più alta (così chi viene dopo, per alzare, deve dire una cosa falsa)
  suggerimentoWin(p) {
    if (this.finita || this.inAttesa || this.fase !== 'puntata' || this.turno !== p) return null;
    const tutti = this.dadi.flat(), P = this.puntata;
    const detto = (q, f) => `${q} ${q === 1 ? 'dado' : 'dadi'} da ${f}`;
    if (P) {
      const c = conta(tutti, P.f);
      if (c < P.q) return `💡 Dubito! In tutto ce ne sono solo ${c} (${detto(P.q, P.f)} è un bluff)`;
      if (this.calza && c === P.q && this.nDadi[p] < this.massimo) return `💡 Calza! Sono proprio ${detto(c, P.f)}`;
    }
    let meglio = null;
    for (let f = 1; f <= 6; f++) {
      const q = conta(tutti, f);
      if (q >= 1 && piuAlta(q, f, P && P.q, P && P.f) && (!meglio || q > meglio.q || (q === meglio.q && f > meglio.f))) meglio = { q, f };
    }
    if (meglio) return `💡 Punta ${detto(meglio.q, meglio.f)}: è vero${meglio.f === 1 ? '' : ' (con gli 1 jolly)'}, e chi viene dopo dovrà bluffare`;
    const m = minimeSopra(P && P.q, P && P.f, this.totale())[0];
    return m ? `💡 La puntata è vera: non dubitare. Alza il meno possibile: ${detto(m.q, m.f)}` : null;
  }

  vista(p) {
    const mio = this.turno === p && !this.inAttesa && !this.finita;
    return {
      gioco: this.id, n: this.n, mieiDadi: this.dadi[p] || [], nDadi: this.nDadi, totale: this.totale(), puntata: this.puntata, storia: this.storia,
      fase: this.fase, rivela: this.rivela, calza: this.calza, nGiro: this.nGiro, fuori: this.fuori,
      minime: mio ? minimeSopra(this.puntata && this.puntata.q, this.puntata && this.puntata.f, this.totale()) : [],
      turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// probabilità che tra n dadi sconosciuti ce ne siano almeno k con probabilità p ciascuno (binomiale)
function almeno(n, k, p) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let s = 0, c = 1;
  for (let i = 0; i <= n; i++) { if (i >= k) s += c * p ** i * (1 - p) ** (n - i); c = (c * (n - i)) / (i + 1); }
  return s;
}
function esatto(n, k, p) {
  if (k < 0 || k > n) return 0;
  let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * p ** k * (1 - p) ** (n - k);
}
function bot(g, p, livello) {
  const miei = g.dadi[p], ignoti = g.totale() - miei.length;
  const P = g.puntata;
  const pf = (f) => (f === 1 ? 1 / 6 : 1 / 3);
  // probabilità che una puntata sia vera; il difficile tiene conto che chi ha puntato probabilmente ha qualche dado di
  // quella faccia (si toglie dalla stima un dado sconosciuto e lo si conta come buono)
  const vera = (q, f, extra = 0) => almeno(ignoti - extra, q - conta(miei, f) - extra, pf(f));
  const sospetto = livello === 'difficile' ? 1 : 0;
  if (P) {
    const pv = vera(P.q, P.f, P.chi !== p ? sospetto : 0);
    if (g.calza && livello === 'difficile' && esatto(ignoti, P.q - conta(miei, P.f), pf(P.f)) > 0.36 && g.nDadi[p] < g.massimo) return { tipo: 'calza' };
    const soglia = { facile: 0.18 + Math.random() * 0.25, medio: 0.38, difficile: 0.45 }[livello];
    if (pv < soglia) return { tipo: 'dubito' };
  }
  // la puntata più sicura tra quelle minime sopra; il facile a volte esagera, il difficile ogni tanto bluffa
  const cand = minimeSopra(P && P.q, P && P.f, g.totale()).map((x) => ({ ...x, pv: vera(x.q, x.f) }));
  if (!cand.length) return { tipo: 'dubito' };
  cand.sort((a, b) => b.pv - a.pv || a.q - b.q);
  let scelta = cand[0];
  if (livello === 'facile' && Math.random() < 0.3) scelta = cand[Math.floor(Math.random() * cand.length)];
  if (livello === 'difficile' && Math.random() < 0.15 && cand.length > 1) {
    // bluff: punta su una faccia che non ha, se la puntata resta credibile
    const bluff = cand.filter((x) => conta(miei, x.f) === 0 && x.pv > 0.35);
    if (bluff.length) scelta = bluff[0];
  }
  // se anche la migliore è improbabile, meglio dubitare (se si può)
  if (P && scelta.pv < 0.3 && livello !== 'facile') return { tipo: 'dubito' };
  return { tipo: 'punta', q: scelta.q, f: scelta.f };
}

module.exports = {
  meta: {
    id: 'bugiardi',
    nome: 'Dadi bugiardi',
    giocatori: [2, 3, 4, 5, 6],
    tipo: 'tabellone',
    descrizione: 'Dadi nascosti sotto il bicchiere: punta su quanti ce ne sono in tutto, bluffa, e dì "Dubito!" al momento giusto. Gli 1 sono jolly.',
    alias: ['dadi bugiardi', 'dubito dadi', 'perudo', 'dadi del bugiardo', 'liar dice', 'bluff dadi', 'calza'],
    opzioni: [
      { id: 'dadi', nome: 'Dadi a testa', valori: [5, 3], etichette: ['5 dadi (classico)', '3 dadi (partita veloce)'], predefinito: 5 },
      { id: 'calza', nome: 'Calza', valori: ['si', 'no'], etichette: ['Sì: si può dire "Calza!"', 'No'], predefinito: 'si' },
    ],
    regole: [
      'Ognuno ha 5 dadi sotto il suo bicchiere: a ogni giro si rilanciano e ognuno vede solo i propri.',
      'A turno si fa una PUNTATA su tutti i dadi in gioco, di tutti: per esempio "ci sono almeno quattro 5". Gli 1 sono JOLLY: contano come qualsiasi faccia (ma non quando si punta proprio sugli 1). Si apre con una faccia dal 2 al 6.',
      'Chi viene dopo deve alzare: più dadi, oppure lo stesso numero con una faccia più alta. Per passare agli 1 basta la metà dei dadi (arrotondata in su); per tornare dagli 1 a un\'altra faccia serve più del doppio.',
      'Oppure dice "DUBITO!": si alzano i bicchieri e si contano i dadi di quella faccia (più gli 1). Se ce ne sono almeno quanti detti, perde un dado chi ha dubitato; se no lo perde chi ha puntato.',
      '"CALZA!" (se attivo): si scommette che i dadi siano ESATTAMENTE quanti detti. Se è vero si riprende un dado (fino a 5), se no se ne perde uno.',
      'Chi perde un dado apre il giro dopo. Chi resta senza dadi è fuori; vince l\'ultimo che ha ancora dei dadi.',
      'Il computer calcola le probabilità: il facile sbaglia spesso, il medio è prudente, il difficile tiene conto di chi punta, bluffa e sa quando dire "Calza!".',
    ],
  },
  crea: (o) => new Bugiardi(o),
  bot,
  _test: { piuAlta, minimeSopra, conta, almeno, esatto },
};
