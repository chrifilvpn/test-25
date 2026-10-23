// MEMORY: carte coperte a coppie sul tavolo. A turno se ne girano due: se la figura è la stessa la coppia è tua e
// rigiochi, altrimenti restano scoperte un attimo e poi si ricoprono. Da soli si gioca contro il tempo e le mosse.
// Le figure (emoji o bandiere disegnate) le conosce il browser: il server manda solo il numero della figura.
const TEMI = ['animali', 'cibo', 'informatica', 'bandiere'];
const FIGURE_PER_TEMA = 18;
const RECORD = {}; // da soli: le partite migliori per numero di coppie (in memoria finché il server è acceso)
const PAUSA_SBAGLIATE = 1300;

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// quanto ricorda il computer: probabilità di fissare una carta vista, quante ne tiene in testa, probabilità di
// ricordarla sbagliata (scambiandola con un'altra figura vista)
const MENTE = {
  facile: { ricorda: 0.45, capienza: 4, sbaglia: 0.2 },
  medio: { ricorda: 0.85, capienza: 10, sbaglia: 0.05 },
  difficile: { ricorda: 0.97, capienza: 60, sbaglia: 0 },
};

class Memory {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'memory';
    this.n = n;
    this.coppie = [8, 12, 18].includes(Number(opzioni.coppie)) ? Number(opzioni.coppie) : 12;
    this.tema = TEMI.includes(opzioni.tema) ? opzioni.tema : 'animali';
    const figure = mescola([...Array(FIGURE_PER_TEMA).keys()]).slice(0, this.coppie);
    this.carte = mescola([...figure, ...figure]);
    this.prese = new Array(this.carte.length).fill(null); // chi ha preso la carta (posto) o null
    this.scoperte = [];   // le carte girate in questo turno (al massimo due)
    this.punti = new Array(n).fill(0);
    this.mosse = new Array(n).fill(0); // coppie di carte girate da ognuno
    this.serie = 0;       // coppie trovate di fila nel turno attuale
    this.botLiv = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.menti = {};      // la memoria (imperfetta) di ogni computer: carta → figura
    this.nGiro = 0;
    this.turno = primo % n;
    this.inAttesa = false; this.pausaMs = PAUSA_SBAGLIATE;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    // da soli si gioca contro il tempo: con le dispense aperte il cronometro si ferma
    this.pausaBoss = n === 1;
    this.tempo = 0; this.dal = Date.now(); this.inPausa = false;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  cronometro() { return this.tempo + (this.dal && !this.inPausa && !this.finita ? Date.now() - this.dal : 0); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.tempo += Date.now() - this.dal; else this.dal = Date.now();
    this.inPausa = si;
  }

  // il trucco segreto (!win): al suo turno gli si dice dove sono due carte uguali (o la gemella di quella già girata)
  suggerimentoWin(p) {
    if (this.turno !== p || this.inAttesa || this.finita || this.inPausa) return null;
    const col = this.carte.length === 16 ? 4 : 6; // come le dispone il browser
    const dove = (i) => `riga ${Math.floor(i / col) + 1}, colonna ${(i % col) + 1}`;
    const libere = this.carte.map((_, i) => i).filter((i) => this.prese[i] === null && !this.scoperte.includes(i));
    if (this.scoperte.length === 1) {
      const j = libere.find((i) => this.carte[i] === this.carte[this.scoperte[0]]);
      return j === undefined ? null : `💡 La gemella è in ${dove(j)}`;
    }
    const i = libere[Math.floor(Math.random() * libere.length)];
    const j = libere.find((k) => k !== i && this.carte[k] === this.carte[i]);
    return j === undefined ? null : `💡 Coppia: ${dove(Math.min(i, j))} e ${dove(Math.max(i, j))}`;
  }

  // ogni carta girata la vedono tutti: i computer la fissano in memoria, ognuno come può
  osserva(i) {
    for (let p = 0; p < this.n; p++) {
      const liv = this.botLiv[p];
      if (!liv) continue;
      const m = this.menti[p] || (this.menti[p] = new Map());
      const cfg = MENTE[liv];
      if (Math.random() > cfg.ricorda) continue;
      let f = this.carte[i];
      if (Math.random() < cfg.sbaglia) {
        // ricordo confuso: la figura di un'altra carta vista
        const altre = [...m.values()].filter((x) => x !== f);
        if (altre.length) f = altre[Math.floor(Math.random() * altre.length)];
      }
      m.delete(i); m.set(i, f);
      while (m.size > cfg.capienza) m.delete(m.keys().next().value); // si dimentica la più vecchia
    }
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'Partita in pausa' };
    if (this.inAttesa) return { errore: 'Un attimo: le carte si stanno ricoprendo' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'gira') return { errore: 'Mossa non valida' };
    const i = Number(a.carta);
    if (!Number.isInteger(i) || i < 0 || i >= this.carte.length) return { errore: 'Carta non valida' };
    if (this.prese[i] !== null) return { errore: 'Questa coppia è già stata trovata' };
    if (this.scoperte.includes(i)) return { errore: 'Questa carta è già girata' };
    this.scoperte.push(i);
    this.nGiro++;
    this.osserva(i);
    if (this.scoperte.length < 2) return { ok: true };
    const [x, y] = this.scoperte;
    this.mosse[p]++;
    if (this.carte[x] === this.carte[y]) {
      this.prese[x] = p; this.prese[y] = p;
      this.punti[p]++; this.serie++;
      this.scoperte = [];
      this.ultimaCoppia = { carte: [x, y], posto: p, id: this.nGiro };
      for (const m of Object.values(this.menti)) { m.delete(x); m.delete(y); }
      const restano = this.prese.filter((v) => v === null).length;
      if (!restano) return this.chiudi();
      if (this.n > 1) this.annuncia(p, `trova una coppia${this.serie > 1 ? ` (${this.serie} di fila!)` : ''} e rigioca`, `coppia! ${this.serie > 1 ? `${this.serie} di fila, ` : ''}rigiochi`);
      return { ok: true };
    }
    // sbagliate: restano scoperte un attimo, poi si ricoprono e tocca al prossimo
    this.inAttesa = true;
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.scoperte = [];
    this.serie = 0;
    this.turno = (this.turno + 1) % this.n;
  }

  chiudi() {
    this.tempo = this.cronometro(); this.dal = null;
    this.finita = true; this.turno = null; this.inAttesa = false;
    if (this.n === 1) {
      const lista = (RECORD[this.coppie] = RECORD[this.coppie] || []);
      const voce = { mosse: this.mosse[0], ms: this.tempo, id: Math.random() };
      lista.push(voce); lista.sort((a, b) => a.mosse - b.mosse || a.ms - b.ms); lista.splice(5);
      this.posizioneRecord = lista.indexOf(voce);
      const perfetta = this.mosse[0] === this.coppie;
      this.annuncia(0, '', perfetta ? 'partita perfetta! 🎉' : `tutte le coppie in ${this.mosse[0]} mosse! 🎉`, true);
      this.risultato = { fazioni: [{ posti: [0], punti: this.mosse[0] }], etichetta: 'mosse', crescente: true, pareggio: false, vincitori: [0] };
      return { ok: true };
    }
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    if (v.length === 1) this.annuncia(v[0], `vince con ${max} coppie`, `vinci con ${max} coppie! 🎉`, true);
    else this.annuncia(null, `Pareggio a ${max} coppie`, '', true);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'coppie', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    return { ok: true };
  }

  vista() {
    // si vede la figura solo delle carte girate adesso o già prese (a fine partita tutte)
    const carte = this.carte.map((f, i) => ({ f: this.finita || this.prese[i] !== null || this.scoperte.includes(i) ? f : null, presa: this.prese[i] }));
    return {
      gioco: this.id, n: this.n, tema: this.tema, coppie: this.coppie, carte, scoperte: this.scoperte, nGiro: this.nGiro,
      punti: this.punti, mosse: this.mosse, serie: this.serie, ultimaCoppia: this.ultimaCoppia || null,
      sbagliate: this.inAttesa ? this.scoperte : null,
      tempo: this.cronometro(), corre: this.n === 1 && !this.finita && !this.inPausa,
      record: this.n === 1 ? RECORD[this.coppie] || [] : [], posizioneRecord: this.finita && this.n === 1 ? this.posizioneRecord : -1,
      turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Gira solo carte coperte e non prese. Con la sua memoria cerca una coppia già vista; altrimenti scopre una carta
// che non ricorda (così impara qualcosa), e come seconda carta prova quella che ricorda uguale alla prima.
function bot(g, p, livello) {
  const gira = (carta) => ({ tipo: 'gira', carta });
  const libere = g.carte.map((_, i) => i).filter((i) => g.prese[i] === null && !g.scoperte.includes(i));
  const m = g.menti[p] || new Map();
  const ricordo = (i) => (m.has(i) ? m.get(i) : undefined);
  const ignote = libere.filter((i) => ricordo(i) === undefined);
  const aCaso = (lista) => lista[Math.floor(Math.random() * lista.length)];
  if (!g.scoperte.length) {
    // una coppia che ricordo?
    const perFigura = new Map();
    for (const i of libere) { const f = ricordo(i); if (f === undefined) continue; if (perFigura.has(f)) return gira(perFigura.get(f)); perFigura.set(f, i); }
    return gira(aCaso(ignote.length ? ignote : libere));
  }
  const prima = g.scoperte[0], f = g.carte[prima]; // la prima carta è scoperta: la figura la vedono tutti
  const uguale = libere.find((i) => ricordo(i) === f);
  if (uguale !== undefined) return gira(uguale);
  // il facile ogni tanto ne gira una che già conosce (si confonde)
  if (livello === 'facile' && Math.random() < 0.25) return gira(aCaso(libere));
  return gira(aCaso(ignote.length ? ignote : libere));
}

module.exports = {
  meta: {
    id: 'memory',
    nome: 'Memory',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Gira le carte due alla volta e trova le coppie. Da soli contro il tempo, oppure a turni con gli amici.',
    alias: ['memoria', 'coppie', 'carte coperte', 'trova le coppie'],
    opzioni: [
      { id: 'coppie', nome: 'Coppie', valori: [12, 8, 18], etichette: ['12 coppie (24 carte)', '8 coppie (16 carte)', '18 coppie (36 carte)'], predefinito: 12 },
      { id: 'tema', nome: 'Figure', valori: TEMI, etichette: ['🐶 Animali', '🍕 Cibo', '💻 Informatica', '🏳️ Bandiere'], predefinito: 'animali' },
    ],
    regole: [
      'Sul tavolo ci sono le carte coperte, a coppie uguali e mescolate (8, 12 o 18 coppie). Il tema delle figure si sceglie prima di iniziare: animali, cibo, informatica o bandiere.',
      'A ogni mossa giri due carte, toccandole una dopo l\'altra. Se hanno la stessa figura la coppia è tua, resta scoperta e giri ancora.',
      'Se le figure sono diverse restano scoperte un attimo (guardale bene!) e poi si ricoprono: tocca al giocatore dopo.',
      'Da soli giochi contro il tempo e le mosse: una mossa è una coppia di carte girate. La partita perfetta usa tante mosse quante sono le coppie (impossibile senza fortuna!). Le migliori partite finiscono in classifica; con le dispense aperte il cronometro si ferma.',
      'In più giocatori (da 2 a 6) si gioca a turni: vince chi trova più coppie; a parità è pareggio.',
      'Il computer ha una memoria imperfetta, come una persona: il facile ricorda poche carte e a volte le confonde, il medio ricorda le ultime carte viste, il difficile ricorda quasi tutto.',
    ],
  },
  crea: (o) => new Memory(o),
  bot,
  _test: { MENTE, TEMI, FIGURE_PER_TEMA, RECORD },
};
