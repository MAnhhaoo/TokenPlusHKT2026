import { useEffect, useRef, useState } from "react"
import Icon from "@/components/ui/Icon"
import { getUserLocation } from "@/lib/location"
import {
  createCitizenReport,
  matchDynamicPlacePool,
  reverseGeocodeApi,
  searchPlacesApi,
} from "@/lib/api"
import type { ReportType, RouteEndpoint, Severity } from "@/types"

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (!result) {
        resolve("")
        return
      }
      const img = new Image()
      img.onload = () => {
        const maxDim = 640
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", 0.78))
        } else {
          resolve(result)
        }
      }
      img.onerror = () => resolve(result)
      img.src = result
    }
    reader.onerror = () => resolve("")
    reader.readAsDataURL(file)
  })
}

function ReportModal({
  open,
  onClose,
  reporterId,
  onReportCreated,
}: {
  open: boolean
  onClose: () => void
  reporterId?: string
  onReportCreated?: () => void
}) {
  const [type, setType] = useState<ReportType>("flood")
  const [severity, setSeverity] = useState<Severity>("medium")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdReportId, setCreatedReportId] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState("")
  const [photoDataUrl, setPhotoDataUrl] = useState("")

  const [locationText, setLocationText] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("Bình Thạnh")
  const [coords, setCoords] = useState<[number, number]>([106.7185, 10.7934])
  const [locSuggestions, setLocSuggestions] = useState<RouteEndpoint[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locatingGps, setLocatingGps] = useState(false)
  const [description, setDescription] = useState("")

  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  function closeModal() {
    onClose()
    window.setTimeout(() => {
      setSubmitted(false)
      setSubmitting(false)
      setCreatedReportId(null)
      setPhotoName("")
      setPhotoDataUrl("")
      setDescription("")
      setType("flood")
      setSeverity("medium")
      setShowSuggestions(false)
    }, 250)
  }

  useEffect(() => {
    if (!showSuggestions) return
    const clean = locationText.trim()
    if (!clean) {
      setLocSuggestions([])
      return
    }
    const dynamicMatches = matchDynamicPlacePool(clean)
    if (dynamicMatches.length > 0) {
      setLocSuggestions(dynamicMatches)
    }

    let active = true
    const timer = window.setTimeout(async () => {
      const results = await searchPlacesApi(clean)
      if (active) setLocSuggestions(results)
    }, 25)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [locationText, showSuggestions])

  async function handleUseGps() {
    setLocatingGps(true)
    try {
      const { latitude, longitude } = await getUserLocation()
      const geo = await reverseGeocodeApi(latitude, longitude)
      setLocationText(
        geo.district
          ? `${geo.location}, ${geo.district}`
          : geo.location,
      )
      setSelectedDistrict(geo.district || "TP.HCM")
      setCoords([longitude, latitude])
      setShowSuggestions(false)
    } catch (err) {
      console.warn("Failed to locate position in ReportModal:", err)
    } finally {
      setLocatingGps(false)
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setPhotoName("")
      setPhotoDataUrl("")
      return
    }
    setPhotoName(file.name)
    const dataUrl = await compressImageToDataUrl(file)
    setPhotoDataUrl(dataUrl)
  }

  async function handleSubmit() {
    setSubmitting(true)
    const rawLoc = locationText.trim() || "Nguyễn Hữu Cảnh, Bình Thạnh"
    const cleanLocation = rawLoc.split(/[·,]/)[0].trim() || rawLoc
    const created = await createCitizenReport({
      reportType: type,
      severity,
      photoUrl: photoDataUrl || photoName || undefined,
      location: cleanLocation,
      district: selectedDistrict,
      description: description.trim() || undefined,
      lat: coords[1],
      lng: coords[0],
      reporterId,
    })
    setCreatedReportId(created?.id ?? null)
    setSubmitting(false)
    setSubmitted(true)
    if (created) onReportCreated?.()
  }

  const closeModalRef = useRef(closeModal)
  closeModalRef.current = closeModal

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeModalRef.current()
        return
      }
      if (event.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [open])

  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={closeModal}>
      <div
        aria-describedby="report-description"
        aria-labelledby="report-title"
        aria-modal="true"
        className="report-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <button
          aria-label="Đóng báo cáo"
          className="icon-button modal-close"
          onClick={closeModal}
          ref={closeRef}
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
              {createdReportId
                ? `Đã ghi nhận · ${createdReportId}`
                : "Đã ghi nhận"}
            </span>
            <h2 id="report-title">Cảm ơn bạn đã bảo vệ cộng đồng</h2>
            <p id="report-description">
              Báo cáo tại{" "}
              <strong>{locationText.trim() || "khu vực bạn chọn"}</strong> đã
              được gửi tới Trung tâm điều hành theo thời gian thực.
            </p>
            <button
              className="primary-modal-button"
              onClick={closeModal}
              type="button"
            >
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

            <div
              aria-label="Loại sự cố"
              className="report-type-grid"
              role="group"
            >
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
                    <span
                      aria-hidden="true"
                      className={`severity-dot ${id}`}
                    />
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
                  <small>Vị trí hiện trường tại TP.HCM</small>
                  <input
                    aria-label="Nhập tên đường hoặc vị trí ngập"
                    className="report-location-input"
                    onChange={(e) => {
                      setLocationText(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Nhập tên đường, giao lộ (VD: Nguyễn Hữu Cảnh, Bình Thạnh…)"
                    type="text"
                    value={locationText}
                  />
                </div>
                <button
                  className="gps-locate-btn"
                  disabled={locatingGps}
                  onClick={handleUseGps}
                  title="Lấy tọa độ GPS hiện tại của bạn"
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
                          setLocationText(place.label)
                          setSelectedDistrict(place.district || "TP.HCM")
                          setCoords(place.coords)
                          setShowSuggestions(false)
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
  )
}

export default ReportModal
