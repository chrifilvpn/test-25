// ESECUZIONE PUBBLICA: chi scrive 67 in chat viene gettato nel vulcano. Animazione a tutto schermo, ~7 secondi.
// Non compare se sei sulle dispense (Boss Key): non deve tradirti.
window.Esecuzione = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let audio = null;

  function muto() {
    const b = document.getElementById('suono');
    return (window.Boss && Boss.attivo) || (b && b.getAttribute('aria-pressed') === 'false');
  }
  // rullo di tamburi, boato e sfrigolio della lava
  function suoni(durata) {
    if (muto()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime;
      const rumore = (inizio, dur, vol, filtro) => {
        const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = audio.createBufferSource(); src.buffer = buf;
        const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro;
        const g = audio.createGain(); g.gain.setValueAtTime(vol, t0 + inizio); g.gain.exponentialRampToValueAtTime(0.001, t0 + inizio + dur);
        src.connect(f).connect(g).connect(audio.destination); src.start(t0 + inizio); src.stop(t0 + inizio + dur);
      };
      for (let k = 0; k < 22; k++) rumore(0.3 + k * 0.1, 0.09, 0.05 + k * 0.004, 900); // tamburi che crescono
      const o = audio.createOscillator(), g = audio.createGain();          // il boato
      o.type = 'sine'; o.frequency.setValueAtTime(120, t0 + 3.55); o.frequency.exponentialRampToValueAtTime(28, t0 + 5);
      g.gain.setValueAtTime(0.0001, t0 + 3.5); g.gain.exponentialRampToValueAtTime(0.35, t0 + 3.6); g.gain.exponentialRampToValueAtTime(0.001, t0 + 5.2);
      o.connect(g).connect(audio.destination); o.start(t0 + 3.5); o.stop(t0 + 5.3);
      rumore(3.55, 1.6, 0.18, 1800); // l'esplosione
      rumore(4.6, Math.max(0.5, durata / 1000 - 4.8), 0.03, 4000); // sfrigolio
    } catch {}
  }

  function avvia({ nome, sonoIo, durata = 7000, globale = false }) {
    if (window.Boss && Boss.attivo) return; // sulle dispense non si vede niente
    document.querySelector('.ex-velo')?.remove();
    const calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const braci = Array.from({ length: 34 }, (_, k) => `<i style="--x:${(k * 37) % 100}%;--d:${(k * 0.23) % 4}s;--v:${2.6 + (k % 5) * 0.5}s;--s:${3 + (k % 4)}px"></i>`).join('');
    const schizzi = Array.from({ length: 26 }, (_, k) => {
      const ang = (-160 + (k / 25) * 140) * (Math.PI / 180);
      const f = 120 + ((k * 53) % 180);
      return `<b style="--dx:${Math.round(Math.cos(ang) * f)}px;--dy:${Math.round(Math.sin(ang) * f * 1.3)}px;--r:${10 + (k % 4) * 5}px;--k:${(k % 6) * 0.03}s"></b>`;
    }).join('');
    const chi = sonoIo ? 'Sei stato gettato nel vulcano' : `${esc(nome)} è stato gettato nel vulcano`;
    const el = document.createElement('div');
    el.className = `ex-velo ${calmo ? 'calmo' : ''}`;
    el.setAttribute('role', 'alert');
    el.style.setProperty('--durata', `${durata}ms`);
    el.innerHTML = `
      <div class="ex-cielo"></div>
      <div class="ex-braci">${braci}</div>
      <h2 class="ex-titolo"><span>Esecuzione</span><span>pubblica</span></h2>
      <p class="ex-accusa">${sonoIo ? 'Hai' : `<b>${esc(nome)}</b> ha`} pronunciato il numero proibito</p>
      <div class="ex-volo"><div class="ex-caduta"><span class="ex-nome">${esc(nome)}</span></div></div>
      <svg class="ex-vulcano" viewBox="0 0 800 420" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id="ex-roccia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a22"/><stop offset="1" stop-color="#1c0f0c"/></linearGradient>
          <radialGradient id="ex-lava" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff3a0"/><stop offset=".35" stop-color="#ffb000"/><stop offset=".75" stop-color="#ff4d00"/><stop offset="1" stop-color="#b3200a"/></radialGradient>
          <radialGradient id="ex-alone"><stop offset="0" stop-color="#ff8a00" stop-opacity=".85"/><stop offset=".5" stop-color="#ff5a00" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="ex-fumo"><circle cx="400" cy="92" r="40"/><circle cx="366" cy="66" r="34"/><circle cx="438" cy="58" r="36"/><circle cx="404" cy="34" r="30"/></g>
        <ellipse class="ex-alone" cx="400" cy="118" rx="190" ry="90" fill="url(#ex-alone)"/>
        <path d="M0 420 L250 150 Q300 118 340 122 L460 122 Q500 118 550 150 L800 420Z" fill="url(#ex-roccia)"/>
        <path d="M130 420 L290 190 L260 260 L330 230 L300 330 L380 280 L360 420Z" fill="#2b1813" opacity=".7"/>
        <path d="M520 420 L500 290 L560 330 L540 240 L610 300 L660 420Z" fill="#2b1813" opacity=".7"/>
        <ellipse class="ex-cratere" cx="400" cy="126" rx="66" ry="14" fill="url(#ex-lava)"/>
        <path class="ex-colata" d="M372 132 C360 180 380 210 350 260 C330 300 350 340 330 420 L352 420 C370 350 360 300 382 260 C406 214 392 180 400 132Z" fill="url(#ex-lava)"/>
        <path class="ex-colata due" d="M430 132 C446 190 430 230 462 280 C486 318 470 370 490 420 L470 420 C452 372 462 322 440 286 C412 236 420 190 414 132Z" fill="url(#ex-lava)"/>
      </svg>
      <div class="ex-schizzi">${schizzi}</div>
      <div class="ex-lampo"></div>
      <div class="ex-epitaffio"><p>${chi}</p><small>Riposi nella lava 🔥${globale ? '' : ' · il gioco riprende tra poco'}</small></div>`;
    document.body.append(el);
    suoni(durata);
    if (navigator.vibrate && sonoIo) navigator.vibrate([80, 60, 80, 60, 400]);
    setTimeout(() => el.classList.add('via'), durata - 600);
    setTimeout(() => el.remove(), durata);
  }
  // ENRICO PAPI: il video a tutto schermo per tutti (sulle dispense no; col suono spento parte muto)
  function papi({ nome, durata = 6600 }) {
    if (window.Boss && Boss.attivo) return;
    document.querySelector('.ex-papi')?.remove();
    const el = document.createElement('div');
    el.className = 'ex-papi';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<video playsinline preload="auto"><source src="/video/enrico-papi.webm" type="video/webm"><source src="/video/enrico-papi.mp4" type="video/mp4"></video><p>🚗 ${esc(nome || '')} ha chiamato Enrico Papi</p><button type="button" class="ex-papi-chiudi" aria-label="Chiudi il video" title="Chiudi">✕</button>`;
    document.body.append(el);
    const v = el.querySelector('video');
    // la X in alto a destra chiude il video solo per te (il gioco resta fermo per tutti fino alla fine dello spot)
    el.querySelector('.ex-papi-chiudi').addEventListener('click', () => { v.pause(); togli(); });
    v.muted = muto();
    // senza un clic recente il browser può bloccare l'audio: allora si riprova muto
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    const togli = () => { el.classList.add('via'); setTimeout(() => el.remove(), 500); };
    v.addEventListener('ended', togli);
    setTimeout(() => { if (el.isConnected) togli(); }, durata + 400);
  }
  return { avvia, papi };
})();
