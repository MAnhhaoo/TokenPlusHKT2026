import SectionHeader from "@/components/ui/SectionHeader"

type Item = {
  label: string
  count: number
  percent: number
  key?: string
}

function DistributionChart({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: Item[]
}) {
  return (
    <section className="panel distribution-card">
      <SectionHeader description={description} title={title} />
      <div className="distribution-list">
        {items.map((item) => (
          <div className="distribution-row" key={item.label}>
            <span className="distribution-label">{item.label}</span>
            <div className="bar-track">
              <span
                className={item.key ? `bar-${item.key}` : undefined}
                style={{ width: `${Math.max(item.percent, 3)}%` }}
              />
            </div>
            <strong>
              {item.count}
              <small>{item.percent}%</small>
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default DistributionChart
