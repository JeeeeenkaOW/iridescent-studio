// =========================================================
// MERCURY FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Mercury: warm-silver Blinn-Phong with a mercury blob at the cursor.
// Realism pass adds Fresnel-coloured specular, hemisphere ambient,
// and ACES tonemap.
//
// Assembly order in main():
//
//   sample      → albedo / normal / bloom reads, mask
//   metaball    → mercury blob at cursor
//   lighting    → NdotL, NdotV, spec, half-vector
//   flow        → iriT, flow, Fresnel-coloured `specular` (vec3)
//   halo        → haloMask, haloIntensity, default halo (white)
//
//   EFFECTS_APPLY ← effects tint specular / overwrite halo / etc
//
//   composite   → ornament = ambient + diffuse + specular  (after effects)
//   output      → bg + ornament + halo + vignette + ACES tonemap + grain
//
import { noiseHelpers }   from './features/noise.glsl.js';
import { fitUVHelper }    from './features/fit-uv.glsl.js';
import { sampleBlock }    from './features/sample.glsl.js';
import { metaballBlock }  from './features/metaball.glsl.js';
import { lightingBlock }  from './features/lighting.glsl.js';
import { flowBlock }      from './features/flow-fbm.glsl.js';
import { compositeBlock } from './features/composite.glsl.js';
import { haloBlock, outputBlock } from './features/output.glsl.js';
import { sharedMaterialHelpers }   from '../_shared/helpers.glsl.js';
import { listEffects } from '../../effects/index.js';

const materialUniforms = /* glsl */ `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_imgAspect;
  uniform vec2 u_mouse;
  uniform vec2 u_mouseVel;
  uniform float u_time;
  uniform sampler2D u_albedo;
  uniform sampler2D u_normal;
  uniform sampler2D u_bloom;
  uniform sampler2D u_bgTex;

  // Material
  uniform vec3 u_baseColor;
  uniform vec3 u_f0;

  // Lighting (preset by material; Lighting effect overrides)
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;
  uniform float u_lightHeight;
  uniform vec3  u_lightColor;

  // Ambient (hemisphere)
  uniform vec3  u_skyColor;
  uniform vec3  u_groundColor;

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
      ${metaballBlock}
      ${lightingBlock}
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
