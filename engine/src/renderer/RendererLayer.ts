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
      this.handleClick(payload.clientX, payload.clientY, payload.button);
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

  private handleClick(clientX: number, clientY: number, button: number): void {
    if (!this.drawMode) return;
    
    // Right-click (button 2) exits draw mode
    if (button === 2) {
      this.toggleDrawMode(false);
      return;
    }
    
    // Only handle left-clicks (button 0) for drawing
    if (button !== 0) return;
    
    const position = this.getGroundPosition(clientX, clientY);
    if (!position) return;
    
    if (!this.startPosition) {
      // First click - set start position
      this.startPosition = position.clone();
      console.log('Start position set:', this.startPosition);
    } else {
      // Second click - create final box
      const snappedEnd = this.createFinalBox(this.startPosition, position);
      // Clear the preview before starting the next wall
      this.clearPreview();
      // Set the snapped end position as the new start position for continuous drawing
      if (snappedEnd) {
        this.startPosition = snappedEnd.clone();
        console.log('Box created, continuing from endpoint');
      } else {
        // If wall creation failed (intersection), keep the current start position
        console.log('Wall creation failed, keeping current start position');
      }
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

  private checkWallIntersection(start: THREE.Vector3, end: THREE.Vector3): boolean {
    // Get the new wall's corners as a rectangle
    const newWallCorners = this.getWallCorners(start, end);
    
    // Check against all existing walls
    for (const existingBox of this.createdBoxes) {
      // Extract start and end points from the existing box
      const boxStart = this.getBoxStartPoint(existingBox);
      const boxEnd = this.getBoxEndPoint(existingBox);
      
      // Allow walls that share endpoints (connected walls)
      if (this.pointsAreEqual(start, boxStart) || this.pointsAreEqual(start, boxEnd) ||
          this.pointsAreEqual(end, boxStart) || this.pointsAreEqual(end, boxEnd)) {
        continue; // Skip intersection check for connected walls
      }
      
      const existingWallCorners = this.getWallCorners(boxStart, boxEnd);
      
      // Check if the two rectangles (walls) intersect using SAT
      if (this.rectanglesIntersect(newWallCorners, existingWallCorners)) {
        return true;
      }
    }
    
    return false;
  }

  private pointsAreEqual(p1: THREE.Vector3, p2: THREE.Vector3, tolerance: number = 0.001): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && 
           Math.abs(p1.z - p2.z) < tolerance;
  }

  private getBoxStartPoint(box: THREE.Mesh): THREE.Vector3 {
    const geometry = box.geometry as THREE.BoxGeometry;
    const length = geometry.parameters.width;
    const halfLength = length / 2;
    const angle = -box.rotation.y; // Negate because we negated it when creating
    
    // Calculate start point (move half length backwards from center)
    const startX = box.position.x - halfLength * Math.cos(angle);
    const startZ = box.position.z - halfLength * Math.sin(angle);
    
    return new THREE.Vector3(startX, 0, startZ);
  }

  private getBoxEndPoint(box: THREE.Mesh): THREE.Vector3 {
    const geometry = box.geometry as THREE.BoxGeometry;
    const length = geometry.parameters.width;
    const halfLength = length / 2;
    const angle = -box.rotation.y;
    
    // Calculate end point (move half length forwards from center)
    const endX = box.position.x + halfLength * Math.cos(angle);
    const endZ = box.position.z + halfLength * Math.sin(angle);
    
    return new THREE.Vector3(endX, 0, endZ);
  }

  private getWallCorners(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector2[] {
    // Calculate the direction vector
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.001) {
      // Degenerate case, return a point
      return [
        new THREE.Vector2(start.x, start.z),
        new THREE.Vector2(start.x, start.z),
        new THREE.Vector2(start.x, start.z),
        new THREE.Vector2(start.x, start.z)
      ];
    }
    
    // Normalized direction
    const dirX = dx / length;
    const dirZ = dz / length;
    
    // Perpendicular direction (for thickness)
    const perpX = -dirZ;
    const perpZ = dirX;
    
    const halfThickness = BOX_THICKNESS / 2;
    
    // Calculate 4 corners of the rectangle
    const corners = [
      new THREE.Vector2(
        start.x + perpX * halfThickness,
        start.z + perpZ * halfThickness
      ),
      new THREE.Vector2(
        start.x - perpX * halfThickness,
        start.z - perpZ * halfThickness
      ),
      new THREE.Vector2(
        end.x - perpX * halfThickness,
        end.z - perpZ * halfThickness
      ),
      new THREE.Vector2(
        end.x + perpX * halfThickness,
        end.z + perpZ * halfThickness
      )
    ];
    
    return corners;
  }

  private rectanglesIntersect(rect1: THREE.Vector2[], rect2: THREE.Vector2[]): boolean {
    // Use Separating Axis Theorem (SAT) for oriented rectangle collision
    const axes = [
      // Axes from rect1
      this.getEdgeNormal(rect1[0], rect1[1]),
      this.getEdgeNormal(rect1[1], rect1[2]),
      // Axes from rect2
      this.getEdgeNormal(rect2[0], rect2[1]),
      this.getEdgeNormal(rect2[1], rect2[2])
    ];
    
    for (const axis of axes) {
      const projection1 = this.projectRectangle(rect1, axis);
      const projection2 = this.projectRectangle(rect2, axis);
      
      // Check if projections overlap
      if (projection1.max < projection2.min || projection2.max < projection1.min) {
        return false; // Found separating axis, no intersection
      }
    }
    
    return true; // No separating axis found, rectangles intersect
  }

  private getEdgeNormal(p1: THREE.Vector2, p2: THREE.Vector2): THREE.Vector2 {
    const edge = new THREE.Vector2(p2.x - p1.x, p2.y - p1.y);
    // Return perpendicular (normal)
    return new THREE.Vector2(-edge.y, edge.x).normalize();
  }

  private projectRectangle(rect: THREE.Vector2[], axis: THREE.Vector2): { min: number; max: number } {
    let min = rect[0].dot(axis);
    let max = min;
    
    for (let i = 1; i < rect.length; i++) {
      const projection = rect[i].dot(axis);
      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }
    
    return { min, max };
  }

  private getGroundPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    this.mouse.x = (clientX / this.viewport.width) * 2 - 1;
    this.mouse.y = -(clientY / this.viewport.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersectPoint = new THREE.Vector3();
    const intersected = this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    
    if (intersected) {
      // Snap to 0.01 unit grid
      intersectPoint.x = Math.round(intersectPoint.x / 0.01) * 0.01;
      intersectPoint.z = Math.round(intersectPoint.z / 0.01) * 0.01;
    }
    
    return intersected ? intersectPoint : null;
  }

  private updatePreviewBox(start: THREE.Vector3, end: THREE.Vector3): void {
    // Calculate length (distance between start and end on XZ plane)
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    // Calculate rotation angle to align box with the line
    let angle = Math.atan2(dz, dx);
    
    // Snap angle to 45-degree increments
    const angleInDegrees = angle * (180 / Math.PI);
    const snappedAngleDegrees = Math.round(angleInDegrees / 45) * 45;
    const snappedAngle = snappedAngleDegrees * (Math.PI / 180);
    
    // Recalculate end point based on snapped angle while preserving length
    const snappedEnd = new THREE.Vector3(
      start.x + length * Math.cos(snappedAngle),
      end.y,
      start.z + length * Math.sin(snappedAngle)
    );
    
    // Remove existing preview
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
    }
    
    // Create new preview geometry
    const previewGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    this.previewMesh = new THREE.Mesh(previewGeometry, this.previewMaterial);
    
    // Position at midpoint between start and snapped end, raised by half height
    const midX = (start.x + snappedEnd.x) / 2;
    const midZ = (start.z + snappedEnd.z) / 2;
    this.previewMesh.position.set(midX, BOX_HEIGHT / 2, midZ);
    
    // Rotate to align with the direction
    this.previewMesh.rotation.y = -snappedAngle;
    
    this.scene.add(this.previewMesh);
  }

  private createFinalBox(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 | null {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return null; // Don't create tiny boxes
    
    let angle = Math.atan2(dz, dx);
    
    // Snap angle to 45-degree increments
    const angleInDegrees = angle * (180 / Math.PI);
    const snappedAngleDegrees = Math.round(angleInDegrees / 45) * 45;
    const snappedAngle = snappedAngleDegrees * (Math.PI / 180);
    
    // Recalculate end point based on snapped angle while preserving length
    const snappedEnd = new THREE.Vector3(
      start.x + length * Math.cos(snappedAngle),
      end.y,
      start.z + length * Math.sin(snappedAngle)
    );
    
    // Check for intersection with existing walls
    if (this.checkWallIntersection(start, snappedEnd)) {
      console.warn('Cannot create wall: intersects with existing wall');
      return null;
    }
    
    const boxGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    const box = new THREE.Mesh(boxGeometry, this.boxMaterial.clone());
    
    const midX = (start.x + snappedEnd.x) / 2;
    const midZ = (start.z + snappedEnd.z) / 2;
    box.position.set(midX, BOX_HEIGHT / 2, midZ);
    box.rotation.y = -snappedAngle;
    
    this.scene.add(box);
    this.createdBoxes.push(box);
    
    return snappedEnd;
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

