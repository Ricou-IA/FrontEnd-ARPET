/**
 * MeetingRecordModal - Phase 2.2
 * Modale principale d'enregistrement de réunion (orchestre les 3 étapes)
 */

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { MeetingStep1Prepare } from './MeetingStep1Prepare';
import { MeetingStep2Record } from './MeetingStep2Record';
import { MeetingStep3Review } from './MeetingStep3Review';
import { processAudio } from '../../services/meeting.service';
import { useAppStore } from '../../stores/appStore';
import type { 
  MeetingStep, 
  MeetingPrepareData, 
  MeetingProcessingStatus,
  ProcessAudioResponse 
} from '../../types';

interface MeetingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingRecordModal({ isOpen, onClose }: MeetingRecordModalProps) {
  // State local
  const [step, setStep] = useState<MeetingStep>('prepare');
  const [prepareData, setPrepareData] = useState<MeetingPrepareData | null>(null);
  const [processingStatus, setProcessingStatus] = useState<MeetingProcessingStatus>('idle');
  const [result, setResult] = useState<ProcessAudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store
  const createSandboxItem = useAppStore((s) => s.createSandboxItem);

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
  const handlePrepareComplete = useCallback((data: MeetingPrepareData) => {
    setPrepareData(data);
    setStep('record');
  }, []);

  // Étape 2 → Étape 3 (traitement)
  const handleRecordComplete = useCallback(async (audioBlob: Blob, _duration: number) => {
    if (!prepareData) return;

    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

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
  }, []);

  // Ajouter au Sandbox
  const handleAddToSandbox = useCallback(async () => {
    if (!result || !prepareData) return;

    const crContent = `## Résumé\n${result.summary}\n\n## Points d'action\n${
      result.action_items.map(item => `- [ ] ${item.what} (${item.who}${item.when ? ` - ${item.when}` : ''})`).join('\n')
    }\n\n## Transcript\n${result.transcript}`;

    await createSandboxItem({
      title: `📹 ${prepareData.title}`,
      content: {
        objective: crContent,
        initial_prompt: prepareData.title,
        messages: [],
        display: {
          result_type: 'text',
          result_data: result.summary,
          last_run_at: new Date().toISOString(),
        },
        routine: null,
        source_type: 'meeting_cr',
        source_meeting_id: result.meeting_id,
      },
    });

    handleClose();
  }, [result, prepareData, createSandboxItem, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'prepare' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">
            {step === 'prepare' && '🎙️ Nouvelle réunion'}
            {step === 'record' && '🔴 Enregistrement'}
            {(step === 'processing' || step === 'review') && '📝 Compte-rendu'}
          </h2>
          {step !== 'record' && step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'prepare' && (
            <MeetingStep1Prepare
              onNext={handlePrepareComplete}
              onCancel={handleClose}
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
              onAddToSandbox={handleAddToSandbox}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingRecordModal;
