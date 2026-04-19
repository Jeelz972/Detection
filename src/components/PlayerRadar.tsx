// src/components/PlayerRadar.tsx
import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarData {
  subject: string;
  score: number;
  fullMark: number;
}

interface Props {
  data: RadarData[];
  color?: string;
}

export function PlayerRadar({ data, color = "#f97316" }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
        Pas assez de données pour générer le graphique.
      </div>
    );
  }

  return (
    <div className="h-72 w-full bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-center text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
        Profil Athlétique
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" />

          {/* Les axes (noms des tests) */}
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 500 }}
          />

          {/* L'échelle (de 0 à 20) */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 20]}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickCount={5}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              borderColor: "#3f3f46",
              color: "#f8fafc",
              borderRadius: "8px",
            }}
            itemStyle={{ color: color, fontWeight: "bold" }}
          />

          {/* Le tracé de la joueuse */}
          <Radar
            name="Note (/20)"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
