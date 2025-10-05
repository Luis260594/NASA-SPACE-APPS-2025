

/**
 * SATELLITE VIEW UI
 *
 * This module manages the satellite view overlay, which displays heat-map
 * visualizations for NDVI (vegetation health) and LST (surface temperature).
 * It subscribes to the central game state to reactively show, hide, and
 * update the data visualizations.
 */

import { subscribeToState, useGameState } from './gameState.js';
import { GameData } from './gameData.js';
import { GAME_CONFIG } from './config.js';

// --- DOM Element References ---
let satelliteView;
let toggleButton;
let closeButton;
let ndviToggleButton;
let lstToggleButton;
let mapPlots = [];
let mapTooltip;
let mapPanel; // Keep for tooltip hover
// --- Local State ---
let currentMapView = 'ndvi'; // 'ndvi' or 'lst'

/**
 * Parses a hex color string into an {r, g, b} object.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
}

/**
 * Linearly interpolates between two colors.
 * @param {{r, g, b}} color1 - The starting color.
 * @param {{r, g, b}} color2 - The ending color.
 * @param {number} factor - The interpolation factor (0 to 1).
 * @returns {string} - The resulting RGB color string.
 */
function lerpColor(color1, color2, factor) {
    const r = Math.round(color1.r + factor * (color2.r - color1.r));
    const g = Math.round(color1.g + factor * (color2.g - color1.g));
    const b = Math.round(color1.b + factor * (color2.b - color1.b));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Updates the map panel's color and tooltip based on the current view and game state.
 * @param {Object} state - The current game state from Zustand.
 */
function updateMapVisualization(state) {
    if (currentMapView === 'ndvi') {
        const ndviColors = GameData.get('ui_map_ndvi');
        const palette = [
            hexToRgb(ndviColors.Value1), // Low (Brown)
            hexToRgb(ndviColors.Value2), // Medium (Yellow)
            hexToRgb(ndviColors.Value3), // High (Green)
        ];
        const ndviMin = 0.5;
        const ndviMax = 0.8;
        state.lots.forEach((lot, index) => {
            const factor = Math.max(0, Math.min(1, (lot.ndvi - ndviMin) / (ndviMax - ndviMin)));
            let mapColor;
            if (factor < 0.5) {
                mapColor = lerpColor(palette[0], palette[1], factor * 2);
            } else {
                mapColor = lerpColor(palette[1], palette[2], (factor - 0.5) * 2);
            }
            mapPlots[index].style.backgroundColor = mapColor;
        });
        mapTooltip.innerHTML = `<strong>Vegetation Index (NDVI)</strong><br><small>Higher values indicate healthier, denser crops.</small>`;
    } else if (currentMapView === 'lst') {
        const lstColors = GameData.get('ui_map_lst');
        const palette = [
            hexToRgb(lstColors.Value1), // Cool (Blue)
            hexToRgb(lstColors.Value2), // Warm (Yellow)
            hexToRgb(lstColors.Value3), // Hot (Red)
        ];
        const lstMin = 30;
        const lstMax = 36;
        state.lots.forEach((lot, index) => {
            const factor = Math.max(0, Math.min(1, (lot.lst - lstMin) / (lstMax - lstMin)));
            let mapColor;
            if (factor < 0.5) {
                mapColor = lerpColor(palette[0], palette[1], factor * 2);
            } else {
                mapColor = lerpColor(palette[1], palette[2], (factor - 0.5) * 2);
            }
            mapPlots[index].style.backgroundColor = mapColor;
        });
        mapTooltip.innerHTML = `<strong>Surface Temperature (LST)</strong><br><small>High temperatures can indicate water stress in crops.</small>`;
    }
}

/**
 * Sets up the Satellite View UI system.
 * This function runs once at the start of the game.
 * @param {World} world - The ECS world.
 * @param {Object} dependencies - Engine dependencies.
 */
export function setupSatelliteViewUI(world, dependencies) {
    // Get DOM element references
    satelliteView = document.getElementById('satelliteView');
    toggleButton = document.getElementById('toggleSatelliteViewBtn');
    closeButton = document.getElementById('closeSatelliteView');
    ndviToggleButton = document.getElementById('toggle-ndvi');
    lstToggleButton = document.getElementById('toggle-lst');
    mapPanel = document.getElementById('map-panel'); // Used for hover tooltip
    mapPlots = Array.from(document.querySelectorAll('.map-plot'));
    mapTooltip = document.getElementById('map-tooltip');
    
    if (!satelliteView || !toggleButton || !closeButton || !ndviToggleButton || !lstToggleButton || !mapPanel || mapPlots.length !== 4) {
        console.error("Satellite View UI Error: One or more required DOM elements are missing.");
        return;
    }
    
    // Get the toggle action from the state store
    const { toggleSatelliteView } = useGameState.getState();
    // --- Add Event Listeners ---
    toggleButton.addEventListener('click', toggleSatelliteView);
    closeButton.addEventListener('click', toggleSatelliteView);
    ndviToggleButton.addEventListener('click', () => {
        currentMapView = 'ndvi';
        ndviToggleButton.classList.add('active');
        lstToggleButton.classList.remove('active');
        updateMapVisualization(useGameState.getState());
    });
    lstToggleButton.addEventListener('click', () => {
        currentMapView = 'lst';
        lstToggleButton.classList.add('active');
        ndviToggleButton.classList.remove('active');
        updateMapVisualization(useGameState.getState());
    });
    
     // Add hover listeners to each plot for detailed tooltips
    mapPlots.forEach((plot, index) => {
        plot.addEventListener('mouseenter', () => {
            const state = useGameState.getState();
            const lot = state.lots[index];
            if (currentMapView === 'ndvi') {
                mapTooltip.innerHTML = `Lot ${lot.id} - NDVI: <strong>${lot.ndvi.toFixed(3)}</strong><br>RZSM: <strong>${lot.rzsm.toFixed(0)} kg/m²</strong>`;
            } else {
                mapTooltip.innerHTML = `Lot ${lot.id} - LST: <strong>${lot.lst.toFixed(1)}°C</strong><br>RZSM: <strong>${lot.rzsm.toFixed(0)} kg/m²</strong>`;
            }
        });
    });
    mapPanel.addEventListener('mouseleave', () => {
         // When mouse leaves the whole panel, reset to the default text
        updateMapVisualization(useGameState.getState());
    });
    
    // Subscribe to state changes
    subscribeToState((state, prevState) => {
        // Toggle visibility
        if (state.isSatelliteViewOpen !== prevState.isSatelliteViewOpen) {
            satelliteView.style.display = state.isSatelliteViewOpen ? 'flex' : 'none';
            if (state.isSatelliteViewOpen) {
                updateMapVisualization(state); // Refresh on open
            }
        }
        
        // Update visualization if the view is open and data has changed
        if (state.isSatelliteViewOpen) {
           if (state.lots !== prevState.lots) {
                updateMapVisualization(state);
            }
        }
    });
    if (GAME_CONFIG.DEBUG) console.log("🛰️ Satellite View UI initialized.");
}

