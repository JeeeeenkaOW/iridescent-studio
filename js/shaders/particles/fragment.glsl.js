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
  // Custom-SVG shape support. Particles material rasterizes the user's
  // uploaded SVG to a texture; u_hasParticleSvg flags whether one is
  // loaded (>0.5 = yes), so the shader can cleanly fall back to circle
  // when shape=Custom but no SVG has been uploaded yet.
  uniform sampler2D u_particleSvg;
  uniform float u_hasParticleSvg;
  // Sprite-sheet shape support (shape 3). u_spriteGrid is (cols, rows).
  // u_spriteColorMode: 0 = silhouette, 1 = full color.
  // u_spriteAssign: 0 = random-stable per particle, 1 = animated
  // (cycle the whole sheet), 2 = animated rows (each particle picks a
  // random ROW — one animation type — and cycles its columns; the
  // standard rows-are-animations sheet convention).
  // u_spriteFPS: frame rate for animated mode (loop-safe — see
  // particles.glsl.js). u_hasSpriteSheet gates the circle fallback.
  uniform sampler2D u_spriteSheet;
  uniform float u_hasSpriteSheet;
  uniform vec2  u_spriteGrid;
  // Sheet pixel dimensions — used to derive cell aspect ratio so
  // non-square cells render contain-fit (undistorted) in the square
  // particle box instead of being squished to fill it.
  uniform vec2  u_spriteSheetSize;
  // Sprite size — the SINGLE size control for the sprite shape
  // (u_particleSize is ignored there; its slider is hidden in the
  // UI). 1.0 = one-cell box, clamped to a 2.0-cell half-extent; the
  // cell scan widens to 5x5 for large sprites to avoid clipping.
  uniform float u_spriteScale;
  uniform float u_spriteColorMode;
  uniform float u_spriteAssign;
  uniform float u_spriteFPS;
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

      // Emissive-effect accumulator. Effects add into it; composite adds
      // it to ornament. Stays vec3(0) when the Emissive effect is off.
      vec3 emissiveTerm = vec3(0.0);

      // ---- EFFECTS APPLY ----
      ${effectApply}
      // -----------------------

      ${compositeBlock}
      ${outputBlock}
    }
  `;
}

export const fragmentShader = buildFragmentShader();
