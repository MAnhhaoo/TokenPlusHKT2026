import { searchPlacesWithGoogle } from "./googleMaps"

export interface HourlyForecastItem {
  time: string
  hourNum: number
  tempC: number
  weatherCode: number
  condition: string
  precipProb: number
  rainMm: number
  isRain?: boolean
  isDay: boolean
}

export interface DailyForecastItem {
  dayLabel: string
  date: string
  weatherCode: number
  condition: string
  conditionBadge: string
  tempMin: number
  tempMax: number
  precipSum: number
  precipProb: number
}

export interface DetailedWeatherData {
  locationName: string
  coords: [number, number] // [lng, lat]
  updatedAt: string
  tempC: number
  apparentTempC: number
  tempMax: number
  tempMin: number
  weatherCode: number
  condition: string
  narrative: string
  humidityPercent: number
  windSpeedKmh: number
  windDirectionText: string
  sunriseTime: string
  sunsetTime: string
  uvIndex: number
  pressureHpa: number
  theme: "sunny" | "rainy" | "cloudy" | "night"
  hourly: HourlyForecastItem[]
  daily: DailyForecastItem[]
}

export function decodeWmoWeather(
  code: number,
  isDay = true,
  rainMm = 0,
): {
  condition: string
  badge: string
  theme: "sunny" | "rainy" | "cloudy" | "night"
  icon: "sun" | "cloud" | "rain" | "thunder" | "fog" | "snow"
} {
  if (code >= 95) {
    return {
      condition: "Mưa dông diện rộng",
      badge: "Có dông",
      theme: "rainy",
      icon: "thunder",
    }
  }
  if (code >= 80 || rainMm >= 15) {
    return {
      condition: "Mưa rào lớn",
      badge: "Có mưa",
      theme: "rainy",
      icon: "rain",
    }
  }
  if (code >= 61 || rainMm >= 4) {
    return {
      condition: "Mưa vừa",
      badge: "Có mưa",
      theme: "rainy",
      icon: "rain",
    }
  }
  if (code >= 51 || rainMm > 0) {
    return {
      condition: "Mưa nhỏ rải rác",
      badge: "Mưa nhẹ",
      theme: "rainy",
      icon: "rain",
    }
  }
  if (code === 45 || code === 48) {
    return {
      condition: "Sương mù",
      badge: "Sương mù",
      theme: "cloudy",
      icon: "fog",
    }
  }
  if (code === 3) {
    return {
      condition: "Nhiều mây",
      badge: "Nhiều mây",
      theme: isDay ? "cloudy" : "night",
      icon: "cloud",
    }
  }
  if (code === 2) {
    return {
      condition: "Ít mây",
      badge: "Nắng ráo",
      theme: isDay ? "sunny" : "night",
      icon: "cloud",
    }
  }
  if (code === 1) {
    return {
      condition: "Quang mây",
      badge: "Nắng ráo",
      theme: isDay ? "sunny" : "night",
      icon: "sun",
    }
  }
  return {
    condition: isDay ? "Trời nắng ráo" : "Trời quang về đêm",
    badge: "Quang đãng",
    theme: isDay ? "sunny" : "night",
    icon: isDay ? "sun" : "cloud",
  }
}

function getWindDirectionText(degrees: number): string {
  const directions = [
    "Bắc",
    "Đông Bắc",
    "Đông",
    "Đông Nam",
    "Nam",
    "Tây Nam",
    "Tây",
    "Tây Bắc",
  ]
  const idx = Math.round(degrees / 45) % 8
  return directions[idx] || "thay đổi"
}

function formatDayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Hôm Nay"
  try {
    const d = new Date(dateStr)
    const day = d.getDay()
    switch (day) {
      case 0:
        return "CN"
      case 1:
        return "Thứ 2"
      case 2:
        return "Thứ 3"
      case 3:
        return "Thứ 4"
      case 4:
        return "Thứ 5"
      case 5:
        return "Thứ 6"
      case 6:
        return "Thứ 7"
      default:
        return dateStr
    }
  } catch {
    return dateStr
  }
}

export const DEFAULT_HCMC_WEATHER: DetailedWeatherData = {
  locationName: "Hồ Chí Minh",
  coords: [106.7009, 10.7769],
  updatedAt: "Vừa xong",
  tempC: 27,
  apparentTempC: 33,
  tempMax: 34,
  tempMin: 26,
  weatherCode: 2,
  condition: "Ít mây",
  narrative:
    "Hôm nay, nhiệt độ cảm nhận khoảng 33°. Điều kiện thuận lợi cho các hoạt động ngoài trời.",
  humidityPercent: 87,
  windSpeedKmh: 4,
  windDirectionText: "Đông Nam",
  sunriseTime: "05:45",
  sunsetTime: "17:28",
  uvIndex: 6,
  pressureHpa: 1011,
  theme: "sunny",
  hourly: [
    { time: "Bây giờ", hourNum: 22, tempC: 27, weatherCode: 61, condition: "Có mưa", precipProb: 22, rainMm: 0.6, isDay: false },
    { time: "23:00", hourNum: 23, tempC: 27, weatherCode: 2, condition: "Ít mây", precipProb: 16, rainMm: 0, isDay: false },
    { time: "00:00", hourNum: 0, tempC: 26, weatherCode: 1, condition: "Quang mây", precipProb: 8, rainMm: 0, isDay: false },
    { time: "01:00", hourNum: 1, tempC: 26, weatherCode: 1, condition: "Quang mây", precipProb: 2, rainMm: 0, isDay: false },
    { time: "02:00", hourNum: 2, tempC: 25, weatherCode: 2, condition: "Ít mây", precipProb: 1, rainMm: 0, isDay: false },
    { time: "03:00", hourNum: 3, tempC: 25, weatherCode: 1, condition: "Quang mây", precipProb: 1, rainMm: 0, isDay: false },
    { time: "04:00", hourNum: 4, tempC: 25, weatherCode: 1, condition: "Quang mây", precipProb: 2, rainMm: 0, isDay: false },
    { time: "05:00", hourNum: 5, tempC: 25, weatherCode: 2, condition: "Ít mây", precipProb: 1, rainMm: 0, isDay: true },
    { time: "06:00", hourNum: 6, tempC: 26, weatherCode: 1, condition: "Trời nắng", precipProb: 0, rainMm: 0, isDay: true },
    { time: "07:00", hourNum: 7, tempC: 28, weatherCode: 1, condition: "Trời nắng", precipProb: 0, rainMm: 0, isDay: true },
  ],
  daily: [
    { dayLabel: "Hôm Nay", date: "2026-11-04", weatherCode: 80, condition: "Mưa rào", conditionBadge: "Có mưa", tempMin: 26, tempMax: 34, precipSum: 14, precipProb: 75 },
    { dayLabel: "Thứ 5", date: "2026-11-05", weatherCode: 61, condition: "Mưa nhỏ", conditionBadge: "Có mưa", tempMin: 25, tempMax: 34, precipSum: 8, precipProb: 65 },
    { dayLabel: "Thứ 6", date: "2026-11-06", weatherCode: 61, condition: "Mưa vừa", conditionBadge: "Có mưa", tempMin: 25, tempMax: 33, precipSum: 10, precipProb: 70 },
    { dayLabel: "Thứ 7", date: "2026-11-07", weatherCode: 61, condition: "Mưa dông", conditionBadge: "Có mưa", tempMin: 25, tempMax: 32, precipSum: 12, precipProb: 80 },
    { dayLabel: "CN", date: "2026-11-08", weatherCode: 61, condition: "Mưa vừa", conditionBadge: "Có mưa", tempMin: 24, tempMax: 32, precipSum: 9, precipProb: 65 },
    { dayLabel: "Thứ 2", date: "2026-11-09", weatherCode: 61, condition: "Mưa nhỏ", conditionBadge: "Có mưa", tempMin: 24, tempMax: 32, precipSum: 6, precipProb: 55 },
    { dayLabel: "Thứ 3", date: "2026-11-10", weatherCode: 61, condition: "Mưa dông", conditionBadge: "Có mưa", tempMin: 24, tempMax: 32, precipSum: 15, precipProb: 85 },
  ],
}

/**
 * Lấy dữ liệu thời tiết thực tế từ Open-Meteo API (100% Free, thời gian thực)
 */
export async function fetchFullRealWeather(
  lat = 10.7769,
  lng = 106.7009,
  locationName = "Hồ Chí Minh",
): Promise<DetailedWeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Open-Meteo returned error")
    const data = await res.json()

    const current = data.current ?? {}
    const tempC = Math.round(Number(current.temperature_2m ?? 27))
    const apparentTempC = Math.round(Number(current.apparent_temperature ?? tempC + 4))
    const weatherCode = Number(current.weather_code ?? 2)
    const isDay = Number(current.is_day ?? 1) === 1
    const rainMm = Number(current.rain ?? current.precipitation ?? 0)
    const humidityPercent = Math.round(Number(current.relative_humidity_2m ?? 80))
    const windSpeedKmh = Math.round(Number(current.wind_speed_10m ?? 8))
    const windDirectionText = getWindDirectionText(Number(current.wind_direction_10m ?? 120))
    const pressureHpa = Math.round(Number(current.surface_pressure ?? 1012))

    const decoded = decodeWmoWeather(weatherCode, isDay, rainMm)

    // Daily Forecast
    const dailyData = data.daily ?? {}
    const dailyTimes: string[] = dailyData.time ?? []
    const dailyCodes: number[] = dailyData.weather_code ?? []
    const dailyMaxs: number[] = dailyData.temperature_2m_max ?? []
    const dailyMins: number[] = dailyData.temperature_2m_min ?? []
    const dailyPrecip: number[] = dailyData.precipitation_sum ?? []
    const dailyPrecipProb: number[] = dailyData.precipitation_probability_max ?? []

    const dailyItems: DailyForecastItem[] = dailyTimes.slice(0, 7).map((timeStr, idx) => {
      const code = dailyCodes[idx] ?? 2
      const dec = decodeWmoWeather(code, true, dailyPrecip[idx] ?? 0)
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
      }
    })

    const tempMax = dailyItems[0]?.tempMax ?? 34
    const tempMin = dailyItems[0]?.tempMin ?? 25

    // Sunrise & Sunset
    const sunriseRaw = String(dailyData.sunrise?.[0] ?? "")
    const sunsetRaw = String(dailyData.sunset?.[0] ?? "")
    const sunriseTime = sunriseRaw.includes("T") ? sunriseRaw.split("T")[1].slice(0, 5) : "05:45"
    const sunsetTime = sunsetRaw.includes("T") ? sunsetRaw.split("T")[1].slice(0, 5) : "17:28"
    const uvIndex = Math.round(Number(dailyData.uv_index_max?.[0] ?? 6))

    // Hourly Forecast (lấy 10 giờ tiếp theo từ giờ hiện tại)
    const hourlyData = data.hourly ?? {}
    const hourlyTimes: string[] = hourlyData.time ?? []
    const hourlyTemps: number[] = hourlyData.temperature_2m ?? []
    const hourlyCodes: number[] = hourlyData.weather_code ?? []
    const hourlyProb: number[] = hourlyData.precipitation_probability ?? []
    const hourlyRain: number[] = hourlyData.precipitation ?? []
    const hourlyIsDay: number[] = hourlyData.is_day ?? []

    const nowIsoHour = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())

    const startIdx = Math.max(
      0,
      hourlyTimes.findIndex((t) => t.includes(`T${nowIsoHour}:`)),
    )

    const hourlyItems: HourlyForecastItem[] = hourlyTimes
      .slice(startIdx, startIdx + 10)
      .map((t, idx) => {
        const globalIdx = startIdx + idx
        const hourStr = t.slice(11, 16) || `${(Number(nowIsoHour) + idx) % 24}:00`
        const code = Number(hourlyCodes[globalIdx] ?? weatherCode)
        const dayFlag = Number(hourlyIsDay[globalIdx] ?? (isDay ? 1 : 0)) === 1
        const rMm = Number(hourlyRain[globalIdx] ?? 0)
        const dec = decodeWmoWeather(code, dayFlag, rMm)

        return {
          time: idx === 0 ? "Bây giờ" : hourStr,
          hourNum: Number(hourStr.slice(0, 2)) || 0,
          tempC: Math.round(Number(hourlyTemps[globalIdx] ?? tempC)),
          weatherCode: code,
          condition: dec.condition,
          precipProb: Math.round(Number(hourlyProb[globalIdx] ?? 10)),
          rainMm: rMm,
          isDay: dayFlag,
        }
      })

    // Narrative description
    let narrative = ""
    if (decoded.theme === "rainy") {
      narrative = `Hôm nay, nhiệt độ cảm nhận khoảng ${apparentTempC}°. Trời có mưa rào, nguy cơ ngập tại các tuyến đường trũng thấp. Chú ý mang theo áo mưa khi ra ngoài.`
    } else if (tempC >= 32) {
      narrative = `Hôm nay, trời nắng gắt với nhiệt độ cảm nhận lên tới ${apparentTempC}°. Hạn chế ở ngoài nắng lâu và uống đủ nước.`
    } else {
      narrative = `Hôm nay, nhiệt độ cảm nhận khoảng ${apparentTempC}°. Điều kiện thời tiết thuận lợi cho các hoạt động di chuyển và ngoài trời.`
    }

    return {
      locationName,
      coords: [lng, lat],
      updatedAt: new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date()),
      tempC,
      apparentTempC,
      tempMax,
      tempMin,
      weatherCode,
      condition: decoded.condition,
      narrative,
      humidityPercent,
      windSpeedKmh,
      windDirectionText,
      sunriseTime,
      sunsetTime,
      uvIndex,
      pressureHpa,
      theme: decoded.theme,
      hourly: hourlyItems,
      daily: dailyItems,
    }
  } catch {
    return {
      ...DEFAULT_HCMC_WEATHER,
      locationName,
      coords: [lng, lat],
    }
  }
}

/**
 * Tìm kiếm thành phố / quận huyện bằng Open-Meteo Geocoding
 */
export async function searchWeatherLocation(query: string): Promise<
  Array<{
    name: string
    country: string
    admin1?: string
    lat: number
    lng: number
    displayLabel: string
  }>
> {
  const clean = query.trim()
  if (!clean || clean.length < 2) return []

  try {
    const googleResults = await searchPlacesWithGoogle(clean)
    if (googleResults && googleResults.length > 0) {
      return googleResults.map((p) => ({
        name: p.address || p.label.split("·")[0].trim(),
        country: "Việt Nam",
        admin1: p.district || "TP. Hồ Chí Minh",
        lat: p.coords[1],
        lng: p.coords[0],
        displayLabel: p.label,
      }))
    }
  } catch {
    // fallback to open-meteo
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=6&language=vi&format=json`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data.results) ? data.results : []

    return results.map((r: any) => {
      const parts = [r.name, r.admin1, r.country].filter(Boolean)
      return {
        name: r.name,
        country: r.country || "Việt Nam",
        admin1: r.admin1,
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        displayLabel: parts.join(", "),
      }
    })
  } catch {
    return []
  }
}
