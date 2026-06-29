// =========================================================
// BUILT-IN PRESET LIBRARY — curated, ready-made looks
// =========================================================
// These are the shipped "Gallery" presets shown above the user's own
// saved presets in the Presets panel. Unlike the user-saved presets
// (which are captureState() snapshots persisted to localStorage), these
// are authored by hand here — but in the EXACT same snapshot shape, so
// they flow through the same applyState() path with zero special-casing.
//
// Each look is a FULL tool snapshot: material choice + every material
// uniform + which effects are on + their params + lighting + background.
// That is the whole point — a preset is a complete art-directed look,
// not a one-knob palette nudge (which is what the retired js/presets/
// gold.js / oil.js / arctic.js were, and why every old preset looked
// like the same blob with a hue shift).
//
// Authoring contract (mirrors the control snapshot() outputs — see
// js/main.js captureState() and each control's snapshot()):
//   - shaderId is always 'solid' (the unified material; Glass is folded
//     into Solid via refractionMix + refraction + frost, and the old
//     standalone Glass material is no longer registered).
//   - material is DOUBLE-nested: { material: { ...uniform fields } }.
//   - effects keys are the effect IDs, NOT folder names. The chromatic
//     aberration id is 'chromaticAberration' (camelCase).
//   - iridescence uses mode:'custom' with hand-picked stops so each look
//     gets a genuinely distinct palette, not a rotated Pearl rainbow.
//   - every preset declares ALL FOUR effects with an explicit enabled
//     flag, so switching from one preset to another deterministically
//     turns the right effects off as well as on.
//
// `swatch` is a CSS background used for the chip preview in the gallery.
// It is a quick approximation of the look; the real render is one click
// away. (A future pass can bake true rendered thumbnails.)
//

// --- palettes (custom iridescence stops, positions are cyclic 0..1) ---
const ABALONE = [
  { pos: 0.00, color: '#0BBF9E' },
  { pos: 0.24, color: '#1E5FFF' },
  { pos: 0.48, color: '#7A3DFF' },
  { pos: 0.70, color: '#FF3DA5' },
  { pos: 0.88, color: '#3DFF9E' },
];
const HOLO = [
  { pos: 0.00, color: '#FF2D6F' },
  { pos: 0.17, color: '#FF9E2D' },
  { pos: 0.34, color: '#FFE92D' },
  { pos: 0.50, color: '#2DFF7A' },
  { pos: 0.67, color: '#2DCBFF' },
  { pos: 0.84, color: '#9E2DFF' },
];
const SOAP = [
  { pos: 0.00, color: '#FFD1E8' },
  { pos: 0.17, color: '#FFF1B8' },
  { pos: 0.34, color: '#C8FFD1' },
  { pos: 0.50, color: '#B8F0FF' },
  { pos: 0.67, color: '#C9C2FF' },
  { pos: 0.84, color: '#F2C2FF' },
];

// --- assembly helper: keeps every preset honest to the snapshot shape ---
function build({ id, name, swatch, material, lighting, effects = {}, bg, normals, autoDrift = true }) {
  const refractionSlider = material.refractionSlider ?? 0;
  const iri = effects.iridescence;
  return {
    id,
    name,
    swatch,
    snapshot: {
      shaderId: 'solid',
      material: {
        material: {
          baseColor:        material.baseColor,
          f0Color:          material.f0Color,
          roughness:        material.roughness ?? 0,
          refraction:       (refractionSlider / 100) * 0.20,
          refractionSlider,
          refractionMix:    material.refractionMix ?? 0,
          frost:            material.frost ?? 0,
          sssColor:         material.sssColor ?? '#FFE3CC',
          sssStrength:      material.sssStrength ?? 0,
          fresnel:          material.fresnel ?? 0,
          fresnelPower:     4.0,
          blobEnabled:      material.blobEnabled ?? false,
          blobRadius:       material.blobRadius ?? 0.22,
        },
      },
      lighting: {
        enabled:   true,
        diffuse:   lighting.diffuse,
        specular:  lighting.specular,
        shininess: lighting.shininess,
        height:    lighting.height,
        color:     lighting.color ?? '#FFFFFF',
        ambient:   lighting.ambient ?? 1.0,
      },
      effects: {
        displacement: {
          enabled:  !!effects.displacement,
          strength: effects.displacementStrength ?? 0.4,
        },
        iridescence: iri
          ? { enabled: true, mode: 'custom', intensity: iri.intensity, hue: 0, stops: iri.stops }
          : { enabled: false, mode: 'pearl', intensity: 1.0, hue: 0, stops: [] },
        bloom: {
          enabled:     !!effects.bloom,
          strength:    effects.bloomStrength ?? 1.0,
          color:       effects.bloomColor ?? '#FFFFFF',
          userColored: true,
        },
        chromaticAberration: {
          enabled:  !!effects.ca,
          strength: effects.caStrength ?? 0.3,
        },
        emissive: effects.emissive
          ? { enabled: true, ...effects.emissive }
          : { enabled: false },
        scratches: effects.scratches
          ? { enabled: true, ...effects.scratches }
          : { enabled: false },
      },
      bg: {
        mode:        'color',
        colorMode:   bg.colorMode,
        transparent: false,
        solid:       bg.solid,
        gradient:    bg.gradient ?? { from: '#000000', to: '#202020', angle: 180 },
      },
      normals: { normals: normals?.normals ?? 'edge', strength: normals?.strength ?? 4.0 },
      motion:  { autoDrift, previewLoop: false },
      freeze:  { freeze: false, freezePos: { x: 0.5, y: 0.5 }, freezeTime: 0 },
    },
  };
}

export const BUILTIN_PRESETS = [
  build({
    id: 'liquid-mercury',
    name: 'Liquid Mercury',
    swatch: 'linear-gradient(120deg,#f4eee0,#c7bdb3 50%,#6e675c)',
    material: {
      baseColor: '#C7BDB3', f0Color: '#F2EAD9', roughness: 0.0,
      fresnel: 0.15, blobEnabled: true, blobRadius: 0.30,
    },
    lighting: { diffuse: 0.50, specular: 2.2, shininess: 64, height: 0.12, ambient: 1.0 },
    effects: { bloom: true, bloomStrength: 0.6, bloomColor: '#FFF3DE' },
    bg: { colorMode: 'solid', solid: '#08080A' },
  }),

  build({
    id: 'black-obsidian',
    name: 'Black Obsidian',
    swatch: 'linear-gradient(120deg,#2a3447,#06080c 55%,#111925)',
    // Dragonglass: near-black volcanic GLASS. Glossy (low roughness),
    // sharp cool glints (high specular + shininess), a glassy fresnel rim,
    // and a touch of transparency so the cool background leaks through the
    // edges like real obsidian. No iridescence — this is black glass, not
    // opal fire.
    material: {
      baseColor: '#08090C', f0Color: '#222A36', roughness: 0.04,
      refractionMix: 0.25, refractionSlider: 25, fresnel: 0.55, blobEnabled: false,
    },
    lighting: { diffuse: 0.12, specular: 2.8, shininess: 130, height: 0.10, color: '#D6E2FF', ambient: 0.55 },
    effects: {
      bloom: true, bloomStrength: 0.45, bloomColor: '#7C9CC8',
    },
    bg: { colorMode: 'gradient', solid: '#04060A', gradient: { from: '#04060A', to: '#0C121C', angle: 160 } },
  }),

  build({
    id: 'molten-gold',
    name: 'Molten Gold',
    swatch: 'linear-gradient(120deg,#ffd24a,#b8860b 55%,#3a2705)',
    material: {
      baseColor: '#6E4E16', f0Color: '#FFD24A', roughness: 0.12,
      sssColor: '#FFB347', sssStrength: 0.25, fresnel: 0.10,
      blobEnabled: true, blobRadius: 0.30,
    },
    lighting: { diffuse: 0.55, specular: 2.4, shininess: 48, height: 0.13, color: '#FFE9B0', ambient: 0.95 },
    effects: { bloom: true, bloomStrength: 0.8, bloomColor: '#FFCC66' },
    bg: { colorMode: 'gradient', solid: '#0E0A05', gradient: { from: '#0E0A05', to: '#241803', angle: 160 } },
  }),

  build({
    id: 'abalone-shell',
    name: 'Abalone Shell',
    swatch: 'linear-gradient(120deg,#0bbf9e,#1e5fff 40%,#7a3dff 70%,#ff3da5)',
    material: {
      baseColor: '#15292E', f0Color: '#3A4E4E', roughness: 0.32,
      sssColor: '#1E5A4A', sssStrength: 0.22, fresnel: 0.50, blobEnabled: false,
    },
    lighting: { diffuse: 0.42, specular: 2.2, shininess: 70, height: 0.12, ambient: 1.15 },
    effects: {
      iridescence: { intensity: 2.2, stops: ABALONE },
      bloom: true, bloomStrength: 1.1, bloomColor: '#FFFFFF',
      displacement: true, displacementStrength: 0.20,
    },
    bg: { colorMode: 'gradient', solid: '#04080A', gradient: { from: '#04080A', to: '#0C1A18', angle: 160 } },
  }),

  build({
    id: 'holographic-foil',
    name: 'Holo-foil',
    swatch: 'linear-gradient(120deg,#ff2d6f,#ffe92d 30%,#2dff7a 55%,#2dcbff 75%,#9e2dff)',
    // Auto-drift OFF: the body hue is anchored to the cursor (NdotL), so
    // with drift on, the idle cursor sweep cycles the whole object's hue.
    // Off = the look holds still until you hover, which is what reads as
    // "real foil" — the rainbow only moves where you point.
    autoDrift: false,
    material: {
      baseColor: '#C0C0C8', f0Color: '#FFFFFF', roughness: 0.05,
      fresnel: 0.20, blobEnabled: true, blobRadius: 0.25,
    },
    lighting: { diffuse: 0.40, specular: 2.8, shininess: 56, height: 0.12, ambient: 1.0 },
    effects: {
      iridescence: { intensity: 2.9, stops: HOLO },
      bloom: true, bloomStrength: 1.25, bloomColor: '#FFFFFF',
      ca: true, caStrength: 0.50,
    },
    bg: { colorMode: 'solid', solid: '#060608' },
  }),

  build({
    id: 'soap-bubble',
    name: 'Soap Bubble',
    swatch: 'linear-gradient(120deg,#ffd1e8,#b8f0ff 40%,#c9c2ff 70%,#f2c2ff)',
    material: {
      baseColor: '#E6EEFF', f0Color: '#0B0E12', roughness: 0.0,
      refractionMix: 0.85, refractionSlider: 30, frost: 0.0, fresnel: 0.60,
      blobEnabled: false,
    },
    lighting: { diffuse: 0.0, specular: 1.5, shininess: 80, height: 0.16, ambient: 1.1 },
    effects: {
      iridescence: { intensity: 1.8, stops: SOAP },
      bloom: true, bloomStrength: 0.7, bloomColor: '#FFFFFF',
      ca: true, caStrength: 0.30,
    },
    bg: { colorMode: 'gradient', solid: '#0A0A12', gradient: { from: '#0A0A12', to: '#1A1530', angle: 160 } },
  }),

  build({
    id: 'molten-lava',
    name: 'Molten Lava',
    swatch: 'linear-gradient(120deg,#1a120e,#ff5a1e 45%,#ffd23a 70%,#1a0e06)',
    // Dark rocky crust (very dark base, high roughness for a craggy
    // surface, low spec so it isn't shiny) + the new procedural emissive
    // term glowing through as molten veins. Bloom blooms the hot color.
    material: {
      baseColor: '#1A120E', f0Color: '#2A2018', roughness: 0.70,
      sssColor: '#FF6A22', sssStrength: 0.12, fresnel: 0.08, blobEnabled: false,
    },
    lighting: { diffuse: 0.30, specular: 0.6, shininess: 22, height: 0.16, color: '#FFD9B0', ambient: 0.5 },
    effects: {
      bloom: true, bloomStrength: 1.3, bloomColor: '#FF6A1E',
      displacement: true, displacementStrength: 0.10,
      emissive: { strength: 1.3, color: '#FF5A1E', scale: 3.5, speed: 1.0, sharpness: 3.2 },
    },
    bg: { colorMode: 'gradient', solid: '#0A0604', gradient: { from: '#0A0604', to: '#1A0E06', angle: 160 } },
  }),

  build({
    id: 'distressed-metal',
    name: 'Distressed Metal',
    swatch: 'linear-gradient(120deg,#cfd4da,#7c828b 50%,#a6acb4)',
    // Shooter / gunmetal aesthetic: bright brushed steel (not dark) with a
    // light surface roughness for grain, driven distressed by the
    // Scratches effect (directional scratch streaks + uneven gloss). Broad
    // metallic highlight, faint worn edge.
    material: {
      baseColor: '#8E9298', f0Color: '#C6CCD4', roughness: 0.30,
      fresnel: 0.18, blobEnabled: false,
    },
    lighting: { diffuse: 0.50, specular: 2.0, shininess: 40, height: 0.14, color: '#EEF1F6', ambient: 1.0 },
    effects: {
      bloom: true, bloomStrength: 0.30, bloomColor: '#AEB6C2',
      scratches: { strength: 0.8, density: 80, angle: 35, coverage: 0.5 },
    },
    bg: { colorMode: 'gradient', solid: '#0E1013', gradient: { from: '#0E1013', to: '#1C1F24', angle: 160 } },
  }),
];
