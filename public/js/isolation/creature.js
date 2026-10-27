// ALIEN: ISOLATION 3D — i modelli fatti a codice degli altri pericoli: il Working Joe (l'androide della Seegson:
// pelle di gomma grigia, tuta da lavoro, occhi arancioni che brillano), il facehugger (otto dita ossute e la coda)
// e l'uovo (che si apre a quattro petali). Animazioni procedurali: camminata rigida, stretta al collo, bruciato;
// corsa a zampette e salto; l'uovo che pulsa e si apre. Unità: metri.
import * as THREE from '/js/three.module.min.js';

const mat = (color, roughness = 0.7, metalness = 0.05, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// ---------- il Working Joe ----------
export function joe() {
  const gomma = mat(0x9a9890, 0.55, 0.05), tuta = mat(0x4e5a4a, 0.85), scuro = mat(0x2a2c2a, 0.6, 0.3);
  const occhio = new THREE.MeshBasicMaterial({ color: 0xff8a20, toneMapped: false });
  const gr = new THREE.Group();
  const bacino = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.24), tuta); bacino.position.y = 0.95; gr.add(bacino);
  const busto = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.28), tuta); busto.position.y = 1.32; gr.add(busto);
  const pettorina = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.02), mat(0xc8b860, 0.5)); pettorina.position.set(0, 1.45, 0.15); gr.add(pettorina); // la targhetta Seegson
  const collo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), gomma); collo.position.y = 1.65; gr.add(collo);
  const testa = new THREE.Group(); testa.position.y = 1.8; gr.add(testa);
  const cranio = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), gomma); cranio.scale.set(0.9, 1.15, 1); testa.add(cranio);
  for (const x of [-0.045, 0.045]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), occhio); o.position.set(x, 0.02, 0.11); testa.add(o); }
  const bocca = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), scuro); bocca.position.set(0, -0.06, 0.12); testa.add(bocca);
  const arto = (r, l, m) => { const p = new THREE.Group(); const s = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), m); s.position.y = -l / 2 - r; p.add(s); return p; };
  const gambe = [-0.1, 0.1].map((x) => { const p = arto(0.075, 0.72, tuta); p.position.set(x, 0.92, 0); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.26), scuro); sc.position.set(0, -0.9, 0.04); p.add(sc); gr.add(p); return p; });
  const braccia = [-0.29, 0.29].map((x) => { const p = arto(0.06, 0.56, tuta); p.position.set(x, 1.55, 0); const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), gomma); m.position.y = -0.74; p.add(m); gr.add(p); return p; });
  gr.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let fase = 0, t = 0;
  function aggiorna(dt, anim, vel) {
    t += dt; fase += dt * vel * 3.2;
    const amp = Math.min(0.5, vel * 0.35);
    braccia[0].rotation.set(0, 0, 0); braccia[1].rotation.set(0, 0, 0); testa.rotation.set(0, 0, 0);
    busto.rotation.set(0, 0, 0); occhio.color.setHex(0xff8a20);
    if (anim === 'stringe') {
      // le braccia tese in avanti, le mani al collo di chi ha preso, un tremito
      braccia[0].rotation.x = -1.45; braccia[1].rotation.x = -1.45; braccia[0].rotation.z = 0.25; braccia[1].rotation.z = -0.25;
      busto.rotation.x = 0.12 + Math.sin(t * 30) * 0.015; testa.rotation.x = 0.2;
      gambe[0].rotation.x = 0.2; gambe[1].rotation.x = -0.25;
      occhio.color.setHex(0xff4010);
      return;
    }
    if (anim === 'brucia') {
      // bloccato dal fuoco: si piega, scatti, occhi che sfarfallano
      busto.rotation.x = 0.35; testa.rotation.z = Math.sin(t * 25) * 0.2;
      braccia[0].rotation.x = -0.6 + Math.sin(t * 19) * 0.3; braccia[1].rotation.x = -0.4 + Math.sin(t * 23) * 0.3;
      occhio.color.setHex(Math.sin(t * 40) > 0 ? 0xff8a20 : 0x301000);
      gambe[0].rotation.x = 0; gambe[1].rotation.x = 0;
      return;
    }
    // la camminata rigida degli androidi: passi corti, braccia quasi ferme, la testa che si gira a scatti
    gambe[0].rotation.x = Math.sin(fase) * amp; gambe[1].rotation.x = -Math.sin(fase) * amp;
    braccia[0].rotation.x = -Math.sin(fase) * amp * 0.25; braccia[1].rotation.x = Math.sin(fase) * amp * 0.25;
    testa.rotation.y = Math.round(Math.sin(t * 0.7) * 3) * 0.12;
  }
  return { oggetto: gr, aggiorna };
}

// ---------- il facehugger ----------
export function facehugger() {
  const pelle = mat(0xc9b88a, 0.45, 0.1, { emissive: 0x150f05 }), dita = mat(0xb8a87a, 0.5);
  const gr = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), pelle); corpo.scale.set(1, 0.55, 1.2); corpo.position.y = 0.12; gr.add(corpo);
  const sacche = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), pelle); sacche.scale.set(1.2, 0.5, 0.9); sacche.position.set(0, 0.16, -0.06); gr.add(sacche);
  // le otto dita: due segmenti ciascuna
  const zampe = [];
  for (let i = 0; i < 8; i++) {
    const lato = i < 4 ? -1 : 1, k = i % 4, a = (k - 1.5) * 0.45;
    const p = new THREE.Group(); p.position.set(lato * 0.09, 0.12, Math.sin(a) * 0.1 + 0.02); p.rotation.y = lato * (Math.PI / 2) - a * lato;
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 6), dita); s1.rotation.z = Math.PI / 2 - 0.5; s1.position.set(0.07, 0.03, 0); s1.rotation.order = 'YXZ';
    const ginocchio = new THREE.Group(); ginocchio.position.set(0.14, 0.06, 0); p.add(s1); p.add(ginocchio);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.17, 6), dita); s2.position.set(0.04, -0.08, 0); s2.rotation.z = 0.5; ginocchio.add(s2);
    if (lato < 0) p.rotation.y += Math.PI;
    gr.add(p); zampe.push(p);
  }
  // la coda lunga a segmenti
  const coda = [];
  let padre = gr, z = -0.14;
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Group(); s.position.set(0, i ? 0 : 0.11, i ? -0.06 : z); padre.add(s);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 - i * 0.002, 8, 6), pelle); m.scale.z = 1.5; s.add(m);
    coda.push(s); padre = s;
  }
  gr.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let fase = 0, t = 0;
  function aggiorna(dt, stato, vel) {
    t += dt; fase += dt * (6 + vel * 9);
    zampe.forEach((p, i) => { p.rotation.x = Math.sin(fase + i * 1.3) * (vel > 0.1 ? 0.4 : 0.06); });
    coda.forEach((s, i) => { s.rotation.y = Math.sin(fase * 0.8 - i * 0.6) * 0.35; s.rotation.x = 0.06; });
    gr.position.y = stato === 'salta' ? 0.6 + Math.sin(t * 9) * 0.1 : 0;
    corpo.scale.y = 0.55 + Math.sin(t * 5) * 0.03;
  }
  return { oggetto: gr, aggiorna };
}

// ---------- l'uovo ----------
export function uovo() {
  const pelle = mat(0x6a5e48, 0.5, 0.1, { emissive: 0x0a0804 }), dentro = mat(0x8a2a1a, 0.4, 0, { emissive: 0x200000 });
  const gr = new THREE.Group();
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), pelle); base.scale.set(1, 1.35, 1); base.position.y = 0.36; gr.add(base);
  const cuore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), dentro); cuore.position.y = 0.66; gr.add(cuore);
  // i quattro petali in cima
  const petali = [];
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group(); p.rotation.y = (i * Math.PI) / 2; p.position.y = 0.7; gr.add(p);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, -0.4, 0.8, 0, Math.PI / 2), pelle); m.scale.set(1, 0.9, 1); m.rotation.y = -Math.PI / 2; m.position.z = 0.02; p.add(m);
    petali.push(p);
  }
  // la resina sul pavimento intorno
  const resina = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), mat(0x1c1a14, 0.3, 0.2)); resina.rotation.x = -Math.PI / 2; resina.position.y = 0.01; gr.add(resina);
  gr.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let t = 0, apertura = 0;
  function aggiorna(dt, stato) {
    t += dt;
    apertura += ((stato > 0 ? 1 : 0) - apertura) * Math.min(1, dt * (stato === 1 ? 2 : 6));
    petali.forEach((p) => { p.children[0].rotation.x = -apertura * 1.4; });
    base.scale.x = base.scale.z = 1 + Math.sin(t * 2.2) * 0.02 * (1 - apertura);
    cuore.visible = stato < 2;
  }
  return { oggetto: gr, aggiorna };
}

// ---------- la tessera e il fusibile (obiettivi della classica) ----------
export function chiave(tipo) {
  const gr = new THREE.Group();
  const m = tipo === 'k'
    ? new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.14), mat(0x3070c0, 0.4, 0.3))
    : new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 12), mat(0x909a90, 0.35, 0.8));
  m.position.y = tipo === 'k' ? 0.9 : 0.95; if (tipo !== 'k') m.rotation.z = Math.PI / 2;
  gr.add(m);
  const piedistallo = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.5), mat(0x3c3e3c, 0.6, 0.5)); piedistallo.position.y = 0.425; gr.add(piedistallo);
  const spia = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: tipo === 'k' ? 0x40a0ff : 0x60ff80, toneMapped: false })); spia.position.set(0, 1.05, 0); gr.add(spia);
  gr.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let t = 0;
  return { oggetto: gr, oggettoPreso: m, aggiorna(dt, preso) { t += dt; m.visible = !preso; spia.visible = !preso && Math.sin(t * 5) > 0; m.rotation.y += dt * 1.2; } };
}
