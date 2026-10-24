// ALIEN: ISOLATION 3D — lo xenomorfo. Il modello è quello fatto dall'utente (alleggerito a 24.000 triangoli, file
// /modelli/xenomorfo.bin) con uno scheletro di 27 ossa: anca, schiena, petto, collo, testa, spalle, gomiti, polsi,
// cosce, ginocchia, caviglie e dieci ossa nella coda. Le animazioni sono fatte a codice, ogni fotogramma:
// fermo (respira, la coda ondeggia), cammina (curvo, passi lenti e felini), corre (piegato in avanti, falcate lunghe,
// la coda tesa), fiuta e annusa (la testa che cerca), attacca e prende (si slancia con le braccia), brucia (si
// contorce e urla), esce ed entra nei condotti (cade dal soffitto, salta su).
// Pelle: nero lucido biomeccanico, la testa ancora più lucida, le pieghe più scure (la "cavità" calcolata sul modello).
import * as THREE from '/js/three.module.min.js';

const ALTEZZA = 2.35; // metri (il modello è alto 1,9 unità)

export async function carica(envMap) {
  const buf = await (await fetch('/modelli/xenomorfo.bin')).arrayBuffer();
  const dv = new DataView(buf);
  const lh = dv.getUint32(0, true);
  const info = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, lh)));
  let o = 4 + lh;
  const nv = info.nv, nf = info.nf;
  const q = new Int16Array(buf, o, nv * 3); o += nv * 6; if (o % 4) o += 2;
  const ind = new Uint16Array(buf, o, nf * 3); o += nf * 6; o += (4 - (o % 4)) % 4;
  const si = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const sw = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const cav = new Uint8Array(buf, o, nv);
  const pos = new Float32Array(nv * 3); for (let i = 0; i < nv * 3; i++) pos[i] = q[i] * info.scala;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(ind), 1));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from(sw, (x) => x / 255), 4));
  geo.setAttribute('cavita', new THREE.BufferAttribute(Float32Array.from(cav, (x) => x / 127.5 - 1), 1));
  geo.computeVertexNormals();

  // lo scheletro (le ossa nella posizione di riposo, rotazioni a zero)
  const ossa = info.ossa.map((b) => { const o3 = new THREE.Bone(); o3.name = b.n; return o3; });
  info.ossa.forEach((b, i) => {
    const p = new THREE.Vector3(...b.pos);
    if (b.p >= 0) { ossa[b.p].add(ossa[i]); p.sub(new THREE.Vector3(...info.ossa[b.p].pos)); }
    ossa[i].position.copy(p);
  });
  const radice = ossa[info.ossa.findIndex((b) => b.p < 0)];
  const scheletro = new THREE.Skeleton(ossa);

  // la pelle
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.35, metalness: 0.1, envMap, envMapIntensity: 0.35 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTempo = { value: 0 };
    mat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float cavita;\nvarying float vCav;\nvarying vec3 vMod;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCav = cavita;\nvMod = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCav;\nvarying vec3 vMod;\nuniform float uTempo;\n' +
        'float hash3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }\n' +
        'float rum3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f); return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }')
      // colore: nero bluastro, pieghe nere, creste e costole grigio-argento, la testa (cupola) più lucida
      .replace('#include <color_fragment>', `#include <color_fragment>
        float cresta = smoothstep(0.15, 0.9, -vCav);
        float piega = smoothstep(0.1, 0.8, vCav);
        float bio = rum3(vMod * 38.0) * 0.6 + rum3(vMod * 90.0) * 0.4;
        vec3 base = mix(vec3(0.0025, 0.0028, 0.0038), vec3(0.008, 0.0075, 0.008), bio);
        base = mix(base, vec3(0.03, 0.03, 0.034), cresta * 0.6);
        base *= 1.0 - piega * 0.75;
        diffuseColor.rgb = base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float testa = smoothstep(0.5, 0.62, vMod.y);
        roughnessFactor = mix(0.26, 0.11, testa) + piega * 0.3 - cresta * 0.06 + (bio - 0.5) * 0.1;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = 0.0;`);
  };
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(radice);
  mesh.bind(scheletro);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const k = ALTEZZA / 1.9;
  const corpo = new THREE.Group(); // il modello in piedi con i piedi a terra, avanti = +Z
  mesh.scale.setScalar(k); mesh.position.y = 0.95 * k;
  corpo.add(mesh);
  const xeno = new THREE.Group(); xeno.add(corpo);
  // la seconda mascella: un tubo con i denti argentati nascosto in bocca, scatta fuori quando uccide
  const mascella = new THREE.Group();
  const matM = new THREE.MeshStandardMaterial({ color: 0x1a1416, roughness: 0.25, metalness: 0.1, envMap, envMapIntensity: 0.5 });
  const matD = new THREE.MeshStandardMaterial({ color: 0xc8c8c0, roughness: 0.15, metalness: 0.6, envMap, envMapIntensity: 0.8 });
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.24, 10), matM); tubo.rotation.x = Math.PI / 2; tubo.position.z = -0.12; mascella.add(tubo);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, d = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 5), matD);
    d.rotation.x = Math.PI / 2; d.position.set(Math.cos(a) * 0.018, Math.sin(a) * 0.018, 0.012); mascella.add(d);
  }
  const bava = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.001, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xd8e0e0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 }));
  bava.position.set(0, -0.06, -0.02); mascella.add(bava);
  const ossoTesta = scheletro.getBoneByName('testa');
  const bocca = new THREE.Group(); bocca.position.set(0.03, -0.07, 0.3); ossoTesta.add(bocca); bocca.add(mascella);
  mascella.scale.setScalar(0.001);
  // gli occhi non ci sono: sotto la cupola un riflesso; la bava (filo argentato) quando ringhia
  const A = new Animatore(xeno, corpo, mesh, scheletro, mat);
  A.mascella = mascella;
  return A;
}

const B = (s, n) => s.getBoneByName(n);
const dolce = (a, b, k) => a + (b - a) * Math.min(1, k);
class Animatore {
  constructor(xeno, corpo, mesh, scheletro, mat) {
    this.oggetto = xeno; this.corpo = corpo; this.mesh = mesh; this.mat = mat;
    this.o = {};
    for (const b of scheletro.bones) this.o[b.name] = b;
    this.coda = Array.from({ length: 10 }, (_, i) => this.o[`coda${i}`]);
    this.fase = 0; this.t = 0; this.peso = {}; // i pesi delle pose (si passa dolcemente dall'una all'altra)
    this.anim = 'fermo'; this.tAnim = 0; this.alto = 0;
  }
  // anim: fermo, cammina, corre, fiuta, annusa, attacca, tira, uccide, brucia, esce, entra, condotto; vel in m/s
  aggiorna(dt, anim, vel) {
    if (anim !== this.anim) { this.anim = anim; this.tAnim = 0; }
    this.t += dt; this.tAnim += dt;
    const corsa = anim === 'corre' || anim === 'brucia' ? 1 : 0;
    const passo = vel > 0.2;
    // la fase del passo segue la velocità (falcate più lunghe correndo)
    this.fase += dt * (passo ? (corsa ? vel * 2.3 : vel * 3.1 + 0.6) : 0);
    const voglio = {
      cammina: passo && !corsa ? 1 : 0, corre: passo && corsa ? 1 : 0,
      fiuta: anim === 'fiuta' || anim === 'annusa' ? 1 : 0,
      attacca: anim === 'attacca' ? 1 : 0,
      // l'uccisione: balzo, presa con le braccia, testa sopra la vittima, la seconda mascella che scatta
      uccide: anim === 'uccide' || anim === 'tira' ? (this.tAnim < 1.9 ? 1 : 0) : 0,
      brucia: anim === 'brucia' ? 1 : 0,
    };
    for (const [n, v] of Object.entries(voglio)) this.peso[n] = dolce(this.peso[n] || 0, v, dt * 6);
    const P = this.peso, f = this.fase, t = this.t, o = this.o;
    const s = Math.sin(f), c = Math.cos(f);
    const resp = Math.sin(t * 1.7);
    // si azzera tutto e si sommano le pose
    for (const b of Object.values(o)) b.rotation.set(0, 0, 0);
    const cam = P.cammina, cor = P.corre, fiu = P.fiuta, att = P.attacca, bru = P.brucia, U = P.uccide || 0;
    const ta = this.tAnim, uccide = anim === 'uccide' || anim === 'tira';
    const tra = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));
    const balzo = uccide ? tra(0, 0.28, ta) * (1 - tra(1.4, 1.9, ta)) : 0; // il salto addosso
    // il morso: la mascella esce di colpo (0.85-0.95 s), resta un attimo, rientra
    const morso = uccide ? tra(0.82, 0.92, ta) * (1 - tra(1.08, 1.3, ta)) : 0;
    const trema = uccide && ta < 0.85 ? Math.sin(t * 38) * 0.025 * U : 0;
    // il busto: sempre un po' curvo da predatore, molto curvo correndo
    o.anca.rotation.x = 0;
    o.anca.rotation.z = (cam * 0.05 + cor * 0.06) * s;
    o.anca.rotation.y = (cam * 0.08 + cor * 0.05) * s;
    o.schiena.rotation.x = 0.2 + cam * 0.15 + cor * 0.4 + resp * 0.02 + att * 0.25 - bru * 0.35 + U * 0.3;
    o.petto.rotation.x = 0.08 + cor * 0.12 + resp * 0.025 + att * 0.2 - bru * 0.3 + U * 0.15 + morso * 0.1;
    o.petto.rotation.y = -(cam * 0.07 + cor * 0.05) * s;
    // collo e testa: compensano la curva (la testa resta orizzontale), cercano e annusano
    o.collo.rotation.x = -0.15 - cor * 0.35 - cam * 0.08 + att * 0.15 + bru * 0.4 + U * 0.12 - morso * 0.2;
    o.testa.rotation.x = -0.1 - cor * 0.18 + fiu * (0.25 + Math.sin(t * 5) * 0.08) + att * 0.2 + bru * Math.sin(t * 20) * 0.15 - morso * 0.1 + trema;
    o.testa.rotation.y = fiu * Math.sin(t * 1.6) * 0.55 + bru * Math.sin(t * 13) * 0.25 + (1 - cam - cor) * Math.sin(t * 0.7) * 0.12;
    o.testa.rotation.z = fiu * Math.sin(t * 2.3) * 0.18 + U * 0.18 * Math.sin(Math.min(ta, 0.8) * 2) + trema;
    // gambe (digitigradi): la coscia oscilla, il ginocchio si piega quando la gamba torna avanti
    const amp = cam * 0.32 + cor * 0.62;
    for (const [lato, sg] of [['S', 1], ['D', -1]]) {
      const sl = s * sg, cl = c * sg;
      const pieg = Math.max(0, cl) * (cam * 0.55 + cor * 0.9);
      o[`coscia${lato}`].rotation.x = -sl * amp - 0.12 - cor * 0.3 - att * 0.2 + (lato === 'S' ? 0.24 : -0.08) - U * 0.4;
      o[`ginocchio${lato}`].rotation.x = 0.35 + pieg + cor * 0.35 + att * 0.15 + (lato === 'D' ? -0.36 : 0) + U * 0.5;
      o[`caviglia${lato}`].rotation.x = -0.25 - pieg * 0.7 + sl * amp * 0.5 - cor * 0.1 - U * 0.18;
      // braccia: oscillano al contrario delle gambe; correndo stanno avanti, attaccando si alzano con gli artigli aperti
      const br = lato === 'S' ? 'D' : 'S';
      // uccidendo: le braccia afferrano la vittima davanti (spalle avanti, gomiti piegati, mani chiuse verso il centro)
      o[`spalla${br}`].rotation.x = -(sl * (cam * 0.25 + cor * 0.5)) - cor * 0.5 - att * (1.3 + Math.sin(this.tAnim * 9) * 0.2) - fiu * 0.15 - bru * 0.9 - U * (2.0 - balzo * 0.2);
      o[`spalla${br}`].rotation.z = (br === 'S' ? -1 : 1) * (0.05 + att * 0.35 + bru * 0.5 * Math.abs(Math.sin(t * 9)) - U * 0.45);
      o[`gomito${br}`].rotation.x = -0.25 - cor * 0.6 - att * 0.5 - fiu * 0.2 - U * 0.55;
      o[`polso${br}`].rotation.x = -0.1 - att * 0.3 + Math.sin(t * 2 + sg) * 0.05 - U * 0.5;
    }
    // la coda: un'onda che scorre (lenta da fermo, tesa e alta correndo), si alza dietro quando caccia
    const onda = cor ? 6 : cam ? 3.2 : 1.6, larga = 0.07 + cam * 0.04 - cor * 0.03;
    this.coda.forEach((b, i) => {
      b.rotation.y = Math.sin(t * onda - i * 0.65) * larga * (1 + i * 0.12);
      b.rotation.x = Math.sin(t * onda * 0.5 - i * 0.5) * 0.03;
    });
    this.coda[0].rotation.x += 0.35 * cor + 0.15 * cam + 0.25 * att + 0.5 * U;
    if (U) this.coda.forEach((b, i) => { b.rotation.y += Math.sin(t * 9 - i * 0.8) * 0.06 * U; });
    this.coda[1].rotation.x += 0.25 * cor;
    this.coda[2].rotation.x += 0.15 * cor;
    // il corpo sale e scende col passo; esce dal condotto cadendo dal soffitto, entra saltando su
    let y = (cam * 0.03 + cor * 0.06) * Math.abs(c) - cor * 0.12 - att * 0.05 - U * 0.16;
    let rotx = 0;
    this.corpo.position.z = balzo * 0.25 + morso * 0.08;
    if (this.mascella) this.mascella.scale.setScalar(Math.max(0.001, morso * 1.6)), this.mascella.position.z = morso * 0.22;
    if (this.anim === 'esce') { const k = Math.min(1, this.tAnim / 0.7); y += (1 - k * k) * 2.6; rotx = (1 - k) * -1.2; }
    if (this.anim === 'entra') { const k = Math.min(1, this.tAnim / 0.8); y += k * k * 3; rotx = k * -1.0; }
    this.corpo.position.y = y; this.corpo.rotation.x = rotx;
    if (this.mat.userData.sh) this.mat.userData.sh.uniforms.uTempo.value = t;
  }
  // la testa in coordinate del mondo (per la telecamera della morte e i suoni)
  testa(v = new THREE.Vector3()) { return this.o.testa.getWorldPosition(v); }
  bocca(v = new THREE.Vector3()) { return this.mascella ? this.mascella.parent.getWorldPosition(v) : this.testa(v); }
}
