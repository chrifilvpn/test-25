// DRAGHI E SEGRETE: il SALVATAGGIO della campagna. La campagna vive finché il tavolo è aperto (e su Render gratuito il
// server si addormenta o si riavvia): chiunque al tavolo può scaricare un file con la campagna (💾) e chi apre un tavolo
// nuovo lo riprende durante la creazione dei personaggi (📂). Nel file: i personaggi, il mondo, i PNG, le missioni, il
// diario, la storia recente per il master, l'ultimo pezzo del racconto e, nell'horror a turni, lo stato della stazione.
// Il browser non può mandare più di 100 kB (server.js): il racconto salvato si accorcia finché il file ci sta.
// Non si salvano il combattimento in corso (si riprende dal racconto) né il tempo reale.
const R = require('./regole');
const B = require('./base');
const H = require('./horror');
const { CLASSI } = require('./classi');

const FORMATO = 'draghi-e-segrete';
const VERSIONE = 1;
const MAX_BYTE = 90000; // sotto i 100 kB che il server accetta dal browser
const MOSTRA_MS = 15000; // per quanto il file resta nella vista di chi l'ha chiesto

const copia = (x) => JSON.parse(JSON.stringify(x));
const testo = (x, n) => String(x == null ? '' : x).slice(0, n);

const metodi = {
  // 💾: il file della campagna (un oggetto semplice), con il racconto accorciato finché ci sta
  esporta() {
    const dati = {
      formato: FORMATO, versione: VERSIONE, salvata: new Date().toISOString(),
      opzioni: { ambientazione: this.ambientazione, pazza: this.pazza, difficolta: this.difficolta, lunghezza: this.lunghezza, livelloIniziale: this.livelloIniziale },
      pg: this.pg.filter(Boolean).map((p) => copia(p)),
      idea: this.idea, diario: this.diario, png: copia(this.png), missioni: copia(this.missioni), scelte: copia(this.scelte || []),
      storia: this.storia.slice(-12).map((s) => ({ ruolo: s.ruolo, testo: testo(s.testo, 2500) })),
      seme: this.seme, mondo: copia(this.mondo), posizione: this.posizione,
      incubo: this.cp && this.incubo ? copia(this.incubo) : null, cacciatoreArriva: !!this.cacciatoreArriva,
      racconto: [],
    };
    const voci = this.racconto.filter((v) => ['master', 'azione', 'sistema', 'tiro'].includes(v.tipo)).slice(-80)
      .map((v) => ({ tipo: v.tipo, testo: testo(v.testo, 2000), ...(v.posto != null ? { posto: v.posto } : {}), ...(v.chi ? { chi: v.chi } : {}) }));
    let n = voci.length;
    dati.racconto = voci;
    while (n > 0 && Buffer.byteLength(JSON.stringify(dati)) > MAX_BYTE) { n = Math.floor(n * 0.75); dati.racconto = voci.slice(-n); }
    return dati;
  },
  azioneSalva(p) {
    if (this.fase === 'creazione') return { errore: 'La campagna non è ancora cominciata' };
    if (this.fase === 'reale' || this.modalita === 'reale') return { errore: 'In tempo reale la campagna non si può salvare' };
    const dati = this.esporta();
    this.salvataggio = { id: (this.salvataggio ? this.salvataggio.id : 0) + 1, posto: p, ora: Date.now(), nome: nomeFile(this, dati), dati };
    return { ok: true };
  },
  vistaSalvataggio(p) {
    const s = this.salvataggio;
    return s && s.posto === p && Date.now() - s.ora < MOSTRA_MS ? { id: s.id, ora: s.ora, nome: s.nome, dati: s.dati } : null;
  },

  // 📂: chi ha aperto il tavolo riprende una campagna durante la creazione dei personaggi. I personaggi salvati
  // prendono i posti in ordine (il master umano, se c'è, resta senza personaggio); i posti in più creano un personaggio.
  azioneRiprendi(p, d) {
    if (!this.comanda(p)) return { errore: 'La campagna la riprende chi ha aperto il tavolo' };
    if (this.fase !== 'creazione') return { errore: 'Una campagna salvata si riprende prima di cominciare' };
    if (this.modalita === 'reale') return { errore: 'In tempo reale non si riprendono campagne: scegli «A turni»' };
    if (!d || typeof d !== 'object' || d.formato !== FORMATO) return { errore: 'Questo non è un file di Draghi e Segrete' };
    if (Number(d.versione) > VERSIONE) return { errore: 'Il file viene da una versione più nuova del gioco' };
    const o = d.opzioni || {};
    const amb = String(o.ambientazione || 'classica');
    if (!['classica', 'oscura', 'pirati', 'citta', 'selvaggia'].includes(amb) && !H.CAMPAGNE[amb]) return { errore: 'Ambientazione sconosciuta nel file' };
    const pgs = (Array.isArray(d.pg) ? d.pg : []).filter((x) => x && typeof x === 'object');
    if (!pgs.length) return { errore: 'Nel file non ci sono personaggi' };
    for (const x of pgs) {
      if (!CLASSI[x.classe] || !B.STIRPI[x.stirpe] || !(x.livello >= 1 && x.livello <= 20) || !x.nome) return { errore: 'Un personaggio del file è rovinato' };
      if (!!H.CAMPAGNE[amb] !== !!CLASSI[x.classe].tema) return { errore: 'I personaggi non sono di questa ambientazione' };
    }
    const posti = Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.dm);
    if (pgs.length > posti.length) return { errore: `Nel file ci sono ${pgs.length} personaggi: apri un tavolo con almeno ${pgs.length + (this.dm != null ? 1 : 0)} posti` };

    // le opzioni della campagna salvata valgono più di quelle del tavolo
    this.ambientazione = amb;
    this.cp = H.CAMPAGNE[amb] || null;
    this.pazza = !!o.pazza;
    if (['storia', 'normale', 'mortale'].includes(o.difficolta)) this.difficolta = o.difficolta;
    if (['normali', 'brevi', 'lunghe'].includes(o.lunghezza)) this.lunghezza = o.lunghezza;
    if ([1, 3, 5].includes(Number(o.livelloIniziale))) this.livelloIniziale = Number(o.livelloIniziale);
    this.pg = new Array(this.n).fill(null);
    pgs.forEach((x, k) => {
      const q = posti[k]; const pg = copia(x); pg.uid = `pg${q}`; pg.posto = q;
      // salvata a metà di un combattimento: come alla fine di uno scontro (draghi.js, fineCombattimento)
      pg.effetti = (Array.isArray(pg.effetti) ? pg.effetti : []).filter((e) => e && (e.durataTurni == null || e.durataTurni > 100));
      pg.condizioni = (Array.isArray(pg.condizioni) ? pg.condizioni : []).filter((c) => typeof c === 'string' && !['prono', 'afferrato', 'trattenuto', 'spaventato', 'stordito', 'incapacitato', 'paralizzato', 'illuminato', 'rallentato'].includes(c));
      pg.concentrazione = null;
      if (pg.pf <= 0 && !pg.morto) pg.stabile = true;
      R.ricalcola(pg); this.pg[q] = pg;
    });
    // i posti senza personaggio salvato: ne crea uno il computer (o la persona, prima di ripartire, rifacendolo)
    this.inRipresa = true;
    try { for (const q of posti) if (!this.pg[q]) this.azioneCreazione(q, { tipo: 'crea', casuale: true, scelte: {} }); } finally { this.inRipresa = false; }

    this.idea = testo(d.idea, 2000);
    this.diario = testo(d.diario, 2500);
    this.png = (Array.isArray(d.png) ? d.png : []).slice(-60).filter((x) => x && x.nome).map((x) => ({ nome: testo(x.nome, 40), descrizione: testo(x.descrizione, 400), atteggiamento: ['amico', 'neutrale', 'ostile'].includes(x.atteggiamento) ? x.atteggiamento : 'neutrale' }));
    this.missioni = (Array.isArray(d.missioni) ? d.missioni : []).slice(-40).filter((x) => x && x.titolo).map((x) => ({ titolo: testo(x.titolo, 80), descrizione: testo(x.descrizione, 400), stato: ['nuova', 'aggiornata', 'completata', 'fallita'].includes(x.stato) ? x.stato : 'aggiornata' }));
    this.scelte = (Array.isArray(d.scelte) ? d.scelte : []).slice(0, 5).map((x) => testo(x, 120));
    this.storia = (Array.isArray(d.storia) ? d.storia : []).slice(-12).filter((x) => x && x.testo).map((x) => ({ ruolo: x.ruolo === 'master' ? 'master' : 'giocatori', testo: testo(x.testo, 3000) }));
    if (d.mondo && Array.isArray(d.mondo.luoghi) && Array.isArray(d.mondo.percorso) && typeof d.mondo.celle === 'string' && d.mondo.celle.length === d.mondo.w * d.mondo.h) {
      this.mondo = copia(d.mondo);
      if (Number.isFinite(Number(d.seme))) this.seme = Number(d.seme);
      this.posizione = this.mondo.luoghi.some((l) => l.id === d.posizione) ? d.posizione : (this.mondo.luoghi[0] || {}).id || null;
    }
    if (this.cp) {
      this.preparaIncubo();
      if (d.incubo && typeof d.incubo === 'object') {
        const inc = copia(d.incubo), st = Array.isArray(inc.stato) ? inc.stato : [];
        Object.assign(this.incubo, inc);
        // lo stato di ognuno (paura, batteria…) segue il personaggio nel suo nuovo posto
        this.incubo.stato = Array.from({ length: this.n }, (_, q) => {
          const k = posti.indexOf(q);
          const vecchio = k >= 0 && k < pgs.length && pgs[k].posto != null ? st[pgs[k].posto] : null;
          return vecchio && typeof vecchio === 'object' ? { paura: 0, batteria: 100, torcia: true, nascosto: false, ...vecchio } : { paura: 0, batteria: 100, torcia: true, nascosto: false };
        });
        if (!this.areaDi(this.incubo.area)) this.incubo.area = this.cp.aree[0].id;
      }
      this.cacciatoreArriva = !!d.cacciatoreArriva;
    }
    // il racconto: l'ultimo pezzo salvato, poi si riparte dall'avventura (un combattimento a metà non si salva)
    this.racconto = []; this.nR = 0;
    for (const v of (Array.isArray(d.racconto) ? d.racconto : []).slice(-80)) {
      if (!v || !['master', 'azione', 'sistema', 'tiro'].includes(v.tipo)) continue;
      const posto = v.posto != null ? pgs.findIndex((x) => x.posto === v.posto) : -1;
      this.scrivi(v.tipo, testo(v.testo, 2000), { ...(posto >= 0 ? { posto: posti[posto] } : {}), ...(v.chi ? { chi: testo(v.chi, 40) } : {}), ripreso: true });
    }
    const quando = Date.parse(d.salvata);
    this.scrivi('sistema', `📂 Campagna ripresa${Number.isFinite(quando) ? ` (salvata il ${new Date(quando).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })})` : ''}: ${this.pg.filter(Boolean).map((x) => `${x.nome} (${CLASSI[x.classe].nome.toLowerCase()} ${x.livello}°)`).join(', ')}.`);
    this.fase = 'avventura';
    this.atmosfera = 'calma';
    this.dichiarazioni = {}; this.primaDichiarazione = null;
    this.annuncia(p, 'riprende una campagna salvata 📂', 'campagna ripresa 📂', true);
    if (!this.umaniVivi().length) { this.tuttiMorti(); return { ok: true }; }
    // il master (IA o persona) rilancia la scena; senza IA basta il racconto salvato
    if ((this.chiave && this.fetch) || this.dmUmano) this.chiediMaster('ripresa', 'La campagna riprende dopo una pausa (i giocatori l\'avevano salvata). In poche righe ricorda dove si trova il gruppo e cosa stava succedendo (usa il DIARIO e la STORIA RECENTE), poi rilancia la scena lasciandola aperta.');
    return { ok: true };
  },
};

function nomeFile(g, d) {
  const giorno = d.salvata.slice(0, 10);
  const chi = (d.pg[0] && d.pg[0].nome ? d.pg[0].nome : 'campagna').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'campagna';
  return `draghi-${g.cp ? g.cp.id : 'fantasy'}-${chi}-${giorno}.json`;
}

module.exports = { metodi, FORMATO, VERSIONE, MAX_BYTE };
