// CONQUISTA DEL MONDO: il classico gioco di conquista con i dadi, in versione semplificata e più veloce. La mappa ha 24
// territori in 6 continenti. All'inizio i territori sono distribuiti a caso, con le armate. A ogni turno: 1) RINFORZI
// (un'armata ogni 3 territori, almeno 3, più il bonus dei continenti interi; con 3 carte se ne prendono altre 8);
// 2) ATTACCHI dai propri territori con almeno 2 armate verso quelli nemici confinanti: l'attaccante tira fino a 3
// dadi, il difensore fino a 3; si confrontano i dadi più alti a coppie e a parità vince il difensore; chi conquista
// sposta dentro le armate; 3) uno SPOSTAMENTO tra propri territori collegati. Chi ha conquistato almeno un territorio
// nel turno prende una carta. Vince chi raggiunge l'obiettivo (conquistare 16 territori, o tutto il mondo).
const PAUSA = process.env.TEST_VELOCE ? 1 : 0;
void PAUSA;

const CONTINENTI = {
  na: { nome: 'America del Nord', bonus: 3 }, sa: { nome: 'America del Sud', bonus: 2 }, eu: { nome: 'Europa', bonus: 4 },
  af: { nome: 'Africa', bonus: 2 }, as: { nome: 'Asia', bonus: 5 }, oc: { nome: 'Oceania', bonus: 1 },
};
// territori: nome, continente, posizione sulla mappa (0-1000 × 0-560), confini
const T = [
  ['Alaska', 'na', 70, 110], ['Canada', 'na', 200, 95], ['Groenlandia', 'na', 345, 55], ['Stati Uniti', 'na', 185, 210], ['Messico', 'na', 165, 300],
  ['Venezuela', 'sa', 255, 345], ['Brasile', 'sa', 320, 420], ['Argentina', 'sa', 270, 500],
  ['Gran Bretagna', 'eu', 440, 140], ['Scandinavia', 'eu', 510, 85], ['Europa occidentale', 'eu', 455, 230], ['Europa centrale', 'eu', 530, 180], ['Europa orientale', 'eu', 610, 140],
  ['Nord Africa', 'af', 480, 320], ['Egitto', 'af', 575, 290], ['Africa centrale', 'af', 545, 395], ['Sudafrica', 'af', 560, 490],
  ['Russia', 'as', 760, 105], ['Medio Oriente', 'as', 660, 255], ['India', 'as', 755, 300], ['Cina', 'as', 830, 215], ['Giappone', 'as', 935, 170],
  ['Indonesia', 'oc', 855, 380], ['Australia', 'oc', 920, 470],
].map(([nome, cont, x, y], i) => ({ i, nome, cont, x, y }));
const id = Object.fromEntries(T.map((t) => [t.nome, t.i]));
const CONFINI = [
  ['Alaska', 'Canada'], ['Alaska', 'Russia'], ['Canada', 'Stati Uniti'], ['Canada', 'Groenlandia'], ['Groenlandia', 'Scandinavia'], ['Groenlandia', 'Gran Bretagna'],
  ['Stati Uniti', 'Messico'], ['Messico', 'Venezuela'], ['Venezuela', 'Brasile'], ['Venezuela', 'Argentina'], ['Brasile', 'Argentina'], ['Brasile', 'Nord Africa'],
  ['Gran Bretagna', 'Scandinavia'], ['Gran Bretagna', 'Europa occidentale'], ['Gran Bretagna', 'Europa centrale'], ['Scandinavia', 'Europa centrale'], ['Scandinavia', 'Europa orientale'],
  ['Europa occidentale', 'Europa centrale'], ['Europa occidentale', 'Nord Africa'], ['Europa centrale', 'Europa orientale'], ['Europa centrale', 'Nord Africa'], ['Europa centrale', 'Egitto'],
  ['Europa orientale', 'Russia'], ['Europa orientale', 'Medio Oriente'], ['Nord Africa', 'Egitto'], ['Nord Africa', 'Africa centrale'], ['Egitto', 'Africa centrale'], ['Egitto', 'Medio Oriente'],
  ['Africa centrale', 'Sudafrica'], ['Russia', 'Medio Oriente'], ['Russia', 'Cina'], ['Russia', 'Giappone'], ['Medio Oriente', 'India'], ['India', 'Cina'], ['India', 'Indonesia'],
  ['Cina', 'Giappone'], ['Cina', 'Indonesia'], ['Indonesia', 'Australia'],
].map(([a, b]) => [id[a], id[b]]);
const VICINI = T.map((t) => CONFINI.filter((c) => c.includes(t.i)).map((c) => (c[0] === t.i ? c[1] : c[0])));
const NT = T.length;
const ARMATE_INIZIALI = { 2: 26, 3: 22, 4: 18, 5: 16 };
const BONUS_CARTE = 8;

const dado = () => 1 + Math.floor(Math.random() * 6);
// una battaglia: dadi dell'attaccante (fino a 3, ma lascia sempre un'armata) e del difensore (fino a 3)
function battaglia(attA, difA) {
  const nA = Math.min(3, attA - 1), nD = Math.min(3, difA);
  const a = Array.from({ length: nA }, dado).sort((x, y) => y - x), d = Array.from({ length: nD }, dado).sort((x, y) => y - x);
  let perseA = 0, perseD = 0;
  for (let k = 0; k < Math.min(nA, nD); k++) if (a[k] > d[k]) perseD++; else perseA++;
  return { a, d, perseA, perseD };
}

class Conquista {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'conquista';
    this.n = n;
    this.obiettivo = opzioni.obiettivo === 'mondo' ? 'mondo' : 'sedici';
    this.soglia = this.obiettivo === 'mondo' ? NT : 16;
    // territori a caso, poi le armate iniziali sparse a caso sui propri territori
    const ordine = T.map((t) => t.i).sort(() => Math.random() - 0.5);
    this.padrone = new Array(NT).fill(-1);
    ordine.forEach((t, k) => { this.padrone[t] = (primo + k) % n; });
    this.armate = new Array(NT).fill(1);
    for (let p = 0; p < n; p++) {
      const miei = this.territori(p);
      for (let k = miei.length; k < ARMATE_INIZIALI[n]; k++) this.armate[miei[Math.floor(Math.random() * miei.length)]]++;
    }
    this.carte = new Array(n).fill(0);
    this.fuori = [];
    this.nTurno = 0; this.giro = 1;
    this.nEv = 0; this.evento = null; this.finita = false; this.risultato = null;
    this.turno = primo;
    this.iniziaTurno(primo);
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  territori(p) { return this.padrone.map((x, i) => (x === p ? i : -1)).filter((i) => i >= 0); }
  vivo(p) { return this.padrone.includes(p); }
  rinforziDi(p) {
    const t = this.territori(p);
    let r = Math.max(3, Math.floor(t.length / 3));
    for (const [k, c] of Object.entries(CONTINENTI)) if (T.every((x) => x.cont !== k || this.padrone[x.i] === p)) r += c.bonus;
    return r;
  }
  iniziaTurno(p) {
    this.turno = p; this.nTurno++;
    this.fase = 'rinforzi';
    this.daPiazzare = this.rinforziDi(p);
    this.conquistato = false; this.attacco = null; this.occupa = null; this.inAttesa = false;
  }
  prossimo() {
    let q = this.turno;
    for (let k = 0; k < this.n; k++) { q = (q + 1) % this.n; if (this.vivo(q)) break; }
    if (q <= this.turno) this.giro++;
    this.iniziaTurno(q);
  }
  // territori raggiungibili da a passando solo dai propri
  collegati(p, a) {
    const vis = new Set([a]), coda = [a];
    for (let k = 0; k < coda.length; k++) for (const j of VICINI[coda[k]]) if (!vis.has(j) && this.padrone[j] === p) { vis.add(j); coda.push(j); }
    vis.delete(a);
    return [...vis];
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    const terr = (x) => (Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) < NT ? Number(x) : null);
    if (this.fase === 'rinforzi') {
      if (a.tipo === 'carte') {
        if (this.carte[p] < 3) return { errore: 'Servono 3 carte' };
        this.carte[p] -= 3; this.daPiazzare += BONUS_CARTE;
        this.annuncia(p, `gioca 3 carte: +${BONUS_CARTE} armate`, `+${BONUS_CARTE} armate con le carte`);
        return { ok: true };
      }
      if (a.tipo !== 'metti') return { errore: 'Prima metti i rinforzi' };
      const t = terr(a.t), q = Math.max(1, Math.min(this.daPiazzare, Math.floor(Number(a.quanti) || 1)));
      if (t == null || this.padrone[t] !== p) return { errore: 'Metti i rinforzi su un tuo territorio' };
      this.armate[t] += q; this.daPiazzare -= q;
      if (!this.daPiazzare) this.fase = 'attacco';
      return { ok: true };
    }
    if (this.fase === 'occupa') {
      if (a.tipo !== 'occupa') return { errore: 'Scegli quante armate entrano nel territorio conquistato' };
      const { da, a: dove, min } = this.occupa, max = this.armate[da] - 1;
      const q = Math.max(min, Math.min(max, Math.floor(Number(a.quanti) || min)));
      this.armate[da] -= q; this.armate[dove] = q;
      this.occupa = null; this.fase = 'attacco';
      return { ok: true };
    }
    if (this.fase === 'attacco') {
      if (a.tipo === 'fineAttacchi') { this.fase = 'spostamento'; this.attacco = null; return { ok: true }; }
      if (a.tipo !== 'attacca') return { errore: 'Mossa non valida' };
      const da = terr(a.da), dove = terr(a.a);
      if (da == null || dove == null || this.padrone[da] !== p) return { errore: 'Attacca da un tuo territorio' };
      if (this.padrone[dove] === p) return { errore: 'Quel territorio è già tuo' };
      if (!VICINI[da].includes(dove)) return { errore: 'Si attaccano solo i territori confinanti' };
      if (this.armate[da] < 2) return { errore: 'Servono almeno 2 armate per attaccare' };
      const dif = this.padrone[dove];
      const tiri = [];
      let r;
      do { r = battaglia(this.armate[da], this.armate[dove]); this.armate[da] -= r.perseA; this.armate[dove] -= r.perseD; tiri.push(r); } while (a.fino && this.armate[dove] > 0 && this.armate[da] > 1);
      const perseA = tiri.reduce((s, x) => s + x.perseA, 0), perseD = tiri.reduce((s, x) => s + x.perseD, 0);
      this.attacco = { da, a: dove, dif, ultimo: r, tiri: tiri.length, perseA, perseD, conquistato: this.armate[dove] === 0 };
      if (this.armate[dove] === 0) {
        this.padrone[dove] = p; this.conquistato = true;
        const min = Math.min(r.a.length, this.armate[da] - 1);
        this.annuncia(p, `conquista ${T[dove].nome}!`, `conquisti ${T[dove].nome}!`, true);
        if (!this.vivo(dif)) {
          this.fuori.push(dif); this.carte[p] += this.carte[dif]; this.carte[dif] = 0;
          this.annuncia(p, `conquista ${T[dove].nome} ed elimina un avversario!`, `conquisti ${T[dove].nome}: avversario eliminato!`, true);
        }
        const fine = this.territori(p).length >= this.soglia || this.fuori.length === this.n - 1;
        if (!fine && this.armate[da] - 1 > min) { this.occupa = { da, a: dove, min }; this.fase = 'occupa'; } else { this.armate[da] -= Math.max(1, min); this.armate[dove] = Math.max(1, min); }
        if (fine) return this.chiudi(p);
      }
      return { ok: true };
    }
    if (this.fase === 'spostamento') {
      if (a.tipo === 'sposta') {
        const da = terr(a.da), dove = terr(a.a), q = Math.floor(Number(a.quanti));
        if (da == null || dove == null || this.padrone[da] !== p || this.padrone[dove] !== p) return { errore: 'Sposta tra due tuoi territori' };
        if (!this.collegati(p, da).includes(dove)) return { errore: 'I territori devono essere collegati da tuoi territori' };
        if (!(q >= 1 && q <= this.armate[da] - 1)) return { errore: 'Devi lasciare almeno un\'armata' };
        this.armate[da] -= q; this.armate[dove] += q;
      } else if (a.tipo !== 'fine') return { errore: 'Mossa non valida' };
      if (this.conquistato) { this.carte[p]++; this.annuncia(p, 'prende una carta', 'prendi una carta'); }
      this.prossimo();
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }
  chiudi(v) {
    this.finita = true; this.turno = null;
    this.annuncia(v, this.obiettivo === 'mondo' ? 'conquista il mondo!' : `raggiunge ${this.soglia} territori e vince!`, 'hai vinto la conquista!', true);
    this.risultato = { fazioni: Array.from({ length: this.n }, (_, p) => ({ posti: [p], punti: this.territori(p).length })), etichetta: 'territori', pareggio: false, vincitori: [v] };
    return { ok: true };
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, padrone: this.padrone, armate: this.armate, carte: this.carte, fuori: this.fuori,
      fase: this.fase, daPiazzare: this.daPiazzare, attacco: this.attacco, occupa: this.occupa, soglia: this.soglia, obiettivo: this.obiettivo,
      territoriPer: Array.from({ length: this.n }, (_, q) => this.territori(q).length), rinforziPer: Array.from({ length: this.n }, (_, q) => (this.vivo(q) ? this.rinforziDi(q) : 0)),
      collegati: this.turno === p && this.fase === 'spostamento' ? Object.fromEntries(this.territori(p).filter((t) => this.armate[t] > 1).map((t) => [t, this.collegati(p, t)])) : null,
      giro: this.giro, turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// probabilità di conquistare con A armate in attacco contro D in difesa (attaccando fino in fondo): si calcola una
// volta con la programmazione dinamica sugli esiti di un tiro (per 1-3 dadi contro 1-3 dadi, a parità vince la difesa)
const ESITI = {};
function esiti(nA, nD) {
  const k = `${nA}${nD}`;
  if (ESITI[k]) return ESITI[k];
  const conta = {}; let tot = 0;
  const rec = (a, d) => {
    if (a.length < nA) { for (let v = 1; v <= 6; v++) rec([...a, v], d); return; }
    if (d.length < nD) { for (let v = 1; v <= 6; v++) rec(a, [...d, v]); return; }
    const A = a.slice().sort((x, y) => y - x), Dd = d.slice().sort((x, y) => y - x);
    let pa = 0, pd = 0; for (let i = 0; i < Math.min(nA, nD); i++) if (A[i] > Dd[i]) pd++; else pa++;
    conta[`${pa},${pd}`] = (conta[`${pa},${pd}`] || 0) + 1; tot++;
  };
  rec([], []);
  return (ESITI[k] = Object.entries(conta).map(([x, c]) => { const [pa, pd] = x.split(',').map(Number); return { pa, pd, p: c / tot }; }));
}
const PROB = new Map();
function probVittoria(A, D) {
  if (D <= 0) return 1; if (A <= 1) return 0;
  A = Math.min(A, 40); D = Math.min(D, 40);
  const k = A * 100 + D;
  if (PROB.has(k)) return PROB.get(k);
  let p = 0;
  for (const e of esiti(Math.min(3, A - 1), Math.min(3, D))) p += e.p * probVittoria(A - e.pa, D - e.pd);
  PROB.set(k, p);
  return p;
}

// valore di una serie di attacchi da t con a armate: a ogni passo il vicino nemico più debole (preferendo quelli del
// continente che si sta completando), finché la probabilità di vittoria resta alta
function spazzata(g, p, t, a) {
  const presi = new Set();
  let val = 0, qui = t, prob = 1;
  for (let passo = 0; passo < 8 && a > 2; passo++) {
    let best = -1, bv = -Infinity;
    for (const j of VICINI[qui]) {
      if (g.padrone[j] === p || presi.has(j)) continue;
      const v = -g.armate[j] + (T[j].cont === T[t].cont ? 0.5 : 0);
      if (v > bv) { bv = v; best = j; }
    }
    if (best < 0) break;
    const pv = probVittoria(a, g.armate[best]);
    prob *= pv;
    if (prob < 0.35) break;
    a -= Math.round(g.armate[best] * 0.9 + 1);
    presi.add(best);
    val += prob;
    const cont = T[best].cont;
    if (T.every((x) => x.cont !== cont || presi.has(x.i) || g.padrone[x.i] === p)) val += CONTINENTI[cont].bonus * 0.6 * prob;
    qui = best;
  }
  return val;
}

function bot(g, p, livello) {
  const miei = g.territori(p);
  const nemiciVicini = (t) => VICINI[t].filter((j) => g.padrone[j] !== p);
  const minaccia = (t) => nemiciVicini(t).reduce((s, j) => s + g.armate[j], 0);
  // continente preferito: quello di cui ha la quota più alta
  const quota = (k) => { const tt = T.filter((x) => x.cont === k); return tt.filter((x) => g.padrone[x.i] === p).length / tt.length; };
  const contMeta = Object.keys(CONTINENTI).sort((a, b) => quota(b) - quota(a))[0];
  if (g.fase === 'rinforzi') {
    if (g.carte[p] >= 3) return { tipo: 'carte' };
    const confine = miei.filter((t) => nemiciVicini(t).length);
    if (livello === 'facile') return { tipo: 'metti', t: (confine.length ? confine : miei)[Math.floor(Math.random() * (confine.length || miei.length))], quanti: g.daPiazzare };
    // dove serve di più: territorio di confine nel continente preferito, con un bersaglio debole vicino, o il più minacciato
    let meglio = confine[0] ?? miei[0], v = -Infinity;
    if (livello === 'difficile') {
      // tutto dove si può fare la "spazzata" più lunga: quanti territori nemici in fila si conquistano con buone
      // probabilità partendo da lì con i rinforzi, contando i continenti che si completano
      for (const t of confine) {
        const val = spazzata(g, p, t, g.armate[t] + g.daPiazzare) + (T[t].cont === contMeta ? 0.5 : 0) + minaccia(t) * 0.02 + Math.random() * 0.1;
        if (val > v) { v = val; meglio = t; }
      }
      return { tipo: 'metti', t: meglio, quanti: g.daPiazzare };
    }
    for (const t of confine) {
      const deboli = nemiciVicini(t).map((j) => g.armate[t] - g.armate[j]);
      const val = (T[t].cont === contMeta ? 4 : 0) + Math.max(...deboli) * 0.3 + minaccia(t) * (livello === 'difficile' ? 0.25 : 0.1) + Math.random();
      if (val > v) { v = val; meglio = t; }
    }
    return { tipo: 'metti', t: meglio, quanti: g.daPiazzare };
  }
  if (g.fase === 'occupa') {
    const { da, a: dove, min } = g.occupa, max = g.armate[da] - 1;
    // tante armate dove c'è ancora da combattere
    const avantiNemici = nemiciVicini(dove).length, dietroNemici = VICINI[da].filter((j) => j !== dove && g.padrone[j] !== p).length;
    const q = dietroNemici && !avantiNemici ? min : !dietroNemici ? max : Math.max(min, Math.ceil(max * 0.7));
    return { tipo: 'occupa', quanti: q };
  }
  if (g.fase === 'attacco') {
    const soglia = { facile: 0.35, medio: 0.55, difficile: 0.45 }[livello];
    let meglio = null, v = -Infinity;
    for (const t of miei) {
      if (g.armate[t] < 2) continue;
      for (const j of nemiciVicini(t)) {
        const pv = livello === 'facile' ? (g.armate[t] > g.armate[j] ? 0.7 : 0.3) : probVittoria(g.armate[t], g.armate[j]);
        if (pv < soglia) continue;
        let val = pv * 3;
        if (T[j].cont === contMeta) val += 1.5;
        // completa un continente?
        const cont = T[j].cont;
        if (T.every((x) => x.cont !== cont || x.i === j || g.padrone[x.i] === p)) val += CONTINENTI[cont].bonus;
        // elimina un giocatore?
        if (g.territori(g.padrone[j]).length === 1) val += 4;
        if (livello === 'difficile' && !g.conquistato) val += 1; // la carta del turno
        val += Math.random() * 0.5;
        if (val > v) { v = val; meglio = { da: t, a: j }; }
      }
    }
    if (meglio && (livello !== 'facile' || Math.random() < 0.85)) return { tipo: 'attacca', da: meglio.da, a: meglio.a, fino: true };
    return { tipo: 'fineAttacchi' };
  }
  if (g.fase === 'spostamento') {
    if (livello === 'facile') return { tipo: 'fine' };
    // le armate dei territori interni vanno al confine più minacciato raggiungibile
    let meglio = null, v = 0;
    for (const t of miei) {
      if (g.armate[t] < 2 || nemiciVicini(t).length) continue;
      for (const j of g.collegati(p, t)) { const m = minaccia(j); if (nemiciVicini(j).length && m + g.armate[t] > v) { v = m + g.armate[t]; meglio = { da: t, a: j, quanti: g.armate[t] - 1 }; } }
    }
    return meglio ? { tipo: 'sposta', ...meglio } : { tipo: 'fine' };
  }
  return { tipo: 'fine' };
}

module.exports = {
  meta: {
    id: 'conquista',
    nome: 'Conquista del mondo',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5],
    descrizione: 'Il gioco di conquista con i dadi, semplificato: 24 territori in 6 continenti, rinforzi, attacchi, spostamenti. Conquista 16 territori (o tutto il mondo).',
    alias: ['conquista del mondo', 'conquista', 'guerra mondiale', 'territori', 'armate', 'carri armati', 'gioco di conquista', 'strategia con i dadi'],
    opzioni: [
      { id: 'obiettivo', nome: 'Obiettivo', valori: ['sedici', 'mondo'], etichette: ['Conquistare 16 territori (più veloce)', 'Conquistare tutto il mondo'], predefinito: 'sedici' },
    ],
    regole: [
      'La mappa ha 24 territori in 6 continenti. All\'inizio i territori sono distribuiti a caso tra i giocatori, con le armate già sparse sopra.',
      '1) RINFORZI: all\'inizio del turno ricevi un\'armata ogni 3 territori (almeno 3), più il bonus di ogni continente che hai tutto intero (America del Nord 3, America del Sud 2, Europa 4, Africa 2, Asia 5, Oceania 1). Con 3 carte puoi prendere altre 8 armate. Mettile sui tuoi territori.',
      '2) ATTACCHI: da un tuo territorio con almeno 2 armate puoi attaccare un territorio nemico confinante (le linee tratteggiate attraversano il mare). Tu tiri un dado per ogni armata oltre la prima (massimo 3), il difensore uno per armata (massimo 3). Si confrontano i dadi più alti a coppie: per ogni coppia perde un\'armata chi ha il dado più basso; a parità vince chi difende.',
      'Se il territorio resta senza armate è tuo: scegli quante armate spostarci (almeno quanti dadi hai tirato). Puoi attaccare quante volte vuoi, una alla volta o "fino in fondo".',
      '3) SPOSTAMENTO: alla fine puoi spostare armate da un tuo territorio a un altro collegato da tuoi territori (lasciandone almeno una). Se nel turno hai conquistato almeno un territorio prendi una carta.',
      'Chi perde tutti i territori è fuori (le sue carte vanno a chi lo ha eliminato). Vince chi arriva a 16 territori, oppure (con l\'altra opzione) chi conquista tutto il mondo.',
      'Comandi: tocca i territori sulla mappa. Nei rinforzi scegli quante armate mettere (+1, +5, tutte); negli attacchi tocca prima il tuo territorio e poi quello nemico.',
      'Il computer facile attacca alla cieca; il medio conosce le probabilità delle battaglie; il difficile punta a continenti interi, elimina chi è debole e difende i confini più minacciati.',
    ],
  },
  crea: (o) => new Conquista(o),
  bot,
  _test: { T, CONTINENTI, VICINI, CONFINI, battaglia, probVittoria, esiti, NT },
};
