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
import { defaults, PEARL_BASIS } from './defaults.js';

// Serializer for the HTML exporter. Given a controls snapshot, returns
// (a) a string of `const FOO = ...;` lines to inline at the top of the
// exported demo, and (b) a string of `key: { value: ... }` pairs to
// drop into the uniforms object literal.
function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const iri = snapshot?.iridescence ?? defaults.iridescence;
  const hue = iri.hue ?? 0;
  const off = (hue % 360) / 360;
  const phase = iri.phase ?? [
    PEARL_BASIS[0] + off,
    PEARL_BASIS[1] + off,
    PEARL_BASIS[2] + off,
  ];
  const iriIntensity = iri.enabled === false ? 0 : iri.intensity;

  const constants = `
const BASE_COLOR_HEX = ${JSON.stringify(mat.baseColor)};
const DIFFUSE        = ${mat.diffuse};
const SPECULAR       = ${mat.specular};
const SHININESS      = ${mat.shininess};
const IRI_PHASE      = ${JSON.stringify(phase)};
const IRI_INTENSITY  = ${iriIntensity};
`.trim();

  const uniforms = `
    u_baseColor:    { value: hexToVec3(BASE_COLOR_HEX) },
    u_diffuse:      { value: DIFFUSE },
    u_specular:     { value: SPECULAR },
    u_shininess:    { value: SHININESS },
    u_iriPhase:     { value: new THREE.Vector3(...IRI_PHASE) },
    u_iriIntensity: { value: IRI_INTENSITY },
`.trim();

  return { constants, uniforms };
}

export const mercuryShader = {
  id: 'mercury',
  name: 'Mercury',
  description: 'Warm silver base with cosine-palette iridescence on the highlight. Mercury blob follows the cursor.',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initMercuryControls,
  defaults,
  serializeForExport,
};
