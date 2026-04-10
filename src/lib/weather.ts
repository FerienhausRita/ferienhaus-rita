import { createServerClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const KALS_LAT = 47.0045;
const KALS_LON = 12.6432;

export interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  temp_current?: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    icon: string;
    feels_like: number;
  };
  forecast: WeatherDay[];
  location: string;
}

export async function getWeather(): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) return null;

    const supabase = createServerClient();

    // Check cache
    const { data: cached } = await supabase
      .from("weather_cache")
      .select("data, fetched_at")
      .eq("id", 1)
      .single();

    if (cached?.data && cached.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS && Object.keys(cached.data as object).length > 0) {
        return cached.data as WeatherData;
      }
    }

    // Fetch fresh data
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${KALS_LAT}&lon=${KALS_LON}&units=metric&lang=de&appid=${apiKey}`,
        { next: { revalidate: 0 } }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${KALS_LAT}&lon=${KALS_LON}&units=metric&lang=de&appid=${apiKey}`,
        { next: { revalidate: 0 } }
      ),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      console.error("Weather API error:", currentRes.status, forecastRes.status);
      return (cached?.data as WeatherData) || null;
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    // Group forecast by day (take min/max temps + noon icon)
    const dayMap = new Map<string, { temps: number[]; descriptions: string[]; icons: string[] }>();

    for (const item of forecast.list) {
      const date = item.dt_txt.split(" ")[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { temps: [], descriptions: [], icons: [] });
      }
      const day = dayMap.get(date)!;
      day.temps.push(item.main.temp);
      const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0]);
      if (hour === 12 || day.descriptions.length === 0) {
        day.descriptions[0] = item.weather[0].description;
        day.icons[0] = item.weather[0].icon;
      }
    }

    const forecastDays: WeatherDay[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const [date, data] of dayMap) {
      if (date === today) continue;
      if (forecastDays.length >= 5) break;
      forecastDays.push({
        date,
        temp_min: Math.round(Math.min(...data.temps)),
        temp_max: Math.round(Math.max(...data.temps)),
        description: data.descriptions[0] || "",
        icon: data.icons[0] || "01d",
      });
    }

    const weatherData: WeatherData = {
      current: {
        temp: Math.round(current.main.temp),
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        feels_like: Math.round(current.main.feels_like),
      },
      forecast: forecastDays,
      location: "Kals am Großglockner",
    };

    // Update cache
    await supabase
      .from("weather_cache")
      .upsert({ id: 1, data: weatherData, fetched_at: new Date().toISOString() });

    return weatherData;
  } catch (err) {
    console.error("Weather service error:", err);
    return null;
  }
}
