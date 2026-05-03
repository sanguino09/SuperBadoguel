"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocation } from "@/data/locations";
import FishingGame from "@/components/FishingGame";

export default function PescarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const location = getLocation(id);
  if (!location) notFound();

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <FishingGame location={location} />
      <Link
        href="/escenarios"
        className="absolute left-4 bottom-4 z-30 rounded-full bg-black/40 px-3 py-1 text-xs text-sky-100/80 backdrop-blur hover:bg-black/60"
      >
        ← Cambiar pantano
      </Link>
    </main>
  );
}
