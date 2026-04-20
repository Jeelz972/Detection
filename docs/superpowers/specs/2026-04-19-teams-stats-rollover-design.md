# Spec — Teams, Stats, rollOverSeason

**Date:** 2026-04-19
**Projet:** CABF App (Detection)
**Portée:** 3 tâches liées — module Équipes avec Drag & Drop, module Statistiques, extension du `DataManager` avec gestion des équipes et bascule de saison.

---

## 1. Contexte

Application React 18 + Vite + Tailwind v3 + TypeScript, 100% hors-ligne, persistance dans `localStorage` sous la clé `cabf_database`.

État actuel :
- `DataManager` ne gère que `players`. Pas de notion d'équipe, pas de bascule de saison.
- Navigation à 3 onglets (`gestion | detection | stats`) — le 3e est un placeholder.
- Joueuse type : `{ id, licence, firstName, lastName, category, club, height, photoBase64, physicalSessions: [{date, tests: {"Vitesse 20m": {value, score}}}], updatedAt, source }`.
- `recharts` déjà installé, `xlsx` déjà installé.

## 2. Objectifs

1. **Module Équipes** : composer des équipes par glisser-déposer, avec règles de surclassement contrôlées.
2. **Module Statistiques** : deux `BarChart` comparatifs (sprint par club, note physique par catégorie).
3. **Bascule de saison** : vieillir toutes les joueuses d'un cran et réinitialiser les équipes.

## 3. Modèle de données

### 3.1 Catégories

Ordre canonique figé :

```ts
const CATEGORY_ORDER = ['U11', 'U13', 'U15', 'U18', 'Senior'] as const;
type Category = typeof CATEGORY_ORDER[number];
```

Fonctions utilitaires :
- `categoryIndex(cat: Category): number` — position dans l'ordre (0..4).
- `nextCategory(cat: Category): Category` — `Senior` retourne `Senior`, sinon +1 cran.

### 3.2 Type `Team`

```ts
interface Team {
  id: string;              // "tm_<timestamp>_<rand>"
  name: string;
  category: Category;      // catégorie cible de l'équipe
  playerIds: string[];     // ordre préservé pour l'affichage
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 Forme de la DB

```ts
interface Database {
  players: Player[];
  teams: Team[];
}
```

`getDatabase()` retourne `{ players: [], teams: [] }` par défaut. Si un ancien payload ne contient pas `teams`, le champ est injecté à la volée (migration douce, sans écriture immédiate).

## 4. Règles métier

### 4.1 Assignation d'une joueuse à une équipe

Une joueuse ne peut appartenir qu'à **une seule équipe** sur la saison en cours.

**Règle de surclassement (confirmée Q2.C) :**
- autorisé : `teamCategory == playerCategory` ou `teamCategoryIndex == playerCategoryIndex + 1`.
- refusé sinon (aussi bien vers le bas que de plus d'un cran vers le haut).

Lorsqu'on assigne une joueuse à une équipe, elle est **retirée automatiquement** de toute autre équipe (quelle que soit sa catégorie).

### 4.2 Affichage du panneau "joueuses disponibles"

Le panneau gauche affiche les joueuses qui **ne sont membres d'aucune équipe**. Un filtre déroulant par catégorie (Toutes / U11 / U13 / ...) raffine cette liste.

### 4.3 `rollOverSeason()` (stratégie A confirmée Q4.A)

1. Pour chaque joueuse : `player.category = nextCategory(player.category)`.
2. `db.teams = []`.
3. Persistance immédiate via `saveDatabase`.

Les joueuses `Senior` restent `Senior`. Aucune suppression. Aucun backup automatique (le bouton `exportToJson` reste disponible manuellement).

Déclenchement : bouton "Fin de saison" dans le module Équipes, gardé par un `confirm()` natif.

## 5. Architecture

### 5.1 Fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/dataManager.ts` | MODIFIÉ | Étend DB, ajoute méthodes `teams` + `rollOverSeason` + helpers catégorie |
| `src/features/Teams/TeamsDashboard.tsx` | CRÉÉ | Vue principale 2 colonnes |
| `src/features/Teams/PlayerChip.tsx` | CRÉÉ | Carte joueuse draggable (utilisée des 2 côtés) |
| `src/features/Teams/TeamCard.tsx` | CRÉÉ | Colonne droite : une équipe + dropzone |
| `src/features/Teams/NewTeamModal.tsx` | CRÉÉ | Modal de création (nom + catégorie) |
| `src/features/Stats/StatsDashboard.tsx` | CRÉÉ | Vue stats avec 2 `BarChart` |
| `src/features/Stats/useStatsData.ts` | CRÉÉ | Hook d'agrégation (moyennes par club/catégorie) |
| `src/app.tsx` | MODIFIÉ | Ajout onglet `teams` + import + branche `stats` |

### 5.2 DataManager — nouvelles méthodes

```ts
// Équipes
getAllTeams(): Team[]
saveTeam(team: Team): Team[]                 // upsert par id, met updatedAt
deleteTeam(teamId: string): Team[]
assignPlayerToTeam(
  playerId: string,
  teamId: string
): { ok: true; teams: Team[] } | { ok: false; reason: string }
removePlayerFromTeam(playerId: string, teamId: string): Team[]

// Saison
rollOverSeason(): void

// Helpers (exportés depuis le module)
nextCategory(cat: Category): Category
canAssign(playerCategory: Category, teamCategory: Category): boolean
```

`assignPlayerToTeam` encapsule **toute la logique métier** :
- vérifie `canAssign` ; sinon renvoie `{ok:false, reason:"Surclassement refusé (écart > 1 cran)"}` ou `"Sous-classement interdit"`.
- retire la joueuse de toute autre équipe.
- l'ajoute à `team.playerIds` (append si absente).
- persiste.

### 5.3 Drag & Drop

**API HTML5 native** (pas de nouvelle dépendance). Suffisant pour ce cas : liste plate → zones de drop.

Convention :
- `dragstart` depuis une `PlayerChip` : `dataTransfer.setData('text/plain', JSON.stringify({playerId, fromTeamId: teamId | null}))`.
- `dragover` sur une `TeamCard` : `e.preventDefault()` pour autoriser le drop, et applique classe visuelle selon `canAssign`.
- `drop` sur une `TeamCard` : lit le payload, appelle `assignPlayerToTeam`. Si `fromTeamId` présent et ≠ nouvelle équipe, l'appel `assignPlayerToTeam` se charge déjà de retirer de l'ancienne.
- `drop` sur le panneau gauche (zone "disponibles") : si `fromTeamId` présent, appelle `removePlayerFromTeam`.

### 5.4 Stats — `useStatsData`

Signature :

```ts
function useStatsData(): {
  byClub: { club: string; avgSprint: number; count: number }[];
  byCategory: { category: Category; avgScore: number; count: number }[];
  totalPlayersWithData: number;
};
```

Algorithme :
1. Récupère `DataManager.getAllPlayers()`.
2. Pour chaque joueuse, extrait la **dernière session** contenant `tests["Vitesse 20m"]` (tri par `date` desc, fallback : dernière du tableau).
3. Joueuses sans session exploitée → exclues.
4. `byClub` : groupby `club`, moyenne de `value` (secondes sprint), arrondi 2 décimales.
5. `byCategory` : groupby `category`, moyenne de `score` (sur 20), arrondi 1 décimale. Ordre selon `CATEGORY_ORDER`.
6. Clubs/catégories sans donnée exclus.

### 5.5 Design system

Conforme à l'existant :
- Fond : `bg-zinc-950`, conteneurs `bg-zinc-900`, bordures `border-zinc-800`.
- Accent : `orange-500` (dropzone valide, bouton primaire, barres recharts).
- Erreur : `red-500` (dropzone refusée).
- Typo : `font-black uppercase tracking-widest` pour titres de sections.

Recharts :
- `CartesianGrid stroke="#27272a"` (zinc-800)
- `XAxis/YAxis stroke="#71717a"` (zinc-500)
- barres `fill="#f97316"` (orange-500)
- `Tooltip` avec `contentStyle={{ background:'#18181b', border:'1px solid #27272a' }}`

## 6. UX & états

### 6.1 TeamsDashboard

**Header** : bouton `+ Nouvelle équipe` (ouvre `NewTeamModal`) + bouton `🗓 Fin de saison` (à droite, plus discret, `bg-zinc-800`).

**Colonne gauche** :
- Select de filtre catégorie (valeur par défaut : "Toutes").
- Liste scrollable de `PlayerChip`. Chaque chip affiche photo/initiales, nom, catégorie. Attribute `draggable`.
- Dropzone globale sur la colonne (retire de son équipe quand on dépose ici).

**Colonne droite** :
- Liste verticale de `TeamCard`, chacune avec : titre, catégorie badge, liste des joueuses (drag out possible), bouton `✏️` (renommage via `prompt()` natif, met à jour `team.name` + `updatedAt`), bouton `🗑` suppression (confirm natif).
- Empty state colonne : "Aucune équipe créée. Cliquez sur + Nouvelle équipe."

**NewTeamModal** : nom (input texte) + catégorie (select). Création + fermeture.

**Feedback drag** : sur `dragover`, le `TeamCard` concerné applique `ring-2 ring-orange-500` si `canAssign`, sinon `ring-2 ring-red-500 cursor-not-allowed`. Reset sur `dragleave`/`drop`.

**Surclassement visible** : dans une équipe, toute joueuse dont `player.category !== team.category` affiche un petit badge `⬆ surclassée`.

**Refus de drop** : si `assignPlayerToTeam` renvoie `{ok:false}`, `alert(reason)`.

### 6.2 StatsDashboard

- Layout : grille 2 colonnes sur desktop (`md:grid-cols-2`), empilé mobile.
- Chaque chart dans un `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">`.
- Titre au-dessus du chart en `font-black uppercase tracking-widest`.
- Empty state global si `totalPlayersWithData === 0` : message invitant à saisir des sprints dans Scouting.

## 7. Navigation

`src/app.tsx` :
- Type union passe à `'gestion' | 'teams' | 'detection' | 'stats'`.
- Nouvel onglet `👥 Équipes` inséré entre Roster et Scouting.
- La branche `stats` actuelle (placeholder) est remplacée par `<StatsDashboard />`.
- Import `TeamsDashboard` et `StatsDashboard`.

## 8. Non-objectifs (YAGNI)

- Pas de gestion multi-saison / historique d'équipes anciennes.
- Pas d'undo du `rollOverSeason`.
- Pas de drag tactile natif ni réordonnancement dans une équipe.
- Pas de persistance d'un ordre de drag custom au sein du panneau gauche.
- Pas d'export d'équipe (CSV/PDF).
- Pas de charts supplémentaires (détente, endurance…) — seul `Vitesse 20m` est traité.
- Pas de backup auto avant `rollOverSeason` (l'utilisateur utilise `exportToJson` manuellement).

## 9. Risques & mitigations

- **Clé localStorage partagée** : `rollOverSeason` est destructeur. Mitigation : `confirm()` natif explicite listant ce qui va se passer.
- **DnD HTML5 sur mobile** : non supporté nativement. Accepté pour cette itération — le module reste utilisable au clavier/clic sur desktop, et un mode mobile pourra être ajouté plus tard via une librairie.
- **Incohérence joueuse supprimée / encore référencée dans `team.playerIds`** : `deletePlayer` doit aussi nettoyer les équipes. **À ajouter** dans `DataManager.deletePlayer`.

## 10. Critères d'acceptation

- [ ] Une équipe peut être créée, renommée (bouton ✏️), supprimée.
- [ ] Glisser une joueuse U13 dans une équipe U15 fonctionne et affiche le badge "surclassée".
- [ ] Glisser une joueuse U11 dans une équipe U15 est refusé avec message clair.
- [ ] Glisser une joueuse U15 dans une équipe U13 est refusé.
- [ ] Glisser une joueuse d'une équipe A à une équipe B la retire bien de A.
- [ ] Glisser une joueuse hors d'une équipe (vers le panneau gauche) la remet disponible.
- [ ] Le filtre catégorie du panneau gauche fonctionne.
- [ ] `rollOverSeason` : U13 → U15, Senior → Senior, `teams` vidé, persisté après reload.
- [ ] Supprimer une joueuse du Roster la retire aussi des équipes.
- [ ] Stats : le `BarChart` par club affiche des moyennes cohérentes avec les dernières sessions.
- [ ] Stats : le `BarChart` par catégorie respecte l'ordre U11→Senior.
- [ ] Stats : empty state correct si aucune session "Vitesse 20m" en base.
- [ ] Navigation : 4 onglets, le nouveau `teams` est actif/surligné quand sélectionné.
