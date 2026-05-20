// =========================================================
// COMPOSITE — assemble the obsidian body
// =========================================================
// Plain dark glass with realism additions:
//   - Hemisphere ambient breaks up the otherwise flat body.
//   - Diffuse term picks up light color.
//   - Internal refraction stays at 0.15× (a hint of light through
//     dense glass).
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    // Hemisphere ambient — even on near-black this adds direction
    // so the silhouette doesn't read as a flat cutout.
    vec3 ambient = base * hemiAmbient(N, u_skyColor, u_groundColor) * 0.6;

    // Diffuse: base × NdotL × light color, on top of ambient.
    vec3 diffuse = ambient + base * u_diffuse * NdotL * u_lightColor;

    // Refracted bg, heavily attenuated — light leaking through.
    vec3 internal = throughBg * 0.15;

    vec3 body = diffuse + internal;

    // Add specular and fresnel rim. Fresnel rim is tinted by light
    // color too — a coloured light catching the edge.
    vec3 ornament = body + specular + fresnel * u_lightColor;

    // Iridescence tint (vec3(1.0) when effect is off — no-op multiply).
    ornament *= iriTint;
`;
