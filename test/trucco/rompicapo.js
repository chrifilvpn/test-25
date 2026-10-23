// Il trucco segreto nei rompicapo: il suggerimento arriva solo a chi l'ha chiesto, al momento giusto, ed è giusto
// (la casella, la cifra, la mossa che porta alla soluzione). Anche campo minato, sudoku e nonogram (senza computer).
const assert = require('assert');
process.env.TEST_VELOCE = '1';
const T = require('../../giochi/trucco');
const { GIOCHI } = require('../../giochi');

// crea una partita con le opzioni predefinite (più quelle date); posto 0 persona, gli altri computer
function nuova(id, n = 1, opzioni = {}) {
  const mod = GIOCHI[id];
  const opz = {}; for (const o of mod.meta.opzioni) opz[o.id] = o.predefinito; Object.assign(opz, opzioni);
  return mod.crea({ n, primo: 0, opzioni: opz, bot: Array.from({ length: n }, (_, i) => (i ? 'medio' : null)) });
}
// arma il trucco del posto, chiede i suggerimenti e restituisce il testo arrivato (o null); controlla che sia segreto
function chiedi(g, posto = 0) {
  const ev = g.evento && g.evento.id;
  T.arma(g, posto);
  T.controllaSuggerimenti(g);
  const s = T.prendiSussurri(g);
  assert.ok(s.every((m) => m.posto === posto), 'il suggerimento va solo a chi l\'ha chiesto');
  assert.strictEqual(g.evento && g.evento.id, ev, 'nessun annuncio pubblico');
  if (!s.length) { assert.ok(T.armato(g, posto), 'senza suggerimento il trucco resta attivo'); return null; }
  assert.ok(!T.armato(g, posto), 'dato il suggerimento il trucco si spegne');
  assert.ok(/^💡 /.test(s[0].testo), s[0].testo);
  return s[0].testo;
}
const celle = (testo) => [...testo.matchAll(/riga (\d+),? col(?:onna)? (\d+)/gi)].map((m) => [Number(m[1]) - 1, Number(m[2]) - 1]);

// SUDOKU: riga, colonna e numero giusti
{
  const g = nuova('sudoku', 2);
  for (let k = 0; k < 5; k++) {
    const t = chiedi(g, k % 2);
    const m = t.match(/Riga (\d), colonna (\d): (\d)/);
    const i = (m[1] - 1) * 9 + (m[2] - 1);
    assert.ok(!g.dati[i] && g.griglia[i] !== g.soluzione[i] && g.soluzione[i] === Number(m[3]), t);
    assert.ok(g.azione(k % 2, { tipo: 'metti', cella: i, valore: Number(m[3]) }).ok);
  }
}
// CAMPO MINATO: niente prima del primo clic, poi una casella sicura ancora coperta
{
  for (let k = 0; k < 20; k++) {
    const g = nuova('campo', 1, { difficolta: 'normale' });
    assert.strictEqual(chiedi(g), null);
    g.azione(0, { tipo: 'apri', cella: 0 });
    T.prendiSussurri(g); delete g._win;
    if (g.finita) continue;
    const t = chiedi(g);
    const [[r, c]] = celle(t), i = r * g.C + c;
    assert.ok(!g.mine[i] && !g.aperte[i], t);
    g.azione(0, { tipo: 'apri', cella: i });
    assert.ok(!g.finita || g.vinta, 'la casella era sicura');
  }
}
// CASELLE E BOMBE: solo nel proprio turno, caselle senza bomba
{
  const g = nuova('casellebombe', 2);
  assert.strictEqual(chiedi(g, 1), null, 'non è il suo turno');
  delete g._win;
  const t = chiedi(g, 0);
  const lista = celle(t);
  assert.ok(lista.length === 3, t);
  for (const [r, c] of lista) { const i = r * g.lato + c; assert.ok(!g.bombe.has(i) && !g.scoperte[i], t); }
}
// INTERRUTTORI: nel proprio turno, il numero (come lo vede il giocatore) dell'interruttore con la bomba
{
  const g = nuova('interruttori', 3);
  assert.strictEqual(chiedi(g, 2), null);
  delete g._win;
  const t = chiedi(g, 0);
  assert.strictEqual(Number(t.match(/interruttore (\d+)/)[1]), g.bomba + 1, t);
}
// BLOCK BLAST: la mossa del computer difficile, che entra davvero
{
  const B = GIOCHI.blockblast;
  for (const modo of ['sfida', 'coop']) {
    const g = nuova('blockblast', 2, { modo });
    if (modo === 'coop') { assert.strictEqual(chiedi(g, 1), null, 'non è il suo turno'); delete g._win; }
    const t = chiedi(g, 0);
    const m = t.match(/Pezzo (\d) .* riga (\d), colonna (\d)/);
    const b = B.bot(g, 0, 'difficile');
    assert.deepStrictEqual([b.pezzo, b.r, b.c], [m[1] - 1, m[2] - 1, m[3] - 1], t);
    assert.ok(g.azione(0, { tipo: 'metti', pezzo: b.pezzo, r: b.r, c: b.c }).ok);
  }
}
// SBLOCCA: le prime mosse della strada più corta; seguendole si arriva alla soluzione nel minimo di mosse
{
  const S = GIOCHI.sblocca;
  const g = nuova('sblocca', 1, { livello: 'facile', round: 1 });
  const t = chiedi(g);
  const strada = S._test.risolvi(g.tavole[0].blocchi);
  assert.strictEqual(t.split('→').length, Math.min(3, strada.length), t);
  // la prima mossa detta è quella giusta (blocco e verso)
  const b0 = g.tavole[0].blocchi[strada[0].b];
  const d = b0.o === 'v' ? strada[0].r - b0.r : strada[0].c - b0.c;
  assert.ok(t.split('→')[0].includes(`di ${Math.abs(d)}`) && (strada[0].b !== 0 || t.startsWith('💡 Blocco rosso')), t);
  for (const m of strada) assert.ok(g.azione(0, { tipo: 'muovi', ...m }).ok);
  assert.ok(g.tavole[0].fatto !== null && g.tavole[0].mosse === g.minimo);
  assert.strictEqual(chiedi(g), null, 'a puzzle finito non serve più');
}
// TORRE DI HANOI: "dal piolo X al Y" sono mosse lecite e ottime
{
  const g = nuova('hanoi', 1, { dischi: 3 });
  let fatte = 0;
  while (!g.finita) {
    const t = chiedi(g);
    const mosse = [...t.matchAll(/piolo (\d) al (\d)/g)];
    assert.ok(mosse.length >= 1 && mosse.length <= 3, t);
    if (!fatte) assert.ok(t.startsWith('💡 Sposta il disco dal piolo 1 al 3'), t);
    for (const m of mosse) { assert.ok(g.azione(0, { tipo: 'sposta', da: m[1] - 1, a: m[2] - 1 }).ok, t); fatte++; }
  }
  assert.strictEqual(fatte, 7, 'il minimo di mosse');
}
// KAKURO e GABBIE (kenken): la cifra giusta; uno sbaglio viene corretto prima
for (const id of ['kakuro', 'kenken']) {
  const g = nuova(id, 2);
  const L = id === 'kakuro' ? g.L : g.N;
  const t = g.tavole[0];
  const bianca = id === 'kakuro' ? g.S.bianche[3] : 3;
  g.azione(0, { tipo: 'metti', i: bianca, v: g.soluzione[bianca] === 1 ? 2 : 1 });
  let testo = chiedi(g);
  let m = testo.match(/Riga (\d+), colonna (\d+): (correggi in )?(\d)/);
  assert.ok(m[3] && (m[1] - 1) * L + (m[2] - 1) === bianca && Number(m[4]) === g.soluzione[bianca], testo);
  g.azione(0, { tipo: 'metti', i: bianca, v: g.soluzione[bianca] });
  for (let k = 0; k < 5; k++) {
    testo = chiedi(g);
    m = testo.match(/Riga (\d+), colonna (\d+): (\d)/);
    const i = (m[1] - 1) * L + (m[2] - 1);
    assert.ok(!t.valori[i] && g.soluzione[i] === Number(m[3]), testo);
    g.azione(0, { tipo: 'metti', i, v: Number(m[3]) });
  }
}
// SPINGI LE CASSE: seguendo i passi detti si fa una spinta giusta; seguendoli sempre si finisce il livello
{
  const g = nuova('sokoban', 1, { livelli: 'facile' });
  const DIR = { su: 'u', giù: 'd', sinistra: 'l', destra: 'r' }, SPINTA = { 'in su': 'u', 'in giù': 'd', 'a sinistra': 'l', 'a destra': 'r' };
  for (let k = 0; k < 200 && !g.finita; k++) {
    const t = chiedi(g);
    const m = t.match(/^💡 (?:Cammina (.*), poi spingi|Spingi) la cassa (in su|in giù|a sinistra|a destra)/);
    assert.ok(m, t);
    const passi = [];
    for (const x of (m[1] || '').split(', ').filter(Boolean)) { const [, d, n] = x.match(/^(su|giù|sinistra|destra)(?: ×(\d+))?$/); for (let j = 0; j < (Number(n) || 1); j++) passi.push(DIR[d]); }
    passi.push(SPINTA[m[2]]);
    const spinte = g.tavole[0].spinte;
    for (const d of passi) assert.ok(g.azione(0, { tipo: 'passo', dir: d }).ok, t);
    assert.strictEqual(g.tavole[0].spinte, spinte + 1, t);
  }
  assert.ok(g.finita, 'livello finito seguendo i suggerimenti');
}
// MAHJONG: la coppia detta esiste tra quelle libere
{
  const g = nuova('mahjong', 1, { figura: 'piramide' });
  const t = chiedi(g);
  const nome = t.match(/coppia (.*?):/)[1];
  assert.ok(/Togli la coppia .*: una tessera .*, l'altra /.test(t), t);
  assert.ok(g.mosseLibere(g.tavole[0]).length && nome.length > 2, t);
}
// LUCI SPENTE: le caselle dette sono tutte da toccare (fanno parte della soluzione minima)
{
  const Lc = GIOCHI.luci;
  for (const modo of ['due', 'tre']) {
    const g = nuova('luci', 1, { modo, difficolta: 'facile' });
    const t = chiedi(g);
    const x = Lc._test.risolvi(g.tavole[0].stato, g.lato, g.q);
    const lista = celle(t);
    assert.ok(lista.length >= 1 && lista.length <= 4, t);
    for (const [r, c] of lista) assert.ok(x[r * g.lato + c] > 0, t);
  }
}
// NURIKABE: le caselle dette sono mare; una casella sbagliata viene detta prima
{
  const g = nuova('nurikabe', 1);
  let t = chiedi(g);
  for (const [r, c] of celle(t)) assert.ok(!g.soluzione[r * g.W + c], t);
  const isola = g.soluzione.findIndex((v, k) => v && !g.numeri[k]);
  g.azione(0, { tipo: 'segna', i: isola, v: 1 });
  t = chiedi(g);
  const [[r, c]] = celle(t);
  assert.ok(r * g.W + c === isola && /isola/.test(t), t);
}
// PICROSS: il nome del disegno e i blocchi della riga, con il colore giusto
{
  const g = nuova('picross', 1);
  const t = chiedi(g);
  const m = t.match(/È: (.*) · Riga (\d+): (.*)$/);
  assert.strictEqual(m[1], g.d.nome);
  const y = m[2] - 1, W = g.d.W;
  const riga = new Array(W).fill(0);
  if (m[3] !== 'tutta vuota') for (const q of m[3].split(', ')) { const [, a, b, v] = q.match(/col (\d+)(?:-(\d+))? colore (\d+)/); for (let x = a - 1; x <= (b || a) - 1; x++) riga[x] = Number(v); }
  assert.deepStrictEqual(riga, g.d.img.slice(y * W, y * W + W), t);
}
// CRUCIVERBA: le parole giuste delle definizioni non ancora risolte
{
  const g = nuova('cruciverba', 1);
  const t = chiedi(g);
  for (const [, n, dir, w] of t.matchAll(/(\d+) (orizzontale|verticale): ([A-Z]+)/g)) {
    const d = g.definizioni.find((x) => x.n === Number(n) && x.dir === (dir === 'orizzontale' ? 'o' : 'v'));
    assert.strictEqual(d.w.toUpperCase(), w, t);
  }
  assert.ok(/^💡 \d+ (orizzontale|verticale): [A-Z]+ · \d+/.test(t), t);
}
// NONOGRAM: il disegno e le colonne giuste da colorare nella riga; uno sbaglio viene detto prima
{
  const g = nuova('nonogram', 2, { lato: 10, origine: 'disegni', errori: 'nascosti' });
  let t = chiedi(g, 1);
  assert.ok(t.includes(`È: ${g.nomeDisegno}`), t);
  const m = t.match(/Riga (\d+): colora (?:la colonna|le colonne) (.*)$/);
  const y = m[1] - 1;
  const piene = []; for (const q of m[2].split(', ')) { const [a, b] = q.split('-').map(Number); for (let x = a; x <= (b || a); x++) piene.push(x - 1); }
  for (let x = 0; x < 10; x++) assert.strictEqual(!!g.soluzione[y * 10 + x], piene.includes(x), t);
  const vuota = g.soluzione.findIndex((v) => !v);
  g.azione(0, { tipo: 'segna', celle: [vuota], valore: 1 });
  t = chiedi(g, 0);
  const [[r, c]] = celle(t);
  assert.ok(r * 10 + c === vuota && /vuota/.test(t), t);
}
console.log('✓ Trucco nei rompicapo: suggerimenti segreti giusti in 16 giochi (sudoku, campo, caselle, interruttori, block blast, sblocca, hanoi, kakuro, gabbie, casse, mahjong, luci, nurikabe, picross, cruciverba, nonogram)');
