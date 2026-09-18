import React from 'react'

export default function EmptyState({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
      {Icon ? (
        <span className="mb-5 inline-flex size-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          <Icon size={19} strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <h3 className="text-[19px] text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
