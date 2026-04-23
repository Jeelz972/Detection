// src/features/Gestion/GestionDashboard.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  DataManager, generateId, FBI_COLS, FBI_HEADER_ROW_INDEX,
  mapFbiCategory, excelDateToString, CATEGORY_ORDER, categoryIndex,
  getCurrentSeasonYear, getSeasonLabel,
} from "../../lib/dataManager";

type SortKey = "name" | "category" | "club" | "updatedAt";
type SortDir = "asc" | "desc";

interface Props {
  onEditPlayer?: (player: any) => void;
}

export default function GestionDashboard({ onEditPlayer }: Props) {
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rosterFilterCat, setRosterFilterCat] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importFilterCat, setImportFilterCat] = useState<string>("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPlayers(DataManager.getAllPlayers()); }, []);
  const refresh = () => setPlayers(DataManager.getAllPlayers());

  // ── Tri ──
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  // ── Filtrage + tri du roster ──
  const filteredAndSortedPlayers = useMemo(() => {
    let list = players
      .filter((p) => rosterFilterCat === "ALL" || p.category === rosterFilterCat)
      .filter((p) =>
        `${p.firstName} ${p.lastName} ${p.licence || ""}`.toLowerCase().includes(searchTerm.toLowerCase())
      );

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
        case "updatedAt":
          cmp = (a.updatedAt || "").localeCompare(b.updatedAt || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [players, rosterFilterCat, searchTerm, sortKey, sortDir]);

  // Compteurs catégories du roster
  const rosterCatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [players]);

  // ── Ajout manuel ──
  const handleAddManualPlayer = () => {
    DataManager.savePlayer({
      id: generateId(), licence: "", firstName: "Nouvelle", lastName: "Joueuse",
      category: "U15", club: "", height: null, birthDate: "",
      photoBase64: "", physicalSessions: [],
      updatedAt: new Date().toISOString(), source: "Manuel",
    });
    refresh();
  };

  // ── Suppression ──
  const handleDeletePlayer = (player: any) => {
    if (!window.confirm(`Supprimer ${player.lastName} ${player.firstName} ?\n\nCette action est irréversible.`)) return;
    DataManager.deletePlayer(player.id);
    refresh();
  };

  // ── Import FBI ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError("");
    setImportResult(null);
    setImportPreview([]);
    setImportFilterCat("ALL");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

        let headerIdx = -1;
        for (let i = 0; i < Math.min(15, raw.length); i++) {
          if (raw[i] && (raw[i][FBI_COLS.nom] === "Nom" || raw[i][FBI_COLS.prenom] === "Prénom")) {
            headerIdx = i; break;
          }
        }
        if (headerIdx === -1) headerIdx = FBI_HEADER_ROW_INDEX;

        const dataRows = raw.slice(headerIdx + 1);
        let lastLigue = "", lastComite = "";

        const parsed = dataRows
          .filter((row) => row && row[FBI_COLS.nom] && row[FBI_COLS.prenom] && row[FBI_COLS.nom] !== "Nom")
          .map((row) => {
            if (row[FBI_COLS.ligue]) lastLigue = row[FBI_COLS.ligue];
            if (row[FBI_COLS.comite]) lastComite = row[FBI_COLS.comite];
            const fbiCategory = row[FBI_COLS.categorie] || "";
            const taille = row[FBI_COLS.taille];
            return {
              id: generateId(), licence: row[FBI_COLS.licence] ? String(row[FBI_COLS.licence]).trim() : "",
              firstName: row[FBI_COLS.prenom] || "Inconnu", lastName: row[FBI_COLS.nom] || "Inconnu",
              birthDate: excelDateToString(row[FBI_COLS.dateNaissance]),
              fbiCategory, category: mapFbiCategory(fbiCategory),
              club: row[FBI_COLS.club] || "", ligue: lastLigue, comite: lastComite,
              numClub: row[FBI_COLS.numClub] || "", ville: row[FBI_COLS.ville] || "",
              height: taille ? parseInt(taille) : null, sexe: row[FBI_COLS.sexe] || "F",
              photoBase64: "", physicalSessions: [],
              updatedAt: new Date().toISOString(), source: "Import FBI",
            };
          });
        setImportPreview(parsed);
      } catch (err: any) {
        setImportError(`Erreur de lecture : ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const filteredPreview = importPreview.filter((p) => importFilterCat === "ALL" || p.category === importFilterCat);

  const handleConfirmImport = () => {
    if (filteredPreview.length === 0) return;
    const result = DataManager.importFbiPlayers(filteredPreview);
    setImportResult(result);
    refresh();
    setImportPreview([]);
  };

  const importCatCounts: Record<string, number> = {};
  importPreview.forEach((p) => { importCatCounts[p.category] = (importCatCounts[p.category] || 0) + 1; });

  const seasonLabel = getSeasonLabel(getCurrentSeasonYear());

  // ═══════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Gestion du <span className="text-orange-500">Roster</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {players.length} joueuses · Saison {seasonLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleAddManualPlayer}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all">
            + Joueuse
          </button>
          <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-2 border border-zinc-700">
            📊 Importer (FBI)
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
          </label>
          <button onClick={() => DataManager.exportToJson()}
            className="border border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-bold transition-all">
            💾 Backup
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      {importError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">{importError}</div>}
      {importResult && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold">{importResult.added} joueuse(s) importée(s)</p>
            {importResult.skipped > 0 && <p className="text-sm opacity-70">{importResult.skipped} doublon(s) ignoré(s)</p>}
          </div>
          <button onClick={() => setImportResult(null)} className="ml-auto text-green-400/60 hover:text-green-400">✕</button>
        </div>
      )}

      {/* ═══ IMPORT PREVIEW ═══ */}
      {importPreview.length > 0 && (
        <div className="space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">
                Prévisualisation — <span className="text-orange-500">{importFileName}</span>
              </h2>
              <p className="text-slate-500 text-sm mt-1">{importPreview.length} joueuses détectées</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setImportPreview([]); setImportFileName(""); }}
                className="border border-zinc-700 hover:bg-zinc-800 text-slate-400 px-4 py-2 rounded-lg font-bold text-sm transition-all">Annuler</button>
              <button onClick={handleConfirmImport}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2 rounded-lg transition-all shadow-lg shadow-orange-500/20">
                Importer {filteredPreview.length} joueuse(s)
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setImportFilterCat("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importFilterCat === "ALL" ? "bg-orange-500 text-white" : "bg-zinc-800 text-slate-500"}`}>
              Toutes ({importPreview.length})
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button key={cat} onClick={() => setImportFilterCat(importFilterCat === cat ? "ALL" : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${importFilterCat === cat ? "bg-orange-500 text-white" : "bg-zinc-800 text-slate-500"}`}>
                {cat} ({importCatCounts[cat] || 0})
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-left">
                  {["Joueuse", "Licence", "Naissance", "Cat. FBI", "Cat. App", "Club", "Taille", "Ville"].map((h) => (
                    <th key={h} className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPreview.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3"><div className="font-bold text-white uppercase text-xs">{p.lastName}</div><div className="text-slate-400 text-xs">{p.firstName}</div></td>
                    <td className="p-3"><span className={`font-mono text-xs ${p.licence ? "text-orange-400" : "text-slate-600"}`}>{p.licence || "—"}</span></td>
                    <td className="p-3 text-slate-400 font-mono text-xs">{p.birthDate || "—"}</td>
                    <td className="p-3"><span className="bg-zinc-800 text-slate-400 text-xs px-2 py-0.5 rounded font-bold">{p.fbiCategory}</span></td>
                    <td className="p-3"><span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded font-bold">{p.category}</span></td>
                    <td className="p-3 text-slate-400 text-xs max-w-[180px] truncate">{p.club}</td>
                    <td className="p-3 text-slate-400 text-xs">{p.height ? `${p.height} cm` : "—"}</td>
                    <td className="p-3 text-slate-400 text-xs">{p.ville}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ ROSTER VIEW ═══ */}
      {importPreview.length === 0 && (
        <>
          {/* BARRE : Recherche + Filtre catégorie + Tri */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Recherche */}
            <div className="relative flex-1">
              <input type="text" placeholder="Rechercher (nom, prénom, licence)..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-white pl-11 text-sm focus:border-orange-500 outline-none transition-all" />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base">🔍</span>
            </div>

            {/* Filtre catégorie */}
            <select value={rosterFilterCat} onChange={(e) => setRosterFilterCat(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-orange-500 outline-none transition-all">
              <option value="ALL">Toutes catégories ({players.length})</option>
              {CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>{cat} ({rosterCatCounts[cat] || 0})</option>
              ))}
            </select>

            {/* Tri */}
            <select value={`${sortKey}_${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split("_") as [SortKey, SortDir];
                setSortKey(k); setSortDir(d);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-orange-500 outline-none transition-all">
              <option value="name_asc">Nom A→Z</option>
              <option value="name_desc">Nom Z→A</option>
              <option value="category_asc">Catégorie ↑ (U11→Senior)</option>
              <option value="category_desc">Catégorie ↓ (Senior→U11)</option>
              <option value="club_asc">Club A→Z</option>
              <option value="club_desc">Club Z→A</option>
              <option value="updatedAt_desc">Dernière MAJ ↓</option>
              <option value="updatedAt_asc">Dernière MAJ ↑</option>
            </select>
          </div>

          {/* Chips catégorie rapide */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setRosterFilterCat("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rosterFilterCat === "ALL" ? "bg-orange-500 text-white" : "bg-zinc-900 text-slate-500 border border-zinc-800 hover:text-slate-300"
              }`}>
              Toutes
            </button>
            {CATEGORY_ORDER.map((cat) => (
              <button key={cat} onClick={() => setRosterFilterCat(rosterFilterCat === cat ? "ALL" : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rosterFilterCat === cat
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-900 text-slate-500 border border-zinc-800 hover:text-slate-300"
                }`}>
                {cat} <span className="opacity-50">({rosterCatCounts[cat] || 0})</span>
              </button>
            ))}
          </div>

          {/* Compteur résultats */}
          {(rosterFilterCat !== "ALL" || searchTerm) && (
            <p className="text-xs text-slate-500">
              {filteredAndSortedPlayers.length} résultat(s)
              {rosterFilterCat !== "ALL" && <span> · Filtre: <span className="text-orange-400 font-bold">{rosterFilterCat}</span></span>}
              {searchTerm && <span> · Recherche: "{searchTerm}"</span>}
            </p>
          )}

          {/* GRILLE JOUEUSES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPlayers.map((player) => (
              <div key={player.id}
                className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-orange-500/50 transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-lg ${
                  player.source === "Manuel" ? "bg-orange-500/20 text-orange-500" : "bg-zinc-800 text-slate-500"}`}>
                  {player.source}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                    {player.photoBase64 ? (
                      <img src={player.photoBase64} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl text-zinc-600">👤</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white uppercase truncate">{player.lastName} {player.firstName}</h3>
                    <p className={`text-xs font-bold tracking-widest mt-0.5 ${player.licence ? "text-orange-500" : "text-slate-500 italic"}`}>
                      {player.licence ? `Lic: ${player.licence}` : "Sans licence"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-zinc-950 text-slate-400 px-2 py-0.5 rounded border border-zinc-800">{player.category}</span>
                      <span className="text-[10px] bg-zinc-950 text-slate-400 px-2 py-0.5 rounded border border-zinc-800 truncate">{player.club || "Aucun"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] text-slate-600 uppercase font-bold">
                    MAJ : {new Date(player.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => handleDeletePlayer(player)}
                      className="text-zinc-600 hover:text-red-500 transition-colors text-xs font-bold opacity-0 group-hover:opacity-100">
                      🗑 Supprimer
                    </button>
                    <button onClick={() => onEditPlayer?.(player)}
                      className="text-zinc-500 hover:text-orange-500 transition-colors text-xs font-bold">
                      Éditer profil →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {players.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-800">
              <p className="text-slate-500 italic">Aucune joueuse en base.</p>
              <p className="text-slate-600 text-sm mt-2">Importez un fichier FBI ou ajoutez une joueuse manuellement.</p>
            </div>
          )}

          {players.length > 0 && filteredAndSortedPlayers.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-slate-500">Aucun résultat pour ce filtre.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
