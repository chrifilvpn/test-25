// SASSO CARTA FORBICE: due giocatori scelgono in segreto nello stesso momento, poi si rivela.
// Al meglio di 3 o di 5; variante estesa con lucertola e Spock.
const MOSSE = { classica: ['sasso', 'carta', 'forbice'], estesa: ['sasso', 'carta', 'forbice', 'lucertola', 'spock'] };
// chi batte chi, e con quale verbo
const BATTE = {
  sasso: { forbice: 'rompe', lucertola: 'schiaccia' },
  carta: { sasso: 'avvolge', spock: 'smentisce' },
  forbice: { carta: 'tagliano', lucertola: 'decapitano' },
  lucertola: { spock: 'avvelena', carta: 'mangia' },
  spock: { forbice: 'rompe', sasso: 'vaporizza' },
};
const NOMI = { sasso: 'il sasso', carta: 'la carta', forbice: 'le forbici', lucertola: 'la lucertola', spock: 'Spock' };
const T = require('./trucco');
const vince = (a, b) => (a === b ? null : BATTE[a][b] ? 0 : 1); // 0: vince il primo, 1: vince il secondo

class SassoCartaForbice {
  constructor({ n, opzioni = {} }) {
    this.id = 'morra';
    this.n = n;
    this.variante = opzioni.variante === 'estesa' ? 'estesa' : 'classica';
    this.meglio = Number(opzioni.meglio) === 5 ? 5 : 3;
    // "meno uno" (Squid Game): si mostrano due mani, poi ognuno ne ritira una
    this.meno1 = opzioni.modo === 'meno1';
    this.fase = 'scegli';
    this.coppie = [null, null];
    this.tieni = [null, null];
    this.serve = Math.ceil(this.meglio / 2);
    this.punti = [0, 0];
    this.scelte = [null, null];
    this.storia = []; // [{ scelte, vince }]
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 2900; // il tempo dell'animazione della rivelazione
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.rivela = null;
    this.nRiv = 0;
  }

  attesi() {
    if (this.inAttesa || this.finita) return [];
    if (this.meno1) return [0, 1].filter((p) => (this.fase === 'scegli' ? !this.coppie[p] : this.tieni[p] === null));
    return [0, 1].filter((p) => !this.scelte[p]);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta la fine della mano' };
    if (this.meno1) return this.azioneMeno1(p, a);
    if (!a || a.tipo !== 'scegli' || !MOSSE[this.variante].includes(a.mossa)) return { errore: 'Scegli sasso, carta o forbice' };
    if (this.scelte[p]) return { errore: 'Hai già scelto' };
    this.scelte[p] = a.mossa;
    if (this.scelte[0] && this.scelte[1]) {
      // il trucco segreto (!win): chi l'ha attivato "indovina" e vince la mano
      for (const q of [0, 1]) if (T.consuma(this, q)) this.scelte[q] = this.vincente(this.scelte[1 - q]);
      const v = vince(this.scelte[0], this.scelte[1]);
      const [w, l] = v === 0 ? this.scelte : [this.scelte[1], this.scelte[0]];
      this.rivela = { id: ++this.nRiv, scelte: [...this.scelte], vince: v, frase: v === null ? 'Pari: si rigioca' : `${cap(NOMI[w])} ${BATTE[w][l]} ${NOMI[l]}` };
      this.inAttesa = true;
    }
    return { ok: true };
  }

  // MENO UNO: prima due mani a testa (in segreto, poi si vedono tutte), poi ognuno ritira una delle sue (in segreto)
  azioneMeno1(p, a) {
    const tutte = MOSSE[this.variante];
    if (this.fase === 'scegli') {
      if (!a || a.tipo !== 'scegli2' || !Array.isArray(a.mosse) || a.mosse.length !== 2 || !a.mosse.every((m) => tutte.includes(m))) return { errore: 'Scegli una mossa per ogni mano' };
      if (this.coppie[p]) return { errore: 'Hai già scelto' };
      this.coppie[p] = [a.mosse[0], a.mosse[1]];
      if (this.coppie[0] && this.coppie[1]) { this.fase = 'togli'; this.annuncia(null, 'Meno uno! Ritira una mano', 'Meno uno! Ritira una mano', true); }
      return { ok: true };
    }
    if (!a || a.tipo !== 'tieni' || ![0, 1].includes(Number(a.mano))) return { errore: 'Scegli quale mano tenere' };
    if (this.tieni[p] !== null) return { errore: 'Hai già scelto' };
    this.tieni[p] = Number(a.mano);
    if (this.tieni[0] !== null && this.tieni[1] !== null) {
      // il trucco segreto (!win): tiene la mano migliore contro quella rimasta all'altro
      for (const q of [0, 1]) {
        if (!T.consuma(this, q)) continue;
        const sua = this.coppie[1 - q][this.tieni[1 - q]], esito = (m) => { const v = vince(m, sua); return v === null ? 0 : v === 0 ? 1 : -1; };
        this.tieni[q] = esito(this.coppie[q][1]) > esito(this.coppie[q][0]) ? 1 : 0;
      }
      this.scelte = [this.coppie[0][this.tieni[0]], this.coppie[1][this.tieni[1]]];
      const v = vince(this.scelte[0], this.scelte[1]);
      const [w, l] = v === 0 ? this.scelte : [this.scelte[1], this.scelte[0]];
      this.pausaMs = 3800; // la rivelazione del meno uno dura di più
      this.rivela = { id: ++this.nRiv, scelte: [...this.scelte], coppie: this.coppie.map((c) => [...c]), tieni: [...this.tieni], vince: v, frase: v === null ? 'Pari: si rigioca' : `${cap(NOMI[w])} ${BATTE[w][l]} ${NOMI[l]}` };
      this.inAttesa = true;
    }
    return { ok: true };
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  vincente(m) { return aCaso(battenti(m, this.variante)); }
  // se l'altro ha già scelto, il suggerimento segreto dice cosa fare per vincere
  suggerimentoWin(p) {
    if (this.inAttesa || this.finita) return null;
    if (this.meno1) {
      if (this.fase !== 'togli' || this.tieni[p] !== null || this.tieni[1 - p] === null) return null;
      const sua = this.coppie[1 - p][this.tieni[1 - p]];
      const k = this.coppie[p].findIndex((m) => vince(m, sua) === 0);
      if (k < 0) return null; // nessuna delle due vince: ci pensa il trucco alla rivelazione
      return `💡 Tieni la mano con ${NOMI[this.coppie[p][k]]}`;
    }
    if (this.scelte[p] || !this.scelte[1 - p]) return null;
    return `💡 Gioca ${NOMI[this.vincente(this.scelte[1 - p])]}`;
  }

  avanza() {
    if (!this.inAttesa) return;
    this.coppie = [null, null]; this.tieni = [null, null]; this.fase = 'scegli';
    const r = this.rivela;
    this.storia.push({ scelte: r.scelte, vince: r.vince });
    if (r.vince !== null) this.punti[r.vince]++;
    this.scelte = [null, null];
    this.inAttesa = false;
    if (r.vince !== null && this.punti[r.vince] >= this.serve) this.chiudi(r.vince);
  }

  chiudi(v) {
    this.finita = true;
    this.risultato = { fazioni: [0, 1].map((p) => ({ posti: [p], punti: this.punti[p] })), etichetta: 'mani vinte', pareggio: false, vincitori: [v] };
  }

  vista(p) {
    const altro = 1 - p;
    return {
      gioco: this.id, n: this.n, variante: this.variante, mosse: MOSSE[this.variante], meglio: this.meglio, serve: this.serve,
      punti: this.punti, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      miaScelta: this.scelte[p], altroHaScelto: this.meno1 ? (this.fase === 'scegli' ? !!this.coppie[altro] : this.tieni[altro] !== null) : !!this.scelte[altro],
      meno1: this.meno1, fase: this.fase, miaCoppia: this.coppie[p], altraCoppia: this.fase === 'togli' ? this.coppie[altro] : null, mioTieni: this.tieni[p],
      rivela: this.inAttesa ? this.rivela : null, ultimaRivela: this.rivela,
      storia: this.storia.slice(-10), finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// =================== COMPUTER ===================
// Guarda solo le mani già giocate, mai la scelta attuale dell'avversario.
function battenti(m, variante) { return MOSSE[variante].filter((x) => BATTE[x][m]); }
const aCaso = (l) => l[Math.floor(Math.random() * l.length)];
// meno uno: quanto vale tenere la mossa m contro la coppia dell'altro, se lui tiene a caso (o secondo le sue abitudini)
function botMeno1(g, p, livello) {
  const tutte = MOSSE[g.variante];
  if (g.fase === 'scegli') {
    if (livello === 'facile') return { tipo: 'scegli2', mosse: [aCaso(tutte), aCaso(tutte)] };
    // due mosse diverse: così dopo si può scegliere. Il difficile ci mette quella che batte la mossa che l'altro usa di più
    const a = aCaso(tutte); let b = aCaso(tutte.filter((x) => x !== a));
    if (livello === 'difficile' && g.storia.length) {
      const suoi = g.storia.map((x) => x.scelte[1 - p]), freq = {};
      for (const m of suoi) freq[m] = (freq[m] || 0) + 1;
      const preferita = Object.entries(freq).sort((x, y) => y[1] - x[1])[0][0];
      const contro = aCaso(battenti(preferita, g.variante));
      b = contro !== a ? contro : b;
    }
    return { tipo: 'scegli2', mosse: [a, b] };
  }
  const mia = g.coppie[p], sua = g.coppie[1 - p];
  if (livello === 'facile') return { tipo: 'tieni', mano: Math.random() < 0.5 ? 0 : 1 };
  const valore = (m, pesi) => sua.reduce((t, x, k) => { const v = vince(m, x); return t + pesi[k] * (v === null ? 0 : v === 0 ? 1 : -1); }, 0);
  if (livello === 'medio') { const v0 = valore(mia[0], [0.5, 0.5]), v1 = valore(mia[1], [0.5, 0.5]); return { tipo: 'tieni', mano: v0 === v1 ? (Math.random() < 0.5 ? 0 : 1) : v0 > v1 ? 0 : 1 }; }
  // difficile: pensa a cosa terrà l'altro (se ragiona come il medio tiene la mano migliore contro le mie due) e risponde
  const suoValore = (k) => mia.reduce((t, x) => { const v = vince(sua[k], x); return t + 0.5 * (v === null ? 0 : v === 0 ? 1 : -1); }, 0);
  const s0 = suoValore(0), s1 = suoValore(1);
  const pesi = s0 === s1 ? [0.5, 0.5] : s0 > s1 ? [0.8, 0.2] : [0.2, 0.8];
  const v0 = valore(mia[0], pesi), v1 = valore(mia[1], pesi);
  if (Math.random() < 0.08) return { tipo: 'tieni', mano: Math.random() < 0.5 ? 0 : 1 }; // un po' di imprevedibilità
  return { tipo: 'tieni', mano: v0 === v1 ? (Math.random() < 0.5 ? 0 : 1) : v0 > v1 ? 0 : 1 };
}
function bot(g, p, livello) {
  if (g.meno1) return botMeno1(g, p, livello);
  const scegli = (mossa) => ({ tipo: 'scegli', mossa });
  const tutte = MOSSE[g.variante];
  const suoi = g.storia.map((s) => s.scelte[1 - p]);
  if (livello === 'facile' || !suoi.length) return scegli(aCaso(tutte));
  if (livello === 'medio') {
    // spesso le persone ripetono la mossa con cui hanno appena vinto, o cambiano dopo aver perso
    return Math.random() < 0.5 ? scegli(aCaso(battenti(suoi[suoi.length - 1], g.variante))) : scegli(aCaso(tutte));
  }
  // difficile: prevede la prossima mossa da cosa l'avversario ha fatto dopo la sua ultima mossa
  if (Math.random() < 0.2) return scegli(aCaso(tutte));
  const ultima = suoi[suoi.length - 1];
  const dopo = {};
  for (let k = 0; k < suoi.length - 1; k++) if (suoi[k] === ultima) dopo[suoi[k + 1]] = (dopo[suoi[k + 1]] || 0) + 2;
  for (const m of suoi) dopo[m] = (dopo[m] || 0) + 1; // frequenza generale, con meno peso
  const previsto = Object.entries(dopo).sort((a, b) => b[1] - a[1])[0][0];
  return scegli(aCaso(battenti(previsto, g.variante)));
}

module.exports = {
  meta: {
    id: 'morra',
    nome: 'Sasso carta forbice',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Il classico in due, al meglio di 3 o di 5. Anche con lucertola e Spock, e nel modo "Meno uno" di Squid Game.',
    opzioni: [
      { id: 'meglio', nome: 'Partita', valori: [3, 5], etichette: ['Al meglio di 3', 'Al meglio di 5'], predefinito: 3 },
      { id: 'variante', nome: 'Variante', valori: ['classica', 'estesa'], etichette: ['Classica', 'Con lucertola e Spock'], predefinito: 'classica' },
      { id: 'modo', nome: 'Modo', valori: ['normale', 'meno1'], etichette: ['Normale', 'Meno uno (Squid Game)'], predefinito: 'normale' },
    ],
    regole: [
      'Si gioca in due. Ognuno sceglie in segreto la sua mossa; quando avete scelto entrambi le mani vengono rivelate insieme.',
      'Classica: il sasso rompe le forbici, le forbici tagliano la carta, la carta avvolge il sasso.',
      'Con lucertola e Spock: in più la lucertola avvelena Spock e mangia la carta; Spock rompe le forbici e vaporizza il sasso; il sasso schiaccia la lucertola; le forbici decapitano la lucertola; la carta smentisce Spock.',
      'Se scegliete la stessa mossa la mano è pari e si rigioca.',
      'Al meglio di 3 vince chi arriva per primo a 2 mani vinte; al meglio di 5 chi arriva a 3.',
      'Modo "Meno uno" (come la sfida del Reclutatore in Squid Game): ognuno sceglie in segreto una mossa per ciascuna delle due mani. Poi si mostrano tutte e quattro le mani insieme e ognuno, guardando quelle dell\'altro, ritira in segreto una delle sue ("meno uno"). Si confrontano le due mani rimaste; se sono uguali la mano si rigioca da capo. A fine partita chi perde viene eliminato, come nella serie.',
      'Il computer non vede la tua scelta: il difficile però ricorda le tue abitudini e prova a prevederti. Nel Meno uno il facile tiene una mano a caso, il medio tiene quella che vince contro più mani dell\'altro, il difficile pensa anche a quale mano terrai tu.',
    ],
  },
  crea: (o) => new SassoCartaForbice(o),
  bot,
  _test: { vince, botMeno1 },
};
