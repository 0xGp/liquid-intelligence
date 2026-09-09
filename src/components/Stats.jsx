import { stats } from '../data'

export default function Stats() {
  return (
    <section className="stats">
      {stats.map((stat) => (
        <div className="stat" key={stat.label}>
          <div className="num" data-target={stat.target}>
            0
          </div>
          <div className="label">{stat.label}</div>
        </div>
      ))}
    </section>
  )
}
