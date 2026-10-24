// DRAGHI E SEGRETE: la voce narrante. Quando il master (l'IA, quello di riserva o una persona) scrive, una voce legge
// il testo ad alta voce:
// - la voce è quella neurale di Microsoft Edge (Diego), che il server chiede frase per frase (/voce, vedi voce.js)
// - lettura fluida: il testo si pulisce (niente grassetti, asterischi, titoli, elenchi, emoji, link), si spezza in
//   frasi e le frasi si mettono in coda; le prossime si scaricano mentre si ascolta la prima e si suonano una dietro
//   l'altra con Web Audio, con una pausa breve tra le frasi e una più lunga tra i paragrafi
// - se Edge non risponde legge la voce italiana del browser (speechSynthesis), la migliore che c'è
// - la musica si abbassa mentre parla; il pulsante 🗣️ accanto alla 🎵 la spegne solo per te
// Parla solo con l'audio del sito acceso (🔇 all'apertura) e mai sulle dispense. Non rilegge il racconto vecchio:
// solo quello che il master scrive da quando si è al tavolo.
(() => {
  const MU = () => window.DraghiMusica;
  const VOCE = 'diego';
  const MAX_PEZZO = 260; // caratteri per richiesta: frasi brevi si uniscono, quelle lunghe si spezzano alle virgole
  const AVANTI = 3; // frasi scaricate in anticipo
  const PAUSA_FRASE = 0.12, PAUSA_PARAGRAFO = 0.45; // secondi
  let voglia = true;
  try { voglia = localStorage.getItem('if:drVoce') !== 'no'; } catch (e) { /* niente */ }

  // ---------- dal testo del master alle frasi da leggere ----------
  const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️‍⃣]/gu;
  function pulisci(testo) {
    return String(testo || '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [testo](link)
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(EMOJI, ' ')
      .replace(/^[ \t]*(#{1,6}|>+|[-*•·]|\d+[.)])[ \t]+/gm, '') // titoli, citazioni, elenchi
      .replace(/(\*\*|__|\*|~~|`+)/g, '')
      .replace(/(^|[\s(«“"])_([^_\n]+)_(?=[\s.,;:!?)»”"]|$)/gm, '$1$2') // _corsivo_
      .replace(/[ \t]*[—–][ \t]*/g, ', ') // le lineette fanno una pausa
      .replace(/\bPF\b/g, 'punti ferita')
      .replace(/\.{3,}/g, '…')
      .replace(/\s*,(\s*,)+/g, ',')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }
  // una frase troppo lunga si spezza alla virgola (o al punto e virgola) più vicina al mezzo, poi a uno spazio
  function spezza(f) {
    if (f.length <= MAX_PEZZO) return [f];
    const meta = f.length / 2;
    let taglio = -1;
    for (const m of f.matchAll(/[,;:](?=\s)/g)) if (taglio < 0 || Math.abs(m.index - meta) < Math.abs(taglio - meta)) taglio = m.index;
    if (taglio < 20 || taglio > f.length - 20) taglio = f.lastIndexOf(' ', Math.min(f.length - 1, MAX_PEZZO));
    if (taglio < 1) taglio = MAX_PEZZO;
    return [...spezza(f.slice(0, taglio + 1).trim()), ...spezza(f.slice(taglio + 1).trim())].filter(Boolean);
  }
  // → [{ testo, pausa }]: la prima frase da sola (così la voce parte subito), poi frasi unite fino a MAX_PEZZO
  function frasi(testo) {
    const out = [];
    const paragrafi = pulisci(testo).split(/\n+/).map((x) => x.trim()).filter((x) => /[\p{L}\p{N}]/u.test(x));
    for (const par of paragrafi) {
      const pezzi = (par.match(/[^.!?…]+(?:[.!?…]+[»”"’)]*|$)/g) || [par]).map((x) => x.trim()).filter(Boolean).flatMap(spezza);
      let cur = '';
      const chiudi = () => { if (cur) out.push({ testo: cur, pausa: PAUSA_FRASE }); cur = ''; };
      for (const f of pezzi) {
        if (cur && (out.length === 0 || cur.length + 1 + f.length > MAX_PEZZO)) chiudi();
        cur = cur ? `${cur} ${f}` : f;
      }
      chiudi();
      if (out.length) out[out.length - 1].pausa = PAUSA_PARAGRAFO;
    }
    return out;
  }

  // ---------- chi ascolta: cosa è già stato letto ----------
  const S = { letto: null, inGioco: false };
  function acceso() {
    const b = document.getElementById('suono');
    return voglia && S.inGioco && !(window.Boss && window.Boss.attivo) && !(b && b.getAttribute('aria-pressed') === 'false');
  }
  function aggiorna(ctx) {
    const p = ctx && ctx.partita;
    S.inGioco = !!(p && document.querySelector('#panno .dr'));
    pulsante();
    if (!p || !p.racconto) return;
    const voci = p.racconto.filter((v) => v.tipo === 'master');
    const ultimo = p.racconto.length ? p.racconto[p.racconto.length - 1].id : 0;
    // appena arrivati al tavolo (o una partita nuova) il racconto di prima non si legge
    if (S.letto == null || ultimo < S.letto) { S.letto = ultimo; return; }
    const nuove = voci.filter((v) => v.id > S.letto);
    S.letto = Math.max(S.letto, ultimo);
    if (!acceso()) return;
    for (const v of nuove) metti(v.testo);
  }

  // ---------- la coda e il lettore ----------
  const R = { ac: null, uscita: null, coda: [], fonti: [], fine: 0, giro: 0, gira: false, edgeGiuFino: 0, browser: false };
  function audio() {
    if (!R.ac) {
      try { R.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      R.uscita = R.ac.createGain(); R.uscita.gain.value = 1; R.uscita.connect(R.ac.destination);
    }
    if (R.ac.state === 'suspended' && R.ac.resume) R.ac.resume().catch(() => {});
    return R.ac;
  }
  function metti(testo) {
    for (const f of frasi(testo)) R.coda.push({ ...f, audio: null });
    if (R.coda.length > 60) R.coda.splice(0, R.coda.length - 60); // si è rimasti molto indietro: si salta il vecchio
    prepara();
    if (!R.gira) leggi();
  }
  // scarica le prossime frasi da Edge (null = si legge con la voce del browser)
  function prepara() {
    for (const it of R.coda.slice(0, AVANTI)) if (!it.audio) it.audio = scarica(it.testo);
  }
  async function scarica(testo) {
    const ac = audio();
    if (!ac || !window.fetch || Date.now() < R.edgeGiuFino) return null;
    const stop = window.AbortController ? new window.AbortController() : null;
    const timer = setTimeout(() => stop && stop.abort(), 9000);
    try {
      const r = await window.fetch(`/voce?v=${VOCE}&t=${encodeURIComponent(testo)}`, stop ? { signal: stop.signal } : {});
      if (!r.ok) { if (r.status === 503) R.edgeGiuFino = Date.now() + 60000; return null; }
      const dati = await r.arrayBuffer();
      return await new Promise((ok, no) => { const pr = ac.decodeAudioData(dati, ok, no); if (pr && pr.then) pr.then(ok, no); });
    } catch (e) {
      R.edgeGiuFino = Date.now() + 20000;
      return null;
    } finally { clearTimeout(timer); }
  }
  const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function leggi() {
    R.gira = true;
    const giro = R.giro;
    try {
      while (R.coda.length && giro === R.giro) {
        prepara();
        const it = R.coda[0];
        const buf = await it.audio;
        if (giro !== R.giro) return;
        R.coda.shift();
        prepara();
        const ac = R.ac;
        if (buf && ac) {
          // in fila dietro la frase che sta suonando
          const t0 = Math.max(ac.currentTime + 0.04, R.fine);
          const src = ac.createBufferSource(); src.buffer = buf; src.connect(R.uscita); src.start(t0);
          R.fonti.push(src); src.onended = () => { R.fonti = R.fonti.filter((x) => x !== src); };
          R.fine = t0 + buf.duration + it.pausa;
          // non si programma troppo avanti: si aspetta finché mancano un paio di secondi
          while (giro === R.giro && R.fine - ac.currentTime > 2.5) await aspetta(200);
        } else {
          // la voce del browser: prima finisce quello che sta suonando
          while (giro === R.giro && ac && ac.currentTime < R.fine) await aspetta(60);
          if (giro !== R.giro) return;
          await browser(it.testo);
          await aspetta(it.pausa * 1000);
          if (ac) R.fine = ac.currentTime;
        }
      }
    } finally { if (giro === R.giro) R.gira = false; }
  }
  // la voce italiana migliore del browser
  function voceBrowser() {
    const tutte = (window.speechSynthesis.getVoices() || []).filter((v) => /^it/i.test(v.lang));
    const voto = (v) => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/diego|luca|cosimo|giuseppe|isabella|elsa|alice|federica/i.test(v.name) ? 1 : 0) + (v.localService ? 0 : 1);
    return tutte.sort((a, b) => voto(b) - voto(a))[0] || null;
  }
  function browser(testo) {
    const sy = window.speechSynthesis;
    if (!sy || !window.SpeechSynthesisUtterance) return Promise.resolve();
    return new Promise((ok) => {
      const u = new window.SpeechSynthesisUtterance(testo);
      u.lang = 'it-IT'; u.rate = 1; u.pitch = 0.95;
      const v = voceBrowser(); if (v) u.voice = v;
      let fatto = false;
      const fine = () => { if (!fatto) { fatto = true; clearTimeout(t); R.browser = false; ok(); } };
      const t = setTimeout(fine, 4000 + testo.length * 110); // certi browser non mandano mai «fine»
      u.onend = fine; u.onerror = fine;
      R.browser = true;
      sy.speak(u);
    });
  }
  function zitto() {
    R.giro++; R.gira = false; R.coda = [];
    for (const s of R.fonti) { try { s.stop(); } catch (e) { /* niente */ } }
    R.fonti = []; R.fine = 0;
    if (R.browser && window.speechSynthesis) window.speechSynthesis.cancel();
    R.browser = false;
  }
  const parla = () => !!(R.browser || (R.ac && R.ac.currentTime < R.fine - 0.1) || R.coda.length);
  // l'audio del browser si sblocca al primo tocco; col sito zittito, sulle dispense o fuori dal gioco si tace;
  // la musica si abbassa mentre si parla
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { if (R.ac && R.ac.state === 'suspended') R.ac.resume().catch(() => {}); }, true);
  setInterval(() => {
    if (S.inGioco && !document.querySelector('#panno .dr')) { S.inGioco = false; S.letto = null; }
    if (!acceso() && (R.coda.length || R.fonti.length || R.browser)) zitto();
    if (MU() && MU().abbassa) MU().abbassa(acceso() && parla());
  }, 250);

  // ---------- il pulsante 🗣️ (solo per te), accanto alla 🎵 ----------
  function pulsante() {
    const box = document.querySelector('#panno .dr');
    if (!box) return;
    let b = box.querySelector('.dr-narratore');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'dr-narratore';
      b.addEventListener('click', (e) => {
        e.stopPropagation(); b.blur();
        voglia = !voglia;
        try { localStorage.setItem('if:drVoce', voglia ? 'si' : 'no'); } catch (er) { /* niente */ }
        if (voglia) audio(); else zitto();
        pulsante();
      });
      const mus = box.querySelector('.dr-musica');
      if (mus) { if (mus.classList.contains('in-riga')) b.classList.add('in-riga'); mus.after(b); } else box.appendChild(b);
    }
    const sito = document.getElementById('suono'), muto = sito && sito.getAttribute('aria-pressed') === 'false';
    b.textContent = voglia && !muto ? '🗣️' : '🤐';
    b.classList.toggle('spenta', !voglia || muto);
    b.title = muto ? 'Voce del master: accendi prima l\'audio del sito (🔇)' : voglia ? 'Voce del master accesa: tocca per spegnerla (solo per te)' : 'Voce del master spenta: tocca per farti leggere il racconto';
    b.setAttribute('aria-label', b.title);
  }

  window.DraghiVoce = { aggiorna, pulisci, frasi, spezza, stato: () => ({ coda: R.coda.length, parla: parla(), letto: S.letto }), _prova: { S, R, zitto } };
})();
