import { EventBus } from '../core';

export interface PlatformConfig {
  canvas: HTMLCanvasElement;
  eventBus: EventBus;
}

export interface PlatformViewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface Platform {
  readonly canvas: HTMLCanvasElement;
  
  // Viewport management
  getViewport(): PlatformViewport;
  
  // Animation loop
  startAnimationLoop(callback: (deltaTime: number) => void): void;
  stopAnimationLoop(): void;
  
  // Cleanup
  dispose(): void;
}

