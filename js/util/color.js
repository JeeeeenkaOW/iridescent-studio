// =========================================================
// COLOR UTIL — hex ↔ THREE.Vector3
// =========================================================
import * as THREE from 'three';

export function hexToVec3(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return new THREE.Vector3(1, 1, 1);
  const n = parseInt(m[1], 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >>  8) & 255) / 255,
    ( n        & 255) / 255,
  );
}

export function hexToRgb01(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [
    ((n >> 16) & 255) / 255,
    ((n >>  8) & 255) / 255,
    ( n        & 255) / 255,
  ];
}
