"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Phase, GameState } from "@/components/fishingTypes";
import { ROD_TIP_WORLD } from "./FishermanRig";

interface Props {
  phaseRef: React.MutableRefObject<Phase>;
  dangerRef: React.MutableRefObject<boolean>;
  gameStateRef: React.MutableRefObject<GameState>;
  onCastLandRef: React.MutableRefObject<() => void>;
  bobberPosRef: React.MutableRefObject<THREE.Vector3>;
}

// Reusable vectors allocated once to avoid GC pressure
const _target  = new THREE.Vector3();
const _mid     = new THREE.Vector3();
const _start   = new THREE.Vector3();

export default function FishingLine({
  phaseRef,
  dangerRef,
  gameStateRef,
  onCastLandRef,
  bobberPosRef,
}: Props) {
  const bobberGroupRef = useRef<THREE.Group>(null!);
  const rippleRef      = useRef<THREE.Mesh>(null!);

  // Cast animation state
  const castProgressRef = useRef(0);
  const castStartRef    = useRef(new THREE.Vector3(ROD_TIP_WORLD.x, ROD_TIP_WORLD.y, ROD_TIP_WORLD.z));
  const prevPhaseRef    = useRef<Phase>("idle");
  const didLandRef      = useRef(false);

  // Ripple animation state
  const rippleStateRef = useRef({ active: false, scale: 0.1, opacity: 0 });

  // THREE.Line built once, geometry updated every frame
  const sedalLine = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const arr  = new Float32Array(9); // 3 points × 3 coords
    geom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat  = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    return line;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!bobberGroupRef.current) return;

    const phase  = phaseRef.current;
    const danger = dangerRef.current;
    const gs     = gameStateRef.current;
    const t      = clock.elapsedTime;
    const pos    = bobberGroupRef.current.position;

    _target.set(gs.bobberTarget.x, gs.bobberTarget.y, gs.bobberTarget.z);

    // ── Phase transition detection ──────────────────────────────────────────
    if (prevPhaseRef.current !== phase) {
      if (phase === "casting") {
        castStartRef.current.copy(pos);
        castProgressRef.current = 0;
        didLandRef.current = false;
      }
      if (phase === "idle" || phase === "lost" || phase === "caught") {
        rippleStateRef.current.active = false;
      }
      prevPhaseRef.current = phase;
    }

    // ── Bobber position animation ───────────────────────────────────────────
    if (phase === "idle" || phase === "lost" || phase === "caught") {
      pos.lerp(ROD_TIP_WORLD, Math.min(1, delta * 10));
    } else if (phase === "casting") {
      castProgressRef.current = Math.min(1, castProgressRef.current + delta * 1.8);
      const cp = castProgressRef.current;

      _start.copy(castStartRef.current);
      pos.x = _start.x + (_target.x - _start.x) * cp;
      pos.z = _start.z + (_target.z - _start.z) * cp;
      // Parabolic arc
      pos.y = _start.y * (1 - cp) + _target.y * cp + Math.sin(Math.PI * cp) * 3.5;

      // Detect landing
      if (cp >= 0.97 && !didLandRef.current) {
        didLandRef.current = true;
        rippleStateRef.current = { active: true, scale: 0.1, opacity: 0.85 };
        onCastLandRef.current();
      }
    } else if (phase === "waiting") {
      pos.x += (_target.x - pos.x) * Math.min(1, delta * 6);
      pos.z += (_target.z - pos.z) * Math.min(1, delta * 6);
      pos.y = 0.06 + Math.sin(t * 1.3) * 0.04;
    } else if (phase === "bite") {
      pos.x = _target.x;
      pos.z = _target.z;
      pos.y = 0.06 + Math.sin(t * 14) * 0.16 - 0.12;
    } else if (phase === "fighting") {
      pos.x = _target.x + Math.sin(t * 2.2) * 0.12;
      pos.z = _target.z + Math.cos(t * 1.8) * 0.07;
      pos.y = danger
        ? -0.08 + Math.sin(t * 8) * 0.14
        :  0.04 + Math.sin(t * 3) * 0.05;
    }

    // Share bobber world position
    bobberPosRef.current.copy(pos);

    // ── Fishing line geometry update ────────────────────────────────────────
    _mid.set(
      (ROD_TIP_WORLD.x + pos.x) / 2,
      Math.min(ROD_TIP_WORLD.y, pos.y) - 0.6 + Math.abs(pos.y - ROD_TIP_WORLD.y) * 0.15,
      (ROD_TIP_WORLD.z + pos.z) / 2,
    );

    const attr = sedalLine.geometry.attributes.position as THREE.BufferAttribute;
    attr.setXYZ(0, ROD_TIP_WORLD.x, ROD_TIP_WORLD.y, ROD_TIP_WORLD.z);
    attr.setXYZ(1, _mid.x, _mid.y, _mid.z);
    attr.setXYZ(2, pos.x, pos.y, pos.z);
    attr.needsUpdate = true;

    // ── Ripple animation ────────────────────────────────────────────────────
    const rs = rippleStateRef.current;
    if (rs.active && rippleRef.current) {
      rs.scale   += delta * 4;
      rs.opacity -= delta * 1.8;
      if (rs.opacity <= 0) { rs.active = false; rs.opacity = 0; }
      rippleRef.current.scale.setScalar(rs.scale);
      rippleRef.current.position.set(_target.x, 0.01, _target.z);
      rippleRef.current.visible = rs.active;
      (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, rs.opacity);
    } else if (rippleRef.current) {
      rippleRef.current.visible = false;
    }
  });

  return (
    <>
      {/* Fishing line */}
      <primitive object={sedalLine} />

      {/* Bobber */}
      <group ref={bobberGroupRef} position={[ROD_TIP_WORLD.x, ROD_TIP_WORLD.y, ROD_TIP_WORLD.z]}>
        {/* Top hemisphere — red */}
        <mesh>
          <sphereGeometry args={[0.18, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e74c3c" roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Bottom hemisphere — white/cream */}
        <mesh>
          <sphereGeometry args={[0.18, 14, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#f5f1e3" roughness={0.4} metalness={0.1} />
        </mesh>
      </group>

      {/* Water ripple ring on landing */}
      <mesh
        ref={rippleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.6, 0.9, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
