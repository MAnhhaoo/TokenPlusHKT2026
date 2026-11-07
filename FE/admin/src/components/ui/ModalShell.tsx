import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import IconButton from "@/components/ui/IconButton"
import Heading from "@/components/ui/Heading"

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function ModalShell({
  children,
  title,
  subtitle,
  onClose,
  wide = false,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()
  const modalRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const modal = modalRef.current
    const firstFocusable =
      modal?.querySelector<HTMLElement>(focusableSelector) ?? modal
    firstFocusable?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab" || !modal) return
      const nodes = [...modal.querySelectorAll<HTMLElement>(focusableSelector)]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
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
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus()
    }
  }, [])

  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <Heading level={2} className="modal-title">
              <span id={titleId}>{title}</span>
            </Heading>
            {subtitle && <p id={descriptionId}>{subtitle}</p>}
          </div>
          <IconButton label="Đóng" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  )
}

export default ModalShell
