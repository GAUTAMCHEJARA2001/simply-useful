/**
 * SERVICE CLIENT
 * Prepared for future microservices communication.
 * Right now, it's a simple fetch wrapper.
 */

export const callService = async (url: string, options: RequestInit = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Service call failed');
    }

    return data;
  } catch (error: any) {
    console.error(`SERVICE CALL ERROR [${url}]:`, error);
    return {
      success: false,
      error: error.message || 'Internal connection error',
    };
  }
};
