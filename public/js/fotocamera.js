// FOTOCAMERA MAGICA: dalla home accendi la fotocamera (solo se la attivi tu, il browser chiede il permesso) e ti vedi.
// Il sito reagisce a cosa fai: ogni gesto mette un gatto davanti a te (dito alzato, lingua fuori, bocca aperta, faccia
// arrabbiata, occhiolino, occhi socchiusi, faccia triste, fermo per qualche secondo), con un "miao" se l'audio è acceso.
// Le immagini restano nel browser: mani e viso li riconosce MediaPipe qui dentro (file serviti dal sito, niente
// CDN), niente viene inviato al server né salvato (📸 scarica la foto solo sul tuo dispositivo). Si accende dalla home
// o con !foto in chat (!foto prova mostra i numeri dei gesti); è una finestrella che si sposta trascinandola, così si
// gioca intanto. Si spegne col pulsante (o di nuovo !foto), cambiando scheda o aprendo le dispense (Boss Key).
window.Fotocamera = (() => {
  const G = window.FotocameraGesti;
  const $ = (s) => document.querySelector(s);
  const FERMO_MS = 3000; // quanto stare fermi per il gatto soldato
  const PRESENTE_MS = 2000; // il gatto soldato solo se da poco si è vista una faccia o una mano (non con la stanza vuota)
  const ERRORI_MAX = 5; // errori di fila di MediaPipe prima di ripartire senza scheda grafica (o arrendersi)
  let flusso = null, accensione = false, giro = 0, caricamento = null;
  // i due riconoscitori: { lavoro, delegate ('GPU'|'CPU'), errori, rifai() } oppure null se non disponibili
  const ric = { mani: null, viso: null };
  let ultimoGiro = 0, ultimaFoto = 0, grigiPrima = null, fermoDa = 0, turno = 0, intervallo = 66, tempoMedio = 0, misure = 0;
  let conti = {}, volte = {}, gestoPrima = null, espressioni = null, puntiViso = null, trovate = [];
  let avvisoFino = 0, visoVistoA = 0, maniVisteA = 0, visoMaiVisto = true, provaCPU = 0, accesaA = 0, luce = 128, base = '', prova = false, provaA = 0;
  const NESSUNA = { dito: false, lingua: false, aperta: false, occhiolino: false, arrabbiato: false, socchiusi: false, triste: false };
  let uscite = { ...NESSUNA }; // l'ultimo risultato di ogni gesto (con mani e viso a turno resta quello di prima)
  // le espressioni che imparano la faccia normale di chi guarda (si riparte da capo con 🎯 o spegnendo)
  let rabbia, lingua, occhio, socchiusi, tristezza;
  const impara = () => { rabbia = G.creaRabbia(); lingua = G.creaLingua(); occhio = G.creaOcchiolino(); socchiusi = G.creaSocchiusi(); tristezza = G.creaTristezza(); };
  impara();
  // cosa scrivere quando un gesto è riconosciuto (così si capisce cosa ha visto)
  const NOMI = { dito: '☝️ Dito alzato', lingua: '😛 Lingua fuori', aperta: '😮 Bocca aperta', arrabbiato: '😠 Arrabbiato', occhiolino: '😉 Occhiolino', socchiusi: '😑 Occhi socchiusi', triste: '😢 Triste', fermo: '🧍 Fermo' };
  // i gatti per ogni gesto (foto in public/fotocamera/gatto-<nome>.jpg); se sono due si alternano, uno per volta
  const GATTI = { dito: ['dito'], lingua: ['lingua', 'lingua2'], aperta: ['huh'], arrabbiato: ['arrabbiato'], occhiolino: ['occhiolino'], socchiusi: ['giudice'], triste: ['triste', 'offeso'], fermo: ['soldato'] };
  const TUTTI = Object.values(GATTI).flat().map((f) => `.fcam-${f}`);

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
        <div class="fcam-testa" title="Trascina per spostare la finestra"><h2>📷 <span class="fcam-etichetta">Fotocamera</span></h2>
          <button type="button" class="bottone mini-bt fcam-aiuto" aria-expanded="false" title="Mostra i trucchi" aria-label="Trucchi">❔</button>
          <button type="button" class="bottone mini-bt fcam-impara" title="Se i gesti scattano da soli o non scattano: guarda la fotocamera con la faccia normale e premi qui" aria-label="Impara di nuovo la mia faccia">🎯</button>
          <button type="button" class="bottone mini-bt fcam-scatta" title="Foto ricordo (3 secondi per mettersi in posa): la scarica sul tuo dispositivo" aria-label="Scatta una foto">📸</button>
          <button type="button" class="bottone mini-bt fcam-spegni" title="Spegni la fotocamera" aria-label="Spegni la fotocamera">⏹<span class="fcam-etichetta"> Spegni</span></button></div>
        <div class="fcam-schermo">
          <video class="fcam-video" playsinline muted></video>
          ${Object.values(GATTI).flat().map((f) => `<div class="fcam-filtro fcam-${f}" hidden><img class="fcam-sfondo" src="/fotocamera/gatto-${f}.jpg" alt=""><img class="fcam-gatto" src="/fotocamera/gatto-${f}.jpg" alt=""></div>`).join('')}
          <p class="fcam-conto" hidden></p>
          <button type="button" class="bottone fcam-riaccendi" hidden>▶ Riaccendi</button>
          <p class="fcam-stato" role="status"></p>
        </div>
        <pre class="fcam-prova" hidden></pre>
        <ul class="fcam-trucchi" hidden>
          <li>☝️ <b>Dito alzato</b>: il gatto con gli occhiali, finché non lo abbassi</li>
          <li>😛 <b>Lingua fuori</b>: i gatti con la linguaccia (uno per volta)</li>
          <li>😮 <b>Bocca aperta</b>: il gatto «Huh?»</li>
          <li>😠 <b>Faccia arrabbiata</b> (sopracciglia aggrottate): il gatto arrabbiato</li>
          <li>😉 <b>Occhiolino</b>: il gattino che fa l'occhiolino</li>
          <li>😑 <b>Occhi socchiusi</b>: il gatto che ti giudica</li>
          <li>😢 <b>Faccia triste</b>: il gatto bagnato o quello offeso</li>
          <li>🧍 <b>Fermo</b> per qualche secondo: il gatto soldato</li>
          <li>🎯 Il sito impara la tua faccia normale nei primi secondi: se un gesto scatta da solo o non scatta, guarda la fotocamera tranquillo e premi 🎯</li>
          <li>📸 Foto ricordo: 3 secondi per fare il gesto, poi la scarica (tu e il gatto)</li>
          <li>💡 Va meglio con la faccia ben illuminata, dritta davanti alla fotocamera e non troppo lontana</li>
          <li>🔢 Scrivi <b>!foto prova</b> in chat per vedere i numeri dei gesti</li>
        </ul>
        <p class="piccolo fcam-nota">Le immagini restano nel tuo browser: niente viene inviato o salvato.</p>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.fcam-spegni').addEventListener('click', spegni);
    el.querySelector('.fcam-riaccendi').addEventListener('click', attiva);
    el.querySelector('.fcam-scatta').addEventListener('click', scatta);
    el.querySelector('.fcam-impara').addEventListener('click', () => {
      impara(); conti = {};
      const prima = base;
      if (!prima) return; // ancora in caricamento
      base = ''; stato('🎯 Ok, guardami con la faccia normale per un paio di secondi…');
      setTimeout(() => { if (flusso && !base) base = prima; }, 2500);
    });
    el.querySelector('.fcam-aiuto').addEventListener('click', (e) => {
      const l = el.querySelector('.fcam-trucchi');
      l.hidden = !l.hidden; e.currentTarget.setAttribute('aria-expanded', String(!l.hidden));
      tieniDentro(el);
    });
    trascinabile(el);
    return el;
  }
  // la finestra si sposta trascinando la barra in alto (mouse o dito) e ricorda dove l'hai messa
  function trascinabile(el) {
    const testa = el.querySelector('.fcam-testa');
    let presa = null;
    try { const p = JSON.parse(localStorage.getItem('if:fotocamera:posto') || 'null'); if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; } } catch { /* niente */ }
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
  const stato = (t) => { const p = $('#fcam .fcam-stato'); if (p && p.textContent !== t) p.textContent = t; };
  const PRONTA = '✨ Pronta! Tocca ❔ per i trucchi';
  // un messaggio che resta qualche secondo prima di tornare a quelli normali
  const avvisa = (t, ms = 2000) => { avvisoFino = performance.now() + ms; stato(t); };
  const mostra = (sel, si) => { const x = $(`#fcam ${sel}`); if (x && x.hidden === si) x.hidden = !si; };

  // ---------- accendi / spegni ----------
  async function attiva() {
    if (window.Boss && Boss.attivo) return;
    const el = finestra();
    el.hidden = false;
    tieniDentro(el);
    // già accesa, o si sta già aspettando il permesso: una seconda richiesta aprirebbe la fotocamera due volte e
    // «Spegni» ne chiuderebbe una sola (la lucina resterebbe accesa)
    if (flusso || accensione) return;
    mostra('.fcam-riaccendi', false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      stato('😕 Questo browser non può usare la fotocamera (serve una pagina https e un browser recente).');
      return;
    }
    stato('📷 Il browser ti chiede il permesso per la fotocamera…');
    accensione = true;
    caricaModelli(); // il download (la prima volta ~12 MB) parte subito, mentre leggi la richiesta del browser
    let f;
    try {
      f = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      stato(e && e.name === 'NotAllowedError' ? '🚫 Permesso negato: per usarla consenti la fotocamera dalle impostazioni del browser.'
        : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? '😕 Nessuna fotocamera trovata su questo dispositivo.'
          : '😕 Non riesco ad accendere la fotocamera (forse la sta usando un\'altra app).');
      return;
    } finally { accensione = false; }
    // chiusa (o dispense aperte) mentre si aspettava il permesso: si spegne subito
    if (el.hidden || (window.Boss && Boss.attivo)) { for (const t of f.getTracks()) t.stop(); return; }
    flusso = f;
    // fotocamera staccata o presa da un'altra app: l'immagine resterebbe ferma senza dire niente
    for (const t of f.getTracks()) t.addEventListener('ended', () => { if (flusso === f) persa(); });
    const v = el.querySelector('.fcam-video');
    v.srcObject = flusso;
    try { await v.play(); } catch { /* parte da sola */ }
    stato('⏳ Preparo il riconoscimento di mani e viso…');
    base = '';
    caricaModelli().then(() => {
      if (flusso !== f) return;
      base = messaggioBase(); stato(base); visoVistoA = maniVisteA = accesaA = performance.now(); // gli 8 secondi contano da qui
    });
    ultimaFoto = 0; misure = 0; tempoMedio = 0; grigiPrima = null; fermoDa = visoVistoA = maniVisteA = accesaA = performance.now(); visoMaiVisto = true;
    cancelAnimationFrame(giro);
    giro = requestAnimationFrame(passo);
  }
  function messaggioBase() {
    if (ric.mani && ric.viso) return PRONTA;
    if (ric.viso) return '⚠️ Riconoscimento delle mani non disponibile: il dito alzato non funziona.';
    if (ric.mani) return '⚠️ Riconoscimento del viso non disponibile: funzionano solo il dito alzato e il gatto soldato.';
    return '⚠️ Riconoscimento non disponibile su questo dispositivo: funziona solo il gatto soldato.';
  }

  // ferma la fotocamera e i gatti; se resta la finestra (fotocamera persa) si può riaccendere col pulsante
  function ferma() {
    cancelAnimationFrame(giro); giro = 0;
    if (flusso) for (const t of flusso.getTracks()) t.stop();
    flusso = null;
    clearInterval(scatta.conto); scatta.conto = 0;
    const el = $('#fcam');
    if (!el) return null;
    el.querySelector('.fcam-video').srcObject = null;
    for (const s of TUTTI) mostra(s, false);
    mostra('.fcam-conto', false);
    conti = {}; uscite = { ...NESSUNA }; espressioni = puntiViso = null; trovate = []; base = ''; gestoPrima = null; impara();
    return el;
  }
  function spegni() {
    const el = ferma();
    if (el) el.hidden = true;
  }
  function persa() {
    const el = ferma();
    if (!el) return;
    stato('📷 La fotocamera si è spenta (staccata o presa da un\'altra app).');
    mostra('.fcam-riaccendi', true);
  }

  // MediaPipe: caricato solo la prima volta che si accende (circa 21 MB tra programma e modelli). Mani e viso si
  // caricano insieme e ognuno per conto suo: se uno non va, l'altro funziona lo stesso.
  function caricaModelli() {
    if (!caricamento) {
      caricamento = (async () => {
        const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import('/js/mediapipe/vision_bundle.mjs');
        const fileset = await FilesetResolver.forVisionTasks('/js/mediapipe/wasm');
        // prima con la scheda grafica (veloce), se non va col processore
        const crea = async (Classe, modello, extra, delegati = ['GPU', 'CPU']) => {
          for (const delegate of delegati) {
            try {
              const lavoro = await Classe.createFromOptions(fileset, { baseOptions: { modelAssetPath: modello, delegate }, runningMode: 'VIDEO', ...extra });
              return { lavoro, delegate, errori: 0, rifai: (d = ['CPU']) => crea(Classe, modello, extra, d) };
            } catch (e) { if (delegate === delegati[delegati.length - 1]) throw e; }
          }
        };
        // soglie più basse di quelle normali (0,5): la faccia si aggancia anche con poca luce, un po' girata o con la
        // lingua fuori (che a MediaPipe fa sembrare il viso "strano" e lo perdeva). Fino a 3 facce: si segue la più vicina.
        const [m, v] = await Promise.allSettled([
          crea(HandLandmarker, '/modelli/mani.task', { numHands: 2, minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4 }),
          crea(FaceLandmarker, '/modelli/viso.task', { numFaces: 3, outputFaceBlendshapes: true, minFaceDetectionConfidence: 0.35, minFacePresenceConfidence: 0.35, minTrackingConfidence: 0.35 }),
        ]);
        ric.mani = m.status === 'fulfilled' ? m.value : null;
        ric.viso = v.status === 'fulfilled' ? v.value : null;
        for (const x of [m, v]) if (x.status === 'rejected') console.warn('[fotocamera] riconoscimento non disponibile', x.reason);
        if (!ric.mani && !ric.viso) caricamento = null; // si riprova alla prossima accensione
        return !!(ric.mani || ric.viso);
      })().catch((e) => { console.warn('[fotocamera] riconoscimento non disponibile', e); caricamento = null; return false; });
    }
    return caricamento;
  }
  // un riconoscitore che dà errore a ogni controllo (succede su alcuni telefoni con la scheda grafica): dopo qualche
  // errore di fila riparte col processore; se non va neanche così si spegne e lo si dice nella riga in basso
  function sbagliato(nome) {
    const r = ric[nome];
    if (!r || ++r.errori < ERRORI_MAX) return;
    sostituisci(nome, r);
  }
  // delegati: con cosa ripartire (di solito il processore); senza errori (prova) si torna indietro se va male
  function sostituisci(nome, r, delegati = ['CPU']) {
    ric[nome] = null;
    try { r.lavoro.close(); } catch { /* niente */ }
    const fine = () => { if (flusso && base) { base = messaggioBase(); stato(base); } };
    if (delegati[0] === r.delegate) { console.warn(`[fotocamera] ${nome}: troppi errori, spento`); fine(); return; }
    console.warn(`[fotocamera] ${nome}: riparto con ${delegati[0] === 'CPU' ? 'il processore' : 'la scheda grafica'}`);
    r.rifai(delegati).then((n) => { ric[nome] = n; }).catch(() => {}).finally(fine);
  }

  // ---------- il giro: ~15 controlli al secondo (meno se il dispositivo è lento) ----------
  function passo(ora) {
    if (!flusso) return;
    giro = requestAnimationFrame(passo);
    if (window.Boss && Boss.attivo) { spegni(); return; }
    const v = $('#fcam .fcam-video');
    if (!v || v.readyState < 2 || ora - ultimoGiro < intervallo) return;
    ultimoGiro = ora;

    // fermo o in movimento (5 volte al secondo, immagine piccolissima in grigio), e quanta luce c'è
    if (ora - ultimaFoto > 200) {
      ultimaFoto = ora;
      const grigi = grigiDi(v);
      if (G.movimento(grigiPrima, grigi) > 0.02) fermoDa = ora; // un po' di tolleranza: con poca luce l'immagine "frigge"
      grigiPrima = grigi;
      let somma = 0;
      for (const g of grigi) somma += g;
      luce = somma / grigi.length;
    }

    // mani e viso: se cercarli tutti e due insieme è lento (i giochi scatterebbero), uno per volta, a turno
    const lento = tempoMedio > 35;
    turno++;
    const t0 = performance.now();
    let nuoveMani = false, nuovoViso = false;
    if (ric.mani && (!lento || turno % 2 === 0)) {
      const r = ric.mani;
      try { trovate = r.lavoro.detectForVideo(v, ora).landmarks || []; r.errori = 0; nuoveMani = true; if (trovate.length) maniVisteA = ora; } catch { trovate = []; sbagliato('mani'); }
    }
    if (ric.viso && (!lento || turno % 2 === 1)) {
      const r = ric.viso;
      try {
        const x = r.lavoro.detectForVideo(v, ora), facce = x.faceLandmarks || [], i = G.facciaPiuGrande(facce);
        r.errori = 0; nuovoViso = true;
        if (i >= 0) {
          espressioni = {}; puntiViso = facce[i]; visoVistoA = ora; visoMaiVisto = false;
          for (const c of ((x.faceBlendshapes || [])[i] || {}).categories || []) espressioni[c.categoryName] = c.score;
        } else espressioni = puntiViso = null;
      } catch { espressioni = puntiViso = null; sbagliato('viso'); }
      // con la scheda grafica alcuni telefoni non danno errori ma non trovano mai niente: se in 8 secondi con la
      // luce buona non si è mai vista una faccia, si prova col processore. Se neanche col processore se ne vede una
      // in altri 8 secondi (semplicemente non c'era nessuno davanti), si torna alla scheda grafica, che è più veloce.
      if (ric.viso && visoMaiVisto && luce > 60 && ora - accesaA > 8000) {
        if (ric.viso.delegate === 'GPU' && !provaCPU) { provaCPU = 1; accesaA = ora; sostituisci('viso', ric.viso); }
        else if (ric.viso.delegate === 'CPU' && provaCPU === 1) { provaCPU = 2; sostituisci('viso', ric.viso, ['GPU', 'CPU']); }
      }
      if (!visoMaiVisto && provaCPU === 1) provaCPU = 2; // col processore la faccia si vede: si resta così
    }
    const ms = performance.now() - t0;
    // i primi controlli sono lentissimi (la scheda grafica si prepara, anche 1-3 secondi): non contano, se no per un
    // po' sembrerebbe un dispositivo lento e i gatti arriverebbero in ritardo proprio ai primi gesti
    if (++misure > 3) tempoMedio = tempoMedio ? tempoMedio * 0.9 + ms * 0.1 : ms;
    intervallo = tempoMedio > 70 ? 120 : 66; // molto lento: meno controlli al secondo

    // i riconoscitori si aggiornano solo quando c'è un risultato nuovo (a turno, l'altro resta com'era). Con la
    // testa molto girata gli occhi e la bocca si vedono storti: i gesti del viso (tranne la bocca aperta) non contano
    // e non imparano. Tutti girano a ogni risultato, così continuano a imparare la faccia normale anche quando vince
    // un altro gesto.
    if (nuoveMani) uscite.dito = trovate.some((m) => G.ditoAlzato(m));
    if (nuovoViso) {
      const dritta = !!puntiViso && !G.testaGirata(puntiViso);
      uscite.aperta = G.boccaAperta(espressioni, 0.45, puntiViso);
      uscite.lingua = dritta && lingua.aggiungi(...boccaDi(v, puntiViso), espressioni);
      uscite.occhiolino = dritta && occhio.aggiungi(espressioni, puntiViso);
      uscite.arrabbiato = dritta && rabbia.aggiungi(espressioni);
      uscite.socchiusi = dritta && socchiusi.aggiungi(espressioni);
      uscite.triste = dritta && tristezza.aggiungi(espressioni);
    }
    // un solo gatto alla volta, nell'ordine: dito alzato, lingua fuori, bocca aperta, occhiolino, arrabbiato, occhi
    // socchiusi, faccia triste, fermo (l'occhiolino prima di arrabbiato: facendolo la guancia e il sopracciglio
    // scendono; arrabbiato prima degli occhi: quando ti arrabbi li stringi)
    const dito = conta('dito', uscite.dito, 3);
    const lin = conta('lingua', uscite.lingua, 3);
    const aperta = conta('aperta', uscite.aperta, 3);
    const occ = conta('occhiolino', uscite.occhiolino, 2); // 2: l'occhiolino dura poco
    const arrab = conta('arrabbiato', uscite.arrabbiato, 4);
    const socc = conta('socchiusi', uscite.socchiusi, 6); // 6: una sbattuta d'occhi non basta
    const tri = conta('triste', uscite.triste, 4);
    // fermo: se c'è il riconoscimento, solo con qualcuno davanti (niente gatto soldato con la stanza vuota o la
    // fotocamera coperta)
    const qualcuno = !(ric.mani || ric.viso) || ora - Math.max(ric.viso ? visoVistoA : 0, ric.mani ? maniVisteA : 0) < PRESENTE_MS;
    const fermo = ora - fermoDa > FERMO_MS && qualcuno && luce > 15;
    const gesto = dito ? 'dito' : lin ? 'lingua' : aperta ? 'aperta' : occ ? 'occhiolino' : arrab ? 'arrabbiato' : socc ? 'socchiusi' : tri ? 'triste' : fermo ? 'fermo' : null;
    // la riga in basso: il gesto visto, oppure cosa non va (faccia persa, testa girata, poca luce), oppure il messaggio normale
    $('#fcam .fcam-schermo').classList.toggle('fcam-con-gatto', !!gesto);
    if (base && !scatta.conto && ora > avvisoFino) {
      stato(gesto ? NOMI[gesto]
        : ric.viso && ora - visoVistoA > 1500 ? (luce < 45 ? '💡 C\'è poca luce: non vedo la tua faccia' : '🙂 Non vedo la tua faccia: mettiti dritto davanti alla fotocamera')
          : puntiViso && G.testaGirata(puntiViso) ? '↩️ Gira la faccia verso la fotocamera'
            : luce < 45 ? '💡 Poca luce: i gesti si riconoscono peggio' : base);
    }
    if (gesto && gesto !== gestoPrima) { volte[gesto] = (volte[gesto] || 0) + 1; miao(gesto); } // ogni volta che rifai il gesto, l'altro gatto
    gestoPrima = gesto;
    const scelto = gesto && `.fcam-${GATTI[gesto][(volte[gesto] - 1) % GATTI[gesto].length]}`;
    for (const sel of TUTTI) mostra(sel, sel === scelto);
    if (prova && ora - provaA > 250) { provaA = ora; numeri(ora); }
  }

  // un gesto vale dopo n controlli di fila e smette dopo 3 controlli senza (~0,2 s: niente sfarfallio, ma scattante)
  function conta(k, si, n) {
    const c = conti[k] || (conti[k] = { su: 0, giu: 0 });
    if (si) { c.su++; c.giu = 0; } else if (++c.giu > 2) c.su = 0;
    return c.su >= n;
  }

  // !foto prova: i numeri dei gesti sotto il video, per capire perché uno non scatta (e regolare le soglie)
  function numeri(ora) {
    const p = $('#fcam .fcam-prova');
    if (!p) return;
    const e = espressioni || {}, f = (x) => (x || 0).toFixed(2), si = (k) => (uscite[k] ? ' ✅' : '');
    const del = (n) => (ric[n] ? ric[n].delegate : 'no');
    p.textContent = [
      `faccia: ${puntiViso ? 'sì' : 'NO'} · testa girata ${f(G.girata(puntiViso))} (max 0.20) · luce ${Math.round(luce)} (poca <45)`,
      `mani: ${trovate.length} · controllo ${Math.round(tempoMedio)} ms${tempoMedio > 35 ? ' (lento: a turno)' : ''} · mani ${del('mani')}, viso ${del('viso')}`,
      `☝️ dito alzato${si('dito')}`,
      `😛 lingua ${lingua.prova || '–'}${si('lingua')}`,
      `😮 bocca ${f(e.jawOpen)} (serve 0.45)${si('aperta')}`,
      `😉 occhiolino ${occhio.prova || '–'}${si('occhiolino')}`,
      `😠 arrabbiato ${rabbia.prova || '–'}${si('arrabbiato')}`,
      `😑 socchiusi ${socchiusi.prova || '–'}${si('socchiusi')}`,
      `😢 triste ${tristezza.prova || '–'}${si('triste')}`,
      `🧍 fermo da ${((ora - fermoDa) / 1000).toFixed(1)} s (serve 3)`,
    ].join('\n');
  }

  // un piccolo "miao" quando arriva un gatto (ognuno un po' diverso); segue l'audio del sito (🔇 = muto)
  const TONI = { dito: 780, lingua: 950, aperta: 620, arrabbiato: 420, occhiolino: 1100, socchiusi: 520, triste: 480, fermo: 700 };
  let audio = null;
  function muto() {
    const b = document.getElementById('suono');
    return (window.Boss && Boss.attivo) || !b || b.getAttribute('aria-pressed') === 'false';
  }
  function miao(gesto) {
    if (muto()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime, f0 = TONI[gesto] || 700, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0 * 0.8, t);
      o.frequency.linearRampToValueAtTime(f0 * 1.25, t + 0.12);
      o.frequency.linearRampToValueAtTime(f0 * (gesto === 'triste' ? 0.5 : 0.7), t + 0.38);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.42);
    } catch { /* niente audio */ }
  }

  // 📸 foto ricordo: 3 secondi per mettersi in posa, poi tu (come ti vedi, a specchio) e accanto il gatto che c'era;
  // la foto si scarica sul tuo dispositivo, non va da nessuna parte
  function scatta() {
    if (!flusso || scatta.conto) return;
    const c = $('#fcam .fcam-conto');
    let n = 3;
    c.textContent = n; c.hidden = false;
    scatta.conto = setInterval(() => {
      if (--n > 0) { c.textContent = n; return; }
      clearInterval(scatta.conto); scatta.conto = 0; c.hidden = true;
      salvaFoto();
    }, 1000);
  }
  function salvaFoto() {
    const v = $('#fcam .fcam-video');
    if (!flusso || !v || v.readyState < 2) return;
    const w = v.videoWidth || 640, h = v.videoHeight || 480;
    const gatto = [...document.querySelectorAll('#fcam .fcam-filtro')].filter((d) => !d.hidden).map((d) => d.querySelector('.fcam-gatto')).find((i) => i && i.complete && i.naturalWidth);
    const tela = document.createElement('canvas');
    tela.width = gatto ? w * 2 : w; tela.height = h;
    const x = tela.getContext('2d');
    x.save(); x.translate(w, 0); x.scale(-1, 1); x.drawImage(v, 0, 0, w, h); x.restore();
    if (gatto) { // come nella finestra: il gatto intero (non si taglia) e dietro lo stesso gatto sfocato
      const nw = gatto.naturalWidth, nh = gatto.naturalHeight;
      const cop = Math.max(w / nw, h / nh), sta = Math.min(w / nw, h / nh);
      x.save(); x.beginPath(); x.rect(w, 0, w, h); x.clip();
      x.filter = 'blur(18px) brightness(.6)'; // dove il filtro non c'è (vecchi Safari) resta solo più scuro
      x.drawImage(gatto, w + (w - nw * cop) / 2, (h - nh * cop) / 2, nw * cop, nh * cop);
      x.filter = 'none';
      if (x.filter !== 'none') { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(w, 0, w, h); }
      x.drawImage(gatto, w + (w - nw * sta) / 2, (h - nh * sta) / 2, nw * sta, nh * sta); x.restore();
    }
    tela.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `fotocamera-magica-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      avvisa('📸 Foto salvata!');
    }, 'image/png');
  }

  // per il colore della lingua: solo la parte bassa del viso (dal naso a sotto il mento, da una guancia all'altra) presa
  // a piena risoluzione e portata a 96×96, così la bocca ha sempre abbastanza pixel anche se sei lontano. Torna i
  // pixel e i punti del viso spostati nel ritaglio (stessa misura da 0 a 1).
  const R = 96;
  function boccaDi(v, k) {
    const c = boccaDi.c || (boccaDi.c = document.createElement('canvas'));
    if (c.width !== R) { c.width = R; c.height = R; }
    const x = c.getContext('2d', { willReadFrequently: true });
    const vw = v.videoWidth || 640, vh = v.videoHeight || 480, alto = k[152].y - k[10].y;
    const x0 = Math.max(0, Math.min(k[234].x, k[454].x)), x1 = Math.min(1, Math.max(k[234].x, k[454].x));
    const y0 = Math.max(0, k[1].y), y1 = Math.min(1, k[152].y + alto * 0.08);
    const sw = x1 - x0, sh = y1 - y0;
    if (sw <= 0.01 || sh <= 0.01) return [null, 0, 0, null];
    x.drawImage(v, x0 * vw, y0 * vh, sw * vw, sh * vh, 0, 0, R, R);
    const kk = k.map((p) => ({ x: (p.x - x0) / sw, y: (p.y - y0) / sh }));
    return [x.getImageData(0, 0, R, R).data, R, R, kk];
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

  // ---------- collegamenti ----------
  document.addEventListener('DOMContentLoaded', () => {
    const b = $('#apri-fotocamera');
    if (b) b.addEventListener('click', attiva);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (flusso || accensione)) spegni(); });
  if (window.Boss && Boss.onCambio) Boss.onCambio((a) => { if (a) spegni(); });

  // "!foto" in chat: accende (o spegne) la fotocamera solo per chi lo scrive, non va agli altri.
  // "!foto prova": accende e mostra (o nasconde) i numeri dei gesti.
  function comando(testo) {
    const m = /^!foto( prova)?$/i.exec(String(testo).trim());
    if (!m) return false;
    if (m[1]) {
      prova = !prova;
      const p = finestra().querySelector('.fcam-prova');
      p.hidden = !prova; if (!prova) p.textContent = '';
      attiva();
    } else if (flusso || accensione) spegni(); else attiva();
    return true;
  }

  return { attiva, spegni, comando, get accesa() { return !!flusso; } };
})();
