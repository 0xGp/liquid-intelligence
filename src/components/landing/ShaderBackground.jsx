import { ChromaFlow, FilmGrain, FlutedGlass, Shader, Swirl } from 'shaders/react'

/** Always-running landing field — motion does not wait on the pointer. */
export function ShaderBackground() {
  return (
    <Shader style={{ width: '100%', height: '100%' }}>
      <Swirl colorA="#f7f8f2" colorB="#e4ecd4" detail={1.55} />
      <ChromaFlow
        baseColor="#f4f6ef"
        downColor="#dde6cc"
        leftColor="#e7f3c4"
        rightColor="#c9de8a"
        upColor="#f8faf4"
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
