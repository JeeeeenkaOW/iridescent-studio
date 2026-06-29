// =========================================================
// EMISSIVE EFFECT — GLSL
// =========================================================
// Adds a procedural, animated emission term to `emissiveTerm` — a vec3
// accumulator each material declares (initialised to 0) before the
// EFFECTS_APPLY slot and adds into its `ornament` at composite time.
// Because both materials gate `ornament` by their silhouette mask in
// output, the emission lands only on the body (the full shape for Solid,
// the dots for Particles) with no extra masking here.
//
// Pattern: two octaves of RIDGED noise (1 - |2n-1|) concentrate the glow
// into thin bright veins rather than a flat wash; `sharpness` (the pow
// exponent) tightens them. A generic dark→color→white ramp keeps it
// reading "hot" for any chosen color. loopTime2D keeps the flow loop-safe
// for WebM export.
//
// Requires (provided by every host material before effect helpers):
//   - fbm(vec2), loopTime2D(float,float)  helpers
//   - vec2 texUV, vec3 emissiveTerm        in main() scope
//
export const uniforms = /* glsl */ `
  uniform float u_emissive;
  uniform vec3  u_emissiveColor;
  uniform float u_emissiveScale;
  uniform float u_emissiveSpeed;
  uniform float u_emissiveSharpness;
`;

export const helpers = /* glsl */ `
  vec3 wmfEmissive(vec2 uv){
    vec2 luv = uv * u_emissiveScale
             + loopTime2D(0.05 * u_emissiveSpeed, 0.035 * u_emissiveSpeed);
    float ridg  = 1.0 - abs(fbm(luv) * 2.0 - 1.0);
    float ridg2 = 1.0 - abs(fbm(luv * 2.4 + vec2(19.2, 7.4)) * 2.0 - 1.0);
    float veins = pow(clamp(ridg * 0.65 + ridg2 * 0.45, 0.0, 1.0), u_emissiveSharpness);
    vec3 lowCol = u_emissiveColor * 0.15;
    vec3 hot = mix(lowCol, u_emissiveColor, smoothstep(0.20, 0.70, veins));
    hot = mix(hot, mix(u_emissiveColor, vec3(1.0), 0.7), smoothstep(0.78, 1.0, veins));
    return hot * veins * u_emissive;
  }
`;

export const apply = /* glsl */ `
    if (u_emissive > 0.001) {
      emissiveTerm += wmfEmissive(texUV);
    }
`;
