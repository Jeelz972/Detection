// src/lib/baremes.ts
import { loadTestsConfig, type TestDefinition } from "./testsConfig";

export function buildDetectionBaremes(): Record<string, Record<string, { unit: string; points: Record<string, number> }>> {
  const config = loadTestsConfig();
  const allTests: TestDefinition[] = [...config.physique, ...config.technique];
  const result: Record<string, Record<string, { unit: string; points: Record<string, number> }>> = {};

  for (const test of allTests) {
    for (const [category, bareme] of Object.entries(test.baremes)) {
      if (!result[category]) result[category] = {};
      const points: Record<string, number> = {};
      bareme.thresholds.forEach((threshold, i) => {
        points[String(threshold)] = bareme.scores[i];
      });
      result[category][test.name] = { unit: test.unit, points };
    }
  }
  return result;
}

export const DETECTION_BAREMES = buildDetectionBaremes();
