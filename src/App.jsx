import { useEffect, useState } from 'react'
import Cursor from './components/Cursor'
import Nav from './components/Nav'
import Hero from './components/Hero'
import UseCases from './components/UseCases'
import Manifesto from './components/Manifesto'
import About from './components/About'
import Services from './components/Services'
import Stats from './components/Stats'
import Marquee from './components/Marquee'
import FinalCta from './components/FinalCta'
import Footer from './components/Footer'
import Rail from './components/Rail'
import { useMotion } from './hooks/useMotion'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash
}

function Marketing() {
  useMotion()
  return (
    <>
      <main id="main">
        <Hero />
        <UseCases />
        <Manifesto />
        <About />
        <Services />
        <Stats />
        <Marquee />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  const hash = useHash()
  const onRail = hash === '#rail'

  return (
    <>
      <a href="#main" className="sr-only-focus" style={{ position: 'absolute', left: '-9999px' }}>
        Skip to content
      </a>
      <Cursor />
      <Nav />
      {onRail ? <Rail /> : <Marketing />}
    </>
  )
}
