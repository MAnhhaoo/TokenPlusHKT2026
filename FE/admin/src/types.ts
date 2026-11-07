export type Severity = "critical" | "high" | "medium"
export type ReportStatus = "pending" | "verified" | "rejected"
export type AlertLevel = "Theo dõi" | "Cảnh báo" | "Nghiêm trọng"
export type MapLayer = "flood" | "risk" | "rain" | "history"
export type Page =
  | "overview"
  | "map"
  | "reports"
  | "alerts"
  | "users"
  | "analytics"
export type UserStatus = "active" | "review" | "blocked"

export type FloodReport = {
  id: string
  location: string
  district: string
  reportedAt: string
  minutesAgo: number
  description: string
  reportedDepth: number
  aiDepth: number
  aiConfidence: number
  severity: Severity
  status: ReportStatus
  priority: string
  coordinates: string
  historyCount: number
  visual: "street" | "drain" | "night" | "traffic"
  photoUrl?: string
  reporterId?: string
}

export type AreaAlert = {
  id: string
  area: string
  level: AlertLevel
  hazardType: string
  title: string
  message: string
  startedAt: string
  expiresAt: string
  status: "active" | "ended"
  channels: string[]
  createdBy: string
}

export type MapPoint = {
  id: string
  x: number
  y: number
  lat?: number
  lng?: number
  elevationM?: number
  type: "flood" | "pending" | "risk" | "sensor" | "history"
  severity: Severity
  label: string
  district: string
  rainfall: number
  depth: number
  historyCount: number
  linkedReportId?: string
  causes?: string[]
  maxDepth?: number
  years?: number[]
}

export type AlertDraft = {
  area: string
  level: AlertLevel
  hazardType: string
  title: string
  message: string
  expiresAt: string
  channels: string[]
}

export type CommunityUser = {
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
  status: UserStatus
  identityVerified: boolean
  warnings: number
}

export type WeatherSnapshot = {
  provider: string
  locationName: string
  temperatureC: number
  humidityPercent: number
  windSpeedKmh: number
  currentRainMm: number
  weatherCondition: string
  floodRiskLevel: "Thấp" | "Trung bình" | "Cao" | "Rất cao"
  elevationM?: number
}

export type TrendItem = {
  labels: string[]
  reports: number[]
  rain: number[]
  insight: string
}

export type TrendsMap = {
  "24h": TrendItem
  "7d": TrendItem
  "30d": TrendItem
}
