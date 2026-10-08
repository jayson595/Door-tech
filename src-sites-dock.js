// sites/dock.js — BUILDING 03: Ironside Logistics, loading dock.
//
// A ROLLING STEEL door (steel slats that roll up onto a barrel in the hood) driven by a motor
// operator, with PHOTO EYES across the opening that reverse the door if something is in the
// way. The barrel holds torsion SPRINGS: a tech never touches those alone. Beside it, a hollow
// metal MAN DOOR on butt hinges. New here: LOCKOUT before working on the big door.
//
// Faults:
//   eyes     receiver eye knocked out of line -> door comes down a foot, then reverses
//   guide    forklift bent the right guide -> door comes down crooked and hangs up
//   limit    down limit set too high -> door stops short of the floor, leaving a gap
//   stopButton STOP contact on the wall control burnt out -> STOP does nothing (safety)
//   chain    drive chain stretched slack -> jumps the sprocket, door stalls partway up
//   seal     bottom astragal torn off one end -> door closes, but rain runs in under it
// (The man door is scenery: dock calls are all about the rolling door.)

import * as THREE from 'three';
import { MAT, box } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { forklift2 as forklift, boxTruck2 as boxTruck } from './src-vehicles2.js';

const BIG_W = 2.6, BIG_H = 2.8;       // rolling door opening
const MAN = { hingeX: -2.35, width: 0.914, height: 2.134 };
const ROLL_SPEED = 0.26;              // fraction of full travel per second
const GUIDE_X = BIG_W / 2 + 0.02;      // guide centerline (pulled a bit into the opening)
const HANG_AT = 0.16;                 // where a bent guide catches the curtain
const REVERSE_AT = 0.72;
const STALL_AT = 0.55;                // slack chain: where it jumps the sprocket on the way up
const LIMIT_STEP = 0.022;             // each click of the down limit = about 2.5" of curtain              // misaligned eyes: the door gets this far down, then reverses

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- the 3D building
function build(scene, parts) {
  const ribs = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#8b98a4'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = '#76838f'; g.fillRect(x, 0, 6, h); g.fillStyle = '#a3afba'; g.fillRect(x + 6, 0, 3, h); }
  });
  ribs.wrapS = ribs.wrapT = THREE.RepeatWrapping;
  const wallMat = (w, h) => {
    const t = ribs.clone(); t.needsUpdate = true; t.repeat.set(w / 1.2, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, metalness: 0.35 });
  };
  const T = 0.25, z = -T / 2;
  const L = MAN.hingeX, R = MAN.hingeX + MAN.width;  // man door opening
  box(scene, 'wallFarLeft', wallMat(6, 5), 6 + L, 5, T, (-6 + L) / 2, 2.5, z);
  box(scene, 'wallBetween', wallMat(0.2, 5), -BIG_W / 2 - R, 5, T, (R - BIG_W / 2) / 2, 2.5, z);
  box(scene, 'wallRight', wallMat(5, 5), 6 - BIG_W / 2, 5, T, (6 + BIG_W / 2) / 2, 2.5, z);
  box(scene, 'wallOverBig', wallMat(BIG_W, 2.2), BIG_W, 5 - BIG_H, T, 0, (5 + BIG_H) / 2, z);
  box(scene, 'wallOverMan', wallMat(1, 2.9), MAN.width, 5 - MAN.height, T, (L + R) / 2, (5 + MAN.height) / 2, z);
  box(scene, 'roofEdge', new THREE.MeshStandardMaterial({ color: 0x4e5964, roughness: 0.6 }), 12.2, 0.2, 0.4, 0, 5.1, -0.05);

  const signTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1c2026'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5b301'; g.font = 'bold 70px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('DOCK 3', w / 2, h / 2 + 3);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
  sign.position.set(0, BIG_H + 0.55, 0.006);
  scene.add(sign);
  const warnTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f5b301'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.font = 'bold 60px Arial, sans-serif'; g.textAlign = 'center';
    g.fillText('WARNING', w / 2, 90);
    g.font = 'bold 36px Arial, sans-serif';
    g.fillText('DOOR MAY MOVE', w / 2, 150);
    g.fillText('WITHOUT NOTICE', w / 2, 200);
  });
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: warnTex, roughness: 0.6 }));
  warn.position.set(BIG_W / 2 + 0.55, 1.7, 0.006);
  scene.add(warn);
  // yellow bollards protecting the opening
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf5b301, roughness: 0.5 });
  for (const x of [BIG_W / 2 + 0.25]) { // (none on the left: it would block the man door)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 18), yellow);
    b.position.set(x, 0.55, 0.45);
    b.castShadow = true;
    scene.add(b);
  }

  // --- inside: warehouse floor, racks, lights
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x9a9993, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, -5.1);
  floor.receiveShadow = true;
  scene.add(floor);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 9), new THREE.MeshBasicMaterial({ color: 0xd9b23a }));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(-BIG_W / 2 - 0.1, 0.003, -5);
  scene.add(lane);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: 0x5e636a }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 5, -5.1);
  scene.add(ceiling);
  const blueRack = new THREE.MeshStandardMaterial({ color: 0x1f5fa8, roughness: 0.5 });
  const orangeBeam = new THREE.MeshStandardMaterial({ color: 0xe06b1f, roughness: 0.5 });
  const cardboard = new THREE.MeshStandardMaterial({ color: 0xa98457, roughness: 0.9 });
  for (const rx of [-3.6, 3.6]) {
    for (const dz of [-1.5, -3.5]) for (const dx of [-1, 1]) box(scene, 'rackPost', blueRack, 0.08, 4, 0.08, rx + dx, 2, dz);
    for (const y of [0.1, 1.5, 2.9]) {
      box(scene, 'rackBeam', orangeBeam, 2.1, 0.1, 0.08, rx, y, -1.5);
      box(scene, 'rackBeam', orangeBeam, 2.1, 0.1, 0.08, rx, y, -3.5);
      for (const bx of [-0.55, 0.5]) box(scene, 'pallet', cardboard, 0.9, 0.9, 1.6, rx + bx, y + 0.5, -2.5);
    }
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff7e0 });
  for (const lx of [-2.5, 2.5]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.4), lightMat);
    l.rotation.x = Math.PI / 2;
    l.position.set(lx, 4.95, -2.5);
    scene.add(l);
  }
  const glow = new THREE.PointLight(0xfff1d6, 3.5, 9, 1.4);
  glow.position.set(0, 3.8, -2.4);
  scene.add(glow);
  // a forklift working the racks, and a box truck parked out front at the next door down
  forklift(scene, { x: 2.3, z: -3.1, rotY: 2.3 });
  boxTruck(scene, { x: 5.4, z: 4.1, rotY: -Math.PI / 2 });
  // a pallet jack parked inside (the likely culprit for the bumped eye)
  const jack = new THREE.Group();
  jack.position.set(1.0, 0, -1.6);
  jack.rotation.y = -0.6;
  scene.add(jack);
  const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  box(jack, 'forkL', red, 0.16, 0.06, 1.1, -0.2, 0.05, 0);
  box(jack, 'forkR', red, 0.16, 0.06, 1.1, 0.2, 0.05, 0);
  box(jack, 'jackBody', red, 0.6, 0.35, 0.22, 0, 0.2, -0.6);
  box(jack, 'jackHandle', MAT.black, 0.04, 1.0, 0.04, 0, 0.75, -0.75);

  // --- the rolling steel CURTAIN (doorLeaf): slats that roll up into the hood.
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const slats = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#b3bcc4'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { g.fillStyle = '#8e98a1'; g.fillRect(0, y, w, 5); g.fillStyle = '#cfd6dc'; g.fillRect(0, y + 5, w, 2); }
  });
  slats.wrapS = slats.wrapT = THREE.RepeatWrapping;
  slats.repeat.set(1, 3);
  const curtainMat = new THREE.MeshStandardMaterial({ map: slats, roughness: 0.55, metalness: 0.4 });
  const curtain = new THREE.Mesh(new THREE.BoxGeometry(BIG_W + 0.06, 1, 0.03), curtainMat);
  curtain.castShadow = true;
  curtain.position.z = -0.12;
  leaf.add(curtain);
  const bar = new THREE.Group(); // bottom bar (tilts when the curtain hangs up crooked)
  leaf.add(bar);
  box(bar, 'bottomBar', new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.5, roughness: 0.4 }), BIG_W + 0.06, 0.07, 0.06, 0, 0.035, -0.12);
  parts.astragal = box(bar, 'astragal', MAT.black, BIG_W, 0.025, 0.05, 0, 0.0125, -0.12);
  parts.curtain = curtain;
  // an invisible tap target over the whole opening, so the door can be tapped even when it's
  // rolled all the way up out of sight
  const tapZone = new THREE.Mesh(new THREE.PlaneGeometry(BIG_W, BIG_H), new THREE.MeshBasicMaterial());
  tapZone.position.set(0, BIG_H / 2, -0.1);
  tapZone.visible = false;
  tapZone.userData.seeThrough = true;
  leaf.add(tapZone);
  parts.bottomBar = bar;

  // --- GUIDES (side tracks) in the jambs. The right one has a lower section that can be bent.
  const guides = new THREE.Group();
  guides.name = 'guides';
  scene.add(guides);
  const steel = new THREE.MeshStandardMaterial({ color: 0x6f7881, metalness: 0.5, roughness: 0.45 });
  // The guides stand 15 mm proud of the wall's jamb faces (and run up into the header), so no
  // guide face sits in the same plane as a wall face: that's what made them flicker (z-fighting).
  const gx = GUIDE_X;
  box(guides, 'guideLeft', steel, 0.07, BIG_H + 0.1, 0.14, -gx, (BIG_H + 0.1) / 2, -0.12);
  box(guides, 'guideRightUpper', steel, 0.07, BIG_H - 0.8, 0.14, gx, 0.9 + (BIG_H - 0.8) / 2, -0.12);
  box(guides, 'guideRightLower', steel, 0.07, 0.9, 0.14, gx, 0.45, -0.12);
  const dent = box(guides, 'guideDent', new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.6 }), 0.012, 0.14, 0.1, gx - 0.042, 0.45, -0.08);
  dent.visible = false; // forklift paint scuff
  parts.guides = guides;
  parts.guideLower = guides.children[2];
  parts.guideDent = dent;

  // --- COIL HOOD + barrel with the torsion springs (inside, above the opening)
  const hood = new THREE.Group();
  hood.name = 'counterbalance';
  scene.add(hood);
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0x7c868f, metalness: 0.45, roughness: 0.45 });
  box(hood, 'hood', hoodMat, BIG_W + 0.4, 0.5, 0.5, 0, BIG_H + 0.28, -0.5);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({
    map: canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = '#f5b301'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8322a'; g.fillRect(0, 0, w, 40);
      g.fillStyle = '#fff'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('DANGER', w / 2, 30);
      g.fillStyle = '#111'; g.font = 'bold 30px Arial, sans-serif';
      g.fillText('SPRINGS UNDER', w / 2, 88); g.fillText('EXTREME TENSION', w / 2, 128);
    }) }));
  tag.position.set(-0.6, BIG_H + 0.28, -0.751);
  tag.rotation.y = Math.PI;
  hood.add(tag);
  parts.counterbalance = hood;

  // --- OPERATOR: motor + brake on the right end of the hood, chain down to the barrel
  const op = new THREE.Group();
  op.name = 'overheadOperator';
  scene.add(op);
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2c4e78, metalness: 0.3, roughness: 0.5 });
  box(op, 'operatorBox', motorMat, 0.4, 0.35, 0.3, BIG_W / 2 + 0.45, BIG_H + 0.2, -0.55);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 18), motorMat);
  motor.rotation.z = Math.PI / 2;
  motor.position.set(BIG_W / 2 + 0.45, BIG_H - 0.05, -0.55);
  op.add(motor);
  box(op, 'chainGuard', MAT.black, 0.04, 0.4, 0.12, BIG_W / 2 + 0.24, BIG_H + 0.15, -0.55);
  parts.overheadOperator = op;

  // --- WALL CONTROL station (OPEN / CLOSE / STOP) on the inside wall
  const wc = new THREE.Group();
  wc.name = 'wallControl';
  scene.add(wc);
  const wcx = BIG_W / 2 + 0.3, wcz = -T - 0.03; // right beside the opening, where the camera sees it
  box(wc, 'stationBox', new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6 }), 0.2, 0.34, 0.07, wcx, 1.35, wcz);
  const wcLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshBasicMaterial({
    map: canvasTex(320, 80, (g, w, h) => {
      g.fillStyle = '#f5b301'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#111'; g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('DOOR CONTROL', w / 2, h / 2 + 2);
    }), toneMapped: false }));
  wcLabel.position.set(wcx, 1.58, wcz - 0.001);
  wcLabel.rotation.y = Math.PI;
  wc.add(wcLabel);
  const btn = (color, y) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    b.rotation.x = Math.PI / 2;
    b.position.set(wcx, y, wcz - 0.045);
    wc.add(b);
  };
  btn(0x2e9e4f, 1.45); btn(0x222222, 1.35); btn(0xc0392b, 1.25);
  // lockout tag + padlock (shown while the door is locked out)
  const lock = new THREE.Group();
  lock.visible = false;
  wc.add(lock);
  box(lock, 'padlock', new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 }), 0.05, 0.06, 0.03, wcx + 0.1, 1.2, wcz - 0.04);
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), new THREE.MeshBasicMaterial({
    map: canvasTex(128, 224, (g, w, h) => {
      g.fillStyle = '#c0392b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = 'bold 26px Arial'; g.textAlign = 'center';
      g.fillText('DANGER', w / 2, 40); g.fillText('DO NOT', w / 2, 110); g.fillText('OPERATE', w / 2, 150);
    }) }));
  lt.position.set(wcx + 0.1, 1.08, wcz - 0.056);
  lt.rotation.y = Math.PI;
  lock.add(lt);
  parts.wallControl = wc;
  parts.lockout = lock;

  // --- PHOTO EYES at the bottom of the guides (inside), with the beam between them
  const eyes = new THREE.Group();
  eyes.name = 'photoEyes';
  scene.add(eyes);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.5 });
  const ex = gx + 0.02, ey = 0.18, ez = -0.275;
  box(eyes, 'eyeBracketL', MAT.stainless, 0.05, 0.12, 0.04, -ex, ey, ez);
  box(eyes, 'eyeSender', eyeMat, 0.06, 0.06, 0.08, -ex + 0.04, ey, ez);
  box(eyes, 'eyeBracketR', MAT.stainless, 0.05, 0.12, 0.04, ex, ey, ez);
  const rx = new THREE.Group();
  rx.position.set(ex - 0.04, ey, ez);
  eyes.add(rx);
  box(rx, 'eyeReceiver', eyeMat, 0.06, 0.06, 0.08, 0, 0, 0);
  const rxLed = box(rx, 'eyeLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.015, 0.015, 0.005, 0, 0.022, -0.042);
  rxLed.castShadow = false;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * ex - 0.14, 0.006, 0.006), new THREE.MeshBasicMaterial({
    color: 0xff3a2a, transparent: true, opacity: 0.55 }));
  beam.position.set(0, ey, ez);
  beam.userData.seeThrough = true;
  eyes.add(beam);
  parts.photoEyes = eyes;
  parts.eyeReceiver = rx;
  parts.eyeLED = rxLed;
  parts.eyeBeam = beam;

  // --- MAN DOOR: hollow metal on butt hinges, swings OUT. Its own leaf (not the big door).
  const man = new THREE.Group();
  man.name = 'manDoor';
  scene.add(man);
  const manLeaf = new THREE.Group();
  manLeaf.position.set(MAN.hingeX, 0, 0);
  man.add(manLeaf);
  const hm = new THREE.MeshStandardMaterial({ color: 0x4d5a66, roughness: 0.55, metalness: 0.3 });
  box(manLeaf, 'manLeaf', hm, MAN.width - 0.01, MAN.height - 0.01, 0.045, MAN.width / 2, MAN.height / 2, -0.03);
  box(manLeaf, 'manLite', new THREE.MeshStandardMaterial({ color: 0x9fb6c6, roughness: 0.15 }), 0.2, 0.3, 0.05, MAN.width / 2, 1.55, -0.03);
  box(manLeaf, 'leverRose', MAT.stainless, 0.06, 0.06, 0.01, MAN.width - 0.1, 1.0, 0.0);
  box(manLeaf, 'lever', MAT.stainless, 0.12, 0.018, 0.018, MAN.width - 0.14, 1.0, 0.025);
  for (const y of [0.25, 1.05, 1.9]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.11, 12), MAT.stainless);
    k.position.set(MAN.hingeX, y, 0.005);
    man.add(k);
  }
  box(man, 'manFrameHead', hm, MAN.width + 0.1, 0.05, 0.1, MAN.hingeX + MAN.width / 2, MAN.height + 0.025, -0.03);
  parts.manDoor = man;
  parts.manLeaf = manLeaf;
}

// ---------------------------------------------------------------- the doors
export class DockDoor {
  constructor(parts) {
    this.parts = parts;
    this.open = 0;          // big door: 0 closed .. 1 rolled all the way up
    this.state = 'closed';  // closed | operating | holding | closing | stuck
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;
    this.autoClose = false;
    this.obstruct = false;
    this.man = { angle: 0, state: 'closed', t: 0 };
    this.eyeAim = 0;        // receiver off by this many clicks (0 = lined up)
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  powerOpen() { this.toggle(); }
  cardRead() { this.toggle(); }
  // Tap on the curtain = press the wall control: up if it's down, down if it's up.
  tapPull() { this.toggle(); }

  toggle() {
    if (this.state === 'closed' || this.state === 'stuck' || this.state === 'closing') this.goUp();
    else if (this.state === 'holding' || this.state === 'stopped') this.goDown();
  }

  // STOP on the wall control: the door halts wherever it is.
  stop() {
    if (this.state !== 'operating' && this.state !== 'closing') return;
    if (this.fault === 'stopButton') {
      // burnt contact: the button goes down, nothing tells the operator
      SFX.noteTick();
      if (this.cycle) this.cycle.stopFailed = true;
      return;
    }
    SFX.clunk();
    this.autoClose = false;
    this.setState(this.open >= 1 ? 'holding' : 'stopped');
  }

  goUp() {
    if (this.open >= 1) return;
    SFX.operatorMotor(Math.max(0.6, (1 - this.open) / ROLL_SPEED));
    this.setState('operating');
  }

  goDown() {
    if (this.open <= 0 || this.state === 'closing') return;
    // misaligned eyes: the operator won't take a close command for long
    SFX.operatorMotor(1.2);
    this.setState('closing');
  }

  startCycle() {
    this.cycle = { t: 0, reachedTop: false, closedFully: false, reversed: false, hung: false,
      safetyStop: false, finished: false, gap: false, stopTest: false, stopped: false };
  }

  // TEST: open from the wall control, then close it.
  cycleBig() {
    this.autoClose = true;
    if (this.state === 'holding') { this.goDown(); return; }
    this.goUp();
  }

  // TEST: close with a pallet in the doorway: the eyes must reverse it.
  closeWithObstruction() {
    this.obstruct = true;
    this.autoClose = true;
    if (this.state === 'holding') this.goDown(); else this.goUp();
  }

  // TEST: run it up, then press STOP partway down: the door must halt, then close the rest of the way.
  stopTest() {
    if (this.cycle) this.cycle.stopTest = true;
    this.cycleBig();
  }

  // Where the door stops when closing: the floor, unless the down limit is set high.
  get closeStop() { return Math.max(0, this.limitGap || 0) * LIMIT_STEP; }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    if (this.fault === 'chain' && (this.state === 'operating' || this.state === 'closing')) {
      this.rattle = (this.rattle || 0) - dt;
      if (this.rattle <= 0) { SFX.scuff(); this.rattle = 0.3; } // slack chain slapping the guard
    }
    switch (this.state) {
      case 'operating':
        this.open = Math.min(1, this.open + ROLL_SPEED * dt);
        if (this.fault === 'chain' && this.open >= STALL_AT) {
          // under load the chain jumps the sprocket: motor hums, door just sits there
          SFX.clunk();
          this.open = STALL_AT;
          if (c) { c.stalled = true; c.finished = true; }
          this.autoClose = false;
          this.setState('stopped');
          break;
        }
        if (this.open >= 1) {
          if (c) c.reachedTop = true;
          this.setState('holding');
          if (this.autoClose) setTimeout(() => { if (this.state === 'holding') this.goDown(); }, 900);
        }
        break;
      case 'closing': {
        this.open = Math.max(0, this.open - ROLL_SPEED * dt);
        const beamBroken = this.obstruct && this.open < 0.5;
        const eyesBlind = this.fault === 'eyes' && this.open < REVERSE_AT;
        if (beamBroken || eyesBlind) {
          // the operator sees a blocked beam and reverses back up
          SFX.clunk();
          if (c) { if (beamBroken) c.safetyStop = true; else c.reversed = true; }
          this.obstruct = false;
          this.autoClose = false;
          this.setState('operating');
          if (c) setTimeout(() => { if (this.cycle === c) c.finished = true; }, 2500);
          break;
        }
        if (this.fault === 'guide' && this.open <= HANG_AT) {
          SFX.scrape(0.8);
          this.open = HANG_AT;
          if (c) { c.hung = true; c.finished = true; }
          this.autoClose = false;
          this.setState('stuck');
          break;
        }
        if (c && c.stopTest && !c.stopTried && this.open < 0.55) {
          // STOP pressed partway down
          c.stopTried = true;
          this.stop();
          c.stopped = this.state === 'stopped';
          if (c.stopped) setTimeout(() => { if (this.cycle === c) this.goDown(); }, 1200);
          break;
        }
        if (this.open <= this.closeStop) {
          if (this.closeStop > 0) {
            // the down limit trips early: the motor shuts off with the door still off the floor
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
            c.closedFully = !this.overtravel; c.slammed = !!this.overtravel; c.finished = true;
            if (this.fault === 'seal') c.leaky = true;
          }
          this.autoClose = false;
          this.setState('closed');
          if (this.onClosed) this.onClosed(0, 0);
        }
        break;
      }
    }
    this.updateMan(dt);
    this.apply();
  }

  updateMan(dt) {
    const m = this.man;
    if (m.state === 'opening') {
      m.angle = Math.min(80, m.angle + 160 * dt);
      if (m.angle >= 80) { m.state = 'closing'; }
    } else if (m.state === 'closing') {
      m.angle = Math.max(0, m.angle - 26 * dt);
      if (m.angle <= 0) {
        if (this.fault === 'manDoor') {
          // the sagging door's latch hits the strike lip and it bounces back open a crack
          SFX.clunk();
          m.angle = 3;
          m.state = 'ajar';
          if (this.cycle) { this.cycle.manLatched = false; this.cycle.manDone = true; }
        } else {
          SFX.latchClick(6);
          m.state = 'closed';
          if (this.cycle) { this.cycle.manLatched = true; this.cycle.manDone = true; }
        }
      }
    } else if (m.state === 'ajar') {
      m.t += dt;
      if (m.t > 2.5) { m.t = 0; m.angle = 0; m.state = 'closed'; } // someone slams it shut
    }
  }

  apply() {
    const p = this.parts;
    const visible = Math.max(0.001, 1 - this.open);
    p.curtain.scale.y = BIG_H * visible;
    p.curtain.position.y = BIG_H - (BIG_H * visible) / 2;
    p.curtain.material.map.repeat.set(1, 3 * visible);
    p.bottomBar.position.y = this.open * BIG_H;
    const crooked = this.fault === 'guide' && this.state === 'stuck';
    p.bottomBar.rotation.z = crooked ? 0.035 : 0;
    p.curtain.rotation.z = crooked ? 0.01 : 0;
    p.manLeaf.rotation.y = -this.man.angle * Math.PI / 180;
    this.angle = this.open * 90;
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// Line the receiver eye up (0 = beam made).
function aimEye(parts, off) {
  parts.eyeReceiver.rotation.y = off * 0.12;
  parts.eyeReceiver.rotation.x = off * 0.05;
  const ok = off === 0;
  parts.eyeLED.material.color.set(ok ? 0x33ff66 : 0xffb000);
  parts.eyeBeam.visible = ok;
}

// Torn astragal: the left end of the rubber is gone.
function tearSeal(parts, torn) {
  parts.astragal.scale.x = torn ? 0.62 : 1;
  parts.astragal.position.x = torn ? BIG_W * 0.19 : 0;
}

function bendGuide(parts, mm) {
  parts.guideLower.position.x = GUIDE_X - mm * 0.012;
  parts.guideDent.visible = mm > 0;
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });
const LOCKOUT_STEP = {
  type: 'choice', label: 'Before working on the big door', key: 'lockout',
  info: () => 'The door can move without warning. Kill the power and lock out the wall control first.',
  options: [{ label: 'LOCK OUT + TAG', value: true }, { label: 'SKIP IT', value: false }],
};
function lockoutResult(s, JOB) {
  if (s.lockout === false) {
    JOB.safetyIssues = (JOB.safetyIssues || 0) + 1;
    JOB.safetyNote = JOB.safetyNote ? `${JOB.safetyNote}, no lockout` : 'no lockout';
  }
}

const LIMIT_PROCEDURE = {
  title: 'Setting the down limit',
  start: (JOB) => ({ gap: JOB.limitGap }),
  steps: [
    { type: 'hold', label: 'Open the operator\'s limit box cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
    { type: 'look', label: 'Find the limit switches', button: 'LOOK',
      reveal: 'Two limit cams on the shaft: UP and DOWN. The DOWN cam trips the switch before the door reaches the floor.' },
    { type: 'nudge', label: 'Move the DOWN limit cam', key: 'gap', min: -2, max: 6, unit: 'clicks short',
      down: '▼ LOWER', up: 'RAISE ▲',
      info: (s) => (s.gap === 0 ? 'The bottom bar will just seat on the floor and the astragal will seal.'
        : s.gap > 0 ? `Door will still stop about ${Math.round(s.gap * 2.5)}" off the floor.`
        : 'Set too low: the motor will keep driving after the door hits the floor.') },
    { type: 'hold', label: 'Close the limit box cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
  ],
  finish(s) {
    const fixed = s.gap === 0;
    return { fixed, quality: fixed ? 100 : s.gap < 0 ? 35 : 45, parts: [] };
  },
};

const CHAIN_PROCEDURE = {
  title: 'Taking up the drive chain',
  start: (JOB) => ({ slack: JOB.chainSlack, lockout: null, lubed: null }),
  steps: [
    LOCKOUT_STEP,
    { type: 'hold', label: 'Take off the chain guard', tool: 'wrench', verb: 'REMOVE', count: 2 },
    { type: 'look', label: 'Look at the chain and sprockets', button: 'LOOK',
      reveal: 'The chain has stretched and hangs slack. The sprocket teeth are polished where it has been riding up and jumping.' },
    { type: 'hold', label: 'Loosen the motor mount bolts', tool: 'wrench', verb: 'LOOSEN', count: 2 },
    { type: 'nudge', label: 'Slide the motor to take up the slack', key: 'slack', min: -2, max: 5, unit: 'clicks slack',
      down: '◀ TIGHTER', up: 'LOOSER ▶',
      info: (s) => (s.slack === 0 ? 'About 1/2" of sag in the middle of the run. Just right.'
        : s.slack > 0 ? 'Still sloppy. It will jump the sprocket again under load.'
        : 'Drum tight. It will chew up the sprockets and the motor bearings.') },
    { type: 'choice', label: 'Lubricate the chain?', key: 'lubed',
      options: [{ label: 'LUBRICATE', tool: 'lubricant', value: true }, { label: 'SKIP', value: false }] },
    { type: 'hold', label: 'Tighten the mount and put the guard back', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
  ],
  finish(s, JOB) {
    lockoutResult(s, JOB);
    const fixed = s.slack === 0;
    return { fixed, quality: fixed ? (s.lubed ? 100 : 88) : s.slack < 0 ? 50 : 40, parts: [] };
  },
};

export default {
  id: 'dock',
  door: { place: 'Dock 3', desc: 'rolling steel door + hollow metal man door', customer: 'Ironside Logistics', level: 3 },
  framing: {
    arrival: { cx: -0.4, xHalf: 2.1, yMin: -0.25, yMax: 4.4 },
    work: { cx: 0.2, xHalf: 1.6, yMin: -0.1, yMax: 3.35 }, // just the rolling door and its door control
    inside: { cx: 0.35, xHalf: 1.85, yMin: -0.1, yMax: 3.4 }, // wider: the operator sits off to the side, above the door
  },
  build,
  restStates: ['closed', 'holding', 'stuck', 'stopped'], // the door is at rest (TEST DOOR can start) in these states
  Door: DockDoor,
  hints: {
    closed: 'Tap a part to select it · tap the door to run it up · drag to look around',
    holding: 'Tap the doorway, or press CLOSE on the wall control, to run it down',
    stopped: 'Door stopped. Tap it or use the wall control.',
    operating: 'Door rolling up…',
    closing: 'Door rolling down…',
    stuck: 'Door is hung up. Tap it to run it back up.',
  },

  components: {
    photoEyes: {
      label: 'Photo Eyes',
      blurb: 'Sender and receiver at the bottom of the guides. A broken beam reverses the door.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([1.3, 0.22, -0.27], [0.75, 0.62, -1.15]),
      hit: { center: [0, 0.18, -0.27], size: [BIG_W + 0.4, 0.22, 0.16] },
    },
    overheadOperator: {
      label: 'Door Operator',
      blurb: 'Motor, brake and the UP/DOWN limit switches on the end of the hood. Drives the barrel with a chain.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([1.7, 2.95, -0.55], [1.0, 2.4, -2.1]),
      hit: { center: [BIG_W / 2 + 0.4, BIG_H + 0.15, -0.55], size: [0.6, 0.6, 0.4] },
    },
    counterbalance: {
      label: 'Springs & Barrel',
      blurb: 'Torsion springs inside the barrel balance the curtain\'s weight. Hundreds of pounds of stored force.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'],
      danger: 'Springs hold enough force to kill. Adjusting them is a two-person job with winding bars and a spring crew. Not today.',
      focus: S([-0.2, 3.05, -0.5], [-0.4, 2.3, -2.4]),
      hit: { center: [-0.2, BIG_H + 0.28, -0.5], size: [BIG_W, 0.5, 0.5] },
    },
    wallControl: {
      label: 'Wall Control',
      blurb: 'OPEN, CLOSE and STOP buttons beside the door. Press them to run the big door.',
      side: 'in', actions: ['OPEN', 'CLOSE', 'STOP', 'INSPECT', 'REPLACE'],
      focus: S([1.55, 1.38, -0.3], [1.25, 1.5, -1.15]),
      hit: { center: [BIG_W / 2 + 0.3, 1.4, -0.3], size: [0.3, 0.6, 0.18] },
    },
    guides: {
      label: 'Guides (Side Tracks)',
      blurb: 'Steel channels the curtain rides up and down in. Forklifts love to hit them.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([1.3, 0.75, 0], [0.75, 1.1, 1.45]),
      hit: { center: [BIG_W / 2 + 0.035, 1.0, -0.05], size: [0.2, 2.0, 0.3] },
    },
    bottomBar: {
      label: 'Bottom Bar & Seal',
      blurb: 'Heavy bar along the bottom of the curtain, with a rubber astragal that seals against the floor.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([0, 0.15, -0.1], [0.35, 0.85, 1.35]),
      // rides along with the bar (up into the hood when the door is open)
      hit: { attach: 'bottomBar', center: [0, 0.04, -0.06], size: [BIG_W - 0.35, 0.14, 0.22] },
    },
  },

  clues: {
    photoEyes: {
      normal: ['Both eye brackets are tight.', 'Receiver LED is solid green: beam made.', 'Lenses are clean.'],
      eyes: [
        'The receiver bracket is bent down and twisted, like something low hit it.',
        'Receiver LED is amber and flickering: it can\'t see the sender.',
        'Lenses are clean.',
      ],
    },
    overheadOperator: {
      normal: ['Motor and brake work. Limits stop the door at the top and bottom.', 'Drive chain tension is good.', 'Controller log: no faults.'],
      eyes: ['Motor and brake work. Limits stop the door at the top and bottom.', 'Drive chain tension is good.', 'Controller log: "SAFETY EYE BLOCKED" on every close.'],
      guide: ['Motor strains near the bottom of the close.', 'Drive chain tension is good.', 'Controller log: "FORCE LIMIT - CLOSE".'],
      chain: [
        'Motor and brake work, but the drive chain hangs slack between the sprockets.',
        'Shiny, worn spots on the sprocket teeth where the chain has been jumping.',
        'Controller log: no faults. The motor runs the whole time the door is stalled.',
      ],
      stopButton: [
        'Motor and brake work. Limits stop the door at the top and bottom.',
        'Drive chain tension is good.',
        'Controller log: no STOP commands received, even right after someone pressed it.',
      ],
      limit: [
        'Motor and brake work. Drive chain tension is good.',
        'On a close, the motor shuts off with the bottom bar still several inches above the floor.',
        'Controller log: "DOWN LIMIT REACHED" on every close. No faults.',
      ],
    },
    counterbalance: {
      normal: [
        'Warning tag: SPRINGS UNDER EXTREME TENSION.',
        'With the operator disengaged, the curtain stays put halfway: springs are balanced.',
        'No broken coils visible at the barrel end.',
      ],
    },
    wallControl: {
      normal: ['OPEN, CLOSE and STOP all respond.', 'Station is mounted solid and the wiring is tight.'],
      stopButton: [
        'OPEN and CLOSE respond.',
        'STOP feels mushy: no click when you press it.',
        'Behind the STOP button, the contact block is cracked and scorched.',
      ],
    },
    bottomBar: {
      normal: ['Rubber astragal is soft and whole, end to end.', 'Closed, it squashes flat against the floor all the way across.'],
      seal: [
        'Rubber astragal is torn off the left end of the bar, flattened like a forklift ran over it.',
        'Closed, there\'s daylight under the left end. Water stains on the floor inside.',
        'Bottom bar itself is straight and level.',
      ],
      limit: ['Rubber astragal is soft and whole.', 'Closed, the whole bottom bar sits several inches off the floor.'],
      guide: ['Rubber astragal is fine.', 'Bottom bar comes down crooked: right side high.'],
    },
    guides: {
      normal: ['Both guides are straight and plumb, bolts tight.', 'Curtain rides centered in the guides.'],
      limit: ['Both guides are straight and plumb, bolts tight.', 'Curtain rides centered and comes down level, but never reaches the floor.'],
      guide: [
        'Right guide is dented in at knee height, with yellow forklift paint on it.',
        'The curtain\'s end locks drag in the right guide.',
        'Bottom bar comes down crooked: right side high.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      photoEyes: ['Multimeter: 24 VDC at the sender and the receiver. Power is fine.'],
      overheadOperator: ['Multimeter: 230 V at the motor, steady under load.'],
      wallControl: {
        normal: ['Multimeter: buttons switch cleanly.'],
        stopButton: ['Multimeter: OPEN and CLOSE switch cleanly. STOP never opens its circuit when pressed.'],
      },
    },
    level: {
      guides: {
        normal: ['Level: both guides are plumb.'],
        guide: ['Level: right guide is out of plumb about 3/8" at knee height.'],
      },
      overheadOperator: {
        normal: ['Level: the bottom bar sits flat on the floor when closed.'],
        limit: ['Level: the bottom bar is level, it just stops short of the floor all the way across.'],
      },
      bottomBar: {
        normal: ['Level: the bottom bar sits flat on the floor.'],
        limit: ['Level: bar is level, but stops short of the floor all the way across.'],
        seal: ['Level: the bar is level. The gap is only where the rubber is missing.'],
      },
    },
  },

  faults: {
    eyes: {
      name: 'Photo eye knocked out of line', part: 'photoEyes', doors: ['dock'],
      complaint: 'The dock door comes down about a foot, then pops right back up. We cannot close up for the night.',
    },
    guide: {
      name: 'Right guide bent by a forklift', part: 'guides', doors: ['dock'],
      complaint: 'The dock door comes down crooked. One side hits the floor first, then it gets stuck.',
    },
    limit: {
      name: 'Down limit set too high', part: 'overheadOperator', doors: ['dock'],
      complaint: 'The dock door stops before it hits the floor. There is a gap at the bottom and rain and critters get in.',
    },
    stopButton: {
      name: 'STOP button contact burnt out', part: 'wallControl', doors: ['dock'],
      priority: 'SAFETY', needsReplacing: true,
      complaint: 'A guy ducked under the dock door and somebody hit STOP. It just kept coming down. Nobody got hurt, this time.',
    },
    chain: {
      name: 'Drive chain slack, jumping the sprocket', part: 'overheadOperator', doors: ['dock'],
      complaint: 'The dock door clanks and jerks going up, then stops halfway. The motor keeps humming.',
    },
    seal: {
      name: 'Bottom seal torn', part: 'bottomBar', doors: ['dock'], needsReplacing: true,
      complaint: 'Every time it rains, water runs in under one end of the dock door and soaks the pallets.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.eyeOff = fault === 'eyes' ? 2 + Math.floor(Math.random() * 2) : 0;
    JOB.guideBend = fault === 'guide' ? 3 + Math.floor(Math.random() * 3) : 0;
    aimEye(door.parts, JOB.eyeOff);
    bendGuide(door.parts, JOB.guideBend);
    JOB.limitGap = fault === 'limit' ? 3 + Math.floor(Math.random() * 3) : 0;
    door.limitGap = JOB.limitGap;
    door.overtravel = false;
    JOB.chainSlack = fault === 'chain' ? 3 + Math.floor(Math.random() * 2) : 0;
    tearSeal(door.parts, fault === 'seal');
  },

  // Buttons that run the door instead of being tests or repairs.
  controls: {
    wallControl: {
      OPEN: { msg: 'OPEN pressed', run: (d) => d.goUp() },
      CLOSE: { msg: 'CLOSE pressed', run: (d) => d.goDown() },
      STOP: { msg: 'STOP pressed', run: (d) => d.stop() },
    },
  },

  tests: {
    photoEyes: { msg: 'Closing the door, watching the eyes', run: (d) => (d.state === 'holding' ? d.goDown() : d.cycleBig()) },
    overheadOperator: { msg: 'Running the door up and down', run: (d) => d.cycleBig() },
    wallControl: { msg: 'Pressed OPEN, then CLOSE', run: (d) => d.cycleBig() },
    guides: { msg: 'Running the door, watching the guides', run: (d) => d.cycleBig() },
    counterbalance: { msg: 'Operator disengaged, curtain pulled halfway by hand: it stays put. Balanced.', run: () => {} },
    bottomBar: { msg: 'Running the door down, watching the seal', run: (d) => (d.state === 'holding' ? d.goDown() : d.cycleBig()) },
  },

  checks: [
    ['opens', 'Rolls all the way up'],
    ['closes', 'Closes all the way down'],
    ['level', 'Comes down level'],
    ['seal', 'Seals along the floor'],
    ['safety', 'Reverses for an obstruction'],
    ['stop', 'STOP button halts the door'],
  ],
  testCycles: [
    { label: 'Run it up and down from the wall control', start: (d) => d.cycleBig(), done: (c) => c.finished || c.t > 40 },
    { label: 'Close with a pallet in the doorway', start: (d) => d.closeWithObstruction(),
      done: (c) => c.finished || c.t > 40 },
    { label: 'Press STOP partway down, then CLOSE', start: (d) => d.stopTest(),
      done: (c, d) => (c.stopped && (d.state === 'closed' || d.state === 'stuck')) || (c.finished && !c.stopped) || c.t > 45 },
  ],
  record(c, index) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.opens = c.reachedTop || (c.stalled ? false : null);
      r.closes = c.stalled ? null : c.closedFully;
      r.level = !c.hung;
      r.seal = c.closedFully ? !c.leaky : null;
      if (c.stalled) symptoms.push('Chain clattered and the door stalled partway up. The motor kept humming.');
      if (c.leaky) symptoms.push('Door closed, but daylight shows under one end of the bottom bar.');
      if (c.gap) symptoms.push('Door stopped several inches short of the floor, leaving a gap.');
      if (c.slammed) symptoms.push('Door drove hard into the floor and the operator strained.');
      if (c.reversed) symptoms.push('Door came down about a foot, then reversed back up on its own.');
      if (c.hung) symptoms.push('Door came down crooked and hung up a few inches off the floor.');
    }
    if (index === 1) {
      r.safety = c.safetyStop || c.reversed ? true : c.hung || c.stalled ? null : false;
      if (c.hung) { r.level = false; symptoms.push('Door came down crooked and hung up a few inches off the floor.'); }
    }
    if (index === 2) {
      r.stop = c.stopped ? true : c.stopFailed ? false : null;
      if (c.stopFailed) symptoms.push('STOP was pressed partway down, but the door kept rolling.');
      if (c.gap) { r.closes = false; symptoms.push('Door stopped several inches short of the floor, leaving a gap.'); }
    }
    return { r, symptoms };
  },

  procedures: {
    photoEyes: {
      title: 'Lining up the photo eyes',
      start: (JOB) => ({ aim: JOB.eyeOff }),
      steps: [
        { type: 'look', label: 'Check the receiver LED', button: 'LOOK',
          reveal: 'Receiver LED is amber: no beam. Its bracket is bent and twisted.' },
        { type: 'hold', label: 'Loosen the receiver bracket', tool: 'wrench', verb: 'LOOSEN', count: 1 },
        { type: 'nudge', label: 'Aim the receiver at the sender', key: 'aim', min: -3, max: 4, unit: 'clicks off',
          down: '◀ LEFT', up: 'RIGHT ▶',
          info: (s) => (s.aim === 0 ? 'LED solid green: beam made.'
            : Math.abs(s.aim) === 1 ? 'LED flickers green now and then. Almost.' : 'LED amber: no beam.'),
          apply: (s, parts) => aimEye(parts, s.aim) },
        { type: 'hold', label: 'Tighten the bracket', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
      ],
      finish(s) {
        return { fixed: s.aim === 0, quality: s.aim === 0 ? 100 : 45, parts: [] };
      },
    },
    guides: {
      title: 'Straightening the right guide',
      start: (JOB) => ({ bend: JOB.guideBend, lockout: null }),
      steps: [
        LOCKOUT_STEP,
        { type: 'hold', label: 'Loosen the guide bolts', tool: 'wrench', verb: 'LOOSEN', count: 2 },
        { type: 'nudge', label: 'Push the guide back out straight', key: 'bend', min: -2, max: 6, unit: 'mm bent in',
          down: '◀ STRAIGHTEN', up: 'BEND ▶',
          info: (s) => (s.bend === 0 ? 'Guide is straight. The curtain will ride clean.'
            : s.bend > 0 ? 'Still dented in. The end locks will drag.' : 'Pushed too far out. The curtain could pull out of the guide.'),
          apply: (s, parts) => bendGuide(parts, s.bend) },
        { type: 'hold', label: 'Check it with the level', tool: 'level', verb: 'CHECK PLUMB', count: 1 },
        { type: 'hold', label: 'Tighten the guide bolts', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
      ],
      finish(s, JOB) {
        lockoutResult(s, JOB);
        const fixed = s.bend === 0;
        return { fixed, quality: fixed ? 100 : 40, parts: [] };
      },
    },
    // the operator can be out two ways: pick the repair for this call's fault
    overheadOperator: (JOB) => (JOB.fault === 'chain' ? CHAIN_PROCEDURE : LIMIT_PROCEDURE),
  },
  repairTools: {
    photoEyes: { ADJUST: ['wrench'], REPLACE: ['wrench', 'screwdriver'] },
    guides: { ADJUST: ['wrench'], REPLACE: ['wrench'] },
    overheadOperator: { ADJUST: ['screwdriver', 'wrench'], REPLACE: ['wrench'] },
    wallControl: { REPLACE: ['screwdriver'] },
    bottomBar: { REPLACE: ['wrench', 'screwdriver'] },
  },
  parts: {
    eyesNew: { cabinet: 'electrical', name: 'Photo eye set', cost: 85, note: 'Sender + receiver pair with brackets.' },
    guideSection: { cabinet: 'exits', name: 'Guide section, 10 ft', cost: 140, note: 'Replacement steel guide for rolling doors.' },
    controlStation: { cabinet: 'electrical', name: '3-button door control station', cost: 58, note: 'OPEN / CLOSE / STOP station, NEMA 4.' },
    astragalSeal: { cabinet: 'exits', name: 'Bottom astragal seal, 10 ft', cost: 65, note: 'Rubber bottom seal for rolling steel doors.' },
  },
  replacements: { photoEyes: 'eyesNew', guides: 'guideSection', overheadOperator: null, wallControl: 'controlStation', bottomBar: 'astragalSeal' },

  applyRepair(door, partId, result, state) {
    if (partId === 'photoEyes') aimEye(door.parts, result.replaced ? 0 : state.aim);
    if (partId === 'guides') bendGuide(door.parts, result.replaced ? 0 : state.bend);
    if (partId === 'guides' && door.state === 'stuck') door.goUp();
    if (partId === 'bottomBar' && result.replaced) tearSeal(door.parts, false);
    if (partId === 'overheadOperator' && state.slack !== undefined) {
      if (!result.fixed) door.fault = 'chain'; // still slack (or now too tight to call it done)
      return;
    }
    if (partId === 'overheadOperator' && !result.replaced) {
      door.limitGap = state.gap;
      door.overtravel = state.gap < 0;
      if (door.overtravel) door.fault = 'limit'; // still wrong, just the other way
      if (door.state === 'closed' && door.open > 0) door.goUp();
    }
  },
  // repair side effects shown in the 3D view while a procedure is open
  onChoice(key, value, parts) {
    if (key === 'lockout') parts.lockout.visible = value === true;
  },
  onRepairClosed(parts) { parts.lockout.visible = false; },
};
