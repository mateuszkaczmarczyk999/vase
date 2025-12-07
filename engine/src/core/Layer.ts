import { EventBus } from './EventBus';

/**
 * Layer interface - base abstraction for application layers
 * Layers receive lifecycle callbacks and can subscribe to events via EventBus
 */
export interface Layer {
  readonly name: string;

  /**
   * Called when layer is pushed to the stack
   * Can be async for layers that need initialization
   */
  onAttach(): void | Promise<void>;

  /**
   * Called when layer is popped from the stack
   */
  onDetach(): void;

  /**
   * Called every frame for updates
   * @param deltaTime Time since last frame in seconds
   */
  onUpdate(deltaTime: number): void;

  /**
   * Called for rendering
   */
  onRender(): void;
}

/**
 * Abstract base class for layers providing default implementations
 * Layers can access the EventBus to subscribe to and emit events
 */
export abstract class BaseLayer implements Layer {
  protected eventBus: EventBus;
  protected unsubscribers: (() => void)[] = [];

  constructor(
    public readonly name: string,
    eventBus: EventBus
  ) {
    this.eventBus = eventBus;
  }

  /**
   * Called when layer is attached to the stack
   * Override to initialize resources and subscribe to events
   */
  onAttach(): void {
    // Override in derived classes
  }

  /**
   * Called when layer is detached from the stack
   * Automatically unsubscribes all event listeners
   */
  onDetach(): void {
    // Unsubscribe from all events
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Called every frame for updates
   * Override to implement update logic
   * @param deltaTime Time since last frame in seconds
   */
  onUpdate(deltaTime: number): void {
    // Override in derived classes
  }

  /**
   * Called for rendering
   * Override to implement render logic
   */
  onRender(): void {
    // Override in derived classes
  }

  /**
   * Helper method to subscribe to events and track unsubscribers
   * Automatically cleaned up on detach
   */
  protected subscribe(
    eventType: string,
    callback: (payload: any) => void
  ): void {
    const unsubscribe = this.eventBus.on(eventType as any, callback);
    this.unsubscribers.push(unsubscribe);
  }
}

