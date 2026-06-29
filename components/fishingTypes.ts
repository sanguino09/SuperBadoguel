import type { Fish } from "@/data/fish";

export type Phase =
  | "idle"
  | "casting"
  | "waiting"
  | "bite"
  | "fighting"
  | "lost"
  | "caught";

export interface GameState {
  bobberTarget: { x: number; y: number; z: number };
  bobberInWater: boolean;
  fishOnHook: Fish | null;
  fishSize: number;
}
