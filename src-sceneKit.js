// sceneKit.js — shared materials and small builders used by every building's scene.
// (Pulled out of scene.js so the new buildings in sites/ can use them too.)

import * as THREE from 'three';

export const MAT = {
  aluminum: new THREE.MeshStandardMaterial({ color: 0xb4b9bf, metalness: 0.35, roughness: 0.38 }), // clear anodized
  infill: new THREE.MeshStandardMaterial({ color: 0xd8cebd, roughness: 0.8 }), // solid panel beside the door
  stainless: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.85, roughness: 0.3 }),
  closer: new THREE.MeshStandardMaterial({ color: 0xc3c7cb, metalness: 0.4, roughness: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.2, roughness: 0.6 }),
  hinge: new THREE.MeshStandardMaterial({ color: 0x55493e, metalness: 0.6, roughness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0xcfe6f0, metalness: 0.1, roughness: 0.05,
    transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  }),
};

// Small helpers so the build code below reads like a parts list.
export function box(parent, name, mat, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

export function glassPane(parent, w, h, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.glass);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  mesh.userData.seeThrough = true; // taps pass through glass
  parent.add(mesh);
  return mesh;
}

// A round bar between two points (used for the closer arm and handle standoffs).
// The cylinder is 1 unit long and gets stretched, so setRod() can move it every frame.
export function rod(parent, mat, radius, a, b) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  mesh.castShadow = true;
  parent.add(mesh);
  setRod(mesh, a, b);
  return mesh;
}

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
export function setRod(mesh, a, b) {
  _dir.subVectors(b, a);
  mesh.position.copy(a).addScaledVector(_dir, 0.5);
  mesh.scale.y = _dir.length();
  mesh.quaternion.setFromUnitVectors(UP, _dir.normalize());
}

export function texturedPlane(parent, tex, w, h, x, y, z, basic = false) {
  const mat = basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  if (basic) mesh.userData.seeThrough = true; // lettering on glass, neon sign
  parent.add(mesh);
  return mesh;
}

// Jayson's art: flat cut-out pictures (transparent PNGs) placed on the 3D parts.
const loader = new THREE.TextureLoader();
export function artPlane(parent, file, w, h, x, y, z, facingInside = false) {
  const tex = loader.load(`art-${file}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.45 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  if (facingInside) mesh.rotation.y = Math.PI; // face into the store instead of the street
  parent.add(mesh);
  return mesh;
}

