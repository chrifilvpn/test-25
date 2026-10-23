// TORRE DI HANOI: tre pioli, una pila di dischi sul primo; bisogna spostarla tutta sull'ultimo piolo, un disco alla
// volta, senza mai mettere un disco sopra uno più piccolo. Il minimo di mosse è 2^n − 1. Da soli si gioca per il tempo
// e le mosse; in sfida (2-8) tutti hanno la stessa torre e vince chi finisce prima. Il computer conosce la soluzione
// ottima (anche partendo da una posizione qualsiasi): il facile ogni tanto fa una mossa a caso.
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot, caso } = require('./rompicapo-sfida');

const DISCHI = [5, 3, 4, 6, 7, 8];
const RECORD = {};

// la prossima mossa ottima per portare i dischi 1..k (1 = il più piccolo) sul piolo T, da una posizione qualsiasi
// (pos[d] = piolo del disco d). Restituisce [da, a] o null se sono già lì.
function prossima(pos, k, T) {
  for (; k >= 1; k--) {
    if (pos[k] === T) continue; // il disco k è già dove deve stare: si pensa ai più piccoli
    const altro = 3 - pos[k] - T;
    return prossima(pos, k - 1, altro) || [pos[k], T];
  }
  return null;
}
// mosse che mancano (con la strategia ottima) da una posizione qualsiasi
function mancano(pos, n, T = 2) {
  let m = 0;
  const p = pos.slice();
  for (let g = 0; g < 1 << n; g++) {
    const x = prossima(p, n, T);
    if (!x) return m;
    const d = piccolo(p, n, x[0]);
    p[d] = x[1]; m++;
  }
  return m;
}
// il disco in cima a un piolo (0 = vuoto)
function piccolo(pos, n, piolo) { for (let d = 1; d <= n; d++) if (pos[d] === piolo) return d; return 0; }

class Hanoi extends SfidaRompicapo {
  constructor(o) {
    super('hanoi', o, 30 * 60000);
    const op = o.opzioni || {};
    this.nd = DISCHI.includes(Number(op.dischi)) ? Number(op.dischi) : 5;
    this.minimo = (1 << this.nd) - 1;
    this.tavole = Array.from({ length: this.n }, () => ({ pos: new Array(this.nd + 1).fill(0), indietro: [], mosse: 0, seq: 0, fatto: null }));
    this.avvia();
  }

  progresso(i, t) {
    // dischi già al loro posto sull'ultimo piolo, partendo dal più grande
    let k = 0; for (let d = this.nd; d >= 1 && t.pos[d] === 2; d--) k++;
    return k / this.nd;
  }
  risolta(p, t) { return t.pos.every((x, d) => d === 0 || x === 2); }
  fraseArrivo(p, t) {
    const extra = t.mosse === this.minimo ? 'con il minimo di mosse! 🏅' : `in ${t.mosse} mosse`;
    return { altri: `completa la torre ${extra}`, io: `Torre completata ${extra}` };
  }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  mossa(p, t, a) {
    if (a.tipo === 'annulla') {
      const u = t.indietro.pop();
      if (!u) return { errore: 'Non c\'è niente da annullare' };
      t.pos[u.d] = u.da; t.mosse++; // anche annullare conta come mossa
      return { ok: true };
    }
    if (a.tipo === 'ricomincia') {
      if (t.pos.every((x) => x === 0)) return { errore: 'La torre è già all\'inizio' };
      t.pos.fill(0); t.indietro = []; t.mosse = 0;
      return { ok: true };
    }
    if (a.tipo !== 'sposta') return { errore: 'Mossa non valida' };
    const da = Number(a.da), dove = Number(a.a);
    if (![0, 1, 2].includes(da) || ![0, 1, 2].includes(dove) || da === dove) return { errore: 'Mossa non valida' };
    const d = piccolo(t.pos, this.nd, da);
    if (!d) return { errore: 'Su quel piolo non c\'è nessun disco' };
    const sotto = piccolo(t.pos, this.nd, dove);
    if (sotto && sotto < d) return { errore: 'Non si può mettere un disco sopra uno più piccolo' };
    t.pos[d] = dove; t.mosse++;
    t.indietro.push({ d, da }); if (t.indietro.length > 1000) t.indietro.shift();
    return { ok: true };
  }

  // !win + parola segreta: le prossime mosse giuste (la strategia ottima da dove sei)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const pos = t.pos.slice(), frasi = [];
    for (let k = 0; k < 3; k++) {
      const x = prossima(pos, this.nd, 2);
      if (!x) break;
      pos[piccolo(pos, this.nd, x[0])] = x[1];
      frasi.push(`dal piolo ${x[0] + 1} al ${x[1] + 1}`);
    }
    return frasi.length ? `💡 Sposta il disco ${frasi.join(', poi ')}` : null;
  }

  // ---- computer: la strategia ottima, a un ritmo che dipende dal livello; il facile ogni tanto sbaglia ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const secMossa = 1.6 * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale: this.minimo * secMossa * 1000, passi: this.minimo });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p];
    this.pianoBot(p, livello);
    const svista = { facile: 0.12, medio: 0.03, difficile: 0 }[livello] || 0;
    if (Math.random() < svista) {
      const lecite = [];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        if (a === b) continue;
        const d = piccolo(t.pos, this.nd, a), s = piccolo(t.pos, this.nd, b);
        if (d && (!s || s > d)) lecite.push({ tipo: 'sposta', da: a, a: b });
      }
      if (lecite.length) return caso(lecite);
    }
    const x = prossima(t.pos, this.nd, 2);
    return x ? { tipo: 'sposta', da: x[0], a: x[1] } : { tipo: 'pensa' };
  }

  risultatoSolo(t) {
    const lista = (RECORD[this.nd] = RECORD[this.nd] || []);
    const voce = { ms: t.fatto, mosse: t.mosse, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.mosse === this.minimo ? `Perfetto: ${t.mosse} mosse, il minimo! 🏅` : `${t.mosse} mosse (il minimo è ${this.minimo})`;
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    return {
      ...this.vistaComune(p),
      dischi: this.nd, minimo: this.minimo, pos: t.pos, mosse: t.mosse, puoAnnullare: t.indietro.length > 0,
      mancano: t.fatto == null ? mancano(t.pos, this.nd) : 0,
      mosseAltri: this.tavole.map((x) => x.mosse),
      record: this.sfida ? [] : RECORD[this.nd] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}

module.exports = {
  meta: {
    id: 'hanoi',
    nome: 'Torre di Hanoi',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Sposta la pila di dischi sull\'ultimo piolo, uno alla volta, senza mai mettere un disco grande sopra uno piccolo. Da soli o in sfida.',
    alias: ['hanoi', 'torre di hanoi', 'torri di hanoi', 'dischi', 'pioli', 'torre'],
    opzioni: [
      { id: 'dischi', nome: 'Dischi', valori: DISCHI, etichette: ['5 dischi (31 mosse)', '3 dischi (7 mosse)', '4 dischi (15 mosse)', '6 dischi (63 mosse)', '7 dischi (127 mosse)', '8 dischi (255 mosse)'], predefinito: 5 },
    ],
    regole: [
      'Ci sono tre pioli e, sul primo, una pila di dischi dal più grande (sotto) al più piccolo (sopra). Bisogna portare tutta la pila sul terzo piolo.',
      'Si sposta un disco alla volta, sempre quello in cima a un piolo, e non si può mai mettere un disco sopra uno più piccolo.',
      'Comandi: clicca (o tocca) il piolo da cui prendere il disco e poi quello dove posarlo, oppure trascina il disco. Sulla tastiera: 1, 2, 3 (o Q, W, E) per scegliere i pioli; Ctrl+Z annulla l\'ultima mossa (che conta comunque come mossa).',
      'Il minimo di mosse è 2 alla n meno 1: 7 con 3 dischi, 31 con 5, 255 con 8. Il segreto: per spostare una pila di n dischi si sposta prima la pila di n − 1 sul piolo libero, poi il disco grande, poi di nuovo la pila di n − 1 sopra di lui.',
      'Da soli si gioca per il tempo e per le mosse (con la medaglia se si fa il minimo). In sfida (da 2 a 8) tutti hanno la stessa torre: vince chi finisce prima. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce la strategia migliore: il difficile è veloce e non sbaglia mai, il medio è più lento e sbaglia di rado, il facile è lento e ogni tanto fa una mossa inutile.',
    ],
  },
  crea: (o) => new Hanoi(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { prossima, mancano, piccolo, DISCHI },
};
