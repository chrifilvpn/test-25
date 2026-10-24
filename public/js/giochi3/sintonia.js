// SINTONIA: il tavolo nel browser. In alto i punti e una fascia con la fase del turno; al centro la manopola a
// mezzaluna con i due estremi dello spettro ai lati e l'indizio sopra (lo Psichico vede il bersaglio colorato); sotto
// i comandi (spettro e indizio per lo Psichico, manopola e «Blocca» per la squadra, sinistra/destra per gli avversari)
// e a fianco il registro dei turni.
(() => {
  const { esc, ritardo, suono } = window.Nuovi;
  const NOMI = ['Viola', 'Verdi'];
  const CLASSE = ['viola', 'verde'];
  const CX = 200, CY = 206, R = 186;
  let ctxS = null;

  const squadra = (p, ctx) => (ctx.partita.modo === 'cooperativa' ? 0 : p % 2);
  const sonoPsichico = (ctx) => ctx.partita.psichico === ctx.mio && !ctx.stato.spettatore;
  const nomeCorto = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
  const attivo = (ctx) => { const p = ctx.partita; return !p.finita && !p.inAttesa && !ctx.stato.spettatore; };
  // posso girare la manopola: sono della squadra di turno, non lo Psichico, e l'indizio è arrivato
  const possoGirare = (ctx) => attivo(ctx) && ctx.partita.fase === 'manopola' && squadra(ctx.mio, ctx) === ctx.partita.sq && !sonoPsichico(ctx);
  const possoIndizio = (ctx) => attivo(ctx) && ctx.partita.fase === 'indizio' && sonoPsichico(ctx);
  const possoScommettere = (ctx) => attivo(ctx) && ctx.partita.fase === 'previsione' && squadra(ctx.mio, ctx) !== ctx.partita.sq;
  // il valore della manopola da disegnare: mentre la trascino vale il mio, altrimenti quello del server
  const valoreManopola = (ctx) => (ctx.ui.trascino != null && possoGirare(ctx) ? ctx.ui.trascino : ctx.partita.manopola);

  // ---------------- la manopola ----------------
  const angolo = (v) => Math.PI * (1 - v / 100); // 0 = tutto a sinistra, 100 = tutto a destra
  const punto = (v, r) => [CX + r * Math.cos(angolo(v)), CY - r * Math.sin(angolo(v))];
  const f = (n) => n.toFixed(1);
  function spicchio(a, b, r, cls) {
    a = Math.max(0, a); b = Math.min(100, b);
    if (b <= a) return '';
    const [x1, y1] = punto(a, r), [x2, y2] = punto(b, r);
    return `<path class="${cls}" d="M${CX} ${CY} L${f(x1)} ${f(y1)} A${r} ${r} 0 0 1 ${f(x2)} ${f(y2)} Z"/>`;
  }
  function bersaglio(t, st = '') {
    const zone = [[-8.5, -5.5, 2], [-5.5, -2.5, 3], [-2.5, 2.5, 4], [2.5, 5.5, 3], [5.5, 8.5, 2]];
    let s = zone.map(([a, b, pt]) => spicchio(t + a, t + b, R - 6, `sin-zona sin-z${pt}`)).join('');
    for (const [a, b, pt] of zone) {
      const m = t + (a + b) / 2;
      if (m < 1 || m > 99) continue;
      const [x, y] = punto(m, R - 26);
      s += `<text class="sin-zona-n" x="${f(x)}" y="${f(y + 5)}" text-anchor="middle">${pt}</text>`;
    }
    return `<g class="sin-bersaglio ${st ? 'apri' : ''}" style="${st}">${s}</g>`;
  }
  function disegno(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const muovo = possoGirare(ctx);
    let dentro = `<path class="sin-quadrante" d="M${CX - R - 8} ${CY} A${R + 8} ${R + 8} 0 0 1 ${CX + R + 8} ${CY} Z"/>`;
    for (let v = 0; v <= 100; v += 10) {
      const [x1, y1] = punto(v, R + 2), [x2, y2] = punto(v, R - (v % 50 ? 6 : 12));
      dentro += `<line class="sin-tacca" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
    }
    const scoperto = p.rivelato || p.finita;
    if (p.bersaglio != null) dentro += bersaglio(p.bersaglio, scoperto ? ritardo(ui, `sin-${p.storia.length}`) : '');
    // lo schermo: copre il bersaglio a chi non è lo Psichico finché non si scopre
    if (p.bersaglio == null && p.fase !== 'indizio') dentro += `<path class="sin-schermo" d="M${CX - R + 2} ${CY} A${R - 2} ${R - 2} 0 0 1 ${CX + R - 2} ${CY} Z"/>`;
    // i consigli dei computer (con persone in squadra)
    (p.consigli || []).forEach((c, i) => {
      if (!c || c.valore == null) return;
      const [x, y] = punto(c.valore, R + 14);
      dentro += `<g class="sin-consiglio"><circle cx="${f(x)}" cy="${f(y)}" r="10"/><text x="${f(x)}" y="${f(y + 4)}" text-anchor="middle">${esc(nomeCorto(ctx, i).slice(0, 2))}</text></g>`;
    });
    if (p.fase !== 'indizio' || scoperto) {
      const v = valoreManopola(ctx);
      const [x, y] = punto(v, R - 4), [hx, hy] = punto(v, R - 40);
      dentro += `<line class="sin-lancetta" x1="${CX}" y1="${CY}" x2="${f(x)}" y2="${f(y)}"/>`;
      dentro += `<circle class="sin-maniglia ${muovo ? 'mia' : ''}" cx="${f(hx)}" cy="${f(hy)}" r="${muovo ? 15 : 9}"/>`;
    }
    dentro += `<circle class="sin-perno" cx="${CX}" cy="${CY}" r="14"/>`;
    return `<svg viewBox="-4 2 408 214" class="sin-svg ${muovo ? 'muovibile' : ''}" role="img" aria-label="Manopola: ${esc(String(valoreManopola(ctx)))} su 100">${dentro}</svg>`;
  }

  // ---------------- parti del tavolo ----------------
  function testa(ctx) {
    const p = ctx.partita;
    let punti;
    if (p.modo === 'cooperativa') {
      punti = `<div class="sin-punti uno"><div class="sin-conta"><b>${p.punti[0]}</b><span>punti<small>carta ${Math.min(p.carteGiocate + (p.finita ? 0 : 1), p.totCarte)} di ${p.totCarte}</small></span></div></div>`;
    } else {
      const mia = squadra(ctx.mio, ctx);
      punti = `<div class="sin-punti">${[0, 1].map((s) => `<div class="sin-conta sin-${CLASSE[s]} ${p.sq === s && !p.finita ? 'di-turno' : ''}"><b>${p.punti[s]}</b><span>${NOMI[s]}${s === mia && !ctx.stato.spettatore ? ' (voi)' : ''}<small>si vince a ${p.obiettivo}</small></span></div>`).join('')}</div>`;
    }
    const sq = p.modo === 'cooperativa' ? '' : `${NOMI[p.sq]} · `;
    const cls = p.modo === 'cooperativa' ? 'sin-coop' : `sin-${CLASSE[p.sq]}`;
    let banner;
    if (p.finita) {
      banner = p.modo === 'cooperativa' ? `<div class="sin-banner sin-coop fine">${esc(p.giudizio || '')} <small>${p.punti[0]} punti in ${p.carteGiocate} carte</small></div>`
        : p.vincitore == null ? '<div class="sin-banner sin-coop fine">Pareggio!</div>' : `<div class="sin-banner sin-${CLASSE[p.vincitore]} fine">🏆 Vincono i ${NOMI[p.vincitore]}!</div>`;
    } else if (p.fase === 'indizio') {
      banner = `<div class="sin-banner ${cls}"><span>${sq}${sonoPsichico(ctx) ? '<b>sei lo Psichico</b>: scegli lo spettro e dai l\'indizio' : `lo Psichico <b>${esc(ctx.nome(p.psichico))}</b> pensa all'indizio<span class="sin-puntini"><i>.</i><i>.</i><i>.</i></span>`}</span></div>`;
    } else if (p.fase === 'manopola') {
      banner = `<div class="sin-banner ${cls}"><span>${sq}${possoGirare(ctx) ? '<b>girate la manopola</b> e bloccatela' : sonoPsichico(ctx) ? 'la tua squadra gira la manopola: <b>silenzio!</b> 🤐' : 'la squadra gira la manopola'}</span></div>`;
    } else if (p.fase === 'previsione') {
      const avv = 1 - p.sq;
      banner = `<div class="sin-banner sin-${CLASSE[avv]}"><span>${NOMI[avv]} · ${possoScommettere(ctx) ? '<b>il centro è a sinistra o a destra?</b>' : 'scommettono: sinistra o destra?'}</span>${p.lato ? ` <small>per ora: ${p.lato}</small>` : ''}</div>`;
    } else if (p.rivelato) {
      const r = p.rivelato;
      banner = `<div class="sin-banner ${r.punti === 4 ? 'sin-centro' : cls}">${r.punti === 4 ? 'Centro pieno! 🎯' : r.punti ? `${r.punti} punti` : 'Fuori bersaglio'}${r.lato ? ` <small>${NOMI[1 - r.squadra]}: ${r.latoOk ? 'lato giusto, +1' : 'lato sbagliato'}</small>` : ''}${r.rimonta ? ' <small>rimonta: giocano ancora!</small>' : ''}${r.bonus ? ' <small>carta bonus!</small>' : ''}</div>`;
    }
    return `<div class="sin-testa">${punti}${banner}${ruolo(ctx)}</div>`;
  }

  function ruolo(ctx) {
    const p = ctx.partita;
    if (ctx.stato.spettatore || p.finita) return '';
    if (sonoPsichico(ctx)) return '<p class="sin-ruolo">🔮 Sei lo <b>Psichico</b>: solo tu vedi il bersaglio</p>';
    const s = squadra(ctx.mio, ctx);
    if (p.modo === 'cooperativa') return `<p class="sin-ruolo">Psichico: <b>${esc(ctx.nome(p.psichico))}</b> · giocate tutti insieme</p>`;
    return `<p class="sin-ruolo"><i class="sin-pallino sin-${CLASSE[s]}"></i>Sei dei <b>${NOMI[s]}</b>${s === p.sq ? ` · Psichico: ${esc(nomeCorto(ctx, p.psichico))}` : ''}</p>`;
  }

  // lo spettro su cui si gioca (per lo Psichico, quello che sta scegliendo)
  function spettroAttuale(ctx) {
    const p = ctx.partita;
    if (p.carte) return p.carte[ctx.ui.carta || 0];
    return p.spettro;
  }

  function quadrante(ctx) {
    const p = ctx.partita;
    const sp = spettroAttuale(ctx);
    const indizio = p.indizio ? `<p class="sin-indizio">«${esc(p.indizio)}»</p>` : `<p class="sin-indizio vuoto">${p.fase === 'indizio' ? 'in attesa dell\'indizio…' : ''}</p>`;
    const estremi = sp ? `<div class="sin-estremi"><span class="sx">⬅ ${esc(sp.s)}</span><span class="dx">${esc(sp.d)} ➡</span></div>` : '<div class="sin-estremi"><span class="sx">?</span><span class="dx">?</span></div>';
    const fine = possoGirare(ctx) ? `<div class="sin-fine"><button type="button" class="bottone" data-az="meno" aria-label="Un po' a sinistra">−</button><span>${valoreManopola(ctx)}</span><button type="button" class="bottone" data-az="piu" aria-label="Un po' a destra">+</button></div>` : '';
    return `<div class="sin-quadro">${indizio}<div class="sin-svg-box">${disegno(ctx)}</div>${estremi}${fine}</div>`;
  }

  function comandi(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (possoIndizio(ctx)) {
      const c = ui.carta || 0;
      return `<div class="sin-comandi">
        <p class="sin-aiuto">Scegli lo spettro:</p>
        <div class="sin-carte">${p.carte.map((x, i) => `<button type="button" class="sin-carta ${c === i ? 'scelta' : ''}" data-az="carta" data-c="${i}" aria-pressed="${c === i}"><span>${esc(x.s)}</span><i>↔</i><span>${esc(x.d)}</span></button>`).join('')}</div>
        <label for="sin-indizio">Il tuo indizio: <b>un esempio</b> che sta proprio lì (niente numeri)</label>
        <div class="riga"><input id="sin-indizio" maxlength="40" autocomplete="off" spellcheck="false" placeholder="Per esempio: caffè appena fatto" data-tieni="indizio" data-invio="indizio" value="${esc(ui.t_indizio || '')}">
        <button type="button" class="bottone primario-bt" data-az="indizio">Dai l'indizio</button></div></div>`;
    }
    if (possoGirare(ctx)) {
      const da = p.mossaDa != null && p.mossaDa !== ctx.mio ? ` · l'ha mossa ${esc(ctx.nome(p.mossaDa))}` : '';
      return `<div class="sin-comandi"><p class="sin-aiuto">Trascina la manopola (o usa − e +, sul computer ← →). È una sola per tutta la squadra: decidete in chat${da}.</p>
        <button type="button" class="bottone primario-bt" data-az="blocca">Blocca a ${valoreManopola(ctx)} 🔒</button></div>`;
    }
    if (possoScommettere(ctx)) {
      return `<div class="sin-comandi"><p class="sin-aiuto">La manopola è bloccata a <b>${p.manopola}</b>. Il centro del bersaglio è più a sinistra o più a destra?</p>
        <div class="sin-lati"><button type="button" class="bottone ${p.lato === 'sinistra' ? 'primario-bt' : ''}" data-az="lato" data-lato="sinistra" aria-pressed="${p.lato === 'sinistra'}">⬅ A sinistra</button>
        <button type="button" class="bottone ${p.lato === 'destra' ? 'primario-bt' : ''}" data-az="lato" data-lato="destra" aria-pressed="${p.lato === 'destra'}">A destra ➡</button></div>
        ${consigliLato(ctx)}
        <button type="button" class="bottone primario-bt" data-az="confermaLato" ${p.lato ? '' : 'disabled'}>Conferma la scommessa</button></div>`;
    }
    if (p.fase === 'previsione' && !p.finita) return `<div class="sin-comandi"><p class="sin-aiuto">Manopola bloccata a <b>${p.manopola}</b>. ${consigliLato(ctx)}</p></div>`;
    return '';
  }
  function consigliLato(ctx) {
    const c = (ctx.partita.consigli || []).map((x, i) => (x && x.lato ? `${esc(nomeCorto(ctx, i))}: ${x.lato}` : null)).filter(Boolean);
    return c.length ? `<span class="sin-consigli">💬 ${c.join(' · ')}</span>` : '';
  }

  function registro(ctx) {
    const p = ctx.partita;
    if (!p.storia.length) return `<aside class="sin-registro"><h3>Turni</h3><p class="sin-vuoto">Ancora nessun turno. Centro pieno 4 punti, vicino 3, nella zona 2.</p></aside>`;
    const righe = [...p.storia].reverse().map((r) => `<li class="${p.modo === 'cooperativa' ? '' : `sin-bordo-${CLASSE[r.squadra]}`}">
      <p><b>«${esc(r.indizio)}»</b><small>${esc(nomeCorto(ctx, r.psichico))}</small></p>
      <p class="sin-reg-sp">${esc(r.spettro.s)} ↔ ${esc(r.spettro.d)}</p>
      <p class="sin-reg-es">🎯 ${r.bersaglio} · manopola ${r.manopola} · <b>+${r.punti}</b>${r.lato ? ` · ${r.lato} ${r.latoOk ? '✔' : '✘'}` : ''}</p></li>`).join('');
    return `<aside class="sin-registro"><h3>Turni</h3><ol>${righe}</ol></aside>`;
  }

  const tavolo = {
    libero: true,
    reset(ctx) {
      ctxS = ctx;
      window.NuoviTesto && window.NuoviTesto(ctx);
      const p = ctx.partita, ui = ctx.ui;
      // turno nuovo: si riparte con la prima carta e la casella vuota
      const k = `${p.storia.length}:${p.psichico}`;
      if (ui._turnoVisto !== k) { ui._turnoVisto = k; ui.carta = 0; ui.t_indizio = ''; ui.trascino = null; ui.fuoco = null; }
      // finito il trascinamento vale di nuovo la manopola del server (può averla mossa un compagno)
      if (p.fase !== 'manopola' || (!trascino && daMandare == null)) ui.trascino = null;
    },
    panno(ctx) {
      const p = ctx.partita;
      return `<div class="sin ${sonoPsichico(ctx) && !p.finita ? 'da-psichico' : ''}">
        <div class="sin-centro">${testa(ctx)}${quadrante(ctx)}${comandi(ctx)}</div>${registro(ctx)}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const k = ui.fuoco;
      if (k && !(window.Boss && Boss.attivo)) {
        const el = document.querySelector(`[data-tieni="${k}"]`);
        if (el && !el.disabled) { el.focus({ preventScroll: true }); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} }
      }
      // suoni: l'indizio arriva, il bersaglio si scopre
      const n = p.storia.length, ind = p.indizio;
      if (ui._nVisti === undefined) { ui._nVisti = n; ui._ind = ind; return; }
      if (n > ui._nVisti) {
        const r = p.storia[n - 1];
        if (r.punti === 4) suono([[660, 0.08], [880, 0.08], [1320, 0.2]], { volume: 0.07 });
        else if (r.punti) suono([[520, 0.08], [700, 0.14]], { volume: 0.06 });
        else suono([[300, 0.12], [220, 0.2]], { volume: 0.06 });
      } else if (ind && ind !== ui._ind) suono([[440, 0.06], [560, 0.1]], { volume: 0.05 });
      ui._nVisti = n; ui._ind = ind;
    },
    statoAttesa(ctx) { const r = ctx.partita.rivelato; return r ? `Il bersaglio era a ${r.bersaglio}` : 'Si scopre il bersaglio…'; },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (possoIndizio(ctx)) return 'Tocca a te: dai l\'indizio';
      if (p.fase === 'indizio') return `Indizio di ${ctx.nome(p.psichico)}`;
      if (possoGirare(ctx)) return 'Girate la manopola';
      if (p.fase === 'manopola') return p.modo === 'cooperativa' ? 'Si gira la manopola' : `Girano i ${NOMI[p.sq]}`;
      if (possoScommettere(ctx)) return 'Sinistra o destra?';
      if (p.fase === 'previsione') return `Scommettono i ${NOMI[1 - p.sq]}`;
      return null;
    },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.modo === 'cooperativa') return `<span>Punti <b>${p.punti[0]}</b></span><span>Carte <b>${p.carteGiocate}/${p.totCarte}</b></span>`;
      return `<span class="sin-p-viola">Viola <b>${p.punti[0]}</b></span><span class="sin-p-verde">Verdi <b>${p.punti[1]}</b></span>`;
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      const s = squadra(posto, ctx);
      const ps = posto === p.psichico ? '🔮 Psichico' : p.modo === 'cooperativa' ? 'indovina' : NOMI[s].toLowerCase();
      const c = p.consigli && p.consigli[posto];
      const consiglio = c ? ` · 💬 ${c.valore != null ? c.valore : c.lato}` : '';
      return `<span class="sin-info">${p.modo === 'cooperativa' ? '' : `<i class="sin-pallino sin-${CLASSE[s]}"></i>`}${ps}${consiglio}</span>`;
    },
    clic(ctx, el) {
      const ui = ctx.ui, az = el.dataset.az, p = ctx.partita;
      if (az === 'carta') { ui.carta = Number(el.dataset.c); return ctx.ridisegna(); }
      if (az === 'indizio') {
        const t = (ui.t_indizio || '').trim();
        if (!t) return ctx.avviso('Scrivi l\'indizio');
        if (/[0-9%]/.test(t)) return ctx.avviso('Niente numeri o percentuali: dai un esempio');
        return ctx.invia({ tipo: 'indizio', carta: ui.carta || 0, testo: t });
      }
      if (az === 'meno' || az === 'piu') {
        if (!possoGirare(ctx)) return;
        const v = Math.max(0, Math.min(100, valoreManopola(ctx) + (az === 'piu' ? 1 : -1)));
        ui.trascino = v; ctx.ridisegna();
        return manda(v);
      }
      if (az === 'blocca') { if (!possoGirare(ctx)) return; return ctx.invia({ tipo: 'blocca', valore: valoreManopola(ctx) }); }
      if (az === 'lato') return ctx.invia({ tipo: 'lato', lato: el.dataset.lato });
      if (az === 'confermaLato') { if (p.lato) ctx.invia({ tipo: 'confermaLato' }); }
    },
  };

  // la posizione della manopola va al server al massimo ogni 120 ms (e sempre alla fine del trascinamento)
  let tManda = null, ultimoMandato = 0, daMandare = null;
  function manda(v, subito = false) {
    daMandare = v;
    const ora = Date.now();
    clearTimeout(tManda);
    const via = () => { if (ctxS && daMandare != null && possoGirare(ctxS)) ctxS.invia({ tipo: 'gira', valore: daMandare }); ultimoMandato = Date.now(); daMandare = null; };
    if (subito || ora - ultimoMandato > 120) via(); else tManda = setTimeout(via, 120 - (ora - ultimoMandato));
  }

  // trascinare la manopola
  let trascino = false;
  function daPuntatore(e) {
    const svg = document.querySelector('.sin-svg.muovibile');
    if (!svg || !ctxS || !possoGirare(ctxS)) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 408 - 4 - CX, y = CY - (((e.clientY - r.top) / r.height) * 214 + 2);
    let a = Math.atan2(Math.max(y, 0), x); // sotto il perno vale come il bordo più vicino
    const v = Math.max(0, Math.min(100, Math.round(100 * (1 - a / Math.PI))));
    if (v === ctxS.ui.trascino) return;
    ctxS.ui.trascino = v;
    ctxS.ridisegna();
    manda(v);
  }
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.sin-svg.muovibile')) { trascino = true; e.preventDefault(); daPuntatore(e); } });
  document.addEventListener('pointermove', (e) => { if (trascino) { e.preventDefault(); daPuntatore(e); } });
  document.addEventListener('pointerup', () => { if (!trascino) return; trascino = false; if (daMandare != null) manda(daMandare, true); });
  document.addEventListener('keydown', (e) => {
    const p = ctxS && ctxS.stato && ctxS.partita;
    if (!p || p.gioco !== 'sintonia' || !possoGirare(ctxS) || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; // si sta scrivendo in chat
    e.preventDefault();
    const v = Math.max(0, Math.min(100, valoreManopola(ctxS) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1)));
    ctxS.ui.trascino = v;
    ctxS.ridisegna();
    manda(v);
  });

  Object.assign(window.Tavoli, { sintonia: tavolo });
})();
