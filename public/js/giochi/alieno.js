// CHI È L'ALIENO: la base spaziale vista dall'alto (disegnata una volta sola), la telecamera che segue il tuo astronauta,
// la visuale limitata con i muri che coprono, gli astronauti in tuta con casco e visiera che camminano, i compiti
// (sei minigiochi), le riunioni con il voto e l'espulsione nello spazio.
(() => {
  const { lerp } = window.Arena;
  const { esc } = window.Nuovi;
  const COL = ['#e0413a', '#2f6fd8', '#2e9d57', '#f2c230', '#f08a24', '#8e55c9', '#f07ab8', '#46c8e8', '#e8e8e8', '#8a5a36'];
  const NOMI_COL = ['rosso', 'blu', 'verde', 'giallo', 'arancione', 'viola', 'rosa', 'azzurro', 'bianco', 'marrone'];
  let mondo = null, nebbia = null, stelle = null, ctxG = null;
  const loc = { compito: null, inizio: 0, stato: null, ruoloVisto: false, listaAperta: false };
  // sul telefono: niente tasti tra parentesi e lista dei compiti chiusa (si apre toccandola), così non copre la mappa e il joystick
  const dito = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
  const tasto = (t) => (dito() ? '' : ` (${t})`);
  const ombra = (c, k) => { const n = parseInt(c.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ================= LA BASE (disegnata una volta) =================
  function disegnaMondo(ex) {
    const { mappa, t: T, mw, mh } = ex;
    const c = document.createElement('canvas'); c.width = mw; c.height = mh;
    const g = c.getContext('2d');
    const tema = ex.tema, TM = window.AlienoTemi;
    // intorno alla base: lo spazio, il mare di lava, la giungla, gli abissi o la neve
    TM.fondo(g, tema, mw, mh);
    const pieno = (c2, r) => r >= 0 && r < mappa.length && c2 >= 0 && c2 < mappa[0].length && mappa[r][c2] !== '#';
    // pavimenti: ogni stanza ha il suo, i corridoi hanno le grate
    const PAV = tema.pavimenti;
    const stanzaDi = (c2, r) => ex.stanze.find((s) => c2 >= s.r[0] && c2 < s.r[0] + s.r[2] && r >= s.r[1] && r < s.r[1] + s.r[3]);
    for (let r = 0; r < mappa.length; r++) for (let k = 0; k < mappa[r].length; k++) {
      if (mappa[r][k] === '#') continue;
      const x = k * T, y = r * T, s = stanzaDi(k, r);
      if (s) {
        const [a, b] = PAV[s.id] || ['#555b66', '#4d535d']; g.fillStyle = (k + r) % 2 ? a : b; g.fillRect(x, y, T, T);
        TM.pavimento(g, tema, x, y, T, k, r);
        g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
        if (ex.mappaId === 'base' && s.id === 'serra') { g.fillStyle = 'rgba(120,200,90,.25)'; g.beginPath(); g.arc(x + 10 + rnd(k * r) * 20, y + 10 + rnd(k + r) * 20, 3, 0, Math.PI * 2); g.fill(); }
      } else {
        TM.corridoio(g, tema, x, y, T, k, r); // grata, sentiero, radici, tubo o ghiaccio
      }
    }
    // muri: solo quelli che toccano un pavimento; quelli sul bordo esterno hanno le finestre sulle stelle
    for (let r = 0; r < mappa.length; r++) for (let k = 0; k < mappa[r].length; k++) {
      if (mappa[r][k] !== '#') continue;
      const vicino = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => pieno(k + a, r + b));
      if (!vicino) continue;
      const x = k * T, y = r * T;
      const gr = g.createLinearGradient(x, y, x, y + T); gr.addColorStop(0, tema.muro[0]); gr.addColorStop(1, tema.muro[1]);
      g.fillStyle = gr; g.fillRect(x, y, T, T);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, T, 3);
      g.strokeStyle = 'rgba(20,24,32,.6)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      g.fillStyle = '#39404d'; g.beginPath(); g.arc(x + 5, y + 5, 1.5, 0, Math.PI * 2); g.arc(x + T - 5, y + 5, 1.5, 0, Math.PI * 2); g.arc(x + 5, y + T - 5, 1.5, 0, Math.PI * 2); g.arc(x + T - 5, y + T - 5, 1.5, 0, Math.PI * 2); g.fill();
      // finestra se dietro c'è lo spazio aperto (due tile di muro verso l'esterno) e davanti un pavimento
      const esterno = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([a, b]) => !pieno(k + a, r + b) && !pieno(k + a * 2, r + b * 2) && pieno(k - a, r - b));
      if (esterno && tema.finestre && (k + r) % 3 === 0) {
        g.fillStyle = { abisso: '#0a3a5c', neve: '#dfeefa' }[tema.fondo] || '#0b1230'; g.fillRect(x + 7, y + 7, T - 14, T - 14);
        for (let j = 0; j < 5; j++) { g.fillStyle = '#fff'; g.fillRect(x + 9 + rnd(k * 7 + j) * (T - 18), y + 9 + rnd(r * 5 + j) * (T - 18), 1.5, 1.5); }
        g.strokeStyle = '#a8c8ff'; g.lineWidth = 2; g.strokeRect(x + 7, y + 7, T - 14, T - 14);
        g.fillStyle = 'rgba(168,200,255,.18)'; g.fillRect(x + 8, y + 8, 8, T - 16);
      }
    }
    // ponti di corda (isola vulcanica)
    for (const pz of ex.ponti || []) TM.ponte(g, T, pz);
    // mobili
    for (const [x0, y0, w0, h0, tipo] of ex.mobili) { if (!TM.mobile(g, x0 * T, y0 * T, w0 * T, h0 * T, tipo)) mobile(g, x0 * T, y0 * T, w0 * T, h0 * T, tipo); }
    // decorazioni (non ostacolano): nella base quelle disegnate stanza per stanza, nelle altre mappe quelle della mappa
    if (ex.mappaId === 'base') decori(g, ex); else for (const d of ex.decori || []) TM.decoro(g, T, d);
    // nome delle stanze sul pavimento
    g.font = '800 26px system-ui'; g.textAlign = 'center';
    for (const s of ex.stanze) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillText(s.nome.toUpperCase(), (s.r[0] + s.r[2] / 2) * T, (s.r[1] + s.r[3]) * T - 14); }
    return c;
  }
  function tondo(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function mobile(g, x, y, w, h, tipo) {
    g.fillStyle = 'rgba(0,0,0,.3)'; tondo(g, x + 4, y + 6, w - 2, h - 2, 6); g.fill();
    if (tipo === 'tavolo-pulsante') {
      g.fillStyle = '#4a5160'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6a7384'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8322a'; g.beginPath(); g.arc(x + w / 2, y + h / 2 - 2, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x + w / 2 - 4, y + h / 2 - 7, 5, 3, -0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f2c230'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 2, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    } else if (tipo === 'aiuola') {
      g.fillStyle = '#6b4a2a'; tondo(g, x + 2, y + 2, w - 4, h - 4, 8); g.fill(); g.fillStyle = '#4a321c'; tondo(g, x + 7, y + 7, w - 14, h - 14, 6); g.fill();
      for (let k = 0; k < 7; k++) { const px = x + 14 + rnd(x + k) * (w - 28), py = y + 14 + rnd(y + k * 3) * (h - 28); g.fillStyle = ['#4fb05a', '#3c9447', '#6fcf6a'][k % 3]; for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(px + Math.cos(j * 1.26) * 6, py + Math.sin(j * 1.26) * 6, 6, 3, j * 1.26, 0, Math.PI * 2); g.fill(); } if (k % 3 === 0) { g.fillStyle = '#f07ab8'; g.beginPath(); g.arc(px, py, 3, 0, Math.PI * 2); g.fill(); } }
    } else if (tipo === 'console') {
      g.fillStyle = '#2b3140'; tondo(g, x, y, w, h, 6); g.fill();
      for (let k = 0; k < w / 40; k++) { g.fillStyle = '#10213a'; g.fillRect(x + 6 + k * 40, y + 5, 28, 18); g.fillStyle = ['#46c8e8', '#7dffa0', '#f2c230'][k % 3]; g.fillRect(x + 9 + k * 40, y + 8, 10 + (k * 7) % 14, 3); g.fillRect(x + 9 + k * 40, y + 14, 16, 2); g.fillStyle = k % 2 ? '#e8322a' : '#7dffa0'; g.beginPath(); g.arc(x + 20 + k * 40, y + 32, 3, 0, Math.PI * 2); g.fill(); }
    } else if (tipo === 'antenna') {
      g.fillStyle = '#3a4150'; tondo(g, x, y, w, h, 8); g.fill();
      g.strokeStyle = '#c8d0dc'; g.lineWidth = 4; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 8, -2.4, -0.7); g.stroke(); g.beginPath(); g.moveTo(x + w / 2, y + h / 2); g.lineTo(x + w / 2 + 14, y + h / 2 - 22); g.stroke();
      g.fillStyle = '#e8322a'; g.beginPath(); g.arc(x + w / 2 + 14, y + h / 2 - 22, 4, 0, Math.PI * 2); g.fill();
    } else if (tipo === 'bancone') {
      g.fillStyle = '#e8ecf0'; tondo(g, x, y, w, h, 5); g.fill(); g.strokeStyle = '#aab3bf'; g.lineWidth = 2; g.stroke();
      for (let k = 0; k < 3; k++) { g.fillStyle = ['#46c8e8', '#7dffa0', '#f07ab8'][k]; g.fillRect(x + 12 + k * 34, y + 8, 6, 22); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 12 + k * 34, y + 8, 2, 22); }
    } else if (tipo === 'letto') {
      g.fillStyle = '#b8c4cf'; tondo(g, x + 2, y, w - 4, h, 6); g.fill(); g.fillStyle = '#ffffff'; tondo(g, x + 5, y + 4, w - 10, 16, 5); g.fill(); g.fillStyle = '#7ab8e0'; tondo(g, x + 5, y + 24, w - 10, h - 30, 4); g.fill();
    } else if (tipo === 'tavolino') {
      g.fillStyle = '#8a6a44'; tondo(g, x, y + 4, w, h - 8, 6); g.fill(); g.fillStyle = '#e8e8e8'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 14 + k * 26, y + h / 2, 7, 0, Math.PI * 2); g.fill(); }
    } else if (tipo === 'motore') {
      const gr = g.createLinearGradient(x, y, x + w, y); gr.addColorStop(0, '#6b717d'); gr.addColorStop(0.5, '#aab2bf'); gr.addColorStop(1, '#6b717d');
      g.fillStyle = gr; tondo(g, x, y, w, h, 14); g.fill();
      g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(x + w / 2, y + h - 8, w / 2 - 8, 6, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4b5059'; g.lineWidth = 3; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 4, y + (h * k) / 4); g.lineTo(x + w - 4, y + (h * k) / 4); g.stroke(); }
    } else if (tipo === 'nucleo') {
      g.fillStyle = '#2b3140'; tondo(g, x, y, w, h, 12); g.fill();
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, h / 2); gr.addColorStop(0, '#d8fff0'); gr.addColorStop(0.5, '#3de0a8'); gr.addColorStop(1, 'rgba(61,224,168,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x + w / 2, y + h / 2, h / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8a929c'; g.lineWidth = 3; g.beginPath(); g.arc(x + w / 2, y + h / 2, h / 2 - 4, 0, Math.PI * 2); g.stroke();
    } else if (tipo === 'cassa') {
      g.fillStyle = '#9a7340'; g.fillRect(x + 2, y + 2, w - 4, h - 4); g.strokeStyle = '#6b4e28'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
      g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + h - 4); g.stroke();
      g.fillStyle = '#f2c230'; g.font = '700 10px system-ui'; g.textAlign = 'center'; g.fillText('BASE-7', x + w / 2, y + h / 2 + 4);
    } else { g.fillStyle = '#5a6272'; g.fillRect(x, y, w, h); }
  }
  function decori(g, ex) {
    const T = ex.t, s = (id) => ex.stanze.find((q) => q.id === id).r;
    const pianta = (x, y) => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 3, y + 5, 12, 5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#b5623a'; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill(); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#4fb05a' : '#3c9447'; g.beginPath(); g.ellipse(x + Math.cos(k) * 9, y + Math.sin(k) * 9, 9, 4, k, 0, Math.PI * 2); g.fill(); } };
    const schermo = (x, y, c) => { g.fillStyle = '#1b2230'; g.fillRect(x, y, 30, 10); g.fillStyle = c; g.fillRect(x + 3, y + 2, 18, 2); g.fillRect(x + 3, y + 6, 10, 2); };
    const tubo = (x0, y0, x1, y1) => { g.strokeStyle = '#7a8494'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - 2); g.lineTo(x1, y1 - 2); g.stroke(); };
    const luce = (x, y, c) => { const gr = g.createRadialGradient(x, y, 1, x, y, 70); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 70, 0, Math.PI * 2); g.fill(); };
    // serra
    let [x, y, w, h] = s('serra'); pianta((x + 1) * T, (y + 1) * T + 10); pianta((x + w - 1) * T, (y + 1) * T); luce((x + w / 2) * T, (y + h / 2) * T, 'rgba(180,255,150,.12)');
    // plancia
    [x, y, w, h] = s('plancia'); luce((x + w / 2) * T, (y + 1) * T, 'rgba(90,160,255,.18)'); for (let k = 0; k < 3; k++) schermo((x + 2 + k * 4) * T, (y + h - 1) * T, '#46c8e8');
    // comunicazioni
    [x, y, w, h] = s('comunicazioni'); for (let k = 0; k < 4; k++) schermo((x + 4 + k * 1.5) * T, (y + h - 1) * T + 10, k % 2 ? '#7dffa0' : '#f2c230'); pianta((x + w - 1) * T, (y + h - 1) * T);
    // laboratorio
    [x, y, w, h] = s('laboratorio'); for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(70,200,232,.35)'; g.beginPath(); g.arc((x + 2 + k * 3) * T, (y + h - 2) * T, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#8fd9ec'; g.lineWidth = 2; g.stroke(); }
    // sala comune: panche intorno al tavolo e luce calda
    [x, y, w, h] = s('sala'); luce((x + w / 2) * T, (y + h / 2) * T, 'rgba(255,220,150,.14)'); pianta((x + 1) * T, (y + h - 1) * T); pianta((x + w - 1) * T, (y + 1) * T);
    // infermeria: croce sul pavimento
    [x, y, w, h] = s('infermeria'); g.fillStyle = 'rgba(224,65,58,.35)'; g.fillRect((x + w / 2) * T - 8, (y + h / 2) * T - 26, 16, 52); g.fillRect((x + w / 2) * T - 26, (y + h / 2) * T - 8, 52, 16);
    // mensa
    [x, y, w, h] = s('mensa'); pianta((x + w - 1) * T, (y + 1) * T);
    // motori: tubi
    [x, y, w, h] = s('motori'); tubo((x + 1) * T, (y + 1) * T, (x + w - 1) * T, (y + 1) * T); tubo((x + w - 1) * T, (y + 1) * T, (x + w - 1) * T, (y + h - 3) * T); luce((x + 3) * T, (y + h - 1) * T, 'rgba(255,140,40,.18)');
    // reattore: bagliore verde
    [x, y, w, h] = s('reattore'); luce((x + w / 2) * T, (y + h / 2) * T, 'rgba(61,224,168,.2)'); tubo((x + 1) * T, (y + h - 1) * T, (x + 5) * T, (y + h - 1) * T); tubo((x + w - 5) * T, (y + 1) * T, (x + w - 1) * T, (y + 1) * T);
    // magazzino: pallet
    [x, y, w, h] = s('magazzino'); g.strokeStyle = 'rgba(242,194,48,.5)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.strokeRect((x + 1) * T, (y + 1) * T, (w - 2) * T, (h - 2) * T); g.setLineDash([]);
  }

  // ================= L'ASTRONAUTA =================
  // proporzioni umane, vista di tre quarti: stivali, gambe, tuta con pannello sul petto, zaino, casco con visiera
  function astronauta(g, x, y, col, dir, fase, opz = {}) {
    const passo = opz.fermo ? 0 : Math.sin(fase * 10), dx = dir < 0 ? -1 : 1;
    g.save(); g.translate(x, y);
    if (!opz.fantasma) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 20, 13, 4.5, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = opz.alfa ?? 1;
    if (opz.fantasma) g.translate(0, Math.sin(fase * 3) * 3);
    const scuro = ombra(col, 0.72), chiaro = ombra(col, 1.15);
    // gambe (niente gambe per i fantasmi: una scia)
    if (!opz.fantasma) {
      for (const [lato, s] of [[-1, passo], [1, -passo]]) {
        g.save(); g.translate(lato * 4.5, 6); g.rotate(s * 0.35);
        g.fillStyle = scuro; tondo(g, -3.5, 0, 7, 12, 3); g.fill();
        g.fillStyle = '#3a3f48'; tondo(g, -4, 10, 8 + dx, 5, 2); g.fill();
        g.restore();
      }
    } else { g.fillStyle = ombra(col, 0.9); g.beginPath(); g.moveTo(-8, 6); g.quadraticCurveTo(0, 26, 8, 6); g.fill(); }
    // zaino dietro
    g.fillStyle = '#9aa3b0'; tondo(g, -dx * 12 - 4, -12, 8, 16, 3); g.fill(); g.fillStyle = '#6c7482'; g.fillRect(-dx * 12 - 2, -9, 4, 3);
    // busto
    g.fillStyle = col; tondo(g, -9, -13, 18, 21, 6); g.fill();
    g.fillStyle = chiaro; tondo(g, -8, -12, 7, 18, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9, 3, 18, 3); // cintura
    // pannello sul petto con le lucine
    g.fillStyle = '#dfe4ea'; tondo(g, dx * 1 - 4, -8, 8, 7, 1.5); g.fill();
    g.fillStyle = '#e8322a'; g.fillRect(dx * 1 - 2.5, -6, 2, 2); g.fillStyle = '#3de0a8'; g.fillRect(dx * 1 + 0.5, -6, 2, 2);
    // braccia che oscillano
    for (const [lato, s] of [[-1, -passo], [1, passo]]) { g.save(); g.translate(lato * 10, -10); g.rotate(s * 0.4); g.fillStyle = scuro; tondo(g, -3, 0, 6, 13, 3); g.fill(); g.fillStyle = '#e6e9ee'; g.beginPath(); g.arc(0, 13, 3, 0, Math.PI * 2); g.fill(); g.restore(); }
    // casco
    g.fillStyle = '#eef1f5'; g.beginPath(); g.arc(0, -22, 11, 0, Math.PI * 2); g.fill();
    g.strokeStyle = scuro; g.lineWidth = 2; g.beginPath(); g.arc(0, -22, 11, 0.6, Math.PI - 0.6); g.stroke();
    // visiera verso la direzione in cui cammina, con il riflesso
    const vg = g.createLinearGradient(dx * 2 - 7, -28, dx * 2 + 7, -16); vg.addColorStop(0, '#1b2a4a'); vg.addColorStop(1, '#3a6aa8');
    g.fillStyle = vg; g.beginPath(); g.ellipse(dx * 3, -22, 7.5, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(dx * 3 - 2.5, -24.5, 2.8, 1.4, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(dx * 3 + 2, -21, 2, 3);
    if (opz.compito) { g.fillStyle = '#f2c230'; g.font = '14px system-ui'; g.textAlign = 'center'; g.fillText('🛠️', 0, -38); }
    g.restore();
    if (opz.nome) { g.save(); g.font = '700 12px system-ui'; g.textAlign = 'center'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText(opz.nome, x, y - 38 - (opz.compito ? 12 : 0)); g.fillStyle = opz.coloreNome || '#fff'; g.fillText(opz.nome, x, y - 38 - (opz.compito ? 12 : 0)); g.restore(); }
  }
  // il corpo a terra: disteso, visiera incrinata, qualche stellina di stordimento (niente di cruento)
  function corpo(g, x, y, col) {
    g.save(); g.translate(x, y); g.rotate(Math.PI / 2 * 0.95);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 4, 26, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ombra(col, 0.72); tondo(g, -4, 4, 8, 16, 3); g.fill(); tondo(g, 5, 4, 8, 16, 3); g.fill();
    g.fillStyle = col; tondo(g, -9, -13, 20, 20, 6); g.fill();
    g.fillStyle = '#eef1f5'; g.beginPath(); g.arc(1, -22, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b2a4a'; g.beginPath(); g.ellipse(3, -22, 7.5, 6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#dfe9ff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1, -26); g.lineTo(3, -22); g.lineTo(1, -18); g.moveTo(3, -22); g.lineTo(8, -21); g.stroke();
    g.restore();
    g.fillStyle = '#f2c230'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText('✦', x - 16, y - 20); g.fillText('✦', x + 14, y - 26);
  }

  // ================= VISUALE: i muri coprono =================
  // il poligono di ciò che si vede: per ogni direzione un raggio che avanza da una casella all'altra della griglia
  // (metodo DDA) e si ferma esattamente sul bordo del primo muro, entrando un poco nel muro così la sua faccia si
  // vede illuminata. Niente passi fissi: niente bordi seghettati né luce che filtra dagli angoli.
  function poligonoVista(ex, x, y, raggio) {
    const { mappa, t: T } = ex, N = 540, pts = [];
    const muro = (c, r) => !mappa[r] || mappa[r][c] === undefined || mappa[r][c] === '#';
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let c = Math.floor(x / T), r = Math.floor(y / T);
      const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
      const ddx = Math.abs(dx) < 1e-9 ? Infinity : T / Math.abs(dx), ddy = Math.abs(dy) < 1e-9 ? Infinity : T / Math.abs(dy);
      let tx = Math.abs(dx) < 1e-9 ? Infinity : (dx > 0 ? (c + 1) * T - x : x - c * T) / Math.abs(dx);
      let ty = Math.abs(dy) < 1e-9 ? Infinity : (dy > 0 ? (r + 1) * T - y : y - r * T) / Math.abs(dy);
      let d = raggio;
      for (let giri = 0; giri < 64; giri++) {
        let t;
        if (tx < ty) { t = tx; tx += ddx; c += sx; } else { t = ty; ty += ddy; r += sy; }
        if (t >= raggio) break;
        if (muro(c, r)) { d = Math.min(raggio, t + T * 0.45); break; }
      }
      pts.push([x + dx * d, y + dy * d]);
    }
    return pts;
  }

  // ================= MINIMAPPA =================
  function minimappa(g, ex, s, cam, W, H) {
    const sc = 0.085, mw = ex.mw * sc, mh = ex.mh * sc, x0 = W - mw - 12, y0 = H - mh - 12;
    g.save(); g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(5,8,18,.8)'; g.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
    g.fillStyle = '#4a5468';
    for (let r = 0; r < ex.mappa.length; r++) for (let c = 0; c < ex.mappa[r].length; c++) if (ex.mappa[r][c] !== '#') g.fillRect(x0 + c * ex.t * sc, y0 + r * ex.t * sc, ex.t * sc + 0.5, ex.t * sc + 0.5);
    // i miei compiti ancora da fare
    for (const c of s.io.compiti) if (!c.fatto) { const st = ex.stazioni.find((q) => q.id === c.st); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x0 + st.x * sc, y0 + st.y * sc, 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e8322a'; g.beginPath(); g.arc(x0 + ex.pulsante.x * sc, y0 + ex.pulsante.y * sc, 2.5, 0, Math.PI * 2); g.fill();
    const io = s.e.find((e) => e.id === ctxG.mio);
    if (io) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + io.x * sc, y0 + io.y * sc, 3.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = COL[ctxG.mio % COL.length]; g.lineWidth = 2; g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.strokeRect(x0 + cam.x * sc, y0 + cam.y * sc, W * sc, H * sc);
    g.restore();
  }

  // ================= COSA C'È VICINO (per i pulsanti) =================
  function vicini(ctx, s) {
    const ex = ctx.partita.extra, io = s.e.find((e) => e.id === ctx.mio);
    const out = { compito: null, pulsante: false, corpo: false, bersaglio: false };
    if (!io || s.f2 !== 'libero') return out;
    for (const c of s.io.compiti) { if (c.fatto) continue; const st = ex.stazioni.find((q) => q.id === c.st); if (Math.hypot(st.x - io.x, st.y - io.y) < ex.raggi.compito) out.compito = st; }
    if (!s.io.vivo) return out;
    out.pulsante = Math.hypot(ex.pulsante.x - io.x, ex.pulsante.y - io.y) < ex.raggi.pulsante;
    out.corpo = s.corpi.some((c) => Math.hypot(c.x - io.x, c.y - io.y) < ex.raggi.segnala);
    if (s.io.alieno) out.bersaglio = s.e.some((e) => e.id !== ctx.mio && !e.f && !s.alieni.includes(e.id) && Math.hypot(e.x - io.x, e.y - io.y) < ex.raggi.uccidi);
    return out;
  }
  function usa(ctx) {
    const s = ctx.partita.stato && ctx.partita.stato.s; if (!s) return;
    const v = vicini(ctx, s);
    if (v.compito) { ctx.invia({ tipo: 'inizia', id: v.compito.id }); return; }
    if (v.pulsante) ctx.invia({ tipo: 'riunione' });
  }

  // ================= I COMPITI (minigiochi) =================
  const TITOLI = { tempismo: 'Premi quando la barra è nel verde', interruttori: 'Accendi gli interruttori in ordine (1, 2, 3…)', carica: 'Tieni premuto finché la batteria è piena', sequenza: 'Guarda la sequenza e ripetila', numeri: 'Memorizza i numeri e cliccali in ordine', fili: 'Collega i fili dello stesso colore' };
  function htmlCompito(st) {
    return `<div class="al-modale" data-compito="${st.id}"><div class="al-compito">
      <div class="al-c-testa"><b>🛠️ ${esc(st.nome)}</b><button type="button" class="al-chiudi" data-az="annulla" aria-label="Chiudi">✕</button></div>
      <p class="piccolo">${TITOLI[st.tipo] || window.AlienoCompiti.TITOLI[st.tipo] || ''}</p><div class="al-gioco al-${st.tipo}"></div><p class="al-esito"></p></div></div>`;
  }
  function montaCompito(ctx, box, st) {
    const campo = box.querySelector('.al-gioco'), esito = box.querySelector('.al-esito');
    const minimo = (st.tipo === 'consegna' ? 3 : ctx.partita.extra.minimi[st.livello] || 5) * 1000 + 150;
    loc.inizio = performance.now();
    const fine = () => {
      esito.textContent = '✅ Fatto!'; campo.style.pointerEvents = 'none';
      window.Nuovi.suono([[660, 0.06], [880, 0.1]], { volume: 0.06 });
      const aspetta = Math.max(0, minimo - (performance.now() - loc.inizio));
      setTimeout(() => ctx.invia({ tipo: 'finito', id: st.id }), aspetta + 250);
    };
    const sbaglio = (msg) => { esito.textContent = msg; window.Nuovi.suono([[200, 0.12]], { tipo: 'square', volume: 0.05 }); };
    const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (window.AlienoCompiti.monta(st, campo, esito, fine, sbaglio, box)) return; // i compiti nuovi (scorri, leva, allinea, ordina, ruota, consegna, calibra, labirinto)
    if (st.tipo === 'tempismo') {
      const za = 25 + Math.random() * 50;
      campo.innerHTML = `<div class="al-barra"><div class="al-verde" style="left:${za}%;width:14%"></div><div class="al-cursore"></div></div><button type="button" class="bottone primario al-adesso">Adesso!</button>`;
      const cur = campo.querySelector('.al-cursore'); let t0 = performance.now(), pos = 0, fatto = false;
      const giro = () => { if (fatto || !document.body.contains(cur)) return; pos = 50 + 50 * Math.sin((performance.now() - t0) / 380); cur.style.left = `${pos}%`; requestAnimationFrame(giro); };
      giro();
      const prova = () => { if (fatto) return; if (pos >= za && pos <= za + 14) { fatto = true; fine(); } else sbaglio('Troppo presto o troppo tardi: riprova'); };
      campo.querySelector('.al-adesso').addEventListener('click', prova);
      box._spazio = prova;
    } else if (st.tipo === 'interruttori') {
      const n = 5, ord = mescola([...Array(n).keys()].map((k) => k + 1)); let prossimo = 1;
      campo.innerHTML = ord.map((k) => `<button type="button" class="al-int" data-k="${k}"><span>${k}</span><i></i></button>`).join('');
      campo.addEventListener('click', (e) => { const b = e.target.closest('.al-int'); if (!b || b.classList.contains('on')) return; if (Number(b.dataset.k) === prossimo) { b.classList.add('on'); prossimo++; if (prossimo > n) fine(); } else { sbaglio('Ordine sbagliato: si ricomincia'); prossimo = 1; campo.querySelectorAll('.al-int').forEach((x) => x.classList.remove('on')); } });
    } else if (st.tipo === 'carica') {
      campo.innerHTML = '<div class="al-batteria"><div class="al-livello"></div></div><button type="button" class="bottone primario al-tieni">Tieni premuto ⚡</button>';
      const lv = campo.querySelector('.al-livello'), bt = campo.querySelector('.al-tieni'); let carica = 0, giu = false, ult = performance.now(), fatto = false;
      const giro = () => { if (fatto || !document.body.contains(lv)) return; const ora = performance.now(), dt = (ora - ult) / 1000; ult = ora; carica = Math.max(0, Math.min(1, carica + (giu ? dt / 3 : -dt / 6))); lv.style.height = `${carica * 100}%`; if (carica >= 1) { fatto = true; fine(); return; } requestAnimationFrame(giro); };
      giro();
      bt.addEventListener('pointerdown', (e) => { e.preventDefault(); giu = true; }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bt.addEventListener(ev, () => { giu = false; });
      box._spazioGiu = (v) => { giu = v; };
    } else if (st.tipo === 'sequenza') {
      const colori = ['#e0413a', '#2e9d57', '#2f6fd8', '#f2c230'], seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4)); let pos = 0, mostra = true;
      campo.innerHTML = colori.map((c, k) => `<button type="button" class="al-pad" data-k="${k}" style="--c:${c}"></button>`).join('');
      const pads = [...campo.querySelectorAll('.al-pad')];
      const lampeggia = () => { mostra = true; pos = 0; esito.textContent = 'Guarda…'; seq.forEach((k, i) => { setTimeout(() => { pads[k].classList.add('acceso'); window.Nuovi.suono([[300 + k * 120, 0.15]], { volume: 0.04 }); }, 500 + i * 550); setTimeout(() => pads[k].classList.remove('acceso'), 500 + i * 550 + 380); }); setTimeout(() => { mostra = false; esito.textContent = 'Tocca a te!'; }, 500 + seq.length * 550); };
      lampeggia();
      campo.addEventListener('click', (e) => { const b = e.target.closest('.al-pad'); if (!b || mostra) return; const k = Number(b.dataset.k); b.classList.add('acceso'); setTimeout(() => b.classList.remove('acceso'), 180); if (k === seq[pos]) { pos++; if (pos === seq.length) { mostra = true; fine(); } } else { sbaglio('Sbagliato: guarda di nuovo'); setTimeout(lampeggia, 600); } });
    } else if (st.tipo === 'numeri') {
      const celle = mescola([...Array(9).keys()]).slice(0, 6); let prossimo = 1, coperti = false;
      campo.innerHTML = Array.from({ length: 9 }, (_, k) => { const n = celle.indexOf(k) + 1; return `<button type="button" class="al-num" data-n="${n || 0}">${n || ''}</button>`; }).join('');
      const copri = () => { coperti = true; campo.querySelectorAll('.al-num').forEach((b) => { if (Number(b.dataset.n)) b.textContent = '?'; }); esito.textContent = 'Clicca 1, 2, 3… in ordine'; };
      esito.textContent = 'Memorizza…'; setTimeout(copri, 2200);
      campo.addEventListener('click', (e) => { const b = e.target.closest('.al-num'); if (!b || !coperti || !Number(b.dataset.n) || b.classList.contains('ok')) return; if (Number(b.dataset.n) === prossimo) { b.classList.add('ok'); b.textContent = b.dataset.n; prossimo++; if (prossimo > 6) fine(); } else { sbaglio('Sbagliato! Li rivedi per un attimo'); prossimo = 1; coperti = false; campo.querySelectorAll('.al-num').forEach((x) => { x.classList.remove('ok'); if (Number(x.dataset.n)) x.textContent = x.dataset.n; }); setTimeout(copri, 1500); } });
    } else if (st.tipo === 'fili') {
      const colori = ['#e0413a', '#2f6fd8', '#f2c230', '#8e55c9'], destra = mescola([0, 1, 2, 3]); let scelto = null, fatti = 0;
      campo.innerHTML = `<svg class="al-svg" viewBox="0 0 200 160"></svg><div class="al-fcol">${colori.map((c, k) => `<button type="button" class="al-filo sx" data-k="${k}" style="--c:${c}"></button>`).join('')}</div><div class="al-fcol dx">${destra.map((k) => `<button type="button" class="al-filo dx" data-k="${k}" style="--c:${colori[k]}"></button>`).join('')}</div>`;
      const svg = campo.querySelector('svg');
      campo.addEventListener('click', (e) => {
        const b = e.target.closest('.al-filo'); if (!b || b.classList.contains('fatto')) return;
        if (b.classList.contains('sx')) { campo.querySelectorAll('.al-filo.sx').forEach((x) => x.classList.remove('scelto')); b.classList.add('scelto'); scelto = b; return; }
        if (!scelto) return;
        if (scelto.dataset.k === b.dataset.k) {
          const k = Number(b.dataset.k), y1 = 20 + k * 40, y2 = 20 + destra.indexOf(k) * 40;
          svg.insertAdjacentHTML('beforeend', `<path d="M10 ${y1} C 100 ${y1}, 100 ${y2}, 190 ${y2}" stroke="${colori[k]}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
          scelto.classList.add('fatto'); b.classList.add('fatto'); scelto.classList.remove('scelto'); scelto = null; fatti++;
          window.Nuovi.suono([[520 + fatti * 80, 0.06]], { volume: 0.05 });
          if (fatti === 4) fine();
        } else sbaglio('Colore diverso!');
      });
    }
  }

  // ================= SCHERMATA FINALE =================
  // tutti i giocatori in fila col loro astronauta; i ruoli si svelano uno alla volta (gli Alieni si illuminano di
  // viola e nel casco si intravede l'alieno); chi è stato eliminato o espulso compare a terra, più spento
  function htmlFine(ctx, f) {
    const alieni = f.chi === 'alieni', nome = (i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
    return `<div class="al-finale ${alieni ? 'alieni' : 'astronauti'}" data-finale="1"><div class="al-fin-box">
      <h2>${alieni ? '👽 VINCONO GLI ALIENI' : '🧑‍🚀 VINCONO GLI ASTRONAUTI'}</h2><p class="al-fin-perche">${esc(f.perche || '')}</p>
      <div class="al-fin-gioc">${f.g.map((x, i) => `<figure class="al-fin-g ${x.s !== 'vivo' ? 'morto' : ''} ${x.a ? 'alieno' : ''}" data-i="${i}" data-a="${x.a}" data-s="${x.s}" style="--rit:${(1.4 + i * 0.3).toFixed(2)}s">
        <span class="al-fin-tela"><canvas width="90" height="96"></canvas>${x.a ? '<canvas class="al-fin-rivela" width="90" height="96"></canvas>' : ''}</span>
        <figcaption>${esc(nome(i))}</figcaption><small class="al-fin-stato">${x.s === 'vivo' ? '' : x.s}</small><em class="al-fin-ruolo">${x.a ? '👽 Alieno' : '🧑‍🚀 Astronauta'}</em></figure>`).join('')}</div>
      <p class="al-fin-riga">Compiti completati: <b>${f.fatti} su ${f.tot}</b> · Alieni in gioco: <b>${f.alieni}</b></p></div></div>`;
  }
  function disegnaFine(radice) {
    for (const fig of radice.querySelectorAll('.al-fin-g')) {
      if (fig.dataset.disegnato) continue; fig.dataset.disegnato = '1';
      const i = Number(fig.dataset.i), col = COL[i % COL.length], vivo = fig.dataset.s === 'vivo';
      const [c1, c2] = fig.querySelectorAll('canvas');
      const omino = (tela, rivela) => {
        const g = tela.getContext('2d'); g.clearRect(0, 0, tela.width, tela.height);
        if (vivo) astronauta(g, 45, 64, col, 1, 0, { fermo: true }); else corpo(g, 38, 66, col);
        if (rivela && vivo) { // l'alieno che si intravede nel casco
          g.fillStyle = '#6fd35a'; g.beginPath(); g.ellipse(48, 42, 6.5, 5.5, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#111'; g.beginPath(); g.ellipse(45.5, 41, 2, 3, -0.4, 0, Math.PI * 2); g.ellipse(50.5, 41, 2, 3, 0.4, 0, Math.PI * 2); g.fill();
        }
      };
      omino(c1, false); if (c2) omino(c2, true);
    }
  }
  // La schermata finale vive in un elemento suo, aggiunto una volta sola alla pagina: così i ridisegni del tavolo
  // (che arrivano più volte mentre la partita si chiude) non la fanno sparire e riapparire. Resta 7 secondi.
  // Chi era sulle dispense la vede quando torna.
  let finChiave = null, finInAttesa = null, finElemento = null;
  function mostraFine(ctx, f) {
    const chiave = JSON.stringify(f) + (ctx.partita.codice || '');
    if (chiave === finChiave) return;
    finChiave = chiave;
    const html = htmlFine(ctx, f);
    if (window.Boss && window.Boss.attivo) { finInAttesa = html; return; }
    apriFine(html);
  }
  function apriFine(html) {
    if (finElemento) finElemento.remove();
    const div = document.createElement('div'); div.className = 'al-fin-dopo';
    div.innerHTML = html; document.body.appendChild(div); disegnaFine(div);
    finElemento = div;
    div.addEventListener('click', () => chiudiFine());
    setTimeout(() => { if (finElemento === div) chiudiFine(); }, 7200);
  }
  function chiudiFine() { if (!finElemento) return; const d = finElemento; finElemento = null; d.classList.add('via'); setTimeout(() => d.remove(), 350); }
  if (window.Boss && window.Boss.onCambio) window.Boss.onCambio((attivo) => {
    if (attivo && finElemento) { finInAttesa = finElemento.innerHTML; finElemento.remove(); finElemento = null; } // sotto le dispense non deve vedersi
    else if (!attivo && finInAttesa) { const h = finInAttesa; finInAttesa = null; apriFine(h); }
  });

  // ================= IL RUOLO ALL'INIZIO =================
  // a tutto schermo per 4 secondi: il tuo astronauta (con l'alieno nel casco se sei un Alieno), cosa devi fare e,
  // per gli Alieni, chi sono gli altri Alieni. Una volta per partita, in un elemento suo (i ridisegni non lo toccano).
  function mostraRuolo(ctx, s) {
    const chiave = `${ctx.partita.codice || ''}|${s.io.alieno ? 1 : 0}|${s.alieni.join()}`;
    if (loc.ruoloPer === chiave) return;
    loc.ruoloPer = chiave;
    const nome = (i) => (i === ctx.mio ? 'Tu' : ctx.nome(i)), al = !!s.io.alieno;
    const altri = s.alieni.filter((i) => i !== ctx.mio);
    const apri = () => {
      document.querySelectorAll('.al-ruolo-intro').forEach((x) => x.remove());
      const div = document.createElement('div'); div.className = `al-ruolo-intro ${al ? 'alieno' : ''}`;
      div.innerHTML = `<div class="al-ri-box"><p class="al-ri-sei">Sei</p><h2>${al ? '👽 un ALIENO' : '🧑‍🚀 un ASTRONAUTA'}</h2><canvas width="160" height="170"></canvas>
        <p class="al-ri-cosa">${al ? 'Elimina l\'equipaggio senza farti scoprire. I tuoi compiti sono finti: fingi di farli.' : 'Fai i tuoi compiti e scopri chi sono gli Alieni.'}</p>
        ${al && altri.length ? `<p class="al-ri-altri">Gli altri Alieni: <b>${altri.map((i) => esc(nome(i))).join(', ')}</b></p>` : ''}
        ${!al && s.alieniTot ? `<p class="al-ri-altri">Alieni a bordo: <b>${s.alieniTot}</b></p>` : ''}</div>`;
      document.body.appendChild(div);
      const g = div.querySelector('canvas').getContext('2d'); g.scale(1.8, 1.8);
      astronauta(g, 44, 62, COL[ctx.mio % COL.length], 1, 0, { fermo: true });
      if (al) { g.fillStyle = '#6fd35a'; g.beginPath(); g.ellipse(47, 40, 6.5, 5.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(44.5, 39, 2, 3, -0.4, 0, Math.PI * 2); g.ellipse(49.5, 39, 2, 3, 0.4, 0, Math.PI * 2); g.fill(); }
      div.addEventListener('click', () => div.remove());
      setTimeout(() => { div.classList.add('via'); setTimeout(() => div.remove(), 400); }, 4200);
    };
    if (window.Boss && window.Boss.attivo) { const f = (attivo) => { if (!attivo && loc.ruoloPer === chiave && !loc.ruoloMostrato) { loc.ruoloMostrato = true; apri(); } }; loc.ruoloMostrato = false; window.Boss.onCambio(f); }
    else apri();
  }

  // ================= RIUNIONE =================
  function htmlRiunione(ctx, s) {
    const r = s.riu, p = ctx.partita, nome = (i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
    const vivo = s.io.vivo;
    const titolo = r.tipo === 'corpo' ? `📣 ${esc(nome(r.da))} ha trovato il corpo di ${esc(nome(r.corpo))}` : `🚨 ${esc(nome(r.da))} ha chiamato una riunione d'emergenza`;
    const fase = r.fase === 'discussione' ? `Discussione: ${r.resta} s — scrivete in chat i vostri sospetti` : r.fase === 'voto' ? `Votazione segreta: ${r.resta} s (si chiude prima se votano tutti)` : 'Si contano i voti…';
    const giocatori = [...Array(p.n).keys()].map((i) => {
      const vivoI = r.vivi.includes(i), votato = r.votato.includes(i), conta = r.esito && r.esito.conta[i];
      const puo = vivo && r.fase === 'voto' && r.mioVoto === undefined && vivoI;
      return `<button type="button" class="al-cand ${vivoI ? '' : 'morto'} ${r.mioVoto === i ? 'mio' : ''}" ${puo ? `data-az="vota" data-chi="${i}"` : 'disabled'}>
        <i style="background:${COL[i % COL.length]}"></i><span>${esc(nome(i))}${s.alieni.includes(i) && s.io.alieno && i !== ctx.mio ? ' 👽' : ''}</span>
        <small>${!vivoI ? '💀' : votato ? '✓ ha votato' : ''}${conta ? ` · ${conta} ${conta === 1 ? 'voto' : 'voti'}` : ''}</small></button>`;
    }).join('');
    const salta = vivo && r.fase === 'voto' && r.mioVoto === undefined ? '<button type="button" class="bottone" data-az="vota" data-chi="-1">🙅 Nessuno</button>' : '';
    const mio = r.mioVoto !== undefined ? `<p class="piccolo">Hai votato: <b>${r.mioVoto === -1 ? 'nessuno' : esc(nome(r.mioVoto))}</b></p>` : !vivo ? '<p class="piccolo">👻 Sei un fantasma: guardi, non voti (la tua chat la leggono solo gli altri fantasmi)</p>' : '';
    return `<div class="al-modale scuro"><div class="al-riunione"><h3>${titolo}</h3><p class="al-fase">${fase}</p><div class="al-candidati">${giocatori}</div>${salta}${mio}</div></div>`;
  }

  // ================= IL TAVOLO =================
  // movimento previsto: il proprio astronauta si muove subito, con gli stessi muri e la stessa velocità del server
  const predici = {
    prendi(st, ctx) { const x = st.s; if (!x || x.f2 !== 'libero' || !x.io || x.io.compito) return null; const e = x.e.find((o) => o.id === ctx.mio); return e ? { x: e.x, y: e.y } : null; },
    muovi(pos, i, dt, ctx, st) {
      const ex = ctx.partita.extra, x = st.s; if (!ex || !ex.mappa || !ex.v) return pos;
      const l = Math.hypot(i.x, i.y); if (l < 0.05) { pos.m = 0; return pos; }
      const k = Math.min(1, l), vivo = x.io.vivo, v = vivo ? ex.v : ex.vf, R = ex.r, T = ex.t;
      const solido = (px, py) => { const c = Math.floor(px / T), r = Math.floor(py / T); if (r < 0 || c < 0 || r >= ex.mappa.length || c >= ex.mappa[0].length) return true; const q = ex.mappa[r][c]; return q === '#' || q === 'M'; };
      const mx = (i.x / l) * k * v * dt, my = (i.y / l) * k * v * dt;
      const n = { x: pos.x, y: pos.y, m: 1, d: Math.abs(mx) > 0.01 ? Math.sign(mx) : pos.d };
      if (!vivo) { n.x = Math.max(T, Math.min(ex.mw - T, n.x + mx)); n.y = Math.max(T, Math.min(ex.mh - T, n.y + my)); return n; }
      const nx = n.x + mx; if (![-R, R * 0.5].some((o) => solido(nx + Math.sign(mx) * R, n.y + o))) n.x = nx;
      const ny = n.y + my; if (![-R * 0.8, R * 0.8].some((o) => solido(n.x + o, ny + (my > 0 ? R * 0.6 : -R * 0.4)))) n.y = ny;
      return n;
    },
    metti(st, ctx, pos) { if (!st || !st.s || !st.s.e) return st; return { ...st, s: { ...st.s, e: st.s.e.map((o) => (o.id === ctx.mio ? { ...o, x: pos.x, y: pos.y, m: pos.m ? 1 : 0, d: pos.d || o.d } : o)) } }; },
  };
  const tavolo = window.Arena.tavolo({
    predici,
    id: 'alieno',
    obiettivo: 'vittoria',
    istruzioni: () => (dito() ? 'Joystick per muoverti · 🛠️ Usa = compito o pulsante · 📣 Segnala un corpo · 🗡️ Elimina (se sei un Alieno) · tocca la lista per vedere i compiti. Fuori dalle riunioni la chat è muta.'
      : 'WASD o frecce (sul telefono il joystick). E = compito o pulsante · Q = elimina (se sei un Alieno) · R = segnala un corpo. Fuori dalle riunioni la chat è muta.'),
    sottotitolo: (p, ctx) => { const s = p.stato && p.stato.s; return !s || !s.io ? '' : s.io.alieno ? '👽 Sei un ALIENO' : '🧑‍🚀 Sei dell\'equipaggio'; },
    statoGioco: (ctx, s) => (!s.s.io ? '' : s.s.f2 === 'discussione' || s.s.f2 === 'voto' ? 'Riunione!' : s.s.f2 === 'espulsione' ? 'Espulsione…' : s.s.f2 === 'fine' ? 'Fine' : !s.s.io.vivo ? '👻 Fantasma' : s.s.io.alieno ? 'Mimetizzati…' : 'Fai i compiti'),
    hud: (ctx, s) => { const x = s.s; if (!x.io) return ''; const fatti = x.io.compiti.filter((c) => c.fatto).length; return `<span>📍 ${esc(x.stanza)}</span><span>✅ compiti ${x.io.alieno ? '(finti) ' : ''}${fatti}/${x.io.compiti.length}</span>${x.io.alieno ? `<span>🗡️ ${x.io.cd ? `tra ${x.io.cd} s` : 'pronto'}</span>` : ''}<span>🚨 ${x.io.ri}</span>`; },
    fineRound: () => '',
    dopoTick(ctx, d, prima) {
      ctxG = ctx;
      const a = prima && prima.s, b = d.s;
      if (!b.io) return;
      if (a && a.io && a.io.vivo && !b.io.vivo) window.Nuovi.suono([[300, 0.1], [150, 0.4]], { tipo: 'sawtooth', volume: 0.08 });
      if (a && a.f2 === 'libero' && b.f2 === 'discussione') window.Nuovi.suono([[880, 0.15], [660, 0.15], [880, 0.15], [660, 0.2]], { tipo: 'square', volume: 0.06 });
      if (a && a.f2 !== 'espulsione' && b.f2 === 'espulsione') window.Nuovi.suono([[200, 0.4], [120, 0.6]], { volume: 0.06 });
    },
    // lo strato HTML: pulsanti d'azione, lista dei compiti, compito aperto, riunione, ruolo all'inizio
    sopra(ctx, d) {
      ctxG = ctx;
      const s = d.s;
      // all'inizio di ogni partita: la schermata del ruolo (anche durante il conto alla rovescia)
      if (s && s.io && s.f2 !== 'fine' && (d.fase === 'via' || d.fase === 'gioco')) mostraRuolo(ctx, s);
      if (!s || !s.io || d.fase !== 'gioco') return '';
      const ex = ctx.partita.extra, nome = (i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
      if (s.f2 === 'discussione' || s.f2 === 'voto') return htmlRiunione(ctx, s);
      if (s.f2 !== 'fine' && finChiave) { finChiave = null; finInAttesa = null; chiudiFine(); } // partita nuova
      if (s.f2 === 'fine') { loc.ruoloPer = null; if (s.fin) mostraFine(ctx, s.fin); return ''; }
      if (s.f2 === 'espulsione') return '';
      // durante un compito si vede solo il compito: il suo HTML non cambia, così il minigioco non riparte da capo
      if (s.io.compito) return htmlCompito(ex.stazioni.find((q) => q.id === s.io.compito.id));
      let html = '';
      // lista dei compiti con la barra dell'equipaggio
      const chiusa = dito() && !loc.listaAperta, fatti = s.io.compiti.filter((c) => c.fatto).length;
      html += `<div class="al-lista${chiusa ? ' chiusa' : ''}"${dito() ? ' data-az="lista" role="button" aria-expanded="' + !chiusa + '"' : ''}><div class="al-barra-tot"><i style="width:${s.prog}%"></i><span>${chiusa ? `📋 I miei compiti ${fatti}/${s.io.compiti.length} · squadra ${s.prog}% ▾` : `Compiti dell'equipaggio ${s.prog}%${dito() ? ' ▴' : ''}`}</span></div>${s.io.alieno ? '<p class="piccolo">Compiti finti (per mimetizzarti):</p>' : ''}${s.io.compiti.map((c) => { const st = ex.stazioni.find((q) => q.id === c.st); return `<p class="${c.fatto ? 'fatto' : ''}">${c.fatto ? '✅' : c.passo ? '📦' : '◻️'} ${esc(st.nome)} <small>(${esc(ex.stanze.find((q) => q.id === st.stanza).nome)})</small></p>`; }).join('')}</div>`;
      // pulsanti d'azione
      const v = vicini(ctx, s);
      const bt = [];
      bt.push(`<button type="button" class="al-az" data-az="usa" ${v.compito || v.pulsante ? '' : 'disabled'}>${v.pulsante && !v.compito ? `🚨<small>${s.pul ? s.pul + ' s' : s.io.ri ? 'Riunione' : 'usata'}</small>` : `🛠️<small>Usa${tasto('E')}</small>`}</button>`);
      if (s.io.vivo) bt.push(`<button type="button" class="al-az segnala" data-az="segnala" ${v.corpo ? '' : 'disabled'}>📣<small>Segnala${tasto('R')}</small></button>`);
      if (s.io.alieno && s.io.vivo) bt.push(`<button type="button" class="al-az uccidi" data-az="uccidi" ${v.bersaglio && !s.io.cd ? '' : 'disabled'}>🗡️<small>${s.io.cd ? `${s.io.cd} s` : `Elimina${tasto('Q')}`}</small></button>`);
      html += `<div class="al-azioni">${bt.join('')}</div>`;
      if (!s.io.vivo) html += '<div class="al-fantasma">👻 Sei un fantasma: passi attraverso i muri, vedi tutto e puoi finire i tuoi compiti</div>';
      return html;
    },
    dopoSopra(ctx, so) {
      const box = so.querySelector('.al-modale[data-compito]');
      if (box && box.dataset.montato !== '1') { box.dataset.montato = '1'; montaCompito(ctx, box, ctx.partita.extra.stazioni.find((q) => q.id === Number(box.dataset.compito))); loc.box = box; }
      if (!box) loc.box = null;
    },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'lista') { loc.listaAperta = !loc.listaAperta; const so = document.querySelector('.ar-sopra'); if (so) so._html = null; }
      else if (az === 'usa') usa(ctx);
      else if (az === 'segnala' || az === 'uccidi' || az === 'annulla') ctx.invia({ tipo: az });
      else if (az === 'vota') ctx.invia({ tipo: 'vota', chi: Number(el.dataset.chi) });
    },
    disegna(g, p, s, prima, u, ctx) {
      ctxG = ctx;
      const W = p.W, H = p.H, ex = p.extra, x = s.s, t = s.t;
      if (!ex || !ex.mappa || !x.io) { g.fillStyle = '#05070f'; g.fillRect(0, 0, W, H); return; }
      if (!mondo || mondo._mappa !== ex.mappaId) { mondo = disegnaMondo(ex); mondo._mappa = ex.mappaId; }
      // ---- espulsione: lo spazio, l'astronauta che vola via, la scritta ----
      if (x.f2 === 'espulsione' && x.esp) return espulsione(g, W, H, x.esp, ctx, ex);
      const ee = lerp(prima && prima.s.e, x.e, u);
      const io = ee.find((e) => e.id === ctx.mio) || x.e.find((e) => e.id === ctx.mio);
      if (!io) return;
      const cam = { x: Math.max(0, Math.min(ex.mw - W, io.x - W / 2)), y: Math.max(0, Math.min(ex.mh - H, io.y - H / 2)) };
      g.drawImage(mondo, cam.x, cam.y, W, H, 0, 0, W, H);
      g.save(); g.translate(-cam.x, -cam.y);
      // le postazioni dei miei compiti ancora da fare brillano
      for (const c of x.io.compiti) { if (c.fatto) continue; const st = ex.stazioni.find((q) => q.id === c.st); const a = 0.5 + 0.4 * Math.sin(t * 4); g.strokeStyle = `rgba(242,194,48,${a})`; g.lineWidth = 3; g.strokeRect(st.x - 18, st.y - 18, 36, 36); g.fillStyle = `rgba(242,194,48,${a * 0.3})`; g.fillRect(st.x - 18, st.y - 18, 36, 36); g.fillStyle = '#f2c230'; g.font = '16px system-ui'; g.textAlign = 'center'; g.fillText('!', st.x, st.y + 6); }
      // i corpi
      for (const c of x.corpi) { corpo(g, c.x, c.y, COL[c.di % COL.length]); window.AlienoTemi.corpo(g, ex.tema, c.x, c.y); }
      // gli astronauti (ordinati dall'alto in basso per sovrapporsi bene)
      const nome = (i) => (i === ctx.mio ? 'Tu' : ctx.nome(i).slice(0, 12));
      for (const e of [...ee].sort((a, b) => a.y - b.y)) {
        const compagno = x.io.alieno && x.alieni.includes(e.id) && e.id !== ctx.mio;
        astronauta(g, e.x, e.y, COL[e.id % COL.length], e.d, t + e.id, { fermo: !e.m, fantasma: !!e.f, alfa: e.f ? 0.45 : 1, nome: nome(e.id), coloreNome: compagno ? '#ff6b6b' : e.f ? '#bbb' : '#fff', compito: !!e.c });
      }
      g.restore();
      // la visuale: fuori dal cono dei muri è buio (i fantasmi e chi ha finito vedono tutto)
      if (x.io.vivo && x.f2 !== 'fine') {
        if (!nebbia) nebbia = document.createElement('canvas');
        if (nebbia.width !== W) { nebbia.width = W; nebbia.height = H; }
        const n = nebbia.getContext('2d');
        n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, W, H); n.fillStyle = 'rgba(3,5,12,.93)'; n.fillRect(0, 0, W, H);
        n.globalCompositeOperation = 'destination-out';
        const pts = poligonoVista(ex, io.x, io.y, ex.vista);
        const ox = io.x - cam.x, oy = io.y - cam.y;
        const gr = n.createRadialGradient(ox, oy, ex.vista * 0.5, ox, oy, ex.vista); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.75, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        n.fillStyle = gr;
        // bordo morbido: il poligono si ritaglia sfocato (dove il browser lo permette), poi una seconda volta netto e un
        // po' più piccolo, così il centro è ben chiaro e l'ombra sfuma dolcemente sui bordi dei muri
        const traccia = (sc) => { n.beginPath(); pts.forEach(([px, py], k) => { const qx = ox + (px - io.x) * sc, qy = oy + (py - io.y) * sc; if (k) n.lineTo(qx, qy); else n.moveTo(qx, qy); }); n.closePath(); };
        if ('filter' in n) { n.filter = 'blur(5px)'; traccia(1); n.fill(); n.filter = 'none'; traccia(0.94); n.fill(); }
        else { traccia(1); n.fill(); }
        n.globalCompositeOperation = 'source-over';
        g.drawImage(nebbia, 0, 0);
      }
      minimappa(g, ex, x, cam, W, H);
    },
  });
  // espulsione nello spazio: l'astronauta vola via ruotando, poi la scritta e gli Alieni rimasti
  function espulsione(g, W, H, esp, ctx, ex) {
    const e = esp.e;
    // le mappe a tema hanno la loro scena (vulcano, pianta carnivora, creatura degli abissi, crepa nel ghiaccio)
    const aTema = ex && ex.tema && ex.tema.fondo !== 'spazio' && window.AlienoTemi.espulsione(g, W, H, esp, ex.tema, astronauta, esp.chi === null ? '#fff' : COL[esp.chi % COL.length]);
    if (aTema) return scritteEspulsione(g, W, H, esp, ctx);
    if (!stelle) stelle = Array.from({ length: 160 }, (_, k) => ({ x: rnd(k) * W, y: rnd(k + 9) * H, v: 20 + rnd(k + 3) * 80, r: rnd(k + 5) < 0.85 ? 1 : 2 }));
    g.fillStyle = '#03050c'; g.fillRect(0, 0, W, H);
    for (const s of stelle) { g.fillStyle = '#fff'; g.fillRect((s.x + e * s.v) % W, s.y, s.r, s.r); }
    if (esp.chi !== null) {
      const x = -60 + (W + 120) * Math.min(1, e / 4.2), y = H / 2 + Math.sin(e * 1.5) * 40;
      g.save(); g.translate(x, y); g.rotate(e * 2.4); g.scale(2.6, 2.6); astronauta(g, 0, 0, COL[esp.chi % COL.length], 1, e, { fermo: true }); g.restore();
    }
    scritteEspulsione(g, W, H, esp, ctx);
  }
  // la scritta uguale per tutte le mappe: "ERA / NON era un Alieno" e poi gli Alieni rimasti
  function scritteEspulsione(g, W, H, esp, ctx) {
    const e = esp.e;
    const nome = esp.chi === null ? '' : esp.chi === ctx.mio ? 'Tu' : ctx.nome(esp.chi);
    const testo = esp.chi === null ? (esp.pari ? 'Pareggio: nessuno viene espulso' : 'Nessuno viene espulso') : `${nome} ${esp.chi === ctx.mio ? (esp.alieno ? 'eri un Alieno' : 'NON eri un Alieno') : esp.alieno ? 'ERA un Alieno' : 'NON era un Alieno'}`;
    const n = Math.min(testo.length, Math.floor(Math.max(0, e - 0.5) * 24));
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    // una fascia scura dietro la scritta: si legge su ogni sfondo (anche sul ghiaccio)
    if (n > 0) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H * 0.13, W, 84);
      g.font = '800 46px system-ui'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)';
      g.fillStyle = esp.chi === null ? '#fff' : esp.alieno ? '#c9a6ff' : '#fff';
      g.strokeText(testo.slice(0, n), W / 2, H * 0.13 + 42); g.fillText(testo.slice(0, n), W / 2, H * 0.13 + 42);
    }
    if (esp.chi === null && e > 0.3) { g.globalAlpha = Math.min(1, e - 0.3); g.font = '120px system-ui'; g.fillText('🤷', W / 2, H * 0.58); g.globalAlpha = 1; }
    // poi quanti Alieni restano, in una targhetta
    if (e > 2.8) {
      g.globalAlpha = Math.min(1, (e - 2.8) / 0.5);
      const t2 = esp.rimasti === 0 ? 'Non resta nessun Alieno!' : `Alieni rimasti: ${esp.rimasti}`;
      g.font = '700 32px system-ui'; const w = g.measureText(t2).width + 50;
      g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - w / 2, H * 0.8 - 30, w, 60, 30) : g.rect(W / 2 - w / 2, H * 0.8 - 30, w, 60); g.fill();
      g.fillStyle = '#ffd36b'; g.fillText(t2, W / 2, H * 0.8);
      g.globalAlpha = 1;
    }
    g.restore();
  }
  // tasti: E usa, Q elimina, R segnala; spazio per il compito "al momento giusto" e per caricare
  document.addEventListener('keydown', (ev) => {
    if (!ctxG || !document.querySelector('.ar-sopra') || !ctxG.partita || ctxG.partita.gioco !== 'alieno') return;
    if (ev.target && ['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) return;
    const k = ev.key.toLowerCase();
    if (k === 'e') usa(ctxG);
    else if (k === 'q') { const x = ctxG.partita.stato && ctxG.partita.stato.s; if (x && x.io && x.io.alieno) ctxG.invia({ tipo: 'uccidi' }); }
    else if (k === 'r') ctxG.invia({ tipo: 'segnala' });
    else if (loc.box && loc.box._tasto && (k.startsWith('arrow') || [' ', 'enter', '1', '2', '3', 'w', 'a', 's', 'd'].includes(k))) { ev.preventDefault(); loc.box._tasto(k); if (k === ' ' && loc.box._spazioGiu) loc.box._spazioGiu(true); }
    else if (k === ' ' && loc.box) { if (loc.box._spazio) loc.box._spazio(); if (loc.box._spazioGiu) loc.box._spazioGiu(true); }
    else if (k === 'escape' && loc.box) ctxG.invia({ tipo: 'annulla' });
  });
  document.addEventListener('keyup', (ev) => { if (ev.key === ' ' && loc.box && loc.box._spazioGiu) loc.box._spazioGiu(false); });
  Object.assign(window.Tavoli, { alieno: tavolo });
})();
