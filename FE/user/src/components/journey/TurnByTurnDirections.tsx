import Icon from "@/components/ui/Icon"
import type { NavigationStep } from "@/types"

function formatVietnamEta(durationText?: string): string {
  const minutesMatch = durationText?.match(/(\d+)/)
  const addMinutes = minutesMatch ? Number(minutesMatch[1]) : 0
  const target = new Date(Date.now() + addMinutes * 60_000)
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(target)
}

function TurnByTurnDirections({
  steps,
  distance,
  durationText,
}: {
  steps: readonly NavigationStep[]
  distance?: string
  durationText?: string
}) {
  const hasRoute = steps.length > 0 && distance && distance !== "—"
  const etaVietnam = formatVietnamEta(durationText)

  return (
    <div className="directions-section">
      <div className="directions-heading">
        <div>
          <h2>Chỉ đường từng bước</h2>
          <p>
            {hasRoute
              ? `${steps.length} chặng · ${distance} · đến nơi khoảng ${etaVietnam} (giờ VN)`
              : "Chọn Điểm đi và Điểm đến để xem chỉ đường & giờ đến dự kiến (GMT+7)"}
          </p>
        </div>
        <Icon name="route" size={22} />
      </div>
      <div className="directions-list">
        {steps.map((step, index) => (
          <div className="direction-step" key={`${step.street}-${index}`}>
            <div className="direction-rail">
              <span className={index === 0 ? "is-current" : ""}>
                <Icon name={step.icon} size={17} />
              </span>
              {index < steps.length - 1 && <i />}
            </div>
            <div className="direction-copy">
              <small>{step.instruction}</small>
              <strong>{step.street}</strong>
            </div>
            <span className="direction-distance">{step.distance}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TurnByTurnDirections
