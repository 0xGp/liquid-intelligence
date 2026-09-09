import { marquee } from '../data'

export default function Marquee() {
  const items = [...marquee, ...marquee]
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {items.map((name, i) => (
          <span key={`${name}-${i}`}>{name}</span>
        ))}
      </div>
    </div>
  )
}
