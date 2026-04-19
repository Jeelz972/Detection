import { useEffect, useState } from "react";
import { DataManager, CATEGORY_ORDER, Category } from "../../lib/dataManager";

interface Session {
  date?: string;
  tests?: Record<string, { value: number; score: number } | undefined>;
}

export interface StatsData {
  byClub: { club: string; avgSprint: number; count: number }[];
  byCategory: { category: Category; avgScore: number; count: number }[];
  totalPlayersWithData: number;
}

function latestSprintSession(sessions: Session[] | undefined) {
  if (!sessions || sessions.length === 0) return null;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const t = sessions[i]?.tests?.["Vitesse 20m"];
    if (t && typeof t.value === "number" && typeof t.score === "number") {
      return t;
    }
  }
  return null;
}

export function useStatsData(): StatsData {
  const [data, setData] = useState<StatsData>({ byClub: [], byCategory: [], totalPlayersWithData: 0 });

  useEffect(() => {
    const players = DataManager.getAllPlayers();

    const clubAgg: Record<string, { total: number; count: number }> = {};
    const catAgg: Record<string, { total: number; count: number }> = {};
    let totalPlayersWithData = 0;

    players.forEach((p: any) => {
      const t = latestSprintSession(p.physicalSessions);
      if (!t) return;
      totalPlayersWithData += 1;

      const club = ((p.club || "Sans club").trim() || "Sans club") as string;
      clubAgg[club] = clubAgg[club] || { total: 0, count: 0 };
      clubAgg[club].total += t.value;
      clubAgg[club].count += 1;

      const cat = p.category || "U15";
      catAgg[cat] = catAgg[cat] || { total: 0, count: 0 };
      catAgg[cat].total += t.score;
      catAgg[cat].count += 1;
    });

    const byClub = Object.entries(clubAgg)
      .map(([club, a]) => ({ club, avgSprint: Math.round((a.total / a.count) * 100) / 100, count: a.count }))
      .sort((a, b) => a.avgSprint - b.avgSprint);

    const byCategory = (CATEGORY_ORDER as readonly Category[])
      .filter((c) => catAgg[c])
      .map((c) => ({
        category: c,
        avgScore: Math.round((catAgg[c].total / catAgg[c].count) * 10) / 10,
        count: catAgg[c].count,
      }));

    setData({ byClub, byCategory, totalPlayersWithData });
  }, []);

  return data;
}
