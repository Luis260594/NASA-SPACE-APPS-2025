import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";


/**
 * ECS-based skybox setup - simplified approach
 */
export function setupSkybox(world, { renderer }) {
  const skyboxConfig = GAME_CONFIG.SKYBOX || {};
  
  if (!skyboxConfig.path) {
    if (GAME_CONFIG.DEBUG) console.warn("No skybox configured");
    return {};
  }
  
  // Create skybox entity with direct renderer access via closure
  const skyboxEntity = world.add({
    isSkybox: {
      imagePath: skyboxConfig.path,
      loaded: false,
      failed: false,
      texture: null
    }
  });
  
  // Load and apply skybox directly (ECS entity for tracking, direct application for reliability)
  const loader = new THREE.TextureLoader();
  
  console.log("🖼️ Loading skybox image:", skyboxConfig.path);
  
  loader.load(
    skyboxConfig.path,
    (texture) => {
      console.log("✅ Skybox texture loaded successfully");
      
      // Configure texture for equirectangular projection
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // Apply skybox immediately
      if (renderer && renderer.scene) {
        console.log("🎨 Applying skybox to scene...");
        renderer.scene.background = texture;
        renderer.scene.environment = texture;
        
        // Add fog for atmosphere
        if (!renderer.scene.fog) {
          renderer.scene.fog = new THREE.Fog(0xb0c4de, 150, 600);
          console.log("🌫️ Added fog");
        }
        
        // Reset tone mapping
        if (renderer.renderer) {
          renderer.renderer.toneMapping = THREE.NoToneMapping;
          renderer.renderer.toneMappingExposure = 1.0;
          renderer.renderer.outputColorSpace = THREE.SRGBColorSpace;
          console.log("🎨 Reset tone mapping");
        }
        
        console.log("✅ Skybox fully applied to scene");
      }
      
      // Update entity state
      skyboxEntity.isSkybox.texture = texture;
      skyboxEntity.isSkybox.loaded = true;
    },
    undefined,
    (error) => {
      console.error("❌ Failed to load skybox image:", error);
      skyboxEntity.isSkybox.failed = true;
    }
  );
  
  if (GAME_CONFIG.DEBUG) console.log("✨ ECS Skybox initialized");
  return {};
}

