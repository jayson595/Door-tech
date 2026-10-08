// input.js — turns finger/mouse touches on the 3D view into game actions.
//
// "Raycasting" = shooting an invisible line from the camera through the spot you touched
// and listing every 3D object it passes through, nearest first. We skip see-through
// things (glass, window lettering) and look at the first solid thing behind them:
//
//   a component's tap box  -> SELECT that component
//   the door               -> TAP = pull it open, DRAG = pull/push it by hand
//   anything else          -> deselect and step back
//
// Dragging the door: outside, drag DOWN or LEFT (pulling toward you).
//                    inside, drag UP or RIGHT (pushing it out).

import * as THREE from 'three';
import * as SFX from './src-audio.js';
import { COMPONENTS } from './src-components.js';

const DRAG_DEGREES_PER_PIXEL = 0.38;
const TAP_SLOP = 8; // pixels a finger can wobble and still count as a tap

export function setupInput(canvas, camera, scene, door, rig, selection) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let grab = null; // { id, x, y, startAngle, moved, target }
  // Pinch to zoom (two fingers) and mouse-wheel zoom.
  const touches = new Map(); // pointerId -> {x, y}
  let pinchDist = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    rig.zoomBy(e.deltaY > 0 ? 1.1 : 0.9);
  }, { passive: false });

  const isDoor = (obj) => {
    for (let o = obj; o; o = o.parent) if (o === door.parts.doorLeaf) return true;
    return false;
  };

  // What did the player touch?  -> { kind: 'component', id } | { kind: 'door' } | { kind: 'none' }
  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    let touchedDoorGlass = false;
    for (const hit of raycaster.intersectObject(scene, true)) {
      const o = hit.object;
      if (o.userData.cabinetId) return { kind: 'cabinet', id: o.userData.cabinetId };
      if (o.userData.componentId) return { kind: 'component', id: o.userData.componentId };
      if (o.userData.seeThrough) {
        if (isDoor(o)) touchedDoorGlass = true;
        continue;
      }
      if (!o.visible) continue;
      if (isDoor(o)) return { kind: 'door' };
      break; // first solid thing that isn't the door or a component
    }
    return touchedDoorGlass ? { kind: 'door' } : { kind: 'none' };
  }

  canvas.addEventListener('pointerdown', (e) => {
    SFX.unlock();
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { // second finger down: this is a pinch, not a tap or drag
        pinchDist = spread();
        if (grab && door.state === 'dragging') door.release();
        grab = null;
        return;
      }
    }
    if (grab || rig.fading || door.locked) return;
    grab = { id: e.pointerId, x: e.clientX, y: e.clientY, startAngle: door.angle, moved: false, target: pick(e) };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const d = spread();
        if (pinchDist > 0 && d > 0) rig.zoomBy(pinchDist / d); // fingers apart = closer
        pinchDist = d;
        return;
      }
    }
    if (!grab) {
      // desktop mouse hover: softly light up whatever component is under the cursor
      if (e.pointerType === 'mouse') {
        const p = pick(e);
        selection.hover(p.kind === 'component' ? p.id : null);
        canvas.style.cursor = p.kind === 'none' ? 'default' : 'pointer';
      }
      return;
    }
    if (e.pointerId !== grab.id) return;
    const dx = e.clientX - grab.x, dy = e.clientY - grab.y;
    // Only a drag that STARTED on the door (or on a part mounted to it) moves the door.
    const onDoor = grab.target.kind === 'door' ||
      (grab.target.kind === 'component' && isDoor(COMPONENTS[grab.target.id].proxy));
    if (!grab.moved && Math.hypot(dx, dy) > TAP_SLOP) {
      grab.moved = true;
      if (onDoor) door.startDrag(rig.side);
    }
    if (grab.moved && onDoor) {
      const pull = rig.side === 'out' ? dy - dx : dx - dy;
      // a heavy door (cranked closer/operator) moves less for the same finger drag
      door.dragTo(grab.startAngle + pull * DRAG_DEGREES_PER_PIXEL * door.pullEffort);
    }
  });

  function end(e) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinchDist = 0;
    if (!grab || e.pointerId !== grab.id) return;
    const { moved, target } = grab;
    grab = null;
    if (moved) {
      if (door.state === 'dragging') door.release();
      return;
    }
    if (target.kind === 'cabinet') { if (selection.truck && selection.truck.isOpen) selection.truck.openCabinet(target.id); return; }
    if (selection.truck && selection.truck.isOpen) return; // at the truck: only cabinets respond
    if (target.kind === 'component') selection.select(target.id);
    else if (target.kind === 'door') door.tapPull(rig.side === 'in' ? 'egress' : 'pull');
    else selection.clear();
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
