import { type ReactNode } from "react"

function Heading({
  children,
  level = 2,
  className = "",
}: {
  children: ReactNode
  level?: number
  className?: string
}) {
  return (
    <div role="heading" aria-level={level} className={className}>
      {children}
    </div>
  )
}


export default Heading
