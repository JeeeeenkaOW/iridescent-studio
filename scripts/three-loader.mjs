// Resolve `three` imports to our stub.
const STUB_URL = new URL('./three-stub.mjs', import.meta.url).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
