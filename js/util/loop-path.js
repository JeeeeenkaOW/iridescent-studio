// =========================================================
// LOOP PATH — analytical cursor for seamless-loop capture
// =========================================================
// Single source of truth for the circular cursor path traced during
// any loop-time-domain (WebM capture, PNG sequence, preview-loop).
//
// It used to be copy-pasted in three places (main.js autoPathLooping +
// its inline velocity, and export.js loopCursor/loopCursorVel). The
// comments there warned "if one changes the others must too" — which is
// exactly the footgun this module removes. main.js, the WebM exporter,
// and the PNG-sequence exporter now all call these, so every loop
// export is frame-identical by construction.
//
// The path is a perfect circle that closes exactly at t = loopDuration,
// so noise fields driven by loopTime/loopTime2D, the cursor, and u_time
// all wrap at the same period and the loop is seamless.

// Position at time t (0..loopDuration). Radii are intentionally wider
// than interactive drift so the recorded motion reads clearly.
export function loopCursor(t, loopDur) {
  const phase = (t / loopDur) * Math.PI * 2;
  return {
    x: 0.5 + Math.sin(phase) * 0.30,
    y: 0.5 + Math.cos(phase) * 0.24,
  };
}

// Analytical tangent (velocity) of the circle at time t. Computed in
// closed form rather than from position deltas so frame 0 has a correct
// velocity (a delta-based value would be garbage on the first frame and
// break the loop for effects that read u_mouseVel, e.g. the metaball
// tail). Sign convention matches the consumers: they set
// u_mouseVel = (vx, vy) directly.
export function loopCursorVel(t, loopDur) {
  const phase = (t / loopDur) * Math.PI * 2;
  const angularRate = (Math.PI * 2) / loopDur;
  const dxdt =  0.30 * Math.cos(phase) * angularRate;
  const dydt = -0.24 * Math.sin(phase) * angularRate;
  const perFrame = 1 / 60;
  return { vx: dxdt * perFrame, vy: -dydt * perFrame };
}
