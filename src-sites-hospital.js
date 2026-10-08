// sites/hospital.js — BUILDING 02: Mercy Hospital, ER entrance.
//
// A bi-parting AUTOMATIC SLIDING door: two glass panels slide apart on a track in the header
// when the motion sensors see someone coming. The header (on the approach side) holds the
// operator, the carriage track and rollers, and a battery backup that runs the doors if the
// power goes out. Everything a building needs lives in this one file (see sites/index.js).
//
// Faults:
//   sensorAim  outside sensor aimed too far out -> doors open for traffic, all night long
//   track      grit in the left floor guide + worn rollers -> left panel drags, stops halfway
//   battery    backup battery won't hold a charge -> doors stay shut when power is cut
//   sensorShort outside sensor aimed too close in -> doors open late, people nearly walk into them
//   insideDead inside sensor dead (water from a ceiling leak) -> doors won't open to let people out
//   holdShort  operator hold-open time turned way down -> doors start closing on stretchers

import * as THREE from 'three';
import { MAT, box, glassPane } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { ambulance2 as ambulance } from './src-vehicles2.js';

const PANEL_W = 1.0;      // each sliding panel
const PANEL_H = 2.25;
const SLIDE = 0.95;       // how far each panel travels to fully open
const HEAD_Y = 2.3;       // bottom of the header
const HOLD = 3;           // seconds held open after the last detection
const OPEN_SPEED = 0.9;   // fraction of full travel per second (about 1.1 s to open)
const CLOSE_SPEED = 0.5;
const BATTERY_SPEED = 0.35;
const TILT_STEP = 0.07;   // radians the sensor head tips per "click"

// ---------------------------------------------------------------- the 3D building
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A small printed label on the header cover.
function headerLabel(parent, text, w, x, y, z, bg = null, fg = '#e9ecef') {
  const tex = canvasTex(256, 64, (g, cw, ch) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = fg; g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function build(scene, parts) {
  const stucco = new THREE.MeshStandardMaterial({ color: 0xdcd6cb, roughness: 0.95 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x8e979f, roughness: 0.6, metalness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.5 });

  // Facade with a 4 m wide opening, wall 0.3 m thick (z 0 to -0.3).
  box(scene, 'wallLeft', stucco, 4, 6, 0.3, -4.1, 3, -0.15);
  box(scene, 'wallRight', stucco, 4, 6, 0.3, 4.1, 3, -0.15);
  box(scene, 'wallHeader', stucco, 4.2, 3.35, 0.3, 0, 4.325, -0.15);
  for (const x of [-4.6, -3.2, 3.2, 4.6]) {
    box(scene, 'window', new THREE.MeshStandardMaterial({ color: 0x7fa8c0, metalness: 0.3, roughness: 0.2 }), 0.9, 1.1, 0.04, x, 4.4, 0.01);
  }

  // Canopy over the ambulance drop-off, with the EMERGENCY sign on its face.
  box(scene, 'canopy', trim, 7, 0.22, 2.6, 0, 3.2, 1.3);
  for (const x of [-3.2, 3.2]) box(scene, 'canopyPost', trim, 0.16, 3.2, 0.16, x, 1.6, 2.45);
  const signTex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#b8322a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 84px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('E M E R G E N C Y', w / 2, h / 2 + 4);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.5), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  sign.position.set(0, 3.58, 2.61);
  scene.add(sign);
  box(scene, 'signBox', red, 4.3, 0.56, 0.06, 0, 3.58, 2.57);

  // Ambulance parked in the bay, off to the side, nose toward the street.
  ambulance(scene, { x: 5.4, z: 5.4, rotY: -Math.PI / 2 });

  // Inside: the ER waiting area, seen when you go in.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0xc9cfd2, roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.001, -2.3);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0xe9ebec }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.2, -2.3);
  scene.add(ceiling);
  const backTex = canvasTex(1024, 384, (g, w, h) => {
    g.fillStyle = '#e8eef0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a6f97'; g.fillRect(0, h * 0.62, w, h * 0.08);
    g.fillStyle = '#16384d'; g.font = 'bold 56px Arial, sans-serif'; g.textAlign = 'center';
    g.fillText('EMERGENCY DEPARTMENT', w / 2, 110);
    g.font = '36px Arial, sans-serif';
    g.fillText('Check-in  →', w / 2, 175);
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshBasicMaterial({ map: backTex, color: 0xdde3e6 }));
  back.position.set(0, 1.6, -4.3);
  scene.add(back);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshStandardMaterial({ color: 0xe3e7e9 }));
    wall.position.set(side * 4.5, 1.6, -2.3);
    wall.rotation.y = -side * Math.PI / 2;
    scene.add(wall);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfbfdff });
  for (const [x, z] of [[-1.8, -1.4], [1.8, -1.4], [0, -2.8]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lightMat);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, 3.19, z);
    scene.add(p);
  }
  // a wheelchair waiting by the door (simple)
  const chair = new THREE.Group();
  chair.position.set(-2.3, 0, -1.2);
  chair.rotation.y = 0.5;
  scene.add(chair);
  const blue = new THREE.MeshStandardMaterial({ color: 0x2a5d8a, roughness: 0.6 });
  box(chair, 'seat', blue, 0.45, 0.06, 0.45, 0, 0.5, 0);
  box(chair, 'back', blue, 0.45, 0.45, 0.05, 0, 0.75, -0.22);
  for (const x of [-0.26, 0.26]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 24), MAT.stainless);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.3, -0.05);
    chair.add(wheel);
  }
  const glow = new THREE.PointLight(0xf2f7ff, 3, 7, 1.5);
  glow.position.set(0, 2.6, -1.6);
  scene.add(glow);

  // Fixed sidelights left and right of the sliding panels (the panels slide in front of them).
  const frame = new THREE.Group();
  scene.add(frame);
  for (const x of [-2.0, 2.0]) box(frame, 'jamb', MAT.aluminum, 0.06, HEAD_Y, 0.12, x, HEAD_Y / 2, -0.03);
  for (const x of [-1.5, 1.5]) {
    glassPane(frame, 0.94, PANEL_H - 0.1, x, PANEL_H / 2, -0.03);
    box(frame, 'sidelightRail', MAT.aluminum, 0.94, 0.06, 0.06, x, 0.03, -0.03);
  }
  box(frame, 'threshold', MAT.stainless, 4.0, 0.012, 0.3, 0, 0.006, 0.02);

  // The two sliding panels. doorLeaf holds both, so a tap on either glass reads as "the door".
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const mkPanel = (sign) => {
    const p = new THREE.Group();
    p.position.set(sign * PANEL_W / 2, 0, 0.06);
    leaf.add(p);
    const s = 0.06;
    box(p, 'stile', MAT.aluminum, s, PANEL_H, 0.05, -PANEL_W / 2 + s / 2, PANEL_H / 2 + 0.02, 0);
    box(p, 'stile', MAT.aluminum, s, PANEL_H, 0.05, PANEL_W / 2 - s / 2, PANEL_H / 2 + 0.02, 0);
    box(p, 'rail', MAT.aluminum, PANEL_W, 0.08, 0.05, 0, PANEL_H - 0.02, 0);
    box(p, 'rail', MAT.aluminum, PANEL_W, 0.14, 0.05, 0, 0.09, 0);
    glassPane(p, PANEL_W - 2 * s, PANEL_H - 0.24, 0, PANEL_H / 2 + 0.04, 0);
    // carriage hanger up into the header
    box(p, 'hanger', MAT.black, 0.3, 0.1, 0.03, 0, PANEL_H + 0.06, 0);
    return p;
  };
  parts.panelL = mkPanel(-1);
  parts.panelR = mkPanel(1);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.12), new THREE.MeshBasicMaterial({
    map: canvasTex(512, 76, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('AUTOMATIC DOOR', w / 2, h / 2);
    }), transparent: true, toneMapped: false }));
  decal.position.set(0, 1.45, 0.03);
  decal.userData.seeThrough = true;
  parts.panelR.add(decal);

  // HEADER on the approach side: track + carriage (left), sensor (middle), operator (right),
  // battery backup (far right end).
  const headerMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.45, roughness: 0.35 });
  const headY = HEAD_Y + 0.17, headZ = 0.14;
  const track = new THREE.Group();
  track.name = 'slideTrack';
  scene.add(track);
  box(track, 'headerLeft', headerMat, 2.3, 0.34, 0.2, -0.95, headY, headZ);
  box(track, 'trackSlot', MAT.black, 2.2, 0.03, 0.005, -0.95, HEAD_Y + 0.03, headZ + 0.101);
  // floor guide under the left panel (where the grit packs in)
  box(track, 'floorGuide', MAT.black, 0.08, 0.03, 0.06, -1.0, 0.015, 0.06);
  parts.slideTrack = track;
  const grit = new THREE.Group(); // the debris, shown only with the track fault
  grit.visible = false;
  scene.add(grit);
  const gravel = new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Mesh(new THREE.DodecahedronGeometry(0.012 + (i % 3) * 0.004), gravel);
    g.position.set(-1.12 + i * 0.03, 0.012, 0.03 + (i % 2) * 0.05);
    grit.add(g);
  }
  parts.grit = grit;

  const op = new THREE.Group();
  op.name = 'slideOperator';
  scene.add(op);
  box(op, 'headerRight', headerMat, 0.55, 0.34, 0.2, 0.475, headY, headZ);
  headerLabel(op, 'OPERATOR', 0.4, 0.475, headY + 0.07, headZ + 0.102);
  box(scene, 'headerEnd', headerMat, 0.85, 0.34, 0.2, 1.675, headY, headZ); // plain cover past the battery
  parts.slideOperator = op;

  const batt = new THREE.Group();
  batt.name = 'backupBattery';
  scene.add(batt);
  // battery box: lighter and a little deeper than the header, so it reads as its own part
  box(batt, 'batteryBox', new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.35, roughness: 0.4 }), 0.5, 0.36, 0.26, 1.0, headY, headZ + 0.03);
  box(batt, 'batteryDoor', new THREE.MeshStandardMaterial({ color: 0xb0b6bc, metalness: 0.4, roughness: 0.4 }), 0.42, 0.26, 0.006, 1.0, headY - 0.01, headZ + 0.161);
  headerLabel(batt, 'BATTERY', 0.34, 0.98, headY + 0.07, headZ + 0.166, '#1d2024', '#f5b301');
  const battLed = box(batt, 'batteryLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.03, 0.03, 0.006, 1.19, headY + 0.07, headZ + 0.166);
  battLed.castShadow = false;
  parts.backupBattery = batt;
  parts.batteryLED = battLed;

  // Outside motion sensor, centered under the header. The head tips to aim the zone.
  const sensor = new THREE.Group();
  sensor.name = 'motionSensor';
  scene.add(sensor);
  box(sensor, 'sensorMount', MAT.black, 0.34, 0.03, 0.08, 0, HEAD_Y - 0.015, 0.2);
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y - 0.03, 0.2);
  sensor.add(head);
  box(head, 'sensorBody', MAT.black, 0.3, 0.07, 0.09, 0, -0.035, 0);
  box(head, 'sensorLens', new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.1 }), 0.24, 0.035, 0.004, 0, -0.04, 0.046);
  const pattern = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
  pattern.position.set(0.1, -0.035, 0.047);
  head.add(pattern);
  parts.motionSensor = sensor;
  parts.sensorHead = head;

  // Detection zone painted on the sidewalk as a faint glow (shows where the sensor is aimed).
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), new THREE.MeshBasicMaterial({
    color: 0xf5b301, transparent: true, opacity: 0.12, depthWrite: false }));
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(0, 0.006, 1.2);
  zone.userData.seeThrough = true;
  scene.add(zone);
  parts.sensorZone = zone;

  // Inside motion sensor on the inside face of the header wall.
  const inside = new THREE.Group();
  inside.name = 'insideSensor';
  scene.add(inside);
  box(inside, 'inSensorBody', MAT.black, 0.3, 0.07, 0.09, 0, HEAD_Y + 0.05, -0.35);
  box(inside, 'inSensorLens', new THREE.MeshStandardMaterial({ color: 0x0c0d10, metalness: 0.2, roughness: 0.1 }), 0.24, 0.035, 0.004, 0, HEAD_Y + 0.045, -0.397);
  box(inside, 'inHeaderTrim', MAT.aluminum, 4.0, 0.06, 0.05, 0, HEAD_Y + 0.03, -0.28);
  const inLed = box(inside, 'inSensorLED', new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0.02, 0.012, 0.004, 0.11, HEAD_Y + 0.065, -0.398);
  inLed.castShadow = false;
  parts.insideSensor = inside;
  parts.insideLED = inLed;
}

// Show how far out the sensor is aimed (each click pushes the zone ~0.6 m further out).
function aimSensor(parts, tilt) {
  parts.sensorHead.rotation.x = -tilt * TILT_STEP;
  const reach = 2.0 + tilt * 0.6;              // meters out from the door
  parts.sensorZone.scale.y = Math.max(0.3, reach);
  parts.sensorZone.position.z = 0.15 + parts.sensorZone.scale.y / 2;
}

// ---------------------------------------------------------------- the sliding door
export class SlidingDoor {
  constructor(parts) {
    this.parts = parts;
    this.open = [0, 0];       // left, right: 0 closed .. 1 fully open
    this.state = 'closed';    // closed | operating | holding | closing  (names match main.js hints)
    this.holdTimer = 0;
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;           // 0..90, "how open" (input.js and the tests read it)
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.ghostTimer = 5 + Math.random() * 4;
    this.onBattery = false;
    this.grindClock = 0;
    this.closeClock = 0;
    this.holdTime = HOLD;     // operator setting: seconds held open after the last detection
    this.apply();
  }

  // Input from the 3D view: a tap on the glass = walking up to the door.
  startDrag() {}
  dragTo() {}
  release() {}
  tapPull(how = 'pull') { this.activate(how === 'egress' ? 'in' : 'out'); }
  powerOpen(source) { this.activate(source); }
  cardRead() { this.activate('out'); }

  startCycle() {
    this.cycle = { t: 0, opened: false, fullOpen: true, closed: false, falseOpen: false, dead: false };
  }

  // Someone (or something) in the detection zone.
  activate(source = 'out') {
    // dead inside sensor: someone leaving the ER stands at the glass and nothing happens
    if (this.fault === 'insideDead' && source === 'in') {
      SFX.noteTick();
      if (this.cycle) this.cycle.exitDead = true;
      return;
    }
    if (this.state === 'holding') { this.holdTimer = this.holdTime; return; }
    if (this.state === 'operating') return;
    if (this.cycle && source === 'ghost') this.cycle.falseOpen = true;
    // sensor aimed too short: it only sees you when you're already at the glass
    if (this.fault === 'sensorShort' && source === 'out' && !this.lateStart) {
      if (this.cycle) this.cycle.late = true;
      this.lateStart = setTimeout(() => { this.lateStart = null; this.activate('late'); }, 900);
      return;
    }
    SFX.operatorMotor(this.onBattery ? 2.2 : 1.3);
    this.setState('operating');
  }

  // TEST: an ambulance rolls through the drive. A well-aimed sensor ignores it.
  traffic() {
    if (this.fault === 'sensorAim') this.activate('ghost');
  }

  // TEST: main power cut. The battery should run the doors open (slowly).
  powerFail() {
    if (this.state !== 'closed') return;
    if (this.fault === 'battery') {
      SFX.clunk();
      if (this.cycle) this.cycle.dead = true;
      this.parts.batteryLED.material.color.set(0xff3030);
      return;
    }
    this.onBattery = true;
    this.activate('battery');
  }

  update(dt) {
    if (this.cycle) this.cycle.t += dt;
    // The mis-aimed sensor keeps seeing traffic: the doors open by themselves now and then.
    if (this.fault === 'sensorAim' && this.state === 'closed' && !this.locked) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) { this.ghostTimer = 7 + Math.random() * 6; this.activate('ghost'); }
    }
    const dragging = this.fault === 'track';
    const max = [dragging ? 0.5 : 1, 1];
    const factor = [dragging ? 0.45 : 1, 1];
    const speed = this.onBattery ? BATTERY_SPEED : OPEN_SPEED;
    const moving = this.state === 'operating' || this.state === 'closing';
    if (moving && dragging) {
      this.grindClock -= dt;
      if (this.grindClock <= 0) { SFX.scuff(); this.grindClock = 0.45; }
    }
    switch (this.state) {
      case 'operating': {
        for (let i = 0; i < 2; i++) this.open[i] = Math.min(max[i], this.open[i] + speed * factor[i] * dt);
        if (this.open[0] >= max[0] && this.open[1] >= max[1]) {
          if (this.cycle) {
            this.cycle.opened = true; this.cycle.fullOpen = max[0] >= 1;
            if (this.holdTime < 1.5) this.cycle.shortHold = true;
          }
          this.holdTimer = this.holdTime;
          this.setState('holding');
        }
        break;
      }
      case 'holding':
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this.setState('closing');
        break;
      case 'closing': {
        this.closeClock += dt;
        for (let i = 0; i < 2; i++) this.open[i] = Math.max(0, this.open[i] - CLOSE_SPEED * factor[i] * dt);
        if (this.open[0] <= 0 && this.open[1] <= 0) {
          SFX.latchClick(4);
          if (this.cycle) { this.cycle.closed = true; this.cycle.closeSeconds = this.closeClock; }
          this.onBattery = false;
          this.setState('closed');
          if (this.onClosed) this.onClosed(this.closeClock, 90);
        }
        break;
      }
    }
    this.apply();
  }

  apply() {
    this.parts.panelL.position.x = -PANEL_W / 2 - this.open[0] * SLIDE;
    this.parts.panelR.position.x = PANEL_W / 2 + this.open[1] * SLIDE;
    this.angle = Math.max(this.open[0], this.open[1]) * 90;
  }

  setState(s) {
    if (s === this.state) return;
    if (s === 'closing') this.closeClock = 0;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });

export default {
  id: 'hospital',
  door: {
    place: 'ER entrance', desc: 'automatic bi-parting sliding doors', customer: 'Mercy Hospital', level: 2,
  },
  framing: {
    arrival: { cx: 0, xHalf: 2.4, yMin: -0.25, yMax: 4.1 },
    work: { cx: 0, xHalf: 1.45, yMin: -0.15, yMax: 3.0 },
  },
  build,
  restStates: ['closed'], // the door is at rest (TEST DOOR can start) in these states
  Door: SlidingDoor,
  hints: {
    closed: 'Tap a part to select it · tap the glass to walk up to the door',
    operating: 'Doors sliding open…',
    closing: 'Doors sliding shut…',
  },

  components: {
    slideTrack: {
      label: 'Track & Rollers',
      blurb: 'Carriage rollers ride a track in the header; floor guides keep the panels from swinging.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([-1.0, 1.4, 0.1], [-0.7, 1.7, 3.0]),
      hit: { center: [-0.95, 2.47, 0.14], size: [2.3, 0.4, 0.26] },
    },
    slideOperator: {
      label: 'Sliding Door Operator',
      blurb: 'Motor, gearbox, belt and controller in the header. Drives the panels open and shut.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0.5, 2.4, 0.15], [0.4, 2.0, 1.8]),
      hit: { center: [0.475, 2.47, 0.14], size: [0.55, 0.4, 0.26] },
    },
    motionSensor: {
      label: 'Motion Sensor (Outside)',
      blurb: 'Watches the approach and tells the operator to open. Its aim sets how far out it looks.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0, 2.2, 0.25], [0.15, 1.75, 1.5]),
      hit: { center: [0, 2.25, 0.22], size: [0.5, 0.2, 0.2] },
    },
    backupBattery: {
      label: 'Battery Backup',
      blurb: 'The labeled box at the right end of the door header. Runs the doors when the building loses power.',
      side: 'out', actions: ['INSPECT', 'TEST', 'REPLACE'],
      focus: S([1.0, 2.45, 0.2], [0.85, 2.05, 1.6]),
      hit: { center: [1.0, 2.47, 0.17], size: [0.55, 0.42, 0.32] },
    },
    insideSensor: {
      label: 'Motion Sensor (Inside)',
      blurb: 'Opens the doors for people leaving the ER.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0, 2.3, -0.35], [0.15, 1.8, -1.6]),
      hit: { center: [0, 2.35, -0.36], size: [0.5, 0.2, 0.2] },
    },
  },

  clues: {
    slideTrack: {
      normal: [
        'Header track is clean and straight.',
        'Carriage rollers are round and turn freely.',
        'Floor guides are clear. Both panels glide the full width.',
      ],
      track: [
        'Grit and gravel packed into the floor guide under the left panel.',
        'Left carriage rollers have flat spots and squeal as they turn.',
        'The left panel shudders and stops about halfway open.',
      ],
    },
    slideOperator: {
      normal: [
        'Motor and gearbox run smooth and quiet.',
        'Belt tension is right, no slipping.',
        'Controller shows no fault codes.',
      ],
      track: [
        'Motor and gearbox run smooth, but strain when the left panel moves.',
        'Belt tension is right, no slipping.',
        'Controller log: "OBSTRUCTION LEFT" over and over.',
      ],
      sensorAim: [
        'Motor and gearbox run smooth and quiet.',
        'Belt tension is right, no slipping.',
        'Controller counter: 640 openings overnight, with the ER nearly empty.',
      ],
      holdShort: [
        'Motor and gearbox run smooth and quiet.',
        'The doors barely finish opening before they start closing again.',
        'Controller settings: HOLD-OPEN TIME turned all the way down.',
      ],
      insideDead: [
        'Motor and gearbox run smooth and quiet.',
        'Belt tension is right, no slipping.',
        'Controller input light for the INSIDE sensor never lights, even with people standing there.',
      ],
    },
    motionSensor: {
      normal: [
        'Lens is clean and the mount is tight.',
        'The aim light shows the zone reaching about 2 m out from the door.',
        'Doors open as you walk up, not before.',
      ],
      sensorAim: [
        'Lens is clean and the mount is tight.',
        'The aim light shows the zone reaching way out, past the curb into the drive.',
        'Doors open when a car rolls through the drive.',
      ],
      sensorShort: [
        'Lens is clean and the mount is tight.',
        'The aim light shows the zone ending just past the threshold, tucked right under the door.',
        'Walking up, you\'re nearly at the glass before the doors move.',
      ],
    },
    insideSensor: {
      normal: [
        'Lens is clean and the mount is tight.',
        'Zone covers the waiting area in front of the door.',
      ],
      insideDead: [
        'Status LED on the sensor is dark.',
        'Water stain on the ceiling tile right above it, and a drip trail down the sensor case.',
        'Standing in front of the doors from inside: nothing happens.',
      ],
    },
    backupBattery: {
      normal: [
        'Battery date sticker: installed last year.',
        'Status light on the battery module is steady green.',
      ],
      battery: [
        'Battery date sticker: installed 6 years ago.',
        'Status light on the battery module is steady green (it only checks for a battery, not its health).',
        'Battery case is swollen on one side.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      backupBattery: {
        normal: ['Multimeter: 26.8 V on the battery pack. Healthy.'],
        battery: ['Multimeter: 18.4 V on the pack, dropping fast under load. It won\'t hold a charge.'],
      },
      slideOperator: ['Multimeter: steady 24 VDC at the motor terminals.'],
      motionSensor: ['Multimeter: 12 VDC at the sensor. Power is fine.'],
      insideSensor: {
        normal: ['Multimeter: 12 VDC at the sensor. Power is fine.'],
        insideDead: ['Multimeter: 12 VDC going in, but its output never switches when someone walks up.'],
      },
    },
    level: {
      slideTrack: ['Level: the header track is dead level.'],
    },
  },

  faults: {
    sensorAim: {
      name: 'Outside motion sensor aimed too far out', part: 'motionSensor', doors: ['hospital'],
      complaint: 'The ER doors keep opening by themselves all night. It is freezing in the waiting room.',
    },
    track: {
      name: 'Grit in the floor guide, worn carriage rollers', part: 'slideTrack', doors: ['hospital'],
      complaint: 'The left door drags and stops halfway. Stretchers barely fit through.',
    },
    battery: {
      name: 'Backup battery won\'t hold a charge', part: 'backupBattery', doors: ['hospital'],
      priority: 'URGENT', needsReplacing: true,
      complaint: 'Power blipped last night and the ER doors stayed shut. That cannot happen again.',
    },
    sensorShort: {
      name: 'Outside motion sensor aimed too close in', part: 'motionSensor', doors: ['hospital'],
      complaint: 'The ER doors open way too late. A man on crutches walked right into the glass this morning.',
    },
    insideDead: {
      name: 'Inside motion sensor dead (water damage)', part: 'insideSensor', doors: ['hospital'],
      priority: 'URGENT', needsReplacing: true,
      complaint: 'Patients can\'t get OUT of the ER. The doors open from outside, but not from the waiting room.',
    },
    holdShort: {
      name: 'Hold-open time set too short', part: 'slideOperator', doors: ['hospital'],
      complaint: 'The ER doors start closing on stretchers halfway through. They clipped a wheelchair yesterday.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.sensorTilt = fault === 'sensorAim' ? 3 + Math.floor(Math.random() * 2)
      : fault === 'sensorShort' ? -2 - Math.floor(Math.random() * 2) : 0;
    aimSensor(door.parts, JOB.sensorTilt);
    door.parts.grit.visible = fault === 'track';
    door.parts.insideLED.material.color.set(fault === 'insideDead' ? 0x1a1d1a : 0x33ff66);
    JOB.holdSet = fault === 'holdShort' ? 0 : HOLD; // seconds
    door.holdTime = fault === 'holdShort' ? 0.4 : HOLD;
  },

  // What TEST does when a part is selected.
  tests: {
    motionSensor: { msg: 'Walked up to the door from outside', run: (d) => d.activate('out') },
    insideSensor: { msg: 'Walked up to the door from inside', run: (d) => d.activate('in') },
    slideOperator: { msg: 'Operator cycled', run: (d) => d.activate('op') },
    slideTrack: { msg: 'Cycling the doors, watching the panels', run: (d) => d.activate('op') },
    backupBattery: { msg: 'Main power switched off: running on battery', run: (d) => d.powerFail() },
  },

  // TEST DOOR: the safety walk test.
  checks: [
    ['people', 'Opens for people'],
    ['full', 'Opens all the way'],
    ['closes', 'Closes fully'],
    ['hold', 'Stays open long enough'],
    ['exit', 'Opens for people leaving'],
    ['traffic', 'Ignores passing traffic'],
    ['battery', 'Opens on battery power'],
  ],
  testCycles: [
    { label: 'Someone walks up to the door', start: (d) => d.activate('out'),
      done: (c, d) => (c.closed && d.state === 'closed') || c.t > 20 },
    { label: 'Ambulance rolls through the drive', start: (d) => d.traffic(),
      done: (c, d) => c.t > 2.5 && d.state === 'closed' },
    { label: 'Main power cut: running on battery', start: (d) => d.powerFail(),
      done: (c, d) => (c.dead && c.t > 1.5) || (c.closed && d.state === 'closed') || c.t > 25 },
    { label: 'A patient walks up to leave the ER', start: (d) => d.activate('in'),
      done: (c, d) => (c.exitDead && c.t > 2) || (c.closed && d.state === 'closed') || c.t > 20 },
  ],
  record(c, index) {
    const r = {}, symptoms = [];
    const shortHold = () => {
      if (!c.opened) return;
      r.hold = !c.shortHold;
      if (c.shortHold) symptoms.push('Doors started closing again the moment they opened. Too quick for a stretcher.');
    };
    if (index === 0) {
      r.people = c.opened;
      r.full = c.fullOpen;
      r.closes = c.closed;
      shortHold();
      if (c.late) { r.people = false; symptoms.push('Doors opened late. The person almost walked into the glass.'); }
      if (!c.fullOpen) symptoms.push('Left door dragged and stopped about halfway open.');
    }
    if (index === 1) {
      r.traffic = !c.falseOpen;
      if (c.falseOpen) symptoms.push('Doors opened for a vehicle passing in the drive.');
    }
    if (index === 2) {
      r.battery = !c.dead;
      if (c.dead) symptoms.push('With main power cut, the doors stayed shut.');
      if (!c.dead) r.full = c.fullOpen;
    }
    if (index === 3) {
      r.exit = c.exitDead ? false : c.opened;
      if (c.exitDead) symptoms.push('From inside the waiting room, the doors never opened.');
      shortHold();
    }
    return { r, symptoms };
  },

  procedures: {
    motionSensor: {
      title: 'Aiming the outside motion sensor',
      start: (JOB) => ({ tilt: JOB.sensorTilt }),
      steps: [
        { type: 'hold', label: 'Open the sensor cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'nudge', label: 'Aim the detection zone', key: 'tilt', min: -3, max: 6, unit: 'clicks out',
          down: '▼ IN', up: '▲ OUT',
          info: (s) => {
            if (s.tilt >= 2) return 'Zone reaches past the curb. Cars in the drive will trip it.';
            if (s.tilt === 1) return 'Zone ends just past the sidewalk edge. Close.';
            if (s.tilt === 0) return 'Zone covers the approach, about 2 m out. Right where people walk up.';
            return 'Zone barely reaches past the threshold. People will walk right into the glass.';
          },
          apply: (s, parts) => aimSensor(parts, s.tilt) },
        { type: 'hold', label: 'Close the sensor cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
      ],
      finish(s) {
        const fixed = s.tilt === 0;
        return { fixed, quality: Math.max(30, 100 - Math.abs(s.tilt) * 18), parts: [] };
      },
    },
    slideTrack: {
      title: 'Servicing the track and rollers',
      start: () => ({ vac: null, rollers: null }),
      steps: [
        { type: 'hold', label: 'Take off the header cover', tool: 'screwdriver', verb: 'REMOVE COVER', count: 2 },
        { type: 'look', label: 'Look at the floor guide and rollers', button: 'LOOK',
          reveal: 'Grit is packed into the left floor guide, and the left carriage rollers have flat spots.' },
        { type: 'choice', label: 'Clean out the floor guide?', key: 'vac',
          options: [{ label: 'VACUUM IT OUT', value: true }, { label: 'SKIP', value: false }] },
        { type: 'choice', label: 'The left carriage rollers', key: 'rollers',
          options: [{ label: 'NEW ROLLERS', part: 'rollers', value: true }, { label: 'KEEP THE OLD ONES', value: false }] },
        { type: 'hold', label: 'Set the panel height and tighten the carriage', tool: 'wrench', verb: 'TIGHTEN', count: 2 },
        { type: 'hold', label: 'Put the header cover back on', tool: 'screwdriver', verb: 'INSTALL COVER', count: 2 },
      ],
      finish(s) {
        const fixed = !!(s.vac && s.rollers);
        const quality = fixed ? 100 : s.rollers || s.vac ? 55 : 40;
        return { fixed, quality, parts: [] };
      },
    },
    slideOperator: {
      title: 'Setting the hold-open time',
      start: (JOB) => ({ hold: JOB.holdSet }),
      steps: [
        { type: 'hold', label: 'Take off the operator cover', tool: 'screwdriver', verb: 'REMOVE COVER', count: 1 },
        { type: 'look', label: 'Read the controller settings', button: 'LOOK',
          reveal: 'HOLD-OPEN TIME is set to almost nothing. Someone turned it down, probably to keep the heat in.' },
        { type: 'nudge', label: 'Set the hold-open time', key: 'hold', min: 0, max: 8, unit: 's',
          down: '◀ SHORTER', up: 'LONGER ▶',
          info: (s) => {
            if (s.hold <= 1) return 'Doors will start closing while people are still in the opening.';
            if (s.hold === 2) return 'Just long enough for someone walking. Tight for a stretcher.';
            if (s.hold <= 4) return 'Plenty of time for a stretcher or a wheelchair to clear.';
            return 'Doors will sit wide open a long time. Safe, but the waiting room gets cold.';
          } },
        { type: 'hold', label: 'Put the operator cover back on', tool: 'screwdriver', verb: 'INSTALL COVER', count: 1 },
      ],
      finish(s) {
        const fixed = s.hold >= 2;
        const quality = !fixed ? 40 : s.hold === 3 || s.hold === 4 ? 100 : s.hold === 2 ? 80 : 70;
        return { fixed, quality, parts: [] };
      },
    },
    insideSensor: {
      title: 'Checking the inside motion sensor',
      start: () => ({}),
      steps: [
        { type: 'hold', label: 'Open the sensor cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
        { type: 'look', label: 'Look inside the sensor', button: 'LOOK',
          reveal: 'Rusty water has run down into the board. The LED stays dark however you aim it. This sensor is done.' },
        { type: 'hold', label: 'Close the sensor cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
      ],
      finish() { return { fixed: false, quality: 35, parts: [] }; },
    },
  },
  repairTools: {
    motionSensor: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    insideSensor: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    slideTrack: { ADJUST: ['screwdriver', 'wrench'] },
    backupBattery: { REPLACE: ['screwdriver'] },
    slideOperator: { ADJUST: ['screwdriver'], REPLACE: ['wrench', 'screwdriver'] },
  },
  parts: {
    rollers: { cabinet: 'exits', name: 'Carriage rollers (pair)', cost: 48,
      note: 'Sealed-bearing rollers for sliding door carriages.' },
    battery24: { cabinet: 'electrical', name: '24V door battery pack', cost: 189,
      note: 'Backup battery module for sliding door operators.' },
    sensorNew: { cabinet: 'electrical', name: 'Motion sensor', cost: 210,
      note: 'Microwave motion sensor with aim light.' },
  },
  replacements: { backupBattery: 'battery24', motionSensor: 'sensorNew', insideSensor: 'sensorNew', slideOperator: null },

  // Make the door behave the way a finished repair left it.
  applyRepair(door, partId, result, state) {
    if (partId === 'motionSensor') {
      if (result.replaced) { aimSensor(door.parts, 0); return; }
      aimSensor(door.parts, state.tilt);
      if (!result.fixed) door.fault = state.tilt > 0 ? 'sensorAim' : 'sensorShort';
    }
    if (partId === 'slideTrack' && result.fixed) door.parts.grit.visible = false;
    if (partId === 'backupBattery' && result.fixed) door.parts.batteryLED.material.color.set(0x33ff66);
    if (partId === 'insideSensor' && result.fixed) door.parts.insideLED.material.color.set(0x33ff66);
    if (partId === 'slideOperator' && !result.replaced && state.hold !== undefined) {
      door.holdTime = Math.max(0.4, state.hold);
      if (!result.fixed) door.fault = 'holdShort';
    }
  },
};
