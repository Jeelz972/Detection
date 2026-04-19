// src/lib/detectionEngine.ts
import { DETECTION_BAREMES } from "./baremes";

export const DetectionEngine = {
  // Calcule la note de 1 à 20 en fonction du barème
  getRating: function (
    testName: string,
    value: number,
    category: string,
  ): number {
    const categoryBareme = (DETECTION_BAREMES as any)[category];
    if (!categoryBareme || !categoryBareme[testName]) return 0;

    const scores = categoryBareme[testName].points;
    const thresholds = Object.keys(scores)
      .map(Number)
      .sort((a, b) => a - b);

    // Logique de recherche du score (à adapter selon si "plus petit = mieux" comme le sprint)
    let finalScore = 0;
    for (const t of thresholds) {
      if (value <= t) {
        finalScore = scores[t];
        break;
      }
    }
    return finalScore;
  },

  // Génère un ID unique pour une nouvelle détection
  generateId: function (prefix: string = "det"): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
