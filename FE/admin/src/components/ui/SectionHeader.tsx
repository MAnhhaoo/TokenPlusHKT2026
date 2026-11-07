import { type ReactNode } from "react"

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        <p className="section-desc">{description}</p>
      </div>
      {action && <div className="section-actions">{action}</div>}
    </div>
  )
}

export default SectionHeader
