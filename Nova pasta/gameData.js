

/**
 * GAME DATA MODULE
 * 
 * This module ingests the game's core data from a structured format,
 * parses it, and provides an easy-to-use API for other systems to
 * access game parameters, resource details, action modifiers, and more.
 * This acts as the single source of truth for all static game data.
 */

// Raw data representing the GameData table.
const rawGameData = [
    { DataID: 'player_farm', DataType: 'Player', Name: 'Sustainable Farm', Description: "The player's main entity, holding shared resources.", Value1: 10000, Value2: null, Value3: null, Value4: null, Value5: null, Notes: "Initial Money ($), unused, unused, unused, unused" },
    { DataID: 'lot_1', DataType: 'FarmLot', Name: 'Lot 1', Description: "The first quadrant of the farm.", Value1: 50, Value2: 50, Value3: 0.62, Value4: 35.5, Value5: 370, Notes: "Soil Organic Matter (%), Water Retention (%), Current NDVI, Current LST (°C), Current RZSM (kg/m²)" },
    { DataID: 'lot_2', DataType: 'FarmLot', Name: 'Lot 2', Description: "The second quadrant of the farm.", Value1: 45, Value2: 48, Value3: 0.58, Value4: 36.8, Value5: 365, Notes: "Soil Organic Matter (%), Water Retention (%), Current NDVI, Current LST (°C), Current RZSM (kg/m²)" },
    { DataID: 'lot_3', DataType: 'FarmLot', Name: 'Lot 3', Description: "The third quadrant of the farm.", Value1: 55, Value2: 52, Value3: 0.65, Value4: 34.9, Value5: 375, Notes: "Soil Organic Matter (%), Water Retention (%), Current NDVI, Current LST (°C), Current RZSM (kg/m²)" },
    { DataID: 'lot_4', DataType: 'FarmLot', Name: 'Lot 4', Description: "The fourth quadrant of the farm.", Value1: 52, Value2: 45, Value3: 0.60, Value4: 37.1, Value5: 368, Notes: "Soil Organic Matter (%), Water Retention (%), Current NDVI, Current LST (°C), Current RZSM (kg/m²)" },
    { DataID: 'env_profile_1', DataType: 'Env_Profile', Name: 'Year 1 Profile', Description: "Climate profile based on Year 1 of research.", Value1: 34.5, Value2: 0.68, Value3: null, Value4: null, Value5: null, Notes: "Base LST (°C), Base NDVI Potential" },
    { DataID: 'env_profile_2', DataType: 'Env_Profile', Name: 'Year 2 Profile', Description: "Climate profile based on Year 2 of research.", Value1: 36.1, Value2: 0.65, Value3: null, Value4: null, Value5: null, Notes: "Base LST (°C), Base NDVI Potential" },
    { DataID: 'env_profile_3', DataType: 'Env_Profile', Name: 'Year 3 Profile', Description: "Climate profile based on Year 3 of research.", Value1: 38.2, Value2: 0.61, Value3: null, Value4: null, Value5: null, Notes: "Base LST (°C), Base NDVI Potential" },
    { DataID: 'env_profile_4', DataType: 'Env_Profile', Name: 'Year 4 Profile', Description: "Climate profile based on Year 4 of research.", Value1: 35.0, Value2: 0.70, Value3: null, Value4: null, Value5: null, Notes: "Base LST (°C), Base NDVI Potential" },
    { DataID: 'env_profile_5', DataType: 'Env_Profile', Name: 'Year 5 Profile', Description: "Climate profile based on Year 5 of research.", Value1: 34.8, Value2: 0.69, Value3: null, Value4: null, Value5: null, Notes: "Base LST (°C), Base NDVI Potential" },
    { DataID: 'action_sell_straw', DataType: 'Modifier', Name: 'Sell Straw', Description: "Sell 100% of the straw from one lot.", Value1: 1, Value2: -0.10, Value3: -0.15, Value4: -0.08, Notes: "Money Multiplier, Organic Matter Modifier (%), Water Retention Modifier (%), Next Year's NDVI Modifier." },
    { DataID: 'action_keep_straw', DataType: 'Modifier', Name: 'Keep Straw', Description: "Keep 100% of the straw on one lot.", Value1: 0, Value2: 0.05, Value3: 0.10, Value4: 0.05, Notes: "Money Multiplier, Organic Matter Modifier (%), Water Retention Modifier (%), Next Year's NDVI Modifier." },
    { DataID: 'action_apply_vinasse', DataType: 'Modifier', Name: 'Apply Vinasse', Description: "Apply vinasse to one lot.", Value1: 0.08, Value2: 0.02, Value3: -0.05, Value4: 0.02, Notes: "TCH Yield Bonus per 100 m³/ha, Soil pH modifier, Salinity Risk, Next Year's NDVI Modifier." },
    { DataID: 'ui_map_ndvi', DataType: 'UI', Name: 'NDVI Map', Description: "Color palette for NDVI map.", Value1: '#8B4513', Value2: '#FFFF00', Value3: '#006400', Value4: null, Notes: "Brown (Low), Yellow (Medium), Green (High)." },
    { DataID: 'ui_map_lst', DataType: 'UI', Name: 'LST Map', Description: "Color palette for LST map.", Value1: '#0000FF', Value2: '#FFFF00', Value3: '#FF0000', Value4: null, Notes: "Blue (Cool), Yellow (Warm), Red (Hot)." },
    { DataID: 'event_drought', DataType: 'Event', Name: 'Drought', Description: "Drought event triggered by high LST.", Value1: -0.20, Value2: null, Value3: null, Value4: null, Notes: "Yield Modifier (%)" },
    { DataID: 'upgrade_sensors', DataType: 'Upgrade', Name: 'Advanced Soil Sensors', Description: "Installs field sensors for more precise data, granting a passive bonus of +0.02 to NDVI each year.", Value1: 15000, Value2: 0.02, Value3: null, Value4: null, Value5: null, Notes: "Cost ($), NDVI Bonus, unused, unused, unused" },
    { DataID: 'upgrade_irrigation', DataType: 'Upgrade', Name: 'Precision Irrigation System', Description: "An intelligent irrigation system that combats water stress, reducing the base LST by 2.0°C each year.", Value1: 30000, Value2: -2.0, Value3: null, Value4: null, Value5: null, Notes: "Cost ($), LST Modifier (°C), unused, unused, unused" },
    { DataID: 'indicator_rzsm', DataType: 'Indicator', Name: 'Root Zone Soil Moisture', Description: "The amount of water available to the plant's roots, measured in kg/m². This value is critical for surviving heat stress. Based on data from NASA's SMAP mission.", Value1: 340, Value2: 400, Value3: null, Value4: null, Value5: null, Notes: "Min Value (Wilting Point), Max Value (Field Capacity), unused, unused, unused" },
    { DataID: 'ui_icon_rzsm', DataType: 'UI', Name: 'RZSM Icon', Description: "An icon representing soil moisture.", Value1: null, Value2: null, Value3: null, Value4: null, Value5: null, Notes: "Visual asset for UI." },
    { DataID: 'ui_button_upgrades', DataType: 'UI', Name: 'Upgrades Button', Description: "Icon for the upgrades menu button.", Value1: null, Value2: null, Value3: null, Value4: null, Value5: null, Notes: "Visual asset for UI." }
];

// Process the raw data into a more accessible format (a map by DataID).
const processedData = new Map(rawGameData.map(item => [item.DataID, item]));

/**
 * The main GameData object, providing methods to access the processed data.
 */
export const GameData = {
    /**
     * Get a specific data entry by its ID.
     * @param {string} dataId The unique ID of the data entry.
     * @returns {object | undefined} The data object or undefined if not found.
     */
    get: (dataId) => {
        const item = processedData.get(dataId);
        if (!item) {
            console.warn(`GameData: Item with ID "${dataId}" not found.`);
        }
        return item;
    },

    /**
     * Get all data entries.
     * @returns {Map<string, object>} A map of all data entries.
     */
    getAll: () => processedData,

    /**
     * Get all data entries of a specific type.
     * @param {string} dataType The category to filter by (e.g., 'Resource', 'Modifier').
     * @returns {object[]} An array of data objects matching the type.
     */
    getByType: (dataType) => {
        return rawGameData.filter(item => item.DataType === dataType);
    }
};

// Log for debugging to confirm the module is loaded.
console.log("📊 GameData module initialized.");

