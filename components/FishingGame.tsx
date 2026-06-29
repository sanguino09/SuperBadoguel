"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { type Location } from "@/data/locations";
import { FISH, RARITY_META, type Fish, type Rarity } from "@/data/fish";
import { useSaveData, type Catch } from "@/lib/storage";
import {
  playCast,
  playSplash,
  playBite,
  playReelTick,
  playDangerPulse,
  playCatch,
  playLost,
} from "@/lib/audio";
import type { Phase, GameState } from "./fishingTypes";

// WebGL requires client-only rendering
const FishingScene = dynamic(() => import("./scene/FishingScene"), { ssr: false });

interface Caught {
  fish: Fish;
  pesoKg: number;
}

function pickFish(loc: Location): Fish {
  const candidatos = loc.fishIds.map((id) => FISH[id]);
  const pesos = candidatos.map((f) => RARITY_META[f.rarity].weight);
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidatos.length; i++) {
    r -= pesos[i];
    if (r <= 0) return candidatos[i];
  }
  return candidatos[candidatos.length - 1];
}

function rollPeso(f: Fish) {
  const r = Math.random() ** 1.6;
  return +(f.pesoMin + (f.pesoMax - f.pesoMin) * r).toFixed(2);
}

function reelTimeForRarity(r: Rarity): number {
  return { comun: 3.5, raro: 5, epico: 6.5, legendario: 8 }[r];
}

const PULL_INTERVAL: Record<Rarity, [number, number]> = {
  comun: [3, 5],
  raro: [2.5, 4],
  epico: [2, 3.5],
  legendario: [1.8, 3],
};
function pullIntervalForRarity(r: Rarity): [number, number] {
  return PULL_INTERVAL[r];
}

export default function FishingGame({ location }: { location: Location }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [caught, setCaught] = useState<Caught | null>(null);
  const [progress, setProgress] = useState(0);
  const [danger, setDanger] = useState(false);
  const [holding, setHolding] = useState(false);
  const [biteHint, setBiteHint] = useState<string>("");
  const [muted, setMuted] = useState(false);

  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const sound = useCallback(
    <T extends unknown[]>(fn: (...args: T) => void, ...args: T) => {
      if (!mutedRef.current) fn(...args);
    },
    [],
  );

  const { addCatch, incCasts } = useSaveData();

  // Refs that 3D scene components read each frame (no stale-closure issues)
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const dangerRef = useRef(false);
  useEffect(() => { dangerRef.current = danger; }, [danger]);

  const holdingRef = useRef(false);
  useEffect(() => { holdingRef.current = holding; }, [holding]);

  // Game state consumed by 3D scene
  const stateRef = useRef<GameState>({
    bobberTarget:  { x: 2, y: 0, z: -4 },
    bobberInWater: false,
    fishOnHook:    null,
    fishSize:      1,
  });

  // Callback invoked by FishingLine when the cast arc reaches the water
  const onCastLandRef = useRef<() => void>(() => {});
  onCastLandRef.current = () => {
    stateRef.current.bobberInWater = true;
    sound(playSplash);
    setPhase("waiting");
  };

  // ── Fighting loop: reel progress ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "fighting") return;
    let raf = 0;
    let last = performance.now();
    let nextDanger = performance.now() + 1500 + Math.random() * 1500;
    let dangerUntil = 0;
    let nextReelTick = 0;
    const fish = stateRef.current.fishOnHook;
    const reelTime = fish ? reelTimeForRarity(fish.rarity) : 4;
    const [pMin, pMax] = fish ? pullIntervalForRarity(fish.rarity) : [3, 5];

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (now > nextDanger && !dangerRef.current) {
        const len = 900 + Math.random() * 600;
        dangerUntil = now + len;
        if (!mutedRef.current) playDangerPulse();
        setDanger(true);
      }
      if (dangerRef.current && now > dangerUntil) {
        setDanger(false);
        nextDanger = now + (pMin + Math.random() * (pMax - pMin)) * 1000;
      }

      if (holdingRef.current && !dangerRef.current && now > nextReelTick) {
        if (!mutedRef.current) playReelTick();
        nextReelTick = now + 120 + Math.random() * 40;
      }

      setProgress((prev) => {
        const reelSpeed = 100 / reelTime;
        let next = prev;
        if (holdingRef.current && !dangerRef.current)       next += reelSpeed * dt;
        else if (holdingRef.current && dangerRef.current)   next -= 28 * dt;
        else if (!holdingRef.current && !dangerRef.current) next -= 4 * dt;
        return Math.max(-15, Math.min(100, next));
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // ── Capture / loss detection ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "fighting") return;
    if (progress >= 100) {
      const fish = stateRef.current.fishOnHook;
      if (fish) {
        const pesoKg = rollPeso(fish);
        const c: Catch = { fishId: fish.id, locationId: location.id, pesoKg, fecha: Date.now() };
        addCatch(c);
        if (!mutedRef.current) playCatch(fish.rarity);
        setCaught({ fish, pesoKg });
        setPhase("caught");
        stateRef.current.fishOnHook = null;
        setDanger(false);
        setHolding(false);
      }
    } else if (progress <= -10) {
      if (!mutedRef.current) playLost();
      setPhase("lost");
      setBiteHint("Se escapó. ¡Vuelve a lanzar!");
      stateRef.current.fishOnHook = null;
      setDanger(false);
      setHolding(false);
    }
  }, [progress, phase, addCatch, location.id]);

  // ── Waiting → bite timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "waiting") return;
    const delay = 1200 + Math.random() * 3200;
    const id = setTimeout(() => {
      const fish = pickFish(location);
      stateRef.current.fishOnHook = fish;
      stateRef.current.fishSize   = 0.7 + Math.random() * 0.7;
      if (!mutedRef.current) playBite();
      setBiteHint("¡PICA! Toca el botón");
      setPhase("bite");
    }, delay);
    return () => clearTimeout(id);
  }, [phase, location]);

  // ── Bite timeout (3.5 s window) ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "bite") return;
    const t = setTimeout(() => {
      if (phaseRef.current === "bite") {
        setPhase("lost");
        setBiteHint("Se soltó la boya...");
        stateRef.current.fishOnHook = null;
      }
    }, 3500);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Cast ──────────────────────────────────────────────────────────────────
  const cast = useCallback(() => {
    stateRef.current.bobberTarget  = {
      x: Math.random() * 5,           // 0 – 5 world units right of centre
      y: 0,
      z: -3 - Math.random() * 9,      // 3 – 12 world units into the water
    };
    stateRef.current.bobberInWater = false;
    stateRef.current.fishOnHook    = null;
    setCaught(null);
    setBiteHint("");
    setProgress(0);
    setDanger(false);
    setHolding(false);
    sound(playCast);
    setPhase("casting");
    incCasts();
  }, [incCasts, sound]);

  // ── Main action handler ───────────────────────────────────────────────────
  const handleAction = () => {
    if (phase === "idle" || phase === "lost" || phase === "caught") { cast(); return; }
    if (phase === "bite") {
      setProgress(0);
      setDanger(false);
      setPhase("fighting");
      setBiteHint("");
    }
  };

  const buttonLabel = (() => {
    switch (phase) {
      case "idle":     return "LANZAR";
      case "casting":  return "...";
      case "waiting":  return "Esperando...";
      case "bite":     return "¡CLAVAR!";
      case "fighting": return danger ? "¡SUELTA!" : holding ? "Recogiendo..." : "MANTÉN PULSADO";
      case "lost":     return "Volver a lanzar";
      case "caught":   return "Lanzar de nuevo";
    }
  })();

  return (
    <div className="relative h-full w-full select-none" style={{ touchAction: "none" }}>
      {/* 3D Scene */}
      <FishingScene
        location={location}
        phase={phase}
        phaseRef={phaseRef}
        dangerRef={dangerRef}
        gameStateRef={stateRef}
        onCastLandRef={onCastLandRef}
      />

      {/* HUD superior */}
      <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
        <div className="glass rounded-xl px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-sky-200/60">Pantano</div>
          <div className="font-display text-base font-semibold text-amber-100 sm:text-lg">
            {location.nombre}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="glass rounded-xl px-3 py-2 text-xs text-sky-100 hover:bg-white/10"
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            style={{ touchAction: "manipulation" }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <a href="/coleccion" className="glass rounded-xl px-3 py-2 text-xs text-sky-100 hover:bg-white/10">
            Colección
          </a>
        </div>
      </div>

      {/* Aviso de picada */}
      <AnimatePresence>
        {biteHint && (
          <motion.div
            key={biteHint}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-[22%] z-10 -translate-x-1/2 px-4 text-center"
          >
            <div className="glass rounded-2xl px-5 py-3 text-amber-100 text-shadow">
              <div className="text-xl font-bold sm:text-2xl">{biteHint}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD pelea: barra de progreso */}
      {phase === "fighting" && (
        <div className="absolute left-1/2 top-20 z-10 w-[88%] max-w-sm -translate-x-1/2">
          <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wide text-sky-100/80">
            <span>Distancia al pez</span>
            <span>{Math.max(0, Math.round(progress))}%</span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-[width] duration-100"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <AnimatePresence>
            {danger && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-xl bg-red-600/85 px-3 py-2 text-center text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-red-900/40"
              >
                ¡El pez tira! Suelta el botón
              </motion.div>
            )}
          </AnimatePresence>
          {!danger && (
            <div className="mt-3 text-center text-xs text-sky-100/70">
              Mantén pulsado para recoger
            </div>
          )}
        </div>
      )}

      {/* Botón principal */}
      <div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={handleAction}
          onPointerDown={(e) => { e.preventDefault(); if (phase === "fighting") setHolding(true); }}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          disabled={phase === "casting" || phase === "waiting"}
          className={`select-none rounded-full px-12 py-6 text-lg font-bold uppercase tracking-wider shadow-2xl transition active:scale-95 ${
            phase === "bite"
              ? "animate-pulse bg-red-500 text-white scale-110"
              : phase === "fighting"
                ? danger
                  ? "bg-red-500 text-white animate-pulse"
                  : holding
                    ? "bg-emerald-400 text-stone-900 scale-105"
                    : "bg-amber-300 text-stone-900"
                : phase === "casting" || phase === "waiting"
                  ? "bg-stone-600 text-stone-300"
                  : "bg-amber-300 text-stone-900 hover:bg-amber-200"
          }`}
          style={{ touchAction: "manipulation", minWidth: "240px" }}
        >
          {buttonLabel}
        </button>
      </div>

      {/* Modal captura */}
      <AnimatePresence>
        {phase === "caught" && caught && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`glass w-full max-w-md rounded-2xl p-6 text-center ring-2 ${RARITY_META[caught.fish.rarity].ring}`}
            >
              <div className={`text-xs uppercase tracking-[0.3em] ${RARITY_META[caught.fish.rarity].color}`}>
                {RARITY_META[caught.fish.rarity].label}
              </div>
              <FishSilhouette fish={caught.fish} />
              <h2 className="font-display text-2xl font-bold text-amber-100 sm:text-3xl">
                ¡{caught.fish.nombre}!
              </h2>
              <div className="mt-1 text-xs italic text-sky-100/60">{caught.fish.cientifico}</div>
              <div className="mt-3 inline-block rounded-full bg-black/30 px-4 py-1 text-amber-200">
                {caught.pesoKg} kg
              </div>
              <p className="mt-3 text-sm leading-relaxed text-sky-100/80">{caught.fish.descripcion}</p>
              <button
                type="button"
                onClick={cast}
                className="mt-5 rounded-full bg-amber-300 px-6 py-3 text-sm font-bold uppercase tracking-wider text-stone-900 hover:bg-amber-200 active:scale-95"
                style={{ touchAction: "manipulation" }}
              >
                Otra captura
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Fish silhouette SVG (unchanged from original) ─────────────────────────────
function FishSilhouette({ fish }: { fish: Fish }) {
  const w = 220; const h = 100;
  const cx = w / 2; const cy = h / 2 + 5;
  const ratios: Record<Fish["forma"], { rx: number; ry: number }> = {
    alargado: { rx: 70, ry: 16 },
    ovalado:  { rx: 55, ry: 28 },
    torpedo:  { rx: 75, ry: 22 },
    robusto:  { rx: 60, ry: 32 },
  };
  const { rx, ry } = ratios[fish.forma];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto my-3 h-24 w-56" aria-hidden>
      <defs>
        <linearGradient id={`g-${fish.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fish.color} />
          <stop offset="100%" stopColor={fish.colorVientre} />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill={`url(#g-${fish.id})`} stroke="#0a0a0a" strokeOpacity="0.3" />
      <polygon
        points={`${cx+rx-4},${cy} ${cx+rx+22},${cy-ry} ${cx+rx+18},${cy+ry}`}
        fill={fish.color} stroke="#0a0a0a" strokeOpacity="0.3" />
      <polygon
        points={`${cx-12},${cy-ry+2} ${cx+4},${cy-ry-14} ${cx+22},${cy-ry+2}`}
        fill={fish.color} opacity="0.85" />
      <circle cx={cx-rx+14} cy={cy-4} r={3.5} fill="#fff" />
      <circle cx={cx-rx+14} cy={cy-4} r={2}   fill="#0a0a0a" />
      <path
        d={`M ${cx-rx+24} ${cy-ry+6} Q ${cx-rx+30} ${cy} ${cx-rx+24} ${cy+ry-6}`}
        stroke="#0a0a0a" strokeOpacity="0.4" fill="none" />
    </svg>
  );
}
