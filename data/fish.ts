export type Rarity = "comun" | "raro" | "epico" | "legendario";

export interface Fish {
  id: string;
  nombre: string;
  cientifico: string;
  rarity: Rarity;
  pesoMin: number; // kg
  pesoMax: number; // kg
  color: string;
  colorVientre: string;
  forma: "alargado" | "ovalado" | "torpedo" | "robusto";
  descripcion: string;
}

export const FISH: Record<string, Fish> = {
  carpa_comun: {
    id: "carpa_comun",
    nombre: "Carpa Común",
    cientifico: "Cyprinus carpio",
    rarity: "comun",
    pesoMin: 1.2,
    pesoMax: 14,
    color: "#a07a3a",
    colorVientre: "#e8d390",
    forma: "robusto",
    descripcion:
      "Reina de los pantanos castellanos. Lucha tenaz y carreras largas en aguas cálidas.",
  },
  barbo_comun: {
    id: "barbo_comun",
    nombre: "Barbo Común",
    cientifico: "Luciobarbus bocagei",
    rarity: "comun",
    pesoMin: 0.5,
    pesoMax: 6,
    color: "#7d6a3a",
    colorVientre: "#dcc78a",
    forma: "alargado",
    descripcion:
      "Endémico ibérico. Vive en las corrientes del Tajo y sus afluentes, fuerte y escurridizo.",
  },
  boga_tajo: {
    id: "boga_tajo",
    nombre: "Boga del Tajo",
    cientifico: "Pseudochondrostoma polylepis",
    rarity: "comun",
    pesoMin: 0.1,
    pesoMax: 0.8,
    color: "#8a8e74",
    colorVientre: "#e8e4c4",
    forma: "alargado",
    descripcion:
      "Pequeña pero abundante. Indicador de aguas sanas en cuencas del centro peninsular.",
  },
  percasol: {
    id: "percasol",
    nombre: "Pez Sol",
    cientifico: "Lepomis gibbosus",
    rarity: "comun",
    pesoMin: 0.05,
    pesoMax: 0.45,
    color: "#c97e2c",
    colorVientre: "#f1c948",
    forma: "ovalado",
    descripcion:
      "Pequeño, vistoso y curioso. El primer pez de muchos pescadores de orilla.",
  },
  black_bass: {
    id: "black_bass",
    nombre: "Black Bass",
    cientifico: "Micropterus salmoides",
    rarity: "raro",
    pesoMin: 0.6,
    pesoMax: 5,
    color: "#3c5240",
    colorVientre: "#cfd9b8",
    forma: "torpedo",
    descripcion:
      "Depredador estrella de los embalses. Sus saltos en superficie son inolvidables.",
  },
  carpa_royal: {
    id: "carpa_royal",
    nombre: "Carpa Royal",
    cientifico: "Cyprinus carpio (var. especular)",
    rarity: "raro",
    pesoMin: 4,
    pesoMax: 18,
    color: "#6b4f2a",
    colorVientre: "#e2c78a",
    forma: "robusto",
    descripcion:
      "Variedad de escamas grandes y dispersas. Trofeo de carpfishing en los grandes pantanos.",
  },
  tenca: {
    id: "tenca",
    nombre: "Tenca",
    cientifico: "Tinca tinca",
    rarity: "raro",
    pesoMin: 0.4,
    pesoMax: 3.5,
    color: "#3a5a3a",
    colorVientre: "#a8b072",
    forma: "ovalado",
    descripcion:
      "Discreta y dorada bajo la luz, vive en aguas tranquilas y vegetadas.",
  },
  lucioperca: {
    id: "lucioperca",
    nombre: "Lucioperca",
    cientifico: "Sander lucioperca",
    rarity: "epico",
    pesoMin: 1.5,
    pesoMax: 9,
    color: "#5d6e4a",
    colorVientre: "#e6d8a8",
    forma: "torpedo",
    descripcion:
      "Caza al amanecer y al ocaso. Mezcla la elegancia de la perca con la furia del lucio.",
  },
  barbo_comizo: {
    id: "barbo_comizo",
    nombre: "Barbo Comizo",
    cientifico: "Luciobarbus comizo",
    rarity: "epico",
    pesoMin: 2,
    pesoMax: 10,
    color: "#5e4a2c",
    colorVientre: "#d8c084",
    forma: "alargado",
    descripcion:
      "Endémico del Tajo y Guadiana. Hocico afilado, talla impresionante.",
  },
  lucio: {
    id: "lucio",
    nombre: "Lucio",
    cientifico: "Esox lucius",
    rarity: "legendario",
    pesoMin: 3,
    pesoMax: 16,
    color: "#3d4f2a",
    colorVientre: "#e8e09a",
    forma: "torpedo",
    descripcion:
      "El cocodrilo del agua dulce. Embosca con explosiones de fuerza, joya de El Cíjara.",
  },
};

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; ring: string; weight: number }
> = {
  comun: {
    label: "Común",
    color: "text-stone-200",
    ring: "ring-stone-400/50",
    weight: 60,
  },
  raro: {
    label: "Raro",
    color: "text-sky-300",
    ring: "ring-sky-400/60",
    weight: 28,
  },
  epico: {
    label: "Épico",
    color: "text-fuchsia-300",
    ring: "ring-fuchsia-400/60",
    weight: 10,
  },
  legendario: {
    label: "Legendario",
    color: "text-amber-300",
    ring: "ring-amber-300/70",
    weight: 2,
  },
};
