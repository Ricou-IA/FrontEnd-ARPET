/**
 * MeetingUpload - Meeting V3
 * Version: 1.0.0
 * Composant d'upload de fichier audio (drag & drop + file picker)
 * Formats acceptés : mp3, m4a, wav, webm, ogg
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, X, AlertCircle, CheckCircle } from 'lucide-react';
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  isAcceptedAudioFormat,
} from '../../types/meeting.types';

interface MeetingUploadProps {
  /** Callback quand un fichier est sélectionné et validé */
  onFileSelected: (file: File) => void;
  /** Callback pour annuler */
  onCancel: () => void;
  /** Désactivé (ex: pas de projet sélectionné) */
  disabled?: boolean;
  /** Fichier déjà sélectionné (pour affichage) */
  selectedFile?: File | null;
  /** Callback pour retirer le fichier sélectionné */
  onFileRemove?: () => void;
}

export function MeetingUpload({
  onFileSelected,
  onCancel,
  disabled = false,
  selectedFile = null,
  onFileRemove,
}: MeetingUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Valider le fichier
  const validateFile = useCallback((file: File): string | null => {
    // Vérifier le type MIME
    if (!isAcceptedAudioFormat(file.type)) {
      // Fallback sur l'extension si le type MIME n'est pas reconnu
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['mp3', 'm4a', 'wav', 'webm', 'ogg'];
      if (!extension || !validExtensions.includes(extension)) {
        return `Format non supporté. Formats acceptés : ${validExtensions.join(', ')}`;
      }
    }

    // Vérifier la taille (max 500 MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Fichier trop volumineux (max 500 MB)';
    }

    // Vérifier la taille minimum (au moins 1 KB)
    if (file.size < 1024) {
      return 'Fichier trop petit ou vide';
    }

    return null;
  }, []);

  // Traiter le fichier sélectionné
  const handleFile = useCallback((file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelected(file);
  }, [validateFile, onFileSelected]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  // Click handler pour le file picker
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  }, [handleFile]);

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Si un fichier est déjà sélectionné, afficher l'aperçu
  if (selectedFile) {
    return (
      <div className="space-y-4">
        {/* Fichier sélectionné */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileAudio className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm font-medium text-green-800 truncate">
                  {selectedFile.name}
                </p>
              </div>
              <p className="text-xs text-green-600 mt-0.5">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'audio'}
              </p>
            </div>
            {onFileRemove && (
              <button
                type="button"
                onClick={onFileRemove}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                title="Retirer le fichier"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
          <p className="font-medium mb-1">Prochaine étape</p>
          <p>Renseignez les informations de la réunion puis lancez le traitement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${disabled
            ? 'border-stone-200 bg-stone-50 cursor-not-allowed'
            : isDragOver
              ? 'border-amber-400 bg-amber-50'
              : 'border-stone-300 hover:border-amber-400 hover:bg-amber-50/50'
          }
        `}
      >
        {/* Input caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_AUDIO_EXTENSIONS}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Icône */}
        <div className={`
          w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4
          ${disabled ? 'bg-stone-100' : isDragOver ? 'bg-amber-100' : 'bg-stone-100'}
        `}>
          <Upload className={`
            w-8 h-8
            ${disabled ? 'text-stone-400' : isDragOver ? 'text-amber-600' : 'text-stone-500'}
          `} />
        </div>

        {/* Texte */}
        <p className={`text-base font-medium mb-1 ${disabled ? 'text-stone-400' : 'text-stone-700'}`}>
          {isDragOver ? 'Déposez le fichier ici' : 'Glissez-déposez un fichier audio'}
        </p>
        <p className={`text-sm ${disabled ? 'text-stone-400' : 'text-stone-500'}`}>
          ou <span className={disabled ? '' : 'text-amber-600 font-medium'}>parcourez</span> vos fichiers
        </p>

        {/* Formats acceptés */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {['MP3', 'M4A', 'WAV', 'WebM', 'OGG'].map((format) => (
            <span
              key={format}
              className={`
                px-2 py-0.5 text-xs rounded-full
                ${disabled ? 'bg-stone-100 text-stone-400' : 'bg-stone-100 text-stone-600'}
              `}
            >
              {format}
            </span>
          ))}
        </div>

        {/* Taille max */}
        <p className={`text-xs mt-3 ${disabled ? 'text-stone-400' : 'text-stone-400'}`}>
          Taille maximum : 500 MB
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-800">{error}</p>
            <p className="text-xs text-red-600 mt-1">
              Formats acceptes : MP3, M4A, WAV, WebM, OGG (max 500 MB)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Conseil */}
      {!disabled && (
        <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
          <p className="font-medium mb-1">Conseil</p>
          <p>Pour une meilleure transcription, utilisez un enregistrement de bonne qualité avec peu de bruit de fond.</p>
        </div>
      )}

      {/* Bouton annuler */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
      >
        Annuler
      </button>
    </div>
  );
}

export default MeetingUpload;
