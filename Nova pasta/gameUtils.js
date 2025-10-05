// Shared utility functions to reduce code duplication
import { CoreComponents } from "rosebud-threejs-game-engine";
import { GAME_CONFIG } from "./config.js";

const { createGLTFRenderable } = CoreComponents;

export function getTerrainHeight(terrain, x, z) {
  // The terrain object can be passed in two shapes. This handles both.
  if (terrain && typeof terrain.getTerrainHeightAt === 'function') {
    return terrain.getTerrainHeightAt(x, z);
  }
  if (terrain?.instance && typeof terrain.instance.getTerrainHeightAt === 'function') {
    return terrain.instance.getTerrainHeightAt(x, z);
  }
  return 0;
}

export function getAssetScaling(assetKey) {
  const scaling = GAME_CONFIG.ASSETS.SCALING[assetKey] || {};
  return {
    scale: scaling.scale || 1.0,
    offsetY: scaling.offsetY || 0,
    rotation: scaling.rotation || { x: 0, y: 0, z: 0 }
  };
}

export function createGLTFWithScaling(assetKey, extraOptions = {}) {
  const scaling = getAssetScaling(assetKey);
  
  return createGLTFRenderable(assetKey, {
    type: "gltf",
    scale: scaling.scale,
    position: {
      x: 0,
      y: scaling.offsetY,
      z: 0,
    },
    rotation: scaling.rotation,
    castShadow: true,
    receiveShadow: true,
    ...extraOptions
  });
}

export function debugLog(message) {
  if (GAME_CONFIG.DEBUG) console.log(message);
}