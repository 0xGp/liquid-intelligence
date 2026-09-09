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
import { useMotion } from './hooks/useMotion'

export default function App() {
  useMotion()

  return (
    <>
      <a href="#main" className="sr-only-focus" style={{ position: 'absolute', left: '-9999px' }}>
        Skip to content
      </a>
      <Cursor />
      <Nav />
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
