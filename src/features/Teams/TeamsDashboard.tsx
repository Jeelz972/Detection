import React, { useEffect, useMemo, useState } from "react";
import { DataManager, CATEGORY_ORDER, Category, Team } from "../../lib/dataManager";
import PlayerChip from "./PlayerChip";
import TeamCard from "./TeamCard";
import NewTeamModal from "./NewTeamModal";

export default function TeamsDashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filterCat, setFilterCat] = useState<"ALL" | Category>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [poolRing, setPoolRing] = useState(false);

  const refresh = () => {
    setPlayers(DataManager.getAllPlayers());
    setTeams(DataManager.getAllTeams());
  };

  useEffect(() => {
    refresh();
  }, []);

  const assignedIds = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.playerIds.forEach((id) => s.add(id)));
    return s;
  }, [teams]);

  const playersById = useMemo(() => {
    const m: Record<string, any> = {};
    players.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [players]);

  const availablePlayers = useMemo(() => {
    return players
      .filter((p) => !assignedIds.has(p.id))
      .filter((p) => filterCat === "ALL" || p.category === filterCat);
  }, [players, assignedIds, filterCat]);

  const handleCreateTeam = (name: string, category: Category) => {
    const id = `tm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    DataManager.saveTeam({ id, name, category, playerIds: [], createdAt: now, updatedAt: now });
    setModalOpen(false);
    refresh();
  };

  const handleDropOnTeam = (playerId: string, teamId: string) => {
    const res = DataManager.assignPlayerToTeam(playerId, teamId);
    if (!res.ok) alert(res.reason);
    refresh();
  };

  const handleRename = (teamId: string, newName: string) => {
    const t = teams.find((x) => x.id === teamId);
    if (!t) return;
    DataManager.saveTeam({ ...t, name: newName });
    refresh();
  };

  const handleDeleteTeam = (teamId: string) => {
    DataManager.deleteTeam(teamId);
    refresh();
  };

  const handlePoolDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPoolRing(false);
    const raw = e.dataTransfer.getData("application/x-cabf-player");
    if (!raw) return;
    try {
      const { playerId, fromTeamId } = JSON.parse(raw);
      if (fromTeamId) {
        DataManager.removePlayerFromTeam(playerId, fromTeamId);
        refresh();
      }
    } catch {}
  };

  const handlePoolDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("application/x-cabf-player")) return;
    e.preventDefault();
    setPoolRing(true);
  };

  const handleRollOver = () => {
    const msg = `Fin de saison : toutes les joueuses vont vieillir d'un cran (U13→U15, etc.) et les ${teams.length} équipes seront supprimées. Continuer ?`;
    if (!window.confirm(msg)) return;
    DataManager.rollOverSeason();
    refresh();
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-none">
        <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">
          Équipes <span className="text-orange-500">·</span>
          <span className="text-slate-500 text-sm ml-2">{teams.length} créée(s)</span>
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600"
          >
            + Nouvelle équipe
          </button>
          <button
            onClick={handleRollOver}
            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-zinc-800 text-slate-300 hover:bg-zinc-700"
            title="Vieillir les joueuses et repartir à zéro côté équipes"
          >
            🗓 Fin de saison
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        <div
          onDragOver={handlePoolDragOver}
          onDragLeave={() => setPoolRing(false)}
          onDrop={handlePoolDrop}
          className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-0 ${poolRing ? "ring-2 ring-orange-500" : ""}`}
        >
          <div className="flex items-center justify-between mb-3 flex-none">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">
              Disponibles · {availablePlayers.length}
            </h2>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as "ALL" | Category)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">Toutes</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-auto flex flex-col gap-2 pr-1">
            {availablePlayers.length === 0 ? (
              <div className="text-xs text-slate-600 italic py-6 text-center">Aucune joueuse disponible.</div>
            ) : (
              availablePlayers.map((p) => <PlayerChip key={p.id} player={p} fromTeamId={null} />)
            )}
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-0">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-3 flex-none">Équipes</h2>
          <div className="flex-1 overflow-auto flex flex-col gap-3 pr-1">
            {teams.length === 0 ? (
              <div className="text-xs text-slate-600 italic py-6 text-center">Aucune équipe créée.</div>
            ) : (
              teams.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  players={t.playerIds.map((id) => playersById[id]).filter(Boolean)}
                  onDropPlayer={(pid, _fromTeamId) => handleDropOnTeam(pid, t.id)}
                  onRename={handleRename}
                  onDelete={handleDeleteTeam}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {modalOpen && <NewTeamModal onClose={() => setModalOpen(false)} onCreate={handleCreateTeam} />}
    </div>
  );
}
