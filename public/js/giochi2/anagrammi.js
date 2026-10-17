// ANAGRAMMI A SQUADRE: il tavolo nel browser. In alto le due squadre col punteggio e l'orologio, al centro le
// carte con le lettere mescolate (si accendono quelle che hanno le lettere che stai scrivendo), sotto la casella
// dove si scrive. Le parole trovate dai compagni si girano da sole; dell'altra squadra si vede solo il segno.
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  let ctxA = null;
  const ICONA = ['☀️', '🌙'];

  const gioca = (ctx) => { const p = ctx && ctx.partita; return !!(p && p.gioco === 'anagrammi' && !p.finita && p.fase === 'gioco'); };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  // le lettere scritte stanno tutte tra quelle della carta?
  function contiene(lettere, scritto) {
    const resto = lettere.split('');
    for (const c of scritto) { const k = resto.indexOf(c); if (k < 0) return false; resto.splice(k, 1); }
    return true;
  }

  document.addEventListener('input', (e) => {
    const ctx = ctxA, el = e.target;
    if (!ctx || !el.dataset || el.dataset.ana === undefined) return;
    ctx.ui.scritto = el.value;
    ctx.ui.cursore = el.selectionStart;
    illumina(ctx);
  });
  document.addEventListener('focusin', (e) => { if (ctxA && e.target.dataset && e.target.dataset.ana !== undefined) ctxA.ui.fuoco = true; });
  document.addEventListener('focusout', (e) => { if (ctxA && e.target.dataset && e.target.dataset.ana !== undefined) setTimeout(() => { const a = document.activeElement; if (!a || !a.dataset || a.dataset.ana === undefined) ctxA.ui.fuoco = false; }, 0); });
  document.addEventListener('keydown', (e) => {
    const ctx = ctxA;
    if (!ctx || !ctx.partita || ctx.partita.gioco !== 'anagrammi' || !document.querySelector('.agr')) return;
    const el = e.target;
    if (el.dataset && el.dataset.ana !== undefined) {
      if (e.key === 'Enter') { e.preventDefault(); prova(ctx); }
      if (e.key === 'Escape') { el.value = ''; ctx.ui.scritto = ''; illumina(ctx); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || (el.closest && el.closest('input, textarea, select')) || (window.Boss && Boss.attivo)) return;
    const p = ctx.partita;
    if (p.fase === 'fine') {
      if (e.key === 'Enter' && !p.finita && !p.pronto[ctx.mio] && !el.closest('button')) { e.preventDefault(); ctx.invia({ tipo: 'pronto' }); }
      return;
    }
    // si scrive anche senza aver cliccato nella casella: la prima lettera ci porta il cursore
    if (gioca(ctx) && /^[a-zA-Zàèéìòù]$/.test(e.key)) {
      const c = document.querySelector('[data-ana]');
      if (c) { c.focus(); }
    }
  });

  // le carte che hanno le lettere scritte finora si accendono (senza ridisegnare tutto)
  function illumina(ctx) {
    const s = norm(ctx.ui.scritto);
    document.querySelectorAll('.agr-carta[data-lettere]').forEach((c) => {
      const ok = !!s && !c.classList.contains('trovata') && contiene(c.dataset.lettere, s);
      c.classList.toggle('accesa', ok);
      c.classList.toggle('esatta', ok && s.length === c.dataset.lettere.length);
    });
  }

  function prova(ctx) {
    if (!gioca(ctx)) return;
    const w = norm(ctx.ui.scritto);
    if (!w) return;
    const p = ctx.partita;
    if (w.length < 5) return ctx.avviso('Le parole hanno almeno 5 lettere', 1300);
    if (!p.parole.some((x) => !x.trovata && x.lettere.length === w.length && contiene(x.lettere, w))) return ctx.avviso(`${w.toUpperCase()} non usa le lettere di nessuna parola ancora da trovare`, 1600);
    ctx.ui.scritto = '';
    ctx.invia({ tipo: 'prova', parola: w });
    ctx.ridisegna();
  }

  function orologio(p) {
    const s = Math.ceil(p.resta / 1000);
    return `<div class="agr-tempo ${p.resta < 20000 ? 'poco' : ''}" data-fine="${Date.now() + p.resta}"><b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b><i style="--da:${(p.resta / p.durata).toFixed(3)};--d:${p.resta}ms"></i></div>`;
  }
  function squadra(ctx, s) {
    const p = ctx.partita;
    const membri = p.sq.map((x, i) => (x === s ? i : -1)).filter((i) => i >= 0);
    return `<div class="agr-sq agr-s${s} ${s === p.mia ? 'agr-mia' : ''}"><span class="agr-ic">${ICONA[s]}</span>
      <div><b>${esc(p.squadre[s])}</b><small>${membri.map((i) => esc(i === ctx.mio ? 'tu' : ctx.nome(i))).join(', ')}</small></div>
      <strong>${p.punti[s]}</strong><em>${p.trovate[s]}/${p.parole.length}</em></div>`;
  }

  function carta(ctx, x, i) {
    const p = ctx.partita, fine = p.fase !== 'gioco';
    const tessere = (lettere, classe = '') => lettere.toUpperCase().split('').map((c, k) => `<i class="${classe}" style="--k:${k}">${c}</i>`).join('');
    const altre = x.altre.some(Boolean) ? `<span class="agr-altra" title="L'altra squadra l'ha già trovata">${ICONA[1 - p.mia]}</span>` : '';
    let corpo;
    if (x.trovata) {
      corpo = `<div class="agr-lettere giusta">${tessere(x.come || x.soluzione)}</div>
        <p class="agr-chi">${esc(x.chi === ctx.mio ? 'Tu' : ctx.nome(x.chi))} <b>+${x.punti}</b>${x.prima ? ' <span title="Prima dell\'altra squadra">⚡</span>' : ''}${x.come && x.come !== x.soluzione ? ` <small>(anche ${esc(x.soluzione.toUpperCase())})</small>` : ''}</p>`;
    } else if (fine) {
      corpo = `<div class="agr-lettere persa">${tessere(x.soluzione)}</div><p class="agr-chi">non trovata</p>`;
    } else {
      const aiuto = x.aiuto ? `<span class="agr-aiuto">${esc(x.aiuto.toUpperCase())}${'·'.repeat(x.n - x.aiuto.length)}</span>` : '';
      corpo = `<div class="agr-lettere">${tessere(x.lettere)}</div>
        <p class="agr-chi"><span>${x.n} lettere</span>${aiuto}${x.aiuto.length < 2 ? `<button type="button" class="agr-bt-aiuto" data-az="agr-aiuto" data-i="${i}" title="Mostra una lettera (−2 punti)">💡 ${x.aiuto ? 'altra lettera' : 'aiuto'}</button>` : ''}</p>`;
    }
    let altreSq = '';
    if (fine && x.perSquadra && p.squadre.length > 1) {
      const y = x.perSquadra[1 - p.mia];
      altreSq = `<p class="agr-loro">${ICONA[1 - p.mia]} ${y.chi !== null ? `${esc(ctx.nome(y.chi))} <b>+${y.punti}</b>` : '—'}</p>`;
    }
    return `<div class="agr-carta ${x.trovata ? 'trovata' : ''} ${fine && !x.trovata ? 'mancata' : ''}" data-lettere="${x.trovata || fine ? '' : esc(x.lettere)}" style="--r:${((i * 37) % 7) - 3}deg">${altre}${corpo}${altreSq}</div>`;
  }

  function panno(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const fine = p.fase !== 'gioco';
    const sq = p.squadre.map((_, s) => squadra(ctx, s)).join(p.squadre.length > 1 ? '<span class="agr-vs">contro</span>' : '');
    let sotto;
    if (!fine) {
      sotto = `<div class="agr-scrivi"><input data-ana maxlength="12" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"
          placeholder="Scrivi una parola…" value="${esc(ui.scritto || '')}" aria-label="La tua parola">
        <button type="button" class="bottone primario-bt" data-az="agr-prova">Prova ⏎</button></div>
        <p class="agr-nota">Scrivi una parola<span class="agr-tasti"> e premi <kbd>Invio</kbd></span>: il gioco capisce da solo quale hai risolto. Le carte con quelle lettere si accendono.</p>`;
    } else {
      const ultimo = p.round >= p.nRound;
      const tot = p.squadre.map((n, s) => `${ICONA[s]} <b>+${p.puntiRound[s]}</b>`).join(' &nbsp; ');
      sotto = `<p class="agr-nota">Questo round: ${tot}</p>${p.finita ? '' : p.pronto[ctx.mio] ? `<p class="agr-nota">Aspetta gli altri… (${Math.ceil(p.restaPausa / 1000)} s)</p>`
        : `<button type="button" class="bottone primario-bt" data-az="agr-pronto">${ultimo ? 'Classifica finale' : `Round ${p.round + 1} ▸`}</button>`}`;
    }
    return `<div class="agr ${fine ? 'agr-fine' : ''}">
      <div class="agr-testa"><div class="agr-squadre">${sq}</div>
        <div class="agr-giro"><span>Round ${p.round} di ${p.nRound}</span>${fine ? '' : orologio(p)}</div></div>
      <div class="agr-carte n${p.parole.length}">${p.parole.map((x, i) => carta(ctx, x, i)).join('')}</div>
      <div class="agr-sotto">${sotto}</div>
    </div>`;
  }

  const tavolo = {
    libero: true,
    reset(ctx) {
      ctxA = ctx;
      const ui = ctx.ui, p = ctx.partita;
      if (ui._round !== p.round) { ui._round = p.round; ui.scritto = ''; ui._trovate = null; }
    },
    panno,
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const el = document.querySelector('[data-ana]');
      if (el && gioca(ctx) && (ui.fuoco || (window.matchMedia('(hover: hover)').matches && primaVolta(ui, `agr-fuoco-${p.round}`))) && !(window.Boss && Boss.attivo)) {
        el.focus({ preventScroll: true });
        const k = Math.min(ui.cursore === undefined ? el.value.length : ui.cursore, el.value.length);
        try { el.setSelectionRange(k, k); } catch {}
      }
      illumina(ctx);
      // una parola trovata dalla mia squadra: un suono (più allegro se l'ho trovata io)
      const mie = p.parole.filter((x) => x.trovata).length;
      if (ui._trovate !== null && mie > ui._trovate) {
        const ultima = p.parole.filter((x) => x.trovata).some((x) => x.chi === ctx.mio && !(ui._mieGia || []).includes(x.soluzione));
        suono(ultima ? [[523, 0.06], [659, 0.06], [784, 0.1]] : [[660, 0.06], [880, 0.08]], { volume: 0.05 });
      }
      ui._trovate = mie;
      ui._mieGia = p.parole.filter((x) => x.trovata && x.chi === ctx.mio).map((x) => x.soluzione);
      if (p.fase === 'fine' && primaVolta(ui, `agr-fine-${p.round}`)) suono([[392, 0.1], [523, 0.1], [659, 0.18]], { volume: 0.06 });
      clearInterval(ui._agrT);
      ui._agrT = setInterval(() => {
        const t = document.querySelector('.agr-tempo');
        if (!t) return clearInterval(ui._agrT);
        const resta = Math.max(0, Number(t.dataset.fine) - Date.now()), s = Math.ceil(resta / 1000);
        t.querySelector('b').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        t.classList.toggle('poco', resta < 20000);
        if (resta < 10500 && resta > 0 && s !== ui._bip) { ui._bip = s; suono([[880, 0.04]], { volume: 0.03 }); }
      }, 250);
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'fine') return p.pronto[ctx.mio] ? 'Aspetta gli altri' : 'Le soluzioni';
      return p.squadre.length > 1 ? `${ICONA[p.mia]} Rimetti in ordine le lettere con la tua squadra!` : 'Rimetti in ordine le lettere!';
    },
    punteggio(ctx) {
      const p = ctx.partita;
      return p.squadre.map((n, s) => `<span>${ICONA[s]} ${esc(n)} <b>${p.punti[s]}</b></span>`).join('');
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      return `<span class="agr-info">${ICONA[p.sq[posto]]}${p.sq[posto] === p.mia ? ` ${p.trovatePer[posto]} trovate` : ''}</span>`;
    },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'agr-prova') return prova(ctx);
      if (az === 'agr-aiuto') { suono([[440, 0.05]], { volume: 0.04 }); return ctx.invia({ tipo: 'aiuto', i: Number(el.dataset.i) }); }
      if (az === 'agr-pronto') return ctx.invia({ tipo: 'pronto' });
    },
  };

  Object.assign(window.Tavoli, { anagrammi: tavolo });
})();
