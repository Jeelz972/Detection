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

  getAllTeams: function(): Team[] {
    return this.getDatabase().teams;
  },

  saveTeam: function(team: Team): Team[] {
    const db = this.getDatabase();
    const idx = db.teams.findIndex((t: Team) => t.id === team.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      db.teams[idx] = { ...team, updatedAt: now };
    } else {
      db.teams.push({ ...team, createdAt: team.createdAt || now, updatedAt: now });
    }
    this.saveDatabase(db);
    return db.teams;
  },

  deleteTeam: function(teamId: string): Team[] {
    const db = this.getDatabase();
    db.teams = db.teams.filter((t: Team) => t.id !== teamId);
    this.saveDatabase(db);
    return db.teams;
  },

  assignPlayerToTeam: function(
    playerId: string,
    teamId: string
  ): { ok: true; teams: Team[] } | { ok: false; reason: string } {
    const db = this.getDatabase();
    const player = db.players.find((p: any) => p.id === playerId);
    const team = db.teams.find((t: Team) => t.id === teamId);
    if (!player) return { ok: false, reason: "Joueuse introuvable." };
    if (!team) return { ok: false, reason: "Équipe introuvable." };

    const pi = categoryIndex(player.category);
    const ti = categoryIndex(team.category);
    if (ti < pi) return { ok: false, reason: "Sous-classement interdit." };
    if (ti > pi + 1) return { ok: false, reason: "Surclassement refusé (écart > 1 cran)." };

    const now = new Date().toISOString();
    db.teams = db.teams.map((t: Team) => {
      if (t.id === teamId) {
        const already = t.playerIds.includes(playerId);
        return already
          ? t
          : { ...t, playerIds: [...t.playerIds, playerId], updatedAt: now };
      }
      if (t.playerIds.includes(playerId)) {
        return { ...t, playerIds: t.playerIds.filter((id) => id !== playerId), updatedAt: now };
      }
      return t;
    });
    this.saveDatabase(db);
    return { ok: true, teams: db.teams };
  },

  removePlayerFromTeam: function(playerId: string, teamId: string): Team[] {
    const db = this.getDatabase();
    db.teams = db.teams.map((t: Team) =>
      t.id === teamId
        ? { ...t, playerIds: t.playerIds.filter((id: string) => id !== playerId), updatedAt: new Date().toISOString() }
        : t
    );
    this.saveDatabase(db);
    return db.teams;
  },

  rollOverSeason: function(): void {
    const db = this.getDatabase();
    const now = new Date().toISOString();
    db.players = db.players.map((p: any) => ({
      ...p,
      category: nextCategory(p.category as Category),
      updatedAt: now,
    }));
    db.teams = [];
    this.saveDatabase(db);
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
