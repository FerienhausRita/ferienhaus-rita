import { getWeather } from "@/lib/weather";

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function weatherIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export default async function WeatherWidget() {
  const weather = await getWeather();

  if (!weather) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-stone-400 mb-3">
        Wetter in Kals
      </h3>

      {/* Current */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={weatherIconUrl(weather.current.icon)}
          alt={weather.current.description}
          width={56}
          height={56}
          className="flex-shrink-0"
        />
        <div>
          <p className="text-3xl font-bold text-stone-900">
            {weather.current.temp}°C
          </p>
          <p className="text-sm text-stone-500 capitalize">
            {weather.current.description}
          </p>
          <p className="text-xs text-stone-400">
            Gefühlt {weather.current.feels_like}°C
          </p>
        </div>
      </div>

      {/* Forecast */}
      {weather.forecast.length > 0 && (
        <div className="border-t border-stone-100 pt-3">
          <div className="grid grid-cols-5 gap-1">
            {weather.forecast.slice(0, 5).map((day) => {
              const date = new Date(day.date + "T12:00:00");
              const weekday = WEEKDAYS_DE[date.getDay()];
              return (
                <div key={day.date} className="text-center">
                  <p className="text-xs font-medium text-stone-500">{weekday}</p>
                  <img
                    src={weatherIconUrl(day.icon)}
                    alt={day.description}
                    width={36}
                    height={36}
                    className="mx-auto"
                  />
                  <p className="text-xs text-stone-700 font-medium">
                    {day.temp_max}°
                  </p>
                  <p className="text-xs text-stone-400">{day.temp_min}°</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
