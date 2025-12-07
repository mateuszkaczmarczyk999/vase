import { createWebPlatform } from './platform';
import { RendererLayer } from './renderer';
import { EventBus, LayerStack } from './core';

export interface RendererInstance {
  cleanup: () => void;
  eventBus: EventBus;
}

export async function initRenderer(canvas: HTMLCanvasElement): Promise<RendererInstance> {
  // Create EventBus for communication between layers
  const eventBus = new EventBus();
  
  // Create LayerStack to manage application layers
  const layerStack = new LayerStack();
  
  // Create platform abstraction with EventBus
  const platform = createWebPlatform({ canvas, eventBus });
  const viewport = platform.getViewport();
  
  // Create and push RendererLayer (async - waits for WebGPU initialization)
  const rendererLayer = new RendererLayer({ canvas, viewport }, eventBus);
  await layerStack.pushLayer(rendererLayer);

  // Animation loop - updates and renders all layers
  platform.startAnimationLoop((deltaTime: number) => {
    layerStack.update(deltaTime);
    layerStack.render();
  });

  // Cleanup function
  const cleanup = () => {
    layerStack.clear();
    platform.dispose();
    eventBus.clear();
  };

  return { cleanup, eventBus };
}
