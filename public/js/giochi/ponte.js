// PONTE FRAGILE: il ponte di vetro disegnato in verticale (si parte in basso, si arriva in alto), così sta bene
// anche sul telefono. Niente turni: chi vuole salta sulla riga davanti toccando un pannello che brilla, con i pulsanti
// sotto il ponte o con le frecce (← → per scegliere il vetro nuovo, ↑ per andare avanti sui vetri già scoperti).
// Il tempo del round è uno solo per tutti; la spinta (🤚) butta chi ti sta accanto sul vetro sconosciuto.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const COLORI = ['#e8453c', '#2f7fd8', '#2e9d57', '#d19a2a', '#8e55c9', '#e36fa5', '#1fa3a3', '#e07b2c'];
  const col = (i) => COLORI[i % COLORI.length];
  const chi = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
  const pedina = (ctx, i, extra = '') => `<span class="pf-pedina ${extra}" style="--col:${col(i)}" title="${esc(chi(ctx, i))}">${esc(chi(ctx, i).slice(0, 2))}</span>`;
  const inGioco = (ctx) => { const p = ctx.partita; return ctx.mio >= 0 && !p.finita && !p.inAttesa && p.stato[ctx.mio] === 'ponte'; };
  // la riga davanti a me: nota (si va avanti sul pannello buono) o sconosciuta (si sceglie)
  const davanti = (ctx) => { const p = ctx.partita; const r = p.pos[ctx.mio] + 1; return { r, nota: r < p.L && p.noto[r] !== null }; };
  const vicini = (ctx) => { const p = ctx.partita, io = ctx.mio; return p.ordine.filter((q) => q !== io && p.stato[q] === 'ponte' && p.pos[q] === p.pos[io]); };
  const secondi = (ms) => Math.ceil(ms / 1000);

  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita;
      const gioco = inGioco(ctx);
      const { r: mia } = gioco ? davanti(ctx) : { r: -9 };
      const fineRound = p.sicuroFinale;
      const righe = [];
      for (let r = p.L - 1; r >= 0; r--) {
        const celle = [0, 1].map((lato) => {
          const buono = p.noto[r] === lato, rotto = p.rotto[r] === lato;
          const qui = p.ordine.filter((i) => p.stato[i] === 'ponte' && p.pos[i] === r && p.lato[i] === lato);
          const appena = p.ultimo && p.ultimo.riga === r && p.ultimo.lato === lato ? 'appena' : '';
          const svelato = fineRound && p.noto[r] === null ? (fineRound[r] === lato ? 'svelato-buono' : 'svelato-rotto') : '';
          let cls = buono ? 'buono' : rotto ? 'rotto' : 'vetro';
          // posso saltare qui: la riga davanti a me, il pannello buono se è nota, tutti e due se è nuova
          const attiva = gioco && r === mia && (p.noto[r] === null || buono);
          const indizio = attiva && p.indizio === lato ? 'indizio' : '';
          const dentro = qui.map((i) => pedina(ctx, i, i === ctx.mio ? 'io' : '')).join('') + (rotto ? '<span class="pf-crepa" aria-hidden="true">💥</span>' : '') + (indizio ? '<span class="pf-luce" aria-hidden="true">✨</span>' : '');
          const nome = `${lato ? 'destra' : 'sinistra'}, riga ${r + 1}`;
          if (attiva) return `<button type="button" class="pf-vetro ${cls} attiva ${indizio}" data-az="salta" data-lato="${lato}" aria-label="Salta a ${nome}">${dentro}</button>`;
          if (r === p.fronte && !p.finita) cls += ' prossima';
          return `<div class="pf-vetro ${cls} ${appena} ${svelato}" aria-label="${nome}">${dentro}</div>`;
        }).join('');
        righe.push(`<div class="pf-riga ${r === p.fronte ? 'fronte' : ''}"><span class="pf-num">${r + 1}</span>${celle}</div>`);
      }
      const salvi = p.ordine.filter((i) => p.stato[i] === 'salvo');
      const partenza = p.ordine.filter((i) => p.stato[i] === 'ponte' && p.pos[i] === -1);
      const caduti = p.ordine.filter((i) => p.stato[i] === 'caduto');
      let msg;
      const u = p.ultimo;
      if (p.finita) msg = 'Partita finita!';
      else if (p.fase === 'fineRound') msg = p.crollato ? '⏰ Il ponte è crollato!' : `Fine del round ${p.round}`;
      else if (ctx.mio >= 0 && p.stato[ctx.mio] === 'caduto') msg = '💥 Sei caduto!';
      else if (ctx.mio >= 0 && p.stato[ctx.mio] === 'salvo') msg = '🎉 Sei arrivato!';
      else if (gioco) {
        const { r, nota } = davanti(ctx);
        msg = nota ? `Riga <b>${r + 1}</b> già scoperta: avanti!`
          : p.indizio !== null ? `Il riflesso dice <b>${p.indizio ? 'destra' : 'sinistra'}</b>…`
            : `Vetro nuovo (riga <b>${r + 1}</b>): salti o aspetti?`;
      } else msg = '&nbsp;';
      const fra = p.resta !== null && p.resta !== undefined;
      return `<div class="pf">
        ${fra ? `<div class="pf-orologio" data-fine="${Date.now() + p.resta}" data-durata="${p.durata}"><span class="pf-barra"><i style="width:${(p.resta / p.durata) * 100}%"></i></span><span class="pf-tempo ${p.resta < 10000 ? 'poco' : ''}">⏱ <b>${secondi(p.resta)}</b> s</span></div>` : ''}
        <div class="pf-ponte" style="--righe:${p.L}">
          <div class="pf-riva arrivo"><span class="pf-etichetta">🏁 Arrivo</span>${salvi.map((i) => pedina(ctx, i)).join('')}</div>
          <div class="pf-righe">${righe.join('')}</div>
          <div class="pf-riva partenza"><span class="pf-etichetta">Partenza</span>${partenza.map((i) => pedina(ctx, i, i === ctx.mio ? 'io' : '')).join('')}</div>
        </div>
        <p class="pa-msg" aria-live="polite">${msg}</p>
        <p class="pa-info">Round ${p.round} di ${p.nRound}${caduti.length ? ` · caduti: ${caduti.map((i) => esc(i === ctx.mio ? 'tu' : ctx.nome(i))).join(', ')}` : ''}${u && u.spinto && u.da !== null ? ` · 🤚 ${esc(chi(ctx, u.da))} ha spinto ${esc(u.posto === ctx.mio ? 'te' : ctx.nome(u.posto))}` : ''}</p>
      </div>`;
    },
    azioni(ctx) {
      const p = ctx.partita;
      if (!inGioco(ctx)) return '';
      const { nota } = davanti(ctx);
      const salti = nota
        ? '<button type="button" class="bottone primario pf-avanti" data-az="salta">⬆ Avanti</button>'
        : `<button type="button" class="bottone primario" data-az="salta" data-lato="0">⬅ Sinistra</button>
           <button type="button" class="bottone" data-az="riflesso" ${p.riflessi[ctx.mio] && p.indizio === null ? '' : 'disabled'}>🔍 Riflesso${p.riflessi[ctx.mio] ? '' : ' (usato)'}</button>
           <button type="button" class="bottone primario" data-az="salta" data-lato="1">Destra ➡</button>`;
      // la spinta: solo verso chi è sulla mia riga, davanti al vetro sconosciuto
      const accanto = nota ? [] : vicini(ctx);
      const carica = p.spintaFra <= 0;
      const spinte = accanto.length
        ? accanto.map((q) => `<button type="button" class="bottone pf-spingi" data-az="spingi" data-chi="${q}" ${carica ? '' : 'disabled'}>🤚 Spingi ${esc(ctx.nome(q))}</button>`).join('')
        : '';
      return `<div class="pf-scelta ${nota ? 'una' : ''}">${salti}</div>
        <div class="pf-spinta"><span class="pf-carica" data-fine="${Date.now() + p.spintaFra}">${carica ? '🤚 Spinta pronta' : `🤚 Spinta tra <b>${secondi(p.spintaFra)}</b> s`}</span>${spinte}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      // il tempo del round e la ricarica della spinta si aggiornano da soli tra un messaggio e l'altro
      clearInterval(ctx.ui._pfT);
      ctx.ui._pfT = setInterval(() => {
        const o = document.querySelector('.pf-orologio');
        const c = document.querySelector('.pf-carica');
        if (!o && !c) return clearInterval(ctx.ui._pfT);
        if (o) {
          const resta = Math.max(0, Number(o.dataset.fine) - Date.now());
          o.querySelector('b').textContent = secondi(resta);
          o.querySelector('.pf-tempo').classList.toggle('poco', resta < 10000);
          o.querySelector('i').style.width = `${(resta / Number(o.dataset.durata)) * 100}%`;
        }
        if (c) {
          const fra = Number(c.dataset.fine) - Date.now();
          if (fra <= 0 && !c.classList.contains('pronta')) {
            c.classList.add('pronta'); c.textContent = '🤚 Spinta pronta';
            document.querySelectorAll('.pf-spingi').forEach((b) => { b.disabled = false; });
          } else if (fra > 0) { const b = c.querySelector('b'); if (b) b.textContent = secondi(fra); }
        }
      }, 250);
      const u = p.ultimo;
      if (!u) return;
      if (primaVolta(ctx.ui, `pf-${p.round}-${u.riga}-${u.posto}`)) {
        if (u.regge) suono([[520, 0.05], [780, 0.08]], { tipo: 'triangle', volume: 0.05 });
        else suono([[1800, 0.03], [1200, 0.04], [300, 0.1], [90, 0.4]], { tipo: 'sawtooth', volume: 0.1 });
      }
    },
    tasto(ctx, e) {
      if (!inGioco(ctx)) return false;
      const { nota } = davanti(ctx);
      if (nota && ['ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { ctx.invia({ tipo: 'salta' }); return true; }
      if (nota) return false;
      if (e.key === 'ArrowLeft') { ctx.invia({ tipo: 'salta', lato: 0 }); return true; }
      if (e.key === 'ArrowRight') { ctx.invia({ tipo: 'salta', lato: 1 }); return true; }
      return false;
    },
    statoAttesa: (ctx) => (ctx.partita.crollato ? 'Il ponte crolla!' : 'Fine round'),
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita || p.inAttesa || ctx.mio < 0) return null;
      return { ponte: 'Salta quando vuoi', salvo: 'Arrivato!', caduto: 'Caduto' }[p.stato[ctx.mio]] || null;
    },
    punteggio(ctx) { const p = ctx.partita; return p.punti.map((x, i) => `<span style="color:${col(i)}">${esc(chi(ctx, i))} <b>${x}</b></span>`).join(''); },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      const s = p.stato[posto] === 'ponte' ? (p.pos[posto] < 0 ? 'in partenza' : `riga ${p.pos[posto] + 1}`) : { salvo: 'arrivato 🎉', caduto: 'caduto 💥' }[p.stato[posto]] || '';
      return `${p.punti[posto]} punti · ${s}`;
    },
    clic(ctx, el) {
      if (el.dataset.az === 'salta') {
        el.classList.add('premuta');
        return ctx.invia(el.dataset.lato === undefined ? { tipo: 'salta' } : { tipo: 'salta', lato: Number(el.dataset.lato) });
      }
      if (el.dataset.az === 'riflesso') return ctx.invia({ tipo: 'riflesso' });
      if (el.dataset.az === 'spingi') return ctx.invia({ tipo: 'spingi', chi: Number(el.dataset.chi) });
    },
  };
  Object.assign(window.Tavoli, { ponte: tavolo });

  // frecce della tastiera: valgono solo durante la partita a Ponte fragile e fuori dai campi di testo
  let ultimo = null;
  const vecchio = tavolo.panno;
  tavolo.panno = (ctx) => { ultimo = ctx; return vecchio(ctx); };
  window.addEventListener('keydown', (e) => {
    const ctx = ultimo;
    if (!ctx || !ctx.partita || ctx.partita.gioco !== 'ponte' || (window.Boss && Boss.attivo) || e.repeat) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (!document.querySelector('.pf')) return;
    if (tavolo.tasto(ctx, e)) e.preventDefault();
  });
})();
