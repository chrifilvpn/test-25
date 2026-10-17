// DAMA CINESE: la stella in SVG, girata in modo che la tua punta sia in basso. Le punte sono colorate come chi ci
// parte; clic su una tua biglia e poi su una buca illuminata. L'ultima mossa resta segnata con il percorso dei salti.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  // stesse buche e nello stesso ordine del server
  const CELLE = [];
  for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++) {
    const s = -q - r;
    if (s < -8 || s > 8) continue;
    if ((q >= -4 && r >= -4 && s >= -4) || (q <= 4 && r <= 4 && s <= 4)) CELLE.push([q, r, s]);
  }
  const IN_PUNTA = [([q]) => q > 4, ([, , s]) => s < -4, ([, r]) => r > 4, ([q]) => q < -4, ([, , s]) => s > 4, ([, r]) => r < -4];
  const PUNTA_DI = CELLE.map((c) => IN_PUNTA.findIndex((f) => f(c)));
  const COLORI = ['#e04a3c', '#3b80e0', '#e9b62f', '#3cab5b', '#9b59d0', '#f08a2a'];
  const NOMI = ['rosso', 'blu', 'giallo', 'verde', 'viola', 'arancio'];
  const D = 34, R = 13;
  const base = (i) => { const [q, r] = CELLE[i]; return [D * (q + r / 2), D * r * Math.sqrt(3) / 2]; };
  // direzione di ogni punta (centro della punta)
  const centroPunta = (k) => { let x = 0, y = 0, n = 0; CELLE.forEach((c, i) => { if (PUNTA_DI[i] === k) { const [a, b] = base(i); x += a; y += b; n++; } }); return [x / n, y / n]; };

  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, io = ctx.mio;
      const mia = p.punta[io];
      const [cx, cy] = centroPunta(mia);
      const rot = Math.PI / 2 - Math.atan2(cy, cx); // porta la mia punta in basso
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const pos = (i) => { const [x, y] = base(i); return [300 + x * cos - y * sin, 300 + x * sin + y * cos]; };
      const colorePunta = (k) => { const chi = p.punta.indexOf(k); return chi >= 0 ? COLORI[chi] : null; };
      const metaColore = (k) => { const chi = p.meta.indexOf(k); return chi >= 0 ? COLORI[chi] : null; };
      const mio = p.turno === io && !p.finita;
      if (ui.dcSel != null && !(mio && p.mosse[ui.dcSel])) ui.dcSel = null;
      const mete = new Set(ui.dcSel != null ? p.mosse[ui.dcSel] : []);
      let s = '<polygon class="dc-fondo" points="300,4 556,152 556,448 300,596 44,448 44,152"/>';
      // le punte colorate (sfondo leggero)
      CELLE.forEach((c, i) => {
        const k = PUNTA_DI[i];
        const [x, y] = pos(i);
        const col = k >= 0 ? (colorePunta(k) || metaColore(k)) : null;
        if (col) s += `<circle cx="${x}" cy="${y}" r="${R + 5}" fill="${col}" opacity=".22"/>`;
      });
      // percorso dell'ultima mossa
      if (p.ultima && p.ultima.strada.length > 1) s += `<polyline class="dc-strada" points="${p.ultima.strada.map((i) => pos(i).join(',')).join(' ')}" stroke="${COLORI[p.ultima.posto]}"/>`;
      CELLE.forEach((c, i) => {
        const [x, y] = pos(i);
        const chi = p.occ[i];
        if (chi < 0) {
          const meta = mete.has(i);
          s += `<circle class="dc-buca ${meta ? 'meta' : ''}" cx="${x}" cy="${y}" r="${meta ? R - 2 : R - 5}"${meta ? ` data-az="a" data-i="${i}" role="button" aria-label="Porta qui la biglia"` : ''}/>`;
        } else {
          const mobile = mio && chi === io && p.mosse[i];
          const ultima = p.ultima && p.ultima.strada[p.ultima.strada.length - 1] === i;
          s += `<g class="dc-biglia ${mobile ? 'mobile' : ''} ${ui.dcSel === i ? 'scelta' : ''} ${ultima ? 'ultima' : ''}"${mobile ? ` data-az="da" data-i="${i}" role="button" aria-label="Biglia"` : ''}>
            <circle cx="${x}" cy="${y}" r="${R}" fill="${COLORI[chi]}"/><circle cx="${x - R * 0.35}" cy="${y - R * 0.35}" r="${R * 0.35}" fill="#fff" opacity=".45"/></g>`;
        }
      });
      const svg = `<svg class="dc-svg" viewBox="0 0 600 600" role="img" aria-label="Stella della dama cinese">${s}</svg>`;
      const nome = (k) => (k === io ? 'Tu' : esc(ctx.nome(k)));
      const righe = p.punta.map((_, k) => `<div class="dc-gioc ${p.turno === k && !p.finita ? 'di-turno' : ''}"><span class="dc-pal" style="background:${COLORI[k]}"></span><b>${nome(k)}</b><small title="Strada fatta">${p.avanti[k]}%</small></div>`).join('');
      let msg;
      if (p.finita) msg = p.risultato.vincitori[0] === io ? 'Hai vinto! 🎉' : `Vince ${esc(ctx.nome(p.risultato.vincitori[0]))}`;
      else if (mio) msg = ui.dcSel != null ? 'Ora clicca la buca dove portarla' : 'Clicca una tua biglia';
      else msg = `${esc(ctx.nome(p.turno))} ci pensa…`;
      return `<div class="dc">${svg}<div class="dc-lato"><p class="dc-tu">Sei il <b style="color:${COLORI[io]}">${NOMI[io]}</b>: porta le biglie nella punta in alto</p>${righe}<p class="dc-msg" aria-live="polite">${msg}</p></div></div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.ultima && primaVolta(ctx.ui, `dc-${p.nMosse}`)) suono(p.ultima.strada.slice(1).map((_, k) => [440 + k * 70, 0.05]), { volume: 0.035 });
    },
    stato(ctx) { const p = ctx.partita; return p.turno === ctx.mio && !p.finita ? 'Tocca a te' : null; },
    punteggio() { return ''; },
    infoPosto(ctx, k) { return `strada fatta ${ctx.partita.avanti[k]}%`; },
    clic(ctx, el) {
      const ui = ctx.ui, az = el.dataset.az, i = Number(el.dataset.i);
      if (az === 'da') { ui.dcSel = ui.dcSel === i ? null : i; return ctx.ridisegna(); }
      if (az === 'a' && ui.dcSel != null) { const da = ui.dcSel; ui.dcSel = null; return ctx.invia({ tipo: 'muovi', da, a: i }); }
      return undefined;
    },
  };
  Object.assign(window.Tavoli, { damacinese: tavolo });
})();
