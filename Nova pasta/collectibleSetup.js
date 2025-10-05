/**
 * COLLECTIBLE SETUP
 *
 * This module defines the collectible entities, their components, and the factory
 * for creating their physics bodies.
 */
import * as THREE from "three";
import { CoreComponents } from "rosebud-threejs-game-engine";
import { GAME_CONFIG } from "./config.js";
import { getTerrainHeight, createGLTFWithScaling, debugLog } from "./gameUtils.js";

const { createTransform, createTriggerZone } = CoreComponents;

// Note: Collectibles now use trigger zones instead of physics bodies
// for simpler and more reliable trigger detection

/**
 * Creates and places collectible entities in the world.
 * @param {World} world - ECS world instance.
 * @param {Object} dependencies - Required dependencies from the engine.
 */
export function setupCollectibles(world, { terrain }) {
  // Note: No physics factory needed - using trigger zones instead

  GAME_CONFIG.COLLECTIBLE_POSITIONS.forEach((pos, index) => {
    // Calculate terrain height at this position
    const terrainHeight = getTerrainHeight(terrain, pos.x, pos.z);
    const spawnY = Math.max(
      terrainHeight + GAME_CONFIG.COLLECTIBLES.HEIGHT_OFFSET,
      1.0
    );

    world.add({
      // --- TAG ---
      isCollectible: true,

      // --- DATA ---
      transform: createTransform(new THREE.Vector3(pos.x, spawnY, pos.z)),
      triggerZone: createTriggerZone("collectible", GAME_CONFIG.COLLECTIBLES.TRIGGER_RADIUS),
      renderable: createGLTFWithScaling("environment/key"),
    });
  });

  debugLog("✅ Created 3 Key collectibles");
}
