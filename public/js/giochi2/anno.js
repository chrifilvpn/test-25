// INDOVINA L'ANNO: il tavolo nel browser. In alto l'evento su un cartoncino, sotto l'anno in grandi cifre (si
// scrive con la tastiera senza cliccare, le frecce lo cambiano) e la linea del tempo da trascinare. Dopo la
// risposta: l'anno vero e le risposte di tutti su una linea del tempo ingrandita attorno alla soluzione.
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  let ctxA = null;
  const ORA = new Date().getFullYear();

  const attivo = (ctx) => { const p = ctx && ctx.partita; return !!(p && p.gioco === 'anno' && !p.finita && p.fase === 'domanda' && p.mia === null); };
  const scritto = (a) => (a < 0 ? `${-a} a.C.` : String(a));

  // la linea del tempo non è uniforme: il Novecento ha più spazio dell'antichità
  const TRATTI = [[-800, 0], [0, 0.1], [1000, 0.22], [1500, 0.35], [1800, 0.52], [1900, 0.7], [ORA, 1]];
  function posDi(a) {
    if (a <= TRATTI[0][0]) return 0;
    for (let i = 1; i < TRATTI.length; i++) {
      const [a0, x0] = TRATTI[i - 1], [a1, x1] = TRATTI[i];
      if (a <= a1) return x0 + (x1 - x0) * (a - a0) / (a1 - a0);
    }
    return 1;
  }
  function annoDi(x) {
    x = Math.max(0, Math.min(1, x));
    for (let i = 1; i < TRATTI.length; i++) {
      const [a0, x0] = TRATTI[i - 1], [a1, x1] = TRATTI[i];
      if (x <= x1) {
        let a = Math.round(a0 + (a1 - a0) * (x - x0) / (x1 - x0));
        // lontano nel tempo si va a passi più larghi
        const passo = a < 0 ? 10 : a < 1500 ? 5 : 1;
        a = Math.round(a / passo) * passo;
        return a === 0 ? 1 : a;
      }
    }
    return ORA;
  }
  const EPOCHE = [[-800, 'Antichità'], [476, 'Medioevo'], [1492, 'Età moderna'], [1789, 'Ottocento'], [1900, 'Novecento'], [2000, 'Oggi']];
  const TACCHE = [-500, 1, 500, 1000, 1500, 1700, 1800, 1850, 1900, 1950, 2000];

  // l'anno che si sta scrivendo (cifre + avanti/prima di Cristo)
  function annoScritto(ui) {
    if (!ui.cifre) return null;
    const a = Number(ui.cifre);
    return ui.aC ? -a : a;
  }
  function imposta(ui, a) {
    a = Math.max(-5000, Math.min(ORA, a));
    if (a === 0) a = ui.aC ? 1 : -1; // si salta l'anno zero
    ui.aC = a < 0; ui.cifre = String(Math.abs(a));
  }

  function orologio(p) {
    const s = Math.ceil(p.resta / 1000);
    return `<div class="yr-tempo ${p.resta < 8000 ? 'poco' : ''}" data-fine="${Date.now() + p.resta}"><b>${s}</b><i style="--da:${(p.resta / p.durata).toFixed(3)};--d:${p.resta}ms"></i></div>`;
  }

  function linea(ui, mia) {
    const a = mia !== null ? mia : annoScritto(ui);
    const x = a === null ? null : posDi(a);
    const epoche = EPOCHE.map(([e, n], i) => {
      const x0 = posDi(e), x1 = i + 1 < EPOCHE.length ? posDi(EPOCHE[i + 1][0]) : 1;
      return `<span class="yr-epoca e${i}" style="left:${(x0 * 100).toFixed(2)}%;width:${((x1 - x0) * 100).toFixed(2)}%"><em>${n}</em></span>`;
    }).join('');
    const tacche = TACCHE.map((t) => `<span class="yr-tacca" style="left:${(posDi(t) * 100).toFixed(2)}%"><small>${t === 1 ? '1 d.C.' : scritto(t)}</small></span>`).join('');
    return `<div class="yr-linea ${mia !== null ? 'ferma' : ''}" data-yr-linea role="slider" aria-label="Linea del tempo" aria-valuemin="-800" aria-valuemax="${ORA}" ${a !== null ? `aria-valuenow="${a}"` : ''}>
      <div class="yr-epoche">${epoche}</div>${tacche}
      ${x !== null ? `<span class="yr-cursore" style="left:${(x * 100).toFixed(2)}%"><b>${esc(scritto(a))}</b></span>` : ''}
    </div>`;
  }

  function pannoDomanda(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const a = p.mia !== null ? p.mia : annoScritto(ui);
    const puo = attivo(ctx) && a !== null && a !== 0;
    const cifre = p.mia !== null ? String(Math.abs(p.mia)) : ui.cifre || '';
    const aC = p.mia !== null ? p.mia < 0 : ui.aC;
    const risposti = p.altri.filter((x) => x.risposto).length;
    return `<div class="yr">
      <div class="yr-testa"><span class="yr-num">Evento <b>${p.k + 1}</b> di ${p.nDomande}</span>${orologio(p)}</div>
      <div class="yr-carta"><span class="yr-arg yr-a-${p.arg}">${p.icona} ${esc(p.nomeArg)}</span><p>${esc(p.testo)}</p><small>In che anno?</small></div>
      <div class="yr-scrivi ${p.mia !== null ? 'dato' : ''}">
        <button type="button" class="yr-passo" data-az="yr-piu" data-d="-10" ${attivo(ctx) ? '' : 'disabled'} title="10 anni prima">−10</button>
        <button type="button" class="yr-passo" data-az="yr-piu" data-d="-1" ${attivo(ctx) ? '' : 'disabled'} title="Un anno prima">−1</button>
        <div class="yr-cifre" aria-live="polite">${cifre ? `<b>${esc(cifre)}</b>` : '<span>____</span>'}
          <button type="button" class="yr-ac ${aC ? 'si' : ''}" data-az="yr-ac" ${attivo(ctx) ? '' : 'disabled'} title="Prima o dopo Cristo (tasto meno)">${aC ? 'a.C.' : 'd.C.'}</button></div>
        <button type="button" class="yr-passo" data-az="yr-piu" data-d="1" ${attivo(ctx) ? '' : 'disabled'} title="Un anno dopo">+1</button>
        <button type="button" class="yr-passo" data-az="yr-piu" data-d="10" ${attivo(ctx) ? '' : 'disabled'} title="10 anni dopo">+10</button>
      </div>
      ${linea(ui, p.mia)}
      <div class="yr-comandi">
        ${p.mia !== null ? `<p class="yr-attesa">Hai risposto <b>${esc(scritto(p.mia))}</b>. Aspetta gli altri… <small>(${risposti} di ${p.n} hanno risposto)</small></p>`
          : `<button type="button" class="bottone" data-az="yr-cancella" ${cifre ? '' : 'disabled'}>⌫ Cancella</button>
             <button type="button" class="bottone primario-bt" data-az="yr-invia" ${puo ? '' : 'disabled'}>Rispondi ⏎</button>`}
      </div>
      ${p.mia === null ? '<p class="yr-aiuto"><kbd>0-9</kbd> scrivi · <kbd>↑</kbd><kbd>↓</kbd> ±1 (<kbd>Maiusc</kbd> ±10) · <kbd>−</kbd> a.C. · <kbd>Invio</kbd> rispondi · oppure trascina la linea</p>' : ''}
    </div>`;
  }

  // la linea ingrandita attorno all'anno vero, con le risposte di tutti
  function zoom(ctx) {
    const p = ctx.partita, e = p.esito;
    const valori = e.risposte.filter((r) => r !== null);
    let lo = Math.min(e.anno, ...valori), hi = Math.max(e.anno, ...valori);
    const largo = Math.max(10, hi - lo);
    lo -= Math.ceil(largo * 0.12); hi += Math.ceil(largo * 0.12);
    const x = (a) => ((a - lo) / (hi - lo) * 100).toFixed(2);
    // chi ha dato lo stesso anno sta in un'etichetta sola; le etichette vanno su quattro file, sopra e sotto la
    // linea, scegliendo la prima fila dove non toccano quella vicina
    const gruppi = [];
    e.risposte.map((r, i) => ({ r, i })).filter((o) => o.r !== null).sort((a, b) => a.r - b.r || a.i - b.i)
      .forEach((o) => { const g = gruppi[gruppi.length - 1]; if (g && g.r === o.r) g.chi.push(o.i); else gruppi.push({ r: o.r, chi: [o.i] }); });
    const spazio = window.innerWidth < 760 ? 22 : 11, ultimo = [-99, -99, -99, -99];
    const segni = gruppi.map((g) => {
      const xx = Number(x(g.r));
      let f = ultimo.findIndex((u) => xx - u >= spazio);
      if (f < 0) f = ultimo.indexOf(Math.min(...ultimo));
      ultimo[f] = xx;
      const io = g.chi.includes(ctx.mio), c = COLORI[(io ? ctx.mio : g.chi[0]) % COLORI.length];
      const nomi = g.chi.map((i) => `<span style="color:${COLORI[i % COLORI.length]}">${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))}</span>`).join(', ');
      return `<span class="yr-segno ${io ? 'yr-io' : ''} yr-l${f} ${xx > 88 ? 'yr-dx' : xx < 12 ? 'yr-sx' : ''}" style="left:${xx}%;--c:${c}">
        <i></i><em>${nomi}<br><b>${esc(scritto(g.r))}</b></em></span>`;
    }).join('');
    const passo = Math.pow(10, Math.floor(Math.log10(hi - lo))) / ((hi - lo) / Math.pow(10, Math.floor(Math.log10(hi - lo))) < 3 ? 2 : 1);
    const tacche = [];
    for (let t = Math.ceil(lo / passo) * passo; t <= hi; t += passo) if (t !== 0) tacche.push(`<span class="yr-tacca" style="left:${x(t)}%"><small>${esc(scritto(t))}</small></span>`);
    return `<div class="yr-zoom">${tacche.join('')}<span class="yr-vero" style="left:${x(e.anno)}%" title="${esc(scritto(e.anno))}"></span>${segni}</div>`;
  }
  const COLORI = ['#f2c14e', '#7cc6fe', '#ff8fa3', '#9fd26b', '#c3a6ff', '#ffb36b', '#6ee7d8', '#e6e6e6'];

  function pannoRivela(ctx) {
    const p = ctx.partita, e = p.esito;
    const ordine = Array.from({ length: p.n }, (_, i) => i).sort((a, b) => e.punti[b] - e.punti[a] || (e.ms[a] || 1e9) - (e.ms[b] || 1e9));
    const righe = ordine.map((i) => {
      const r = e.risposte[i], d = r === null ? null : Math.abs(r - e.anno);
      return `<li class="${i === ctx.mio ? 'yr-io' : ''} ${e.punti[i] === 100 ? 'yr-esatto' : ''}"><i style="background:${COLORI[i % COLORI.length]}"></i>
        <span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))}</span><span class="yr-ris">${r === null ? '<em>nessuna risposta</em>' : esc(scritto(r))}</span>
        <span class="yr-diff">${d === null ? '' : d === 0 ? '🎯 esatto' : `${d} ${d === 1 ? 'anno' : 'anni'} ${r < e.anno ? 'prima' : 'dopo'}`}</span><b>+${e.punti[i]}</b></li>`;
    }).join('');
    const ultimo = p.k + 1 >= p.nDomande;
    const bottone = p.finita ? '' : p.mioPronto ? `<p class="yr-attesa">Aspetta gli altri… (${Math.ceil(p.restaRivela / 1000)} s)</p>`
      : `<button type="button" class="bottone primario-bt" data-az="yr-pronto">${ultimo ? 'Classifica finale' : 'Prossimo evento ▸'}</button>`;
    return `<div class="yr yr-fine">
      <div class="yr-testa"><span class="yr-num">Evento <b>${p.k + 1}</b> di ${p.nDomande}</span></div>
      <div class="yr-carta girata"><span class="yr-arg yr-a-${p.arg}">${p.icona} ${esc(p.nomeArg)}</span><p>${esc(p.testo)}</p><strong>${esc(scritto(e.anno))}</strong></div>
      ${zoom(ctx)}
      <ul class="yr-righe">${righe}</ul>
      <div class="yr-comandi">${bottone}</div>
    </div>`;
  }

  function pannoFinale(ctx) {
    const p = ctx.partita;
    const righe = (p.riepilogo || []).map((s) => `<li><span class="yr-anno">${esc(scritto(s.anno))}</span><span class="yr-ev">${esc(s.testo)}</span>
      <span class="yr-ris">${s.mia === null || s.mia === undefined ? '—' : esc(scritto(s.mia))}</span><b class="${s.punti === 100 ? 'yr-esatto' : ''}">${s.punti}</b></li>`).join('');
    return `<div class="yr yr-fine"><h3 class="yr-titolo">I tuoi ${p.nDomande} eventi <small>${p.punti[ctx.mio]} punti · ${p.esatti[ctx.mio]} anni esatti</small></h3>
      <ul class="yr-riepilogo">${righe}</ul></div>`;
  }

  function invia(ctx) {
    const ui = ctx.ui;
    if (!attivo(ctx)) return;
    const a = annoScritto(ui);
    if (a === null) return ctx.avviso('Scrivi un anno', 1200);
    if (a === 0) return ctx.avviso("L'anno zero non esiste", 1500);
    if (a > ORA) return ctx.avviso(`Al massimo il ${ORA}`, 1300);
    suono([[620, 0.05], [820, 0.08]], { volume: 0.05 });
    ctx.invia({ tipo: 'anno', anno: a });
  }

  // trascinare la linea del tempo
  let tira = null;
  function daLinea(e) {
    const el = document.querySelector('.yr [data-yr-linea]:not(.ferma)');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return annoDi((e.clientX - r.left) / r.width);
  }
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxA;
    if (!attivo(ctx) || e.button > 0 || !(e.target.closest && e.target.closest('.yr [data-yr-linea]'))) return;
    e.preventDefault();
    tira = true;
    const a = daLinea(e);
    if (a !== null) { imposta(ctx.ui, a); ctx.ridisegna(); }
  });
  document.addEventListener('pointermove', (e) => {
    const ctx = ctxA;
    if (!tira || !attivo(ctx)) return;
    const a = daLinea(e);
    if (a !== null && a !== annoScritto(ctx.ui)) { imposta(ctx.ui, a); ctx.ridisegna(); }
  });
  document.addEventListener('pointerup', () => { tira = null; });
  document.addEventListener('pointercancel', () => { tira = null; });

  document.addEventListener('keydown', (e) => {
    const ctx = ctxA;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'anno') return;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if ((window.Boss && Boss.attivo) || !document.querySelector('.yr')) return;
    const p = ctx.partita, ui = ctx.ui;
    if (p.fase !== 'domanda') {
      if (e.key === 'Enter' && !p.finita && !p.mioPronto && !e.target.closest('button')) { e.preventDefault(); ctx.invia({ tipo: 'pronto' }); }
      return;
    }
    if (!attivo(ctx)) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if ((ui.cifre || '').length < 4) ui.cifre = ((ui.cifre || '') + e.key).replace(/^0+/, '');
      return ctx.ridisegna();
    }
    if (e.key === 'Backspace') { e.preventDefault(); ui.cifre = (ui.cifre || '').slice(0, -1); return ctx.ridisegna(); }
    if (e.key === 'Escape' || e.key === 'Delete') { ui.cifre = ''; ui.aC = false; return ctx.ridisegna(); }
    if (e.key === '-' || e.key === 'a') { e.preventDefault(); ui.aC = !ui.aC; return ctx.ridisegna(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = (e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1);
      const a = annoScritto(ui);
      imposta(ui, a === null ? 1900 : a + d + (a + d === 0 ? d : 0));
      return ctx.ridisegna();
    }
    if (e.key === 'Enter' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); invia(ctx); }
  });

  const tavolo = {
    libero: true,
    reset(ctx) {
      ctxA = ctx;
      const ui = ctx.ui, p = ctx.partita;
      if (ui._k !== p.k) { ui._k = p.k; ui.cifre = ''; ui.aC = false; }
    },
    panno(ctx) {
      const p = ctx.partita;
      if (p.finita && p.riepilogo) return pannoFinale(ctx);
      return p.fase === 'domanda' ? pannoDomanda(ctx) : pannoRivela(ctx);
    },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      if (p.fase === 'rivela' && p.esito && primaVolta(ui, `yr-rivela-${p.k}`)) {
        const mie = p.esito.punti[ctx.mio];
        suono(mie === 100 ? [[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.16]] : mie >= 50 ? [[523, 0.08], [784, 0.12]] : [[392, 0.1], [330, 0.14]], { volume: 0.06 });
      }
      clearInterval(ui._yrT);
      ui._yrT = setInterval(() => {
        const el = document.querySelector('.yr-tempo');
        if (!el) return clearInterval(ui._yrT);
        const resta = Math.max(0, Number(el.dataset.fine) - Date.now()), s = Math.ceil(resta / 1000);
        el.querySelector('b').textContent = s;
        el.classList.toggle('poco', resta < 8000);
        if (resta < 5500 && resta > 0 && s !== ui._bip && attivo(ctx)) { ui._bip = s; suono([[880, 0.04]], { volume: 0.03 }); }
      }, 200);
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'rivela') return p.mioPronto ? 'Aspetta gli altri' : `Era il ${scritto(p.esito.anno)}`;
      return p.mia !== null ? 'Aspetta gli altri' : 'In che anno è successo?';
    },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.n === 1) return `<span>Punti <b>${p.punti[0]}</b></span><span>Esatti <b>${p.esatti[0]}</b></span>`;
      return p.punti.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita, a = p.altri[posto];
      if (!a || p.finita) return '';
      if (p.fase === 'domanda') return `<span class="yr-info">${a.risposto ? '✓ ha risposto' : '…'}</span>`;
      return `<span class="yr-info">+${p.esito.punti[posto]}${a.pronto ? ' ✓' : ''}</span>`;
    },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui;
      if (az === 'yr-invia') return invia(ctx);
      if (az === 'yr-pronto') return ctx.invia({ tipo: 'pronto' });
      if (!attivo(ctx)) return;
      if (az === 'yr-cancella') { ui.cifre = ''; ui.aC = false; return ctx.ridisegna(); }
      if (az === 'yr-ac') { ui.aC = !ui.aC; return ctx.ridisegna(); }
      if (az === 'yr-piu') {
        const d = Number(el.dataset.d), a = annoScritto(ui);
        imposta(ui, a === null ? 1900 : a + d + (a + d === 0 ? Math.sign(d) : 0));
        return ctx.ridisegna();
      }
    },
  };

  Object.assign(window.Tavoli, { anno: tavolo });
})();
