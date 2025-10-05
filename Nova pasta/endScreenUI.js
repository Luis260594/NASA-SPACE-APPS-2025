

/**
 * END SCREEN UI
 *
 * This module manages the display of the final summary screen when the 5-year cycle is complete.
 */
import { subscribeToState, useGameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

let endScreen;
let restartGameBtn;
let moneyEl;
let yearEl;

export function setupEndScreenUI() {
    endScreen = document.getElementById('endScreen');
    restartGameBtn = document.getElementById('restartGameBtnEnd');
    moneyEl = document.getElementById('end-final-money');
    yearEl = document.getElementById('end-final-year');

    if (!endScreen || !restartGameBtn || !moneyEl || !yearEl) {
        console.error("End Screen UI Error: DOM elements not found.");
        return;
    }

    const { restartGame } = useGameState.getState();

    restartGameBtn.addEventListener('click', () => {
        // Hide screen immediately
        endScreen.style.display = 'none';
        
        // Reset the game state
        restartGame();
        
        // A small timeout ensures the state update propagates before the new year starts.
        setTimeout(() => {
            if (window.gameCycle && typeof window.gameCycle.startNewYear === 'function') {
                window.gameCycle.startNewYear();
            }
        }, 100);
    });

    subscribeToState((state, prevState) => {
        if (state.gamePhase === 'GAME_OVER' && prevState.gamePhase !== 'GAME_OVER') {
            endScreen.style.display = 'flex';
            const finalState = useGameState.getState();
            moneyEl.textContent = `$${finalState.money.toFixed(2)}`;
            yearEl.textContent = finalState.currentYear;
        }
        
        if (state.gamePhase !== 'GAME_OVER' && endScreen.style.display !== 'none') {
            endScreen.style.display = 'none';
        }
    });

    if (GAME_CONFIG.DEBUG) console.log("🔚 End Screen UI Initialized.");
}

