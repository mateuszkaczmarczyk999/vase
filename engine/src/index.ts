import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DirectionalLight, AmbientLight } from 'three/webgpu';
import { createWebPlatform, Platform } from './platform';

export interface RendererInstance {
  cleanup: () => void;
}

// Box dimensions constants
const BOX_THICKNESS = 0.3;
const BOX_HEIGHT = 2.75;

export async function initRenderer(canvas: HTMLCanvasElement): Promise<RendererInstance> {
  // Create platform abstraction
  const platform = createWebPlatform({ canvas });
  const viewport = platform.getViewport();
  
  // Create WebGPU renderer
  const renderer = new WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  
  renderer.setSize(viewport.width, viewport.height);
  renderer.setPixelRatio(viewport.pixelRatio);

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

  // ==========================================
  // DRAW MODE STATE
  // ==========================================
  let drawMode = false;
  let startPosition: THREE.Vector3 | null = null;
  let previewMesh: THREE.Mesh | null = null;
  
  // Raycaster for mouse position to world coordinates
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Invisible ground plane for raycasting (XZ plane at y=0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  
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
  
  // Store created boxes for cleanup
  const createdBoxes: THREE.Mesh[] = [];

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  // Get world position from mouse coordinates on the ground plane
  function getGroundPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    const viewport = platform.getViewport();
    mouse.x = (clientX / viewport.width) * 2 - 1;
    mouse.y = -(clientY / viewport.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersectPoint = new THREE.Vector3();
    const intersected = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    return intersected ? intersectPoint : null;
  }
  
  // Create or update preview box between start and current position
  function updatePreviewBox(endPosition: THREE.Vector3) {
    if (!startPosition) return;
    
    // Calculate length (distance between start and end on XZ plane)
    const dx = endPosition.x - startPosition.x;
    const dz = endPosition.z - startPosition.z;
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
    const midX = (startPosition.x + endPosition.x) / 2;
    const midZ = (startPosition.z + endPosition.z) / 2;
    previewMesh.position.set(midX, BOX_HEIGHT / 2, midZ);
    
    // Rotate to align with the direction
    previewMesh.rotation.y = -angle;
    
    scene.add(previewMesh);
  }
  
  // Create final box and add to scene
  function createFinalBox(endPosition: THREE.Vector3) {
    if (!startPosition) return;
    
    const dx = endPosition.x - startPosition.x;
    const dz = endPosition.z - startPosition.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    if (length < 0.01) return; // Don't create tiny boxes
    
    const angle = Math.atan2(dz, dx);
    
    const boxGeometry = new THREE.BoxGeometry(length, BOX_HEIGHT, BOX_THICKNESS);
    const box = new THREE.Mesh(boxGeometry, boxMaterial.clone());
    
    const midX = (startPosition.x + endPosition.x) / 2;
    const midZ = (startPosition.z + endPosition.z) / 2;
    box.position.set(midX, BOX_HEIGHT / 2, midZ);
    box.rotation.y = -angle;
    
    scene.add(box);
    createdBoxes.push(box);
  }
  
  // Clear preview and reset draw state
  function resetDrawState() {
    if (previewMesh) {
      scene.remove(previewMesh);
      previewMesh.geometry.dispose();
      previewMesh = null;
    }
    startPosition = null;
  }

  // ==========================================
  // INPUT HANDLERS (using platform)
  // ==========================================
  
  platform.registerInputHandlers({
    onKeyDown: (key: string) => {
      if (key === 'd' || key === 'D') {
        drawMode = !drawMode;
        controls.enabled = !drawMode;
        
        if (drawMode) {
          platform.setCursor('crosshair');
          console.log('Draw mode enabled');
        } else {
          platform.setCursor('default');
          resetDrawState();
          console.log('Draw mode disabled');
        }
      }
      
      // Escape to cancel current drawing
      if (key === 'Escape' && drawMode && startPosition) {
        resetDrawState();
        console.log('Drawing cancelled');
      }
    },
    
    onClick: (clientX: number, clientY: number) => {
      if (!drawMode) return;
      
      const position = getGroundPosition(clientX, clientY);
      if (!position) return;
      
      if (!startPosition) {
        // First click - set start position
        startPosition = position.clone();
        console.log('Start position set:', startPosition);
      } else {
        // Second click - create final box
        createFinalBox(position);
        resetDrawState();
        console.log('Box created');
      }
    },
    
    onMouseMove: (clientX: number, clientY: number) => {
      if (!drawMode || !startPosition) return;
      
      const position = getGroundPosition(clientX, clientY);
      if (position) {
        updatePreviewBox(position);
      }
    }
  });

  // Handle window resize using platform
  platform.onResize((viewport) => {
    camera.aspect = viewport.width / viewport.height;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.width, viewport.height);
  });

  // Animation loop using platform
  platform.startAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  // Cleanup function
  const cleanup = () => {
    platform.dispose();
    
    // Dispose controls
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
    
    renderer.dispose();
  };

  return { cleanup };
}
