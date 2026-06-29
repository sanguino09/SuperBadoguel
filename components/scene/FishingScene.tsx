"use client";
import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Location } from "@/data/locations";
import type { Phase, GameState } from "@/components/fishingTypes";
import LakeEnvironment  from "./LakeEnvironment";
import FishermanRig     from "./FishermanRig";
import FishingLine      from "./FishingLine";
import UnderwaterFish   from "./UnderwaterFish";

// ── Camera helper ─────────────────────────────────────────────────────────────
function CameraSetup() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(3, 0, -2);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

// ── Main scene (inner — lives inside Canvas) ──────────────────────────────────
interface SceneProps {
  location: Location;
  phase: Phase;
  phaseRef: React.MutableRefObject<Phase>;
  dangerRef: React.MutableRefObject<boolean>;
  gameStateRef: React.MutableRefObject<GameState>;
  onCastLandRef: React.MutableRefObject<() => void>;
}

function Scene({
  location, phase, phaseRef, dangerRef, gameStateRef, onCastLandRef,
}: SceneProps) {
  // Bobber world position — shared between FishingLine (writer) and UnderwaterFish (reader)
  const bobberPosRef = useRef(new THREE.Vector3(0, 0, 0));

  return (
    <>
      <CameraSetup />
      <LakeEnvironment key={location.id} location={location} />
      <FishermanRig />
      <FishingLine
        phaseRef={phaseRef}
        dangerRef={dangerRef}
        gameStateRef={gameStateRef}
        onCastLandRef={onCastLandRef}
        bobberPosRef={bobberPosRef}
      />
      <UnderwaterFish
        phaseRef={phaseRef}
        dangerRef={dangerRef}
        gameStateRef={gameStateRef}
        bobberPosRef={bobberPosRef}
      />
    </>
  );
}

// ── Exported wrapper (Canvas lives here) ──────────────────────────────────────
export default function FishingScene(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 5, 14], fov: 55, near: 0.1, far: 200 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#1a3a5c" }}
      className="absolute inset-0 h-full w-full"
    >
      <Scene {...props} />
    </Canvas>
  );
}
