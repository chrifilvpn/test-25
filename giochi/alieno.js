// CHI È L'ALIENO: un equipaggio di astronauti su una base spaziale; uno o più di loro sono Alieni che si sono presi un
// corpo umano e non si distinguono dagli altri. L'equipaggio vince finendo i compiti o espellendo tutti gli Alieni;
// gli Alieni vincono quando sono tanti quanti gli umani vivi. Da 4 a 10; i posti vuoti li può prendere il computer (alieno-bot.js).
// Mappa a tile (40 px), stanze collegate da corridoi che si diramano, con due scorciatoie. Ognuno vede solo intorno
// a sé e i muri fermano lo sguardo: il server manda a ognuno solo quello che vede.
const { Arena } = require('./arena');
const T_ = require('./trucco'); // (T qui è la misura dei tile)
const T = 40, COLS = 65, RIGHE = 42, MW = COLS * T, MH = RIGHE * T; // mondo 2600 × 1680
const W = 1000, H = 620;            // quello che si vede sullo schermo (la telecamera segue il tuo astronauta)
const R = 14, V = 175, V_FANTASMA = 210, VISTA = 290;
const RAGGIO_UCCIDI = 75, RAGGIO_SEGNALA = 110, RAGGIO_COMPITO = 70, RAGGIO_PULSANTE = 90;
const DISCUSSIONE = 30, VOTO = 120, ESPULSIONE = 6, ATTESA_PULSANTE = 15, RIUNIONI_A_TESTA = 1;
const ASSENTE_MAX = 60; // chi è fuori da più di 60 s: i suoi compiti non contano più (la partita non si blocca)
const cooldown = (n) => (n >= 7 ? 20 : 25);

// ---------------- le mappe (una per file in giochi/alieno-mappe/) ----------------
const { MAPPE, ELENCO } = require('./alieno-mappe');
const { Menti } = require('./alieno-bot'); // i computer
const MIN_TEMPO = { semplice: 2, medio: 5, elaborato: 7 }; // secondi minimi per compito (la consegna: per ogni postazione)
const COMPITI_MIX = { semplice: 2, medio: 2, elaborato: 1 }; // 5 compiti a testa, di livelli diversi, senza doppioni
const FINE = 7; // secondi della schermata finale prima dei risultati
const centro = (t) => ({ x: t[0] * T + T / 2, y: t[1] * T + T / 2 });
const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function maxAlieni(n) { return n >= 9 ? 3 : n >= 7 ? 2 : 1; }

class Alieno extends Arena {
  constructor(o) {
    super(o, { id: 'alieno', round: 1, tickMs: 50 });
    this.nRound = 1;
    this.W = W; this.H = H;
    const voluti = [1, 2, 3].includes(Number(o.opzioni && o.opzioni.alieni)) ? Number(o.opzioni.alieni) : 1;
    this.nAlieni = Math.min(voluti, maxAlieni(o.n));
    this.chatSistema = [];
    this.chatDa = []; // le frasi dei computer nelle riunioni (il server le scrive in chat a loro nome)
    if (this.nAlieni < voluti) this.chatSistema.push(`👽 Con ${o.n} giocatori gli Alieni possono essere al massimo ${this.nAlieni}: si gioca con ${this.nAlieni}.`);
    this.uscitoDa = new Array(o.n).fill(null);
    // la mappa: quella scelta nella sala, oppure una a caso
    const scelta = o.opzioni && o.opzioni.mappa;
    this.mappaId = ELENCO.includes(scelta) ? scelta : ELENCO[Math.floor(Math.random() * ELENCO.length)];
    this.M = MAPPE[this.mappaId];
    this.avvia();
  }
  cella(x, y) { const c = Math.floor(x / T), r = Math.floor(y / T); return r < 0 || c < 0 || r >= RIGHE || c >= COLS ? '#' : this.M.mappa[r][c]; }
  solido(x, y) { const k = this.cella(x, y); return k === '#' || k === 'M'; }
  vede(a, b, raggio = VISTA) {
    const d = Math.hypot(b.x - a.x, b.y - a.y); if (d > raggio) return false;
    const n = Math.ceil(d / 10);
    for (let k = 1; k < n; k++) if (this.cella(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n) === '#') return false;
    return true;
  }
  partenze() { return Array.from({ length: this.n }, (_, i) => { const a = (i / this.n) * Math.PI * 2; return { x: this.M.pulsante.x + Math.cos(a) * 125, y: this.M.pulsante.y + Math.sin(a) * 110 }; }); }
  iniziaRound() {
    const alieni = new Set(mescola([...Array(this.n).keys()]).slice(0, this.nAlieni));
    const pos = this.partenze();
    this.e = Array.from({ length: this.n }, (_, i) => {
      const scelti = this.scegliCompiti();
      return {
        id: i, x: pos[i].x, y: pos[i].y, dir: 1, passo: 0, vivo: true, alieno: alieni.has(i), riunioni: RIUNIONI_A_TESTA,
        compiti: scelti.map((s) => ({ id: s.id, st: s.id, fatto: false, passo: 0, tipo: s.tipo, livello: s.livello })), compito: null, prontoUccidi: 10,
      };
    });
    this.corpi = [];
    this.fase2 = 'libero';
    this.riunione = null; this.espulsione = null; this.vittoria = null;
    this.pulsanteDa = ATTESA_PULSANTE;
    this.menti = new Menti(this, { T, COLS, RIGHE, MIN: MIN_TEMPO, RAGGI: { compito: RAGGIO_COMPITO, segnala: RAGGIO_SEGNALA, uccidi: RAGGIO_UCCIDI, pulsante: RAGGIO_PULSANTE } });
    this.annuncia(null, `🚀 Si parte! A bordo ${this.nAlieni === 1 ? 'c\'è 1 Alieno' : `ci sono ${this.nAlieni} Alieni`}`, `🚀 Si parte! A bordo ${this.nAlieni === 1 ? 'c\'è 1 Alieno' : `ci sono ${this.nAlieni} Alieni`}`, true);
  }
  // 5 compiti: 2 semplici, 2 medi e 1 elaborato, tutti di tipo diverso e in postazioni diverse (niente doppioni)
  scegliCompiti() {
    const tipi = new Set(), presi = [];
    for (const [liv, quanti] of Object.entries(COMPITI_MIX)) {
      for (const st of mescola(this.M.stazioni.filter((q) => q.livello === liv && !q.arrivo))) {
        if (presi.filter((q) => q.livello === liv).length >= quanti) break;
        if (tipi.has(st.tipo)) continue;
        tipi.add(st.tipo); presi.push(st);
      }
    }
    return mescola(presi);
  }
  riepilogo() {
    let fatti = 0, tot = 0;
    for (const e of this.e) if (!e.alieno) for (const c of e.compiti) { tot++; if (c.fatto) fatti++; }
    return { chi: this.vittoria.chi, perche: this.vittoria.perche, fatti, tot, alieni: this.nAlieni, g: this.e.map((e) => ({ a: e.alieno ? 1 : 0, s: e.vivo ? 'vivo' : e.espulso ? 'espulso' : 'eliminato' })) };
  }
  stanzaDi(x, y) { const c = x / T, r = y / T; const s = this.M.stanze.find((q) => c >= q.r[0] && c < q.r[0] + q.r[2] && r >= q.r[1] && r < q.r[1] + q.r[3]); return s ? s.nome : 'Corridoio'; }
  stazione(id) { return this.M.stazioni.find((s) => s.id === Number(id)); }
  esce(p) { super.esce(p); if (this.uscitoDa[p] === null) this.uscitoDa[p] = this.tempoRound || 0; }
  rientra(p) { super.rientra(p); this.uscitoDa[p] = null; }
  // i computer (vedi alieno-bot.js): ricordano cosa vedono e decidono dove andare e cosa fare
  pensa(p) {
    if (!this.menti || this.fase2 === 'fine') return {};
    this.menti.dt = this.tickMs / 1000;
    this.menti.osserva(p, this.tempoRound);
    return this.menti.pensa(p) || {};
  }
  // ---- compiti ----
  conta(p) { const e = this.e[p]; return !e.alieno && !(this.uscitoDa[p] !== null && this.tempoRound - this.uscitoDa[p] > ASSENTE_MAX); }
  progresso() {
    let fatti = 0, tot = 0;
    for (const e of this.e) if (this.conta(e.id)) for (const c of e.compiti) { tot++; if (c.fatto) fatti++; }
    return tot ? fatti / tot : 1;
  }
  vivi() { return this.e.filter((e) => e.vivo); }
  controllaVittoria() {
    if (this.vittoria) return true;
    const alieniVivi = this.vivi().filter((e) => e.alieno).length, umaniVivi = this.vivi().filter((e) => !e.alieno).length;
    if (alieniVivi === 0) this.vittoria = { chi: 'equipaggio', perche: 'Tutti gli Alieni sono stati espulsi' };
    else if (alieniVivi >= umaniVivi) this.vittoria = { chi: 'alieni', perche: 'Gli Alieni sono tanti quanti gli umani rimasti' };
    else if (this.progresso() >= 1) this.vittoria = { chi: 'equipaggio', perche: 'L\'equipaggio ha finito tutti i compiti' };
    if (this.vittoria) {
      this.fase2 = 'fine'; this.fineVittoria = this.tempoRound; this.cambiato = true;
      this.annuncia(null, `${this.vittoria.chi === 'alieni' ? '👽 Vincono gli ALIENI' : '🧑‍🚀 Vince l\'EQUIPAGGIO'}: ${this.vittoria.perche}`, `${this.vittoria.chi === 'alieni' ? '👽 Vincono gli ALIENI' : '🧑‍🚀 Vince l\'EQUIPAGGIO'}`, true);
    }
    return !!this.vittoria;
  }
  // ---- movimento ----
  muovi(e, i, dt) {
    const l = Math.hypot(i.x, i.y); if (l < 0.05) { e.passo = 0; return; }
    const k = Math.min(1.25, l), v = e.vivo ? V : V_FANTASMA; // fino a 1,25 solo per recuperare il ritardo della rete (vedi Arena.verso)
    const mx = (i.x / l) * k * v * dt, my = (i.y / l) * k * v * dt;
    if (Math.abs(mx) > 0.01) e.dir = Math.sign(mx);
    if (!e.vivo) { e.x = Math.max(T, Math.min(MW - T, e.x + mx)); e.y = Math.max(T, Math.min(MH - T, e.y + my)); e.passo += dt; return; } // i fantasmi passano i muri
    const nx = e.x + mx; if (![-R, R * 0.5].some((o) => this.solido(nx + Math.sign(mx) * R, e.y + o))) e.x = nx;
    const ny = e.y + my; if (![-R * 0.8, R * 0.8].some((o) => this.solido(e.x + o, ny + (my > 0 ? R * 0.6 : -R * 0.4)))) e.y = ny;
    e.passo += dt;
  }
  passo(dt) {
    const t = this.tempoRound;
    if (this.fase2 === 'fine') return t - this.fineVittoria > FINE; // la schermata finale resta qualche secondo
    if (this.fase2 === 'libero') {
      for (let p = 0; p < this.n; p++) {
        const e = this.e[p];
        e.prontoUccidi = Math.max(0, e.prontoUccidi - dt);
        if (e.compito) { e.passo = 0; continue; } // mentre fai un compito sei fermo
        this.muovi(e, this.verso(p, e, e.vivo ? V : V_FANTASMA, dt), dt);
      }
      this.pulsanteDa = Math.max(0, this.pulsanteDa - dt);
    } else if (this.fase2 === 'discussione' && t >= this.riunione.fine) { this.riunione.fase = 'voto'; this.fase2 = 'voto'; this.riunione.fine = t + VOTO; this.cambiato = true; }
    else if (this.fase2 === 'voto' && (t >= this.riunione.fine || this.vivi().every((e) => this.riunione.voti[e.id] !== undefined))) this.chiudiVoto();
    else if (this.fase2 === 'espulsione' && t >= this.espulsione.fine) {
      this.fase2 = 'libero'; this.espulsione = null; this.cambiato = true;
      if (this.controllaVittoria()) return false;
    }
    // nelle riunioni i computer parlano (una frase per volta)
    if ((this.fase2 === 'discussione' || this.fase2 === 'voto') && this.menti) {
      const frasi = this.menti.chiacchiera(t);
      if (frasi.length) { this.chatDa.push(...frasi); this.cambiato = true; }
    }
    if (this.fase2 === 'libero' && this.controllaVittoria()) return false;
    return false;
  }
  // ---- riunioni ----
  apriRiunione(tipo, da, corpo) {
    const t = this.tempoRound;
    this.fase2 = 'discussione';
    this.riunione = { tipo, da, corpo, fase: 'discussione', fine: t + DISCUSSIONE, voti: {}, n: (this.riunione ? this.riunione.n : 0) + 1 };
    for (const e of this.e) e.compito = null;
    this.cambiato = true;
    if (this.menti) this.menti.riunione(tipo, da, corpo);
    this.annuncia(da, tipo === 'corpo' ? `ha trovato il corpo di @! Riunione d'emergenza 📣` : 'ha chiamato una riunione d\'emergenza 🚨', tipo === 'corpo' ? 'hai segnalato un corpo: riunione! 📣' : 'hai chiamato una riunione 🚨', true, corpo !== undefined ? { bersaglio: corpo, testoTe: 'hanno trovato il tuo corpo' } : {});
  }
  chiudiVoto() {
    const conta = {};
    for (const [chi, v] of Object.entries(this.riunione.voti)) if (this.e[chi].vivo) conta[v] = (conta[v] || 0) + 1;
    const max = Math.max(0, ...Object.values(conta));
    const primi = Object.keys(conta).filter((k) => conta[k] === max);
    // pareggio (o maggioranza per "nessuno"): non si espelle nessuno
    const espulso = max > 0 && primi.length === 1 && primi[0] !== '-1' ? Number(primi[0]) : null;
    const t = this.tempoRound;
    let alieno = null;
    if (espulso !== null) { const e = this.e[espulso]; e.vivo = false; e.espulso = true; alieno = e.alieno; }
    const rimasti = this.e.filter((e) => e.vivo && e.alieno).length;
    this.espulsione = { chi: espulso, alieno, rimasti, fine: t + ESPULSIONE, conta, pari: primi.length > 1 && max > 0 };
    this.riunione.fase = 'fine'; this.riunione.esito = { conta, espulso };
    this.fase2 = 'espulsione'; this.cambiato = true;
    // tutti di nuovo intorno al tavolo; i corpi si portano via; attese ripartono
    const pos = this.partenze();
    for (const e of this.e) { if (e.vivo) { e.x = pos[e.id].x; e.y = pos[e.id].y; } e.compito = null; e.prontoUccidi = Math.max(e.prontoUccidi, 12); }
    this.corpi = [];
    this.pulsanteDa = ATTESA_PULSANTE;
    if (this.menti) this.menti.dopoVoto(espulso);
    this.annuncia(espulso, espulso === null ? 'Nessuno è stato espulso' : alieno ? 'è stato espulso nello spazio: ERA un Alieno! 👽' : 'è stato espulso nello spazio… e NON era un Alieno 😢', espulso === null ? 'Nessuno è stato espulso' : 'sei stato espulso nello spazio', true);
    this.chatSistema.push(espulso === null ? `🗳️ Nessuno espulso${primi.length > 1 && max > 0 ? ' (pareggio)' : ''}. Alieni rimasti: ${rimasti}` : `🗳️ @${espulso} è stato espulso: ${alieno ? 'ERA un Alieno' : 'NON era un Alieno'}. Alieni rimasti: ${rimasti}`);
  }
  // ---- azioni (pulsanti e tasti) ----
  azione(p, a) {
    if (this.finita || this.fase !== 'gioco') return { errore: 'Aspetta un attimo' };
    const e = this.e[p], t = this.tempoRound;
    if (!a || typeof a.tipo !== 'string') return { errore: 'Azione non valida' };
    if (a.tipo === 'vota') {
      if (this.fase2 !== 'voto') return { errore: 'Adesso non si vota' };
      if (!e.vivo) return { errore: 'I fantasmi non votano' };
      if (this.riunione.voti[p] !== undefined) return { errore: 'Hai già votato' };
      const chi = Number(a.chi);
      if (chi !== -1 && !(this.e[chi] && this.e[chi].vivo)) return { errore: 'Non puoi votare per lui' };
      this.riunione.voti[p] = chi; this.cambiato = true;
      return { ok: true };
    }
    if (this.fase2 !== 'libero') return { errore: 'Durante la riunione nessuno si muove' };
    if (a.tipo === 'uccidi') {
      if (!e.vivo || !e.alieno) return { errore: 'Non puoi' };
      if (e.prontoUccidi > 0) return { errore: `Devi aspettare ancora ${Math.ceil(e.prontoUccidi)} secondi` };
      let bers = null, dm = RAGGIO_UCCIDI;
      for (const o of this.e) if (o.vivo && !o.alieno && Math.hypot(o.x - e.x, o.y - e.y) < dm && this.vede(e, o)) { dm = Math.hypot(o.x - e.x, o.y - e.y); bers = o; }
      if (!bers) return { errore: 'Nessuno abbastanza vicino' };
      bers.vivo = false; bers.compito = null;
      this.corpi.push({ di: bers.id, x: bers.x, y: bers.y, t });
      e.prontoUccidi = cooldown(this.n);
      this.cambiato = true;
      if (this.menti) this.menti.eliminazione(p, bers); // i computer che vedono la scena lo sanno
      // niente annuncio: gli altri non devono sapere che qualcuno è stato eliminato (lo scopre chi trova il corpo)
      this.controllaVittoria();
      return { ok: true };
    }
    if (a.tipo === 'segnala') {
      if (!e.vivo) return { errore: 'I fantasmi non possono segnalare' };
      const c = this.corpi.find((q) => Math.hypot(q.x - e.x, q.y - e.y) < RAGGIO_SEGNALA && this.vede(e, q));
      if (!c) return { errore: 'Non c\'è nessun corpo qui vicino' };
      this.apriRiunione('corpo', p, c.di);
      return { ok: true };
    }
    if (a.tipo === 'riunione') {
      if (!e.vivo) return { errore: 'I fantasmi non possono chiamare riunioni' };
      if (Math.hypot(this.M.pulsante.x - e.x, this.M.pulsante.y - e.y) > RAGGIO_PULSANTE) return { errore: `Il pulsante è in ${this.stanzaDi(this.M.pulsante.x, this.M.pulsante.y)}` };
      if (e.riunioni <= 0) return { errore: 'Hai già usato la tua riunione' };
      if (this.pulsanteDa > 0) return { errore: `Il pulsante si ricarica: ancora ${Math.ceil(this.pulsanteDa)} secondi` };
      e.riunioni--; this.apriRiunione('emergenza', p);
      return { ok: true };
    }
    if (a.tipo === 'inizia') {
      const c = e.compiti.find((q) => q.st === Number(a.id)); // la postazione dove si trova ora il compito (per la consegna, la seconda)
      const st = c && this.stazione(c.st);
      if (!c || !st) return { errore: 'Non è un tuo compito' };
      if (c.fatto) return { errore: 'L\'hai già fatto' };
      const q = centro(st.t);
      if (Math.hypot(q.x - e.x, q.y - e.y) > RAGGIO_COMPITO) return { errore: 'Avvicinati alla postazione' };
      e.compito = { id: st.id, dal: t, compito: c.id };
      return { ok: true };
    }
    if (a.tipo === 'annulla') { e.compito = null; return { ok: true }; }
    if (a.tipo === 'finito') {
      if (!e.compito || e.compito.id !== Number(a.id)) return { errore: 'Nessun compito aperto' };
      const st = this.stazione(e.compito.id), c = e.compiti.find((q) => q.id === e.compito.compito);
      const minimo = st.tipo === 'consegna' ? 3 : MIN_TEMPO[st.livello] || 5;
      if (t - e.compito.dal < minimo) return { errore: 'Troppo veloce!' };
      e.compito = null; this.cambiato = true;
      // la consegna ha due tappe: presa la cosa, il compito si sposta nella seconda postazione
      if (st.tipo === 'consegna' && st.poi) { c.st = st.poi; c.passo = 1; return { ok: true }; }
      c.fatto = true;
      // per gli Alieni è solo finta: il compito risulta fatto nella loro lista ma non conta
      if (!e.alieno) this.controllaVittoria();
      return { ok: true };
    }
    return { errore: 'Azione sconosciuta' };
  }
  // la chat: fuori dalle riunioni i vivi non parlano; i fantasmi parlano solo tra loro
  leggiChat(p, testo) {
    if (this.finita || this.fase !== 'gioco') return {};
    const e = this.e[p];
    if (!e.vivo) return { soloPer: this.e.filter((o) => !o.vivo).map((o) => o.id) };
    if (this.fase2 === 'discussione' || this.fase2 === 'voto') { this.sentiAccuse(p, testo); return {}; }
    if (this.fase2 === 'fine') return {};
    return { nascondi: true, privato: '🤫 Fuori dalle riunioni non si parla: premi il pulsante in Sala comune o segnala un corpo' };
  }
  // le reazioni rapide (emoji) seguono le regole della chat: i vivi solo nelle riunioni, i fantasmi mai (arriverebbero a tutti)
  puoReagire(p) {
    if (this.finita || this.fase !== 'gioco' || this.fase2 === 'fine') return true;
    const e = this.e[p];
    return !!(e && e.vivo && (this.fase2 === 'discussione' || this.fase2 === 'voto'));
  }
  // i computer leggono la chat delle riunioni: chi viene nominato da una persona diventa più sospetto
  sentiAccuse(p, testo) {
    if (!this.menti || !Array.isArray(this.nomiGiocatori)) return;
    const t = ` ${String(testo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')} `;
    const forte = /visto|uccid|elimin|ammazz|e lui|e stato|alieno|impostor/.test(t);
    const salva = /innocente|non e lui|era con me|stava con me/.test(t);
    this.nomiGiocatori.forEach((n, i) => {
      const nome = String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      if (i === p || !nome || !this.e[i] || !this.e[i].vivo || !t.includes(` ${nome} `)) return;
      if (salva) { for (const m of this.menti.m) if (m.sosp[i]) m.sosp[i] *= 0.6; return; }
      this.menti.accusa(p, i, forte ? 2 : 1);
    });
  }
  // il trucco segreto (!win): a chi è dell'equipaggio sussurra chi sono gli Alieni; a un Alieno ricarica subito
  // l'eliminazione e gli dice chi è da solo, lontano dagli occhi degli altri
  suggerimentoWin(posto) {
    const io = this.e && this.e[posto];
    if (!io || this.finita || this.fase !== 'gioco' || this.fase2 === 'fine') return null;
    const nome = (i) => (this.nomiGiocatori && this.nomiGiocatori[i]) || `il giocatore ${i + 1}`;
    if (!io.alieno) {
      const alieni = this.e.filter((e) => e.alieno && e.vivo).map((e) => nome(e.id));
      if (!alieni.length) return null;
      return alieni.length > 1 ? `👽 Alieni: ${alieni.join(', ')}` : `👽 L'Alieno è ${alieni[0]}`;
    }
    if (this.fase2 !== 'libero' || !io.vivo) return null;
    io.prontoUccidi = 0;
    const soli = this.e.filter((o) => o.vivo && !o.alieno && !this.e.some((x) => x.vivo && x.id !== o.id && !x.alieno && this.vede(o, x)));
    const vicino = T_.migliore(soli, (o) => -Math.hypot(o.x - io.x, o.y - io.y));
    return `🗡️ Pronto${vicino ? `: ${nome(vicino.id)} è solo in ${this.stanzaDi(vicino.x, vicino.y)}` : ''}`;
  }
  fineRound() {}
  chiudi() {
    this.finita = true; this.fase = 'fine';
    const v = this.vittoria || { chi: 'equipaggio' };
    const alieni = this.e.filter((e) => e.alieno).map((e) => e.id), equipaggio = this.e.filter((e) => !e.alieno).map((e) => e.id);
    const vincitori = v.chi === 'alieni' ? alieni : equipaggio;
    this.punti = this.punti.map((_, i) => (vincitori.includes(i) ? 1 : 0));
    this.risultato = { fazioni: [{ posti: equipaggio, punti: v.chi === 'alieni' ? 0 : 1, nome: 'Equipaggio' }, { posti: alieni, punti: v.chi === 'alieni' ? 1 : 0, nome: 'Alieni' }], etichetta: 'vittoria', pareggio: false, vincitori };
  }
  vistaExtra() {
    const M = this.M;
    return { mappaId: M.id, nomeMappa: M.nome, espulsioneTema: M.espulsione, tema: M.tema, decori: M.decori, ponti: M.ponti || [],
      mappa: M.mappa, t: T, mw: MW, mh: MH, stanze: M.stanze, mobili: M.mobili, stazioni: M.stazioni.map((s) => ({ ...s, ...centro(s.t) })), pulsante: M.pulsante, vista: VISTA,
      raggi: { uccidi: RAGGIO_UCCIDI, compito: RAGGIO_COMPITO, pulsante: RAGGIO_PULSANTE, segnala: RAGGIO_SEGNALA }, minimi: MIN_TEMPO, r: R, v: V, vf: V_FANTASMA };
  }
  statoTick(posto) {
    const t = this.tempoRound, io = this.e[posto], finito = this.fase2 === 'fine' || this.finita;
    if (!io) return { f2: this.fase2 };
    const tutto = !io.vivo || finito; // i fantasmi vedono tutto
    const visibile = (o) => o.id === posto || tutto || (o.vivo && this.vede(io, o));
    const alieniNoti = io.alieno || finito ? this.e.filter((e) => e.alieno).map((e) => e.id) : [];
    const r = this.riunione;
    return {
      f2: this.fase2, alieniTot: this.nAlieni, stanza: this.stanzaDi(io.x, io.y), prog: Math.round(this.progresso() * 100),
      io: { vivo: io.vivo, alieno: io.alieno, cd: io.alieno ? Math.ceil(io.prontoUccidi) : 0, ri: io.riunioni, compiti: io.compiti, compito: io.compito, espulso: !!io.espulso },
      alieni: alieniNoti,
      // i vivi vedono solo i vivi (i fantasmi sono invisibili ai vivi); i fantasmi vedono anche gli altri fantasmi
      e: this.e.filter(visibile).filter((o) => o.vivo || !io.vivo || finito || o.id === posto).map((o) => ({ id: o.id, x: Math.round(o.x), y: Math.round(o.y), d: o.dir, m: o.passo > 0 ? 1 : 0, f: o.vivo ? 0 : 1, c: o.compito ? 1 : 0 })),
      corpi: this.corpi.filter((c) => tutto || this.vede(io, c)).map((c) => ({ di: c.di, x: Math.round(c.x), y: Math.round(c.y) })),
      pul: Math.ceil(this.pulsanteDa),
      riu: r && this.fase2 !== 'libero' ? { tipo: r.tipo, da: r.da, corpo: r.corpo, fase: r.fase, resta: Math.max(0, Math.ceil(r.fine - t)), votato: Object.keys(r.voti).map(Number), mioVoto: r.voti[posto], esito: r.fase === 'fine' ? r.esito : null, vivi: this.e.filter((e) => e.vivo || (this.espulsione && this.espulsione.chi === e.id)).map((e) => e.id), n: r.n } : null,
      esp: this.espulsione ? { chi: this.espulsione.chi, alieno: this.espulsione.alieno, rimasti: this.espulsione.rimasti, pari: this.espulsione.pari, e: Math.round((ESPULSIONE - (this.espulsione.fine - t)) * 100) / 100 } : null,
      vit: this.vittoria, ruoli: finito ? this.e.map((e) => (e.alieno ? 1 : 0)) : null,
      // la schermata finale (solo a partita finita): chi era cosa, chi è sopravvissuto, compiti fatti
      fin: finito && this.vittoria ? this.riepilogo() : null,
    };
  }
}

module.exports = {
  meta: {
    id: 'alieno',
    nome: 'Chi è l\'Alieno',
    tipo: 'tabellone',
    tempoReale: true,
    giocatori: [4, 5, 6, 7, 8, 9, 10],
    descrizione: 'Un equipaggio di astronauti e, nascosti tra loro, degli Alieni identici agli altri. Fate i compiti, trovate i corpi, discutete e votate chi espellere nello spazio.',
    alias: ['alieno', 'alieni', 'chi è l\'alieno', 'among us', 'impostore spaziale', 'astronauti', 'spazio'],
    opzioni: [
      { id: 'alieni', nome: 'Alieni', valori: [1, 2, 3], etichette: ['1 Alieno', '2 Alieni (da 7 giocatori)', '3 Alieni (con 9 o 10)'], predefinito: 1 },
      // la mappa, con l'anteprima di ognuna nella sala d'attesa
      { id: 'mappa', nome: 'Mappa', valori: ['casuale', ...ELENCO], etichette: ['🎲 Casuale', ...ELENCO.map((id) => `${MAPPE[id].emoji} ${MAPPE[id].nome}`)], predefinito: 'casuale', anteprime: Object.fromEntries(ELENCO.map((id) => [id, MAPPE[id].anteprima])) },
    ],
    regole: [
      'Da 4 a 10 giocatori, anche con il computer. All\'inizio, in segreto, uno o più giocatori diventano Alieni: hanno lo stesso identico aspetto degli altri. Gli Alieni sanno chi sono gli altri Alieni.',
      'Numero di Alieni: lo sceglie chi apre il tavolo (1, 2 o 3). Al massimo 1 fino a 6 giocatori, 2 con 7 o 8, 3 con 9 o 10: se ne hai scelti troppi si gioca con il massimo possibile e compare un avviso in chat.',
      'Mappe (le sceglie chi apre il tavolo, con l\'anteprima, oppure "Casuale"): 🚀 Base spaziale, 🌋 Isola vulcanica (sentieri, ponti di corda sulla lava, capanne, fumarole), 🌿 Pianeta pianta (fiori giganti, liane, funghi luminosi, radici), 🐙 Stazione sottomarina (cupole, oblò, serbatoi) e ❄️ Base polare (hangar, igloo, radar, carotaggi). Ogni mappa ha 10 stanze collegate da passaggi che si diramano, i suoi colori, i suoi compiti a tema e la sua scena di espulsione; le regole sono uguali per tutte. Ti muovi con WASD o le frecce (sul telefono col joystick). Vedi solo intorno a te: i muri fermano lo sguardo. In basso a destra c\'è la mappa con i tuoi compiti.',
      'Compiti: ognuno ne ha 5, senza doppioni: 2 semplici, 2 medi e 1 elaborato. Avvicinati alla postazione e premi E (o 🛠️); mentre fai un compito sei fermo. Semplici (2-4 s): premere al momento giusto, tenere premuto finché la barra è piena, far scorrere una tessera fino in fondo, abbassare una leva. Medi (5-10 s): collegare i fili dello stesso colore, ripetere una sequenza di luci, cliccare i numeri in ordine dopo averli visti, accendere gli interruttori in ordine, tenere un cursore nella zona giusta, mettere gli oggetti in ordine di grandezza, ruotare un pannello finché la freccia è dritta. Elaborati: consegna in due postazioni di stanze diverse (prendi qualcosa in una e portalo nell\'altra), calibrazione con tre cursori, piccolo labirinto da attraversare. Tutti si fanno col mouse, con la tastiera o col dito.',
      'Gli Alieni hanno una lista di compiti finti: possono fingere di farli, con la stessa schermata, ma non contano.',
      'Gli Alieni eliminano chi è vicino premendo Q (o 🗡️). Dopo ogni eliminazione devono aspettare 25 secondi (20 da 7 giocatori in su), e la prima volta 10 secondi dall\'inizio. Il corpo resta dove è caduto.',
      'Chi trova un corpo lo segnala con R (o 📣): parte subito una riunione. Nella stanza centrale di ogni mappa c\'è il pulsante d\'emergenza (E o 🚨 quando sei vicino): ognuno può usarlo una volta a partita, e dopo ogni riunione si ricarica per 15 secondi.',
      'Riunione: tutti fermi. Prima 30 secondi di discussione in chat, poi 2 minuti per votare in segreto chi espellere (o "Nessuno"); si chiude prima se hanno votato tutti. Con un pareggio, o se vince "Nessuno", non si espelle nessuno. Chi viene espulso fa una brutta fine a tema con la mappa (nello spazio, nel vulcano, nella bocca di una pianta carnivora, inghiottito da una creatura degli abissi, in una crepa del ghiaccio) e si scopre se era un Alieno; poi si vede quanti Alieni restano.',
      'Fuori dalle riunioni i vivi non possono scrivere in chat. Chi è eliminato diventa un fantasma: nessun vivo lo vede, passa attraverso i muri, vede tutta la base, può ancora fare i suoi compiti (aiuta l\'equipaggio) e scrive in chat solo agli altri fantasmi.',
      'Vince l\'equipaggio se finisce tutti i compiti (conta la barra in alto) o se espelle tutti gli Alieni. Vincono gli Alieni appena sono tanti quanti gli umani vivi.',
      'A fine partita tutto si ferma per qualche secondo e compare il riepilogo: chi ha vinto, tutti i giocatori con il loro astronauta, i ruoli svelati uno alla volta (gli Alieni si illuminano di viola), chi è stato eliminato o espulso, e quanti compiti sono stati fatti. Poi si passa ai risultati.',
      'Il computer: si muove sulla mappa per la strada più corta, fa i compiti, ricorda chi ha visto e dove, segnala i corpi e nelle riunioni scrive in chat (cosa ha visto, chi sospetta) e vota. Legge anche la chat: chi viene accusato diventa più sospetto. Da Alieno finge i compiti, elimina solo quando nessuno lo vede, scappa e mente nelle riunioni. Il facile è distratto e imprudente, il medio è attento, il difficile osserva tutto e a volte segnala lui stesso il corpo per sembrare innocente.',
      'Chi esce dalla partita viene sostituito dal computer; se resta fuori più di un minuto i suoi compiti non contano più, così la partita non si blocca.',
    ],
  },
  crea: (o) => new Alieno(o),
  bot: () => ({}),
  _test: { Alieno, MAPPE, ELENCO, maxAlieni, T, VISTA, FINE },
};
