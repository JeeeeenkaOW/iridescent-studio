// =========================================================
// MERCURY SHADER — manifest
// =========================================================
// A "shader preset" is a self-contained bundle: its own GLSL, its own
// uniforms, its own sidebar controls, its own defaults. The top-level
// shader picker (controls/shader.js) swaps between manifests like this.
//
// To add a new shader preset, copy this folder, rename the import paths,
// and register it in /js/shaders/index.js.
//
import { vertexShader }   from './vertex.glsl.js';
import { fragmentShader } from './fragment.glsl.js';
import { createUniforms } from './uniforms.js';
import { initMercuryControls } from './controls.js';
import { defaults } from './defaults.js';

export const mercuryShader = {
  id: 'mercury',
  name: 'Mercury',
  description: 'Warm silver base with cosine-palette iridescence on the highlight. Mercury blob follows the cursor.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initMercuryControls,
  defaults,
};
