// HUMAN BENCHMARK 1v1: ogni prova gira tutta nel browser (i tempi li misura performance.now()), con i dati uguali per
// tutti mandati dal server; le risposte vanno al server, che le controlla. L'area della prova è un elemento che resta
// vivo tra un ridisegno e l'altro del tavolo (arrivano stati anche quando l'avversario avanza).
(() => {
  const { esc, suono } = window.Nuovi;
  let ctxA = null, ultimo = null;
  const area = document.createElement('div');
  area.className = 'hb-area';
  let chiave = null;
  let timer = [];
  const dopoMs = (ms, f) => { const t = setTimeout(f, ms); timer.push(t); return t; };
  const pulisci = () => { timer.forEach(clearTimeout); timer = []; area.onpointerdown = null; tastiera = null; };
  let tastiera = null;
  const attiva = () => ctxA && ctxA.stato && ctxA.partita && ctxA.partita.gioco === 'benchmark';

  const DESCR = {
    reazione: 'Quando il riquadro diventa <b>verde</b>, clicca (o tocca, o premi spazio) più in fretta che puoi. 5 tentativi: conta la media.',
    sequenza: 'Si accendono dei quadrati uno dopo l\'altro: ripeti la sequenza nello stesso ordine. A ogni livello un quadrato in più.',
    numeri: 'Memorizza il numero: quando sparisce, scrivilo. A ogni livello una cifra in più.',
    bersagli: 'Clicca il bersaglio al centro per partire, poi clicca i 20 bersagli il più in fretta possibile.',
    visiva: 'Ricorda i quadratini che si accendono e poi cliccali tutti. 3 errori = una vita persa (hai 3 vite).',
  };
  const ICONE = { reazione: '⚡', sequenza: '🔢', numeri: '🧮', bersagli: '🎯', visiva: '👁️' };
  function formato(tipo, v) {
    if (v == null) return '—';
    if (tipo === 'reazione') return `${v} ms`;
    if (tipo === 'bersagli') return v >= 599999 ? 'non finito' : `${(v / 1000).toFixed(2)} s <small>(${Math.round(v / 20)} ms a bersaglio)</small>`;
    return `livello ${v}`;
  }

  function invia(dati) { const p = ctxA.partita; ctxA.invia({ ...dati, prova: p.tipo, pausa: p.stato.nPausa }); }

  // ================= le cinque prove =================
  function reazione(p) {
    let fatti = p.mio.tempi.length, presto = 0, stato = 'pronto', t0 = 0;
    area.innerHTML = '<div class="hb-reaz" tabindex="0"><p class="hb-grande"></p><p class="hb-sotto"></p></div>';
    const box = area.firstElementChild;
    const mostra = (cls, grande, sotto) => { box.className = `hb-reaz ${cls}`; box.querySelector('.hb-grande').innerHTML = grande; box.querySelector('.hb-sotto').innerHTML = sotto; };
    const prossimo = () => {
      if (fatti >= p.costanti.PROVE_REAZIONE) return;
      stato = 'attesa';
      mostra('rosso', 'Aspetta il verde…', `Tentativo ${fatti + 1} di ${p.costanti.PROVE_REAZIONE}`);
      const attesa = p.dati.attese[(fatti + presto) % p.dati.attese.length];
      dopoMs(attesa, () => { stato = 'verde'; t0 = performance.now(); mostra('verde', 'CLICCA!', ''); });
    };
    const premi = () => {
      if (stato === 'attesa') { timer.forEach(clearTimeout); timer = []; presto++; stato = 'presto'; mostra('blu', 'Troppo presto!', 'Tocca per riprovare'); suono([[180, 0.15]], { tipo: 'square', volume: 0.06 }); return; }
      if (stato === 'presto' || stato === 'pronto') return prossimo();
      if (stato === 'verde') {
        const ms = Math.round(performance.now() - t0);
        fatti++;
        stato = 'fatto';
        invia({ tipo: 'reazione', ms });
        mostra('blu', `${ms} ms`, fatti < p.costanti.PROVE_REAZIONE ? 'Tocca per il prossimo tentativo' : 'Fatto!');
        suono([[700, 0.06]], { volume: 0.05 });
        if (fatti < p.costanti.PROVE_REAZIONE) stato = 'pronto';
      }
    };
    area.onpointerdown = (e) => { if (e.target.closest('.hb-reaz')) { e.preventDefault(); premi(); } };
    tastiera = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); premi(); } };
    mostra('blu', 'Pronto?', `Tocca per iniziare · tentativo ${fatti + 1} di ${p.costanti.PROVE_REAZIONE}`);
  }

  function sequenza(p) {
    let l = p.mio.livello, fase = 'guarda', dati = [];
    area.innerHTML = `<div class="hb-livello"></div><div class="hb-griglia g3">${Array.from({ length: 9 }, (_, i) => `<button type="button" class="hb-cella" data-c="${i}" aria-label="Quadrato ${i + 1}"></button>`).join('')}</div>`;
    const celle = [...area.querySelectorAll('.hb-cella')];
    const lampo = (i, cls = 'accesa', ms = 380) => { celle[i].classList.add(cls); dopoMs(ms, () => celle[i].classList.remove(cls)); };
    const livello = () => {
      fase = 'guarda'; dati = [];
      area.querySelector('.hb-livello').textContent = `Livello ${l} · guarda…`;
      for (let k = 0; k < l; k++) dopoMs(700 + k * 600, () => { lampo(p.dati.seq[k]); suono([[330 + p.dati.seq[k] * 40, 0.12]], { volume: 0.04 }); });
      dopoMs(700 + l * 600, () => { fase = 'rispondi'; area.querySelector('.hb-livello').textContent = `Livello ${l} · tocca a te`; });
    };
    area.onpointerdown = (e) => {
      const c = e.target.closest('.hb-cella');
      if (!c || fase !== 'rispondi') return;
      e.preventDefault();
      const i = Number(c.dataset.c);
      dati.push(i);
      const k = dati.length - 1;
      if (i !== p.dati.seq[k]) { fase = 'fine'; lampo(i, 'sbagliata', 900); invia({ tipo: 'livello', risposta: dati }); suono([[150, 0.3]], { tipo: 'square', volume: 0.06 }); return; }
      lampo(i, 'accesa', 200);
      if (dati.length === l) { fase = 'ok'; invia({ tipo: 'livello', risposta: dati }); l++; area.classList.add('giusto'); dopoMs(500, () => area.classList.remove('giusto')); dopoMs(600, livello); }
    };
    livello();
  }

  function numeri(p) {
    let l = p.mio.livello;
    const livello = () => {
      const num = p.dati.numeri[l - 1];
      const dura = 1000 + l * 650;
      area.innerHTML = `<div class="hb-livello">Livello ${l}</div><p class="hb-numero">${num}</p><div class="hb-barra"><i style="animation-duration:${dura}ms"></i></div>`;
      dopoMs(dura, () => {
        area.innerHTML = `<div class="hb-livello">Livello ${l} · che numero era?</div>
          <form class="hb-form"><input class="hb-input" inputmode="numeric" autocomplete="off" aria-label="Il numero"><button class="bottone primario" type="submit">Invia</button></form>`;
        const f = area.querySelector('form'), inp = area.querySelector('input');
        inp.focus();
        f.onsubmit = (e) => {
          e.preventDefault();
          const r = inp.value.replace(/\D/g, '');
          if (!r) return;
          invia({ tipo: 'livello', risposta: r });
          const giusto = r === num;
          area.innerHTML = `<div class="hb-livello">Livello ${l}</div><p class="hb-verdetto ${giusto ? 'si' : 'no'}">${giusto ? 'Giusto!' : 'Sbagliato'}</p><p class="piccolo">Numero: <b>${num}</b><br>Tu: <b>${esc(r)}</b></p>`;
          suono(giusto ? [[660, 0.08], [880, 0.1]] : [[150, 0.3]], { volume: 0.06 });
          if (giusto) { l++; dopoMs(1300, livello); }
        };
      });
    };
    livello();
  }

  function bersagli(p) {
    let i = -1, t0 = 0;
    area.innerHTML = '<div class="hb-campo"><button type="button" class="hb-bersaglio" aria-label="Bersaglio"></button><p class="hb-conta"></p></div>';
    const b = area.querySelector('.hb-bersaglio'), conta = area.querySelector('.hb-conta');
    const posiziona = () => {
      const [x, y] = i < 0 ? [0.5, 0.5] : p.dati.punti[i];
      b.style.left = `${x * 100}%`; b.style.top = `${y * 100}%`;
      conta.textContent = i < 0 ? 'Clicca il bersaglio per partire' : `${p.costanti.N_BERSAGLI - i} bersagli`;
    };
    area.onpointerdown = (e) => {
      if (!e.target.closest('.hb-bersaglio')) return;
      e.preventDefault();
      if (i < 0) t0 = performance.now();
      i++;
      suono([[500 + i * 20, 0.04]], { volume: 0.04 });
      if (i >= p.costanti.N_BERSAGLI) {
        const ms = Math.round(performance.now() - t0);
        b.hidden = true; conta.textContent = `${(ms / 1000).toFixed(2)} s`;
        return invia({ tipo: 'bersagli', ms });
      }
      posiziona();
    };
    posiziona();
  }

  function visiva(p) {
    let l = p.mio.livello, tent = p.mio.tentativo, vite = p.mio.vite;
    const livello = () => {
      const g = Math.min(8, 3 + Math.floor((l - 1) / 3));
      const schema = p.dati.schemi[l - 1][tent];
      let fase = 'guarda';
      const scelte = new Set();
      let errori = 0;
      area.innerHTML = `<div class="hb-livello">Livello ${l} · vite ${'❤️'.repeat(vite)}</div><div class="hb-griglia" style="--g:${g}">${Array.from({ length: g * g }, (_, i) => `<button type="button" class="hb-cella" data-c="${i}"></button>`).join('')}</div>`;
      const celle = [...area.querySelectorAll('.hb-cella')];
      dopoMs(500, () => schema.forEach((i) => celle[i].classList.add('accesa')));
      dopoMs(1700, () => { schema.forEach((i) => celle[i].classList.remove('accesa')); fase = 'rispondi'; });
      area.onpointerdown = (e) => {
        const c = e.target.closest('.hb-cella');
        if (!c || fase !== 'rispondi') return;
        e.preventDefault();
        const i = Number(c.dataset.c);
        if (scelte.has(i)) return;
        scelte.add(i);
        if (schema.includes(i)) { c.classList.add('giusta'); suono([[600, 0.05]], { volume: 0.04 }); } else { c.classList.add('sbagliata'); errori++; suono([[170, 0.12]], { tipo: 'square', volume: 0.05 }); }
        const giuste = schema.filter((x) => scelte.has(x)).length;
        if (errori >= p.costanti.ERRORI_VISIVA) {
          fase = 'fine';
          invia({ tipo: 'visiva', scelte: [...scelte] });
          vite--; tent = Math.min(p.costanti.VITE_VISIVA - 1, tent + 1);
          schema.forEach((x) => celle[x].classList.add('mancata'));
          if (vite > 0) dopoMs(1400, livello);
        } else if (giuste === schema.length) {
          fase = 'fine';
          invia({ tipo: 'visiva', scelte: [...scelte] });
          l++; tent = 0;
          dopoMs(700, livello);
        }
      };
    };
    livello();
  }
  const PROVA = { reazione, sequenza, numeri, bersagli, visiva };

  // ================= fasi =================
  function monta() {
    const p = ctxA.partita, t = p.stato;
    // anche la pausa fa parte della chiave: alla ripresa la prova si rimonta (prima restava "In pausa" per sempre)
    const k = `${p.k}-${t.fase}-${t.nPausa}-${!!t.pausa}-${p.mio.fatto}-${p.finita}`;
    if (k === chiave) return;
    const eraInProva = chiave && chiave.startsWith(`${p.k}-prova-${t.nPausa}-false-false`);
    chiave = k;
    if (t.fase === 'prova' && p.mio.fatto && eraInProva) {
      // appena finito: si lascia vedere un attimo l'ultimo errore prima del riassunto
      timer.forEach(clearTimeout); timer = []; area.onpointerdown = null; tastiera = null;
      dopoMs(1600, () => { chiave = null; if (attiva()) monta(); });
      chiave = `${k}-attesa`;
      return;
    }
    pulisci();
    area.className = `hb-area f-${t.fase}`;
    if (p.finita) { area.innerHTML = '<p class="hb-grande">Fine!</p>'; return; }
    if (t.fase === 'intro') {
      area.innerHTML = `<div class="hb-intro"><p class="hb-icona">${ICONE[p.tipo]}</p><h3>${p.spareggio ? 'Spareggio · ' : ''}${esc(p.nome)}</h3><p>${DESCR[p.tipo]}</p><p class="hb-conto"></p></div>`;
      return;
    }
    if (t.fase === 'risultato') {
      const s = p.storico[p.storico.length - 1];
      area.innerHTML = `<div class="hb-intro"><h3>${esc(p.nome)}</h3>
        <ul class="hb-ris">${s.valori.map((v, i) => `<li class="${s.vince === i ? 'vince' : ''}"><span>${esc(i === ctxA.mio ? 'Tu' : ctxA.nome(i))}</span><b>${formato(s.tipo, v)}</b>${s.vince === i && p.n === 2 ? ' 🏆' : ''}</li>`).join('')}</ul>
        ${p.n === 2 ? `<p>${s.vince < 0 ? 'Pari: nessun punto' : s.vince === ctxA.mio ? 'Prova vinta!' : `Prova a ${esc(ctxA.nome(s.vince))}`}</p>` : ''}</div>`;
      return;
    }
    if (t.fase === 'prova') {
      if (p.mio.fatto) { area.innerHTML = `<div class="hb-intro"><p class="hb-grande">Fatto!</p><p>Il tuo risultato: <b>${formato(p.tipo, p.mio.valore)}</b></p><p class="piccolo">Aspettiamo l'avversario…</p></div>`; return; }
      if (t.pausa) { area.innerHTML = '<p class="hb-grande">⏸ In pausa</p>'; return; }
      if (p.dati) PROVA[p.tipo](p);
    }
  }

  function avversario(ctx) {
    const p = ctx.partita, t = ultimo || p.stato;
    return t.g.map((x, i) => (i === ctx.mio ? '' : `<div class="hb-avv-riga"><b>${esc(ctx.nome(i))}</b> ${t.fase === 'prova' ? (x.fatto ? `ha finito: ${formato(p.tipo, x.valore)}` : p.tipo === 'reazione' ? `tentativo ${x.n + 1}` : p.tipo === 'bersagli' ? 'sta cliccando…' : `livello ${x.livello}${p.tipo === 'visiva' ? ` ${'❤️'.repeat(Math.max(0, x.vite))}` : ''}`) : ''}</div>`)).join('');
  }

  const tavolo = {
    libero: true,
    reset(ctx) { ctxA = ctx; ultimo = ctx.partita.stato; },
    tick(ctx, d) {
      ctxA = ctx;
      const cambia = !ultimo || ultimo.fase !== d.fase || ultimo.pausa !== d.pausa;
      ultimo = d;
      const c = document.querySelector('.hb-conto');
      if (c && d.fase === 'intro') c.textContent = `Si parte tra ${Math.ceil(d.resta / 1000)}…`;
      const a = document.querySelector('.hb-avv');
      if (a) a.innerHTML = avversario(ctx);
      if (cambia && d.pausa) { chiave = null; pulisci(); area.innerHTML = '<p class="hb-grande">⏸ In pausa</p>'; }
    },
    panno(ctx) {
      const p = ctx.partita;
      const passi = p.ordine.map((tipo, i) => {
        const s = p.storico[i];
        const cls = i === p.k && !p.finita ? 'ora' : s ? (s.vince === ctx.mio ? 'vinta' : s.vince < 0 ? 'pari' : 'persa') : '';
        return `<li class="${p.n === 1 && s ? 'fatta' : cls}" title="${esc(p.nomi[tipo])}">${ICONE[tipo]}<span>${esc(p.nomi[tipo])}</span></li>`;
      }).join('');
      return `<div class="hb"><ol class="hb-passi">${passi}${p.k >= 5 ? '<li class="ora">⚡<span>Spareggio</span></li>' : ''}</ol><div class="hb-slot"></div><div class="hb-avv">${avversario(ctx)}</div></div>`;
    },
    dopo() {
      if (!attiva()) return;
      const slot = document.querySelector('.hb-slot');
      if (slot && area.parentElement !== slot) slot.append(area);
      monta();
      const inp = area.querySelector('.hb-input');
      if (inp && document.activeElement !== inp && !(document.activeElement && document.activeElement.closest('#chat, .chat'))) inp.focus();
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.stato.fase === 'intro' ? `Prossima prova: ${p.nome}` : p.stato.fase === 'prova' ? p.nome : 'Risultato'; },
    punteggio(ctx) {
      const p = ctx.partita;
      if (p.n === 1) return `<span>Prova <b>${Math.min(p.k + 1, 5)}/5</b></span>`;
      return p.punti.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">al meglio di 5</span>';
    },
    infoPosto(ctx, posto) { return ctx.partita.n === 1 ? '' : `${ctx.partita.punti[posto]} prove vinte`; },
    clic() {},
  };
  document.addEventListener('keydown', (e) => {
    if (!tastiera || !attiva() || (window.Boss && Boss.attivo)) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    tastiera(e);
  });
  Object.assign(window.Tavoli, { benchmark: tavolo });
})();
