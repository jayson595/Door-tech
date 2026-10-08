// vehicles2.js — realistic vehicles built with vehicleKit.js. Each faces +x, centred on z = 0,
// wheels on the ground at y = 0. Returns the vehicle's group.

import * as THREE from 'three';
import { KM, paint, mesh, boxM, rbox, profile, shell, sideZ, sidePanel, sideDecal, canvasTex, loft, curve, splitByMaterial, inPoly,
  contactShadow, wheel2, flare, wellLiner, headlight, grilleTex, plateTex, mirror, facePanel, decal, surfaceZ } from './src-vehicleKit.js';

// Cab door logo, as on the concept sheet.
export function doorLogoTex() {
  return canvasTex(640, 320, (g) => {
    g.fillStyle = '#1d2024';
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
  });
}
const textTex = (text, px = 60, color = '#1d2024') => canvasTex(256, 96, (g, w, h) => {
  g.fillStyle = color; g.font = `bold ${px}px Arial, sans-serif`; g.textBaseline = 'middle';
  const tw = g.measureText(text).width;
  if (tw > w - 12) g.font = `bold ${Math.floor(px * (w - 12) / tw)}px Arial, sans-serif`; // shrink to fit
  g.fillText(text, 6, h / 2 + 2);
});

// A compartment door on a body side: slightly raised panel, seam around it, chrome paddle handle.
// stripe: [y0, y1, material] — the body stripe carried across the door skin
export function compartmentDoor(parent, x0, x1, y0, y1, sz, facing, bodyMat, handle = 'paddle', stripe = null) {
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  boxM(parent, KM.trim, w, h, 0.006, cx, cy, sz + facing * 0.002, false);            // seam (dark gap)
  rbox(parent, bodyMat, w - 0.018, h - 0.018, 0.018, 0.01, cx, cy, sz + facing * 0.008); // the door skin
  if (stripe && stripe[0] > y0 + 0.01 && stripe[1] < y1 - 0.01) {
    boxM(parent, stripe[2], w - 0.03, stripe[1] - stripe[0], 0.004, cx, (stripe[0] + stripe[1]) / 2, sz + facing * 0.0185, false);
  }
  // paddle latch: a chrome dish with a black paddle, near the top centre (or side for tall doors)
  const hx = cx, hy = h > 0.8 ? cy + 0.12 : y1 - 0.1;
  rbox(parent, KM.chrome, 0.15, 0.07, 0.016, 0.02, hx, hy, sz + facing * 0.02);
  boxM(parent, KM.trim, 0.1, 0.03, 0.01, hx, hy - 0.005, sz + facing * 0.028, false);
}

// ---------------------------------------------------------------- DT-104 service truck
// One-ton chassis-cab pickup with a steel service body, ladder rack and amber light bar.
// opts.curbDoors=false skips the curb-side (-z) compartment doors (the game builds openable ones).
// level: the truck upgrade level (1-10, career.js). Each level adds something you can see.
export const TRUCK_STRIPE = [0.96, 1.02]; // the red body line, cab and body
export function serviceTruck(scene, { x = 0, z = 0, rotY = 0, curbDoors = true, curbBox = true, level = 1 } = {}) {
  const rackLevel = level;
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.rotation.y = rotY;
  scene.add(t);
  const white = paint(0xf3f3f1);
  const red = paint(0xc8202a);
  const W = 2.0, BELT = 1.47, TAPER = 0.14, WR = 0.41;
  const FX = 2.62, RX = -0.2; // wheel centres

  // ---- cab lower body: hood, fenders, doors (front arch cut in)
  const lower = profile([
    [3.6, 0.5, 0.04], [3.66, 1.0, 0.08], [3.61, 1.33, 0.12], [2.72, 1.47, 0.02], [0.96, 1.47, 0.03], [0.96, 0.5, 0.03],
    { arch: [FX, 0.5, 0.52] },
  ]);
  mesh(t, shell(lower, W, { bevel: 0.07, nose: [3.0, 0.07] }), white);
  wellLiner(t, FX, 0.5, 0.52, W);
  // hood power dome: a low raised panel down the middle of the hood
  const dome = profile([[3.52, 1.3, 0.05], [3.45, 1.37, 0.05], [2.85, 1.47, 0.05], [2.75, 1.4, 0]]);
  mesh(t, shell(dome, 0.9, { bevel: 0.04 }), white);

  // ---- greenhouse: glass all round, then roof and pillars laid over it in paint
  const gh = profile([[2.74, 1.44, 0], [2.1, 2.0, 0.05], [1.12, 2.04, 0.05], [0.99, 1.96, 0.03], [0.99, 1.44, 0]]);
  mesh(t, shell(gh, W - 0.02, { bevel: 0.03, belt: BELT, taper: TAPER }), KM.glass);
  const over = (pts, mat = white, w = W) => mesh(t, shell(profile(pts), w, { bevel: 0.03, belt: BELT, taper: TAPER }), mat);
  over([[2.22, 1.9, 0], [2.11, 2.012, 0.04], [1.12, 2.055, 0.06], [0.97, 1.97, 0.03], [0.97, 1.9, 0]]);   // roof
  // A- and B-pillars: painted panels laid on the sides of the glass (not across the windshield)
  for (const f of [-1, 1]) {
    sidePanel(t, [[2.7, 1.47], [2.8, 1.47], [2.14, 2.0], [2.06, 2.0]], white, W - 0.02, { belt: BELT, taper: TAPER, facing: f, out: 0.004 });
    sidePanel(t, [[0.99, 1.47], [1.26, 1.47], [1.26, 2.0], [0.99, 1.97]], white, W - 0.02, { belt: BELT, taper: TAPER, facing: f, out: 0.004 });
  }
  // rear window (on the back of the cab)
  boxM(t, KM.glass, 0.01, 0.34, W - 0.55, 0.955, 1.71, 0, false);

  for (const f of [-1, 1]) {
    const sz = f * W / 2;
    // door shut lines + handle
    sidePanel(t, [[2.5, 0.56], [2.52, 0.56], [2.52, 1.46], [2.5, 1.46]], KM.trim, W, { facing: f, out: 0.001 });
    sidePanel(t, [[1.24, 0.56], [1.26, 0.56], [1.26, 1.46], [1.24, 1.46]], KM.trim, W, { facing: f, out: 0.001 });
    sidePanel(t, [[1.26, 0.56], [2.5, 0.56], [2.5, 0.575], [1.26, 0.575]], KM.trim, W, { facing: f, out: 0.001 });
    rbox(t, KM.chrome, 0.2, 0.045, 0.03, 0.02, 1.48, 1.33, sz + f * 0.012);
    // red body line (concept: through the doors, carried on along the body)
    sidePanel(t, [[0.97, TRUCK_STRIPE[0]], [3.3, TRUCK_STRIPE[0]], [3.3, TRUCK_STRIPE[1]], [0.97, TRUCK_STRIPE[1]]], red, W, { facing: f, out: 0.002 });
    // logo + unit number
    sideDecal(t, doorLogoTex(), 0.86, 0.43, 1.88, 1.25, sz + f * 0.006, f);
    sideDecal(t, textTex('DT-104'), 0.36, 0.135, 2.95, 1.3, sz + f * 0.004, f);
    // tow mirrors
    mirror(t, 2.55, 1.56, sideZ(W, 1.56, BELT, TAPER), f, { tow: true });
    // black fender flare on the front arch
    flare(t, FX, 0.5, 0.52, sz, f, { thick: 0.07, depth: 0.07 });
    // running board under the doors
    rbox(t, KM.plastic, 1.35, 0.05, 0.2, 0.02, 1.78, 0.43, f * (W / 2 + 0.06));
    for (const bx of [1.25, 2.3]) boxM(t, KM.trim, 0.05, 0.08, 0.16, bx, 0.46, f * (W / 2 - 0.02), false);
  }

  // ---- front end
  const nose = 3.66;
  // chrome grille surround + bar grille
  const gw = 1.2, gy = 1.03, gh2 = 0.56;
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh2), new THREE.MeshStandardMaterial({ map: grilleTex('truck'), metalness: 0.5, roughness: 0.4 }));
  grille.position.set(nose + 0.012, gy, 0);
  grille.rotation.y = Math.PI / 2;
  t.add(grille);
  for (const [w, h, y, zz] of [[gw + 0.08, 0.05, gy + gh2 / 2 + 0.02, 0], [gw + 0.08, 0.05, gy - gh2 / 2 - 0.02, 0],
    [0.05, gh2 + 0.08, gy, gw / 2 + 0.02], [0.05, gh2 + 0.08, gy, -gw / 2 - 0.02]]) {
    rbox(t, KM.darkChrome, 0.05, h, w, 0.02, nose + 0.01, y, zz);
  }
  // bow-tie-ish emblem (generic gold badge)
  rbox(t, KM.amber, 0.02, 0.06, 0.16, 0.01, nose + 0.03, gy, 0);
  for (const s of [-1, 1]) headlight(t, nose + 0.025, 1.08, s * 0.79, 0.26, 0.4);
  // bumper: big chrome one-ton bumper with a black lower valance, fog lights, plate
  rbox(t, KM.steel, 0.24, 0.27, W + 0.08, 0.06, nose + 0.1, 0.64, 0);
  rbox(t, KM.plastic, 0.16, 0.12, W - 0.2, 0.03, nose + 0.06, 0.48, 0);
  for (const s of [-1, 1]) {
    const fog = mesh(t, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 18), KM.drl, nose + 0.225, 0.62, s * 0.72, false);
    fog.rotation.z = Math.PI / 2;
    boxM(t, KM.tail, 0.05, 0.06, 0.04, nose + 0.2, 0.58, s * 0.4, false); // red tow hooks
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTex(), roughness: 0.5 }));
  plate.position.set(nose + 0.225, 0.66, 0);
  plate.rotation.y = Math.PI / 2;
  t.add(plate);
  // roof: amber LED light bar + five cab clearance lights
  // light bar: a small 4-module bar on the base truck, the full-width bar from level 5
  const nMod = level >= 5 ? 8 : 4, barW = nMod * 0.19 - 0.02;
  rbox(t, KM.trim, 0.3, 0.06, barW, 0.02, 1.62, 2.1, 0);
  for (let i = 0; i < nMod; i++) rbox(t, KM.amberLit, 0.24, 0.08, 0.17, 0.02, 1.62, 2.17, -(nMod - 1) * 0.095 + i * 0.19);
  rbox(t, KM.lens, 0.27, 0.1, barW, 0.03, 1.62, 2.17, 0);
  for (let i = 0; i < 5; i++) rbox(t, KM.amberLit, 0.04, 0.03, 0.08, 0.01, 2.05, 2.04, -0.36 + i * 0.18);
  mesh(t, new THREE.CylinderGeometry(0.004, 0.006, 0.7, 6), KM.trim, 2.6, 1.8, 0.72, false).rotation.z = -0.15; // antenna

  // ---- chassis: frame rails, fuel tank, axles (seen under the body)
  for (const s of [-1, 1]) boxM(t, KM.trim, 6.4, 0.18, 0.08, 0.3, 0.5, s * 0.44, false);
  rbox(t, KM.trim, 0.7, 0.3, 0.45, 0.06, 0.45, 0.5, -0.66);
  for (const ax of [FX, RX]) {
    const a = mesh(t, new THREE.CylinderGeometry(0.06, 0.06, 1.7, 10), KM.trim, ax, WR, 0, false);
    a.rotation.x = Math.PI / 2;
  }
  mesh(t, new THREE.SphereGeometry(0.17, 14, 10), KM.trim, RX, WR, 0, false);

  // ---- service body
  const BX0 = -3.02, BX1 = 0.86, BTOP = 1.62, BBOT = 0.5, BW = 2.1, SIDE = 0.52;
  // a side compartment box, with the rear wheel arch cut in
  const sideBox = profile([[BX1, BBOT, 0.02], [BX1, BTOP, 0.03], [BX0, BTOP, 0.03], [BX0, BBOT, 0.02], { arch: [RX, BBOT, 0.53] }]);
  const sideGeo = shell(sideBox, SIDE, { bevel: 0.03 });
  for (const f of [-1, 1]) if (f > 0 || curbBox) mesh(t, sideGeo, white, 0, 0, f * (BW / 2 - SIDE / 2));
  t.userData.white = white;
  t.userData.red = red;
  wellLiner(t, RX, BBOT, 0.53, BW);
  // the open bed between the compartments: floor, front bulkhead, tailgate
  boxM(t, white, BX1 - BX0 - 0.05, 0.06, BW - 2 * SIDE + 0.02, (BX0 + BX1) / 2, 0.92, 0);
  boxM(t, white, 0.05, BTOP - 0.92, BW - 2 * SIDE + 0.02, BX1 - 0.03, (BTOP + 0.92) / 2, 0);
  rbox(t, white, 0.05, 0.5, BW - 2 * SIDE - 0.02, 0.015, BX0 + 0.02, 1.16, 0);
  boxM(t, KM.chrome, 0.012, 0.03, 0.2, BX0 - 0.008, 1.3, 0, false);       // tailgate handle
  boxM(t, KM.plastic, BX1 - BX0, 0.1, BW + 0.01, (BX0 + BX1) / 2, BBOT - 0.02, 0); // understructure
  // compartments: tall front vertical, horizontal over the wheel, two tall at the rear
  const doorsFor = (f) => {
    const sz = f * BW / 2;
    const st = [...TRUCK_STRIPE, red];
    compartmentDoor(t, 0.3, 0.82, 0.58, 1.58, sz, f, white, 'paddle', st);
    compartmentDoor(t, -0.72, 0.28, 1.06, 1.58, sz, f, white, 'paddle', st);
    compartmentDoor(t, -1.86, -0.74, 0.58, 1.58, sz, f, white, 'paddle', st);
    compartmentDoor(t, -2.98, -1.88, 0.58, 1.58, sz, f, white, 'paddle', st);
  };
  doorsFor(1);
  if (curbDoors) doorsFor(-1);
  for (const f of [-1, 1]) {
    const sz = f * BW / 2;
    // red body line (carried on from the cab; the doors carry their own piece), drip rail,
    // clearance lights, mud flap. The game builds the curb side of the body itself.
    if (f > 0 || curbBox) boxM(t, red, BX1 - BX0 - 0.06, TRUCK_STRIPE[1] - TRUCK_STRIPE[0], 0.006, (BX0 + BX1) / 2, (TRUCK_STRIPE[0] + TRUCK_STRIPE[1]) / 2, sz + f * 0.004, false);
    boxM(t, KM.alu, BX1 - BX0, 0.025, 0.03, (BX0 + BX1) / 2, BTOP + 0.012, sz - f * 0.01, false);
    rbox(t, KM.amberLit, 0.06, 0.04, 0.03, 0.01, BX1 - 0.05, BTOP - 0.06, sz + f * 0.012);
    rbox(t, KM.tail, 0.06, 0.04, 0.03, 0.01, BX0 + 0.05, BTOP - 0.06, sz + f * 0.012);
    rbox(t, KM.amberLit, 0.06, 0.04, 0.03, 0.01, (BX0 + BX1) / 2, BBOT + 0.08, sz + f * 0.012);
    rbox(t, KM.rubber, 0.02, 0.36, 0.28, 0.01, RX - 0.62, 0.32, f * (BW / 2 - 0.16));
    rbox(t, KM.rubber, 0.02, 0.3, 0.26, 0.01, FX - 0.58, 0.3, f * (W / 2 - 0.15));
    flare(t, RX, BBOT, 0.53, sz, f, { thick: 0.05, depth: 0.05, mat: KM.alu });
  }
  // rear: tall tail light stacks on the back of each compartment, step bumper, hitch, plate
  for (const s of [-1, 1]) {
    const lz = s * (BW / 2 - SIDE / 2);
    rbox(t, KM.trim, 0.03, 0.62, 0.17, 0.02, BX0 - 0.015, 1.12, lz);
    rbox(t, KM.tail, 0.03, 0.28, 0.14, 0.02, BX0 - 0.025, 1.28, lz);
    rbox(t, KM.amber, 0.03, 0.12, 0.14, 0.02, BX0 - 0.025, 1.06, lz);
    rbox(t, KM.drl, 0.03, 0.1, 0.14, 0.02, BX0 - 0.025, 0.93, lz);
    rbox(t, KM.trim, 0.03, 0.1, 0.12, 0.02, BX0 - 0.015, BTOP - 0.1, lz);       // rear work light
    rbox(t, KM.drl, 0.03, 0.07, 0.09, 0.01, BX0 - 0.025, BTOP - 0.1, lz);
  }
  const plateTexture = canvasTex(256, 64, (g, w, h) => {
    // diamond plate tread
    g.fillStyle = '#9ea4aa'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9ced3';
    for (let y = 4; y < h; y += 12) for (let xx = (y / 12) % 2 ? 0 : 8; xx < w; xx += 16) g.fillRect(xx, y, 8, 3);
  });
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, BW - 0.1),
    [KM.alu, KM.alu, new THREE.MeshStandardMaterial({ map: plateTexture, metalness: 0.8, roughness: 0.35 }), KM.alu, KM.alu, KM.alu]);
  step.position.set(BX0 - 0.13, 0.6, 0);
  step.castShadow = true;
  t.add(step);
  rbox(t, KM.trim, 0.26, 0.14, BW - 0.1, 0.02, BX0 - 0.12, 0.5, 0);
  boxM(t, KM.trim, 0.3, 0.08, 0.08, BX0 - 0.3, 0.45, 0);
  boxM(t, KM.chrome, 0.04, 0.05, 0.05, BX0 - 0.45, 0.45, 0, false);
  const rplate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTex(), roughness: 0.5 }));
  rplate.position.set(BX0 - 0.002, 0.78, 0.55);
  rplate.rotation.y = -Math.PI / 2;
  t.add(rplate);

  // ---- ladder rack (aluminium) with an orange extension ladder, LED work lights on the posts
  const tube = (x0, y0, z0, x1, y1, z1, r = 0.025) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const m = mesh(t, new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), KM.steel, 0, 0, 0);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const RY = 2.3 + (rackLevel >= 4 ? 0.15 : 0);
  const rz = BW / 2 - 0.05;
  for (const px of [BX1 - 0.12, -1.0, BX0 + 0.12]) {
    for (const s of [-1, 1]) { tube(px, BTOP, s * rz, px, RY, s * rz, 0.03); }
    tube(px, RY, -rz, px, RY, rz, 0.03);
  }
  for (const s of [-1, 1]) {
    tube(BX0 + 0.05, RY + 0.02, s * rz, 1.5, RY + 0.02, s * rz, 0.025);  // side rails, overhanging the cab
    tube(BX1 - 0.12, BTOP + 0.3, s * rz, BX1 - 0.12 - 0.35, RY, s * rz, 0.02); // diagonal braces
  }
  tube(1.5, RY + 0.02, -rz, 1.5, RY + 0.02, rz, 0.025);
  for (const s of [-1, 1]) tube(1.5, RY, s * rz, 1.28, 2.06, s * (rz - 0.1), 0.02); // front legs onto the roof
  // ladder: two orange rails per section, aluminium rungs; two sections side by side
  for (const lz of [-0.42, 0.18]) {
    for (const dz of [0, 0.38]) rbox(t, KM.orange, 4.3, 0.08, 0.035, 0.01, -0.9, RY + 0.08, lz + dz);
    for (let i = 0; i < 14; i++) tube(-3.0 + i * 0.31, RY + 0.08, lz, -3.0 + i * 0.31, RY + 0.08, lz + 0.38, 0.014);
  }
  for (const s of [-1, 1]) for (const px of [BX1 - 0.12, BX0 + 0.12]) {
    rbox(t, KM.trim, 0.14, 0.11, 0.07, 0.02, px, 1.98, s * (rz + 0.06));
    boxM(t, KM.drl, 0.1, 0.07, 0.01, px, 1.98, s * (rz + 0.1), false);
  }

  // ---- upgrades you can see
  const diamond = new THREE.MeshStandardMaterial({ map: plateTexture, metalness: 0.8, roughness: 0.35 });
  if (level >= 2) { // crossover tool box across the front of the bed
    rbox(t, diamond, 0.5, 0.36, BW - 2 * SIDE + 0.9, 0.02, BX1 - 0.32, BTOP + 0.18, 0);
  }
  if (level >= 3) { // extra cabinet: a tall bin rack at the back of the bed
    rbox(t, white, 0.45, 0.62, BW - 2 * SIDE - 0.04, 0.02, BX0 + 0.3, 0.95 + 0.31, 0);
    for (let i = 0; i < 3; i++) boxM(t, KM.trim, 0.006, 0.006, BW - 2 * SIDE - 0.1, BX0 + 0.075, 1.02 + i * 0.2, 0, false);
  }
  if (level >= 9) { // stacked red and yellow parts bins on that rack
    for (let i = 0; i < 6; i++) rbox(t, i % 2 ? KM.amber : KM.tail, 0.18, 0.12, 0.28, 0.02, BX0 + 0.66, 1.0 + Math.floor(i / 2) * 0.2, -0.32 + (i % 2) * 0.32 + (i > 3 ? 0.32 : 0));
  }
  if (level >= 6) { // side scene lights: LED strips along the top of the body
    for (const f of [-1, 1]) for (const lx of [-2.5, -1.3, -0.1]) {
      rbox(t, KM.trim, 0.36, 0.06, 0.04, 0.02, lx, BTOP - 0.05, f * (BW / 2 + 0.02));
      boxM(t, KM.drl, 0.32, 0.03, 0.01, lx, BTOP - 0.05, f * (BW / 2 + 0.042), false);
    }
  }
  if (level >= 7) { // roof beacon on the front of the rack
    mesh(t, new THREE.CylinderGeometry(0.09, 0.1, 0.05, 18), KM.trim, 1.45, RY + 0.06, 0);
    mesh(t, new THREE.SphereGeometry(0.085, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), KM.amberLit, 1.45, RY + 0.085, 0);
  }
  if (level >= 8) { // big rear flood lights on the back rack posts
    for (const sl of [-1, 1]) {
      rbox(t, KM.trim, 0.08, 0.16, 0.2, 0.03, BX0 + 0.04, RY - 0.12, sl * (rz - 0.1));
      boxM(t, KM.drl, 0.012, 0.12, 0.16, BX0 - 0.0, RY - 0.12, sl * (rz - 0.1), false);
    }
  }
  if (level >= 10) { // heavy duty: dual rear wheels and a HEAVY DUTY badge
    for (const f of [-1, 1]) wheel2(t, RX, WR, f * (BW / 2 - 0.2 - 0.32), { r: WR, w: 0.3, style: 'steel', outward: f });
    for (const f of [-1, 1]) sideDecal(t, textTex('HEAVY DUTY', 44, '#c8202a'), 0.42, 0.12, 2.92, 1.16, f * (W / 2 + 0.004), f);
  }

  // ---- wheels: single rear wheels, gray steel 8-lug, chunky all-terrain tires
  for (const f of [-1, 1]) {
    wheel2(t, FX, WR, f * (W / 2 - 0.17), { r: WR, w: 0.29, style: 'steel', outward: f });
    wheel2(t, RX, WR, f * (BW / 2 - 0.2), { r: WR, w: 0.31, style: 'dually', outward: f });
  }
  contactShadow(t, 6.9, 2.2);
  t.userData.size = { front: nose + 0.22, back: BX0 - 0.5, width: BW };
  return t;
}

// ---------------------------------------------------------------- passenger cars
// type: 'sedan' | 'suv' | 'hatch'. Generic modern shapes (no real brand). Bodies are lofted
// (curved sides, rounded corners); the windows are cut into the curved greenhouse.
const CARS = {
  sedan: {
    L: [-2.36, 2.38], W: 1.84, WR: 0.34, FX: 1.42, RX: -1.42, arch: 0.41, low: 0.27,
    top: [[-2.36, 0.62], [-2.31, 0.93], [-2.18, 1.0], [-1.6, 1.0], [1.0, 0.95], [1.9, 0.87], [2.3, 0.8], [2.38, 0.66]],
    bottom: [[-2.36, 0.4], [-2.18, 0.27], [2.15, 0.27], [2.38, 0.42]],
    gh: { x: [-1.7, 1.06], belt: [[-1.7, 0.995], [1.06, 0.945]], roof: [[-1.7, 0.99], [-1.3, 1.24], [-0.85, 1.41], [-0.3, 1.45], [0.2, 1.41], [1.06, 0.95]], rear: 2 },
    side: [[1.0, 0.99], [0.2, 1.37], [-0.78, 1.405], [-1.18, 1.0]], b: -0.2, doorR: -1.2, chrome: true,
    headY: 0.72, tailY: 0.88, plateR: 0.6, front: 2.38, tail: -2.36,
  },
  suv: {
    L: [-2.36, 2.36], W: 1.92, WR: 0.37, FX: 1.45, RX: -1.42, arch: 0.45, low: 0.36,
    top: [[-2.36, 0.75], [-2.34, 1.1], [-2.2, 1.13], [1.0, 1.1], [1.9, 1.04], [2.28, 0.98], [2.36, 0.8]],
    bottom: [[-2.36, 0.5], [-2.2, 0.36], [2.15, 0.36], [2.36, 0.52]],
    gh: { x: [-2.3, 1.1], belt: [[-2.3, 1.13], [1.1, 1.095]], roof: [[-2.3, 1.13], [-2.22, 1.55], [-2.05, 1.7], [0.2, 1.72], [0.42, 1.65], [1.1, 1.1]] },
    side: [[1.04, 1.14], [0.36, 1.64], [-2.0, 1.66], [-2.18, 1.4], [-2.2, 1.14]], b: -0.25, b2: -1.32, doorR: -1.36, blackMirrors: true,
    headY: 0.94, tailY: 1.25, plateR: 0.78, front: 2.36, tail: -2.36, rails: true, clad: true,
  },
  hatch: {
    L: [-2.0, 2.1], W: 1.78, WR: 0.32, FX: 1.3, RX: -1.25, arch: 0.39, low: 0.27,
    top: [[-2.0, 0.65], [-1.98, 0.97], [-1.9, 1.0], [1.0, 0.95], [1.75, 0.86], [2.04, 0.78], [2.1, 0.62]],
    bottom: [[-2.0, 0.4], [-1.85, 0.27], [1.9, 0.27], [2.1, 0.42]],
    gh: { x: [-1.96, 1.05], belt: [[-1.96, 1.0], [1.05, 0.95]], roof: [[-1.92, 1.0], [-1.78, 1.3], [-1.5, 1.47], [-1.1, 1.52], [0.1, 1.52], [0.3, 1.45], [1.05, 0.95]], rear: 2 },
    side: [[1.0, 0.99], [0.25, 1.44], [-1.05, 1.46], [-1.38, 1.3], [-1.6, 1.0]], b: -0.25, b2: -1.18, doorR: -1.2,
    headY: 0.71, tailY: 1.08, plateR: 0.62, front: 2.1, tail: -2.0,
  },
};

// The window outline of a side polygon, as thin strips just outside it (chrome trim).
function outlineStrips(poly, w) {
  let cx = 0, cy = 0; for (const [x, y] of poly) { cx += x; cy += y; } cx /= poly.length; cy /= poly.length;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    let nx = (y1 - y0) / L, ny = -(x1 - x0) / L;
    if (nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    out.push([[x0, y0], [x1, y1], [x1 + nx * w, y1 + ny * w], [x0 + nx * w, y0 + ny * w]]);
  }
  return out;
}

// A passenger car. Built the same way as the service truck: an extruded side profile with
// rounded edges for the body, a narrower greenhouse that leans in, and the lights, grille,
// windows and trim laid flush onto those surfaces.
// Each car type is built once; later cars of that type are copies sharing its geometry, with
// their own paint and plate (building one takes a moment, so a street full of them stays quick).
const CAR_TEMPLATES = {};
export function car(scene, { x = 0, z = 0, rotY = 0, color = 0x8a1f24, type = 'sedan', plate = 'CAR 512', spec = null, mat = null } = {}) {
  const body = mat || paint(color, { metallic: true });
  const key = spec ? null : type;
  if (key && !CAR_TEMPLATES[key]) CAR_TEMPLATES[key] = buildCar(new THREE.Group(), CARS[type]);
  const T = key ? CAR_TEMPLATES[key] : null;
  const c = T ? T.clone(true) : new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = rotY;
  scene.add(c);
  if (!T) { buildCar(c, spec, body, plate); return c; }
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex(plate), roughness: 0.5 });
  const swap = (m) => (m === T.$body ? body : m === T.$plate ? plateMat : m);
  c.traverse((m) => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material); });
  return c;
}
function buildCar(c, P, body = paint(0x888888, { metallic: true }), plate = 'CAR 512') {
  c.$body = body; // (not in userData: clone() would copy that)
  const { W, WR, FX, RX } = P;
  const hw = W / 2;
  const AR = P.arch, AY = WR - 0.02;
  const front = P.L[1], tail = P.L[0];

  // ---- lower body: up the nose, back over the hood / belt / trunk, down the tail, along the sills
  const pts = [[P.bottom[P.bottom.length - 1][0], P.bottom[P.bottom.length - 1][1], 0.05]];
  for (const [px, py, pr] of [...P.top].reverse()) pts.push([px, py, pr ?? 0.09]);
  pts.push([P.bottom[0][0], P.bottom[0][1], 0.05]);
  const arches = [[RX, AY, AR], [FX, AY, AR]];
  const mids = P.bottom.slice(1, -1).map(([px, py]) => [px, py, 0.04]);
  const along = [...mids.map((m) => ({ x: m[0], p: m })), ...arches.map((a) => ({ x: a[0], p: { arch: a } }))].sort((a, b) => a.x - b.x);
  for (const it of along) pts.push(it.p);
  const LOW_BELT = P.low + 0.3, LOW_TAPER = 0.07;
  const lowerGeo = shell(profile(pts), W, { bevel: P.bevel ?? 0.11, belt: LOW_BELT, taper: LOW_TAPER,
    nose: [FX - 0.1, P.noseIn ?? 0.17], tail: [RX + 0.25, P.tailIn ?? 0.12], segs: 5 });
  const lower = mesh(c, lowerGeo, body);
  for (const [ax, ay, ar] of arches) wellLiner(c, ax, ay, ar - 0.005, W - 0.08);

  // ---- greenhouse: a narrower shell that leans in; painted, with the glass laid on it
  const G = P.gh;
  const roof = G.roof;
  const beltF = G.belt[1], beltR = G.belt[0];
  const BELT = Math.min(beltF[1], beltR[1]), TAPER = P.ghTaper ?? 0.3;
  const ghW = W - 2 * (P.ghInset ?? 0.06);
  const ghPts = roof.map(([px, py], i) => [px, py, i === 0 || i === roof.length - 1 ? 0.02 : (P.roofR ?? 0.08)]);
  ghPts.push([beltF[0] + 0.04, beltF[1] - 0.08, 0], [beltR[0] - 0.02, beltR[1] - 0.08, 0]);
  mesh(c, shell(profile(ghPts), ghW, { bevel: 0.05, belt: BELT, taper: TAPER }), body);
  const sz = (y) => sideZ(ghW, y, BELT, TAPER);
  const gl = { belt: BELT, taper: TAPER, out: 0.004 };
  // windshield and rear glass: flat panels on the greenhouse's front and back faces
  const panelOn = (a, b, rear, inset = 0.1) => {
    const t0 = 0.07, t1 = 0.9;
    const A = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], B = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
    facePanel(c, KM.glass, A, B, sz(A[1]) - inset, sz(B[1]) - inset, { out: 0.005, rear });
  };
  const nW = G.wind || 1, nR = G.rear ?? 1;
  for (let i = 0; i < nW; i++) panelOn(roof[roof.length - 1 - i], roof[roof.length - 2 - i], false);
  for (let i = 0; i < nR; i++) panelOn(roof[i], roof[i + 1], true, 0.12);
  for (const f of [-1, 1]) {
    sidePanel(c, P.side, KM.glass, ghW, { ...gl, facing: f });
    const ys = P.side.map((p) => p[1]), y0 = Math.min(...ys) - 0.01, y1 = Math.max(...ys) + 0.01;
    for (const bx of [P.b, P.b2].filter((v) => v !== undefined)) {
      sidePanel(c, [[bx - 0.045, y0], [bx + 0.045, y0], [bx + 0.045, y1], [bx - 0.045, y1]], KM.trim, ghW, { ...gl, facing: f, out: 0.007 });
    }
    if (P.chrome) for (const strip of outlineStrips(P.side, 0.022)) sidePanel(c, strip, KM.chrome, ghW, { ...gl, facing: f, out: 0.006 });
  }

  // ---- front: headlamps sweeping round the corners, grille, intake, fog lamps, plate
  const hY = P.headY, tY = P.tailY;
  for (const s of [-1, 1]) {
    const zi = s * hw * 0.43, zo = s * (hw - 0.07);
    decal(c, lowerGeo, [[zi, hY - 0.05], [zo, hY + 0.0], [zo, hY + 0.07], [zi, hY + 0.055]], KM.headlamp, { view: 'front', out: 0.005 });
    decal(c, lowerGeo, [[zi, hY - 0.06], [zo, hY - 0.01], [zo, hY - 0.0], [zi, hY - 0.05]], KM.trim, { view: 'front', out: 0.006 });
    // fog lamp in a black pocket
    const fz = s * hw * 0.72, fy = P.low + 0.15, circle = (r) => Array.from({ length: 16 }, (_, k) => [fz + Math.cos(k / 16 * Math.PI * 2) * r * 1.3, fy + Math.sin(k / 16 * Math.PI * 2) * r]);
    decal(c, lowerGeo, circle(0.06), KM.trim, { view: 'front', out: 0.005, res: 0.02 });
    decal(c, lowerGeo, circle(0.032), KM.headlamp, { view: 'front', out: 0.007, res: 0.02 });
    // tail lamps wrapping round the rear corners
    const ti = s * hw * 0.5, to = s * (hw + 0.2);
    decal(c, lowerGeo, [[ti, tY - 0.055], [to, tY - 0.05], [to, tY + 0.065], [ti, tY + 0.06]], KM.tail, { view: 'back', out: 0.005 });
  }
  const gMat = new THREE.MeshStandardMaterial({ map: grilleTex(P.grille || 'mesh'), roughness: 0.5, metalness: 0.3 });
  const gw = hw * (P.grilleW ?? 0.38);
  decal(c, lowerGeo, [[-gw, hY - 0.085], [gw, hY - 0.085], [gw, hY + 0.04], [-gw, hY + 0.04]], gMat, { view: 'front', out: 0.005 });
  decal(c, lowerGeo, [[-gw - 0.02, hY + 0.04], [gw + 0.02, hY + 0.04], [gw + 0.02, hY + 0.058], [-gw - 0.02, hY + 0.058]], KM.chrome, { view: 'front', out: 0.006 });
  const iw = hw * 0.58;
  decal(c, lowerGeo, [[-iw, P.low + 0.07], [iw, P.low + 0.07], [iw * 0.95, P.low + 0.21], [-iw * 0.95, P.low + 0.21]], gMat, { view: 'front', out: 0.005 });
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex(plate), roughness: 0.5 });
  c.$plate = plateMat;
  decal(c, lowerGeo, [[-0.15, P.low + 0.25], [0.15, P.low + 0.25], [0.15, P.low + 0.4], [-0.15, P.low + 0.4]], plateMat, { view: 'front', out: 0.008 });
  decal(c, lowerGeo, [[-0.15, P.plateR - 0.075], [0.15, P.plateR - 0.075], [0.15, P.plateR + 0.075], [-0.15, P.plateR + 0.075]], plateMat, { view: 'back', out: 0.008 });
  // black lower bumper lip at the back
  decal(c, lowerGeo, [[-hw - 0.2, P.low - 0.05], [hw + 0.2, P.low - 0.05], [hw + 0.2, P.low + 0.1], [-hw - 0.2, P.low + 0.1]], KM.plastic, { view: 'back', out: 0.004 });
  if (P.clad) decal(c, lowerGeo, [[-hw - 0.2, P.low - 0.05], [hw + 0.2, P.low - 0.05], [hw + 0.2, P.low + 0.06], [-hw - 0.2, P.low + 0.06]], KM.plastic, { view: 'front', out: 0.004 });

  // ---- sides: door shut lines, handles, mirrors, sill or cladding
  const beltY = Math.min(beltF[1], beltR[1]);
  const doorF = beltF[0] - 0.02, doorR = P.doorR ?? (P.b - 1.0);
  for (const f of [-1, 1]) {
    const line = (pts2) => decal(c, lowerGeo, pts2, KM.trim, { view: 'side', facing: f, out: 0.003, res: 0.03 });
    for (const lx of [doorF, P.b - 0.03, doorR].filter((v) => v !== null)) line([[lx - 0.006, P.low + 0.1], [lx + 0.006, P.low + 0.1], [lx + 0.006, beltY - 0.01], [lx - 0.006, beltY - 0.01]]);
    for (const hx of P.handles || [P.b + 0.22, doorR + 0.22]) {
      const hz = surfaceZ(lowerGeo, hx, beltY - 0.1, f);
      if (hz !== null) rbox(c, KM.chrome, 0.16, 0.032, 0.03, 0.014, hx, beltY - 0.1, hz + f * 0.004);
    }
    const mx = beltF[0] - 0.14, mz = surfaceZ(lowerGeo, mx, beltY - 0.03, f);
    if (mz !== null) mirror(c, mx, beltY + 0.07, mz - f * 0.13, f, { mat: P.blackMirrors ? KM.trim : body });
    const skirt = P.clad ? 0.19 : 0.07;
    decal(c, lowerGeo, [[tail - 0.2, P.low + 0.035], [front + 0.2, P.low + 0.035], [front + 0.2, P.low + skirt], [tail - 0.2, P.low + skirt]],
      P.clad ? KM.plastic : KM.trim, { view: 'side', facing: f, out: 0.004, res: 0.05 });
    if (P.clad) for (const [ax, ay, ar] of arches) flare(c, ax, ay, ar, f * (hw - 0.005), f, { thick: 0.065, depth: 0.04 });
  }
  if (P.rails) for (const s of [-1, 1]) rbox(c, KM.alu, 2.0, 0.035, 0.045, 0.015, -0.95, roof[2][1] + 0.04, s * (sz(roof[2][1]) - 0.12));
  for (const f of [-1, 1]) {
    wheel2(c, FX, WR, f * (hw - 0.14), { r: WR, w: 0.23, style: P.wheelStyle || 'alloy', outward: f });
    wheel2(c, RX, WR, f * (hw - 0.14), { r: WR, w: 0.23, style: P.wheelStyle || 'alloy', outward: f });
  }
  contactShadow(c, front - tail, W);
  return c;
}
export const sedan2 = (scene, o = {}) => car(scene, { ...o, type: 'sedan' });
export const suv2 = (scene, o = {}) => car(scene, { color: 0xb9bcc0, ...o, type: 'suv' });
export const hatch2 = (scene, o = {}) => car(scene, { color: 0xb3262d, ...o, type: 'hatch' });

// ---------------------------------------------------------------- vans and trucks
// Commercial bodies are built like the service truck: one extruded side profile with rounded
// edges (a slight lean above the belt, a narrower nose), then glass, lights and trim laid on.
function bodyShell(t, mat, pts, W, { belt = 1.3, taper = 0.06, nose = null, bevel = 0.08, arches = [] } = {}) {
  const geo = shell(profile(pts), W, { bevel, belt, taper, nose, segs: 5 });
  mesh(t, geo, mat);
  for (const [ax, ay, ar] of arches) wellLiner(t, ax, ay, ar - 0.005, W - 0.04);
  return geo;
}
const vGroup = (scene, x, z, rotY) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g); return g; };
// Windshield on a sloped front face between side-view points a (bottom) and b (top).
function windshield(t, a, b, W, belt, taper, inset = 0.1) {
  const A = [a[0] + (b[0] - a[0]) * 0.05, a[1] + (b[1] - a[1]) * 0.05], B = [a[0] + (b[0] - a[0]) * 0.93, a[1] + (b[1] - a[1]) * 0.93];
  return facePanel(t, KM.glass, A, B, sideZ(W, A[1], belt, taper) - inset, sideZ(W, B[1], belt, taper) - inset, { out: 0.006 });
}
// A rectangle (or any polygon) on the front, back or side of a body geometry.
const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
const seam = (t, geo, x, y0, y1, f) => decal(t, geo, rect(x - 0.006, y0, x + 0.006, y1), KM.trim, { view: 'side', facing: f, out: 0.003, res: 0.04 });

// High-roof delivery van (a generic Sprinter-type).
export function deliveryVan2(scene, { x = 0, z = 0, rotY = 0, color = 0xf3f3f1, name = 'FRESH FOODS DELIVERY' } = {}) {
  const v = vGroup(scene, x, z, rotY);
  const body = paint(color);
  const W = 2.0, BELT = 1.3, TAPER = 0.06, WR = 0.37, FX = 1.95, RX = -1.75, AR = 0.47, AY = 0.42;
  const geo = bodyShell(v, body, [
    [3.0, 0.42, 0.05], [3.04, 0.92, 0.08], [2.9, 1.1, 0.14], [2.28, 1.3, 0.1], [1.4, 2.4, 0.22], [1.05, 2.6, 0.3],
    [-2.85, 2.63, 0.14], [-2.95, 2.45, 0.06], [-2.95, 0.45, 0.05], { arch: [RX, AY, AR] }, { arch: [FX, AY, AR] },
  ], W, { belt: BELT, taper: TAPER, nose: [2.3, 0.14], arches: [[RX, AY, AR], [FX, AY, AR]] });
  windshield(v, [2.28, 1.3], [1.4, 2.4], W, BELT, TAPER);
  const green = paint(0x2c8a3e);
  const logo = canvasTex(1024, 256, (g) => {
    g.fillStyle = '#2c8a3e'; g.beginPath(); g.ellipse(120, 128, 90, 90, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(120, 140, 40, 55, -0.5, 0, Math.PI * 2); g.fill(); // leaf
    g.fillStyle = '#2c8a3e'; g.font = 'bold 92px Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText(name.split(' ').slice(0, 2).join(' '), 240, 100);
    g.font = '600 60px Arial, sans-serif'; g.fillText(name.split(' ').slice(2).join(' ') || 'MARKET', 240, 186);
  });
  for (const f of [-1, 1]) {
    const gl = { belt: BELT, taper: TAPER, facing: f, out: 0.004 };
    sidePanel(v, [[2.12, 1.36], [1.46, 2.2], [0.8, 2.2], [0.8, 1.36]], KM.glass, W, gl);           // cab door window
    for (const [sx, y1] of [[1.45, 1.3], [0.72, 2.3], [0.6, 2.3], [-0.78, 2.3], [-2.9, 2.3]]) seam(v, geo, sx, 0.5, y1, f);
    for (const hx of [0.88, 0.42]) rbox(v, KM.trim, 0.16, 0.035, 0.03, 0.012, hx, 1.32, f * (W / 2 + 0.01));
    rbox(v, KM.trim, 1.3, 0.03, 0.03, 0.01, -0.1, 2.36, f * (W / 2 + 0.005));                       // sliding door track
    decal(v, geo, [[0.74, 1.12], [-3.1, 1.24], [-3.1, 1.34], [0.74, 1.22]], green, { view: 'side', facing: f, out: 0.004, res: 0.06 });
    decal(v, geo, rect(-3.1, 0.5, 2.95, 0.7), KM.plastic, { view: 'side', facing: f, out: 0.004, res: 0.06 }); // dark lower band
    sideDecal(v, logo, 2.2, 0.55, -1.2, 1.78, f * (sideZ(W, 1.78, BELT, TAPER) + 0.004), f);
    mirror(v, 2.08, 1.48, f * (W / 2 - 0.08), f, { tow: true });
    flare(v, FX, AY, AR, f * W / 2, f, { thick: 0.05, depth: 0.04 });
    flare(v, RX, AY, AR, f * W / 2, f, { thick: 0.05, depth: 0.04 });
    wheel2(v, FX, WR, f * (W / 2 - 0.17), { r: WR, w: 0.25, style: 'steel', outward: f });
    wheel2(v, RX, WR, f * (W / 2 - 0.17), { r: WR, w: 0.27, style: 'steel', outward: f });
  }
  // front: swept headlamps, three-bar grille, black bumper
  for (const s of [-1, 1]) {
    decal(v, geo, [[s * 0.47, 0.86], [s * 0.95, 0.92], [s * 0.95, 1.06], [s * 0.47, 1.0]], KM.headlamp, { view: 'front', out: 0.006 });
    decal(v, geo, [[s * 0.84, 0.9], [s * 0.95, 0.92], [s * 0.95, 0.97], [s * 0.84, 0.95]], KM.amber, { view: 'front', out: 0.008 });
  }
  decal(v, geo, rect(-0.44, 0.68, 0.44, 0.98), new THREE.MeshStandardMaterial({ map: grilleTex('bars'), metalness: 0.5, roughness: 0.4 }), { view: 'front', out: 0.006 });
  decal(v, geo, [[-0.46, 0.66], [0.46, 0.66], [0.46, 1.0], [-0.46, 1.0], [-0.46, 0.97], [0.43, 0.97], [0.43, 0.69], [-0.46, 0.69]], KM.chrome, { view: 'front', out: 0.007, res: 0.02 });
  mesh(v, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), KM.chrome, 3.07, 0.84, 0, false).rotation.z = Math.PI / 2;
  rbox(v, KM.plastic, 0.2, 0.26, W - 0.04, 0.06, 3.0, 0.55, 0);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTex('FRESH 7'), roughness: 0.5 }));
  plate.position.set(3.15, 0.56, 0); plate.rotation.y = Math.PI / 2; v.add(plate);
  // rear: barn doors with windows, tall tail lights, step bumper
  boxM(v, KM.trim, 0.004, 1.95, 0.012, -2.952, 1.42, 0, false);
  for (const s of [-1, 1]) {
    boxM(v, KM.glass, 0.006, 0.55, 0.62, -2.955, 1.95, s * 0.45, false);
    rbox(v, KM.tail, 0.05, 0.62, 0.12, 0.03, -2.93, 1.02, s * 0.9);
    rbox(v, KM.amber, 0.05, 0.12, 0.12, 0.03, -2.93, 0.64, s * 0.9);
  }
  rbox(v, KM.plastic, 0.2, 0.14, 1.95, 0.03, -2.99, 0.5, 0);
  const rp = plate.clone(); rp.position.set(-2.96, 0.78, 0); rp.rotation.y = -Math.PI / 2; v.add(rp);
  contactShadow(v, 6.2, W);
  return v;
}

// A cutaway van cab (the front of an ambulance): long hood, upright windshield.
function cutawayCab(t, body, { W = 2.0, FX = 2.05, rear = 0.5, roof = 2.24 } = {}) {
  const BELT = 1.38, TAPER = 0.07, AY = 0.45, AR = 0.48;
  const geo = bodyShell(t, body, [
    [3.0, 0.45, 0.05], [3.06, 1.0, 0.07], [2.97, 1.22, 0.14], [2.15, 1.38, 0.1], [1.56, 2.14, 0.16], [1.3, roof, 0.12],
    [rear, roof, 0], [rear, 0.45, 0], { arch: [FX, AY, AR] },
  ], W, { belt: BELT, taper: TAPER, nose: [2.4, 0.12], arches: [[FX, AY, AR]] });
  windshield(t, [2.15, 1.38], [1.56, 2.14], W, BELT, TAPER);
  for (const f of [-1, 1]) {
    sidePanel(t, [[2.03, 1.43], [1.64, 2.06], [1.06, 2.06], [1.06, 1.43]], KM.glass, W, { belt: BELT, taper: TAPER, facing: f, out: 0.004 });
    seam(t, geo, 0.98, 0.55, 2.12, f);
    seam(t, geo, 2.12, 0.95, 1.38, f);
    rbox(t, KM.chrome, 0.14, 0.035, 0.03, 0.012, 1.14, 1.3, f * (W / 2 + 0.008));
    mirror(t, 2.02, 1.52, f * (W / 2 - 0.08), f, { tow: true });
    flare(t, FX, AY, AR, f * W / 2, f, { thick: 0.05, depth: 0.04 });
    wheel2(t, FX, 0.38, f * (W / 2 - 0.17), { r: 0.38, w: 0.26, style: 'steel', outward: f });
  }
  // front: wide chrome bar grille, square headlamps with amber corners, chrome bumper
  const gm = new THREE.MeshStandardMaterial({ map: grilleTex('bars'), metalness: 0.6, roughness: 0.35 });
  decal(t, geo, rect(-0.5, 0.78, 0.5, 1.14), gm, { view: 'front', out: 0.006 });
  decal(t, geo, [[-0.53, 0.75], [0.53, 0.75], [0.53, 1.17], [-0.53, 1.17], [-0.53, 1.13], [0.5, 1.13], [0.5, 0.79], [-0.53, 0.79]], KM.chrome, { view: 'front', out: 0.007, res: 0.02 });
  for (const s of [-1, 1]) {
    decal(t, geo, [[s * 0.56, 0.86], [s * 0.86, 0.86], [s * 0.86, 1.12], [s * 0.56, 1.12]], KM.headlamp, { view: 'front', out: 0.006 });
    decal(t, geo, [[s * 0.86, 0.86], [s * 0.97, 0.86], [s * 0.97, 1.12], [s * 0.86, 1.12]], KM.amber, { view: 'front', out: 0.006 });
  }
  rbox(t, KM.chrome, 0.24, 0.27, W + 0.08, 0.06, 3.06, 0.62, 0);
  rbox(t, KM.plastic, 0.14, 0.1, W - 0.2, 0.03, 3.0, 0.45, 0);
  return geo;
}

export function ambulance2(scene, { x = 0, z = 0, rotY = 0 } = {}) {
  const a = vGroup(scene, x, z, rotY);
  const white = paint(0xf6f6f4);
  const red = paint(0xc0262d);
  const cab = cutawayCab(a, white);
  for (const f of [-1, 1]) decal(a, cab, [[0.4, 1.02], [2.85, 0.99], [2.85, 1.13], [0.4, 1.16]], red, { view: 'side', facing: f, out: 0.004, res: 0.05 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTex('MERCY 1'), roughness: 0.5 }));
  plate.position.set(3.19, 0.62, 0); plate.rotation.y = Math.PI / 2; a.add(plate);
  // patient box: rounded-edge module behind the cab
  const BX0 = -2.75, BX1 = 0.5, BW = 2.3, BY0 = 0.55, BY1 = 2.65;
  const boxShape = profile([[BX1, BY0, 0.03], [BX1, BY1, 0.08], [BX0, BY1, 0.08], [BX0, BY0, 0.03], { arch: [-1.45, 0.47, 0.5] }]);
  mesh(a, shell(boxShape, BW, { bevel: 0.08 }), white);
  wellLiner(a, -1.45, 0.47, 0.5, BW);
  const star = canvasTex(256, 256, (g) => {
    g.translate(128, 128); g.fillStyle = '#1d4fa0';
    for (let k = 0; k < 3; k++) { g.save(); g.rotate((k * Math.PI) / 3); g.beginPath(); g.roundRect(-30, -110, 60, 220, 8); g.fill(); g.restore(); }
    g.fillStyle = '#fff'; g.fillRect(-5, -70, 10, 140); g.beginPath(); g.arc(0, -78, 10, 0, Math.PI * 2); g.fill();
  });
  const word = canvasTex(1024, 160, (g, w, h) => {
    g.fillStyle = '#c0262d'; g.font = 'bold 120px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('AMBULANCE', w / 2, h / 2);
  });
  for (const f of [-1, 1]) {
    const sz = f * BW / 2;
    boxM(a, red, BX1 - BX0 - 0.08, 0.26, 0.006, (BX0 + BX1) / 2, 1.28, sz + f * 0.003, false);       // red band
    boxM(a, red, BX1 - BX0 - 0.08, 0.05, 0.006, (BX0 + BX1) / 2, 2.4, sz + f * 0.003, false);        // top stripe
    sideDecal(a, star, 0.55, 0.55, -1.6, 1.9, sz + f * 0.005, f);
    sideDecal(a, word, 1.6, 0.25, -0.35, 1.9, sz + f * 0.005, f);
    // side compartment doors (the low ones techs and medics use) + the side entry door
    for (const [x0, x1] of [[-2.65, -2.0], [-0.85, -0.25]]) {
      boxM(a, KM.trim, x1 - x0, 0.55, 0.004, (x0 + x1) / 2, 0.86, sz + f * 0.002, false);
      rbox(a, white, x1 - x0 - 0.02, 0.53, 0.014, 0.01, (x0 + x1) / 2, 0.86, sz + f * 0.008);
      rbox(a, KM.chrome, 0.12, 0.05, 0.016, 0.02, (x0 + x1) / 2, 1.04, sz + f * 0.017);
    }
    // warning lights: red/white at the top corners, plus scene lights
    for (const lx of [BX1 - 0.12, BX0 + 0.12]) rbox(a, KM.tail, 0.22, 0.12, 0.1, 0.03, lx, BY1 - 0.15, sz + f * 0.04);
    rbox(a, KM.drl, 0.3, 0.1, 0.04, 0.02, -1.0, BY1 - 0.15, sz + f * 0.03);
    rbox(a, KM.tail, 0.12, 0.06, 0.04, 0.02, (BX0 + BX1) / 2, 0.75, sz + f * 0.02);
    // rear dual wheels
    wheel2(a, -1.45, 0.38, f * (BW / 2 - 0.22), { r: 0.38, w: 0.3, style: 'dually', outward: f });
  }
  // light bar on the cab roof front of the box, red + blue
  for (let k = 0; k < 6; k++) rbox(a, k === 2 || k === 3 ? KM.drl : KM.tail, 0.08, 0.14, 0.2, 0.03, BX1 + 0.04, BY1 - 0.12, -0.8 + k * 0.32);
  // rear: two doors with windows, lights, bumper step
  boxM(a, KM.trim, 0.006, 1.8, 0.012, BX0 - 0.003, 1.55, 0, false);
  for (const s of [-1, 1]) {
    boxM(a, KM.glass, 0.006, 0.5, 0.55, BX0 - 0.004, 2.0, s * 0.5, false);
    rbox(a, KM.tail, 0.05, 0.36, 0.16, 0.03, BX0 - 0.02, 1.15, s * 0.98);
    rbox(a, KM.amber, 0.05, 0.14, 0.16, 0.03, BX0 - 0.02, 0.88, s * 0.98);
    rbox(a, KM.tail, 0.05, 0.12, 0.18, 0.03, BX0 - 0.02, BY1 - 0.12, s * 0.95);
    boxM(a, red, 0.006, 0.2, 0.9, BX0 - 0.004, 1.28, s * 0.58, false);
  }
  rbox(a, KM.alu, 0.3, 0.06, BW - 0.2, 0.02, BX0 - 0.12, 0.6, 0);
  boxM(a, KM.trim, BX1 - BX0, 0.1, BW - 0.04, (BX0 + BX1) / 2, BY0 - 0.03, 0);
  contactShadow(a, 6.2, BW);
  return a;
}

// ---------------------------------------------------------------- box truck (cab-over)
// A cab-over truck cab (box truck): flat upright face, big windshield, grille and lamps low.
function cabOver(t, body, { W = 2.05, FX = 2.92, back = 1.95, front = 3.58, roof = 2.62 } = {}) {
  const BELT = 1.6, TAPER = 0.05, AY = 0.62, AR = 0.56;
  const geo = bodyShell(t, body, [
    [front - 0.02, 0.62, 0.04], [front + 0.02, 1.5, 0.06], [front - 0.06, roof - 0.2, 0.16], [front - 0.3, roof, 0.16],
    [back + 0.05, roof, 0.06], [back, 0.62, 0.03], { arch: [FX, AY, AR] },
  ], W, { belt: BELT, taper: TAPER, bevel: 0.1, arches: [[FX, AY, AR]] });
  windshield(t, [front + 0.02, 1.62], [front - 0.06, roof - 0.24], W, BELT, TAPER, 0.08);
  for (const f of [-1, 1]) {
    const gl = { belt: BELT, taper: TAPER, facing: f, out: 0.004 };
    sidePanel(t, [[front - 0.2, 1.65], [front - 0.2, roof - 0.24], [2.62, roof - 0.24], [2.62, 1.65]], KM.glass, W, gl);
    sidePanel(t, [[2.52, 1.85], [2.52, roof - 0.24], [2.12, roof - 0.24], [2.12, 1.85]], KM.glass, W, gl);
    seam(t, geo, 2.57, 0.75, roof - 0.12, f);
    rbox(t, KM.trim, 0.04, 0.2, 0.03, 0.012, 2.66, 1.4, f * (W / 2 + 0.008));                  // grab handle
    rbox(t, KM.plastic, 0.42, 0.05, 0.2, 0.02, 2.95, 0.5, f * (W / 2 + 0.02));                  // step
    // mirror on a tubular arm off the front corner
    rbox(t, KM.trim, 0.04, 0.04, 0.32, 0.01, front - 0.15, 2.0, f * (W / 2 + 0.12));
    rbox(t, KM.trim, 0.1, 0.42, 0.2, 0.04, front - 0.18, 1.92, f * (W / 2 + 0.3));
    boxM(t, KM.glass, 0.004, 0.36, 0.16, front - 0.125, 1.92, f * (W / 2 + 0.3), false);
    flare(t, FX, AY, AR, f * W / 2, f, { thick: 0.05, depth: 0.04, mat: KM.plastic });
    wheel2(t, FX, 0.45, f * (W / 2 - 0.2), { r: 0.45, w: 0.3, style: 'steel', outward: f });
  }
  // face: chrome-slat grille between square lamps, white bumper with a black step under it
  const gm = new THREE.MeshStandardMaterial({ map: grilleTex('bars'), metalness: 0.6, roughness: 0.35 });
  decal(t, geo, rect(-0.52, 0.98, 0.52, 1.38), gm, { view: 'front', out: 0.006 });
  for (const s of [-1, 1]) {
    decal(t, geo, [[s * 0.6, 1.0], [s * 0.94, 1.0], [s * 0.94, 1.3], [s * 0.6, 1.3]], KM.headlamp, { view: 'front', out: 0.006 });
    decal(t, geo, [[s * 0.6, 0.93], [s * 0.94, 0.93], [s * 0.94, 0.99], [s * 0.6, 0.99]], KM.amber, { view: 'front', out: 0.006 });
  }
  decal(t, geo, rect(-0.98, 1.52, 0.98, 1.6), KM.trim, { view: 'front', out: 0.005 });     // wiper cowl
  rbox(t, body, 0.22, 0.24, W + 0.06, 0.05, front + 0.04, 0.78, 0);
  rbox(t, KM.plastic, 0.2, 0.14, W - 0.1, 0.03, front + 0.0, 0.58, 0);
  for (let i = 0; i < 3; i++) rbox(t, KM.amberLit, 0.04, 0.03, 0.08, 0.01, front - 0.3, roof + 0.02, -0.2 + i * 0.2);
  return geo;
}

export function boxTruck2(scene, { x = 0, z = 0, rotY = 0, name = 'IRONSIDE FREIGHT' } = {}) {
  const t = vGroup(scene, x, z, rotY);
  const white = paint(0xf3f3f1);
  const navy = paint(0x1f3b63);
  cabOver(t, white);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: plateTex('IRN 2240'), roughness: 0.5 }));
  plate.position.set(3.75, 0.62, 0); plate.rotation.y = Math.PI / 2; t.add(plate);
  // chassis between the cab and the box: frame rails, fuel tank, battery box
  for (const s2 of [-1, 1]) boxM(t, KM.trim, 5.6, 0.2, 0.08, -0.6, 0.62, s2 * 0.42);
  for (const f of [-1, 1]) {
    const tank = mesh(t, new THREE.CylinderGeometry(0.24, 0.24, 0.9, 20), KM.alu, 0.9, 0.62, f * 0.78);
    tank.rotation.z = Math.PI / 2;
    rbox(t, KM.trim, 0.5, 0.4, 0.3, 0.03, 0.2, 0.6, f * 0.82);
    wheel2(t, -1.6, 0.45, f * 0.88, { r: 0.45, w: 0.32, style: 'dually', outward: f });
  }
  // box body
  const BX0 = -3.4, BX1 = 1.9, BW = 2.4, BY0 = 1.0, BY1 = 3.3;
  rbox(t, white, BX1 - BX0, BY1 - BY0, BW, 0.04, (BX0 + BX1) / 2, (BY0 + BY1) / 2, 0);
  for (const y of [BY0 + 0.02, BY1 - 0.02]) for (const s of [-1, 1]) boxM(t, KM.alu, BX1 - BX0, 0.06, 0.03, (BX0 + BX1) / 2, y, s * (BW / 2 + 0.005), false);
  for (const s of [-1, 1]) for (const xx of [BX0 + 0.02, BX1 - 0.02]) boxM(t, KM.alu, 0.05, BY1 - BY0, 0.05, xx, (BY0 + BY1) / 2, s * (BW / 2 - 0.01), false);
  boxM(t, KM.trim, BX1 - BX0, 0.22, 1.8, (BX0 + BX1) / 2, BY0 - 0.13, 0);                   // frame
  const word = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#1f3b63'; g.font = 'bold 120px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name.split(' ')[0], w / 2, 100);
    g.font = '600 64px Arial, sans-serif'; g.fillText(name.split(' ').slice(1).join(' ') + '  •  LOGISTICS', w / 2, 200);
  });
  for (const f of [-1, 1]) {
    sideDecal(t, word, 3.6, 0.9, -0.75, 2.3, f * (BW / 2 + 0.002), f);
    boxM(t, navy, BX1 - BX0 - 0.2, 0.1, 0.006, (BX0 + BX1) / 2, 1.45, f * (BW / 2 + 0.002), false);
    for (const xx of [BX1 - 0.15, (BX0 + BX1) / 2, BX0 + 0.15]) rbox(t, KM.amberLit, 0.06, 0.04, 0.03, 0.01, xx, BY0 + 0.12, f * (BW / 2 + 0.01));
    rbox(t, KM.trim, 1.4, 0.06, 0.06, 0.02, -2.3, 0.75, f * 1.0);                          // side underride guard
  }
  // rear roll-up door with slats, handle, lights, bumper
  const slat = canvasTex(64, 512, (g, w, h) => { g.fillStyle = '#ecebe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c4c3bf'; for (let y = 0; y < h; y += 40) g.fillRect(0, y, w, 4); });
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.2, BY1 - BY0 - 0.15), new THREE.MeshStandardMaterial({ map: slat, roughness: 0.5 }));
  rd.position.set(BX0 - 0.022, (BY0 + BY1) / 2 - 0.02, 0); rd.rotation.y = -Math.PI / 2; t.add(rd);
  boxM(t, KM.chrome, 0.02, 0.04, 0.3, BX0 - 0.03, BY0 + 0.2, 0, false);
  for (const s of [-1, 1]) {
    rbox(t, KM.tail, 0.05, 0.22, 0.12, 0.02, BX0 - 0.02, 0.85, s * 0.95);
    rbox(t, KM.tail, 0.04, 0.05, 0.08, 0.01, BX0 - 0.03, BY1 - 0.08, s * 0.9);
  }
  rbox(t, KM.trim, 0.12, 0.18, BW - 0.1, 0.03, BX0 - 0.05, 0.62, 0);
  contactShadow(t, 7.2, BW);
  return t;
}

// ---------------------------------------------------------------- school bus (conventional)
export function schoolBus2(scene, { x = 0, z = 0, rotY = 0 } = {}) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.y = rotY;
  scene.add(b);
  const yellow = paint(0xf2ac00, { rough: 0.55 });
  const W = 2.45, BELT = 2.52, TAPER = 0.18, RX = -3.4, FX = 3.55;
  // body: long box with rounded roof edges and a slightly raked front cap
  const body = profile([[2.8, 0.62, 0.04], [2.78, 1.58, 0.05], [2.62, 2.85, 0.2], [2.35, 3.02, 0.25], [-5.3, 3.02, 0.25],
    [-5.42, 2.85, 0.15], [-5.42, 0.62, 0.05], { arch: [RX, 0.55, 0.62] }]);
  mesh(b, shell(body, W, { bevel: 0.1, belt: BELT, taper: TAPER }), yellow);
  wellLiner(b, RX, 0.55, 0.62, W);
  // hood + fenders (narrower than the body), with the front arch
  const hood = profile([[4.42, 0.62, 0.04], [4.48, 1.38, 0.08], [4.3, 1.53, 0.14], [2.8, 1.8, 0], [2.8, 0.62, 0], { arch: [FX, 0.55, 0.6] }]);
  const hoodGeo = shell(hood, 2.24, { bevel: 0.1, nose: [3.9, 0.1] });
  mesh(b, hoodGeo, yellow);
  wellLiner(b, FX, 0.55, 0.6, 2.2);
  // black-slat grille filling the nose, square lamps low on the fenders
  decal(b, hoodGeo, rect(-0.4, 0.78, 0.4, 1.38), new THREE.MeshStandardMaterial({ map: grilleTex('bars'), metalness: 0.5, roughness: 0.4 }), { view: 'front', out: 0.006 });
  decal(b, hoodGeo, [[-0.43, 0.75], [0.43, 0.75], [0.43, 1.41], [-0.43, 1.41], [-0.43, 1.38], [0.4, 1.38], [0.4, 0.78], [-0.43, 0.78]], KM.trim, { view: 'front', out: 0.007, res: 0.02 });
  for (const s2 of [-1, 1]) {
    decal(b, hoodGeo, rect(s2 * 0.55, 0.82, s2 * 0.9, 1.0), KM.headlamp, { view: 'front', out: 0.006 });
    decal(b, hoodGeo, rect(s2 * 0.55, 1.03, s2 * 0.9, 1.09), KM.amber, { view: 'front', out: 0.006 });
  }
  const black = KM.trim;
  for (const f of [-1, 1]) {
    const sz = f * W / 2;
    // passenger windows: black frames with split glass (the classic two-pane bus window)
    for (let i = 0; i < 10; i++) {
      const wx = 2.05 - i * 0.74;
      sidePanel(b, [[wx - 0.66, 1.78], [wx, 1.78], [wx, 2.48], [wx - 0.66, 2.48]], black, W, { belt: BELT, taper: TAPER, facing: f, out: 0.004 });
      sidePanel(b, [[wx - 0.62, 1.82], [wx - 0.04, 1.82], [wx - 0.04, 2.13], [wx - 0.62, 2.13]], KM.glass, W, { belt: BELT, taper: TAPER, facing: f, out: 0.007 });
      sidePanel(b, [[wx - 0.62, 2.16], [wx - 0.04, 2.16], [wx - 0.04, 2.44], [wx - 0.62, 2.44]], KM.glass, W, { belt: BELT, taper: TAPER, facing: f, out: 0.007 });
    }
    // black rub rails, lettering, warning lamps on the side, mirrors
    for (const y of [1.7, 1.2, 0.85]) boxM(b, black, 8.0, 0.05, 0.012, -1.3, y, sz + f * 0.006, false);
    sideDecal(b, canvasTex(1024, 110, (g, w, h) => { g.fillStyle = '#111'; g.font = 'bold 70px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LINCOLN SCHOOL DISTRICT', w / 2, h / 2); }),
      3.6, 0.38, -1.4, 1.45, sz + f * 0.008, f);
    rbox(b, black, 0.06, 0.04, 0.4, 0.01, 2.9, 1.95, f * 1.15);                 // mirror arm
    rbox(b, black, 0.1, 0.4, 0.2, 0.04, 2.95, 1.9, f * 1.38);                  // west-coast mirror
    boxM(b, KM.glass, 0.004, 0.36, 0.16, 3.0, 1.9, f * 1.38, false);
    const cross = mesh(b, new THREE.SphereGeometry(0.1, 14, 10), black, 4.32, 1.78, f * 0.98);   // crossover mirror on its stalk
    cross.scale.set(0.6, 1, 1);
    const stalk = mesh(b, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), black, 4.2, 1.6, f * 0.93, false);
    stalk.rotation.z = 0.6;
    wheel2(b, FX, 0.5, f * (1.1 - 0.16), { r: 0.5, w: 0.3, style: 'steel', outward: f });
    wheel2(b, RX, 0.5, f * (W / 2 - 0.22), { r: 0.5, w: 0.34, style: 'dually', outward: f });
  }
  // stop arm (driver's side = +z for a vehicle facing +x... the left side) and entry door (-z)
  const stop = canvasTex(128, 128, (g) => { g.fillStyle = '#c4161c'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); } g.fill(); g.fillStyle = '#fff'; g.font = 'bold 38px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 64, 66); });
  sideDecal(b, stop, 0.42, 0.42, 1.9, 2.0, W / 2 + 0.03, 1);
  sidePanel(b, [[2.05, 0.75], [2.68, 0.75], [2.68, 2.5], [2.05, 2.5]], black, W, { belt: BELT, taper: TAPER, facing: -1, out: 0.005 });
  for (const dx of [2.09, 2.39]) sidePanel(b, [[dx, 0.82], [dx + 0.26, 0.82], [dx + 0.26, 2.44], [dx, 2.44]], KM.glass, W, { belt: BELT, taper: TAPER, facing: -1, out: 0.008 });
  // front cap: split windshield, SCHOOL BUS sign, 8-way warning lights
  for (const s of [-1, 1]) {
    const ws = boxM(b, KM.glass, 0.01, 1.05, 1.05, 2.73, 2.12, s * 0.56, false);
    ws.rotation.z = 0.12;
  }
  const sign = canvasTex(512, 110, (g, w, h) => { g.fillStyle = '#f6b400'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 76px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCHOOL BUS', w / 2, h / 2 + 3); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.28), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.5 }));
  sg.position.set(2.56, 2.86, 0); sg.rotation.y = Math.PI / 2; sg.rotation.x = -0.0; t2(sg, -0.6); b.add(sg);
  function t2(m, tilt) { m.rotation.order = 'YXZ'; m.rotation.x = tilt * 0; m.rotateX(0); }
  for (const s of [-1, 1]) {
    for (const [lz, mt] of [[0.98, KM.tail], [0.72, KM.amberLit]]) {
      rbox(b, black, 0.06, 0.2, 0.2, 0.03, 2.58, 2.86, s * lz);
      const l = mesh(b, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 18), mt, 2.62, 2.86, s * lz, false);
      l.rotation.z = Math.PI / 2;
    }
  }
  // bumpers
  rbox(b, black, 0.24, 0.3, 2.5, 0.05, 4.55, 0.62, 0);
  for (const f of [-1, 1]) {
    flare(b, FX, 0.55, 0.6, f * 1.12, f, { thick: 0.07, depth: 0.05 });
    flare(b, RX, 0.55, 0.62, f * W / 2, f, { thick: 0.07, depth: 0.05 });
  }
  rbox(b, black, 0.24, 0.3, W + 0.05, 0.05, -5.5, 0.62, 0);
  // rear: emergency door, lights
  boxM(b, black, 0.006, 1.95, 0.75, -5.425, 1.62, 0, false);
  boxM(b, KM.glass, 0.008, 0.9, 0.6, -5.428, 2.05, 0, false);
  for (const s of [-1, 1]) {
    for (const [ly, mt] of [[2.86, KM.tail], [2.86, KM.amberLit]]) {
      const l = mesh(b, new THREE.CylinderGeometry(0.075, 0.075, 0.02, 18), mt, -5.43, ly, s * (mt === KM.tail ? 0.98 : 0.72), false);
      l.rotation.z = Math.PI / 2;
    }
    rbox(b, KM.tail, 0.04, 0.25, 0.25, 0.03, -5.43, 1.1, s * 0.9);
  }
  contactShadow(b, 10.2, W);
  return b;
}

// ---------------------------------------------------------------- warehouse forklift
// A sit-down counterbalance truck: low yellow body with the seat on the engine hood, a rounded
// counterweight at the back, black overhead guard and a tall black mast with long forks.
export function forklift2(scene, { x = 0, z = 0, rotY = 0, forkHeight = 0.12 } = {}) {
  const fk = new THREE.Group();
  fk.position.set(x, 0, z);
  fk.rotation.y = rotY;
  scene.add(fk);
  const yellow = paint(0xf2b705, { rough: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.55, metalness: 0.35 });
  const FR = 0.33, RR = 0.27, FXw = 0.42, RXw = -0.62, BW = 1.12;
  // body: step at the front, hood under the seat, counterweight rising at the back
  const body = profile([[0.62, 0.22, 0.04], [0.64, 0.56, 0.05], [0.2, 0.58, 0.04], [0.06, 0.86, 0.06], [-0.62, 0.88, 0.04],
    [-0.7, 1.0, 0.06], [-1.02, 1.0, 0.18], [-1.08, 0.32, 0.14], { arch: [RXw, 0.24, RR + 0.04] }, { arch: [FXw, 0.24, FR + 0.04] }]);
  const geo = shell(body, BW, { bevel: 0.07 });
  mesh(fk, geo, yellow);
  for (const [ax, r] of [[RXw, RR + 0.04], [FXw, FR + 0.04]]) wellLiner(fk, ax, 0.24, r, BW);
  // black floor plate, hood top and the counterweight's tow pin and lamps
  boxM(fk, black, 0.4, 0.02, BW - 0.16, 0.38, 0.575, 0);
  rbox(fk, black, 0.62, 0.05, BW - 0.14, 0.02, -0.3, 0.89, 0);
  for (const s2 of [-1, 1]) {
    rbox(fk, KM.tail, 0.03, 0.07, 0.1, 0.01, -1.08, 0.82, s2 * 0.38);
    rbox(fk, KM.drl, 0.03, 0.06, 0.08, 0.01, -1.08, 0.72, s2 * 0.38);
  }
  // seat with a tall back, steering column and wheel, levers
  rbox(fk, black, 0.44, 0.1, 0.46, 0.04, -0.3, 0.97, 0);
  const back = rbox(fk, black, 0.1, 0.5, 0.44, 0.05, -0.55, 1.24, 0);
  back.rotation.z = 0.12;
  boxM(fk, black, 0.12, 0.32, 0.3, 0.32, 0.74, 0);                                   // dash
  const col = mesh(fk, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), black, 0.24, 1.05, 0); col.rotation.z = 0.45;
  const sw = mesh(fk, new THREE.TorusGeometry(0.15, 0.022, 8, 24), black, 0.15, 1.24, 0);
  sw.rotation.y = Math.PI / 2; sw.rotation.x = 0.5;
  for (let i = 0; i < 3; i++) mesh(fk, new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6), black, 0.36, 1.0, -0.12 - i * 0.07).rotation.z = 0.25;
  // overhead guard: front legs lean forward from the cowl, rear legs on the counterweight
  const tube = (a, b, r = 0.035) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = mesh(fk, new THREE.CylinderGeometry(r, r, A.distanceTo(B), 10), black, 0, 0, 0);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  };
  const GY = 2.12;
  for (const s2 of [-1, 1]) {
    tube([0.5, 0.58, s2 * 0.5], [0.3, GY, s2 * 0.5]);
    tube([-0.85, 0.98, s2 * 0.48], [-0.85, GY, s2 * 0.48]);
    tube([0.3, GY, s2 * 0.5], [-0.88, GY, s2 * 0.48], 0.03);
  }
  for (let i = 0; i < 6; i++) boxM(fk, black, 0.03, 0.03, 0.98, 0.25 - i * 0.22, GY + 0.01, 0);
  for (let i = 0; i < 5; i++) boxM(fk, black, 1.15, 0.025, 0.025, -0.29, GY + 0.01, -0.36 + i * 0.18);
  rbox(fk, KM.amberLit, 0.08, 0.07, 0.08, 0.03, -0.82, GY + 0.06, 0);
  // mast: outer and inner channels, chains, cylinder; carriage with a load backrest; forks
  const MX = 0.74, MH = 2.35;
  for (const pz of [-0.34, 0.34]) {
    boxM(fk, black, 0.09, MH, 0.1, MX, MH / 2 + 0.05, pz);
    boxM(fk, black, 0.07, MH - 0.15, 0.08, MX + 0.08, (MH - 0.15) / 2 + 0.05, pz * 0.84);
    boxM(fk, KM.trim, 0.02, MH - 0.4, 0.03, MX + 0.03, (MH - 0.4) / 2 + 0.2, pz * 0.6, false); // chains
  }
  const cyl = mesh(fk, new THREE.CylinderGeometry(0.045, 0.045, MH - 0.3, 12), KM.chrome, MX - 0.02, (MH - 0.3) / 2 + 0.1, 0);
  for (const y of [0.35, MH - 0.05]) boxM(fk, black, 0.12, 0.08, 0.76, MX + 0.02, y, 0);
  const cy = forkHeight;
  boxM(fk, black, 0.06, 0.42, 0.96, MX + 0.16, cy + 0.26, 0);                       // carriage plate
  for (let i = 0; i < 5; i++) boxM(fk, black, 0.03, 0.62, 0.03, MX + 0.17, cy + 0.78, -0.42 + i * 0.21); // backrest bars
  for (const y of [cy + 0.62, cy + 1.08]) boxM(fk, black, 0.04, 0.04, 0.9, MX + 0.17, y, 0);
  for (const pz of [-0.28, 0.28]) {
    boxM(fk, black, 1.1, 0.045, 0.11, MX + 0.75, cy, pz);
    boxM(fk, black, 0.045, 0.42, 0.11, MX + 0.21, cy + 0.2, pz);
  }
  const lbl = canvasTex(256, 80, (g, w, h) => { g.fillStyle = '#111'; g.font = 'bold 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('5000 LB', w / 2, h / 2); });
  for (const f of [-1, 1]) {
    sideDecal(fk, lbl, 0.32, 0.1, -0.85, 0.66, f * (BW / 2 + 0.003), f);
    wheel2(fk, FXw, FR, f * (BW / 2 - 0.1), { r: FR, w: 0.24, style: 'steel', mat: KM.darkWheel, outward: f });
    wheel2(fk, RXw, RR, f * (BW / 2 - 0.12), { r: RR, w: 0.2, style: 'steel', mat: KM.darkWheel, outward: f });
  }
  contactShadow(fk, 2.6, 1.2);
  return fk;
}

// ---------------------------------------------------------------- fire engine (custom-cab pumper)
// Faces +x. The cab is open above the belt (real glass you can see through) so things inside it,
// like the door remote clipped to the driver's visor at about (3.45, 2.5, -0.55), can be seen.
export function fireEngine2(scene, { x = 0, z = 0, rotY = 0, number = '7' } = {}) {
  const g = vGroup(scene, x, z, rotY);
  const red = paint(0xb3141b, { rough: 0.32 });
  const white = paint(0xf2f2ef);
  const see = new THREE.MeshPhysicalMaterial({ color: 0x5f7380, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.42, depthWrite: false });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.8 });
  const W = 2.5, hw = W / 2, FX = 2.72, R = 0.52, CF = 3.64, CB = 1.2, BELT = 1.72, ROOF = 2.96;
  // ---- cab: solid below the windows
  const lowGeo = shell(profile([[CF - 0.02, 0.55, 0.04], [CF + 0.02, BELT, 0.05], [CB, BELT, 0], [CB, 0.55, 0], { arch: [FX, 0.55, R + 0.08] }]), W, { bevel: 0.06 });
  mesh(g, lowGeo, red);
  wellLiner(g, FX, 0.55, R + 0.08, W);
  // above the belt: pillars, a red band over the windows, the roof with a white cap, the back wall
  const pil = (x0, x1, zc, d) => boxM(g, red, x1 - x0, ROOF - BELT, d, (x0 + x1) / 2, (BELT + ROOF) / 2, zc);
  for (const s of [-1, 1]) {
    pil(CF - 0.1, CF + 0.02, s * (hw - 0.06), 0.12);                     // A pillars
    pil(2.1, 2.2, s * (hw - 0.04), 0.08);                                // B pillars
    boxM(g, red, CF - CB, ROOF - 2.76, 0.08, (CF + CB) / 2, (2.76 + ROOF) / 2, s * (hw - 0.04));  // band over the windows
    boxM(g, red, CF - CB, 0.1, 0.08, (CF + CB) / 2, BELT + 0.05, s * (hw - 0.04));               // sill under them
  }
  boxM(g, red, 0.12, ROOF - 2.8, W - 0.2, CF - 0.04, (2.8 + ROOF) / 2, 0);                         // header over the windshield
  boxM(g, red, 0.08, ROOF - BELT, W, CB + 0.04, (BELT + ROOF) / 2, 0);                              // back wall
  rbox(g, red, CF - CB + 0.06, 0.14, W, 0.05, (CF + CB) / 2, ROOF + 0.05, 0);                       // roof
  rbox(g, white, CF - CB - 0.1, 0.06, W - 0.16, 0.03, (CF + CB) / 2 - 0.02, ROOF + 0.13, 0);        // white roof cap
  boxM(g, red, 0.08, ROOF - BELT, 0.12, CF - 0.04, (BELT + ROOF) / 2, 0);                           // windshield divider
  // glass you can see through
  for (const s of [-1, 1]) {
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(hw - 0.14, 2.78 - 1.8), see);
    ws.position.set(CF + 0.005, 2.29, s * (hw / 2 + 0.01)); ws.rotation.y = Math.PI / 2; g.add(ws);
    for (const [x0, x1] of [[2.24, CF - 0.12], [CB + 0.1, 2.06]]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 2.74 - 1.8), see);
      sw.position.set((x0 + x1) / 2, 2.27, s * (hw - 0.01)); if (s < 0) sw.rotation.y = Math.PI; g.add(sw);
    }
  }
  // inside: floor, dash, seats, the driver's sun visor
  boxM(g, dark, CF - CB - 0.1, 0.04, W - 0.2, (CF + CB) / 2, BELT - 0.02, 0, false);
  rbox(g, dark, 0.35, 0.28, W - 0.2, 0.04, CF - 0.25, BELT + 0.12, 0);
  for (const [sx, sz2] of [[2.85, -0.55], [2.85, 0.55], [1.6, -0.6], [1.6, 0], [1.6, 0.6]]) {
    rbox(g, dark, 0.45, 0.1, 0.45, 0.03, sx, BELT + 0.22, sz2);
    rbox(g, dark, 0.1, 0.6, 0.45, 0.03, sx - 0.22, BELT + 0.55, sz2);
  }
  boxM(g, dark, 0.22, 0.02, 0.5, CF - 0.2, 2.62, -0.55, false);
  // ---- front: grille, quad lamps with amber turns, warning lamps, chrome bumper and air horns
  const gm = new THREE.MeshStandardMaterial({ map: grilleTex('bars'), metalness: 0.5, roughness: 0.4 });
  decal(g, lowGeo, rect(-0.46, 0.92, 0.46, 1.6), gm, { view: 'front', out: 0.006 });
  decal(g, lowGeo, [[-0.5, 0.88], [0.5, 0.88], [0.5, 1.64], [-0.5, 1.64], [-0.5, 1.6], [0.46, 1.6], [0.46, 0.92], [-0.5, 0.92]], KM.chrome, { view: 'front', out: 0.007, res: 0.02 });
  for (const s of [-1, 1]) {
    for (const zc of [0.66, 0.9]) decal(g, lowGeo, rect(s * (zc - 0.1), 1.02, s * (zc + 0.1), 1.26), KM.headlamp, { view: 'front', out: 0.006 });
    decal(g, lowGeo, rect(s * 0.56, 0.9, s * 1.0, 0.98), KM.amber, { view: 'front', out: 0.006 });
    decal(g, lowGeo, rect(s * 0.58, 1.36, s * 1.0, 1.52), KM.tail, { view: 'front', out: 0.006 });
    const horn = mesh(g, new THREE.CylinderGeometry(0.03, 0.08, 0.45, 14), KM.chrome, CF + 0.2, 0.92, s * 0.28);
    horn.rotation.z = -Math.PI / 2;
    // west-coast mirrors on the A pillars
    rbox(g, KM.chrome, 0.04, 0.04, 0.3, 0.01, CF - 0.1, 2.05, s * (hw + 0.12));
    rbox(g, dark, 0.08, 0.45, 0.22, 0.04, CF - 0.12, 2.0, s * (hw + 0.3));
  }
  rbox(g, KM.chrome, 0.32, 0.3, W + 0.06, 0.06, CF + 0.17, 0.7, 0);
  rbox(g, dark, 0.3, 0.06, W - 0.2, 0.02, CF + 0.17, 0.87, 0);          // hose tray lid on the bumper
  // light bar across the cab roof
  for (let i = 0; i < 7; i++) rbox(g, i % 2 ? KM.drl : KM.tail, 0.28, 0.13, 0.3, 0.04, CF - 0.3, ROOF + 0.2, -0.93 + i * 0.31);
  // ---- pump panel between the cab and the body
  const gauges = canvasTex(256, 512, (c2, w, h) => {
    c2.fillStyle = '#b9bec4'; c2.fillRect(0, 0, w, h);
    c2.strokeStyle = '#7d8288'; c2.lineWidth = 4; c2.strokeRect(6, 6, w - 12, h - 12);
    for (const [gx, gy, gr] of [[70, 90, 40], [180, 90, 40], [128, 200, 50], [70, 320, 26], [128, 320, 26], [186, 320, 26]]) {
      c2.fillStyle = '#f4f4f2'; c2.beginPath(); c2.arc(gx, gy, gr, 0, Math.PI * 2); c2.fill();
      c2.strokeStyle = '#222'; c2.lineWidth = 4; c2.stroke();
      c2.beginPath(); c2.moveTo(gx, gy); c2.lineTo(gx + gr * 0.7, gy - gr * 0.4); c2.stroke();
    }
    for (let i = 0; i < 4; i++) { c2.fillStyle = ['#d22', '#e8c21a', '#2a6', '#24c'][i]; c2.fillRect(30 + i * 52, 400, 36, 60); }
  });
  boxM(g, KM.alu, CB - 0.55, 2.42 - 0.62, W - 0.06, (CB + 0.55) / 2, (2.42 + 0.62) / 2, 0);
  for (const s of [-1, 1]) {
    sideDecal(g, gauges, CB - 0.6, 1.5, (CB + 0.55) / 2, 1.55, s * (hw - 0.025), s);
    for (const vy of [0.95, 1.15]) { const cap = mesh(g, new THREE.CylinderGeometry(0.07, 0.07, 0.12, 14), KM.chrome, (CB + 0.55) / 2, vy, s * (hw + 0.03)); cap.rotation.x = Math.PI / 2; }
  }
  // ---- body: compartments with roll-up doors, a squared well over the tandem axle
  const BF = 0.55, BR = -4.05, BT = 2.38, RX1 = -2.82, RX2 = -3.86;
  const bodyGeo = shell(profile([[BF, 0.7, 0.03], [BF, BT, 0.04], [BR, BT, 0.04], [BR, 1.22, 0.03], [-2.18, 1.22, 0.03], [-2.18, 0.7, 0.03]]), W, { bevel: 0.05 });
  mesh(g, bodyGeo, red);
  boxM(g, KM.well, -2.18 - BR, 0.02, W - 0.1, (BR - 2.18) / 2, 1.215, 0, false);
  const shutter = new THREE.MeshStandardMaterial({ color: 0xe2e5e8, metalness: 0.35, roughness: 0.4,
    map: canvasTex(64, 256, (c2, w, h) => { c2.fillStyle = '#d5d9de'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#9da3aa'; for (let y = 0; y < h; y += 10) c2.fillRect(0, y, w, 2); }) });
  shutter.map.wrapT = THREE.RepeatWrapping;
  for (const s of [-1, 1]) {
    const sz2 = s * (hw + 0.005);
    for (const [x0, x1, y0, y1] of [[-0.05, 0.45, 0.8, 2.28], [-2.08, -0.15, 0.8, 2.28], [-3.0, -2.25, 1.32, 2.28], [-3.95, -3.08, 1.32, 2.28]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), shutter);
      p.position.set((x0 + x1) / 2, (y0 + y1) / 2, sz2); if (s < 0) p.rotation.y = Math.PI; g.add(p);
      boxM(g, KM.chrome, x1 - x0 - 0.1, 0.04, 0.03, (x0 + x1) / 2, y0 + 0.08, sz2 + s * 0.015, false);   // bar handle
    }
    // white stripe along the cab and body, alu rub rail, fender over the tandem wheels
    boxM(g, white, CF - BR - 0.1, 0.1, 0.006, (CF + BR) / 2 - 0.05, 1.12, s * (hw + 0.012), false);
    boxM(g, KM.alu, BF - BR, 0.06, 0.04, (BF + BR) / 2, 0.74, s * (hw + 0.01), false);
    rbox(g, KM.alu, -2.18 - BR + 0.04, 0.05, 0.12, 0.02, (BR - 2.18) / 2, 1.24, s * (hw - 0.03));
    rbox(g, KM.alu, 1.0, 0.04, 0.3, 0.01, (CB + BF) / 2 + 0.2, 0.6, s * (hw + 0.1));                  // step under the pump panel
    // warning lamps on the body corners
    rbox(g, KM.tail, 0.14, 0.1, 0.05, 0.02, BR + 0.12, BT - 0.12, s * (hw + 0.02));
    rbox(g, KM.tail, 0.14, 0.1, 0.05, 0.02, BF - 0.1, BT - 0.12, s * (hw + 0.02));
    label3(g, `ENGINE ${number}`, 1.1, 0.26, 2.75, 1.42, s * (hw + 0.006), s);
  }
  // rear: lamps, step, ladder on its rack, hose bed
  for (const s of [-1, 1]) {
    rbox(g, KM.tail, 0.04, 0.22, 0.22, 0.03, BR - 0.02, 1.0, s * 0.95);
    rbox(g, KM.amber, 0.04, 0.12, 0.22, 0.03, BR - 0.02, 0.8, s * 0.95);
  }
  rbox(g, KM.alu, 0.35, 0.06, W - 0.2, 0.02, BR - 0.15, 0.6, 0);
  boxM(g, dark, BF - BR - 0.4, 0.12, W - 0.5, (BF + BR) / 2 - 0.1, BT + 0.05, 0);                     // hose bed load
  for (const s of [-1, 1]) for (const rx of [0.2, -1.6, -3.4]) boxM(g, KM.alu, 0.06, 0.3, 0.06, rx, BT + 0.15, s * 1.0);
  for (const s of [-1, 1]) boxM(g, KM.alu, 4.3, 0.08, 0.06, -1.6, BT + 0.32, s * 1.0);
  for (const lz of [0.62, 0.95]) boxM(g, KM.alu, 4.2, 0.06, 0.04, -1.6, BT + 0.4, lz);
  for (let i = 0; i < 13; i++) boxM(g, KM.alu, 0.04, 0.04, 0.33, -3.6 + i * 0.33, BT + 0.4, 0.785);
  // chassis + wheels
  for (const s of [-1, 1]) boxM(g, KM.trim, 7.2, 0.24, 0.1, -0.3, 0.62, s * 0.5);
  for (const f of [-1, 1]) {
    wheel2(g, FX, R, f * (hw - 0.2), { r: R, w: 0.34, style: 'steel', mat: KM.chrome, outward: f });
    for (const rx of [RX1, RX2]) wheel2(g, rx, R, f * (hw - 0.24), { r: R, w: 0.36, style: 'dually', mat: KM.chrome, outward: f });
  }
  contactShadow(g, 8.2, W);
  return g;
}
// A text label on a side (for the cab doors).
function label3(g, text, w, h, x, y, z, facing) {
  const tex = canvasTex(512, Math.round(512 * h / w), (c2, cw, ch) => {
    c2.fillStyle = '#f6e6a8'; c2.font = `bold ${Math.round(ch * 0.7)}px Georgia, serif`; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(text, cw / 2, ch / 2 + 2);
  });
  sideDecal(g, tex, w, h, x, y, z, facing);
}
