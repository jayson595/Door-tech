// inspection.js — what happens when the player taps INSPECT on a part.
//
// The camera leans in closer, an "Inspecting…" bar fills, then the observations for that part
// (from clues.js) appear one at a time on the part's card. Everything found is written into the
// FINDINGS list in the work order, so the player can look back over it before diagnosing.
//
// With a MEASURING tool in hand (multimeter, level), INSPECT takes a reading instead, and the
// reading is added to that part's findings.

import { cluesFor, readingsFor } from './src-clues.js';
import { TOOLS } from './src-tools.js';
import * as SFX from './src-audio.js';

const LOOK_TIME = 1.1;          // seconds of "Inspecting…" before the first note shows
const NOTE_GAP = 0.6;           // seconds between notes
export const PARTS_TO_INSPECT = 3; // inspecting this many parts checks off the first objective
const MEASURING = ['multimeter', 'level'];

export class Inspection {
  constructor(rig, labelOf) {
    this.rig = rig;
    this.labelOf = labelOf;  // id -> display name
    this.findings = {};      // componentId -> list of notes
    this.order = [];         // ids in the order they were first inspected
    this.done = new Set();   // 'partId' (looked over) and 'partId:tool' (readings taken)
    this.timers = [];
    this.busy = null;        // id currently being inspected
    const $ = (id) => document.getElementById(id);
    this.el = {
      notes: $('sel-notes'), blurb: $('sel-blurb'), badge: $('sel-badge'),
      progress: $('sel-progress'), progressLabel: document.querySelector('#sel-progress span'),
      findings: $('findings'), count: $('wo-count'),
      objective: document.querySelector('#objectives [data-obj="inspect"]'),
    };
    this.renderFindings();
  }

  isInspected(id) { return this.done.has(id); }

  // How many parts have been looked over (readings alone don't count).
  inspectedCount() { return this.order.filter((id) => this.done.has(id)).length; }

  // The card for `comp` just opened: show what we already know about it.
  show(comp) {
    this.cancel();
    this.el.progress.classList.add('hidden');
    this.fillNotes(this.findings[comp.id] || []);
    this.el.badge.classList.toggle('hidden', !this.isInspected(comp.id));
  }

  // Returns a message for the player if the tool in hand can't measure this part.
  inspect(comp, tool = null) {
    if (this.busy === comp.id) return null;
    const readings = tool ? readingsFor(tool, comp.id) : null;
    let message = null;
    if (tool && MEASURING.includes(tool) && !readings) {
      message = `The ${TOOLS[tool].toLowerCase()} won't tell you anything here. Looking it over instead.`;
    }
    const key = readings ? `${comp.id}:${tool}` : comp.id;
    if (this.done.has(key)) { this.show(comp); return message; } // already have these notes
    this.cancel();
    this.busy = comp.id;

    // Lean in for a closer look.
    const f = comp.focus;
    this.rig.go(null, { side: comp.side, camV: f.camV.clone().lerp(f.lookV, 0.3), lookV: f.lookV });

    const before = this.findings[comp.id] || [];
    this.fillNotes(before);
    this.el.progressLabel.textContent = readings ? `Checking with the ${TOOLS[tool].toLowerCase()}…` : 'Inspecting…';
    const bar = this.el.progress;
    bar.classList.remove('hidden', 'run');
    void bar.offsetWidth; // restart the fill animation
    bar.style.setProperty('--look', `${LOOK_TIME}s`);
    bar.classList.add('run');

    const lines = readings || cluesFor(comp.id);
    this.later(LOOK_TIME, () => bar.classList.add('hidden'));
    lines.forEach((line, i) => this.later(LOOK_TIME + i * NOTE_GAP, () => {
      this.addNote(line);
      SFX.noteTick();
    }));
    this.later(LOOK_TIME + (lines.length - 1) * NOTE_GAP + 0.1, () => {
      this.findings[comp.id] = before.concat(lines);
      if (!this.order.includes(comp.id)) this.order.push(comp.id);
      this.done.add(key);
      this.busy = null;
      this.el.badge.classList.toggle('hidden', !this.isInspected(comp.id));
      this.renderFindings();
    });
    return message;
  }

  // Stop a half-finished inspection (player tapped away). Nothing gets recorded.
  cancel() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.busy = null;
  }

  // ---------- drawing ----------
  later(seconds, fn) { this.timers.push(setTimeout(fn, seconds * 1000)); }

  fillNotes(lines) {
    this.el.notes.innerHTML = '';
    lines.forEach((l) => this.addNote(l, false));
    this.el.blurb.classList.toggle('hidden', lines.length > 0 || this.busy !== null);
  }

  addNote(text, animate = true) {
    const li = document.createElement('li');
    li.textContent = text;
    if (animate) li.className = 'fresh';
    if (/^(Multimeter|Level):/.test(text)) li.classList.add('reading');
    this.el.notes.appendChild(li);
    this.el.blurb.classList.add('hidden');
  }

  renderFindings() {
    const list = this.el.findings;
    list.innerHTML = '';
    if (this.order.length === 0) {
      list.innerHTML = '<li class="empty">Nothing inspected yet.</li>';
    }
    for (const id of this.order) {
      const li = document.createElement('li');
      const name = document.createElement('b');
      name.textContent = this.labelOf(id);
      li.appendChild(name);
      const ul = document.createElement('ul');
      for (const note of this.findings[id]) {
        const n = document.createElement('li');
        n.textContent = note;
        ul.appendChild(n);
      }
      li.appendChild(ul);
      list.appendChild(li);
    }
    this.el.count.textContent = this.order.length ? `${this.order.length}` : '';
    this.el.count.classList.toggle('hidden', !this.order.length);
    this.el.objective.classList.toggle('done', this.inspectedCount() >= PARTS_TO_INSPECT);
    if (this.onChange) this.onChange();
  }
}
