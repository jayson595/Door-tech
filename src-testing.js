// testing.js — TEST DOOR (Phase 9).
//
// Runs the door through 3 cycles the way customers use it and checks each one:
//   opens correctly · closes correctly · latch engages · access control works · no binding
// If anything fails, the player sees WHAT the door did (the symptom), never WHY.
// Passing unlocks COMPLETE WORK ORDER.

import { JOB } from './src-faults.js';
import { SITE, HAS_OPERATOR } from './src-scene.js';
import { SLAM_SPEED } from './src-door.js';
import * as SFX from './src-audio.js';
import { SITE as BUILDING } from './src-sites-index.js';

const STORE_CHECKS = [
  ['opens', 'Door opens correctly'],
  ['closes', 'Door closes correctly'],
  ['latch', 'Latch engages'],
  ['access', 'Access control works'],
  ['binding', 'Door does not bind'],
];

// How each of the 3 cycles is started.
const STORE_CYCLES = [
  { label: 'Card read at the reader, door pulled open', start: (door) => door.cardRead(), access: true },
  HAS_OPERATOR
    ? { label: SITE.activation === 'sensor' ? 'Walking through the sensor' : 'Outside push plate pressed',
        start: (door) => door.powerOpen(SITE.activation === 'sensor' ? 'sensor' : 'outsidePlate') }
    : { label: 'Door pulled open', start: (door) => door.tapPull() },
  { label: 'Customer pulls the door open', start: (door) => door.tapPull() },
];

// Another building brings its own checks and cycles (and decides when a cycle is over and
// how it went: SITE.testCycles[i].done and SITE.record).
const CHECKS = BUILDING ? BUILDING.checks : STORE_CHECKS;
const CYCLES = BUILDING ? BUILDING.testCycles : STORE_CYCLES;

const GOOD_CLOSE = [7, 9]; // seconds from 90° to latched (Jayson's spec)

export class DoorTest {
  constructor({ door, rig, selection, onPass }) {
    Object.assign(this, { door, rig, selection, onPass });
    this.run = null;
    this.timeScale = 1;
    const $ = (id) => document.getElementById(id);
    this.el = {
      panel: $('testpanel'), cycle: $('tp-cycle'), checks: $('tp-checks'), verdict: $('tp-verdict'),
      buttons: $('tp-buttons'), fast: $('tp-fast'), footer: $('bottom'), open: $('test-open'),
      objective: document.querySelector('#objectives [data-obj="test"]'),
    };
    this.el.open.addEventListener('click', () => this.start());
    this.el.fast.addEventListener('click', () => this.setFast(this.timeScale === 1));
    this.renderButton();
  }

  get running() { return !!(this.run && !this.run.finished); }

  // The TEST DOOR button shows up once a repair has been made.
  renderButton() {
    this.el.open.classList.toggle('hidden', !JOB.repair || this.selection.selected !== null);
    this.el.open.classList.toggle('done', !!JOB.testPassed);
    this.el.open.textContent = JOB.testPassed ? '✓ PASSED' : 'TEST DOOR';
  }

  setFast(on) {
    this.timeScale = on ? 3 : 1;
    this.el.fast.classList.toggle('on', on);
    this.el.fast.textContent = on ? '⏩ 3x' : '⏩ FAST';
  }

  start() {
    if (this.running) return;
    const resting = (BUILDING && BUILDING.restStates) || ['closed'];
    if (!resting.includes(this.door.state)) { this.selection.toast('Let the door finish moving first.'); return; }
    this.selection.clear(false);
    this.rig.go('out');
    this.door.locked = true;
    JOB.testRuns = (JOB.testRuns || 0) + 1;
    this.run = { index: -1, results: [], symptoms: [], wait: 0.8, finished: false };
    this.el.panel.classList.remove('hidden');
    this.el.footer.classList.add('testing');
    this.el.verdict.textContent = '';
    this.el.verdict.className = '';
    this.el.buttons.innerHTML = '';
    this.renderChecks();
  }

  // Called every frame from main.js.
  update(dt) {
    const run = this.run;
    if (!run || run.finished) return;
    if (run.wait > 0) { run.wait -= dt * this.timeScale; return; }

    if (run.index >= 0 && !run.recorded) {
      // waiting for the current cycle to play out
      const c = this.door.cycle;
      if (BUILDING) {
        if (!CYCLES[run.index].done(c, this.door)) return;
        const { r, symptoms } = BUILDING.record(c, run.index, this.door);
        for (const s of symptoms) if (!run.symptoms.includes(s)) run.symptoms.push(s);
        run.results.push(r);
        this.renderChecks();
        run.recorded = true;
        run.wait = 0.9;
        return;
      }
      const caughtShut = ['caught', 'locked', 'dead'].includes(c.hang) && this.door.state === 'closed';
      const latched = c.closeSeconds !== null && this.door.state === 'closed';
      if (!caughtShut && !latched) return;
      this.record(c, CYCLES[run.index]);
      run.recorded = true;
      run.wait = 0.9; // short pause between cycles
      return;
    }

    // start the next cycle (or finish)
    run.index += 1;
    if (run.index >= CYCLES.length) { this.finish(); return; }
    run.recorded = false;
    this.door.startCycle();
    CYCLES[run.index].start(this.door);
    this.el.cycle.textContent = `Cycle ${run.index + 1} of ${CYCLES.length}: ${CYCLES[run.index].label}`;
    this.renderChecks();
  }

  // Grade one cycle: true (✓), false (✗) or null (couldn't check this time).
  record(c, cycleDef) {
    const r = {};
    const s = this.run.symptoms;
    // each kind of symptom is listed once (first time it happens)
    const say = (text) => { const kind = text.split(' (')[0]; if (!s.some((t) => t.split(' (')[0] === kind)) s.push(text); };
    const stayedShut = { caught: 'Door stayed caught in the frame and would not open.',
      locked: 'Door stayed locked and would not open.',
      dead: 'Outside push plate did nothing. The door never opened.' };
    if (stayedShut[c.hang]) {
      r.opens = false; r.closes = null; r.latch = null;
      r.binding = c.hang === 'caught' ? false : null;
      say(stayedShut[c.hang]);
    } else {
      r.opens = c.hang !== 'stick';
      r.binding = c.hang === null;
      if (c.hang === 'stick') say('Door hung up for a moment before it pulled free.');
      if (c.hang === 'scuff') say('Door dragged on the threshold as it swung.');
      // closing: only judge cycles that closed from (nearly) full open
      const secs = c.from > 80 ? c.closeSeconds : c.closeSeconds * (90 / Math.max(10, c.from));
      const slam = c.arriveSpeed > SLAM_SPEED;
      r.closes = secs >= GOOD_CLOSE[0] && secs <= GOOD_CLOSE[1] && c.arriveSpeed <= 15;
      if (slam) say(`Door slammed shut (${secs.toFixed(1)} s from open).`);
      else if (secs < GOOD_CLOSE[0]) say(`Door closed too fast (${secs.toFixed(1)} s from open).`);
      else if (secs > GOOD_CLOSE[1]) say(`Door closed too slowly (${secs.toFixed(1)} s from open).`);
      else if (c.arriveSpeed > 15) say('Door hit the latch hard at the end of the swing.');
      r.latch = !c.scraped;
      if (c.scraped) say('Latch scraped going into the strike.');
    }
    // access control: the strike has to release on the card read
    r.access = cycleDef.access ? !['nopower', 'reader'].includes(this.door.fault) : null;
    if (r.access === false) {
      say(this.door.fault === 'reader' ? 'Badge held up to the reader: no beep, no light, nothing.'
        : 'Card read at the reader, but the strike never released.');
    }
    this.run.results.push(r);
    this.renderChecks();
  }

  finish() {
    const run = this.run;
    run.finished = true;
    this.door.locked = false;
    this.door.cycle = null;
    const passed = CHECKS.every(([key]) => run.results.every((r) => r[key] !== false));
    JOB.testPassed = passed;
    this.el.cycle.textContent = `All ${CYCLES.length} cycles done.`;
    const v = this.el.verdict;
    const b = this.el.buttons;
    b.innerHTML = '';
    if (passed) {
      SFX.correct();
      v.className = 'good';
      v.textContent = 'PASSED. The door opens, closes and latches the way it should.';
      this.el.objective.classList.add('done');
      const done = document.createElement('button');
      done.className = 'rp-done';
      done.textContent = 'COMPLETE WORK ORDER';
      done.addEventListener('click', () => { this.close(); if (this.onPass) this.onPass(); });
      b.appendChild(done);
    } else {
      SFX.wrong();
      v.className = 'bad';
      v.innerHTML = '';
      const head = document.createElement('div');
      head.textContent = 'FAILED. What the door did:';
      v.appendChild(head);
      const ul = document.createElement('ul');
      for (const sym of run.symptoms) {
        const li = document.createElement('li');
        li.textContent = sym;
        ul.appendChild(li);
      }
      v.appendChild(ul);
      const back = document.createElement('button');
      back.className = 'rp-done';
      back.textContent = 'BACK TO WORK';
      back.addEventListener('click', () => this.close());
      b.appendChild(back);
    }
    const again = document.createElement('button');
    again.className = 'rp-secondary';
    again.textContent = 'RUN AGAIN';
    again.addEventListener('click', () => { this.close(); this.start(); });
    b.appendChild(again);
    this.renderButton();
  }

  close() {
    this.el.panel.classList.add('hidden');
    this.el.footer.classList.remove('testing');
    this.door.locked = false;
    this.renderButton();
  }

  renderChecks() {
    const list = this.el.checks;
    list.innerHTML = '';
    const results = this.run.results;
    for (const [key, label] of CHECKS) {
      const li = document.createElement('li');
      const marks = results.map((r) => (r[key] === true ? '✓' : r[key] === false ? '✗' : '–'));
      while (marks.length < CYCLES.length) marks.push('·');
      const failed = results.some((r) => r[key] === false);
      const allDone = results.length === CYCLES.length;
      const anyPass = results.some((r) => r[key] === true);
      li.className = failed ? 'bad' : allDone && anyPass ? 'good' : '';
      const name = document.createElement('span');
      name.textContent = label;
      const m = document.createElement('b');
      m.textContent = marks.join(' ');
      li.append(name, m);
      list.appendChild(li);
    }
  }
}
