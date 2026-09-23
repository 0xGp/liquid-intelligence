import React from 'react'
import { cn } from '@/lib/utils'
import { useChain } from './ChainContext'
import { SHOW_ROBINHOOD } from './visibility'

const OPTIONS = [
  { id: 'eth', label: 'ETH' },
  { id: 'near', label: 'NEAR' },
]

export default function ChainTab() {
  const { chain, setChain } = useChain()
  if (!SHOW_ROBINHOOD) return null

  return (
    <div
      className="inline-flex h-9 items-center rounded-full border border-black/10 bg-white/80 p-0.5"
      role="tablist"
      aria-label="Settlement chain"
    >
      {OPTIONS.map((option) => {
        const active = chain === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'h-8 rounded-full px-2.5 text-[11px] font-semibold tracking-wide transition-colors sm:px-3 sm:text-[12px]',
              active ? 'bg-foreground text-background' : 'text-foreground/60 hover:text-foreground',
            )}
            onClick={() => setChain(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
