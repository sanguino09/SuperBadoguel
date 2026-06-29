"use client";
import * as THREE from "three";
import { Line } from "@react-three/drei";

// Rod tip in world space — shared with FishingLine
export const ROD_TIP_WORLD = new THREE.Vector3(-1.0, 3.8, 5.5);

const DARK = "#0a1418";

export default function FishermanRig() {
  return (
    // Fisherman base at world [-2, 0, 7]
    <group position={[-2, 0, 7]} castShadow>
      {/* Legs */}
      <mesh position={[-0.1, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.8, 6]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[0.1, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.8, 6]} />
        <meshStandardMaterial color={DARK} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.9, 8]} />
        <meshStandardMaterial color={DARK} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={DARK} />
      </mesh>

      {/* Hat brim */}
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 10]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>

      {/* Hat crown */}
      <mesh position={[0, 2.16, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 0.36, 8]} />
        <meshStandardMaterial color="#1a0e08" />
      </mesh>

      {/* Arm holding rod */}
      <mesh position={[0.38, 1.25, -0.1]} rotation={[0.3, 0, 0.5]}>
        <cylinderGeometry args={[0.07, 0.08, 0.48, 6]} />
        <meshStandardMaterial color={DARK} />
      </mesh>

      {/* Fishing rod: local [0.5, 1.15, -0.15] → world [-1.5, 1.15, 6.85]
          to local [1.0, 3.8, -1.5] → world [-1.0, 3.8, 5.5] = ROD_TIP_WORLD */}
      <Line
        points={[[0.5, 1.15, -0.15], [1.0, 3.8, -1.5]]}
        lineWidth={3}
        color="#3a1a05"
      />
    </group>
  );
}
