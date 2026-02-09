/**
 * MeetingStep1Prepare - Meeting V3
 * Version: 4.0.0 - Support modes record/upload avec contexte adapté
 * Étape 1 : Préparation de la réunion (titre, participants optionnels)
 */

import React, { useState } from 'react';
import { Video, Upload, Users, FileText, ArrowRight, FileAudio } from 'lucide-react';
import { generateDefaultTitle } from '../../services/meeting.service';

/**
 * Données de sortie de l'étape 1 (sans project_id/org_id/source_type, ajoutés par le parent)
 */
interface Step1Output {
  title: string;
  participants?: string;
  agenda?: string;
}

interface MeetingStep1PrepareProps {
  onNext: (data: Step1Output) => void;
  onCancel: () => void;
  /** Désactive le bouton Démarrer (ex: pas de projet sélectionné) */
  disabled?: boolean;
  /** Mode de capture : 'record' (défaut) ou 'upload' */
  mode?: 'record' | 'upload';
  /** Nom du fichier uploadé (affiché si mode='upload') */
  uploadedFileName?: string;
}

export function MeetingStep1Prepare({
  onNext,
  onCancel,
  disabled = false,
  mode = 'record',
  uploadedFileName,
}: MeetingStep1PrepareProps) {
  const [title, setTitle] = useState(generateDefaultTitle());
  const [participants, setParticipants] = useState('');
  const [agenda, setAgenda] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || disabled) return;

    onNext({
      title: title.trim(),
      participants: participants.trim() || undefined,
      agenda: agenda.trim() || undefined,
    });
  };

  const isSubmitDisabled = !title.trim() || disabled;

  // Textes et icônes selon le mode
  const isUploadMode = mode === 'upload';
  const Icon = isUploadMode ? Upload : Video;
  const buttonLabel = isUploadMode ? 'Lancer le traitement' : 'Démarrer l\'enregistrement';
  const subtitle = isUploadMode
    ? 'Renseignez les informations avant de lancer la transcription'
    : 'Donnez un nom à votre réunion avant de commencer l\'enregistrement';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Icône et titre */}
      <div className="text-center pb-2">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
          disabled ? 'bg-stone-100' : 'bg-amber-100'
        }`}>
          <Icon className={`w-8 h-8 ${disabled ? 'text-stone-400' : 'text-amber-600'}`} />
        </div>
        <h3 className="text-lg font-semibold text-stone-800">
          {isUploadMode ? 'Informations du fichier' : 'Nouvelle réunion'}
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          {disabled
            ? 'Sélectionnez un chantier pour commencer'
            : subtitle
          }
        </p>
      </div>

      {/* Fichier uploadé (si mode upload) */}
      {isUploadMode && uploadedFileName && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileAudio className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">
              {uploadedFileName}
            </p>
            <p className="text-xs text-stone-500">
              Fichier audio sélectionné
            </p>
          </div>
        </div>
      )}

      {/* Formulaire avec overlay disabled */}
      <div className="relative">
        {/* Overlay quand disabled */}
        {disabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
            <p className="text-sm font-medium text-stone-500 text-center px-4">
              Selectionnez un projet pour continuer
            </p>
          </div>
        )}

        <div className={`space-y-6 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Champ titre (obligatoire) */}
          <div>
            <label htmlFor="meeting-title" className="block text-sm font-medium text-stone-700 mb-1.5">
              Titre de la reunion <span className="text-red-500">*</span>
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunion de chantier Villa Rosa"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              autoFocus
              required
            />
          </div>

          {/* Bouton pour afficher les champs avances */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
          >
            {showAdvanced ? '\u25BC' : '\u25B6'} Options avancees (facultatif)
          </button>

          {/* Champs avances */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-amber-100">
              {/* Participants */}
              <div>
                <label htmlFor="meeting-participants" className="block text-sm font-medium text-stone-700 mb-1.5">
                  <Users className="w-4 h-4 inline mr-1" />
                  Participants
                </label>
                <input
                  id="meeting-participants"
                  type="text"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="Ex: M. Martin (OPC), M. Durand (Electricite)"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Separez les noms par des virgules
                </p>
              </div>

              {/* Ordre du jour */}
              <div>
                <label htmlFor="meeting-agenda" className="block text-sm font-medium text-stone-700 mb-1.5">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Ordre du jour
                </label>
                <textarea
                  id="meeting-agenda"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Points a aborder durant la reunion..."
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Conseil */}
          <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
            <p className="font-medium mb-1">Conseil</p>
            <p>
              {isUploadMode
                ? 'Renseignez les participants si vous les connaissez pour ameliorer la transcription.'
                : "Placez l'appareil au centre de la table pour une meilleure qualite audio."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {buttonLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

export default MeetingStep1Prepare;
