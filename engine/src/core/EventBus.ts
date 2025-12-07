import { EventTypeValue, EventPayloadMap, Event } from './events';

export type EventCallback<T extends EventTypeValue> = (
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown
) => void;

type AnyEventCallback = EventCallback<any>;

export class EventBus {
  private listeners: Map<EventTypeValue, AnyEventCallback[]> = new Map();
  private onceListeners: Map<EventTypeValue, AnyEventCallback[]> = new Map();

  /**
   * Subscribe to an event type
   * @param eventType The event type to listen for
   * @param callback The callback to execute when event is emitted
   * @returns Unsubscribe function
   */
  on<T extends EventTypeValue>(
    eventType: T,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => this.off(eventType, callback);
  }

  /**
   * Subscribe to an event type (fires only once)
   * @param eventType The event type to listen for
   * @param callback The callback to execute when event is emitted
   * @returns Unsubscribe function
   */
  once<T extends EventTypeValue>(
    eventType: T,
    callback: EventCallback<T>
  ): () => void {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, []);
    }
    this.onceListeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => this.offOnce(eventType, callback);
  }

  /**
   * Unsubscribe from an event type
   * @param eventType The event type to stop listening for
   * @param callback The callback to remove
   */
  off<T extends EventTypeValue>(
    eventType: T,
    callback: EventCallback<T>
  ): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Unsubscribe from a once listener
   * @param eventType The event type to stop listening for
   * @param callback The callback to remove
   */
  private offOnce<T extends EventTypeValue>(
    eventType: T,
    callback: EventCallback<T>
  ): void {
    const callbacks = this.onceListeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event synchronously
   * @param eventType The event type to emit
   * @param payload The event payload
   */
  emit<T extends EventTypeValue>(
    eventType: T,
    payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown
  ): void {
    const timestamp = performance.now();

    // Call regular listeners
    const callbacks = this.listeners.get(eventType) || [];
    for (const callback of callbacks) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    }

    // Call once listeners and remove them
    const onceCallbacks = this.onceListeners.get(eventType);
    if (onceCallbacks && onceCallbacks.length > 0) {
      // Create a copy to avoid modification during iteration
      const callbacksCopy = [...onceCallbacks];
      this.onceListeners.set(eventType, []);

      for (const callback of callbacksCopy) {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in once event listener for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Clear all listeners for a specific event type
   * @param eventType The event type to clear listeners for
   */
  clearEvent(eventType: EventTypeValue): void {
    this.listeners.delete(eventType);
    this.onceListeners.delete(eventType);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Get the number of listeners for an event type
   * @param eventType The event type to check
   * @returns Number of listeners
   */
  listenerCount(eventType: EventTypeValue): number {
    const regular = this.listeners.get(eventType)?.length || 0;
    const once = this.onceListeners.get(eventType)?.length || 0;
    return regular + once;
  }
}
