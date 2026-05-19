// =========================================================
// METABALL — mercury blob that follows the cursor
// =========================================================
// Two parts: a circular blob at the cursor, and a velocity-stretched
// "tail" trailing behind cursor motion. Output `blob` is 0..1 mask
// used later by lighting (specular boost) and chromatic aberration.
//
// Tuneables (currently hardcoded — could be uniforms per preset):
//   - blob radius:           0.22 → 0.04 (outer → inner)
//   - tail along-falloff:    0.0 → 0.35
//   - tail cross-falloff:    0.05 → 0.0
//   - tail velocity scale:   8.0  (clamped at 0.6)
//
export const metaballBlock = /* glsl */ `
    vec2 d = (vUV - u_mouse) * vec2(screenAspect, 1.0);
    float dist = length(d);
    float blob = smoothstep(0.22, 0.04, dist);
    vec2 vel = u_mouseVel * vec2(screenAspect, 1.0);
    float velMag = length(vel);
    if(velMag > 0.0001){
      vec2 velDir = vel / velMag;
      float along = dot(d, velDir);
      float tail = smoothstep(0.0, 0.35, along) *
                   smoothstep(0.05, 0.0, abs(dot(d, vec2(-velDir.y, velDir.x))));
      blob = max(blob, tail * min(velMag * 8.0, 0.6));
    }
`;
