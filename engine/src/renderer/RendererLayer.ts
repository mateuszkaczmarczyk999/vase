import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DirectionalLight, AmbientLight } from 'three/webgpu';
import { BaseLayer, EventBus, EventType } from '../core';
import type {
  ViewportResizePayload,
  InputKeyDownPayload,
  InputMouseDownPayload,
  InputMouseMovePayload,
  ToggleDrawModePayload,
} from '../core/events';

// Box dimensions constants
const BOX_THICKNESS = 0.3;
const BOX_HEIGHT = 2.75;

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface RendererLayerConfig {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
}

/**
 * RendererLayer - Handles all rendering and drawing logic
 * Communicates via EventBus for decoupled architecture
 */
export class RendererLayer extends BaseLayer {
  private canvas: HTMLCanvasElement;
  private webgpuRenderer!: WebGPURenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  
  private previewMaterial!: THREE.MeshStandardMaterial;
  private boxMaterial!: THREE.MeshStandardMaterial;
  private previewMesh: THREE.Mesh | null = null;
  private createdBoxes: THREE.Mesh[] = [];
  
  // Drawing state
  private drawMode: boolean = false;
  private startPosition: THREE.Vector3 | null = null;
  
  // Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  
  // Viewport state
  private viewport: Viewport;
  
  private initialized: boolean = false;

  constructor(config: RendererLayerConfig, eventBus: EventBus) {
    super('RendererLayer', eventBus);
    this.canvas = config.canvas;
    this.viewport = config.viewport;
  }

  async onAttach(): Promise<void> {
    await this.initialize();
    this.setupEventListeners();
  }

  private async initialize(): Promise<void> {
    // Create WebGPU renderer
    this.webgpuRenderer = new WebGPURenderer({ 
      canvas: this.canvas, 
      antialias: true 
    });
    await this.webgpuRenderer.init();
    
    this.webgpuRenderer.setSize(this.viewport.width, this.viewport.height);
    this.webgpuRenderer.setPixelRatio(this.viewport.pixelRatio);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.viewport.width / this.viewport.height,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Add WebGPU-compatible lights
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Setup orbit controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Create materials
    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.5
    });
    
    this.boxMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f0,
      metalness: 0.3,
      roughness: 0.4
    });

    this.initialized = true;
  }

  private setupEventListeners(): void {
    // Subscribe to viewport resize events
    this.subscribe(EventType.VIEWPORT_RESIZE, (payload: ViewportResizePayload) => {
      this.handleResize(payload);
    });

    // Subscribe to input events
    this.subscribe(EventType.INPUT_KEY_DOWN, (payload: InputKeyDownPayload) => {
      this.handleKeyDown(payload.key);
    });

    this.subscribe(EventType.INPUT_MOUSE_DOWN, (payload: InputMouseDownPayload) => {
      this.handleClick(payload.clientX, payload.clientY);
    });

    this.subscribe(EventType.INPUT_MOUSE_MOVE, (payload: InputMouseMovePayload) => {
      this.handleMouseMove(payload.clientX, payload.clientY);
    });

    // Subscribe to toggle draw mode event
    this.subscribe(EventType.TOGGLE_DRAW_MODE, (payload: ToggleDrawModePayload) => {
      this.toggleDrawMode(payload.enabled);
    });
  }

  onUpdate(deltaTime: number): void {
    if (!this.initialized) return;
    this.controls.update();
  }

  onRender(): void {
    if (!this.initialized) return;
    this.webgpuRenderer.render(this.scene, this.camera);
  }

  onDetach(): void {
    super.onDetach();
    this.cleanup();
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  private handleResize(payload: ViewportResizePayload): void {
    this.viewport = {
      width: payload.width,
      height: payload.height,
      pixelRatio: payload.pixelRatio
    };
    
    this.camera.aspect = this.viewport.width / this.viewport.height;
    this.camera.updateProjectionMatrix();
    this.webgpuRenderer.setSize(this.viewport.width, this.viewport.height);
  }

  private handleKeyDown(key: string): void {
    if (key === 'd' || key === 'D') {
      this.toggleDrawMode();
    }
    
    // Escape to cancel current drawing
    if (key === 'Escape' && this.drawMode && this.startPosition) {
      this.resetDrawState();
      console.log('Drawing cancelled');
    }
  }

  private toggleDrawMode(enabled?: boolean): void {
    // If enabled is provided, use it; otherwise toggle
    this.drawMode = enabled !== undefined ? enabled : !this.drawMode;
    this.controls.enabled = !this.drawMode;
    
    if (this.drawMode) {
      this.eventBus.emit(EventType.CURSOR_CHANGE, { cursor: 'crosshair' });
      console.log('Draw mode enabled');
    } else {
      this.eventBus.emit(EventType.CURSOR_CHANGE, { cursor: 'default' });
      this.resetDrawState();
      console.log('Draw mode disabled');
    }
  }

  private handleClick(clientX: number, clientY: number): void {
    if (!this.drawMode) return;
    
    const position = this.getGroundPosition(clientX, clientY);
    if (!position) return;
    
    if (!this.startPosition) {
      // First click - set start position
      this.startPosition = position.clone();
      console.log('Start position set:', this.startPosition);
    } else {
      // Second click - create final box
      this.createFinalBox(this.startPosition, position);
      // Clear the preview before starting the next wall
      this.clearPreview();
      // Set the end position as the new start position for continuous drawing
      this.startPosition = position.clone();
      console.log('Box created, continuing from endpoint');
    }
  }

  private handleMouseMove(clientX: number, clientY: number): void {
    if (!this.drawMode || !this.startPosition) return;
    
    const position = this.getGroundPosition(clientX, clientY);
    if (position) {
      this.updatePreviewBox(this.startPosition, position);
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private getGroundPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    this.mouse.x = (clientX / this.viewport.width) * 2 - 1;
    this.mouse.y = -(clientY / this.viewport.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersectPoint = new THREE.Vector3();
    const intersected = this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    
    return intersected ? intersectPoint : null;
  }

  private updatePreviewBox(start: THREE.Vector3, end: THREE.Vector3): void {
    // Calculate length (distance between start and end on XZ plane)
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    // Calculate rotation angle to align box with the line
    const angle = Math.atan2(dz, dx);
    
    // Remove existing preview
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
    }
    
    // Create new preview geometry
    const previewGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    this.previewMesh = new THREE.Mesh(previewGeometry, this.previewMaterial);
    
    // Position at midpoint between start and end, raised by half height
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    this.previewMesh.position.set(midX, BOX_HEIGHT / 2, midZ);
    
    // Rotate to align with the direction
    this.previewMesh.rotation.y = -angle;
    
    this.scene.add(this.previewMesh);
  }

  private createFinalBox(start: THREE.Vector3, end: THREE.Vector3): void {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    const angle = Math.atan2(dz, dx);
    
    const boxGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    const box = new THREE.Mesh(boxGeometry, this.boxMaterial.clone());
    
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    box.position.set(midX, BOX_HEIGHT / 2, midZ);
    box.rotation.y = -angle;
    
    this.scene.add(box);
    this.createdBoxes.push(box);
  }

  private clearPreview(): void {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      this.previewMesh = null;
    }
  }

  private resetDrawState(): void {
    this.clearPreview();
    this.startPosition = null;
  }

  private cleanup(): void {
    if (!this.initialized) return;

    this.controls.dispose();
    this.previewMaterial.dispose();
    this.boxMaterial.dispose();
    
    // Dispose preview mesh if exists
    if (this.previewMesh) {
      this.previewMesh.geometry.dispose();
    }
    
    // Dispose all created boxes
    this.createdBoxes.forEach(box => {
      box.geometry.dispose();
      if (box.material instanceof THREE.Material) {
        box.material.dispose();
      }
    });
    
    this.webgpuRenderer.dispose();
  }
}

