// UOMO NERO: mazzo francese senza il fante di fiori, così il fante di picche (l'uomo nero) resta senza compagno.
// Si distribuiscono tutte le carte; le coppie (stesso valore e stesso colore) si scartano da sole. A turno si pesca
// una carta coperta dalla mano del giocatore a sinistra: se fa coppia si scarta. Chi resta senza carte è salvo;
// chi resta con l'uomo nero perde la mano. Si giocano 1, 3 o 5 mani: vince chi ha preso meno volte l'uomo nero.
// La posizione delle carte in mano conta: chi pesca vede solo i dorsi, nell'ordine di chi le tiene, che può mescolarle.
const { mescola } = require('../giochi/carte');

const SEMI = ['c', 'q', 'f', 'p'];
const UOMO = '11p';
const colore = (c) => (c.seme === 'c' || c.seme === 'q' ? 'r' : 'n');
const chiave = (c) => `${c.rango}${colore(c)}`; // due carte fanno coppia se hanno la stessa chiave

function mazzo(corto) {
  const m = [];
  for (const s of SEMI) for (let r = 1; r <= 13; r++) {
    if (corto && r >= 2 && r <= 6) continue;
    if (r === 11 && s === 'f') continue; // il fante di fiori si toglie
    m.push({ id: `${r}${s}`, rango: r, seme: s });
  }
  return m;
}
// toglie le coppie da una mano (tenendo l'ordine delle carte che restano); restituisce le coppie tolte
function togliCoppie(mano) {
  const coppie = [];
  for (let i = 0; i < mano.length; i++) {
    const j = mano.findIndex((c, k) => k > i && chiave(c) === chiave(mano[i]));
    if (j >= 0) { coppie.push([mano[i], mano[j]]); mano.splice(j, 1); mano.splice(i, 1); i--; }
  }
  return coppie;
}

class UomoNero {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'uomonero';
    this.n = n;
    this.corto = opzioni.mazzo === 'corto';
    this.nMani = [1, 3, 5].includes(Number(opzioni.mani)) ? Number(opzioni.mani) : 3;
    this.perse = new Array(n).fill(0);   // quante volte ognuno è rimasto con l'uomo nero
    this.salvi = new Array(n).fill(0);   // punti di piazzamento (chi esce prima ne prende di più)
    this.mano = 0;
    this.primo = primo;
    this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inAttesa = false; this.pausaMs = 0;
    this.nuovaMano();
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovaMano() {
    this.mano++;
    const m = mescola(mazzo(this.corto));
    this.mani = Array.from({ length: this.n }, () => []);
    const da = (this.primo + this.mano - 1) % this.n;
    m.forEach((c, i) => this.mani[(da + i) % this.n].push(c));
    this.scarti = []; // coppie scartate, in ordine
    for (let i = 0; i < this.n; i++) for (const cp of togliCoppie(this.mani[i])) this.scarti.push({ posto: i, carte: cp });
    this.uscita = [];             // posti in ordine di uscita
    this.riordini = new Array(this.n).fill(0); // quante volte ognuno ha mescolato o spostato le sue carte (lo vedono tutti)
    this.passaggi = [];           // { da, a, ordine }: chi ha passato l'uomo nero a chi (lo sanno solo loro due)
    this.ultima = null;           // ultima pescata: { chi, da, indice, coppia }
    this.nPescate = 0;
    this.scelte = Array.from({ length: this.n }, () => []); // posizioni scelte da ognuno (da 0 a 1), per il computer
    this.fase = 'gioco';
    this.riepilogo = null;
    this.controllaUsciti(null);
    this.turno = this.prossimoAttivo(da - 1);
    if (this.turno != null && this.daChi(this.turno) == null) this.chiudiMano();
  }

  attivi() { return this.mani.map((m, i) => (m.length ? i : -1)).filter((i) => i >= 0); }
  prossimoAttivo(da) { for (let k = 1; k <= this.n; k++) { const i = (da + k + this.n) % this.n; if (this.mani[i].length) return i; } return null; }
  // si pesca dal primo giocatore ancora in gioco a sinistra
  daChi(p) { const i = this.prossimoAttivo(p); return i === p ? null : i; }

  controllaUsciti(pescatore) {
    for (let i = 0; i < this.n; i++) {
      if (!this.mani[i].length && !this.uscita.includes(i)) {
        this.uscita.push(i);
        if (this.mano > 0 && this.nPescate) this.annuncia(i, 'è salvo!', 'sei salvo! 🎉');
      }
    }
    void pescatore;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (this.fase !== 'gioco') return { errore: 'Aspetta la prossima mano' };
    if (a.tipo === 'mescola') {
      if (this.mani[p].length < 2) return { errore: 'Non hai carte da mescolare' };
      mescola(this.mani[p]); this.riordini[p]++;
      return { ok: true };
    }
    if (a.tipo === 'scambia') { // sposta una carta della propria mano al posto di un'altra
      const m = this.mani[p], i = Number(a.da), j = Number(a.a);
      if (![i, j].every((x) => Number.isInteger(x) && x >= 0 && x < m.length) || i === j) return { errore: 'Carte non valide' };
      [m[i], m[j]] = [m[j], m[i]]; this.riordini[p]++;
      return { ok: true };
    }
    if (a.tipo !== 'pesca') return { errore: 'Mossa non valida' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    const da = this.daChi(p);
    const mano = this.mani[da];
    const k = Number(a.indice);
    if (!Number.isInteger(k) || k < 0 || k >= mano.length) return { errore: 'Scegli una delle sue carte' };
    if (mano.length > 1) this.scelte[p].push(k / (mano.length - 1));
    const [carta] = mano.splice(k, 1);
    const mia = this.mani[p];
    const j = mia.findIndex((c) => chiave(c) === chiave(carta));
    let coppia = null;
    if (j >= 0) { coppia = [mia[j], carta]; mia.splice(j, 1); this.scarti.push({ posto: p, carte: coppia }); }
    else {
      mia.push(carta);
      if (carta.id === UOMO) this.passaggi.push({ da, a: p, ordine: this.riordini[p] });
    }
    if (a.mescola && mia.length > 1) { mescola(mia); this.riordini[p]++; }
    // dove mettere l'uomo nero, se lo si ha (da 0 = prima carta a 1 = ultima)
    const u = mia.findIndex((c) => c.id === UOMO), f = Number(a.uomo);
    if (a.uomo != null && u >= 0 && mia.length > 1 && f >= 0 && f <= 1) { const [x] = mia.splice(u, 1); mia.splice(Math.round(f * (mia.length)), 0, x); this.riordini[p]++; }
    this.nPescate++;
    this.ultima = { chi: p, da, indice: k, n: mano.length + 1, coppia: !!coppia, nPesca: this.nPescate, carta: carta.id };
    this.controllaUsciti(p);
    const rimasti = this.attivi();
    if (rimasti.length <= 1) return this.chiudiMano();
    // tocca a quello a cui si è appena pescato (se ha ancora carte), altrimenti al prossimo
    this.turno = this.mani[da].length ? da : this.prossimoAttivo(p);
    return { ok: true };
  }

  // il trucco segreto (!win): al suo turno sa quale carta pescare (una che fa coppia) e dov'è l'uomo nero
  suggerimentoWin(p) {
    if (this.fase !== 'gioco' || this.turno !== p || this.finita) return null;
    const da = this.daChi(p);
    if (da == null) return null;
    const sua = this.mani[da], mia = this.mani[p];
    const n = (i) => `la ${i + 1}ª da sinistra`;
    const u = sua.findIndex((c) => c.id === UOMO);
    const buona = sua.findIndex((c) => mia.some((x) => chiave(x) === chiave(c)));
    const pezzi = [];
    if (buona >= 0) pezzi.push(`pesca ${n(buona)}: fa coppia`);
    if (u >= 0) pezzi.push(`l'uomo nero è ${n(u)}`);
    if (!pezzi.length) pezzi.push('nessuna fa coppia, ma l\'uomo nero non c\'è: pesca tranquillo');
    const t = pezzi.join(' · ');
    return `💡 ${t[0].toUpperCase()}${t.slice(1)}`;
  }

  chiudiMano() {
    const rimasti = this.attivi();
    const perdente = rimasti.length ? rimasti[0] : this.mani.findIndex((m) => m.some((c) => c.id === UOMO));
    if (perdente >= 0) this.perse[perdente]++;
    // punti di piazzamento: chi esce per primo prende n-1, … , chi resta con l'uomo nero 0
    this.uscita.forEach((i, k) => { this.salvi[i] += this.n - 1 - k; });
    this.riepilogo = { mano: this.mano, perdente, uscita: this.uscita.slice(), perse: this.perse.slice() };
    if (perdente >= 0) this.annuncia(perdente, 'resta con l\'uomo nero! 🕴️', 'sei rimasto con l\'uomo nero! 🕴️', true);
    this.turno = null;
    if (this.mano >= this.nMani) return this.fine();
    this.fase = 'riepilogo';
    this.inAttesa = true;
    this.pausaMs = 5000;
    return { ok: true };
  }
  avanza() { if (this.fase === 'riepilogo') { this.inAttesa = false; this.nuovaMano(); } }

  fine() {
    this.finita = true;
    this.fase = 'fine';
    this.inAttesa = false;
    const min = Math.min(...this.perse);
    const vincitori = this.perse.map((x, i) => (x === min ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.perse.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'volte uomo nero', crescente: true,
      pareggio: vincitori.length === this.n, vincitori: vincitori.length === this.n ? [] : vincitori,
    };
    return { ok: true };
  }

  vista(p) {
    const da = this.turno != null ? this.daChi(this.turno) : null;
    const u = this.ultima;
    return {
      gioco: this.id, n: this.n, mano: this.mano, nMani: this.nMani, fase: this.fase,
      mia: this.mani[p] || [],
      carteInMano: this.mani.map((m) => m.length),
      daChi: da,
      // l'ultima pescata: la carta la vedono solo chi l'ha pescata e chi l'aveva
      ultima: u ? { chi: u.chi, da: u.da, indice: u.indice, n: u.n, coppia: u.coppia, nPesca: u.nPesca, carta: p === u.chi || p === u.da || u.coppia ? u.carta : null } : null,
      scarti: this.scarti.slice(-6), nScarti: this.scarti.length,
      uscita: this.uscita, perse: this.perse, riordini: this.riordini,
      ioHoUomo: (this.mani[p] || []).some((c) => c.id === UOMO),
      corto: this.corto, riepilogo: this.riepilogo,
      turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// =================== COMPUTER ===================
// Quale dorso pescare. Il facile pesca a caso. Il medio a caso, ma se l'uomo nero l'ha appena passato lui stesso
// sa che è finito in fondo alla mano dell'altro (se non l'ha mescolata) e lo evita. Il difficile in più, quando
// tiene l'uomo nero, lo mette dove chi pesca da lui ha scelto di meno finora.
function dove(g, p, livello) {
  const da = g.daChi(p);
  const n = g.mani[da].length;
  if (livello === 'facile' || n === 1) return Math.floor(Math.random() * n);
  // so dove sta l'uomo nero? (l'ho passato io a "da", e lui non ha più toccato l'ordine delle sue carte)
  const pass = [...g.passaggi].reverse().find((x) => x.a === da);
  if (pass && pass.da === p && pass.ordine === g.riordini[da]) {
    const i = g.mani[da].findIndex((c) => c.id === UOMO);
    if (i >= 0) {
      const altre = [...Array(n).keys()].filter((k) => k !== i);
      return altre[Math.floor(Math.random() * altre.length)];
    }
  }
  return Math.floor(Math.random() * n);
}
// il difficile che tiene l'uomo nero lo mette nella posizione (da 0 a 1) che chi pesca da lui sceglie più spesso
function posizioneTrappola(g, p) {
  let chi = null; // chi pescherà da me: il primo ancora in gioco alla mia destra
  for (let k = 1; k < g.n; k++) { const x = (p - k + g.n) % g.n; if (g.mani[x].length) { chi = x; break; } }
  const storia = chi != null && chi !== p ? g.scelte[chi].slice(-20) : [];
  if (storia.length < 4) return null;
  const conta = new Array(5).fill(0); // cinque fasce: inizio, …, fondo
  for (const f of storia) conta[Math.round(f * 4)]++;
  return conta.indexOf(Math.max(...conta)) / 4;
}

function bot(g, p, livello) {
  if (g.turno !== p) return { tipo: 'mescola' };
  const az = { tipo: 'pesca', indice: dove(g, p, livello) };
  // medio e difficile mescolano dopo aver pescato, così chi pesca da loro non sa dove sia l'uomo nero
  if (livello !== 'facile') az.mescola = true;
  if (livello === 'difficile') { const f = posizioneTrappola(g, p); if (f != null) az.uomo = f; }
  return az;
}

module.exports = {
  meta: {
    id: 'uomonero',
    nome: 'Uomo nero',
    tipo: 'carte',
    giocatori: [3, 4, 5, 6],
    descrizione: 'Pesca a turno una carta coperta dal vicino e scarta le coppie: chi resta con il fante di picche, l\'uomo nero, perde.',
    alias: ['uomo nero', 'old maid', 'asino', 'fante di picche', 'pesca la coppia', 'cucco'],
    opzioni: [
      { id: 'mani', nome: 'Mani', valori: [3, 1, 5], etichette: ['3 mani', '1 mano', '5 mani'], predefinito: 3 },
      { id: 'mazzo', nome: 'Mazzo', valori: ['completo', 'corto'], etichette: ['Completo (51 carte)', 'Corto (31 carte, dal 7 al re più gli assi)'], predefinito: 'completo' },
    ],
    regole: [
      'Si gioca con il mazzo francese da cui si toglie il fante di fiori: così il FANTE DI PICCHE, l\'uomo nero, resta l\'unica carta senza compagno. Con il mazzo corto si tolgono anche le carte dal 2 al 6.',
      'Si distribuiscono tutte le carte (qualcuno ne ha una in più). Due carte fanno coppia se hanno lo stesso valore e lo stesso colore (per esempio il 7 di cuori e il 7 di quadri, o il re di fiori e il re di picche). Le coppie si scartano da sole, subito.',
      'A turno peschi una carta coperta dalla mano del giocatore alla tua sinistra (il primo che ha ancora carte): vedi solo i dorsi, nell\'ordine in cui lui li tiene. Se la carta fa coppia con una delle tue, la coppia si scarta; altrimenti la tieni. Poi tocca a quello da cui hai pescato.',
      'Chi resta senza carte è salvo ed esce dal giro. Alla fine resta un solo giocatore, con l\'uomo nero in mano: ha perso la mano.',
      'Le tue carte le puoi mescolare (🔀) o spostare quando vuoi (tocca una carta e poi il posto dove metterla): chi pesca da te vede solo i dorsi. La carta pescata entra in fondo alla tua mano.',
      'Si giocano 3 mani (oppure 1 o 5): vince chi è rimasto meno volte con l\'uomo nero.',
      'Il computer facile pesca a caso e non mescola mai le sue carte; il medio mescola dopo ogni pescata e si ricorda dove è finito l\'uomo nero che ha appena passato; il difficile in più nasconde l\'uomo nero proprio dove chi pesca da lui sceglie più spesso.',
    ],
  },
  crea: (o) => new UomoNero(o),
  bot,
  _test: { mazzo, togliCoppie, chiave, dove, posizioneTrappola, UOMO },
};
