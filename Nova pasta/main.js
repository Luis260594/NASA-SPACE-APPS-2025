/**
 * GAME TEMPLATE - MAIN ENTRY POINT
 *
 * This file is the central hub of the game template. Its primary responsibilities are:
 * 1. Importing the core engine and any game-specific systems or setup modules.
 * 2. Importing the game's configuration file.
 * 3. Registering all game-specific systems and setup functions with the engine.
 * 4. Initializing the engine with the game's configuration, which starts the game.
 */

import { GAME_CONFIG } from "./config.js";
import { engine } from "rosebud-threejs-game-engine";

// Import game-specific setup functions. These now handle their own factory registrations.
import { setupGamePlayer } from "./playerSetup.js";
import { setupGameTerrain } from "./terrainSetup.js";
import { setupCollectibles } from "./collectibleSetup.js";
import { setupEnvironmentObjects } from "./environmentObjects.js";
import { setupSkybox } from "./skyboxSetup.js";
import { setupGameStatsUI } from "./gameStatsUI.js";
import { setupSatelliteViewUI } from "./satelliteViewUI.js";
import { setupGameCycleUI } from "./gameCycleUI.js";
import { setupUpgradesUI } from "./upgradesUI.js";
import { setupWinScreenUI } from "./winScreenUI.js";
import { setupEndScreenUI } from "./endScreenUI.js";
import { setupIntroScreenUI } from "./introScreenUI.js";
// Import game-specific runtime systems
import { playerMovementSystem } from "./playerMovementSystem.js";
import { collectibleSystemSetup } from "./collectibleSystem.js";
import { setupGameCycle } from "./gameCycle.js";
import { animalAISystem, setupAnimals } from "./animalAISystem.js";
async function main(canvas) {
  // Register game-specific setup logic. These functions will register factories
  // and create the initial game entities.
  engine.registerSetup("game-terrain-setup", {
    dependencies: ["physics", "renderer"],
    init: (world, dependencies) => {
      const terrainResource = setupGameTerrain(world, dependencies);
      engine.addResource("terrain", terrainResource);
    },
  });

  engine.registerSetup("game-player-setup", {
    dependencies: ["physics", "renderer", "assets", "terrain"], // Add terrain dependency
    init: (world, deps) => setupGamePlayer(world, deps, GAME_CONFIG),
  });

  engine.registerSetup("game-collectible-setup", {
    dependencies: ["terrain"],
    init: (world, deps) => setupCollectibles(world, deps),
  });

  engine.registerSetup("environment-objects-setup", {
    dependencies: ["terrain", "physics"],
    init: (world, deps) => setupEnvironmentObjects(world, deps),
  });


  engine.registerSetup("collectible-system-setup", {
    dependencies: ["eventBus"],
    init: (world, deps) => collectibleSystemSetup(world, deps),
  });

  engine.registerSetup("skybox-setup", {
    dependencies: ["renderer"],
    init: (world, deps) => setupSkybox(world, deps),
  });

  engine.registerSetup("game-stats-ui-setup", {
    dependencies: [], // No engine dependencies needed, it reads from DOM/Zustand
    init: (world, deps) => setupGameStatsUI(world, deps),
  });
  engine.registerSetup("satellite-view-ui-setup", {
    dependencies: [],
    init: (world, deps) => setupSatelliteViewUI(world, deps),
  });
  engine.registerSetup("game-cycle-ui-setup", {
    dependencies: [],
    init: (world, deps) => setupGameCycleUI(world, deps),
  });
  engine.registerSetup("game-cycle-setup", {
    dependencies: [],
    init: (world, deps) => setupGameCycle(world, deps),
  });
  engine.registerSetup("upgrades-ui-setup", {
    dependencies: [],
    init: (world, deps) => setupUpgradesUI(world, deps),
  });
  engine.registerSetup("win-screen-ui-setup", {
      dependencies: [],
      init: (world, deps) => setupWinScreenUI(world, deps),
  });
  engine.registerSetup("end-screen-ui-setup", {
      dependencies: [],
      init: (world, deps) => setupEndScreenUI(world, deps),
  });
  engine.registerSetup("intro-screen-ui-setup", {
      dependencies: [],
      init: (world, deps) => setupIntroScreenUI(world, deps),
  });
  engine.registerSetup("animals-setup", {
    dependencies: ["terrain"],
    init: (world, deps) => setupAnimals(world, deps),
  });
  // Register game-specific runtime systems with their priorities.
  engine.registerSystem("player-movement", {
    update: (world, _, dt) => playerMovementSystem(world, dt),
    priority: 30,
  });
  engine.registerSystem("animal-ai", {
      dependencies: ["terrain"],
      update: (world, deps, dt) => animalAISystem(world, deps, dt),
      priority: 40, // After player movement
  });

  // Mesh collision retry system - creates physics bodies after meshes load
  engine.registerSystem("mesh-collision-retry", {
    dependencies: ["physics"],
    update: (world, { physics }) => {
      // Find entities with mesh colliders but no physics bodies
      const needsPhysics = Array.from(world.with("isMeshCollider")).filter(
        entity => !entity.physicsBody && entity.renderable?.mesh
      );
      
      if (needsPhysics.length > 0) {
        if (GAME_CONFIG.DEBUG) console.log(`🔄 Retrying physics creation for ${needsPhysics.length} loaded meshes`);
        
        needsPhysics.forEach(entity => {
          const factory = physics.getBodyFactory("isMeshCollider");
          if (factory) {
            const body = factory(entity, {
              physicsWorld: physics.world,
              RAPIER: physics.RAPIER
            });
            if (body) {
              world.addComponent(entity, "physicsBody", body);
              body.collider.setActiveEvents(physics.RAPIER.ActiveEvents.COLLISION_EVENTS);
              body.collider.userData = { entity };
              if (GAME_CONFIG.DEBUG) console.log(`✅ Created physics body for ${entity.renderable.assetKey}`);
            }
          }
        });
      }
    },
    priority: 900, // Run before debug
  });


  // Initialize the engine with the game's configuration and the canvas.
  await engine.init({ ...GAME_CONFIG, canvas });
  window.gameEngine = engine; // Expose engine for global access
}

// Wait for the DOM to be fully loaded before starting the game.
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) {
    console.error('Fatal: Could not find canvas element with id="game-canvas"');
    return;
  }

  // Pass the canvas element to the engine in the config.
  main(canvas).catch((error) => console.error("Failed to start game:", error));
});