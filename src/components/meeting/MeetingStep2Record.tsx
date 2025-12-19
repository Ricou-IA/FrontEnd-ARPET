/**
 * MeetingStep2Record - Phase 2.2
 * Étape 2 : Enregistrement audio de la réunion
 */

import { useEffect, useCallback } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatDuration } from '../../services/meeting.service';
import type { MeetingPrepareData } from '../../types';

interface MeetingStep2RecordProps {
  prepareData: MeetingPrepareData;
  onComplete: (audioBlob: Blob, duration: number) => void;
  onBack: () => void;
}

export function MeetingStep2Record({ prepareData, onComplete, onBack }: MeetingStep2RecordProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder();

  // Démarrer l'enregistrement automatiquement
  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand le blob est prêt, appeler onComplete
  useEffect(() => {
    if (audioBlob && duration > 0) {
      onComplete(audioBlob, duration);
    }
  }, [audioBlob, duration, onComplete]);

  // Gérer l'arrêt de l'enregistrement
  const handleStop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Annuler et revenir
  const handleCancel = useCallback(() => {
    reset();
    onBack();
  }, [reset, onBack]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">
          {prepareData.title}
        </h3>
        <p className="text-sm text-stone-500">
          Enregistrement en cours...
        </p>
      </div>

      {/* Zone d'enregistrement */}
      <div className="bg-stone-50 rounded-2xl p-8 text-center">
        {/* Indicateur d'enregistrement */}
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Cercle animé */}
          <div
            className={`
              absolute w-32 h-32 rounded-full transition-all duration-300
              ${isRecording ? 'animate-pulse bg-red-100' : 'bg-stone-200'}
            `}
          />
          <div
            className={`
              absolute w-24 h-24 rounded-full transition-all duration-300
              ${isRecording ? 'animate-pulse bg-red-200' : 'bg-stone-300'}
            `}
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center transition-all
              ${isRecording ? 'bg-red-500' : 'bg-stone-400'}
            `}
          >
            <Mic className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Timer */}
        <div className="mb-6">
          <span className="text-4xl font-mono font-bold text-stone-800">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Statut */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className={`
              w-3 h-3 rounded-full
              ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-stone-400'}
            `}
          />
          <span className="text-sm text-stone-600">
            {isRecording ? 'Enregistrement en cours' : 'En attente'}
          </span>
        </div>

        {/* Erreur */}
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Bouton Stop */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleStop}
            disabled={duration < 5}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Arrêter et traiter"
          >
            <Square className="w-5 h-5" />
            Arrêter et traiter
          </button>
        </div>

        {/* Durée minimale */}
        {duration < 5 && (
          <p className="text-xs text-stone-400 mt-4">
            Enregistrez au moins 5 secondes
          </p>
        )}
      </div>

      {/* Conseils */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <p className="text-amber-800">
          <strong>💡 Astuce :</strong> Parlez clairement et évitez les bruits de fond pour une meilleure transcription.
        </p>
      </div>

      {/* Bouton retour */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← Annuler et revenir en arrière
        </button>
      </div>
    </div>
  );
}

export default MeetingStep2Record;
