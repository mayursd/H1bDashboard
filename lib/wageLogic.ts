import { WageRecord } from "@/lib/types";

export type WageBand = "strong" | "good" | "risky" | "unlikely" | "missing";

export function getBand(baseSalary: number, record?: WageRecord): WageBand {
  if (!record) return "missing";
  if (baseSalary >= record.level_3) return "strong";
  if (baseSalary >= record.level_2) return "good";
  if (baseSalary >= record.level_1) return "risky";
  return "unlikely";
}

export function getBandColor(band: WageBand): string {
  switch (band) {
    case "strong":
      return "#16a34a";
    case "good":
      return "#2563eb";
    case "risky":
      return "#eab308";
    case "unlikely":
      return "#dc2626";
    default:
      return "#cbd5e1";
  }
}
