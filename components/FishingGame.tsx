"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Location } from "@/data/locations";
import { FISH, RARITY_META, type Fish, type Rarity } from "@/data/fish";
import { useSaveData, type Catch } from "@/lib/storage";

type Phase =
  | "idle" // listo para lanzar
  | "casting" // sedal viajando al agua
  | "waiting" // anzuelo en el agua, esperando picada
  | "bite" // ¡pica!  ventana para clavar
  | "fighting" // pelea
  | "lost" // se escapó
  | "caught"; // capturado

interface Caught {
  fish: Fish;
  pesoKg: number;
}

function pickFish(loc: Location): Fish {
  const candidatos = loc.fishIds.map((id) => FISH[id]);
  // Pesos por rareza
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
  const r = Math.random() ** 1.6; // sesgado a tallas pequeñas
  return +(f.pesoMin + (f.pesoMax - f.pesoMin) * r).toFixed(2);
}

function difficultyForRarity(r: Rarity): number {
  return { comun: 1, raro: 1.4, epico: 1.9, legendario: 2.6 }[r];
}

export default function FishingGame({ location }: { location: Location }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [caught, setCaught] = useState<Caught | null>(null);
  const [tension, setTension] = useState(50); // 0-100
  const [stamina, setStamina] = useState(100); // 0-100, fish stamina
  const [holding, setHolding] = useState(false);
  const [biteHint, setBiteHint] = useState<string>("");
  const { addCatch, incCasts } = useSaveData();

  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Elementos animados sobre el canvas
  const stateRef = useRef({
    t: 0,
    bobberX: 0,
    bobberY: 0,
    bobberTarget: { x: 0, y: 0 },
    bobberInWater: false,
    bobberPull: 0, // y offset cuando muerde
    ripples: [] as { x: number; y: number; r: number; o: number }[],
    fishOnHook: null as Fish | null,
    fishX: 0,
    fishY: 0,
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
      const dpr = window.devicePixelRatio || 1;
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

      // Sol / luna
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

      // Orilla / vegetación cercana
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

      // Reflejos sobre el agua
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const y = horizon + 6 + i * 12;
        ctx.beginPath();
        const offset = Math.sin(s.t * 1.2 + i) * 8;
        ctx.moveTo(20 + offset, y);
        ctx.lineTo(W - 20 + offset, y);
        ctx.stroke();
      }

      // Pescador (silueta) en orilla izquierda
      const fishermanX = W * 0.12;
      const fishermanY = horizon - 30;
      ctx.fillStyle = "#0a1418";
      // cuerpo
      ctx.fillRect(fishermanX - 5, fishermanY, 10, 30);
      // cabeza
      ctx.beginPath();
      ctx.arc(fishermanX, fishermanY - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      // gorra
      ctx.fillRect(fishermanX - 7, fishermanY - 12, 14, 3);
      ctx.fillRect(fishermanX - 9, fishermanY - 9, 6, 2);
      // caña
      const rodTipX = fishermanX + 60;
      const rodTipY = fishermanY - 70;
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fishermanX + 4, fishermanY - 4);
      ctx.lineTo(rodTipX, rodTipY);
      ctx.stroke();

      // Boya / sedal
      if (phaseRef.current === "idle") {
        s.bobberX = rodTipX;
        s.bobberY = rodTipY;
      }

      // Trayectoria de lanzamiento
      if (phaseRef.current === "casting") {
        const tx = s.bobberTarget.x;
        const ty = s.bobberTarget.y;
        s.bobberX += (tx - s.bobberX) * Math.min(1, dt * 6);
        s.bobberY += (ty - s.bobberY) * Math.min(1, dt * 6);
        if (
          Math.abs(s.bobberX - tx) < 2 &&
          Math.abs(s.bobberY - ty) < 2
        ) {
          s.bobberInWater = true;
          // splash
          s.ripples.push({ x: tx, y: ty, r: 4, o: 0.7 });
          setPhase("waiting");
        }
      }

      // Tirón al morder
      const targetPull =
        phaseRef.current === "bite"
          ? 12 + Math.sin(s.t * 14) * 6
          : phaseRef.current === "fighting"
            ? 8 + Math.sin(s.t * 18) * 10
            : 0;
      s.bobberPull += (targetPull - s.bobberPull) * Math.min(1, dt * 8);

      // Sedal: curva desde rodTip hasta boya
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
      // Sombra en el agua
      if (s.bobberInWater) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 8, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Boya rojo/blanco
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(bx, by - 3, 4, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f5f1e3";
      ctx.beginPath();
      ctx.arc(bx, by - 3, 4, 0, Math.PI);
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

      // Mancha del pez bajo el agua durante la pelea
      if (phaseRef.current === "fighting" && s.fishOnHook) {
        const fish = s.fishOnHook;
        const fx = bx + Math.sin(s.t * 3) * 22;
        const fy = by + 16 + Math.cos(s.t * 4) * 6;
        ctx.fillStyle = `${fish.color}cc`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 16 * s.fishSize, 6 * s.fishSize, 0, 0, Math.PI * 2);
        ctx.fill();
        // cola
        ctx.beginPath();
        ctx.moveTo(fx + 14 * s.fishSize, fy);
        ctx.lineTo(fx + 24 * s.fishSize, fy - 6);
        ctx.lineTo(fx + 24 * s.fishSize, fy + 6);
        ctx.closePath();
        ctx.fill();
      }

      // Generador de pequeñas ondas ambientales
      if (Math.random() < dt * 0.6) {
        s.ripples.push({
          x: W * (0.35 + Math.random() * 0.6),
          y: horizon + 20 + Math.random() * (H - horizon - 30),
          r: 2,
          o: 0.3,
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

  // Bucle de pelea (tensión / stamina)
  useEffect(() => {
    if (phase !== "fighting") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const fish = stateRef.current.fishOnHook;
      const diff = fish ? difficultyForRarity(fish.rarity) : 1;
      setTension((prev) => {
        const change = holding ? 35 * diff * dt : -45 * dt;
        return Math.max(0, Math.min(100, prev + change));
      });
      setStamina((prev) => {
        // Si la tensión está en zona buena (30-75) y holding => agota al pez
        // Si está en peligro (>90) => peligro
        // Si holding sin pez agitándose => sigue igual
        const tens = tensionRef.current;
        let drain = 0;
        if (holding && tens > 30 && tens < 78) drain = 22 * dt;
        else if (holding && tens >= 78) drain = 6 * dt;
        else drain = -3 * dt; // recupera si no tiras
        return Math.max(0, Math.min(100, prev - drain));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, holding]);

  const tensionRef = useRef(tension);
  useEffect(() => {
    tensionRef.current = tension;
  }, [tension]);

  // Detectar fin de pelea
  useEffect(() => {
    if (phase !== "fighting") return;
    if (tension <= 0) {
      setPhase("lost");
      setBiteHint("Se soltó el sedal...");
      stateRef.current.fishOnHook = null;
      return;
    }
    if (tension >= 100) {
      setPhase("lost");
      setBiteHint("¡Sedal roto! Demasiada tensión.");
      stateRef.current.fishOnHook = null;
      return;
    }
    if (stamina <= 0) {
      // Pez agotado, capturado
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
        setCaught({ fish, pesoKg });
        setPhase("caught");
        stateRef.current.fishOnHook = null;
      }
    }
  }, [tension, stamina, phase, addCatch, location.id]);

  // Lanzar
  const cast = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const horizon = H * 0.42;
    const tx = W * (0.45 + Math.random() * 0.4);
    const ty = horizon + 30 + Math.random() * (H - horizon - 60);
    stateRef.current.bobberTarget = { x: tx, y: ty };
    stateRef.current.bobberInWater = false;
    stateRef.current.fishOnHook = null;
    setCaught(null);
    setBiteHint("");
    setPhase("casting");
    incCasts();
  }, [incCasts]);

  // Esperar picada → mordida
  useEffect(() => {
    if (phase !== "waiting") return;
    const delay = 1500 + Math.random() * 4500;
    const id = setTimeout(() => {
      const fish = pickFish(location);
      stateRef.current.fishOnHook = fish;
      stateRef.current.fishSize = 0.7 + Math.random() * 0.7;
      setBiteHint("¡PICA! Toca para clavar");
      setPhase("bite");
      // Ventana de clavada
      const t2 = setTimeout(() => {
        if (phaseRef.current === "bite") {
          setPhase("lost");
          setBiteHint("Tarde... el pez se escapó.");
          stateRef.current.fishOnHook = null;
        }
      }, 1500);
      // Limpieza alternativa
      return () => clearTimeout(t2);
    }, delay);
    return () => clearTimeout(id);
  }, [phase, location]);

  // Click central
  const handleAction = () => {
    if (phase === "idle" || phase === "lost" || phase === "caught") {
      cast();
      return;
    }
    if (phase === "bite") {
      // Clavar y empezar pelea
      setTension(50);
      setStamina(100);
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
        return "Mantén pulsado";
      case "lost":
        return "Volver a lanzar";
      case "caught":
        return "Lanzar de nuevo";
    }
  })();

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-label={`Escena de pesca en ${location.nombre}`}
      />

      {/* HUD superior */}
      <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between">
        <div className="glass rounded-xl px-4 py-2">
          <div className="text-[10px] uppercase tracking-wider text-sky-200/60">
            Pantano
          </div>
          <div className="font-display text-lg font-semibold text-amber-100">
            {location.nombre}
          </div>
        </div>
        <a
          href="/coleccion"
          className="glass rounded-xl px-3 py-2 text-xs text-sky-100 hover:bg-white/10"
          aria-label="Ver colección"
        >
          Colección
        </a>
      </div>

      {/* Aviso de mordida */}
      <AnimatePresence>
        {biteHint && (
          <motion.div
            key={biteHint}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-1/4 z-10 -translate-x-1/2 text-center"
          >
            <div className="glass rounded-2xl px-5 py-3 text-amber-100 text-shadow">
              <div className="text-xl font-bold">{biteHint}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pelea HUD */}
      {phase === "fighting" && (
        <div className="absolute left-1/2 top-20 z-10 w-72 -translate-x-1/2">
          <div className="mb-2 flex justify-between text-[10px] uppercase tracking-wide text-sky-100/80">
            <span>Tensión</span>
            <span>Sedal</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-black/40">
            {/* Zona segura */}
            <div className="absolute left-[30%] right-[22%] top-0 h-full bg-emerald-400/20" />
            {/* Zona peligro */}
            <div className="absolute right-0 top-0 h-full w-[10%] bg-red-500/30" />
            <div
              className={`h-full transition-all ${
                tension > 88
                  ? "bg-red-500"
                  : tension < 12
                    ? "bg-orange-400"
                    : "bg-emerald-400"
              }`}
              style={{ width: `${tension}%` }}
            />
          </div>
          <div className="mt-3 mb-1 flex justify-between text-[10px] uppercase tracking-wide text-sky-100/80">
            <span>Resistencia del pez</span>
            <span>{Math.round(stamina)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full bg-amber-300 transition-all"
              style={{ width: `${stamina}%` }}
            />
          </div>
        </div>
      )}

      {/* Botón principal */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <button
          type="button"
          onClick={handleAction}
          onPointerDown={() => phase === "fighting" && setHolding(true)}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          disabled={phase === "casting" || phase === "waiting"}
          className={`select-none rounded-full px-10 py-5 text-base font-bold uppercase tracking-wider shadow-2xl transition active:scale-95 ${
            phase === "bite"
              ? "animate-pulse bg-red-500 text-white"
              : phase === "fighting"
                ? holding
                  ? "bg-amber-400 text-stone-900 scale-105"
                  : "bg-amber-300 text-stone-900"
                : phase === "casting" || phase === "waiting"
                  ? "bg-stone-600 text-stone-300"
                  : "bg-amber-300 text-stone-900 hover:bg-amber-200"
          }`}
        >
          {buttonLabel}
        </button>
        {phase === "fighting" && (
          <div className="mt-3 text-center text-xs text-sky-100/70">
            Suelta cuando la tensión esté alta · pulsa cuando baje
          </div>
        )}
      </div>

      {/* Modal captura */}
      <AnimatePresence>
        {phase === "caught" && caught && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`glass max-w-md rounded-2xl p-7 text-center ring-2 ${
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
              <h2 className="font-display text-3xl font-bold text-amber-100">
                ¡{caught.fish.nombre}!
              </h2>
              <div className="mt-1 text-xs italic text-sky-100/60">
                {caught.fish.cientifico}
              </div>
              <div className="mt-4 inline-block rounded-full bg-black/30 px-4 py-1 text-amber-200">
                {caught.pesoKg} kg
              </div>
              <p className="mt-4 text-sm leading-relaxed text-sky-100/80">
                {caught.fish.descripcion}
              </p>
              <button
                type="button"
                onClick={cast}
                className="mt-6 rounded-full bg-amber-300 px-6 py-3 text-sm font-bold uppercase tracking-wider text-stone-900 hover:bg-amber-200"
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
  // Pequeño SVG basado en la forma
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
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mx-auto my-3 h-24 w-56"
      aria-hidden
    >
      <defs>
        <linearGradient id={`g-${fish.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fish.color} />
          <stop offset="100%" stopColor={fish.colorVientre} />
        </linearGradient>
      </defs>
      {/* Cuerpo */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`url(#g-${fish.id})`}
        stroke="#0a0a0a"
        strokeOpacity="0.3"
      />
      {/* Cola */}
      <polygon
        points={`${cx + rx - 4},${cy} ${cx + rx + 22},${cy - ry} ${cx + rx + 18},${cy + ry}`}
        fill={fish.color}
        stroke="#0a0a0a"
        strokeOpacity="0.3"
      />
      {/* Aleta dorsal */}
      <polygon
        points={`${cx - 12},${cy - ry + 2} ${cx + 4},${cy - ry - 14} ${cx + 22},${cy - ry + 2}`}
        fill={fish.color}
        opacity="0.85"
      />
      {/* Ojo */}
      <circle cx={cx - rx + 14} cy={cy - 4} r={3.5} fill="#fff" />
      <circle cx={cx - rx + 14} cy={cy - 4} r={2} fill="#0a0a0a" />
      {/* Branquia */}
      <path
        d={`M ${cx - rx + 24} ${cy - ry + 6} Q ${cx - rx + 30} ${cy} ${cx - rx + 24} ${cy + ry - 6}`}
        stroke="#0a0a0a"
        strokeOpacity="0.4"
        fill="none"
      />
    </svg>
  );
}
