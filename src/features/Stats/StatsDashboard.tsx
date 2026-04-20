import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useStatsData } from "./useStatsData";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };
const TOOLTIP_LABEL = { color: "#f4f4f5", fontWeight: 700 };
const TOOLTIP_ITEM = { color: "#fb923c" };

export default function StatsDashboard() {
  const { byClub, byCategory, totalPlayersWithData } = useStatsData();

  if (totalPlayersWithData === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="h-20 w-20 bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-6 border border-zinc-800">
          📈
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic">Aucune donnée</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Commencez par saisir des sprints "Vitesse 20m" dans l'onglet Scouting pour voir les moyennes par club et par catégorie.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h1 className="text-xl font-black uppercase italic tracking-tighter text-white mb-4">
        Statistiques <span className="text-orange-500">·</span>
        <span className="text-slate-500 text-sm ml-2">{totalPlayersWithData} joueuses avec données</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-3">
            Sprint 20m moyen par <span className="text-orange-500">club</span> (sec)
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={byClub} margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="club" stroke="#71717a" fontSize={11} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  itemStyle={TOOLTIP_ITEM}
                  formatter={(v: any, _n: any, p: any) => [`${v}s · ${p.payload.count} joueuse(s)`, "Moyenne"]}
                />
                <Bar dataKey="avgSprint" fill="#f97316" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="avgSprint" position="top" fill="#fb923c" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-3">
            Note physique moyenne par <span className="text-orange-500">catégorie</span> (/20)
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={byCategory} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 20]} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  itemStyle={TOOLTIP_ITEM}
                  formatter={(v: any, _n: any, p: any) => [`${v}/20 · ${p.payload.count} joueuse(s)`, "Moyenne"]}
                />
                <Bar dataKey="avgScore" fill="#f97316" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="avgScore" position="top" fill="#fb923c" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
