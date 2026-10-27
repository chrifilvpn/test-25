// DISEGNA E INDOVINA: la lavagna è un canvas che resta vivo tra un ridisegno e l'altro. Chi disegna manda i tratti a
// pezzetti (ogni 50 ms); gli altri li ricevono col tick e li aggiungono. Quando il disegno si cancella o si annulla
// un tratto cambia la "versione" e si ridisegna tutto dallo stato completo.
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  const W = 1000, H = 700;
  let ctxA = null;
  const tela = document.createElement('canvas');
  tela.width = W; tela.height = H;
  tela.className = 'dg-tela';
  const g = tela.getContext('2d');
  let versione = null, visti = new Set();
  const miei = new Set(); // tratti disegnati da me (già sulla lavagna)
  let colore = '#1f2430', spessore = 7, gomma = false;
  let tratto = null, coda = [], tInvio = null, nTratto = Math.floor(Math.random() * 1e6);
  let tOrologio = null;

  const attiva = () => ctxA && ctxA.stato && ctxA.partita && ctxA.partita.gioco === 'disegna';
  const disegnatore = () => attiva() && ctxA.partita.disegnatore === ctxA.mio && ctxA.partita.fase === 'disegno' && !ctxA.partita.finita;

  function pulisciTela() { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
  function linea(c, s, p) {
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = s; g.lineCap = 'round'; g.lineJoin = 'round';
    if (p.length === 1) { g.beginPath(); g.arc(p[0][0], p[0][1], s / 2, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.stroke();
  }
  function tutto(segmenti) {
    pulisciTela();
    visti = new Set();
    for (const s of segmenti) { linea(s.c, s.s, s.p); visti.add(s.id); }
  }

  // ---------- disegno col mouse o col dito ----------
  function coord(e) { const r = tela.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)]; }
  function invia(fine) {
    if (!tratto || coda.length < (fine ? 1 : 2)) return;
    ctxA.emetti('input', { t: 'seg', k: tratto.k, c: tratto.c, s: tratto.s, p: coda });
    coda = [coda[coda.length - 1]]; // il prossimo pezzo riparte dall'ultimo punto
  }
  tela.addEventListener('pointerdown', (e) => {
    if (!disegnatore() || (ctxA.partita.stato && ctxA.partita.stato.pausa)) return;
    e.preventDefault();
    try { tela.setPointerCapture(e.pointerId); } catch {}
    const q = coord(e);
    tratto = { k: ++nTratto, c: gomma ? '#ffffff' : colore, s: gomma ? Math.max(spessore, 14) : spessore };
    miei.add(tratto.k);
    coda = [q];
    linea(tratto.c, tratto.s, [q]);
    clearInterval(tInvio);
    tInvio = setInterval(() => invia(false), 50);
  });
  tela.addEventListener('pointermove', (e) => {
    if (!tratto) return;
    const q = coord(e), u = coda[coda.length - 1];
    if (u && Math.hypot(q[0] - u[0], q[1] - u[1]) < 2) return;
    if (u) linea(tratto.c, tratto.s, [u, q]);
    coda.push(q);
    if (coda.length >= 70) invia(false);
  });
  const fine = () => { if (!tratto) return; invia(true); clearInterval(tInvio); tratto = null; coda = []; };
  tela.addEventListener('pointerup', fine);
  tela.addEventListener('pointercancel', fine);

  function parolaHtml(p) {
    if (p.fase === 'scelta') return p.disegnatore === ctxA.mio ? '<span class="dg-parola">Scegli cosa disegnare</span>' : `<span class="dg-parola piccola">${esc(ctxA.nome(p.disegnatore))} sta scegliendo la parola…</span>`;
    if (p.fase === 'rivela' || p.finita) return p.parola ? `<span class="dg-parola">La parola era: <b>${esc(p.parola)}</b></span>` : '';
    if (p.parola) return `<span class="dg-parola">${p.disegnatore === ctxA.mio ? 'Disegna' : 'Hai indovinato'}: <b>${esc(p.parola)}</b></span>`;
    if (!p.suggerimento) return '';
    const n = p.suggerimento.filter((x) => x !== ' ').length;
    return `<span class="dg-parola nascosta" aria-label="Parola di ${n} lettere">${p.suggerimento.map((x) => (x === ' ' ? '<i class="spazio"></i>' : `<i>${x === '_' ? '' : esc(x)}</i>`)).join('')}</span><small>${p.lunghezze.join(' + ')} lettere</small>`;
  }

  // il server manda tutto il disegno solo la prima volta (o quando cambia la versione), poi solo i tratti nuovi
  // (segmentiNuovi): qui si tiene l'elenco completo, anche quando il tavolo non è sullo schermo
  let archivio = [];
  const tavolo = {
    libero: true,
    senzaFila: true,
    ricevi(p) {
      if (!Array.isArray(p.segmenti)) return;
      if (p.segmentiNuovi) { const ci = new Set(archivio.map((x) => x.id)); archivio = archivio.concat(p.segmenti.filter((x) => !ci.has(x.id))); } else archivio = p.segmenti;
      p.segmenti = archivio;
    },
    reset(ctx) {
      ctxA = ctx;
      const p = ctx.partita;
      if (p.stato.v !== versione) { versione = p.stato.v; tutto(p.segmenti); }
      else for (const s of p.segmenti) if (!visti.has(s.id)) { if (!miei.has(s.k)) linea(s.c, s.s, s.p); visti.add(s.id); }
    },
    tick(ctx, d) {
      ctxA = ctx;
      ctx.partita.stato = d;
      if (d.v !== versione) return; // arriverà lo stato completo
      for (const s of d.seg) if (!visti.has(s.id)) { if (!miei.has(s.k)) linea(s.c, s.s, s.p); visti.add(s.id); }
      const barra = document.querySelector('.dg-tempo i');
      const p = ctx.partita;
      if (barra && p.fase === 'disegno') barra.style.width = `${(100 * d.resta) / p.durata}%`;
      const sec = document.querySelector('.dg-secondi');
      if (sec) sec.textContent = d.fase === 'disegno' || d.fase === 'scelta' ? `${Math.ceil(d.resta / 1000)} s` : '';
    },
    panno(ctx) {
      const p = ctx.partita, io = ctx.mio;
      const classifica = Array.from({ length: p.n }, (_, i) => i).sort((a, b) => p.punti[b] - p.punti[a]).map((i) => `<li class="${i === p.disegnatore ? 'disegna' : ''} ${p.indovinato[i] ? 'ok' : ''} ${p.usciti[i] ? 'uscito' : ''}">
        <span>${i === p.disegnatore ? '✏️' : p.indovinato[i] ? '✅' : '·'} ${esc(i === io ? 'Tu' : ctx.nome(i))}</span><b>${p.punti[i]}</b>${p.puntiTurno[i] ? `<small>+${p.puntiTurno[i]}</small>` : ''}</li>`).join('');
      const scelte = p.scelte ? `<div class="dg-scelte">${p.scelte.map((w, i) => `<button type="button" class="bottone primario dg-scelta" data-az="scegli" data-i="${i}">${esc(w)}</button>`).join('')}</div>` : '';
      const strumenti = p.disegnatore === io && p.fase === 'disegno' ? `<div class="dg-strumenti">
        <div class="dg-colori">${p.colori.map((c) => `<button type="button" class="dg-colore ${!gomma && c === colore ? 'attivo' : ''}" style="background:${c}" data-az="colore" data-c="${c}" aria-label="Colore ${c}"></button>`).join('')}</div>
        <div class="dg-spessori">${p.spessori.map((s) => `<button type="button" class="dg-spessore ${s === spessore ? 'attivo' : ''}" data-az="spessore" data-s="${s}" aria-label="Spessore ${s}"><i style="width:${Math.min(26, s)}px;height:${Math.min(26, s)}px"></i></button>`).join('')}</div>
        <button type="button" class="bottone mini-bt ${gomma ? 'attivo' : ''}" data-az="gomma">🧽 Gomma</button>
        <button type="button" class="bottone mini-bt" data-az="annulla">↩ Annulla</button>
        <button type="button" class="bottone mini-bt" data-az="pulisci">🗑️ Cancella tutto</button></div>` : '';
      const chat = (ctx.stato.chat || []).slice(-7).map((m) => (m.sistema ? `<li class="sistema">${esc(m.testo)}</li>` : `<li${m.ia ? ' class="ia"' : ''}><b>${esc(m.posto === io ? 'Tu' : m.ia ? '🤖 ' + m.nome : m.nome)}</b> ${esc(m.testo)}</li>`)).join('');
      const indovina = p.fase === 'disegno' && p.disegnatore !== io && !p.indovinato[io] && !p.finita
        ? '<form class="dg-form"><input class="dg-input" maxlength="60" placeholder="Scrivi qui la tua risposta…" autocomplete="off" aria-label="La tua risposta"><button class="bottone">Prova</button></form>' : '';
      return `<div class="dg">
        <div class="dg-testa"><span class="pa-round">Giro ${p.giro} di ${p.giri}</span>${parolaHtml(p)}<span class="dg-secondi"></span></div>
        <div class="dg-tempo"><i style="width:${p.fase === 'disegno' ? (100 * p.stato.resta) / p.durata : 0}%"></i></div>
        <div class="dg-corpo">
          <div class="dg-lavagna">${scelte}<div class="dg-slot"></div>${p.fase === 'rivela' ? `<div class="dg-velo">La parola era <b>${esc(p.parola || '')}</b></div>` : ''}</div>
          <div class="dg-lato"><ol class="dg-punti">${classifica}</ol><ul class="dg-chat">${chat}</ul>${indovina}</div>
        </div>
        ${strumenti}
      </div>`;
    },
    dopo(ctx) {
      const slot = document.querySelector('.dg-slot');
      if (slot && tela.parentElement !== slot) slot.append(tela);
      const f = document.querySelector('.dg-form');
      if (f) {
        const inp = f.querySelector('input');
        const salvato = ctx.ui.dgTesto || '';
        inp.value = salvato;
        inp.addEventListener('input', () => { ctx.ui.dgTesto = inp.value; });
        f.addEventListener('submit', (e) => { e.preventDefault(); const t = inp.value.trim(); if (t) ctx.emetti('chat', t); inp.value = ''; ctx.ui.dgTesto = ''; });
        if (ctx.ui.dgFuoco) inp.focus();
        inp.addEventListener('focus', () => { ctx.ui.dgFuoco = true; });
        inp.addEventListener('blur', () => { ctx.ui.dgFuoco = false; });
      }
      tela.classList.toggle('attiva', disegnatore());
      const p = ctx.partita;
      if (p.fase === 'rivela' && primaVolta(ctx.ui, `dg-riv-${p.giro}-${p.disegnatore}`)) suono([[660, 0.1], [520, 0.15]], { volume: 0.06 });
      if (p.indovinato[ctx.mio] && primaVolta(ctx.ui, `dg-ok-${p.giro}-${p.disegnatore}`)) suono([[523, 0.08], [784, 0.15]], { volume: 0.08 });
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.stato && p.stato.pausa) return 'In pausa';
      if (p.fase === 'scelta') return p.disegnatore === ctx.mio ? 'Scegli la parola' : `${ctx.nome(p.disegnatore)} sceglie`;
      if (p.fase === 'disegno') return p.disegnatore === ctx.mio ? 'Disegna!' : p.indovinato[ctx.mio] ? 'Hai indovinato!' : 'Indovina!';
      return 'Fine turno';
    },
    punteggio(ctx) {
      const p = ctx.partita;
      return Array.from({ length: p.n }, (_, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${p.punti[i]}</b></span>`).join('');
    },
    infoPosto(ctx, posto) { return `${ctx.partita.punti[posto]} punti`; },
    clic(ctx, el) {
      const az = el.dataset.az;
      if (az === 'scegli') return ctx.invia({ tipo: 'scegli', i: Number(el.dataset.i) });
      if (az === 'colore') { colore = el.dataset.c; gomma = false; return ctx.ridisegna(); }
      if (az === 'spessore') { spessore = Number(el.dataset.s); return ctx.ridisegna(); }
      if (az === 'gomma') { gomma = !gomma; return ctx.ridisegna(); }
      if (az === 'annulla') return ctx.invia({ tipo: 'annulla' });
      if (az === 'pulisci') { if (confirm('Cancellare tutto il disegno?')) ctx.invia({ tipo: 'pulisci' }); return; }
    },
  };
  pulisciTela();
  Object.assign(window.Tavoli, { disegna: tavolo });
})();
