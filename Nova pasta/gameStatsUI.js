

/**
 * GAME STATS UI
 *
 * This module creates and manages the main heads-up display (HUD) for the game.
 * It subscribes to the central game state and reactively updates the UI to show
 * critical information like money, NDVI, and LST.
 */

import { subscribeToState, getGameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

// Helper function to format money
const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

/**
 * Creates the initial DOM elements for the stats UI.
 * @returns {Object} An object containing references to the DOM elements for each stat.
 */
function createStatsDOMElements() {
    const hudContainer = document.getElementById('gameHud');
    if (!hudContainer) {
        console.error("UI Error: #gameHud container not found in HTML.");
        return {};
    }
    // Clear any previous content
    hudContainer.innerHTML = `
        <div id="hud-left">
            <div class="stat-item" id="money-stat">
                <span class="stat-label">$</span>
                <span class="stat-value"></span>
            </div>
        </div>
        <div id="hud-right">
            <div class="stat-item" id="ndvi-stat">
                <span class="stat-label">Avg. NDVI:</span>
                <span class="stat-value"></span>
            </div>
            <div class="stat-item" id="lst-stat">
                <span class="stat-label">Avg. LST:</span>
                <span class="stat-value"></span>
            </div>
            <div class="stat-item" id="rzsm-stat">
                <span class="stat-label">💧 RZSM:</span>
                <span class="stat-value"></span>
            </div>
        </div>
    `;
    return {
        moneyValue: hudContainer.querySelector('#money-stat .stat-value'),
        ndviValue: hudContainer.querySelector('#ndvi-stat .stat-value'),
        lstValue: hudContainer.querySelector('#lst-stat .stat-value'),
        rzsmValue: hudContainer.querySelector('#rzsm-stat .stat-value'),
    };
}
/**
 * Updates the non-real-time DOM elements from the game state.
 * @param {Object} elements - The DOM element references.
 * @param {Object} state - The current game state.
 */
function updateStaticUI(elements, state) {
    if (elements.moneyValue) {
        elements.moneyValue.textContent = moneyFormatter.format(state.money).replace('$', '').trim();
    }
    if (elements.ndviValue) {
        elements.ndviValue.textContent = state.currentNDVI.toFixed(2);
    }
}
/**
 * Sets up the Game Stats UI system.
 * @param {World} world - The ECS world.
 * @param {Object} dependencies - Engine dependencies.
 */
export function setupGameStatsUI(world, dependencies) {
    const elements = createStatsDOMElements();
    // Initial update for all stats
    const initialState = getGameState();
    updateStaticUI(elements, initialState);
    if (elements.lstValue) {
        elements.lstValue.textContent = `${initialState.currentLST.toFixed(1)}°C`;
    }
    if (elements.rzsmValue) {
        elements.rzsmValue.textContent = `${initialState.currentRZSM.toFixed(0)} kg/m²`;
    }
    // Subscribe to future state changes for non-realtime values
    subscribeToState((state, prevState) => {
        if (
            state.money !== prevState.money ||
            state.currentNDVI !== prevState.currentNDVI
        ) {
            updateStaticUI(elements, state);
        }
        
        if (state.currentRZSM !== prevState.currentRZSM && elements.rzsmValue) {
            elements.rzsmValue.textContent = `${state.currentRZSM.toFixed(0)} kg/m²`;
        }
    });
    // --- Real-time LST Update Loop ---
    const updateRealTimeLST = () => {
        const baseLST = getGameState().currentLST;
        
        // Add a small, time-based fluctuation to simulate real-time measurement
        const time = Date.now() / 1500; // Slow down the fluctuation
        const fluctuation = Math.sin(time) * 0.25; // Oscillates between -0.25 and +0.25
        const realTimeLST = baseLST + fluctuation;
        if (elements.lstValue) {
            elements.lstValue.textContent = `${realTimeLST.toFixed(1)}°C`;
        }
        requestAnimationFrame(updateRealTimeLST);
    };
    // Start the real-time update loop
    requestAnimationFrame(updateRealTimeLST);
    if (GAME_CONFIG.DEBUG) console.log("📊 Game Stats UI initialized.");
}

