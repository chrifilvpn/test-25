// SUDOKU: il tavolo nel browser (appunti personali, cursori degli altri in collaborazione)
(() => {
  const { esc } = window.Nuovi;
  const COLORI = ['#2b6cb0', '#c05621', '#2f855a', '#b83280', '#6b46c1', '#b7791f'];
  let ctxS = null;
  const cursori = new Map();
  const ricevuto = new WeakMap();
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const tempo = (p) => p.tempo + (p.corre ? Date.now() - (ricevuto.get(p) || Date.now()) : 0);
  setInterval(() => { const p = ctxS && ctxS.stato && ctxS.partita; const el = document.querySelector('.sd-tempo'); if (p && p.gioco === 'sudoku' && el) el.textContent = fmt(tempo(p)); }, 500);

  function scegli(ctx, i) {
    ctx.ui.sel = i;
    ctx.emetti('cursore', i);
    ctx.ridisegna();
  }
  function scrivi(ctx, v) {
    const p = ctx.partita, ui = ctx.ui, i = ui.sel;
    if (i == null || p.finita || p.dati[i]) return;
    if (ui.appunti && v && !p.inserimento) {
      ui.note = ui.note || {};
      const s = new Set(ui.note[i] || []);
      if (s.has(v)) s.delete(v); else s.add(v);
      ui.note[i] = [...s];
      return ctx.ridisegna();
    }
    ctx.invia({ tipo: 'metti', cella: i, valore: v });
  }

  const sudoku = {
    libero: true,
    reset(ctx) { ctxS = ctx; if (!ricevuto.has(ctx.partita)) ricevuto.set(ctx.partita, Date.now()); },
    cursore(ctx, d) { cursori.set(d.posto, d.cella); ctx.ridisegna(); },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const sel = ui.sel;
      const valSel = sel != null ? p.griglia[sel] : 0;
      let celle = '';
      for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9), c = i % 9;
        const v = p.griglia[i];
        const stessa = sel != null && (Math.floor(sel / 9) === r || sel % 9 === c || (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(c / 3)));
        const altri = [...cursori].filter(([posto, cella]) => cella === i && posto !== ctx.mio).map(([posto]) => posto);
        const cls = ['sd-cella', p.dati[i] ? 'dato' : '', sel === i ? 'scelta' : stessa ? 'zona' : '', v && v === valSel && sel !== i ? 'uguale' : '',
          (p.sbagliate && p.sbagliate[i]) || (p.conflitti && p.conflitti[i]) ? 'sbagliata' : '', p.ultimoAiuto && p.ultimoAiuto.cella === i && !p.finita ? 'aiutata' : '', c % 3 === 2 && c < 8 ? 'bordo-dx' : '', r % 3 === 2 && r < 8 ? 'bordo-giu' : ''].join(' ');
        const colore = !p.dati[i] && v && p.n > 1 && p.chi[i] != null ? `color:${COLORI[p.chi[i] % 6]};` : '';
        const note = !v && ui.note && ui.note[i] && ui.note[i].length ? `<span class="sd-note">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<i>${ui.note[i].includes(n) ? n : ''}</i>`).join('')}</span>` : '';
        const segni = altri.map((posto) => `<b class="sd-altro" style="--col:${COLORI[posto % 6]}" title="${esc(ctx.nome(posto))}"></b>`).join('');
        celle += `<div class="${cls}" style="${colore}" data-az="cella" data-i="${i}" role="button" tabindex="-1" aria-label="Riga ${r + 1}, colonna ${c + 1}${v ? `: ${v}` : ''}">${v || ''}${note}${segni}</div>`;
      }
      const conti = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => p.griglia.filter((x) => x === n).length);
      const tasti = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" class="sd-tasto ${conti[n - 1] >= 9 ? 'finito' : ''}" data-az="num" data-v="${n}">${n}</button>`).join('');
      const quanti = p.griglia.filter(Boolean).length;
      // schema tuo: prima si copiano i numeri di partenza, poi "Inizia a risolvere"
      const comandi = p.inserimento
        ? `<div class="sd-comandi"><button type="button" class="bottone" data-az="cancella">⌫ Cancella</button><button type="button" class="bottone" data-az="svuota">🗑 Svuota</button><button type="button" class="bottone primario-bt" data-az="inizia" ${quanti < p.minIndizi ? 'disabled' : ''}>✅ Inizia a risolvere</button></div>
        <p class="sd-guida">Copia i numeri del tuo schema (da carta o dal giornale), poi premi <b>Inizia a risolvere</b>: diventano fissi e parte il cronometro.</p>`
        : `<div class="sd-comandi"><button type="button" class="bottone ${ui.appunti ? 'attivo-bt' : ''}" data-az="appunti" aria-pressed="${!!ui.appunti}">✏️ Appunti ${ui.appunti ? 'sì' : 'no'}</button><button type="button" class="bottone" data-az="cancella">⌫ Cancella</button><button type="button" class="bottone" data-az="aiuto" title="Scrive un numero giusto: +30 secondi">💡 Aiuto${p.aiuti ? ` <small>(${p.aiuti})</small>` : ''}</button></div>`;
      const barra = p.inserimento
        ? `<span>✍️ Schema tuo</span><span>Numeri <b>${quanti}</b>${quanti < p.minIndizi ? ` <small>(almeno ${p.minIndizi})</small>` : ''}</span>`
        : `<span>⏱ <b class="sd-tempo">${fmt(tempo(p))}</b></span><span>${esc(p.nomeLivello)}</span>${p.errori != null ? `<span>Errori <b>${p.errori}</b></span>` : ''}`;
      const rec = p.finita && p.record.length ? `<div class="bb-record"><b>🏆 Tempi migliori · ${esc(p.nomeLivello)}${p.n > 1 ? ' in squadra' : ''}</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${fmt(x.ms)} <small>(${x.errori} errori${x.aiuti ? `, ${x.aiuti} aiuti` : ''}${x.giocatori > 1 ? `, ${x.giocatori} giocatori` : ''})</small></li>`).join('')}</ol></div>` : '';
      return `<div class="sd">
        <div class="sd-barra">${barra}</div>
        <div class="sd-griglia ${p.finita ? 'finita' : ''}">${celle}</div>
        ${p.finita ? '' : `<div class="sd-tasti">${tasti}</div>
        ${comandi}`}
        ${rec}</div>`;
    },
    stato(ctx) { const p = ctx.partita; return p.finita ? null : p.inserimento ? 'Scrivi i numeri del tuo schema' : p.n > 1 ? 'Risolvetelo insieme' : 'Risolvi il sudoku'; },
    punteggio(ctx) { const p = ctx.partita; return p.n > 1 ? p.messi.map((x, i) => `<span style="color:${COLORI[i % 6]}">${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') : ''; },
    infoPosto(ctx, posto) { const x = ctx.partita.messi[posto]; return `${x} ${x === 1 ? 'numero' : 'numeri'}`; },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'cella') return scegli(ctx, Number(el.dataset.i));
      if (az === 'num') return scrivi(ctx, Number(el.dataset.v));
      if (az === 'cancella') { if (ctx.ui.note && ctx.ui.sel != null) delete ctx.ui.note[ctx.ui.sel]; return ctx.partita.griglia[ctx.ui.sel] ? scrivi(ctx, 0) : ctx.ridisegna(); }
      if (az === 'aiuto') return ctx.invia({ tipo: 'aiuto' });
      if (az === 'svuota') { if (confirm('Cancellare tutti i numeri scritti?')) ctx.invia({ tipo: 'svuota' }); return; }
      if (az === 'inizia') { ctx.ui.sel = null; return ctx.invia({ tipo: 'inizia' }); }
      if (az === 'appunti') { ctx.ui.appunti = !ctx.ui.appunti; return ctx.ridisegna(); }
    },
  };

  document.addEventListener('keydown', (e) => {
    const ctx = ctxS;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'sudoku' || (window.Boss && Boss.attivo)) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const i = ctx.ui.sel ?? 40;
    const muovi = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (muovi) { e.preventDefault(); return scegli(ctx, Math.max(0, Math.min(80, i + muovi))); }
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); return scrivi(ctx, Number(e.key)); }
    if (['0', 'Backspace', 'Delete'].includes(e.key)) { e.preventDefault(); return scrivi(ctx, 0); }
    if (e.key === 'n' || e.key === 'N') { ctx.ui.appunti = !ctx.ui.appunti; ctx.ridisegna(); }
  });

  Object.assign(window.Tavoli, { sudoku });
})();
