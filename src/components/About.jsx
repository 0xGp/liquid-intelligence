import { capabilities } from '../data'

export default function About() {
  return (
    <section className="about" id="about">
      <div>
        <h2>We built the compute rail video models transact on.</h2>
      </div>
      <div className="about-right">
        <p>
          Vince is the unified marketplace infrastructure for next-generation video synthesis — per-second metering,
          instant on-chain settlement, and automated failure protection on Robinhood Chain. Access Google Veo 3.1,
          Kling 3.0 Pro, MiniMax Hailuo, and Runway with zero subscription waste.
        </p>
        <div className="cap-grid">
          {capabilities.map((cap) => (
            <div key={cap}>{cap}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
