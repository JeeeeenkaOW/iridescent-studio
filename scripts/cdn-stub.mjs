// Stub for any CDN module imported by the project. The actual module
// is fetched at runtime by the browser; this exists so the offline
// static module-load check can complete without network access. The
// default export is a no-op class to satisfy JSZip's `new JSZip()`.
export default class StubDefault {
  file() {}
  generateAsync() { return Promise.resolve(new Blob()); }
}
