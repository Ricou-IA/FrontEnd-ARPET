/**
 * MeetingStep1Prepare - Phase 7
 * Version: 3.0.0 - Support prop disabled
 * Étape 1 : Préparation de la réunion (titre, participants optionnels)
 */

import React, { useState } from 'react';
import { Video, Users, FileText, ArrowRight } from 'lucide-react';
import { generateDefaultTitle } from '../../services/meeting.service';

/**
 * Données de sortie de l'étape 1 (sans project_id/org_id, ajoutés par le parent)
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
}

export function MeetingStep1Prepare({ onNext, onCancel, disabled = false }: MeetingStep1PrepareProps) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Icône et titre */}
      <div className="text-center pb-2">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
          disabled ? 'bg-stone-100' : 'bg-amber-100'
        }`}>
          <Video className={`w-8 h-8 ${disabled ? 'text-stone-400' : 'text-amber-600'}`} />
        </div>
        <h3 className="text-lg font-semibold text-stone-800">
          Nouvelle réunion
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          {disabled 
            ? 'Sélectionnez un chantier pour commencer'
            : 'Donnez un nom à votre réunion avant de commencer l\'enregistrement'
          }
        </p>
      </div>

      {/* Champ titre (obligatoire) */}
      <div>
        <label htmlFor="meeting-title" className="block text-sm font-medium text-stone-700 mb-1.5">
          Titre de la réunion <span className="text-red-500">*</span>
        </label>
        <input
          id="meeting-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Réunion de chantier Villa Rosa"
          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:bg-stone-50 disabled:text-stone-400"
          autoFocus
          required
          disabled={disabled}
        />
      </div>

      {/* Bouton pour afficher les champs avancés */}
      {!disabled && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} Options avancées (facultatif)
        </button>
      )}

      {/* Champs avancés */}
      {showAdvanced && !disabled && (
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
              placeholder="Ex: M. Martin (OPC), M. Durand (Électricité)"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm"
            />
            <p className="text-xs text-stone-400 mt-1">
              Séparez les noms par des virgules
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
              placeholder="Points à aborder durant la réunion..."
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm resize-none"
            />
          </div>
        </div>
      )}

      {/* Conseil */}
      {!disabled && (
        <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
          <p className="font-medium mb-1">💡 Conseil</p>
          <p>Placez l'appareil au centre de la table pour une meilleure qualité audio.</p>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Démarrer
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

export default MeetingStep1Prepare;
