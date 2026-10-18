// FORZA 4 IN 3D: la base di legno vista in prospettiva (obliqua) con i 16 pioli e le palline infilate; sotto, i
// quattro piani visti dall'alto (per vedere bene le diagonali). Si tocca un piolo, o una casella di un piano.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const COL = (ctx, v) => (v === ctx.partita.primo ? 'ros' : 'gia');
  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita;
      const mio = p.turno === ctx.mio && !p.finita && !ctx.stato.spettatore;
      const fila = new Set(p.fila || []);
      // vista obliqua: le file più vicine scendono e si spostano a destra di un quarto di passo, così nessun piolo
      // finisce esattamente davanti a un altro
      const A = 58, D = 14.5, B = 34, BH = 20, PH = 4 * BH + 14;
      const ox = 40, oy = PH + 18;
      const X = (x, y) => ox + x * A + y * D, Y = (x, y) => oy + y * B;
      const ang = [[-0.55, -0.6], [3.55, -0.6], [3.55, 3.6], [-0.55, 3.6]].map(([x, y]) => `${X(x, y)},${Y(x, y)}`).join(' ');
      const fronte = [[-0.55, 3.6], [3.55, 3.6], [3.55, -0.6]].map(([x, y]) => [X(x, y), Y(x, y)]);
      let svg = `<polygon class="f3-lato" points="${fronte.map(([x, y]) => `${x},${y}`).join(' ')} ${fronte.slice().reverse().map(([x, y]) => `${x},${y + 14}`).join(' ')}"/><polygon class="f3-base" points="${ang}"/>`;
      // pioli dal fondo verso chi guarda
      const ordine = Array.from({ length: 16 }, (_, c) => c); // la fila 0 è quella in fondo: si disegna per prima
      for (const c of ordine) {
        const x = c % 4, y = Math.floor(c / 4), px = X(x, y), py = Y(x, y);
        const pieno = p.altezze[c] >= 4, puo = mio && !pieno;
        let g = `<ellipse class="f3-buco" cx="${px}" cy="${py}" rx="9" ry="5"/><rect class="f3-piolo" x="${px - 2.5}" y="${py - PH}" width="5" height="${PH}" rx="2.5"/>`;
        for (let z = 0; z < p.altezze[c]; z++) {
          const i = z * 16 + c, v = p.celle[i], cy = py - 9 - z * BH;
          g += `<circle class="f3-pall ${COL(ctx, v)} ${fila.has(i) ? 'vince' : ''} ${p.ultima === i ? 'ultima' : ''}" cx="${px}" cy="${cy}" r="${BH / 2 + 1}"/><ellipse class="f3-luce" cx="${px - 3}" cy="${cy - 4}" rx="4" ry="2.6"/>`;
        }
        if (puo) g += `<circle class="f3-anteprima ${COL(ctx, ctx.mio)}" cx="${px}" cy="${py - 9 - p.altezze[c] * BH}" r="${BH / 2}"/>`;
        svg += `<g class="f3-g ${puo ? 'puo' : ''}" ${puo ? `data-az="metti" data-c="${c}"` : ''}>${g}<rect class="f3-presa" x="${px - 8}" y="${py - PH - 4}" width="16" height="${PH + 8}"/></g>`;
      }
      const W = X(3.55, 3.6) + 12, H = Y(0, 3.6) + 22;
      // i quattro piani visti dall'alto
      const piani = [0, 1, 2, 3].map((z) => `<div class="f3-piano"><div class="f3-griglia">${Array.from({ length: 16 }, (_, c) => {
        const i = z * 16 + c, v = p.celle[i];
        const puo = mio && p.altezze[c] === z;
        return `<span class="${v === null ? '' : COL(ctx, v)} ${fila.has(i) ? 'vince' : ''} ${p.ultima === i ? 'ultima' : ''} ${puo ? 'puo' : ''}" ${puo ? `data-az="metti" data-c="${c}"` : ''}></span>`;
      }).join('')}</div><small>piano ${z + 1}${z === 0 ? ' (in basso)' : z === 3 ? ' (in alto)' : ''}</small></div>`).join('');
      const conto = (k) => `<span class="ot-conto ${p.turno === k ? 'di-turno' : ''}"><i class="f3-mini ${COL(ctx, k)}"></i><b>${esc(k === ctx.mio ? 'Tu' : ctx.nome(k))}</b></span>`;
      let msg;
      if (p.finita) msg = p.risultato.pareggio ? 'Cubo pieno: pareggio!' : p.risultato.vincitori[0] === ctx.mio ? 'Quattro in fila: hai vinto! 🎉' : `Vince ${esc(ctx.nome(p.risultato.vincitori[0]))}`;
      else msg = mio ? 'Tocca a te: scegli un piolo' : `${esc(ctx.nome(p.turno))} ci pensa…`;
      const annulla = p.puoAnnullare ? `<button type="button" class="bottone piccolo-bt" data-az="annullaMossa">↶ Annulla mossa${p.annullate ? ` <small>(${p.annullate})</small>` : ''}</button>` : '';
      return `<div class="f3"><div class="ot-punti">${conto(ctx.mio)}<span class="ot-vs">–</span>${conto(1 - ctx.mio)}</div>
        <svg class="f3-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Base con 16 pioli">${svg}</svg>
        <div class="f3-piani">${piani}</div>
        <p class="pa-msg ot-msg" aria-live="polite">${msg}</p>${annulla}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.ultima != null && primaVolta(ctx.ui, `f3-${p.nMosse}`)) suono([[300 - Math.floor(p.ultima / 16) * 30, 0.05], [200, 0.04]], { tipo: 'triangle', volume: 0.05 });
    },
    stato(ctx) { const p = ctx.partita; if (p.finita || p.turno == null) return null; return p.turno === ctx.mio ? 'Tocca a te' : `Tocca a ${ctx.nome(p.turno)}`; },
    punteggio() { return ''; },
    infoPosto(ctx, posto) { return posto === ctx.partita.primo ? '🔴 rosso' : '🟡 giallo'; },
    clic(ctx, el) {
      if (el.dataset.az === 'annullaMossa') return ctx.invia({ tipo: 'annulla' });
      if (el.dataset.az !== 'metti') return;
      ctx.invia({ tipo: 'metti', piolo: Number(el.dataset.c) });
    },
  };
  Object.assign(window.Tavoli, { forza3d: tavolo });
})();
