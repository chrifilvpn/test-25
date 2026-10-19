// LA PEPPA TENCIA: mazzo di animali a coppie più una carta sola, la Peppa (una gatta nera diabolica).
// Si parte con 4 carte a testa; a ogni turno si pesca dal mazzo oppure una carta coperta dalla mano di un avversario.
// Le coppie si scartano da sole e valgono 1 punto a chi le fa. Si va avanti finché tutte le coppie sono fatte:
// vince chi ne ha fatte di più, e chi alla fine ha la Peppa in mano perde 3 punti. Da 2 a 6, con il computer.
// Il mazzo cresce con i giocatori: 20 coppie in due, fino a 34 in sei (con più di 24 coppie alcuni animali ne hanno due).
const ANIMALI = ['gatto', 'rana', 'coniglio', 'volpe', 'panda', 'pinguino', 'gufo', 'maialino', 'pulcino', 'koala', 'riccio', 'tartaruga',
  'orsetto', 'topolino', 'lumaca', 'pesciolino', 'cane', 'pecora', 'leone', 'elefante', 'polpo', 'ape', 'balena', 'scimmia'];
const NOMI = {
  gatto: 'Gatto', rana: 'Rana', coniglio: 'Coniglio', volpe: 'Volpe', panda: 'Panda', pinguino: 'Pinguino', gufo: 'Gufo', maialino: 'Maialino',
  pulcino: 'Pulcino', koala: 'Koala', riccio: 'Riccio', tartaruga: 'Tartaruga', orsetto: 'Orsetto', topolino: 'Topolino', lumaca: 'Lumaca', pesciolino: 'Pesciolino',
  cane: 'Cane', pecora: 'Pecora', leone: 'Leone', elefante: 'Elefante', polpo: 'Polpo', ape: 'Ape', balena: 'Balena', scimmia: 'Scimmia', peppa: 'La Peppa',
};
const COPPIE = { 2: 20, 3: 24, 4: 27, 5: 31, 6: 34 };
const INIZIALI = 4;
const PENALITA_PEPPA = 3;
const MAX_PESCATE = 800; // rete di sicurezza: dopo 800 pescate si chiude comunque
const PAUSA_PESCA = 1700;

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const animaleDi = (id) => id.split('-')[0];
const T = require('./trucco');

class Peppa {
  constructor({ n, primo = 0 }) {
    this.id = 'peppa';
    this.n = n;
    this.nCoppie = COPPIE[n] || 20;
    // ogni animale una coppia; oltre le 24 coppie i primi animali ne hanno una seconda (4 carte)
    const carte = [];
    for (let k = 0; k < this.nCoppie; k++) {
      const a = ANIMALI[k % ANIMALI.length], giro = Math.floor(k / ANIMALI.length);
      carte.push(`${a}-${giro * 2 + 1}`, `${a}-${giro * 2 + 2}`);
    }
    this.animali = [...new Set(carte.map(animaleDi))];
    this.mazzo = mescola([...carte, 'peppa']);
    this.mani = Array.from({ length: n }, () => []);
    for (let r = 0; r < INIZIALI; r++) for (let k = 0; k < n; k++) this.mani[(primo + k) % n].push(this.mazzo.pop());
    this.scarti = [];          // coppie scartate: { animale, posto }
    this.punti = new Array(n).fill(0);
    this.iniziali = this.mani.map((m, i) => this.scartaCoppie(i));
    this.mani.forEach((m) => mescola(m));
    this.memoria = new Array(n).fill(null); // per il computer: { di, indice } dove sa che c'è la Peppa
    this.inAttesa = false;
    this.pausaMs = PAUSA_PESCA;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nPesca = 0;
    this.ultimaPesca = null;   // { id, da ('mazzo' o posto), a, indice, carta, coppia }
    this.mescolate = new Array(n).fill(0);
    this.daMescolare = new Array(n).fill(false);
    this.fase = 'gioco';
    this.turno = primo % n;
    if (this.scarti.length >= this.nCoppie) this.chiudi();
  }

  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  // da dove si può pescare: dal mazzo finché ha carte; quando è finito, dalle mani degli avversari
  fonti(p) {
    if (this.mazzo.length) return ['mazzo'];
    return this.mani.map((m, i) => (i !== p && m.length ? i : -1)).filter((i) => i >= 0);
  }

  // il trucco segreto (!win): la carta che si pesca fa coppia (e non è mai la Peppa). Dal mazzo va in cima una
  // gemella di una carta in mano; dalla mano di un avversario, la gemella prende il posto della carta scelta
  truccaPescata(p, da, indice) {
    const fa = (c) => c !== 'peppa' && this.mani[p].some((x) => x !== 'peppa' && animaleDi(x) === animaleDi(c));
    if (da === 'mazzo') {
      if (!T.inCima(this.mazzo, fa) && this.mazzo[this.mazzo.length - 1] === 'peppa') T.inCima(this.mazzo, (c) => c !== 'peppa');
      return;
    }
    const m = this.mani[da];
    if (!Number.isInteger(indice) || indice < 0 || indice >= m.length || fa(m[indice])) return;
    let j = m.findIndex(fa);
    if (j < 0 && m[indice] === 'peppa') j = m.findIndex((c) => c !== 'peppa');
    if (j < 0) return;
    [m[indice], m[j]] = [m[j], m[indice]];
    // chi sapeva dov'era la Peppa la ritrova dove è finita
    this.memoria = this.memoria.map((x) => (x && x.di === da && (x.indice === indice || x.indice === j) ? { ...x, indice: x.indice === indice ? j : indice } : x));
  }

  scartaCoppie(p) {
    const visti = new Map();
    let coppie = 0;
    for (const c of [...this.mani[p]]) {
      if (c === 'peppa') continue;
      const a = animaleDi(c);
      if (visti.has(a)) {
        this.mani[p] = this.mani[p].filter((x) => x !== c && x !== visti.get(a));
        this.scarti.push({ animale: a, posto: p });
        this.punti[p]++;
        visti.delete(a);
        coppie++;
      } else visti.set(a, c);
    }
    return coppie;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a) return { errore: 'Mossa non valida' };
    if (a.tipo === 'mescola') {
      if (!this.mani[p].length) return { errore: 'Non hai carte' };
      mescola(this.mani[p]);
      this.mescolate[p]++;
      this.daMescolare[p] = false;
      this.memoria = this.memoria.map((m) => (m && m.di === p ? null : m)); // chi sapeva dov'era la Peppa non lo sa più
      return { ok: true };
    }
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a.tipo !== 'pesca') return { errore: 'Pesca dal mazzo o da un avversario' };
    const da = a.da === 'mazzo' ? 'mazzo' : Number(a.da);
    if (!this.fonti(p).includes(da)) return { errore: da === 'mazzo' ? 'Il mazzo è finito: pesca da un avversario' : this.mazzo.length ? 'Finché c\'è il mazzo si pesca dal mazzo' : 'Da lì non puoi pescare' };
    const valido = da === 'mazzo' || (Number.isInteger(Number(a.indice)) && Number(a.indice) >= 0 && Number(a.indice) < this.mani[da].length);
    if (valido && T.consuma(this, p)) this.truccaPescata(p, da, Number(a.indice));
    let carta, i = null;
    if (da === 'mazzo') carta = this.mazzo.pop();
    else {
      i = Number(a.indice);
      if (!Number.isInteger(i) || i < 0 || i >= this.mani[da].length) return { errore: 'Scegli una delle sue carte' };
      carta = this.mani[da].splice(i, 1)[0];
      // la memoria del computer: le carte dopo quella presa scalano di un posto
      this.memoria = this.memoria.map((m) => {
        if (!m || m.di !== da) return m;
        if (m.indice === i) return null;
        return { ...m, indice: m.indice > i ? m.indice - 1 : m.indice };
      });
    }
    this.daMescolare[p] = false;
    let coppia = null;
    if (carta === 'peppa') {
      this.mani[p].push(carta);
      if (da !== 'mazzo') this.memoria[da] = { di: p, indice: this.mani[p].length - 1 }; // chi l'ha data sa dove è finita
      this.daMescolare[p] = true;
    } else {
      const gemella = this.mani[p].find((c) => c !== 'peppa' && animaleDi(c) === animaleDi(carta));
      if (gemella) {
        const idx = this.mani[p].indexOf(gemella);
        this.mani[p].splice(idx, 1);
        this.memoria = this.memoria.map((m) => (m && m.di === p && m.indice > idx ? { ...m, indice: m.indice - 1 } : m));
        coppia = animaleDi(carta);
        this.scarti.push({ animale: coppia, posto: p });
        this.punti[p]++;
      } else this.mani[p].push(carta);
    }
    this.nPesca++;
    this.ultimaPesca = { id: this.nPesca, da, a: p, indice: i, carta, coppia };
    const dove = da === 'mazzo' ? 'dal mazzo' : `da ${'@'}`;
    const extra = da === 'mazzo' ? {} : { bersaglio: da };
    if (carta === 'peppa') this.annuncia(p, `pesca una carta ${dove}`, 'hai pescato… LA PEPPA! 😱', false, { ...extra, testoTe: 'ti ha preso una carta… era la Peppa! 😌' });
    else if (coppia) this.annuncia(p, `fa coppia: ${NOMI[coppia]}! +1`, `coppia di ${NOMI[coppia]}! +1`, false, extra);
    else this.annuncia(p, `pesca una carta ${dove}`, `hai pescato: ${NOMI[animaleDi(carta)]}`, false, extra);
    this.turno = null;
    this.inAttesa = true;
    // pausa per l'animazione: più corta per le pescate dal mazzo senza sorprese
    this.pausaMs = da === 'mazzo' && !coppia && carta !== 'peppa' ? 1000 : PAUSA_PESCA;
    this.dopoPesca = p;
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    if (this.scarti.length >= this.nCoppie || this.nPesca >= MAX_PESCATE) { this.chiudi(); return; }
    // tocca al prossimo che ha qualcosa da pescare
    for (let k = 1; k <= this.n; k++) {
      const t = (this.dopoPesca + k) % this.n;
      if (this.fonti(t).length) { this.turno = t; return; }
    }
    this.chiudi();
  }

  sblocca() { if (this.inAttesa) this.avanza(); }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.turno = null;
    this.fase = 'fine';
    const perdente = this.mani.findIndex((m) => m.includes('peppa'));
    this.perdente = perdente;
    const totali = this.punti.map((x, i) => x - (i === perdente ? PENALITA_PEPPA : 0));
    this.totali = totali;
    if (perdente >= 0) this.annuncia(perdente, `resta con la Peppa! 🐈‍⬛ −${PENALITA_PEPPA}`, `sei rimasto con la Peppa! 🐈‍⬛ −${PENALITA_PEPPA}`, true);
    const max = Math.max(...totali);
    const vincitori = totali.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: totali.map((x, i) => ({ posti: [i], punti: x })),
      etichetta: 'punti', pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori,
    };
    return { ok: true };
  }

  vista(p) {
    const up = this.ultimaPesca;
    // la carta pescata la vedono solo chi l'ha presa e chi l'ha data; se fa coppia la vedono tutti (è scoperta)
    const pesca = up ? { id: up.id, da: up.da, a: up.a, indice: up.indice, coppia: up.coppia, carta: up.a === p || up.da === p || up.coppia || this.finita ? up.carta : null } : null;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      mano: this.mani[p].map((id) => ({ id, animale: animaleDi(id) })),
      carteInMano: this.mani.map((m) => m.length), mazzo: this.mazzo.length, fonti: this.turno === p ? this.fonti(p) : [],
      scarti: this.scarti, nCoppie: this.nCoppie, punti: this.punti, iniziali: this.iniziali, animali: this.animali, nomi: NOMI,
      ultimaPesca: pesca, mescolate: this.mescolate, penalita: PENALITA_PEPPA,
      perdente: this.finita ? this.perdente : null, totali: this.finita ? this.totali : null,
      maniFinali: this.finita ? this.mani : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// facile: pesca a caso e non mescola mai. medio: a volte si ricorda dov'è la Peppa e mescola dopo averla presa.
// difficile: se sa dov'è la Peppa la evita sempre (e ne approfitta per rubare dagli avversari), mescola ogni volta che la riceve.
function bot(g, posto, livello) {
  if (g.daMescolare[posto] && g.mani[posto].includes('peppa') && livello !== 'facile' && (livello === 'difficile' || g.nPesca % 2 === 0)) return { tipo: 'mescola' };
  const fonti = g.fonti(posto);
  if (fonti.includes('mazzo')) return { tipo: 'pesca', da: 'mazzo' };
  const caso = (a) => a[Math.floor(Math.random() * a.length)];
  const mem = g.memoria[posto];
  const ricorda = mem && (livello === 'difficile' || (livello === 'medio' && Math.random() < 0.6));
  let da;
  if (livello === 'facile') da = caso(fonti);
  else {
    // chi sa dov'è la Peppa evita di pescare dalla mano dove è l'unica carta; il difficile ruba a chi ha più carte
    const sicuri = ricorda ? fonti.filter((x) => !(mem.di === x && g.mani[x].length === 1)) : fonti;
    const lista = sicuri.length ? sicuri : fonti;
    da = livello === 'difficile' ? [...lista].sort((a, b) => g.mani[b].length - g.mani[a].length)[0] : caso(lista);
  }
  const scelte = Array.from({ length: g.mani[da].length }, (_, i) => i);
  const ok = ricorda && mem.di === da && scelte.length > 1 ? scelte.filter((i) => i !== mem.indice) : scelte;
  return { tipo: 'pesca', da, indice: caso(ok) };
}

module.exports = {
  meta: {
    id: 'peppa',
    nome: 'La Peppa Tencia',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Pesca dal mazzo, poi dagli avversari, e fai coppie di animali. Chi resta con la Peppa, la gatta nera, perde 3 punti.',
    opzioni: [],
    regole: [
      'Il mazzo ha coppie di carte con gli animali (gatto, rana, cane, leone, polpo…) più una carta sola: la Peppa, una gatta nera diabolica, che non fa coppia con niente.',
      'Il mazzo cresce con i giocatori: 20 coppie in due, 24 in tre, 27 in quattro, 31 in cinque e 34 in sei. Con più di 24 coppie alcuni animali hanno due coppie (4 carte uguali): due qualsiasi fanno coppia.',
      'Si parte con 4 carte a testa. Le coppie che hai già in mano si scartano subito, da sole, e valgono già 1 punto ciascuna. La Peppa è nel mazzo: non la ha per forza qualcuno all\'inizio.',
      'Al tuo turno peschi una carta dal mazzo. Se fa coppia con una delle tue, la coppia si scarta e prendi 1 punto; altrimenti la tieni. Poi tocca al giocatore dopo di te.',
      'Quando il mazzo è finito si pesca una carta coperta dalla mano di un avversario a tua scelta (clicca la carta). Anche chi resta senza carte continua a giocare: pesca dagli altri.',
      'La partita finisce quando tutte le coppie sono state fatte (non quando qualcuno finisce le carte). Vince chi ha fatto più coppie; chi alla fine ha la Peppa in mano perde 3 punti. A parità è pareggio.',
      'La Peppa ha un bordo rosso che vede solo chi la ha in mano: gli altri vedono soltanto il dorso. Con "Mescola" cambi l\'ordine delle tue carte quando vuoi, così chi pesca da te non sa dove sia. Chi ti ha dato la Peppa sa dove l\'hai messa, finché non mescoli.',
      'Il computer facile pesca a caso. Il medio a volte si ricorda dove è finita la Peppa e mescola dopo averla presa. Il difficile se lo ricorda sempre, ruba a chi ha più carte evitandola e mescola ogni volta che la riceve.',
    ],
  },
  crea: (o) => new Peppa(o),
  bot,
  _test: { animaleDi, COPPIE },
};
