// =========================================================
// SCRATCHES EFFECT — GLSL
// =========================================================
// Modulates the post-lighting `specular` term: breaks up uniform gloss
// (uneven wear) and adds thin bright streaks along a dominant direction
// (scratches catching light). Tinted by u_lightColor so streaks read as
// reflected light, not paint.
//
// Requires (provided by every host material before effect helpers):
//   - fbm(vec2), hash(vec2)         helpers
//   - vec3 specular, vec3 u_lightColor, vec2 texUV   in scope at apply
//
export const uniforms = /* glsl */ `
  uniform float u_scratchStrength;
  uniform float u_scratchScale;
  uniform float u_scratchAngle;
  uniform float u_scratchCoverage;
  uniform vec3  u_scratchColor;
`;

export const helpers = /* glsl */ `
  // Sparse, slightly-wobbly directional lines. Three families share the
  // dominant angle with only a tiny spread, so they read as ONE brushed
  // grain (parallel-ish) rather than a chaotic cross-hatch — which is what
  // made most slider settings look ugly before.
  float wmfScratches(vec2 uv){
    vec2 w = uv + (fbm(uv * 5.0) - 0.5) * 0.08;
    float acc = 0.0;
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float ang = u_scratchAngle + fi * 0.12;
      vec2 dir = vec2(cos(ang), sin(ang));
      float coord = dot(w, dir) * u_scratchScale * (1.0 + fi * 0.35);
      float cell = floor(coord);
      // Only some line-buckets carry a scratch (sparse), hashed stably.
      float present = step(1.0 - u_scratchCoverage, hash(vec2(cell, fi * 7.0 + 0.5)));
      float pos = hash(vec2(cell, fi * 3.1 + 1.0));
      float d = abs(fract(coord) - pos);
      acc = max(acc, (1.0 - smoothstep(0.0, 0.04, d)) * present);
    }
    return acc;
  }
`;

export const apply = /* glsl */ `
    if (u_scratchStrength > 0.001) {
      float k = min(u_scratchStrength, 1.0);
      // Uneven wear: knock down uniform gloss so the surface reads worn.
      specular *= mix(1.0, 0.65 + 0.35 * fbm(texUV * 9.0), k);
      // Bright scratch catches along the grain. Tinted by the scratch
      // color AND the light so streaks still read as reflected light.
      float scr = wmfScratches(texUV);
      specular += scr * u_scratchStrength * 1.3 * u_scratchColor * u_lightColor;
    }
`;
