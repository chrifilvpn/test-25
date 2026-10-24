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
// i mostri: vita, velocità, monete, armatura, vite che tolgono, grandezza (r) e i poteri: volante (il cannone non lo
// prende), rigenera (parte della vita al secondo), immune (al rallentamento), divide (alla morte si divide), cura (i
// vicini), fase (a tratti evanescente: lo prende solo il fulmine), scava (a tratti sottoterra: non lo prende nessuno),
// rialza (si rialza una volta), evoca (chiama altri mostri). boss: i capi che arrivano ogni 5 ondate.
const MOSTRI = {
  goblin: { vita: 32, v: 58, oro: 5, armatura: 0, danno: 1, r: 11 },
  lupo: { vita: 22, v: 98, oro: 6, armatura: 0, danno: 1, r: 10 },
  orco: { vita: 120, v: 38, oro: 12, armatura: 2, danno: 2, r: 14 },
  scudo: { vita: 70, v: 48, oro: 10, armatura: 6, danno: 1, r: 12 },
  drago: { vita: 650, v: 32, oro: 60, armatura: 3, danno: 5, r: 22, boss: true },
  predone: { vita: 34, v: 60, oro: 5, armatura: 0, danno: 1, r: 11 },
  scorpione: { vita: 50, v: 70, oro: 8, armatura: 4, danno: 1, r: 12 },
  mummia: { vita: 130, v: 34, oro: 12, armatura: 1, danno: 2, r: 13, rigenera: 0.04 },
  avvoltoio: { vita: 28, v: 90, oro: 7, armatura: 0, danno: 1, r: 12, volante: true },
  verme: { vita: 560, v: 30, oro: 70, armatura: 2, danno: 5, r: 24, boss: true, scava: { ogni: 5, dura: 1.6 } },
  pinguino: { vita: 30, v: 62, oro: 5, armatura: 0, danno: 1, r: 10 },
  lupobianco: { vita: 26, v: 102, oro: 6, armatura: 0, danno: 1, r: 10 },
  spirito: { vita: 34, v: 68, oro: 8, armatura: 0, danno: 1, r: 11, volante: true },
  yeti: { vita: 150, v: 38, oro: 13, armatura: 2, danno: 2, r: 15, immune: true },
  gigante: { vita: 750, v: 28, oro: 70, armatura: 6, danno: 5, r: 25, boss: true, immune: true },
  slimino: { vita: 22, v: 62, oro: 3, armatura: 0, danno: 1, r: 8 },
  slime: { vita: 60, v: 46, oro: 6, armatura: 0, danno: 1, r: 12, divide: ['slimino', 2] },
  ragnetto: { vita: 10, v: 96, oro: 1, armatura: 0, danno: 1, r: 6 },
  ragno: { vita: 40, v: 84, oro: 7, armatura: 1, danno: 1, r: 11, divide: ['ragnetto', 3] },
  zanzara: { vita: 22, v: 98, oro: 6, armatura: 0, danno: 1, r: 9, volante: true },
  rana: { vita: 70, v: 42, oro: 12, armatura: 0, danno: 1, r: 12, cura: { ogni: 3, raggio: 85, quanto: 0.15 } },
  idra: { vita: 620, v: 30, oro: 70, armatura: 2, danno: 5, r: 24, boss: true, rigenera: 0.02 },
  magmino: { vita: 28, v: 56, oro: 5, armatura: 0, danno: 1, r: 9 },
  salamandra: { vita: 45, v: 94, oro: 8, armatura: 1, danno: 1, r: 11, immune: true },
  diavoletto: { vita: 34, v: 86, oro: 8, armatura: 0, danno: 1, r: 10, volante: true },
  golem: { vita: 160, v: 34, oro: 12, armatura: 4, danno: 2, r: 15, divide: ['magmino', 2] },
  demone: { vita: 640, v: 30, oro: 75, armatura: 3, danno: 5, r: 25, boss: true, rigenera: 0.015 },
  zombie: { vita: 48, v: 36, oro: 5, armatura: 0, danno: 1, r: 12 },
  pipistrello: { vita: 20, v: 108, oro: 5, armatura: 0, danno: 1, r: 9, volante: true },
  scheletro: { vita: 45, v: 56, oro: 7, armatura: 1, danno: 1, r: 11, rialza: true },
  fantasma: { vita: 50, v: 60, oro: 9, armatura: 0, danno: 1, r: 12, fase: { ogni: 4, dura: 2 } },
  negromante: { vita: 600, v: 30, oro: 70, armatura: 2, danno: 5, r: 22, boss: true, evoca: { ogni: 7, tipo: 'scheletro', n: 2 } },
};
// le curve morbide: una spline che passa per i punti dati
function curva(pt, passi = 10) {
  const out = [];
  for (let i = 0; i < pt.length - 1; i++) {
    const p0 = pt[Math.max(0, i - 1)], p1 = pt[i], p2 = pt[i + 1], p3 = pt[Math.min(pt.length - 1, i + 2)];
    for (let k = 0; k < passi; k++) {
      const t = k / passi, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => Math.round(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))));
    }
  }
  out.push(pt[pt.length - 1]);
  return out;
}
// LE MAPPE: ognuna con le sue strade (una da soli, "base" è quella di un angolo in più giocatori, specchiata per gli
// altri), i suoi mostri (base + [tipo, da quale ondata, soglia] + il capo) e la sua regola: vel (velocità dei mostri),
// raggio (delle torrette), molti (quanti mostri in più), gelo (quanto dura il rallentamento), evento (ogni tanto).
const MAPPE = {
  prato: {
    nome: 'Valle verde', emoji: '🌳', stelle: 1, regola: 'la mappa classica, senza sorprese',
    una: [[-20, 140], [780, 140], [780, 460], [140, 460], [140, 220], [700, 220], [700, 380], [450, 380], [450, 300]],
    base: [[-20, 60], [350, 60], [350, 140], [90, 140], [90, 220], [380, 220], [450, 300]],
    mostri: ['goblin', [['lupo', 3, 0.3], ['orco', 4, 0.48], ['scudo', 6, 0.65]], 'drago'],
  },
  deserto: {
    nome: 'Dune del deserto', emoji: '🏜️', stelle: 3, regola: 'ogni tanto arriva una tempesta di sabbia: per qualche secondo le torrette vedono molto meno lontano',
    una: curva([[-20, 90], [420, 70], [800, 110], [820, 230], [560, 190], [300, 200], [110, 260], [120, 470], [400, 540], [700, 510], [790, 380], [640, 330], [450, 300]]),
    base: curva([[-20, 60], [250, 40], [370, 110], [220, 160], [90, 190], [170, 250], [340, 235], [450, 300]]),
    mostri: ['predone', [['avvoltoio', 2, 0.25], ['scorpione', 3, 0.45], ['mummia', 5, 0.62]], 'verme'],
    evento: { tipo: 'tempesta', ogni: 32, dura: 8, raggio: 0.6, testo: 'Tempesta di sabbia! Le torrette vedono meno 🌪️' },
  },
  ghiacciaio: {
    nome: 'Ghiacciaio', emoji: '❄️', stelle: 2, regola: 'sul ghiaccio i mostri scivolano più veloci, ma il ghiaccio delle torrette li rallenta il doppio',
    una: [[60, -20], [60, 540], [190, 540], [190, 80], [320, 80], [320, 540], [580, 540], [580, 80], [710, 80], [710, 540], [840, 540], [840, 30], [450, 30], [450, 300]],
    base: [[60, -20], [60, 250], [150, 250], [150, 50], [250, 50], [250, 160], [370, 160], [450, 300]],
    mostri: ['pinguino', [['lupobianco', 2, 0.3], ['spirito', 4, 0.45], ['yeti', 5, 0.6]], 'gigante'],
    vel: 1.2, gelo: 2,
  },
  palude: {
    nome: 'Palude nebbiosa', emoji: '🐸', stelle: 2, regola: 'nel fango i mostri sono più lenti, ma la nebbia accorcia la vista delle torrette e i mostri sono di più',
    una: curva([[-20, 520], [150, 560], [260, 420], [140, 300], [180, 110], [380, 60], [560, 130], [520, 220], [380, 180], [300, 300], [440, 430], [640, 460], [790, 360], [760, 170], [640, 260], [450, 300]]),
    base: curva([[-20, 170], [110, 220], [200, 140], [120, 70], [230, 30], [370, 80], [300, 160], [370, 240], [450, 300]]),
    mostri: ['slimino', [['slime', 2, 0.3], ['ragno', 3, 0.48], ['zanzara', 4, 0.62], ['rana', 6, 0.72]], 'idra'],
    vel: 0.85, raggio: 0.85, molti: 1.3,
  },
  vulcano: {
    nome: 'Vulcano', emoji: '🌋', stelle: 3, regola: 'ogni tanto il vulcano erutta: per qualche secondo i mostri corrono molto più veloci',
    una: curva([[920, 560], [600, 560], [380, 520], [130, 540], [70, 400], [200, 330], [110, 190], [180, 60], [420, 90], [640, 50], [820, 130], [780, 300], [620, 250], [560, 180], [450, 300]], 8),
    base: curva([[-20, 270], [60, 180], [40, 70], [170, 40], [230, 150], [320, 60], [400, 140], [360, 230], [450, 300]]),
    mostri: ['magmino', [['salamandra', 2, 0.28], ['diavoletto', 3, 0.45], ['golem', 5, 0.62]], 'demone'],
    evento: { tipo: 'eruzione', ogni: 30, dura: 6, vel: 1.35, testo: 'Il vulcano erutta! I mostri corrono 🌋' },
  },
  cimitero: {
    nome: 'Cimitero di notte', emoji: '🦇', stelle: 2, regola: 'di notte le torrette vedono meno; i fantasmi a tratti diventano evanescenti (li prende solo il fulmine) e gli scheletri si rialzano',
    una: [[450, 620], [450, 540], [80, 540], [80, 60], [820, 60], [820, 540], [600, 540], [600, 150], [300, 150], [300, 430], [450, 430], [450, 300]],
    base: [[160, -20], [160, 140], [50, 140], [50, 250], [270, 250], [270, 60], [380, 60], [380, 200], [450, 300]],
    mostri: ['zombie', [['pipistrello', 2, 0.25], ['scheletro', 3, 0.45], ['fantasma', 5, 0.62]], 'negromante'],
    raggio: 0.85,
  },
};
const ELENCO = Object.keys(MAPPE);
const CAPI = { drago: 'il drago! 🐉', verme: 'il verme delle sabbie! 🪱', gigante: 'il gigante di ghiaccio! 🧊', idra: 'l\'idra della palude! 🐍', demone: 'il demone di lava! 👹', negromante: 'il negromante! 💀' };
// l'anteprima di ogni mappa nella sala d'attesa: il terreno, la strada e la torre
const TINTE = { prato: ['#5d9b46', '#d7b87c'], deserto: ['#e2bf7e', '#b98a4e'], ghiacciaio: ['#dcecf7', '#9fc4dd'], palude: ['#3f5a3a', '#6b5a3c'], vulcano: ['#3a2b2a', '#8a3a22'], cimitero: ['#26303f', '#6d6a63'] };
function anteprima(id) {
  const [prato, terra] = TINTE[id], d = MAPPE[id].una.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return `<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="600" fill="${prato}"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="46" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${terra}" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/><circle cx="450" cy="300" r="44" fill="#9a9488" stroke="#5f5a50" stroke-width="8"/><text x="450" y="318" font-size="48" text-anchor="middle">${MAPPE[id].emoji}</text></svg>`;
}
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
// le strade: da soli una lunga che gira attorno alla torre; in più giocatori una per angolo (tutte uguali, specchiate)
function strade(n, mappa = 'prato') {
  const M = MAPPE[mappa] || MAPPE.prato;
  if (n === 1) return [M.una];
  const base = M.base;
  const sp = [[1, 1], [-1, -1], [-1, 1], [1, -1]].slice(0, n);
  return sp.map(([sx, sy]) => base.map(([x, y]) => [sx > 0 ? x : W - x, sy > 0 ? y : H - y]));
}
function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const k = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0;
  return Math.hypot(px - a[0] - dx * k, py - a[1] - dy * k);
}
// la composizione dell'ondata k (da 1): sempre la stessa per lo stesso seme; ogni 5 ondate (e all'ultima) il capo
function ondata(k, tot, rnd, mappa = 'prato') {
  const M = MAPPE[mappa] || MAPPE.prato, [base, altri, capo] = M.mostri;
  const lista = [], quanti = Math.round((6 + Math.round(k * 1.6)) * (M.molti || 1));
  for (let i = 0; i < quanti; i++) {
    const r = prossimo(rnd), x = altri.find(([, da, soglia]) => k >= da && r < soglia), tipo = x ? x[0] : base;
    lista.push([MOSTRI[tipo].v > 85 ? 0.45 : 0.85, tipo]);
  }
  if (k % 5 === 0 || k === tot) lista.push([1.5, capo]);
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
    this.mappa = MAPPE[op.mappa] ? op.mappa : op.mappa === 'caso' ? ELENCO[Math.floor(Math.random() * ELENCO.length)] : 'prato';
    this.M = MAPPE[this.mappa];
    this.vie = strade(this.n, this.mappa).map((w) => { const p = ricampiona(w); return { w, p, L: (p.length - 1) * PASSO }; });
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
    this.evT = this.M.evento ? this.M.evento.ogni * 0.6 : 0; this.evOn = 0;
  }
  // la regola della mappa (e l'evento in corso): quanto vedono le torrette, quanto corrono i mostri
  raggioX() { const e = this.M.evento; return (this.M.raggio || 1) * (this.evOn && e.raggio ? e.raggio : 1); }
  velX() { const e = this.M.evento; return (this.M.vel || 1) * (this.evOn && e.vel ? e.vel : 1); }
  // un mostro nuovo sulla strada v alla distanza s, con la vita dell'ondata
  nuovoMostro(tipo, v, s) {
    const d = MOSTRI[tipo], vita = d.vita * DIFF[this.diff].vita * Math.pow(1.17, Math.max(0, this.k - 1));
    const m = { id: ++this.nId, tipo, v, s: Math.max(0, s), vita, max: vita, lento: 0, t: 0 };
    this.mostri.push(m);
    return m;
  }
  // a tratti evanescente (fantasma), sottoterra (verme) o a terra mentre si rialza (scheletro)
  evanescente(m) { const f = MOSTRI[m.tipo].fase; return !!f && (m.t + m.id * 0.7) % f.ogni > f.ogni - f.dura; }
  sotto(m) { const f = MOSTRI[m.tipo].scava; return !!f && (m.t + 1) % f.ogni > f.ogni - f.dura; }
  intoccabile(m) { return m.giu > 0 || this.sotto(m); }
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
    return { raggio: (d.raggio + m * 15) * this.raggioX(), danno: d.danno * (1 + m * 0.6), ogni: d.ogni * (1 - m * 0.1), area: d.area, lento: d.lento, salti: d.salti ? d.salti + m : 0 };
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
        this.coda = ondata(this.k, this.totale, this.rnd, this.mappa); this.prossimoM = t;
        this.pronti.fill(false);
        const capo = this.coda.find((x) => MOSTRI[x[1]].boss);
        this.annuncia(null, `Ondata ${this.k} di ${this.totale}${capo ? `: arriva ${CAPI[capo[1]]}` : ''}`, '', this.k === this.totale);
        this.effetti.push(['o', this.k]);
        this.cambiato = true;
      }
    } else if (this.coda.length && t >= this.prossimoM) {
      const [dopo, tipo] = this.coda.shift();
      for (const v of this.vivi()) this.nuovoMostro(tipo, v, 0);
      this.prossimoM = t + dopo;
    }
    // l'evento della mappa (tempesta, eruzione): solo durante le ondate
    const e = this.M.evento;
    if (e && this.stadio === 'onda') {
      if (this.evOn) { this.evOn = Math.max(0, this.evOn - dt); if (!this.evOn) { this.evT = e.ogni; this.cambiato = true; } }
      else if ((this.evT -= dt) <= 0) { this.evOn = e.dura; this.annuncia(null, e.testo, ''); this.effetti.push(['ev', e.tipo]); this.cambiato = true; }
    }
    this.poteri(dt);
    this.muoviMostri(dt);
    this.spara(dt);
    // fine dell'ondata
    if (this.stadio === 'onda' && !this.coda.length && !this.mostri.length) {
      for (const p of this.vivi()) { const b = 20 + this.k * 5; this.oro[p] += b; this.punti[p] += b; }
      if (this.k >= this.totale) { this.esito = 'vinta'; return true; }
      this.stadio = 'attesa'; this.fino = t + ATTESA;
      if (this.evOn) { this.evOn = 0; this.evT = this.M.evento.ogni; }
      this.effetti.push(['f', this.k]);
      this.cambiato = true;
    }
    if (this.modo === 'squadra' && this.vite <= 0) { this.esito = 'persa'; return true; }
    if (this.modo === 'sfida' && this.vivi().length <= 1) { this.esito = 'sfida'; return true; }
    return false;
  }
  muoviMostri(dt) {
    const vx = this.velX();
    for (const m of this.mostri.slice()) {
      const d = MOSTRI[m.tipo];
      m.lento = Math.max(0, m.lento - dt);
      if (m.giu > 0) { m.giu = Math.max(0, m.giu - dt); continue; }
      m.s += d.v * this.veloce * vx * (m.lento ? 0.5 : 1) * dt;
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
  // i poteri dei mostri: rigenerarsi, curare i vicini, evocare altri mostri
  poteri(dt) {
    for (const m of this.mostri.slice()) {
      const d = MOSTRI[m.tipo];
      m.t += dt;
      if (d.rigenera) m.vita = Math.min(m.max, m.vita + m.max * d.rigenera * dt);
      if (d.cura && (m.cura = (m.cura || d.cura.ogni) - dt) <= 0) {
        m.cura = d.cura.ogni;
        const [x, y] = this.pos(m.v, m.s);
        for (const o of this.mostri) { if (o.v !== m.v || o.vita >= o.max) continue; const [ox, oy] = this.pos(o.v, o.s); if (Math.hypot(ox - x, oy - y) < d.cura.raggio) o.vita = Math.min(o.max, o.vita + o.max * d.cura.quanto); }
        this.effetti.push(['h', Math.round(x), Math.round(y), d.cura.raggio]);
      }
      if (d.evoca && (m.evoca = (m.evoca === undefined ? 2 : m.evoca) - dt) <= 0) {
        m.evoca = d.evoca.ogni;
        for (let k = 0; k < d.evoca.n; k++) { const f = this.nuovoMostro(d.evoca.tipo, m.v, m.s - 14 - k * 16); f.giu = 0.8; f.rialzato = true; }
        const [x, y] = this.pos(m.v, m.s);
        this.effetti.push(['ev', 'evoca', Math.round(x), Math.round(y)]);
      }
    }
  }
  colpisci(m, danno, magico, chi) {
    const d = MOSTRI[m.tipo];
    if (this.intoccabile(m) || (!magico && this.evanescente(m))) return;
    m.vita -= magico ? danno : Math.max(1, danno - d.armatura);
    if (m.vita <= 0 && this.mostri.includes(m)) {
      const [x, y] = this.pos(m.v, m.s);
      // lo scheletro la prima volta cade a pezzi e si rialza con metà vita
      if (d.rialza && !m.rialzato) { m.rialzato = true; m.vita = m.max * 0.5; m.giu = 1.4; this.effetti.push(['r', Math.round(x), Math.round(y)]); return; }
      this.mostri.splice(this.mostri.indexOf(m), 1);
      this.oro[chi] += d.oro; this.punti[chi] += d.oro;
      this.effetti.push(['m', Math.round(x), Math.round(y), d.oro, chi, m.tipo]);
      if (d.divide) for (let k = 0; k < d.divide[1]; k++) this.nuovoMostro(d.divide[0], m.v, m.s - k * 9);
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
      // il cannone non prende i volanti; nessuno vede chi è sottoterra; gli evanescenti li vede solo il fulmine
      let best = null;
      for (const m of this.mostri) {
        const q = xy.get(m), d = MOSTRI[m.tipo];
        if (!q || Math.hypot(q[0] - t.x, q[1] - t.y) > s.raggio || this.intoccabile(m) || (t.tipo === 'cannone' && d.volante) || (t.tipo !== 'fulmine' && this.evanescente(m))) continue; if (!best || m.s / this.vie[m.v].L > best.s / this.vie[best.v].L) best = m; }
      if (!best) continue;
      t.ric = s.ogni;
      const [bx, by] = xy.get(best);
      t.ang = Math.atan2(by - t.y, bx - t.x);
      if (t.tipo === 'cannone') {
        this.effetti.push(['c', t.id, Math.round(bx), Math.round(by)]);
        for (const m of this.mostri.slice()) { const q = xy.get(m); if (q && !MOSTRI[m.tipo].volante && Math.hypot(q[0] - bx, q[1] - by) < s.area) this.colpisci(m, s.danno * molt, false, t.chi); }
      } else if (t.tipo === 'fulmine') {
        // il fulmine salta da un mostro al più vicino
        const presi = [best];
        let ult = best;
        while (presi.length < s.salti) {
          const q0 = xy.get(ult);
          const n = this.mostri.filter((m) => !presi.includes(m) && xy.get(m) && !this.intoccabile(m)).map((m) => [m, Math.hypot(xy.get(m)[0] - q0[0], xy.get(m)[1] - q0[1])]).filter(([, d]) => d < 90).sort((a, b) => a[1] - b[1])[0];
          if (!n) break;
          presi.push(n[0]); ult = n[0];
        }
        this.effetti.push(['l', t.id, presi.map((m) => xy.get(m).map(Math.round))]);
        presi.forEach((m, k) => this.colpisci(m, s.danno * molt * (k ? 0.7 : 1), true, t.chi));
      } else {
        this.effetti.push([t.tipo === 'ghiaccio' ? 'g' : 'a', t.id, Math.round(bx), Math.round(by)]);
        if (s.lento && !MOSTRI[best.tipo].immune) best.lento = s.lento * (this.M.gelo || 1);
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
      W, H, CELLA, LARGA, torre: TORRE, modo: this.modo, totale: this.totale, mappa: this.mappa, nomeMappa: `${this.M.emoji} ${this.M.nome}`, regola: this.M.regola,
      mostri: Object.fromEntries(Object.entries(MOSTRI).map(([k, d]) => [k, { r: d.r, volante: !!d.volante, boss: !!d.boss }])),
      strade: this.vie.map((v) => v.w), celle: this.celle.map((c) => [c.i, c.j, c.zona]),
      torri: Object.fromEntries(Object.entries(TORRI).map(([k, d]) => [k, { nome: d.nome, costo: d.costo, raggio: d.raggio }])),
    };
  }
  statoTick() {
    const r = Math.round, eff = this.effetti; this.effetti = [];
    return {
      // i mostri: lo stato come bit (1 rallentato, 2 evanescente, 4 sottoterra, 8 a terra che si rialza)
      m: this.mostri.map((m) => { const [x, y] = this.pos(m.v, m.s); return [m.id, m.tipo, r(x), r(y), r((m.vita / m.max) * 100), (m.lento ? 1 : 0) | (this.evanescente(m) ? 2 : 0) | (this.sotto(m) ? 4 : 0) | (m.giu > 0 ? 8 : 0)]; }),
      t: this.torri.map((t) => [t.id, t.tipo, t.i, t.j, t.liv, t.chi, Math.round(t.ang * 100) / 100, this.costoMiglioria(t), Math.floor(t.spesa * 0.7), r(this.stat(t).raggio)]),
      e: eff, oro: this.oro.slice(), vite: this.vite, vp: this.viteP.slice(), fu: this.fuori.slice(), k: this.k, st: this.stadio,
      ev: this.evOn ? this.M.evento.tipo : '', fra: this.stadio === 'attesa' ? Math.max(0, Math.ceil(this.fino - this.tempoRound)) : 0, pr: this.pronti.slice(), w: Object.keys(this.winOn).filter((k) => this.winOn[k]).map(Number),
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
    descrizione: 'I mostri arrivano a ondate lungo le strade: costruisci arcieri, cannoni, torri di ghiaccio e fulmini per fermarli prima della torre. Sei mappe (valle, deserto, ghiacciaio, palude, vulcano, cimitero), ognuna coi suoi mostri e la sua regola. Da soli, in squadra o in sfida.',
    alias: ['difesa della torre', 'tower defense', 'difesa', 'torri', 'torre', 'td'],
    opzioni: [
      { id: 'mappa', nome: 'Mappa', valori: [...ELENCO, 'caso'], etichette: [...ELENCO.map((id) => `${MAPPE[id].emoji} ${MAPPE[id].nome} ${'★'.repeat(MAPPE[id].stelle)}`), '🎲 A caso'], predefinito: 'prato', anteprime: Object.fromEntries(ELENCO.map((id) => [id, anteprima(id)])) },
      { id: 'modo', nome: 'In più giocatori', valori: ['squadra', 'sfida'], etichette: ['In squadra (una torre per tutti)', 'Sfida (ognuno la sua porta)'], predefinito: 'squadra' },
      { id: 'ondate', nome: 'Ondate', valori: ONDATE, etichette: ['10 ondate', '15 ondate', '20 ondate'], predefinito: 10 },
      { id: 'difficolta', nome: 'Difficoltà', valori: ['facile', 'medio', 'difficile'], etichette: ['Facile', 'Media', 'Difficile'], predefinito: 'medio' },
    ],
    regole: [
      'I mostri arrivano a ondate lungo la strada verso la torre al centro. Ogni mostro che arriva toglie vite (il drago 5): a zero vite la torre cade.',
      'Clic su un prato libero vicino alla tua strada (sul telefono un tocco) e scegli la torretta da costruire. Clic su una tua torretta per migliorarla (fino al livello 3) o venderla (ti ridà il 70% di quanto hai speso).',
      'Arciere (50 monete): tira spesso e lontano. Cannone (90): colpisce tutti i mostri vicini al punto dove cade. Ghiaccio (70): fa pochi danni ma rallenta i mostri. Fulmine (120): salta da un mostro all\'altro e passa le armature.',
      'Ogni mostro ucciso dà monete a chi l\'ha ucciso; alla fine di ogni ondata c\'è un premio per tutti. Tra un\'ondata e l\'altra c\'è una pausa: con "Pronto!" la fai partire prima e prendi 2 monete per ogni secondo risparmiato (quando sono pronti tutti).',
      `Le mappe: ${ELENCO.map((id) => `${MAPPE[id].emoji} ${MAPPE[id].nome} (${MAPPE[id].regola})`).join('; ')}. Ognuna ha la sua strada e i suoi mostri.`,
      'I mostri: 🌳 goblin, lupi veloci, orchi robusti e guerrieri con lo scudo; 🏜️ predoni, avvoltoi, scorpioni corazzati e mummie che si rigenerano; ❄️ pinguini, lupi bianchi, spiriti del gelo e yeti che non si fanno rallentare; 🐸 gelatine che si dividono in due, ragni che si dividono in ragnetti, zanzare e rane sciamano che curano i vicini; 🌋 magmini, salamandre (non si rallentano), diavoletti e golem di magma che si spaccano in due; 🦇 zombie, pipistrelli, scheletri che si rialzano una volta e fantasmi.',
      'L\'armatura toglie danni a ogni colpo, tranne al fulmine. I mostri volanti (avvoltoi, spiriti, zanzare, diavoletti, pipistrelli) non li prende il cannone. Quando un fantasma è evanescente lo prende solo il fulmine.',
      'Ogni 5 ondate (e all\'ultima) arriva il capo della mappa: il drago, il verme delle sabbie (a tratti va sottoterra e nessuno lo colpisce), il gigante di ghiaccio (corazzato, non si rallenta), l\'idra (si rigenera), il demone di lava (corazzato e si rigenera) e il negromante (evoca scheletri).',
      'In più giocatori ognuno ha la sua strada e costruisce solo vicino a quella. In squadra difendete insieme la stessa torre, con le vite in comune. In sfida ognuno ha la sua porta e le sue vite, con le stesse ondate per tutti: vince chi resta in piedi (o, finite le ondate, chi ha più vite).',
      'Il computer facile costruisce solo arcieri, piano e un po\' a caso; il medio mescola le torrette e le migliora; il difficile è svelto, mette le torrette dove vedono più strada e le migliora presto.',
    ],
  },
  crea: (o) => new Difesa(o),
  bot: () => ({}),
  _test: { Difesa, TORRI, MOSTRI, MAPPE, strade, ondata, W, H, CELLA },
};
