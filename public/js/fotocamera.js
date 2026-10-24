// FOTOCAMERA MAGICA: dalla home accendi la fotocamera (solo se la attivi tu, il browser chiede il permesso) e ti vedi.
// Il sito reagisce a cosa fai: il 67 con le mani fa partire il "six seven", la mano sulla bocca il gatto sub e gli
// altri gesti mettono un gatto davanti a te (dito alzato, lingua fuori, bocca aperta, occhiolino, occhi
// socchiusi, faccia triste, fermo per qualche secondo).
// Le immagini restano nel browser: mani e viso li riconosce MediaPipe qui dentro (file serviti dal sito, niente
// CDN), niente viene inviato al server né salvato. Si accende dalla home o con !foto in chat; è una finestrella che si
// sposta trascinandola, così si gioca intanto. Si spegne col pulsante (o di nuovo !foto), cambiando scheda o aprendo le
// dispense (Boss Key).
window.Fotocamera = (() => {
  const G = window.FotocameraGesti;
  const $ = (s) => document.querySelector(s);
  const FILE = { sound67: '/fotocamera/sei-sette.mp3', scuba: '/fotocamera/gatto-scuba.mp4' }; // facoltativi
  const FERMO_MS = 3000; // quanto stare fermi per il gatto soldato
  let flusso = null, giro = 0, mani = null, viso = null, caricamento = null, audio = null;
  let ultimoGiro = 0, ultimaFoto = 0, grigiPrima = null, fermoDa = 0;
  let conti = {}, volte = {}, gestoPrima = null, bocca = null, espressioni = null, puntiViso = null, effetto67Fino = 0, scubaAcceso = false;
  const c67 = G.crea67();
  // i gatti per ogni gesto (foto in public/fotocamera/gatto-<nome>.jpg); se sono due si alternano, uno per volta
  const GATTI = { dito: ['dito'], lingua: ['lingua', 'lingua2'], aperta: ['huh'], occhiolino: ['occhiolino'], socchiusi: ['giudice'], triste: ['triste', 'offeso'], fermo: ['soldato'] };
  const TUTTI = Object.values(GATTI).flat().map((f) => `.fcam-${f}`);
  const esiste = {}; // quali file facoltativi ci sono (si guarda una volta sola)

  // ---------- finestra ----------
  function finestra() {
    let el = $('#fcam');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fcam';
    el.className = 'fcam-velo';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Fotocamera magica');
    el.innerHTML = `
      <div class="fcam-box">
        <div class="fcam-testa" title="Trascina per spostare la finestra"><h2>📷 Fotocamera</h2>
          <button type="button" class="bottone mini-bt fcam-aiuto" aria-expanded="false" title="Mostra i trucchi">❔</button>
          <button type="button" class="bottone mini-bt fcam-spegni" title="Spegni la fotocamera">⏹ Spegni</button></div>
        <div class="fcam-schermo">
          <video class="fcam-video" playsinline muted></video>
          ${Object.values(GATTI).flat().map((f) => `<img class="fcam-filtro fcam-${f}" src="/fotocamera/gatto-${f}.jpg" alt="" hidden>`).join('')}
          <div class="fcam-filtro fcam-scuba" hidden><video playsinline></video><p>🤿 Gatto sub<br><small>(manca il video: va messo in public/fotocamera/gatto-scuba.mp4)</small></p></div>
          <div class="fcam-67" hidden><span>6</span><span>7</span></div>
          <p class="fcam-stato" role="status"></p>
        </div>
        <ul class="fcam-trucchi" hidden>
          <li>🙌 <b>67</b>: alza e abbassa le mani alternate</li>
          <li>☝️ <b>Dito alzato</b>: il gatto con gli occhiali, finché non lo abbassi</li>
          <li>🤫 <b>Mano sulla bocca</b>: il gatto sub</li>
          <li>😛 <b>Lingua fuori</b>: i gatti con la linguaccia (uno per volta)</li>
          <li>😮 <b>Bocca aperta</b>: il gatto «Huh?»</li>
          <li>😉 <b>Occhiolino</b>: il gattino che fa l'occhiolino</li>
          <li>😑 <b>Occhi socchiusi</b>: il gatto che ti giudica</li>
          <li>😢 <b>Faccia triste</b>: il gatto bagnato o quello offeso</li>
          <li>🧍 <b>Fermo</b> per qualche secondo: il gatto soldato</li>
        </ul>
        <p class="piccolo fcam-nota">Le immagini restano nel tuo browser: niente viene inviato o salvato.</p>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.fcam-spegni').addEventListener('click', spegni);
    el.querySelector('.fcam-aiuto').addEventListener('click', (e) => {
      const l = el.querySelector('.fcam-trucchi');
      l.hidden = !l.hidden; e.currentTarget.setAttribute('aria-expanded', String(!l.hidden));
      tieniDentro(el);
    });
    trascinabile(el);
    el.querySelector('.fcam-scuba video').addEventListener('ended', () => mostraScuba(false));
    return el;
  }
  // come il resto del sito: con l'audio spento (🔇) niente suoni, i video partono muti
  const muto = () => { const b = document.getElementById('suono'); return !!b && b.getAttribute('aria-pressed') === 'false'; };
  // la finestra si sposta trascinando la barra in alto (mouse o dito) e ricorda dove l'hai messa
  function trascinabile(el) {
    const testa = el.querySelector('.fcam-testa');
    let presa = null;
    try { const p = JSON.parse(localStorage.getItem('if:fotocamera:posto') || 'null'); if (p) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; } } catch { /* niente */ }
    testa.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = el.getBoundingClientRect();
      presa = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      testa.setPointerCapture(e.pointerId);
      el.classList.add('fcam-presa');
    });
    testa.addEventListener('pointermove', (e) => {
      if (!presa) return;
      el.style.left = `${e.clientX - presa.dx}px`; el.style.top = `${e.clientY - presa.dy}px`;
      tieniDentro(el);
    });
    const lascia = () => {
      if (!presa) return;
      presa = null; el.classList.remove('fcam-presa');
      try { localStorage.setItem('if:fotocamera:posto', JSON.stringify({ x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) })); } catch { /* niente */ }
    };
    testa.addEventListener('pointerup', lascia);
    testa.addEventListener('pointercancel', lascia);
    window.addEventListener('resize', () => tieniDentro(el));
  }
  // la finestra resta sempre dentro lo schermo (almeno la barra per riprenderla)
  function tieniDentro(el) {
    if (el.hidden) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(0, r.left), Math.max(0, innerWidth - r.width));
    const y = Math.min(Math.max(0, r.top), Math.max(0, innerHeight - 48));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  }
  const stato = (t) => { const p = $('#fcam .fcam-stato'); if (p) p.textContent = t; };
  const mostra = (sel, si) => { const x = $(`#fcam ${sel}`); if (x && x.hidden === si) x.hidden = !si; };

  // ---------- accendi / spegni ----------
  async function attiva() {
    if (window.Boss && Boss.attivo) return;
    const el = finestra();
    el.hidden = false;
    tieniDentro(el);
    if (flusso) return;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* niente audio */ }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      stato('😕 Questo browser non può usare la fotocamera (serve una pagina https e un browser recente).');
      return;
    }
    stato('📷 Il browser ti chiede il permesso per la fotocamera…');
    try {
      flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      flusso = null;
      stato(e && e.name === 'NotAllowedError' ? '🚫 Permesso negato: per usarla consenti la fotocamera dalle impostazioni del browser.'
        : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? '😕 Nessuna fotocamera trovata su questo dispositivo.'
          : '😕 Non riesco ad accendere la fotocamera (forse la sta usando un\'altra app).');
      return;
    }
    if (el.hidden) { spegni(); return; } // chiusa mentre si aspettava il permesso
    const v = el.querySelector('.fcam-video');
    v.srcObject = flusso;
    try { await v.play(); } catch { /* parte da sola */ }
    controllaFile();
    stato('⏳ Preparo il riconoscimento delle mani…');
    caricaModelli().then((ok) => { if (flusso) stato(ok ? `✨ Pronta! Tocca ❔ per i trucchi${muto() ? ' (audio del sito spento: niente suoni)' : ''}` : '⚠️ Riconoscimento delle mani non disponibile: funziona solo il gatto soldato.'); });
    ultimaFoto = 0; grigiPrima = null; fermoDa = performance.now();
    cancelAnimationFrame(giro);
    giro = requestAnimationFrame(passo);
  }

  function spegni() {
    cancelAnimationFrame(giro); giro = 0;
    if (flusso) for (const t of flusso.getTracks()) t.stop();
    flusso = null;
    const el = $('#fcam');
    if (!el) return;
    el.querySelector('.fcam-video').srcObject = null;
    for (const s of [...TUTTI, '.fcam-67']) mostra(s, false);
    mostraScuba(false);
    c67.azzera(); conti = {}; bocca = espressioni = puntiViso = null; effetto67Fino = 0;
    el.hidden = true;
  }

  // file facoltativi (suono vero del 67, video del gatto sub): se non ci sono si usa il ripiego
  function controllaFile() {
    for (const [k, url] of Object.entries(FILE)) {
      if (k in esiste) continue;
      esiste[k] = false;
      fetch(url, { method: 'HEAD' }).then((r) => { esiste[k] = r.ok; if (k === 'scuba' && r.ok) $('#fcam .fcam-scuba').classList.add('fcam-pronto'); }).catch(() => {});
    }
  }

  // MediaPipe: caricato solo la prima volta che si accende (circa 21 MB tra programma e modelli)
  function caricaModelli() {
    if (!caricamento) {
      caricamento = (async () => {
        const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import('/js/mediapipe/vision_bundle.mjs');
        const base = await FilesetResolver.forVisionTasks('/js/mediapipe/wasm');
        const crea = async (Classe, modello, extra) => {
          for (const delegate of ['GPU', 'CPU']) {
            try { return await Classe.createFromOptions(base, { baseOptions: { modelAssetPath: modello, delegate }, runningMode: 'VIDEO', ...extra }); } catch (e) { if (delegate === 'CPU') throw e; }
          }
        };
        mani = await crea(HandLandmarker, '/modelli/mani.task', { numHands: 2 });
        try { viso = await crea(FaceLandmarker, '/modelli/viso.task', { numFaces: 1, outputFaceBlendshapes: true }); } catch { viso = null; } // senza viso niente gatto sub né triste
        return true;
      })().catch((e) => { console.warn('[fotocamera] riconoscimento non disponibile', e); caricamento = null; return false; });
    }
    return caricamento;
  }

  // ---------- il giro: ~15 controlli al secondo ----------
  function passo(ora) {
    if (!flusso) return;
    giro = requestAnimationFrame(passo);
    if (window.Boss && Boss.attivo) { spegni(); return; }
    const v = $('#fcam .fcam-video');
    if (!v || v.readyState < 2 || ora - ultimoGiro < 66) return;
    ultimoGiro = ora;

    // fermo o in movimento (5 volte al secondo, immagine piccolissima in grigio)
    if (ora - ultimaFoto > 200) {
      ultimaFoto = ora;
      const grigi = grigiDi(v);
      if (G.movimento(grigiPrima, grigi) > 0.015) fermoDa = ora;
      grigiPrima = grigi;
    }

    let trovate = [];
    if (mani) { try { trovate = mani.detectForVideo(v, ora).landmarks || []; } catch { trovate = []; } }
    if (viso) {
      try {
        const r = viso.detectForVideo(v, ora), k = (r.faceLandmarks || [])[0];
        if (k && k.length > 454) { // 13 e 14: labbra al centro; 234 e 454: i lati del viso
          bocca = { x: (k[13].x + k[14].x) / 2, y: (k[13].y + k[14].y) / 2, larghezza: Math.max(0.05, Math.hypot(k[234].x - k[454].x, k[234].y - k[454].y)), t: ora };
          espressioni = {}; puntiViso = k;
          for (const c of ((r.faceBlendshapes || [])[0] || {}).categories || []) espressioni[c.categoryName] = c.score;
        } else espressioni = puntiViso = null;
      } catch { /* niente */ }
    }
    // 67: il più importante, per 4 secondi copre tutto
    if (c67.aggiungi(trovate, ora)) parte67(ora);
    const in67 = ora < effetto67Fino;
    mostra('.fcam-67', in67);

    // mano sulla bocca (la bocca coperta può far perdere il viso: vale l'ultima vista da meno di 1,5 secondi)
    const boccaOk = bocca && ora - bocca.t < 1500 ? bocca : null;
    if (!in67 && boccaOk && trovate.some((m) => G.manoSullaBocca(m, boccaOk)) && !scubaAcceso) mostraScuba(true);

    // un solo gatto alla volta, nell'ordine: dito alzato, lingua fuori, bocca aperta, occhiolino, occhi socchiusi,
    // faccia triste, fermo
    const libero = !in67 && !scubaAcceso;
    const dito = conta('dito', trovate.some((m) => G.ditoAlzato(m)), 3);
    const lingua = conta('lingua', !!puntiViso && G.linguaFuori(...pixelDi(v), puntiViso, espressioni), 3);
    const aperta = conta('aperta', G.boccaAperta(espressioni), 3);
    const occhio = conta('occhiolino', G.occhiolino(espressioni), 3);
    const socchiusi = conta('socchiusi', G.occhiSocchiusi(espressioni), 6); // 6: una sbattuta d'occhi non basta
    const tri = conta('triste', G.triste(espressioni), 4);
    const fermo = ora - fermoDa > FERMO_MS;
    const gesto = !libero ? null : dito ? 'dito' : lingua ? 'lingua' : aperta ? 'aperta' : occhio ? 'occhiolino' : socchiusi ? 'socchiusi' : tri ? 'triste' : fermo ? 'fermo' : null;
    if (gesto && gesto !== gestoPrima) volte[gesto] = (volte[gesto] || 0) + 1; // ogni volta che rifai il gesto, l'altro gatto
    gestoPrima = gesto;
    const scelto = gesto && `.fcam-${GATTI[gesto][(volte[gesto] - 1) % GATTI[gesto].length]}`;
    for (const sel of TUTTI) mostra(sel, sel === scelto);
  }

  // un gesto vale dopo n controlli di fila e smette dopo qualche controllo senza (niente sfarfallio)
  function conta(k, si, n) {
    const c = conti[k] || (conti[k] = { su: 0, giu: 0 });
    if (si) { c.su++; c.giu = 0; } else if (++c.giu > 4) c.su = 0;
    return c.su >= n;
  }

  // l'immagine intera ma piccola (160×120), per il colore della lingua
  function pixelDi(v) {
    const c = pixelDi.c || (pixelDi.c = document.createElement('canvas'));
    c.width = 160; c.height = 120;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(v, 0, 0, 160, 120);
    return [x.getImageData(0, 0, 160, 120).data, 160, 120];
  }

  function grigiDi(v) {
    const c = grigiDi.c || (grigiDi.c = document.createElement('canvas'));
    c.width = 32; c.height = 24;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(v, 0, 0, 32, 24);
    const d = x.getImageData(0, 0, 32, 24).data, g = new Uint8Array(32 * 24);
    for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10;
    return g;
  }

  function mostraScuba(si) {
    const box = $('#fcam .fcam-scuba');
    if (!box) return;
    const v = box.querySelector('video');
    scubaAcceso = si;
    box.hidden = !si;
    if (si && esiste.scuba) {
      if (!v.src) v.src = FILE.scuba;
      v.muted = muto(); v.currentTime = 0; v.play().catch(() => {});
    } else if (si) {
      setTimeout(() => { if (scubaAcceso) mostraScuba(false); }, 3000); // senza video: solo la scritta per 3 secondi
    } else { try { v.pause(); } catch { /* niente */ } }
  }

  // ---------- six seven ----------
  function parte67(ora) {
    effetto67Fino = ora + 4000;
    if (muto()) { stato('🔇 Audio del sito spento: accendilo per sentire il «six seven»'); return; }
    if (esiste.sound67) { const a = new Audio(FILE.sound67); a.play().catch(() => suono67()); } else suono67();
  }

  // ripiego senza file: base trap (cassa 808, charleston) e una voce che dice "six seven"
  function suono67() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime + 0.05, battito = 60 / 140;
      const cassa = (t) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.5);
      };
      const charleston = (t) => {
        const buf = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.05), audio.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = audio.createBufferSource(); s.buffer = buf;
        const f = audio.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        const g = audio.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        s.connect(f).connect(g).connect(audio.destination); s.start(t);
      };
      for (let b = 0; b < 8; b++) { if (b % 4 === 0 || b === 3 || b === 6) cassa(t0 + b * battito); for (let h = 0; h < 2; h++) charleston(t0 + (b + h / 2) * battito); }
    } catch { /* niente audio */ }
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      for (const quando of [0, 1700]) setTimeout(() => {
        const u = new SpeechSynthesisUtterance('six seven');
        u.lang = 'en-US'; u.rate = 0.9; u.pitch = 0.8;
        const voce = speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
        if (voce) u.voice = voce;
        speechSynthesis.speak(u);
      }, 300 + quando);
    } catch { /* niente voce */ }
  }

  // ---------- collegamenti ----------
  document.addEventListener('DOMContentLoaded', () => {
    const b = $('#apri-fotocamera');
    if (b) b.addEventListener('click', attiva);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && flusso) spegni(); });
  if (window.Boss && Boss.onCambio) Boss.onCambio((a) => { if (a) spegni(); });

  // "!foto" in chat: accende (o spegne) la fotocamera solo per chi lo scrive, non va agli altri
  function comando(testo) {
    if (!/^!foto$/i.test(String(testo).trim())) return false;
    if (flusso) spegni(); else attiva();
    return true;
  }

  return { attiva, spegni, comando, get accesa() { return !!flusso; } };
})();
