import React from 'react'

export default function Skeleton({ width = '100%', height = 14, radius = 8, className = '' }) {
  return (
    <span
      className={`pr-skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="pr-skeleton-card" aria-busy="true" aria-label="Loading">
      <Skeleton height={18} width="55%" />
      <Skeleton height={12} width="80%" />
      <Skeleton height={12} width="40%" />
      <Skeleton height={36} width="100%" radius={10} />
    </div>
  )
}
