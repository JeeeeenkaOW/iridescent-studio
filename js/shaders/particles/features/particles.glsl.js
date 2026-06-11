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
//   1 = square  — axis-aligned squares (Chebyshev SDF). Softness is
//                 applied at reduced scale so squares read as crisp
//                 "pixels" even at the default softness setting.
//   2 = custom  — user-uploaded SVG silhouette sampled from u_particleSvg.
//                 If no SVG has been uploaded (u_hasParticleSvg == 0),
//                 falls back to circle so the preview never breaks.
//   3 = sprites — user-uploaded sprite sheet sampled from u_spriteSheet.
//                 Grid layout comes from u_spriteGrid (cols, rows).
//                 u_spriteAssign: 0 = each particle picks one stable
//                 random sprite; 1 = particles animate through the
//                 whole sheet at u_spriteFPS; 2 = animated rows: each
//                 particle picks one random ROW and cycles its columns
//                 (rows-are-animations convention). Both animated
//                 modes are loop-safe (integer number of full cycles
//                 per loop). u_spriteScale multiplies the sprite's
//                 bounding box on top of the Size slider. u_spriteColorMode:
//                 0 = silhouette (alpha is a mask, material colors the
//                 particle, same as custom SVG); 1 = full color (the
//                 sprite's own RGB becomes the particle body color).
//                 Falls back to circle when u_hasSpriteSheet == 0.
//
// Variables this block declares (consumed by the rest of the shader):
//   particleMask, particleAlbedo, particleN, particleBloom,
//   particleCenter, particleSprite, particleSpriteMix
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
    // Per-fragment sprite color capture (shape 3, full-color mode).
    // particleSpriteMix gates the composite mix: 0 = material-colored
    // body (default for all other shapes + silhouette mode), 1 = the
    // sprite's own RGB is the body color.
    vec3  particleSprite    = vec3(0.0);
    float particleSpriteMix = 0.0;
    float bestCoverage   = 0.0;

    // 5x5 scan, but ring 2 only participates when the sprite's
    // effective half-extent (Size x Sprite scale) plus max jitter
    // could poke past the 1.5-cell reach of a 3x3 scan. Uniform-
    // coherent skip, so every other configuration executes the same
    // 3x3 work as before.
    bool wideScan = (u_particleShape > 2.5)
                 && (u_particleSize * u_spriteScale > 1.0);
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        float fdx = float(dx);
        float fdy = float(dy);
        if (!wideScan && (fdx * fdx > 1.5 || fdy * fdy > 1.5)) continue;
        vec2 nbr = cellId + vec2(fdx, fdy);

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
        //   1 square:  cov = smoothstep over max(|x|,|y|) (Chebyshev)
        //   2 custom:  sample u_particleSvg alpha at local coords.
        //   3 sprites: sample one cell of u_spriteSheet at local coords.
        //   2 and 3 fall back to circle when nothing is uploaded yet.
        float cov = 0.0;
        // Per-neighbor sprite candidates. Reset each iteration; only
        // promoted to particleSprite/particleSpriteMix if this
        // neighbor wins the coverage contest below.
        vec3  candSprite    = vec3(0.0);
        float candSpriteMix = 0.0;
        if (u_particleShape < 0.5) {
          // Circle — Euclidean distance
          cov = 1.0 - smoothstep(radius - soft, radius, dist);
        } else if (u_particleShape < 1.5) {
          // Square — Chebyshev distance. Softness is scaled down
          // (x0.3) so squares stay hard-edged and read as crisp
          // pixels at the default softness; at softness 0 this is an
          // exact step. The pixel-art look depends on this edge.
          vec2 absd = abs(d) / cellSize;
          float cheb = max(absd.x, absd.y);
          cov = 1.0 - smoothstep(radius - soft * 0.3, radius, cheb);
        } else if (u_particleShape < 2.5) {
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
        } else {
          // Sprite sheet. Same local-UV construction as custom SVG —
          // the particle's bounding box maps to ONE CELL of the sheet
          // instead of the whole texture.
          //
          // Cell selection (idx, reading order: left-to-right then
          // top-to-bottom as the artist sees the sheet):
          //   - base index: stable per-particle hash, so in random
          //     mode each particle keeps its sprite forever.
          //   - animated advance: floor(time * fps) added on top, so
          //     every particle cycles the sheet but starts at its own
          //     offset (the field never blinks in unison).
          //   - loop mode: the frame counter is derived from loop
          //     phase and completes an integer number of full sheet
          //     cycles per loop, so WebM exports close seamlessly.
          //
          // Row math: the texture is uploaded Y-flipped (same
          // convention as the custom SVG path), so image row r
          // counted from the TOP of the sheet lives in the
          // (rows - 1 - r) band of sampler space.
          if (u_hasSpriteSheet > 0.5) {
            // Sprite-only size: u_spriteScale multiplies the box on
            // top of the shared Size slider. Half-extent clamped to
            // 2.0 cells so the 5x5 scan always covers the box.
            float sradius = min(radius * u_spriteScale, 2.0);
            vec2 localUV = (d / cellSize) / (2.0 * sradius) + 0.5;
            // Contain-fit: preserve the CELL's aspect ratio inside the
            // square particle box. A wide cell (aspect > 1) spans the
            // box's full width and is centered vertically; a tall cell
            // the inverse. Fragments in the letterbox bands fall
            // outside [0,1] and are rejected by the bounds check below
            // (cov stays 0 = transparent padding, no squish ever).
            {
              float cols0 = max(u_spriteGrid.x, 1.0);
              float rows0 = max(u_spriteGrid.y, 1.0);
              vec2 sheetPx = max(u_spriteSheetSize, vec2(1.0));
              float cellAspect = (sheetPx.x / cols0) / (sheetPx.y / rows0);
              if (cellAspect > 1.0) {
                localUV.y = (localUV.y - 0.5) * cellAspect + 0.5;
              } else if (cellAspect < 1.0) {
                localUV.x = (localUV.x - 0.5) / cellAspect + 0.5;
              }
            }
            if (localUV.x >= 0.0 && localUV.x <= 1.0 &&
                localUV.y >= 0.0 && localUV.y <= 1.0) {
              localUV.y = 1.0 - localUV.y;
              float cols  = max(u_spriteGrid.x, 1.0);
              float rows  = max(u_spriteGrid.y, 1.0);
              float total = cols * rows;
              // Stable per-particle pick.
              float pick = hash(nbr + vec2(5.7, 9.3));
              float idx;
              if (u_spriteAssign > 1.5) {
                // ANIMATED ROWS — each particle picks one random ROW
                // (one animation type) and cycles that row's COLUMNS.
                // Standard rows-are-animations sheet convention.
                float row = min(floor(pick * rows), rows - 1.0);
                float colBase = floor(hash(nbr + vec2(3.3, 8.8)) * cols);
                float fps = max(u_spriteFPS, 0.01);
                float frameAdv;
                if (u_loopMode > 0.5) {
                  float cycles = max(1.0, floor(u_loopDuration * fps / cols + 0.5));
                  float phase = fract(u_time / max(u_loopDuration, 0.001));
                  frameAdv = floor(phase * cycles * cols);
                } else {
                  frameAdv = floor(u_time * fps);
                }
                idx = row * cols + mod(colBase + frameAdv, cols);
              } else {
                float idxBase = floor(pick * total);
                // Animated frame advance (0 in random mode).
                float frameAdv = 0.0;
                if (u_spriteAssign > 0.5) {
                  float fps = max(u_spriteFPS, 0.01);
                  if (u_loopMode > 0.5) {
                    float cycles = max(1.0, floor(u_loopDuration * fps / total + 0.5));
                    float phase = fract(u_time / max(u_loopDuration, 0.001));
                    frameAdv = floor(phase * cycles * total);
                  } else {
                    frameAdv = floor(u_time * fps);
                  }
                }
                idx = mod(idxBase + frameAdv, total);
              }
              float sc = mod(idx, cols);
              float sr = floor(idx / cols);
              // Inset clamp keeps NEAREST sampling off the exact cell
              // border so neighbouring sprites never bleed in.
              vec2 fc = clamp(localUV, 0.002, 0.998);
              vec2 sheetUV = vec2((sc + fc.x) / cols,
                                  (rows - 1.0 - sr + fc.y) / rows);
              vec4 sp = texture2D(u_spriteSheet, sheetUV);
              float lo = clamp(0.5 - soft * 0.6, 0.0, 0.95);
              float hi = clamp(0.5 + soft * 0.6, 0.05, 1.0);
              cov = smoothstep(lo, hi, sp.a);
              if (u_spriteColorMode > 0.5) {
                candSprite    = sp.rgb;
                candSpriteMix = 1.0;
              }
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
          particleSprite    = candSprite;
          particleSpriteMix = candSpriteMix;
          // h1 + h3 mixed gives a well-distributed hue per cell.
          // fract keeps it in [0,1] which is what the palette wants.
          particleHue    = fract(h1 * 0.61803 + h3 * 0.31831);
        }
      }
    }
`;
