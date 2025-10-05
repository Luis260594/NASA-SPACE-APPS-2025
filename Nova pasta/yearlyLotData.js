

/**
 * HISTORICAL YEARLY LOT DATA
 *
 * This file contains the specific, hardcoded NDVI and LST values
 * for each of the four lots for every year in the 5-year game cycle.
 * This data is used at the start of each new year to set the initial
 * environmental conditions for the lots, overriding the dynamic simulation.
 */

export const yearlyLotData = {
  2020: {
    lots: [
      { ndvi: 0.65, lst: 33.69, rzsm: 372 }, // Lot 1
      { ndvi: 0.57, lst: 34.30, rzsm: 365 }, // Lot 2
      { ndvi: 0.73, lst: 33.03, rzsm: 378 }, // Lot 3
      { ndvi: 0.68, lst: 33.80, rzsm: 370 }, // Lot 4
    ]
  },
  2021: {
    lots: [
      { ndvi: 0.68, lst: 32.58, rzsm: 375 }, // Lot 1
      { ndvi: 0.66, lst: 33.00, rzsm: 370 }, // Lot 2
      { ndvi: 0.72, lst: 32.30, rzsm: 380 }, // Lot 3
      { ndvi: 0.69, lst: 32.30, rzsm: 376 }, // Lot 4
    ]
  },
  2022: {
    lots: [
      { ndvi: 0.68, lst: 32.30, rzsm: 376 }, // Lot 1
      { ndvi: 0.64, lst: 33.20, rzsm: 368 }, // Lot 2
      { ndvi: 0.71, lst: 31.50, rzsm: 382 }, // Lot 3
      { ndvi: 0.67, lst: 32.90, rzsm: 372 }, // Lot 4
    ]
  },
  2023: {
    lots: [
      { ndvi: 0.71, lst: 32.60, rzsm: 378 }, // Lot 1
      { ndvi: 0.70, lst: 33.80, rzsm: 372 }, // Lot 2
      { ndvi: 0.74, lst: 30.20, rzsm: 385 }, // Lot 3
      { ndvi: 0.71, lst: 31.50, rzsm: 380 }, // Lot 4
    ]
  },
  2024: {
    lots: [
      { ndvi: 0.72, lst: 34.40, rzsm: 370 }, // Lot 1
      { ndvi: 0.69, lst: 35.20, rzsm: 362 }, // Lot 2
      { ndvi: 0.73, lst: 33.80, rzsm: 375 }, // Lot 3
      { ndvi: 0.71, lst: 34.50, rzsm: 368 }, // Lot 4
    ]
  }
};

