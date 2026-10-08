// safety.js — barricading the work area before touching a public door.
//
// Real techs put out cones and caution tape on BOTH sides of the door
// before they start, so nobody walks into the work. The CONES button sets them up. Starting a
// repair without them is a safety violation (Safety score drops, rating capped at 3 stars).
// Every building's door sits on the z = 0 plane at x = 0, so one layout works everywhere.

import * as THREE from 'three';
import { JOB } from './src-faults.js';
import * as SFX from './src-audio.js';
import { SITE } from './src-sites-index.js';

// Add a safety problem to the job (several can stack; the results screen lists them all).
export function safetyIssue(note) {
  JOB.safetyIssues = (JOB.safetyIssues || 0) + 1;
  JOB.safetyNote = JOB.safetyNote ? `${JOB.safetyNote}, ${note}` : note;
  const el = document.getElementById('stat-safety');
  if (el) {
    const pct = Math.max(0, 100 - JOB.safetyIssues * 20);
    el.textContent = `${pct}%`;
    el.className = `value ${pct >= 80 ? 'good' : pct >= 60 ? '' : 'bad'}`;
  }
}

function makeCone(orange, white, black) {
  // an 18" (0.46 m) traffic cone
  const cone = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.26), black);
  base.position.y = 0.0125;
  cone.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.095, 0.43, 20), orange);
  body.position.y = 0.24;
  cone.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.06, 20), white); // reflective collar
  band.position.y = 0.3;
  cone.add(band);
  // cones never block a tap on the door or its parts behind them
  cone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.raycast = () => {}; } });
  return cone;
}

// Yellow CAUTION tape strung from cone top to cone top.
function tapeTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#f5c400'; g.fillRect(0, 0, 512, 48);
  g.fillStyle = '#111'; g.font = 'bold 30px Arial, sans-serif'; g.textBaseline = 'middle';
  g.fillText('CAUTION   CAUTION   CAUTION', 10, 25);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function makeTape(a, b, tex) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const mat = new THREE.MeshStandardMaterial({ map: tex.clone(), roughness: 0.5, side: THREE.DoubleSide });
  mat.map.needsUpdate = true;
  mat.map.repeat.set(len / 1.2, 1);
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), mat);
  tape.position.set((a.x + b.x) / 2, 0.4, (a.z + b.z) / 2);
  tape.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  tape.userData.seeThrough = true; // taps go through to the door
  return tape;
}

export class SafetyGear {
  constructor(scene, { selection }) {
    this.selection = selection;
    const orange = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.55 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 });
    this.group = new THREE.Group();
    this.group.name = 'safetyGear';
    this.group.visible = false;
    scene.add(this.group);
    // A line of three cones across the approach on each side of the door, with caution tape
    // between them. Kept inside x = ±0.75 so it fits the school hallway, and far enough out
    // (z ≥ 1.0) to clear the storefront door's swing.
    const tapeTex = tapeTexture();
    for (const side of [1, -1]) {
      const pts = [[-0.75, 1.0], [0, 1.25], [0.75, 1.0]].map(([x, z]) => new THREE.Vector3(x, 0, side * z));
      for (const p of pts) {
        const c = makeCone(orange, white, black);
        c.position.copy(p);
        this.group.add(c);
      }
      for (let i = 0; i < pts.length - 1; i++) this.group.add(makeTape(pts[i], pts[i + 1], tapeTex));
    }

    this.button = document.getElementById('cones-open');
    this.objective = document.querySelector('#objectives [data-obj="safety"]');
    this.button.addEventListener('click', () => this.setUp());
    this.render();
  }

  setUp() {
    if (JOB.conesUp) return;
    JOB.conesUp = true;
    this.group.visible = true;
    SFX.cabinet();
    this.selection.toast('Cones and caution tape set up on both sides of the door.');
    this.render();
  }

  // Called when a repair starts: no cones up is a safety violation (counted once per job).
  checkBeforeRepair() {
    if (JOB.conesUp || JOB.conesWarned) return;
    JOB.conesWarned = true;
    safetyIssue('no cones');
    SFX.wrong();
    this.selection.toast('Working on a public door with no cones or tape up. Safety violation.');
  }

  pickUp() { this.group.visible = false; }

  render() {
    this.button.classList.toggle('hidden', !!JOB.conesUp);
    this.objective.classList.toggle('done', !!JOB.conesUp);
  }
}
