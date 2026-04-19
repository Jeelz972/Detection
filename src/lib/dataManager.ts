// src/lib/dataManager.ts

// Nouveau nom de la clé de stockage local
const CABF_DATABASE = 'cabf_database';

export const DataManager = {
  getDatabase: function() {
    const raw = localStorage.getItem(CABF_DATABASE);
    return raw ? JSON.parse(raw) : { players: [] };
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
    this.saveDatabase(db);
    return db.players;
  },

  // Export JSON pour le transfert entre ordinateurs
  exportToJson: function() {
    const db = this.getDatabase();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `cabf_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  }
};