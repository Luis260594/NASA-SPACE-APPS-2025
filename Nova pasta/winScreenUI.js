

/**
 * WIN SCREEN UI
 *
 * This module manages the display of the win condition screen.
 */
import { subscribeToState, useGameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

let winScreen;
let restartGameBtn;

export function setupWinScreenUI() {
    winScreen = document.getElementById('winScreen');
    restartGameBtn = document.getElementById('restartGameBtn');
    
    if (!winScreen || !restartGameBtn) {
        console.error("Win Screen UI Error: DOM elements not found.");
        return;
    }

    const { restartGame } = useGameState.getState();

    restartGameBtn.addEventListener('click', () => {
        // Hide screen immediately
        winScreen.style.display = 'none';
        
        // Reset the game state
        restartGame();
        // This relies on the global function exposed by gameCycle
        // A small timeout ensures the state update propagates before the new year starts.
        setTimeout(() => {
            if (window.gameCycle && typeof window.gameCycle.startNewYear === 'function') {
                window.gameCycle.startNewYear();
            }
        }, 100);
    });

    subscribeToState((state, prevState) => {
        if (state.gamePhase === 'WIN' && prevState.gamePhase !== 'WIN') {
            winScreen.style.display = 'flex';
            const finalState = useGameState.getState();
            const moneyEl = document.getElementById('win-final-money');
            const yearEl = document.getElementById('win-final-year');
            if (moneyEl) moneyEl.textContent = `$${finalState.money.toFixed(2)}`;
            if (yearEl) yearEl.textContent = finalState.currentYear;
        }
    });

    if (GAME_CONFIG.DEBUG) console.log("🏆 Win Screen UI Initialized.");
}

