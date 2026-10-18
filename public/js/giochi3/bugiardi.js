// DADI BUGIARDI: i bicchieri di cuoio di tutti (con quanti dadi hanno sotto), i propri dadi bene in vista, la puntata
// in corso al centro. Per puntare si sceglie quanti dadi e la faccia; poi "Punta", "Dubito!" o "Calza!". Quando si
// alzano i bicchieri si vedono i dadi di tutti, con quelli che contano illuminati.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const PUNTI = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[25, 25], [50, 50], [75, 75]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]] };
  const dado = (v, cls = '') => `<svg class="dbu-dado ${cls}" viewBox="0 0 100 100" aria-label="${v}"><rect x="6" y="6" width="88" height="88" rx="20"/>${PUNTI[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</svg>`;
  const piuAlta = (q, f, Q, F) => {
    if (Q == null) return f !== 1;
    if (F === 1 && f === 1) return q > Q;
    if (F === 1) return q >= 2 * Q + 1;
    if (f === 1) return q >= Math.ceil(Q / 2);
    return q > Q || (q === Q && f > F);
  };
  const nomeP = (pt) => `${pt.q} × ${pt.f === 1 ? 'jolly (1)' : pt.f}`;
  const chi = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));

  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const mio = p.turno === ctx.mio && !p.inAttesa && !p.finita && !ctx.stato.spettatore;
      const R = p.rivela && p.fase === 'rivela' ? p.rivela : null;
      // i bicchieri di tutti (gli altri; i miei dadi stanno sotto)
      const bicchieri = Array.from({ length: p.n }, (_, i) => i).map((i) => {
        const fuori = p.nDadi[i] === 0 && !(R && R.dadi[i].length);
        const dadi = R ? R.dadi[i].map((d) => dado(d, d === R.puntata.f || (R.puntata.f !== 1 && d === 1) ? 'conta' : 'spento')).join('') : '';
        return `<div class="dbu-posto ${p.turno === i ? 'di-turno' : ''} ${fuori ? 'fuori' : ''} ${R && (R.perde === i) ? 'perde' : ''} ${R && R.guadagna === i ? 'guadagna' : ''}">
          <div class="dbu-bicchiere ${R ? 'alzato' : ''}"><span>${fuori ? '✖' : p.nDadi[i]}</span></div>
          ${R ? `<div class="dbu-scoperti">${dadi}</div>` : ''}<b>${esc(chi(ctx, i))}</b></div>`;
      }).join('');
      const pt = p.puntata;
      const centro = R
        ? `<div class="dbu-centro"><p>${esc(chi(ctx, R.chi))} ${R.chi === ctx.mio ? 'hai detto' : 'dice'} <b>${R.tipo === 'dubito' ? 'Dubito!' : 'Calza!'}</b> sulla puntata ${nomeP(R.puntata)}</p><p class="dbu-conto">Ce ne sono <b>${R.conta}</b></p>
            <p>${R.perde != null ? `${esc(chi(ctx, R.perde))} ${R.perde === ctx.mio ? 'perdi' : 'perde'} un dado` : `${esc(chi(ctx, R.guadagna))} ${R.guadagna === ctx.mio ? 'riprendi' : 'riprende'} un dado`}</p></div>`
        : `<div class="dbu-centro">${pt ? `<p class="dbu-puntata">${dado(pt.f, 'grande')}<span>almeno <b>${pt.q}</b></span></p><p><small>puntata di ${esc(chi(ctx, pt.chi))} · ${p.totale} dadi in gioco</small></p>` : `<p>Nuovo giro: ${p.turno === ctx.mio ? 'apri tu' : `apre ${esc(ctx.nome(p.turno))}`} · ${p.totale} dadi in gioco</p>`}
            ${p.storia.length > 1 ? `<div class="dbu-storia">${p.storia.slice(0, -1).map((x) => `<span>${esc(chi(ctx, x.chi))}: ${nomeP(x)}</span>`).join('')}</div>` : ''}</div>`;
      // la mia puntata
      let comandi = '';
      if (mio) {
        const Q = pt && pt.q, F = pt && pt.f;
        if (ui.q == null || ui.f == null || !piuAlta(ui.q, ui.f, Q, F)) { const m = p.minime.find((x) => x.f !== 1) || p.minime[0]; if (m) { ui.q = m.q; ui.f = m.f; } }
        const ok = piuAlta(ui.q, ui.f, Q, F) && ui.q <= p.totale;
        comandi = `<div class="dbu-comandi">
          <div class="dbu-quanti"><button type="button" class="bottone piccolo-bt" data-az="meno">−</button><b>${ui.q}</b><button type="button" class="bottone piccolo-bt" data-az="piu">+</button><span>dadi di</span></div>
          <div class="dbu-facce">${[2, 3, 4, 5, 6, 1].map((f) => `<button type="button" class="dbu-faccia ${ui.f === f ? 'scelta' : ''}" data-az="faccia" data-f="${f}" ${!pt && f === 1 ? 'disabled' : ''}>${dado(f)}</button>`).join('')}</div>
          <div class="dbu-azioni"><button type="button" class="bottone primario-bt" data-az="punta" ${ok ? '' : 'disabled'}>🎲 Punta ${ui.q} × ${ui.f === 1 ? 'jolly' : ui.f}</button>
          ${pt ? '<button type="button" class="bottone dbu-dubito" data-az="dubito">🤨 Dubito!</button>' : ''}${pt && p.calza ? '<button type="button" class="bottone" data-az="calza">🎯 Calza!</button>' : ''}</div></div>`;
      }
      const miei = !R && p.mieiDadi.length ? `<div class="dbu-miei"><small>I tuoi dadi (li vedi solo tu)</small><div>${p.mieiDadi.map((d) => dado(d, pt && (d === pt.f || (pt.f !== 1 && d === 1)) ? 'conta' : '')).join('')}</div></div>` : '';
      return `<div class="dbu"><div class="dbu-tavolo">${bicchieri}</div>${centro}${miei}${comandi}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.rivela && p.fase === 'rivela' && primaVolta(ctx.ui, `dbu-r-${p.nGiro}`)) suono([[200, 0.08], [260, 0.08], [520, 0.15]], { tipo: 'triangle', volume: 0.06 });
      else if (p.storia.length && primaVolta(ctx.ui, `dbu-p-${p.nGiro}-${p.storia.length}`)) suono([[330, 0.05]], { tipo: 'sine', volume: 0.04 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita || p.inAttesa) return null; return p.turno === ctx.mio ? (p.puntata ? 'Alza la puntata o dubita' : 'Apri tu la puntata') : null; },
    statoAttesa(ctx) { return ctx.partita.fase === 'rivela' ? 'Si alzano i bicchieri…' : null; },
    punteggio(ctx) { const p = ctx.partita; return p.nDadi.map((x, i) => `<span>${esc(chi(ctx, i))} <b>${x ? `${x} 🎲` : 'fuori'}</b></span>`).join(''); },
    infoPosto(ctx, posto) { const x = ctx.partita.nDadi[posto]; return x ? `${x} ${x === 1 ? 'dado' : 'dadi'}` : 'fuori'; },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui, p = ctx.partita;
      if (az === 'piu') { ui.q = Math.min(p.totale, (ui.q || 1) + 1); return ctx.ridisegna(); }
      if (az === 'meno') { ui.q = Math.max(1, (ui.q || 1) - 1); return ctx.ridisegna(); }
      if (az === 'faccia') {
        ui.f = Number(el.dataset.f);
        // si aggiusta il numero al minimo per quella faccia, se serve
        const pt = p.puntata;
        if (!piuAlta(ui.q, ui.f, pt && pt.q, pt && pt.f)) { const m = p.minime.find((x) => x.f === ui.f); if (m) ui.q = m.q; }
        return ctx.ridisegna();
      }
      if (az === 'punta') { suono([[400, 0.05]], { tipo: 'sine', volume: 0.04 }); return ctx.invia({ tipo: 'punta', q: ui.q, f: ui.f }); }
      if (az === 'dubito') return ctx.invia({ tipo: 'dubito' });
      if (az === 'calza') return ctx.invia({ tipo: 'calza' });
      return undefined;
    },
  };
  Object.assign(window.Tavoli, { bugiardi: tavolo });
})();
