"use client"

import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { Bounds, Environment, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei"
import * as THREE from "three"

type InteractiveGlbViewerProps = {
  url: string
  selectedPartName?: string | null
  onPartClick: (name: string) => void
  onHoverChange?: (name: string | null) => void
  onError: (message: string) => void,
  isManaging?: boolean
}

function InteractiveModel({
  url,
  selectedPartName,
  hoveredPartName,
  onPartClick,
  onHoverChange,
}: Omit<InteractiveGlbViewerProps, "onError"> & { hoveredPartName: string | null }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => scene.clone(), [scene])

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const isSelected = Boolean(object.name && object.name === selectedPartName)
      const isHovered = Boolean(object.name && object.name === hoveredPartName)
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) continue
        material.emissive.set(isSelected ? "#f59e0b" : isHovered ? "#38bdf8" : "#000000")
        material.emissiveIntensity = isSelected ? 0.45 : isHovered ? 0.3 : 0
      }

    })
  }, [model, selectedPartName, hoveredPartName])

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onHoverChange?.(event.object.name || null)
  }

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onHoverChange?.(null)
  }

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const name = event.object.name.trim()
    if (name) onPartClick(name)
  }

  return (
    <primitive
      object={model}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  )
}

function ViewerLoading() {
  const { progress } = useProgress()
  return <Html center className="whitespace-nowrap rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow">Loading model… {Math.round(progress)}%</Html>
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : "The model could not be loaded.")
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}

export default function InteractiveGlbViewer({
  url,
  selectedPartName,
  onPartClick,
  onHoverChange,
  onError,
  isManaging = true,
}: InteractiveGlbViewerProps) {
  const [hovered, setHovered] = useState(false)
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null)
  useEffect(() => () => useGLTF.clear(url), [url])

  return (
    <div className={`relative h-80 overflow-hidden rounded-xl border bg-muted/30 sm:h-[30rem] ${hovered ? "cursor-pointer" : "cursor-default"}`}>
      <Canvas
        className="transition-colors"
        camera={{ position: [3, 3, 5], fov: 45 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#eef2f6"]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[5, 5, 5]} intensity={1.7} />
       
        <ViewerErrorBoundary onError={onError}>
          <Suspense fallback={<ViewerLoading />}>
           <Environment preset="studio" />
            <Bounds fit clip margin={1.35}>
              <InteractiveModel
                url={url}
                selectedPartName={selectedPartName}
                hoveredPartName={hoveredPartName}
                onPartClick={onPartClick}
                onHoverChange={(name) => {
                  setHovered(Boolean(name))
                  setHoveredPartName(name)
                  onHoverChange?.(name)
                }}
              />
            </Bounds>
          </Suspense>
        </ViewerErrorBoundary>
        <OrbitControls enableDamping dampingFactor={0.08} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/85 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm">
       {isManaging?"Hover a named object, then click to configure it" : "Click on a part to filter manuals relevant only to that part"} 
      </div>
    </div>
  )
}
