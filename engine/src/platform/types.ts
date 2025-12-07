import * as THREE from 'three';

export interface PlatformConfig {
  canvas: HTMLCanvasElement;
}

export interface PlatformViewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface InputHandler {
  onKeyDown?: (key: string) => void;
  onClick?: (clientX: number, clientY: number) => void;
  onMouseMove?: (clientX: number, clientY: number) => void;
}

export interface Platform {
  readonly canvas: HTMLCanvasElement;
  
  // Viewport management
  getViewport(): PlatformViewport;
  onResize(callback: (viewport: PlatformViewport) => void): void;
  
  // Input handling
  registerInputHandlers(handlers: InputHandler): void;
  unregisterInputHandlers(): void;
  
  // Cursor management
  setCursor(cursor: string): void;
  
  // Animation loop
  startAnimationLoop(callback: () => void): void;
  stopAnimationLoop(): void;
  
  // Cleanup
  dispose(): void;
}

