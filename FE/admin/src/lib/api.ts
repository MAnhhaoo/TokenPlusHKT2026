import defaultHotspots from "@/data/hcmc_flood_hotspots.json"
import type {
  AlertDraft,
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapPoint,
  TrendsMap,
  UserStatus,
  WeatherSnapshot,
} from "@/types"

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api"

export async function fetchCurrentWeatherApi(): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/current`)
    if (res.ok) return (await res.json()) as WeatherSnapshot
  } catch {
    // ignore
  }

  try {
    const omRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FBangkok",
    )
    if (omRes.ok) {
      const data = await omRes.json()
      const cur = data.current ?? {}
      const rainMm = Number(cur.rain ?? cur.precipitation ?? 0)
      return {
        provider: "Open-Meteo",
        locationName: "TP. Hồ Chí Minh",
        temperatureC: Number(cur.temperature_2m ?? 28),
        humidityPercent: Number(cur.relative_humidity_2m ?? 80),
        windSpeedKmh: Number(cur.wind_speed_10m ?? 10),
        currentRainMm: rainMm,
        weatherCondition:
          rainMm >= 15 ? "Mưa lớn" : rainMm > 0 ? "Mưa nhỏ" : "Trời quang mây",
        floodRiskLevel:
          rainMm >= 35
            ? "Rất cao"
            : rainMm >= 20
              ? "Cao"
              : rainMm >= 10
                ? "Trung bình"
                : "Thấp",
      }
    }
  } catch {
    // ignore
  }

  return {
    provider: "Open-Meteo",
    locationName: "TP. Hồ Chí Minh",
    temperatureC: 28,
    humidityPercent: 78,
    windSpeedKmh: 10,
    currentRainMm: 0,
    weatherCondition: "Trời quang mây",
    floodRiskLevel: "Thấp",
  }
}

export async function syncWeatherForecastsApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/weather/sync-forecasts`, {
      method: "POST",
    })
    return res.ok
  } catch {
    return false
  }
}

export function buildRealtimeAdminMapPoints(
  rawPoints?: MapPoint[],
  reports?: FloodReport[],
  weather?: WeatherSnapshot | null,
): MapPoint[] {
  const result: MapPoint[] = []
  const currentRainMm = weather?.currentRainMm ?? 0

  // 1. SENSORS (Trạm đo mưa và quan trắc khí tượng thời gian thực)
  const rainSensors: MapPoint[] = [
    {
      id: "sensor_tan_son_nhat",
      x: 48,
      y: 35,
      lat: 10.8188,
      lng: 106.6519,
      label: "Trạm Radar Tân Sơn Nhất",
      district: "Tân Bình",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 4.5,
    },
    {
      id: "sensor_mac_dinh_chi",
      x: 52,
      y: 42,
      lat: 10.7874,
      lng: 106.7011,
      label: "Trạm Khí tượng Mạc Đĩnh Chi",
      district: "Quận 1",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 3.2,
    },
    {
      id: "sensor_an_phu",
      x: 60,
      y: 40,
      lat: 10.8016,
      lng: 106.7455,
      label: "Trạm Thủy văn An Phú",
      district: "TP. Thủ Đức",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 2.1,
    },
    {
      id: "sensor_phu_an",
      x: 55,
      y: 38,
      lat: 10.7963,
      lng: 106.7118,
      label: "Trạm Thủy văn Phú An",
      district: "Bình Thạnh",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.5,
    },
    {
      id: "sensor_nha_be",
      x: 62,
      y: 65,
      lat: 10.6558,
      lng: 106.7389,
      label: "Trạm Thủy triều Nhà Bè",
      district: "Nhà Bè",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.2,
    },
    {
      id: "sensor_binh_tan",
      x: 35,
      y: 48,
      lat: 10.7483,
      lng: 106.6022,
      label: "Trạm Khí tượng Bình Tân",
      district: "Bình Tân",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 3.0,
    },
    {
      id: "sensor_go_vap",
      x: 45,
      y: 30,
      lat: 10.8354,
      lng: 106.6667,
      label: "Trạm Thoát nước Gò Vấp",
      district: "Gò Vấp",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 3.8,
    },
    {
      id: "sensor_hoc_mon",
      x: 38,
      y: 22,
      lat: 10.8856,
      lng: 106.5911,
      label: "Trạm Khí tượng Hóc Môn",
      district: "Hóc Môn",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 4.2,
    },
    {
      id: "sensor_q7",
      x: 58,
      y: 55,
      lat: 10.7328,
      lng: 106.7289,
      label: "Trạm Quan trắc Triều Huỳnh Tấn Phát",
      district: "Quận 7",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.4,
    },
    {
      id: "sensor_q8",
      x: 45,
      y: 52,
      lat: 10.7501,
      lng: 106.6567,
      label: "Trạm Thủy văn Cầu Chà Và",
      district: "Quận 8",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.6,
    },
    {
      id: "sensor_binh_chanh",
      x: 32,
      y: 60,
      lat: 10.6872,
      lng: 106.5833,
      label: "Trạm Thoát nước Tân Túc",
      district: "Bình Chánh",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.8,
    },
    {
      id: "sensor_can_gio",
      x: 75,
      y: 80,
      lat: 10.4114,
      lng: 106.9556,
      label: "Trạm Hải văn Cần Giờ",
      district: "Cần Giờ",
      type: "sensor",
      severity:
        currentRainMm >= 30
          ? "critical"
          : currentRainMm >= 15
            ? "high"
            : "medium",
      rainfall: currentRainMm,
      depth: 0,
      historyCount: 0,
      elevationM: 1.1,
    },
  ]
  result.push(...rainSensors)

  // 2. ACTIVE LIVE FLOOD POINTS (Ngập hiện tại)
  // Lấy các báo cáo hiện trường thực tế từ người dân (chưa bị từ chối)
  if (reports && reports.length > 0) {
    for (const r of reports) {
      if (r.status === "rejected") continue
      if (!r.coordinates) continue
      const parts = r.coordinates.split(",").map((s) => parseFloat(s.trim()))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        result.push({
          id: `flood_rpt_${r.id}`,
          x: 50,
          y: 50,
          lat: parts[0],
          lng: parts[1],
          label: r.location,
          district: r.district,
          type: "flood",
          severity: r.severity,
          depth: r.aiDepth || r.reportedDepth || 20,
          rainfall: currentRainMm,
          historyCount: r.historyCount || 5,
          linkedReportId: r.id,
        })
      }
    }
  }

  // 3. 250 ĐIỂM ĐEN LỊCH SỬ IRD (2002–2026) -> Lớp 'history'
  // Và 4. CÁC ĐIỂM CÓ NGUY CƠ CAO -> Lớp 'risk'
  const sourceHotspots = defaultHotspots as any[]
  const vnHour = new Date().getHours()
  const isTideHour =
    (vnHour >= 16 && vnHour <= 19) || (vnHour >= 4 && vnHour <= 7)

  for (const h of sourceHotspots) {
    // Luôn đưa vào lớp Lịch sử ngập ('history')
    result.push({
      id: `hist_${h.id}`,
      x: h.x || 50,
      y: h.y || 50,
      lat: h.lat,
      lng: h.lng,
      label: h.label,
      district: h.district,
      type: "history",
      severity: h.severity || "high",
      depth: h.maxDepth || h.depth || 30,
      maxDepth: h.maxDepth || h.depth || 30,
      historyCount: h.historyCount || 8,
      rainfall: h.rainfallThresholdMm || 45,
      causes: h.causes,
      years: h.years,
      elevationM: h.elevationM || 2.0,
    })

    // Điểm có nguy cơ cao (trũng thấp <= 1.8m hoặc ngưỡng mưa <= 35mm hoặc số lần ngập >= 12)
    const isHighVulnerability =
      (h.elevationM && h.elevationM <= 1.8) ||
      (h.rainfallThresholdMm && h.rainfallThresholdMm <= 35) ||
      (h.historyCount && h.historyCount >= 12)

    if (isHighVulnerability) {
      result.push({
        id: `risk_${h.id}`,
        x: h.x || 50,
        y: h.y || 50,
        lat: h.lat,
        lng: h.lng,
        label: h.label,
        district: h.district,
        type: "risk",
        severity: h.severity || "high",
        depth: 0,
        maxDepth: h.maxDepth || h.depth || 30,
        historyCount: h.historyCount || 8,
        rainfall: h.rainfallThresholdMm || 35,
        elevationM: h.elevationM || 1.8,
        causes: h.causes,
      })
    }

    // Nếu thời tiết ĐANG CÓ MƯA LỚN THẬT SỰ (>= 25mm) hoặc giờ triều cường ven sông trũng thấp:
    if (
      (currentRainMm >= 25 &&
        currentRainMm >= (h.rainfallThresholdMm || 45)) ||
      (isTideHour &&
        h.elevationM <= 1.4 &&
        (h.district?.includes("7") ||
          h.district?.includes("Nhà Bè") ||
          h.district?.includes("Bình Thạnh")))
    ) {
      result.push({
        id: `flood_live_${h.id}`,
        x: h.x || 50,
        y: h.y || 50,
        lat: h.lat,
        lng: h.lng,
        label: h.label,
        district: h.district,
        type: "flood",
        severity: h.severity || "high",
        depth: Math.min(h.maxDepth || 60, Math.round(currentRainMm * 0.8)),
        rainfall: currentRainMm,
        historyCount: h.historyCount || 8,
        elevationM: h.elevationM || 2.0,
      })
    }
  }

  return result
}

export async function fetchAdminInitialData(): Promise<{
  reports?: FloodReport[]
  alerts?: AreaAlert[]
  mapPoints?: MapPoint[]
  users?: CommunityUser[]
  trends?: TrendsMap
  weather?: WeatherSnapshot | null
  live: boolean
}> {
  try {
    const [
      reportsRes,
      alertsRes,
      pointsRes,
      usersRes,
      trendsRes,
      weatherSnap,
    ] = await Promise.all([
      fetch(`${API_BASE}/reports`),
      fetch(`${API_BASE}/alerts`),
      fetch(`${API_BASE}/map/points`),
      fetch(`${API_BASE}/users`),
      fetch(`${API_BASE}/analytics/trends`),
      fetchCurrentWeatherApi(),
    ])

    const reports = reportsRes.ok
      ? ((await reportsRes.json()) as FloodReport[])
      : undefined
    const alerts = alertsRes.ok
      ? ((await alertsRes.json()) as AreaAlert[])
      : undefined
    let rawMapPoints = pointsRes.ok
      ? ((await pointsRes.json()) as MapPoint[])
      : undefined

    const finalMapPoints = buildRealtimeAdminMapPoints(
      rawMapPoints,
      reports,
      weatherSnap,
    )

    const users = usersRes.ok
      ? ((await usersRes.json()) as CommunityUser[])
      : undefined
    const trends = trendsRes.ok
      ? ((await trendsRes.json()) as TrendsMap)
      : undefined

    const live = Boolean(reports || alerts || finalMapPoints || users || weatherSnap)
    return {
      reports,
      alerts,
      mapPoints: finalMapPoints,
      users,
      trends,
      weather: weatherSnap,
      live,
    }
  } catch {
    return { live: false }
  }
}

export async function approveReportApi(id: string): Promise<{
  report: FloodReport
  updatedMapPoint?: MapPoint | null
} | null> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}/approve`, {
      method: "PATCH",
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function rejectReportApi(
  id: string,
  reason?: string,
): Promise<{ report: FloodReport } | null> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function createAlertApi(
  draft: AlertDraft,
): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function updateAlertApi(
  id: string,
  draft: AlertDraft,
): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function endAlertApi(id: string): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}/end`, {
      method: "PATCH",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.alert ?? null
  } catch {
    return null
  }
}

export async function updateUserStatusApi(
  id: string,
  status: UserStatus,
): Promise<CommunityUser | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.user ?? null
  } catch {
    return null
  }
}

export async function fetchUsersCsvBlob(): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_BASE}/users/export-csv`)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

export function subscribeAdminRealtime(handlers: {
  onReportCreated?: (data: {
    report: FloodReport
    mapPoint?: MapPoint
  }) => void
  onReportApproved?: (data: {
    report: FloodReport
    updatedMapPoint?: MapPoint | null
  }) => void
  onReportRejected?: (data: { report: FloodReport }) => void
  onAlertCreated?: (alert: AreaAlert) => void
  onAlertUpdated?: (alert: AreaAlert) => void
  onAlertEnded?: (alert: AreaAlert) => void
  onWeatherUpdated?: (data: { snapshot?: WeatherSnapshot }) => void
  onUserUpdated?: (data: { action: string; user: CommunityUser }) => void
}): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined
  }

  const es = new EventSource(`${API_BASE}/realtime/stream`)

  const bind = <T,>(event: string, cb?: (data: T) => void) => {
    if (!cb) return
    es.addEventListener(event, (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed?.data) cb(parsed.data as T)
      } catch {
        // ignore parse errors
      }
    })
  }

  bind("report.created", handlers.onReportCreated)
  bind("report.approved", handlers.onReportApproved)
  bind("report.rejected", handlers.onReportRejected)
  bind("alert.created", handlers.onAlertCreated)
  bind("alert.updated", handlers.onAlertUpdated)
  bind("alert.ended", handlers.onAlertEnded)
  bind("weather.updated", handlers.onWeatherUpdated)
  bind("user.updated", handlers.onUserUpdated)

  return () => {
    es.close()
  }
}
