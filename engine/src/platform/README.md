# Platform Abstraction Layer

## Overview

The platform directory contains the abstraction layer that isolates all platform-specific dependencies (window, canvas, event listeners) from the core engine logic. This separation enables cleaner code architecture, improved testability, and the potential to support multiple platforms in the future.

## Responsibilities

The platform layer is responsible for:

1. **Viewport Management** - Providing viewport dimensions and pixel ratio, handling window resize events
2. **Input Handling** - Managing keyboard, mouse clicks, and mouse movement events
3. **Cursor Control** - Setting and managing the cursor appearance
4. **Animation Loop** - Managing the requestAnimationFrame loop for rendering
5. **Lifecycle Management** - Properly setting up and tearing down all platform resources

## Architecture

```
platform/
├── types.ts              # Core platform interfaces and types
├── web/
│   └── WebPlatform.ts   # Web browser implementation
└── index.ts             # Public API exports and factory function
```

### Core Interfaces

#### `Platform`
The main interface that all platform implementations must satisfy:

```typescript
interface Platform {
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
```

#### `PlatformConfig`
Configuration object for platform initialization:

```typescript
interface PlatformConfig {
  canvas: HTMLCanvasElement;
}
```

#### `PlatformViewport`
Viewport information structure:

```typescript
interface PlatformViewport {
  width: number;
  height: number;
  pixelRatio: number;
}
```

#### `InputHandler`
Callback interface for handling user input:

```typescript
interface InputHandler {
  onKeyDown?: (key: string) => void;
  onClick?: (clientX: number, clientY: number) => void;
  onMouseMove?: (clientX: number, clientY: number) => void;
}
```

## Usage

### Basic Setup

```typescript
import { createWebPlatform } from './platform';

// Initialize platform with canvas element
const platform = createWebPlatform({ canvas: myCanvasElement });

// Get current viewport information
const viewport = platform.getViewport();
console.log(viewport.width, viewport.height, viewport.pixelRatio);
```

### Input Handling

Register callbacks to handle user input:

```typescript
platform.registerInputHandlers({
  onKeyDown: (key: string) => {
    if (key === 'd' || key === 'D') {
      console.log('Draw mode toggled');
    }
  },
  
  onClick: (clientX: number, clientY: number) => {
    console.log('Clicked at:', clientX, clientY);
  },
  
  onMouseMove: (clientX: number, clientY: number) => {
    console.log('Mouse moved to:', clientX, clientY);
  }
});
```

### Viewport Management

Handle window resize events:

```typescript
platform.onResize((viewport) => {
  camera.aspect = viewport.width / viewport.height;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.width, viewport.height);
});
```

### Cursor Control

Change the cursor appearance:

```typescript
platform.setCursor('crosshair'); // Set cursor to crosshair
platform.setCursor('default');   // Reset to default cursor
```

### Animation Loop

Start the rendering loop:

```typescript
platform.startAnimationLoop(() => {
  // Your render logic here
  controls.update();
  renderer.render(scene, camera);
});
```

### Cleanup

Always dispose the platform when done:

```typescript
platform.dispose();
```

This will:
- Stop the animation loop
- Remove all event listeners
- Clean up all platform resources

## API Reference

### `createWebPlatform(config: PlatformConfig): Platform`

Factory function that creates a web platform instance.

**Parameters:**
- `config.canvas` - The HTMLCanvasElement to use for rendering

**Returns:** Platform instance

**Example:**
```typescript
const platform = createWebPlatform({ canvas: document.getElementById('canvas') });
```

### `Platform.getViewport(): PlatformViewport`

Returns the current viewport dimensions and pixel ratio.

**Returns:** Object containing `width`, `height`, and `pixelRatio`

### `Platform.onResize(callback: (viewport: PlatformViewport) => void): void`

Registers a callback to be called when the window is resized.

**Parameters:**
- `callback` - Function to call with new viewport dimensions

### `Platform.registerInputHandlers(handlers: InputHandler): void`

Registers callbacks for user input events.

**Parameters:**
- `handlers.onKeyDown` - Optional callback for keyboard events, receives key name
- `handlers.onClick` - Optional callback for mouse clicks, receives clientX and clientY
- `handlers.onMouseMove` - Optional callback for mouse movement, receives clientX and clientY

### `Platform.unregisterInputHandlers(): void`

Removes all registered input handlers.

### `Platform.setCursor(cursor: string): void`

Sets the cursor style for the canvas.

**Parameters:**
- `cursor` - CSS cursor value (e.g., 'default', 'crosshair', 'pointer')

### `Platform.startAnimationLoop(callback: () => void): void`

Starts the animation loop using requestAnimationFrame.

**Parameters:**
- `callback` - Function to call on each frame

### `Platform.stopAnimationLoop(): void`

Stops the animation loop.

### `Platform.dispose(): void`

Cleans up all platform resources, stops animation loop, and removes event listeners.

## Implementation Details

### WebPlatform

The `WebPlatform` class is the web browser implementation of the `Platform` interface. It:

- Uses `window.innerWidth/innerHeight` for viewport dimensions
- Uses `window.devicePixelRatio` for pixel density
- Listens to `window` for resize and keyboard events
- Listens to `canvas` for mouse events
- Uses `requestAnimationFrame` for the animation loop
- Properly binds and unbinds all event listeners to prevent memory leaks

### Event Handler Binding

All event handlers are bound to the class instance in the constructor to ensure proper cleanup:

```typescript
this.boundKeyDownHandler = this.handleKeyDown.bind(this);
this.boundClickHandler = this.handleClick.bind(this);
// etc.
```

This allows us to properly remove the exact same function reference when cleaning up.

## Future Extensions

The platform abstraction makes it possible to add support for:

- **Node.js** - Headless rendering for server-side operations
- **Electron** - Desktop applications with custom window management
- **React Native** - Mobile applications
- **Testing** - Mock platforms for automated testing

To add a new platform, implement the `Platform` interface and create a new factory function.

## Best Practices

1. **Always call `dispose()`** when you're done with the platform to prevent memory leaks
2. **Register input handlers once** during initialization, not in render loops
3. **Use the viewport from `getViewport()`** instead of accessing `window` directly
4. **Handle all user input through the platform API** to maintain platform independence
5. **Don't access browser APIs directly** in engine code - use the platform layer

## Example: Complete Integration

```typescript
import { createWebPlatform } from './platform';
import { WebGPURenderer } from 'three/webgpu';

async function initEngine(canvas: HTMLCanvasElement) {
  // Create platform
  const platform = createWebPlatform({ canvas });
  const viewport = platform.getViewport();
  
  // Initialize renderer
  const renderer = new WebGPURenderer({ canvas });
  await renderer.init();
  renderer.setSize(viewport.width, viewport.height);
  renderer.setPixelRatio(viewport.pixelRatio);
  
  // Handle resize
  platform.onResize((viewport) => {
    renderer.setSize(viewport.width, viewport.height);
  });
  
  // Handle input
  platform.registerInputHandlers({
    onKeyDown: (key) => {
      if (key === 'Escape') {
        cleanup();
      }
    }
  });
  
  // Start render loop
  platform.startAnimationLoop(() => {
    renderer.render(scene, camera);
  });
  
  // Cleanup function
  function cleanup() {
    platform.dispose();
    renderer.dispose();
  }
  
  return { cleanup };
}
```

