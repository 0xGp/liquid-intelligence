import React from 'react'
import { CheckCircle2, Loader2, XCircle, Info } from 'lucide-react'

const META = {
  success: { Icon: CheckCircle2, label: 'Confirmed', className: 'pr-status pr-status-ok' },
  pending: { Icon: Loader2, label: 'Processing', className: 'pr-status pr-status-pending' },
  error: { Icon: XCircle, label: 'Failed', className: 'pr-status pr-status-err' },
  info: { Icon: Info, label: 'Waiting', className: 'pr-status pr-status-info' },
}

export default function Status({ tone = 'info', label, children }) {
  const meta = META[tone] || META.info
  const Icon = meta.Icon
  return (
    <span className={meta.className} role="status">
      <Icon size={14} strokeWidth={2} aria-hidden className={tone === 'pending' ? 'pr-spin' : undefined} />
      <span>{label || children || meta.label}</span>
    </span>
  )
}
