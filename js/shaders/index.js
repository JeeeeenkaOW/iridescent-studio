// =========================================================
// SHADER REGISTRY — single source of truth for available shaders
// =========================================================
// Each shader is a distinct fragment shader with its own uniforms and
// controls. To add a new shader: create a folder under /shaders/,
// build the manifest (see mercury/index.js or glass/index.js),
// and import + add here.
//
import { mercuryShader } from './mercury/index.js';
import { glassShader }   from './glass/index.js';

export const SHADERS = {
  mercury: mercuryShader,
  glass:   glassShader,
};

export const DEFAULT_SHADER = 'mercury';

export function getShader(id) {
  return SHADERS[id] || SHADERS[DEFAULT_SHADER];
}

export function listShaders() {
  return Object.values(SHADERS);
}
