// src/features/Detection/DetectionDashboard.tsx
import React, { useState } from "react";
import { DataManager } from "../../lib/dataManager";
import { DetectionEngine } from "../../lib/detectionEngine";
import { PhotoUpload } from "../../components/PhotoUpload";

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

  // --- Sauvegarde globale ---
  const saveChanges = (updatedFields: any) => {
    const updatedPlayer = {
      ...localPlayer,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    DataManager.savePlayer(updatedPlayer);
    setLocalPlayer(updatedPlayer);
    onUpdate(); // Informe le parent (DetectionApp) que les données ont changé
  };

  // --- Gestion de la photo ---
  const handlePhotoChange = (base64Str: string) => {
    saveChanges({ photoBase64: base64Str });
  };

  // --- État temporaire pour le formulaire physique ---
  const [sprintTime, setSprintTime] = useState<string>("");

  const handleSavePhysicalTest = () => {
    const time = parseFloat(sprintTime);
    if (isNaN(time)) return;

    // 1. Calcul de la note via le Moteur et les Barèmes
    const score = DetectionEngine.getRating(
      "Vitesse 20m",
      time,
      localPlayer.category,
    );

    // 2. Création de la session
    const newSession = {
      date: new Date().toISOString().split("T")[0],
      tests: { "Vitesse 20m": { value: time, score: score } },
    };

    // 3. Ajout à l'historique de la joueuse
    const updatedSessions = [
      ...(localPlayer.physicalSessions || []),
      newSession,
    ];
    saveChanges({ physicalSessions: updatedSessions });
    setSprintTime(""); // Reset de l'input
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-slate-200">
      {/* ═══ EN-TÊTE ET PROFIL RAPIDE ═══ */}
      <div className="flex-none bg-zinc-900 border-b border-zinc-800 p-6">
        <button
          onClick={onBack}
          className="text-orange-500 hover:text-orange-400 font-medium mb-4 flex items-center gap-2"
        >
          ← Retour à la liste
        </button>

        <div className="flex items-center gap-6">
          {/* Notre composant PhotoUpload en action */}
          <PhotoUpload
            currentPhotoBase64={localPlayer.photoBase64}
            onPhotoChange={handlePhotoChange}
          />

          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight">
              {localPlayer.lastName}{" "}
              <span className="text-orange-500">{localPlayer.firstName}</span>
            </h1>
            <div className="flex gap-3 mt-2 text-sm text-slate-400">
              <span className="bg-zinc-800 px-3 py-1 rounded-full font-medium">
                Catégorie: {localPlayer.category}
              </span>
              <span className="bg-zinc-800 px-3 py-1 rounded-full">
                Club: {localPlayer.club || "Non renseigné"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ NAVIGATION DES ONGLETS ═══ */}
      <div className="flex-none border-b border-zinc-800 px-6">
        <div className="flex gap-6 -mb-px">
          {(["profil", "physique", "technique"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENU DES ONGLETS ═══ */}
      <div className="flex-1 overflow-auto p-6">
        {/* ONGLET PROFIL */}
        {activeTab === "profil" && (
          <div className="max-w-2xl bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-xl font-bold text-white mb-4">
              Informations Générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  defaultValue={localPlayer.height || ""}
                  onBlur={(e) =>
                    saveChanges({ height: parseInt(e.target.value) })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  defaultValue={localPlayer.birthDate || ""}
                  onBlur={(e) => saveChanges({ birthDate: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ONGLET PHYSIQUE */}
        {activeTab === "physique" && (
          <div className="max-w-4xl space-y-6">
            {/* Formulaire de saisie */}
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-xl font-bold text-white mb-4">
                Saisir un test (Sprint 20m)
              </h3>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    Temps (secondes)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sprintTime}
                    onChange={(e) => setSprintTime(e.target.value)}
                    placeholder="ex: 3.45"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                  />
                </div>
                <button
                  onClick={handleSavePhysicalTest}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Calculer & Sauvegarder
                </button>
              </div>
            </div>

            {/* Historique des sessions */}
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-xl font-bold text-white mb-4">
                Historique des évaluations
              </h3>
              {!localPlayer.physicalSessions ||
              localPlayer.physicalSessions.length === 0 ? (
                <p className="text-slate-500">
                  Aucun test physique enregistré.
                </p>
              ) : (
                <div className="space-y-3">
                  {localPlayer.physicalSessions.map(
                    (session: any, index: number) => (
                      <div
                        key={index}
                        className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex justify-between items-center"
                      >
                        <span className="text-slate-400">
                          Date: {session.date}
                        </span>
                        {session.tests["Vitesse 20m"] && (
                          <div className="flex gap-4">
                            <span className="text-white">
                              Sprint: {session.tests["Vitesse 20m"].value}s
                            </span>
                            <span className="font-bold text-orange-500">
                              Note: {session.tests["Vitesse 20m"].score}/20
                            </span>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET TECHNIQUE */}
        {activeTab === "technique" && (
          <div className="text-slate-500">
            Interface d'évaluation technique à intégrer ici...
          </div>
        )}
      </div>
    </div>
  );
}
