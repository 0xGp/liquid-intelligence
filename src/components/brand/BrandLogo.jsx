import React from 'react'
import { cn } from '@/lib/utils'

export default function BrandLogo({ className, markClassName, nameClassName, onClick }) {
  return (
    <a
      href="#"
      onClick={onClick}
      className={cn('inline-flex items-center gap-2.5 text-foreground', className)}
      aria-label="Liquid Intelligence home"
    >
      <span
        className={cn(
          'relative size-8 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-black/10 sm:size-9',
          markClassName,
        )}
      >
        <img src="/assets/liquid-mark.png" alt="" className="size-full object-cover" />
      </span>
      <span
        className={cn(
          'whitespace-nowrap font-serif text-[15px] leading-none tracking-[-0.02em] sm:text-[17px]',
          nameClassName,
        )}
      >
        Liquid Intelligence
      </span>
    </a>
  )
}
