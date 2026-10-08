// tools.js — the tool bag: which tool is in the tech's hand, and which tool each job needs.
//
// Jayson: REPAIR_TOOLS is the list of tools that WORK for each part + action. Edit freely.
// Using any other tool shows "That tool will not help with this adjustment." (never fails the job).

export const TOOLS = {
  screwdriver: 'Screwdriver',
  allenKeys: 'Allen Keys',
  wrench: 'Adjustable Wrench',
  multimeter: 'Multimeter',
  level: 'Level',
  lubricant: 'Lubricant',
};

export const REPAIR_TOOLS = {
  electricStrike: {
    ADJUST: ['screwdriver'],             // loosen screws, shift the strike, shim if needed, tighten
    REMOVE: ['screwdriver'],
    REPLACE: ['screwdriver'],
  },
  doorOperator: {
    ADJUST: ['screwdriver'],             // closing speed / latch speed settings on the controller
    REPLACE: ['wrench', 'screwdriver'],
  },
  doorCloser: {
    ADJUST: ['allenKeys', 'screwdriver'], // sweep + latch valves
    REPLACE: ['wrench', 'screwdriver'],
  },
  panicDevice: {
    ADJUST: ['allenKeys', 'lubricant'],  // adjust the latch mechanism, lube the binding
    REMOVE: ['screwdriver'],             // pull the cover
    REPLACE: ['screwdriver'],
  },
  doorAlignment: {
    ADJUST: ['screwdriver'],              // hinge screws
  },
  accessPanel: {
    ADJUST: ['screwdriver'],              // open the controller and service it
    REPLACE: ['screwdriver'],
  },
  adaPushPlate: {
    ADJUST: ['screwdriver'],              // take the plate off to get at the switch
    REPLACE: ['screwdriver'],
  },
  cardReader: {
    REPLACE: ['screwdriver'],
  },
  adaPushPlateInside: {
    ADJUST: ['screwdriver'],
    REPLACE: ['screwdriver'],
  },
};

// Another building adds its own parts' tools.
import { SITE } from './src-sites-index.js';
if (SITE) Object.assign(REPAIR_TOOLS, SITE.repairTools);

// Which tool is in hand, plus the tool bar buttons.
export class ToolBelt {
  constructor(onChange) {
    this.current = null;
    this.onChange = onChange;
    this.buttons = [...document.querySelectorAll('#tools .tool[data-tool]')];
    for (const b of this.buttons) {
      b.disabled = false;
      b.addEventListener('click', () => this.pick(b.dataset.tool));
    }
  }

  // Tap a tool to take it out; tap it again to put it back.
  pick(id) {
    this.current = this.current === id ? null : id;
    for (const b of this.buttons) b.classList.toggle('in-hand', b.dataset.tool === this.current);
    if (this.onChange) this.onChange(this.current);
    if (this.onChangeExtra) this.onChangeExtra(this.current);
  }

  label() { return this.current ? TOOLS[this.current] : null; }

  // Does the tool in hand work for this part + action?
  fits(componentId, action) {
    const ok = (REPAIR_TOOLS[componentId] || {})[action] || [];
    return ok.includes(this.current);
  }
}
