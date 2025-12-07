import { createWebPlatform } from './platform';
import { createRenderer } from './renderer';

export interface RendererInstance {
  cleanup: () => void;
}

export async function initRenderer(canvas: HTMLCanvasElement): Promise<RendererInstance> {
  // Create platform abstraction
  const platform = createWebPlatform({ canvas });
  const viewport = platform.getViewport();
  
  // Create renderer (handles all three.js concerns)
  const renderer = await createRenderer({
    canvas,
    viewport,
    onCursorChange: (cursor: string) => platform.setCursor(cursor),
  });

  // Initialize renderer input handlers
  renderer.registerInputHandlers({});

  // Wire platform input events to renderer
  const handlers = renderer.getInputHandlers();
  platform.registerInputHandlers(handlers);

  // Handle window resize
  platform.onResize((viewport) => {
    renderer.resize(viewport);
  });

  // Animation loop
  platform.startAnimationLoop(() => {
    renderer.render();
  });

  // Cleanup function
  const cleanup = () => {
    platform.dispose();
    renderer.cleanup();
  };

  return { cleanup };
}
