// truck.js — the service truck: parts catalog, side cabinets, and what the tech is carrying.
//
// GO TO TRUCK walks out to the curb (costs time on the job clock). Tap a cabinet to open it,
// TAKE the parts you think you need (up to CARRY_LIMIT), then head back to the door.
// Repairs need the part in hand (repair.js). Parts you carry but don't install go back on the
// truck for free; parts you install are billed on the work order.
//
// Jayson: PARTS is the truck's stock list. Add or change parts freely.

import { JOB } from './src-faults.js';
import { CABINETS, TRUCK_VIEW, cabinetView } from './src-truckScene.js';
import * as SFX from './src-audio.js';
import { SITES, SITE } from './src-sites-index.js';

import { loadCareer, perks } from './src-career.js';
// how many parts you can carry, and the time a walk to the truck costs, depend on the truck upgrades
export const CARRY_LIMIT = perks(loadCareer()).carry;
export const TRUCK_WALK_MS = 45000 * perks(loadCareer()).walkScale; // each trip out to the truck adds this to the job clock

export const PARTS = {
  shim:       { cabinet: 'fasteners',  name: 'Strike shims (pack)', cost: 2,
                note: 'Thin steel shims that bring a strike out toward the latch.' },
  screwsLong: { cabinet: 'fasteners',  name: 'Hinge screws, #12 x 2-1/2"', cost: 4,
                note: 'Long screws that reach past the jamb into solid framing.' },
  screwsStd:  { cabinet: 'fasteners',  name: 'Hinge screws, #12 x 3/4"', cost: 2,
                note: 'Same size as the factory hinge screws.' },
  fuse3:      { cabinet: 'electrical', name: '3A blade fuse', cost: 3, note: 'Mini blade fuse, 3 amp.' },
  fuse5:      { cabinet: 'electrical', name: '5A blade fuse', cost: 3, note: 'Mini blade fuse, 5 amp.' },
  board:      { cabinet: 'electrical', name: 'Access control board', cost: 260,
                note: 'Single-door controller board.' },
  newStrike:  { cabinet: 'locks',      name: 'Electric strike, 24 VDC', cost: 165, note: 'Complete strike body.' },
  newPanic:   { cabinet: 'exits',      name: 'Touchpad rim exit device, 36"', cost: 385, note: 'Complete device.' },
  newPlate:   { cabinet: 'exits',      name: 'ADA push plate with switch', cost: 95, note: '4-1/2" square plate.' },
  newCloser:  { cabinet: 'exits',      name: 'Surface door closer, parallel arm', cost: 240,
                note: 'Heavy-duty closer body + parallel arm.' },
  newReader:  { cabinet: 'electrical', name: 'Proximity card reader, weatherproof', cost: 120,
                note: 'Outdoor-rated badge reader with sealed cable entry.' },
};

// Every building's special parts ride on the truck too (handy decoys elsewhere).
for (const site of Object.values(SITES)) Object.assign(PARTS, site.parts);

// What a REPLACE needs (null = not stocked on the truck).
export const REPLACEMENT_FOR = {
  electricStrike: 'newStrike',
  panicDevice: 'newPanic',
  adaPushPlate: 'newPlate',
  adaPushPlateInside: 'newPlate',
  accessPanel: 'board',
  cardReader: 'newReader',
  doorOperator: null,
  doorCloser: 'newCloser',
};
if (SITE) Object.assign(REPLACEMENT_FOR, SITE.replacements);

// ---------------------------------------------------------------- what's in hand
JOB.carried = {};       // partId -> how many the tech is carrying
JOB.timePenalty = 0;    // ms added to the clock for walking to the truck
JOB.safetyIssues = 0;

export const carriedCount = () => Object.values(JOB.carried).reduce((a, b) => a + b, 0);
export const has = (id) => (JOB.carried[id] || 0) > 0;

// Install a carried part: it leaves your hands and goes on the bill.
export function usePart(id) {
  if (!has(id)) return false;
  JOB.carried[id] -= 1;
  JOB.partsUsed.push({ name: PARTS[id].name, cost: PARTS[id].cost });
  return true;
}

// ---------------------------------------------------------------- the truck view
export class Truck {
  constructor({ rig, selection, truckScene, onChange }) {
    Object.assign(this, { rig, selection, truckScene, onChange });
    this.isOpen = false;
    this.cabinet = null;
    this.returnTo = null;
    rig.views.truck = { side: 'truck', pos: TRUCK_VIEW.pos, look: TRUCK_VIEW.look };
    const $ = (id) => document.getElementById(id);
    this.el = {
      panel: $('truckpanel'), cabinets: $('tk-cabinets'), items: $('tk-items'), load: $('tk-load'),
      footer: $('bottom'), pouch: $('parts-pouch'), pouchCount: $('pouch-count'), back: $('tk-back'),
      onHand: $('wo-parts'),
    };
    $('truck-open').addEventListener('click', () => this.open());
    this.el.back.addEventListener('click', () => this.close());
    this.el.pouch.addEventListener('click', () => this.showPouch());
    // tag the 3D cabinet doors so tapping them opens that cabinet
    for (const [id, pivot] of Object.entries(truckScene.doors)) {
      pivot.traverse((o) => { if (o.isMesh) o.userData.cabinetId = id; });
    }
    this.render();
  }

  // Walk out to the truck. `returnTo` = where to come back to (a repair in progress, etc.)
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    JOB.timePenalty += TRUCK_WALK_MS;
    this.returnTo = this.selection.repair && this.selection.repair.isOpen ? this.selection.repair.job.comp : null;
    if (!this.returnTo) this.selection.clear(false);
    this.rig.go('truck');
    this.el.footer.classList.add('at-truck');
    document.getElementById('workorder').classList.add('collapsed'); // keep the truck in view
    this.el.panel.classList.remove('hidden');
    this.selection.toast(`Walked out to the truck (+${TRUCK_WALK_MS / 1000} s on the clock)`);
    this.openCabinet(null);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.openCabinet(null);
    this.el.footer.classList.remove('at-truck');
    this.el.panel.classList.add('hidden');
    // back to the repair we left, or to the front of the store
    if (this.returnTo) this.rig.go(null, this.returnTo.focus);
    else this.rig.go('out');
    this.selection.render(); // refresh GO INSIDE / GO OUTSIDE for the side we came back to
    if (this.selection.repair && this.selection.repair.isOpen) this.selection.repair.render();
  }

  openCabinet(id) {
    this.cabinet = id;
    for (const [cid, pivot] of Object.entries(this.truckScene.doors)) pivot.userData.target = cid === id ? 1 : 0;
    if (id) SFX.cabinet();
    // lean in to look at what's on the shelves (back out to the whole truck when closed)
    if (this.isOpen) {
      if (id) this.rig.go(null, cabinetView(id));
      else this.rig.go('truck');
    }
    this.render();
  }

  take(id) {
    if (carriedCount() >= CARRY_LIMIT) { this.selection.toast(`You can only carry ${CARRY_LIMIT} parts.`); return; }
    JOB.carried[id] = (JOB.carried[id] || 0) + 1;
    SFX.toolPick();
    this.render();
  }

  putBack(id) {
    if (!has(id)) return;
    JOB.carried[id] -= 1;
    this.render();
  }

  // Tool bar "Parts" pouch: what am I carrying?
  showPouch() {
    const list = Object.entries(JOB.carried).filter(([, n]) => n > 0)
      .map(([id, n]) => `${n > 1 ? `${n} x ` : ''}${PARTS[id].name}`);
    this.selection.toast(list.length ? `On hand: ${list.join(', ')}` : 'No parts on hand. Get them from the truck.');
  }

  render() {
    const n = carriedCount();
    this.el.load.textContent = `Carrying ${n}/${CARRY_LIMIT}`;
    this.el.pouchCount.textContent = n ? String(n) : '';
    this.el.pouchCount.classList.toggle('hidden', !n);
    const list = Object.entries(JOB.carried).filter(([, k]) => k > 0)
      .map(([id, k]) => `${k > 1 ? `${k} x ` : ''}${PARTS[id].name}`);
    this.el.onHand.textContent = list.length ? list.join(', ') : 'Nothing yet. Parts come from the truck.';
    if (this.onChange) this.onChange();

    // cabinet buttons
    const cab = this.el.cabinets;
    cab.innerHTML = '';
    for (const c of CABINETS) {
      const b = document.createElement('button');
      b.className = `tk-cab ${this.cabinet === c.id ? 'open' : ''}`;
      b.textContent = c.label;
      b.addEventListener('click', () => this.openCabinet(this.cabinet === c.id ? null : c.id));
      cab.appendChild(b);
    }
    // items in the open cabinet
    const items = this.el.items;
    items.innerHTML = '';
    if (!this.cabinet) {
      items.innerHTML = '<li class="tk-hint">Tap a cabinet to open it.</li>';
      return;
    }
    for (const [id, p] of Object.entries(PARTS)) {
      if (p.cabinet !== this.cabinet) continue;
      const li = document.createElement('li');
      const info = document.createElement('div');
      info.innerHTML = '<b></b><small></small>';
      info.querySelector('b').textContent = p.name;
      info.querySelector('small').textContent = `$${p.cost} · ${p.note}`;
      const ctl = document.createElement('div');
      ctl.className = 'tk-ctl';
      const count = JOB.carried[id] || 0;
      if (count) {
        const minus = document.createElement('button');
        minus.textContent = '−';
        minus.addEventListener('click', () => this.putBack(id));
        const num = document.createElement('span');
        num.textContent = count;
        ctl.append(minus, num);
      }
      const plus = document.createElement('button');
      plus.className = 'take';
      plus.textContent = count ? '+' : 'TAKE';
      plus.addEventListener('click', () => this.take(id));
      ctl.appendChild(plus);
      li.append(info, ctl);
      items.appendChild(li);
    }
  }
}
