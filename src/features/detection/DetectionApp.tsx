// src/features/Detection/DetectionApp.tsx
import React, { useState, useEffect } from "react";
import { DataManager } from "../../lib/dataManager";
import DetectionDashboard from "./DetectionDashboard";
import BatchTestSession from "./BatchTestSession";
import TestsConfigPanel from "./TestsConfigPanel";

interface AppProps {
  initialPlayer?: any;
}

type SubView = "joueuses" | "session" | "config";

export default function DetectionApp({ initialPlayer }: AppProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(initialPlayer ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subView, setSubView] = useState<SubView>("joueuses");

  useEffect(() => { setPlayers(DataManager.getAllPlayers()); }, []);
  useEffect(() => { if (initialPlayer) { setSelected(initialPlayer); setSubView("joueuses"); } }, [initialPlayer]);

  const refresh = () => setPlayers(DataManager.getAllPlayers());

  // ── Vue individuelle (fiche joueuse) ──
  if (selected) {
    return (
      <DetectionDashboard
        player={selected}
        onBack={() => { setSelected(null); refresh(); }}
        onUpdate={refresh}
      />
    );
  }

  const filtered = players.filter((p) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto">
      {/* HEADER + SUB-NAV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Scouting <span className="text-orange-500">Joueuses</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Détection, tests & configuration</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {([
            { id: "joueuses" as SubView, label: "👤 Joueuses" },
            { id: "session" as SubView, label: "📋 Session" },
            { id: "config" as SubView, label: "⚙️ Config" },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setSubView(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                subView === tab.id ? "bg-orange-500 text-white shadow-md" : "text-slate-500 hover:text-slate-300"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SESSION BATCH ── */}
      {subView === "session" && <BatchTestSession />}

      {/* ── CONFIG TESTS ── */}
      {subView === "config" && <TestsConfigPanel />}

      {/* ── LISTE JOUEUSES (pour détection individuelle) ── */}
      {subView === "joueuses" && (
        <>
          <div className="relative">
            <input type="text" placeholder="Rechercher une joueuse..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white pl-12 focus:border-orange-500 outline-none transition-all" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)}
                className="text-left bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-orange-500/50 transition-all flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                  {p.photoBase64 ? (
                    <img src={p.photoBase64} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl text-zinc-600">👤</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white uppercase truncate">{p.lastName} {p.firstName}</div>
                  <div className="text-xs text-slate-500">{p.category} · {p.club || "Sans club"}</div>
                </div>
              </button>
            ))}
          </div>

          {players.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-800">
              <p className="text-slate-500 italic">Aucune joueuse en base.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
