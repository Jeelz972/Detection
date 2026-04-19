// src/App.tsx
import React, { useState } from "react";
import GestionDashboard from "./features/Gestion/GestionDashboard";
import DetectionApp from "./features/Detection/DetectionApp";

// Ce module sera créé à l'étape suivante
// import StatsDashboard from './features/Stats/StatsDashboard';

export default function App() {
  // Navigation : 'gestion' | 'detection' | 'stats'
  const [currentView, setCurrentView] = useState<
    "gestion" | "detection" | "stats"
  >("gestion");

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-slate-200 font-sans">
      {/* ═══ BARRE DE NAVIGATION PRINCIPALE ═══ */}
      <nav className="flex-none border-b border-zinc-800 bg-zinc-900 shadow-xl z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Identité */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
                <span className="text-xl font-black">SC</span>
              </div>
              <div>
                <span className="text-lg font-black text-white tracking-tighter uppercase italic">
                  Stat<span className="text-orange-500">Champ</span>
                </span>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase leading-none">
                  CABF Edition
                </div>
              </div>
            </div>

            {/* Menu d'onglets */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setCurrentView("gestion")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  currentView === "gestion"
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                📋 Roster
              </button>
              <button
                onClick={() => setCurrentView("detection")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  currentView === "detection"
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                🎯 Scouting
              </button>
              <button
                onClick={() => setCurrentView("stats")}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  currentView === "stats"
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                📊 Stats
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ ZONE D'AFFICHAGE DYNAMIQUE ═══ */}
      <main className="flex-1 overflow-hidden relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
        {currentView === "gestion" && <GestionDashboard />}

        {currentView === "detection" && <DetectionApp />}

        {currentView === "stats" && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="h-20 w-20 bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-6 border border-zinc-800">
              📈
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic">
              Analyse Comparative
            </h2>
            <p className="text-slate-500 max-w-md mt-2">
              Le module de statistiques globales permettra de comparer les
              moyennes physiques (Vitesse, Détente) par club et par catégorie.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
