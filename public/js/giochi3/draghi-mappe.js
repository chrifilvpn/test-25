// DRAGHI E SEGRETE: le due mappe disegnate nel browser.
// MONDO: il terreno (una cella per bioma) dipinto a acquerello su pergamena (si disegna piccolo e si ingrandisce
// sfumato), la costa ripassata a inchiostro, onde nel mare, montagne, colline, alberi, paludi e dune come piccoli
// simboli; sopra (SVG) la strada percorsa, i luoghi con le loro icone e i nomi, la bandiera del gruppo, la rosa dei
// venti; le terre lontane dai luoghi conosciuti restano nella nebbia.
// SCENA: la griglia tattica su canvas: lo strato fisso (pavimenti, muri con lo spessore, porte, acqua, alberi,
// rocce, mobili) si disegna una volta; sopra, a ogni fotogramma, le caselle raggiungibili, l'area dell'incantesimo,
// le pedine (ritratti dei personaggi e mostri), le barre dei punti ferita, le animazioni (movimento, frecce, fendenti,
// esplosioni, numeri dei danni) e la luce (buio con le torce, o giorno) con la nebbia dove il gruppo non vede.
(() => {
  const A = () => window.DraghiArte;
  // numeri casuali col seme (uguali a ogni disegno)
  const rng = (seme) => { let s = (seme >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // ===================== MONDO =====================
  const COL_BIOMA = { m: [58, 98, 140], c: [214, 196, 150], p: [168, 176, 108], f: [96, 132, 70], F: [62, 98, 52], h: [158, 140, 92], M: [128, 112, 96], n: [236, 236, 240], s: [98, 112, 80], d: [222, 196, 132], l: [72, 120, 160] };
  const cacheMondo = new Map();
  function terrenoMondo(m, scala = 10) {
    const chiave = `${m.w}x${m.h}:${m.celle.length}:${m.celle.slice(0, 50)}${m.celle.slice(-50)}`;
    if (cacheMondo.has(chiave)) return cacheMondo.get(chiave);
    const W = m.w * scala, H = m.h * scala;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const r = rng(m.w * 7919 + m.h);
    const acqua = (b) => b === 'm' || b === 'l';
    const B = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 'm' : m.celle[y * m.w + x]);
    const ingrandisci = (piccolo) => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high'; tg.drawImage(piccolo, 0, 0, W, H); return t; };
    // 1. i colori: una cella = un pixel (i colori dell'acqua sotto la terra si "allungano" verso la costa)
    const piccolo = document.createElement('canvas'); piccolo.width = m.w; piccolo.height = m.h;
    const pg = piccolo.getContext('2d'); const img = pg.createImageData(m.w, m.h);
    const maschera = document.createElement('canvas'); maschera.width = m.w; maschera.height = m.h;
    const mg = maschera.getContext('2d'); const mimg = mg.createImageData(m.w, m.h);
    for (let i = 0; i < m.celle.length; i++) {
      const b = m.celle[i];
      const c = COL_BIOMA[b] || COL_BIOMA.p, v = (r() - 0.5) * 12;
      img.data[i * 4] = c[0] + v; img.data[i * 4 + 1] = c[1] + v; img.data[i * 4 + 2] = c[2] + v; img.data[i * 4 + 3] = 255;
      mimg.data[i * 4 + 3] = acqua(b) ? 0 : 255;
    }
    pg.putImageData(img, 0, 0); mg.putImageData(mimg, 0, 0);
    const colori = ingrandisci(piccolo), terraMorbida = ingrandisci(maschera);
    // 2. la maschera della terra, liscia (soglia sull'alfa sfumato) e i bordi della costa
    const md = terraMorbida.getContext('2d').getImageData(0, 0, W, H).data;
    const terra = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) terra[i] = md[i * 4 + 3] > 120 ? 1 : 0;
    // distanza (approssimata) dalla costa, per l'alone nel mare e la riga d'inchiostro
    const vicino = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (terra[i] !== terra[i - 1] || terra[i] !== terra[i + 1] || terra[i] !== terra[i - W] || terra[i] !== terra[i + W]) vicino[i] = 1; }
    // 3. mare: acquerello blu con riflessi; terra: i colori dei biomi
    const mare = g.createLinearGradient(0, 0, W, H); mare.addColorStop(0, '#5a86ac'); mare.addColorStop(1, '#466e94');
    g.fillStyle = mare; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.5; g.drawImage(colori, 0, 0); g.globalAlpha = 1;
    const out = g.getImageData(0, 0, W, H), od = out.data;
    const cd = colori.getContext('2d').getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) {
      if (terra[i]) { od[i * 4] = cd[i * 4]; od[i * 4 + 1] = cd[i * 4 + 1]; od[i * 4 + 2] = cd[i * 4 + 2]; }
    }
    // alone chiaro nel mare vicino alla costa (3 passi) e inchiostro sulla costa
    for (let passo = 0; passo < 6; passo++) {
      const lista = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!terra[i] && !vicino[i] && (vicino[i - 1] === passo + 1 || vicino[i + 1] === passo + 1 || vicino[i - W] === passo + 1 || vicino[i + W] === passo + 1)) lista.push(i); }
      for (const i of lista) vicino[i] = passo + 2;
    }
    for (let i = 0; i < W * H; i++) {
      const v = vicino[i];
      if (v === 1) { od[i * 4] = 70; od[i * 4 + 1] = 48; od[i * 4 + 2] = 26; }
      else if (v > 1 && !terra[i]) { const k = (8 - v) / 10; od[i * 4] += (225 - od[i * 4]) * k; od[i * 4 + 1] += (235 - od[i * 4 + 1]) * k; od[i * 4 + 2] += (232 - od[i * 4 + 2]) * k; }
    }
    g.putImageData(out, 0, 0);
    // grana della carta
    for (let k = 0; k < W * H / 50; k++) { g.fillStyle = r() < 0.5 ? 'rgba(90,60,20,.06)' : 'rgba(255,250,230,.07)'; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    // 4. simboli: onde, montagne, colline, alberi, paludi, dune
    const suTerra = (cx, cy) => terra[Math.min(H - 1, Math.max(0, Math.round(cy))) * W + Math.min(W - 1, Math.max(0, Math.round(cx)))];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const b = B(x, y), cx = (x + 0.5) * scala, cy = (y + 0.5) * scala, v = r();
      if (b === 'm' && v < 0.05 && !suTerra(cx, cy)) { g.strokeStyle = 'rgba(235,245,250,.5)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(cx - 6, cy); g.quadraticCurveTo(cx - 3, cy - 3.5, cx, cy); g.quadraticCurveTo(cx + 3, cy - 3.5, cx + 6, cy); g.stroke(); continue; }
      if (!suTerra(cx, cy)) continue;
      if ((b === 'M' || b === 'n') && v < 0.5 && x % 2 === y % 2) {
        const h = 10 + r() * 7;
        g.fillStyle = b === 'n' ? '#f4f4f8' : '#a08c74'; g.strokeStyle = 'rgba(50,35,20,.9)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(cx - 9, cy + 5); g.lineTo(cx, cy + 5 - h); g.lineTo(cx + 9, cy + 5); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(40,25,10,.35)'; g.beginPath(); g.moveTo(cx, cy + 5 - h); g.lineTo(cx + 9, cy + 5); g.lineTo(cx + 1, cy + 5); g.closePath(); g.fill();
        if (b === 'M') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy + 5 - h); g.lineTo(cx - 3.2, cy + 5 - h + 5.5); g.lineTo(cx + 3.2, cy + 5 - h + 5.5); g.closePath(); g.fill(); }
      } else if (b === 'h' && v < 0.3) { g.strokeStyle = 'rgba(70,50,25,.65)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy + 4, 6.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if ((b === 'f' && v < 0.4) || (b === 'F' && v < 0.75)) {
        g.fillStyle = b === 'F' ? '#2e5a2a' : '#4a7a3a'; g.strokeStyle = 'rgba(20,40,15,.75)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 5, cy + 3); g.lineTo(cx - 5, cy + 3); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#5a3a1a'; g.fillRect(cx - 0.7, cy + 3, 1.4, 2.6);
      } else if (b === 's' && v < 0.4) { g.strokeStyle = 'rgba(40,70,40,.85)'; g.lineWidth = 1; g.beginPath(); for (const dx of [-3, 0, 3]) { g.moveTo(cx + dx, cy + 3); g.lineTo(cx + dx * 1.3, cy - 3.5); } g.stroke(); }
      else if (b === 'd' && v < 0.14) { g.strokeStyle = 'rgba(140,100,40,.65)'; g.lineWidth = 1.1; g.beginPath(); g.arc(cx, cy + 3, 5.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    }
    // 5. bordo bruciato della pergamena
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.8, 'rgba(90,50,10,.16)'); vg.addColorStop(1, 'rgba(60,30,5,.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    cacheMondo.set(chiave, cv);
    return cv;
  }
  // la mappa del mondo: canvas del terreno (come immagine) + SVG sopra
  function mondoHtml(m, { scala = 10, attivo = null } = {}) {
    const W = m.w * scala, H = m.h * scala;
    const cv = terrenoMondo(m, scala);
    const url = cv.toDataURL('image/jpeg', 0.86);
    const luoghi = m.luoghi || [];
    const pos = luoghi.find((l) => l.id === m.posizione);
    // nebbia: si vede intorno ai luoghi conosciuti (di più intorno a quelli visitati)
    const buchi = luoghi.map((l) => `<circle cx="${l.x * scala}" cy="${l.y * scala}" r="${(l.visitato ? 16 : 9) * scala}" fill="url(#drm-nebbia)"/>`).join('');
    const strada = (m.percorso || []).map((id) => luoghi.find((l) => l.id === id)).filter(Boolean);
    const linea = strada.length > 1 ? `<path d="M${strada.map((l) => `${l.x * scala} ${l.y * scala}`).join(' L')}" fill="none" stroke="#7a1a10" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" opacity=".85"/>` : '';
    const icone = luoghi.map((l) => {
      const x = l.x * scala, y = l.y * scala, sel = attivo === l.id;
      return `<g class="drm-luogo ${l.visitato ? 'visto' : 'sentito'} ${sel ? 'sel' : ''}" data-az="dr-luogo" data-id="${l.id}" transform="translate(${x} ${y})">
        <circle r="${l.visitato ? 17 : 14}" fill="#f4ead0" stroke="#5a3a1a" stroke-width="1.6" opacity="${l.visitato ? 0.92 : 0.75}"/>
        <g transform="scale(${l.visitato ? 1.35 : 1.1})" opacity="${l.visitato ? 1 : 0.75}">${A().iconaLuogo(l.tipo)}</g>
        <text y="${l.visitato ? 33 : 28}" text-anchor="middle" class="drm-nome">${String(l.nome).replace(/[<&]/g, '')}</text></g>`;
    }).join('');
    const bandiera = pos ? `<g class="drm-gruppo" transform="translate(${pos.x * scala} ${pos.y * scala - 20})"><path d="M0 0 L0 -26" stroke="#2a1a0a" stroke-width="2.5"/><path d="M0 -26 L20 -20 L0 -13 Z" fill="#c8343a" stroke="#5a0a0a"/><circle r="3.5" fill="#2a1a0a"/></g>` : '';
    const rosa = `<g transform="translate(${W - 70} ${H - 70})" opacity=".85"><circle r="34" fill="rgba(244,234,208,.6)" stroke="#5a3a1a"/>${[0, 90, 180, 270].map((a) => `<path transform="rotate(${a})" d="M0 -30 L6 0 L0 6 L-6 0 Z" fill="${a === 0 ? '#8a1a10' : '#5a3a1a'}"/>`).join('')}${[45, 135, 225, 315].map((a) => `<path transform="rotate(${a})" d="M0 -20 L3 0 L-3 0 Z" fill="#7a5a3a"/>`).join('')}<text y="-38" text-anchor="middle" class="drm-nome">N</text></g>`;
    return `<svg class="drm-mondo" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><radialGradient id="drm-nebbia"><stop offset=".55" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <mask id="drm-maschera"><rect width="${W}" height="${H}" fill="#fff"/>${buchi}</mask>
      <filter id="drm-carta" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="4" seed="11"/><feColorMatrix values="0 0 0 0 .87  0 0 0 0 .80  0 0 0 0 .64  0 0 0 .35 .62"/></filter></defs>
      <image href="${url}" width="${W}" height="${H}"/>
      <g mask="url(#drm-maschera)"><rect width="${W}" height="${H}" fill="#e4d4aa" opacity=".62"/><rect width="${W}" height="${H}" filter="url(#drm-carta)"/></g>
      <text x="${W / 2}" y="44" text-anchor="middle" class="drm-titolo">Terre conosciute</text>
      ${linea}${icone}${bandiera}${rosa}
      <rect x="4" y="4" width="${W - 8}" height="${H - 8}" fill="none" stroke="#5a3a1a" stroke-width="3"/><rect x="11" y="11" width="${W - 22}" height="${H - 22}" fill="none" stroke="#5a3a1a" stroke-width="1"/></svg>`;
  }

  // ===================== SCENA TATTICA =====================
  const CELL = 32;
  const cacheScena = new Map();
  const FONDO = {
    dungeon: ['#5c5650', '#544e48'], cripta: ['#4e4a52', '#46424a'], castello: ['#6a625a', '#625a52'], grotta: ['#4a4038', '#42382f'],
    montagna: ['#7a7468', '#6e685c'], foresta: ['#4f6a34', '#48612f'], palude: ['#4a5a3a', '#435234'], strada: ['#7a8a4a', '#728244'],
    villaggio: ['#6a8a42', '#62803d'], taverna: ['#7a5432', '#6e4a2c'],
  };
  // le scene delle ambientazioni horror le disegna draghi-incubo.js (metallo, piastrelle, resina, fango)
  function stratoScena(sc) {
    const chiave = `${sc.stile}:${sc.w}x${sc.h}:${sc.g}`;
    if (cacheScena.has(chiave)) return cacheScena.get(chiave);
    if (window.DraghiIncubo && window.DraghiIncubo.STILI.includes(sc.stile)) {
      const cv = window.DraghiIncubo.strato(sc, CELL);
      cacheScena.set(chiave, cv); if (cacheScena.size > 6) cacheScena.delete(cacheScena.keys().next().value);
      return cv;
    }
    const W = sc.w * CELL, H = sc.h * CELL;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const r = rng(sc.g.length * 31 + sc.w);
    const at = (x, y) => (x < 0 || y < 0 || x >= sc.w || y >= sc.h ? '#' : sc.g[y * sc.w + x]);
    const [f1, f2] = FONDO[sc.stile] || FONDO.dungeon;
    const pietra = ['dungeon', 'cripta', 'castello'].includes(sc.stile);
    const erba = ['foresta', 'palude', 'strada', 'villaggio', 'montagna'].includes(sc.stile);
    // pavimento
    for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
      const px = x * CELL, py = y * CELL;
      g.fillStyle = (x + y) % 2 ? f1 : f2; g.fillRect(px, py, CELL, CELL);
      if (pietra) {
        // lastre di pietra con le fughe e qualche crepa
        g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        if (r() < 0.12) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(px + r() * CELL, py + r() * CELL); g.lineTo(px + r() * CELL, py + r() * CELL); g.lineTo(px + r() * CELL, py + r() * CELL); g.stroke(); }
      } else if (sc.stile === 'taverna') {
        // assi di legno
        g.strokeStyle = 'rgba(40,20,5,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py + CELL / 2); g.lineTo(px + CELL, py + CELL / 2); g.moveTo(px, py + CELL - 0.5); g.lineTo(px + CELL, py + CELL - 0.5); g.stroke();
        g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(px + ((y % 2) ? 6 : 22), py + 2, 1.5, CELL / 2 - 3);
        g.fillStyle = `rgba(255,220,160,${r() * 0.06})`; g.fillRect(px, py, CELL, CELL);
      } else if (erba) {
        for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(${r() < 0.5 ? '30,60,20' : '140,170,80'},.5)`; g.lineWidth = 1; const ex = px + r() * CELL, ey = py + r() * CELL; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (r() - 0.5) * 3, ey - 3 - r() * 3); g.stroke(); }
        if (sc.stile === 'strada' || sc.stile === 'villaggio') { /* il sentiero è disegnato sotto */ }
      } else {
        for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`; g.beginPath(); g.arc(px + r() * CELL, py + r() * CELL, 1 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
      }
    }
    // sentieri nelle scene all'aperto: la terra battuta dove non c'è niente intorno (strada e villaggio: le celle libere centrali)
    if (sc.stile === 'strada') {
      for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
        if (at(x, y) !== '.') continue;
        let liberi = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === '.') liberi++;
        if (liberi === 9 && (sc.stile === 'strada' || r() < 0.25)) { g.fillStyle = 'rgba(140,110,70,.35)'; g.beginPath(); g.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, CELL * 0.62, 0, Math.PI * 2); g.fill(); }
      }
    }
    // villaggio: le celle chiuse dentro le case hanno il pavimento di legno
    if (sc.stile === 'villaggio') {
      const fuori = new Uint8Array(sc.w * sc.h); const coda = [];
      for (let x = 0; x < sc.w; x++) for (const y of [0, sc.h - 1]) coda.push(y * sc.w + x);
      for (let y = 0; y < sc.h; y++) for (const x of [0, sc.w - 1]) coda.push(y * sc.w + x);
      while (coda.length) { const i = coda.pop(); if (fuori[i]) continue; const ch = sc.g[i]; if (ch === '#' || ch === '+') continue; fuori[i] = 1; const x = i % sc.w, y = Math.floor(i / sc.w); if (x > 0) coda.push(i - 1); if (x < sc.w - 1) coda.push(i + 1); if (y > 0) coda.push(i - sc.w); if (y < sc.h - 1) coda.push(i + sc.w); }
      for (let i = 0; i < sc.w * sc.h; i++) if (!fuori[i] && sc.g[i] !== '#' && sc.g[i] !== '+') { const px = (i % sc.w) * CELL, py = Math.floor(i / sc.w) * CELL; g.fillStyle = (i % 2) ? '#7a5432' : '#6e4a2c'; g.fillRect(px, py, CELL, CELL); g.strokeStyle = 'rgba(40,20,5,.45)'; g.beginPath(); g.moveTo(px, py + CELL / 2); g.lineTo(px + CELL, py + CELL / 2); g.stroke(); }
    }
    // oggetti e muri
    const muro = sc.stile === 'grotta' || sc.stile === 'montagna' ? ['#1e1814', '#5a4c3e'] : sc.stile === 'taverna' ? ['#24160c', '#7a5230'] : sc.stile === 'villaggio' ? ['#3a2a1a', '#a08060'] : ['#161516', '#6a6460'];
    const scur = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${((n >> 16) & 255) * 0.6 | 0},${((n >> 8) & 255) * 0.6 | 0},${(n & 255) * 0.6 | 0})`; };
    for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
      const ch = at(x, y), px = x * CELL, py = y * CELL, cx = px + CELL / 2, cy = py + CELL / 2;
      if (ch === '#') {
        // muro visto un po' dall'alto: la cima scura, la faccia davanti (verso il pavimento sotto) con i mattoni o la roccia
        const sotto = at(x, y + 1) !== '#';
        g.fillStyle = muro[0]; g.fillRect(px, py, CELL, CELL);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(px + 2, py + 2, CELL - 4, sotto ? CELL - 14 : CELL - 4);
        // bordo chiaro dove la cima confina con il pavimento (la luce prende lo spigolo)
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath();
        if (at(x, y - 1) !== '#') { g.moveTo(px, py + 1); g.lineTo(px + CELL, py + 1); }
        if (at(x - 1, y) !== '#') { g.moveTo(px + 1, py); g.lineTo(px + 1, py + CELL - (sotto ? 12 : 0)); }
        if (at(x + 1, y) !== '#') { g.moveTo(px + CELL - 1, py); g.lineTo(px + CELL - 1, py + CELL - (sotto ? 12 : 0)); }
        g.stroke();
        if (sotto) {
          const fy = py + CELL - 12;
          const fg2 = g.createLinearGradient(0, fy, 0, py + CELL); fg2.addColorStop(0, muro[1]); fg2.addColorStop(1, scur(muro[1]));
          g.fillStyle = fg2; g.fillRect(px, fy, CELL, 12);
          g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.beginPath();
          if (sc.stile === 'grotta' || sc.stile === 'montagna') { for (let k = 0; k < 3; k++) { const ex = px + r() * CELL; g.moveTo(ex, fy); g.lineTo(ex + (r() - 0.5) * 6, py + CELL); } }
          else { g.moveTo(px, fy + 6); g.lineTo(px + CELL, fy + 6); for (const ex of [8, 24]) { g.moveTo(px + ex, fy); g.lineTo(px + ex, fy + 6); } g.moveTo(px + 16, fy + 6); g.lineTo(px + 16, fy + 12); }
          g.stroke();
          // ombra sul pavimento sotto il muro
          const og = g.createLinearGradient(0, py + CELL, 0, py + CELL + 10); og.addColorStop(0, 'rgba(0,0,0,.4)'); og.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = og; g.fillRect(px, py + CELL, CELL, 10);
        }
      } else if (ch === '+') {
        g.fillStyle = '#5a3818'; g.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
        g.strokeStyle = '#2a1808'; g.lineWidth = 1.5; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px + 3 + k * 6.5, py + 3); g.lineTo(px + 3 + k * 6.5, py + CELL - 3); g.stroke(); }
        g.strokeStyle = '#8a8a90'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px + 4, py + 9); g.lineTo(px + CELL - 4, py + 9); g.moveTo(px + 4, py + CELL - 9); g.lineTo(px + CELL - 4, py + CELL - 9); g.stroke();
        g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(px + CELL - 9, cy, 2.2, 0, Math.PI * 2); g.fill();
      } else if (ch === '~' || ch === 'w') {
        const prof = ch === 'w';
        g.fillStyle = prof ? '#1e4a6e' : '#3a6a8a'; g.fillRect(px, py, CELL, CELL);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px, py, CELL, 4);
      } else if (ch === 'T') {
        // albero: ombra, tronco, chioma a strati
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 5, cy + 7, 15, 10, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#4a2e14'; g.fillRect(cx - 3, cy, 6, 10);
        const verdi = ['#1e4a1e', '#2e6a2a', '#3e8a36'];
        verdi.forEach((v, k) => { g.fillStyle = v; g.beginPath(); for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2 + k; g.moveTo(cx, cy - 3); g.arc(cx + Math.cos(a) * (6 - k * 2), cy - 3 + Math.sin(a) * (6 - k * 2) - k * 2, 9 - k * 2.2, 0, Math.PI * 2); } g.fill(); });
        g.fillStyle = 'rgba(255,255,200,.15)'; g.beginPath(); g.arc(cx - 4, cy - 9, 4, 0, Math.PI * 2); g.fill();
      } else if (ch === 'b') {
        for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#3a6a2a' : '#4a7e34'; g.beginPath(); g.arc(px + 7 + r() * 18, py + 9 + r() * 15, 5 + r() * 3, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(200,60,60,.6)'; if (r() < 0.4) { g.beginPath(); g.arc(px + 10 + r() * 12, py + 10 + r() * 12, 1.6, 0, Math.PI * 2); g.fill(); }
      } else if (ch === 'r') {
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 3, cy + 6, 13, 7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a7268'; g.beginPath(); g.moveTo(px + 4, py + 24); g.lineTo(px + 8, py + 8); g.lineTo(px + 18, py + 4); g.lineTo(px + 28, py + 12); g.lineTo(px + 28, py + 26); g.closePath(); g.fill();
        g.fillStyle = '#9a9288'; g.beginPath(); g.moveTo(px + 8, py + 8); g.lineTo(px + 18, py + 4); g.lineTo(px + 22, py + 14); g.lineTo(px + 10, py + 16); g.closePath(); g.fill();
      } else if (ch === 't') {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px + 5, py + 8, CELL - 6, CELL - 8);
        g.fillStyle = '#8a5a2a'; g.fillRect(px + 3, py + 4, CELL - 6, CELL - 9);
        g.strokeStyle = '#4a2a10'; g.lineWidth = 1; g.strokeRect(px + 3.5, py + 4.5, CELL - 7, CELL - 10);
        g.beginPath(); g.moveTo(px + 3, py + 14); g.lineTo(px + CELL - 3, py + 14); g.stroke();
        if (r() < 0.5) { g.fillStyle = '#d8d0c0'; g.beginPath(); g.arc(px + 12, py + 10, 3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c8a050'; g.fillRect(px + 19, py + 7, 4, 6); }
      } else if (ch === 'c') {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + 3, cy + 4, 12, 9, 0, 0, Math.PI * 2); g.fill();
        const cg = g.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 12); cg.addColorStop(0, '#c8c0b4'); cg.addColorStop(1, '#6a645c');
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3a3630'; g.stroke();
      } else if (ch === 'S') {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px + 6, py + 4, CELL - 8, CELL - 4);
        g.fillStyle = '#8a8478'; g.fillRect(px + 4, py + 2, CELL - 8, CELL - 5);
        g.strokeStyle = '#3a3630'; g.lineWidth = 1.2; g.strokeRect(px + 4.5, py + 2.5, CELL - 9, CELL - 6);
        g.strokeStyle = '#5a564c'; g.beginPath(); g.moveTo(cx, py + 7); g.lineTo(cx, py + CELL - 7); g.moveTo(cx - 5, py + 12); g.lineTo(cx + 5, py + 12); g.stroke();
      } else if (ch === ':') {
        for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#6a6258' : '#857c70'; g.beginPath(); g.arc(px + 5 + r() * 22, py + 5 + r() * 22, 2 + r() * 3.5, 0, Math.PI * 2); g.fill(); }
      } else if (ch === 'f') {
        g.fillStyle = '#3a2a22'; g.fillRect(px, py, CELL, CELL);
        g.fillStyle = '#1a0e08'; g.fillRect(px + 5, py + 8, CELL - 10, CELL - 8);
      }
    }
    // griglia leggera
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= sc.w; x++) { g.moveTo(x * CELL + 0.5, 0); g.lineTo(x * CELL + 0.5, H); }
    for (let y = 0; y <= sc.h; y++) { g.moveTo(0, y * CELL + 0.5); g.lineTo(W, y * CELL + 0.5); }
    g.stroke();
    cacheScena.set(chiave, cv);
    if (cacheScena.size > 6) cacheScena.delete(cacheScena.keys().next().value);
    return cv;
  }

  // la vista del gruppo: le celle che vede almeno un personaggio in piedi (linea di vista, entro un raggio)
  const OPACO = new Set(['#', 'T', 'r', 'c', 'a', 'k', 'L']);
  function vede(sc, x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3;
    for (let k = 1; k < n; k++) { const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n); if ((x === x1 && y === y1) || (x === x0 && y === y0)) continue; if (OPACO.has(sc.g[y * sc.w + x])) return false; }
    return true;
  }
  function campoVisivo(sc, occhi, raggio) {
    const vis = new Uint8Array(sc.w * sc.h);
    for (const o of occhi) for (let y = Math.max(0, o.y - raggio); y <= Math.min(sc.h - 1, o.y + raggio); y++) for (let x = Math.max(0, o.x - raggio); x <= Math.min(sc.w - 1, o.x + raggio); x++) {
      if (vis[y * sc.w + x]) continue;
      if (Math.hypot(x - o.x, y - o.y) <= raggio + 0.5 && vede(sc, o.x, o.y, x, y)) vis[y * sc.w + x] = 1;
    }
    return vis;
  }

  // immagini dei ritratti per le pedine (dall'SVG)
  const cacheImg = new Map();
  function immagineRitratto(pg) {
    const k = JSON.stringify([pg.stirpe, pg.classe, pg.genere, pg.discendenza, pg.aspetto]);
    if (cacheImg.has(k)) return cacheImg.get(k);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(A().ritratto(pg, { cornice: false }))}`;
    cacheImg.set(k, img);
    return img;
  }

  window.DraghiMappe = { terrenoMondo, mondoHtml, stratoScena, campoVisivo, vede, immagineRitratto, CELL, rng };
})();
