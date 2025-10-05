// Game configuration constants
export const GAME_CONFIG = {
  // Debug settings
  DEBUG: false,  // Set to true to enable console logs
  
  // Player movement settings
  PLAYER: {
    WALK_SPEED: 5.0,
    RUN_SPEED: 8.0,
    JUMP_STRENGTH: 7.0,
    CAPSULE_RADIUS: 0.5,
    CAPSULE_HEIGHT: 1.5,
    SPAWN_POSITION: { x: -8, y: 4, z: -22 },
    SPAWN_HEIGHT_OFFSET: 1.5,  // Lowered for better water interaction
  },

  // Collectible settings
  COLLECTIBLES: {
    RADIUS: 0.5,
    HEIGHT_OFFSET: 1.0,
    TRIGGER_RADIUS: 1.0,
  },

  // Camera settings
  CAMERA: {
    MIN_DISTANCE: 1,
    MAX_DISTANCE: 15,
    INITIAL_DISTANCE: 8,
    INITIAL_HEIGHT: 5,
    DAMPING_FACTOR: 0.05,
    LOOK_HEIGHT_OFFSET: 1, // How high above player to look
    SMOOTH_TIME: 0,
    INITIAL_OFFSET: { x: 0, y: 5, z: -8 },
    LOOK_OFFSET: { x: 0, y: 1, z: 0 },
    POINTER_LOCK: {
      ENABLED: false,
      TRIGGER: "click", // "click" | "keydown" | "manual"
      RELEASE: "esc", // "esc" | "keyup" | "manual"
    },
    MOUSE_SENSITIVITY: {
      LOOK: 1.0, // Mouse look sensitivity (rotation)
      ZOOM: 1.0, // Mouse-wheel zoom sensitivity
    },
  },

  // Physics settings
  PHYSICS: {
    GRAVITY: { x: 0.0, y: -9.81, z: 0.0 },
    CHARACTER_CONTROLLER_OFFSET: 0.01,  // Minimal collision offset
    AUTO_STEP_HEIGHT: 0.25,  // Allow climbing small steps
    AUTO_STEP_MIN_WIDTH: 0.1,
    SNAP_TO_GROUND_DISTANCE: 0,  // Disabled to debug positioning
    MAX_SLOPE_CLIMB_ANGLE: 45, // degrees
    MIN_SLOPE_SLIDE_ANGLE: 30, // degrees
  },
  // Costs
  COSTS: {
    PLANTING: 250, // Cost to plant one lot
    IRRIGATION: 500, // Cost to irrigate one lot
    VINASSE: 400, // Cost to apply vinasse to one lot
  },
  // Terrain settings
  TERRAIN: {
    // Voxel world dimensions
    BLOCK_SIZE: 2,
    WIDTH: 50,
    DEPTH: 50,
    MAX_HEIGHT: 8,
    // Block types and visual properties
    BLOCK_TYPES: {
      AIR: 0,
      DIRT: 1,
      GRASS: 2,
      STONE: 3,
      SAND: 4,
      GRAVEL: 5,
      WATER: 6,
    },
    BLOCK_COLORS: {
      1: 0x8B4513, // Rich brown - dirt
      2: 0x556B2F, // Dark Olive Green for sugarcane-like grass
      3: 0x708090, // Cool slate gray - stone
      4: 0xD2B48C, // Tan - for sand
      5: 0xA0522D, // Sienna - for a reddish dirt/gravel look
      6: 0x4682B4, // Steel blue - more professional water
    },
    ROUGHNESS: 0.8,
    METALNESS: 0.1,
    // Procedural generation parameters
    HEIGHT_SCALE: 0.5, // Flatter terrain
    NOISE_SCALE: 0.04,
    NOISE_OCTAVES: 3,
    NOISE_PERSISTENCE: 0.3,
    NOISE_LACUNARITY: 1.8,
    NOISE_SEED: 12345,
    NOISE_AMPLITUDE: 0.4, // Less extreme hills
    WATER_LEVEL: 3,
  },

  // Rendering settings
  RENDERER: {
    ANTIALIAS: true,
  },

  // Lighting settings
  LIGHTING: {
    // Environment-based lighting (HDRI provides ambient)
    AMBIENT_COLOR: 0xffffff,
    AMBIENT_INTENSITY: 0.2, // Reduced since HDRI provides environment light
    DIRECTIONAL_COLOR: 0xfff5e6, // Warm sun color
    DIRECTIONAL_INTENSITY: 1.2, // Increased for Nintendo-style contrast
    DIRECTIONAL_POSITION: { x: 50, y: 100, z: 50 },
    
    // Additional lights for Nintendo-style vibrant look
    FILL_LIGHT: {
      color: 0x87ceeb, // Cool blue fill light
      intensity: 0.3,
      position: { x: -30, y: 50, z: -30 },
    },
    
    // Environment mapping
    ENVIRONMENT_INTENSITY: 1.0,
    ENVIRONMENT_ROTATION: 0,
  },

  // Shadow settings (shared between renderer and lighting)
  SHADOWS: {
    ENABLED: true,
    MAP_SIZE: 4096, // Higher resolution for cleaner shadows
    CAMERA_SIZE: 80, // Smaller area for better quality
    CAMERA_NEAR: 1,
    CAMERA_FAR: 200, // Reduced range to prevent artifacts
    SOFT_SHADOWS: true,
    BIAS: -0.0005, // Prevent shadow acne
    NORMAL_BIAS: 0.02, // Additional artifact prevention
  },

  // Scene settings
  SCENE: {
    FOV: 75,
    NEAR: 0.1,
    FAR: 2000,
  },

  // Skybox settings
  SKYBOX: {
    path: "https://play.rosebud.ai/assets/sky_28_2k.png?FcMB",
  },

  // Asset management
  assets: [
    // Characters
    { key: "characters/farmer", url: "https://play.rosebud.ai/assets/Farmer.glb?um9w" },
    
    // Farm Assets
    { key: "environment/mill", url: "https://play.rosebud.ai/assets/building.glb?4XAh" },
    { key: "animals/cow", url: "https://play.rosebud.ai/assets/Horse.gltf?Fikb" }, // Using horse as a placeholder for cow
    { key: "animals/pig", url: "https://play.rosebud.ai/assets/Pig.gltf?G0Tz" },
    // Environment Objects
    { key: "environment/tree1", url: "https://play.rosebud.ai/assets/Tree_1.gltf?RjdS" },
    { key: "environment/tree2", url: "https://play.rosebud.ai/assets/Tree_2.gltf?DZPu" },
    { key: "environment/rock1", url: "https://play.rosebud.ai/assets/Rock1.gltf?Wth4" },
    { key: "environment/sugarcane", url: "https://play.rosebud.ai/assets/Grass_Big.gltf?mtIL" }, // Using big grass for sugarcane
    { key: "environment/flowers", url: "https://play.rosebud.ai/assets/Flowers_1.gltf?vfuK" },
    
    // Treasure assets
  ],

  // Asset scaling configuration
  ASSETS: {
    SCALING: {
      "characters/farmer": { scale: 1.0, offsetY: -1.25 },
      "animals/cow": { scale: 1.2, offsetY: 0, rotation: { x: 0, y: Math.PI / 3, z: 0 } },
      "animals/pig": { scale: 1.0, offsetY: 0, rotation: { x: 0, y: -Math.PI / 4, z: 0 } },
      "environment/tree1": { scale: 1.0, offsetY: 0 },
      "environment/tree2": { scale: 1.0, offsetY: 0 },
      "environment/rock1": { scale: 1.0, offsetY: 0 },
      "environment/sugarcane": { scale: 1.5, offsetY: 0 },
      "environment/flowers": { scale: 1.0, offsetY: 0 },
      "environment/mill": { scale: 9.0, offsetY: 0, rotation: { x: 0, y: Math.PI, z: 0 } },
    },
  },

  // --- DYNAMIC OBJECTS (PLANTED/REMOVED) ---
  SUGARCANE_PLOTS: [
    ...Array.from({ length: 25 }, (_, i) => ({ type: "environment/sugarcane", position: { x: 20 + (i % 5) * 3, z: -15 + Math.floor(i / 5) * 3 } })),
    ...Array.from({ length: 30 }, (_, i) => ({ type: "environment/sugarcane", position: { x: -30 + (i % 6) * 3, z: 5 + Math.floor(i / 6) * 4 } })),
    ...Array.from({ length: 20 }, (_, i) => ({ type: "environment/sugarcane", position: { x: -8 + (i % 5) * 3, z: -25 + Math.floor(i / 5) * 3 } })),
    ...Array.from({ length: 15 }, (_, i) => ({ type: "environment/sugarcane", position: { x: 5 + (i % 5) * 4, z: 25 + Math.floor(i / 5) * 3 } })),
  ],
  
  // --- STATIC, PERMANENT OBJECTS ---
  STATIC_ENVIRONMENT_OBJECTS: [
    // --- Boundary Trees & Details ---
    { type: "environment/tree1", position: { x: 38, z: 2 } },
    { type: "environment/tree2", position: { x: -33, z: -5 } },
    { type: "environment/tree1", position: { x: 0, z: 33 } },
    { type: "environment/rock1", position: { x: -12, z: -28 } },
    { type: "environment/flowers", position: { x: -7, z: -18 } },
    
    // --- Farm Animals ---
    { type: "animals/cow", position: { x: 18, z: 10 } },
    { type: "animals/cow", position: { x: 22, z: 8 } },
    { type: "animals/cow", position: { x: 20, z: 13 } },
    { type: "animals/pig", position: { x: 15, z: -2 } },
  ],
  // Collectible positions
  COLLECTIBLE_POSITIONS: [],
};

export default GAME_CONFIG;