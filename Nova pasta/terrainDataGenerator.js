/**
 * TERRAIN DATA GENERATOR
 *
 * Pure procedural generation algorithms for terrain data.
 * No side effects, no rendering, no physics - just algorithms.
 * Operates on TerrainData instances using dependency injection.
 */

import { GAME_CONFIG } from "./config.js";
import { createNoise2D } from "simplex-noise";

// Block types from config
const BLOCK_TYPES = GAME_CONFIG.TERRAIN.BLOCK_TYPES;

/**
 * TerrainDataGenerator - Pure algorithmic terrain generation
 */
export class TerrainDataGenerator {
  /**
   * Generate terrain using simple single-octave noise
   * @param {TerrainData} terrainData - Target terrain data instance
   * @param {Object} config - Generation configuration
   */
  static generateTerrain(terrainData, config = {}) {
    const {
      heightScale = GAME_CONFIG.TERRAIN.HEIGHT_SCALE,
      noiseScale = GAME_CONFIG.TERRAIN.NOISE_SCALE,
      seed = GAME_CONFIG.TERRAIN.NOISE_SEED,
      noiseAmplitude = GAME_CONFIG.TERRAIN.NOISE_AMPLITUDE,
    } = config;

    const { width, height, depth } = terrainData.getDimensions();
    const noise2D = createNoise2D(() => seed);

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const sampleX = (x - width / 2) * noiseScale;
        const sampleZ = (z - depth / 2) * noiseScale;
        const noiseValue = noise2D(sampleX, sampleZ);

        const baseHeight = Math.floor(height * heightScale);
        const variation = Math.floor(noiseValue * height * noiseAmplitude * 0.5);
        const terrainHeight = Math.max(1, baseHeight + variation);

        for (let y = 0; y < terrainHeight && y < height; y++) {
          const blockType = this.selectBlockType(x, y, z, terrainHeight, noise2D);
          terrainData.setBlock(x, y, z, blockType);
        }
      }
    }
  }

  /**
   * Select appropriate block type based on position and terrain characteristics
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} z - Grid Z coordinate
   * @param {number} terrainHeight - Height of terrain column at this position
   * @param {Function} noise2D - Noise function for additional variation
   * @returns {number} Block type ID
   */
  static selectBlockType(x, y, z, terrainHeight, noise2D) {
    const heightRatio = y / terrainHeight;
    const materialNoise = noise2D(x * 0.03, z * 0.03);
    // Surface layer - prioritize grass for a lush countryside feel
    if (y === terrainHeight - 1) {
      if (y < GAME_CONFIG.TERRAIN.WATER_LEVEL + 2) return BLOCK_TYPES.SAND; // Sandy shores near water
      if (materialNoise > 0.5) return BLOCK_TYPES.GRAVEL; // Small patches of gravel
      return BLOCK_TYPES.GRASS;
    }
    // Subsurface is mostly dirt
    if (heightRatio > 0.4) {
      return BLOCK_TYPES.DIRT;
    }
    // Deeper layers have some stone
    return materialNoise > 0.3 ? BLOCK_TYPES.STONE : BLOCK_TYPES.DIRT;
  }

  /**
   * Clear terrain data
   * @param {TerrainData} terrainData
   */
  static clearTerrain(terrainData) {
    terrainData.clear();
  }

  /**
   * Fill low areas with water up to the water level
   * @param {TerrainData} terrainData - Target terrain data instance
   * @param {Object} config - Generation configuration
   */
  static generateWater(terrainData, config = {}) {
    const waterLevel = config.waterLevel || GAME_CONFIG.TERRAIN.WATER_LEVEL;
    const { width, height, depth } = terrainData.getDimensions();

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Find the top solid block in this column
        let topSolidY = -1;
        for (let y = height - 1; y >= 0; y--) {
          if (terrainData.getBlock(x, y, z) !== BLOCK_TYPES.AIR) {
            topSolidY = y;
            break;
          }
        }

        // Only add water if the terrain surface is below the water level
        // This prevents water from appearing on elevated areas
        if (topSolidY >= 0 && topSolidY < waterLevel) {
          // Fill with water from top solid block + 1 up to water level
          for (let y = topSolidY + 1; y <= waterLevel && y < height; y++) {
            if (terrainData.getBlock(x, y, z) === BLOCK_TYPES.AIR) {
              terrainData.setBlock(x, y, z, BLOCK_TYPES.WATER);
            }
          }
        }
      }
    }
  }

  /**
   * Generate complete terrain with noise-based landscape and water features.
   * This is the primary generation method for the template.
   * @param {TerrainData} terrainData
   * @param {Object} config - Additional configuration for generation.
   */
  static generate(terrainData, config = {}) {
    // Clear existing terrain first
    this.clearTerrain(terrainData);

    // Generate the terrain shape with simplex noise
    this.generateTerrain(terrainData, config);

    // Add water to only the lowest areas
    this.generateWater(terrainData, config);
  }
}
