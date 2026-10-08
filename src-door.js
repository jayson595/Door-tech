// door.js — how the door MOVES: pulled or powered open, held, and closed by the closer/operator.
//
// `settings` are the closer/operator valve settings used to close the door
// (a regular closer, or the ADA operator, which closes like a closer once its open signal ends):
//   SWEEP: from fully open down to about 12°  (the long middle of the swing)
//   LATCH: the last ~12° before the door seats (pulls the latch into the strike)
// The "too aggressive" fault cranks these up (see faults.js); Phase 8 lets the player fix them.
//
// The other faults change how the door LEAVES the closed position:
//   strike:  the latch drags on the strike, so the door sticks, then pops free (scrape)
//   sag:     the dropped door scuffs the threshold and drags before it swings free
//   panic:   the latch doesn't fully retract, so the door sometimes stays caught (clunk)
//   nopower: the strike never releases, so it stays LOCKED (pushing the panic bar from inside
//            still works: free egress)
//   plate:   the outside push plate sends nothing, so the operator never starts

import * as THREE from 'three';
import { updateArm } from './src-scene.js';
import * as SFX from './src-audio.js';

const DEG = Math.PI / 180;

// A properly set closer/operator. Full close from 90° ≈ 8 s (Jayson: 7–9 s is right).
export const CLOSER = {
  sweepSpeed: 12,  // degrees per second through the sweep zone (90° to 12° ≈ 6.6 s)
  latchSpeed: 8,   // degrees per second through the latch zone (12° to latched ≈ 1.5 s)
  latchZone: 12,   // degrees where the latch zone starts
};

// The two adjustments as the tech sees them: levels 1 (slowest) to 10 (fastest).
// A good setting is around closing 4 / latch 1-2, which gives a full close in about 8 s.
export const SPEED_LEVELS = { min: 1, max: 10, good: { sweep: 4, latch: 1 } };
export function levelsToSettings({ sweep, latch }) {
  return { sweepSpeed: 3 + sweep * 2.5, latchSpeed: 2 + latch * 5.3, latchZone: CLOSER.latchZone };
}

// How a full close from 90° plays out with these settings (same math as the door uses).
// Returns { seconds, arriveSpeed } — arriveSpeed above SLAM_SPEED means it slams.
export function simulateClose(settings) {
  let angle = 90, velocity = 0, seconds = 0;
  const dt = 1 / 120;
  while (angle > 0 && seconds < 60) {
    const target = -(angle <= settings.latchZone ? settings.latchSpeed : settings.sweepSpeed);
    velocity += (target - velocity) * Math.min(1, dt * 5);
    angle += velocity * dt;
    seconds += dt;
  }
  return { seconds, arriveSpeed: Math.abs(velocity) };
}

// ADA low-energy operator: opens slowly (ADA: at least 3 s to fully open), holds, then closes.
export const OPERATOR = {
  openSpeed: 26,  // degrees per second while powering open (90° ≈ 3.5 s)
  holdOpen: 5,    // seconds held open after the push plate is pressed
};

const MAX_OPEN = 95;   // the door stops here (like a door stop / closer backcheck)
const PULL_OPEN = 90;  // how far a quick tap-pull swings it
const HOLD_TIME = 0.6; // seconds a person "holds" it after a tap-pull
const LEAKING = { sweepSpeed: 32, latchSpeed: 50, latchZone: 12 };
export const SLAM_SPEED = 25; // arriving faster than this (degrees/second) counts as a slam

export class Door {
  constructor(parts) {
    this.parts = parts;
    this.angle = 0;          // degrees open; 0 = closed and latched
    this.velocity = 0;       // degrees per second
    this.state = 'closed';   // closed | dragging | hungUp | pulling | operating | holding | closing
    this.holdTimer = 0;
    this.settings = { ...CLOSER }; // live closer/operator valve settings
    this.fault = null;       // set by faults.js
    this.pullEffort = 1;     // below 1 = the door is heavy to pull open
    this.onChange = null;    // main.js listens so the hint text can update
    this.onSlam = null;      // main.js shakes the camera
    this.onClosed = null;    // (seconds, fromAngle) when the door latches — a stopwatch for the tech
    this.closeClock = 0;
    this.closeFrom = 0;
    this.cycle = null;       // TEST DOOR: what happened on the current cycle (see startCycle)
    this.locked = false;     // TEST DOOR running: the player's taps don't move the door
    this.dragHang = null;    // during a drag from closed: 'stick' | 'caught' | null
    this.hang = null;        // during a hang-up: { kind, timer, then }
    this.apply();
  }

  // Leaving the closed position, the latch has to clear the strike first. How does it go?
  //   'free' | 'stick' (drags on the strike, then pops free) | 'caught' (stays shut this time)
  // `how` = how someone is opening it: 'pull' (from outside), 'egress' (panic bar from inside),
  // 'power' (operator).
  latchCheck(how = 'pull') {
    if (this.angle > 0.5) return 'free';
    if (this.fault === 'nopower' && how !== 'egress') return 'locked';
    if (this.fault === 'strike') return 'stick';
    if (this.fault === 'sag') return 'scuff';
    if (this.fault === 'panic' && Math.random() < 0.5) return 'caught';
    return 'free';
  }

  // TEST DOOR: start recording a fresh cycle.
  startCycle() {
    this.cycle = { hang: null, scraped: false, closeSeconds: null, arriveSpeed: null, from: 0 };
  }

  // ---- called by input ----
  startDrag(side = 'out') {
    const fromClosed = this.angle < 0.5;
    if (fromClosed) SFX.handlePull();
    const how = fromClosed ? this.latchCheck(side === 'in' ? 'egress' : 'pull') : 'free';
    this.dragHang = how === 'free' ? null : how;
    this.hangSounded = false;
    this.setState('dragging');
    this.velocity = 0;
  }

  dragTo(angle) {
    if (this.dragHang === 'caught' || this.dragHang === 'locked') {
      // latch won't let go: the door only rattles in the frame
      if (angle > 4 && !this.hangSounded) { SFX.clunk(); this.hangSounded = true; }
      this.angle = THREE.MathUtils.clamp(angle * 0.15, 0, 1.0);
      return;
    }
    if (this.dragHang === 'stick' || this.dragHang === 'scuff') {
      const pop = this.dragHang === 'stick' ? 7 : 4;
      if (angle < pop) { this.angle = THREE.MathUtils.clamp(angle * 0.1, 0, 0.7); return; }
      if (this.dragHang === 'stick') SFX.scrape(); else SFX.scuff(); // pops free
      this.dragHang = null;
    }
    this.angle = THREE.MathUtils.clamp(angle, 0, MAX_OPEN);
  }

  release() {
    this.dragHang = null;
    this.setState(this.angle > 0.5 ? 'closing' : 'closed');
    if (this.state === 'closed') this.angle = 0;
  }

  // how: 'pull' (from outside) or 'egress' (pushing the panic bar from inside)
  tapPull(how = 'pull') {
    if (this.state === 'closed' || this.state === 'closing') {
      if (this.angle === 0) SFX.handlePull();
      this.beginOpen('pulling', how);
    }
  }

  // Card read at the reader: the reader beeps, the strike releases (if it has power), and
  // someone pulls the door open from outside.
  cardRead() {
    if (this.state !== 'closed' && this.state !== 'closing') return;
    if (this.fault === 'reader') {
      // dead reader: no beep, no light, so the controller never hears about the badge
      if (this.cycle) this.cycle.hang = 'locked';
      return;
    }
    SFX.readerBeep();
    const led = this.parts.cardReaderLED;
    if (led) { // flash green for a valid badge
      led.material.color.set(0x30ff60);
      clearTimeout(this.ledTimer);
      this.ledTimer = setTimeout(() => led.material.color.set(0xff3030), 1200);
    }
    if (this.fault !== 'nopower') SFX.strikeRelease();
    this.tapPull('pull');
  }

  // Push plate / sensor / operator: strike releases, the operator powers the door open,
  // holds, closes. source 'outsidePlate' = the outside push plate (which can be dead).
  powerOpen(source = 'operator') {
    if (this.state === 'dragging' || this.state === 'hungUp') return;
    if (source === 'outsidePlate' && this.fault === 'plate') {
      SFX.noteTick(); // the plate clicks... and nothing happens
      if (this.cycle) this.cycle.hang = 'dead';
      return;
    }
    if (this.angle === 0 && this.fault !== 'nopower') SFX.strikeRelease();
    this.beginOpen('operating', 'power');
  }

  beginOpen(mode, how = 'pull') {
    const kind = this.latchCheck(how);
    if (kind === 'free') { this.startOpening(mode); return; }
    if (this.cycle) this.cycle.hang = kind;
    const popsFree = kind === 'stick' || kind === 'scuff';
    if (kind === 'stick') SFX.scrape(); else if (kind === 'scuff') SFX.scuff(); else SFX.clunk();
    if (mode === 'operating') SFX.operatorMotor(0.6); // operator strains against the latch
    this.hang = { kind, timer: kind === 'stick' ? 0.55 : 0.45, then: popsFree ? mode : null, t: 0 };
    this.setState('hungUp');
  }

  startOpening(mode) {
    if (mode === 'operating') SFX.operatorMotor(PULL_OPEN / OPERATOR.openSpeed);
    this.setState(mode);
  }

  // ---- every frame ----
  update(dt) {
    switch (this.state) {
      case 'hungUp': {
        // the door shudders against the latch for a moment...
        const h = this.hang;
        h.t += dt;
        h.timer -= dt;
        this.angle = 0.5 + Math.sin(h.t * 55) * 0.4;
        if (h.timer <= 0) {
          this.hang = null;
          if (h.then) this.startOpening(h.then);  // ...then pops free (strike)
          else { this.angle = 0; this.setState('closed'); } // ...or stays caught (panic)
        }
        break;
      }
      case 'pulling': {
        // swing out quickly, slowing as it nears full open (slower if the door is heavy)
        this.angle += (PULL_OPEN - this.angle) * Math.min(1, dt * 4 * this.pullEffort);
        if (PULL_OPEN - this.angle < 1) {
          this.holdTimer = HOLD_TIME;
          this.setState('holding');
        }
        break;
      }
      case 'operating':
        this.angle = Math.min(PULL_OPEN, this.angle + OPERATOR.openSpeed * dt);
        if (this.angle >= PULL_OPEN) {
          this.holdTimer = OPERATOR.holdOpen;
          this.setState('holding');
        }
        break;
      case 'holding':
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this.setState('closing');
        break;
      case 'closing': {
        // a closer that has lost its oil has no control: it slams no matter how it's set
        const s = this.fault === 'leak' ? LEAKING : this.settings;
        this.closeClock += dt;
        const inLatchZone = this.angle <= s.latchZone;
        const target = -(inLatchZone ? s.latchSpeed : s.sweepSpeed);
        this.velocity += (target - this.velocity) * Math.min(1, dt * 5); // hydraulic smoothing
        this.angle += this.velocity * dt;
        if (this.angle <= 0) {
          const speed = Math.abs(this.velocity);
          // latch rides the edge of the strike going in (strike set low, or the door has sagged)
          const scrapes = this.fault === 'strike' || this.fault === 'sag';
          if (scrapes) SFX.scrape(0.6);
          if (this.cycle) {
            Object.assign(this.cycle, { scraped: scrapes, closeSeconds: this.closeClock,
              arriveSpeed: speed, from: this.closeFrom });
          }
          SFX.latchClick(speed);
          if (speed > SLAM_SPEED && this.onSlam) this.onSlam(Math.min(1, speed / 60));
          this.angle = 0;
          this.velocity = 0;
          this.setState('closed');
          if (this.onClosed) this.onClosed(this.closeClock, this.closeFrom);
        }
        break;
      }
    }
    this.apply();
  }

  // Put the 3D door (and closer/operator arm) where this.angle says.
  apply() {
    // negative rotation swings the free edge OUT toward the sidewalk
    this.parts.doorLeaf.rotation.y = -this.angle * DEG;
    updateArm(this.parts);
  }

  setState(s) {
    if (s === this.state) return;
    if (s === 'closing') { this.closeClock = 0; this.closeFrom = this.angle; }
    this.state = s;
    if (this.onChange) this.onChange(s);
  }
}
