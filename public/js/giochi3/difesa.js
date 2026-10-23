// DIFESA DELLA TORRE: il prato con le strade di terra battuta, la torre al centro (o le porte colorate in sfida), le
// caselle dove si può costruire (le proprie illuminate quando ci si passa sopra), le torrette che si girano verso il
// bersaglio, i mostri con la barra della vita, frecce, palle di cannone, schegge di ghiaccio e fulmini. Il menu per
// costruire, migliorare e vendere è uno strato HTML sopra il campo, accanto alla casella scelta.
(() => {
  const { COLORI } = window.Arena;
  const ICONE = { arciere: '🏹', cannone: '💣', ghiaccio: '❄️', fulmine: '⚡' };
  let ex = null, ctxD = null, sfondo = null, sel = null, sopraCella = null, colpi = [], scritte = [], botti = [], ferita = 0;
  const ora = () => performance.now() / 1000;
  const suono = (n, o) => window.Nuovi && window.Nuovi.suono && window.Nuovi.suono(n, o);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const attivo = () => ctxD && ctxD.partita && ctxD.partita.gioco === 'difesa' && !ctxD.partita.finita && document.querySelector('.panno-difesa');
  const ultimo = () => ctxD && ctxD.partita && ctxD.partita.stato && ctxD.partita.stato.s;

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

  function preparaSfondo() {
    const c = document.createElement('canvas'); c.width = ex.W * 2; c.height = ex.H * 2;
    const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#5d9b46'; g.fillRect(0, 0, ex.W, ex.H);
    // ciuffi d'erba e fiori
    for (let k = 0; k < 500; k++) {
      const x = (Math.sin(k * 12.9898) * 43758.5453 % 1 + 1) % 1 * ex.W, y = (Math.sin(k * 78.233) * 12345.678 % 1 + 1) % 1 * ex.H;
      g.fillStyle = k % 7 === 0 ? 'rgba(255,240,120,.55)' : k % 11 === 0 ? 'rgba(255,255,255,.5)' : k % 2 ? 'rgba(40,90,30,.35)' : 'rgba(140,200,100,.3)';
      g.beginPath(); g.arc(x, y, k % 7 === 0 || k % 11 === 0 ? 2 : 3 + (k % 3), 0, Math.PI * 2); g.fill();
    }
    const strada = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; for (const s of ex.strade) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
    strada(ex.LARGA * 2 + 8, '#6f5a32'); strada(ex.LARGA * 2, '#c9a76a'); strada(ex.LARGA * 2 - 10, '#d7b87c');
    // ciottoli sulla strada
    g.fillStyle = 'rgba(120,90,50,.35)';
    for (const s of ex.strade) for (let k = 1; k < s.length; k++) { const [a, b] = [s[k - 1], s[k]], l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d < l; d += 23) { const f = d / l; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * f + ((d * 7) % 13) - 6, a[1] + (b[1] - a[1]) * f + ((d * 5) % 11) - 5, 2.5, 0, Math.PI * 2); g.fill(); } }
    // le caselle dove si costruisce: un leggero quadrato
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (const [i, j] of ex.celle) g.strokeRect(10 + i * ex.CELLA + 2, j * ex.CELLA + 2, ex.CELLA - 4, ex.CELLA - 4);
    sfondo = c;
  }
  function torre(g, s, t) {
    const { x, y, r } = ex.torre;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 6, y + 10, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9a9488'; g.beginPath(); g.arc(x, y, r - 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6d675d'; g.lineWidth = 3; g.stroke();
    // merli
    for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5; g.fillStyle = '#b4aea2'; g.fillRect(x + Math.cos(a) * (r - 8) - 5, y + Math.sin(a) * (r - 8) - 5, 10, 10); }
    g.fillStyle = '#7d776c'; g.beginPath(); g.arc(x, y, r - 20, 0, Math.PI * 2); g.fill();
    // bandiera
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 46); g.stroke();
    g.fillStyle = ex.modo === 'squadra' ? '#e8453c' : '#ddd'; g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 26 + Math.sin(t * 4) * 3, y - 40); g.lineTo(x, y - 32); g.fill();
    // il colpo subito: la torre lampeggia di rosso
    if (t - ferita < 0.4) { g.fillStyle = `rgba(255,40,30,${0.5 * (1 - (t - ferita) / 0.4)})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    // in sfida: la porta di ognuno alla fine della sua strada, col colore e le vite
    if (ex.modo === 'sfida') ex.strade.forEach((st, p) => {
      const [ax, ay] = st[st.length - 2], gx = x + (ax - x) * 0.4, gy = y + (ay - y) * 0.4;
      g.fillStyle = s.fu[p] ? '#555' : COLORI[p % COLORI.length]; g.beginPath(); g.arc(gx, gy, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = '800 12px system-ui'; g.textAlign = 'center'; g.fillText(s.fu[p] ? '✖' : s.vp[p], gx, gy + 4);
    });
  }
  function torretta(g, t, c, adesso) {
    const [, tipo, i, j, liv, chi, ang] = t, x = 10 + i * ex.CELLA + ex.CELLA / 2, y = j * ex.CELLA + ex.CELLA / 2;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 3, y + 5, 17, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8c857a'; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = COLORI[chi % COLORI.length]; g.lineWidth = 3; g.stroke();
    g.save(); g.translate(x, y);
    if (tipo === 'arciere') {
      g.fillStyle = '#8a5a2b'; g.fillRect(-9, -9, 18, 18);
      g.rotate(ang); g.strokeStyle = '#4a2e12'; g.lineWidth = 3; g.beginPath(); g.arc(2, 0, 11, -1.1, 1.1); g.stroke();
      g.strokeStyle = '#eee'; g.lineWidth = 1; g.beginPath(); g.moveTo(2 + Math.cos(-1.1) * 11, Math.sin(-1.1) * 11); g.lineTo(2 + Math.cos(1.1) * 11, Math.sin(1.1) * 11); g.stroke();
    } else if (tipo === 'cannone') {
      g.fillStyle = '#4a4a4f'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
      g.rotate(ang); g.fillStyle = '#2c2c30'; g.fillRect(0, -5, 20, 10); g.fillStyle = '#111'; g.beginPath(); g.arc(20, 0, 4, 0, Math.PI * 2); g.fill();
    } else if (tipo === 'ghiaccio') {
      g.fillStyle = '#bfe8ff'; g.strokeStyle = '#5ab4e6'; g.lineWidth = 2;
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + adesso * 0.5, d = k % 2 ? 7 : 13; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); } g.closePath(); g.fill(); g.stroke();
    } else {
      const s = g.createRadialGradient(-3, -3, 1, 0, 0, 11); s.addColorStop(0, '#f3e1ff'); s.addColorStop(1, '#7b3fc4');
      g.fillStyle = s; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,240,140,.8)'; g.lineWidth = 1.5; g.beginPath(); const a = adesso * 7; g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(Math.cos(a + 0.4) * 16, Math.sin(a + 0.4) * 16); g.stroke();
    }
    g.restore();
    // i livelli: stelline sotto
    g.fillStyle = '#ffd23f'; g.font = '9px system-ui'; g.textAlign = 'center'; g.fillText('★'.repeat(liv), x, y + 26);
  }
  function mostro(g, m, adesso) {
    const [id, tipo, x, y, vita, lento] = m;
    const r = tipo === 'drago' ? 22 : tipo === 'orco' ? 14 : tipo === 'lupo' ? 10 : 11, b = Math.sin(adesso * 12 + id) * 1.5;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 2, y + r * 0.8, r, r * 0.4, 0, 0, Math.PI * 2); g.fill();
    if (tipo === 'drago') {
      g.fillStyle = '#b5281f'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + s * (34 + b * 3), y - 22 + b * 2); g.lineTo(x + s * 18, y + 4); g.fill(); }
      g.fillStyle = '#d63a2e'; g.beginPath(); g.ellipse(x, y + b, 18, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x - 6, y - 4 + b, 2.5, 0, Math.PI * 2); g.arc(x + 6, y - 4 + b, 2.5, 0, Math.PI * 2); g.fill();
    } else {
      const col = { goblin: '#4fa83d', lupo: '#8d8d95', orco: '#3d6b3a', scudo: '#a0927a' }[tipo];
      g.fillStyle = col; g.beginPath(); g.arc(x, y + b, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
      if (tipo === 'goblin') { g.fillStyle = col; g.beginPath(); g.moveTo(x - r, y - 2 + b); g.lineTo(x - r - 6, y - 8 + b); g.lineTo(x - r + 3, y - 6 + b); g.moveTo(x + r, y - 2 + b); g.lineTo(x + r + 6, y - 8 + b); g.lineTo(x + r - 3, y - 6 + b); g.fill(); }
      if (tipo === 'lupo') { g.fillStyle = '#6d6d75'; g.beginPath(); g.moveTo(x - 6, y - 7 + b); g.lineTo(x - 3, y - 14 + b); g.lineTo(x, y - 7 + b); g.moveTo(x + 6, y - 7 + b); g.lineTo(x + 3, y - 14 + b); g.lineTo(x, y - 7 + b); g.fill(); }
      if (tipo === 'scudo') { g.fillStyle = '#6b7b8c'; g.beginPath(); g.ellipse(x + 7, y + 2 + b, 6, 9, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#cfd6dd'; g.stroke(); }
      if (tipo === 'orco') { g.fillStyle = '#fff'; g.fillRect(x - 5, y + 4 + b, 3, 4); g.fillRect(x + 2, y + 4 + b, 3, 4); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.2 + b, 2.2, 0, Math.PI * 2); g.arc(x + r * 0.35, y - r * 0.2 + b, 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.2 + b, 1.1, 0, Math.PI * 2); g.arc(x + r * 0.35, y - r * 0.2 + b, 1.1, 0, Math.PI * 2); g.fill();
    }
    if (lento) { g.fillStyle = 'rgba(140,210,255,.45)'; g.beginPath(); g.arc(x, y + b, r + 3, 0, Math.PI * 2); g.fill(); }
    // la barra della vita
    if (vita < 100) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - 13, y - r - 9, 26, 4); g.fillStyle = vita > 50 ? '#5fd35f' : vita > 25 ? '#f2c230' : '#e8453c'; g.fillRect(x - 13, y - r - 9, 26 * vita / 100, 4); }
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

  const tavolo = window.Arena.tavolo({
    id: 'difesa',
    mouse: null,
    clicAzione: false,
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => `${window.Arena.touch() ? 'Tocca' : 'Clicca'} un prato libero vicino alla tua strada per costruire una torretta, ${window.Arena.touch() ? 'tocca' : 'clicca'} una tua torretta per migliorarla o venderla. Ferma i mostri prima della torre!`,
    statoGioco: (ctx, s) => (s.s.fu[ctx.mio] ? 'La tua porta è caduta' : s.s.st === 'attesa' ? `Ondata ${s.s.k + 1} tra ${s.s.fra} s` : `Ondata ${s.s.k} di ${ctx.partita.extra ? ctx.partita.extra.totale : ''}`),
    hud: (ctx, s) => `<span>🪙 ${s.s.oro[ctx.mio]}</span><span>❤️ ${s.s.vite !== null && s.s.vite !== undefined ? s.s.vite : s.s.vp[ctx.mio]}</span><span>🌊 ${s.s.k}/${ctx.partita.extra ? ctx.partita.extra.totale : ''}</span>${s.s.w.includes(ctx.mio) ? '<span>✨ torrette potenziate</span>' : ''}`,
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
      const adesso = ora(), s = d.s;
      const pos = (id) => { const t = s.t.find((q) => q[0] === id); return t ? [10 + t[2] * ex.CELLA + ex.CELLA / 2, t[3] * ex.CELLA + ex.CELLA / 2] : null; };
      for (const e of s.e || []) {
        if (e[0] === 'a' || e[0] === 'g' || e[0] === 'c') { const da = pos(e[1]); if (da) colpi.push({ k: e[0], da, a: [e[2], e[3]], t: adesso }); if (e[0] === 'c') suono([[90, 0.08]], { tipo: 'square', volume: 0.025 }); }
        else if (e[0] === 'l') { const da = pos(e[1]); if (da) colpi.push({ k: 'l', da, pt: e[2], t: adesso }); suono([[1200, 0.02], [600, 0.04]], { tipo: 'sawtooth', volume: 0.015 }); }
        else if (e[0] === 'm') { if (e[4] === ctx.mio) scritte.push({ x: e[1], y: e[2], txt: `+${e[3]}`, t: adesso }); botti.push({ x: e[1], y: e[2], t: adesso, drago: e[5] === 'drago' }); }
        else if (e[0] === 'x') { if (ex.modo === 'squadra' || e[1] === ctx.mio) { ferita = adesso; suono([[160, 0.1], [110, 0.15]], { tipo: 'sawtooth', volume: 0.05 }); } }
        else if (e[0] === 'o') { scritte.push({ x: ex.W / 2, y: 70, txt: `Ondata ${e[1]}!`, grande: true, t: adesso }); suono([[330, 0.12], [440, 0.12], [330, 0.2]], { tipo: 'triangle', volume: 0.06 }); }
        else if (e[0] === 'f') { scritte.push({ x: ex.W / 2, y: 70, txt: `Ondata ${e[1]} respinta! 🎉`, grande: true, t: adesso }); suono([[523, 0.08], [659, 0.08], [784, 0.15]], { volume: 0.06 }); }
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      ctxD = ctx; ex = p.extra || ex;
      if (!ex) return;
      if (!sfondo) preparaSfondo();
      const adesso = ora(), st = s.s;
      g.drawImage(sfondo, 0, 0, ex.W, ex.H);
      // la casella sotto il mouse e quella scelta, col raggio della torretta
      const segna = (c, col) => { if (!c) return; g.fillStyle = col; g.fillRect(10 + c[0] * ex.CELLA + 2, c[1] * ex.CELLA + 2, ex.CELLA - 4, ex.CELLA - 4); };
      if (sopraCella && !window.Arena.touch() && mia(sopraCella[0], sopraCella[1]) && !torreIn(st, sopraCella[0], sopraCella[1])) segna(sopraCella, 'rgba(255,255,255,.18)');
      if (sel) {
        segna([sel.i, sel.j], 'rgba(255,230,120,.35)');
        const t = sel.id && st.t.find((q) => q[0] === sel.id), r = t ? t[9] : 110;
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(10 + sel.i * ex.CELLA + ex.CELLA / 2, sel.j * ex.CELLA + ex.CELLA / 2, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      torre(g, st, adesso);
      for (const t of st.t) torretta(g, t, null, adesso);
      // i mostri (interpolati), dal più indietro al più avanti
      const pr = new Map(prima ? prima.s.m.map((m) => [m[0], m]) : []);
      for (const m of st.m) { const a = pr.get(m[0]); mostro(g, a ? [m[0], m[1], a[2] + (m[2] - a[2]) * u, a[3] + (m[3] - a[3]) * u, m[4], m[5]] : m, adesso); }
      // i colpi
      colpi = colpi.filter((c) => adesso - c.t < (c.k === 'c' ? 0.45 : 0.25));
      for (const c of colpi) {
        const tt = adesso - c.t;
        if (c.k === 'l') {
          g.strokeStyle = `rgba(230,200,255,${1 - tt / 0.25})`; g.lineWidth = 2.5; g.beginPath(); g.moveTo(c.da[0], c.da[1]);
          for (const q of c.pt) { const [x0, y0] = [c.da[0], c.da[1]]; g.lineTo((x0 + q[0]) / 2 + (Math.random() - 0.5) * 14, (y0 + q[1]) / 2 + (Math.random() - 0.5) * 14); g.lineTo(q[0], q[1]); }
          g.stroke();
          continue;
        }
        const dur = c.k === 'c' ? 0.3 : 0.15, f = Math.min(1, tt / dur), x = c.da[0] + (c.a[0] - c.da[0]) * f, y = c.da[1] + (c.a[1] - c.da[1]) * f - (c.k === 'c' ? Math.sin(f * Math.PI) * 30 : 0);
        if (f < 1) {
          if (c.k === 'a') { const an = Math.atan2(c.a[1] - c.da[1], c.a[0] - c.da[0]); g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - Math.cos(an) * 8, y - Math.sin(an) * 8); g.lineTo(x, y); g.stroke(); }
          else { g.fillStyle = c.k === 'g' ? '#aee4ff' : '#222'; g.beginPath(); g.arc(x, y, c.k === 'g' ? 3 : 5, 0, Math.PI * 2); g.fill(); }
        } else if (c.k === 'c') { const k = (tt - dur) / 0.15; g.fillStyle = `rgba(255,170,40,${0.7 * (1 - k)})`; g.beginPath(); g.arc(c.a[0], c.a[1], 20 + k * 25, 0, Math.PI * 2); g.fill(); }
      }
      // i mostri sconfitti: una nuvoletta
      botti = botti.filter((b) => adesso - b.t < 0.4);
      for (const b of botti) { const k = (adesso - b.t) / 0.4; g.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; g.beginPath(); g.arc(b.x, b.y, (b.drago ? 24 : 10) + k * 14, 0, Math.PI * 2); g.fill(); }
      // le scritte
      scritte = scritte.filter((w) => adesso - w.t < (w.grande ? 2 : 0.9));
      g.textAlign = 'center';
      for (const w of scritte) {
        const tt = adesso - w.t, dur = w.grande ? 2 : 0.9;
        g.globalAlpha = Math.min(1, (dur - tt) * 3); g.font = `900 ${w.grande ? 34 : 15}px system-ui`;
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(w.txt, w.x, w.y - (w.grande ? 0 : tt * 30)); g.fillStyle = w.grande ? '#fff' : '#ffd23f'; g.fillText(w.txt, w.x, w.y - (w.grande ? 0 : tt * 30));
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
    if (nuovo && (!ex || JSON.stringify(nuovo.strade) !== JSON.stringify(ex.strade))) { sfondo = null; sel = null; }
    ctxD = ctx; ex = nuovo || ex;
    reset0.call(tavolo, ctx);
  };
  Object.assign(window.Tavoli, { difesa: tavolo });
})();
