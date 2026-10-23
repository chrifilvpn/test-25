// ALIEN: ISOLATION 3D — le texture della Sevastopol disegnate a codice (niente immagini): pannelli beige anni '70,
// corridoi a costole di metallo, piastrelle della Medicina, lamiere arrugginite dell'Ingegneria, pavimenti a griglia,
// porte blindate con le strisce gialle e nere, armadietti con le feritoie, schermi a tubo catodico verdi, casse.
import * as THREE from '/js/three.module.min.js';

const S = 512;
function tela(w = S, h = S) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
// numeri a caso sempre uguali (le texture escono identiche per tutti)
function fortuna(seme) { let s = seme >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// sporco: macchie, colature e graffi
function sporco(g, w, h, r, forza = 1) {
  for (let i = 0; i < 260 * forza; i++) {
    const x = r() * w, y = r() * h, rr = 4 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, `rgba(20,16,10,${0.05 + r() * 0.08})`); gr.addColorStop(1, 'rgba(20,16,10,0)');
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.strokeStyle = 'rgba(15,12,8,.18)';
  for (let i = 0; i < 40 * forza; i++) { const x = r() * w, y = r() * h * 0.6; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 20 + r() * 120); g.stroke(); }
  g.strokeStyle = 'rgba(255,250,235,.08)';
  for (let i = 0; i < 70 * forza; i++) { const x = r() * w, y = r() * h; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 12); g.stroke(); }
  // sporco in basso
  const gb = g.createLinearGradient(0, h * 0.75, 0, h); gb.addColorStop(0, 'rgba(25,20,12,0)'); gb.addColorStop(1, 'rgba(25,20,12,.45)');
  g.fillStyle = gb; g.fillRect(0, 0, w, h);
}
function rumore(g, w, h, r, a = 0.06) {
  const d = g.getImageData(0, 0, w, h), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (r() - 0.5) * 255 * a; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function rivetti(g, x0, y0, x1, y1, passo, r) {
  for (let x = x0; x <= x1; x += passo) for (const y of [y0, y1]) {
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + 1, y + 1, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,240,.35)'; g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill();
  }
}
function strisce(g, x, y, w, h, larga = 22) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#d7a21c'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1b1a17';
  for (let k = -h; k < w + h; k += larga * 2) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + larga, y + h); g.lineTo(x + k + larga + h, y); g.lineTo(x + k + h, y); g.closePath(); g.fill(); }
  g.restore();
}
function scritta(g, testo, x, y, size, colore = 'rgba(30,26,20,.75)') { g.font = `700 ${size}px "Arial Narrow", Arial, sans-serif`; g.fillStyle = colore; g.fillText(testo, x, y); }

// ---------- muri ----------
const MURI = {
  // atrio, uffici, alloggi: i pannelli beige con la fascia scura, le prese d'aria e le targhette
  beige(r) {
    const [c, g] = tela();
    g.fillStyle = '#b5aa93'; g.fillRect(0, 0, S, S);
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(255,255,240,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // fascia scura e zoccolo
    g.fillStyle = '#6b5f4c'; g.fillRect(0, S * 0.56, S, S * 0.08);
    g.fillStyle = '#4a4236'; g.fillRect(0, S * 0.9, S, S * 0.1);
    // fughe dei pannelli
    g.strokeStyle = 'rgba(40,34,26,.75)'; g.lineWidth = 4;
    for (const x of [0, S / 2, S]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    for (const y of [S * 0.18, S * 0.56, S * 0.64, S * 0.9]) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,250,235,.25)'; g.lineWidth = 2;
    for (const x of [3, S / 2 + 3]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    // presa d'aria a feritoie
    g.fillStyle = '#3a342b'; g.fillRect(S * 0.6, S * 0.24, S * 0.28, S * 0.22);
    g.fillStyle = '#857a66'; for (let y = S * 0.25; y < S * 0.45; y += 9) g.fillRect(S * 0.61, y, S * 0.26, 4);
    // targhette
    g.fillStyle = '#d9d0bb'; g.fillRect(S * 0.08, S * 0.26, 110, 34); g.strokeStyle = '#4a4236'; g.lineWidth = 2; g.strokeRect(S * 0.08, S * 0.26, 110, 34);
    scritta(g, 'SEVASTOPOL', S * 0.08 + 8, S * 0.26 + 15, 13); scritta(g, `SEZ. ${Math.floor(r() * 90 + 10)}-${'ABCDEFG'[Math.floor(r() * 7)]}`, S * 0.08 + 8, S * 0.26 + 29, 11);
    rivetti(g, 16, S * 0.2, S - 16, S * 0.54, 64, r);
    sporco(g, S, S, r); rumore(g, S, S, r);
    return c;
  },
  // corridoi: costole di metallo scuro, tubi, nastro giallo e nero in basso
  corridoio(r) {
    const [c, g] = tela();
    g.fillStyle = '#4b4f4a'; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 128) {
      const gr = g.createLinearGradient(x, 0, x + 64, 0); gr.addColorStop(0, '#2c2f2c'); gr.addColorStop(0.5, '#6b706a'); gr.addColorStop(1, '#2c2f2c');
      g.fillStyle = gr; g.fillRect(x, 0, 52, S);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 52, 0, 6, S);
    }
    // tubi orizzontali
    for (const [y, col] of [[S * 0.12, '#7d6a4a'], [S * 0.18, '#5d6a72'], [S * 0.7, '#6b5a40']]) {
      const gr = g.createLinearGradient(0, y - 9, 0, y + 9); gr.addColorStop(0, '#111'); gr.addColorStop(0.35, col); gr.addColorStop(0.6, '#ddd8c8'); gr.addColorStop(1, '#111');
      g.fillStyle = gr; g.fillRect(0, y - 9, S, 18);
    }
    g.fillStyle = '#d7d0be'; g.fillRect(S * 0.3, S * 0.33, 120, 26); scritta(g, 'MANUTENZIONE C-2', S * 0.3 + 6, S * 0.33 + 18, 13);
    strisce(g, 0, S * 0.88, S, S * 0.06, 18);
    g.fillStyle = '#26241f'; g.fillRect(0, S * 0.94, S, S * 0.06);
    sporco(g, S, S, r, 1.3); rumore(g, S, S, r, 0.08);
    return c;
  },
  // Medicina: piastrelle chiare con la riga verde
  medico(r) {
    const [c, g] = tela();
    g.fillStyle = '#c9cbc2'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(70,80,70,.45)'; g.lineWidth = 2;
    for (let x = 0; x <= S; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    for (let y = 0; y <= S; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    g.fillStyle = '#3f7a5c'; g.fillRect(0, S * 0.55, S, 22); g.fillStyle = '#2a4f3c'; g.fillRect(0, S * 0.55 + 22, S, 5);
    g.fillStyle = '#a42a24'; g.fillRect(S * 0.72, S * 0.2, 54, 54); g.fillStyle = '#e8e4da'; g.fillRect(S * 0.72 + 21, S * 0.2 + 6, 12, 42); g.fillRect(S * 0.72 + 6, S * 0.2 + 21, 42, 12);
    scritta(g, 'SAN CRISTOBAL', S * 0.08, S * 0.3, 22, 'rgba(40,60,50,.8)'); scritta(g, 'MEDICAL FACILITY', S * 0.08, S * 0.3 + 20, 13, 'rgba(40,60,50,.7)');
    sporco(g, S, S, r, 1.2); rumore(g, S, S, r, 0.05);
    // macchie di sangue secco
    for (let i = 0; i < 3; i++) { const x = r() * S, y = S * 0.6 + r() * S * 0.3; g.fillStyle = 'rgba(70,10,8,.35)'; g.beginPath(); g.ellipse(x, y, 10 + r() * 20, 6 + r() * 10, r(), 0, Math.PI * 2); g.fill(); g.fillRect(x - 2, y, 4, 30 + r() * 60); }
    return c;
  },
  // Ingegneria e manutenzione: lamiere scure, ruggine, strisce di pericolo
  industriale(r) {
    const [c, g] = tela();
    g.fillStyle = '#3c3a35'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 128) for (let x = (y / 128) % 2 ? -64 : 0; x < S; x += 128) {
      g.fillStyle = `rgb(${55 + r() * 15},${52 + r() * 12},${46 + r() * 10})`; g.fillRect(x + 3, y + 3, 122, 122);
      rivetti(g, x + 12, y + 12, x + 116, y + 116, 26, r);
    }
    for (let i = 0; i < 30; i++) { const x = r() * S, y = r() * S, rr = 8 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,58,20,.45)'); gr.addColorStop(1, 'rgba(120,58,20,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    strisce(g, 0, S * 0.08, S, S * 0.05, 16);
    g.fillStyle = '#c9c1a8'; g.fillRect(S * 0.55, S * 0.4, 150, 30); scritta(g, '⚠ ALTA TENSIONE', S * 0.55 + 6, S * 0.4 + 21, 15, '#8a1c12');
    sporco(g, S, S, r, 1.5); rumore(g, S, S, r, 0.09);
    return c;
  },
  // Comunicazioni: pannelli grigi chiari con le luci di stato
  comunicazioni(r) {
    const [c, g] = tela();
    g.fillStyle = '#9aa0a0'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(30,36,38,.7)'; g.lineWidth = 4;
    for (let x = 0; x <= S; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    g.beginPath(); g.moveTo(0, S * 0.5); g.lineTo(S, S * 0.5); g.stroke();
    for (let x = 20; x < S; x += 128) { g.fillStyle = '#23292a'; g.fillRect(x, S * 0.2, 88, 60); for (let k = 0; k < 6; k++) { g.fillStyle = r() < 0.5 ? '#46d36a' : r() < 0.5 ? '#e0a92c' : '#c23a2a'; g.fillRect(x + 8 + k * 13, S * 0.2 + 10, 7, 7); } g.fillStyle = '#5b6466'; for (let k = 0; k < 4; k++) g.fillRect(x + 8, S * 0.2 + 26 + k * 8, 72, 3); }
    scritta(g, 'TORRE SOLOMONS · COMUNICAZIONI', 20, S * 0.46, 15, 'rgba(25,30,32,.8)');
    g.fillStyle = '#2f3537'; g.fillRect(0, S * 0.9, S, S * 0.1);
    sporco(g, S, S, r, 0.9); rumore(g, S, S, r, 0.05);
    return c;
  },
};

// ---------- pavimenti e soffitti ----------
function pavimento(tipo, r) {
  const [c, g] = tela();
  if (tipo === 'griglia') {
    g.fillStyle = '#2b2a27'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 16) { g.fillStyle = '#4a4842'; g.fillRect(x + 2, y + 2, 12, 12); g.fillStyle = '#121110'; g.fillRect(x + 5, y + 5, 6, 6); }
    g.strokeStyle = '#1a1917'; g.lineWidth = 6; g.strokeRect(0, 0, S, S); g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
  } else if (tipo === 'moquette') {
    g.fillStyle = '#4e3f30'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) { g.fillStyle = (x + y) % 64 ? '#574636' : '#46382b'; g.fillRect(x, y, 32, 32); }
    rumore(g, S, S, r, 0.12);
  } else if (tipo === 'piastrelle') {
    g.fillStyle = '#9fa39b'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#5d625a'; g.lineWidth = 3;
    for (let k = 0; k <= S; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
  } else {
    // lamiera a rombi
    g.fillStyle = '#45433e'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < S; x += 24) { g.fillStyle = 'rgba(200,195,180,.18)'; g.save(); g.translate(x + 6, y + 6); g.rotate(0.8); g.fillRect(-7, -2, 14, 4); g.restore(); }
    g.strokeStyle = '#25231f'; g.lineWidth = 5; g.strokeRect(0, 0, S, S);
  }
  sporco(g, S, S, r, 0.8); rumore(g, S, S, r, 0.06);
  return c;
}
function soffitto(r) {
  const [c, g] = tela();
  g.fillStyle = '#26272a'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#121214'; g.lineWidth = 10; g.strokeRect(0, 0, S, S);
  for (let k = 64; k < S; k += 128) { g.fillStyle = '#1a1b1d'; g.fillRect(k - 8, 0, 16, S); }
  g.fillStyle = '#3a3b3e'; for (let y = 40; y < S; y += 80) g.fillRect(30, y, S - 60, 6);
  rumore(g, S, S, r, 0.07);
  return c;
}
function porta(r) {
  const [c, g] = tela();
  g.fillStyle = '#5c5f5d'; g.fillRect(0, 0, S, S);
  const gr = g.createLinearGradient(0, 0, S, 0); gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(0.5, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  strisce(g, 0, S * 0.44, S, S * 0.12, 30);
  g.fillStyle = '#3d403e'; g.fillRect(S * 0.1, S * 0.1, S * 0.8, S * 0.28); g.fillRect(S * 0.1, S * 0.62, S * 0.8, S * 0.28);
  g.fillStyle = '#6c706c'; g.fillRect(S * 0.12, S * 0.12, S * 0.76, S * 0.24); g.fillRect(S * 0.12, S * 0.64, S * 0.76, S * 0.24);
  rivetti(g, S * 0.15, S * 0.15, S * 0.85, S * 0.33, 40, r); rivetti(g, S * 0.15, S * 0.67, S * 0.85, S * 0.85, 40, r);
  scritta(g, 'SEVASTOPOL', S * 0.3, S * 0.27, 34, 'rgba(25,25,22,.75)');
  sporco(g, S, S, r, 1); rumore(g, S, S, r, 0.06);
  return c;
}
function armadietto(r) {
  const [c, g] = tela(256, 512);
  g.fillStyle = '#56606a'; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = '#2b3036'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 496);
  g.fillStyle = '#1b1f23'; for (let y = 40; y < 120; y += 12) g.fillRect(48, y, 160, 6);
  for (let y = 380; y < 460; y += 12) g.fillRect(48, y, 160, 6);
  g.fillStyle = '#a7aeb3'; g.fillRect(200, 230, 18, 60);
  g.fillStyle = '#d9d2be'; g.fillRect(60, 150, 90, 22); scritta(g, `N. ${Math.floor(r() * 400 + 100)}`, 66, 167, 15);
  sporco(g, 256, 512, r, 0.6); rumore(g, 256, 512, r, 0.06);
  return c;
}
function schermo(testo, r) {
  const [c, g] = tela(256, 192);
  g.fillStyle = '#061409'; g.fillRect(0, 0, 256, 192);
  g.font = '700 13px "Courier New", monospace'; g.fillStyle = '#5dff86'; g.shadowColor = '#3cff70'; g.shadowBlur = 6;
  const righe = testo.split('\n');
  righe.forEach((t, i) => g.fillText(t, 12, 24 + i * 17));
  g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 192; y += 3) g.fillRect(0, y, 256, 1);
  const gr = g.createRadialGradient(128, 96, 40, 128, 96, 160); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  return c;
}
function cassa(r) {
  const [c, g] = tela(256, 256);
  g.fillStyle = '#4f5238'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#2c2e1f'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246); g.beginPath(); g.moveTo(5, 5); g.lineTo(251, 251); g.stroke();
  g.fillStyle = 'rgba(230,220,190,.75)'; g.font = '700 26px Arial'; g.fillText('SEEGSON', 60, 120); g.font = '700 14px Arial'; g.fillText('MATERIALE · FRAGILE', 58, 142);
  sporco(g, 256, 256, r, 0.5); rumore(g, 256, 256, r, 0.08);
  return c;
}
function generatore(r) {
  const [c, g] = tela(256, 512);
  g.fillStyle = '#4a4740'; g.fillRect(0, 0, 256, 512);
  strisce(g, 0, 0, 256, 40, 20); strisce(g, 0, 472, 256, 40, 20);
  g.fillStyle = '#2c2a26'; g.fillRect(30, 80, 196, 170);
  for (let y = 90; y < 240; y += 14) { g.fillStyle = '#6a665c'; g.fillRect(40, y, 176, 6); }
  g.fillStyle = '#c8bfa4'; g.fillRect(40, 280, 176, 40); scritta(g, 'GENERATORE', 52, 306, 22, '#2b2418');
  g.fillStyle = '#20201d'; g.fillRect(60, 350, 136, 90);
  rivetti(g, 20, 60, 236, 460, 54, r);
  sporco(g, 256, 512, r, 0.8); rumore(g, 256, 512, r, 0.07);
  return c;
}

// le texture pronte per three.js (con la stessa immagine come rilievo)
function tex(c, rip = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rip, rip);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function bump(c) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
export function crea() {
  const r = fortuna(1979);
  const out = { muri: {}, pavimenti: {} };
  for (const [k, f] of Object.entries(MURI)) { const c = f(r); out.muri[k] = { map: tex(c), bump: bump(c) }; }
  for (const k of ['griglia', 'moquette', 'piastrelle', 'lamiera']) { const c = pavimento(k, r); out.pavimenti[k] = { map: tex(c), bump: bump(c) }; }
  const cs = soffitto(r); out.soffitto = { map: tex(cs), bump: bump(cs) };
  const cp = porta(r); out.porta = { map: tex(cp), bump: bump(cp) };
  const ca = armadietto(r); out.armadietto = { map: tex(ca), bump: bump(ca) };
  const cc = cassa(r); out.cassa = { map: tex(cc), bump: bump(cc) };
  const cg = generatore(r); out.generatore = { map: tex(cg), bump: bump(cg) };
  out.schermi = [
    'SEEGSON SYSTEMS\n> APOLLO: CONNESSO\n> STAZIONE SEVASTOPOL\n> STATO: EMERGENZA\n> ENERGIA: 31%\n> _',
    'SEEGSON\n> REGISTRO EQUIPAGGIO\n> 1.118 PERSONE\n> ...NESSUNA RISPOSTA\n> RIPROVA? S/N\n> _',
    'WEYLAND-YUTANI\n> NOSTROMO 180924609\n> SCATOLA NERA\n> RECUPERATA\n> TORRENS IN ATTESA\n> _',
    'MARSHAL WAITS:\n> RESTARE IN CASA\n> CHIUDERE LE PORTE\n> NON USARE I\n> CONDOTTI\n> _',
  ].map((t) => tex(schermo(t, r)));
  return out;
}
