// =========================================================
// OUTPUT — final compositing per background mode
// =========================================================
// Two completely different output styles. Picked by u_lightMode (0 or 1).
//
// DARK (void):
//   - Ornament masked over black
//   - Iridescent halo around the ornament edges (bloom-driven)
//   - Soft radial vignette
//   - 1.8% grain
//
// LIGHT (parchment):
//   - Ornament composited onto the parchment bg color
//   - Drop shadow (bloom * (1-mask) * 0.32)
//   - Iridescent halo at lower intensity (0.10 vs 0.32)
//   - Softer vignette (0.65→1.25 vs 0.35→1.15)
//   - 1.2% grain
//
// Tuneables (hardcoded — many material preset targets):
//   - dark halo intensity:      0.32
//   - light halo intensity:     0.10
//   - dark halo mask falloff:   0.7
//   - light halo mask falloff:  0.85
//   - halo tint offset:         0.25
//   - light drop shadow weight: 0.32
//   - dark vignette range:      0.35 → 1.15
//   - light vignette range:     0.65 → 1.25
//   - light brightness floor:   0.94
//   - dark grain:               0.018
//   - light grain:              0.012
//
export const outputBlock = /* glsl */ `
    if(u_lightMode < 0.5){
      vec3 col = ornament * mask;
      float haloMask = bloom * (1.0 - mask * 0.7);
      vec3 halo = iridescence(u_time * 0.06 + flow * 0.4 + 0.25) * haloMask * 0.32;
      col += halo;
      float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
      col *= vig;
      col *= inside;
      col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
      gl_FragColor = vec4(col, 1.0);
    } else {
      float dropShadow = bloom * (1.0 - mask) * 0.32;
      vec3 shadowedBg = u_bgColor * (1.0 - dropShadow);
      vec3 haloTint = iridescence(u_time * 0.06 + flow * 0.4 + 0.25);
      float haloMask = bloom * (1.0 - mask * 0.85);
      vec3 halo = haloTint * haloMask * 0.10;
      vec3 col_inside = mix(shadowedBg, ornament, mask) + halo;
      vec3 col = mix(u_bgColor, col_inside, inside);
      float vig = 1.0 - smoothstep(0.65, 1.25, length(v_uv - 0.5));
      col *= mix(0.94, 1.0, vig);
      col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }
`;
