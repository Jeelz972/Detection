import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { DataManager } from "../../lib/dataManager";

interface Props {
  onEditPlayer?: (player: any) => void;
}

export default function GestionDashboard({ onEditPlayer }: Props) {
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Chargement initial
  useEffect(() => {
    setPlayers(DataManager.getAllPlayers());
  }, []);

  // Fonction pour générer un ID système unique
  const generateId = () =>
    `ply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Ajout manuel d'une joueuse (sans licence)
  const handleAddManualPlayer = () => {
    const newPlayer = {
      id: generateId(),
      licence: "", // La licence est vide par défaut
      firstName: "Nouvelle",
      lastName: "Joueuse",
      category: "U15",
      club: "",
      height: null,
      photoBase64: "",
      physicalSessions: [],
      updatedAt: new Date().toISOString(),
      source: "Manuel",
    };

    DataManager.savePlayer(newPlayer);
    setPlayers(DataManager.getAllPlayers());
  };

  // 2. Logique d'import Excel (XLSX) modifiée
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        // On filtre sur le Nom ou Prénom (et plus sur la licence) pour éviter les lignes vides
        const formattedPlayers = rawData
          .filter((row) => row["Nom"] || row["Prénom"])
          .map((row: any) => ({
            id: generateId(), // Identifiant système indépendant
            licence: row["N°Licence"] ? String(row["N°Licence"]).trim() : "", // Champ facultatif
            firstName: row["Prénom"] || "Inconnu",
            lastName: row["Nom"] || "Inconnu",
            birthDate: row["D.Naissance"] || "",
            category: row["Catgéorie"] || row["Catégorie"] || "U15",
            club: row["Club"] || "Sans club",
            height: row["Taille"] ? parseInt(row["Taille"]) : null,
            photoBase64: "",
            physicalSessions: [],
            updatedAt: new Date().toISOString(),
            source: "Import FBI",
          }));

        formattedPlayers.forEach((p) => DataManager.savePlayer(p));
        setPlayers(DataManager.getAllPlayers());

        alert(
          `Importation réussie : ${formattedPlayers.length} joueuses ajoutées.`,
        );
      } catch (err) {
        console.error("Erreur lors de l'import :", err);
        alert("Le format du fichier n'est pas reconnu.");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset de l'input pour pouvoir réimporter le même fichier si besoin
    e.target.value = "";
  };

  // Filtrage pour la recherche
  const filteredPlayers = players.filter((p) =>
    `${p.firstName} ${p.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER & BOUTONS D'ACTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Gestion du <span className="text-orange-500">Roster</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Total : {players.length} joueuses en base
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Nouveau bouton : Création manuelle */}
          <button
            onClick={handleAddManualPlayer}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            + Joueuse
          </button>

          <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-2 border border-zinc-700">
            📊 Importer (FBI)
            <input
              type="file"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={() => DataManager.exportToJson()}
            className="border border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-bold transition-all"
          >
            💾 Backup
          </button>
        </div>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher une joueuse..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white pl-12 focus:border-orange-500 outline-none transition-all"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
          🔍
        </span>
      </div>

      {/* GRILLE DES JOUEUSES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map((player) => (
          <div
            key={player.id}
            className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-orange-500/50 transition-all group relative overflow-hidden"
          >
            {/* Badge de source (Import vs Manuel) */}
            <div
              className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-lg ${
                player.source === "Manuel"
                  ? "bg-orange-500/20 text-orange-500"
                  : "bg-zinc-800 text-slate-500"
              }`}
            >
              {player.source}
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                {player.photoBase64 ? (
                  <img
                    src={player.photoBase64}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl text-zinc-600">
                    👤
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white uppercase truncate">
                  {player.lastName} {player.firstName}
                </h3>

                {/* Affichage intelligent de la licence */}
                <p
                  className={`text-xs font-bold tracking-widest mt-0.5 ${player.licence ? "text-orange-500" : "text-slate-500 italic"}`}
                >
                  {player.licence ? `Lic: ${player.licence}` : "Sans licence"}
                </p>

                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-zinc-950 text-slate-400 px-2 py-0.5 rounded border border-zinc-800">
                    {player.category}
                  </span>
                  <span className="text-[10px] bg-zinc-950 text-slate-400 px-2 py-0.5 rounded border border-zinc-800 truncate">
                    {player.club || "Aucun"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-600 uppercase font-bold">
                MAJ : {new Date(player.updatedAt).toLocaleDateString()}
              </span>
              {/* Le bouton Modifier redirigera idéalement vers la Fiche */}
              <button
                onClick={() => onEditPlayer?.(player)}
                className="text-zinc-500 hover:text-orange-500 transition-colors text-xs font-bold"
              >
                Éditer profil →
              </button>
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-800">
          <p className="text-slate-500 italic">Aucune joueuse en base.</p>
          <p className="text-slate-600 text-sm mt-2">
            Importez un fichier FBI ou ajoutez une joueuse manuellement.
          </p>
        </div>
      )}
    </div>
  );
}
