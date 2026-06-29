"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import type { Location } from "@/data/locations";

interface SkyConfig {
  sunPosition: [number, number, number];
  turbidity: number;
  rayleigh: number;
  lightColor: string;
  ambientColor: string;
}

const SKY_CONFIGS: Record<string, SkyConfig> = {
  portina:  {
    sunPosition: [1, 0.15, -1],  turbidity: 1.5, rayleigh: 4.5,
    lightColor: "#ffcc80", ambientColor: "#ffe0b0",   // warm golden dawn
  },
  rosarito: {
    sunPosition: [0, 1, -0.5],   turbidity: 2.0, rayleigh: 1.8,
    lightColor: "#fff8f0", ambientColor: "#d0e8ff",   // bright midday
  },
  cijara:   {
    sunPosition: [-1, 0.05, -1], turbidity: 5.0, rayleigh: 3.0,
    lightColor: "#ff8844", ambientColor: "#c090a0",   // red/purple dusk
  },
};

export default function LakeEnvironment({ location }: { location: Location }) {
  const waterRef = useRef<THREE.Mesh>(null!);
  const skyConfig: SkyConfig = SKY_CONFIGS[location.id] ?? SKY_CONFIGS.rosarito;

  const waterColor  = useMemo(() => new THREE.Color(location.waterTop),    [location]);
  const waterColor2 = useMemo(() => new THREE.Color(location.waterBottom), [location]);
  const groundColor = useMemo(() => new THREE.Color(location.silueta),     [location]);

  const mountainGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 80; const n = 12;
    shape.moveTo(-w / 2, 0);
    for (let i = 0; i <= n; i++)
      shape.lineTo((w / n) * i - w / 2, (Math.sin(i * 1.7) * 0.5 + 0.5) * 5 + 1.5);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  const mountain2Geom = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 100; const n = 10;
    shape.moveTo(-w / 2, 0);
    for (let i = 0; i <= n; i++)
      shape.lineTo((w / n) * i - w / 2, (Math.sin(i * 2.3 + 1.2) * 0.5 + 0.5) * 7 + 2);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame(({ clock }) => {
    if (!waterRef.current) return;
    const mat = waterRef.current.material as THREE.MeshStandardMaterial;
    mat.roughness = 0.06 + Math.sin(clock.elapsedTime * 0.4) * 0.03;
  });

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={skyConfig.sunPosition}
        turbidity={skyConfig.turbidity}
        rayleigh={skyConfig.rayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <fog attach="fog" args={[location.waterBottom, 40, 100]} />

      <ambientLight intensity={0.55} color={skyConfig.ambientColor} />
      <directionalLight
        position={[skyConfig.sunPosition[0] * 30, 20, skyConfig.sunPosition[2] * 10]}
        intensity={2.0}
        color={skyConfig.lightColor}
        castShadow
      />
      {/* @ts-ignore */}
      <hemisphereLight args={["#87ceeb", "#4a6040", 0.3]} />

      {/* Water surface */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.06}
          metalness={0.28}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Depth layer for color gradient effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={waterColor2} transparent opacity={0.55} />
      </mesh>

      {/* Distant mountains (behind) */}
      <mesh geometry={mountain2Geom} position={[0, -0.1, -26]}>
        <meshStandardMaterial
          color={groundColor}
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Nearer mountains (in front) */}
      <mesh geometry={mountainGeom} position={[0, -0.1, -16]}>
        <meshStandardMaterial
          color={groundColor}
          transparent
          opacity={0.62}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shore / dock ground behind fisherman */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 9]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>
    </>
  );
}
