import { type ReactNode } from "react"

function StatusPill({
  tone = "neutral",
  children,
  icon,
}: {
  tone?: "safe" | "watch" | "danger" | "info" | "neutral"
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <span className={`status-pill tone-${tone}`}>
      {icon}
      {children}
    </span>
  )
}

export default StatusPill
