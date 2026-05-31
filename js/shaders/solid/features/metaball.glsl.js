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
// u_blobRadius (default 0.22) is the OUTER smoothstep edge — beyond
// it `blob` is 0. The INNER edge is u_blobRadius * INNER_RATIO, where
// the inner is the smoothstep falloff start (closer to cursor → 1.0).
// Scaling inner proportionally to outer keeps the perceived softness
// consistent: a tiny blob with a fixed 0.04 inner would look hard, a
// huge blob with the same 0.04 inner would look mushy. The ratio 0.18
// preserves the original 0.04/0.22 look at the default size.
//
// Tail falloff and velocity scale are kept constant — tail length is
// driven by motion, not blob radius. If we scaled the tail with the
// blob we'd need to retune the velocity clamp too; leaving it gives
// a small blob a relatively longer tail (reads as zippier) and a big
// blob a relatively shorter one (reads as more lumbering), which is
// the right intuition.
//
export const metaballBlock = /* glsl */ `
    float blob = 0.0;
    if (u_blobEnabled > 0.5) {
      vec2 d = (vUV - u_mouse) * vec2(screenAspect, 1.0);
      float dist = length(d);
      float outerEdge = u_blobRadius;
      float innerEdge = u_blobRadius * 0.18;
      blob = smoothstep(outerEdge, innerEdge, dist);
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
