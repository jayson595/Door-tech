// diagnosis.js — the DIAGNOSE PROBLEM step.
//
// The player picks which part is causing the complaint. Jayson's rule: no guessing. DIAGNOSE
// unlocks only after inspecting at least PARTS_TO_INSPECT parts, and you can only blame a part
// you've actually inspected. They can inspect and test as much as they like first. A wrong pick costs diagnosis accuracy and gets marked "ruled out", but the
// job goes on. The right pick confirms the fault and unlocks repairs.

import { JOB, FAULT_PART } from './src-faults.js';
import { CLOSER_ID } from './src-scene.js';
import * as SFX from './src-audio.js';
import { PARTS_TO_INSPECT } from './src-inspection.js';
import { SITE } from './src-sites-index.js';

// The answers offered: every part on the door can be the problem.
const SUSPECTS = SITE ? Object.keys(SITE.components) : [CLOSER_ID, 'panicDevice', 'electricStrike', 'accessPanel', 'cardReader', 'doorAlignment',
  'adaPushPlate', 'adaPushPlateInside', 'activationSensor'];
export const WRONG_GUESS_PENALTY = 25; // accuracy points lost per wrong diagnosis

export class Diagnosis {
  constructor(components, inspection, selection) {
    this.components = components;
    this.inspection = inspection;
    this.selection = selection;
    const $ = (id) => document.getElementById(id);
    this.el = {
      sheet: $('diag'), options: $('diag-options'), feedback: $('diag-feedback'),
      cancel: $('diag-cancel'), openBtn: $('diag-open'),
      objective: document.querySelector('#objectives [data-obj="diagnose"]'),
      result: $('wo-diagnosis'),
    };
    this.el.openBtn.addEventListener('click', () => this.open());
    this.el.cancel.addEventListener('click', () => this.close());
    this.renderButton();
  }

  // 100% if right the first time, minus 25% for each wrong pick.
  get accuracy() {
    return Math.max(0, 100 - JOB.wrongGuesses.length * WRONG_GUESS_PENALTY);
  }

  get unlocked() { return this.inspection.inspectedCount() >= PARTS_TO_INSPECT; }

  open() {
    if (JOB.diagnosed) return;
    if (!this.unlocked) {
      SFX.wrong();
      this.selection.toast(`Inspect the door hardware first: ${this.inspection.inspectedCount()} of ${PARTS_TO_INSPECT} parts inspected.`);
      return;
    }
    this.selection.clear();
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.renderOptions();
    this.el.sheet.classList.remove('hidden');
  }

  close() {
    this.el.sheet.classList.add('hidden');
  }

  choose(id) {
    if (JOB.diagnosed || JOB.wrongGuesses.includes(id) || !this.inspection.isInspected(id)) return;
    const label = this.components[id].label;
    if (id === FAULT_PART[JOB.fault]) {
      JOB.diagnosed = true;
      SFX.correct();
      this.el.feedback.className = 'good';
      this.el.feedback.textContent = `Confirmed: the ${label} is causing the complaint.`;
      this.renderOptions(id);
      this.renderButton();
      setTimeout(() => {
        this.close();
        this.selection.toast(`Fault found: ${label}. Time to fix it.`);
      }, 1600);
    } else {
      JOB.wrongGuesses.push(id);
      SFX.wrong();
      this.el.feedback.className = 'bad';
      this.el.feedback.textContent =
        `The ${label} doesn't explain the complaint. Accuracy now ${this.accuracy}%. Keep troubleshooting.`;
      this.renderOptions();
      this.renderButton();
    }
  }

  renderOptions(confirmedId = null) {
    const box = this.el.options;
    box.innerHTML = '';
    for (const id of SUSPECTS) {
      const comp = this.components[id];
      if (!comp) continue;
      const b = document.createElement('button');
      b.className = 'diag-option';
      const ruledOut = JOB.wrongGuesses.includes(id);
      const looked = this.inspection.isInspected(id);
      if (ruledOut) b.classList.add('ruled-out');
      if (!looked && !ruledOut) b.classList.add('not-inspected');
      if (id === confirmedId) b.classList.add('confirmed');
      const name = document.createElement('span');
      name.textContent = comp.label;
      b.appendChild(name);
      const tag = document.createElement('small');
      tag.textContent = id === confirmedId ? 'FAULT FOUND'
        : ruledOut ? 'RULED OUT'
        : looked ? 'inspected' : 'inspect first';
      b.appendChild(tag);
      b.disabled = ruledOut || JOB.diagnosed || !looked;
      b.addEventListener('click', () => this.choose(id));
      box.appendChild(b);
    }
  }

  // The DIAGNOSE button on the HUD, the objective checkbox and the work-order line.
  renderButton() {
    const btn = this.el.openBtn;
    btn.textContent = JOB.diagnosed ? '✓ FAULT FOUND'
      : this.unlocked ? 'DIAGNOSE' : `INSPECT ${this.inspection.inspectedCount()}/${PARTS_TO_INSPECT}`;
    btn.classList.toggle('done', JOB.diagnosed);
    btn.classList.toggle('locked', !JOB.diagnosed && !this.unlocked);
    btn.classList.toggle('gone', !!JOB.repair);
    this.el.objective.classList.toggle('done', JOB.diagnosed);
    const wrong = JOB.wrongGuesses.length;
    this.el.result.textContent = JOB.diagnosed
      ? `${this.components[FAULT_PART[JOB.fault]].label} · accuracy ${this.accuracy}%`
      : wrong ? `${wrong} wrong guess${wrong > 1 ? 'es' : ''} so far (accuracy ${this.accuracy}%)` : 'Not diagnosed yet.';
  }
}
