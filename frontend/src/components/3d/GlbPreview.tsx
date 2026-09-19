"use client"

import { Component, memo, Suspense, useEffect, useMemo, type ReactNode } from "react"
import { Canvas } from "@react-three/fiber"
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei"

function PreviewModel({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene])

  return <primitive object={scene} />
}

class PreviewErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    this.props.onError(
      error instanceof Error ? error.message : "The selected model could not be previewed.",
    )
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}

interface GlbPreviewProps {
  url: string
  onError: (message: string) => void
}

function GlbPreview({ url, onError }: GlbPreviewProps) {
  useEffect(() => {
    return () => useGLTF.clear(url)
  }, [url])

  return (
    <div className="h-72 overflow-hidden rounded-lg border bg-muted/40 sm:h-80">
      <Canvas camera={{ position: [3, 3, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <PreviewErrorBoundary onError={onError}>
          <Suspense fallback={null}>
            <Bounds fit clip margin={1.35}>
              <PreviewModel url={url} />
            </Bounds>
          </Suspense>
        </PreviewErrorBoundary>
        <OrbitControls enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  )
}

export default memo(GlbPreview)
