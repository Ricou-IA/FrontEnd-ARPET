/**
 * MemoModal - Meeting V3
 * Version: 1.0.0
 * Modale autonome pour l'enregistrement de mémos vocaux
 * Utilisable depuis le ChatInput ou ailleurs
 */

import { useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { MemoRecorder } from './MemoRecorder';
import { processAudio } from '../../services/meeting.service';
import type { MeetingPrepareData, MeetingProcessingStatus } from '../../services/meeting.service';

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID du projet (obligatoire pour créer un mémo) */
  projectId: string | null;
  /** ID de l'organisation */
  orgId: string | null;
  /** Nom du projet (pour affichage) */
  projectName?: string | null;
  /** Callback après succès (optionnel) */
  onSuccess?: (meetingId: string) => void;
}

type ModalStep = 'record' | 'processing' | 'success' | 'error';

export function MemoModal({
  isOpen,
  onClose,
  projectId,
  orgId,
  projectName,
  onSuccess,
}: MemoModalProps) {
  const [step, setStep] = useState<ModalStep>('record');
  const [processingStatus, setProcessingStatus] = useState<MeetingProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Reset state quand on ferme
  const handleClose = useCallback(() => {
    setStep('record');
    setProcessingStatus('idle');
    setError(null);
    onClose();
  }, [onClose]);

  // Traiter le mémo enregistré
  const handleRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!projectId || !orgId) {
      setError('Aucun chantier sélectionné');
      setStep('error');
      return;
    }

    // Générer un titre automatique
    const now = new Date();
    const memoTitle = `Mémo du ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const memoData: MeetingPrepareData = {
      title: memoTitle,
      source_type: 'memo',
      project_id: projectId,
      org_id: orgId,
    };

    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

    console.log('[MemoModal] Processing memo...', {
      title: memoTitle,
      duration,
      audioSize: audioBlob.size,
      projectId,
    });

    const { data, error: processError } = await processAudio(
      audioBlob,
      memoData,
      setProcessingStatus
    );

    if (processError || !data) {
      setError(processError?.message || 'Erreur lors du traitement');
      setProcessingStatus('error');
      setStep('error');
    } else {
      setProcessingStatus('completed');
      setStep('success');
      onSuccess?.(data.meeting_id);
    }
  }, [projectId, orgId, onSuccess]);

  // Pas de projet sélectionné
  const hasProject = !!projectId && !!orgId;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'record' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
              🗣️ Mémo vocal
            </h2>
            {projectName && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                📁 {projectName}
              </p>
            )}
          </div>
          {step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Alerte si pas de projet */}
        {!hasProject && step === 'record' && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Aucun chantier sélectionné
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Sélectionnez un chantier pour enregistrer un mémo.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Enregistrement */}
          {step === 'record' && (
            <MemoRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={handleClose}
              disabled={!hasProject}
            />
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">
                Traitement en cours...
              </h3>
              <p className="text-sm text-stone-500">
                {processingStatus === 'uploading' && 'Envoi de l\'audio...'}
                {processingStatus === 'transcribing' && 'Transcription en cours...'}
                {processingStatus === 'analyzing' && 'Analyse du contenu...'}
              </p>
            </div>
          )}

          {/* Succès */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">
                Mémo enregistré !
              </h3>
              <p className="text-sm text-stone-500 mb-6">
                Votre mémo a été transcrit et ajouté au chantier.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Erreur */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-stone-800 mb-2">
                Erreur
              </h3>
              <p className="text-sm text-red-600 mb-6">
                {error || 'Une erreur est survenue lors du traitement.'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep('record');
                    setError(null);
                  }}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                >
                  Réessayer
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoModal;
