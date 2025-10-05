/**
 * ENVIRONMENT OBJECTS SETUP
 *
 * This module defines manually placed environment objects like trees, rocks,
 * and other scenery. It also includes functions to dynamically create and
 * remove the sugarcane fields as part of the game cycle.
 */
import * as THREE from "three";
import { CoreComponents } from "rosebud-threejs-game-engine";
import { GAME_CONFIG } from "./config.js";
import { getTerrainHeight, createGLTFWithScaling, debugLog } from "./gameUtils.js";

const { createTransform } = CoreComponents;

/**
 * Creates and places environment objects in the world.
 * @param {World} world - ECS world instance.
 * @param {Object} dependencies - Required dependencies from the engine.
 */
export function setupEnvironmentObjects(world, { terrain, physics }) {
  debugLog("🌳 Setting up environment objects...");

  // Mesh collision factory that waits for GLTF to load
  physics.registerBodyFactory("isMeshCollider", (entity, { physicsWorld, RAPIER }) => {
    const { position } = entity.transform;
    const renderable = entity.renderable;
    
    // Get initial rotation from renderable component
    const rotation = entity.renderable?.rotation || { x: 0, y: 0, z: 0 };
    
    // Check if mesh is loaded
    if (!renderable.mesh) {
      debugLog("❌ Mesh not loaded yet for collision, skipping: " + entity.renderable.assetKey);
      return null; // Return null to try again later
    }
    
    debugLog("Creating mesh collision for: " + entity.renderable.assetKey);
    
    // Extract geometry from loaded GLTF mesh
    let vertices = null;
    let indices = null;
    
    renderable.mesh.traverse((child) => {
      if (child.isMesh && child.geometry && !vertices) {
        const geometry = child.geometry;
        
        // Apply scale transformation to vertices
        const scale = renderable.scale || 1;
        const tempVertices = geometry.attributes.position.array.slice();
        
        // Scale vertices if needed
        if (scale !== 1) {
          for (let i = 0; i < tempVertices.length; i += 3) {
            tempVertices[i] *= scale;     // x
            tempVertices[i + 1] *= scale; // y
            tempVertices[i + 2] *= scale; // z
          }
        }
        
        // Apply rotation to vertices if needed
        if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
          const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
          for (let i = 0; i < tempVertices.length; i += 3) {
            const vertex = new THREE.Vector3(tempVertices[i], tempVertices[i + 1], tempVertices[i + 2]);
            vertex.applyMatrix4(rotationMatrix);
            tempVertices[i] = vertex.x;
            tempVertices[i + 1] = vertex.y;
            tempVertices[i + 2] = vertex.z;
          }
        }
        
        vertices = tempVertices;
        indices = geometry.index ? geometry.index.array.slice() : null;
        
      }
    });
    
    if (!vertices) {
      if (GAME_CONFIG.DEBUG) {
        console.warn("No geometry found in mesh for collision:", entity.renderable.assetKey);
        console.log("Mesh structure:", renderable.mesh);
      }
      return null;
    }
    
    // Create physics body without rotation (visual handles rotation)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const rigidBody = physicsWorld.createRigidBody(bodyDesc);
    
    // Create trimesh collider from actual mesh geometry
    const colliderDesc = indices 
      ? RAPIER.ColliderDesc.trimesh(vertices, indices)
      : RAPIER.ColliderDesc.convexHull(vertices);
      
    const collider = physicsWorld.createCollider(colliderDesc, rigidBody);
    
    debugLog("Created mesh collision for: " + entity.renderable.assetKey);
    
    return { rigidBody, collider };
  });

  // Place static objects that are always present
  GAME_CONFIG.STATIC_ENVIRONMENT_OBJECTS.forEach((objData) => {
    placeObject(world, terrain, objData);
  });
  debugLog(`✅ Created static environment with ${GAME_CONFIG.STATIC_ENVIRONMENT_OBJECTS.length} objects`);
  // --- Add Procedural Brazilian Flag ---
  const flagBasePosition = { x: 6, y: terrain.getTerrainHeightAt(6, 12), z: 12 };
  // Flagpole
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(flagBasePosition.x, flagBasePosition.y + 5, flagBasePosition.z)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 0.2, height: 10, depth: 0.2 },
      { type: "standard", color: 0x808080, roughness: 0.5, metalness: 0.5 }
    ),
  });
  // Flag parts
  const flagY = flagBasePosition.y + 9.5;
  // Green background
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(flagBasePosition.x, flagY, flagBasePosition.z + 1.5)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 0.1, height: 2, depth: 3 },
      { type: "standard", color: 0x009c3b, roughness: 0.9, metalness: 0.1 }
    ),
  });
  // Yellow rhombus (approximated with a square)
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(flagBasePosition.x, flagY, flagBasePosition.z + 1.5)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 0.12, height: 1.5, depth: 1.5 },
      { type: "standard", color: 0xffdf00, roughness: 0.9, metalness: 0.1 }
    ),
  });
  // Blue circle (approximated with a square)
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(flagBasePosition.x, flagY, flagBasePosition.z + 1.5)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 0.14, height: 0.8, depth: 0.8 },
      { type: "standard", color: 0x002776, roughness: 0.9, metalness: 0.1 }
    ),
  });
  // --- Add Procedural Solar Panels ---
  debugLog("☀️ Adding solar panels...");
  const panelPositions = [
    { x: 5, z: -2 },
    { x: 5, z: 2 },
    { x: 5, z: 6 },
  ];
  panelPositions.forEach(pos => {
    const groundY = terrain.getTerrainHeightAt(pos.x, pos.z);
    // Create a container for the panel parts
    const panelGroup = new THREE.Group();
    panelGroup.position.set(pos.x, groundY, pos.z);
    // Panel
    const panelGeo = new THREE.BoxGeometry(3, 0.2, 4);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x050522, roughness: 0.1, metalness: 0.4 });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    panelMesh.rotation.x = -Math.PI / 6; // Angled at 30 degrees
    panelMesh.position.y = 1.5;
    panelGroup.add(panelMesh);
    
    // Support Leg
    const legGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5, metalness: 0.8 });
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.y = 0.75;
    panelGroup.add(legMesh);
    world.add({
      isEnvironmentObject: true,
      isSolarPanel: true,
      transform: createTransform(new THREE.Vector3(pos.x, groundY, pos.z)),
      renderable: {
        type: "custom",
        mesh: panelGroup,
      }
    });
  });
  // --- Add Procedural Brazilian-style Farmhouse ---
  debugLog("🏡 Building Brazilian-style farmhouse...");
  const houseCenter = { x: 11, z: 14 };
  const groundY = terrain.getTerrainHeightAt(houseCenter.x, houseCenter.z);
  // Main building
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(houseCenter.x, groundY + 4, houseCenter.z)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 16, height: 8, depth: 10 },
      { type: "standard", color: 0xF5F5DC, roughness: 0.9, metalness: 0.0 } // Whitewash (Beige)
    ),
  });
  // Main roof
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(houseCenter.x, groundY + 8.25, houseCenter.z)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 17, height: 0.5, depth: 11 },
      { type: "standard", color: 0xB22222, roughness: 0.8, metalness: 0.1 } // Terracotta
    ),
  });
  // Veranda floor
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(houseCenter.x, groundY + 0.25, houseCenter.z)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 20, height: 0.5, depth: 14 },
      { type: "standard", color: 0x8B4513, roughness: 0.8, metalness: 0.1 } // Dark Wood
    ),
  });
  // Veranda roof
  world.add({
    isEnvironmentObject: true,
    transform: createTransform(new THREE.Vector3(houseCenter.x, groundY + 3.5, houseCenter.z)),
    renderable: CoreComponents.createRenderableMetadata(
      "procedural",
      { type: "box", width: 20, height: 0.5, depth: 14 },
      { type: "standard", color: 0xB22222, roughness: 0.8, metalness: 0.1 } // Terracotta
    ),
  });
  // Veranda support posts
  const postPositions = [
    { x: -9.5, z: -6.5 }, { x: 9.5, z: -6.5 },
    { x: -9.5, z: 0 },    { x: 9.5, z: 0 },
    { x: -9.5, z: 6.5 },  { x: 9.5, z: 6.5 },
    { x: -4.5, z: -6.5 }, { x: 4.5, z: -6.5 },
    { x: -4.5, z: 6.5 },  { x: 4.5, z: 6.5 },
    { x: 0, z: -6.5 },    { x: 0, z: 6.5 },
  ];
  postPositions.forEach(pos => {
    world.add({
      isEnvironmentObject: true,
      transform: createTransform(new THREE.Vector3(houseCenter.x + pos.x, groundY + 1.75, houseCenter.z + pos.z)),
      renderable: CoreComponents.createRenderableMetadata(
        "procedural",
        { type: "box", width: 0.4, height: 3, depth: 0.4 },
        { type: "standard", color: 0x8B4513, roughness: 0.8, metalness: 0.1 } // Dark Wood
      ),
    });
  });
}
function placeObject(world, terrain, objData) {
    const terrainHeight = getTerrainHeight(terrain, objData.position.x, objData.position.z);
    const spawnY = terrainHeight;
    const needsCollision = !objData.type.includes("sugarcane") && !objData.type.includes("flowers");
    
    const entityData = {
        isEnvironmentObject: true,
        transform: createTransform(
            new THREE.Vector3(objData.position.x, spawnY, objData.position.z)
        ),
        renderable: createGLTFWithScaling(objData.type, {
            position: { x: 0, y: 0, z: 0 },
        }),
    };
    if (needsCollision) {
        entityData.isMeshCollider = true;
    }
    if (objData.type.includes("sugarcane")) {
        entityData.isSugarcane = true; // Tag for easy removal
    }
    world.add(entityData);
}
export function createSugarcane(world, terrain, preSeasonDecisions) {
    const plotsByLot = {
        1: GAME_CONFIG.SUGARCANE_PLOTS.slice(0, 25),
        2: GAME_CONFIG.SUGARCANE_PLOTS.slice(25, 55),
        3: GAME_CONFIG.SUGARCANE_PLOTS.slice(55, 75),
        4: GAME_CONFIG.SUGARCANE_PLOTS.slice(75),
    };
    for (const lotId in preSeasonDecisions) {
        const decision = preSeasonDecisions[lotId];
        if (decision === 'PLANT' || decision === 'PLANT_IRRIGATE') {
            const plotsToPlant = plotsByLot[lotId];
            if (plotsToPlant) {
                plotsToPlant.forEach(plotData => {
                    placeObject(world, terrain, plotData);
                });
            }
        }
    }
}
export function removeSugarcane(world) {
    const sugarcaneQuery = world.with("isSugarcane");
    for (const entity of sugarcaneQuery) {
        world.remove(entity);
    }
    debugLog("🌾 All sugarcane has been harvested and removed.");
}