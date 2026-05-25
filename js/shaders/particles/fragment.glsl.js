// =========================================================
// PARTICLES FRAGMENT SHADER — assembled from feature snippets + effects
// =========================================================
// Renders the source SVG as a field of discrete dots. Each grid cell
// becomes a particle; the cell's particle inherits the albedo/normal
// at its centre, animates via the chosen mode (DUST/SMOKE/STARS/
// FRAGMENTS), and is lit + post-processed by the same Effects chain
// as Solid/Glass.
//
// Pipeline:
//   1. sample      — fit + inside mask only (no per-fragment albedo)
//   2. particles   — find dominant particle for this fragment
//   3. lighting    — Blinn-Phong at the particle centre
//   4. flow        — specular + iridescence inputs
//   5. halo        — bloom-driven halo seed
//   6. EFFECTS     — Iridescence / Displacement / Bloom / CA all
//                    operate on the particle mask
//   7. composite   — ornament = diffuse + specular
//   8. output      — gate dots into bg + tonemap + grain
//
import { noiseHelpers }     from '../solid/features/noise.glsl.js';
import { fitUVHelper }      from '../solid/features/fit-uv.glsl.js';
import { sampleBlock }      from './features/sample.glsl.js';
import { particlesBlock }   from './features/particles.glsl.js';
import { lightingBlock }    from './features/lighting.glsl.js';
import { flowBlock }        from './features/flow-fbm.glsl.js';
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
  uniform vec3  u_baseColor;
  uniform float u_particleDensity;
  uniform float u_particleSize;
  uniform float u_particleJitter;
  uniform float u_particleSoftness;
  uniform float u_particleShape;
  // Four independent motion modes — can be combined.
  uniform float u_motionDrift;
  uniform float u_motionRise;
  uniform float u_motionTwinkle;
  uniform float u_motionScatter;
  uniform float u_particleHueShift;

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
      ${particlesBlock}
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
