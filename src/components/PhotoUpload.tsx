// src/components/PhotoUpload.tsx
import React, { useState } from "react";
import { compressImage } from "../lib/imageUtils";

interface PhotoUploadProps {
  currentPhotoBase64?: string;
  onPhotoChange: (base64: string) => void;
}

export function PhotoUpload({
  currentPhotoBase64,
  onPhotoChange,
}: PhotoUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifie que c'est bien une image
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image valide.");
      return;
    }

    try {
      setIsProcessing(true);
      // On compresse à 250px max, qualité 0.7
      const compressedData = await compressImage(file, 250, 0.7);
      onPhotoChange(compressedData);
    } catch (error) {
      console.error("Erreur lors de la compression :", error);
      alert("Impossible de traiter cette image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Zone cliquable de l'Avatar */}
      <label
        className={`relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-200 ${
          currentPhotoBase64
            ? "border-orange-500"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-800"
        }`}
      >
        {currentPhotoBase64 ? (
          <img
            src={currentPhotoBase64}
            alt="Avatar joueuse"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl text-zinc-600">📷</span>
        )}

        {/* Overlay de chargement */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
          </div>
        )}

        {/* Input caché */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </label>

      <span className="text-xs text-slate-500">
        {currentPhotoBase64 ? "Cliquez pour modifier" : "Ajouter une photo"}
      </span>
    </div>
  );
}
