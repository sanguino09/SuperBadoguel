"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

type Phase =
  | "idle"
  | "casting"
  | "waiting"
  | "bite"
  | "fighting"
  | "lost"
  | "caught";

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

// Cuánto tarda en caer el pez (segundos manteniendo pulsado, sin tirones)
function reelTimeForRarity(r: Rarity): number {
  return { comun: 3.5, raro: 5, epico: 6.5, legendario: 8 }[r];
}

// Cada cuántos segundos (aprox) tira el pez
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [caught, setCaught] = useState<Caught | null>(null);
  const [progress, setProgress] = useState(0); // 0-100
  const [danger, setDanger] = useState(false); // ¡tira el pez!
  const [holding, setHolding] = useState(false);
  const [biteHint, setBiteHint] = useState<string>("");
  const [muted, setMuted] = useState(false);

  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const sound = useCallback(
    <T extends unknown[]>(fn: (...args: T) => void, ...args: T) => {
      if (!mutedRef.current) fn(...args);
    },
    []
  );

  const { addCatch, incCasts } = useSaveData();

  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const dangerRef = useRef(false);
  useEffect(() => {
    dangerRef.current = danger;
  }, [danger]);

  const holdingRef = useRef(false);
  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);

  const stateRef = useRef({
    t: 0,
    bobberX: 0,
    bobberY: 0,
    bobberTarget: { x: 0, y: 0 },
    bobberInWater: false,
    bobberPull: 0,
    ripples: [] as { x: number; y: number; r: number; o: number }[],
    fishOnHook: null as Fish | null,
    fishSize: 1,
  });

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const horizon = H * 0.42;
      const s = stateRef.current;
      s.t += dt;

      // Cielo
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGrad.addColorStop(0, location.skyTop);
      skyGrad.addColorStop(1, location.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizon);

      // Sol
      ctx.fillStyle = "rgba(255,236,196,0.85)";
      ctx.beginPath();
      ctx.arc(W * 0.78, horizon * 0.55, 26, 0, Math.PI * 2);
      ctx.fill();

      // Montañas lejanas
      ctx.fillStyle = location.silueta;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      const peaks = 8;
      for (let i = 0; i <= peaks; i++) {
        const x = (W / peaks) * i;
        const y = horizon - (Math.sin(i * 1.7) * 0.5 + 0.5) * 60 - 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Orilla
      ctx.fillStyle = location.silueta;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      for (let x = 0; x <= W; x += 18) {
        const y = horizon - (Math.sin(x * 0.04) * 0.5 + 0.5) * 22 - 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, horizon);
      ctx.closePath();
      ctx.fill();

      // Agua
      const waterGrad = ctx.createLinearGradient(0, horizon, 0, H);
      waterGrad.addColorStop(0, location.waterTop);
      waterGrad.addColorStop(1, location.waterBottom);
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizon, W, H - horizon);

      // Reflejos
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      const lines = Math.min(14, Math.floor((H - horizon) / 14));
      for (let i = 0; i < lines; i++) {
        const y = horizon + 6 + i * 12;
        ctx.beginPath();
        const offset = Math.sin(s.t * 1.2 + i) * 8;
        ctx.moveTo(20 + offset, y);
        ctx.lineTo(W - 20 + offset, y);
        ctx.stroke();
      }

      // Pescador silueta orilla izquierda
      const fishermanX = Math.max(40, W * 0.12);
      const fishermanY = horizon - 30;
      ctx.fillStyle = "#0a1418";
      ctx.fillRect(fishermanX - 5, fishermanY, 10, 30);
      ctx.beginPath();
      ctx.arc(fishermanX, fishermanY - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(fishermanX - 7, fishermanY - 12, 14, 3);
      ctx.fillRect(fishermanX - 9, fishermanY - 9, 6, 2);

      // Caña
      const rodTipX = fishermanX + Math.min(60, W * 0.15);
      const rodTipY = fishermanY - 70;
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fishermanX + 4, fishermanY - 4);
      ctx.lineTo(rodTipX, rodTipY);
      ctx.stroke();

      // Boya inicial sobre la caña
      if (phaseRef.current === "idle") {
        s.bobberX = rodTipX;
        s.bobberY = rodTipY;
      }

      // Trayectoria al lanzar
      if (phaseRef.current === "casting") {
        const tx = s.bobberTarget.x;
        const ty = s.bobberTarget.y;
        s.bobberX += (tx - s.bobberX) * Math.min(1, dt * 6);
        s.bobberY += (ty - s.bobberY) * Math.min(1, dt * 6);
        if (Math.abs(s.bobberX - tx) < 2 && Math.abs(s.bobberY - ty) < 2) {
          s.bobberInWater = true;
          s.ripples.push({ x: tx, y: ty, r: 4, o: 0.7 });
          if (!mutedRef.current) playSplash();
          setPhase("waiting");
        }
      }

      // Tirones de la boya
      const targetPull =
        phaseRef.current === "bite"
          ? 14 + Math.sin(s.t * 14) * 6
          : phaseRef.current === "fighting"
            ? dangerRef.current
              ? 18 + Math.sin(s.t * 22) * 10
              : 6 + Math.sin(s.t * 10) * 4
            : 0;
      s.bobberPull += (targetPull - s.bobberPull) * Math.min(1, dt * 8);

      // Sedal
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      const midX = (rodTipX + s.bobberX) / 2;
      const midY = Math.max(s.bobberY, rodTipY) - 10 + s.bobberPull * 0.5;
      ctx.quadraticCurveTo(midX, midY, s.bobberX, s.bobberY + s.bobberPull);
      ctx.stroke();

      // Boya
      const bx = s.bobberX;
      const by = s.bobberY + s.bobberPull;
      if (s.bobberInWater) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 8, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(bx, by - 3, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f5f1e3";
      ctx.beginPath();
      ctx.arc(bx, by - 3, 5, 0, Math.PI);
      ctx.fill();

      // Ondas
      s.ripples = s.ripples.filter((rp) => rp.o > 0.02);
      s.ripples.forEach((rp) => {
        rp.r += dt * 30;
        rp.o -= dt * 0.5;
        ctx.strokeStyle = `rgba(255,255,255,${rp.o})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y + 2, rp.r, rp.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Mancha del pez en pelea
      if (phaseRef.current === "fighting" && s.fishOnHook) {
        const fish = s.fishOnHook;
        const fx = bx + Math.sin(s.t * 3) * 22;
        const fy = by + 16 + Math.cos(s.t * 4) * 6;
        ctx.fillStyle = `${fish.color}cc`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 16 * s.fishSize, 6 * s.fishSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx + 14 * s.fishSize, fy);
        ctx.lineTo(fx + 24 * s.fishSize, fy - 6);
        ctx.lineTo(fx + 24 * s.fishSize, fy + 6);
        ctx.closePath();
        ctx.fill();
      }

      // Pequeñas ondas ambientales
      if (Math.random() < dt * 0.5) {
        s.ripples.push({
          x: W * (0.35 + Math.random() * 0.6),
          y: horizon + 20 + Math.random() * (H - horizon - 30),
          r: 2,
          o: 0.25,
        });
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [location]);

  // Bucle de pelea: progreso al recoger, peligro al tirar el pez
  useEffect(() => {
    if (phase !== "fighting") return;
    let raf = 0;
    let last = performance.now();
    let nextDanger = performance.now() + 1500 + Math.random() * 1500;
    let dangerUntil = 0;
    let nextReelTick = 0; // ms timestamp para el tick del carrete
    const fish = stateRef.current.fishOnHook;
    const reelTime = fish ? reelTimeForRarity(fish.rarity) : 4;
    const [pMin, pMax] = fish
      ? pullIntervalForRarity(fish.rarity)
      : [3, 5];

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Programar peligros (el pez tira)
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

      // Tick de carrete mientras se recoge
      if (holdingRef.current && !dangerRef.current && now > nextReelTick) {
        if (!mutedRef.current) playReelTick();
        nextReelTick = now + 120 + Math.random() * 40; // ~8 ticks/s con variación
      }

      setProgress((prev) => {
        let next = prev;
        const reelSpeed = 100 / reelTime; // % por segundo recogiendo bien
        if (holdingRef.current && !dangerRef.current) {
          next += reelSpeed * dt;
        } else if (holdingRef.current && dangerRef.current) {
          // Tira durante el peligro: pierde mucho progreso
          next -= 28 * dt;
        } else if (!holdingRef.current && !dangerRef.current) {
          // Sin recoger: pierde algo despacio
          next -= 4 * dt;
        }
        return Math.max(-15, Math.min(100, next));
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Detección de captura / pérdida
  useEffect(() => {
    if (phase !== "fighting") return;
    if (progress >= 100) {
      const fish = stateRef.current.fishOnHook;
      if (fish) {
        const pesoKg = rollPeso(fish);
        const c: Catch = {
          fishId: fish.id,
          locationId: location.id,
          pesoKg,
          fecha: Date.now(),
        };
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

  // Lanzar
  const cast = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const horizon = H * 0.42;
    const tx = W * (0.45 + Math.random() * 0.4);
    const ty = horizon + 30 + Math.random() * (H - horizon - 80);
    stateRef.current.bobberTarget = { x: tx, y: ty };
    stateRef.current.bobberInWater = false;
    stateRef.current.fishOnHook = null;
    setCaught(null);
    setBiteHint("");
    setProgress(0);
    setDanger(false);
    setHolding(false);
    sound(playCast);
    setPhase("casting");
    incCasts();
  }, [incCasts, sound]);

  // Esperar picada → mordida
  useEffect(() => {
    if (phase !== "waiting") return;
    const delay = 1200 + Math.random() * 3200;
    const id = setTimeout(() => {
      const fish = pickFish(location);
      stateRef.current.fishOnHook = fish;
      stateRef.current.fishSize = 0.7 + Math.random() * 0.7;
      if (!mutedRef.current) playBite();
      setBiteHint("¡PICA! Toca el botón");
      setPhase("bite");
    }, delay);
    return () => clearTimeout(id);
  }, [phase, location]);

  // Ventana amplia para clavar (3.5s) — mucho más perdonable
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

  const handleAction = () => {
    if (phase === "idle" || phase === "lost" || phase === "caught") {
      cast();
      return;
    }
    if (phase === "bite") {
      setProgress(0);
      setDanger(false);
      setPhase("fighting");
      setBiteHint("");
    }
  };

  const buttonLabel = (() => {
    switch (phase) {
      case "idle":
        return "LANZAR";
      case "casting":
        return "...";
      case "waiting":
        return "Esperando...";
      case "bite":
        return "¡CLAVAR!";
      case "fighting":
        return danger ? "¡SUELTA!" : holding ? "Recogiendo..." : "MANTÉN PULSADO";
      case "lost":
        return "Volver a lanzar";
      case "caught":
        return "Lanzar de nuevo";
    }
  })();

  return (
    <div className="relative h-full w-full select-none" style={{ touchAction: "none" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-label={`Escena de pesca en ${location.nombre}`}
      />

      {/* HUD superior */}
      <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
        <div className="glass rounded-xl px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-sky-200/60">
            Pantano
          </div>
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
          <a
            href="/coleccion"
            className="glass rounded-xl px-3 py-2 text-xs text-sky-100 hover:bg-white/10"
          >
            Colección
          </a>
        </div>
      </div>

      {/* Aviso superior */}
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

      {/* Botón principal — grande y pulsable, área generosa */}
      <div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={handleAction}
          onPointerDown={(e) => {
            e.preventDefault();
            if (phase === "fighting") setHolding(true);
          }}
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
              className={`glass w-full max-w-md rounded-2xl p-6 text-center ring-2 ${
                RARITY_META[caught.fish.rarity].ring
              }`}
            >
              <div
                className={`text-xs uppercase tracking-[0.3em] ${
                  RARITY_META[caught.fish.rarity].color
                }`}
              >
                {RARITY_META[caught.fish.rarity].label}
              </div>
              <FishSilhouette fish={caught.fish} />
              <h2 className="font-display text-2xl font-bold text-amber-100 sm:text-3xl">
                ¡{caught.fish.nombre}!
              </h2>
              <div className="mt-1 text-xs italic text-sky-100/60">
                {caught.fish.cientifico}
              </div>
              <div className="mt-3 inline-block rounded-full bg-black/30 px-4 py-1 text-amber-200">
                {caught.pesoKg} kg
              </div>
              <p className="mt-3 text-sm leading-relaxed text-sky-100/80">
                {caught.fish.descripcion}
              </p>
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

function FishSilhouette({ fish }: { fish: Fish }) {
  const w = 220;
  const h = 100;
  const cx = w / 2;
  const cy = h / 2 + 5;
  const ratios: Record<Fish["forma"], { rx: number; ry: number }> = {
    alargado: { rx: 70, ry: 16 },
    ovalado: { rx: 55, ry: 28 },
    torpedo: { rx: 75, ry: 22 },
    robusto: { rx: 60, ry: 32 },
  };
  const { rx, ry } = ratios[fish.forma];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto my-3 h-24 w-56" aria-hidden>
      <defs>
        <linearGradient id={`g-${fish.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fish.color} />
          <stop offset="100%" stopColor={fish.colorVientre} />
        </linearGradient>
      </defs>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#g-${fish.id})`}
        stroke="#0a0a0a"
        strokeOpacity="0.3"
      />
      <polygon
        points={`${cx + rx - 4},${cy} ${cx + rx + 22},${cy - ry} ${cx + rx + 18},${cy + ry}`}
        fill={fish.color}
        stroke="#0a0a0a"
        strokeOpacity="0.3"
      />
      <polygon
        points={`${cx - 12},${cy - ry + 2} ${cx + 4},${cy - ry - 14} ${cx + 22},${cy - ry + 2}`}
        fill={fish.color}
        opacity="0.85"
      />
      <circle cx={cx - rx + 14} cy={cy - 4} r={3.5} fill="#fff" />
      <circle cx={cx - rx + 14} cy={cy - 4} r={2} fill="#0a0a0a" />
      <path
        d={`M ${cx - rx + 24} ${cy - ry + 6} Q ${cx - rx + 30} ${cy} ${cx - rx + 24} ${cy + ry - 6}`}
        stroke="#0a0a0a"
        strokeOpacity="0.4"
        fill="none"
      />
    </svg>
  );
}
