// FOTOCAMERA MAGICA: i gesti riconosciuti dai punti delle mani e dalle espressioni del viso (public/js/fotocamera-gesti.js),
// con mani e visi finti. In più: il sito permette la fotocamera solo a sé stesso e serve MediaPipe senza CDN.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const G = require('../public/js/fotocamera-gesti');

// una mano finta (21 punti) col polso in (x, y): dita piegate, tranne quelle in "dritte" (indici 1-4: indice…mignolo)
function mano(x, y, dritte = []) {
  const p = Array.from({ length: 21 }, () => ({ x, y }));
  p[0] = { x, y }; // polso
  for (let d = 1; d <= 4; d++) {
    const dx = x + (d - 2.5) * 0.03, base = 4 * d + 1; // 5, 9, 13, 17: nocche
    p[base] = { x: dx, y: y - 0.1 };
    if (dritte.includes(d)) { p[base + 1] = { x: dx, y: y - 0.15 }; p[base + 2] = { x: dx, y: y - 0.19 }; p[base + 3] = { x: dx, y: y - 0.22 }; }
    else { p[base + 1] = { x: dx, y: y - 0.13 }; p[base + 2] = { x: dx, y: y - 0.09 }; p[base + 3] = { x: dx, y: y - 0.06 }; }
  }
  for (let i = 1; i <= 4; i++) p[i] = { x: x - 0.04, y: y - 0.03 * i }; // pollice
  return p;
}

assert.ok(G.ditoAlzato(mano(0.5, 0.7, [1])), 'solo l\'indice alzato: dito alzato');
assert.ok(!G.ditoAlzato(mano(0.5, 0.7, [])), 'pugno chiuso: no');
assert.ok(!G.ditoAlzato(mano(0.5, 0.7, [1, 2, 3, 4])), 'mano aperta: no');
assert.ok(!G.ditoAlzato(mano(0.5, 0.7, [1, 2])), 'indice e medio (vittoria): no');
assert.ok(!G.ditoAlzato(null) && !G.ditoAlzato([]), 'senza mano: no');

// 67: mani alternate su e giù (0,4 secondi a mezza oscillazione) → sì; mani insieme o una sola → no
function prova67(fn, ms = 2400) {
  const c = G.crea67();
  for (let t = 0; t <= ms; t += 66) if (c.aggiungi(fn(t), t)) return t;
  return -1;
}
const onda = (t) => Math.sin((t / 800) * 2 * Math.PI) * 0.12;
assert.ok(prova67((t) => [mano(0.3, 0.6 + onda(t)), mano(0.7, 0.6 - onda(t))]) > 0, 'mani alternate: parte il 67');
assert.ok(prova67((t) => [mano(0.7, 0.6 - onda(t)), mano(0.3, 0.6 + onda(t))]) > 0, 'non importa l\'ordine delle mani');
assert.strictEqual(prova67((t) => [mano(0.3, 0.6 + onda(t)), mano(0.7, 0.6 + onda(t))]), -1, 'mani insieme: niente 67');
assert.strictEqual(prova67((t) => [mano(0.3, 0.6 + onda(t))]), -1, 'una mano sola: niente 67');
assert.strictEqual(prova67((t) => [mano(0.3, 0.6 + onda(t) / 6), mano(0.7, 0.6 - onda(t) / 6)]), -1, 'tremolio piccolo: niente 67');
assert.strictEqual(prova67(() => [mano(0.3, 0.6), mano(0.7, 0.6)]), -1, 'mani ferme: niente 67');

// fermo: immagini uguali → 0, tutte cambiate → 1
const a = new Uint8Array(768).fill(100), b = new Uint8Array(768).fill(200);
assert.strictEqual(G.movimento(a, a), 0);
assert.strictEqual(G.movimento(a, b), 1);
assert.strictEqual(G.movimento(null, a), 1, 'senza immagine prima conta come movimento');

// espressioni del viso
assert.ok(G.triste({ mouthFrownLeft: 0.5, mouthFrownRight: 0.4 }), 'bocca all\'ingiù: triste');
assert.ok(G.triste({ browInnerUp: 0.6, mouthFrownLeft: 0.1, mouthFrownRight: 0.1 }), 'sopracciglia da cucciolo: triste');
assert.ok(!G.triste({ mouthFrownLeft: 0.5, mouthFrownRight: 0.5, mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), 'se sorridi non sei triste');
assert.ok(!G.triste({}) && !G.triste(null), 'viso neutro: no');
assert.ok(G.boccaAperta({ jawOpen: 0.7 }) && !G.boccaAperta({ jawOpen: 0.1 }), 'bocca aperta solo con la mascella giù');
assert.ok(G.occhiSocchiusi({ eyeBlinkLeft: 0.55, eyeBlinkRight: 0.6 }), 'occhi mezzi chiusi: socchiusi');
assert.ok(!G.occhiSocchiusi({ eyeBlinkLeft: 0.95, eyeBlinkRight: 0.95 }), 'occhi chiusi del tutto: no');
assert.ok(!G.occhiSocchiusi({ eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 }), 'occhi aperti: no');
assert.ok(G.occhiolino({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.05 }) && G.occhiolino({ eyeBlinkLeft: 0.1, eyeBlinkRight: 0.8 }), 'occhiolino con tutti e due gli occhi');
assert.ok(!G.occhiolino({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 }), 'tutti e due chiusi: non è un occhiolino');

// lingua fuori: rosso che scende dal labbro verso il mento; le labbra da sole (striscia sottile) non bastano
const W = 80, H = 80;
function viso(rossoDa, rossoA) {
  const px = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) px.set([205, 160, 140, 255], i * 4); // pelle
  for (let y = rossoDa; y <= rossoA; y++) for (let x = 34; x <= 46; x++) px.set([215, 70, 95, 255], (y * W + x) * 4);
  const k = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  k[10] = { x: 0.5, y: 0.1 }; k[152] = { x: 0.5, y: 0.9 }; // viso alto 0,8
  k[61] = { x: 0.38, y: 0.62 }; k[291] = { x: 0.62, y: 0.62 }; k[14] = { x: 0.5, y: 0.62 }; k[17] = { x: 0.5, y: 0.66 };
  k[205] = { x: 0.3, y: 0.5 }; k[425] = { x: 0.7, y: 0.5 };
  return [px, W, H, k];
}
assert.ok(G.linguaFuori(...viso(50, 62), {}), 'lingua lunga sotto il labbro: sì');
assert.ok(!G.linguaFuori(...viso(50, 53), {}), 'solo il labbro: no');
assert.ok(!G.linguaFuori(...viso(1, 0), {}), 'solo pelle: no');
assert.ok(G.linguaFuori(null, 0, 0, null, { tongueOut: 0.4 }), 'se MediaPipe vede la lingua basta quello');

// faccia arrabbiata: conta quanto si aggrottano le sopracciglia rispetto alla faccia calma di chi guarda
const calmo = { browDownLeft: 0.05, browDownRight: 0.05 }, cattivo = { browDownLeft: 0.6, browDownRight: 0.55, noseSneerLeft: 0.2, noseSneerRight: 0.2 };
let R = G.creaRabbia();
for (let i = 0; i < 60; i++) assert.ok(!R.aggiungi(calmo), 'faccia calma: no');
assert.ok(R.aggiungi(cattivo), 'sopracciglia aggrottate: arrabbiato');
assert.ok(!R.aggiungi({ ...cattivo, mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), 'se sorridi non sei arrabbiato');
// con gli occhiali le sopracciglia sembrano sempre un po' giù: dopo un po' quello è il riposo e non scatta più
R = G.creaRabbia();
const occhiali = { browDownLeft: 0.4, browDownRight: 0.4 };
for (let i = 0; i < 200; i++) assert.ok(!R.aggiungi(occhiali), 'occhiali, faccia calma: mai arrabbiato');
assert.ok(R.aggiungi({ browDownLeft: 0.75, browDownRight: 0.75 }), 'occhiali e sopracciglia aggrottate: arrabbiato');
// tenere la faccia arrabbiata non sposta il riposo (resta arrabbiato)
for (let i = 0; i < 100; i++) R.aggiungi({ browDownLeft: 0.75, browDownRight: 0.75 });
assert.ok(R.aggiungi({ browDownLeft: 0.75, browDownRight: 0.75 }), 'arrabbiato a lungo: resta arrabbiato');
assert.ok(!R.aggiungi(null), 'senza viso: no');

// dito alzato anche un po' storto (mano girata di lato)
const storta = mano(0.5, 0.7, [1]); storta[6] = { x: 0.5, y: 0.56 }; storta[7] = { x: 0.53, y: 0.52 }; storta[8] = { x: 0.56, y: 0.49 };
assert.ok(G.ditoAlzato(storta), 'dito alzato un po\' storto: sì');
const sdraiata = mano(0.5, 0.7, [1]); sdraiata[6] = { x: 0.55, y: 0.6 }; sdraiata[7] = { x: 0.6, y: 0.6 }; sdraiata[8] = { x: 0.65, y: 0.6 };
assert.ok(!G.ditoAlzato(sdraiata), 'dito che punta di lato: no');

// occhiolino che impara: chi chiude l'occhio "a metà" per MediaPipe ma si vede dalla forma dell'occhio
function occhi(apS, apD) { // apertura (altezza) dei due occhi, larghi 0,06
  const k = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  k[33] = { x: 0.35, y: 0.4 }; k[133] = { x: 0.41, y: 0.4 }; k[159] = { x: 0.38, y: 0.4 - apS / 2 }; k[145] = { x: 0.38, y: 0.4 + apS / 2 };
  k[362] = { x: 0.59, y: 0.4 }; k[263] = { x: 0.65, y: 0.4 }; k[386] = { x: 0.62, y: 0.4 - apD / 2 }; k[374] = { x: 0.62, y: 0.4 + apD / 2 };
  return k;
}
let O = G.creaOcchiolino();
for (let i = 0; i < 30; i++) assert.ok(!O.aggiungi({ eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 }, occhi(0.018, 0.018)), 'occhi aperti: no');
assert.ok(!G.occhiolino({ eyeBlinkLeft: 0.45, eyeBlinkRight: 0.2 }), 'il vecchio controllo non lo vedeva');
assert.ok(O.aggiungi({ eyeBlinkLeft: 0.45, eyeBlinkRight: 0.2 }, occhi(0.004, 0.017)), 'occhiolino "a metà" con l\'occhio chiuso davvero: sì');
assert.ok(!O.aggiungi({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 }, occhi(0.003, 0.003)), 'sbattuta (tutti e due chiusi): no');
assert.ok(!O.aggiungi({ eyeBlinkLeft: 0.15, eyeBlinkRight: 0.1 }, occhi(0.014, 0.018)), 'testa un po\' girata: no');
assert.ok(O.aggiungi({ eyeBlinkLeft: 0.9, eyeBlinkRight: 0.05 }), 'occhiolino netto anche senza punti');

// socchiusi che impara: occhi sempre un po' "chiusi" per MediaPipe non bastano più
let SC = G.creaSocchiusi();
for (let i = 0; i < 100; i++) assert.ok(!SC.aggiungi({ eyeBlinkLeft: 0.38, eyeBlinkRight: 0.38 }), 'occhi a mandorla, calmi: no');
assert.ok(SC.aggiungi({ eyeBlinkLeft: 0.7, eyeBlinkRight: 0.68 }), 'e se li stringi: sì');
assert.ok(!G.occhiSocchiusi({ eyeBlinkLeft: 0.55, eyeBlinkRight: 0.6, eyeLookDownLeft: 0.7, eyeLookDownRight: 0.7 }), 'guardare in basso non è socchiudere');

// triste: la sorpresa (sopracciglia tutte su) non è tristezza; e chi ha la bocca un po' giù da calmo impara il riposo
assert.ok(!G.triste({ browInnerUp: 0.7, browOuterUpLeft: 0.7, browOuterUpRight: 0.7 }), 'sorpresa: no');
let T = G.creaTristezza();
for (let i = 0; i < 200; i++) assert.ok(!T.aggiungi({ mouthFrownLeft: 0.32, mouthFrownRight: 0.32 }), 'bocca all\'ingiù da calmo: dopo un po\' no');
assert.ok(T.aggiungi({ mouthFrownLeft: 0.7, mouthFrownRight: 0.65 }), 'e se ti rattristi davvero: sì');

// bocca aperta anche dalla forma delle labbra (se jawOpen è basso ma non zero)
const labbra = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
labbra[61] = { x: 0.44, y: 0.6 }; labbra[291] = { x: 0.56, y: 0.6 }; labbra[13] = { x: 0.5, y: 0.57 }; labbra[14] = { x: 0.5, y: 0.64 };
assert.ok(G.boccaAperta({ jawOpen: 0.3 }, 0.45, labbra), 'labbra lontane: bocca aperta');
assert.ok(!G.boccaAperta({ jawOpen: 0.05 }, 0.45, labbra), 'ma serve un po\' di mascella giù');

// lingua che impara: il rossetto (labbra rosse più lunghe) non la fa scattare, la lingua sì
let L = G.creaLingua();
for (let i = 0; i < 60; i++) assert.ok(!L.aggiungi(...viso(50, 56), {}), 'rossetto a bocca chiusa: no');
assert.ok(L.aggiungi(...viso(50, 66), {}), 'con la lingua fuori: sì');
L = G.creaLingua();
assert.ok(L.aggiungi(...viso(50, 66), {}), 'anche se si parte già con la lingua fuori');

// testa girata: i gesti del viso non contano
const dritto = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
dritto[234] = { x: 0.4, y: 0.5 }; dritto[454] = { x: 0.6, y: 0.5 }; dritto[1] = { x: 0.5, y: 0.5 }; dritto[10] = { x: 0.5, y: 0.35 }; dritto[152] = { x: 0.5, y: 0.65 };
assert.ok(!G.testaGirata(dritto), 'testa dritta: no');
assert.ok(G.testaGirata(dritto.map((p, i) => (i === 1 ? { x: 0.57, y: 0.5 } : p))), 'naso quasi sul lato: testa girata');
// più facce: si segue la più grande (la più vicina)
const piccola = dritto.map((p) => ({ x: 0.5 + (p.x - 0.5) / 3, y: 0.5 + (p.y - 0.5) / 3 }));
assert.strictEqual(G.facciaPiuGrande([piccola, dritto]), 1, 'la faccia più vicina');
assert.strictEqual(G.facciaPiuGrande([]), -1, 'nessuna faccia');
// arrabbiato: se si parte già accigliati, poi con la faccia calma non resta "sordo"
R = G.creaRabbia();
for (let i = 0; i < 5; i++) R.aggiungi(cattivo);
for (let i = 0; i < 30; i++) R.aggiungi(calmo);
assert.ok(R.aggiungi(cattivo), 'partito accigliato: poi l\'arrabbiato scatta lo stesso');
// i numeri per !foto prova
assert.ok(/serve/.test(R.prova) && /serve/.test(L.prova) && /serve/.test(SC.prova) && /serve/.test(T.prova) && /MediaPipe/.test(O.prova), 'ogni gesto dice il suo valore e la soglia');

// ENRICO PAPI: il video si chiude con la X in alto a destra
const ese = fs.readFileSync(path.join(__dirname, '../public/js/esecuzione.js'), 'utf8');
assert.ok(/ex-papi-chiudi/.test(ese) && /\.ex-papi-chiudi \{[^}]*top:[^}]*right:/.test(fs.readFileSync(path.join(__dirname, '../public/nuovi.css'), 'utf8')), 'X per chiudere Enrico Papi in alto a destra');

// il sito: fotocamera permessa solo a sé stesso, wasm permesso, MediaPipe dalla dipendenza (niente CDN)
const S = require('../sicurezza');
assert.ok(/script-src 'self' 'wasm-unsafe-eval'(;|$)/.test(S.CSP), 'CSP: wasm sì, script esterni no');
const sic = fs.readFileSync(path.join(__dirname, '../sicurezza.js'), 'utf8');
assert.ok(sic.includes("camera=(self), microphone=()"), 'Permissions-Policy: fotocamera solo per il sito, microfono no');
const pkg = require('../package.json');
assert.ok(pkg.dependencies['@mediapipe/tasks-vision'], 'MediaPipe tra le dipendenze');
const pub = path.join(__dirname, '../public');
for (const f of ['modelli/mani.task', 'modelli/viso.task']) assert.ok(fs.statSync(path.join(pub, f)).size > 1e6, `${f} c'è`);
const js = fs.readFileSync(path.join(pub, 'js/fotocamera.js'), 'utf8');
const gatti = [...js.match(/const GATTI = \{([^}]*)\}/)[1].matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]);
assert.ok(gatti.length >= 9, 'tutti i gatti elencati');
for (const nome of gatti) assert.ok(fs.existsSync(path.join(pub, `fotocamera/gatto-${nome}.jpg`)), `manca la foto gatto-${nome}.jpg`);
// !foto: lo intercettano le tre chat (tavolo, sala, globale) prima di mandarlo, ed è nell'elenco dei comandi
const app = fs.readFileSync(path.join(pub, 'js/app.js'), 'utf8');
assert.strictEqual((app.match(/Fotocamera\.comando\(t\)/g) || []).length, 3, '!foto in tutte e tre le chat');
assert.ok(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').includes("'!foto':"), '!foto in !comandi');
assert.ok(/function comando\(testo\)[\s\S]*\^!foto\( prova\)\?\$/.test(js), '!foto (o !foto prova) solo come messaggio intero');
// la fotocamera non si apre due volte (doppio clic o !foto mentre il browser chiede il permesso: una resterebbe accesa)
assert.ok(/if \(flusso \|\| accensione\) return;/.test(js), 'una sola accensione alla volta');
assert.ok(/addEventListener\('ended'/.test(js), 'si accorge se la fotocamera si stacca');
assert.ok(/Promise\.allSettled/.test(js) && /rifai/.test(js), 'mani e viso caricati insieme, ognuno per conto suo, e ripartono col processore');
// Enrico Papi: chiudendolo tutti, il gioco riparte
const srv = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
assert.ok(/socket\.on\('papiChiuso'/.test(srv) && /emit\('papiChiuso'\)/.test(app), 'Enrico Papi: chiuso da tutti, il gioco riparte');
assert.ok(!/https?:\/\//.test(js), 'la fotocamera non scarica niente da fuori');
assert.ok(!/frame-src/.test(S.CSP), 'CSP: niente riquadri da altri siti');
assert.ok(!/socket|fetch\([^)]*method: 'POST'/.test(js), 'la fotocamera non manda niente al server');

console.log('✓ Fotocamera magica: dito alzato, 67 (pronto), fermo, lingua, bocca aperta, arrabbiato (anche con gli occhiali), occhiolino, occhi socchiusi, triste; permessi e file');
