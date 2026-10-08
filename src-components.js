// components.js — the six pieces of hardware the player can select.
//
// Each component has:
//   label / blurb  what the selection card says
//   side           'out' (sidewalk) or 'in' (inside the store) — where the tech stands to work on it
//   actions        which buttons show up when it's selected (not every part allows every action)
//   focus          where the camera moves to get a close look: `look` = the point to look at,
//                  `cam` = where the camera stands (both in meters, world space)
//   hit            an invisible box bigger than the part itself, so it's easy to tap on a phone
//                  (`onDoor: true` means the box rides along with the door when it swings)

import * as THREE from 'three';
import { DOOR, SITE, HAS_OPERATOR, CLOSER_ID } from './src-scene.js';
import { SITE as BUILDING } from './src-sites-index.js';

const H = DOOR.height;
const JAMB_X = DOOR.width / 2 + 0.025;

const STORE_COMPONENTS = {
  [CLOSER_ID]: HAS_OPERATOR ? {
    label: SITE.activation === 'sensor' ? 'Automatic Door Operator' : 'ADA Door Operator',
    blurb: SITE.activation === 'sensor'
      ? 'Automatic operator inside on the header. The motion sensors tell it when to open.'
      : 'Low-energy operator inside on the header. Opens the door when a push plate is pressed, then closes it like a closer.',
    side: 'in',
    actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
    focus: { look: [-0.05, 2.15, -0.2], cam: [0.1, 1.8, -1.75] },
    hit: { center: [-0.05, 2.18, -0.2], size: [0.82, 0.26, 0.3] },
  } : {
    label: 'Door Closer',
    blurb: 'Parallel-arm closer inside on the top rail. Controls how fast and how hard the door shuts.',
    side: 'in',
    actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
    focus: { look: [-0.19, 2.07, -0.1], cam: [0.0, 1.8, -1.25] },
    hit: { onDoor: true, center: [0.29, H - 0.04, -0.09], size: [0.46, 0.17, 0.2] },
  },
  panicDevice: {
    label: 'Panic Device',
    blurb: 'Touchpad-style rim exit device on the inside. Push the pad and the latch pulls back.',
    side: 'in',
    actions: ['INSPECT', 'TEST', 'ADJUST', 'REMOVE', 'REPLACE'],
    focus: { look: [0.0, 1.0, -0.07], cam: [-0.05, 1.4, -2.3] },
    hit: { onDoor: true, center: [0.44, 1.0, -0.075], size: [0.72, 0.15, 0.11] },
  },
  electricStrike: {
    label: 'Electric Strike',
    blurb: 'Electric strike on the jamb. Catches the latch and releases it on access.',
    side: 'in',
    actions: ['INSPECT', 'TEST', 'ADJUST', 'REMOVE', 'REPLACE'],
    focus: { look: [JAMB_X, 1.0, -0.14], cam: [JAMB_X - 0.2, 1.12, -0.72] },
    hit: { center: [JAMB_X, 1.0, -0.14], size: [0.1, 0.26, 0.09] },
  },
  doorAlignment: {
    label: 'Door Alignment',
    blurb: 'Butt hinges, leaf gaps and reveals. How the door hangs in the frame.',
    side: 'out',
    actions: ['INSPECT', 'TEST', 'ADJUST'],
    focus: { look: [-0.1, 1.15, 0], cam: [0.35, 1.35, 2.55] },
    hit: { center: [DOOR.hingeX, H / 2, 0.012], size: [0.09, H, 0.06] },
  },
  accessPanel: {
    label: 'Access Control Panel',
    blurb: 'Controller board + power supply inside. Powers the strike and tells it when to release.',
    side: 'in',
    actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
    actionLabels: { ADJUST: 'SERVICE' }, // open it up and fix what's inside (fuses, terminals)
    focus: { look: [0.8, 1.6, -0.07], cam: [0.62, 1.72, -1.0] },
    hit: { center: [0.8, 1.66, -0.07], size: [0.34, 0.5, 0.08] },
  },
  cardReader: {
    label: 'Card Reader',
    blurb: 'Badge reader on the sidewalk side. Reads the badge and tells the access controller who is at the door.',
    side: 'out',
    actions: ['INSPECT', 'TEST', 'REPLACE'],
    focus: { look: [0.62, 1.12, 0.01], cam: [0.42, 1.32, 1.45] },
    hit: { center: [0.62, 1.15, 0.02], size: [0.14, 0.24, 0.08] },
  },
  ...(SITE.activation === 'pushPlate' ? {
    adaPushPlate: {
      label: 'ADA Push Plate (Outside)',
      blurb: 'Push plate on the bollard. Signals the operator to open the door.',
      side: 'out',
      actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      actionLabels: { ADJUST: 'SERVICE' },
      focus: { look: [0.72, 0.9, 0.55], cam: [0.6, 1.2, 1.45] },
      hit: { center: [0.72, 0.62, 0.52], size: [0.22, 1.24, 0.22] },
    },
    adaPushPlateInside: {
      label: 'ADA Push Plate (Inside)',
      blurb: 'Push plate on the panel inside. Signals the operator to open the door.',
      side: 'in',
      actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      actionLabels: { ADJUST: 'SERVICE' },
      focus: { look: [0.66, 0.95, -0.05], cam: [0.5, 1.2, -0.95] },
      hit: { center: [0.66, 0.95, -0.06], size: [0.22, 0.22, 0.06] },
    },
  } : {}),
  ...(SITE.activation === 'sensor' ? {
    activationSensor: {
      label: 'Motion Sensors',
      blurb: 'Activation sensors on the header, inside and out. Detect people and open the door.',
      side: 'out',
      actions: ['INSPECT', 'TEST', 'ADJUST', 'REPLACE'],
      focus: { look: [0, 2.22, 0.04], cam: [0.1, 1.9, 1.2] },
      hit: { center: [0.05, 2.3, -0.1], size: [0.4, 0.45, 0.5] },
    },
  } : {}),
};

// Another building brings its own parts list.
export const COMPONENTS = BUILDING ? BUILDING.components : STORE_COMPONENTS;

// Builds the invisible tap boxes and gives every component its OWN copy of its
// materials (several parts share "stainless", and we only want the picked one to glow).
export function setupComponents(scene, parts) {
  const extraMeshes = parts.arm ? {
    [CLOSER_ID]: [parts.arm.mainArm, parts.arm.forearm],
    doorAlignment: parts.hingeDoorLeaves,
  } : {};
  const proxyMat = new THREE.MeshBasicMaterial();

  for (const [id, comp] of Object.entries(COMPONENTS)) {
    comp.id = id;
    comp.focus.lookV = new THREE.Vector3(...comp.focus.look);
    comp.focus.camV = new THREE.Vector3(...comp.focus.cam);
    comp.focus.side = comp.side; // the camera needs to know which side of the door this view is on

    // tap box
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(...comp.hit.size), proxyMat);
    proxy.position.set(...comp.hit.center);
    proxy.visible = false;
    proxy.userData.componentId = id;
    // the tap box rides along with whatever it's mounted on (a door leaf, or nothing)
    (comp.hit.attach ? parts[comp.hit.attach] : comp.hit.onDoor ? parts.doorLeaf : scene).add(proxy);
    comp.proxy = proxy;
    // a part that's in more than one place (a magnet on each wall, a closer on each leaf)
    // gets an extra small tap box at each spot instead of one huge box over everything
    for (const ex of comp.hit.extra || []) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(...ex.size), proxyMat);
      p.position.set(...ex.center);
      p.visible = false;
      p.userData.componentId = id;
      (ex.attach ? parts[ex.attach] : scene).add(p);
    }

    // private glow-able materials
    comp.glowMaterials = [];
    const meshes = [];
    parts[id].traverse((o) => { if (o.isMesh) meshes.push(o); });
    meshes.push(...(extraMeshes[id] || []));
    for (const mesh of meshes) {
      const clone = (m) => {
        const c = m.clone();
        if (c.emissive) comp.glowMaterials.push(c);
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
    }
  }
  return COMPONENTS;
}

const GLOW = new THREE.Color(0xf5b301);
export function setGlow(comp, amount) {
  // Pictures (Jayson's art) get a much lighter glow so the art still reads through it.
  for (const m of comp.glowMaterials) m.emissive.copy(GLOW).multiplyScalar(m.map ? amount * 0.3 : amount);
}
