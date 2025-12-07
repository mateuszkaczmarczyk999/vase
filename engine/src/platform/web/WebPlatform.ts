import { Platform, PlatformConfig, PlatformViewport } from '../types';
import { EventBus, EventType } from '../../core';

export class WebPlatform implements Platform {
  readonly canvas: HTMLCanvasElement;
  private eventBus: EventBus;
  
  private animationFrameId?: number;
  private animationCallback?: (deltaTime: number) => void;
  private lastFrameTime: number = 0;
  
  private boundKeyDownHandler: (e: KeyboardEvent) => void;
  private boundClickHandler: (e: MouseEvent) => void;
  private boundMouseMoveHandler: (e: MouseEvent) => void;
  private boundResizeHandler: () => void;
  private boundContextMenuHandler: (e: MouseEvent) => void;
  
  constructor(config: PlatformConfig) {
    this.canvas = config.canvas;
    this.eventBus = config.eventBus;
    
    // Bind event handlers
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
    this.boundResizeHandler = this.handleResize.bind(this);
    this.boundContextMenuHandler = this.handleContextMenu.bind(this);
    
    // Setup input event listeners
    this.setupInputListeners();
    
    // Setup resize listener
    window.addEventListener('resize', this.boundResizeHandler);
    
    // Subscribe to cursor change events
    this.eventBus.on(EventType.CURSOR_CHANGE, (payload) => {
      this.setCursor(payload.cursor);
    });
  }
  
  private setupInputListeners(): void {
    window.addEventListener('keydown', this.boundKeyDownHandler);
    this.canvas.addEventListener('mousedown', this.boundClickHandler);
    this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
    this.canvas.addEventListener('contextmenu', this.boundContextMenuHandler);
  }
  
  getViewport(): PlatformViewport {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    };
  }
  
  private setCursor(cursor: string): void {
    this.canvas.style.cursor = cursor;
  }
  
  startAnimationLoop(callback: (deltaTime: number) => void): void {
    this.animationCallback = callback;
    this.lastFrameTime = performance.now();
    this.animate();
  }
  
  stopAnimationLoop(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
  
  dispose(): void {
    this.stopAnimationLoop();
    
    // Remove input listeners
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    this.canvas.removeEventListener('mousedown', this.boundClickHandler);
    this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenuHandler);
    
    // Remove resize listener
    window.removeEventListener('resize', this.boundResizeHandler);
  }
  
  // Private event handlers - emit events to EventBus
  private handleKeyDown(event: KeyboardEvent): void {
    this.eventBus.emit(EventType.INPUT_KEY_DOWN, {
      key: event.key
    });
  }
  
  private handleClick(event: MouseEvent): void {
    this.eventBus.emit(EventType.INPUT_MOUSE_DOWN, {
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button
    });
  }
  
  private handleMouseMove(event: MouseEvent): void {
    this.eventBus.emit(EventType.INPUT_MOUSE_MOVE, {
      clientX: event.clientX,
      clientY: event.clientY
    });
  }
  
  private handleContextMenu(event: MouseEvent): void {
    // Prevent context menu from appearing on canvas
    event.preventDefault();
  }
  
  private handleResize(): void {
    const viewport = this.getViewport();
    this.eventBus.emit(EventType.VIEWPORT_RESIZE, viewport);
  }
  
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;
    
    // Emit animation frame event
    this.eventBus.emit(EventType.ANIMATION_FRAME, {
      deltaTime,
      timestamp: currentTime
    });
    
    // Call the animation callback
    this.animationCallback?.(deltaTime);
  };
}

