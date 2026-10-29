// CERCHI A TEMPO: il campo scuro con i cerchi colorati e numerati, l'anello che si stringe, i puntini che portano al
// cerchio dopo, il giudizio (300, 100, 50, ❌) che compare dove si è cliccato. La musica la suona il browser (cassa,
// rullante, piatti, basso e arpeggio a tempo con la mappa). Il tempo si misura qui: al server va solo lo scarto in ms.
(() => {
  const { esc, primaVolta } = window.Nuovi;
  const Cl = () => window.CerchiLogica;
  const GRUPPI = ['#ff6fa8', '#4fc3ff', '#ffd25e', '#7dff8a', '#c18bff', '#ff9a5c'];
  const GIUDIZI = [['300', '#6fd3ff'], ['100', '#7dff8a'], ['50', '#ffc35e'], ['✕', '#ff5c5c']];
  let T = null, ctxE = null, puntatore = [400, 300];
  const tela = () => (T = T || window.TelaFissa('ce-tela'));
  const attivo = () => ctxE && ctxE.stato && ctxE.partita && ctxE.partita.gioco === 'cerchi';
  const gioco = (ctx) => !ctx.stato.spettatore && !ctx.partita.finita;

  // lo stato della mia partita nel browser: mappa, quando parte la musica, i miei giudizi
  function mia(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (!ui.ce || ui.ce.seme !== p.seme) {
      const mappa = Cl().genera(p.seme, p.livello, p.secondi);
      ui.ce = { seme: p.seme, mappa, t0: performance.now() + p.traMs, st: Cl().nuovoStato(), giudizi: [], effetti: [], suonato: -1e9 };
    }
    return ui.ce;
  }
  const ora = (m) => performance.now() - m.t0;

  // ---- musica: si programma un po' in anticipo, battito per battito ----
  let ac = null, master = null;
  function audio() {
    try {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }
  const muto = () => (window.Boss && Boss.attivo) || (document.getElementById('suono') && document.getElementById('suono').getAttribute('aria-pressed') === 'false');
  function nota(t, f, d, tipo = 'triangle', vol = 0.05, scendi = 0) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t); if (scendi) o.frequency.exponentialRampToValueAtTime(scendi, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  let rumoreBuf = null;
  function rumore(t, d, vol, alto) {
    if (!rumoreBuf) { rumoreBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); const x = rumoreBuf.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = rumoreBuf; f.type = alto ? 'highpass' : 'bandpass'; f.frequency.value = alto ? 7000 : 1800;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + 0.02);
  }
  // giro di accordi La minore – Fa – Do – Sol (frequenze della fondamentale e dell'arpeggio)
  const ACCORDI = [[110, [220, 261.6, 329.6]], [87.3, [174.6, 220, 261.6]], [130.8, [261.6, 329.6, 392]], [98, [196, 246.9, 293.7]]];
  function musica(m, ms) {
    if (!audio() || !master) return;
    master.gain.value = muto() ? 0 : 0.9;
    const bat = m.mappa.battito, base = Cl().INIZIO % bat, finoA = ms + 350;
    const fine = m.mappa.fine;
    let k = Math.ceil((Math.max(m.suonato + 1, ms) - base) / (bat / 2));
    for (; base + k * (bat / 2) < finoA; k++) {
      const tm = base + k * (bat / 2);
      if (tm < 0 || tm > fine) continue;
      m.suonato = tm;
      const mod = (a, b) => ((a % b) + b) % b;
      const t = ac.currentTime + Math.max(0, (tm - ms) / 1000), mezzo = mod(k, 2), bat4 = mod(Math.floor(k / 2), 4), acc = ACCORDI[mod(Math.floor(k / 16), 4)];
      if (!mezzo) {
        if (bat4 === 0 || bat4 === 2) nota(t, 120, 0.22, 'sine', 0.22, 45); // cassa
        if (bat4 === 1 || bat4 === 3) rumore(t, 0.12, 0.09, false); // rullante
        nota(t, acc[0], bat / 1000 * 0.9, 'sawtooth', 0.025); // basso
      }
      rumore(t, 0.04, 0.03, true); // piatto chiuso
      nota(t, acc[1][mod(k, 3)] * 2, 0.16, 'triangle', 0.022); // arpeggio
    }
  }

  // ---- colpi ----
  function giudica(ctx, m, i, scarto, x, y) {
    const g = Cl().segna(m.st, m.mappa, scarto);
    m.giudizi[i] = g;
    m.effetti.push({ i, g, x, y, t: performance.now() });
    ctx.invia({ tipo: 'colpo', i, d: scarto === null ? null : Math.round(scarto) });
    if (audio() && !muto()) {
      if (g < 3) nota(ac.currentTime, [1760, 1320, 990][g], 0.05, 'square', 0.035);
      else nota(ac.currentTime, 140, 0.12, 'sine', 0.06, 70);
    }
  }
  function colpo(x, y) {
    const ctx = ctxE;
    if (!attivo() || !gioco(ctx)) return;
    const m = mia(ctx), ms = ora(m), c = m.mappa.cerchi[m.st.prossimo];
    if (!c || ms < c.t - m.mappa.appare) return;
    if (Math.hypot(x - c.x, y - c.y) > m.mappa.raggio * 1.08) return;
    const scarto = ms - c.t;
    if (scarto < -m.mappa.finestre[2]) return; // troppo presto: il cerchio "trema" e aspetta
    giudica(ctx, m, m.st.prossimo, scarto, c.x, c.y);
  }
  function premi(e) {
    audio();
    if (!attivo() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    puntatore = T.punto(e);
    colpo(...puntatore);
  }
  document.addEventListener('pointermove', (e) => { if (attivo() && T && e.pointerType === 'mouse') puntatore = T.punto(e); }, { passive: true });
  // per chi viene dal gioco vero: Z e X cliccano dove c'è il puntatore
  document.addEventListener('keydown', (e) => {
    if (!attivo() || e.repeat || (window.Boss && Boss.attivo) || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (e.key === 'z' || e.key === 'x' || e.key === 'Z' || e.key === 'X') { e.preventDefault(); colpo(...puntatore); }
  });

  // ---- disegno ----
  function cerchio(g, c, m, ms, alfa) {
    const R = m.mappa.raggio, col = GRUPPI[c.g % GRUPPI.length];
    g.globalAlpha = alfa;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(c.x + 3, c.y + 4, R, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(c.x - R * 0.3, c.y - R * 0.35, R * 0.1, c.x, c.y, R);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, ombra(col));
    g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#fff'; g.font = `800 ${Math.round(R * 0.8)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(String(c.n), c.x, c.y + 2); g.fillText(String(c.n), c.x, c.y + 2);
    // l'anello che si stringe: tocca il cerchio all'istante giusto
    const u = (c.t - ms) / m.mappa.appare;
    if (u > 0) { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(c.x, c.y, R * (1 + u * 2.2), 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1; g.textBaseline = 'alphabetic';
  }
  const ombra = (hex) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * 0.45); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  function disegna() {
    requestAnimationFrame(disegna);
    if (!attivo() || !T || !T.visibile()) return;
    const ctx = ctxE, p = ctx.partita, m = mia(ctx), ms = ora(m), g = T.g(), L = Cl(), mp = m.mappa;
    // cerchi passati senza clic: mancati
    if (gioco(ctx)) while (m.st.prossimo < mp.cerchi.length && ms > mp.cerchi[m.st.prossimo].t + mp.finestre[2]) { const c = mp.cerchi[m.st.prossimo]; giudica(ctx, m, m.st.prossimo, null, c.x, c.y); }
    if (!ctx.stato.spettatore && ms < mp.fine + 1000) musica(m, ms);
    // campo
    const gr = g.createRadialGradient(L.W / 2, L.H / 2, 50, L.W / 2, L.H / 2, L.W * 0.7);
    gr.addColorStop(0, '#1d1b3a'); gr.addColorStop(1, '#0b0a18');
    g.fillStyle = gr; g.fillRect(0, 0, L.W, L.H);
    // il battito: il bordo pulsa
    const fase = ((ms - L.INIZIO) % mp.battito + mp.battito) % mp.battito / mp.battito;
    g.strokeStyle = `rgba(160,140,255,${0.35 * (1 - fase)})`; g.lineWidth = 6; g.strokeRect(3, 3, L.W - 6, L.H - 6);
    // cerchi visibili: dall'ultimo al primo (il primo da colpire sta sopra)
    const vis = [];
    for (let i = m.st.prossimo; i < mp.cerchi.length; i++) { const c = mp.cerchi[i]; if (c.t - mp.appare > ms) break; vis.push(c); }
    // puntini verso il cerchio dopo
    for (let k = 0; k + 1 < vis.length; k++) {
      const a = vis[k], b = vis[k + 1], d = Math.hypot(b.x - a.x, b.y - a.y);
      if (b.g !== a.g || d < mp.raggio * 2.4) continue;
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (let s = mp.raggio * 1.3; s < d - mp.raggio * 1.3; s += 22) { g.beginPath(); g.arc(a.x + ((b.x - a.x) * s) / d, a.y + ((b.y - a.y) * s) / d, 2.5, 0, Math.PI * 2); g.fill(); }
    }
    for (let k = vis.length - 1; k >= 0; k--) { const c = vis[k], comp = Math.min(1, (ms - (c.t - mp.appare)) / 250); cerchio(g, c, m, ms, comp); }
    // colpi presi: il cerchio si allarga e sfuma; il giudizio sale
    const adesso = performance.now();
    m.effetti = m.effetti.filter((e) => adesso - e.t < 700);
    for (const e of m.effetti) {
      const u = (adesso - e.t) / 700, c = mp.cerchi[e.i];
      if (e.g < 3 && u < 0.35) { g.globalAlpha = 1 - u / 0.35; g.strokeStyle = GRUPPI[c.g % GRUPPI.length]; g.lineWidth = 6; g.beginPath(); g.arc(e.x, e.y, mp.raggio * (1 + u * 1.2), 0, Math.PI * 2); g.stroke(); }
      if (e.g > 0) { g.globalAlpha = 1 - u; g.font = '900 34px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = GIUDIZI[e.g][1]; g.fillText(GIUDIZI[e.g][0], e.x, e.y - mp.raggio - 8 - u * 24); }
      g.globalAlpha = 1;
    }
    // punti, serie, precisione, avanzamento
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 34px system-ui, sans-serif'; g.fillText(String(m.st.punti).padStart(7, '0'), L.W - 18, 44);
    g.font = '600 20px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(`${L.precisione(m.st).toFixed(2)}%`, L.W - 18, 72);
    g.textAlign = 'left'; g.font = '800 40px system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(`${m.st.serie}x`, 18, L.H - 20);
    const prog = Math.max(0, Math.min(1, ms / mp.fine));
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, 0, L.W, 5); g.fillStyle = '#b8a6ff'; g.fillRect(0, 0, L.W * prog, 5);
    // prima della musica: il conto alla rovescia
    const primo = mp.cerchi[0];
    if (primo && ms < primo.t - mp.appare) {
      const s = Math.ceil((primo.t - mp.appare - ms) / 1000);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.textAlign = 'center'; g.font = '400 110px "Young Serif", Georgia, serif'; g.fillText(ms < 0 ? String(Math.min(9, s)) : 'Via!', L.W / 2, L.H / 2 + 30);
      g.font = '600 22px system-ui, sans-serif'; g.fillText(window.matchMedia('(pointer: coarse)').matches ? 'Tocca i cerchi quando l\'anello li tocca' : 'Clicca i cerchi quando l\'anello li tocca (anche Z e X)', L.W / 2, L.H / 2 + 90);
    }
    if (p.finita || m.st.prossimo >= mp.cerchi.length && ms > mp.fine) {
      g.fillStyle = 'rgba(8,6,20,.7)'; g.fillRect(0, 0, L.W, L.H); g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '400 54px "Young Serif", Georgia, serif'; g.fillText(m.st.conteggi[3] ? 'Fine!' : 'Nessun cerchio mancato!', L.W / 2, L.H / 2 - 40);
      g.font = '600 24px system-ui, sans-serif';
      g.fillText(`300 × ${m.st.conteggi[0]}   100 × ${m.st.conteggi[1]}   50 × ${m.st.conteggi[2]}   ✕ × ${m.st.conteggi[3]}`, L.W / 2, L.H / 2 + 10);
      g.fillText(`Serie massima ${m.st.serieMax} · precisione ${L.precisione(m.st).toFixed(2)}%`, L.W / 2, L.H / 2 + 46);
    }
  }
  requestAnimationFrame(disegna);

  const tavolo = {
    libero: true,
    reset(ctx) { ctxE = ctx; },
    panno(ctx) {
      const p = ctx.partita;
      const rec = p.finita && p.record && p.record.length ? `<div class="ce-record"><b>🏆 Punteggi migliori</b><ol>${p.record.map((x, k) => `<li class="${k === p.posizioneRecord ? 'nuovo' : ''}">${x.punti} <small>(${x.prec}%)</small></li>`).join('')}</ol></div>` : '';
      const classifica = p.sfida && p.finita ? `<ol class="ce-classifica">${p.altri.map((_, i) => i).sort((a, b) => p.altri[b].punti - p.altri[a].punti).map((i, k) => `<li class="${i === ctx.mio ? 'io' : ''}"><b>${k + 1}°</b> ${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <span>${p.altri[i].punti} · ${p.altri[i].prec}%</span></li>`).join('')}</ol>` : '';
      const nomi = { facile: 'Facile', medio: 'Media', difficile: 'Difficile' };
      return `<div class="ce ${p.finita ? 'finito' : ''}">
        <div class="ce-barra"><span>🎵 ${nomi[p.livello]} · ${p.totale} cerchi</span></div>
        <div class="ce-box"></div>
        ${window.matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth ? '<p class="ce-gira">📱 Gira il telefono in orizzontale: i cerchi diventano più grandi</p>' : ''}${classifica}${rec}</div>`;
    },
    dopo(ctx) {
      ctxE = ctx;
      const t = tela();
      if (!t.tela._pronto) { t.tela._pronto = true; t.tela.addEventListener('pointerdown', premi); t.tela.setAttribute('aria-label', 'Campo dei cerchi'); }
      t.metti('.ce-box', { W: Cl().W, H: Cl().H, sotto: !window.matchMedia('(pointer: coarse)').matches ? 110 : innerWidth > innerHeight && innerHeight <= 520 ? 14 : 90, max: 1.3 });
      mia(ctx);
      if (ctx.partita.finita && primaVolta(ctx.ui, 'ce-fine') && master) master.gain.value = 0;
    },
    stato(ctx) { const p = ctx.partita; if (p.finita) return null; return p.sfida ? 'Sfida: chi fa più punti?' : 'Colpisci i cerchi a tempo'; },
    punteggio(ctx) { const p = ctx.partita; return p.sfida ? p.altri.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x.punti}</b></span>`).join('') + '<span class="obiettivo">punti</span>' : ''; },
    infoPosto(ctx, posto) { const x = ctx.partita.altri[posto]; return `<span class="rp-info">${x.punti} punti · ${x.prec}% · ${x.serie}x</span>`; },
  };

  Object.assign(window.Tavoli, { cerchi: tavolo });
})();
