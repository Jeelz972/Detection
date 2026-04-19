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
