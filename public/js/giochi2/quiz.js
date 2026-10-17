// QUIZ DI CULTURA GENERALE: stesso aspetto di "Indovina la bandiera" (classi bd-… già nel sito), con la domanda
// scritta grande e l'icona dell'argomento. Tasti 1-4 per rispondere.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  let ctxQ = null;
  const puo = (p) => p && p.gioco === 'quiz' && !p.finita && !p.inAttesa && !p.mia;

  function bottoni(ctx) {
    const p = ctx.partita;
    const svela = p.giusta !== null && p.giusta !== undefined;
    return p.opzioni.map((nome, i) => {
      const cls = ['bd-scelta'];
      if (p.mia && p.mia.scelta === i) cls.push('mia');
      if (svela && i === p.giusta) cls.push('giusta');
      else if (svela && p.mia && p.mia.scelta === i) cls.push('sbagliata');
      const chi = svela && p.n > 1 ? p.altri.map((a, k) => (a.scelta === i && k !== ctx.mio ? `<i title="${esc(ctx.nome(k))}">${esc(ctx.nome(k).slice(0, 1).toUpperCase())}</i>` : '')).join('') : '';
      return `<button type="button" class="${cls.join(' ')}" data-az="risposta" data-i="${i}" ${puo(p) ? '' : 'disabled'}><kbd>${i + 1}</kbd><span>${esc(nome)}</span>${chi ? `<b class="bd-chi">${chi}</b>` : ''}</button>`;
    }).join('');
  }
  function messaggio(p) {
    if (p.inAttesa || p.finita) {
      if (!p.mia || p.mia.scelta < 0) return '<p class="bd-msg no">⏰ Tempo scaduto!</p>';
      return p.mia.giusto ? `<p class="bd-msg si">✅ Giusto!${p.n > 1 ? ` +${p.mia.punti} punti` : ''}${p.serie > 1 ? ` · ${p.serie} di fila 🔥` : ''}</p>` : '<p class="bd-msg no">❌ Sbagliato</p>';
    }
    if (p.mia) return `<p class="bd-msg">Risposta data: ${p.n > 1 ? 'aspetta gli altri…' : 'vediamo…'}</p>`;
    return '';
  }
  function ripasso(p) {
    if (!p.finita || !p.ripasso) return '';
    if (!p.ripasso.length) return '<p class="bd-msg si">🏆 Nessun errore: tutte giuste!</p>';
    return `<section class="qz-ripasso" aria-label="Da ripassare"><h3>📚 Da ripassare (${p.ripasso.length})</h3><ol>${p.ripasso.map((x) => `
      <li><span>${esc(x.icona || '❓')} ${esc(x.domanda)}</span><b>${esc(x.nome)}</b>${x.detto ? `<small>avevi detto: ${esc(x.detto)}</small>` : '<small>tempo scaduto</small>'}</li>`).join('')}</ol></section>`;
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxQ = ctx; },
    panno(ctx) {
      const p = ctx.partita;
      const fr = p.tempo ? p.resta / p.tempo : 0;
      return `<div class="bd qz">
        <p class="pa-round">Domanda ${p.domanda} di ${p.nDomande}${p.migliore > 1 ? ` · serie migliore: ${p.migliore}` : ''}</p>
        <div class="bd-tempo" aria-hidden="true"><i style="--da:${fr.toFixed(3)};--d:${p.resta}ms" class="${p.resta < 3500 ? 'poco' : ''}"></i></div>
        <div class="qz-carta"><span class="qz-icona" aria-hidden="true">${esc(p.icona || '❓')}</span><p class="qz-domanda">${esc(p.testo)}</p></div>
        ${messaggio(p)}
        <div class="bd-scelte">${bottoni(ctx)}</div>
        ${ripasso(p)}
      </div>`;
    },
    dopo(ctx) {
      ctxQ = ctx;
      const p = ctx.partita;
      if ((p.inAttesa || p.finita) && p.mia && primaVolta(ctx.ui, `qz-${p.domanda}`)) {
        if (p.mia.giusto) suono([[660, 0.07], [880, 0.12]], { volume: 0.07 });
        else suono([[220, 0.12], [180, 0.18]], { tipo: 'sawtooth', volume: 0.04 });
      }
    },
    statoAttesa: (ctx) => (ctx.partita.domanda >= ctx.partita.nDomande ? 'Ultima domanda!' : 'Prossima domanda…'),
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.mia ? 'Risposta data' : 'Scegli la risposta giusta'; },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.n === 1) return `<span>Giuste <b>${p.giuste[0]}</b><small>/${p.nDomande}</small></span>`;
      return p.punti.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
    },
    infoPosto(ctx, posto) { const a = ctx.partita.altri[posto]; return a.giusto === true ? '✅' : a.giusto === false ? '❌' : a.risposto ? 'ha risposto' : '…'; },
    clic(ctx, el) { if (el.dataset.az === 'risposta' && puo(ctx.partita)) ctx.invia({ tipo: 'risposta', scelta: Number(el.dataset.i) }); },
  };
  document.addEventListener('keydown', (e) => {
    const ctx = ctxQ;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'quiz') return;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (window.Boss && Boss.attivo) return;
    const n = Number(e.key);
    if (n >= 1 && n <= ctx.partita.opzioni.length && puo(ctx.partita)) ctx.invia({ tipo: 'risposta', scelta: n - 1 });
  });
  Object.assign(window.Tavoli, { quiz: tavolo });
})();
