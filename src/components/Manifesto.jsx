import { manifesto } from '../data'

export default function Manifesto() {
  const words = manifesto.trim().split(/\s+/)
  return (
    <section className="manifesto">
      <p className="manifesto-text" id="manifestoText">
        {words.map((word, i) => (
          <span className="word" key={`${word}-${i}`}>
            {word}{' '}
          </span>
        ))}
      </p>
    </section>
  )
}
