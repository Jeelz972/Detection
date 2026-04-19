# Teams, Stats, rollOverSeason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un module Équipes avec drag & drop, un module Statistiques avec 2 `BarChart`, et étendre `DataManager` pour gérer les équipes et la bascule de saison.

**Architecture:** Extension du `DataManager` existant (localStorage `cabf_database`) avec un champ `teams`. Le module Équipes utilise l'API HTML5 Drag & Drop native (pas de dépendance ajoutée). Le module Stats utilise `recharts` (déjà installé). Toutes les règles métier (surclassement, unicité, rollover) vivent dans `DataManager` pour garder les composants dumb.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v3, recharts 3.8.

**Spec:** [docs/superpowers/specs/2026-04-19-teams-stats-rollover-design.md](../specs/2026-04-19-teams-stats-rollover-design.md)

**Note testing:** Le projet n'a pas de framework de tests auto. Chaque tâche se termine par un **smoke test manuel** précis (commandes console + interactions UI) avant commit. Lance `npm run dev` au début et garde l'onglet ouvert.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/dataManager.ts` | MODIFY | DB étendue (`teams`), helpers catégorie, méthodes équipes, `rollOverSeason`, nettoyage `deletePlayer` |
| `src/features/Teams/PlayerChip.tsx` | CREATE | Carte joueuse draggable (réutilisée pool + équipe) |
| `src/features/Teams/NewTeamModal.tsx` | CREATE | Modal création (nom + catégorie) |
| `src/features/Teams/TeamCard.tsx` | CREATE | Carte équipe (dropzone + liste + rename + delete) |
| `src/features/Teams/TeamsDashboard.tsx` | CREATE | Vue 2 colonnes + header + `rollOverSeason` button |
| `src/features/Stats/useStatsData.ts` | CREATE | Hook d'agrégation `byClub` + `byCategory` |
| `src/features/Stats/StatsDashboard.tsx` | CREATE | 2 `BarChart` recharts |
| `src/app.tsx` | MODIFY | Ajout onglet `teams`, branche `StatsDashboard` |

---

## Task 1 : Helpers catégorie + type `Team` dans `DataManager`

**Files:**
- Modify: `src/lib/dataManager.ts`

- [ ] **Step 1: Ouvrir le fichier existant et relire l'état actuel**

Relire [src/lib/dataManager.ts](../../src/lib/dataManager.ts) en entier (58 lignes).

- [ ] **Step 2: Ajouter les types et helpers en tête de fichier**

Remplacer le contenu actuel par la version étendue suivante (en conservant toutes les méthodes existantes, on ajoute seulement) :

```ts
// src/lib/dataManager.ts

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
    db.teams = db.teams.map((t: Team) => ({
      ...t,
      playerIds: t.playerIds.filter((id: string) => id !== playerId),
      updatedAt: new Date().toISOString(),
    }));
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
```

- [ ] **Step 3: Smoke test — migration douce**

Dans la console du navigateur (après `npm run dev`) :

```js
localStorage.setItem('cabf_database', JSON.stringify({players:[{id:'p1',firstName:'Test'}]}));
// Recharger la page
// Puis:
JSON.parse(localStorage.getItem('cabf_database'))
```

Attendu : `{players: [{id:'p1',...}], teams: []}` après une lecture via `DataManager.getDatabase()` (appelée lors du Roster mount). Sinon, inspecter : la migration est lazy, exécute en console `window.location.reload()` après une visite du Roster.

- [ ] **Step 4: Smoke test — helpers**

Dans la console :

```js
// (Si besoin, les exporter globalement pour tester : ajouter temporairement window.DM = DataManager)
// Ou tester via un fichier éphémère. Plus simple : vérifier visuellement dans le code.
```

Vérifier à la relecture : `nextCategory('U13') === 'U15'`, `nextCategory('Senior') === 'Senior'`, `canAssign('U13','U15') === true`, `canAssign('U11','U15') === false`, `canAssign('U15','U13') === false`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dataManager.ts
git commit -m "feat(data): add Team type, category helpers, and deletePlayer team cleanup"
```

---

## Task 2 : Méthodes `teams` dans `DataManager`

**Files:**
- Modify: `src/lib/dataManager.ts`

- [ ] **Step 1: Ajouter les méthodes équipes**

Ajouter dans l'objet `DataManager` (juste avant `exportToJson`) :

```ts
  getAllTeams: function(): Team[] {
    return this.getDatabase().teams;
  },

  saveTeam: function(team: Team): Team[] {
    const db = this.getDatabase();
    const idx = db.teams.findIndex((t: Team) => t.id === team.id);
    const updated = { ...team, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      db.teams[idx] = updated;
    } else {
      db.teams.push({ ...updated, createdAt: updated.createdAt || new Date().toISOString() });
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
        return {
          ...t,
          playerIds: already ? t.playerIds : [...t.playerIds, playerId],
          updatedAt: now,
        };
      }
      if (t.playerIds.includes(playerId)) {
        return {
          ...t,
          playerIds: t.playerIds.filter((id) => id !== playerId),
          updatedAt: now,
        };
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
        ? { ...t, playerIds: t.playerIds.filter((id) => id !== playerId), updatedAt: new Date().toISOString() }
        : t
    );
    this.saveDatabase(db);
    return db.teams;
  },

  rollOverSeason: function(): void {
    const db = this.getDatabase();
    db.players = db.players.map((p: any) => ({
      ...p,
      category: nextCategory(p.category as Category),
      updatedAt: new Date().toISOString(),
    }));
    db.teams = [];
    this.saveDatabase(db);
  },
```

- [ ] **Step 2: Smoke test — assignation + règles**

Dans la console :

```js
// Setup éphémère
localStorage.setItem('cabf_database', JSON.stringify({
  players: [
    {id:'p1', firstName:'A', category:'U13'},
    {id:'p2', firstName:'B', category:'U11'},
    {id:'p3', firstName:'C', category:'U18'},
  ],
  teams: [
    {id:'t1', name:'U15A', category:'U15', playerIds:[], createdAt:'', updatedAt:''},
    {id:'t2', name:'U15B', category:'U15', playerIds:[], createdAt:'', updatedAt:''},
  ],
}));
// Recharger la page pour garantir un état propre, puis dans l'app ouvrir le Roster.
// Ouvrir la console :
const { DataManager } = await import('/src/lib/dataManager.ts');
console.log(DataManager.assignPlayerToTeam('p1','t1')); // ok:true
console.log(DataManager.assignPlayerToTeam('p2','t1')); // ok:false "écart > 1 cran"
console.log(DataManager.assignPlayerToTeam('p3','t1')); // ok:false "Sous-classement"
console.log(DataManager.assignPlayerToTeam('p1','t2')); // ok:true → p1 retiré de t1, ajouté à t2
console.log(DataManager.getAllTeams());
// Vérifier : t1.playerIds = [], t2.playerIds = ['p1']
```

- [ ] **Step 3: Smoke test — rollOverSeason**

```js
DataManager.rollOverSeason();
const db = DataManager.getDatabase();
console.log(db.players.map(p => [p.firstName, p.category]));
// Attendu : A U15, B U13, C Senior
console.log(db.teams); // []
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/dataManager.ts
git commit -m "feat(data): add team CRUD, assignPlayerToTeam rules, rollOverSeason"
```

---

## Task 3 : Composant `PlayerChip`

**Files:**
- Create: `src/features/Teams/PlayerChip.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/features/Teams/PlayerChip.tsx
import React from "react";

export interface PlayerChipProps {
  player: { id: string; firstName: string; lastName: string; category: string; photoBase64?: string };
  fromTeamId?: string | null;       // null = pool gauche
  teamCategory?: string;            // catégorie de l'équipe d'accueil pour badge "surclassée"
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
```

- [ ] **Step 2: Smoke test**

Fichier non référencé encore → compile check suffit. Lancer `npm run dev`, aucune erreur dans la console.

- [ ] **Step 3: Commit**

```bash
git add src/features/Teams/PlayerChip.tsx
git commit -m "feat(teams): add draggable PlayerChip component"
```

---

## Task 4 : Composant `NewTeamModal`

**Files:**
- Create: `src/features/Teams/NewTeamModal.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/features/Teams/NewTeamModal.tsx
import React, { useState } from "react";
import { CATEGORY_ORDER, Category } from "../../lib/dataManager";

interface Props {
  onClose: () => void;
  onCreate: (name: string, category: Category) => void;
}

export default function NewTeamModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("U15");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, category);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-lg font-black uppercase tracking-widest text-white mb-4">
          Nouvelle <span className="text-orange-500">équipe</span>
        </h2>

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nom</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: CABF U15 A"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none mb-4"
        />

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Catégorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none mb-6"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600"
          >
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Teams/NewTeamModal.tsx
git commit -m "feat(teams): add NewTeamModal component"
```

---

## Task 5 : Composant `TeamCard`

**Files:**
- Create: `src/features/Teams/TeamCard.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/features/Teams/TeamCard.tsx
import React, { useState } from "react";
import { Team, canAssign } from "../../lib/dataManager";
import PlayerChip from "./PlayerChip";

interface Props {
  team: Team;
  players: any[]; // joueuses membres (déjà filtrées par le parent)
  allPlayersById: Record<string, any>;
  onDropPlayer: (playerId: string, fromTeamId: string | null) => void;
  onRename: (teamId: string, newName: string) => void;
  onDelete: (teamId: string) => void;
}

export default function TeamCard({ team, players, allPlayersById, onDropPlayer, onRename, onDelete }: Props) {
  const [ringColor, setRingColor] = useState<"none" | "ok" | "ko">("none");

  const ringClass =
    ringColor === "ok" ? "ring-2 ring-orange-500" :
    ringColor === "ko" ? "ring-2 ring-red-500" : "";

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const raw = e.dataTransfer.types.includes("application/x-cabf-player");
    if (!raw) return;
    // On ne peut pas lire le payload en dragover (sécurité navigateur), donc
    // on se contente d'afficher un ring neutre orange par défaut.
    // Le vrai check canAssign se fait au drop.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Teams/TeamCard.tsx
git commit -m "feat(teams): add TeamCard with dropzone, rename and delete"
```

---

## Task 6 : `TeamsDashboard`

**Files:**
- Create: `src/features/Teams/TeamsDashboard.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/features/Teams/TeamsDashboard.tsx
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

  useEffect(() => { refresh(); }, []);

  const assignedIds = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.playerIds.forEach((id) => s.add(id)));
    return s;
  }, [teams]);

  const playersById = useMemo(() => {
    const m: Record<string, any> = {};
    players.forEach((p) => { m[p.id] = p; });
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

  const handleDropOnTeam = (playerId: string, teamId: string, _fromTeamId: string | null) => {
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
        {/* Colonne gauche : pool */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPoolRing(true); }}
          onDragLeave={() => setPoolRing(false)}
          onDrop={handlePoolDrop}
          className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col min-h-0 ${poolRing ? "ring-2 ring-orange-500" : ""}`}
        >
          <div className="flex items-center justify-between mb-3 flex-none">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Disponibles · {availablePlayers.length}</h2>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">Toutes</option>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-auto flex flex-col gap-2 pr-1">
            {availablePlayers.length === 0 ? (
              <div className="text-xs text-slate-600 italic py-6 text-center">Aucune joueuse disponible.</div>
            ) : (
              availablePlayers.map((p) => (
                <PlayerChip key={p.id} player={p} fromTeamId={null} />
              ))
            )}
          </div>
        </div>

        {/* Colonne droite : équipes */}
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
                  allPlayersById={playersById}
                  onDropPlayer={(pid, fromTeamId) => handleDropOnTeam(pid, t.id, fromTeamId)}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Teams/TeamsDashboard.tsx
git commit -m "feat(teams): add TeamsDashboard with DnD pool and team columns"
```

---

## Task 7 : Navigation — onglet Équipes

**Files:**
- Modify: `src/app.tsx`

- [ ] **Step 1: Modifier `app.tsx`**

En haut, ajouter l'import :

```tsx
import TeamsDashboard from "./features/Teams/TeamsDashboard";
```

Changer le type d'état :

```tsx
const [currentView, setCurrentView] = useState<
  "gestion" | "teams" | "detection" | "stats"
>("gestion");
```

Ajouter le bouton dans la nav (entre Roster et Scouting) :

```tsx
<button
  onClick={() => setCurrentView("teams")}
  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
    currentView === "teams"
      ? "bg-orange-500 text-white shadow-md"
      : "text-slate-500 hover:text-slate-300"
  }`}
>
  👥 Équipes
</button>
```

Ajouter la branche de rendu dans `<main>` (avant `currentView === "stats"`) :

```tsx
{currentView === "teams" && <TeamsDashboard />}
```

- [ ] **Step 2: Smoke test — drag & drop complet**

```bash
npm run dev
```

Dans l'app :
1. Créer 2-3 joueuses via Roster (catégories mélangées : U13, U15, U11).
2. Aller dans Équipes. Créer une équipe "U15 A" catégorie U15.
3. Glisser une joueuse U15 → ✅ ajoutée.
4. Glisser une joueuse U13 → ✅ ajoutée, badge "⬆ surclassée" visible.
5. Glisser une joueuse U11 → ❌ alert "écart > 1 cran".
6. Créer "U13 B" catégorie U13. Glisser la joueuse U15 sur elle → ❌ alert "Sous-classement".
7. Glisser la joueuse U13 de "U15 A" vers "U13 B" → elle doit être retirée de la première.
8. Glisser une joueuse depuis une équipe vers le pool gauche → retirée.
9. Recharger la page (F5) → la composition est persistée.
10. Renommer une équipe via ✏️ → changement visible.
11. Supprimer une équipe via 🗑 → disparaît, joueuses redeviennent disponibles.

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat(nav): add Équipes tab with TeamsDashboard"
```

---

## Task 8 : Hook `useStatsData`

**Files:**
- Create: `src/features/Stats/useStatsData.ts`

- [ ] **Step 1: Créer le hook**

```ts
// src/features/Stats/useStatsData.ts
import { useEffect, useState } from "react";
import { DataManager, CATEGORY_ORDER, Category } from "../../lib/dataManager";

interface Session {
  date?: string;
  tests?: Record<string, { value: number; score: number } | undefined>;
}

export interface StatsData {
  byClub: { club: string; avgSprint: number; count: number }[];
  byCategory: { category: Category; avgScore: number; count: number }[];
  totalPlayersWithData: number;
}

function latestSprintSession(sessions: Session[] | undefined) {
  if (!sessions || sessions.length === 0) return null;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const t = sessions[i]?.tests?.["Vitesse 20m"];
    if (t && typeof t.value === "number" && typeof t.score === "number") {
      return t;
    }
  }
  return null;
}

export function useStatsData(): StatsData {
  const [data, setData] = useState<StatsData>({ byClub: [], byCategory: [], totalPlayersWithData: 0 });

  useEffect(() => {
    const players = DataManager.getAllPlayers();

    const clubAgg: Record<string, { total: number; count: number }> = {};
    const catAgg: Record<string, { total: number; count: number }> = {};
    let totalPlayersWithData = 0;

    players.forEach((p: any) => {
      const t = latestSprintSession(p.physicalSessions);
      if (!t) return;
      totalPlayersWithData += 1;

      const club = (p.club || "Sans club").trim() || "Sans club";
      clubAgg[club] = clubAgg[club] || { total: 0, count: 0 };
      clubAgg[club].total += t.value;
      clubAgg[club].count += 1;

      const cat = p.category || "U15";
      catAgg[cat] = catAgg[cat] || { total: 0, count: 0 };
      catAgg[cat].total += t.score;
      catAgg[cat].count += 1;
    });

    const byClub = Object.entries(clubAgg)
      .map(([club, a]) => ({ club, avgSprint: Math.round((a.total / a.count) * 100) / 100, count: a.count }))
      .sort((a, b) => a.avgSprint - b.avgSprint);

    const byCategory = (CATEGORY_ORDER as readonly Category[])
      .filter((c) => catAgg[c])
      .map((c) => ({
        category: c,
        avgScore: Math.round((catAgg[c].total / catAgg[c].count) * 10) / 10,
        count: catAgg[c].count,
      }));

    setData({ byClub, byCategory, totalPlayersWithData });
  }, []);

  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Stats/useStatsData.ts
git commit -m "feat(stats): add useStatsData aggregation hook"
```

---

## Task 9 : `StatsDashboard`

**Files:**
- Create: `src/features/Stats/StatsDashboard.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/features/Stats/StatsDashboard.tsx
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { useStatsData } from "./useStatsData";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };
const TOOLTIP_LABEL = { color: "#f4f4f5", fontWeight: 700 };
const TOOLTIP_ITEM = { color: "#fb923c" };

export default function StatsDashboard() {
  const { byClub, byCategory, totalPlayersWithData } = useStatsData();

  if (totalPlayersWithData === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="h-20 w-20 bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-6 border border-zinc-800">📈</div>
        <h2 className="text-2xl font-black text-white uppercase italic">Aucune donnée</h2>
        <p className="text-slate-500 max-w-md mt-2">
          Commencez par saisir des sprints "Vitesse 20m" dans l'onglet Scouting pour voir les moyennes par club et par catégorie.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h1 className="text-xl font-black uppercase italic tracking-tighter text-white mb-4">
        Statistiques <span className="text-orange-500">·</span>
        <span className="text-slate-500 text-sm ml-2">{totalPlayersWithData} joueuses avec données</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-3">
            Sprint 20m moyen par <span className="text-orange-500">club</span> (sec)
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={byClub} margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="club" stroke="#71717a" fontSize={11} angle={-15} textAnchor="end" height={50} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  itemStyle={TOOLTIP_ITEM}
                  formatter={(v: any, _n, p: any) => [`${v}s · ${p.payload.count} joueuse(s)`, "Moyenne"]}
                />
                <Bar dataKey="avgSprint" fill="#f97316" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="avgSprint" position="top" fill="#fb923c" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 mb-3">
            Note physique moyenne par <span className="text-orange-500">catégorie</span> (/20)
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={byCategory} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={[0, 20]} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  itemStyle={TOOLTIP_ITEM}
                  formatter={(v: any, _n, p: any) => [`${v}/20 · ${p.payload.count} joueuse(s)`, "Moyenne"]}
                />
                <Bar dataKey="avgScore" fill="#f97316" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="avgScore" position="top" fill="#fb923c" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/Stats/StatsDashboard.tsx
git commit -m "feat(stats): add StatsDashboard with club and category bar charts"
```

---

## Task 10 : Brancher `StatsDashboard` dans la navigation

**Files:**
- Modify: `src/app.tsx`

- [ ] **Step 1: Modifier `app.tsx`**

Ajouter l'import en haut :

```tsx
import StatsDashboard from "./features/Stats/StatsDashboard";
```

Remplacer toute la branche placeholder `currentView === "stats"` (le `<div className="h-full flex flex-col items-center justify-center ...">` actuel) par :

```tsx
{currentView === "stats" && <StatsDashboard />}
```

- [ ] **Step 2: Smoke test final**

```bash
npm run dev
```

Vérifications :
1. Les 4 onglets (Roster, Équipes, Scouting, Stats) sont présents.
2. Avec au moins 2 joueuses ayant un sprint enregistré via Scouting : l'onglet Stats montre les 2 `BarChart` avec des valeurs.
3. Clubs différents → barres distinctes dans le 1er chart.
4. Catégories ordonnées U11 → Senior dans le 2e chart.
5. Si on vide la DB (`localStorage.clear()` + reload), l'empty state s'affiche.

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat(nav): wire StatsDashboard in stats tab"
```

---

## Task 11 : Test de bout-en-bout `rollOverSeason`

**Files:** (aucun — validation)

- [ ] **Step 1: Préparer un état complet**

Dans l'app :
1. Créer 3 joueuses : A (U13), B (U15), C (U18).
2. Donner à chacune un sprint dans Scouting.
3. Créer une équipe "U15 A" catégorie U15, y ajouter A (surclassée) et B.

- [ ] **Step 2: Bascule de saison**

Dans Équipes → bouton "🗓 Fin de saison" → confirmer.

- [ ] **Step 3: Vérifier**

1. Les équipes sont vides côté UI (pool rempli).
2. Aller dans Roster : A est U15, B est U18, C est Senior.
3. F5, vérifier que l'état est persisté.

- [ ] **Step 4: Commit (tag de completion)**

```bash
git commit --allow-empty -m "chore: validate rollOverSeason end-to-end"
```

---

## Self-Review Checklist

- [x] **Spec coverage** — toutes les sections de la spec ont une tâche :
  - §3 modèle : Task 1
  - §4 règles métier : Task 2
  - §5 architecture : Tasks 3-10
  - §6 UX : Tasks 3-6, 9
  - §7 navigation : Tasks 7, 10
  - §10 critères : couverts par smoke tests Task 7, 10, 11 + nettoyage deletePlayer dans Task 1
- [x] **Pas de placeholder** : chaque step contient le code ou la commande exacte.
- [x] **Cohérence des types** : `Team`, `Category`, `CATEGORY_ORDER`, `canAssign`, `nextCategory` définis Task 1-2, utilisés avec les mêmes signatures Tasks 3-9.
