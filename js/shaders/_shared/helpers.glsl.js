// =========================================================
// SHARED MATERIAL HELPERS — Fresnel, ambient, tonemapping
// =========================================================
// Three small GLSL helpers used by every material in the realism
// pass. They live here rather than per-material so tuning one
// helper updates every material in lockstep.
//
// FRESNEL — Schlick's approximation. Models how reflectance ramps up
//   at grazing angles. F0 (reflectance at normal incidence) is the
//   knob materials tune: ~0.04 for dielectrics like glass/obsidian,
//   ~0.95 for metals like mercury. The (1-NdotV)^5 ramp is what makes
//   the silhouette read as more reflective than the centre.
//
// HEMI_AMBIENT — Cheap "sky/ground" ambient. Real ambient light has
//   direction: sky on top, ground on bottom. We lerp between a cool
//   sky tint and a warm ground tint using N.y (clamped). At N.y=1
//   (facing up) you get sky; at -1 (facing down) you get ground.
//   This breaks up the flatness of a single ambient constant and
//   adds free volumetric reading to the material.
//
// ACES_TONEMAP — Narkowicz's compact ACES filmic approximation.
//   Maps unbounded linear HDR into [0,1] with a film-like S-curve.
//   Important: WITHOUT this, mercury's highlights + lighting override
//   sliders pushed up blow out to pure white. WITH it, highlights
//   roll off cleanly and colour is preserved into the bright range.
//
export const sharedMaterialHelpers = /* glsl */ `
  float fresnelSchlick(float NdotV, float F0) {
    return F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);
  }

  vec3 fresnelSchlickColored(float NdotV, vec3 F0) {
    return F0 + (vec3(1.0) - F0) * pow(1.0 - NdotV, 5.0);
  }

  // Sky/ground hemisphere ambient. skyColor and groundColor are
  // (usually) subtle tints — too saturated and the material reads as
  // tinted rather than lit. The N.y lerp uses normalized [0,1] space
  // so we don't have to clamp twice.
  vec3 hemiAmbient(vec3 N, vec3 skyColor, vec3 groundColor) {
    float t = N.y * 0.5 + 0.5;
    return mix(groundColor, skyColor, t);
  }

  // ACES filmic curve, Narkowicz approximation. 6 multiplies.
  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 acesTonemap(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  // ---- LOOP-AWARE TIME ----
  // For perfect-loop video export, time-dependent noise needs to be
  // periodic. Linear u_time * speed doesn't loop. Instead, when
  // u_loopMode > 0.5, return a sin/cos circular offset whose period
  // is exactly u_loopDuration — so noise sampled at t=0 equals noise
  // at t=loopDuration, and the export loop closes seamlessly.
  //
  // Interactive mode (u_loopMode = 0): same linear drift as before.
  // Loop mode (u_loopMode = 1): the noise UV traces a small circle in
  // texture space, sampling a loop of noise instead of a drift.
  //
  // The amplitude sets how much noise variety the loop traverses.
  // 8.0 matches roughly what linear drift covers in ~5 seconds at
  // the old speeds.
  vec2 loopTime2D(float speedX, float speedY) {
    if (u_loopMode > 0.5) {
      float phase = (u_time / max(u_loopDuration, 0.001)) * 6.28318;
      // Use both speeds as a hash so different callers get decorrelated
      // motion — otherwise every noise field would loop in lockstep.
      float hashAng = speedX * 73.13 + speedY * 31.71;
      return vec2(sin(phase + hashAng), cos(phase + hashAng)) * 8.0;
    }
    return vec2(u_time * speedX, u_time * speedY);
  }

  // Scalar version — for terms like u_time * 0.06 driving palette
  // phase. The palette has period 1 in its input (cos(2pi * x)), so
  // for the output to repeat at t=loopDuration we need the value to
  // advance by an integer number of units over one loop. We round
  // (speed * loopDuration) to the nearest integer ≥ 1 — that's the
  // number of palette cycles per loop. At t=loopDuration the value
  // is exactly that integer, so cos() returns the same as at t=0.
  float loopTime(float speed) {
    if (u_loopMode > 0.5) {
      float cycles = max(floor(speed * u_loopDuration + 0.5), 1.0);
      return (u_time / u_loopDuration) * cycles;
    }
    return u_time * speed;
  }
`;
