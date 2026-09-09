import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

export function useMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(max-width: 860px)').matches

    let lenis = null
    let tickerFn = null
    if (!reduceMotion && !isTouch) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      lenis.on('scroll', ScrollTrigger.update)
      tickerFn = (time) => lenis.raf(time * 1000)
      gsap.ticker.add(tickerFn)
      gsap.ticker.lagSmoothing(0)
    }

    const cursor = document.getElementById('cursor')
    const moveCursor = (e) => {
      if (!cursor) return
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: 'power2.out' })
    }
    const hoverables = document.querySelectorAll('[data-hover], .project, .service-row')
    const onEnter = (el) => () => {
      if (!cursor) return
      cursor.classList.add('grow')
      cursor.textContent = el.classList.contains('project') ? 'VIEW' : ''
    }
    const onLeave = () => {
      if (!cursor) return
      cursor.classList.remove('grow')
      cursor.textContent = ''
    }
    if (!isTouch && cursor) {
      window.addEventListener('mousemove', moveCursor)
      hoverables.forEach((el) => {
        el.addEventListener('mouseenter', onEnter(el))
        el.addEventListener('mouseleave', onLeave)
      })
    }

    const inkTriggers = []
    if (!reduceMotion) {
      const prepInk = (svg) => {
        svg.querySelectorAll('path[stroke], circle[stroke], rect[stroke], ellipse[stroke]').forEach((el) => {
          if (el.hasAttribute('stroke-dasharray')) return
          const len = el.getTotalLength ? el.getTotalLength() : 100
          el.style.strokeDasharray = String(len)
          el.style.strokeDashoffset = String(len)
        })
      }

      document.querySelectorAll('.project-visual svg').forEach((svg) => {
        prepInk(svg)
        const trigger = svg.closest('.project')
        inkTriggers.push(
          ScrollTrigger.create({
            trigger,
            start: 'top 82%',
            once: true,
            onEnter: () => {
              const els = Array.from(
                svg.querySelectorAll('path[stroke], circle[stroke], rect[stroke], ellipse[stroke]'),
              ).filter((el) => !el.hasAttribute('stroke-dasharray'))
              gsap.to(els, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out', stagger: 0.03 })
            },
          }),
        )
      })

      gsap.utils.toArray('.project').forEach((row) => {
        gsap.from(row, {
          opacity: 0,
          y: 40,
          scrollTrigger: { trigger: row, start: 'top 88%' },
          duration: 0.9,
          ease: 'power3.out',
        })
      })

      gsap.utils.toArray('.service-row').forEach((row) => {
        gsap.from(row, {
          opacity: 0,
          y: 24,
          scrollTrigger: { trigger: row, start: 'top 92%' },
          duration: 0.7,
          ease: 'power2.out',
        })
      })
    }

    const manifesto = document.getElementById('manifestoText')
    if (manifesto) {
      const words = manifesto.querySelectorAll('.word')
      words.forEach((w, i) => {
        ScrollTrigger.create({
          trigger: manifesto,
          start: 'top 75%',
          end: 'bottom 40%',
          scrub: 0.3,
          onUpdate: (self) => {
            const progress = self.progress * words.length
            w.classList.toggle('lit', i < progress)
          },
        })
      })
    }

    document.querySelectorAll('.stat .num').forEach((numEl) => {
      const target = parseInt(numEl.dataset.target, 10)
      ScrollTrigger.create({
        trigger: numEl,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(numEl, {
            innerText: target,
            duration: 1.4,
            ease: 'power2.out',
            snap: { innerText: 1 },
            onUpdate() {
              numEl.innerText = String(Math.floor(Number(numEl.innerText)))
            },
          })
        },
      })
    })

    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (!isTouch && cursor) {
        window.removeEventListener('mousemove', moveCursor)
        hoverables.forEach((el) => {
          el.removeEventListener('mouseenter', onEnter(el))
          el.removeEventListener('mouseleave', onLeave)
        })
      }
      inkTriggers.forEach((t) => t.kill())
      if (tickerFn) gsap.ticker.remove(tickerFn)
      if (lenis) lenis.destroy()
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])
}
