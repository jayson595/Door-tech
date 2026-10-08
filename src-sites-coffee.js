// sites/coffee.js — BUILDING 05: Daybreak Coffee, drive-thru window.
//
// An AUTOMATIC SLIDING PASS-THROUGH WINDOW. The barista waves at the activation sensor (or
// steps up to it) and the sash slides open behind the fixed pane; it closes by itself after a
// few seconds. Above it on the inside: the OPERATOR (motor + drive belt) in the head, the
// ACTIVATION SENSOR pointing down at the counter, and an AIR CURTAIN fan that should blow
// whenever the window is open (keeps bugs, cold and car exhaust out).
//
// Outside is the drive-thru lane (cars queue there); inside is the barista counter.
//
// Faults:
//   belt        worn, glazed drive belt slips -> window stops halfway (morning rush: urgent)
//   sensorRange activation sensor turned up too far -> window opens every time someone walks by
//   fanWire     air curtain never wired to the window switch -> fan doesn't run when it opens
//   sensorDead  activation sensor drowned in spilled coffee -> waving does nothing
//   trackDebris dried syrup + a straw wrapper in the bottom track -> window stops short of closed
//   fanDirty    air curtain intake + blower wheel caked with greasy lint -> fan runs but barely blows

import * as THREE from 'three';
import { MAT, box, glassPane } from './src-sceneKit.js';
import * as SFX from './src-audio.js';
import { car } from './src-vehicles2.js';

const WIN_W = 1.5, WIN_Y0 = 1.0, WIN_Y1 = 2.0; // window opening (x -0.75..0.75)
const SASH_W = 0.75;
const HOLD = 4;            // seconds open after the last wave
const OPEN_SPEED = 1.2;    // fraction per second
const CLOSE_SPEED = 0.8;
const SHORT = 0.09;        // gunked-up track: where the sash hangs up on the way shut

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function label(parent, text, w, x, y, z, { bg = null, fg = '#e9ecef', rotY = 0, h = w / 4, px = 40 } = {}) {
  const tex = canvasTex(256, Math.round(256 * h / w), (g, cw, ch) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = fg; g.font = `bold ${px}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- the 3D building
function build(scene, parts) {
  const wood = new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (g, w, h) => {
      for (let y = 0; y < h; y += 32) { g.fillStyle = (y / 32) % 2 ? '#5b3b26' : '#634029'; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y + 30, w, 2); }
    }), roughness: 0.8 });
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
  wood.map.repeat.set(3, 3);
  const stone = new THREE.MeshStandardMaterial({ color: 0x8c857b, roughness: 0.95 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3b3430, metalness: 0.5, roughness: 0.4 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.8 });

  // wall (z 0 to -0.3) with the window opening; stone below the sill, wood above
  const T = 0.3, zc = -T / 2;
  box(scene, 'wallL', wood, 4, 3.0, T, -0.75 - 2, 1.5 + 0.0, zc);
  box(scene, 'wallR', wood, 4, 3.0, T, 0.75 + 2, 1.5, zc);
  box(scene, 'wallUnder', stone, WIN_W, WIN_Y0, T, 0, WIN_Y0 / 2, zc);
  box(scene, 'wallOver', wood, WIN_W, 3.0 - WIN_Y1, T, 0, (3.0 + WIN_Y1) / 2, zc);
  for (const s of [-1, 1]) box(scene, 'stoneBase', stone, 4, 0.8, T + 0.02, s * 2.75, 0.4, zc);
  box(scene, 'roofEdge', new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.6 }), 9.6, 0.25, 0.6, 0, 3.1, 0.05);
  // sign over the window
  const signTex = canvasTex(1024, 200, (g, w, h) => {
    g.fillStyle = '#1f3a3d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2a541'; g.beginPath(); g.arc(120, 130, 70, Math.PI, 0); g.fill(); // rising sun
    for (let k = 0; k < 7; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 7; g.fillRect(120 + Math.cos(a) * 85, 130 + Math.sin(a) * 85, 8, 8); }
    g.fillStyle = '#f7ead2'; g.font = 'bold 96px Georgia, serif'; g.textBaseline = 'middle';
    g.fillText('DAYBREAK COFFEE', 230, 104);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.66), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
  sign.position.set(0, 2.62, 0.02);
  scene.add(sign);
  // metal awning over the window
  const awn = box(scene, 'awning', new THREE.MeshStandardMaterial({ color: 0x1f3a3d, roughness: 0.5, metalness: 0.3 }), 2.1, 0.05, 0.75, 0, 2.18, 0.38);
  awn.rotation.x = 0.18;
  label(scene, 'DRIVE-THRU', 0.9, 1.45, 1.55, 0.005, { bg: '#f2a541', fg: '#1f3a3d', h: 0.22, px: 46 });
  label(scene, 'PLEASE PAY HERE', 0.7, -1.3, 1.55, 0.005, { bg: '#1f3a3d', fg: '#f7ead2', h: 0.16, px: 30 });

  // the drive-thru lane: asphalt, curb, painted arrow, a car waiting, menu board down the lane
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(20, 4.5), new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.95 }));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(0, 0.003, 2.6);
  lane.receiveShadow = true;
  scene.add(lane);
  box(scene, 'curbStrip', new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.9 }), 20, 0.15, 0.35, 0, 0.075, 0.17);
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry((() => {
    const s = new THREE.Shape(); s.moveTo(0, 0.25); s.lineTo(-0.6, 0.25); s.lineTo(-0.6, 0.5); s.lineTo(-1.1, 0); s.lineTo(-0.6, -0.5); s.lineTo(-0.6, -0.25); s.lineTo(0, -0.25); s.closePath(); return s;
  })()), new THREE.MeshBasicMaterial({ color: 0xe8e4d8 }));
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(2.8, 0.006, 2.4);
  scene.add(arrow);
  car(scene, { x: 4.2, z: 2.3, rotY: Math.PI, color: 0x2c4f7c, type: 'hatch', plate: '5LAT 7E' });
  car(scene, { x: 9.6, z: 2.3, rotY: Math.PI, color: 0x9a9da1, type: 'suv', plate: '8RUSH 1' });
  // menu board on a post, down the lane
  const menu = new THREE.Group();
  menu.position.set(-3.6, 0, 1.4);
  menu.rotation.y = 0.5;
  scene.add(menu);
  box(menu, 'menuPost', bronze, 0.12, 1.4, 0.12, 0, 0.7, 0);
  box(menu, 'menuBox', bronze, 1.1, 1.0, 0.12, 0, 1.7, 0);
  const menuFace = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), new THREE.MeshBasicMaterial({ toneMapped: false,
    map: canvasTex(400, 360, (g, w, h) => {
      g.fillStyle = '#16282a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2a541'; g.font = 'bold 34px Georgia, serif'; g.fillText('MENU', 20, 44);
      g.fillStyle = '#f7ead2'; g.font = '24px Arial';
      [['Drip coffee', '2.75'], ['Latte', '4.50'], ['Cappuccino', '4.25'], ['Cold brew', '4.75'], ['Mocha', '4.95'], ['Breakfast wrap', '6.50']]
        .forEach(([n, p], i) => { g.fillText(n, 20, 92 + i * 42); g.fillText(p, 300, 92 + i * 42); });
    }) }));
  menuFace.position.set(0, 1.7, 0.065);
  menu.add(menuFace);

  // inside: the barista side — counter, espresso machine, cups, menu screens, warm lights
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0x6b5442, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.002, -2.3);
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0x2e2a27 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.0, -2.3);
  scene.add(ceil);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ color: 0xcfc4b2,
    map: canvasTex(1024, 340, (g, w, h) => {
      g.fillStyle = '#e8dfcf'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16282a'; g.fillRect(250, 40, 520, 130);
      g.fillStyle = '#f2a541'; g.font = 'bold 40px Georgia, serif'; g.fillText('TODAY’S BREWS', 290, 100);
      g.fillStyle = '#f7ead2'; g.font = '26px Arial'; g.fillText('Sunrise Blend  ·  Dark Roast  ·  Decaf', 290, 145);
      g.fillStyle = '#5b3b26'; g.fillRect(0, 250, w, 90);
    }) }));
  back.position.set(0, 1.5, -4.3);
  scene.add(back);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), cream);
    wall.position.set(s * 4.5, 1.5, -2.3);
    wall.rotation.y = -s * Math.PI / 2;
    scene.add(wall);
  }
  // counter just inside the window, at sill height
  const counterTop = new THREE.MeshStandardMaterial({ color: 0x2d2b29, roughness: 0.35, metalness: 0.1 });
  box(scene, 'counter', wood, 4.6, 0.95, 0.65, 0, 0.475, -0.65);
  box(scene, 'counterTop', counterTop, 4.7, 0.05, 0.7, 0, 0.975, -0.65);
  // espresso machine + grinder + cups on the counter
  const steel = MAT.stainless;
  box(scene, 'espresso', steel, 0.7, 0.42, 0.45, -1.5, 1.21, -0.75);
  box(scene, 'espressoTop', MAT.black, 0.7, 0.04, 0.45, -1.5, 1.44, -0.75);
  for (const gx of [-1.68, -1.32]) box(scene, 'group', MAT.black, 0.08, 0.08, 0.12, gx, 1.12, -0.5);
  box(scene, 'grinder', MAT.black, 0.2, 0.42, 0.22, -0.95, 1.21, -0.8);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.5 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0xa0703f, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 16), cupMat);
    cup.position.set(1.15 + i * 0.13, 1.07, -0.5);
    scene.add(cup);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.039, 0.05, 16), sleeve);
    sl.position.set(1.15 + i * 0.13, 1.06, -0.5);
    scene.add(sl);
  }
  box(scene, 'register', MAT.black, 0.36, 0.22, 0.3, 0.95, 1.1, -0.85);
  const warm = new THREE.PointLight(0xffd9a0, 3.2, 7, 1.5);
  warm.position.set(0, 2.5, -1.6);
  scene.add(warm);
  for (const x of [-1.6, 0, 1.6]) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f3a3d, side: THREE.DoubleSide }));
    shade.position.set(x, 2.5, -1.3);
    scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
    bulb.position.set(x, 2.43, -1.3);
    scene.add(bulb);
    box(scene, 'cord', MAT.black, 0.01, 0.5, 0.01, x, 2.75, -1.3);
  }

  // ---- the WINDOW: bronze frame, fixed pane on the left, sliding sash on the right that
  // slides left behind the fixed pane. Stainless transaction shelf outside.
  const frame = new THREE.Group();
  frame.name = 'windowFrame';
  scene.add(frame);
  box(frame, 'frameHead', bronze, WIN_W + 0.08, 0.06, 0.16, 0, WIN_Y1 - 0.03, -0.05);
  box(frame, 'frameSill', bronze, WIN_W + 0.08, 0.05, 0.16, 0, WIN_Y0 + 0.025, -0.05);
  for (const s of [-1, 1]) box(frame, 'frameJamb', bronze, 0.05, WIN_Y1 - WIN_Y0, 0.16, s * (WIN_W / 2 + 0.015), (WIN_Y0 + WIN_Y1) / 2, -0.05);
  // fixed pane (outer track)
  glassPane(frame, SASH_W - 0.04, WIN_Y1 - WIN_Y0 - 0.12, -SASH_W / 2, (WIN_Y0 + WIN_Y1) / 2, 0.0);
  box(frame, 'fixedStile', bronze, 0.04, WIN_Y1 - WIN_Y0 - 0.08, 0.04, 0, (WIN_Y0 + WIN_Y1) / 2, 0.0);
  // transaction shelf
  box(scene, 'shelf', steel, WIN_W + 0.3, 0.03, 0.32, 0, WIN_Y0 - 0.02, 0.17);
  box(scene, 'shelfLip', steel, WIN_W + 0.3, 0.06, 0.02, 0, WIN_Y0 - 0.005, 0.33);
  parts.windowFrame = frame;

  // the sash (doorLeaf, so a tap on it reads as "the window")
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  scene.add(leaf);
  parts.doorLeaf = leaf;
  const sash = new THREE.Group();
  sash.position.set(SASH_W / 2, 0, -0.07);
  leaf.add(sash);
  const sh = WIN_Y1 - WIN_Y0 - 0.1;
  for (const s of [-1, 1]) box(sash, 'sashStile', bronze, 0.045, sh, 0.045, s * (SASH_W / 2 - 0.0225), (WIN_Y0 + WIN_Y1) / 2, 0);
  for (const y of [WIN_Y0 + 0.07, WIN_Y1 - 0.07]) box(sash, 'sashRail', bronze, SASH_W, 0.045, 0.045, 0, y, 0);
  glassPane(sash, SASH_W - 0.09, sh - 0.09, 0, (WIN_Y0 + WIN_Y1) / 2, 0);
  box(sash, 'sashPull', steel, 0.03, 0.22, 0.03, SASH_W / 2 - 0.08, (WIN_Y0 + WIN_Y1) / 2, -0.04); // inside pull
  parts.sash = sash;
  // weatherstrip pile along the meeting stile (seen from outside)
  parts.windowTrack = new THREE.Group();
  parts.windowTrack.name = 'windowTrack';
  scene.add(parts.windowTrack);
  box(parts.windowTrack, 'trackBottom', MAT.black, WIN_W, 0.015, 0.06, 0, WIN_Y0 + 0.055, -0.07);
  box(parts.windowTrack, 'trackTop', MAT.black, WIN_W, 0.015, 0.06, 0, WIN_Y1 - 0.055, -0.07);
  const gunk = new THREE.Group(); // dried syrup + a straw wrapper (track fault only)
  gunk.visible = false;
  scene.add(gunk);
  const syrup = new THREE.MeshStandardMaterial({ color: 0x5a3415, roughness: 0.25, metalness: 0.1 });
  for (let i = 0; i < 6; i++) box(gunk, 'syrup', syrup, 0.03 + (i % 3) * 0.012, 0.008, 0.035, 0.52 + i * 0.035, WIN_Y0 + 0.066, -0.07 + (i % 2) * 0.01);
  box(gunk, 'wrapper', new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 }), 0.09, 0.006, 0.02, 0.6, WIN_Y0 + 0.072, -0.06).rotation.y = 0.4;
  parts.gunk = gunk;

  // ---- inside, above the window: OPERATOR head box, AIR CURTAIN, ACTIVATION SENSOR
  const headMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.45, roughness: 0.35 });
  const op = new THREE.Group();
  op.name = 'windowOperator';
  scene.add(op);
  box(op, 'opBox', headMat, 1.2, 0.2, 0.18, -0.15, WIN_Y1 + 0.12, -0.42);
  label(op, 'OPERATOR', 0.36, -0.15, WIN_Y1 + 0.14, -0.512, { rotY: Math.PI });
  const beltWin = box(op, 'beltWindow', MAT.black, 0.3, 0.06, 0.005, 0.25, WIN_Y1 + 0.09, -0.512);
  beltWin.castShadow = false;
  parts.windowOperator = op;

  const fan = new THREE.Group();
  fan.name = 'airCurtain';
  scene.add(fan);
  box(fan, 'fanBody', new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.5 }), 1.6, 0.22, 0.26, 0, WIN_Y1 + 0.42, -0.45);
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x333333,
    map: canvasTex(256, 16, (g, w, h) => { g.fillStyle = '#bbb'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; for (let x = 2; x < w; x += 6) g.fillRect(x, 2, 3, h - 4); }) }));
  grille.rotation.x = Math.PI / 2;
  grille.position.set(0, WIN_Y1 + 0.305, -0.45);
  fan.add(grille);
  label(fan, 'AIR CURTAIN', 0.42, 0.45, WIN_Y1 + 0.44, -0.582, { rotY: Math.PI, fg: '#333' });
  const fanLed = box(fan, 'fanLED', new THREE.MeshBasicMaterial({ color: 0x334433 }), 0.03, 0.03, 0.005, -0.68, WIN_Y1 + 0.46, -0.582);
  fanLed.castShadow = false;
  // little ribbons under the fan: they flutter when it blows
  const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xf2a541, side: THREE.DoubleSide });
  parts.ribbons = [];
  for (const x of [-0.6, -0.2, 0.2, 0.6]) {
    const r = new THREE.Group();
    r.position.set(x, WIN_Y1 + 0.3, -0.4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.16), ribbonMat);
    m.position.y = -0.08;
    r.add(m);
    fan.add(r);
    parts.ribbons.push(r);
  }
  parts.airCurtain = fan;
  parts.fanLed = fanLed;

  const sensor = new THREE.Group();
  sensor.name = 'activationSensor';
  scene.add(sensor);
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 20), MAT.black);
  puck.position.set(0.55, WIN_Y1 - 0.04, -0.42);
  sensor.add(puck);
  const sLed = box(sensor, 'sensorLED', new THREE.MeshBasicMaterial({ color: 0xff3a2a }), 0.02, 0.006, 0.02, 0.55, WIN_Y1 - 0.063, -0.47);
  sLed.castShadow = false;
  parts.sensorLED = sLed;
  label(sensor, 'WAVE TO OPEN', 0.28, 0.55, WIN_Y1 - 0.13, -0.475, { rotY: Math.PI, bg: '#1f3a3d', fg: '#f7ead2', px: 30 });
  // the zone it watches, glowing on the counter (its size shows the range setting)
  const zone = new THREE.Mesh(new THREE.CircleGeometry(0.25, 28), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.16, depthWrite: false }));
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(0.55, 1.003, -0.55);
  zone.userData.seeThrough = true;
  scene.add(zone);
  parts.activationSensor = sensor;
  parts.sensorZone = zone;
}

function setRange(parts, range) {
  const s = Math.max(0.4, 1 + range * 0.55);
  parts.sensorZone.scale.set(s, s, 1);
  parts.sensorZone.position.z = -0.55 - (s - 1) * 0.18;
}

// ---------------------------------------------------------------- the window
export class DriveWindow {
  constructor(parts) {
    this.parts = parts;
    this.open = 0;            // 0 closed .. 1 fully open
    this.state = 'closed';    // closed | operating | holding | closing
    this.holdTimer = 0;
    this.fault = null;
    this.cycle = null;
    this.locked = false;
    this.settings = {};
    this.pullEffort = 1;
    this.angle = 0;
    this.onChange = null; this.onSlam = null; this.onClosed = null;
    this.ghostTimer = 6 + Math.random() * 4;
    this.slipClock = 0;
    this.t = 0;
    this.apply();
  }

  startDrag() {}
  dragTo() {}
  release() {}
  tapPull() { this.activate('wave'); }
  powerOpen() { this.activate('wave'); }
  cardRead() { this.activate('wave'); }

  startCycle() {
    this.cycle = { t: 0, opened: false, full: true, closed: false, fanRan: false, falseOpen: false,
      dead: false, stuckShort: false, fanWeak: false };
  }

  get fanRunning() { return this.fault !== 'fanWire' && this.open > 0.05; }

  // source: 'wave' (someone at the sensor), 'ghost' (sensor tripped by a passer-by), 'op' (cycled
  // from the operator's controller, which skips the sensor)
  activate(source = 'wave') {
    if (this.fault === 'sensorDead' && source === 'wave') {
      SFX.noteTick(); // a wave... and nothing
      if (this.cycle) this.cycle.dead = true;
      return;
    }
    if (this.state === 'holding') { this.holdTimer = HOLD; return; }
    if (this.state === 'operating') return;
    if (this.cycle && source === 'ghost') this.cycle.falseOpen = true;
    SFX.operatorMotor(0.9);
    this.setState('operating');
  }

  // TEST: the barista walks past behind the counter (not waving). A good sensor ignores it.
  walkBy() {
    if (this.fault === 'sensorRange') this.activate('ghost');
  }

  update(dt) {
    this.t += dt;
    if (this.cycle) this.cycle.t += dt;
    if (this.fault === 'sensorRange' && this.state === 'closed' && !this.locked) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) { this.ghostTimer = 7 + Math.random() * 5; this.activate('ghost'); }
    }
    const slipping = this.fault === 'belt';
    const max = slipping ? 0.5 : 1;
    if (slipping && (this.state === 'operating' || this.state === 'closing')) {
      this.slipClock -= dt;
      if (this.slipClock <= 0) { SFX.scuff(); this.slipClock = 0.35; }
    }
    switch (this.state) {
      case 'operating':
        this.open = Math.min(max, this.open + OPEN_SPEED * (slipping ? 0.5 : 1) * dt);
        if (this.open >= max) {
          if (this.cycle) { this.cycle.opened = true; this.cycle.full = max >= 1; }
          this.holdTimer = HOLD;
          this.setState('holding');
        }
        break;
      case 'holding':
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this.setState('closing');
        break;
      case 'closing':
        this.open = Math.max(0, this.open - CLOSE_SPEED * dt);
        if (this.fault === 'trackDebris' && this.open <= SHORT) {
          // the rollers bump up onto the gunk and the operator gives up a couple of inches short
          SFX.clunk();
          this.open = SHORT;
          if (this.cycle) this.cycle.stuckShort = true;
          this.setState('closed');
          break;
        }
        if (this.open <= 0) {
          SFX.latchClick(5);
          if (this.cycle) this.cycle.closed = true;
          this.setState('closed');
          if (this.onClosed) this.onClosed(1, 90);
        }
        break;
    }
    if (this.cycle && this.fanRunning) {
      this.cycle.fanRan = true;
      if (this.fault === 'fanDirty') this.cycle.fanWeak = true;
    }
    this.apply();
  }

  apply() {
    this.parts.sash.position.x = SASH_W / 2 - this.open * SASH_W;
    this.angle = this.open * 90;
    const on = this.fanRunning;
    this.parts.fanLed.material.color.set(on ? 0x33ff66 : 0x334433);
    const weak = this.fault === 'fanDirty'; // clogged fan: the ribbons barely stir
    this.parts.ribbons.forEach((r, i) => {
      r.rotation.x = !on ? 0 : weak ? 0.15 + Math.sin(this.t * 9 + i * 1.7) * 0.08 : 0.9 + Math.sin(this.t * 22 + i * 1.7) * 0.25;
    });
  }

  setState(s) {
    if (s === this.state) return;
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}

// ---------------------------------------------------------------- everything else
const S = (look, cam) => ({ look, cam });

const RANGE_PROCEDURE = {
  title: 'Setting the sensor range',
  start: (JOB) => ({ range: JOB.sensorRange }),
  steps: [
    { type: 'hold', label: 'Open the sensor cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
    { type: 'nudge', label: 'Turn the range knob', key: 'range', min: -3, max: 5, unit: 'clicks up',
      down: '◀ SMALLER', up: 'BIGGER ▶',
      info: (s) => (s.range === 0 ? 'Zone covers a hand-sized spot right under the sensor. Perfect.'
        : s.range > 0 ? 'Zone still spreads across the counter. People walking by will trip it.'
        : 'Zone is tiny. The barista will have to wave right up against it.'),
      apply: (s, parts) => setRange(parts, s.range) },
    { type: 'hold', label: 'Close the sensor cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
  ],
  finish(s) { return { fixed: s.range === 0, quality: Math.max(30, 100 - Math.abs(s.range) * 18), parts: [] }; },
};

const FAN_WIRING = {
  title: 'Wiring the air curtain to the window',
  start: () => ({ wire: null }),
  steps: [
    { type: 'hold', label: 'Open the air curtain\'s wiring box', tool: 'screwdriver', verb: 'OPEN', count: 1 },
    { type: 'look', label: 'Trace the fan wiring', button: 'TRACE',
      reveal: 'The fan only runs off a wall switch. Nobody ever connected it to the window\'s open switch, so it never comes on by itself.' },
    { type: 'choice', label: 'How do you fix it?', key: 'wire',
      options: [{ label: 'ADD A WINDOW SWITCH + RELAY', part: 'fanRelay', value: 'relay' },
                { label: 'LEAVE THE FAN ON ALL DAY', value: 'always' },
                { label: 'LEAVE IT', value: 'leave' }] },
    { type: 'hold', label: 'Open the window and check the fan gets power', tool: 'multimeter', verb: 'MEASURE', count: 1 },
    { type: 'hold', label: 'Close the wiring box', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
  ],
  finish(s) {
    if (s.wire === 'relay') return { fixed: true, quality: 100, parts: [] };
    if (s.wire === 'always') return { fixed: true, quality: 55, parts: [] }; // works, but loud and wastes power all day
    return { fixed: false, quality: 30, parts: [] };
  },
};

const FAN_CLEANING = {
  title: 'Cleaning the air curtain',
  start: () => ({ clean: null, lube: null }),
  steps: [
    { type: 'hold', label: 'Take off the intake grille', tool: 'screwdriver', verb: 'REMOVE', count: 2 },
    { type: 'look', label: 'Look at the grille and blower wheel', button: 'LOOK',
      reveal: 'The intake grille and the blower wheel\'s blades are matted with greasy lint. The wheel spins, but it can barely move air.' },
    { type: 'choice', label: 'What do you clean?', key: 'clean',
      options: [{ label: 'GRILLE + BLOWER WHEEL', value: 'both' }, { label: 'JUST THE GRILLE', value: 'grille' }] },
    { type: 'choice', label: 'Oil the motor bearings?', key: 'lube',
      options: [{ label: 'LUBRICATE', tool: 'lubricant', value: true }, { label: 'SKIP', value: false }] },
    { type: 'hold', label: 'Put the intake grille back', tool: 'screwdriver', verb: 'INSTALL', count: 2 },
  ],
  finish(s) {
    if (s.clean !== 'both') return { fixed: false, quality: 45, parts: [] }; // the wheel is where the air comes from
    return { fixed: true, quality: s.lube ? 100 : 90, parts: [] };
  },
};

// A dead sensor can't be adjusted back to life.
const DEAD_SENSOR = {
  title: 'Checking the activation sensor',
  start: () => ({}),
  steps: [
    { type: 'hold', label: 'Open the sensor cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
    { type: 'look', label: 'Look inside', button: 'LOOK',
      reveal: 'Coffee has dried in a sticky crust across the board. The LED stays dark whatever you set the range to. This sensor is done.' },
    { type: 'hold', label: 'Close the sensor cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
  ],
  finish() { return { fixed: false, quality: 35, parts: [] }; },
};

export default {
  id: 'coffee',
  door: { place: 'Drive-thru window', desc: 'automatic sliding pass-through window', customer: 'Daybreak Coffee', level: 5 },
  framing: {
    arrival: { cx: 0.8, xHalf: 3.2, yMin: -0.2, yMax: 3.5 },
    work: { cx: 0, xHalf: 1.15, yMin: 0.45, yMax: 2.95 },
    inside: { cx: 0, xHalf: 1.15, yMin: 0.55, yMax: 2.85 },
  },
  sideLabels: { out: 'GO INSIDE', in: 'GO TO THE LANE' },
  build,
  restStates: ['closed'],
  Door: DriveWindow,
  hints: {
    closed: 'Tap a part to select it · tap the window to open it · drag to look around',
    operating: 'Window sliding open…',
    holding: '',
    closing: 'Window sliding shut…',
  },

  components: {
    windowTrack: {
      label: 'Sash & Track',
      blurb: 'The sliding sash rides rollers in a track top and bottom, and slides behind the fixed pane.',
      side: 'out', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([0.1, 1.5, 0], [0.3, 1.55, 1.7]),
      hit: { center: [0, 1.5, -0.03], size: [1.5, 0.95, 0.12] },
    },
    windowOperator: {
      label: 'Window Operator',
      blurb: 'Motor, drive belt and controller in the head above the window. Pulls the sash open and shut.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'],
      focus: S([-0.1, 2.1, -0.45], [0.1, 1.75, -1.55]),
      hit: { center: [-0.15, WIN_Y1 + 0.12, -0.45], size: [1.25, 0.24, 0.24] },
    },
    activationSensor: {
      label: 'Activation Sensor',
      blurb: 'Points down at the counter. The barista waves under it and the window opens. Its range is adjustable.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: S([0.55, 1.9, -0.45], [0.4, 1.6, -1.4]),
      hit: { center: [0.55, WIN_Y1 - 0.06, -0.44], size: [0.3, 0.2, 0.2] },
    },
    airCurtain: {
      label: 'Air Curtain',
      blurb: 'A fan that blows a sheet of air down across the opening whenever the window is open.',
      side: 'in', actions: ['INSPECT', 'TEST', 'ADJUST'], actionLabels: { ADJUST: 'SERVICE' },
      focus: S([0, 2.4, -0.45], [0.1, 1.95, -1.6]),
      hit: { center: [0, WIN_Y1 + 0.42, -0.46], size: [1.65, 0.26, 0.3] },
    },
  },

  clues: {
    windowTrack: {
      normal: ['Track is clean, rollers turn freely.', 'Sash slides by hand with one finger once the operator is unhooked.'],
      belt: ['Track is clean, rollers turn freely.', 'Unhooked from the operator, the sash slides all the way by hand. The track isn\'t the problem.'],
      trackDebris: [
        'Dried, sticky gunk and a crushed straw wrapper caked in the bottom track near the closed end.',
        'Unhooked, the sash slides fine until the rollers bump up onto the gunk.',
      ],
    },
    windowOperator: {
      normal: ['Motor runs smooth and quiet.', 'Drive belt is tight, with no shine or cracks.'],
      belt: ['Motor keeps spinning but the window stops: you can hear the belt squeal.', 'Drive belt is shiny (glazed) with cracks across the teeth.', 'Belt has stretched loose on the pulleys.'],
      sensorRange: ['Motor runs smooth and quiet.', 'Controller count: 410 openings yesterday. The shop sold about 180 drinks.'],
      sensorDead: [
        'Cycled from the controller, the motor runs the window open and shut, smooth and quiet.',
        'Drive belt is tight, with no shine or cracks.',
        'Controller input light for the sensor never flickers, even when you wave.',
      ],
      trackDebris: [
        'Motor runs smooth. Drive belt is tight, no shine or cracks.',
        'Controller log: "OBSTRUCTION - CLOSE" over and over.',
      ],
    },
    activationSensor: {
      normal: ['Red zone light covers a small spot on the counter, right under the sensor.', 'Opens when you wave under it, not before.'],
      sensorRange: ['Red zone light spreads across most of the counter.', 'The window opens when the barista just walks past.', 'Range knob is turned almost all the way up.'],
      sensorDead: [
        'Sensor LED is dark, and there\'s no red zone light on the counter.',
        'Dried coffee splashed across the lens and down into the case.',
        'Waving under it does nothing.',
      ],
    },
    airCurtain: {
      normal: ['Fan blows a strong sheet of air down when the window opens.', 'The ribbons under it stream out while it runs.'],
      fanWire: ['Fan stays off when the window opens. Ribbons hang still.', 'It runs if you flip the wall switch by hand.', 'There\'s no wire from the window\'s switch to the fan.'],
      fanDirty: [
        'Fan comes on when the window opens, but it sounds strained.',
        'The ribbons under it barely flutter.',
        'The intake grille on top is furred over with greasy lint from the espresso bar.',
      ],
    },
  },
  toolReadings: {
    multimeter: {
      windowOperator: ['Multimeter: steady 24 VDC at the motor.'],
      activationSensor: {
        normal: ['Multimeter: 12 VDC at the sensor. Power is fine.'],
        sensorDead: ['Multimeter: 12 VDC at the sensor, but its output never switches when you wave.'],
      },
      airCurtain: {
        normal: ['Multimeter: 120 V at the fan whenever the window opens.'],
        fanWire: ['Multimeter: 0 V at the fan when the window opens. Nothing tells it to come on.'],
      },
    },
    level: { windowTrack: ['Level: the track is dead level.'] },
  },

  faults: {
    belt: {
      name: 'Worn drive belt slipping', part: 'windowOperator', doors: ['coffee'], priority: 'URGENT · RUSH',
      complaint: 'The drive-thru window only opens halfway. We\'re handing lattes through a crack and the line is around the building.',
    },
    sensorRange: {
      name: 'Activation sensor range set too far', part: 'activationSensor', doors: ['coffee'],
      complaint: 'The drive-thru window keeps opening by itself every time someone walks behind the counter.',
    },
    fanWire: {
      name: 'Air curtain not wired to the window switch', part: 'airCurtain', doors: ['coffee'],
      complaint: 'Flies keep getting in through the drive-thru window, and it\'s freezing at the counter when it\'s open.',
    },
    sensorDead: {
      name: 'Activation sensor dead (coffee spill)', part: 'activationSensor', doors: ['coffee'],
      priority: 'URGENT · RUSH', needsReplacing: true,
      complaint: 'The drive-thru window won\'t open when we wave at it anymore. We\'re prying it open by hand.',
    },
    trackDebris: {
      name: 'Gunk in the bottom track', part: 'windowTrack', doors: ['coffee'],
      complaint: 'The drive-thru window won\'t shut all the way. It stops a couple of inches open and the cold pours in.',
    },
    fanDirty: {
      name: 'Air curtain clogged with grease and lint', part: 'airCurtain', doors: ['coffee'],
      complaint: 'The fan over the drive-thru window runs, but it hardly blows. Flies come right in.',
    },
  },

  applyFault(door, fault, JOB) {
    door.fault = fault;
    JOB.sensorRange = fault === 'sensorRange' ? 3 + Math.floor(Math.random() * 2) : 0;
    JOB.beltTension = fault === 'belt' ? -2 - Math.floor(Math.random() * 2) : 0;
    setRange(door.parts, JOB.sensorRange);
    const dead = fault === 'sensorDead';
    door.parts.sensorLED.material.color.set(dead ? 0x221111 : 0xff3a2a);
    door.parts.sensorZone.visible = !dead;
    door.parts.gunk.visible = fault === 'trackDebris';
  },

  tests: {
    windowTrack: { msg: 'Cycled from the controller, watching the sash', run: (d) => d.activate('op') },
    windowOperator: { msg: 'Operator cycled from the controller', run: (d) => d.activate('op') },
    activationSensor: { msg: 'Waved under the sensor', run: (d) => d.activate('wave') },
    airCurtain: { msg: 'Window cycled, watching the air curtain', run: (d) => d.activate('op') },
  },

  checks: [
    ['opens', 'Opens all the way'],
    ['closes', 'Closes by itself'],
    ['fan', 'Air curtain runs while open'],
    ['ignores', 'Ignores people walking past'],
  ],
  testCycles: [
    { label: 'Barista waves to open for a customer', start: (d) => d.activate('wave'),
      done: (c, d) => (c.closed && d.state === 'closed') || (c.stuckShort && d.state === 'closed') || (c.dead && c.t > 2) || c.t > 20 },
    { label: 'Barista walks past behind the counter', start: (d) => d.walkBy(),
      done: (c, d) => c.t > 2.5 && d.state === 'closed' },
  ],
  record(c, index) {
    const r = {}, symptoms = [];
    if (index === 0) {
      if (c.dead) {
        r.opens = false;
        symptoms.push('The barista waved under the sensor: nothing. The window never moved.');
        return { r, symptoms };
      }
      r.opens = c.opened && c.full;
      r.closes = c.closed;
      r.fan = c.fanRan && !c.fanWeak;
      if (!c.full) symptoms.push('The window stopped halfway open. The belt squealed.');
      if (c.stuckShort) symptoms.push('The window bumped and stopped a couple of inches short of closing.');
      if (!c.fanRan) symptoms.push('The air curtain never came on while the window was open.');
      if (c.fanWeak) symptoms.push('The air curtain came on, but barely blew. The ribbons hardly moved.');
    }
    if (index === 1) {
      r.ignores = !c.falseOpen;
      if (c.falseOpen) symptoms.push('The window opened when someone just walked past.');
    }
    return { r, symptoms };
  },

  procedures: {
    windowOperator: {
      title: 'Replacing the drive belt',
      start: (JOB) => ({ belt: null, tension: JOB.beltTension }),
      steps: [
        { type: 'hold', label: 'Take the cover off the operator', tool: 'screwdriver', verb: 'REMOVE COVER', count: 2 },
        { type: 'look', label: 'Look at the drive belt', button: 'LOOK',
          reveal: 'The belt is glazed shiny and cracked across the teeth, and it has stretched loose. It slips on the pulley under load.' },
        { type: 'choice', label: 'The drive belt', key: 'belt',
          options: [{ label: 'NEW BELT', part: 'windowBelt', value: 'new' }, { label: 'JUST TIGHTEN THE OLD ONE', value: 'tighten' }] },
        { type: 'nudge', label: 'Set the belt tension', key: 'tension', min: -4, max: 3, unit: 'clicks',
          down: '◀ LOOSER', up: 'TIGHTER ▶',
          info: (s) => (s.tension === 0 ? 'Belt deflects about 1/4" when you press it. Just right.'
            : s.tension < 0 ? 'Still loose: it will slip when the window starts moving.' : 'Too tight: it will wear out the motor bearings.') },
        { type: 'hold', label: 'Put the cover back on', tool: 'screwdriver', verb: 'INSTALL COVER', count: 2 },
      ],
      finish(s) {
        if (s.belt === 'new' && s.tension === 0) return { fixed: true, quality: 100, parts: [] };
        if (s.belt === 'new') return { fixed: false, quality: 50, parts: [] };
        return { fixed: false, quality: 40, parts: [] }; // a glazed belt keeps slipping however tight
      },
    },
    // parts that can fail more than one way pick the repair for this call's fault
    activationSensor: (JOB) => (JOB.fault === 'sensorDead' ? DEAD_SENSOR : RANGE_PROCEDURE),
    airCurtain: (JOB) => (JOB.fault === 'fanDirty' ? FAN_CLEANING : FAN_WIRING),
    windowTrack: {
      title: 'Cleaning the window track',
      start: () => ({ clean: null, lube: null }),
      steps: [
        { type: 'hold', label: 'Unhook the sash from the operator', tool: 'screwdriver', verb: 'UNHOOK', count: 1 },
        { type: 'look', label: 'Look in the bottom track', button: 'LOOK',
          reveal: 'Dried syrup and a crushed straw wrapper are caked in the track near the closed end. The rollers ride up onto it and stall.' },
        { type: 'choice', label: 'Clean out the track?', key: 'clean',
          options: [{ label: 'SCRAPE IT OUT + WIPE CLEAN', value: true }, { label: 'SKIP', value: false }] },
        { type: 'choice', label: 'Lubricate the rollers?', key: 'lube',
          options: [{ label: 'LUBRICATE', tool: 'lubricant', value: true }, { label: 'SKIP', value: false }] },
        { type: 'hold', label: 'Hook the sash back up', tool: 'screwdriver', verb: 'HOOK UP', count: 1 },
      ],
      finish(s) {
        if (!s.clean) return { fixed: false, quality: 35, parts: [] }; // lube on top of syrup is still syrup
        return { fixed: true, quality: s.lube ? 100 : 85, parts: [] };
      },
    },
  },
  repairTools: {
    windowOperator: { ADJUST: ['screwdriver', 'wrench'] },
    activationSensor: { ADJUST: ['screwdriver'], REPLACE: ['screwdriver'] },
    airCurtain: { ADJUST: ['screwdriver', 'multimeter'] },
    windowTrack: { ADJUST: ['screwdriver', 'lubricant'] },
  },
  parts: {
    windowBelt: { cabinet: 'exits', name: 'Drive-thru window drive belt', cost: 38, note: 'Toothed drive belt for sliding window operators.' },
    irSensor: { cabinet: 'electrical', name: 'Wave-to-open sensor', cost: 85, note: 'Infrared activation sensor with range knob.' },
    fanRelay: { cabinet: 'electrical', name: 'Window switch + fan relay kit', cost: 34, note: 'Turns an air curtain on when a window or door opens.' },
  },
  replacements: { activationSensor: 'irSensor', windowOperator: null, airCurtain: null },

  applyRepair(door, partId, result, state, JOB) {
    if (partId === 'activationSensor') {
      if (result.replaced) {
        setRange(door.parts, 0);
        door.parts.sensorLED.material.color.set(0xff3a2a);
        door.parts.sensorZone.visible = true;
        return;
      }
      if (state.range === undefined) return; // the dead-sensor check changes nothing
      setRange(door.parts, state.range);
      if (!result.fixed && state.range > 0) door.fault = 'sensorRange';
    }
    if (partId === 'windowOperator' && !result.fixed) door.fault = 'belt';
    if (partId === 'airCurtain' && !result.fixed) door.fault = JOB.fault; // fanWire or fanDirty, still there
    if (partId === 'windowTrack') {
      if (result.fixed) door.parts.gunk.visible = false;
      else door.fault = 'trackDebris';
      if (result.fixed && door.state === 'closed' && door.open > 0) door.activate('op'); // run it shut properly
    }
  },
};
