// CATENA DI PAROLE: la catena delle ultime parole come anelli (le lettere che attaccano evidenziate), la parola di
// adesso grande con le sue ultime lettere in oro, la barra del tempo che si consuma, le vite di tutti a cuoricini e il
// campo dove scrivere (resta selezionato tra un aggiornamento e l'altro).
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  let ctxC = null;
  const chi = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
  const ricevuto = new WeakMap();
  const resta = (p) => Math.max(0, p.resta - (Date.now() - (ricevuto.get(p) || Date.now())));
  setInterval(() => {
    const p = ctxC && ctxC.partita;
    if (!p || p.gioco !== 'catena' || p.finita) return;
    const r = resta(p), el = document.querySelector('.ct-tempo > i'), num = document.querySelector('.ct-secondi');
    if (el) { el.style.width = `${(100 * r) / p.tempo}%`; el.classList.toggle('poco', r < 5000); }
    if (num) num.textContent = Math.ceil(r / 1000);
  }, 120);

  const tavolo = {
    libero: true,
    reset(ctx) { ctxC = ctx; if (ctx.partita && !ricevuto.has(ctx.partita)) ricevuto.set(ctx.partita, Date.now()); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, N = p.nLettere;
      const mio = p.turno === ctx.mio && !p.finita && !ctx.stato.spettatore;
      const anelli = p.catena.map((x, k) => {
        const ultima = k === p.catena.length - 1;
        // testa (le lettere che attaccano alla parola prima) e coda (quelle a cui attacca la dopo), senza sovrapporle
        const w = x.w, t = k > 0 ? N : 0, c = Math.max(t, w.length - N);
        return `<span class="ct-anello ${ultima ? 'ultima' : ''}"><span><b class="ct-testa">${w.slice(0, t)}</b>${w.slice(t, c)}<b class="ct-coda">${w.slice(c)}</b></span><small>${x.chi == null ? 'partenza' : esc(chi(ctx, x.chi))}</small></span>`;
      }).join('<i class="ct-maglia">⛓</i>');
      const giocatori = Array.from({ length: p.n }, (_, i) => `<span class="ct-g ${p.turno === i ? 'di-turno' : ''} ${p.vite[i] === 0 ? 'fuori' : ''}"><b>${esc(chi(ctx, i))}</b> <span class="ct-cuori">${p.vite[i] ? '❤️'.repeat(p.vite[i]) : '💀'}</span> <small>${p.punti[i]} parole</small></span>`).join('');
      let sotto = '';
      if (p.finita) sotto = `<p class="ct-msg">Catena finita: ${p.lunghezza} parole in tutto.</p>`;
      else if (mio) {
        sotto = `<form class="ct-form" data-az="niente" onsubmit="return false">
          <label class="ct-label">La tua parola, che comincia con <b>${p.attacco.toUpperCase()}</b>:</label>
          <div class="ct-riga"><span class="ct-pre">${p.attacco.toUpperCase()}</span><input class="ct-input" id="ct-input" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20" value="${esc(ui.testo || '')}" aria-label="Scrivi la parola">
          <button type="button" class="bottone primario-bt" data-az="invia">Invia ⏎</button></div>
          ${p.ultimoErrore ? `<p class="ct-errore">✋ ${esc(p.ultimoErrore)}</p>` : ''}
          <button type="button" class="bottone leggero piccolo-bt" data-az="passo">Passo (perdo una vita)</button></form>`;
      } else sotto = `<p class="ct-msg">${esc(ctx.nome(p.turno))} cerca una parola con <b>${p.attacco.toUpperCase()}</b>…</p>`;
      return `<div class="ct"><div class="ct-giocatori">${giocatori}</div>
        <div class="ct-catena">${anelli}</div>
        ${p.finita ? '' : `<div class="ct-tempo"><i></i></div><p class="ct-conto"><span class="ct-secondi">${Math.ceil(resta(p) / 1000)}</span> s · catena di ${p.lunghezza}</p>`}
        ${sotto}</div>`;
    },
    dopo(ctx) {
      ctxC = ctx;
      const p = ctx.partita;
      if (!ricevuto.has(p)) ricevuto.set(p, Date.now());
      const inp = document.getElementById('ct-input');
      if (inp) {
        // il testo che si stava scrivendo resta, con il cursore in fondo
        if (document.activeElement !== inp) { inp.focus({ preventScroll: true }); inp.setSelectionRange(inp.value.length, inp.value.length); }
        if (!inp.dataset.pronto) {
          inp.dataset.pronto = '1';
          inp.addEventListener('input', () => { ctx.ui.testo = inp.value; });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tavolo.clic(ctxC, { dataset: { az: 'invia' } }); } });
        }
      }
      if (p.lunghezza && primaVolta(ctx.ui, `ct-${p.lunghezza}`)) suono([[440 + (p.lunghezza % 6) * 40, 0.05]], { tipo: 'sine', volume: 0.04 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.turno === ctx.mio ? `Tocca a te: parola con ${p.attacco.toUpperCase()}` : null; },
    punteggio(ctx) { const p = ctx.partita; return `<span class="obiettivo">catena di ${p.lunghezza} · attacco con ${p.nLettere === 2 ? 'due lettere' : 'una lettera'}</span>`; },
    infoPosto(ctx, posto) { const p = ctx.partita; return p.vite[posto] ? `${'❤️'.repeat(p.vite[posto])} · ${p.punti[posto]} parole` : 'fuori'; },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui, p = ctx.partita;
      if (az === 'invia') {
        const inp = document.getElementById('ct-input');
        let t = (inp ? inp.value : ui.testo || '').trim().toLowerCase();
        if (!t) return undefined;
        // si può scrivere anche senza le lettere d'attacco (sono già davanti)
        if (!t.startsWith(p.attacco)) t = p.attacco + t;
        ui.testo = '';
        if (inp) inp.value = '';
        return ctx.invia({ tipo: 'parola', testo: t });
      }
      if (az === 'passo') { if (confirm('Passare? Perdi una vita.')) ctx.invia({ tipo: 'passo' }); }
      return undefined;
    },
  };
  Object.assign(window.Tavoli, { catena: tavolo });
})();
