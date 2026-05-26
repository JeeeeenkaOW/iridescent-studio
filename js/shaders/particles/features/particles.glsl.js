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
// MOTIONS (each independent, can be combined):
//   - DRIFT (u_motionDrift)   — fbm noise wobble per particle
//   - RISE  (u_motionRise)    — directional upward drift with fade
//   - TWINKLE (u_motionTwinkle) — per-cell brightness oscillation
//   - SCATTER (u_motionScatter) — radial outward push from centre
// All four can be active simultaneously. Each scales its contribution
// from 0 (off) to 1 (full).
//
// SHAPES (single-select via u_particleShape):
//   0 = circle  — soft round dots (default), SDF-based
//   1 = diamond — rotated squares, SDF-based
//   2 = custom  — user-uploaded SVG silhouette sampled from u_particleSvg.
//                 If no SVG has been uploaded (u_hasParticleSvg == 0),
//                 falls back to circle so the preview never breaks.
//
// Variables this block declares (consumed by the rest of the shader):
//   particleMask, particleAlbedo, particleN, particleBloom, particleCenter
//
export const particlesBlock = /* glsl */ `
    float gridDensity = u_particleDensity;
    float cellSize = 1.0 / gridDensity;
    vec2 aspectScale = vec2(u_imgAspect, 1.0);
    vec2 cellId = floor(texUV * gridDensity);

    float particleMask  = 0.0;
    vec3  particleAlbedo = vec3(0.0);
    vec3  particleN      = vec3(0.0, 0.0, 1.0);
    float particleBloom  = 0.0;
    vec2  particleCenter = texUV;
    // Per-particle hue seed. Each grid cell hashes to a stable value
    // in [0,1] — when this fragment's dominant particle is picked,
    // we capture its seed. Downstream (flow-fbm) folds this into iriT
    // so the iridescence palette gives each dot a crisp distinct hue
    // rather than the smooth fbm gradient across cells.
    float particleHue    = 0.0;
    float bestCoverage   = 0.0;

    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        vec2 nbr = cellId + vec2(float(dx), float(dy));

        // Per-cell hashes for jitter + per-cell phase offsets.
        float h1 = hash(nbr + vec2(11.7, 23.1));
        float h2 = hash(nbr + vec2(57.3, 91.5));
        float h3 = hash(nbr + vec2(83.9, 47.2));

        vec2 baseCenter = (nbr + 0.5) * cellSize;
        vec2 jitterOff  = (vec2(h1, h2) - 0.5) * u_particleJitter * cellSize * 0.9;

        // Combine all four motion types. Each scaled by its strength.
        // Result is in CELL units (so they're scale-invariant); we
        // multiply by cellSize at the end to get UV-space offset.
        vec2 motion = vec2(0.0);

        // DRIFT — fbm noise wobble. Each particle's drift direction
        // is determined by its position in a low-freq noise field.
        if (u_motionDrift > 0.001) {
          vec2 ph = baseCenter * 3.0 + h3 * 17.0;
          vec2 driftPhase = loopTime2D(0.12, 0.09);
          vec2 d = vec2(fbm(ph + driftPhase) - 0.5,
                       fbm(ph + driftPhase + vec2(7.3, 3.1)) - 0.5);
          motion += d * 1.5 * u_motionDrift;
        }

        // RISE — directional upward drift with cycle. h3 randomises
        // per-cell phase so particles rise at different times.
        if (u_motionRise > 0.001) {
          float phase = loopTime(0.25) + h3;
          motion.y += -(sin(phase * 6.28318) * 0.8 + 0.3) * u_motionRise;
          motion.x += (h1 - 0.5) * 0.4 * u_motionRise;
        }

        // SCATTER — radial outward push from image centre.
        if (u_motionScatter > 0.001) {
          vec2 fromCenter = baseCenter - vec2(0.5);
          float dirLen = max(length(fromCenter), 0.001);
          vec2 dir = fromCenter / dirLen;
          float push = (sin(loopTime(0.18) * 6.28318 + h3 * 6.28318) * 0.5 + 0.5);
          motion += dir * push * 1.2 * u_motionScatter;
        }

        vec2 center = baseCenter + jitterOff + motion * cellSize;

        // Distance from this fragment to the particle centre, in
        // cell-radius units (aspect-corrected so dots are circular).
        vec2 d = (texUV - center) * aspectScale;
        float dist = length(d) / cellSize;

        float radius = u_particleSize;
        float soft   = u_particleSoftness;

        // SHAPE — switch dot-coverage function by u_particleShape.
        //   0 circle:  cov = smoothstep(radius, radius-soft, length)
        //   1 diamond: cov = smoothstep over |x|+|y|  (Manhattan)
        //   2 custom:  sample u_particleSvg alpha at local coords.
        //              Falls back to circle if no SVG uploaded yet.
        float cov = 0.0;
        if (u_particleShape < 0.5) {
          // Circle — Euclidean distance
          cov = 1.0 - smoothstep(radius - soft, radius, dist);
        } else if (u_particleShape < 1.5) {
          // Diamond — Manhattan distance
          vec2 absd = abs(d) / cellSize;
          float manhattan = absd.x + absd.y;
          cov = 1.0 - smoothstep(radius - soft, radius, manhattan);
        } else {
          // Custom SVG silhouette. We sample the user's rasterized
          // SVG texture at a local UV centred on the particle. The
          // SVG occupies a square of side (2 * radius) in cell units
          // (so the radius slider scales it like the other shapes).
          //
          // Soft falloff is achieved by taking the texture's alpha
          // and feathering it with smoothstep — this gives the same
          // soft-edged behaviour as the SDF shapes at the boundary.
          //
          // No-SVG fallback: if u_hasParticleSvg == 0, render as a
          // circle so users see particles immediately on first load,
          // even before they pick their custom SVG.
          if (u_hasParticleSvg > 0.5) {
            // Local UV in [0,1] across the particle's bounding box.
            // d is in UV space, aspect-corrected. Convert to cell-
            // relative units, then to [0,1] across a (2*radius) box.
            vec2 localUV = (d / cellSize) / (2.0 * radius) + 0.5;
            // Outside the bounding box → no coverage.
            if (localUV.x >= 0.0 && localUV.x <= 1.0 &&
                localUV.y >= 0.0 && localUV.y <= 1.0) {
              // Flip Y because texture origin differs from UV origin
              // for our rasterized canvas (CanvasTexture is top-left).
              localUV.y = 1.0 - localUV.y;
              float a = texture2D(u_particleSvg, localUV).a;
              // Soft edge: feather the alpha. soft is in radius units
              // (~[0,0.5]); convert to an alpha threshold range.
              float lo = clamp(0.5 - soft * 0.6, 0.0, 0.95);
              float hi = clamp(0.5 + soft * 0.6, 0.05, 1.0);
              cov = smoothstep(lo, hi, a);
            }
          } else {
            // Fallback to circle.
            cov = 1.0 - smoothstep(radius - soft, radius, dist);
          }
        }

        // Sample albedo at the particle's centre.
        vec2 sampleAt = clamp(center, vec2(0.001), vec2(0.999));
        vec3 cellAlbedo = texture2D(u_albedo, sampleAt).rgb;
        float cellMask = max(max(cellAlbedo.r, cellAlbedo.g), cellAlbedo.b);
        cov *= cellMask;

        // TWINKLE — per-cell brightness oscillation. Independent of
        // motion; can run alongside drift/rise/scatter.
        if (u_motionTwinkle > 0.001) {
          float twink = 0.5 + 0.5 * sin(loopTime(0.5) * 6.28318 + h3 * 6.28318);
          float twinkleMul = mix(1.0, mix(0.3, 1.0, twink), u_motionTwinkle);
          cov *= twinkleMul;
        }

        // RISE fade — particles fade as they rise (phase progresses).
        // Folded into RISE rather than a separate uniform.
        if (u_motionRise > 0.001) {
          float phase = fract(loopTime(0.25) + h3);
          float fade = mix(1.0, 1.0 - phase, u_motionRise);
          cov *= fade;
        }

        if (cov > bestCoverage) {
          bestCoverage   = cov;
          particleMask   = cov;
          particleAlbedo = cellAlbedo;
          particleN      = normalize(texture2D(u_normal, sampleAt).rgb * 2.0 - 1.0);
          particleBloom  = texture2D(u_bloom, sampleAt).r;
          particleCenter = center;
          // h1 + h3 mixed gives a well-distributed hue per cell.
          // fract keeps it in [0,1] which is what the palette wants.
          particleHue    = fract(h1 * 0.61803 + h3 * 0.31831);
        }
      }
    }
`;
