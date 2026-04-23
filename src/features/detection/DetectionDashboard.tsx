// src/features/Detection/DetectionDashboard.tsx
import React, { useState } from "react";
import { DataManager } from "../../lib/dataManager";
import { DetectionEngine } from "../../lib/detectionEngine";
import { getActiveTests, type TestDefinition } from "../../lib/testsConfig";
import { PhotoUpload } from "../../components/PhotoUpload";
import { PlayerRadar } from "../../components/PlayerRadar";

interface Props {
  player: any;
  onBack: () => void;
  onUpdate: () => void;
}

export default function DetectionDashboard({ player, onBack, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<"profil" | "physique" | "technique">("profil");
  const [localPlayer, setLocalPlayer] = useState(player);
  const [testsConfig] = useState(() => getActiveTests());
  const [testValues, setTestValues] = useState<Record<string, string>>({});

  const saveChanges = (updatedFields: any) => {
    const updated = { ...localPlayer, ...updatedFields, updatedAt: new Date().toISOString() };
    DataManager.savePlayer(updated);
    setLocalPlayer(updated);
    onUpdate();
  };

  const handlePhotoChange = (b64: string) => saveChanges({ photoBase64: b64 });

  const handleSaveTests = (type: "physique" | "technique") => {
    const defs = testsConfig[type];
    const results: Record<string, { value: number; score: number }> = {};
    let hasData = false;

    defs.forEach((test) => {
      const val = parseFloat(testValues[test.id]);
      if (!isNaN(val) && val > 0) {
        results[test.name] = { value: val, score: DetectionEngine.getRating(test.id, val, localPlayer.category) };
        hasData = true;
      }
    });
    if (!hasData) return;

    const today = new Date().toISOString().split("T")[0];
    const sessions = [...(localPlayer.physicalSessions || [])];
    const idx = sessions.findIndex((s: any) => s.date === today);
    if (idx >= 0) sessions[idx] = { ...sessions[idx], tests: { ...sessions[idx].tests, ...results } };
    else sessions.push({ date: today, tests: results });

    saveChanges({ physicalSessions: sessions });
    setTestValues({});
  };

  const getRadarData = () => {
    const s = localPlayer.physicalSessions || [];
    const latest = s[s.length - 1];
    if (!latest?.tests) return [];
    return Object.entries(latest.tests).map(([name, d]: [string, any]) => ({ subject: name, score: d.score, fullMark: 20 }));
  };

  const renderHistory = () => {
    const sessions = localPlayer.physicalSessions || [];
    if (!sessions.length) return <p className="text-slate-600 text-sm italic">Aucun test enregistré.</p>;
    return (
      <div className="space-y-3">
        {sessions.slice().reverse().map((session: any, i: number) => (
          <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div className="text-xs text-slate-500 font-mono mb-2">📅 {session.date}</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(session.tests || {}).map(([name, d]: [string, any]) => (
                <div key={name} className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-xs text-slate-400">{name}</span>
                  <span className="text-xs text-white font-bold">{d.value}</span>
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                    d.score >= 16 ? "text-green-400 bg-green-500/10" : d.score >= 12 ? "text-orange-400 bg-orange-500/10" :
                    d.score >= 8 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10"
                  }`}>{d.score}/20</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTestInputs = (type: "physique" | "technique") => {
    const defs = testsConfig[type];
    if (!defs.length) return (
      <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-2xl">
        <p className="text-slate-500 italic">Aucun test {type} actif.</p>
        <p className="text-slate-600 text-xs mt-1">Activez des tests dans Scouting → Config.</p>
      </div>
    );

    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl">
        <div className="xl:col-span-1 space-y-6">
          <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4 italic">
              {type === "physique" ? "🏃 Physique" : "🏀 Technique"}
            </h3>
            <div className="space-y-4">
              {defs.map((test) => (
                <div key={test.id}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {test.name} ({test.unit})
                    <span className="ml-2 text-slate-600 normal-case font-normal">
                      {test.direction === "lower_is_better" ? "↓" : "↑"}
                    </span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input type="number" step="0.01" value={testValues[test.id] || ""}
                      onChange={(e) => setTestValues({ ...testValues, [test.id]: e.target.value })}
                      placeholder={`ex: ${test.baremes[localPlayer.category]?.thresholds[2] ?? "—"}`}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                    {testValues[test.id] && !isNaN(parseFloat(testValues[test.id])) && (
                      <ScoreBadge score={DetectionEngine.getRating(test.id, parseFloat(testValues[test.id]), localPlayer.category)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleSaveTests(type)}
              className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20">
              Calculer & Sauvegarder
            </button>
          </section>
          <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4 italic">Historique</h3>
            {renderHistory()}
          </section>
        </div>
        <div className="xl:col-span-2">
          <PlayerRadar data={getRadarData()} color="#f97316" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-slate-200">
      <header className="flex-none bg-zinc-900 border-b border-zinc-800 p-6 shadow-xl">
        <button onClick={onBack} className="text-orange-500 hover:text-orange-400 font-bold mb-6 flex items-center gap-2 transition-colors">
          <span className="text-xl">←</span> Retour
        </button>
        <div className="flex items-center gap-8">
          <PhotoUpload currentPhotoBase64={localPlayer.photoBase64} onPhotoChange={handlePhotoChange} />
          <div className="flex-1">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              {localPlayer.lastName} <span className="text-orange-500">{localPlayer.firstName}</span>
            </h1>
            <div className="flex gap-3 mt-3 text-sm font-semibold uppercase tracking-wider flex-wrap">
              <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-md">{localPlayer.category}</span>
              <span className="bg-zinc-800 text-slate-400 px-3 py-1 rounded-md border border-zinc-700">{localPlayer.club || "Club ?"}</span>
              {localPlayer.height && <span className="bg-zinc-800 text-slate-400 px-3 py-1 rounded-md border border-zinc-700">{localPlayer.height} cm</span>}
              {localPlayer.birthDate && <span className="bg-zinc-800 text-slate-400 px-3 py-1 rounded-md border border-zinc-700">Née {localPlayer.birthDate}</span>}
            </div>
          </div>
        </div>
      </header>

      <nav className="flex-none border-b border-zinc-800 bg-zinc-900/50 px-6">
        <div className="flex gap-8 -mb-px">
          {(["profil", "physique", "technique"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 font-bold uppercase text-xs tracking-widest border-b-2 transition-all ${
                activeTab === tab ? "border-orange-500 text-orange-500" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              {tab === "physique" ? "🏃 Physique" : tab === "technique" ? "🏀 Technique" : "👤 Profil"}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "profil" && (
          <div className="max-w-3xl space-y-6">
            <section className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
              <h3 className="text-xl font-bold text-white mb-6">Détails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Club</label>
                  <input type="text" defaultValue={localPlayer.club || ""} onBlur={(e) => saveChanges({ club: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Taille (cm)</label>
                  <input type="number" defaultValue={localPlayer.height || ""} onBlur={(e) => saveChanges({ height: parseInt(e.target.value) || null })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Date de naissance</label>
                  <input type="text" defaultValue={localPlayer.birthDate || ""} placeholder="JJ/MM/AAAA"
                    onBlur={(e) => saveChanges({ birthDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">N° Licence</label>
                  <input type="text" defaultValue={localPlayer.licence || ""} onBlur={(e) => saveChanges({ licence: e.target.value.trim() })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                </div>
              </div>
            </section>
            {localPlayer.ville && (
              <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4">Infos FBI</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {localPlayer.ville && <div><span className="text-xs text-slate-500 font-bold uppercase">Ville</span><p className="text-white">{localPlayer.ville}</p></div>}
                  {localPlayer.ligue && <div><span className="text-xs text-slate-500 font-bold uppercase">Ligue</span><p className="text-white">{localPlayer.ligue}</p></div>}
                  {localPlayer.numClub && <div><span className="text-xs text-slate-500 font-bold uppercase">N° Club</span><p className="text-white">{localPlayer.numClub}</p></div>}
                  {localPlayer.fbiCategory && <div><span className="text-xs text-slate-500 font-bold uppercase">Cat. FBI</span><p className="text-white">{localPlayer.fbiCategory}</p></div>}
                </div>
              </section>
            )}
          </div>
        )}
        {activeTab === "physique" && renderTestInputs("physique")}
        {activeTab === "technique" && renderTestInputs("technique")}
      </main>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 16 ? "text-green-400 bg-green-500/10 border-green-500/20" :
    score >= 12 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
    score >= 8 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    "text-red-400 bg-red-500/10 border-red-500/20";
  return <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black border ${c}`}>{score}</div>;
}
