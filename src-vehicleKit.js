// vehicleKit.js — the "closer to real" vehicle toolkit.
//
// What makes these read as real vehicles instead of boxes:
//   * reflective paint (clear coat) and glass: every vehicle material gets a soft sky
//     reflection map (setVehicleEnv), so panels catch highlights the way real paint does
//   * rounded side profiles (filleted corners), a greenhouse that leans in toward the roof
//     (tumblehome), and a nose that narrows in plan
//   * tires with a rounded profile and tread, rims with real spoke openings and lug nuts
//   * a soft contact shadow under every vehicle so it sits on the road
//
// Vehicles face +x. A side profile is drawn in (x, y) and extruded across the width (z).

import * as THREE from 'three';

// ---------------------------------------------------------------- materials + reflections
const REFLECTIVE = []; // materials that get the sky reflection
function reg(m, intensity = 1) { m.userData.envI = intensity; REFLECTIVE.push(m); return m; }

export function paint(color, { metallic = false, rough } = {}) {
  return reg(new THREE.MeshPhysicalMaterial({
    color,
    metalness: metallic ? 0.55 : 0.05,
    roughness: rough !== undefined ? rough : metallic ? 0.38 : 0.3,
    clearcoat: 1, clearcoatRoughness: 0.08,
  }), 1.5);
}

export const KM = {
  glass: reg(new THREE.MeshPhysicalMaterial({ color: 0x05080b, metalness: 0.2, roughness: 0.05, clearcoat: 1 }), 0.65),
  trim: reg(new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.55, metalness: 0.1 }), 0.4),
  plastic: reg(new THREE.MeshStandardMaterial({ color: 0x232528, roughness: 0.8 }), 0.25), // textured black (flares, bumpers)
  chrome: reg(new THREE.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.12 }), 1.3),
  alu: reg(new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.85, roughness: 0.3 }), 1),
  steelWheel: reg(new THREE.MeshStandardMaterial({ color: 0xa9aeb3, metalness: 0.75, roughness: 0.35 }), 1),
  darkWheel: reg(new THREE.MeshStandardMaterial({ color: 0x3b3f44, metalness: 0.7, roughness: 0.38 }), 0.8),
  lens: reg(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 0, clearcoat: 1,
    transparent: true, opacity: 0.28, depthWrite: false }), 1.5),
  reflector: reg(new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 1, roughness: 0.15, emissive: 0xc8d0d8, emissiveIntensity: 0.55 }), 1.4),
  drl: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf2ff, emissiveIntensity: 2.2 }),
  tail: reg(new THREE.MeshPhysicalMaterial({ color: 0xa50d16, emissive: 0x4a0307, emissiveIntensity: 0.7, roughness: 0.15, clearcoat: 1 }), 1),
  amber: reg(new THREE.MeshPhysicalMaterial({ color: 0xff9a14, emissive: 0xb35a00, emissiveIntensity: 0.65, roughness: 0.2, clearcoat: 1 }), 1),
  amberLit: new THREE.MeshStandardMaterial({ color: 0xffb030, emissive: 0xff8a00, emissiveIntensity: 1.6 }),
  well: new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1, side: THREE.DoubleSide }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 }),
  orange: reg(new THREE.MeshStandardMaterial({ color: 0xe0531f, roughness: 0.45 }), 0.5),
  steel: reg(new THREE.MeshStandardMaterial({ color: 0x4e535a, metalness: 0.7, roughness: 0.38 }), 0.8),   // painted steel, bumpers and racks
  darkChrome: reg(new THREE.MeshStandardMaterial({ color: 0x8d9298, metalness: 1, roughness: 0.2 }), 1.1),
  // a headlamp seen from outside: chrome reflectors behind clear glass
  headlamp: reg(new THREE.MeshPhysicalMaterial({ color: 0xdfe6ec, metalness: 0.85, roughness: 0.12, clearcoat: 1,
    emissive: 0x8a96a2, emissiveIntensity: 0.3 }), 1.4),
};

// Soft sky reflection for all vehicle materials. Call once with the renderer.
// (Only vehicle materials get it, so the buildings look exactly as before.)
let envTex = null;
export function setVehicleEnv(renderer) {
  if (!envTex) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#6f9fd0'); sky.addColorStop(0.75, '#cfe0ee'); sky.addColorStop(1, '#f4f6f6');
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 256);
    const ground = g.createLinearGradient(0, 256, 0, 512);
    ground.addColorStop(0, '#77736d'); ground.addColorStop(0.15, '#4b4a48'); ground.addColorStop(1, '#2a2a2a');
    g.fillStyle = ground; g.fillRect(0, 256, 1024, 256);
    // a bright sun patch and soft cloud banks give the paint something to catch
    const sun = g.createRadialGradient(300, 90, 0, 300, 90, 70);
    sun.addColorStop(0, 'rgba(255,255,250,1)'); sun.addColorStop(1, 'rgba(255,255,250,0)');
    g.fillStyle = sun; g.fillRect(200, 0, 200, 200);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [x, y, w, h] of [[560, 150, 260, 40], [80, 170, 180, 30], [820, 120, 150, 30]]) {
      g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
    }
    // building silhouettes along the horizon (darker bands, like a street)
    g.fillStyle = 'rgba(70,74,80,0.55)';
    for (let x = 0; x < 1024; x += 64) { const h = 30 + ((x * 37) % 60); g.fillRect(x, 256 - h, 52, h); }
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromEquirectangular(tex).texture;
    pm.dispose();
  }
  for (const m of REFLECTIVE) {
    m.envMap = envTex;
    m.envMapIntensity = m.userData.envI;
    m.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- small helpers
export function mesh(parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const boxM = (parent, mat, w, h, d, x, y, z, shadow = true) =>
  mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, shadow);

// Rounded box (all edges rounded) built from an extruded rounded rectangle.
export function rbox(parent, mat, w, h, d, r, x, y, z) {
  const s = new THREE.Shape();
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  s.moveTo(-w / 2 + rr, -h / 2);
  s.lineTo(w / 2 - rr, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rr);
  s.lineTo(w / 2, h / 2 - rr); s.quadraticCurveTo(w / 2, h / 2, w / 2 - rr, h / 2);
  s.lineTo(-w / 2 + rr, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rr);
  s.lineTo(-w / 2, -h / 2 + rr); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rr, -h / 2);
  const b = Math.min(rr, d / 2 - 0.001);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true,
    bevelThickness: b, bevelSize: b * 0.9, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  return mesh(parent, geo, mat, x, y, z);
}

// A side profile with rounded corners. pts: [x, y, r] (r = fillet radius, 0 = sharp), or
// { arch: [cx, cy, r] } for a wheel arch cut into the bottom edge (walk the bottom toward +x).
export function profile(pts) {
  // expand arches into their endpoints so neighbours can be filleted against them
  const flat = [];
  for (const p of pts) {
    if (p.arch) {
      const [cx, cy, r] = p.arch;
      flat.push({ x: cx - r, y: cy, r: 0, archStart: p.arch });
      flat.push({ x: cx + r, y: cy, r: 0, archEnd: true });
    } else flat.push({ x: p[0], y: p[1], r: p[2] || 0 });
  }
  const s = new THREE.Shape();
  const n = flat.length;
  for (let i = 0; i < n; i++) {
    const P = flat[i], A = flat[(i - 1 + n) % n], B = flat[(i + 1) % n];
    if (P.archEnd) continue; // drawn by its arc
    if (P.archStart) {
      if (i === 0) s.moveTo(P.x, P.y); else s.lineTo(P.x, P.y);
      const [cx, cy, r] = P.archStart;
      s.absarc(cx, cy, r, Math.PI, 0, true);
      continue;
    }
    if (!P.r) { if (i === 0) s.moveTo(P.x, P.y); else s.lineTo(P.x, P.y); continue; }
    const la = Math.hypot(A.x - P.x, A.y - P.y), lb = Math.hypot(B.x - P.x, B.y - P.y);
    const r = Math.min(P.r, la / 2, lb / 2);
    const p1 = [P.x + (A.x - P.x) / la * r, P.y + (A.y - P.y) / la * r];
    const p2 = [P.x + (B.x - P.x) / lb * r, P.y + (B.y - P.y) / lb * r];
    if (i === 0) s.moveTo(...p1); else s.lineTo(...p1);
    s.quadraticCurveTo(P.x, P.y, ...p2);
  }
  s.closePath();
  return s;
}

// Extrude a profile to a full width W (centered on z = 0) with rounded side edges, then shape it:
//   belt/taper: above y = belt the sides lean in by `taper` metres per metre of height
//   nose: [x0, inset] — ahead of x0 the body narrows by up to `inset` at the very front
export function shell(shape, W, { bevel = 0.05, belt = null, taper = 0, nose = null, tail = null, segs = 4, curve = 14, refine = 0.2 } = {}) {
  const D = W - 2 * bevel;
  let geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segs, curveSegments: curve, steps: 1 });
  // (bevelOffset keeps the rounded edge INSIDE the drawn profile, so the profile is the real outline)
  geo.translate(0, 0, -D / 2);
  // The flat sides are a few long thin triangles; bending them (taper, nose) would crease them.
  // Cut them up first so they bend smoothly.
  if (refine && (taper || nose || tail)) geo = refineGeo(geo, refine);
  const pos = geo.attributes.position;
  let maxX = -Infinity, minX = Infinity;
  for (let i = 0; i < pos.count; i++) { maxX = Math.max(maxX, pos.getX(i)); minX = Math.min(minX, pos.getX(i)); }
  for (let i = 0; i < pos.count; i++) {
    let z = pos.getZ(i);
    const x = pos.getX(i), y = pos.getY(i);
    const half = W / 2;
    let k = 1;
    if (belt !== null && y > belt) k -= (taper * (y - belt)) / half;
    if (nose && x > nose[0]) { const t = (x - nose[0]) / (maxX - nose[0]); k -= (nose[1] * t * t) / half; }
    if (tail && x < tail[0]) { const t = (tail[0] - x) / (tail[0] - minX); k -= (tail[1] * t * t) / half; }
    pos.setZ(i, z * k);
  }
  if (geo.index) return creasedNormals(geo, 40);
  geo.computeVertexNormals();
  return geo;
}

// Smooth normals, except across edges sharper than `angle` degrees (kept crisp). Indexed in,
// non-indexed out.
export function creasedNormals(geo, angle = 40) {
  const p = geo.attributes.position.array, ix = geo.index.array;
  const nf = ix.length / 3, fn = new Float32Array(nf * 3), byV = new Map();
  const v = (i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  for (let f = 0; f < nf; f++) {
    const [a, b, c] = [ix[f * 3], ix[f * 3 + 1], ix[f * 3 + 2]].map(v);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    fn[f * 3] = uy * wz - uz * wy; fn[f * 3 + 1] = uz * wx - ux * wz; fn[f * 3 + 2] = ux * wy - uy * wx; // area-weighted
    for (let k = 0; k < 3; k++) { const vi = ix[f * 3 + k]; (byV.get(vi) || byV.set(vi, []).get(vi)).push(f); }
  }
  const cosA = Math.cos((angle * Math.PI) / 180);
  const un = new Float32Array(nf * 3);
  for (let f = 0; f < nf; f++) { const l = Math.hypot(fn[f * 3], fn[f * 3 + 1], fn[f * 3 + 2]) || 1; un[f * 3] = fn[f * 3] / l; un[f * 3 + 1] = fn[f * 3 + 1] / l; un[f * 3 + 2] = fn[f * 3 + 2] / l; }
  const pos = new Float32Array(ix.length * 3), nor = new Float32Array(ix.length * 3);
  for (let f = 0; f < nf; f++) {
    const ux = un[f * 3], uy = un[f * 3 + 1], uz = un[f * 3 + 2];
    for (let k = 0; k < 3; k++) {
      const vi = ix[f * 3 + k];
      let nx = 0, ny = 0, nz = 0;
      for (const g of byV.get(vi)) { if (un[g * 3] * ux + un[g * 3 + 1] * uy + un[g * 3 + 2] * uz >= cosA) { nx += fn[g * 3]; ny += fn[g * 3 + 1]; nz += fn[g * 3 + 2]; } }
      const l = Math.hypot(nx, ny, nz) || 1;
      const o = (f * 3 + k) * 3;
      pos[o] = p[vi * 3]; pos[o + 1] = p[vi * 3 + 1]; pos[o + 2] = p[vi * 3 + 2];
      nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

// Split every edge longer than maxLen at its midpoint, in both triangles that share it (so no
// cracks), until all edges are short. Returns an indexed geometry with shared vertices.
export function refineGeo(src, maxLen) {
  const p = src.attributes.position;
  const verts = [], key2i = new Map(), tris = [];
  const vid = (x, y, z) => {
    const k = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    let i = key2i.get(k);
    if (i === undefined) { i = verts.length / 3; verts.push(x, y, z); key2i.set(k, i); }
    return i;
  };
  const idx = src.index ? src.index.array : null;
  const n = idx ? idx.length : p.count;
  for (let i = 0; i < n; i += 3) {
    const t = [0, 1, 2].map((k) => { const j = idx ? idx[i + k] : i + k; return vid(p.getX(j), p.getY(j), p.getZ(j)); });
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(t);
  }
  // only the length in the side view counts: bending (taper, nose) never creases a strip that
  // runs straight across the width, so those are left alone
  const len2 = (a, b) => (verts[a * 3] - verts[b * 3]) ** 2 + (verts[a * 3 + 1] - verts[b * 3 + 1]) ** 2;
  const m2 = maxLen * maxLen;
  for (let pass = 0; pass < 12; pass++) {
    const edges = new Map();
    tris.forEach((t, ti) => { for (let k = 0; k < 3; k++) { const a = t[k], b = t[(k + 1) % 3]; if (len2(a, b) <= m2) continue;
      const e = a < b ? a * 4194304 + b : b * 4194304 + a; let arr = edges.get(e); if (!arr) edges.set(e, arr = []); arr.push(ti); } });
    const long = [...edges.entries()].map(([e, ts]) => { const a = Math.floor(e / 4194304), b = e % 4194304; return { a, b, ts, l: len2(a, b) }; })
      .sort((x, y) => y.l - x.l);
    if (!long.length) break;
    const touched = new Set();
    for (const { a, b, ts } of long) {
      if (ts.some((ti) => touched.has(ti))) continue;
      const m = verts.length / 3;
      verts.push((verts[a * 3] + verts[b * 3]) / 2, (verts[a * 3 + 1] + verts[b * 3 + 1]) / 2, (verts[a * 3 + 2] + verts[b * 3 + 2]) / 2);
      for (const ti of ts) {
        const t = tris[ti];
        const ia = t.indexOf(a), ib = t.indexOf(b);
        const c = t[3 - ia - ib];
        // keep winding: the triangle runs ... a -> b ... or ... b -> a ...
        if ((ia + 1) % 3 === ib) { tris[ti] = [a, m, c]; tris.push([m, b, c]); }
        else { tris[ti] = [b, m, c]; tris.push([m, a, c]); }
        touched.add(ti); touched.add(tris.length - 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(tris.flat());
  return geo;
}

// The z of a body side at height y for a shell built with the same belt/taper.
export const sideZ = (W, y, belt, taper) => W / 2 - (y > belt ? taper * (y - belt) : 0);

// A flat panel cut to a side-view polygon, laid on a tapered side (so windows and decals follow
// the lean of the greenhouse). facing: +1 = the +z side, -1 = the -z side.
export function sidePanel(parent, pts, mat, W, { belt = 99, taper = 0, facing = 1, out = 0.004 } = {}) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, facing * (sideZ(W, pos.getY(i), belt, taper) + out));
  if (facing < 0) geo.index.array.reverse(); // flip winding so it faces -z
  geo.computeVertexNormals();
  const m = mesh(parent, geo, mat, 0, 0, 0, false);
  return m;
}

// A decal (canvas texture) standing on a side face.
export function sideDecal(parent, tex, w, h, x, y, z, facing) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z);
  if (facing < 0) m.rotation.y = Math.PI;
  parent.add(m);
  return m;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Soft contact shadow under a vehicle (L along x, W along z).
let shadowTex = null;
export function contactShadow(parent, L, W, y = 0.012) {
  if (!shadowTex) {
    shadowTex = canvasTex(256, 256, (g) => {
      g.filter = 'blur(18px)';
      g.fillStyle = 'rgba(0,0,0,0.85)';
      g.beginPath(); g.roundRect(40, 40, 176, 176, 40); g.fill();
    });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.18, W * 1.3),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = -1;
  m.raycast = () => {}; // just a shadow: taps go straight through it
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- wheels
let treadTex = null;
// u runs around the tire, v runs across it (inside sidewall -> tread -> outside sidewall).
function tread() {
  if (!treadTex) {
    treadTex = canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#232323'; g.fillRect(0, 0, w, h);               // sidewalls
      g.fillStyle = '#2c2c2c'; g.fillRect(0, 26, w, 6); g.fillRect(0, h - 32, w, 6); // raised rings
      g.fillStyle = '#191919'; g.fillRect(0, 72, w, h - 144);       // tread band
      g.fillStyle = '#060606';
      g.fillRect(0, 104, w, 5); g.fillRect(0, h - 109, w, 5);       // circumferential grooves
      for (const [y0, y1, off] of [[72, 104, 0], [109, 147, 32], [152, 184, 0]]) { // lug blocks
        g.fillRect(off ? 0 : 20, y0, 10, y1 - y0);
        g.fillRect(off ? 40 : 52, y0 + 6, 8, y1 - y0 - 12);
      }
      g.fillRect(0, 72, w, 3); g.fillRect(0, h - 75, w, 3);
    });
    treadTex.wrapS = treadTex.wrapT = THREE.RepeatWrapping;
  }
  return treadTex;
}

// Tire: a revolved rounded cross-section. Axis along z.
function tireGeo(r, w, rimR = 0.64) {
  const ri = r * rimR; // where the rim starts
  const pts = [];
  const sh = Math.min(0.06, w * 0.28); // shoulder radius
  pts.push(new THREE.Vector2(ri, -w / 2 + 0.01));
  pts.push(new THREE.Vector2(r - sh * 1.8, -w / 2));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r - sh + Math.cos(a) * sh, -w / 2 + sh + Math.sin(a) * sh)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r - sh + Math.cos(a) * sh, w / 2 - sh + Math.sin(a) * sh)); }
  pts.push(new THREE.Vector2(r - sh * 1.8, w / 2));
  pts.push(new THREE.Vector2(ri, w / 2 - 0.01));
  const geo = new THREE.LatheGeometry(pts, 32);
  geo.rotateX(Math.PI / 2); // lathe axis (y) -> z
  return geo;
}

const tireMats = {};
function tireMat(r) {
  const key = r.toFixed(2);
  if (!tireMats[key]) {
    const t = tread().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.round((2 * Math.PI * r) / 0.07), 1);
    // the tread pattern only on the middle of the profile: draw it on the whole texture but
    // the sidewalls are dark anyway; keep it subtle with a dark base colour
    tireMats[key] = new THREE.MeshStandardMaterial({ map: t, color: 0xffffff, roughness: 0.92 });
  }
  return tireMats[key];
}

// Rim face: a disc with spoke windows cut out, plus hub and lug nuts.
//   style: 'steel' (truck: round vent holes, 8 lugs), 'alloy' (car: 5 spokes), 'dually' (deep dish)
function rimFace(g, r, side, style, mat) {
  const R = r * (style === 'alloy' ? 0.72 : 0.64);
  const s = new THREE.Shape();
  s.absarc(0, 0, R, 0, Math.PI * 2, false);
  if (style === 'alloy') {
    const n = 10; // five double spokes
    for (let i = 0; i < n; i++) {
      const gap = i % 2 ? 0.07 : 0.11;
      const a0 = (i / n) * Math.PI * 2 + gap, a1 = a0 + (Math.PI * 2) / n - gap - (i % 2 ? 0.11 : 0.07);
      const h = new THREE.Path();
      const r0 = R * 0.34, r1 = R * 0.84;
      h.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      h.absarc(0, 0, r1, a0, a1, false);
      h.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
      h.absarc(0, 0, r0, a1, a0, true);
      s.holes.push(h);
    }
  } else {
    const n = style === 'dually' ? 8 : 8;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, R * 0.13, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
  }
  const depth = 0.02;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 });
  const dish = style === 'dually' ? 0.06 : 0.02; // how far the face sits inside the tire
  const face = mesh(g, geo, mat, 0, 0, 0);
  face.position.z = side > 0 ? (g.userData.w / 2 - dish - depth) : -(g.userData.w / 2 - dish);
  // dark barrel behind the face (seen through the spoke windows)
  const barrel = mesh(g, new THREE.CylinderGeometry(R * 0.98, R * 0.98, g.userData.w * 0.9, 28, 1, true), KM.well, 0, 0, 0, false);
  barrel.rotation.x = Math.PI / 2;
  const back = mesh(g, new THREE.CircleGeometry(R * 0.98, 28), KM.well, 0, 0, side * -0.02, false);
  if (side < 0) back.rotation.y = Math.PI;
  // brake rotor behind the spokes
  const rotor = mesh(g, new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.02, 28), KM.darkWheel, 0, 0, side * (g.userData.w / 2 - dish - 0.06), false);
  rotor.rotation.x = Math.PI / 2;
  // hub + lug nuts
  const zf = side * (g.userData.w / 2 - dish + 0.012);
  const hub = mesh(g, new THREE.CylinderGeometry(R * 0.26, R * 0.3, 0.05, 20), style === 'alloy' ? mat : KM.chrome, 0, 0, zf, false);
  hub.rotation.x = Math.PI / 2;
  const lugs = style === 'alloy' ? 5 : 8;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    const lug = mesh(g, new THREE.CylinderGeometry(0.011, 0.011, 0.03, 6), KM.chrome, Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, zf + side * 0.01, false);
    lug.rotation.x = Math.PI / 2;
  }
}

// One wheel at (x, y, z), axis along z. outward: +1 if the outside face is toward +z.
export function wheel2(parent, x, y, z, { r = 0.4, w = 0.27, style = 'steel', mat = KM.steelWheel, outward = 1 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.w = w;
  parent.add(g);
  mesh(g, tireGeo(r, w, style === 'alloy' ? 0.72 : 0.64), tireMat(r));
  rimFace(g, r, outward, style, mat);
  // the inside face just gets a plain dark disc
  const inner = mesh(g, new THREE.CircleGeometry(r * (style === 'alloy' ? 0.72 : 0.64), 24), KM.well, 0, 0, -outward * (w / 2 - 0.01), false);
  if (outward > 0) inner.rotation.y = Math.PI;
  return g;
}

// Black plastic fender flare around an arch, on the side face at z = sz (facing ±1).
export function flare(parent, cx, cy, r, sz, facing, { thick = 0.07, depth = 0.06, mat = KM.plastic } = {}) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r + thick, 0, Math.PI, false);
  s.lineTo(-r, 0);
  s.absarc(0, 0, r, Math.PI, 0, true);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 28 });
  const m = mesh(parent, geo, mat, cx, cy, facing > 0 ? sz - depth * 0.4 : sz - depth * 0.6);
  return m;
}

// Dark wheel-well liner inside an arch (spans the body width so you can't see through).
export function wellLiner(parent, cx, cy, r, W) {
  // half cylinder (the top half), axis along z
  const m = mesh(parent, new THREE.CylinderGeometry(r - 0.01, r - 0.01, W - 0.04, 24, 1, true, Math.PI / 2, Math.PI), KM.well, cx, cy, 0, false);
  m.rotation.x = Math.PI / 2;
  return m;
}

// Headlight: clear lens over a chrome reflector, with an LED strip. Sits on the front face (x0).
export function headlight(parent, x0, y, z, w, h, { drl = true, amber = true } = {}) {
  // layers from back to front: chrome bezel, black backing, reflectors + bulbs, clear lens
  rbox(parent, KM.chrome, 0.04, h + 0.035, w + 0.035, 0.02, x0 - 0.03, y, z);
  boxM(parent, KM.trim, 0.006, h - 0.006, w - 0.006, x0 - 0.008, y, z, false);
  const n = 2;
  for (let i = 0; i < n; i++) {
    const cz = z + (i - (n - 1) / 2) * (w / n);
    const refl = mesh(parent, new THREE.CylinderGeometry(h * 0.27, h * 0.22, 0.02, 20), KM.reflector, x0 + 0.002, y + 0.03, cz, false);
    refl.rotation.z = -Math.PI / 2;
    const bulb = mesh(parent, new THREE.SphereGeometry(h * 0.08, 10, 8), KM.drl, x0 + 0.014, y + 0.03, cz, false);
    bulb.scale.set(0.5, 1, 1);
  }
  if (drl) boxM(parent, KM.drl, 0.01, 0.022, w * 0.9, x0 + 0.006, y - h / 2 + 0.03, z, false);
  if (amber) boxM(parent, KM.amber, 0.01, h * 0.22, w * 0.2, x0 + 0.006, y - h * 0.18, z + Math.sign(z || 1) * w * 0.38, false);
  rbox(parent, KM.lens, 0.016, h, w, 0.012, x0 + 0.026, y, z);
}

// Grille texture: chrome-surround bar grille (truck) or mesh grille (car).
export function grilleTex(kind = 'bars') {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0e0f11'; g.fillRect(0, 0, w, h);
    if (kind === 'truck') { // black honeycomb with two heavy chrome bars
      g.fillStyle = '#1b1d20';
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 10; x < w; x += 20) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
      for (const y of [h * 0.3, h * 0.66]) {
        const gr = g.createLinearGradient(0, y - 14, 0, y + 14);
        gr.addColorStop(0, '#6d7279'); gr.addColorStop(0.5, '#dfe2e6'); gr.addColorStop(1, '#474b50');
        g.fillStyle = gr; g.fillRect(0, y - 14, w, 28);
      }
    } else if (kind === 'bars') {
      for (let y = 18; y < h; y += 40) {
        const gr = g.createLinearGradient(0, y, 0, y + 22);
        gr.addColorStop(0, '#5b6067'); gr.addColorStop(0.5, '#c9cdd2'); gr.addColorStop(1, '#3a3e43');
        g.fillStyle = gr; g.fillRect(14, y, w - 28, 20);
      }
      for (let x = 14; x < w; x += 120) { g.fillStyle = '#2a2d31'; g.fillRect(x, 0, 10, h); }
    } else {
      g.fillStyle = '#26292d';
      for (let y = 0; y < h; y += 20) for (let x = (y / 20) % 2 ? 0 : 14; x < w; x += 28) {
        g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 10, y); g.lineTo(x + 20, y + 10); g.lineTo(x + 10, y + 20); g.closePath(); g.fill();
      }
    }
  });
}

export function plateTex(text = 'DTS 104', state = 'CALIFORNIA') {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#333'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#b3242a'; g.font = 'italic bold 24px Georgia, serif'; g.textAlign = 'center';
    g.fillText(state, w / 2, 30);
    g.fillStyle = '#1b2a5a'; g.font = 'bold 56px Arial, sans-serif';
    g.fillText(text, w / 2, 96);
  });
}

// Side mirror on an arm. sz: body side z, facing ±1. tow = tall truck tow mirror.
export function mirror(parent, x, y, sz, facing, { tow = false, mat = KM.trim } = {}) {
  const arm = facing * 0.11;
  boxM(parent, mat, 0.06, 0.035, 0.18, x, y, sz + arm * 0.8, false);
  const hw = tow ? 0.17 : 0.12, hh = tow ? 0.3 : 0.14;
  rbox(parent, mat, 0.08, hh, hw, 0.03, x - 0.02, y + (tow ? 0.06 : 0.03), sz + facing * (0.17 + hw / 2));
  const glass = boxM(parent, KM.glass, 0.004, hh - 0.03, hw - 0.03, x - 0.064, y + (tow ? 0.06 : 0.03), sz + facing * (0.17 + hw / 2), false);
  if (tow) boxM(parent, KM.amber, 0.03, 0.025, hw * 0.6, x - 0.01, y - 0.07, sz + facing * (0.17 + hw / 2), false);
  return glass;
}

// ---------------------------------------------------------------- lofted (curved) bodies
// Piecewise-linear lookup in a sorted [[x, y], ...] list.
function lerpPts(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); }
  }
  return pts[pts.length - 1][1];
}
// Smoothed lookup: average over a small window so polyline corners become soft curves.
export function curve(pts, soft = 0.12) {
  return (x) => { let s = 0; const n = 7; for (let i = 0; i < n; i++) s += lerpPts(pts, x + (i / (n - 1) - 0.5) * soft); return s / n; };
}

// A body lofted along x from cross-sections. Each slice is a squircle between bottom(x) and
// top(x), half as wide as half(x), with a shoulder (sides bulge out a little at `shoulder` of the
// height) and lean (sides lean in toward the top). Wheel arches cut up into the bottom.
//   arches: [[cx, cy, r], ...]   ends: how far (m) the plan view rounds off at each end
export function loft({ x0, x1, top, bottom, half, arches = [], step = 0.03, ring = 44, squircle = 5,
  bulge = 0.03, shoulder = 0.62, lean = 0, ends = [0.25, 0.2] }) {
  const xs = [];
  for (let x = x0; x < x1; x += step) xs.push(x);
  xs.push(x1);
  for (const [cx, , r] of arches) for (const e of [cx - r, cx + r]) { xs.push(e - 0.004, e + 0.004); }
  xs.sort((a, b) => a - b);
  const pos = [], idx = [];
  const ex = 2 / squircle;
  const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
  for (const x of xs) {
    let b = bottom(x);
    for (const [cx, cy, r] of arches) if (Math.abs(x - cx) < r) b = Math.max(b, cy + Math.sqrt(r * r - (x - cx) ** 2));
    const t = Math.max(top(x), b + 0.02);
    let hw = half(x);
    // round the plan view at the nose and tail
    const dF = x1 - x, dR = x - x0;
    if (dF < ends[0]) hw *= Math.sqrt(Math.max(0.0, 1 - ((ends[0] - dF) / ends[0]) ** 2)) * 0.35 + 0.65;
    if (dR < ends[1]) hw *= Math.sqrt(Math.max(0.0, 1 - ((ends[1] - dR) / ends[1]) ** 2)) * 0.35 + 0.65;
    const mid = (b + t) / 2, hh = (t - b) / 2;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      const y = mid + hh * sgnPow(Math.sin(a), ex);
      const u = (y - b) / (t - b);
      let z = hw * sgnPow(Math.cos(a), ex);
      z *= 1 + bulge * (1 - ((u - shoulder) / 0.6) ** 2) - lean * Math.max(0, u - shoulder);
      pos.push(x, y, z);
    }
  }
  // End caps as concentric rings shrinking to the centre (a grid, not a fan), so windows can
  // be cut cleanly into them too.
  const S0 = xs.length;
  const capRings = 6;
  const ringAt = (s) => pos.slice(s * ring * 3, (s + 1) * ring * 3);
  const addCap = (s, atFront) => {
    const base = ringAt(s);
    let cy = 0; for (let i = 0; i < ring; i++) cy += base[i * 3 + 1]; cy /= ring;
    const rings = [];
    for (let k = 1; k <= capRings; k++) {
      const f = 1 - k / capRings;
      const start = pos.length / 3;
      for (let i = 0; i < ring; i++) pos.push(base[i * 3], cy + (base[i * 3 + 1] - cy) * f, base[i * 3 + 2] * f);
      rings.push(start);
    }
    let prev = s * ring;
    for (const r0 of rings) {
      for (let i = 0; i < ring; i++) {
        const a = prev + i, b2 = prev + (i + 1) % ring, c = r0 + i, d = r0 + (i + 1) % ring;
        if (atFront) idx.push(a, c, b2, b2, c, d); else idx.push(a, b2, c, b2, d, c);
      }
      prev = r0;
    }
  };
  for (let s = 0; s < S0 - 1; s++) for (let i = 0; i < ring; i++) {
    const a = s * ring + i, b2 = s * ring + (i + 1) % ring, c = (s + 1) * ring + i, d = (s + 1) * ring + (i + 1) % ring;
    idx.push(a, c, b2, b2, c, d);
  }
  addCap(0, false);
  addCap(S0 - 1, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Split a geometry into material groups: classify(c, n) gets each triangle's centre and face
// normal (THREE.Vector3s) and returns a material index. Lets windows be "painted" straight onto a
// curved lofted greenhouse, so the glass follows the body exactly.
export function splitByMaterial(geo, classify) {
  const p = geo.attributes.position, ix = geo.index.array;
  const buckets = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), ctr = new THREE.Vector3();
  for (let i = 0; i < ix.length; i += 3) {
    a.fromBufferAttribute(p, ix[i]); b.fromBufferAttribute(p, ix[i + 1]); c.fromBufferAttribute(p, ix[i + 2]);
    ctr.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const m = classify(ctr, n) | 0;
    (buckets[m] = buckets[m] || []).push(ix[i], ix[i + 1], ix[i + 2]);
  }
  const all = [];
  geo.clearGroups();
  buckets.forEach((tris, m) => { if (!tris) return; geo.addGroup(all.length, tris.length, m); all.push(...tris); });
  geo.setIndex(all);
  return geo;
}

export function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A flat panel laid on a sloped front or back face, between two side-view points a and b
// (a lower, b higher on a front face), half-widths ha at a and hb at b, pushed out along the
// face normal by `out`. Has UVs (u across, reading left to right from in front; v from a to b),
// so it can carry a grille or sign texture.
export function facePanel(parent, mat, a, b, ha, hb, { out = 0.006, rear = false } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const sg = rear ? -1 : 1;
  const nx = (sg * dy / L) * out, ny = (-sg * dx / L) * out;
  const pos = [a[0] + nx, a[1] + ny, -ha, a[0] + nx, a[1] + ny, ha, b[0] + nx, b[1] + ny, hb, b[0] + nx, b[1] + ny, -hb];
  const uv = rear ? [0, 0, 1, 0, 1, 1, 0, 1] : [1, 0, 0, 0, 0, 1, 1, 1];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(rear ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  geo.computeVertexNormals();
  return mesh(parent, geo, mat, 0, 0, 0, false);
}

// ---------------------------------------------------------------- decals that hug a surface
// Lay a flat 2D shape onto a curved body by projecting it: every vertex of the (finely
// subdivided) shape is ray-cast onto `target` (a geometry, or a mesh sitting at its parent's
// origin) and lifted off it by `out`. Edges stay crisp and the decal follows the curves.
//   view: 'front' looks down -x, pts are [z, y]   'back'  looks down +x, pts are [z, y]
//         'side'  looks at the side facing ±z (facing), pts are [x, y]
// Triangles that fall off the body are dropped. uv: the shape's own coordinates scaled to 0..1.
// A fast surface lookup for one view: the geometry's triangles that face the viewer, bucketed
// on a grid in the view plane. hit(u, v) returns the nearest surface point and normal, or null.
function projector(geo, view, facing) {
  const key = view + facing;
  geo.userData.proj = geo.userData.proj || {};
  if (geo.userData.proj[key]) return geo.userData.proj[key];
  const P = geo.attributes.position.array, ix = geo.index ? geo.index.array : null;
  const nT = (ix ? ix.length : P.length / 3) / 3;
  // view axes: u, v in the plane, d = depth toward the viewer
  const side = view === 'side';
  const iu = side ? 0 : 2, iv = 1, id = side ? 2 : 0, ds = side ? facing : view === 'front' ? 1 : -1;
  const C = 0.08;
  const T = new Float32Array(nT * 12); // per triangle: 3 x (u, v, d) + normal
  let umin = Infinity, vmin = Infinity, umax = -Infinity, vmax = -Infinity;
  const keep = [];
  for (let t = 0; t < nT; t++) {
    const a = (ix ? ix[t * 3] : t * 3) * 3, b = (ix ? ix[t * 3 + 1] : t * 3 + 1) * 3, c = (ix ? ix[t * 3 + 2] : t * 3 + 2) * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    if ((n[id] / l) * ds <= 0.02) continue;          // faces away from the viewer
    const o = t * 12;
    for (const [k, q] of [[0, a], [1, b], [2, c]]) { T[o + k * 3] = P[q + iu]; T[o + k * 3 + 1] = P[q + iv]; T[o + k * 3 + 2] = P[q + id]; }
    T[o + 9] = n[0] / l; T[o + 10] = n[1] / l; T[o + 11] = n[2] / l;
    keep.push(t);
    for (let k = 0; k < 3; k++) { umin = Math.min(umin, T[o + k * 3]); umax = Math.max(umax, T[o + k * 3]); vmin = Math.min(vmin, T[o + k * 3 + 1]); vmax = Math.max(vmax, T[o + k * 3 + 1]); }
  }
  const NU = Math.max(1, Math.ceil((umax - umin) / C) + 1), NV = Math.max(1, Math.ceil((vmax - vmin) / C) + 1);
  const cells = new Map();
  for (const t of keep) {
    const o = t * 12;
    const u0 = Math.min(T[o], T[o + 3], T[o + 6]), u1 = Math.max(T[o], T[o + 3], T[o + 6]);
    const v0 = Math.min(T[o + 1], T[o + 4], T[o + 7]), v1 = Math.max(T[o + 1], T[o + 4], T[o + 7]);
    for (let cu = Math.floor((u0 - umin) / C); cu <= Math.floor((u1 - umin) / C); cu++)
      for (let cv = Math.floor((v0 - vmin) / C); cv <= Math.floor((v1 - vmin) / C); cv++) {
        const k = cu * NV + cv; let arr = cells.get(k); if (!arr) cells.set(k, arr = []); arr.push(t);
      }
  }
  const hit = (u, v) => {
    const arr = cells.get(Math.floor((u - umin) / C) * NV + Math.floor((v - vmin) / C));
    if (!arr) return null;
    let best = null, bestD = -Infinity;
    for (const t of arr) {
      const o = t * 12;
      const x1 = T[o], y1 = T[o + 1], x2 = T[o + 3], y2 = T[o + 4], x3 = T[o + 6], y3 = T[o + 7];
      const den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (Math.abs(den) < 1e-12) continue;
      const w1 = ((y2 - y3) * (u - x3) + (x3 - x2) * (v - y3)) / den, w2 = ((y3 - y1) * (u - x3) + (x1 - x3) * (v - y3)) / den, w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      const d = w1 * T[o + 2] + w2 * T[o + 5] + w3 * T[o + 8];
      if (d * ds > bestD) { bestD = d * ds; best = { d, n: [T[o + 9], T[o + 10], T[o + 11]] }; }
    }
    if (!best) return null;
    const p = [0, 0, 0]; p[iu] = u; p[iv] = v; p[id] = best.d;
    return { p, n: best.n };
  };
  geo.userData.proj[key] = hit;
  return hit;
}
function subdivide(geo, maxLen) {
  const p = geo.index ? geo.toNonIndexed().attributes.position.array : geo.attributes.position.array;
  let tris = [];
  for (let i = 0; i < p.length; i += 9) tris.push([p[i], p[i + 1], p[i + 3], p[i + 4], p[i + 6], p[i + 7]]);
  for (let pass = 0; pass < 8; pass++) {
    const next = [];
    let split = false;
    for (const t of tris) {
      const [ax, ay, bx, by, cx, cy] = t;
      const lab = Math.hypot(ax - bx, ay - by), lbc = Math.hypot(bx - cx, by - cy), lca = Math.hypot(cx - ax, cy - ay);
      const m = Math.max(lab, lbc, lca);
      if (m <= maxLen) { next.push(t); continue; }
      split = true;
      // split the longest edge
      if (m === lab) { const mx = (ax + bx) / 2, my = (ay + by) / 2; next.push([ax, ay, mx, my, cx, cy], [mx, my, bx, by, cx, cy]); }
      else if (m === lbc) { const mx = (bx + cx) / 2, my = (by + cy) / 2; next.push([ax, ay, bx, by, mx, my], [ax, ay, mx, my, cx, cy]); }
      else { const mx = (cx + ax) / 2, my = (cy + ay) / 2; next.push([ax, ay, bx, by, mx, my], [mx, my, bx, by, cx, cy]); }
    }
    tris = next;
    if (!split) break;
  }
  return tris;
}
export function decal(parent, target, pts, mat, { view = 'front', facing = 1, out = 0.004, res = 0.035, shadow = false } = {}) {
  const geoT = target.isMesh ? target.geometry : target;
  const hitAt = projector(geoT, view, facing);
  const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  const tris = subdivide(new THREE.ShapeGeometry(shape), res);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [u, v] of pts) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const cache = new Map();
  const project = (u, v) => {
    const key = `${u.toFixed(5)},${v.toFixed(5)}`;
    if (cache.has(key)) return cache.get(key);
    const h = hitAt(u, v);
    const r = h ? [h.p[0] + h.n[0] * out, h.p[1] + h.n[1] * out, h.p[2] + h.n[2] * out] : null;
    cache.set(key, r);
    return r;
  };
  const pos = [], uv = [];
  for (const [ax, ay, bx, by, cx, cy] of tris) {
    const A = project(ax, ay), B = project(bx, by), C = project(cx, cy);
    if (!A || !B || !C) continue;
    // keep the projected triangle's winding facing back toward the viewer
    pos.push(...A, ...B, ...C);
    // u runs left to right as the viewer sees it
    const mirrorU = view === 'front' || (view === 'side' && facing < 0);
    for (const [u, v] of [[ax, ay], [bx, by], [cx, cy]]) {
      const uu = (u - u0) / (u1 - u0 || 1);
      uv.push(mirrorU ? 1 - uu : uu, (v - v0) / (v1 - v0 || 1));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // ShapeGeometry winds counter-clockwise in (u, v): faces +w. Flip where the viewer looks the other way.
  const flip = view === 'front' ? true : view === 'back' ? false : facing < 0;
  if (flip) { const a = geo.attributes.position.array, b = geo.attributes.uv.array;
    for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; }
    for (let i = 0; i < b.length; i += 6) for (let k = 0; k < 2; k++) { const t = b[i + 2 + k]; b[i + 2 + k] = b[i + 4 + k]; b[i + 4 + k] = t; } }
  geo.computeVertexNormals();
  const m = mesh(parent, geo, mat, 0, 0, 0, shadow);
  m.raycast = () => {}; // taps go to the body underneath
  return m;
}
// Where a ray from the side (facing ±1) meets the body at (x, y): the surface z, or null.
export function surfaceZ(target, x, y, facing) {
  const h = projector(target.isMesh ? target.geometry : target, 'side', facing)(x, y);
  return h ? h.p[2] : null;
}
