// main.js — starts the game: makes the 3D renderer, builds the scene, connects all the
// pieces (door, camera, selection, input), runs the timer, and draws every frame.

import * as THREE from 'three';
import { buildScene } from './src-scene.js';
import { Door } from './src-door.js';
import { CameraRig } from './src-camera.js';
import { setupComponents } from './src-components.js';
import { Selection } from './src-selection.js';
import { Inspection } from './src-inspection.js';
import { JOB, DOOR_TYPES, applyFault, complaintFor } from './src-faults.js';
import { DOOR_TYPE } from './src-scene.js';
import { Diagnosis } from './src-diagnosis.js';
import { ToolBelt } from './src-tools.js';
import { RepairPanel } from './src-repair.js';
import { DoorTest } from './src-testing.js';
import { JobBoard, Results } from './src-jobs.js';
import { Truck } from './src-truck.js';
import { animateTruck } from './src-truckScene.js';
import { setupInput } from './src-input.js';
import * as SFX from './src-audio.js';
import { SITE } from './src-sites-index.js';
import { SafetyGear } from './src-safety.js';
import { setVehicleEnv } from './src-vehicleKit.js';
import { fmtClock, perks } from './src-career.js';
import { Tutorial } from './src-tutorial.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const canvas = $('view');

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- world + game pieces ----------
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
const { scene, parts } = buildScene();
setVehicleEnv(renderer); // shiny paint + glass on the vehicles (sky reflections)
const components = setupComponents(scene, parts);
const door = SITE ? new SITE.Door(parts) : new Door(parts); // each building has its own kind of door
applyFault(door); // secretly break one thing (random each job)

function resizeRenderer() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
}
resizeRenderer();

const rig = new CameraRig(camera, { stage, topbar: $('topbar'), controls: $('controls-row'), fade: $('fade') });
const inspection = new Inspection(rig, (id) => components[id].label);
const selection = new Selection(rig, door, inspection);
door.onSlam = (strength) => rig.shake(strength);
const diagnosis = new Diagnosis(components, inspection, selection);
inspection.onChange = () => diagnosis.renderButton(); // unlock DIAGNOSE after enough inspecting
const tools = new ToolBelt((tool) => {
  SFX.toolPick();
  selection.toast(tool ? `${tools.label()} in hand` : 'Tool put away');
});
selection.tools = tools;
const repair = new RepairPanel({ door, tools, rig, selection, parts });
selection.repair = repair;
const safety = new SafetyGear(scene, { selection });
repair.safety = safety;
tools.onChangeExtra = () => repair.renderNeed();
door.onClosed = (seconds, fromAngle) => repair.timed(seconds, fromAngle);
const tester = new DoorTest({
  door, rig, selection,
  onPass: () => { safety.pickUp(); results.show(); },
});
selection.tester = tester;
repair.onFinish = () => { JOB.testPassed = false; tester.renderButton(); diagnosis.renderButton(); };
setupInput(canvas, camera, scene, door, rig, selection);

window.addEventListener('resize', () => {
  resizeRenderer();
  rig.resize();
});

// ---------- job board -> arrival ----------
// The call starts on the JOB BOARD. Accepting it starts the clock and walks the tech
// up to the door (after a moment looking at the whole storefront).
const board = new JobBoard({
  onAccept: (faultId) => {
    // This call's fault goes into the door, and its complaint onto the work order.
    applyFault(door, faultId);
    const complaint = complaintFor(faultId, DOOR_TYPE);
    $('wo-complaint').textContent = complaint;
    $('diag-complaint').textContent = complaint;
    const d = DOOR_TYPES[DOOR_TYPE];
    $('wo-door').textContent = SITE ? `${d.place} · ${d.desc}` : `${d.place} · ${d.desc}, outswing`;
    $('job-place').textContent = `SVC #1001 · ${d.place}`;
    $('job-name').textContent = d.customer;
    $('wo-customer').textContent = d.customer;
    document.querySelector('.rs-site').textContent = `${d.customer} · ${d.place}`;
    // tidy the address: a manual reload keeps this door but doesn't restart the call
    try { history.replaceState(null, '', location.pathname + (DOOR_TYPE === 'manual' ? '#door-manual' : '')); } catch (e) { /* not allowed here */ }
    $('workorder').classList.remove('collapsed'); // read the complaint first
    JOB.startedAt = performance.now();
    setTimeout(() => { if (rig.current === 'arrival') rig.go('out'); }, 1200);
  },
});
const results = new Results({ board, diagnosis });
const tutorial = new Tutorial({ board, door, tools, repair, inspection, components });
const truck = new Truck({ rig, selection, truckScene: parts.truck, onChange: () => repair.renderNeed() });
repair.truck = truck;
selection.truck = truck;

// ---------- work order panel ----------
$('wo-toggle').addEventListener('click', () => $('workorder').classList.toggle('collapsed'));

// ---------- hint line ----------
const hintEl = $('hint');
const HINTS = {
  closed: 'Tap a part to select it · tap or drag the door to open it',
  dragging: 'Let go and the closer will shut it',
  pulling: '',
  hungUp: '',
  operating: 'Operator opening the door…',
  holding: '',
  closing: 'Closer is bringing the door shut…',
};
if (SITE) Object.assign(HINTS, SITE.hints);
door.onChange = (state) => {
  hintEl.textContent = HINTS[state];
  hintEl.classList.toggle('hidden', !HINTS[state]);
};
door.onChange(door.state);

// ---------- the clock (time of day: driving + working moves it, see career.js) ----------
const timeEl = $('stat-time');
let shownMinute = -1;
function updateTimer(now) {
  if (!JOB.startedAt) return; // clock starts when the job is accepted
  // walking out to the truck adds to the clock
  const ms = (JOB.finishedAt || now) - JOB.startedAt + (JOB.timePenalty || 0);
  const m = Math.floor(board.liveClock(ms));
  if (m === shownMinute) return;
  shownMinute = m;
  timeEl.textContent = fmtClock(m);
  timeEl.classList.toggle('late', m >= perks(board.career).dayEnd - 30);
}

// ---------- main loop ----------
const clock = new THREE.Clock();
function frame(now) {
  const dt = Math.min(clock.getDelta(), 0.05); // seconds since last frame (capped after tab switches)
  const t = clock.elapsedTime;

  tester.update(dt);
  door.update(dt * tester.timeScale); // FAST button speeds the door up during a test
  rig.update(dt, t);
  selection.update(t);
  animateTruck(parts.truck, dt);

  updateTimer(now);
  tutorial.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for debugging in the browser console: DTS.select('doorCloser'), DTS.door.angle, etc.
window.DTS = { safety, THREE, scene, camera, renderer, parts, door, rig, selection, inspection, diagnosis, tools, repair, tester, board, results, truck, components, job: JOB,
  select: (id) => selection.select(id) };
