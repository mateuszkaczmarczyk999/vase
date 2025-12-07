import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DirectionalLight, AmbientLight } from 'three/webgpu';

// Box dimensions constants
const BOX_THICKNESS = 0.3;
const BOX_HEIGHT = 2.75;

// Primitive types for external API (no THREE.js exposure)
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface InputHandlers {
  onKeyDown?: (key: string) => void;
  onClick?: (clientX: number, clientY: number) => void;
  onMouseMove?: (clientX: number, clientY: number) => void;
}

export interface Renderer {
  registerInputHandlers(handlers: InputHandlers): void;
  getInputHandlers(): InputHandlers;
  resize(viewport: Viewport): void;
  render(): void;
  cleanup(): void;
}

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  onCursorChange?: (cursor: string) => void;
  onControlsEnableChange?: (enabled: boolean) => void;
}

export async function createRenderer(config: RendererConfig): Promise<Renderer> {
  const { canvas, viewport, onCursorChange, onControlsEnableChange } = config;

  // Create WebGPU renderer
  const webgpuRenderer = new WebGPURenderer({ canvas, antialias: true });
  await webgpuRenderer.init();
  
  webgpuRenderer.setSize(viewport.width, viewport.height);
  webgpuRenderer.setPixelRatio(viewport.pixelRatio);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75,
    viewport.width / viewport.height,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  // Add WebGPU-compatible lights
  const ambientLight = new AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Setup orbit controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);
  controls.update();

  // Material for preview box (semi-transparent)
  const previewMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0.5
  });
  
  // Material for final boxes
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    metalness: 0.3,
    roughness: 0.4
  });

  // Store preview mesh and created boxes
  let previewMesh: THREE.Mesh | null = null;
  const createdBoxes: THREE.Mesh[] = [];

  // ==========================================
  // CONTROLLER STATE (integrated into renderer)
  // ==========================================
  let drawMode = false;
  let startPosition: THREE.Vector3 | null = null;
  
  // Raycaster for mouse position to world coordinates
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Invisible ground plane for raycasting (XZ plane at y=0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Input handlers
  let inputHandlers: InputHandlers = {};

  // ==========================================
  // INTERNAL HELPER FUNCTIONS
  // ==========================================

  // Get world position from mouse coordinates on the ground plane
  function getGroundPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    mouse.x = (clientX / viewport.width) * 2 - 1;
    mouse.y = -(clientY / viewport.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersectPoint = new THREE.Vector3();
    const intersected = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    return intersected ? intersectPoint : null;
  }

  // Update or create preview box between start and end position
  function updatePreviewBox(start: THREE.Vector3, end: THREE.Vector3): void {
    // Calculate length (distance between start and end on XZ plane)
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    // Calculate rotation angle to align box with the line
    const angle = Math.atan2(dz, dx);
    
    // Remove existing preview
    if (previewMesh) {
      scene.remove(previewMesh);
      previewMesh.geometry.dispose();
    }
    
    // Create new preview geometry
    const previewGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    
    // Position at midpoint between start and end, raised by half height
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    previewMesh.position.set(midX, BOX_HEIGHT / 2, midZ);
    
    // Rotate to align with the direction
    previewMesh.rotation.y = -angle;
    
    scene.add(previewMesh);
  }

  // Create final box and add to scene
  function createFinalBox(start: THREE.Vector3, end: THREE.Vector3): void {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    const angle = Math.atan2(dz, dx);
    
    const boxGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());
    
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    box.position.set(midX, BOX_HEIGHT / 2, midZ);
    box.rotation.y = -angle;
    
    scene.add(box);
    createdBoxes.push(box);
  }

  // Clear preview mesh
  function clearPreview(): void {
    if (previewMesh) {
      scene.remove(previewMesh);
      previewMesh.geometry.dispose();
      previewMesh = null;
    }
  }

  // Reset draw state
  function resetDrawState(): void {
    clearPreview();
    startPosition = null;
  }

  // ==========================================
  // INPUT HANDLING (integrated into renderer)
  // ==========================================

  function handleKeyDown(key: string): void {
    if (key === 'd' || key === 'D') {
      drawMode = !drawMode;
      controls.enabled = !drawMode;
      
      if (drawMode) {
        if (onCursorChange) onCursorChange('crosshair');
        console.log('Draw mode enabled');
      } else {
        if (onCursorChange) onCursorChange('default');
        resetDrawState();
        console.log('Draw mode disabled');
      }

      if (onControlsEnableChange) {
        onControlsEnableChange(!drawMode);
      }
    }
    
    // Escape to cancel current drawing
    if (key === 'Escape' && drawMode && startPosition) {
      resetDrawState();
      console.log('Drawing cancelled');
    }
  }

  function handleClick(clientX: number, clientY: number): void {
    if (!drawMode) return;
    
    const position = getGroundPosition(clientX, clientY);
    if (!position) return;
    
    if (!startPosition) {
      // First click - set start position
      startPosition = position.clone();
      console.log('Start position set:', startPosition);
    } else {
      // Second click - create final box
      createFinalBox(startPosition, position);
      resetDrawState();
      console.log('Box created');
    }
  }

  function handleMouseMove(clientX: number, clientY: number): void {
    if (!drawMode || !startPosition) return;
    
    const position = getGroundPosition(clientX, clientY);
    if (position) {
      updatePreviewBox(startPosition, position);
    }
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  function registerInputHandlers(handlers: InputHandlers): void {
    // Store external handlers and merge with internal ones
    inputHandlers = {
      onKeyDown: (key: string) => {
        handleKeyDown(key);
        if (handlers.onKeyDown) handlers.onKeyDown(key);
      },
      onClick: (clientX: number, clientY: number) => {
        handleClick(clientX, clientY);
        if (handlers.onClick) handlers.onClick(clientX, clientY);
      },
      onMouseMove: (clientX: number, clientY: number) => {
        handleMouseMove(clientX, clientY);
        if (handlers.onMouseMove) handlers.onMouseMove(clientX, clientY);
      }
    };
  }

  function getInputHandlers(): InputHandlers {
    return inputHandlers;
  }

  function resize(newViewport: Viewport): void {
    camera.aspect = newViewport.width / newViewport.height;
    camera.updateProjectionMatrix();
    webgpuRenderer.setSize(newViewport.width, newViewport.height);
  }

  function render(): void {
    controls.update();
    webgpuRenderer.render(scene, camera);
  }

  function cleanup(): void {
    controls.dispose();
    previewMaterial.dispose();
    boxMaterial.dispose();
    
    // Dispose preview mesh if exists
    if (previewMesh) {
      previewMesh.geometry.dispose();
    }
    
    // Dispose all created boxes
    createdBoxes.forEach(box => {
      box.geometry.dispose();
      if (box.material instanceof THREE.Material) {
        box.material.dispose();
      }
    });
    
    webgpuRenderer.dispose();
  }

  return {
    registerInputHandlers,
    getInputHandlers,
    resize,
    render,
    cleanup
  };
}

