// MAHJONG SOLITARIO: tessere d'avorio con lo spessore verde, impilate (ogni strato un po' più in alto e a sinistra);
// le facce disegnate in SVG: cerchi, bambù, caratteri, venti, draghi, fiori e stagioni. Le tessere libere sono chiare,
// quelle bloccate un po' scure; la scelta si illumina d'oro, l'aiuto lampeggia. Le mosse si vedono subito.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const R = () => window.Rompicapo;
  let ctxM = null;

  // ---------------- le facce (SVG 60×80) ----------------
  const CIFRE = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const PUNTI = {
    1: [[30, 40]], 2: [[30, 22], [30, 58]], 3: [[16, 18], [30, 40], [44, 62]], 4: [[18, 22], [42, 22], [18, 58], [42, 58]],
    5: [[18, 20], [42, 20], [30, 40], [18, 60], [42, 60]], 6: [[19, 18], [41, 18], [19, 40], [41, 40], [19, 62], [41, 62]],
    7: [[14, 14], [30, 22], [46, 30], [19, 48], [41, 48], [19, 66], [41, 66]],
    8: [[19, 13], [41, 13], [19, 31], [41, 31], [19, 49], [41, 49], [19, 67], [41, 67]],
    9: [[14, 16], [30, 16], [46, 16], [14, 40], [30, 40], [46, 40], [14, 64], [30, 64], [46, 64]],
  };
  const COL_C = ['#1d5fa8', '#c1272d', '#1f7a3a'];
  function cerchi(n) {
    const r = n === 1 ? 17 : n <= 4 ? 10 : n <= 6 ? 8.5 : 7;
    return PUNTI[n].map(([x, y], k) => {
      const col = n === 1 ? '#c1272d' : COL_C[(k + n) % 3];
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${r * 0.32}" fill="${col}"/>`;
    }).join('');
  }
  function bambu(n) {
    if (n === 1) return '<path d="M30 14c8 0 14 8 12 18-1 7-6 10-12 12-6-2-11-5-12-12-2-10 4-18 12-18z" fill="#1f7a3a"/><circle cx="26" cy="24" r="2.5" fill="#fff"/><path d="M42 26l9-3-7 8z" fill="#e0a91c"/><path d="M24 44l-4 22h20l-4-22z" fill="#c1272d"/>';
    const pos = { 2: [[30, 22], [30, 58]], 3: [[30, 22], [18, 58], [42, 58]], 4: [[18, 22], [42, 22], [18, 58], [42, 58]], 5: [[16, 22], [44, 22], [30, 40], [16, 58], [44, 58]],
      6: [[14, 22], [30, 22], [46, 22], [14, 58], [30, 58], [46, 58]], 7: [[30, 14], [14, 40], [30, 40], [46, 40], [14, 66], [30, 66], [46, 66]],
      8: [[12, 22], [24, 22], [36, 22], [48, 22], [12, 58], [24, 58], [36, 58], [48, 58]], 9: [[14, 14], [30, 14], [46, 14], [14, 40], [30, 40], [46, 40], [14, 66], [30, 66], [46, 66]] }[n];
    const h = n >= 7 ? 22 : 30;
    return pos.map(([x, y], k) => {
      const col = (n === 5 || n === 7 || n === 9) && k === Math.floor(pos.length / 2) ? '#c1272d' : '#1f7a3a';
      return `<rect x="${x - 3.5}" y="${y - h / 2}" width="7" height="${h}" rx="3" fill="${col}"/><rect x="${x - 4.5}" y="${y - 1.2}" width="9" height="2.4" rx="1" fill="${col}" opacity=".7"/><rect x="${x - 1}" y="${y - h / 2 + 2}" width="1.6" height="${h - 4}" fill="#fff" opacity=".35"/>`;
    }).join('');
  }
  const testo = (t, col, y = 52, size = 34) => `<text x="30" y="${y}" text-anchor="middle" font-family="'Noto Serif CJK SC','Noto Sans CJK SC','PingFang SC','Microsoft YaHei','SimSun',serif" font-weight="700" font-size="${size}" fill="${col}">${t}</text>`;
  const FIORI = ['🌸', '🌼', '🌺', '🌻'], STAGIONI = ['🌱', '☀️', '🍂', '❄️'];
  const cache = new Map();
  function faccia(f) {
    if (cache.has(f)) return cache.get(f);
    let s = '';
    const t = f[0], v = Number(f[1]);
    if (t === 'c' && v) s = cerchi(v);
    else if (t === 'b' && v) s = bambu(v);
    else if (t === 'n' && v) s = testo(CIFRE[v], '#1d3f8a', 34, 26) + testo('萬', '#c1272d', 70, 28);
    else if (f === 've') s = testo('東', '#1c1a16', 54);
    else if (f === 'vs') s = testo('南', '#1c1a16', 54);
    else if (f === 'vo') s = testo('西', '#1c1a16', 54);
    else if (f === 'vn') s = testo('北', '#1c1a16', 54);
    else if (f === 'dr') s = testo('中', '#c1272d', 54, 38);
    else if (f === 'dv') s = testo('發', '#1f7a3a', 54, 36);
    else if (f === 'db') s = '<rect x="12" y="14" width="36" height="52" rx="4" fill="none" stroke="#1d5fa8" stroke-width="4"/><rect x="18" y="20" width="24" height="40" rx="2" fill="none" stroke="#1d5fa8" stroke-width="1.5"/>';
    else if (t === 'f') s = `<text x="30" y="50" text-anchor="middle" font-size="30">${FIORI[v - 1]}</text><text x="50" y="74" text-anchor="end" font-size="10" font-weight="700" fill="#c1272d">${v}</text>`;
    else if (t === 's') s = `<text x="30" y="50" text-anchor="middle" font-size="30">${STAGIONI[v - 1]}</text><text x="50" y="74" text-anchor="end" font-size="10" font-weight="700" fill="#1f7a3a">${v}</text>`;
    // un nome leggibile per chi usa la sintesi vocale
    const nome = t === 'c' ? `${v} cerchi` : t === 'b' ? `${v} bambù` : t === 'n' ? `${v} caratteri` : { ve: 'vento Est', vs: 'vento Sud', vo: 'vento Ovest', vn: 'vento Nord', dr: 'drago rosso', dv: 'drago verde', db: 'drago bianco' }[f] || (t === 'f' ? 'fiore' : 'stagione');
    const out = { svg: `<svg viewBox="0 0 60 80" aria-hidden="true">${s}</svg>`, nome };
    cache.set(f, out);
    return out;
  }
  const gruppo = (f) => (f && /^f\d$/.test(f) ? 'f' : f && /^s\d$/.test(f) ? 's' : f);

  // ---------------- stato locale (mosse non ancora confermate) ----------------
  function locale(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.loc || R().allineato(ctx)) ui.loc = { facce: p.facce.slice() };
    return ui.loc;
  }
  const puoi = (ctx) => { const p = ctx.partita; return !p.finita && p.fatto == null && !p.ritirato && !ctx.stato.spettatore; };
  // tessere libere nella copia locale (come sul server)
  function libere(p, facce) {
    const P = p.posti;
    return P.map(([x, y, z], i) => {
      if (!facce[i]) return false;
      let sx = false, dx = false;
      for (let j = 0; j < P.length; j++) {
        if (!facce[j] || j === i) continue;
        const [a, b, c] = P[j];
        if (c === z + 1 && Math.abs(a - x) < 2 && Math.abs(b - y) < 2) return false;
        if (c === z && Math.abs(b - y) < 2) { if (a === x - 2) sx = true; if (a === x + 2) dx = true; }
      }
      return !sx || !dx;
    });
  }

  function tocca(ctx, i) {
    if (!puoi(ctx)) return;
    const p = ctx.partita, ui = ctx.ui, L = locale(ctx);
    const lib = libere(p, L.facce);
    if (!L.facce[i]) return;
    if (!lib[i]) { ui.bloccata = { i, t: Date.now() }; suono([[140, 0.06]], { tipo: 'square', volume: 0.03 }); return ctx.ridisegna(); }
    if (ui.sel == null || ui.sel === i) { ui.sel = ui.sel === i ? null : i; suono([[520, 0.03]], { volume: 0.03 }); return ctx.ridisegna(); }
    if (gruppo(L.facce[ui.sel]) !== gruppo(L.facce[i])) { ui.sel = i; suono([[400, 0.03]], { volume: 0.03 }); return ctx.ridisegna(); }
    const a = ui.sel;
    L.facce[a] = null; L.facce[i] = null; ui.sel = null;
    ui.tolte = { a, b: i, t: Date.now() };
    suono([[660, 0.05], [990, 0.08]], { volume: 0.05 });
    R().invia(ctx, { tipo: 'togli', a, b: i });
    ctx.ridisegna();
  }

  function misura(p) {
    const P = p.posti, maxX = Math.max(...P.map((q) => q[0])) + 2, maxY = Math.max(...P.map((q) => q[1])) + 2;
    const largo = document.documentElement.clientWidth;
    const W = largo >= 900 ? Math.min(1040, largo - 360) : largo - 16;
    const H = largo >= 900 ? window.innerHeight - 330 : window.innerHeight - 330;
    // una mezza tessera = u pixel di larghezza; l'altezza della tessera è 4/3 della larghezza
    const u = Math.max(9, Math.min(30, Math.floor(Math.min(W / (maxX + 1.2), Math.max(240, H) / ((maxY * 4) / 3 + 1.4)))));
    return { u, maxX, maxY };
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxM = ctx; R().attiva(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, L = locale(ctx);
      const { u, maxX, maxY } = misura(p);
      const lib = libere(p, L.facce), finito = p.fatto != null || p.finita;
      const w = u * 2, h = Math.round((u * 8) / 3), dz = Math.max(3, Math.round(u * 0.28));
      // si disegnano dal basso verso l'alto e da destra a sinistra (così lo spessore di ognuna copre quella dietro)
      const ordine = p.posti.map((q, i) => i).filter((i) => L.facce[i]).sort((a, b) => p.posti[a][2] - p.posti[b][2] || p.posti[b][0] - p.posti[a][0] || p.posti[a][1] - p.posti[b][1]);
      const sugg = p.suggerimento && L.facce[p.suggerimento[0]] && L.facce[p.suggerimento[1]] ? p.suggerimento : [];
      const bl = ui.bloccata && Date.now() - ui.bloccata.t < 600 ? ui.bloccata.i : -1;
      const tessere = ordine.map((i) => {
        const [x, y, z] = p.posti[i], f = faccia(L.facce[i]);
        const cls = ['mj-t', lib[i] ? 'libera' : 'bloccata', ui.sel === i ? 'scelta' : '', sugg.includes(i) ? 'suggerita' : '', bl === i ? 'no' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-az="tessera" data-i="${i}" style="left:${x * u + dz * 4 - z * dz}px;top:${(y * h) / 2 + dz * 4 - z * dz}px;z-index:${z * 100 + 50 - y - Math.round(x / 2)}" aria-label="${esc(f.nome)}${lib[i] ? '' : ' (bloccata)'}">${f.svg}</button>`;
      }).join('');
      const larg = maxX * u + dz * 6, alt = (maxY * h) / 2 + dz * 6;
      const rimaste = L.facce.filter(Boolean).length;
      const extra = `<span>${esc(p.nomeFigura)}</span><span>Rimaste <b>${rimaste}</b></span><span>Coppie libere <b>${p.coppieLibere}</b></span>`;
      const rec = p.finita && p.record && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${esc(p.nomeFigura)}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${R().fmt(x.ms)}${x.aiuti || x.mescolate ? ` <small>(${x.aiuti} aiuti, ${x.mescolate} rimescolate)</small>` : ''}</li>`).join('')}</ol></div>` : '';
      const bloccato = !finito && R().allineato(ctx) && p.coppieLibere === 0 && rimaste > 0;
      const comandi = finito ? '' : `${bloccato ? '<p class="mj-avviso">Niente più coppie libere: annulla qualche mossa o rimescola le tessere rimaste.</p>' : ''}
        <div class="mj-comandi">
          <button type="button" class="bottone" data-az="annulla" ${p.puoAnnullare ? '' : 'disabled'} title="Ctrl+Z">↶ Annulla</button>
          <button type="button" class="bottone" data-az="aiuto" title="H · mostra una coppia buona: +15 secondi">💡 Aiuto${p.aiuti ? ` <small>(${p.aiuti})</small>` : ''}</button>
          <button type="button" class="bottone ${bloccato ? 'primario-bt' : ''}" data-az="mescola" title="M · rimescola le tessere rimaste: +30 secondi">🔀 Rimescola</button>
          ${p.sfida ? '<button type="button" class="bottone leggero" data-az="arrenditi">🏳️ Mi ritiro</button>' : ''}</div>
        <p class="mj-guida">Clicca due tessere libere uguali · <b>Ctrl+Z</b> annulla · <b>H</b> aiuto · <b>M</b> rimescola</p>`;
      return `<div class="mj ${finito ? 'finito' : ''}">
        ${R().barra(ctx, extra)}
        <div class="mj-tavolo" style="width:${larg}px;height:${alt}px;--w:${w}px;--h:${h}px;--dz:${dz}px">${tessere}</div>
        ${R().attesa(ctx)}${comandi}${R().arrivo(ctx)}${rec}</div>`;
    },
    dopo(ctx) {
      ctxM = ctx; R().attiva(ctx);
      if (ctx.partita.fatto != null && primaVolta(ctx.ui, 'mj-fatto')) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.3]], { volume: 0.08 });
      if (ctx.ui.bloccata && Date.now() - ctx.ui.bloccata.t < 600) setTimeout(() => { if (ctx.ui.bloccata && Date.now() - ctx.ui.bloccata.t >= 600) { ctx.ui.bloccata = null; ctx.ridisegna(); } }, 650);
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.fatto != null ? 'Finito! ✅' : p.sfida ? 'Sfida: chi finisce prima?' : 'Togli le tessere a coppie'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.fatto != null ? '✅' : `${p.rimasteAltri[i]}`}</b></span>`).join('') + '<span class="obiettivo">tessere rimaste</span>' : ''; },
    infoPosto(ctx, posto) { return R().infoPosto(ctx, posto, `${ctx.partita.rimasteAltri[posto]} rimaste`); },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'tessera') return tocca(ctx, Number(el.dataset.i));
      if (az === 'annulla') { ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
      if (az === 'aiuto') return R().invia(ctx, { tipo: 'aiuto' });
      if (az === 'mescola') { if (!confirm('Rimescolare le tessere rimaste? (+30 secondi)')) return; ctx.ui.sel = null; return R().invia(ctx, { tipo: 'mescola' }); }
      if (az === 'arrenditi') { if (confirm('Vuoi ritirarti dalla sfida?')) R().invia(ctx, { tipo: 'arrenditi' }); }
    },
  };

  setTimeout(() => window.Rompicapo.tastiera('mahjong', () => ctxM, (e, ctx) => {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); ctx.ui.sel = null; return R().invia(ctx, { tipo: 'annulla' }); }
    if (e.ctrlKey) return;
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); return R().invia(ctx, { tipo: 'aiuto' }); }
    if ((e.key === 'm' || e.key === 'M') && puoi(ctx) && confirm('Rimescolare le tessere rimaste? (+30 secondi)')) { ctx.ui.sel = null; return R().invia(ctx, { tipo: 'mescola' }); }
    if (e.key === 'Escape') { ctx.ui.sel = null; ctx.ridisegna(); }
  }), 0);

  Object.assign(window.Tavoli, { mahjong: tavolo });
})();
