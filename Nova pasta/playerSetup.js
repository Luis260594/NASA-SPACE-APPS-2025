/**
 * PLAYER SETUP
 *
 * This module defines the player entity, its components, and the factory
 * for creating its physics body. It follows the new declarative pattern.
 */
import * as THREE from "three";
import { CoreComponents } from "rosebud-threejs-game-engine";
import { GAME_CONFIG } from "./config.js";
import { getTerrainHeight, getAssetScaling } from "./gameUtils.js";

const {
  createCameraDirection,
  createTransform,
  createMovementState,
  createGLTFRenderable,
  createStateMachine,
  createRenderableMetadata,
  createTriggerDetector,
} = CoreComponents;

// --- Player State Machine Definition ---
const playerStateMachineDefinition = {
  initial: "idle",
  states: {
    idle: {
      animation: "CharacterArmature|Idle",
      transitions: [
        {
          to: "airborne",
          when: { property: "grounded", is: "===", than: false },
        },
        { to: "run", when: { property: "speed", is: ">", than: 4.0 } },
        { to: "walk", when: { property: "speed", is: ">", than: 0.5 } },
      ],
    },
    walk: {
      animation: "CharacterArmature|Walk",
      transitions: [
        {
          to: "airborne",
          when: { property: "grounded", is: "===", than: false },
        },
        { to: "run", when: { property: "speed", is: ">", than: 4.0 } },
        { to: "idle", when: { property: "speed", is: "<", than: 0.5 } },
      ],
    },
    run: {
      animation: "CharacterArmature|Run",
      transitions: [
        {
          to: "airborne",
          when: { property: "grounded", is: "===", than: false },
        },
        { to: "walk", when: { property: "speed", is: "<", than: 4.0 } },
      ],
    },
    airborne: {
      animation: "CharacterArmature|Idle", // Fallback animation
      transitions: [
        { to: "idle", when: { property: "grounded", is: "===", than: true } },
      ],
    },
  },
};

// --- Player Physics Body Factory ---

/**
 * This factory function contains the logic for creating the player's
 * specific physics body and collider. It will be registered with the engine.
 * @param {Object} entity - The entity the body is for.
 * @param {Object} context - Context from the engine.
 * @param {RAPIER.World} context.physicsWorld - The Rapier world.
 * @param {RAPIER} context.RAPIER - The Rapier library instance.
 * @returns {Object} A physicsBody component structure.
 */
function gamePlayerBodyFactory(entity, { physicsWorld, RAPIER }) {
  const { position } = entity.transform;
  const halfHeight = GAME_CONFIG.PLAYER.CAPSULE_HEIGHT / 2;
  const radius = GAME_CONFIG.PLAYER.CAPSULE_RADIUS;

  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    position.x,
    position.y,
    position.z
  );
  const rigidBody = physicsWorld.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.capsule(
    halfHeight,
    radius
  ).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  const collider = physicsWorld.createCollider(colliderDesc, rigidBody);

  // The character controller is tightly coupled to the player body
  const controller = physicsWorld.createCharacterController(
    GAME_CONFIG.PHYSICS.CHARACTER_CONTROLLER_OFFSET
  );
  controller.enableAutostep(
    GAME_CONFIG.PHYSICS.AUTO_STEP_HEIGHT,
    GAME_CONFIG.PHYSICS.AUTO_STEP_MIN_WIDTH,
    true
  );
  controller.enableSnapToGround(GAME_CONFIG.PHYSICS.SNAP_TO_GROUND_DISTANCE);
  controller.setMaxSlopeClimbAngle(
    (GAME_CONFIG.PHYSICS.MAX_SLOPE_CLIMB_ANGLE * Math.PI) / 180
  );
  controller.setMinSlopeSlideAngle(
    (GAME_CONFIG.PHYSICS.MIN_SLOPE_SLIDE_ANGLE * Math.PI) / 180
  );
  controller.setApplyImpulsesToDynamicBodies(true);

  // Return the structure expected by the physicsBody component
  return { rigidBody, collider, controller };
}

/**
 * Standardized player setup function.
 * This function is now responsible for two things:
 * 1. Registering any player-specific factories with the engine.
 * 2. Creating the initial player entity with its declarative components.
 * @param {World} world - ECS world instance.
 * @param {Object} dependencies - Required dependencies from the engine.
 */
export function setupGamePlayer(world, { physics, terrain }) {
  // 1. Register the factory with the engine's physics resource.
  physics.registerBodyFactory("isPlayer", gamePlayerBodyFactory);

  // 2. Define the initial spawn position, calculating height from terrain.
  const spawnPos = GAME_CONFIG.PLAYER.SPAWN_POSITION;

  // Use the terrain resource to get proper height
  const terrainHeight = getTerrainHeight(terrain, spawnPos.x, spawnPos.z);
  const spawnY =
    terrainHeight +
    GAME_CONFIG.PLAYER.SPAWN_HEIGHT_OFFSET +
    (GAME_CONFIG.PLAYER.CAPSULE_HEIGHT / 2);

  const initialPosition = new THREE.Vector3(spawnPos.x, spawnY, spawnPos.z);

  // 3. Create the player entity declaratively.
  const playerEntity = world.add({
    // --- TAGS ---
    isPlayer: true, // This is the key the factory was registered with.
    isInputControlled: true,
    isCameraFollowTarget: { offset: { x: 0, y: 1, z: 0 } },

    // --- DATA COMPONENTS ---
    score: { value: 0 },
    transform: createTransform(initialPosition),
    triggerDetector: createTriggerDetector(
      GAME_CONFIG.PLAYER.CAPSULE_RADIUS + 0.5
    ), // Slightly larger than player for collection
    renderable: createGLTFRenderable("characters/farmer", {
      type: "gltf",
      scale: getAssetScaling("characters/farmer").scale,
      position: {
        x: 0,
        y: getAssetScaling("characters/farmer").offsetY,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      castShadow: true,
      receiveShadow: true,
    }),
    characterController: {
      speed: GAME_CONFIG.PLAYER.WALK_SPEED,
      runSpeed: GAME_CONFIG.PLAYER.RUN_SPEED,
      jumpStrength: GAME_CONFIG.PLAYER.JUMP_STRENGTH,
    },
    inputMovement: { x: 0, z: 0 },
    inputActions: { jump: false, run: false },
    cameraDirection: createCameraDirection(),
    movementState: createMovementState(),
    stateMachine: createStateMachine(playerStateMachineDefinition),
  });
}