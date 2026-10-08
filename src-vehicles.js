// vehicles.js — shaped vehicle parts: real wheels, cab shells cut from a side profile (sloped
// windshield, hood, wheel arches), lights, bumpers, mirrors. Used for the service truck's cab,
// the hospital's ambulance and the cars parked on the street.
//
// Every vehicle here faces +x (its nose points down the street toward +x). A profile is drawn as
// a side view in (x, y) and extruded across the vehicle's width along z.

import * as THREE from 'three';

const STAR_BLUE = new THREE.MeshStandardMaterial({ color: 0x1d4fa0, roughness: 0.5 });
const BLUE_LIGHT = new THREE.MeshStandardMaterial({ color: 0x1f5bff, emissive: 0x0a2aa0, emissiveIntensity: 0.6, roughness: 0.2 });

export const VMAT = {
  tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
  sidewall: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.85 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xb9bdc1, metalness: 0.8, roughness: 0.28 }),
  darkRim: new THREE.MeshStandardMaterial({ color: 0x3a3d41, metalness: 0.6, roughness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x16212c, metalness: 0.6, roughness: 0.08 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.6 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd8dbde, metalness: 0.9, roughness: 0.18 }),
  head: new THREE.MeshStandardMaterial({ color: 0xf4f7fa, emissive: 0x9aa6b0, emissiveIntensity: 0.25, roughness: 0.1 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xb3121b, emissive: 0x5a0508, emissiveIntensity: 0.5, roughness: 0.2 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xffa21a, emissive: 0xb36200, emissiveIntensity: 0.5, roughness: 0.3 }),
  well: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1, side: THREE.DoubleSide }),
};

function add(parent, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// One wheel: tire with rounded shoulders, rim with spokes and a hub, axis along z.
export function wheel(parent, x, y, z, { r = 0.38, w = 0.26, rim = VMAT.rim, spokes = 6 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const tire = add(g, new THREE.CylinderGeometry(r - 0.03, r - 0.03, w, 32), VMAT.tire, 0, 0, 0);
  tire.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { // rounded shoulders
    const sh = add(g, new THREE.TorusGeometry(r - 0.045, 0.045, 10, 32), VMAT.tire, 0, 0, s * (w / 2 - 0.04));
    sh.castShadow = false;
  }
  for (const s of [-1, 1]) {
    const face = s; // rim face on both sides
    const disc = add(g, new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.02, 28), rim, 0, 0, face * (w / 2 - 0.005));
    disc.rotation.x = Math.PI / 2;
    const hub = add(g, new THREE.CylinderGeometry(r * 0.16, r * 0.18, 0.05, 16), VMAT.chrome, 0, 0, face * (w / 2 + 0.01));
    hub.rotation.x = Math.PI / 2;
    for (let i = 0; i < spokes; i++) { // dark windows between the spokes read as a real rim
      const a = (i / spokes) * Math.PI * 2;
      const hole = add(g, new THREE.CylinderGeometry(r * 0.09, r * 0.09, 0.025, 10), VMAT.trim,
        Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, face * (w / 2 - 0.002));
      hole.rotation.x = Math.PI / 2;
      hole.castShadow = false;
    }
  }
  return g;
}

// Dark wheel well + a black fender flare arch on one side face (z = sideZ, facing -z or +z).
export function wheelArch(parent, x, y, sideZ, r = 0.46, facing = -1) {
  const well = new THREE.Mesh(new THREE.CircleGeometry(r, 28, 0, Math.PI), VMAT.well);
  well.position.set(x, y, sideZ + facing * 0.004);
  if (facing > 0) well.rotation.y = Math.PI;
  parent.add(well);
  const flare = add(parent, new THREE.TorusGeometry(r, 0.035, 8, 28, Math.PI), VMAT.trim, x, y, sideZ + facing * 0.02);
  flare.castShadow = false;
  return well;
}

// A flat window cut to a polygon (side view), on a side face at z = sideZ.
export function sideWindow(parent, points, sideZ, facing = -1) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), VMAT.glass);
  m.position.z = sideZ + facing * 0.003;
  if (facing < 0) { m.rotation.y = Math.PI; m.scale.x = -1; } // keep x the same, face -z
  parent.add(m);
  return m;
}

// A sloped glass panel between two side-view points, spanning `width` across z.
export function slopedGlass(parent, [xa, ya], [xb, yb], width, zc, inset = 0.0) {
  const len = Math.hypot(xb - xa, yb - ya);
  const m = add(parent, new THREE.BoxGeometry(len, 0.012, width), VMAT.glass, (xa + xb) / 2, (ya + yb) / 2, zc);
  m.rotation.z = Math.atan2(yb - ya, xb - xa);
  m.translateY(inset);
  m.castShadow = false;
  return m;
}

export function sideMirror(parent, x, y, sideZ, facing = -1, mat = VMAT.trim) {
  add(parent, new THREE.BoxGeometry(0.05, 0.03, 0.14), mat, x, y, sideZ + facing * 0.07);
  add(parent, new THREE.BoxGeometry(0.08, 0.16, 0.05), mat, x - 0.01, y + 0.02, sideZ + facing * 0.17);
}

// ---------------------------------------------------------------- a parked sedan
export function sedan(scene, { x, z, color = 0x8a1f24, flip = false }) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  if (flip) car.rotation.y = Math.PI;
  scene.add(car);
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32 });
  const W = 1.78, L = 4.6;
  const front = L / 2, back = -L / 2, wr = 0.33, fx = 1.35, rx = -1.4;
  const shape = new THREE.Shape();
  shape.moveTo(front, 0.32);
  shape.lineTo(front - 0.05, 0.72);
  shape.lineTo(front - 0.95, 0.86);
  shape.lineTo(0.55, 1.36);
  shape.lineTo(-0.75, 1.4);
  shape.lineTo(-1.55, 1.0);
  shape.lineTo(back + 0.05, 0.92);
  shape.lineTo(back, 0.36);
  shape.lineTo(back + 0.2, 0.28);
  shape.lineTo(rx - wr - 0.06, 0.28);
  shape.absarc(rx, 0.33, wr + 0.06, Math.PI, 0, true);
  shape.lineTo(fx - wr - 0.06, 0.28);
  shape.absarc(fx, 0.33, wr + 0.06, Math.PI, 0, true);
  shape.lineTo(front - 0.15, 0.28);
  shape.closePath();
  const bev = 0.06;
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
    depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 18 }), paint);
  body.position.z = -W / 2 + bev;
  body.castShadow = true;
  car.add(body);
  for (const s of [-1, 1]) {
    const sz = s * W / 2;
    sideWindow(car, [[0.5, 0.92], [0.42, 1.3], [-0.72, 1.33], [-1.42, 0.98]], sz, s);
    add(car, new THREE.BoxGeometry(0.05, 0.42, 0.01), VMAT.trim, -0.2, 1.12, sz + s * 0.004); // B-pillar
    sideMirror(car, 0.6, 0.98, sz, s, paint);
    add(car, new THREE.BoxGeometry(0.16, 0.025, 0.02), VMAT.chrome, 0.25, 0.8, sz + s * 0.01); // handles
    add(car, new THREE.BoxGeometry(0.16, 0.025, 0.02), VMAT.chrome, -0.65, 0.8, sz + s * 0.01);
    for (const wx of [fx, rx]) {
      wheel(car, wx, wr, s * (W / 2 - 0.12), { r: wr, w: 0.22, spokes: 5 });
    }
  }
  slopedGlass(car, [front - 0.95, 0.88], [0.55, 1.35], W - 0.2, 0, 0.012);
  slopedGlass(car, [-0.75, 1.39], [-1.55, 1.0], W - 0.2, 0, 0.012);
  for (const s of [-1, 1]) {
    add(car, new THREE.BoxGeometry(0.04, 0.12, 0.38), VMAT.head, front + 0.005, 0.66, s * 0.6);
    add(car, new THREE.BoxGeometry(0.04, 0.12, 0.34), VMAT.tail, back - 0.005, 0.8, s * 0.62);
  }
  add(car, new THREE.BoxGeometry(0.04, 0.14, 0.7), VMAT.trim, front + 0.01, 0.48, 0); // grille
  add(car, new THREE.BoxGeometry(0.12, 0.14, W - 0.1), VMAT.trim, front - 0.02, 0.34, 0); // bumpers
  add(car, new THREE.BoxGeometry(0.12, 0.14, W - 0.1), VMAT.trim, back + 0.02, 0.36, 0);
  return car;
}

// ---------------------------------------------------------------- a Type III ambulance
// Van cab up front, square patient box behind it, red stripe, light bars. Faces +x.
export function ambulance(scene, { x, z, rotY = 0 }) {
  const amb = new THREE.Group();
  amb.position.set(x, 0, z);
  amb.rotation.y = rotY;
  scene.add(amb);
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, metalness: 0.25, roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc0262d, roughness: 0.45 });
  const W = 2.0, front = 2.55, wr = 0.37, fx = 1.75, rx = -1.45;
  // van cab
  const cabShape = new THREE.Shape();
  cabShape.moveTo(front, 0.45);
  cabShape.lineTo(front, 1.08);
  cabShape.lineTo(front - 0.18, 1.28);
  cabShape.lineTo(1.5, 1.42);
  cabShape.lineTo(1.0, 2.15);
  cabShape.lineTo(0.55, 2.2);
  cabShape.lineTo(0.55, 0.45);
  cabShape.lineTo(fx - 0.46, 0.45);
  cabShape.absarc(fx, wr, 0.46, Math.PI, 0, true);
  cabShape.lineTo(front, 0.45);
  const bev = 0.05;
  const cab = new THREE.Mesh(new THREE.ExtrudeGeometry(cabShape, {
    depth: W - 0.1 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 18 }), white);
  cab.position.z = -(W - 0.1) / 2 + bev;
  cab.castShadow = true;
  amb.add(cab);
  // patient box (rounded edges), with the rear wheel arch
  const boxShape = new THREE.Shape();
  boxShape.moveTo(0.55, 0.5);
  boxShape.lineTo(0.55, 2.55);
  boxShape.lineTo(-2.55, 2.55);
  boxShape.lineTo(-2.55, 0.5);
  boxShape.lineTo(rx - 0.47, 0.5);
  boxShape.absarc(rx, wr, 0.47, Math.PI, 0, true);
  boxShape.lineTo(0.55, 0.5);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(boxShape, {
    depth: W + 0.1 - 2 * 0.06, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 18 }), white);
  body.position.z = -(W + 0.1) / 2 + 0.06;
  body.castShadow = true;
  amb.add(body);
  for (const [cx, r] of [[fx, 0.46], [rx, 0.47]]) {
    const well = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0, Math.PI), VMAT.well);
    well.position.set(cx, wr, 0);
    amb.add(well);
  }
  for (const s of [-1, 1]) {
    const cz = s * (W - 0.1) / 2, bz = s * (W + 0.1) / 2;
    sideWindow(amb, [[0.62, 1.45], [0.62, 2.05], [0.98, 2.08], [1.42, 1.45]], cz, s);
    add(amb, new THREE.BoxGeometry(3.1, 0.24, 0.01), red, -1.0, 1.3, bz + s * 0.004);      // red band
    add(amb, new THREE.BoxGeometry(1.9, 0.12, 0.01), red, 1.55, 1.0, cz + s * 0.004);
    // star-of-life-ish cross on the box side
    for (let k = 0; k < 3; k++) { // blue star of life: three bars at 60°
      const bar = add(amb, new THREE.BoxGeometry(0.13, 0.46, 0.01), STAR_BLUE, -1.0, 1.95, bz + s * 0.004);
      bar.rotation.z = (k * Math.PI) / 3;
      bar.castShadow = false;
    }
    sideMirror(amb, 1.3, 1.5, cz, s);
    wheel(amb, fx, wr, s * (W / 2 - 0.16), { r: wr, w: 0.25 });
    wheel(amb, rx, wr, s * (W / 2 - 0.1), { r: wr, w: 0.3, rim: VMAT.darkRim });
    // red/white light bars at the top corners of the box
    add(amb, new THREE.BoxGeometry(0.22, 0.1, 0.22), VMAT.tail, 0.45, 2.6, s * 0.85);
    add(amb, new THREE.BoxGeometry(0.22, 0.1, 0.22), VMAT.tail, -2.45, 2.6, s * 0.85);
  }
  slopedGlass(amb, [1.5, 1.43], [1.0, 2.14], W - 0.32, 0, 0.012);
  for (let k = 0; k < 6; k++) {                                                              // red/blue cab light bar
    add(amb, new THREE.BoxGeometry(0.2, 0.1, 0.19), k < 3 ? VMAT.tail : BLUE_LIGHT, 0.75, 2.27, -0.5 + k * 0.2);
  }
  add(amb, new THREE.BoxGeometry(0.04, 0.3, 0.8), VMAT.trim, front + 0.01, 0.82, 0);         // grille
  for (const s of [-1, 1]) add(amb, new THREE.BoxGeometry(0.04, 0.14, 0.3), VMAT.head, front + 0.01, 0.98, s * 0.7);
  add(amb, new THREE.BoxGeometry(0.16, 0.18, W), VMAT.trim, front + 0.05, 0.52, 0);
  // rear doors
  add(amb, new THREE.BoxGeometry(0.02, 1.6, 0.01), VMAT.trim, -2.62, 1.45, 0);
  for (const s of [-1, 1]) add(amb, new THREE.BoxGeometry(0.03, 0.5, 0.6), VMAT.glass, -2.62, 2.0, s * 0.45);
  add(amb, new THREE.BoxGeometry(0.2, 0.16, W + 0.1), VMAT.trim, -2.66, 0.55, 0);
  return amb;
}


function labelTex(text, { w = 512, h = 96, bg = null, fg = '#111', px = 64, font = 'Arial' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = fg; g.font = `bold ${px}px ${font}, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function decal(parent, tex, w, h, x, y, z, facing) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5 }));
  m.position.set(x, y, z);
  if (facing < 0) m.rotation.y = Math.PI;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- warehouse forklift
// Yellow counterbalance forklift, forks toward +x.
export function forklift(scene, { x, z, rotY = 0, forkHeight = 0.12 }) {
  const fk = new THREE.Group();
  fk.position.set(x, 0, z);
  fk.rotation.y = rotY;
  scene.add(fk);
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.45, metalness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2b2e33, metalness: 0.6, roughness: 0.45 });
  add(fk, new THREE.BoxGeometry(1.5, 0.5, 1.05), yellow, 0, 0.55, 0);              // chassis
  add(fk, new THREE.BoxGeometry(0.45, 0.62, 1.05), yellow, -0.62, 0.78, 0);        // counterweight
  add(fk, new THREE.BoxGeometry(0.5, 0.25, 0.5), VMAT.trim, -0.15, 0.92, 0);       // seat base
  add(fk, new THREE.BoxGeometry(0.42, 0.08, 0.46), VMAT.trim, -0.2, 1.06, 0);      // seat
  add(fk, new THREE.BoxGeometry(0.08, 0.4, 0.44), VMAT.trim, -0.42, 1.25, 0);      // seat back
  for (const [px, pz] of [[0.42, 0.48], [0.42, -0.48], [-0.6, 0.48], [-0.6, -0.48]]) {
    add(fk, new THREE.BoxGeometry(0.06, 1.35, 0.06), steel, px, 1.47, pz);          // overhead guard posts
  }
  add(fk, new THREE.BoxGeometry(1.1, 0.05, 1.02), steel, -0.09, 2.15, 0);          // guard roof
  for (const pz of [-0.3, 0.3]) add(fk, new THREE.BoxGeometry(0.1, 2.3, 0.1), steel, 0.82, 1.2, pz); // mast rails
  add(fk, new THREE.BoxGeometry(0.1, 0.1, 0.7), steel, 0.82, 2.3, 0);
  add(fk, new THREE.BoxGeometry(0.06, 0.6, 0.8), steel, 0.9, forkHeight + 0.3, 0);  // carriage
  for (const pz of [-0.25, 0.25]) add(fk, new THREE.BoxGeometry(1.0, 0.05, 0.12), steel, 1.4, forkHeight, pz); // forks
  add(fk, new THREE.BoxGeometry(0.05, 0.36, 0.05), VMAT.trim, 0.2, 1.08, 0);       // steering column
  const sw = add(fk, new THREE.TorusGeometry(0.13, 0.02, 8, 20), VMAT.trim, 0.12, 1.26, 0);
  sw.rotation.y = Math.PI / 2; sw.rotation.x = 0.5;
  add(fk, new THREE.BoxGeometry(0.1, 0.06, 0.06), VMAT.amber, -0.55, 2.2, 0);      // beacon
  for (const s of [-1, 1]) {
    wheel(fk, 0.45, 0.3, s * 0.48, { r: 0.3, w: 0.22, rim: steel, spokes: 5 });
    wheel(fk, -0.55, 0.24, s * 0.46, { r: 0.24, w: 0.2, rim: steel, spokes: 5 });
    decal(fk, labelTex('5000 LB', { w: 256, h: 80, px: 46 }), 0.36, 0.11, -0.62, 0.95, s * 0.53, s);
  }
  return fk;
}

// ---------------------------------------------------------------- medium-duty box truck
// Cab-over cab with a white box behind it, faces +x.
export function boxTruck(scene, { x, z, rotY = 0, name = 'IRONSIDE FREIGHT' }) {
  const bt = new THREE.Group();
  bt.position.set(x, 0, z);
  bt.rotation.y = rotY;
  scene.add(bt);
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f1ef, metalness: 0.2, roughness: 0.45 });
  const W = 2.3, wr = 0.45;
  // cab: tall, flat-nosed, with a raked windshield
  const cab = new THREE.Shape();
  cab.moveTo(3.4, 0.55); cab.lineTo(3.4, 1.55); cab.lineTo(3.25, 2.55); cab.lineTo(2.0, 2.65); cab.lineTo(2.0, 0.55);
  cab.lineTo(3.0 - 0.53, 0.55); cab.absarc(2.75, wr, 0.53, Math.PI, 0, true);
  const bev = 0.05;
  const cm = new THREE.Mesh(new THREE.ExtrudeGeometry(cab, { depth: W - 0.1 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 }), white);
  cm.position.z = -(W - 0.1) / 2 + bev; cm.castShadow = true; bt.add(cm);
  slopedGlass(bt, [3.4, 1.6], [3.26, 2.45], W - 0.3, 0, 0.012);
  add(bt, new THREE.BoxGeometry(0.05, 0.5, 1.4), VMAT.trim, 3.43, 1.05, 0);              // grille
  for (const s of [-1, 1]) add(bt, new THREE.BoxGeometry(0.04, 0.16, 0.34), VMAT.head, 3.43, 0.9, s * 0.85);
  add(bt, new THREE.BoxGeometry(0.2, 0.25, W + 0.05), VMAT.trim, 3.5, 0.6, 0);            // bumper
  // box body
  add(bt, new THREE.BoxGeometry(5.2, 2.5, W + 0.1), white, -0.75, 2.05, 0);
  add(bt, new THREE.BoxGeometry(5.2, 0.12, W + 0.12), VMAT.trim, -0.75, 0.75, 0);         // frame rail
  add(bt, new THREE.BoxGeometry(0.03, 2.3, W - 0.2), VMAT.trim, -3.37, 2.05, 0);          // rear roll-up door seam
  for (let i = 0; i < 9; i++) add(bt, new THREE.BoxGeometry(0.02, 0.02, W - 0.2), VMAT.trim, -3.37, 1.0 + i * 0.25, 0);
  for (const s of [-1, 1]) {
    const sz = s * (W - 0.1) / 2;
    sideWindow(bt, [[2.1, 1.75], [2.1, 2.45], [3.1, 2.5], [3.22, 1.75]], sz, s);
    sideMirror(bt, 3.2, 1.9, sz, s);
    wheel(bt, 2.75, wr, s * (W / 2 - 0.2), { r: wr, w: 0.28 });
    wheel(bt, -1.9, wr, s * (W / 2 - 0.15), { r: wr, w: 0.34, rim: VMAT.darkRim });
    decal(bt, labelTex(name, { w: 1024, h: 140, px: 96, fg: '#1f3b63' }), 3.6, 0.5, -0.75, 2.4, s * (W / 2 + 0.051), s);
    add(bt, new THREE.BoxGeometry(5.0, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0x1f3b63 }), -0.75, 1.75, s * (W / 2 + 0.052));
  }
  for (const s of [-1, 1]) add(bt, new THREE.BoxGeometry(0.04, 0.2, 0.14), VMAT.tail, -3.37, 1.0, s * 1.0);
  return bt;
}

// ---------------------------------------------------------------- school bus (conventional)
export function schoolBus(scene, { x, z, rotY = 0 }) {
  const bus = new THREE.Group();
  bus.position.set(x, 0, z);
  bus.rotation.y = rotY;
  scene.add(bus);
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf7b500, roughness: 0.45, metalness: 0.1 });
  const W = 2.4, wr = 0.48, L0 = -5.2, L1 = 3.6;
  // body: long box with rounded roof edge, hood in front
  const sh = new THREE.Shape();
  sh.moveTo(L1, 0.55); sh.lineTo(L1, 1.35); sh.lineTo(2.2, 1.45); sh.lineTo(2.0, 2.9); sh.lineTo(L0 + 0.15, 2.95);
  sh.lineTo(L0, 2.8); sh.lineTo(L0, 0.55);
  sh.lineTo(-3.2 - 0.56, 0.55); sh.absarc(-3.2, wr, 0.56, Math.PI, 0, true);
  sh.lineTo(2.7 - 0.56, 0.55); sh.absarc(2.7, wr, 0.56, Math.PI, 0, true);
  sh.lineTo(L1, 0.55);
  const bev = 0.08;
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 }), yellow);
  body.position.z = -W / 2 + bev; body.castShadow = true; bus.add(body);
  slopedGlass(bus, [2.2, 1.5], [2.02, 2.75], W - 0.25, 0, 0.012);
  const black = VMAT.trim;
  for (const s of [-1, 1]) {
    const sz = s * W / 2;
    for (let i = 0; i < 9; i++) { // passenger windows
      const wx = 1.55 - i * 0.72;
      sideWindow(bus, [[wx - 0.6, 1.75], [wx - 0.6, 2.5], [wx, 2.5], [wx, 1.75]], sz, s);
    }
    for (const y of [1.6, 1.15, 0.85]) add(bus, new THREE.BoxGeometry(L1 - L0 - 0.4, 0.05, 0.01), black, (L0 + L1) / 2 - 0.2, y, sz + s * 0.005); // rub rails
    decal(bus, labelTex('LINCOLN SCHOOL DISTRICT', { w: 1024, h: 110, px: 60 }), 3.4, 0.36, -1.5, 1.38, sz + s * 0.006, s);
    wheel(bus, 2.7, wr, s * (W / 2 - 0.2), { r: wr, w: 0.3 });
    wheel(bus, -3.2, wr, s * (W / 2 - 0.15), { r: wr, w: 0.36, rim: VMAT.darkRim });
    sideMirror(bus, 2.3, 2.0, sz, s, black);
    add(bus, new THREE.BoxGeometry(0.25, 0.25, 0.04), VMAT.tail, 1.9, 2.0, sz + s * 0.03); // stop arm
  }
  decal(bus, labelTex('SCHOOL BUS', { w: 512, h: 110, px: 70, bg: '#f7b500' }), 1.4, 0.3, 2.0, 2.98, 0, 1).rotation.set(0, Math.PI / 2, 0);
  add(bus, new THREE.BoxGeometry(0.06, 0.4, 1.3), black, L1 + 0.01, 1.0, 0);   // grille
  for (const s of [-1, 1]) {
    add(bus, new THREE.BoxGeometry(0.05, 0.16, 0.2), VMAT.head, L1 + 0.02, 1.15, s * 0.9);
    add(bus, new THREE.BoxGeometry(0.06, 0.12, 0.12), VMAT.tail, 2.05, 2.86, s * 0.85);   // warning lights
    add(bus, new THREE.BoxGeometry(0.06, 0.12, 0.12), VMAT.amber, 2.05, 2.86, s * 0.6);
  }
  add(bus, new THREE.BoxGeometry(0.22, 0.25, W + 0.1), black, L1 + 0.1, 0.6, 0);  // bumpers
  add(bus, new THREE.BoxGeometry(0.22, 0.25, W + 0.1), black, L0 - 0.1, 0.6, 0);
  return bus;
}

// ---------------------------------------------------------------- high-roof delivery van
export function deliveryVan(scene, { x, z, rotY = 0, color = 0xf3f3f1, name = 'FRESH FOODS DELIVERY' }) {
  const van = new THREE.Group();
  van.position.set(x, 0, z);
  van.rotation.y = rotY;
  scene.add(van);
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.4 });
  const W = 2.0, wr = 0.36, fx = 1.9, rx = -1.6;
  const sh = new THREE.Shape();
  sh.moveTo(2.8, 0.42); sh.lineTo(2.8, 0.95); sh.lineTo(2.55, 1.2); sh.lineTo(1.85, 1.38); sh.lineTo(1.25, 2.45);
  sh.lineTo(-2.6, 2.5); sh.lineTo(-2.75, 2.3); sh.lineTo(-2.75, 0.42);
  sh.lineTo(rx - 0.45, 0.42); sh.absarc(rx, wr, 0.45, Math.PI, 0, true);
  sh.lineTo(fx - 0.45, 0.42); sh.absarc(fx, wr, 0.45, Math.PI, 0, true);
  sh.lineTo(2.8, 0.42);
  const bev = 0.07;
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 18 }), paint);
  body.position.z = -W / 2 + bev; body.castShadow = true; van.add(body);
  slopedGlass(van, [1.86, 1.4], [1.28, 2.4], W - 0.2, 0, 0.012);
  for (const s of [-1, 1]) {
    const sz = s * W / 2;
    sideWindow(van, [[0.75, 1.45], [0.75, 2.1], [1.25, 2.1], [1.72, 1.45]], sz, s);
    add(van, new THREE.BoxGeometry(0.012, 1.7, 0.008), VMAT.trim, -0.35, 1.35, sz + s * 0.004);  // sliding door seam
    add(van, new THREE.BoxGeometry(0.012, 1.7, 0.008), VMAT.trim, 0.7, 1.35, sz + s * 0.004);
    sideMirror(van, 1.6, 1.5, sz, s);
    wheel(van, fx, wr, s * (W / 2 - 0.14), { r: wr, w: 0.23 });
    wheel(van, rx, wr, s * (W / 2 - 0.14), { r: wr, w: 0.23 });
    decal(van, labelTex(name, { w: 1024, h: 120, px: 66, fg: '#2c8a3e' }), 2.6, 0.3, -1.15, 1.75, sz + s * 0.006, s);
  }
  add(van, new THREE.BoxGeometry(0.04, 0.24, 1.0), VMAT.trim, 2.81, 0.75, 0);   // grille
  for (const s of [-1, 1]) {
    add(van, new THREE.BoxGeometry(0.04, 0.14, 0.32), VMAT.head, 2.75, 0.98, s * 0.7);
    add(van, new THREE.BoxGeometry(0.04, 0.4, 0.12), VMAT.tail, -2.76, 1.3, s * 0.88);
  }
  add(van, new THREE.BoxGeometry(0.18, 0.2, W + 0.04), VMAT.trim, 2.85, 0.48, 0);
  add(van, new THREE.BoxGeometry(0.18, 0.2, W + 0.04), VMAT.trim, -2.8, 0.48, 0);
  add(van, new THREE.BoxGeometry(0.02, 1.8, 0.01), VMAT.trim, -2.76, 1.4, 0);   // rear barn door seam
  return van;
}
