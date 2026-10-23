// AFFETTA LA FRUTTA: dal fondo del campo vengono lanciati frutti (e ogni tanto una bomba); tenendo premuto e
// trascinando si disegna la lama: ogni frutto tagliato vale punti, tre o più in un colpo solo fanno una combo.
// La bomba toglie 10 punti e stordisce per un attimo. In più giocatori i frutti sono gli stessi per tutti: li prende
// chi li taglia per primo (la lama di ognuno si vede del suo colore). Si gioca a tempo.
// Il browser vede i frutti con un po' di ritardo (rete e interpolazione): il server controlla il taglio anche sulle
// posizioni di un attimo prima (fino a 0,35 s), così si taglia quello che si vede.
const { Arena, COLORI } = require('../giochi/arena');
const T = require('../giochi/trucco');

const W = 900, H = 600, G = 520;
const DURATE = [60, 90, 120];
const BOMBE = ['normali', 'tante', 'nessuna'];
// tipo, raggio, punti (la stella d'oro è rara e vale di più)
const FRUTTI = [
  { id: 'mela', r: 30, p: 1 }, { id: 'arancia', r: 31, p: 1 }, { id: 'anguria', r: 44, p: 1 }, { id: 'banana', r: 30, p: 1 },
  { id: 'kiwi', r: 26, p: 1 }, { id: 'ananas', r: 36, p: 1 }, { id: 'fragola', r: 24, p: 1 }, { id: 'limone', r: 27, p: 1 },
  { id: 'cocco', r: 32, p: 1 }, { id: 'stella', r: 28, p: 5 }, { id: 'bomba', r: 30, p: -10 },
];
const BOMBA = FRUTTI.length - 1, STELLA = FRUTTI.length - 2;
const RITARDI = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35];
const LIV = {
  facile: { muovi: 900, taglio: 1300, reazione: 0.5, errore: 26, bombe: 0.12 },
  medio: { muovi: 1300, taglio: 1800, reazione: 0.26, errore: 12, bombe: 0, evita: true },
  difficile: { muovi: 1900, taglio: 2400, reazione: 0.1, errore: 4, bombe: 0, evita: true },
};

// !win + parola segreta: per 25 secondi lama larghissima e le bombe non fanno niente
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}

// distanza tra il punto (px, py) e il segmento a-b
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const k = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - dx * k, py - ay - dy * k);
}

class Frutta extends Arena {
  constructor(o) {
    super(o, { id: 'frutta', round: 1, tickMs: 33 });
    this.nRound = 1;
    this.W = W; this.H = H;
    const op = o.opzioni || {};
    this.durata = DURATE.includes(Number(op.durata)) ? Number(op.durata) : 60;
    this.bombe = BOMBE.includes(op.bombe) ? op.bombe : 'normali';
    this.menti = {};
    this.avvia();
  }

  iniziaRound() {
    this.frutti = []; this.nId = 0; this.prossimo = 0.6; this.effetti = [];
    this.lame = Array.from({ length: this.n }, () => ({ x: W / 2, y: H / 2, prima: null, su: false, stordito: 0, serie: [], serieDa: 0 }));
    this.tagliati = new Array(this.n).fill(0);
    this.winOn = {};
    this.cambiato = true;
  }
  spostaTempi() {}

  // posizione di un frutto al tempo t (secondi del round)
  dove(f, t) { const s = t - f.t0; return { x: f.x0 + f.vx * s, y: f.y0 + f.vy * s + (G * s * s) / 2 }; }
  // un lancio: da 1 a 5 frutti dal fondo, verso il centro; col tempo più fitti
  lancia(t) {
    const avanti = Math.min(1, t / this.durata);
    const quanti = 1 + Math.floor(Math.random() * (2 + avanti * 3));
    const pBomba = this.bombe === 'nessuna' ? 0 : (this.bombe === 'tante' ? 0.28 : 0.14) * (0.5 + avanti);
    for (let k = 0; k < quanti; k++) {
      let tipo = Math.floor(Math.random() * (FRUTTI.length - 2));
      if (Math.random() < 0.035) tipo = STELLA;
      if (k > 0 && Math.random() < pBomba) tipo = BOMBA;
      if (quanti === 1 && Math.random() < pBomba * 0.5) tipo = BOMBA;
      const x0 = 90 + Math.random() * (W - 180), cima = 60 + Math.random() * 230, y0 = H + 40;
      const vy = -Math.sqrt(2 * G * (y0 - cima)), volo = (-2 * vy) / G;
      const verso = (W / 2 + (Math.random() - 0.5) * 300 - x0) / volo;
      this.frutti.push({ id: ++this.nId, tipo, x0, y0, vx: verso, vy, t0: t + k * 0.08, rot: Math.random() * 6, giro: (Math.random() - 0.5) * 6, chi: -1, tt: 0, ang: 0 });
    }
    this.effetti.push(['l']);
  }

  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound;
    if (t >= this.prossimo && t < this.durata - 1.2) {
      this.lancia(t);
      const avanti = Math.min(1, t / this.durata);
      this.prossimo = t + (1.7 - avanti * 0.9) * (0.75 + Math.random() * 0.5);
    }
    // le lame
    for (let p = 0; p < this.n; p++) {
      const l = this.lame[p], i = this.inp[p];
      l.stordito = Math.max(0, l.stordito - dt);
      const giu = i.a && i.mx !== null && i.mx !== undefined;
      if (giu) {
        if (l.prima && l.su && !l.stordito) this.taglia(p, l.prima.x, l.prima.y, i.mx, i.my, t);
        l.prima = { x: i.mx, y: i.my }; l.x = i.mx; l.y = i.my;
      } else l.prima = null;
      l.su = giu;
      // fine del colpo (lama alzata o ferma da un po'): si contano le combo
      if (l.serie.length && (!giu || t - l.serieDa > 0.35)) this.chiudiSerie(p);
    }
    // i frutti caduti giù escono
    this.frutti = this.frutti.filter((f) => { const s = t - f.t0; return s < 0 || f.vy + G * s < 0 || this.dove(f, t).y < H + 90; });
    return t >= this.durata && !this.frutti.some((f) => f.chi < 0 && f.tipo !== BOMBA && t - f.t0 >= 0 && this.dove(f, t).y < H + 40) || t >= this.durata + 4;
  }
  taglia(p, ax, ay, bx, by, t) {
    if (Math.hypot(bx - ax, by - ay) < 3) return;
    const largo = this.winOn[p] ? 34 : 6;
    for (const f of this.frutti) {
      if (f.chi >= 0 || t < f.t0) continue;
      const r = FRUTTI[f.tipo].r + largo;
      // si taglia quello che si vede: anche dove il frutto era un attimo fa
      const preso = RITARDI.some((d) => { if (t - d < f.t0) return false; const q = this.dove(f, t - d); return distSeg(q.x, q.y, ax, ay, bx, by) < r; });
      if (!preso) continue;
      const q = this.dove(f, t);
      if (f.tipo === BOMBA) {
        if (this.winOn[p]) continue; // col trucco le bombe non si tagliano
        f.chi = p; f.tt = t;
        this.punti[p] = Math.max(0, this.punti[p] - 10);
        this.lame[p].stordito = 1.2; this.lame[p].serie = [];
        this.effetti.push(['b', Math.round(q.x), Math.round(q.y), p]);
        this.annuncia(p, 'taglia una bomba! 💣 −10', 'Bomba! 💣 −10 punti');
        this.cambiato = true;
        return;
      }
      f.chi = p; f.tt = t; f.ang = Math.atan2(by - ay, bx - ax);
      this.punti[p] += FRUTTI[f.tipo].p;
      this.tagliati[p]++;
      const l = this.lame[p];
      if (!l.serie.length) l.serieDa = t;
      l.serie.push([q.x, q.y]); l.serieDa = t;
      this.effetti.push(['c', f.id, p, Math.round(q.x), Math.round(q.y), f.tipo]);
      this.cambiato = true;
    }
  }
  chiudiSerie(p) {
    const l = this.lame[p], n = l.serie.length;
    if (n >= 3) {
      this.punti[p] += n;
      const [x, y] = l.serie[n - 1];
      this.effetti.push(['k', p, n, Math.round(x), Math.round(y)]);
      if (n >= 5) this.annuncia(p, `combo da ${n}! 🍉`, `Combo da ${n}! +${n}`);
      this.cambiato = true;
    }
    l.serie = [];
  }
  fineRound() { for (let p = 0; p < this.n; p++) this.chiudiSerie(p); }
  chiudi() {
    super.chiudi();
    if (this.n === 1) this.risultato.titolo = `${this.punti[0]} punti · ${this.tagliati[0]} frutti tagliati`;
  }

  // ---- il computer: sceglie un frutto (il difficile due in fila), va all'inizio del colpo e taglia ----
  pensa(p, liv) {
    const L = LIV[liv] || LIV.medio, m = this.menti[p] || (this.menti[p] = { x: W / 2, y: H * 0.75, attesa: 0.8, colpo: null, giu: false });
    const dt = this.tickMs / 1000, t = this.tempoRound;
    if (this.lame[p].stordito) m.attesa = Math.max(m.attesa, 0.2);
    if (m.attesa > 0) { m.attesa -= dt; return { mx: m.x, my: m.y, a: false }; }
    if (!m.colpo) {
      m.colpo = this.scegli(p, L, t);
      if (!m.colpo) { m.attesa = 0.15; return { mx: m.x, my: m.y, a: false }; }
      m.giu = false;
    }
    const meta = m.giu ? m.colpo.b : m.colpo.a, v = (m.giu ? L.taglio : L.muovi) * dt;
    const dx = meta.x - m.x, dy = meta.y - m.y, d = Math.hypot(dx, dy);
    if (d <= v) {
      m.x = meta.x; m.y = meta.y;
      if (!m.giu) m.giu = true;
      else { m.colpo = null; m.giu = false; m.attesa = L.reazione * (0.6 + Math.random() * 0.8); return { mx: m.x, my: m.y, a: false }; }
    } else { m.x += (dx / d) * v; m.y += (dy / d) * v; }
    return { mx: Math.round(m.x), my: Math.round(m.y), a: m.giu };
  }
  scegli(p, L, t) {
    const vivi = this.frutti.filter((f) => f.chi < 0 && t >= f.t0);
    const buoni = vivi.filter((f) => f.tipo !== BOMBA || Math.random() < L.bombe).filter((f) => { const q = this.dove(f, t); return q.y < H - 30 && q.y > 20; });
    if (!buoni.length) return null;
    // dove sarà il frutto quando la lama ci arriva
    const prev = (f) => { const q0 = this.dove(f, t), tempo = Math.hypot(q0.x - this.menti[p].x, q0.y - this.menti[p].y) / L.muovi + 0.12; return this.dove(f, t + tempo); };
    const err = () => (Math.random() - 0.5) * 2 * L.errore;
    let f1 = buoni[Math.floor(Math.random() * buoni.length)];
    const bombe = vivi.filter((f) => f.tipo === BOMBA);
    let a, b;
    const q1 = prev(f1);
    // il difficile cerca due frutti vicini da tagliare insieme
    const f2 = L.errore < 6 ? buoni.filter((f) => f !== f1 && f.tipo !== BOMBA).map((f) => [f, prev(f)]).find(([, q]) => Math.hypot(q.x - q1.x, q.y - q1.y) < 170) : null;
    if (f2) {
      const q2 = f2[1], dx = q2.x - q1.x, dy = q2.y - q1.y, l = Math.hypot(dx, dy) || 1;
      a = { x: q1.x - (dx / l) * 70, y: q1.y - (dy / l) * 70 }; b = { x: q2.x + (dx / l) * 70, y: q2.y + (dy / l) * 70 };
    } else {
      const ang = Math.random() * Math.PI;
      const cx = q1.x + err(), cy = q1.y + err();
      a = { x: cx - Math.cos(ang) * 80, y: cy - Math.sin(ang) * 80 }; b = { x: cx + Math.cos(ang) * 80, y: cy + Math.sin(ang) * 80 };
    }
    // il medio e il difficile non tagliano dove passerà una bomba
    if (L.evita && this.bomba(a, b, bombe, L, t, this.menti[p])) return null;
    const dentro = (q) => ({ x: Math.max(5, Math.min(W - 5, q.x)), y: Math.max(5, Math.min(H - 5, q.y)) });
    return { a: dentro(a), b: dentro(b) };
  }

  // una bomba passerà sotto il colpo? Si guarda il colpo per tutta la sua durata, anche con le posizioni di un attimo
  // prima (il server taglia anche quelle)
  bomba(a, b, bombe, L, t, m) {
    const ta = t + Math.hypot(a.x - m.x, a.y - m.y) / L.muovi, tb = ta + Math.hypot(b.x - a.x, b.y - a.y) / L.taglio;
    return bombe.some((f) => {
      for (let s = 0; s <= 1; s += 0.125) {
        const x = a.x + (b.x - a.x) * s, y = a.y + (b.y - a.y) * s, tt = ta + (tb - ta) * s;
        for (const d of [0, 0.15, 0.35]) { const q = this.dove(f, tt - d); if (Math.hypot(q.x - x, q.y - y) < FRUTTI[BOMBA].r + 28) return true; }
      }
      return false;
    });
  }

  vistaExtra() { return { W, H, durata: this.durata, frutti: FRUTTI.map((f) => [f.id, f.r]), colori: COLORI }; }
  statoTick() {
    const t = this.tempoRound, r = Math.round;
    const eff = this.effetti; this.effetti = [];
    const f = [];
    for (const x of this.frutti) {
      if (t < x.t0) continue;
      const q = this.dove(x, t);
      f.push([x.id, x.tipo, r(q.x), r(q.y), Math.round((x.rot + x.giro * (t - x.t0)) * 100) / 100, x.chi, x.chi >= 0 ? Math.round((t - x.tt) * 100) / 100 : 0, Math.round(x.ang * 100) / 100]);
    }
    return {
      f, e: eff, pt: this.punti.slice(), tr: Math.max(0, Math.ceil(this.durata - t)),
      l: this.lame.map((l) => [r(l.x), r(l.y), l.su ? 1 : 0, l.stordito > 0 ? 1 : 0]), w: this.winOn ? Object.keys(this.winOn).filter((k) => this.winOn[k]).map(Number) : [],
    };
  }
}

module.exports = {
  meta: {
    id: 'frutta',
    nome: 'Affetta la frutta',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'Tieni premuto e trascina per tagliare i frutti lanciati in aria: combo con tre o più in un colpo, ma attento alle bombe! Da soli o in sfida in tempo reale.',
    alias: ['affetta la frutta', 'frutta', 'fruit ninja', 'taglia la frutta', 'ninja', 'frutti', 'affetta'],
    opzioni: [
      { id: 'durata', nome: 'Durata', valori: DURATE, etichette: ['1 minuto', '1 minuto e mezzo', '2 minuti'], predefinito: 60 },
      { id: 'bombe', nome: 'Bombe', valori: BOMBE, etichette: ['Normali', 'Tante', 'Nessuna'], predefinito: 'normali' },
    ],
    regole: [
      'Dal fondo del campo vengono lanciati in aria dei frutti. Tieni premuto il tasto sinistro del mouse (sul telefono il dito) e trascina: la lama taglia i frutti che attraversa.',
      'Ogni frutto tagliato vale 1 punto; la rara stella d\'oro ne vale 5. Tre o più frutti in un colpo solo (senza alzare la lama) sono una COMBO: un punto in più per ogni frutto della combo.',
      'Attento alle bombe nere con la miccia: tagliarne una toglie 10 punti e la lama resta stordita per un secondo. Con l\'opzione "Nessuna" le bombe non ci sono.',
      'Col passare del tempo i lanci diventano più fitti. Si gioca 1 minuto (o 1 e mezzo, o 2): vince chi ha più punti.',
      'In più giocatori (fino a 4) i frutti sono gli stessi per tutti e li prende chi li taglia per primo: la lama di ognuno ha il suo colore.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile è lento e ogni tanto taglia le bombe; il medio è svelto e le evita; il difficile è velocissimo, preciso e taglia due frutti per volta quando può.',
    ],
  },
  crea: (o) => new Frutta(o),
  bot: () => ({}),
  _test: { Frutta, FRUTTI, BOMBA, STELLA, W, H, G, distSeg },
};
