// =========================================================
// OBSIDIAN FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Obsidian is a dark-glass material inspired by the D20 dice reference:
// near-black body + coloured "attenuation" tint inside thicker regions
// + sharp clearcoat highlight + fresnel rim. Effects (iridescence,
// chromatic aberration, lighting overrides) layer in via EFFECTS_*
// slots, same convention as Mercury.
//
// Assembly order in main():
//
//   sample      → albedo / normal / bloom, mask
//   lighting    → NdotL, spec, half-vector (uses u_lightHeight)
//   refraction  → throughBg (bg sampled with normal-driven offset)
//   fresnel     → fresnel rim term
//   flow        → iriT, flow (for effects), baseline `specular` (white vec3)
//   halo        → haloMask, haloIntensity, default halo (accent-tinted)
//
//   EFFECTS_APPLY ← effects tint specular / overwrite halo / etc
//
//   composite   → ornament = body + specular + fresnel (after effects)
//   output      → bg + ornament + halo + vignette + grain
//
// Composite runs AFTER effects so iridescence's tint to `specular`
// is visible in the final ornament. Halo runs BEFORE effects so the
// iridescence effect can overwrite it with palette colour.
//
import { noiseHelpers }   from './features/noise.glsl.js';
import { fitUVHelper }    from './features/fit-uv.glsl.js';
import { sampleBlock }    from './features/sample.glsl.js';
import { lightingBlock }  from './features/lighting.glsl.js';
import { refractionBlock } from './features/refraction.glsl.js';
import { fresnelBlock }   from './features/fresnel.glsl.js';
import { flowBlock }      from './features/flow-fbm.glsl.js';
import { compositeBlock } from './features/composite.glsl.js';
import { haloBlock, outputBlock } from './features/output.glsl.js';
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
  uniform vec3 u_accentColor;
  uniform float u_accentStrength;
  uniform float u_refraction;
  uniform float u_fresnel;
  uniform float u_fresnelPower;

  // Lighting (preset by material; Lighting effect overrides)
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;
  uniform float u_lightHeight;
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
    ${effectHelpers}

    ${fitUVHelper}

    void main(){
      ${sampleBlock}
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
