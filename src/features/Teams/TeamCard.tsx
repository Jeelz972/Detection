import React, { useState } from "react";
import { Team } from "../../lib/dataManager";
import PlayerChip from "./PlayerChip";

interface Props {
  team: Team;
  players: any[];
  onDropPlayer: (playerId: string, fromTeamId: string | null) => void;
  onRename: (teamId: string, newName: string) => void;
  onDelete: (teamId: string) => void;
}

export default function TeamCard({ team, players, onDropPlayer, onRename, onDelete }: Props) {
  const [ringColor, setRingColor] = useState<"none" | "ok">("none");

  const ringClass = ringColor === "ok" ? "ring-2 ring-orange-500" : "";

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("application/x-cabf-player")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setRingColor("ok");
  };

  const onDragLeave = () => setRingColor("none");

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setRingColor("none");
    const raw = e.dataTransfer.getData("application/x-cabf-player");
    if (!raw) return;
    try {
      const { playerId, fromTeamId } = JSON.parse(raw);
      onDropPlayer(playerId, fromTeamId ?? null);
    } catch {}
  };

  const handleRename = () => {
    const next = window.prompt("Renommer l'équipe :", team.name);
    if (next && next.trim() && next.trim() !== team.name) {
      onRename(team.id, next.trim());
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer l'équipe "${team.name}" ?`)) {
      onDelete(team.id);
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-shadow ${ringClass}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-black uppercase tracking-widest text-white truncate">{team.name}</h3>
          <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
            {team.category}
          </span>
          <span className="text-[10px] text-slate-500">· {team.playerIds.length}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={handleRename} title="Renommer" className="text-slate-500 hover:text-white text-sm">✏️</button>
          <button onClick={handleDelete} title="Supprimer" className="text-slate-500 hover:text-red-400 text-sm">🗑</button>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-xs text-slate-600 italic py-6 text-center border border-dashed border-zinc-800 rounded-lg">
          Déposer des joueuses ici
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <PlayerChip key={p.id} player={p} fromTeamId={team.id} teamCategory={team.category} />
          ))}
        </div>
      )}
    </div>
  );
}
