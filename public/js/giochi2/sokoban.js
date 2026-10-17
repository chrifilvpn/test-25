// SPINGI LE CASSE: il magazzino visto dall'alto. Pavimento a piastrelle, muri di mattoni, mete segnate, casse di legno
// (verdi quando sono sulla meta), il magazziniere. Ogni passo si vede subito (prima della risposta del server) e scivola
// dalla casella di prima. Frecce/WASD, clic su una casella per andarci, tasti a schermo e strisciate sul telefono.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  const DIR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  let ctxS = null;

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx) || ui.loc.numero !== p.numero) ui.loc = { numero: p.numero, casse: p.casse.slice(), io: p.io, mosse: p.mosse, spinte: p.spinte, storia: [] };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };

  // un passo nella copia locale (stesse regole del server); restituisce cosa si è mosso
  function passoLocale(p, L, dir) {
    const [dx, dy] = DIR[dir], s = dx + dy * p.W, avanti = L.io + s;
    if (p.muri[avanti]) return null;
    const k = L.casse.indexOf(avanti);
    if (k >= 0) {
      const oltre = avanti + s;
      if (p.muri[oltre] || L.casse.includes(oltre)) return null;
      L.casse[k] = oltre; L.spinte++;
    }
    L.io = avanti; L.mosse++;
    return { dir, cassa: k };
  }
  function passo(ctx, dir) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, L = locale(ctx);
    const r = passoLocale(p, L, dir);
    if (!r) { suono([[120, 0.05]], { tipo: 'square', volume: 0.025 }); return; }
    ctx.ui.mosso = { ...r, t: performance.now() };
    if (r.cassa >= 0) {
      const sulla = p.mete[L.casse[r.cassa]];
      suono(sulla ? [[660, 0.05], [880, 0.08]] : [[220, 0.05]], { tipo: sulla ? 'sine' : 'triangle', volume: 0.05 });
    }
    R().invia(ctx, { tipo: 'passo', dir });
    ctx.ridisegna();
  }
  // andare fino a una casella con il percorso più corto (senza spingere)
  function vai(ctx, dest) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, L = locale(ctx);
    if (p.muri[dest] || L.casse.includes(dest) || dest === L.io) return;
    const prec = new Map([[L.io, null]]), coda = [L.io];
    for (let q = 0; q < coda.length && !prec.has(dest); q++) {
      const i = coda[q];
      for (const d of Object.keys(DIR)) { const j = i + DIR[d][0] + DIR[d][1] * p.W; if (!p.muri[j] && !L.casse.includes(j) && !prec.has(j)) { prec.set(j, [i, d]); coda.push(j); } }
    }
    if (!prec.has(dest)) { ctx.avviso('Lì non si arriva senza spingere casse', 1400); return; }
    const strada = [];
    for (let i = dest; prec.get(i); i = prec.get(i)[0]) strada.push(prec.get(i)[1]);
    for (const d of strada.reverse()) passoLocale(p, L, d);
    ctx.ui.mosso = null;
    R().invia(ctx, { tipo: 'vai', i: dest });
    ctx.ridisegna();
  }

  function misura(p) {
    const largo = document.documentElement.clientWidth;
    const W = largo >= 900 ? Math.min(760, largo - 380) : largo - 20;
    const H = largo >= 900 ? window.innerHeight - 230 : window.innerHeight - 360;
    return Math.max(22, Math.min(60, Math.floor(Math.min(W / p.W, Math.max(220, H) / p.H))));
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxS = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx);
      const c = misura(p), finito = p.fatto != null || p.finita;
      let terra = '';
      for (let i = 0; i < p.W * p.H; i++) {
        if (p.muri[i]) {
          // muro solo se confina con il pavimento (il resto è fuori dal magazzino)
          const x = i % p.W, y = (i - x) / p.W;
          const vicino = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < p.W && ny < p.H && !p.muri[ny * p.W + nx]; });
          terra += `<i class="skb-c ${vicino ? 'skb-muro' : 'skb-fuori'}"></i>`;
        } else terra += `<i class="skb-c skb-pav ${p.mete[i] ? 'skb-meta' : ''}" data-az="cella" data-i="${i}"></i>`;
      }
      const pos = (i) => `--x:${i % p.W};--y:${Math.floor(i / p.W)}`;
      const m = ui.mosso && performance.now() - ui.mosso.t < 200 ? ui.mosso : null;
      const scivola = (k) => (m && (k === 'io' || k === m.cassa) ? ` skb-scivola" style="--dx:${DIR[m.dir][0]};--dy:${DIR[m.dir][1]};` : '" style="');
      const casse = L.casse.map((i, k) => `<b class="skb-cassa ${p.mete[i] ? 'a-posto' : ''}${scivola(k)}${pos(i)}"></b>`).join('');
      const io = `<b class="skb-io ${m ? `verso-${m.dir}` : ''}${scivola('io')}${pos(L.io)}"><span>👷</span></b>`;
      const aPosto = L.casse.filter((i) => p.mete[i]).length;
      const extra = `<span>Livello <b>${p.numero}</b> <small>(${esc(p.gruppo)})</small></span><span>Passi <b>${L.mosse}</b></span><span>Spinte <b>${L.spinte}</b> <small>(min ${p.minimo})</small></span><span>📦 <b>${aPosto}/${L.casse.length}</b></span>`;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · livello ${p.numero}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.spinte} spinte)</small></li>`).join('')}</ol></div>` : '';
      const comandi = finito ? '' : `<div class="skb-frecce">
          <button type="button" class="skb-f su" data-az="dir" data-d="u" aria-label="Su">▲</button>
          <button type="button" class="skb-f sx" data-az="dir" data-d="l" aria-label="Sinistra">◀</button>
          <button type="button" class="skb-f giu" data-az="dir" data-d="d" aria-label="Giù">▼</button>
          <button type="button" class="skb-f dx" data-az="dir" data-d="r" aria-label="Destra">▶</button></div>
        <div class="skb-comandi">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare || L.mosse ? '' : 'disabled'} title="Ctrl+Z o U">↶ Annulla</button>
          <button type="button" class="bottone" data-az="ricomincia" title="R">↺ Ricomincia</button>
          <button type="button" class="bottone" data-az="aiuto" title="La prossima spinta giusta: +20 secondi">💡 Aiuto${p.aiuti ? ` <small>(${p.aiuti})</small>` : ''}</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
        <p class="skb-guida">Frecce o WASD per camminare · clic su una casella per andarci · <b>U</b>/<b>Ctrl+Z</b> annulla · <b>R</b> ricomincia</p>`;
      return `<div class="skb ${finito ? 'finito' : ''}">
        <div class="skb-sx">${R().barra(ctx, extra)}
          <div class="skb-mag" style="--c:${c}px;--w:${p.W};--h:${p.H}" data-skb>${terra}${casse}${io}</div></div>
        <div class="skb-dx">${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => ` · ${p.altriMosse[i]} spinte`)}${rec}</div></div>`;
    },
    dopo(ctx) {
      ctxS = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, `skb-fatto-${ctx.partita.numero}`)) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi finisce prima?' : 'Porta le casse sulle mete'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto, `${ctx.partita.altri[posto].prog}% a posto`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'dir') return passo(ctx, el.dataset.d);
      if (az === 'cella') return vai(ctx, Number(el.dataset.i));
      if (az === 'annulla') { ctx.ui.mosso = null; return R().invia(ctx, { tipo: 'annulla' }); }
      if (az === 'ricomincia') { if (!confirm('Ricominciare il livello?')) return; ctx.ui.mosso = null; return R().invia(ctx, { tipo: 'ricomincia' }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // strisciate sul magazzino (telefono)
  let dito = null;
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && e.target.closest && e.target.closest('[data-skb]')) dito = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  document.addEventListener('pointermove', (e) => {
    if (!dito || e.pointerId !== dito.id || !ctxS) return;
    const dx = e.clientX - dito.x, dy = e.clientY - dito.y, soglia = 28;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < soglia) return;
    passo(ctxS, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'));
    dito.x = e.clientX; dito.y = e.clientY;
  });
  document.addEventListener('pointerup', () => { dito = null; });

  setTimeout(() => window.Rompicapo.tastiera('sokoban', () => ctxS, (e, ctx) => {
    if ((e.ctrlKey && (e.key === 'z' || e.key === 'Z')) || (!e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'Backspace'))) { e.preventDefault(); ctx.ui.mosso = null; return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey) return;
    const d = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' }[e.key];
    if (d) { e.preventDefault(); return passo(ctx, d); }
    if ((e.key === 'r' || e.key === 'R') && puoi(ctx) && confirm('Ricominciare il livello?')) { ctx.ui.mosso = null; R().invia(ctx, { tipo: 'ricomincia' }); }
  }), 0);

  Object.assign(window.Tavoli, { sokoban: tavolo });
})();
