// ALIEN: ISOLATION 3D — il gioco nel browser: comandi (mouse bloccato per guardare, tasti, dito), movimento previsto
// (il proprio personaggio si muove subito), la scena 3D (public/js/isolation/motore.js, caricato solo quando serve
// insieme a three.js e alla mappa), lo schermo sopra la scena (rilevatore di movimento, obiettivi, oggetti, scritte,
// grana della pellicola), la vista dello xenomorfo quando lo fa una persona (pianta dei condotti, rumori sentiti) e i
// suoni fatti a codice (ronzio della stazione, porte, passi e urla dello xenomorfo, bip del rilevatore, battito).
(() => {
  const { esc } = window.Nuovi;
  const touch = () => window.Arena.touch();
  const BIT = { corre: 1, accucciato: 2, rilevatore: 4, respiro: 8 };
  const VEL = { cammina: 30, corre: 52, accucciato: 14, rilevatore: 20, alieno: 30, alienoCorre: 62 };
  let M = null, mot = null, caricamento = null, errore = null, ctxA = null;

  function script(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(`non carica ${src}`)); document.head.appendChild(s); }); }
  function carica() {
    if (caricamento) return caricamento;
    caricamento = (async () => {
      const prova = document.createElement('canvas');
      if (!(prova.getContext('webgl2') || prova.getContext('webgl'))) throw new Error('Questo browser non disegna in 3D (WebGL spento o non supportato).');
      if (!window.IsolationMappa) await script('/js/isolation-mappa.js');
      M = window.IsolationMappa;
      const m = await import('/js/isolation/motore.js');
      mot = await m.crea({ M });
    })().catch((e) => { errore = e; console.error('[isolation]', e); });
    return caricamento;
  }

  // ---------- i comandi ----------
  const io = { yaw: 0, pitch: 0, acc: false, corre: false, ril: false, respiro: false, c: [0, 0, 0, 0] };
  window.__isolationIO = io; // per le prove automatiche
  let inviato = '', ultimoInvio = 0, yawPronto = false, spettaIdx = 0;
  const attiva = () => ctxA && ctxA.partita && ctxA.partita.gioco === 'isolation' && !ctxA.partita.finita && ctxA.stato && !ctxA.stato.spettatore;
  const bloccato = () => document.pointerLockElement && document.pointerLockElement.classList.contains('ar-tela');
  const bits = () => (io.corre ? BIT.corre : 0) | (io.acc ? BIT.accucciato : 0) | (io.ril ? BIT.rilevatore : 0) | (io.respiro ? BIT.respiro : 0);
  function invia(forza = false) {
    if (!attiva()) return;
    const ora = performance.now();
    const pacco = { yw: Math.round(io.yaw * 1000) / 1000, pt: Math.round(io.pitch * 100) / 100, k: bits(), c: io.c.slice() };
    const k = JSON.stringify(pacco);
    if (!forza && (k === inviato ? ora - ultimoInvio < 300 : ora - ultimoInvio < 50)) return;
    inviato = k; ultimoInvio = ora;
    ctxA.emetti('input', pacco);
  }
  setInterval(() => invia(), 60);
  const premi = (i) => { io.c[i]++; invia(true); audio.avvia(); };
  const SENS = 0.0023;
  document.addEventListener('mousemove', (e) => {
    if (!attiva() || !bloccato()) return;
    io.yaw += e.movementX * SENS; io.pitch = Math.max(-1.35, Math.min(1.35, io.pitch - e.movementY * SENS));
  });
  document.addEventListener('keydown', (e) => {
    if (!attiva() || (window.Boss && Boss.attivo) || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const k = e.key.toLowerCase();
    if (k === 'shift') io.corre = true;
    else if (k === 'c' && !e.repeat) io.acc = !io.acc;
    else if (k === 'q') io.ril = true;
    else if (k === ' ') io.respiro = true;
    else if (e.repeat) return;
    else if (k === 'e') premi(1);
    else if (k === 'f') premi(2);
    else if (k === 'g') premi(3);
    else if (k === 'tab') { e.preventDefault(); spettaIdx++; }
    else return;
    invia(true);
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'shift') io.corre = false; else if (k === 'q') io.ril = false; else if (k === ' ') io.respiro = false; else return;
    invia(true);
  });
  window.addEventListener('blur', () => { io.corre = io.ril = io.respiro = false; invia(true); });
  document.addEventListener('pointerlockchange', () => { if (!bloccato()) { io.ril = false; } });
  // la tela: clic per bloccare il mouse, poi clic = lanciafiamme (o attacco), tasto destro = rilevatore
  let telaPronta = null;
  function preparaTela(tela) {
    if (telaPronta === tela) return;
    telaPronta = tela;
    tela.addEventListener('contextmenu', (e) => e.preventDefault());
    tela.addEventListener('pointerdown', (e) => {
      if (!attiva()) return;
      audio.avvia();
      if (!bloccato()) { try { const p = tela.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* niente */ } return; }
      if (e.button === 2) { io.ril = true; invia(true); } else if (e.button === 0) { if (stanzaSpettatore()) spettaIdx++; else premi(0); }
    });
    const su = (e) => { if (e.pointerType === 'mouse' && e.button === 2) { io.ril = false; invia(true); } };
    tela.addEventListener('pointerup', su); tela.addEventListener('pointercancel', su);
  }
  // il pulsante dello schermo intero (nello strato sopra la scena)
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-is="schermo"]');
    if (!b) return;
    const box = document.querySelector('.ar-box');
    if (document.fullscreenElement) document.exitFullscreen(); else if (box && box.requestFullscreen) { box.classList.add('is-schermo'); box.requestFullscreen().catch(() => {}); }
  });

  // ---------- chi sono e dove sono ----------
  const mostroDi = (p) => (p && p.extra ? p.extra.mostro : null);
  const sonoMostro = (ctx) => mostroDi(ctx.partita) === ctx.mio;
  const mioUmano = (s, ctx) => s && s.u && s.u.find((u) => u[0] === ctx.mio);
  function stanzaSpettatore() {
    const c = ctxA; if (!c || !c.partita || !c.partita.stato || !c.partita.stato.s) return false;
    if (sonoMostro(c)) return false;
    const u = mioUmano(c.partita.stato.s, c);
    return !!u && (!(u[5] & 1) || (u[5] & 64));
  }
  const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const lerpA = (a, b, u) => a + angolo(b - a) * u;
  // lo stato interpolato tra i due aggiornamenti (persone e xenomorfo)
  function interpola(s, pr, u) {
    const umani = s.u.map((q) => {
      const a = pr && pr.u ? pr.u.find((x) => x[0] === q[0]) : null;
      const salto = !a || Math.hypot(a[1] - q[1], a[2] - q[2]) > 60;
      const x = salto ? q[1] : a[1] + (q[1] - a[1]) * u, y = salto ? q[2] : a[2] + (q[2] - a[2]) * u;
      const vel = a && !salto ? Math.hypot(q[1] - a[1], q[2] - a[2]) / 0.05 : 0;
      return { k: q[0], x, y, yaw: salto ? q[3] : lerpA(a[3], q[3], u), pitch: q[4], f: q[5], vel };
    });
    const A = s.a, B = pr && pr.a ? pr.a : A;
    const salto = Math.hypot(A[0] - B[0], A[1] - B[1]) > 80;
    const alieno = { x: salto ? A[0] : B[0] + (A[0] - B[0]) * u, y: salto ? A[1] : B[1] + (A[1] - B[1]) * u, yaw: salto ? A[2] : lerpA(B[2], A[2], u), anim: A[3], inCondotto: !!A[4], vel: A[5], stato: A[6] };
    return { umani, alieno };
  }

  // ---------- la previsione del movimento (stessi muri e velocità del server) ----------
  let predMio = null;
  function aperte(s) { const o = {}; if (s && s.p) s.p.forEach((v, i) => { o[i] = v % 100 > 7; }); return o; }
  const predici = {
    prendi(ultimo, ctx) {
      const s = ultimo.s; if (!s || !s.u) return null;
      if (sonoMostro(ctx)) { if (s.a[4] || s.a[6] === 'uccide') return null; return { x: s.a[0], y: s.a[1] }; }
      const u = mioUmano(s, ctx);
      if (!u || !(u[5] & 1) || (u[5] & 2) || (u[5] & 64) || (s.me && s.me[4] >= 0)) return null;
      return { x: u[1], y: u[2] };
    },
    muovi(pred, inp, dt, ctx, ultimo) {
      if (!M) return pred;
      const mostro = sonoMostro(ctx), s = ultimo.s;
      let v;
      if (mostro) v = io.corre && s.me && s.me[0] > 5 ? VEL.alienoCorre : VEL.alieno;
      else v = io.acc ? VEL.accucciato : io.ril ? VEL.rilevatore : io.corre ? VEL.corre : VEL.cammina;
      const f = -inp.y, l = inp.x;
      let dx = Math.cos(io.yaw) * f - Math.sin(io.yaw) * l, dy = Math.sin(io.yaw) * f + Math.cos(io.yaw) * l;
      const n = Math.hypot(dx, dy); if (n < 0.05) return pred;
      if (n > 1) { dx /= n; dy /= n; }
      const e = { x: pred.x, y: pred.y };
      M.muovi(e, dx * v * dt, dy * v * dt, mostro ? 5 : 4, aperte(s), !mostro && io.acc);
      return e;
    },
    metti(stato, ctx, pred) { predMio = pred; return stato; },
  };

  // ---------- i suoni (Web Audio, niente file) ----------
  const audio = (() => {
    let ac = null, master = null, ronzio = null;
    const muto = () => { const b = document.getElementById('suono'); return (b && b.getAttribute('aria-pressed') === 'false') || (window.Boss && Boss.attivo); };
    function avvia() {
      try {
        if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination); }
        if (ac.state === 'suspended') ac.resume();
      } catch (_) { /* niente audio */ }
    }
    function rumoreBuf(sec = 1) { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
    let buf = null;
    // un suono a una posizione (pan e volume secondo la distanza da chi ascolta)
    function uscita(vol, pan) {
      const g = ac.createGain(); g.gain.value = vol;
      const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
      if (p) { p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p).connect(master); } else g.connect(master);
      return g;
    }
    function soffio(vol, pan, { f = 1200, q = 1, dur = 0.5, att = 0.01, tipo = 'bandpass', f2 = null } = {}) {
      buf = buf || rumoreBuf(2);
      const s = ac.createBufferSource(); s.buffer = buf;
      const fl = ac.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
      const t = ac.currentTime; if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl).connect(g).connect(uscita(vol, pan)); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    }
    function tono(vol, pan, f, dur, { tipo = 'sine', f2 = null, att = 0.005 } = {}) {
      const o = ac.createOscillator(); o.type = tipo; const t = ac.currentTime;
      o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(uscita(vol, pan)); o.start(t); o.stop(t + dur + 0.05);
    }
    const SUONI = {
      porta: (v, p) => { soffio(v * 0.5, p, { f: 2200, q: 0.7, dur: 0.7, att: 0.02, f2: 600 }); tono(v * 0.4, p, 70, 0.35, { tipo: 'square' }); },
      armadietto: (v, p) => { tono(v * 0.35, p, 180, 0.12, { tipo: 'square', f2: 90 }); soffio(v * 0.4, p, { f: 3000, q: 4, dur: 0.15 }); },
      passo: (v, p) => { tono(v * 0.5, p, 65, 0.18, { tipo: 'sine', f2: 40 }); soffio(v * 0.25, p, { f: 400, q: 1, dur: 0.12, tipo: 'lowpass' }); },
      condotto: (v, p) => { for (let i = 0; i < 3; i++) setTimeout(() => { if (ac) { tono(v * 0.4, p, 110 + Math.random() * 60, 0.2, { tipo: 'square', f2: 60 }); soffio(v * 0.3, p, { f: 900, q: 2, dur: 0.25 }); } }, i * 140); },
      urlo: (v, p) => {
        tono(v * 0.35, p, 380, 1.3, { tipo: 'sawtooth', f2: 1500, att: 0.08 }); tono(v * 0.25, p, 520, 1.1, { tipo: 'sawtooth', f2: 2100, att: 0.1 });
        soffio(v * 0.6, p, { f: 2500, q: 3, dur: 1.4, att: 0.06, f2: 900 }); soffio(v * 0.4, p, { f: 700, q: 5, dur: 1.2, att: 0.1, f2: 2000 });
      },
      sibilo: (v, p) => soffio(v * 0.5, p, { f: 5000, q: 2, dur: 1.2, att: 0.15, tipo: 'highpass' }),
      fiamma: (v, p) => { soffio(v * 0.9, p, { f: 600, q: 0.5, dur: 0.8, att: 0.03, tipo: 'lowpass' }); soffio(v * 0.4, p, { f: 2000, q: 0.5, dur: 0.6, att: 0.02 }); },
      razzo: (v, p) => { soffio(v * 0.5, p, { f: 3500, q: 1, dur: 1.2, att: 0.01 }); },
      bip: (v, p, f = 1000) => tono(v * 0.12, p, f, 0.09, { tipo: 'sine' }),
      ping: (v, p, f = 1500) => tono(v * 0.15, p, f, 0.14, { tipo: 'triangle' }),
      battito: (v) => { tono(v * 0.6, 0, 55, 0.14, { f2: 35 }); setTimeout(() => ac && tono(v * 0.45, 0, 50, 0.16, { f2: 32 }), 180); },
      preso: (v) => { tono(v * 0.12, 0, 880, 0.1); setTimeout(() => ac && tono(v * 0.12, 0, 1320, 0.15), 90); },
      gen: (v, p) => { tono(v * 0.3, p, 50, 2.5, { tipo: 'sawtooth', f2: 120, att: 0.3 }); setTimeout(() => ac && tono(v * 0.15, p, 660, 0.4), 1500); },
      allarme: (v) => { for (let i = 0; i < 4; i++) setTimeout(() => ac && tono(v * 0.15, 0, 700, 0.3, { tipo: 'square', f2: 500 }), i * 450); },
      morte: (v) => { SUONI.urlo(v * 1.4, 0); soffio(v, 0, { f: 300, q: 1, dur: 0.6, att: 0.01, tipo: 'lowpass' }); tono(v * 0.5, 0, 90, 0.6, { tipo: 'square', f2: 30 }); },
      vuoto: (v) => tono(v * 0.15, 0, 200, 0.12, { tipo: 'square' }),
      click: (v) => tono(v * 0.15, 0, 2400, 0.03, { tipo: 'square' }),
    };
    function suona(nome, vol = 1, pan = 0, extra) { if (!ac || muto() || vol < 0.01) return; try { SUONI[nome](vol, pan, extra); } catch (_) { /* niente */ } }
    // il ronzio continuo della stazione (motori, aria nei condotti)
    function ambiente(acceso, tensione = 0) {
      if (!ac) return;
      if (acceso && !muto() && !ronzio) {
        const g = ac.createGain(); g.gain.value = 0; g.connect(master);
        const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 41; o2.frequency.value = 41.7;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110;
        buf = buf || rumoreBuf(2);
        const n = ac.createBufferSource(); n.buffer = buf; n.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
        const gn = ac.createGain(); gn.gain.value = 0.25;
        o1.connect(lp); o2.connect(lp); lp.connect(g); n.connect(bp).connect(gn).connect(g);
        // la tensione: un accordo basso e stridente che sale quando lo xenomorfo è vicino
        const t1 = ac.createOscillator(), t2 = ac.createOscillator(); t1.type = 'triangle'; t2.type = 'triangle'; t1.frequency.value = 73.4; t2.frequency.value = 77.8;
        const gt = ac.createGain(); gt.gain.value = 0; t1.connect(gt); t2.connect(gt); gt.connect(master);
        [o1, o2, n, t1, t2].forEach((x) => x.start());
        ronzio = { g, gt, nodi: [o1, o2, n, t1, t2] };
      }
      if ((!acceso || muto()) && ronzio) { ronzio.nodi.forEach((x) => { try { x.stop(); } catch (_) { /* già fermo */ } }); ronzio.g.disconnect(); ronzio.gt.disconnect(); ronzio = null; }
      if (ronzio) { ronzio.g.gain.value = 0.05; ronzio.gt.gain.value += (Math.min(0.06, tensione * 0.06) - ronzio.gt.gain.value) * 0.05; }
    }
    return { avvia, suona, ambiente };
  })();

  // ---------- quello che serve a ogni fotogramma ----------
  let ultimoT = performance.now(), passiT = 0, bipT = 0, battitoT = 0, morteT = null, salvoT = null, ultimiPing = [], scossa = 0, stanzaVista = null, stanzaT = 0, messaggi = [];
  const grana = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } g.putImageData(d, 0, 0); return c; })();
  const NOMI_OGG = { b: 'batteria', f: 'carburante', r: 'razzo' };

  function sottotitolo(testo) { messaggi.push({ testo, t: performance.now() }); messaggi = messaggi.slice(-3); }

  function disegna(g, p, s, prima, u, ctx) {
    ctxA = ctx;
    const W = p.W, H = p.H, ora = performance.now(), dt = Math.min(0.1, (ora - ultimoT) / 1000); ultimoT = ora;
    preparaTela(g.canvas);
    if (!mot) {
      carica();
      g.fillStyle = '#030405'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#9fe6a0'; g.font = '600 26px "Courier New", monospace'; g.textAlign = 'center';
      g.fillText(errore ? 'Impossibile avviare il 3D' : 'Caricamento della stazione Sevastopol…', W / 2, H / 2 - 10);
      g.font = '16px "Courier New", monospace'; g.fillStyle = '#6fa070';
      g.fillText(errore ? String(errore.message || errore) : 'SEEGSON · APOLLO · collegamento in corso', W / 2, H / 2 + 24);
      return;
    }
    const st = s.s; if (!st || !st.u) return;
    const I = interpola(st, prima && prima.s, u);
    const mostro = sonoMostro(ctx), mio = ctx.mio;
    const mu = I.umani.find((x) => x.k === mio);
    const ex = p.extra || {};
    // la direzione iniziale: verso l'interno dell'atrio
    if (!yawPronto) { yawPronto = true; io.yaw = mostro ? 0 : 0; io.pitch = 0; }
    // ---------- la telecamera ----------
    let cam, vistaDi = null, modo = mostro ? 'alieno' : 'umano';
    const morto = mu && !(mu.f & 1), salvo = mu && (mu.f & 64);
    if (morto && morteT === null) morteT = ora;
    if (!morto) morteT = null;
    if (salvo && salvoT === null) salvoT = ora;
    if (mostro) {
      const pos = predMio && !I.alieno.inCondotto ? predMio : I.alieno;
      cam = { x: pos.x, y: pos.y, h: I.alieno.anim === 'esce' ? 2.1 : 2.05, yaw: io.yaw, pitch: io.pitch, torcia: false, modo: 'alieno' };
      if (I.alieno.inCondotto) modo = 'condotto';
    } else if (mu && !morto && !salvo) {
      const nascosto = mu.f & 2, sotto = mu.f & 256, acc = mu.f & 4;
      const pos = predMio && !nascosto ? predMio : mu;
      const passo = predMio ? Math.hypot(predMio.x - (predici._px || predMio.x), predMio.y - (predici._py || predMio.y)) : 0;
      if (predMio) { predici._px = predMio.x; predici._py = predMio.y; }
      bob.fase += passo * 0.12; bob.amp += ((passo > 0.1 ? 1 : 0) - bob.amp) * Math.min(1, dt * 6);
      let h = io.acc || acc ? (sotto ? 0.62 : 0.95) : 1.62;
      h += Math.sin(bob.fase) * 0.035 * bob.amp;
      let x = pos.x, y = pos.y, yaw = io.yaw;
      if (nascosto) {
        // dentro l'armadietto: si guarda fuori dalle feritoie, girando poco la testa
        const t = M.quadretto(mu), f = M.verso[`${t[0]},${t[1]}`] || [0, 1], fa = Math.atan2(f[1], f[0]);
        x = (t[0] + 0.5) * M.T - f[0] * 8.5; y = (t[1] + 0.5) * M.T - f[1] * 8.5; h = 1.6;
        const d = angolo(io.yaw - fa); if (Math.abs(d) > 0.55) io.yaw = fa + Math.sign(d) * 0.55; yaw = io.yaw;
      }
      const s3 = mu.f & 128 ? 0.012 : 0; scossa = Math.max(0, scossa - dt);
      cam = { x, y, h: h + (Math.random() - 0.5) * (s3 + scossa * 0.04), yaw: yaw + (Math.random() - 0.5) * scossa * 0.02, pitch: io.pitch, rollio: Math.sin(bob.fase * 0.5) * 0.006 * bob.amp, torcia: !!(mu.f & 32) && !nascosto, batteria: st.me ? st.me[0] : 100, modo: 'umano', fiamma: !!(mu.f & 128) };
    } else if (morto && ora - morteT < 3200) {
      // la morte: lo xenomorfo ti è addosso
      cam = { x: mu.x, y: mu.y, h: Math.max(0.5, 1.6 - (ora - morteT) / 2500), yaw: io.yaw, pitch: 0, torcia: true, batteria: 100, modo: 'morte', rollio: Math.min(0.5, (ora - morteT) / 3000) };
    } else {
      // si guarda un altro sopravvissuto (clic o Tab per cambiare)
      const vivi = I.umani.filter((x) => (x.f & 1) && !(x.f & 64) && x.k !== mio);
      if (vivi.length) {
        vistaDi = vivi[spettaIdx % vivi.length];
        cam = { x: vistaDi.x, y: vistaDi.y, h: vistaDi.f & 4 ? 0.95 : 1.62, yaw: vistaDi.yaw, pitch: vistaDi.pitch, torcia: !!(vistaDi.f & 32), batteria: 100, modo: 'umano' };
      } else {
        cam = { x: I.alieno.x - Math.cos(I.alieno.yaw) * 30, y: I.alieno.y - Math.sin(I.alieno.yaw) * 30, h: 2.4, yaw: I.alieno.yaw, pitch: -0.2, torcia: false, modo: 'umano' };
      }
    }
    // ---------- suoni dello xenomorfo e degli eventi ----------
    const dA = Math.hypot(I.alieno.x - cam.x, I.alieno.y - cam.y);
    const panDi = (x, y) => Math.sin(angolo(Math.atan2(y - cam.y, x - cam.x) - cam.yaw)) * 0.8;
    const volDi = (x, y, r = 250) => Math.max(0, 1 - Math.hypot(x - cam.x, y - cam.y) / r);
    if (!mostro && !I.alieno.inCondotto && I.alieno.vel > 4) {
      passiT -= dt * (I.alieno.vel > 40 ? 3 : 1.6);
      if (passiT <= 0) { passiT = 1; audio.suona('passo', volDi(I.alieno.x, I.alieno.y, 220) * (I.alieno.vel > 40 ? 1 : 0.6), panDi(I.alieno.x, I.alieno.y)); if (dA < 60) scossa = Math.max(scossa, 0.3); }
    }
    // la tensione (musica e battito): vicinanza dello xenomorfo visibile
    const tensione = mostro ? 0 : I.alieno.inCondotto ? Math.max(0, 1 - dA / 120) * 0.4 : Math.max(0, 1 - dA / 200) * (I.alieno.stato === 'caccia' ? 1.3 : 0.8);
    audio.ambiente(attiva() && ctx.partita.stato.fase === 'gioco', tensione);
    if (!mostro && tensione > 0.45 && mu && (mu.f & 1)) { battitoT -= dt * (0.8 + tensione * 1.4); if (battitoT <= 0) { battitoT = 1; audio.suona('battito', Math.min(1, tensione)); } }
    // ---------- la scena 3D ----------
    const umani = I.umani.map((x) => ({ ...x, io: x.k === mio && !mostro && !morto, nascondi: vistaDi && x.k === vistaDi.k }));
    const qualita = touch() ? 0.7 : Math.min(1, 1.3 / (window.devicePixelRatio || 1));
    const w = Math.max(320, Math.round(g.canvas.width * qualita)), h = Math.max(180, Math.round(g.canvas.height * qualita));
    const V = { w, h, dt, cam, umani, alieno: I.alieno, porte: st.p, gen: st.g, raccolti: st.o, razzi: st.fl, sbloccato: !!st.sb, nascondiXeno: mostro };
    if (modo === 'condotto') disegnaCondotti(g, W, H, st, I, ctx);
    else {
      const tela = mot.disegna(V);
      g.drawImage(tela, 0, 0, W, H);
    }
    // ---------- lo schermo sopra ----------
    g.save();
    // grana della pellicola, linee e vignetta (l'aspetto anni '70)
    g.globalAlpha = 0.55; const ox = Math.random() * 256, oy = Math.random() * 256;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(grana, x, y);
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (mostro) hudAlieno(g, W, H, st, I, ctx, modo);
    else hudUmano(g, W, H, st, I, ctx, { mu, morto, salvo, vistaDi, tensione, ora, cam });
    // i messaggi in basso (eventi)
    messaggi = messaggi.filter((m) => ora - m.t < 4000);
    g.textAlign = 'center'; g.font = '600 20px "Courier New", monospace';
    messaggi.forEach((m, i) => { g.globalAlpha = Math.min(1, (4000 - (ora - m.t)) / 600); g.fillStyle = '#d8f0d8'; g.fillText(m.testo, W / 2, H - 150 - (messaggi.length - 1 - i) * 26); });
    g.globalAlpha = 1;
    // clic per giocare (mouse non bloccato)
    if (!touch() && attiva() && !bloccato() && ctx.partita.stato.fase === 'gioco' && !morto && !salvo) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(W / 2 - 260, H / 2 - 40, 520, 70);
      g.fillStyle = '#e8f6e8'; g.font = '700 22px "Courier New", monospace'; g.fillText('Clicca qui per giocare', W / 2, H / 2 - 8);
      g.font = '15px "Courier New", monospace'; g.fillText('il mouse serve a guardarsi intorno · Esc per liberarlo', W / 2, H / 2 + 16);
    }
    g.restore();
  }
  const bob = { fase: 0, amp: 0 };

  // ---------- lo schermo del sopravvissuto ----------
  function testo(g, t, x, y, { size = 18, col = '#cfe8cf', al = 'left', peso = 600 } = {}) { g.font = `${peso} ${size}px "Courier New", monospace`; g.textAlign = al; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(t, x + 1, y + 1); g.fillStyle = col; g.fillText(t, x, y); }
  function hudUmano(g, W, H, st, I, ctx, { mu, morto, salvo, vistaDi, tensione, ora, cam }) {
    const nascosto = mu && (mu.f & 2);
    if (nascosto) {
      // le feritoie dell'armadietto
      g.fillStyle = 'rgba(8,10,12,.97)';
      const r0 = H * 0.3, r1 = H * 0.62, passo = 26;
      g.fillRect(0, 0, W, r0); g.fillRect(0, r1, W, H - r1);
      for (let y = r0; y < r1; y += passo) g.fillRect(0, y + 9, W, passo - 9);
      g.fillRect(0, 0, W * 0.2, H); g.fillRect(W * 0.8, 0, W * 0.2, H);
    }
    if (tensione > 0.5 && mu && (mu.f & 1)) {
      const k = (tensione - 0.5) * (0.6 + 0.4 * Math.sin(ora / 140));
      const rg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); rg.addColorStop(0, 'rgba(120,0,0,0)'); rg.addColorStop(1, `rgba(120,0,0,${Math.min(0.55, k)})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    // obiettivo e luogo
    const acc = st.g.filter((x) => x >= 100).length;
    testo(g, st.sb ? '▶ RAGGIUNGI IL TORRENS (ATTRACCO, IN FONDO A EST)' : `▶ RIACCENDI I GENERATORI  ${acc}/3`, 28, 40, { size: 18 });
    const nomi = ['Medicina', 'Ingegneria', 'Comunicazioni'];
    if (!st.sb) st.g.forEach((x, i) => testo(g, `${x >= 100 ? '■' : '□'} ${nomi[i]}${x > 0 && x < 100 ? ` ${x}%` : ''}`, 40, 66 + i * 22, { size: 15, col: x >= 100 ? '#8fe08f' : '#a8b8a8' }));
    const stanza = M.stanzaDi(cam);
    const nome = stanza ? stanza.nome : 'Corridoio di servizio';
    if (nome !== stanzaVista) { stanzaVista = nome; stanzaT = ora; }
    if (ora - stanzaT < 4000) { g.globalAlpha = Math.min(1, (4000 - (ora - stanzaT)) / 800); testo(g, nome.toUpperCase(), W / 2, 84, { size: 22, al: 'center', col: '#e6efe0' }); g.globalAlpha = 1; }
    const m = Math.floor(st.tr / 60), sec = String(st.tr % 60).padStart(2, '0');
    testo(g, `${m}:${sec}`, W - 28, 40, { size: 20, al: 'right' });
    if (morto || salvo) {
      if (morto && morteT !== null && ora - morteT < 3200) {
        const k = (ora - morteT) / 3200;
        g.fillStyle = `rgba(90,0,0,${0.15 + k * 0.5})`; g.fillRect(0, 0, W, H);
        if (k > 0.55) { g.fillStyle = `rgba(0,0,0,${(k - 0.55) * 2.2})`; g.fillRect(0, 0, W, H); }
      }
      testo(g, morto ? 'SEI MORTO' : 'SEI SALVO: SEI SUL TORRENS', W / 2, H / 2 - 60, { size: 40, al: 'center', col: morto ? '#ff6a5a' : '#9fffa0', peso: 700 });
      if (vistaDi) testo(g, `Stai guardando ${ctx.nome(vistaDi.k)} · clic o Tab per cambiare`, W / 2, H - 40, { size: 16, al: 'center' });
      return;
    }
    if (!mu) return;
    // inventario
    const me = st.me || [100, 0, 0, 100, -1];
    const bx = 28, by = H - 92;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(bx - 10, by - 26, 250, 86);
    testo(g, '🔦', bx, by, { size: 18 }); g.strokeStyle = '#9fd09f'; g.strokeRect(bx + 32, by - 14, 120, 14); g.fillStyle = me[0] < 20 ? '#e05040' : '#9fd09f'; g.fillRect(bx + 34, by - 12, 116 * me[0] / 100, 10);
    testo(g, mu.f & 32 ? 'ACCESA' : 'SPENTA', bx + 160, by, { size: 13 });
    testo(g, `🔥 ×${me[1]}   🎆 ×${me[2]}`, bx, by + 26, { size: 18 });
    testo(g, `${mu.f & 4 ? '▼ ACCUCCIATO' : mu.f & 8 ? '» CORSA' : ''}`, bx, by + 50, { size: 13, col: '#a8c8a8' });
    // mirino
    g.fillStyle = 'rgba(230,240,230,.7)'; g.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
    // cosa si può fare qui
    const pr = suggerimento(st, mu, cam);
    if (pr) testo(g, pr, W / 2, H / 2 + 70, { size: 18, al: 'center', col: '#f0f6e8' });
    if (me[4] >= 0) {
      const v = st.g[me[4]] / 100;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W / 2 - 160, H / 2 + 90, 320, 18); g.fillStyle = '#e0b030'; g.fillRect(W / 2 - 158, H / 2 + 92, 316 * v, 14);
      testo(g, 'RIACCENSIONE DEL GENERATORE… resta vicino', W / 2, H / 2 + 128, { size: 15, al: 'center' });
    }
    // il fiato (nascosti)
    if (nascosto) {
      const f = me[3] / 100, annusa = mu.f & 1024;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W / 2 - 120, H - 70, 240, 14); g.fillStyle = f < 0.25 ? '#e05040' : '#a0d0ff'; g.fillRect(W / 2 - 118, H - 68, 236 * f, 10);
      testo(g, annusa ? 'TI STA ANNUSANDO! TIENI PREMUTO SPAZIO: TRATTIENI IL RESPIRO' : 'E · esci   ·   spazio · trattieni il respiro', W / 2, H - 82, { size: annusa ? 20 : 15, al: 'center', col: annusa ? '#ff7060' : '#d0e0d0' });
    }
    // il rilevatore di movimento
    if (mu.f & 16) rilevatore(g, W, H, st, I, ctx, cam);
  }
  // come il server: il generatore o l'armadietto davanti
  function suggerimento(st, mu, cam) {
    if (mu.f & 2) return null;
    const vicino = (lista, r) => {
      let best = null, bd = r;
      lista.forEach((t, i) => { const c = M.centro(t), d = Math.hypot(c.x - cam.x, c.y - cam.y), a = Math.abs(angolo(Math.atan2(c.y - cam.y, c.x - cam.x) - io.yaw)); if (d < bd && (a < 1.1 || d < 18)) { bd = d; best = i; } });
      return best;
    };
    const gi = vicino(M.OGGETTI.G, 30);
    if (gi !== null && st.g[gi] < 100) return st.me && st.me[4] === gi ? null : 'E · riaccendi il generatore';
    if (vicino(M.OGGETTI.L, 26) !== null) return 'E · nasconditi nell\'armadietto';
    const [tx, ty] = M.quadretto(cam);
    if (M.cella(tx, ty) === 'T' && !(mu.f & 4)) return null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (M.cella(tx + dx, ty + dy) === 'T' && !(mu.f & 4)) return 'C · accucciati per passare sotto';
    return null;
  }
  // il rilevatore: lo schermo verde a ventaglio, i puntini di chi si muove, il bip più acuto se sono vicini
  function rilevatore(g, W, H, st, I, ctx, cam) {
    const cx = W / 2, cy = H - 30, R = 190, RANGE = 300;
    g.save();
    g.fillStyle = '#24231f'; g.beginPath(); g.roundRect(cx - R - 40, cy - R - 50, (R + 40) * 2, R + 90, 22); g.fill();
    g.strokeStyle = '#4a4740'; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, Math.PI, 2 * Math.PI); g.closePath();
    const sf = g.createRadialGradient(cx, cy, 10, cx, cy, R); sf.addColorStop(0, '#0d2a14'); sf.addColorStop(1, '#03100a'); g.fillStyle = sf; g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(80,255,120,.25)'; g.lineWidth = 1.5;
    for (const k of [1 / 3, 2 / 3, 1]) { g.beginPath(); g.arc(cx, cy, R * k, Math.PI, 2 * Math.PI); g.stroke(); }
    for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); g.stroke(); }
    // l'onda che parte ogni secondo
    const ora = performance.now(), fase = (ora % 1000) / 1000;
    g.strokeStyle = `rgba(120,255,150,${0.5 * (1 - fase)})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * fase, Math.PI, 2 * Math.PI); g.stroke();
    // chi si muove (anche nei condotti)
    const cose = [];
    if (I.alieno.vel > 3) cose.push(I.alieno);
    for (const u of I.umani) if (u.k !== ctx.mio && (u.f & 1) && !(u.f & 64) && u.vel > 3) cose.push(u);
    let vicino = Infinity;
    for (const e of cose) {
      const d = Math.hypot(e.x - cam.x, e.y - cam.y); if (d > RANGE) continue;
      const a = angolo(Math.atan2(e.y - cam.y, e.x - cam.x) - io.yaw);
      vicino = Math.min(vicino, d);
      const dietro = Math.abs(a) > Math.PI / 2;
      const aa = dietro ? Math.sign(a) * Math.PI / 2 : a, rr = (d / RANGE) * R;
      const x = cx + Math.sin(aa) * rr, y = cy - Math.cos(aa) * rr;
      const gr = g.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, 'rgba(200,255,210,.95)'); gr.addColorStop(1, 'rgba(80,255,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.fillStyle = '#7dff9a'; g.font = '700 22px "Courier New", monospace'; g.textAlign = 'center';
    g.fillText(vicino < Infinity ? `${(vicino / 10).toFixed(1)}m` : '--.-m', cx, cy - 12);
    g.restore();
    bipT -= 1 / 60;
    if (bipT <= 0) { bipT = 1; audio.suona('bip', 1, 0, 900); if (vicino < Infinity) setTimeout(() => audio.suona('ping', 1, 0, 1800 - Math.min(1200, vicino * 4)), 160); }
  }

  // ---------- lo schermo dello xenomorfo ----------
  function hudAlieno(g, W, H, st, I, ctx, modo) {
    // la vista dello xenomorfo: un velo freddo e i bordi deformati
    if (modo !== 'condotto') {
      g.fillStyle = 'rgba(40,60,120,.12)'; g.fillRect(0, 0, W, H);
      // i rumori sentiti: segni che pulsano dove sono (anche dietro i muri)
      for (const [x, y, tipo] of st.pi || []) {
        const p = mot.proietta(x, y, 1.2);
        const col = tipo === 'fiuto' ? '#ff4040' : tipo === 'corsa' || tipo === 'generatore' || tipo === 'razzo' ? '#ffb040' : '#f0f0f0';
        const d = Math.hypot(x - I.alieno.x, y - I.alieno.y) / 10;
        if (p && p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1) {
          const r = 10 + 6 * Math.sin(performance.now() / 120);
          g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(p.x * W, p.y * H, r, 0, Math.PI * 2); g.stroke();
          testo(g, `${tipo === 'fiuto' ? 'ODORE' : tipo.toUpperCase()} ${d.toFixed(0)}m`, p.x * W, p.y * H - r - 6, { size: 13, al: 'center', col });
        } else {
          // fuori dallo schermo: una freccia sul bordo
          const a = angolo(Math.atan2(y - I.alieno.y, x - I.alieno.x) - io.yaw);
          const ex = W / 2 + Math.sin(a) * (W / 2 - 40), ey = H / 2 - Math.cos(a) * (H / 2 - 40);
          g.fillStyle = col; g.beginPath(); g.arc(ex, ey, 6, 0, Math.PI * 2); g.fill();
        }
      }
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
      const me = st.me || [100, 0, 0];
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(28, H - 50, 204, 16); g.fillStyle = me[0] < 20 ? '#a04040' : '#c0c8e0'; g.fillRect(30, H - 48, 200 * me[0] / 100, 12);
      testo(g, 'FIATO', 28, H - 58, { size: 13, col: '#c0c8e0' });
      if (me[2]) testo(g, '🔥 BRUCIATO: NON PUOI ATTACCARE', W / 2, H / 2 + 110, { size: 20, al: 'center', col: '#ff9050' });
      const pr = suggerimentoAlieno(I);
      testo(g, pr || (me[1] ? '' : 'Clic · attacca'), W / 2, H / 2 + 70, { size: 18, al: 'center', col: '#e0e6f0' });
    }
    const vivi = I.umani.filter((u) => (u.f & 1) && !(u.f & 64)).length;
    testo(g, `▶ SEI LO XENOMORFO · PREDE RIMASTE: ${vivi}`, 28, 40, { size: 18, col: '#d0d8f0' });
    const m = Math.floor(st.tr / 60), sec = String(st.tr % 60).padStart(2, '0');
    testo(g, `${m}:${sec}`, W - 28, 40, { size: 20, al: 'right', col: '#d0d8f0' });
    if (st.sb) testo(g, '⚠ L\'ATTRACCO È APERTO: FERMALI PRIMA DEL TORRENS', 28, 66, { size: 15, col: '#ff8070' });
  }
  function suggerimentoAlieno(I) {
    const A = I.alieno;
    const v = M.OGGETTI.V.map(M.centro).find((c) => Math.hypot(c.x - A.x, c.y - A.y) < 16);
    if (v) return 'E · entra nel condotto';
    const l = M.OGGETTI.L.find((t) => { const c = M.centro(t); return Math.hypot(c.x - A.x, c.y - A.y) < 30 && Math.abs(angolo(Math.atan2(c.y - A.y, c.x - A.x) - io.yaw)) < 0.9; });
    if (l) return 'E · apri l\'armadietto';
    return null;
  }
  // nei condotti: la pianta del settore vista dall'alto, le grate e i rumori
  function disegnaCondotti(g, W, H, st, I) {
    g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
    const k = Math.min((W - 80) / (M.COLS * M.T), (H - 100) / (M.RIGHE * M.T)), ox = (W - M.COLS * M.T * k) / 2, oy = 70;
    for (let ty = 0; ty < M.RIGHE; ty++) for (let tx = 0; tx < M.COLS; tx++) {
      const c = M.griglia[ty][tx]; if (c === '#') continue;
      g.fillStyle = c === 'D' ? '#1d2c3c' : '#142030'; g.fillRect(ox + tx * M.T * k, oy + ty * M.T * k, M.T * k + 0.5, M.T * k + 0.5);
    }
    for (const t of M.OGGETTI.V) { const c = M.centro(t); g.strokeStyle = '#7fb0ff'; g.lineWidth = 2; g.strokeRect(ox + c.x * k - 7, oy + c.y * k - 7, 14, 14); }
    for (const [x, y, tipo] of st.pi || []) { g.fillStyle = tipo === 'fiuto' ? '#ff4040' : '#ffb040'; g.beginPath(); g.arc(ox + x * k, oy + y * k, 5 + 3 * Math.sin(performance.now() / 120), 0, Math.PI * 2); g.fill(); }
    const A = I.alieno;
    g.fillStyle = '#e0e8ff'; g.beginPath(); g.arc(ox + A.x * k, oy + A.y * k, 7, 0, Math.PI * 2); g.fill();
    const v = M.OGGETTI.V.map(M.centro).reduce((a, b) => (Math.hypot(a.x - A.x, a.y - A.y) <= Math.hypot(b.x - A.x, b.y - A.y) ? a : b));
    const vicino = Math.hypot(v.x - A.x, v.y - A.y) < 40;
    testo(g, 'NEI CONDOTTI · WASD per muoverti sopra i soffitti', W / 2, 72, { size: 16, al: 'center', col: '#c0d0f0' });
    testo(g, vicino ? 'E · scendi da questa grata' : 'avvicinati a una grata (quadrati azzurri) per scendere', W / 2, H - 20, { size: 16, al: 'center', col: vicino ? '#ffffff' : '#8090b0' });
  }

  // ---------- gli eventi del server: suoni, scosse, scritte ----------
  function dopoTick(ctx, d) {
    ctxA = ctx;
    if (!d.s || !M) return;
    const st = d.s, mostro = sonoMostro(ctx);
    window.__isolationStato = st; // per le prove automatiche
    const cam = predMio || (mostro ? { x: st.a[0], y: st.a[1] } : (() => { const u = mioUmano(st, ctx); return u ? { x: u[1], y: u[2] } : { x: st.a[0], y: st.a[1] }; })());
    const panDi = (x, y) => Math.sin(angolo(Math.atan2(y - cam.y, x - cam.x) - io.yaw)) * 0.8;
    const volDi = (x, y, r = 300) => Math.max(0, 1 - Math.hypot(x - cam.x, y - cam.y) / r);
    for (const e of st.e || []) {
      const [tipo] = e;
      if (tipo === 'porta') { const p = M.PORTE[e[1]], c = M.centro([p.x, p.y]); audio.suona('porta', volDi(c.x, c.y, 220), panDi(c.x, c.y)); }
      else if (tipo === 'urlo') { audio.suona('urlo', mostro ? 0.7 : volDi(e[1], e[2], 500), panDi(e[1], e[2])); if (!mostro) scossa = Math.max(scossa, 0.6 * volDi(e[1], e[2], 300)); }
      else if (tipo === 'condotto' || tipo === 'esce') { audio.suona('condotto', volDi(e[1], e[2], 350), panDi(e[1], e[2])); if (tipo === 'esce') audio.suona('sibilo', volDi(e[1], e[2], 200), panDi(e[1], e[2])); }
      else if (tipo === 'passiAlieno' && mostro) audio.suona('passo', 0.35, 0);
      else if (tipo === 'armadietto') { const u = st.u.find((x) => x[0] === e[1]); if (u) audio.suona('armadietto', volDi(u[1], u[2], 150), panDi(u[1], u[2])); }
      else if (tipo === 'apre') { const c = M.centro([e[1], e[2]]); audio.suona('armadietto', volDi(c.x, c.y, 200), panDi(c.x, c.y)); }
      else if (tipo === 'fiamma') { const u = st.u.find((x) => x[0] === e[1]); if (u) audio.suona('fiamma', volDi(u[1], u[2], 300), panDi(u[1], u[2])); }
      else if (tipo === 'brucia') { audio.suona('urlo', volDi(e[1], e[2], 500) * 0.9, panDi(e[1], e[2])); if (mostro) scossa = 0.8; }
      else if (tipo === 'razzo') audio.suona('razzo', volDi(e[1], e[2], 300), panDi(e[1], e[2]));
      else if (tipo === 'torcia' && e[1] === ctx.mio) audio.suona('click', 1);
      else if (tipo === 'torciaSpenta' && e[1] === ctx.mio) sottotitolo('La torcia è scarica: cerca una batteria');
      else if (tipo === 'vuoto' && e[1] === ctx.mio) { audio.suona('vuoto', 1); sottotitolo('Non ne hai più'); }
      else if (tipo === 'preso' && e[1] === ctx.mio) { audio.suona('preso', 1); sottotitolo(`Raccolto: ${NOMI_OGG[e[2]]}`); }
      else if (tipo === 'gen') { const c = M.centro(M.OGGETTI.G[e[1]]); audio.suona('gen', Math.max(0.3, volDi(c.x, c.y, 500)), panDi(c.x, c.y)); }
      else if (tipo === 'genInizia') { const c = M.centro(M.OGGETTI.G[e[1]]); audio.suona('gen', volDi(c.x, c.y, 300) * 0.6, panDi(c.x, c.y)); }
      else if (tipo === 'sbloccato') audio.suona('allarme', 1);
      else if (tipo === 'morte') { if (e[1] === ctx.mio) { audio.suona('morte', 1); scossa = 1; } else { const u = st.u.find((x) => x[0] === e[1]); if (u) audio.suona('urlo', volDi(u[1], u[2], 600) * 0.8, panDi(u[1], u[2])); sottotitolo(`${ctx.nome(e[1])} è stato preso`); } }
      else if (tipo === 'fugge' && e[1] !== ctx.mio) sottotitolo(`${ctx.nome(e[1])} è salito sul Torrens`);
      else if (tipo === 'fiuto' && mostro) sottotitolo('Senti un odore… (segno rosso)');
      else if (tipo === 'colpo') audio.suona('sibilo', volDi(e[1], e[2], 200), panDi(e[1], e[2]));
    }
    // a fine partita o in pausa si libera il mouse
    if ((ctx.partita.finita || (window.Boss && Boss.attivo)) && bloccato()) document.exitPointerLock();
  }

  const tavolo = window.Arena.tavolo({
    id: 'isolation',
    nomeAzione: null,
    comandi: 'nessuno', // si gioca solo al computer
    clicAzione: false,
    obiettivo: 'punti',
    predici,
    istruzioni: (ctx) => (touch()
      ? 'Questo gioco si gioca al computer, con mouse e tastiera.'
      : sonoMostro(ctx)
        ? 'Clicca sulla scena per bloccare il mouse. WASD muoverti · mouse guardare · Maiusc scatto · clic attacca · E scendi o risali dalle grate e apri gli armadietti. I puntini sono i rumori che senti.'
        : 'Clicca sulla scena per bloccare il mouse. WASD muoversi · mouse guardare · Maiusc correre · C accucciarsi · Q (o tasto destro) rilevatore · F torcia · E usa · clic lanciafiamme · G razzo · spazio trattieni il respiro · Tab cambia chi guardi da morto.'),
    ruolo: (p, s, ctx) => (sonoMostro(ctx) ? 'sei lo XENOMORFO: prendili tutti' : 'riaccendi i generatori e scappa sul Torrens'),
    sottotitolo: (p, ctx) => (sonoMostro(ctx) ? 'Sei lo xenomorfo' : 'Sopravvivi'),
    statoGioco: (ctx, s) => {
      if (!s.s) return '';
      if (sonoMostro(ctx)) return s.s.a[4] ? 'Nei condotti' : 'A caccia';
      const u = mioUmano(s.s, ctx);
      if (!u) return '';
      if (u[5] & 64) return 'Sei salvo sul Torrens';
      if (!(u[5] & 1)) return 'Sei morto: guardi gli altri';
      if (u[5] & 2) return 'Nascosto nell\'armadietto';
      return s.s.sb ? 'Corri al Torrens!' : 'Riaccendi i generatori';
    },
    hud: () => '',
    fineRound: (p, s) => (s.s && s.s.u.some((u) => u[5] & 64) ? 'Qualcuno è salito sul Torrens!' : 'Lo xenomorfo ha vinto'),
    dopoTick,
    disegna,
    // il pulsante dello schermo intero
    sopra: () => '<div class="is-strato"><button type="button" class="is-bt is-pieno" data-is="schermo" title="Schermo intero">⛶</button></div>',
  });
  Object.assign(window.Tavoli, { isolation: tavolo });
})();
