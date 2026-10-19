// DALGONA (Squid Game): ognuno ha il suo biscotto di caramello con una forma impressa (cerchio, triangolo, stella,
// ombrello; rarissima e quasi impossibile la Torre Eiffel). Si ritaglia tenendo premuto il tasto sinistro del mouse
// (o il dito) e seguendo il solco della forma; rilasciando ci si ferma e si riprende ripremendo. Se l'ago esce dal solco
// il biscotto si incrina, sempre di più quanto più si esce e quanto più si corre; a 100% di crepe si rompe: eliminato
// (macchia rossa stilizzata, nome grigio). Chi ritaglia tutta la forma entro il tempo passa il round.
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// !win banana: un vantaggio per il round in corso (al massimo 30 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 30) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }
const W = 1000, H = 620, CX = 500, CY = 330, R_BISCOTTO = 245, PASSO = 4, DURATA = 90;
const COPERTO = 0.97; // quanta parte del solco va ritagliata

// ---------- le forme (vertici di un poligono chiuso, centro nel mezzo del biscotto) ----------
function cerchio(r, n = 72) { return Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; }); }
function stella(ro, ri) { return Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? ri : ro; return [Math.cos(a) * r, Math.sin(a) * r + 12]; }); }
function ombrello() {
  const p = [];
  // la cupola, da sinistra a destra passando in alto
  for (let k = 0; k <= 40; k++) { const a = Math.PI + (k / 40) * Math.PI; p.push([Math.cos(a) * 165, Math.sin(a) * 150 - 20]); }
  // il bordo sotto a festoni, da destra verso il manico
  const festone = (x0, x1) => { for (let k = 1; k <= 10; k++) { const x = x0 + (x1 - x0) * (k / 10); p.push([x, -20 - Math.sin((k / 10) * Math.PI) * 22]); } };
  festone(165, 82); festone(82, 9);
  // il manico con il gancio
  p.push([9, 150]);
  for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI; p.push([-22 + Math.cos(a) * 31, 150 + Math.sin(a) * 31]); }
  for (let k = 16; k >= 0; k--) { const a = (k / 16) * Math.PI; p.push([-22 + Math.cos(a) * 14, 150 + Math.sin(a) * 14]); }
  p.push([-9, 150]); p.push([-9, -20]);
  festone(-9, -82); festone(-82, -165);
  return p;
}
function eiffel() {
  // metà destra dalla punta in giù, poi l'arco tra le gambe; l'altra metà è lo specchio
  const d = [[0, -212], [5, -196], [9, -165], [14, -125], [20, -88], [24, -66], [40, -66], [40, -55], [30, -55], [38, -30], [45, 0], [68, 0], [68, 12], [56, 12], [66, 45], [78, 80], [92, 115], [108, 150], [124, 185], [134, 196], [86, 196], [80, 182],
    [66, 160], [48, 140], [26, 126], [0, 121]];
  const s = d.slice(1, -1).map(([x, y]) => [-x, y]).reverse();
  return [...d, ...s];
}
// le forme impossibili: tanti angoli, punte sottili e passaggi stretti
function ingranaggio(denti = 18, rFuori = 178, rDentro = 146) {
  const p = [], passo = (Math.PI * 2) / denti;
  for (let i = 0; i < denti; i++) {
    const a = i * passo - Math.PI / 2;
    for (const [f, r] of [[0, rDentro], [0.18, rFuori], [0.42, rFuori], [0.6, rDentro]]) p.push([Math.cos(a + f * passo) * r, Math.sin(a + f * passo) * r]);
  }
  return p;
}
function fiocco() {
  // sei bracci con due rametti ciascuno; ogni braccio in coordinate locali (x verso fuori), poi ruotato
  const h = 9, xc = h / Math.tan(Math.PI / 6);
  const braccio = [[xc, -h], [80, -h], [112, -50], [98, -h], [130, -h], [158, -38], [146, -h], [176, -h], [198, 0], [176, h], [146, h], [158, 38], [130, h], [98, h], [112, 50], [80, h]];
  const p = [];
  for (let j = 0; j < 6; j++) {
    const a = -Math.PI / 2 + (j * Math.PI) / 3, c = Math.cos(a), sn = Math.sin(a);
    for (const [x, y] of braccio) p.push([x * c - y * sn, x * sn + y * c]);
  }
  return p;
}
function mano() {
  // una mano aperta: cinque dita sottili separate da fessure di 2 pixel
  const dito = (x0, x1, cima) => { const m = (x0 + x1) / 2; return [[x1, cima + 14], [x1 - 6, cima + 3], [m, cima], [x0 + 6, cima + 3], [x0, cima + 14]]; };
  return [[-62, 205], [62, 205], [96, 70], [96, -26], ...dito(62, 96, -40).slice(1), [62, 4], [60, 4], [60, -96], ...dito(26, 60, -124).slice(1), [26, -6], [24, -6], [24, -126], ...dito(-10, 24, -156).slice(1), [-10, -6], [-12, -6], [-12, -96], ...dito(-46, -12, -124).slice(1), [-46, 44], [-62, 30], [-104, -16], [-118, -34], [-133, -30], [-136, -14], [-120, 14], [-82, 76], [-66, 116]];
}
function seppia() {
  // il mantello con le pinne in alto, otto tentacoli sottili che ondeggiano sotto
  const p = [[61, 40], [74, -20], [52, -118], [86, -184], [32, -162], [0, -212], [-32, -162], [-86, -184], [-52, -118], [-74, -20], [-61, 40]];
  // tutti i tentacoli ondeggiano insieme (stessa onda alla stessa profondità), così non si incrociano mai
  const onda = (y) => Math.sin((y - 40) / 34) * 12;
  for (let t = 0; t < 8; t++) {
    const xl = -61 + t * 16, xr = xl + 10, fondo = 40 + 140 + (t % 3) * 14, quote = [];
    for (let y = 64; y < fondo; y += 24) quote.push(y);
    for (const y of quote) p.push([xl + onda(y), y]);
    p.push([xl + onda(fondo), fondo], [(xl + xr) / 2 + onda(fondo + 6), fondo + 7], [xr + onda(fondo), fondo]);
    for (const y of quote.slice().reverse()) p.push([xr + onda(y), y]);
    if (t < 7) p.push([xr, 40], [xr + 6, 40]);
  }
  return p;
}
// rara: probabilità di uscire (le altre forme si dividono il resto); lento/trema: quanto fatica il computer
const FORME = {
  cerchio: { nome: 'Cerchio', v: cerchio(150), tol: 7 },
  triangolo: { nome: 'Triangolo', v: [[0, -165], [165, 120], [-165, 120]], tol: 7 },
  stella: { nome: 'Stella', v: stella(175, 75), tol: 6, lento: 0.85 },
  ombrello: { nome: 'Ombrello', v: ombrello(), tol: 6, lento: 0.85 },
  ingranaggio: { nome: 'Ingranaggio', v: ingranaggio(), tol: 4, fragile: 1.4, rara: 1 / 10, lento: 0.65, trema: 2.2, emoji: '⚙️' },
  fiocco: { nome: 'Fiocco di neve', v: fiocco(), tol: 3.5, fragile: 1.6, rara: 1 / 15, lento: 0.6, trema: 2.6, emoji: '❄️' },
  mano: { nome: 'Mano', v: mano(), tol: 3, fragile: 1.7, rara: 1 / 20, lento: 0.55, trema: 2.9, emoji: '🖐️' },
  seppia: { nome: 'Seppia', v: seppia(), tol: 2.5, fragile: 2, rara: 1 / 25, lento: 0.5, trema: 3.2, emoji: '🦑' },
  eiffel: { nome: 'Torre Eiffel', v: eiffel(), tol: 3, fragile: 1.8, rara: 1 / 30, lento: 0.55, trema: 3.2, emoji: '🗼' },
};
const NORMALI = Object.keys(FORME).filter((k) => !FORME[k].rara);
const RARE = Object.keys(FORME).filter((k) => FORME[k].rara);
const RARA = FORME.eiffel.rara;
// estrae una forma: prima si prova ognuna delle rare con la sua probabilità, altrimenti una normale
function estrai(caso = Math.random) {
  let x = caso();
  for (const k of RARE) { if (x < FORME[k].rara) return k; x -= FORME[k].rara; }
  return NORMALI[Math.floor(caso() * NORMALI.length)];
}
// il solco campionato ogni PASSO pixel (lo stesso calcolo lo fa il browser per disegnare)
function campiona(v) {
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const [x0, y0] = v[i], [x1, y1] = v[(i + 1) % v.length], l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(l / PASSO));
    for (let k = 0; k < n; k++) out.push([CX + x0 + ((x1 - x0) * k) / n, CY + y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}
const PUNTI = Object.fromEntries(Object.entries(FORME).map(([k, f]) => [k, campiona(f.v)]));
// per trovare in fretta i punti del solco vicini: griglia da 20 px
const GRIGLIE = Object.fromEntries(Object.entries(PUNTI).map(([k, pts]) => { const gr = new Map(); pts.forEach(([x, y], i) => { const c = `${Math.floor(x / 20)},${Math.floor(y / 20)}`; if (!gr.has(c)) gr.set(c, []); gr.get(c).push(i); }); return [k, gr]; }));
function vicini(forma, x, y) {
  const gr = GRIGLIE[forma], out = [], cx = Math.floor(x / 20), cy = Math.floor(y / 20);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const l = gr.get(`${cx + dx},${cy + dy}`); if (l) out.push(...l); }
  return out;
}
function distanza(forma, x, y) {
  const pts = PUNTI[forma]; let d = Infinity;
  for (const i of vicini(forma, x, y)) d = Math.min(d, Math.hypot(pts[i][0] - x, pts[i][1] - y));
  if (d === Infinity) for (const [px, py] of pts) d = Math.min(d, Math.hypot(px - x, py - y)); // lontano dal solco
  return d;
}

class Dalgona extends Arena {
  constructor(o) { super(o, { id: 'dalgona', round: 3 }); this.W = W; this.H = H; this.avvia(); }
  iniziaRound() {
    this.b = Array.from({ length: this.n }, (_, i) => {
      const forma = estrai();
      return { id: i, forma, fatto: new Uint8Array(PUNTI[forma].length), danno: 0, stato: 'gioco', el: null, fine: null, prima: null, x: null, y: null, a: false };
    });
    this.mente = {};
    for (const b of this.b) {
      const f = FORME[b.forma];
      if (f.rara) this.annuncia(b.id, `ha pescato ${f.nome.toUpperCase()}! ${f.emoji} Auguri…`, `hai pescato ${f.nome.toUpperCase()}! ${f.emoji} Quasi impossibile…`, true);
    }
  }
  progresso(b) { let k = 0; for (const x of b.fatto) k += x; return k / b.fatto.length; }
  passo(dt) {
    aggiornaWin(this, dt);
    for (let p = 0; p < this.n; p++) {
      const b = this.b[p], i = this.inp[p];
      const sicuro = this.winOn[p], danno0 = b.danno; // con il trucco il biscotto non si incrina
      if (b.stato !== 'gioco') continue;
      b.a = !!i.a && i.mx !== null;
      if (!b.a) { b.prima = null; if (i.mx !== null) { b.x = i.mx; b.y = i.my; } continue; }
      if (!b.prima) b.danno += 3; // ogni volta che riappoggi l'ago il biscotto soffre un po'
      const x = i.mx, y = i.my, pr = b.prima || [x, y];
      b.x = x; b.y = y;
      const tol = FORME[b.forma].tol * (sicuro ? 1.8 : 1), l = Math.hypot(x - pr[0], y - pr[1]), n = Math.max(1, Math.ceil(l / 3));
      // correre troppo incrina il biscotto
      const vel = l / Math.max(dt, 0.001);
      if (vel > 420) b.danno += ((vel - 420) / 420) * 2.5;
      // con l'ago fermo fuori dal solco il danno cresce col tempo e non a ogni passo del server: un tocco appena
      // sbagliato (sul telefono capita) lascia il tempo di tornare nel solco invece di rompere tutto in mezzo secondo
      const fermo = l < 1 ? Math.min(1, dt * 6) : 1;
      for (let k = 1; k <= n; k++) {
        const qx = pr[0] + ((x - pr[0]) * k) / n, qy = pr[1] + ((y - pr[1]) * k) / n;
        if (Math.hypot(qx - CX, qy - CY) > R_BISCOTTO) continue; // fuori dal biscotto: niente
        const d = distanza(b.forma, qx, qy);
        if (d <= tol) {
          const pts = PUNTI[b.forma];
          for (const j of vicini(b.forma, qx, qy)) if (Math.hypot(pts[j][0] - qx, pts[j][1] - qy) <= tol + 3) b.fatto[j] = 1;
        } else b.danno += Math.min(7, 0.6 + (d - tol) * 0.32) * (FORME[b.forma].fragile || 1) * fermo; // fuori dal solco: il biscotto si incrina (la Torre Eiffel è più fragile)
      }
      b.prima = [x, y];
      if (sicuro) b.danno = danno0;
      if (b.danno >= 100) { b.danno = 100; this.rompi(p); continue; }
      if (this.progresso(b) >= COPERTO) {
        b.stato = 'fatto'; b.fine = this.tempoRound; this.cambiato = true;
        const f = FORME[b.forma], bonus = Math.round(Math.max(0, DURATA - this.tempoRound) / 10) + (f.rara ? Math.round(2 / f.rara) : 0); // le rare valgono di più (fino a +60)
        this.punti[p] += 5 + bonus;
        this.annuncia(p, `ritaglia ${f.rara ? `${f.nome.toUpperCase()}!!! ${f.emoji}` : `il suo ${f.nome.toLowerCase()}`} e passa! +${5 + bonus}`, `ce l'hai fatta! +${5 + bonus}`, !!f.rara);
      }
    }
    if (this.tempoRound >= DURATA) {
      for (let p = 0; p < this.n; p++) if (this.b[p].stato === 'gioco') this.rompi(p, true);
      return true;
    }
    return this.b.every((b) => b.stato !== 'gioco') && this.tempoRound - Math.max(0, ...this.b.map((b) => b.el ?? b.fine ?? 0)) > 1.5;
  }
  rompi(p, tempo = false) {
    const b = this.b[p];
    b.stato = 'rotto'; b.el = this.tempoRound; this.cambiato = true;
    this.annuncia(p, tempo ? 'non ha finito in tempo: eliminato' : 'ha rotto il biscotto: eliminato!', tempo ? 'tempo scaduto: eliminato' : 'il biscotto si è rotto: eliminato!');
  }
  fineRound() { fineWin(this); }
  // il computer segue il solco con la sua velocità e un po' di tremolio
  pensa(p, liv) {
    const b = this.b[p];
    if (b.stato !== 'gioco') return {};
    const pts = PUNTI[b.forma];
    const m = this.mente[p] || (this.mente[p] = { s: Math.floor(Math.random() * pts.length), off: 0, pausa: 0 });
    const L = { facile: { v: 45, n: 5, sc: 0.12 }, medio: { v: 62, n: 3.4, sc: 0.06 }, difficile: { v: 80, n: 0.9, sc: 0.005 } }[liv];
    // sulle forme difficili si va più piano (tutti)
    const lento = FORME[b.forma].lento || 1;
    if (m.pausa > 0) { m.pausa -= 0.033; return { a: false, mx: pts[Math.floor(m.s) % pts.length][0], my: pts[Math.floor(m.s) % pts.length][1] }; }
    if (Math.random() < 0.004) m.pausa = casuale(0.3, 1); // ogni tanto si ferma a riprendere fiato
    // cerca il prossimo punto ancora da tagliare, così non ripassa inutilmente
    // fatto un giro intero: se è rimasto qualche pezzo da tagliare si alza l'ago e ci si sposta lì (senza incrinare niente)
    if (m.giro === undefined) m.giro = 0;
    if (m.giro >= pts.length) {
      let k = 0; while (k < pts.length && b.fatto[Math.floor(m.s) % pts.length]) { m.s += 1; k++; }
      m.giro = 0;
      if (k > 3) { const q = pts[Math.floor(m.s) % pts.length]; return { a: false, mx: q[0], my: q[1] }; }
    }
    const avanti = (L.v * lento * 0.033) / PASSO;
    m.s += avanti; m.giro += avanti;
    const i = Math.floor(m.s) % pts.length, j = (i + 1) % pts.length;
    const [x, y] = pts[i], nx = -(pts[j][1] - y), ny = pts[j][0] - x, nl = Math.hypot(nx, ny) || 1;
    const trema = L.n * (FORME[b.forma].trema || 1); // sulle forme impossibili trema la mano a tutti
    m.off = m.off * 0.9 + casuale(-trema, trema) * 0.45 + (Math.random() < L.sc ? casuale(-3, 3) * trema : 0);
    return { a: true, mx: x + (nx / nl) * m.off, my: y + (ny / nl) * m.off };
  }
  vistaExtra() { return { forme: Object.fromEntries(Object.entries(FORME).map(([k, f]) => [k, { nome: f.nome, v: f.v.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), tol: f.tol }])), cx: CX, cy: CY, r: R_BISCOTTO, passo: PASSO, durata: DURATA }; }
  statoTick(posto) {
    const bits = (arr) => { let s = ''; for (let i = 0; i < arr.length; i += 4) s += ((arr[i] | 0) | ((arr[i + 1] | 0) << 1) | ((arr[i + 2] | 0) << 2) | ((arr[i + 3] | 0) << 3)).toString(16); return s; };
    return {
      resta: Math.max(0, Math.round(DURATA - this.tempoRound)),
      b: this.b.map((b, i) => ({
        id: i, fo: b.forma, st: b.stato, d: Math.round(b.danno), pr: Math.round(this.progresso(b) * 100), el: b.el, fi: b.fine,
        // il tuo biscotto in dettaglio (quello che hai ritagliato e dove sta l'ago); degli altri basta il riassunto
        ...(i === posto || posto === undefined ? { f: bits(b.fatto), x: b.x === null ? null : Math.round(b.x), y: b.y === null ? null : Math.round(b.y), a: b.a ? 1 : 0 } : {}),
      })),
    };
  }
}

module.exports = {
  meta: {
    id: 'dalgona',
    nome: 'Dalgona',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Squid Game: ritaglia la forma dal biscotto di caramello senza romperlo. Cerchio, triangolo, stella, ombrello… e ogni tanto una forma impossibile.',
    alias: ['dalgona', 'caramello', 'biscotto', 'squid game', 'ombrello', 'ppopgi'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 }],
    regole: [
      'Ognuno riceve il suo biscotto di caramello con una forma impressa, estratta a caso: cerchio, triangolo, stella o ombrello. Ogni tanto escono le forme impossibili, con solchi strettissimi e un biscotto più fragile: Ingranaggio (circa 1 volta su 10, 18 denti), Fiocco di neve (1 su 15, sei bracci con i rametti), Mano (1 su 20, dita separate da fessure sottilissime), Seppia (1 su 25, otto tentacoli) e Torre Eiffel (1 su 30). Chi ne ritaglia una prende molti punti in più.',
      'Si ritaglia tenendo premuto il tasto sinistro del mouse (sul telefono il dito) e seguendo il solco della forma. Se rilasci ti fermi; ripremi quando vuoi per riprendere, anche da un altro punto.',
      'Il biscotto è fragile e il solco è stretto: se l\'ago esce dal solco il biscotto si incrina subito, e più esci e più ti allontani, più si crepa. Si crepa anche se corri troppo veloce, e un po\' ogni volta che riappoggi l\'ago (3%): meglio non staccarlo troppo spesso. Se appoggi l\'ago fuori dal solco e lo tieni fermo il biscotto si crepa più piano: hai un paio di secondi per riportarlo dentro. La barra delle crepe arriva fino a 100%: a quel punto il biscotto si rompe e sei eliminato (macchia rossa stilizzata e nome grigio). Sulla Torre Eiffel il solco è più stretto.',
      'Quando hai ritagliato tutto il solco la forma si stacca e hai passato il round. Chi non finisce entro 90 secondi è eliminato.',
      'Punti: 5 per aver passato il round, più un punto ogni 10 secondi avanzati; la Torre Eiffel vale 20 punti in più. Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile trema e a volte scappa fuori dal solco; il medio è attento; il difficile ha la mano fermissima e va più veloce.',
    ],
  },
  crea: (o) => new Dalgona(o),
  bot: () => ({}),
  _test: { estrai, NORMALI, RARE, Dalgona, FORME, PUNTI, distanza, campiona, RARA },
};
