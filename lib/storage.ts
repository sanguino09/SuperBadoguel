"use client";

import { useEffect, useState, useCallback } from "react";

export interface Catch {
  fishId: string;
  locationId: string;
  pesoKg: number;
  fecha: number; // timestamp
}

export interface SaveData {
  catches: Catch[];
  totalCasts: number;
  jugador: string;
}

const KEY = "pesca-iberica:save:v1";

const DEFAULT_SAVE: SaveData = {
  catches: [],
  totalCasts: 0,
  jugador: "Manuel",
};

function loadFromStorage(): SaveData {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw);
    return {
      catches: Array.isArray(parsed.catches) ? parsed.catches : [],
      totalCasts:
        typeof parsed.totalCasts === "number" ? parsed.totalCasts : 0,
      jugador: typeof parsed.jugador === "string" ? parsed.jugador : "Manuel",
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

function saveToStorage(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function useSaveData() {
  const [data, setData] = useState<SaveData>(DEFAULT_SAVE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(loadFromStorage());
    setLoaded(true);
  }, []);

  const addCatch = useCallback((c: Catch) => {
    setData((prev) => {
      const next: SaveData = {
        ...prev,
        catches: [...prev.catches, c],
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const incCasts = useCallback(() => {
    setData((prev) => {
      const next: SaveData = { ...prev, totalCasts: prev.totalCasts + 1 };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setJugador = useCallback((nombre: string) => {
    setData((prev) => {
      const next: SaveData = { ...prev, jugador: nombre };
      saveToStorage(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveToStorage(DEFAULT_SAVE);
    setData(DEFAULT_SAVE);
  }, []);

  return { data, loaded, addCatch, incCasts, setJugador, reset };
}
