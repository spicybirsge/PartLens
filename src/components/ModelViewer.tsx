
"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import { useState } from "react";

function Machine({
  onSelect,
}: {
  onSelect: (name: string) => void;
}) {
  const { scene } = useGLTF("/models/machine.glb");

  const handleClick = (event: any) => {
    event.stopPropagation();

    const object = event.object as THREE.Object3D;

    console.log("Clicked object:", object);
    console.log("Object name:", object.name);

    onSelect(object.name || "Unnamed part");
  };

  return <primitive object={scene} onClick={handleClick} />;
}

export default function ModelViewer() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const manuals = [
    {
      title: "Hydraulic Pump Manual",
      part: "HYD-PUMP-001",
      description: "Maintenance and servicing guide",
      pages: 42,
    },
    {
      title: "Pressure Valve Manual",
      part: "VALVE-001",
      description: "Installation and troubleshooting guide",
      pages: 28,
    },
    {
      title: "Gearbox Service Manual",
      part: "GEARBOX-001",
      description: "Gearbox maintenance procedures",
      pages: 67,
    },
    {
      title: "Engine Manual",
      part: "ENGINE-001",
      description: "Engine operation and maintenance",
      pages: 124,
    },
  ];

  return (
    <main
      style={{
        width: "100%",
        padding: "32px 20px 60px",
        boxSizing: "border-box",
      }}
    >
      {/* CAD Viewer */}
      <section
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "clamp(350px, 55vw, 500px)",
            position: "relative",
            border: "1px solid #d1d5db",
            borderRadius: "16px",
            overflow: "hidden",
            background: "#f8fafc",
          }}
        >
          <Canvas
            camera={{
              position: [3, 3, 5],
              fov: 45,
            }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={1} />

            <directionalLight
              position={[5, 5, 5]}
              intensity={2}
            />

            <Bounds fit clip observe margin={1.4}>
              <Machine onSelect={setSelectedPart} />
            </Bounds>

            <OrbitControls
              enableDamping
              dampingFactor={0.08}
            />

            <Environment preset="studio" />
          </Canvas>

          {/* Selected Part */}
          {selectedPart && (
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                maxWidth: "calc(100% - 32px)",
                background: "white",
                padding: "12px 16px",
                borderRadius: "10px",
                color: "black",
                boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginBottom: "3px",
                }}
              >
                Selected Part
              </div>

              <strong
                style={{
                  fontSize: "14px",
                  overflowWrap: "anywhere",
                }}
              >
                {selectedPart}
              </strong>
            </div>
          )}
        </div>
      </section>

      {/* Space */}
      <div style={{ height: "48px" }} />

      {/* Manuals */}
      <section
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Machine Manuals
          </h2>

          <p
            style={{
              color: "#6b7280",
              marginTop: "8px",
              fontSize: "14px",
            }}
          >
            Documentation and service manuals for this machine
          </p>
        </div>

        {/* Manual Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "18px",
          }}
        >
          {manuals.map((manual) => (
            <div
              key={manual.part}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "20px",
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  fontSize: "20px",
                }}
              >
                📄
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {manual.title}
              </h3>

              <p
                style={{
                  margin: "0 0 12px",
                  color: "#6b7280",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {manual.description}
              </p>

              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "16px",
                  overflowWrap: "anywhere",
                }}
              >
                {manual.part} · {manual.pages} pages
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                View Manual
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

