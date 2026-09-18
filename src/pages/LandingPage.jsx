import React from 'react'
import Hero from '../components/Hero'
import UseCases from '../components/UseCases'
import Manifesto from '../components/Manifesto'
import About from '../components/About'
import KeyRentSection from '../components/KeyRentSection'
import Services from '../components/Services'
import Stats from '../components/Stats'
import Marquee from '../components/Marquee'
import FinalCta from '../components/FinalCta'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <>
      <main id="main">
        <Hero />
        <UseCases />
        <Manifesto />
        <About />
        <KeyRentSection />
        <Services />
        <Stats />
        <Marquee />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
