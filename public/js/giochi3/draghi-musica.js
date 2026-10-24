// DRAGHI E SEGRETE: la colonna sonora. Tutta generata nel browser con Web Audio (niente file da scaricare).
// - ogni AMBIENTAZIONE ha la sua musica: scala, tempo, strumenti e "colpo" di paura (Sevastopol: sintetizzatori freddi
//   e campane; PATHOS-II: archi lenti e vetro; Mount Massive: coro basso e un carillon stonato; le fantasy: flauti,
//   arpe, fisarmoniche, liuti, organi)
// - ogni ZONA ha il suo letto di rumori e la sua tonalità: macchinari e vapore nei settori industriali, ronzio dei neon
//   e bip dei monitor nei laboratori, lo scafo che cigola nelle stazioni di PATHOS-II, il silenzio subacqueo del
//   fondale (tutto ovattato, bolle, il canto lontano di qualcosa di enorme), pioggia nel cortile del manicomio, gocce
//   nelle fogne e nelle cripte, uccelli nei boschi, onde e gabbiani al porto, folla in città e in taverna…
// - cambia col MOMENTO: calma, esplorazione, mistero, tensione (battito del cuore), pericolo (la creatura è in zona:
//   archi tremolanti, battito veloce), caccia (vi insegue: tamburi e archi a martello), battaglia, festa, morte.
//   In tempo reale lo decide quello che vede e sente il personaggio (tick); a turni l'atmosfera del master, la caccia
//   della creatura e il combattimento
// Suona solo con l'audio del sito acceso (🔇 all'apertura); il pulsante 🎵 in alto la spegne solo per te. Quando il
// master parla (la voce narrante, draghi-voce.js) si abbassa.
(() => {
  const SCALE = { minore: [0, 2, 3, 5, 7, 8, 10], frigio: [0, 1, 3, 5, 7, 8, 10], dorico: [0, 2, 3, 5, 7, 9, 10], maggiore: [0, 2, 4, 5, 7, 9, 11], misolidio: [0, 2, 4, 5, 7, 9, 10], armonica: [0, 2, 3, 5, 7, 8, 11], lidio: [0, 2, 4, 6, 7, 9, 11], locrio: [0, 1, 3, 5, 6, 8, 10] };
  // la musica di ogni ambientazione: radice (nota MIDI del basso), scala, battiti al minuto, giro di accordi (gradi
  // della scala), strumenti del tappeto, della melodia e della battaglia, il colpo di paura
  const TEMI = {
    sevastopol: { radice: 38, scala: 'frigio', bpm: 62, giro: [0, 1, 5, 0, 3, 1], pad: 'synth', mel: 'campana', ost: 'archi', colpo: 'stridio', melodia: 0.6, buio: 0.55 },
    pathos: { radice: 36, scala: 'minore', bpm: 52, giro: [0, 5, 2, 6, 3, 4], pad: 'archi', mel: 'vetro', ost: 'archi', colpo: 'boato', melodia: 0.8, buio: 0.65 },
    manicomio: { radice: 37, scala: 'locrio', bpm: 66, giro: [0, 1, 0, 4, 3, 1], pad: 'coro', mel: 'carillon', ost: 'archi', colpo: 'stridio', melodia: 0.7, buio: 0.5 },
    classica: { radice: 43, scala: 'maggiore', bpm: 84, giro: [0, 4, 5, 3, 0, 3, 4, 4], pad: 'archi', mel: 'flauto', ost: 'ottoni', colpo: 'ottoni', melodia: 1, buio: 0.95 },
    oscura: { radice: 40, scala: 'armonica', bpm: 60, giro: [0, 5, 3, 4, 0, 1, 4, 4], pad: 'organo', mel: 'campana', ost: 'archi', colpo: 'boato', melodia: 0.7, buio: 0.6 },
    pirati: { radice: 45, scala: 'dorico', bpm: 108, giro: [0, 6, 5, 4, 0, 3, 6, 4], pad: 'fisarmonica', mel: 'fisarmonica', ost: 'ottoni', colpo: 'ottoni', melodia: 1.1, buio: 1 },
    citta: { radice: 41, scala: 'misolidio', bpm: 92, giro: [0, 6, 3, 0, 4, 3, 6, 4], pad: 'archi', mel: 'liuto', ost: 'archi', colpo: 'ottoni', melodia: 1, buio: 0.9 },
    selvaggia: { radice: 38, scala: 'dorico', bpm: 76, giro: [0, 3, 6, 0, 4, 3, 0, 6], pad: 'archi', mel: 'flauto', ost: 'tamburi', colpo: 'boato', melodia: 0.9, buio: 0.85 },
  };
  // ogni zona: il letto di rumori, di quanti semitoni sposta la musica (così ogni mappa ha la sua tonalità), quanto è
  // scura (filtro), l'umore minimo (nel nido non si è mai tranquilli) e se si è sott'acqua
  const ZONE = {
    // le aree horror (stile delle aree in horror.js)
    stazione: { letto: 'macchine', sposta: 0 }, uffici: { letto: 'computer', sposta: 3 }, alloggi: { letto: 'aria', sposta: 5 },
    medico: { letto: 'ospedale', sposta: -2 }, laboratorio: { letto: 'ospedale', sposta: 2 }, industriale: { letto: 'officina', sposta: -5, scuro: 0.8 },
    tram: { letto: 'binari', sposta: -3 }, nido: { letto: 'nido', sposta: 1, scuro: 0.6, minimo: 'tensione' },
    sottomarina: { letto: 'scafo', sposta: 0 }, fondale: { letto: 'abisso', sposta: -7, acqua: true },
    manicomio: { letto: 'corsie', sposta: 0, scuro: 0.85 }, fogne: { letto: 'fogne', sposta: -4, scuro: 0.7 }, cortile: { letto: 'pioggia', sposta: 2 },
    // i luoghi delle ambientazioni fantasy (tipi dei luoghi in mappe.js) e le scene di battaglia
    villaggio: { letto: 'campagna', sposta: 0 }, fattoria: { letto: 'campagna', sposta: 2 }, citta: { letto: 'folla', sposta: 2 },
    porto: { letto: 'mare', sposta: -3 }, lago: { letto: 'lago', sposta: 4 }, ponte: { letto: 'lago', sposta: 1 }, taverna: { letto: 'taverna', sposta: 5 },
    castello: { letto: 'castello', sposta: -2 }, torre: { letto: 'vento', sposta: 3 }, tempio: { letto: 'tempio', sposta: 7 },
    rovine: { letto: 'vento', sposta: -4, scuro: 0.85 }, dungeon: { letto: 'gocce', sposta: -5, scuro: 0.75 }, cripta: { letto: 'cripta', sposta: -1, scuro: 0.6, minimo: 'mistero' },
    grotta: { letto: 'gocce', sposta: -3, scuro: 0.8 }, miniera: { letto: 'miniera', sposta: -6, scuro: 0.8 }, foresta: { letto: 'bosco', sposta: 2 },
    montagna: { letto: 'bufera', sposta: -2 }, palude: { letto: 'palude', sposta: -6, scuro: 0.8 }, deserto: { letto: 'deserto', sposta: 1 },
    accampamento: { letto: 'fuoco', sposta: 4 }, strada: { letto: 'campagna', sposta: -1 }, altro: { letto: 'vento', sposta: 0 },
    menu: { letto: null, sposta: 0 },
  };
  // aree speciali che hanno una musica tutta loro (per id dell'area)
  const AREE = { abisso: { letto: 'abisso', sposta: -10, acqua: true, scuro: 0.4, minimo: 'mistero' }, wau: { letto: 'nido', sposta: -6, scuro: 0.5, minimo: 'tensione' }, motore: { letto: 'officina', sposta: -1, scuro: 0.6, minimo: 'tensione' } };
  const zonaDi = (k) => AREE[k] || ZONE[k] || ZONE.menu;
  // i rumori di ogni letto: parti continue [rumore marrone|bianco, filtro, frequenza, volume, lfo] o [tono, frequenza,
  // forma, volume, lfo] (lfo = [frequenza, profondità, 'g' volume | 'f' filtro]) e i suoni sparsi con la probabilità a battito
  const LETTI = {
    macchine: { parti: [['marrone', 'lowpass', 240, 0.16, [0.12, 0.35, 'g']], ['tono', 50, 'sine', 0.05], ['tono', 100, 'triangle', 0.01, [5.5, 0.4, 'g']]], eventi: { clank: 0.05, vapore: 0.03, cigolio: 0.02 } },
    computer: { parti: [['marrone', 'lowpass', 400, 0.08], ['tono', 120, 'sawtooth', 0.004], ['bianco', 'bandpass', 6000, 0.006]], eventi: { bip: 0.12, clank: 0.01, voceApollo: 0.012 } },
    aria: { parti: [['marrone', 'lowpass', 500, 0.12, [0.07, 0.5, 'f']], ['tono', 60, 'sine', 0.03]], eventi: { vapore: 0.03, cigolio: 0.03, passiLontani: 0.015 } },
    ospedale: { parti: [['marrone', 'lowpass', 300, 0.07], ['tono', 100, 'sawtooth', 0.006, [0.4, 0.5, 'g']], ['bianco', 'highpass', 7000, 0.004]], eventi: { monitor: 0.25, bip: 0.03, scintilla: 0.03 } },
    officina: { parti: [['marrone', 'lowpass', 180, 0.22, [0.5, 0.4, 'g']], ['tono', 41, 'sawtooth', 0.02], ['tono', 55, 'sine', 0.06]], eventi: { clank: 0.12, vapore: 0.08, pistone: 0.1 } },
    binari: { parti: [['marrone', 'lowpass', 150, 0.2, [0.3, 0.5, 'g']], ['tono', 46, 'sine', 0.05]], eventi: { binario: 0.12, clank: 0.04, scintilla: 0.04 } },
    nido: { parti: [['marrone', 'lowpass', 220, 0.16, [0.22, 0.85, 'g']], ['tono', 38, 'sine', 0.04, [0.11, 0.6, 'g']]], eventi: { umido: 0.12, goccia: 0.06, sibilo: 0.025 } },
    scafo: { parti: [['marrone', 'lowpass', 220, 0.14, [0.08, 0.4, 'g']], ['tono', 55, 'sine', 0.05], ['tono', 110, 'triangle', 0.008]], eventi: { scafo: 0.05, goccia: 0.1, clank: 0.03, vapore: 0.02 } },
    abisso: { parti: [['marrone', 'lowpass', 160, 0.24, [0.05, 0.6, 'f']], ['tono', 32, 'sine', 0.05, [0.07, 0.5, 'g']]], eventi: { bolle: 0.18, balena: 0.02, scafo: 0.015 } },
    corsie: { parti: [['marrone', 'lowpass', 350, 0.09], ['tono', 100, 'sawtooth', 0.006, [7, 0.8, 'g']], ['tono', 51, 'sine', 0.03]], eventi: { lamento: 0.03, passiLontani: 0.03, porta: 0.025, scintilla: 0.04, urlo: 0.008 } },
    fogne: { parti: [['marrone', 'lowpass', 700, 0.12, [0.3, 0.3, 'f']], ['bianco', 'bandpass', 1800, 0.02, [0.6, 0.5, 'g']]], eventi: { goccia: 0.3, passiAcqua: 0.03, lamento: 0.01 } },
    pioggia: { parti: [['bianco', 'highpass', 2500, 0.05, [0.1, 0.3, 'g']], ['marrone', 'lowpass', 400, 0.1, [0.05, 0.5, 'f']]], eventi: { tuono: 0.015, corvo: 0.02, lamento: 0.01 } },
    campagna: { parti: [['marrone', 'lowpass', 600, 0.05, [0.1, 0.6, 'f']]], eventi: { uccello: 0.25, grillo: 0.06 } },
    folla: { parti: [['marrone', 'bandpass', 450, 0.12, [1.7, 0.4, 'g']], ['bianco', 'bandpass', 900, 0.015, [2.3, 0.6, 'g']]], eventi: { campanella: 0.02, zoccoli: 0.06, uccello: 0.03 } },
    mare: { parti: [['marrone', 'lowpass', 500, 0.2, [0.12, 0.85, 'g']], ['bianco', 'highpass', 3000, 0.01, [0.12, 0.85, 'g']]], eventi: { gabbiano: 0.06, campanella: 0.03, cigolio: 0.04 } },
    lago: { parti: [['marrone', 'lowpass', 700, 0.08, [0.2, 0.5, 'g']]], eventi: { goccia: 0.05, uccello: 0.12, rana: 0.04 } },
    taverna: { parti: [['marrone', 'bandpass', 420, 0.12, [1.3, 0.35, 'g']], ['bianco', 'highpass', 4000, 0.008]], eventi: { scoppietto: 0.2, boccale: 0.05, risata: 0.03 } },
    castello: { parti: [['bianco', 'bandpass', 700, 0.03, [0.09, 0.8, 'f']], ['marrone', 'lowpass', 300, 0.07]], eventi: { scoppietto: 0.08, passiLontani: 0.03, porta: 0.015 } },
    vento: { parti: [['bianco', 'bandpass', 600, 0.06, [0.08, 0.9, 'f']], ['marrone', 'lowpass', 250, 0.07, [0.05, 0.5, 'g']]], eventi: { corvo: 0.03, cigolio: 0.02 } },
    bufera: { parti: [['bianco', 'bandpass', 900, 0.1, [0.13, 0.9, 'f']], ['marrone', 'lowpass', 300, 0.12, [0.07, 0.6, 'g']]], eventi: { aquila: 0.02, sassi: 0.03 } },
    tempio: { parti: [['marrone', 'lowpass', 300, 0.05], ['tono', 'radice', 'sine', 0.02]], eventi: { campana: 0.03, goccia: 0.04 } },
    gocce: { parti: [['marrone', 'lowpass', 260, 0.1, [0.06, 0.5, 'f']]], eventi: { goccia: 0.25, sassi: 0.02, squittio: 0.02 } },
    cripta: { parti: [['marrone', 'lowpass', 200, 0.11], ['bianco', 'bandpass', 500, 0.015, [0.06, 0.9, 'f']]], eventi: { goccia: 0.12, lamento: 0.02, porta: 0.015 } },
    miniera: { parti: [['marrone', 'lowpass', 220, 0.12]], eventi: { piccone: 0.08, goccia: 0.12, sassi: 0.05 } },
    bosco: { parti: [['bianco', 'bandpass', 2500, 0.02, [0.15, 0.7, 'g']], ['marrone', 'lowpass', 500, 0.05]], eventi: { uccello: 0.35, picchio: 0.03, ramo: 0.03 } },
    palude: { parti: [['marrone', 'lowpass', 400, 0.08], ['bianco', 'bandpass', 4500, 0.008, [11, 0.6, 'g']]], eventi: { rana: 0.2, bolle: 0.05, insetto: 0.08 } },
    deserto: { parti: [['bianco', 'bandpass', 1400, 0.04, [0.06, 0.9, 'f']]], eventi: { aquila: 0.015, sassi: 0.02 } },
    fuoco: { parti: [['marrone', 'lowpass', 500, 0.07]], eventi: { scoppietto: 0.35, grillo: 0.08 } },
  };
  // quanto suona ogni parte nei vari momenti (0-1) e cosa fa la batteria
  const UMORI = {
    calma: { pad: 0.9, mel: 0.3, basso: 0.4, ritmo: null, letto: 1, tempo: 0.85, liv: 0 },
    esplora: { pad: 0.8, mel: 0.4, basso: 0.5, ritmo: null, letto: 1, tempo: 1, liv: 1 },
    festa: { pad: 0.6, mel: 0.8, basso: 0.8, ritmo: 'danza', letto: 0.8, tempo: 1.2, liv: 1 },
    mistero: { pad: 0.8, mel: 0.25, basso: 0.3, ritmo: 'tic', letto: 1, tempo: 0.9, storto: 1, liv: 2 },
    tensione: { pad: 0.7, mel: 0.15, basso: 0.6, ritmo: 'battito', letto: 0.8, tempo: 1, storto: 1, liv: 3 },
    pericolo: { pad: 0.6, mel: 0.05, basso: 0.8, ritmo: 'battitoVeloce', letto: 0.55, tempo: 1.2, storto: 2, tremolo: true, liv: 4 },
    battaglia: { pad: 0.6, mel: 0.35, basso: 1, ritmo: 'battaglia', letto: 0.4, tempo: 1.45, ost: true, liv: 4 },
    caccia: { pad: 0.5, mel: 0, basso: 1, ritmo: 'caccia', letto: 0.35, tempo: 1.65, storto: 2, ost: true, tremolo: true, liv: 5 },
    morte: { pad: 0.5, mel: 0.1, basso: 0.2, ritmo: null, letto: 0.3, tempo: 0.6, liv: 0 },
    sospeso: { pad: 0.9, mel: 0.12, basso: 0.25, ritmo: null, letto: 0.6, tempo: 0.7, liv: 0 }, // una scelta morale da fare
  };
  // la batteria: 16 sedicesimi per battuta (1 = colpo, 2 = colpo forte)
  const RITMI = {
    battito: { battito: [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    battitoVeloce: { battito: [2, 0, 1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0], tic: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    tic: { tic: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
    battaglia: { cassa: [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0], rullante: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1], tic: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
    caccia: { cassa: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 1], rullante: [0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 1, 2, 0], tic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    danza: { cassa: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0], rullante: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1] },
  };
  const ATMO = { calma: 'calma', viaggio: 'esplora', festa: 'festa', mistero: 'mistero', tensione: 'tensione', orrore: 'pericolo', battaglia: 'battaglia' };
  const CACCIATORI = new Set(['xenomorfo', 'akers', 'costrutto', 'proxy', 'flesher', 'leviatano', 'chrisWalker', 'gemelli', 'walrider']);
  const HORROR = new Set(['sevastopol', 'pathos', 'manicomio']);
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const caso = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- la scelta: tema, zona, umore ----------
  let voglia = true;
  try { voglia = localStorage.getItem('if:drMusica') !== 'no'; } catch (e) { /* niente */ }
  const S = { tema: null, zona: null, umore: 'calma', umoreVisto: 'calma', tenutoFino: 0, ultimoColpo: 0, partita: null, inGioco: false };
  function acceso() {
    const b = document.getElementById('suono');
    return voglia && !(window.Boss && window.Boss.attivo) && !(b && b.getAttribute('aria-pressed') === 'false') && S.inGioco;
  }
  function temaDi(p) { return p.incubo && HORROR.has(p.incubo.id) ? p.incubo.id : TEMI[p.ambientazione] ? p.ambientazione : 'classica'; }
  // l'umore che sale arriva subito; quello che scende aspetta qualche secondo (la paura non passa di colpo)
  function vuoiUmore(u) {
    const ora = performance.now(), nuovo = UMORI[u], vecchio = UMORI[S.umore];
    if (u === S.umore) { if (nuovo.liv >= 3) S.tenutoFino = Math.max(S.tenutoFino, ora + (nuovo.liv >= 4 ? 6000 : 3500)); return; }
    if (nuovo.liv < vecchio.liv && ora < S.tenutoFino && S.umore !== 'battaglia') return;
    if (S.umore === 'battaglia' && u !== 'battaglia' && nuovo.liv < 5 && ora < S.tenutoFino) return;
    if (nuovo.liv >= 4 && vecchio.liv < 4 && ora - S.ultimoColpo > 9000 && M.ac) { S.ultimoColpo = ora; colpo(); }
    S.umore = u;
    S.tenutoFino = ora + (nuovo.liv >= 4 ? 6000 : nuovo.liv >= 3 ? 3500 : 0);
  }
  function umoreTurni(p) {
    if (p.fase === 'caduti') return 'morte';
    if (p.fase === 'creazione' || p.fase === 'fine') return 'calma';
    const cb = p.combattimento, inc = p.incubo;
    if (cb) return cb.creature.some((c) => c.lato === 'nemici' && !c.morto && !c.fuggito && CACCIATORI.has(c.mostro)) ? 'caccia' : 'battaglia';
    if (inc && inc.aree) {
      if (inc.scelta) return 'sospeso';
      if (inc.cacciaAttiva && !inc.scacciata) return 'pericolo';
      if (inc.rilevato || p.atmosfera === 'orrore' || p.atmosfera === 'tensione') return 'tensione';
      return p.atmosfera === 'mistero' ? 'mistero' : 'esplora';
    }
    return ATMO[p.atmosfera] || 'esplora';
  }
  function zonaTurni(p) {
    if (p.fase === 'creazione') return 'menu';
    if (p.combattimento && p.combattimento.scena && ZONE[p.combattimento.scena.stile]) return p.combattimento.scena.stile;
    const inc = p.incubo;
    if (inc && inc.aree) { const a = inc.aree.find((x) => x.id === inc.area); return a ? (AREE[a.id] ? a.id : ZONE[a.stile] ? a.stile : 'stazione') : 'stazione'; }
    const l = p.mondo && p.mondo.luoghi.find((x) => x.id === p.mondo.posizione);
    return l && ZONE[l.tipo] ? l.tipo : 'strada';
  }
  // a ogni disegno del tavolo
  function aggiorna(ctx) {
    const p = ctx && ctx.partita;
    S.inGioco = !!p;
    if (!p) return;
    S.partita = p;
    S.tema = temaDi(p);
    if (!(p.reale && p.fase === 'reale')) { S.zona = zonaTurni(p); vuoiUmore(minimo(umoreTurni(p))); }
    else if (p.fase === 'caduti') vuoiUmore('morte');
    pulsante();
    controlla();
  }
  function minimo(u) { const z = zonaDi(S.zona); return u !== 'sospeso' && u !== 'morte' && z.minimo && UMORI[z.minimo].liv > UMORI[u].liv ? z.minimo : u; }
  // in tempo reale, 20 volte al secondo: dove sono e cosa vedo e sento
  function tick(ctx, d) {
    const p = ctx && ctx.partita, R = p && p.reale;
    if (!d || !R || !R.aree || !d.g) return;
    S.inGioco = true; S.partita = p; S.tema = temaDi(p);
    const me = d.g[d.occhi];
    if (!me) return;
    const a = R.aree.find((x) => x.gx === Math.floor(me.x / R.sw) && x.gy === Math.floor(me.y / R.sh));
    if (a) S.zona = AREE[a.id] ? a.id : ZONE[a.stile] ? a.stile : S.zona;
    const vicino = (x, y, r) => Math.hypot(x - me.x, y - me.y) < r;
    const ent = d.ent || [];
    let u = 'esplora';
    if (ent.some((e) => e.k === 'nemico' && e.st && e.st !== 'fermo' && e.st !== 'vaga')) u = 'tensione';
    if ((d.blip || []).some(([x, y]) => vicino(x, y, 9))) u = 'tensione';
    if (d.vicina === 1) u = 'tensione';
    if (ent.some((e) => e.k === 'nemico' && (e.st === 'insegue' || e.st === 'attacca'))) u = 'pericolo';
    if (ent.some((e) => e.k === 'creatura') || (d.suoni || []).some((s) => s[2] === 1) || d.vicina >= 2) u = 'pericolo';
    if (d.allarme || d.inseguito || d.vicina >= 3) u = 'caccia';
    if (me.giu || me.morto) u = 'morte';
    vuoiUmore(minimo(u));
    controlla();
  }

  // ---------- il motore ----------
  const M = { ac: null, uscita: null, bus: null, acqua: null, eco: null, ritardo: null, rumori: {}, letto: null, lettoDi: null, passo: 0, prossimo: 0, accordo: 0, timer: null, suona: false };
  function avvia() {
    if (!M.ac) {
      try { M.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
      const ac = M.ac;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(ac.destination);
      M.uscita = ac.createGain(); M.uscita.gain.value = 0; M.uscita.connect(comp);
      // sott'acqua tutto passa da un filtro che si chiude
      M.acqua = ac.createBiquadFilter(); M.acqua.type = 'lowpass'; M.acqua.frequency.value = 18000; M.acqua.connect(M.uscita);
      M.bus = ac.createGain(); M.bus.connect(M.acqua);
      // il riverbero (una coda di rumore che si spegne) e l'eco per le melodie
      M.eco = ac.createConvolver(); M.eco.buffer = coda(ac, 3.2); const ge = ac.createGain(); ge.gain.value = 0.5; M.eco.connect(ge).connect(M.acqua);
      M.ritardo = ac.createDelay(2); M.ritardo.delayTime.value = 0.45; const fb = ac.createGain(); fb.gain.value = 0.38; const fr = ac.createBiquadFilter(); fr.type = 'lowpass'; fr.frequency.value = 2200;
      M.ritardo.connect(fr).connect(fb).connect(M.ritardo); fr.connect(M.eco); fr.connect(M.bus);
      M.rumori.bianco = rumore(ac, false); M.rumori.marrone = rumore(ac, true);
    }
    if (M.ac.state === 'suspended' && !(window.Boss && (window.Boss.attivo || window.Boss.muto))) M.ac.resume().catch(() => {});
    return true;
  }
  function coda(ac, sec) {
    const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.6; }
    return b;
  }
  function rumore(ac, marrone) {
    const n = ac.sampleRate * 3, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    let u = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (marrone) { u = (u + 0.02 * w) / 1.02; d[i] = u * 3.5; } else d[i] = w; }
    return b;
  }
  function controlla() {
    const si = acceso();
    if (si && !M.suona) {
      if (!avvia()) return;
      M.suona = true;
      M.uscita.gain.cancelScheduledValues(M.ac.currentTime); M.uscita.gain.setTargetAtTime(0.55 * sotto, M.ac.currentTime, 1.2);
      M.prossimo = M.ac.currentTime + 0.1;
      clearInterval(M.timer); M.timer = setInterval(programma, 90);
    } else if (!si && M.suona) {
      M.suona = false;
      clearInterval(M.timer); M.timer = null;
      if (M.ac) { M.uscita.gain.cancelScheduledValues(M.ac.currentTime); M.uscita.gain.setTargetAtTime(0, M.ac.currentTime, 0.4); }
      setTimeout(() => { if (!M.suona) cambiaLetto(null); }, 1500);
    }
    if (M.suona) aggiornaLetto();
  }
  // mentre parla la voce narrante (draghi-voce.js) la musica si abbassa
  let sotto = 1;
  function abbassa(si) {
    const v = si ? 0.4 : 1;
    if (v === sotto) return;
    sotto = v;
    if (M.suona && M.ac) M.uscita.gain.setTargetAtTime(0.55 * sotto, M.ac.currentTime, si ? 0.25 : 1);
  }
  // fuori dal gioco (o col sito zittito) la musica si spegne da sola
  setInterval(() => { if (S.inGioco && !document.querySelector('#panno .dr')) S.inGioco = false; controlla(); }, 1000);

  // ---------- il letto di rumori della zona (si sfuma quando si cambia zona) ----------
  function aggiornaLetto() {
    const z = zonaDi(S.zona), chiave = `${S.tema}:${S.zona}`;
    if (M.lettoDi !== chiave) { M.lettoDi = chiave; cambiaLetto(z.letto ? LETTI[z.letto] : null); }
    const ac = M.ac, t = ac.currentTime, um = UMORI[S.umore];
    if (M.letto) M.letto.g.gain.setTargetAtTime(0.9 * um.letto, t, 1.5);
    // sott'acqua (fondale di PATHOS-II) la musica si ovatta; se arriva qualcosa si apre un po'
    M.acqua.frequency.setTargetAtTime(z.acqua ? (um.liv >= 4 ? 2400 : 900) : 18000, t, 1.2);
  }
  function cambiaLetto(def) {
    const ac = M.ac; if (!ac) return;
    const t = ac.currentTime;
    if (M.letto) { const v = M.letto; v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.9); setTimeout(() => v.nodi.forEach((n) => { try { n.stop(); } catch (e) { /* già fermo */ } }), 5000); }
    M.letto = null;
    if (!def) return;
    const g = ac.createGain(); g.gain.value = 0; g.connect(M.bus);
    const nodi = [];
    for (const parte of def.parti) {
      const v = ac.createGain();
      let sorgente, dove = v.gain;
      if (parte[0] === 'tono') {
        const [, f, forma, vol, lfo] = parte;
        sorgente = ac.createOscillator(); sorgente.type = forma; sorgente.frequency.value = f === 'radice' ? hz(TEMI[S.tema].radice - 12) : f;
        v.gain.value = vol; sorgente.connect(v);
        if (lfo) nodi.push(lfoSu(ac, v.gain, vol, lfo));
      } else {
        const [tipo, filtro, f, vol, lfo] = parte;
        sorgente = ac.createBufferSource(); sorgente.buffer = M.rumori[tipo]; sorgente.loop = true; sorgente.loopStart = Math.random();
        const fi = ac.createBiquadFilter(); fi.type = filtro; fi.frequency.value = f; fi.Q.value = filtro === 'bandpass' ? 1.2 : 0.7;
        sorgente.connect(fi).connect(v); v.gain.value = vol;
        if (lfo) { dove = lfo[2] === 'f' ? fi.frequency : v.gain; nodi.push(lfoSu(ac, dove, lfo[2] === 'f' ? f : vol, lfo)); }
      }
      v.connect(g); sorgente.start(t + Math.random() * 0.05); nodi.push(sorgente);
    }
    g.gain.setTargetAtTime(0.9 * UMORI[S.umore].letto, t, 1.5);
    M.letto = { g, nodi, eventi: def.eventi || {} };
  }
  function lfoSu(ac, param, base, [f, prof]) {
    const o = ac.createOscillator(), a = ac.createGain();
    o.frequency.value = f * (0.85 + Math.random() * 0.3); a.gain.value = base * prof; o.connect(a).connect(param); o.start();
    return o;
  }

  // ---------- il programma: ogni sedicesimo, un po' in anticipo ----------
  function programma() {
    const ac = M.ac; if (!ac || ac.state !== 'running') return;
    if (M.prossimo < ac.currentTime - 0.5) M.prossimo = ac.currentTime + 0.05; // dopo una pausa si riparte da adesso
    while (M.prossimo < ac.currentTime + 0.25) { passo(M.prossimo, M.passo); M.passo++; M.prossimo += 60 / bpm() / 4; }
  }
  function bpm() { const T = TEMI[S.tema] || TEMI.classica, z = zonaDi(S.zona); return T.bpm * UMORI[S.umore].tempo * (z.acqua && UMORI[S.umore].liv < 4 ? 0.75 : 1); }
  function passo(t, n) {
    const T = TEMI[S.tema] || TEMI.classica, z = zonaDi(S.zona), um = UMORI[S.umore], sc = SCALE[T.scala];
    const s = n % 16, battuta = Math.floor(n / 16), radice = T.radice + (z.sposta || 0);
    const buio = Math.min(T.buio, z.scuro || 1) * (z.acqua ? 0.6 : 1);
    const lungo = um.liv >= 4 ? 1 : 2; // nei momenti agitati gli accordi cambiano più spesso
    const grado = T.giro[Math.floor(battuta / lungo) % T.giro.length];
    const nota = (g, ott = 0) => radice + 12 * (ott + Math.floor(g / 7)) + sc[((g % 7) + 7) % 7];
    const dur = (60 / bpm()) * 4 * lungo;
    // il tappeto: l'accordo (con la nota storta quando c'è paura)
    if (s === 0 && battuta % lungo === 0 && um.pad > 0) {
      const acc = [nota(grado, 1), nota(grado + 2, 1), nota(grado + 4, 1)];
      if (um.storto && Math.random() < 0.5 * um.storto) acc.push(acc[0] + (um.storto > 1 ? 1 : 6));
      for (const m of acc) strumento(T.pad, t, hz(m), dur * 1.05, 0.05 * um.pad, buio);
    }
    // il basso
    if (um.basso > 0 && (s === 0 || (um.ost && s === 8) || (um.liv >= 5 && s % 4 === 0))) strumento('basso', t, hz(nota(grado, 0) - (um.liv >= 4 ? 0 : 0)), (60 / bpm()) * (um.ost ? 1.5 : 3.5), 0.12 * um.basso, buio);
    // gli archi (o i tamburi) a martello quando si combatte o si scappa
    if (um.ost && s % 2 === 0) { const g = s % 8 === 6 ? grado + 4 : grado; strumento(T.ost === 'tamburi' ? 'tamburo' : T.ost, t, hz(nota(g, 1)), 60 / bpm() / 2.2, 0.05, buio); }
    // il tremolo acuto degli archi quando la creatura è vicina
    if (um.tremolo && s === 0 && battuta % 2 === 0) strumento('tremolo', t, hz(nota(grado + 4, 3) + (Math.random() < 0.5 ? 1 : 0)), dur * 1.6, 0.02, 1);
    // la melodia
    const pMel = um.mel * T.melodia * (z.acqua ? 0.7 : 1);
    if (pMel > 0 && s % 2 === 0) {
      const forte = s === 0 || s === 8;
      if (Math.random() < pMel * (forte ? 0.55 : 0.22)) {
        const g = grado + caso([0, 2, 4, 4, 7, 2, 1, 3, 5]);
        strumento(z.acqua ? 'vetro' : T.mel, t, hz(nota(g, 2)), (60 / bpm()) * (um.liv >= 4 ? 0.5 : caso([1, 1.5, 2, 3])), 0.045 * (forte ? 1 : 0.7), buio, true);
      }
    }
    // la batteria
    const R = um.ritmo && RITMI[um.ritmo];
    if (R) for (const [k, pat] of Object.entries(R)) if (pat[s]) percussione(k, t, pat[s] === 2 ? 1 : 0.6);
    // i rumori sparsi della zona, a ogni battito
    if (M.letto && s % 4 === 0) for (const [k, pr] of Object.entries(M.letto.eventi)) if (Math.random() < pr * (0.4 + 0.6 * um.letto) * (60 / bpm()) * 1.2) evento(k, t + Math.random() * 0.3);
  }

  // ---------- gli strumenti ----------
  function inviluppo(g, t, vol, att, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  }
  function osc(tipo, f, t, fine, dest, det = 0) {
    const o = M.ac.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t); o.detune.value = det; o.connect(dest); o.start(t); o.stop(fine + 0.1); return o;
  }
  function strumento(nome, t, f, dur, vol, buio = 1, eco = false) {
    const ac = M.ac, g = ac.createGain(), fi = ac.createBiquadFilter();
    fi.type = 'lowpass'; fi.connect(g); g.connect(M.bus); g.connect(M.eco);
    if (eco) g.connect(M.ritardo);
    const fine = t + dur + 1.5;
    switch (nome) {
      case 'synth': // freddo, come i sintetizzatori di un film di fantascienza anni '70
        fi.frequency.setValueAtTime(500 * buio, t); fi.frequency.linearRampToValueAtTime(1100 * buio, t + dur / 2); fi.frequency.linearRampToValueAtTime(500 * buio, t + dur);
        osc('sawtooth', f, t, fine, fi, -7); osc('sawtooth', f, t, fine, fi, 7); inviluppo(g, t, vol * 0.7, dur * 0.3, dur, 1.2); break;
      case 'archi': {
        fi.frequency.value = 1400 * buio;
        for (const d of [-9, 0, 8]) { const o = osc('sawtooth', f, t, fine, fi, d); vibrato(o, t, 5, 4); }
        inviluppo(g, t, vol * 0.55, Math.min(1.2, dur * 0.35), dur, 1); break;
      }
      case 'coro': { // voci basse senza parole (un filtro a "a" e una a "o")
        const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 4; f1.connect(g);
        const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 5; f2.connect(g);
        for (const d of [-12, 0, 10]) { const o = osc('sawtooth', f / 2, t, fine, f1, d); o.connect(f2); vibrato(o, t, 4.5, 6); }
        inviluppo(g, t, vol * 1.3, dur * 0.4, dur, 1.2); break;
      }
      case 'organo': fi.frequency.value = 2400 * buio; for (const [m, v] of [[1, 1], [2, 0.5], [3, 0.25], [0.5, 0.6]]) { const gg = ac.createGain(); gg.gain.value = v; gg.connect(fi); osc('sine', f * m, t, fine, gg); } inviluppo(g, t, vol * 0.6, 0.25, dur, 0.6); break;
      case 'fisarmonica': fi.frequency.value = 1800 * buio; osc('square', f, t, fine, fi, -10); osc('square', f, t, fine, fi, 10); inviluppo(g, t, vol * 0.35, 0.06, dur, 0.15); break;
      case 'ottoni': fi.frequency.setValueAtTime(300, t); fi.frequency.linearRampToValueAtTime(2200 * buio, t + 0.08); fi.frequency.linearRampToValueAtTime(1200 * buio, t + dur); osc('sawtooth', f, t, fine, fi); osc('sawtooth', f, t, fine, fi, 6); inviluppo(g, t, vol * 0.7, 0.05, dur, 0.2); break;
      case 'basso': fi.frequency.value = 400 * buio + 80; osc('triangle', f, t, fine, fi); osc('sine', f / 2, t, fine, fi); inviluppo(g, t, vol, 0.03, dur, 0.4); break;
      case 'campana': { // campana elettronica (modulazione di frequenza)
        fi.frequency.value = 6000; const o = osc('sine', f, t, fine, fi), m = ac.createOscillator(), mg = ac.createGain();
        m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur + 1); m.connect(mg).connect(o.frequency); m.start(t); m.stop(fine);
        inviluppo(g, t, vol, 0.005, 0.05, dur + 1.2); break;
      }
      case 'vetro': fi.frequency.value = 5000; osc('sine', f, t, fine, fi); { const gg = ac.createGain(); gg.gain.value = 0.3; gg.connect(fi); osc('sine', f * 2.76, t, fine, gg); } inviluppo(g, t, vol * 0.9, 0.02, 0.1, dur + 1.4); break;
      case 'carillon': { // stonato apposta: ogni nota un po' calante
        fi.frequency.value = 7000; const o = osc('triangle', f * 2, t, fine, fi, -25 - Math.random() * 30); o.frequency.linearRampToValueAtTime(f * 2 * 0.985, t + dur + 1);
        const gg = ac.createGain(); gg.gain.value = 0.25; gg.connect(fi); osc('sine', f * 8.1, t, fine, gg);
        inviluppo(g, t, vol * 0.8, 0.003, 0.02, dur + 0.8); break;
      }
      case 'flauto': { fi.frequency.value = 3000; const o = osc('sine', f * 2, t, fine, fi); vibrato(o, t + 0.2, 5.2, 8); const fa = ac.createBufferSource(); fa.buffer = M.rumori.bianco; const fb = ac.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = f * 2; fb.Q.value = 8; const ga = ac.createGain(); ga.gain.value = 0.3; fa.connect(fb).connect(ga).connect(fi); fa.start(t); fa.stop(fine); inviluppo(g, t, vol, 0.08, dur, 0.25); break; }
      case 'liuto': fi.frequency.setValueAtTime(3500, t); fi.frequency.exponentialRampToValueAtTime(400, t + dur + 0.5); osc('triangle', f * 2, t, fine, fi); osc('sawtooth', f * 2, t, fine, fi, 4); inviluppo(g, t, vol * 0.6, 0.004, 0.02, dur + 0.6); break;
      case 'tremolo': { fi.frequency.value = 5000; const o = osc('sawtooth', f, t, fine, fi); o.frequency.linearRampToValueAtTime(f * 1.06, t + dur); const lt = ac.createOscillator(), lg = ac.createGain(); lt.frequency.value = 13; lg.gain.value = vol * 0.8; lt.connect(lg).connect(g.gain); lt.start(t); lt.stop(fine); inviluppo(g, t, vol, dur * 0.6, dur, 0.6); break; }
      case 'tamburo': percussione('tamburo', t, 0.7); g.disconnect(); return;
      default: osc('sine', f, t, fine, fi); inviluppo(g, t, vol, 0.05, dur, 0.4);
    }
  }
  function vibrato(o, t, f, cent) { const l = M.ac.createOscillator(), a = M.ac.createGain(); l.frequency.value = f; a.gain.value = cent; l.connect(a).connect(o.detune); l.start(t); l.stop(t + 30); }
  function botta(t, f0, f1, dur, vol, tipo = 'sine', dest = M.bus) {
    const g = M.ac.createGain(); g.connect(dest);
    const o = M.ac.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    o.connect(g); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.05);
  }
  function soffio(t, filtro, f, dur, vol, { q = 1, att = 0.002, a = null, dest = M.bus, marrone = false } = {}) {
    const ac = M.ac, s = ac.createBufferSource(); s.buffer = marrone ? M.rumori.marrone : M.rumori.bianco;
    const fi = ac.createBiquadFilter(); fi.type = filtro; fi.frequency.setValueAtTime(f, t); fi.Q.value = q; if (a) fi.frequency.exponentialRampToValueAtTime(a, t + dur);
    const g = ac.createGain(); s.connect(fi).connect(g).connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
  }
  function percussione(k, t, v) {
    if (k === 'battito') { botta(t, 70, 38, 0.22, 0.32 * v); return; }
    if (k === 'cassa') { botta(t, 120, 40, 0.3, 0.3 * v); return; }
    if (k === 'tamburo') { botta(t, 180, 90, 0.25, 0.18 * v, 'triangle'); soffio(t, 'bandpass', 300, 0.12, 0.05 * v); return; }
    if (k === 'rullante') { soffio(t, 'bandpass', 1800, 0.16, 0.14 * v, { q: 0.8 }); botta(t, 220, 160, 0.08, 0.06 * v, 'triangle'); return; }
    if (k === 'tic') { soffio(t, 'highpass', 7000, 0.04, 0.035 * v); }
  }
  // il colpo quando arriva il pericolo: uno stridio di archi o un boato che sale
  function colpo() {
    const ac = M.ac; if (!ac || !M.suona) return;
    const T = TEMI[S.tema] || TEMI.classica, t = ac.currentTime + 0.05;
    if (T.colpo === 'stridio') { for (const f of [1400, 1480, 1570]) { const g = ac.createGain(); g.connect(M.bus); g.connect(M.eco); const o = osc('sawtooth', f, t, t + 2, g); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 1.6); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9); } botta(t, 90, 30, 1.2, 0.35); }
    else if (T.colpo === 'boato') { botta(t, 55, 28, 2.6, 0.4); soffio(t, 'lowpass', 120, 2.4, 0.4, { att: 0.3, a: 900, marrone: true }); }
    else { const m = T.radice + 12; for (const x of [0, 3, 6]) strumento('ottoni', t, hz(m + x), 0.9, 0.07, 1); botta(t, 110, 40, 0.5, 0.3); }
  }
  // i rumori sparsi delle zone
  function evento(k, t) {
    const r = Math.random(), ac = M.ac;
    switch (k) {
      case 'clank': botta(t, 300 + r * 400, 200, 0.5, 0.05, 'square'); botta(t, 1170 + r * 300, 900, 0.7, 0.025, 'sine'); soffio(t, 'bandpass', 2500, 0.15, 0.04, { q: 4 }); break;
      case 'vapore': soffio(t, 'highpass', 3000, 1.4 + r, 0.05, { att: 0.15 }); break;
      case 'pistone': for (let i = 0; i < 4; i++) { botta(t + i * 0.55, 90, 50, 0.18, 0.12); soffio(t + i * 0.55 + 0.2, 'highpass', 4000, 0.25, 0.025); } break;
      case 'cigolio': case 'scafo': { const g = ac.createGain(); g.connect(M.bus); g.connect(M.eco); const f = k === 'scafo' ? 70 + r * 40 : 300 + r * 300; const fi = ac.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = f * 3; fi.Q.value = 6; fi.connect(g); const o = osc('sawtooth', f, t, t + 3, fi); o.frequency.linearRampToValueAtTime(f * (0.7 + r * 0.5), t + 2.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k === 'scafo' ? 0.12 : 0.05, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8); break; }
      case 'bip': botta(t, 880 + Math.floor(r * 4) * 220, 880 + Math.floor(r * 4) * 220, 0.08, 0.02, 'square'); break;
      case 'monitor': botta(t, 1000, 1000, 0.12, 0.025, 'sine'); break;
      case 'voceApollo': for (let i = 0; i < 3; i++) botta(t + i * 0.18, 600 - i * 80, 600 - i * 80, 0.14, 0.015, 'triangle'); break;
      case 'scintilla': for (let i = 0; i < 5; i++) soffio(t + i * 0.04 + Math.random() * 0.05, 'highpass', 5000, 0.03, 0.04); break;
      case 'binario': for (let i = 0; i < 2; i++) botta(t + i * 0.22, 140, 70, 0.12, 0.1); break;
      case 'umido': soffio(t, 'bandpass', 500 + r * 400, 0.5, 0.06, { q: 3, a: 200, att: 0.1, marrone: true }); break;
      case 'sibilo': soffio(t, 'bandpass', 4500, 1.2, 0.035, { q: 2, att: 0.4 }); break;
      case 'goccia': { const f = 900 + r * 900; botta(t, f, f * 1.8, 0.07, 0.04, 'sine', M.eco); botta(t, f, f * 1.8, 0.05, 0.02); break; }
      case 'bolle': for (let i = 0; i < 2 + Math.floor(r * 4); i++) { const f = 300 + Math.random() * 500; botta(t + i * (0.08 + Math.random() * 0.12), f, f * 2.5, 0.06, 0.03); } break;
      case 'balena': { const g = ac.createGain(); g.connect(M.eco); g.connect(M.bus); const o = osc('sine', 90 + r * 40, t, t + 6, g); o.frequency.linearRampToValueAtTime(140 + r * 60, t + 2.5); o.frequency.linearRampToValueAtTime(70, t + 5.5); vibrato(o, t, 3, 25); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.8); break; }
      case 'lamento': case 'urlo': { const g = ac.createGain(); const fi = ac.createBiquadFilter(); fi.type = 'bandpass'; fi.frequency.value = k === 'urlo' ? 1400 : 700; fi.Q.value = 3; fi.connect(g); g.connect(M.eco); const f = k === 'urlo' ? 600 + r * 300 : 180 + r * 80; const o = osc('sawtooth', f, t, t + 4, fi); o.frequency.linearRampToValueAtTime(f * (k === 'urlo' ? 1.4 : 0.8), t + (k === 'urlo' ? 0.9 : 2.5)); vibrato(o, t, 6, 40); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(k === 'urlo' ? 0.05 : 0.035, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + (k === 'urlo' ? 1.4 : 3)); break; }
      case 'passiLontani': for (let i = 0; i < 4; i++) botta(t + i * 0.6, 80, 50, 0.15, 0.06, 'sine', M.eco); break;
      case 'passiAcqua': for (let i = 0; i < 3; i++) soffio(t + i * 0.8, 'lowpass', 900, 0.4, 0.06, { att: 0.05, marrone: true }); break;
      case 'porta': { const o = osc('sawtooth', 120, t, t + 1.6, M.eco); o.frequency.linearRampToValueAtTime(70, t + 1.4); const g = ac.createGain(); o.disconnect(); o.connect(g); g.connect(M.eco); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); botta(t + 1.4, 90, 40, 0.3, 0.12); break; }
      case 'tuono': soffio(t, 'lowpass', 300, 3.5, 0.35, { att: 0.05, a: 60, marrone: true }); break;
      case 'corvo': for (let i = 0; i < 2; i++) soffio(t + i * 0.35, 'bandpass', 1100, 0.22, 0.05, { q: 5, a: 800 }); break;
      case 'uccello': { const f = 2500 + r * 1800; for (let i = 0; i < 2 + Math.floor(r * 3); i++) botta(t + i * 0.12, f, f * (1.2 + Math.random() * 0.4), 0.08, 0.012, 'sine'); break; }
      case 'grillo': for (let i = 0; i < 6; i++) botta(t + i * 0.05, 4400, 4300, 0.03, 0.006, 'square'); break;
      case 'gabbiano': { const g = ac.createGain(); g.connect(M.bus); const o = osc('sawtooth', 1400, t, t + 1, g); o.frequency.linearRampToValueAtTime(900, t + 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.008, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); break; }
      case 'campanella': botta(t, 1320, 1318, 1.4, 0.015, 'sine', M.eco); break;
      case 'campana': botta(t, hz((TEMI[S.tema] || TEMI.classica).radice + 12), 60, 4, 0.06, 'sine', M.eco); break;
      case 'zoccoli': for (let i = 0; i < 4; i++) botta(t + i * 0.2 + (i % 2) * 0.05, 700, 300, 0.04, 0.03, 'triangle'); break;
      case 'scoppietto': for (let i = 0; i < 1 + Math.floor(r * 3); i++) soffio(t + Math.random() * 0.3, 'bandpass', 2000 + Math.random() * 3000, 0.02, 0.05, { q: 2 }); break;
      case 'boccale': botta(t, 2100, 2050, 0.25, 0.012, 'sine'); break;
      case 'risata': for (let i = 0; i < 4; i++) soffio(t + i * 0.13, 'bandpass', 600, 0.1, 0.03, { q: 4 }); break;
      case 'aquila': { const g = ac.createGain(); g.connect(M.eco); const o = osc('sine', 2600, t, t + 1.2, g); o.frequency.linearRampToValueAtTime(1700, t + 1); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); break; }
      case 'sassi': for (let i = 0; i < 4; i++) botta(t + i * 0.09 + Math.random() * 0.05, 900 + Math.random() * 800, 400, 0.04, 0.025, 'triangle'); break;
      case 'squittio': botta(t, 3200, 3600, 0.06, 0.008, 'sine'); break;
      case 'piccone': botta(t, 2200, 1800, 0.12, 0.03, 'square', M.eco); break;
      case 'picchio': for (let i = 0; i < 8; i++) botta(t + i * 0.06, 900, 600, 0.03, 0.02, 'triangle'); break;
      case 'ramo': soffio(t, 'bandpass', 1500, 0.08, 0.05, { q: 1 }); break;
      case 'rana': for (let i = 0; i < 2; i++) botta(t + i * 0.25, 300 + r * 80, 180, 0.12, 0.03, 'square'); break;
      case 'insetto': soffio(t, 'bandpass', 5000, 1, 0.01, { q: 20, att: 0.3 }); break;
      default: break;
    }
  }

  // ---------- il pulsante 🎵 (solo per te) ----------
  function pulsante() {
    const box = document.querySelector('#panno .dr');
    if (!box) return;
    let b = box.querySelector('.dr-musica');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'dr-musica';
      b.addEventListener('click', (e) => {
        e.stopPropagation(); b.blur(); // così Spazio e Invio tornano al gioco
        voglia = !voglia;
        try { localStorage.setItem('if:drMusica', voglia ? 'si' : 'no'); } catch (er) { /* niente */ }
        pulsante(); controlla();
      });
      // nel racconto sta accanto all'atmosfera della scena, in battaglia accanto a «Tocca a…», in tempo reale
      // accanto alla casella delle azioni, altrimenti in un angolo
      const atm = box.querySelector('.dr-testa-storia > .dr-atmosfera') || box.querySelector('.dr-iniziativa > .dr-tocca');
      const scrivi = box.querySelector('.dr-re-scrivi');
      if (scrivi) { b.classList.add('in-riga'); scrivi.appendChild(b); } else if (atm) { const riga = document.createElement('span'); riga.className = 'dr-musica-riga'; atm.replaceWith(riga); riga.append(atm, b); b.classList.add('in-riga'); } else box.appendChild(b);
    }
    const sito = document.getElementById('suono'), zitto = sito && sito.getAttribute('aria-pressed') === 'false';
    b.textContent = voglia && !zitto ? '🎵' : '🎵̸';
    b.classList.toggle('spenta', !voglia || zitto);
    b.title = zitto ? 'Musica: accendi prima l\'audio del sito (🔇)' : voglia ? 'Musica accesa: tocca per spegnerla (solo per te)' : 'Musica spenta: tocca per accenderla';
    b.setAttribute('aria-label', b.title);
  }

  window.DraghiMusica = { aggiorna, tick, abbassa, TEMI, ZONE, AREE, LETTI, UMORI, stato: () => ({ tema: S.tema, zona: S.zona, umore: S.umore, suona: M.suona }), _prova: { S, M, avvia, passo, evento, colpo, cambiaLetto, vuoiUmore } };
})();
