/**
 * EXTERNAL API (ELITE)
 * Features: Centralized proxy for external geolocation services.
 */

export const externalApi = {
  getIpLocation: async () => {
    const res = await fetch('https://geolocation-db.com/json/');
    if (!res.ok) throw new Error('IP Geolocation failed');
    return res.json();
  },

  getReverseGeocode: async (lat: number, lng: number) => {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}`);
    if (!res.ok) throw new Error('Reverse Geocoding failed');
    return res.json();
  }
};
