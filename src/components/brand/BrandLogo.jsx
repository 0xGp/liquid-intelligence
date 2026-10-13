import React from 'react'
import { cn } from '@/lib/utils'

export default function BrandLogo({ className, markClassName, nameClassName, onClick }) {
  return (
    <a
      href="#"
      onClick={onClick}
      className={cn('inline-flex items-center gap-2.5 text-foreground', className)}
      aria-label="LatentX Intelligence home"
    >
      <span
        className={cn(
          'relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[28%] bg-[#020826] ring-1 ring-black/10 sm:size-9',
          markClassName,
        )}
      >
        <img src="/brand/lx-mark-256.png" alt="" className="size-[74%] object-contain" />
      </span>
      <span
        className={cn(
          'whitespace-nowrap font-serif text-[15px] leading-none tracking-[-0.02em] sm:text-[17px]',
          nameClassName,
        )}
      >
        LatentX Intelligence
      </span>
    </a>
  )
}
