// =========================================================
// PARTICLES — core sampling block
// =========================================================
// For each fragment, find which "grid cell" it belongs to. Each cell
// has a particle at its (jittered, animated) centre. If this fragment
// is close enough to that centre, AND the underlying albedo at the
// particle's position is solid, render the particle.
//
// We sample the 3×3 neighbourhood of cells so particles that drift
// across cell boundaries don't get clipped — every fragment checks
// itself against ALL nearby particles and takes the strongest.
//
// Variables this block declares (consumed by the rest of the shader):
//   particleMask  — 0..1, how strongly this fragment is covered by a
//                   particle. Replaces the role of `mask` in solid.
//   particleAlbedo — vec3 sampled at the centre of the strongest-
//                    covering particle. Used as the body's base color.
//   particleN     — vec3 normal sampled at that same position. Drives
//                   lighting on the particle.
//   particleBloom — float bloom value at that position. For halo.
//   particleCenter — vec2 (in tex UV space) of the particle centre.
//                    Useful for downstream effects.
//
// The host material then computes lighting on (particleN, lightDir)
// at the particleCenter, multiplies the result by particleAlbedo,
// and outputs particleMask * lit_color.
//
// Mode parameter `u_particleMode`:
//   0 DUST     — gentle drift via fbm noise, mostly static
//   1 SMOKE    — directional upward drift, fade with offset
//   2 STARS    — no drift; twinkle (intensity oscillates per cell)
//   3 FRAGMENTS — outward radial drift from image centre
//
export const particlesBlock = /* glsl */ `
    // Cells per image-UV unit. density of 80 means 80 cells across.
    float gridDensity = u_particleDensity;
    // Cell size in UV space.
    float cellSize = 1.0 / gridDensity;

    // Aspect-correct the cell so particles render as circles, not
    // ovals, regardless of the source image's aspect ratio.
    vec2 aspectScale = vec2(u_imgAspect, 1.0);

    // Search a 3x3 neighbourhood of cells around this fragment so
    // particles that drift across cell boundaries are caught.
    vec2 cellId = floor(texUV * gridDensity);

    float particleMask  = 0.0;
    vec3  particleAlbedo = vec3(0.0);
    vec3  particleN      = vec3(0.0, 0.0, 1.0);
    float particleBloom  = 0.0;
    vec2  particleCenter = texUV;
    float bestCoverage   = 0.0;

    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        vec2 nbr = cellId + vec2(float(dx), float(dy));

        // Per-cell hash for jitter + per-cell phase offsets.
        float h1 = hash(nbr + vec2(11.7, 23.1));
        float h2 = hash(nbr + vec2(57.3, 91.5));
        float h3 = hash(nbr + vec2(83.9, 47.2));

        // Base centre = cell centre, optionally jittered.
        vec2 baseCenter = (nbr + 0.5) * cellSize;
        vec2 jitterOff  = (vec2(h1, h2) - 0.5) * u_particleJitter * cellSize * 0.9;

        // Mode-specific drift offset.
        vec2 drift = vec2(0.0);
        if (u_particleMode < 0.5) {
          // DUST — fbm noise drift, slow and gentle.
          vec2 ph = baseCenter * 3.0 + h3 * 17.0;
          vec2 driftPhase = loopTime2D(0.12, 0.09);
          drift = vec2(fbm(ph + driftPhase) - 0.5, fbm(ph + driftPhase + vec2(7.3, 3.1)) - 0.5) * 1.5;
        } else if (u_particleMode < 1.5) {
          // SMOKE — directional upward drift, looped via sin so it
          // resets each cycle. h3 randomises per-cell phase so
          // particles don't all reach the top simultaneously.
          float phase = loopTime(0.25) + h3;
          drift.y = -sin(phase * 6.28318) * 0.8 - 0.3;
          drift.x = (h1 - 0.5) * 0.4;
        } else if (u_particleMode < 2.5) {
          // STARS — no drift; twinkle modulates the coverage below.
          drift = vec2(0.0);
        } else {
          // FRAGMENTS — radial outward drift, each cell pushed from
          // centre with magnitude tied to distance + per-cell phase.
          vec2 fromCenter = baseCenter - vec2(0.5);
          float dirLen = max(length(fromCenter), 0.001);
          vec2 dir = fromCenter / dirLen;
          float push = (sin(loopTime(0.18) * 6.28318 + h3 * 6.28318) * 0.5 + 0.5);
          drift = dir * push * 1.2;
        }

        vec2 center = baseCenter + jitterOff + drift * u_particleDrift * cellSize;

        // Distance from this fragment to the particle centre,
        // measured in cell-radius units (aspect-corrected so dots
        // are circular regardless of image aspect).
        vec2 d = (texUV - center) * aspectScale;
        float dist = length(d) / cellSize;

        // Particle radius in cell-units. 0..1 mapping.
        float radius = u_particleSize;
        float soft   = u_particleSoftness;

        // Coverage: 1 at centre, smooth falloff to 0 at radius.
        float cov = 1.0 - smoothstep(radius - soft, radius, dist);

        // Sample albedo at the particle's centre. If that's below
        // the silhouette threshold, particle is invisible. We use
        // the centre, not the fragment, so the particle is fully
        // opaque inside the body and fully transparent outside.
        vec2 sampleAt = clamp(center, vec2(0.001), vec2(0.999));
        vec3 cellAlbedo = texture2D(u_albedo, sampleAt).rgb;
        float cellMask = max(max(cellAlbedo.r, cellAlbedo.g), cellAlbedo.b);
        cov *= cellMask;

        // STARS twinkle — modulate coverage with per-cell phase.
        if (u_particleMode > 1.5 && u_particleMode < 2.5) {
          float twink = 0.5 + 0.5 * sin(loopTime(0.5) * 6.28318 + h3 * 6.28318);
          cov *= mix(0.3, 1.0, twink);
        }

        // SMOKE fade — particles fade as they rise (phase progresses).
        if (u_particleMode > 0.5 && u_particleMode < 1.5) {
          float phase = fract(loopTime(0.25) + h3);
          cov *= 1.0 - phase;  // bright at start, fades by end of cycle
        }

        if (cov > bestCoverage) {
          bestCoverage   = cov;
          particleMask   = cov;
          particleAlbedo = cellAlbedo;
          particleN      = normalize(texture2D(u_normal, sampleAt).rgb * 2.0 - 1.0);
          particleBloom  = texture2D(u_bloom, sampleAt).r;
          particleCenter = center;
        }
      }
    }
`;
