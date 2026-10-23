// DIFESA DELLA TORRE: i mostri arrivano a ondate lungo le strade verso la torre al centro. Clic su un prato libero
// vicino alla propria strada per costruire una torretta (arciere, cannone, ghiaccio, fulmine), clic su una torretta
// per migliorarla o venderla. I mostri uccisi danno oro. Ogni giocatore ha la sua strada.
// "Squadra": tutti difendono la stessa torre (vite in comune). "Sfida": ognuno la sua porta e le sue vite, stesse
// ondate per tutti: vince chi resiste. Da soli una strada lunga che gira attorno alla torre.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');

const W = 900, H = 600, CELLA = 40, PASSO = 4, LARGA = 18, TORRE = { x: 450, y: 300, r: 52 };
const TORRI = {
  arciere: { nome: 'Arciere', costo: 50, raggio: 120, danno: 9, ogni: 0.55 },
  cannone: { nome: 'Cannone', costo: 90, raggio: 105, danno: 20, ogni: 1.5, area: 48 },
  ghiaccio: { nome: 'Ghiaccio', costo: 70, raggio: 100, danno: 3, ogni: 0.9, lento: 1.6 },
  fulmine: { nome: 'Fulmine', costo: 120, raggio: 135, danno: 26, ogni: 1.7, salti: 3 },
};
const MOSTRI = {
  goblin: { vita: 32, v: 58, oro: 5, armatura: 0, danno: 1 },
  lupo: { vita: 22, v: 98, oro: 6, armatura: 0, danno: 1 },
  orco: { vita: 120, v: 38, oro: 12, armatura: 2, danno: 2 },
  scudo: { vita: 70, v: 48, oro: 10, armatura: 6, danno: 1 },
  drago: { vita: 650, v: 32, oro: 60, armatura: 3, danno: 5 },
};
const DIFF = { facile: { vita: 0.8, oro: 190 }, medio: { vita: 1, oro: 160 }, difficile: { vita: 1.25, oro: 140 } };
const ONDATE = [10, 15, 20];
const ATTESA = 12, PRIMA = 20, VITE = 20;
const BOT = {
  facile: { pausa: [3, 5], tipi: ['arciere'], migliora: 0, scelta: 0.5, pronto: false },
  medio: { pausa: [1.4, 2.4], tipi: ['arciere', 'arciere', 'ghiaccio', 'cannone', 'arciere', 'fulmine'], migliora: 6, scelta: 0.1, pronto: true },
  difficile: { pausa: [0.6, 1], tipi: ['arciere', 'ghiaccio', 'cannone', 'arciere', 'fulmine', 'cannone', 'ghiaccio', 'fulmine'], migliora: 4, scelta: 0, pronto: true },
};

function prossimo(r) { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function ricampiona(pt) {
  const out = [pt[0]];
  let resto = 0;
  for (let i = 1; i < pt.length; i++) {
    let [x0, y0] = pt[i - 1]; const [x1, y1] = pt[i];
    let l = Math.hypot(x1 - x0, y1 - y0);
    while (resto + l >= PASSO) { const k = (PASSO - resto) / l; x0 += (x1 - x0) * k; y0 += (y1 - y0) * k; l = Math.hypot(x1 - x0, y1 - y0); out.push([x0, y0]); resto = 0; }
    resto += l;
  }
  return out;
}
// le strade: da sole una lunga che gira attorno alla torre; in più giocatori una per angolo (tutte uguali, specchiate)
function strade(n) {
  if (n === 1) return [[[-20, 140], [780, 140], [780, 460], [140, 460], [140, 220], [700, 220], [700, 380], [450, 380], [450, 300]]];
  const base = [[-20, 60], [350, 60], [350, 140], [90, 140], [90, 220], [380, 220], [450, 300]];
  const sp = [[1, 1], [-1, -1], [-1, 1], [1, -1]].slice(0, n);
  return sp.map(([sx, sy]) => base.map(([x, y]) => [sx > 0 ? x : W - x, sy > 0 ? y : H - y]));
}
function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const k = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0;
  return Math.hypot(px - a[0] - dx * k, py - a[1] - dy * k);
}
// la composizione dell'ondata k (da 1): sempre la stessa per lo stesso seme
function ondata(k, tot, rnd) {
  const lista = [], quanti = 6 + Math.round(k * 1.6);
  for (let i = 0; i < quanti; i++) {
    const r = prossimo(rnd);
    let tipo = 'goblin';
    if (k >= 3 && r < 0.3) tipo = 'lupo';
    else if (k >= 4 && r < 0.48) tipo = 'orco';
    else if (k >= 6 && r < 0.65) tipo = 'scudo';
    lista.push([tipo === 'lupo' ? 0.45 : 0.85, tipo]);
  }
  if (k % 5 === 0 || k === tot) lista.push([1.5, 'drago']);
  return lista;
}

// !win + parola segreta: per 25 secondi le torrette di chi lo usa fanno il triplo dei danni
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}

class Difesa extends Arena {
  constructor(o) {
    super(o, { id: 'difesa', round: 1, tickMs: 50 });
    this.nRound = 1;
    this.W = W; this.H = H;
    const op = o.opzioni || {};
    this.modo = this.n > 1 && op.modo === 'sfida' ? 'sfida' : 'squadra';
    this.diff = DIFF[op.difficolta] ? op.difficolta : 'medio';
    this.totale = ONDATE.includes(Number(op.ondate)) ? Number(op.ondate) : 10;
    this.seme = Number.isFinite(op.seme) ? op.seme >>> 0 : Math.floor(Math.random() * 2 ** 31);
    this.vie = strade(this.n).map((w) => { const p = ricampiona(w); return { w, p, L: (p.length - 1) * PASSO }; });
    this.veloce = this.n === 1 ? 1.5 : 1;
    this.preparaCelle();
    this.menti = {};
    this.avvia();
  }
  // le caselle dove si può costruire: lontane dalle strade e dalla torre; ognuna è della strada più vicina
  preparaCelle() {
    this.celle = [];
    for (let j = 0; j < H / CELLA; j++) {
      for (let i = 0; i < Math.floor(W / CELLA); i++) {
        const x = 30 + i * CELLA, y = 20 + j * CELLA;
        if (Math.hypot(x - TORRE.x, y - TORRE.y) < TORRE.r + 22) continue;
        const d = this.vie.map((v) => { let m = Infinity; for (let k = 1; k < v.w.length; k++) m = Math.min(m, distSeg(x, y, v.w[k - 1], v.w[k])); return m; });
        const min = Math.min(...d);
        if (min < LARGA + 18) continue;
        const zona = d.indexOf(min);
        // quanta strada si vede da qui (per il computer)
        const v = this.vie[zona], cop = {};
        for (const [t, def] of Object.entries(TORRI)) { let c = 0; for (let k = 0; k < v.p.length; k += 3) if (Math.hypot(v.p[k][0] - x, v.p[k][1] - y) < def.raggio) c++; cop[t] = c; }
        this.celle.push({ i, j, x, y, zona, cop });
      }
    }
  }

  iniziaRound() {
    this.mostri = []; this.torri = []; this.effetti = []; this.nId = 0;
    this.oro = new Array(this.n).fill(DIFF[this.diff].oro);
    this.vite = this.modo === 'squadra' ? VITE + 5 * (this.n - 1) : null;
    this.viteP = new Array(this.n).fill(VITE);
    this.fuori = new Array(this.n).fill(false);
    this.k = 0; this.stadio = 'attesa'; this.fino = PRIMA; this.coda = []; this.prossimoM = 0;
    this.pronti = new Array(this.n).fill(false);
    this.rnd = { a: this.seme };
    this.esito = null;
    this.winOn = {};
  }
  spostaTempi() {}
  pos(v, s) {
    const p = this.vie[v].p, k = Math.max(0, Math.min(p.length - 1.001, s / PASSO)), i = Math.floor(k), f = k - i;
    return [p[i][0] + (p[i + 1][0] - p[i][0]) * f, p[i][1] + (p[i + 1][1] - p[i][1]) * f];
  }
  vivi() { return Array.from({ length: this.n }, (_, i) => i).filter((p) => !this.fuori[p]); }

  // ---- le azioni (dal mouse o dal computer) ----
  azione(p, a) {
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    if (this.finita || (this.fase !== 'gioco' && this.fase !== 'via')) return { errore: 'Adesso no' };
    if (this.fuori[p]) return { errore: 'La tua porta è caduta' };
    if (a.tipo === 'costruisci') return this.costruisci(p, Number(a.i), Number(a.j), a.torre);
    if (a.tipo === 'migliora') return this.migliora(p, Number(a.id));
    if (a.tipo === 'vendi') return this.vendi(p, Number(a.id));
    if (a.tipo === 'pronto') { if (this.stadio !== 'attesa') return { errore: 'L\'ondata è già partita' }; this.pronti[p] = true; this.cambiato = true; return { ok: true }; }
    return { errore: 'Mossa non valida' };
  }
  cella(i, j) { return this.celle.find((c) => c.i === i && c.j === j); }
  costruisci(p, i, j, tipo) {
    const c = this.cella(i, j), def = TORRI[tipo];
    if (!def) return { errore: 'Torretta sconosciuta' };
    if (!c) return { errore: 'Qui non si può costruire' };
    if (this.n > 1 && c.zona !== p) return { errore: 'Costruisci vicino alla tua strada' };
    if (this.torri.some((t) => t.i === i && t.j === j)) return { errore: 'C\'è già una torretta' };
    if (this.oro[p] < def.costo) return { errore: `Servono ${def.costo} monete` };
    this.oro[p] -= def.costo;
    this.torri.push({ id: ++this.nId, tipo, i, j, x: c.x, y: c.y, liv: 1, chi: p, ric: 0, spesa: def.costo, ang: -Math.PI / 2 });
    this.effetti.push(['n', c.x, c.y]);
    this.cambiato = true;
    return { ok: true };
  }
  costoMiglioria(t) { return t.liv >= 3 ? null : Math.round(TORRI[t.tipo].costo * (t.liv === 1 ? 0.75 : 1.1)); }
  migliora(p, id) {
    const t = this.torri.find((x) => x.id === id);
    if (!t || t.chi !== p) return { errore: 'Non è una tua torretta' };
    const c = this.costoMiglioria(t);
    if (c === null) return { errore: 'È già al massimo' };
    if (this.oro[p] < c) return { errore: `Servono ${c} monete` };
    this.oro[p] -= c; t.liv++; t.spesa += c;
    this.effetti.push(['u', t.x, t.y]);
    this.cambiato = true;
    return { ok: true };
  }
  vendi(p, id) {
    const k = this.torri.findIndex((x) => x.id === id);
    if (k < 0 || this.torri[k].chi !== p) return { errore: 'Non è una tua torretta' };
    const t = this.torri.splice(k, 1)[0];
    this.oro[p] += Math.floor(t.spesa * 0.7);
    this.effetti.push(['v', t.x, t.y]);
    this.cambiato = true;
    return { ok: true };
  }
  // i valori della torretta al suo livello
  stat(t) {
    const d = TORRI[t.tipo], m = t.liv - 1;
    return { raggio: d.raggio + m * 15, danno: d.danno * (1 + m * 0.6), ogni: d.ogni * (1 - m * 0.1), area: d.area, lento: d.lento, salti: d.salti ? d.salti + m : 0 };
  }

  // ---- il mondo ----
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound;
    if (this.stadio === 'attesa') {
      // si parte allo scadere o quando sono tutti pronti; chi è pronto prima prende un premio
      const tutti = this.vivi().every((p) => this.pronti[p]);
      if (t >= this.fino || tutti) {
        const premio = Math.max(0, Math.floor(this.fino - t)) * 2;
        if (premio) for (const p of this.vivi()) this.oro[p] += premio;
        this.k++; this.stadio = 'onda';
        this.coda = ondata(this.k, this.totale, this.rnd); this.prossimoM = t;
        this.pronti.fill(false);
        this.annuncia(null, `Ondata ${this.k} di ${this.totale}${this.coda.some((x) => x[1] === 'drago') ? ': arriva il drago! 🐉' : ''}`, '', this.k === this.totale);
        this.effetti.push(['o', this.k]);
        this.cambiato = true;
      }
    } else if (this.coda.length && t >= this.prossimoM) {
      const [dopo, tipo] = this.coda.shift();
      const m = MOSTRI[tipo], vita = m.vita * DIFF[this.diff].vita * Math.pow(1.17, this.k - 1);
      for (const v of this.vivi()) this.mostri.push({ id: ++this.nId, tipo, v, s: 0, vita, max: vita, lento: 0 });
      this.prossimoM = t + dopo;
    }
    this.muoviMostri(dt);
    this.spara(dt);
    // fine dell'ondata
    if (this.stadio === 'onda' && !this.coda.length && !this.mostri.length) {
      for (const p of this.vivi()) { const b = 20 + this.k * 5; this.oro[p] += b; this.punti[p] += b; }
      if (this.k >= this.totale) { this.esito = 'vinta'; return true; }
      this.stadio = 'attesa'; this.fino = t + ATTESA;
      this.effetti.push(['f', this.k]);
      this.cambiato = true;
    }
    if (this.modo === 'squadra' && this.vite <= 0) { this.esito = 'persa'; return true; }
    if (this.modo === 'sfida' && this.vivi().length <= 1) { this.esito = 'sfida'; return true; }
    return false;
  }
  muoviMostri(dt) {
    for (const m of this.mostri.slice()) {
      const d = MOSTRI[m.tipo];
      m.lento = Math.max(0, m.lento - dt);
      m.s += d.v * this.veloce * (m.lento ? 0.5 : 1) * dt;
      if (m.s >= this.vie[m.v].L - TORRE.r) {
        this.mostri.splice(this.mostri.indexOf(m), 1);
        this.effetti.push(['x', m.v, d.danno]);
        if (this.modo === 'squadra') this.vite = Math.max(0, this.vite - d.danno);
        else {
          this.viteP[m.v] = Math.max(0, this.viteP[m.v] - d.danno);
          if (!this.viteP[m.v] && !this.fuori[m.v]) {
            this.fuori[m.v] = true;
            this.mostri = this.mostri.filter((x) => x.v !== m.v);
            this.annuncia(m.v, 'ha perso la sua porta 🏚️', 'La tua porta è caduta 🏚️', true);
          }
        }
        this.cambiato = true;
      }
    }
  }
  colpisci(m, danno, magico, chi) {
    const d = MOSTRI[m.tipo];
    m.vita -= magico ? danno : Math.max(1, danno - d.armatura);
    if (m.vita <= 0 && this.mostri.includes(m)) {
      this.mostri.splice(this.mostri.indexOf(m), 1);
      this.oro[chi] += d.oro; this.punti[chi] += d.oro;
      const [x, y] = this.pos(m.v, m.s);
      this.effetti.push(['m', Math.round(x), Math.round(y), d.oro, chi, m.tipo]);
      this.cambiato = true;
    }
  }
  spara(dt) {
    if (!this.mostri.length) return;
    const xy = new Map(this.mostri.map((m) => [m, this.pos(m.v, m.s)]));
    for (const t of this.torri) {
      t.ric = Math.max(0, t.ric - dt);
      if (t.ric || this.fuori[t.chi]) continue;
      const s = this.stat(t), molt = this.winOn[t.chi] ? 3 : 1;
      // il bersaglio: il mostro nel raggio più avanti sulla strada
      let best = null;
      for (const m of this.mostri) { const q = xy.get(m); if (!q || Math.hypot(q[0] - t.x, q[1] - t.y) > s.raggio) continue; if (!best || m.s / this.vie[m.v].L > best.s / this.vie[best.v].L) best = m; }
      if (!best) continue;
      t.ric = s.ogni;
      const [bx, by] = xy.get(best);
      t.ang = Math.atan2(by - t.y, bx - t.x);
      if (t.tipo === 'cannone') {
        this.effetti.push(['c', t.id, Math.round(bx), Math.round(by)]);
        for (const m of this.mostri.slice()) { const q = xy.get(m); if (q && Math.hypot(q[0] - bx, q[1] - by) < s.area) this.colpisci(m, s.danno * molt, false, t.chi); }
      } else if (t.tipo === 'fulmine') {
        // il fulmine salta da un mostro al più vicino
        const presi = [best];
        let ult = best;
        while (presi.length < s.salti) {
          const q0 = xy.get(ult);
          const n = this.mostri.filter((m) => !presi.includes(m)).map((m) => [m, Math.hypot(xy.get(m)[0] - q0[0], xy.get(m)[1] - q0[1])]).filter(([, d]) => d < 90).sort((a, b) => a[1] - b[1])[0];
          if (!n) break;
          presi.push(n[0]); ult = n[0];
        }
        this.effetti.push(['l', t.id, presi.map((m) => xy.get(m).map(Math.round))]);
        presi.forEach((m, k) => this.colpisci(m, s.danno * molt * (k ? 0.7 : 1), true, t.chi));
      } else {
        this.effetti.push([t.tipo === 'ghiaccio' ? 'g' : 'a', t.id, Math.round(bx), Math.round(by)]);
        if (s.lento) best.lento = s.lento;
        this.colpisci(best, s.danno * molt, false, t.chi);
      }
    }
  }
  fineRound() {}
  chiudi() {
    super.chiudi();
    const r = this.risultato, tutti = Array.from({ length: this.n }, (_, i) => i);
    if (this.modo === 'squadra') {
      const vinta = this.esito === 'vinta';
      r.vincitori = vinta ? tutti : []; r.pareggio = false;
      const chi = this.n === 1 ? 'Hai' : 'Avete';
      r.titolo = vinta ? `${chi} difeso la torre: ${this.totale} ondate su ${this.totale}! 🏰` : `La torre è caduta all'ondata ${this.k} di ${this.totale}`;
    } else {
      const vivi = this.vivi();
      const best = vivi.length ? vivi.reduce((a, b) => (this.viteP[b] > this.viteP[a] || (this.viteP[b] === this.viteP[a] && this.punti[b] > this.punti[a]) ? b : a)) : -1;
      const pari = vivi.filter((p) => p !== best && this.viteP[p] === this.viteP[best] && this.punti[p] === this.punti[best]);
      r.vincitori = best < 0 || pari.length ? [] : [best]; r.pareggio = pari.length > 0;
      r.titolo = best < 0 ? 'Tutte le porte sono cadute' : this.esito === 'vinta' ? `Fine delle ${this.totale} ondate` : `Resta in piedi solo una porta (ondata ${this.k})`;
    }
  }

  // ---- il computer: costruisce dove vede più strada, poi migliora; pronto quando ha speso ----
  pensa(p, liv) {
    const B = BOT[liv] || BOT.medio, m = this.menti[p] || (this.menti[p] = { pausa: 1 + Math.random(), n: 0 });
    if (this.fuori[p] || this.fase !== 'gioco') return {};
    m.pausa -= this.tickMs / 1000;
    if (m.pausa > 0) return {};
    m.pausa = B.pausa[0] + Math.random() * (B.pausa[1] - B.pausa[0]);
    const mie = this.torri.filter((t) => t.chi === p);
    let fatto = false;
    // migliorare (ogni tanto, dopo un po' di torrette): la torretta che vede più strada
    if (B.migliora && mie.length >= B.migliora && m.n % 2) {
      const t = mie.filter((x) => this.costoMiglioria(x) !== null).sort((a, b) => this.cella(b.i, b.j).cop[b.tipo] - this.cella(a.i, a.j).cop[a.tipo])[0];
      if (t && this.oro[p] >= this.costoMiglioria(t)) { this.migliora(p, t.id); fatto = true; m.n++; }
    }
    if (!fatto) {
      const tipo = B.tipi[mie.length % B.tipi.length];
      if (this.oro[p] >= TORRI[tipo].costo) {
        const libere = this.celle.filter((c) => (this.n === 1 || c.zona === p) && !this.torri.some((t) => t.i === c.i && t.j === c.j) && c.cop[tipo] > 0).sort((a, b) => b.cop[tipo] - a.cop[tipo]);
        const tra = Math.max(1, Math.ceil(libere.length * B.scelta));
        const c = libere[Math.floor(Math.random() * tra)];
        if (c) { this.costruisci(p, c.i, c.j, tipo); fatto = true; m.n++; }
      } else if (B.migliora && mie.length >= B.migliora) m.n++;
    }
    if (B.pronto && this.stadio === 'attesa' && !fatto && this.oro[p] < 50) this.pronti[p] = true;
    return {};
  }

  vistaExtra() {
    return {
      W, H, CELLA, LARGA, torre: TORRE, modo: this.modo, totale: this.totale,
      strade: this.vie.map((v) => v.w), celle: this.celle.map((c) => [c.i, c.j, c.zona]),
      torri: Object.fromEntries(Object.entries(TORRI).map(([k, d]) => [k, { nome: d.nome, costo: d.costo, raggio: d.raggio }])),
    };
  }
  statoTick() {
    const r = Math.round, eff = this.effetti; this.effetti = [];
    return {
      m: this.mostri.map((m) => { const [x, y] = this.pos(m.v, m.s); return [m.id, m.tipo, r(x), r(y), r((m.vita / m.max) * 100), m.lento ? 1 : 0]; }),
      t: this.torri.map((t) => [t.id, t.tipo, t.i, t.j, t.liv, t.chi, Math.round(t.ang * 100) / 100, this.costoMiglioria(t), Math.floor(t.spesa * 0.7), r(this.stat(t).raggio)]),
      e: eff, oro: this.oro.slice(), vite: this.vite, vp: this.viteP.slice(), fu: this.fuori.slice(), k: this.k, st: this.stadio,
      fra: this.stadio === 'attesa' ? Math.max(0, Math.ceil(this.fino - this.tempoRound)) : 0, pr: this.pronti.slice(), w: Object.keys(this.winOn).filter((k) => this.winOn[k]).map(Number),
    };
  }
}

module.exports = {
  meta: {
    id: 'difesa',
    nome: 'Difesa della torre',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'I mostri arrivano a ondate lungo le strade: costruisci arcieri, cannoni, torri di ghiaccio e fulmini per fermarli prima della torre. Da soli, in squadra (una strada a testa) o in sfida.',
    alias: ['difesa della torre', 'tower defense', 'difesa', 'torri', 'torre', 'td'],
    opzioni: [
      { id: 'modo', nome: 'In più giocatori', valori: ['squadra', 'sfida'], etichette: ['In squadra (una torre per tutti)', 'Sfida (ognuno la sua porta)'], predefinito: 'squadra' },
      { id: 'ondate', nome: 'Ondate', valori: ONDATE, etichette: ['10 ondate', '15 ondate', '20 ondate'], predefinito: 10 },
      { id: 'difficolta', nome: 'Difficoltà', valori: ['facile', 'medio', 'difficile'], etichette: ['Facile', 'Media', 'Difficile'], predefinito: 'medio' },
    ],
    regole: [
      'I mostri arrivano a ondate lungo la strada verso la torre al centro. Ogni mostro che arriva toglie vite (il drago 5): a zero vite la torre cade.',
      'Clic su un prato libero vicino alla tua strada (sul telefono un tocco) e scegli la torretta da costruire. Clic su una tua torretta per migliorarla (fino al livello 3) o venderla (ti ridà il 70% di quanto hai speso).',
      'Arciere (50 monete): tira spesso e lontano. Cannone (90): colpisce tutti i mostri vicini al punto dove cade. Ghiaccio (70): fa pochi danni ma rallenta i mostri. Fulmine (120): salta da un mostro all\'altro e passa le armature.',
      'Ogni mostro ucciso dà monete a chi l\'ha ucciso; alla fine di ogni ondata c\'è un premio per tutti. Tra un\'ondata e l\'altra c\'è una pausa: con "Pronto!" la fai partire prima e prendi 2 monete per ogni secondo risparmiato (quando sono pronti tutti).',
      'Mostri: goblin, lupi veloci, orchi robusti, guerrieri con lo scudo (l\'armatura toglie danni a ogni colpo, tranne al fulmine) e ogni 5 ondate un drago.',
      'In più giocatori ognuno ha la sua strada e costruisce solo vicino a quella. In squadra difendete insieme la stessa torre, con le vite in comune. In sfida ognuno ha la sua porta e le sue vite, con le stesse ondate per tutti: vince chi resta in piedi (o, finite le ondate, chi ha più vite).',
      'Il computer facile costruisce solo arcieri, piano e un po\' a caso; il medio mescola le torrette e le migliora; il difficile è svelto, mette le torrette dove vedono più strada e le migliora presto.',
    ],
  },
  crea: (o) => new Difesa(o),
  bot: () => ({}),
  _test: { Difesa, TORRI, MOSTRI, strade, ondata, W, H, CELLA },
};
