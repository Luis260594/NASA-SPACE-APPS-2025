/**
 * COLLECTIBLE SYSTEM
 *
 * This system handles the logic for collecting items. It listens for collision
 * events and, if a collision involves the player and a collectible, it
 * removes the collectible and updates the score.
 */
import { GAME_CONFIG } from "./config.js";

/**
 * The main system function. It subscribes to the event bus and does not need
 * to be called every frame, so we will register it as a setup system that just
 * runs once.
 * @param {World} world - The ECS world.
 * @param {Object} dependencies - The engine resources.
 */
export function collectibleSystemSetup(world, { eventBus }) {
  // Listen for trigger events from the trigger detection system
  eventBus.on("trigger-entered", ({ triggerable, trigger, triggerType }) => {
    // Check if this is a collectible trigger
    if (
      triggerType === "collectible" &&
      trigger.isCollectible &&
      triggerable.isPlayer
    ) {
      // Remove the collectible from the world.
      // The engine's scene management system will automatically clean up
      // the mesh on the next frame
      world.remove(trigger);

      // Update player score
      if (triggerable.score) {
        triggerable.score.value += 1;
        if (GAME_CONFIG.DEBUG) console.log(`Score: ${triggerable.score.value}`);
      }
      
      // Emit event for key collection
      // NOTE: event "key-collected" is no longer used since keys are removed.
      // eventBus.emit("key-collected");
    }
  });
  // COLLISION SYSTEM TESTING - Emit events for visual feedback instead of direct DOM manipulation
  eventBus.on("collision-started", ({ entityA, entityB }) => {
    // Emit event for UI system to handle visual feedback
    eventBus.emit("screen-flash", { color: "rgba(255, 0, 0, 0.1)", duration: 100 });
  });

  eventBus.on("collision-ended", ({ entityA, entityB }) => {
    // Emit event for UI system to handle visual feedback  
    eventBus.emit("screen-flash", { color: "rgba(0, 255, 0, 0.1)", duration: 100 });
  });
}
