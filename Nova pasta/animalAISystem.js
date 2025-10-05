

/**
 * ANIMAL AI SYSTEM
 *
 * This system provides simple wandering behavior for entities tagged as 'isAnimal'.
 * It makes them move to random points within a defined boundary, creating a
 * more lively and dynamic environment.
 */
import * as THREE from 'three';
import { getTerrainHeight } from './gameUtils.js';

// --- System Helper Functions ---

/**
 * Initializes the AI state for an animal if it doesn't have one.
 * @param {Object} entity - The animal entity.
 * @param {Object} terrain - The terrain resource.
 */
function initializeAIState(entity, terrain) {
    if (!entity.aiState) {
        const pen = entity.isAnimal.pen;
        const groundY = getTerrainHeight(terrain, entity.transform.position.x, entity.transform.position.z);
        
        entity.add({
            aiState: {
                status: 'idle', // 'idle', 'wandering'
                targetPosition: new THREE.Vector3(entity.transform.position.x, groundY, entity.transform.position.z),
                idleTimer: Math.random() * 5 + 2, // Start with a random idle time
            },
        });
    }
}

/**
 * Updates the idle state of an animal. When the timer is up, it finds a new target.
 * @param {Object} entity - The animal entity.
 * @param {number} dt - Delta time.
 * @param {Object} terrain - The terrain resource.
 */
function updateIdleState(entity, dt, terrain) {
    entity.aiState.idleTimer -= dt;
    entity.movementState.speed = 0; // Ensure it's not moving

    if (entity.aiState.idleTimer <= 0) {
        const pen = entity.isAnimal.pen;
        const newX = pen.center.x + (Math.random() - 0.5) * pen.size.x;
        const newZ = pen.center.z + (Math.random() - 0.5) * pen.size.z;
        const groundY = getTerrainHeight(terrain, newX, newZ);
        
        entity.aiState.targetPosition.set(newX, groundY, newZ);
        entity.aiState.status = 'wandering';
        
        if (entity.renderable?.mesh) {
            entity.renderable.mesh.lookAt(entity.aiState.targetPosition);
        }
    }
}

/**
 * Updates the wandering state of an animal. It moves towards its target.
 * @param {Object} entity - The animal entity.
 * @param {Object} terrain - The terrain resource.
 */
function updateWanderingState(entity, terrain) {
    const { position } = entity.transform;
    const { targetPosition } = entity.aiState;

    const distanceToTarget = position.distanceTo(targetPosition);

    if (distanceToTarget < 0.5) {
        // Arrived at destination
        entity.aiState.status = 'idle';
        entity.aiState.idleTimer = Math.random() * 8 + 3; // Idle for 3-11 seconds
        entity.movementState.speed = 0;
    } else {
        // Keep moving
        const direction = new THREE.Vector3().subVectors(targetPosition, position).normalize();
        entity.movementState.direction.copy(direction);
        entity.movementState.speed = entity.isAnimal.speed;

        // Ensure the animal is on the ground
        const groundY = getTerrainHeight(terrain, position.x, position.z);
        position.y = groundY;
        
        // Update rotation to look towards target
        if (entity.renderable?.mesh) {
             const lookAtTarget = new THREE.Vector3().copy(targetPosition);
             lookAtTarget.y = position.y; // Look horizontally
             entity.renderable.mesh.lookAt(lookAtTarget);
        }
    }
}


/**
 * The main animal AI system function.
 * @param {World} world - The ECS world.
 * @param {Object} resources - Engine resources.
 * @param {number} dt - Delta time.
 */
export function animalAISystem(world, { terrain }, dt) {
    const query = world.with('isAnimal', 'transform', 'movementState', 'renderable');

    for (const entity of query) {
        initializeAIState(entity, terrain);
        
        switch (entity.aiState.status) {
            case 'idle':
                updateIdleState(entity, dt, terrain);
                break;
            case 'wandering':
                updateWanderingState(entity, terrain);
                break;
        }

        // Apply movement based on state
        const { velocity, direction, speed } = entity.movementState;
        velocity.copy(direction).multiplyScalar(speed * dt);
        entity.transform.position.add(velocity);
    }
}

/**
 * Creates the animal entities.
 * @param {World} world - The ECS world.
 * @param {Object} dependencies - Engine resources.
 */
export function setupAnimals(world, { terrain }) {
    if (!world || !terrain) return;
    
    // Add animal entities as defined in the config
}

