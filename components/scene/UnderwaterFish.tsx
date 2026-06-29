"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Phase, GameState } from "@/components/fishingTypes";

interface Props {
  phaseRef: React.MutableRefObject<Phase>;
  dangerRef: React.MutableRefObject<boolean>;
  gameStateRef: React.MutableRefObject<GameState>;
  bobberPosRef: React.MutableRefObject<THREE.Vector3>;
}

// Scale the fish body by forma
const FORMA_SCALE: Record<string, [number, number, number]> = {
  alargado: [1.8, 0.5, 0.6],
  torpedo:  [2.0, 0.65, 0.7],
  ovalado:  [1.3, 0.85, 0.9],
  robusto:  [1.4, 1.0, 1.0],
};

export default function UnderwaterFish({
  phaseRef,
  dangerRef,
  gameStateRef,
  bobberPosRef,
}: Props) {
  const bodyRef = useRef<THREE.Mesh>(null!);
  const finRef  = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const phase = phaseRef.current;
    const gs    = gameStateRef.current;
    const fish  = gs.fishOnHook;

    if (phase !== "fighting" || !fish) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const t      = clock.elapsedTime;
    const danger = dangerRef.current;
    const bp     = bobberPosRef.current;

    // Fish swims below the bobber
    const depth  = danger ? -0.8 - Math.sin(t * 5) * 0.4 : -0.5 - Math.sin(t * 2) * 0.15;
    const wrigX  = Math.sin(t * 3.2) * (danger ? 0.5 : 0.25);
    const wrigZ  = Math.cos(t * 2.8) * (danger ? 0.35 : 0.15);

    groupRef.current.position.set(bp.x + wrigX, bp.y + depth, bp.z + wrigZ);
    groupRef.current.rotation.y = Math.sin(t * 3) * 0.4 + Math.PI; // face away

    // Scale body
    if (bodyRef.current) {
      const forma  = fish.forma ?? "ovalado";
      const [sx, sy, sz] = FORMA_SCALE[forma] ?? FORMA_SCALE.ovalado;
      const base   = gs.fishSize * 0.28;
      bodyRef.current.scale.set(sx * base, sy * base, sz * base);
      (bodyRef.current.material as THREE.MeshStandardMaterial).color.set(fish.color);
    }
    if (finRef.current) {
      (finRef.current.material as THREE.MeshStandardMaterial).color.set(fish.color);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Body */}
      <mesh ref={bodyRef}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color="#888888"
          transparent
          opacity={0.72}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Dorsal fin */}
      <mesh ref={finRef} position={[0, 0.6, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.22, 0.55, 6]} />
        <meshStandardMaterial
          color="#888888"
          transparent
          opacity={0.65}
          roughness={0.5}
        />
      </mesh>

      {/* Tail fin */}
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.28, 0.5, 4]} />
        <meshStandardMaterial
          color="#888888"
          transparent
          opacity={0.6}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}
