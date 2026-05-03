"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSaveData } from "@/lib/storage";
import { LOCATIONS } from "@/data/locations";
import { FISH } from "@/data/fish";

export default function Home() {
  const { data, loaded } = useSaveData();
  const totalEspecies = Object.keys(FISH).length;
  const especiesDistintas = loaded
    ? new Set(data.catches.map((c) => c.fishId)).size
    : 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Cielo degradado */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0c2342 0%, #1d3b6a 35%, #2d6a8d 65%, #5a9bb5 100%)",
        }}
      />

      {/* Estrellas / sol del amanecer */}
      <div className="absolute top-12 right-16 h-28 w-28 rounded-full bg-amber-200/80 blur-2xl" />
      <div className="absolute top-16 right-20 h-16 w-16 rounded-full bg-amber-100" />

      {/* Siluetas de montañas */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: "32vh" }}
      >
        <path
          fill="#1a2a3a"
          d="M0,200 L160,140 L320,180 L480,90 L640,160 L800,110 L960,170 L1120,130 L1280,180 L1440,140 L1440,320 L0,320 Z"
        />
        <path
          fill="#0d1a2a"
          opacity="0.85"
          d="M0,260 L200,220 L380,250 L560,200 L760,240 L940,210 L1140,250 L1320,220 L1440,240 L1440,320 L0,320 Z"
        />
      </svg>

      {/* Agua reflectante */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "18vh",
          background:
            "linear-gradient(180deg, rgba(20,40,60,0.4) 0%, #07182b 100%)",
        }}
      />

      {/* Contenido */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-3 text-xs uppercase tracking-[0.3em] text-amber-200/80"
        >
          Para Manuel · Feliz cumpleaños
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-display text-6xl font-bold leading-none text-shadow text-amber-50 sm:text-7xl"
        >
          Pesca Ibérica
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-6 max-w-xl text-base leading-relaxed text-sky-100/80 sm:text-lg"
        >
          Tres pantanos de España. Tus cañas, tu paciencia y la suerte del río.
          Pesca, colecciona y vuelve por trofeos a{" "}
          <span className="text-amber-200">Las Portiñas</span>,{" "}
          <span className="text-amber-200">El Rosarito</span> y{" "}
          <span className="text-amber-200">El Cíjara</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/escenarios"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-amber-300 px-10 py-4 text-lg font-semibold text-stone-900 shadow-2xl shadow-amber-900/40 transition hover:scale-105 hover:bg-amber-200"
          >
            <span className="relative z-10">Empezar a pescar</span>
            <span className="absolute inset-0 shimmer opacity-50" />
          </Link>
          <Link
            href="/coleccion"
            className="rounded-full border border-sky-200/30 bg-white/5 px-8 py-4 text-base text-sky-100 backdrop-blur transition hover:bg-white/10"
          >
            Mi colección · {especiesDistintas}/{totalEspecies}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-3 text-left"
        >
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="glass rounded-xl p-3 text-xs text-sky-100/80"
            >
              <div className="font-semibold text-amber-100">{loc.nombre}</div>
              <div className="mt-1 opacity-70">{loc.region}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          className="mt-10 text-xs italic text-sky-200/40"
        >
          Hecho con cariño por tu hermano.
        </motion.div>
      </div>
    </main>
  );
}
