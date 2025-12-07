// Event type constants
export const EventType = {
  // Platform events
  VIEWPORT_RESIZE: 'VIEWPORT_RESIZE',
  ANIMATION_FRAME: 'ANIMATION_FRAME',
  
  // Input events
  INPUT_KEY_DOWN: 'INPUT_KEY_DOWN',
  INPUT_MOUSE_DOWN: 'INPUT_MOUSE_DOWN',
  INPUT_MOUSE_MOVE: 'INPUT_MOUSE_MOVE',
  
  // Renderer events
  CURSOR_CHANGE: 'CURSOR_CHANGE',
  TOGGLE_DRAW_MODE: 'TOGGLE_DRAW_MODE',
} as const;

export type EventTypeKey = keyof typeof EventType;
export type EventTypeValue = typeof EventType[EventTypeKey];

// Event payload interfaces
export interface ViewportResizePayload {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface AnimationFramePayload {
  deltaTime: number;
  timestamp: number;
}

export interface InputKeyDownPayload {
  key: string;
}

export interface InputMouseDownPayload {
  clientX: number;
  clientY: number;
  button: number;
}

export interface InputMouseMovePayload {
  clientX: number;
  clientY: number;
}

export interface CursorChangePayload {
  cursor: string;
}

export interface ToggleDrawModePayload {
  enabled?: boolean; // Optional - if not provided, it will toggle
}

// Event payload type map for type safety
export interface EventPayloadMap {
  [EventType.VIEWPORT_RESIZE]: ViewportResizePayload;
  [EventType.ANIMATION_FRAME]: AnimationFramePayload;
  [EventType.INPUT_KEY_DOWN]: InputKeyDownPayload;
  [EventType.INPUT_MOUSE_DOWN]: InputMouseDownPayload;
  [EventType.INPUT_MOUSE_MOVE]: InputMouseMovePayload;
  [EventType.CURSOR_CHANGE]: CursorChangePayload;
  [EventType.TOGGLE_DRAW_MODE]: ToggleDrawModePayload;
}

// Generic event interface
export interface Event<T extends EventTypeValue = EventTypeValue> {
  type: T;
  payload: T extends keyof EventPayloadMap ? EventPayloadMap[T] : unknown;
  timestamp: number;
}

