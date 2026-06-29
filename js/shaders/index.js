// =========================================================
// MATERIAL REGISTRY — single source of truth for available materials
// =========================================================
// Two material families (the picker renders one segmented button each):
//
//   Solid     — unified solid material. Reaches the old Mercury,
//               Obsidian, Ceramic AND Glass looks via its slider set
//               (Transparency + Refraction + Frost fold the old Glass
//               shader in — see js/shaders/solid/).
//   Particles — the source ornament rendered as discrete dots / sprites.
//
// The old standalone Glass family was retired: every glass configuration
// is reproducible from Solid, so it's no longer a separate pick. The
// glass/ module is kept on disk for reference but is not registered.
//
// Effects (Iridescence, Bloom, Chromatic ab., Displacement) apply on top
// of any material — see /js/effects/.
//
import { solidShader }     from './solid/index.js';
import { particlesShader } from './particles/index.js';

export const SHADERS = {
  solid:     solidShader,
  particles: particlesShader,
};

export const DEFAULT_SHADER = 'solid';

export function getShader(id) {
  return SHADERS[id] || SHADERS[DEFAULT_SHADER];
}

export function listShaders() {
  return Object.values(SHADERS);
}
