// =========================================================
// METABALL — cursor blob (optional, toggled by u_blobEnabled)
// =========================================================
// Same shape as the old Mercury metaball: circular blob at cursor
// plus a velocity-stretched tail. Output `blob` is 0..1 mask used by
// the flow block for specular boost.
//
// When u_blobEnabled is 0, blob is forced to 0 (no contribution).
// When 1, the cursor blob behaves as before.
//
// Tuneables (hardcoded; could become uniforms later):
//   - blob radius:           0.22 → 0.04 (outer → inner)
//   - tail along-falloff:    0.0 → 0.35
//   - tail cross-falloff:    0.05 → 0.0
//   - tail velocity scale:   8.0  (clamped at 0.6)
//
export const metaballBlock = /* glsl */ `
    float blob = 0.0;
    if (u_blobEnabled > 0.5) {
      vec2 d = (vUV - u_mouse) * vec2(screenAspect, 1.0);
      float dist = length(d);
      blob = smoothstep(0.22, 0.04, dist);
      vec2 vel = u_mouseVel * vec2(screenAspect, 1.0);
      float velMag = length(vel);
      if (velMag > 0.0001) {
        vec2 velDir = vel / velMag;
        float along = dot(d, velDir);
        float tail = smoothstep(0.0, 0.35, along) *
                     smoothstep(0.05, 0.0, abs(dot(d, vec2(-velDir.y, velDir.x))));
        blob = max(blob, tail * min(velMag * 8.0, 0.6));
      }
    }
`;
