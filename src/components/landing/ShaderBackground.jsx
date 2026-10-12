import { ChromaFlow, FilmGrain, FlutedGlass, Shader, Swirl } from 'shaders/react'

/** Always-running landing field — motion does not wait on the pointer. */
export function ShaderBackground() {
  return (
    <Shader style={{ width: '100%', height: '100%' }}>
      <Swirl colorA="#ffffff" colorB="#e6e8ef" detail={1.55} />
      <ChromaFlow
        baseColor="#f4f5f8"
        downColor="#c3c7d4"
        leftColor="#d2d5e0"
        rightColor="#b4b8c6"
        upColor="#eceef4"
        momentum={18}
        radius={3.8}
      />
      <FlutedGlass
        aberration={0.42}
        angle={28}
        frequency={7}
        highlight={0.14}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={3.2}
        shape="rounded"
        softness={1}
        speed={0.28}
      />
      <FilmGrain strength={0.045} />
    </Shader>
  )
}
