import React, { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Accessible bottom sheet / dialog shell.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  className = '',
  labelledBy,
}) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus?.()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`pr-sheet-root ${className}`} role="presentation">
      <button
        type="button"
        className="pr-sheet-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="pr-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        tabIndex={-1}
      >
        <div className="pr-sheet-handle" aria-hidden="true" />
        <div className="pr-sheet-head">
          <h2 id={titleId} className="pr-sheet-title">
            {title}
          </h2>
          <button
            type="button"
            className="pr-icon-btn"
            onClick={onClose}
            aria-label="Close sheet"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="pr-sheet-body">{children}</div>
      </div>
    </div>
  )
}
