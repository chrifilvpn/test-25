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

// mano sulla bocca
const bocca = { x: 0.5, y: 0.55, larghezza: 0.3 };
assert.ok(G.manoSullaBocca(mano(0.5, 0.68, [1, 2, 3, 4]), bocca), 'dita sulla bocca: sì');
assert.ok(!G.manoSullaBocca(mano(0.15, 0.9, [1]), bocca), 'mano lontana: no');

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

// lingua fuori: rosso sotto il labbro, guance color pelle
const W = 40, H = 40;
function viso(lingua) {
  const px = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) px.set([205, 160, 140, 255], i * 4); // pelle
  if (lingua) for (let y = 23; y <= 27; y++) for (let x = 17; x <= 23; x++) px.set([215, 70, 95, 255], (y * W + x) * 4);
  const k = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  k[61] = { x: 0.35, y: 0.55 }; k[291] = { x: 0.65, y: 0.55 }; k[17] = { x: 0.5, y: 0.55 }; k[152] = { x: 0.5, y: 0.8 };
  k[205] = { x: 0.3, y: 0.45 }; k[425] = { x: 0.7, y: 0.45 };
  return [px, W, H, k];
}
assert.ok(G.linguaFuori(...viso(true), {}), 'lingua rossa sotto il labbro: sì');
assert.ok(!G.linguaFuori(...viso(false), {}), 'solo pelle: no');
assert.ok(G.linguaFuori(null, 0, 0, null, { tongueOut: 0.6 }), 'se MediaPipe vede la lingua basta quello');

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
assert.ok(!/https?:\/\//.test(js), 'la fotocamera non scarica niente da fuori');
assert.ok(!/socket|fetch\([^)]*method: 'POST'/.test(js), 'la fotocamera non manda niente al server');

console.log('✓ Fotocamera magica: dito alzato, 67, fermo, mano sulla bocca, lingua, bocca aperta, occhiolino, occhi socchiusi, triste; permessi e file');
