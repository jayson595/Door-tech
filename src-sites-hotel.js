// sites/hotel.js — Grand Meridian Hotel, lobby entrance. (A DRAFT: see drafts.js.)
//
// A 4-wing AUTOMATIC REVOLVING DOOR. The glass drum straddles the front wall; four glass wings
// turn on a center post, driven by a motor in the canopy on top. A controller on the lobby wall
// sets the speed. Rubber SAFETY EDGES on the wings stop the door if they touch someone, SWEEP
// BRUSHES on the wing ends seal against drafts, and a NIGHT LOCK pin drops into a floor socket.
// New here: EMERGENCY BREAKOUT. Pushed hard, the wings must fold flat ("book fold") so people can
// get straight out in a fire. A fire inspector checks it.
//
// Faults (from the "Picked: revolving door" plan):
//   breakout    breakout latches painted over / seized -> wings won't fold flat (life safety)
//   speed       controller reset to max speed after a power outage -> bumps guests
//   safetyEdge  switch inside a wing's safety edge crushed -> door stops dead every few turns
//   brushes     sweep brushes worn flat -> drafts, cold, noise
//   motor       drive motor burnt out -> door won't turn at all
//   nightLock   socket packed with grit, pin set short -> night lock won't hold

import * as THREE from 'three';
import { MAT, box, glassPane } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { car } from './src-vehicles2.js';

const R = 1.0;            // drum radius (2 m across)
const H = 2.3;            // drum height (inside, to the canopy)
const WING_H = 2.18;
const GOOD_RPM = 3;       // a lobby revolving door turns about 3 rpm
const PAUSE_AT = 70;      // bad safety edge: degrees into a turn where it trips
const CTL_X = 2.5;        // door controller on the lobby wall, on the stone just past the right sidelight
const PIN_R = 0.6;        // how far out along wing 0 the night lock pin sits
const REST = 45;          // at rest the wings stand in an X, leaving a pocket open front and back
// the two floor sockets: where wing 0's pin lands at rest (it parks every half turn)
const SOCKETS = [REST, REST + 180].map((a) => [PIN_R * Math.cos(a * Math.PI / 180), -PIN_R * Math.sin(a * Math.PI / 180)]);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function label(parent, text, w, h, x, y, z, { bg = null, fg = '#e9ecef', px = 40, rotY = 0, font = 'Arial, sans-serif' } = {}) {
  const tex = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = fg; g.font = `bold ${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

// A group stand-in for a part that is really several meshes on different wings: the game only
// ever calls traverse() on a part (to make it glow), so this hands it those meshes.
const meshSet = (meshes) => ({ traverse: (fn) => meshes.forEach(fn), isMeshSet: true });

// ---------------------------------------------------------------- the 3D building
function build(scene, parts) {
  const stone = new THREE.MeshStandardMaterial({ color: 0xd8cfbf, roughness: 0.85 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x8f8677, roughness: 0.8 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x5b4632, metalness: 0.65, roughness: 0.35 });

  // facade: stone, 6 m tall. In the middle: the drum opening (2 m wide) with a tall glass
  // SIDELIGHT either side of it in bronze frames, like a real hotel front.
  const T = 0.3, zc = -T / 2;
  const SIDE = 1.0, GH = H + 0.3;              // sidelight width; glass height (up to the canopy top)
  const edge = R + SIDE;                       // where the stone starts
  box(scene, 'wallL', stone, 6 - edge, 6, T, -(edge + (6 - edge) / 2), 3, zc);
  box(scene, 'wallR', stone, 6 - edge, 6, T, edge + (6 - edge) / 2, 3, zc);
  box(scene, 'wallOver', stone, 2 * edge, 6 - (GH + 0.04), T, 0, (6 + GH + 0.04) / 2, zc);
  // stone base along the bottom of the facade, outside the sidelights (not through the drum)
  for (const sd of [-1, 1]) box(scene, 'plinth', darkStone, 6.1 - edge, 0.5, T + 0.06, sd * (edge + (6.1 - edge) / 2), 0.25, zc);
  for (const sd of [-1, 1]) {
    const cx = sd * (R + SIDE / 2);
    glassPane(scene, SIDE - 0.06, GH - 0.18, cx, 0.12 + (GH - 0.18) / 2, zc);
    box(scene, 'sideSill', bronze, SIDE + 0.04, 0.12, T + 0.02, cx, 0.06, zc);                 // bottom rail / kick
    box(scene, 'sideHead', bronze, SIDE + 0.04, 0.06, T + 0.02, cx, GH + 0.01, zc);
    box(scene, 'sideJamb', bronze, 0.06, GH, T + 0.02, sd * edge, GH / 2, zc);               // against the stone
    box(scene, 'sideJambIn', bronze, 0.05, GH, T + 0.02, sd * (R + 0.03), GH / 2, zc);         // against the drum
    box(scene, 'sideTransom', bronze, SIDE, 0.04, 0.05, cx, 2.0, zc + T / 2 + 0.01);            // a bar across, outside face
  }
  for (const x of [-4.6, -3.0, 3.0, 4.6]) {
    for (const y of [1.6, 3.9]) box(scene, 'window', new THREE.MeshStandardMaterial({ color: 0x6f8fa6, metalness: 0.4, roughness: 0.2 }), 1.0, 1.5, 0.04, x, y, 0.01);
  }
  // marquee canopy out over the entrance, with the hotel name on its face
  box(scene, 'marquee', bronze, 4.2, 0.2, 2.2, 0, 3.4, 1.1);
  label(scene, 'GRAND MERIDIAN HOTEL', 4.0, 0.36, 0, 3.4, 2.21, { bg: '#2a2018', fg: '#e8c98a', px: 34, font: 'Georgia, serif' });
  for (const x of [-1.9, 1.9]) box(scene, 'marqueeRod', bronze, 0.04, 0.04, 1.6, x, 3.65, 1.0).rotation.x = -0.35;
  // red carpet, planters
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), new THREE.MeshStandardMaterial({ color: 0x8e1f24, roughness: 0.95 }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.004, R + 1.55);
  carpet.receiveShadow = true;
  scene.add(carpet);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f5a2c, roughness: 0.9 });
  for (const x of [-1.75, 1.75]) {
    box(scene, 'planter', darkStone, 0.6, 0.6, 0.6, x, 0.3, 0.75);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), leaf);
    bush.position.set(x, 0.92, 0.75);
    bush.castShadow = true;
    scene.add(bush);
  }
  // a taxi waiting at the curb
  car(scene, { x: 4.6, z: 5.6, rotY: -Math.PI / 2, color: 0xf2c230, type: 'sedan', plate: 'TAXI 22' });

  // inside: the lobby (marble floor, reception desk, warm light)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.2, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.002, -2.8);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ color: 0xf3efe6 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.4, -2.8);
  scene.add(ceil);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), new THREE.MeshBasicMaterial({ color: 0xd9cdb8,
    map: canvasTex(1024, 348, (g, w, h) => {
      g.fillStyle = '#e8dcc6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5b4632'; g.fillRect(0, h * 0.7, w, h * 0.3);
      g.fillStyle = '#2a2018'; g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center';
      g.fillText('RECEPTION', w / 2, 120);
    }) }));
  back.position.set(0, 1.7, -5.3);
  scene.add(back);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.4), new THREE.MeshStandardMaterial({ color: 0xe6dccb }));
    wall.position.set(s * 5, 1.7, -2.8);
    wall.rotation.y = -s * Math.PI / 2;
    scene.add(wall);
  }
  box(scene, 'desk', bronze, 3.2, 1.05, 0.7, 0, 0.525, -4.4);
  box(scene, 'deskTop', new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.25 }), 3.3, 0.05, 0.8, 0, 1.075, -4.4);
  // luggage cart
  const cart = new THREE.Group();
  cart.position.set(-2.4, 0, -2.0);
  scene.add(cart);
  box(cart, 'cartBase', MAT.stainless, 0.6, 0.05, 1.0, 0, 0.25, 0);
  for (const x of [-0.27, 0.27]) box(cart, 'cartPost', MAT.stainless, 0.03, 1.3, 0.03, x, 0.9, 0);
  box(cart, 'cartBar', MAT.stainless, 0.6, 0.03, 0.03, 0, 1.55, 0);
  box(cart, 'suitcase', new THREE.MeshStandardMaterial({ color: 0x2c4f7c, roughness: 0.6 }), 0.45, 0.6, 0.25, 0, 0.58, 0.2);
  box(cart, 'suitcase2', new THREE.MeshStandardMaterial({ color: 0x7a1f1f, roughness: 0.6 }), 0.4, 0.45, 0.22, 0, 0.5, -0.25);
  const glow = new THREE.PointLight(0xffe6c0, 4, 9, 1.4);
  glow.position.set(0, 2.9, -2.4);
  scene.add(glow);

  decorate(scene, bronze);

  // ---- the DRUM: round floor, curved glass side walls, bronze rings and the canopy
  const drumFloor = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.5 }));
  drumFloor.rotation.x = -Math.PI / 2;
  drumFloor.position.y = 0.004;
  drumFloor.receiveShadow = true;
  scene.add(drumFloor);
  for (const [a0, a1] of [[Math.PI / 4, Math.PI / 2], [5 * Math.PI / 4, Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true, a0, a1), MAT.glass);
    wall.position.y = H / 2;
    wall.renderOrder = 2;
    wall.userData.seeThrough = true;
    scene.add(wall);
  }
  for (const a of [1, 3, 5, 7].map((k) => k * Math.PI / 4)) {
    box(scene, 'drumMullion', bronze, 0.05, H, 0.05, R * Math.sin(a), H / 2, R * Math.cos(a));
  }
  // bronze rails along the curved glass sides: a kick rail at the floor and a band under the canopy
  const railMat = bronze.clone();
  railMat.side = THREE.DoubleSide;
  for (const [a0, a1] of [[Math.PI / 4, Math.PI / 2], [5 * Math.PI / 4, Math.PI / 2]]) {
    for (const [y, h] of [[0.09, 0.18], [H - 0.04, 0.08], [1.05, 0.04]]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, h, 32, 1, true, a0, a1), railMat);
      band.position.y = y;
      scene.add(band);
    }
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 48), bronze);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  // CANOPY on top of the drum; the DRIVE MOTOR lives in it (access panel on its front)
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.3, 40), bronze);
  canopy.position.y = H + 0.15;
  canopy.castShadow = true;
  scene.add(canopy);
  const motor = new THREE.Group();
  motor.name = 'motor';
  scene.add(motor);
  box(motor, 'motorPanel', new THREE.MeshStandardMaterial({ color: 0x3b2e22, metalness: 0.5, roughness: 0.4 }), 0.6, 0.2, 0.012, 0, H + 0.15, R + 0.066);
  label(motor, 'DRIVE', 0.24, 0.07, -0.1, H + 0.15, R + 0.074, { fg: '#e8c98a', px: 60 });
  const motorLed = box(motor, 'motorLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.025, 0.025, 0.006, 0.2, H + 0.15, R + 0.075);
  motorLed.castShadow = false;
  parts.motor = motor;
  parts.motorLED = motorLed;

  // CENTER POST with the BREAKOUT latches (the paint that seizes them, shown on that fault)
  const post = new THREE.Group();
  post.name = 'breakout';
  scene.add(post);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 16), bronze);
  pole.position.y = H / 2;
  pole.castShadow = true;
  post.add(pole);
  const paint = new THREE.Group();
  paint.visible = false;
  post.add(paint);
  const paintMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.6 });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    for (const y of [0.25, 2.0]) {
      const m = box(paint, 'paintBlob', paintMat, 0.06, 0.08, 0.06, 0.09 * Math.cos(a), y, -0.09 * Math.sin(a));
      m.rotation.y = a;
    }
  }
  parts.breakout = post;
  parts.paint = paint;

  // night lock SOCKETS in the drum floor (grit packed in on that fault)
  const lock = new THREE.Group();
  lock.name = 'nightLock';
  scene.add(lock);
  const grit = new THREE.Group();
  grit.visible = false;
  for (const [sx, sz] of SOCKETS) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    s.position.set(sx, 0.006, sz);
    lock.add(s);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 20), MAT.stainless);
    ringM.rotation.x = Math.PI / 2;
    ringM.position.set(sx, 0.008, sz);
    lock.add(ringM);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Mesh(new THREE.DodecahedronGeometry(0.011), new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 1 }));
      g.position.set(sx - 0.018 + i * 0.012, 0.012, sz + (i % 2) * 0.012 - 0.006);
      grit.add(g);
    }
  }
  lock.add(grit);
  parts.nightLock = lock;
  parts.grit = grit;

  // ---- the WINGS: doorLeaf turns them all; each wing has its own group so it can fold
  const wings = new THREE.Group();
  wings.name = 'doorLeaf';
  scene.add(wings);
  parts.doorLeaf = wings;
  const edges = [], brushes = [];
  const brushMat = () => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 });
  for (let k = 0; k < 4; k++) {
    const w = new THREE.Group();
    w.rotation.y = k * Math.PI / 2;
    wings.add(w);
    parts[`wing${k}`] = w;
    const len = R - 0.1;
    // frame: inner stile by the post, outer stile, top and bottom rails
    box(w, 'wingInner', bronze, 0.04, WING_H, 0.045, 0.09, WING_H / 2 + 0.03, 0);
    box(w, 'wingOuter', bronze, 0.04, WING_H, 0.045, R - 0.07, WING_H / 2 + 0.03, 0);
    box(w, 'wingTop', bronze, len, 0.06, 0.045, 0.07 + len / 2 - 0.02, WING_H, 0);
    box(w, 'wingBottom', bronze, len, 0.12, 0.045, 0.07 + len / 2 - 0.02, 0.09, 0);
    glassPane(w, len - 0.08, WING_H - 0.2, 0.07 + len / 2 - 0.02, WING_H / 2 + 0.05, 0);
    // rubber safety edge on the outer end (lower part, where it would touch a person)
    const e = box(w, 'safetyEdge', new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 }), 0.04, 1.1, 0.065, R - 0.035, 0.7, 0);
    edges.push(e);
    // sweep brushes: up the outer end above the edge, and along the bottom
    const b1 = box(w, 'brushEnd', brushMat(), 0.03, 0.85, 0.02, R - 0.012, 1.72, 0);
    const b2 = box(w, 'brushBottom', brushMat(), len - 0.05, 0.03, 0.02, 0.07 + len / 2 - 0.02, 0.018, 0);
    brushes.push(b1, b2);
    if (k === 0) { // the night lock pin rides on wing 0
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12), MAT.stainless);
      pin.position.set(PIN_R, 0.09, 0.035);
      w.add(pin);
      parts.lockPin = pin;
    }
  }
  parts.safetyEdges = meshSet(edges);
  parts.brushes = meshSet(brushes);
  parts.edgeMeshes = edges;
  parts.brushMeshes = brushes;

  // CONTROLLER panel on the lobby wall, just inside, right of the drum
  const ctl = new THREE.Group();
  ctl.name = 'controller';
  scene.add(ctl);
  box(ctl, 'ctlBox', new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6 }), 0.36, 0.46, 0.06, CTL_X, 1.35, -T - 0.03);
  const screen = box(ctl, 'ctlScreen', new THREE.MeshBasicMaterial({ color: 0x1d3b2a }), 0.22, 0.1, 0.005, CTL_X, 1.47, -T - 0.063);
  screen.castShadow = false;
  label(ctl, 'DOOR CONTROL', 0.3, 0.06, CTL_X, 1.27, -T - 0.064, { rotY: Math.PI, fg: '#e8c98a', px: 44 });
  parts.controller = ctl;
}

// ---------------------------------------------------------------- decoration
// Scenery only (nothing here can be tapped or broken): a furnished lobby inside, and a grand
// entrance outside. Everything stays clear of the drum, its walking path and the controller.
function decorate(scene, bronze) {
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.85, roughness: 0.25 });
  const marble = new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.25 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x1f3a5c, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.55 });
  const warmLight = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b33, roughness: 0.8, side: THREE.DoubleSide });
  const mesh = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  // ---- INSIDE: the lobby
  // patterned rug in front of the desk
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshStandardMaterial({ roughness: 1,
    map: canvasTex(512, 312, (g, w, h) => {
      g.fillStyle = '#7a1f24'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d9b66a'; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32);
      g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68);
      g.fillStyle = '#1f3a5c';
      g.beginPath(); g.ellipse(w / 2, h / 2, 120, 70, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d9b66a'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#d9b66a'; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('GM', w / 2, h / 2 + 4);
    }) }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.005, -3.05);
  rug.receiveShadow = true;
  scene.add(rug);

  // crystal chandelier over the rug
  const ch = new THREE.Group();
  ch.position.set(0, 3.02, -3.3); // high and back, so it never hides the door from the inside view
  scene.add(ch);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), gold, 0, 0.24, 0, ch);            // chain to the ceiling
  mesh(new THREE.SphereGeometry(0.11, 16, 12), gold, 0, 0, 0, ch);
  const ringC = mesh(new THREE.TorusGeometry(0.42, 0.018, 8, 40), gold, 0, -0.05, 0, ch);
  ringC.rotation.x = Math.PI / 2;
  const ring2 = mesh(new THREE.TorusGeometry(0.26, 0.014, 8, 32), gold, 0, -0.2, 0, ch);
  ring2.rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    mesh(new THREE.SphereGeometry(0.035, 10, 8), warmLight, 0.42 * Math.cos(a), 0.0, 0.42 * Math.sin(a), ch).castShadow = false;
    mesh(new THREE.ConeGeometry(0.02, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0xdff2ff, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.8 }),
      0.42 * Math.cos(a + 0.3), -0.12, 0.42 * Math.sin(a + 0.3), ch).rotation.x = Math.PI;
  }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.5;
    mesh(new THREE.SphereGeometry(0.028, 10, 8), warmLight, 0.26 * Math.cos(a), -0.17, 0.26 * Math.sin(a), ch).castShadow = false;
  }

  // marble columns either side of the lobby
  for (const x of [-3.4, 3.4]) {
    mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.1, 24), marble, x, 1.65, -2.4);
    box(scene, 'colBase', marble, 0.55, 0.12, 0.55, x, 0.06, -2.4);
    box(scene, 'colCap', marble, 0.55, 0.14, 0.55, x, 3.27, -2.4);
    box(scene, 'colRing', gold, 0.47, 0.03, 0.47, x, 0.135, -2.4);
  }

  // potted palms, just inside the windows (seen through the glass from the street)
  const palm = (x, z, s = 1) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    scene.add(g);
    mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.3 }), 0, 0.25, 0, g);
    box(g, 'potRim', gold, 0.54, 0.03, 0.54, 0, 0.5, 0).visible = false;
    const trunk = mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.3, 8), new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 1 }), 0, 1.15, 0, g);
    trunk.rotation.z = 0.05;
    // fronds: long narrow leaves arching up and out, then drooping, in two tiers
    const frondGeo = new THREE.PlaneGeometry(0.13, 0.9, 1, 6);
    const fp = frondGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const t = (fp.getY(i) + 0.45) / 0.9;           // 0 at the stem .. 1 at the tip
      fp.setX(i, fp.getX(i) * (1 - t * 0.85));        // taper to a point
      fp.setZ(i, Math.pow(t, 2) * 0.4);               // arch down toward the tip
    }
    frondGeo.translate(0, 0.45, 0);                    // pivot at the stem
    frondGeo.computeVertexNormals();
    for (let i = 0; i < 14; i++) {
      const a = i * (Math.PI * 2 / 14) + (i % 2) * 0.2;
      const frond = new THREE.Mesh(frondGeo, leafMat);
      frond.position.set(0, 1.78 - (i % 2) * 0.08, 0);
      frond.rotation.set(0, a, 0);
      frond.rotateX(i % 2 ? 1.25 : 0.85);            // lean out from the trunk top
      frond.castShadow = true;
      g.add(frond);
    }
  };
  palm(-3.35, -0.75);
  palm(3.4, -0.75);
  palm(-4.4, -4.7, 0.9);
  palm(4.4, -4.7, 0.9);

  // lounge corner on the left: sofa, two armchairs, a coffee table with flowers
  const sofa = new THREE.Group();
  sofa.position.set(-4.35, 0, -3.1);
  scene.add(sofa);
  box(sofa, 'sofaSeat', velvet, 0.8, 0.42, 1.9, 0, 0.21, 0);
  box(sofa, 'sofaBack', velvet, 0.22, 0.85, 1.9, -0.32, 0.43, 0);
  for (const z of [-0.98, 0.98]) box(sofa, 'sofaArm', velvet, 0.8, 0.6, 0.16, 0, 0.3, z);
  for (const z of [-0.45, 0.45]) box(sofa, 'cushion', new THREE.MeshStandardMaterial({ color: 0xd9b66a, roughness: 0.9 }), 0.12, 0.3, 0.3, -0.16, 0.6, z).rotation.z = -0.25;
  const chair = (x, z, rotY) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    scene.add(c);
    box(c, 'chairSeat', velvet, 0.7, 0.42, 0.7, 0, 0.21, 0);
    box(c, 'chairBack', velvet, 0.7, 0.75, 0.16, 0, 0.45, -0.3);
    for (const x2 of [-0.33, 0.33]) box(c, 'chairArm', velvet, 0.1, 0.58, 0.7, x2, 0.29, 0);
  };
  chair(-3.0, -2.15, -Math.PI * 0.65);
  chair(-3.0, -4.05, -Math.PI * 0.35);
  box(scene, 'coffeeTable', wood, 0.7, 0.05, 1.1, -3.35, 0.42, -3.1);
  for (const [dx, dz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) box(scene, 'tableLeg', gold, 0.04, 0.4, 0.04, -3.35 + dx, 0.2, -3.1 + dz);
  const flowers = (x, y, z) => {
    mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.2, 14), new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.1, transparent: true, opacity: 0.85 }), x, y + 0.1, z);
    const cols = [0xd94a5a, 0xf2c14e, 0xf4f1ea, 0xe07a9a];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.8 }),
        x + Math.cos(a) * 0.06, y + 0.27 + (i % 3) * 0.03, z + Math.sin(a) * 0.06);
    }
  };
  flowers(-3.35, 0.445, -3.1);

  // reception desk details: bell, lamp, flowers, screen, a sign-in book
  mesh(new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0.55, 1.1, -4.2);
  box(scene, 'bellBase', bronze, 0.12, 0.012, 0.12, 0.55, 1.105, -4.2);
  const lamp = new THREE.Group();
  lamp.position.set(-1.15, 1.1, -4.45);
  scene.add(lamp);
  mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.04, 14), gold, 0, 0.02, 0, lamp);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8), gold, 0, 0.2, 0, lamp);
  mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.17, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xf6e3b8, side: THREE.DoubleSide }), 0, 0.42, 0, lamp).castShadow = false;
  flowers(1.25, 1.1, -4.4);
  box(scene, 'monitor', new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.4 }), 0.42, 0.26, 0.03, -0.2, 1.3, -4.5).rotation.y = Math.PI;
  box(scene, 'monitorStand', new THREE.MeshStandardMaterial({ color: 0x1c1d20 }), 0.05, 0.14, 0.05, -0.2, 1.17, -4.52);
  box(scene, 'guestBook', new THREE.MeshStandardMaterial({ color: 0x5a1a1f, roughness: 0.7 }), 0.3, 0.025, 0.22, 0.15, 1.115, -4.15).rotation.y = 0.2;

  // world clocks over the desk
  const cities = ['NEW YORK', 'LONDON', 'TOKYO'];
  cities.forEach((city, i) => {
    const x = (i - 1) * 0.75;
    const hour = [9, 2, 10][i];
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c9a227'; g.lineWidth = 16; g.stroke();
        g.fillStyle = '#2a2018';
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.fillRect(w / 2 + Math.cos(a) * 96 - 4, h / 2 + Math.sin(a) * 96 - 4, 8, 8); }
        g.strokeStyle = '#2a2018'; g.lineCap = 'round';
        const hand = (a, len, wdt) => { g.lineWidth = wdt; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(a) * len, h / 2 - Math.cos(a) * len); g.stroke(); };
        hand((hour % 12) / 12 * Math.PI * 2, 60, 10);
        hand(Math.PI / 3, 88, 6);
      }) }));
    face.position.set(x, 3.0, -5.27);
    scene.add(face);
    label(scene, city, 0.5, 0.07, x, 2.78, -5.27, { fg: '#5b4632', px: 46, font: 'Georgia, serif' });
  });

  // framed paintings on the side walls, and brass wall sconces on the back wall
  const painting = (draw, w, h, x, y, z, rotY) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    scene.add(g);
    box(g, 'frame', gold, w + 0.12, h + 0.12, 0.04, 0, 0, 0);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, Math.round(512 * h / w), draw) }));
    pic.position.z = 0.022;
    g.add(pic);
  };
  const seascape = (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#f2c59a'); sky.addColorStop(1, '#f7e3c4');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.6);
    g.fillStyle = '#e9a25b'; g.beginPath(); g.arc(w * 0.68, h * 0.5, h * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f5d7c'; g.fillRect(0, h * 0.58, w, h * 0.42);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 9; i++) g.fillRect(w * (0.1 + (i * 0.37) % 0.8), h * (0.65 + (i % 4) * 0.08), w * 0.12, 3);
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(w * 0.25, h * 0.56); g.lineTo(w * 0.3, h * 0.3); g.lineTo(w * 0.34, h * 0.56); g.fill();
  };
  const city = (g, w, h) => {
    g.fillStyle = '#1f2f4a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(w * 0.8, h * 0.2, h * 0.08, 0, Math.PI * 2); g.fill();
    let x = 0, i = 0;
    while (x < w) { const bw = 40 + (i * 37) % 60, bh = h * (0.3 + ((i * 53) % 40) / 100); g.fillStyle = i % 2 ? '#2c4060' : '#36507a'; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = '#f7e3a0'; for (let y = h - bh + 10; y < h - 10; y += 18) for (let wx = x + 8; wx < x + bw - 8; wx += 14) if ((wx + y + i) % 3) g.fillRect(wx, y, 5, 7); x += bw + 4; i++; }
  };
  painting(seascape, 1.3, 0.85, 4.97, 1.75, -3.2, -Math.PI / 2);
  painting(city, 1.0, 0.7, -4.97, 1.85, -1.6, Math.PI / 2);
  for (const x of [-2.4, 2.4]) {
    box(scene, 'sconcePlate', gold, 0.14, 0.22, 0.03, x, 2.0, -5.28);
    mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xf6e3b8, side: THREE.DoubleSide }), x, 2.14, -5.2).castShadow = false;
  }

  // ---- OUTSIDE: the entrance
  // flags on poles over the marquee
  const flagTex = (top, mid) => canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = top; g.fillRect(0, 0, w, h);
    g.fillStyle = mid; g.fillRect(0, h * 0.38, w, h * 0.24);
    g.fillStyle = '#e8c98a'; g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('GM', w / 2, h / 2 + 3);
  });
  [[-2.6, flagTex('#1f3a5c', '#2a4e78')], [0, flagTex('#7a1f24', '#94282e')], [2.6, flagTex('#1f3a5c', '#2a4e78')]].forEach(([x, tex]) => {
    const pole = new THREE.Group();
    pole.position.set(x, 4.55, 0.02);
    pole.rotation.x = 0.55; // angled out from the wall
    scene.add(pole);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), gold, 0, 0.9, 0, pole);
    mesh(new THREE.SphereGeometry(0.045, 10, 8), gold, 0, 1.82, 0, pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48, 6, 2), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(0.39, 1.5, 0);
    flag.castShadow = true;
    const pos = flag.geometry.attributes.position; // a gentle ripple
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) + 0.375) * 7) * 0.035);
    flag.geometry.computeVertexNormals();
    pole.add(flag);
  });

  // brass lanterns on the stone either side of the windows
  for (const x of [-2.35, 2.35]) {
    box(scene, 'lanternArm', gold, 0.04, 0.04, 0.2, x, 2.35, 0.1);
    box(scene, 'lanternTop', bronze, 0.2, 0.05, 0.2, x, 2.53, 0.22);
    mesh(new THREE.BoxGeometry(0.15, 0.24, 0.15), new THREE.MeshBasicMaterial({ color: 0xffd98a }), x, 2.38, 0.22).castShadow = false;
    box(scene, 'lanternBottom', bronze, 0.18, 0.04, 0.18, x, 2.24, 0.22);
  }

  // brass stanchions with red velvet ropes along the carpet
  const rope = new THREE.MeshStandardMaterial({ color: 0x8e1f24, roughness: 0.8 });
  for (const sx of [-0.95, 0.95]) {
    const zs = [1.45, 2.3, 3.15];
    for (const z of zs) {
      mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 10), gold, sx, 0.45, z);
      mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), gold, sx, 0.02, z);
      mesh(new THREE.SphereGeometry(0.045, 10, 8), gold, sx, 0.92, z);
    }
    for (let i = 0; i < zs.length - 1; i++) {
      const r = mesh(new THREE.CylinderGeometry(0.018, 0.018, zs[i + 1] - zs[i], 8), rope, sx, 0.82, (zs[i] + zs[i + 1]) / 2);
      r.rotation.x = Math.PI / 2;
    }
  }

  // the doorman's stand beside the entrance
  const stand = new THREE.Group();
  stand.position.set(2.75, 0, 1.55);
  stand.rotation.y = -0.4;
  scene.add(stand);
  box(stand, 'standBody', wood, 0.5, 1.05, 0.4, 0, 0.525, 0);
  box(stand, 'standTop', bronze, 0.6, 0.05, 0.5, 0, 1.08, -0.02).rotation.x = -0.2;
  box(stand, 'standPlate', gold, 0.3, 0.08, 0.005, 0, 0.8, 0.203);

  // brass street numbers and a small plaque by the door
  label(scene, '1926', 0.5, 0.16, -1.55, 2.85, 0.01, { fg: '#c9a227', px: 90, font: 'Georgia, serif' });
  label(scene, 'VALET · CONCIERGE', 0.9, 0.12, 1.55, 2.85, 0.01, { fg: '#c9a227', px: 40, font: 'Georgia, serif' });
}

// ---------------------------------------------------------------- the revolving door
export class RevolvingDoor {
  constructor(parts) {
    this.parts = parts;
    this.rot = 0;            // degrees the wings have turned
    this.target = 0;
    this.state = 'idle';     // idle | turning | paused | breakout | locked
    this.rpm = GOOD_RPM;     // controller speed setting
    this.fold = 0;           // 0 normal .. 1 wings folded flat (breakout)
    this.pin = 0;            // 0 up .. 1 down in the socket
    this.pinMax = 1;         // how far the pin can drop (grit in the socket stops it short)
    this.fault = null;
    this.cycle = null;
    this.locked = false;     // TEST DOOR running
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;
    this.timer = 0;
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  tapPull() { this.walkIn(); }
  powerOpen() { this.walkIn(); }
  cardRead() { this.walkIn(); }

  startCycle() {
    this.cycle = { t: 0, passed: false, noTurn: false, tooFast: false, edgeStop: false,
      brokeOut: false, breakFail: false, bkDone: false, drafted: false, lockFail: false, lkDone: false };
  }

  // A guest steps in: the door turns half a revolution to let them through.
  walkIn() {
    const c = this.cycle;
    if (this.state !== 'idle') return;
    if (this.fault === 'motor') {
      SFX.noteTick(); // the controller clicks its relay... the motor never starts
      if (c) c.noTurn = true;
      return;
    }
    SFX.operatorMotor(180 / (this.rpm * 6));
    this.start = this.rot;
    this.target = this.rot + 180;
    this.tripped = false;
    if (c && this.rpm > 4) c.tooFast = true;
    if (c && this.rpm < 2) c.tooSlow = true;
    this.setState('turning');
  }

  // TEST: push hard on the wings, the way a crowd would in a fire.
  breakoutTest() {
    const c = this.cycle;
    if (this.state !== 'idle') return;
    if (this.fault === 'breakout') {
      SFX.clunk(); // the latches hold: the wings don't budge
      if (c) c.breakFail = true;
      setTimeout(() => { if (c) c.bkDone = true; }, 1500);
      return;
    }
    SFX.clunk();
    if (c) c.brokeOut = true;
    this.setState('breakout');
    this.timer = 2.4; // stay folded a moment, then the tech resets the wings
  }

  // TEST: stand still and feel for drafts at the wing ends.
  draftCheck() { if (this.cycle) this.cycle.drafted = true; }

  // TEST: set the night lock, then push on a wing.
  nightTest() {
    if (this.state !== 'idle') return;
    SFX.noteTick();
    this.pinMax = this.fault === 'nightLock' ? 0.35 : 1;
    this.setState('locked');
    this.timer = 3.2;
    this.pushed = false;
  }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    switch (this.state) {
      case 'turning': {
        this.rot = Math.min(this.target, this.rot + this.rpm * 6 * dt);
        if (this.fault === 'safetyEdge' && !this.tripped && this.rot >= this.start + PAUSE_AT) {
          // the crushed switch in the edge reads as "touched someone": the door stops dead
          this.tripped = true;
          SFX.clunk();
          if (c) c.edgeStop = true;
          this.timer = 2.5;
          this.setState('paused');
          break;
        }
        if (this.rot >= this.target) {
          SFX.latchClick(3);
          if (c) c.passed = true;
          this.setState('idle');
          if (this.onClosed) this.onClosed(0, 90);
        }
        break;
      }
      case 'paused':
        this.timer -= dt;
        if (this.timer <= 0) { SFX.operatorMotor(1); this.setState('turning'); }
        break;
      case 'breakout':
        this.timer -= dt;
        this.fold = this.timer > 0.8 ? Math.min(1, this.fold + 2.5 * dt) : Math.max(0, this.fold - 1.5 * dt);
        if (this.timer <= 0 && this.fold <= 0) {
          if (c) c.bkDone = true;
          this.setState('idle');
        }
        break;
      case 'locked': {
        this.timer -= dt;
        this.pin = Math.min(this.pinMax, this.pin + 2 * dt);
        if (!this.pushed && this.timer < 2.2) {
          // someone pushes on a wing: a seated pin holds it, a short one rides out of the socket
          this.pushed = true;
          if (this.pinMax < 1) {
            SFX.scuff();
            this.nudge = 12;
            if (c) c.lockFail = true;
          } else SFX.clunk();
        }
        if (this.nudge) { const d = Math.min(this.nudge, 25 * dt); this.rot += d; this.nudge -= d; }
        if (this.timer <= 0) {
          this.pin = 0;
          this.rot = Math.round(this.rot / 180) * 180; // the tech squares it back up after unlocking
          if (c) c.lkDone = true;
          this.setState('idle');
        }
        break;
      }
    }
    this.apply();
  }

  apply() {
    const p = this.parts;
    p.doorLeaf.rotation.y = (this.rot + REST) * Math.PI / 180;
    // breakout: wings 1 and 3 swing flat against wings 0 and 2 (a "book fold")
    p.wing1.rotation.y = Math.PI / 2 - this.fold * Math.PI / 2 * 0.97;
    p.wing3.rotation.y = 3 * Math.PI / 2 - this.fold * Math.PI / 2 * 0.97;
    p.lockPin.position.y = 0.09 - this.pin * 0.07;
    this.angle = this.state === 'idle' ? 0 : 45;
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// Show (or clear) what each fault looks like.
function showFault(parts, fault) {
  parts.paint.visible = fault === 'breakout';
  parts.grit.visible = fault === 'nightLock';
  parts.motorLED.material.color.set(fault === 'motor' ? 0xff3030 : 0x33ff66);
  parts.edgeMeshes.forEach((e, i) => { e.scale.z = fault === 'safetyEdge' && i === 1 ? 0.45 : 1; }); // one edge crushed flat
  parts.brushMeshes.forEach((b) => {
    b.material.color.set(fault === 'brushes' ? 0x8a8378 : 0x2a2a2a);
    b.scale.x = fault === 'brushes' && b.name === 'brushEnd' ? 0.35 : 1;
    b.scale.y = fault === 'brushes' && b.name === 'brushBottom' ? 0.35 : 1;
  });
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });
const ALL_WINGS = (center, size) => ({
  attach: 'wing0', center, size,
  extra: [1, 2, 3].map((k) => ({ attach: `wing${k}`, center, size })),
});

export default {
  id: 'hotel',
  door: { place: 'Lobby entrance', desc: '4-wing automatic revolving door', customer: 'Grand Meridian Hotel', level: 6 },
  framing: {
    arrival: { cx: 0, xHalf: 3.0, yMin: -0.2, yMax: 4.4 },
    work: { cx: 0, xHalf: 1.5, yMin: -0.1, yMax: 2.9 },
    inside: { cx: 0.6, xHalf: 2.2, yMin: -0.1, yMax: 2.9 },
  },
  build,
  restStates: ['idle'],
  Door: RevolvingDoor,
  hints: {
    idle: 'Tap a part to select it · tap the wings to walk through the door',
    turning: 'Door turning…',
    paused: 'Door stopped…',
    breakout: 'Wings folded flat for an emergency exit',
    locked: 'Night lock set',
  },

  components: {
    breakout: {
      label: 'Center Post & Breakout',
      blurb: 'The wings hang on the center post. Breakout latches let them fold flat when a crowd pushes in an emergency.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([0, 1.2, 0], [0.55, 1.45, 1.9]),
      hit: { center: [0, 1.15, 0], size: [0.24, 2.0, 0.24] },
    },
    controller: {
      label: 'Door Controller',
      blurb: 'Panel on the lobby wall. Sets the turning speed and shows fault codes.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'],
      focus: S([CTL_X, 1.35, -0.33], [CTL_X - 0.25, 1.5, -1.45]),
      hit: { center: [CTL_X, 1.35, -0.36], size: [0.46, 0.56, 0.16] },
    },
    motor: {
      label: 'Drive Motor',
      blurb: 'In the canopy on top of the drum, behind the DRIVE panel. Turns the wings through a gearbox.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([0, H + 0.15, R], [0.3, 1.95, R + 1.35]),
      hit: { center: [0, H + 0.15, R + 0.07], size: [0.75, 0.3, 0.14] },
    },
    safetyEdges: {
      label: 'Wing Safety Edges',
      blurb: 'Rubber edges on the end of each wing. A touch stops the door before it can hurt anyone.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0.75, 0.75, 0.6], [1.35, 1.15, 2.1]),
      hit: ALL_WINGS([R - 0.035, 0.7, 0], [0.1, 1.15, 0.14]),
    },
    brushes: {
      label: 'Sweep Brushes',
      blurb: 'Brushes along the wing ends and bottoms seal against the drum and floor, keeping drafts out.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([0.7, 1.6, 0.6], [1.3, 1.6, 2.1]),
      hit: ALL_WINGS([R - 0.03, 1.72, 0], [0.1, 0.86, 0.12]),
    },
    nightLock: {
      label: 'Night Lock',
      blurb: 'At night a pin on one wing drops into a socket in the drum floor, so the door can\'t be turned.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'],
      focus: S([SOCKETS[1][0], 0.05, SOCKETS[1][1]], [SOCKETS[1][0] + 0.3, 0.85, SOCKETS[1][1] + 1.1]),
      hit: { center: [SOCKETS[1][0], 0.04, SOCKETS[1][1]], size: [0.2, 0.1, 0.2], extra: [{ center: [SOCKETS[0][0], 0.04, SOCKETS[0][1]], size: [0.2, 0.1, 0.2] }] },
    },
  },

  clues: {
    breakout: {
      normal: ['Center post is plumb and tight.', 'Each wing\'s breakout latch is clean and snaps back when pushed.'],
      breakout: [
        'Center post is plumb and tight.',
        'Fresh paint over every breakout latch: the painters went right over them.',
        'Pushing hard on a wing, it doesn\'t fold. One latch is rusted solid under the paint.',
      ],
    },
    controller: {
      normal: ['Display: SPEED 3 RPM. No fault codes.', 'Event log is quiet.'],
      speed: [
        'Display: SPEED 9 RPM, the factory maximum.',
        'Event log: POWER LOSS two days ago, then SETTINGS RESET TO DEFAULT.',
      ],
      safetyEdge: [
        'Display: SPEED 3 RPM.',
        'Event log: "SAFETY EDGE - WING 2" dozens of times a day, even with nobody in the door.',
      ],
      motor: [
        'Display: MOTOR FAULT. The relay clicks when you call for the door to turn.',
        'Breakers and the motor fuse are fine.',
      ],
      nightLock: ['Display: SPEED 3 RPM.', 'Event log: "NIGHT LOCK NOT SEATED" every night this week.'],
    },
    motor: {
      normal: ['Drive panel LED is green.', 'Motor and gearbox run quiet, no heat.'],
      motor: [
        'Drive panel LED is red.',
        'A burnt smell inside the canopy. The motor case is scorched.',
        'Turning the wings by hand, the gearbox is free. The motor itself is dead.',
      ],
      speed: ['Drive panel LED is green.', 'Motor runs strong, but the wings whip around fast.'],
    },
    safetyEdges: {
      normal: ['All four rubber edges are soft and whole.', 'Pressing any edge stops the door instantly.'],
      safetyEdge: [
        'One edge (wing 2) is crushed flat near the bottom, like a cart rammed it.',
        'Pressing it, nothing changes: the switch inside is stuck "pressed" all the time.',
        'The other three edges are fine.',
      ],
    },
    brushes: {
      normal: ['Brushes are full and touch the drum and floor all the way round.'],
      brushes: [
        'The brushes on the wing ends are worn down to the backing.',
        'Daylight shows between the wings and the drum. You can feel cold air.',
        'The bottom brushes slap and rattle on the floor.',
      ],
    },
    nightLock: {
      normal: ['Floor sockets are clean.', 'The lock pin drops all the way in and holds.'],
      nightLock: [
        'The floor socket is packed with grit and a bottle cap.',
        'The pin only drops halfway in, and its setscrew has slipped so it sits short.',
        'Pushed on, the wing rides the pin right out of the socket.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      motor: {
        normal: ['Multimeter: 48 VDC reaching the motor, and it draws normal current.'],
        motor: ['Multimeter: 48 VDC reaching the motor terminals, but the windings read open. The motor is burnt out.'],
      },
      controller: ['Multimeter: controller supply steady at 48 VDC.'],
      safetyEdges: {
        normal: ['Multimeter: each edge switch opens and closes when pressed.'],
        safetyEdge: ['Multimeter: wing 2\'s edge switch reads closed all the time, pressed or not.'],
      },
    },
    level: {
      breakout: ['Level: the center post is plumb.'],
    },
  },

  faults: {
    breakout: {
      name: 'Breakout latches painted over and seized', part: 'breakout', doors: ['hotel'], priority: 'LIFE SAFETY',
      complaint: 'The fire inspector failed our revolving door. He pushed on it and the wings wouldn\'t fold.',
    },
    speed: {
      name: 'Speed reset to maximum', part: 'controller', doors: ['hotel'],
      complaint: 'The revolving door spins so fast it\'s bumping guests on the heels. An older lady almost fell.',
    },
    safetyEdge: {
      name: 'Wing safety edge switch stuck', part: 'safetyEdges', doors: ['hotel'], needsReplacing: true,
      complaint: 'The revolving door stops dead every few minutes with people inside it, then starts again.',
    },
    brushes: {
      name: 'Sweep brushes worn out', part: 'brushes', doors: ['hotel'],
      complaint: 'The lobby is freezing by the front door, and the revolving door whistles and rattles.',
    },
    motor: {
      name: 'Drive motor burnt out', part: 'motor', doors: ['hotel'], priority: 'URGENT', needsReplacing: true,
      complaint: 'The revolving door won\'t turn at all. Guests are dragging their bags around to the side door.',
    },
    nightLock: {
      name: 'Night lock won\'t hold', part: 'nightLock', doors: ['hotel'],
      complaint: 'The night manager locks the revolving door, but it still turns if you push it.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.rpmSet = fault === 'speed' ? 9 : GOOD_RPM;
    door.rpm = JOB.rpmSet;
    JOB.pinSet = fault === 'nightLock' ? -2 : 0;
    showFault(door.parts, fault);
  },

  tests: {
    breakout: { msg: 'Pushed hard on the wings, like a crowd in a fire', run: (d) => d.breakoutTest() },
    controller: { msg: 'Called the door to turn from the controller', run: (d) => d.walkIn() },
    motor: { msg: 'Called the door to turn, listening at the canopy', run: (d) => d.walkIn() },
    safetyEdges: { msg: 'Walked through, watching the safety edges', run: (d) => d.walkIn() },
    brushes: { msg: 'Stood in the door feeling for drafts, then walked through', run: (d) => d.walkIn() },
    nightLock: { msg: 'Set the night lock and pushed on a wing', run: (d) => d.nightTest() },
  },

  checks: [
    ['turns', 'Turns for guests'],
    ['speed', 'Turns at a safe speed'],
    ['smooth', 'Runs without stopping'],
    ['breakout', 'Wings break out in an emergency'],
    ['seal', 'Sealed against drafts'],
    ['lock', 'Night lock holds'],
  ],
  testCycles: [
    { label: 'A guest walks through the door', start: (d) => d.walkIn(),
      done: (c, d) => (c.passed && d.state === 'idle') || (c.noTurn && c.t > 2) || c.t > 30 },
    { label: 'Emergency: push hard on the wings (code check)', start: (d) => d.breakoutTest(),
      done: (c, d) => (c.bkDone && d.state === 'idle') || c.t > 15 },
    { label: 'Draft check, standing in the door', start: (d) => d.draftCheck(), done: (c) => c.t > 1.5 },
    { label: 'Night lock: lock it and push on a wing', start: (d) => d.nightTest(),
      done: (c, d) => (c.lkDone && d.state === 'idle') || c.t > 15 },
  ],
  record(c, index, door) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.turns = !c.noTurn && c.passed;
      if (c.passed) { r.speed = !c.tooFast && !c.tooSlow; r.smooth = !c.edgeStop; }
      if (c.noTurn) symptoms.push('A guest walked up and the door never turned. The motor didn\'t start.');
      if (c.tooFast) symptoms.push('The door spun so fast it bumped the guest on the heels.');
      if (c.tooSlow) symptoms.push('The door crawled so slowly the guest had to push on the wing.');
      if (c.edgeStop) symptoms.push('The door stopped dead partway round with the guest inside, then started again by itself.');
    }
    if (index === 1) {
      r.breakout = !c.breakFail;
      if (c.breakFail) symptoms.push('CODE: pushed hard, the wings would not fold flat for an emergency exit.');
    }
    if (index === 2) {
      r.seal = !(door && door.fault === 'brushes');
      if (!r.seal) symptoms.push('Daylight and cold air come past the worn brushes at the wing ends.');
    }
    if (index === 3) {
      r.lock = !c.lockFail;
      if (c.lockFail) symptoms.push('With the night lock set, a push on a wing still turned the door.');
    }
    return { r, symptoms };
  },

  procedures: {
    breakout: {
      title: 'Freeing the breakout latches',
      start: () => ({ lubed: null }),
      steps: [
        { type: 'look', label: 'Look at the breakout latches', button: 'LOOK',
          reveal: 'Every latch is painted over, and one is rusted solid under the paint. The wings can\'t fold.' },
        { type: 'hold', label: 'Scrape the paint out of each latch', tool: 'screwdriver', verb: 'SCRAPE', count: 4 },
        { type: 'choice', label: 'Free up the rusted latch', key: 'lubed',
          options: [{ label: 'PENETRATING LUBE', tool: 'lubricant', value: true }, { label: 'LEAVE IT', value: false }] },
        { type: 'look', label: 'Push each wing until it breaks out, then reset it', button: 'PUSH',
          reveal: 'Each wing folds back with a firm push and clicks back into place when reset.' },
      ],
      finish(s) {
        if (!s.lubed) return { fixed: false, quality: 45, parts: [] }; // one latch is still rusted shut
        return { fixed: true, quality: 100, parts: [] };
      },
    },
    controller: {
      title: 'Setting the door speed',
      start: (JOB) => ({ rpm: JOB.rpmSet }),
      steps: [
        { type: 'hold', label: 'Open the controller cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'look', label: 'Read the settings', button: 'LOOK',
          reveal: 'SPEED is at 9 RPM, the factory maximum. A power outage reset everything to default.' },
        { type: 'nudge', label: 'Set the turning speed', key: 'rpm', min: 1, max: 10, unit: 'RPM',
          down: '◀ SLOWER', up: 'FASTER ▶',
          info: (s) => {
            if (s.rpm <= 1) return 'Crawling. People will bunch up and push on the wings.';
            if (s.rpm === 2) return 'Slow and safe, but the line backs up at check-in time.';
            if (s.rpm <= 4) return 'A comfortable walking pace for a lobby door.';
            return 'Too fast: the wings will catch people\'s heels.';
          } },
        { type: 'hold', label: 'Close the controller cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
      ],
      finish(s) {
        const fixed = s.rpm >= 2 && s.rpm <= 4;
        return { fixed, quality: !fixed ? 40 : s.rpm === 3 ? 100 : 85, parts: [] };
      },
    },
    safetyEdges: {
      title: 'Checking the safety edge',
      start: () => ({}),
      steps: [
        { type: 'hold', label: 'Pull the end cap off the crushed edge', tool: 'screwdriver', verb: 'REMOVE', count: 1 },
        { type: 'look', label: 'Look inside the edge', button: 'LOOK',
          reveal: 'The switch strip inside is crushed and stays closed. It can\'t be adjusted, only replaced.' },
        { type: 'hold', label: 'Put the end cap back', tool: 'screwdriver', verb: 'INSTALL', count: 1 },
      ],
      finish() { return { fixed: false, quality: 40, parts: [] }; },
    },
    brushes: {
      title: 'Replacing the sweep brushes',
      start: () => ({ brushes: null }),
      steps: [
        { type: 'look', label: 'Look at the brushes', button: 'LOOK',
          reveal: 'The brushes on all four wings are worn down to the backing strip.' },
        { type: 'choice', label: 'The worn brushes', key: 'brushes',
          options: [{ label: 'NEW SWEEP BRUSHES', part: 'sweepBrushes', value: 'new' }, { label: 'FLUFF UP THE OLD ONES', value: 'old' }] },
        { type: 'hold', label: 'Fit the brushes on each wing', tool: 'screwdriver', verb: 'FASTEN', count: 4 },
      ],
      finish(s) {
        if (s.brushes !== 'new') return { fixed: false, quality: 35, parts: [] };
        return { fixed: true, quality: 100, parts: [] };
      },
    },
    nightLock: {
      title: 'Fixing the night lock',
      start: (JOB) => ({ clean: null, pin: JOB.pinSet }),
      steps: [
        { type: 'choice', label: 'The floor socket is packed with grit', key: 'clean',
          options: [{ label: 'CLEAN OUT THE SOCKET', value: true }, { label: 'LEAVE IT', value: false }] },
        { type: 'hold', label: 'Loosen the pin\'s setscrew', tool: 'allenKeys', verb: 'LOOSEN', count: 1 },
        { type: 'nudge', label: 'Set how far the pin drops', key: 'pin', min: -3, max: 3, unit: 'clicks',
          down: '▲ SHORTER', up: 'LONGER ▼',
          info: (s) => (s.pin === 0 ? 'The pin drops all the way into the socket and bottoms out.'
            : s.pin < 0 ? 'Too short: the pin barely reaches into the socket.'
            : 'Too long: the pin drags on the drum floor as the door turns.') },
        { type: 'hold', label: 'Tighten the setscrew', tool: 'allenKeys', verb: 'TIGHTEN', count: 1 },
      ],
      finish(s) {
        const fixed = !!s.clean && s.pin === 0;
        return { fixed, quality: fixed ? 100 : 40, parts: [] };
      },
    },
  },
  repairTools: {
    breakout: { ADJUST: ['screwdriver', 'lubricant'] },
    controller: { ADJUST: ['screwdriver'] },
    motor: { REPLACE: ['wrench', 'screwdriver'] },
    safetyEdges: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    brushes: { ADJUST: ['screwdriver'] },
    nightLock: { ADJUST: ['allenKeys', 'screwdriver'] },
  },
  parts: {
    safetyEdge: { cabinet: 'electrical', name: 'Revolving door safety edge', cost: 95, note: 'Rubber edge with a pressure switch strip.' },
    sweepBrushes: { cabinet: 'exits', name: 'Sweep brush set (4 wings)', cost: 76, note: 'Nylon brush strips for revolving door wings.' },
    revMotor: { cabinet: 'electrical', name: 'Revolving door drive motor', cost: 680, note: '48 VDC gear motor.' },
  },
  replacements: { safetyEdges: 'safetyEdge', motor: 'revMotor', controller: null, breakout: null, brushes: null, nightLock: null },

  // Make the door behave the way a finished repair left it.
  applyRepair(door, partId, result, state, JOB) {
    if (partId === 'controller' && state.rpm !== undefined) {
      door.rpm = state.rpm;
      if (!result.fixed) door.fault = 'speed';
    }
    if (result.fixed) showFault(door.parts, door.fault); // the repaired part goes back to normal
  },
};
