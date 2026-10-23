const { mazzo40, mescola, valore40, casuale } = require('./carte');
const T = require('./trucco');

// il trucco segreto (!win): porta nella mano la prima carta che va bene, presa da una delle fonti (mazzo o mani degli
// altri), dando in cambio la carta peggiore tra quelle non da tenere: niente doppioni, il numero di carte non cambia
function prendiCarta(mano, fonti, vuoi, tieni, peggiore) {
  const gia = mano.find((c) => vuoi(c) && !tieni.has(c));
  if (gia) { tieni.add(gia); return gia; }
  const via = peggiore(mano.filter((c) => !tieni.has(c)));
  if (!via) return null;
  for (const f of fonti) {
    const i = f.findIndex(vuoi);
    if (i < 0) continue;
    const c = f[i];
    f[i] = via;
    mano[mano.indexOf(via)] = c;
    tieni.add(c);
    return c;
  }
  return null;
}

class Rubamazzo {
  constructor({ n, primo = 0 }) {
    this.id = 'rubamazzo';
    this.n = n;
    this.aSquadre = false;
    this.mazzo = mescola(mazzo40());
    this.tavolo = this.mazzo.splice(-4);
    this.mani = Array.from({ length: n }, () => []);
    this.mazzetti = Array.from({ length: n }, () => []);
    this.primo = primo;
    this.turno = primo;
    this.inAttesa = false;
    this.inCorso = null;
    this.pausaMs = 1100;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.distribuisci();
  }

  annuncia(posto, testo, testoIo, bersaglio = null, forte = false) {
    this.evento = { id: ++this.nEv, posto, testo, testoIo, bersaglio, forte };
  }

  distribuisci() {
    for (let g = 0; g < 3; g++) for (let i = 0; i < this.n; i++) if (this.mazzo.length) this.mani[(this.primo + i) % this.n].push(this.mazzo.pop());
    for (let p = 0; p < this.n; p++) if (this.mani[p].length && T.consuma(this, p)) this.truccaMano(p);
  }

  // il trucco segreto (!win): nella mano appena data arrivano le carte per rubare i mazzetti più grossi degli
  // avversari e per prendere in tavola (dal mazzo o dalle mani appena date agli altri, in cambio delle carte inutili)
  truccaMano(p) {
    const mano = this.mani[p];
    const fonti = [this.mazzo, ...this.mani.filter((m) => m !== mano)];
    const tieni = new Set();
    // le carte che non prendono niente sono le prime da dare via
    const utile = (c) => this.opzioni(p, c).length;
    const peggiore = (cs) => T.migliore(cs, (c) => -utile(c));
    const bersagli = this.mazzetti.map((m, q) => ({ q, m })).filter((x) => x.q !== p && x.m.length).sort((a, b) => b.m.length - a.m.length);
    const valori = [...bersagli.map((x) => valore40(x.m[x.m.length - 1])), ...this.tavolo.map(valore40)];
    for (const v of [...new Set(valori)].slice(0, mano.length)) prendiCarta(mano, fonti, (c) => valore40(c) === v, tieni, peggiore);
  }

  opzioni(p, carta) {
    const v = valore40(carta);
    const out = [];
    for (const c of this.tavolo) if (valore40(c) === v) out.push({ tipo: 'tavolo', id: c.id });
    this.mazzetti.forEach((m, q) => {
      if (q !== p && m.length && valore40(m[m.length - 1]) === v) out.push({ tipo: 'mazzo', posto: q });
    });
    return out;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta un attimo' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'gioca') return { errore: 'Mossa non valida' };
    const mano = this.mani[p];
    const i = mano.findIndex((c) => c.id === a.carta);
    if (i < 0) return { errore: 'Non hai questa carta' };
    const carta = mano[i];
    const ops = this.opzioni(p, carta);
    let scelta = null;
    if (ops.length) {
      const b = a.bersaglio;
      if (b) scelta = ops.find((o) => o.tipo === b.tipo && (o.tipo === 'tavolo' ? o.id === b.id : o.posto === Number(b.posto)));
      else if (ops.length === 1) scelta = ops[0];
      if (!scelta) return { errore: b ? 'Non puoi prendere questa' : 'Scegli cosa prendere' };
    } else if (a.bersaglio) return { errore: 'Con questa carta non puoi prendere nulla' };

    mano.splice(i, 1);
    if (!scelta) { this.tavolo.push(carta); this.passa(p); return { ok: true }; }
    this.inCorso = { posto: p, carta, bersaglio: scelta };
    this.inAttesa = true;
    this.turno = null;
    return { ok: true };
  }

  avanza() {
    if (!this.inCorso) return;
    const { posto: p, carta, bersaglio } = this.inCorso;
    this.inCorso = null;
    if (bersaglio.tipo === 'tavolo') {
      const tc = this.tavolo.find((c) => c.id === bersaglio.id);
      this.tavolo = this.tavolo.filter((c) => c.id !== bersaglio.id);
      this.mazzetti[p].push(tc, carta);
    } else {
      const q = bersaglio.posto;
      const rubati = this.mazzetti[q];
      this.mazzetti[q] = [];
      this.mazzetti[p].push(...rubati, carta);
      this.annuncia(p, `ruba ${rubati.length} carte a @`, `rubi ${rubati.length} carte a @`, q, true);
    }
    this.inAttesa = false;
    this.passa(p);
  }

  passa(p) {
    if (this.mani.every((m) => m.length === 0)) {
      if (this.mazzo.length) { this.distribuisci(); this.turno = (p + 1) % this.n; }
      else return this.chiudi();
    } else this.turno = (p + 1) % this.n;
  }

  chiudi() {
    this.finita = true;
    this.turno = null;
    const fazioni = this.mazzetti.map((m, i) => ({ posti: [i], punti: m.length }));
    const max = Math.max(...fazioni.map((f) => f.punti));
    const top = fazioni.filter((f) => f.punti === max);
    this.risultato = { fazioni, etichetta: 'carte', pareggio: top.length > 1, vincitori: top.length === 1 ? top[0].posti : [] };
  }

  vista(p) {
    const mioTurno = this.turno === p && !this.inAttesa;
    const opzioni = {};
    if (mioTurno) for (const c of this.mani[p]) opzioni[c.id] = this.opzioni(p, c);
    return {
      gioco: this.id,
      n: this.n,
      aSquadre: false,
      mano: this.mani[p] || [],
      carteInMano: this.mani.map((m) => m.length),
      tavolo: this.tavolo,
      mazzetti: this.mazzetti.map((m) => ({ conteggio: m.length, cima: m[m.length - 1] || null })),
      inCorso: this.inCorso,
      opzioni: mioTurno ? opzioni : null,
      mazzo: this.mazzo.length,
      turno: this.turno,
      inAttesa: this.inAttesa,
      finita: this.finita,
      risultato: this.risultato,
      evento: this.evento,
    };
  }
}

function bot(g, p, livello) {
  const mosse = [];
  for (const c of g.mani[p]) {
    const ops = g.opzioni(p, c);
    if (ops.length) for (const o of ops) mosse.push({ carta: c, bersaglio: o });
    else mosse.push({ carta: c, bersaglio: null });
  }
  const az = (m) => ({ tipo: 'gioca', carta: m.carta.id, bersaglio: m.bersaglio });
  if (livello === 'facile') return az(casuale(mosse));

  const viste = new Set([...g.mani[p], ...g.tavolo, ...g.mazzetti.flatMap((m) => m.slice(-1))].map((c) => c.id));
  const ignote = mazzo40().filter((c) => !viste.has(c.id));
  const probValore = (v) => {
    const k = ignote.filter((c) => valore40(c) === v).length;
    return ignote.length ? 1 - Math.pow(1 - k / ignote.length, 3 * (g.n - 1)) : 0;
  };

  let best = null;
  let bs = -Infinity;
  for (const m of mosse) {
    let s;
    const mio = g.mazzetti[p].length;
    if (!m.bersaglio) s = -1;
    else if (m.bersaglio.tipo === 'mazzo') s = 3 + g.mazzetti[m.bersaglio.posto].length * 1.3;
    else s = 2;
    if (livello === 'difficile') {
      const v = valore40(m.carta);
      const dopo = m.bersaglio ? mio + 2 + (m.bersaglio.tipo === 'mazzo' ? g.mazzetti[m.bersaglio.posto].length : 0) : mio;
      if (m.bersaglio) s -= probValore(v) * dopo * 0.25; // la mia cima potrebbe essere rubata
      else s -= probValore(v) * 1.2;
    } else s += Math.random();
    if (s > bs) { bs = s; best = m; }
  }
  return az(best);
}

module.exports = {
  meta: {
    id: 'rubamazzo',
    nome: 'Rubamazzo',
    giocatori: [2, 3, 4],
    descrizione: 'Prendi le carte uguali e ruba il mazzetto agli altri. Vince chi ha più carte.',
    opzioni: [],
    regole: [
      'Si gioca con 40 carte francesi. Ognuno riceve 3 carte e 4 vanno scoperte in tavola.',
      'Quando giochi una carta prendi una carta dello stesso valore in tavola, oppure rubi l\'intero mazzetto di un avversario se la carta in cima al suo mazzetto ha lo stesso valore.',
      'Le carte prese vanno nel tuo mazzetto, con la carta giocata in cima: attenzione, adesso sono gli altri a poterti rubare.',
      'Se la carta giocata può prendere, la presa è obbligatoria. Se non prende nulla resta in tavola.',
      'Finite le carte in mano se ne danno altre 3. Vince chi alla fine ha il mazzetto più alto.',
    ],
  },
  crea: (o) => new Rubamazzo(o),
  bot,
};
