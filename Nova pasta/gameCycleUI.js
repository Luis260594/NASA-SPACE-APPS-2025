

/**
 * GAME CYCLE UI
 *
 * This module manages the modal pop-ups for the annual game cycle.
 * It subscribes to the `gamePhase` state and shows the appropriate
 * UI for pre-season, post-harvest decisions, and other events.
 */

import { subscribeToState, getGameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';
import { GameData } from './gameData.js';

// --- DOM Element References ---
let preSeasonScreen, postHarvestScreen;
let preSeasonTitle, preSeasonText, startGrowingBtn;
let postHarvestTitle, postHarvestText, decisionContainer, proceedBtn;
let preSeasonDecisionContainer;
let startHarvestBtn;
let mainActionButton;
let rzsmEducationBox;
function showRZSMEducation() {
    if (!rzsmEducationBox) {
        rzsmEducationBox = document.createElement('div');
        rzsmEducationBox.className = 'game-modal';
        rzsmEducationBox.style.display = 'flex';
        rzsmEducationBox.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h2 style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 32px;">💧</span>
                    The Importance of Soil Moisture
                </h2>
                <div style="text-align: left; margin: 20px 0;">
                    <p style="line-height: 1.8;">
                        <strong>Root Zone Soil Moisture (RZSM)</strong> is the water available to your crops' roots. 
                        NASA's SMAP (Soil Moisture Active Passive) satellite mission measures this globally to help 
                        farmers manage irrigation and predict droughts.
                    </p>
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 3px solid #3498db;">
                        <p style="margin: 0; line-height: 1.8;">
                            <strong>In the game:</strong> High RZSM helps your crops survive heat stress from high LST. 
                            Irrigation is your primary tool to increase RZSM, but be mindful of your budget!
                        </p>
                    </div>
                    <p style="line-height: 1.8; opacity: 0.8;">
                        Your RZSM naturally depletes each year due to evapotranspiration, especially when temperatures are high. 
                        Keep it above the wilting point (340 kg/m²) to maintain healthy crops!
                    </p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-button primary" onclick="this.closest('.game-modal').remove();">Got it!</button>
                </div>
            </div>
        `;
        document.body.appendChild(rzsmEducationBox);
    }
}
function updatePreSeasonUI(state) {
    // Show RZSM education on first irrigation opportunity
    if (!state.hasSeenRZSMEducation && state.gamePhase === 'PRE_SEASON') {
        showRZSMEducation();
        const { setStat } = window.gameEngine?.world ? {} : require('./gameState.js').useGameState.getState();
        if (setStat) setStat('hasSeenRZSMEducation', true);
    }
    preSeasonTitle.textContent = `Year ${state.currentYear} - Planning Phase`;
    preSeasonText.innerHTML = `Plan your next harvest. Planting costs <strong>$${GAME_CONFIG.COSTS.PLANTING}</strong>, Irrigation <strong>$${GAME_CONFIG.COSTS.IRRIGATION}</strong>, and Vinasse <strong>$${GAME_CONFIG.COSTS.VINASSE}</strong> per lot.`;
    preSeasonDecisionContainer.innerHTML = ''; // Clear old content
    state.lots.forEach(lot => {
        const decision = state.preSeasonDecisions[lot.id];
        const lotDiv = document.createElement('div');
        lotDiv.className = 'decision-lot';
        if (decision) lotDiv.classList.add('decided');
        let decisionText = 'No action';
        if (decision === 'PLANT') decisionText = 'Plant';
        if (decision === 'PLANT_IRRIGATE') decisionText = 'Plant & Irrigate';
        if (decision === 'PLANT_VINASSE') decisionText = 'Plant & Apply Vinasse';
        lotDiv.innerHTML = `
            <h4>Lot ${lot.id}</h4>
            <p>NDVI: ${lot.ndvi.toFixed(2)}, LST: ${lot.lst.toFixed(1)}°C</p>
            <p style="margin-top: 5px;">💧 RZSM: ${lot.rzsm.toFixed(0)} kg/m²</p>
            <div class="decision-lot-buttons" style="display: ${decision ? 'none' : 'grid'};">
                <div class="action-card" data-lot-id="${lot.id}" data-decision="PLANT">
                    <h5>Standard Planting</h5>
                    <p class="action-game-effect">Cost: $${GAME_CONFIG.COSTS.PLANTING}. A standard harvest.</p>
                    <p class="action-sustainability-info">Establishes the crop for the season. This is the baseline practice, with opportunities to enhance sustainability through other actions.</p>
                </div>
                 <div class="action-card" data-lot-id="${lot.id}" data-decision="PLANT_IRRIGATE">
                    <h5>Plant & Irrigate</h5>
                    <p class="action-game-effect">Cost: $${GAME_CONFIG.COSTS.PLANTING + GAME_CONFIG.COSTS.IRRIGATION}. Reduces LST to protect yield.</p>
                    <p class="action-sustainability-info">Precision irrigation minimizes water waste and helps crops endure heat stress from climate change, ensuring food security without depleting water resources.</p>
                </div>
                <div class="action-card" data-lot-id="${lot.id}" data-decision="PLANT_VINASSE">
                    <h5>Plant & Apply Vinasse</h5>
                    <p class="action-game-effect">Cost: $${GAME_CONFIG.COSTS.PLANTING + GAME_CONFIG.COSTS.VINASSE}. Boosts yield and improves soil for next year.</p>
                    <p class="action-sustainability-info">Vinasse, a byproduct of ethanol production, is a natural fertilizer. Using it recycles nutrients, reduces chemical fertilizer use, and enriches the soil with organic matter.</p>
                </div>
            </div>
            <p style="display: ${decision ? 'block' : 'none'}; font-weight: bold;">
                Decision: ${decisionText}
            </p>
        `;
        preSeasonDecisionContainer.appendChild(lotDiv);
    });
    preSeasonDecisionContainer.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => {
            const lotId = card.dataset.lotId;
            const decision = card.dataset.decision;
            window.gameCycle.handlePreSeasonDecision(lotId, decision);
        });
    });
    
    // Check if all decisions are made
    const allDecided = state.lots.length === Object.keys(state.preSeasonDecisions).length;
    if (allDecided) {
        mainActionButton.textContent = 'Start Growing Season';
        mainActionButton.style.display = 'block';
    } else {
        mainActionButton.style.display = 'none';
    }
    preSeasonScreen.style.display = 'flex';
}
function updatePostHarvestUI(state) {
    postHarvestTitle.textContent = `Year ${state.currentYear} - Harvest`;
    const totalYield = state.lots.reduce((sum, lot) => sum + lot.finalYield, 0);
    postHarvestText.innerHTML = `The harvest is complete. Average yield: <strong>${(totalYield / state.lots.length).toFixed(2)}</strong> TCH.`;
    
    decisionContainer.innerHTML = ''; // Clear previous lot decisions
    state.lots.forEach(lot => {
        const decisionMade = state.lotDecisions[lot.id];
        
        const lotDiv = document.createElement('div');
        lotDiv.className = 'decision-lot';
        if (decisionMade) {
            lotDiv.classList.add('decided');
        }
        lotDiv.innerHTML = `
            <h4>Lot ${lot.id}</h4>
            <p>Yield: ${lot.finalYield.toFixed(2)} TCH</p>
            <div class="decision-lot-buttons" style="display: ${decisionMade ? 'none' : 'grid'};">
                <div class="action-card" data-lot-id="${lot.id}" data-decision="KEEP_STRAW">
                    <h5>Keep Straw Residue</h5>
                    <p class="action-game-effect">Improves soil health for next year.</p>
                    <p class="action-sustainability-info">Leaving straw on the field acts as a natural mulch, protecting the soil from erosion, conserving moisture, and adding organic matter as it decomposes. This is a cornerstone of regenerative agriculture.</p>
                </div>
                 <div class="action-card" data-lot-id="${lot.id}" data-decision="SELL_STRAW">
                    <h5>Sell Straw for Bioenergy</h5>
                    <p class="action-game-effect">Gain immediate income.</p>
                    <p class="action-sustainability-info">Sugarcane straw (bagasse) is a valuable biofuel. Selling it contributes to the renewable energy supply, reducing reliance on fossil fuels. This creates an economic incentive for sustainable practices.</p>
                </div>
            </div>
            <p style="display: ${decisionMade ? 'block' : 'none'}; font-weight: bold;">
                Decision: ${decisionMade === 'KEEP_STRAW' ? 'Keep Straw' : 'Sell Straw'}
            </p>
        `;
        decisionContainer.appendChild(lotDiv);
    });
    // Add event listeners to the new buttons
    decisionContainer.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => {
            const lotId = card.dataset.lotId;
            const decision = card.dataset.decision;
            window.gameCycle.handleStrawDecision(lotId, decision);
        });
    });
    const allDecided = state.lots.length === Object.keys(state.lotDecisions).length;
    if (allDecided) {
        mainActionButton.textContent = 'Proceed to Next Year';
        mainActionButton.style.display = 'block';
    }
    postHarvestScreen.style.display = 'flex';
}
function hideAllModals() {
    if (preSeasonScreen) preSeasonScreen.style.display = 'none';
    if (postHarvestScreen) postHarvestScreen.style.display = 'none';
    if (startHarvestBtn) startHarvestBtn.style.display = 'none';
    if (mainActionButton) mainActionButton.style.display = 'none';
}
export function setupGameCycleUI() {
    preSeasonScreen = document.getElementById('preSeasonScreen');
    postHarvestScreen = document.getElementById('postHarvestScreen');
    preSeasonTitle = document.getElementById('preSeasonTitle');
    preSeasonText = document.getElementById('preSeasonText');
    startGrowingBtn = document.getElementById('startGrowingBtn');
    preSeasonDecisionContainer = document.getElementById('preSeasonDecisionContainer');
    postHarvestTitle = document.getElementById('postHarvestTitle');
    postHarvestText = document.getElementById('postHarvestText');
    decisionContainer = document.getElementById('decision-container');
    proceedBtn = document.getElementById('proceedBtn');
    startHarvestBtn = document.getElementById('startHarvestBtn');
    mainActionButton = document.getElementById('mainActionButton');
    if (!preSeasonScreen || !postHarvestScreen || !decisionContainer || !proceedBtn || !preSeasonDecisionContainer || !startHarvestBtn || !mainActionButton) {
        console.error("Game Cycle UI Error: One or more required DOM elements are missing.");
        return;
    }
    // Main action button logic
    mainActionButton.addEventListener('click', () => {
        const state = getGameState();
        hideAllModals();
        switch (state.gamePhase) {
            case 'PRE_SEASON':
                window.gameCycle?.startGrowingSeason();
                break;
            case 'GROWING':
                window.gameCycle?.runHarvest();
                break;
            case 'POST_HARVEST':
                window.gameCycle?.proceedToNextYear();
                break;
        }
    });
    // The original buttons are now just for legacy event listeners, which we can remove.
    // Their click logic is now handled by the mainActionButton.
    // startGrowingBtn.addEventListener...
    // startHarvestBtn.addEventListener...
    // proceedBtn.addEventListener...
    
    subscribeToState((state, prevState) => {
        const phaseChanged = state.gamePhase !== prevState.gamePhase;
        if (phaseChanged) {
             hideAllModals(); // Hide modals on any phase change
            switch (state.gamePhase) {
                case 'PRE_SEASON':
                    updatePreSeasonUI(state);
                    break;
                case 'GROWING':
                    // In the growing phase, no modal is shown, just the harvest button.
                    mainActionButton.textContent = 'Start Harvest';
                    mainActionButton.style.display = 'block';
                    break;
                case 'POST_HARVEST':
                    updatePostHarvestUI(state);
                    break;
                case 'IDLE':
                case 'WIN':
                case 'GAME_OVER':
                    // Make sure button is hidden in these states
                    hideAllModals();
                    break;
            }
        }
        
        // Handle decision changes within a phase, which can affect button visibility
        // This now also checks for changes in lot data, which can happen on year start.
        if (state.gamePhase === 'PRE_SEASON' && state.preSeasonDecisions !== prevState.preSeasonDecisions) {
            updatePreSeasonUI(state);
        }
        
        const postHarvestDataChanged = state.lotDecisions !== prevState.lotDecisions || state.lots !== prevState.lots;
        if (state.gamePhase === 'POST_HARVEST' && postHarvestDataChanged) {
            updatePostHarvestUI(state);
        }
    });
    if (GAME_CONFIG.DEBUG) console.log("UI: Game Cycle modals initialized.");
}

