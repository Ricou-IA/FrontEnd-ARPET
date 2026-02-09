/**
 * MemoRecorder - Meeting V3
 * Version: 1.0.0
 * Enregistrement simplifié pour mémos vocaux
 * UX minimaliste : un seul bouton, pas de formulaire lourd
 */

import { useState, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatDuration } from '../../services/meeting.service';

interface MemoRecorderProps {
  /** Callback quand l'enregistrement est terminé */
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  /** Callback pour annuler */
  onCancel: () => void;
  /** Désactivé (ex: pas de projet sélectionné) */
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'stopping';

export function MemoRecorder({
  onRecordingComplete,
  onCancel,
  disabled = false,
}: MemoRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    reset,
    error: recorderError,
    hasPermission,
  } = useAudioRecorder();

  // Durée minimum pour un mémo (3 secondes)
  const MIN_DURATION = 3;

  // Sync recorder state
  useEffect(() => {
    if (recorderError) {
      setError(recorderError);
      setState('idle');
    }
  }, [recorderError]);

  // Quand l'audio est prêt après l'arrêt
  useEffect(() => {
    if (state === 'stopping' && audioBlob && !isRecording) {
      onRecordingComplete(audioBlob, duration);
    }
  }, [state, audioBlob, isRecording, duration, onRecordingComplete]);

  // Démarrer l'enregistrement
  const handleStartRecording = useCallback(async () => {
    if (disabled) return;

    setError(null);
    try {
      await startRecording();
      setState('recording');
    } catch (err) {
      setError((err as Error).message || 'Impossible de démarrer l\'enregistrement');
    }
  }, [disabled, startRecording]);

  // Arrêter l'enregistrement
  const handleStopRecording = useCallback(() => {
    if (duration < MIN_DURATION) {
      setError(`Enregistrement trop court (minimum ${MIN_DURATION} secondes)`);
      return;
    }

    setState('stopping');
    stopRecording();
  }, [duration, stopRecording]);

  // Annuler
  const handleCancel = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    reset();
    setState('idle');
    onCancel();
  }, [isRecording, stopRecording, reset, onCancel]);

  // Message d'erreur de permission
  if (hasPermission === false) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Accès au microphone refusé
          </h3>
          <p className="text-sm text-stone-600 max-w-xs mx-auto">
            Autorisez l'accès au microphone dans les paramètres de votre navigateur pour enregistrer un mémo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="w-full px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center">
        <div className={`
          w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4
          ${state === 'recording' ? 'bg-red-100' : disabled ? 'bg-stone-100' : 'bg-amber-100'}
          ${state === 'recording' ? 'animate-pulse' : ''}
        `}>
          {state === 'stopping' ? (
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          ) : (
            <Mic className={`
              w-10 h-10
              ${state === 'recording' ? 'text-red-600' : disabled ? 'text-stone-400' : 'text-amber-600'}
            `} />
          )}
        </div>

        <h3 className="text-lg font-semibold text-stone-800">
          {state === 'idle' && 'Mémo vocal'}
          {state === 'recording' && 'Enregistrement en cours...'}
          {state === 'stopping' && 'Finalisation...'}
        </h3>

        <p className="text-sm text-stone-500 mt-1">
          {state === 'idle' && (disabled
            ? 'Sélectionnez un chantier pour enregistrer'
            : 'Enregistrez une note vocale rapide'
          )}
          {state === 'recording' && 'Appuyez sur Stop quand vous avez terminé'}
          {state === 'stopping' && 'Préparation de l\'audio...'}
        </p>
      </div>

      {/* Timer (visible pendant l'enregistrement) */}
      {state === 'recording' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-50 rounded-full">
            {/* Indicateur rouge pulsant */}
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            {/* Timer */}
            <span className="text-2xl font-mono font-bold text-red-700">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Indication durée minimum */}
          {duration < MIN_DURATION && (
            <p className="text-xs text-stone-500 mt-2">
              Minimum {MIN_DURATION} secondes
            </p>
          )}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Boutons */}
      <div className="space-y-3">
        {state === 'idle' && (
          <>
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={disabled}
              className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Démarrer l'enregistrement
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
            >
              Annuler
            </button>
          </>
        )}

        {state === 'recording' && (
          <button
            type="button"
            onClick={handleStopRecording}
            disabled={duration < MIN_DURATION}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            Arrêter ({formatDuration(duration)})
          </button>
        )}

        {state === 'stopping' && (
          <button
            type="button"
            disabled
            className="w-full px-4 py-3 bg-stone-300 text-stone-500 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            Traitement...
          </button>
        )}
      </div>

      {/* Info mémo */}
      {state === 'idle' && !disabled && (
        <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
          <p className="font-medium mb-1">A propos des memos</p>
          <ul className="text-xs space-y-1 text-stone-500">
            <li>Les memos vocaux doivent faire au minimum {MIN_DURATION} secondes</li>
            <li>Ideal pour les notes rapides sur le chantier</li>
            <li>Pas de diarisation (1 seul locuteur)</li>
            <li>Visible uniquement par vous (promotable ensuite)</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default MemoRecorder;
