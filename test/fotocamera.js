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

// movimento (usato per il 67): immagini uguali → 0, tutte cambiate → 1
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
// con gli occhiali MediaPipe non vede scendere le sopracciglia: bastano gli altri segni (occhi stretti, naso, bocca)
R = G.creaRabbia();
const calmoOcchiali = { browDownLeft: 0.1, browDownRight: 0.1, eyeSquintLeft: 0.1, eyeSquintRight: 0.1 };
for (let i = 0; i < 60; i++) assert.ok(!R.aggiungi(calmoOcchiali), 'occhiali, calmo: no');
assert.ok(R.aggiungi({ ...calmoOcchiali, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, noseSneerLeft: 0.3, noseSneerRight: 0.3, mouthPressLeft: 0.3, mouthPressRight: 0.3 }), 'occhiali e faccia arrabbiata senza sopracciglia: sì');
assert.ok(!R.aggiungi({ ...calmoOcchiali, eyeSquintLeft: 0.6, eyeSquintRight: 0.6 }), 'solo occhi stretti: no');
assert.ok(!R.aggiungi({ ...calmoOcchiali, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, noseSneerLeft: 0.3, noseSneerRight: 0.3, mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), 'sorriso con gli occhi stretti: no');
// e dai punti del viso: sopracciglia che scendono verso gli occhi
const fronte = (giu) => { const k = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  k[10] = { x: 0.5, y: 0.2 }; k[152] = { x: 0.5, y: 0.8 }; k[133] = { x: 0.45, y: 0.4 }; k[362] = { x: 0.55, y: 0.4 };
  k[159] = { x: 0.4, y: 0.39 }; k[386] = { x: 0.6, y: 0.39 }; k[55] = { x: 0.46 + giu / 4, y: 0.33 + giu }; k[285] = { x: 0.54 - giu / 4, y: 0.33 + giu }; return k; };
R = G.creaRabbia();
for (let i = 0; i < 60; i++) assert.ok(!R.aggiungi(calmoOcchiali, fronte(0)), 'punti, calmo: no');
assert.ok(R.aggiungi({ ...calmoOcchiali, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 }, fronte(0.02)), 'sopracciglia giù e vicine (dai punti) e occhi stretti: sì');
// rughe tra le sopracciglia: pelle liscia → poco; righe verticali → molto di più
const pelle = (righe) => { const w = 40, h = 24, px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = righe && x % 6 < 2 ? 140 : 200; px.set([c, c - 30, c - 50, 255], (y * w + x) * 4); }
  return [px, w, h]; };
assert.ok(G.misuraRughe(...pelle(true)) > G.misuraRughe(...pelle(false)) * 3, 'le rughe si vedono');
R = G.creaRabbia();
for (let i = 0; i < 60; i++) assert.ok(!R.aggiungi(calmoOcchiali, null, G.misuraRughe(...pelle(false)) + 0.01), 'fronte liscia: no');
assert.ok(R.aggiungi({ ...calmoOcchiali, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 }, null, G.misuraRughe(...pelle(true))), 'rughe tra le sopracciglia e occhi stretti: sì');

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
// si parte con la lingua fuori: quella sembra la faccia normale, ma appena chiudi la bocca il riposo scende e la
// volta dopo il gatto arriva
L = G.creaLingua();
assert.ok(!L.aggiungi(...viso(50, 66), {}), 'la prima misura è la faccia normale');
for (let i = 0; i < 20; i++) L.aggiungi(...viso(50, 53), {}, false);
assert.ok(L.aggiungi(...viso(50, 66), {}), 'chiusa la bocca e rifatta la linguaccia: sì');
// IL CASO DEL 27/10: tanto rosso sotto il labbro anche senza lingua (luce, mento, ombre). A labbra chiuse non scatta
// mai; e anche se scattasse, dopo ~10 secondi di fila si spegne da solo (prima restava acceso per sempre)
L = G.creaLingua();
L.aggiungi(...viso(50, 53), {});
for (let i = 0; i < 300; i++) assert.ok(!L.aggiungi(...viso(50, 66), {}, false), 'labbra chiuse: niente lingua');
L = G.creaLingua();
L.aggiungi(...viso(50, 53), {});
let accesi = 0;
for (let i = 0; i < 300; i++) if (L.aggiungi(...viso(50, 66), {})) accesi++;
assert.ok(accesi > 100 && accesi < 160, `un gatto acceso di fila si spegne da solo (${accesi})`);
assert.ok(!L.aggiungi(...viso(50, 66), {}), 'e non torna finché non cambia qualcosa');
// lo stesso per occhiolino (un occhio sempre un po' più chiuso per MediaPipe), arrabbiato, socchiusi e triste
const mai = (crea, e, k) => { const x = crea(); let n = 0; for (let i = 0; i < 400; i++) if (x.aggiungi(e, k)) n++; return n; };
assert.ok(mai(G.creaOcchiolino, { eyeBlinkLeft: 0.7, eyeBlinkRight: 0.1 }) <= 160, 'occhiolino finto: si spegne');
assert.ok(mai(G.creaSocchiusi, { eyeBlinkLeft: 0.6, eyeBlinkRight: 0.6 }) <= 160, 'socchiusi finto: si spegne');
assert.ok(mai(G.creaTristezza, { mouthFrownLeft: 0.8, mouthFrownRight: 0.8 }) <= 160, 'triste finto: si spegne');
const R2 = G.creaRabbia(); R2.aggiungi({}); let nr = 0;
for (let i = 0; i < 400; i++) if (R2.aggiungi({ browDownLeft: 0.9, browDownRight: 0.9 })) nr++;
assert.ok(nr > 100 && nr <= 160, `arrabbiato acceso di fila si spegne da solo (${nr})`);
// labbra aperte o chiuse (in pixel)
assert.ok(G.labbra(labbra) > 0.3 && G.labbra(labbra.map((p, i) => (i === 14 ? labbra[13] : p))) === 0, 'labbra aperte/chiuse');

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
// niente gatto soldato: se non fai niente vedi solo te stesso
assert.ok(!/soldato|fermo/.test(js.match(/const GATTI = \{([^}]*)\}/)[1]), 'niente gatto da fermo');
const srv = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
// i file pesanti di MediaPipe: compressi e tenuti dal browser; il download parte già con la richiesta del permesso
assert.ok(/function serviPesante\(/.test(srv) && /Content-Encoding': 'gzip'/.test(srv) && /max-age=604800/.test(srv), 'MediaPipe compresso e in cache');
assert.ok(srv.indexOf("app.get('/modelli/:file'") < srv.indexOf("app.use(express.static(path.join(__dirname, 'public')))"), 'i modelli passano prima dei file statici');
assert.ok(/accensione = true;\s*caricaModelli\(\);/.test(js), 'il download parte insieme alla richiesta del permesso');
// le foto dei gatti si vedono intere (con lo sfondo sfocato), non tagliate
assert.ok(/fcam-sfondo/.test(js) && /\.fcam-gatto \{ object-fit: contain; \}/.test(fs.readFileSync(path.join(__dirname, '../public/nuovi.css'), 'utf8')), 'gatti interi');
// Enrico Papi: chiudendolo tutti, il gioco riparte
assert.ok(/socket\.on\('papiChiuso'/.test(srv) && /emit\('papiChiuso'\)/.test(app), 'Enrico Papi: chiuso da tutti, il gioco riparte');
assert.ok(!/https?:\/\//.test(js), 'la fotocamera non scarica niente da fuori');
assert.ok(!/frame-src/.test(S.CSP), 'CSP: niente riquadri da altri siti');
assert.ok(!/socket|fetch\([^)]*method: 'POST'/.test(js), 'la fotocamera non manda niente al server');

console.log('✓ Fotocamera magica: dito alzato, 67 (pronto), lingua, bocca aperta, arrabbiato (anche con gli occhiali), occhiolino, occhi socchiusi, triste; permessi e file');
