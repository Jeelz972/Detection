const CABF_DATABASE = 'cabf_database';

export const CATEGORY_ORDER = ['U11', 'U13', 'U15', 'U18', 'Senior'] as const;
export type Category = typeof CATEGORY_ORDER[number];

export interface Team {
  id: string;
  name: string;
  category: Category;
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function categoryIndex(cat: string): number {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(cat);
  return i === -1 ? 0 : i;
}

export function nextCategory(cat: Category): Category {
  if (cat === 'Senior') return 'Senior';
  const i = CATEGORY_ORDER.indexOf(cat);
  return CATEGORY_ORDER[i + 1];
}

export function canAssign(playerCategory: string, teamCategory: Category): boolean {
  const pi = categoryIndex(playerCategory);
  const ti = categoryIndex(teamCategory);
  return ti === pi || ti === pi + 1;
}

export const DataManager = {
  getDatabase: function() {
    const raw = localStorage.getItem(CABF_DATABASE);
    const parsed = raw ? JSON.parse(raw) : { players: [], teams: [] };
    if (!parsed.teams) parsed.teams = [];
    if (!parsed.players) parsed.players = [];
    return parsed;
  },

  saveDatabase: function(db: any) {
    try {
      localStorage.setItem(CABF_DATABASE, JSON.stringify(db));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        alert("Erreur : La mémoire locale est pleine. Essayez de compresser les photos.");
      }
    }
  },

  getAllPlayers: function() {
    return this.getDatabase().players;
  },

  savePlayer: function(playerData: any) {
    const db = this.getDatabase();
    const index = db.players.findIndex((p: any) => p.id === playerData.id);
    if (index >= 0) {
      db.players[index] = { ...db.players[index], ...playerData };
    } else {
      db.players.unshift(playerData);
    }
    this.saveDatabase(db);
    return db.players;
  },

  deletePlayer: function(playerId: string) {
    const db = this.getDatabase();
    db.players = db.players.filter((p: any) => p.id !== playerId);
    const now = new Date().toISOString();
    db.teams = db.teams.map((t: Team) =>
      t.playerIds.includes(playerId)
        ? { ...t, playerIds: t.playerIds.filter((id: string) => id !== playerId), updatedAt: now }
        : t
    );
    this.saveDatabase(db);
    return db.players;
  },

  exportToJson: function() {
    const db = this.getDatabase();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `cabf_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  },
};
