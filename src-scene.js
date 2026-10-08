// scene.js — builds the Riverside Market storefront and its commercial entrance door.
//
// Units are METERS. The building wall sits on z = 0, the sidewalk (where the player
// stands) is +z, and the inside of the store is -z. y is height above the sidewalk.
//
// Every part the player will interact with later gets a NAME and goes into `parts`,
// so later phases can find it: doorOperator (or doorCloser), panicDevice, electricStrike,
// doorAlignment, accessPanel, adaPushPlate (plus doorLeaf, the swinging door itself).

import * as THREE from 'three';
import * as TEX from './src-textures.js';
import { buildTruck } from './src-truckScene.js';
import { car, deliveryVan2 } from './src-vehicles2.js';
import { param } from './src-params.js';
import { SITE as BUILDING } from './src-sites-index.js';

// Standard 3'0" x 7'0" aluminum storefront door.
export const DOOR = {
  width: 0.914,
  height: 2.134,
  thickness: 0.045,
  hingeX: -0.457, // the door hinges on the left jamb and swings OUT toward the player
};

// What's installed at this site. Jayson's rules:
//   'pushPlate' -> ADA (low-energy) OPERATOR + an ADA push plate on BOTH sides of the door
//   'sensor'    -> full automatic OPERATOR opened by motion SENSORS on both sides (no plates)
//   'none'      -> no operator: a regular CLOSER
// Operators and closers always mount on the INSIDE.
// Which door this call is on (the job board sets it when it reloads into a call; see params.js):
//   'ada'    -> ADA operator + push plates both sides (the front entrance)
//   'manual' -> no operator, no push plates: a regular closer (Jayson: same door, more faults)
export const DOOR_TYPE = BUILDING ? BUILDING.id : param('door') === 'manual' ? 'manual' : 'ada';
export const SITE = {
  activation: DOOR_TYPE === 'manual' ? 'none' : 'pushPlate',
};
export const HAS_OPERATOR = SITE.activation !== 'none';
export const CLOSER_ID = HAS_OPERATOR ? 'doorOperator' : 'doorCloser';

// What the camera should keep on screen.
export const FRAMING = BUILDING ? BUILDING.framing : {
  arrival: { cx: 0, xHalf: 2.45, yMin: -0.25, yMax: 4.55 }, // whole storefront + sign
  work: { cx: 0, xHalf: 1.0, yMin: -0.15, yMax: 3.1 },    // just the door and its hardware
};

import { MAT, box, glassPane, rod, setRod, texturedPlane, artPlane } from './src-sceneKit.js';
export { setRod };

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = TEX.sky();
  scene.fog = new THREE.Fog(0xd5e3ec, 14, 40);

  const parts = {};

  buildLighting(scene);
  buildStreet(scene);
  parts.truck = buildTruck(scene);
  if (BUILDING) { // another building: it builds its own facade, door and hardware
    BUILDING.build(scene, parts);
    return { scene, parts };
  }
  buildFacade(scene);
  buildInterior(scene);
  buildStorefrontFrame(scene, parts);
  buildDoor(scene, parts);
  buildHardware(scene, parts);

  return { scene, parts };
}

function buildLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xe3f0ff, 0x8a7f70, 1.15));

  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.position.set(3.5, 7, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: 1, far: 20 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Warm light spilling out of the store so the interior reads through the glass.
  const shopGlow = new THREE.PointLight(0xffe2b0, 4, 6, 1.5);
  shopGlow.position.set(0, 2.4, -1.2);
  scene.add(shopGlow);
}

function buildStreet(scene) {
  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 9),
    new THREE.MeshStandardMaterial({ map: TEX.concrete(40 / 1.5, 9 / 1.5), roughness: 0.95 }),
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0, 4.5);
  sidewalk.receiveShadow = true;
  sidewalk.name = 'sidewalk';
  scene.add(sidewalk);

  // Across the street: only seen when you're inside looking out.
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.95 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), asphalt);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.15, 14);
  scene.add(road);
  box(scene, 'curb', new THREE.MeshStandardMaterial({ color: 0xa7a49d, roughness: 0.9 }), 40, 0.15, 0.2, 0, -0.075, 9.0);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.12), new THREE.MeshStandardMaterial({ color: 0xd9b23a }));
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(0, -0.14, 14);
  scene.add(stripe);
  const farWalk = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), new THREE.MeshStandardMaterial({ color: 0xa9a59d }));
  farWalk.rotation.x = -Math.PI / 2;
  farWalk.position.set(0, 0, 21);
  scene.add(farWalk);
  // cars parked along the curb (the service truck parks between them) and across the street
  car(scene, { x: -7.1, z: 11.2, color: 0x2c4f7c, type: 'sedan', plate: '8KTR 214' });
  // the grocery store gets its delivery van out front; other sites get a parked car there
  if (BUILDING) car(scene, { x: 7.0, z: 11.2, color: 0x8a1f24, type: 'suv', plate: '7MOM 455' });
  else deliveryVan2(scene, { x: 7.9, z: 11.2 });
  car(scene, { x: 3.0, z: 18.6, color: 0xc9c6bd, type: 'hatch', rotY: Math.PI, plate: '6LUV 902' });
  const windows = TEX.buildingWindows();
  const colors = [0x8c5a44, 0xc9b79c, 0x6d7b86, 0xa2694f, 0xd6cdb8, 0x7d6a5a];
  let x = -14;
  colors.concat(colors).forEach((c, i) => {
    const w = 3.5 + (i % 3) * 1.2, h = 5 + ((i * 7) % 4) * 1.6;
    const mat = new THREE.MeshStandardMaterial({ color: c, map: windows, roughness: 0.9 });
    box(scene, 'acrossStreet', mat, w, h, 3, x + w / 2, h / 2, 24.5);
    x += w + 0.15;
  });
}

function buildFacade(scene) {
  const brickMat = (w, h) => new THREE.MeshStandardMaterial({ map: TEX.brick(w, h), roughness: 0.92 });
  // Opening for the storefront: x -2.25..2.25, y 0..3.05. The wall is 0.3 m thick.
  box(scene, 'wallLeft', brickMat(2.75, 5), 2.75, 5, 0.3, -3.625, 2.5, -0.15);
  box(scene, 'wallRight', brickMat(2.75, 5), 2.75, 5, 0.3, 3.625, 2.5, -0.15);
  box(scene, 'wallHeader', brickMat(4.5, 1.95), 4.5, 1.95, 0.3, 0, 4.025, -0.15);

  // Store sign (texture only on the front face; box faces are +x,-x,+y,-y,+z,-z).
  const signFront = new THREE.MeshStandardMaterial({ map: TEX.storeSign(), roughness: 0.6 });
  const signEdge = new THREE.MeshStandardMaterial({ color: 0x173f2a, roughness: 0.6 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.63, 0.08),
    [signEdge, signEdge, signEdge, signEdge, signFront, signEdge]);
  sign.position.set(0, 4.05, 0.04);
  sign.castShadow = true;
  sign.name = 'storeSign';
  scene.add(sign);

  // Striped awning sloping out over the storefront.
  const awningMat = new THREE.MeshStandardMaterial({ map: TEX.awning(), roughness: 0.85, side: THREE.DoubleSide });
  const awningDepth = 0.95, drop = 0.42;
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(4.7, Math.hypot(awningDepth, drop)), awningMat);
  slope.position.set(0, 3.62 - drop / 2, awningDepth / 2);
  slope.rotation.x = -Math.PI / 2 + Math.atan2(drop, awningDepth);
  slope.castShadow = true;
  slope.name = 'awning';
  scene.add(slope);
  const valance = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 0.18), awningMat);
  valance.position.set(0, 3.62 - drop - 0.09, awningDepth);
  valance.castShadow = true;
  scene.add(valance);
}

function buildInterior(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 3.2),
    new THREE.MeshStandardMaterial({ map: TEX.floorTile(14, 6.4), roughness: 0.4 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, -1.7);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), new THREE.MeshStandardMaterial({ color: 0x8a8578 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.05, -1.7);
  scene.add(ceiling);

  // Painted aisle backdrop, lit by itself so it glows like a bright store.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.05),
    new THREE.MeshBasicMaterial({ map: TEX.storeInterior(), color: 0xd8d0c0 }));
  back.position.set(0, 1.525, -3.3);
  scene.add(back);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.05), new THREE.MeshStandardMaterial({ color: 0xe6dcc6 }));
    wall.position.set(side * 3.5, 1.525, -1.7);
    wall.rotation.y = -side * Math.PI / 2;
    scene.add(wall);
  }

  // Neon OPEN sign hanging inside the left window.
  texturedPlane(scene, TEX.neonOpen(), 0.62, 0.31, -0.92, 1.85, -0.35, true).name = 'neonOpen';

  buildInteriorProps(scene);
}

// Things inside the entrance, so the store feels lived-in when the tech walks in.
// (Inside the store you're looking back toward the street, so +x is on your LEFT.)
function buildInteriorProps(scene) {
  const props = new THREE.Group();
  props.name = 'interiorProps';
  scene.add(props);
  const red = new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd6d9dc, metalness: 0.7, roughness: 0.25 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.8 });

  // Welcome mat in front of the door.
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8),
    new THREE.MeshStandardMaterial({ map: TEX.entryMat(), roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2;
  mat.rotation.z = Math.PI; // reads right-side-up from inside the store
  mat.position.set(0, 0.004, -0.6);
  mat.receiveShadow = true;
  props.add(mat);

  // Lit EXIT sign hanging from the ceiling over the door (double-faced).
  const exitTex = TEX.exitSign();
  const exitFace = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: false });
  const exitEdge = new THREE.MeshStandardMaterial({ color: 0xeeeeea });
  const exit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.05),
    [exitEdge, exitEdge, exitEdge, exitEdge, exitFace, exitFace]);
  exit.position.set(0, 2.62, -0.55);
  props.add(exit);
  rod(props, chrome, 0.006, new THREE.Vector3(-0.1, 2.705, -0.55), new THREE.Vector3(-0.1, 3.05, -0.55));
  rod(props, chrome, 0.006, new THREE.Vector3(0.1, 2.705, -0.55), new THREE.Vector3(0.1, 3.05, -0.55));

  // Ceiling light panels.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffbea });
  for (const [x, z] of [[-1.2, -1.0], [1.2, -1.0], [0, -2.2]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lightMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(x, 3.045, z);
    props.add(panel);
  }

  // Fire extinguisher on the inside of the solid panel by the door.
  const ext = new THREE.Group();
  ext.position.set(1.0, 0, -0.1);
  props.add(ext);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.42, 20), red);
  tank.position.set(0, 1.0, -0.075);
  tank.castShadow = true;
  ext.add(tank);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), red);
  dome.position.set(0, 1.21, -0.075);
  ext.add(dome);
  box(ext, 'extValve', rubber, 0.03, 0.06, 0.03, 0, 1.3, -0.075);
  box(ext, 'extHandle', chrome, 0.11, 0.012, 0.025, 0.02, 1.33, -0.075);
  rod(ext, rubber, 0.008, new THREE.Vector3(0.02, 1.29, -0.075), new THREE.Vector3(0.075, 1.0, -0.14));
  box(ext, 'extBracket', rubber, 0.05, 0.08, 0.02, 0, 1.12, -0.01);

  // Stack of red hand baskets on the other side of the door.
  for (let i = 0; i < 5; i++) {
    const y = 0.02 + i * 0.045;
    const b = new THREE.Group();
    b.position.set(-0.88, y, -0.55);
    b.rotation.y = (i % 2 ? 0.05 : -0.04);
    props.add(b);
    box(b, 'basketBottom', red, 0.42, 0.02, 0.3, 0, 0, 0);
    box(b, 'basketFront', red, 0.44, 0.2, 0.012, 0, 0.1, 0.15);
    box(b, 'basketBack', red, 0.44, 0.2, 0.012, 0, 0.1, -0.15);
    box(b, 'basketL', red, 0.012, 0.2, 0.3, -0.21, 0.1, 0);
    box(b, 'basketR', red, 0.012, 0.2, 0.3, 0.21, 0.1, 0);
  }
  rod(props, rubber, 0.008, new THREE.Vector3(-1.01, 0.42, -0.55), new THREE.Vector3(-1.01, 0.5, -0.55));
  rod(props, rubber, 0.008, new THREE.Vector3(-0.75, 0.42, -0.55), new THREE.Vector3(-0.75, 0.5, -0.55));
  rod(props, rubber, 0.008, new THREE.Vector3(-1.01, 0.5, -0.55), new THREE.Vector3(-0.75, 0.5, -0.55));

  // Chalkboard A-frame "Weekly Specials" sign.
  const board = new THREE.Group();
  board.position.set(-1.35, 0, -1.0);
  board.rotation.y = 0.35;
  props.add(board);
  const boardMat = new THREE.MeshStandardMaterial({ map: TEX.specialsBoard(), roughness: 0.9, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75), boardMat);
    face.position.set(0, 0.37, side * 0.1);
    face.rotation.x = side * 0.18;
    face.rotation.y = side > 0 ? 0 : Math.PI;
    face.castShadow = true;
    board.add(face);
  }

  // Two nested shopping carts.
  for (let i = 0; i < 2; i++) props.add(shoppingCart(1.55 - i * 0.18, -1.1, Math.PI / 2 + 0.1, chrome, red, rubber));

  // NOW HIRING sign taped inside the left window, facing the street.
  texturedPlane(scene, TEX.hiringSign(), 0.3, 0.225, -0.75, 1.0, -0.062, true).name = 'hiringSign';
}

function shoppingCart(x, z, rotY, chrome, red, rubber) {
  const cart = new THREE.Group();
  cart.position.set(x, 0, z);
  cart.rotation.y = rotY;
  const L = 0.85, W = 0.5;
  // wire basket: thin frame bars
  for (const y of [0.55, 0.95]) {
    box(cart, 'cartRail', chrome, L, 0.012, 0.012, 0, y, W / 2);
    box(cart, 'cartRail', chrome, L, 0.012, 0.012, 0, y, -W / 2);
    box(cart, 'cartRail', chrome, 0.012, 0.012, W, -L / 2, y, 0);
    box(cart, 'cartRail', chrome, 0.012, 0.012, W, L / 2, y, 0);
  }
  for (let i = 0; i <= 8; i++) {
    const px = -L / 2 + (i * L) / 8;
    box(cart, 'cartWire', chrome, 0.006, 0.4, 0.006, px, 0.75, W / 2);
    box(cart, 'cartWire', chrome, 0.006, 0.4, 0.006, px, 0.75, -W / 2);
  }
  box(cart, 'cartFloor', chrome, L, 0.01, W, 0, 0.55, 0);
  // handle with red grip
  rod(cart, red, 0.016, new THREE.Vector3(-L / 2 - 0.12, 1.02, -W / 2), new THREE.Vector3(-L / 2 - 0.12, 1.02, W / 2));
  rod(cart, chrome, 0.01, new THREE.Vector3(-L / 2, 0.95, -W / 2 + 0.02), new THREE.Vector3(-L / 2 - 0.12, 1.02, -W / 2 + 0.02));
  rod(cart, chrome, 0.01, new THREE.Vector3(-L / 2, 0.95, W / 2 - 0.02), new THREE.Vector3(-L / 2 - 0.12, 1.02, W / 2 - 0.02));
  // legs + wheels
  for (const [lx, lz] of [[-L / 2, -W / 2 + 0.05], [-L / 2, W / 2 - 0.05], [L / 2 - 0.05, -W / 2 + 0.1], [L / 2 - 0.05, W / 2 - 0.1]]) {
    rod(cart, chrome, 0.009, new THREE.Vector3(lx, 0.55, lz), new THREE.Vector3(lx, 0.07, lz));
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), rubber);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(lx, 0.05, lz);
    cart.add(wheel);
  }
  cart.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return cart;
}

function buildStorefrontFrame(scene, parts) {
  // Clear anodized aluminum framing, 2" face x 4-1/2" deep, sitting in the opening.
  const frame = new THREE.Group();
  frame.name = 'storefrontFrame';
  scene.add(frame);
  const z = -0.055, d = 0.11, f = 0.05; // depth center, depth, face width
  const jambX = DOOR.width / 2 + f / 2;   // the two door jambs

  box(frame, 'perimeterLeft', MAT.aluminum, f, 3.05, d, -2.225, 1.525, z);
  box(frame, 'perimeterRight', MAT.aluminum, f, 3.05, d, 2.225, 1.525, z);
  box(frame, 'perimeterHead', MAT.aluminum, 4.5, f, d, 0, 3.025, z);
  box(frame, 'hingeJamb', MAT.aluminum, f, 3.05, d, -jambX, 1.525, z);
  box(frame, 'strikeJamb', MAT.aluminum, f, 3.05, d, jambX, 1.525, z);
  box(frame, 'mullionLeft', MAT.aluminum, f, 3.05, d, -1.35, 1.525, z);
  box(frame, 'mullionRight', MAT.aluminum, f, 3.05, d, 1.35, 1.525, z);
  box(frame, 'doorHeader', MAT.aluminum, 4.4, f, d, 0, DOOR.height + f / 2, z); // transom bar

  // Sidelights: bronze kick panel at the bottom, glass above, glass transoms over everything.
  const bays = [[-2.2, -1.375], [-1.325, -0.507], [0.507, 1.325], [1.375, 2.2]];
  for (const [x0, x1] of bays) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    if (x0 === 0.507) {
      // Solid panel right of the door: the access control box mounts here.
      box(frame, 'infillPanel', MAT.infill, w, DOOR.height, 0.03, cx, DOOR.height / 2, -0.02);
      continue;
    }
    box(frame, 'kickPanel', MAT.aluminum, w, 0.3, 0.02, cx, 0.15, z);
    box(frame, 'sidelightRail', MAT.aluminum, w, f, d, cx, 0.3 + f / 2, z);
    glassPane(frame, w, DOOR.height - 0.35, cx, (0.35 + DOOR.height) / 2, z);
  }
  for (const [x0, x1] of [[-2.2, -1.375], [-1.325, -0.507], [-0.457, 0.457], [0.507, 1.325], [1.375, 2.2]]) {
    glassPane(frame, x1 - x0, 3.0 - (DOOR.height + f), (x0 + x1) / 2, (DOOR.height + f + 3.0) / 2, z);
  }

  box(frame, 'threshold', MAT.stainless, DOOR.width + 0.1, 0.012, 0.16, 0, 0.006, -0.05);
}

function buildDoor(scene, parts) {
  // The door leaf is a Group whose origin is ON THE HINGE LINE, so in Phase 2
  // swinging the door is just: doorLeaf.rotation.y = -angle.
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  leaf.position.set(DOOR.hingeX, 0, 0);
  scene.add(leaf);
  parts.doorLeaf = leaf;

  const { width: W, height: H, thickness: T } = DOOR;
  const zc = -T / 2; // the leaf's outside face is flush with the frame face at z = 0
  const stile = 0.1, topRail = 0.1, bottomRail = 0.25;

  box(leaf, 'hingeStile', MAT.aluminum, stile, H, T, stile / 2, H / 2, zc);
  box(leaf, 'latchStile', MAT.aluminum, stile, H, T, W - stile / 2, H / 2, zc);
  box(leaf, 'topRail', MAT.aluminum, W - 2 * stile, topRail, T, W / 2, H - topRail / 2, zc);
  box(leaf, 'bottomRail', MAT.aluminum, W - 2 * stile, bottomRail, T, W / 2, bottomRail / 2, zc);
  const glassH = H - topRail - bottomRail;
  glassPane(leaf, W - 2 * stile, glassH, W / 2, bottomRail + glassH / 2, zc);

  const decal = texturedPlane(leaf, TEX.doorDecal(), 0.5, 0.25, W / 2, 1.62, 0.002, true);
  decal.material.toneMapped = true;
  decal.material.opacity = 0.92;

  // Exterior offset pull handle near the latch edge.
  const pullX = W - 0.12;
  rod(leaf, MAT.stainless, 0.014, new THREE.Vector3(pullX, 0.88, 0.07), new THREE.Vector3(pullX, 1.28, 0.07));
  rod(leaf, MAT.stainless, 0.01, new THREE.Vector3(pullX, 0.94, 0.0), new THREE.Vector3(pullX, 0.94, 0.07));
  rod(leaf, MAT.stainless, 0.01, new THREE.Vector3(pullX, 1.22, 0.0), new THREE.Vector3(pullX, 1.22, 0.07));

  // Key cylinder for the exit device's outside trim.
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 20), MAT.stainless);
  cyl.rotation.x = Math.PI / 2;
  cyl.position.set(W - stile / 2, 1.06, 0.006);
  leaf.add(cyl);
}

function buildHardware(scene, parts) {
  const leaf = parts.doorLeaf;
  const { width: W, height: H, thickness: T } = DOOR;

  if (HAS_OPERATOR) buildOperator(scene, parts);
  else buildCloser(scene, parts);

  // --- PANIC DEVICE: touchpad-style rim exit device on the INSIDE (push side), seen
  // through the glass. Hinge end -> latch end: end cap, rail with the push pad, mechanism case,
  // rim latch bolt that catches in the strike.
  const panic = new THREE.Group();
  panic.name = 'panicDevice';
  leaf.add(panic);
  const satin = new THREE.MeshStandardMaterial({ color: 0xc6c9cc, metalness: 0.6, roughness: 0.38 });
  const y = 1.0, face = -T;          // device centerline height, inside face of the door
  box(panic, 'panicEndCap', satin, 0.06, 0.08, 0.052, 0.09, y, face - 0.026);
  box(panic, 'panicRail', satin, 0.56, 0.068, 0.04, 0.4, y, face - 0.02);
  box(panic, 'panicRailGap', MAT.black, 0.5, 0.054, 0.004, 0.43, y, face - 0.041);   // shadow line around the pad
  const pad = box(panic, 'panicPushPad', satin, 0.48, 0.046, 0.016, 0.43, y, face - 0.047);
  const caseCover = box(panic, 'panicCase', satin, 0.23, 0.086, 0.062, 0.795, y, face - 0.031);
  const seam = box(panic, 'panicCaseSeam', MAT.black, 0.004, 0.08, 0.002, 0.685, y, face - 0.0625);
  // What's under the cover (shown when the tech takes it off during a repair).
  const inner = new THREE.Group();
  inner.name = 'panicInner';
  inner.visible = false;
  panic.add(inner);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8913a, metalness: 0.7, roughness: 0.35 });
  box(inner, 'panicChassis', MAT.black, 0.22, 0.08, 0.02, 0.795, y, face - 0.01);
  box(inner, 'panicRetractor', brass, 0.12, 0.022, 0.03, 0.78, y + 0.012, face - 0.035);
  box(inner, 'panicSpring', MAT.stainless, 0.07, 0.012, 0.02, 0.86, y - 0.02, face - 0.03);
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 18), brass);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0.72, y - 0.01, face - 0.035);
  inner.add(cam);
  box(inner, 'panicAdjustScrew', MAT.black, 0.01, 0.01, 0.012, 0.86, y + 0.02, face - 0.048);
  parts.panicCover = [caseCover, seam];
  parts.panicInner = inner;
  box(panic, 'panicLatchBolt', MAT.stainless, 0.03, 0.028, 0.026, 0.915, y, face - 0.03);
  const dogging = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 10), MAT.black);
  dogging.rotation.x = Math.PI / 2;
  dogging.position.set(0.67, y - 0.012, face - 0.056);
  panic.add(dogging);                 // hex dogging hole at the end of the pad
  parts.panicDevice = panic;
  parts.panicPad = pad;

  // --- ELECTRIC STRIKE: on the inside face of the strike jamb, where the latch catches.
  const strike = new THREE.Group();
  strike.name = 'electricStrike';
  scene.add(strike);
  const jambX = W / 2 + 0.025;
  box(strike, 'strikeBody', MAT.black, 0.05, 0.17, 0.02, jambX, 1.0, -0.12);
  artPlane(strike, 'strike.png', 0.2 * 387 / 1152, 0.2, jambX, 1.0, -0.131, true).name = 'strikeArt';
  parts.electricStrike = strike;

  // --- DOOR ALIGNMENT: four butt hinges on the hinge jamb + the gaps around the leaf.
  const hinge = new THREE.Group();
  hinge.name = 'doorAlignment';
  scene.add(hinge);
  parts.hingeDoorLeaves = [];
  for (const y of [0.25, 0.8, 1.35, 1.9]) {
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 14), MAT.stainless);
    knuckle.position.set(DOOR.hingeX, y, 0.009);
    knuckle.castShadow = true;
    hinge.add(knuckle);
    box(hinge, 'hingeFrameLeaf', MAT.stainless, 0.03, 0.1, 0.003, DOOR.hingeX - 0.018, y, 0.002);
    parts.hingeDoorLeaves.push(box(leaf, 'hingeDoorLeaf', MAT.stainless, 0.03, 0.1, 0.003, 0.018, y, 0.002));
  }
  parts.doorAlignment = hinge;

  // --- ACCESS CONTROL PANEL: controller board + power supply INSIDE, on the solid panel
  // beside the door, with conduit up into the header. A card reader outside on the same
  // panel is the street side of the system.
  const acp = new THREE.Group();
  acp.name = 'accessPanel';
  scene.add(acp);
  const boxX = 0.8, boxY = 1.62, boxW = 0.3, boxH = 0.3 * 894 / 768;
  const wallIn = -0.035; // inside face of the solid panel
  // (the picture is turned to face into the store, so its box side lands at +x)
  box(acp, 'acpEnclosure', MAT.black, boxW * 0.62, boxH * 0.96, 0.03, boxX + boxW * 0.17, boxY, wallIn - 0.015);
  artPlane(acp, 'control-box.png', boxW, boxH, boxX, boxY, wallIn - 0.031, true).name = 'acpArt';
  for (const dx of [0.08, 0.04]) { // conduit running up into the header
    const top = new THREE.Vector3(boxX + dx, DOOR.height, wallIn - 0.015);
    rod(acp, MAT.stainless, 0.009, new THREE.Vector3(boxX + dx, boxY + boxH / 2 - 0.02, wallIn - 0.015), top);
  }
  parts.accessPanel = acp;
  // The card reader is its own part so the tech can inspect it from the sidewalk.
  const reader = new THREE.Group();
  reader.name = 'cardReader';
  scene.add(reader);
  box(reader, 'cardReaderBody', MAT.black, 0.045, 0.12, 0.02, 0.62, 1.15, 0.005);
  const led = box(reader, 'cardReaderLED', new THREE.MeshBasicMaterial({ color: 0xff3030 }),
    0.01, 0.01, 0.004, 0.62, 1.195, 0.016);
  led.castShadow = false;
  parts.cardReader = reader;
  parts.cardReaderLED = led;

  if (SITE.activation === 'pushPlate') buildPushPlates(scene, parts);
  if (SITE.activation === 'sensor') buildSensors(scene, parts);
}

// --- ADA PUSH PLATES: one outside on a bollard (clear of the door swing),
// one inside on the solid panel beside the door.
function buildPushPlates(scene, parts) {
  const ada = new THREE.Group();
  ada.name = 'adaPushPlate';
  scene.add(ada);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.05, 24), MAT.stainless);
  post.position.set(0.72, 0.525, 0.5);
  post.castShadow = true;
  ada.add(post);
  box(ada, 'adaBacker', MAT.stainless, 0.13, 0.13, 0.01, 0.72, 0.92, 0.5 + 0.058);
  artPlane(ada, 'ada-plate.png', 0.15, 0.15, 0.72, 0.92, 0.5 + 0.064).name = 'adaArt';
  parts.adaPushPlate = ada;

  const adaIn = new THREE.Group();
  adaIn.name = 'adaPushPlateInside';
  scene.add(adaIn);
  box(adaIn, 'adaInBacker', MAT.stainless, 0.13, 0.13, 0.012, 0.66, 0.95, -0.042);
  artPlane(adaIn, 'ada-plate.png', 0.15, 0.15, 0.66, 0.95, -0.049, true).name = 'adaInArt';
  parts.adaPushPlateInside = adaIn;
}

// --- MOTION SENSORS (full automatic door): one on the header outside, one inside.
function buildSensors(scene, parts) {
  const sensors = new THREE.Group();
  sensors.name = 'activationSensor';
  scene.add(sensors);
  const lens = new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.15 });
  const y = DOOR.height + 0.09;
  box(sensors, 'sensorOut', MAT.black, 0.26, 0.06, 0.07, 0, y, 0.035);
  box(sensors, 'sensorOutLens', lens, 0.2, 0.03, 0.004, 0, y - 0.005, 0.071);
  box(sensors, 'sensorIn', MAT.black, 0.26, 0.06, 0.07, 0.1, DOOR.height + 0.27, -0.29);
  box(sensors, 'sensorInLens', lens, 0.2, 0.03, 0.004, 0.1, DOOR.height + 0.265, -0.326);
  parts.activationSensor = sensors;
}

// --- REGULAR CLOSER (no operator): parallel-arm closer on the INSIDE (push side) of the
// door's top rail, arm to a shoe on the inside of the frame.
function buildCloser(scene, parts) {
  const leaf = parts.doorLeaf;
  const H = DOOR.height, T = DOOR.thickness;
  const closer = new THREE.Group();
  closer.name = 'doorCloser';
  leaf.add(closer);
  box(closer, 'closerBody', MAT.closer, 0.29, 0.07, 0.06, 0.27, H - 0.06, -T - 0.032);
  artPlane(closer, 'closer-body.png', 0.31, 0.31 * 279 / 1024, 0.27, H - 0.057, -T - 0.0625, true).name = 'closerArt';
  parts.doorCloser = closer;

  // Oil drips on the floor under the closer (only shown when the closer is leaking).
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a140c, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 }));
  oil.rotation.x = -Math.PI / 2;
  oil.scale.set(1.4, 0.8, 1);
  oil.position.set(DOOR.hingeX + 0.3, 0.006, -0.35);
  oil.visible = false;
  scene.add(oil);
  parts.oilStain = oil;

  // Arm: spindle (on the closer, moves with the door) -> elbow -> shoe (fixed on the frame).
  const armY = H - 0.012;
  const spindleLocal = new THREE.Vector3(0.17, armY, -T - 0.04);
  const elbow = new THREE.Vector3(DOOR.hingeX + 0.4, armY, -0.42);
  const shoe = new THREE.Vector3(DOOR.hingeX + 0.62, armY + 0.04, -0.125);
  const arm = new THREE.Group();
  arm.name = 'closerArm';
  scene.add(arm);
  box(arm, 'closerShoe', MAT.closer, 0.08, 0.035, 0.02, shoe.x, shoe.y, -0.122);
  parts.arm = makeArm(arm, { spindleOnDoor: true, spindleLocal, fixed: shoe, elbow, leaf });
}

// --- OPERATOR (push plates or sensors): low-energy push-side operator on the INSIDE face
// of the frame header, with a push arm down to a shoe on the door's inside top rail. It opens the door on a push-plate
// signal and closes it like a closer when the signal ends.
function buildOperator(scene, parts) {
  const leaf = parts.doorLeaf;
  const H = DOOR.height, T = DOOR.thickness;
  const op = new THREE.Group();
  op.name = 'doorOperator';
  scene.add(op);
  const opW = 0.74, opH = 0.13, opD = 0.13;
  const cx = DOOR.hingeX + 0.04 + opW / 2, cy = H + 0.03 + opH / 2;
  const back = -0.11;               // inside face of the frame
  const cz = back - opD / 2, front = back - opD;
  box(op, 'operatorHousing', MAT.closer, opW, opH, opD, cx, cy, cz);
  box(op, 'operatorCapL', MAT.aluminum, 0.02, opH + 0.008, opD + 0.006, cx - opW / 2, cy, cz);
  box(op, 'operatorCapR', MAT.aluminum, 0.02, opH + 0.008, opD + 0.006, cx + opW / 2, cy, cz);
  box(op, 'operatorTrim', MAT.aluminum, opW - 0.02, 0.012, 0.004, cx, cy - opH / 2 + 0.018, front - 0.001);
  // small power switch + status LED near the end cap (faces into the store)
  box(op, 'operatorSwitch', MAT.black, 0.018, 0.03, 0.008, cx - opW / 2 + 0.05, cy + 0.02, front - 0.003);
  const led = box(op, 'operatorLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }),
    0.008, 0.008, 0.004, cx - opW / 2 + 0.05, cy - 0.015, front - 0.003);
  led.castShadow = false;
  parts.doorOperator = op;
  parts.operatorLED = led;

  // Arm: spindle (fixed under the operator) -> elbow -> shoe (on the door, moves with it).
  const spindle = new THREE.Vector3(DOOR.hingeX + 0.17, H + 0.012, -0.19);
  const elbow = new THREE.Vector3(DOOR.hingeX + 0.2, H - 0.005, -0.5);
  const shoeLocal = new THREE.Vector3(0.56, H - 0.03, -T - 0.02);
  const arm = new THREE.Group();
  arm.name = 'operatorArm';
  scene.add(arm);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 20), MAT.closer);
  hub.position.copy(spindle);
  arm.add(hub);
  box(leaf, 'operatorShoe', MAT.closer, 0.08, 0.03, 0.02, shoeLocal.x, shoeLocal.y, -T - 0.012);
  parts.arm = makeArm(arm, { spindleOnDoor: false, fixed: spindle, doorLocal: shoeLocal, elbow, leaf });
}

// Two-bar arm between a point on the door and a point on the frame.
function makeArm(group, { spindleOnDoor, spindleLocal, doorLocal, fixed, elbow, leaf }) {
  const doorPointLocal = spindleOnDoor ? spindleLocal : doorLocal;
  const doorPoint = doorPointLocal.clone().add(leaf.position);
  const spindle = spindleOnDoor ? doorPoint : fixed;
  const shoe = spindleOnDoor ? fixed : doorPoint;
  const mainArm = rod(group, MAT.closer, 0.011, spindle, elbow);
  const forearm = rod(group, MAT.closer, 0.008, elbow, shoe);
  return {
    mainArm, forearm, spindleOnDoor, doorPointLocal, fixed: fixed.clone(),
    mainLen: spindle.distanceTo(elbow),
    foreLen: elbow.distanceTo(shoe),
  };
}

// Re-aim the closer/operator arm after the door moves. The main arm swings from the
// spindle and the forearm from the shoe; the elbow is where two circles (one per arm
// length) cross, picking the crossing that bends INTO the store (-z), where the arm is mounted.
const _doorPoint = new THREE.Vector3();
const _elbow = new THREE.Vector3();
export function updateArm(parts) {
  const arm = parts.arm;
  if (!arm) return;
  parts.doorLeaf.updateMatrixWorld();
  _doorPoint.copy(arm.doorPointLocal).applyMatrix4(parts.doorLeaf.matrixWorld);
  const s = arm.spindleOnDoor ? _doorPoint : arm.fixed;
  const f = arm.spindleOnDoor ? arm.fixed : _doorPoint;
  const dx = f.x - s.x, dz = f.z - s.z;
  const d = Math.min(Math.hypot(dx, dz), arm.mainLen + arm.foreLen - 1e-4);
  const a = (arm.mainLen ** 2 - arm.foreLen ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, arm.mainLen ** 2 - a * a));
  const mx = s.x + (a * dx) / d, mz = s.z + (a * dz) / d;
  const e1x = mx + (h * dz) / d, e1z = mz - (h * dx) / d;
  const e2x = mx - (h * dz) / d, e2z = mz + (h * dx) / d;
  const ey = (s.y + f.y) / 2;
  if (e1z < e2z) _elbow.set(e1x, ey, e1z); else _elbow.set(e2x, ey, e2z);
  setRod(arm.mainArm, s, _elbow);
  setRod(arm.forearm, _elbow, f);
}
