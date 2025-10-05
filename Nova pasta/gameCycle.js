

/**
 * GAME CYCLE CORE LOGIC
 *
 * This module implements the main game loop, structured as an annual harvest cycle.
 * It's responsible for calculating environmental conditions, yields, and economic outcomes
 * based on the static data from GameData and the dynamic state from gameState.
 */

import { getGameState, setGameState, useGameState } from './gameState.js';
import { GameData } from './gameData.js';
import { GAME_CONFIG } from './config.js';
import { createSugarcane, removeSugarcane } from './environmentObjects.js';
import { yearlyLotData } from './yearlyLotData.js';
// This function is the heart of the game loop, called once per year.
function startNewYear() {
    const state = getGameState();
    const yearData = yearlyLotData[state.currentYear];
    if (!yearData) {
        console.error(`No historical data found for year ${state.currentYear}. Ending game.`);
        return;
    }
    
    const rzsmIndicator = GameData.get('indicator_rzsm');
    
    // --- 1. PRE-SEASON PHASE & LOAD HISTORICAL DATA ---
    const newLotData = state.lots.map((lot, index) => {
        const historical = yearData.lots[index];
        
        // --- A. CALCULATE RZSM DEPLETION (EVAPOTRANSPIRATION) ---
        let lotRZSM = lot.rzsm;
        const waterLoss = 5 + Math.max(0, lot.lst - 35);
        lotRZSM -= waterLoss;
        lotRZSM = Math.max(rzsmIndicator.Value1, Math.min(rzsmIndicator.Value2, lotRZSM));
        // --- DYNAMIC SIMULATION ---
        // The historical data now acts as a 'regional climate' baseline.
        // The actual lot stats are simulated based on its current soil properties.
        // LST is influenced by water retention. More water = cooler surface.
        // We'll use a baseline water retention of 50 as 'neutral'.
        const waterRetentionModifier = (lot.waterRetention - 50) * 0.1;
        let lotLST = historical.lst - waterRetentionModifier;
        // NDVI is influenced by soil organic matter. More SOM = healthier plants.
        // We'll use a baseline SOM of 50 as 'neutral'.
        const soilHealthModifier = (lot.soilOrganicMatter - 50) * 0.005;
        let lotNDVI = historical.ndvi + soilHealthModifier;
        // Apply carry-over modifiers from last year's straw/vinasse decisions
        lotNDVI += state.ndviModifiers[index];
        
        // Apply bonuses from purchased upgrades (data-driven)
        if (state.hasSoilSensors) {
            const sensorsUpgrade = GameData.get('upgrade_sensors');
            lotNDVI += sensorsUpgrade.Value2; // NDVI bonus from sensors
        }
        if (state.hasPrecisionIrrigation) {
            const irrigationUpgrade = GameData.get('upgrade_irrigation');
            lotLST += irrigationUpgrade.Value2; // LST modifier (negative value reduces temperature)
        }
        // Clamp values to reasonable ranges
        lotNDVI = Math.max(0.1, Math.min(0.95, lotNDVI));
        lotLST = Math.max(25, Math.min(50, lotLST));
        return { ...lot, ndvi: lotNDVI, lst: lotLST, rzsm: lotRZSM };
    });
    const avgNDVI = newLotData.reduce((acc, p) => acc + p.ndvi, 0) / newLotData.length;
    const avgLST = newLotData.reduce((acc, p) => acc + p.lst, 0) / newLotData.length;
    const avgRZSM = newLotData.reduce((acc, p) => acc + p.rzsm, 0) / newLotData.length;
    setGameState({
        lots: newLotData,
        currentNDVI: avgNDVI,
        currentLST: avgLST,
        currentRZSM: avgRZSM,
        gamePhase: 'PRE_SEASON',
        preSeasonDecisions: {}, // Reset pre-season decisions for the new year
    });
    if (GAME_CONFIG.DEBUG) {
        console.log(`🌱 PRE-SEASON (Year ${state.currentYear})`);
        console.log(`- Simulated new conditions. Average NDVI: ${avgNDVI.toFixed(3)}, Average LST: ${avgLST.toFixed(1)}°C`);
    }
}
function startGrowingSeason() {
    const world = window.gameEngine.world;
    const terrainResource = window.gameEngine.resources.get('terrain');
    const terrain = terrainResource?.instance || terrainResource;
    const state = getGameState();
    // Apply irrigation effects and planting costs
    let plantingCost = 0;
    const vinasseAction = GameData.get('action_apply_vinasse');
    const newLots = state.lots.map(lot => {
        const decision = state.preSeasonDecisions[lot.id];
        const newLot = { ...lot };
        if (decision === 'PLANT_IRRIGATE') {
            plantingCost += GAME_CONFIG.COSTS.PLANTING;
            plantingCost += GAME_CONFIG.COSTS.IRRIGATION;
            newLot.lst -= 2.0;
            
            // RZSM replenishment from irrigation
            const rzsmIndicator = GameData.get('indicator_rzsm');
            const rzsmGain = 20; // Fixed gain from irrigation
            newLot.rzsm = Math.min(rzsmIndicator.Value2, newLot.rzsm + rzsmGain);
        } else if (decision === 'PLANT_VINASSE') {
            plantingCost += GAME_CONFIG.COSTS.PLANTING;
            plantingCost += GAME_CONFIG.COSTS.VINASSE;
            // As per user request to "boost soil organic matter"
            newLot.soilOrganicMatter += 2; // Direct boost
        } else if (decision === 'PLANT') {
            plantingCost += GAME_CONFIG.COSTS.PLANTING;
        }
        return newLot;
    });
    // Create sugarcane visuals only for planted lots
    createSugarcane(world, terrain, state.preSeasonDecisions);
    if (terrain.markPlantedLots) {
        terrain.markPlantedLots(state.preSeasonDecisions, world, window.gameEngine.renderer);
    }
    setGameState({
        money: state.money - plantingCost,
        sugarcanePlanted: true,
        lots: newLots,
        gamePhase: 'GROWING'
    });
    if (GAME_CONFIG.DEBUG) console.log(`🌱 Planting finished. Cost: $${plantingCost}.`);
}
function runHarvest() {
    const state = getGameState();
    const vinasseAction = GameData.get('action_apply_vinasse');
    const droughtEvent = GameData.get('event_drought');
    // Run yield calculations at the point of harvest
    const updatedLots = state.lots.map(lot => {
        const decision = state.preSeasonDecisions[lot.id];
        let lotYield = 0; // Default to 0 if not planted
        if (decision === 'PLANT' || decision === 'PLANT_IRRIGATE' || decision === 'PLANT_VINASSE') {
            lotYield = 70 + (lot.ndvi * 50); // Base yield
            if (decision === 'PLANT_VINASSE') {
                lotYield *= (1 + vinasseAction.Value1); // Apply TCH Yield Bonus
            }
            // Check for drought event with RZSM mitigation
            if (lot.lst > 42.0) {
                const rzsmIndicator = GameData.get('indicator_rzsm');
                const droughtPenalty = droughtEvent.Value1 || -0.2;
                
                // Calculate RZSM percentage (0.0 to 1.0)
                const rzsmPercentage = (lot.rzsm - rzsmIndicator.Value1) / (rzsmIndicator.Value2 - rzsmIndicator.Value1);
                const mitigatedPenalty = droughtPenalty * (1 - rzsmPercentage);
                
                lotYield *= (1 + mitigatedPenalty);
                
                const mitigationMsg = rzsmPercentage > 0.5 
                    ? ' High soil moisture helped reduce the damage.' 
                    : ' Low soil moisture worsened the impact.';
                setTimeout(() => alert(`HEAT STRESS ALERT on Lot ${lot.id}!${mitigationMsg}`), 500);
                if (GAME_CONFIG.DEBUG) console.warn(`🔥 DROUGHT EVENT on Lot ${lot.id}: Mitigated penalty: ${(mitigatedPenalty * 100).toFixed(1)}%`);
            }
        }
        return { ...lot, finalYield: lotYield };
    });
    
    // Calculate total earnings from all lots
    const totalEarnings = updatedLots.reduce((sum, lot) => sum + (lot.finalYield * 150), 0);
    // Remove sugarcane from the world
    const terrainResource = window.gameEngine.resources.get('terrain');
    const terrain = terrainResource?.instance || terrainResource;
    removeSugarcane(window.gameEngine.world);
    if (terrain.unmarkAllLots) {
        terrain.unmarkAllLots(window.gameEngine.world, window.gameEngine.renderer);
    }
    setGameState({
        money: state.money + totalEarnings,
        lots: updatedLots,
        gamePhase: 'POST_HARVEST',
        sugarcanePlanted: false, // Reset for next year
        lotDecisions: {}, // Clear decisions from previous year
    });
    if (GAME_CONFIG.DEBUG) console.log(`💰 HARVEST: Earned ${totalEarnings.toFixed(2)}. New balance: ${getGameState().money.toFixed(2)}`);
}
function handleStrawDecision(lotId, decision) {
    const state = getGameState();
    const { lots, lotDecisions } = state;
    
    // Store the decision
    const newDecisions = { ...lotDecisions, [lotId]: decision };
    // The core logic (modifiers) will be applied when proceeding to the next year.
    // For now, we just update the state to reflect the choice has been made.
    setGameState({ lotDecisions: newDecisions });
    // Check if all decisions have been made
    if (Object.keys(newDecisions).length === lots.length) {
        // This can trigger UI changes, like showing a "Proceed" button.
        if (GAME_CONFIG.DEBUG) console.log("✅ All straw decisions have been made.");
    }
}
function handlePreSeasonDecision(lotId, decision) {
    const state = getGameState();
    const newDecisions = { ...state.preSeasonDecisions, [lotId]: decision };
    setGameState({ preSeasonDecisions: newDecisions });
    const allDecided = Object.keys(newDecisions).length === state.lots.length;
    if (allDecided) {
        if (GAME_CONFIG.DEBUG) console.log("✅ All pre-season decisions have been made.");
    }
    // Return whether all decisions are now complete
    return allDecided;
}
function proceedToNextYear() {
    const state = getGameState();
    const { lots, lotDecisions } = state;
    
    const actionKeep = GameData.get('action_keep_straw');
    const actionSell = GameData.get('action_sell_straw');
    const vinasseAction = GameData.get('action_apply_vinasse');
    
    let totalStrawEarnings = 0;
    let nextYearNdviModifiers = [...state.ndviModifiers]; // Copy existing modifiers
    
    const nextYearLots = lots.map((lot, index) => {
        const postHarvestDecision = lotDecisions[lot.id];
        const preSeasonDecision = state.preSeasonDecisions[lot.id];
        const newLot = { ...lot };
        // Post-harvest (straw) modifiers
        if (postHarvestDecision === 'SELL_STRAW') {
            totalStrawEarnings += 10 * 50; // 10 tons * $50/ton
            newLot.soilOrganicMatter *= (1 + actionSell.Value2);
            newLot.waterRetention *= (1 + actionSell.Value3);
            nextYearNdviModifiers[index] = actionSell.Value4;
        } else if (postHarvestDecision === 'KEEP_STRAW') {
            newLot.soilOrganicMatter *= (1 + actionKeep.Value2);
            newLot.waterRetention *= (1 + actionKeep.Value3);
            nextYearNdviModifiers[index] = actionKeep.Value4;
        }
        // Pre-season (vinasse) modifiers for next year's NDVI
        if (preSeasonDecision === 'PLANT_VINASSE') {
             nextYearNdviModifiers[index] += vinasseAction.Value4;
        }
        return newLot;
    });
    if (totalStrawEarnings > 0) {
        setGameState({ money: state.money + totalStrawEarnings });
        setTimeout(() => alert(`Straw sold for $${totalStrawEarnings.toFixed(2)}!`), 100);
    }
    checkForWinCondition();
    const years = [2020, 2021, 2022, 2023, 2024];
    const currentYearIndex = years.indexOf(state.currentYear);
    const nextYear = years[currentYearIndex + 1];
    if (nextYear) {
        setGameState({ 
            currentYear: nextYear, 
            lots: nextYearLots, 
            ndviModifiers: nextYearNdviModifiers 
        });
        setTimeout(startNewYear, 2000);
    } else {
        // If the game isn't won, it's game over.
        if (getGameState().gamePhase !== 'WIN') {
            setGameState({ gamePhase: 'GAME_OVER' });
            if (GAME_CONFIG.DEBUG) console.log("🏁 5-year cycle complete. Game Over.");
        }
    }
}
function checkForWinCondition() {
    let state = getGameState();
    const avgNDVI = state.lots.reduce((sum, lot) => sum + lot.ndvi, 0) / state.lots.length;
    const avgLST = state.lots.reduce((sum, lot) => sum + lot.lst, 0) / state.lots.length;
    const history = [...state.performanceHistory, { year: state.currentYear, ndvi: avgNDVI, lst: avgLST }];
    
    if (history.length >= 3) {
        const lastThreeYears = history.slice(-3);
        const allMetConditions = lastThreeYears.every(
            yearStats => yearStats.ndvi > 0.7 && yearStats.lst < 34
        );
        if (allMetConditions) {
            setGameState({ gamePhase: 'WIN' });
            console.log("🏆 CONDIÇÃO DE VITÓRIA ALCANÇADA! 🏆");
            return; // Stop further execution
        }
    }
    setGameState({ performanceHistory: history });
}
export function setupGameCycle(world, dependencies) {
    window.gameCycle = {
        startGrowingSeason,
        runHarvest,
        handleStrawDecision,
        handlePreSeasonDecision,
        proceedToNextYear,
        startNewYear, // Expose for restart
    };
    
    // Don't auto-start anymore - wait for intro screen button
    if (GAME_CONFIG.DEBUG) console.log("🔄 Game Cycle system initialized with historical data.");
}

