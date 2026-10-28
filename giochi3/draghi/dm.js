// DRAGHI E SEGRETE: il MASTER UMANO. Al tavolo con gli amici (solo a turni) uno dei giocatori può fare il master al
// posto dell'IA: non crea un personaggio, vede una schermata sua (le richieste dei giocatori, la mappa completa, il
// bestiario, i segreti dell'ambientazione) e risponde lui: racconto, prove, tiri salvezza, combattimenti ed eventi,
// che il gioco applica con le stesse regole del master IA. L'IA resta il suo consigliere: le può chiedere qualsiasi
// cosa (regole, idee, PNG, CD), farsi preparare una bozza da modificare, farle rispondere una volta sola o lasciarle
// tutto il tavolo ("automatico"). Il master può anche scrivere di fretta, a grandi linee, e farsi RISCRIVERE il testo
// dall'IA in un racconto curato: gli torna nella casella, lo controlla e lo cambia, poi lo manda lui (e la voce
// narrante legge quello che manda). In combattimento il master può muovere lui i nemici: al turno di un nemico il
// gioco aspetta e il master lo muove, attacca, soffia o passa con le stesse regole dei giocatori (o lascia il turno
// al gioco); in più li può spostare a mano dove vuole sulla mappa, in qualsiasi momento, senza regole.
// Si aggiunge a Draghi (draghi.js) come i metodi delle ambientazioni horror.
const MASTER = require('./master');
const M = require('./mappe');
const H = require('./horror');
const { MOSTRI } = require('./mostri');

const MAX_CONSIGLI = 40;
const ATTESA_MANO = 120000; // il master muove i nemici: dopo 2 minuti senza mosse il turno del nemico lo fa il gioco
// le caselle del master che si possono far riscrivere (i nomi dei campi della schermata, draghi-master.js)
const CAMPI_RISCRITTURA = ['dmNarr', 'dmNarra', 'dmLNarr'];
const RISCRITTORE = `Sei il NARRATORE di una partita di "Draghi e Segrete" (gioco di ruolo). Il master UMANO ha scritto di fretta, in modo grossolano, cosa succede: tu lo RISCRIVI come racconto curato, da leggere ai giocatori (e da leggere ad alta voce).
- Scrivi SEMPRE in italiano corretto, al presente, parlando ai personaggi (voi / il nome del personaggio).
- Tieni TUTTI i fatti del master e nient'altro di importante: non inventare mostri, oggetti, tesori, ferite, morti, esiti di tiri o decisioni dei personaggi, e non cambiare quello che succede. Puoi aggiungere solo atmosfera: luci, suoni, odori, gesti, il tono delle voci.
- Se il master fa parlare qualcuno, scrivi la battuta come dialogo tra «virgolette», con le stesse informazioni.
- Lunghezza simile all'originale, al massimo il doppio: 1-3 paragrafi brevi. Chiudi lasciando la scena aperta, senza domande ai giocatori se il master non le fa.
- Solo testo semplice: niente titoli, elenchi, grassetti, emoji o note. Scrivi SOLO il racconto riscritto, senza commenti o introduzioni.
- Se il testo del master contiene parolacce o cose volgari, rendile in modo adatto a ragazzi, TRANNE nella modalità pazza (te lo dice il messaggio): lì il tono comico e sboccato del master si tiene, come fa il master IA.`;
const CONSIGLIERE = `Sei il CONSIGLIERE di un master UMANO che sta conducendo una partita di "Draghi e Segrete" (gioco di ruolo con le regole SRD 5.1 della 5ª edizione). Il master è un ragazzo che sta imparando: rispondi SEMPRE in italiano, in modo pratico, chiaro e breve (al massimo 10-12 righe, con elenchi puntati se servono). Non rispondere in JSON.
- Il master decide tutto: tu proponi. Dai idee concrete e pronte da usare (frasi da leggere ai giocatori, nomi, CD precise, mostri del bestiario con il loro id, conseguenze).
- Se ti chiede una regola, spiegala in parole semplici e dai il numero giusto (CD, danni, durata).
- Se ti chiede cosa fare adesso, guarda la RICHIESTA IN ATTESA (cosa hanno fatto i giocatori) e proponi 2-3 strade diverse.
- Conosci tutto quello che sa il master (anche i segreti): puoi usarli per consigliarlo, i giocatori non leggono quello che scrivi.
Qui sotto, per riferimento, le istruzioni che avrebbe il master IA (regole, eventi, tono dell'ambientazione).`;

// senza IA: qualche consiglio scritto a mano, scelto dalle parole della domanda
const DADI_CD = 'CD per le prove: 5 facilissima · 10 facile · 15 media · 20 difficile · 25 molto difficile · 30 quasi impossibile.';
const RISERVA = [
  [/\bcd\b|prov|difficil|tir/, `${DADI_CD} Una prova serve solo quando l'esito è incerto e fallire ha conseguenze interessanti. Se tutto il gruppo prova la stessa cosa scegli "tutti".`],
  [/salvezz|trappol|velen|cadut/, 'Tiro salvezza: Destrezza per schivare (trappole, esplosioni), Costituzione per resistere (veleni, freddo), Saggezza per la mente (paura, incantesimi). Danni tipici: 1d10 al 1° livello, 2d10 al 5°, 4d10 al 10°. "Metà danni se riesce" è la regola classica.'],
  [/png|personagg|nome|locand|mercant/, 'Un PNG si ricorda con tre cose: un aspetto (una cicatrice, un cappello assurdo), un modo di parlare (balbetta, rima, urla) e un desiderio (soldi, vendetta, fuggire). Dagli un segreto che i giocatori possono scoprire.'],
  [/mostr|combatt|incontr|nemic|scontr/, 'Un incontro equilibrato: tanti nemici deboli quanti sono i personaggi (GS 1/4 al 1° livello), oppure uno forte con GS circa uguale al livello del gruppo. Dai ai nemici un motivo per esserci e una via di fuga: un nemico che scappa è un nemico che torna.'],
  [/idea|cosa (faccio|succede)|bloccat|annoi|adesso/, 'Quando non sai cosa fare: 1) fai arrivare qualcuno con un problema; 2) fai succedere la conseguenza di una scelta passata; 3) dai un indizio che porta altrove; 4) chiedi ai giocatori cosa temono i loro personaggi e usalo.'],
  [/regol|vantagg|svantagg/, 'Vantaggio: si tirano due d20 e si tiene il più alto; svantaggio: il più basso. Si danno per aiuto, posizione favorevole o idee furbe (vantaggio), buio, ferite o fretta (svantaggio). L\'ispirazione dà vantaggio a un tiro.'],
];

// le richieste sono scritte per l'IA: al master umano si tolgono i pezzi sul formato della risposta
function perUmano(t) {
  return String(t || '').replace(/[^.\n]*(vaiQui|"luogo"|evento "|eventi \(|\(evento|JSON)[^.\n]*\.\s*/g, '').replace(/\nRispondi:[^\n]*/g, '').replace(/ Rispondi:.*$/s, '').trim();
}
// senza IA: il testo del master resta suo, solo con le maiuscole a inizio frase, gli spazi giusti e il punto finale
function sistemaTesto(t) {
  let s = String(t || '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ +([,.;:!?])/g, '$1').replace(/([,;:!?])(?=[^\s\d»”"),.!?])/g, '$1 ').replace(/([a-zàèéìòù]{2})\.(?=[a-zA-Zàèéìòù])/g, '$1. ').trim();
  s = s.replace(/(^|[.!?]\s+|\n)([a-zàèéìòù])/g, (m, a, b) => a + b.toUpperCase());
  if (s && !/[.!?…»”"]$/.test(s)) s += '.';
  return s;
}
// la risposta dell'IA: solo il racconto (via titoli, elenchi, grassetti e una eventuale frase di presentazione)
function pulisciRiscritto(t) {
  return String(t || '').replace(/```[a-z]*\n?|```/gi, '').replace(/^\s*(ecco|certo)[^\n]*:\s*\n/i, '').replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*•]\s+/gm, '')
    .replace(/(\*\*|__|\*)/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
function infoBestiario(cp) {
  return Object.values(MOSTRI).filter((m) => (cp ? (m.tema || []).includes(cp.id) : !m.tema)).map((m) => ({ id: m.id, nome: m.nome, gs: m.gs, pf: m.pf, ca: m.ca, simbolo: m.simbolo || null }));
}

const metodi = {
  preparaDm() {
    this.dm = null; this.dmAuto = false; this.attesaDM = null; this.nDM = 0;
    this.consigli = []; this.attesaConsiglio = false; this.bozzaDM = null; this.attesaBozza = false; this.liberaDM = null; this.dmNovita = false;
    this.riscritturaDM = null; this.attesaRiscrittura = false; this.nRiscritture = 0;
    this.dmNemici = true; this.manoChiave = null; this.manoDa = 0;
  },
  // in combattimento i nemici li muove il master (non il gioco): adesso tocca a uno di loro
  manoAttiva() {
    const cb = this.combattimento, c = cb && !cb.finito ? cb.attivo : null;
    return !!(this.dmUmano && this.dmNemici && this.fase === 'combattimento' && c && !c.pg && c.lato === 'nemici');
  },
  chiaveMano() { const cb = this.combattimento; return cb && cb.attivo ? `${cb.round}:${cb.attivo.id}` : null; },
  // c'è un master umano che risponde lui (non in automatico)
  get dmUmano() { return this.dm != null && !this.dmAuto; },
  // chi può dare i comandi del tavolo (iniziare, mandare al master, chiudere): chi l'ha aperto e il master
  comanda(p) { return this.eHost(p) || p === this.dm; },
  tuttiPronti() { return this.pg.every((x, i) => x || i === this.dm); },
  // i consigli e le bozze dell'IA arrivano mentre il gioco aspetta: il server chiede controllaTempo ogni tanto
  novitaDm() { if (!this.dmNovita) return false; this.dmNovita = false; return true; },
  attesaIaDm() { return this.attesaConsiglio || this.attesaBozza || this.attesaRiscrittura || this.dmNovita; },

  azioneDm(p, a) {
    const t = a.tipo;
    if (t === 'dm-scegli') {
      if (this.fase !== 'creazione') return { errore: 'Il master si sceglie prima di cominciare' };
      if (this.modalita === 'reale') return { errore: 'In tempo reale non c\'è il master' };
      const k = Number(a.posto);
      if (!Number.isInteger(k) || k < 0 || k >= this.n) return { errore: 'Posto non valido' };
      if (!this.eHost(p) && !(k === p && this.dm == null)) return { errore: 'Il master lo sceglie chi ha aperto il tavolo' };
      if (this.bot[k]) return { errore: 'Il master deve essere una persona' };
      if (this.n < 2) return { errore: 'Per fare il master serve almeno un altro posto al tavolo' };
      if (this.locali.includes(k)) return { errore: 'Il master deve giocare dal suo dispositivo, non da quello passato tra i giocatori' };
      this.dm = k; this.dmAuto = false;
      this.pg[k] = null; this.tirati[k] = null; this.suggerite[k] = null;
      this.annuncia(k, 'fa il master 🎩', 'sei il master 🎩', true);
      return { ok: true };
    }
    if (t === 'dm-lascia') {
      if (this.dm == null) return { errore: 'Il master è già l\'IA' };
      if (p !== this.dm && !this.eHost(p)) return { errore: 'Può farlo solo il master o chi ha aperto il tavolo' };
      this.dm = null; this.dmAuto = false; this.bozzaDM = null;
      if (this.fase !== 'creazione') {
        this.scrivi('sistema', '🧠 Da ora il master è di nuovo l\'IA.');
        this.lasciaAllIa();
      }
      return { ok: true };
    }
    if (p !== this.dm) return { errore: 'Solo il master può farlo' };
    if (this.fase === 'creazione' && t !== 'dm-chiedi') return { errore: 'Prima i giocatori creano i personaggi' };
    if (t === 'dm-auto') {
      this.dmAuto = !!a.si;
      this.scrivi('sistema', this.dmAuto ? '🤖 Il master lascia raccontare l\'IA.' : '🎩 Il master riprende in mano il racconto.');
      if (this.dmAuto) this.lasciaAllIa();
      return { ok: true };
    }
    if (t === 'dm-ia') { if (!this.lasciaAllIa()) return { errore: 'Non c\'è niente a cui rispondere adesso' }; return { ok: true }; }
    if (t === 'dm-rispondi') return this.rispostaDm(a.risposta);
    if (t === 'dm-narra') {
      const testo = String(a.testo || '').trim().slice(0, 9000);
      if (!testo) return { errore: 'Scrivi cosa racconti' };
      if (this.finita) return { errore: 'La campagna è finita' };
      this.scrivi('master', testo, { combattimento: !!this.combattimento });
      this.storia.push({ ruolo: 'master', testo: testo.slice(0, 3000) });
      return { ok: true };
    }
    if (t === 'dm-libera') {
      const x = this.liberaDM;
      if (!x) return { errore: 'Nessuna azione da giudicare' };
      this.liberaDM = null; this.attesaLibera = false;
      if (this.combattimento !== x.cb) return { ok: true };
      const o = a.esito && typeof a.esito === 'object' ? a.esito : {};
      this.liberaPronta = { o: { narrazione: String(o.narrazione || '').slice(0, 3000), riuscita: o.riuscita !== false, effetti: Array.isArray(o.effetti) ? o.effetti.slice(0, 6) : [] }, c: x.c, cb: x.cb };
      this.applicaLibera();
      this.dopoAzioneCombattimento();
      return { ok: true };
    }
    if (t === 'dm-bozza') {
      if (!this.attesaDM) return { errore: 'La bozza si chiede quando i giocatori aspettano il master' };
      if (this.attesaBozza) return { errore: 'L\'IA sta già scrivendo la bozza' };
      const id = this.attesaDM.id;
      this.attesaBozza = true;
      this.promessaMaster(this.attesaDM.tipo, this.attesaDM.richiesta).then((r) => {
        this.attesaBozza = false; this.dmNovita = true;
        if (r.errore) { this.consiglio('ia', `⚠️ Non riesco a scrivere la bozza: ${r.errore}.`); return; }
        if (this.attesaDM && this.attesaDM.id === id) this.bozzaDM = { id, r };
      }).catch(() => { this.attesaBozza = false; this.dmNovita = true; });
      return { ok: true };
    }
    if (t === 'dm-chiedi') {
      const domanda = String(a.testo || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
      if (!domanda) return { errore: 'Scrivi la domanda' };
      if (this.attesaConsiglio) return { errore: 'Il consigliere sta ancora rispondendo' };
      this.consiglio('dm', domanda);
      this.attesaConsiglio = true;
      this.chiediConsigliere(domanda).then((x) => { this.attesaConsiglio = false; this.dmNovita = true; this.consiglio('ia', x); })
        .catch(() => { this.attesaConsiglio = false; this.dmNovita = true; this.consiglio('ia', '⚠️ Il consigliere non risponde: riprova tra poco.'); });
      return { ok: true };
    }
    if (t === 'dm-riscrivi') {
      const campo = CAMPI_RISCRITTURA.includes(a.campo) ? a.campo : 'dmNarr';
      const testo = String(a.testo || '').trim().slice(0, 3000);
      if (!testo) return { errore: 'Scrivi prima cosa succede, anche in due parole: poi l\'IA lo racconta per bene' };
      if (this.attesaRiscrittura) return { errore: 'L\'IA sta già riscrivendo' };
      const id = ++this.nRiscritture;
      this.attesaRiscrittura = true;
      this.riscrivi(testo).then((x) => { this.riscritturaDM = { id, campo, originale: testo, ...x }; })
        .catch(() => { this.riscritturaDM = { id, campo, originale: testo, errore: 'l\'IA non risponde: riprova tra poco' }; })
        .finally(() => { this.attesaRiscrittura = false; this.dmNovita = true; });
      return { ok: true };
    }
    if (t === 'dm-svuota') { this.consigli = []; return { ok: true }; }
    if (t === 'dm-nemici') {
      this.dmNemici = !!a.si; this.manoChiave = null;
      if (this.combattimento) this.combattimento.evento({ tipo: 'nota', testo: this.dmNemici ? '🎩 Da ora i nemici li muove il master.' : '🤖 Da ora i nemici li muove il gioco.' });
      return { ok: true };
    }
    if (t === 'dm-cb') return this.mossaDm(a);
    return { errore: 'Mossa non valida' };
  },
  // il master muove i nemici: al loro turno con le regole (muovi, attacca, soffio, scatto…), oppure li sposta a mano
  mossaDm(a) {
    const cb = this.combattimento;
    if (this.fase !== 'combattimento' || !cb || cb.finito) return { errore: 'Adesso non c\'è un combattimento' };
    if (a.mossa === 'sposta') return this.spostaDm(cb, a);
    if (!this.dmNemici) return { errore: 'I nemici li sta muovendo il gioco: scegli «Li muovo io»' };
    if (!this.manoAttiva()) return { errore: 'Adesso non tocca a un nemico' };
    const c = cb.attivo;
    this.manoChiave = this.chiaveMano(); this.manoDa = Date.now();
    let r;
    if (a.mossa === 'muovi') r = cb.muovi(c.id, a.x, a.y);
    else if (a.mossa === 'attacca') r = cb.attacca(c.id, a.bersaglio, { arma: a.arma });
    else if (a.mossa === 'azione' && a.az === 'soffio') r = this.soffioDm(cb, c, a.punto);
    else if (a.mossa === 'azione' && ['scatto', 'disimpegno', 'schivata'].includes(a.az)) r = cb.azioneSemplice(c.id, a.az);
    else if (a.mossa === 'fine') r = cb.fineTurno(c.id);
    else if (a.mossa === 'autoTurno') r = cb.turnoAutomatico(this.livelloIA());
    else return { errore: 'Mossa non valida' };
    if (r && r.errore) return r;
    this.manoChiave = this.chiaveMano(); this.manoDa = Date.now();
    this.dopoAzioneCombattimento();
    return { ok: true };
  },
  // il soffio del mostro (draghi, chimere…), come lo usa il gioco: si ricarica con 5-6 su un d6 all'inizio del turno
  soffioDm(cb, c, punto) {
    const s = c.ref.soffio;
    if (!s) return { errore: `${c.ref.nome} non ha un soffio` };
    if (!s.pronto) return { errore: 'Il soffio non è ancora pronto (si ricarica con 5 o 6 su un d6 a inizio turno)' };
    if (!c.turno.azione) return { errore: 'Ha già usato l\'azione' };
    const x = Math.round(Number(punto && punto.x)), y = Math.round(Number(punto && punto.y));
    if (!(x >= 0 && y >= 0 && x < cb.scena.w && y < cb.scena.h) || (x === c.x && y === c.y)) return { errore: 'Tocca la direzione del soffio' };
    c.turno.azione = false; s.pronto = false;
    cb.areaDanno(c, { x, y }, { forma: s.forma, m: s.m }, { danno: s.danno, tipoDanno: s.tipo, ts: s.ts, cd: s.cd, meta: true, nome: 'Soffio' });
    cb.controllaFine();
    return { ok: true };
  },
  // la mano del master: un nemico va dove vuole lui (una casella libera dove si può stare), senza movimento né attacchi
  // di opportunità. Si può fare in qualsiasi momento della battaglia.
  spostaDm(cb, a) {
    const c = cb.c(a.id);
    if (!c || c.pg || c.lato !== 'nemici' || !cb.vivo(c)) return { errore: 'Puoi spostare solo i nemici ancora in piedi' };
    const x = Math.round(Number(a.x)), y = Math.round(Number(a.y)), { w, h, g } = cb.scena;
    if (!(x >= 0 && y >= 0 && x < w && y < h)) return { errore: 'Fuori dalla mappa' };
    if (x === c.x && y === c.y) return { errore: 'È già lì' };
    if (!M.passabile(g[y * w + x])) return { errore: 'Lì non ci si può stare' };
    if (cb.occupata(x, y, c)) return { errore: 'Lì c\'è già qualcuno' };
    // il percorso in linea retta, per l'animazione della pedina che scivola
    const n = Math.max(Math.abs(x - c.x), Math.abs(y - c.y)), percorso = [];
    for (let k = 0; k <= n; k++) percorso.push({ x: Math.round(c.x + ((x - c.x) * k) / n), y: Math.round(c.y + ((y - c.y) * k) / n) });
    c.x = x; c.y = y;
    cb.evento({ tipo: 'movimento', id: c.id, percorso, testo: `🖐️ Il master sposta ${c.ref.nome}.` });
    return { ok: true };
  },
  // al master: il nemico che tocca a lui muovere, con i suoi attacchi
  manoDm() {
    if (!this.manoAttiva()) return null;
    const cb = this.combattimento, c = cb.attivo, s = c.ref.soffio;
    return {
      id: c.id, nome: c.ref.nome,
      attacchi: cb.attacchiDi(c).map((x) => ({ id: x.id, nome: x.nome, colpire: x.colpire, danno: x.danno, tipo: x.tipo, mischia: x.mischia, portata: x.portata, gittata: x.gittata })),
      soffio: s ? { pronto: !!s.pronto, forma: s.forma, m: s.m, danno: s.danno, tipo: s.tipo } : null,
      incantesimi: !!(c.ref.incantesimi && c.ref.incantesimi.lista && c.ref.incantesimi.lista.length),
      attesa: this.manoChiave === this.chiaveMano() ? Math.max(0, this.manoDa + ATTESA_MANO - Date.now()) : ATTESA_MANO,
    };
  },
  consiglio(ruolo, testo) { this.consigli.push({ ruolo, testo: String(testo || '').slice(0, 6000), ora: Date.now() }); if (this.consigli.length > MAX_CONSIGLI) this.consigli.shift(); },

  // il master risponde: le stesse chiavi della risposta dell'IA (master.js), applicate con le stesse regole
  rispostaDm(ris) {
    if (this.finita) return { errore: 'La campagna è finita' };
    if (!this.attesaDM && (this.fase !== 'avventura' || this.attesaIA)) return { errore: this.fase === 'prove' ? 'Aspetta che i giocatori tirino i dadi' : 'Adesso non puoi intervenire' };
    const r = MASTER.normalizza(ris && typeof ris === 'object' ? ris : {});
    r.narrazione = r.narrazione.trim();
    if (!r.narrazione && !r.prove.length && !r.salvezze.length && !r.eventi.length && !r.combattimento) return { errore: 'Scrivi cosa succede (o aggiungi una prova, un combattimento o un evento)' };
    if (!this.attesaDM && (r.prove.length || r.salvezze.length || r.combattimento)) { this.dichiarazioni = {}; this.primaDichiarazione = null; }
    this.attesaDM = null; this.attesaIA = false; this.bozzaDM = null;
    this.applicaRisposta(r);
    return { ok: true };
  },
  // l'IA risponde al posto del master (una volta, in automatico, o perché il master non c'è più)
  lasciaAllIa() {
    let fatto = false;
    if (this.attesaDM) { this.attesaDM = null; this.bozzaDM = null; if (this.ultimaRichiesta) { this.ultimaRichiesta.ia = true; this.chiamaMaster(); } else this.attesaIA = false; fatto = true; }
    if (this.liberaDM) { const x = this.liberaDM; this.liberaDM = null; if (this.combattimento === x.cb) this.chiediLiberaIA(x); else this.attesaLibera = false; fatto = true; }
    return fatto;
  },

  chiediConsigliere(domanda) {
    if (!(this.chiave && this.fetch)) return Promise.resolve(this.consiglioRiserva(domanda));
    const attesa = this.attesaDM ? `\n\nRICHIESTA IN ATTESA (i giocatori aspettano la risposta del master):\n${this.attesaDM.richiesta}` : this.liberaDM ? `\n\nAZIONE LIBERA DA GIUDICARE: ${this.liberaDM.chi} tenta «${this.liberaDM.testo}» (d20: ${this.liberaDM.d20})` : '';
    const prima = this.consigli.slice(-9, -1).map((c) => `${c.ruolo === 'dm' ? 'MASTER' : 'CONSIGLIERE'}: ${c.testo.slice(0, 800)}`).join('\n');
    const msg = `${this.contesto()}${attesa}\n\nFASE: ${this.fase}${this.combattimento ? ` (combattimento, round ${this.combattimento.round})` : ''}\n${prima ? `\nDOMANDE DI PRIMA:\n${prima}\n` : ''}\n=== IL MASTER CHIEDE ===\n${domanda}`;
    return MASTER.chiamaGemini({ chiave: this.chiave, sistema: `${CONSIGLIERE}\n\n${this.sistema()}`, messaggi: [{ ruolo: 'giocatori', testo: msg }], fetch: this.fetch, json: false, temperatura: 0.8, maxToken: 1500 })
      .then((r) => (r.errore ? `⚠️ ${r.errore}. Intanto: ${this.consiglioRiserva(domanda)}` : String(r.testo || '').trim() || '…'));
  },
  // il testo grossolano del master -> racconto curato (o, senza IA, solo sistemato: maiuscole, spazi, punto finale)
  riscrivi(testo) {
    if (!(this.chiave && this.fetch)) return Promise.resolve({ testo: sistemaTesto(testo), riserva: true });
    const tono = this.pazza ? 'MODALITÀ PAZZA: racconto comico, esagerato e assurdo, che fa ridere. Parolacce e volgarità del master restano (anzi, falle rendere ancora di più).' : this.cp ? 'Ambientazione HORROR: tono teso, cupo e opprimente, frasi brevi.' : `Tono dell'ambientazione: ${this.ambientazione || 'fantasy classico'}.`;
    const msg = `${this.contesto()}\n\n${tono}${this.lunghezza === 'brevi' ? ' Il tavolo vuole racconti brevi: resta corto.' : ''}\n\n=== IL MASTER HA SCRITTO (da riscrivere) ===\n${testo}`;
    return MASTER.chiamaGemini({ chiave: this.chiave, sistema: RISCRITTORE, messaggi: [{ ruolo: 'giocatori', testo: msg }], fetch: this.fetch, json: false, temperatura: 0.8, maxToken: 2000 })
      .then((r) => {
        const nuovo = r.errore ? '' : pulisciRiscritto(r.testo);
        return nuovo ? { testo: nuovo.slice(0, 9000) } : { errore: r.errore || 'l\'IA non ha scritto niente' };
      });
  },
  consiglioRiserva(domanda) {
    const d = String(domanda || '').toLowerCase();
    const trovati = RISERVA.filter(([re]) => re.test(d)).map(([, t]) => t);
    const lv = Math.round(this.pgVivi().reduce((s, i) => s + this.pg[i].livello, 0) / Math.max(1, this.pgVivi().length)) || 1;
    const adatti = infoBestiario(this.cp).filter((m) => m.gs <= Math.max(0.5, lv)).sort((x, y) => y.gs - x.gs).slice(0, 4).map((m) => `${m.nome} (GS ${m.gs})`);
    if (/mostr|combatt|incontr|nemic/.test(d) && adatti.length) trovati.push(`Adatti al gruppo (livello ${lv}): ${adatti.join(', ')}.`);
    return `📕 (L'IA non è disponibile: consigli scritti a mano) ${trovati.length ? trovati.join('\n\n') : `${RISERVA[4][1]}\n\n${DADI_CD}`}`;
  },

  // quello che vede solo il master
  vistaDm(p) {
    if (p !== this.dm) return null;
    const x = this.liberaDM, cb = this.combattimento;
    return {
      richiesta: this.attesaDM ? { id: this.attesaDM.id, tipo: this.attesaDM.tipo, testo: perUmano(this.attesaDM.richiesta) } : null,
      libera: x && cb === x.cb ? { chi: x.chi, testo: x.testo, d20: x.d20, creature: cb.creature.filter((c) => cb.vivo(c)).map((c) => ({ nome: c.ref.nome, lato: c.lato, pf: c.ref.pf, pfMax: c.ref.pfMax, ca: c.ref.ca })) } : null,
      consigli: this.consigli.slice(-MAX_CONSIGLI), attesaConsiglio: this.attesaConsiglio,
      bozza: this.bozzaDM, attesaBozza: this.attesaBozza,
      riscrittura: this.riscritturaDM, attesaRiscrittura: this.attesaRiscrittura,
      nemiciAMano: this.dmNemici, mano: this.manoDm(),
      bestiario: infoBestiario(this.cp),
      scene: this.cp ? ['stazione', 'uffici', 'alloggi', 'medico', 'laboratorio', 'industriale', 'tram', 'nido', 'sottomarina', 'fondale', 'manicomio', 'fogne', 'cortile'] : ['dungeon', 'grotta', 'foresta', 'villaggio', 'taverna', 'cripta', 'palude', 'montagna', 'strada', 'castello'],
      segreti: this.cp && this.incubo && this.incubo.area ? this.contestoIncubo().trim() : null,
      oggettiTema: this.cp ? Object.entries(H.OGGETTI).filter(([, o]) => o.tipo !== 'chiave').map(([id, o]) => ({ id, nome: o.nome, icona: o.icona })) : null,
      chiaviTema: this.cp ? [...new Set(this.cp.collegamenti.map((l) => l[3]).filter(Boolean))].map((id) => ({ id, nome: H.OGGETTI[id].nome })) : null,
    };
  },
  // horror: il master vede tutta la stazione, con la creatura
  stazioneDm(v) {
    const cp = this.cp, inc = this.incubo, c = inc.caccia;
    const chiavi = this.chiaviDelGruppo(), ob = this.obiettivoOra;
    return {
      ...v,
      aree: cp.aree.map((a) => ({ id: a.id, nome: a.nome, gx: a.gx, gy: a.gy, stile: a.stile, luce: a.luce, visitata: inc.visitate.includes(a.id), obiettivo: !!(ob && ob.area === a.id), segnale: !!(c.attiva && c.area === a.id) })),
      strade: (v.strade || []).map((x) => ({ ...x, nome: this.areaDi(x.id).nome })),
      collegamenti: cp.collegamenti.map((l) => ({ a: l[0], b: l[1], tipo: l[2], chiuso: !!(l[3] && !chiavi.has(l[3])), serve: l[3] ? H.OGGETTI[l[3]].nome : null })),
    };
  },
};

module.exports = { metodi, ATTESA_MANO, infoBestiario, perUmano, CONSIGLIERE, RISCRITTORE, sistemaTesto, pulisciRiscritto };
