import type { ForecastSlot } from "@/types";

function ForecastTimeline({
  value = 0,
  onChange: _onChange,
  slots,
}: {
  value?: number;
  onChange?: (index: number) => void;
  slots: readonly ForecastSlot[];
}) {
  const current = slots[0] ??
    slots[value] ?? {
      id: "now",
      label: "Hiện tại",
      rain: "0 mm",
      risk: "Thấp",
      zone: 0 as const,
    };

  return (
    <div className="forecast-section">
      <div className="section-heading">
        <div>
          <h2>Dự báo lượng mưa</h2>
          <p>Theo dõi lượng mưa dự báo trong 90 phút tới.</p>
        </div>
        <span className={`risk-pill zone-${current.zone}`}>{current.risk}</span>
      </div>
      <div aria-label="Mốc thời gian dự báo" className="forecast-tabs" role="list">
        {slots.map((slot, index) => {
          const rain = Number.parseFloat(slot.rain);
          const height = Math.max(16, Math.min(100, (rain / 60) * 100));

          return (
            <div
              aria-label={`${slot.label}: ${slot.rain} mưa, nguy cơ ${slot.risk.toLowerCase()}`}
              className={`forecast-slot-item zone-${slot.zone} ${index === 0 ? "is-active" : ""}`}
              key={slot.id}
              role="listitem"
            >
              <span className="forecast-time">{slot.label}</span>
              <strong>{slot.rain}</strong>
              <span aria-hidden="true" className="forecast-meter">
                <i style={{ transform: `scaleY(${height / 100})` }} />
              </span>
              <small>{slot.risk}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ForecastTimeline;
