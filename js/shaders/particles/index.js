// =========================================================
// PARTICLES MATERIAL — manifest
// =========================================================
// Renders the source SVG as a field of discrete dots. Four
// independent motion modes (Drift / Rise / Twinkle / Scatter) can
// be combined. Four shapes (Circle / Square / Custom SVG / Sprites).
// Same lighting + effects integration as Solid/Glass.
//
import { vertexShader }       from './vertex.glsl.js';
import { fragmentShader }     from './fragment.glsl.js';
import { createUniforms }     from './uniforms.js';
import { initParticlesControls } from './controls.js';
import { defaults }           from './defaults.js';

function serializeForExport(snapshot) {
  const mat = snapshot?.material ?? defaults.material;
  const lit = defaults.lighting;
  const amb = defaults.ambient;

  // Custom-shape export: when shape=Custom AND the user has uploaded
  // an SVG, we bake the rasterized canvas as a PNG data URL. The
  // exported HTML loads it as u_particleSvg and flips u_hasParticleSvg
  // to 1.0. If no SVG was uploaded (or shape != Custom), we emit a
  // tiny transparent placeholder and leave the flag at 0 so the
  // fallback (circle) renders in the export.
  const hasCustomSvg =
    mat.shape === 2 &&
    typeof mat.customSvgDataURL === 'string' &&
    mat.customSvgDataURL.length > 0;
  const particleSvgURL = hasCustomSvg
    ? mat.customSvgDataURL
    // 1×1 transparent PNG — a tiny valid placeholder so the sampler
    // is always bindable.
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
  const hasParticleSvg = hasCustomSvg ? 1.0 : 0.0;

  // Sprite-sheet export: same pattern. When shape=Sprites AND a sheet
  // is loaded, bake the cached PNG dataURL. Raster sheets upload with
  // NEAREST filtering (imgTexN) so pixel art stays sharp; SVG-sourced
  // sheets (spriteSheetSmooth) upload LINEAR (imgTex) to match the
  // studio's anti-aliased vector rendering.
  const hasSheet =
    mat.shape === 3 &&
    typeof mat.spriteSheetDataURL === 'string' &&
    mat.spriteSheetDataURL.length > 0;
  const spriteSheetURL = hasSheet
    ? mat.spriteSheetDataURL
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
  const hasSpriteSheet = hasSheet ? 1.0 : 0.0;

  const constants = `
const BASE_COLOR_HEX     = ${JSON.stringify(mat.baseColor ?? defaults.material.baseColor)};
const PARTICLE_DENSITY   = ${mat.density   ?? defaults.material.density};
const PARTICLE_SIZE      = ${mat.size      ?? defaults.material.size};
const PARTICLE_JITTER    = ${mat.jitter    ?? defaults.material.jitter};
const PARTICLE_SOFTNESS  = ${mat.softness  ?? defaults.material.softness};
const PARTICLE_SHAPE     = ${mat.shape     ?? defaults.material.shape};
const PARTICLE_SVG_URL   = ${JSON.stringify(particleSvgURL)};
const HAS_PARTICLE_SVG   = ${hasParticleSvg};
const SPRITE_SHEET_URL   = ${JSON.stringify(spriteSheetURL)};
const HAS_SPRITE_SHEET   = ${hasSpriteSheet};
const SPRITE_COLS        = ${mat.spriteCols      ?? defaults.material.spriteCols};
const SPRITE_ROWS        = ${mat.spriteRows      ?? defaults.material.spriteRows};
const SPRITE_COLOR_MODE  = ${mat.spriteColorMode ?? defaults.material.spriteColorMode};
const SPRITE_ASSIGN      = ${mat.spriteAssign    ?? defaults.material.spriteAssign};
const SPRITE_FPS         = ${mat.spriteFPS       ?? defaults.material.spriteFPS};
const SPRITE_SCALE       = ${mat.spriteScale     ?? defaults.material.spriteScale};
const SPRITE_SMOOTH      = ${mat.spriteSheetSmooth ? 1 : 0};
const SPRITE_SHEET_W     = ${mat.spriteSheetW ?? 1};
const SPRITE_SHEET_H     = ${mat.spriteSheetH ?? 1};
const MOTION_DRIFT       = ${mat.motionDrift   ?? defaults.material.motionDrift};
const MOTION_RISE        = ${mat.motionRise    ?? defaults.material.motionRise};
const MOTION_TWINKLE     = ${mat.motionTwinkle ?? defaults.material.motionTwinkle};
const MOTION_SCATTER     = ${mat.motionScatter ?? defaults.material.motionScatter};

const DIFFUSE_PRESET     = ${lit.diffuse};
const SPECULAR_PRESET    = ${lit.specular};
const SHININESS_PRESET   = ${lit.shininess};
const HEIGHT_PRESET      = ${lit.height};
const LIGHT_COLOR_HEX    = ${JSON.stringify(lit.color)};
const AMBIENT_STRENGTH   = ${lit.ambientStrength};
const SKY_HEX            = ${JSON.stringify(amb.sky)};
const GROUND_HEX         = ${JSON.stringify(amb.ground)};
const HALO_BASE_HEX      = "#ffffff";
const HALO_BASE_INT      = 0.32;
`.trim();

  const uniformEntries = `
    u_baseColor:         { value: hexToVec3(BASE_COLOR_HEX) },
    u_particleDensity:   { value: PARTICLE_DENSITY },
    u_particleSize:      { value: PARTICLE_SIZE },
    u_particleJitter:    { value: PARTICLE_JITTER },
    u_particleSoftness:  { value: PARTICLE_SOFTNESS },
    u_particleShape:    { value: PARTICLE_SHAPE },
    u_particleSvg:       { value: imgTex(PARTICLE_SVG_URL) },
    u_hasParticleSvg:    { value: HAS_PARTICLE_SVG },
    u_spriteSheet:       { value: (SPRITE_SMOOTH ? imgTex : imgTexN)(SPRITE_SHEET_URL) },
    u_hasSpriteSheet:    { value: HAS_SPRITE_SHEET },
    u_spriteGrid:        { value: THREE.Vector2(SPRITE_COLS, SPRITE_ROWS) },
    u_spriteSheetSize:   { value: THREE.Vector2(SPRITE_SHEET_W, SPRITE_SHEET_H) },
    u_spriteColorMode:   { value: SPRITE_COLOR_MODE },
    u_spriteAssign:      { value: SPRITE_ASSIGN },
    u_spriteFPS:         { value: SPRITE_FPS },
    u_spriteScale:       { value: SPRITE_SCALE },
    u_motionDrift:       { value: MOTION_DRIFT },
    u_motionRise:        { value: MOTION_RISE },
    u_motionTwinkle:     { value: MOTION_TWINKLE },
    u_motionScatter:     { value: MOTION_SCATTER },
    u_diffuse:           { value: DIFFUSE_PRESET },
    u_specular:          { value: SPECULAR_PRESET },
    u_shininess:         { value: SHININESS_PRESET },
    u_lightHeight:       { value: HEIGHT_PRESET },
    u_lightColor:        { value: hexToVec3(LIGHT_COLOR_HEX) },
    u_ambientStrength:   { value: AMBIENT_STRENGTH },
    u_skyColor:          { value: hexToVec3(SKY_HEX) },
    u_groundColor:       { value: hexToVec3(GROUND_HEX) },
    u_haloBaseColor:     { value: hexToVec3(HALO_BASE_HEX) },
    u_haloBaseIntensity: { value: HALO_BASE_INT },
`.trim();

  return { constants, uniformEntries };
}

export const particlesShader = {
  id: 'particles',
  name: 'Particles',
  vertexShader,
  fragmentShader,
  createUniforms,
  initControls: initParticlesControls,
  defaults,
  serializeForExport,
};
