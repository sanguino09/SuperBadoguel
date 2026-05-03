import { FISH, type Fish } from "./fish";

export interface Location {
  id: string;
  nombre: string;
  region: string;
  descripcion: string;
  skyTop: string;
  skyBottom: string;
  waterTop: string;
  waterBottom: string;
  silueta: string; // color de la silueta de orilla
  fishIds: string[];
}

export const LOCATIONS: Location[] = [
  {
    id: "portina",
    nombre: "La Portiña",
    region: "Talavera de la Reina · Toledo",
    descripcion:
      "Pequeño pantano cercano al Tajo. Aguas tranquilas entre encinas y juncos, ideales para empezar la jornada al amanecer.",
    skyTop: "#f8c98e",
    skyBottom: "#f49e5a",
    waterTop: "#7fb3c9",
    waterBottom: "#1f4a63",
    silueta: "#2a3a26",
    fishIds: [
      "boga_tajo",
      "percasol",
      "carpa_comun",
      "barbo_comun",
      "tenca",
      "black_bass",
    ],
  },
  {
    id: "rosarito",
    nombre: "El Rosarito",
    region: "Candeleda · Ávila",
    descripcion:
      "A los pies de Gredos. Aguas amplias y cristalinas con orillas pedregosas. El paraíso del black bass castellano.",
    skyTop: "#9ec9e8",
    skyBottom: "#5a8fb8",
    waterTop: "#6ba7c4",
    waterBottom: "#173d57",
    silueta: "#1f2e3a",
    fishIds: [
      "carpa_comun",
      "percasol",
      "black_bass",
      "carpa_royal",
      "tenca",
      "lucioperca",
    ],
  },
  {
    id: "cijara",
    nombre: "El Cíjara",
    region: "Reserva Nacional · Badajoz",
    descripcion:
      "El gran pantano del Guadiana, cota mítica para los lucieros. Bosque mediterráneo, aguas profundas y silencio absoluto.",
    skyTop: "#f3a9b5",
    skyBottom: "#7d4a6a",
    waterTop: "#3f5a78",
    waterBottom: "#0a1d2e",
    silueta: "#1a1518",
    fishIds: [
      "carpa_comun",
      "barbo_comun",
      "black_bass",
      "barbo_comizo",
      "lucioperca",
      "lucio",
    ],
  },
];

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function getFishForLocation(locationId: string): Fish[] {
  const loc = getLocation(locationId);
  if (!loc) return [];
  return loc.fishIds.map((id) => FISH[id]).filter(Boolean);
}
