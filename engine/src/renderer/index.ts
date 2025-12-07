// Export RendererLayer and types
export { RendererLayer } from './RendererLayer';
export type { Viewport, RendererLayerConfig } from './RendererLayer';

// Primitive types for external API (no THREE.js exposure)
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

