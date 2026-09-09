import { useRef } from 'react'
import { useLiquid } from '../hooks/useLiquid'

export default function Hero() {
  const heroRef = useRef(null)
  const canvasRef = useRef(null)
  useLiquid(heroRef, canvasRef)

  return (
    <section className="hero" ref={heroRef}>
      <canvas id="liquidCanvas" ref={canvasRef} aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-kicker">A payment rail for AI agents</div>
        <h1 className="hero-headline">
          <span className="line">Agents pay agents.</span>
          <span className="line">Per call. Real time.</span>
        </h1>
        <div className="hero-foot">
          <span>Metered, authorized, and settled before the response leaves the wire.</span>
          <span className="scroll-cue">Scroll</span>
        </div>
      </div>
    </section>
  )
}
