import { searchPlacesWithGoogle } from "./googleMaps";

export interface HourlyForecastItem {
  time: string;
  hourNum: number;
  tempC: number;
  weatherCode: number;
  condition: string;
  precipProb: number;
  rainMm: number;
  isRain?: boolean;
  isDay: boolean;
}

export interface DailyForecastItem {
  dayLabel: string;
  date: string;
  weatherCode: number;
  condition: string;
  conditionBadge: string;
  tempMin: number;
  tempMax: number;
  precipSum: number;
  precipProb: number;
}

export interface DetailedWeatherData {
  live: boolean;
  locationName: string;
  coords: [number, number]; // [lng, lat]
  updatedAt: string;
  tempC: number;
  apparentTempC: number;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  condition: string;
  narrative: string;
  humidityPercent: number;
  windSpeedKmh: number;
  windDirectionText: string;
  sunriseTime: string;
  sunsetTime: string;
  uvIndex: number;
  pressureHpa: number;
  currentRainMm?: number;
  minutely15Slots?: [number, number, number, number];
  theme: "sunny" | "rainy" | "cloudy" | "night";
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
}

export function decodeWmoWeather(
  code: number,
  isDay = true,
  rainMm = 0,
): {
  condition: string;
  badge: string;
  theme: "sunny" | "rainy" | "cloudy" | "night";
  icon: "sun" | "cloud" | "rain" | "thunder" | "fog" | "snow";
} {
  if (code >= 95) {
    return {
      condition: "Mưa dông diện rộng",
      badge: "Có dông",
      theme: "rainy",
      icon: "thunder",
    };
  }
  if (code >= 80 || rainMm >= 15) {
    return {
      condition: "Mưa rào lớn",
      badge: "Có mưa",
      theme: "rainy",
      icon: "rain",
    };
  }
  if (code >= 61 || rainMm >= 4) {
    return {
      condition: "Mưa vừa",
      badge: "Có mưa",
      theme: "rainy",
      icon: "rain",
    };
  }
  if (code >= 51 || rainMm > 0) {
    return {
      condition: "Mưa nhỏ rải rác",
      badge: "Mưa nhẹ",
      theme: "rainy",
      icon: "rain",
    };
  }
  if (code === 45 || code === 48) {
    return {
      condition: "Sương mù",
      badge: "Sương mù",
      theme: "cloudy",
      icon: "fog",
    };
  }
  if (code === 3) {
    return {
      condition: "Nhiều mây",
      badge: "Nhiều mây",
      theme: isDay ? "cloudy" : "night",
      icon: "cloud",
    };
  }
  if (code === 2) {
    return {
      condition: "Ít mây",
      badge: "Nắng ráo",
      theme: isDay ? "sunny" : "night",
      icon: "cloud",
    };
  }
  if (code === 1) {
    return {
      condition: "Quang mây",
      badge: "Nắng ráo",
      theme: isDay ? "sunny" : "night",
      icon: "sun",
    };
  }
  return {
    condition: isDay ? "Trời nắng ráo" : "Trời quang về đêm",
    badge: "Quang đãng",
    theme: isDay ? "sunny" : "night",
    icon: isDay ? "sun" : "cloud",
  };
}

function getWindDirectionText(degrees: number): string {
  const directions = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
  const idx = Math.round(degrees / 45) % 8;
  return directions[idx] || "thay đổi";
}

function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Hôm Nay";
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    switch (day) {
      case 0:
        return "CN";
      case 1:
        return "Thứ 2";
      case 2:
        return "Thứ 3";
      case 3:
        return "Thứ 4";
      case 4:
        return "Thứ 5";
      case 5:
        return "Thứ 6";
      case 6:
        return "Thứ 7";
      default:
        return dateStr;
    }
  } catch {
    return dateStr;
  }
}

const INIT_VN_HOUR = Number(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()),
);
const INIT_IS_DAY = INIT_VN_HOUR >= 6 && INIT_VN_HOUR < 18;

export const DEFAULT_HCMC_WEATHER: DetailedWeatherData = {
  live: false,
  locationName: "TP. Hồ Chí Minh",
  coords: [106.7009, 10.7769],
  updatedAt: "",
  tempC: 0,
  apparentTempC: 0,
  tempMax: 0,
  tempMin: 0,
  weatherCode: 0,
  condition: "Đang tải dữ liệu thời tiết…",
  narrative: "Đang đồng bộ dữ liệu thời tiết thực tế từ Open-Meteo…",
  humidityPercent: 0,
  windSpeedKmh: 0,
  windDirectionText: "—",
  sunriseTime: "—",
  sunsetTime: "—",
  uvIndex: 0,
  pressureHpa: 0,
  currentRainMm: 0,
  minutely15Slots: [0, 0, 0, 0],
  theme: INIT_IS_DAY ? "sunny" : "night",
  hourly: [],
  daily: [],
};

/**
 * Lấy dữ liệu thời tiết thực tế từ Open-Meteo API (100% Free, thời gian thực)
 */
export async function fetchFullRealWeather(
  lat = 10.7769,
  lng = 106.7009,
  locationName = "Hồ Chí Minh",
): Promise<DetailedWeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day&minutely_15=precipitation,rain&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo returned error");
    const data = await res.json();

    const current = data.current ?? {};
    const tempC = Math.round(Number(current.temperature_2m ?? 0));
    const apparentTempC = Math.round(Number(current.apparent_temperature ?? tempC));
    const weatherCode = Number(current.weather_code ?? 2);
    const isDay = Number(current.is_day ?? 1) === 1;
    const rainMm = Number(current.rain ?? current.precipitation ?? 0);
    const humidityPercent = Math.round(Number(current.relative_humidity_2m ?? 80));
    const windSpeedKmh = Math.round(Number(current.wind_speed_10m ?? 8));
    const windDirectionText = getWindDirectionText(Number(current.wind_direction_10m ?? 120));
    const pressureHpa = Math.round(Number(current.surface_pressure ?? 1012));

    const min15Data = data.minutely_15 ?? {};
    const min15Times: string[] = min15Data.time ?? [];
    const min15Rain: number[] = min15Data.rain ?? min15Data.precipitation ?? [];
    const curTimeStr = String(current.time ?? "");
    const mIdx = Math.max(0, curTimeStr ? min15Times.findIndex((t) => t === curTimeStr) : 0);
    const minutely15Slots: [number, number, number, number] = [
      Math.round(rainMm * 10) / 10,
      Math.round(Number(min15Rain[mIdx + 2] ?? 0) * 10) / 10,
      Math.round(Number(min15Rain[mIdx + 4] ?? 0) * 10) / 10,
      Math.round(Number(min15Rain[mIdx + 6] ?? 0) * 10) / 10,
    ];

    const decoded = decodeWmoWeather(weatherCode, isDay, rainMm);

    // Daily Forecast
    const dailyData = data.daily ?? {};
    const dailyTimes: string[] = dailyData.time ?? [];
    const dailyCodes: number[] = dailyData.weather_code ?? [];
    const dailyMaxs: number[] = dailyData.temperature_2m_max ?? [];
    const dailyMins: number[] = dailyData.temperature_2m_min ?? [];
    const dailyPrecip: number[] = dailyData.precipitation_sum ?? [];
    const dailyPrecipProb: number[] = dailyData.precipitation_probability_max ?? [];

    const dailyItems: DailyForecastItem[] = dailyTimes.slice(0, 7).map((timeStr, idx) => {
      const code = dailyCodes[idx] ?? 2;
      const dec = decodeWmoWeather(code, true, dailyPrecip[idx] ?? 0);
      return {
        dayLabel: formatDayLabel(timeStr, idx),
        date: timeStr,
        weatherCode: code,
        condition: dec.condition,
        conditionBadge: dec.badge,
        tempMin: Math.round(dailyMins[idx] ?? 25),
        tempMax: Math.round(dailyMaxs[idx] ?? 33),
        precipSum: Math.round((dailyPrecip[idx] ?? 0) * 10) / 10,
        precipProb: Math.round(dailyPrecipProb[idx] ?? 40),
      };
    });

    const tempMax = dailyItems[0]?.tempMax ?? 34;
    const tempMin = dailyItems[0]?.tempMin ?? 25;

    // Sunrise & Sunset
    const sunriseRaw = String(dailyData.sunrise?.[0] ?? "");
    const sunsetRaw = String(dailyData.sunset?.[0] ?? "");
    const sunriseTime = sunriseRaw.includes("T") ? sunriseRaw.split("T")[1].slice(0, 5) : "05:45";
    const sunsetTime = sunsetRaw.includes("T") ? sunsetRaw.split("T")[1].slice(0, 5) : "17:28";
    const uvIndex = Math.round(Number(dailyData.uv_index_max?.[0] ?? 6));

    // Hourly Forecast (lấy 10 giờ tiếp theo từ giờ hiện tại)
    const hourlyData = data.hourly ?? {};
    const hourlyTimes: string[] = hourlyData.time ?? [];
    const hourlyTemps: number[] = hourlyData.temperature_2m ?? [];
    const hourlyCodes: number[] = hourlyData.weather_code ?? [];
    const hourlyProb: number[] = hourlyData.precipitation_probability ?? [];
    const hourlyRain: number[] = hourlyData.precipitation ?? [];
    const hourlyIsDay: number[] = hourlyData.is_day ?? [];

    const nowIsoHour = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }).format(new Date());

    const startIdx = Math.max(
      0,
      hourlyTimes.findIndex((t) => t.includes(`T${nowIsoHour}:`)),
    );

    const hourlyItems: HourlyForecastItem[] = hourlyTimes
      .slice(startIdx, startIdx + 10)
      .map((t, idx) => {
        const globalIdx = startIdx + idx;
        const hourStr = t.slice(11, 16) || `${(Number(nowIsoHour) + idx) % 24}:00`;
        const code = idx === 0 ? weatherCode : Number(hourlyCodes[globalIdx] ?? weatherCode);
        const dayFlag = idx === 0 ? isDay : Number(hourlyIsDay[globalIdx] ?? (isDay ? 1 : 0)) === 1;
        const rMm = idx === 0 ? rainMm : Number(hourlyRain[globalIdx] ?? 0);
        const dec = decodeWmoWeather(code, dayFlag, rMm);

        return {
          time: idx === 0 ? "Bây giờ" : hourStr,
          hourNum: Number(hourStr.slice(0, 2)) || 0,
          tempC: idx === 0 ? tempC : Math.round(Number(hourlyTemps[globalIdx] ?? tempC)),
          weatherCode: code,
          condition: dec.condition,
          precipProb: Math.round(Number(hourlyProb[globalIdx] ?? 10)),
          rainMm: rMm,
          isDay: dayFlag,
        };
      });

    // Narrative description
    let narrative = "";
    if (decoded.theme === "rainy") {
      narrative = `Hôm nay, nhiệt độ cảm nhận khoảng ${apparentTempC}°. Trời có mưa rào, nguy cơ ngập tại các tuyến đường trũng thấp. Chú ý mang theo áo mưa khi ra ngoài.`;
    } else if (tempC >= 32) {
      narrative = `Hôm nay, trời nắng gắt với nhiệt độ cảm nhận lên tới ${apparentTempC}°. Hạn chế ở ngoài nắng lâu và uống đủ nước.`;
    } else {
      narrative = `Hôm nay, nhiệt độ cảm nhận khoảng ${apparentTempC}°. Điều kiện thời tiết thuận lợi cho các hoạt động di chuyển và ngoài trời.`;
    }

    return {
      locationName,
      coords: [lng, lat],
      updatedAt: new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      tempC,
      apparentTempC,
      tempMax,
      tempMin,
      weatherCode,
      condition: decoded.condition,
      narrative,
      humidityPercent,
      live: true,
      windSpeedKmh,
      windDirectionText,
      sunriseTime,
      sunsetTime,
      uvIndex,
      pressureHpa,
      currentRainMm: Math.round(rainMm * 10) / 10,
      minutely15Slots,
      theme: decoded.theme,
      hourly: hourlyItems,
      daily: dailyItems,
    };
  } catch {
    try {
      const apiBase = "/api";
      const beRes = await fetch(
        `${apiBase}/weather/current?lat=${lat}&lng=${lng}&locationName=${encodeURIComponent(locationName)}`,
      );
      if (beRes.ok) {
        const snap = await beRes.json();
        const vnHour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            hour12: false,
          }).format(new Date()),
        );
        const isDay = vnHour >= 6 && vnHour < 18;
        const rainMm = Number(snap.currentRainMm ?? 0);
        const code = rainMm >= 15 ? 80 : rainMm >= 4 ? 61 : rainMm > 0 ? 51 : 2;
        const decoded = decodeWmoWeather(code, isDay, rainMm);
        const tempC = Math.round(Number(snap.temperatureC ?? 0));
        const apparentTempC = tempC;
        const beHourly: HourlyForecastItem[] = Array.isArray(snap.hourlyForecast)
          ? snap.hourlyForecast.map((h: any, idx: number) => {
              const hStr = String(h.time ?? `${(vnHour + idx) % 24}:00`);
              const hNum = Number(hStr.slice(0, 2)) || (vnHour + idx) % 24;
              const hDay = hNum >= 6 && hNum < 18;
              const hRain = Number(h.rainMm ?? 0);
              const hCode = hRain >= 15 ? 80 : hRain >= 4 ? 61 : hRain > 0 ? 51 : 2;
              const hDec = decodeWmoWeather(hCode, hDay, hRain);
              return {
                time: idx === 0 ? "Bây giờ" : hStr,
                hourNum: hNum,
                tempC: Math.round(Number(h.temperatureC ?? tempC)),
                weatherCode: hCode,
                condition: hDec.condition,
                precipProb: Math.round(Number(h.precipitationProbability ?? 20)),
                rainMm: hRain,
                isDay: hDay,
              };
            })
          : DEFAULT_HCMC_WEATHER.hourly;

        return {
          ...DEFAULT_HCMC_WEATHER,
          live: true,
          locationName: snap.locationName || locationName,
          coords: [Number(snap.lng ?? lng), Number(snap.lat ?? lat)],
          updatedAt: new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
          tempC,
          apparentTempC,
          weatherCode: code,
          condition: snap.weatherCondition || decoded.condition,
          humidityPercent: Math.round(Number(snap.humidityPercent ?? 80)),
          windSpeedKmh: Math.round(Number(snap.windSpeedKmh ?? 8)),
          theme: decoded.theme,
          hourly: beHourly,
        };
      }
    } catch {
      // ignore backend fallback error
    }

    return {
      ...DEFAULT_HCMC_WEATHER,
      locationName,
      coords: [lng, lat],
    };
  }
}

/**
 * Tìm kiếm thành phố / quận huyện bằng Open-Meteo Geocoding
 */
export async function searchWeatherLocation(query: string): Promise<
  Array<{
    name: string;
    country: string;
    admin1?: string;
    lat: number;
    lng: number;
    displayLabel: string;
  }>
> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const googleResults = await searchPlacesWithGoogle(clean);
    if (googleResults && googleResults.length > 0) {
      return googleResults.map((p) => ({
        name: p.address || p.label.split("·")[0].trim(),
        country: "Việt Nam",
        admin1: p.district || "TP. Hồ Chí Minh",
        lat: p.coords[1],
        lng: p.coords[0],
        displayLabel: p.label,
      }));
    }
  } catch {
    // fallback to open-meteo
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=6&language=vi&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    return results.map((r: any) => {
      const parts = [r.name, r.admin1, r.country].filter(Boolean);
      return {
        name: r.name,
        country: r.country || "Việt Nam",
        admin1: r.admin1,
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        displayLabel: parts.join(", "),
      };
    });
  } catch {
    return [];
  }
}
