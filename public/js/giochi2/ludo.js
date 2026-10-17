// NON T'ARRABBIARE: la plancia a croce disegnata in SVG (11 × 11 caselle), le case negli angoli, le caselle di arrivo
// colorate verso il centro. Le pedine sono sagome SVG sopra la plancia e camminano casella per casella (Web Animations,
// che riprendono da dove erano se il tavolo si ridisegna). La plancia è girata in modo che il tuo colore sia in basso
// a sinistra. Le pedine che puoi muovere pulsano; passandoci sopra col mouse si vede dove arriverebbero.
(() => {
  const { esc, primaVolta, suono, ritardo, trascorso, calmo } = window.Nuovi;
  const COL = ['#d8342c', '#2f6fd6', '#efbd22', '#2e9e4f'];
  const CHIARO = ['#f6c9c4', '#c8d9f6', '#fbecb4', '#c5e8cf'];
  const SCURO = ['#7e1712', '#173d80', '#8a6a08', '#155c2b'];
  const NOME_COL = ['rosso', 'blu', 'giallo', 'verde'];
  // percorso di 40 caselle (x = colonna, y = riga), partendo dalla partenza del rosso e girando in senso orario
  const PERCORSO = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
    [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
  const ARRIVI = [[[1, 5], [2, 5], [3, 5], [4, 5]], [[5, 1], [5, 2], [5, 3], [5, 4]], [[9, 5], [8, 5], [7, 5], [6, 5]], [[5, 9], [5, 8], [5, 7], [5, 6]]];
  const CASE = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[9, 0], [10, 0], [9, 1], [10, 1]], [[9, 9], [10, 9], [9, 10], [10, 10]], [[0, 9], [1, 9], [0, 10], [1, 10]]];
  const PASSO_MS = 165;
  const PUNTI_DADO = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]] };

  // casella (x, y) della pedina k di un colore in posizione relativa r
  const cella = (c, k, r) => (r === -1 ? CASE[c][k] : r >= 40 ? ARRIVI[c][r - 40] : PERCORSO[(c * 10 + r) % 40]);
  const pc = (xy) => [((xy[0] + 0.5) / 11) * 100, ((xy[1] + 0.5) / 11) * 100];
  // le caselle attraversate da una mossa (da esclusa, a inclusa)
  function cammino(c, k, da, a) {
    if (da === -1) return [cella(c, k, 0)];
    const out = [];
    for (let r = da + 1; r <= a; r++) out.push(cella(c, k, r));
    return out;
  }

  // ---------- plancia (si costruisce una volta sola: non cambia mai) ----------
  let plancia = null;
  function disegnaPlancia() {
    if (plancia) return plancia;
    const C = (x, y) => [x * 10 + 5, y * 10 + 5];
    let s = '<svg class="ludo-svg" viewBox="0 0 110 110" aria-hidden="true"><defs>';
    for (let c = 0; c < 4; c++) s += `<radialGradient id="ludo-g${c}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".28" stop-color="${COL[c]}"/><stop offset="1" stop-color="${SCURO[c]}"/></radialGradient>`;
    s += '<radialGradient id="ludo-legno" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#fbf3dc"/><stop offset="1" stop-color="#ead8ad"/></radialGradient></defs>';
    s += '<rect x=".6" y=".6" width="108.8" height="108.8" rx="7" fill="url(#ludo-legno)" stroke="#8a5a2b" stroke-width="1.2"/>';
    // case negli angoli
    const angoli = [[0, 0], [9, 0], [9, 9], [0, 9]];
    angoli.forEach(([x, y], c) => {
      s += `<rect x="${x * 10 + 1.2}" y="${y * 10 + 1.2}" width="17.6" height="17.6" rx="4.5" fill="${CHIARO[c]}" stroke="${COL[c]}" stroke-width="1.1"/>`;
      for (const [cx, cy] of CASE[c]) s += `<circle cx="${cx * 10 + 5}" cy="${cy * 10 + 5}" r="3.6" fill="#fffaf0" stroke="${COL[c]}" stroke-width=".9"/>`;
    });
    // il sentiero sotto le caselle
    s += `<polygon points="${PERCORSO.map((p) => C(...p).join(',')).join(' ')}" fill="none" stroke="#b99a66" stroke-width="1.4" stroke-linejoin="round"/>`;
    // centro: quattro triangoli colorati
    const m = 55;
    const tri = [[[40, 50], [40, 60], [m, m]], [[50, 40], [60, 40], [m, m]], [[70, 50], [70, 60], [m, m]], [[50, 70], [60, 70], [m, m]]];
    tri.forEach((t, c) => { s += `<polygon points="${t.map((p) => p.join(',')).join(' ')}" fill="${COL[c]}" opacity=".85"/>`; });
    s += `<rect x="50" y="50" width="10" height="10" rx="2" fill="#fffaf0" stroke="#8a5a2b" stroke-width=".6"/><text x="55" y="57.6" text-anchor="middle" font-size="6.5">🏁</text>`;
    // caselle del percorso (le partenze colorate)
    PERCORSO.forEach(([x, y], i) => {
      const part = i % 10 === 0 ? i / 10 : -1;
      s += `<circle cx="${x * 10 + 5}" cy="${y * 10 + 5}" r="4.25" fill="${part >= 0 ? COL[part] : '#fffdf6'}" stroke="${part >= 0 ? SCURO[part] : '#6b5537'}" stroke-width=".8"/>`;
      if (part >= 0) {
        // freccia che indica il verso di gioco
        const [nx, ny] = PERCORSO[i + 1];
        const ang = Math.atan2(ny - y, nx - x) * 180 / Math.PI;
        s += `<path d="M-1.6 -2 L2 0 L-1.6 2 Z" fill="#fff" transform="translate(${x * 10 + 5} ${y * 10 + 5}) rotate(${ang})"/>`;
      }
    });
    ARRIVI.forEach((arr, c) => arr.forEach(([x, y]) => { s += `<circle cx="${x * 10 + 5}" cy="${y * 10 + 5}" r="4.25" fill="${CHIARO[c]}" stroke="${COL[c]}" stroke-width="1.1"/>`; }));
    s += '</svg>';
    plancia = s;
    return s;
  }
  const pedinaSvg = (c) => `<svg class="ludo-sag" viewBox="0 0 40 40"><ellipse cx="20" cy="33" rx="12.5" ry="4" fill="rgba(0,0,0,.35)"/><path d="M9 32 Q9 26 14.5 24.6 L17.4 17.5 Q13.3 15.4 13.6 10.6 A6.6 6.6 0 1 1 26.4 10.6 Q26.7 15.4 22.6 17.5 L25.5 24.6 Q31 26 31 32 Z" fill="url(#ludo-g${c})" stroke="${SCURO[c]}" stroke-width="1.1"/><ellipse cx="17.3" cy="8.4" rx="2" ry="2.8" fill="#fff" opacity=".6"/></svg>`;
  const dadoSvg = (v, cls = '', st = '') => `<svg class="ludo-dado ${cls}" viewBox="0 0 100 100" style="${st}"><rect x="5" y="5" width="90" height="90" rx="18"/>${(PUNTI_DADO[v] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</svg>`;

  let ctxL = null;
  // un clic già mandato (per 1,5 secondi non se ne manda un altro uguale: se il server lo rifiuta si può riprovare)
  const inviato = (ui, k) => ui.inviato === k && Date.now() - (ui.inviatoT || 0) < 1500;
  const segna = (ui, k) => { ui.inviato = k; ui.inviatoT = Date.now(); };
  const mioTurno = (p, ctx) => p.turno === ctx.mio && !p.inAttesa && !p.finita;

  const tavolo = {
    libero: true,
    panno(ctx) {
      ctxL = ctx;
      const p = ctx.partita, ui = ctx.ui;
      const mio = mioTurno(p, ctx);
      const mioCol = p.colore[ctx.mio] ?? 3;
      const giro = ((3 - mioCol + 4) % 4) * 90; // il mio colore in basso a sinistra
      const muovibili = new Map(mio && p.fase === 'muovi' && !inviato(ui, p.nTiro) ? p.mosse.map((m) => [m.k, m]) : []);
      let pedine = '', mete = '';
      for (let q = 0; q < p.n; q++) {
        const c = p.colore[q];
        p.pos[q].forEach((r, k) => {
          const [x, y] = pc(cella(c, k, r));
          const m = q === ctx.mio ? muovibili.get(k) : null;
          const att = `class="ludo-ped ${m ? 'puo' : ''} ${q === p.turno && !p.finita ? 'turno' : ''}" data-ped="${q}-${k}" style="left:${x}%;top:${y}%;--giro:${-giro}deg"`;
          if (m) {
            const [mx, my] = pc(cella(c, k, m.a));
            mete += `<span class="ludo-meta ${m.mangia ? 'mangia' : ''}" data-k="${k}" style="left:${mx}%;top:${my}%;--c:${COL[c]}"></span>`;
            const dove = m.a >= 40 ? 'nell\'arrivo' : r === -1 ? 'fuori dalla casa' : `avanti di ${m.a - r}`;
            pedine += `<button type="button" ${att} data-az="muovi" data-k="${k}" aria-label="Muovi la pedina ${k + 1} ${dove}${m.mangia ? ' e mangia' : ''}">${pedinaSvg(c)}</button>`;
          } else pedine += `<div ${att} aria-hidden="true">${pedinaSvg(c)}</div>`;
        });
      }
      // pannello laterale: giocatori, dado, messaggio
      const giocatori = Array.from({ length: p.n }, (_, q) => {
        const c = p.colore[q];
        const pallini = Array.from({ length: p.npd }, (_, k) => `<i class="${k < p.arrivate[q] ? 'pieno' : ''}"></i>`).join('');
        return `<li class="ludo-gio ${q === p.turno && !p.finita ? 'di-turno' : ''}" style="--c:${COL[c]}"><span class="ludo-pal"></span><b>${esc(q === ctx.mio ? 'Tu' : ctx.nome(q))}</b><span class="ludo-arr" title="Pedine arrivate">${pallini}</span></li>`;
      }).join('');
      const chiTira = p.tiroDi ?? p.turno;
      const dadoHtml = p.dado
        ? dadoSvg(p.dado, `rotola ${p.dado === 6 ? 'sei' : ''}`, `${ritardo(ui, `ludo-d-${p.nTiro}`)};--c:${COL[p.colore[chiTira]]}`)
        : dadoSvg(6, 'spento', `--c:${COL[p.colore[p.turno ?? 0]]}`);
      const puoTirare = mio && p.fase === 'tira' && !inviato(ui, `t${p.nTiro}`);
      const dadoBox = puoTirare
        ? `<button type="button" class="ludo-dadobox puo" data-az="tira" aria-label="Tira il dado">${dadoHtml}</button>`
        : `<div class="ludo-dadobox">${dadoHtml}</div>`;
      let msg;
      const nomeT = p.turno != null ? esc(ctx.nome(p.turno)) : '';
      if (p.finita) msg = p.risultato.vincitori[0] === ctx.mio ? 'Hai vinto! 🏆' : `Vince ${esc(ctx.nome(p.risultato.vincitori[0]))} 🏆`;
      else if (p.fase === 'passa') msg = p.turno === ctx.mio ? `Hai fatto ${p.dado}: nessuna mossa` : `${nomeT} ha fatto ${p.dado}: nessuna mossa`;
      else if (mio && p.fase === 'tira') {
        const senza = !p.pos[ctx.mio].some((r) => r >= 0 && r < 40);
        const tent = p.treTiri && senza && p.tentativi > 0 ? ` <small>(tentativo ${p.tentativi + 1} di 3 per fare 6)</small>` : '';
        if (p.dado === 6 && p.tiroDi === ctx.mio) msg = `Hai fatto 6: <b>tira ancora!</b>${tent}`;
        else if (tent) msg = `Hai fatto ${p.dado}: <b>ritira</b>${tent}`;
        else msg = '<b>Tira il dado</b>';
      } else if (mio) msg = new Set(p.mosse.map((m) => p.pos[ctx.mio][m.k])).size === 1 ? `Hai fatto <b>${p.dado}</b>: la pedina si muove…` : `Hai fatto <b>${p.dado}</b>: clicca la pedina da muovere`;
      else if (p.dado && p.tiroDi === p.turno && p.fase === 'muovi') msg = `${nomeT} ha fatto <b>${p.dado}</b> e sceglie…`;
      else if (p.dado && p.tiroDi === p.turno) msg = `${nomeT} ha fatto ${p.dado}: ${p.dado === 6 ? 'tira ancora' : 'ritira'}…`;
      else msg = `Tocca a ${nomeT}…`;
      const tasto = puoTirare ? '<button type="button" class="bottone primario ludo-tira" data-az="tira">🎲 Tira il dado</button>' : '';
      const leg = `<span class="ludo-leg">Il tuo colore: <b style="color:${COL[mioCol]}">${NOME_COL[mioCol]}</b> · in basso a sinistra</span>`;
      return `<div class="ludo">
        <div class="ludo-tav ${mio && p.fase === 'muovi' ? 'scegli' : ''}" style="--giro:${giro}deg">${disegnaPlancia()}<div class="ludo-strato">${mete}${pedine}</div></div>
        <aside class="ludo-lato">
          <ul class="ludo-gioc">${giocatori}</ul>
          <div class="ludo-centro">${dadoBox}<p class="ludo-msg" aria-live="polite">${msg}</p>${tasto}</div>
          ${leg}
        </aside></div>`;
    },
    azioni() { return ''; },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      // il dado appena tirato
      if (p.dado && primaVolta(ui, `ludo-sd-${p.nTiro}`)) suono([[260, 0.03], [380, 0.03], [300, 0.03], [440, 0.04], [p.dado === 6 ? 880 : 520, 0.08]], { tipo: 'square', volume: 0.035 });
      // la pedina che cammina casella per casella (e quella mangiata che torna a casa)
      const u = p.ultima;
      if (u && !calmo()) {
        const c = p.colore[u.posto];
        const passi = cammino(c, u.k, u.da, u.a);
        const durata = passi.length * PASSO_MS;
        const t = trascorso(ui, `ludo-m-${u.n}`);
        const el = document.querySelector(`.ludo-ped[data-ped="${u.posto}-${u.k}"]`);
        if (el && t < durata + 40) {
          const punti = [pc(cella(c, u.k, u.da)), ...passi.map(pc)];
          const fr = [];
          punti.forEach(([x, y], i) => {
            if (i > 0) {
              const [px, py] = punti[i - 1];
              fr.push({ left: `${(x + px) / 2}%`, top: `${(y + py) / 2}%`, transform: 'translate(-50%, -50%) scale(1.28)', offset: (i - 0.5) / (punti.length - 1) });
            }
            fr.push({ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%) scale(1)', offset: i / (punti.length - 1) });
          });
          el.style.zIndex = 6;
          const an = el.animate(fr, { duration: durata, easing: 'linear', fill: 'backwards' });
          an.currentTime = Math.max(0, t);
          an.onfinish = () => { el.style.zIndex = ''; };
        }
        if (u.mangiata && primaVolta(ui, `ludo-sm-${u.n}`)) setTimeout(() => suono([[300, 0.08], [200, 0.1], [140, 0.18]], { tipo: 'sawtooth', volume: 0.04 }), Math.max(0, durata - t));
        if (u.mangiata) {
          const m = u.mangiata, cm = p.colore[m.posto];
          const em = document.querySelector(`.ludo-ped[data-ped="${m.posto}-${m.k}"]`);
          const volo = 520;
          if (em && t < durata + volo) {
            const [ax, ay] = pc(cella(cm, m.k, m.da)), [bx, by] = pc(cella(cm, m.k, -1));
            const an = em.animate([
              { left: `${ax}%`, top: `${ay}%`, transform: 'translate(-50%, -50%) scale(1)', offset: 0 },
              { left: `${ax}%`, top: `${ay}%`, transform: 'translate(-50%, -50%) scale(1.15) rotate(25deg)', offset: durata / (durata + volo) },
              { left: `${(ax + bx) / 2}%`, top: `${(ay + by) / 2}%`, transform: 'translate(-50%, -50%) scale(1.6) rotate(200deg)', offset: (durata + volo / 2) / (durata + volo) },
              { left: `${bx}%`, top: `${by}%`, transform: 'translate(-50%, -50%) scale(1) rotate(360deg)', offset: 1 },
            ], { duration: durata + volo, easing: 'ease-in-out', fill: 'backwards' });
            an.currentTime = Math.max(0, t);
          }
        }
        if (primaVolta(ui, `ludo-sp-${u.n}`) && t < 400) {
          suono(passi.slice(0, 7).map((_, i) => [420 + i * 35, 0.05]), { tipo: 'triangle', volume: 0.025 });
        }
      }
      if (p.finita && primaVolta(ui, 'ludo-fine')) suono([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]], { volume: 0.07 });
      // una sola pedina (o più pedine equivalenti, tutte in casa) da muovere: si muove da sola dopo un attimo
      if (mioTurno(p, ctx) && p.fase === 'muovi' && p.mosse.length && !inviato(ui, p.nTiro)) {
        const origini = new Set(p.mosse.map((m) => p.pos[ctx.mio][m.k]));
        if (origini.size === 1 && primaVolta(ui, `ludo-auto-${p.nTiro}`)) {
          const n = p.nTiro, k = p.mosse[0].k;
          setTimeout(() => {
            const q = ctx.stato && ctx.partita;
            if (!q || q.gioco !== 'ludo' || q.nTiro !== n || q.fase !== 'muovi' || inviato(ctx.ui, n) || q.turno !== ctx.mio) return;
            segna(ctx.ui, n);
            ctx.invia({ tipo: 'muovi', pedina: k });
          }, 650);
        }
      }
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita || p.turno == null) return null;
      if (p.turno !== ctx.mio) return `Tocca a ${ctx.nome(p.turno)}`;
      return p.fase === 'muovi' ? 'Muovi una pedina' : 'Tira il dado';
    },
    statoAttesa: (ctx) => (ctx.partita.turno === ctx.mio ? 'Nessuna mossa' : `${ctx.nome(ctx.partita.turno)}: nessuna mossa`),
    punteggio() { return ''; },
    infoPosto(ctx, posto) { const p = ctx.partita, c = p.colore[posto]; return `<span style="color:${COL[c]}">●</span> ${NOME_COL[c]} · ${p.arrivate[posto]}/${p.npd} arrivate`; },
    clic(ctx, el) {
      const p = ctx.partita, ui = ctx.ui;
      if (el.dataset.az === 'tira') {
        if (inviato(ui, `t${p.nTiro}`)) return;
        segna(ui, `t${p.nTiro}`);
        return ctx.invia({ tipo: 'tira' });
      }
      if (el.dataset.az === 'muovi') {
        if (inviato(ui, p.nTiro)) return;
        segna(ui, p.nTiro);
        suono([[620, 0.04]], { volume: 0.03 });
        return ctx.invia({ tipo: 'muovi', pedina: Number(el.dataset.k) });
      }
    },
  };
  // barra spaziatrice (o Invio) per tirare il dado
  document.addEventListener('keydown', (e) => {
    const ctx = ctxL;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'ludo') return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, [data-az], [contenteditable]')) return;
    const p = ctx.partita;
    if (!mioTurno(p, ctx) || p.fase !== 'tira' || inviato(ctx.ui, `t${p.nTiro}`)) return;
    e.preventDefault();
    segna(ctx.ui, `t${p.nTiro}`);
    ctx.invia({ tipo: 'tira' });
  });
  Object.assign(window.Tavoli, { ludo: tavolo });
})();
