// sites/firestation.js — Fire Station 7, apparatus bay 1. (A DRAFT: see drafts.js.)
//
// A tall FULL-VIEW SECTIONAL door: five aluminum sections, every one of them glass,
// on rollers in tracks that curve back along the ceiling. Two TORSION SPRINGS on a shaft over
// the door balance it, with LIFT CABLES running from drums on the shaft ends down to the bottom
// corners. A wall-mounted OPERATOR turns the shaft. A pressure SAFETY EDGE along the bottom
// reverses the door when it touches anything. The engine opens it from a REMOTE in the cab.
// The engine has been pulled out onto the apron while the door is worked on.
//
// New here: THE ALARM DRILL. Every call here is top priority, and the door test includes a
// station alert: the door must open from the engine's remote, fast, or the engine can't roll.
//
// Faults (from the "Picked: fire station sectional door" plan):
//   spring    a torsion spring snapped -> the operator can't lift the door (lockout, two-person job)
//   cable     a lift cable came off its drum -> door goes up crooked and hangs up
//   edge      bottom safety edge wire cut -> door reverses every time it tries to close
//   slow      operator turned down to slow speed, belt glazed -> door takes forever to open
//   glass     a glass section cracked (hose nozzle) -> cracked window in the door
//   remote    remote in the engine dead (flat battery, lost pairing) -> engine can't open the door

import * as THREE from 'three';
import { MAT, box, glassPane } from './src-sceneKit.js';
import { fireEngine2 } from './src-vehicles2.js';
import * as SFX from './src-audio.js';

const W = 4.2, H = 4.3;               // the opening (14 ft x 14 ft)
const N = 5, PH = H / N;              // five sections
const DZ = -0.36;                     // the door rides just inside the wall
const RAD = 0.5;                      // track curve radius
const ARC = RAD * Math.PI / 2;
const TRACK_Y = H + RAD;
const TX = W / 2 + 0.07;              // track centerline
const SHAFT_Y = H + 0.55;             // spring shaft over the door
const GOOD_SPEED = 8;                 // operator speed setting a station wants (1-10)
const ALERT_SECONDS = 12;             // the door must be all the way up this fast on an alarm
const HANG_AT = 0.22;                 // a cable off its drum: the door hangs up crooked here
const GOOD_TURNS = 9;                 // spring winding turns for this door
const ENGINE = { x: -7.6, z: 4.7 };   // the engine on the apron (parked along the building)

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
const meshSet = (meshes) => ({ traverse: (fn) => meshes.forEach(fn), isMeshSet: true });

// Where a point `d` meters along the track sits: up the side, round the curve, back along the ceiling.
function along(d) {
  if (d <= H) return { y: d, z: DZ, rot: 0 };
  if (d <= H + ARC) {
    const t = (d - H) / RAD;
    return { y: H + RAD * Math.sin(t), z: DZ - RAD * (1 - Math.cos(t)), rot: -t };
  }
  return { y: TRACK_Y, z: DZ - RAD - (d - H - ARC), rot: -Math.PI / 2 };
}

// A thin rod between two points (the lift cables).
function setRod(mesh, a, b) {
  const d = b.clone().sub(a);
  const len = Math.max(0.001, d.length());
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

// ---------------------------------------------------------------- the 3D building
function build(scene, parts) {
  const brickTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9c1b4'; g.fillRect(0, 0, w, h);
    for (let y = 0, r = 0; y < h; y += 21, r++) for (let x = r % 2 ? -32 : 0; x < w; x += 64) {
      const shade = 120 + ((x * 7 + y * 13) % 30);
      g.fillStyle = `rgb(${shade + 30}, ${shade - 70}, ${shade - 85})`;
      g.fillRect(x + 2, y + 2, 60, 17);
    }
  });
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  const brick = (w, h) => { const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(w / 1.6, h / 1.6); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); };
  const stone = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.8 });
  const T = 0.3, zc = -T / 2;
  const B2 = 5.4;                         // bay 2 center
  const TOP = 6.4;
  box(scene, 'wallL', brick(4, TOP), 4, TOP, T, -W / 2 - 2, TOP / 2, zc);
  box(scene, 'wallMid', brick(B2 - W, TOP), B2 - W, TOP, T, B2 / 2, TOP / 2, zc);
  box(scene, 'wallR', brick(4, TOP), 4, TOP, T, B2 + W / 2 + 2, TOP / 2, zc);
  for (const x of [0, B2]) {
    box(scene, 'wallOver', brick(W, TOP - H), W, TOP - H, T, x, (TOP + H) / 2, zc);
    box(scene, 'lintel', stone, W + 0.3, 0.3, T + 0.04, x, H + 0.15, zc);
  }
  box(scene, 'cornice', stone, 14.6, 0.35, 0.5, B2 / 2, TOP + 0.05, -0.05);
  label(scene, 'FIRE STATION 7', 4.6, 0.6, B2 / 2, 5.75, 0.01, { bg: '#e6e0d4', fg: '#8e1219', px: 54, font: 'Georgia, serif' });
  label(scene, 'ENGINE 7', 1.5, 0.3, 0, H + 0.48, 0.01, { fg: '#f6e6a8', bg: '#8e1219', px: 70 });
  label(scene, 'LADDER 7', 1.5, 0.3, B2, H + 0.48, 0.01, { fg: '#f6e6a8', bg: '#8e1219', px: 70 });
  // round station badge between the bays
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8e1219'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d9a520'; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#d9a520'; g.font = 'bold 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('7', w / 2, h / 2 + 6);
    }) }));
  badge.position.set(B2 / 2, 3.2, 0.01);
  scene.add(badge);
  // apron: concrete with a yellow KEEP CLEAR box in front of each bay
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(22, 10), new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.9 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.003, 5);
  apron.receiveShadow = true;
  scene.add(apron);
  for (const x of [0, B2]) {
    const keep = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4), new THREE.MeshBasicMaterial({ transparent: true,
      map: canvasTex(512, 300, (g, w, h) => {
        g.strokeStyle = '#e8c21a'; g.lineWidth = 14; g.strokeRect(8, 8, w - 16, h - 16);
        g.lineWidth = 10;
        for (let k = -h; k < w; k += 70) { g.beginPath(); g.moveTo(k, h - 10); g.lineTo(k + h, 10); g.stroke(); }
        g.fillStyle = '#b9b6ae'; g.fillRect(90, 100, w - 180, 100);
        g.fillStyle = '#e8c21a'; g.font = 'bold 72px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('KEEP CLEAR', w / 2, h / 2 + 2);
      }) }));
    keep.rotation.x = -Math.PI / 2;
    keep.position.set(x, 0.006, 1.6);
    scene.add(keep);
  }
  // the engine, pulled out onto the apron (its remote is the "remote" part)
  const engine = fireEngine2(scene, { x: ENGINE.x, z: ENGINE.z, rotY: 0 });
  parts.engine = engine;
  // remote clipped to the visor, inside the cab (local coords: front of cab, driver's side)
  const remote = new THREE.Group();
  remote.name = 'remote';
  remote.position.set(ENGINE.x + 3.45, 2.5, ENGINE.z - 0.55);
  scene.add(remote);
  box(remote, 'remoteBody', new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.5 }), 0.06, 0.05, 0.11, 0, 0, 0);
  const rLed = box(remote, 'remoteLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.012, 0.012, 0.012, 0.03, 0.03, 0.03);
  rLed.castShadow = false;
  parts.remote = remote;
  parts.remoteLED = rLed;
  // hydrant and a coiled hose by the apron
  const hydrant = new THREE.Group();
  hydrant.position.set(-3.6, 0, 1.3);
  scene.add(hydrant);
  const hRed = new THREE.MeshStandardMaterial({ color: 0xc0151c, roughness: 0.4, metalness: 0.3 });
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.7, 16), hRed); hb.position.y = 0.35; hb.castShadow = true; hydrant.add(hb);
  const hc = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), hRed); hc.position.y = 0.72; hydrant.add(hc);
  for (const sx of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10), hRed); n.rotation.z = Math.PI / 2; n.position.set(sx * 0.17, 0.48, 0); hydrant.add(n); }

  // ---- inside: the apparatus floor, turnout gear, a fire pole, the alert beacon
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.MeshStandardMaterial({ color: 0x9b3a2e, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(B2 / 2, 0.002, -5.7);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.MeshStandardMaterial({ color: 0x6a6d71 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(B2 / 2, 6.0, -5.7);
  scene.add(ceil);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.9 }));
  back.position.set(B2 / 2, 3, -11.2);
  scene.add(back);
  for (const sx of [-5.3, 10.7]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(11, 6), new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.9 }));
    wall.position.set(sx, 3, -5.7);
    wall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(wall);
  }
  for (const [x, z] of [[0, -3.5], [0, -7.5], [B2, -5.5]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.0), new THREE.MeshBasicMaterial({ color: 0xf4f7ff }));
    l.rotation.x = Math.PI / 2;
    l.position.set(x + 1.6, 5.98, z);
    scene.add(l);
  }
  const glow = new THREE.PointLight(0xf1f5ff, 4, 13, 1.3);
  glow.position.set(0.5, 5.0, -4);
  scene.add(glow);
  // turnout gear lockers along the left wall: coats, helmets, boots
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.8 });
  const frameM = new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const z = -2.2 - i * 0.9;
    box(scene, 'locker', frameM, 0.6, 2.0, 0.8, -4.9, 1.0, z);
    box(scene, 'coat', yellow, 0.25, 0.9, 0.6, -4.62, 1.4, z);
    box(scene, 'reflect', new THREE.MeshStandardMaterial({ color: 0xe9eef2, metalness: 0.4, roughness: 0.3 }), 0.26, 0.06, 0.62, -4.61, 1.15, z);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? new THREE.MeshStandardMaterial({ color: 0x1b1b1d }) : new THREE.MeshStandardMaterial({ color: 0xf2f2ef }));
    helmet.position.set(-4.75, 2.05, z);
    scene.add(helmet);
    box(scene, 'boots', new THREE.MeshStandardMaterial({ color: 0x1b1b1d }), 0.25, 0.4, 0.45, -4.7, 0.22, z);
  }
  // brass fire pole down from the dorm
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.2 }));
  pole.position.set(-3.2, 3, -8.8);
  scene.add(pole);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.9 }));
  pad.position.set(-3.2, 0.04, -8.8);
  scene.add(pad);
  // hose rack on the back wall
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9d4c8 : 0xb3161c, roughness: 0.8 }));
    coil.position.set(0.8 + i * 0.85, 1.4, -11.1);
    scene.add(coil);
  }
  label(scene, 'APPARATUS BAY · NO PARKING', 3.4, 0.3, 1.5, 3.2, -11.15, { bg: '#8e1219', fg: '#ffffff', px: 28 });
  // ladder truck in bay 2, seen through its glass door
  fireEngine2(scene, { x: B2, z: -5.4, rotY: -Math.PI / 2, number: '7' });
  // ALERT beacon on the inside wall by bay 1: flashes on a station alarm
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a1010 }));
  beacon.position.set(W / 2 + 0.6, H + 0.6, -T - 0.12);
  beacon.rotation.x = -Math.PI / 2;
  scene.add(beacon);
  parts.beacon = beacon;
  label(scene, 'ALERT', 0.5, 0.14, W / 2 + 0.6, H + 0.35, -T - 0.005, { bg: '#8e1219', fg: '#ffffff', px: 60, rotY: Math.PI });

  // bay 2's door: same kind of door, always shut (scenery)
  const alum = new THREE.MeshStandardMaterial({ color: 0xc6cbd0, metalness: 0.6, roughness: 0.35 });
  for (let i = 0; i < N; i++) {
    const y = PH * i + PH / 2;
    box(scene, 'bay2Rail', alum, W, 0.08, 0.06, B2, PH * i + 0.04, DZ);
    for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) box(scene, 'bay2Stile', alum, 0.08, PH, 0.06, B2 + x, y, DZ);
    for (let k = 0; k < 4; k++) {
      glassPane(scene, W / 4 - 0.1, PH - 0.14, B2 - W / 2 + W / 8 + k * W / 4, y, DZ);
      if (k) box(scene, 'bay2Mullion', alum, 0.05, PH, 0.06, B2 - W / 2 + k * W / 4, y, DZ);
    }
  }

  // ---- the DOOR: five sections (doorLeaf holds them; each rides the track)
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const rollers = [];
  for (let i = 0; i < N; i++) {
    const p = new THREE.Group();
    leaf.add(p);
    parts[`panel${i}`] = p;
    box(p, 'rail', alum, W, 0.08, 0.06, 0, -PH / 2 + 0.04, 0);
    box(p, 'railTop', alum, W, 0.04, 0.06, 0, PH / 2 - 0.02, 0);
    for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) box(p, 'stile', alum, 0.08, PH, 0.06, x, 0, 0);
    for (let k = 0; k < 4; k++) {
      glassPane(p, W / 4 - 0.1, PH - 0.14, -W / 2 + W / 8 + k * W / 4, 0.02, 0);
      if (k) box(p, 'mullion', alum, 0.05, PH, 0.06, -W / 2 + k * W / 4, 0, 0);
    }
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), MAT.black);
      r.rotation.z = Math.PI / 2;
      r.position.set(sx * (TX - 0.01), -PH / 2 + 0.12, -0.02);
      p.add(r);
      rollers.push(r);
    }
  }
  // the crack in a pane of section 1 (shown on that fault)
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(W / 4 - 0.1, PH - 0.14), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false,
    map: canvasTex(256, 192, (g, w, h) => {
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
      const cx = w * 0.42, cy = h * 0.55;
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7 + 0.3; let x = cx, y = cy;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 5; s++) { x += Math.cos(a + (s % 2 ? 0.25 : -0.2)) * (14 + s * 6); y += Math.sin(a + (s % 2 ? 0.25 : -0.2)) * (14 + s * 6); g.lineTo(x, y); }
        g.stroke();
      }
      for (const r of [10, 22]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    }) }));
  crack.position.set(-W / 2 + W / 8 + W / 4, 0.02, 0.006); // second pane from the left
  crack.userData.seeThrough = true;
  crack.visible = false;
  parts.panel1.add(crack);
  parts.crack = crack;
  parts.glass = parts.panel1;
  // pressure SAFETY EDGE: rubber along the bottom of section 0 (cut wire shown on that fault)
  const edge = box(parts.panel0, 'safetyEdge', new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }), W - 0.04, 0.06, 0.07, 0, -PH / 2 - 0.02, 0);
  const cut = box(parts.panel0, 'cutWire', new THREE.MeshStandardMaterial({ color: 0xc0392b }), 0.18, 0.012, 0.012, W / 2 - 0.4, -PH / 2 + 0.06, -0.05);
  cut.rotation.z = 0.6;
  cut.visible = false;
  parts.safetyEdge = meshSet([edge]);
  parts.edgeCut = cut;

  // TRACKS
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.6, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    box(scene, 'trackV', trackMat, 0.05, H, 0.09, sx * TX, H / 2, DZ - 0.02);
    const curve = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.028, 6, 16, Math.PI / 2), trackMat);
    curve.rotation.y = -Math.PI / 2;
    curve.position.set(sx * TX, H, DZ - RAD);
    scene.add(curve);
    box(scene, 'trackH', trackMat, 0.05, 0.09, 4.6, sx * TX, TRACK_Y, DZ - RAD - 2.3);
    box(scene, 'trackHanger', frameM, 0.03, 6.0 - TRACK_Y, 0.03, sx * TX, (6.0 + TRACK_Y) / 2, DZ - RAD - 4.4);
  }

  // SPRINGS on the shaft over the door (two springs, the center bracket between them)
  const springs = new THREE.Group();
  springs.name = 'springs';
  scene.add(springs);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, W + 0.5, 10), MAT.stainless);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, SHAFT_Y, DZ - 0.15);
  springs.add(shaft);
  box(springs, 'centerBracket', frameM, 0.12, 0.2, 0.12, 0, SHAFT_Y, DZ - 0.12);
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.4 });
  const coils = [];
  for (const side of [-1, 1]) for (let k = 0; k < 30; k++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.011, 6, 16), coilMat);
    coil.rotation.y = Math.PI / 2;
    coil.position.set(side * (0.12 + k * 0.034), SHAFT_Y, DZ - 0.15);
    coil.userData.side = side; coil.userData.k = k;
    springs.add(coil);
    coils.push(coil);
  }
  label(springs, 'DANGER: HIGH TENSION', 0.6, 0.1, -0.8, SHAFT_Y - 0.17, DZ - 0.08, { bg: '#c0392b', fg: '#ffffff', px: 36, rotY: Math.PI });
  parts.springs = springs;
  parts.coils = coils;

  // CABLE DRUMS on the shaft ends, and the lift CABLES down to the bottom corners
  const cables = new THREE.Group();
  cables.name = 'cables';
  scene.add(cables);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x8e959c, metalness: 0.8, roughness: 0.3 });
  parts.cableRods = [];
  for (const sx of [-1, 1]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 18), MAT.stainless);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(sx * (W / 2 + 0.02), SHAFT_Y, DZ - 0.15);
    cables.add(drum);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), cableMat);
    cables.add(rod);
    parts.cableRods.push(rod);
  }
  // the slack cable loop hanging off the left drum (shown on that fault)
  const loopPts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; loopPts.push(new THREE.Vector3(-W / 2 - 0.02 - Math.sin(t * Math.PI) * 0.18, SHAFT_Y - 0.1 - t * 1.4, DZ - 0.15 + Math.sin(t * Math.PI * 2) * 0.08)); }
  const loop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts), 40, 0.007, 6, false), cableMat);
  loop.visible = false;
  cables.add(loop);
  parts.cableLoop = loop;
  parts.cables = cables;

  // OPERATOR: jackshaft operator on the wall right of the door, turning the shaft
  const op = new THREE.Group();
  op.name = 'operator';
  scene.add(op);
  box(op, 'opBox', new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.5 }), 0.42, 0.6, 0.36, W / 2 + 0.45, SHAFT_Y - 0.1, DZ - 0.22);
  const opLed = box(op, 'opLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.03, 0.03, 0.005, W / 2 + 0.6, SHAFT_Y + 0.08, DZ - 0.405);
  opLed.castShadow = false;
  box(op, 'opControl', new THREE.MeshStandardMaterial({ color: 0xe9e6df }), 0.16, 0.24, 0.05, W / 2 + 0.6, 1.4, -T - 0.025);
  for (const [y, c] of [[1.47, 0x2e9e4f], [1.4, 0x222222], [1.33, 0xc0392b]]) box(op, 'opButton', new THREE.MeshStandardMaterial({ color: c }), 0.04, 0.04, 0.02, W / 2 + 0.6, y, -T - 0.055);
  parts.operator = op;
}

// ---------------------------------------------------------------- the door
export class FireBayDoor {
  constructor(parts) {
    this.parts = parts;
    this.open = 0;
    this.state = 'closed';    // closed | operating | holding | closing | stuck
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;
    this.speedLevel = GOOD_SPEED;
    this.beltWorn = false;
    this.autoClose = false;
    this.obstruct = false;
    this.alarm = 0;
    this.opening = null;     // when this opening started (cycle time)
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  powerOpen() { this.toggle(); }
  cardRead() { this.toggle(); }
  tapPull() { this.toggle(); } // tap the door = the wall control

  get speed() { return 0.03 * this.speedLevel * (this.beltWorn ? 0.6 : 1); }

  toggle() {
    if (this.state === 'closed' || this.state === 'closing') this.goUp();
    else if (this.state === 'holding' || this.state === 'stuck') this.goDown();
  }

  // the remote clipped in the engine's cab
  remotePress() {
    if (this.fault === 'remote') {
      SFX.noteTick(); // click... the operator never hears it
      if (this.cycle) this.cycle.remoteDead = true;
      return;
    }
    SFX.readerBeep();
    this.toggle();
  }

  goUp() {
    if (this.open >= 1) return;
    const c = this.cycle;
    if (this.fault === 'spring') {
      // with a spring broken, the door weighs half a ton: the operator hums and lifts it an inch
      SFX.operatorMotor(1.2);
      SFX.clunk();
      this.open = Math.max(this.open, 0.012);
      if (c) { c.noLift = true; c.finished = true; }
      this.setState('stuck');
      return;
    }
    if (this.fault === 'cable' && this.open >= HANG_AT - 0.005) {
      SFX.clunk();
      if (c) { c.hung = true; c.finished = true; }
      this.setState('stuck');
      return;
    }
    SFX.operatorMotor(Math.max(0.6, (1 - this.open) / this.speed));
    if (c && this.open < 0.02) this.opening = c.t;
    this.setState('operating');
  }

  goDown() {
    if (this.open <= 0 || this.state === 'closing') return;
    SFX.operatorMotor(1.4);
    this.setState('closing');
  }

  startCycle() {
    this.cycle = { t: 0, reachedTop: false, closedFully: false, finished: false, hung: false, noLift: false,
      edgeRev: false, safetyStop: false, remoteDead: false, openSecs: null, glassCheck: false };
  }

  // TEST: a station alert. The beacon flashes, and the engine's remote opens the door.
  stationAlert() {
    this.alarm = 4;
    for (let i = 0; i < 6; i++) setTimeout(() => SFX.readerBeep(), i * 260);
    setTimeout(() => this.remotePress(), 700);
  }

  // TEST: close from the wall control.
  closeFromWall() {
    if (this.state === 'holding' || this.state === 'stuck') this.goDown();
    else { this.autoClose = true; this.goUp(); }
  }

  // TEST: close on a hose line lying across the doorway: the edge must reverse it.
  closeOnHose() {
    this.obstruct = true;
    if (this.state === 'holding' || this.state === 'stuck') this.goDown();
    else { this.autoClose = true; this.goUp(); }
  }

  glassCheck() { if (this.cycle) this.cycle.glassCheck = true; }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    if (this.alarm > 0) {
      this.alarm -= dt;
      const on = Math.floor(this.alarm * 6) % 2 === 0 && this.alarm > 0;
      this.parts.beacon.material.color.set(on ? 0xff2a2a : 0x5a1010);
    }
    switch (this.state) {
      case 'operating':
        this.open = Math.min(1, this.open + this.speed * dt);
        if (this.fault === 'cable' && this.open >= HANG_AT) {
          // one side has no cable holding it: the door racks crooked and jams in the track
          this.open = HANG_AT;
          SFX.scrape(0.8);
          if (c) { c.hung = true; c.finished = true; }
          this.autoClose = false;
          this.setState('stuck');
          break;
        }
        if (this.open >= 1) {
          if (c) {
            c.reachedTop = true;
            if (this.opening !== null) c.openSecs = c.t - this.opening;
            if (!this.autoClose) c.finished = true;
          }
          this.opening = null;
          this.setState('holding');
          if (this.autoClose) setTimeout(() => { if (this.state === 'holding') this.goDown(); }, 900);
        }
        break;
      case 'closing': {
        this.open = Math.max(0, this.open - this.speed * 1.2 * dt);
        if (this.fault === 'edge' && this.open < 0.97) {
          // the cut wire reads as "the edge hit something": it reverses before it gets anywhere
          SFX.clunk();
          if (c) { c.edgeRev = true; c.finished = true; }
          this.autoClose = false;
          this.obstruct = false;
          this.setState('operating');
          break;
        }
        if (this.obstruct && this.open < 0.02) {
          SFX.clunk();
          if (c) { c.safetyStop = true; }
          this.obstruct = false;
          this.autoClose = false;
          this.setState('operating');
          if (c) setTimeout(() => { if (this.cycle === c) c.finished = true; }, 2000);
          break;
        }
        if (this.open <= 0) {
          SFX.latchClick(12);
          if (c) { c.closedFully = true; c.finished = true; }
          this.autoClose = false;
          this.setState('closed');
          if (this.onClosed) this.onClosed(0, 0);
        }
        break;
      }
    }
    this.apply();
  }

  apply() {
    const p = this.parts;
    const crooked = this.fault === 'cable' && this.open > 0.05;
    for (let i = 0; i < N; i++) {
      const a = along(i * PH + this.open * H + PH / 2);
      const panel = p[`panel${i}`];
      panel.position.set(0, a.y, a.z);
      panel.rotation.set(a.rot, 0, crooked ? 0.025 : 0);
    }
    if (crooked) p.panel0.position.y -= 0.03;
    // lift cables: from each drum down to the bottom corner of section 0
    const bottom = along(this.open * H);
    p.cableRods.forEach((rod, k) => {
      const sx = k === 0 ? -1 : 1;
      const slack = this.fault === 'cable' && sx === -1;
      rod.visible = !slack;
      const top = new THREE.Vector3(sx * (W / 2 + 0.02), SHAFT_Y - 0.11, DZ - 0.15);
      const end = new THREE.Vector3(sx * (W / 2 - 0.02), Math.min(bottom.y + 0.05, SHAFT_Y - 0.2), Math.max(bottom.z, DZ - 0.15) - 0.03);
      setRod(rod, top, end);
    });
    this.angle = this.open * 90;
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// Show (or clear) what each fault looks like.
function showFault(parts, fault) {
  // a snapped spring: the coils on the left spring spread apart where it broke
  for (const coil of parts.coils) {
    const broken = fault === 'spring' && coil.userData.side === -1;
    const k = coil.userData.k;
    const gap = broken && k >= 15 ? 0.18 : 0;
    coil.position.x = coil.userData.side * (0.12 + k * 0.034 + gap);
    coil.rotation.z = broken && (k === 14 || k === 15) ? 0.5 : 0;
  }
  parts.cableLoop.visible = fault === 'cable';
  parts.edgeCut.visible = fault === 'edge';
  parts.crack.visible = fault === 'glass';
  parts.remoteLED.material.color.set(fault === 'remote' ? 0x1a1a1a : 0x33ff66);
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });
const LOCKOUT_STEP = {
  type: 'choice', label: 'Before touching the door', key: 'lockout',
  info: () => 'Unplug the operator and clamp vise grips on the track under a roller, so the door can\'t move while you work.',
  options: [{ label: 'UNPLUG + CLAMP + TAG', value: true }, { label: 'SKIP IT', value: false }],
};
function lockoutResult(s, JOB) {
  if (s.lockout === false) {
    JOB.safetyIssues = (JOB.safetyIssues || 0) + 1;
    JOB.safetyNote = JOB.safetyNote ? `${JOB.safetyNote}, no lockout` : 'no lockout';
  }
}

export default {
  id: 'firestation',
  door: { place: 'Apparatus bay 1', desc: 'full-view glass sectional door, 14 x 14 ft', customer: 'Fire Station 7', level: 8 },
  framing: {
    arrival: { cx: 0.6, xHalf: 3.4, yMin: -0.2, yMax: 6.6 },  // keep it tight: wider puts the camera across the street
    work: { cx: 0, xHalf: 2.6, yMin: -0.1, yMax: 5.2 },
    inside: { cx: 0, xHalf: 2.8, yMin: -0.1, yMax: 5.4 },
  },
  build,
  restStates: ['closed', 'holding', 'stuck'],
  Door: FireBayDoor,
  hints: {
    closed: 'Tap a part to select it · tap the door to run it up',
    holding: 'Tap the door to run it down',
    operating: 'Door going up…',
    closing: 'Door coming down…',
    stuck: 'Door is hung up. Tap it to run it back down.',
  },

  components: {
    springs: {
      label: 'Torsion Springs',
      blurb: 'Two wound springs on the shaft over the door carry its half-ton weight. Winding them is a two-person job with winding bars.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([-0.6, SHAFT_Y, DZ - 0.15], [-0.2, 3.6, -2.4]),
      hit: { center: [0, SHAFT_Y, DZ - 0.15], size: [W - 0.5, 0.26, 0.26] },
    },
    cables: {
      label: 'Lift Cables & Drums',
      blurb: 'Steel cables wind onto drums at the ends of the spring shaft and lift the door by its bottom corners.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([-W / 2, SHAFT_Y - 0.6, DZ - 0.15], [-W / 2 + 1.3, 3.3, -2.2]),
      hit: { center: [-W / 2 - 0.02, SHAFT_Y, DZ - 0.15], size: [0.24, 0.32, 0.32],
        extra: [{ center: [W / 2 + 0.02, SHAFT_Y, DZ - 0.15], size: [0.24, 0.32, 0.32] }] },
    },
    safetyEdge: {
      label: 'Bottom Safety Edge',
      blurb: 'A pressure edge along the bottom of the door. If it touches anything on the way down, the door reverses.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([1.2, 0.1, DZ], [1.7, 0.9, 1.8]),
      hit: { attach: 'panel0', center: [0, -PH / 2 - 0.01, 0], size: [W - 0.6, 0.1, 0.14] },
    },
    operator: {
      label: 'Door Operator',
      blurb: 'Jackshaft operator on the wall beside the door. It turns the spring shaft, and its speed and belt set how fast the door opens.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([W / 2 + 0.45, SHAFT_Y - 0.2, DZ - 0.22], [W / 2 - 0.4, 3.4, -2.0]),
      hit: { center: [W / 2 + 0.45, SHAFT_Y - 0.1, DZ - 0.22], size: [0.55, 0.72, 0.5] },
    },
    glass: {
      label: 'Glass Sections',
      blurb: 'Every section is tempered glass in aluminum frames, so the crew can see out onto the apron.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([-W / 2 + W / 8 + W / 4, PH * 1.5, DZ], [-0.6, 1.6, 2.4]),
      hit: { attach: 'panel1', center: [0, 0, 0.02], size: [W - 0.4, PH - 0.2, 0.1] },
    },
    remote: {
      label: 'Engine Remote',
      blurb: 'The door remote clipped to the visor in Engine 7\'s cab. On a call, the driver opens the door from the seat.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([ENGINE.x + 3.45, 2.45, ENGINE.z - 0.55], [ENGINE.x + 4.9, 2.6, ENGINE.z + 0.6]),
      hit: { center: [ENGINE.x + 3.45, 2.5, ENGINE.z - 0.55], size: [0.35, 0.3, 0.4] },
    },
  },

  clues: {
    springs: {
      normal: ['Warning tag: HIGH TENSION.', 'Both springs are whole, no gaps in the coils.', 'Operator unhooked, the door stays put halfway: balanced.'],
      spring: [
        'The left spring has snapped: a gap of about 6 inches in the middle of its coils.',
        'The cables have gone slack on the drums.',
        'With the operator unhooked, the door is too heavy to lift by hand.',
      ],
      cable: ['Both springs are whole.', 'The left drum is spinning loose: no cable on it.'],
    },
    cables: {
      normal: ['Both cables are tight and wound neatly in the drum grooves.'],
      cable: [
        'The left cable has jumped off its drum and hangs in a slack loop.',
        'The right cable is tight, so the door lifts on one side only.',
        'Fresh scrape marks inside the left track where the door racked.',
      ],
      spring: ['Both cables have gone slack: nothing is pulling on the drums.'],
    },
    safetyEdge: {
      normal: ['Rubber edge is whole along the bottom.', 'Pressing it, the operator\'s light blinks: edge works.'],
      edge: [
        'The edge\'s coiled cord is cut through at the right end. Bare copper shows.',
        'The operator\'s light blinks "EDGE" constantly, even with nothing touching it.',
      ],
    },
    operator: {
      normal: ['Display: SPEED 8.', 'Drive belt is tight and dry.'],
      slowOpen: [
        'Display: SPEED 2. Somebody turned it down to "save the door".',
        'The drive belt is glazed shiny and slips when the door starts up.',
      ],
      spring: ['The operator hums and strains, then trips its overload: the door is far too heavy.'],
      edge: ['Display: EDGE FAULT. It refuses to close.'],
      remote: ['Display: SPEED 8. Wall control works.', 'Operator memory shows no remotes paired.'],
      cable: ['The operator strains as the door racks crooked, then trips out.'],
    },
    glass: {
      normal: ['All the glass is whole and clean.'],
      glass: [
        'One pane in the second section is cracked in a star from a round impact.',
        'A crew member says a hose nozzle swung into it during a drill.',
      ],
    },
    remote: {
      normal: ['The remote\'s LED lights when you press it.'],
      remote: [
        'Pressing the remote: no light at all.',
        'The battery inside is swollen and corroded.',
        'The operator was replaced last month, and nobody paired the remote to the new one.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      safetyEdge: {
        normal: ['Multimeter: the edge circuit reads closed, and opens when you press it.'],
        edge: ['Multimeter: the edge circuit reads open all the time: a broken wire.'],
      },
      operator: ['Multimeter: 230 V to the operator, steady.'],
      remote: {
        normal: ['Multimeter: remote battery 3.0 V.'],
        remote: ['Multimeter: remote battery 0.4 V. Dead.'],
      },
    },
    level: {
      cables: {
        normal: ['Level: the door comes up level.'],
        cable: ['Level: the bottom of the door is 2 inches low on the left.'],
      },
    },
  },

  faults: {
    spring: {
      name: 'Torsion spring broken', part: 'springs', doors: ['firestation'], priority: 'EMERGENCY',
      complaint: 'Bay 1\'s door won\'t go up. Engine 7 is stuck inside and we\'re out of service. We pulled it out the back way.',
    },
    cable: {
      name: 'Lift cable off its drum', part: 'cables', doors: ['firestation'], priority: 'EMERGENCY',
      complaint: 'Bay 1\'s door went up crooked and jammed. It\'s hanging off the tracks on one side.',
    },
    edge: {
      name: 'Bottom safety edge wire cut', part: 'safetyEdge', doors: ['firestation'], priority: 'EMERGENCY', needsReplacing: true,
      complaint: 'Bay 1\'s door reverses every time we try to close it. We\'re leaving the station wide open.',
    },
    slowOpen: {
      name: 'Operator set slow, belt glazed', part: 'operator', doors: ['firestation'], priority: 'EMERGENCY',
      complaint: 'Bay 1\'s door takes forever to open. We\'re late rolling out on calls.',
    },
    glass: {
      name: 'Glass section cracked', part: 'glass', doors: ['firestation'], priority: 'EMERGENCY', needsReplacing: true,
      complaint: 'There\'s a cracked window in bay 1\'s door. Chief wants it fixed before it falls out.',
    },
    remote: {
      name: 'Engine remote dead', part: 'remote', doors: ['firestation'], priority: 'EMERGENCY',
      complaint: 'The remote in Engine 7 doesn\'t open bay 1\'s door anymore. Somebody has to jump out and hit the button.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    door.speedLevel = fault === 'slowOpen' ? 2 : GOOD_SPEED;
    door.beltWorn = fault === 'slowOpen';
    JOB.speedSet = door.speedLevel;
    JOB.cableSlack = fault === 'cable' ? 3 + Math.floor(Math.random() * 2) : 0;
    showFault(door.parts, fault);
    door.apply();
  },

  tests: {
    springs: { msg: 'Running the door, watching the springs', run: (d) => d.toggle() },
    cables: { msg: 'Running the door up, watching the cables', run: (d) => d.toggle() },
    safetyEdge: { msg: 'Closing the door onto a hose line', run: (d) => d.closeOnHose() },
    operator: { msg: 'Opening the door, timing it', run: (d) => d.toggle() },
    glass: { msg: 'Looked over every pane', run: (d) => d.glassCheck() },
    remote: { msg: 'Pressed the remote in the engine', run: (d) => d.remotePress() },
  },

  checks: [
    ['remote', 'Opens from the engine\'s remote'],
    ['opens', 'Opens all the way'],
    ['fast', `Fast enough for a call (${ALERT_SECONDS} s)`],
    ['closes', 'Closes all the way'],
    ['safety', 'Reverses on an obstruction'],
    ['glass', 'Glass intact'],
  ],
  testCycles: [
    { label: 'STATION ALERT! The engine opens the door from its remote', start: (d) => d.stationAlert(),
      done: (c, d) => (c.reachedTop && d.state === 'holding') || c.finished || (c.remoteDead && c.t > 2.5) || c.t > 45 },
    { label: 'Close it from the wall control', start: (d) => d.closeFromWall(),
      done: (c, d) => c.finished || c.t > 90 },
    { label: 'Close it onto a hose line lying across the doorway', start: (d) => d.closeOnHose(),
      done: (c) => c.finished || c.t > 90 },
    { label: 'Walk the door and check the glass', start: (d) => d.glassCheck(), done: (c) => c.t > 1.5 },
  ],
  record(c, index, door) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.remote = !c.remoteDead;
      if (c.remoteDead) symptoms.push('The engine\'s remote did nothing. Someone had to run to the wall button.');
      if (!c.remoteDead) {
        r.opens = c.reachedTop;
        if (c.reachedTop && c.openSecs !== null) r.fast = c.openSecs <= ALERT_SECONDS;
        if (c.noLift) symptoms.push('The operator strained and lifted the door an inch, then quit. The door is far too heavy.');
        if (c.hung) symptoms.push('The door went up crooked and jammed in the tracks.');
        if (r.fast === false) symptoms.push(`The door took ${Math.round(c.openSecs)} seconds to open. The engine would have been late.`);
      }
    }
    if (index === 1) {
      if (c.noLift || c.hung) r.opens = false;
      if (!c.noLift && !c.hung) r.closes = c.closedFully && !c.edgeRev;
      if (c.edgeRev) symptoms.push('The door reversed right after it started down, with nothing in the way.');
    }
    if (index === 2) {
      if (!c.noLift && !c.hung) r.safety = c.safetyStop || c.edgeRev;
    }
    if (index === 3) {
      r.glass = !(door && door.fault === 'glass');
      if (!r.glass) symptoms.push('There\'s a cracked pane in the second section.');
    }
    return { r, symptoms };
  },

  procedures: {
    springs: {
      title: 'Replacing the broken spring',
      start: () => ({ lockout: null, bars: null, spring: null, turns: 0 }),
      steps: [
        LOCKOUT_STEP,
        { type: 'look', label: 'Look at the springs', button: 'LOOK',
          reveal: 'The left spring has snapped in the middle. The right one is worn too: springs get replaced as a pair. Your partner from the shop meets you here.' },
        { type: 'choice', label: 'What do you wind the springs with?', key: 'bars',
          info: () => 'The winding cone has four holes for a bar. The spring is under hundreds of pounds of force.',
          options: [{ label: 'WINDING BARS', value: 'bars' }, { label: 'A SCREWDRIVER', value: 'screwdriver' }] },
        { type: 'choice', label: 'The springs', key: 'spring',
          options: [{ label: 'NEW SPRING PAIR', part: 'fireSprings', value: 'new' }, { label: 'JUST THE BROKEN ONE', part: 'fireSpringOne', value: 'one' }] },
        { type: 'hold', label: 'Slide the new springs onto the shaft and bolt the center bracket', tool: 'wrench', verb: 'BOLT', count: 2 },
        { type: 'nudge', label: 'Wind the springs, a quarter turn at a time', key: 'turns', min: 0, max: 14, unit: 'turns',
          down: '◀ UNWIND', up: 'WIND ▶',
          info: (s) => (s.turns === GOOD_TURNS ? 'Balanced: the door will stay put halfway, and lifts easily.'
            : s.turns < GOOD_TURNS ? 'Not enough: the door will be too heavy and slam down.'
            : 'Too much: the door will fly up and won\'t stay down.') },
        { type: 'hold', label: 'Tighten the set screws on the winding cones', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
      ],
      finish(s, JOB) {
        lockoutResult(s, JOB);
        if (s.bars !== 'bars') {
          // a screwdriver slips out of a winding cone: the bar spins and someone gets hurt
          JOB.safetyIssues = (JOB.safetyIssues || 0) + 1;
          JOB.safetyNote = JOB.safetyNote ? `${JOB.safetyNote}, wound a spring with a screwdriver` : 'wound a spring with a screwdriver';
        }
        if (!s.spring || Math.abs(s.turns - GOOD_TURNS) > 1) return { fixed: false, quality: 35, parts: [] };
        let quality = s.turns === GOOD_TURNS ? 100 : 75;
        if (s.spring === 'one') quality -= 20; // works, but the old one will snap soon
        return { fixed: true, quality, parts: [] };
      },
    },
    cables: {
      title: 'Putting the cable back on its drum',
      start: (JOB) => ({ lockout: null, slack: JOB.cableSlack }),
      steps: [
        LOCKOUT_STEP,
        { type: 'look', label: 'Look at the left drum', button: 'LOOK',
          reveal: 'The left cable has jumped its drum and hangs slack. The door racked crooked and jammed. The cable itself isn\'t frayed.' },
        { type: 'hold', label: 'Block the door up level, then loosen the drum set screws', tool: 'wrench', verb: 'LOOSEN', count: 2 },
        { type: 'nudge', label: 'Wind the cable back into the drum grooves and even up the tension', key: 'slack', min: -2, max: 5, unit: 'turns slack',
          down: '◀ TIGHTER', up: 'LOOSER ▶',
          info: (s) => (s.slack === 0 ? 'Both cables are equally tight. The door will lift level.'
            : s.slack > 0 ? 'Still slack: that side will lag and the door will rack again.'
            : 'Too tight: that side will lift first and the door will rack the other way.') },
        { type: 'hold', label: 'Tighten the drum set screws', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
      ],
      finish(s, JOB) {
        lockoutResult(s, JOB);
        const fixed = s.slack === 0;
        return { fixed, quality: fixed ? 100 : 40, parts: [] };
      },
    },
    operator: {
      title: 'Speeding up the operator',
      start: (JOB) => ({ speed: JOB.speedSet, belt: null }),
      steps: [
        { type: 'hold', label: 'Open the operator cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'look', label: 'Read the settings and look at the belt', button: 'LOOK',
          reveal: 'SPEED is set to 2 of 10. The drive belt is glazed and slips when the door starts.' },
        { type: 'choice', label: 'The drive belt', key: 'belt',
          options: [{ label: 'NEW BELT', part: 'operatorBelt', value: 'new' }, { label: 'KEEP THE OLD ONE', value: 'old' }] },
        { type: 'nudge', label: 'Set the opening speed', key: 'speed', min: 1, max: 10, unit: '/ 10',
          down: '◀ SLOWER', up: 'FASTER ▶',
          info: (s) => {
            const secs = 1 / (0.03 * s.speed * (s.belt === 'new' ? 1 : 0.6));
            return `Opens in about ${Math.round(secs)} seconds.${secs > ALERT_SECONDS ? ' Too slow for a call.' : ''}`;
          } },
        { type: 'hold', label: 'Close the operator cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
      ],
      finish(s) {
        const secs = 1 / (0.03 * s.speed * (s.belt === 'new' ? 1 : 0.6));
        const fixed = secs <= ALERT_SECONDS && s.belt === 'new';
        return { fixed, quality: fixed ? (s.speed >= 7 && s.speed <= 9 ? 100 : 85) : 40, parts: [] };
      },
    },
    remote: {
      title: 'Fixing the engine\'s remote',
      start: () => ({ battery: null, paired: null }),
      steps: [
        { type: 'hold', label: 'Open the remote', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'choice', label: 'The battery is swollen and dead', key: 'battery',
          options: [{ label: 'NEW BATTERY', part: 'remoteBattery', value: true }, { label: 'LEAVE IT', value: false }] },
        { type: 'choice', label: 'Pair it to the new operator?', key: 'paired',
          info: () => 'Press LEARN on the operator, then the remote\'s button, within 30 seconds.',
          options: [{ label: 'PAIR IT', value: true }, { label: 'SKIP', value: false }] },
      ],
      finish(s) {
        const fixed = !!(s.battery && s.paired);
        return { fixed, quality: fixed ? 100 : 40, parts: [] };
      },
    },
    safetyEdge: {
      title: 'Checking the safety edge',
      start: () => ({}),
      steps: [
        { type: 'look', label: 'Follow the edge\'s cord', button: 'LOOK',
          reveal: 'The coiled cord is cut through where it was pinched. The edge can\'t be spliced and stay reliable. It needs replacing.' },
      ],
      finish() { return { fixed: false, quality: 40, parts: [] }; },
    },
  },
  repairTools: {
    springs: { ADJUST: ['wrench'] },
    cables: { ADJUST: ['wrench'] },
    safetyEdge: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    operator: { ADJUST: ['screwdriver'], REPLACE: ['wrench', 'screwdriver'] },
    glass: { REPLACE: ['screwdriver'] },
    remote: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
  },
  parts: {
    fireSprings: { cabinet: 'exits', name: 'Torsion spring pair, 14x14 door', cost: 290, note: 'Oil-tempered springs with winding cones.' },
    fireSpringOne: { cabinet: 'exits', name: 'Torsion spring (single)', cost: 150, note: 'One spring with winding cone.' },
    fireEdge: { cabinet: 'electrical', name: 'Pressure safety edge, 14 ft', cost: 165, note: 'Rubber edge with coiled cord.' },
    operatorBelt: { cabinet: 'exits', name: 'Jackshaft operator drive belt', cost: 45, note: 'Toothed belt.' },
    glassSection: { cabinet: 'exits', name: 'Full-view glass section, 14 ft', cost: 380, note: 'Aluminum section with tempered glass.' },
    remoteBattery: { cabinet: 'electrical', name: 'Remote battery (CR2032)', cost: 3, note: 'Coin cell for door remotes.' },
    fireRemote: { cabinet: 'electrical', name: 'Door remote, 3-button', cost: 38, note: 'Visor remote.' },
    jackshaftOp: { cabinet: 'electrical', name: 'Jackshaft operator', cost: 1450, note: 'Wall-mount commercial operator.' },
  },
  replacements: { safetyEdge: 'fireEdge', glass: 'glassSection', remote: 'fireRemote', operator: 'jackshaftOp', springs: null, cables: null },

  // Make the door behave the way a finished repair left it.
  applyRepair(door, partId, result, state) {
    if (partId === 'operator') {
      if (result.replaced) { door.speedLevel = GOOD_SPEED; door.beltWorn = false; }
      else if (state.speed !== undefined) {
        door.speedLevel = state.speed;
        door.beltWorn = state.belt !== 'new';
        if (!result.fixed) door.fault = 'slowOpen';
      }
    }
    if (result.fixed) showFault(door.parts, door.fault);
    if (door.state === 'stuck') door.goDown(); // a jammed door gets run back down
  },
};
