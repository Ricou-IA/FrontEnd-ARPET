/**
 * MeetingRecordModal - Meeting V3
 * Version: 4.0.0 - Support 3 modes de capture (enregistrer, importer, mémo)
 * Date: 2026-02-06
 */

import { useState, useCallback, useMemo } from 'react';
import { X, AlertCircle, Mic, Upload, MessageSquare, ArrowLeft } from 'lucide-react';
import { MeetingStep1Prepare } from './MeetingStep1Prepare';
import { MeetingStep2Record } from './MeetingStep2Record';
import { MeetingStep3Review } from './MeetingStep3Review';
import { MeetingUpload } from './MeetingUpload';
import { MemoRecorder } from './MemoRecorder';
import { processAudio } from '../../services/meeting.service';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../hooks/useAuth';
import type { MeetingSourceType } from '../../types/meeting.types';
import type {
  MeetingPrepareData,
  MeetingProcessingStatus,
  ProcessAudioResponse,
} from '../../services/meeting.service';

// ============================================================
// TYPES
// ============================================================

type MeetingStep = 'mode-select' | 'prepare' | 'upload' | 'record' | 'memo' | 'processing' | 'review';

type CaptureMode = 'recording' | 'uploaded_audio' | 'memo';

interface MeetingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================
// MODE SELECTOR COMPONENT
// ============================================================

interface ModeSelectorProps {
  onSelectMode: (mode: CaptureMode) => void;
  onCancel: () => void;
  disabled: boolean;
}

function ModeSelector({ onSelectMode, onCancel, disabled }: ModeSelectorProps) {
  const modes: { id: CaptureMode; icon: React.ReactNode; label: string; description: string }[] = [
    {
      id: 'recording',
      icon: <Mic className="w-6 h-6" />,
      label: 'Enregistrer',
      description: 'Capturer une réunion en direct',
    },
    {
      id: 'uploaded_audio',
      icon: <Upload className="w-6 h-6" />,
      label: 'Importer',
      description: 'Téléverser un fichier audio',
    },
    {
      id: 'memo',
      icon: <MessageSquare className="w-6 h-6" />,
      label: 'Mémo vocal',
      description: 'Note rapide personnelle',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-stone-800">
          Comment voulez-vous procéder ?
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          {disabled
            ? 'Sélectionnez un chantier pour commencer'
            : 'Choisissez un mode de capture audio'}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            disabled={disabled}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              flex items-center gap-4
              ${disabled
                ? 'border-stone-200 bg-stone-50 cursor-not-allowed'
                : 'border-stone-200 hover:border-amber-400 hover:bg-amber-50/50'
              }
            `}
          >
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
              ${disabled ? 'bg-stone-100 text-stone-400' : 'bg-amber-100 text-amber-600'}
            `}>
              {mode.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${disabled ? 'text-stone-400' : 'text-stone-800'}`}>
                {mode.label}
              </p>
              <p className={`text-sm ${disabled ? 'text-stone-400' : 'text-stone-500'}`}>
                {mode.description}
              </p>
            </div>
          </button>
        ))}
      </div>

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

// ============================================================
// MAIN MODAL COMPONENT
// ============================================================

export function MeetingRecordModal({ isOpen, onClose }: MeetingRecordModalProps) {
  // Stores
  const { activeProject } = useAppStore();
  const { profile } = useAuth();

  // Calculer org_id et project_id
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
  const [step, setStep] = useState<MeetingStep>('mode-select');
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null);
  const [prepareData, setPrepareData] = useState<MeetingPrepareData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<MeetingProcessingStatus>('idle');
  const [result, setResult] = useState<ProcessAudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state
  const resetState = useCallback(() => {
    setStep('mode-select');
    setCaptureMode(null);
    setPrepareData(null);
    setUploadedFile(null);
    setProcessingStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  // Fermer et reset
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Sélection du mode
  const handleModeSelect = useCallback((mode: CaptureMode) => {
    setCaptureMode(mode);

    if (mode === 'memo') {
      // Mémo : aller directement à l'enregistrement
      setStep('memo');
    } else if (mode === 'uploaded_audio') {
      // Upload : aller à l'écran d'upload
      setStep('upload');
    } else {
      // Recording : aller à la préparation
      setStep('prepare');
    }
  }, []);

  // Retour au sélecteur de mode
  const handleBackToModeSelect = useCallback(() => {
    setStep('mode-select');
    setCaptureMode(null);
    setUploadedFile(null);
    setError(null);
  }, []);

  // Fichier uploadé sélectionné
  const handleFileSelected = useCallback((file: File) => {
    setUploadedFile(file);
    setStep('prepare');
  }, []);

  // Retirer le fichier uploadé
  const handleFileRemove = useCallback(() => {
    setUploadedFile(null);
    setStep('upload');
  }, []);

  // Préparation terminée → enregistrement ou traitement
  const handlePrepareComplete = useCallback((data: Omit<MeetingPrepareData, 'project_id' | 'org_id' | 'source_type'>) => {
    if (!projectContext.project_id || !projectContext.org_id) {
      setError('Veuillez sélectionner un chantier avant d\'enregistrer une réunion.');
      return;
    }

    const sourceType: MeetingSourceType = captureMode || 'recording';

    const fullData: MeetingPrepareData = {
      ...data,
      source_type: sourceType,
      project_id: projectContext.project_id,
      org_id: projectContext.org_id,
    };

    setPrepareData(fullData);

    if (captureMode === 'uploaded_audio' && uploadedFile) {
      // Upload : traiter directement le fichier
      handleProcessUploadedFile(fullData, uploadedFile);
    } else {
      // Recording : passer à l'enregistrement
      setStep('record');
    }
  }, [projectContext, captureMode, uploadedFile]);

  // Traiter un fichier uploadé
  const handleProcessUploadedFile = useCallback(async (data: MeetingPrepareData, file: File) => {
    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

    console.log('[MeetingRecordModal] Processing uploaded file...', {
      fileName: file.name,
      fileSize: file.size,
      project_id: data.project_id,
      org_id: data.org_id,
    });

    // Convertir le File en Blob pour processAudio
    const audioBlob = new Blob([await file.arrayBuffer()], { type: file.type });

    const { data: resultData, error: processError } = await processAudio(
      audioBlob,
      data,
      setProcessingStatus
    );

    if (processError || !resultData) {
      setError(processError?.message || 'Erreur lors du traitement');
      setProcessingStatus('error');
    } else {
      setResult(resultData);
      setProcessingStatus('completed');
      setStep('review');
    }
  }, []);

  // Enregistrement terminé
  const handleRecordComplete = useCallback(async (audioBlob: Blob, _duration: number) => {
    if (!prepareData) return;

    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

    console.log('[MeetingRecordModal] Processing recording...', {
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

  // Mémo terminé
  const handleMemoComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!projectContext.project_id || !projectContext.org_id) {
      setError('Veuillez sélectionner un chantier.');
      return;
    }

    // Pour les mémos, générer un titre automatique
    const now = new Date();
    const memoTitle = `Mémo du ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const memoData: MeetingPrepareData = {
      title: memoTitle,
      source_type: 'memo',
      project_id: projectContext.project_id,
      org_id: projectContext.org_id,
    };

    setPrepareData(memoData);
    setStep('processing');
    setProcessingStatus('uploading');
    setError(null);

    console.log('[MeetingRecordModal] Processing memo...', {
      title: memoTitle,
      duration,
      audioSize: audioBlob.size,
    });

    const { data, error: processError } = await processAudio(
      audioBlob,
      memoData,
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
  }, [projectContext]);

  // State pour confirmation de retour
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Retour à la préparation (avec confirmation depuis record)
  const handleBackToStep1 = useCallback(() => {
    if (step === 'record') {
      setShowBackConfirm(true);
      return;
    }
    if (captureMode === 'uploaded_audio') {
      setStep('upload');
    } else {
      setStep('prepare');
    }
    setError(null);
  }, [captureMode, step]);

  // Confirmation de retour depuis record
  const handleConfirmBack = useCallback(() => {
    setShowBackConfirm(false);
    if (captureMode === 'uploaded_audio') {
      setStep('upload');
    } else {
      setStep('prepare');
    }
    setError(null);
  }, [captureMode]);

  const handleCancelBack = useCallback(() => {
    setShowBackConfirm(false);
  }, []);

  // Fermer après review
  const handleFinish = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Titre du header selon l'étape
  const getHeaderTitle = () => {
    switch (step) {
      case 'mode-select':
        return 'Nouvelle réunion';
      case 'prepare':
        if (captureMode === 'uploaded_audio') return 'Importer un audio';
        return 'Préparation';
      case 'upload':
        return 'Importer un fichier';
      case 'record':
        return 'Enregistrement';
      case 'memo':
        return 'Mémo vocal';
      case 'processing':
      case 'review':
        return 'Compte-rendu';
      default:
        return 'Réunion';
    }
  };

  // Icône du header selon l'étape
  const getHeaderIcon = () => {
    switch (step) {
      case 'mode-select':
      case 'prepare':
        return '🎙️';
      case 'upload':
        return '📁';
      case 'record':
        return '🔴';
      case 'memo':
        return '🗣️';
      case 'processing':
      case 'review':
        return '📝';
      default:
        return '🎙️';
    }
  };

  // Peut-on afficher le bouton retour ?
  const canGoBack = step === 'prepare' || step === 'upload' || step === 'memo';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'mode-select' ? handleClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={getHeaderTitle()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-3">
            {/* Bouton retour */}
            {canGoBack && (
              <button
                onClick={handleBackToModeSelect}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                {getHeaderIcon()} {getHeaderTitle()}
              </h2>
              {/* Afficher le projet actif */}
              {projectContext.projectName && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  📁 {projectContext.projectName}
                </p>
              )}
            </div>
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
        {!projectContext.hasProject && (step === 'mode-select' || step === 'prepare' || step === 'upload' || step === 'memo') && (
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
        {error && (step === 'mode-select' || step === 'prepare' || step === 'upload') && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Confirmation retour depuis enregistrement */}
          {showBackConfirm && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 rounded-2xl">
              <div className="bg-white rounded-xl shadow-xl p-5 mx-6 max-w-sm w-full space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      Quitter l&apos;enregistrement ?
                    </p>
                    <p className="text-sm text-stone-500 mt-1">
                      L&apos;enregistrement en cours sera perdu.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelBack}
                    className="flex-1 px-3 py-2 border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    Continuer
                  </button>
                  <button
                    onClick={handleConfirmBack}
                    className="flex-1 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Quitter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sélecteur de mode */}
          {step === 'mode-select' && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <ModeSelector
                onSelectMode={handleModeSelect}
                onCancel={handleClose}
                disabled={!projectContext.hasProject}
              />
            </div>
          )}

          {/* Upload */}
          {step === 'upload' && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <MeetingUpload
                onFileSelected={handleFileSelected}
                onCancel={handleBackToModeSelect}
                disabled={!projectContext.hasProject}
                selectedFile={uploadedFile}
                onFileRemove={handleFileRemove}
              />
            </div>
          )}

          {/* Préparation */}
          {step === 'prepare' && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <MeetingStep1Prepare
                onNext={handlePrepareComplete}
                onCancel={handleBackToModeSelect}
                disabled={!projectContext.hasProject}
                mode={captureMode === 'uploaded_audio' ? 'upload' : 'record'}
                uploadedFileName={uploadedFile?.name}
              />
            </div>
          )}

          {/* Enregistrement */}
          {step === 'record' && prepareData && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <MeetingStep2Record
                prepareData={prepareData}
                onComplete={handleRecordComplete}
                onBack={handleBackToStep1}
              />
            </div>
          )}

          {/* Mémo */}
          {step === 'memo' && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <MemoRecorder
                onRecordingComplete={handleMemoComplete}
                onCancel={handleBackToModeSelect}
                disabled={!projectContext.hasProject}
              />
            </div>
          )}

          {/* Review */}
          {(step === 'processing' || step === 'review') && prepareData && (
            <div className="animate-[fadeIn_0.15s_ease-out]">
              <MeetingStep3Review
                prepareData={prepareData}
                processingStatus={processingStatus}
                result={result}
                error={error}
                projectId={projectContext.project_id}
                onAddToSandbox={handleFinish}
                onClose={handleClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingRecordModal;
