// truckScene.js — the tech's service truck parked at the curb, with side cabinets.
//
// It's a white service-body pickup facing down the street. The side toward the store has
// four cabinet doors (2 across x 2 high) that swing UP to show the shelves inside.
// Cabinet ids match the parts catalog in truck.js.

import * as THREE from 'three';
import { serviceTruck, compartmentDoor, TRUCK_STRIPE } from './src-vehicles2.js';
import { profile, shell } from './src-vehicleKit.js';
import { loadCareer } from './src-career.js';

export const CABINETS = [
  // id, label, column (0 = rear), row (0 = lower)
  { id: 'fasteners', label: 'SHIMS & FASTENERS', col: 0, row: 1 },   // col 0 = left as you face it
  { id: 'electrical', label: 'ELECTRICAL', col: 1, row: 1 },
  { id: 'locks', label: 'LOCKS & STRIKES', col: 0, row: 0 },
  { id: 'exits', label: 'EXIT DEVICES & PLATES', col: 1, row: 0 },
];

const SIDE_Z = 10.2;   // the truck's side facing the store
// column 0 is on the LEFT as you face the truck from the sidewalk (that's toward -x... flipped)
const COL_X = [-1.25, -2.25];
const ROWS = [{ y0: 0.58, y1: 1.06 }, { y0: 1.1, y1: 1.56 }];
const DOOR_W = 0.9;

// Where the camera stands to look at the cabinets (on the sidewalk, facing the truck).
export const TRUCK_VIEW = {
  pos: new THREE.Vector3(-1.65, 1.55, 5.2),
  look: new THREE.Vector3(-1.65, 0.3, SIDE_Z),
};

// Close-up camera for one open cabinet (looks a bit low so the cabinet sits in the upper
// part of the screen, above the truck panel).
export function cabinetView(id) {
  const cab = CABINETS.find((c) => c.id === id);
  const x = COL_X[cab.col];
  const { y0, y1 } = ROWS[cab.row];
  const ym = (y0 + y1) / 2;
  return {
    side: 'truck',
    camV: new THREE.Vector3(x, ym + 0.35, SIDE_Z - 2.3),
    lookV: new THREE.Vector3(x, ym - 0.42, SIDE_Z + 0.2),
  };
}

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4a4f55');
  grad.addColorStop(1, '#3a3e43');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  // diamond-plate-ish border + chrome T-handle
  g.strokeStyle = '#6b7178';
  g.lineWidth = 10;
  g.strokeRect(8, 8, 496, 240);
  g.fillStyle = '#d6d9dc';
  g.fillRect(226, 196, 60, 14);
  g.fillRect(250, 186, 12, 30);
  // label plate
  g.fillStyle = '#f5b301';
  g.fillRect(56, 60, 400, 64);
  g.fillStyle = '#111';
  g.font = `bold ${text.length > 16 ? 30 : 36}px Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 93);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Cab door logo, as on the concept sheet: garage-door icon, DOOR TECH / SERVICE, a red rule and
// REPAIR • INSTALL • MAINTAIN. Transparent background so it sits on the white paint.
function decalTexture() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2024';
  // garage door icon: a house outline with slats
  g.lineWidth = 12; g.strokeStyle = '#1d2024'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(40, 120); g.lineTo(110, 60); g.lineTo(180, 120); g.lineTo(180, 220); g.lineTo(40, 220); g.closePath(); g.stroke();
  for (let y = 132; y <= 204; y += 18) g.fillRect(64, y, 92, 10);
  g.font = 'bold 74px Arial, sans-serif'; g.textBaseline = 'alphabetic';
  g.fillText('DOOR TECH', 205, 140);
  g.font = '600 62px Arial, sans-serif';
  g.fillText('SERVICE', 205, 210);
  g.fillStyle = '#c8202a'; g.fillRect(30, 240, 590, 10);
  g.fillStyle = '#1d2024'; g.font = 'bold 34px Arial, sans-serif';
  g.fillText('REPAIR  •  INSTALL  •  MAINTAIN', 40, 296);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function textTexture(text, w = 256, h = 96, px = 60) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2024'; g.font = `bold ${px}px Arial, sans-serif`; g.textBaseline = 'middle';
  g.fillText(text, 6, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(parent, mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function buildTruck(scene) {
  const truck = new THREE.Group();
  truck.name = 'serviceTruck';
  scene.add(truck);

  // The new DT-104 (vehicles2.js), parked with its curb-side body face on SIDE_Z. Its curb-side
  // compartment is built here instead, with real openings for the four cabinets.
  const BW = 2.1, SIDE = 0.52, RX = -0.2;
  const v = serviceTruck(truck, { z: SIDE_Z + BW / 2, curbDoors: false, curbBox: false, level: loadCareer().truck || 1 });
  const white = v.userData.white;
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1f23, roughness: 0.7 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, metalness: 0.7, roughness: 0.3 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.8, side: THREE.BackSide });

  const RECESS = 0.36;
  const bx0 = -3.02, bx1 = 0.86, by0 = 0.5, by1 = 1.62;
  const openX = COL_X.map((x) => [x - DOOR_W / 2, x + DOOR_W / 2]).sort((a, b) => a[0] - b[0]);
  const ox0 = openX[0][0], ox1 = openX[1][1];
  const zc = SIDE_Z + SIDE / 2;
  const piece = (x0, x1, y0, y1, d = SIDE, z0 = SIDE_Z) => box(truck, white, x1 - x0, y1 - y0, d, (x0 + x1) / 2, (y0 + y1) / 2, z0 + d / 2);
  piece(bx0, ox0, by0, by1);                                   // rear end, left of the cabinets
  piece(ox0, ox1, ROWS[1].y1, by1);                            // above
  piece(ox0, ox1, by0, ROWS[0].y0);                            // below
  piece(openX[0][1], openX[1][0], ROWS[0].y0, ROWS[1].y1);     // post between the columns
  piece(ox0, ox1, ROWS[0].y1, ROWS[1].y0);                     // rail between the rows
  piece(ox0, ox1, ROWS[0].y0, ROWS[1].y1, SIDE - RECESS, SIDE_Z + RECESS); // back wall of the cabinets
  // front part of the compartment (ahead of the cabinets), with the rear wheel arch cut in
  const front = profile([[bx1, by0, 0.02], [bx1, by1, 0.03], [ox1, by1, 0], [ox1, by0, 0], { arch: [RX, by0, 0.53] }]);
  const fm = new THREE.Mesh(shell(front, SIDE, { bevel: 0.03 }), white);
  fm.position.z = zc;
  fm.castShadow = true;
  truck.add(fm);
  for (const m of truck.children) if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  // the red body line on the curb side: across the solid parts, not the cabinet openings
  const red = v.userData.red, [sy0, sy1] = TRUCK_STRIPE;
  for (const [x0, x1] of [[bx0 + 0.03, ox0], [openX[0][1], openX[1][0]], [ox1, bx1 - 0.03]]) {
    box(truck, red, x1 - x0, sy1 - sy0, 0.006, (x0 + x1) / 2, (sy0 + sy1) / 2, SIDE_Z - 0.004);
  }
  // the two ordinary compartments on that front part
  compartmentDoor(truck, 0.3, 0.82, 0.58, 1.58, SIDE_Z, -1, white, 'paddle', [sy0, sy1, red]);
  compartmentDoor(truck, -0.72, 0.28, 1.06, 1.58, SIDE_Z, -1, white, 'paddle', [sy0, sy1, red]);

  // Cones around the parked truck, the way a tech sets up at the curb: a taper behind it
  // (angling out from the curb so traffic eases past) and one off the front bumper.
  const coneOrange = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.55 });
  const coneWhite = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.2 });
  const coneBase = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 });
  for (const [cx, cz] of [[-4.8, SIDE_Z + 0.25], [-4.1, SIDE_Z + 1.1], [-3.45, SIDE_Z + 1.95], [4.4, SIDE_Z + 1.75]]) {
    const cone = new THREE.Group();
    cone.position.set(cx, 0, cz);
    truck.add(cone);
    box(cone, coneBase, 0.26, 0.025, 0.26, 0, 0.0125, 0);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.095, 0.43, 20), coneOrange);
    body.position.y = 0.24;
    cone.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.06, 20), coneWhite);
    band.position.y = 0.3;
    cone.add(band);
    cone.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  // cabinets: a dark recess with shelves + a door hinged along its top edge
  const doors = {};
  CABINETS.forEach((cab, i) => {
    const x = COL_X[cab.col];
    const { y0, y1 } = ROWS[cab.row];
    const h = y1 - y0;
    // dark lining of the opening (inside faces only, so you can see in through the front)
    box(truck, interior, DOOR_W - 0.01, h - 0.01, RECESS - 0.01, x, (y0 + y1) / 2, SIDE_Z + RECESS / 2);
    box(truck, rim, DOOR_W - 0.06, 0.015, 0.28, x, y0 + h * 0.45, SIDE_Z + 0.19); // shelf
    // the actual stock for this cabinet (matches the parts list in truck.js)
    stockCabinet(truck, cab.id, x, y0 + 0.005, y0 + h * 0.45 + 0.0075, h);
    const pivot = new THREE.Group();     // hinge along the top edge
    pivot.position.set(x, y1, SIDE_Z - 0.016);
    truck.add(pivot);
    const face = new THREE.MeshStandardMaterial({ map: labelTexture(cab.label), metalness: 0.3, roughness: 0.45 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.02, h - 0.02, 0.02),
      [dark, dark, dark, dark, dark, face]); // -z face shows the label
    door.position.set(0, -h / 2, 0);
    pivot.add(door);
    pivot.userData = { open: 0, target: 0 };
    doors[cab.id] = pivot;
  });

  return { group: truck, doors };
}

// ---------------------------------------------------------------- cabinet stock
// Simple models of the parts each cabinet holds, so an open cabinet reads at a glance.
// Coordinates: x = cabinet center, floor/shelf = the y each level's items sit on. Items sit
// between FRONT and BACK (inside the recess). Bin labels are little canvas pictures.

const FRONT = SIDE_Z + 0.04;  // front of the stock (a little back from the opening)
const BACK = SIDE_Z + 0.33;
const DEPTH = BACK - FRONT;
const MID_Z = (FRONT + BACK) / 2;

const M = {}; // shared materials (made once)
function mats() {
  if (M.steel) return M;
  M.steel = new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 0.8, roughness: 0.3 });
  M.darkSteel = new THREE.MeshStandardMaterial({ color: 0x6d7379, metalness: 0.7, roughness: 0.4 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  M.blueBin = new THREE.MeshStandardMaterial({ color: 0x1f5fa8, roughness: 0.55 });
  M.redBin = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.55 });
  M.cardboard = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 });
  M.clear = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false });
  M.fuse3 = new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.4 }); // 3A mini blade = violet
  M.fuse5 = new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.4 }); // 5A mini blade = tan
  M.board = new THREE.MeshStandardMaterial({ color: 0x1e6b3a, roughness: 0.5 });
  M.bag = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.4, roughness: 0.35, transparent: true, opacity: 0.8 });
  M.wireRed = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  M.wireBlk = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  M.yellow = new THREE.MeshStandardMaterial({ color: 0xf5b301, roughness: 0.5 });
  M.ada = new THREE.MeshStandardMaterial({ color: 0x1f4fa0, roughness: 0.5 });
  return M;
}

const labelCache = {};
function label(parent, text, w, h, x, y, z) {
  if (!labelCache[text]) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 92);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${text.length > 10 ? 30 : 40}px Arial, sans-serif`;
    g.fillText(text, 128, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    labelCache[text] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), labelCache[text]);
  m.position.set(x, y, z);
  m.rotation.y = Math.PI; // face the sidewalk (-z)
  parent.add(m);
  return m;
}

// An open-front parts bin (the stackable kind) with a label on its lip, sitting on `y`.
function bin(parent, mat, x, y, w, h, text) {
  const t = 0.008;
  const d = DEPTH * 0.9, zc = MID_Z;
  box(parent, mat, w, t, d, x, y + t / 2, zc);                       // floor
  box(parent, mat, t, h, d, x - w / 2 + t / 2, y + h / 2, zc);       // sides
  box(parent, mat, t, h, d, x + w / 2 - t / 2, y + h / 2, zc);
  box(parent, mat, w, h, t, x, y + h / 2, zc + d / 2 - t / 2);       // back
  box(parent, mat, w, h * 0.55, t, x, y + h * 0.275, zc - d / 2 + t / 2); // low front lip
  if (text) label(parent, text, w * 0.85, h * 0.3, x, y + h * 0.3, zc - d / 2 - 0.0015);
  return { x, y: y + t, z: zc, w, d };
}

// Little things piled in a bin: `make(i)` returns a mesh; we scatter them over the bin floor.
function fill(parent, b, count, make, seed = 1) {
  let r = seed;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < count; i++) {
    const m = make(i);
    m.position.set(b.x + (rnd() - 0.5) * (b.w - 0.04), b.y + 0.006 + rnd() * 0.012, b.z + (rnd() - 0.4) * (b.d - 0.06));
    m.rotation.set(rnd() * 0.6, rnd() * Math.PI, rnd() * 0.6);
    parent.add(m);
  }
}

function stockCabinet(truck, id, x, floor, shelf, h) {
  const m = mats();
  const upperH = h - (shelf - floor) - 0.03;   // room above the shelf
  const lowerH = shelf - floor - 0.03;         // room under the shelf
  const W = DOOR_W - 0.08;

  if (id === 'fasteners') {
    // top: shims + the two hinge screw sizes
    const a = bin(truck, m.blueBin, x - W / 3, shelf, W / 3 - 0.01, upperH * 0.55, 'SHIMS');
    for (let k = 0; k < 6; k++) box(truck, m.steel, a.w - 0.05, 0.002, 0.07, a.x, a.y + 0.004 + k * 0.004, a.z + 0.02);
    const screw = (len) => () => {
      const g = new THREE.Group();
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, len, 6), m.steel);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 10), m.steel);
      head.position.y = len / 2;
      g.add(shank, head);
      g.rotation.z = Math.PI / 2;
      return g;
    };
    fill(truck, bin(truck, m.blueBin, x, shelf, W / 3 - 0.01, upperH * 0.55, '#12 x 2-1/2"'), 14, screw(0.064), 3);
    fill(truck, bin(truck, m.blueBin, x + W / 3, shelf, W / 3 - 0.01, upperH * 0.55, '#12 x 3/4"'), 18, screw(0.02), 7);
    // bottom: more bins of general hardware
    const names = ['ANCHORS', 'TEK SCREWS', 'WASHERS', 'NUTS'];
    names.forEach((n, k) => {
      const b2 = bin(truck, m.redBin, x - W / 2 + W / 8 + k * W / 4, floor, W / 4 - 0.01, lowerH * 0.6, n);
      fill(truck, b2, 10, () => new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.01, 8), m.darkSteel), 11 + k);
    });
  }

  if (id === 'electrical') {
    // top: clear fuse organizer, violet 3A and tan 5A blade fuses
    const ox = x - W / 4, ow = W / 2 - 0.02, oh = upperH * 0.35;
    box(truck, m.black, ow, 0.01, DEPTH * 0.8, ox, shelf + 0.005, MID_Z);
    box(truck, m.clear, ow, oh, DEPTH * 0.8, ox, shelf + 0.01 + oh / 2, MID_Z);
    for (const [side, mat, txt] of [[-1, m.fuse3, '3A FUSES'], [1, m.fuse5, '5A FUSES']]) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const f = box(truck, mat, 0.011, 0.016, 0.004,
          ox + side * ow / 4 + (c - 1.5) * 0.022, shelf + 0.02, FRONT + 0.05 + r * 0.05);
        f.rotation.x = -0.2;
      }
      label(truck, txt, ow / 2 - 0.02, 0.03, ox + side * ow / 4, shelf + 0.01 + oh * 0.55, MID_Z - DEPTH * 0.4 - 0.0015);
    }
    // top right: wire spools
    for (const [k, mat] of [[0, m.wireRed], [1, m.wireBlk]]) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 20), mat);
      sp.rotation.z = Math.PI / 2;
      sp.position.set(x + W / 8 + k * 0.13, shelf + 0.05, MID_Z);
      truck.add(sp);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.008, 20), m.cardboard);
      for (const e of [-1, 1]) {
        const c2 = core.clone();
        c2.rotation.z = Math.PI / 2;
        c2.position.set(sp.position.x + e * 0.034, sp.position.y, MID_Z);
        truck.add(c2);
      }
    }
    // bottom: boxed access control board (window shows the green board), plus a spare in its bag
    const bx = x - W / 4;
    box(truck, m.cardboard, 0.3, lowerH * 0.55, DEPTH * 0.8, bx, floor + lowerH * 0.275, MID_Z);
    box(truck, m.board, 0.16, lowerH * 0.3, 0.002, bx + 0.03, floor + lowerH * 0.3, MID_Z - DEPTH * 0.4 - 0.002);
    label(truck, 'ACCESS BOARD', 0.24, 0.035, bx, floor + lowerH * 0.5, MID_Z - DEPTH * 0.4 - 0.003);
    const bag = box(truck, m.bag, 0.22, 0.012, DEPTH * 0.7, x + W / 4, floor + 0.008, MID_Z);
    bag.rotation.y = 0.15;
    box(truck, m.board, 0.15, 0.004, DEPTH * 0.5, x + W / 4, floor + 0.016, MID_Z).rotation.y = 0.15;
  }

  if (id === 'locks') {
    // top: loose strike bodies, faceplates out
    for (let k = 0; k < 3; k++) {
      const sx = x - W / 3 + k * W / 3;
      box(truck, m.darkSteel, 0.05, upperH * 0.55, 0.04, sx, shelf + upperH * 0.275, MID_Z);
      box(truck, m.steel, 0.07, upperH * 0.7, 0.004, sx, shelf + upperH * 0.35, MID_Z - 0.022);
      box(truck, m.black, 0.026, upperH * 0.22, 0.002, sx, shelf + upperH * 0.38, MID_Z - 0.025); // keeper
    }
    // bottom: boxed strikes
    for (let k = 0; k < 3; k++) {
      const sx = x - W / 3 + k * W / 3;
      box(truck, m.cardboard, W / 3 - 0.03, lowerH * 0.6, DEPTH * 0.75, sx, floor + lowerH * 0.3, MID_Z);
      label(truck, '24V STRIKE', W / 3 - 0.07, 0.035, sx, floor + lowerH * 0.38, MID_Z - DEPTH * 0.375 - 0.0015);
    }
  }

  if (id === 'exits') {
    // top: push plates standing on edge + a closer body
    for (let k = 0; k < 3; k++) {
      const px = x - W / 2 + 0.08 + k * 0.03;
      const plate = box(truck, m.steel, 0.004, 0.115, 0.115, px, shelf + 0.0575, MID_Z);
      const sign = box(truck, m.ada, 0.002, 0.05, 0.05, px - 0.003, shelf + 0.0575, MID_Z);
      plate.rotation.y = sign.rotation.y = -0.5;
    }
    const closer = box(truck, m.darkSteel, 0.27, 0.06, 0.07, x + W / 6, shelf + 0.03, MID_Z);
    box(truck, m.darkSteel, 0.26, 0.012, 0.025, x + W / 6, shelf + 0.066, MID_Z + 0.01); // arm
    label(truck, 'CLOSER', 0.12, 0.028, x + W / 6, shelf + 0.03, closer.position.z - 0.0365);
    // bottom: a touchpad panic device lying on its back, plus its box
    const py = floor + 0.03;
    box(truck, m.steel, W - 0.06, 0.035, 0.07, x, py, MID_Z + 0.02);           // rail
    box(truck, m.yellow, W * 0.55, 0.03, 0.06, x + 0.05, py + 0.02, MID_Z + 0.015); // touchpad
    box(truck, m.black, 0.06, 0.05, 0.08, x - W / 2 + 0.06, py + 0.008, MID_Z + 0.02); // mechanism case
    box(truck, m.cardboard, W - 0.04, lowerH * 0.35, 0.06, x, floor + lowerH * 0.5, BACK - 0.04);
    label(truck, 'EXIT DEVICE', 0.24, 0.035, x, floor + lowerH * 0.5, BACK - 0.071);
  }
}

// Swing cabinet doors toward their target (0 = shut, 1 = open). Call every frame.
export function animateTruck(truck, dt) {
  for (const pivot of Object.values(truck.doors)) {
    const u = pivot.userData;
    u.open += (u.target - u.open) * Math.min(1, dt * 7);
    pivot.rotation.x = u.open * 2.0; // swings up and over, out of the way of the shelves
  }
}
