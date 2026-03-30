import type { DashboardData } from "../types/dashboard";
import { mockDashboardData } from "./mockData";

export type DashboardMode = "mock" | "live" | "hybrid";

/**
 * Adapter-Einstieg fuer spaetere echte Integrationen (Analytics, Shop, Social).
 * Solange keine externen Quellen verbunden sind, liefern wir konsistente Mock-Daten.
 */
export async function loadDashboardData(mode: DashboardMode = "mock"): Promise<DashboardData> {
  if (mode === "live") {
    // Platzhalter fuer spaetere API-Anbindung.
    // Beispiel: await fetch("/api/dashboard").then((res) => res.json())
    return mockDashboardData;
  }

  if (mode === "hybrid") {
    // Platzhalter fuer gemischte Quellen (teilweise live, teilweise fallback).
    return mockDashboardData;
  }

  return mockDashboardData;
}
