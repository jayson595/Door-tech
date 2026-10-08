// audio.js — sound effects made with the Web Audio API (synthesized, no sound files yet).
// Browsers only allow sound after the player touches the screen, so main.js calls unlock()
// on the first tap.

let ctx = null;

export function unlock() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}

// A short burst of filtered noise: the base of most metal "clack" sounds.
function noiseBurst(time, duration, freq, q, volume) {
  const len = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(time);
}

function tone(time, freq, duration, volume, type = 'sine') {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + duration);
}

// Hand grabbing the pull + the door leaving the weatherstrip.
export function handlePull() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.05, 900, 1.2, 0.35);
  noiseBurst(t + 0.03, 0.12, 300, 0.8, 0.25);
}

// Door arriving: latch bolt snaps into the strike, then the leaf seats on the stops.
// `speed` (degrees/second) makes a fast slam louder and heavier.
export function latchClick(speed = 9) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const hard = Math.min(1, speed / 40);
  noiseBurst(t, 0.03, 3200, 4, 0.5 + hard * 0.4);           // latch snap
  tone(t, 1900, 0.06, 0.06);                                 // metallic ring
  noiseBurst(t + 0.025, 0.09 + hard * 0.1, 160, 1, 0.4 + hard * 0.9); // leaf hits stops
  tone(t + 0.025, 85, 0.15 + hard * 0.15, 0.25 + hard * 0.4);
}

// Electric strike releasing: a short buzz + clack.
export function strikeRelease() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(t, 120, 0.12, 0.08, 'square');
  noiseBurst(t + 0.1, 0.04, 2400, 3, 0.4);
}

// Operator motor/gearbox hum while powering the door open.
export function operatorMotor(seconds) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.linearRampToValueAtTime(82, t + seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.09, t + 0.25);
  gain.gain.setValueAtTime(0.09, t + seconds - 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}

// Pushing a crossbar panic device: bar travel + latch retracting. `gritty` = binding mechanism.
export function panicBar(gritty = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.06, 700, 1.5, 0.45);
  if (gritty) {
    for (let i = 0; i < 5; i++) noiseBurst(t + 0.03 + i * 0.035, 0.03, 1500 + i * 200, 2, 0.25);
  }
  noiseBurst(t + (gritty ? 0.22 : 0.05), 0.04, 2600, 3, gritty ? 0.2 : 0.35);
}

// Soft "pencil tick" as each inspection note is written down.
export function noteTick() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.025, 5000, 2, 0.12);
  tone(t, 1400, 0.04, 0.025);
}

// Metal dragging on metal: the latch riding over the strike lip.
export function scrape(volume = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.ceil(ctx.sampleRate * 0.28);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(1400, t);
  filter.frequency.linearRampToValueAtTime(2600, t + 0.28);
  const gain = ctx.createGain();
  gain.gain.value = 0.55 * volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  tone(t + 0.2, 2900, 0.12, 0.04 * volume, 'triangle'); // squeal as it pops free
}

// Dull thunk: the door hitting the latch that didn't retract.
export function clunk() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.08, 380, 1.2, 0.7);
  tone(t, 110, 0.18, 0.35);
}

// Diagnosis confirmed: two rising notes.
export function correct() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(t, 660, 0.18, 0.12, 'triangle');
  tone(t + 0.12, 990, 0.3, 0.12, 'triangle');
}

// Wrong diagnosis: low double buzz.
export function wrong() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(t, 150, 0.14, 0.1, 'square');
  tone(t + 0.17, 120, 0.2, 0.1, 'square');
}

// Grabbing a tool out of the bag.
export function toolPick() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.05, 1200, 1.5, 0.25);
  tone(t + 0.02, 2200, 0.05, 0.03, 'triangle');
}

// Tool goes to work on the part (ratchety clicks).
export function toolUse() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) noiseBurst(t + i * 0.07, 0.025, 3000, 4, 0.3);
}

// Star pops on the results card (each one a step higher).
export function starChime(i = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 988, 1175];
  tone(t, notes[i % notes.length], 0.35, 0.1, 'triangle');
  tone(t, notes[i % notes.length] * 2, 0.2, 0.03, 'sine');
}

// Bottom of the door scuffing the threshold (lower and duller than the strike scrape).
export function scuff() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.3, 420, 1.2, 0.6);
  noiseBurst(t + 0.12, 0.2, 260, 1, 0.4);
}

// Card reader accepting a badge: short high double beep.
export function readerBeep() {
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(t, 2400, 0.07, 0.06, 'square');
  tone(t + 0.1, 2400, 0.07, 0.06, 'square');
}

// Truck cabinet door: latch pop + gas strut sigh.
export function cabinet() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.04, 2000, 3, 0.35);
  noiseBurst(t + 0.05, 0.35, 900, 0.7, 0.18);
}
