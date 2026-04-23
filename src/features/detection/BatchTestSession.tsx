// src/features/Detection/BatchTestSession.tsx
import React, { useState, useEffect, useMemo } from "react";
import { DataManager, CATEGORY_ORDER, categoryIndex } from "../../lib/dataManager";
import { DetectionEngine } from "../../lib/detectionEngine";
import { getActiveTests, type TestDefinition } from "../../lib/testsConfig";

type SortKey = "name" | "category" | "club";
type SortDir = "asc" | "desc";

export default function BatchTestSession() {
  const [players, setPlayers] = useState<any[]>([]);
  const [activeTests] = useState(() => getActiveTests());
  const allActive = useMemo(() => [...activeTests.physique, ...activeTests.technique], [activeTests]);

  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(CATEGORY_ORDER as unknown as string[]));
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => { setPlayers(DataManager.getAllPlayers()); }, []);

  const toggleTest = (id: string) => {
    const next = new Set(selectedTestIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTestIds(next);
  };

  const toggleCat = (cat: string) => {
    const next = new Set(selectedCats);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setSelectedCats(next);
  };

  const selectedTests = allActive.filter((t) => selectedTestIds.has(t.id));

  // Filtrage + tri
  const filteredPlayers = useMemo(() => {
    let list = players.filter((p) => selectedCats.has(p.category));

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case "category":
          cmp = categoryIndex(a.category) - categoryIndex(b.category);
          break;
        case "club":
          cmp = (a.club || "").localeCompare(b.club || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [players, selectedCats, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="text-orange-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const updateValue = (playerId: string, testId: string, val: string) => {
    setValues((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [testId]: val } }));
  };

  const getScore = (player: any, test: TestDefinition, rawVal: string): number | null => {
    const v = parseFloat(rawVal);
    if (isNaN(v) || v <= 0) return null;
    return DetectionEngine.getRating(test.id, v, player.category);
  };

  const handleSaveAll = () => {
    const today = new Date().toISOString().split("T")[0];
    let savedCount = 0;

    filteredPlayers.forEach((player) => {
      const playerValues = values[player.id];
      if (!playerValues) return;

      const testsResults: Record<string, { value: number; score: number }> = {};
      let hasData = false;

      selectedTests.forEach((test) => {
        const raw = playerValues[test.id];
        const val = parseFloat(raw);
        if (!isNaN(val) && val > 0) {
          testsResults[test.name] = { value: val, score: DetectionEngine.getRating(test.id, val, player.category) };
          hasData = true;
        }
      });

      if (!hasData) return;

      const sessions = [...(player.physicalSessions || [])];
      const todayIdx = sessions.findIndex((s: any) => s.date === today);
      if (todayIdx >= 0) {
        sessions[todayIdx] = { ...sessions[todayIdx], tests: { ...sessions[todayIdx].tests, ...testsResults } };
      } else {
        sessions.push({ date: today, tests: testsResults });
      }

      DataManager.savePlayer({ ...player, physicalSessions: sessions, updatedAt: new Date().toISOString() });
      savedCount++;
    });

    setPlayers(DataManager.getAllPlayers());
    setSaveResult(`${savedCount} joueuse(s) mises à jour`);
    setTimeout(() => setSaveResult(null), 4000);
    setValues({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
          Session de <span className="text-orange-500">tests</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Sélectionnez les tests et catégories, puis saisissez les données pour toutes les joueuses.
        </p>
      </div>

      {/* SÉLECTION DES TESTS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tests à évaluer</h3>
        {allActive.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Aucun test actif. Configurez vos tests dans l'onglet Config.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allActive.map((test) => (
              <button key={test.id} onClick={() => toggleTest(test.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedTestIds.has(test.id)
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-zinc-800 text-slate-400 border border-zinc-700 hover:border-zinc-600"
                }`}>
                {test.direction === "lower_is_better" ? "⏱" : "📏"} {test.name} ({test.unit})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SÉLECTION DES CATÉGORIES */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Catégories</h3>
        <div className="flex gap-2">
          {CATEGORY_ORDER.map((cat) => {
            const count = players.filter((p) => p.category === cat).length;
            return (
              <button key={cat} onClick={() => toggleCat(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCats.has(cat)
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-zinc-800 text-slate-500 border border-zinc-700"
                }`}>
                {cat} <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLEAU DE SAISIE */}
      {selectedTests.length > 0 && filteredPlayers.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Barre d'actions */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-slate-400 font-bold">
              {filteredPlayers.length} joueuse(s) · {selectedTests.length} test(s)
            </span>
            <div className="flex items-center gap-3">
              {/* Tri rapide */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-bold mr-1">Trier :</span>
                {([
                  { key: "name" as SortKey, label: "Nom" },
                  { key: "category" as SortKey, label: "Cat." },
                  { key: "club" as SortKey, label: "Club" },
                ]).map((opt) => (
                  <button key={opt.key} onClick={() => handleSort(opt.key)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                      sortKey === opt.key ? "bg-zinc-800 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}>
                    {opt.label}{sortArrow(opt.key)}
                  </button>
                ))}
              </div>
              <button onClick={handleSaveAll}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20">
                💾 Sauvegarder tout
              </button>
            </div>
          </div>

          {saveResult && (
            <div className="bg-green-500/10 border-b border-green-500/20 text-green-400 px-4 py-2 text-sm font-bold">
              ✅ {saveResult}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest sticky left-0 bg-zinc-900 z-10 min-w-[200px] cursor-pointer select-none"
                    onClick={() => handleSort("name")}>
                    Joueuse {sortArrow("name")}
                  </th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest w-16 cursor-pointer select-none"
                    onClick={() => handleSort("category")}>
                    Cat. {sortArrow("category")}
                  </th>
                  {selectedTests.map((test) => (
                    <th key={test.id} className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center min-w-[140px]">
                      <div>{test.name}</div>
                      <div className="text-[10px] text-slate-600 normal-case font-normal">({test.unit})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr key={player.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 sticky left-0 bg-zinc-900 z-10">
                      <div className="font-bold text-white text-xs uppercase">{player.lastName} {player.firstName}</div>
                      <div className="text-[10px] text-slate-600">{player.club || "—"}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-bold">{player.category}</span>
                    </td>
                    {selectedTests.map((test) => {
                      const rawVal = values[player.id]?.[test.id] || "";
                      const score = getScore(player, test, rawVal);
                      return (
                        <td key={test.id} className="p-2">
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.01" value={rawVal}
                              onChange={(e) => updateValue(player.id, test.id, e.target.value)}
                              placeholder="—"
                              className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-center text-xs focus:border-orange-500 outline-none" />
                            {score !== null && (
                              <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                                score >= 16 ? "text-green-400 bg-green-500/10" :
                                score >= 12 ? "text-orange-400 bg-orange-500/10" :
                                score >= 8 ? "text-yellow-400 bg-yellow-500/10" :
                                "text-red-400 bg-red-500/10"
                              }`}>{score}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPTY STATES */}
      {selectedTests.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500">Sélectionnez au moins un test pour commencer la session</p>
        </div>
      )}
      {selectedTests.length > 0 && filteredPlayers.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-slate-500">Aucune joueuse dans les catégories sélectionnées</p>
        </div>
      )}
    </div>
  );
}
