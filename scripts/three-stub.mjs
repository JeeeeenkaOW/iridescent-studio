// Minimal three.js stub — enough for module imports to succeed.
class Vec2 {
  constructor(x, y) { this.x = x || 0; this.y = y || 0; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(o) { this.x = o.x; this.y = o.y; return this; }
}

class Vec3 {
  constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(o) { this.x = o.x; this.y = o.y; this.z = o.z; return this; }
  toArray() { return [this.x, this.y, this.z]; }
}

export const Vector2 = Vec2;
export const Vector3 = Vec3;
export const Scene = class {};
export const Mesh = class {};
export const Group = class {};
export const Color = class {};
export const PlaneGeometry = class {};
export const ShaderMaterial = class {};
export const OrthographicCamera = class {};
export const WebGLRenderer = class { constructor() { this.domElement = {}; } setPixelRatio() {} setSize() {} render() {} };
export const CanvasTexture = class { constructor() { this.image = {}; } dispose() {} };
export const TextureLoader = class { load(url, cb) { setTimeout(() => cb({}), 0); } };
export const LinearFilter = 0;
export const NearestFilter = 0;
export const ClampToEdgeWrapping = 0;
export const RepeatWrapping = 0;
export const DoubleSide = 0;
export const FrontSide = 0;
export const sRGBEncoding = 0;
export const NoBlending = 0;
export const NormalBlending = 0;
export const AdditiveBlending = 0;
export const RGBAFormat = 0;
export const FloatType = 0;
export const HalfFloatType = 0;
export const UnsignedByteType = 0;

export default {
  Vector2, Vector3, Scene, Mesh, Group, Color, PlaneGeometry,
  ShaderMaterial, OrthographicCamera, WebGLRenderer, CanvasTexture,
  TextureLoader, LinearFilter, NearestFilter, ClampToEdgeWrapping,
  RepeatWrapping, DoubleSide, FrontSide,
};
