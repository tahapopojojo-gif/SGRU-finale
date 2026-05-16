/**
 * City coordinate lookup for Morocco.
 * Used to auto-center Leaflet maps on the user's assigned city.
 */

export const CITY_COORDINATES = {
  'casablanca': { lat: 33.5731, lng: -7.5898, zoom: 14 },
  'marrakech':  { lat: 31.6295, lng: -8.0083, zoom: 15 },
  'marrakesh':  { lat: 31.6295, lng: -8.0083, zoom: 15 },
  'rabat':      { lat: 34.0209, lng: -6.8416, zoom: 14 },
  'fes':        { lat: 34.0181, lng: -5.0078, zoom: 14 },
  'tanger':     { lat: 35.7595, lng: -5.8340, zoom: 14 },
  'agadir':     { lat: 30.4278, lng: -9.5981, zoom: 14 },
  'meknes':     { lat: 33.8935, lng: -5.5473, zoom: 14 },
  'oujda':      { lat: 34.6814, lng: -1.9086, zoom: 14 },
  'kenitra':    { lat: 34.2610, lng: -6.5802, zoom: 14 },
  'tetouan':    { lat: 35.5889, lng: -5.3626, zoom: 14 },
};

export const DEFAULT_CENTER = { lat: 31.7917, lng: -7.0926, zoom: 6 };

/**
 * Returns coordinates + zoom for a city.
 * Falls back to Morocco's geographic center if city is unknown.
 */
export function getCityCenter(city) {
  if (!city) return DEFAULT_CENTER;
  const key = city.toLowerCase().trim();
  return CITY_COORDINATES[key] || DEFAULT_CENTER;
}
