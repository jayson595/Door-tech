// sites/school.js — BUILDING 04: Lincoln Middle School, main hallway.
//
// Inside a school. A FIRE-RATED PAIR of cross-corridor doors is held open all day on
// MAGNETIC HOLD-OPENS. When the fire alarm (or the smoke detector by the doors) trips, the
// alarm RELAY cuts power to the magnets and the CLOSERS shut the doors. A COORDINATOR holds the
// active (right) leaf back until the inactive (left) leaf closes, so the two meet in the right
// order and both latch. The classroom door down the hall is scenery: jobs here are only
// on the fire door pair. New here: the CODE CHECK. A fire door that won't close and latch fails the job.
//
// "Outside" here is the main hall (lobby end, where the truck is through the front glass);
// "inside" is the B wing on the other side of the fire doors.
//
// Faults:
//   holdOpen    magnets never wired through the alarm relay -> doors stay open in a fire
//   coordinator coordinator out of adjustment -> wrong leaf closes first, other stays open a crack
//   closerLeak  left closer lost its oil -> left leaf slams, bounces back open, pair never latches
//   smokeDead   smoke detector head dead -> its test button does nothing, doors stay held open
//   armature    right leaf's armature plate loose -> that door won't stay on its magnet

import * as THREE from 'three';
import { MAT, box, glassPane } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { schoolBus2 as schoolBus } from './src-vehicles2.js';

const LEAF_W = 0.914, LEAF_H = 2.134, LEAF_T = 0.045;
const HALL_W = 2.0;            // corridor width (walls at x = ±1.0)
const LOBBY_Z = 4.6;           // the main hall opens into the lobby here
const CLOSE_SPEED = 15;        // degrees per second on the closers
const CRACK = 4;               // how far open the left leaf hangs up on the astragal
const CLASS_Z = 1.3;           // classroom door, on the right wall of the main hall, just past the open fire door
const RELAY_Z = 0.5;           // fire alarm relay box, high on the left wall right by the doors

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
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.9 });
  const wainscot = new THREE.MeshStandardMaterial({ color: 0x2f6f9e, roughness: 0.7 });
  const tile = canvasTex(256, 256, (g, w, h) => {
    const c = ['#d9d3c3', '#cfc8b6', '#ddd7c8', '#b9ad93'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = c[(x * 3 + y * 5) % 4]; g.fillRect(x * 64, y * 64, 64, 64);
      g.strokeStyle = 'rgba(0,0,0,0.08)'; g.strokeRect(x * 64, y * 64, 64, 64);
    }
  });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.repeat.set(4, 20);
  const floorMat = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 });

  // floor + ceiling for the whole run: B wing (z -8..0), main hall (0..4.6), lobby (4.6..7.5)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 15.5), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.002, -0.25);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 15.5), new THREE.MeshStandardMaterial({ color: 0xf1efe8 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.0, -0.25);
  scene.add(ceil);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffdf3 });
  for (const z of [-6, -3.5, -1.2, 1.5, 3.6, 6]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lightMat);
    p.rotation.x = Math.PI / 2;
    p.position.set(0, 2.99, z);
    scene.add(p);
  }
  for (const z of [-3, 2.5]) {
    const l = new THREE.PointLight(0xfff8ea, 3.2, 8, 1.5);
    l.position.set(0, 2.6, z);
    scene.add(l);
  }

  // corridor walls (with blue wainscot) on both sides of the fire doors
  for (const side of [-1, 1]) {
    for (const [z0, z1] of [[-8, 0], [0, LOBBY_Z]]) {
      const len = z1 - z0, zc = (z0 + z1) / 2;
      box(scene, 'hallWall', wallMat, 0.1, 3, len, side * (HALL_W / 2 + 0.05), 1.5, zc);
      box(scene, 'wainscot', wainscot, 0.012, 1.0, len, side * (HALL_W / 2 - 0.006), 0.5, zc);
    }
  }
  // the fire wall the doors sit in (z = 0), with its opening
  const fw = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.9 });
  box(scene, 'fireWallHead', fw, HALL_W, 3 - LEAF_H - 0.05, 0.2, 0, (3 + LEAF_H + 0.05) / 2, -0.1);
  // lobby: wider room with a glass front onto the street (the truck is out there)
  box(scene, 'lobbyWallL', wallMat, 0.1, 3, 2.9, -3.5, 1.5, 6.05);
  box(scene, 'lobbyWallR', wallMat, 0.1, 3, 2.9, 3.5, 1.5, 6.05);
  for (const side of [-1, 1]) box(scene, 'lobbyReturn', wallMat, 2.5, 3, 0.1, side * 2.25, 1.5, LOBBY_Z);
  const alum = MAT.aluminum;
  for (const x of [-3.45, -2.3, -1.15, 0, 1.15, 2.3, 3.45]) box(scene, 'mullion', alum, 0.06, 3, 0.1, x, 1.5, 7.5);
  box(scene, 'frontHead', alum, 7, 0.08, 0.1, 0, 2.6, 7.5);
  for (const x of [-2.875, -1.725, -0.575, 0.575, 1.725, 2.875]) glassPane(scene, 1.1, 2.55, x, 1.3, 7.5);
  const schoolSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.36), new THREE.MeshBasicMaterial({
    map: canvasTex(1024, 154, (g, w, h) => {
      g.fillStyle = '#7a1f1f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4e6c8'; g.font = 'bold 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('LINCOLN MIDDLE SCHOOL', w / 2, h / 2 + 4);
    }) }));
  schoolSign.position.set(0, 2.75, 7.44);
  schoolSign.rotation.y = Math.PI;
  scene.add(schoolSign);

  // school bus waiting across the street, seen through the front glass
  schoolBus(scene, { x: -0.5, z: 14.7, rotY: Math.PI });

  // B wing end wall
  const bwing = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, 3), new THREE.MeshBasicMaterial({
    map: canvasTex(512, 768, (g, w, h) => {
      g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2f6f9e'; g.fillRect(0, h * 0.66, w, h * 0.34);
      g.fillStyle = '#7a1f1f'; g.font = 'bold 110px Georgia, serif'; g.textAlign = 'center';
      g.fillText('B WING', w / 2, 230);
      g.font = '46px Georgia, serif'; g.fillText('Rooms 120–138', w / 2, 300);
    }), color: 0xe9e9e9 }));
  bwing.position.set(0, 1.5, -8);
  scene.add(bwing);

  // lockers along the main hall
  const lockerMat = new THREE.MeshStandardMaterial({ color: 0x8c2a2a, roughness: 0.55, metalness: 0.2 });
  for (let i = 0; i < 6; i++) {
    // (kept low and back from the doors so they don't hide the left mag holder)
    box(scene, 'lockerL', lockerMat, 0.32, 1.5, 0.3, -HALL_W / 2 + 0.16, 0.75, 2.4 + i * 0.32);
    box(scene, 'lockerSlot', MAT.black, 0.004, 0.08, 0.2, -HALL_W / 2 + 0.322, 1.3, 2.4 + i * 0.32);
  }
  for (let i = 0; i < 6; i++) box(scene, 'lockerB', lockerMat, 0.32, 1.8, 0.3, HALL_W / 2 - 0.16, 0.9, -1.5 - i * 0.32);

  // hollow metal frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5b2323, roughness: 0.5, metalness: 0.3 });
  for (const s of [-1, 1]) box(scene, 'jamb', frameMat, 0.05, LEAF_H + 0.05, 0.2, s * (LEAF_W + 0.025), (LEAF_H + 0.05) / 2, -0.1);
  box(scene, 'frameHead', frameMat, 2 * LEAF_W + 0.1, 0.05, 0.2, 0, LEAF_H + 0.025, -0.1);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xd4c27a, metalness: 0.6, roughness: 0.3 }));
  label.position.set(LEAF_W + 0.026, 1.3, 0.001);
  label.rotation.y = -Math.PI / 2;
  scene.add(label); // the fire label on the hinge edge of the frame

  // --- the PAIR of fire doors. doorLeaf holds both; each leaf pivots on its own hinge.
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7a1f1f, roughness: 0.5, metalness: 0.25 });
  const kick = MAT.stainless;
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const mkLeaf = (sign) => {
    // sign -1 = left leaf (hinge at x -LEAF_W, extends +x), +1 = right leaf (hinge at +LEAF_W, extends -x)
    const g = new THREE.Group();
    g.position.set(sign * LEAF_W, 0, 0);
    leaf.add(g);
    const cx = -sign * LEAF_W / 2;
    box(g, 'leafBody', doorMat, LEAF_W - 0.006, LEAF_H - 0.01, LEAF_T, cx, LEAF_H / 2, -LEAF_T / 2);
    box(g, 'visionLite', new THREE.MeshStandardMaterial({ color: 0xbcd3df, roughness: 0.1 }), 0.12, 0.6, LEAF_T + 0.004, cx, 1.55, -LEAF_T / 2);
    box(g, 'kickA', kick, LEAF_W - 0.06, 0.25, 0.003, cx, 0.13, 0.002);
    box(g, 'kickB', kick, LEAF_W - 0.06, 0.25, 0.003, cx, 0.13, -LEAF_T - 0.002);
    // exit device on the B-wing face (the push side)
    box(g, 'exitBar', MAT.stainless, LEAF_W - 0.2, 0.06, 0.05, cx, 1.0, -LEAF_T - 0.03);
    // closer: parallel-arm mount on the push (B-wing) face, near the top on the hinge side.
    // With the doors held open this face looks out into the main hall, so you can see it and get at it.
    const closerMat = new THREE.MeshStandardMaterial({ color: 0x9a9fa5, metalness: 0.5, roughness: 0.35 });
    const cz = -LEAF_T - 0.035;
    box(g, 'closerBody', closerMat, 0.3, 0.075, 0.07, sign * -0.24, LEAF_H - 0.09, cz);
    box(g, 'closerArm', MAT.black, 0.26, 0.022, 0.02, sign * -0.5, LEAF_H - 0.05, cz - 0.02);
    for (const ex of [-0.155, 0.155]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 14), closerMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(sign * -0.24 + ex, LEAF_H - 0.09, cz);
      g.add(cap);
    }
    // mag holder armature plate on the main-hall face near the latch edge
    g.userData.armature = box(g, 'armature', MAT.stainless, 0.07, 0.07, 0.008, -sign * (LEAF_W - 0.12), 1.85, 0.004);
    for (const y of [0.25, 1.05, 1.9]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.11, 12), MAT.stainless);
      k.position.set(0, y, 0.005);
      g.add(k);
    }
    return g;
  };
  parts.leafL = mkLeaf(-1);
  parts.leafR = mkLeaf(1);
  parts.armatureR = parts.leafR.userData.armature;
  // oil dripped on the floor under the left closer (leaking closer fault only)
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.15, metalness: 0.3 }));
  oil.rotation.x = -Math.PI / 2;
  oil.scale.set(1.4, 0.8, 1);
  oil.position.set(-LEAF_W + 0.05, 0.004, 0.3);
  oil.visible = false;
  scene.add(oil);
  parts.oilSpot = oil;
  // astragal on the active (right) leaf's meeting edge
  box(parts.leafR, 'astragal', MAT.stainless, 0.03, LEAF_H - 0.02, 0.012, -LEAF_W + 0.005, LEAF_H / 2, 0.006);

  // closers as a component (the right leaf's carries the hit box)
  parts.closers = new THREE.Group();
  scene.add(parts.closers);

  // --- MAGNETIC HOLD-OPENS on the corridor walls, where the open leaves rest
  const mags = new THREE.Group();
  mags.name = 'magHolders';
  scene.add(mags);
  for (const s of [-1, 1]) {
    box(mags, 'magBase', new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.5, roughness: 0.4 }), 0.05, 0.1, 0.1, s * (HALL_W / 2 - 0.025), 1.85, LEAF_W - 0.12);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), MAT.black);
    coil.rotation.z = Math.PI / 2;
    coil.position.set(s * (HALL_W / 2 - 0.06), 1.85, LEAF_W - 0.12);
    mags.add(coil);
  }
  parts.magHolders = mags;

  // --- FIRE ALARM RELAY box + horn/strobe + pull station (main hall, left wall)
  const relay = new THREE.Group();
  relay.name = 'alarmRelay';
  scene.add(relay);
  const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  const rx = -HALL_W / 2 + 0.04;
  box(relay, 'relayBox', red, 0.08, 0.28, 0.26, rx + 0.01, 2.45, RELAY_Z);
  const relayLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.05), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 76, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c0392b'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('FIRE RELAY', w / 2, h / 2);
    }) }));
  relayLabel.position.set(rx + 0.052, 2.45, RELAY_Z);
  relayLabel.rotation.y = Math.PI / 2;
  relay.add(relayLabel);
  rod3(relay, 0.012, [rx, 2.59, RELAY_Z], [rx, 3.0, RELAY_Z]);
  parts.alarmRelay = relay;
  const strobe = box(scene, 'strobe', red, 0.05, 0.14, 0.1, rx, 2.2, 2.4);
  const lens = box(scene, 'strobeLens', new THREE.MeshBasicMaterial({ color: 0xf3f3f3 }), 0.012, 0.05, 0.07, rx + 0.03, 2.17, 2.4);
  lens.castShadow = false;
  parts.strobeLens = lens;
  box(scene, 'pullStation', red, 0.04, 0.13, 0.1, rx, 1.2, 0.5);

  // --- COORDINATOR: bar on the frame head soffit (main hall side)
  const coord = new THREE.Group();
  coord.name = 'coordinator';
  scene.add(coord);
  box(coord, 'coordBar', new THREE.MeshStandardMaterial({ color: 0x8e9399, metalness: 0.55, roughness: 0.35 }), 1.7, 0.03, 0.05, 0, LEAF_H - 0.012, 0.03);
  box(coord, 'coordArm', MAT.black, 0.12, 0.02, 0.03, 0.35, LEAF_H - 0.03, 0.04);
  parts.coordinator = coord;

  // --- SMOKE DETECTOR on the B-wing ceiling by the doors
  const smoke = new THREE.Group();
  smoke.name = 'smokeDetector';
  scene.add(smoke);
  const det = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }));
  det.position.set(0, 2.97, -0.35);
  smoke.add(det);
  const sled = box(smoke, 'smokeLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.012, 0.004, 0.012, 0.05, 2.944, -0.35);
  sled.castShadow = false;
  parts.smokeLED = sled;
  parts.smokeDetector = smoke;

  // --- CLASSROOM DOOR on the right wall of the main hall, with its lock indicator
  const cls = new THREE.Group();
  cls.name = 'classroomDoor';
  scene.add(cls);
  const wx = HALL_W / 2 - 0.006;
  box(cls, 'classFrame', frameMat, 0.03, LEAF_H + 0.05, LEAF_W + 0.1, wx, (LEAF_H + 0.05) / 2, CLASS_Z);
  box(cls, 'classLeaf', new THREE.MeshStandardMaterial({ color: 0xa7794c, roughness: 0.7 }), 0.04, LEAF_H - 0.02, LEAF_W - 0.02, wx - 0.01, LEAF_H / 2, CLASS_Z);
  box(cls, 'classLite', new THREE.MeshStandardMaterial({ color: 0xbcd3df, roughness: 0.1 }), 0.042, 0.5, 0.15, wx - 0.01, 1.55, CLASS_Z + 0.25);
  box(cls, 'classLever', MAT.stainless, 0.03, 0.02, 0.12, wx - 0.05, 1.0, CLASS_Z - 0.3);
  box(cls, 'classRose', MAT.stainless, 0.01, 0.07, 0.07, wx - 0.032, 1.0, CLASS_Z - 0.36);
  const ind = box(cls, 'lockIndicator', new THREE.MeshBasicMaterial({ color: 0x2ecc71 }), 0.006, 0.025, 0.05, wx - 0.034, 1.1, CLASS_Z - 0.36);
  ind.castShadow = false;
  const roomSign = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 140, (g, w, h) => {
      g.fillStyle = '#2f3e46'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('112', w / 2, h / 2);
    }) }));
  roomSign.position.set(wx - 0.025, 1.6, CLASS_Z - 0.62);
  roomSign.rotation.y = -Math.PI / 2;
  cls.add(roomSign);
  parts.classroomDoor = cls;
  parts.lockIndicator = ind;
}

function rod3(parent, r, a, b) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 10), MAT.stainless);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  parent.add(m);
}

// ---------------------------------------------------------------- the fire door pair
export class FireDoors {
  constructor(parts) {
    this.parts = parts;
    this.a = [90, 90];      // left, right: degrees open (90 = back on the magnets)
    this.state = 'held';    // held | closing | closed | opening
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 90;
    this.strobeT = 0;
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  powerOpen() { this.tapPull(); }
  cardRead() { this.tapPull(); }
  // Tap the doors: pull them off the magnets (they close), or push them back onto the magnets.
  tapPull() {
    if (this.state === 'held') this.unlatchMagnets();
    else if (this.state === 'closed') this.holdOpen();
  }

  startCycle() {
    this.cycle = { t: 0, settled: false, closed: false, latched: false, crack: false, stayedOpen: false,
      held: false, heldFail: false, bounced: false, rightDrift: false, noRelease: false };
  }

  // The smoke detector's own test button: it should release the doors by itself.
  smokeTest() {
    if (this.fault === 'smokeDead') {
      SFX.noteTick(); // click... nothing
      setTimeout(() => { if (this.cycle) { this.cycle.noRelease = true; this.cycle.settled = true; } }, 2500);
      return;
    }
    this.fireAlarm();
  }

  // Fire alarm: strobe flashes, the relay should drop the magnets.
  fireAlarm() {
    this.strobeT = 3.5;
    for (let i = 0; i < 4; i++) setTimeout(() => SFX.readerBeep(), i * 450);
    if (this.fault === 'holdOpen') {
      // the magnets aren't on the relay: they stay powered and the doors stay open
      setTimeout(() => {
        if (this.cycle) { this.cycle.stayedOpen = true; this.cycle.settled = true; }
      }, 3000);
      return;
    }
    if (this.state === 'held') this.unlatchMagnets();
  }

  unlatchMagnets() {
    SFX.clunk();
    this.setState('closing');
  }

  // Push both leaves back to the walls; the magnets catch them (if they have power).
  holdOpen() {
    SFX.handlePull();
    this.setState('opening');
  }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    if (this.strobeT > 0) {
      this.strobeT -= dt;
      const on = Math.floor(this.strobeT * 4) % 2 === 0 && this.strobeT > 0;
      this.parts.strobeLens.material.color.set(on ? 0xffffff : 0x8a8a8a);
    }
    if (this.state === 'opening') {
      for (let i = 0; i < 2; i++) this.a[i] = Math.min(90, this.a[i] + 120 * dt);
      if (this.a[0] >= 90 && this.a[1] >= 90) {
        this.driftSounded = false;
        if (this.fault === 'noMags') {
          // nothing to hold them: they swing right back
          if (c) c.heldFail = true;
          this.setState('closing');
        } else {
          SFX.latchClick(3);
          if (c) c.held = true;
          this.setState('held');
        }
      }
    } else if (this.state === 'held' && this.fault === 'armature' && this.a[1] > 0) {
      // the crooked armature plate barely touches its magnet: the right door creeps off and swings shut
      this.a[1] = Math.max(0, this.a[1] - CLOSE_SPEED * dt);
      if (c && this.a[1] < 88) c.rightDrift = true;
      if (this.a[1] <= 0 && !this.driftSounded) { this.driftSounded = true; SFX.latchClick(10); }
    } else if (this.state === 'closing') {
      const early = this.fault === 'coordinator';
      const leaking = this.fault === 'closerLeak';
      // Left (inactive) leaf closes first; the coordinator holds the right leaf until it's in.
      this.a[0] = Math.max(0, this.a[0] - CLOSE_SPEED * (leaking ? 3.5 : 1) * dt);
      if (leaking && this.a[0] <= 0) {
        // no oil, no control: the left leaf slams, bounces back off the stop and hangs there.
        // The coordinator keeps waiting for it, so the right leaf never comes off.
        SFX.latchClick(40);
        if (this.onSlam) this.onSlam(0.6);
        this.a[0] = 7;
        if (c) { c.bounced = true; c.closed = false; c.latched = false; c.settled = true; }
        this.setState('closed');
        this.apply();
        return;
      }
      const rightMayGo = early || this.a[0] <= 4;
      if (rightMayGo) this.a[1] = Math.max(0, this.a[1] - CLOSE_SPEED * (early ? 1.3 : 1) * dt);
      // Out of order: the right leaf gets there first, then the left one catches on its astragal.
      if (early && this.a[1] <= 0 && this.a[0] <= CRACK) {
        this.a[0] = CRACK;
        SFX.clunk();
        if (c) { c.closed = true; c.latched = false; c.crack = true; c.settled = true; }
        this.setState('closed');
      } else if (this.a[0] <= 0 && this.a[1] <= 0) {
        SFX.latchClick(8);
        if (c) { c.closed = true; c.latched = true; c.settled = true; }
        this.setState('closed');
        if (this.onClosed) this.onClosed(0, 90);
      }
    }
    this.apply();
  }

  apply() {
    const D = Math.PI / 180;
    this.parts.leafL.rotation.y = -this.a[0] * D;
    this.parts.leafR.rotation.y = this.a[1] * D;
    this.angle = Math.max(this.a[0], this.a[1]);
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });

export default {
  id: 'school',
  door: { place: 'Main hallway', desc: 'fire-rated pair on magnetic hold-opens', customer: 'Lincoln Middle School', level: 4 },
  framing: {
    arrival: { cx: 0, xHalf: 1.4, yMin: -0.15, yMax: 3.0 },
    work: { cx: 0, xHalf: 1.3, yMin: -0.05, yMax: 3.0 }, // the hallway and its ceiling
  },
  sideLabels: { out: 'GO TO B WING', in: 'GO TO MAIN HALL' },
  build,
  restStates: ['held', 'closed'], // the door is at rest (TEST DOOR can start) in these states
  Door: FireDoors,
  hints: {
    held: 'Tap a part to select it · tap the doors to pull them off the magnets · drag to look around',
    closed: 'Tap the doors to push them back onto the magnets',
    closing: 'Closers bringing the doors shut…',
    opening: '',
  },

  components: {
    magHolders: {
      label: 'Magnetic Hold-Opens',
      blurb: 'Electromagnets on the walls hold the doors open all day. No power, no hold.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([-0.95, 1.8, 0.8], [-0.15, 1.7, 1.85]),
      // one small box at each wall magnet (a box across the whole hall blocked the closers)
      hit: { center: [-HALL_W / 2 + 0.08, 1.85, LEAF_W - 0.12], size: [0.2, 0.3, 0.3],
        extra: [{ center: [HALL_W / 2 - 0.08, 1.85, LEAF_W - 0.12], size: [0.2, 0.3, 0.3] }] },
    },
    alarmRelay: {
      label: 'Fire Alarm Relay',
      blurb: 'A relay the fire alarm opens in an alarm. Whatever is wired through it loses power.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([-0.95, 2.4, RELAY_Z], [-0.1, 2.1, RELAY_Z + 0.85]),
      hit: { center: [-HALL_W / 2 + 0.1, 2.42, RELAY_Z], size: [0.3, 0.6, 0.6] },
    },
    coordinator: {
      label: 'Coordinator',
      blurb: 'Holds the active (right) leaf back until the inactive (left) leaf has closed.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0, 2.1, 0], [0.15, 1.85, 1.05]),
      hit: { center: [0, LEAF_H - 0.02, 0.04], size: [1.3, 0.2, 0.18] },
    },
    closers: {
      label: 'Door Closers',
      blurb: 'A closer on each leaf brings it shut when the magnets let go.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0.8, 1.95, 0.3], [-0.3, 1.7, 1.6]),
      hit: { attach: 'leafR', center: [-0.3, LEAF_H - 0.08, -LEAF_T - 0.05], size: [0.5, 0.26, 0.22],
        extra: [{ attach: 'leafL', center: [0.3, LEAF_H - 0.08, -LEAF_T - 0.05], size: [0.5, 0.26, 0.22] }] },
    },
    smokeDetector: {
      label: 'Smoke Detector',
      blurb: 'Watches the doorway. Smoke here should release the doors even before the building alarm.',
      side: 'in', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([0, 2.9, -0.35], [0.15, 2.25, -1.3]),
      hit: { center: [0, 2.9, -0.35], size: [0.5, 0.3, 0.5] },
    },
  },

  clues: {
    magHolders: {
      normal: ['Both magnets hold the doors firmly against the walls.', 'Armature plates on the doors line up with the magnets.'],
      holdOpen: [
        'Both magnets hold the doors firmly against the walls.',
        'Armature plates on the doors line up with the magnets.',
        'Their power comes down from the ceiling in plain conduit. Not from the relay box next to them.',
      ],
      armature: [
        'Left magnet holds its door firmly against the wall.',
        'The right door\'s armature plate hangs crooked: only one corner touches the magnet.',
        'Two of that plate\'s screws have backed out of the door.',
      ],
    },
    alarmRelay: {
      normal: ['Relay box is closed and labeled.', 'Status LED inside: relay energized, normal.', 'The mag holder wiring runs through this box.'],
      holdOpen: [
        'Relay box is closed and labeled.',
        'Status LED inside: relay energized, normal.',
        'The conduit to the mag holders bypasses this box completely.',
      ],
    },
    coordinator: {
      normal: ['Coordinator bar is tight to the frame.', 'It holds the right leaf back until the left one is in.'],
      coordinator: [
        'Coordinator bar is tight to the frame.',
        'Its release arm is set too early: it lets the right leaf go while the left one is still wide open.',
        'Fresh scuffs on the astragal where the left leaf catches it.',
      ],
      closerLeak: [
        'Coordinator bar is tight to the frame.',
        'It holds the right leaf back, waiting for the left leaf... which never gets all the way shut.',
      ],
    },
    closers: {
      normal: ['Both closers are tight, no oil leaks.', 'Each leaf closes smoothly from 90° in about 7 seconds.'],
      coordinator: [
        'Both closers are tight, no oil leaks.',
        'Each leaf closes fine on its own.',
        'Closed together, the right leaf gets there first and the left one hangs up open a crack.',
      ],
      closerLeak: [
        'Oily film on the left closer body, and drips on the floor underneath it.',
        'Released, the left leaf slams into the frame and bounces back open.',
        'Right closer is tight and dry, and closes its leaf smoothly.',
      ],
      armature: [
        'Both closers are tight, no oil leaks.',
        'Each leaf closes smoothly from 90° in about 7 seconds.',
        'The right door swings shut by itself while the left one stays on its magnet.',
      ],
    },
    smokeDetector: {
      normal: ['Detector LED blinks green: normal.', 'Pressing its test button trips the alarm, and the doors release.'],
      holdOpen: ['Detector LED blinks green: normal.', 'Pressing its test button trips the alarm and the strobe flashes... but the doors stay held open.'],
      smokeDead: [
        'Detector LED is dark. No blink at all.',
        'Date stamped on the head: 14 years old. Dust packed into the chamber.',
        'Pressing its test button does nothing. No alarm, no release.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      magHolders: {
        normal: ['Multimeter: 24 VDC at the magnets. Drops to 0 V when the alarm trips.'],
        holdOpen: ['Multimeter: 24 VDC at the magnets. Still 24 V with the alarm tripped.'],
      },
      alarmRelay: {
        normal: ['Multimeter: relay contacts open on alarm, as they should.'],
        holdOpen: ['Multimeter: relay contacts open on alarm, but nothing is wired to them.'],
      },
      smokeDetector: {
        normal: ['Multimeter: 24 VDC at the detector base.'],
        smokeDead: ['Multimeter: 24 VDC at the detector base. Power is there; the head never answers.'],
      },
      closers: ['Multimeter: closers are hydraulic. Nothing to measure.'],
    },
    level: {
      closers: ['Level: both leaves hang plumb.'],
    },
  },

  faults: {
    holdOpen: {
      name: 'Mag holders not wired through the fire alarm relay', part: 'alarmRelay', doors: ['school'],
      priority: 'LIFE SAFETY',
      complaint: 'The hallway fire doors didn\'t close during the fire drill. The fire marshal wrote us up.',
    },
    coordinator: {
      name: 'Coordinator out of adjustment', part: 'coordinator', doors: ['school'],
      complaint: 'When the hall doors close, one slams and the other stays open a crack.',
    },
    closerLeak: {
      name: 'Left closer leaking oil', part: 'closers', doors: ['school'], needsReplacing: true,
      complaint: 'One of the hallway fire doors bangs like a gunshot when they close, and there\'s an oily mess on the floor.',
    },
    smokeDead: {
      name: 'Door-release smoke detector dead', part: 'smokeDetector', doors: ['school'],
      priority: 'LIFE SAFETY', needsReplacing: true,
      complaint: 'The fire inspector pressed the test button on the smoke detector by the hall doors. Nothing happened. We have 10 days to fix it.',
    },
    armature: {
      name: 'Armature plate loose on the right door', part: 'magHolders', doors: ['school'],
      complaint: 'One of the hallway fire doors won\'t stay open on its magnet. It keeps drifting shut on kids between classes.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.coordOff = fault === 'coordinator' ? 2 + Math.floor(Math.random() * 2) : 0;
    door.parts.oilSpot.visible = fault === 'closerLeak';
    door.parts.smokeLED.material.color.set(fault === 'smokeDead' ? 0x1c1f1c : 0x33ff66);
    door.parts.armatureR.rotation.z = fault === 'armature' ? 0.45 : 0;
  },

  tests: {
    magHolders: { msg: 'Doors pulled off the magnets (tap them to put them back)', run: (d) => d.tapPull() },
    alarmRelay: { msg: 'Fire alarm tripped at the panel', run: (d) => d.fireAlarm() },
    smokeDetector: { msg: 'Smoke detector test button pressed', run: (d) => d.smokeTest() },
    coordinator: { msg: 'Doors released, watching the closing order', run: (d) => (d.state === 'held' ? d.unlatchMagnets() : d.holdOpen()) },
    closers: { msg: 'Doors released, watching the closers', run: (d) => (d.state === 'held' ? d.unlatchMagnets() : d.holdOpen()) },
  },

  // TEST DOOR, with the CODE CHECK: fire doors must close and latch on alarm.
  checks: [
    ['closes', 'Closes on fire alarm'],
    ['latch', 'Both leaves latch'],
    ['holds', 'Holds open on the magnets'],
    ['smoke', 'Releases on the smoke detector'],
  ],
  testCycles: [
    { label: 'Fire alarm: the doors must close and latch (code check)',
      start: (d) => { if (d.state !== 'held') { d.a = [90, 90]; d.setState('held'); } d.fireAlarm(); },
      done: (c) => c.settled || c.t > 20 },
    { label: 'Reset: push the doors back onto the magnets',
      start: (d) => { if (d.state === 'held' && d.a[0] >= 90 && d.a[1] >= 90) { d.cycle.held = true; } else d.holdOpen(); },
      // give it a few seconds on the magnets: a weak hold lets a door drift off
      done: (c, d) => (c.held && c.t > 3) || (c.heldFail && d.state === 'closed') || c.t > 15 },
    { label: 'Smoke detector test button: the doors must release (code check)',
      start: (d) => { if (d.state !== 'held') { d.a = [90, 90]; d.setState('held'); } d.smokeTest(); },
      done: (c) => c.settled || c.t > 20 },
  ],
  record(c, index) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.closes = c.closed && !c.stayedOpen;
      r.latch = c.stayedOpen ? null : c.latched;
      if (c.stayedOpen) symptoms.push('CODE: in a fire alarm the doors stayed held open on the magnets.');
      if (c.crack) symptoms.push('CODE: the left leaf hung up on the astragal and stayed open a crack.');
      if (c.bounced) symptoms.push('CODE: the left leaf slammed, bounced back open, and the pair never latched.');
    }
    if (index === 1) {
      r.holds = c.held && !c.heldFail && !c.rightDrift;
      if (c.heldFail) symptoms.push('The doors won\'t stay open: the magnets have no power.');
      if (c.rightDrift) symptoms.push('The right door wouldn\'t stay on its magnet. It drifted off and swung shut.');
    }
    if (index === 2) {
      r.smoke = !c.noRelease && !c.stayedOpen;
      if (!c.noRelease && !c.stayedOpen) { r.closes = c.closed; r.latch = c.latched; }
      if (c.noRelease) symptoms.push('CODE: the smoke detector test did nothing. The doors stayed held open.');
      if (c.stayedOpen) symptoms.push('CODE: in a fire alarm the doors stayed held open on the magnets.');
      if (c.crack) symptoms.push('CODE: the left leaf hung up on the astragal and stayed open a crack.');
      if (c.bounced) symptoms.push('CODE: the left leaf slammed, bounced back open, and the pair never latched.');
    }
    return { r, symptoms };
  },

  procedures: {
    alarmRelay: {
      title: 'Wiring the hold-opens to the fire alarm',
      start: () => ({ wire: null }),
      steps: [
        { type: 'hold', label: 'Open the relay box', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'look', label: 'Trace the mag holder wiring', button: 'TRACE',
          reveal: 'The mag holders run straight off a 24V supply. They never pass through the relay, so the alarm can\'t drop them.' },
        { type: 'choice', label: 'How do you fix it?', key: 'wire',
          options: [{ label: 'WIRE MAGS THROUGH THE RELAY', value: 'relay' },
                    { label: 'UNPLUG THE MAGS', value: 'unplug' },
                    { label: 'LEAVE IT', value: 'leave' }] },
        { type: 'hold', label: 'Trip the alarm and check the magnets drop', tool: 'multimeter', verb: 'MEASURE', count: 1 },
        { type: 'hold', label: 'Close the relay box', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
      ],
      finish(s) {
        if (s.wire === 'relay') return { fixed: true, quality: 100, parts: [] };
        if (s.wire === 'unplug') return { fixed: true, quality: 55, parts: [] }; // safe, but the school loses its hold-opens
        return { fixed: false, quality: 30, parts: [] };
      },
    },
    coordinator: {
      title: 'Adjusting the coordinator',
      start: (JOB) => ({ set: JOB.coordOff }),
      steps: [
        { type: 'hold', label: 'Loosen the release arm', tool: 'allenKeys', verb: 'LOOSEN', count: 1 },
        { type: 'nudge', label: 'Set when the right leaf is let go', key: 'set', min: -3, max: 4, unit: 'clicks early',
          down: '◀ LATER', up: 'EARLIER ▶',
          info: (s) => (s.set === 0 ? 'Right leaf waits until the left leaf is fully closed, then follows.'
            : s.set > 0 ? 'Still lets the right leaf go too early. The left one will catch on the astragal.'
            : 'Holds the right leaf too long. It could stay held open.') },
        { type: 'hold', label: 'Tighten the release arm', tool: 'allenKeys', verb: 'TIGHTEN', count: 1 },
      ],
      finish(s) {
        return { fixed: s.set === 0, quality: s.set === 0 ? 100 : 40, parts: [] };
      },
    },
    closers: {
      title: 'Adjusting the closers',
      start: () => ({}),
      steps: [
        { type: 'look', label: 'Find the adjustment valves', button: 'FIND VALVES',
          reveal: 'Each closer has a sweep valve and a latch valve on the end of the body.' },
        { type: 'hold', label: 'Turn the left closer\'s valves down', tool: 'allenKeys', verb: 'TURN', count: 2 },
        { type: 'look', label: 'Release the left leaf and watch it', button: 'WATCH',
          reveal: 'It still slams. The valves do nothing: oil is weeping out of the seal and the closer has lost its fluid. It can\'t be adjusted, only replaced.' },
      ],
      finish() { return { fixed: false, quality: 40, parts: [] }; },
    },
    magHolders: {
      title: 'Fixing the right door\'s armature plate',
      start: () => ({ square: null }),
      steps: [
        { type: 'look', label: 'Look at the right door\'s armature plate', button: 'LOOK',
          reveal: 'Two screws have backed out, so the plate hangs crooked and only one corner touches the magnet. Not enough grip to hold the door.' },
        { type: 'choice', label: 'Square the plate up to the magnet?', key: 'square',
          options: [{ label: 'SQUARE IT UP', value: true }, { label: 'LEAVE IT AS IS', value: false }] },
        { type: 'hold', label: 'Tighten the armature plate screws', tool: 'screwdriver', verb: 'TIGHTEN', count: 2 },
        { type: 'hold', label: 'Check the magnet voltage', tool: 'multimeter', verb: 'MEASURE', count: 1 },
      ],
      finish(s) { return { fixed: !!s.square, quality: s.square ? 100 : 45, parts: [] }; },
    },
  },
  repairTools: {
    alarmRelay: { ADJUST: ['screwdriver', 'multimeter'] },
    coordinator: { ADJUST: ['allenKeys'], REPLACE: ['screwdriver'] },
    magHolders: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    closers: { ADJUST: ['allenKeys'], REPLACE: ['wrench', 'screwdriver'] },
    smokeDetector: { REPLACE: ['screwdriver'] },
  },
  parts: {
    magHolder: { cabinet: 'electrical', name: '24V magnetic hold-open', cost: 120, note: 'Wall-mount door holder.' },
    coordinatorNew: { cabinet: 'exits', name: 'Door coordinator, 72"', cost: 135, note: 'Bar-type coordinator for pairs.' },
    smokeHead: { cabinet: 'electrical', name: 'Door-release smoke detector', cost: 95, note: 'Photoelectric detector head with relay base.' },
  },
  replacements: { magHolders: 'magHolder', coordinator: 'coordinatorNew', closers: 'newCloser', smokeDetector: 'smokeHead' },

  applyRepair(door, partId, result, state) {
    if (partId === 'alarmRelay' && state.wire === 'unplug') door.fault = 'noMags';
    if (partId === 'coordinator' && !result.fixed && !result.replaced) door.fault = 'coordinator';
    if (partId === 'closers' && result.replaced) door.parts.oilSpot.visible = false;
    if (partId === 'smokeDetector' && result.fixed) door.parts.smokeLED.material.color.set(0x33ff66);
    if (partId === 'magHolders' && result.fixed) door.parts.armatureR.rotation.z = 0;
    // a door left hanging off the magnets (or bounced open) goes back on them
    if (result.fixed && ['closers', 'magHolders'].includes(partId) && door.state !== 'closing' && door.state !== 'opening') door.holdOpen();
  },
};
