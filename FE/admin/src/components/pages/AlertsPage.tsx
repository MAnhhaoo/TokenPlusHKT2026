import { useState } from "react"
import { BellRing, CheckCircle2, Megaphone, Radio, Sparkles, Send } from "lucide-react"
import AlertTable from "@/components/alerts/AlertTable"
import EmptyState from "@/components/ui/EmptyState"
import SectionHeader from "@/components/ui/SectionHeader"
import SegmentedControl from "@/components/ui/SegmentedControl"
import { alertLevelCounts, channelCoverage } from "@/lib/analytics"
import type { AreaAlert, WeatherSnapshot, MapPoint } from "@/types"

function AlertsPage({
  alerts,
  weather,
  points = [],
  onEdit,
  onEnd,
}: {
  alerts: AreaAlert[]
  weather?: WeatherSnapshot | null
  points?: MapPoint[]
  onEdit: (alert: AreaAlert) => void
  onEnd: (alert: AreaAlert) => void
}) {
  const [tab, setTab] = useState<"active" | "ended">("active")
  const counts = alertLevelCounts(alerts)
  const channels = channelCoverage(alerts)
  const visible = alerts.filter((alert) => alert.status === tab)

  return (
    <div className="page-stack">
      <SectionHeader
        description="Phát thông tin đến người dân qua web, push và trung tâm điều hành."
        title="Danh sách cảnh báo"
      />

      {/* Thẻ gợi ý Cảnh báo Tự động theo Thời tiết thực & Mô hình IRD */}
      <div className="panel ai-alert-recommendation">
        <div className="ai-alert-header">
          <div className="ai-alert-tag">
            <Sparkles size={16} /> Gợi ý Cảnh báo AI (Mô hình IRD 2002–2026)
          </div>
          <span className="ai-alert-weather-info">
            Thời tiết thực tế: <strong>{weather?.currentRainMm ?? 0} mm mưa</strong> · {weather?.weatherCondition || "Trời quang"}
          </span>
        </div>
        <p className="ai-alert-desc">
          Mô hình phát hiện <strong>3 trục đường đen nhạy cảm nhất</strong> khi có mưa dông hoặc đỉnh triều:
          <strong> Đường Quốc Hương (Thảo Điền)</strong>, <strong>Đường Nguyễn Hữu Cảnh (Bình Thạnh)</strong> và <strong>Đường Huỳnh Tấn Phát (Quận 7)</strong>.
        </p>
        <div className="ai-alert-action-row">
          <button
            type="button"
            className="ai-alert-draft-btn"
            onClick={() =>
              onEdit({
                id: "DRAFT-AI",
                area: "Thảo Điền & Bình Thạnh",
                level: "Cảnh báo",
                hazardType: "Mưa lớn kết hợp triều dâng",
                title: "Cảnh báo ngập úng các trục đường trũng thấp (Quốc Hương, Nguyễn Hữu Cảnh)",
                message: "Dự báo mưa lớn diện rộng và triều dâng. Người dân hạn chế di chuyển qua các tuyến đường Quốc Hương, Huỳnh Tấn Phát và Nguyễn Hữu Cảnh.",
                startedAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                expiresAt: "22:00",
                status: "active",
                channels: ["Web", "Push", "Trung tâm điều hành"],
                createdBy: "SaigonDrain AI",
              })
            }
          >
            <Send size={15} /> Soạn nhanh Cảnh báo khẩn từ gợi ý AI
          </button>
        </div>
      </div>

      <div className="alert-stat-row">
        <div className="alert-stat">
          <span className="alert-stat-icon danger">
            <Radio size={18} />
          </span>
          <div>
            <strong>{counts.active}</strong>
            <span>Đang phát</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon teal">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <strong>{counts.ended}</strong>
            <span>Đã kết thúc</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon sun">
            <Megaphone size={18} />
          </span>
          <div>
            <strong>{channels.length}</strong>
            <span>Kênh phát hành</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon rain">
            <BellRing size={18} />
          </span>
          <div>
            <strong>7</strong>
            <span>Khu vực ảnh hưởng</span>
          </div>
        </div>
      </div>

      <div className="alerts-toolbar">
        <SegmentedControl
          label="Lọc cảnh báo theo trạng thái"
          onChange={setTab}
          options={[
            { value: "active", label: `Đang phát (${counts.active})` },
            { value: "ended", label: `Đã kết thúc (${counts.ended})` },
          ]}
          value={tab}
        />
      </div>

      {visible.length ? (
        <AlertTable alerts={visible} onEdit={onEdit} onEnd={onEnd} />
      ) : (
        <div className="panel">
          <EmptyState
            description={
              tab === "active"
                ? "Hiện không có cảnh báo nào đang phát tới người dân."
                : "Các cảnh báo đã kết thúc sẽ được lưu tại đây để tra cứu."
            }
            icon={<BellRing size={24} />}
            title={
              tab === "active"
                ? "Không có cảnh báo đang phát"
                : "Chưa có cảnh báo đã kết thúc"
            }
          />
        </div>
      )}

      <section className="panel channel-panel">
        <SectionHeader
          description="Số cảnh báo đã gửi trên từng kênh, tính trên toàn bộ dữ liệu hiện có."
          title="Độ phủ kênh phát hành"
        />
        <div className="coverage-grid">
          {channels.map((channel) => (
            <div className="coverage-row" key={channel.label}>
              <span>{channel.label}</span>
              <div className="bar-track">
                <span
                  style={{
                    width: `${
                      (channel.count / Math.max(alerts.length, 1)) * 100
                    }%`,
                  }}
                />
              </div>
              <strong>{channel.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AlertsPage
