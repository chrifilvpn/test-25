// DRAGHI E SEGRETE: le due intelligenze della creatura, come in Alien: Isolation.
// - la DIRETTRICE (non muove la creatura): misura la tensione (quanto è vicina la creatura, se vi insegue, se vi vede)
//   e quanto tempo passa senza incontri. Quando la tensione è troppo alta tira il guinzaglio (la creatura torna nei
//   condotti e vi lascia respirare); quando è tutto troppo calmo le dà un INDIZIO: la zona dove siete, sbagliata di
//   qualche casella (più passa il tempo, più l'indizio è preciso). La creatura non sa mai dove siete esattamente
// - la MENTE della creatura: impara le vostre abitudini. Ogni trucco usato davanti a lei (armadietti, sotto i mobili,
//   correre, il fuoco, i diversivi, la torcia spenta) le insegna qualcosa: più lo ripetete, più funziona male
//   (controlla gli armadietti da più lontano, guarda sotto le scrivanie, non ci casca più coi diversivi, il fuoco la
//   spaventa meno…). Le abitudini si dimenticano piano se cambiate strategia
// Tutto è un oggetto semplice (si salva con la partita): serve sia al tempo reale sia alla campagna a turni.

const ABITUDINI = {
  armadietto: 'si nasconde negli armadietti',
  sotto: 'si nasconde sotto i mobili',
  corsa: 'scappa correndo',
  fuoco: 'usa il fuoco',
  diversivo: 'lancia diversivi',
  buio: 'spegne la luce',
};
// quanto pesa ogni volta e quante volte servono per impararlo bene
const IMPARA = { armadietto: 0.16, sotto: 0.2, corsa: 0.08, fuoco: 0.25, diversivo: 0.3, buio: 0.1 };
// la tensione della direttrice: soglie per tempo reale (secondi) e a turni (mosse)
const PICCO = 85;
const CALMA_MAX = { storia: 40, normale: 20, difficile: 15, mortale: 12 };
const CALMA_TURNI = { storia: 7, normale: 5, difficile: 4, mortale: 3 };

function nuovaMente() {
  return { abitudini: Object.fromEntries(Object.keys(ABITUDINI).map((k) => [k, 0])), zone: {}, tensione: 0, calma: 0, tregua: 0, indizio: null, imparato: [] };
}
// la creatura vede (o sente) un trucco: lo impara un po'
function impara(m, tipo, k = 1) {
  if (!m || !(tipo in m.abitudini)) return null;
  const prima = m.abitudini[tipo];
  m.abitudini[tipo] = Math.min(1, prima + IMPARA[tipo] * k);
  // quando un'abitudine supera mezzo, la creatura "l'ha capita": una frase la prima volta
  if (prima < 0.5 && m.abitudini[tipo] >= 0.5 && !m.imparato.includes(tipo)) { m.imparato.push(tipo); return tipo; }
  return null;
}
// tutto si dimentica piano (dt in secondi, o 1 per mossa a turni con lento=false)
function dimentica(m, dt, perSecondo = 0.004) {
  for (const k of Object.keys(m.abitudini)) m.abitudini[k] = Math.max(0, m.abitudini[k] - dt * perSecondo);
}
const quanto = (m, tipo) => (m && m.abitudini[tipo]) || 0;
// le zone dove ha trovato o sentito qualcuno (per settore): ci torna più spesso
function ricordaZona(m, area, k = 1) { if (m && area) m.zone[area] = Math.min(10, (m.zone[area] || 0) + k); }
function zonaPreferita(m, aree) {
  const pesi = aree.map((a) => 1 + (m.zone[a] || 0) * 2);
  let r = Math.random() * pesi.reduce((s, x) => s + x, 0);
  for (let i = 0; i < aree.length; i++) { r -= pesi[i]; if (r <= 0) return aree[i]; }
  return aree[aree.length - 1];
}

// ---------- la direttrice in tempo reale ----------
// info: { dMin (distanza dal personaggio più vicino, Infinity nei condotti), caccia, vede, fuori, difficolta, gruppo {x, y} }
function direttrice(m, dt, t, info) {
  const { dMin, caccia, vede, fuori } = info;
  let d = -6;
  if (fuori && dMin < 6) d = 18; else if (fuori && dMin < 12) d = 8; else if (dMin < 10) d = 3; // anche nei condotti, vicina, mette ansia
  if (caccia) d += 14;
  if (vede) d += 6;
  m.tensione = Math.max(0, Math.min(100, m.tensione + d * dt));
  if (dMin < 13) m.calma = 0; else m.calma += dt;
  // troppa tensione: tregua (la creatura deve andarsene appena smette di inseguire)
  if (m.tensione >= PICCO && m.tregua <= t) { m.tregua = t + 12 + Math.random() * 8; m.indizio = null; return 'tregua'; }
  if (m.tregua > t) { if (m.tensione < 25) m.tregua = Math.min(m.tregua, t + 4); return 'tregua'; }
  // troppa calma: un indizio sulla zona del gruppo (più è calmo, più è preciso)
  const max = CALMA_MAX[info.difficolta] || CALMA_MAX.normale;
  if (m.calma >= max && info.gruppo && (!m.indizio || m.indizio.fino < t)) {
    const errore = Math.max(3, 12 - (m.calma - max) / 4);
    m.indizio = { x: info.gruppo.x + (Math.random() - 0.5) * 2 * errore, y: info.gruppo.y + (Math.random() - 0.5) * 2 * errore, fino: t + 14, errore };
    return 'indizio';
  }
  return m.indizio && m.indizio.fino > t ? 'indizio' : 'libera';
}

// ---------- la direttrice a turni (una mossa alla volta) ----------
// k: passi tra creatura e gruppo. Ritorna 'tregua' | 'spingi' | 'libera'
function direttriceTurni(m, k, difficolta) {
  if (k <= 1) { m.tensione = Math.min(100, m.tensione + (k === 0 ? 40 : 20)); m.calma = 0; } else { m.tensione = Math.max(0, m.tensione - 12); m.calma++; }
  if (m.tensione >= PICCO) { m.tensione = 40; m.tregua = 3; return 'tregua'; }
  if (m.tregua > 0) { m.tregua--; return 'tregua'; }
  if (m.calma >= (CALMA_TURNI[difficolta] || CALMA_TURNI.normale)) return 'spingi';
  return 'libera';
}

// la frase quando la creatura ha capito un trucco
const CAPITO = {
  armadietto: (n) => `Lo senti annusare l'aria più a lungo davanti agli armadietti. ${n} ha capito dove vi nascondete.`,
  sotto: (n) => `${n} si china e guarda sotto le scrivanie, adesso. Ha imparato.`,
  corsa: (n) => `${n} scatta al primo passo di corsa che sente: correre non vi salverà a lungo.`,
  fuoco: (n) => `${n} esita, ma non scappa più subito davanti al fuoco.`,
  diversivo: (n) => `${n} ignora il rumore del diversivo: non ci casca più.`,
  buio: (n) => `${n} ascolta nel buio: al buio vi sente lo stesso.`,
};

module.exports = { ABITUDINI, nuovaMente, impara, dimentica, quanto, ricordaZona, zonaPreferita, direttrice, direttriceTurni, CAPITO, PICCO };
