export type IconName =
  | "alert"
  | "arrow"
  | "bell"
  | "bike"
  | "camera"
  | "car"
  | "check"
  | "chevron"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "close"
  | "help"
  | "layers"
  | "location"
  | "map"
  | "menu"
  | "pin"
  | "plus"
  | "rain"
  | "route"
  | "shield"
  | "straight"
  | "sun"
  | "swap"
  | "turn-left"
  | "turn-right"
  | "user"

export type RouteId = "safe" | "balanced"
export type VehicleMode = "motorcycle" | "car"
export type AppTab = "map" | "tracking" | "saved"
export type ReportType = "flood" | "drain"
export type Severity = "low" | "medium" | "high"

export type ForecastSlot = {
  id: string
  label: string
  rain: string
  risk: string
  zone: number
}

export type RouteItem = {
  id: RouteId
  name: string
  time: string
  distance: string
  badge: string
  detail: string
  coordinates?: number[][]
}

export type NavigationStep = {
  icon: "turn-left" | "turn-right" | "straight"
  instruction: string
  street: string
  distance: string
}

export type WeatherSnapshot = {
  provider: string
  locationName: string
  temperatureC: number
  humidityPercent: number
  windSpeedKmh: number
  currentRainMm: number
  weatherCondition: string
  floodRiskLevel: string
  elevationM?: number
}

export type RouteEndpoint = {
  label: string
  address?: string
  district?: string
  coords: [number, number] // [lng, lat]
  isCurrentLocation?: boolean
}

export type MapFloodPoint = {
  id: string
  lat: number
  lng: number
  label: string
  district: string
  type: "flood" | "pending" | "risk" | "sensor"
  severity: "critical" | "high" | "medium"
  depth: number
  rainfall: number
}

export type CommunityUserProfile = {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  district: string
  joinedAt: string
  lastActive: string
  reports: number
  verifiedReports: number
  rejectedReports: number
  trustScore: number
  status: "active" | "review" | "blocked"
  identityVerified: boolean
  warnings: number
}

export type AreaAlertItem = {
  id: string
  area: string
  level: "Theo dõi" | "Cảnh báo" | "Nghiêm trọng"
  hazardType: string
  title: string
  message: string
  startedAt: string
  expiresAt: string
  status: "active" | "ended"
}

export type SavedRoutePair = {
  id: string
  name: string
  origin: RouteEndpoint
  destination: RouteEndpoint
}
