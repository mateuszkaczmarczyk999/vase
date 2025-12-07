import { Platform, PlatformConfig, PlatformViewport, InputHandler } from '../types';

export class WebPlatform implements Platform {
  readonly canvas: HTMLCanvasElement;
  
  private resizeCallback?: (viewport: PlatformViewport) => void;
  private animationFrameId?: number;
  private animationCallback?: () => void;
  
  private inputHandlers: InputHandler = {};
  private boundKeyDownHandler: (e: KeyboardEvent) => void;
  private boundClickHandler: (e: MouseEvent) => void;
  private boundMouseMoveHandler: (e: MouseEvent) => void;
  private boundResizeHandler: () => void;
  
  constructor(config: PlatformConfig) {
    this.canvas = config.canvas;
    
    // Bind event handlers
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    this.boundClickHandler = this.handleClick.bind(this);
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
    this.boundResizeHandler = this.handleResize.bind(this);
  }
  
  getViewport(): PlatformViewport {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    };
  }
  
  onResize(callback: (viewport: PlatformViewport) => void): void {
    this.resizeCallback = callback;
    window.addEventListener('resize', this.boundResizeHandler);
  }
  
  registerInputHandlers(handlers: InputHandler): void {
    this.inputHandlers = handlers;
    
    if (handlers.onKeyDown) {
      window.addEventListener('keydown', this.boundKeyDownHandler);
    }
    
    if (handlers.onClick) {
      this.canvas.addEventListener('click', this.boundClickHandler);
    }
    
    if (handlers.onMouseMove) {
      this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
    }
  }
  
  unregisterInputHandlers(): void {
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    this.canvas.removeEventListener('click', this.boundClickHandler);
    this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
    this.inputHandlers = {};
  }
  
  setCursor(cursor: string): void {
    this.canvas.style.cursor = cursor;
  }
  
  startAnimationLoop(callback: () => void): void {
    this.animationCallback = callback;
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
    this.unregisterInputHandlers();
    
    if (this.resizeCallback) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.resizeCallback = undefined;
    }
  }
  
  // Private event handlers
  private handleKeyDown(event: KeyboardEvent): void {
    this.inputHandlers.onKeyDown?.(event.key);
  }
  
  private handleClick(event: MouseEvent): void {
    this.inputHandlers.onClick?.(event.clientX, event.clientY);
  }
  
  private handleMouseMove(event: MouseEvent): void {
    this.inputHandlers.onMouseMove?.(event.clientX, event.clientY);
  }
  
  private handleResize(): void {
    this.resizeCallback?.(this.getViewport());
  }
  
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.animationCallback?.();
  };
}

