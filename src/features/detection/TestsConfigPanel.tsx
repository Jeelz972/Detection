// src/features/Detection/TestsConfigPanel.tsx
import React, { useState, useEffect } from "react";
import { CATEGORY_ORDER } from "../../lib/dataManager";
import { loadTestsConfig, saveTestsConfig, type TestDefinition, type TestsConfig } from "../../lib/testsConfig";

export default function TestsConfigPanel() {
  const [config, setConfig] = useState<TestsConfig>(() => loadTestsConfig());
  const [activeType, setActiveType] = useState<"physique" | "technique">("physique");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const persist = (next: TestsConfig) => { setConfig(next); saveTestsConfig(next); };
  const currentTests = config[activeType];

  const toggleActive = (testId: string) => {
    const updated = currentTests.map((t) => t.id === testId ? { ...t, active: !t.active } : t);
    persist({ ...config, [activeType]: updated });
  };

  const deleteTest = (testId: string) => {
    if (!window.confirm("Supprimer ce test et son barème ?")) return;
    persist({ ...config, [activeType]: currentTests.filter((t) => t.id !== testId) });
  };

  const saveTest = (test: TestDefinition) => {
    const idx = currentTests.findIndex((t) => t.id === test.id);
    const list = idx >= 0 ? currentTests.map((t, i) => i === idx ? test : t) : [...currentTests, test];
    persist({ ...config, [activeType]: list });
    setEditingId(null);
    setShowNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            Config <span className="text-orange-500">Tests</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">Créez et configurez vos tests d'évaluation et leurs barèmes</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditingId(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20">
          + Nouveau test
        </button>
      </div>

      {/* TYPE TOGGLE */}
      <div className="flex gap-2">
        {([
          { id: "physique" as const, label: "🏃 Physique", count: config.physique.length },
          { id: "technique" as const, label: "🏀 Technique", count: config.technique.length },
        ]).map((t) => (
          <button key={t.id} onClick={() => { setActiveType(t.id); setShowNew(false); setEditingId(null); }}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeType === t.id ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-zinc-900 text-slate-500 border border-zinc-800"
            }`}>
            {t.label} <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      {/* TESTS LIST */}
      <div className="space-y-4">
        {currentTests.map((test) => (
          <TestCard key={test.id} test={test} isEditing={editingId === test.id}
            onToggleActive={() => toggleActive(test.id)}
            onEdit={() => setEditingId(editingId === test.id ? null : test.id)}
            onDelete={() => deleteTest(test.id)}
            onSave={saveTest} />
        ))}
      </div>

      {showNew && <NewTestForm type={activeType} onSave={saveTest} onCancel={() => setShowNew(false)} />}

      {currentTests.length === 0 && !showNew && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
          <div className="text-4xl mb-3">{activeType === "physique" ? "🏃" : "🏀"}</div>
          <p className="text-slate-500">Aucun test {activeType} configuré</p>
        </div>
      )}
    </div>
  );
}

// ═══ TEST CARD ═══
function TestCard({ test, isEditing, onToggleActive, onEdit, onDelete, onSave }: {
  test: TestDefinition; isEditing: boolean;
  onToggleActive: () => void; onEdit: () => void; onDelete: () => void;
  onSave: (t: TestDefinition) => void;
}) {
  const [local, setLocal] = useState(test);
  useEffect(() => setLocal(test), [test]);

  const updateThreshold = (cat: string, idx: number, val: string) => {
    const next = { ...local, baremes: { ...local.baremes } };
    next.baremes[cat] = { ...next.baremes[cat], thresholds: [...next.baremes[cat].thresholds] };
    next.baremes[cat].thresholds[idx] = parseFloat(val) || 0;
    setLocal(next);
  };

  const updateScore = (cat: string, idx: number, val: string) => {
    const next = { ...local, baremes: { ...local.baremes } };
    next.baremes[cat] = { ...next.baremes[cat], scores: [...next.baremes[cat].scores] };
    next.baremes[cat].scores[idx] = parseInt(val) || 0;
    setLocal(next);
  };

  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
      isEditing ? "border-orange-500/50 ring-1 ring-orange-500/20" : test.active ? "border-zinc-800" : "border-zinc-800 opacity-50"
    }`}>
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Toggle actif */}
          <button onClick={onToggleActive} title={test.active ? "Désactiver" : "Activer"}
            className={`h-6 w-11 rounded-full transition-all flex-shrink-0 relative ${
              test.active ? "bg-orange-500" : "bg-zinc-700"
            }`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              test.active ? "left-[22px]" : "left-0.5"
            }`} />
          </button>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{test.name}</h3>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] bg-zinc-800 text-slate-500 px-2 py-0.5 rounded font-bold">{test.unit}</span>
              <span className="text-[10px] bg-zinc-800 text-slate-500 px-2 py-0.5 rounded font-bold">
                {test.direction === "lower_is_better" ? "↓ Bas=mieux" : "↑ Haut=mieux"}
              </span>
              {!test.active && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">Inactif</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEdit}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isEditing ? "bg-orange-500 text-white" : "bg-zinc-800 text-slate-400 hover:text-white"
            }`}>
            {isEditing ? "Fermer" : "✏️ Barème"}
          </button>
          <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-zinc-800 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all">🗑</button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-zinc-800 p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase w-20">Cat.</th>
                  {(local.baremes[CATEGORY_ORDER[0]]?.thresholds || []).map((_, i) => (
                    <th key={i} className="pb-3 text-xs font-bold text-slate-500 text-center" colSpan={2}>Palier {i + 1}</th>
                  ))}
                </tr>
                <tr>
                  <th></th>
                  {(local.baremes[CATEGORY_ORDER[0]]?.thresholds || []).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="pb-2 text-[10px] text-slate-600 text-center">Seuil</th>
                      <th className="pb-2 text-[10px] text-slate-600 text-center">Note</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map((cat) => {
                  const b = local.baremes[cat];
                  if (!b) return null;
                  return (
                    <tr key={cat} className="border-t border-zinc-800/50">
                      <td className="py-2"><span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-bold">{cat}</span></td>
                      {b.thresholds.map((thr, i) => (
                        <React.Fragment key={i}>
                          <td className="py-2 px-1">
                            <input type="number" step="0.01" value={thr} onChange={(e) => updateThreshold(cat, i, e.target.value)}
                              className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-white text-center text-xs focus:border-orange-500 outline-none" />
                          </td>
                          <td className="py-2 px-1">
                            <input type="number" value={b.scores[i]} onChange={(e) => updateScore(cat, i, e.target.value)}
                              className="w-12 bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-orange-400 text-center text-xs font-bold focus:border-orange-500 outline-none" />
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => onSave(local)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2 rounded-xl transition-all">
              💾 Sauvegarder le barème
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="border-t border-zinc-800/50 px-5 py-3 flex gap-6 overflow-x-auto">
          {CATEGORY_ORDER.map((cat) => {
            const b = test.baremes?.[cat];
            if (!b) return null;
            const best = test.direction === "lower_is_better" ? b.thresholds[0] : b.thresholds[b.thresholds.length - 1];
            return (
              <div key={cat} className="text-center flex-shrink-0">
                <div className="text-[10px] text-slate-600 font-bold uppercase">{cat}</div>
                <div className="text-xs text-slate-400 font-mono">{best}{test.unit} = <span className="text-orange-400 font-bold">20</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ NEW TEST FORM ═══
function NewTestForm({ type, onSave, onCancel }: {
  type: string; onSave: (t: TestDefinition) => void; onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("s");
  const [direction, setDirection] = useState<"lower_is_better" | "higher_is_better">("lower_is_better");
  const [palierCount, setPalierCount] = useState(5);

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const baremes: Record<string, { thresholds: number[]; scores: number[] }> = {};

    CATEGORY_ORDER.forEach((cat) => {
      if (direction === "lower_is_better") {
        baremes[cat] = {
          thresholds: Array.from({ length: palierCount }, (_, i) => +(5 + i * 0.5).toFixed(2)),
          scores: Array.from({ length: palierCount }, (_, i) => Math.max(20 - i * 4, 0)),
        };
      } else {
        baremes[cat] = {
          thresholds: Array.from({ length: palierCount }, (_, i) => (i + 1) * 5),
          scores: Array.from({ length: palierCount }, (_, i) => Math.min((i + 1) * 4, 20)),
        };
      }
    });

    onSave({ id, name: name.trim(), unit, direction, active: true, baremes });
  };

  return (
    <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-6 space-y-5">
      <h3 className="text-lg font-bold text-white">
        Nouveau test {type === "physique" ? "physique" : "technique"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom du test</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Sprint 40m"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Unité</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none">
            {["s", "cm", "m", "pts", "/20", "/10", "palier", "rep", "kg"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as any)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none">
            <option value="lower_is_better">↓ Plus bas = meilleur (sprint)</option>
            <option value="higher_is_better">↑ Plus haut = meilleur (détente)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paliers: {palierCount}</label>
        <input type="range" min="3" max="8" value={palierCount} onChange={(e) => setPalierCount(parseInt(e.target.value))} className="w-full accent-orange-500" />
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-5 py-2 rounded-xl bg-zinc-800 text-slate-400 font-bold hover:text-white transition-all">Annuler</button>
        <button onClick={handleCreate} disabled={!name.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-white font-black px-6 py-2 rounded-xl transition-all">
          Créer & configurer le barème →
        </button>
      </div>
    </div>
  );
}
