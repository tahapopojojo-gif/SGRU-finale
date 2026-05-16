/**
 * cityBounds.js — Geographic boundary config for Moroccan cities.
 * Used to lock Leaflet maps to the user's assigned city.
 *
 * bounds format: [[southLat, westLng], [northLat, eastLng]]
 * maxBoundsViscosity: 1.0 = hard wall, user cannot pan outside at all
 * minZoom: prevents zooming out enough to see outside the city
 */

export const CITY_MAP_CONFIG = {
  casablanca: {
    center: [33.5731, -7.5898],
    zoom: 13,
    minZoom: 11,
    bounds: [[33.35, -7.75], [33.75, -7.35]]
  },
  marrakech: {
    center: [31.6295, -7.9811],
    zoom: 13,
    minZoom: 11,
    bounds: [[31.45, -8.15], [31.85, -7.75]]
  },
  marrakesh: {
    center: [31.6295, -7.9811],
    zoom: 13,
    minZoom: 11,
    bounds: [[31.45, -8.15], [31.85, -7.75]]
  },
  rabat: {
    center: [34.0209, -6.8416],
    zoom: 13,
    minZoom: 11,
    bounds: [[33.85, -7.05], [34.20, -6.65]]
  },
  fes: {
    center: [34.0181, -5.0078],
    zoom: 13,
    minZoom: 11,
    bounds: [[33.85, -5.20], [34.20, -4.85]]
  },
  tanger: {
    center: [35.7595, -5.8340],
    zoom: 13,
    minZoom: 11,
    bounds: [[35.55, -6.05], [35.95, -5.60]]
  },
  agadir: {
    center: [30.4278, -9.5981],
    zoom: 13,
    minZoom: 11,
    bounds: [[30.25, -9.80], [30.65, -9.40]]
  },
  meknes: {
    center: [33.8935, -5.5473],
    zoom: 13,
    minZoom: 11,
    bounds: [[33.70, -5.75], [34.10, -5.35]]
  },
  oujda: {
    center: [34.6814, -1.9086],
    zoom: 13,
    minZoom: 11,
    bounds: [[34.50, -2.10], [34.90, -1.70]]
  },
  kenitra: {
    center: [34.2610, -6.5802],
    zoom: 13,
    minZoom: 11,
    bounds: [[34.05, -6.80], [34.50, -6.35]]
  },
  tetouan: {
    center: [35.5889, -5.3626],
    zoom: 13,
    minZoom: 11,
    bounds: [[35.40, -5.55], [35.80, -5.15]]
  }
};

// Fallback: entire Morocco (no city restriction)
export const MOROCCO_CONFIG = {
  center: [31.7917, -7.0926],
  zoom: 6,
  minZoom: 5,
  bounds: [[27.5, -13.5], [36.0, -1.0]]
};

/**
 * Returns the map config for a given city name.
 * Falls back to Morocco-wide view if city is unknown or null.
 */
export function getCityMapConfig(cityName) {
  if (!cityName) return MOROCCO_CONFIG;
  const key = cityName.toLowerCase().trim();
  return CITY_MAP_CONFIG[key] || MOROCCO_CONFIG;
}
