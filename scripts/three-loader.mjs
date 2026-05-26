// Resolve `three` imports to our stub. Also short-circuit any CDN
// imports (jsdelivr, esm.sh, etc.) to a tiny ESM stub so the module
// graph load-check can complete offline. The browser still fetches
// the real CDN at runtime; this is purely a static-analysis aid.
const STUB_URL = new URL('./three-stub.mjs', import.meta.url).href;
const CDN_STUB_URL = new URL('./cdn-stub.mjs', import.meta.url).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: STUB_URL, shortCircuit: true };
  }
  if (specifier.startsWith('https://') || specifier.startsWith('http://')) {
    return { url: CDN_STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
