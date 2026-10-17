// TORRE DI HANOI: tre pioli di legno su una base, dischi colorati (dal rosso del più grande al viola del più piccolo).
// Si clicca il piolo da cui prendere (il disco in cima si solleva) e poi quello dove posarlo, oppure si trascina il
// disco. Le mosse si vedono subito, prima della risposta del server.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxH = null, trascina = null, fineTrascina = 0;

  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { pos: p.pos.slice(), mosse: p.mosse };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  const cima = (pos, n, piolo) => { for (let d = 1; d <= n; d++) if (pos[d] === piolo) return d; return 0; };
  const colore = (d, n) => `hsl(${Math.round(((n - d) / Math.max(1, n - 1)) * 270)}, 72%, 52%)`;

  function sposta(ctx, da, a) {
    const p = ctx.partita, L = locale(ctx), n = p.dischi;
    ctx.ui.sel = null;
    if (da === a) return ctx.ridisegna();
    const d = cima(L.pos, n, da), s = cima(L.pos, n, a);
    if (!d) return ctx.ridisegna();
    if (s && s < d) { ctx.avviso('Non si può mettere un disco sopra uno più piccolo', 1600); suono([[150, 0.12]], { tipo: 'square', volume: 0.04 }); return ctx.ridisegna(); }
    L.pos[d] = a; L.mosse++;
    suono([[300 + (n - d) * 60, 0.06]], { tipo: 'triangle', volume: 0.05 });
    R().invia(ctx, { tipo: 'sposta', da, a });
    ctx.ridisegna();
  }
  function tocca(ctx, piolo) {
    if (!puoi(ctx)) return;
    const ui = ctx.ui, L = locale(ctx);
    if (ui.sel == null) { if (cima(L.pos, ctx.partita.dischi, piolo)) { ui.sel = piolo; ctx.ridisegna(); } return; }
    sposta(ctx, ui.sel, piolo);
  }

  function pila(ctx, piolo, L) {
    const p = ctx.partita, n = p.dischi, ui = ctx.ui;
    const dischi = [];
    for (let d = n; d >= 1; d--) if (L.pos[d] === piolo) dischi.push(d);
    const su = ui.sel === piolo || (trascina && trascina.da === piolo);
    return dischi.map((d, k) => {
      const alto = su && k === dischi.length - 1;
      const largo = 30 + (70 * d) / n;
      return `<i class="hn-disco ${alto ? 'su' : ''} ${trascina && trascina.d === d ? 'via' : ''}" style="--w:${largo}%;--col:${colore(d, n)};--k:${k}">${n <= 6 ? `<b>${d}</b>` : ''}</i>`;
    }).join('');
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxH = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx), n = p.dischi;
      const finito = p.fatto != null || p.finita;
      const pioli = [0, 1, 2].map((k) => `<div class="hn-piolo ${ui.sel === k ? 'scelto' : ''} ${k === 2 ? 'meta' : ''}" data-az="piolo" data-k="${k}" role="button" aria-label="Piolo ${k + 1}">
          <span class="hn-asta"></span><div class="hn-pila">${pila(ctx, k, L)}</div><em>${k + 1}</em></div>`).join('');
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${n} dischi</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)} <small>(${x.mosse} mosse)</small></li>`).join('')}</ol></div>` : '';
      const extra = `<span>Mosse <b>${L.mosse}</b> <small>(minimo ${p.minimo})</small></span>${!finito && L.mosse ? `<span>Ne mancano almeno <b>${p.mancano}</b></span>` : ''}`;
      const comandi = finito ? '' : `<div class="hn-comandi">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="ricomincia">↺ Da capo</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
          <p class="hn-guida">Clicca un piolo e poi un altro, o trascina il disco · tasti <b>1 2 3</b> · <b>Ctrl+Z</b> annulla</p>`;
      return `<div class="hn ${finito ? 'finito' : ''}" style="--n:${n}">
        ${R().barra(ctx, extra)}
        <div class="hn-tavola">${pioli}<div class="hn-base"></div></div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx, (i) => ` · ${p.mosseAltri[i]} ${p.mosseAltri[i] === 1 ? 'mossa' : 'mosse'}`)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxH = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'hn-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi finisce prima?' : 'Porta la torre sul terzo piolo'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${x.prog}%`}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { const m = ctx.partita.mosseAltri[posto]; return R().infoPosto(ctx, posto, `${m} ${m === 1 ? 'mossa' : 'mosse'}`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'piolo') { if (performance.now() - fineTrascina < 350) return; return tocca(ctx, Number(el.dataset.k)); } // il clic che segue un trascinamento non conta
      if (az === 'annulla') { ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
      if (az === 'ricomincia') { if (!confirm('Ricominciare da capo? (le mosse tornano a zero)')) return; ctx.ui.sel = null; return R().invia(ctx, { tipo: 'ricomincia' }); }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  // trascinare il disco in cima a un piolo (mouse e dito)
  let fantasma = null;
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxH;
    const el = e.target.closest && e.target.closest('.hn-piolo');
    if (!el || !ctx || !ctx.partita || ctx.partita.gioco !== 'hanoi' || !puoi(ctx) || e.button > 0) return;
    const k = Number(el.dataset.k), L = locale(ctx), d = cima(L.pos, ctx.partita.dischi, k);
    if (!d) return;
    trascina = { da: k, d, x: e.clientX, y: e.clientY, mosso: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!trascina) return;
    if (!trascina.mosso && Math.hypot(e.clientX - trascina.x, e.clientY - trascina.y) < 8) return;
    if (!trascina.mosso) {
      trascina.mosso = true; ctxH.ui.sel = null;
      const orig = document.querySelectorAll('.hn-piolo')[trascina.da].querySelector('.hn-disco:last-child');
      if (orig) {
        const r = orig.getBoundingClientRect();
        fantasma = orig.cloneNode(true); fantasma.classList.add('hn-fantasma');
        Object.assign(fantasma.style, { width: `${r.width}px`, height: `${r.height}px` });
        document.body.appendChild(fantasma);
        orig.style.visibility = 'hidden';
      }
    }
    if (fantasma) { fantasma.style.left = `${e.clientX}px`; fantasma.style.top = `${e.clientY}px`; }
    for (const p of document.querySelectorAll('.hn-piolo')) { const r = p.getBoundingClientRect(); p.classList.toggle('sopra', e.clientX >= r.left && e.clientX <= r.right); }
  });
  const lascia = (e) => {
    const t = trascina; trascina = null;
    if (fantasma) { fantasma.remove(); fantasma = null; }
    for (const p of document.querySelectorAll('.hn-piolo')) p.classList.remove('sopra');
    if (!t || !t.mosso) return;
    fineTrascina = performance.now();
    const pioli = [...document.querySelectorAll('.hn-piolo')];
    const dove = pioli.findIndex((p) => { const r = p.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; });
    if (dove >= 0) sposta(ctxH, t.da, dove); else ctxH.ridisegna();
  };
  document.addEventListener('pointerup', lascia);
  document.addEventListener('pointercancel', () => { trascina = null; if (fantasma) { fantasma.remove(); fantasma = null; } if (ctxH) ctxH.ridisegna(); });

  setTimeout(() => window.Rompicapo.tastiera('hanoi', () => ctxH, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey) return;
    const k = { 1: 0, 2: 1, 3: 2, q: 0, w: 1, e: 2, Q: 0, W: 1, E: 2 }[e.key];
    if (k !== undefined) { e.preventDefault(); tocca(ctx, k); }
    if (e.key === 'Escape') { ctx.ui.sel = null; ctx.ridisegna(); }
  }), 0);

  Object.assign(window.Tavoli, { hanoi: tavolo });
})();
