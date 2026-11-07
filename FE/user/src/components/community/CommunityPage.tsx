import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { getUserLocation } from "@/lib/location";
import CommunityMap from "./CommunityMap";
import type { CommunityReport, ReportType, Severity } from "@/types";

interface CommunityPageProps {
  reports: CommunityReport[];
  onOpenReportModal: () => void;
  onNavigateToAvoid?: (report: CommunityReport) => void;
}

const HCMC_DISTRICTS = [
  "Tất cả quận/huyện",
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
  "Tân Bình",
  "Tân Phú",
  "Bình Tân",
  "TP. Thủ Đức",
  "Hóc Môn",
  "Bình Chánh",
  "Nhà Bè",
  "Củ Chi",
  "Cần Giờ",
];

export default function CommunityPage({
  reports,
  onOpenReportModal,
  onNavigateToAvoid,
}: CommunityPageProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("Tất cả quận/huyện");
  const [filterType, setFilterType] = useState<"all" | ReportType>("all");
  const [mobileViewMode, setMobileViewMode] = useState<"map" | "list">("map");
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const handleUseCurrentGps = async () => {
    setIsLocatingUser(true);
    try {
      const loc = await getUserLocation();
      if (loc && activeReports.length > 0) {
        // Find nearest report
        let nearest: CommunityReport | null = null;
        let minDistance = Infinity;
        for (const r of activeReports) {
          if (r.lat && r.lng) {
            const d = Math.hypot(r.lat - loc.latitude, r.lng - loc.longitude);
            if (d < minDistance) {
              minDistance = d;
              nearest = r;
            }
          }
        }
        if (nearest) {
          setSelectedReportId(nearest.id);
          if (nearest.district) {
            setSelectedDistrict(nearest.district);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLocatingUser(false);
    }
  };

  // Only show non-rejected reports to the community (admin has locked rejected reports)
  const activeReports = useMemo(() => {
    return reports.filter((r) => r.status !== "rejected");
  }, [reports]);

  // Statistics
  const stats = useMemo(() => {
    const total = activeReports.length;
    const floods = activeReports.filter((r) => r.reportType === "flood").length;
    const drains = activeReports.filter((r) => r.reportType === "drain").length;
    const aiVerified = activeReports.filter((r) => r.aiConfidence > 70).length;
    return { total, floods, drains, aiVerified };
  }, [activeReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return activeReports.filter((r) => {
      if (filterType !== "all" && r.reportType !== filterType) return false;
      if (
        selectedDistrict !== "Tất cả quận/huyện" &&
        r.district &&
        !r.district.toLowerCase().includes(selectedDistrict.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${r.location} ${r.district} ${r.description} ${r.id}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [activeReports, filterType, selectedDistrict, searchQuery]);

  const handleCardClick = (report: CommunityReport) => {
    setSelectedReportId(report.id);
    if (mobileViewMode === "list") {
      setMobileViewMode("map");
    }
  };

  return (
    <div className="community-page-container">
      {/* Mobile Sub-Header Toggle (Map vs List) */}
      <div className="community-mobile-subnav">
        <button
          type="button"
          className={`comm-subnav-btn ${mobileViewMode === "map" ? "is-active" : ""}`}
          onClick={() => setMobileViewMode("map")}
        >
          <Icon name="map" size={16} />
          <span>Bản đồ sự cố ({filteredReports.length})</span>
        </button>
        <button
          type="button"
          className={`comm-subnav-btn ${mobileViewMode === "list" ? "is-active" : ""}`}
          onClick={() => setMobileViewMode("list")}
        >
          <Icon name="alert" size={16} />
          <span>Danh sách báo cáo</span>
        </button>
      </div>

      <div className="community-layout-body">
        {/* Sidebar / Feed Column */}
        <aside
          className={`community-feed-sidebar ${
            mobileViewMode === "list" ? "is-mobile-visible" : "is-mobile-hidden"
          }`}
        >
          {/* Header & Quick Action */}
          <div className="community-feed-header">
            <div>
              <h2 className="community-feed-title">
                <span className="comm-title-dot"></span>
                Bản đồ & Tin tức Cộng đồng
              </h2>
              <p className="community-feed-subtitle">
                Điểm ngập & cống tắc do người dân TP.HCM chia sẻ, AI thẩm định tức thì
              </p>
            </div>
            <button
              type="button"
              className="community-report-action-btn"
              onClick={onOpenReportModal}
              title="Gửi báo cáo ngập mới"
            >
              <Icon name="plus" size={16} />
              <span>Báo ngập ngay</span>
            </button>
          </div>

          {/* Quick Stats Banner */}
          <div className="community-stats-grid">
            <div className="comm-stat-card">
              <span className="stat-num text-teal">{stats.total}</span>
              <span className="stat-desc">Điểm sự cố</span>
            </div>
            <div className="comm-stat-card">
              <span className="stat-num text-orange">{stats.floods}</span>
              <span className="stat-desc">Đường ngập</span>
            </div>
            <div className="comm-stat-card">
              <span className="stat-num text-blue">{stats.drains}</span>
              <span className="stat-desc">Cống nghẹt</span>
            </div>
            <div className="comm-stat-card">
              <span className="stat-num text-green">{stats.aiVerified}</span>
              <span className="stat-desc">AI thẩm định</span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="community-filter-section">
            <div className="community-search-input-wrap">
              <Icon name="location" size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Tìm tên đường, giao lộ, quận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="community-search-input"
              />
              <button
                type="button"
                className="clear-search-btn"
                style={{ display: searchQuery ? "inline-flex" : "none" }}
                onClick={() => setSearchQuery("")}
                title="Xóa tìm kiếm"
              >
                <Icon name="close" size={14} />
              </button>
              <button
                type="button"
                className={`comm-gps-search-btn ${isLocatingUser ? "animate-spin" : ""}`}
                onClick={handleUseCurrentGps}
                title="Định vị và tìm sự cố gần vị trí của tôi"
              >
                <Icon name="location" size={15} />
              </button>
            </div>

            <div className="community-filters-row">
              {/* Type Filter Pills */}
              <div className="comm-type-pills">
                <button
                  type="button"
                  className={`comm-pill ${filterType === "all" ? "is-active" : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`comm-pill ${filterType === "flood" ? "is-active" : ""}`}
                  onClick={() => setFilterType("flood")}
                >
                  🌧️ Ngập đường
                </button>
                <button
                  type="button"
                  className={`comm-pill ${filterType === "drain" ? "is-active" : ""}`}
                  onClick={() => setFilterType("drain")}
                >
                  ⚠️ Cống tắc
                </button>
              </div>

              {/* District Select */}
              <select
                className="comm-district-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                {HCMC_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report List */}
          <div className="community-reports-list" role="list">
            {filteredReports.length === 0 ? (
              <div className="community-empty-state">
                <div className="empty-icon-wrap">
                  <Icon name="rain" size={32} />
                </div>
                <h3>Không tìm thấy báo cáo nào</h3>
                <p>Khu vực này hiện chưa có sự cố ngập hoặc cống tắc được ghi nhận.</p>
                <button
                  type="button"
                  className="btn-create-first-report"
                  onClick={onOpenReportModal}
                >
                  <Icon name="plus" size={16} /> Gửi báo cáo đầu tiên
                </button>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelected = report.id === selectedReportId;
                const depth = report.aiDepth || report.reportedDepth || 20;

                return (
                  <article
                    key={report.id}
                    className={`community-report-card ${isSelected ? "is-card-selected" : ""}`}
                    onClick={() => handleCardClick(report)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleCardClick(report);
                      }
                    }}
                  >
                    <div className="report-card-top">
                      <div className="report-card-badges">
                        <span className={`comm-sev-badge ${report.severity}`}>
                          {report.severity === "critical"
                            ? "Nguy hiểm (>40cm)"
                            : report.severity === "high"
                              ? "Chú ý (~25cm)"
                              : "Nhẹ (~12cm)"}
                        </span>
                        <span className="comm-type-badge">
                          {report.reportType === "drain" ? "Cống tắc" : "Đường ngập"}
                        </span>
                      </div>
                      <span className="report-card-time">{report.minutesAgo} phút trước</span>
                    </div>

                    <div className="report-card-content">
                      <div className="report-card-text">
                        <h3 className="report-card-location">{report.location}</h3>
                        <div className="report-card-district">{report.district}</div>
                        {report.description && (
                          <p className="report-card-desc">{report.description}</p>
                        )}
                      </div>

                      {report.photoUrl && (
                        <div className="report-card-thumb">
                          <img
                            src={report.photoUrl}
                            alt={report.location}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Drainage Prediction Bar */}
                    <div className="report-card-hydrology">
                      <div className="hydro-item">
                        <span className="hydro-label">Mực nước:</span>
                        <strong className={`hydro-val ${report.severity}`}>{depth} cm</strong>
                      </div>
                      {report.estimatedClearAt === "Đã rút hết nước" ||
                      report.estimatedDurationMin === 0 ? (
                        <div className="hydro-item">
                          <span className="hydro-label">Hiện trạng:</span>
                          <strong className="hydro-val" style={{ color: "#10b981" }}>
                            ✓ Đã rút hết nước
                          </strong>
                        </div>
                      ) : report.estimatedDurationMin ? (
                        <div className="hydro-item">
                          <span className="hydro-label">Dự kiến rút:</span>
                          <strong className="hydro-val text-teal">
                            ~{report.estimatedDurationMin} phút
                          </strong>
                          {report.estimatedClearAt && (
                            <small className="hydro-sub">
                              ({report.estimatedClearAt.split(",")[0]})
                            </small>
                          )}
                          {report.description?.includes("tự động gia hạn") && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "10px",
                                color: "#0369a1",
                                background: "#e0f2fe",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                marginTop: "2px",
                              }}
                            >
                              🌧️ Tự động gia hạn
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="hydro-item">
                          <span className="hydro-label">Lịch sử ngập:</span>
                          <strong className="hydro-val">{report.historyCount || 4} lần</strong>
                        </div>
                      )}
                    </div>

                    {/* AI Gemini Assessment Snippet */}
                    {report.aiSummary && (
                      <div className="report-card-ai">
                        <span className="ai-tag">✨ AI Gemini</span>
                        <p className="ai-text">{report.aiSummary}</p>
                      </div>
                    )}

                    <div className="report-card-footer">
                      <button
                        type="button"
                        className="btn-locate-on-map"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(report);
                        }}
                      >
                        <Icon name="location" size={14} />
                        <span>Xem trên bản đồ</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        {/* Map Column */}
        <main
          className={`community-map-section ${
            mobileViewMode === "map" ? "is-mobile-visible" : "is-mobile-hidden"
          }`}
        >
          <CommunityMap
            reports={activeReports}
            selectedReportId={selectedReportId}
            onSelectReport={(report) => setSelectedReportId(report ? report.id : null)}
            onNavigateToAvoid={onNavigateToAvoid}
          />
        </main>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        type="button"
        className="community-mobile-fab"
        onClick={onOpenReportModal}
        title="Gửi báo cáo sự cố"
      >
        <Icon name="camera" size={20} />
        <span>Báo ngập</span>
      </button>
    </div>
  );
}
