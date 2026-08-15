"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import TarsModel from "./TarsModel";
import TarsCss from "./TarsCss";
import type { MachineState } from "@/lib/types";

/** Framed full-figure TARS. Mobile occupies ~40–50% of the viewport height. */
const RIG = {
  mobile: { z: 5.4, fov: 36, scale: 0.84, wrapY: -0.02, camY: 0.1, lookY: 0.04 },
  desktop: { z: 6.2, fov: 32, scale: 0.92, wrapY: 0.0, camY: 0.12, lookY: 0.05 },
} as const;

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.09, 0]}>
        <circleGeometry args={[4.4, 40]} />
        <meshStandardMaterial color="#0b0b0c" metalness={0.78} roughness={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.084, 0]}>
        <circleGeometry args={[1.62, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.48} />
      </mesh>
    </group>
  );
}

function Rig({ reduced, state }: { reduced: boolean; state: MachineState }) {
  const target = useRef(new THREE.Vector2());
  const { camera, pointer, size } = useThree();
  const wrap = useRef<THREE.Group>(null);

  useFrame(() => {
    const cfg = size.width < 720 ? RIG.mobile : RIG.desktop;
    const persp = camera as THREE.PerspectiveCamera;
    if (Math.abs(persp.fov - cfg.fov) > 0.05) {
      persp.fov = cfg.fov;
      persp.updateProjectionMatrix();
    }
    if (wrap.current) {
      wrap.current.scale.setScalar(cfg.scale);
      wrap.current.position.y = cfg.wrapY;
    }
    if (reduced) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, 0.016);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, cfg.camY, 3, 0.016);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, cfg.z, 3, 0.016);
      camera.lookAt(0, cfg.lookY, 0);
      return;
    }
    target.current.set(pointer.x * 0.22, pointer.y * 0.08);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.current.x, 1.6, 0.016);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, cfg.camY + target.current.y, 1.6, 0.016);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, cfg.z, 1.6, 0.016);
    camera.lookAt(0, cfg.lookY, 0);
  });

  return (
    <group ref={wrap}>
      <TarsModel state={state} reduced={reduced} />
      <Floor />
    </group>
  );
}

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function TarsScene({
  state,
  reduced,
}: {
  state: MachineState;
  reduced: boolean;
}) {
  const [gl, setGl] = useState(true);
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
  const [aa, setAa] = useState(true);

  useEffect(() => {
    setGl(webglOk());
    const mobile = window.innerWidth < 720 || /iPhone|iPad|Android/i.test(navigator.userAgent);
    const cap = mobile ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 1.75);
    setDpr([1, Math.max(1, cap)]);
    setAa(true);
  }, []);

  if (!gl) {
    return (
      <div className="flex h-full w-full items-center justify-center pointer-events-none">
        <TarsCss state={state} />
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0.12, 6.2], fov: 32, near: 0.1, far: 40 }}
      dpr={dpr}
      gl={{ antialias: aa, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
      onCreated={({ gl: renderer }) => {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.22;
      }}
    >
      <color attach="background" args={["#070706"]} />
      <hemisphereLight args={["#efe8dc", "#2a2c30", 0.52]} />
      <ambientLight intensity={0.4} color="#dcd6cc" />
      <directionalLight position={[2.8, 4.4, 3.8]} intensity={1.9} color="#fff4e6" />
      <directionalLight position={[-3.6, 1.6, -2.1]} intensity={1.05} color="#c5d2de" />
      <directionalLight position={[0.15, 0.35, 3.1]} intensity={0.32} color="#f0c070" />
      <pointLight position={[0, 0.05, -1.15]} intensity={0.38} color="#e8a040" />
      <Suspense fallback={null}>
        <Rig reduced={reduced} state={state} />
      </Suspense>
    </Canvas>
  );
}
