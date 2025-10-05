/**
 * TERRAIN SYSTEM SETUP
 *
 * This file orchestrates the creation of the terrain, turning the raw data
 * from the generator into renderable visuals and physical colliders.
 */

import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";
import { TerrainData, TerrainUtils } from "./terrainData.js";
import { TerrainDataGenerator } from "./terrainDataGenerator.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

// Block types and colors from config
const BLOCK_TYPES = GAME_CONFIG.TERRAIN.BLOCK_TYPES;
const BLOCK_COLORS = GAME_CONFIG.TERRAIN.BLOCK_COLORS;
const BLOCK_SIZE = GAME_CONFIG.TERRAIN.BLOCK_SIZE;

// --- Terrain Factories ---

/**
 * Creates a single, efficient trimesh collider for the entire terrain.
 * @param {Object} entity - The entity to create the body for.
 * @param {Object} context - Engine context.
 * @param {RAPIER.World} context.physicsWorld - The Rapier world.
 * @param {RAPIER} context.RAPIER - The Rapier library instance.
 * @returns {Object} A physicsBody component structure.
 */
function gameTerrainColliderFactory(entity, { physicsWorld, RAPIER }) {
  const { collisionGeometry } = entity.isTerrain;
  if (!collisionGeometry) return null;

  const vertices = collisionGeometry.attributes.position.array;
  const indices = collisionGeometry.index.array;

  const bodyDesc = RAPIER.RigidBodyDesc.fixed();
  const rigidBody = physicsWorld.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
  const collider = physicsWorld.createCollider(colliderDesc, rigidBody);

  return { rigidBody, collider };
}

/**
 * Creates custom water surface geometry (top faces only)
 * @param {Array} waterBlocks - Array of water block positions
 * @param {TerrainData} terrainData - Terrain data for positioning
 * @returns {THREE.BufferGeometry} Water surface geometry
 */
function createWaterSurfaceGeometry(waterBlocks, terrainData) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  
  let vertexIndex = 0;
  
  waterBlocks.forEach(block => {
    const worldPos = TerrainUtils.gridToWorld(block.x, block.y, block.z, terrainData);
    const halfSize = BLOCK_SIZE / 2;
    
    // Create top face only (4 vertices)
    const topY = worldPos.y + halfSize;
    
    // Top face vertices (counter-clockwise from top view)
    positions.push(
      worldPos.x - halfSize, topY, worldPos.z - halfSize, // 0: back-left
      worldPos.x + halfSize, topY, worldPos.z - halfSize, // 1: back-right
      worldPos.x + halfSize, topY, worldPos.z + halfSize, // 2: front-right
      worldPos.x - halfSize, topY, worldPos.z + halfSize  // 3: front-left
    );
    
    // Normals (pointing up)
    for (let i = 0; i < 4; i++) {
      normals.push(0, 1, 0);
    }
    
    // UVs
    uvs.push(
      0, 0, // back-left
      1, 0, // back-right
      1, 1, // front-right
      0, 1  // front-left
    );
    
    // Indices for two triangles making a quad
    const baseIndex = vertexIndex;
    indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2, // First triangle
      baseIndex, baseIndex + 2, baseIndex + 3  // Second triangle
    );
    
    vertexIndex += 4;
  });
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  return geometry;
}

/**
 * Creates and manages the visual meshes for the terrain.
 * @param {Object} entity - The entity to create the mesh for.
 * @returns {THREE.Group} A group containing all the meshes.
 */
function gameInstancedMeshFactory(entity) {
  const { terrainData } = entity.renderable;
  const container = new THREE.Group();
  container.name = "terrain-visuals";

  const blocksByType = terrainData.getBlocksByType();
  
  // Handle water separately with custom surface geometry
  if (blocksByType[BLOCK_TYPES.WATER] && blocksByType[BLOCK_TYPES.WATER].length > 0) {
    console.log("🌊 Creating water surface geometry...");
    const waterGeometry = createWaterSurfaceGeometry(blocksByType[BLOCK_TYPES.WATER], terrainData);
    
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: BLOCK_COLORS[BLOCK_TYPES.WATER],
      roughness: 0.0, // Mirror-like water
      metalness: 0.0,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide, // Ensure visibility from both sides
    });
    
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.receiveShadow = true;
    waterMesh.castShadow = false; // Water doesn't cast shadows
    waterMesh.name = "water-surface";
    container.add(waterMesh);
  }

  // Handle solid blocks with instanced geometry
  const solidGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  const solidMeshes = {};
  
  Object.values(BLOCK_TYPES).forEach((blockType) => {
    if (blockType === BLOCK_TYPES.AIR || blockType === BLOCK_TYPES.WATER) return;

    const isGrass = blockType === BLOCK_TYPES.GRASS;
    const isSand = blockType === BLOCK_TYPES.SAND;
    
    let materialProps = {
      color: BLOCK_COLORS[blockType],
      roughness: GAME_CONFIG.TERRAIN.ROUGHNESS,
      metalness: GAME_CONFIG.TERRAIN.METALNESS,
    };
    
    // Professional material properties for different block types
    if (isGrass) {
      materialProps = {
        ...materialProps,
        roughness: 0.8, // Natural grass texture
        metalness: 0.0,
      };
    } else if (isSand) {
      materialProps = {
        ...materialProps,
        roughness: 0.95, // Very rough sand
        metalness: 0.0,
      };
    } else {
      // General blocks - professional look
      materialProps = {
        ...materialProps,
        roughness: 0.7,
        metalness: 0.1,
      };
    }
    
    const material = new THREE.MeshStandardMaterial(materialProps);
    const maxInstances =
      terrainData.getDimensions().width *
      terrainData.getDimensions().height *
      terrainData.getDimensions().depth;
    const instancedMesh = new THREE.InstancedMesh(
      solidGeometry,
      material,
      maxInstances
    );
    instancedMesh.count = 0;
    instancedMesh.receiveShadow = true;
    instancedMesh.castShadow = true;
    solidMeshes[blockType] = instancedMesh;
    container.add(instancedMesh);
  });

  // Position solid blocks
  const matrix = new THREE.Matrix4();
  Object.entries(blocksByType).forEach(([blockType, blocks]) => {
    if (blockType == BLOCK_TYPES.WATER) return; // Skip water - handled separately
    
    const mesh = solidMeshes[blockType];
    if (!mesh) return;
    
    blocks.forEach((block, index) => {
      const worldPos = TerrainUtils.gridToWorld(
        block.x,
        block.y,
        block.z,
        terrainData
      );
      matrix.setPosition(worldPos.x, worldPos.y, worldPos.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = blocks.length;
    mesh.instanceMatrix.needsUpdate = true;
  });

  console.log("✅ Terrain meshes created with custom water surface");
  return container;
}

/**
 * Creates the merged geometry for the terrain collider.
 * This is separated so the geometry can be shared between the physics factory
 * and the camera collision setup.
 * @param {TerrainData} terrainData
 * @returns {THREE.BufferGeometry | null}
 */
function createCollisionGeometry(terrainData) {
  const solidBlocks = terrainData.getSolidBlocks();
  if (solidBlocks.length === 0) return null;

  const geometries = [];
  const tempGeometry = new THREE.BoxGeometry(
    BLOCK_SIZE,
    BLOCK_SIZE,
    BLOCK_SIZE
  );

  solidBlocks.forEach((block) => {
    const worldPos = TerrainUtils.gridToWorld(
      block.x,
      block.y,
      block.z,
      terrainData
    );
    const blockGeometry = tempGeometry.clone();
    blockGeometry.translate(worldPos.x, worldPos.y, worldPos.z);
    geometries.push(blockGeometry);
  });

  return BufferGeometryUtils.mergeGeometries(geometries);
}

/**
 * Standardized terrain setup function. This now returns a resource object.
 * @param {World} world - ECS world instance
 * @param {Object} dependencies - Required dependencies
 * @returns {Object} The terrain resource to be registered with the engine.
 */
export function setupGameTerrain(world, { physics, renderer }) {
  // 1. Register the custom factories
  physics.registerBodyFactory("isTerrain", gameTerrainColliderFactory);
  renderer.registerMeshFactory("instancedTerrain", gameInstancedMeshFactory);

  // 2. Generate the core terrain data
  const terrainData = new TerrainData();
  TerrainDataGenerator.generate(terrainData, {});

  // 3. Create the collision geometry
  const collisionGeometry = createCollisionGeometry(terrainData);

  // 4. Create a single terrain entity
  world.add({
    isTerrain: { terrainData, collisionGeometry }, // Pass geometry to the factory
    renderable: {
      type: "instancedTerrain",
      needsMesh: true,
      terrainData: terrainData,
    },
  });

  // 5. Return the terrain resource object for other systems to use
  return {
    terrainData: terrainData,
    getTerrainHeightAt: (worldX, worldZ) => TerrainUtils.getTerrainHeightAt(terrainData, worldX, worldZ),
    // Also expose the raw data for other potential uses
    instance: {
        terrainData: terrainData,
        getTerrainHeightAt: (worldX, worldZ) => TerrainUtils.getTerrainHeightAt(terrainData, worldX, worldZ),
        markPlantedLots: (preSeasonDecisions, world, renderer) => {
            const terrainEntity = world.find(e => e.isTerrain);
            if (!terrainEntity || !terrainEntity.renderable || !terrainEntity.renderable.mesh || !renderer) return;
            terrainData.updateLotVisuals(preSeasonDecisions, true);
            const newMeshContainer = renderer.getMeshFactory("instancedTerrain")(terrainEntity, { terrainData: terrainData });
            
            renderer.scene.remove(terrainEntity.renderable.mesh);
            renderer.scene.add(newMeshContainer);
            terrainEntity.renderable.mesh = newMeshContainer;
        },
        unmarkAllLots: (world, renderer) => {
            const terrainEntity = world.find(e => e.isTerrain);
            if (!terrainEntity || !terrainEntity.renderable || !terrainEntity.renderable.mesh || !renderer) return;
            terrainData.updateLotVisuals({}, false); // Empty decisions, unmark all
            
            const newMeshContainer = renderer.getMeshFactory("instancedTerrain")(terrainEntity, { terrainData: terrainData });
            
            renderer.scene.remove(terrainEntity.renderable.mesh);
            renderer.scene.add(newMeshContainer);
            terrainEntity.renderable.mesh = newMeshContainer;
        }
    }
  };
}
