import type { FloodReport } from "@/types"

function ReportVisual({
  type,
  large = false,
  photoUrl,
}: {
  type: FloodReport["visual"]
  large?: boolean
  photoUrl?: string
}) {
  const isRealImage =
    typeof photoUrl === "string" &&
    (photoUrl.startsWith("data:image") || photoUrl.startsWith("http"))

  if (isRealImage) {
    return (
      <div
        className={`report-visual visual-${type} ${large ? "large" : ""}`}
        aria-label="Ảnh hiện trường thực tế"
        role="img"
      >
        <img
          src={photoUrl}
          alt="Ảnh hiện trường thực tế"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <span className="visual-time">ẢNH THỰC TẾ TỪ CỘNG ĐỒNG</span>
      </div>
    )
  }

  return (
    <div
      className={`report-visual visual-${type} ${large ? "large" : ""}`}
      aria-label="Ảnh hiện trường mô phỏng"
      role="img"
    >
      <span className="visual-sky" />
      <span className="visual-road" />
      <span className="visual-water" />
      <span className="visual-building one" />
      <span className="visual-building two" />
      <span className="visual-car" />
      {type === "drain" && <span className="visual-drain-mouth" />}
      <span className="visual-time">
        ẢNH HIỆN TRƯỜNG · 18:
        {type === "traffic" ? "42" : type === "drain" ? "38" : "31"}
      </span>
    </div>
  )
}

export default ReportVisual
