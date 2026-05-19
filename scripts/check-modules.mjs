// Boot every module that the page imports, using a stubbed `three`.
// This catches module-load-order issues and exception throws that
// happen at import time (e.g. broken default exports, missing exports,
// reference errors in top-level statements).

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

// Polyfill DOM globals so modules that touch document at import time
// (looking at you, controls) don't crash before we even simulate.
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ appendChild() {}, addEventListener() {}, getContext: () => null, style: {} }),
  body: { appendChild() {} },
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
};
globalThis.window = {
  addEventListener() {},
  devicePixelRatio: 1,
};
globalThis.performance = { now: () => 0 };
globalThis.HTMLCanvasElement = class {};

// Resolve project root relative to this script.
const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');

async function loadModule(specifier) {
  try {
    const m = await import(specifier);
    return { ok: true, exports: Object.keys(m) };
  } catch (e) {
    return { ok: false, err: e.message, stack: e.stack?.split('\n').slice(0,4).join('\n') };
  }
}

// Walk all .js files and try importing each one
async function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...await walk(p));
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = await walk(`${root}/js`);
const errors = [];

for (const f of files) {
  const url = pathToFileURL(f).href;
  const r = await loadModule(url);
  if (!r.ok) {
    errors.push({ file: f.replace(root,''), err: r.err, stack: r.stack });
  }
}

console.log(errors.length ? 'ERRORS:' : 'All modules loaded.');
errors.forEach(e => {
  console.log(`  ${e.file}: ${e.err}`);
  if (e.stack) console.log('   ', e.stack.split('\n').slice(1).join('\n     '));
});
