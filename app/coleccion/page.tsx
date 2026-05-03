"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { FISH, RARITY_META } from "@/data/fish";
import { LOCATIONS, getLocation } from "@/data/locations";
import { useSaveData } from "@/lib/storage";

export default function ColeccionPage() {
  const { data, loaded, reset } = useSaveData();

  const stats = useMemo(() => {
    const porId = new Map<string, { count: number; max: number }>();
    for (const c of data.catches) {
      const cur = porId.get(c.fishId) ?? { count: 0, max: 0 };
      cur.count += 1;
      cur.max = Math.max(cur.max, c.pesoKg);
      porId.set(c.fishId, cur);
    }
    return porId;
  }, [data.catches]);

  const totalEspecies = Object.keys(FISH).length;
  const especiesDistintas = stats.size;
  const totalCapturas = data.catches.length;
  const pesoTotal = data.catches.reduce((acc, c) => acc + c.pesoKg, 0);

  return (
    <main className="min-h-[100dvh] bg-[#07182b] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <Link
            href="/"
            className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-sky-200/70 hover:text-sky-100"
            style={{ touchAction: "manipulation" }}
          >
            ← Inicio
          </Link>
          <Link
            href="/escenarios"
            className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-amber-200/80 hover:text-amber-100"
            style={{ touchAction: "manipulation" }}
          >
            Pescar →
          </Link>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-amber-50 sm:text-5xl"
        >
          Tu colección
        </motion.h1>
        <p className="mt-2 text-sm text-sky-200/70 sm:text-base">
          Cada pez encontrado queda registrado aquí, con su mejor talla.
        </p>

        {/* Estadísticas */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-4 sm:gap-3">
          <Stat label="Especies" value={`${especiesDistintas}/${totalEspecies}`} />
          <Stat label="Capturas" value={String(totalCapturas)} />
          <Stat label="Lanzamientos" value={String(data.totalCasts)} />
          <Stat label="Peso total" value={`${pesoTotal.toFixed(1)} kg`} />
        </div>

        {/* Por escenario */}
        {LOCATIONS.map((loc) => (
          <section key={loc.id} className="mt-10 sm:mt-12">
            <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="font-display text-xl font-semibold text-amber-100 sm:text-2xl">
                {loc.nombre}
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-sky-200/50 sm:text-xs">
                {loc.region}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {loc.fishIds.map((fid) => {
                const fish = FISH[fid];
                const meta = RARITY_META[fish.rarity];
                const stat = stats.get(fid);
                const found = !!stat && loaded;
                return (
                  <motion.div
                    key={`${loc.id}-${fid}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`relative overflow-hidden rounded-xl p-4 ring-1 ${
                      found
                        ? `bg-[#0c2238] ${meta.ring}`
                        : "bg-black/30 ring-white/5"
                    }`}
                  >
                    {/* Silueta del pez */}
                    <div className="mb-2 flex h-20 items-center justify-center">
                      <FishMini
                        color={found ? fish.color : "#1a2c3c"}
                        belly={found ? fish.colorVientre : "#0e1822"}
                        size={fish.forma}
                        revealed={found}
                      />
                    </div>
                    <div
                      className={`text-[10px] uppercase tracking-wider ${
                        found ? meta.color : "text-stone-500"
                      }`}
                    >
                      {meta.label}
                    </div>
                    <div
                      className={`font-semibold ${
                        found ? "text-amber-50" : "text-stone-500"
                      }`}
                    >
                      {found ? fish.nombre : "???"}
                    </div>
                    {found && (
                      <>
                        <div className="text-xs italic text-sky-200/50">
                          {fish.cientifico}
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-sky-100/70">
                          <span>×{stat!.count}</span>
                          <span className="text-amber-200">
                            mejor: {stat!.max.toFixed(2)} kg
                          </span>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Últimas capturas */}
        {loaded && data.catches.length > 0 && (
          <section className="mt-12 sm:mt-14">
            <h2 className="mb-3 font-display text-xl font-semibold text-amber-100 sm:text-2xl">
              Últimas capturas
            </h2>
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:overflow-hidden sm:rounded-xl sm:ring-1 sm:ring-white/10">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-sky-200/60">
                  <tr>
                    <th className="px-4 py-2">Pez</th>
                    <th className="px-4 py-2">Pantano</th>
                    <th className="px-4 py-2 text-right">Peso</th>
                    <th className="px-4 py-2 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.catches]
                    .reverse()
                    .slice(0, 12)
                    .map((c, i) => {
                      const f = FISH[c.fishId];
                      const l = getLocation(c.locationId);
                      const meta = RARITY_META[f.rarity];
                      return (
                        <tr
                          key={`${c.fecha}-${i}`}
                          className="border-t border-white/5 text-sky-100/85"
                        >
                          <td className={`px-4 py-2 ${meta.color}`}>
                            {f.nombre}
                          </td>
                          <td className="px-4 py-2">{l?.nombre ?? "—"}</td>
                          <td className="px-4 py-2 text-right text-amber-200">
                            {c.pesoKg.toFixed(2)} kg
                          </td>
                          <td className="px-4 py-2 text-right text-sky-200/50">
                            {new Date(c.fecha).toLocaleDateString("es-ES")}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-3 text-xs text-sky-200/40 sm:mt-14 sm:flex-row sm:items-center">
          <span>Hecho para Manuel · {data.jugador && data.jugador !== "Manuel" ? `Jugador: ${data.jugador}` : ""}</span>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "¿Seguro? Esto borra toda tu colección y no se puede deshacer."
                )
              )
                reset();
            }}
            className="text-sky-200/40 underline-offset-2 hover:text-red-300 hover:underline"
          >
            Reiniciar progreso
          </button>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wide text-sky-200/60">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-amber-100">{value}</div>
    </div>
  );
}

function FishMini({
  color,
  belly,
  size,
  revealed,
}: {
  color: string;
  belly: string;
  size: "alargado" | "ovalado" | "torpedo" | "robusto";
  revealed: boolean;
}) {
  const ratios = {
    alargado: { rx: 38, ry: 9 },
    ovalado: { rx: 30, ry: 16 },
    torpedo: { rx: 40, ry: 12 },
    robusto: { rx: 32, ry: 18 },
  } as const;
  const { rx, ry } = ratios[size];
  const id = `${color}-${size}`;
  return (
    <svg viewBox="0 0 120 60" className="h-full w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={belly} />
        </linearGradient>
      </defs>
      <ellipse
        cx="55"
        cy="32"
        rx={rx}
        ry={ry}
        fill={`url(#${id})`}
        opacity={revealed ? 1 : 0.6}
      />
      <polygon
        points={`${55 + rx - 4},32 ${55 + rx + 14},${32 - ry} ${55 + rx + 12},${32 + ry}`}
        fill={color}
        opacity={revealed ? 1 : 0.6}
      />
      {revealed && (
        <>
          <circle cx={55 - rx + 8} cy="29" r="2" fill="#fff" />
          <circle cx={55 - rx + 8} cy="29" r="1.1" fill="#0a0a0a" />
        </>
      )}
    </svg>
  );
}
