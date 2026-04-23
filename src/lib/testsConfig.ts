// src/lib/testsConfig.ts

export interface TestBareme {
  thresholds: number[];
  scores: number[];
}

export interface TestDefinition {
  id: string;
  name: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  active: boolean;
  baremes: Record<string, TestBareme>;
}

export interface TestsConfig {
  physique: TestDefinition[];
  technique: TestDefinition[];
}

const STORAGE_KEY = "cabf_tests_config";

export const DEFAULT_TESTS_CONFIG: TestsConfig = {
  physique: [
    {
      id: "vitesse_20m", name: "Vitesse 20m", unit: "s", direction: "lower_is_better", active: true,
      baremes: {
        U11: { thresholds: [3.80, 4.00, 4.30, 4.60, 5.00], scores: [20, 16, 12, 8, 4] },
        U13: { thresholds: [3.20, 3.40, 3.60, 3.80, 4.20], scores: [20, 16, 12, 8, 4] },
        U15: { thresholds: [3.00, 3.20, 3.40, 3.60, 4.00], scores: [20, 16, 12, 8, 4] },
        U18: { thresholds: [2.80, 3.00, 3.20, 3.40, 3.80], scores: [20, 16, 12, 8, 4] },
        Senior: { thresholds: [2.70, 2.90, 3.10, 3.30, 3.60], scores: [20, 16, 12, 8, 4] },
      },
    },
    {
      id: "detente_verticale", name: "Détente verticale", unit: "cm", direction: "higher_is_better", active: true,
      baremes: {
        U11: { thresholds: [20, 25, 30, 35, 40], scores: [4, 8, 12, 16, 20] },
        U13: { thresholds: [22, 28, 33, 38, 44], scores: [4, 8, 12, 16, 20] },
        U15: { thresholds: [25, 30, 36, 42, 48], scores: [4, 8, 12, 16, 20] },
        U18: { thresholds: [28, 33, 39, 45, 52], scores: [4, 8, 12, 16, 20] },
        Senior: { thresholds: [30, 35, 42, 48, 55], scores: [4, 8, 12, 16, 20] },
      },
    },
    {
      id: "navette", name: "Test navette (Luc Léger)", unit: "palier", direction: "higher_is_better", active: true,
      baremes: {
        U11: { thresholds: [2, 3, 5, 6, 8], scores: [4, 8, 12, 16, 20] },
        U13: { thresholds: [3, 5, 6, 8, 10], scores: [4, 8, 12, 16, 20] },
        U15: { thresholds: [4, 6, 7, 9, 11], scores: [4, 8, 12, 16, 20] },
        U18: { thresholds: [5, 7, 8, 10, 12], scores: [4, 8, 12, 16, 20] },
        Senior: { thresholds: [5, 7, 9, 11, 13], scores: [4, 8, 12, 16, 20] },
      },
    },
  ],
  technique: [
    {
      id: "dribble_slalom", name: "Dribble slalom", unit: "s", direction: "lower_is_better", active: true,
      baremes: {
        U11: { thresholds: [12, 14, 16, 18, 22], scores: [20, 16, 12, 8, 4] },
        U13: { thresholds: [10, 12, 14, 16, 20], scores: [20, 16, 12, 8, 4] },
        U15: { thresholds: [9, 11, 13, 15, 18], scores: [20, 16, 12, 8, 4] },
        U18: { thresholds: [8, 10, 12, 14, 17], scores: [20, 16, 12, 8, 4] },
        Senior: { thresholds: [7, 9, 11, 13, 16], scores: [20, 16, 12, 8, 4] },
      },
    },
    {
      id: "tir_precision", name: "Tir de précision", unit: "pts", direction: "higher_is_better", active: true,
      baremes: {
        U11: { thresholds: [2, 4, 6, 8, 10], scores: [4, 8, 12, 16, 20] },
        U13: { thresholds: [3, 5, 7, 9, 12], scores: [4, 8, 12, 16, 20] },
        U15: { thresholds: [4, 6, 8, 10, 14], scores: [4, 8, 12, 16, 20] },
        U18: { thresholds: [5, 7, 9, 12, 15], scores: [4, 8, 12, 16, 20] },
        Senior: { thresholds: [6, 8, 10, 13, 16], scores: [4, 8, 12, 16, 20] },
      },
    },
    {
      id: "passes_precision", name: "Passes en précision", unit: "/20", direction: "higher_is_better", active: true,
      baremes: {
        U11: { thresholds: [4, 7, 10, 14, 17], scores: [4, 8, 12, 16, 20] },
        U13: { thresholds: [5, 8, 11, 15, 18], scores: [4, 8, 12, 16, 20] },
        U15: { thresholds: [6, 9, 12, 16, 19], scores: [4, 8, 12, 16, 20] },
        U18: { thresholds: [7, 10, 13, 16, 19], scores: [4, 8, 12, 16, 20] },
        Senior: { thresholds: [8, 11, 14, 17, 20], scores: [4, 8, 12, 16, 20] },
      },
    },
  ],
};

export function loadTestsConfig(): TestsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.physique && parsed.technique) {
        // Migration: add active field if missing
        const migrate = (tests: TestDefinition[]) =>
          tests.map((t) => ({ ...t, active: t.active !== false }));
        return { physique: migrate(parsed.physique), technique: migrate(parsed.technique) };
      }
    }
  } catch { /* fallback */ }
  return DEFAULT_TESTS_CONFIG;
}

export function saveTestsConfig(config: TestsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getActiveTests(): { physique: TestDefinition[]; technique: TestDefinition[] } {
  const config = loadTestsConfig();
  return {
    physique: config.physique.filter((t) => t.active),
    technique: config.technique.filter((t) => t.active),
  };
}

export function getAllTestDefinitions(): TestDefinition[] {
  const config = loadTestsConfig();
  return [...config.physique, ...config.technique];
}

export function getTestById(id: string): TestDefinition | undefined {
  return getAllTestDefinitions().find((t) => t.id === id);
}
