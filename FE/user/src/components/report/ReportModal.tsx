import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { getUserLocation } from "@/lib/location";
import {
  analyzeReportImageApi,
  createCitizenReport,
  matchDynamicPlacePool,
  reverseGeocodeApi,
  searchPlacesApi,
  type FloodAiAnalysis,
} from "@/lib/api";
import { processAndAnalyzeImageFile } from "@/lib/visionAnalysis";
import type { MapFloodPoint, ReportType, RouteEndpoint, Severity } from "@/types";

function ReportModal({
  open,
  onClose,
  reporterId,
  onReportCreated,
}: {
  open: boolean;
  onClose: () => void;
  reporterId?: string;
  onReportCreated?: (point?: MapFloodPoint) => void;
}) {
  const [type, setType] = useState<ReportType>("flood");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<FloodAiAnalysis | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const [locationText, setLocationText] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("Bình Thạnh");
  const [coords, setCoords] = useState<[number, number]>([106.7185, 10.7934]);
  const [hasCustomLocation, setHasCustomLocation] = useState(false);
  const [locSuggestions, setLocSuggestions] = useState<RouteEndpoint[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [description, setDescription] = useState("");

  const panelRef = useDialogFocus(open, closeModal);
  const successRef = useRef<HTMLDivElement>(null);

  function closeModal() {
    onClose();
    window.setTimeout(() => {
      setSubmitError(null);
      setSubmitted(false);
      setSubmitting(false);
      setCreatedReportId(null);
      setPhotoName("");
      setPhotoDataUrl("");
      setAiAnalysis(null);
      setAnalyzingImage(false);
      setDescription("");
      setType("flood");
      setSeverity("medium");
      setShowSuggestions(false);
      setHasCustomLocation(false);
    }, 250);
  }

  // Mặc định tự động lấy vị trí hiện tại khi người dùng mở modal
  useEffect(() => {
    if (open && !hasCustomLocation && !locationText) {
      handleUseGps();
    }
  }, [open]);

  useEffect(() => {
    if (!showSuggestions) return;
    const clean = locationText.trim();
    if (!clean) {
      setLocSuggestions([]);
      return;
    }
    const dynamicMatches = matchDynamicPlacePool(clean);
    if (dynamicMatches.length > 0) {
      setLocSuggestions(dynamicMatches);
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      const results = await searchPlacesApi(clean);
      if (active) setLocSuggestions(results);
    }, 25);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [locationText, showSuggestions]);

  async function handleUseGps() {
    setLocatingGps(true);
    try {
      const { latitude, longitude } = await getUserLocation();
      const geo = await reverseGeocodeApi(latitude, longitude);
      setLocationText(geo.district ? `${geo.location}, ${geo.district}` : geo.location);
      setSelectedDistrict(geo.district || "TP.HCM");
      setCoords([longitude, latitude]);
      setShowSuggestions(false);
    } catch (err) {
      console.warn("Failed to locate position in ReportModal:", err);
    } finally {
      setLocatingGps(false);
    }
  }

  function applyAiAnalysis(analysis: FloodAiAnalysis) {
    setAiAnalysis(analysis);
    if (analysis.reportType === "drain") {
      setType("drain");
    } else {
      setType("flood");
    }
    if (analysis.severity === "high") {
      setSeverity("high");
    } else if (analysis.severity === "low") {
      setSeverity("low");
    } else {
      setSeverity("medium");
    }
    if (!description.trim() && analysis.aiSummary) {
      setDescription(analysis.aiSummary);
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoName("");
      setPhotoDataUrl("");
      setAiAnalysis(null);
      return;
    }
    setPhotoName(file.name);

    // 1. Phân tích thị giác máy tính trực tiếp từ điểm ảnh thực tế (Pixel Computer Vision)
    const rawLoc = locationText.trim() || "TP. Hồ Chí Minh";
    const { dataUrl, analysis: localVisionAnalysis } = await processAndAnalyzeImageFile(
      file,
      rawLoc,
      description.trim() || undefined,
    );
    setPhotoDataUrl(dataUrl);

    // Áp dụng ngay kết quả phân tích thị giác máy tính độc bản từ ảnh
    applyAiAnalysis(localVisionAnalysis);

    // 2. Đồng thời kết nối backend nếu có Google Gemini Vision API
    if (dataUrl) {
      setAnalyzingImage(true);
      try {
        const remoteAnalysis = await analyzeReportImageApi({
          image: dataUrl,
          location: rawLoc,
          description: description.trim() || undefined,
        });
        if (remoteAnalysis) {
          applyAiAnalysis(remoteAnalysis);
        }
      } catch (err) {
        console.warn("AI Image remote analysis error:", err);
      } finally {
        setAnalyzingImage(false);
      }
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let resolvedCoords = coords;
      let resolvedDistrict = selectedDistrict;
      const trimmedLoc = locationText.trim();
      if (trimmedLoc && locSuggestions.length > 0) {
        const matched = locSuggestions[0];
        if (matched?.coords) {
          resolvedCoords = matched.coords;
          if (matched.district) resolvedDistrict = matched.district;
        }
      } else if (trimmedLoc && typeof searchPlacesApi === "function") {
        try {
          const found = await searchPlacesApi(trimmedLoc);
          if (found?.[0]?.coords) {
            resolvedCoords = found[0].coords;
            if (found[0].district) resolvedDistrict = found[0].district;
          }
        } catch {
          // keep current coords
        }
      }

      const rawLoc = trimmedLoc || "Nguyễn Hữu Cảnh, Bình Thạnh";
      const cleanLocation = rawLoc.split(/[·,]/)[0].trim() || rawLoc;
      const defaultDepth = severity === "high" ? 35 : severity === "low" ? 12 : 24;
      const reportedDepth =
        aiAnalysis?.estimatedDepthCm && aiAnalysis.estimatedDepthCm > 0
          ? aiAnalysis.estimatedDepthCm
          : defaultDepth;

      let submitCoords = resolvedCoords;
      if (hasCustomLocation && rawLoc) {
        const matches = matchDynamicPlacePool(rawLoc);
        if (matches.length > 0) {
          submitCoords = matches[0].coords;
        }
      }

      const created = await createCitizenReport({
        reportType: type,
        severity,
        photoUrl: photoDataUrl || photoName || undefined,
        location: cleanLocation,
        district: resolvedDistrict,
        description: description.trim() || aiAnalysis?.aiSummary || undefined,
        lat: submitCoords[1],
        lng: submitCoords[0],
        reporterId,
        aiSummary: aiAnalysis?.aiSummary,
        recommendation: aiAnalysis?.recommendation,
        reportedDepth,
        aiDepth: aiAnalysis?.estimatedDepthCm,
        aiConfidence: aiAnalysis?.confidence,
        visual: aiAnalysis?.visual,
      });
      if (!created) {
        setSubmitError("Không thể gửi báo cáo. Vui lòng thử lại.");
        return;
      }
      setCreatedReportId(created.id);
      setSubmitted(true);
      const createdPoint: MapFloodPoint = created.mapPoint ?? {
        id: `p_${created.id}`,
        lat: resolvedCoords[1],
        lng: resolvedCoords[0],
        label: cleanLocation,
        district: resolvedDistrict,
        type: "flood",
        severity: severity === "high" ? "critical" : "medium",
        depth: created.aiDepth && created.aiDepth > 0 ? created.aiDepth : reportedDepth,
        rainfall: 0,
      };
      onReportCreated?.(createdPoint);
    } catch {
      setSubmitError("Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={closeModal}>
      <div
        aria-describedby="report-description"
        aria-labelledby="report-title"
        aria-modal="true"
        className="report-modal"
        onMouseDown={(event) => event.stopPropagation()}
        tabIndex={-1}
        ref={panelRef}
        role="dialog"
      >
        <button
          aria-label="Đóng báo cáo"
          className="icon-button modal-close"
          onClick={closeModal}
          type="button"
        >
          <Icon name="close" size={20} />
        </button>

        {submitted ? (
          <div
            aria-live="polite"
            className="report-success"
            ref={successRef}
            role="status"
            tabIndex={-1}
          >
            <span className="success-mark">
              <Icon name="check" size={30} />
            </span>
            <span className="success-pill">
              {createdReportId ? `⚡ Đã tự động duyệt · ${createdReportId}` : "⚡ Đã tự động duyệt"}
            </span>
            <h2 id="report-title">Báo cáo đã xuất hiện trên bản đồ cộng đồng!</h2>
            <p id="report-description">
              Hệ thống AI Gemini đã phân tích ảnh và tự động xác thực báo cáo tại{" "}
              <strong>{locationText.trim() || "khu vực bạn chọn"}</strong>. Báo cáo đã lập tức hiển
              thị công khai trên bản đồ thời gian thực để cảnh báo cho người dân.
            </p>
            <button className="primary-modal-button" onClick={closeModal} type="button">
              Quay lại bản đồ
            </button>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <span className="modal-mark">
                <Icon name="pin" size={22} />
              </span>
              <div>
                <h2 id="report-title">Bạn đang thấy gì?</h2>
                <p className="modal-intro" id="report-description">
                  Chọn vị trí, mức độ ngập và gửi ảnh để cảnh báo cho cộng đồng.
                </p>
              </div>
            </div>

            <div aria-label="Loại sự cố" className="report-type-grid" role="group">
              <button
                aria-pressed={type === "flood"}
                className={type === "flood" ? "is-selected" : ""}
                onClick={() => setType("flood")}
                type="button"
              >
                <span className="report-type-icon">
                  <Icon name="rain" size={24} />
                </span>
                <strong>Đường bị ngập</strong>
                <small>Nước đang dâng trên đường</small>
              </button>
              <button
                aria-pressed={type === "drain"}
                className={type === "drain" ? "is-selected" : ""}
                onClick={() => setType("drain")}
                type="button"
              >
                <span className="report-type-icon drain-icon">
                  <Icon name="alert" size={24} />
                </span>
                <strong>Cống bị tắc</strong>
                <small>Rác che miệng thoát nước</small>
              </button>
            </div>

            <fieldset className="severity-field">
              <legend>Mức độ quan sát được</legend>
              <div className="severity-options">
                {(
                  [
                    ["low", "Nhẹ", "Dưới mắt cá (~12cm)"],
                    ["medium", "Đáng chú ý", "Qua nửa bánh xe (~25cm)"],
                    ["high", "Nguy hiểm", "Không thể đi qua (>40cm)"],
                  ] as [Severity, string, string][]
                ).map(([id, title, caption]) => (
                  <button
                    aria-pressed={severity === id}
                    className={severity === id ? "is-selected" : ""}
                    key={id}
                    onClick={() => setSeverity(id)}
                    type="button"
                  >
                    <span aria-hidden="true" className={`severity-dot ${id}`} />
                    <span>
                      <strong>{title}</strong>
                      <small>{caption}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="report-location-field">
              <div className="report-location">
                <Icon name="pin" size={18} />
                <div className="report-location-input-wrap">
                  <small>
                    {hasCustomLocation
                      ? "Vị trí do bạn nhập (tùy chọn)"
                      : "Vị trí hiện tại của bạn (tự động nhận diện)"}
                  </small>
                  <input
                    aria-label="Nhập tên đường hoặc vị trí ngập"
                    className="report-location-input"
                    onChange={(e) => {
                      setLocationText(e.target.value);
                      setHasCustomLocation(true);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={
                      locatingGps
                        ? "Đang định vị vị trí hiện tại của bạn…"
                        : "Nhập tên đường, giao lộ (VD: Nguyễn Hữu Cảnh, Bình Thạnh…)"
                    }
                    type="text"
                    value={locationText}
                  />
                </div>
                <button
                  className="gps-locate-btn"
                  disabled={locatingGps}
                  onClick={() => {
                    setHasCustomLocation(false);
                    handleUseGps();
                  }}
                  title="Nhấn để tự động lấy lại vị trí bạn đang đứng"
                  type="button"
                >
                  <Icon name="location" size={15} />
                  {locatingGps ? "Đang định vị…" : "GPS"}
                </button>
              </div>

              {showSuggestions && locSuggestions.length > 0 && (
                <ul className="search-suggestions report-loc-suggestions">
                  {locSuggestions.map((place) => (
                    <li key={`${place.label}-${place.coords.join(",")}`}>
                      <button
                        className="suggestion-item"
                        onClick={() => {
                          setLocationText(place.label);
                          setSelectedDistrict(place.district || "TP.HCM");
                          setCoords(place.coords);
                          setHasCustomLocation(true);
                          setShowSuggestions(false);
                        }}
                        type="button"
                      >
                        <Icon name="pin" size={14} />
                        <span>{place.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="auth-field">
              <span>Mô tả chi tiết hiện trường (tùy chọn)</span>
              <input
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VD: Nước ngập nửa bánh xe máy, xe chết máy nhiều…"
                type="text"
                value={description}
              />
            </label>

            <label className="photo-button">
              {photoDataUrl ? (
                <img
                  alt="Xem trước ảnh hiện trường"
                  className="photo-preview-thumb"
                  src={photoDataUrl}
                />
              ) : (
                <span className="photo-icon">
                  <Icon name="camera" size={21} />
                </span>
              )}
              <span>
                <strong>{photoName || "Thêm ảnh hiện trường thực tế"}</strong>
                <small>
                  {photoDataUrl
                    ? "Đã đính kèm ảnh thật · Trung tâm điều hành sẽ thấy ảnh này"
                    : "Tùy chọn · AI sẽ phân tích mực nước từ ảnh"}
                </small>
              </span>
              <Icon name={photoName ? "check" : "plus"} size={20} />
              <input
                accept="image/*"
                aria-label="Chọn ảnh hiện trường"
                onChange={handlePhotoChange}
                type="file"
              />
            </label>

            {analyzingImage && (
              <div className="ai-analyzing-card">
                <span className="ai-spin-icon">
                  <Icon name="camera" size={18} />
                </span>
                <div>
                  <strong>⚡ AI Gemini đang phân tích hiện trường từ ảnh...</strong>
                  <small>
                    Ước tính mực nước, kiểm tra miệng cống, nhận diện mưa gió & đánh giá rủi ro
                  </small>
                </div>
              </div>
            )}

            {aiAnalysis && !analyzingImage && (
              <div className="ai-result-card">
                <div className="ai-result-header">
                  <span className="ai-badge">
                    <Icon name="check" size={13} /> Gemini Vision AI ({aiAnalysis.confidence}% tin
                    cậy)
                  </span>
                  <span className={`ai-severity-tag ${aiAnalysis.severity}`}>
                    {aiAnalysis.severity === "critical"
                      ? "Rất nguy hiểm"
                      : aiAnalysis.severity === "high"
                        ? "Nguy hiểm"
                        : aiAnalysis.severity === "medium"
                          ? "Đáng chú ý"
                          : "Nhẹ"}
                  </span>
                </div>
                <div className="ai-metrics-row">
                  <div className="ai-metric">
                    <small>Mực nước AI</small>
                    <strong>~{aiAnalysis.estimatedDepthCm} cm</strong>
                  </div>
                  <div className="ai-metric">
                    <small>Thời tiết</small>
                    <strong>{aiAnalysis.weatherCondition}</strong>
                  </div>
                  <div className="ai-metric">
                    <small>Miệng cống</small>
                    <strong>{aiAnalysis.drainStatus}</strong>
                  </div>
                </div>
                <p className="ai-summary-text">
                  🤖 <strong>Nhận định AI:</strong> {aiAnalysis.aiSummary}
                </p>
                {aiAnalysis.recommendation && (
                  <div className="ai-recommendation-box">
                    <strong>💡 Khuyến nghị cho người dân:</strong> {aiAnalysis.recommendation}
                  </div>
                )}
              </div>
            )}

            {submitError && <p role="alert">{submitError}</p>}
            <button
              className="primary-modal-button"
              disabled={submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? "Đang gửi báo cáo..." : "Gửi báo cáo cộng đồng"}
              <Icon name="arrow" size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
