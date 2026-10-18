// GIOCO DELL'OCA: la spirale di 64 caselle (partenza + 63) su una griglia 8 × 8, dall'angolo in basso a sinistra
// verso il centro. Tra un giro e l'altro della spirale c'è un "muro" più spesso, così il percorso si legge bene.
// Le pedine camminano casella per casella (Web Animations, riprendono da dove erano se il tavolo si ridisegna);
// i salti (ponte, labirinto, scheletro, primo tiro) sono un volo ad arco. A squadre l'elenco dei giocatori è diviso per
// squadra e chi è già al 63 tira per il compagno.
(() => {
  const { esc, primaVolta, suono, ritardo, trascorso, calmo } = window.Nuovi;
  const L = 8;
  const COL = ['#d8342c', '#2f6fd6', '#efbd22', '#2e9e4f', '#8e44ad', '#ef7d22'];
  const SCURO = ['#7e1712', '#173d80', '#8a6a08', '#155c2b', '#4a1f60', '#8a4207'];
  const OCHE = new Set([5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]);
  const SPECIALI = {
    0: ['🚩', 'Partenza'], 6: ['🌉', 'Ponte'], 19: ['🍺', 'Locanda'], 31: ['🕳️', 'Pozzo'], 42: ['🌀', 'Labirinto'], 52: ['⛓️', 'Prigione'], 58: ['💀', 'Scheletro'], 63: ['🏆', 'Arrivo'],
  };
  const PASSO_MS = 190, SALTO_MS = 650;
  const PUNTI_DADO = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]] };

  // la spirale: casella k → [colonna, riga]
  const SPIRALE = (() => {
    const out = [];
    let x0 = 0, y0 = 0, x1 = L - 1, y1 = L - 1;
    while (x0 <= x1 && y0 <= y1) {
      for (let x = x0; x <= x1; x++) out.push([x, y1]);           // in basso, verso destra
      for (let y = y1 - 1; y >= y0; y--) out.push([x1, y]);       // a destra, verso l'alto
      if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push([x, y0]); // in alto, verso sinistra
      if (x0 < x1) for (let y = y0 + 1; y <= y1 - 1; y++) out.push([x0, y]); // a sinistra, verso il basso
      x0++; y0++; x1--; y1--;
    }
    return out;
  })();
  const INDICE = {};
  SPIRALE.forEach(([x, y], k) => { INDICE[`${x},${y}`] = k; });
  const pc = (k, slot = 0, tot = 1) => {
    const [x, y] = SPIRALE[k];
    // più pedine nella stessa casella: si dispongono in cerchio
    let dx = 0, dy = 0;
    if (tot > 1) { const a = (slot / tot) * Math.PI * 2 - Math.PI / 2; dx = Math.cos(a) * 0.24; dy = Math.sin(a) * 0.24; }
    return [((x + 0.5 + dx) / L) * 100, ((y + 0.5 + dy) / L) * 100];
  };

  const oca = '<svg class="oca-oca" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 27 Q6 20 13 18 Q20 17 24 21 L26 12 Q25 6 29 5 Q33 5 33 9 L37 10 L33 12 L31 21 Q32 31 22 33 Q11 34 8 27 Z" fill="#fff" stroke="#3b3b3b" stroke-width="1.3"/><circle cx="30" cy="8" r="1.1" fill="#222"/><path d="M14 23 Q19 21 23 25" fill="none" stroke="#9aa" stroke-width="1.3"/><path d="M17 33 L16 37 M24 33 L25 37" stroke="#ef8a1f" stroke-width="1.8"/></svg>';
  let griglia = null;
  function disegnaGriglia() {
    if (griglia) return griglia;
    let s = '';
    for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
      const k = INDICE[`${x},${y}`];
      // muri: un lato è "aperto" solo verso la casella prima o dopo nella spirale
      const vicino = (nx, ny) => { const j = INDICE[`${nx},${ny}`]; return j !== undefined && Math.abs(j - k) === 1; };
      const b = [vicino(x, y - 1), vicino(x + 1, y), vicino(x, y + 1), vicino(x - 1, y)].map((v) => (v ? '1px' : '3px')).join(' ');
      const sp = SPECIALI[k];
      const tipo = OCHE.has(k) ? 'oca' : sp ? `sp sp${k}` : '';
      const dentro = OCHE.has(k) ? oca : sp ? `<span class="oca-ico">${sp[0]}</span><small>${sp[1]}</small>` : '';
      s += `<div class="oca-cas ${tipo} ${k % 2 ? 'dispari' : ''}" style="border-width:${b}" title="${sp ? sp[1] : OCHE.has(k) ? 'Oca' : ''}"><b>${k || ''}</b>${dentro}</div>`;
    }
    griglia = s;
    return s;
  }
  const pedinaSvg = (q) => `<svg class="oca-sag" viewBox="0 0 40 40"><ellipse cx="20" cy="33" rx="11" ry="3.6" fill="rgba(0,0,0,.35)"/><path d="M10 32 Q10 26 15 24.6 L17.6 17.5 Q13.6 15.4 13.9 10.8 A6.3 6.3 0 1 1 26.1 10.8 Q26.4 15.4 22.4 17.5 L25 24.6 Q30 26 30 32 Z" fill="${COL[q]}" stroke="${SCURO[q]}" stroke-width="1.3"/><ellipse cx="17.4" cy="8.6" rx="2" ry="2.8" fill="#fff" opacity=".65"/></svg>`;
  const dadoSvg = (v, st) => `<svg class="oca-dado" viewBox="0 0 100 100" style="${st}"><rect x="5" y="5" width="90" height="90" rx="18"/>${(PUNTI_DADO[v] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</svg>`;

  let ctxO = null;
  const mioTurno = (p, ctx) => p.turno === ctx.mio && !p.inAttesa && !p.finita;
  const inviato = (ui, k) => ui.inviato === k && Date.now() - (ui.inviatoT || 0) < 1500;
  const tira = (ctx) => { const p = ctx.partita; if (inviato(ctx.ui, p.nTiro)) return; ctx.ui.inviato = p.nTiro; ctx.ui.inviatoT = Date.now(); ctx.invia({ tipo: 'tira' }); };

  const tavolo = {
    libero: true,
    panno(ctx) {
      ctxO = ctx;
      const p = ctx.partita, ui = ctx.ui, mio = mioTurno(p, ctx);
      // pedine: quelle nella stessa casella si fanno spazio
      const perCasella = {};
      p.pos.forEach((c, q) => { (perCasella[c] = perCasella[c] || []).push(q); });
      const pedine = p.pos.map((c, q) => {
        const gruppo = perCasella[c];
        const [x, y] = pc(c, gruppo.indexOf(q), gruppo.length);
        return `<div class="oca-ped ${q === p.turno && !p.finita ? 'turno' : ''}" data-ped="${q}" style="left:${x}%;top:${y}%">${pedinaSvg(q)}</div>`;
      }).join('');
      const stato = (q) => (p.bloccato[q] === 'pozzo' ? '🕳️ nel pozzo' : p.bloccato[q] === 'prigione' ? '⛓️ in prigione' : p.fermo[q] > 0 ? `🍺 ferma ${p.fermo[q]}` : '');
      const riga = (q) => `<li class="oca-gio ${q === p.turno && !p.finita ? 'di-turno' : ''}" style="--c:${COL[q]}"><span class="oca-pal"></span><b>${esc(q === ctx.mio ? 'Tu' : ctx.nome(q))}</b><small>${p.pos[q] === 63 ? '🏁 arrivato' : stato(q)}</small><strong>${p.pos[q]}</strong></li>`;
      let giocatori;
      if (p.aSquadre) {
        const metà = p.n / 2;
        giocatori = Array.from({ length: metà }, (_, t) => `<li class="oca-sq ${p.squadra[ctx.mio] === t ? 'mia' : ''}"><span class="oca-sq-nome">${p.squadra[ctx.mio] === t ? 'La tua squadra' : `Squadra ${t + 1}`} · ${p.pos[t] + p.pos[t + metà]} caselle</span><ul>${riga(t)}${riga(t + metà)}</ul></li>`).join('');
      } else giocatori = Array.from({ length: p.n }, (_, q) => riga(q)).join('');
      const u = p.ultimo;
      const dadi = p.dadi ? p.dadi.map((v, i) => dadoSvg(v, `${ritardo(ui, `oca-d-${p.nTiro}`)};--k:${i};--c:${COL[u.posto]}`)).join('') : dadoSvg(5, '--c:#888;opacity:.4') + dadoSvg(2, '--c:#888;opacity:.4');
      const puo = mio && !inviato(ui, p.nTiro);
      const dadiBox = puo ? `<button type="button" class="oca-dadi puo" data-az="tira" aria-label="Tira i dadi">${dadi}</button>` : `<div class="oca-dadi">${dadi}</div>`;
      // racconto dell'ultimo tiro (le righe compaiono man mano che la pedina cammina)
      let racconto = '';
      if (u) {
        const tiratore = u.chi ?? u.posto;
        const chi = tiratore === ctx.mio ? 'Tu' : esc(ctx.nome(tiratore));
        racconto = `<div class="oca-racc" style="--c:${COL[u.posto]}"><b>${chi}</b>: ${u.righe.map((r, i) => `<span style="--i:${i};${ritardo(ui, `oca-r-${u.n}`)}">${esc(r)}</span>`).join(' → ')}</div>`;
      }
      const saltati = (p.saltati || []).filter((s) => !p.inAttesa).map((s) => `${esc(s.posto === ctx.mio ? 'Tu' : ctx.nome(s.posto))} ${s.perche === 'locanda' ? 'alla locanda, salta il turno' : s.perche === 'pozzo' ? 'è nel pozzo' : 'è in prigione'}`);
      let msg;
      if (p.finita && p.aSquadre) {
        const v = p.risultato.vincitori;
        msg = v.includes(ctx.mio) ? 'Tutta la squadra al 63: avete vinto! 🏆' : `Vince la squadra di ${v.map((q) => esc(ctx.nome(q))).join(' e ')}! 🏆`;
      } else if (p.finita) msg = p.risultato.vincitori[0] === ctx.mio ? 'Sei arrivato al 63: hai vinto! 🏆' : `${esc(ctx.nome(p.risultato.vincitori[0]))} è arrivato al 63! 🏆`;
      else if (p.inAttesa) msg = u && u.posto === ctx.mio ? 'La tua pedina cammina…' : `La pedina di ${esc(ctx.nome(u ? u.posto : p.turno))} cammina…`;
      else if (mio && p.pedina != null && p.pedina !== ctx.mio) msg = `<b>Tocca a te: tira per ${esc(ctx.nome(p.pedina))}!</b> <small>(sei già al 63)</small>`;
      else if (mio) msg = `<b>Tocca a te: tira i dadi!</b>${p.primoTiro[ctx.mio] ? ' <small>(al primo tiro il 9 fa volare!)</small>' : ''}`;
      else msg = `Tocca a ${esc(ctx.nome(p.turno))}…`;
      const tasto = puo ? '<button type="button" class="bottone primario oca-tira" data-az="tira">🎲 Tira i dadi</button>' : '';
      return `<div class="oca">
        <div class="oca-tav"><div class="oca-griglia">${disegnaGriglia()}</div><div class="oca-strato">${pedine}</div></div>
        <aside class="oca-lato">
          <div class="oca-centro">${dadiBox}<p class="oca-msg" aria-live="polite">${msg}</p>${tasto}</div>
          ${racconto}
          ${saltati.length ? `<p class="oca-salt">${saltati.join(' · ')}</p>` : ''}
          <ul class="oca-gioc">${giocatori}</ul>
        </aside></div>`;
    },
    azioni() { return ''; },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui, u = p.ultimo;
      if (!u) return;
      if (primaVolta(ui, `oca-sd-${u.n}`)) suono([[260, 0.03], [380, 0.03], [300, 0.03], [440, 0.04], [520, 0.06]], { tipo: 'square', volume: 0.035 });
      if (calmo()) return;
      const t = trascorso(ui, `oca-m-${u.n}`) - 450; // la pedina parte quando i dadi si fermano
      const durate = u.passi.map((s) => (s.salto ? SALTO_MS : PASSO_MS));
      const tot = durate.reduce((a, b) => a + b, 0);
      const el = document.querySelector(`.oca-ped[data-ped="${u.posto}"]`);
      if (el && t < tot + 50 && u.passi.length) {
        const fr = [];
        let tempo = 0;
        let prima = pc(u.da);
        fr.push({ left: `${prima[0]}%`, top: `${prima[1]}%`, transform: 'translate(-50%, -50%) scale(1)', offset: 0 });
        u.passi.forEach((s, i) => {
          const dopo = pc(s.c);
          const mezzo = (tempo + durate[i] / 2) / tot;
          fr.push({ left: `${(prima[0] + dopo[0]) / 2}%`, top: `${(prima[1] + dopo[1]) / 2}%`, transform: `translate(-50%, -50%) scale(${s.salto ? 2 : 1.3})`, offset: mezzo });
          tempo += durate[i];
          fr.push({ left: `${dopo[0]}%`, top: `${dopo[1]}%`, transform: 'translate(-50%, -50%) scale(1)', offset: tempo / tot });
          prima = dopo;
        });
        el.style.zIndex = 8;
        const an = el.animate(fr, { duration: tot, easing: 'linear', fill: 'backwards', delay: Math.max(0, -t) });
        if (t > 0) an.currentTime = t; // se il tavolo si ridisegna riprende da dove era
        an.onfinish = () => { el.style.zIndex = ''; };
      }
      if (primaVolta(ui, `oca-sp-${u.n}`) && t < 300) {
        let ritt = Math.max(0, -t);
        u.passi.forEach((s, i) => { setTimeout(() => suono([[s.salto ? 300 : 500 + (i % 6) * 40, s.salto ? 0.25 : 0.04]], { tipo: s.salto ? 'sine' : 'triangle', volume: 0.03 }), ritt); ritt += durate[i]; });
      }
      // chi è stato mandato via dalla casella occupata
      for (const s of u.spostati) {
        const em = document.querySelector(`.oca-ped[data-ped="${s.posto}"]`);
        if (!em || t > tot + 700) continue;
        const [ax, ay] = pc(s.da), [bx, by] = pc(s.a);
        const an = em.animate([
          { left: `${ax}%`, top: `${ay}%`, transform: 'translate(-50%, -50%) scale(1)', offset: 0 },
          { left: `${ax}%`, top: `${ay}%`, transform: 'translate(-50%, -50%) scale(1)', offset: tot / (tot + 700) },
          { left: `${(ax + bx) / 2}%`, top: `${(ay + by) / 2}%`, transform: 'translate(-50%, -50%) scale(1.8)', offset: (tot + 350) / (tot + 700) },
          { left: `${bx}%`, top: `${by}%`, transform: 'translate(-50%, -50%) scale(1)', offset: 1 },
        ], { duration: tot + 700, easing: 'ease-in-out', fill: 'backwards', delay: Math.max(0, -t) });
        if (t > 0) an.currentTime = t;
      }
      if (p.finita && primaVolta(ui, 'oca-fine')) setTimeout(() => suono([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]], { volume: 0.07 }), Math.max(0, tot - t));
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita || p.turno == null) return null;
      return p.turno === ctx.mio ? 'Tira i dadi' : `Tocca a ${ctx.nome(p.turno)}`;
    },
    statoAttesa: () => 'La pedina cammina…',
    punteggio() { return ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return `<span style="color:${COL[posto]}">●</span> casella ${p.pos[posto]}${p.bloccato[posto] ? (p.bloccato[posto] === 'pozzo' ? ' 🕳️' : ' ⛓️') : p.fermo[posto] ? ' 🍺' : ''}`; },
    clic(ctx, el) { if (el.dataset.az === 'tira' && mioTurno(ctx.partita, ctx)) tira(ctx); },
  };
  document.addEventListener('keydown', (e) => {
    const ctx = ctxO;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'oca') return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, [data-az], [contenteditable]')) return;
    if (!mioTurno(ctx.partita, ctx)) return;
    e.preventDefault();
    tira(ctx);
  });
  Object.assign(window.Tavoli, { oca: tavolo });
})();
