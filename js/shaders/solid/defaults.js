// =========================================================
// SOLID MATERIAL DEFAULTS — silver baseline
// =========================================================
// Initial values produce the old "Mercury" look: warm silver metallic
// body, cursor blob ON, no roughness, no refraction, no subsurface,
// no rim. All knobs are exposed in the sidebar so a user can dial
// toward the old Obsidian or Ceramic looks by hand.
//
// `u_ambientStrength` defaults to 1.0 (full hemisphere ambient). The
// Lighting section can override it via its sliders.
//
import { AMBIENT_SKY, AMBIENT_GROUND } from '../_shared/ambient.js';

export const defaults = {
  name: 'Solid',

  material: {
    baseColor:    '#C7BDB3',   // warm silver
    f0Color:      '#E8DDC8',   // slightly warm silver F0 (metallic high)

    roughness:    0.0,         // 0 = smooth (Mercury-like)
    refraction:   0.0,         // bg UV offset — now an independent knob
    refractionMix:0.0,         // 0 = opaque body (Transparency slider)
    frost:        0.0,         // 0 = clear; high = frosted glass (N scatter + bg blur)
    sssColor:     '#FFE3CC',   // warm tint — only visible when sssStrength > 0
    sssStrength:  0.0,         // 0 = no inner glow
    fresnel:      0.0,         // 0 = no rim
    fresnelPower: 4.0,
    blobEnabled:  true,        // cursor blob ON by default
    blobRadius:   0.22,        // outer radius of the cursor blob; inner
                               // edge scales proportionally so the
                               // soft-edge looks consistent at any size
  },

  // Mercury preset lighting (broad warm-silver highlight).
  lighting: {
    diffuse:        0.45,
    specular:       1.6,
    shininess:      28.0,
    height:         0.16,
    color:          '#FFFFFF',
    ambientStrength:1.0,
  },

  ambient: {
    sky:    AMBIENT_SKY,
    ground: AMBIENT_GROUND,
  },
};
