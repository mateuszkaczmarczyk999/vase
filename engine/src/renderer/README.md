# Renderer Layer

## Overview

The renderer directory contains the complete rendering abstraction layer that encapsulates all THREE.js dependencies. This layer follows the game engine architecture principle of hiding implementation details behind a clean API, ensuring that higher-level code (like `index.ts`) remains independent of the specific rendering library being used.

## Responsibilities

The renderer layer is responsible for:

1. **Graphics Initialization** - Setting up WebGPU renderer, scene, camera, and lights
2. **Material Management** - Creating and managing materials for preview and final objects
3. **Geometry Creation** - Creating and managing box geometries with proper positioning and rotation
4. **Camera Controls** - Managing orbit controls for camera manipulation
5. **Input Processing** - Handling draw mode, raycasting, and interaction logic
6. **Rendering** - Executing the render loop and updating visual elements
7. **Resource Cleanup** - Properly disposing of all THREE.js resources

## Architecture

```
renderer/
├── index.ts    # Complete renderer implementation with clean API
└── README.md   # This file
```

### Design Principles

- **Complete Abstraction** - No THREE.js types exposed in the public API
- **Primitive Types** - API uses simple types like `Vec3`, `Viewport`, primitives
- **Self-Contained** - All rendering concerns (including controls and interaction) are internal
- **Clean Interface** - Minimal surface area with only essential methods exposed

### Core Interfaces

#### `Renderer`
The main interface for the rendering system:

```typescript
interface Renderer {
  registerInputHandlers(handlers: InputHandlers): void;
  getInputHandlers(): InputHandlers;
  resize(viewport: Viewport): void;
  render(): void;
  cleanup(): void;
}
```

#### `RendererConfig`
Configuration object for renderer initialization:

```typescript
interface RendererConfig {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  onCursorChange?: (cursor: string) => void;
  onControlsEnableChange?: (enabled: boolean) => void;
}
```

#### `Viewport`
Viewport information structure (primitive types only):

```typescript
interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
}
```

#### `Vec3`
3D vector using primitive types (replaces THREE.Vector3 in API):

```typescript
interface Vec3 {
  x: number;
  y: number;
  z: number;
}
```

#### `InputHandlers`
Callback interface for handling user input:

```typescript
interface InputHandlers {
  onKeyDown?: (key: string) => void;
  onClick?: (clientX: number, clientY: number) => void;
  onMouseMove?: (clientX: number, clientY: number) => void;
}
```

## Usage

### Basic Setup

```typescript
import { createRenderer } from './renderer';

// Initialize renderer with canvas and viewport
const renderer = await createRenderer({
  canvas: myCanvasElement,
  viewport: {
    width: 1920,
    height: 1080,
    pixelRatio: 2
  },
  onCursorChange: (cursor) => {
    console.log('Cursor changed to:', cursor);
  }
});
```

### Input Handling

Register input handlers for user interaction:

```typescript
renderer.registerInputHandlers({
  onKeyDown: (key: string) => {
    console.log('Key pressed:', key);
  },
  
  onClick: (clientX: number, clientY: number) => {
    console.log('Clicked at:', clientX, clientY);
  },
  
  onMouseMove: (clientX: number, clientY: number) => {
    console.log('Mouse moved to:', clientX, clientY);
  }
});

// Get registered handlers to wire to platform
const handlers = renderer.getInputHandlers();
platform.registerInputHandlers(handlers);
```

### Viewport Management

Handle viewport changes (resize):

```typescript
renderer.resize({
  width: newWidth,
  height: newHeight,
  pixelRatio: window.devicePixelRatio
});
```

### Rendering

Execute the render loop:

```typescript
function animate() {
  renderer.render();
  requestAnimationFrame(animate);
}
animate();
```

### Cleanup

Always cleanup when done:

```typescript
renderer.cleanup();
```

This will:
- Dispose WebGPU renderer
- Dispose all materials and geometries
- Dispose camera controls
- Clean up all THREE.js resources

## API Reference

### `createRenderer(config: RendererConfig): Promise<Renderer>`

Factory function that creates a renderer instance.

**Parameters:**
- `config.canvas` - The HTMLCanvasElement to render to
- `config.viewport` - Initial viewport dimensions and pixel ratio
- `config.onCursorChange` - Optional callback when cursor style should change
- `config.onControlsEnableChange` - Optional callback when controls are enabled/disabled

**Returns:** Promise<Renderer> instance

**Example:**
```typescript
const renderer = await createRenderer({
  canvas: document.getElementById('canvas'),
  viewport: { width: 800, height: 600, pixelRatio: 2 }
});
```

### `Renderer.registerInputHandlers(handlers: InputHandlers): void`

Registers callbacks for user input events. The renderer internally handles draw mode logic and can chain additional handlers.

**Parameters:**
- `handlers.onKeyDown` - Optional callback for keyboard events
- `handlers.onClick` - Optional callback for mouse clicks
- `handlers.onMouseMove` - Optional callback for mouse movement

### `Renderer.getInputHandlers(): InputHandlers`

Returns the merged input handlers (internal + registered) to be wired to the platform layer.

**Returns:** InputHandlers object

### `Renderer.resize(viewport: Viewport): void`

Updates the renderer and camera for a new viewport size.

**Parameters:**
- `viewport.width` - New width in pixels
- `viewport.height` - New height in pixels
- `viewport.pixelRatio` - Device pixel ratio

### `Renderer.render(): void`

Executes one frame of rendering. Should be called in the animation loop.

### `Renderer.cleanup(): void`

Disposes all rendering resources including WebGPU renderer, geometries, materials, and controls.

## Implementation Details

### Internal Structure

The renderer internally manages:

1. **WebGPU Renderer** - THREE.WebGPURenderer instance
2. **Scene** - THREE.Scene with dark background
3. **Camera** - PerspectiveCamera positioned at (5, 5, 5)
4. **Lights** - Ambient and directional lights for scene illumination
5. **Controls** - OrbitControls for camera manipulation
6. **Materials** - Preview material (transparent blue) and final material (cream white)
7. **Geometry** - Box geometries created dynamically
8. **Controller State** - Draw mode, raycaster, ground plane, start position

### Draw Mode

The renderer includes integrated draw mode functionality:

- **'D' key** toggles draw mode on/off
- **First click** sets the start position
- **Mouse move** shows a preview box
- **Second click** creates the final box
- **Escape key** cancels the current drawing

When draw mode is active:
- Orbit controls are disabled
- Cursor changes to crosshair
- Raycasting detects ground plane intersections

### Box Creation

Boxes are created between two points on the XZ plane (y=0):
- **Dimensions**: Configurable thickness (0.3) and height (2.75)
- **Positioning**: Midpoint between start and end points, raised by half height
- **Rotation**: Automatically aligned with the direction of drawing
- **Material**: Preview boxes are semi-transparent, final boxes are opaque

### Resource Management

All THREE.js resources are carefully tracked and disposed:
- Geometries are disposed when boxes are removed
- Materials are shared and disposed on cleanup
- Controls are properly disposed
- WebGPU renderer is disposed last

## Future Extensions

The renderer abstraction makes it possible to:

- **Swap Rendering Backends** - Replace THREE.js with Babylon.js, PlayCanvas, etc.
- **Add Rendering Modes** - Wireframe, shadow-only, debug views
- **Extend Geometry Types** - Add circles, polygons, custom shapes
- **Implement LOD** - Level-of-detail for performance optimization
- **Add Post-Processing** - Bloom, SSAO, color grading effects

To extend the renderer, add methods to the `Renderer` interface and implement them using internal THREE.js code.

## Best Practices

1. **Always `await createRenderer()`** - Renderer initialization is async due to WebGPU
2. **Call `cleanup()` when done** - Prevents memory leaks from THREE.js resources
3. **Use primitive types in API** - Never expose THREE.js types to external code
4. **Register input handlers once** - Do it during initialization, not per frame
5. **Call `render()` in animation loop** - Controls and scene are updated internally
6. **Handle viewport changes** - Always call `resize()` when window size changes

## Example: Complete Integration

```typescript
import { createWebPlatform } from './platform';
import { createRenderer } from './renderer';

export async function initRenderer(canvas: HTMLCanvasElement) {
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
```

## Architecture Benefits

### Separation of Concerns
- **Platform Layer** - Handles browser/OS interaction
- **Renderer Layer** - Handles all graphics and THREE.js concerns
- **Orchestration Layer** - Glues layers together with minimal code

### Testability
- Renderer can be tested independently with mock canvases
- No global state or singletons
- Clean dependency injection via config

### Maintainability
- THREE.js updates only affect this layer
- Clear boundaries between subsystems
- Easy to locate and fix rendering bugs

### Flexibility
- Can swap rendering libraries without touching higher layers
- Can add new renderers (e.g., 2D canvas fallback) alongside WebGPU
- Platform-independent graphics code

