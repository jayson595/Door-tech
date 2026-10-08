// drive.js — the short drive between jobs. The truck rolls across town while the clock ticks
// from when you left to when you get there. Sometimes something happens on the way (traffic,
// road work, every light green); the event is decided before the drive (jobs.js) and shown here.
// Tap anywhere to skip.

import { fmtClock } from './src-career.js';

const SPRITES = [1, 4, 7, 10]; // truck pictures by upgrade level (art/drive/truck_lvN.png)

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

export function driveScene({ from, to, customer, truckLevel = 1, event = null }) {
  return new Promise((resolve) => {
    const stage = document.getElementById('stage');
    const wrap = document.createElement('div');
    wrap.id = 'drive';
    wrap.innerHTML = `
      <canvas></canvas>
      <div class="dv-top"><small>DRIVING TO</small><b></b></div>
      <div class="dv-clock"><span class="dv-time"></span><small class="dv-arrive"></small></div>
      <div class="dv-event hidden"></div>
      <div class="dv-skip">tap to skip</div>`;
    wrap.querySelector('.dv-top b').textContent = customer;
    wrap.querySelector('.dv-arrive').textContent = `arriving ${fmtClock(to)}`;
    stage.appendChild(wrap);
    const cv = wrap.querySelector('canvas');
    const g = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { cv.width = wrap.clientWidth * dpr; cv.height = wrap.clientHeight * dpr; };
    size();
    const truck = new Image();
    const lvl = SPRITES.filter((l) => l <= truckLevel).pop() || 1;
    truck.src = `art-drive-truck_lv${lvl}.png`;

    // scenery, made once
    const R = rng(Math.round(from) + 7);
    const sky = Array.from({ length: 26 }, (_, i) => ({ x: i * 90 + R() * 40, w: 50 + R() * 70, h: 60 + R() * 150, shade: R() }));
    const props = Array.from({ length: 14 }, (_, i) => ({ x: i * 160 + R() * 60, kind: R() < 0.55 ? 'tree' : 'pole', s: 0.8 + R() * 0.4 }));
    const queued = event && ['traffic', 'crash', 'train', 'school'].includes(event.kind); // a line of cars ahead
    const cars = queued
      ? Array.from({ length: 4 }, (_, i) => ({ x: 1.0 + i * 0.32, col: ['#8a1f24', '#2c4f7c', '#c9c6bd', '#3a3d41'][i % 4] })) : [];

    const evTime = 1.4;                              // when the event shows up (seconds)
    const total = event ? 4.6 : 3.2;                 // seconds on screen
    let t = 0, last = performance.now(), dist = 0, done = false;
    const start = performance.now();
    const timeEl = wrap.querySelector('.dv-time');
    const evEl = wrap.querySelector('.dv-event');

    const finish = () => {
      if (done) return;
      done = true;
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); resolve(); }, 250);
    };
    wrap.addEventListener('pointerdown', finish);

    // sky colour by time of day: cool morning, bright midday, warm late afternoon
    const skyCols = (min) => {
      const h = min / 60;
      if (h < 10) return ['#7fa8d6', '#e9d9c4'];
      if (h < 15) return ['#5d93d1', '#cfe2f1'];
      return ['#6b86b8', '#f2c79a'];
    };

    const frame = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t = (now - start) / 1000; // real time, so the drive always takes the same few seconds
      const W = cv.width, H = cv.height, u = H / 800; // u = scale unit
      // speed: cruise, slow right down in traffic / road work
      let speed = 1;
      if (event && t > evTime) {
        if (event.delay > 0) speed = event.kind === 'flat' || event.kind === 'train' ? 0 : 0.18; // crawl, or stopped dead
        if (event.kind === 'green') speed = 1.6;
      }
      dist += dt * speed * 520 * u;
      // the clock
      const p = Math.min(1, t / total);
      timeEl.textContent = fmtClock(from + (to - from) * p);
      if (event && t > evTime && evEl.classList.contains('hidden')) {
        evEl.textContent = event.text;
        evEl.className = `dv-event ${event.delay > 0 ? 'bad' : 'good'}`;
      }
      // --- draw
      const [c0, c1] = skyCols(from + (to - from) * p);
      const sg = g.createLinearGradient(0, 0, 0, H * 0.5);
      sg.addColorStop(0, c0); sg.addColorStop(1, c1);
      g.fillStyle = sg; g.fillRect(0, 0, W, H);
      const horizon = H * 0.5;
      // far skyline
      for (const b of sky) {
        const span = 26 * 90 * u;
        const x = ((b.x * u - dist * 0.15) % span + span) % span - 60 * u;
        g.fillStyle = `rgba(${70 + b.shade * 40},${78 + b.shade * 40},${92 + b.shade * 40},0.75)`;
        g.fillRect(x, horizon - b.h * u, b.w * u, b.h * u);
        g.fillStyle = 'rgba(255,240,190,0.35)';
        for (let wy = horizon - b.h * u + 10 * u; wy < horizon - 12 * u; wy += 18 * u) {
          for (let wx = x + 8 * u; wx < x + b.w * u - 10 * u; wx += 14 * u) if ((wx * 7 + wy * 3) % 5 < 2.2) g.fillRect(wx, wy, 5 * u, 7 * u);
        }
      }
      // ground strip + sidewalk
      g.fillStyle = '#7c8a6a'; g.fillRect(0, horizon, W, H * 0.06);
      g.fillStyle = '#b9b4aa'; g.fillRect(0, horizon + H * 0.06, W, H * 0.05);
      // trees and street lights
      for (const pr of props) {
        const span = 14 * 160 * u;
        const x = ((pr.x * u - dist * 0.55) % span + span) % span - 80 * u;
        const base = horizon + H * 0.09;
        if (pr.kind === 'tree') {
          g.fillStyle = '#5a4632'; g.fillRect(x - 4 * u, base - 60 * u * pr.s, 8 * u, 60 * u * pr.s);
          g.fillStyle = '#3f6b3a'; g.beginPath(); g.arc(x, base - 78 * u * pr.s, 34 * u * pr.s, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#4f7f47'; g.beginPath(); g.arc(x - 12 * u, base - 88 * u * pr.s, 22 * u * pr.s, 0, Math.PI * 2); g.fill();
        } else {
          g.fillStyle = '#4b4f55'; g.fillRect(x - 3 * u, base - 150 * u, 6 * u, 150 * u);
          g.fillRect(x - 3 * u, base - 150 * u, 40 * u, 5 * u);
          g.fillStyle = '#ffe9a8'; g.fillRect(x + 28 * u, base - 146 * u, 12 * u, 5 * u);
        }
      }
      // road
      const roadTop = horizon + H * 0.11;
      g.fillStyle = '#3a3c40'; g.fillRect(0, roadTop, W, H - roadTop);
      g.fillStyle = '#d9d4c8'; g.fillRect(0, roadTop, W, 4 * u);
      g.fillStyle = '#f2c230';
      const dash = 80 * u, laneY = roadTop + (H - roadTop) * 0.62;
      for (let x = -((dist) % (dash * 2)); x < W; x += dash * 2) g.fillRect(x, laneY, dash, 6 * u);
      // the truck (rides in the near lane, gentle bob), cars ahead in traffic
      const tw = Math.min(W * 0.8, 900 * u);
      const ready = truck.complete && truck.naturalWidth;
      const th = ready ? tw * truck.naturalHeight / truck.naturalWidth : tw * 0.33;
      const tx = W * 0.04, ty = laneY - th * 0.88 + Math.sin(t * 9) * 1.2 * u;
      for (const car of cars) {
        // cars come back into view and bunch up ahead of the truck
        const stopAt = tx + tw + 14 * u + (car.x - 1.0) * tw * 0.5;
        const cx = Math.max(stopAt, W * (car.x + 0.2) - (t / evTime) * W * 0.9);
        if (cx > W + 20) continue;
        const cw = tw * 0.42, ch = cw * 0.32, cy = laneY - ch - 4 * u;
        g.fillStyle = car.col;
        g.beginPath(); g.roundRect(cx, cy + ch * 0.35, cw, ch * 0.55, 8 * u); g.fill();
        g.beginPath(); g.roundRect(cx + cw * 0.2, cy, cw * 0.55, ch * 0.5, 10 * u); g.fill();
        g.fillStyle = 'rgba(20,30,40,0.85)'; g.fillRect(cx + cw * 0.26, cy + ch * 0.08, cw * 0.43, ch * 0.3);
        g.fillStyle = t > evTime ? '#ff2a2a' : '#8a1010'; g.fillRect(cx - 2 * u, cy + ch * 0.45, 6 * u, ch * 0.16);
        g.fillStyle = '#111';
        for (const wx of [0.22, 0.78]) { g.beginPath(); g.arc(cx + cw * wx, cy + ch * 0.92, ch * 0.2, 0, Math.PI * 2); g.fill(); }
      }
      if (event && (event.kind === 'roadwork' || event.kind === 'detour') && t > evTime * 0.7) { // cones and a ROAD WORK sign
        const ox = W * 1.05 - (t - evTime * 0.7) * W * 0.12;
        for (let k = 0; k < 6; k++) {
          const cx = ox + k * 46 * u;
          g.fillStyle = '#ff5a1f'; g.beginPath(); g.moveTo(cx, laneY + 4 * u); g.lineTo(cx + 12 * u, laneY - 30 * u); g.lineTo(cx + 24 * u, laneY + 4 * u); g.fill();
          g.fillStyle = '#fff'; g.fillRect(cx + 7 * u, laneY - 16 * u, 10 * u, 5 * u);
        }
        g.fillStyle = '#ff8c1a'; g.save(); g.translate(ox - 40 * u, laneY - 120 * u); g.rotate(Math.PI / 4); g.fillRect(-26 * u, -26 * u, 52 * u, 52 * u); g.restore();
        g.fillStyle = '#4b4f55'; g.fillRect(ox - 42 * u, laneY - 90 * u, 4 * u, 90 * u);
      }
      if (event && t > evTime) {
        const blink = Math.floor(t * 4) % 2 === 0;
        if (event.kind === 'crash') { // police lights flashing up the road
          const px = W * 0.86, py = laneY - 70 * u;
          g.fillStyle = blink ? '#ff2a2a' : '#2a5bff'; g.beginPath(); g.arc(px, py, 14 * u, 0, Math.PI * 2); g.fill();
          g.fillStyle = blink ? '#2a5bff' : '#ff2a2a'; g.beginPath(); g.arc(px + 34 * u, py, 14 * u, 0, Math.PI * 2); g.fill();
        }
        if (event.kind === 'train') { // crossing gate down, lights flashing, train boxcars rolling by
          const gx = W * 0.62;
          g.fillStyle = '#4b4f55'; g.fillRect(gx, laneY - 150 * u, 6 * u, 150 * u);
          g.fillStyle = blink ? '#ff2a2a' : '#5a1010'; g.beginPath(); g.arc(gx - 10 * u, laneY - 140 * u, 9 * u, 0, Math.PI * 2); g.fill();
          g.fillStyle = blink ? '#5a1010' : '#ff2a2a'; g.beginPath(); g.arc(gx + 16 * u, laneY - 140 * u, 9 * u, 0, Math.PI * 2); g.fill();
          const roll = ((t - evTime) * 260 * u) % (220 * u);
          for (let k = -1; k < 6; k++) {
            const bx = gx + 40 * u + k * 220 * u - roll;
            g.fillStyle = ['#7a3b22', '#2f4f6f', '#6b6b2a'][(k + 3) % 3]; g.fillRect(bx, laneY - 170 * u, 200 * u, 110 * u);
          }
        }
        if (event.kind === 'flat') { // hazard lights on the truck
          g.fillStyle = blink ? '#ffb000' : 'rgba(0,0,0,0)';
          g.beginPath(); g.arc(tx + 10 * u, laneY - 40 * u, 10 * u, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(tx + tw - 10 * u, laneY - 40 * u, 10 * u, 0, Math.PI * 2); g.fill();
        }
      }
      if (ready) {
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); g.ellipse(tx + tw * 0.5, laneY + 2 * u, tw * 0.48, 8 * u, 0, 0, Math.PI * 2); g.fill();
        g.drawImage(truck, tx, ty, tw, th);
      }
      if (t >= total) { finish(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
