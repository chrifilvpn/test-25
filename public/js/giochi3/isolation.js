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
      STAZ = M.OGGETTI.m.concat(M.OGGETTI.G);
      const m = await import('/js/isolation/motore.js');
      mot = await m.crea({ M, telefono: touch() });
    })().catch((e) => { errore = e; console.error('[isolation]', e); });
    return caricamento;
  }

  // ---------- i comandi ----------
  const io = { yaw: 0, pitch: 0, acc: false, corre: false, ril: false, respiro: false, c: [0, 0, 0, 0] };
  window.__isolationIO = io; // per le prove automatiche
  let inviato = '', ultimoInvio = 0, yawPronto = false, spettaIdx = 0, aiuto = false, partitaVista = null;
  // le impostazioni di chi gioca (restano nel browser): sensibilità del mouse, asse invertito, campo visivo, qualità
  // (sul telefono si parte senza ombre: la torcia con le ombre è la cosa che costa di più)
  const IMP_BASE = { sens: 1, inverti: false, fov: 72, qualita: touch() ? 'media' : 'alta' };
  const imp = (() => { try { return { ...IMP_BASE, ...JSON.parse(localStorage.getItem('isolation-impostazioni') || '{}') }; } catch (_) { return { ...IMP_BASE }; } })();
  const salvaImp = () => { try { localStorage.setItem('isolation-impostazioni', JSON.stringify(imp)); } catch (_) { /* niente */ } };
  window.__isolationImp = imp; // per le prove automatiche
  // porte, generatori, scorte e task arrivano solo quando cambiano: qui gli ultimi valori
  const SERVE = { 1: 'z', 2: 'k' }, NOMI_CHIAVI = { k: 'la tessera della Sicurezza', z: 'il fusibile dei laboratori Lorenz' };
  let presaColpi = 0, morteCausa = 0;
  const lenti = {};
  function completa(st) {
    if (!st) return st;
    for (const k of ['p', 'g', 'o', 'ts', 'uo', 'ob']) { if (st[k] !== undefined) lenti[k] = st[k]; else if (lenti[k] !== undefined) st[k] = lenti[k]; }
    return st;
  }
  // una partita nuova: si rimette tutto a posto (sguardo, chi guardi da morto, minigioco, aiuto)
  function nuovaPartita(ctx) {
    const id = ctx && ctx.partita && ctx.partita.extra ? ctx.partita.extra.idPartita : null;
    if (id === partitaVista) return;
    partitaVista = id; morteCausa = 0; presaColpi = 0; yawPronto = false; spettaIdx = 0; morteT = null; mg = null; predMio = null; aiuto = false;
    for (const k of Object.keys(lenti)) delete lenti[k];
  }
  const attiva = () => ctxA && ctxA.partita && ctxA.partita.gioco === 'isolation' && !ctxA.partita.finita && ctxA.stato && !ctxA.stato.spettatore;
  const bloccato = () => document.pointerLockElement && document.pointerLockElement.classList.contains('ar-tela');
  const bits = () => (io.corre ? BIT.corre : 0) | (io.acc ? BIT.accucciato : 0) | (io.ril ? BIT.rilevatore : 0) | (io.respiro ? BIT.respiro : 0);
  function invia(forza = false) {
    if (!attiva()) return;
    const ora = performance.now();
    const pacco = { yw: Math.round(io.yaw * 1000) / 1000, pt: Math.round(io.pitch * 100) / 100, k: bits(), c: io.c.slice() };
    if (io.tf) { pacco.tf = io.tf; io.tf = null; forza = true; } // il minigioco finito
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
    const k = SENS * imp.sens;
    io.yaw += e.movementX * k; io.pitch = Math.max(-1.35, Math.min(1.35, io.pitch - e.movementY * k * (imp.inverti ? -1 : 1)));
  });
  document.addEventListener('keydown', (e) => {
    if (!attiva() || (window.Boss && Boss.attivo) || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const k = e.key.toLowerCase();
    if (mg && !e.repeat) {
      if (mgTasto(k)) { e.preventDefault(); return; }
      if (k === 'escape') { premi(1); return; }
    }
    if (k === 'shift') io.corre = true;
    else if (k === 'c' && !e.repeat) io.acc = !io.acc;
    else if (k === 'q') io.ril = true;
    else if (k === ' ') io.respiro = true;
    else if (e.repeat) return;
    else if (k === 'e') premi(1);
    else if (k === 'f') premi(2);
    else if (k === 'g') premi(3);
    else if (k === 'tab') { e.preventDefault(); spettaIdx++; }
    else if (k === 'h') { aiuto = !aiuto; return; }
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
      // il minigioco aperto: il clic è per lui (il mouse resta libero)
      if (mg) { const r = tela.getBoundingClientRect(); mgClic((e.clientX - r.left) * mgW / r.width, (e.clientY - r.top) * mgH / r.height); return; }
      if (e.pointerType === 'touch') { toccoTela(e); return; }
      if (!bloccato()) { try { const p = tela.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* niente */ } return; }
      if (e.button === 2) { io.ril = true; invia(true); } else if (e.button === 0) { if (stanzaSpettatore()) spettaIdx++; else premi(0); }
    });
    const su = (e) => { if (e.pointerType === 'mouse' && e.button === 2) { io.ril = false; invia(true); } };
    tela.addEventListener('pointerup', su); tela.addEventListener('pointercancel', su);
  }
  // ---------- il telefono ----------
  // In orizzontale la partita prende tutto lo schermo (il riquadro diventa fisso sopra la pagina, la tela segue la forma
  // dello schermo): joystick a sinistra, il dito trascinato sul resto della scena gira la visuale, pulsanti a destra.
  // In verticale si chiede di girare il telefono. Con ⛶ si torna alla pagina (Esci, chat) e poi si rientra.
  const tel = { fuori: false, guarda: null, gx: 0, gy: 0, joy: null, respiro: null, res: 1.1, ema: 16, conta: 0, schermo: false };
  window.__isolationTel = tel; // per le prove automatiche
  const orizzontale = () => window.innerWidth > window.innerHeight;
  function pieno() {
    const si = touch() && !tel.fuori && orizzontale() && !!ctxA && !!ctxA.partita && ctxA.partita.gioco === 'isolation' && !ctxA.partita.finita;
    const box = document.querySelector('.ar-box');
    if (box && box.classList.contains('is-schermo-tel') !== si) box.classList.toggle('is-schermo-tel', si);
    if (document.documentElement.classList.contains('is-pagina-piena') !== si) document.documentElement.classList.toggle('is-pagina-piena', si);
    return si;
  }
  // la misura della tela in punti: al computer quella del server (1280×720); sul telefono a schermo pieno 480 punti di
  // altezza (le scritte restano leggibili) e la larghezza che serve a riempire lo schermo
  let vistaTel = false;
  function misura(p, si) {
    vistaTel = si;
    if (!si) return [p.W, p.H];
    return [Math.round(Math.max(640, Math.min(1400, 480 * window.innerWidth / Math.max(1, window.innerHeight)))), 480];
  }
  // sul telefono la prima volta che si tocca la scena si prova anche lo schermo intero vero (Android: spariscono le barre)
  function schermoVero() {
    if (tel.schermo || document.fullscreenElement || !document.fullscreenEnabled) return;
    tel.schermo = true;
    try {
      const p = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (p && p.then) p.then(() => { try { const o = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (o && o.catch) o.catch(() => {}); } catch (_) { /* niente */ } }).catch(() => {});
    } catch (_) { /* niente */ }
  }
  function toccoTela(e) {
    if (!pieno()) { tel.fuori = false; return; } // fuori dallo schermo pieno: toccare la scena ci rientra
    schermoVero();
    if (stanzaSpettatore()) { spettaIdx++; return; }
    if (tel.guarda !== null) return;
    tel.guarda = e.pointerId; tel.gx = e.clientX; tel.gy = e.clientY;
  }
  document.addEventListener('pointermove', (e) => {
    if (tel.joy === e.pointerId) {
      // il joystick spinto fino al bordo: si corre (lo xenomorfo scatta)
      const j = document.querySelector('.is-joy'); if (!j) return;
      const r = j.getBoundingClientRect(), d = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
      const corre = d > 43;
      if (corre !== io.corre) { io.corre = corre; j.classList.toggle('corre', corre); invia(true); }
      return;
    }
    if (tel.guarda !== e.pointerId || !attiva()) return;
    const k = 0.0062 * imp.sens, dx = e.clientX - tel.gx, dy = e.clientY - tel.gy;
    tel.gx = e.clientX; tel.gy = e.clientY;
    io.yaw += dx * k; io.pitch = Math.max(-1.35, Math.min(1.35, io.pitch - dy * k * (imp.inverti ? -1 : 1)));
  }, { passive: true });
  const lasciaDito = (e) => {
    if (tel.guarda === e.pointerId) tel.guarda = null;
    if (tel.joy === e.pointerId) { tel.joy = null; if (io.corre) { io.corre = false; invia(true); } const j = document.querySelector('.is-joy'); if (j) j.classList.remove('corre'); }
    if (tel.respiro === e.pointerId) { tel.respiro = null; io.respiro = false; invia(true); }
  };
  document.addEventListener('pointerup', lasciaDito); document.addEventListener('pointercancel', lasciaDito);
  // iOS accende l'audio solo alla fine di un tocco
  document.addEventListener('touchend', () => { if (attiva()) audio.avvia(); }, { passive: true });
  // i pulsanti sullo schermo (si premono al tocco, senza aspettare il "click")
  document.addEventListener('pointerdown', (e) => {
    if (!attiva() || !e.target.closest) return;
    if (e.target.closest('.is-joy')) { tel.joy = e.pointerId; audio.avvia(); return; } // il movimento lo fa il joystick comune (data-ar="joy")
    const b = e.target.closest('[data-ist]'); if (!b) return;
    e.preventDefault(); audio.avvia();
    const t = b.dataset.ist;
    if (t === 'fuoco') { if (stanzaSpettatore()) spettaIdx++; else premi(0); }
    else if (t === 'usa') premi(1);
    else if (t === 'torcia') premi(2);
    else if (t === 'razzo') premi(3);
    else if (t === 'acc') { io.acc = !io.acc; invia(true); }
    else if (t === 'ril') { io.ril = !io.ril; invia(true); }
    else if (t === 'respiro') { tel.respiro = e.pointerId; io.respiro = true; invia(true); }
    else if (t === 'aiuto') aiuto = !aiuto;
    else if (t === 'rientra') { tel.fuori = false; schermoVero(); }
    if (navigator.vibrate && (t === 'fuoco' || t === 'usa')) try { navigator.vibrate(12); } catch (_) { /* niente */ }
  }, { passive: false });
  // lo stato dei pulsanti (quali si vedono, quali sono accesi): si tocca il DOM solo quando cambia
  function aggiornaTocco(chi) {
    const el = document.querySelector('.is-tocco'); if (!el) return;
    const k = `${chi}|${io.acc ? 1 : 0}|${io.ril ? 1 : 0}|${aiuto ? 1 : 0}`;
    if (k === el._k) return; // (lo strato può essere ridisegnato: lo stato sta sull'elemento)
    el._k = k;
    el.dataset.chi = chi; el.classList.toggle('acc', io.acc); el.classList.toggle('ril', io.ril); el.classList.toggle('aiuto', aiuto);
  }
  // la risoluzione della scena 3D sul telefono si adatta: se i fotogrammi sono lenti si scende, se sono veloci si sale
  function risoluzione(dt) {
    tel.ema += (dt * 1000 - tel.ema) * 0.05;
    if (++tel.conta < 90) return;
    tel.conta = 0;
    if (tel.ema > 36 && tel.res > 0.55) tel.res = Math.max(0.55, tel.res - 0.15);
    else if (tel.ema < 21 && tel.res < 1.5) tel.res = Math.min(1.5, tel.res + 0.1);
  }
  // le scritte sullo schermo parlano di tasti: sul telefono diventano i pulsanti
  const SUL_TELEFONO = [
    [/premi E più volte per divincolarti · clic per bruciarlo/, 'tocca USA più volte per divincolarti · 🔥 per bruciarlo'],
    [/TIENI PREMUTO SPAZIO/, 'TIENI PREMUTO 😮'], [/spazio · trattieni/, '😮 · trattieni'],
    [/(^|\s)E (·|per) /g, '$1USA $2 '], [/(^|\s)C · /, '$1▼ · '], [/clic o Tab per cambiare/, 'tocca lo schermo per cambiare'],
    [/^Clic · attacca/, '⚔ · attacca'], [/Clicca o premi spazio quando/, 'Tocca quando'], [/Clicca i tasti o scrivi con la tastiera/, 'Tocca i tasti'],
    [/^Clicca un cavo/, 'Tocca un cavo'], [/WASD per muoverti/, 'joystick per muoverti'],
  ];
  const perTelefono = (t) => (touch() && typeof t === 'string' ? SUL_TELEFONO.reduce((a, [r, n]) => a.replace(r, n), t) : t);

  // le impostazioni: il pannello si apre col pulsante ⚙ (il mouse si libera), i valori restano nel browser
  function pannello(apri) {
    const P = document.querySelector('.is-pannello'); if (!P) return;
    P.hidden = !apri;
    document.querySelectorAll('[data-is="opzioni"].is-ingr').forEach((b) => b.setAttribute('aria-expanded', String(apri)));
    if (!apri) return;
    if (bloccato()) document.exitPointerLock();
    P.querySelector('#is-sens').value = imp.sens; P.querySelector('#is-inverti').checked = imp.inverti;
    P.querySelector('#is-fov').value = imp.fov; P.querySelector('#is-fov-n').textContent = `${imp.fov}°`; P.querySelector('#is-qualita').value = imp.qualita;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-is="opzioni"]');
    if (!b) return;
    const P = document.querySelector('.is-pannello');
    pannello(!!P && P.hidden);
  });
  const leggi = (e) => {
    const t = e.target; if (!t || !t.id || !t.id.startsWith('is-')) return;
    if (t.id === 'is-sens') imp.sens = Math.max(0.3, Math.min(2.5, Number(t.value) || 1));
    else if (t.id === 'is-inverti') imp.inverti = !!t.checked;
    else if (t.id === 'is-fov') { imp.fov = Math.max(60, Math.min(95, Number(t.value) || 72)); const n = document.getElementById('is-fov-n'); if (n) n.textContent = `${imp.fov}°`; }
    else if (t.id === 'is-qualita') imp.qualita = ['alta', 'media', 'bassa'].includes(t.value) ? t.value : 'alta';
    else return;
    salvaImp();
  };
  document.addEventListener('input', leggi); document.addEventListener('change', leggi);
  // il pulsante dello schermo intero (nello strato sopra la scena)
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-is="schermo"]');
    if (!b) return;
    if (touch()) { // sul telefono: si torna alla pagina (Esci, chat) o si rientra nello schermo pieno
      tel.fuori = !tel.fuori;
      if (tel.fuori && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    const box = document.querySelector('.ar-box');
    if (document.fullscreenElement) document.exitFullscreen(); else if (box && box.requestFullscreen) { box.classList.add('is-schermo'); box.requestFullscreen().catch(() => {}); }
  });

  // ---------- chi sono e dove sono ----------
  const mostriDi = (p) => (p && p.extra ? p.extra.mostri || (p.extra.mostro !== null && p.extra.mostro !== undefined ? [p.extra.mostro] : []) : []);
  const sonoMostro = (ctx) => mostriDi(ctx.partita).includes(ctx.mio);
  const survival = (ctx) => !!(ctx && ctx.partita && ctx.partita.extra && ctx.partita.extra.survival);
  // il mio xenomorfo nello stato del server (al: [x, y, yaw, anim, condotto, vel, stato, posto])
  const mioA = (s, ctx) => (s && s.al ? s.al.find((a) => a[7] === ctx.mio) : null);
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
    const alieni = (s.al || []).map((A, i) => {
      const B = pr && pr.al && pr.al[i] ? pr.al[i] : A;
      const salto = Math.hypot(A[0] - B[0], A[1] - B[1]) > 80;
      return { i, x: salto ? A[0] : B[0] + (A[0] - B[0]) * u, y: salto ? A[1] : B[1] + (A[1] - B[1]) * u, yaw: salto ? A[2] : lerpA(B[2], A[2], u), anim: A[3], inCondotto: !!A[4], vel: A[5], stato: A[6], posto: A[7] };
    });
    // i Working Joe e i facehugger: come lo xenomorfo (posizione a metà tra i due aggiornamenti)
    const mezzo = (lista, prima, salto) => (lista || []).map((q, i) => {
      const a = prima && prima[i] ? prima[i] : q, lontano = Math.hypot(q[0] - a[0], q[1] - a[1]) > salto;
      return { x: lontano ? q[0] : a[0] + (q[0] - a[0]) * u, y: lontano ? q[1] : a[1] + (q[1] - a[1]) * u, yaw: lontano ? q[2] : lerpA(a[2], q[2], u), anim: q[3], stato: q[3], vel: q[4] };
    });
    return { umani, alieni, alieno: alieni[0], joe: mezzo(s.j, pr && pr.j, 40), fh: mezzo(s.fh, pr && pr.fh, 60) };
  }

  // ---------- la previsione del movimento (stessi muri e velocità del server) ----------
  let predMio = null;
  function aperte(s) { const o = {}; if (s && s.p) s.p.forEach((v, i) => { o[i] = v % 100 > 7; }); return o; }
  const predici = {
    prendi(ultimo, ctx) {
      const s = completa(ultimo.s); if (!s || !s.u || !s.p) return null;
      if (sonoMostro(ctx)) { const a = mioA(s, ctx); if (!a || a[4] || a[6] === 'uccide' || (s.me && s.me[2])) return null; return { x: a[0], y: a[1] }; }
      const u = mioUmano(s, ctx);
      if (!u || !(u[5] & 1) || (u[5] & 2) || (u[5] & 64) || (u[5] & 2048) || (u[5] & 4096) || (u[5] & 8192) || (s.me && s.me[4] >= 0)) return null;
      return { x: u[1], y: u[2] };
    },
    muovi(pred, inp, dt, ctx, ultimo) {
      if (!M) return pred;
      const mostro = sonoMostro(ctx), s = ultimo.s;
      let v;
      if (mostro) v = (io.corre && s.me && s.me[0] > 5 ? VEL.alienoCorre : VEL.alieno) * (s.me && s.me[3] ? 1.25 : 1);
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
      joe: (v, p) => { for (let i = 0; i < 4; i++) setTimeout(() => ac && tono(v * 0.12, p, 150 + Math.random() * 60, 0.12, { tipo: 'square', f2: 120 }), i * 130); },
      fh: (v, p) => { soffio(v * 0.5, p, { f: 4500, q: 6, dur: 0.25, att: 0.01, f2: 2500 }); tono(v * 0.15, p, 1800, 0.2, { tipo: 'sawtooth', f2: 2600 }); },
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
  let ultimoT = performance.now(), passiT = 0, bipT = 0, battitoT = 0, morteT = null, ultimiPing = [], scossa = 0, stanzaVista = null, stanzaT = 0, messaggi = [];
  const grana = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const d = g.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } g.putImageData(d, 0, 0); return c; })();
  const NOMI_OGG = { b: 'batteria', f: 'carburante', r: 'razzo' };
  // survival: le stazioni delle task (come sul server: prima i terminali, poi i generatori)
  let STAZ = [];

  function sottotitolo(testo) { messaggi.push({ testo, t: performance.now() }); messaggi = messaggi.slice(-3); }

  function disegna(g, p, s, prima, u, ctx) {
    ctxA = ctx;
    const ora = performance.now(), dt = Math.min(0.1, (ora - ultimoT) / 1000); ultimoT = ora;
    const [W, H] = misura(p, vistaTel);
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
    nuovaPartita(ctx);
    const st = completa(s.s); if (!st || !st.u || !st.p || !st.g) return;
    if (prima && prima.s) completa(prima.s);
    const I = interpola(st, prima && prima.s, u);
    const mostro = sonoMostro(ctx), mio = ctx.mio;
    const mu = I.umani.find((x) => x.k === mio);
    const ex = p.extra || {};
    // la direzione iniziale: verso l'interno dell'atrio
    if (!yawPronto) { yawPronto = true; io.yaw = 0; io.pitch = 0; }
    // ---------- la telecamera ----------
    let cam, vistaDi = null, modo = mostro ? 'alieno' : 'umano';
    const morto = mu && !(mu.f & 1), salvo = mu && (mu.f & 64);
    if (morto && morteT === null) morteT = ora;
    if (!morto) morteT = null;
    const IA = mostro ? I.alieni.find((a) => a.posto === mio) || I.alieni[0] : null;
    I.mio = IA;
    if (mostro) {
      const pos = predMio && !IA.inCondotto ? predMio : IA;
      cam = { x: pos.x, y: pos.y, h: IA.anim === 'esce' ? 2.1 : 2.05, yaw: io.yaw, pitch: io.pitch, torcia: false, modo: 'alieno' };
      if (IA.inCondotto) modo = 'condotto';
    } else if (mu && !morto && !salvo) {
      const nascosto = mu.f & 2, sotto = mu.f & 256, acc = mu.f & 4;
      const pos = predMio && !nascosto ? predMio : mu;
      const passo = predMio ? Math.hypot(predMio.x - (predici._px || predMio.x), predMio.y - (predici._py || predMio.y)) : 0;
      if (predMio) { predici._px = predMio.x; predici._py = predMio.y; }
      fermoDa = passo > 0.05 ? 0 : fermoDa + dt;
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
      // il balzo ti butta giù (0-0.3 s), poi ti tiene fermo, il morso della seconda mascella arriva a 0.87 s
      const tm = (ora - morteT) / 1000, urto = Math.max(0, 1 - tm / 0.35), morso = tm > 0.85 && tm < 1.25 ? 1 - (tm - 0.85) / 0.4 : 0;
      const sc = urto * 0.08 + morso * 0.12 + (tm < 0.85 ? 0.006 : 0), ri = () => (Math.random() - 0.5) * sc;
      cam = { causa: morteCausa, x: mu.x, y: mu.y, h: Math.max(0.4, 1.6 - Math.min(1, tm / 0.3) * 0.85 - Math.max(0, tm - 1.2) * 0.3) + ri(), yaw: io.yaw + ri(), pitch: ri(), torcia: true, batteria: 100, modo: 'morte', rollio: Math.min(0.35, tm * 0.6) + ri() + (tm > 1.2 ? Math.min(0.5, (tm - 1.2) * 0.4) : 0) };
    } else {
      // si guarda un altro sopravvissuto o la mappa dall'alto (clic o Tab per cambiare)
      const vivi = I.umani.filter((x) => (x.f & 1) && !(x.f & 64) && x.k !== mio);
      if (spettaIdx % (vivi.length + 1) === vivi.length) {
        modo = 'mappa';
        cam = { x: M.COLS * M.T / 2, y: M.RIGHE * M.T / 2, h: 2, yaw: 0, pitch: 0, torcia: false, modo: 'umano' };
      } else if (vivi.length) {
        vistaDi = vivi[spettaIdx % (vivi.length + 1)];
        cam = { x: vistaDi.x, y: vistaDi.y, h: vistaDi.f & 4 ? 0.95 : 1.62, yaw: vistaDi.yaw, pitch: vistaDi.pitch, torcia: !!(vistaDi.f & 32), batteria: 100, modo: 'umano' };
      } else {
        const A0 = I.alieni[0];
        cam = { x: A0.x - Math.cos(A0.yaw) * 30, y: A0.y - Math.sin(A0.yaw) * 30, h: 2.4, yaw: A0.yaw, pitch: -0.2, torcia: false, modo: 'umano' };
      }
    }
    // ---------- suoni dello xenomorfo e degli eventi ----------
    const altri = I.alieni.filter((a) => a !== IA);
    const AV = altri.length ? altri.reduce((a, b) => (Math.hypot(a.x - cam.x, a.y - cam.y) <= Math.hypot(b.x - cam.x, b.y - cam.y) ? a : b)) : null;
    const dA = AV ? Math.hypot(AV.x - cam.x, AV.y - cam.y) : Infinity;
    const panDi = (x, y) => Math.sin(angolo(Math.atan2(y - cam.y, x - cam.x) - cam.yaw)) * 0.8;
    const volDi = (x, y, r = 250) => Math.max(0, 1 - Math.hypot(x - cam.x, y - cam.y) / r);
    if (!mostro && AV && !AV.inCondotto && AV.vel > 4) {
      passiT -= dt * (AV.vel > 40 ? 3 : 1.6);
      if (passiT <= 0) { passiT = 1; audio.suona('passo', volDi(AV.x, AV.y, 220) * (AV.vel > 40 ? 1 : 0.6), panDi(AV.x, AV.y)); if (dA < 60) scossa = Math.max(scossa, 0.3); }
    }
    // la tensione (musica e battito): vicinanza dello xenomorfo visibile
    const altriPericoli = mostro ? 0 : Math.max(0, ...I.joe.filter((J) => J.anim !== 'brucia').map((J) => Math.max(0, 1 - Math.hypot(J.x - cam.x, J.y - cam.y) / 90) * 0.7), ...I.fh.map((F) => Math.max(0, 1 - Math.hypot(F.x - cam.x, F.y - cam.y) / 120)));
    const tensione = Math.max(altriPericoli, mostro || !AV ? 0 : AV.inCondotto ? Math.max(0, 1 - dA / 120) * 0.4 : Math.max(0, 1 - dA / 200) * (AV.stato === 'caccia' ? 1.3 : 0.8));
    audio.ambiente(attiva() && ctx.partita.stato.fase === 'gioco', tensione);
    if (!mostro && tensione > 0.45 && mu && (mu.f & 1)) { battitoT -= dt * (0.8 + tensione * 1.4); if (battitoT <= 0) { battitoT = 1; audio.suona('battito', Math.min(1, tensione)); } }
    // ---------- la scena 3D ----------
    const umani = I.umani.map((x) => ({ ...x, io: x.k === mio && !mostro && !morto, nascondi: vistaDi && x.k === vistaDi.k }));
    // la risoluzione della scena: sul telefono quella che regge (vedi risoluzione), in punti dello schermo
    if (touch()) risoluzione(dt);
    const qualita = (touch() ? tel.res / Math.min(window.devicePixelRatio || 1, 2) : Math.min(1, 1.3 / (window.devicePixelRatio || 1))) * (imp.qualita === 'bassa' ? 0.6 : 1);
    if (!cam.fov && cam.modo !== 'morte') cam.fov = imp.fov;
    const w = Math.max(320, Math.round(g.canvas.width * qualita)), h = Math.max(180, Math.round(g.canvas.height * qualita));
    const V = { w, h, dt, cam, umani, alieni: I.alieni, porte: st.p, gen: st.g, raccolti: st.o, razzi: st.fl, sbloccato: !!st.sb, nascondiXeno: IA ? IA.i : -1, ombre: imp.qualita === 'alta', joe: I.joe, fh: I.fh, uova: st.uo, ob: st.ob };
    if (modo === 'condotto') disegnaCondotti(g, W, H, st, I, ctx);
    else if (modo === 'mappa') disegnaMappa(g, W, H, st, I, ctx);
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
    if (mostro) hudAlieno(g, W, H, st, I, ctx, modo, cam);
    else hudUmano(g, W, H, st, I, ctx, { mu, morto, salvo, vistaDi, tensione, ora, cam });
    // il minigioco della task (survival): si apre quando il server me lo assegna, si chiude quando finisce
    const task = !mostro && st.me && st.me[5];
    if (task && (!mg || mg.s !== task[0] || mg.seme !== task[3])) apriMinigioco(task);
    if (!task && mg) mg = null;
    if (mg) {
      disegnaMinigioco(g, W, H);
      // il pericolo si vede anche durante la task: bordo rosso che pulsa e un avviso
      if (tensione > 0.3) {
        const k = Math.min(1, tensione) * (0.55 + 0.45 * Math.sin(ora / 110));
        g.save(); g.strokeStyle = `rgba(255,40,30,${k})`; g.lineWidth = 18; g.strokeRect(9, 9, W - 18, H - 18); g.restore();
        testo(g, '⚠ LO XENOMORFO È VICINO · E per lasciare la task', W / 2, Math.min(H - 8, H / 2 + 260), { size: 20, al: 'center', col: '#ff7060', peso: 700 });
      }
    }
    // i messaggi in basso (eventi)
    messaggi = messaggi.filter((m) => ora - m.t < 4000);
    g.textAlign = 'center'; g.font = '600 20px "Courier New", monospace';
    messaggi.forEach((m, i) => { g.globalAlpha = Math.min(1, (4000 - (ora - m.t)) / 600); g.fillStyle = '#d8f0d8'; g.fillText(m.testo, W / 2, H - 150 - (messaggi.length - 1 - i) * 26); });
    g.globalAlpha = 1;
    if (touch()) aggiornaTocco(mg ? 'mg' : morto || salvo || (!mostro && !mu) ? 'morto' : mostro ? (modo === 'condotto' ? 'condotto' : 'alieno') : mu.f & 2 ? 'nascosto' : 'umano');
    if (aiuto) disegnaAiuto(g, W, H, mostro, survival(ctx));
    else if (!touch() && attiva()) testo(g, 'H · comandi', W - 28, H - 16, { size: 13, al: 'right', col: 'rgba(210,230,210,.6)' });
    // il telefono fuori dallo schermo pieno: in verticale si chiede di girarlo, in orizzontale si rientra toccando
    if (touch() && attiva() && !vistaTel) {
      g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 0, W, H);
      testo(g, orizzontale() ? '▶ Tocca qui per tornare a giocare' : '📱 Gira il telefono in orizzontale', W / 2, H / 2 - 10, { size: 54, al: 'center', col: '#e8f6e8', peso: 700 });
      testo(g, orizzontale() ? 'la partita va avanti anche mentre leggi la chat' : 'la stazione si gioca a schermo pieno, col joystick e i pulsanti', W / 2, H / 2 + 50, { size: 30, al: 'center', col: '#b8d8b8' });
    }
    // clic per giocare (mouse non bloccato)
    if (!touch() && attiva() && !bloccato() && ctx.partita.stato.fase === 'gioco' && !morto && !salvo && !mg && !aiuto) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(W / 2 - 300, H / 2 - 42, 600, 94);
      g.textAlign = 'center';
      g.fillStyle = '#e8f6e8'; g.font = '700 22px "Courier New", monospace'; g.fillText('Clicca qui per giocare', W / 2, H / 2 - 8);
      g.font = '15px "Courier New", monospace';
      g.fillText('il mouse serve a guardarsi intorno · Esc per liberarlo', W / 2, H / 2 + 14);
      g.fillText('H · comandi    ⚙ · impostazioni', W / 2, H / 2 + 36);
    }
    g.restore();
  }
  // H: i comandi sopra la scena
  function disegnaAiuto(g, W, H, mostro, surv) {
    const righe = touch() ? (mostro
      ? ['joystick · muoverti (fino al bordo: scatto)', 'dito sulla scena · guardare', '⚔ · attacca davanti a te', 'USA · grate dei condotti, armadietti e casse', surv ? 'chi sta fermo non lo vedi: colpisci dove senti i rumori' : 'i rumori sono segni sullo schermo e nuvolette sulla minimappa']
      : ['joystick · muoverti (fino al bordo: correre, fa rumore)', 'dito sulla scena · guardare', '🔥 · lanciafiamme', 'USA · armadietti, casse, botole, ' + (surv ? 'task' : 'generatori'), '▼ · accucciarti   📡 · rilevatore', '🔦 · torcia   🎆 · razzo (attira lo xenomorfo)', '😮 · trattieni il respiro (nascosto)', 'da morto: tocca lo schermo per cambiare chi guardi', '⛶ · torna alla pagina (chat, Esci)'])
      : mostro
      ? ['WASD · muoverti', 'mouse · guardare', 'Maiusc · scatto (consuma il fiato)', 'clic · attacca davanti a te', 'E · entra o scendi dalle grate dei condotti', 'E · apri armadietti e casse', surv ? 'chi sta fermo non lo vedi: colpisci dove senti i rumori' : 'i rumori sono segni sullo schermo e nuvolette sulla minimappa']
      : ['WASD · muoverti', 'mouse · guardare', 'Maiusc · correre (fa rumore)', 'C · accucciarti (passi sotto scrivanie e letti)', 'Q o tasto destro · rilevatore di movimento', 'F · torcia', 'E · usa: armadietti, casse, botole, ' + (surv ? 'task' : 'generatori'), 'clic · lanciafiamme', 'G · lancia un razzo (attira lo xenomorfo)', 'spazio · trattieni il respiro (nascosto)', 'Tab · da morto cambi chi guardi o la mappa', 'preso da un Working Joe: E più volte per liberarti'];
    const w = 560, h = 70 + righe.length * 26, x = W / 2 - w / 2, y = H / 2 - h / 2;
    g.save(); g.fillStyle = 'rgba(6,12,8,.9)'; g.strokeStyle = '#6fae6a'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.stroke();
    testo(g, touch() ? 'COMANDI · ? per chiudere' : 'COMANDI · H per chiudere', W / 2, y + 36, { size: 18, al: 'center', col: '#b8f0b0' });
    righe.forEach((r, i) => testo(g, r, x + 30, y + 70 + i * 26, { size: 15 }));
    g.restore();
  }
  const bob = { fase: 0, amp: 0 };
  let fermoDa = 0;

  // ---------- lo schermo del sopravvissuto ----------
  function testo(g, t, x, y, { size = 18, col = '#cfe8cf', al = 'left', peso = 600 } = {}) { t = perTelefono(t); g.font = `${peso} ${size}px "Courier New", monospace`; g.textAlign = al; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(t, x + 1, y + 1); g.fillStyle = col; g.fillText(t, x, y); }
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
    // preso per il collo da un Working Joe: la vista si stringe, premi E
    if (mu && (mu.f & 8192)) {
      const k = 0.55 + 0.25 * Math.sin(ora / 90);
      const rg = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, H * 0.7); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(20,0,0,${k + 0.3})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      testo(g, 'UN WORKING JOE TI STRINGE IL COLLO', W / 2, H * 0.24, { size: 28, al: 'center', col: '#ff8060', peso: 700 });
      testo(g, 'premi E più volte per divincolarti · clic per bruciarlo', W / 2, H * 0.24 + 32, { size: 18, al: 'center', col: '#ffe0d0' });
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W / 2 - 150, H * 0.24 + 54, 300, 16); g.fillStyle = '#f0c040'; g.fillRect(W / 2 - 148, H * 0.24 + 56, 296 * Math.min(1, presaColpi / 6), 12);
    } else presaColpi = 0;
    // nel passaggio di servizio: buio, si striscia
    if (mu && (mu.f & 2048)) {
      g.fillStyle = 'rgba(2,2,3,.97)'; g.fillRect(0, 0, W, H);
      testo(g, 'Strisci nel passaggio di servizio…', W / 2, H / 2, { size: 24, al: 'center', col: '#c0c8b8' });
    }
    // obiettivo e luogo
    if (st.ts) {
      testo(g, st.sb ? '▶ FUGGI! IL TORRENS È ALL\'ATTRACCO (IN FONDO A EST)' : `▶ TASK DI SQUADRA  ${st.ts[0]}/${st.ts[1]}`, 28, 40, { size: 18, col: st.sb ? '#ffb070' : '#cfe8cf' });
      if (!st.sb && mu && (mu.f & 1)) {
        // la task pronta più vicina: freccia e distanza
        let best = null, bd = Infinity;
        STAZ.forEach((t, i) => { if (st.ts[2][i] !== '1') return; const c = M.centro(t), d = Math.hypot(c.x - cam.x, c.y - cam.y); if (d < bd) { bd = d; best = c; } });
        if (best && !(mu.f & 4096)) {
          freccia(g, 46, 70, best, cam, `task pronta a ${(bd / 10).toFixed(0)} m (luce gialla)`);
        } else testo(g, 'nessuna task pronta: aspetta che i terminali si riavviino', 40, 76, { size: 15, col: '#a8b8a8' });
      }
      // fermo = invisibile agli xenomorfi
      if (mu && (mu.f & 1) && !(mu.f & 2) && fermoDa > 0.5) testo(g, '◉ FERMO: GLI XENOMORFI NON TI VEDONO', 28, 104, { size: 15, col: '#9fd0ff' });
    } else {
      const acc = st.g.filter((x) => x >= 100).length;
      testo(g, st.sb ? '▶ RAGGIUNGI IL TORRENS (ATTRACCO, IN FONDO A EST)' : `▶ RIACCENDI I GENERATORI  ${acc}/3`, 28, 40, { size: 18 });
      const nomi = ['Medicina', 'Ingegneria', 'Comunicazioni'];
      const manca = (i) => (st.ob && SERVE[i] && !st.ob[SERVE[i] === 'k' ? 0 : 1] ? SERVE[i] : null);
      if (!st.sb) st.g.forEach((x, i) => testo(g, `${x >= 100 ? '■' : '□'} ${nomi[i]}${x > 0 && x < 100 ? ` ${x}%` : ''}${x < 100 && manca(i) ? ` · serve ${manca(i) === 'k' ? 'la tessera' : 'il fusibile'}` : ''}`, 40, 66 + i * 22, { size: 15, col: x >= 100 ? '#8fe08f' : manca(i) ? '#d0b080' : '#a8b8a8' }));
      // la freccia verso il generatore spento più vicino
      if (!st.sb && mu && (mu.f & 1) && !(mu.f & 2) && !(st.me && st.me[4] >= 0)) {
        let best = null, bd = Infinity, bi = 0;
        M.OGGETTI.G.forEach((t, i) => { if (st.g[i] >= 100 || manca(i)) return; const c = M.centro(t), d = Math.hypot(c.x - cam.x, c.y - cam.y); if (d < bd) { bd = d; best = c; bi = i; } });
        if (best) freccia(g, 46, 144, best, cam, `generatore (${nomi[bi]}) a ${(bd / 10).toFixed(0)} m`);
        else {
          // restano solo generatori che vogliono un oggetto: la freccia va all'oggetto
          const c = M.OGGETTI.G.map((_, i) => (st.g[i] < 100 ? manca(i) : null)).find(Boolean);
          if (c) { const o = M.centro(M.OGGETTI[c][0]), d = Math.hypot(o.x - cam.x, o.y - cam.y); freccia(g, 46, 144, o, cam, `${NOMI_CHIAVI[c]} a ${(d / 10).toFixed(0)} m`); }
        }
      }
    }
    // la fuga: la freccia verso l'attracco
    if (st.sb && mu && (mu.f & 1) && !(mu.f & 2) && !(mu.f & 64)) {
      const e = M.centro(M.OGGETTI.E[0]), d = Math.hypot(e.x - cam.x, e.y - cam.y);
      freccia(g, 46, 70, e, cam, `attracco del Torrens a ${(d / 10).toFixed(0)} m`);
    }
    const stanza = M.stanzaDi(cam);
    const nome = stanza ? stanza.nome : 'Corridoio di servizio';
    if (nome !== stanzaVista) { stanzaVista = nome; stanzaT = ora; }
    if (ora - stanzaT < 4000) { g.globalAlpha = Math.min(1, (4000 - (ora - stanzaT)) / 800); testo(g, nome.toUpperCase(), W / 2, 84, { size: 22, al: 'center', col: '#e6efe0' }); g.globalAlpha = 1; }
    const m = Math.floor(st.tr / 60), sec = String(st.tr % 60).padStart(2, '0');
    testo(g, `${m}:${sec}`, W - (vistaTel ? 215 : 150), 40, { size: 20, al: 'right' });
    if (morto || salvo) {
      if (morto && morteT !== null && ora - morteT < 3200) {
        const k = (ora - morteT) / 3200, tm = (ora - morteT) / 1000;
        g.fillStyle = `rgba(90,0,0,${0.1 + k * 0.5})`; g.fillRect(0, 0, W, H);
        // il lampo rosso del morso, poi il buio
        if (tm > 0.85 && tm < 1.5) { g.fillStyle = `rgba(200,0,0,${0.75 * (1 - (tm - 0.85) / 0.65)})`; g.fillRect(0, 0, W, H); }
        if (tm > 1.3) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (tm - 1.3) * 0.7)})`; g.fillRect(0, 0, W, H); }
        if (tm < 1.3) return; // prima il morso, poi la scritta
      }
      testo(g, morto ? ['SEI MORTO', 'STRANGOLATO DA UN WORKING JOE', 'PRESO DA UN FACEHUGGER'][morteCausa] || 'SEI MORTO' : 'SEI SALVO: SEI SUL TORRENS', W / 2, H / 2 - 60, { size: 40, al: 'center', col: morto ? '#ff6a5a' : '#9fffa0', peso: 700 });
      testo(g, vistaDi ? `Stai guardando ${ctx.nome(vistaDi.k)} · clic o Tab per cambiare` : 'Mappa della stazione · clic o Tab per cambiare', W / 2, H - 40, { size: 16, al: 'center' });
      return;
    }
    if (!mu) return;
    // inventario
    const me = st.me || [100, 0, 0, 100, -1];
    const bx = 28, by = vistaTel ? 178 : H - 92; // sul telefono in basso a sinistra c'è il joystick
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
    if (me[4] >= 0 && !st.ts) {
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
  // una freccia gialla che ruota con la visuale verso un punto della stazione, con la scritta accanto
  function freccia(g, x, y, verso, cam, scritta) {
    const a = angolo(Math.atan2(verso.y - cam.y, verso.x - cam.x) - io.yaw);
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#f0c040'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -8); g.lineTo(-4, 0); g.lineTo(-8, 8); g.closePath(); g.fill(); g.restore();
    testo(g, scritta, x + 20, y + 6, { size: 15, col: '#e8d8a0' });
  }
  // come il server: il generatore o l'armadietto davanti
  function suggerimento(st, mu, cam) {
    if (mu.f & 2 || mu.f & 2048 || mu.f & 4096) return null;
    const vicino = (lista, r) => {
      let best = null, bd = r;
      lista.forEach((t, i) => { const c = M.centro(t), d = Math.hypot(c.x - cam.x, c.y - cam.y), a = Math.abs(angolo(Math.atan2(c.y - cam.y, c.x - cam.x) - io.yaw)); if (d < bd && (a < 1.1 || d < 18)) { bd = d; best = i; } });
      return best;
    };
    if (st.ts) {
      const si = vicino(STAZ, 32);
      if (si !== null && !st.sb) return st.ts[2][si] === '1' ? 'E · fai la task' : st.ts[2][si] === '2' ? 'qualcuno sta già facendo questa task' : 'terminale in riavvio: torna più tardi';
    } else {
      const gi = vicino(M.OGGETTI.G, 30);
      if (gi !== null && st.g[gi] < 100) {
        const c = st.ob && SERVE[gi] && !st.ob[SERVE[gi] === 'k' ? 0 : 1] ? SERVE[gi] : null;
        return c ? `serve ${NOMI_CHIAVI[c]}` : st.me && st.me[4] === gi ? null : 'E · riaccendi il generatore';
      }
    }
    if (M.OGGETTI.P.some((t) => { const c = M.centro(t); return Math.hypot(c.x - cam.x, c.y - cam.y) < 14; })) return 'E · entra nel passaggio di servizio';
    const ni = vicino(M.NASCONDIGLI, 26);
    if (ni !== null) return M.cella(...M.NASCONDIGLI[ni]) === 'c' ? 'E · nasconditi nella cassa' : 'E · nasconditi nell\'armadietto';
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
    for (const A of I.alieni) if (A.vel > 3) cose.push(A);
    for (const e of I.joe.concat(I.fh)) if (e.vel > 3) cose.push(e);
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
    if (ora - bipT >= 1000) { bipT = ora; audio.suona('bip', 1, 0, 900); if (vicino < Infinity) setTimeout(() => audio.suona('ping', 1, 0, 1800 - Math.min(1200, vicino * 4)), 160); }
  }

  // ---------- lo schermo dello xenomorfo ----------
  // la minimappa intorno a sé (sempre visibile, in alto a destra): muri, porte, grate, gli altri xenomorfi e i rumori
  // sentiti come nuvolette di gas rosso che svaniscono. Ruota con la visuale (davanti è in alto)
  function minimappa(g, W, H, st, I, cam) {
    const R = vistaTel ? 96 : 120, cx = W - R - 26, cy = R + (vistaTel ? 70 : 84), RAGGIO = 230, k = R / RAGGIO; // sul telefono un po' più piccola (sotto ci sono i pulsanti)
    g.save();
    g.fillStyle = 'rgba(6,8,14,.82)'; g.beginPath(); g.arc(cx, cy, R + 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(150,170,220,.5)'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(-io.yaw - Math.PI / 2); g.scale(k, k); g.translate(-cam.x, -cam.y);
    const [tx, ty] = M.quadretto(cam), n = Math.ceil(RAGGIO / M.T) + 1;
    for (let y = ty - n; y <= ty + n; y++) for (let x = tx - n; x <= tx + n; x++) {
      const c = M.cella(x, y); if (c === '#') continue;
      g.fillStyle = c === 'D' ? '#2a3a52' : '#18243a'; g.fillRect(x * M.T, y * M.T, M.T + 0.6, M.T + 0.6);
      if ('LmcG'.includes(c)) { g.fillStyle = '#26334a'; g.fillRect(x * M.T + 5, y * M.T + 5, M.T - 10, M.T - 10); }
    }
    for (const t of M.OGGETTI.V) { const c = M.centro(t); g.strokeStyle = '#7fb0ff'; g.lineWidth = 3 / k; g.strokeRect(c.x - 7, c.y - 7, 14, 14); }
    // i rumori: nuvolette rosse che si allargano e svaniscono
    for (const [x, y, tipo, t] of st.pi || []) {
      const v = Math.max(0, Math.min(1, (t || 20) / 30)), r = (10 + (1 - v) * 16) / k;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = tipo === 'fiuto' ? '255,40,40' : tipo === 'task' || tipo === 'generatore' ? '255,70,30' : '230,30,30';
      gr.addColorStop(0, `rgba(${col},${0.85 * v})`); gr.addColorStop(0.6, `rgba(${col},${0.4 * v})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // gli altri xenomorfi (compagni di caccia)
    for (const A of I.alieni) if (A !== I.mio) { g.fillStyle = A.inCondotto ? '#6070a0' : '#b0c0ff'; g.beginPath(); g.arc(A.x, A.y, 5 / k, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // io al centro, rivolto in alto
    g.fillStyle = '#e8eeff'; g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx - 6, cy + 6); g.lineTo(cx + 6, cy + 6); g.closePath(); g.fill();
    testo(g, 'RUMORI', cx, cy + R + 22, { size: 12, al: 'center', col: '#b0b8d0' });
  }
  function hudAlieno(g, W, H, st, I, ctx, modo, cam) {
    const surv = survival(ctx);
    // la vista dello xenomorfo: un velo freddo e i bordi deformati
    if (modo !== 'condotto') {
      g.fillStyle = 'rgba(40,60,120,.12)'; g.fillRect(0, 0, W, H);
      // classica: i rumori sentiti anche come segni sullo schermo (nella survival solo sulla minimappa)
      if (!surv) for (const [x, y, tipo] of st.pi || []) {
        const p = mot.proietta(x, y, 1.2);
        const col = tipo === 'fiuto' ? '#ff4040' : tipo === 'corsa' || tipo === 'generatore' || tipo === 'razzo' ? '#ffb040' : '#f0f0f0';
        const d = Math.hypot(x - cam.x, y - cam.y) / 10;
        if (p && p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1) {
          const r = 10 + 6 * Math.sin(performance.now() / 120);
          g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(p.x * W, p.y * H, r, 0, Math.PI * 2); g.stroke();
          testo(g, `${tipo === 'fiuto' ? 'ODORE' : tipo.toUpperCase()} ${d.toFixed(0)}m`, p.x * W, p.y * H - r - 6, { size: 13, al: 'center', col });
        }
      }
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
      const me = st.me || [100, 0, 0];
      const fy = vistaTel ? 150 : H - 50; // sul telefono in basso a sinistra c'è il joystick
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(28, fy, 204, 16); g.fillStyle = me[0] < 20 ? '#a04040' : '#c0c8e0'; g.fillRect(30, fy + 2, 200 * me[0] / 100, 12);
      testo(g, 'FIATO', 28, fy - 8, { size: 13, col: '#c0c8e0' });
      if (me[2]) { g.fillStyle = 'rgba(255,120,40,.18)'; g.fillRect(0, 0, W, H); testo(g, surv ? '🔥 STORDITO DAL FUOCO' : '🔥 BRUCIATO: NON PUOI ATTACCARE', W / 2, H / 2 + 110, { size: 22, al: 'center', col: '#ff9050' }); }
      const pr = suggerimentoAlieno(I);
      testo(g, pr || (me[1] ? '' : 'Clic · attacca davanti a te'), W / 2, H / 2 + 70, { size: 18, al: 'center', col: '#e0e6f0' });
      minimappa(g, W, H, st, I, cam);
    }
    const vivi = I.umani.filter((u) => (u.f & 1) && !(u.f & 64)).length;
    const titolo = surv ? `▶ SEI ${I.alieni.length > 1 ? 'UNO XENOMORFO' : 'LO XENOMORFO'} · TASK DEI SOPRAVVISSUTI ${st.ts ? `${st.ts[0]}/${st.ts[1]}` : ''}` : `▶ SEI LO XENOMORFO · PREDE RIMASTE: ${vivi}`;
    testo(g, titolo, 28, 40, { size: 18, col: '#d0d8f0' });
    if (surv && modo !== 'condotto') testo(g, 'Chi sta fermo non lo vedi: colpisci dove senti i rumori', 28, 64, { size: 14, col: '#9aa6c8' });
    const m = Math.floor(st.tr / 60), sec = String(st.tr % 60).padStart(2, '0');
    testo(g, `${m}:${sec}`, W - (vistaTel ? 215 : 150), 40, { size: 20, al: 'right', col: '#d0d8f0' });
    if (st.sb) testo(g, '⚠ IL TORRENS È ATTRACCATO: FERMALI ALL\'ATTRACCO', 28, surv ? 88 : 66, { size: 15, col: '#ff8070' });
  }
  function suggerimentoAlieno(I) {
    const A = I.mio; if (!A) return null;
    const v = M.OGGETTI.V.map(M.centro).find((c) => Math.hypot(c.x - A.x, c.y - A.y) < 16);
    if (v) return 'E · entra nel condotto';
    const l = M.NASCONDIGLI.find((t) => { const c = M.centro(t); return Math.hypot(c.x - A.x, c.y - A.y) < 30 && Math.abs(angolo(Math.atan2(c.y - A.y, c.x - A.x) - io.yaw)) < 0.9; });
    if (l) return M.cella(l[0], l[1]) === 'c' ? 'E · apri la cassa' : 'E · apri l\'armadietto';
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
    // le grate: rosse e più grandi quelle vicine a un rumore sentito (lì conviene scendere)
    for (const t of M.OGGETTI.V) {
      const c = M.centro(t), calda = (st.pi || []).some(([x, y]) => Math.hypot(x - c.x, y - c.y) < 90);
      g.strokeStyle = calda ? '#ff6050' : '#7fb0ff'; g.lineWidth = calda ? 3 : 2; const r = calda ? 10 : 7;
      g.strokeRect(ox + c.x * k - r, oy + c.y * k - r, r * 2, r * 2);
    }
    for (const [x, y, tipo, t] of st.pi || []) {
      const v = Math.max(0, Math.min(1, (t || 20) / 30)), r = 8 + (1 - v) * 10;
      const gr = g.createRadialGradient(ox + x * k, oy + y * k, 0, ox + x * k, oy + y * k, r);
      gr.addColorStop(0, `rgba(255,${tipo === 'fiuto' ? 30 : 60},30,${0.9 * v})`); gr.addColorStop(1, 'rgba(255,40,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(ox + x * k, oy + y * k, r, 0, Math.PI * 2); g.fill();
    }
    for (const B of I.alieni) if (B !== I.mio) { g.fillStyle = '#8090c0'; g.beginPath(); g.arc(ox + B.x * k, oy + B.y * k, 5, 0, Math.PI * 2); g.fill(); }
    const A = I.mio;
    g.fillStyle = '#e0e8ff'; g.beginPath(); g.arc(ox + A.x * k, oy + A.y * k, 7, 0, Math.PI * 2); g.fill();
    const v = M.OGGETTI.V.map(M.centro).reduce((a, b) => (Math.hypot(a.x - A.x, a.y - A.y) <= Math.hypot(b.x - A.x, b.y - A.y) ? a : b));
    const vicino = Math.hypot(v.x - A.x, v.y - A.y) < 40;
    testo(g, 'NEI CONDOTTI · WASD per muoverti sopra i soffitti', W / 2, 72, { size: 16, al: 'center', col: '#c0d0f0' });
    testo(g, vicino ? 'E · scendi da questa grata' : 'avvicinati a una grata (quadrati azzurri) per scendere', W / 2, H - 20, { size: 16, al: 'center', col: vicino ? '#ffffff' : '#8090b0' });
  }

  // da morti o salvi: la pianta della stazione con i sopravvissuti (verdi), gli xenomorfi (rossi), generatori e uscita
  function disegnaMappa(g, W, H, st, I) {
    g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H);
    const k = Math.min((W - 80) / (M.COLS * M.T), (H - 140) / (M.RIGHE * M.T)), ox = (W - M.COLS * M.T * k) / 2, oy = 90;
    for (let ty = 0; ty < M.RIGHE; ty++) for (let tx = 0; tx < M.COLS; tx++) {
      const c = M.griglia[ty][tx]; if (c === '#') continue;
      g.fillStyle = c === 'D' ? '#1d2c3c' : 'LmcG'.includes(c) ? '#22324a' : '#142030'; g.fillRect(ox + tx * M.T * k, oy + ty * M.T * k, M.T * k + 0.5, M.T * k + 0.5);
    }
    const punto = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(ox + x * k, oy + y * k, r, 0, Math.PI * 2); g.fill(); };
    M.OGGETTI.G.forEach((t, i) => { const c = M.centro(t); punto(c.x, c.y, 6, st.g[i] >= 100 ? '#8fe08f' : st.g[i] > 0 ? '#f0c040' : '#a04030'); });
    for (const t of M.OGGETTI.E) { const c = M.centro(t); g.fillStyle = st.sb ? 'rgba(120,255,140,.35)' : 'rgba(255,80,60,.25)'; g.fillRect(ox + (c.x - M.T / 2) * k, oy + (c.y - M.T / 2) * k, M.T * k, M.T * k); }
    for (const u of I.umani) if ((u.f & 1) && !(u.f & 64)) { punto(u.x, u.y, 5, u.f & 2 ? '#6a9a6a' : '#9fffa0'); testo(g, ctxA.nome(u.k), ox + u.x * k, oy + u.y * k - 9, { size: 11, al: 'center', col: '#cfe8cf' }); }
    for (const A of I.alieni) punto(A.x, A.y, 6, A.inCondotto ? '#803030' : '#ff4a3a');
    for (const J of I.joe) punto(J.x, J.y, 5, '#ff9a30');
    for (const F of I.fh) punto(F.x, F.y, 3, '#f0e0a0');
    if (st.uo) M.OGGETTI.U.forEach((t, i) => { if (st.uo[i] !== '2') { const c = M.centro(t); punto(c.x, c.y, 3, '#8a7a50'); } });
    if (st.ob) [['k', 0, '#4aa0ff'], ['z', 1, '#60ff80']].forEach(([c, i, col]) => { if (!st.ob[i]) { const o = M.centro(M.OGGETTI[c][0]); punto(o.x, o.y, 5, col); } });
    testo(g, 'LA STAZIONE · verdi i sopravvissuti, rossi gli xenomorfi, arancioni i Working Joe', W / 2, 64, { size: 16, al: 'center', col: '#c0d0f0' });
  }

  // ---------- i minigiochi delle task (survival) ----------
  // Si aprono quando il server dice che sto facendo una task (me[5] = [stazione, tipo, difficoltà, seme]); il seme
  // decide colori, codici e sequenze. Finito il minigioco si manda [stazione, seme]: il server controlla il resto
  const TIPI = ['fili', 'codice', 'sequenza', 'taratura'];
  const COL_FILI = ['#e04040', '#40a0ff', '#f0d040', '#50d060', '#d060f0', '#ff9030'];
  let mg = null, mgW = 1280, mgH = 720;
  window.__isolationMg = () => mg; // per le prove automatiche
  function casoDa(seme) { let a = seme >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mescola = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function apriMinigioco(t) {
    const [s, ti, diff, seme] = t, r = casoDa(seme), tipo = TIPI[ti] || 'fili';
    mg = { s, tipo, diff, seme, r, t0: performance.now(), err: 0, fatto: false };
    if (tipo === 'fili') { const n = 3 + diff; mg.n = n; mg.sx = mescola([...Array(n).keys()], r); mg.dx = mescola([...Array(n).keys()], r); mg.uniti = new Set(); mg.sel = null; }
    if (tipo === 'codice') { mg.codice = Array.from({ length: 3 + diff }, () => Math.floor(r() * 10)).join(''); mg.scritto = ''; mg.mostraFino = diff >= 3 ? performance.now() + 3200 : Infinity; }
    if (tipo === 'sequenza') { mg.seq = Array.from({ length: 2 + diff }, () => Math.floor(r() * 9)); mg.fatti = 0; mg.mostraDa = performance.now() + 600; }
    if (tipo === 'taratura') { mg.colpi = 0; mg.serve = diff + 1; mg.zona = 0.2 + r() * 0.6; mg.larga = [0, 0.22, 0.15, 0.1][diff]; mg.vel = [0, 2.2, 3, 3.8][diff]; }
    if (bloccato()) document.exitPointerLock();
  }
  function sbagliato() { mg.err = performance.now(); audio.suona('vuoto', 1); }
  function finito() { if (mg.fatto) return; mg.fatto = true; audio.suona('preso', 1); io.tf = [mg.s, mg.seme]; invia(true); }
  const box = () => ({ x: mgW / 2 - 380, y: mgH / 2 - 220, w: 760, h: 440 });
  const tastierino = () => { const b = box(); return [...'123456789⌫0✓'].map((c, i) => ({ c, x: b.x + 470 + (i % 3) * 80, y: b.y + 120 + Math.floor(i / 3) * 70, w: 70, h: 60 })); };
  const caselle = () => { const b = box(); return [...Array(9).keys()].map((i) => ({ i, x: b.x + 260 + (i % 3) * 84, y: b.y + 110 + Math.floor(i / 3) * 84, w: 76, h: 76 })); };
  const nodiFili = (lato) => { const b = box(); return [...Array(mg.n).keys()].map((i) => ({ i, x: lato ? b.x + b.w - 120 : b.x + 120, y: b.y + 120 + i * (260 / Math.max(1, mg.n - 1)) })); };
  function codiceTasto(c) {
    if (c === '⌫') { mg.scritto = mg.scritto.slice(0, -1); return; }
    if (c === '✓' || !/[0-9]/.test(c) || mg.scritto.length >= mg.codice.length) return;
    mg.scritto += c; audio.suona('click', 1);
    if (mg.scritto.length === mg.codice.length) {
      if (mg.scritto === mg.codice) finito();
      else { sbagliato(); mg.scritto = ''; if (mg.diff >= 3) mg.mostraFino = performance.now() + 2000; }
    }
  }
  function tara() {
    const p = (Math.sin(((performance.now() - mg.t0) / 1000) * mg.vel) + 1) / 2;
    if (Math.abs(p - mg.zona) < mg.larga / 2) { mg.colpi++; audio.suona('click', 1); mg.zona = 0.15 + mg.r() * 0.7; if (mg.colpi >= mg.serve) finito(); }
    else { sbagliato(); mg.colpi = Math.max(0, mg.colpi - 1); }
  }
  function mgClic(x, y) {
    if (!mg || mg.fatto) return;
    const dentro = (q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h;
    if (mg.tipo === 'fili') {
      const sx = nodiFili(0).find((q) => Math.hypot(q.x - x, q.y - y) < 26), dx = nodiFili(1).find((q) => Math.hypot(q.x - x, q.y - y) < 26);
      if (sx && !mg.uniti.has(mg.sx[sx.i])) { mg.sel = sx.i; audio.suona('click', 1); }
      else if (dx && mg.sel !== null) {
        if (mg.sx[mg.sel] === mg.dx[dx.i]) { mg.uniti.add(mg.dx[dx.i]); audio.suona('click', 1); if (mg.uniti.size === mg.n) finito(); }
        else { sbagliato(); if (mg.diff >= 3) mg.uniti.clear(); }
        mg.sel = null;
      }
    } else if (mg.tipo === 'codice') { const q = tastierino().find(dentro); if (q) codiceTasto(q.c); }
    else if (mg.tipo === 'sequenza') {
      if (performance.now() < mg.mostraDa + mg.seq.length * 800) return; // sta ancora mostrando
      const q = caselle().find(dentro); if (!q) return;
      mg.lampo = { i: q.i, t: performance.now() };
      if (q.i === mg.seq[mg.fatti]) { mg.fatti++; audio.suona('ping', 1, 0, 600 + q.i * 120); if (mg.fatti >= mg.seq.length) finito(); }
      else { sbagliato(); mg.fatti = 0; mg.mostraDa = performance.now() + 700; }
    } else if (mg.tipo === 'taratura') tara();
  }
  function mgTasto(k) {
    if (!mg || mg.fatto) return false;
    if (mg.tipo === 'codice' && (/^[0-9]$/.test(k) || k === 'backspace')) { codiceTasto(k === 'backspace' ? '⌫' : k); return true; }
    if (mg.tipo === 'taratura' && k === ' ') { tara(); return true; }
    return false;
  }
  function disegnaMinigioco(g, W, H) {
    mgW = W; mgH = H;
    const b = box(), ora = performance.now();
    g.save();
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#10160f'; g.strokeStyle = mg.err && ora - mg.err < 400 ? '#ff5040' : '#6fae6a'; g.lineWidth = 4;
    g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 18); g.fill(); g.stroke();
    const titoli = { fili: 'RICOLLEGA I CAVI', codice: 'INSERISCI IL CODICE', sequenza: 'RIPETI LA SEQUENZA', taratura: 'TARATURA' };
    testo(g, `${titoli[mg.tipo]}  ${'★'.repeat(mg.diff)}${'☆'.repeat(3 - mg.diff)}`, b.x + 30, b.y + 44, { size: 22, col: '#b8f0b0' });
    testo(g, 'E · lascia la task', b.x + b.w - 30, b.y + 44, { size: 14, al: 'right', col: '#80a080' });
    if (mg.fatto) testo(g, 'FATTO ✓', W / 2, b.y + b.h / 2, { size: 40, al: 'center', col: '#8fff8f', peso: 700 });
    else if (mg.tipo === 'fili') {
      testo(g, 'Clicca un cavo a sinistra e poi quello dello stesso colore a destra', W / 2, b.y + b.h - 22, { size: 14, al: 'center', col: '#a0c0a0' });
      const S = nodiFili(0), D = nodiFili(1);
      for (const c of mg.uniti) { const a = S[mg.sx.indexOf(c)], d = D[mg.dx.indexOf(c)]; g.strokeStyle = COL_FILI[c]; g.lineWidth = 9; g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(a.x + 200, a.y, d.x - 200, d.y, d.x, d.y); g.stroke(); }
      S.forEach((q, i) => { const c = mg.sx[i]; g.fillStyle = COL_FILI[c]; g.fillRect(q.x - 90, q.y - 7, 80, 14); g.beginPath(); g.arc(q.x, q.y, mg.sel === i ? 20 : 15, 0, Math.PI * 2); g.fill(); if (mg.sel === i) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); } });
      D.forEach((q, i) => { const c = mg.dx[i]; g.fillStyle = COL_FILI[c]; g.fillRect(q.x + 10, q.y - 7, 80, 14); g.beginPath(); g.arc(q.x, q.y, 15, 0, Math.PI * 2); g.fill(); });
    } else if (mg.tipo === 'codice') {
      const visibile = ora < mg.mostraFino;
      g.fillStyle = '#031006'; g.fillRect(b.x + 40, b.y + 110, 380, 90);
      testo(g, visibile ? mg.codice.split('').join(' ') : '* '.repeat(mg.codice.length).trim(), b.x + 230, b.y + 170, { size: 36, al: 'center', col: '#7dff9a', peso: 700 });
      testo(g, mg.diff >= 3 ? (visibile ? 'memorizzalo!' : 'scrivilo a memoria') : 'il codice del terminale', b.x + 230, b.y + 98, { size: 14, al: 'center', col: '#80a080' });
      g.fillStyle = '#0b1a0d'; g.fillRect(b.x + 40, b.y + 240, 380, 70);
      testo(g, mg.scritto.split('').join(' ') + (Math.floor(ora / 400) % 2 ? ' _' : ''), b.x + 230, b.y + 287, { size: 32, al: 'center', col: '#e8ffe8' });
      testo(g, 'Clicca i tasti o scrivi con la tastiera', b.x + 230, b.y + 350, { size: 14, al: 'center', col: '#a0c0a0' });
      for (const q of tastierino()) { g.fillStyle = '#1d2c1e'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = '#4a7a48'; g.lineWidth = 2; g.strokeRect(q.x, q.y, q.w, q.h); testo(g, q.c, q.x + q.w / 2, q.y + 40, { size: 24, al: 'center', col: '#c8f0c0' }); }
    } else if (mg.tipo === 'sequenza') {
      const mostra = ora < mg.mostraDa + mg.seq.length * 800;
      const passo = Math.floor((ora - mg.mostraDa) / 800), dentroPasso = ((ora - mg.mostraDa) % 800) < 550;
      testo(g, mostra ? 'Guarda…' : `Ripeti: ${mg.fatti}/${mg.seq.length}`, W / 2, b.y + 90, { size: 16, al: 'center', col: '#a0c0a0' });
      for (const q of caselle()) {
        const accesa = (mostra && ora >= mg.mostraDa && dentroPasso && mg.seq[passo] === q.i) || (mg.lampo && mg.lampo.i === q.i && ora - mg.lampo.t < 250);
        g.fillStyle = accesa ? '#9fff9a' : '#1d2c1e'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = '#4a7a48'; g.lineWidth = 2; g.strokeRect(q.x, q.y, q.w, q.h);
      }
    } else if (mg.tipo === 'taratura') {
      const p = (Math.sin(((ora - mg.t0) / 1000) * mg.vel) + 1) / 2, x0 = b.x + 60, w = b.w - 120, y = b.y + 200;
      g.fillStyle = '#081208'; g.fillRect(x0, y, w, 50);
      g.fillStyle = 'rgba(80,255,110,.45)'; g.fillRect(x0 + (mg.zona - mg.larga / 2) * w, y, mg.larga * w, 50);
      g.fillStyle = '#ffffff'; g.fillRect(x0 + p * w - 3, y - 12, 6, 74);
      testo(g, `Clicca o premi spazio quando l'ago è nel verde · ${mg.colpi}/${mg.serve}`, W / 2, y + 110, { size: 16, al: 'center', col: '#a0c0a0' });
    }
    g.restore();
  }

  // ---------- gli eventi del server: suoni, scosse, scritte ----------
  function dopoTick(ctx, d) {
    ctxA = ctx;
    nuovaPartita(ctx);
    completa(d.s);
    if (!d.s || !M) return;
    const st = d.s, mostro = sonoMostro(ctx);
    window.__isolationStato = st; // per le prove automatiche
    const a0 = mioA(st, ctx) || st.al[0];
    const cam = predMio || (mostro ? { x: a0[0], y: a0[1] } : (() => { const u = mioUmano(st, ctx); return u ? { x: u[1], y: u[2] } : { x: a0[0], y: a0[1] }; })());
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
      else if (tipo === 'morte') { if (e[1] === ctx.mio) { morteCausa = e[3] || 0; audio.suona('morte', 1); scossa = 1; } else { const u = st.u.find((x) => x[0] === e[1]); if (u) audio.suona('urlo', volDi(u[1], u[2], 600) * 0.8, panDi(u[1], u[2])); sottotitolo(`${ctx.nome(e[1])} è stato preso`); } }
      else if (tipo === 'fugge' && e[1] !== ctx.mio) sottotitolo(`${ctx.nome(e[1])} è salito sul Torrens`);
      else if (tipo === 'fiuto' && mostro && (e[1] === undefined || e[1] === ctx.mio)) sottotitolo('Senti un odore… (segno rosso)');
      else if (tipo === 'colpo') audio.suona('sibilo', volDi(e[1], e[2], 200), panDi(e[1], e[2]));
      else if (tipo === 'task') { const c = M.centro(STAZ[e[1]]); audio.suona('gen', Math.max(0.15, volDi(c.x, c.y, 400)) * 0.6, panDi(c.x, c.y)); if (e[2] === ctx.mio) sottotitolo(`Task completata (${e[3]})`); else if (!mostro) sottotitolo(`${ctx.nome(e[2])} ha completato una task (${e[3]})`); }
      else if (tipo === 'joe') { const v = volDi(e[3], e[4], 220); if (v > 0.05) { sottotitolo(`Working Joe: «${e[2]}»`); audio.suona('joe', v, panDi(e[3], e[4])); } }
      else if (tipo === 'presa') { if (e[1] === ctx.mio) { presaColpi = 0; scossa = 0.8; audio.suona('morte', 0.5); } else sottotitolo(`${ctx.nome(e[1])} è preso da un Working Joe!`); }
      else if (tipo === 'divincola' && e[1] === ctx.mio) { presaColpi = e[2]; audio.suona('click', 1); scossa = Math.max(scossa, 0.3); }
      else if (tipo === 'libero' && e[1] === ctx.mio) { presaColpi = 0; sottotitolo('Ti sei liberato: scappa!'); }
      else if (tipo === 'joeBrucia') audio.suona('vuoto', 1);
      else if (tipo === 'serve' && e[1] === ctx.mio) { audio.suona('vuoto', 1); sottotitolo(`Il generatore non parte: serve ${NOMI_CHIAVI[e[2]]}`); }
      else if (tipo === 'chiave') { audio.suona('preso', 1); sottotitolo(e[1] === ctx.mio ? `Hai trovato ${NOMI_CHIAVI[e[2]]}` : `${ctx.nome(e[1])} ha trovato ${NOMI_CHIAVI[e[2]]}`); }
      else if (tipo === 'uovo') { const c = M.centro(M.OGGETTI.U[e[1]]); audio.suona('sibilo', volDi(c.x, c.y, 200), panDi(c.x, c.y)); }
      else if (tipo === 'fhNasce' || tipo === 'fhSalta') audio.suona('fh', volDi(e[1], e[2], 250), panDi(e[1], e[2]));
      else if (tipo === 'fhBrucia') audio.suona('fh', volDi(e[1], e[2], 250) * 0.7, panDi(e[1], e[2]));
      else if (tipo === 'botola') { const u = st.u.find((x) => x[0] === e[1]); if (u) audio.suona('armadietto', volDi(u[1], u[2], 160), panDi(u[1], u[2])); }
    }
    // a fine partita o in pausa si libera il mouse
    if ((ctx.partita.finita || (window.Boss && Boss.attivo)) && bloccato()) document.exitPointerLock();
  }

  // i comandi per il dito (si vedono solo a schermo pieno; quali pulsanti dipende da chi sei: data-chi)
  const TOCCO = `<div class="is-tocco" data-chi="umano">
      <div class="is-joy" data-ar="joy" aria-label="Muoviti"><i></i></div>
      <button type="button" class="is-tt is-aiuto" data-ist="aiuto" aria-label="Comandi">?</button>
      <div class="is-azioni">
        <button type="button" class="is-tt is-piccolo" data-ist="acc" aria-label="Accucciati">▼</button>
        <button type="button" class="is-tt is-piccolo" data-ist="ril" aria-label="Rilevatore">📡</button>
        <button type="button" class="is-tt is-piccolo" data-ist="torcia" aria-label="Torcia">🔦</button>
        <button type="button" class="is-tt is-piccolo" data-ist="razzo" aria-label="Razzo">🎆</button>
        <button type="button" class="is-tt is-usa" data-ist="usa">USA</button>
        <button type="button" class="is-tt is-fuoco" data-ist="fuoco" aria-label="Lanciafiamme"><span class="is-umano-ic">🔥</span><span class="is-alieno-ic">⚔</span></button>
        <button type="button" class="is-tt is-respiro" data-ist="respiro" aria-label="Trattieni il respiro">😮</button>
      </div>
    </div>`;

  const tavolo = window.Arena.tavolo({
    id: 'isolation',
    nomeAzione: null,
    comandi: 'nessuno', // i comandi per il dito li disegna il gioco (sopra la scena, vedi sopra)
    clicAzione: false,
    pieno,
    misura,
    maxDpr: touch() ? 2 : undefined, // sul telefono la tela a 3× costava troppo (grana, scritte e scena da ricopiare)
    obiettivo: 'punti',
    predici,
    istruzioni: (ctx) => (touch()
      ? (sonoMostro(ctx)
        ? 'Gira il telefono in orizzontale: si gioca a schermo pieno. Joystick a sinistra per muoverti (fino al bordo: scatto), trascina il dito sulla scena per guardare, ⚔ attacca, USA per grate, armadietti e casse. ? mostra i comandi, ⛶ torna alla pagina.'
        : 'Gira il telefono in orizzontale: si gioca a schermo pieno. Joystick a sinistra per muoverti (fino al bordo: correre), trascina il dito sulla scena per guardare, 🔥 lanciafiamme, USA per armadietti, generatori e task, ▼ accucciarti, 📡 rilevatore, 🔦 torcia, 🎆 razzo, 😮 trattieni il respiro. ? mostra i comandi, ⛶ torna alla pagina.')
      : sonoMostro(ctx)
        ? 'Clicca sulla scena per bloccare il mouse. WASD muoverti · mouse guardare · Maiusc scatto · clic attacca davanti a te · E scendi o risali dalle grate e apri armadietti e casse. Sulla minimappa in alto a destra vedi i rumori come nuvolette rosse.'
        : 'Clicca sulla scena per bloccare il mouse. WASD muoversi · mouse guardare · Maiusc correre · C accucciarsi · Q (o tasto destro) rilevatore · F torcia · E usa · clic lanciafiamme · G razzo · spazio trattieni il respiro · Tab cambia chi guardi da morto.' + (survival(ctx) ? ' Survival: E su un terminale o un generatore con la luce gialla apre la task; resta fermo per diventare invisibile.' : '')),
    ruolo: (p, s, ctx) => (sonoMostro(ctx) ? 'sei lo XENOMORFO: prendili tutti' : survival(ctx) ? 'completate le task e scappate sul Torrens' : 'riaccendi i generatori e scappa sul Torrens'),
    sottotitolo: (p, ctx) => (sonoMostro(ctx) ? 'Sei lo xenomorfo' : 'Sopravvivi'),
    statoGioco: (ctx, s) => {
      if (!s.s) return '';
      if (sonoMostro(ctx)) { const a = mioA(s.s, ctx); return a && a[4] ? 'Nei condotti' : 'A caccia'; }
      const u = mioUmano(s.s, ctx);
      if (!u) return '';
      if (u[5] & 64) return 'Sei salvo sul Torrens';
      if (!(u[5] & 1)) return 'Sei morto: guardi gli altri';
      if (u[5] & 2) return 'Nascosto';
      if (u[5] & 2048) return 'Nel passaggio di servizio';
      if (s.s.ts && !s.s.sb) return `Task ${s.s.ts[0]}/${s.s.ts[1]}`;
      return s.s.sb ? 'Corri al Torrens!' : 'Riaccendi i generatori';
    },
    hud: () => '',
    fineRound: (p, s) => (s.s && s.s.u.some((u) => u[5] & 64) ? 'Qualcuno è salito sul Torrens!' : 'Lo xenomorfo ha vinto'),
    dopoTick,
    disegna,
    // il pulsante dello schermo intero
    sopra: () => `<div class="is-strato">${touch() ? TOCCO : ''}<button type="button" class="is-bt is-pieno" data-is="schermo" title="${touch() ? 'Torna alla pagina o allo schermo pieno' : 'Schermo intero'}">⛶</button><button type="button" class="is-bt is-ingr" data-is="opzioni" title="Impostazioni" aria-expanded="false">⚙</button>
      <div class="is-pannello" hidden><b>Impostazioni</b>
        <label>${touch() ? 'Sensibilità della visuale' : 'Sensibilità del mouse'} <input type="range" id="is-sens" min="0.3" max="2.5" step="0.1"></label>
        <label><input type="checkbox" id="is-inverti"> Inverti su e giù</label>
        <label>Campo visivo <span id="is-fov-n"></span> <input type="range" id="is-fov" min="60" max="95" step="1"></label>
        <label>Qualità <select id="is-qualita"><option value="alta">Alta (ombre)</option><option value="media">Media (senza ombre)</option><option value="bassa">Bassa (per PC lenti)</option></select></label>
        <button type="button" class="is-bt is-chiudi" data-is="opzioni">Chiudi</button></div></div>`,
  });
  Object.assign(window.Tavoli, { isolation: tavolo });
})();
