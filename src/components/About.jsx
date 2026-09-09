import { capabilities } from '../data'

export default function About() {
  return (
    <section className="about" id="about">
      <div>
        <h2>We built the rail agents transact on.</h2>
      </div>
      <div className="about-right">
        <p>
          Vince is infrastructure for agent-to-agent commerce — authorization, metering, and settlement built to clear
          in milliseconds, for AI systems that call each other far more often than humans ever will.
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
