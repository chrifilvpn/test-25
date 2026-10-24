// ALIEN: ISOLATION 3D — il motore 3D (three.js): costruisce il settore della Sevastopol dalla mappa (la stessa del
// server), con le luci "cotte" nei vertici (lampade calde nelle stanze, rosse d'emergenza nei corridoi, che cambiano
// quando si riaccende un generatore), la torcia vera con le ombre, la nebbia, le porte blindate che scorrono, gli
// armadietti, le scrivanie, i terminali a tubo catodico, le casse, i generatori, le grate dei condotti, gli oggetti da
// raccogliere, l'attracco del Torrens, gli altri sopravvissuti e lo xenomorfo. Il resto (comandi, schermo, suoni) è in
// public/js/giochi3/isolation.js. Unità: il mondo del server è in decimetri, qui si lavora in metri.
import * as THREE from '/js/three.module.min.js';
import * as TX from '/js/isolation/texture.js';
import { carica as caricaXeno } from '/js/isolation/xenomorfo.js';

const D = 0.1; // decimetri → metri
const COLORI_GIOCATORI = [0xb4532a, 0x2f6f9f, 0x4f7d3a, 0xa8892c, 0x7a4f9a, 0xa04a6a, 0x2c8a8a, 0x8a5a2c];
const STILE_MURO = { atrio: 'beige', uffici: 'beige', alloggi: 'beige', attracco: 'comunicazioni', medico: 'medico', ingegneria: 'industriale', manutenzione: 'industriale', comunicazioni: 'comunicazioni' };
const STILE_PAV = { atrio: 'lamiera', uffici: 'moquette', alloggi: 'moquette', attracco: 'lamiera', medico: 'piastrelle', ingegneria: 'griglia', manutenzione: 'griglia', comunicazioni: 'lamiera' };
const LAMPADE = {
  atrio: [[1, 0.84, 0.62], 1.25], uffici: [[1, 0.87, 0.68], 1.05], alloggi: [[1, 0.78, 0.55], 0.9], attracco: [[0.82, 0.9, 1], 1.2],
  medico: [[0.8, 0.96, 0.9], 0.95], ingegneria: [[1, 0.6, 0.26], 0.9], manutenzione: [[1, 0.55, 0.3], 0.4], comunicazioni: [[0.74, 0.9, 1], 1.0],
};

// i materiali delle superfici fisse: la luce cotta nei vertici si aggiunge come "emissione" (così la torcia vera si
// somma sopra e non viene oscurata)
function conLuceCotta(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 cotta;\nvarying vec3 vCotta;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCotta = cotta;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCotta;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vCotta;');
  };
  return mat;
}

// raccoglie quadrilateri (divisi in una piccola griglia, per la luce cotta) in un'unica geometria per materiale
class Pezzi {
  constructor() { this.p = []; this.n = []; this.uv = []; this.i = []; }
  // p0 + du·u + dv·v (u, v da 0 a 1), normale n, ripetizione della texture (ru, rv), suddivisioni (su, sv)
  quad(p0, du, dv, n, ru = 1, rv = 1, su = 2, sv = 2, uv0 = [0, 0]) {
    const base = this.p.length / 3;
    for (let b = 0; b <= sv; b++) for (let a = 0; a <= su; a++) {
      const u = a / su, v = b / sv;
      this.p.push(p0[0] + du[0] * u + dv[0] * v, p0[1] + du[1] * u + dv[1] * v, p0[2] + du[2] * u + dv[2] * v);
      this.n.push(...n); this.uv.push(uv0[0] + u * ru, uv0[1] + v * rv);
    }
    const cr = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const dritto = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0;
    for (let b = 0; b < sv; b++) for (let a = 0; a < su; a++) {
      const i0 = base + b * (su + 1) + a, i1 = i0 + 1, i2 = i0 + su + 1, i3 = i2 + 1;
      if (dritto) this.i.push(i0, i1, i2, i2, i1, i3); else this.i.push(i0, i2, i1, i2, i3, i1);
    }
  }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('cotta', new THREE.Float32BufferAttribute(new Float32Array(this.p.length), 3));
    g.setIndex(this.i);
    return g;
  }
}

export async function crea({ M }) {
  const T = M.T * D, H = M.SOFFITTO * D;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0x020203);
  scena.fog = new THREE.FogExp2(0x030405, 0.085);
  const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 80);
  camera.rotation.order = 'YXZ';
  scena.add(camera);
  const tex = TX.crea();

  // ---------- l'ambiente riflesso (per la pelle lucida dello xenomorfo) ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScena = new THREE.Scene();
  envScena.background = new THREE.Color(0x050506);
  const pannello = (c, x, y, z, w, h, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = y > 2 ? Math.PI / 2 : 0; envScena.add(m); };
  pannello(0xffe6c8, 0, 4, 0, 3, 1); pannello(0xff3020, 4, 1, 0, 2, 1, Math.PI / 2); pannello(0x9fc8ff, -4, 1.5, 1, 1.5, 2, Math.PI / 2); pannello(0x403830, 0, 1, -4, 6, 1);
  const envMap = pmrem.fromScene(envScena, 0.035).texture;

  // ---------- il settore ----------
  const g = M.griglia, Z = M.zona;
  const stile = (tx, ty) => { const z = Z[ty] && Z[ty][tx]; return z >= 0 ? M.STANZE[z].stile : 'corridoio'; };
  const pezziMuro = {}, pezziPav = {}, pezzoSoff = new Pezzi();
  const muro = (k) => (pezziMuro[k] = pezziMuro[k] || new Pezzi());
  const pav = (k) => (pezziPav[k] = pezziPav[k] || new Pezzi());
  const vuota = (c) => c !== '#';
  for (let ty = 0; ty < M.RIGHE; ty++) for (let tx = 0; tx < M.COLS; tx++) {
    if (!vuota(g[ty][tx])) continue;
    const st = stile(tx, ty), x0 = tx * T, z0 = ty * T;
    const corr = st === 'corridoio';
    // pavimento e soffitto (nei corridoi il soffitto è più basso)
    pav(corr ? 'griglia' : STILE_PAV[st]).quad([x0, 0, z0], [T, 0, 0], [0, 0, T], [0, 1, 0], 1, 1, 2, 2);
    const hs = corr ? H - 0.4 : H;
    pezzoSoff.quad([x0, hs, z0], [T, 0, 0], [0, 0, T], [0, -1, 0], 1, 1, 2, 2);
    // i muri verso i quadretti pieni
    const km = corr ? 'corridoio' : STILE_MURO[st];
    if (!vuota(M.cella(tx + 1, ty))) muro(km).quad([x0 + T, 0, z0 + T], [0, 0, -T], [0, hs, 0], [-1, 0, 0], 1, 1, 2, 3, [tx * 0.5, 0]);
    if (!vuota(M.cella(tx - 1, ty))) muro(km).quad([x0, 0, z0], [0, 0, T], [0, hs, 0], [1, 0, 0], 1, 1, 2, 3, [ty * 0.5, 0]);
    if (!vuota(M.cella(tx, ty + 1))) muro(km).quad([x0, 0, z0 + T], [T, 0, 0], [0, hs, 0], [0, 0, -1], 1, 1, 2, 3, [tx * 0.5, 0]);
    if (!vuota(M.cella(tx, ty - 1))) muro(km).quad([x0 + T, 0, z0], [-T, 0, 0], [0, hs, 0], [0, 0, 1], 1, 1, 2, 3, [tx * 0.5, 0]);
    // dove il corridoio (più basso) entra in una stanza: la fascia di muro sopra
    if (corr) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (!vuota(M.cella(nx, ny)) || stile(nx, ny) === 'corridoio') continue;
      const bordoX = dx > 0 ? x0 + T : x0, bordoZ = dy > 0 ? z0 + T : z0;
      if (dx) muro('beige').quad([bordoX, hs, dx > 0 ? z0 + T : z0], [0, 0, dx > 0 ? -T : T], [0, H - hs, 0], [-dx, 0, 0], 1, 0.15, 1, 1);
      else muro('beige').quad([dy > 0 ? x0 : x0 + T, hs, bordoZ], [dy > 0 ? T : -T, 0, 0], [0, H - hs, 0], [0, 0, -dy], 1, 0.15, 1, 1);
    }
  }
  const statiche = [];
  const matMuro = {}, matPav = {};
  for (const [k, P] of Object.entries(pezziMuro)) {
    const t = tex.muri[k];
    matMuro[k] = conLuceCotta(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: k === 'medico' ? 0.55 : 0.75, metalness: k === 'corridoio' || k === 'industriale' ? 0.45 : 0.1 }));
    const m = new THREE.Mesh(P.geometria(), matMuro[k]); m.receiveShadow = true; scena.add(m); statiche.push(m);
  }
  for (const [k, P] of Object.entries(pezziPav)) {
    const t = tex.pavimenti[k];
    matPav[k] = conLuceCotta(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.5, roughness: k === 'moquette' ? 0.95 : 0.6, metalness: k === 'moquette' ? 0 : 0.35 }));
    const m = new THREE.Mesh(P.geometria(), matPav[k]); m.receiveShadow = true; scena.add(m); statiche.push(m);
  }
  {
    const m = new THREE.Mesh(pezzoSoff.geometria(), conLuceCotta(new THREE.MeshStandardMaterial({ map: tex.soffitto.map, bumpMap: tex.soffitto.bump, roughness: 0.8, metalness: 0.3 })));
    scena.add(m); statiche.push(m);
  }

  // ---------- le lampade (luce cotta) ----------
  const lampade = [];
  const genStanza = M.OGGETTI.G.map(([x, y]) => Z[y][x]);
  M.STANZE.forEach((s, i) => {
    const [col, I] = LAMPADE[s.stile];
    for (let ty = s.y0; ty <= s.y1; ty++) for (let tx = s.x0; tx <= s.x1; tx++) {
      if ((tx - s.x0) % 3 !== 1 || (ty - s.y0) % 3 !== 1) continue;
      lampade.push({ x: (tx + 0.5) * T, z: (ty + 0.5) * T, y: H - 0.12, col, I, gen: genStanza.indexOf(i), stanza: i });
    }
  });
  for (let ty = 0; ty < M.RIGHE; ty++) for (let tx = 0; tx < M.COLS; tx++) {
    if (!vuota(g[ty][tx]) || stile(tx, ty) !== 'corridoio' || (tx * 3 + ty * 5) % 7 !== 0) continue;
    lampade.push({ x: (tx + 0.5) * T, z: (ty + 0.5) * T, y: H - 0.55, col: [1, 0.1, 0.05], I: 1.0, gen: -1, rossa: true });
  }
  // i corpi delle lampade: pannelli luminosi (bianchi o rossi)
  const matLampada = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const geoPannello = new THREE.BoxGeometry(1.1, 0.06, 0.35), geoRossa = new THREE.BoxGeometry(0.22, 0.12, 0.22);
  for (const l of lampade) {
    const m = new THREE.Mesh(l.rossa ? geoRossa : geoPannello, matLampada.clone());
    m.position.set(l.x, l.y + 0.06, l.z);
    l.mesh = m; scena.add(m);
  }
  const intensita = (l, accesi) => (l.gen >= 0 && !accesi[l.gen] ? 0.22 : 1) * l.I;
  // luce nei vertici: somma delle lampade vicine che "vedono" il punto (la mappa dice dove sono i muri)
  function cuoci(accesi) {
    for (const l of lampade) {
      const k = intensita(l, accesi), sp = l.gen >= 0 && !accesi[l.gen];
      l.colAtt = sp ? [1, 0.25, 0.15] : l.col; l.kAtt = k;
      l.mesh.material.color.setRGB(l.colAtt[0] * Math.min(1.5, k * 1.4), l.colAtt[1] * Math.min(1.5, k * 1.4), l.colAtt[2] * Math.min(1.5, k * 1.4));
    }
    const cella = 3; // griglia per cercare le lampade vicine
    const buche = new Map();
    for (const l of lampade) { const k = `${Math.floor(l.x / cella)},${Math.floor(l.z / cella)}`; if (!buche.has(k)) buche.set(k, []); buche.get(k).push(l); }
    for (const m of statiche) {
      const P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array, C = m.geometry.attributes.cotta;
      const out = C.array;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2], nx = N[i], ny = N[i + 1], nz = N[i + 2];
        let r = 0.018, gg = 0.02, b = 0.026; // un filo di luce ovunque
        const qx = x + nx * 0.25, qz = z + nz * 0.25;
        const cx = Math.floor(qx / cella), cz = Math.floor(qz / cella);
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
          const lista = buche.get(`${cx + dx},${cz + dz}`); if (!lista) continue;
          for (const l of lista) {
            const lx = l.x - x, ly = l.y - y, lz = l.z - z, d2 = lx * lx + ly * ly + lz * lz;
            if (d2 > 90) continue;
            const d = Math.sqrt(d2), dot = (lx * nx + ly * ny + lz * nz) / d;
            if (dot < -0.1) continue;
            if (!M.vede({ x: l.x / D, y: l.z / D }, { x: qx / D, y: qz / D }, null)) continue;
            const k = l.kAtt * (0.25 + 0.75 * Math.max(0, dot)) * (l.rossa ? 1.6 : 2.4) / (1 + d2 * 0.55);
            r += l.colAtt[0] * k; gg += l.colAtt[1] * k; b += l.colAtt[2] * k;
          }
        }
        out[i] = r; out[i + 1] = gg; out[i + 2] = b;
      }
      C.needsUpdate = true;
    }
  }

  // ---------- porte blindate ----------
  const matPorta = new THREE.MeshStandardMaterial({ map: tex.porta.map, bumpMap: tex.porta.bump, roughness: 0.55, metalness: 0.6 });
  const matTelaio = new THREE.MeshStandardMaterial({ color: 0x2b2d2c, roughness: 0.6, metalness: 0.7 });
  const porte = M.PORTE.map((p) => {
    const gr = new THREE.Group();
    const cx = (p.x + 0.5) * T, cz = (p.y + 0.5) * T;
    gr.position.set(cx, 0, cz);
    if (p.asse === 'x') gr.rotation.y = Math.PI / 2; // la porta guarda lungo x
    const hp = H - 0.6;
    const meta = [-1, 1].map((sg) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(T / 2, hp, 0.28), matPorta);
      m.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = sg < 0 ? v * 0.5 : 0.5 + v * 0.5; });
      m.position.set(sg * T / 4, hp / 2, 0); m.castShadow = true; m.receiveShadow = true; gr.add(m);
      return m;
    });
    // telaio e luce di stato
    for (const sg of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.22, H, 0.5), matTelaio); st.position.set(sg * (T / 2 - 0.11), H / 2, 0); gr.add(st); }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(T, 0.6, 0.5), matTelaio); arch.position.set(0, H - 0.3, 0); gr.add(arch);
    const luce = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.52), new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false }));
    luce.position.set(0, H - 0.5, 0); gr.add(luce);
    scena.add(gr);
    return { gr, meta, luce, a: 0 };
  });

  // ---------- arredi ----------
  const centro = ([x, y]) => [(x + 0.5) * T, (y + 0.5) * T];
  const fronte = ([x, y]) => M.verso[`${x},${y}`] || [0, 1];
  const ruota = (obj, [fx, fy]) => { obj.rotation.y = Math.atan2(fx, fy); };
  const aggiungi = (m, ombra = true) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = ombra; o.receiveShadow = true; } }); scena.add(m); return m; };
  const matArm = new THREE.MeshStandardMaterial({ map: tex.armadietto.map, bumpMap: tex.armadietto.bump, roughness: 0.5, metalness: 0.65 });
  const matGrigio = new THREE.MeshStandardMaterial({ color: 0x4b5258, roughness: 0.55, metalness: 0.6 });
  const matBeige = new THREE.MeshStandardMaterial({ color: 0x9c9077, roughness: 0.7, metalness: 0.15 });
  const matScuro = new THREE.MeshStandardMaterial({ color: 0x1e1f21, roughness: 0.6, metalness: 0.5 });
  const matLetto = new THREE.MeshStandardMaterial({ color: 0xb8b9ae, roughness: 0.9 });
  const armadietti = [];
  for (const t of M.OGGETTI.L) {
    const gr = new THREE.Group(); const [cx, cz] = centro(t), f = fronte(t);
    gr.position.set(cx - f[0] * (T / 2 - 0.4), 0, cz - f[1] * (T / 2 - 0.4)); ruota(gr, f);
    for (const sx of [-0.6, 0.6]) {
      const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.2, 0.78), [matGrigio, matGrigio, matGrigio, matGrigio, matArm, matGrigio]);
      corpo.position.set(sx, 1.1, 0); gr.add(corpo);
    }
    armadietti.push(aggiungi(gr));
  }
  for (const t of M.OGGETTI.T) {
    const gr = new THREE.Group(); const [cx, cz] = centro(t);
    gr.position.set(cx, 0, cz);
    const st = stile(...t);
    if (st === 'medico') {
      // letto d'ospedale
      const rete = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 1.0), matGrigio); rete.position.y = 0.72; gr.add(rete);
      const mat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.92), matLetto); mat.position.y = 0.84; gr.add(mat);
      for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) { const g2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72), matGrigio); g2.position.set(x, 0.36, z); gr.add(g2); }
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.95), matGrigio); sp.position.set(-1.04, 1.05, 0); gr.add(sp);
    } else {
      // scrivania beige anni '70 con il monitor
      const piano = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.15), matBeige); piano.position.y = 0.86; gr.add(piano);
      for (const x of [-1.05, 1.05]) { const fi = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.84, 1.05), matScuro); fi.position.set(x, 0.42, 0); gr.add(fi); }
      if ((t[0] + t[1]) % 2 === 0) {
        const mon = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), matBeige); mon.position.set(0.3, 1.13, -0.15); gr.add(mon);
        const sch = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshBasicMaterial({ map: tex.schermi[(t[0] * 7 + t[1]) % tex.schermi.length], toneMapped: false }));
        sch.position.set(0.3, 1.14, 0.106); gr.add(sch);
        const tast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.2), matScuro); tast.position.set(0.3, 0.92, 0.3); gr.add(tast);
      }
    }
    gr.rotation.y = ((t[0] * 13 + t[1] * 7) % 2) * 0.04 - 0.02;
    aggiungi(gr);
  }
  // terminali a muro con lo schermo verde
  const schermiLuce = [];
  M.OGGETTI.m.forEach((t, i) => {
    const gr = new THREE.Group(); const [cx, cz] = centro(t), f = fronte(t);
    gr.position.set(cx - f[0] * (T / 2 - 0.45), 0, cz - f[1] * (T / 2 - 0.45)); ruota(gr, f);
    const banco = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.9), matBeige); banco.position.y = 0.5; gr.add(banco);
    const crt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 0.65), matBeige); crt.position.set(0, 1.32, -0.05); crt.rotation.x = -0.12; gr.add(crt);
    const sch = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: tex.schermi[i % tex.schermi.length], toneMapped: false }));
    sch.position.set(0, 1.34, 0.29); sch.rotation.x = -0.12; gr.add(sch);
    const tast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.35), matScuro); tast.position.set(0, 1.03, 0.22); tast.rotation.x = 0.2; gr.add(tast);
    aggiungi(gr);
    schermiLuce.push({ x: gr.position.x + f[0] * 0.5, z: gr.position.z + f[1] * 0.5 });
  });
  const matCassa = new THREE.MeshStandardMaterial({ map: tex.cassa.map, bumpMap: tex.cassa.bump, roughness: 0.8, metalness: 0.2 });
  for (const t of M.OGGETTI.c) {
    const [cx, cz] = centro(t);
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.2, 1.45), matCassa); a.position.set(cx, 0.6, cz); a.rotation.y = (t[0] % 3) * 0.2; aggiungi(a);
    if ((t[0] + t[1]) % 2) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), matCassa); b.position.set(cx + 0.1, 1.6, cz - 0.1); b.rotation.y = 0.5; aggiungi(b); }
  }
  // generatori: la macchina con la luce di stato (rossa, gialla mentre si carica, verde accesa)
  const matGen = new THREE.MeshStandardMaterial({ map: tex.generatore.map, bumpMap: tex.generatore.bump, roughness: 0.6, metalness: 0.5 });
  const generatori = M.OGGETTI.G.map((t) => {
    const gr = new THREE.Group(); const [cx, cz] = centro(t);
    gr.position.set(cx, 0, cz);
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 1.6), matGen); corpo.position.y = 1.15; gr.add(corpo);
    for (const sx of [-0.55, 0.55]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.6, 14), matGrigio); c.position.set(sx, 1.3, -0.9); gr.add(c); }
    const tubo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 20, Math.PI), matScuro); tubo.position.set(0, 2.3, 0); tubo.rotation.y = Math.PI / 2; gr.add(tubo);
    const luce = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false }));
    luce.position.set(0, 2.42, 0.6); gr.add(luce);
    const barra = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0x40ff60, toneMapped: false }));
    barra.position.set(0, 1.9, 0.81); barra.scale.x = 0.001; gr.add(barra);
    aggiungi(gr);
    return { gr, luce, barra };
  });
  // grate dei condotti sul soffitto
  const matGrata = new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.5, metalness: 0.8 });
  const grate = M.OGGETTI.V.map((t) => {
    const [cx, cz] = centro(t); const corr = stile(...t) === 'corridoio';
    const gr = new THREE.Group(); gr.position.set(cx, (corr ? H - 0.4 : H) - 0.02, cz);
    const buco = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ color: 0x000000 })); buco.rotation.x = Math.PI / 2; buco.position.y = 0.01; gr.add(buco);
    for (let k = -0.55; k <= 0.56; k += 0.11) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.035), matGrata); s.position.set(0, -0.02, k); gr.add(s); }
    const cornice = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.05, 4, 4), matGrata); cornice.rotation.x = Math.PI / 2; cornice.rotation.z = Math.PI / 4; gr.add(cornice);
    scena.add(gr);
    return gr;
  });
  // oggetti da raccogliere: batterie, carburante, razzi (con una lucina che lampeggia)
  const oggetti = [];
  const fai = (tipo, t) => {
    const gr = new THREE.Group(); const [cx, cz] = centro(t);
    gr.position.set(cx, 0, cz);
    let m;
    if (tipo === 'b') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xd8b020, metalness: 0.6, roughness: 0.4 })); m.position.y = 0.11; }
    else if (tipo === 'f') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 14), new THREE.MeshStandardMaterial({ color: 0xa02018, metalness: 0.5, roughness: 0.45 })); m.position.y = 0.28; }
    else { m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0xc03020, roughness: 0.6 })); m.rotation.z = Math.PI / 2; m.position.y = 0.05; }
    gr.add(m);
    const spia = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: tipo === 'b' ? 0xffe060 : tipo === 'f' ? 0xff6040 : 0xff3030, toneMapped: false }));
    spia.position.y = tipo === 'f' ? 0.6 : 0.28; gr.add(spia);
    aggiungi(gr);
    oggetti.push({ gr, spia });
  };
  M.OGGETTI.b.forEach((t) => fai('b', t)); M.OGGETTI.f.forEach((t) => fai('f', t)); M.OGGETTI.r.forEach((t) => fai('r', t));
  // l'attracco del Torrens: il portellone rotondo sul muro a est, le strisce gialle a terra
  const torrens = new THREE.Group();
  {
    const xe = (M.COLS - 1) * T - 0.02, ze = (15.5 + 0.5) * T;
    torrens.position.set(xe, 1.6, ze);
    const anello = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 12, 40), matTelaio); anello.rotation.y = Math.PI / 2; torrens.add(anello);
    const disco = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), matPorta); disco.rotation.y = -Math.PI / 2; disco.position.x = 0.05; torrens.add(disco);
    const luci = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false })); l.position.set(-0.1, Math.sin(a) * 1.8, Math.cos(a) * 1.8); torrens.add(l); luci.push(l); }
    torrens.userData.luci = luci; torrens.userData.disco = disco;
    for (const [x, y] of M.OGGETTI.E) { const s = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.95, T * 0.95), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const q = c.getContext('2d'); q.fillStyle = '#1a1814'; q.fillRect(0, 0, 128, 128); q.fillStyle = '#c9a020'; for (let k = -128; k < 256; k += 32) { q.beginPath(); q.moveTo(k, 128); q.lineTo(k + 16, 128); q.lineTo(k + 144, 0); q.lineTo(k + 128, 0); q.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, opacity: 0.55 })); s.rotation.x = -Math.PI / 2; s.position.set((x + 0.5) * T, 0.01, (y + 0.5) * T); scena.add(s); }
    scena.add(torrens);
  }

  // ---------- luci dinamiche ----------
  const ambiente = new THREE.HemisphereLight(0x8090a0, 0x101010, 0.0); scena.add(ambiente);
  const torcia = new THREE.SpotLight(0xfff1dc, 0, 26, 0.5, 0.55, 1.6);
  torcia.castShadow = true; torcia.shadow.mapSize.set(1024, 1024); torcia.shadow.bias = -0.0015; torcia.shadow.camera.near = 0.2; torcia.shadow.camera.far = 26;
  camera.add(torcia); torcia.position.set(0.18, -0.15, 0.1); torcia.target.position.set(0.05, -0.05, -5); camera.add(torcia.target);
  const vicine = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 9, 2); scena.add(l); l.userData.k = 0; return l; });
  const torceAltri = Array.from({ length: 3 }, () => { const s = new THREE.SpotLight(0xfff1dc, 0, 20, 0.45, 0.6, 1.6); scena.add(s); scena.add(s.target); return s; });
  const fuochi = Array.from({ length: 3 }, () => { const l = new THREE.PointLight(0xff4020, 0, 12, 1.6); scena.add(l); return l; });

  // ---------- i personaggi ----------
  const omini = new Map();
  function omino(k) {
    const col = COLORI_GIOCATORI[k % COLORI_GIOCATORI.length];
    const tuta = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.05 });
    const pelle = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.7 });
    const capelli = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9 });
    const gr = new THREE.Group();
    const busto = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), tuta); busto.position.y = 1.18; gr.add(busto);
    const testa = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), pelle); testa.position.y = 1.62; gr.add(testa);
    const ciuffo = new THREE.Mesh(new THREE.SphereGeometry(0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), capelli); ciuffo.position.y = 1.64; ciuffo.rotation.x = -0.3; gr.add(ciuffo);
    const zaino = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.16), matGrigio); zaino.position.set(0, 1.22, -0.22); gr.add(zaino);
    const gambe = [-0.1, 0.1].map((x) => { const p = new THREE.Group(); p.position.set(x, 0.86, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.66, 4, 8), tuta); m.position.y = -0.42; p.add(m); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), matScuro); sc.position.set(0, -0.82, 0.05); p.add(sc); gr.add(p); return p; });
    const braccia = [-0.27, 0.27].map((x) => { const p = new THREE.Group(); p.position.set(x, 1.42, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.55, 4, 8), tuta); m.position.y = -0.3; p.add(m); gr.add(p); return p; });
    const lampada = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), matScuro); lampada.rotation.x = Math.PI / 2; lampada.position.set(0.27, 1.0, 0.25); gr.add(lampada);
    // il cono di luce della torcia (finto volume nella nebbia)
    const cono = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cono.rotation.x = -Math.PI / 2; cono.position.set(0.27, 1.0, 3.2); gr.add(cono);
    aggiungi(gr);
    return { gr, gambe, braccia, cono, busto, testa, ciuffo, fase: 0 };
  }

  // gli xenomorfi (nella survival possono essere più d'uno: gli altri si caricano quando servono)
  const xeno = await caricaXeno(envMap);
  scena.add(xeno.oggetto);
  const xenos = [xeno];
  let caricaAltro = null;
  function assicura(n) {
    if (xenos.length >= n || caricaAltro) return;
    caricaAltro = caricaXeno(envMap).then((x) => { scena.add(x.oggetto); xenos.push(x); }).catch(() => {}).finally(() => { caricaAltro = null; });
  }
  const luceXeno = new THREE.PointLight(0x9fb4ff, 0, 4, 2); scena.add(luceXeno); // un filo di riflesso quando è vicino
  // le botole dei passaggi di servizio, a terra
  const matBotola = new THREE.MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.6, metalness: 0.7 });
  for (const t of M.OGGETTI.P) {
    const [cx, cz] = centro(t);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.05, 20), matBotola); b.position.set(cx, 0.025, cz); aggiungi(b);
    for (const k of [-0.25, 0, 0.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.06), matScuro); r.position.set(cx, 0.06, cz + k); aggiungi(r); }
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false })); sp.position.set(cx + 0.45, 0.07, cz); aggiungi(sp);
  }
  // le fiamme del lanciafiamme: tante scintille additive
  const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d'); const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,150,40,.9)'); gr.addColorStop(1, 'rgba(255,40,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const NF = 400, fPos = new Float32Array(NF * 3), fVel = new Float32Array(NF * 3), fVita = new Float32Array(NF);
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fiamme = new THREE.Points(fGeo, new THREE.PointsMaterial({ map: sprite, size: 0.55, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
  fiamme.frustumCulled = false; scena.add(fiamme);
  let fProssima = 0;
  function emetti(x, y, z, dx, dz, n) {
    for (let k = 0; k < n; k++) {
      const i = fProssima; fProssima = (fProssima + 1) % NF;
      fPos[i * 3] = x; fPos[i * 3 + 1] = y; fPos[i * 3 + 2] = z;
      const v = 7 + Math.random() * 4;
      fVel[i * 3] = dx * v + (Math.random() - 0.5) * 1.6; fVel[i * 3 + 1] = (Math.random() - 0.3) * 1.2; fVel[i * 3 + 2] = dz * v + (Math.random() - 0.5) * 1.6;
      fVita[i] = 0.45 + Math.random() * 0.25;
    }
  }
  // i razzi di segnalazione a terra
  const razzi = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false })); m.rotation.z = Math.PI / 2; m.visible = false; scena.add(m); return m; });

  let accesiPrima = null, tempo = 0;
  const v3 = new THREE.Vector3();
  // ---------- un fotogramma ----------
  function disegna(V) {
    const dt = Math.min(0.1, V.dt || 0.016); tempo += dt;
    // la luce cotta cambia solo quando si riaccende un generatore
    const accesi = V.gen.map((x) => x >= 100);
    if (!accesiPrima || accesi.some((a, i) => a !== accesiPrima[i])) { cuoci(accesi); accesiPrima = accesi; }
    // lampade che sfarfallano (Medicina e le rosse)
    for (const l of lampade) if (l.stanza !== undefined && M.STANZE[l.stanza].stile === 'medico' && !(l.gen >= 0 && !accesi[l.gen])) l.mesh.visible = Math.sin(tempo * 23 + l.x) > -0.95 || Math.random() > 0.5;
    // porte
    M.PORTE.forEach((p, i) => {
      const v = V.porte[i] % 100, bloccata = V.porte[i] >= 100, P = porte[i];
      P.a += ((v / 10) - P.a) * Math.min(1, dt * 8);
      P.meta[0].position.x = -T / 4 - P.a * (T / 2 - 0.15); P.meta[1].position.x = T / 4 + P.a * (T / 2 - 0.15);
      P.luce.material.color.setHex(bloccata ? 0xff1a0a : P.a > 0.5 ? 0x30ff60 : 0xffa020);
    });
    // generatori
    V.gen.forEach((x, i) => {
      const G = generatori[i];
      G.luce.material.color.setHex(x >= 100 ? 0x30ff50 : x > 0 ? (Math.sin(tempo * 10) > 0 ? 0xffc020 : 0x553300) : 0xff2010);
      G.barra.scale.x = Math.max(0.001, Math.min(1, x / 100));
    });
    // oggetti raccolti
    oggetti.forEach((o, i) => { o.gr.visible = V.raccolti[i] !== '1'; o.spia.visible = Math.sin(tempo * 4 + i) > 0; });
    // il Torrens
    torrens.userData.luci.forEach((l, k) => l.material.color.setHex(V.sbloccato ? (Math.sin(tempo * 6 - k) > 0 ? 0x40ff60 : 0x103010) : 0xff2010));
    torrens.userData.disco.rotation.x = V.sbloccato ? Math.min(Math.PI / 2, (torrens.userData.ap = (torrens.userData.ap || 0) + dt)) : 0;
    // razzi
    razzi.forEach((m, i) => { const f = V.razzi[i]; m.visible = !!f; if (f) m.position.set(f[0] * D, 0.04, f[1] * D); });
    // ---------- la telecamera ----------
    const C = V.cam;
    camera.fov = C.fov || 72; camera.aspect = V.w / V.h; camera.updateProjectionMatrix();
    camera.position.set(C.x * D, C.h, C.y * D);
    camera.rotation.set(C.pitch || 0, -C.yaw - Math.PI / 2, C.rollio || 0);
    // ---------- gli xenomorfi ----------
    const alieni = V.alieni || [];
    assicura(alieni.length);
    let vicinoX = null, dVicino = Infinity;
    xenos.forEach((X, i) => {
      const A = alieni[i];
      if (!A) { X.oggetto.visible = false; return; }
      const nascosto = A.inCondotto && !['entra', 'esce'].includes(A.anim);
      X.oggetto.visible = !nascosto && V.nascondiXeno !== i;
      X.oggetto.position.set(A.x * D, 0, A.y * D);
      X.oggetto.rotation.y = Math.PI / 2 - A.yaw;
      X.aggiorna(dt, A.anim === 'condotto' ? 'fermo' : A.anim, (A.vel || 0) * D);
      const d = Math.hypot(A.x * D - camera.position.x, A.y * D - camera.position.z);
      if (X.oggetto.visible && d < dVicino) { dVicino = d; vicinoX = X; }
    });
    if (vicinoX) { const p = vicinoX.oggetto.position; luceXeno.position.set(p.x, 2.4, p.z); luceXeno.intensity = dVicino < 6 ? 1.2 : 0; } else luceXeno.intensity = 0;
    if (C.modo === 'morte' && vicinoX) {
      // la telecamera guarda la bocca dello xenomorfo
      vicinoX.bocca(v3); camera.lookAt(v3.x, v3.y, v3.z); camera.rotateX(C.pitch || 0); camera.rotateZ(C.rollio || 0); // il tremolio e la caduta
    }
    // ---------- gli altri sopravvissuti ----------
    const visti = new Set();
    let it = 0;
    for (const u of V.umani) {
      visti.add(u.k);
      let o = omini.get(u.k); if (!o) { o = omino(u.k); omini.set(u.k, o); }
      const vivo = u.f & 1, nascosto = u.f & 2, fuggito = u.f & 64, acc = u.f & 4, torciaOn = u.f & 32;
      o.gr.visible = !u.io && !nascosto && !fuggito && !(u.nascondi);
      if (!o.gr.visible) continue;
      o.gr.position.set(u.x * D, 0, u.y * D);
      o.gr.rotation.y = Math.PI / 2 - u.yaw;
      if (!vivo) { o.gr.rotation.z = Math.PI / 2; o.gr.position.y = 0.2; o.cono.visible = false; continue; }
      o.gr.rotation.z = 0;
      o.fase += dt * (u.vel || 0) * 0.35;
      const amp = Math.min(0.7, (u.vel || 0) / 40);
      o.gambe[0].rotation.x = Math.sin(o.fase) * amp; o.gambe[1].rotation.x = -Math.sin(o.fase) * amp;
      o.braccia[0].rotation.x = -Math.sin(o.fase) * amp * 0.7; o.braccia[1].rotation.x = -0.9;
      o.gr.scale.y = acc ? 0.62 : 1;
      o.cono.visible = !!torciaOn;
      if (torciaOn && it < torceAltri.length) {
        const s = torceAltri[it++];
        s.intensity = 22; s.position.set(u.x * D + Math.cos(u.yaw) * 0.3, acc ? 0.7 : 1.05, u.y * D + Math.sin(u.yaw) * 0.3);
        s.target.position.set(u.x * D + Math.cos(u.yaw) * 5, (acc ? 0.7 : 1.05) + Math.sin(-(u.pitch || 0)) * 5, u.y * D + Math.sin(u.yaw) * 5);
      }
      if (u.f & 128) emetti(u.x * D + Math.cos(u.yaw) * 0.5, acc ? 0.6 : 1.0, u.y * D + Math.sin(u.yaw) * 0.5, Math.cos(u.yaw), Math.sin(u.yaw), 8);
    }
    for (; it < torceAltri.length; it++) torceAltri[it].intensity = 0;
    for (const [k, o] of omini) if (!visti.has(k)) o.gr.visible = false;
    // ---------- la mia torcia, le lampade vicine, i fuochi ----------
    torcia.intensity = C.torcia ? 34 * (C.batteria < 15 ? (Math.random() > 0.1 ? 0.6 : 0.1) : 1) : 0;
    const cx = camera.position.x, cz = camera.position.z;
    const ord = lampade.map((l) => [l, (l.x - cx) ** 2 + (l.z - cz) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, vicine.length);
    vicine.forEach((L, i) => {
      const [l] = ord[i];
      if (L.userData.l !== l) { L.userData.l = l; L.userData.k = 0; L.position.set(l.x, l.y - 0.15, l.z); L.color.setRGB(...l.colAtt); }
      L.userData.k = Math.min(1, L.userData.k + dt * 2);
      L.intensity = l.kAtt * L.userData.k * (l.rossa ? 2.2 : 3.2);
    });
    let fi = 0;
    for (const f of V.razzi) if (fi < fuochi.length) { const L = fuochi[fi++]; L.color.setHex(0xff2810); L.position.set(f[0] * D, 0.3, f[1] * D); L.intensity = 6 + Math.random() * 3; }
    if (C.fiamma && fi < fuochi.length) {
      const L = fuochi[fi++]; L.color.setHex(0xff7a20); L.position.set(cx + Math.cos(C.yaw) * 1.5, C.h - 0.3, cz + Math.sin(C.yaw) * 1.5); L.intensity = 12 + Math.random() * 6;
      emetti(cx + Math.cos(C.yaw) * 0.5 + Math.cos(C.yaw + Math.PI / 2) * 0.2, C.h - 0.35, cz + Math.sin(C.yaw) * 0.5 + Math.sin(C.yaw + Math.PI / 2) * 0.2, Math.cos(C.yaw), Math.sin(C.yaw), 10);
    }
    for (; fi < fuochi.length; fi++) fuochi[fi].intensity = 0;
    for (let i = 0; i < NF; i++) {
      if (fVita[i] <= 0) { fPos[i * 3 + 1] = -50; continue; }
      fVita[i] -= dt;
      fPos[i * 3] += fVel[i * 3] * dt; fPos[i * 3 + 1] += fVel[i * 3 + 1] * dt + dt * 0.8; fPos[i * 3 + 2] += fVel[i * 3 + 2] * dt;
      fVel[i * 3] *= 0.94; fVel[i * 3 + 2] *= 0.94;
    }
    fGeo.attributes.position.needsUpdate = true;
    // lo xenomorfo giocatore vede al buio (una luce fredda ovunque) e la nebbia è più rada
    ambiente.intensity = C.modo === 'alieno' ? 1.4 : 0;
    scena.fog.density = C.modo === 'alieno' ? 0.045 : 0.085;
    renderer.setSize(V.w, V.h, false);
    renderer.render(scena, camera);
    return renderer.domElement;
  }
  // da un punto del mondo (decimetri, altezza in metri) alla posizione sullo schermo (0..1), o null se è dietro
  const pr = new THREE.Vector3();
  function proietta(x, y, h) {
    pr.set(x * D, h, y * D);
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    if (pr.clone().sub(camera.position).dot(dir) < 0.1) return null;
    pr.project(camera);
    return { x: (pr.x + 1) / 2, y: (1 - pr.y) / 2 };
  }
  return { disegna, proietta, canvas: renderer.domElement, renderer, xeno };
}
