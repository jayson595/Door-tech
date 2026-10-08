// faults.js — what's actually wrong with the door on this service call.
//
// Each fault has: the customer's complaint, which part is really at fault (the correct
// diagnosis), and a priority. The player never sees the fault itself: they find out by testing
// the door (door.js behaves differently) and inspecting parts (clues.js shows different notes).
// Each fault also changes what the tech has to DO to fix it (repair.js procedures).
//
// The JOB BOARD offers a few calls with different faults. For testing a specific fault, add it
// to the link, e.g.  ?fault=strike   (it becomes the first call on the board).

import { CLOSER, SPEED_LEVELS, levelsToSettings } from './src-door.js';
import { CLOSER_ID, DOOR_TYPE } from './src-scene.js';
import { param } from './src-params.js';
import { SITES, SITE } from './src-sites-index.js';

// The original prototype complaint: three different faults all sound like this to a customer.
const PULL_HARD = 'Front door does not open consistently. Sometimes customers have to pull hard.';

export const FAULTS = {
  strike: {
    name: 'Electric strike misaligned', part: 'electricStrike', complaint: PULL_HARD,
  },
  operator: {
    name: 'Operator adjusted too aggressively', part: CLOSER_ID, complaint: PULL_HARD,
  },
  panic: {
    name: 'Panic device latch binding', part: 'panicDevice', complaint: PULL_HARD,
  },
  slow: {
    name: 'Operator closing too slowly', part: CLOSER_ID,
    complaint: 'Front door takes forever to close. It is letting all the cold air in.',
  },
  sag: {
    name: 'Door sagging (loose top hinge)', part: 'doorAlignment',
    complaint: 'Front door scrapes on the floor and sometimes sticks. Feels like it is dragging.',
  },
  nopower: {
    name: 'No power to the electric strike (blown fuse)', part: 'accessPanel',
    complaint: 'Employees badge in before we open, the reader beeps green, but the door stays locked.',
  },
  plate: {
    name: 'Outside push plate not working', part: 'adaPushPlate', priority: 'HIGH · ADA', doors: ['ada'],
    complaint: 'A customer in a wheelchair said the button outside does nothing. Please come fast.',
  },
  leak: {
    name: 'Door closer leaking oil', part: 'doorCloser', doors: ['manual'], needsReplacing: true,
    complaint: 'Side door slams shut every time. There is some oily mess on the floor by it.',
  },
  reader: {
    name: 'Card reader dead (water got in)', part: 'cardReader', needsReplacing: true,
    complaint: 'Staff can\'t badge in before we open anymore. It started after that big rainstorm.',
  },
};
// every other building's faults (they say which door they belong to)
for (const site of Object.values(SITES)) Object.assign(FAULTS, site.faults);

// The doors on the job board. Riverside Market has two (same storefront door, different
// hardware); every other building adds its own. `customer` = the building, `level` = the
// career level that unlocks it.
export const DOOR_TYPES = {
  ada: { place: 'Front entrance', desc: 'aluminum storefront, ADA operator + push plates', customer: 'Riverside Market', level: 1 },
  manual: { place: 'Side entrance', desc: 'aluminum storefront, door closer', customer: 'Riverside Market', level: 1 },
};
for (const [id, site] of Object.entries(SITES)) DOOR_TYPES[id] = site.door;
// The complaint as this customer would say it on this door ("Front door..." vs "Side door...").
export function complaintFor(faultId, door) {
  const word = door === 'manual' ? 'Side door' : 'Front door';
  return FAULTS[faultId].complaint.replace(/^(Front|Side) door/, word);
}
// faults with no `doors` list are Riverside Market faults
export const canHappenOn = (faultId, door) => (FAULTS[faultId].doors || ['ada', 'manual']).includes(door);

// Which part is actually at fault for each one (what the correct diagnosis is).
export const FAULT_PART = Object.fromEntries(Object.entries(FAULTS).map(([id, f]) => [id, f.part]));

export function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const askedRaw = param('fault');
const asked = FAULTS[askedRaw] && canHappenOn(askedRaw, DOOR_TYPE) ? askedRaw : null;

// A few different { door, fault } combos from the doors in `doors`, every BUILDING once before
// any building twice. (The job board picks its calls in jobs.js; this only seeds JOB.fault.)
// NOTE: the ?fault= call is NOT slipped in here any more. It used to be, and since a reload
// into another building carries the accepted call's fault, every new call that came in while
// you drove there was a copy of the job you were already on.
export function offeredCalls(count = 3, doors = Object.keys(DOOR_TYPES)) {
  const all = [];
  for (const door of doors) {
    for (const fault of Object.keys(FAULTS)) if (canHappenOn(fault, door)) all.push({ door, fault });
  }
  const building = (door) => DOOR_TYPES[door].customer;
  const picks = [];
  const pool = shuffled(all);
  for (const c of pool) { // one per building first
    if (picks.length >= count) break;
    if (!picks.some((p) => building(p.door) === building(c.door))) picks.push(c);
  }
  for (const c of pool) {
    if (picks.length >= count) break;
    if (!picks.some((p) => p.fault === c.fault)) picks.push(c);
  }
  return picks;
}

export const JOB = {
  // replaced by the call the player accepts
  fault: asked || (offeredCalls(4, [DOOR_TYPE]).find((c) => c.door === DOOR_TYPE) || { fault: 'strike' }).fault,
  chosenByLink: Boolean(FAULTS[asked]),
  diagnosed: false,
  wrongGuesses: [],   // part ids the player wrongly blamed
  wrongTools: 0,      // times the player tried a repair with the wrong tool
  // strike fault details: how far low the strike sits (mm) and whether it needs a shim
  strikeOffset: 2 + Math.floor(Math.random() * 3),
  shimNeeded: Math.random() < 0.5,
  // sag fault: are the top hinge screw holes stripped (so the old screws won't hold)?
  strippedHoles: Math.random() < 0.5,
  // closer/operator speed levels (1-10) as they're set right now
  speedLevels: { ...SPEED_LEVELS.good },
  repair: null,       // filled in when a repair is finished (see repair.js)
  partsUsed: [],      // [{ name, cost }]
};

export const SAG_RADIANS = -0.012; // how far the sagging door tips (drawn bigger than real)

// Make the door misbehave the way this fault would (and undo anything a previous fault set).
export function applyFault(door, fault = JOB.fault) {
  JOB.fault = fault;
  if (SITE) { SITE.applyFault(door, fault, JOB); return; }
  door.fault = fault;
  JOB.speedLevels = { ...SPEED_LEVELS.good };
  door.settings = { ...CLOSER };
  door.pullEffort = 1;
  door.parts.electricStrike.position.y = 0;
  door.parts.doorLeaf.rotation.z = 0;
  if (door.parts.oilStain) door.parts.oilStain.visible = fault === 'leak';
  if (door.parts.cardReaderLED) door.parts.cardReaderLED.material.color.set(fault === 'reader' ? 0x221010 : 0xff3030);

  if (fault === 'operator' || fault === 'slow') {
    // operator: both speeds cranked all the way up, so it speeds up at the end and slams, and
    //           the spring is cranked too, so it's heavy to pull.
    // slow:     both turned all the way down, so it creeps closed and lets the weather in.
    JOB.speedLevels = fault === 'operator' ? { sweep: 10, latch: 10 } : { sweep: 1, latch: 1 };
    door.settings = levelsToSettings(JOB.speedLevels);
    door.pullEffort = pullEffortFor(JOB.speedLevels);
  }
  if (fault === 'strike') {
    // Strike sits a few mm low on the jamb (drawn 3x bigger so you can see it).
    door.parts.electricStrike.position.y = -JOB.strikeOffset * 0.003;
  }
  if (fault === 'sag') {
    // Loose top hinge: the door tips, so the latch side drops.
    door.parts.doorLeaf.rotation.z = SAG_RADIANS;
  }
}

// The harder the closer/operator is set, the harder the door is to pull open.
export function pullEffortFor(levels) {
  return Math.max(0.5, Math.min(1, 1 - (levels.sweep - SPEED_LEVELS.good.sweep) * 0.075));
}
