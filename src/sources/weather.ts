// Open-Meteo API — completely free, no API key needed
// Fetches current weather for major financial centers

const FINANCIAL_CENTERS = [
  { city: 'New York', lat: 40.7128, lon: -74.0060 },
  { city: 'London', lat: 51.5074, lon: -0.1278 },
  { city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { city: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
];

export interface CityWeather {
  city: string;
  temperature_c: number;
  is_sunny: boolean;
  condition: string;
  cloud_cover_pct: number;
}

export async function getFinancialCenterWeather(): Promise<CityWeather[]> {
  const results: CityWeather[] = [];

  const fetches = FINANCIAL_CENTERS.map(async (center) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lon}&current=temperature_2m,cloud_cover,weather_code`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) return null;
      const data = await res.json() as {
        current: { temperature_2m: number; cloud_cover: number; weather_code: number };
      };

      const code = data.current.weather_code;
      const cloud = data.current.cloud_cover;

      return {
        city: center.city,
        temperature_c: data.current.temperature_2m,
        is_sunny: cloud < 30,
        condition: weatherCodeToCondition(code),
        cloud_cover_pct: cloud,
      };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(fetches);
  for (const r of settled) {
    if (r) results.push(r);
  }

  return results;
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}
