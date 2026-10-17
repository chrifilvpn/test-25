// GARA DI BATTITURA: in alto le corsie (strisce di carta su cui ogni penna traccia la sua riga di inchiostro, con le
// parole al minuto), sotto il testo da scrivere, con le lettere fatte in verde, la lettera da scrivere sottolineata e
// gli errori in rosso, e la casella dove si scrive. Ogni tasto si controlla subito nel browser; al server va solo
// quante lettere giuste e quanti errori.
(() => {
  const { COLORI } = window.Arena;
  const { esc, suono } = window.Nuovi;
  let ctxB = null, sfondo = null, chiave = '';

  const norm = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
  const uguali = (a, b) => a === b || norm(a) === norm(b);
  const stato = () => ctxB && ctxB.partita && ctxB.partita.stato;
  const inGara = () => {
    const p = ctxB && ctxB.partita, s = stato();
    return !!(p && p.gioco === 'battitura' && !p.finita && s && s.fase === 'gioco' && !s.pausa && p.extra && s.s && s.s.fr === p.extra.round && s.s.g[ctxB.mio][2] < 0);
  };
  // il mio stato di scrittura per il round (si azzera quando cambia il testo)
  function mio() {
    const ui = ctxB.ui, ex = ctxB.partita.extra;
    if (!ex) return null;
    if (ui.btTesto !== ex.testo) { ui.btTesto = ex.testo; ui.k = 0; ui.e = 0; ui.sbagliate = ''; ui.inizio = null; ui.ultimoInvio = 0; }
    return ui;
  }
  let attesa = null;
  function manda(subito = false) {
    const ui = ctxB.ui;
    const via = () => { attesa = null; ui.ultimoInvio = performance.now(); ctxB.emetti('input', { k: ui.k, e: ui.e }); };
    if (subito || performance.now() - (ui.ultimoInvio || 0) > 80) { clearTimeout(attesa); via(); }
    else if (!attesa) attesa = setTimeout(via, 80);
  }

  // la casella: contiene solo le lettere sbagliate ancora da cancellare (così ⌫ funziona anche sul telefono)
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || el.dataset.bt === undefined || !ctxB) return;
    const ui = mio(); if (!ui) return;
    if (!inGara()) { el.value = ui.sbagliate || ''; return; }
    const testo = ctxB.partita.extra.testo, v = el.value;
    if (v.length < ui.sbagliate.length || !v.startsWith(ui.sbagliate)) ui.sbagliate = v.slice(0, Math.min(v.length, ui.sbagliate.length));
    const nuove = v.slice(ui.sbagliate.length);
    for (const ch of nuove) {
      if (!ui.sbagliate && ui.k < testo.length && uguali(ch, testo[ui.k])) ui.k++;
      else if (ui.sbagliate.length < 10) { ui.sbagliate += ch; ui.e++; suono([[160, 0.04]], { tipo: 'square', volume: 0.025 }); }
    }
    el.value = ui.sbagliate;
    if (ui.inizio === null) ui.inizio = performance.now();
    aggiornaTesto();
    manda(ui.k >= testo.length);
  });
  // sul computer si scrive senza cliccare: il primo tasto porta il cursore nella casella
  document.addEventListener('keydown', (e) => {
    if (!inGara() || e.ctrlKey || e.metaKey || e.altKey || (window.Boss && Boss.attivo)) return;
    const el = document.querySelector('[data-bt]');
    if (!el || document.activeElement === el || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (e.key.length === 1 || e.key === 'Backspace') el.focus();
  });

  // il testo con i colori (si aggiorna da solo, senza ridisegnare la pagina)
  function htmlTesto() {
    const p = ctxB.partita, ex = p.extra, ui = mio();
    if (!ex || !ui) return '';
    const t = ex.testo, k = ui.k, sb = ui.sbagliate.length;
    const fatto = esc(t.slice(0, k));
    const rosso = esc(t.slice(k, k + sb));
    const cur = t[k + sb] !== undefined ? esc(t[k + sb]) : '';
    // la parola su cui si sta scrivendo un po' evidenziata
    let fineParola = t.indexOf(' ', k + sb); if (fineParola < 0) fineParola = t.length;
    const parola = esc(t.slice(k + sb + 1, fineParola)), resto = esc(t.slice(fineParola));
    return `<span class="bt-fatto">${fatto}</span><span class="bt-errore">${rosso}</span><span class="bt-ora">${cur === ' ' ? '&nbsp;' : cur}</span><span class="bt-parola">${parola}</span>${resto}`;
  }
  function aggiornaTesto() {
    const el = document.querySelector('.bt-testo');
    if (el) el.innerHTML = htmlTesto();
    const ui = mio(), info = document.querySelector('.bt-mio');
    if (info && ui) {
      const sec = ui.inizio ? (performance.now() - ui.inizio) / 1000 : 0;
      const v = sec > 1 ? Math.round((ui.k / 5) / (sec / 60)) : 0;
      const prec = ui.k + ui.e ? Math.round((100 * ui.k) / (ui.k + ui.e)) : 100;
      info.innerHTML = `<b>${v}</b> parole al minuto · precisione <b>${prec}%</b> · ${ui.k} di ${ctxB.partita.extra.testo.length}`;
    }
    const box = document.querySelector('.bt-casella');
    if (box) box.classList.toggle('sbaglio', !!(ui && ui.sbagliate));
  }

  function box(ctx) {
    const p = ctx.partita, ex = p.extra;
    if (!ex) return '';
    return `<div class="bt">
      <div class="bt-fonte">✒️ ${ex.fonti.map(esc).join(' · ')}</div>
      <div class="bt-testo" aria-label="Il testo da scrivere">${htmlTesto()}</div>
      <div class="bt-sotto"><input class="bt-casella" data-bt autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"
        placeholder="Scrivi qui…" aria-label="Scrivi il testo"><span class="bt-mio"></span></div>
    </div>`;
  }

  function preparaSfondo(W, H, n) {
    const c = document.createElement('canvas'), k = 2; c.width = W * k; c.height = H * k;
    const g = c.getContext('2d'); g.scale(k, k);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5b3b24'); gr.addColorStop(1, '#3f2816');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 7) { g.fillStyle = `rgba(0,0,0,${0.04 + (y % 21) / 400})`; g.fillRect(0, y, W, 2); }
    for (let i = 0; i < n; i++) {
      const y = 50 + i * 46;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(163, y + 4, W - 190, 34);
      g.fillStyle = '#f6efdc'; g.fillRect(160, y, W - 190, 34);
      g.strokeStyle = 'rgba(70,110,170,.25)'; g.lineWidth = 1;
      for (let x = 160; x < W - 30; x += 20) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); }
    }
    // traguardo a scacchi
    for (let y = 44; y < H - 10; y += 8) for (let q = 0; q < 2; q++) { g.fillStyle = (y / 8 + q) % 2 ? '#111' : '#fff'; g.fillRect(W - 34 + q * 6, y, 6, 8); }
    g.font = '600 13px system-ui, sans-serif'; g.fillStyle = 'rgba(255,240,220,.75)'; g.textAlign = 'left'; g.fillText('PARTENZA', 160, 32); g.textAlign = 'right'; g.fillText('ARRIVO', W - 40, 32);
    return c;
  }
  function penna(g, x, y, col) {
    g.save(); g.translate(x, y); g.rotate(-0.6);
    g.fillStyle = col; g.fillRect(-4, -34, 8, 26);
    g.fillStyle = '#d8c18a'; g.beginPath(); g.moveTo(-4, -8); g.lineTo(4, -8); g.lineTo(0, 2); g.closePath(); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(0, 0, 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-3, -33, 2, 24);
    g.restore();
  }

  const tavolo = window.Arena.tavolo({
    id: 'battitura',
    mouse: null,
    comandi: 'nessuno',
    clicAzione: false,
    obiettivo: 'punti',
    istruzioni: () => 'Scrivi il testo così com\'è: se sbagli una lettera devi cancellarla prima di andare avanti. Le lettere accentate valgono anche senza accento.',
    sottotitolo: (p) => (p.extra ? `testo ${p.extra.round}` : ''),
    statoGioco: (ctx, s) => {
      const io = s.s && s.s.g && s.s.g[ctx.mio];
      if (io && io[2] >= 0) return `Arrivato ${io[3]}°: ${io[4]} parole al minuto`;
      return s.s && s.s.chiude >= 0 ? `Si chiude tra ${s.s.chiude} s` : 'Scrivi!';
    },
    hud: () => '',
    fineRound: (p, s, ctx) => {
      const io = s.s && s.s.g && s.s.g[ctx.mio];
      return io ? (io[2] >= 0 ? `${io[3]}° · ${io[4]} parole al minuto` : `non arrivato · ${io[4]} parole al minuto`) : '';
    },
    dopoTick(ctx, d) {
      if (!d.s || !d.s.g) return;
      const ui = ctx.ui;
      // al via: il cursore nella casella
      if (d.fase === 'gioco' && ui._btFase !== 'gioco') {
        const el = document.querySelector('[data-bt]');
        if (el && !(window.Boss && Boss.attivo)) el.focus({ preventScroll: true });
        suono([[660, 0.08], [990, 0.12]], { volume: 0.05 });
      }
      if (d.fase !== ui._btFase) { ui._btFase = d.fase; aggiornaTesto(); }
      const io = d.s.g[ctx.mio];
      if (io && io[2] >= 0 && !ui._btArrivato) { ui._btArrivato = d.s.fr; suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.18]], { volume: 0.06 }); }
      if (ui._btArrivato && ui._btArrivato !== d.s.fr) ui._btArrivato = 0;
    },
    disegna(g, p, s, prima, u, ctx) {
      if (!s.s || !s.s.g) return;
      const W = p.W, H = p.H, st = s.s;
      const k2 = `${W}x${H}`;
      if (k2 !== chiave) { sfondo = preparaSfondo(W, H, p.n); chiave = k2; }
      g.drawImage(sfondo, 0, 0, W, H);
      const p0 = prima && prima.s && prima.s.g && prima.s.fr === st.fr ? prima.s : null;
      // sul telefono il campo è piccolo: le scritte crescono perché restino leggibili
      const scala = g.getTransform().a / (window.devicePixelRatio || 1), fs = (px) => Math.max(px, 11 / scala);
      st.g.forEach((x, i) => {
        const y = 50 + i * 46;
        // per me la penna segue quello che sto scrivendo (senza aspettare il server)
        let k = p0 ? p0.g[i][0] + (x[0] - p0.g[i][0]) * u : x[0];
        if (i === ctx.mio && ctx.ui.btTesto && p.extra && st.fr === p.extra.round) k = Math.max(k, ctx.ui.k || 0);
        const f = st.nT ? Math.min(1, k / st.nT) : 0;
        const x1 = 160 + f * (W - 200);
        const col = COLORI[i % COLORI.length];
        g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(166, y + 17);
        for (let xx = 166; xx < x1; xx += 9) g.lineTo(xx, y + 17 + Math.sin(xx / 7 + i) * 3);
        g.lineTo(x1, y + 17); g.stroke();
        penna(g, x1, y + 17, col);
        g.font = `${i === ctx.mio ? 700 : 600} ${fs(15)}px system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = i === ctx.mio ? '#fff3c4' : 'rgba(255,240,220,.9)';
        const nome = i === ctx.mio ? 'Tu' : ctx.nome(i);
        const max = scala > 0.6 ? 14 : 7;
        g.fillText(nome.length > max ? `${nome.slice(0, max - 1)}…` : nome, 14, scala > 0.6 ? y + 12 : y + 17);
        if (scala > 0.6) { g.font = '500 12px system-ui, sans-serif'; g.fillStyle = 'rgba(255,240,220,.7)'; g.fillText(`${x[4]} parole/min`, 14, y + 28); }
        else { g.font = `600 ${fs(12)}px system-ui, sans-serif`; g.textAlign = 'right'; g.fillStyle = '#5a4a2e'; g.fillText(`${x[4]}`, W - 44, y + 17); }
        if (x[2] >= 0) {
          g.font = '20px system-ui, sans-serif'; g.textAlign = 'center';
          g.fillText(['🥇', '🥈', '🥉'][x[3] - 1] || `${x[3]}°`, W - 62, y + 18);
        }
      });
    },
  });
  // il testo e la casella sotto le corsie (la casella sopravvive ai ridisegni: il suo contenuto è in ctx.ui)
  const pannoArena = tavolo.panno, resetArena = tavolo.reset, dopoArena = tavolo.dopo;
  tavolo.reset = (ctx) => { ctxB = ctx; resetArena.call(tavolo, ctx); };
  tavolo.panno = (ctx) => pannoArena.call(tavolo, ctx).replace('<p class="piccolo ar-istr">', `${box(ctx)}<p class="piccolo ar-istr">`);
  tavolo.dopo = (ctx) => {
    dopoArena.call(tavolo, ctx);
    const el = document.querySelector('[data-bt]'), ui = mio();
    if (el && ui) { el.value = ui.sbagliate || ''; if (inGara() && !(window.Boss && Boss.attivo)) el.focus({ preventScroll: true }); }
    aggiornaTesto();
  };
  tavolo.punteggio = (ctx) => {
    const p = ctx.partita;
    return p.punti.map((x, i) => `<span style="color:${COLORI[i % COLORI.length]}">${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
  };
  // le parole al minuto anche quando si sta fermi; e si rimanda la posizione (se il server ne aveva tenuta una più bassa)
  setInterval(() => { if (inGara()) { aggiornaTesto(); if (mio() && ctxB.ui.k) manda(); } }, 500);
  Object.assign(window.Tavoli, { battitura: tavolo });
})();
