// FLIP 7: regole ufficiali. Mazzo da 94 carte: numeri da 0 a 12 (tante copie quanto il numero, lo 0 una sola),
// modificatori +2 +4 +6 +8 +10 e x2, azioni (3 Congela, 3 Pesca tre, 3 Seconda possibilità).
// A ogni round si riceve una carta scoperta a testa, poi a turno si sceglie: pesca o stai. Chi pesca un numero che ha
// già sballa e fa 0 nel round; chi mette insieme 7 numeri diversi fa Flip 7 (+15) e chiude subito il round.
// Si vince arrivando per primi a 200 punti (a fine round, chi ne ha di più).
const OBIETTIVI = [200, 100, 300];
const BONUS_FLIP7 = 15;
const T = require('./trucco');

function mazzoFlip7() {
  const m = [];
  let k = 0;
  m.push({ id: `n0-${k++}`, tipo: 'num', v: 0 });
  for (let v = 1; v <= 12; v++) for (let c = 0; c < v; c++) m.push({ id: `n${v}-${k++}`, tipo: 'num', v });
  for (const v of [2, 4, 6, 8, 10]) m.push({ id: `p${v}-${k++}`, tipo: 'mod', v, x2: false });
  m.push({ id: `x2-${k++}`, tipo: 'mod', v: 0, x2: true });
  for (const a of ['congela', 'tre', 'seconda']) for (let c = 0; c < 3; c++) m.push({ id: `${a}-${k++}`, tipo: 'azione', a });
  return m;
}
function mescola(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const NOMI_AZ = { congela: 'Congela', tre: 'Pesca tre', seconda: 'Seconda possibilità' };

// punti del round di un giocatore (0 se ha sballato)
function puntiRound(g) {
  if (g.stato === 'sballato') return 0;
  let s = g.numeri.reduce((a, c) => a + c.v, 0);
  if (g.mod.some((c) => c.x2)) s *= 2;
  s += g.mod.reduce((a, c) => a + (c.x2 ? 0 : c.v), 0);
  if (g.stato === 'flip7') s += BONUS_FLIP7;
  return s;
}

class Flip7 {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'flip7';
    this.n = n;
    this.obiettivo = OBIETTIVI.includes(Number(opzioni.punti)) ? Number(opzioni.punti) : 200;
    this.totali = new Array(n).fill(0);
    this.mazzo = mescola(mazzoFlip7());
    this.scarti = [];
    this.mazziere = (primo - 1 + n) % n;
    this.nRound = 0;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.riepilogo = null;
    this.storia = [];
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  attivo(p) { return this.g[p].stato === 'attivo'; }
  attivi() { return this.g.map((_, i) => i).filter((i) => this.attivo(i)); }

  nuovoRound() {
    this.nRound++;
    this.mazziere = (this.mazziere + 1) % this.n;
    this.g = Array.from({ length: this.n }, () => ({ numeri: [], mod: [], seconda: null, stato: 'attivo', ultima: null }));
    this.ordine = Array.from({ length: this.n }, (_, k) => (this.mazziere + 1 + k) % this.n);
    this.daiA = 0;
    this.fase = 'distribuzione';
    this.tre = []; // pile di "Pesca tre" in corso: { chi, resto, rinviate }
    this.daRisolvere = []; // azioni rinviate (pescate durante un Pesca tre) da risolvere
    this.pendente = null; // scelta da fare: { tipo: 'bersaglio' | 'regala', chi, carta, scelte }
    this.inMossa = null; // chi sta facendo il suo turno di pesca
    this.turno = null;
    this.inAttesa = false;
    this.riepilogo = null;
    this.flip7 = null;
    this.nCarta = 0;
    this.procedi();
  }

  pescaCarta(x) {
    if (!this.mazzo.length) {
      if (!this.scarti.length) return null;
      this.mazzo = mescola(this.scarti);
      this.scarti = [];
      this.annuncia(null, '🔀 Mazzo finito: si rimescolano gli scarti', '');
    }
    // il trucco segreto (!win): per tutto il round si pescano solo numeri nuovi, i più alti che ci sono (verso il Flip 7)
    if (x) {
      const nuovi = this.mazzo.filter((c) => c.tipo === 'num' && !x.numeri.some((y) => y.v === c.v));
      const c = T.migliore(nuovi, (c) => c.v);
      if (c) T.inCima(this.mazzo, (y) => y === c);
    }
    return this.mazzo.pop();
  }

  // una carta scoperta davanti a p
  pesca(p, inTre) {
    const truccato = T.armato(this, p);
    if (truccato) (this.winUsato = this.winUsato || new Set()).add(p);
    const x = this.g[p];
    const c = this.pescaCarta(truccato ? x : null);
    if (!c) { x.stato = 'fermo'; return; } // niente più carte (non succede quasi mai): si ferma
    x.ultima = { ...c, n: ++this.nCarta };
    if (c.tipo === 'num') {
      if (x.numeri.some((y) => y.v === c.v)) {
        if (x.seconda) {
          // la seconda possibilità salva: si scartano il doppione e la carta
          this.scarti.push(c, x.seconda);
          x.seconda = null;
          x.ultima.salvato = true;
          this.annuncia(p, `pesca un altro ${c.v}, ma la seconda possibilità lo salva 😅`, `hai pescato un altro ${c.v}: la seconda possibilità ti salva 😅`);
          return;
        }
        x.numeri.push(c);
        x.stato = 'sballato';
        x.doppio = c.v;
        this.annuncia(p, `pesca un altro ${c.v} e sballa! 💥`, `hai pescato un altro ${c.v}: sballato! 💥`, true);
        return;
      }
      x.numeri.push(c);
      if (x.numeri.length >= 7) {
        x.stato = 'flip7';
        this.flip7 = p;
        this.annuncia(p, `fa FLIP 7! +${BONUS_FLIP7} 🎉`, `FLIP 7! +${BONUS_FLIP7} 🎉`, true);
      }
      return;
    }
    if (c.tipo === 'mod') { x.mod.push(c); return; }
    // carte azione
    if (c.a === 'seconda') {
      if (!x.seconda) { x.seconda = c; return; }
      const scelte = this.attivi().filter((i) => i !== p && !this.g[i].seconda);
      if (!scelte.length) { this.scarti.push(c); return; }
      if (scelte.length === 1) return this.regala(p, scelte[0], c);
      this.pendente = { tipo: 'regala', chi: p, carta: c, scelte };
      return;
    }
    if (inTre) { inTre.rinviate.push(c); return; }
    this.preparaAzione(p, c);
  }

  preparaAzione(p, c) {
    if (!this.attivo(p)) { this.scarti.push(c); return; }
    const scelte = this.attivi();
    if (scelte.length === 1) return this.applica(p, scelte[0], c);
    this.pendente = { tipo: 'bersaglio', chi: p, carta: c, scelte };
  }

  regala(da, a, c) {
    this.g[a].seconda = c;
    this.annuncia(da, `ha già una seconda possibilità e la regala a @`, 'hai già una seconda possibilità: la regali a @', false, { bersaglio: a, testoTe: 'ti regala una seconda possibilità ❤️' });
  }

  applica(da, a, c) {
    this.scarti.push(c);
    if (c.a === 'congela') {
      this.g[a].stato = 'congelato';
      if (da === a) this.annuncia(da, 'si congela da solo e tiene i suoi punti ❄️', 'ti congeli e tieni i tuoi punti ❄️');
      else this.annuncia(da, 'congela @ ❄️', 'congeli @ ❄️', false, { bersaglio: a, testoTe: 'ti congela ❄️: tieni i punti che hai e sei fuori dal round' });
    } else {
      this.tre.push({ chi: a, resto: 3, rinviate: [] });
      if (da === a) this.annuncia(da, 'deve pescare tre carte 🃏🃏🃏', 'devi pescare tre carte 🃏🃏🃏');
      else this.annuncia(da, 'fa pescare tre carte a @ 🃏🃏🃏', 'fai pescare tre carte a @ 🃏🃏🃏', false, { bersaglio: a, testoTe: 'ti fa pescare tre carte 🃏🃏🃏' });
    }
  }

  // va avanti da solo finché non serve una scelta di qualcuno
  procedi() {
    for (let guardia = 0; guardia < 500; guardia++) {
      if (this.flip7 !== null || !this.attivi().length) return this.fineRound();
      if (this.pendente) { this.turno = this.pendente.chi; return; }
      const t = this.tre[this.tre.length - 1];
      if (t) {
        if (!this.attivo(t.chi) || t.resto <= 0) {
          this.tre.pop();
          // le azioni pescate durante il Pesca tre si risolvono dopo, se chi le ha pescate è ancora in gioco
          for (const c of t.rinviate) this.daRisolvere.push({ chi: t.chi, carta: c });
          continue;
        }
        t.resto--;
        this.pesca(t.chi, t);
        continue;
      }
      if (this.daRisolvere.length) { const r = this.daRisolvere.shift(); this.preparaAzione(r.chi, r.carta); continue; }
      if (this.fase === 'distribuzione') {
        if (this.daiA < this.ordine.length) {
          const p = this.ordine[this.daiA++];
          if (this.attivo(p)) this.pesca(p, null);
          continue;
        }
        this.fase = 'gioco';
        this.turno = this.prossimo(this.mazziere);
        return;
      }
      // fase di gioco: la mossa di chi era di turno è finita
      if (this.inMossa !== null) {
        const da = this.inMossa;
        this.inMossa = null;
        this.turno = this.prossimo(da);
        return;
      }
      if (this.turno === null || !this.attivo(this.turno)) this.turno = this.prossimo(this.turno === null ? this.mazziere : this.turno);
      return;
    }
  }

  prossimo(da) {
    for (let k = 1; k <= this.n; k++) { const i = (da + k) % this.n; if (this.attivo(i)) return i; }
    return null;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta il prossimo round' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || !a.tipo) return { errore: 'Mossa non valida' };
    if (this.pendente) {
      const pe = this.pendente;
      if (a.tipo !== 'scegli') return { errore: pe.tipo === 'regala' ? 'Scegli a chi regalare la seconda possibilità' : `Scegli su chi usare ${NOMI_AZ[pe.carta.a]}` };
      const b = Number(a.posto);
      if (!pe.scelte.includes(b)) return { errore: 'Non puoi scegliere questo giocatore' };
      this.pendente = null;
      if (pe.tipo === 'regala') this.regala(p, b, pe.carta);
      else this.applica(p, b, pe.carta);
      this.procedi();
      return { ok: true };
    }
    if (this.fase !== 'gioco') return { errore: 'Aspetta' };
    if (a.tipo === 'stai') {
      this.g[p].stato = 'fermo';
      this.annuncia(p, `si ferma con ${puntiRound(this.g[p])} punti ✋`, `ti fermi con ${puntiRound(this.g[p])} punti ✋`);
      this.inMossa = p;
      this.procedi();
      return { ok: true };
    }
    if (a.tipo === 'pesca') {
      this.inMossa = p;
      this.pesca(p, null);
      this.procedi();
      return { ok: true };
    }
    return { errore: 'Scegli: pesca o stai' };
  }

  fineRound() {
    this.turno = null;
    // il trucco vale un round: finito il round si spegne (per chi ha pescato almeno una carta col trucco)
    if (this.winUsato) { for (const p of this.winUsato) T.consuma(this, p); this.winUsato = null; }
    this.pendente = null;
    const righe = this.g.map((x, i) => {
      const punti = puntiRound(x);
      this.totali[i] += punti;
      return { posto: i, punti, totale: this.totali[i], stato: x.stato, numeri: x.numeri.map((c) => c.v), mod: x.mod.map((c) => (c.x2 ? 'x2' : `+${c.v}`)) };
    });
    // le carte davanti ai giocatori vanno negli scarti (il mazzo non si rimescola a ogni round)
    for (const x of this.g) { this.scarti.push(...x.numeri, ...x.mod); if (x.seconda) this.scarti.push(x.seconda); }
    for (const t of this.tre) this.scarti.push(...t.rinviate);
    for (const r of this.daRisolvere) this.scarti.push(r.carta);
    this.tre = []; this.daRisolvere = [];
    this.riepilogo = { round: this.nRound, righe, flip7: this.flip7 };
    this.storia.push(righe.map((r) => r.punti));
    const max = Math.max(...this.totali);
    if (max >= this.obiettivo && this.totali.filter((x) => x === max).length === 1) {
      this.finita = true;
      this.fase = 'fine';
      const v = this.totali.indexOf(max);
      this.risultato = { fazioni: this.totali.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: false, vincitori: [v] };
      return;
    }
    this.fase = 'riepilogo';
    this.inAttesa = true;
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.nuovoRound();
  }

  // probabilità di sballare con la prossima carta per il giocatore p: si calcola dal mazzo, che è informazione
  // pubblica (tutte le carte uscite sono scoperte, quindi chiunque può contarle)
  rischio(p) {
    const x = this.g[p];
    if (!x || x.stato !== 'attivo' || x.seconda) return 0;
    const pool = this.mazzo.length ? this.mazzo : this.scarti;
    if (!pool.length) return 0;
    const miei = new Set(x.numeri.map((c) => c.v));
    return pool.filter((c) => c.tipo === 'num' && miei.has(c.v)).length / pool.length;
  }

  vista(p) {
    return {
      gioco: this.id, n: this.n, turno: this.turno, inAttesa: this.inAttesa, fase: this.fase, finita: this.finita, risultato: this.risultato, evento: this.evento,
      obiettivo: this.obiettivo, totali: this.totali, nRound: this.nRound, mazziere: this.mazziere,
      giocatori: this.g.map((x, i) => ({ numeri: x.numeri, mod: x.mod, seconda: !!x.seconda, stato: x.stato, ultima: x.ultima, punti: puntiRound(x), doppio: x.doppio || null, rischio: Math.round(this.rischio(i) * 100) })),
      pendente: this.pendente ? { tipo: this.pendente.tipo, chi: this.pendente.chi, carta: this.pendente.carta, scelte: this.pendente.scelte } : null,
      tre: this.tre.map((t) => ({ chi: t.chi, resto: t.resto })),
      mazzo: this.mazzo.length, scarti: this.scarti.length, riepilogo: this.riepilogo, storia: this.storia, bonus: BONUS_FLIP7,
    };
  }
}

// ---------------- computer ----------------
function bot(g, p, livello) {
  const pe = g.pendente;
  if (pe) return { tipo: 'scegli', posto: sceltaBot(g, p, livello, pe) };
  const x = g.g[p];
  const punti = puntiRound(x);
  if (x.seconda) {
    // con la seconda possibilità pescare non costa nulla (un doppione la consuma e basta)
    return { tipo: livello === 'facile' && punti >= 30 && Math.random() < 0.3 ? 'stai' : 'pesca' };
  }
  const rischio = g.rischio(p);
  if (livello === 'facile') {
    // conta solo i suoi numeri, a occhio
    const soglia = 3 + Math.floor(Math.random() * 3);
    return { tipo: x.numeri.length >= soglia || punti >= 28 ? 'stai' : 'pesca' };
  }
  if (livello === 'medio') return { tipo: rischio > 0.3 || punti >= 27 ? 'stai' : 'pesca' };
  // difficile: valore atteso della prossima carta. Se non sballa guadagno in media il valore delle carte buone
  // (i numeri che non ho, i modificatori, e la probabilità di arrivare al Flip 7); se sballa perdo tutto il round.
  const pool = g.mazzo.length ? g.mazzo : g.scarti;
  const miei = new Set(x.numeri.map((c) => c.v));
  const doppia = x.mod.some((c) => c.x2) ? 2 : 1;
  let guadagno = 0;
  for (const c of pool) {
    if (c.tipo === 'num' && !miei.has(c.v)) guadagno += c.v * doppia + (x.numeri.length === 6 ? BONUS_FLIP7 : 0);
    else if (c.tipo === 'mod') guadagno += c.x2 ? x.numeri.reduce((a, y) => a + y.v, 0) : c.v;
    else if (c.tipo === 'azione') guadagno += c.a === 'seconda' ? 2 : 0;
  }
  guadagno /= Math.max(1, pool.length);
  const perdita = rischio * punti;
  let atteso = (1 - rischio) * guadagno - perdita;
  // se con i punti di questo round vinco la partita, mi fermo; se un altro sta per vincere rischio di più
  const altri = g.totali.map((t, i) => (i === p ? -1 : t + (g.g[i].stato !== 'sballato' ? puntiRound(g.g[i]) : 0)));
  const maxAltri = Math.max(...altri);
  if (g.totali[p] + punti >= g.obiettivo && g.totali[p] + punti > maxAltri) return { tipo: 'stai' };
  if (maxAltri >= g.obiettivo && g.totali[p] + punti <= maxAltri) atteso += punti; // tanto vale rischiare
  // la soglia è un po' sotto zero: pescare adesso lascia anche la possibilità di pescare ancora dopo
  return { tipo: atteso > -3 ? 'pesca' : 'stai' };
}

function sceltaBot(g, p, livello, pe) {
  const s = pe.scelte;
  if (livello === 'facile') return s[Math.floor(Math.random() * s.length)];
  const tot = (i) => g.totali[i] + puntiRound(g.g[i]);
  if (pe.tipo === 'regala') {
    // la seconda possibilità a chi è più indietro
    return s.reduce((a, b) => (tot(b) < tot(a) ? b : a));
  }
  const altri = s.filter((i) => i !== p);
  if (pe.carta.a === 'congela') {
    // congela chi sta andando meglio; il difficile si congela da solo se rischia molto e ha già molti punti
    if (livello === 'difficile' && s.includes(p) && g.rischio(p) > 0.3 && puntiRound(g.g[p]) >= 20) return p;
    if (!altri.length) return p;
    if (livello === 'medio') return altri.reduce((a, b) => (puntiRound(g.g[b]) > puntiRound(g.g[a]) ? b : a));
    return altri.reduce((a, b) => (tot(b) > tot(a) ? b : a));
  }
  // Pesca tre: a chi rischia di più di sballare (e ha più da perdere); il difficile la prende lui se ha la
  // seconda possibilità o pochi numeri
  if (livello === 'difficile' && s.includes(p) && (g.g[p].seconda || g.rischio(p) < 0.08) && g.g[p].numeri.length <= 2) return p;
  if (!altri.length) return p;
  const peso = (i) => (livello === 'medio' ? g.g[i].numeri.length : (g.g[i].seconda ? 0 : g.rischio(i)) * (puntiRound(g.g[i]) + 5) + tot(i) / 100);
  return altri.reduce((a, b) => (peso(b) > peso(a) ? b : a));
}

module.exports = {
  meta: {
    id: 'flip7',
    nome: 'Flip 7',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Pesca o stai: fai punti con i numeri, ma un doppione ti fa sballare. Sette numeri diversi = Flip 7!',
    alias: ['flip seven', 'flip7', 'sballa', 'push your luck'],
    opzioni: [
      { id: 'punti', nome: 'Si vince a', valori: OBIETTIVI, etichette: ['200 punti', '100 punti (partita corta)', '300 punti'], predefinito: 200 },
    ],
    regole: [
      'Il mazzo ha 94 carte: i numeri da 0 a 12 (del 12 ci sono 12 copie, dell\'11 ne sono 11 e così via, dello 0 una sola), 6 modificatori (+2, +4, +6, +8, +10 e x2) e 9 azioni (3 Congela, 3 Pesca tre, 3 Seconda possibilità).',
      'A ogni round il mazziere (che cambia a ogni round) dà una carta scoperta a testa, cominciando da chi gli sta a sinistra. Tutte le carte si giocano scoperte davanti a sé.',
      'Poi, a turno, ognuno sceglie: PESCA (un\'altra carta scoperta) oppure STAI (ti fermi e tieni i punti del round). Chi si ferma è fuori dal round; gli altri continuano finché ci sono giocatori in gioco.',
      'Se peschi un numero che hai già, SBALLI: fai 0 punti in questo round e sei fuori. I modificatori e le azioni non fanno sballare.',
      'FLIP 7: se metti insieme 7 numeri diversi il round finisce subito per tutti e prendi 15 punti in più. Chi era ancora in gioco e chi si era fermato incassa i suoi punti.',
      'Punti del round: la somma dei numeri; il x2 raddoppia solo la somma dei numeri; poi si aggiungono i +2…+10 e, se c\'è, il bonus del Flip 7.',
      'Congela: scegli un giocatore ancora in gioco (anche te stesso): si ferma subito e tiene i punti che ha.',
      'Pesca tre: scegli un giocatore ancora in gioco (anche te stesso): deve pescare tre carte una alla volta, fermandosi se sballa o fa Flip 7. Se tra quelle tre esce un Congela o un altro Pesca tre, si usa dopo aver pescato tutte e tre le carte (se non ha sballato); una Seconda possibilità si tiene subito.',
      'Seconda possibilità: tienila davanti a te. Se peschi un doppione, scarti il doppione e la Seconda possibilità e resti in gioco. Se ne hai già una e ne peschi un\'altra, la regali a un giocatore ancora in gioco che non ce l\'ha (se nessuno può riceverla, si scarta).',
      'Se un\'azione esce durante la prima distribuzione, si usa subito. Se sei l\'unico ancora in gioco, Congela e Pesca tre valgono per te.',
      'A fine round le carte vanno negli scarti: il mazzo non si rimescola, si va avanti finché finisce e solo allora si rimescolano gli scarti. Chi conta le carte uscite sa quanto rischia: sotto il tuo nome vedi la probabilità di sballare con la prossima carta.',
      'Si vince arrivando a 200 punti (oppure 100 o 300, da scegliere prima): a fine round, se qualcuno ha raggiunto l\'obiettivo, vince chi ha più punti. Se sono pari in cima si gioca un altro round.',
      'Il computer facile conta solo le sue carte, il medio si ferma quando il rischio supera il 30%, il difficile calcola il valore atteso della prossima carta, tiene conto della classifica e sceglie con cura chi congelare o far pescare.',
    ],
  },
  crea: (o) => new Flip7(o),
  bot,
  _test: { Flip7, mazzoFlip7, puntiRound },
};
