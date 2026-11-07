import Icon from "@/components/ui/Icon"
import type { AppTab } from "@/types"

function BottomNav({
  activeTab,
  onSelect,
}: {
  activeTab: AppTab
  onSelect: (tab: AppTab) => void
}) {
  return (
    <nav aria-label="Điều hướng chính" className="bottom-nav">
      <button
        aria-current={activeTab === "map" ? "page" : undefined}
        className={activeTab === "map" ? "is-active" : ""}
        onClick={() => onSelect("map")}
        type="button"
      >
        <Icon name="map" size={22} />
        <span>Bản đồ</span>
      </button>
      <button
        aria-current={activeTab === "tracking" ? "page" : undefined}
        className={activeTab === "tracking" ? "is-active" : ""}
        onClick={() => onSelect("tracking")}
        type="button"
      >
        <Icon name="rain" size={22} />
        <span>Theo dõi</span>
      </button>
      <button
        aria-current={activeTab === "saved" ? "page" : undefined}
        className={activeTab === "saved" ? "is-active" : ""}
        onClick={() => onSelect("saved")}
        type="button"
      >
        <Icon name="route" size={22} />
        <span>Tuyến đường</span>
      </button>
    </nav>
  )
}

export default BottomNav
