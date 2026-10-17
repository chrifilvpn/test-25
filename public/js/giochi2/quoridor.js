// MURI E PEDINE: tavola 9×9 in SVG, girata in modo che la tua partenza sia in basso. Le caselle dove puoi andare
// sono evidenziate; passando col mouse sulle scanalature compare l'anteprima del muro (verde se si può mettere,
// rossa se no): clic per metterlo. Sul telefono il primo tocco mostra l'anteprima, il secondo la conferma.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const L = 9, S = 62, G = 14, P = S + G, LATO = L * S + (L - 1) * G, M = 26, TOT = LATO + 2 * M;
  const COLORI = ['#e05141', '#3b7fe0', '#e8b630', '#3fae5c'];
  const NOMI_COLORI = ['rosso', 'blu', 'giallo', 'verde'];
  const ANGOLO = [0, 90, 180, 270]; // rotazione per portare il lato in basso
  const xy = (i) => [M + (i % L) * P, M + Math.floor(i / L) * P];
  const rettMuro = (w) => {
    const o = w >> 6, r = (w >> 3) & 7, c = w & 7;
    return o === 0 ? { x: M + c * P, y: M + r * P + S, w: 2 * S + G, h: G } : { x: M + c * P + S, y: M + r * P, w: G, h: 2 * S + G };
  };
  const touch = () => window.matchMedia && window.matchMedia('(hover: none)').matches;

  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, io = ctx.mio;
      const mio = p.turno === io && !p.finita;
      const ang = ANGOLO[p.lati[io] || 0];
      const cx = TOT / 2;
      const raddrizza = (x, y) => (ang ? ` transform="rotate(${-ang} ${x} ${y})"` : '');
      const mosse = new Set(mio ? p.mosse : []);
      const ok = new Set(mio && p.rimasti[io] > 0 ? p.muriOk : []);
      let s = `<rect class="qr-fondo" x="0" y="0" width="${TOT}" height="${TOT}" rx="18"/>`;
      // i lati di arrivo, del colore di chi ci deve arrivare
      p.lati.forEach((lato, k) => {
        const col = COLORI[k]; // il lato dove deve arrivare (0 parte in basso e arriva in alto, 1 da sinistra a destra…)
        const b = [[M - 4, M - 18, LATO + 8, 10], [M + LATO + 8, M - 4, 10, LATO + 8], [M - 4, M + LATO + 8, LATO + 8, 10], [M - 18, M - 4, 10, LATO + 8]][lato];
        s += `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="5" fill="${col}" opacity=".85"/>`;
      });
      for (let i = 0; i < L * L; i++) {
        const [x, y] = xy(i);
        const puo = mosse.has(i);
        s += `<rect class="qr-cella ${puo ? 'puo' : ''} ${p.ultima && p.ultima.tipo === 'muovi' && p.ultima.da === i ? 'da' : ''}" x="${x}" y="${y}" width="${S}" height="${S}" rx="7" ${puo ? `data-az="muovi" data-i="${i}" role="button" aria-label="Vai qui"` : ''}/>`;
      }
      // muri messi
      for (const [w, chi] of p.muri) {
        const r = rettMuro(w);
        const nuovo = p.ultima && p.ultima.tipo === 'muro' && p.ultima.muro === w;
        s += `<rect class="qr-muro ${nuovo ? 'nuovo' : ''}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" style="--c:${COLORI[chi]}"/>`;
      }
      // pedine
      p.pos.forEach((i, k) => {
        const [x, y] = xy(i);
        const xc = x + S / 2, yc = y + S / 2;
        s += `<g class="qr-ped ${p.turno === k ? 'di-turno' : ''}"><circle cx="${xc}" cy="${yc}" r="${S * 0.36}" fill="${COLORI[k]}"/><circle cx="${xc}" cy="${yc}" r="${S * 0.36}" class="qr-luce"/>
          <text x="${xc}" y="${yc + 7}"${raddrizza(xc, yc)}>${p.distanze[k]}</text></g>`;
      });
      // zone per i muri (solo a chi è di turno, se ne ha)
      if (mio && p.rimasti[io] > 0) {
        for (let w = 0; w < 128; w++) {
          const o = w >> 6, r = (w >> 3) & 7, c = w & 7;
          const m = rettMuro(w);
          // zona sensibile: la scanalatura intorno all'incrocio, larga una casella
          const z = o === 0 ? { x: M + c * P + S / 2, y: M + r * P + S - 3, w: P, h: G + 6 } : { x: M + c * P + S - 3, y: M + r * P + S / 2, w: G + 6, h: P };
          const anteprima = ui.qrAnte === w;
          s += `<g class="qr-zona ${ok.has(w) ? 'si' : 'no'} ${anteprima ? 'ante' : ''}" data-az="muro" data-w="${w}" role="button" aria-label="Muro ${o ? 'verticale' : 'orizzontale'}">
            <rect class="qr-fantasma" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="4"/><rect class="qr-presa" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}"/></g>`;
        }
      }
      const svg = `<svg class="qr-svg" viewBox="0 0 ${TOT} ${TOT}" role="img" aria-label="Tavola di Muri e pedine"><g${ang ? ` transform="rotate(${ang} ${cx} ${cx})"` : ''}>${s}</g></svg>`;
      const nome = (k) => (k === io ? 'Tu' : esc(ctx.nome(k)));
      const righe = p.pos.map((_, k) => `<div class="qr-gioc ${p.turno === k && !p.finita ? 'di-turno' : ''}"><span class="qr-pallino" style="background:${COLORI[k]}"></span><b>${nome(k)}</b>
        <span class="qr-dist" title="Caselle all'arrivo">🏁 ${p.distanze[k]}</span><span class="qr-muretti" title="Muri rimasti">${'<i></i>'.repeat(p.rimasti[k])}${p.rimasti[k] ? '' : '<small>niente muri</small>'}</span></div>`).join('');
      let msg;
      if (p.finita) msg = p.risultato.pareggio ? 'Pareggio' : p.risultato.vincitori[0] === io ? 'Hai vinto! 🎉' : `Vince ${esc(ctx.nome(p.risultato.vincitori[0]))}`;
      else if (mio) msg = ui.qrAnte != null ? 'Tocca di nuovo il muro per confermarlo' : p.rimasti[io] ? 'Muovi la pedina (caselle evidenziate) o metti un muro nelle scanalature' : 'Muovi la pedina';
      else msg = `${esc(ctx.nome(p.turno))} ci pensa…`;
      return `<div class="qr">${svg}<div class="qr-lato"><p class="qr-tu">Tu sei il <b style="color:${COLORI[io]}">${NOMI_COLORI[io]}</b>: arriva in alto</p>${righe}<p class="qr-msg" aria-live="polite">${msg}</p></div></div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.ultima && primaVolta(ctx.ui, `qr-${p.nMosse}`)) suono(p.ultima.tipo === 'muro' ? [[180, 0.06], [140, 0.08]] : [[520, 0.04]], { tipo: p.ultima.tipo === 'muro' ? 'square' : 'triangle', volume: 0.035 });
    },
    stato(ctx) { const p = ctx.partita; return p.turno === ctx.mio && !p.finita ? 'Tocca a te' : null; },
    punteggio() { return ''; },
    infoPosto(ctx, k) { const p = ctx.partita; return `🏁 ${p.distanze[k]} · ${p.rimasti[k]} muri`; },
    clic(ctx, el) {
      const p = ctx.partita, ui = ctx.ui, az = el.dataset.az;
      if (az === 'muovi') { ui.qrAnte = null; return ctx.invia({ tipo: 'muovi', cella: Number(el.dataset.i) }); }
      if (az === 'muro') {
        const w = Number(el.dataset.w);
        if (touch() && ui.qrAnte !== w) { ui.qrAnte = w; return ctx.ridisegna(); }
        ui.qrAnte = null;
        if (!p.muriOk.includes(w)) { ctx.avviso('Lì il muro non si può mettere'); return ctx.ridisegna(); }
        return ctx.invia({ tipo: 'muro', o: w >> 6 ? 'v' : 'h', r: (w >> 3) & 7, c: w & 7 });
      }
      return undefined;
    },
  };
  Object.assign(window.Tavoli, { quoridor: tavolo });
})();
