// sites/dockman.js — Ironside Logistics' SECOND door: the hollow metal man door beside the
// rolling steel door (the dock has two doors, the way Riverside Market does).
//
// Same building as dock.js (it reuses that building's 3D scene); here the steel walk-through
// door is the job: a 3'0" x 7'0" hollow metal door in a welded steel frame, on three butt
// hinges, with a surface closer inside, a storeroom lever lockset and a threshold. It swings OUT.
//
// Faults (from the "Hollow metal door" plan):
//   hinges     hinge knuckles worn flat -> door sags, drags, won't latch unless slammed
//   rust       bottom of the door skin rusted through -> rain blows in under it
//   anchors    frame anchors loose in the wall -> whole frame shakes when it closes
//   lockset    cylinder tailpiece snapped -> key turns but the door stays locked
//   closerArm  closer arm bent (forklift or wind) -> door stops a few inches open
//   threshold  threshold screws pulled out -> raised edge people trip on

import * as THREE from 'three';
import { MAT, box } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import dock, { DockDoor } from './src-sites-dock.js';

const MAN = { hingeX: -2.35, width: 0.914, height: 2.134 };
const MID = MAN.hingeX + MAN.width / 2;           // middle of the opening
const OPEN_TO = 80;                                // degrees a person swings it open
const CLOSE_SPEED = 11;                            // degrees per second on the closer
const ARM_STOP = 10;                               // bent closer arm: where it binds
const AJAR = 3;                                    // sagged door: where it bounces off the strike

// ---------------------------------------------------------------- the 3D bits
// The dock builds the building (and the man door slab); this adds the man door's hardware.
function build(scene, parts) {
  dock.build(scene, parts);
  const leaf = parts.manLeaf;           // the swinging slab (origin on the hinge line)
  const W = MAN.width, H = MAN.height;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4d5a66, roughness: 0.55, metalness: 0.3 });
  const steel = MAT.stainless;

  // HINGES: three leaves on the hinge edge (the knuckles are already there)
  const hinges = new THREE.Group();
  hinges.name = 'manHinges';
  scene.add(hinges);
  for (const y of [0.25, 1.05, 1.9]) box(hinges, 'hingeLeaf', steel, 0.05, 0.11, 0.006, MAN.hingeX + 0.03, y, 0.012);
  parts.manHinges = hinges;

  // FRAME: welded steel jambs (the head is the dock's), plus the crack in the grout that a
  // loose frame opens up at the strike jamb
  const frame = new THREE.Group();
  frame.name = 'manFrame';
  scene.add(frame);
  box(frame, 'jambHinge', frameMat, 0.05, H + 0.05, 0.1, MAN.hingeX - 0.03, (H + 0.05) / 2, -0.03);
  box(frame, 'jambStrike', frameMat, 0.05, H + 0.05, 0.1, MAN.hingeX + W + 0.03, (H + 0.05) / 2, -0.03);
  box(frame, 'strikePlate', steel, 0.025, 0.11, 0.004, MAN.hingeX + W + 0.008, 1.0, 0.018);
  const crack = box(frame, 'groutCrack', new THREE.MeshBasicMaterial({ color: 0x1a1c1f }), 0.012, 0.9, 0.004, MAN.hingeX + W + 0.062, 0.6, 0.004);
  crack.visible = false;
  parts.manFrame = frame;
  parts.groutCrack = crack;

  // THRESHOLD: aluminum saddle across the opening (tips up when its screws pull out)
  const th = new THREE.Group();
  th.name = 'manThreshold';
  th.position.set(MID, 0, 0.06);
  scene.add(th);
  const saddle = box(th, 'saddle', MAT.aluminum, W + 0.04, 0.012, 0.16, 0, 0.006, 0);
  parts.manThreshold = th;
  parts.saddle = saddle;

  // DOOR BOTTOM: the bottom of the door skin (rusts through), on the slab
  const bottom = new THREE.Group();
  bottom.name = 'manBottom';
  leaf.add(bottom);
  box(bottom, 'bottomSkin', frameMat, W - 0.012, 0.16, 0.047, W / 2, 0.085, -0.03);
  const rust = new THREE.Group();
  rust.visible = false;
  bottom.add(rust);
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x8a4a22, roughness: 1 });
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x0d0e10 });
  box(rust, 'rustBand', rustMat, W - 0.02, 0.09, 0.049, W / 2, 0.05, -0.03);
  for (const [x, w] of [[0.18, 0.06], [0.39, 0.09], [0.66, 0.05]]) box(rust, 'rustHole', holeMat, w, 0.035, 0.05, x, 0.035, -0.03);
  parts.manBottom = bottom;
  parts.rust = rust;

  // LOCKSET: storeroom lever lockset, key cylinder outside, lever both sides (on the slab)
  const lock = new THREE.Group();
  lock.name = 'manLockset';
  leaf.add(lock);
  box(lock, 'roseOut', steel, 0.07, 0.07, 0.01, W - 0.1, 1.0, 0.0);
  box(lock, 'cylinder', new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.7, roughness: 0.3 }), 0.022, 0.022, 0.006, W - 0.1, 1.0, 0.008);
  box(lock, 'roseIn', steel, 0.07, 0.07, 0.01, W - 0.1, 1.0, -0.06);
  box(lock, 'leverIn', steel, 0.12, 0.018, 0.018, W - 0.14, 1.0, -0.085);
  parts.manLockset = lock;

  // CLOSER: surface closer on the inside face at the top, arm to the frame head (on the slab)
  const closer = new THREE.Group();
  closer.name = 'manCloser';
  leaf.add(closer);
  const closerMat = new THREE.MeshStandardMaterial({ color: 0x9a9fa5, metalness: 0.5, roughness: 0.35 });
  box(closer, 'closerBody', closerMat, 0.3, 0.075, 0.07, 0.24, H - 0.12, -0.095);
  const arm = new THREE.Group();
  arm.position.set(0.38, H - 0.09, -0.135);
  closer.add(arm);
  box(arm, 'closerArm', MAT.black, 0.3, 0.022, 0.02, 0.14, 0, 0);
  parts.manCloser = closer;
  parts.closerArm = arm;

  // the man door is THE door here: taps on its slab run it
  parts.doorLeaf = leaf;
}

// ---------------------------------------------------------------- the man door
export class ManDoor {
  constructor(parts) {
    this.parts = parts;
    new DockDoor(parts);       // puts the rolling door down, closed (it isn't part of this job)
    this.parts.doorLeaf = parts.manLeaf;
    this.angle = 0;            // degrees open
    this.state = 'closed';     // closed | opening | holding | closing | ajar
    this.fault = null;
    this.cycle = null;
    this.locked = false;       // TEST DOOR running
    this.settings = {};
    this.pullEffort = 1;
    this.hold = 0;
    this.scuffClock = 0;
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  powerOpen() { this.tapPull(); }
  cardRead() { this.tapPull(); }

  startCycle() {
    this.cycle = { t: 0, opened: false, closed: false, latched: false, dragged: false, shook: false, short: false,
      keyOk: false, keyFail: false, walked: false };
  }

  // Someone pulls the door open (it swings out), lets go, and the closer brings it back.
  tapPull() {
    if (this.state !== 'closed' && this.state !== 'ajar') return;
    SFX.handlePull();
    if (this.fault === 'hinges') SFX.scuff();       // dragging on the threshold
    this.setState('opening');
  }

  // TEST: lock it, then open it with the key from outside.
  keyTest() {
    const c = this.cycle;
    if (this.state !== 'closed' && this.state !== 'ajar') return;
    SFX.noteTick();
    if (this.fault === 'lockset') {
      // the key turns all the way round... and nothing pulls the latch back
      setTimeout(() => SFX.clunk(), 400);
      if (c) c.keyFail = true;
      return;
    }
    setTimeout(() => { SFX.strikeRelease(); if (c) c.keyOk = true; this.tapPull(); }, 500);
  }

  // TEST: walk through and look at the threshold and the bottom of the door.
  walkCheck() { if (this.cycle) this.cycle.walked = true; }

  update(dt) {
    const c = this.cycle;
    if (c) c.t += dt;
    const sagging = this.fault === 'hinges';
    switch (this.state) {
      case 'opening':
        this.angle = Math.min(OPEN_TO, this.angle + (sagging ? 45 : 110) * dt);
        if (sagging) {
          this.scuffClock -= dt;
          if (this.scuffClock <= 0) { SFX.scuff(); this.scuffClock = 0.4; }
          if (c) c.dragged = true;
        }
        if (this.angle >= OPEN_TO) {
          if (c) c.opened = true;
          this.hold = 0.8;
          this.setState('holding');
        }
        break;
      case 'holding':
        this.hold -= dt;
        if (this.hold <= 0) this.setState('closing');
        break;
      case 'closing': {
        this.angle = Math.max(0, this.angle - CLOSE_SPEED * dt);
        if (this.fault === 'closerArm' && this.angle <= ARM_STOP) {
          // the bent arm binds: the closer can't pull it the last few inches
          this.angle = ARM_STOP;
          SFX.clunk();
          if (c) { c.short = true; c.closed = true; }
          this.setState('ajar');
          break;
        }
        if (this.angle <= 0) {
          if (sagging) {
            // the dropped door hits the strike lip and bounces back open a crack
            SFX.clunk();
            this.angle = AJAR;
            if (c) { c.closed = true; c.latched = false; }
            this.setState('ajar');
            break;
          }
          this.angle = 0;
          if (this.fault === 'anchors') {
            // the latch catches, and the loose frame rattles in the wall
            SFX.clunk();
            if (this.onSlam) this.onSlam(0.45);
            if (c) c.shook = true;
          }
          SFX.latchClick(8);
          if (c) { c.closed = true; c.latched = true; }
          this.setState('closed');
          if (this.onClosed) this.onClosed(OPEN_TO / CLOSE_SPEED, OPEN_TO);
        }
        break;
      }
    }
    this.apply();
  }

  apply() {
    this.parts.manLeaf.rotation.y = -this.angle * Math.PI / 180;
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// Show (or clear) what each fault looks like.
function showFault(parts, fault) {
  parts.manLeaf.rotation.z = fault === 'hinges' ? -0.012 : 0;       // drooping on worn hinges (drawn bigger)
  parts.rust.visible = fault === 'rust';
  parts.groutCrack.visible = fault === 'anchors';
  parts.closerArm.rotation.z = fault === 'closerArm' ? 0.35 : 0;     // kinked arm
  parts.closerArm.rotation.y = fault === 'closerArm' ? 0.25 : 0;
  parts.manThreshold.rotation.x = fault === 'threshold' ? -0.09 : 0; // outside edge lifted
  parts.manThreshold.position.y = fault === 'threshold' ? 0.008 : 0;
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });

export default {
  id: 'dockman',
  door: { place: 'Man door', desc: 'hollow metal door, steel frame, closer + lever lockset', customer: 'Ironside Logistics', level: 3 },
  framing: {
    arrival: { cx: -0.4, xHalf: 2.1, yMin: -0.25, yMax: 4.4 },
    work: { cx: MID, xHalf: 0.85, yMin: -0.1, yMax: 2.5 },
    inside: { cx: MID, xHalf: 0.95, yMin: -0.1, yMax: 2.6 },
  },
  build,
  restStates: ['closed', 'ajar'],
  Door: ManDoor,
  hints: {
    closed: 'Tap a part to select it · tap the steel door to pull it open · drag to look around',
    opening: 'Door swinging open…',
    holding: '',
    closing: 'Closer bringing the door shut…',
    ajar: 'Door is hanging open a crack. Tap it to open it again.',
  },

  components: {
    manHinges: {
      label: 'Hinges',
      blurb: 'Three heavy butt hinges carry the steel door. Worn knuckles let it drop.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([MAN.hingeX + 0.05, 1.1, 0], [MAN.hingeX + 0.9, 1.4, 1.6]),
      hit: { center: [MAN.hingeX + 0.02, 1.07, 0.0], size: [0.12, 1.95, 0.14] },
    },
    manLockset: {
      label: 'Lever Lockset',
      blurb: 'Storeroom lever lockset: the key unlocks it from outside, the inside lever always lets you out.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([MAN.hingeX + MAN.width - 0.1, 1.0, 0], [MAN.hingeX + MAN.width - 0.2, 1.25, 0.95]),
      hit: { attach: 'manLeaf', center: [MAN.width - 0.12, 1.0, -0.03], size: [0.2, 0.24, 0.16] },
    },
    manCloser: {
      label: 'Door Closer',
      blurb: 'Surface closer on the inside face at the top. Its arm pulls the door shut and into the latch.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([MAN.hingeX + 0.35, 2.0, -0.12], [MAN.hingeX + 0.6, 1.7, -1.35]),
      hit: { attach: 'manLeaf', center: [0.3, MAN.height - 0.11, -0.11], size: [0.5, 0.17, 0.12] },
    },
    manFrame: {
      label: 'Frame & Anchors',
      blurb: 'Welded steel frame, bolted into the wall and grouted solid. The strike is on the right jamb.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([MAN.hingeX + MAN.width, 1.1, 0], [MID + 0.3, 1.4, 1.7]),
      hit: { center: [MAN.hingeX + MAN.width + 0.04, 1.1, -0.01], size: [0.09, 2.2, 0.14],
        extra: [{ center: [MID, MAN.height + 0.03, -0.01], size: [MAN.width + 0.12, 0.08, 0.14] }] },
    },
    manThreshold: {
      label: 'Threshold',
      blurb: 'Aluminum saddle across the doorway, screwed into the concrete. The door bottom seals against it.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([MID, 0.05, 0.08], [MID + 0.2, 0.85, 1.15]),
      hit: { center: [MID, 0.02, 0.12], size: [MAN.width, 0.07, 0.15] },
    },
    manBottom: {
      label: 'Door Bottom & Skin',
      blurb: 'The bottom of the steel door. Water and road salt sit here, so rust starts here.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([MID, 0.15, 0], [MID + 0.15, 0.75, 1.25]),
      hit: { attach: 'manLeaf', center: [MAN.width / 2, 0.09, -0.03], size: [MAN.width - 0.25, 0.15, 0.1] },
    },
  },

  clues: {
    manHinges: {
      normal: ['All three hinges are tight, knuckles round.', 'Lifting on the latch side, the door doesn\'t move.'],
      hinges: [
        'Hinge knuckles are worn flat, with steel dust under the bottom hinge.',
        'Lifting on the latch side, the whole door rises a quarter inch.',
        'The gap at the top of the door is wider on the latch side.',
      ],
    },
    manLockset: {
      normal: ['Key turns smooth and the latch pulls all the way in.', 'Inside lever always retracts the latch.'],
      lockset: [
        'Key turns all the way around, too easily, and the latch doesn\'t move.',
        'Inside lever still pulls the latch back fine.',
        'Pulling the cylinder: the tailpiece is snapped off.',
      ],
      hinges: ['Key turns smooth and the latch pulls in.', 'The latch rides low in the strike.'],
    },
    manCloser: {
      normal: ['Closer body is tight, no oil.', 'Arm is straight, and the door closes and latches in about 7 seconds.'],
      closerArm: [
        'Closer body is tight, no oil.',
        'The main arm is kinked near the elbow, with a scrape of yellow paint on it.',
        'The arm binds and stops the door a few inches from closed.',
      ],
      hinges: ['Closer body is tight, no oil.', 'It brings the door shut, but the door hits the strike instead of latching.'],
      anchors: ['Closer body is tight, no oil.', 'It shuts the door fine, but the whole frame jolts when it latches.'],
    },
    manFrame: {
      normal: ['Frame is solid in the wall. Grout is tight.', 'Strike lines up with the latch.'],
      anchors: [
        'Grabbing the strike jamb, the whole frame rocks in the wall.',
        'A crack runs up the grout beside the strike jamb.',
        'Two anchor bolt heads are loose in their holes.',
      ],
      hinges: ['Frame is solid in the wall. Grout is tight.', 'Fresh scrape on the strike lip, below the latch hole.'],
    },
    manThreshold: {
      normal: ['Threshold is flat and tight to the concrete.', 'Door bottom clears it evenly.'],
      threshold: [
        'The outside edge of the threshold is lifted about half an inch.',
        'Its screws have pulled out of the concrete. The holes are crumbled.',
        'Scuff marks where boots catch the raised edge.',
      ],
      hinges: ['Threshold is tight to the concrete.', 'Fresh drag marks across it from the bottom of the door.'],
      rust: ['Threshold is flat and tight.', 'A rust-stained puddle sits on it inside the door.'],
    },
    manBottom: {
      normal: ['Bottom of the door skin is solid and painted.', 'No daylight under the door when it\'s closed.'],
      rust: [
        'The bottom four inches of the door skin are rusted through in three places.',
        'Daylight and rain come in through the holes.',
        'The rest of the door is solid.',
      ],
      hinges: ['Bottom of the door is solid, but scraped bare where it drags.'],
    },
  },
  toolReadings: {
    level: {
      manHinges: {
        normal: ['Level: the door hangs plumb.'],
        hinges: ['Level: the door is out of plumb, dropping toward the latch side.'],
      },
      manFrame: {
        normal: ['Level: both jambs are plumb.'],
        anchors: ['Level: the strike jamb reads plumb, until you push on it and it moves.'],
      },
      manThreshold: {
        normal: ['Level: threshold is flat.'],
        threshold: ['Level: threshold rocks: the outside edge is high.'],
      },
    },
  },

  faults: {
    hinges: {
      name: 'Hinges worn, door sagging', part: 'manHinges', doors: ['dockman'],
      complaint: 'The steel door by the dock drags on the floor and you have to slam it to get it to latch.',
    },
    rust: {
      name: 'Door bottom rusted through', part: 'manBottom', doors: ['dockman'],
      complaint: 'There are rust holes along the bottom of the steel door by the dock. Rain blows right in.',
    },
    anchors: {
      name: 'Frame anchors loose', part: 'manFrame', doors: ['dockman'],
      complaint: 'The whole door frame shakes every time the steel door by the dock shuts.',
    },
    lockset: {
      name: 'Lockset broken (tailpiece snapped)', part: 'manLockset', doors: ['dockman'], needsReplacing: true,
      complaint: 'The key turns in the dock side door, but it won\'t unlock. Our driver had to come in through the big door.',
    },
    closerArm: {
      name: 'Closer arm bent', part: 'manCloser', doors: ['dockman'],
      complaint: 'The steel door by the dock won\'t close all the way. It stops a few inches open.',
    },
    threshold: {
      name: 'Threshold pulled loose', part: 'manThreshold', doors: ['dockman'], priority: 'SAFETY',
      complaint: 'Two of our guys tripped on the doorway of the steel door by the dock this week.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.hingeShim = Math.random() < 0.5;
    showFault(door.parts, fault);
  },

  tests: {
    manHinges: { msg: 'Pulled the door open and let it close, watching the hinges', run: (d) => d.tapPull() },
    manLockset: { msg: 'Locked it, then tried the key from outside', run: (d) => d.keyTest() },
    manCloser: { msg: 'Opened the door and let the closer bring it shut', run: (d) => d.tapPull() },
    manFrame: { msg: 'Let the door close, watching the frame', run: (d) => d.tapPull() },
    manThreshold: { msg: 'Walked through the doorway, watching your feet', run: (d) => d.walkCheck() },
    manBottom: { msg: 'Closed the door and looked along the bottom edge', run: (d) => d.walkCheck() },
  },

  checks: [
    ['opens', 'Opens freely'],
    ['closes', 'Closes and latches'],
    ['solid', 'Frame stays solid'],
    ['key', 'Key unlocks it'],
    ['threshold', 'Threshold is flat'],
    ['weather', 'Bottom is weather-tight'],
  ],
  testCycles: [
    { label: 'Someone pulls the door open and lets it close', start: (d) => d.tapPull(),
      done: (c, d) => (c.closed && (d.state === 'closed' || d.state === 'ajar')) || c.t > 25 },
    { label: 'Lock it, then open it with the key from outside', start: (d) => d.keyTest(),
      done: (c, d) => (c.keyFail && c.t > 1.5) || (c.keyOk && c.closed && (d.state === 'closed' || d.state === 'ajar')) || c.t > 25 },
    { label: 'Walk through and check the threshold and the door bottom', start: (d) => d.walkCheck(),
      done: (c) => c.t > 1.5 },
  ],
  record(c, index, door) {
    const r = {}, symptoms = [];
    if (index === 0) {
      r.opens = c.opened && !c.dragged;
      r.closes = c.closed && c.latched && !c.short;
      r.solid = c.latched ? !c.shook : null;
      if (c.dragged) symptoms.push('The door dragged on the floor as it swung open.');
      if (c.short) symptoms.push('The door stopped a few inches short of closed.');
      else if (c.closed && !c.latched) symptoms.push('The door hit the strike and bounced back open a crack.');
      if (c.shook) symptoms.push('The whole frame jolted in the wall when the door latched.');
    }
    if (index === 1) {
      r.key = !c.keyFail;
      if (c.keyFail) symptoms.push('The key turned all the way around, but the door stayed locked.');
    }
    if (index === 2) {
      const f = door && door.fault;
      r.threshold = f !== 'threshold';
      r.weather = f !== 'rust';
      if (f === 'threshold') symptoms.push('Your toe caught on the raised edge of the threshold.');
      if (f === 'rust') symptoms.push('Daylight shows through rust holes along the bottom of the door.');
    }
    return { r, symptoms };
  },

  procedures: {
    manHinges: {
      title: 'Rehanging the door on new hinges',
      start: () => ({ hinges: null, shim: null }),
      steps: [
        { type: 'look', label: 'Wedge the door up and look at the hinges', button: 'LOOK',
          reveal: 'The hinge knuckles are worn flat. The door has dropped and its latch now hits the strike lip.' },
        { type: 'choice', label: 'The worn hinges', key: 'hinges',
          options: [{ label: 'NEW HINGES', part: 'hingeSet', value: 'new' }, { label: 'JUST TIGHTEN THE OLD ONES', value: 'tighten' }] },
        { type: 'hold', label: 'Hang the door on the hinges', tool: 'screwdriver', verb: 'TIGHTEN', count: 3 },
        { type: 'choice', label: 'Check where the latch meets the strike', key: 'shim',
          info: (s, JOB) => (JOB.hingeShim
            ? 'Better, but the latch still sits a hair low in the strike.'
            : 'The latch lines up with the strike hole.'),
          options: [{ label: 'SHIM THE TOP HINGE', part: 'hingeShims', value: true }, { label: 'NO SHIM NEEDED', value: false }] },
        { type: 'hold', label: 'Check the door is plumb', tool: 'level', verb: 'CHECK PLUMB', count: 1 },
      ],
      finish(s, JOB) {
        if (s.hinges !== 'new') return { fixed: false, quality: 40, parts: [] }; // worn knuckles keep sagging
        const fixed = s.shim || !JOB.hingeShim;
        return { fixed, quality: !fixed ? 55 : s.shim && !JOB.hingeShim ? 88 : 100, parts: [] };
      },
    },
    manBottom: {
      title: 'Patching the door bottom',
      start: () => ({ patch: null }),
      steps: [
        { type: 'look', label: 'Wire-brush the bottom of the door', button: 'BRUSH',
          reveal: 'Under the flaking paint, the bottom four inches of skin are rotted through. The rest of the door is solid steel.' },
        { type: 'choice', label: 'How do you fix it?', key: 'patch',
          options: [{ label: 'STEEL BOTTOM PATCH', part: 'rustPatch', value: 'patch' },
                    { label: 'PAINT OVER THE HOLES', value: 'paint' }] },
        { type: 'hold', label: 'Screw the patch on and seal its edges', tool: 'screwdriver', verb: 'FASTEN', count: 3 },
      ],
      finish(s) {
        if (s.patch === 'patch') return { fixed: true, quality: 100, parts: [] };
        return { fixed: false, quality: 30, parts: [] }; // paint doesn't fill a hole
      },
    },
    manFrame: {
      title: 'Re-anchoring the frame',
      start: () => ({ anchors: null, grout: null }),
      steps: [
        { type: 'look', label: 'Check the frame anchors', button: 'LOOK',
          reveal: 'Two anchor bolts on the strike jamb have worked loose, and the grout behind the jamb has cracked away.' },
        { type: 'choice', label: 'The anchors', key: 'anchors',
          options: [{ label: 'NEW ANCHOR BOLTS', part: 'frameAnchors', value: 'new' }, { label: 'RETIGHTEN THE OLD ONES', value: 'old' }] },
        { type: 'hold', label: 'Plumb the jamb and drive the anchors', tool: 'wrench', verb: 'TIGHTEN', count: 3 },
        { type: 'hold', label: 'Check the jamb is plumb', tool: 'level', verb: 'CHECK PLUMB', count: 1 },
        { type: 'choice', label: 'Fill the cracked grout?', key: 'grout',
          options: [{ label: 'RE-GROUT IT', part: 'groutMix', value: true }, { label: 'SKIP', value: false }] },
      ],
      finish(s) {
        if (s.anchors !== 'new') return { fixed: false, quality: 40, parts: [] }; // they spin in the wallowed-out holes
        return { fixed: true, quality: s.grout ? 100 : 82, parts: [] };
      },
    },
    manLockset: {
      title: 'Checking the lockset',
      start: () => ({}),
      steps: [
        { type: 'hold', label: 'Take the cylinder out', tool: 'screwdriver', verb: 'REMOVE', count: 1 },
        { type: 'look', label: 'Look at the cylinder', button: 'LOOK',
          reveal: 'The tailpiece on the back of the cylinder has snapped off. Nothing turns the latch anymore. It can\'t be adjusted, only replaced.' },
        { type: 'hold', label: 'Put the cylinder back', tool: 'screwdriver', verb: 'INSTALL', count: 1 },
      ],
      finish() { return { fixed: false, quality: 40, parts: [] }; },
    },
    manCloser: {
      title: 'Replacing the closer arm',
      start: () => ({ arm: null }),
      steps: [
        { type: 'hold', label: 'Take the arm off the closer', tool: 'wrench', verb: 'REMOVE', count: 1 },
        { type: 'look', label: 'Look at the arm', button: 'LOOK',
          reveal: 'The main arm is kinked at the elbow. The closer itself is fine: no oil, smooth action.' },
        { type: 'choice', label: 'The bent arm', key: 'arm',
          options: [{ label: 'NEW ARM', part: 'closerArmKit', value: 'new' }, { label: 'BEND IT BACK', value: 'bend' }] },
        { type: 'hold', label: 'Bolt the arm on and set the preload', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
      ],
      finish(s) {
        if (s.arm === 'new') return { fixed: true, quality: 100, parts: [] };
        return { fixed: false, quality: 45, parts: [] }; // bent steel cracks when you bend it back
      },
    },
    manThreshold: {
      title: 'Re-anchoring the threshold',
      start: () => ({ screws: null, sweep: null }),
      steps: [
        { type: 'look', label: 'Look at the threshold screws', button: 'LOOK',
          reveal: 'The old screws have pulled out of the concrete. Their holes are crumbled and too big to hold.' },
        { type: 'choice', label: 'Anchor it with', key: 'screws',
          options: [{ label: 'NEW CONCRETE SCREWS, NEW HOLES', part: 'thresholdScrews', value: 'new' },
                    { label: 'THE OLD SCREWS', value: 'old' }] },
        { type: 'hold', label: 'Set the threshold down and screw it tight', tool: 'screwdriver', verb: 'TIGHTEN', count: 3 },
        { type: 'choice', label: 'The door sweep is torn too. Replace it?', key: 'sweep',
          options: [{ label: 'NEW DOOR SWEEP', part: 'doorSweep', value: true }, { label: 'KEEP THE OLD ONE', value: false }] },
      ],
      finish(s) {
        if (s.screws !== 'new') return { fixed: false, quality: 35, parts: [] }; // old screws spin in the crumbled holes
        return { fixed: true, quality: s.sweep ? 100 : 85, parts: [] };
      },
    },
  },
  repairTools: {
    manHinges: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    manLockset: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    manCloser: { ADJUST: ['wrench'], REPLACE: ['wrench', 'screwdriver'] },
    manFrame: { ADJUST: ['wrench'] },
    manThreshold: { ADJUST: ['screwdriver'] },
    manBottom: { ADJUST: ['screwdriver'], REPLACE: ['wrench', 'screwdriver'] },
  },
  parts: {
    hingeSet: { cabinet: 'exits', name: 'Heavy-duty hinges, 4-1/2" (set of 3)', cost: 42, note: 'Ball-bearing butt hinges for steel doors.' },
    hingeShims: { cabinet: 'fasteners', name: 'Hinge shims (pack)', cost: 3, note: 'Thin steel shims that tip a door back up.' },
    rustPatch: { cabinet: 'exits', name: 'Steel door bottom patch kit', cost: 58, note: 'Galvanized patch plate with screws and sealant.' },
    frameAnchors: { cabinet: 'fasteners', name: 'Frame anchor bolts (6)', cost: 14, note: 'Expansion anchors for steel door frames.' },
    groutMix: { cabinet: 'fasteners', name: 'Non-shrink grout', cost: 9, note: 'Fills the gap behind a steel frame.' },
    leverLockset: { cabinet: 'locks', name: 'Storeroom lever lockset', cost: 145, note: 'Grade 1 lever lock, key outside, free egress.' },
    closerArmKit: { cabinet: 'exits', name: 'Closer arm, regular', cost: 36, note: 'Replacement main arm + forearm.' },
    thresholdScrews: { cabinet: 'fasteners', name: 'Concrete screws (8)', cost: 6, note: 'For anchoring thresholds into slab.' },
    doorSweep: { cabinet: 'exits', name: 'Door sweep, 36"', cost: 18, note: 'Aluminum sweep with a vinyl seal.' },
    hmDoor: { cabinet: 'exits', name: 'Hollow metal door slab, 3070', cost: 420, note: 'Primed steel door, hinge and lock prepped.' },
  },
  replacements: { manHinges: 'hingeSet', manLockset: 'leverLockset', manCloser: 'newCloser', manBottom: 'hmDoor', manFrame: null, manThreshold: null },

  // Make the door look the way a finished repair left it.
  applyRepair(door, partId, result) {
    if (!result.fixed) return;
    const shown = {
      manHinges: 'hinges', manBottom: 'rust', manFrame: 'anchors', manCloser: 'closerArm', manThreshold: 'threshold',
    }[partId];
    if (shown) showFault(door.parts, door.fault); // repaired part goes back to normal
    if (door.state === 'ajar') door.tapPull();     // a door left hanging open gets cycled shut
  },
};
