// src/lib/dataManager.ts

const CABF_DATABASE = "cabf_database";

export const CATEGORY_ORDER = ["U11", "U13", "U15", "U18", "Senior"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export interface Team {
  id: string;
  name: string;
  category: Category;
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ═══ HELPERS CATÉGORIES ═══

export function categoryIndex(cat: string): number {
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(cat);
  return i === -1 ? 0 : i;
}

export function nextCategory(cat: Category): Category {
  if (cat === "Senior") return "Senior";
  const i = CATEGORY_ORDER.indexOf(cat);
  return CATEGORY_ORDER[i + 1];
}

export function canAssign(playerCategory: string, teamCategory: Category): boolean {
  const pi = categoryIndex(playerCategory);
  const ti = categoryIndex(teamCategory);
  return ti === pi || ti === pi + 1;
}

// ═══ CALCUL CATÉGORIE DEPUIS DATE DE NAISSANCE ═══

/**
 * Extrait l'année de naissance depuis une date en format DD/MM/YYYY, YYYY-MM-DD, ou Date.
 */
export function parseBirthYear(birthDate: any): number | null {
  if (!birthDate) return null;
  if (birthDate instanceof Date) return birthDate.getFullYear();
  const s = String(birthDate).trim();

  // DD/MM/YYYY
  const slashParts = s.split("/");
  if (slashParts.length === 3) {
    const y = parseInt(slashParts[2]);
    if (y > 1900 && y < 2100) return y;
  }
  // YYYY-MM-DD
  const dashParts = s.split("-");
  if (dashParts.length === 3) {
    const y = parseInt(dashParts[0]);
    if (y > 1900 && y < 2100) return y;
  }
  // Juste une année ?
  const num = parseInt(s);
  if (num > 1900 && num < 2100) return num;

  return null;
}

/**
 * Calcule la catégorie d'âge pour une saison donnée.
 * seasonYear = année civile de la fin de saison (ex: saison 2025-2026 → 2026)
 *
 * Logique FFBB :
 *   âge de référence = seasonYear - birthYear
 *   ≤ 11 → U11 | 12-13 → U13 | 14-15 → U15 | 16-18 → U18 | ≥ 19 → Senior
 */
export function categoryFromBirthYear(birthYear: number, seasonYear: number): Category {
  const age = seasonYear - birthYear;
  if (age <= 11) return "U11";
  if (age <= 13) return "U13";
  if (age <= 15) return "U15";
  if (age <= 18) return "U18";
  return "Senior";
}

/**
 * Calcule la catégorie d'une joueuse pour la saison en cours.
 * Retourne la catégorie existante si la date de naissance est absente.
 */
export function calculatePlayerCategory(player: any, seasonYear: number): Category {
  const birthYear = parseBirthYear(player.birthDate);
  if (!birthYear) return player.category || "U15";
  return categoryFromBirthYear(birthYear, seasonYear);
}

/**
 * Saison en cours : on considère que si on est entre septembre et décembre,
 * la saison est année courante → année+1. Sinon année-1 → année courante.
 * Le seasonYear (référence FFBB) est l'année de fin de saison.
 */
export function getCurrentSeasonYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-based
  const year = now.getFullYear();
  // Sept-Déc → saison year+1, Jan-Août → saison year
  return month >= 8 ? year + 1 : year;
}

export function getSeasonLabel(seasonYear: number): string {
  return `${seasonYear - 1}-${seasonYear}`;
}

// ═══ MAPPING FBI ═══

export const FBI_TO_APP_CATEGORY: Record<string, Category> = {
  U7: "U11", U8: "U11", U9: "U11", U10: "U11", U11: "U11",
  U12: "U13", U13: "U13",
  U14: "U15", U15: "U15",
  U16: "U18", U17: "U18", U18: "U18",
  U19: "Senior", U20: "Senior", U21: "Senior", S: "Senior",
};

export function mapFbiCategory(fbiCat: string): Category {
  return FBI_TO_APP_CATEGORY[fbiCat] || "U15";
}

export const FBI_COLS = {
  ligue: 0, comite: 1, numClub: 2, club: 3,
  numNational: 6, nom: 7, prenom: 8, dateNaissance: 9,
  lieuNaissance: 11, sexe: 12, licence: 13,
  dateQualif: 15, categorie: 16, typeLicence: 17,
  typeAssurance: 18, dateCertifMed: 19, dateFinCertifMed: 20,
  adresse: 21, complementAdresse: 22, cp: 23, ville: 24,
  nationalite: 25, taille: 26, email: 27, portable: 28,
} as const;

export const FBI_HEADER_ROW_INDEX = 8;

export function excelDateToString(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) {
    return `${String(val.getDate()).padStart(2, "0")}/${String(val.getMonth() + 1).padStart(2, "0")}/${val.getFullYear()}`;
  }
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return String(val);
}

export function generateId(prefix: string = "ply"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ═══ DATAMANAGER ═══

export const DataManager = {
  getDatabase: function () {
    const raw = localStorage.getItem(CABF_DATABASE);
    const parsed = raw ? JSON.parse(raw) : { players: [], teams: [] };
    if (!parsed.teams) parsed.teams = [];
    if (!parsed.players) parsed.players = [];
    return parsed;
  },

  saveDatabase: function (db: any) {
    try {
      localStorage.setItem(CABF_DATABASE, JSON.stringify(db));
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        alert("Erreur : La mémoire locale est pleine.");
      }
    }
  },

  // ── Players ──

  getAllPlayers: function () {
    return this.getDatabase().players;
  },

  savePlayer: function (playerData: any) {
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

  deletePlayer: function (playerId: string) {
    const db = this.getDatabase();
    db.players = db.players.filter((p: any) => p.id !== playerId);
    const now = new Date().toISOString();
    db.teams = db.teams.map((t: Team) =>
      t.playerIds.includes(playerId)
        ? { ...t, playerIds: t.playerIds.filter((id: string) => id !== playerId), updatedAt: now }
        : t,
    );
    this.saveDatabase(db);
    return db.players;
  },

  // ── Teams ──

  getAllTeams: function (): Team[] {
    return this.getDatabase().teams;
  },

  saveTeam: function (team: Team): Team[] {
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

  deleteTeam: function (teamId: string): Team[] {
    const db = this.getDatabase();
    db.teams = db.teams.filter((t: Team) => t.id !== teamId);
    this.saveDatabase(db);
    return db.teams;
  },

  assignPlayerToTeam: function (
    playerId: string,
    teamId: string,
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
        return already ? t : { ...t, playerIds: [...t.playerIds, playerId], updatedAt: now };
      }
      if (t.playerIds.includes(playerId)) {
        return { ...t, playerIds: t.playerIds.filter((id) => id !== playerId), updatedAt: now };
      }
      return t;
    });
    this.saveDatabase(db);
    return { ok: true, teams: db.teams };
  },

  removePlayerFromTeam: function (playerId: string, teamId: string): Team[] {
    const db = this.getDatabase();
    db.teams = db.teams.map((t: Team) =>
      t.id === teamId
        ? { ...t, playerIds: t.playerIds.filter((id: string) => id !== playerId), updatedAt: new Date().toISOString() }
        : t,
    );
    this.saveDatabase(db);
    return db.teams;
  },

  /**
   * Prépare la saison prochaine :
   * 1. Recalcule toutes les catégories depuis la date de naissance + saison N+1
   * 2. Vide toutes les équipes
   */
  prepareNextSeason: function (): { seasonLabel: string; updatedCount: number } {
    const db = this.getDatabase();
    const currentSeasonYear = getCurrentSeasonYear();
    const nextSeasonYear = currentSeasonYear + 1;
    const now = new Date().toISOString();
    let updatedCount = 0;

    db.players = db.players.map((p: any) => {
      const newCat = calculatePlayerCategory(p, nextSeasonYear);
      if (newCat !== p.category) updatedCount++;
      return { ...p, category: newCat, updatedAt: now };
    });

    db.teams = [];
    this.saveDatabase(db);
    return { seasonLabel: getSeasonLabel(nextSeasonYear), updatedCount };
  },

  /**
   * Recalcule les catégories de toutes les joueuses pour la saison en cours
   * (utile après un import FBI pour corriger les catégories).
   */
  recalculateAllCategories: function (): number {
    const db = this.getDatabase();
    const seasonYear = getCurrentSeasonYear();
    const now = new Date().toISOString();
    let updated = 0;

    db.players = db.players.map((p: any) => {
      const newCat = calculatePlayerCategory(p, seasonYear);
      if (newCat !== p.category) {
        updated++;
        return { ...p, category: newCat, updatedAt: now };
      }
      return p;
    });

    this.saveDatabase(db);
    return updated;
  },

  // ── Import FBI ──

  importFbiPlayers: function (players: any[]): { added: number; skipped: number } {
    const db = this.getDatabase();
    const existingLicences = new Set(db.players.map((p: any) => p.licence).filter(Boolean));
    let added = 0;
    let skipped = 0;

    const seasonYear = getCurrentSeasonYear();

    players.forEach((p) => {
      if (p.licence && existingLicences.has(p.licence)) {
        skipped++;
        return;
      }
      // Recalculer la catégorie depuis la date de naissance
      const correctedCategory = calculatePlayerCategory(p, seasonYear);
      db.players.unshift({ ...p, category: correctedCategory });
      if (p.licence) existingLicences.add(p.licence);
      added++;
    });

    this.saveDatabase(db);
    return { added, skipped };
  },

  // ── Export ──

  exportToJson: function () {
    const db = this.getDatabase();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `cabf_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};
