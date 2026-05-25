// =========================================================
// GLASS FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Refraction-based glass: bg read with normal-driven UV offset,
// optionally frosted. Realism pass adds Schlick Fresnel grazing-angle
// reflection, hemisphere ambient, ACES tonemap.
//
import { noiseHelpers }    from './features/noise.glsl.js';
import { fitUVHelper }     from './features/fit-uv.glsl.js';
import { sampleBlock }     from './features/sample.glsl.js';
import { lightingBlock }   from './features/lighting.glsl.js';
import { refractionBlock } from './features/refraction.glsl.js';
import { flowBlock }       from './features/flow-fbm.glsl.js';
import { haloBlock, compositeBlock, outputBlock } from './features/output.glsl.js';
import { sharedMaterialHelpers } from '../_shared/helpers.glsl.js';
import { listEffects } from '../../effects/index.js';

const materialUniforms = /* glsl */ `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_imgAspect;
  uniform vec2 u_mouse;
  uniform vec2 u_mouseVel;
  uniform float u_time;
  uniform float u_loopMode;
  uniform float u_loopDuration;
  uniform sampler2D u_albedo;
  uniform sampler2D u_normal;
  uniform sampler2D u_bloom;
  uniform sampler2D u_bgTex;
  uniform float u_bgTransparent;

  // Material
  uniform float u_transparency;
  uniform float u_refraction;
  uniform float u_frost;
  uniform vec3  u_f0;

  // Lighting (preset; the top-level Lighting controls override these)
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;
  uniform float u_lightHeight;
  uniform vec3  u_lightColor;

  // Ambient (hemisphere)
  uniform vec3  u_skyColor;
  uniform vec3  u_groundColor;
  uniform float u_ambientStrength;

  // Halo baseline (material-tuned; Bloom effect reads these)
  uniform vec3  u_haloBaseColor;
  uniform float u_haloBaseIntensity;
`;

function buildFragmentShader() {
  const effects = listEffects();
  const effectUniforms = effects.map(e => e.uniformsGlsl || '').join('\n');
  const effectHelpers  = effects.map(e => e.helpersGlsl  || '').join('\n');
  const effectApply    = effects.map(e => e.applyGlsl    || '').join('\n');

  return `
    ${materialUniforms}
    ${effectUniforms}

    ${noiseHelpers}
    ${sharedMaterialHelpers}
    ${effectHelpers}

    ${fitUVHelper}

    void main(){
      ${sampleBlock}
      ${lightingBlock}
      ${refractionBlock}
      ${flowBlock}
      ${haloBlock}

      // ---- EFFECTS APPLY ----
      ${effectApply}
      // -----------------------

      ${compositeBlock}
      ${outputBlock}
    }
  `;
}

export const fragmentShader = buildFragmentShader();
