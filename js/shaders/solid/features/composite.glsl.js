// =========================================================
// COMPOSITE — assemble the body
// =========================================================
// Layers (in order):
//   1. ambient (hemisphere) * baseColor * u_ambientStrength
//   2. diffuse (baseColor * NdotL * lightColor * u_diffuse)
//   3. throughBg * u_refractionMix  — bg leak; 0 = opaque (silver/ceramic-like)
//                                     1 = full glass-like transmission
//   4. sssTint    — inner glow (0 = off)
//   5. blob iridescence bump (0 when blob disabled, neutral white when
//                             iridescence disabled — multiplied into diffuse)
//   6. specular   — Fresnel-coloured highlight (possibly iridescence-tinted)
//   7. fresnel rim * lightColor  — clearcoat edge (0 = off)
//
// All optional terms have a "0 = off" path so this single shader can
// span from polished silver (Mercury preset) → porcelain (Ceramic
// preset) → dark glass (Obsidian preset) with the same code.
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    // Ambient — hemisphere term scaled by u_ambientStrength so lighting
    // sliders have visible effect.
    vec3 ambient = base * hemiAmbient(N, u_skyColor, u_groundColor) * u_ambientStrength;

    // Diffuse — base × NdotL × light color, on top of ambient.
    vec3 diffuse = ambient + base * u_diffuse * NdotL * u_lightColor;

    // Optional bg leak through the body — gives the "dark glass" feel
    // when high; at 0 the body is opaque.
    diffuse += throughBg * u_refractionMix;

    // Inner glow (subsurface).
    diffuse += sssTint;

    // Blob iridescence bump (Mercury's signature). iridescence(iriT)
    // returns vec3(1) when the iridescence effect is off, so this is
    // a no-op then. When the metaball is disabled, blob is 0.
    diffuse += iridescence(iriT) * blob * 0.4;

    // Final composite: diffuse body + specular highlight + fresnel rim
    // + emissive (procedural molten/lava glow; 0 when u_emissive = 0).
    vec3 ornament = diffuse + specular + fresnel * u_lightColor + emissiveTerm;
`;
