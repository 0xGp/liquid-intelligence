export function VisualNetwork() {
  return (
    <svg viewBox="0 0 400 250" width="100%" height="100%" fill="none">
      <circle cx="90" cy="120" r="34" stroke="#f7f6f3" strokeWidth="1.3" />
      <circle cx="80" cy="112" r="2.6" fill="#f7f6f3" />
      <circle cx="100" cy="112" r="2.6" fill="#f7f6f3" />
      <path d="M78 132Q90 140 102 132" stroke="#f7f6f3" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="230" cy="70" r="20" stroke="#8a8a86" strokeWidth="1.1" />
      <circle cx="230" cy="180" r="20" stroke="#8a8a86" strokeWidth="1.1" />
      <circle cx="320" cy="125" r="20" stroke="#8a8a86" strokeWidth="1.1" />
      <path d="M120 108C160 92 190 82 212 76" stroke="#8a8a86" strokeWidth="1" strokeDasharray="2 6" />
      <path d="M120 132C160 150 190 165 212 174" stroke="#8a8a86" strokeWidth="1" strokeDasharray="2 6" />
      <path d="M124 118C180 122 260 122 302 123" stroke="#8a8a86" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="166" cy="98" r="6" stroke="#f7f6f3" strokeWidth="1.2" />
      <path d="M163 98L165 100L170 94" stroke="#f7f6f3" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VisualSignal() {
  return (
    <svg viewBox="0 0 400 250" width="100%" height="100%" fill="none">
      <path d="M50 190L120 130L170 165L260 80L340 55" stroke="#f7f6f3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="340" cy="55" r="4" fill="#f7f6f3" />
      <path d="M50 200H340" stroke="#8a8a86" strokeWidth="0.8" strokeDasharray="1 5" />
      <circle cx="120" cy="130" r="14" stroke="#8a8a86" strokeWidth="1" />
      <circle cx="260" cy="80" r="14" stroke="#8a8a86" strokeWidth="1" />
    </svg>
  )
}

export function VisualMarket() {
  return (
    <svg viewBox="0 0 400 250" width="100%" height="100%" fill="none">
      <rect x="60" y="95" width="60" height="60" rx="8" stroke="#f7f6f3" strokeWidth="1.3" />
      <rect x="280" y="95" width="60" height="60" rx="8" stroke="#f7f6f3" strokeWidth="1.3" />
      <path d="M120 125H280M280 125L262 110M280 125L262 140" stroke="#8a8a86" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="200" cy="125" r="16" fill="#0a0a0a" stroke="#f7f6f3" strokeWidth="1.3" />
      <path d="M194 125L198 130L207 118" stroke="#f7f6f3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VisualData() {
  return (
    <svg viewBox="0 0 400 250" width="100%" height="100%" fill="none">
      <path d="M60 100C60 88 130 78 200 78S340 88 340 100" stroke="#f7f6f3" strokeWidth="1.2" />
      <path d="M60 100V150C60 162 130 172 200 172S340 162 340 150V100" stroke="#f7f6f3" strokeWidth="1.2" />
      <ellipse cx="200" cy="100" rx="140" ry="22" stroke="#f7f6f3" strokeWidth="1.2" />
      <path d="M200 78V172" stroke="#8a8a86" strokeWidth="0.9" strokeDasharray="1 5" />
    </svg>
  )
}

const map = { network: VisualNetwork, signal: VisualSignal, market: VisualMarket, data: VisualData }

export default function ProjectVisual({ type }) {
  const Comp = map[type]
  return Comp ? <Comp /> : null
}
