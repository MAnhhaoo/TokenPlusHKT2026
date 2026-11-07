import { buildRealtimeAdminMapPoints } from "@/lib/api"
import type { FloodReport, AreaAlert, CommunityUser, MapPoint, WeatherSnapshot, TrendsMap } from "@/types"

export const mockReports: FloodReport[] = []
export const mockPoints: MapPoint[] = buildRealtimeAdminMapPoints([], [], null)
export const mockAlerts: AreaAlert[] = []
export const mockUsers: CommunityUser[] = []
export const mockWeather: WeatherSnapshot | null = null
export const mockTrends: TrendsMap = {
  "24h": {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
    reports: [0, 0, 0, 0, 0, 0],
    rain: [0, 0, 0, 0, 0, 0],
    insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
  },
  "7d": {
    labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    reports: [0, 0, 0, 0, 0, 0, 0],
    rain: [0, 0, 0, 0, 0, 0, 0],
    insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
  },
  "30d": {
    labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
    reports: [0, 0, 0, 0],
    rain: [0, 0, 0, 0],
    insight: "Dữ liệu thực tế từ hệ thống quan trắc và báo cáo cộng đồng.",
  },
}
