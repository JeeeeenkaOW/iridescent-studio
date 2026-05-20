// =========================================================
// OBSIDIAN FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Plain dark glass with realism passes: procedural rough surface,
// Schlick Fresnel-coloured specular, hemisphere ambient, ACES tonemap.
//
// Assembly order in main():
//
//   sample      → albedo / normal / bloom, mask, baseline N
//   roughness   → perturbs N (3-octave noise breaking up reflections)
//   lighting    → NdotL, NdotV, spec (reads perturbed N)
//   refraction  → throughBg
//   fresnel     → user-facing rim term `fresnel` (separate from Schlick)
//   flow        → iriT, flow, Fresnel-coloured `specular` vec3
//   halo        → haloMask, haloIntensity, default halo
//
//   EFFECTS_APPLY ← effects tint specular / overwrite halo / etc
//
//   composite   → ornament = ambient + diffuse + specular + rim
//   output      → bg + ornament + halo + vignette + ACES + grain
//
import { noiseHelpers }    from './features/noise.glsl.js';
import { fitUVHelper }     from './features/fit-uv.glsl.js';
import { sampleBlock }     from './features/sample.glsl.js';
import { roughnessBlock }  from './features/roughness.glsl.js';
import { lightingBlock }   from './features/lighting.glsl.js';
import { refractionBlock } from './features/refraction.glsl.js';
import { fresnelBlock }    from './features/fresnel.glsl.js';
import { flowBlock }       from './features/flow-fbm.glsl.js';
import { compositeBlock }  from './features/composite.glsl.js';
import { haloBlock, outputBlock } from './features/output.glsl.js';
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
  uniform sampler2D u_albedo;
  uniform sampler2D u_normal;
  uniform sampler2D u_bloom;
  uniform sampler2D u_bgTex;

  // Material
  uniform vec3 u_baseColor;
  uniform float u_refraction;
  uniform float u_fresnel;
  uniform float u_fresnelPower;
  uniform float u_roughness;
  uniform vec3  u_f0;

  // Lighting (preset; Lighting effect overrides)
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
      ${roughnessBlock}
      ${lightingBlock}
      ${refractionBlock}
      ${fresnelBlock}
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
