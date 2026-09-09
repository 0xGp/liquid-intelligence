import { useEffect } from 'react'

export function useLiquid(heroRef, canvasRef) {
  useEffect(() => {
    const hero = heroRef.current
    const canvas = canvasRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hero || !canvas || reduceMotion) {
      if (canvas) canvas.style.display = 'none'
      return
    }

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) {
      canvas.style.display = 'none'
      return
    }

    const vert = `
      attribute vec2 aPos;
      void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
    `
    const frag = `
      precision highp float;
      uniform vec2 uRes;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uZoom;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
        vec2 p = (uv - 0.5) * aspect;

        float zoom = 1.0 - uZoom * 0.62;
        p /= max(zoom, 0.22);

        float t = uTime * 0.12;
        vec2 flow = vec2(
          fbm(p * 1.8 + vec2(t, 0.0)),
          fbm(p * 1.8 + vec2(8.2, -t * 0.85))
        );
        p += (flow - 0.5) * (0.085 + uZoom * 0.12);

        vec2 m = (uMouse - 0.5) * aspect;
        float d = length(p - m);
        float lens = smoothstep(0.42, 0.0, d);
        p = mix(p, m + (p - m) * (0.72 - uZoom * 0.18), lens * (0.55 + uZoom * 0.35));

        float n = fbm(p * 3.4 + t * 0.4);
        float ridges = fbm(p * 7.0 - t * 0.25);
        float vignette = smoothstep(1.25, 0.18, length(p));

        float liquid = n * 0.55 + ridges * 0.18;
        float ring = smoothstep(0.32, 0.28, d) - smoothstep(0.28, 0.22, d);

        vec3 col = vec3(0.035, 0.035, 0.038);
        col += vec3(liquid * 0.07) * vignette;
        col += vec3(0.10, 0.11, 0.13) * lens * 0.45;
        col += vec3(0.16, 0.17, 0.19) * ring * (0.5 + uZoom);
        col += vec3(uZoom * 0.04);
        col += vec3(0.03, 0.015, 0.05) * (1.0 - vignette) * uZoom;

        gl_FragColor = vec4(col, 1.0);
      }
    `

    function compile(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uMouse = gl.getUniformLocation(prog, 'uMouse')
    const uZoom = gl.getUniformLocation(prog, 'uZoom')

    let mouse = [0.5, 0.5]
    let targetMouse = [0.5, 0.5]
    let zoom = 0
    let raf = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      const w = hero.clientWidth
      const h = hero.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const onMove = (e) => {
      const r = hero.getBoundingClientRect()
      targetMouse[0] = (e.clientX - r.left) / r.width
      targetMouse[1] = 1.0 - (e.clientY - r.top) / r.height
    }

    resize()
    window.addEventListener('resize', resize)
    hero.addEventListener('pointermove', onMove)

    const t0 = performance.now()
    function frame(now) {
      mouse[0] += (targetMouse[0] - mouse[0]) * 0.06
      mouse[1] += (targetMouse[1] - mouse[1]) * 0.06
      const rect = hero.getBoundingClientRect()
      const scrolled = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height * 0.85, 1)))
      zoom += (scrolled - zoom) * 0.08
      gl.uniform1f(uTime, (now - t0) / 1000)
      gl.uniform2f(uMouse, mouse[0], mouse[1])
      gl.uniform1f(uZoom, zoom)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      hero.removeEventListener('pointermove', onMove)
    }
  }, [heroRef, canvasRef])
}
