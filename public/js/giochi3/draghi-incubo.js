// DRAGHI E SEGRETE: le ambientazioni horror nel browser (Sevastopol, PATHOS-II, Mount Massive).
// - le TESSERE horror (pavimenti di metallo e piastrelle, muri con i pannelli, armadietti, letti, terminali, grate dei
//   condotti, ascensori, porte chiuse, uova e resina, casse): servono alla mappa tattica a turni (strato) e alla mappa
//   in tempo reale
// - A TURNI: il pannello della stazione (la mappa schematica dei settori scoperti con porte chiuse, ascensori, tram e
//   condotti; l'obiettivo; rumore, paura e batterie; zaino e oggetti da costruire) e la barra delle azioni rapide sotto
//   il racconto (vai, fruga, nasconditi, rilevatore, torcia…); in combattimento i pulsanti di armadietto, oggetti e
//   hackeraggio
// - IN TEMPO REALE: la mappa enorme vista dall'alto su un canvas che resta vivo tra un aggiornamento e l'altro, col
//   buio vero (la vista si ferma ai muri), il cono della torcia, le luci rosse d'emergenza, la visione notturna verde del
//   manicomio, il rilevatore di movimento in basso (i puntini di chi si muove, con il bip), i comandi da tastiera e
//   mouse o con joystick e pulsanti sul telefono
(() => {
  const { esc, suono } = window.Nuovi;
  const STILI = ['stazione', 'uffici', 'alloggi', 'medico', 'laboratorio', 'industriale', 'tram', 'nido', 'sottomarina', 'fondale', 'manicomio', 'fogne', 'cortile'];
  const GROTTE = new Set(['nido', 'fondale', 'fogne']);
  const telefono = () => window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  const tocco = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  // colori dei pavimenti e dei muri per stile
  const COLORI = {
    stazione: ['#3a3f45', '#353a40', '#1b1e22', '#5a626c'], uffici: ['#43403c', '#3d3a36', '#1e1c1a', '#6a645c'], alloggi: ['#4a3e34', '#433830', '#1f1a16', '#6e5e50'],
    medico: ['#c8ccc8', '#bcc0bc', '#2a2e2e', '#8a9494'], laboratorio: ['#bfc6c8', '#b2babc', '#262c30', '#7e8a92'], industriale: ['#3e3a32', '#38342c', '#18160f', '#6a5e40'],
    tram: ['#34383e', '#2e3238', '#16181c', '#4e5662'], nido: ['#2a2622', '#24201c', '#0e0c0a', '#3a3028'], sottomarina: ['#2e3a40', '#29343a', '#101a1e', '#4a6a74'],
    fondale: ['#1e2c30', '#1a272b', '#0a1214', '#2e4248'], manicomio: ['#6a6a5e', '#626256', '#26261e', '#8a8a74'], fogne: ['#3a3a2e', '#343428', '#141410', '#4e4e3a'],
    cortile: ['#3a4a30', '#34432b', '#14180e', '#5a5a4a'],
  };
  const rng = (seme) => { let s = (Number(seme) >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // ---------- una tessera horror ----------
  function tessera(g, ch, at, x, y, C, r, stile, { aperta = false, vuota = false } = {}) {
    const [f1, f2, m1, m2] = COLORI[stile] || COLORI.stazione;
    const px = x * C, py = y * C, cx = px + C / 2, cy = py + C / 2, k = C / 32;
    const grotta = GROTTE.has(stile);
    // il pavimento sotto tutto quello che non è muro
    if (ch !== '#') {
      g.fillStyle = (x + y) % 2 ? f1 : f2; g.fillRect(px, py, C, C);
      if (grotta) { for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.15})`; g.beginPath(); g.arc(px + r() * C, py + r() * C, (1 + r() * 3) * k, 0, 7); g.fill(); } if (stile === 'nido') { g.strokeStyle = 'rgba(70,60,40,.6)'; g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(px + r() * C, py); g.bezierCurveTo(px + r() * C, py + C / 2, px + r() * C, py + C / 2, px + r() * C, py + C); g.stroke(); } }
      else if (stile === 'medico' || stile === 'laboratorio' || stile === 'manicomio') { g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, C / 2, C / 2); g.strokeRect(px + C / 2 + 0.5, py + C / 2 + 0.5, C / 2 - 1, C / 2 - 1); if (stile === 'manicomio' && r() < 0.12) { g.fillStyle = 'rgba(90,10,10,.5)'; g.beginPath(); g.ellipse(px + r() * C, py + r() * C, (3 + r() * 6) * k, (2 + r() * 4) * k, r() * 3, 0, 7); g.fill(); } }
      else if (stile === 'cortile') { for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(90,120,60,.5)'; g.lineWidth = 1; const ex = px + r() * C, ey = py + r() * C; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + (r() - 0.5) * 3, ey - 4 * k); g.stroke(); } }
      else { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, C - 1, C - 1); g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(px + 2, py + 2, C - 4, 2); if (r() < 0.25) { g.fillStyle = 'rgba(0,0,0,.25)'; for (const [a, b] of [[4, 4], [C - 6, 4], [4, C - 6], [C - 6, C - 6]]) g.fillRect(px + a, py + b, 2 * k, 2 * k); } if (r() < 0.06) { g.fillStyle = 'rgba(40,30,10,.35)'; g.beginPath(); g.ellipse(cx, cy, 8 * k, 5 * k, r() * 3, 0, 7); g.fill(); } }
    }
    const ombra = (w, h) => { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px + 4 * k, py + 6 * k, w, h); };
    switch (ch) {
      case '#': {
        const sotto = at(x, y + 1) !== '#';
        g.fillStyle = m1; g.fillRect(px, py, C, C);
        if (!grotta) { g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(px + 2, py + 2, C - 4, C - 4); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; g.strokeRect(px + 3.5, py + 3.5, C - 7, (sotto ? C - 14 * k : C - 7)); }
        g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.beginPath();
        if (at(x, y - 1) !== '#') { g.moveTo(px, py + 1); g.lineTo(px + C, py + 1); }
        if (at(x - 1, y) !== '#') { g.moveTo(px + 1, py); g.lineTo(px + 1, py + C); }
        if (at(x + 1, y) !== '#') { g.moveTo(px + C - 1, py); g.lineTo(px + C - 1, py + C); }
        g.stroke();
        if (sotto) {
          const fy = py + C - 12 * k, fg = g.createLinearGradient(0, fy, 0, py + C); fg.addColorStop(0, m2); fg.addColorStop(1, m1);
          g.fillStyle = fg; g.fillRect(px, fy, C, 12 * k);
          if (!grotta) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px + C * 0.2, fy + 3 * k, C * 0.6, 2 * k); if (r() < 0.2) { g.fillStyle = r() < 0.5 ? '#c83a20' : '#e0b020'; g.fillRect(px + C * 0.7, fy + 2 * k, 3 * k, 3 * k); } }
        }
        break;
      }
      case '+': case 'L': {
        if (aperta && ch === '+') { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py, C, C); g.fillStyle = '#5a626c'; g.fillRect(px, py, 4 * k, C); g.fillRect(px + C - 4 * k, py, 4 * k, C); break; }
        const or = at(x - 1, y) === '#' || at(x + 1, y) === '#' || at(x - 1, y) === ch || at(x + 1, y) === ch;
        g.fillStyle = ch === 'L' ? '#4a2a28' : '#4a525c'; g.fillRect(px + 1, py + 1, C - 2, C - 2);
        g.strokeStyle = ch === 'L' ? '#e04030' : '#9aa4ae'; g.lineWidth = 2 * k; g.beginPath();
        if (or) { g.moveTo(px + 2, cy); g.lineTo(px + C - 2, cy); } else { g.moveTo(cx, py + 2); g.lineTo(cx, py + C - 2); }
        g.stroke();
        g.fillStyle = 'rgba(255,200,40,.6)'; for (let i = 0; i < 4; i++) g.fillRect(px + 3 * k + i * 7 * k, py + 2 * k, 3 * k, 2 * k);
        if (ch === 'L') { g.fillStyle = '#ff5040'; g.beginPath(); g.arc(cx, cy, 3.5 * k, 0, 7); g.fill(); }
        else { g.fillStyle = '#50e070'; g.beginPath(); g.arc(px + C - 6 * k, py + 6 * k, 2 * k, 0, 7); g.fill(); }
        break;
      }
      case 'a': { // armadietto
        ombra(C - 6 * k, C - 6 * k);
        g.fillStyle = '#6a747e'; g.fillRect(px + 3 * k, py + 2 * k, C - 6 * k, C - 5 * k);
        g.strokeStyle = '#2a3036'; g.lineWidth = 1.2; g.strokeRect(px + 3.5 * k, py + 2.5 * k, C - 7 * k, C - 6 * k);
        g.beginPath(); g.moveTo(cx, py + 3 * k); g.lineTo(cx, py + C - 4 * k); g.stroke();
        g.strokeStyle = 'rgba(20,24,28,.8)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(px + 6 * k, py + (7 + i * 3) * k); g.lineTo(cx - 3 * k, py + (7 + i * 3) * k); g.moveTo(cx + 3 * k, py + (7 + i * 3) * k); g.lineTo(px + C - 6 * k, py + (7 + i * 3) * k); g.stroke(); }
        break;
      }
      case 'l': { // letto o barella
        ombra(C - 8 * k, C - 6 * k);
        g.fillStyle = stile === 'manicomio' ? '#8a8270' : '#d8dcd8'; g.fillRect(px + 4 * k, py + 3 * k, C - 8 * k, C - 6 * k);
        g.fillStyle = '#f0f0e8'; g.fillRect(px + 6 * k, py + 4 * k, C - 12 * k, 6 * k);
        g.strokeStyle = '#4a4a44'; g.lineWidth = 1; g.strokeRect(px + 4.5 * k, py + 3.5 * k, C - 9 * k, C - 7 * k);
        if (stile === 'manicomio') { g.fillStyle = 'rgba(110,20,20,.55)'; g.beginPath(); g.arc(px + C * 0.6, py + C * 0.6, 4 * k, 0, 7); g.fill(); }
        break;
      }
      case 't': { // scrivania
        ombra(C - 6 * k, C - 8 * k);
        g.fillStyle = stile === 'laboratorio' || stile === 'medico' ? '#9aa2a8' : '#5a4e40'; g.fillRect(px + 3 * k, py + 4 * k, C - 6 * k, C - 9 * k);
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.strokeRect(px + 3.5 * k, py + 4.5 * k, C - 7 * k, C - 10 * k);
        if (r() < 0.6) { g.fillStyle = '#1a2a22'; g.fillRect(px + 8 * k, py + 7 * k, 9 * k, 6 * k); g.fillStyle = 'rgba(80,220,120,.55)'; g.fillRect(px + 9 * k, py + 8 * k, 7 * k, 4 * k); }
        break;
      }
      case 'c': { // cassa
        ombra(C - 8 * k, C - 8 * k);
        g.fillStyle = vuota ? '#3a3a34' : '#7a6a3a'; g.fillRect(px + 4 * k, py + 4 * k, C - 8 * k, C - 8 * k);
        g.strokeStyle = vuota ? '#22221e' : '#3a3018'; g.lineWidth = 1.5; g.strokeRect(px + 4.5 * k, py + 4.5 * k, C - 9 * k, C - 9 * k);
        g.beginPath(); g.moveTo(px + 4 * k, py + 4 * k); g.lineTo(px + C - 4 * k, py + C - 4 * k); g.moveTo(px + C - 4 * k, py + 4 * k); g.lineTo(px + 4 * k, py + C - 4 * k); g.stroke();
        if (!vuota) { g.fillStyle = '#e0b020'; g.fillRect(cx - 3 * k, py + 3 * k, 6 * k, 3 * k); }
        break;
      }
      case 'k': { // terminale
        ombra(C - 8 * k, C - 8 * k);
        g.fillStyle = '#2a3238'; g.fillRect(px + 4 * k, py + 4 * k, C - 8 * k, C - 8 * k);
        g.fillStyle = '#103a20'; g.fillRect(px + 7 * k, py + 7 * k, C - 14 * k, C - 16 * k);
        g.fillStyle = 'rgba(90,255,140,.8)'; for (let i = 0; i < 3; i++) g.fillRect(px + 9 * k, py + (9 + i * 3) * k, (6 + r() * 8) * k, 1.4 * k);
        break;
      }
      case 'o': { // il punto dell'obiettivo (quadro, terminale, valvola…)
        ombra(C - 8 * k, C - 8 * k);
        g.fillStyle = '#4a4030'; g.fillRect(px + 3 * k, py + 3 * k, C - 6 * k, C - 6 * k);
        g.fillStyle = '#e0b020'; g.fillRect(px + 6 * k, py + 6 * k, C - 12 * k, C - 12 * k);
        g.fillStyle = '#1a1408'; g.font = `bold ${Math.round(14 * k)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', cx, cy + k); g.textBaseline = 'alphabetic';
        break;
      }
      case 'v': { // grata del condotto
        g.fillStyle = '#16181a'; g.fillRect(px + 4 * k, py + 4 * k, C - 8 * k, C - 8 * k);
        g.strokeStyle = '#6a7278'; g.lineWidth = 1.6 * k; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(px + (6 + i * 5) * k, py + 5 * k); g.lineTo(px + (6 + i * 5) * k, py + C - 5 * k); g.stroke(); }
        g.strokeRect(px + 4 * k, py + 4 * k, C - 8 * k, C - 8 * k);
        break;
      }
      case 'E': { // ascensore o tram
        g.fillStyle = '#2a3e5a'; g.fillRect(px + 2 * k, py + 2 * k, C - 4 * k, C - 4 * k);
        g.strokeStyle = '#8ab8e8'; g.lineWidth = 1.5; g.strokeRect(px + 2.5 * k, py + 2.5 * k, C - 5 * k, C - 5 * k);
        g.fillStyle = '#cfe4ff'; g.beginPath(); g.moveTo(cx, py + 7 * k); g.lineTo(cx - 5 * k, py + 13 * k); g.lineTo(cx + 5 * k, py + 13 * k); g.fill(); g.beginPath(); g.moveTo(cx, py + C - 7 * k); g.lineTo(cx - 5 * k, py + C - 13 * k); g.lineTo(cx + 5 * k, py + C - 13 * k); g.fill();
        break;
      }
      case 'u': { // uova e resina
        g.fillStyle = 'rgba(30,26,20,.8)'; g.beginPath(); g.arc(cx, cy, 13 * k, 0, 7); g.fill();
        const eg = g.createRadialGradient(cx - 3 * k, cy - 4 * k, 1, cx, cy, 9 * k); eg.addColorStop(0, '#a89870'); eg.addColorStop(1, '#4a3e28');
        g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy, 7 * k, 9 * k, 0, 0, 7); g.fill();
        g.strokeStyle = '#2a2014'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 4 * k, cy - 6 * k); g.lineTo(cx, cy - 2 * k); g.lineTo(cx + 4 * k, cy - 6 * k); g.moveTo(cx, cy - 2 * k); g.lineTo(cx, cy - 8 * k); g.stroke();
        break;
      }
      case 'r': { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 3, cy + 5, 12 * k, 7 * k, 0, 0, 7); g.fill(); g.fillStyle = stile === 'fondale' ? '#3a4e52' : '#5a564c'; g.beginPath(); g.moveTo(px + 4 * k, py + 24 * k); g.lineTo(px + 8 * k, py + 8 * k); g.lineTo(px + 18 * k, py + 4 * k); g.lineTo(px + 28 * k, py + 12 * k); g.lineTo(px + 27 * k, py + 26 * k); g.closePath(); g.fill(); break; }
      case 'T': { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + 5, cy + 7, 15 * k, 10 * k, 0, 0, 7); g.fill(); g.fillStyle = '#2a1e12'; g.fillRect(cx - 3 * k, cy, 6 * k, 10 * k); for (const [col, rr] of [['#14241a', 12], ['#1c3020', 9], ['#26402a', 6]]) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy - 4 * k, rr * k, 0, 7); g.fill(); } break; }
      case 'b': { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#2a3a22' : '#34462a'; g.beginPath(); g.arc(px + (7 + r() * 18) * k, py + (9 + r() * 15) * k, (4 + r() * 3) * k, 0, 7); g.fill(); } break; }
      case '~': { g.fillStyle = 'rgba(60,70,40,.75)'; g.fillRect(px, py, C, C); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(px, py + r() * C, C, 2); break; }
      case 'w': { g.fillStyle = '#05080a'; g.fillRect(px, py, C, C); break; }
      case ':': { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#4a4640' : '#6a645a'; g.beginPath(); g.arc(px + (5 + r() * 22) * k, py + (5 + r() * 22) * k, (2 + r() * 3) * k, 0, 7); g.fill(); } break; }
      default: break;
    }
  }
  // la scena tattica a turni intera (un canvas, come stratoScena)
  function strato(sc, C) {
    const cv = document.createElement('canvas'); cv.width = sc.w * C; cv.height = sc.h * C;
    const g = cv.getContext('2d'), r = rng(sc.g.length * 17 + sc.w);
    const at = (x, y) => (x < 0 || y < 0 || x >= sc.w || y >= sc.h ? '#' : sc.g[y * sc.w + x]);
    for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) tessera(g, at(x, y), at, x, y, C, r, sc.stile);
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= sc.w; x++) { g.moveTo(x * C + 0.5, 0); g.lineTo(x * C + 0.5, sc.h * C); }
    for (let y = 0; y <= sc.h; y++) { g.moveTo(0, y * C + 0.5); g.lineTo(sc.w * C, y * C + 0.5); }
    g.stroke();
    return cv;
  }

  // ===================== A TURNI =====================
  const TIPO_LINK = { porta: '🚪', ascensore: '🛗', tram: '🚋', condotto: '🕳️' };
  const LUCE = { accesa: ['#2a3a3a', 'luce accesa'], emergenza: ['#4a1414', 'luci d\'emergenza'], buio: ['#0c0c10', 'buio'] };
  function mappaStazione(inc) {
    const CW = 130, CH = 74, M = 14;
    const W = inc.cols * CW + M * 2, H = inc.righe * CH + M * 2;
    const pos = (a) => [M + a.gx * CW + CW / 2, M + a.gy * CH + CH / 2];
    const per = Object.fromEntries(inc.aree.map((a) => [a.id, a]));
    const linee = inc.collegamenti.filter((l) => per[l.a] && per[l.b]).map((l) => {
      const [x1, y1] = pos(per[l.a]), [x2, y2] = pos(per[l.b]);
      const col = l.chiuso ? '#c83a2a' : l.tipo === 'condotto' ? '#8a8a6a' : l.tipo === 'tram' ? '#5aa0e0' : l.tipo === 'ascensore' ? '#a080e0' : '#9ab0a0';
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${l.tipo === 'tram' ? 4 : 2.5}" ${l.tipo === 'condotto' ? 'stroke-dasharray="4 4"' : ''} opacity=".85"/>
        <text x="${mx}" y="${my + 4}" font-size="12" text-anchor="middle">${l.chiuso ? '🔒' : TIPO_LINK[l.tipo] || ''}</text>${l.chiuso ? `<title>Chiuso: serve ${esc(l.serve)}</title>` : ''}</g>`;
    }).join('');
    const nodi = inc.aree.map((a) => {
      const [x, y] = pos(a), qui = a.id === inc.area;
      const [fondo] = LUCE[a.luce] || ['#1a1a1a'];
      return `<g class="dr-in-nodo ${qui ? 'qui' : ''} ${a.visitata ? '' : 'ignota'}">
        <rect x="${x - CW / 2 + 8}" y="${y - CH / 2 + 8}" width="${CW - 16}" height="${CH - 16}" rx="7" fill="${a.visitata ? fondo : '#101014'}" stroke="${qui ? '#ffd860' : a.segnale ? '#ff3030' : '#5a6a6a'}" stroke-width="${qui ? 3 : 1.5}" ${a.visitata ? '' : 'stroke-dasharray="3 3"'}/>
        ${a.luce === 'emergenza' ? `<rect x="${x - CW / 2 + 8}" y="${y - CH / 2 + 8}" width="${CW - 16}" height="4" rx="2" fill="#e03020"/>` : ''}
        <text x="${x}" y="${y + 2}" text-anchor="middle" font-size="11" fill="${a.visitata ? '#e8efe8' : '#6a7070'}">${esc(a.nome.length > 19 ? `${a.nome.slice(0, 18)}…` : a.nome)}</text>
        ${a.obiettivo ? `<text x="${x + CW / 2 - 18}" y="${y - CH / 2 + 24}" font-size="14">🎯</text>` : ''}
        ${qui ? `<text x="${x - CW / 2 + 14}" y="${y - CH / 2 + 24}" font-size="13">📍</text>` : ''}
        ${a.segnale ? `<circle cx="${x}" cy="${y + 16}" r="6" fill="#ff3030" class="dr-in-bip"/>` : ''}</g>`;
    }).join('');
    return `<svg class="dr-in-mappa" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa della stazione">${linee}${nodi}</svg>`;
  }
  const barra = (v, max, col, testo) => `<span class="dr-in-barra"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%;background:${col}"></i><b>${testo}</b></span>`;
  function mioStato(ctx) { const inc = ctx.partita.incubo; return inc && inc.stato ? inc.stato[ctx.mio] : null; }
  function zaino(ctx, pg, { pulsanti = true } = {}) {
    const inc = ctx.partita.incubo, O = inc.oggetti || {};
    const ogg = (pg.oggetti || []).filter((o) => o.n > 0);
    if (!ogg.length) return '<p class="dr-nota">Lo zaino è vuoto.</p>';
    return `<ul class="dr-in-zaino">${ogg.map((o) => { const d = O[o.id] || {}; return `<li title="${esc(d.desc || o.descrizione || '')}"><span>${d.icona || '•'}</span>${esc(o.nome)}${o.n > 1 ? ` <b>×${o.n}</b>` : ''}${pulsanti && o.id === 'kitMedico' ? ' <button type="button" class="dr-link" data-az="dr-in-az" data-id="cura">usa</button>' : ''}${pulsanti && o.id === 'batterie' ? ' <button type="button" class="dr-link" data-az="dr-in-az" data-id="ricarica">cambia</button>' : ''}</li>`; }).join('')}</ul>`;
  }
  function ricette(ctx, pg, attr = 'dr-in-costruisci') {
    const inc = ctx.partita.incubo; if (!inc.meccaniche.costruzione) return '';
    const conta = (id) => ((pg.oggetti || []).find((o) => o.id === id) || { n: 0 }).n;
    return `<ul class="dr-in-ricette">${inc.ricette.map((r) => { const ok = r.serve.every((x) => conta(x.id) >= x.n); return `<li class="${ok ? 'ok' : ''}"><button type="button" class="dr-chip" data-az="${attr}" data-id="${r.id}" ${ok ? '' : 'disabled'} title="${esc(r.desc)}">${r.icona} ${esc(r.nome)}</button><small>${r.serve.map((x) => `${x.icona}${x.n > 1 ? `×${x.n}` : ''}`).join(' + ')}</small></li>`; }).join('')}</ul>`;
  }
  function pannello(ctx) {
    const p = ctx.partita, inc = p.incubo, pg = p.pg[ctx.mio], st = mioStato(ctx);
    if (!inc || !inc.aree) return '';
    const ob = inc.obiettivo;
    const obiettivo = ob ? `<div class="dr-in-ob"><small>🎯 Obiettivo ${inc.fatti + 1} di ${inc.totale}</small><b>${esc(ob.titolo)}</b><p>${esc(ob.testo)}</p><small>📍 ${esc(ob.area)}${ob.qui ? ' — <b>siete qui</b>' : ''}</small></div>` : '';
    const stato = st ? `<div class="dr-in-stato">${barra(inc.rumore, 10, inc.rumore >= 6 ? '#e04030' : '#c8a040', `🔊 Rumore ${inc.rumore}/10`)}${inc.meccaniche.paura ? barra(st.paura, 10, st.paura >= 7 ? '#a040c0' : '#6a5a9a', `😨 Paura ${st.paura}/10${st.paura >= 7 ? ' (svantaggio)' : ''}`) : ''}${inc.meccaniche.batterie ? barra(st.batteria, 100, '#40b060', `🔋 ${Math.round(st.batteria)}% · ${st.torcia ? 'accesa' : 'spenta'}`) : ''}</div>` : '';
    const creatura = inc.cacciaAttiva ? `<p class="dr-in-creatura ${inc.scacciata ? 'calma' : ''}">${inc.scacciata ? '🔥 La creatura è stata scacciata: per un po\' è lontana.' : '👁️ Qualcosa vi dà la caccia. Fate piano.'}</p>` : '';
    const chiavi = inc.chiavi.length ? `<p class="dr-in-chiavi">🗝️ ${inc.chiavi.map(esc).join(' · ')}</p>` : '';
    return `<div class="dr-in-pann"><header class="dr-in-testa"><span>${esc(inc.icona)}</span><div><b>${esc(inc.nome)}</b><small>${esc(inc.sottotitolo)}</small></div></header>
      ${obiettivo}${stato}${creatura}${mappaStazione(inc)}<p class="dr-nota">🚪 porta · 🛗 ascensore · 🚋 tram · 🕳️ condotto · 🔒 chiuso (serve un oggetto)</p>${chiavi}
      ${pg ? `<h4 class="dr-sez-tit">🎒 Zaino di ${esc(pg.nome)}</h4>${zaino(ctx, pg)}${inc.meccaniche.costruzione ? `<h4 class="dr-sez-tit">🛠️ Costruire</h4>${ricette(ctx, pg)}` : ''}` : ''}</div>`;
  }
  // la barra delle azioni rapide sotto il racconto
  function azioni(ctx) {
    const p = ctx.partita, inc = p.incubo, st = mioStato(ctx), pg = p.pg[ctx.mio];
    if (!inc || !inc.strade || !pg || pg.morto || p.fase !== 'avventura' || p.attesaIA) return '';
    const m = inc.meccaniche, ha = (id) => (pg.oggetti || []).some((o) => o.id === id && o.n > 0);
    const b = (az, ic, nome, ok = true, extra = '') => `<button type="button" class="dr-in-bt" data-az="dr-in-az" data-id="${az}" ${extra} ${ok ? '' : 'disabled'}><span>${ic}</span>${nome}</button>`;
    const vai = inc.strade.map((s) => `<button type="button" class="dr-in-bt dr-in-vai ${s.chiuso ? 'chiuso' : ''}" data-az="dr-in-az" data-id="vai" data-area="${esc(s.id)}" ${s.chiuso ? 'disabled' : ''} title="${s.chiuso ? `Chiuso: serve ${esc(s.serve)}` : esc(s.tipo)}"><span>${s.chiuso ? '🔒' : TIPO_LINK[s.tipo]}</span>${esc(s.nome)}</button>`).join('');
    return `<div class="dr-in-azioni"><div class="dr-in-riga">${inc.obiettivo && inc.obiettivo.qui ? b('obiettivo', '🎯', esc(inc.obiettivo.cosa || 'Obiettivo'), true, 'data-forte="1"') : ''}${b('cerca', '🔎', `Fruga${inc.scorte ? ` (${inc.scorte})` : ''}`, inc.scorte > 0)}${m.nascondigli ? b('nascondi', st && st.nascosto ? '🚪' : '🫣', st && st.nascosto ? 'Esci' : 'Nasconditi') : ''}${m.rilevatore && ha('rilevatore') ? b('rilevatore', '📡', 'Rilevatore') : ''}${m.batterie ? b('torcia', st && st.torcia ? '🔦' : '🌑', st && st.torcia ? 'Spegni' : 'Accendi') : ''}${ha('batterie') ? b('ricarica', '🔋', 'Batterie') : ''}${ha('kitMedico') && pg.pf < pg.pfMax ? b('cura', '➕', 'Kit medico') : ''}</div>
      <div class="dr-in-riga"><small>Vai verso:</small>${vai}</div>${inc.rilevato ? `<p class="dr-in-ril">📡 ${inc.rilevato.passi === 0 ? 'Il segnale è QUI.' : inc.rilevato.passi === 1 ? 'Segnale nel settore accanto!' : inc.rilevato.passi === 2 ? 'Segnale a due settori.' : 'Niente si muove.'}</p>` : ''}</div>`;
  }
  // i pulsanti horror nel pannello del turno di combattimento
  function azioniCombattimento(ctx, pg, me, t, s) {
    const p = ctx.partita, inc = p.incubo; if (!inc) return '';
    const O = inc.oggetti || {}, cl = (inc.classi || {})[pg.classe] || {};
    const sel = (az, ogg) => s.sel && s.sel.tipo === 'az' && s.sel.az === az && (!ogg || (s.sel.extra && s.sel.extra.oggetto === ogg));
    const bt = (az, ic, n, d, { chi = '', ogg = '', portata = '', ok = t.azione } = {}) => `<button type="button" class="dr-cb-az ${sel(az, ogg) ? 'sel' : ''}" data-az="dr-cb-az" data-id="${az}" ${chi ? `data-chi="${chi}"` : ''} ${ogg ? `data-ogg="${ogg}"` : ''} ${portata ? `data-portata="${portata}"` : ''} ${ok ? '' : 'disabled'} title="${esc(d)}"><span>${ic}</span>${n}</button>`;
    const lista = [];
    lista.push(me.armadietto ? '<span class="dr-in-nota">🗄️ Sei in un nascondiglio: muoviti per uscire.</span>' : bt('armadietto', '🗄️', 'Nasconditi', 'Chiuditi in un armadietto o sotto un letto vicino: nessuno ti può colpire (la creatura però annusa)'));
    if (cl.hacker) lista.push(bt('hackera', '💻', 'Hackera', 'Spegni un androide vicino (Indagare contro CD 10 + GS)', { chi: 'nemico', portata: 1.5 }));
    for (const o of pg.oggetti || []) {
      const d = O[o.id]; if (!d || d.tipo !== 'uso' || o.n <= 0) continue;
      if (o.id === 'kitMedico') lista.push(bt('oggetto', d.icona, `${d.nome} ×${o.n}`, d.desc, { chi: 'alleato', ogg: o.id, portata: 1.5 }));
      else if (d.lancio) lista.push(bt('oggetto', d.icona, `${d.nome} ×${o.n}`, d.desc, { chi: 'punto', ogg: o.id }));
    }
    const rumore = ctx.partita.combattimento && ctx.partita.combattimento.rumore;
    return `<div class="dr-cb-sez"><h4>🫣 Sopravvivere <small>${rumore ? `🔊 rumore ${rumore}/10${rumore >= 6 ? ' — la creatura sente!' : ''}` : 'il rumore attira la creatura'}</small></h4><div class="dr-cb-azioni">${lista.join('')}</div></div>`;
  }
  function clic(ctx, el) {
    const az = el.dataset.az, id = el.dataset.id;
    if (az === 'dr-in-az') return ctx.invia({ tipo: 'incubo', az: id, ...(el.dataset.area ? { area: el.dataset.area } : {}) });
    if (az === 'dr-in-costruisci') return ctx.invia({ tipo: 'incubo', az: 'costruisci', ricetta: id });
    if (az.startsWith('dr-re-')) return clicReale(ctx, el);
    return undefined;
  }

  // ===================== IN TEMPO REALE =====================
  const OPACO = new Set(['#', 'L', 'a', 'k', 'T', 'r']);
  const BLOCCA = new Set(['#', 'L', 'a', 'c', 'k', 'o', 'u', 'r', 'T', 'w', 't', 'l']);
  const SOTTO = new Set(['t', 'l']);
  const VEL = { cammina: 3.2, corre: 4.9, accucciato: 1.7, rilevatore: 2.0 };
  const LUCE_AMB = { accesa: 0.9, emergenza: 0.62, buio: 0.1 };
  const CHUNK = 16;
  const RT = { tasti: new Set(), inp: { mx: 0, my: 0, corre: false, acc: false, a: 0, ril: false, arma: 0 }, seq: { att: 0, usa: 0, torcia: 0, ricarica: 0, cura: 0, hack: 0, lancia: 0, costruisci: 0 }, lancio: null, costruisci: null, lancia: null, ultimo: null, prima: null, tArr: 0, ctx: null, pred: null, joy: null, bipT: 0, msgVisti: 0, accToggle: false, rilToggle: false, chunk: new Map(), ver: -1, mouse: null };
  const attivo = () => RT.ctx && RT.ctx.partita && RT.ctx.partita.gioco === 'draghi' && RT.ctx.partita.fase === 'reale' && !RT.ctx.partita.finita && !RT.ctx.stato.spettatore;
  function realeHtml(ctx) {
    const p = ctx.partita, R = p.reale, inc = p.incubo, pg = p.pg[ctx.mio];
    if (!R) return '<div class="dr dr-reale"><p class="dr-vuoto">Caricamento…</p></div>';
    const ob = inc && inc.obiettivo;
    const armi = (R.armi || []).map((a, k) => `<button type="button" class="dr-chip ${RT.inp.arma === k ? 'sel' : ''}" data-az="dr-re-arma" data-id="${k}" title="${esc(`${a.danno} · ${a.colpire >= 0 ? '+' : ''}${a.colpire} a colpire`)}">${k + 1}. ${esc(a.nome)}${a.munizioni != null ? ` <b>${a.munizioni}</b>` : ''}</button>`).join('');
    const O = (inc && inc.oggetti) || {};
    const lanci = pg ? (pg.oggetti || []).filter((o) => O[o.id] && O[o.id].lancio && o.n > 0).map((o) => `<button type="button" class="dr-chip ${RT.lancio === o.id ? 'sel' : ''}" data-az="dr-re-lancio" data-id="${o.id}" title="${esc(O[o.id].desc)}">${O[o.id].icona} ${esc(O[o.id].nome)} ×${o.n}</button>`).join('') : '';
    const gruppo = p.pg.map((x, i) => (x ? `<li class="${x.morto ? 'morto' : x.pf <= 0 ? 'giu' : ''} ${i === ctx.mio ? 'mio' : ''}"><b>${esc(x.nome)}</b>${barra(Math.max(0, x.pf), x.pfMax, x.pf / x.pfMax < 0.35 ? '#d04030' : '#40a060', x.morto ? '💀 morto' : x.pf <= 0 ? '🩸 a terra' : `${x.pf}/${x.pfMax}`)}</li>` : '')).join('');
    const aiuto = tocco() ? 'Joystick per muoverti (spingi forte per correre). ⚔️ attacca il nemico più vicino, ✋ usa (porte, casse, armadietti, ascensori, obiettivi), 🫣 accovacciati, 📡 rilevatore, 🔦 torcia.'
      : 'WASD o frecce: muoviti · Maiusc: corri (fa rumore) · C: accovacciati (silenzioso, passi sotto scrivanie e letti) · E: usa (porte, casse, armadietti, ascensori, condotti, obiettivi) · clic o Spazio: attacca verso il mouse · 1-4: arma · G: lancia l\'oggetto scelto · Q (tieni premuto): rilevatore · F: torcia · R: batterie · H: kit medico · X: hackera un androide';
    const caduti = p.fase === 'caduti' ? '<div class="dr-re-caduti">💀 Siete tutti morti. Scrivete <b>!revive</b> in chat per tornare in vita.</div>' : '';
    return `<div class="dr dr-reale dr-amb-${esc(p.ambientazione)}">
      <div class="dr-re-schermo"><div id="dr-re-posto" class="dr-re-posto"></div>
        <div class="dr-re-alto"><div class="dr-re-ob">${ob ? `<small>🎯 ${inc.fatti + 1}/${inc.totale} · ${esc(ob.area)}</small><b>${esc(ob.titolo)}</b><span>${esc(ob.testo)}</span>` : ''}</div><div id="dr-re-msg" class="dr-re-msg"></div></div>
        ${tocco() ? `<div class="dr-re-joy" data-re="joy"><i></i></div><div class="dr-re-tasti"><button type="button" data-re="att" class="grande">⚔️</button><button type="button" data-re="usa">✋</button><button type="button" data-re="acc" class="${RT.accToggle ? 'sel' : ''}">🫣</button><button type="button" data-re="ril" class="${RT.rilToggle ? 'sel' : ''}">📡</button><button type="button" data-re="torcia">🔦</button><button type="button" data-re="zaino">🎒</button></div>` : ''}
        <div class="dr-re-scrivi"><input type="text" data-tieni="reale" maxlength="300" enterkeyhint="send" autocomplete="off" value="${esc(ctx.ui.t_reale || '')}" placeholder="${tocco() ? 'Scrivi un\'azione: parlo con lui, salto…' : 'T o Invio: scrivi un\'azione (parlo con lui, ascolto, salto…). Il gioco non si ferma'}"><button type="button" class="dr-bt" data-az="dr-re-manda" aria-label="Manda">➤</button></div>
        ${caduti}</div>
      <aside class="dr-re-lato ${RT.zaino ? 'aperto' : ''}">${tocco() ? '<button type="button" class="dr-x" data-az="dr-re-zaino" aria-label="Chiudi">✕</button>' : ''}
        <h4 class="dr-sez-tit">👥 La squadra</h4><ul class="dr-re-gruppo">${gruppo}</ul>
        <h4 class="dr-sez-tit">⚔️ Armi</h4><div class="dr-chips">${armi || '<small>Nessuna arma: scappa e nasconditi.</small>'}</div>
        ${lanci ? `<h4 class="dr-sez-tit">🎯 Da lanciare <small>${tocco() ? 'scegli, poi tocca dove' : 'scegli, poi G o clic destro'}</small></h4><div class="dr-chips">${lanci}</div>` : ''}
        ${pg ? `<h4 class="dr-sez-tit">🎒 Zaino</h4>${zaino(ctx, pg, { pulsanti: false })}<div class="dr-chips">${(pg.oggetti || []).some((o) => o.id === 'kitMedico') ? '<button type="button" class="dr-chip" data-az="dr-re-cura">➕ Kit medico (H)</button>' : ''}${(pg.oggetti || []).some((o) => o.id === 'batterie') ? '<button type="button" class="dr-chip" data-az="dr-re-ricarica">🔋 Batterie (R)</button>' : ''}${inc && inc.classi && inc.classi[pg.classe] && inc.classi[pg.classe].hacker ? '<button type="button" class="dr-chip" data-az="dr-re-hack">💻 Hackera (X)</button>' : ''}</div>` : ''}
        ${pg && inc && inc.meccaniche.costruzione ? `<h4 class="dr-sez-tit">🛠️ Costruire <small>2 secondi fermo</small></h4>${ricette(ctx, pg, 'dr-re-costruisci')}` : ''}
        ${inc && inc.chiavi.length ? `<p class="dr-in-chiavi">🗝️ ${inc.chiavi.map(esc).join(' · ')}</p>` : ''}
        <p class="dr-nota">${aiuto}</p>
        ${ctx.partita.host === ctx.mio ? '<button type="button" class="dr-link" data-az="dr-termina">Chiudi la campagna</button>' : ''}</aside></div>`;
  }
  function clicReale(ctx, el) {
    const az = el.dataset.az, id = el.dataset.id;
    if (az === 'dr-re-arma') { RT.inp.arma = Number(id); return ctx.ridisegna(); }
    if (az === 'dr-re-lancio') { RT.lancio = RT.lancio === id ? null : id; if (tocco() && RT.lancio) { RT.zaino = false; ctx.avviso('Tocca il punto dove lanciarlo'); } return ctx.ridisegna(); }
    if (az === 'dr-re-costruisci') { RT.seq.costruisci++; RT.costruisci = { seq: RT.seq.costruisci, id }; invia(true); return undefined; }
    if (az === 'dr-re-cura') { RT.seq.cura++; invia(true); return undefined; }
    if (az === 'dr-re-ricarica') { RT.seq.ricarica++; invia(true); return undefined; }
    if (az === 'dr-re-hack') { RT.seq.hack++; invia(true); return undefined; }
    if (az === 'dr-re-zaino') { RT.zaino = !RT.zaino; return ctx.ridisegna(); }
    if (az === 'dr-re-manda') {
      const el2 = document.querySelector('#panno [data-tieni="reale"]'), testo = (el2 ? el2.value : ctx.ui.t_reale || '').trim();
      if (!testo) { if (el2) el2.focus(); return undefined; }
      ctx.ui.t_reale = ''; if (el2) { el2.value = ''; el2.blur(); }
      ctx.invia({ tipo: 'scrivi', testo });
      return undefined;
    }
    return undefined;
  }
  // ---------- i comandi ----------
  let inviato = '', ultimoInvio = 0;
  function pacco() {
    const i = RT.inp, d = { mx: Math.round(i.mx * 100) / 100, my: Math.round(i.my * 100) / 100, corre: i.corre, acc: i.acc || RT.accToggle, a: Math.round(i.a * 100) / 100, ril: i.ril || RT.rilToggle, arma: i.arma };
    for (const k of ['att', 'usa', 'torcia', 'ricarica', 'cura', 'hack']) if (RT.seq[k]) d[k] = RT.seq[k];
    if (RT.lancia) d.lancia = RT.lancia;
    if (RT.costruisci) d.costruisci = RT.costruisci;
    return d;
  }
  function invia(forza = false) {
    if (!attivo()) return;
    const d = pacco(), k = JSON.stringify(d), ora = performance.now();
    if (!forza && k === inviato && ora - ultimoInvio < 300) return;
    inviato = k; ultimoInvio = ora;
    RT.ctx.emetti('input', d);
  }
  setInterval(() => invia(), 70);
  function aggiornaTasti() {
    if (RT.joy && RT.joy.id != null) return;
    const t = RT.tasti;
    const x = (t.has('d') || t.has('arrowright') ? 1 : 0) - (t.has('a') || t.has('arrowleft') ? 1 : 0);
    const y = (t.has('s') || t.has('arrowdown') ? 1 : 0) - (t.has('w') || t.has('arrowup') ? 1 : 0);
    const l = Math.hypot(x, y) || 1;
    RT.inp.mx = x / l; RT.inp.my = y / l;
    RT.inp.corre = t.has('shift'); RT.inp.ril = t.has('q');
  }
  const scrive = (e) => e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable]');
  document.addEventListener('keydown', (e) => {
    if (!attivo()) return;
    if (e.target && e.target.dataset && e.target.dataset.tieni === 'reale') {
      if (e.key === 'Enter') { e.preventDefault(); const b = document.querySelector('#panno [data-az="dr-re-manda"]'); if (b) b.click(); }
      if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); }
      return;
    }
    if (!scrive(e) && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T' || e.key === 'Enter')) { const el = document.querySelector('#panno [data-tieni="reale"]'); if (el) { e.preventDefault(); RT.tasti.clear(); aggiornaTasti(); invia(true); el.focus(); } }
  });
  document.addEventListener('keydown', (e) => {
    if (!attivo() || scrive(e) || e.ctrlKey && e.key.toLowerCase() !== 'control' || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', ' ', 'e', 'f', 'c', 'r', 'h', 'g', 'x', '1', '2', '3', '4'].includes(k)) e.preventDefault();
    if (e.repeat && !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
    RT.tasti.add(k);
    if (k === ' ') RT.seq.att++;
    if (k === 'e') RT.seq.usa++;
    if (k === 'f') RT.seq.torcia++;
    if (k === 'r') RT.seq.ricarica++;
    if (k === 'h') RT.seq.cura++;
    if (k === 'x') RT.seq.hack++;
    if (k === 'c') RT.accToggle = !RT.accToggle;
    if (k === 'g' && RT.lancio && RT.mouse) lanciaVerso(RT.mouse.wx, RT.mouse.wy);
    if (['1', '2', '3', '4'].includes(k)) { RT.inp.arma = Number(k) - 1; RT.ctx.ridisegna(); }
    aggiornaTasti(); invia(true);
  });
  document.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); RT.tasti.delete(k); if (k === 'shift') RT.tasti.delete('shift'); if (attivo()) { aggiornaTasti(); invia(true); } });
  window.addEventListener('blur', () => { RT.tasti.clear(); aggiornaTasti(); });
  function lanciaVerso(wx, wy) { RT.seq.lancia++; RT.lancia = { seq: RT.seq.lancia, id: RT.lancio, x: Math.round(wx * 10) / 10, y: Math.round(wy * 10) / 10 }; RT.lancio = null; invia(true); if (RT.ctx) RT.ctx.ridisegna(); }
  // joystick e pulsanti sul telefono
  document.addEventListener('pointerdown', (e) => {
    if (!attivo()) return;
    const b = e.target.closest && e.target.closest('[data-re]');
    if (!b) return;
    e.preventDefault();
    const az = b.dataset.re;
    if (az === 'joy') { const r = b.getBoundingClientRect(); RT.joy = { id: e.pointerId, x0: r.left + r.width / 2, y0: r.top + r.height / 2, el: b, raggio: r.width / 2 }; muoviJoy(e); return; }
    if (az === 'att') { autoMira(); RT.seq.att++; }
    if (az === 'usa') RT.seq.usa++;
    if (az === 'torcia') RT.seq.torcia++;
    if (az === 'acc') { RT.accToggle = !RT.accToggle; b.classList.toggle('sel', RT.accToggle); }
    if (az === 'ril') { RT.rilToggle = !RT.rilToggle; b.classList.toggle('sel', RT.rilToggle); }
    if (az === 'zaino') { RT.zaino = !RT.zaino; RT.ctx.ridisegna(); }
    invia(true);
  }, { passive: false });
  function muoviJoy(e) {
    const j = RT.joy; if (!j || e.pointerId !== j.id) return;
    let dx = e.clientX - j.x0, dy = e.clientY - j.y0; const l = Math.hypot(dx, dy), max = j.raggio;
    const k = Math.min(1, l / max);
    RT.inp.mx = l > 6 ? (dx / l) * k : 0; RT.inp.my = l > 6 ? (dy / l) * k : 0;
    RT.inp.corre = l > max * 1.05;
    if (l > 6 && !RT.mira) RT.inp.a = Math.atan2(dy, dx);
    const pomo = j.el.querySelector('i'); if (pomo) { const q = Math.min(l, max); pomo.style.transform = `translate(${l ? (dx / l) * q : 0}px, ${l ? (dy / l) * q : 0}px)`; }
    invia();
  }
  document.addEventListener('pointermove', (e) => { if (RT.joy && e.pointerId === RT.joy.id) { e.preventDefault(); muoviJoy(e); } }, { passive: false });
  const finisciJoy = (e) => { if (RT.joy && e.pointerId === RT.joy.id) { const pomo = RT.joy.el.querySelector('i'); if (pomo) pomo.style.transform = ''; RT.joy = null; RT.inp.mx = 0; RT.inp.my = 0; RT.inp.corre = false; invia(true); } };
  document.addEventListener('pointerup', finisciJoy); document.addEventListener('pointercancel', finisciJoy);
  // al telefono si mira da soli al nemico visibile più vicino
  function autoMira() {
    const d = RT.ultimo, me = RT.pred; if (!d || !me) return;
    const n = d.ent.slice().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (n && Math.hypot(n.x - me.x, n.y - me.y) < 14) RT.inp.a = Math.atan2(n.y - me.y, n.x - me.x);
  }

  // ---------- gli aggiornamenti dal server ----------
  function tick(ctx, d) {
    if (!d) return;
    RT.ctx = ctx;
    RT.prima = RT.ultimo; RT.ultimo = d; RT.tArr = performance.now();
    const me = d.g[d.occhi];
    if (!RT.pred || d.occhi !== RT.predDi || Math.hypot(RT.pred.x - me.x, RT.pred.y - me.y) > 2.5 || me.arm || me.giu || me.morto) { RT.pred = { x: me.x, y: me.y }; RT.predDi = d.occhi; }
    else { RT.pred.x += (me.x - RT.pred.x) * 0.18; RT.pred.y += (me.y - RT.pred.y) * 0.18; }
    // i messaggi nuovi
    // i messaggi nuovi: restano qualche secondo e poi spariscono (sul telefono se ne vedono meno)
    const box = document.getElementById('dr-re-msg'), adesso = performance.now();
    RT.arrivi = RT.arrivi || new Map();
    for (const m of d.msg) if (!RT.arrivi.has(m.n)) RT.arrivi.set(m.n, adesso);
    const vivi = d.msg.filter((m) => adesso - RT.arrivi.get(m.n) < (m.tipo === 'master' ? 14000 : 9000)).slice(telefono() ? -3 : -5);
    const chiave = vivi.map((m) => m.n).join(',');
    if (box && chiave !== RT.msgChiave) { RT.msgChiave = chiave; box.innerHTML = vivi.map((m) => `<p class="${m.tipo}">${esc(m.testo)}</p>`).join(''); }
    if (d.msg.length) {
      const ultimo = d.msg[d.msg.length - 1].n;
      if (ultimo !== RT.msgVisti) {
        const nuovi = d.msg.filter((m) => m.n > RT.msgVisti);
        RT.msgVisti = ultimo;
        if (nuovi.some((m) => /vi ha visti|TI HA TROVATO|è morto/.test(m.testo))) suono([[110, 0.25], [90, 0.4]], { tipo: 'sawtooth', volume: 0.06 });
        else if (nuovi.some((m) => /Obiettivo|✅|🎯/.test(m.testo))) suono([[523, 0.08], [659, 0.08], [784, 0.14]], { tipo: 'triangle', volume: 0.04 });
      }
    }
    // gli spari e le esplosioni si sentono
    for (const f of d.fx) {
      if (RT.fxVisti && f.n <= RT.fxVisti) continue;
      if (f.tipo === 'sparo') suono([[180, 0.04], [90, 0.06]], { tipo: 'square', volume: 0.04 });
      else if (f.tipo === 'bombaTubo' || f.tipo === 'molotov') suono([[70, 0.3], [50, 0.4]], { tipo: 'sawtooth', volume: 0.07 });
      else if (f.tipo === 'urlo') suono([[620, 0.15], [380, 0.3], [700, 0.2]], { tipo: 'sawtooth', volume: 0.05 });
      else if (f.tipo === 'grata') suono([[140, 0.08], [160, 0.08]], { tipo: 'square', volume: 0.025 });
    }
    if (d.fx.length) RT.fxVisti = Math.max(RT.fxVisti || 0, ...d.fx.map((f) => f.n));
    // il bip del rilevatore: più vicino è, più acuto
    if (d.blip && performance.now() - RT.bipT > 1000) {
      RT.bipT = performance.now();
      const dm = d.blip.length ? Math.min(...d.blip.map(([x, y]) => Math.hypot(x - me.x, y - me.y))) : 99;
      suono([[dm < 22 ? 1400 - dm * 40 : 700, 0.05]], { tipo: 'sine', volume: dm < 22 ? 0.05 : 0.02 });
    }
  }

  // ---------- il disegno ----------
  function dopo(ctx) {
    RT.ctx = ctx;
    const p = ctx.partita;
    if (p.fase !== 'reale' && p.fase !== 'caduti') return;
    if (!p.reale) return;
    const posto = document.getElementById('dr-re-posto'); if (!posto) return;
    if (!RT.cv) {
      RT.cv = document.createElement('canvas'); RT.cv.className = 'dr-re-tela';
      RT.cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const w = schermoAMondo(e); RT.mouse = w; if (RT.pred) RT.inp.a = Math.atan2(w.wy - RT.pred.y, w.wx - RT.pred.x); });
      RT.cv.addEventListener('pointerdown', (e) => {
        if (!attivo()) return;
        const w = schermoAMondo(e);
        if (RT.lancio && (e.pointerType === 'touch' || e.button === 2 || e.button === 0)) { e.preventDefault(); lanciaVerso(w.wx, w.wy); return; }
        if (e.pointerType === 'touch') return;
        if (e.button === 0) { RT.inp.a = Math.atan2(w.wy - RT.pred.y, w.wx - RT.pred.x); RT.seq.att++; invia(true); }
      });
      RT.cv.addEventListener('contextmenu', (e) => e.preventDefault());
      RT.luce = document.createElement('canvas');
      requestAnimationFrame(disegna);
    }
    if (RT.cv.parentNode !== posto) posto.appendChild(RT.cv);
    // la mappa: si rifanno i pezzi quando cambia (porte aperte, casse frugate)
    const R = p.reale;
    if (R.v !== RT.ver || R.mappa !== RT.mappa) { RT.ver = R.v; if (R.mappa !== RT.mappa) { RT.mappa = R.mappa; RT.chunk.clear(); } else RT.chunk.clear(); RT.aperti = new Set(R.aperti); RT.fissa = R; }
  }
  function schermoAMondo(e) {
    const r = RT.cv.getBoundingClientRect(), C = RT.C || 28;
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { wx: RT.camX + (sx - r.width / 2) / C, wy: RT.camY + (sy - r.height / 2) / C };
  }
  const at = (x, y) => { const F = RT.fissa; if (!F || x < 0 || y < 0 || x >= F.w || y >= F.h) return '#'; return F.mappa[y * F.w + x]; };
  function pezzo(cx, cy, C) {
    const k = `${cx},${cy},${C}`;
    let cv = RT.chunk.get(k);
    if (cv) return cv;
    const F = RT.fissa;
    cv = document.createElement('canvas'); cv.width = CHUNK * C; cv.height = CHUNK * C;
    const g = cv.getContext('2d'), r = rng(cx * 7919 + cy * 104729 + 1);
    g.translate(-cx * CHUNK * C, -cy * CHUNK * C);
    for (let y = cy * CHUNK; y < (cy + 1) * CHUNK; y++) for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) {
      if (x >= F.w || y >= F.h) continue;
      const ar = F.aree.find((a) => a.gx === Math.floor(x / F.sw) && a.gy === Math.floor(y / F.sh));
      tessera(g, at(x, y), at, x, y, C, r, ar ? ar.stile : 'stazione', { vuota: RT.aperti && RT.aperti.has(y * F.w + x) });
    }
    RT.chunk.set(k, cv);
    if (RT.chunk.size > 80) RT.chunk.delete(RT.chunk.keys().next().value);
    return cv;
  }
  function areaIn(x, y) { const F = RT.fissa; return F.aree.find((a) => a.gx === Math.floor(x / F.sw) && a.gy === Math.floor(y / F.sh)) || F.aree[0]; }
  // la vista: raggi dal personaggio fino al primo muro (le porte chiuse fermano la vista)
  function poligonoVista(ox, oy, raggio, porte) {
    const n = 200, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let d = 0;
      for (; d < raggio; d += 0.2) {
        const x = Math.floor(ox + dx * d), y = Math.floor(oy + dy * d), ch = at(x, y);
        if (OPACO.has(ch) || (ch === '+' && !porte.has(y * RT.fissa.w + x))) { d += 0.75; break; }
      }
      pts.push([ox + dx * Math.min(d, raggio), oy + dy * Math.min(d, raggio)]);
    }
    return pts;
  }
  // il movimento previsto del proprio personaggio (stesse regole del server)
  function blocca(x, y, acc) { const c = at(Math.floor(x), Math.floor(y)); if (SOTTO.has(c)) return !acc; return BLOCCA.has(c); }
  function libera(x, y, acc) { const r = 0.34; return !blocca(x - r, y - r, acc) && !blocca(x + r, y - r, acc) && !blocca(x - r, y + r, acc) && !blocca(x + r, y + r, acc); }
  function prevedi(dt) {
    const d = RT.ultimo; if (!d || !RT.pred || d.occhi !== d.io) return;
    const me = d.g[d.io]; if (me.arm || me.giu || me.morto || me.az) return;
    const i = RT.inp, acc = i.acc || RT.accToggle, ril = i.ril || RT.rilToggle;
    const l = Math.hypot(i.mx, i.my); if (l < 0.1) return;
    const v = (ril ? VEL.rilevatore : acc ? VEL.accucciato : i.corre ? VEL.corre : VEL.cammina) * Math.min(1, l);
    const nx = RT.pred.x + (i.mx / l) * v * dt, ny = RT.pred.y + (i.my / l) * v * dt;
    if (libera(nx, RT.pred.y, acc)) RT.pred.x = nx;
    if (libera(RT.pred.x, ny, acc)) RT.pred.y = ny;
  }
  let tPrec = 0;
  function disegna(t) {
    requestAnimationFrame(disegna);
    const dt = Math.min(0.1, (t - tPrec) / 1000); tPrec = t;
    const ctx = RT.ctx;
    if (!RT.cv || !RT.cv.isConnected || !ctx || !RT.ultimo || !RT.fissa || !ctx.partita || ctx.partita.gioco !== 'draghi' || !['reale', 'caduti'].includes(ctx.partita.fase)) return;
    prevedi(dt);
    const box = RT.cv.parentNode.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(200, box.width), H = Math.max(200, box.height);
    if (RT.cv.width !== Math.round(W * dpr) || RT.cv.height !== Math.round(H * dpr)) { RT.cv.width = Math.round(W * dpr); RT.cv.height = Math.round(H * dpr); RT.cv.style.width = `${W}px`; RT.cv.style.height = `${H}px`; RT.luce.width = RT.cv.width; RT.luce.height = RT.cv.height; }
    const C = telefono() ? 22 : 28; RT.C = C;
    const g = RT.cv.getContext('2d'), d = RT.ultimo, pr = RT.prima, F = RT.fissa;
    // interpolazione tra l'aggiornamento di prima e l'ultimo
    const u = Math.min(1, (performance.now() - RT.tArr) / 50);
    const lerp = (a, b) => (a == null ? b : a + (b - a) * u);
    const occhi = d.g[d.occhi];
    const io = d.occhi === d.io && RT.pred ? RT.pred : { x: lerp(pr && pr.g[d.occhi] && pr.g[d.occhi].x, occhi.x), y: lerp(pr && pr.g[d.occhi] && pr.g[d.occhi].y, occhi.y) };
    RT.camX = io.x; RT.camY = io.y;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#030304'; g.fillRect(0, 0, W, H);
    const ox = W / 2 - io.x * C, oy = H / 2 - io.y * C;
    // i pezzi di mappa che si vedono
    const x0 = Math.floor((io.x - W / 2 / C) / CHUNK), x1 = Math.floor((io.x + W / 2 / C) / CHUNK), y0 = Math.floor((io.y - H / 2 / C) / CHUNK), y1 = Math.floor((io.y + H / 2 / C) / CHUNK);
    for (let cy = Math.max(0, y0); cy <= y1; cy++) for (let cx = Math.max(0, x0); cx <= x1; cx++) g.drawImage(pezzo(cx, cy, C), ox + cx * CHUNK * C, oy + cy * CHUNK * C);
    g.save(); g.translate(ox, oy); g.scale(C, C);
    // porte aperte e il punto dell'obiettivo
    const porte = new Set(d.porte);
    for (const i of d.porte) { const x = i % F.w, y = Math.floor(i / F.w); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x + 0.12, y + 0.12, 0.76, 0.76); }
    if (F.punto) { const q = 0.5 + 0.5 * Math.sin(t / 250); g.strokeStyle = `rgba(255,216,80,${0.4 + q * 0.5})`; g.lineWidth = 0.08; g.beginPath(); g.arc(F.punto[0], F.punto[1], 0.7 + q * 0.25, 0, 7); g.stroke(); }
    // fuoco, fumo
    for (const [x, y, r] of d.fuochi) { const fg = g.createRadialGradient(x, y, 0.1, x, y, r); fg.addColorStop(0, 'rgba(255,220,120,.9)'); fg.addColorStop(0.5, `rgba(255,${90 + Math.random() * 60 | 0},20,.6)`); fg.addColorStop(1, 'rgba(200,40,0,0)'); g.fillStyle = fg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.restore();
    // ---- il buio ----
    const ar = areaIn(Math.floor(io.x), Math.floor(io.y));
    const torcia = occhi.torcia && !occhi.morto;
    const visione = F.aree && ctx.partita.ambientazione === 'manicomio' && torcia;
    const raggio = ar.luce === 'accesa' ? 15 : ar.luce === 'emergenza' ? 12 : 13;
    const poly = poligonoVista(io.x, io.y, raggio, porte);
    const L = RT.luce.getContext('2d');
    L.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.globalCompositeOperation = 'source-over'; L.fillStyle = 'rgba(2,2,4,0.985)'; L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = 'destination-out';
    L.save(); L.translate(ox, oy); L.scale(C, C);
    L.beginPath(); poly.forEach(([x, y], k) => (k ? L.lineTo(x, y) : L.moveTo(x, y))); L.closePath(); L.clip();
    const amb = LUCE_AMB[ar.luce] != null ? LUCE_AMB[ar.luce] : 0.5;
    const ga = L.createRadialGradient(io.x, io.y, 0.5, io.x, io.y, raggio); ga.addColorStop(0, `rgba(0,0,0,${Math.max(amb, 0.55)})`); ga.addColorStop(0.25, `rgba(0,0,0,${amb})`); ga.addColorStop(1, `rgba(0,0,0,${amb * 0.6})`);
    L.fillStyle = ga; L.fillRect(io.x - raggio, io.y - raggio, raggio * 2, raggio * 2);
    // vicino si vede sempre un po'
    const gv = L.createRadialGradient(io.x, io.y, 0.3, io.x, io.y, 2.6); gv.addColorStop(0, 'rgba(0,0,0,.7)'); gv.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gv; L.fillRect(io.x - 3, io.y - 3, 6, 6);
    // la torcia: un cono
    const a = d.occhi === d.io ? RT.inp.a : occhi.a;
    if (torcia) {
      const lung = visione ? 12 : 12, ap = visione ? 0.75 : 0.55;
      const gt = L.createRadialGradient(io.x, io.y, 0.3, io.x, io.y, lung); gt.addColorStop(0, 'rgba(0,0,0,.95)'); gt.addColorStop(0.7, 'rgba(0,0,0,.8)'); gt.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gt; L.beginPath(); L.moveTo(io.x, io.y); L.arc(io.x, io.y, lung, a - ap, a + ap); L.closePath(); L.fill();
    }
    // le torce dei compagni, i razzi, il fuoco
    d.g.forEach((q, k) => { if (k === d.occhi || q.morto || !q.torcia) return; const gl = L.createRadialGradient(q.x, q.y, 0.2, q.x, q.y, 7); gl.addColorStop(0, 'rgba(0,0,0,.8)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gl; L.beginPath(); L.moveTo(q.x, q.y); L.arc(q.x, q.y, 8, q.a - 0.5, q.a + 0.5); L.closePath(); L.fill(); });
    for (const [x, y, r] of [...d.luci, ...d.fuochi.map(([x2, y2, r2]) => [x2, y2, r2 + 3])]) { const gl = L.createRadialGradient(x, y, 0.2, x, y, r); gl.addColorStop(0, 'rgba(0,0,0,1)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gl; L.fillRect(x - r, y - r, r * 2, r * 2); }
    L.restore();
    // luci d'emergenza rosse (tingono quello che si vede, il buio resta nero), poi il buio
    if (ar.luce === 'emergenza') { g.fillStyle = `rgba(210,20,0,${0.16 + 0.08 * Math.sin(t / 380)})`; g.fillRect(0, 0, W, H); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(RT.luce, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (visione) { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(120,255,140)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(60,255,90,.06)'; for (let k = 0; k < 40; k++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    // ---- le creature (quelle che il server dice visibili) e i compagni ----
    g.save(); g.translate(ox, oy); g.scale(C, C);
    const prEnt = pr ? new Map(pr.ent.map((e) => [e.id, e])) : new Map();
    for (const e of d.ent) {
      const q = prEnt.get(e.id), x = q ? lerp(q.x, e.x) : e.x, y = q ? lerp(q.y, e.y) : e.y;
      if (e.k === 'creatura') {
        g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.ellipse(x, y + 0.3, 0.8, 0.35, 0, 0, 7); g.fill();
        g.save(); g.translate(x, y); g.rotate(e.a);
        g.fillStyle = '#0a0b0e'; g.strokeStyle = '#3a4048'; g.lineWidth = 0.05;
        g.beginPath(); g.ellipse(0, 0, 0.75, 0.38, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(0.72, 0, 0.42, 0.22, 0, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = '#14161a'; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-0.7, 0); g.quadraticCurveTo(-1.3, Math.sin(t / 150) * 0.4, -1.8, Math.sin(t / 200) * 0.6); g.stroke();
        for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(0.2, 0.3 * s2); g.lineTo(0.5, 0.75 * s2); g.moveTo(-0.3, 0.3 * s2); g.lineTo(-0.5, 0.75 * s2); g.stroke(); }
        g.restore();
        if (e.st === 'caccia') { g.fillStyle = '#ff3030'; g.font = '0.7px sans-serif'; g.textAlign = 'center'; g.fillText('!', x, y - 0.8); }
        continue;
      }
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x, y + 0.28, 0.4, 0.16, 0, 0, 7); g.fill();
      g.fillStyle = e.k === 'androide' ? '#c8b48a' : '#7a3a3a'; g.beginPath(); g.arc(x, y, 0.38, 0, 7); g.fill();
      g.strokeStyle = e.st === 'insegue' ? '#ff4030' : 'rgba(0,0,0,.6)'; g.lineWidth = 0.06; g.stroke();
      g.font = '0.5px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.s || '👤', x, y + 0.02); g.textBaseline = 'alphabetic';
      if (e.pf != null && e.pf < e.pfMax) { g.fillStyle = '#300'; g.fillRect(x - 0.4, y - 0.62, 0.8, 0.1); g.fillStyle = '#e04030'; g.fillRect(x - 0.4, y - 0.62, 0.8 * Math.max(0, e.pf / e.pfMax), 0.1); }
      if (e.st === 'stordito') { g.font = '0.4px sans-serif'; g.fillText('💫', x, y - 0.5); }
    }
    const COL = ['#4ac0ff', '#ffb040', '#7ae07a', '#e070e0', '#ffe060', '#60e0d0'];
    d.g.forEach((q, k) => {
      if (q.morto && k !== d.io) return;
      const qp = pr && pr.g[k];
      const x = k === d.occhi && RT.pred && d.occhi === d.io ? RT.pred.x : lerp(qp && qp.x, q.x), y = k === d.occhi && RT.pred && d.occhi === d.io ? RT.pred.y : lerp(qp && qp.y, q.y);
      const aq = k === d.io ? RT.inp.a : q.a;
      if (q.arm) { g.strokeStyle = COL[k % 6]; g.lineWidth = 0.06; g.setLineDash([0.12, 0.12]); g.strokeRect(Math.floor(x) + 0.08, Math.floor(y) + 0.08, 0.84, 0.84); g.setLineDash([]); return; }
      g.globalAlpha = q.morto ? 0.35 : 1;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x, y + 0.26, 0.36, 0.14, 0, 0, 7); g.fill();
      g.fillStyle = q.giu ? '#5a2a2a' : COL[k % 6]; g.beginPath(); g.arc(x, y, q.acc ? 0.28 : 0.34, 0, 7); g.fill();
      g.strokeStyle = '#0a0a0a'; g.lineWidth = 0.05; g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(x + Math.cos(aq) * 0.15, y + Math.sin(aq) * 0.15); g.lineTo(x + Math.cos(aq) * 0.5, y + Math.sin(aq) * 0.5); g.stroke();
      if (q.giu) { g.font = '0.45px sans-serif'; g.textAlign = 'center'; g.fillText(`🩸${q.caduto || ''}`, x, y - 0.5); }
      if (q.az) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 0.6, y - 0.75, 1.2, 0.16); g.fillStyle = '#ffd860'; g.fillRect(x - 0.6, y - 0.75, 1.2 * Math.min(1, q.az.p), 0.16); }
      g.globalAlpha = 1;
    });
    // effetti brevi
    for (const f of d.fx) {
      const vec = (t2) => Math.max(0, 1 - t2);
      if (f.tipo === 'sparo' || f.tipo === 'fiamma') { g.strokeStyle = f.tipo === 'fiamma' ? 'rgba(255,140,30,.8)' : 'rgba(255,240,170,.9)'; g.lineWidth = f.tipo === 'fiamma' ? 0.35 : 0.06; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); }
      else if (f.tipo === 'fendente') { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.08; g.beginPath(); g.arc(f.x, f.y, 1, f.a - 0.8, f.a + 0.8); g.stroke(); }
      else if (f.tipo === 'sangue') { g.fillStyle = f.olio ? 'rgba(230,230,210,.8)' : f.acido ? 'rgba(170,230,40,.8)' : 'rgba(170,10,10,.8)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(f.x + (Math.random() - 0.5) * 0.7, f.y + (Math.random() - 0.5) * 0.7, 0.08, 0, 7); g.fill(); } }
      else if (f.tipo === 'bombaTubo' || f.tipo === 'minaEmp') { g.fillStyle = f.tipo === 'minaEmp' ? 'rgba(90,180,255,.45)' : 'rgba(255,180,60,.6)'; g.beginPath(); g.arc(f.x, f.y, 2.6 * vec(0), 0, 7); g.fill(); }
      else if (f.tipo === 'lancio') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.04; g.setLineDash([0.2, 0.2]); g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.setLineDash([]); }
      else if (f.tipo === 'urlo') { g.strokeStyle = 'rgba(255,60,40,.5)'; g.lineWidth = 0.08; g.beginPath(); g.arc(f.x, f.y, 1.5 + Math.random(), 0, 7); g.stroke(); }
    }
    for (const [x, y, r] of d.fumi) { const fg = g.createRadialGradient(x, y, 0.2, x, y, r); fg.addColorStop(0, 'rgba(200,200,200,.75)'); fg.addColorStop(1, 'rgba(160,160,160,0)'); g.fillStyle = fg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    // i suoni forti fuori vista: un'onda nella direzione
    for (const [x, y, cr] of d.suoni) { g.strokeStyle = cr ? 'rgba(255,60,40,.5)' : 'rgba(255,220,120,.35)'; g.lineWidth = 0.06; const r = (t / 300) % 1; g.beginPath(); g.arc(x, y, 0.5 + r * 1.5, 0, 7); g.stroke(); }
    // dove si sta mirando il lancio
    if (RT.lancio && RT.mouse) { g.strokeStyle = 'rgba(255,216,80,.8)'; g.lineWidth = 0.05; g.beginPath(); g.arc(RT.mouse.wx, RT.mouse.wy, 0.6, 0, 7); g.stroke(); }
    g.restore();
    // ---- il rilevatore di movimento ----
    if (d.blip) {
      const R2 = Math.min(150, W * 0.28), cx = W / 2, cy = tocco() ? H - 150 : H - 12;
      g.save();
      g.fillStyle = 'rgba(8,24,16,.88)'; g.strokeStyle = '#3ae07a'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R2, Math.PI * 1.08, Math.PI * 1.92); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(58,224,122,.3)'; for (const k of [0.25, 0.5, 0.75]) { g.beginPath(); g.arc(cx, cy, R2 * k, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); }
      const onda = ((performance.now() - RT.bipT) / 1000) % 1; g.strokeStyle = `rgba(58,224,122,${0.6 * (1 - onda)})`; g.beginPath(); g.arc(cx, cy, R2 * onda, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      for (const [bx, by] of d.blip) {
        const dx = bx - io.x, dy = by - io.y, dd = Math.hypot(dx, dy); if (dd > 22) continue;
        // davanti al personaggio = in alto; quello che sta dietro finisce sul bordo del ventaglio
        let ang = Math.atan2(dy, dx) - a; while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
        ang = Math.max(-0.42 * Math.PI, Math.min(0.42 * Math.PI, ang));
        const rr = Math.max(6, (dd / 22) * R2), qx = cx + Math.sin(ang) * rr, qy = cy - Math.cos(ang) * rr;
        g.fillStyle = '#9affb0'; g.shadowColor = '#3ae07a'; g.shadowBlur = 10; g.beginPath(); g.arc(qx, qy, 4.5, 0, 7); g.fill(); g.shadowBlur = 0;
      }
      const vicino = d.blip.length ? Math.min(...d.blip.map(([bx, by]) => Math.hypot(bx - io.x, by - io.y))) : null;
      g.fillStyle = '#9affb0'; g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.fillText(vicino != null ? `${(vicino * 1.5).toFixed(1)} m` : '— —', cx, cy - 4);
      g.restore();
    }
    // ---- in alto a destra: punti ferita, batteria, paura ----
    const pg = ctx.partita.pg[d.io];
    if (pg) {
      g.save(); g.textAlign = 'right'; g.font = 'bold 13px system-ui, sans-serif';
      const righe = [`❤️ ${Math.max(0, pg.pf)}/${pg.pfMax}`, ...(F && ctx.partita.incubo && ctx.partita.incubo.meccaniche.batterie ? [`🔋 ${d.bat}%`] : []), `😨 ${d.paura}/10`, ...(occhi.arm ? ['🗄️ nascosto'] : []), ...(occhi.acc ? ['🫣 accovacciato'] : [])];
      righe.forEach((r, k) => { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W - 150, 8 + k * 22, 142, 20); g.fillStyle = k === 0 && pg.pf / pg.pfMax < 0.35 ? '#ff7060' : '#e8e8e0'; g.fillText(r, W - 14, 23 + k * 22); });
      g.restore();
    }
    // allarme: la creatura vi insegue
    if (d.allarme) { const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(200,0,0,${0.35 + 0.15 * Math.sin(t / 120)})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    if (occhi.morto || d.occhi !== d.io) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H / 2 - 22, W, 44); g.fillStyle = '#f0d8d0'; g.font = 'bold 16px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('💀 Sei morto: guardi i compagni. Scrivete !revive in chat per tornare.', W / 2, H / 2 + 6); }
  }

  window.DraghiIncubo = { STILI, tessera, strato, pannello, azioni, azioniCombattimento, mappaStazione, clic, realeHtml, dopo, tick };
})();
