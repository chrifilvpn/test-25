// CATENA DI BIGLIE: una fila di biglie colorate rotola lungo un percorso (una spirale o un serpente) verso il buco
// in fondo. Dal centro la rana di pietra spara biglie: dove una biglia entra nella fila, tre o più dello stesso colore
// che si toccano scoppiano. Se dopo lo scoppio le due biglie ai lati del vuoto hanno lo stesso colore, la parte davanti
// torna indietro come una calamita e può scoppiare di nuovo (reazione a catena, punti doppi, tripli…).
// Ognuno ha la sua catena, ma le biglie in arrivo sono le stesse per tutti (stesso seme): vince chi la distrugge per
// primo. Se le biglie arrivano al buco si perde.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');

const W = 900, H = 600, D = 32, PASSO = 4, TIRO = 900, CALAMITA = 380, LIMITE = 480;
const LIVELLI = {
  facile: { colori: 4, biglie: 60, v: 22 },
  medio: { colori: 5, biglie: 80, v: 28 },
  difficile: { colori: 6, biglie: 100, v: 34 },
};
const PERCORSI = ['spirale', 'serpente', 'caso'];
const BOT = {
  facile: { pausa: [1.5, 2.3], errore: 0.06, sbaglia: 0.35 },
  medio: { pausa: [0.85, 1.25], errore: 0.022, sbaglia: 0.08 },
  difficile: { pausa: [0.45, 0.7], errore: 0.004, sbaglia: 0, scambia: true },
};

function prossimo(r) { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// il percorso, campionato ogni PASSO pixel di lunghezza
function ricampiona(pt) {
  const out = [pt[0]];
  let resto = 0;
  for (let i = 1; i < pt.length; i++) {
    let [x0, y0] = pt[i - 1]; const [x1, y1] = pt[i];
    let l = Math.hypot(x1 - x0, y1 - y0);
    while (resto + l >= PASSO) {
      const k = (PASSO - resto) / l;
      x0 += (x1 - x0) * k; y0 += (y1 - y0) * k; l = Math.hypot(x1 - x0, y1 - y0);
      out.push([x0, y0]); resto = 0;
    }
    resto += l;
  }
  return out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
// angoli smussati (Chaikin)
function smussa(pt, volte = 4) {
  for (let v = 0; v < volte; v++) {
    const n = [pt[0]];
    for (let i = 0; i < pt.length - 1; i++) {
      const [a, b] = [pt[i], pt[i + 1]];
      n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    n.push(pt[pt.length - 1]);
    pt = n;
  }
  return pt;
}
function percorso(nome) {
  if (nome === 'serpente') {
    return { punti: ricampiona(smussa([[-10, 70], [830, 70], [830, 182], [90, 182], [90, 418], [830, 418], [830, 530], [150, 530]])), tiratore: { x: 450, y: 300 } };
  }
  const pt = [], giri = 3 * Math.PI, R0 = 285, R1 = 112;
  for (let k = 0; k <= 1200; k++) { const th = (k / 1200) * giri, r = R0 - ((R0 - R1) * th) / giri; pt.push([450 + Math.cos(th) * r * 1.45, 300 + Math.sin(th) * r]); }
  return { punti: ricampiona(pt), tiratore: { x: 450, y: 300 } };
}

// !win + parola segreta: per 25 secondi la catena si ferma (la calamita funziona ancora)
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}

class Sfere extends Arena {
  constructor(o) {
    super(o, { id: 'sfere', round: 1, tickMs: 33 });
    this.nRound = 1;
    this.W = W; this.H = H;
    const op = o.opzioni || {};
    this.livello = LIVELLI[op.difficolta] ? op.difficolta : 'medio';
    let nome = PERCORSI.includes(op.percorso) ? op.percorso : 'spirale';
    if (nome === 'caso') nome = Math.random() < 0.5 ? 'spirale' : 'serpente';
    this.nomePercorso = nome;
    const P = percorso(nome);
    this.punti0 = P.punti; this.L = (P.punti.length - 1) * PASSO; this.tir = P.tiratore;
    this.seme = Number.isFinite(op.seme) ? op.seme >>> 0 : Math.floor(Math.random() * 2 ** 31);
    this.menti = {};
    this.avvia();
  }

  iniziaRound() {
    const L = LIVELLI[this.livello];
    this.tav = Array.from({ length: this.n }, () => {
      const t = { cat: [], da: L.biglie, rc: { a: this.seme }, rt: { a: this.seme ^ 0x9e3779b9 }, ultimo: -1, nId: 0, colpi: [], pt: 0, combo: 0, stato: 'gioco', fine: null, attesa: 0, eff: [] };
      t.att = this.colore(t); t.pro = this.colore(t);
      return t;
    });
    this.winOn = {};
  }
  spostaTempi() {}

  // dove sta la biglia a distanza s lungo il percorso (s < 0: ancora nella tana)
  pos(s) {
    const k = Math.max(0, Math.min(this.punti0.length - 1.001, s / PASSO)), i = Math.floor(k), f = k - i;
    const a = this.punti0[i], b = this.punti0[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  // il colore della prossima biglia da sparare: tra quelli ancora nella catena
  colore(t) {
    const nc = LIVELLI[this.livello].colori;
    const ci = [...new Set(t.cat.map((b) => b.c))];
    const tra = ci.length ? ci : Array.from({ length: nc }, (_, i) => i);
    return tra[Math.floor(prossimo(t.rt) * tra.length)];
  }
  // le biglie nuove che escono dalla tana: a volte ripetono il colore di prima (file già fatte)
  nuovaBiglia(t) {
    const nc = LIVELLI[this.livello].colori;
    let c = Math.floor(prossimo(t.rc) * nc);
    if (t.ultimo >= 0 && prossimo(t.rc) < 0.38) c = t.ultimo;
    t.ultimo = c; t.da--;
    return { id: ++t.nId, c, s: t.cat.length ? t.cat[0].s - D : 0 };
  }
  contigue(t, i) { return t.cat[i + 1].s - t.cat[i].s <= D + 0.5; }

  passo(dt) {
    aggiornaWin(this, dt);
    for (let p = 0; p < this.n; p++) {
      const t = this.tav[p];
      if (t.stato !== 'gioco') continue;
      this.muoviCatena(p, dt);
      if (t.stato !== 'gioco') continue;
      // il tiro
      t.attesa = Math.max(0, t.attesa - dt);
      const nuovi = this.nuoviTocchi(p), i = this.inp[p];
      if (nuovi && !t.attesa && i.mx !== null && i.mx !== undefined) this.spara(p, Math.atan2(i.my - this.tir.y, i.mx - this.tir.x));
      this.muoviColpi(p, dt);
    }
    const st = this.tav.map((t) => t.stato);
    return st.includes('vuota') || st.every((s) => s === 'perso') || this.tempoRound > LIMITE;
  }
  muoviCatena(p, dt) {
    const t = this.tav[p], cat = t.cat, L = LIVELLI[this.livello];
    // le biglie nuove escono dalla tana
    while (t.da > 0 && (!cat.length || cat[0].s >= 0)) cat.unshift(this.nuovaBiglia(t));
    if (!cat.length) { if (!t.colpi.length) this.vuota(p); return; }
    // la velocità: all'inizio di corsa, poi piano; vicino al buco rallenta un po'; col trucco ferma
    const testa = cat[cat.length - 1].s;
    const intro = this.tempoRound < 4 && testa < this.L * 0.3;
    let v = intro ? 300 : L.v * (testa > this.L * 0.85 ? 0.6 : 1);
    if (this.winOn[p] && !intro) v = 0;
    // si spinge il gruppo in fondo; gli altri si muovono solo se spinti
    cat[0].s += v * dt;
    for (let i = 1; i < cat.length; i++) if (cat[i].s < cat[i - 1].s + D) cat[i].s = cat[i - 1].s + D;
    // la calamita: ai lati di un vuoto due biglie dello stesso colore → la parte davanti torna indietro
    for (let i = 0; i < cat.length - 1; i++) {
      if (this.contigue(t, i) || cat[i].c !== cat[i + 1].c || cat[i].s < 0) continue;
      let j = i + 1; while (j < cat.length - 1 && this.contigue(t, j)) j++;
      const indietro = Math.min(CALAMITA * dt, cat[i + 1].s - cat[i].s - D);
      for (let k = i + 1; k <= j; k++) cat[k].s -= indietro;
      if (this.contigue(t, i)) { t.combo++; this.scoppia(p, i, true); return; }
    }
    // arrivate al buco
    if (cat[cat.length - 1].s >= this.L) this.perde(p);
  }
  spara(p, ang) {
    const t = this.tav[p];
    t.colpi.push({ x: this.tir.x + Math.cos(ang) * 30, y: this.tir.y + Math.sin(ang) * 30, vx: Math.cos(ang) * TIRO, vy: Math.sin(ang) * TIRO, c: t.att });
    t.att = t.pro; t.pro = this.colore(t);
    t.attesa = 0.22;
    t.eff.push(['t']);
  }
  scambia(p) { const t = this.tav[p]; [t.att, t.pro] = [t.pro, t.att]; }
  muoviColpi(p, dt) {
    const t = this.tav[p];
    const xy = t.cat.map((b) => (b.s >= 0 ? this.pos(b.s) : null));
    for (const c of t.colpi.slice()) {
      const passi = Math.ceil((TIRO * dt) / 8);
      let preso = -1;
      for (let k = 0; k < passi && preso < 0; k++) {
        c.x += (c.vx * dt) / passi; c.y += (c.vy * dt) / passi;
        preso = this.urto(xy, c.x, c.y);
      }
      if (preso >= 0) { t.colpi.splice(t.colpi.indexOf(c), 1); this.inserisci(p, preso, c); return; }
      if (c.x < -40 || c.x > W + 40 || c.y < -40 || c.y > H + 40) t.colpi.splice(t.colpi.indexOf(c), 1);
    }
  }
  urto(xy, x, y) {
    let best = -1, bd = D * 0.92;
    for (let i = 0; i < xy.length; i++) { const q = xy[i]; if (!q) continue; const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  // dove entra la biglia: davanti o dietro a quella colpita, secondo da che parte arriva lungo il percorso
  dove(t, i, x, y) {
    const b = t.cat[i], [bx, by] = this.pos(b.s), [ax, ay] = this.pos(b.s + 6);
    return (x - bx) * (ax - bx) + (y - by) * (ay - by) > 0 ? i + 1 : i;
  }
  inserisci(p, i, c) {
    const t = this.tav[p], cat = t.cat;
    const k = this.dove(t, i, c.x, c.y);
    const s = k > i ? cat[i].s + D : cat[i].s;
    cat.splice(k, 0, { id: ++t.nId, c: c.c, s });
    for (let j = k + 1; j < cat.length; j++) if (cat[j].s < cat[j - 1].s + D) cat[j].s = cat[j - 1].s + D; else break;
    t.combo = 0;
    t.eff.push(['i', cat[k].id]);
    this.scoppia(p, k, false);
  }
  // tre o più dello stesso colore che si toccano attorno alla biglia i
  fila(t, i) {
    const cat = t.cat, c = cat[i].c;
    let a = i, b = i;
    while (a > 0 && cat[a - 1].c === c && this.contigue(t, a - 1)) a--;
    while (b < cat.length - 1 && cat[b + 1].c === c && this.contigue(t, b)) b++;
    return [a, b];
  }
  scoppia(p, i, reazione) {
    const t = this.tav[p], cat = t.cat;
    const [a, b] = this.fila(t, i), n = b - a + 1;
    if (n < 3) { if (reazione) t.combo = 0; return false; }
    const via = cat.splice(a, n);
    const molt = 1 + t.combo, pt = 10 * n * molt;
    t.pt += pt; this.punti[p] = t.pt;
    const [x, y] = this.pos(via[Math.floor(n / 2)].s);
    t.eff.push(['s', Math.round(x), Math.round(y), via[0].c, n, molt, pt]);
    for (const q of this.tav) if (q !== t) q.eff.push(['a', p, n]);
    if (molt >= 3) this.annuncia(p, `reazione a catena ×${molt}! 🔗`, `Reazione a catena ×${molt}!`);
    this.cambiato = true;
    // finito il tiro: se non c'è più niente vicino si sceglie un colore che esiste ancora
    if (!cat.some((x) => x.c === t.att)) t.att = this.colore(t);
    if (!cat.some((x) => x.c === t.pro)) t.pro = this.colore(t);
    return true;
  }
  vuota(p) {
    const t = this.tav[p];
    t.stato = 'vuota'; t.fine = this.tempoRound;
    const bonus = Math.max(100, Math.round(1000 - this.tempoRound * 3));
    t.pt += bonus; this.punti[p] = t.pt;
    t.eff.push(['v', bonus]);
    this.annuncia(p, 'ha distrutto tutta la catena! 🐸', 'Catena distrutta! 🐸', true);
    this.cambiato = true;
  }
  perde(p) {
    const t = this.tav[p];
    t.stato = 'perso'; t.fine = this.tempoRound; t.colpi = [];
    t.eff.push(['p']);
    this.annuncia(p, 'si è fatto mangiare dal buco 🕳️', 'Le biglie sono arrivate al buco 🕳️', true);
    this.cambiato = true;
  }
  azione(p, a) {
    if (!a || a.tipo !== 'scambia') return { errore: 'Mossa non valida' };
    if (this.finita || this.fase !== 'gioco' || !this.tav[p] || this.tav[p].stato !== 'gioco') return { errore: 'Adesso no' };
    this.scambia(p);
    return { ok: true };
  }
  fineRound() {}
  chiudi() {
    super.chiudi();
    const r = this.risultato, v = this.tav.findIndex((t) => t.stato === 'vuota');
    if (v >= 0) { r.vincitori = [v]; r.pareggio = false; }
    else if (this.n === 1) r.vincitori = [];
    if (this.n === 1) {
      const t = this.tav[0], m = Math.floor((t.fine || this.tempoRound) / 60), s = Math.floor((t.fine || this.tempoRound) % 60);
      r.titolo = t.stato === 'vuota' ? `Catena distrutta in ${m}:${String(s).padStart(2, '0')} · ${t.pt} punti` : `Le biglie sono arrivate al buco · ${t.pt} punti`;
    }
  }

  // ---- il computer: prova i tiri verso ogni biglia e sceglie quello che fa scoppiare di più ----
  // dove finirebbe un tiro con l'angolo ang (la catena ferma: si muove piano)
  prova(t, xy, ang) {
    let x = this.tir.x + Math.cos(ang) * 30, y = this.tir.y + Math.sin(ang) * 30;
    const dx = Math.cos(ang) * 8, dy = Math.sin(ang) * 8;
    for (let k = 0; k < 150; k++) {
      x += dx; y += dy;
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return null;
      const i = this.urto(xy, x, y);
      if (i >= 0) return this.dove(t, i, x, y);
    }
    return null;
  }
  // quanto vale mettere il colore c alla posizione k (prima della biglia k)
  valore(t, k, c) {
    const cat = t.cat;
    let n = 1;
    for (let j = k - 1; j >= 0 && cat[j].c === c && (j === k - 1 || this.contigue(t, j)); j--) n++;
    for (let j = k; j < cat.length && cat[j].c === c && (j === k || this.contigue(t, j - 1)); j++) n++;
    if (n >= 3) {
      // pericolo: conviene di più scoppiare vicino al buco; e se dopo i due lati si toccano con lo stesso colore, reazione
      const s = cat[Math.min(k, cat.length - 1)].s / this.L;
      return 10 * n + s * 12;
    }
    return n === 2 ? 3 : 0;
  }
  sceglie(t, c, B) {
    const xy = t.cat.map((b) => (b.s >= 0 && b.s < this.L ? this.pos(b.s) : null));
    const prove = [];
    for (let i = 0; i < xy.length; i++) {
      if (!xy[i]) continue;
      const base = Math.atan2(xy[i][1] - this.tir.y, xy[i][0] - this.tir.x), l = Math.hypot(xy[i][1] - this.tir.y, xy[i][0] - this.tir.x);
      for (const d of [-0.4, 0, 0.4]) {
        const ang = base + (d * D) / l, k = this.prova(t, xy, ang);
        if (k === null) continue;
        prove.push({ ang, v: this.valore(t, k, c) });
      }
    }
    if (!prove.length) return null;
    if (Math.random() < B.sbaglia) return prove[Math.floor(Math.random() * prove.length)];
    return prove.reduce((a, b) => (b.v > a.v ? b : a));
  }
  pensa(p, liv) {
    const B = BOT[liv] || BOT.medio, t = this.tav[p];
    const m = this.menti[p] || (this.menti[p] = { pausa: 1 + Math.random(), ang: -Math.PI / 2 });
    const mira = (ang) => ({ mx: Math.round(this.tir.x + Math.cos(ang) * 200), my: Math.round(this.tir.y + Math.sin(ang) * 200) });
    if (!t || t.stato !== 'gioco') return mira(m.ang);
    m.pausa -= this.tickMs / 1000;
    if (m.pausa > 0 || t.attesa) return mira(m.ang);
    m.pausa = B.pausa[0] + Math.random() * (B.pausa[1] - B.pausa[0]);
    let s = this.sceglie(t, t.att, B);
    if (B.scambia && t.pro !== t.att) {
      const s2 = this.sceglie(t, t.pro, B);
      if (s2 && (!s || s2.v > s.v + 2)) { this.scambia(p); s = s2; }
    }
    if (!s) return mira(m.ang);
    m.ang = s.ang + (Math.random() - 0.5) * 2 * B.errore;
    return { ...mira(m.ang), tocco: true };
  }

  vistaExtra() {
    return { W, H, D, L: this.L, passo: PASSO, percorso: this.punti0.map(([x, y]) => [Math.round(x), Math.round(y)]), tir: this.tir, nome: this.nomePercorso, colori: LIVELLI[this.livello].colori, totale: LIVELLI[this.livello].biglie };
  }
  statoTick(posto) {
    const io = this.tav[posto] ? posto : 0, t = this.tav[io], r = Math.round;
    const eff = t.eff; t.eff = [];
    return {
      c: t.cat.map((b) => [b.id, b.c, r(b.s)]), k: t.colpi.map((c) => [r(c.x), r(c.y), c.c]), a: t.att, n: t.pro, st: t.stato, da: t.da,
      e: eff, pt: this.punti.slice(), w: this.winOn[io] ? 1 : 0,
      o: this.tav.map((q) => [q.stato === 'gioco' ? 0 : q.stato === 'vuota' ? 1 : 2, q.cat.length + q.da, q.cat.length ? Math.round((q.cat[q.cat.length - 1].s / this.L) * 100) : 0]),
    };
  }
}

module.exports = {
  meta: {
    id: 'sfere',
    nome: 'Catena di biglie',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'Una fila di biglie colorate rotola verso il buco: spara biglie con la rana di pietra e fai scoppiare tre o più dello stesso colore. Reazioni a catena! Da soli o in sfida: vince chi distrugge la catena per primo.',
    alias: ['catena di biglie', 'biglie colorate', 'zuma', 'rana', 'sfere', 'catena biglie', 'spara biglie'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: ['facile', 'medio', 'difficile'], etichette: ['Facile (4 colori)', 'Media (5 colori)', 'Difficile (6 colori)'], predefinito: 'medio' },
      { id: 'percorso', nome: 'Percorso', valori: PERCORSI, etichette: ['Spirale', 'Serpente', 'A caso'], predefinito: 'spirale' },
    ],
    regole: [
      'Una catena di biglie colorate esce dalla tana e rotola lungo il percorso verso il buco. Al centro c\'è la rana di pietra, che guarda dove punti il mouse: clic (o tocco sul campo) per sparare la biglia che ha in bocca.',
      'La biglia sparata entra nella catena dove la colpisce. Tre o più biglie dello stesso colore che si toccano scoppiano: 10 punti l\'una.',
      'Dopo uno scoppio resta un vuoto: se le due biglie ai lati hanno lo stesso colore, la parte davanti torna indietro come una calamita e, se fa di nuovo tre, scoppia ancora: è una reazione a catena e i punti si moltiplicano (×2, ×3…).',
      'Sulla schiena della rana c\'è la biglia dopo: clic col tasto destro, clic sulla rana o il pulsante 🔄 in alto a destra per scambiarle. Le biglie da sparare sono sempre di colori ancora presenti nella catena.',
      'Se la prima biglia della catena arriva al buco hai perso. Se distruggi tutta la catena vinci, con un premio che è più alto quanto più sei stato veloce.',
      'In più giocatori ognuno ha la sua catena, ma le biglie che escono dalla tana sono le stesse per tutti: vince chi distrugge la sua per primo (se tutti finiscono nel buco vince chi ha fatto più punti).',
      'Difficoltà: facile 4 colori e 60 biglie, media 5 colori e 80 biglie, difficile 6 colori e 100 biglie (e la catena va più veloce).',
      'Il computer facile tira piano e spesso a caso; il medio mira bene; il difficile è veloce, preciso e scambia le biglie quando conviene.',
    ],
  },
  crea: (o) => new Sfere(o),
  bot: () => ({}),
  _test: { Sfere, W, H, D, LIVELLI, percorso, ricampiona, PASSO },
};
