// camera.js — where the player is standing and looking.
//
// Views:
//   arrival   wide shot of the storefront when the job starts
//   out       standing on the sidewalk facing the door (overview)
//   in        standing inside the store facing the door (overview)
//   focus     close-up on one component (comes from COMPONENTS[id].focus)
//
// The camera glides smoothly toward whichever view is the target. Walking through the
// door to the other side uses a quick fade to black instead of flying through the glass.

import * as THREE from 'three';
import { FRAMING } from './src-scene.js';

export class CameraRig {
  constructor(camera, { stage, topbar, controls, fade }) {
    this.camera = camera;
    this.el = { stage, topbar, controls, fade };
    this.pos = new THREE.Vector3();     // where the camera is right now
    this.look = new THREE.Vector3();    // what it's looking at right now
    this.goalPos = new THREE.Vector3(); // where it's heading
    this.goalLook = new THREE.Vector3();
    this.views = {};
    this.side = 'out';
    this.current = 'arrival';
    this.speed = 1.6;
    this.fading = false;
    this.shakeAmount = 0;
    this.zoom = 1;          // pinch / wheel zoom: 1 = normal, smaller = closer (ZOOM_MIN)
    this.zoomGoal = 1;
    this.resize();
    this.pos.copy(this.views.arrival.pos);
    this.look.copy(this.views.arrival.look);
    this.go('arrival');
  }

  // Back the camera away from the wall until the framing box fits in the part of
  // the screen that the top bar and bottom controls don't cover.
  fit(box) {
    const cam = this.camera;
    const stageRect = this.el.stage.getBoundingClientRect();
    const h = stageRect.height;
    const topPx = this.el.topbar.getBoundingClientRect().bottom - stageRect.top + 6;
    const botPx = stageRect.bottom - this.el.controls.getBoundingClientRect().top + 6;
    const ndcTop = 1 - (2 * topPx) / h;
    const ndcBot = -1 + (2 * botPx) / h;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(
      (box.yMax - box.yMin) / (t * (ndcTop - ndcBot)),
      box.xHalf / (t * cam.aspect),
    );
    const eyeY = (box.yMax + box.yMin) / 2 - dist * t * ((ndcTop + ndcBot) / 2);
    return new THREE.Vector3(box.cx, eyeY, dist);
  }

  resize() {
    const a = this.fit(FRAMING.arrival);
    const o = this.fit(FRAMING.work);
    // inside: the same view mirrored, unless the building frames its inside differently
    const i = FRAMING.inside ? (() => { const v = this.fit(FRAMING.inside); return v.setZ(-v.z); })() : o.clone().setZ(-o.z);
    this.views.arrival = { side: 'out', pos: a, look: a.clone().setZ(0) };
    this.views.out = { side: 'out', pos: o, look: o.clone().setZ(0) };
    this.views.in = { side: 'in', pos: i, look: i.clone().setZ(0) };
    if (this.views[this.current]) this.go(this.current);
  }

  // Head for a named view ('arrival' | 'out' | 'in') or a component's focus.
  // Pinch or mouse-wheel zoom toward whatever the camera is looking at.
  zoomBy(factor) {
    this.zoomGoal = Math.min(1, Math.max(0.3, this.zoomGoal * factor));
  }

  go(view, focus = null) {
    this.zoomGoal = 1; // moving to a new view resets the zoom
    // the very first walk up from the arrival shot is slow; everything after is snappy
    this.speed = view === 'arrival' || this.current === 'arrival' ? 1.6 : 3.5;
    let target;
    if (focus) {
      target = { side: focus.side, pos: focus.camV, look: focus.lookV };
      this.current = 'focus';
    } else {
      target = this.views[view];
      this.current = view;
    }
    this.goalPos.copy(target.pos);
    this.goalLook.copy(target.look);

    if (target.side !== this.side) {
      // Walk through the door: fade out, jump to the other side, fade back in.
      this.side = target.side;
      this.fading = true;
      this.el.fade.classList.add('on');
      setTimeout(() => {
        this.pos.copy(this.goalPos);
        this.look.copy(this.goalLook);
        this.el.fade.classList.remove('on');
        this.fading = false;
      }, 230);
    }
  }

  // Jolt the view (door slamming). strength 0..1
  shake(strength) {
    this.shakeAmount = Math.max(this.shakeAmount, strength);
  }

  update(dt, t) {
    if (!this.fading) {
      const k = 1 - Math.exp(-dt * this.speed);
      this.pos.lerp(this.goalPos, k);
      this.look.lerp(this.goalLook, k);
    }
    // tiny breathing sway so it feels like someone standing there
    this.zoom += (this.zoomGoal - this.zoom) * Math.min(1, dt * 10);
    const zx = this.look.x + (this.pos.x - this.look.x) * this.zoom;
    const zy = this.look.y + (this.pos.y - this.look.y) * this.zoom;
    const zz = this.look.z + (this.pos.z - this.look.z) * this.zoom;
    this.camera.position.set(
      zx + Math.sin(t * 0.55) * 0.006,
      zy + Math.sin(t * 0.9) * 0.004,
      zz,
    );
    if (this.shakeAmount > 0) {
      const s = this.shakeAmount * 0.025;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 3);
    }
    this.camera.lookAt(this.look);
  }
}
