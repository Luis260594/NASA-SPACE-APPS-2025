

/**
 * INTRODUCTION SCREEN UI
 *
 * This module manages the initial introduction screen that explains
 * the game concept and key metrics (NDVI and LST).
 */

import { GAME_CONFIG } from './config.js';

let introScreen;
let startGameBtn;

export function setupIntroScreenUI() {
    introScreen = document.getElementById('introScreen');
    startGameBtn = document.getElementById('startGameBtn');
    
    if (!introScreen || !startGameBtn) {
        console.error("Intro Screen UI Error: DOM elements not found.");
        return;
    }

    startGameBtn.addEventListener('click', () => {
        // Hide the intro screen
        introScreen.style.display = 'none';
        
        // Start background music
        const bgMusic = document.getElementById('backgroundMusic');
        if (bgMusic) {
            bgMusic.volume = 0.3; // Set volume to 30%
            bgMusic.play().catch(err => {
                if (GAME_CONFIG.DEBUG) console.log('Audio autoplay prevented:', err);
            });
        }
        
        // Start the game cycle after a brief delay
        setTimeout(() => {
            if (window.gameCycle && typeof window.gameCycle.startNewYear === 'function') {
                window.gameCycle.startNewYear();
            }
        }, 500);
    });

    if (GAME_CONFIG.DEBUG) console.log("🎮 Intro Screen UI Initialized.");
}

