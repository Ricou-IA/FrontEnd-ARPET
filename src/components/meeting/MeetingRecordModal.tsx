/**
 * MeetingRecordModal - Phase 7
 * Version: 3.0.0 - Connexion à meeting-transcribe avec project_id/org_id
 * Date: 2026-01-02
 */

import { useState, useCallback, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { MeetingStep1Prepare } from './MeetingStep1Prepare';
import { MeetingStep2Record } from './MeetingStep2Record';
import { MeetingStep3Review } from './MeetingStep3Review';
import { processAudio } from '../../services/meeting.service';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../hooks/useAuth';
import type { 
  MeetingPrepareData, 
  MeetingProcessingStatus,
  ProcessAudioResponse 
} from '../../services/meeting.service';

type MeetingStep = 'prepare' | 'record' | 'processing' | 'review';

interface MeetingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingRecordModal({ isOpen, onClose }: MeetingRecordModalProps) {
  // Stores
  const { activeProject } = useAppStore();
  const { profile } = useAuth();

  // Calculer org_id et project_id (même logique que Dashboard)
  const projectContext = useMemo(() => {
    const effectiveOrgId = activeProject?.org_id || profile?.org_id || null;
    const effectiveProjectId = activeProject?.id || null;
    
    return {
      org_id: effectiveOrgId,
      project_id: effectiveProjectId,
      hasProject: !!effectiveProjectId,
      projectName: activeProject?.name || null,
    };
  }, [activeProject, profile]);

  // State local
  const [step, setStep] = useState<MeetingStep>('prepare');
  const [prepareData, setPrepareData] = useState<MeetingPrepareData | null>(null);
  const [processingStatus, setProcessingStatus] = useState<MeetingProcessingStatus>('idle');
  const [result, setResult] = useState<ProcessAudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state
  const resetState = useCallback(() => {
    setStep('prepare');
    setPrepareData(null);
    setProcessingStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  // Fermer et reset
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Étape 1 → Étape 2
  const handlePrepareComplete = useCallback((data: Omit<MeetingPrepareData, 'project_id' | 'org_id'>) => {
    // Vérifier qu'on a un projet sélectionné
    if (!projectContext.project_id || !projectContext.org_id) {
      setError('Veuillez sélectionner un chantier avant d\'enregistrer une réunion.');
      return;
    }

    // Enrichir les données avec project_id et org_id
    const fullData: MeetingPrepareData = {
      ...data,
      project_id: projectContext.project_id,
      org_id: projectContext.org_id,
    };

    setPrepareData(fullData);
    setStep('record');
  }, [projectContext]);

  // Étape 2 → Étape 3 (traitement)
  const handleRecordComplete = useCallback(async (audioBlob: Blob, _duration: number) => {
    if (!prepareData) return;

    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

    console.log('[MeetingRecordModal] Envoi audio...', {
      project_id: prepareData.project_id,
      org_id: prepareData.org_id,
      title: prepareData.title,
      audioSize: audioBlob.size,
    });

    const { data, error: processError } = await processAudio(
      audioBlob,
      prepareData,
      setProcessingStatus
    );

    if (processError || !data) {
      setError(processError?.message || 'Erreur lors du traitement');
      setProcessingStatus('error');
    } else {
      setResult(data);
      setProcessingStatus('completed');
      setStep('review');
    }
  }, [prepareData]);

  // Retour étape 2 → étape 1
  const handleBackToStep1 = useCallback(() => {
    setStep('prepare');
    setError(null);
  }, []);

  // Fermer après review
  const handleFinish = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'prepare' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
              {step === 'prepare' && '🎙️ Nouvelle réunion'}
              {step === 'record' && '🔴 Enregistrement'}
              {(step === 'processing' || step === 'review') && '📝 Compte-rendu'}
            </h2>
            {/* Afficher le projet actif */}
            {projectContext.projectName && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                📁 {projectContext.projectName}
              </p>
            )}
          </div>
          {step !== 'record' && step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Alerte si pas de projet */}
        {!projectContext.hasProject && step === 'prepare' && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Aucun chantier sélectionné
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Sélectionnez un chantier dans le menu pour enregistrer une réunion.
              </p>
            </div>
          </div>
        )}

        {/* Erreur générale */}
        {error && step === 'prepare' && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'prepare' && (
            <MeetingStep1Prepare
              onNext={handlePrepareComplete}
              onCancel={handleClose}
              disabled={!projectContext.hasProject}
            />
          )}

          {step === 'record' && prepareData && (
            <MeetingStep2Record
              prepareData={prepareData}
              onComplete={handleRecordComplete}
              onBack={handleBackToStep1}
            />
          )}

          {(step === 'processing' || step === 'review') && prepareData && (
            <MeetingStep3Review
              prepareData={prepareData}
              processingStatus={processingStatus}
              result={result}
              error={error}
              onAddToSandbox={handleFinish}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingRecordModal;
