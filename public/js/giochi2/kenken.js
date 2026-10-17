// GABBIE ARITMETICHE: la griglia con le gabbie (bordo spesso, risultato e operazione nell'angolo), le cifre e gli
// appunti. Le mosse si vedono subito (prima della risposta del server). Tastiera: frecce, cifre, N/spazio = appunti,
// Canc/0 = cancella, Ctrl+Z / Ctrl+Y = annulla / ripeti.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxG = null;

  // stato locale: le mie cifre e i miei appunti (quelli del server, più le mosse non ancora confermate)
  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { valori: p.valori.slice(), note: p.note.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  function scrivi(ctx, v, nota) {
    const p = ctx.partita, ui = ctx.ui, i = ui.sel, N = p.N;
    if (i == null || !puoi(ctx)) return;
    const L = locale(ctx);
    if (nota && v) {
      if (L.valori[i]) return;
      L.note[i] ^= 1 << v;
      R().invia(ctx, { tipo: 'nota', i, v });
    } else {
      if (L.valori[i] === v && v) return;
      if (!v && !L.valori[i] && !L.note[i]) return;
      if (!v && !L.valori[i]) { L.note[i] = 0; R().invia(ctx, { tipo: 'nota', i, v: 0 }); return ctx.ridisegna(); }
      L.valori[i] = v;
      if (!v) L.note[i] = 0;
      if (v) {
        const r = Math.floor(i / N), c = i % N;
        for (let k = 0; k < N; k++) for (const j of [r * N + k, k * N + c]) if (j !== i) L.note[j] &= ~(1 << v);
        suono([[330 + v * 40, 0.04]], { tipo: 'triangle', volume: 0.04 });
      }
      R().invia(ctx, { tipo: 'metti', i, v });
    }
    ctx.ridisegna();
  }
  function scegli(ctx, i) { ctx.ui.sel = i; ctx.ridisegna(); }

  // misura delle caselle: la griglia deve stare nello schermo (sul computer accanto ai comandi)
  function misura(N) {
    const largo = document.documentElement.clientWidth;
    const W = largo >= 900 ? Math.min(640, largo - 420) : largo - 24;
    const H = largo >= 900 ? window.innerHeight - 240 : 9999;
    return Math.max(34, Math.min(84, Math.floor((Math.min(W, H) - 8) / N)));
  }

  // doppioni sulla stessa riga o colonna, gabbie complete che non danno il risultato
  function controlli(p, valori) {
    const N = p.N, doppi = new Set(), gabbieKo = new Set();
    for (let r = 0; r < N; r++) for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
      for (const [x, y] of [[r * N + a, r * N + b], [a * N + r, b * N + r]]) if (valori[x] && valori[x] === valori[y]) { doppi.add(x); doppi.add(y); }
    }
    p.gabbie.forEach((g, k) => {
      const v = g.celle.map((i) => valori[i]);
      if (v.some((x) => !x)) return;
      let ok;
      if (g.op === '+') ok = v.reduce((a, b) => a + b, 0) === g.tot;
      else if (g.op === '×') ok = v.reduce((a, b) => a * b, 1) === g.tot;
      else if (g.op === '−') ok = Math.abs(v[0] - v[1]) === g.tot;
      else if (g.op === '÷') ok = Math.max(...v) === g.tot * Math.min(...v);
      else ok = v[0] === g.tot;
      if (!ok) gabbieKo.add(k);
    });
    return { doppi, gabbieKo };
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxG = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, N = p.N;
      const L = locale(ctx);
      const diGabbia = new Array(N * N).fill(-1);
      p.gabbie.forEach((g, k) => g.celle.forEach((i) => { diGabbia[i] = k; }));
      const { doppi, gabbieKo } = controlli(p, L.valori);
      const sel = ui.sel != null && ui.sel < N * N ? ui.sel : null;
      const valSel = sel != null ? L.valori[sel] : 0;
      const finito = p.fatto != null || p.finita;
      let celle = '';
      for (let i = 0; i < N * N; i++) {
        const r = Math.floor(i / N), c = i % N, k = diGabbia[i], g = p.gabbie[k];
        const bordo = (rr, cc) => rr < 0 || cc < 0 || rr >= N || cc >= N || diGabbia[rr * N + cc] !== k;
        const v = L.valori[i];
        const cls = ['ga-c', bordo(r - 1, c) ? 'bt' : '', bordo(r, c + 1) ? 'br' : '', bordo(r + 1, c) ? 'bb' : '', bordo(r, c - 1) ? 'bl' : '',
          sel === i ? 'scelta' : sel != null && (Math.floor(sel / N) === r || sel % N === c) ? 'zona' : '',
          sel != null && diGabbia[sel] === k && sel !== i ? 'gabbia' : '',
          v && v === valSel && sel !== i ? 'uguale' : '', doppi.has(i) ? 'doppia' : '',
          p.sbagliate && p.sbagliate[i] ? 'sbagliata' : '', p.ultimoAiuto && p.ultimoAiuto.cella === i && !finito ? 'aiutata' : '',
          gabbieKo.has(k) ? 'gabbia-ko' : ''].filter(Boolean).join(' ');
        const etichetta = g.celle[0] === i ? `<span class="ga-et">${g.tot}${g.op === '=' ? '' : g.op}</span>` : '';
        const note = !v && L.note[i] ? `<span class="ga-note n${N > 4 ? 9 : 4}">${Array.from({ length: N }, (_, x) => `<i>${L.note[i] & (1 << (x + 1)) ? x + 1 : ''}</i>`).join('')}</span>` : '';
        celle += `<div class="${cls}" data-az="cella" data-i="${i}" role="button" aria-label="Riga ${r + 1}, colonna ${c + 1}${v ? `: ${v}` : ''}">${etichetta}${v ? `<b class="ga-v">${v}</b>` : ''}${note}</div>`;
      }
      const conti = Array.from({ length: N }, (_, x) => L.valori.filter((y) => y === x + 1).length);
      const tasti = Array.from({ length: N }, (_, x) => `<button type="button" class="ga-tasto ${conti[x] >= N ? 'finito' : ''}" data-az="num" data-v="${x + 1}">${x + 1}</button>`).join('');
      const nomeLiv = { facile: 'Facile', medio: 'Media', difficile: 'Difficile' }[p.livello];
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${N}×${N} ${nomeLiv.toLowerCase()}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti ? ` <small>(${x.aiuti} aiuti)</small>` : ''}</li>`).join('')}</ol></div>` : '';
      const comandi = finito ? '' : `<div class="ga-tasti" style="--n:${N}">${tasti}<button type="button" class="ga-tasto canc" data-az="num" data-v="0" title="Cancella (Canc)">⌫</button></div>
        <div class="ga-comandi">
          <button type="button" class="bottone ${ui.appunti ? 'attivo-bt' : ''}" data-az="appunti" aria-pressed="${!!ui.appunti}" title="Tasto N o barra spaziatrice">✏️ Appunti ${ui.appunti ? 'sì' : 'no'}</button>
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="ripeti" ${p.puoRipetere ? '' : 'disabled'} title="Ctrl+Y">↷ Ripeti</button>
          <button type="button" class="bottone" data-az="aiuto" title="Scrive una cifra giusta: +30 secondi">💡 Aiuto${p.aiuti ? ` <small>(${p.aiuti})</small>` : ''}</button>
          <button type="button" class="bottone" data-az="ricomincia" title="Svuota la griglia (si può annullare)">↺ Svuota</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}
        </div>
        <p class="ga-guida">Frecce per spostarti · cifre per scrivere · <b>N</b> appunti · <b>Canc</b> cancella · <b>Ctrl+Z</b> annulla</p>`;
      const extra = `<span>${N}×${N} · ${esc(nomeLiv)}</span>${p.sbagliate && p.mostraErrori ? `<span>Sbagliate <b>${p.sbagliate.filter(Boolean).length}</b></span>` : ''}`;
      return `<div class="ga ${finito ? 'finito' : ''}" style="--c:${misura(N)}px;--n:${N}">
        <div class="ga-sx">${R().barra(ctx, extra)}<div class="ga-griglia ${finito ? 'completa' : ''} ${ui.appunti ? 'in-appunti' : ''}">${celle}</div></div>
        <div class="ga-dx">${R().attesa(ctx)}${comandi}${R().arrivo(ctx)}${rec}</div></div>`;
    },
    dopo(ctx) {
      ctxG = ctx; R().attiva(ctx);
      const p = ctx.partita;
      if (p.fatto != null && primaVolta(ctx.ui, 'ga-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi finisce prima?' : 'Riempi le gabbie'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto); },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui;
      if (az === 'cella') return scegli(ctx, Number(el.dataset.i));
      if (az === 'num') return scrivi(ctx, Number(el.dataset.v), !!ui.appunti);
      if (az === 'appunti') { ui.appunti = !ui.appunti; return ctx.ridisegna(); }
      if (['annulla', 'ripeti', 'aiuto', 'ricomincia', 'arrenditi'].includes(az)) {
        if (az === 'arrenditi' && !confirm('Vuoi ritirarti dalla sfida?')) return;
        if (az === 'ricomincia' && !confirm('Svuotare tutta la griglia? (puoi annullare)')) return;
        R().invia(ctx, { tipo: az });
      }
    },
  };

  setTimeout(() => window.Rompicapo.tastiera('kenken', () => ctxG, (e, ctx) => {
    const p = ctx.partita, N = p.N, ui = ctx.ui;
    const ctrl = e.ctrlKey;
    if (ctrl && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); return R().invia(ctx, { tipo: e.shiftKey ? 'ripeti' : 'annulla' }); }
    if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); return R().invia(ctx, { tipo: 'ripeti' }); }
    if (ctrl) return;
    const i = ui.sel ?? 0;
    const muovi = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] }[e.key];
    if (muovi && (e.key.startsWith('Arrow') || ui.sel != null)) {
      e.preventDefault();
      if (ui.sel == null) return scegli(ctx, 0);
      const r = Math.max(0, Math.min(N - 1, Math.floor(i / N) + muovi[0])), c = Math.max(0, Math.min(N - 1, (i % N) + muovi[1]));
      return scegli(ctx, r * N + c);
    }
    const cifra = /^Digit[1-9]$|^Numpad[1-9]$/.test(e.code) ? Number(e.code.slice(-1)) : /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if (cifra && cifra <= N) { e.preventDefault(); if (ui.sel == null) ui.sel = 0; return scrivi(ctx, cifra, !!ui.appunti || e.shiftKey); }
    if (['0', 'Backspace', 'Delete'].includes(e.key)) { e.preventDefault(); return scrivi(ctx, 0, false); }
    if (e.key === 'n' || e.key === 'N' || e.key === ' ') { e.preventDefault(); ui.appunti = !ui.appunti; return ctx.ridisegna(); }
  }), 0);

  Object.assign(window.Tavoli, { kenken: tavolo });
})();
