// sites/autoshop.js — Kessler Auto Repair, service bay 1. (A DRAFT: see drafts.js.)
//
// An insulated steel SECTIONAL door: four hinged panels on rollers. The rollers ride steel
// tracks straight up the sides of the opening, round a curve, and back along the ceiling, so
// the opened door lies flat overhead. A TORSION SPRING on the header balances its weight, and a
// trolley OPENER on a rail drives it. PHOTO EYES at the floor reverse it if a car or a person is
// in the way. The door is open all day with cars rolling through, so it gets beat up.
//
// Faults (from the "Picked: auto shop sectional door" plan):
//   dent      a car backed into the bottom section -> door binds and sticks going up
//   hinge     center hinge between two panels cracked -> loud pop as it goes over the curve
//   rollers   rollers worn, bearings dry -> loud grinding the whole way
//   eyes      photo eye bumped out of line -> door comes down a foot, then pops back up
//   limit     opener's down travel set too high -> stops short, gap at the floor
//   seal      bottom seal ripped -> cold air and water come in under the door

import * as THREE from 'three';
import { MAT, box } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { car } from './src-vehicles2.js';

const W = 3.0, H = 2.9;               // the opening
const N = 4, PH = H / N;              // four sections
const DZ = -0.33;                     // the door rides just inside the wall
const RAD = 0.38;                     // track curve radius
const ARC = RAD * Math.PI / 2;
const TRACK_Y = H + RAD;              // height of the horizontal tracks
const SPEED = 0.3;                    // fraction of full travel per second
const STICK_AT = 0.12;                // dented bottom section binds here going up
const POP_AT = 0.45;                  // cracked hinge pops crossing this point
const REVERSE_AT = 0.72;              // misaligned eyes: it gets this far down, then reverses
const LIMIT_STEP = 0.022;             // one click of the down limit, as a fraction of travel (~2.5")
const TX = W / 2 + 0.06;              // track centerline

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

// ---------------------------------------------------------------- the dented bottom section
// Where the bumper hit, in section 0's own coordinates (x across, y up from its middle).
const DENT = { x: 0.55, y: -0.03 };

// The bottom section's face: raised panels, and (damaged) the car's red paint smeared into the
// dent, bright scratches where the door's paint was scraped to bare steel, and grime round it.
function sectionTexture(damaged) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#e9ebee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 10;
    for (let x = 32; x < w - 32; x += 248) g.strokeRect(x, 50, 216, h - 100);
    if (!damaged) return;
    const cx = ((DENT.x + W / 2) / W) * w;
    const cy = (1 - (DENT.y + PH / 2) / PH) * h;
    // grime and shadow round the dent
    const grime = g.createRadialGradient(cx, cy, 10, cx, cy, 230);
    grime.addColorStop(0, 'rgba(60,55,50,0.35)'); grime.addColorStop(1, 'rgba(60,55,50,0)');
    g.fillStyle = grime;
    g.beginPath(); g.ellipse(cx, cy, 240, 110, 0, 0, Math.PI * 2); g.fill();
    // red bumper paint smeared along the crease (the car slid as it hit)
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.18);
    for (let i = 0; i < 26; i++) {
      const y = (i % 7 - 3) * 7 + (i * 13 % 5);
      const x0 = -150 + (i * 37) % 110, len = 90 + (i * 53) % 170;
      g.strokeStyle = `rgba(${150 + (i * 17) % 60}, ${20 + (i * 7) % 20}, ${28 + (i * 5) % 15}, ${0.45 + (i % 4) * 0.12})`;
      g.lineWidth = 3 + (i % 4) * 2;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y + (i % 3 - 1) * 4); g.stroke();
    }
    // bare-steel scratches through the paint
    for (let i = 0; i < 18; i++) {
      const y = -40 + (i * 11) % 80, x0 = -200 + (i * 41) % 180, len = 120 + (i * 29) % 160;
      g.strokeStyle = `rgba(250,250,252,${0.55 + (i % 3) * 0.15})`;
      g.lineWidth = 1.5 + (i % 2);
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y - 6 - (i % 4) * 3); g.stroke();
      g.strokeStyle = 'rgba(70,70,75,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, y + 2); g.lineTo(x0 + len, y - 4 - (i % 4) * 3); g.stroke();
    }
    // the crease itself: a dark fold with a bright lip above it
    g.strokeStyle = 'rgba(30,30,32,0.55)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-260, 6); g.quadraticCurveTo(0, 14, 260, 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-250, -2); g.quadraticCurveTo(0, 5, 250, -6); g.stroke();
    g.restore();
    // the bent right end: paint cracked off along the fold
    g.strokeStyle = 'rgba(40,40,45,0.6)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(w * 0.885, 20); g.lineTo(w * 0.875, h * 0.5); g.lineTo(w * 0.89, h - 20); g.stroke();
  });
}
const SECTION_TEX = { get clean() { return this._c || (this._c = sectionTexture(false)); }, get dented() { return this._d || (this._d = sectionTexture(true)); } };

// Push the steel in: a bowl where the bumper hit, a sharp crease across it, and the right end
// folded back. (dented = false puts it back flat.)
function shapeSection(mesh, dented) {
  const geo = mesh.geometry, pos = geo.attributes.position, base = geo.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    let push = 0;
    if (dented) {
      const dx = (x - DENT.x) / 0.75, dy = (y - DENT.y) / 0.3;
      push += Math.exp(-(dx * dx + dy * dy) * 1.5) * 0.14;                                   // the bowl
      const off = (y - DENT.y) + 0.18 * (x - DENT.x);
      push += Math.exp(-((off / 0.025) ** 2)) * 0.05 * Math.exp(-(((x - DENT.x) / 0.95) ** 2)); // the crease
      if (x > 1.12) push += (x - 1.12) * 0.3;                                                   // bent end
    }
    pos.setXYZ(i, x, y, base[i * 3 + 2] - push);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  mesh.material.map = dented ? SECTION_TEX.dented : SECTION_TEX.clean;
  mesh.material.needsUpdate = true;
}

// ---------------------------------------------------------------- the 3D building
function build(scene, parts) {
  const block = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.9,
    map: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
      for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }) });
  block.map.wrapS = block.map.wrapT = THREE.RepeatWrapping;
  block.map.repeat.set(4, 4);
  const blue = new THREE.MeshStandardMaterial({ color: 0x1f5fa8, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x7a838c, metalness: 0.6, roughness: 0.4 });
  const T = 0.25, zc = -T / 2;

  // the shop front: block wall 4.6 m tall with two bay openings (bay 1 is the job, bay 2 is scenery)
  const B2 = 4.2; // bay 2 center
  box(scene, 'wallL', block, 4.5, 4.6, T, -W / 2 - 2.25, 2.3, zc);
  box(scene, 'wallMid', block, B2 - W, 4.6, T, B2 / 2, 2.3, zc);
  box(scene, 'wallR', block, 4.5, 4.6, T, B2 + W / 2 + 2.25, 2.3, zc);
  for (const x of [0, B2]) box(scene, 'wallOver', block, W, 4.6 - H, T, x, (4.6 + H) / 2, zc);
  box(scene, 'stripe', blue, 15, 0.35, T + 0.02, 1.5, 4.05, zc);
  box(scene, 'roofEdge', new THREE.MeshStandardMaterial({ color: 0x33373c, roughness: 0.7 }), 15.2, 0.18, 0.4, 1.5, 4.7, -0.05);
  label(scene, 'KESSLER AUTO REPAIR', 4.4, 0.55, 2.1, 3.55, 0.01, { bg: '#1f5fa8', fg: '#ffffff', px: 44 });
  label(scene, 'BAY 1', 0.7, 0.24, 0, H + 0.2, 0.01, { bg: '#f5b301', fg: '#14171b', px: 70 });
  label(scene, 'BAY 2', 0.7, 0.24, B2, H + 0.2, 0.01, { bg: '#f5b301', fg: '#14171b', px: 70 });
  label(scene, 'OPEN', 0.6, 0.22, -2.9, 1.9, 0.01, { bg: '#c0392b', fg: '#ffffff', px: 80 });
  label(scene, 'BRAKES · TIRES · OIL', 2.0, 0.22, -3.0, 2.4, 0.01, { fg: '#1f5fa8', px: 46 });

  // bay 2's door: same kind of door, always shut (scenery)
  const panelTex = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#e9ebee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3;
    for (let x = 8; x < w - 8; x += 62) g.strokeRect(x, 14, 54, h - 28);
  });
  const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, metalness: 0.2 });
  for (let i = 0; i < N; i++) box(scene, 'bay2Panel', panelMat, W, PH - 0.01, 0.05, B2, PH * i + PH / 2, DZ);

  // the apron: asphalt with oil stains, a stack of tires, a car waiting for its turn
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), new THREE.MeshStandardMaterial({ color: 0x45484c, roughness: 0.95 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(1.5, 0.003, 3.5);
  apron.receiveShadow = true;
  scene.add(apron);
  for (const [x, z, r] of [[0.3, 1.4, 0.35], [-0.5, 2.6, 0.25], [B2 + 0.4, 1.8, 0.3]]) {
    const stain = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.3 }));
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(x, 0.006, z);
    stain.scale.set(1, 0.7, 1);
    scene.add(stain);
  }
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.85 });
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 10, 24), rubber);
    t.rotation.x = Math.PI / 2;
    t.position.set(-2.6, 0.11 + i * 0.22, 0.9);
    t.castShadow = true;
    scene.add(t);
  }
  car(scene, { x: -4.6, z: 3.4, rotY: Math.PI / 2 + 0.2, color: 0x2e7d4f, type: 'hatch', plate: 'BRK 2DAY' });

  // ---- inside: the shop floor, a lift with a car up on it, toolbox, workbench, tire rack
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: 0x8d8f91, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(1.5, 0.002, -4.2);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: 0x5f6368 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(1.5, 4.2, -4.2);
  scene.add(ceil);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.2), new THREE.MeshStandardMaterial({ color: 0xbfc3c7, roughness: 0.9 }));
  back.position.set(1.5, 2.1, -8.2);
  scene.add(back);
  for (const sx of [-4.5, 7.5]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), new THREE.MeshStandardMaterial({ color: 0xbfc3c7, roughness: 0.9 }));
    wall.position.set(sx, 2.1, -4.2);
    wall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(wall);
  }
  for (const [x, z] of [[0, -3], [0, -6], [B2, -4.5]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.6), new THREE.MeshBasicMaterial({ color: 0xf4f7ff }));
    l.rotation.x = Math.PI / 2;
    l.position.set(x + 0.9, 4.18, z);
    scene.add(l);
  }
  const glow = new THREE.PointLight(0xf1f5ff, 3.5, 10, 1.4);
  glow.position.set(0.8, 3.6, -3.4);
  scene.add(glow);
  // 2-post lift in bay 2 with a car up on it
  const liftY = 1.25;
  for (const x of [B2 - 1.45, B2 + 1.45]) {
    box(scene, 'liftPost', blue, 0.28, 3.4, 0.28, x, 1.7, -4.5);
    for (const z of [-3.3, -5.7]) box(scene, 'liftArm', MAT.black, 0.9, 0.08, 0.12, x + (x < B2 ? 0.5 : -0.5), liftY + 0.2, z);
  }
  const lifted = car(scene, { x: B2, z: -4.5, rotY: Math.PI / 2, color: 0xb9bcc0, type: 'sedan', plate: 'UP 4 SVC' });
  lifted.position.y = liftY;
  // red rolling toolbox, workbench with a vise, tire rack, oil drum
  const red = new THREE.MeshStandardMaterial({ color: 0xb3262d, metalness: 0.3, roughness: 0.45 });
  box(scene, 'toolbox', red, 1.3, 1.1, 0.55, -3.3, 0.6, -2.4);
  for (let i = 0; i < 6; i++) box(scene, 'drawerPull', MAT.stainless, 1.0, 0.025, 0.02, -3.3, 0.25 + i * 0.15, -2.11);
  box(scene, 'toolboxTop', red, 1.0, 0.45, 0.5, -3.3, 1.38, -2.42);
  box(scene, 'bench', new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.7 }), 2.2, 0.08, 0.7, -3.3, 0.9, -6.6);
  for (const x of [-4.3, -2.3]) box(scene, 'benchLeg', steel, 0.06, 0.88, 0.6, x, 0.44, -6.6);
  box(scene, 'vise', MAT.black, 0.22, 0.16, 0.18, -2.6, 1.02, -6.4);
  box(scene, 'pegboard', new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.9 }), 2.2, 1.0, 0.03, -3.3, 1.75, -8.15);
  for (let i = 0; i < 7; i++) box(scene, 'hungTool', i % 2 ? red : steel, 0.06, 0.3 + (i % 3) * 0.1, 0.03, -4.1 + i * 0.27, 1.75, -8.12);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 10, 24), rubber);
    t.position.set(6.6, 0.45 + j * 0.8, -2.2 - i * 0.5);
    t.rotation.y = Math.PI / 2;
    scene.add(t);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 20), new THREE.MeshStandardMaterial({ color: 0x1f5fa8, metalness: 0.4, roughness: 0.5 }));
  drum.position.set(-3.8, 0.44, -4.6);
  drum.castShadow = true;
  scene.add(drum);
  label(scene, 'SAFETY FIRST', 1.4, 0.3, 1.5, 2.9, -8.17, { bg: '#f5b301', fg: '#14171b', px: 60 });

  // ---- the DOOR: four sections (doorLeaf holds them; each rides the track on its own)
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const doorPanelMat = new THREE.MeshStandardMaterial({ map: panelTex.clone(), roughness: 0.55, metalness: 0.2 });
  doorPanelMat.map.needsUpdate = true;
  const hinges = [], rollers = [];
  for (let i = 0; i < N; i++) {
    const p = new THREE.Group();
    leaf.add(p);
    parts[`panel${i}`] = p;
    if (i === 0) {
      // the bottom section is finely divided so a dent can really push the steel in
      const geo = new THREE.BoxGeometry(W, PH - 0.012, 0.05, 60, 16, 1);
      geo.userData.base = geo.attributes.position.array.slice();
      const sec = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: SECTION_TEX.clean, roughness: 0.55, metalness: 0.2 }));
      sec.name = 'section';
      sec.castShadow = true;
      sec.receiveShadow = true;
      p.add(sec);
      parts.section0 = sec;
    } else box(p, 'section', doorPanelMat, W, PH - 0.012, 0.05, 0, 0, 0);
    if (i === 2) { // a row of windows in the third section
      for (let k = 0; k < 4; k++) {
        const win = box(p, 'sectionWindow', new THREE.MeshStandardMaterial({ color: 0x9fb6c6, metalness: 0.3, roughness: 0.1 }), 0.55, 0.3, 0.052, -1.05 + k * 0.7, 0.02, 0);
        win.castShadow = false;
      }
    }
    // hinges at the top edge of sections 0-2 (on the inside face), rollers on both ends
    if (i < N - 1) for (const x of [-0.95, 0, 0.95]) {
      const hg = box(p, 'hinge', steel, 0.1, 0.12, 0.02, x, PH / 2, -0.036);
      hg.userData.center = x === 0 && i === 1;
      hinges.push(hg);
    }
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), MAT.black);
      r.rotation.z = Math.PI / 2;
      r.position.set(sx * (TX - 0.01), -PH / 2 + 0.1, -0.02);
      p.add(r);
      rollers.push(r);
      box(p, 'rollerBracket', steel, 0.12, 0.08, 0.02, sx * (W / 2 - 0.05), -PH / 2 + 0.1, -0.036);
    }
  }
  // dent in the bottom section (shown on that fault)
  const dent = new THREE.Group();
  dent.visible = false;
  parts.panel0.add(dent);
  parts.dent = dent;
  parts.roller0R = rollers[1]; // section 0's right roller (pops out of the track when it's bent)
  parts.roller0R.userData.base = parts.roller0R.position.clone();
  parts.panels = parts.panel0; // the 'Bottom Section' part is section 0
  // bottom seal: rubber along the bottom of section 0
  const seal = box(parts.panel0, 'bottomSealStrip', new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }), W - 0.02, 0.03, 0.06, 0, -PH / 2 - 0.004, 0);
  parts.bottomSeal = meshSet([seal]); // its tap target rides on section 0
  parts.sealStrip = seal;
  parts.hingeMeshes = hinges;
  parts.rollerMeshes = rollers;

  // TRACKS: vertical up the jambs, a curve, then back along the ceiling
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.6, roughness: 0.35 });
  const tracks = [];
  for (const sx of [-1, 1]) {
    tracks.push(box(scene, 'trackV', trackMat, 0.04, H, 0.08, sx * TX, H / 2, DZ - 0.02));
    const curve = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.025, 6, 16, Math.PI / 2), trackMat);
    curve.rotation.y = -Math.PI / 2; // the quarter circle runs from the top of the side track back to the ceiling track
    curve.position.set(sx * TX, H, DZ - RAD);
    scene.add(curve);
    tracks.push(curve);
    tracks.push(box(scene, 'trackH', trackMat, 0.04, 0.08, 3.4, sx * TX, TRACK_Y, DZ - RAD - 1.7));
    box(scene, 'trackHanger', steel, 0.03, 4.2 - TRACK_Y, 0.03, sx * TX, (4.2 + TRACK_Y) / 2, DZ - RAD - 3.2);
  }
  parts.rollers = meshSet([...rollers, ...tracks]);
  parts.hinges = meshSet(hinges);
  parts.rollerOnly = rollers;

  // TORSION SPRING on the header (scenery you must not touch)
  const springs = new THREE.Group();
  springs.name = 'springs';
  scene.add(springs);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, W + 0.3, 10), MAT.stainless);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, H + 0.42, DZ - 0.12);
  springs.add(shaft);
  const coilMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.4 });
  for (let k = 0; k < 22; k++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 16), coilMat);
    coil.rotation.y = Math.PI / 2;
    coil.position.set(-0.75 + k * 0.032, H + 0.42, DZ - 0.12);
    springs.add(coil);
  }
  for (const sx of [-1, 1]) {
    const drumC = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), MAT.stainless);
    drumC.rotation.z = Math.PI / 2;
    drumC.position.set(sx * (W / 2 + 0.05), H + 0.42, DZ - 0.12);
    springs.add(drumC);
  }
  const springTag = label(springs, 'DANGER: HIGH TENSION', 0.5, 0.08, 0.2, H + 0.3, DZ - 0.07, { bg: '#c0392b', fg: '#ffffff', px: 36, rotY: Math.PI });
  springTag.castShadow = false;
  parts.springs = springs;

  // OPENER: rail down the middle of the ceiling, a trolley, and the motor head at the back
  const opener = new THREE.Group();
  opener.name = 'opener';
  scene.add(opener);
  box(opener, 'rail', steel, 0.06, 0.05, 3.3, 0, TRACK_Y + 0.12, DZ - 0.3 - 1.65);
  box(opener, 'motorHead', new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.5 }), 0.5, 0.25, 0.55, 0, TRACK_Y + 0.12, DZ - 3.6);
  const openerLight = box(opener, 'openerLight', new THREE.MeshBasicMaterial({ color: 0xfff2c8 }), 0.3, 0.02, 0.2, 0, TRACK_Y - 0.01, DZ - 3.6);
  openerLight.castShadow = false;
  box(opener, 'hangerStrap', steel, 0.03, 4.2 - TRACK_Y - 0.12, 0.03, 0, (4.2 + TRACK_Y + 0.12) / 2, DZ - 3.6);
  const trolley = box(scene, 'trolley', MAT.black, 0.12, 0.08, 0.2, 0, TRACK_Y + 0.07, DZ - 0.4);
  const arm = box(scene, 'openerArm', steel, 0.03, 0.03, 0.4, 0, TRACK_Y - 0.08, DZ - 0.25);
  parts.opener = opener;
  parts.trolley = trolley;
  parts.openerArm = arm;

  // PHOTO EYES at the bottom of the tracks, with the beam between them
  const eyes = new THREE.Group();
  eyes.name = 'photoEyes';
  scene.add(eyes);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.5 });
  const ex = TX, ey = 0.15, ez = DZ - 0.12;
  box(eyes, 'eyeSender', eyeMat, 0.06, 0.06, 0.08, -ex + 0.05, ey, ez);
  const rx = new THREE.Group();
  rx.position.set(ex - 0.05, ey, ez);
  eyes.add(rx);
  box(rx, 'eyeReceiver', eyeMat, 0.06, 0.06, 0.08, 0, 0, 0);
  const rxLed = box(rx, 'eyeLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.015, 0.015, 0.005, 0, 0.022, -0.042);
  rxLed.castShadow = false;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * ex - 0.16, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.55 }));
  beam.position.set(0, ey, ez);
  beam.userData.seeThrough = true;
  eyes.add(beam);
  parts.photoEyes = eyes;
  parts.eyeReceiver = rx;
  parts.eyeLED = rxLed;
  parts.eyeBeam = beam;

  // WALL BUTTON inside, beside the opening (tapping the door = pressing it)
  box(scene, 'wallButtonBox', new THREE.MeshStandardMaterial({ color: 0xe9e6df }), 0.09, 0.14, 0.03, W / 2 + 0.45, 1.4, -T - 0.015);
  box(scene, 'wallButton', new THREE.MeshStandardMaterial({ color: 0xc0392b }), 0.04, 0.04, 0.02, W / 2 + 0.45, 1.42, -T - 0.035);
}

// Line the receiver eye up (0 = beam made).
function aimEye(parts, off) {
  parts.eyeReceiver.rotation.y = off * 0.12;
  parts.eyeReceiver.rotation.x = off * 0.05;
  parts.eyeLED.material.color.set(off === 0 ? 0x33ff66 : 0xffb000);
  parts.eyeBeam.visible = off === 0;
}

// Show (or clear) what each fault looks like.
function showFault(parts, fault) {
  const dented = fault === 'dent';
  parts.dent.visible = dented;
  shapeSection(parts.section0, dented);
  // the bent end has levered its roller half out of the track
  const r = parts.roller0R, b = r.userData.base;
  r.position.set(b.x + (dented ? 0.06 : 0), b.y + (dented ? 0.03 : 0), b.z + (dented ? 0.05 : 0));
  r.rotation.set(dented ? 0.5 : 0, 0, Math.PI / 2);
  for (const h of parts.hingeMeshes) {
    const cracked = fault === 'hinge' && h.userData.center;
    h.material.color.set(cracked ? 0x4a2a1a : 0x7a838c);
    h.rotation.z = cracked ? 0.35 : 0;
  }
  for (const r of parts.rollerOnly) r.material.color.set(fault === 'rollers' ? 0x6b4a2b : 0x111111);
  parts.sealStrip.scale.x = fault === 'baySeal' ? 0.6 : 1;
  parts.sealStrip.position.x = fault === 'baySeal' ? W * 0.2 : 0;
}

// ---------------------------------------------------------------- the sectional door
export class SectionalDoor {
  constructor(parts) {
    this.parts = parts;
    this.open = 0;            // 0 closed .. 1 all the way up
    this.state = 'closed';    // closed | operating | holding | closing | stuck | stopped
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;
    this.autoClose = false;
    this.obstruct = false;
    this.limitGap = 0;
    this.overtravel = false;
    this.grind = 0;
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    // the rollers are shared, so give each its own material (the worn ones change color)
    for (const r of parts.rollerOnly) r.material = r.material.clone();
    for (const h of parts.hingeMeshes) h.material = h.material.clone();
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  powerOpen() { this.toggle(); }
  cardRead() { this.toggle(); }
  tapPull() { this.toggle(); } // tapping the door = pressing the wall button

  toggle() {
    if (this.state === 'closed' || this.state === 'closing' || this.state === 'stopped') this.goUp();
    else if (this.state === 'holding' || this.state === 'stuck') this.goDown();
  }

  goUp() {
    if (this.open >= 1) return;
    if (this.fault === 'dent' && this.open >= STICK_AT - 0.005) {
      // the bent section's rollers are jammed in the track: the opener strains and stops
      SFX.clunk();
      if (this.cycle) { this.cycle.stuck = true; this.cycle.finished = true; }
      this.autoClose = false;
      this.setState('stuck');
      return;
    }
    SFX.operatorMotor(Math.max(0.6, (1 - this.open) / SPEED));
    this.setState('operating');
  }

  goDown() {
    if (this.open <= this.closeStop || this.state === 'closing') return;
    SFX.operatorMotor(1.2);
    this.setState('closing');
  }

  startCycle() {
    this.cycle = { t: 0, reachedTop: false, closedFully: false, reversed: false, stuck: false, safetyStop: false,
      finished: false, gap: false, slammed: false, popped: false, ground: false, leaky: false, sealCheck: false };
  }

  // TEST: open from the wall button, then close.
  cycleBig() {
    this.autoClose = true;
    if (this.state === 'holding') { this.goDown(); return; }
    this.goUp();
  }

  // TEST: close with a car bumper in the doorway: the eyes must reverse it.
  closeWithObstruction() {
    this.obstruct = true;
    this.autoClose = true;
    if (this.state === 'holding') this.goDown(); else this.goUp();
  }

  // TEST: door down, look and feel along the bottom.
  sealCheck() { if (this.cycle) this.cycle.sealCheck = true; }

  get closeStop() { return Math.max(0, this.limitGap) * LIMIT_STEP; }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    const moving = this.state === 'operating' || this.state === 'closing';
    const worn = this.fault === 'rollers';
    if (moving && worn) {
      this.grind -= dt;
      if (this.grind <= 0) { SFX.scrape(0.5); this.grind = 0.5; }
      if (c) c.ground = true;
    }
    const speed = SPEED * (worn ? 0.75 : 1);
    const before = this.open;
    switch (this.state) {
      case 'operating':
        this.open = Math.min(1, this.open + speed * dt);
        if (this.fault === 'dent' && this.open >= STICK_AT) {
          this.open = STICK_AT;
          SFX.clunk();
          if (c) { c.stuck = true; c.finished = true; }
          this.autoClose = false;
          this.setState('stuck');
          break;
        }
        if (this.open >= 1) {
          if (c) c.reachedTop = true;
          this.setState('holding');
          if (this.autoClose) setTimeout(() => { if (this.state === 'holding') this.goDown(); }, 900);
        }
        break;
      case 'closing': {
        this.open = Math.max(0, this.open - speed * dt);
        const beamBroken = this.obstruct && this.open < 0.5;
        const eyesBlind = this.fault === 'bayEyes' && this.open < REVERSE_AT;
        if (beamBroken || eyesBlind) {
          SFX.clunk();
          if (c) { if (beamBroken) c.safetyStop = true; else c.reversed = true; }
          this.obstruct = false;
          this.autoClose = false;
          this.setState('operating');
          if (c) setTimeout(() => { if (this.cycle === c) c.finished = true; }, 2500);
          break;
        }
        if (this.open <= this.closeStop) {
          if (this.closeStop > 0) {
            SFX.clunk();
            this.open = this.closeStop;
            if (c) { c.gap = true; c.finished = true; }
            this.autoClose = false;
            this.setState('closed');
            break;
          }
          SFX.latchClick(this.overtravel ? 30 : 10);
          if (this.overtravel && this.onSlam) this.onSlam(0.5);
          if (c) {
            c.closedFully = !this.overtravel; c.slammed = this.overtravel; c.finished = true;
            if (this.fault === 'baySeal') c.leaky = true;
          }
          this.autoClose = false;
          this.setState('closed');
          if (this.onClosed) this.onClosed(0, 0);
        }
        break;
      }
    }
    // the cracked hinge pops as it goes over the curve, both ways
    if (this.fault === 'hinge' && (before - POP_AT) * (this.open - POP_AT) < 0) {
      SFX.clunk();
      if (this.onSlam) this.onSlam(0.2);
      if (c) c.popped = true;
    }
    this.apply();
  }

  apply() {
    const p = this.parts;
    for (let i = 0; i < N; i++) {
      const a = along(i * PH + this.open * H + PH / 2);
      const panel = p[`panel${i}`];
      panel.position.set(0, a.y, a.z);
      panel.rotation.x = a.rot;
    }
    // the opener's trolley rides back along the rail with the top of the door
    const top = along((N - 1) * PH + this.open * H + PH);
    p.trolley.position.z = Math.min(DZ - 0.4, top.z - 0.15);
    p.openerArm.position.z = p.trolley.position.z + 0.18;
    this.angle = this.open * 90;
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });
const LOCKOUT_STEP = {
  type: 'choice', label: 'Before working on the door', key: 'lockout',
  info: () => 'Close the door and unplug the opener, so nobody can run it while your hands are in the track.',
  options: [{ label: 'UNPLUG + TAG THE OPENER', value: true }, { label: 'SKIP IT', value: false }],
};
function lockoutResult(s, JOB) {
  if (s.lockout === false) {
    JOB.safetyIssues = (JOB.safetyIssues || 0) + 1;
    JOB.safetyNote = JOB.safetyNote ? `${JOB.safetyNote}, no lockout` : 'no lockout';
  }
}
const EACH_PANEL = (center, size) => ({
  attach: 'panel0', center, size, extra: [1, 2, 3].map((k) => ({ attach: `panel${k}`, center, size })),
});

export default {
  id: 'autoshop',
  door: { place: 'Service bay 1', desc: 'insulated steel sectional door with an opener', customer: 'Kessler Auto Repair', level: 7 },
  framing: {
    arrival: { cx: 1.4, xHalf: 4.2, yMin: -0.2, yMax: 4.9 },
    work: { cx: 0, xHalf: 2.0, yMin: -0.1, yMax: 3.6 },
    inside: { cx: 0, xHalf: 2.2, yMin: -0.1, yMax: 3.9 },
  },
  build,
  restStates: ['closed', 'holding', 'stuck', 'stopped'],
  Door: SectionalDoor,
  hints: {
    closed: 'Tap a part to select it · tap the door to run it up · drag to look around',
    holding: 'Tap the door to run it down',
    stopped: 'Door stopped. Tap it to run it again.',
    operating: 'Door going up…',
    closing: 'Door coming down…',
    stuck: 'Door is jammed. Tap it to run it back down.',
  },

  components: {
    panels: {
      label: 'Bottom Section',
      blurb: 'The lowest of the four panels. It takes the hits from bumpers and gets the most wear.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0.6, 0.4, DZ], [1.0, 0.85, 1.55]),
      hit: { attach: 'panel0', center: [0, 0.03, 0.02], size: [W - 0.6, PH - 0.2, 0.1] },
    },
    hinges: {
      label: 'Section Hinges',
      blurb: 'Hinges join the panels on the inside, so the door can bend round the curve in the track.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([0, 1.45, DZ], [0.35, 1.6, -2.0]),
      hit: { attach: 'panel0', center: [0, PH / 2, -0.06], size: [2.2, 0.16, 0.1],
        extra: [1, 2].map((k) => ({ attach: `panel${k}`, center: [0, PH / 2, -0.06], size: [2.2, 0.16, 0.1] })) },
    },
    rollers: {
      label: 'Rollers & Tracks',
      blurb: 'Rollers on each panel end ride in steel tracks up the sides and along the ceiling.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([TX, 1.2, DZ], [TX - 1.1, 1.5, -1.9]),
      hit: EACH_PANEL([TX - 0.02, -PH / 2 + 0.1, -0.02], [0.14, 0.18, 0.14]),
    },
    photoEyes: {
      label: 'Photo Eyes',
      blurb: 'Sender and receiver at the bottom of the tracks. A broken beam reverses the door.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([TX - 0.1, 0.2, DZ - 0.12], [TX - 0.8, 0.7, -1.4]),
      hit: { center: [0, 0.15, DZ - 0.12], size: [W + 0.3, 0.2, 0.14] },
    },
    opener: {
      label: 'Garage Door Opener',
      blurb: 'Motor head on the ceiling with a trolley on a rail. Its UP and DOWN travel limits set where the door stops.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0, TRACK_Y, DZ - 3.6], [0.6, 2.2, DZ - 2.0]),
      hit: { center: [0, TRACK_Y + 0.1, DZ - 3.6], size: [0.65, 0.4, 0.7] },
    },
    bottomSeal: {
      label: 'Bottom Seal',
      blurb: 'Rubber seal along the bottom of the door. Squashes against the floor to keep out cold and water.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([0, 0.05, DZ], [0.3, 0.6, 1.5]),
      hit: { attach: 'panel0', center: [0, -PH / 2 + 0.01, 0.01], size: [W - 0.6, 0.07, 0.12] },
    },
    springs: {
      label: 'Torsion Spring',
      blurb: 'A wound spring on a shaft above the door. It carries the door\'s weight so the opener only has to steer it.',
      side: 'in', actions: ['INSPECT', 'TEST'],
      danger: 'A torsion spring holds enough force to break bones. Winding it takes winding bars and training. Leave it alone.',
      focus: S([0, H + 0.42, DZ - 0.12], [0.4, 2.3, -1.9]),
      hit: { center: [0, H + 0.42, DZ - 0.12], size: [W, 0.22, 0.22] },
    },
  },

  clues: {
    panels: {
      normal: ['All four sections are straight, no dents.', 'Rollers on the bottom section sit square in the track.'],
      dent: [
        'The bottom section is creased in, with red paint from a bumper on it.',
        'Its right end is bent, and that roller has popped half out of the track.',
        'Going up, the door binds and stops about a foot off the floor.',
      ],
    },
    hinges: {
      normal: ['Every hinge is tight and whole.'],
      hinge: [
        'The center hinge between the second and third sections is split down the middle.',
        'There\'s a gap between those two sections, wider in the middle.',
        'Going over the curve, those panels kink and bang.',
      ],
      dent: ['Hinges are whole, but the one on the bottom section is twisted with the dent.'],
    },
    rollers: {
      normal: ['Rollers spin free and quiet.', 'Tracks are straight and clean.'],
      rollers: [
        'The rollers wobble on their shafts. Their bearings are dry and rusty.',
        'Spinning one by hand, it grinds and catches.',
        'Black grit in the tracks where the rollers have worn.',
      ],
      dent: ['Rollers spin free.', 'The right roller on the bottom section has popped half out of the track.'],
    },
    photoEyes: {
      normal: ['Both eye brackets are tight.', 'Receiver LED is solid green: beam made.'],
      bayEyes: [
        'The receiver bracket is bent back, like a tire rolled over it.',
        'Receiver LED is amber and blinking: it can\'t see the sender.',
      ],
    },
    opener: {
      normal: ['Opener runs smooth.', 'It stops the door on the floor and at the top.'],
      bayLimit: [
        'Opener runs smooth.',
        'On a close, it shuts off with the door still a few inches off the floor.',
        'Someone has been turning the travel screws. There are fresh marks on them.',
      ],
      bayEyes: ['Opener runs smooth.', 'Its light blinks 10 times after every close: the code for a safety eye problem.'],
      rollers: ['Opener works, but it strains and the chain jerks while the door grinds along.'],
      dent: ['The opener strains, then stops: it hits its force limit when the door binds.'],
      hinge: ['Opener runs smooth, but you can hear a bang from the door partway up.'],
    },
    bottomSeal: {
      normal: ['Bottom seal is soft and whole.', 'Door down, it seals flat against the floor all the way across.'],
      baySeal: [
        'The bottom seal is ripped off along the left end.',
        'Door down, daylight shows under that end. Puddle stains on the floor inside.',
      ],
      bayLimit: ['Bottom seal is fine.', 'Door down, the whole bottom sits off the floor.'],
    },
    springs: {
      normal: ['Warning tag: HIGH TENSION.', 'Opener unhooked, the door stays put halfway: the spring is balanced.', 'No gaps in the coils.'],
    },
  },
  toolReadings: {
    multimeter: {
      photoEyes: ['Multimeter: 6 VDC at both eyes. Power is fine.'],
      opener: ['Multimeter: 120 V to the opener, steady under load.'],
    },
    level: {
      panels: {
        normal: ['Level: the door comes down level.'],
        dent: ['Level: the bottom section is bowed in about 3/4" at the right end.'],
      },
      rollers: ['Level: the horizontal tracks are level and the vertical tracks are plumb.'],
      bottomSeal: {
        normal: ['Level: the door sits flat on the floor.'],
        bayLimit: ['Level: the door is level, it just stops short of the floor all the way across.'],
      },
    },
  },

  faults: {
    dent: {
      name: 'Bottom section dented by a car', part: 'panels', doors: ['autoshop'], needsReplacing: true, priority: 'URGENT',
      complaint: 'Someone backed into bay 1\'s door, and now it sticks a foot off the ground. We can\'t get cars in or out.',
    },
    hinge: {
      name: 'Center hinge cracked', part: 'hinges', doors: ['autoshop'],
      complaint: 'Bay 1\'s door makes a loud popping bang every time it goes up or down.',
    },
    rollers: {
      name: 'Rollers worn out', part: 'rollers', doors: ['autoshop'],
      complaint: 'Bay 1\'s door is so loud it grinds the whole way up. Customers think it\'s about to fall.',
    },
    bayEyes: {
      name: 'Photo eye knocked out of line', part: 'photoEyes', doors: ['autoshop'],
      complaint: 'Bay 1\'s door comes down a little, then goes right back up. We have to hold the button to close it.',
    },
    bayLimit: {
      name: 'Opener travel set too high', part: 'opener', doors: ['autoshop'],
      complaint: 'Bay 1\'s door doesn\'t close all the way. There\'s a gap at the bottom and leaves blow in.',
    },
    baySeal: {
      name: 'Bottom seal torn', part: 'bottomSeal', doors: ['autoshop'], needsReplacing: true,
      complaint: 'Cold air and rainwater come in under bay 1\'s door at one end.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.eyeOff = fault === 'bayEyes' ? 2 + Math.floor(Math.random() * 2) : 0;
    aimEye(door.parts, JOB.eyeOff);
    JOB.limitGap = fault === 'bayLimit' ? 3 + Math.floor(Math.random() * 3) : 0;
    door.limitGap = JOB.limitGap;
    door.overtravel = false;
    showFault(door.parts, fault);
  },

  tests: {
    panels: { msg: 'Running the door up, watching the bottom section', run: (d) => d.cycleBig() },
    hinges: { msg: 'Running the door, watching the panels go over the curve', run: (d) => d.cycleBig() },
    rollers: { msg: 'Running the door, listening to the rollers', run: (d) => d.cycleBig() },
    photoEyes: { msg: 'Closing the door, watching the eyes', run: (d) => (d.state === 'holding' ? d.goDown() : d.cycleBig()) },
    opener: { msg: 'Running the door up and down from the button', run: (d) => d.cycleBig() },
    bottomSeal: { msg: 'Door down, looking along the bottom', run: (d) => d.sealCheck() },
    springs: { msg: 'Opener unhooked, door lifted halfway by hand: it stays put. Balanced.', run: () => {} },
  },

  checks: [
    ['opens', 'Opens all the way'],
    ['closes', 'Closes all the way'],
    ['quiet', 'Runs smooth and quiet'],
    ['safety', 'Reverses for an obstruction'],
    ['seal', 'Seals at the floor'],
  ],
  testCycles: [
    { label: 'Run it up and down from the wall button', start: (d) => d.cycleBig(), done: (c) => c.finished || c.t > 40 },
    { label: 'Close it with a car bumper in the doorway', start: (d) => d.closeWithObstruction(), done: (c) => c.finished || c.t > 40 },
    { label: 'Door down: look and feel along the bottom', start: (d) => d.sealCheck(), done: (c) => c.t > 1.5 },
  ],
  record(c, index, door) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.opens = c.reachedTop || (c.stuck ? false : null);
      r.closes = c.stuck ? null : c.closedFully;
      if (!c.stuck) r.quiet = !c.popped && !c.ground;
      if (c.stuck) symptoms.push('The door bound up and stuck about a foot off the floor. The opener strained, then quit.');
      if (c.popped) symptoms.push('A loud bang as the panels went over the curve in the track.');
      if (c.ground) symptoms.push('The door ground and rattled the whole way.');
      if (c.reversed) symptoms.push('Door came down about a foot, then went right back up on its own.');
      if (c.gap) symptoms.push('Door stopped a few inches short of the floor, leaving a gap.');
      if (c.slammed) symptoms.push('Door drove hard into the floor and bounced.');
      if (c.leaky) symptoms.push('Door closed, but daylight shows under one end.');
      if (c.closedFully) r.seal = !c.leaky;
    }
    if (index === 1) {
      r.safety = c.safetyStop || c.reversed ? true : c.stuck ? null : false;
    }
    if (index === 2) {
      const f = door && door.fault;
      if (door && door.state === 'closed' && door.open <= 0.001) r.seal = f !== 'baySeal';
      if (f === 'baySeal') symptoms.push('Door closed, but daylight shows under one end.');
    }
    return { r, symptoms };
  },

  procedures: {
    panels: {
      title: 'Checking the bottom section',
      start: () => ({}),
      steps: [
        { type: 'look', label: 'Look at the bottom section', button: 'LOOK',
          reveal: 'The section is creased right through its steel skin and bent at the end. It can\'t be straightened. It has to be replaced.' },
      ],
      finish() { return { fixed: false, quality: 40, parts: [] }; },
    },
    hinges: {
      title: 'Replacing the cracked hinge',
      start: () => ({ lockout: null, hinge: null }),
      steps: [
        LOCKOUT_STEP,
        { type: 'look', label: 'Look at the center hinge', button: 'LOOK',
          reveal: 'The center hinge between the second and third sections is split. Those panels flex apart every time they go round the curve.' },
        { type: 'choice', label: 'The cracked hinge', key: 'hinge',
          options: [{ label: 'NEW HINGE', part: 'sectionHinge', value: 'new' }, { label: 'TIGHTEN THE OLD ONE', value: 'old' }] },
        { type: 'hold', label: 'Bolt the hinge to both sections', tool: 'wrench', verb: 'TIGHTEN', count: 4 },
      ],
      finish(s, JOB) {
        lockoutResult(s, JOB);
        if (s.hinge !== 'new') return { fixed: false, quality: 35, parts: [] }; // a split hinge can't be tightened
        return { fixed: true, quality: 100, parts: [] };
      },
    },
    rollers: {
      title: 'Replacing the rollers',
      start: () => ({ lockout: null, rollers: null, track: null }),
      steps: [
        LOCKOUT_STEP,
        { type: 'look', label: 'Look at the rollers', button: 'LOOK',
          reveal: 'The rollers\' bearings are dry and rusty, and their wheels have worn lopsided. They wobble and grind in the track.' },
        { type: 'choice', label: 'The worn rollers', key: 'rollers',
          options: [{ label: 'NEW NYLON ROLLERS', part: 'rollerSet', value: 'new' }, { label: 'GREASE THE OLD ONES', value: 'grease' }] },
        { type: 'hold', label: 'Swap the rollers, one hinge bracket at a time', tool: 'wrench', verb: 'SWAP', count: 4 },
        { type: 'choice', label: 'The tracks', key: 'track',
          options: [{ label: 'WIPE THEM CLEAN', value: 'wipe' }, { label: 'PACK THEM WITH GREASE', value: 'grease' }] },
      ],
      finish(s, JOB) {
        lockoutResult(s, JOB);
        if (s.rollers !== 'new') return { fixed: false, quality: 40, parts: [] }; // worn bearings stay worn
        // grease in the tracks just collects grit: the rollers should roll, not slide
        return { fixed: true, quality: s.track === 'wipe' ? 100 : 80, parts: [] };
      },
    },
    photoEyes: {
      title: 'Lining up the photo eyes',
      start: (JOB) => ({ aim: JOB.eyeOff }),
      steps: [
        { type: 'look', label: 'Check the receiver LED', button: 'LOOK',
          reveal: 'Receiver LED is amber: no beam. Its bracket is bent back.' },
        { type: 'hold', label: 'Loosen the receiver bracket', tool: 'wrench', verb: 'LOOSEN', count: 1 },
        { type: 'nudge', label: 'Aim the receiver at the sender', key: 'aim', min: -3, max: 4, unit: 'clicks off',
          down: '◀ LEFT', up: 'RIGHT ▶',
          info: (s) => (s.aim === 0 ? 'LED solid green: beam made.'
            : Math.abs(s.aim) === 1 ? 'LED flickers green now and then. Almost.' : 'LED amber: no beam.'),
          apply: (s, parts) => aimEye(parts, s.aim) },
        { type: 'hold', label: 'Tighten the bracket', tool: 'wrench', verb: 'TIGHTEN', count: 1 },
      ],
      finish(s) { return { fixed: s.aim === 0, quality: s.aim === 0 ? 100 : 45, parts: [] }; },
    },
    opener: {
      title: 'Setting the down travel',
      start: (JOB) => ({ gap: JOB.limitGap }),
      steps: [
        { type: 'look', label: 'Find the travel screws on the opener', button: 'LOOK',
          reveal: 'Two screws on the side of the motor head: UP and DOWN travel. The DOWN screw has been backed off.' },
        { type: 'nudge', label: 'Turn the DOWN travel screw', key: 'gap', min: -2, max: 6, unit: 'turns short',
          down: '▼ FURTHER', up: 'SHORTER ▲',
          info: (s) => (s.gap === 0 ? 'The door will just touch the floor and squash the seal.'
            : s.gap > 0 ? `Door will still stop about ${Math.round(s.gap * 2.5)}" off the floor.`
            : 'Too far: the opener will keep pushing after the door hits the floor.') },
        { type: 'hold', label: 'Run the door down to check', tool: 'screwdriver', verb: 'CHECK', count: 1 },
      ],
      finish(s) {
        const fixed = s.gap === 0;
        return { fixed, quality: fixed ? 100 : s.gap < 0 ? 35 : 45, parts: [] };
      },
    },
  },
  repairTools: {
    panels: { ADJUST: ['screwdriver', 'wrench'], REPLACE: ['wrench'] },
    hinges: { ADJUST: ['wrench'] },
    rollers: { ADJUST: ['wrench'] },
    photoEyes: { ADJUST: ['wrench'], REPLACE: ['wrench', 'screwdriver'] },
    opener: { ADJUST: ['screwdriver'], REPLACE: ['wrench', 'screwdriver'] },
    bottomSeal: { REPLACE: ['screwdriver'] },
  },
  parts: {
    bottomSection: { cabinet: 'exits', name: 'Sectional door bottom section, 10 ft', cost: 310, note: 'Insulated steel section with seal retainer.' },
    sectionHinge: { cabinet: 'fasteners', name: 'Sectional door center hinge', cost: 9, note: '14-gauge hinge with carriage bolts.' },
    rollerSet: { cabinet: 'exits', name: 'Nylon rollers (set of 10)', cost: 64, note: 'Sealed-bearing rollers for sectional doors.' },
    garageSeal: { cabinet: 'exits', name: 'Bottom seal, 10 ft', cost: 42, note: 'Vinyl bulb seal for a sectional door.' },
    garageEyes: { cabinet: 'electrical', name: 'Opener safety eyes (pair)', cost: 48, note: 'Sender and receiver with brackets.' },
    garageOpener: { cabinet: 'electrical', name: 'Commercial trolley opener', cost: 520, note: '1/2 HP opener with rail.' },
  },
  replacements: { panels: 'bottomSection', bottomSeal: 'garageSeal', photoEyes: 'garageEyes', opener: 'garageOpener', hinges: null, rollers: null },

  // Make the door behave the way a finished repair left it.
  applyRepair(door, partId, result, state) {
    if (partId === 'photoEyes') aimEye(door.parts, result.replaced ? 0 : state.aim);
    if (partId === 'opener') {
      if (result.replaced) { door.limitGap = 0; door.overtravel = false; }
      else if (state.gap !== undefined) {
        door.limitGap = state.gap;
        door.overtravel = state.gap < 0;
        if (door.overtravel) door.fault = 'bayLimit'; // still wrong, just the other way
      }
    }
    if (result.fixed) showFault(door.parts, door.fault);
    if (door.state === 'stuck') door.goDown();       // a jammed door gets run back down
    if (door.state === 'closed' && door.open > 0) door.goUp();
  },
};
