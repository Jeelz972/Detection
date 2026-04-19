// src/features/Detection/DetectionDashboard.tsx
import React, { useState } from "react";
import { DataManager } from "../../lib/dataManager";
import { DetectionEngine } from "../../lib/detectionEngine";
import { PhotoUpload } from "../../components/PhotoUpload";
import { PlayerRadar } from "../../components/PlayerRadar";

interface Props {
  player: any;
  onBack: () => void;
  onUpdate: () => void;
}

export default function DetectionDashboard({
  player,
  onBack,
  onUpdate,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "profil" | "physique" | "technique"
  >("profil");
  const [localPlayer, setLocalPlayer] = useState(player);
  const [sprintTime, setSprintTime] = useState<string>("");

  // --- Sauvegarde des modifications dans la base locale ---
  const saveChanges = (updatedFields: any) => {
    const updatedPlayer = {
      ...localPlayer,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    DataManager.savePlayer(updatedPlayer);
    setLocalPlayer(updatedPlayer);
    onUpdate(); // Notifie le parent pour rafraîchir la liste si besoin
  };

  // --- Gestion de la photo de profil ---
  const handlePhotoChange = (base64Str: string) => {
    saveChanges({ photoBase64: base64Str });
  };

  // --- Enregistrement d'un test physique (ex: Sprint) ---
  const handleSavePhysicalTest = () => {
    const time = parseFloat(sprintTime);
    if (isNaN(time) || time <= 0) return;

    // 1. Calcul de la note via le moteur (Barèmes)
    const score = DetectionEngine.getRating(
      "Vitesse 20m",
      time,
      localPlayer.category,
    );

    // 2. Création de la nouvelle session
    const newSession = {
      date: new Date().toISOString().split("T")[0],
      tests: {
        "Vitesse 20m": { value: time, score: score },
      },
    };

    // 3. Mise à jour de l'historique
    const updatedSessions = [
      ...(localPlayer.physicalSessions || []),
      newSession,
    ];
    saveChanges({ physicalSessions: updatedSessions });
    setSprintTime(""); // Réinitialise le champ
  };

  // --- Préparation des données pour le Graphique Radar ---
  const getRadarData = () => {
    const sessions = localPlayer.physicalSessions || [];
    const latest = sessions[sessions.length - 1];
    if (!latest || !latest.tests) return [];

    return Object.entries(latest.tests).map(
      ([testName, data]: [string, any]) => ({
        subject: testName,
        score: data.score,
        fullMark: 20,
      }),
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-slate-200">
      {/* ═══ HEADER : Profil Rapide ═══ */}
      <header className="flex-none bg-zinc-900 border-b border-zinc-800 p-6 shadow-xl">
        <button
          onClick={onBack}
          className="text-orange-500 hover:text-orange-400 font-bold mb-6 flex items-center gap-2 transition-colors"
        >
          <span className="text-xl">←</span> Retour à la liste
        </button>

        <div className="flex items-center gap-8">
          {/* Upload Photo avec compression */}
          <PhotoUpload
            currentPhotoBase64={localPlayer.photoBase64}
            onPhotoChange={handlePhotoChange}
          />

          <div className="flex-1">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              {localPlayer.lastName}{" "}
              <span className="text-orange-500">{localPlayer.firstName}</span>
            </h1>
            <div className="flex gap-4 mt-3 text-sm font-semibold uppercase tracking-wider">
              <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-md">
                {localPlayer.category}
              </span>
              <span className="bg-zinc-800 text-slate-400 px-3 py-1 rounded-md border border-zinc-700">
                {localPlayer.club || "Club non renseigné"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ NAVIGATION : Onglets ═══ */}
      <nav className="flex-none border-b border-zinc-800 bg-zinc-900/50 px-6">
        <div className="flex gap-8 -mb-px">
          {(["profil", "physique", "technique"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 font-bold uppercase text-xs tracking-widest border-b-2 transition-all ${
                activeTab === tab
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══ CONTENU : Vue active ═══ */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* --- ONGLET PROFIL --- */}
        {activeTab === "profil" && (
          <div className="max-w-3xl space-y-6">
            <section className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-inner">
              <h3 className="text-xl font-bold text-white mb-6">
                Détails de la licence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Club actuel
                  </label>
                  <input
                    type="text"
                    defaultValue={localPlayer.club || ""}
                    onBlur={(e) => saveChanges({ club: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Taille (cm)
                  </label>
                  <input
                    type="number"
                    defaultValue={localPlayer.height || ""}
                    onBlur={(e) =>
                      saveChanges({ height: parseInt(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* --- ONGLET PHYSIQUE --- */}
        {activeTab === "physique" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl">
            {/* Colonne Gauche : Saisie et Historique */}
            <div className="xl:col-span-1 space-y-6">
              <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4 italic">
                  Nouveau test
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Vitesse 20m (sec)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={sprintTime}
                        onChange={(e) => setSprintTime(e.target.value)}
                        placeholder="ex: 3.42"
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                      />
                      <button
                        onClick={handleSavePhysicalTest}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black px-4 rounded-xl transition-all"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4 italic">
                  Historique
                </h3>
                <div className="space-y-2">
                  {localPlayer.physicalSessions
                    ?.slice()
                    .reverse()
                    .map((session: any, i: number) => (
                      <div
                        key={i}
                        className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center"
                      >
                        <span className="text-slate-500 font-mono text-xs">
                          {session.date}
                        </span>
                        <span className="font-black text-orange-500">
                          {session.tests["Vitesse 20m"]?.score}/20
                        </span>
                      </div>
                    ))}
                  {!localPlayer.physicalSessions?.length && (
                    <p className="text-slate-600 text-sm">Aucune donnée.</p>
                  )}
                </div>
              </section>
            </div>

            {/* Colonne Droite : Le Graphique Radar */}
            <div className="xl:col-span-2">
              <PlayerRadar data={getRadarData()} color="#f97316" />
            </div>
          </div>
        )}

        {/* --- ONGLET TECHNIQUE --- */}
        {activeTab === "technique" && (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-slate-500 italic">
              Module technique en cours de développement...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
