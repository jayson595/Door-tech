// params.js — which door / call to load, carried across a page reload.
//
// When the player accepts a call on the OTHER door, the game reloads into that door. The
// choice travels three ways, checked in this order:
//   1. sessionStorage (works everywhere, including the published Artifact)
//   2. the link's #hash, e.g.  #door-manual.fault-sag.go
//   3. the ?query string, e.g. ?door=manual&fault=sag&go=1  (handy while developing)

const KEY = 'doortech-next';

let pending = null;
try {
  pending = JSON.parse(sessionStorage.getItem(KEY));
  sessionStorage.removeItem(KEY);
} catch (e) { /* storage blocked: fall back to the hash / query */ }

const fromHash = {};
for (const token of location.hash.slice(1).split('.')) {
  if (!token) continue;
  const i = token.indexOf('-');
  if (i < 0) fromHash[token] = '1';
  else fromHash[token.slice(0, i)] = token.slice(i + 1);
}
const fromQuery = new URLSearchParams(location.search);

export function param(name) {
  if (pending && pending[name] != null) return String(pending[name]);
  if (fromHash[name] != null) return fromHash[name];
  return fromQuery.get(name);
}

// Reload the game with these settings, e.g. reloadInto({ door: 'manual', fault: 'sag', go: 1 }).
export function reloadInto(next) {
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* hash still carries it */ }
  const tokens = Object.entries(next).map(([k, v]) => (v === 1 || v === true ? k : `${k}-${v}`));
  const hash = `#${tokens.join('.')}`;
  if (location.hash === hash) location.reload();
  else { location.hash = hash; location.reload(); }
}
