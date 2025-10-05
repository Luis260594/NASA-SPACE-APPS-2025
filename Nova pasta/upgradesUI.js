

/**
 * UPGRADES UI
 *
 * This module manages the modal for purchasing farm upgrades.
 * It subscribes to the game state to reactively update the availability
 * and status of upgrades based on player funds and purchase history.
 */

import { subscribeToState, getGameState, useGameState } from './gameState.js';
import { GameData } from './gameData.js';
import { GAME_CONFIG } from './config.js';

// --- DOM Element References ---
let upgradesScreen, toggleButton, closeButton;
let buySoilSensorsBtn, buyIrrigationBtn;
const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
/**
 * Updates the state of the upgrade buttons (cost, disabled, text) using data from GameData.
 * @param {Object} state - The current game state.
 */
function updateUpgradeButtons(state) {
    // Get upgrade data
    const sensorsData = GameData.get('upgrade_sensors');
    const irrigationData = GameData.get('upgrade_irrigation');
    
    // --- Soil Sensors ---
    if (state.hasSoilSensors) {
        buySoilSensorsBtn.textContent = 'Purchased';
        buySoilSensorsBtn.disabled = true;
    } else {
        buySoilSensorsBtn.textContent = 'Buy';
        buySoilSensorsBtn.disabled = state.money < sensorsData.Value1;
    }
    
    // --- Precision Irrigation ---
    if (state.hasPrecisionIrrigation) {
        buyIrrigationBtn.textContent = 'Purchased';
        buyIrrigationBtn.disabled = true;
    } else {
        buyIrrigationBtn.textContent = 'Buy';
        buyIrrigationBtn.disabled = state.money < irrigationData.Value1;
    }
}


/**
 * Sets up the Upgrades UI system.
 * This function runs once at the start of the game.
 */
export function setupUpgradesUI() {
    // --- Get DOM References ---
    upgradesScreen = document.getElementById('upgradesScreen');
    toggleButton = document.getElementById('toggleUpgradesBtn');
    closeButton = document.getElementById('closeUpgradesBtn');
    buySoilSensorsBtn = document.getElementById('buySoilSensorsBtn');
    buyIrrigationBtn = document.getElementById('buyIrrigationBtn');

    if (!upgradesScreen || !toggleButton || !closeButton || !buySoilSensorsBtn || !buyIrrigationBtn) {
        console.error("Upgrades UI Error: One or more required DOM elements are missing.");
        return;
    }

    const { toggleUpgradesView, purchaseUpgrade } = useGameState.getState();

    // --- Add Event Listeners ---
    toggleButton.addEventListener('click', toggleUpgradesView);
    closeButton.addEventListener('click', toggleUpgradesView);
    
    buySoilSensorsBtn.addEventListener('click', () => {
        purchaseUpgrade('soil_sensors');
    });

    buyIrrigationBtn.addEventListener('click', () => {
        purchaseUpgrade('precision_irrigation');
    });

    // --- Subscribe to State Changes ---
    subscribeToState((state, prevState) => {
        // Toggle visibility
        if (state.isUpgradesViewOpen !== prevState.isUpgradesViewOpen) {
            upgradesScreen.style.display = state.isUpgradesViewOpen ? 'flex' : 'none';
        }

        // Update buttons if the view is open and relevant state has changed
        if (state.isUpgradesViewOpen) {
            if (
                state.money !== prevState.money ||
                state.hasSoilSensors !== prevState.hasSoilSensors ||
                state.hasPrecisionIrrigation !== prevState.hasPrecisionIrrigation ||
                state.isUpgradesViewOpen !== prevState.isUpgradesViewOpen
            ) {
                updateUpgradeButtons(state);
            }
        }
    });

    if (GAME_CONFIG.DEBUG) console.log("🔧 Upgrades UI initialized.");
}

