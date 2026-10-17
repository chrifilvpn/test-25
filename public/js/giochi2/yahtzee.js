// CINQUE DADI: a sinistra il vassoio dei dadi (clic o tasti 1-5 per tenerli, spazio per tirare), a destra la scheda
// con una colonna per giocatore. Nella colonna di chi è di turno le caselle libere mostrano quanto farebbe:
// la persona clicca la casella per segnare.
(() => {
  const { esc, primaVolta, suono, ritardo } = window.Nuovi;
  const CAT = ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'tris', 'poker', 'full', 'scalaP', 'scalaG', 'cinque5', 'somma'];
  const NOMI = { uno: 'Uno', due: 'Due', tre: 'Tre', quattro: 'Quattro', cinque: 'Cinque', sei: 'Sei', tris: 'Tris', poker: 'Poker', full: 'Full', scalaP: 'Scala piccola', scalaG: 'Scala grande', cinque5: 'Cinque dadi', somma: 'Somma' };
  const AIUTO = { uno: 'somma degli 1', due: 'somma dei 2', tre: 'somma dei 3', quattro: 'somma dei 4', cinque: 'somma dei 5', sei: 'somma dei 6', tris: '3 uguali: somma di tutti', poker: '4 uguali: somma di tutti', full: '3 + 2 uguali: 25', scalaP: '4 di fila: 30', scalaG: '5 di fila: 40', cinque5: '5 uguali: 50', somma: 'somma di tutti' };
  const PUNTI = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
  let ctxYZ = null;
  const tenuti = (ctx) => { const ui = ctx.ui, p = ctx.partita; const k = `${p.turno}-${p.round}`; if (ui.yzK !== k) { ui.yzK = k; ui.yzTieni = [false, false, false, false, false]; } return ui.yzTieni; };

  function tira(ctx) {
    const p = ctx.partita;
    if (p.turno !== ctx.mio || p.tiri >= 3) return;
    const t = tenuti(ctx);
    if (p.tiri && t.every(Boolean)) return ctx.avviso('Tieni tutti i dadi: segna una casella');
    suono([[260, 0.03], [330, 0.03], [300, 0.03], [390, 0.05]], { tipo: 'square', volume: 0.025 });
    ctx.invia({ tipo: 'tira', tieni: p.tiri ? t.map((x, i) => (x ? i : -1)).filter((i) => i >= 0) : [] });
  }
  function tieni(ctx, i) {
    const p = ctx.partita;
    if (p.turno !== ctx.mio || !p.tiri || p.tiri >= 3) return;
    const t = tenuti(ctx); t[i] = !t[i];
    suono([[t[i] ? 720 : 480, 0.03]], { volume: 0.025 });
    ctx.ridisegna();
  }

  const tavolo = {
    libero: true,
    senzaFila: true,
    reset(ctx) { ctxYZ = ctx; },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, io = ctx.mio;
      const mio = p.turno === io && !p.finita;
      const t = tenuti(ctx);
      const chiaveTiro = `yz-${p.nTiro}`;
      const st = ritardo(ui, chiaveTiro);
      const dadi = p.dadi.map((v, i) => {
        const tenuto = mio ? t[i] : p.tenuti[i];
        const rotola = p.tiri && !p.tenuti[i];
        const att = mio && p.tiri && p.tiri < 3 ? `data-az="tieni" data-i="${i}" role="button" tabindex="0" aria-pressed="${tenuto}" aria-label="Dado ${i + 1}: ${v}${tenuto ? ', tenuto' : ''}"` : '';
        return `<div class="yz-posto" ${att}><svg class="yz-dado ${tenuto ? 'tenuto' : ''} ${rotola ? 'rotola' : ''} ${!p.tiri ? 'spento' : ''}" viewBox="0 0 100 100" style="--k:${i};${st}"><rect x="5" y="5" width="90" height="90" rx="18"/>${PUNTI[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5"/>`).join('')}</svg>
          <span class="yz-etich">${tenuto ? 'TENUTO' : mio && p.tiri && p.tiri < 3 ? `<kbd>${i + 1}</kbd>` : ''}</span></div>`;
      }).join('');
      const tiriPallini = [1, 2, 3].map((k) => `<i class="${p.tiri >= k ? 'fatto' : ''}"></i>`).join('');
      let msg;
      if (p.finita) msg = p.n === 1 ? `Partita finita: <b>${p.totali[0]}</b> punti` : p.risultato.vincitori.includes(io) ? 'Hai vinto! 🎉' : `Vince ${esc(ctx.nome(p.risultato.vincitori[0]))}`;
      else if (mio) msg = !p.tiri ? 'Tira i dadi' : p.tiri < 3 ? 'Tieni i dadi che vuoi e ritira, oppure segna una casella' : 'Ultimo tiro fatto: scegli la casella';
      else msg = `${esc(ctx.nome(p.turno))} ${p.tiri ? 'pensa…' : 'sta per tirare'}`;
      if (p.jolly && p.jolly.obbligo && mio) msg = `Cinque dadi uguali! Devi segnarli in <b>${NOMI[p.jolly.obbligo]}</b>${p.jolly.bonus ? ' (+100 di bonus)' : ''}`;
      else if (p.jolly && p.jolly.jolly && mio) msg = `Cinque dadi uguali come <b>jolly</b>: valgono in qualsiasi casella${p.jolly.bonus ? ' (+100 di bonus)' : ''}`;
      const tiraBt = mio && p.tiri < 3 ? `<button class="bottone primario-bt yz-tira" data-az="tira">🎲 ${p.tiri ? `Ritira${t.some(Boolean) ? ` ${t.filter((x) => !x).length} ${t.filter((x) => !x).length === 1 ? 'dado' : 'dadi'}` : ''}` : 'Tira i dadi'}</button>` : '';
      const vassoio = `<div class="yz-vassoio">
        <div class="yz-giro">Giro <b>${p.round}</b> di 13 · tiri <span class="yz-tiri">${tiriPallini}</span></div>
        <div class="yz-dadi ${mio ? 'mio' : ''}">${dadi}</div>
        <p class="yz-msg" aria-live="polite">${msg}</p>${tiraBt}
        ${mio ? '<p class="yz-tasti"><kbd>spazio</kbd> tira · <kbd>1</kbd>–<kbd>5</kbd> tieni</p>' : ''}</div>`;

      // la scheda
      const ordine = [io, ...Array.from({ length: p.n }, (_, i) => i).filter((i) => i !== io)];
      const nome = (i) => (i === io ? 'Tu' : esc(ctx.nome(i)));
      const ult = p.ultima;
      const cella = (i, c) => {
        const v = p.schede[i][c];
        const appena = ult && ult.posto === i && ult.cat === c && ult.n === ui.yzUltima;
        if (v !== null) return `<td class="${appena ? 'yz-appena' : ''} ${v === 0 ? 'zero' : ''}">${v}</td>`;
        if (p.turno === i && p.possibili && c in p.possibili) {
          const pt = p.possibili[c];
          if (i === io) return `<td class="yz-libera mia ${pt ? '' : 'zero'}" data-az="segna" data-c="${c}" role="button" tabindex="0" aria-label="Segna ${pt} in ${NOMI[c]}">${pt}</td>`;
          return `<td class="yz-libera">${pt}</td>`;
        }
        return '<td></td>';
      };
      const riga = (c) => `<tr><th title="${AIUTO[c]}">${NOMI[c]}<small>${AIUTO[c]}</small></th>${ordine.map((i) => cella(i, c)).join('')}</tr>`;
      const tab = `<table class="yz-scheda">
        <thead><tr><th></th>${ordine.map((i) => `<th class="${p.turno === i ? 'di-turno' : ''}">${nome(i)}</th>`).join('')}</tr></thead>
        <tbody>${CAT.slice(0, 6).map(riga).join('')}
          <tr class="yz-parz"><th>Parte alta<small>bonus 35 da 63</small></th>${ordine.map((i) => `<td>${p.alte[i]}<small>${p.alte[i] >= 63 ? ' +35' : `/63`}</small></td>`).join('')}</tr>
          ${CAT.slice(6).map(riga).join('')}
          ${p.extra.some(Boolean) ? `<tr class="yz-parz"><th>Bonus cinque dadi</th>${ordine.map((i) => `<td>${p.extra[i] || ''}</td>`).join('')}</tr>` : ''}
          <tr class="yz-tot"><th>Totale</th>${ordine.map((i) => `<td>${p.totali[i]}</td>`).join('')}</tr></tbody></table>`;
      return `<div class="yz">${vassoio}<div class="yz-tab">${tab}</div></div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.ultima && primaVolta(ctx.ui, `yz-u-${p.ultima.n}`)) {
        ctx.ui.yzUltima = p.ultima.n;
        if (p.ultima.posto !== ctx.mio) suono([[440, 0.04]], { volume: 0.03 });
        else suono(p.ultima.punti ? [[523, 0.05], [784, 0.08]] : [[260, 0.1]], { volume: 0.04 });
      }
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.turno === ctx.mio && !p.finita) return p.tiri ? `Tocca a te · tiro ${p.tiri} di 3` : 'Tocca a te: tira';
      return null;
    },
    punteggio() { return ''; },
    infoPosto(ctx, posto) { return `${ctx.partita.totali[posto]} punti`; },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'tira') return tira(ctx);
      if (az === 'tieni') return tieni(ctx, Number(el.dataset.i));
      if (az === 'segna') { suono([[600, 0.04]], { volume: 0.03 }); return ctx.invia({ tipo: 'segna', cat: el.dataset.c }); }
      return undefined;
    },
  };
  document.addEventListener('keydown', (e) => {
    const ctx = ctxYZ, p = ctx && ctx.stato && ctx.partita;
    if (!p || p.gioco !== 'yahtzee' || p.turno !== ctx.mio || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.isContentEditable)) return;
    if (!document.querySelector('#panno .yz')) return;
    if (e.key === ' ') { e.preventDefault(); tira(ctx); }
    else if (/^[1-5]$/.test(e.key)) { e.preventDefault(); tieni(ctx, Number(e.key) - 1); }
  });
  Object.assign(window.Tavoli, { yahtzee: tavolo });
})();
