// textures.js — every picture in the scene is drawn here with code (no image files yet).
// Each function paints onto an invisible <canvas> and turns it into a Three.js texture.
// Later, any of these can be swapped for real art without touching the rest of the game.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

// Same random numbers every time, so the store looks identical on every load.
function seededRandom(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One tile = 1 m x 1 m of wall: 5 bricks across, 15 courses tall.
let brickCanvas = null;
export function brick(repeatX, repeatY) {
  if (!brickCanvas) {
    const [c, g] = makeCanvas(512, 512);
    const rand = seededRandom(7);
    g.fillStyle = '#b9b0a2'; // mortar
    g.fillRect(0, 0, 512, 512);
    const rows = 15, cols = 5, bw = 512 / cols, bh = 512 / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * bw / 2;
      for (let i = -1; i <= cols; i++) {
        const x = i * bw + offset;
        const shade = 0.8 + rand() * 0.35;
        const red = Math.round(140 * shade), grn = Math.round(62 * shade), blu = Math.round(46 * shade);
        g.fillStyle = `rgb(${red},${grn},${blu})`;
        g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
        // speckle texture on each brick
        for (let s = 0; s < 14; s++) {
          g.fillStyle = `rgba(0,0,0,${rand() * 0.18})`;
          g.fillRect(x + 3 + rand() * (bw - 8), r * bh + 3 + rand() * (bh - 8), 2, 2);
        }
      }
    }
    brickCanvas = c;
  }
  return toTexture(brickCanvas, repeatX, repeatY);
}

// One tile = 1.5 m of sidewalk with an expansion joint along two edges.
export function concrete(repeatX, repeatY) {
  const [c, g] = makeCanvas(512, 512);
  const rand = seededRandom(3);
  g.fillStyle = '#b4b1aa';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rand() * 0.07})`;
    g.fillRect(rand() * 512, rand() * 512, 2, 2);
  }
  g.fillStyle = 'rgba(60,58,54,0.55)';
  g.fillRect(0, 0, 512, 4);
  g.fillRect(0, 0, 4, 512);
  return toTexture(c, repeatX, repeatY);
}

export function sky() {
  const [c, g] = makeCanvas(16, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#6fa6d9');
  grad.addColorStop(1, '#dce9f1');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 512);
  return toTexture(c);
}

export function storeSign() {
  const [c, g] = makeCanvas(1024, 180);
  g.fillStyle = '#173f2a';
  g.fillRect(0, 0, 1024, 180);
  g.strokeStyle = '#e9dcb8';
  g.lineWidth = 6;
  g.strokeRect(10, 10, 1004, 160);
  g.fillStyle = '#f3e9cf';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 86px Georgia, "Times New Roman", serif';
  g.fillText('RIVERSIDE MARKET', 512, 78);
  g.fillStyle = '#d9b45a';
  g.font = 'bold 26px Arial, sans-serif';
  g.fillText('FRESH PRODUCE  ·  DELI  ·  GROCERY', 512, 142);
  return toTexture(c);
}

export function awning() {
  const [c, g] = makeCanvas(512, 64);
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 ? '#efe7d4' : '#1d5c3a';
    g.fillRect((i * 512) / stripes, 0, 512 / stripes + 1, 64);
  }
  return toTexture(c);
}

// The view through the glass: a warm-lit grocery aisle, painted flat.
export function storeInterior() {
  const [c, g] = makeCanvas(1024, 512);
  const rand = seededRandom(11);
  let grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#f2ead8');
  grad.addColorStop(1, '#d6c9ad');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  // ceiling light strips
  g.fillStyle = '#fffdf3';
  for (let i = 0; i < 5; i++) g.fillRect(60 + i * 200, 18, 120, 10);
  // shelving gondolas
  const colors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ecf0f1', '#d35400', '#16a085'];
  for (let unit = 0; unit < 4; unit++) {
    const ux = 30 + unit * 250, uw = 210;
    g.fillStyle = '#5d6166';
    g.fillRect(ux, 90, uw, 330);
    for (let shelf = 0; shelf < 5; shelf++) {
      const sy = 110 + shelf * 62;
      let x = ux + 8;
      while (x < ux + uw - 14) {
        const w = 10 + rand() * 18, h = 26 + rand() * 24;
        g.fillStyle = colors[Math.floor(rand() * colors.length)];
        g.fillRect(x, sy + 50 - h, w, h);
        x += w + 2;
      }
      g.fillStyle = '#9aa0a6';
      g.fillRect(ux, sy + 50, uw, 6);
    }
  }
  // produce bins in front
  for (let b = 0; b < 6; b++) {
    const bx = 40 + b * 165;
    g.fillStyle = '#7a5532';
    g.fillRect(bx, 420, 140, 70);
    const fruit = ['#d63031', '#f39c12', '#6ab04c', '#fdcb6e', '#e17055', '#a3cb38'][b];
    for (let f = 0; f < 18; f++) {
      g.fillStyle = fruit;
      g.beginPath();
      g.arc(bx + 12 + (f % 6) * 23, 418 + Math.floor(f / 6) * 10 + rand() * 4, 11, 0, Math.PI * 2);
      g.fill();
    }
  }
  grad = g.createLinearGradient(0, 480, 0, 512);
  grad.addColorStop(0, '#bdb3a0');
  grad.addColorStop(1, '#a89e8a');
  g.fillStyle = grad;
  g.fillRect(0, 490, 1024, 22);
  return toTexture(c);
}

export function floorTile(repeatX, repeatY) {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#e8e2d4';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#c9c0ac';
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  return toTexture(c, repeatX, repeatY);
}

// Stainless push plate with the blue accessibility symbol.
export function pushPlate() {
  const [c, g] = makeCanvas(256, 256);
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#e4e7ea');
  grad.addColorStop(1, '#a9aeb3');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#1f5fbf';
  g.fillRect(48, 28, 160, 160);
  // simple wheelchair figure
  g.strokeStyle = g.fillStyle = '#ffffff';
  g.lineWidth = 12;
  g.lineCap = 'round';
  g.beginPath(); g.arc(136, 56, 13, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(132, 80); g.lineTo(126, 126); g.lineTo(166, 126); g.lineTo(178, 160); g.stroke();
  g.beginPath(); g.moveTo(130, 98); g.lineTo(162, 98); g.stroke();
  g.lineWidth = 10;
  g.beginPath(); g.arc(118, 140, 34, Math.PI * 1.15, Math.PI * 2.55); g.stroke();
  g.fillStyle = '#20252b';
  g.font = 'bold 28px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('PUSH TO OPEN', 128, 228);
  return toTexture(c);
}

// White vinyl lettering on the door glass (transparent background).
export function doorDecal() {
  const [c, g] = makeCanvas(512, 256);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = 'bold 44px Georgia, serif';
  g.fillText('Riverside Market', 256, 80);
  g.fillRect(126, 104, 260, 3);
  g.font = '28px Arial, sans-serif';
  g.fillText('OPEN DAILY', 256, 150);
  g.fillText('7 AM – 10 PM', 256, 190);
  return toTexture(c);
}

export function neonOpen() {
  const [c, g] = makeCanvas(512, 256);
  g.shadowColor = '#ff2a2a';
  g.shadowBlur = 28;
  g.strokeStyle = '#ff5a4a';
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(40, 40, 432, 176, 40);
  g.stroke();
  g.fillStyle = '#ffe1dc';
  g.font = 'bold 120px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('OPEN', 256, 134);
  return toTexture(c);
}

// Grid of windows for the buildings across the street (multiplied with each building's color).
export function buildingWindows() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 3; k++) {
      g.fillStyle = (r + k) % 3 ? '#3b4654' : '#566273';
      g.fillRect(24 + k * 76, 20 + r * 60, 54, 38);
    }
  }
  return toTexture(c);
}

// Lit EXIT sign face: red letters on white.
export function exitSign() {
  const [c, g] = makeCanvas(256, 128);
  g.fillStyle = '#f4f4ef';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#e0201b';
  g.font = 'bold 84px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('EXIT', 128, 68);
  g.beginPath(); g.moveTo(14, 64); g.lineTo(34, 48); g.lineTo(34, 80); g.fill();
  g.beginPath(); g.moveTo(242, 64); g.lineTo(222, 48); g.lineTo(222, 80); g.fill();
  return toTexture(c);
}

// Rubber entry mat.
export function entryMat() {
  const [c, g] = makeCanvas(512, 340);
  g.fillStyle = '#2b2d30';
  g.fillRect(0, 0, 512, 340);
  g.strokeStyle = '#4a4e53';
  g.lineWidth = 14;
  g.strokeRect(14, 14, 484, 312);
  for (let x = 40; x < 480; x += 12) {
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.fillRect(x, 34, 5, 272);
  }
  g.fillStyle = '#8f949a';
  g.font = 'bold 54px Georgia, serif';
  g.textAlign = 'center';
  g.fillText('WELCOME', 256, 160);
  g.font = 'bold 26px Arial, sans-serif';
  g.fillText('RIVERSIDE MARKET', 256, 210);
  return toTexture(c);
}

// Chalkboard A-frame sign.
export function specialsBoard() {
  const [c, g] = makeCanvas(256, 384);
  g.fillStyle = '#7a5532';
  g.fillRect(0, 0, 256, 384);
  g.fillStyle = '#26302b';
  g.fillRect(14, 14, 228, 356);
  g.fillStyle = '#f2efe6';
  g.textAlign = 'center';
  g.font = 'bold 30px "Comic Sans MS", "Segoe Print", cursive';
  g.fillText('WEEKLY', 128, 62);
  g.fillText('SPECIALS', 128, 96);
  g.font = '22px "Comic Sans MS", "Segoe Print", cursive';
  const lines = [['Apples', '$1.29/lb', '#f26d6d'], ['Bananas', '59¢/lb', '#f7d35c'],
    ['Fresh Bread', '$2.99', '#f2efe6'], ['Milk (gal)', '$3.49', '#9fd3f2'], ['Deli Sub', '$6.99', '#a6e39a']];
  lines.forEach(([item, price, col], i) => {
    g.fillStyle = col;
    g.fillText(item, 128, 150 + i * 46);
    g.fillStyle = '#f2efe6';
    g.font = 'bold 20px Arial, sans-serif';
    g.fillText(price, 128, 172 + i * 46);
    g.font = '22px "Comic Sans MS", "Segoe Print", cursive';
  });
  return toTexture(c);
}

// "Now Hiring" sign taped in the window (faces the street).
export function hiringSign() {
  const [c, g] = makeCanvas(256, 192);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#c0392b';
  g.fillRect(0, 0, 256, 56);
  g.fillStyle = '#ffffff';
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('NOW HIRING', 128, 40);
  g.fillStyle = '#222';
  g.font = '22px Arial, sans-serif';
  g.fillText('Cashiers · Stock', 128, 98);
  g.fillText('Deli Counter', 128, 128);
  g.font = 'italic 18px Arial, sans-serif';
  g.fillText('Apply inside!', 128, 168);
  return toTexture(c);
}
