// src/lib/detectionEngine.ts
import { loadTestsConfig, type TestDefinition } from "./testsConfig";

export const DetectionEngine = {
  getRating: function (testNameOrId: string, value: number, category: string): number {
    const config = loadTestsConfig();
    const allTests: TestDefinition[] = [...config.physique, ...config.technique];
    const test = allTests.find((t) => t.id === testNameOrId) || allTests.find((t) => t.name === testNameOrId);
    if (!test) return 0;

    const bareme = test.baremes[category];
    if (!bareme) return 0;
    const { thresholds, scores } = bareme;

    if (test.direction === "lower_is_better") {
      for (let i = 0; i < thresholds.length; i++) {
        if (value <= thresholds[i]) return scores[i];
      }
      return scores[scores.length - 1] || 0;
    } else {
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (value >= thresholds[i]) return scores[i];
      }
      return scores[0] || 0;
    }
  },

  getTestDefinition: function (testNameOrId: string): TestDefinition | undefined {
    const config = loadTestsConfig();
    const allTests: TestDefinition[] = [...config.physique, ...config.technique];
    return allTests.find((t) => t.id === testNameOrId) || allTests.find((t) => t.name === testNameOrId);
  },

  generateId: function (prefix: string = "det"): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
