import React from 'react'
import { cn } from '@/lib/utils'

export const X_URL = 'https://x.com/lintelligencerh'

export function XLogo({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
      />
    </svg>
  )
}

export default function XLink({ className, markClassName }) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="LatentX Intelligence on X"
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
        className,
      )}
    >
      <XLogo className={cn('size-5', markClassName)} />
    </a>
  )
}
