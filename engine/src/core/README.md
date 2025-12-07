# Core Layer

## Overview

The core directory contains the foundational architecture of the VASE engine, implementing an event-driven layer system inspired by [TheCherno's game engine architecture](https://github.com/TheCherno/Architecture). This layer provides the essential building blocks for decoupled communication and modular organization of engine subsystems.

## Philosophy

The core layer embodies key architectural principles:

- **Event-Driven Communication** - Components communicate through events, not direct references
- **Layered Architecture** - Application logic is organized into stackable, independent layers
- **Decoupling** - Platform, Renderer, and future systems (Physics, Audio, UI) remain independent
- **Type Safety** - Full TypeScript type checking on all events and interfaces
- **Testability** - Each layer can be tested in isolation by mocking the EventBus

## Responsibilities

The core layer is responsible for:

1. **Event Management** - Centralized pub/sub system for type-safe event dispatching
2. **Layer Lifecycle** - Managing the lifecycle of application layers (attach, detach, update, render)
3. **Layer Organization** - Maintaining a stack of layers with support for overlays
4. **Time Management** - Providing delta time calculations for frame-independent updates
5. **Architectural Foundation** - Establishing patterns that keep the engine modular and scalable

## Architecture

```
core/
├── EventBus.ts      # Pub/sub event system with type safety
├── events.ts        # Event type definitions and payload interfaces
├── Layer.ts         # Layer interface and BaseLayer abstract class
├── LayerStack.ts    # Layer management and lifecycle orchestration
├── types.ts         # Core types (Timestep, Time)
├── index.ts         # Public API exports
└── README.md        # This file
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         EventBus                            │
│              (Central Communication Hub)                    │
└─────────────────────────────────────────────────────────────┘
                           ↑ ↓
           ┌───────────────┴─┴───────────────┐
           │         LayerStack              │
           │  ┌──────────────────────────┐   │
           │  │  RendererLayer           │   │
           │  │  (rendering & drawing)   │   │
           │  ├──────────────────────────┤   │
           │  │  PhysicsLayer (future)   │   │
           │  ├──────────────────────────┤   │
           │  │  AudioLayer (future)     │   │
           │  └──────────────────────────┘   │
           └─────────────────────────────────┘
                           ↑ ↓
           ┌───────────────┴─┴───────────────┐
           │       WebPlatform               │
           │  (DOM events → EventBus)        │
           └─────────────────────────────────┘
```

## Core Components

### EventBus

A type-safe pub/sub event system that enables decoupled communication between engine components.

**Interface:**

```typescript
class EventBus {
  // Subscribe to events
  on<T>(eventType: T, callback: EventCallback<T>): () => void;
  once<T>(eventType: T, callback: EventCallback<T>): () => void;
  
  // Unsubscribe
  off<T>(eventType: T, callback: EventCallback<T>): void;
  
  // Emit events
  emit<T>(eventType: T, payload: EventPayload<T>): void;
  
  // Utilities
  clear(): void;
  listenerCount(eventType: string): number;
}
```

**Features:**

- Type-safe event payloads using TypeScript generics
- Automatic error handling in event listeners
- Support for one-time subscriptions with `once()`
- Unsubscribe functions returned from `on()` and `once()`
- Category-based event filtering (future)

### Event System

Predefined event types for engine-wide communication:

```typescript
const EventType = {
  // Platform events
  VIEWPORT_RESIZE: 'VIEWPORT_RESIZE',
  ANIMATION_FRAME: 'ANIMATION_FRAME',
  
  // Input events
  INPUT_KEY_DOWN: 'INPUT_KEY_DOWN',
  INPUT_MOUSE_DOWN: 'INPUT_MOUSE_DOWN',
  INPUT_MOUSE_MOVE: 'INPUT_MOUSE_MOVE',
  
  // Renderer events
  CURSOR_CHANGE: 'CURSOR_CHANGE',
};
```

**Event Payloads:**

Each event type has a corresponding payload interface:

```typescript
interface ViewportResizePayload {
  width: number;
  height: number;
  pixelRatio: number;
}

interface InputKeyDownPayload {
  key: string;
}

interface InputMouseDownPayload {
  clientX: number;
  clientY: number;
  button: number;
}
```

### Layer System

Layers are modular, stackable components that encapsulate specific functionality.

**Layer Interface:**

```typescript
interface Layer {
  readonly name: string;
  
  onAttach(): void | Promise<void>;  // Called when added to stack
  onDetach(): void;                   // Called when removed from stack
  onUpdate(deltaTime: number): void;  // Called every frame
  onRender(): void;                   // Called for rendering
}
```

**BaseLayer:**

Abstract base class providing common layer functionality:

```typescript
abstract class BaseLayer implements Layer {
  constructor(name: string, eventBus: EventBus);
  
  // Automatic cleanup of event subscriptions on detach
  protected subscribe(eventType: string, callback: Function): void;
  
  // Override these in derived classes
  onAttach(): void | Promise<void>;
  onDetach(): void;
  onUpdate(deltaTime: number): void;
  onRender(): void;
}
```

**Example Layer:**

```typescript
class RendererLayer extends BaseLayer {
  constructor(config: RendererConfig, eventBus: EventBus) {
    super('RendererLayer', eventBus);
  }
  
  async onAttach(): Promise<void> {
    // Initialize resources
    await this.initializeRenderer();
    
    // Subscribe to events (auto-cleaned up on detach)
    this.subscribe(EventType.INPUT_KEY_DOWN, (payload) => {
      this.handleKeyDown(payload.key);
    });
    
    this.subscribe(EventType.VIEWPORT_RESIZE, (payload) => {
      this.handleResize(payload);
    });
  }
  
  onUpdate(deltaTime: number): void {
    // Update logic (e.g., controls)
  }
  
  onRender(): void {
    // Rendering logic
  }
  
  onDetach(): void {
    super.onDetach(); // Automatically unsubscribes all events
    // Additional cleanup
  }
}
```

### LayerStack

Manages the collection of layers and their lifecycle.

**Interface:**

```typescript
class LayerStack {
  // Layer management
  async pushLayer(layer: Layer): Promise<void>;
  async pushOverlay(overlay: Layer): Promise<void>;
  popLayer(layer: Layer): void;
  popOverlay(overlay: Layer): void;
  
  // Lifecycle
  update(deltaTime: number): void;  // Updates all layers
  render(): void;                   // Renders all layers
  
  // Utilities
  getLayers(): readonly Layer[];
  getLayerCount(): number;
  clear(): void;
}
```

**Layer Ordering:**

- Regular layers are inserted at the bottom
- Overlays are always on top
- Updates and renders propagate from bottom to top
- Events can propagate top to bottom (future feature)

### Time Management

**Timestep Interface:**

```typescript
interface Timestep {
  getSeconds(): number;
  getMilliseconds(): number;
}
```

**Time Class:**

```typescript
class Time implements Timestep {
  static fromSeconds(seconds: number): Time;
  static fromMilliseconds(ms: number): Time;
  
  getSeconds(): number;
  getMilliseconds(): number;
  setTime(time: number): void;
}
```

## Usage

### Basic Setup

```typescript
import { EventBus, LayerStack } from './core';
import { RendererLayer } from './renderer';
import { createWebPlatform } from './platform';

// Create core components
const eventBus = new EventBus();
const layerStack = new LayerStack();

// Create platform (emits events)
const platform = createWebPlatform({ canvas, eventBus });

// Create and add layers
const rendererLayer = new RendererLayer(config, eventBus);
await layerStack.pushLayer(rendererLayer);

// Start animation loop
platform.startAnimationLoop((deltaTime) => {
  layerStack.update(deltaTime);
  layerStack.render();
});
```

### Creating Custom Events

```typescript
// 1. Define event type constant
const EventType = {
  PHYSICS_COLLISION: 'PHYSICS_COLLISION',
};

// 2. Define payload interface
interface PhysicsCollisionPayload {
  objectA: string;
  objectB: string;
  force: number;
}

// 3. Emit event
eventBus.emit(EventType.PHYSICS_COLLISION, {
  objectA: 'box1',
  objectB: 'box2',
  force: 42.5
});

// 4. Subscribe to event
eventBus.on(EventType.PHYSICS_COLLISION, (payload) => {
  console.log(`Collision: ${payload.objectA} hit ${payload.objectB}`);
});
```

### Creating Custom Layers

```typescript
class PhysicsLayer extends BaseLayer {
  private world: PhysicsWorld;
  
  constructor(eventBus: EventBus) {
    super('PhysicsLayer', eventBus);
  }
  
  onAttach(): void {
    // Initialize physics world
    this.world = new PhysicsWorld();
    
    // Subscribe to events
    this.subscribe(EventType.INPUT_MOUSE_DOWN, (payload) => {
      this.applyForceAtPoint(payload.clientX, payload.clientY);
    });
  }
  
  onUpdate(deltaTime: number): void {
    // Step physics simulation
    this.world.step(deltaTime);
    
    // Emit collision events
    for (const collision of this.world.getCollisions()) {
      this.eventBus.emit(EventType.PHYSICS_COLLISION, collision);
    }
  }
  
  onRender(): void {
    // Physics layer typically doesn't render
    // But could draw debug visualizations
  }
  
  onDetach(): void {
    super.onDetach(); // Unsubscribes events
    this.world.cleanup();
  }
}

// Usage
const physicsLayer = new PhysicsLayer(eventBus);
await layerStack.pushLayer(physicsLayer);
```

### Event Subscription Patterns

```typescript
// Pattern 1: Auto-cleanup (recommended in layers)
class MyLayer extends BaseLayer {
  onAttach(): void {
    this.subscribe(EventType.INPUT_KEY_DOWN, this.handleKeyDown);
    // Automatically unsubscribed on detach
  }
}

// Pattern 2: Manual unsubscribe
const unsubscribe = eventBus.on(EventType.VIEWPORT_RESIZE, handleResize);
// Later...
unsubscribe();

// Pattern 3: One-time subscription
eventBus.once(EventType.ANIMATION_FRAME, (payload) => {
  console.log('First frame!');
});
```

### Layer Stack Management

```typescript
// Add regular layers
await layerStack.pushLayer(rendererLayer);
await layerStack.pushLayer(physicsLayer);

// Add overlays (always on top)
await layerStack.pushOverlay(uiLayer);
await layerStack.pushOverlay(debugLayer);

// Stack order: [renderer, physics, ui, debug]
// Updates/renders in that order

// Remove layers
layerStack.popLayer(physicsLayer);
layerStack.popOverlay(debugLayer);

// Clear all layers
layerStack.clear();
```

## Design Patterns

### 1. Observer Pattern (EventBus)
Components observe events without knowing about event emitters.

### 2. Layer Pattern (TheCherno)
Modular organization inspired by game engine architecture.

### 3. Dependency Injection
Layers receive EventBus through constructor, not global singletons.

### 4. Template Method
BaseLayer provides template with hooks for subclasses.

## Benefits

1. **Decoupling** - Components don't know about each other, only events
2. **Extensibility** - Add new layers without modifying existing code
3. **Testability** - Mock EventBus to test layers in isolation
4. **Organization** - Clear separation of concerns
5. **Scalability** - Easy to add new systems (physics, audio, networking)
6. **Type Safety** - Compile-time checking of event payloads
7. **Debugging** - Can log all events flowing through the system

## Future Enhancements

- **Event Categories** - Filter events by category (Input, Application, etc.)
- **Event Handlers** - Layers can mark events as handled to stop propagation
- **Priority System** - Control layer update/render order
- **Layer Groups** - Organize related layers together
- **Event History** - Record and replay events for debugging
- **Async Events** - Queue events for next frame processing
- **Event Filters** - Transform or filter events before delivery

## References

- [TheCherno's Architecture Repository](https://github.com/TheCherno/Architecture)
- [Game Engine Architecture by Jason Gregory](https://www.gameenginebook.com/)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [Layer Pattern in Game Engines](https://gameprogrammingpatterns.com/update-method.html)

