// selection.js — which component is picked, the yellow highlight, and the HUD that goes
// with it (selection card, that component's action buttons, the Go Inside/Outside button).

import { COMPONENTS, setGlow } from './src-components.js';
import * as SFX from './src-audio.js';
import { JOB, FAULT_PART } from './src-faults.js';
import { PARTS, REPLACEMENT_FOR } from './src-truck.js';
import { SITE } from './src-sites-index.js';

export class Selection {
  constructor(rig, door, inspection) {
    this.rig = rig;
    this.door = door;
    this.inspection = inspection;
    this.selected = null; // component object, or null
    this.hovered = null;  // mouse hover (desktop only)

    this.el = {
      card: document.getElementById('selcard'),
      name: document.getElementById('sel-name'),
      blurb: document.getElementById('sel-blurb'),
      close: document.getElementById('sel-close'),
      actions: document.getElementById('actions'),
      side: document.getElementById('side-toggle'),
      diag: document.getElementById('diag-open'),
      hint: document.getElementById('hint'),
      toast: document.getElementById('toast'),
    };
    this.el.close.addEventListener('click', () => this.clear());
    this.el.side.addEventListener('click', () => {
      this.clear(false);
      this.rig.go(this.rig.side === 'out' ? 'in' : 'out');
      this.render();
    });
    this.render();
  }

  select(id) {
    const comp = COMPONENTS[id];
    if (this.selected === comp) return;
    if (this.tester && this.tester.running) return; // hands off while the door is being tested
    if (this.repair && this.repair.isOpen) this.repair.close();
    if (this.selected) setGlow(this.selected, 0);
    this.selected = comp;
    this.rig.go(null, comp.focus);
    this.render();
    this.inspection.show(comp);
  }

  // Deselect and step back to the overview of whichever side we're on.
  clear(stepBack = true) {
    if (!this.selected) return;
    setGlow(this.selected, 0);
    this.inspection.cancel();
    if (this.repair && this.repair.isOpen) this.repair.close();
    const side = this.selected.side;
    this.selected = null;
    if (stepBack) this.rig.go(side);
    this.render();
  }

  hover(id) {
    const comp = id ? COMPONENTS[id] : null;
    if (comp === this.hovered) return;
    if (this.hovered && this.hovered !== this.selected) setGlow(this.hovered, 0);
    this.hovered = comp;
  }

  // Every frame: pulse the selected part, softly light the hovered one.
  update(t) {
    if (this.selected) setGlow(this.selected, 0.28 + Math.sin(t * 5) * 0.14);
    if (this.hovered && this.hovered !== this.selected) setGlow(this.hovered, 0.15);
  }

  render() {
    const comp = this.selected;
    this.el.card.classList.toggle('hidden', !comp);
    this.el.hint.classList.toggle('suppressed', !!comp);
    const labels = (SITE && SITE.sideLabels) || { out: 'GO INSIDE', in: 'GO OUTSIDE' };
    this.el.side.textContent = this.rig.side === 'out' ? labels.out : labels.in;
    this.el.side.classList.toggle('hidden', !!comp);
    this.el.diag.classList.toggle('hidden', !!comp);
    const cones = document.getElementById('cones-open');
    if (cones) cones.classList.toggle('sel-hidden', !!comp);
    if (this.tester) this.tester.renderButton();
    this.el.actions.innerHTML = '';
    if (!comp) return;

    this.el.name.textContent = comp.label;
    this.el.card.classList.toggle('fault-found', JOB.diagnosed && FAULT_PART[JOB.fault] === comp.id);
    this.el.blurb.textContent = comp.blurb;
    for (const action of comp.actions) {
      const b = document.createElement('button');
      b.className = 'action';
      b.textContent = (comp.actionLabels && comp.actionLabels[action]) || action;
      b.addEventListener('click', () => this.doAction(comp, action));
      this.el.actions.appendChild(b);
    }
  }

  doAction(comp, action) {
    // Control buttons (a door's OPEN / CLOSE / STOP station): press it, step back to watch.
    const control = SITE && SITE.controls && SITE.controls[comp.id] && SITE.controls[comp.id][action];
    if (control) {
      SFX.toolUse();
      this.rig.go(comp.side);
      control.run(this.door);
      this.toast(control.msg);
      return;
    }
    if (action === 'INSPECT') {
      const msg = this.inspection.inspect(comp, this.tools ? this.tools.current : null);
      if (msg) this.toast(msg);
      return;
    }
    // TEST on any part runs the door through a cycle the way that part would be used.
    //   power: the operator opens it   manual: someone pulls/pushes it open by hand
    // If something's wrong, door.js makes the door misbehave during the cycle (see faults.js).
    //   power: the operator opens it (source: which button)   pull: pulled from outside
    //   egress: pushed open from inside with the panic bar      card: badge at the reader, then pull
    const TESTS = {
      adaPushPlate:       { how: 'power', source: 'outsidePlate', msg: 'Outside push plate pressed' },
      adaPushPlateInside: { how: 'power', source: 'insidePlate', msg: 'Inside push plate pressed' },
      activationSensor:   { how: 'power', msg: 'Sensor tripped' },
      doorOperator:       { how: 'power', msg: 'Operator activated' },
      doorCloser:         { how: 'pull', msg: 'Door pulled open, watching it close' },
      panicDevice:        { how: 'egress', msg: 'Push pad pressed, door swings out', sound: 'panicBar', press: true },
      electricStrike:     { how: 'card', msg: 'Card read at the reader, door pulled' },
      accessPanel:        { how: 'card', msg: 'Card read at the reader, door pulled' },
      cardReader:         { how: 'card', msg: 'Badge tapped on the reader, door pulled' },
      doorAlignment:      { how: 'pull', msg: 'Swinging the door through a full cycle' },
    };
    if (SITE) Object.assign(TESTS, SITE.tests);
    const test = action === 'TEST' && TESTS[comp.id];
    if (test) {
      // Step back from the close-up so the whole door is in view while it cycles
      // (the part stays selected, so its buttons are still there to test again).
      this.inspection.show(comp); // stop any half-done inspection
      this.rig.go(comp.side);
      if (test.sound) SFX[test.sound](this.door.fault === 'panic');
      if (test.press) this.pressPad();
      if (test.run) test.run(this.door);
      else if (test.how === 'power') this.door.powerOpen(test.source);
      else if (test.how === 'card') this.door.cardRead();
      else this.door.tapPull(test.how);
      this.toast(test.msg);
      return;
    }
    // Some parts are too dangerous to touch at all (rolling door springs): say why, no repair.
    if (comp.danger) {
      SFX.wrong();
      this.toast(comp.danger);
      return;
    }
    // ADJUST / REMOVE / REPLACE are repairs: only once the fault has been diagnosed,
    // only on the part that's actually at fault, and only with the right tool in hand.
    if (!JOB.diagnosed) {
      this.toast('Diagnose the problem before making repairs.');
      return;
    }
    if (FAULT_PART[JOB.fault] !== comp.id) {
      this.toast('This part is working fine. No repair needed.');
      return;
    }
    if (!this.tools.current) {
      this.toast('Take a tool out of the bag first: tap one in the tool bar below. (Parts go in during the repair steps.)');
      return;
    }
    // Swapping a whole part is expensive: make sure that's really the plan.
    if (action === 'REPLACE' && REPLACEMENT_FOR[comp.id] && this.confirmReplace !== comp.id) {
      this.confirmReplace = comp.id;
      const part = PARTS[REPLACEMENT_FOR[comp.id]];
      this.toast(`REPLACE swaps the whole ${comp.label.toLowerCase()} for a new one ($${part.cost}). Tap REPLACE again if that's the plan.`);
      return;
    }
    this.confirmReplace = null;
    if (!this.tools.fits(comp.id, action)) {
      JOB.wrongTools += 1;
      SFX.wrong();
      this.toast(action === 'ADJUST' ? 'That tool will not help with this adjustment.' : 'That tool will not help with this job.');
      return;
    }
    // Right part, right tool: open the step-by-step repair.
    SFX.toolUse();
    this.repair.open(comp, action);
  }

  // The panic device's push pad dips in, then springs back.
  pressPad() {
    const pad = this.door.parts.panicPad;
    if (!pad || pad.userData.pressed) return;
    pad.userData.pressed = true;
    pad.position.z += 0.012;
    setTimeout(() => { pad.position.z -= 0.012; pad.userData.pressed = false; }, 350);
  }

  toast(text) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    // longer messages stay up longer so there's time to read them
    this.toastTimer = setTimeout(() => t.classList.remove('show'), Math.max(1800, text.length * 55));
  }
}
