// VIDEO POKER: la macchinetta del casinò. In alto la tabella delle vincite (colonna della puntata evidenziata, riga
// vinta che si illumina), al centro le 5 carte con TENUTA sotto quelle tenute, in basso crediti, puntata, vincita e i
// pulsanti. Sul computer: tasti 1-5 per tenere le carte, Invio o spazio per distribuire e cambiare.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const fmt = (n) => Number(n).toLocaleString('it-IT');
  const v14 = (c) => (c.rango === 1 ? 14 : c.rango);
  let ctxVP = null;

  // carte che formano la combinazione vinta (per illuminarle)
  function carteVincenti(carte, riga) {
    if (!riga) return new Set();
    if (['royal', 'scalaColore', 'colore', 'scala', 'full'].includes(riga)) return new Set(carte.map((c) => c.id));
    const conta = {};
    for (const c of carte) conta[v14(c)] = (conta[v14(c)] || 0) + 1;
    return new Set(carte.filter((c) => conta[v14(c)] >= 2 && (riga !== 'coppia' || v14(c) >= 11)).map((c) => c.id));
  }

  function statoUi(ctx) {
    const ui = ctx.ui, p = ctx.partita;
    if (ui.vpMano !== p.nMano) { ui.vpMano = p.nMano; ui.vpTieni = []; ui.vpInviato = false; }
    if (ui.vpCrediti == null) ui.vpCrediti = p.crediti;
    if (ui.vpConsiglio === undefined) { try { ui.vpConsiglio = localStorage.getItem('if:vpConsiglio') === '1'; } catch { ui.vpConsiglio = false; } }
    return ui;
  }
  const puoiPuntare = (p, cr) => p.fiche[0] >= cr * p.credito || (cr === 1 && p.fiche[0] > 0);

  function distribuisci(ctx, crediti) {
    const p = ctx.partita;
    if (p.fase === 'cambio' || !puoiPuntare(p, crediti)) return;
    ctx.ui.vpCrediti = crediti;
    suono([[520, 0.04], [660, 0.05]], { volume: 0.04 });
    ctx.invia({ tipo: 'distribuisci', crediti });
  }
  function cambia(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (p.fase !== 'cambio' || ui.vpInviato) return;
    ui.vpInviato = true;
    ctx.invia({ tipo: 'cambia', tieni: ui.vpTieni.filter((id) => p.carte.some((c) => c.id === id)) });
  }
  function tieni(ctx, id) {
    const p = ctx.partita, ui = ctx.ui;
    if (p.fase !== 'cambio' || ui.vpInviato) return;
    ui.vpTieni = ui.vpTieni.includes(id) ? ui.vpTieni.filter((x) => x !== id) : [...ui.vpTieni, id];
    suono([[ui.vpTieni.includes(id) ? 880 : 440, 0.035]], { tipo: 'square', volume: 0.025 });
    ctx.ridisegna();
  }
  const nomeCarte = (p, ids) => {
    const cs = p.carte.filter((c) => ids.includes(c.id));
    return cs.length ? cs.map((c) => Carte.nome(c)).join(', ') : 'nessuna (cambia tutto)';
  };

  const tavolo = {
    libero: true,
    senzaFila: true,
    reset(ctx) { ctxVP = ctx; statoUi(ctx); },
    panno(ctx) {
      const p = ctx.partita, ui = statoUi(ctx);
      const cr = p.fase === 'cambio' ? p.creditiMano : Math.min(ui.vpCrediti, 5);
      const vinta = p.fase === 'esito' && p.esito && p.esito.riga;
      const righe = p.tabella.map((r) => `<tr class="${vinta === r.k ? 'vp-vinta' : ''}"><th>${esc(r.nome)}</th>${r.paga.map((x, j) =>
        `<td class="${j + 1 === cr ? 'vp-col' : ''}">${fmt(x)}</td>`).join('')}</tr>`).join('');
      const tabella = `<table class="vp-tabella" aria-label="Tabella delle vincite in crediti"><thead><tr><th>Tabella ${esc(p.nomeTabella)} · crediti puntati</th>${[1, 2, 3, 4, 5].map((n) =>
        `<th class="${n === cr ? 'vp-col' : ''}">${n}</th>`).join('')}</tr></thead><tbody>${righe}</tbody></table>`;

      // le carte
      const cons = ui.vpConsiglio && p.consiglio ? new Set(p.consiglio.tieni) : null;
      const vincenti = vinta ? carteVincenti(p.carte, vinta) : new Set();
      const chiaveMano = `${p.nMano}-${p.fase === 'cambio' ? 'a' : 'b'}`;
      const nuove = primaVolta(ui, `vp-gira-${chiaveMano}`);
      const carte = p.carte.length ? p.carte.map((c, i) => {
        const tenuta = p.fase === 'cambio' ? ui.vpTieni.includes(c.id) : p.tenute.includes(c.id);
        const gira = nuove && (p.fase === 'cambio' || !p.tenute.includes(c.id));
        const cls = ['vp-carta', tenuta ? 'vp-tenuta' : '', cons && cons.has(c.id) ? 'vp-consigliata' : '', vincenti.has(c.id) ? 'vp-vince' : '', vinta && !vincenti.has(c.id) ? 'vp-spenta' : '', gira ? 'vp-gira' : ''].join(' ');
        const att = p.fase === 'cambio' ? `data-az="tieni" data-id="${esc(c.id)}" role="button" tabindex="0" aria-pressed="${tenuta}" aria-label="${tenuta ? 'Tenuta' : 'Tieni'} ${Carte.nome(c)} (tasto ${i + 1})"` : '';
        return `<div class="vp-posto" ${att} style="--k:${i}">${Carte.fronte(c, cls)}<span class="vp-etichetta ${tenuta ? 'si' : ''}">${tenuta ? 'TENUTA' : p.fase === 'cambio' ? `<kbd>${i + 1}</kbd>` : ''}</span></div>`;
      }).join('') : Array.from({ length: 5 }, (_, i) => `<div class="vp-posto" style="--k:${i}">${Carte.retro('vp-carta')}<span class="vp-etichetta"></span></div>`).join('');

      // messaggio sotto le carte
      let msg;
      if (p.fase === 'cambio') msg = 'Clicca le carte da tenere, poi <b>Cambia</b>';
      else if (p.fase === 'esito') msg = p.esito.vinto ? `<b class="vp-oro">${esc(p.esito.nome)}</b> · vinci ${fmt(p.esito.creditiVinti)} ${p.esito.creditiVinti === 1 ? 'credito' : 'crediti'} (${fmt(p.esito.vinto)} fiche)` : 'Niente questa volta · <b>Distribuisci</b> per giocare ancora';
      else msg = 'Scegli la puntata e premi <b>Distribuisci</b>';

      // consiglio
      let consiglio = '';
      if (p.fase === 'cambio') {
        if (ui.vpConsiglio && p.consiglio) {
          const c = p.consiglio;
          const mie = ui.vpTieni.length === c.tieni.length && ui.vpTieni.every((x) => c.tieni.includes(x));
          const mia = (p.consiglio.tutte || []).find((x) => x.m === p.carte.reduce((m, k, i) => m | (ui.vpTieni.includes(k.id) ? 1 << i : 0), 0));
          consiglio = `<div class="vp-consiglio"><p>💡 Strategia ottimale: tieni <b>${esc(nomeCarte(p, c.tieni))}</b> · rende in media <b>${c.ev.toFixed(3).replace('.', ',')}</b> per credito</p>
            ${!mie && mia ? `<p class="vp-tua">La tua scelta rende ${mia.ev.toFixed(3).replace('.', ',')} per credito <button type="button" class="bottone mini-bt" data-az="usaConsiglio">Usa il consiglio</button></p>` : mie ? '<p class="vp-tua ok">✓ Stai giocando la scelta migliore</p>' : ''}</div>`;
        }
      }

      // pannello in basso: crediti, puntata, vincita e pulsanti
      const creditiAvuti = Math.floor(p.fiche[0] / p.credito);
      const scarso = p.fase !== 'cambio' && p.fiche[0] < p.credito;
      const bottoni = p.fase === 'cambio'
        ? `<button type="button" class="bottone primario-bt vp-grande" data-az="cambia" ${ui.vpInviato ? 'disabled' : ''}>Cambia ${5 - ui.vpTieni.length ? `${5 - ui.vpTieni.length} ${5 - ui.vpTieni.length === 1 ? 'carta' : 'carte'}` : '(tengo tutto)'}</button>`
        : p.fiche[0] <= 0
          ? '<button type="button" class="bottone primario-bt vp-grande" data-az="ricarica">💰 Ricarica 1000 fiche</button>'
          : `<button type="button" class="bottone vp-bt" data-az="puntaUno" ${scarso ? 'disabled' : ''}>Punta 1 <small>(${Math.min(ui.vpCrediti, 5)}/5)</small></button>
             <button type="button" class="bottone vp-bt" data-az="puntaMax" ${puoiPuntare(p, 5) ? '' : 'disabled'}>Punta max</button>
             <button type="button" class="bottone primario-bt vp-grande" data-az="distribuisci">${scarso ? `Gioca le ultime ${p.fiche[0]} fiche` : 'Distribuisci'}</button>`;
      const vincita = p.fase === 'esito' && p.esito ? p.esito.creditiVinti : 0;
      const storia = p.storia.length ? `<div class="vp-storia" title="Ultime mani">${p.storia.map((s) => `<span class="${s.vinto > 0 ? 'su' : s.vinto < 0 ? 'giu' : ''}">${s.nome ? esc(p.tabella.find((r) => r.k === s.nome).nome.replace('Coppia di fanti o meglio', 'Fanti+')) : '—'}</span>`).join('')}</div>` : '';
      const conti = p.conti.mani ? `<p class="vp-conti">${fmt(p.conti.mani)} ${p.conti.mani === 1 ? 'mano' : 'mani'} · puntate ${fmt(p.conti.puntate)} · vinte ${fmt(p.conti.vinte)} fiche · resa ${String(p.rendimento).replace('.', ',')}%</p>` : '';

      return `<div class="vp"><div class="vp-macchina">
        <div class="vp-testa"><span class="vp-marchio">♠ JACKS OR BETTER ♥</span><span class="vp-sotto">fanti o meglio · 1 credito = ${fmt(p.credito)} ${p.credito === 1 ? 'fiche' : 'fiche'}</span></div>
        ${tabella}
        <div class="vp-carte">${carte}</div>
        <p class="vp-msg ${vinta ? 'vp-msg-vinta' : ''}">${msg}</p>
        ${consiglio}
        <div class="vp-fondo"><div class="vp-quadri">
          <div class="vp-quadro"><small>CREDITI</small><b>${fmt(creditiAvuti)}</b><i>${fmt(p.fiche[0])} fiche</i></div>
          <div class="vp-quadro"><small>PUNTATA</small><b>${p.fase === 'cambio' ? p.creditiMano : Math.min(ui.vpCrediti, 5)}</b><i>${fmt((p.fase === 'cambio' ? p.puntata : Math.min(ui.vpCrediti, 5) * p.credito))} fiche</i></div>
          <div class="vp-quadro ${vincita ? 'vp-acceso' : ''}"><small>VINCITA</small><b>${fmt(vincita)}</b><i>${p.fase === 'esito' && p.esito ? `${fmt(p.esito.vinto)} fiche` : '&nbsp;'}</i></div>
        </div>
        <div class="vp-comandi">${bottoni}
          <button type="button" class="bottone mini-bt vp-cons-bt" data-az="consiglio" aria-pressed="${!!ui.vpConsiglio}">💡 Consiglio</button></div></div>
        <div class="vp-piede"><p class="vp-tasti">Tasti: <kbd>1</kbd>–<kbd>5</kbd> tieni · <kbd>Invio</kbd> ${p.fase === 'cambio' ? 'cambia' : 'distribuisci'}</p>${storia}${conti}</div>
      </div></div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.fase === 'esito' && p.esito && primaVolta(ctx.ui, `vp-esito-${p.nMano}`)) {
        if (p.esito.vinto >= p.puntata * 9) suono([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.25]], { volume: 0.06 });
        else if (p.esito.vinto) suono([[660, 0.07], [880, 0.12]], { volume: 0.05 });
        else suono([[220, 0.12]], { volume: 0.03 });
      }
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.fase === 'cambio') return 'Scegli le carte da tenere';
      if (p.fase === 'esito' && p.esito && p.esito.vinto) return `${p.esito.nome}!`;
      return 'Punta e distribuisci';
    },
    infoPosto(ctx) { return `${fmt(ctx.partita.fiche[0])} fiche`; },
    clic(ctx, el) {
      const p = ctx.partita, ui = statoUi(ctx), az = el.dataset.az;
      if (az === 'tieni') return tieni(ctx, el.dataset.id);
      if (az === 'cambia') return cambia(ctx);
      if (az === 'distribuisci') return distribuisci(ctx, p.fiche[0] < p.credito ? 1 : Math.min(ui.vpCrediti, 5));
      if (az === 'puntaUno') { let c = ui.vpCrediti % 5 + 1; if (!puoiPuntare(p, c)) c = 1; ui.vpCrediti = c; suono([[600 + c * 60, 0.03]], { tipo: 'square', volume: 0.02 }); return ctx.ridisegna(); }
      if (az === 'puntaMax') return distribuisci(ctx, 5);
      if (az === 'ricarica') return ctx.chat('!ricarica');
      if (az === 'consiglio') { ui.vpConsiglio = !ui.vpConsiglio; try { localStorage.setItem('if:vpConsiglio', ui.vpConsiglio ? '1' : ''); } catch { /* niente */ } return ctx.ridisegna(); }
      if (az === 'usaConsiglio' && p.consiglio) { ui.vpTieni = [...p.consiglio.tieni]; return ctx.ridisegna(); }
      return undefined;
    },
  };

  // tastiera: 1-5 tengono le carte, Invio/spazio distribuisce o cambia
  document.addEventListener('keydown', (e) => {
    const ctx = ctxVP;
    const p = ctx && ctx.stato && ctx.partita;
    if (!p || p.gioco !== 'videopoker' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (!document.querySelector('#panno .vp')) return;
    if (/^[1-5]$/.test(e.key) && p.fase === 'cambio') { e.preventDefault(); const c = p.carte[Number(e.key) - 1]; if (c) tieni(ctx, c.id); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      if (t && t.tagName === 'BUTTON') return; // su un pulsante Invio e spazio lo premono già
      e.preventDefault();
      if (p.fase === 'cambio') cambia(ctx);
      else if (p.fiche[0] > 0) distribuisci(ctx, p.fiche[0] < p.credito ? 1 : Math.min(ctx.ui.vpCrediti || 1, 5));
    }
  });

  Object.assign(window.Tavoli, { videopoker: tavolo });
})();
