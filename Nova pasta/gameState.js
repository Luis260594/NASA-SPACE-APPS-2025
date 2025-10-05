

/**
 * GAME STATE MANAGEMENT (ZUSTAND)
 *
 * This module defines the central game state using Zustand, a small, fast,
 * and scalable state-management solution. It is the single source of truth
 * for all DYNAMIC data in the game, such as player stats, environmental
 * conditions, and UI states.
 *
 * All game logic should read from and write to this store to ensure data
 * consistency and reactivity throughout the application.
 */

import create from 'https://esm.sh/zustand@4.5.2/vanilla';
import { GameData } from './gameData.js';
import { GAME_CONFIG } from './config.js';

// Fetch initial values from the static GameData module
const playerFarm = GameData.get('player_farm');
const lot1 = GameData.get('lot_1');
const lot2 = GameData.get('lot_2');
const lot3 = GameData.get('lot_3');
const lot4 = GameData.get('lot_4');
// Helper function to calculate averages
const getAverage = (lots, key) => {
    if (!lots || lots.length === 0) return 0;
    const total = lots.reduce((sum, lot) => sum + lot[key], 0);
    return total / lots.length;
};
const initialLots = [
    { id: 1, soilOrganicMatter: lot1.Value1, waterRetention: lot1.Value2, ndvi: lot1.Value3, lst: lot1.Value4, rzsm: lot1.Value5 },
    { id: 2, soilOrganicMatter: lot2.Value1, waterRetention: lot2.Value2, ndvi: lot2.Value3, lst: lot2.Value4, rzsm: lot2.Value5 },
    { id: 3, soilOrganicMatter: lot3.Value1, waterRetention: lot3.Value2, ndvi: lot3.Value3, lst: lot3.Value4, rzsm: lot3.Value5 },
    { id: 4, soilOrganicMatter: lot4.Value1, waterRetention: lot4.Value2, ndvi: lot4.Value3, lst: lot4.Value4, rzsm: lot4.Value5 },
];
/**
 * Create the Zustand store for the game state.
 */
export const useGameState = create((set, get) => ({
    // --- GLOBAL STATS ---
    money: playerFarm.Value1,
    currentYear: 2020,
    // --- LOT-SPECIFIC STATS ---
    lots: initialLots,
    
    // --- DERIVED/AVERAGE STATS (for UI) ---
    currentNDVI: getAverage(initialLots, 'ndvi'),
    currentLST: getAverage(initialLots, 'lst'),
    currentRZSM: getAverage(initialLots, 'rzsm'),
    // --- GAME PROGRESS & STATE ---
    performanceHistory: [], // Stores {year, lots} for win condition check
    gamePhase: 'IDLE', // 'IDLE', 'PRE_SEASON', 'PLANTING', 'GROWING', 'POST_HARVEST', 'WIN', 'GAME_OVER'
    sugarcanePlanted: false,
    // finalYield is now part of each lot object
    
    // Post-harvest decision tracking
    lotDecisions: {}, // e.g., { 1: 'KEEP_STRAW', 2: 'SELL_STRAW' }
    
    // Modifiers to carry over to the next year, one per lot
    ndviModifiers: [0, 0, 0, 0],
    preSeasonDecisions: {}, // e.g., { 1: 'PLANT', 2: 'PLANT_IRRIGATE' }
    // --- UI STATE ---
    isSatelliteViewOpen: false,
    isUpgradesViewOpen: false,
    // --- UPGRADE FLAGS ---
    hasSoilSensors: false,
    hasPrecisionIrrigation: false,
    
    // --- EDUCATIONAL FLAGS ---
    hasSeenRZSMEducation: false,
    // --- ACTIONS (MUTATORS) ---
    // These functions are used to update the state.

    /**
     * Updates the player's money by a given amount.
    updateMoney: (amount) => set(state => ({ money: state.money + amount })),
    /**
     * Toggles UI views.
     */
    toggleSatelliteView: () => set(state => ({ isSatelliteViewOpen: !state.isSatelliteViewOpen })),
    toggleUpgradesView: () => set(state => ({ isUpgradesViewOpen: !state.isUpgradesViewOpen })),
    /**
     * Resets the game to its initial state for a new playthrough.
     */
    restartGame: () => set({
        money: playerFarm.Value1,
        lots: initialLots,
        currentNDVI: getAverage(initialLots, 'ndvi'),
        currentLST: getAverage(initialLots, 'lst'),
        currentRZSM: getAverage(initialLots, 'rzsm'),
        performanceHistory: [],
        gamePhase: 'IDLE',
        currentYear: 2020,
        finalYield: 0, // Kept for reset, but no longer primary
        sugarcanePlanted: false,
        lotDecisions: {},
        preSeasonDecisions: {},
        ndviModifiers: [0, 0, 0, 0],
        hasSoilSensors: false,
        hasPrecisionIrrigation: false,
        hasSeenRZSMEducation: false,
    }),
    /**
     * A more generic updater for any stat.
     * @param {string} key - The state key to update.
     * @param {any} value - The new value.
     */
    setStat: (key, value) => {
        if (get().hasOwnProperty(key)) {
            set({ [key]: value });
        } else {
            console.warn(`GameState: Attempted to set unknown stat "${key}".`);
        }
    },
    purchaseUpgrade: (upgradeId) => {
        const state = get();
        
        // Map upgrade IDs to their data IDs and state flags
        const upgradeMap = {
            'soil_sensors': { dataId: 'upgrade_sensors', flag: 'hasSoilSensors' },
            'precision_irrigation': { dataId: 'upgrade_irrigation', flag: 'hasPrecisionIrrigation' }
        };
        
        const upgrade = upgradeMap[upgradeId];
        if (!upgrade) {
            console.warn(`Unknown upgrade ID: ${upgradeId}`);
            return;
        }
        
        // Get upgrade data from GameData
        const upgradeData = GameData.get(upgrade.dataId);
        if (!upgradeData) {
            console.error(`Upgrade data not found for: ${upgrade.dataId}`);
            return;
        }
        
        const cost = upgradeData.Value1;
        const flag = upgrade.flag;
        if (flag && !state[flag] && state.money >= cost) {
            set({
                money: state.money - cost,
                [flag]: true,
            });
            if (GAME_CONFIG.DEBUG) console.log(`✅ Upgrade Purchased: ${upgradeData.Name} for $${cost}`);
            
            // Show success message
            setTimeout(() => {
                alert(`${upgradeData.Name} purchased successfully!`);
            }, 100);
        } else {
            if (GAME_CONFIG.DEBUG) console.warn(`❌ Upgrade Failed: ${upgradeId}. Already owned: ${state[flag]}, Money: ${state.money}, Cost: ${cost}`);
            
            if (state[flag]) {
                setTimeout(() => alert('You already own this upgrade!'), 100);
            } else {
                setTimeout(() => alert('Insufficient funds!'), 100);
            }
        }
    },
}));
// Log for debugging to confirm the module is loaded.
console.log("📈 GameState (Zustand) module initialized.");

// Expose the raw 'get' and 'set' for advanced, non-component usage if needed.
export const getGameState = useGameState.getState;
export const setGameState = useGameState.setState;
export const subscribeToState = useGameState.subscribe;

