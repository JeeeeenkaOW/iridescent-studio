// =========================================================
// SOLID FRAGMENT SHADER — unified material
// =========================================================
// Supersedes the old Mercury / Obsidian / Ceramic shaders. All three
// looks are reachable via the slider set:
//
//   - Mercury (silver):   high F0 (warm silver), roughness=0, refraction=0,
//                         subsurface=0, low fresnel, blob ON.
//   - Obsidian (dark):    dark base, low F0 (cool), roughness high,
//                         refractionMix moderate, fresnel rim ON, blob OFF.
//   - Ceramic (porcelain): warm-white base, low F0 (cool), roughness=0,
//                         refraction=0, subsurface tint+strength up, blob OFF.
//
// Assembly order in main():
//   sample      → albedo / normal / bloom / mask
//   roughness   → perturbs N (skipped at strength 0)
//   metaball    → blob = cursor mask (forced 0 if disabled)
//   lighting    → NdotL, NdotV, spec (reads possibly-perturbed N)
//   refraction  → throughBg
//   fresnel     → rim term (skipped via u_fresnel=0)
//   subsurface  → sssTint (vec3) — bloom * sssColor * strength
//   flow        → iriT, Fresnel-coloured `specular`
//   halo        → haloMask, halo=0
//
//   EFFECTS_APPLY ← effects tint specular / overwrite halo
//
//   composite   → diffuse + throughBg leak + subsurface + specular + rim
//   output      → bg + ornament + halo + vignette + ACES + grain
//
import { noiseHelpers }    from './features/noise.glsl.js';
import { fitUVHelper }     from './features/fit-uv.glsl.js';
import { sampleBlock }     from './features/sample.glsl.js';
import { roughnessBlock }  from './features/roughness.glsl.js';
import { metaballBlock }   from './features/metaball.glsl.js';
import { lightingBlock }   from './features/lighting.glsl.js';
import { refractionBlock } from './features/refraction.glsl.js';
import { fresnelBlock }    from './features/fresnel.glsl.js';
import { subsurfaceBlock } from './features/subsurface.glsl.js';
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
  uniform float u_loopMode;       // 0 = linear time, 1 = periodic (for export looping)
  uniform float u_loopDuration;   // seconds per loop cycle when u_loopMode = 1
  uniform sampler2D u_albedo;
  uniform sampler2D u_normal;
  uniform sampler2D u_bloom;
  uniform sampler2D u_bgTex;
  uniform float u_bgTransparent;

  // Material — base + reflection
  uniform vec3  u_baseColor;
  uniform vec3  u_f0;

  // Material — optional features (all 0 = disabled)
  uniform float u_roughness;
  uniform float u_refraction;       // bg UV-offset magnitude
  uniform float u_refractionMix;    // bg → body blend (0 opaque, 1 full glass)
  uniform vec3  u_sssColor;
  uniform float u_sssStrength;
  uniform float u_fresnel;
  uniform float u_fresnelPower;
  uniform float u_blobEnabled;      // 0 or 1
  uniform float u_blobRadius;       // outer radius of cursor blob

  // Lighting (preset; the top-level Lighting controls override these)
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;
  uniform float u_lightHeight;
  uniform vec3  u_lightColor;

  // Ambient (hemisphere)
  uniform vec3  u_skyColor;
  uniform vec3  u_groundColor;
  uniform float u_ambientStrength;  // scales the hemisphere ambient

  // Halo baseline (Bloom effect reads these)
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
      ${metaballBlock}
      ${lightingBlock}
      ${refractionBlock}
      ${fresnelBlock}
      ${subsurfaceBlock}
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
