var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/gameSystems.js
import { World as World2 } from "miniplex";
import * as THREE11 from "three";

// src/resources/renderer/rendererSetup.js
import * as THREE2 from "three";

// src/resources/renderer/meshFactories.js
import * as THREE from "three";
function proceduralMeshFactory(entity) {
  const { geometry: geomData, material: matData } = entity.renderable;
  let geometry;
  switch (geomData.type) {
    case "capsule":
      geometry = new THREE.CapsuleGeometry(
        geomData.radius,
        geomData.height,
        geomData.radialSegments,
        geomData.heightSegments
      );
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(
        geomData.radius,
        geomData.segments,
        geomData.segments
      );
      break;
    case "box":
      geometry = new THREE.BoxGeometry(
        geomData.width,
        geomData.height,
        geomData.depth
      );
      break;
    default:
      throw new Error(`Unknown geometry type: ${geomData.type}`);
  }
  let material;
  const { type, ...materialProps } = matData;
  switch (type) {
    case "standard":
      material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0,
        ...materialProps
      });
      break;
    case "basic":
      material = new THREE.MeshBasicMaterial(materialProps);
      break;
    default:
      throw new Error(`Unknown material type: ${matData.type}`);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = entity.renderable.castShadow ?? true;
  mesh.receiveShadow = entity.renderable.receiveShadow ?? true;
  return mesh;
}
function gltfMeshFactory(entity, { assets }) {
  const { assetKey, scale, position, rotation, castShadow, receiveShadow } = entity.renderable;
  const cached = assets.cache.get(assetKey);
  if (!cached) {
    console.error(`GLTF asset not preloaded: ${assetKey}`);
    const errorGeom = new THREE.BoxGeometry(1, 1, 1);
    const errorMat = new THREE.MeshBasicMaterial({
      color: 16711680,
      wireframe: true
    });
    return new THREE.Mesh(errorGeom, errorMat);
  }
  const gltfClone = assets.cloneGLTF(cached);
  const gltfModel = gltfClone.scene;
  gltfModel.scale.setScalar(scale);
  gltfModel.rotation.set(rotation.x, rotation.y, rotation.z);
  gltfModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });
  const container = new THREE.Group();
  container.name = `${assetKey}-container`;
  gltfModel.position.set(position.x, position.y, position.z);
  gltfModel.name = `${assetKey}-model`;
  container.add(gltfModel);
  if (gltfClone.animations && gltfClone.animations.length > 0) {
    entity.animationData = {
      mixer: new THREE.AnimationMixer(gltfModel),
      animations: gltfClone.animations
    };
  }
  return container;
}

// src/resources/renderer/rendererSetup.js
async function setupRenderer(config = {}) {
  const scene = new THREE2.Scene();
  const sceneConfig = config.SCENE || {};
  scene.background = new THREE2.Color(sceneConfig.BACKGROUND_COLOR || 0);
  const renderer = new THREE2.WebGLRenderer({
    antialias: config.RENDERER?.ANTIALIAS ?? true,
    canvas: config.canvas
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = config.shadows ?? true;
  renderer.shadowMap.type = THREE2.PCFSoftShadowMap;
  renderer.setClearColor(scene.background);
  const meshFactoryRegistry = /* @__PURE__ */ new Map();
  const rendererResource = {
    renderer,
    scene,
    meshFactoryRegistry,
    registerMeshFactory: (componentName, factory) => {
      meshFactoryRegistry.set(componentName, factory);
    },
    getMeshFactory: (componentName) => {
      return meshFactoryRegistry.get(componentName);
    }
  };
  rendererResource.registerMeshFactory("procedural", proceduralMeshFactory);
  rendererResource.registerMeshFactory("gltf", gltfMeshFactory);
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return rendererResource;
}

// src/resources/physics/physicsSetup.js
import RAPIER from "@dimforge/rapier3d-compat";
async function setupPhysics(config = {}) {
  await RAPIER.init();
  const gravity = config.gravity || { x: 0, y: -9.81, z: 0 };
  const world = new RAPIER.World(gravity);
  const eventQueue = new RAPIER.EventQueue(true);
  const bodyFactoryRegistry = /* @__PURE__ */ new Map();
  const physicsResource = {
    RAPIER,
    // Expose the RAPIER library for advanced use in game factories
    world,
    eventQueue,
    // Expose the event queue
    bodyFactoryRegistry,
    registerBodyFactory: (componentName, factory) => {
      bodyFactoryRegistry.set(componentName, factory);
    },
    getBodyFactory: (componentName) => {
      return bodyFactoryRegistry.get(componentName);
    }
    // We can add other physics-related utilities here in the future
  };
  return physicsResource;
}

// src/resources/assetManager.js
import * as THREE3 from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
var AssetManager = class {
  constructor(config = {}) {
    this.config = config.ASSETS || {};
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE3.TextureLoader();
    this.cache = /* @__PURE__ */ new Map();
  }
  async preload(assets) {
    const promises = assets.map(async (asset) => {
      try {
        if (asset.url.includes(".gltf") || asset.url.includes(".glb")) {
          const result = await this.loadGLTF(asset.key, asset.url);
          return result;
        }
        console.warn(
          `\u26A0\uFE0F Unknown asset type for ${asset.key}, skipping preload`
        );
        return null;
      } catch (error) {
        console.error(
          `\u274C Failed to preload asset ${asset.key} from ${asset.url}:`,
          error
        );
        throw error;
      }
    });
    try {
      const results = await Promise.all(promises);
      const loadedCount = results.filter((r) => r !== null).length;
      if (loadedCount === 0 && assets.length > 0) {
        console.error(
          `\u274C No assets were loaded! Check asset URLs and network connectivity.`
        );
      }
      return results;
    } catch (error) {
      console.error(`\u274C Preload failed:`, error);
      throw error;
    }
  }
  async loadGLTF(key, url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const scalingConfig = this.config.SCALING?.[key];
          if (scalingConfig) {
            gltf.userData.scaling = scalingConfig;
          }
          this.cache.set(key, gltf);
          resolve(gltf);
        },
        void 0,
        // onProgress callback (optional)
        (error) => {
          console.error(`Failed to load GLTF asset ${key} from ${url}:`, error);
          reject(error);
        }
      );
    });
  }
  cloneGLTF(gltf) {
    const clonedScene = SkeletonUtils.clone(gltf.scene);
    return {
      scene: clonedScene,
      animations: [...gltf.animations]
    };
  }
  /**
   * Clear asset cache (for memory management)
   */
  clearCache() {
    this.cache.clear();
  }
};
async function setupAssetManager(config = {}) {
  const assetManager = new AssetManager(config);
  const assetsToLoad = config.assets || [];
  if (assetsToLoad.length > 0) {
    await assetManager.preload(assetsToLoad);
  }
  return assetManager;
}

// src/resources/mobileDetection.js
function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
function isMobileDevice() {
  if (!isTouchDevice()) {
    return false;
  }
  const screenWidth = Math.min(window.screen.width, window.screen.height);
  const isMobileSize = screenWidth <= 768;
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod", "blackberry", "windows phone"];
  const hasMobileUA = mobileKeywords.some((keyword) => userAgent.includes(keyword));
  return isMobileSize || hasMobileUA;
}

// src/resources/mobileControls.js
var MobileControls = class {
  constructor(rawInputState2) {
    this.enabled = false;
    this.container = null;
    this.rawInputState = rawInputState2;
    this.joystickBase = null;
    this.joystickStick = null;
    this.buttons = /* @__PURE__ */ new Map();
    this.joystick = { x: 0, z: 0 };
    this.buttonStates = /* @__PURE__ */ new Map();
    this.touches = /* @__PURE__ */ new Map();
    this.joystickTouch = null;
    this.joystickDeadZone = 0.2;
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
  }
  init() {
    if (!isMobileDevice()) {
      return false;
    }
    this.injectStyles();
    this.createContainer();
    this.createJoystick();
    this.createButton("jump", "Jump", "jump");
    this.createButton("run", "Run", "run");
    this.setupEventListeners();
    this.enabled = true;
    return true;
  }
  injectStyles() {
    if (document.getElementById("roseblox-mobile-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "roseblox-mobile-styles";
    style.textContent = `
      .roseblox-mobile-controls {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .roseblox-joystick-base {
        position: absolute;
        bottom: 30px;
        left: 30px;
        width: 120px;
        height: 120px;
        background: radial-gradient(circle, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
        border: 3px solid rgba(255,255,255,0.4);
        border-radius: 50%;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      
      .roseblox-joystick-stick {
        position: absolute;
        width: 50px;
        height: 50px;
        background: rgba(255,255,255,0.7);
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: all 0.1s ease;
      }
      
      .roseblox-button {
        position: absolute;
        width: 70px;
        height: 70px;
        background: rgba(255,255,255,0.25);
        border: 3px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.15s ease;
      }
      
      .roseblox-button.pressed {
        background: rgba(255,255,255,0.5);
        transform: scale(0.9);
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      }
      
      .roseblox-button-jump {
        bottom: 120px;
        right: 30px;
      }
      
      .roseblox-button-run {
        bottom: 30px;
        right: 120px;
      }
      
      /* Responsive adjustments */
      @media (max-width: 600px) {
        .roseblox-joystick-base {
          width: 100px;
          height: 100px;
          bottom: 20px;
          left: 20px;
        }
        
        .roseblox-joystick-stick {
          width: 42px;
          height: 42px;
        }
        
        .roseblox-button {
          width: 60px;
          height: 60px;
          font-size: 12px;
        }
        
        .roseblox-button-jump {
          bottom: 100px;
          right: 20px;
        }
        
        .roseblox-button-run {
          bottom: 20px;
          right: 100px;
        }
      }
      
      @media (orientation: landscape) and (max-height: 500px) {
        .roseblox-joystick-base {
          width: 80px;
          height: 80px;
          bottom: 15px;
          left: 15px;
        }
        
        .roseblox-button {
          width: 50px;
          height: 50px;
          font-size: 11px;
        }
        
        .roseblox-button-jump {
          bottom: 80px;
          right: 15px;
        }
        
        .roseblox-button-run {
          bottom: 15px;
          right: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  createContainer() {
    this.container = document.createElement("div");
    this.container.className = "roseblox-mobile-controls";
    document.body.appendChild(this.container);
  }
  createJoystick() {
    this.joystickBase = document.createElement("div");
    this.joystickBase.className = "roseblox-joystick-base";
    this.joystickStick = document.createElement("div");
    this.joystickStick.className = "roseblox-joystick-stick";
    this.joystickBase.appendChild(this.joystickStick);
    this.container.appendChild(this.joystickBase);
  }
  createButton(action, label, className) {
    const button = document.createElement("div");
    button.className = `roseblox-button roseblox-button-${className}`;
    button.textContent = label;
    button.dataset.action = action;
    this.buttons.set(action, button);
    this.buttonStates.set(action, false);
    this.container.appendChild(button);
  }
  setupEventListeners() {
    document.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    document.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    document.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", this.handleTouchEnd, { passive: false });
    window.addEventListener("orientationchange", this.handleOrientationChange);
    window.addEventListener("resize", this.handleOrientationChange);
  }
  handleTouchStart(event) {
    for (const touch of event.changedTouches) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element && element.closest(".roseblox-joystick-base")) {
        event.preventDefault();
        this.joystickTouch = touch.identifier;
        this.updateJoystick(touch);
      } else if (element && element.closest(".roseblox-button")) {
        event.preventDefault();
        const button = element.closest(".roseblox-button");
        const action = button.dataset.action;
        this.setButtonState(action, true);
        this.touches.set(touch.identifier, { type: "button", action });
      }
    }
  }
  handleTouchMove(event) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.joystickTouch) {
        event.preventDefault();
        this.updateJoystick(touch);
      }
    }
  }
  handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
      const touchData = this.touches.get(touch.identifier);
      if (touch.identifier === this.joystickTouch) {
        this.resetJoystick();
        this.joystickTouch = null;
      } else if (touchData && touchData.type === "button") {
        this.setButtonState(touchData.action, false);
      }
      this.touches.delete(touch.identifier);
    }
  }
  updateJoystick(touch) {
    const rect = this.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = rect.width / 2 - 10;
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDistance;
    const clampedY = Math.sin(angle) * clampedDistance;
    this.joystickStick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
    const normalizedX = clampedX / maxDistance;
    const normalizedY = clampedY / maxDistance;
    const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    if (magnitude < this.joystickDeadZone) {
      this.joystick.x = 0;
      this.joystick.z = 0;
      this.rawInputState.left = false;
      this.rawInputState.right = false;
      this.rawInputState.forward = false;
      this.rawInputState.backward = false;
    } else {
      this.joystick.x = normalizedX;
      this.joystick.z = normalizedY;
      const threshold = 0.3;
      this.rawInputState.left = this.joystick.x < -threshold;
      this.rawInputState.right = this.joystick.x > threshold;
      this.rawInputState.forward = this.joystick.z < -threshold;
      this.rawInputState.backward = this.joystick.z > threshold;
    }
  }
  resetJoystick() {
    this.joystick.x = 0;
    this.joystick.z = 0;
    this.joystickStick.style.transform = "translate(-50%, -50%)";
    this.rawInputState.left = false;
    this.rawInputState.right = false;
    this.rawInputState.forward = false;
    this.rawInputState.backward = false;
  }
  setButtonState(action, pressed) {
    this.buttonStates.set(action, pressed);
    this.rawInputState[action] = pressed;
    const button = this.buttons.get(action);
    if (button) {
      button.classList.toggle("pressed", pressed);
    }
  }
  handleOrientationChange() {
    setTimeout(() => {
    }, 100);
  }
  destroy() {
    if (!this.enabled)
      return;
    document.removeEventListener("touchstart", this.handleTouchStart);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("touchcancel", this.handleTouchEnd);
    window.removeEventListener("orientationchange", this.handleOrientationChange);
    window.removeEventListener("resize", this.handleOrientationChange);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    const styleElement = document.getElementById("roseblox-mobile-styles");
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    this.enabled = false;
  }
};

// src/resources/inputSetup.js
var rawInputState = {
  // Movement keys
  forward: false,
  // W
  backward: false,
  // S
  left: false,
  // A
  right: false,
  // D
  // Action keys
  jump: false,
  // Space
  run: false,
  // Shift
  escape: false,
  // ESC
  // Mouse
  mouseX: 0,
  mouseY: 0,
  mouseDown: false
};
var keyMappings = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  Escape: "escape"
};
async function setupInput() {
  window.addEventListener("keydown", (event) => {
    const action = keyMappings[event.code];
    if (action) {
      rawInputState[action] = true;
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", (event) => {
    const action = keyMappings[event.code];
    if (action) {
      rawInputState[action] = false;
      event.preventDefault();
    }
  });
  window.addEventListener("mousemove", (event) => {
    rawInputState.mouseX = event.clientX;
    rawInputState.mouseY = event.clientY;
  });
  window.addEventListener("mousedown", () => {
    rawInputState.mouseDown = true;
  });
  window.addEventListener("mouseup", () => {
    rawInputState.mouseDown = false;
  });
  let mobileControls = null;
  try {
    mobileControls = new MobileControls(rawInputState);
    if (!mobileControls.init()) {
      mobileControls = null;
    }
  } catch (error) {
    console.warn("Failed to initialize mobile controls:", error);
    mobileControls = null;
  }
  const inputResource = {
    isActionActive: (action) => rawInputState[action] || false,
    getMousePosition: () => ({
      x: rawInputState.mouseX,
      y: rawInputState.mouseY
    }),
    isMouseDown: () => rawInputState.mouseDown,
    getMovementVector: () => ({
      x: (rawInputState.right ? 1 : 0) - (rawInputState.left ? 1 : 0),
      // Original polarity: forward should be -Z.
      z: (rawInputState.backward ? 1 : 0) - (rawInputState.forward ? 1 : 0)
    }),
    // Expose mobile controls for camera system
    getMobileControls: () => mobileControls
  };
  return inputResource;
}

// src/resources/lightingSetup.js
import * as THREE4 from "three";
async function setupLighting(world, { renderer }, config = {}) {
  const lightingConfig = config.LIGHTING || {};
  const shadowConfig = config.SHADOWS || {};
  const ambientLight = new THREE4.AmbientLight(
    lightingConfig.AMBIENT_COLOR || 16777215,
    lightingConfig.AMBIENT_INTENSITY || 0.4
  );
  const directionalLight = new THREE4.DirectionalLight(
    lightingConfig.DIRECTIONAL_COLOR || 16777215,
    lightingConfig.DIRECTIONAL_INTENSITY || 0.8
  );
  const dirPos = lightingConfig.DIRECTIONAL_POSITION || {
    x: 50,
    y: 100,
    z: 50
  };
  directionalLight.position.set(dirPos.x, dirPos.y, dirPos.z);
  if (shadowConfig.ENABLED !== false) {
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = shadowConfig.MAP_SIZE || 2048;
    directionalLight.shadow.mapSize.height = shadowConfig.MAP_SIZE || 2048;
    directionalLight.shadow.camera.near = shadowConfig.CAMERA_NEAR || 0.5;
    directionalLight.shadow.camera.far = shadowConfig.CAMERA_FAR || 500;
    directionalLight.shadow.camera.left = -(shadowConfig.CAMERA_SIZE || 100);
    directionalLight.shadow.camera.right = shadowConfig.CAMERA_SIZE || 100;
    directionalLight.shadow.camera.top = shadowConfig.CAMERA_SIZE || 100;
    directionalLight.shadow.camera.bottom = -(shadowConfig.CAMERA_SIZE || 100);
  }
  renderer.scene.add(ambientLight);
  renderer.scene.add(directionalLight);
  return {
    ambientLight,
    directionalLight
  };
}

// src/resources/cameraSetup.js
import * as THREE5 from "three";
import CameraControls from "camera-controls";
CameraControls.install({ THREE: THREE5 });
async function setupCamera(world, { renderer }, config = {}) {
  const cameraConfig = config.CAMERA || {};
  const camera = new THREE5.PerspectiveCamera(
    cameraConfig.FOV || 75,
    window.innerWidth / window.innerHeight,
    cameraConfig.NEAR || 0.1,
    cameraConfig.FAR || 2e3
  );
  const controls = new CameraControls(camera, renderer.renderer.domElement);
  controls.minDistance = cameraConfig.MIN_DISTANCE ?? 1;
  controls.maxDistance = cameraConfig.MAX_DISTANCE ?? 15;
  controls.smoothTime = cameraConfig.SMOOTH_TIME ?? 0;
  const mouseSensitivity = cameraConfig.MOUSE_SENSITIVITY || {};
  const lookSensitivity = mouseSensitivity.LOOK ?? 1;
  const zoomSensitivity = mouseSensitivity.ZOOM ?? 1;
  controls.azimuthRotateSpeed = lookSensitivity;
  controls.polarRotateSpeed = lookSensitivity;
  controls.dollySpeed = zoomSensitivity;
  if (isMobileDevice()) {
    controls.touches = {
      one: CameraControls.ACTION.TOUCH_ROTATE,
      two: CameraControls.ACTION.TOUCH_DOLLY_TRUCK,
      three: CameraControls.ACTION.TOUCH_TRUCK
    };
    controls.mouseButtons = {
      left: CameraControls.ACTION.NONE,
      middle: CameraControls.ACTION.NONE,
      right: CameraControls.ACTION.NONE,
      wheel: CameraControls.ACTION.NONE
    };
  } else {
    controls.touches = {
      one: CameraControls.ACTION.NONE,
      two: CameraControls.ACTION.NONE,
      three: CameraControls.ACTION.NONE
    };
  }
  for (const entity of world) {
    if (entity.isCameraFollowTarget && entity.transform) {
      const pos = entity.transform.position;
      const initialOffset = cameraConfig.INITIAL_OFFSET || { x: 0, y: 5, z: 8 };
      const lookOffset = cameraConfig.LOOK_OFFSET || { x: 0, y: 1, z: 0 };
      controls.setLookAt(
        pos.x + initialOffset.x,
        pos.y + initialOffset.y,
        pos.z + initialOffset.z,
        pos.x + lookOffset.x,
        pos.y + lookOffset.y,
        pos.z + lookOffset.z,
        false
      );
      break;
    }
  }
  const cameraResources = {
    camera,
    controls
  };
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  return cameraResources;
}

// src/systems/inputSystem.js
function inputSystem(world, { input }) {
  const query = world.with(
    "isInputControlled",
    "inputMovement",
    "inputActions"
  );
  for (const entity of query) {
    const moveVec = input.getMovementVector();
    entity.inputMovement.x = moveVec.x;
    entity.inputMovement.z = moveVec.z;
    entity.inputActions.jump = input.isActionActive("jump");
    entity.inputActions.run = input.isActionActive("run");
  }
}

// src/systems/cameraInputSystem.js
import * as THREE6 from "three";
function cameraInputSystem(world, camera) {
  if (!camera) {
    throw new Error(
      "cameraInputSystem: Camera not provided via dependency injection"
    );
  }
  const query = world.with("isInputControlled", "cameraDirection");
  for (const entity of query) {
    const forward = new THREE6.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE6.Vector3();
    right.crossVectors(forward, new THREE6.Vector3(0, 1, 0));
    entity.cameraDirection.forward.copy(forward);
    entity.cameraDirection.right.copy(right);
  }
}

// src/systems/pointerLockSystem.js
function pointerLockSystem(cameraControls, input, config) {
  if (!cameraControls || !input) {
    return;
  }
  const pointerLockConfig = config.CAMERA?.POINTER_LOCK;
  if (!pointerLockConfig?.ENABLED) {
    return;
  }
  const { TRIGGER, RELEASE } = pointerLockConfig;
  switch (TRIGGER) {
    case "click":
      if (input.isMouseDown()) {
        cameraControls.lockPointer();
      }
      break;
    case "keydown":
      break;
    case "manual":
      break;
  }
  switch (RELEASE) {
    case "esc":
      if (input.isActionActive("escape")) {
        cameraControls.unlockPointer();
      }
      break;
    case "keyup":
      break;
    case "manual":
      break;
  }
}

// src/systems/componentMovementSystem.js
import * as THREE7 from "three";
function componentMovementSystem(world, physicsWorld) {
  if (!physicsWorld) {
    throw new Error("componentMovementSystem: Physics world is required");
  }
  const query = world.with("physicsBody", "movementState").where((e) => e.physicsBody.controller);
  for (const entity of query) {
    const body = entity.physicsBody.rigidBody;
    const ctrl = entity.physicsBody.controller;
    const velocity = entity.movementState.velocity;
    const direction = entity.movementState.direction;
    if (direction.lengthSq() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      const quat = new THREE7.Quaternion();
      quat.setFromAxisAngle(new THREE7.Vector3(0, 1, 0), angle);
      body.setRotation({
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w
      });
    }
    if (velocity.lengthSq() === 0) {
      continue;
    }
    const collider = body.collider(0);
    const moveVec = {
      x: velocity.x,
      y: velocity.y,
      z: velocity.z
    };
    ctrl.computeColliderMovement(collider, moveVec);
    const corrected = ctrl.computedMovement();
    const currentPos = body.translation();
    body.setNextKinematicTranslation({
      x: currentPos.x + corrected.x,
      y: currentPos.y + corrected.y,
      z: currentPos.z + corrected.z
    });
  }
}

// src/systems/stepPhysicsSystem.js
function stepPhysics(physicsWorld, eventQueue) {
  if (!physicsWorld) {
    throw new Error("stepPhysics: Physics world is required");
  }
  if (!eventQueue) {
    throw new Error("stepPhysics: Event queue is required");
  }
  physicsWorld.step(eventQueue);
}

// src/systems/physicsStateSyncSystem.js
function physicsStateSyncSystem(world, physicsWorld) {
  if (!physicsWorld) {
    throw new Error("physicsStateSyncSystem: Physics world is required");
  }
  const query = world.with("physicsBody", "transform");
  for (const entity of query) {
    const body = entity.physicsBody.rigidBody;
    const pos = body.translation();
    entity.transform.position.set(pos.x, pos.y, pos.z);
    const rot = body.rotation();
    entity.transform.rotation.set(rot.x, rot.y, rot.z, rot.w);
    if (entity.physicsBody.controller && entity.movementState) {
      entity.movementState.grounded = entity.physicsBody.controller.computedGrounded();
    }
  }
}

// src/systems/sceneManagementSystem.js
var trackedMeshes = /* @__PURE__ */ new Map();
var trackedPhysicsBodies = /* @__PURE__ */ new Map();
function sceneManagementSystem(world, { renderer, assets, physics }) {
  handleMeshCreation(world, renderer, assets);
  handleResourceCleanup(world, renderer, physics);
}
function handleMeshCreation(world, renderer, assets) {
  for (const entity of world) {
    if (!entity.renderable || !entity.renderable.needsMesh || entity.renderable.mesh) {
      continue;
    }
    let factory;
    let factoryKey;
    for (const componentName in entity) {
      if (renderer.getMeshFactory(componentName)) {
        factoryKey = componentName;
        break;
      }
    }
    if (factoryKey) {
      factory = renderer.getMeshFactory(factoryKey);
    } else if (entity.renderable && entity.renderable.type) {
      factory = renderer.getMeshFactory(entity.renderable.type);
    }
    if (factory) {
      try {
        const mesh = factory(entity, { assets });
        entity.renderable.mesh = mesh;
        renderer.scene.add(mesh);
        trackedMeshes.set(mesh, entity);
      } catch (error) {
        console.error(
          `Mesh factory for entity failed [type: ${factoryKey || entity.renderable.type}]:`,
          error
        );
      } finally {
        entity.renderable.needsMesh = false;
      }
    } else {
      console.warn(`No mesh factory found for type: ${entity.renderable.type}`);
      entity.renderable.needsMesh = false;
    }
  }
  for (const entity of world) {
    if (entity.physicsBody && !trackedPhysicsBodies.has(entity.physicsBody)) {
      trackedPhysicsBodies.set(entity.physicsBody, entity);
    }
  }
}
function handleResourceCleanup(world, renderer, physics) {
  const currentEntities = new Set(world);
  for (const [mesh, entity] of trackedMeshes) {
    if (!currentEntities.has(entity)) {
      renderer.scene.remove(mesh);
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      trackedMeshes.delete(mesh);
    }
  }
  for (const [physicsBody, entity] of trackedPhysicsBodies) {
    if (!currentEntities.has(entity)) {
      if (physicsBody.collider) {
        physics.world.removeCollider(physicsBody.collider, true);
      }
      if (physicsBody.rigidBody) {
        physics.world.removeRigidBody(physicsBody.rigidBody);
      }
      trackedPhysicsBodies.delete(physicsBody);
    }
  }
}

// src/systems/animationSetupSystem.js
import { World } from "miniplex";

// src/components/animationMixer.js
import * as THREE8 from "three";
function createAnimationMixer(mixer, animations = [], transitionDuration = 0.3) {
  const actions = /* @__PURE__ */ new Map();
  animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.loop = THREE8.LoopRepeat;
    actions.set(clip.name, action);
  });
  return {
    mixer,
    actions,
    currentAnimation: null,
    targetAnimation: null,
    transitioning: false,
    transitionDuration
  };
}

// src/systems/animationSetupSystem.js
function animationSetupSystem(world) {
  const query = world.with("animationData").where((e) => !e.animationMixer);
  for (const entity of query) {
    const { mixer, animations } = entity.animationData;
    world.addComponent(
      entity,
      "animationMixer",
      createAnimationMixer(mixer, animations)
    );
    world.removeComponent(entity, "animationData");
  }
}

// src/systems/animationSystem.js
var evaluators = {
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  "===": (a, b) => a === b,
  "!==": (a, b) => a !== b
};
function evaluateCondition(entity, condition) {
  const { property, is, than } = condition;
  const sourceComponent = entity.movementState;
  if (!sourceComponent || sourceComponent[property] === void 0) {
    return false;
  }
  return evaluators[is]?.(sourceComponent[property], than) ?? false;
}
function transitionToAnimation(animationMixer, targetAnimationName) {
  const { actions, transitionDuration } = animationMixer;
  const currentAnimationName = animationMixer.currentAnimation;
  if (currentAnimationName === targetAnimationName) {
    return;
  }
  const targetAction = actions.get(targetAnimationName);
  if (!targetAction) {
    console.warn(`Animation "${targetAnimationName}" not found in mixer.`);
    return;
  }
  targetAction.reset().fadeIn(transitionDuration).play();
  if (currentAnimationName) {
    const currentAction = actions.get(currentAnimationName);
    if (currentAction) {
      currentAction.fadeOut(transitionDuration);
    }
  }
  animationMixer.currentAnimation = targetAnimationName;
}
function animationSystem(world, deltaTime) {
  const query = world.with("animationMixer", "stateMachine", "movementState");
  for (const entity of query) {
    const { stateMachine, animationMixer } = entity;
    const currentStateNode = stateMachine.states[stateMachine.currentState];
    if (!currentStateNode)
      continue;
    stateMachine.stateTime += deltaTime;
    for (const transition of currentStateNode.transitions) {
      if (evaluateCondition(entity, transition.when)) {
        stateMachine.currentState = transition.to;
        stateMachine.stateTime = 0;
        break;
      }
    }
    const newCurrentStateNode = stateMachine.states[stateMachine.currentState];
    if (newCurrentStateNode?.animation) {
      const targetAnimationName = newCurrentStateNode.animation;
      transitionToAnimation(animationMixer, targetAnimationName);
    }
    animationMixer.mixer.update(deltaTime);
  }
}

// src/systems/transformSyncSystem.js
function transformSyncSystem(world) {
  const query = world.with("renderable", "transform").where((e) => e.renderable.mesh);
  for (const entity of query) {
    entity.renderable.mesh.position.copy(entity.transform.position);
    entity.renderable.mesh.quaternion.copy(entity.transform.rotation);
  }
}

// src/systems/cameraUpdateSystem.js
function cameraUpdateSystem(world, { camera }, deltaTime) {
  const cameraControls = camera?.controls;
  if (!cameraControls) {
    throw new Error(
      "cameraUpdateSystem: Camera controls not provided via dependency injection"
    );
  }
  for (const entity of world) {
    if (entity.isCameraFollowTarget && entity.transform) {
      const pos = entity.transform.position;
      const offset = entity.isCameraFollowTarget.offset || { x: 0, y: 0, z: 0 };
      cameraControls.moveTo(
        pos.x + offset.x,
        pos.y + offset.y,
        pos.z + offset.z,
        true
      );
      break;
    }
  }
  cameraControls.update(deltaTime);
}

// src/systems/physicsBodySetupSystem.js
function physicsBodySetupSystem(world, { physics }) {
  const entitiesToProcess = [];
  for (const entity of world) {
    if (!entity.physicsBody) {
      entitiesToProcess.push(entity);
    }
  }
  for (const entity of entitiesToProcess) {
    for (const componentName in entity) {
      const factory = physics.getBodyFactory(componentName);
      if (factory) {
        const body = factory(entity, {
          physicsWorld: physics.world,
          RAPIER: physics.RAPIER
        });
        if (body) {
          world.addComponent(entity, "physicsBody", body);
          body.collider.setActiveEvents(
            physics.RAPIER.ActiveEvents.COLLISION_EVENTS
          );
          body.collider.userData = { entity };
        }
        break;
      }
    }
  }
}

// src/systems/parentingSystem.js
function parentingSystem(world) {
  const query = world.with("parent", "transform");
  for (const entity of query) {
    const parentEntity = entity.parent;
    if (parentEntity && parentEntity.transform) {
      entity.transform.position.copy(parentEntity.transform.position);
    }
  }
}

// src/systems/debugRenderSystem.js
import * as THREE9 from "three";
var debugLines = null;
function debugRenderSystem(world, { renderer, physics }) {
  if (!renderer || !physics) {
    return;
  }
  if (!debugLines) {
    const buffers2 = physics.world.debugRender();
    const material = new THREE9.LineBasicMaterial({ vertexColors: true });
    const geometry = new THREE9.BufferGeometry();
    debugLines = new THREE9.LineSegments(geometry, material);
    debugLines.geometry.setAttribute(
      "position",
      new THREE9.BufferAttribute(buffers2.vertices, 3)
    );
    debugLines.geometry.setAttribute(
      "color",
      new THREE9.BufferAttribute(buffers2.colors, 4)
    );
    renderer.scene.add(debugLines);
  }
  const buffers = physics.world.debugRender();
  debugLines.geometry.setAttribute(
    "position",
    new THREE9.BufferAttribute(buffers.vertices, 3)
  );
  debugLines.geometry.setAttribute(
    "color",
    new THREE9.BufferAttribute(buffers.colors, 4)
  );
}

// src/systems/collisionSystem.js
function collisionSystem(world, { physics, eventBus }) {
  physics.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    const collider1 = physics.world.getCollider(handle1);
    const collider2 = physics.world.getCollider(handle2);
    if (!collider1 || !collider2 || !collider1.userData || !collider2.userData) {
      return;
    }
    const entityA = collider1.userData.entity;
    const entityB = collider2.userData.entity;
    if (!entityA || !entityB) {
      return;
    }
    const eventName = started ? "collision-started" : "collision-ended";
    eventBus.emit(eventName, { entityA, entityB });
  });
}

// src/systems/characterControllerCollisionSystem.js
function characterControllerCollisionSystem(world, { physics, eventBus }) {
  const query = world.with("physicsBody", "movementState").where((e) => e.physicsBody.controller);
  for (const entity of query) {
    const ctrl = entity.physicsBody.controller;
    if (!entity.characterControllerCollisions) {
      entity.characterControllerCollisions = {
        currentCollisions: /* @__PURE__ */ new Map(),
        // Track which entities we're currently colliding with (entity ID -> entity reference)
        lastFrameCollisions: /* @__PURE__ */ new Map()
        // Track previous frame's collisions (entity ID -> entity reference)
      };
    }
    const collisionTracker = entity.characterControllerCollisions;
    collisionTracker.lastFrameCollisions = new Map(
      collisionTracker.currentCollisions
    );
    collisionTracker.currentCollisions.clear();
    const numCollisions = ctrl.numComputedCollisions();
    if (numCollisions > 0) {
      for (let i = 0; i < numCollisions; i++) {
        const collision = ctrl.computedCollision(i);
        const otherCollider = collision.collider;
        if (otherCollider && otherCollider.userData && otherCollider.userData.entity) {
          const otherEntity = otherCollider.userData.entity;
          const otherEntityId = otherEntity.id || otherEntity.testId || "unknown";
          collisionTracker.currentCollisions.set(otherEntityId, otherEntity);
          if (!collisionTracker.lastFrameCollisions.has(otherEntityId)) {
            eventBus.emit("collision-started", {
              entityA: entity,
              // The character controller entity (usually player)
              entityB: otherEntity,
              // The entity we collided with
              controllerCollision: true
              // Flag to indicate this came from character controller
            });
          }
        }
      }
    }
    for (const [
      otherEntityId,
      otherEntity
    ] of collisionTracker.lastFrameCollisions) {
      if (!collisionTracker.currentCollisions.has(otherEntityId)) {
        eventBus.emit("collision-ended", {
          entityA: entity,
          entityB: otherEntity,
          // Use the cached entity reference
          controllerCollision: true
        });
      }
    }
  }
}

// src/systems/physicsCameraCollisionSystem.js
import * as THREE10 from "three";
var hasInitializedCollision = false;
function physicsCameraCollisionSystem(world, camera) {
  if (!camera || hasInitializedCollision) {
    return;
  }
  for (const entity of world) {
    if (entity.isTerrain && entity.isTerrain.collisionGeometry) {
      const collisionGeometry = entity.isTerrain.collisionGeometry;
      const collisionMesh = new THREE10.Mesh(collisionGeometry);
      camera.controls.colliderMeshes.push(collisionMesh);
      hasInitializedCollision = true;
      break;
    }
  }
}

// src/systems/triggerDetectionSystem.js
function triggerDetectionSystem(world, eventBus) {
  const triggerableEntities = world.with("transform", "triggerDetector");
  const triggerZones = world.with("transform", "triggerZone");
  for (const triggerable of triggerableEntities) {
    const triggerablePos = triggerable.transform.position;
    const triggerableRadius = triggerable.triggerDetector.radius || 1;
    for (const triggerZone of triggerZones) {
      const triggerPos = triggerZone.transform.position;
      const triggerRadius = triggerZone.triggerZone.radius || 1;
      const dx = triggerablePos.x - triggerPos.x;
      const dy = triggerablePos.y - triggerPos.y;
      const dz = triggerablePos.z - triggerPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const combinedRadius = triggerableRadius + triggerRadius;
      const isInside = distance < combinedRadius;
      if (!triggerZone.triggerZone.currentlyInside) {
        triggerZone.triggerZone.currentlyInside = /* @__PURE__ */ new Set();
      }
      const wasInside = triggerZone.triggerZone.currentlyInside.has(triggerable.id);
      if (isInside && !wasInside) {
        triggerZone.triggerZone.currentlyInside.add(triggerable.id);
        eventBus.emit("trigger-entered", {
          triggerable,
          trigger: triggerZone,
          triggerType: triggerZone.triggerZone.type || "generic"
        });
      } else if (!isInside && wasInside) {
        triggerZone.triggerZone.currentlyInside.delete(triggerable.id);
        eventBus.emit("trigger-exited", {
          triggerable,
          trigger: triggerZone,
          triggerType: triggerZone.triggerZone.type || "generic"
        });
      }
    }
  }
}

// src/gameSystems.js
var GameSystems = class {
  constructor() {
    this.world = new World2();
    this.resources = /* @__PURE__ */ new Map();
    this.setupSystems = [];
    this.runtimeSystems = [];
    this.initialized = false;
    this.eventListeners = /* @__PURE__ */ new Map();
    this.clock = new THREE11.Clock();
  }
  /**
   * Register a shared resource (singleton service) that can be injected into systems.
   * @param {string} name - A unique name for the resource (e.g., 'renderer', 'physics').
   * @param {function(object): Promise<object>|object} factory - A function that creates the resource instance. It receives the game config object. Can be async.
   * @throws {Error} If called after the engine has been initialized.
   */
  registerResource(name, factory) {
    if (this.initialized) {
      throw new Error(
        `Cannot register resource '${name}' after initialization`
      );
    }
    this.resources.set(name, { factory, instance: null });
  }
  /**
   * Registers a setup system.
   * Setup systems run once during engine initialization and are used for creating
   * initial entities, registering component-specific factories, and other one-time setup tasks.
   * They are executed in an order determined by their dependencies.
   *
   * @param {string} name - A unique name for the setup system.
   * @param {object} config - The configuration for the setup system.
   * @param {function(World, object<string, any>, object, GameSystems): Promise<void>|void} config.init - The function to execute.
   *   It receives the ECS `world`, a `dependencies` object containing the requested resource instances, the global `gameConfig` object,
   *   and the `engine` instance itself. This function can be async.
   * @param {string[]} [config.dependencies=[]] - An array of resource names this system needs (e.g., ['renderer', 'physics']). The system will not run until these resources are available.
   * @throws {Error} If called after the engine has been initialized.
   *
   * @example
   * engine.registerSetup("create-player", {
   *   dependencies: ["physics"],
   *   init: (world, { physics }, config, engine) => {
   *     // logic to create the player entity and its physics body
   *     // You can also call engine.addResource() here if needed
   *   }
   * });
   */
  registerSetup(name, { init, dependencies = [] }) {
    if (this.initialized) {
      throw new Error(
        `Cannot register setup system '${name}' after initialization`
      );
    }
    this.setupSystems.push({
      name,
      init,
      dependencies
    });
  }
  /**
   * Registers a runtime system.
   * Runtime systems are executed every frame in a specific order defined by their priority.
   * They contain the core game logic that reads and writes component data.
   *
   * @param {string} name - A unique name for the runtime system.
   * @param {object} config - The configuration for the runtime system.
   * @param {function(World, object<string, any>, number): void} config.update - The function to execute every frame.
   *   It receives the ECS `world`, a `dependencies` object containing requested resource instances, and the `deltaTime` since the last frame.
   * @param {string[]} [config.dependencies=[]] - An array of resource names this system needs. These resources will be passed in the `dependencies` object.
   * @param {number} [config.priority=0] - The execution priority. Lower numbers run first.
   * @throws {Error} If called after the engine has been initialized.
   *
   * @example
   * engine.registerSystem("player-input", {
   *   dependencies: ["input"],
   *   update: (world, { input }, deltaTime) => {
   *     // logic to read input and update player components
   *   },
   *   priority: 10
   * });
   */
  registerSystem(name, { update, dependencies = [], priority = 0 }) {
    if (this.initialized) {
      throw new Error(
        `Cannot register runtime system '${name}' after initialization`
      );
    }
    this.runtimeSystems.push({
      name,
      update,
      dependencies,
      priority
    });
    this.runtimeSystems.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Initializes all core resources, runs all registered setup systems, and starts the game loop.
   * This method must be called after all game-specific systems have been registered.
   *
   * @param {object} [gameConfig={}] - A configuration object that is passed to all resource factories and setup systems.
   * @param {HTMLCanvasElement} gameConfig.canvas - The canvas element for rendering.
   * @param {boolean} [gameConfig.DEBUG=false] - If true, enables debug features like the physics wireframe renderer.
   * @returns {Promise<void>} A promise that resolves when initialization is complete and the game loop has started.
   * @throws {Error} If the engine is already initialized or if any part of the setup fails.
   */
  async init(gameConfig = {}) {
    if (this.initialized) {
      throw new Error("GameSystems already initialized");
    }
    this.gameConfig = gameConfig;
    this._registerCoreSystems();
    if (gameConfig.DEBUG) {
      this.registerSystem("debug-renderer", {
        update: debugRenderSystem,
        dependencies: ["physics", "renderer"],
        priority: 999
        // Run last
      });
    }
    try {
      for (const [name, resource] of this.resources) {
        if (resource.factory) {
          resource.instance = await resource.factory(gameConfig);
        }
      }
      const completed = /* @__PURE__ */ new Set();
      const inProgress = /* @__PURE__ */ new Set();
      for (const setup of this.setupSystems) {
        await this._runSetupSystem(setup, completed, inProgress, gameConfig);
      }
      this.initialized = true;
      this.start();
    } catch (error) {
      console.error("\u274C GameSystems initialization failed:", error);
      throw error;
    }
  }
  /**
   * Kicks off and maintains the game loop.
   * @private
   * @internal
   */
  start() {
    const animate = () => {
      const deltaTime = this.clock.getDelta();
      this.update(deltaTime);
      requestAnimationFrame(animate);
    };
    animate();
  }
  /**
   * Run setup system with dependency resolution
   * @private
   * @internal
   */
  async _runSetupSystem(setup, completed, inProgress, gameConfig) {
    if (completed.has(setup.name)) {
      return;
    }
    if (inProgress.has(setup.name)) {
      throw new Error(
        `Circular dependency detected in setup system: ${setup.name}`
      );
    }
    for (const depName of setup.dependencies) {
      if (!this.resources.has(depName)) {
        throw new Error(
          `Setup system '${setup.name}' requires unknown resource: ${depName}`
        );
      }
    }
    inProgress.add(setup.name);
    try {
      const deps = this._getDependencies(setup.dependencies);
      await setup.init(this.world, deps, gameConfig, this);
      completed.add(setup.name);
      inProgress.delete(setup.name);
    } catch (error) {
      inProgress.delete(setup.name);
      throw new Error(`Setup system '${setup.name}' failed: ${error.message}`);
    }
  }
  /**
   * Update all runtime systems (call every frame)
   * @param {number} deltaTime - Frame delta time in seconds
   */
  update(deltaTime) {
    if (!this.initialized) {
      throw new Error("GameSystems not initialized. Call init() first.");
    }
    for (const system of this.runtimeSystems) {
      try {
        const deps = this._getDependencies(system.dependencies);
        system.update(this.world, deps, deltaTime);
      } catch (error) {
        console.error(`Runtime system '${system.name}' failed:`, error);
      }
    }
    this.render();
  }
  /**
   * Performs the final render of the scene.
   * @private
   * @internal
   */
  render() {
    const renderer = this.getResource("renderer");
    const camera = this.getResource("camera");
    if (renderer && camera) {
      renderer.renderer.render(renderer.scene, camera.camera);
    }
  }
  /**
   * Retrieves an initialized shared resource instance by name.
   * This is the primary way for systems or external game logic to access shared engine services like the renderer, physics world, or input manager.
   *
   * @param {string} name - The name of the resource to retrieve (e.g., 'renderer', 'physics', 'eventBus').
   * @returns {object} The resource instance.
   * @throws {Error} If the resource is not found or has not been initialized yet.
   *
   * @example
   * const physicsWorld = engine.getResource("physics").world;
   * const scene = engine.getResource("renderer").scene;
   */
  getResource(name) {
    const resource = this.resources.get(name);
    if (!resource || !resource.instance) {
      throw new Error(`Resource '${name}' not available`);
    }
    return resource.instance;
  }
  /**
   * Returns the central Miniplex ECS world instance.
   * @returns {World} The ECS world.
   */
  getWorld() {
    return this.world;
  }
  /**
   * Check if the system manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
  /**
   * Manually adds a resource to the engine.
   * This is typically used by setup systems to register new resources that other systems can then depend on.
   * For example, a `terrainSetup` system could generate a terrain data map and register it as a 'terrain' resource.
   *
   * @param {string} name - The name of the resource.
   * @param {object} instance - The resource instance to add.
   * @throws {Error} If a resource with the same name already exists.
   *
   * @example
   * // Inside a setup system's init function:
   * init: (world, deps, config, engine) => {
   *   const terrainData = generateTerrain();
   *   engine.addResource("terrain", terrainData);
   * }
   *
   * // Another system can now depend on it:
   * engine.registerSystem("terrain-logic", {
   *   dependencies: ["terrain"],
   *   update: (world, { terrain }) => {
   *     // access terrain data
   *   }
   * });
   */
  addResource(name, instance) {
    if (this.resources.has(name) && this.resources.get(name).instance) {
      if (name !== "eventBus") {
        throw new Error(`Resource '${name}' already exists.`);
      }
    }
    this.resources.set(name, { factory: null, instance });
  }
  /**
   * Registers the engine's built-in resources and runtime systems.
   * @private
   * @internal
   */
  _registerCoreSystems() {
    this.addResource("eventBus", this);
    this.registerResource(
      "renderer",
      async (config) => await setupRenderer(config)
    );
    this.registerResource(
      "physics",
      async (config) => await setupPhysics(config)
    );
    this.registerResource("input", async (config) => await setupInput(config));
    this.registerResource(
      "assets",
      async (config) => await setupAssetManager(config)
    );
    this.registerSetup("lighting", {
      dependencies: ["renderer"],
      init: async (world, dependencies, config) => {
        const lightingResources = await setupLighting(
          world,
          dependencies,
          config
        );
        this.addResource("lighting", lightingResources);
      }
    });
    this.registerSetup("physicsBodyCreation", {
      dependencies: ["physics"],
      init: (world, dependencies) => physicsBodySetupSystem(world, dependencies)
    });
    this.registerSetup("camera", {
      dependencies: ["renderer"],
      init: async (world, dependencies, config) => {
        const cameraResources = await setupCamera(world, dependencies, config);
        this.addResource("camera", cameraResources);
      }
    });
    this.registerSystem("inputInterpretation", {
      dependencies: ["input"],
      update: (world, dependencies) => inputSystem(world, dependencies),
      priority: 10
    });
    this.registerSystem("cameraInput", {
      dependencies: ["camera"],
      update: (world, { camera }) => cameraInputSystem(world, camera.camera),
      priority: 20
    });
    this.registerSystem("pointerLock", {
      dependencies: ["camera", "input"],
      update: (world, { camera, input }, deltaTime) => {
        pointerLockSystem(camera.controls, input, this.gameConfig);
      },
      priority: 21
      // Run after camera input
    });
    this.registerSystem("componentMovement", {
      dependencies: ["physics"],
      update: (world, { physics }) => componentMovementSystem(world, physics.world),
      priority: 35
    });
    this.registerSystem("physicsStep", {
      dependencies: ["physics"],
      update: (world, { physics }) => stepPhysics(physics.world, physics.eventQueue),
      priority: 40
    });
    this.registerSystem("characterControllerCollisionProcessing", {
      dependencies: ["physics", "eventBus"],
      update: (world, dependencies) => characterControllerCollisionSystem(world, dependencies),
      priority: 41
      // Run after physics step, before regular collision processing
    });
    this.registerSystem("collisionProcessing", {
      dependencies: ["physics", "eventBus"],
      update: (world, dependencies) => collisionSystem(world, dependencies),
      priority: 42
      // Run right after character controller collision processing
    });
    this.registerSystem("triggerDetection", {
      dependencies: ["eventBus"],
      update: (world, { eventBus }) => triggerDetectionSystem(world, eventBus),
      priority: 43
      // Run after physics but before rendering
    });
    this.registerSystem("physicsStateSync", {
      dependencies: ["physics"],
      update: (world, { physics }) => physicsStateSyncSystem(world, physics.world),
      priority: 45
      // CRITICAL: Run AFTER physics step
    });
    this.registerSystem("sceneManagement", {
      dependencies: ["assets", "renderer", "physics"],
      update: (world, dependencies) => sceneManagementSystem(world, dependencies),
      priority: 50
    });
    this.registerSystem("animationSetup", {
      update: (world, _) => animationSetupSystem(world),
      priority: 52
    });
    this.registerSystem("animation", {
      update: (world, deps, deltaTime) => animationSystem(world, deltaTime),
      priority: 55
    });
    this.registerSystem("parenting", {
      update: (world) => parentingSystem(world),
      priority: 60
      // Run after parent positions are updated, before visuals are synced
    });
    this.registerSystem("transformSync", {
      update: (world) => transformSyncSystem(world),
      priority: 65
    });
    this.registerSystem("camera-collision", {
      dependencies: ["camera"],
      update: (world, { camera }) => physicsCameraCollisionSystem(world, camera),
      priority: 74
      // Run just before camera update
    });
    this.registerSystem("cameraUpdate", {
      dependencies: ["camera"],
      update: (world, { camera }, deltaTime) => cameraUpdateSystem(world, { camera }, deltaTime),
      priority: 75
    });
  }
  /**
   * Subscribes to an engine event.
   * The event bus is used for decoupled communication between systems. The engine instance itself serves as the main event bus.
   * For example, the collision system emits 'collision-enter' events,
   * and game logic can listen for these events without having a direct reference to the collision system.
   *
   * @param {string} eventName - The name of the event to listen for (e.g., 'collision-enter', 'score-updated').
   * @param {function(any): void} callback - The function to call when the event is emitted. It will receive the event data as its only argument.
   *
   * @example
   * engine.on("player-death", (eventData) => {
   *   console.log(`Player died because: ${eventData.reason}`);
   *   // Show game over screen
   * });
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }
  /**
   * Unsubscribes from an engine event.
   * It is good practice to unsubscribe listeners when they are no longer needed to prevent memory leaks,
   * for example, when a UI element that was listening for an event is destroyed.
   *
   * @param {string} eventName - The name of the event.
   * @param {function(any): void} callback - The specific callback function instance to remove.
   *
   * @example
   * const handleResize = () => { /.../ };
   * engine.on('resize', handleResize);
   * // later...
   * engine.off('resize', handleResize);
   */
  off(eventName, callback) {
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  /**
   * Emits an engine event, calling all subscribed listeners with the provided data.
   *
   * @param {string} eventName - The name of the event to emit.
   * @param {any} [data] - The data payload to pass to the event listeners. This can be any type of data (object, string, number, etc.).
   *
   * @example
   * // Inside a system that has 'eventBus' as a dependency:
   * engine.registerSystem("scoring", {
   *   dependencies: ["eventBus"],
   *   update: (world, { eventBus }, deltaTime) => {
   *     world.with("isPlayer", "score").forEach(player => {
   *       player.score.value += 10;
   *       eventBus.emit("score-updated", { newScore: player.score.value });
   *     });
   *   }
   * });
   */
  emit(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      const listeners = [...this.eventListeners.get(eventName)];
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for '${eventName}':`, error);
        }
      }
    }
  }
  /**
   * Get dependency objects for a system
   * @private
   * @internal
   */
  _getDependencies(dependencyNames) {
    const deps = {};
    for (const name of dependencyNames) {
      const resource = this.resources.get(name);
      if (!resource || !resource.instance) {
        throw new Error(`Resource '${name}' not available`);
      }
      deps[name] = resource.instance;
    }
    return deps;
  }
};

// src/components/index.js
var components_exports = {};
__export(components_exports, {
  createAnimationMixer: () => createAnimationMixer,
  createCameraDirection: () => createCameraDirection,
  createGLTFRenderable: () => createGLTFRenderable,
  createMovementState: () => createMovementState,
  createRenderableMetadata: () => createRenderableMetadata,
  createStateMachine: () => createStateMachine,
  createTransform: () => createTransform,
  createTriggerDetector: () => createTriggerDetector,
  createTriggerZone: () => createTriggerZone
});

// src/components/transform.js
import * as THREE12 from "three";
function createTransform(position = new THREE12.Vector3(0, 0, 0), rotation = new THREE12.Quaternion(0, 0, 0, 1), scale = new THREE12.Vector3(1, 1, 1)) {
  return {
    position: position.clone(),
    rotation: rotation.clone(),
    scale: scale.clone()
  };
}

// src/components/renderable.js
import * as THREE13 from "three";
function createRenderableMetadata(type, geometry, material, castShadow = true, receiveShadow = true, children = null) {
  const renderable = {
    type,
    needsMesh: true,
    geometry,
    material,
    castShadow,
    receiveShadow
  };
  if (children) {
    renderable.children = children;
  }
  return renderable;
}
function createGLTFRenderable(assetKey, options = {}) {
  const {
    scale = 1,
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 },
    castShadow = true,
    receiveShadow = true
  } = options;
  return {
    type: "gltf",
    needsMesh: true,
    assetKey,
    scale,
    position,
    rotation,
    castShadow,
    receiveShadow
  };
}

// src/components/movementState.js
import * as THREE14 from "three";
function createMovementState(velocity = new THREE14.Vector3(0, 0, 0), direction = new THREE14.Vector3(0, 0, 0), grounded = false, verticalVelocity = 0, speed = 0) {
  return {
    velocity: velocity.clone(),
    direction: direction.clone(),
    grounded,
    verticalVelocity,
    speed
  };
}

// src/components/stateMachine.js
function createStateMachine(definition) {
  if (!definition.initial || !definition.states[definition.initial]) {
    throw new Error(
      "State machine definition must have a valid initial state."
    );
  }
  return {
    ...definition,
    currentState: definition.initial,
    stateTime: 0
  };
}

// src/components/cameraDirection.js
import * as THREE15 from "three";
function createCameraDirection(forward = new THREE15.Vector3(0, 0, -1), right = new THREE15.Vector3(1, 0, 0)) {
  return {
    forward: forward.clone(),
    right: right.clone()
  };
}

// src/components/triggerComponents.js
function createTriggerDetector(radius = 1) {
  return {
    radius
  };
}
function createTriggerZone(type = "generic", radius = 1) {
  return {
    type,
    radius,
    currentlyInside: /* @__PURE__ */ new Set()
    // Track entity IDs currently inside this trigger zone
  };
}

// src/index.js
var engine = new GameSystems();
export {
  components_exports as CoreComponents,
  engine
};