// career.js — the workday, the money, and the truck upgrades. Saved in this browser.
//
// THE DAY: 8:00 AM to 5:00 PM. Driving to a call takes time, and the clock runs while you work
// (CLOCK_RATE: 1 real second = 12 seconds on the clock, so a 5-minute job uses an hour).
// Calls come in through the day, each with a deadline: get there in time or the customer
// calls someone else (a LOST job, and your reputation drops). After the last-call time no new
// calls come in; at the end of the day you get the day's report and pay for fuel.
//
// THE MONEY: you keep labor + your markup on parts, minus what the parts cost to restock the
// truck. Parts the customer refused to pay for (not needed) are pure loss.
//
// UPGRADES: ten truck levels bought with that money. Each one changes the truck and gives a perk.

const SAVE_KEY = 'doortech-career-v1';

export const DAY = {
  start: 8 * 60,       // minutes after midnight
  end: 17 * 60,
  lastCall: 16 * 60,   // no new calls come in after this
  fuel: 35,            // $ per day
  clockRate: 12,       // clock seconds per real second while working
};

// Drive time (minutes) from the shop to each customer, before upgrades.
const DRIVE = { 'Riverside Market': 12, 'Mercy Hospital': 25, 'Ironside Logistics': 32, 'Lincoln Middle School': 20, 'Daybreak Coffee': 15, 'Grand Meridian Hotel': 22, 'Kessler Auto Repair': 18, 'Fire Station 7': 27 };

export const UPGRADES = [
  { name: 'Base Utility Truck', cost: 0, perk: 'Carry 6 parts' },
  { name: 'Larger Utility Body', cost: 600, perk: 'Carry 8 parts' },
  { name: 'Extra Cabinet Space', cost: 900, perk: 'Carry 10 parts' },
  { name: 'Taller Ladder Rack', cost: 800, perk: 'High work goes faster: the clock runs 10% slower on jobs' },
  { name: 'Upgraded Light Bar', cost: 1000, perk: 'Looks the part: +$10 labor on every job' },
  { name: 'More Side Lighting', cost: 1000, perk: 'Work late: calls keep coming until 4:30 PM' },
  { name: 'Roof Beacon', cost: 1200, perk: 'Urgent calls pay $25 more' },
  { name: 'Rear Work Lights', cost: 1300, perk: 'Longer day: finish up to 5:30 PM' },
  { name: 'Extra Storage Bins', cost: 1600, perk: 'Carry 12 parts, and trips to the truck take half the time' },
  { name: 'Heavy-Duty Service Truck', cost: 3500, perk: 'Drives 25% faster between jobs' },
];

const DEFAULTS = () => ({
  jobs: 0, money: 0, xp: 0, last: null,
  day: 1, clock: DAY.start, calls: null, nextCallAt: 0, nextId: 1, active: null,
  log: { jobs: 0, invoice: 0, parts: 0, profit: 0, lost: 0, lostNames: [] },
  rep: 80, truck: 1, preview: false, dayOver: false,
});

export function loadCareer() {
  let c = null;
  try { c = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { /* no saving here */ }
  return Object.assign(DEFAULTS(), c || {});
}
// Start over: erase the saved career (Day 1, level 1, training on, $0, base truck).
export function newGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing saved */ }
}
export function saveCareer(c) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch (e) { /* private mode */ }
}

// What the truck level gives you.
export function perks(c) {
  const L = c.truck || 1;
  return {
    carry: L >= 9 ? 12 : L >= 3 ? 10 : L >= 2 ? 8 : 6,
    clockRate: DAY.clockRate * (L >= 4 ? 0.9 : 1),
    laborBonus: L >= 5 ? 10 : 0,
    lastCall: L >= 6 ? DAY.lastCall + 30 : DAY.lastCall,
    urgentBonus: L >= 7 ? 25 : 0,
    dayEnd: L >= 8 ? DAY.end + 30 : DAY.end,
    walkScale: L >= 9 ? 0.5 : 1,
    driveScale: L >= 10 ? 0.75 : 1,
  };
}

export function fmtClock(min) {
  min = Math.round(min);
  let h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export const driveMinutes = (c, customer) => Math.round((DRIVE[customer] || 20) * perks(c).driveScale);

// Clock minutes used by `ms` of real work time.
export const workMinutes = (c, ms) => (ms / 1000) * perks(c).clockRate / 60;
