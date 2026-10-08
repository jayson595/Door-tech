// repair.js — the hands-on repair steps (Phase 8).
//
// Each faulty part has a PROCEDURE: a list of simple steps. Every step says which tool it
// needs; the player has to have that tool in hand (from the tool bag) to do it. When the last
// step is done, finish() decides whether the repair actually FIXED the door and how good the
// work was (repair quality). The player only finds out if it worked by testing the door.
//
// Step types:
//   hold    press and hold a button to turn the screwdriver / key (count = how many screws)
//   nudge   move something a little at a time with ▲ ▼ (strike position)
//   dials   set one or more 1-10 settings with ▲ ▼, with a RUN A CYCLE button to time the door
//   look    look closely at something (no tool)
//   choice  decide: e.g. ADD SHIM or NO SHIM NEEDED
//
// A step (or a choice option) can also need a PART from the truck (`part: 'fuse3'`). The part
// has to be in hand, and it's used up (and billed) when the step is done.

import { JOB, FAULTS, FAULT_PART, pullEffortFor } from './src-faults.js';
import { SPEED_LEVELS, levelsToSettings, simulateClose, SLAM_SPEED } from './src-door.js';
import { TOOLS } from './src-tools.js';
import { PARTS, REPLACEMENT_FOR, has, usePart } from './src-truck.js';
import * as SFX from './src-audio.js';
import { SITE } from './src-sites-index.js';
import { safetyIssue } from './src-safety.js';

const HOLD_SECONDS = 0.9;        // how long to hold to turn one screw
const STRIKE_MM_TO_METERS = 0.003; // strike movement is shown 3x bigger than real so you can see it

// ---------------------------------------------------------------- procedures
function speedProcedure(kind) {
  const isOperator = kind === 'operator';
  const tool = isOperator ? 'screwdriver' : 'allenKeys';
  return {
    title: isOperator ? 'Adjusting the operator' : 'Adjusting the closer valves',
    start: () => ({ sweep: JOB.speedLevels.sweep, latch: JOB.speedLevels.latch }),
    steps: [
      isOperator
        ? { type: 'hold', label: 'Remove the operator cover', tool: 'screwdriver', verb: 'REMOVE COVER', count: 1 }
        : { type: 'look', label: 'Find the adjustment valves', button: 'FIND VALVES',
            reveal: 'Two valves on the end of the closer body: S (sweep / closing speed) and L (latch speed).' },
      { type: 'dials', label: 'Set closing speed and latch speed', tool,
        hint: 'Small adjustments, then RUN A CYCLE and time it. A proper close from 90° takes 7 to 9 seconds and eases into the latch.',
        dials: [{ key: 'sweep', label: isOperator ? 'Closing speed' : 'Sweep valve (S)' },
                { key: 'latch', label: isOperator ? 'Latch speed' : 'Latch valve (L)' }] },
      isOperator
        ? { type: 'hold', label: 'Reinstall the operator cover', tool: 'screwdriver', verb: 'INSTALL COVER', count: 1 }
        : { type: 'look', label: 'Check the closer for leaks', button: 'CHECK', reveal: 'Body is dry. No oil at the valves.' },
    ],
    finish(s) {
      // a closer that has lost its oil can't be adjusted: the valves do nothing
      if (JOB.fault === 'leak') return { fixed: false, quality: 40, parts: [] };
      const r = simulateClose(levelsToSettings(s));
      const smooth = r.arriveSpeed <= 15;
      const fixed = r.seconds >= 7 && r.seconds <= 9 && smooth;
      let quality = 100 - Math.max(0, Math.abs(r.seconds - 8) - 0.5) * 15;
      if (r.arriveSpeed > SLAM_SPEED) quality -= 30; else if (!smooth) quality -= 12;
      return { fixed, quality, parts: [] };
    },
  };
}

const PROCEDURES = {
  electricStrike: {
    title: 'Adjusting the electric strike',
    start: () => ({ pos: 0, shim: null }),
    steps: [
      { type: 'hold', label: 'Loosen the strike screws', tool: 'screwdriver', verb: 'LOOSEN', count: 2 },
      { type: 'nudge', label: 'Move the strike', key: 'pos', min: -4, max: 8, unit: 'mm',
        info: (s) => {
          const e = s.pos - JOB.strikeOffset;
          if (e <= -2) return 'Latch still rides the upper edge of the strike.';
          if (e >= 2) return 'Latch now rubs the lower edge of the strike.';
          if (e !== 0) return 'Close. Latch barely touches one edge.';
          return 'Latch lines up with the keeper opening.';
        } },
      { type: 'choice', label: 'Check latch depth',
        info: () => (JOB.shimNeeded
          ? 'Latch only catches the very front of the keeper. Engagement is shallow.'
          : 'Latch engages the keeper fully.'),
        options: [{ label: 'ADD SHIM', part: 'shim', value: true }, { label: 'NO SHIM NEEDED', value: false }],
        key: 'shim' },
      { type: 'hold', label: 'Tighten the strike screws', tool: 'screwdriver', verb: 'TIGHTEN', count: 2 },
    ],
    finish(s) {
      const e = Math.abs(s.pos - JOB.strikeOffset);
      const fixed = e <= 1 && (s.shim || !JOB.shimNeeded);
      let quality = 100 - e * 12;
      if (s.shim !== JOB.shimNeeded) quality -= 15;
      return { fixed, quality, parts: [] }; // the shim (if used) was billed when it went in
    },
  },

  doorAlignment: {
    title: 'Fixing the sagging door',
    start: () => ({ screws: null }),
    steps: [
      { type: 'look', label: 'Check the top hinge', button: 'LIFT THE DOOR',
        reveal: 'Lifting on the latch side, the top hinge leaf shifts. Its screws have backed out.' },
      { type: 'choice', label: 'Which screws go back in?', key: 'screws',
        info: () => (JOB.strippedHoles
          ? 'Two of the screw holes are stripped. Those screws just spin.'
          : 'The screws bite when you turn them. The holes are good.'),
        options: [{ label: 'LONGER SCREWS', part: 'screwsLong', value: 'long' },
                  { label: 'NEW SAME-SIZE SCREWS', part: 'screwsStd', value: 'std' },
                  { label: 'REUSE THE OLD ONES', value: 'reuse' }] },
      { type: 'hold', label: 'Hold the door up and tighten the top hinge', tool: 'screwdriver', verb: 'TIGHTEN', count: 3 },
      { type: 'hold', label: 'Check the door is plumb', tool: 'level', verb: 'CHECK PLUMB', count: 1 },
    ],
    finish(s) {
      // stripped holes: only the long screws reach solid framing, anything else sags again
      const fixed = s.screws === 'long' || !JOB.strippedHoles;
      const quality = !fixed ? 55 : s.screws === 'long' && !JOB.strippedHoles ? 92 : 100;
      return { fixed, quality, parts: [] };
    },
  },

  accessPanel: {
    title: 'Servicing the access control panel',
    start: () => ({ fuse: null }),
    steps: [
      { type: 'hold', label: 'Open the controller cover', tool: 'screwdriver', verb: 'OPEN', count: 1 },
      { type: 'look', label: 'Find the problem', button: 'LOOK',
        reveal: 'The 3A lock-output fuse is blown. The board and reader still work, but no power reaches the strike.' },
      { type: 'choice', label: 'Pull the blown fuse and push in a new one', key: 'fuse',
        options: [{ label: '3A FUSE', part: 'fuse3', value: 3 }, { label: '5A FUSE', part: 'fuse5', value: 5 }] },
      { type: 'hold', label: 'Check voltage at the strike', tool: 'multimeter', verb: 'MEASURE', count: 1 },
      { type: 'hold', label: 'Close the controller cover', tool: 'screwdriver', verb: 'CLOSE', count: 1 },
    ],
    finish(s) {
      // An oversized fuse makes it work, but it won't protect the board: a safety problem.
      if (s.fuse !== 3) safetyIssue('oversized fuse');
      return { fixed: true, quality: s.fuse === 3 ? 100 : 70, parts: [] };
    },
  },

  adaPushPlate: {
    title: 'Fixing the outside push plate',
    start: () => ({ cleaned: null }),
    steps: [
      { type: 'hold', label: 'Remove the push plate', tool: 'screwdriver', verb: 'REMOVE', count: 2 },
      { type: 'look', label: 'Check the switch behind it', button: 'LOOK',
        reveal: 'The switch contacts are corroded and one wire has worked loose from its terminal.' },
      { type: 'choice', label: 'Clean the contacts?', key: 'cleaned',
        options: [{ label: 'CLEAN CONTACTS', tool: 'lubricant', value: true }, { label: 'SKIP', value: false }] },
      { type: 'hold', label: 'Tighten the wire and remount the plate', tool: 'screwdriver', verb: 'TIGHTEN', count: 2 },
    ],
    finish(s) {
      return { fixed: true, quality: s.cleaned ? 100 : 80, parts: [] };
    },
  },

  doorOperator: speedProcedure('operator'),
  doorCloser: speedProcedure('closer'),

  panicDevice: {
    title: 'Servicing the panic device',
    start: () => ({ lubed: null }),
    steps: [
      { type: 'hold', label: 'Remove the mechanism cover', tool: 'screwdriver', verb: 'REMOVE COVER', count: 2, cover: false },
      { type: 'look', label: 'Inspect the latch mechanism', button: 'LOOK',
        reveal: 'Latch retractor is dry and gritty, and the latch adjustment has backed off. The bolt can\'t pull all the way in.' },
      { type: 'hold', label: 'Adjust the latch mechanism', tool: 'allenKeys', verb: 'ADJUST', count: 1 },
      { type: 'choice', label: 'Lubricate the retractor?', key: 'lubed',
        options: [{ label: 'LUBRICATE', tool: 'lubricant', value: true }, { label: 'SKIP', value: false }] },
      { type: 'hold', label: 'Reinstall the cover', tool: 'screwdriver', verb: 'INSTALL COVER', count: 2, cover: true },
    ],
    finish(s) {
      return { fixed: true, quality: s.lubed ? 100 : 85, parts: [] };
    },
  },
};

if (SITE) Object.assign(PROCEDURES, SITE.procedures);

// REPLACE: swap the whole part (the new one comes off the truck). Always fixes it, but it's
// overkill for an adjustment.
function replaceProcedure(comp) {
  const part = REPLACEMENT_FOR[comp.id];
  return {
    title: `Replacing the ${comp.label.toLowerCase()}`,
    start: () => ({}),
    steps: [
      { type: 'hold', label: `Remove the old ${comp.label.toLowerCase()}`, tool: 'screwdriver', verb: 'REMOVE', count: 2 },
      { type: 'hold', label: `Install the new ${comp.label.toLowerCase()}`, tool: 'screwdriver', part, verb: 'INSTALL', count: 2 },
    ],
    finish() {
      // replacing is overkill for something adjustable, but it's THE fix for a part that's shot
      const right = FAULTS[JOB.fault].needsReplacing && FAULT_PART[JOB.fault] === comp.id;
      return { fixed: true, quality: right ? 100 : 70, parts: [], replaced: true };
    },
  };
}

// ---------------------------------------------------------------- the panel
export class RepairPanel {
  constructor({ door, tools, rig, selection, parts }) {
    Object.assign(this, { door, tools, rig, selection, parts });
    this.job = null; // { comp, proc, state, step, holdsDone }
    const $ = (id) => document.getElementById(id);
    this.el = {
      panel: $('repair'), title: $('rp-title'), steps: $('rp-steps'), label: $('rp-label'),
      need: $('rp-need'), control: $('rp-control'), feedback: $('rp-feedback'),
      footer: $('bottom'), quality: $('stat-quality'),
      objective: document.querySelector('#objectives [data-obj="repair"]'),
    };
    $('rp-close').addEventListener('click', () => this.close());
    this.saved = {}; // where each repair left things, so re-doing it picks up from there
  }

  get isOpen() { return !!this.job; }

  open(comp, action) {
    if (action === 'REPLACE' && !REPLACEMENT_FOR[comp.id]) {
      this.selection.toast(`There's no ${comp.label.toLowerCase()} on the truck. It would have to be ordered.`);
      return;
    }
    let proc = action === 'REPLACE' ? replaceProcedure(comp) : PROCEDURES[comp.id];
    // a part that can fail more than one way picks the repair for THIS call's fault
    if (typeof proc === 'function') proc = proc(JOB);
    if (!proc) { this.selection.toast('Nothing to repair here.'); return; }
    if (this.safety) this.safety.checkBeforeRepair(); // no cones up = safety violation
    const state = { ...proc.start(JOB), ...(action === 'REPLACE' ? {} : this.saved[comp.id] || {}) };
    // remember which parts were already billed, so this repair's parts can be judged at the end
    this.job = { comp, proc, state, step: 0, holdsDone: 0, waitingForCycle: false, partsBefore: JOB.partsUsed.length };
    this.el.panel.classList.remove('hidden');
    this.el.footer.classList.add('repairing');
    this.el.title.textContent = proc.title;
    this.render();
  }

  close() {
    if (SITE && SITE.onRepairClosed) SITE.onRepairClosed(this.parts);
    this.job = null;
    this.el.panel.classList.add('hidden');
    this.el.footer.classList.remove('repairing');
  }

  get step() { return this.job.proc.steps[this.job.step]; }

  hasTool(tool) { return !tool || this.tools.current === tool; }

  needToolMessage(tool) {
    return `Needs the ${TOOLS[tool].toLowerCase()}. Take it out of the tool bag.`;
  }

  // ---------- drawing ----------
  render() {
    const { proc, step: index } = this.job;
    const step = this.step;
    // step dots
    this.el.steps.innerHTML = '';
    proc.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = i < index ? 'done' : i === index ? 'current' : '';
      li.textContent = i < index ? '✓' : String(i + 1);
      this.el.steps.appendChild(li);
    });
    this.el.label.textContent = `${index + 1}. ${step.label}`;
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.renderNeed();
    const c = this.el.control;
    c.innerHTML = '';
    if (step.type === 'hold') this.renderHold(c, step);
    if (step.type === 'nudge') this.renderNudge(c, step);
    if (step.type === 'dials') this.renderDials(c, step);
    if (step.type === 'look') this.renderLook(c, step);
    if (step.type === 'choice') this.renderChoice(c, step);
  }

  renderNeed() {
    if (!this.job) return;
    const step = this.step;
    const tools = step.type === 'choice'
      ? step.options.filter((o) => o.tool).map((o) => o.tool)
      : step.tool ? [step.tool] : [];
    const parts = step.type === 'choice'
      ? step.options.filter((o) => o.part).map((o) => o.part)
      : step.part ? [step.part] : [];
    const need = this.el.need;
    need.innerHTML = '';
    for (const t of tools) {
      const chip = document.createElement('span');
      const ok = this.tools.current === t;
      chip.className = `rp-chip ${ok ? 'ok' : ''}`;
      chip.textContent = ok ? `✓ ${TOOLS[t]} in hand` : `Needs: ${TOOLS[t]}`;
      need.appendChild(chip);
    }
    for (const p of parts) {
      const chip = document.createElement('span');
      const ok = has(p);
      chip.className = `rp-chip part ${ok ? 'ok' : ''}`;
      chip.textContent = ok ? `✓ ${PARTS[p].name}` : `Part: ${PARTS[p].name} (truck)`;
      need.appendChild(chip);
    }
    // a way to the truck from right here, if this step uses parts
    if (parts.length && this.truck) {
      const go = document.createElement('button');
      go.className = 'rp-truck';
      go.textContent = 'GO TO TRUCK';
      go.addEventListener('click', () => this.truck.open());
      need.appendChild(go);
    }
  }

  needPartMessage(part) {
    return `You need: ${PARTS[part].name}. Get it from the truck.`;
  }

  say(text, kind = '') {
    this.el.feedback.textContent = text;
    this.el.feedback.className = kind;
  }

  renderHold(c, step) {
    const b = document.createElement('button');
    b.className = 'rp-hold';
    // One tap starts the tool turning; the bar fills on its own (no need to keep a finger down).
    const label = () => `TAP TO ${step.verb}${step.count > 1 ? ` (${this.job.holdsDone + 1}/${step.count})` : ''}`;
    b.innerHTML = `<span class="fill"></span><span class="txt">${label()}</span>`;
    c.appendChild(b);
    let raf = null, startT = 0, lastTick = 0;
    const stop = () => { cancelAnimationFrame(raf); raf = null; b.style.setProperty('--p', 0); };
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (raf) return; // already turning
      if (!this.hasTool(step.tool)) { this.say(this.needToolMessage(step.tool), 'bad'); SFX.wrong(); return; }
      if (step.part && !has(step.part)) { this.say(this.needPartMessage(step.part), 'bad'); SFX.wrong(); return; }
      startT = performance.now();
      lastTick = 0;
      const loop = (now) => {
        const p = Math.min(1, (now - startT) / (HOLD_SECONDS * 1000));
        b.style.setProperty('--p', p);
        if (now - lastTick > 160) { SFX.toolUse(); lastTick = now; }
        if (p >= 1) {
          stop();
          this.job.holdsDone += 1;
          if (step.part && this.job.holdsDone >= step.count) usePart(step.part);
          if (step.cover !== undefined && this.job.holdsDone >= step.count) this.setPanicCover(step.cover);
          if (this.job.holdsDone >= step.count) this.next();
          else { b.querySelector('.txt').textContent = label(); this.say('One done.', 'good'); }
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
  }

  renderNudge(c, step) {
    const s = this.job.state;
    const row = document.createElement('div');
    row.className = 'rp-nudge';
    const value = document.createElement('span');
    const show = () => {
      value.textContent = `${s[step.key] > 0 ? '+' : ''}${s[step.key]} ${step.unit}`;
      this.say(step.info(s, JOB));
    };
    const mk = (txt, d) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.addEventListener('click', () => {
        const v = Math.max(step.min, Math.min(step.max, s[step.key] + d));
        if (v === s[step.key]) return;
        s[step.key] = v;
        SFX.noteTick();
        if (step.apply) step.apply(s, this.parts); // the building moves its own part
        else if (this.parts.electricStrike) this.moveStrike(s.pos);
        show();
      });
      return b;
    };
    row.append(mk(step.down || '▼ DOWN', -1), value, mk(step.up || '▲ UP', 1));
    const done = document.createElement('button');
    done.className = 'rp-done';
    done.textContent = 'DONE';
    done.addEventListener('click', () => this.next());
    c.append(row, done);
    show();
  }

  renderDials(c, step) {
    const s = this.job.state;
    if (step.hint) this.say(step.hint);
    for (const d of step.dials) {
      const row = document.createElement('div');
      row.className = 'rp-dial';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = d.label;
      const value = document.createElement('span');
      value.className = 'val';
      const pips = () => {
        value.innerHTML = '';
        for (let i = SPEED_LEVELS.min; i <= SPEED_LEVELS.max; i++) {
          const pip = document.createElement('i');
          if (i <= s[d.key]) pip.className = 'on';
          value.appendChild(pip);
        }
      };
      const mk = (txt, delta) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.addEventListener('click', () => {
          if (!this.hasTool(step.tool)) { this.say(this.needToolMessage(step.tool), 'bad'); SFX.wrong(); return; }
          const v = Math.max(SPEED_LEVELS.min, Math.min(SPEED_LEVELS.max, s[d.key] + delta));
          if (v === s[d.key]) return;
          s[d.key] = v;
          SFX.toolUse();
          this.applySpeeds(s);
          pips();
        });
        return b;
      };
      row.append(name, mk('▼', -1), value, mk('▲', 1));
      pips();
      c.appendChild(row);
    }
    const buttons = document.createElement('div');
    buttons.className = 'rp-row';
    const run = document.createElement('button');
    run.className = 'rp-secondary';
    run.textContent = 'RUN A CYCLE';
    run.addEventListener('click', () => {
      if (this.door.state !== 'closed') { this.say('Wait for the door to finish closing.'); return; }
      this.job.waitingForCycle = true;
      this.rig.go(this.job.comp.side);
      if (this.job.comp.id === 'doorOperator') this.door.powerOpen(); else this.door.tapPull();
      this.say('Timing the close…');
    });
    const done = document.createElement('button');
    done.className = 'rp-done';
    done.textContent = 'DONE ADJUSTING';
    done.addEventListener('click', () => this.next());
    buttons.append(run, done);
    c.appendChild(buttons);
  }

  renderLook(c, step) {
    const b = document.createElement('button');
    b.className = 'rp-done';
    b.textContent = step.button;
    b.addEventListener('click', () => {
      SFX.noteTick();
      this.say(step.reveal, 'info');
      b.textContent = 'NEXT';
      b.onclick = () => this.next();
    }, { once: true });
    c.appendChild(b);
  }

  renderChoice(c, step) {
    if (step.info) this.say(step.info(this.job.state, JOB), 'info');
    const row = document.createElement('div');
    row.className = 'rp-row';
    for (const opt of step.options) {
      const b = document.createElement('button');
      b.className = opt.tool ? 'rp-done' : 'rp-secondary';
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        if (opt.tool && !this.hasTool(opt.tool)) { this.say(this.needToolMessage(opt.tool), 'bad'); SFX.wrong(); return; }
        if (opt.part && !has(opt.part)) { this.say(this.needPartMessage(opt.part), 'bad'); SFX.wrong(); return; }
        if (opt.part) usePart(opt.part);
        this.job.state[step.key] = opt.value;
        if (opt.tool || opt.part) SFX.toolUse();
        if (step.key === 'shim' && opt.value) this.parts.electricStrike.position.z = -0.004;
        if (SITE && SITE.onChoice) SITE.onChoice(step.key, opt.value, this.parts);
        this.next();
      });
      row.appendChild(b);
    }
    c.appendChild(row);
  }

  // The door just latched: if we asked for a timed cycle, report the stopwatch.
  timed(seconds, from) {
    if (!this.job || !this.job.waitingForCycle) return;
    this.job.waitingForCycle = false;
    const scaled = from > 80 ? seconds : seconds * (90 / Math.max(10, from));
    const slam = this.door.settings.latchSpeed > SLAM_SPEED;
    this.say(`Stopwatch: ${scaled.toFixed(1)} s from open to latched.${slam ? ' It slammed.' : ''}`, 'info');
    this.rig.go(null, this.job.comp.focus);
  }

  // ---------- moving to the next step / finishing ----------
  next() {
    if (this.truck) this.truck.render(); // keep the Parts count honest after a part goes in
    this.job.step += 1;
    this.job.holdsDone = 0;
    if (this.job.step >= this.job.proc.steps.length) { this.finish(); return; }
    SFX.noteTick();
    this.render();
  }

  finish() {
    const { comp, proc, state } = this.job;
    const result = proc.finish(state, JOB);
    // Wrong-tool attempts during the job cost a little quality each.
    result.quality = Math.max(0, Math.round(result.quality - JOB.wrongTools * 5));
    JOB.repair = { part: comp.id, ...result };
    this.saved[comp.id] = { ...state };
    JOB.partsUsed.push(...result.parts);
    // Parts that went in on this repair: the customer pays for them only if they were the right
    // call (the repair fixed it, and it wasn't a whole-part swap where an adjustment would do).
    const overkill = (result.replaced && !FAULTS[JOB.fault].needsReplacing) || result.overkill;
    const needed = result.fixed && !overkill && FAULT_PART[JOB.fault] === comp.id;
    for (const p of JOB.partsUsed.slice(this.job.partsBefore)) if (p.needed === undefined) p.needed = needed;
    this.applyToDoor(comp.id, result, state);
    this.el.quality.textContent = `${result.quality}%`;
    this.el.quality.className = `value ${result.quality >= 80 ? 'good' : result.quality >= 60 ? '' : 'bad'}`;
    this.el.objective.classList.add('done');
    SFX.correct();
    this.close();
    this.selection.toast('Repair finished. Tap TEST DOOR to make sure it\'s right.');
    if (this.onFinish) this.onFinish();
  }

  // Make the door behave the way this repair left it.
  applyToDoor(partId, result, state) {
    const door = this.door;
    if (SITE) {
      if (result.fixed && FAULT_PART[door.fault] === partId) door.fault = null;
      if (SITE.applyRepair) SITE.applyRepair(door, partId, result, state, JOB);
      return;
    }
    if (partId === 'doorOperator' || partId === 'doorCloser') {
      const levels = result.replaced ? { ...SPEED_LEVELS.good } : { sweep: state.sweep, latch: state.latch };
      this.applySpeeds(levels);
      if (result.replaced) {           // a new closer fixes a leak
        if (door.fault === 'leak') door.fault = null;
        if (this.parts.oilStain) this.parts.oilStain.visible = false;
      }
      return;
    }
    if (result.fixed && FAULT_PART[door.fault] === partId) door.fault = null;
    if (partId === 'electricStrike' && result.fixed) this.moveStrike(JOB.strikeOffset);
    if (partId === 'doorAlignment' && result.fixed) this.parts.doorLeaf.rotation.z = 0; // hangs straight again
    if (partId === 'panicDevice') this.setPanicCover(true);
    if (partId === 'cardReader' && result.fixed && this.parts.cardReaderLED) this.parts.cardReaderLED.material.color.set(0xff3030);
  }

  applySpeeds(levels) {
    JOB.speedLevels = { sweep: levels.sweep, latch: levels.latch };
    this.door.settings = levelsToSettings(JOB.speedLevels);
    this.door.pullEffort = pullEffortFor(JOB.speedLevels);
  }

  // 3D: slide the strike on the jamb (pos in mm; the strike starts JOB.strikeOffset mm low).
  moveStrike(pos) {
    this.parts.electricStrike.position.y = (pos - JOB.strikeOffset) * STRIKE_MM_TO_METERS;
  }

  setPanicCover(on) {
    for (const m of this.parts.panicCover) m.visible = on;
    this.parts.panicInner.visible = !on;
  }
}
