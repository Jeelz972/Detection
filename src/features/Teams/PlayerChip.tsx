import React from "react";

export interface PlayerChipProps {
  player: { id: string; firstName: string; lastName: string; category: string; photoBase64?: string };
  fromTeamId?: string | null;
  teamCategory?: string;
}

export default function PlayerChip({ player, fromTeamId = null, teamCategory }: PlayerChipProps) {
  const isSurclassed = teamCategory && teamCategory !== player.category;

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/x-cabf-player",
      JSON.stringify({ playerId: player.id, fromTeamId })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const initials = `${(player.firstName || "?")[0]}${(player.lastName || "?")[0]}`.toUpperCase();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 p-2 bg-zinc-950 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:border-orange-500/50 transition-colors"
    >
      {player.photoBase64 ? (
        <img src={player.photoBase64} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-slate-400">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {player.category}
          {isSurclassed && (
            <span className="text-orange-400 font-black">⬆ surclassée</span>
          )}
        </div>
      </div>
    </div>
  );
}
