// PAROLIERE: il tavolo nel browser. A sinistra la griglia dei dadi (si trascina il mouse o il dito sulle lettere,
// oppure si scrive con la tastiera senza cliccare da nessuna parte: le lettere della parola si accendono sulla
// griglia), a destra le parole trovate. A fine round le parole di tutti, quelle doppie cancellate e le migliori
// che nessuno ha visto (passandoci sopra si accendono sulla griglia).
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  let ctxP = null;

  const attivo = (ctx) => { const p = ctx && ctx.partita; return !!(p && p.gioco === 'paroliere' && !p.finita && p.fase === 'gioco' && !p.mioFinito); };
  const puntiDi = (w) => (w.length <= 4 ? 1 : w.length === 5 ? 2 : w.length === 6 ? 3 : w.length === 7 ? 5 : 11);
  const faccia = (f) => (f === 'qu' ? 'Qu' : f.toUpperCase());

  function vicini(lato, i, j) {
    const r1 = Math.floor(i / lato), c1 = i % lato, r2 = Math.floor(j / lato), c2 = j % lato;
    return i !== j && Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  }
  // percorso della parola sulla griglia (come sul server), o null
  function percorso(p, w) {
    const g = p.griglia, lato = p.lato, usate = new Array(g.length).fill(false), via = [];
    const cerca = (i, k) => {
      if (!w.startsWith(g[i], k)) return false;
      usate[i] = true; via.push(i);
      const k2 = k + g[i].length;
      if (k2 === w.length) return true;
      for (let j = 0; j < g.length; j++) if (!usate[j] && vicini(lato, i, j) && cerca(j, k2)) return true;
      usate[i] = false; via.pop();
      return false;
    };
    if (!w) return [];
    for (let i = 0; i < g.length; i++) if (cerca(i, 0)) return via;
    return null;
  }
  // la parola che si sta formando: dalle caselle scelte (mouse/dito) o dalla tastiera
  const parolaDa = (p, sel) => sel.map((i) => p.griglia[i]).join('');
  function scelta(ctx) {
    const ui = ctx.ui, p = ctx.partita;
    if (ui.sel && ui.sel.length) return { w: parolaDa(p, ui.sel), via: ui.sel };
    const w = ui.scritta || '';
    return { w, via: percorso(p, w) };
  }

  function griglia(ctx, via, piccola = false) {
    const p = ctx.partita;
    const ordine = new Map((via || []).map((i, k) => [i, k]));
    const celle = p.griglia.map((f, i) => {
      const k = ordine.get(i);
      return `<div class="prl-dado ${k !== undefined ? 'acceso' : ''} ${k === 0 ? 'primo' : ''} ${f === 'qu' ? 'qu' : ''}" data-cella="${i}"><span>${faccia(f)}</span>${k !== undefined ? `<i>${k + 1}</i>` : ''}</div>`;
    }).join('');
    // la linea che unisce le lettere scelte
    let linea = '';
    if (via && via.length > 1) {
      const pt = via.map((i) => `${(i % p.lato) + 0.5},${Math.floor(i / p.lato) + 0.5}`).join(' ');
      linea = `<svg class="prl-linea" viewBox="0 0 ${p.lato} ${p.lato}" aria-hidden="true"><polyline points="${pt}"/></svg>`;
    }
    return `<div class="prl-griglia ${piccola ? 'piccola' : ''}" style="--lato:${p.lato}" role="grid" aria-label="Griglia delle lettere">${celle}${linea}</div>`;
  }

  function orologio(p) {
    const s = Math.ceil(p.resta / 1000);
    return `<div class="prl-tempo ${p.resta < 20000 ? 'poco' : ''}" data-fine="${Date.now() + p.resta}"><b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b><i style="--da:${(p.resta / p.durata).toFixed(3)};--d:${p.resta}ms"></i></div>`;
  }

  function pannoGioco(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const { w, via } = scelta(ctx);
    const giaTrovata = w && p.mie.includes(w);
    const chiDi = (x) => { const k = p.mie.indexOf(x), q = p.mieChi ? p.mieChi[k] : ctx.mio; return q === ctx.mio || q == null ? '' : `<small class="prl-chi">${esc(ctx.nome(q))}</small>`; };
    const stato = !w ? '' : via === null ? 'prl-no' : giaTrovata ? 'prl-gia' : w.length >= p.minimo ? 'prl-si' : '';
    const mie = [...p.mie].reverse();
    const tot = p.mie.reduce((s, x) => s + puntiDi(x), 0);
    const nuova = ui.ultimaNuova;
    return `<div class="prl" style="--lato:${p.lato}">
      <div class="prl-sx">
        <div class="prl-testa"><span class="prl-round">${p.nRound > 1 ? `Round ${p.round} di ${p.nRound}` : 'Paroliere'}</span>${orologio(p)}</div>
        ${griglia(ctx, via || [])}
        <div class="prl-scritta ${stato}" aria-live="polite">${w ? esc(w.toUpperCase()) : `<small>${p.mioFinito ? 'Hai finito: aspetta gli altri' : 'Scrivi o trascina sulle lettere'}</small>`}${w && via === null ? '<em>non è sulla griglia</em>' : giaTrovata ? '<em>già trovata</em>' : w && w.length >= p.minimo ? `<em>+${puntiDi(w)}</em>` : ''}</div>
        <div class="prl-comandi">
          <button type="button" class="bottone" data-az="prl-cancella" ${w ? '' : 'disabled'}>⌫ Cancella</button>
          <button type="button" class="bottone primario-bt" data-az="prl-invia" ${attivo(ctx) && w.length >= p.minimo && via && !giaTrovata ? '' : 'disabled'}>Invia ⏎</button>
        </div>
      </div>
      <div class="prl-dx">
        <div class="prl-conta">${p.aSquadre ? 'Squadra: ' : ''}<b>${p.mie.length}</b> ${p.mie.length === 1 ? 'parola' : 'parole'} · <b>${tot}</b> punti${p.nRound > 1 && p.round > 1 && !p.aSquadre ? ` <small>(totale ${p.punti[ctx.mio] + tot})</small>` : ''}</div>
        <ul class="prl-mie">${mie.map((x) => `<li class="${x === nuova ? 'nuova' : ''}"><span>${esc(x.toUpperCase())}</span>${p.aSquadre ? chiDi(x) : ''}<b>${puntiDi(x)}</b></li>`).join('') || '<li class="prl-vuoto">Ancora nessuna parola</li>'}</ul>
        <p class="prl-aiuto"><kbd>Invio</kbd> invia · <kbd>Esc</kbd> cancella · trascina col mouse</p>
        ${attivo(ctx) ? `<button type="button" class="prl-link" data-az="prl-finito">${ui.confermaFine ? 'Sicuro? Clicca ancora per finire' : 'Ho finito'}</button>` : ''}
      </div>
    </div>`;
  }

  function pannoRisultati(ctx) {
    const p = ctx.partita, e = p.esito;
    // a squadre: prima la mia squadra, poi l'altra
    const sq = (i) => (p.aSquadre ? (p.squadra[i] === p.squadra[ctx.mio] ? 0 : 1) : 0);
    const ordine = Array.from({ length: p.n }, (_, i) => i).sort((a, b) => sq(a) - sq(b) || (a === ctx.mio ? -1 : b === ctx.mio ? 1 : e.punti[b] - e.punti[a]));
    const colonne = ordine.map((i) => `<section class="prl-col ${i === ctx.mio ? 'prl-io' : ''} ${p.aSquadre ? (sq(i) ? 'prl-loro' : 'prl-noi') : ''}">
      <h3><span>${esc(ctx.nome(i))}</span><b>${e.punti[i]}</b></h3>
      <ul>${e.parole[i].map((x) => `<li class="${x.doppia && p.doppieAnnullate && p.n > 1 ? 'doppia' : ''}" data-w="${esc(x.w)}"><span>${esc(x.w)}</span><b>${x.doppia && p.doppieAnnullate && p.n > 1 ? 0 : x.punti}</b></li>`).join('') || '<li class="prl-vuoto">nessuna parola</li>'}</ul>
    </section>`).join('');
    const mancate = e.mancate.length ? `<section class="prl-mancate"><h3>Nessuno le ha trovate <small>(${e.totale} parole possibili)</small></h3>
      <p>${e.mancate.map((x) => `<span data-w="${esc(x.w)}">${esc(x.w)}<sup>${x.punti}</sup></span>`).join('')}</p></section>` : '';
    const ultimo = p.round >= p.nRound;
    const bottone = p.finita ? '' : p.mioPronto ? `<p class="prl-attesa">Aspetta gli altri… (${Math.ceil(p.restaRisultati / 1000)} s)</p>`
      : `<button type="button" class="bottone primario-bt" data-az="prl-pronto">${ultimo ? 'Classifica finale' : `Round ${p.round + 1} ▸`}</button>`;
    const totSq = (t) => p.squadra.reduce((s, x, q) => s + (x === t ? p.punti[q] : 0), 0), mia = p.aSquadre ? p.squadra[ctx.mio] : 0;
    const totali = p.aSquadre ? `<p class="prl-totali prl-sq">La tua squadra <b>+${e.puntiSquadre[mia]}</b> · l'altra <b>+${e.puntiSquadre[1 - mia]}</b>${p.nRound > 1 ? ` <small>(totale ${totSq(mia)} a ${totSq(1 - mia)})</small>` : ''}</p>` : p.nRound > 1 ? `<p class="prl-totali">Totale: ${ordine.map((i) => `${esc(ctx.nome(i))} <b>${p.punti[i]}</b>`).join(' · ')}</p>` : '';
    return `<div class="prl prl-fine" style="--lato:${p.lato}">
      <div class="prl-sx">${p.nRound > 1 ? `<span class="prl-round">Round ${p.round} di ${p.nRound}</span>` : ''}${griglia(ctx, [], true)}
        <p class="prl-aiuto">Passa sopra una parola per vederla sulla griglia.${p.doppieAnnullate && p.n > 1 ? '<br>Le parole <s>barrate</s> le ha trovate più di un giocatore: non valgono.' : ''}</p>
        ${bottone}</div>
      <div class="prl-dx larga">${totali}<div class="prl-colonne">${colonne}</div>${mancate}</div>
    </div>`;
  }

  // ---- invio e modifica della parola ----
  function invia(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!attivo(ctx)) return;
    const { w, via } = scelta(ctx);
    ui.sel = []; ui.scritta = '';
    if (!w) return ctx.ridisegna();
    if (w.length < p.minimo) { ctx.avviso(`Servono almeno ${p.minimo} lettere`, 1300); return ctx.ridisegna(); }
    if (!via) { ctx.avviso(`${w.toUpperCase()} non è sulla griglia`, 1300); return ctx.ridisegna(); }
    if (p.mie.includes(w)) { ctx.avviso(`${w.toUpperCase()}: ${p.aSquadre ? 'già trovata dalla squadra' : 'l\'hai già trovata'}`, 1300); return ctx.ridisegna(); }
    ctx.invia({ tipo: 'parola', parola: w });
    ctx.ridisegna();
  }

  // trascinare sulla griglia: si ascolta tutto il documento (il tavolo si può ridisegnare a metà trascinamento)
  let trascina = null; // { mosso }
  const cellaDa = (x, y) => { const el = document.elementFromPoint(x, y); const c = el && el.closest && el.closest('.prl-griglia:not(.piccola) [data-cella]'); return c ? Number(c.dataset.cella) : null; };
  // il dito deve stare nella parte centrale della casella per passare alla prossima (così le diagonali riescono)
  function centrale(x, y) {
    const el = document.elementFromPoint(x, y); const c = el && el.closest && el.closest('[data-cella]');
    if (!c) return false;
    const r = c.getBoundingClientRect(); const dx = (x - r.left) / r.width - 0.5, dy = (y - r.top) / r.height - 0.5;
    return dx * dx + dy * dy < 0.16;
  }
  document.addEventListener('pointerdown', (e) => {
    const ctx = ctxP;
    if (!attivo(ctx) || e.button > 0) return;
    const i = cellaDa(e.clientX, e.clientY);
    if (i === null) return;
    e.preventDefault();
    const ui = ctx.ui, p = ctx.partita;
    ui.scritta = '';
    ui.sel = ui.sel || [];
    // tocco su una lettera vicina all'ultima scelta: si continua la parola (si può comporre anche a tocchi)
    const ultima = ui.sel[ui.sel.length - 1];
    if (ui.sel.length && ultima === i) { trascina = { mosso: false, tocco: true }; return; }
    if (ui.sel.length && vicini(p.lato, ultima, i) && !ui.sel.includes(i)) ui.sel.push(i);
    else ui.sel = [i];
    trascina = { mosso: false };
    ctx.ridisegna();
  });
  document.addEventListener('pointermove', (e) => {
    const ctx = ctxP;
    if (!trascina || !attivo(ctx)) return;
    const i = cellaDa(e.clientX, e.clientY);
    if (i === null || !centrale(e.clientX, e.clientY)) return;
    const ui = ctx.ui, p = ctx.partita, sel = ui.sel;
    const ultima = sel[sel.length - 1];
    if (i === ultima) return;
    if (sel.length > 1 && sel[sel.length - 2] === i) { sel.pop(); trascina.mosso = true; return ctx.ridisegna(); } // si torna indietro
    if (sel.includes(i) || !vicini(p.lato, ultima, i)) return;
    sel.push(i); trascina.mosso = true;
    suono([[440 + sel.length * 40, 0.03]], { volume: 0.025 });
    ctx.ridisegna();
  });
  const fineTrascina = () => {
    const ctx = ctxP, t = trascina;
    trascina = null;
    if (!t || !attivo(ctx)) return;
    // trascinamento: la parola parte quando si lascia; tocco sull'ultima lettera: invia anche lui
    if (t.mosso || t.tocco) invia(ctx);
  };
  document.addEventListener('pointerup', fineTrascina);
  document.addEventListener('pointercancel', () => { trascina = null; });

  // la tastiera: si scrive senza cliccare da nessuna parte
  document.addEventListener('keydown', (e) => {
    const ctx = ctxP;
    if (!ctx || !ctx.stato || !ctx.partita || ctx.partita.gioco !== 'paroliere') return;
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if ((window.Boss && Boss.attivo) || !document.querySelector('.prl')) return;
    const p = ctx.partita, ui = ctx.ui;
    if (p.fase !== 'gioco') {
      if (e.key === 'Enter' && !p.finita && !p.mioPronto && !e.target.closest('button')) { e.preventDefault(); ctx.invia({ tipo: 'pronto' }); }
      return;
    }
    if (!attivo(ctx)) return;
    const k = e.key.length === 1 ? e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : e.key;
    if (/^[a-z]$/.test(k)) {
      e.preventDefault();
      if (ui.sel && ui.sel.length) { ui.scritta = parolaDa(p, ui.sel); ui.sel = []; }
      if ((ui.scritta || '').length < 25) ui.scritta = (ui.scritta || '') + k;
      return ctx.ridisegna();
    }
    if (k === 'Backspace') {
      e.preventDefault();
      if (ui.sel && ui.sel.length) ui.sel.pop(); else ui.scritta = (ui.scritta || '').slice(0, -1);
      return ctx.ridisegna();
    }
    if (k === 'Escape' || k === 'Delete') { ui.sel = []; ui.scritta = ''; return ctx.ridisegna(); }
    if (k === 'Enter' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); invia(ctx); }
  });

  // nei risultati: passando sopra una parola si accende sulla griglia
  function accendi(w) {
    const ctx = ctxP;
    const g = document.querySelector('.prl-griglia.piccola');
    if (!g || !ctx || !ctx.partita) return;
    const via = w ? percorso(ctx.partita, w) || [] : [];
    g.querySelectorAll('[data-cella]').forEach((c) => { const k = via.indexOf(Number(c.dataset.cella)); c.classList.toggle('acceso', k >= 0); c.classList.toggle('primo', k === 0); });
  }
  document.addEventListener('pointerover', (e) => { const el = e.target.closest && e.target.closest('.prl-fine [data-w]'); if (el) accendi(el.dataset.w); });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest && e.target.closest('.prl-fine [data-w]'); if (el) accendi(null); });

  const tavolo = {
    libero: true,
    reset(ctx) {
      ctxP = ctx;
      const ui = ctx.ui, p = ctx.partita;
      if (ui._round !== p.round) { ui._round = p.round; ui.sel = []; ui.scritta = ''; ui.confermaFine = false; }
      ui.sel = ui.sel || [];
    },
    panno(ctx) { return ctx.partita.fase === 'gioco' ? pannoGioco(ctx) : pannoRisultati(ctx); },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      // la parola appena accettata: un suono e un lampo nell'elenco
      const n = p.mie.length;
      if (ui._nMie === undefined || p.round !== ui._nRound) { ui._nMie = n; ui._nRound = p.round; }
      else if (n > ui._nMie) {
        ui._nMie = n; ui.ultimaNuova = p.mie[n - 1];
        const lunga = ui.ultimaNuova.length >= 6;
        suono(lunga ? [[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.14]] : [[660, 0.06], [880, 0.1]], { volume: 0.06 });
        setTimeout(() => { if (ui.ultimaNuova === p.mie[n - 1]) { ui.ultimaNuova = null; } }, 900);
        ctx.ridisegna();
        return;
      }
      if (p.fase === 'risultati' && primaVolta(ui, `prl-fine-${p.round}`)) suono([[392, 0.1], [523, 0.1], [659, 0.18]], { volume: 0.06 });
      // l'orologio
      clearInterval(ui._prlT);
      ui._prlT = setInterval(() => {
        const el = document.querySelector('.prl-tempo');
        if (!el) return clearInterval(ui._prlT);
        const resta = Math.max(0, Number(el.dataset.fine) - Date.now()), s = Math.ceil(resta / 1000);
        el.querySelector('b').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        el.classList.toggle('poco', resta < 20000);
        if (resta < 10500 && resta > 0 && s !== ui._bip) { ui._bip = s; suono([[880, 0.04]], { volume: 0.03 }); }
      }, 250);
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'risultati') return p.mioPronto ? 'Aspetta gli altri' : 'Le parole di tutti';
      return p.mioFinito ? 'Hai finito: aspetta gli altri' : 'Trova più parole che puoi!';
    },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.n === 1) return `<span>Punti <b>${p.fase === 'gioco' ? p.punti[0] + p.mie.reduce((s, x) => s + puntiDi(x), 0) : p.punti[0]}</b></span>`;
      if (p.aSquadre) {
        const mia = p.squadra[ctx.mio], tot = (t) => p.squadra.reduce((s, x, q) => s + (x === t ? p.punti[q] : 0), 0);
        return `<span>La tua squadra <b>${tot(mia)}</b></span><span>Avversari <b>${tot(1 - mia)}</b></span><span class="obiettivo">punti</span>`;
      }
      return p.punti.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita, a = p.altri[posto];
      if (!a) return '';
      if (p.fase === 'gioco') return `<span class="prl-info">${a.quante} ${a.quante === 1 ? 'parola' : 'parole'}${a.finito ? ' · ha finito' : ''}</span>`;
      return `<span class="prl-info">${p.esito ? `+${p.esito.punti[posto]}` : ''}${a.pronto ? ' ✓' : ''}</span>`;
    },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui;
      if (az !== 'prl-finito') ui.confermaFine = false;
      if (az === 'prl-invia') return invia(ctx);
      if (az === 'prl-cancella') { ui.sel = []; ui.scritta = ''; return ctx.ridisegna(); }
      if (az === 'prl-finito') {
        if (!attivo(ctx)) return;
        if (!ui.confermaFine) { ui.confermaFine = true; return ctx.ridisegna(); }
        ui.confermaFine = false;
        return ctx.invia({ tipo: 'finito' });
      }
      if (az === 'prl-pronto') return ctx.invia({ tipo: 'pronto' });
    },
  };

  Object.assign(window.Tavoli, { paroliere: tavolo });
})();
