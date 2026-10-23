// BOSS KEY: la pagina delle dispense che copre tutto il sito.
// È globale: va caricato per primo e non dipende da nessun gioco.
// - All'apertura (e a ogni ricarica) il sito parte sempre dalle dispense: è la prima barriera per chi non sa.
// - Esc apre la pagina finta; "/", "\" o scrivere "gioca" riportano indietro; sul telefono si tiene premuto
//   il logo per 3 secondi. Nessun pulsante visibile riporta al gioco.
// - La partita resta viva sotto (stessa pagina, stessa connessione): nulla viene chiuso o perso.
// - Titolo, favicon e indirizzo cambiano senza aggiungere voci alla cronologia.
// - Se esci dalla finestra per più di X secondi, al ritorno trovi le dispense.
// - Mentre è attiva, i suoni del sito sono sospesi.
window.Boss = (() => {
  const TITOLO_FINTO = 'Dispense di Informatica · Informatica Facile';
  const INDIRIZZO_FINTO = '/dispense';
  const FAVICON_FINTA = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M7 2h12l7 7v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' fill='#1a5fb4'/><path d='M19 2v5a2 2 0 0 0 2 2h5z' fill='#8fb4e3'/><rect x='9' y='14' width='13' height='2' rx='1' fill='#fff'/><rect x='9' y='18' width='13' height='2' rx='1' fill='#fff'/><rect x='9' y='22' width='9' height='2' rx='1' fill='#fff'/></svg>");
  const PAROLA = 'gioca';
  const CFG_CHIAVE = 'if:studio';

  // ---------- impostazioni (finestra grigia) ----------
  // la soglia va da 0 (subito: appena si esce dalla finestra) a 5 secondi (predefinito 2)
  const SECONDI_MIN = 0, SECONDI_MAX = 5, SECONDI_BASE = 2;
  const cfg = { grigia: true, secondi: SECONDI_BASE, gesto: 'entrambi' };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_CHIAVE) || '{}')); } catch {}
  const secondiValidi = (v) => {
    const n = v === '' || v == null ? NaN : Number(v);
    return Number.isFinite(n) ? Math.min(SECONDI_MAX, Math.max(SECONDI_MIN, Math.round(n))) : SECONDI_BASE;
  };
  cfg.secondi = secondiValidi(cfg.secondi); // chi aveva salvato un valore vecchio (per esempio 25) scende a 5
  if (!['logo', 'angolo', 'entrambi'].includes(cfg.gesto)) cfg.gesto = 'entrambi';
  function config(nuove) {
    if (nuove) {
      if ('grigia' in nuove) cfg.grigia = !!nuove.grigia;
      if ('secondi' in nuove) cfg.secondi = secondiValidi(nuove.secondi);
      if ('gesto' in nuove && ['logo', 'angolo', 'entrambi'].includes(nuove.gesto)) cfg.gesto = nuove.gesto;
      try { localStorage.setItem(CFG_CHIAVE, JSON.stringify(cfg)); } catch {}
    }
    return { ...cfg };
  }

  let attivo = false;
  let inCorso = false; // durante l'overlay di caricamento
  const ascoltatori = [];
  const emetti = () => ascoltatori.forEach((f) => { try { f(attivo); } catch (e) { console.error(e); } });

  // ---------- titolo della scheda ----------
  // Chiunque scriva document.title (anche i giochi futuri) aggiorna il titolo "vero",
  // che si vede solo quando la pagina finta è chiusa.
  const descTitolo = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
  // nella pagina il titolo di partenza è già quello finto; quello vero sta in data-vero
  const tagTitolo = document.querySelector('title[data-vero]');
  let titoloVero = tagTitolo ? tagTitolo.dataset.vero : descTitolo.get.call(document);
  Object.defineProperty(document, 'title', {
    configurable: true,
    get() { return attivo ? TITOLO_FINTO : titoloVero; },
    set(v) { titoloVero = String(v); if (!attivo) descTitolo.set.call(document, titoloVero); },
  });

  // ---------- favicon ----------
  let iconeVere = [];
  function cambiaFavicon(finta) {
    const icone = [...document.querySelectorAll('link[rel~="icon"]')];
    if (finta) {
      iconeVere = icone.map((l) => [l, l.dataset.vero || l.href]); // all'apertura l'icona è già quella finta
      icone.forEach((l) => l.removeAttribute('data-vero'));
      if (!icone.length) { const l = document.createElement('link'); l.rel = 'icon'; document.head.append(l); icone.push(l); }
      icone.forEach((l) => { l.href = FAVICON_FINTA; });
    } else {
      iconeVere.forEach(([l, h]) => { l.href = h; });
      iconeVere = [];
    }
  }

  // colore della barra del browser sul telefono: bianco sulle dispense, verde sul sito vero
  function cambiaColoreBarra(finta) {
    const m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    if (!m.dataset.vero) m.dataset.vero = m.content;
    m.content = finta ? '#ffffff' : m.dataset.vero;
  }

  // ---------- indirizzo e cronologia ----------
  // Si usa solo replaceState: nella cronologia non resta traccia dei giochi.
  // Se mentre le dispense sono aperte il sito cambia indirizzo, lo teniamo da parte per il ritorno.
  const replaceVero = history.replaceState.bind(history);
  const pushVero = history.pushState.bind(history);
  let urlVero = null;
  const qui = () => location.pathname + location.search + location.hash;
  function risolvi(url) {
    const u = new URL(url, location.origin + (urlVero || '/'));
    return u.pathname + u.search + u.hash;
  }
  history.replaceState = (st, t, url) => {
    if (attivo && url != null) { urlVero = risolvi(url); salvaUrl(); return; }
    return replaceVero(st, t, url);
  };
  history.pushState = (st, t, url) => {
    if (attivo) { if (url != null) { urlVero = risolvi(url); salvaUrl(); } return; }
    return pushVero(st, t, url);
  };
  function salvaUrl() { try { sessionStorage.setItem('if:urlVero', urlVero || '/'); } catch {} }

  // ---------- suoni ----------
  // Ogni AudioContext creato nel sito viene registrato: così si possono zittire tutti insieme.
  const contesti = new Set();
  const sospesi = new Set();
  for (const nome of ['AudioContext', 'webkitAudioContext']) {
    const Originale = window[nome];
    if (!Originale) continue;
    window[nome] = class extends Originale {
      constructor(...a) { super(...a); contesti.add(this); if (attivo || muto) { this.suspend(); sospesi.add(this); } }
    };
  }
  // AUDIO SPENTO (pulsante 🔇 del sito, spento all'apertura): tutti i suoni sospesi e ogni video o audio parte muto
  let muto = false;
  const playVero = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) { if (muto) this.muted = true; return playVero.apply(this, a); };
  function silenzio(si) {
    muto = !!si;
    if (muto) {
      contesti.forEach((c) => { if (c.state === 'running') { c.suspend(); sospesi.add(c); } });
      document.querySelectorAll('audio, video').forEach((m) => { m.muted = true; });
    } else if (!attivo) {
      sospesi.forEach((c) => c.resume().catch(() => {}));
      sospesi.clear();
      document.querySelectorAll('audio, video').forEach((m) => { m.muted = false; });
    }
  }
  const mediaPausa = new Set();
  function zittisci(si) {
    if (si) {
      contesti.forEach((c) => { if (c.state === 'running') { c.suspend(); sospesi.add(c); } });
      document.querySelectorAll('audio, video').forEach((m) => { if (!m.paused) { m.pause(); mediaPausa.add(m); } });
    } else {
      if (!muto) { sospesi.forEach((c) => c.resume().catch(() => {})); sospesi.clear(); }
      mediaPausa.forEach((m) => m.play().catch(() => {}));
      mediaPausa.clear();
    }
  }

  // ---------- elementi della pagina ----------
  let copertura, caricamento, focusPrima, inerti = [];
  function prepara() {
    if (copertura) return;
    copertura = document.createElement('div');
    copertura.id = 'studio';
    copertura.hidden = true;
    copertura.innerHTML = window.BossPagina ? window.BossPagina.html() : '<h1>Dispense</h1>';
    caricamento = document.createElement('div');
    caricamento.id = 'studio-carica';
    caricamento.hidden = true;
    caricamento.innerHTML = '<div class="studio-spinner" aria-hidden="true"></div><p>Caricamento…</p>';
    document.body.append(copertura, caricamento);
    if (window.BossPagina) window.BossPagina.avvia(copertura);
    ascoltaLogo();
  }
  function rendiInerte(si) {
    if (si) {
      inerti = [...document.body.children].filter((el) => el !== copertura && el !== caricamento && !el.inert);
      inerti.forEach((el) => { el.inert = true; });
    } else {
      inerti.forEach((el) => { el.inert = false; });
      inerti = [];
    }
  }

  // ---------- "sta succedendo qualcosa?" ----------
  let ultimaAttivita = 0;
  const attivita = () => { ultimaAttivita = Date.now(); };
  function succedeQualcosa() {
    if (Date.now() - ultimaAttivita < 2200) return true;
    try {
      return document.getAnimations().some((a) => a.playState === 'running'
        && !(copertura && copertura.contains(a.effect && a.effect.target))
        && a.effect && a.effect.getTiming().iterations !== Infinity);
    } catch { return false; }
  }
  window.addEventListener('pointerdown', attivita, true);

  // ---------- rotellina del mouse (clic centrale): apre le dispense come Esc, ovunque ----------
  // (anche sopra un link: il browser non apre la nuova scheda)
  const clicCentrale = (e) => e.button === 1;
  window.addEventListener('mousedown', (e) => { if (!clicCentrale(e)) return; e.preventDefault(); e.stopImmediatePropagation(); if (!attivo) attiva(); }, true);
  window.addEventListener('auxclick', (e) => { if (clicCentrale(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---------- attivazione ----------
  function attiva({ subito = false } = {}) {
    if (attivo || inCorso) return;
    prepara();
    focusPrima = document.activeElement;
    if (focusPrima && focusPrima.blur) focusPrima.blur();
    attivo = true;
    urlVero = qui().startsWith(INDIRIZZO_FINTO) ? (urlVero || leggiUrlSalvato()) : qui();
    salvaUrl();
    descTitolo.set.call(document, TITOLO_FINTO);
    cambiaFavicon(true);
    cambiaColoreBarra(true);
    replaceVero(history.state, '', INDIRIZZO_FINTO + (window.BossPagina ? window.BossPagina.query() : ''));
    zittisci(true);
    rendiInerte(true);
    document.documentElement.classList.add('in-studio');
    emetti();

    const mostraPagina = () => {
      caricamento.hidden = true;
      copertura.hidden = false;
      document.documentElement.classList.remove('avvio-studio');
      inCorso = false;
      if (window.BossPagina) window.BossPagina.mostrata(copertura);
    };
    if (!subito && succedeQualcosa()) {
      // copertura immediata con un finto caricamento, poi le dispense
      inCorso = true;
      caricamento.hidden = false;
      setTimeout(mostraPagina, 380 + Math.random() * 420);
    } else mostraPagina();
  }

  function disattiva() {
    if (!attivo || inCorso) return;
    attivo = false;
    copertura.hidden = true;
    caricamento.hidden = true;
    document.documentElement.classList.remove('in-studio');
    rendiInerte(false);
    replaceVero(history.state, '', urlVero || '/');
    try { sessionStorage.removeItem('if:urlVero'); } catch {}
    urlVero = null;
    cambiaFavicon(false);
    cambiaColoreBarra(false);
    descTitolo.set.call(document, titoloVero);
    zittisci(false);
    if (focusPrima && document.contains(focusPrima) && focusPrima.focus) {
      try { focusPrima.focus({ preventScroll: true }); } catch {}
    }
    emetti();
  }
  const leggiUrlSalvato = () => { try { return sessionStorage.getItem('if:urlVero') || '/'; } catch { return '/'; } };

  // ---------- tastiera ----------
  // (inizio: regole dei tasti di ritorno, controllate anche da npm test)
  // "/" e "\\" e la parola "gioca" riportano alla partita solo fuori dai campi di testo: dentro un campo si sta
  // scrivendo una risposta (per esempio 192.168.1.0/24). Esc funziona sempre.
  function tastoRitorno(tasto, inCampo, modificatori) { return !inCampo && !modificatori && (tasto === '/' || tasto === '\\'); }
  function contaParola(digitato, tasto, inCampo) { return inCampo || tasto.length !== 1 ? '' : (digitato + tasto.toLowerCase()).slice(-PAROLA.length); }
  // (fine: regole dei tasti di ritorno)
  let digitato = '';
  window.addEventListener('keydown', (e) => {
    if (!attivo) {
      if (e.key !== 'Escape' || e.repeat) { if (e.key !== 'Escape') attivita(); return; }
      e.preventDefault();
      e.stopImmediatePropagation();
      attiva();
      return;
    }
    // Pagina finta aperta: i tasti non arrivano ai giochi sotto.
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); return; }
    const inCampo = e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable]');
    if (tastoRitorno(e.key, !!inCampo, e.ctrlKey || e.metaKey || e.altKey)) {
      e.preventDefault();
      disattiva();
      return;
    }
    digitato = contaParola(digitato, e.key, !!inCampo);
    if (digitato === PAROLA) { digitato = ''; e.preventDefault(); disattiva(); }
  }, true);

  // ---------- pressione lunga sul logo (serve sul telefono, dove non c'è la tastiera) ----------
  // (inizio: pressione lunga sul logo)
  // Tenendo premuto il logo delle dispense per 3 secondi si torna al gioco. Se il dito (o il mouse) si sposta
  // di più di 15 pixel o si stacca prima, non succede niente. Nessun segno visibile: lo sa solo chi lo sa.
  const PRESSIONE_MS = 3000, TOLLERANZA_PX = 15;
  function pressioneLunga(ora, stato, evento) {
    // stato: null oppure { dal, x, y }; restituisce { stato, esci }
    if (evento.tipo === 'giu') return { stato: evento.suLogo ? { dal: ora, x: evento.x, y: evento.y } : null, esci: false };
    if (!stato) return { stato: null, esci: false };
    if (evento.tipo === 'muovi') return Math.hypot(evento.x - stato.x, evento.y - stato.y) > TOLLERANZA_PX ? { stato: null, esci: false } : { stato, esci: false };
    if (evento.tipo === 'su') return { stato: null, esci: false };
    if (evento.tipo === 'tempo') return ora - stato.dal >= PRESSIONE_MS ? { stato: null, esci: true } : { stato, esci: false };
    return { stato, esci: false };
  }
  // (fine: pressione lunga sul logo)
  // (inizio: tre tocchi nell'angolo)
  // In alternativa (o insieme, secondo le impostazioni): tre tocchi veloci nell'angolo in alto a destra, entro un
  // secondo e mezzo. Anche qui nessun segno visibile.
  const ANGOLO_PX = 70, TOCCHI = 3, TOCCHI_MS = 1500;
  function treTocchi(ora, stato, x, y, larghezza) {
    // stato: null oppure { n, dal }; restituisce { stato, esci }
    if (x < larghezza - ANGOLO_PX || y > ANGOLO_PX) return { stato: null, esci: false };
    const st = stato && ora - stato.dal <= TOCCHI_MS ? { n: stato.n + 1, dal: stato.dal } : { n: 1, dal: ora };
    return st.n >= TOCCHI ? { stato: null, esci: true } : { stato: st, esci: false };
  }
  // (fine: tre tocchi nell'angolo)
  let tocchi = null;
  let pressione = null, tPressione;
  function eventoLogo(ev) {
    const r = pressioneLunga(Date.now(), pressione, ev);
    pressione = r.stato;
    clearTimeout(tPressione);
    if (pressione) tPressione = setTimeout(() => eventoLogo({ tipo: 'tempo' }), PRESSIONE_MS - (Date.now() - pressione.dal) + 10);
    if (r.esci && attivo) {
      // il dito che si stacca non deve "cliccare" il sito che c'è sotto
      const ferma = (e) => { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', ferma, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', ferma, { capture: true }), 800);
      disattiva();
    }
  }
  function ascoltaLogo() {
    copertura.addEventListener('pointerdown', (e) => {
      if (cfg.gesto !== 'logo') {
        const r = treTocchi(Date.now(), tocchi, e.clientX, e.clientY, window.innerWidth);
        tocchi = r.stato;
        if (r.esci && attivo) {
          const ferma = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
          window.addEventListener('click', ferma, { capture: true, once: true });
          setTimeout(() => window.removeEventListener('click', ferma, { capture: true }), 800);
          disattiva(); return;
        }
      }
      if (cfg.gesto === 'angolo') return;
      const suLogo = !!(e.target.closest && e.target.closest('.st-logo'));
      // sul logo niente eventi del mouse "di compatibilità" dopo il dito (spostavano il cursore fuori dal campo del nome)
      if (suLogo) e.preventDefault();
      eventoLogo({ tipo: 'giu', suLogo, x: e.clientX, y: e.clientY });
    });
    window.addEventListener('pointermove', (e) => { if (pressione) eventoLogo({ tipo: 'muovi', x: e.clientX, y: e.clientY }); }, true);
    for (const t of ['pointerup', 'pointercancel']) window.addEventListener(t, () => { if (pressione) eventoLogo({ tipo: 'su' }); }, true);
    // niente menu del tasto destro o del dito lungo sul logo
    copertura.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.st-logo')) e.preventDefault(); });
  }

  // ---------- finestra grigia ----------
  let uscitoAlle = null;
  let tUscita;
  function uscito() {
    if (attivo || !cfg.grigia || uscitoAlle) return;
    // soglia 0: le dispense si aprono subito, così anche l'anteprima delle app del telefono mostra solo loro
    if (cfg.secondi === 0) { attiva({ subito: true }); return; }
    uscitoAlle = Date.now();
    clearTimeout(tUscita);
    tUscita = setTimeout(() => { if (uscitoAlle && !attivo) attiva({ subito: true }); }, cfg.secondi * 1000);
  }
  function rientrato() {
    clearTimeout(tUscita);
    if (uscitoAlle && !attivo && cfg.grigia && Date.now() - uscitoAlle >= cfg.secondi * 1000) attiva({ subito: true });
    uscitoAlle = null;
  }
  window.addEventListener('blur', uscito);
  window.addEventListener('focus', rientrato);
  document.addEventListener('visibilitychange', () => (document.hidden ? uscito() : document.hasFocus() && rientrato()));

  // All'apertura e a ogni ricarica si parte SEMPRE dalle dispense (prima barriera per chi non sa come uscirne).
  // Se si ricarica mentre si "studia" (indirizzo /dispense), al ritorno si va dove si era.
  const eraInStudio = location.pathname.startsWith(INDIRIZZO_FINTO);
  if (eraInStudio) urlVero = leggiUrlSalvato();
  // Lo script sta in fondo al <body>: la pagina è già tutta letta, quindi le dispense si disegnano SUBITO,
  // senza aspettare il caricamento degli altri script (prima per un attimo si vedeva lo sfondo verde del sito).
  const avvio = () => { prepara(); attiva({ subito: true }); };
  if (document.body) avvio();
  else document.addEventListener('DOMContentLoaded', avvio);

  return {
    attiva,
    disattiva,
    get attivo() { return attivo; },
    attivita,
    config,
    onCambio(f) { ascoltatori.push(f); },
    silenzio,
    get muto() { return muto; },
    replaceStato: (url) => replaceVero(history.state, '', url), // usato dalla pagina finta per le sue sezioni
  };
})();
