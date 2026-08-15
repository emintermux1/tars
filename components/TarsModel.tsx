"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MachineState } from "@/lib/types";

const W = 0.56;
const H = 2.02;
const D = 1.02;
const INNER_GAP = 0.03;
const HINGE_GAP = 0.046;
const LEG = 0.3;

function finishColorMap(t: THREE.CanvasTexture, ui: boolean) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = ui ? 8 : 16;
  t.generateMipmaps = !ui;
  t.minFilter = ui ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** High-res VERTICAL grain. Horizontal 1px scanlines + RepeatWrapping is what tore on iPhone. */
function brushedColorMap() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, "#8a8f98");
  g.addColorStop(0.22, "#c8ccd4");
  g.addColorStop(0.5, "#eceff4");
  g.addColorStop(0.76, "#b6bbc4");
  g.addColorStop(1, "#7a8088");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x++) {
    const a = 0.012 + Math.random() * 0.035;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(18,20,24,${a * 0.65})`;
    ctx.fillRect(x, 0, 1, S);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1, 30 + Math.random() * 160);
  }
  return finishColorMap(new THREE.CanvasTexture(c), false);
}

function grainRoughnessMap() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#9a9a9a";
  ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x++) {
    const v = 132 + Math.floor(Math.random() * 56);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function letterMap(ch: string) {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#f2a12a";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#f3a227";
  ctx.font = "800 168px Arial, Helvetica, sans-serif";
  ctx.fillText(ch, 128, 140);
  return finishColorMap(new THREE.CanvasTexture(c), true);
}

type Mats = {
  bodyOuter: THREE.MeshStandardMaterial;
  bodyInner: THREE.MeshPhysicalMaterial;
  edge: THREE.MeshStandardMaterial;
  band: THREE.MeshStandardMaterial;
  seam: THREE.MeshStandardMaterial;
  port: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
  letters: THREE.CanvasTexture[];
};

let MATS: Mats | null = null;

function getMats(): Mats {
  if (MATS) return MATS;
  const color = brushedColorMap();
  const grain = grainRoughnessMap();
  MATS = {
    bodyOuter: new THREE.MeshStandardMaterial({
      color: "#c9ced6",
      map: color,
      roughnessMap: grain,
      roughness: 0.34,
      metalness: 0.74,
      envMapIntensity: 1.12,
      flatShading: false,
    }),
    bodyInner: new THREE.MeshPhysicalMaterial({
      color: "#d2d6de",
      roughnessMap: grain,
      roughness: 0.3,
      metalness: 0.8,
      clearcoat: 0.16,
      clearcoatRoughness: 0.38,
      envMapIntensity: 1.18,
      flatShading: false,
    }),
    edge: new THREE.MeshStandardMaterial({
      color: "#eceff4",
      roughness: 0.2,
      metalness: 0.82,
      flatShading: false,
    }),
    band: new THREE.MeshStandardMaterial({
      color: "#0a0b0d",
      roughness: 0.78,
      metalness: 0.18,
    }),
    seam: new THREE.MeshStandardMaterial({
      color: "#1b1d22",
      roughness: 0.55,
      metalness: 0.35,
    }),
    port: new THREE.MeshStandardMaterial({
      color: "#101114",
      roughness: 0.48,
      metalness: 0.4,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: "#f0a028",
      emissive: "#f0a028",
      emissiveIntensity: 1.05,
      roughness: 0.28,
      metalness: 0.08,
    }),
    letters: ["T", "A", "R", "S"].map(letterMap),
  };
  return MATS;
}

function Seams() {
  const mats = getMats();
  const ys = [-0.62, -0.22, 0.2, 0.6];
  return (
    <group>
      {ys.map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.seam}>
          <boxGeometry args={[W + 0.008, 0.012, D + 0.008]} />
        </mesh>
      ))}
      <mesh position={[0, 0, D / 2 + 0.003]} material={mats.seam}>
        <boxGeometry args={[0.01, H * 0.9, 0.008]} />
      </mesh>
    </group>
  );
}

function SidePorts({ legs }: { legs?: boolean }) {
  const mats = getMats();
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(W / 2 + 0.012) * side, H / 2 - 0.22, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={mats.port}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.03, 16]} />
        </mesh>
      ))}
      {legs &&
        [-1, 1].map((side) => (
          <group key={`foot-${side}`}>
            <mesh position={[0.12 * side, -H / 2 + 0.2, D / 2 + 0.008]} material={mats.port}>
              <circleGeometry args={[0.075, 20]} />
            </mesh>
            <mesh position={[0.12 * side, -H / 2 + 0.2, D / 2 + 0.01]} material={mats.amber}>
              <ringGeometry args={[0.042, 0.055, 20]} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

function AmberDots({
  cols,
  rows,
  origin,
  pitch,
}: {
  cols: number;
  rows: number;
  origin: [number, number];
  pitch: [number, number];
}) {
  const mats = getMats();
  const dots: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      dots.push([origin[0] + c * pitch[0], origin[1] - r * pitch[1]]);
    }
  }
  return (
    <group>
      {dots.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], D / 2 + 0.016]} material={mats.amber}>
          <sphereGeometry args={[0.026, 16, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function NamePlate() {
  const mats = getMats();
  return (
    <group position={[-0.04, 0.08, D / 2 + 0.008]}>
      {mats.letters.map((tex, i) => (
        <mesh key={i} position={[0, 0.4 - i * 0.28, 0]}>
          <planeGeometry args={[0.28, 0.26]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function StatusScreen({ state, speaking }: { state: MachineState; speaking: boolean }) {
  const last = useRef(0);
  const pack = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    return { c, ctx, tex };
  }, []);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    if (now - last.current < 0.125) return;
    last.current = now;
    const { ctx, tex } = pack;
    ctx.fillStyle = "#050607";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "rgba(110, 210, 210, 0.35)";
    ctx.strokeRect(8, 8, 496, 240);
    const online = state !== "OFFLINE" && state !== "ERROR";
    const lines = [
      ["STATUS", online ? (state === "PROCESSING" ? "PROC" : state === "SPEAKING" ? "VOICE" : "ONLINE") : "DOWN"],
      ["SYSTEMS", state === "ERROR" ? "FAULT" : "NOMINAL"],
      ["MOBILITY", "100%"],
      ["INT", "MAX"],
    ];
    ctx.font = "700 28px ui-monospace, monospace";
    ctx.textAlign = "left";
    lines.forEach((row, i) => {
      ctx.fillStyle = "#5c6568";
      ctx.fillText(row[0], 24, 52 + i * 42);
      ctx.fillStyle = state === "ERROR" ? "#c07040" : "#8fe3d8";
      ctx.fillText(row[1], 280, 52 + i * 42);
    });
    ctx.strokeStyle = speaking ? "#f0a028" : "#6ec8c4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const t = clock.elapsedTime;
    for (let i = 0; i < 48; i++) {
      const x = 24 + i * 9.6;
      const amp = speaking ? 16 + Math.sin(t * 12 + i * 0.5) * 12 : 5 + Math.sin(t * 1.4 + i * 0.35) * 3;
      const y = 228 - amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    tex.needsUpdate = true;
  });

  return (
    <mesh position={[0, H / 2 - 0.2, D / 2 + 0.016]}>
      <planeGeometry args={[W * 0.78, 0.22]} />
      <meshBasicMaterial map={pack.tex} />
    </mesh>
  );
}

/** Black bands sit just outside the body so they do not z-fight the inner slab. */
function BlackBands() {
  const mats = getMats();
  const rows: { y: number; h: number }[] = [
    { y: H / 2 - 0.2, h: 0.3 },
    { y: -H / 2 + 0.17, h: 0.26 },
  ];
  const z = D / 2 + 0.008;
  return (
    <group>
      {rows.map((row) => (
        <group key={row.y}>
          <mesh position={[0, row.y, z]} material={mats.band}>
            <boxGeometry args={[W + 0.004, row.h, 0.016]} />
          </mesh>
          <mesh position={[0, row.y, -z]} material={mats.band}>
            <boxGeometry args={[W + 0.004, row.h, 0.016]} />
          </mesh>
          <mesh position={[W / 2 + 0.006, row.y, 0]} material={mats.band}>
            <boxGeometry args={[0.012, row.h, D + 0.004]} />
          </mesh>
          <mesh position={[-W / 2 - 0.006, row.y, 0]} material={mats.band}>
            <boxGeometry args={[0.012, row.h, D + 0.004]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Slab({
  kind,
  state,
}: {
  kind: "outer" | "name" | "sensor";
  state: MachineState;
}) {
  const mats = getMats();
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const inner = kind !== "outer";

  useFrame(({ clock }) => {
    if (!led.current) return;
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * (state === "SPEAKING" ? 8 : 2)));
    const color =
      state === "ERROR"
        ? new THREE.Color("#8a5a3a")
        : state === "OFFLINE" || state === "STANDBY"
          ? new THREE.Color("#5a5a56")
          : new THREE.Color("#f0a028");
    led.current.color.lerp(color, 0.14);
    led.current.emissive.copy(led.current.color);
    led.current.emissiveIntensity = state === "OFFLINE" ? 0.08 : 0.5 + pulse * 0.65;
  });

  return (
    <group>
      <mesh material={inner ? mats.bodyInner : mats.bodyOuter}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.002]} material={mats.edge}>
        <boxGeometry args={[W * 0.965, H * 0.965, 0.008]} />
      </mesh>
      <Seams />
      {inner && <BlackBands />}
      {kind === "name" && (
        <>
          <NamePlate />
          <StatusScreen state={state} speaking={state === "SPEAKING"} />
          <AmberDots cols={2} rows={3} origin={[0.14, -0.08]} pitch={[0.1, 0.1]} />
        </>
      )}
      {kind === "sensor" && (
        <>
          <AmberDots cols={2} rows={3} origin={[-0.08, 0.42]} pitch={[0.12, 0.1]} />
          <AmberDots cols={2} rows={5} origin={[-0.08, -0.12]} pitch={[0.12, 0.1]} />
        </>
      )}
      <SidePorts legs={kind === "outer"} />
      <mesh position={[0, H / 2 - 0.07, D / 2 + 0.012]}>
        <boxGeometry args={[0.07, 0.04, 0.02]} />
        <meshStandardMaterial ref={led} color="#f0a028" emissive="#f0a028" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Halo({ state }: { state: MachineState }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const live = state === "SPEAKING" || state === "PROCESSING" || state === "LISTENING";
    const pulse = 0.32 + (live ? 0.16 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2)) : 0.04 * Math.sin(clock.elapsedTime * 0.8));
    mat.current.opacity = pulse;
  });
  return (
    <group position={[0, 0.04, -0.7]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.58, 0.01, 8, 48]} />
        <meshBasicMaterial ref={mat} color="#e8a040" transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.58, 0.03, 8, 48]} />
        <meshBasicMaterial color="#e8a040" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function TarsModel({
  state,
  reduced,
}: {
  state: MachineState;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const slabs = useRef<THREE.Group[]>([]);
  const target = useRef({
    lean: 0,
    yaw: 0,
    lift: 0,
    extra: 0,
    twist: [0, 0, 0, 0] as number[],
  });

  const innerHalf = W / 2 + INNER_GAP / 2;
  const outerX = innerHalf + W + HINGE_GAP;
  const restX = [-outerX, -innerHalf, innerHalf, outerX];
  const restZ = [-LEG, 0, 0, LEG];
  const kinds: Array<"outer" | "name" | "sensor"> = ["outer", "name", "sensor", "outer"];

  useFrame((ctx, dt) => {
    const g = root.current;
    if (!g) return;
    const t = ctx.clock.elapsedTime;
    const k = reduced ? 0.12 : 1;

    let lean = 0;
    let yaw = 0;
    let lift = 0;
    let extra = 0;
    const twist = [0, 0, 0, 0];

    if (state === "OFFLINE") {
      lean = 0.02;
      lift = -0.03;
    } else if (state === "BOOTING") {
      lean = Math.sin(t * 2) * 0.03;
      extra = 0.04;
    } else if (state === "IDLE") {
      lean = Math.sin(t * 0.5) * 0.014 * k;
      yaw = Math.sin(t * 0.3) * 0.025 * k;
      lift = Math.sin(t * 0.65) * 0.01 * k;
    } else if (state === "LISTENING") {
      lean = 0.08;
      extra = 0.02;
    } else if (state === "PROCESSING") {
      lean = Math.sin(t * 7) * 0.008;
      yaw = Math.sin(t * 5) * 0.012;
    } else if (state === "SPEAKING") {
      lean = Math.sin(t * 2.8) * 0.04;
      yaw = Math.sin(t * 1.9) * 0.05;
      extra = 0.035 + Math.sin(t * 3.4) * 0.01;
      twist[0] = Math.sin(t * 3.1) * 0.05;
      twist[3] = Math.sin(t * 2.8 + 1) * -0.05;
    } else if (state === "STANDBY") {
      lean = 0.03;
      lift = -0.025;
    } else if (state === "ERROR") {
      lean = 0.07;
      yaw = -0.1;
    }

    const damp = reduced ? 8 : 2.6;
    target.current.lean = THREE.MathUtils.damp(target.current.lean, lean, damp, dt);
    target.current.yaw = THREE.MathUtils.damp(target.current.yaw, yaw, damp, dt);
    target.current.lift = THREE.MathUtils.damp(target.current.lift, lift, damp, dt);
    target.current.extra = THREE.MathUtils.damp(target.current.extra, extra, damp, dt);
    for (let i = 0; i < 4; i++) {
      target.current.twist[i] = THREE.MathUtils.damp(target.current.twist[i], twist[i], damp, dt);
    }

    g.rotation.x = target.current.lean;
    g.rotation.y = target.current.yaw;
    g.position.y = target.current.lift;

    slabs.current.forEach((s, i) => {
      if (!s) return;
      const sign = i < 2 ? -1 : 1;
      s.position.x = restX[i] + sign * target.current.extra * (i === 0 || i === 3 ? 1 : 0.15);
      s.rotation.z = restZ[i] + target.current.twist[i];
    });
  });

  return (
    <group ref={root} position={[0, 0.02, 0]}>
      <Halo state={state} />
      {kinds.map((kind, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) slabs.current[i] = el;
          }}
          position={[restX[i], H / 2, 0]}
          rotation={[0, 0, restZ[i]]}
        >
          <group position={[0, -H / 2, 0]}>
            <Slab kind={kind} state={state} />
          </group>
        </group>
      ))}
    </group>
  );
}
