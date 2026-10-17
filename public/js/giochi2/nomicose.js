// NOMI COSE CITTÀ: il tavolo nel browser. In alto la lettera del giro su una tessera, sotto un cartellino per
// categoria con la sua casella (Invio passa alla casella dopo). Poi la tabella con le risposte di tutti: le dubbie si
// votano con 👍 e 👎; infine i punti di ogni casella.
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  let ctxN = null;

  const scrivendo = (ctx) => { const p = ctx && ctx.partita; return !!(p && p.gioco === 'nomicose' && !p.finita && p.fase === 'scrivi'); };
  const L = (x) => String(x || '').toUpperCase();

  // ---- le caselle: il testo resta in ctx.ui (sopravvive ai ridisegni) e va al server poco dopo ----
  const attese = {};
  function manda(ctx, cat, subito = false) {
    clearTimeout(attese[cat]);
    const via = () => { if (scrivendo(ctx)) ctx.invia({ tipo: 'risposta', cat, testo: ctx.ui.campi[cat] || '' }); };
    // negli ultimi secondi si manda a ogni lettera, così non si perde niente
    if (subito || (ctx.partita.resta || 0) < 4000) via(); else attese[cat] = setTimeout(via, 450);
  }
  function mandaTutto(ctx) { for (const c of ctx.partita.cats) manda(ctx, c.id, true); }

  document.addEventListener('input', (e) => {
    const ctx = ctxN, el = e.target;
    if (!ctx || !el.dataset || !el.dataset.ncc || !scrivendo(ctx)) return;
    ctx.ui.campi[el.dataset.ncc] = el.value;
    ctx.ui.cursore = el.selectionStart;
    el.closest('.ncc-cat').classList.toggle('pieno', !!el.value.trim());
    el.closest('.ncc-cat').classList.toggle('sbagliata', !!el.value.trim() && iniziale(el.value) !== ctx.partita.lettera);
    aggiornaStop(ctx);
    manda(ctx, el.dataset.ncc);
  });
  document.addEventListener('focusin', (e) => { if (ctxN && e.target.dataset && e.target.dataset.ncc) ctxN.ui.fuoco = e.target.dataset.ncc; });
  document.addEventListener('focusout', (e) => {
    const ctx = ctxN, el = e.target;
    if (!ctx || !el.dataset || !el.dataset.ncc) return;
    ctx.ui.cursore = el.selectionStart;
    if (scrivendo(ctx)) manda(ctx, el.dataset.ncc, true);
    setTimeout(() => { const a = document.activeElement; if (!a || !a.dataset || !a.dataset.ncc) ctx.ui.fuoco = null; }, 0);
  });
  document.addEventListener('keydown', (e) => {
    const ctx = ctxN, el = e.target;
    if (!ctx || !el.dataset || !el.dataset.ncc || e.key !== 'Enter') return;
    e.preventDefault();
    const tutte = [...document.querySelectorAll('[data-ncc]')];
    const i = tutte.indexOf(el);
    const vuota = tutte.slice(i + 1).concat(tutte.slice(0, i)).find((x) => !x.value.trim());
    if (vuota) vuota.focus();
    else if (i + 1 < tutte.length) tutte[i + 1].focus();
  });
  // la prima lettera vera della risposta (senza articolo), come la conta il gioco
  const iniziale = (s) => String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^(il|lo|la|i|gli|le|un|uno|una)\s+(?=[a-z])|^(l|un)'\s*/, '').replace(/[^a-z]/g, '')[0] || '';

  function tuttePiene(ctx) { return ctx.partita.cats.every((c) => (ctx.ui.campi[c.id] || '').trim()); }
  function aggiornaStop(ctx) {
    const b = document.querySelector('[data-az="ncc-stop"]');
    if (b) b.disabled = !tuttePiene(ctx) || ctx.partita.chiStop !== null;
  }

  function orologio(p) {
    const s = Math.ceil(p.resta / 1000);
    return `<div class="ncc-tempo ${p.resta < 11000 ? 'poco' : ''}" data-fine="${Date.now() + p.resta}"><b>${s}</b><i style="--da:${(p.resta / p.durata).toFixed(3)};--d:${p.resta}ms"></i></div>`;
  }
  function tessera(p, piccola = false) {
    return `<div class="ncc-lettera ${piccola ? 'piccola' : ''}" aria-label="Lettera ${L(p.lettera)}"><b>${L(p.lettera)}</b></div>`;
  }
  function testa(ctx, destra = '') {
    const p = ctx.partita;
    const fatte = p.lettereFatte.map((l) => `<span>${L(l)}</span>`).join('');
    return `<div class="ncc-testa">${tessera(p, p.fase !== 'scrivi')}
      <div class="ncc-giro"><span>Lettera ${p.round} di ${p.nRound}</span>${fatte ? `<small>Già uscite: ${fatte}</small>` : ''}</div>${destra}</div>`;
  }

  function pannoScrivi(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const celle = p.cats.map((c) => {
      const v = ui.campi[c.id] || '';
      const sbagliata = v.trim() && iniziale(v) !== p.lettera;
      return `<label class="ncc-cat ${v.trim() ? 'pieno' : ''} ${sbagliata ? 'sbagliata' : ''}">
        <span class="ncc-nome"><i>${c.icona}</i>${esc(c.nome)}</span>
        <input data-ncc="${c.id}" maxlength="30" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="next"
          placeholder="${esc(L(p.lettera))}…" value="${esc(v)}" aria-label="${esc(c.nome)} con la ${esc(L(p.lettera))}">
      </label>`;
    }).join('');
    const stop = p.chiStop !== null
      ? `<div class="ncc-stopdetto">✋ STOP di ${esc(p.chiStop === ctx.mio ? 'te' : ctx.nome(p.chiStop))}!</div>`
      : p.conStop && p.n > 1 ? `<button type="button" class="ncc-stop" data-az="ncc-stop" ${tuttePiene(ctx) ? '' : 'disabled'} title="Si può dire quando hai riempito tutte le caselle">STOP ✋</button>` : '';
    return `<div class="ncc ${p.chiStop !== null ? 'fermato' : ''}">
      ${testa(ctx, `<div class="ncc-destra">${stop}${orologio(p)}</div>`)}
      <div class="ncc-celle n${p.cats.length}">${celle}</div>
      <p class="ncc-aiuto">Scrivi una parola per casella che cominci con la <b>${L(p.lettera)}</b>. <span class="ncc-tasti"><kbd>Invio</kbd> passa alla casella vuota dopo.</span>${p.conStop && p.n > 1 ? ' Quando le hai riempite tutte puoi dire STOP.' : ''}</p>
    </div>`;
  }

  const SEGNO = { ok: '✓', accettata: '✓', no: '✗', rifiutata: '✗', vuota: '', dubbia: '?' };
  function cella(ctx, q, c) {
    const p = ctx.partita;
    const testo = p.risposte[q][c.id];
    const st = p.stati[q][c.id];
    const k = `${q}:${c.id}`;
    let extra = '';
    if (p.fase === 'voto' && st === 'dubbia') {
      const v = p.voti[k] || { si: 0, no: 0, mio: null };
      const puo = q !== ctx.mio && !p.confermato[ctx.mio];
      extra = `<span class="ncc-voto">${puo ? `<button type="button" class="ncc-pollice ${v.mio === true ? 'scelto' : ''}" data-az="ncc-voto" data-q="${q}" data-cat="${c.id}" data-si="1" title="Vale">👍</button>
        <button type="button" class="ncc-pollice ${v.mio === false ? 'scelto' : ''}" data-az="ncc-voto" data-q="${q}" data-cat="${c.id}" data-si="0" title="Non vale">👎</button>` : ''}
        <small>${v.si}👍 ${v.no}👎</small></span>`;
    }
    if (p.fase === 'punti' && p.esito) {
      const x = p.esito.celle[q][c.id] || 0;
      const vv = p.esito.voti[k];
      extra = `<b class="ncc-p p${x}">${x ? `+${x}` : '0'}</b>${vv ? `<small class="ncc-esito">${vv.si}👍 ${vv.no}👎</small>` : ''}`;
    }
    return `<td class="ncc-${st}" title="${st === 'no' ? 'Non comincia con la lettera giusta' : st === 'dubbia' ? 'Il gioco non la conosce: votatela' : st === 'ok' ? 'Il gioco la conosce: vale' : st === 'accettata' ? 'Accettata dal voto' : st === 'rifiutata' ? 'Rifiutata dal voto' : ''}">
      <span class="ncc-risp">${testo ? esc(testo) : '<em>—</em>'}<i>${SEGNO[st] || ''}</i></span>${extra}</td>`;
  }

  function pannoTabella(ctx) {
    const p = ctx.partita;
    const ordine = Array.from({ length: p.n }, (_, i) => i).sort((a, b) => (a === ctx.mio ? -1 : b === ctx.mio ? 1 : a - b));
    const voto = p.fase === 'voto';
    const daVotare = voto ? Object.keys(p.voti).filter((k) => Number(k.split(':')[0]) !== ctx.mio).length : 0;
    const righe = p.cats.map((c) => `<tr><th scope="row"><i>${c.icona}</i>${esc(c.nome)}</th>${ordine.map((q) => cella(ctx, q, c)).join('')}</tr>`).join('');
    const totale = p.fase === 'punti' ? `<tr class="ncc-tot"><th scope="row">Punti</th>${ordine.map((q) => `<td><b>+${p.esito.punti[q]}</b> <small>(${p.punti[q]})</small></td>`).join('')}</tr>` : '';
    let comandi;
    if (p.finita) comandi = '';
    else if (voto) {
      comandi = p.confermato[ctx.mio] ? `<p class="ncc-attesa">Aspetta i voti degli altri… (${Math.ceil(p.restaVoto / 1000)} s)</p>`
        : `<p class="ncc-attesa">${daVotare ? `Vota le risposte dubbie <b>?</b> degli altri: 👍 vale, 👎 non vale. In parità vale.` : 'Le tue risposte dubbie le votano gli altri.'}</p>
           <button type="button" class="bottone primario-bt" data-az="ncc-conferma">Ho votato ✓</button>`;
    } else {
      const ultimo = p.round >= p.nRound;
      comandi = p.pronto[ctx.mio] ? `<p class="ncc-attesa">Aspetta gli altri… (${Math.ceil(p.restaPunti / 1000)} s)</p>`
        : `<button type="button" class="bottone primario-bt" data-az="ncc-pronto">${ultimo ? 'Classifica finale' : 'Prossima lettera ▸'}</button>`;
    }
    return `<div class="ncc ncc-tabella">
      ${testa(ctx, `<div class="ncc-destra"><span class="ncc-fase">${voto ? 'Si vota' : p.finita ? 'Fine' : 'Punti'}</span></div>`)}
      <div class="ncc-scorri"><table>
        <thead><tr><th></th>${ordine.map((q) => `<th class="${q === ctx.mio ? 'ncc-io' : ''}">${esc(q === ctx.mio ? 'Tu' : ctx.nome(q))}${p.chiStop === q ? ' ✋' : ''}${voto && p.confermato[q] ? ' <small>✓</small>' : ''}</th>`).join('')}</tr></thead>
        <tbody>${righe}${totale}</tbody></table></div>
      <p class="ncc-legenda"><span class="ncc-ok">✓ il gioco la conosce</span><span class="ncc-dubbia">? da votare</span><span class="ncc-no">✗ non vale</span>${p.fase === 'punti' ? '<span>20 unica · 10 diversa · 5 uguale</span>' : ''}</p>
      <div class="ncc-comandi">${comandi}</div>
    </div>`;
  }

  const tavolo = {
    libero: true,
    reset(ctx) {
      ctxN = ctx;
      const ui = ctx.ui, p = ctx.partita;
      if (ui._round !== p.round) {
        ui._round = p.round; ui.fuoco = null; ui.confermaStop = false;
        ui.campi = Object.assign({}, p.mie || {});
      }
      ui.campi = ui.campi || {};
    },
    panno(ctx) { return ctx.partita.fase === 'scrivi' ? pannoScrivi(ctx) : pannoTabella(ctx); },
    dopo(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      if (p.fase === 'scrivi') {
        if (primaVolta(ui, `ncc-lettera-${p.round}`)) {
          suono([[523, 0.08], [659, 0.08], [784, 0.14]], { volume: 0.05 });
          // all'inizio del giro il cursore va nella prima casella (sul computer)
          if (window.matchMedia('(hover: hover)').matches && !ui.fuoco) ui.fuoco = p.cats[0].id;
        }
        const el = ui.fuoco && document.querySelector(`[data-ncc="${ui.fuoco}"]`);
        if (el && !(window.Boss && Boss.attivo)) {
          el.focus({ preventScroll: true });
          const k = Math.min(ui.cursore === undefined ? el.value.length : ui.cursore, el.value.length);
          try { el.setSelectionRange(k, k); } catch {}
        }
        if (p.chiStop !== null && primaVolta(ui, `ncc-stop-${p.round}`)) suono([[880, 0.08], [660, 0.08], [440, 0.16]], { volume: 0.07 });
      }
      if (p.fase === 'voto' && primaVolta(ui, `ncc-voto-${p.round}`)) suono([[392, 0.1], [523, 0.12]], { volume: 0.05 });
      if (p.fase === 'punti' && primaVolta(ui, `ncc-punti-${p.round}`)) {
        const mie = p.esito.punti[ctx.mio];
        suono(mie >= 60 ? [[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.16]] : [[523, 0.08], [659, 0.12]], { volume: 0.06 });
      }
      clearInterval(ui._nccT);
      ui._nccT = setInterval(() => {
        const el = document.querySelector('.ncc-tempo');
        if (!el) return clearInterval(ui._nccT);
        const resta = Math.max(0, Number(el.dataset.fine) - Date.now()), s = Math.ceil(resta / 1000);
        el.querySelector('b').textContent = s;
        el.classList.toggle('poco', resta < 11000);
        if (ctx.partita) ctx.partita.resta = resta;
        if (resta < 5500 && resta > 0 && s !== ui._bip) { ui._bip = s; suono([[880, 0.04]], { volume: 0.03 }); }
      }, 200);
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'scrivi') return p.chiStop !== null ? `STOP! Ultimi secondi` : `Parole con la ${L(p.lettera)}`;
      if (p.fase === 'voto') return p.confermato[ctx.mio] ? 'Aspetta i voti degli altri' : 'Vota le risposte dubbie';
      return p.pronto[ctx.mio] ? 'Aspetta gli altri' : `Punti della ${L(p.lettera)}`;
    },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.n === 1) return `<span>Punti <b>${p.punti[0]}</b></span>`;
      return p.punti.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      if (p.finita) return '';
      if (p.fase === 'scrivi') return `<span class="ncc-info">${p.piene[posto]}/${p.cats.length} caselle${p.chiStop === posto ? ' · STOP ✋' : ''}</span>`;
      if (p.fase === 'voto') return `<span class="ncc-info">${p.confermato[posto] ? 'ha votato ✓' : 'vota…'}</span>`;
      return `<span class="ncc-info">+${p.esito.punti[posto]}${p.pronto[posto] ? ' ✓' : ''}</span>`;
    },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'ncc-stop') {
        if (!tuttePiene(ctx)) return ctx.avviso('Per dire STOP riempi tutte le caselle', 1500);
        mandaTutto(ctx);
        return ctx.invia({ tipo: 'stop' });
      }
      if (az === 'ncc-voto') {
        const p = ctx.partita, k = `${el.dataset.q}:${el.dataset.cat}`;
        const si = el.dataset.si === '1';
        const mio = p.voti[k] && p.voti[k].mio;
        suono([[si ? 660 : 330, 0.05]], { volume: 0.04 });
        return ctx.invia({ tipo: 'voto', posto: Number(el.dataset.q), cat: el.dataset.cat, si: mio === si ? null : si });
      }
      if (az === 'ncc-conferma') return ctx.invia({ tipo: 'conferma' });
      if (az === 'ncc-pronto') return ctx.invia({ tipo: 'pronto' });
    },
  };

  Object.assign(window.Tavoli, { nomicose: tavolo });
})();
