// SCACCHI: regole complete (arrocco, en passant, promozione, scacco matto, stallo, 50 mosse,
// ripetizione, materiale insufficiente), orologio opzionale, proposta di patta e abbandono.
// Scacchiera: Int8Array(64), casella = riga*8 + colonna, riga 0 = ottava traversa (in alto).
// Pezzi: 1 pedone, 2 cavallo, 3 alfiere, 4 torre, 5 donna, 6 re; positivi Bianco, negativi Nero.
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const VALORE = [0, 100, 320, 330, 500, 900, 0];
const LETTERE = 'abcdefgh';
const NOMI_PEZZI = { 1: 'Pedone', 2: 'Cavallo', 3: 'Alfiere', 4: 'Torre', 5: 'Donna', 6: 'Re' };
const nomeCasa = (i) => `${LETTERE[i % 8]}${8 - Math.floor(i / 8)}`;
const rc = (i) => [Math.floor(i / 8), i % 8];
const dentro = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const MOSSE_N = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const MOSSE_K = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const DRITTE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// diritti di arrocco: 1 = bianco corto, 2 = bianco lungo, 4 = nero corto, 8 = nero lungo
const TOGLI_ARROCCO = new Array(64).fill(15);
TOGLI_ARROCCO[60] = 15 & ~3; TOGLI_ARROCCO[63] = 15 & ~1; TOGLI_ARROCCO[56] = 15 & ~2;
TOGLI_ARROCCO[4] = 15 & ~12; TOGLI_ARROCCO[7] = 15 & ~4; TOGLI_ARROCCO[0] = 15 & ~8;

function posizioneIniziale() {
  const b = new Int8Array(64);
  const retro = [R, N, B, Q, K, B, N, R];
  for (let c = 0; c < 8; c++) { b[c] = -retro[c]; b[8 + c] = -P; b[48 + c] = P; b[56 + c] = retro[c]; }
  return { b, lato: 1, arrocco: 15, ep: -1, mezze: 0 };
}

// la casa i è attaccata dal colore "da" (1 bianco, -1 nero)?
function attaccata(b, i, da) {
  const [r, c] = rc(i);
  // pedoni: un pedone bianco attacca verso l'alto, quindi sta una riga sotto
  const rp = r + (da === 1 ? 1 : -1);
  for (const dc of [-1, 1]) if (dentro(rp, c + dc) && b[rp * 8 + c + dc] === da * P) return true;
  for (const [dr, dc] of MOSSE_N) if (dentro(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === da * N) return true;
  for (const [dr, dc] of MOSSE_K) if (dentro(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === da * K) return true;
  for (const [dirs, t] of [[DIAG, B], [DRITTE, R]]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (dentro(rr, cc)) {
        const x = b[rr * 8 + cc];
        if (x) { if (x === da * t || x === da * Q) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}
const casaRe = (b, lato) => b.indexOf(lato * K);
const inScacco = (s, lato) => attaccata(s.b, casaRe(s.b, lato), -lato);

// mosse pseudo-legali: { da, a, promo, speciale: 'ep' | 'O-O' | 'O-O-O' | 'doppio' }
function pseudo(s, soloCatture = false) {
  const { b, lato } = s;
  const out = [];
  const add = (da, a, extra) => out.push({ da, a, ...extra });
  for (let i = 0; i < 64; i++) {
    const x = b[i];
    if (!x || Math.sign(x) !== lato) continue;
    const t = Math.abs(x);
    const [r, c] = rc(i);
    if (t === P) {
      const dir = lato === 1 ? -1 : 1;
      const partenza = lato === 1 ? 6 : 1;
      const ultima = lato === 1 ? 0 : 7;
      const avanti = (r + dir) * 8 + c;
      const pedone = (a, extra = {}) => {
        if (Math.floor(a / 8) === ultima) for (const promo of [Q, R, B, N]) add(i, a, { ...extra, promo });
        else add(i, a, extra);
      };
      if (!soloCatture && dentro(r + dir, c) && !b[avanti]) {
        pedone(avanti);
        const due = (r + 2 * dir) * 8 + c;
        if (r === partenza && !b[due]) add(i, due, { speciale: 'doppio' });
      }
      if (soloCatture && dentro(r + dir, c) && !b[avanti] && r + dir === ultima) pedone(avanti); // promozioni
      for (const dc of [-1, 1]) {
        if (!dentro(r + dir, c + dc)) continue;
        const a = (r + dir) * 8 + c + dc;
        if (b[a] && Math.sign(b[a]) === -lato) pedone(a);
        else if (a === s.ep) add(i, a, { speciale: 'ep' });
      }
    } else if (t === N || t === K) {
      for (const [dr, dc] of t === N ? MOSSE_N : MOSSE_K) {
        if (!dentro(r + dr, c + dc)) continue;
        const a = (r + dr) * 8 + c + dc;
        if (!b[a] ? !soloCatture : Math.sign(b[a]) === -lato) add(i, a);
      }
      if (t === K && !soloCatture) {
        const casa = lato === 1 ? 60 : 4;
        if (i === casa && !attaccata(b, casa, -lato)) {
          const [corto, lungo] = lato === 1 ? [1, 2] : [4, 8];
          if (s.arrocco & corto && !b[casa + 1] && !b[casa + 2] && b[casa + 3] === lato * R
            && !attaccata(b, casa + 1, -lato) && !attaccata(b, casa + 2, -lato)) add(i, casa + 2, { speciale: 'O-O' });
          if (s.arrocco & lungo && !b[casa - 1] && !b[casa - 2] && !b[casa - 3] && b[casa - 4] === lato * R
            && !attaccata(b, casa - 1, -lato) && !attaccata(b, casa - 2, -lato)) add(i, casa - 2, { speciale: 'O-O-O' });
        }
      }
    } else {
      const dirs = t === B ? DIAG : t === R ? DRITTE : [...DIAG, ...DRITTE];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (dentro(rr, cc)) {
          const a = rr * 8 + cc;
          if (b[a]) { if (Math.sign(b[a]) === -lato) add(i, a); break; }
          if (!soloCatture) add(i, a);
          rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}

function applica(s, m) {
  const b = s.b.slice();
  const x = b[m.da];
  const preso = m.speciale === 'ep' ? b[m.a + (s.lato === 1 ? 8 : -8)] : b[m.a];
  b[m.a] = m.promo ? s.lato * m.promo : x;
  b[m.da] = 0;
  if (m.speciale === 'ep') b[m.a + (s.lato === 1 ? 8 : -8)] = 0;
  if (m.speciale === 'O-O') { b[m.a - 1] = b[m.a + 1]; b[m.a + 1] = 0; }
  if (m.speciale === 'O-O-O') { b[m.a + 1] = b[m.a - 2]; b[m.a - 2] = 0; }
  return {
    b,
    lato: -s.lato,
    arrocco: s.arrocco & TOGLI_ARROCCO[m.da] & TOGLI_ARROCCO[m.a],
    ep: m.speciale === 'doppio' ? (m.da + m.a) / 2 : -1,
    mezze: Math.abs(x) === P || preso ? 0 : s.mezze + 1,
    preso,
  };
}

function legali(s) {
  return pseudo(s).filter((m) => !inScacco(applica(s, m), s.lato));
}

function materialeInsufficiente(b) {
  const pezzi = [];
  for (let i = 0; i < 64; i++) if (b[i] && Math.abs(b[i]) !== K) pezzi.push([Math.abs(b[i]), i]);
  if (!pezzi.length) return true;
  if (pezzi.length === 1 && (pezzi[0][0] === B || pezzi[0][0] === N)) return true;
  // solo alfieri tutti su case dello stesso colore
  if (pezzi.every(([t]) => t === B)) { const col = pezzi.map(([, i]) => (Math.floor(i / 8) + (i % 8)) % 2); return col.every((x) => x === col[0]); }
  return false;
}
// il colore "lato" ha abbastanza materiale per dare matto? (serve quando all'avversario cade la bandierina)
function puoDareMatto(b, lato) {
  const miei = [];
  for (let i = 0; i < 64; i++) if (b[i] && Math.sign(b[i]) === lato && Math.abs(b[i]) !== K) miei.push(Math.abs(b[i]));
  if (!miei.length) return false;
  return !(miei.length === 1 && (miei[0] === B || miei[0] === N));
}
const chiave = (s) => `${s.b.join(',')}|${s.lato}|${s.arrocco}|${s.ep}`;

const TEMPI = { nessuno: null, '3+2': [180, 2], '5+0': [300, 0], '10+0': [600, 0], '15+10': [900, 10] };

class Scacchi {
  constructor({ n, primo = 0, opzioni = {}, bot = [] }) {
    this.id = 'scacchi';
    this.n = n;
    this.bot = [bot[0] || null, bot[1] || null];
    this.indietro = []; // per "Annulla mossa" contro il computer: la partita prima di ogni mia mossa
    this.s = posizioneIniziale();
    this.colore = [];
    this.colore[primo] = 1; // chi inizia ha il Bianco
    this.colore[1 - primo] = -1;
    this.turno = primo;
    this.legaliOra = legali(this.s);
    this.storia = new Map([[chiave(this.s), 1]]);
    this.catturati = { 1: [], '-1': [] }; // pezzi persi da ciascun colore
    this.nMosse = 0;
    const t = TEMPI[opzioni.tempo] || null;
    this.orologio = t ? { resto: { 1: t[0] * 1000, '-1': t[0] * 1000 }, inc: t[1] * 1000, dal: null } : null;
    this.patta = null; // posto di chi ha proposto la patta
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultima = null;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  // ---- orologio ----
  restoOra(lato) {
    const o = this.orologio;
    if (!o) return null;
    const corre = !this.finita && o.dal !== null && this.s.lato === lato;
    return Math.max(0, o.resto[lato] - (corre ? Date.now() - o.dal : 0));
  }
  // il server chiama controllaTempo() a questo istante
  scadenza() {
    const o = this.orologio;
    if (!o || this.finita || o.dal === null) return null;
    return o.dal + o.resto[this.s.lato];
  }
  controllaTempo() {
    if (this.finita || !this.orologio || this.restoOra(this.s.lato) > 0) return false;
    const perde = this.posto(this.s.lato);
    if (!puoDareMatto(this.s.b, -this.s.lato)) {
      this.annuncia(null, 'Tempo scaduto, ma l\'avversario non ha materiale per dare matto: patta', '', true);
      this.chiudi(null, 'tempo-patta');
    } else {
      this.annuncia(perde, 'ha finito il tempo', 'hai finito il tempo', true);
      this.chiudi(1 - perde, 'tempo');
    }
    return true;
  }
  posto(lato) { return this.colore[0] === lato ? 0 : 1; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a || (p !== 0 && p !== 1)) return { errore: 'Mossa non valida' };
    if (this.controllaTempo()) return { ok: true };
    if (a.tipo === 'abbandona') { this.annuncia(p, 'abbandona', 'hai abbandonato', true); return this.chiudi(1 - p, 'abbandono'); }
    if (a.tipo === 'patta') {
      if (this.patta === 1 - p) { this.annuncia(p, 'accetta la patta', 'hai accettato la patta', true); return this.chiudi(null, 'accordo'); }
      if (this.patta === p) return { errore: 'Hai già proposto la patta' };
      this.patta = p;
      this.annuncia(p, 'propone la patta', 'hai proposto la patta');
      return { ok: true };
    }
    if (a.tipo === 'rifiutaPatta') {
      if (this.patta !== 1 - p) return { errore: 'Nessuna proposta di patta' };
      this.patta = null;
      this.annuncia(p, 'rifiuta la patta', 'hai rifiutato la patta');
      return { ok: true };
    }
    if (a.tipo === 'annulla') return this.annulla(p);
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (a.tipo !== 'muovi') return { errore: 'Mossa non valida' };
    const da = Number(a.da), aa = Number(a.a), promo = a.promo ? Number(a.promo) : undefined;
    const m = this.legaliOra.find((x) => x.da === da && x.a === aa && (x.promo || undefined) === (promo || (x.promo ? Q : undefined)));
    if (!m) return { errore: 'Mossa non valida' };
    if (this.puoAnnullare(p, true)) this.indietro.push({ p, ...this.fotografia() });

    const lato = this.s.lato;
    const nuovo = applica(this.s, m);
    if (nuovo.preso) this.catturati[-lato].push(Math.abs(nuovo.preso));
    this.s = nuovo;
    this.nMosse++;
    this.ultima = { da: m.da, a: m.a, speciale: m.speciale || null, promo: m.promo || null };
    if (this.patta === 1 - p) this.patta = null; // muovere vale come rifiuto
    // orologio: si aggiunge l'incremento; il tempo parte dopo la prima mossa del Bianco
    const o = this.orologio;
    if (o) {
      if (o.dal !== null) o.resto[lato] = Math.max(0, o.resto[lato] - (Date.now() - o.dal)) + o.inc;
      o.dal = Date.now();
    }
    const k = chiave(this.s);
    this.storia.set(k, (this.storia.get(k) || 0) + 1);
    this.legaliOra = legali(this.s);
    const scacco = inScacco(this.s, this.s.lato);
    if (!this.legaliOra.length) {
      if (scacco) { this.annuncia(p, 'dà scacco matto!', 'scacco matto!', true); return this.chiudi(p, 'matto'); }
      this.annuncia(null, 'Stallo: patta', '', true);
      return this.chiudi(null, 'stallo');
    }
    if (this.storia.get(k) >= 3) { this.annuncia(null, 'Posizione ripetuta tre volte: patta', '', true); return this.chiudi(null, 'ripetizione'); }
    if (this.s.mezze >= 100) { this.annuncia(null, '50 mosse senza catture né mosse di pedone: patta', '', true); return this.chiudi(null, '50mosse'); }
    if (materialeInsufficiente(this.s.b)) { this.annuncia(null, 'Materiale insufficiente per dare matto: patta', '', true); return this.chiudi(null, 'materiale'); }
    if (scacco) this.annuncia(p, 'dà scacco!', 'scacco!');
    else if (m.speciale === 'O-O' || m.speciale === 'O-O-O') this.annuncia(p, m.speciale === 'O-O' ? 'arrocca corto' : 'arrocca lungo', m.speciale === 'O-O' ? 'arrocchi corto' : 'arrocchi lungo');
    else if (m.speciale === 'ep') this.annuncia(p, 'cattura en passant', 'catturi en passant');
    else if (m.promo) this.annuncia(p, 'promuove un pedone', 'promuovi il pedone');
    this.turno = 1 - p;
    return { ok: true };
  }

  // ANNULLA MOSSA: solo contro il computer e senza orologio (con una persona o col tempo non sarebbe giusto).
  // Torna a prima della mia ultima mossa: si annulla anche la risposta del computer.
  puoAnnullare(p, perSalvare = false) {
    if (this.finita || this.orologio || !this.bot[1 - p] || this.bot[p]) return false;
    return perSalvare || this.indietro.some((x) => x.p === p);
  }
  fotografia() {
    return { s: { ...this.s, b: Array.from(this.s.b) }, storia: new Map(this.storia), catturati: { 1: [...this.catturati[1]], '-1': [...this.catturati[-1]] }, nMosse: this.nMosse, ultima: this.ultima, turno: this.turno, legaliOra: this.legaliOra, patta: this.patta };
  }
  annulla(p) {
    if (!this.puoAnnullare(p)) return { errore: 'Puoi annullare solo contro il computer, senza orologio, dopo una tua mossa' };
    let f; do { f = this.indietro.pop(); } while (f && f.p !== p);
    Object.assign(this, { s: f.s, storia: f.storia, catturati: f.catturati, nMosse: f.nMosse, ultima: f.ultima, turno: f.turno, legaliOra: f.legaliOra, patta: f.patta });
    this.annullate = (this.annullate || 0) + 1;
    this.annuncia(p, 'annulla la mossa', 'mossa annullata ↶');
    return { ok: true };
  }

  chiudi(vince, motivo) {
    const o = this.orologio;
    if (o && o.dal !== null) { o.resto[this.s.lato] = this.restoOra(this.s.lato); o.dal = null; }
    this.finita = true;
    this.turno = null;
    this.motivo = motivo;
    const materiale = (lato) => this.s.b.reduce((t, x) => t + (x && Math.sign(x) === lato ? VALORE[Math.abs(x)] / 100 : 0), 0);
    this.risultato = {
      fazioni: [0, 1].map((p) => ({ posti: [p], punti: Math.round(materiale(this.colore[p])) })),
      etichetta: 'punti di materiale',
      pareggio: vince === null,
      vincitori: vince === null ? [] : [vince],
    };
    return { ok: true };
  }

  // trucco segreto (!win): la mossa del computer difficile, in notazione con le coordinate della scacchiera
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p || this.patta === 1 - p) return null;
    const a = bot(this, p, 'difficile');
    if (a.tipo !== 'muovi') return null;
    const m = this.legaliOra.find((x) => x.da === a.da && x.a === a.a && (x.promo || undefined) === a.promo) || a;
    if (m.speciale === 'O-O' || m.speciale === 'O-O-O') return `💡 Arrocco ${m.speciale === 'O-O' ? 'corto' : 'lungo'} (Re ${nomeCasa(m.da)} → ${nomeCasa(m.a)})`;
    const presa = this.s.b[m.a] || m.speciale === 'ep';
    const promo = m.promo ? `, promuovi a ${NOMI_PEZZI[m.promo]}` : '';
    return `💡 ${NOMI_PEZZI[Math.abs(this.s.b[m.da])]} ${nomeCasa(m.da)} ${presa ? '×' : '→'} ${nomeCasa(m.a)}${promo}`;
  }

  vista(p) {
    const o = this.orologio;
    return {
      gioco: this.id, n: this.n, b: Array.from(this.s.b), colore: this.colore, lato: this.s.lato,
      turno: this.turno, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      ultima: this.ultima, motivo: this.motivo || null, patta: this.patta,
      scacco: inScacco(this.s, this.s.lato) ? casaRe(this.s.b, this.s.lato) : -1,
      catturati: this.catturati, nMosse: this.nMosse, puoAnnullare: this.puoAnnullare(p), annullate: this.annullate || 0,
      mosse: this.turno === p ? this.legaliOra.map(({ da, a, promo }) => ({ da, a, promo: promo || 0 })) : [],
      orologio: o ? { bianco: this.restoOra(1), nero: this.restoOra(-1), corre: o.dal !== null && !this.finita ? this.s.lato : 0 } : null,
    };
  }
}

// =================== COMPUTER ===================
// tabelle di posizione dal punto di vista del Bianco (riga 0 = ottava traversa)
const PST = {
  [P]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [N]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [B]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [R]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [Q]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  [K]: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
const PST_K_FINALE = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

function valuta(s) {
  let m = 0, pesanti = 0;
  for (let i = 0; i < 64; i++) { const t = Math.abs(s.b[i]); if (t === Q || t === R) pesanti += VALORE[t]; else if (t === N || t === B) pesanti += VALORE[t] / 2; }
  const finale = pesanti < 1300;
  for (let i = 0; i < 64; i++) {
    const x = s.b[i];
    if (!x) continue;
    const t = Math.abs(x);
    const j = x > 0 ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8); // specchio per il Nero
    const v = VALORE[t] + (t === K && finale ? PST_K_FINALE[j] : PST[t][j]);
    m += x > 0 ? v : -v;
  }
  // finale vinto: spingi il re avversario verso il bordo e avvicina il tuo (per dare matto invece di pattare)
  if (finale && Math.abs(m) > 250) {
    const forte = m > 0 ? 1 : -1;
    const [rd, cd] = rc(casaRe(s.b, -forte));
    const [ra, ca] = rc(casaRe(s.b, forte));
    const bordo = Math.max(3 - rd, rd - 4) + Math.max(3 - cd, cd - 4);
    const vicini = 14 - (Math.abs(rd - ra) + Math.abs(cd - ca));
    m += forte * (bordo * 10 + vicini * 4);
  }
  return m * s.lato;
}
const MATTO = 100000;
const ordina = (s, mosse) => mosse.map((m) => ({ m, k: (s.b[m.a] ? 10 * VALORE[Math.abs(s.b[m.a])] - VALORE[Math.abs(s.b[m.da])] / 10 : 0) + (m.promo ? 800 : 0) }))
  .sort((a, b) => b.k - a.k).map((x) => x.m);

function quiete(s, alfa, beta, ctx, prof = 0) {
  const fermo = valuta(s);
  if (fermo >= beta) return fermo;
  if (fermo > alfa) alfa = fermo;
  if (prof > 6) return fermo;
  for (const m of ordina(s, pseudo(s, true))) {
    const n = applica(s, m);
    if (inScacco(n, s.lato)) continue;
    const v = -quiete(n, -beta, -alfa, ctx, prof + 1);
    if (v >= beta) return v;
    if (v > alfa) alfa = v;
  }
  return alfa;
}
function negamax(s, prof, alfa, beta, ctx, dist) {
  if ((++ctx.nodi & 1023) === 0 && Date.now() > ctx.fino) ctx.stop = true;
  if (ctx.stop) return 0;
  if (s.mezze >= 100) return 0;
  if (prof <= 0) return quiete(s, alfa, beta, ctx);
  let best = -Infinity, nessuna = true;
  for (const m of ordina(s, pseudo(s))) {
    const n = applica(s, m);
    if (inScacco(n, s.lato)) continue;
    nessuna = false;
    const v = -negamax(n, prof - 1, -beta, -alfa, ctx, dist + 1);
    if (ctx.stop) return 0;
    if (v > best) best = v;
    if (best > alfa) alfa = best;
    if (alfa >= beta) break;
  }
  if (nessuna) return inScacco(s, s.lato) ? -(MATTO - dist) : 0;
  return best;
}
// pieno: ogni mossa con la finestra piena, così anche le mosse dopo la prima hanno il loro valore vero (serve quando
// si sceglie un'alternativa alla migliore); altrimenti le peggiori hanno solo un limite e possono sembrare buone
function classifica(g, profMax, ms, pieno = false) {
  if (process.env.TEST_VELOCE) ms = Math.min(ms, 25);
  const s = g.s;
  const ctx = { nodi: 0, fino: Date.now() + ms, stop: false };
  let lista = ordina(s, g.legaliOra).map((m) => ({ m, v: 0 }));
  for (let prof = 1; prof <= profMax; prof++) {
    const giro = [];
    let alfa = -Infinity;
    for (const { m } of lista) {
      const n = applica(s, m);
      // evita le ripetizioni se sta vincendo
      const rip = (g.storia.get(chiave(n)) || 0) >= 2;
      const v = rip ? 0 : -negamax(n, prof - 1, -Infinity, pieno ? Infinity : -alfa + 1, ctx, 1);
      if (ctx.stop) break;
      giro.push({ m, v: v + Math.random() * 3 });
      if (v > alfa) alfa = v;
    }
    if (ctx.stop) break;
    lista = giro.sort((a, b) => b.v - a.v);
    classifica.prof = prof;
    if (lista[0].v > MATTO / 2) break;
  }
  return lista;
}

function bot(g, p, livello) {
  const muovi = (m) => ({ tipo: 'muovi', da: m.da, a: m.a, promo: m.promo || undefined });
  // prima risponde a un'eventuale proposta di patta
  if (g.patta === 1 - p) {
    const v = valuta(g.s) * (g.s.lato === g.colore[p] ? 1 : -1);
    return v < -150 ? { tipo: 'patta' } : { tipo: 'rifiutaPatta' };
  }
  if (livello === 'facile') {
    if (Math.random() < 0.35) return muovi(g.legaliOra[Math.floor(Math.random() * g.legaliOra.length)]);
    const l = classifica(g, 1, 150, true);
    return muovi(l[Math.floor(Math.random() * Math.min(3, l.length))].m);
  }
  if (livello === 'medio') {
    const l = classifica(g, 3, 350, true);
    if (l.length > 1 && Math.random() < 0.2 && l[1].v > l[0].v - 80) return muovi(l[1].m);
    return muovi(l[0].m);
  }
  // col tempo contato pensa meno quando ne ha poco
  let ms = 700;
  const resto = g.restoOra(g.colore[p]);
  if (resto !== null) ms = Math.min(ms, Math.max(150, resto / 40));
  return muovi(classifica(g, 20, ms)[0].m);
}

module.exports = {
  meta: {
    id: 'scacchi',
    nome: 'Scacchi',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Regole complete: arrocco, en passant, promozione, patte. Con orologio a scelta.',
    opzioni: [
      { id: 'tempo', nome: 'Orologio', valori: ['nessuno', '3+2', '5+0', '10+0', '15+10'], etichette: ['Senza orologio', 'Blitz 3 min + 2 s', 'Blitz 5 min', 'Rapid 10 min', 'Rapid 15 min + 10 s'], predefinito: 'nessuno' },
    ],
    regole: [
      'Si gioca in due. Chi inizia ha il Bianco e muove per primo; alla rivincita si scambiano i colori. La tua parte è sempre in basso.',
      'Re: una casa in ogni direzione. Donna: quante case vuole in orizzontale, verticale e diagonale. Torre: in orizzontale e verticale. Alfiere: in diagonale. Cavallo: a L (due case in una direzione e una di lato) e può scavalcare i pezzi.',
      'Pedone: avanza di una casa, o di due dalla posizione di partenza; cattura in diagonale in avanti.',
      'En passant: se un pedone avversario avanza di due case e si ferma accanto al tuo pedone, alla mossa successiva puoi catturarlo come se fosse avanzato di una sola casa.',
      'Promozione: il pedone che arriva in fondo diventa donna, torre, alfiere o cavallo, a tua scelta.',
      'Arrocco: re e torre non ancora mossi, case vuote tra loro. Il re si sposta di due case verso la torre e la torre lo scavalca. Non si può arroccare sotto scacco, né passando o arrivando su una casa attaccata. Sul sito: muovi il re di due case.',
      'Scacco: il re è attaccato e bisogna pararlo. Scacco matto: non c\'è modo di pararlo e la partita è vinta. Non si può fare una mossa che lascia il proprio re sotto scacco.',
      'Patta: stallo (chi deve muovere non ha mosse legali ma non è sotto scacco), stessa posizione ripetuta tre volte, 50 mosse a testa senza catture né mosse di pedone, materiale insufficiente per dare matto, oppure accordo tra i giocatori.',
      'Orologio (se scelto): ogni giocatore ha il suo tempo, che scorre durante il suo turno e parte dopo la prima mossa del Bianco. Con "+ secondi" si guadagna quel tempo a ogni mossa. Chi finisce il tempo perde, ma se l\'avversario non ha materiale per dare matto è patta.',
      'Puoi proporre la patta (l\'avversario accetta o rifiuta; se muove senza rispondere vale come rifiuto) o abbandonare.',
      'Contro il computer e senza orologio c\'è anche "↶ Annulla mossa": torna a prima della tua ultima mossa (si annulla anche la risposta del computer). Utile per imparare.',
      'Come si gioca sul sito: clicca un tuo pezzo e vedrai i punti dove può andare, poi clicca la casa di arrivo.',
    ],
  },
  crea: (o) => new Scacchi(o),
  bot,
  _test: { posizioneIniziale, legali, applica, inScacco, materialeInsufficiente, classifica, pseudo, nomeCasa },
};
