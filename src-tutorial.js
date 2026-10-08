// tutorial.js — level 1 is training. A coach walks you through a service call one step at a
// time, lighting up the button to press, and moves on by itself when you've done the step.
// During training calls don't expire. SKIP turns the coach off for good.

import { JOB } from './src-faults.js';
import { saveCareer } from './src-career.js';

const STEPS = [
  { id: 'workorder', target: '#workorder',
    text: 'This is the <b>work order</b>. Read what the customer says is wrong. Tap the yellow bar to fold it away when you\'re done.',
    done: (g) => document.getElementById('workorder').classList.contains('collapsed') },
  { id: 'cones', target: '#cones-open',
    text: '<b>Safety first.</b> Tap <b>CONES</b> to set up your work area before you touch anything. Skipping safety caps your rating at 3 stars.',
    done: () => JOB.conesUp },
  { id: 'see', target: '#view',
    text: 'See the problem for yourself. <b>Tap the door</b> to open it and watch how it behaves.',
    done: (g) => g.sawDoorMove },
  { id: 'inspect', target: '#actions',
    text: 'Now find clues. <b>Tap a part</b> on the door, then press <b>INSPECT</b>. Look at <b>3 parts</b>.',
    progress: (g) => `${g.inspected()}/3 inspected`,
    done: (g) => g.inspected() >= 3 },
  { id: 'diagnose', target: '#diag-open',
    text: 'Think you know which part is causing it? Tap <b>DIAGNOSE</b> and pick it. Wrong guesses lower your accuracy, so be sure.',
    done: () => JOB.diagnosed },
  { id: 'tool', target: '#tools',
    text: 'Take a <b>tool</b> out of the bag at the bottom. The wrong tool won\'t work, and the message tells you so.',
    done: (g) => !!(g.tools && g.tools.current) },
  { id: 'repair', target: '#actions',
    text: 'Select the faulty part and press <b>ADJUST</b> (or <b>REPLACE</b> if it\'s broken) to start the repair.',
    done: (g) => (g.repair && g.repair.isOpen) || !!JOB.repair },
  { id: 'steps', target: '#repair',
    text: 'Follow the <b>repair steps</b>. If a step needs a part, tap <b>TRUCK</b>, open a cabinet and TAKE it. Walking to the truck costs time.',
    done: () => !!JOB.repair },
  { id: 'test', target: '#test-open',
    text: 'Always <b>test your work</b>. Tap <b>TEST DOOR</b> and watch every check pass. Use FAST to speed it up.',
    done: () => JOB.testPassed },
  { id: 'complete', target: '#tp-buttons',
    text: 'Every check passed. <b>Finish the job</b> to get paid.',
    done: () => JOB.completed },
  { id: 'results', target: '#rs-invoice',
    text: '<b>How you get paid:</b> labor (more stars = more pay) plus your markup on parts, minus what the parts cost to restock. Unneeded parts come out of your pocket. Stars and XP come from diagnosis, repair, safety, testing and time.',
    done: () => false, final: true },
];

export class Tutorial {
  constructor(game) {
    this.g = game; // { board, door, tools, repair, inspection, components }
    this.active = game.board.training;
    if (!this.active) return;
    this.i = 0;
    this.g.sawDoorMove = false;
    this.g.inspected = () => Object.keys(game.components).filter((id) => game.inspection.isInspected(id)).length;
    const el = document.createElement('div');
    el.id = 'coach';
    el.innerHTML = '<div class="co-head"><span class="co-step"></span><button type="button" class="co-skip">SKIP TUTORIAL</button></div><div class="co-text"></div><div class="co-prog"></div>';
    document.getElementById('stage').appendChild(el);
    el.querySelector('.co-skip').addEventListener('click', () => this.skip());
    this.el = el;
    this.started = false;
  }

  skip() {
    const c = this.g.board.career;
    c.tutorialOff = true;
    saveCareer(c);
    this.finish();
  }

  finish() {
    this.active = false;
    if (this.el) this.el.remove();
    this.light(null);
  }

  light(sel) {
    if (this.lit) this.lit.classList.remove('tut-glow');
    this.lit = sel ? document.querySelector(sel) : null;
    if (this.lit && this.lit.id !== 'view') this.lit.classList.add('tut-glow');
  }

  show() {
    const s = STEPS[this.i];
    this.el.querySelector('.co-step').textContent = `TRAINING · STEP ${this.i + 1} OF ${STEPS.length}`;
    this.el.querySelector('.co-text').innerHTML = s.text;
    this.el.classList.toggle('final', !!s.final);
    this.el.classList.toggle('at-results', s.id === 'results');
    this.light(s.target);
  }

  // every frame
  update() {
    if (!this.active) return;
    if (!JOB.startedAt) { this.el.classList.add('hidden'); return; } // still on the job board
    this.el.classList.remove('hidden');
    // sit just above the bottom controls (which grow when a part is selected)
    if (STEPS[this.i].id !== 'results') {
      const bottom = document.getElementById('bottom').getBoundingClientRect().top;
      const stage = document.getElementById('stage').getBoundingClientRect();
      const px = Math.round(stage.bottom - bottom + 8);
      if (px !== this.lastBottom) { this.el.style.bottom = `${px}px`; this.lastBottom = px; }
    } else this.el.style.bottom = '';
    if (!this.started) { this.started = true; this.door0 = this.g.door.state; this.show(); }
    if (this.g.door.state !== this.door0) this.g.sawDoorMove = true;
    // skip ahead past anything already done
    let moved = false;
    while (this.i < STEPS.length - 1 && STEPS[this.i].done(this.g)) { this.i++; moved = true; }
    if (moved) this.show();
    const s = STEPS[this.i];
    const prog = s.progress ? s.progress(this.g) : '';
    if (prog !== this.lastProg) { this.el.querySelector('.co-prog').textContent = prog; this.lastProg = prog; }
  }
}
