"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LOCATIONS } from "@/data/locations";
import { FISH, RARITY_META } from "@/data/fish";
import { useSaveData } from "@/lib/storage";

export default function EscenariosPage() {
  const { data, loaded } = useSaveData();

  return (
    <main className="min-h-screen bg-[#07182b] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-sky-200/70 hover:text-sky-100"
          >
            ← Volver
          </Link>
          <Link
            href="/coleccion"
            className="text-sm text-amber-200/80 hover:text-amber-100"
          >
            Colección
          </Link>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl font-bold text-amber-50 sm:text-5xl"
        >
          Elige tu pantano
        </motion.h1>
        <p className="mt-2 text-sky-200/70">
          Cada lugar tiene sus propias especies y su propio carácter.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATIONS.map((loc, i) => {
            const especies = loc.fishIds.map((id) => FISH[id]);
            const capturadas = loaded
              ? new Set(
                  data.catches
                    .filter((c) => c.locationId === loc.id)
                    .map((c) => c.fishId)
                ).size
              : 0;

            return (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
              >
                <Link
                  href={`/pescar/${loc.id}`}
                  className="group relative block overflow-hidden rounded-2xl ring-1 ring-white/10 transition hover:ring-amber-300/60"
                >
                  {/* Postal del lugar */}
                  <div
                    className="h-44 w-full"
                    style={{
                      background: `linear-gradient(180deg, ${loc.skyTop} 0%, ${loc.skyBottom} 50%, ${loc.waterTop} 50%, ${loc.waterBottom} 100%)`,
                    }}
                  >
                    <svg
                      viewBox="0 0 400 100"
                      className="h-1/2 w-full"
                      preserveAspectRatio="none"
                      style={{ marginTop: "20%" }}
                    >
                      <path
                        d="M0,60 L50,40 L100,55 L160,30 L220,50 L280,35 L340,55 L400,40 L400,100 L0,100 Z"
                        fill={loc.silueta}
                      />
                    </svg>
                  </div>

                  <div className="bg-[#0c2238] p-5">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-display text-2xl font-semibold text-amber-100">
                        {loc.nombre}
                      </h2>
                      <span className="text-xs text-sky-200/60">
                        {capturadas}/{especies.length}
                      </span>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-sky-200/50">
                      {loc.region}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-sky-100/80">
                      {loc.descripcion}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {especies.map((f) => (
                        <span
                          key={f.id}
                          className={`rounded-full bg-white/5 px-2 py-0.5 text-[10px] ring-1 ${RARITY_META[f.rarity].ring} ${RARITY_META[f.rarity].color}`}
                        >
                          {f.nombre}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 inline-flex items-center text-sm font-semibold text-amber-300 transition group-hover:translate-x-1">
                      Ir a pescar →
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
