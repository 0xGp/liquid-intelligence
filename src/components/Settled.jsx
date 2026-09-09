import { plates } from '../data'

export default function Settled() {
  return (
    <section className="move-section">
      <div className="move-pin" id="movePin">
        <h2 className="move-title">Settled at machine speed.</h2>
        <div className="move-track" id="moveTrack">
          {plates.map((plate) => (
            <div className="move-card" key={plate.label}>
              <div className="plate" style={{ backgroundImage: `url('${plate.src}')` }} />
              <div className="move-card-label">{plate.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
