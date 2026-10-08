// sandbox.js — the building sandbox (sandbox.html). A side page for trying out a building
// without the job board, clock, money or saved career: look around it, break any of its
// faults, run the door, inspect parts and run the door test.
//
// It loads the building exactly the way the game does (scene.js + the building's own module),
// so what you see here is what the game will show. Buildings in sites/drafts.js only load here.
//
// Which building: the #door-<id>.sandbox part of the address (params.js reads it).

import * as THREE from 'three';
import { buildScene } from './src-scene.js';
import { setupComponents, setGlow } from './src-components.js';
import { SITES, DRAFTS, SITE } from './src-sites-index.js';
import { setVehicleEnv } from './src-vehicleKit.js';
import * as SFX from './src-audio.js';
import { PARTS } from './src-truck.js';

const ALL = { ...SITES, ...DRAFTS };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// No building picked (or Riverside Market, which doesn't use a building module): load the first one.
if (!SITE) {
  location.hash = `#door-${Object.keys(SITES)[0]}.sandbox`;
  location.reload();
  throw new Error('loading the sandbox building');
}
const site = SITE;
const isDraft = !!DRAFTS[site.id] && !SITES[site.id];

// ---------------------------------------------------------------- 3D
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
const { scene, parts } = buildScene();
setVehicleEnv(renderer);
const components = setupComponents(scene, parts);
const door = new site.Door(parts);
const JOB = { fault: null };

function resize() {
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- orbit camera
// The camera circles a target point: drag to turn, wheel/pinch to zoom, right-drag/two fingers to pan.
const work = (site.framing && site.framing.work) || { cx: 0 };
const orbit = { target: new THREE.Vector3(work.cx || 0, 1.3, 0), r: 5.5, theta: 0, phi: 1.35 };
function placeCamera() {
  const { target, r, theta, phi } = orbit;
  camera.position.set(
    target.x + r * Math.sin(phi) * Math.sin(theta),
    target.y + r * Math.cos(phi),
    target.z + r * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
}
function lookFrom(camV, lookV) {
  const d = camV.clone().sub(lookV);
  orbit.target.copy(lookV);
  orbit.r = Math.max(0.6, d.length());
  orbit.theta = Math.atan2(d.x, d.z);
  orbit.phi = Math.acos(THREE.MathUtils.clamp(d.y / orbit.r, -1, 1));
  placeCamera();
}
function view(side) {
  orbit.target.set(work.cx || 0, 1.3, 0);
  orbit.r = 5.5; orbit.phi = 1.38;
  orbit.theta = side === 'in' ? Math.PI : 0;
  placeCamera();
}
view('out');

const pointers = new Map();
let drag = null, pinch = 0;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  SFX.unlock();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = Math.hypot(a.x - b.x, a.y - b.y);
    drag = { pan: true, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, moved: true };
    return;
  }
  drag = { pan: e.button === 2 || e.shiftKey, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  let x = e.clientX, y = e.clientY;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) orbit.r = THREE.MathUtils.clamp(orbit.r * pinch / d, 0.6, 20);
    pinch = d;
    x = (a.x + b.x) / 2; y = (a.y + b.y) / 2;
  }
  const dx = x - drag.x, dy = y - drag.y;
  drag.x = x; drag.y = y;
  if (Math.abs(x - (drag.sx ?? x)) + Math.abs(y - (drag.sy ?? y)) > 6) drag.moved = true;
  if (drag.pan) {
    const s = orbit.r * 0.0016;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    orbit.target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
  } else {
    orbit.theta -= dx * 0.006;
    orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * 0.006, 0.15, 2.9);
  }
  placeCamera();
});
const endPointer = (e) => {
  const wasTap = drag && !drag.moved && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = 0;
  if (wasTap) pickAt(e.clientX, e.clientY);
  if (pointers.size === 0) drag = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  orbit.r = THREE.MathUtils.clamp(orbit.r * (e.deltaY > 0 ? 1.1 : 0.9), 0.6, 20);
  placeCamera();
}, { passive: false });

// Tap: a part's tap box selects it; the door itself runs the door (like the game).
const raycaster = new THREE.Raycaster();
function pickAt(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1), camera);
  const isDoor = (o) => { for (; o; o = o.parent) if (o === parts.doorLeaf) return true; return false; };
  let doorGlass = false;
  for (const hit of raycaster.intersectObject(scene, true)) {
    const o = hit.object;
    if (o.userData.componentId) { select(o.userData.componentId, false); return; }
    if (o.userData.seeThrough) { if (isDoor(o)) doorGlass = true; continue; }
    if (!o.visible) continue;
    if (isDoor(o)) { tapDoor(); return; }
    break;
  }
  if (doorGlass) tapDoor();
}

// ---------------------------------------------------------------- tap boxes
let boxesOn = false;
const proxies = [];
scene.traverse((o) => { if (o.userData.componentId && o.isMesh) proxies.push(o); });
const boxMat = new THREE.MeshBasicMaterial({ color: 0xf5b301, wireframe: true, transparent: true, opacity: 0.8, depthTest: false });
$('boxes').addEventListener('click', () => {
  boxesOn = !boxesOn;
  for (const p of proxies) { p.material = boxMat; p.visible = boxesOn; p.renderOrder = 999; }
  $('boxes').classList.toggle('on', boxesOn);
});

// ---------------------------------------------------------------- building + fault pickers
const bSel = $('building');
for (const [id, s] of Object.entries(ALL)) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = `${s.door.customer} · ${s.door.place}${DRAFTS[id] && !SITES[id] ? '  (draft)' : ''}`;
  bSel.appendChild(o);
}
bSel.value = site.id;
bSel.addEventListener('change', () => {
  location.hash = `#door-${bSel.value}.sandbox`;
  location.reload();
});
$('building-info').textContent = `${site.door.desc}. ${isDraft ? 'Draft: only in the sandbox, not on the job board yet.' : `On the job board from level ${site.door.level}.`}`;

const faults = site.faults || {};
const fSel = $('fault');
const none = document.createElement('option');
none.value = ''; none.textContent = 'Nothing broken (healthy door)';
fSel.appendChild(none);
for (const [id, f] of Object.entries(faults)) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = `${f.name}${f.priority ? ` · ${f.priority}` : ''}`;
  fSel.appendChild(o);
}
fSel.addEventListener('change', () => setFault(fSel.value || null));

function setFault(id) {
  JOB.fault = id;
  fSel.value = id || '';
  door.cycle = null;
  site.applyFault(door, id, JOB);
  const f = faults[id];
  $('hud-fault').innerHTML = `Fault: <b>${f ? esc(f.name) : 'none'}</b>`;
  $('fault-info').innerHTML = f
    ? `<q>${esc(f.complaint)}</q><br>Real cause: <b>${esc((components[f.part] || {}).label || f.part)}</b>${f.needsReplacing ? ' (needs replacing)' : ''}`
    : '<span class="muted">Every part working the way it should.</span>';
  $('test-out').innerHTML = '';
  renderParts();
  if (selected) showPart(selected);
}

// ---------------------------------------------------------------- running the door
let timeScale = 1;
$('fast').addEventListener('click', () => {
  timeScale = timeScale === 1 ? 3 : 1;
  $('fast').classList.toggle('on', timeScale !== 1);
});
function tapDoor() {
  if (test) return;
  SFX.unlock();
  door.tapPull();
}
$('tap').addEventListener('click', tapDoor);
$('cam-out').addEventListener('click', () => view('out'));
$('cam-in').addEventListener('click', () => view('in'));

// TEST DOOR, the same way testing.js runs it for a building.
let test = null;
$('test').addEventListener('click', () => {
  if (test) return;
  const resting = site.restStates || ['closed'];
  if (!resting.includes(door.state)) { $('test-out').innerHTML = '<span class="muted">Let the door finish moving first.</span>'; return; }
  door.locked = true;
  test = { i: -1, recorded: true, wait: 0.5, results: [], symptoms: [] };
  $('test').disabled = true;
  renderTest();
});
function updateTest(dt) {
  if (!test) return;
  if (test.wait > 0) { test.wait -= dt; return; }
  const cycles = site.testCycles;
  if (!test.recorded) {
    if (!cycles[test.i].done(door.cycle, door)) return;
    const { r, symptoms } = site.record(door.cycle, test.i, door);
    test.results.push(r);
    for (const s of symptoms) if (!test.symptoms.includes(s)) test.symptoms.push(s);
    test.recorded = true;
    test.wait = 0.9;
    renderTest();
    return;
  }
  test.i += 1;
  if (test.i >= cycles.length) {
    test.done = true;
    renderTest();
    door.locked = false;
    door.cycle = null;
    test = null;
    $('test').disabled = false;
    return;
  }
  test.recorded = false;
  door.startCycle();
  cycles[test.i].start(door);
  renderTest();
}
function renderTest() {
  const t = test;
  const cycles = site.testCycles;
  const marks = (key) => {
    const m = t.results.map((r) => (r[key] === true ? '✓' : r[key] === false ? '✗' : '–'));
    while (m.length < cycles.length) m.push('·');
    return m.join(' ');
  };
  let html = `<div class="muted">${t.done ? `All ${cycles.length} cycles done.` : t.i >= 0 ? `Cycle ${t.i + 1} of ${cycles.length}: ${esc(cycles[t.i].label)}` : 'Starting…'}</div><ul class="checks">`;
  for (const [key, label] of site.checks) {
    const failed = t.results.some((r) => r[key] === false);
    const passed = t.done && t.results.some((r) => r[key] === true);
    html += `<li class="${failed ? 'bad' : passed ? 'good' : ''}"><span>${esc(label)}</span><b>${marks(key)}</b></li>`;
  }
  html += '</ul>';
  if (t.done) {
    const pass = site.checks.every(([k]) => t.results.every((r) => r[k] !== false));
    html += pass ? '<div class="verdict good">PASSED</div>'
      : `<div class="verdict bad">FAILED. What the door did:</div><ul class="notes">${t.symptoms.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
  }
  $('test-out').innerHTML = html;
}

// ---------------------------------------------------------------- parts
let selected = null;
function renderParts() {
  const box = $('parts');
  box.innerHTML = '';
  const culprit = faults[JOB.fault] && faults[JOB.fault].part;
  for (const [id, c] of Object.entries(components)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = id === selected ? 'sel' : '';
    b.innerHTML = `<span>${esc(c.label)}</span>${id === culprit ? '<span class="culprit">FAULT HERE</span>' : `<small>${c.side === 'in' ? 'inside' : 'outside'}</small>`}`;
    b.addEventListener('click', () => select(id, true));
    box.appendChild(b);
  }
}

function select(id, moveCamera) {
  if (selected && components[selected]) setGlow(components[selected], 0);
  selected = id;
  renderParts();
  showPart(id);
  const c = components[id];
  if (moveCamera && c.focus) lookFrom(c.focus.camV, c.focus.lookV);
}

function listFor(table, id) {
  const t = table && table[id];
  if (!t) return null;
  return Array.isArray(t) ? t : t[JOB.fault] || t.normal;
}

function showPart(id) {
  const c = components[id];
  const out = $('part-detail');
  let html = `<div style="margin-top:6px"><b>${esc(c.label)}</b></div><div class="muted">${esc(c.blurb || '')}</div>`;
  if (c.danger) html += `<div class="cause" style="margin-top:6px"><b>Danger:</b> ${esc(c.danger)}</div>`;
  const clues = listFor(site.clues, id);
  html += '<div class="title" style="margin-top:10px;font-size:11px;letter-spacing:.12em;color:var(--amber)">WHAT THE TECH SEES (INSPECT)</div>';
  html += clues ? `<ul class="notes">${clues.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<div class="muted">No clues written for this part yet.</div>';
  const readings = [];
  for (const [tool, byPart] of Object.entries(site.toolReadings || {})) {
    const r = listFor(byPart, id);
    if (r) readings.push(...r);
  }
  if (readings.length) html += `<ul class="notes">${readings.map((l) => `<li class="reading">${esc(l)}</li>`).join('')}</ul>`;

  // TEST / control buttons for this part
  const partTest = site.tests && site.tests[id];
  const controls = site.controls && site.controls[id];
  html += '<div class="row" style="margin-top:8px" id="part-buttons"></div>';

  // the repair steps (for this call's fault, if this is the faulty part)
  let proc = site.procedures && site.procedures[id];
  if (typeof proc === 'function') proc = proc(JOB);
  if (proc) {
    html += `<div class="title" style="margin-top:10px;font-size:11px;letter-spacing:.12em;color:var(--amber)">REPAIR: ${esc(proc.title.toUpperCase())}</div>`;
    html += `<ol class="steps">${proc.steps.map((s) => `<li>${esc(s.label)}${s.tool ? ` <span class="muted">(${esc(s.tool)})</span>` : ''}</li>`).join('')}</ol>`;
  }
  const rep = site.replacements && id in site.replacements;
  if (rep) {
    const p = site.replacements[id] && PARTS[site.replacements[id]];
    html += `<div class="muted" style="margin-top:6px">REPLACE: ${p ? `${esc(p.name)} ($${p.cost})` : site.replacements[id] ? esc(site.replacements[id]) : 'not stocked on the truck'}</div>`;
  }
  out.innerHTML = html;
  const row = $('part-buttons');
  if (partTest) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'TEST';
    b.addEventListener('click', () => { if (!test) { SFX.unlock(); partTest.run(door); toast(partTest.msg); } });
    row.appendChild(b);
  }
  for (const [name, ctl] of Object.entries(controls || {})) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => { if (!test) { SFX.unlock(); ctl.run(door); toast(ctl.msg); } });
    row.appendChild(b);
  }
}

function toast(msg) {
  const el = $('hud-state');
  el.dataset.msg = msg;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { delete el.dataset.msg; }, 2500);
}

// ---------------------------------------------------------------- building checklist
// Catches the usual mistakes when making a new building, before it goes in the game.
function checklist() {
  const warn = [];
  const need = ['id', 'door', 'build', 'Door', 'components', 'clues', 'faults', 'applyFault', 'tests', 'checks', 'testCycles', 'record'];
  for (const k of need) if (!site[k]) warn.push(`Missing "${k}" in the building file.`);
  for (const k of ['place', 'desc', 'customer', 'level']) if (site.door && site.door[k] == null) warn.push(`door.${k} is not set.`);
  for (const [id, c] of Object.entries(site.components || {})) {
    if (!parts[id]) warn.push(`Part "${id}" has no 3D object: build() should set parts.${id}.`);
    if (!c.hit) warn.push(`Part "${c.label}" has no tap box (hit).`);
    if (!c.focus) warn.push(`Part "${c.label}" has no camera spot (focus).`);
    if (!(site.clues || {})[id]) warn.push(`Part "${c.label}" has no inspection clues.`);
    if ((c.actions || []).includes('TEST') && !(site.tests || {})[id]) warn.push(`Part "${c.label}" has a TEST button but no test.`);
  }
  for (const [id, f] of Object.entries(faults)) {
    if (!(f.doors || []).includes(site.id)) warn.push(`Fault "${id}" doesn't list doors: ['${site.id}'], so it won't come up on the job board.`);
    if (!components[f.part]) { warn.push(`Fault "${id}" blames "${f.part}", which isn't one of the parts.`); continue; }
    if (!((site.clues || {})[f.part] || {})[id]) warn.push(`Fault "${id}": the faulty part (${components[f.part].label}) shows no special clues for it.`);
    const proc = (site.procedures || {})[f.part];
    if (!proc && !f.needsReplacing) warn.push(`Fault "${id}": no repair steps for ${components[f.part].label}, and it isn't marked needsReplacing.`);
    if (f.needsReplacing && !(site.replacements || {})[f.part]) {
      warn.push(`Fault "${id}" needs replacing, but ${components[f.part].label} has no replacement part on the truck.`);
    }
    if (!f.complaint) warn.push(`Fault "${id}" has no customer complaint.`);
  }
  if (!Object.keys(faults).length) warn.push('No faults yet.');
  $('checklist').innerHTML = warn.length
    ? `<ul class="warn">${warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
    : `<div class="ok">✓ Looks complete: ${Object.keys(components).length} parts, ${Object.keys(faults).length} faults, ${site.testCycles.length} test cycles.</div>`;
}

// ---------------------------------------------------------------- go
setFault(null);
renderParts();
checklist();
const hints = site.hints || {};
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * timeScale;
  updateTest(dt);
  door.update(dt);
  if (selected && components[selected]) setGlow(components[selected], 0.28 + Math.sin(clock.elapsedTime * 5) * 0.14);
  const el = $('hud-state');
  const text = el.dataset.msg || `${door.state}${hints[door.state] ? ` · ${hints[door.state]}` : ''}`;
  if (el.dataset.shown !== text) { el.dataset.shown = text; el.innerHTML = `Door: <b>${esc(text)}</b>`; }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.SANDBOX = { site, door, parts, components, scene, camera, JOB, setFault };
