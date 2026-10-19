// SNAKE in tempo reale: tutti nella stessa arena. Toccare un muro, sé stessi o un altro serpente fa morire.
// Mele e power-up; vince l'ultimo rimasto (da soli è una maratona a punti). Con il computer.
const DIR = { su: [0, -1], giu: [0, 1], sx: [-1, 0], dx: [1, 0] };
const OPPOSTA = { su: 'giu', giu: 'su', sx: 'dx', dx: 'sx' };
const POTERI = {
  oro: { nome: 'Mela d\'oro', testo: '+4 di lunghezza' },
  scudo: { nome: 'Scudo', testo: 'sopravvivi a uno scontro con un serpente (10 s)' },
  fantasma: { nome: 'Fantasma', testo: 'passi attraverso gli altri serpenti (6 s)' },
  turbo: { nome: 'Turbo', testo: 'vai al doppio della velocità (5 s)' },
};
const PASSO_MS = Number(process.env.SNAKE_PASSO_MS) || 120;
const VIA_MS = 3000;
const T = require('./trucco');
const WIN_MS = 25000; // il trucco segreto (!win): per 25 secondi il serpente scansa da solo gli ostacoli e non muore negli scontri

class Snake {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'snake';
    this.n = n;
    this.W = n <= 2 ? 30 : n <= 4 ? 38 : 46;
    this.H = Math.round(this.W * 0.65);
    this.muri = opzioni.bordi !== 'aperti';
    this.conPoteri = opzioni.poteri !== 'no';
    this.bot = bot.slice();
    this.tickMs = PASSO_MS / 2; // metà passo: serve al turbo
    this.mezzi = 0;
    this.serpenti = Array.from({ length: n }, (_, i) => this.nasci(i));
    this.cibo = [];
    this.poteri = [];
    for (let k = 0; k < Math.max(3, n + 1); k++) this.metti('mela');
    this.via = Date.now() + VIA_MS;
    this.morti = [];
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(posto, livello) { this.bot[posto] = livello; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) { const d = Date.now() - this.pausaDal; this.via += d; for (const s of this.serpenti) for (const k of ['scudo', 'fantasma', 'turbo']) if (s[k]) s[k] += d; }
    this.inPausa = si;
  }

  nasci(i) {
    // partenze distribuite lungo il bordo, rivolte verso il centro
    const ang = (i / this.n) * Math.PI * 2;
    const x = Math.round(this.W / 2 + Math.cos(ang) * this.W * 0.33), y = Math.round(this.H / 2 + Math.sin(ang) * this.H * 0.33);
    const dir = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? (Math.cos(ang) > 0 ? 'sx' : 'dx') : (Math.sin(ang) > 0 ? 'su' : 'giu');
    const [dx, dy] = DIR[dir];
    const corpo = [0, 1, 2].map((k) => [x - dx * k, y - dy * k]);
    return { corpo, dir, coda: [], cresce: 0, vivo: true, punti: 0, scudo: 0, fantasma: 0, turbo: 0 };
  }

  occupato(x, y) {
    for (const s of this.serpenti) if (s.vivo) for (const [a, b] of s.corpo) if (a === x && b === y) return true;
    return this.cibo.some((c) => c.x === x && c.y === y) || this.poteri.some((c) => c.x === x && c.y === y);
  }
  metti(tipo) {
    for (let k = 0; k < 200; k++) {
      const x = 1 + Math.floor(Math.random() * (this.W - 2)), y = 1 + Math.floor(Math.random() * (this.H - 2));
      if (this.occupato(x, y)) continue;
      if (tipo === 'mela') this.cibo.push({ x, y, valore: 1 });
      else this.poteri.push({ x, y, tipo, fino: Date.now() + 12000 });
      return;
    }
  }

  input(p, d) {
    const s = this.serpenti[p];
    if (!s || !s.vivo || !DIR[d.dir]) return;
    const ultima = s.coda.length ? s.coda[s.coda.length - 1] : s.dir;
    if (d.dir === ultima || d.dir === OPPOSTA[ultima] || s.coda.length >= 3) return;
    s.coda.push(d.dir);
  }

  // un "mezzo passo" alla volta: i serpenti col turbo si muovono a ogni mezzo passo, gli altri uno sì e uno no
  tick(ora) {
    if (this.finita || this.inPausa || ora < this.via) return false;
    this.mezzi++;
    const chi = this.serpenti.map((s, i) => (s.vivo && (s.turbo > ora || this.mezzi % 2 === 0) ? i : -1)).filter((i) => i >= 0);
    if (!chi.length) return false;
    for (const i of chi) if (this.bot[i]) { const d = pensaBot(this, i, this.bot[i]); if (d) this.input(i, { dir: d }); }
    const win = new Set(chi.filter((i) => this.conTrucco(i, ora)));
    let cambiato = false;
    // nuove teste
    const teste = new Map();
    for (const i of chi) {
      const s = this.serpenti[i];
      if (s.coda.length) s.dir = s.coda.shift();
      // col trucco: se davanti c'è un ostacolo il serpente gira all'ultimo momento verso lo spazio libero
      if (win.has(i) && this.pericolo(i)) { const d = pensaBot(this, i, 'difficile'); if (d) { s.dir = d; s.coda = []; } }
      const [dx, dy] = DIR[s.dir];
      let [x, y] = s.corpo[0];
      x += dx; y += dy;
      if (!this.muri) { x = (x + this.W) % this.W; y = (y + this.H) % this.H; }
      teste.set(i, [x, y]);
    }
    // si muovono (la coda si libera prima dei controlli)
    for (const i of chi) {
      const s = this.serpenti[i];
      s.corpo.unshift(teste.get(i));
      if (s.cresce > 0) s.cresce--; else s.corpo.pop();
    }
    // scontri
    const muoiono = [];
    for (const i of chi) {
      const s = this.serpenti[i];
      const [x, y] = s.corpo[0];
      let colpo = null;
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) colpo = 'muro';
      else {
        for (let j = 0; j < this.n && !colpo; j++) {
          const o = this.serpenti[j];
          if (!o.vivo) continue;
          const da = j === i ? 1 : 0;
          if (j !== i && s.fantasma > ora) continue;
          for (let k = da; k < o.corpo.length; k++) if (o.corpo[k][0] === x && o.corpo[k][1] === y) { colpo = j === i ? 'sé' : j; break; }
        }
      }
      if (colpo == null) continue;
      if (colpo !== 'muro' && win.has(i)) continue; // col trucco gli scontri non contano (in silenzio)
      if (colpo !== 'muro' && s.scudo > ora) { s.scudo = 0; this.annuncia(i, 'perde lo scudo', 'lo scudo ti ha salvato!'); cambiato = true; continue; }
      muoiono.push({ i, colpo });
    }
    for (const { i, colpo } of muoiono) {
      const s = this.serpenti[i];
      s.vivo = false;
      this.morti.push(i);
      // il serpente morto diventa cibo
      s.corpo.slice(1).forEach(([x, y], k) => { if (k % 2 === 0 && x >= 0 && y >= 0 && x < this.W && y < this.H) this.cibo.push({ x, y, valore: 1 }); });
      this.annuncia(i, colpo === 'muro' ? 'ha sbattuto contro il muro' : colpo === 'sé' ? 'si è morso la coda' : 'si è schiantato', colpo === 'muro' ? 'hai sbattuto contro il muro' : colpo === 'sé' ? 'ti sei morso la coda' : 'ti sei schiantato!', true);
      cambiato = true;
    }
    // mangiare
    for (const i of chi) {
      const s = this.serpenti[i];
      if (!s.vivo) continue;
      const [x, y] = s.corpo[0];
      const m = this.cibo.findIndex((c) => c.x === x && c.y === y);
      if (m >= 0) { s.cresce += this.cibo[m].valore; s.punti += 10; this.cibo.splice(m, 1); if (this.cibo.length < this.n + 2) this.metti('mela'); }
      const q = this.poteri.findIndex((c) => c.x === x && c.y === y);
      if (q >= 0) {
        const t = this.poteri[q].tipo;
        this.poteri.splice(q, 1);
        s.punti += 25;
        if (t === 'oro') s.cresce += 4; else s[t] = ora + (t === 'scudo' ? 10000 : t === 'fantasma' ? 6000 : 5000);
        this.annuncia(i, `prende: ${POTERI[t].nome}`, `${POTERI[t].nome}: ${POTERI[t].testo}`);
      }
    }
    this.poteri = this.poteri.filter((c) => c.fino > ora);
    if (this.conPoteri && this.mezzi % 40 === 0 && this.poteri.length < 2 && Math.random() < 0.6) this.metti(Object.keys(POTERI)[Math.floor(Math.random() * 4)]);
    const vivi = this.serpenti.filter((s) => s.vivo).length;
    if (this.n === 1 ? vivi === 0 : vivi <= 1) { this.chiudi(); return true; }
    return cambiato;
  }

  // il trucco segreto: true per i primi 25 secondi di gioco dopo il comando, poi si spegne
  conTrucco(i, ora) {
    if (!T.armato(this, i)) return false;
    const da = (this._winDa = this._winDa || {});
    if (da[i] == null) da[i] = ora;
    if (ora - da[i] < WIN_MS) return true;
    T.consuma(this, i); delete da[i];
    return false;
  }
  // la prossima casella della testa è un muro o un serpente?
  pericolo(i) {
    const s = this.serpenti[i], [dx, dy] = DIR[s.dir];
    let x = s.corpo[0][0] + dx, y = s.corpo[0][1] + dy;
    if (!this.muri) { x = (x + this.W) % this.W; y = (y + this.H) % this.H; }
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true;
    return this.serpenti.some((o) => o.vivo && o.corpo.some(([a, b], k) => a === x && b === y && k < o.corpo.length - 1));
  }

  chiudi() {
    this.finita = true;
    for (let i = 0; i < this.n; i++) T.consuma(this, i); // fine partita: il trucco è servito per questa
    const vivo = this.serpenti.findIndex((s) => s.vivo);
    // ordine: chi muore prima sta in fondo; tra i punti conta anche la lunghezza
    const punti = this.serpenti.map((s) => s.punti);
    let vincitori;
    if (this.n === 1) vincitori = [0];
    else if (vivo >= 0) vincitori = [vivo];
    else { // morti tutti insieme: vince chi ha più punti tra gli ultimi
      const ultimi = this.morti.slice(-2);
      const max = Math.max(...ultimi.map((i) => punti[i]));
      vincitori = ultimi.filter((i) => punti[i] === max);
    }
    if (vivo >= 0 && this.n > 1) this.annuncia(vivo, 'è l\'ultimo serpente in gioco!', 'sei l\'ultimo serpente in gioco!', true);
    this.risultato = { fazioni: punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: vincitori.length > 1, vincitori };
  }

  vistaTick() {
    const ora = Date.now();
    return {
      s: this.serpenti.map((s) => ({ c: s.corpo, v: s.vivo, d: s.dir, p: s.punti, sc: s.scudo > ora, fa: s.fantasma > ora, tu: s.turbo > ora })),
      m: this.cibo.map((c) => [c.x, c.y]), q: this.poteri.map((c) => [c.x, c.y, c.tipo]),
      via: Math.max(0, this.via - ora), pausa: this.inPausa,
    };
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, W: this.W, H: this.H, muri: this.muri, poteri: POTERI, mio: p, passoMs: PASSO_MS,
      stato: this.vistaTick(), punti: this.serpenti.map((s) => s.punti), vivi: this.serpenti.map((s) => s.vivo),
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// facile: evita solo gli ostacoli davanti; medio: va verso la mela più vicina; difficile: in più sceglie la strada con più spazio libero
function pensaBot(g, i, livello) {
  const s = g.serpenti[i];
  const [hx, hy] = s.corpo[0];
  const bloccato = new Set();
  for (const o of g.serpenti) if (o.vivo) o.corpo.forEach(([x, y], k) => { if (k < o.corpo.length - 1 || o.cresce) bloccato.add(x * 1000 + y); });
  const libero = (x, y) => {
    if (!g.muri) { x = (x + g.W) % g.W; y = (y + g.H) % g.H; }
    return x >= 0 && y >= 0 && x < g.W && y < g.H && !bloccato.has(x * 1000 + y);
  };
  const opzioni = Object.keys(DIR).filter((d) => d !== OPPOSTA[s.dir]).map((d) => ({ d, x: hx + DIR[d][0], y: hy + DIR[d][1] })).filter((o) => libero(o.x, o.y));
  if (!opzioni.length) return null;
  if (livello === 'facile' && Math.random() < 0.12) return opzioni[Math.floor(Math.random() * opzioni.length)].d;
  const spazio = (x, y, max) => { // quante caselle raggiungibili da lì (fino a max)
    const visti = new Set([x * 1000 + y]); const coda = [[x, y]];
    while (coda.length && visti.size < max) {
      const [a, b] = coda.shift();
      for (const [dx, dy] of Object.values(DIR)) { const nx = a + dx, ny = b + dy; const k = nx * 1000 + ny; if (!visti.has(k) && libero(nx, ny)) { visti.add(k); coda.push([nx, ny]); } }
    }
    return visti.size;
  };
  const obiettivi = [...g.cibo.map((c) => [c.x, c.y]), ...g.poteri.map((c) => [c.x, c.y])];
  const dist = (x, y) => Math.min(...obiettivi.map(([a, b]) => Math.abs(a - x) + Math.abs(b - y)), 999);
  const lung = s.corpo.length;
  let meglio = null, vm = -Infinity;
  for (const o of opzioni) {
    let v = livello === 'facile' ? -dist(o.x, o.y) * 0.3 + Math.random() * 4 : -dist(o.x, o.y);
    if (livello !== 'facile') { const sp = spazio(o.x, o.y, lung * 3 + 10); if (sp < lung + 3) v -= 1000; if (livello === 'difficile') v += sp * 0.05; }
    if (livello === 'difficile') for (const [j, a] of g.serpenti.entries()) if (j !== i && a.vivo && Math.abs(a.corpo[0][0] - o.x) + Math.abs(a.corpo[0][1] - o.y) <= 1) v -= 60; // lontano dalle teste
    if (o.d === s.dir) v += 0.3;
    if (v > vm) { vm = v; meglio = o.d; }
  }
  return meglio;
}

module.exports = {
  meta: {
    id: 'snake',
    nome: 'Snake',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Tutti nella stessa arena, in tempo reale: mangia, cresci e non toccare nessuno.',
    opzioni: [
      { id: 'bordi', nome: 'Bordi', valori: ['muri', 'aperti'], etichette: ['Muri (toccarli fa morire)', 'Aperti (si esce dall\'altra parte)'], predefinito: 'muri' },
      { id: 'poteri', nome: 'Power-up', valori: ['si', 'no'], etichette: ['Sì', 'No'], predefinito: 'si' },
    ],
    regole: [
      'Si gioca in tempo reale, tutti nella stessa arena. Ognuno guida il suo serpente con le frecce (o W A S D); sul telefono si scorre il dito nella direzione voluta. Il serpente non si ferma mai e non può tornare indietro di colpo.',
      'Mangiando una mela il serpente si allunga di un pezzo (+10 punti).',
      'Si muore toccando il muro (con i bordi "aperti" invece si esce dall\'altra parte), il proprio corpo o un altro serpente. Se due teste si scontrano muoiono entrambi. Un serpente morto si trasforma in mele.',
      'Power-up (+25 punti): Mela d\'oro (+4 di lunghezza), Scudo (per 10 secondi ti salva da uno scontro con un serpente, non dal muro), Fantasma (passi attraverso gli altri serpenti per 6 secondi), Turbo (vai al doppio della velocità per 5 secondi). Spariscono se nessuno li prende entro 12 secondi.',
      'Vince l\'ultimo serpente rimasto. Se gli ultimi muoiono insieme vince chi ha più punti. Da soli è una maratona: fai più punti che puoi.',
      'La partita parte dopo un conto alla rovescia di 3 secondi.',
      'È un gioco in tempo reale: se qualcuno apre le dispense (Esc) la partita si ferma per tutti finché non torna.',
      'Il computer facile evita solo gli ostacoli davanti, il medio va dritto alle mele senza chiudersi in un vicolo, il difficile cerca anche lo spazio più largo e si tiene lontano dalle teste degli altri.',
    ],
  },
  crea: (o) => new Snake(o),
  // il computer in tempo reale pensa dentro tick(); questa funzione serve solo ai controlli generici
  bot: () => ({}),
  _test: { pensaBot },
};
