import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium',
        variant === 'outline' && 'border-border bg-card text-foreground',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
