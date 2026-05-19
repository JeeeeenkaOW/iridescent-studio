// =========================================================
// GLASS FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Glass is refraction-based: bg sampled with normal-driven UV offset,
// optionally frosted, blended into the silhouette by transparency.
// Effects (iridescence etc) layer in via EFFECTS_* slots, same
// convention as Mercury and Obsidian.
//
// Assembly order in main():
//
//   sample      → albedo / normal / bloom reads, mask
//   lighting    → NdotL, spec (reads u_lightHeight, u_shininess)
//   refraction  → glassBg (refracted+frosted bg sample)
//   flow        → iriT, flow, baseline `specular` vec3
//   halo        → haloMask, haloIntensity, default halo (cool-blue)
//
//   EFFECTS_APPLY ← effects tint specular / overwrite halo / etc
//
//   composite   → ornament = through + specular   (after effects)
//   output      → bg + ornament + halo + vignette + grain
//
import { noiseHelpers }    from './features/noise.glsl.js';
import { fitUVHelper }     from './features/fit-uv.glsl.js';
import { sampleBlock }     from './features/sample.glsl.js';
import { lightingBlock }   from './features/lighting.glsl.js';
import { refractionBlock } from './features/refraction.glsl.js';
import { flowBlock }       from './features/flow-fbm.glsl.js';
import { haloBlock, compositeBlock, outputBlock } from './features/output.glsl.js';
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

  // Glass material
  uniform float u_transparency;
  uniform float u_refraction;
  uniform float u_frost;

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
