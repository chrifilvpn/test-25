// SOLITARIO KLONDIKE (pesca 1): gara tra amici, tutti con la stessa distribuzione, ognuno sul suo tavolo.
// Vince chi mette per primo tutte le 52 carte sulle basi; se nessuno ci riesce (tutti si arrendono o scade il
// tempo) vince chi ne ha messe di più. Si può giocare anche da soli (con la classifica dei tempi migliori).
const SEMI = ['c', 'q', 'f', 'p'];
const { nomeCarta } = require('./carte');
const ROSSO = { c: true, q: true };
const LIMITI = [0, 10, 20, 30]; // minuti; 0 = senza limite
const RECORD = []; // tempi migliori (in memoria, come le altre classifiche)

function mescola(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mazzo52() { const m = []; for (const s of SEMI) for (let r = 1; r <= 13; r++) m.push({ id: `${r}${s}`, rango: r, seme: s }); return m; }

// una distribuzione: 7 colonne (la k-esima ha k+1 carte, solo l'ultima scoperta), il resto nel tallone
function distribuzione(ordine) {
  const m = ordine.map((c) => ({ ...c }));
  const colonne = [];
  for (let k = 0; k < 7; k++) colonne.push(m.splice(0, k + 1).map((c, i) => ({ ...c, su: i === k })));
  return { colonne, tallone: m.reverse(), scarti: [], basi: [[], [], [], []] };
}

const puoSuBase = (c, base) => (base.length ? base[base.length - 1].seme === c.seme && base[base.length - 1].rango === c.rango - 1 : c.rango === 1);
const puoSuColonna = (c, col) => {
  if (!col.length) return c.rango === 13;
  const t = col[col.length - 1];
  return t.su && !!ROSSO[t.seme] !== !!ROSSO[c.seme] && t.rango === c.rango + 1;
};
const suBasi = (t) => t.basi.reduce((s, b) => s + b.length, 0);
const copia = (t) => JSON.parse(JSON.stringify({ colonne: t.colonne, tallone: t.tallone, scarti: t.scarti, basi: t.basi }));

// SUGGERIMENTO: una mossa utile, nell'ordine in cui la cercherebbe un buon giocatore:
// 1) una carta sulle basi, 2) una pila che scopre una carta coperta (anche un re su una colonna vuota),
// 4) la carta degli scarti su una colonna, 5) altrimenti pescare. Restituisce { da, a } oppure { pesca: true }.
function suggerisci(t) {
  const cima = (col) => col[col.length - 1];
  // 1) sulle basi: dalle colonne e dagli scarti (gli assi e i due prima di tutto)
  const versoBase = [];
  t.colonne.forEach((col, i) => { const c = cima(col); if (c && c.su) versoBase.push({ c, da: { tipo: 'col', i, k: col.length - 1 } }); });
  if (t.scarti.length) versoBase.push({ c: cima(t.scarti), da: { tipo: 'scarti' } });
  versoBase.sort((x, y) => x.c.rango - y.c.rango);
  for (const x of versoBase) { const b = t.basi.findIndex((base) => puoSuBase(x.c, base)); if (b >= 0) return { da: x.da, a: { tipo: 'base', i: b } }; }
  // 2) e 3) spostare una pila intera (dalla prima carta scoperta) quando così si scopre una carta coperta
  // (anche un re su una colonna vuota); spostare una pila che non scopre niente non serve
  for (let i = 0; i < t.colonne.length; i++) {
    const col = t.colonne[i], k = col.findIndex((c) => c.su);
    if (k <= 0) continue;
    const j = t.colonne.findIndex((dest, jj) => jj !== i && puoSuColonna(col[k], dest));
    if (j >= 0) return { da: { tipo: 'col', i, k }, a: { tipo: 'col', i: j } };
  }
  // 4) la carta degli scarti su una colonna
  if (t.scarti.length) { const c = cima(t.scarti); const j = t.colonne.findIndex((col) => puoSuColonna(c, col)); if (j >= 0) return { da: { tipo: 'scarti' }, a: { tipo: 'col', i: j } }; }
  // 5) pescare (o rigirare gli scarti)
  if (t.tallone.length || t.scarti.length) return { pesca: true };
  return null;
}

// il trucco segreto (!win): la prossima mossa giusta detta a parole; se c'è da pescare, si sbircia nel tallone
// quante carte servono per arrivare a una che si può giocare
function consiglioWin(t) {
  const x = suggerisci(t);
  if (!x) return null;
  const dove = (d) => (d.tipo === 'base' ? 'sulla base' : d.tipo === 'scarti' ? 'dagli scarti' : `colonna ${d.i + 1}`);
  if (!x.pesca) {
    const c = x.da.tipo === 'scarti' ? t.scarti[t.scarti.length - 1] : t.colonne[x.da.i][x.da.k];
    return `💡 ${nomeCarta(c)} (${dove(x.da)}) → ${x.a.tipo === 'base' ? 'sulla base' : `colonna ${x.a.i + 1}`}`;
  }
  // pesca 1: escono dal fondo dell'array del tallone; finito il tallone si rigirano gli scarti
  const prossime = [...t.tallone].reverse().concat(t.scarti);
  const serve = (c) => t.basi.some((b) => puoSuBase(c, b)) || t.colonne.some((col) => puoSuColonna(c, col));
  const k = prossime.findIndex(serve);
  if (k < 0) return '💡 Nel tallone non c\'è niente che serva: sposta le carte nelle colonne';
  const volte = k + 1 + (k >= t.tallone.length ? 1 : 0); // rigirare gli scarti conta come una pescata
  return `💡 Pesca ${volte} ${volte > 1 ? 'volte' : 'volta'}${k >= t.tallone.length ? ' (rigirando gli scarti)' : ''}: arriva ${nomeCarta(prossime[k])}`;
}

class Solitario {
  constructor({ n, opzioni = {} }) {
    this.id = 'solitario';
    this.n = n;
    this.limite = LIMITI.includes(Number(opzioni.limite)) ? Number(opzioni.limite) : 0;
    this.ordine = mescola(mazzo52());
    this.tavoli = Array.from({ length: n }, () => distribuzione(this.ordine));
    this.stato = new Array(n).fill('gioca'); // gioca | finito | arreso
    this.tempi = new Array(n).fill(null);
    this.mosse = new Array(n).fill(0);
    this.giri = new Array(n).fill(0); // quante volte si è rigirato il tallone
    this.indietro = Array.from({ length: n }, () => []); // per "Annulla": il tavolo prima di ogni mossa
    this.aiuti = new Array(n).fill(0);
    this.suggerito = new Array(n).fill(null);
    this.inizio = Date.now();
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.pausaBoss = n === 1; // da soli la partita si ferma con le dispense; in gara no (il tempo corre per tutti)
    this.inPausa = false; this.pausaDal = null;
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita || !this.pausaBoss) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) this.inizio += Date.now() - this.pausaDal;
    this.inPausa = si;
  }
  attesi() { return []; } // si gioca tutti insieme, nessuno viene aspettato

  scadenza() { return this.limite && !this.finita && !this.inPausa ? this.inizio + this.limite * 60000 : null; }
  controllaTempo() {
    if (this.finita || !this.limite || Date.now() < this.inizio + this.limite * 60000) return false;
    this.annuncia(null, '⏰ Tempo scaduto!', '', true);
    this.chiudi();
    return true;
  }

  // la carta (o la pila) presa da una posizione: { tipo: 'scarti' } | { tipo: 'col', i, k } | { tipo: 'base', i }
  prendi(t, da) {
    if (!da) return null;
    if (da.tipo === 'scarti') return t.scarti.length ? { carte: [t.scarti[t.scarti.length - 1]], via: () => t.scarti.pop() } : null;
    if (da.tipo === 'base') { const b = t.basi[da.i]; return b && b.length ? { carte: [b[b.length - 1]], via: () => b.pop() } : null; }
    if (da.tipo === 'col') {
      const col = t.colonne[da.i];
      const k = Number(da.k);
      if (!col || !(k >= 0 && k < col.length) || !col[k].su) return null;
      return { carte: col.slice(k), via: () => { col.splice(k); if (col.length && !col[col.length - 1].su) col[col.length - 1].su = true; } };
    }
    return null;
  }

  suggerimentoWin(p) { return this.stato[p] === 'gioca' && !this.inPausa ? consiglioWin(this.tavoli[p]) : null; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'La partita è in pausa' };
    if (this.stato[p] !== 'gioca') return { errore: this.stato[p] === 'finito' ? 'Hai già finito! Aspetta gli altri' : 'Ti sei arreso' };
    const t = this.tavoli[p];
    if (!a || !a.tipo) return { errore: 'Mossa non valida' };
    if (a.tipo === 'arrenditi') {
      this.stato[p] = 'arreso';
      this.annuncia(p, `si arrende con ${suBasi(t)} carte sulle basi 🏳️`, `ti sei arreso con ${suBasi(t)} carte sulle basi 🏳️`);
      return this.controllaFine();
    }
    // annulla l'ultima mossa (conta come una mossa)
    if (a.tipo === 'annulla') {
      const prima = this.indietro[p].pop();
      if (!prima) return { errore: 'Non c\'è niente da annullare' };
      Object.assign(t, prima); this.mosse[p]++; this.suggerito[p] = null;
      return { ok: true };
    }
    // suggerimento: si mostra una mossa utile (si contano gli aiuti chiesti)
    if (a.tipo === 'aiuto') {
      const x = suggerisci(t);
      if (!x) return { errore: 'Non ci sono mosse utili: forse è il momento di arrendersi' };
      this.suggerito[p] = x; this.aiuti[p]++;
      return { ok: true };
    }
    if (a.tipo === 'pesca' || a.tipo === 'muovi') { this.indietro[p].push(copia(t)); if (this.indietro[p].length > 60) this.indietro[p].shift(); this.suggerito[p] = null; }
    if (a.tipo === 'pesca') {
      if (t.tallone.length) { const c = t.tallone.pop(); c.su = true; t.scarti.push(c); }
      else if (t.scarti.length) { t.tallone = t.scarti.reverse().map((c) => ({ ...c, su: false })); t.scarti = []; this.giri[p]++; }
      else return { errore: 'Il tallone è vuoto' };
      this.mosse[p]++;
      return { ok: true };
    }
    if (a.tipo === 'muovi') {
      const r = this.muovi(p, t, a);
      if (r.errore) this.indietro[p].pop(); // una mossa non valida non si annulla
      return r;
    }
    if (a.tipo === 'finisci') return this.finisci(p, t);
    return { errore: 'Mossa non valida' };
  }

  muovi(p, t, a) {
    {
      const presa = this.prendi(t, a.da);
      if (!presa) return { errore: 'Non puoi prendere questa carta' };
      const [prima] = presa.carte;
      const dest = a.a || {};
      if (dest.tipo === 'base') {
        let i = Number(dest.i);
        if (dest.i == null || dest.i === 'auto') i = t.basi.findIndex((b) => puoSuBase(prima, b));
        const base = t.basi[i];
        if (presa.carte.length !== 1) return { errore: 'Sulle basi si mette una carta alla volta' };
        if (!base || !puoSuBase(prima, base)) return { errore: 'Sulle basi si sale dall\'asso al re, stesso seme' };
        if (a.da.tipo === 'base' && a.da.i === i) return { errore: 'La carta è già lì' };
        presa.via();
        base.push({ ...prima, su: true });
      } else if (dest.tipo === 'col') {
        const col = t.colonne[Number(dest.i)];
        if (!col) return { errore: 'Colonna non valida' };
        if (a.da.tipo === 'col' && Number(a.da.i) === Number(dest.i)) return { errore: 'La carta è già lì' };
        if (!puoSuColonna(prima, col)) return { errore: col.length ? 'Nelle colonne si scende di uno, alternando rosso e nero' : 'Su una colonna vuota va solo un re' };
        presa.via();
        col.push(...presa.carte.map((c) => ({ ...c, su: true })));
      } else return { errore: 'Destinazione non valida' };
      this.mosse[p]++;
      return this.controllaVinto(p);
    }
  }

  finisci(p, t) {
    {
      // tutte le carte scoperte e tallone vuoto: si mandano da sole sulle basi
      if (t.tallone.length || t.scarti.length || t.colonne.some((c) => c.some((x) => !x.su))) return { errore: 'Si può finire da soli solo con tutte le carte scoperte' };
      for (let guardia = 0; guardia < 60 && suBasi(t) < 52; guardia++) {
        for (const col of t.colonne) {
          const c = col[col.length - 1];
          if (!c) continue;
          const i = t.basi.findIndex((b) => puoSuBase(c, b));
          if (i >= 0) { col.pop(); t.basi[i].push(c); this.mosse[p]++; }
        }
      }
      return this.controllaVinto(p);
    }
  }

  controllaVinto(p) {
    const t = this.tavoli[p];
    if (suBasi(t) < 52) return { ok: true };
    this.stato[p] = 'finito';
    this.tempi[p] = Date.now() - this.inizio;
    const primo = this.tempi.filter((x) => x !== null).length === 1;
    this.annuncia(p, `ha finito il solitario in ${fmt(this.tempi[p])}! ${primo && this.n > 1 ? '🏆' : '🃏'}`, `solitario finito in ${fmt(this.tempi[p])}! ${primo && this.n > 1 ? '🏆' : '🃏'}`, true);
    RECORD.push({ tempo: this.tempi[p], mosse: this.mosse[p], quando: Date.now() });
    RECORD.sort((x, y) => x.tempo - y.tempo);
    RECORD.splice(5);
    return this.controllaFine();
  }

  // in gara basta che il primo finisca; da soli o se tutti si arrendono, si chiude quando nessuno gioca più
  controllaFine() {
    if (this.stato.some((s) => s === 'finito') || this.stato.every((s) => s !== 'gioca')) this.chiudi();
    return { ok: true };
  }

  esce(p) { if (this.stato[p] === 'gioca') { this.stato[p] = 'arreso'; this.controllaFine(); } }
  rientra() {}

  chiudi() {
    if (this.finita) return;
    this.finita = true;
    const basi = this.tavoli.map(suBasi);
    let vincitori;
    const finiti = this.tempi.map((x, i) => (x !== null ? i : -1)).filter((i) => i >= 0);
    if (finiti.length) { const min = Math.min(...finiti.map((i) => this.tempi[i])); vincitori = finiti.filter((i) => this.tempi[i] === min); }
    else if (this.n === 1) vincitori = [];
    else { const max = Math.max(...basi); vincitori = basi.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0); }
    this.risultato = {
      fazioni: basi.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'carte sulle basi',
      pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori,
    };
    if (this.n === 1) this.risultato.titolo = finiti.length ? `Solitario risolto in ${fmt(this.tempi[0])}` : `Non risolto: ${basi[0]} carte sulle basi`;
    this.record = RECORD.slice();
  }

  vista(p) {
    const t = this.tavoli[p] || this.tavoli[0];
    const nasc = (c) => (c.su ? c : { id: null, su: false });
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      limite: this.limite, trascorso: (this.inPausa ? this.pausaDal : Date.now()) - this.inizio, inPausa: this.inPausa,
      mio: {
        colonne: t.colonne.map((col) => col.map(nasc)), tallone: t.tallone.length,
        scarti: t.scarti.slice(-3), nScarti: t.scarti.length, basi: t.basi.map((b) => b.slice(-2)),
      },
      altri: this.tavoli.map((x, i) => ({ basi: suBasi(x), cime: x.basi.map((b) => (b.length ? b[b.length - 1] : null)), coperte: x.colonne.reduce((s, c) => s + c.filter((y) => !y.su).length, 0), stato: this.stato[i], tempo: this.tempi[i], mosse: this.mosse[i] })),
      giri: this.giri[p], mosse: this.mosse[p], stato: this.stato[p],
      puoAnnullare: this.indietro[p].length > 0, suggerito: this.suggerito[p], aiuti: this.aiuti[p],
      record: this.finita ? this.record : RECORD.slice(0, 5),
    };
  }
}
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

module.exports = {
  meta: {
    id: 'solitario',
    nome: 'Solitario Klondike',
    tipo: 'tabellone',
    soloPersone: true,
    giocatori: [1, 2, 3, 4, 5, 6],
    descrizione: 'Il solitario classico, pesca 1. Da soli o in gara con gli amici: stesse carte per tutti, vince chi finisce prima.',
    alias: ['solitario', 'klondike', 'patience', 'solitaire', 'solitario di windows'],
    opzioni: [
      { id: 'limite', nome: 'Tempo', valori: LIMITI, etichette: ['Senza limite', '10 minuti', '20 minuti', '30 minuti'], predefinito: 0 },
    ],
    regole: [
      'Si gioca con un mazzo da 52 carte. All\'inizio ci sono 7 colonne: la prima ha 1 carta, la seconda 2 e così via fino a 7; in ogni colonna solo l\'ultima carta è scoperta. Le altre 24 carte formano il tallone, coperto.',
      'Scopo: mettere tutte le carte sulle 4 basi, una per seme, salendo dall\'asso al re.',
      'Nelle colonne si scende di uno alternando rosso e nero (per esempio un 9 nero su un 10 rosso). Si può spostare una carta scoperta insieme a tutte quelle che ha sopra. Su una colonna vuota va solo un re (anche con le carte che ha sopra).',
      'Quando l\'ultima carta di una colonna è coperta, si gira da sola.',
      'Pesca 1: tocca il tallone per scoprire una carta alla volta sugli scarti; si può giocare solo la carta in cima agli scarti. Finito il tallone, toccalo di nuovo per rigirare gli scarti: i giri sono illimitati.',
      'Le carte si spostano trascinandole (col mouse o col dito) oppure toccando la carta e poi il posto dove metterla. Doppio clic (o doppio tocco) su una carta la manda sulla sua base, se può andarci. Dalle basi si può riprendere una carta per rimetterla in una colonna.',
      'Quando tutte le carte sono scoperte e il tallone è vuoto compare "Finisci": le carte salgono sulle basi da sole.',
      'In gara tutti hanno la stessa identica distribuzione, ognuno sul suo tavolo, e si gioca tutti insieme. Vince il primo che mette tutte le 52 carte sulle basi: in quel momento la partita finisce per tutti.',
      'Se ti blocchi puoi arrenderti. Se si arrendono tutti (o scade il tempo, se è stato scelto un limite di 10, 20 o 30 minuti) vince chi ha più carte sulle basi; a parità è pareggio. In alto vedi quante carte hanno messo sulle basi gli altri.',
      'Si può giocare anche da soli, per il proprio tempo migliore: da soli la partita si ferma quando apri le dispense; in gara il tempo corre per tutti. Non tutte le distribuzioni si possono risolvere.',
      'Il computer non gioca: è una gara solo tra amici.',
    ],
  },
  crea: (o) => new Solitario(o),
  bot: () => ({ tipo: 'arrenditi' }),
  _test: { Solitario, distribuzione, puoSuBase, puoSuColonna, mazzo52, suggerisci, consiglioWin },
};
