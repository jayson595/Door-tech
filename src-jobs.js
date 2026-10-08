// jobs.js — the start and end of a service call (Phase 10).
//
//   JOB BOARD   (step 1)  the work order comes in; ACCEPT JOB starts the call
//   RESULTS     (step 10) score, star rating, payment and XP
//   back to the JOB BOARD (step 11) with a fresh call
//
// Career totals (jobs done, money, XP) are saved in this browser so they carry over.

import { JOB, FAULTS, DOOR_TYPES, canHappenOn, shuffled, complaintFor } from './src-faults.js';
import { DOOR_TYPE } from './src-scene.js';
import { param, reloadInto } from './src-params.js';
import * as SFX from './src-audio.js';
import { driveScene } from './src-drive.js';
import { DAY, UPGRADES, loadCareer, saveCareer, newGame, perks, fmtClock, driveMinutes, workMinutes } from './src-career.js';
const XP_PER_LEVEL = 500;
const PAR_MINUTES = 6;           // finish within this for full time score
const LABOR_PAY = { base: 110, perStar: 15, urgent: 25 }; // 5 stars = $185 (+$25 on urgent calls)
const laborFor = (faultId, stars, c = loadCareer()) => {
  const p = perks(c);
  return LABOR_PAY.base + stars * LABOR_PAY.perStar + p.laborBonus
    + (FAULTS[faultId].priority ? LABOR_PAY.urgent + p.urgentBonus : 0);
};
const XP_PER_STAR = 50;                      // 5 stars = +250 XP
const PARTS_MARKUP = 1.5;                    // parts go on the bill at 1.5x what they cost off the truck
const listPrice = (cost) => Math.round(cost * PARTS_MARKUP);

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------- score
export function scoreJob(diagnosisAccuracy) {
  const timeMs = (JOB.finishedAt || performance.now()) - JOB.startedAt + (JOB.timePenalty || 0);
  const minutes = timeMs / 60000;
  const repairQuality = JOB.repair ? JOB.repair.quality : 0;
  const failedTests = Math.max(0, (JOB.testRuns || 1) - 1);
  const testing = Math.max(40, 100 - failedTests * 20);
  const safety = Math.max(0, 100 - (JOB.safetyIssues || 0) * 20);
  const timeScore = Math.max(40, 100 - Math.max(0, minutes - PAR_MINUTES) * 10);
  const overall = diagnosisAccuracy * 0.3 + repairQuality * 0.3 + testing * 0.2 + safety * 0.1 + timeScore * 0.1;
  let stars = overall >= 90 ? 5 : overall >= 80 ? 4 : overall >= 65 ? 3 : overall >= 50 ? 2 : 1;
  if (JOB.safetyIssues) stars = Math.min(stars, 3); // a safety violation caps the rating, however good the fix
  const partsCost = JOB.partsUsed.reduce((sum, p) => sum + p.cost, 0);
  // Parts raise the bill: the ones the job needed go on the invoice at list price. Parts the job
  // didn't need (a whole new board when a fuse would do) the customer won't pay for, so the tech
  // eats what they cost.
  const billed = JOB.partsUsed.filter((p) => p.needed !== false);
  const refused = JOB.partsUsed.filter((p) => p.needed === false);
  const labor = laborFor(JOB.fault, stars);
  const partsBilled = billed.reduce((sum, p) => sum + listPrice(p.cost), 0);
  const partsEaten = refused.reduce((sum, p) => sum + p.cost, 0);
  return {
    diagnosisAccuracy, repairQuality, safety, testing, timeMs, timeScore, overall, stars,
    parts: JOB.partsUsed, partsCost, labor, partsBilled, partsEaten, refused,
    invoice: labor + partsBilled,
    // what the tech keeps: the invoice, minus restocking every part that was used (at cost)
    payment: labor + partsBilled - partsCost,
    xp: stars * XP_PER_STAR,
  };
}

// ---------------------------------------------------------------- job board (the workday)
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export class JobBoard {
  constructor({ onAccept }) {
    this.onAccept = onAccept;
    this.career = loadCareer();
    const c = this.career;
    const $ = (id) => document.getElementById(id);
    this.el = { board: $('jobboard'), stats: $('jb-stats'), last: $('jb-last'), calls: $('jb-calls') };
    this.makeScreens();
    const going = param('go') === '1' && FAULTS[param('fault')];
    // A call that was started but never finished (the page was closed mid-job) is lost.
    if (c.active && !going) {
      this.lose(c.active, 'job abandoned');
      c.clock = Math.max(c.clock, c.active.arriveAt + 30);
      c.active = null;
    }
    // Saves from before the fix can have the same call on the board several times: keep one.
    if (c.calls) {
      const seen = new Set();
      c.calls = c.calls.filter((k) => {
        const key = this.callKey(k);
        if (!DOOR_TYPES[k.door] || !FAULTS[k.fault] || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    // a ?fault= link (testing) always gets its call on the board (once: not if it's already there)
    const asked = param('fault');
    if (!going && FAULTS[asked] && c.calls && !this.onBoard(this.building(DOOR_TYPE), asked) && !c.dayOver) {
      c.calls.unshift(this.newCall(DOOR_TYPE, asked, c.clock));
    }
    this.refresh();
    saveCareer(c);
    this.render();
    this.renderCalls();
    if (going) setTimeout(() => this.accept({ door: DOOR_TYPE, fault: param('fault') }), 0);
    else if (c.dayOver) this.showDayEnd();
  }

  get level() { return Math.floor(this.career.xp / XP_PER_LEVEL) + 1; }
  get preview() { return this.career.preview; }
  // Level 1 is training (tutorial.js): a coach on every job, and calls don't expire.
  get training() { return this.level === 1 && !this.career.tutorialOff; }

  unlockedDoors() {
    return Object.keys(DOOR_TYPES).filter((id) => this.preview || (DOOR_TYPES[id].level || 1) <= this.level);
  }

  newCall(door, fault, posted) {
    const c = this.career;
    const drive = driveMinutes(c, DOOR_TYPES[door].customer) + rnd(0, 6);
    const urgent = !!FAULTS[fault].priority;
    const deadline = posted + Math.max(drive + 25, urgent ? rnd(75, 105) : rnd(150, 270));
    return { id: c.nextId++, door, fault, posted, drive, deadline };
  }

  building(door) { return DOOR_TYPES[door].customer; }
  callKey(k) { return `${this.building(k.door)}|${k.fault}`; }
  // Is this fault already on the board (or the job being worked) at this building? Riverside's
  // two doors count as one building: the same fault on both doors would read as a duplicate.
  onBoard(building, fault) {
    const c = this.career;
    return [...(c.calls || []), ...(c.active ? [c.active] : [])]
      .some((k) => DOOR_TYPES[k.door] && this.building(k.door) === building && k.fault === fault);
  }

  // A fresh call. Never one that's already on the board.
  // Variety: each building has a SHUFFLE BAG of its faults (saved with the career). Calls are
  // drawn from the bag, so every fault a building has comes up once before any comes up again.
  // The building with the fewest calls on the board gets the next one.
  pickCall(posted) {
    const c = this.career;
    c.bags = c.bags || {};
    c.lastFault = c.lastFault || {};
    const doors = this.unlockedDoors();
    const byBuilding = {};
    for (const d of doors) (byBuilding[this.building(d)] = byBuilding[this.building(d)] || []).push(d);
    const load = (b) => (c.calls || []).filter((k) => DOOR_TYPES[k.door] && this.building(k.door) === b).length;
    const buildings = shuffled(Object.keys(byBuilding)).sort((a, b) => load(a) - load(b));
    for (const b of buildings) {
      const bDoors = byBuilding[b];
      const all = Object.keys(FAULTS).filter((f) => bDoors.some((d) => canHappenOn(f, d)));
      const free = all.filter((f) => !this.onBoard(b, f));
      if (!free.length) continue; // everything this building can have is already on the board
      let bag = (c.bags[b] || []).filter((f) => all.includes(f));
      if (!bag.some((f) => free.includes(f))) {
        // bag used up: refill it, and don't start the new round with the fault we just had
        bag = shuffled(all);
        if (bag.length > 1 && bag[0] === c.lastFault[b]) bag.push(bag.shift());
      }
      const fault = bag.find((f) => free.includes(f));
      c.bags[b] = bag.filter((f) => f !== fault);
      c.lastFault[b] = fault;
      const fits = bDoors.filter((d) => canHappenOn(fault, d));
      return this.newCall(fits[Math.floor(Math.random() * fits.length)], fault, posted);
    }
    return null;
  }

  lose(call, why) {
    const c = this.career;
    c.log.lost += 1;
    c.log.lostNames.push(`${DOOR_TYPES[call.door].customer} (${why})`);
    c.rep = Math.max(0, c.rep - 5);
  }

  // New calls that came in since the last look; calls you can no longer reach in time are lost;
  // and is the day over?
  refresh() {
    const c = this.career, p = perks(c);
    if (c.dayOver) return;
    if (!c.calls) {
      c.calls = [];
      // the very first call is an easy one at the store's front door
      if (c.jobs === 0 && this.training && DOOR_TYPES.ada) {
        c.calls.push(this.newCall('ada', 'strike', c.clock));
        c.bags = { [this.building('ada')]: shuffled(Object.keys(FAULTS).filter((f) => canHappenOn(f, 'ada') || canHappenOn(f, 'manual')).filter((f) => f !== 'strike')) };
      }
      while (c.calls.length < 3) { const k = this.pickCall(c.clock); if (!k) break; c.calls.push(k); }
      c.nextCallAt = c.clock + rnd(40, 70);
    }
    while (c.nextCallAt <= c.clock && c.nextCallAt <= p.lastCall) {
      const k = this.pickCall(c.nextCallAt);
      if (k) c.calls.push(k);
      c.nextCallAt += rnd(45, 90);
    }
    this.justLost = [];
    c.calls = c.calls.filter((k) => {
      if (this.training) { k.deadline = Math.max(k.deadline, c.clock + k.drive + 60); return true; } // no lost jobs in training
      if (c.clock + k.drive <= k.deadline) return true;
      this.lose(k, 'too late');
      this.justLost.push(DOOR_TYPES[k.door].customer);
      return false;
    });
    const noMore = c.nextCallAt > p.lastCall || c.clock >= p.lastCall;
    if (c.clock >= p.dayEnd || (c.calls.length === 0 && noMore)) c.dayOver = true;
  }

  renderCalls() {
    const c = this.career;
    const box = this.el.calls;
    box.innerHTML = '';
    if (this.training) {
      const t = document.createElement('div');
      t.className = 'jb-train';
      t.innerHTML = c.jobs === 0
        ? '<b>WELCOME, ROOKIE TECH</b><span>This is your job board. Each call shows how far the drive is and when you have to be there. The clock runs from 8 AM to 5 PM, and every job you finish pays. Level 1 is training: a coach will walk you through each job, and calls won\'t run out of time. <b>Tap ACCEPT on the first call.</b></span>'
        : '<b>TRAINING · LEVEL 1</b><span>Calls won\'t expire until you reach level 2. After that, if you can\'t get there by the deadline, the customer calls someone else.</span>';
      box.appendChild(t);
    } else if (this.level === 2 && !c.trainingDoneSeen) {
      c.trainingDoneSeen = true; saveCareer(c);
      const t = document.createElement('div');
      t.className = 'jb-train done';
      t.innerHTML = '<b>TRAINING COMPLETE</b><span>You\'re on your own now. Watch the deadlines: a call you can\'t reach in time is lost, and your reputation drops.</span>';
      box.appendChild(t);
    }
    if (this.justLost && this.justLost.length) {
      const lost = document.createElement('div');
      lost.className = 'jb-lost';
      lost.textContent = `Lost ${this.justLost.length > 1 ? 'calls' : 'a call'}: ${this.justLost.join(', ')}. You couldn't get there in time.`;
      box.appendChild(lost);
    }
    if (!c.calls.length) {
      const none = document.createElement('div');
      none.className = 'jb-line jb-muted';
      none.style.textAlign = 'center';
      none.textContent = c.dayOver ? 'That\'s the end of the day.' : `No calls right now. The next one should come in around ${fmtClock(c.nextCallAt)}.`;
      box.appendChild(none);
    }
    c.calls.forEach((call) => {
      const f = FAULTS[call.fault];
      const d = DOOR_TYPES[call.door];
      const arrive = c.clock + call.drive;
      const slack = call.deadline - arrive;
      const card = document.createElement('div');
      card.className = 'jb-job';
      card.innerHTML = `
        <div class="jb-job-head"><b></b>
          <span class="jb-tag ${f.priority ? 'high' : ''}">${f.priority || 'SERVICE CALL'}</span></div>
        <div class="jb-line"></div>
        <q></q>
        <div class="jb-when"><span>🚚 ${call.drive} min drive</span><span class="${slack < 30 ? 'tight' : ''}">Be there by ${fmtClock(call.deadline)}</span></div>
        <div class="jb-line jb-muted">Call #${1000 + call.id} · Labor: up to $${laborFor(call.fault, 5, c)} + parts</div>
        <button class="jb-accept" type="button">ACCEPT · ARRIVE ${fmtClock(arrive)}</button>`;
      card.querySelector('b').textContent = d.customer;
      card.querySelector('q').textContent = complaintFor(call.fault, call.door);
      card.querySelector('.jb-line').textContent = `${d.place} · ${d.desc}`;
      card.querySelector('.jb-accept').addEventListener('click', () => this.accept(call));
      box.appendChild(card);
    });
    // buildings still locked
    const seen = new Set();
    const locked = Object.values(DOOR_TYPES).filter((d) => !this.preview && (d.level || 1) > this.level
      && !seen.has(d.customer) && seen.add(d.customer)).sort((a, b) => a.level - b.level);
    for (const d of locked) {
      const card = document.createElement('div');
      card.className = 'jb-job jb-locked';
      card.innerHTML = '<div class="jb-job-head"><b></b><span class="jb-tag">LOCKED</span></div><div class="jb-line"></div><div class="jb-line jb-muted"></div>';
      card.querySelector('b').textContent = d.customer;
      card.querySelectorAll('.jb-line')[0].textContent = `${d.place} · ${d.desc}`;
      card.querySelectorAll('.jb-line')[1].textContent = `Unlocks at level ${d.level}`;
      box.appendChild(card);
    }
    if (locked.length) {
      const b = document.createElement('button');
      b.className = 'jb-preview';
      b.type = 'button';
      b.textContent = 'PROTOTYPE: TRY ALL BUILDINGS NOW';
      b.addEventListener('click', () => {
        c.preview = true;
        // swap in a fresh set of calls that can include every building
        c.calls = [];
        for (let i = 0; i < 4; i++) { const k = this.pickCall(c.clock); if (k) c.calls.push(k); }
        saveCareer(c);
        this.renderCalls();
      });
      box.appendChild(b);
    }
  }

  render() {
    const c = this.career;
    const level = this.level;
    const into = c.xp % XP_PER_LEVEL;
    this.el.stats.innerHTML = '';
    for (const [label, value] of [['DAY', c.day], ['LEVEL', level], ['BANK', `$${c.money.toLocaleString()}`]]) {
      const d = document.createElement('div');
      d.innerHTML = `<small>${label}</small><b></b>`;
      d.querySelector('b').textContent = value;
      this.el.stats.appendChild(d);
    }
    const clock = document.createElement('div');
    clock.className = 'jb-clock';
    const p = perks(c);
    clock.innerHTML = `<span class="t"></span><span class="r"></span>`;
    clock.querySelector('.t').textContent = `🕗 ${fmtClock(c.clock)}  ·  day ends ${fmtClock(p.dayEnd)}`;
    clock.querySelector('.r').textContent = `Rep ${c.rep}%  ·  Truck Lv ${c.truck}`;
    this.el.stats.appendChild(clock);
    const bar = document.createElement('div');
    bar.className = 'jb-xp';
    bar.innerHTML = `<span style="width:${(into / XP_PER_LEVEL) * 100}%"></span><small>${into} / ${XP_PER_LEVEL} XP to level ${level + 1}</small>`;
    this.el.stats.appendChild(bar);
    if (c.last) {
      this.el.last.classList.remove('hidden');
      this.el.last.textContent = `Last job: ${c.last.site} · ${'★'.repeat(c.last.stars)}${'☆'.repeat(5 - c.last.stars)} · $${c.last.payment}`;
    }
    // day buttons under the calls
    let row = document.getElementById('jb-dayrow');
    if (!row) {
      row = document.createElement('div');
      row.id = 'jb-dayrow';
      row.innerHTML = '<button type="button" class="jb-btn2" data-a="shop">🔧 TRUCK UPGRADES</button><button type="button" class="jb-btn2" data-a="end">END DAY</button>';
      this.el.last.before(row);
      row.querySelector('[data-a=shop]').addEventListener('click', () => this.showShop());
      row.querySelector('[data-a=end]').addEventListener('click', () => { c.dayOver = true; saveCareer(c); this.showDayEnd(); });
      // NEW GAME: wipe the save and start over at Day 1 (with the training). Two taps, so it
      // can't happen by accident.
      const ng = document.createElement('button');
      ng.type = 'button';
      ng.className = 'jb-new';
      ng.textContent = 'NEW GAME';
      ng.addEventListener('click', () => {
        if (!ng.classList.contains('armed')) {
          ng.classList.add('armed');
          ng.textContent = 'TAP AGAIN TO ERASE ALL PROGRESS AND START OVER';
          clearTimeout(this.ngTimer);
          this.ngTimer = setTimeout(() => { ng.classList.remove('armed'); ng.textContent = 'NEW GAME'; }, 4000);
          return;
        }
        newGame();
        reloadInto({ door: 'ada' });
      });
      row.after(ng);
    }
  }

  // Something that can happen on the drive over (decided up front, shown in drive.js).
  // About 6 drives in 10 hit a hold-up, 1 in 10 gets lucky, the rest are a normal drive.
  rollEvent() {
    const EVENTS = [
      // [weight, kind, min, max, text]   (delay in clock minutes; negative = saves time)
      [16, 'traffic', 8, 15, (d) => `🚗 Traffic jam on Main St · +${d} min`],
      [12, 'roadwork', 5, 9, (d) => `🚧 Road work, one lane open · +${d} min`],
      [8, 'crash', 10, 18, (d) => `🚨 Accident ahead, police waving traffic around · +${d} min`],
      [7, 'detour', 6, 12, (d) => `↪️ Bridge closed, detour through town · +${d} min`],
      [6, 'train', 4, 7, (d) => `🚂 Freight train at the crossing · +${d} min`],
      [6, 'school', 2, 4, (d) => `🚸 School zone, crossing guard out · +${d} min`],
      [5, 'flat', 12, 20, (d) => `🛞 Flat tire! Pulled over to swap the spare · +${d} min`],
      [10, 'green', 3, 5, (d) => `🟢 Every light green · −${d} min`],
    ];
    const total = 100;
    let r = Math.random() * total;
    for (const [w, kind, lo, hi, text] of EVENTS) {
      if (r < w) {
        const d = rnd(lo, hi);
        return { kind, delay: kind === 'green' ? -d : d, text: text(d) };
      }
      r -= w;
    }
    return null; // a normal drive
  }

  async accept(call) {
    SFX.unlock();
    const c = this.career;
    if (this.accepting) return;
    if (!(c.active && c.active.door === call.door && c.active.fault === call.fault)) {
      this.accepting = true;
      // drive there: the clock moves, the call comes off the board
      const k = c.calls.find((x) => x.door === call.door && x.fault === call.fault) || this.newCall(call.door, call.fault, c.clock);
      c.calls = c.calls.filter((x) => x !== k);
      const event = this.rollEvent(); // hazards happen in training too (but never make you late there)
      const drive = Math.max(5, k.drive + (event ? event.delay : 0));
      const leave = c.clock;
      c.active = { door: k.door, fault: k.fault, arriveAt: c.clock + drive, deadline: k.deadline };
      if (c.active.arriveAt > k.deadline && !this.training) c.active.late = Math.round(c.active.arriveAt - k.deadline);
      c.clock = c.active.arriveAt;
      saveCareer(c);
      this.el.board.classList.add('hidden');
      await driveScene({ from: leave, to: c.active.arriveAt, customer: DOOR_TYPES[k.door].customer, truckLevel: c.truck, event });
      this.accepting = false;
    }
    if (call.door !== DOOR_TYPE) {
      reloadInto({ door: call.door, fault: call.fault, go: 1 });
      return;
    }
    SFX.correct();
    this.el.board.classList.add('hidden');
    if (this.onAccept) this.onAccept(call.fault);
  }

  // The clock right now, while working a job.
  liveClock(workMs) {
    const c = this.career;
    return c.active ? c.active.arriveAt + workMinutes(c, workMs) : c.clock;
  }

  // Bank the finished job.
  record(score) {
    const c = this.career;
    c.jobs += 1;
    c.money += score.payment;
    c.xp += score.xp;
    c.clock = this.liveClock(score.timeMs);
    c.active = null;
    c.log.jobs += 1;
    c.log.invoice += score.invoice;
    c.log.parts += score.partsCost;
    c.log.profit += score.payment;
    if (score.stars === 5) c.rep = Math.min(100, c.rep + 2);
    else if (score.stars <= 2) c.rep = Math.max(0, c.rep - 3);
    c.last = { site: `${DOOR_TYPES[DOOR_TYPE].customer} · ${DOOR_TYPES[DOOR_TYPE].place}`, stars: score.stars, payment: score.payment };
    saveCareer(c);
  }

  // ---------- end of day report + truck upgrades shop (one overlay, two views)
  makeScreens() {
    let el = document.getElementById('dayscreen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dayscreen';
      el.className = 'hidden';
      el.innerHTML = '<div class="jb-card ds-card"></div>';
      document.getElementById('jobboard').after(el);
    }
    this.screen = el;
    this.screenCard = el.querySelector('.ds-card');
  }

  showDayEnd() {
    const c = this.career, L = c.log;
    if (!c.fuelPaid) { c.money -= DAY.fuel; c.fuelPaid = true; saveCareer(c); }
    const net = L.profit - DAY.fuel;
    const rows = [
      ['Jobs completed', L.jobs],
      ['Jobs lost', L.lost, L.lost ? 'bad' : ''],
      ['Billed to customers', `$${L.invoice.toLocaleString()}`],
      ['Parts restocked', `−$${L.parts.toLocaleString()}`],
      ['Fuel', `−$${DAY.fuel}`],
    ];
    this.screenCard.innerHTML = `
      <div class="jb-brand">END OF DAY ${c.day}</div>
      <div class="ds-big ${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '' : '−'}$${Math.abs(net).toLocaleString()}<small>profit today</small></div>
      <ul class="ds-rows">${rows.map(([a, b, k]) => `<li class="${k || ''}"><span>${a}</span><b>${b}</b></li>`).join('')}</ul>
      ${L.lostNames.length ? `<div class="ds-note">Lost: ${L.lostNames.map((n) => n.replace(/</g, '')).join(', ')}</div>` : ''}
      <div class="ds-sub">Bank: <b>$${c.money.toLocaleString()}</b> · Reputation ${c.rep}% · Truck Lv ${c.truck}</div>
      <button type="button" class="jb-btn2 wide" data-a="shop">🔧 TRUCK UPGRADES</button>
      <button type="button" class="jb-accept-big" data-a="next">START DAY ${c.day + 1}</button>`;
    this.screenCard.querySelector('[data-a=shop]').addEventListener('click', () => this.showShop(true));
    this.screenCard.querySelector('[data-a=next]').addEventListener('click', () => this.nextDay());
    this.screen.classList.remove('hidden');
    SFX.starChime(2);
  }

  nextDay() {
    const c = this.career;
    Object.assign(c, { day: c.day + 1, clock: DAY.start, calls: null, nextCallAt: 0, active: null, dayOver: false, fuelPaid: false,
      log: { jobs: 0, invoice: 0, parts: 0, profit: 0, lost: 0, lostNames: [] } });
    saveCareer(c);
    reloadInto({ door: DOOR_TYPE });
  }

  showShop(fromDayEnd = false) {
    const c = this.career;
    const items = UPGRADES.map((u, i) => {
      const lvl = i + 1;
      const owned = c.truck >= lvl, next = c.truck + 1 === lvl;
      const btn = owned ? '<span class="ds-owned">OWNED</span>'
        : next ? `<button type="button" class="ds-buy" data-l="${lvl}" ${c.money < u.cost ? 'disabled' : ''}>$${u.cost.toLocaleString()}</button>`
        : `<span class="ds-lock">$${u.cost.toLocaleString()}</span>`;
      return `<li class="${owned ? 'owned' : next ? 'next' : 'locked'}"><div><b>Lv ${lvl} · ${u.name}</b><small>${u.perk}</small></div>${btn}</li>`;
    }).join('');
    this.screenCard.innerHTML = `
      <div class="jb-brand">TRUCK UPGRADES</div>
      <div class="ds-sub">Bank: <b>$${c.money.toLocaleString()}</b> · buy them in order</div>
      <ul class="ds-shop">${items}</ul>
      <button type="button" class="jb-accept-big" data-a="back">${fromDayEnd ? 'BACK TO THE DAY REPORT' : 'BACK TO THE JOB BOARD'}</button>`;
    this.screenCard.querySelectorAll('.ds-buy').forEach((b) => b.addEventListener('click', () => {
      const lvl = +b.dataset.l, u = UPGRADES[lvl - 1];
      if (c.money < u.cost) return;
      c.money -= u.cost;
      c.truck = lvl;
      saveCareer(c);
      SFX.correct();
      this.upgraded = true;
      this.showShop(fromDayEnd);
    }));
    this.screenCard.querySelector('[data-a=back]').addEventListener('click', () => {
      if (fromDayEnd) { this.showDayEnd(); return; }
      this.screen.classList.add('hidden');
      // reload so the truck out front shows its new parts
      if (this.upgraded) reloadInto({ door: DOOR_TYPE });
      this.render();
    });
    this.screen.classList.remove('hidden');
  }
}

// ---------------------------------------------------------------- results
export class Results {
  constructor({ board, diagnosis }) {
    Object.assign(this, { board, diagnosis });
    const $ = (id) => document.getElementById(id);
    this.el = { screen: $('results'), rows: $('rs-rows'), stars: $('rs-stars'), pay: $('rs-pay'), xp: $('rs-xp'),
      back: $('rs-back'), objective: document.querySelector('#objectives [data-obj="complete"]') };
    this.el.back.addEventListener('click', () => {
      // Back to the job board with a fresh call (a reload picks a new random fault).
      reloadInto({ door: DOOR_TYPE }); // stay on the same door (the board shows the day's calls)
    });
  }

  show() {
    JOB.finishedAt = performance.now();
    JOB.completed = true;
    this.el.objective.classList.add('done');
    const s = scoreJob(this.diagnosis.accuracy);
    // showed up after the deadline: the customer knocks some off the bill
    const late = this.board.career.active && this.board.career.active.late;
    if (late) { s.lateFee = 25; s.payment -= 25; this.board.career.rep = Math.max(0, this.board.career.rep - 3); }
    this.board.record(s);

    const pct = (v) => `${Math.round(v)}%`;
    const partsText = s.parts.length
      ? s.parts.map((p) => `${p.name} ($${p.cost})`).join(', ')
      : 'None (adjustment only)';
    const rows = [
      ['Diagnosis Accuracy', pct(s.diagnosisAccuracy), s.diagnosisAccuracy],
      ['Repair Quality', pct(s.repairQuality), s.repairQuality],
      ['Safety', `${pct(s.safety)}${JOB.safetyNote ? ` (${JOB.safetyNote})` : ''}`, s.safety],
      ['Testing', `${pct(s.testing)}${JOB.testRuns > 1 ? ` (${JOB.testRuns} runs)` : ''}`, s.testing],
      ['Time', fmtTime(s.timeMs), s.timeScore],
      ['Parts Used', partsText, 100],
    ];
    this.el.rows.innerHTML = '';
    rows.forEach(([label, value, score], i) => {
      const li = document.createElement('li');
      li.style.animationDelay = `${0.15 + i * 0.12}s`;
      const a = document.createElement('span');
      a.textContent = label;
      const b = document.createElement('b');
      b.textContent = value;
      b.className = score >= 85 ? 'good' : score >= 60 ? '' : 'bad';
      li.append(a, b);
      this.el.rows.appendChild(li);
    });
    const leftover = Object.values(JOB.carried || {}).reduce((a, b) => a + b, 0);
    if (leftover) {
      const back = document.createElement('li');
      back.className = 'note';
      back.textContent = `${leftover} unused part${leftover > 1 ? 's' : ''} went back on the truck (no charge)`;
      back.style.animationDelay = `${0.15 + rows.length * 0.12}s`;
      this.el.rows.appendChild(back);
    }
    // the invoice: labor + parts at list price, and any parts the customer refused to pay for
    const inv = document.getElementById('rs-invoice');
    inv.innerHTML = '';
    const line = (label, value, cls = '') => {
      const li = document.createElement('li');
      li.className = cls;
      const a = document.createElement('span'); a.textContent = label;
      const b = document.createElement('b'); b.textContent = value;
      li.append(a, b);
      inv.appendChild(li);
    };
    line('Labor', `$${s.labor}`);
    if (s.partsBilled) line(`Parts (${s.parts.filter((p) => p.needed !== false).length}, at list price)`, `$${s.partsBilled}`);
    line('Customer invoice', `$${s.invoice}`, 'total');
    if (s.partsEaten) {
      line(`Customer won't pay for: ${s.refused.map((p) => p.name).join(', ')}`, `(not billed)`, 'bad');
    }
    if (s.partsCost) line('Restocking the parts you used', `−$${s.partsCost}`, s.partsEaten ? 'bad' : '');
    if (s.lateFee) line(`Arrived ${late} min late: customer took money off`, `−$${s.lateFee}`, 'bad');
    line(`Finished at ${fmtClock(this.board.career.clock)}`, '');

    this.el.screen.classList.remove('hidden');
    // stars pop in one at a time, then payment and XP count up
    const starsBox = this.el.stars;
    starsBox.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const st = document.createElement('span');
      st.textContent = '★';
      st.className = 'off';
      starsBox.appendChild(st);
    }
    const t0 = 0.3 + rows.length * 0.12;
    [...starsBox.children].forEach((st, i) => {
      if (i < s.stars) setTimeout(() => { st.className = 'on'; SFX.starChime(i); }, (t0 + i * 0.28) * 1000);
    });
    const countUp = (el, to, prefix, delay) => setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 900);
        const v = Math.round(to * p);
        el.textContent = prefix === '$' && v < 0 ? `−$${-v}` : `${prefix}${v}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
    this.el.pay.textContent = '$0';
    this.el.xp.textContent = '+0 XP';
    countUp(this.el.pay, s.payment, '$', t0 + 5 * 0.28);
    setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 900);
        this.el.xp.textContent = `+${Math.round(s.xp * p)} XP`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, (t0 + 5 * 0.28 + 0.3) * 1000);
    return s;
  }
}
