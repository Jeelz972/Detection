import React, { useState, useEffect } from "react";
import { DataManager } from "../../lib/dataManager";
import { DetectionEngine } from "../../lib/detectionEngine";
import { PhotoUpload } from "../../components/PhotoUpload";
import { PlayerRadar } from "../../components/PlayerRadar";

interface AppProps {
  initialPlayer?: any;
}

export default function DetectionApp({ initialPlayer }: AppProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(initialPlayer ?? null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setPlayers(DataManager.getAllPlayers());
  }, []);

  useEffect(() => {
    if (initialPlayer) setSelected(initialPlayer);
  }, [initialPlayer]);

  const refresh = () => setPlayers(DataManager.getAllPlayers());

  if (selected) {
    return (
      <DetectionDashboard
        player={selected}
        onBack={() => {
          setSelected(null);
          refresh();
        }}
        onUpdate={refresh}
      />
    );
  }

  const filtered = players.filter((p) =>
    `${p.firstName} ${p.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-full overflow-y-auto">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
          Scouting <span className="text-orange-500">Joueuses</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Sélectionnez une joueuse pour ouvrir sa fiche de détection.
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher une joueuse..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white pl-12 focus:border-orange-500 outline-none transition-all"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
          🔍
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="text-left bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-orange-500/50 transition-all flex items-center gap-4"
          >
            <div className="h-14 w-14 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
              {p.photoBase64 ? (
                <img
                  src={p.photoBase64}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xl text-zinc-600">
                  👤
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white uppercase truncate">
                {p.lastName} {p.firstName}
              </div>
              <div className="text-xs text-slate-500">
                {p.category} · {p.club || "Sans club"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-800">
          <p className="text-slate-500 italic">Aucune joueuse en base.</p>
        </div>
      )}
    </div>
  );
}

interface DashProps {
  player: any;
  onBack: () => void;
  onUpdate: () => void;
}

function DetectionDashboard({ player, onBack, onUpdate }: DashProps) {
  const [activeTab, setActiveTab] = useState<
    "profil" | "physique" | "technique"
  >("profil");
  const [localPlayer, setLocalPlayer] = useState(player);
  const [sprintTime, setSprintTime] = useState<string>("");

  const saveChanges = (updatedFields: any) => {
    const updatedPlayer = {
      ...localPlayer,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    DataManager.savePlayer(updatedPlayer);
    setLocalPlayer(updatedPlayer);
    onUpdate();
  };

  const handlePhotoChange = (base64Str: string) => {
    saveChanges({ photoBase64: base64Str });
  };

  const handleSavePhysicalTest = () => {
    const time = parseFloat(sprintTime);
    if (isNaN(time) || time <= 0) return;

    const score = DetectionEngine.getRating(
      "Vitesse 20m",
      time,
      localPlayer.category,
    );

    const newSession = {
      date: new Date().toISOString().split("T")[0],
      tests: {
        "Vitesse 20m": { value: time, score: score },
      },
    };

    const updatedSessions = [
      ...(localPlayer.physicalSessions || []),
      newSession,
    ];
    saveChanges({ physicalSessions: updatedSessions });
    setSprintTime("");
  };

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
      <header className="flex-none bg-zinc-900 border-b border-zinc-800 p-6 shadow-xl">
        <button
          onClick={onBack}
          className="text-orange-500 hover:text-orange-400 font-bold mb-6 flex items-center gap-2 transition-colors"
        >
          <span className="text-xl">←</span> Retour à la liste
        </button>

        <div className="flex items-center gap-8">
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

      <main className="flex-1 overflow-y-auto p-8">
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

        {activeTab === "physique" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl">
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

            <div className="xl:col-span-2">
              <PlayerRadar data={getRadarData()} color="#f97316" />
            </div>
          </div>
        )}

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
