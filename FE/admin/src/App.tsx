import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import Topbar from "@/components/layout/Topbar"
import IconButton from "@/components/ui/IconButton"
import Sidebar from "@/components/layout/Sidebar"
import OverviewPage from "@/components/pages/OverviewPage"
import MapPage from "@/components/pages/MapPage"
import ReportsPage from "@/components/pages/ReportsPage"
import AlertsPage from "@/components/pages/AlertsPage"
import UsersPage from "@/components/pages/UsersPage"
import AnalyticsPage from "@/components/pages/AnalyticsPage"
import ReportReviewModal from "@/components/reports/ReportReviewModal"
import AlertModal from "@/components/alerts/AlertModal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import UserDetailModal from "@/components/users/UserDetailModal"
import {
  approveReportApi,
  createAlertApi,
  endAlertApi,
  fetchAdminInitialData,
  fetchCurrentWeatherApi,
  fetchUsersCsvBlob,
  rejectReportApi,
  subscribeAdminRealtime,
  syncWeatherForecastsApi,
  updateAlertApi,
  updateUserStatusApi,
} from "@/lib/api"
import type {
  AlertDraft,
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapLayer,
  MapPoint,
  Page,
  Severity,
  TrendsMap,
  UserStatus,
  WeatherSnapshot,
} from "@/types"

const emptyTrendItem = {
  labels: ["00:00"],
  reports: [0],
  rain: [0],
  insight: "Đang tải dữ liệu xu hướng từ cơ sở dữ liệu…",
}

const emptyTrends: TrendsMap = {
  "24h": emptyTrendItem,
  "7d": emptyTrendItem,
  "30d": emptyTrendItem,
}

export default function App() {
  const [reports, setReports] = useState<FloodReport[]>([])
  const [alerts, setAlerts] = useState<AreaAlert[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [trendsData, setTrendsData] = useState<TrendsMap>(emptyTrends)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLiveBackend, setIsLiveBackend] = useState(false)
  const [selectedMapPoint, setSelectedMapPoint] = useState<string | null>("p1")
  const [layers, setLayers] = useState<MapLayer[]>([
    "flood",
    "risk",
    "rain",
    "history",
  ])
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all")
  const [trendRange, setTrendRange] = useState<keyof TrendsMap>("24h")
  const [reviewing, setReviewing] = useState<FloodReport | null>(null)
  const [rejecting, setRejecting] = useState<FloodReport | null>(null)
  const [alertModal, setAlertModal] = useState<{
    mode: "create" | "edit"
    alert?: AreaAlert
  } | null>(null)
  const [endingAlert, setEndingAlert] = useState<AreaAlert | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage] = useState<Page>("overview")
  const [users, setUsers] = useState<CommunityUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadInitial() {
      const data = await fetchAdminInitialData()
      if (!active || !data.live) return
      if (data.reports) setReports(data.reports)
      if (data.alerts) setAlerts(data.alerts)
      if (data.mapPoints) setMapPoints(data.mapPoints)
      if (data.users) setUsers(data.users)
      if (data.trends) setTrendsData(data.trends)
      if (data.weather) setWeather(data.weather)
      setIsLiveBackend(true)
    }
    loadInitial()

    const unsubscribe = subscribeAdminRealtime({
      onReportCreated: ({ report, mapPoint }) => {
        if (!active) return
        setReports((current) =>
          current.some((r) => r.id === report.id)
            ? current
            : [report, ...current],
        )
        if (mapPoint) {
          setMapPoints((current) =>
            current.some((pt) => pt.id === mapPoint.id)
              ? current
              : [...current, mapPoint],
          )
        }
        setToast(
          `Realtime: Báo cáo mới ${report.id} tại ${report.location} vừa được gửi.`,
        )
      },
      onReportApproved: ({ report, updatedMapPoint }) => {
        if (!active) return
        setReports((current) =>
          current.map((item) => (item.id === report.id ? report : item)),
        )
        if (updatedMapPoint) {
          setMapPoints((current) =>
            current.map((pt) =>
              pt.linkedReportId === report.id ? updatedMapPoint : pt,
            ),
          )
        }
      },
      onReportRejected: ({ report }) => {
        if (!active) return
        setReports((current) =>
          current.map((item) => (item.id === report.id ? report : item)),
        )
      },
      onAlertCreated: (alert) => {
        if (!active) return
        setAlerts((current) =>
          current.some((a) => a.id === alert.id)
            ? current
            : [alert, ...current],
        )
      },
      onAlertUpdated: (alert) => {
        if (!active) return
        setAlerts((current) =>
          current.map((a) => (a.id === alert.id ? alert : a)),
        )
      },
      onAlertEnded: (alert) => {
        if (!active) return
        setAlerts((current) =>
          current.map((a) => (a.id === alert.id ? alert : a)),
        )
      },
      onWeatherUpdated: ({ snapshot }) => {
        if (!active) return
        if (snapshot) setWeather(snapshot)
      },
      onUserUpdated: ({ action, user }) => {
        if (!active || !user) return
        setUsers((current) => {
          const exists = current.some((u) => u.id === user.id)
          if (exists) {
            return current.map((u) => (u.id === user.id ? user : u))
          }
          return [user, ...current]
        })
        if (action === "registered") {
          setToast(
            `Realtime: Người dùng mới ${user.name} (${user.district}) vừa đăng ký tài khoản!`,
          )
        }
      },
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const activeAlertCount = alerts.filter(
    (alert) => alert.status === "active",
  ).length

  const navigate = (next: Page) => {
    setPage(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const selectMapPoint = (point: MapPoint) => {
    if (selectedMapPoint === point.id) {
      setSelectedMapPoint(null)
      return
    }
    setSelectedMapPoint(point.id)
    if (point.linkedReportId) {
      const report = reports.find(
        (item) => item.id === point.linkedReportId && item.status === "pending",
      )
      if (report) setReviewing(report)
    }
  }

  const handleSyncWeather = async () => {
    await syncWeatherForecastsApi()
    const freshWeather = await fetchCurrentWeatherApi()
    if (freshWeather) {
      setWeather(freshWeather)
      setToast(
        `Đã đồng bộ thời tiết từ Open-Meteo: ${freshWeather.weatherCondition} · ${Math.round(freshWeather.temperatureC)}°C.`,
      )
    }
  }

  const approveReport = async () => {
    if (!reviewing) return
    const targetId = reviewing.id
    const apiResult = await approveReportApi(targetId)
    setReports((current) =>
      current.map((report) =>
        report.id === targetId
          ? apiResult?.report ?? { ...report, status: "verified" }
          : report,
      ),
    )
    setMapPoints((current) =>
      current.map((point) =>
        point.linkedReportId === targetId
          ? apiResult?.updatedMapPoint ?? { ...point, type: "flood" }
          : point,
      ),
    )
    setReviewing(null)
    setToast(`Đã xác nhận báo cáo ${targetId} và cập nhật bản đồ.`)
  }

  const rejectReport = async (reason?: string) => {
    if (!rejecting) return
    const targetId = rejecting.id
    const apiResult = await rejectReportApi(targetId, reason)
    setReports((current) =>
      current.map((report) =>
        report.id === targetId
          ? apiResult?.report ?? { ...report, status: "rejected" }
          : report,
      ),
    )
    setRejecting(null)
    setReviewing(null)
    setToast(
      `Đã từ chối báo cáo ${targetId}${reason ? `: ${reason}` : ""}.`,
    )
  }

  const saveAlert = async (draft: AlertDraft) => {
    if (alertModal?.mode === "edit" && alertModal.alert) {
      const targetId = alertModal.alert.id
      const updated = await updateAlertApi(targetId, draft)
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === targetId ? (updated ?? { ...alert, ...draft }) : alert,
        ),
      )
      setToast(`Đã cập nhật cảnh báo ${targetId}.`)
    } else {
      const created = await createAlertApi(draft)
      const nextNumber = 190 + alerts.length
      setAlerts((current) => [
        created ?? {
          id: `AL-0${nextNumber}`,
          ...draft,
          startedAt: "18:49",
          status: "active",
          createdBy: "Nguyễn Minh",
        },
        ...current,
      ])
      setToast("Cảnh báo mới đã được phát tới các kênh đã chọn.")
    }
    setAlertModal(null)
  }

  const endAlert = async () => {
    if (!endingAlert) return
    const targetId = endingAlert.id
    const ended = await endAlertApi(targetId)
    setAlerts((current) =>
      current.map((alert) =>
        alert.id === targetId
          ? (ended ?? { ...alert, status: "ended" })
          : alert,
      ),
    )
    setToast(`Đã kết thúc cảnh báo ${targetId}.`)
    setEndingAlert(null)
  }

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null

  const exportUsers = async () => {
    const backendBlob = await fetchUsersCsvBlob()
    if (backendBlob) {
      const url = URL.createObjectURL(backendBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = "saigondrain-nguoi-dung.csv"
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast("Đã xuất danh sách người dùng từ Backend ra tệp CSV.")
      return
    }

    const statusLabel: Record<UserStatus, string> = {
      active: "Hoạt động",
      review: "Cần xem xét",
      blocked: "Đã khóa",
    }
    const header = [
      "Mã người dùng",
      "Họ tên",
      "Khu vực",
      "Báo cáo",
      "Đã xác minh",
      "Từ chối",
      "Điểm tin cậy",
      "Xác thực",
      "Trạng thái",
      "Hoạt động cuối",
    ]
    const rows = users.map((user) => [
      user.id,
      user.name,
      user.district,
      String(user.reports),
      String(user.verifiedReports),
      String(user.rejectedReports),
      String(user.trustScore),
      user.identityVerified ? "Đã xác thực" : "Chưa xác thực",
      statusLabel[user.status],
      user.lastActive,
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n")
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "saigondrain-nguoi-dung.csv"
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast("Đã xuất danh sách người dùng ra tệp CSV.")
  }

  const updateUserStatus = async (status: UserStatus) => {
    if (!selectedUser) return
    const targetId = selectedUser.id
    const updatedUser = await updateUserStatusApi(targetId, status)
    setUsers((current) =>
      current.map((user) =>
        user.id === targetId ? (updatedUser ?? { ...user, status }) : user,
      ),
    )
    setToast(
      status === "blocked"
        ? `Đã khóa tài khoản ${targetId}.`
        : status === "review"
          ? `Đã chuyển ${targetId} vào danh sách xem xét.`
          : `Đã mở khóa tài khoản ${targetId}.`,
    )
    setSelectedUserId(null)
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeAlertCount={activeAlertCount}
        onNavigate={navigate}
        open={sidebarOpen}
        page={page}
        pendingCount={pendingCount}
        setOpen={setSidebarOpen}
      />
      <main className="main">
        <Topbar
          onCreateAlert={() => setAlertModal({ mode: "create" })}
          onExportUsers={exportUsers}
          onOpenMenu={() => setSidebarOpen(true)}
          onSyncWeather={handleSyncWeather}
          page={page}
          weather={weather}
        />

        <div className="content">
          {page === "overview" && (
            <OverviewPage
              alerts={alerts}
              layers={layers}
              onEditAlert={(alert) => setAlertModal({ mode: "edit", alert })}
              onEndAlert={setEndingAlert}
              onNavigate={navigate}
              onReview={setReviewing}
              onSelectPoint={selectMapPoint}
              points={mapPoints}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              setTrendRange={setTrendRange}
              severityFilter={severityFilter}
              trendRange={trendRange}
              trendsData={trendsData}
              weather={weather}
            />
          )}
          {page === "map" && (
            <MapPage
              layers={layers}
              onSelectPoint={selectMapPoint}
              points={mapPoints}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              severityFilter={severityFilter}
            />
          )}
          {page === "reports" && (
            <ReportsPage onReview={setReviewing} reports={reports} />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              weather={weather}
              points={mapPoints}
              onEdit={(alert) => setAlertModal({ mode: "edit", alert })}
              onEnd={setEndingAlert}
            />
          )}
          {page === "users" && (
            <UsersPage
              onSelect={(user) => setSelectedUserId(user.id)}
              users={users}
            />
          )}
          {page === "analytics" && (
            <AnalyticsPage
              alerts={alerts}
              points={mapPoints}
              reports={reports}
              setTrendRange={setTrendRange}
              trendRange={trendRange}
              trendsData={trendsData}
              users={users}
            />
          )}

          <footer className="page-footer">
            <span>SaigonDrain AI · Trung tâm điều hành đô thị thông minh</span>
            <span>
              {isLiveBackend
                ? "Đã kết nối Backend API & Open-Meteo · Hệ thống Vận hành TP.HCM"
                : "SaigonDrain AI v2.0 · Hệ thống Vận hành & Cảnh báo Ngập lụt Đô thị TP.HCM"}
            </span>
          </footer>
        </div>
      </main>

      {reviewing && (
        <ReportReviewModal
          report={reviewing}
          reports={reports}
          onClose={() => setReviewing(null)}
          onApprove={approveReport}
          onReject={() => {
            setRejecting(reviewing)
            setReviewing(null)
          }}
        />
      )}
      {rejecting && (
        <ConfirmDialog
          title="Từ chối báo cáo?"
          description="Báo cáo sẽ được loại khỏi hàng chờ và không dùng để cập nhật cảnh báo."
          confirmLabel="Xác nhận từ chối"
          onClose={() => setRejecting(null)}
          onConfirm={rejectReport}
          withReason
        />
      )}
      {alertModal && (
        <AlertModal
          initial={alertModal.alert}
          onClose={() => setAlertModal(null)}
          onSave={saveAlert}
        />
      )}
      {endingAlert && (
        <ConfirmDialog
          title="Kết thúc cảnh báo?"
          description={`${endingAlert.area} sẽ không còn hiển thị là khu vực đang cảnh báo.`}
          confirmLabel="Kết thúc cảnh báo"
          onClose={() => setEndingAlert(null)}
          onConfirm={endAlert}
        />
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUserId(null)}
          onStatusChange={updateUserStatus}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <IconButton label="Đóng thông báo" onClick={() => setToast(null)}>
            <X size={14} />
          </IconButton>
        </div>
      )}
    </div>
  )
}
