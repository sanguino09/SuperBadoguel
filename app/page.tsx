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
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0c2342 0%, #1d3b6a 35%, #2d6a8d 65%, #5a9bb5 100%)",
        }}
      />

      <div className="absolute top-8 right-10 h-24 w-24 rounded-full bg-amber-200/80 blur-2xl sm:top-12 sm:right-16 sm:h-28 sm:w-28" />
      <div className="absolute top-12 right-14 h-12 w-12 rounded-full bg-amber-100 sm:top-16 sm:right-20 sm:h-16 sm:w-16" />

      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: "28vh" }}
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

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "16vh",
          background:
            "linear-gradient(180deg, rgba(20,40,60,0.4) 0%, #07182b 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-4xl flex-col items-center justify-center px-5 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-2 text-[10px] uppercase tracking-[0.25em] text-amber-200/80 sm:text-xs sm:tracking-[0.3em]"
        >
          Para Manuel · Feliz cumpleaños
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-display text-5xl font-bold leading-none text-shadow text-amber-50 sm:text-7xl"
        >
          Pesca Ibérica
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-5 max-w-xl text-sm leading-relaxed text-sky-100/80 sm:mt-6 sm:text-lg"
        >
          Tres pantanos de España. Tus cañas, tu paciencia y la suerte del río.
          Pesca, colecciona y vuelve por trofeos a{" "}
          <span className="text-amber-200">La Portiña</span>,{" "}
          <span className="text-amber-200">El Rosarito</span> y{" "}
          <span className="text-amber-200">El Cíjara</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-10 flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center"
        >
          <Link
            href="/escenarios"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-amber-300 px-8 py-4 text-base font-semibold text-stone-900 shadow-2xl shadow-amber-900/40 transition active:scale-95 sm:px-10 sm:text-lg"
            style={{ touchAction: "manipulation" }}
          >
            <span className="relative z-10">Empezar a pescar</span>
            <span className="absolute inset-0 shimmer opacity-50" />
          </Link>
          <Link
            href="/coleccion"
            className="rounded-full border border-sky-200/30 bg-white/5 px-6 py-3 text-sm text-sky-100 backdrop-blur transition active:scale-95 sm:px-8 sm:py-4 sm:text-base"
            style={{ touchAction: "manipulation" }}
          >
            Mi colección · {especiesDistintas}/{totalEspecies}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-10 grid w-full max-w-2xl grid-cols-3 gap-2 text-left sm:mt-16 sm:gap-3"
        >
          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="glass rounded-lg p-2.5 text-[11px] text-sky-100/80 sm:rounded-xl sm:p-3 sm:text-xs"
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
          className="mt-8 text-[10px] italic text-sky-200/40 sm:mt-10 sm:text-xs"
        >
          Hecho con cariño por tu hermano.
        </motion.div>
      </div>
    </main>
  );
}
