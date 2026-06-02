interface IpLocationResult {
  latitude?: number;
  longitude?: number;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
}

const fetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`External API request failed with ${response.status}`);
  }

  return response.json();
};

export const externalApi = {
  async getIpLocation(): Promise<IpLocationResult> {
    try {
      const data = await fetchJson('https://ipapi.co/json/');
      return {
        latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
        city: data.city,
        locality: data.region,
        principalSubdivision: data.region,
      };
    } catch {
      return {};
    }
  },

  async getReverseGeocode(lat: number, lng: number): Promise<IpLocationResult> {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
      });

      const data = await fetchJson(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      const address = data.address ?? {};

      return {
        city: address.city ?? address.town ?? address.village,
        locality: address.suburb ?? address.county,
        principalSubdivision: address.state ?? address.region,
      };
    } catch {
      return {};
    }
  },
};
