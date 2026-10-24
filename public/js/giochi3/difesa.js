// DIFESA DELLA TORRE: il campo della mappa scelta (valle, deserto, ghiacciaio, palude, vulcano, cimitero) con le sue
// strade, decorazioni e il suo tempo (nuvole, sabbia, neve, nebbia, braci, notte), la torre al centro (o le porte
// colorate in sfida), le caselle dove si può costruire (le proprie illuminate quando ci si passa sopra), le torrette
// che si girano verso il bersaglio, i mostri disegnati uno per uno (camminano, volano, lampeggiano quando li colpisci,
// vanno in pezzi), frecce, palle di cannone, schegge di ghiaccio e fulmini. Il menu per costruire, migliorare e
// vendere è uno strato HTML sopra il campo, accanto alla casella scelta.
(() => {
  const { COLORI } = window.Arena;
  const ICONE = { arciere: '🏹', cannone: '💣', ghiaccio: '❄️', fulmine: '⚡' };
  let ex = null, ctxD = null, sfondo = null, notte = null, sel = null, sopraCella = null, colpi = [], scritte = [], pezzi = [], segni = [], anelli = [], ferita = 0, scossa = 0, meteo = [], mappaVista = null;
  const visti = new Map(), spari = new Map();
  const ora = () => performance.now() / 1000;
  const suono = (n, o) => window.Nuovi && window.Nuovi.suono && window.Nuovi.suono(n, o);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const attivo = () => ctxD && ctxD.partita && ctxD.partita.gioco === 'difesa' && !ctxD.partita.finita && document.querySelector('.panno-difesa');
  const ultimo = () => ctxD && ctxD.partita && ctxD.partita.stato && ctxD.partita.stato.s;
  const TAU = Math.PI * 2;

  function cellaDi(e) {
    const t = e.target; if (!t || !t.classList || !t.classList.contains('ar-tela') || !ex) return null;
    const r = t.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * ex.W, y = ((e.clientY - r.top) / r.height) * ex.H;
    return [Math.floor((x - 10) / ex.CELLA), Math.floor(y / ex.CELLA)];
  }
  const mia = (i, j) => ex.celle.some(([a, b, z]) => a === i && b === j && (ex.strade.length === 1 || z === ctxD.mio));
  const torreIn = (s, i, j) => s && s.t.find((t) => t[2] === i && t[3] === j);
  document.addEventListener('pointermove', (e) => { if (attivo()) sopraCella = cellaDi(e); });
  document.addEventListener('pointerdown', (e) => {
    if (!attivo() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const c = cellaDi(e); if (!c) return;
    const s = ultimo(), t = torreIn(s, c[0], c[1]);
    if (t && t[5] === ctxD.mio) sel = { id: t[0], i: c[0], j: c[1] };
    else if (!t && mia(c[0], c[1])) { sel = { i: c[0], j: c[1] }; suono([[660, 0.03]], { tipo: 'triangle', volume: 0.03 }); }
    else sel = null;
  });
  document.addEventListener('keydown', (e) => { if (attivo() && e.key === 'Escape') sel = null; });

  // ---- piccoli attrezzi per disegnare ----
  const tinte = new Map();
  function tinta(hex, k) { // k > 0 schiarisce, k < 0 scurisce
    const chiave = hex + k; if (tinte.has(chiave)) return tinte.get(chiave);
    const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
    const v = `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; tinte.set(chiave, v); return v;
  }
  const cerchio = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); };
  const ovale = (g, x, y, rx, ry, col, ang = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), ang, 0, TAU); g.fill(); };
  const tratto = (g, w, col) => { g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; };
  const linea = (g, pt) => { g.beginPath(); pt.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const poli = (g, pt, col) => { g.fillStyle = col; g.beginPath(); pt.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const bordo = (g, a = 0.55) => { g.lineWidth = 1.1; g.strokeStyle = `rgba(25,15,10,${a})`; g.stroke(); };
  // una palla con la luce in alto a sinistra
  function palla(g, x, y, rx, ry, col, ang = 0) {
    const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.max(0.5, rx * 0.1), x, y, Math.max(rx, ry) * 1.05);
    gr.addColorStop(0, tinta(col, 0.4)); gr.addColorStop(0.5, col); gr.addColorStop(1, tinta(col, -0.4));
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), ang, 0, TAU); g.fill();
  }
  function occhio(g, x, y, r, iride = '#fff', pup = '#111', cattivo = false) {
    cerchio(g, x, y, r, iride); cerchio(g, x + r * 0.3, y + r * 0.05, r * 0.55, pup); cerchio(g, x + r * 0.05, y - r * 0.35, r * 0.28, 'rgba(255,255,255,.85)');
    if (cattivo) { tratto(g, Math.max(0.8, r * 0.55), '#1a1008'); linea(g, [[x - r * 1.1, y - r * 1.5], [x + r * 1.2, y - r * 0.85]]); }
  }
  const brilla = (g, x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  function caso(seme) { let a = seme >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // la distanza di un punto dalle strade
  function dallaStrada(x, y) {
    let m = Infinity;
    for (const s of ex.strade) for (let k = 1; k < s.length; k++) {
      const a = s[k - 1], b = s[k], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const f = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
      m = Math.min(m, Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f));
    }
    return m;
  }
  // un passo ogni "passo" pixel lungo le strade, con la direzione
  function lungo(passo, fn) {
    for (const s of ex.strade) {
      let resto = 0;
      for (let k = 1; k < s.length; k++) {
        const a = s[k - 1], b = s[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
        let d = passo - resto;
        for (; d < l; d += passo) fn(a[0] + (b[0] - a[0]) * (d / l), a[1] + (b[1] - a[1]) * (d / l), an);
        resto = l - (d - passo);
      }
    }
  }

  // ---- i temi delle mappe: terreno, strada, decorazioni ----
  const TEMI = {
    prato: { terra: ['#6aae50', '#4e8d3b'], macchie: ['rgba(40,90,30,.3)', 'rgba(150,210,110,.28)'], strada: ['#6f5a32', '#c9a76a', '#dcbf86'], pietra: ['#9a9488', '#6d675d', '#b4aea2'], bandiera: '#e8453c' },
    deserto: { terra: ['#ecca88', '#d6a865'], macchie: ['rgba(170,110,50,.18)', 'rgba(255,240,200,.25)'], strada: ['#8a6538', '#c4935a', '#d3a56d'], pietra: ['#c9a873', '#8f7046', '#e0c496'], bandiera: '#2d8fd6' },
    ghiacciaio: { terra: ['#eef6fb', '#cfe1ee'], macchie: ['rgba(130,170,210,.2)', 'rgba(255,255,255,.6)'], strada: ['#6d9fc2', '#a9d3ec', '#d4ecf8'], pietra: ['#a7b3be', '#6f7d8b', '#c7d1da'], bandiera: '#2b5fd9' },
    palude: { terra: ['#4a6a3f', '#334d30'], macchie: ['rgba(20,40,20,.35)', 'rgba(120,160,80,.2)'], strada: ['#3b2a18', '#7a5b36', '#8d6a40'], pietra: ['#7d8072', '#555849', '#9a9c8c'], bandiera: '#9bd13c' },
    vulcano: { terra: ['#43302c', '#2a1d1b'], macchie: ['rgba(0,0,0,.3)', 'rgba(120,70,50,.2)'], strada: ['#ff6a1a', '#4b3a35', '#5a4740'], pietra: ['#5b4f4c', '#3a302e', '#776a66'], bandiera: '#ffb020' },
    cimitero: { terra: ['#344232', '#222c23'], macchie: ['rgba(0,0,0,.3)', 'rgba(110,130,100,.18)'], strada: ['#3c3a36', '#77736b', '#87837a'], pietra: ['#7c7a86', '#4d4b56', '#9a98a4'], bandiera: '#8a3bd1' },
  };
  const tema = () => TEMI[ex.mappa] || TEMI.prato;

  // le decorazioni (disegnate una volta nello sfondo)
  const DECORI = {
    albero(g, x, y, s) {
      ovale(g, x + 4 * s, y + 9 * s, 13 * s, 6 * s, 'rgba(0,0,0,.25)');
      tratto(g, 4 * s, '#6b4423'); linea(g, [[x, y + 8 * s], [x, y]]);
      palla(g, x - 6 * s, y - 2 * s, 8 * s, 7 * s, '#3f8a2e'); palla(g, x + 6 * s, y - 1 * s, 8 * s, 7 * s, '#3a8029'); palla(g, x, y - 8 * s, 9 * s, 8 * s, '#4c9d36');
    },
    cespuglio(g, x, y, s) { ovale(g, x + 2, y + 5 * s, 9 * s, 3.5 * s, 'rgba(0,0,0,.2)'); palla(g, x - 4 * s, y, 5 * s, 4.5 * s, '#47912f'); palla(g, x + 4 * s, y, 5 * s, 4.5 * s, '#428a2c'); palla(g, x, y - 3 * s, 5.5 * s, 5 * s, '#55a63b'); if (s > 0.9) { cerchio(g, x - 3 * s, y - 3 * s, 1.3, '#e8453c'); cerchio(g, x + 3 * s, y - 1 * s, 1.3, '#e8453c'); } },
    fiori(g, x, y, s, r) { for (let k = 0; k < 6; k++) { const fx = x + (r() - 0.5) * 18 * s, fy = y + (r() - 0.5) * 12 * s, c = ['#fff', '#ffd23f', '#ff8fc7', '#b48cff'][k % 4]; for (let q = 0; q < 5; q++) cerchio(g, fx + Math.cos(q * 1.26) * 1.6, fy + Math.sin(q * 1.26) * 1.6, 1.2, c); cerchio(g, fx, fy, 0.9, '#c78a1a'); } },
    roccia(g, x, y, s) { ovale(g, x + 2, y + 4 * s, 9 * s, 3.5 * s, 'rgba(0,0,0,.25)'); palla(g, x, y, 8 * s, 6 * s, tema().pietra[0]); palla(g, x + 5 * s, y + 1 * s, 5 * s, 4 * s, tema().pietra[2]); },
    cactus(g, x, y, s) {
      ovale(g, x + 3, y + 10 * s, 8 * s, 3 * s, 'rgba(0,0,0,.2)');
      const v = '#3e8a46'; tratto(g, 6 * s, v); linea(g, [[x, y + 10 * s], [x, y - 10 * s]]); tratto(g, 4 * s, v); linea(g, [[x, y + 1 * s], [x - 6 * s, y + 1 * s], [x - 6 * s, y - 5 * s]]); linea(g, [[x, y - 2 * s], [x + 6 * s, y - 2 * s], [x + 6 * s, y - 8 * s]]);
      tratto(g, 1.2, 'rgba(255,255,255,.35)'); linea(g, [[x - 1, y + 9 * s], [x - 1, y - 9 * s]]);
      cerchio(g, x, y - 11 * s, 1.8 * s, '#ff6fa8');
    },
    teschio(g, x, y, s) { palla(g, x, y, 5 * s, 4.2 * s, '#efe6d2'); cerchio(g, x - 1.8 * s, y - 0.3 * s, 1.3 * s, '#3a2a1a'); cerchio(g, x + 1.8 * s, y - 0.3 * s, 1.3 * s, '#3a2a1a'); ovale(g, x, y + 3.5 * s, 3 * s, 1.5 * s, '#e3d7bd'); tratto(g, 1.2 * s, '#e3d7bd'); linea(g, [[x - 9 * s, y + 6 * s], [x + 9 * s, y + 3 * s]]); },
    palma(g, x, y, s) {
      ovale(g, x + 10 * s, y + 12 * s, 14 * s, 4 * s, 'rgba(0,0,0,.2)');
      tratto(g, 4 * s, '#8a6236'); g.beginPath(); g.moveTo(x, y + 12 * s); g.quadraticCurveTo(x + 4 * s, y, x + 2 * s, y - 10 * s); g.stroke();
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.7; tratto(g, 3 * s, k % 2 ? '#2f8a3a' : '#3fa04a'); g.beginPath(); g.moveTo(x + 2 * s, y - 10 * s); g.quadraticCurveTo(x + 2 * s + Math.cos(a) * 9 * s, y - 14 * s + Math.sin(a) * 5 * s, x + 2 * s + Math.cos(a) * 15 * s, y - 6 * s + Math.sin(a) * 6 * s); g.stroke(); }
    },
    pino(g, x, y, s) {
      ovale(g, x + 4, y + 11 * s, 10 * s, 4 * s, 'rgba(60,90,130,.25)');
      tratto(g, 3 * s, '#6b4a2b'); linea(g, [[x, y + 11 * s], [x, y + 4 * s]]);
      for (let k = 0; k < 3; k++) { const yy = y + 6 * s - k * 7 * s, w = (11 - k * 3) * s; poli(g, [[x - w, yy], [x, yy - 10 * s], [x + w, yy]], k % 2 ? '#2f5f4a' : '#356b52'); poli(g, [[x - w * 0.9, yy - 1], [x, yy - 10 * s], [x - w * 0.1, yy - 4 * s]], '#f4fbff'); poli(g, [[x - w, yy], [x + w, yy], [x + w * 0.6, yy - 2.5 * s], [x - w * 0.6, yy - 2.5 * s]], 'rgba(255,255,255,.85)'); }
    },
    ghiaccio(g, x, y, s) { for (let k = 0; k < 4; k++) { const a = -0.6 + k * 0.4, l = (8 + (k % 2) * 5) * s; poli(g, [[x + k * 3 * s - 3 * s, y], [x + k * 3 * s + Math.sin(a) * l, y - l], [x + k * 3 * s + 3 * s, y]], k % 2 ? '#bfe6fa' : '#e6f7ff'); } tratto(g, 1, 'rgba(70,140,200,.6)'); linea(g, [[x - 4 * s, y], [x + 12 * s, y]]); },
    pupazzo(g, x, y, s) { ovale(g, x + 3, y + 8 * s, 8 * s, 3 * s, 'rgba(60,90,130,.25)'); palla(g, x, y + 3 * s, 6.5 * s, 6 * s, '#fbfdff'); palla(g, x, y - 5 * s, 4.5 * s, 4.2 * s, '#fbfdff'); cerchio(g, x - 1.5 * s, y - 6 * s, 0.8 * s, '#222'); cerchio(g, x + 1.5 * s, y - 6 * s, 0.8 * s, '#222'); poli(g, [[x, y - 4.5 * s], [x + 5 * s, y - 4 * s], [x, y - 3.5 * s]], '#f08a24'); tratto(g, 2 * s, '#d63a2e'); linea(g, [[x - 4 * s, y - 1.5 * s], [x + 4 * s, y - 1.5 * s]]); },
    canne(g, x, y, s) { for (let k = 0; k < 5; k++) { const xx = x + (k - 2) * 2.5 * s, h = (12 + (k % 3) * 4) * s; tratto(g, 1.4, '#6a8a3a'); linea(g, [[xx, y], [xx + (k - 2) * 1.2, y - h]]); ovale(g, xx + (k - 2) * 1.2, y - h + 2 * s, 1.6 * s, 3.5 * s, '#6b4a2b'); } },
    morto(g, x, y, s) { ovale(g, x + 4, y + 10 * s, 10 * s, 3 * s, 'rgba(0,0,0,.25)'); tratto(g, 3.5 * s, '#3a2e26'); linea(g, [[x, y + 10 * s], [x, y - 4 * s], [x - 7 * s, y - 11 * s]]); tratto(g, 2.2 * s, '#3a2e26'); linea(g, [[x, y - 2 * s], [x + 8 * s, y - 9 * s], [x + 10 * s, y - 14 * s]]); linea(g, [[x - 4 * s, y - 7 * s], [x - 3 * s, y - 14 * s]]); linea(g, [[x + 5 * s, y - 6 * s], [x + 11 * s, y - 6 * s]]); },
    fungo(g, x, y, s) { tratto(g, 2.5 * s, '#efe6d2'); linea(g, [[x, y + 3 * s], [x, y - 2 * s]]); palla(g, x, y - 3 * s, 5 * s, 3 * s, '#c43a3a'); cerchio(g, x - 2 * s, y - 4 * s, 0.9 * s, '#fff'); cerchio(g, x + 2 * s, y - 3 * s, 0.8 * s, '#fff'); },
    ninfea(g, x, y, s) { g.fillStyle = '#4f8f3a'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 5 * s, 0.4, TAU - 0.1); g.closePath(); g.fill(); if (s > 1) cerchio(g, x + 1, y - 1, 1.6 * s, '#ff9cc8'); },
    lapide(g, x, y, s) {
      ovale(g, x + 3, y + 7 * s, 9 * s, 3 * s, 'rgba(0,0,0,.35)'); ovale(g, x, y + 7 * s, 8 * s, 3 * s, '#2a3526');
      g.fillStyle = '#8a8894'; g.beginPath(); g.moveTo(x - 6 * s, y + 6 * s); g.lineTo(x - 6 * s, y - 6 * s); g.arc(x, y - 6 * s, 6 * s, Math.PI, 0); g.lineTo(x + 6 * s, y + 6 * s); g.closePath(); g.fill(); bordo(g, 0.6);
      tratto(g, 1, 'rgba(40,40,50,.7)'); linea(g, [[x - 3 * s, y - 5 * s], [x + 3 * s, y - 5 * s]]); linea(g, [[x - 3 * s, y - 2 * s], [x + 2 * s, y - 2 * s]]);
      ovale(g, x - 3 * s, y + 4 * s, 3 * s, 1.5 * s, 'rgba(90,130,70,.7)');
    },
    croce(g, x, y, s) { ovale(g, x + 2, y + 8 * s, 6 * s, 2.5 * s, 'rgba(0,0,0,.35)'); tratto(g, 3 * s, '#6d6a75'); linea(g, [[x, y + 8 * s], [x, y - 8 * s]]); linea(g, [[x - 5 * s, y - 3 * s], [x + 5 * s, y - 3 * s]]); },
    zucca(g, x, y, s) { palla(g, x - 2.5 * s, y, 3.5 * s, 4 * s, '#e0761f'); palla(g, x + 2.5 * s, y, 3.5 * s, 4 * s, '#e0761f'); palla(g, x, y, 3.5 * s, 4.2 * s, '#f08a24'); poli(g, [[x - 2.5 * s, y - 1 * s], [x - 1 * s, y - 2.5 * s], [x - 0.5 * s, y - 0.5 * s]], '#ffdf5a'); poli(g, [[x + 2.5 * s, y - 1 * s], [x + 1 * s, y - 2.5 * s], [x + 0.5 * s, y - 0.5 * s]], '#ffdf5a'); poli(g, [[x - 2.5 * s, y + 1.5 * s], [x + 2.5 * s, y + 1.5 * s], [x, y + 2.8 * s]], '#ffdf5a'); tratto(g, 1.5, '#4a6a2a'); linea(g, [[x, y - 4 * s], [x + 1, y - 6 * s]]); },
    sasso_lava(g, x, y, s) { palla(g, x, y, 8 * s, 5.5 * s, '#4a3b37'); tratto(g, 1.2, '#ff7a20'); linea(g, [[x - 5 * s, y], [x - 1 * s, y - 2 * s], [x + 3 * s, y + 1 * s]]); },
    bruciato(g, x, y, s) { ovale(g, x + 3, y + 10 * s, 8 * s, 3 * s, 'rgba(0,0,0,.35)'); tratto(g, 3 * s, '#1e1614'); linea(g, [[x, y + 10 * s], [x, y - 8 * s]]); tratto(g, 2 * s, '#1e1614'); linea(g, [[x, y - 1 * s], [x - 6 * s, y - 7 * s]]); linea(g, [[x, y - 4 * s], [x + 5 * s, y - 10 * s]]); cerchio(g, x + 5 * s, y - 10 * s, 1.2, '#ff7a20'); },
    cristallo(g, x, y, s) { for (const [dx, h, c] of [[-4, 9, '#a04ad1'], [0, 14, '#c27af0'], [4, 8, '#8a3bd1']]) poli(g, [[x + dx * s - 2.5 * s, y], [x + dx * s, y - h * s], [x + dx * s + 2.5 * s, y]], c); brilla(g, x, y - 5 * s, 10 * s, 'rgba(200,120,255,.35)'); },
  };
  // quali decorazioni e quante per mappa
  const SCELTE = {
    prato: [['albero', 9, 1], ['cespuglio', 10, 0.9], ['fiori', 14, 1], ['roccia', 6, 0.8]],
    deserto: [['cactus', 10, 1], ['roccia', 8, 0.9], ['teschio', 5, 0.9], ['palma', 4, 1.1]],
    ghiacciaio: [['pino', 12, 1], ['ghiaccio', 8, 1], ['roccia', 6, 0.9], ['pupazzo', 2, 1]],
    palude: [['morto', 7, 1], ['canne', 14, 1], ['fungo', 10, 1], ['roccia', 4, 0.8]],
    vulcano: [['bruciato', 8, 1], ['sasso_lava', 10, 1], ['cristallo', 4, 0.9], ['teschio', 3, 0.9]],
    cimitero: [['lapide', 14, 1], ['croce', 9, 1], ['morto', 6, 1], ['zucca', 6, 1]],
  };

  function preparaSfondo() {
    const c = document.createElement('canvas'); c.width = ex.W * 2; c.height = ex.H * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    const T = tema(), r = caso(ex.mappa.length * 977 + ex.strade[0].length * 31), W = ex.W, H = ex.H;
    // il terreno: un gradiente e tante macchie
    const gr = g.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, T.terra[0]); gr.addColorStop(1, T.terra[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 700; k++) { const x = r() * W, y = r() * H; ovale(g, x, y, 3 + r() * 9, 2 + r() * 6, T.macchie[k % 2], r() * 3); }
    // i dettagli del terreno di ogni mappa (sotto la strada)
    if (ex.mappa === 'prato') { tratto(g, 1, 'rgba(30,80,20,.45)'); for (let k = 0; k < 420; k++) { const x = r() * W, y = r() * H; linea(g, [[x - 2, y], [x - 1, y - 4]]); linea(g, [[x + 1, y], [x + 2, y - 4]]); } }
    if (ex.mappa === 'deserto') { tratto(g, 2, 'rgba(160,105,50,.2)'); for (let k = 0; k < 60; k++) { const x = r() * W, y = r() * H, l = 40 + r() * 80; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y - 8, x + l * 0.7, y + 8, x + l, y); g.stroke(); } }
    if (ex.mappa === 'ghiacciaio') {
      for (let k = 0; k < 9; k++) { const x = r() * W, y = r() * H; if (dallaStrada(x, y) < 60) continue; ovale(g, x, y, 30 + r() * 30, 14 + r() * 12, 'rgba(170,215,240,.55)', r()); tratto(g, 0.8, 'rgba(90,150,200,.5)'); linea(g, [[x - 15, y - 3], [x - 3, y + 2], [x + 6, y - 4], [x + 18, y + 1]]); }
      for (let k = 0; k < 250; k++) cerchio(g, r() * W, r() * H, 0.8, 'rgba(255,255,255,.9)');
    }
    if (ex.mappa === 'palude') for (let k = 0; k < 40; k++) {
      const x = r() * W, y = r() * H, rr = 16 + r() * 22; if (dallaStrada(x, y) < rr + ex.LARGA + 6 || Math.hypot(x - ex.torre.x, y - ex.torre.y) < 100) continue;
      ovale(g, x, y, rr + 3, rr * 0.6 + 3, '#2a3a26'); const w = g.createRadialGradient(x - rr * 0.3, y - rr * 0.2, 2, x, y, rr); w.addColorStop(0, '#4f7a72'); w.addColorStop(1, '#22413c');
      g.fillStyle = w; g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU); g.fill();
      for (let q = 0; q < 3; q++) DECORI.ninfea(g, x + (r() - 0.5) * rr, y + (r() - 0.5) * rr * 0.5, 0.8 + r() * 0.5);
    }
    if (ex.mappa === 'vulcano') {
      for (let k = 0; k < 26; k++) { let x = r() * W, y = r() * H; const pt = [[x, y]]; for (let q = 0; q < 5; q++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; pt.push([x, y]); } tratto(g, 5, 'rgba(255,90,10,.18)'); linea(g, pt); tratto(g, 1.4, '#ff8a2a'); linea(g, pt); }
      for (let k = 0; k < 14; k++) {
        const x = r() * W, y = r() * H, rr = 14 + r() * 16; if (dallaStrada(x, y) < rr + ex.LARGA + 8 || Math.hypot(x - ex.torre.x, y - ex.torre.y) < 100) continue;
        ovale(g, x, y, rr + 4, rr * 0.6 + 4, '#1c1110'); const w = g.createRadialGradient(x, y, 2, x, y, rr); w.addColorStop(0, '#fff09a'); w.addColorStop(0.35, '#ffa020'); w.addColorStop(1, '#c8300c');
        g.fillStyle = w; g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU); g.fill();
      }
    }
    if (ex.mappa === 'cimitero') for (let k = 0; k < 30; k++) { const x = r() * W, y = r() * H; if (dallaStrada(x, y) < 40) continue; ovale(g, x, y, 10, 5, 'rgba(60,45,30,.5)'); }
    // la strada: bordo, fondo e chiaro al centro
    const strada = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; for (const s of ex.strade) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
    const [sb, sf, sc] = T.strada, L = ex.LARGA;
    if (ex.mappa === 'vulcano') { strada(L * 2 + 14, 'rgba(255,90,10,.25)'); strada(L * 2 + 6, sb); strada(L * 2, sf); strada(L * 2 - 12, sc); }
    else { strada(L * 2 + 8, 'rgba(0,0,0,.18)'); strada(L * 2 + 5, sb); strada(L * 2, sf); strada(L * 2 - 12, sc); }
    // la trama della strada
    if (ex.mappa === 'palude') {
      // una passerella di assi
      strada(L * 2 - 2, '#6a4c2c');
      lungo(8, (x, y, an) => { g.save(); g.translate(x, y); g.rotate(an); g.fillStyle = (x + y) % 3 < 1.5 ? '#8d6a40' : '#9c7748'; g.fillRect(-3.2, -L + 1, 6.4, L * 2 - 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(2.6, -L + 1, 0.8, L * 2 - 2); cerchio(g, 0, -L + 4, 0.8, '#3b2a18'); cerchio(g, 0, L - 4, 0.8, '#3b2a18'); g.restore(); });
      lungo(70, (x, y, an) => { for (const sgn of [-1, 1]) { const px = x - Math.sin(an) * (L + 2) * sgn, py = y + Math.cos(an) * (L + 2) * sgn; cerchio(g, px, py, 2.6, '#4a3420'); cerchio(g, px - 0.6, py - 0.6, 1.2, '#6a4c2c'); } });
    } else if (ex.mappa === 'cimitero') {
      lungo(7, (x, y, an) => { for (let q = -2; q <= 2; q++) { const px = x - Math.sin(an) * q * 6.5 + (r() - 0.5) * 2, py = y + Math.cos(an) * q * 6.5 + (r() - 0.5) * 2; ovale(g, px, py, 3, 2.6, r() < 0.5 ? '#8a867c' : '#7a766d', an); } });
    } else if (ex.mappa === 'ghiacciaio') {
      tratto(g, 2, 'rgba(255,255,255,.7)'); for (const s of ex.strade) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x - 5, y - 5) : g.moveTo(x - 5, y - 5))); g.stroke(); }
      lungo(26, (x, y, an) => { tratto(g, 0.8, 'rgba(60,120,170,.55)'); const d = (r() - 0.5) * L; linea(g, [[x - Math.sin(an) * d, y + Math.cos(an) * d], [x + Math.cos(an) * 7, y + Math.sin(an) * 7 + 3], [x + Math.cos(an) * 12 + 2, y + Math.sin(an) * 12]]); });
    } else if (ex.mappa === 'vulcano') {
      lungo(11, (x, y, an) => { const d = (r() - 0.5) * L * 1.4; ovale(g, x - Math.sin(an) * d, y + Math.cos(an) * d, 2.5, 1.8, r() < 0.15 ? '#ff7a20' : 'rgba(20,12,10,.45)', an); });
    } else {
      // ciottoli e impronte
      lungo(13, (x, y, an) => { const d = (r() - 0.5) * L * 1.5; ovale(g, x - Math.sin(an) * d, y + Math.cos(an) * d, 2.4, 1.8, ex.mappa === 'deserto' ? 'rgba(130,90,40,.3)' : 'rgba(120,90,50,.38)', an); });
      tratto(g, 1.5, 'rgba(0,0,0,.08)'); for (const k of [-6, 6]) for (const s of ex.strade) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x + k * 0.7, y + k * 0.7) : g.moveTo(x + k * 0.7, y + k * 0.7))); g.stroke(); }
    }
    // le decorazioni lontane dalla strada e dalla torre, dall'alto in basso
    const messe = [];
    for (const [nome, quanti, sc] of SCELTE[ex.mappa] || SCELTE.prato) {
      for (let k = 0, tent = 0; k < quanti && tent < quanti * 30; tent++) {
        const x = 15 + r() * (W - 30), y = 15 + r() * (H - 30), s = sc * (0.8 + r() * 0.45), rag = 12 * s;
        if (dallaStrada(x, y) < ex.LARGA + rag + 4 || Math.hypot(x - ex.torre.x, y - ex.torre.y) < ex.torre.r + 40 || messe.some((m) => Math.hypot(m.x - x, m.y - y) < m.rag + rag)) continue;
        messe.push({ nome, x, y, s, rag }); k++;
      }
    }
    messe.sort((a, b) => a.y - b.y).forEach((m) => DECORI[m.nome](g, m.x, m.y, m.s, r));
    // le caselle dove si costruisce: un leggero quadrato
    g.strokeStyle = ex.mappa === 'ghiacciaio' || ex.mappa === 'deserto' ? 'rgba(80,60,40,.08)' : 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (const [i, j] of ex.celle) g.strokeRect(10 + i * ex.CELLA + 2, j * ex.CELLA + 2, ex.CELLA - 4, ex.CELLA - 4);
    // l'ingresso dei mostri: una grotta scura dove la strada entra nel campo
    for (const s of ex.strade) {
      const [x, y] = s[0].map((v, i) => Math.max(6, Math.min(i ? H - 6 : W - 6, v)));
      brilla(g, x, y, 34, 'rgba(0,0,0,.55)');
    }
    sfondo = c;
    // il tempo: nuvole, granelli, fiocchi, nebbia, braci, lucciole
    const rm = caso(7);
    const quanti = { prato: 5, deserto: 70, ghiacciaio: 90, palude: 14, vulcano: 45, cimitero: 26 }[ex.mappa] || 0;
    meteo = Array.from({ length: quanti }, () => ({ x: rm() * W, y: rm() * H, v: 0.4 + rm(), f: rm() * TAU, r: rm() }));
    notte = null;
    if (ex.mappa === 'cimitero') { notte = document.createElement('canvas'); notte.width = W / 2; notte.height = H / 2; }
  }

  // ---- la torre al centro ----
  function torre(g, s, t) {
    const { x, y, r } = ex.torre, T = tema(), [p0, p1, p2] = T.pietra;
    ovale(g, x + 8, y + 12, r + 4, r * 0.75, 'rgba(0,0,0,.3)');
    // le mura: un anello di pietra con i mattoni
    palla(g, x, y, r - 2, r - 2, p0); bordo(g, 0.7);
    tratto(g, 1, 'rgba(0,0,0,.18)');
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x, y, r - 10 - k * 9, 0, TAU); g.stroke(); }
    for (let k = 0; k < 24; k++) { const a = (k * TAU) / 24 + (k % 2) * 0.1; linea(g, [[x + Math.cos(a) * (r - 28), y + Math.sin(a) * (r - 28)], [x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)]]); }
    // i merli
    for (let k = 0; k < 12; k++) { const a = (k * TAU) / 12; g.save(); g.translate(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6)); g.rotate(a); g.fillStyle = p2; g.fillRect(-5, -6, 9, 12); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(2, -6, 2, 12); g.restore(); }
    if (ex.mappa === 'ghiacciaio') for (let k = 0; k < 12; k++) { const a = (k * TAU) / 12; ovale(g, x + Math.cos(a) * (r - 7) - 1, y + Math.sin(a) * (r - 7) - 3, 5, 3, '#fff'); }
    // il mastio al centro col tetto a cono
    palla(g, x, y, r - 22, r - 22, p1);
    const tetto = ex.mappa === 'cimitero' ? '#4a2b6a' : ex.mappa === 'vulcano' ? '#5a1e14' : ex.mappa === 'ghiacciaio' ? '#2b4f8a' : '#8a3324';
    // il tetto a cono visto dall'alto: le tegole in cerchio e la luce da sinistra
    const rt = r - 25, gt = g.createRadialGradient(x - rt * 0.45, y - rt * 0.5, 2, x, y, rt);
    gt.addColorStop(0, tinta(tetto, 0.45)); gt.addColorStop(0.6, tetto); gt.addColorStop(1, tinta(tetto, -0.45));
    g.fillStyle = gt; g.beginPath(); g.arc(x, y, rt, 0, TAU); g.fill(); bordo(g, 0.6);
    tratto(g, 0.9, 'rgba(0,0,0,.22)');
    for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(x, y, (rt * k) / 4, 0, TAU); g.stroke(); }
    for (let k = 0; k < 16; k++) { const a = (k * TAU) / 16; linea(g, [[x + Math.cos(a) * 4, y + Math.sin(a) * 4], [x + Math.cos(a) * rt, y + Math.sin(a) * rt]]); }
    if (ex.mappa === 'ghiacciaio') { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - 4, y - 4, rt * 0.6, 0, TAU); g.fill(); }
    palla(g, x, y, 4, 4, '#c8a24a');
    // la luce alla finestra e la bandiera
    if (ex.mappa === 'cimitero' || ex.mappa === 'vulcano') brilla(g, x, y, 40, 'rgba(255,200,90,.18)');
    tratto(g, 2.5, '#3a2a1a'); linea(g, [[x, y - 12], [x, y - 50]]);
    const sv = Math.sin(t * 4), col = ex.modo === 'squadra' ? T.bandiera : '#ddd';
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 50); g.quadraticCurveTo(x + 14, y - 52 + sv * 3, x + 28 + sv * 2, y - 44 + sv); g.quadraticCurveTo(x + 14, y - 40 - sv * 2, x, y - 36); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(x, y - 43); g.quadraticCurveTo(x + 14, y - 41 + sv * 2, x + 28 + sv * 2, y - 44 + sv); g.quadraticCurveTo(x + 14, y - 40 - sv * 2, x, y - 36); g.fill();
    cerchio(g, x, y - 51, 2.2, '#ffd23f');
    // il colpo subito: la torre lampeggia di rosso
    if (t - ferita < 0.4) { g.fillStyle = `rgba(255,40,30,${0.5 * (1 - (t - ferita) / 0.4)})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    // in sfida: la porta di ognuno alla fine della sua strada, col colore e le vite
    if (ex.modo === 'sfida') ex.strade.forEach((st, p) => {
      const [ax, ay] = st[st.length - 2], gx = x + (ax - x) * 0.4, gy = y + (ay - y) * 0.4;
      palla(g, gx, gy, 14, 14, s.fu[p] ? '#555555' : COLORI[p % COLORI.length]); bordo(g, 0.7);
      g.fillStyle = '#fff'; g.font = '800 12px system-ui'; g.textAlign = 'center'; g.fillText(s.fu[p] ? '✖' : s.vp[p], gx, gy + 4);
    });
  }

  // ---- le torrette ----
  function torretta(g, t, adesso) {
    const [id, tipo, i, j, liv, chi, ang] = t, x = 10 + i * ex.CELLA + ex.CELLA / 2, y = j * ex.CELLA + ex.CELLA / 2;
    const sparo = adesso - (spari.get(id) || -9), [p0, p1, p2] = tema().pietra;
    ovale(g, x + 4, y + 7, 18, 12, 'rgba(0,0,0,.3)');
    // la base di pietra: un ottagono con i mattoni, il bordo del colore di chi l'ha costruita
    g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k * TAU) / 8 + TAU / 16; g.lineTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); } g.closePath();
    const gb = g.createLinearGradient(x - 17, y - 17, x + 17, y + 17); gb.addColorStop(0, p2); gb.addColorStop(1, p1); g.fillStyle = gb; g.fill();
    g.lineWidth = 3; g.strokeStyle = COLORI[chi % COLORI.length]; g.stroke();
    tratto(g, 0.8, 'rgba(0,0,0,.2)'); linea(g, [[x - 13, y - 4], [x + 13, y - 4]]); linea(g, [[x - 13, y + 5], [x + 13, y + 5]]); linea(g, [[x - 4, y - 13], [x - 4, y - 4]]); linea(g, [[x + 5, y - 4], [x + 5, y + 5]]); linea(g, [[x - 2, y + 5], [x - 2, y + 13]]);
    // i livelli: un anello d'argento (2) o d'oro (3)
    if (liv > 1) { g.lineWidth = 2; g.strokeStyle = liv === 3 ? '#ffd23f' : '#d8dde3'; g.beginPath(); g.arc(x, y, 12.5, 0, TAU); g.stroke(); }
    g.save(); g.translate(x, y);
    if (tipo === 'arciere') {
      // una piattaforma di legno con l'arciere che mira
      g.fillStyle = '#8a5a2b'; g.fillRect(-10, -10, 20, 20); g.fillStyle = '#a06a35'; g.fillRect(-10, -10, 20, 3); g.fillRect(-10, -3, 20, 3); g.fillRect(-10, 4, 20, 3);
      tratto(g, 1, 'rgba(0,0,0,.35)'); g.strokeRect(-10, -10, 20, 20);
      g.rotate(ang);
      palla(g, -1, 0, 5.5, 5, liv === 3 ? '#2f6f3a' : '#3f7f4a'); cerchio(g, 0, 0, 3.4, '#e2b48a'); cerchio(g, -0.8, -0.3, 3.2, '#6b3f1f');
      const tira = sparo < 0.15 ? 0 : Math.min(4, (sparo - 0.15) * 10);
      tratto(g, 2.4, '#5a3412'); g.beginPath(); g.arc(4, 0, 9, -1.15, 1.15); g.stroke();
      tratto(g, 0.8, '#eee'); linea(g, [[4 + Math.cos(-1.15) * 9, Math.sin(-1.15) * 9], [3 - tira, 0], [4 + Math.cos(1.15) * 9, Math.sin(1.15) * 9]]);
      if (sparo > 0.25) { tratto(g, 1.4, '#6b4423'); linea(g, [[3 - tira, 0], [14, 0]]); poli(g, [[15, 0], [12, -1.8], [12, 1.8]], '#cfd6dd'); }
    } else if (tipo === 'cannone') {
      palla(g, 0, 0, 10.5, 10.5, '#55555c');
      g.rotate(ang);
      const rin = sparo < 0.2 ? (1 - sparo / 0.2) * 4 : 0;
      const gc = g.createLinearGradient(0, -6, 0, 6); gc.addColorStop(0, '#5a5a62'); gc.addColorStop(0.4, '#9a9aa6'); gc.addColorStop(1, '#1e1e22');
      g.fillStyle = gc; g.fillRect(-4 - rin, -5.5, 24, 11); g.fillStyle = '#2a2a30'; g.fillRect(17 - rin, -6.5, 5, 13);
      cerchio(g, 21 - rin, 0, 3.6, '#0c0c0e'); g.fillStyle = '#b08a3a'; g.fillRect(4 - rin, -6, 2.2, 12);
      if (sparo < 0.12) { brilla(g, 26, 0, 12, 'rgba(255,200,80,.9)'); }
    } else if (tipo === 'ghiaccio') {
      // un cristallo che gira e brilla
      brilla(g, 0, 0, 20, `rgba(140,220,255,${0.25 + 0.15 * Math.sin(adesso * 3) + (sparo < 0.2 ? 0.3 : 0)})`);
      g.rotate(adesso * 0.6);
      for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); poli(g, [[0, 0], [3, -4], [0, -13 - liv], [-3, -4]], k % 2 ? '#bfe8ff' : '#e8f8ff'); }
      g.rotate(-adesso * 1.2); palla(g, 0, 0, 4.5, 4.5, '#7fd0ff');
    } else {
      // la bobina del fulmine con la sfera in cima
      tratto(g, 2.2, '#b08a3a'); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(0, 6 - k * 3.5, 8 - k, 3, 0, 0, TAU); g.stroke(); }
      const fl = sparo < 0.2 ? 1 : 0.5 + 0.5 * Math.sin(adesso * 8);
      brilla(g, 0, -6, 16 + fl * 6, `rgba(200,140,255,${0.35 + fl * 0.3})`);
      const s = g.createRadialGradient(-2, -9, 1, 0, -6, 7); s.addColorStop(0, '#fbf2ff'); s.addColorStop(1, '#7b3fc4');
      g.fillStyle = s; g.beginPath(); g.arc(0, -6, 6.5, 0, TAU); g.fill();
      tratto(g, 1.2, 'rgba(255,240,170,.9)'); const a = adesso * 9; linea(g, [[Math.cos(a) * 6, -6 + Math.sin(a) * 6], [Math.cos(a + 0.3) * 10, -6 + Math.sin(a + 0.3) * 9], [Math.cos(a + 0.1) * 13, -6 + Math.sin(a + 0.1) * 12]]);
    }
    g.restore();
    // le stelline del livello
    g.fillStyle = '#ffd23f'; g.font = '9px system-ui'; g.textAlign = 'center'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeText('★'.repeat(liv), x, y + 26); g.fillText('★'.repeat(liv), x, y + 26);
  }

  // ---- i mostri: ognuno disegnato rivolto a destra, al centro del corpo, grande circa 12 ----
  const zampa = (g, x, y, l, a, w, col) => { tratto(g, w, col); linea(g, [[x, y], [x + Math.sin(a) * l * 0.5, y + l]]); };
  const DIS = {
    goblin(g, a) {
      const p = Math.sin(a * 9);
      zampa(g, -3, 4, 7, p * 0.6, 3, '#2f6a22'); zampa(g, 3, 4, 7, -p * 0.6, 3, '#2f6a22');
      palla(g, 0, 2, 7, 7, '#4fa83d'); bordo(g);
      poli(g, [[-7, 3], [7, 3], [6, 7], [-6, 7]], '#7a4b22');
      poli(g, [[-3, -8], [-14, -13], [-2, -4]], '#5fbf48'); poli(g, [[5, -8], [15, -13], [6, -3]], '#5fbf48');
      palla(g, 1, -6, 7.5, 6.5, '#62c04a'); bordo(g);
      occhio(g, -0.5, -7.5, 2.1, '#ffe14a', '#a00', true); occhio(g, 4.5, -7.5, 2.1, '#ffe14a', '#a00', true);
      tratto(g, 1, '#2a1a0a'); g.beginPath(); g.arc(3, -4, 2.6, 0.3, Math.PI - 0.3); g.stroke(); poli(g, [[2, -2], [3, -0.5], [4, -2]], '#fff');
      tratto(g, 2, '#cfd6dd'); linea(g, [[7, 2], [13, -3 + p]]); tratto(g, 2.6, '#6b4423'); linea(g, [[6, 3], [8, 1]]);
    },
    predone(g, a) {
      const p = Math.sin(a * 9);
      zampa(g, -3, 4, 7, p * 0.6, 3, '#5a3a22'); zampa(g, 3, 4, 7, -p * 0.6, 3, '#5a3a22');
      palla(g, 0, 2, 7, 7.5, '#b2382c'); bordo(g); tratto(g, 2, '#e7c35a'); linea(g, [[-6, 3], [6, 3]]);
      palla(g, 1, -6, 6, 6, '#c58c5c'); bordo(g);
      palla(g, 0, -10, 7, 4.5, '#f2ead6'); tratto(g, 1, 'rgba(150,130,100,.6)'); linea(g, [[-6, -10], [6, -11]]); cerchio(g, 2, -12, 1.6, '#2d8fd6');
      poli(g, [[-4, -4], [7, -5], [6, -1], [-3, 0]], '#7a1f18');
      occhio(g, 1.5, -7, 1.6, '#fff', '#111', true); occhio(g, 5, -7, 1.6, '#fff', '#111', true);
      tratto(g, 2, '#dfe5ea'); g.beginPath(); g.moveTo(7, 2); g.quadraticCurveTo(14, -1 + p, 15, -8 + p); g.stroke(); tratto(g, 2.6, '#6b4423'); linea(g, [[6, 3], [8, 1]]);
    },
    lupo(g, a, bianco) {
      const p = Math.sin(a * 13), c = bianco ? '#e9f1f7' : '#7f7f88', s = bianco ? '#b8cad8' : '#5f5f68';
      zampa(g, -7, 2, 7, p * 0.8, 2.6, s); zampa(g, 6, 2, 7, -p * 0.8, 2.6, s);
      tratto(g, 4, c); g.beginPath(); g.moveTo(-9, -1); g.quadraticCurveTo(-15, -4 - p, -17, 1); g.stroke();
      palla(g, -1, 0, 10, 5.5, c); bordo(g);
      zampa(g, -5, 2, 7, -p * 0.8, 2.6, c); zampa(g, 8, 2, 7, p * 0.8, 2.6, c);
      palla(g, 9, -4, 5.5, 4.5, c); bordo(g); poli(g, [[11, -6], [18, -3], [17, -1], [11, -1]], c); cerchio(g, 17.5, -2.6, 1.2, '#111');
      poli(g, [[6, -7], [7, -13], [10, -8]], s); poli(g, [[9, -7], [11, -12], [12, -7]], s);
      occhio(g, 11, -5, 1.4, bianco ? '#7fd0ff' : '#ffd23f', '#111', true);
      tratto(g, 0.8, '#fff'); linea(g, [[14, -0.5], [14.5, 0.6]]); linea(g, [[16, -0.6], [16.4, 0.5]]);
    },
    orco(g, a) {
      const p = Math.sin(a * 7);
      zampa(g, -5, 6, 7, p * 0.5, 4.5, '#3a5a2e'); zampa(g, 5, 6, 7, -p * 0.5, 4.5, '#3a5a2e');
      palla(g, 0, 1, 12, 11, '#4d7f42'); bordo(g);
      poli(g, [[-11, 3], [11, 3], [10, 8], [-10, 8]], '#6b4423'); cerchio(g, 0, 5.5, 2.2, '#b9b9b9');
      palla(g, 4, -8, 7.5, 7, '#5a8f4c'); bordo(g);
      occhio(g, 3, -10, 1.7, '#ff5a3a', '#200', true); occhio(g, 8, -10, 1.7, '#ff5a3a', '#200', true);
      poli(g, [[3, -4], [4, -8], [5, -4]], '#fff8e0'); poli(g, [[8, -4], [9, -8], [10, -4]], '#fff8e0');
      // la clava
      g.save(); g.translate(10, 0); g.rotate(-0.9 + p * 0.5); tratto(g, 3, '#6b4423'); linea(g, [[0, 0], [0, -14]]); palla(g, 0, -15, 4, 5, '#7a5230'); cerchio(g, -3, -16, 1, '#ddd'); cerchio(g, 3, -14, 1, '#ddd'); g.restore();
    },
    scudo(g, a) {
      const p = Math.sin(a * 8);
      zampa(g, -3, 5, 7, p * 0.6, 3.2, '#6b7682'); zampa(g, 3, 5, 7, -p * 0.6, 3.2, '#6b7682');
      palla(g, 0, 1, 8, 8.5, '#a3adb8'); bordo(g); tratto(g, 1, 'rgba(0,0,0,.25)'); linea(g, [[-7, 0], [7, 0]]);
      palla(g, 0, -8, 6, 6, '#b8c2cc'); bordo(g); g.fillStyle = '#1b1b1f'; g.fillRect(1, -9, 6, 1.6);
      tratto(g, 2.5, '#d63a2e'); g.beginPath(); g.moveTo(-1, -14); g.quadraticCurveTo(-7, -17, -10, -12 + p); g.stroke();
      tratto(g, 1.6, '#cfd6dd'); linea(g, [[3, 4], [3, -16]]);
      palla(g, 8, 1, 6, 9, '#2f5fa8'); g.lineWidth = 1.5; g.strokeStyle = '#d9dee4'; g.stroke(); tratto(g, 1.8, '#ffd23f'); linea(g, [[8, -5], [8, 7]]); linea(g, [[4, 0], [12, 0]]);
    },
    drago(g, a) {
      const p = Math.sin(a * 6), ali = Math.sin(a * 5);
      for (const sgn of [-1, 1]) { g.save(); g.scale(1, 1); const y0 = -4; const punta = -16 - ali * 6 * sgn; poli(g, [[-2, y0], [-10, punta - 6], [-20, punta], [-15, y0 + 2], [-8, y0 + 4]], sgn > 0 ? '#9c2018' : '#b5281f'); tratto(g, 0.8, 'rgba(60,0,0,.6)'); linea(g, [[-2, y0], [-10, punta - 6]]); linea(g, [[-2, y0], [-20, punta]]); g.restore(); }
      tratto(g, 4.5, '#c33228'); g.beginPath(); g.moveTo(-9, 2); g.quadraticCurveTo(-18, 4 + p * 2, -22, -2); g.stroke(); poli(g, [[-22, -2], [-26, -6], [-24, 0]], '#ffd23f');
      zampa(g, -6, 5, 6, p * 0.5, 3.5, '#8a1a12'); zampa(g, 5, 5, 6, -p * 0.5, 3.5, '#8a1a12');
      palla(g, 0, 1, 12, 8, '#d63a2e'); bordo(g); ovale(g, 2, 4, 8, 3.5, '#f2b25a');
      for (let k = -2; k <= 2; k++) poli(g, [[k * 4 - 2, -6], [k * 4, -10], [k * 4 + 2, -6]], '#ffd23f');
      tratto(g, 5, '#d63a2e'); linea(g, [[8, -2], [12, -8]]);
      palla(g, 14, -10, 6, 4.5, '#d63a2e'); bordo(g); poli(g, [[16, -12], [22, -10], [21, -7], [16, -7]], '#d63a2e');
      poli(g, [[11, -13], [9, -19], [13, -14]], '#efe6d2'); poli(g, [[14, -14], [14, -20], [16, -14]], '#efe6d2');
      occhio(g, 15, -11, 1.5, '#ffd23f', '#300', true);
      if ((a * 10) % 6 < 2) { const k = ((a * 10) % 2) / 2; brilla(g, 24 + k * 6, -8, 4 + k * 4, 'rgba(255,150,40,.8)'); }
    },
    scorpione(g, a) {
      const p = Math.sin(a * 14), c = '#b5652d';
      for (let k = 0; k < 3; k++) { zampa(g, -4 + k * 4, 2, 6, p * (k % 2 ? 1 : -1) * 0.7, 1.6, '#7a3f18'); }
      tratto(g, 2.2, c); linea(g, [[7, 0], [12, -2], [16, -1]]); palla(g, 16, -1, 3.2, 2.2, c); poli(g, [[17, -2], [21, -4], [19, -1]], '#7a3f18'); poli(g, [[17, 0], [21, 2], [19, -1]], '#7a3f18');
      for (let k = 0; k < 4; k++) palla(g, -6 + k * 4, 0, 4, 3.6, k % 2 ? c : '#c4733a');
      bordo(g);
      palla(g, 7, -1, 4, 3.4, '#c4733a');
      // la coda alzata col pungiglione
      const coda = [[-8, -1], [-12, -6], [-12, -12], [-8, -16], [-3, -16 + p]];
      coda.forEach(([x, y], k) => palla(g, x, y, 3.2 - k * 0.3, 2.8 - k * 0.3, k % 2 ? c : '#c4733a'));
      poli(g, [[-3, -18 + p], [2, -14 + p], [-2, -13 + p]], '#2a1408');
      cerchio(g, 9, -3, 1, '#111'); cerchio(g, 10.5, -2.4, 0.8, '#111');
      tratto(g, 0.8, 'rgba(255,255,255,.4)'); linea(g, [[-7, -2], [5, -2.5]]);
    },
    mummia(g, a) {
      const p = Math.sin(a * 5);
      zampa(g, -3, 5, 7, p * 0.4, 3.5, '#c9bd9c'); zampa(g, 3, 5, 7, -p * 0.4, 3.5, '#c9bd9c');
      palla(g, 0, 1, 8, 9, '#e3d9bf'); bordo(g);
      tratto(g, 3, '#d8cdae'); linea(g, [[4, -2], [15, -2 + p]]); linea(g, [[4, 2], [15, 2 + p]]);
      palla(g, 1, -8, 6, 6, '#e8dfc6'); bordo(g);
      tratto(g, 0.9, 'rgba(120,100,70,.6)'); for (let k = -10; k <= 6; k += 3) linea(g, [[-7, k], [7, k + 2]]);
      brilla(g, 4, -9, 4, 'rgba(120,255,120,.8)'); cerchio(g, 4, -9, 1.3, '#bfffb0');
      tratto(g, 1.6, '#e3d9bf'); g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(-12, 6 + p * 2, -14, 2); g.stroke();
    },
    avvoltoio(g, a) {
      const ali = Math.sin(a * 9);
      for (const sgn of [-1, 1]) poli(g, [[-2, -1], [-6, -4 - ali * 9 * sgn], [-17, -3 - ali * 11 * sgn], [-12, 2], [-4, 3]], sgn > 0 ? '#4a3424' : '#5a4030');
      palla(g, -1, 0, 8, 5, '#5a4030'); bordo(g); ovale(g, 5, -3, 4, 3, '#f4efe6');
      palla(g, 8, -6, 3.4, 3, '#d89a8a'); poli(g, [[10, -7], [15, -5], [11, -4]], '#e8a23a');
      occhio(g, 9, -7, 1.1, '#fff', '#111', true);
      poli(g, [[-9, 0], [-15, -1], [-15, 3]], '#3a2818');
    },
    verme(g, a) {
      const p = Math.sin(a * 4);
      for (let k = 5; k >= 0; k--) { const x = -18 + k * 4.5, y = 2 - Math.sin(k * 0.7 + a * 4) * 3 - k * 1.2; palla(g, x, y, 7 - k * 0.2 + (k === 5 ? 1 : 0), 6.5, k % 2 ? '#c79a62' : '#b5874f'); bordo(g, 0.4); tratto(g, 1, 'rgba(90,60,30,.5)'); g.beginPath(); g.arc(x, y, 5.5, -1.2, 1.2); g.stroke(); }
      // la bocca rotonda coi denti
      palla(g, 8, -6 + p, 7, 7, '#a5763f'); cerchio(g, 10, -6 + p, 5, '#4a1e18'); cerchio(g, 10.6, -6 + p, 3, '#2a0c0a');
      for (let k = 0; k < 8; k++) { const an = (k * TAU) / 8 + a; poli(g, [[10 + Math.cos(an) * 5, -6 + p + Math.sin(an) * 5], [10 + Math.cos(an + 0.2) * 2.8, -6 + p + Math.sin(an + 0.2) * 2.8], [10 + Math.cos(an + 0.4) * 5, -6 + p + Math.sin(an + 0.4) * 5]], '#fff6dc'); }
    },
    pinguino(g, a) {
      const p = Math.sin(a * 10);
      g.save(); g.rotate(p * 0.15);
      ovale(g, -3, 10, 3, 1.5, '#f08a24'); ovale(g, 3, 10, 3, 1.5, '#f08a24');
      palla(g, 0, 0, 8, 10, '#22262e'); bordo(g); palla(g, 1.5, 2, 5.5, 7.5, '#f6f8fa');
      poli(g, [[-7, -2], [-11, 5 + p * 2], [-6, 4]], '#1a1d24');
      occhio(g, 2, -5, 1.6, '#fff', '#111'); occhio(g, 6, -5, 1.4, '#fff', '#111'); poli(g, [[5, -3], [10, -2], [5, -1]], '#f08a24');
      g.restore();
    },
    lupobianco(g, a) { DIS.lupo(g, a, true); },
    spirito(g, a) {
      const p = Math.sin(a * 4);
      g.globalAlpha *= 0.85;
      brilla(g, 0, 0, 16, 'rgba(160,230,255,.55)');
      g.fillStyle = 'rgba(210,245,255,.9)'; g.beginPath(); g.moveTo(-14, 4 + p * 3); g.quadraticCurveTo(-6, -2, -2, -8); g.arc(2, -3, 7, -Math.PI * 0.8, Math.PI * 0.6); g.quadraticCurveTo(-4, 8, -14, 4 + p * 3); g.fill();
      occhio(g, 2, -4, 1.6, '#fff', '#2a6aa8'); occhio(g, 6, -4, 1.4, '#fff', '#2a6aa8');
      for (let k = 0; k < 3; k++) { const an = a * 2 + (k * TAU) / 3; g.save(); g.translate(Math.cos(an) * 12, Math.sin(an) * 6); g.rotate(an); poli(g, [[0, -3], [1.2, 0], [0, 3], [-1.2, 0]], '#e8f8ff'); g.restore(); }
      g.globalAlpha /= 0.85;
    },
    yeti(g, a) {
      const p = Math.sin(a * 6);
      zampa(g, -5, 7, 6, p * 0.5, 5, '#d8e2ea'); zampa(g, 5, 7, 6, -p * 0.5, 5, '#d8e2ea');
      g.fillStyle = '#f4f8fb'; g.beginPath(); for (let k = 0; k < 18; k++) { const an = (k * TAU) / 18, rr = k % 2 ? 13 : 11; g.lineTo(Math.cos(an) * rr, 1 + Math.sin(an) * rr * 0.95); } g.closePath(); g.fill(); bordo(g, 0.35);
      palla(g, 0, 1, 10, 10, '#f4f8fb');
      tratto(g, 5, '#e6eef4'); linea(g, [[7, -1], [13, 8 + p * 2]]); cerchio(g, 13, 9 + p * 2, 3, '#9fb4c4');
      palla(g, 5, -7, 6, 5, '#9fb4c4'); bordo(g, 0.4);
      occhio(g, 4, -8.5, 1.5, '#fff', '#2a4a7a', true); occhio(g, 8, -8.5, 1.4, '#fff', '#2a4a7a', true);
      g.fillStyle = '#3a2a3a'; g.beginPath(); g.ellipse(7, -4.5, 3, 1.6, 0, 0, Math.PI); g.fill(); poli(g, [[5, -4.5], [6, -2.5], [6.6, -4.5]], '#fff'); poli(g, [[8, -4.5], [8.6, -2.5], [9.4, -4.5]], '#fff');
      poli(g, [[1, -11], [-2, -17], [3, -12]], '#c8b890'); poli(g, [[7, -12], [8, -18], [9.5, -11.5]], '#c8b890');
    },
    gigante(g, a) {
      const p = Math.sin(a * 5);
      zampa(g, -5, 7, 6, p * 0.5, 5, '#4f86b0'); zampa(g, 5, 7, 6, -p * 0.5, 5, '#4f86b0');
      palla(g, 0, 1, 11, 10, '#7fb7d9'); bordo(g, 0.5);
      tratto(g, 1, 'rgba(255,255,255,.6)'); linea(g, [[-6, -3], [-1, 2], [4, -2]]); linea(g, [[-4, 5], [3, 7]]);
      for (const [x, y, h] of [[-8, -6, 8], [-4, -9, 10], [7, -8, 7]]) { poli(g, [[x - 2.5, y + 2], [x, y - h], [x + 2.5, y + 2]], '#d8f3ff'); poli(g, [[x, y + 2], [x, y - h], [x + 2.5, y + 2]], '#a6dcf5'); }
      palla(g, 4, -8, 5.5, 5, '#94c8e6'); bordo(g, 0.5);
      brilla(g, 6, -9, 4, 'rgba(120,230,255,.9)'); cerchio(g, 6, -9, 1.2, '#fff'); cerchio(g, 2.6, -9, 1, '#e8ffff');
      g.save(); g.translate(11, 3); g.rotate(1.2 + p * 0.3); tratto(g, 3, '#5f8fb0'); linea(g, [[0, 0], [0, -12]]); poli(g, [[-4, -10], [0, -22], [4, -10]], '#cbeeff'); poli(g, [[0, -10], [0, -22], [4, -10]], '#9fd6f2'); g.restore();
    },
    slime(g, a, piccolo) {
      const sq = Math.sin(a * 8), rx = 10 + sq * 1.5, ry = 8 - sq * 1.5, c = piccolo ? '#8be04f' : '#5fcf4a';
      g.globalAlpha *= 0.92;
      g.fillStyle = c; g.beginPath(); g.moveTo(-rx, 8); g.quadraticCurveTo(-rx, 8 - ry * 2, 0, 8 - ry * 2); g.quadraticCurveTo(rx, 8 - ry * 2, rx, 8); g.closePath(); g.fill(); bordo(g, 0.4);
      const gr = g.createLinearGradient(0, 8 - ry * 2, 0, 8); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,60,0,.35)'); g.fillStyle = gr; g.fill();
      if (!piccolo) { cerchio(g, -3, 3, 2, 'rgba(255,255,255,.35)'); cerchio(g, 2, 5, 1.2, 'rgba(255,255,255,.3)'); cerchio(g, -1, 4, 3, 'rgba(30,110,30,.4)'); }
      ovale(g, -4, 8 - ry * 1.6, 3, 1.5, 'rgba(255,255,255,.6)', -0.4);
      g.globalAlpha /= 0.92;
      occhio(g, 1, 8 - ry * 1.2, 2, '#fff', '#111'); occhio(g, 6, 8 - ry * 1.2, 1.8, '#fff', '#111');
      tratto(g, 1, '#1d4a14'); g.beginPath(); g.arc(4, 8 - ry * 0.7, 1.8, 0.2, Math.PI - 0.2); g.stroke();
    },
    slimino(g, a) { DIS.slime(g, a, true); },
    ragno(g, a) {
      const p = Math.sin(a * 16);
      for (let k = 0; k < 4; k++) for (const sgn of [-1, 1]) { const x0 = -1 + k * 2, an = (k - 1.5) * 0.5 + p * 0.25 * (k % 2 ? 1 : -1) * sgn; tratto(g, 1.6, '#1d1424'); linea(g, [[x0, 0], [x0 + Math.sin(an) * 8, -5 * sgn + 0], [x0 + Math.sin(an) * 11, 7 * (sgn > 0 ? 1 : 0.4) + 2]]); }
      palla(g, -6, -1, 8, 7, '#3a2a4a'); bordo(g); poli(g, [[-7, -5], [-5, -3], [-7, -1], [-5, 1], [-7, 3], [-9, 1], [-7, -1], [-9, -3]], '#d63a2e');
      palla(g, 4, 0, 5, 4.5, '#2a1e36'); bordo(g);
      for (const [x, y] of [[6, -2], [8, -1.5], [7, 0.5], [5, -0.5]]) cerchio(g, x, y, 0.9, '#ff3a3a');
      tratto(g, 1.4, '#ddd'); linea(g, [[8, 2], [9.5, 4]]);
    },
    ragnetto(g, a) { DIS.ragno(g, a); },
    zanzara(g, a) {
      const ali = Math.sin(a * 40);
      g.fillStyle = 'rgba(220,240,255,.55)'; ovale(g, -2, -6 - ali * 2, 7, 3, 'rgba(220,240,255,.55)', -0.5); ovale(g, 1, -6 + ali * 2, 6, 2.6, 'rgba(220,240,255,.45)', -0.2);
      tratto(g, 0.8, '#2a2a2a'); for (let k = 0; k < 3; k++) linea(g, [[-2 + k * 3, 1], [-4 + k * 4, 9], [-6 + k * 4, 12]]);
      palla(g, -6, 1, 6, 3, '#6a5a3a'); tratto(g, 1.4, '#2a2014'); for (let k = -9; k < -2; k += 2.5) linea(g, [[k, -1.5], [k, 3.5]]);
      palla(g, 2, -1, 3.5, 3, '#4a3a28'); palla(g, 6, -2, 2.6, 2.4, '#3a2a1a');
      cerchio(g, 7, -2.5, 1.3, '#d63a2e'); tratto(g, 1, '#2a1a0a'); linea(g, [[8, -1], [14, 2]]);
    },
    rana(g, a) {
      const p = Math.sin(a * 6);
      ovale(g, -4, 10, 4, 1.8, '#3a7a2a'); ovale(g, 4, 10, 4, 1.8, '#3a7a2a');
      palla(g, 0, 2, 8, 9, '#4f9a3a'); bordo(g); palla(g, 1.5, 4, 5, 6, '#e8d36a');
      palla(g, 1, -6, 8, 5.5, '#5aaa42'); bordo(g);
      palla(g, -2, -11, 3, 3, '#5aaa42'); palla(g, 5, -11, 3, 3, '#5aaa42'); occhio(g, -2, -11, 2, '#ffd23f', '#111'); occhio(g, 5, -11, 2, '#ffd23f', '#111');
      tratto(g, 1, '#1d4a14'); g.beginPath(); g.moveTo(-4, -4); g.quadraticCurveTo(2, -1, 8, -4); g.stroke();
      for (let k = 0; k < 3; k++) poli(g, [[-4 + k * 2, -13], [-7 + k * 3, -21 - (k % 2) * 3], [-2 + k * 2, -13]], ['#d63a2e', '#ffd23f', '#2d8fd6'][k]);
      // il bastone con la sfera della cura
      tratto(g, 1.8, '#6b4423'); linea(g, [[9, 10], [11, -12]]); brilla(g, 11, -14, 7 + p * 1.5, 'rgba(120,255,140,.7)'); cerchio(g, 11, -14, 2.6, '#cfffd0');
    },
    idra(g, a) {
      for (let k = 0; k < 3; k++) {
        const an = -0.9 + k * 0.6, w = Math.sin(a * 3 + k * 2) * 3, hx = 6 + Math.cos(an) * 14 + w, hy = -6 + Math.sin(an) * 12;
        tratto(g, 5, k === 1 ? '#3a7a4a' : '#336d42'); g.beginPath(); g.moveTo(2, -2); g.quadraticCurveTo(4 + w, -10 + k * 3, hx, hy); g.stroke();
        palla(g, hx + 2, hy, 4.5, 3.2, '#3f8a52'); poli(g, [[hx + 4, hy - 1.5], [hx + 9, hy], [hx + 4, hy + 2]], '#3f8a52');
        occhio(g, hx + 2.5, hy - 1.2, 1.1, '#ffd23f', '#300', true); poli(g, [[hx + 6, hy + 1], [hx + 6.5, hy + 3], [hx + 7, hy + 1]], '#fff');
      }
      zampa(g, -5, 6, 6, Math.sin(a * 6) * 0.5, 4, '#2a5a36'); zampa(g, 4, 6, 6, -Math.sin(a * 6) * 0.5, 4, '#2a5a36');
      tratto(g, 4.5, '#336d42'); g.beginPath(); g.moveTo(-9, 3); g.quadraticCurveTo(-17, 6, -20, 0); g.stroke();
      palla(g, -2, 2, 11, 8, '#3a7a4a'); bordo(g); ovale(g, -1, 5, 7, 3, '#a8c86a');
      for (let k = -2; k <= 1; k++) poli(g, [[k * 4 - 3, -5], [k * 4 - 1, -9], [k * 4 + 1, -5]], '#7a3a8a');
    },
    magmino(g, a) {
      const p = Math.sin(a * 10);
      g.save(); g.translate(0, Math.abs(p) * -2);
      palla(g, 0, 3, 8, 7, '#3b2a26'); bordo(g, 0.6);
      tratto(g, 1.4, '#ff8a2a'); linea(g, [[-5, 1], [-1, 4], [3, 2], [6, 5]]); linea(g, [[-2, 7], [1, 5]]);
      brilla(g, 0, 3, 12, 'rgba(255,100,20,.25)');
      occhio(g, 1, 0, 1.6, '#ffe14a', '#a33', true); occhio(g, 5, 0, 1.5, '#ffe14a', '#a33', true);
      g.restore();
    },
    salamandra(g, a) {
      const p = Math.sin(a * 14);
      tratto(g, 3.5, '#d64a1a'); g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(-13, 3 + p * 3, -18, -1 - p * 2); g.stroke();
      for (const [x, s] of [[-4, 1], [5, -1]]) { zampa(g, x, 1, 5, p * s * 0.9, 2, '#a83810'); }
      palla(g, 0, 1, 9, 4.5, '#e85a1f'); bordo(g);
      for (const x of [-5, -1, 3]) cerchio(g, x, -0.5, 1.3, '#ffd23f');
      palla(g, 9, -1, 5, 3.5, '#e85a1f'); bordo(g); occhio(g, 10, -2.5, 1.3, '#ffe14a', '#111');
      // le fiammelle sulla schiena
      for (let k = 0; k < 3; k++) { const f = Math.sin(a * 20 + k * 2) * 1.5; poli(g, [[-5 + k * 4, -3], [-4 + k * 4 + f * 0.4, -9 - f], [-3 + k * 4, -3]], k % 2 ? '#ffb020' : '#ff7a20'); }
    },
    diavoletto(g, a) {
      const ali = Math.sin(a * 12);
      for (const sgn of [-1, 1]) poli(g, [[-2, -3], [-8, -10 - ali * 4 * sgn], [-13, -6 - ali * 3 * sgn], [-11, -2], [-7, 0]], sgn > 0 ? '#5a1414' : '#7a1c1c');
      tratto(g, 1.2, '#b51c1c'); g.beginPath(); g.moveTo(-4, 5); g.quadraticCurveTo(-11, 9, -12, 4); g.stroke(); poli(g, [[-12, 2], [-14, 5], [-11, 5]], '#b51c1c');
      palla(g, 0, 1, 6, 6.5, '#d63a2e'); bordo(g);
      palla(g, 2, -6, 5, 4.5, '#e04a3a'); bordo(g);
      poli(g, [[-1, -9], [-3, -14], [1, -10]], '#2a1a1a'); poli(g, [[4, -10], [5, -15], [6, -9]], '#2a1a1a');
      occhio(g, 2, -7, 1.3, '#ffe14a', '#111', true); occhio(g, 5, -7, 1.2, '#ffe14a', '#111', true);
      tratto(g, 1.2, '#2a1a0a'); g.beginPath(); g.arc(3.5, -4.5, 1.6, 0.2, Math.PI - 0.2); g.stroke();
      tratto(g, 1.4, '#888'); linea(g, [[5, 5], [9, -9]]); tratto(g, 1.1, '#bbb'); linea(g, [[7, -10], [9, -9], [11, -10]]); linea(g, [[9, -9], [9.5, -12]]);
    },
    golem(g, a) {
      const p = Math.sin(a * 5);
      zampa(g, -5, 6, 7, p * 0.5, 5, '#2e2422'); zampa(g, 5, 6, 7, -p * 0.5, 5, '#2e2422');
      poli(g, [[-12, 2], [-9, -9], [0, -12], [10, -8], [12, 3], [6, 9], [-6, 9]], '#4a3b37'); bordo(g, 0.7);
      poli(g, [[-9, -9], [0, -12], [-2, -4]], '#5b4a45'); poli(g, [[10, -8], [12, 3], [6, 0]], '#3a2e2a');
      tratto(g, 3, 'rgba(255,100,20,.3)'); linea(g, [[-7, -4], [-2, 0], [3, -3], [8, 2]]); linea(g, [[-4, 5], [0, 2]]);
      tratto(g, 1.3, '#ffb040'); linea(g, [[-7, -4], [-2, 0], [3, -3], [8, 2]]); linea(g, [[-4, 5], [0, 2]]);
      palla(g, 4, -12, 5, 4, '#5b4a45'); brilla(g, 5, -12, 4, 'rgba(255,180,40,.9)'); cerchio(g, 3.5, -12.5, 1.1, '#fff2b0'); cerchio(g, 6.5, -12.5, 1, '#fff2b0');
      palla(g, 13, 3 + p, 4.5, 4.5, '#4a3b37'); bordo(g, 0.6);
    },
    demone(g, a) {
      const p = Math.sin(a * 5);
      // l'aura di fiamme
      for (let k = 0; k < 9; k++) { const an = -Math.PI + (k / 8) * Math.PI, f = 3 + Math.sin(a * 12 + k * 1.7) * 2.5; poli(g, [[Math.cos(an - 0.18) * 11, Math.sin(an - 0.18) * 11 + 1], [Math.cos(an) * (16 + f), Math.sin(an) * (16 + f)], [Math.cos(an + 0.18) * 11, Math.sin(an + 0.18) * 11 + 1]], k % 2 ? 'rgba(255,120,20,.75)' : 'rgba(255,200,60,.7)'); }
      for (const sgn of [-1, 1]) poli(g, [[-4, -4], [-14, -14 - p * 2 * sgn], [-20, -6], [-14, -2], [-9, 2]], sgn > 0 ? '#2a0e0e' : '#3a1414');
      zampa(g, -5, 6, 7, p * 0.5, 4.5, '#3a1414'); zampa(g, 5, 6, 7, -p * 0.5, 4.5, '#3a1414');
      palla(g, 0, 1, 11, 10, '#8a1a12'); bordo(g, 0.6);
      tratto(g, 1.3, '#ffb040'); linea(g, [[-6, -2], [-2, 2], [2, -1], [6, 4]]);
      palla(g, 4, -9, 6, 5.5, '#a5221a'); bordo(g, 0.6);
      tratto(g, 2.4, '#2a1a1a'); g.beginPath(); g.moveTo(1, -13); g.quadraticCurveTo(-4, -18, -2, -22); g.stroke(); g.beginPath(); g.moveTo(7, -13); g.quadraticCurveTo(12, -18, 10, -22); g.stroke();
      brilla(g, 3, -10, 3.5, 'rgba(255,230,80,.9)'); brilla(g, 7, -10, 3.5, 'rgba(255,230,80,.9)'); cerchio(g, 3, -10, 1, '#fff'); cerchio(g, 7, -10, 1, '#fff');
      tratto(g, 1.2, '#2a0a0a'); linea(g, [[3, -6], [5, -5], [7, -6]]); poli(g, [[3.5, -6], [4, -4.5], [4.6, -5.8]], '#fff');
    },
    zombie(g, a) {
      const p = Math.sin(a * 5);
      g.save(); g.rotate(0.12 + p * 0.06);
      zampa(g, -3, 5, 7, p * 0.4, 3.2, '#2f3a6a'); zampa(g, 3, 5, 7, -p * 0.3, 3.2, '#2f3a6a');
      palla(g, 0, 1, 7.5, 8, '#5a6a9a'); bordo(g); poli(g, [[-7, 6], [-4, 9], [-2, 6], [1, 9], [3, 6], [7, 8], [7, 4], [-7, 4]], '#4a5a8a');
      tratto(g, 3, '#8fae7a'); linea(g, [[3, -1], [14, -2 + p]]); linea(g, [[2, 2], [13, 2 - p]]);
      palla(g, 2, -8, 6.5, 6, '#8fae7a'); bordo(g);
      occhio(g, 2, -9, 2, '#f4f0c8', '#333'); occhio(g, 6.5, -9, 1.3, '#f4f0c8', '#333');
      tratto(g, 0.8, '#3a2a1a'); linea(g, [[-2, -12], [1, -9]]); linea(g, [[-2, -10.5], [-0.5, -11.5]]); linea(g, [[3, -5], [7, -5.5]]);
      ovale(g, -1, -13, 4, 2, '#3a3020');
      g.restore();
    },
    pipistrello(g, a) {
      const ali = Math.sin(a * 18);
      for (const sgn of [-1, 1]) { g.fillStyle = sgn > 0 ? '#2a1a3a' : '#3a2650'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -4 - ali * 9 * sgn); g.lineTo(-12, -2 - ali * 10 * sgn); g.quadraticCurveTo(-9, 0, -11, 3); g.quadraticCurveTo(-6, 1, -3, 4); g.closePath(); g.fill(); }
      palla(g, 0, 0, 5, 4.5, '#3a2650'); bordo(g);
      poli(g, [[1, -3], [2, -8], [4, -3]], '#3a2650'); poli(g, [[4, -3], [6, -7], [6.5, -2]], '#3a2650');
      occhio(g, 2.5, -1, 1.1, '#ff3a3a', '#300'); occhio(g, 5, -1, 1, '#ff3a3a', '#300');
      poli(g, [[3, 2], [3.5, 3.6], [4, 2]], '#fff'); poli(g, [[5, 2], [5.5, 3.6], [6, 2]], '#fff');
    },
    scheletro(g, a) {
      const p = Math.sin(a * 8), osso = '#efe6d2';
      tratto(g, 2, osso); linea(g, [[-2, 4], [-2 + p * 3, 11]]); linea(g, [[2, 4], [2 - p * 3, 11]]);
      linea(g, [[0, -4], [0, 4]]); tratto(g, 1.5, osso); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(0, -2 + k * 2.2, 4.5 - k * 0.6, 1.2, 0, 0, TAU); g.stroke(); }
      tratto(g, 1.8, osso); linea(g, [[0, -3], [5, 1], [8, -2]]); linea(g, [[0, -3], [-4, 2]]);
      tratto(g, 1.8, '#9aa4ae'); linea(g, [[8, -1], [14, -9 + p]]); tratto(g, 2.2, '#6b4423'); linea(g, [[7, 0], [9, -2]]);
      palla(g, 1, -9, 5.5, 5, osso); bordo(g, 0.5); ovale(g, 2, -5, 3, 1.6, '#e3d7bd');
      cerchio(g, 0.5, -9.5, 1.6, '#1a1410'); cerchio(g, 4, -9.5, 1.5, '#1a1410'); brilla(g, 0.5, -9.5, 2, 'rgba(120,200,255,.6)'); brilla(g, 4, -9.5, 2, 'rgba(120,200,255,.6)');
      tratto(g, 0.6, '#3a2a1a'); for (let k = 0; k < 3; k++) linea(g, [[0.5 + k * 1.3, -5.6], [0.5 + k * 1.3, -4.3]]);
    },
    fantasma(g, a) {
      const p = Math.sin(a * 3), b = a * 6;
      g.translate(0, p * 2);
      brilla(g, 0, 0, 15, 'rgba(200,220,255,.35)');
      g.fillStyle = 'rgba(240,244,255,.92)'; g.beginPath(); g.moveTo(-8, 8); g.lineTo(-8, -3); g.arc(0, -3, 8, Math.PI, 0); g.lineTo(8, 8);
      for (let k = 0; k < 4; k++) g.quadraticCurveTo(6 - k * 4, 12 + Math.sin(b + k) * 2, 4 - k * 4, 8);
      g.closePath(); g.fill(); bordo(g, 0.25);
      ovale(g, 1, -4, 1.8, 2.6, '#1a1a2a'); ovale(g, 5, -4, 1.6, 2.4, '#1a1a2a'); ovale(g, 3, 2, 1.6, 2.2, '#1a1a2a');
      tratto(g, 2.4, 'rgba(240,244,255,.92)'); linea(g, [[7, -1], [12, -4 + p * 2]]);
    },
    negromante(g, a) {
      const p = Math.sin(a * 3);
      // le rune che girano
      for (let k = 0; k < 4; k++) { const an = a * 1.5 + (k * TAU) / 4; brilla(g, Math.cos(an) * 16, 4 + Math.sin(an) * 6, 3.5, 'rgba(140,255,120,.8)'); }
      g.translate(0, p * 1.5);
      poli(g, [[-10, 11], [-6, -6], [6, -6], [10, 11]], '#3a1e5a'); poli(g, [[-10, 11], [-6, -6], [-2, -6], [-4, 11]], '#2a1444');
      tratto(g, 1, '#c8a24a'); linea(g, [[-9, 9], [9, 9]]);
      palla(g, 0, -9, 6.5, 6.5, '#2a1444'); cerchio(g, 1.5, -8.5, 4.5, '#1a0c2a');
      cerchio(g, 1.5, -8.5, 3.6, '#e3d9c6'); cerchio(g, 0.3, -9, 1, '#4dff60'); cerchio(g, 3, -9, 1, '#4dff60'); brilla(g, 1.6, -9, 5, 'rgba(80,255,100,.4)');
      tratto(g, 2, '#4a3020'); linea(g, [[8, 11], [11, -14]]); cerchio(g, 11.4, -15, 3, '#efe6d2'); cerchio(g, 10.6, -15.4, 0.8, '#111'); cerchio(g, 12.4, -15.4, 0.8, '#111');
      for (let k = 0; k < 3; k++) { const f = Math.sin(a * 15 + k) * 1.5; poli(g, [[9.5 + k * 1.2, -17], [10.5 + k * 1.2 + f * 0.3, -22 - f - (k === 1 ? 2 : 0)], [11.5 + k * 1.2, -17]], k === 1 ? '#bfffb0' : '#4dff60'); }
      tratto(g, 3, '#3a1e5a'); linea(g, [[4, -2], [9, 0]]);
    },
  };
  const COL_PEZZI = { goblin: '#4fa83d', predone: '#b2382c', lupo: '#7f7f88', orco: '#4d7f42', scudo: '#a3adb8', drago: '#d63a2e', scorpione: '#b5652d', mummia: '#e3d9bf', avvoltoio: '#5a4030', verme: '#c79a62', pinguino: '#22262e', lupobianco: '#e9f1f7', spirito: '#bfefff', yeti: '#f4f8fb', gigante: '#7fb7d9', slime: '#5fcf4a', slimino: '#8be04f', ragno: '#3a2a4a', ragnetto: '#3a2a4a', zanzara: '#6a5a3a', rana: '#4f9a3a', idra: '#3a7a4a', magmino: '#ff8a2a', salamandra: '#e85a1f', diavoletto: '#d63a2e', golem: '#4a3b37', demone: '#8a1a12', zombie: '#8fae7a', pipistrello: '#3a2650', scheletro: '#efe6d2', fantasma: '#e8eeff', negromante: '#3a1e5a' };

  function mostro(g, m, adesso) {
    const [id, tipo, x, y, vita, bit] = m, info = (ex.mostri && ex.mostri[tipo]) || { r: 12 }, sc = info.r / 12;
    const v = visti.get(id) || { dir: 1, lampo: -9, vita: 100 };
    const vola = info.volante ? 12 + Math.sin(adesso * 3 + id) * 2 : 0;
    // l'ombra a terra (più piccola e chiara per chi vola)
    ovale(g, x + 2, y + info.r * 0.75, info.r * (vola ? 0.7 : 1), info.r * (vola ? 0.28 : 0.38), `rgba(0,0,0,${vola ? 0.18 : 0.28})`);
    if (bit & 4) {
      // sottoterra: solo la montagnola di sabbia che si muove
      palla(g, x, y + 4, info.r * 0.9, info.r * 0.45, '#b5874f'); for (let k = 0; k < 4; k++) cerchio(g, x + Math.sin(adesso * 9 + k * 2) * info.r * 0.8, y + 2 - Math.abs(Math.cos(adesso * 7 + k)) * 6, 1.5, '#d3a56d');
    } else if (bit & 8) {
      // a terra: un mucchietto di ossa che trema
      const tr = Math.sin(adesso * 30) * 0.8;
      tratto(g, 2, '#efe6d2'); linea(g, [[x - 7 + tr, y + 6], [x + 5, y + 3]]); linea(g, [[x - 3, y + 2], [x + 6 + tr, y + 7]]); palla(g, x + 1 + tr, y + 3, 4, 3.5, '#efe6d2'); cerchio(g, x, y + 2.5, 1, '#1a1410'); cerchio(g, x + 2.4, y + 2.5, 1, '#1a1410');
    } else {
      g.save(); g.translate(x, y - vola); g.scale(sc * v.dir, sc);
      if (bit & 2) g.globalAlpha = 0.28;
      (DIS[tipo] || DIS.goblin)(g, adesso + id * 0.37);
      g.restore(); g.globalAlpha = 1;
      // colpito: un lampo bianco; rallentato: un velo di ghiaccio
      const k = (adesso - v.lampo) / 0.12;
      if (k < 1) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`; g.beginPath(); g.arc(x, y - vola, info.r * 0.95, 0, TAU); g.fill(); }
      if (bit & 1) { g.fillStyle = 'rgba(150,215,255,.35)'; g.beginPath(); g.arc(x, y - vola, info.r + 2, 0, TAU); g.fill(); for (let q = 0; q < 3; q++) { const an = q * 2.1 + id; poli(g, [[x + Math.cos(an) * info.r, y - vola + Math.sin(an) * info.r - 3], [x + Math.cos(an) * info.r + 2, y - vola + Math.sin(an) * info.r], [x + Math.cos(an) * info.r, y - vola + Math.sin(an) * info.r + 3], [x + Math.cos(an) * info.r - 2, y - vola + Math.sin(an) * info.r]], '#e8f8ff'); } }
    }
    // la barra della vita (più grande per i capi)
    if (vita < 100 || info.boss) {
      const w = info.boss ? 44 : 26, h = info.boss ? 5 : 4, by = y - vola - info.r - (info.boss ? 14 : 9);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - w / 2 - 1, by - 1, w + 2, h + 2);
      g.fillStyle = vita > 50 ? '#5fd35f' : vita > 25 ? '#f2c230' : '#e8453c'; g.fillRect(x - w / 2, by, (w * vita) / 100, h);
      if (info.boss) { g.font = '11px system-ui'; g.textAlign = 'center'; g.fillText('👑', x, by - 3); }
    }
  }

  // i pezzi che volano via quando un mostro muore
  function esplodi(x, y, col, quanti, forza) {
    for (let k = 0; k < quanti; k++) { const an = Math.random() * TAU, v = forza * (0.4 + Math.random()); pezzi.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - forza * 0.6, col, r: 1.2 + Math.random() * 2.4, t: ora(), dura: 0.5 + Math.random() * 0.4 }); }
  }

  // ---- il tempo della mappa (sopra a tutto) ----
  function tempo(g, st, adesso, dt) {
    const W = ex.W, H = ex.H, ev = st.ev;
    if (ex.mappa === 'prato') {
      // le ombre delle nuvole che passano
      for (const n of meteo) { n.x += n.v * 8 * dt; if (n.x > W + 120) { n.x = -120; n.y = Math.random() * H; } ovale(g, n.x, n.y, 70 + n.r * 50, 34 + n.r * 20, 'rgba(0,30,0,.07)'); }
    } else if (ex.mappa === 'deserto') {
      const forte = ev === 'tempesta';
      if (forte) { g.fillStyle = 'rgba(190,130,60,.32)'; g.fillRect(0, 0, W, H); }
      tratto(g, 1.2, forte ? 'rgba(240,200,140,.75)' : 'rgba(255,240,210,.35)');
      for (const n of meteo) { n.x += (forte ? 420 : 60) * n.v * dt; n.y += Math.sin(adesso + n.f) * 10 * dt; if (n.x > W + 20) { n.x = -20; n.y = Math.random() * H; } if (forte || n.r < 0.3) linea(g, [[n.x, n.y], [n.x - (forte ? 18 : 6), n.y + 1]]); }
    } else if (ex.mappa === 'ghiacciaio') {
      for (const n of meteo) { n.y += (20 + n.v * 25) * dt; n.x += Math.sin(adesso * 1.3 + n.f) * 14 * dt; if (n.y > H + 5) { n.y = -5; n.x = Math.random() * W; } cerchio(g, n.x, n.y, 0.8 + n.r * 1.6, 'rgba(255,255,255,.9)'); }
    } else if (ex.mappa === 'palude') {
      // la nebbia che scorre e le lucciole
      meteo.forEach((n, k) => { n.x += n.v * 10 * dt; if (n.x > W + 150) n.x = -150; const yy = n.y + Math.sin(adesso * 0.3 + n.f) * 20; if (k < 9) brilla(g, n.x, yy, 110 + n.r * 60, 'rgba(210,230,215,.16)'); else { const l = 0.5 + 0.5 * Math.sin(adesso * 3 + n.f); brilla(g, (n.x * 3) % W, yy, 6, `rgba(220,255,120,${0.6 * l})`); } });
    } else if (ex.mappa === 'vulcano') {
      const forte = ev === 'eruzione';
      if (forte) { g.fillStyle = `rgba(255,60,0,${0.12 + 0.06 * Math.sin(adesso * 10)})`; g.fillRect(0, 0, W, H); }
      for (const n of meteo) { n.y -= (25 + n.v * 30) * dt * (forte ? 2.5 : 1); n.x += Math.sin(adesso * 2 + n.f) * 12 * dt; if (n.y < -5) { n.y = H + 5; n.x = Math.random() * W; } cerchio(g, n.x, n.y, 1 + n.r, `rgba(255,${140 + Math.round(n.r * 100)},40,${0.5 + 0.4 * Math.sin(adesso * 5 + n.f)})`); }
      if (forte) { tratto(g, 3, 'rgba(255,140,40,.8)'); for (let k = 0; k < 6; k++) { const x = ((adesso * 230 + k * 157) % (W + 100)) - 50, y = ((adesso * 330 + k * 97) % (H + 60)) - 30; linea(g, [[x, y], [x - 8, y - 14]]); cerchio(g, x, y, 2.5, '#ffd27a'); } }
    } else if (ex.mappa === 'cimitero' && notte) {
      // la notte: buio ovunque tranne vicino alla torre e alle torrette
      const n = notte.getContext('2d'), k = notte.width / W;
      n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, notte.width, notte.height);
      n.fillStyle = 'rgba(6,10,32,.6)'; n.fillRect(0, 0, notte.width, notte.height);
      n.globalCompositeOperation = 'destination-out'; n.setTransform(k, 0, 0, k, 0, 0);
      const luce = (x, y, r) => { const gr = n.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = gr; n.beginPath(); n.arc(x, y, r, 0, TAU); n.fill(); };
      luce(ex.torre.x, ex.torre.y, 120);
      for (const t of st.t) luce(10 + t[2] * ex.CELLA + ex.CELLA / 2, t[3] * ex.CELLA + ex.CELLA / 2, 75);
      g.drawImage(notte, 0, 0, W, H);
      // la luna e le lucciole
      brilla(g, W - 26, 26, 50, 'rgba(230,235,255,.22)'); cerchio(g, W - 26, 26, 15, 'rgba(238,240,255,.9)'); cerchio(g, W - 21, 22, 3, 'rgba(180,185,210,.6)'); cerchio(g, W - 31, 31, 2.4, 'rgba(180,185,210,.6)');
      for (const f of meteo) { f.x += Math.cos(adesso * 0.7 + f.f) * 15 * dt; f.y += Math.sin(adesso * 0.9 + f.f) * 12 * dt; brilla(g, ((f.x % W) + W) % W, ((f.y % H) + H) % H, 5, `rgba(190,255,150,${0.5 + 0.4 * Math.sin(adesso * 4 + f.f)})`); }
    }
  }

  function menu(ctx, s) {
    if (!sel || !ex) return '';
    const x = 10 + sel.i * ex.CELLA + ex.CELLA / 2, y = sel.j * ex.CELLA + ex.CELLA / 2;
    const stile = `left:${(x / ex.W) * 100}%;top:${(Math.max(95, Math.min(ex.H - 95, y)) / ex.H) * 100}%;${x > ex.W * 0.6 ? 'transform:translate(calc(-100% - 24px),-50%)' : 'transform:translate(24px,-50%)'}`;
    const oro = s.oro[ctx.mio];
    if (sel.id) {
      const t = s.t.find((q) => q[0] === sel.id);
      if (!t) { sel = null; return ''; }
      const [, tipo, , , liv, , , costo, vendita] = t, def = ex.torri[tipo];
      return `<div class="dt-menu" style="${stile}"><p class="dt-tit">${ICONE[tipo]} ${esc(def.nome)} · livello ${liv}</p>
        ${costo === null ? '<p class="dt-nota">Livello massimo</p>' : `<button type="button" class="dt-bt" data-az="migliora" data-id="${t[0]}" ${oro < costo ? 'disabled' : ''}>⬆️ Migliora <b>${costo} 🪙</b></button>`}
        <button type="button" class="dt-bt" data-az="vendi" data-id="${t[0]}">💰 Vendi <b>+${vendita} 🪙</b></button>
        <button type="button" class="dt-x" data-az="chiudi" aria-label="Chiudi">✕</button></div>`;
    }
    return `<div class="dt-menu" style="${stile}"><p class="dt-tit">Costruisci</p>
      ${Object.entries(ex.torri).map(([k, d]) => `<button type="button" class="dt-bt" data-az="costruisci" data-torre="${k}" ${oro < d.costo ? 'disabled' : ''}>${ICONE[k]} ${esc(d.nome)} <b>${d.costo} 🪙</b></button>`).join('')}
      <button type="button" class="dt-x" data-az="chiudi" aria-label="Chiudi">✕</button></div>`;
  }

  let tPrima = 0;
  const tavolo = window.Arena.tavolo({
    id: 'difesa',
    mouse: null,
    clicAzione: false,
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => `${window.Arena.touch() ? 'Tocca' : 'Clicca'} un prato libero vicino alla tua strada per costruire una torretta, ${window.Arena.touch() ? 'tocca' : 'clicca'} una tua torretta per migliorarla o venderla. Ferma i mostri prima della torre!`,
    statoGioco: (ctx, s) => (s.s.fu[ctx.mio] ? 'La tua porta è caduta' : s.s.st === 'attesa' ? `Ondata ${s.s.k + 1} tra ${s.s.fra} s` : `Ondata ${s.s.k} di ${ctx.partita.extra ? ctx.partita.extra.totale : ''}`),
    hud: (ctx, s) => `${ctx.partita.extra && ctx.partita.extra.nomeMappa ? `<span>${esc(ctx.partita.extra.nomeMappa)}</span>` : ''}<span>🪙 ${s.s.oro[ctx.mio]}</span><span>❤️ ${s.s.vite !== null && s.s.vite !== undefined ? s.s.vite : s.s.vp[ctx.mio]}</span><span>🌊 ${s.s.k}/${ctx.partita.extra ? ctx.partita.extra.totale : ''}</span>${s.s.ev === 'tempesta' ? '<span>🌪️ tempesta</span>' : s.s.ev === 'eruzione' ? '<span>🌋 eruzione</span>' : ''}${s.s.w.includes(ctx.mio) ? '<span>✨ torrette potenziate</span>' : ''}`,
    fineRound: (p) => (p.risultato && p.risultato.titolo) || '',
    sopra: (ctx, d) => {
      if (d.fase !== 'gioco' && d.fase !== 'via') return '';
      const s = d.s;
      const pronto = s.st === 'attesa' && !s.fu[ctx.mio]
        ? `<button type="button" class="dt-pronto${s.pr[ctx.mio] ? ' dt-si' : ''}" data-az="pronto" ${s.pr[ctx.mio] ? 'disabled' : ''}>${s.pr[ctx.mio] ? '✔ Pronto' : `▶ Pronto! (+${s.fra * 2} 🪙)`}</button>` : '';
      return pronto + menu(ctx, s);
    },
    clic(ctx, el) {
      const a = el.dataset.az;
      if (a === 'chiudi') sel = null;
      else if (a === 'pronto') ctx.invia({ tipo: 'pronto' });
      else if (a === 'costruisci' && sel) { ctx.invia({ tipo: 'costruisci', i: sel.i, j: sel.j, torre: el.dataset.torre }); sel = null; suono([[392, 0.05], [523, 0.08]], { volume: 0.05 }); }
      else if (a === 'migliora') { ctx.invia({ tipo: 'migliora', id: Number(el.dataset.id) }); suono([[523, 0.05], [784, 0.1]], { volume: 0.05 }); }
      else if (a === 'vendi') { ctx.invia({ tipo: 'vendi', id: Number(el.dataset.id) }); sel = null; suono([[880, 0.04], [660, 0.06]], { volume: 0.05 }); }
    },
    dopoTick(ctx, d) {
      ctxD = ctx; ex = ctx.partita.extra || ex;
      if (!ex) return;
      const adesso = ora(), s = d.s;
      // all'inizio: il nome della mappa e la sua regola
      if (mappaVista !== ex.mappa + ex.strade.length) { mappaVista = ex.mappa + ex.strade.length; scritte.push({ x: ex.W / 2, y: ex.H / 2 - 110, txt: ex.nomeMappa, grande: true, t: adesso, dura: 3.5 }); if (ex.regola) scritte.push({ x: ex.W / 2, y: ex.H / 2 - 80, txt: ex.regola, regola: true, t: adesso, dura: 4.5 }); }
      // chi è stato colpito (per il lampo) e da che parte cammina
      for (const m of s.m) {
        const v = visti.get(m[0]);
        if (!v) visti.set(m[0], { x: m[2], vita: m[4], dir: 1, lampo: -9, vivo: adesso });
        else { if (Math.abs(m[2] - v.x) > 0.3) v.dir = m[2] >= v.x ? 1 : -1; if (m[4] < v.vita) v.lampo = adesso; v.x = m[2]; v.vita = m[4]; v.vivo = adesso; }
      }
      for (const [id, v] of visti) if (adesso - v.vivo > 2) visti.delete(id);
      const pos = (id) => { const t = s.t.find((q) => q[0] === id); return t ? [10 + t[2] * ex.CELLA + ex.CELLA / 2, t[3] * ex.CELLA + ex.CELLA / 2] : null; };
      for (const e of s.e || []) {
        if (e[0] === 'a' || e[0] === 'g' || e[0] === 'c') { spari.set(e[1], adesso); const da = pos(e[1]); if (da) colpi.push({ k: e[0], da, a: [e[2], e[3]], t: adesso }); if (e[0] === 'c') suono([[90, 0.08]], { tipo: 'square', volume: 0.025 }); }
        else if (e[0] === 'l') { spari.set(e[1], adesso); const da = pos(e[1]); if (da) colpi.push({ k: 'l', da, pt: e[2], t: adesso, seme: Math.random() }); suono([[1200, 0.02], [600, 0.04]], { tipo: 'sawtooth', volume: 0.015 }); }
        else if (e[0] === 'm') {
          if (e[4] === ctx.mio) scritte.push({ x: e[1], y: e[2], txt: `+${e[3]}`, t: adesso });
          const info = (ex.mostri && ex.mostri[e[5]]) || {};
          esplodi(e[1], e[2] - (info.volante ? 12 : 0), COL_PEZZI[e[5]] || '#fff', info.boss ? 40 : 10, info.boss ? 120 : 70);
          anelli.push({ x: e[1], y: e[2], t: adesso, r: info.boss ? 50 : 18, col: '255,255,255' });
          if (info.boss) { scossa = adesso; suono([[200, 0.1], [140, 0.2], [90, 0.3]], { tipo: 'sawtooth', volume: 0.05 }); }
        }
        else if (e[0] === 'x') { if (ex.modo === 'squadra' || e[1] === ctx.mio) { ferita = adesso; suono([[160, 0.1], [110, 0.15]], { tipo: 'sawtooth', volume: 0.05 }); } }
        else if (e[0] === 'o') { scritte.push({ x: ex.W / 2, y: 70, txt: `Ondata ${e[1]}!`, grande: true, t: adesso }); suono([[330, 0.12], [440, 0.12], [330, 0.2]], { tipo: 'triangle', volume: 0.06 }); }
        else if (e[0] === 'f') { scritte.push({ x: ex.W / 2, y: 70, txt: `Ondata ${e[1]} respinta! 🎉`, grande: true, t: adesso }); suono([[523, 0.08], [659, 0.08], [784, 0.15]], { volume: 0.06 }); }
        else if (e[0] === 'h') anelli.push({ x: e[1], y: e[2], t: adesso, r: e[3], col: '110,255,130', cura: true });
        else if (e[0] === 'r') esplodi(e[1], e[2], '#efe6d2', 8, 50);
        else if (e[0] === 'ev' && e[1] === 'evoca') anelli.push({ x: e[2], y: e[3], t: adesso, r: 30, col: '120,255,100' });
        else if (e[0] === 'ev') { scossa = adesso; scritte.push({ x: ex.W / 2, y: 110, txt: e[1] === 'tempesta' ? 'Tempesta di sabbia! 🌪️' : 'Eruzione! 🌋', grande: true, t: adesso }); suono(e[1] === 'tempesta' ? [[200, 0.3], [180, 0.4]] : [[80, 0.3], [60, 0.5]], { tipo: 'sawtooth', volume: 0.05 }); }
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      ctxD = ctx; ex = p.extra || ex;
      if (!ex) return;
      if (!sfondo) preparaSfondo();
      const adesso = ora(), st = s.s, dt = Math.min(0.1, tPrima ? adesso - tPrima : 0); tPrima = adesso;
      // la scossa (capo sconfitto, eruzione)
      const sc = adesso - scossa < 0.35 ? (1 - (adesso - scossa) / 0.35) * 4 : 0;
      g.save(); if (sc) g.translate((Math.random() - 0.5) * sc, (Math.random() - 0.5) * sc);
      g.drawImage(sfondo, 0, 0, ex.W, ex.H);
      // la lava che pulsa
      if (ex.mappa === 'vulcano') { g.fillStyle = `rgba(255,90,0,${0.04 + 0.03 * Math.sin(adesso * 2)})`; g.fillRect(0, 0, ex.W, ex.H); }
      // i segni delle esplosioni sul terreno
      segni = segni.filter((q) => adesso - q.t < 4);
      for (const q of segni) ovale(g, q.x, q.y, 13, 8, `rgba(20,15,10,${0.35 * (1 - (adesso - q.t) / 4)})`);
      // la casella sotto il mouse e quella scelta, col raggio della torretta
      const segna = (c, col) => { if (!c) return; g.fillStyle = col; g.fillRect(10 + c[0] * ex.CELLA + 2, c[1] * ex.CELLA + 2, ex.CELLA - 4, ex.CELLA - 4); };
      if (sopraCella && !window.Arena.touch() && mia(sopraCella[0], sopraCella[1]) && !torreIn(st, sopraCella[0], sopraCella[1])) segna(sopraCella, 'rgba(255,255,255,.22)');
      if (sel) {
        segna([sel.i, sel.j], 'rgba(255,230,120,.4)');
        const t = sel.id && st.t.find((q) => q[0] === sel.id), r = t ? t[9] : 110;
        const cx = 10 + sel.i * ex.CELLA + ex.CELLA / 2, cy = sel.j * ex.CELLA + ex.CELLA / 2;
        g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); g.setLineDash([]);
      }
      torre(g, st, adesso);
      // torrette e mostri a terra in ordine dall'alto in basso; i volanti sopra a tutto
      const pr = new Map(prima ? prima.s.m.map((m) => [m[0], m]) : []);
      const lista = st.m.map((m) => { const a = pr.get(m[0]); return a ? [m[0], m[1], a[2] + (m[2] - a[2]) * u, a[3] + (m[3] - a[3]) * u, m[4], m[5]] : m; });
      const cose = [...st.t.map((t) => ({ y: t[3] * ex.CELLA + ex.CELLA / 2 + 4, t })), ...lista.filter((m) => !(ex.mostri && ex.mostri[m[1]] && ex.mostri[m[1]].volante)).map((m) => ({ y: m[3], m }))];
      cose.sort((a, b) => a.y - b.y);
      for (const c of cose) if (c.t) torretta(g, c.t, adesso); else mostro(g, c.m, adesso);
      for (const m of lista) if (ex.mostri && ex.mostri[m[1]] && ex.mostri[m[1]].volante) mostro(g, m, adesso);
      // i colpi
      colpi = colpi.filter((c) => adesso - c.t < (c.k === 'c' ? 0.55 : 0.28));
      for (const c of colpi) {
        const tt = adesso - c.t;
        if (c.k === 'l') {
          // il fulmine: un bagliore viola largo e un filo bianco, a zig-zag
          const a = 1 - tt / 0.28, rr = caso(Math.floor(c.seme * 1e6) + Math.floor(tt * 30));
          const zz = []; let [x0, y0] = [c.da[0], c.da[1] - 6];
          zz.push([x0, y0]); for (const q of c.pt) { for (let k = 1; k <= 3; k++) zz.push([x0 + ((q[0] - x0) * k) / 4 + (rr() - 0.5) * 16, y0 + ((q[1] - y0) * k) / 4 + (rr() - 0.5) * 16]); zz.push([q[0], q[1]]); [x0, y0] = q; }
          tratto(g, 7, `rgba(170,110,255,${0.35 * a})`); linea(g, zz); tratto(g, 2.5, `rgba(235,215,255,${a})`); linea(g, zz); tratto(g, 1, `rgba(255,255,255,${a})`); linea(g, zz);
          for (const q of c.pt) brilla(g, q[0], q[1], 14, `rgba(210,170,255,${0.6 * a})`);
          continue;
        }
        const dur = c.k === 'c' ? 0.3 : 0.15, f = Math.min(1, tt / dur), x = c.da[0] + (c.a[0] - c.da[0]) * f, y = c.da[1] + (c.a[1] - c.da[1]) * f - (c.k === 'c' ? Math.sin(f * Math.PI) * 30 : 0);
        if (f < 1) {
          const an = Math.atan2(c.a[1] - c.da[1], c.a[0] - c.da[0]);
          if (c.k === 'a') { tratto(g, 1.6, '#5a3a1a'); linea(g, [[x - Math.cos(an) * 10, y - Math.sin(an) * 10], [x, y]]); poli(g, [[x + Math.cos(an) * 3, y + Math.sin(an) * 3], [x - Math.sin(an) * 1.8, y + Math.cos(an) * 1.8], [x + Math.sin(an) * 1.8, y - Math.cos(an) * 1.8]], '#d8dde3'); tratto(g, 1.4, '#e8453c'); linea(g, [[x - Math.cos(an) * 10, y - Math.sin(an) * 10], [x - Math.cos(an) * 7, y - Math.sin(an) * 7]]); }
          else if (c.k === 'g') { tratto(g, 3, 'rgba(170,230,255,.4)'); linea(g, [[x - Math.cos(an) * 12, y - Math.sin(an) * 12], [x, y]]); g.save(); g.translate(x, y); g.rotate(an); poli(g, [[5, 0], [0, -2.5], [-4, 0], [0, 2.5]], '#e8f8ff'); g.restore(); }
          else { cerchio(g, x - Math.cos(an) * 6, y - Math.sin(an) * 6 + 2, 3, 'rgba(120,120,120,.35)'); palla(g, x, y, 4.5, 4.5, '#333338'); }
        } else if (c.k === 'c') {
          const k = (tt - dur) / 0.25;
          if (k < 0.1 && !c.segno) { c.segno = true; segni.push({ x: c.a[0], y: c.a[1], t: adesso }); esplodi(c.a[0], c.a[1], '#7a5a3a', 6, 60); }
          brilla(g, c.a[0], c.a[1], 18 + k * 30, `rgba(255,170,40,${0.85 * (1 - k)})`); cerchio(g, c.a[0], c.a[1], 8 * (1 - k), `rgba(255,240,180,${1 - k})`);
          g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.arc(c.a[0], c.a[1], 10 + k * 34, 0, TAU); g.stroke();
        } else if (c.k === 'g' && tt - dur < 0.1) { for (let q = 0; q < 4; q++) { const an = q * 1.57 + tt * 10; tratto(g, 1.2, 'rgba(220,245,255,.9)'); linea(g, [[c.a[0], c.a[1]], [c.a[0] + Math.cos(an) * 7, c.a[1] + Math.sin(an) * 7]]); } }
      }
      // i pezzi, gli anelli (cura, morte, evocazione)
      pezzi = pezzi.filter((q) => adesso - q.t < q.dura);
      for (const q of pezzi) { const tt = adesso - q.t; g.globalAlpha = 1 - tt / q.dura; cerchio(g, q.x + q.vx * tt, q.y + q.vy * tt + 160 * tt * tt, q.r, q.col); }
      g.globalAlpha = 1;
      anelli = anelli.filter((q) => adesso - q.t < 0.6);
      for (const q of anelli) {
        const k = (adesso - q.t) / 0.6;
        g.strokeStyle = `rgba(${q.col},${0.7 * (1 - k)})`; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.arc(q.x, q.y, q.r * (q.cura ? k : 0.4 + k * 0.8), 0, TAU); g.stroke();
        if (q.cura) { g.fillStyle = `rgba(${q.col},${1 - k})`; g.font = '800 12px system-ui'; g.textAlign = 'center'; for (let n = 0; n < 4; n++) g.fillText('+', q.x + Math.cos(n * 1.6) * 16, q.y - k * 20 + Math.sin(n * 1.6) * 8); }
      }
      tempo(g, st, adesso, dt);
      g.restore();
      // le scritte
      scritte = scritte.filter((w) => adesso - w.t < (w.dura || (w.grande ? 2 : 0.9)));
      g.textAlign = 'center';
      for (const w of scritte) {
        const tt = adesso - w.t, dur = w.dura || (w.grande ? 2 : 0.9);
        g.globalAlpha = Math.max(0, Math.min(1, (dur - tt) * 3));
        g.font = `${w.regola ? 700 : 900} ${w.grande ? 34 : w.regola ? 15 : 15}px system-ui`;
        const yy = w.y - (w.grande || w.regola ? 0 : tt * 30);
        if (w.regola) { const lw = Math.min(ex.W - 40, g.measureText(w.txt).width + 24); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(ex.W / 2 - lw / 2, yy - 16, lw, 24); g.fillStyle = '#fff'; g.fillText(w.txt, w.x, yy, ex.W - 60); continue; }
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(w.txt, w.x, yy); g.fillStyle = w.grande ? '#fff' : '#ffd23f'; g.fillText(w.txt, w.x, yy);
      }
      g.globalAlpha = 1;
      // in alto a sinistra: le monete di tutti (in squadra) o le vite (in sfida)
      if (st.oro.length > 1) {
        g.textAlign = 'left'; g.font = '700 13px system-ui';
        st.oro.forEach((o, k) => { const txt = `${k === ctx.mio ? 'Tu' : ctx.nome(k).slice(0, 10)}: ${o} 🪙${ex.modo === 'sfida' ? ` · ${st.fu[k] ? '✖' : `${st.vp[k]} ❤️`}` : ''}`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(txt, 8, 16 + k * 17); g.fillStyle = COLORI[k % COLORI.length]; g.fillText(txt, 8, 16 + k * 17); });
      }
    },
  });
  const reset0 = tavolo.reset;
  tavolo.reset = (ctx) => {
    const nuovo = ctx.partita && ctx.partita.extra;
    if (nuovo && (!ex || JSON.stringify(nuovo.strade) !== JSON.stringify(ex.strade) || nuovo.mappa !== ex.mappa)) { sfondo = null; sel = null; mappaVista = null; }
    ctxD = ctx; ex = nuovo || ex;
    reset0.call(tavolo, ctx);
  };
  Object.assign(window.Tavoli, { difesa: tavolo });
})();
