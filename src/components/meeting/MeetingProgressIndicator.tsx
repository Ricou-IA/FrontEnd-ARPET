/**
 * MeetingProgressIndicator - Phase 2.2
 * Version: 1.1.0 — Fix: identify the failing step on error
 * Indicateur de progression du traitement audio
 */

import { useRef, useEffect } from 'react';
import { Upload, FileAudio, Brain, CheckCircle, Loader2, X } from 'lucide-react';
import type { MeetingProcessingStatus } from '../../types';
import { MEETING_PROCESSING_LABELS } from '../../types';

interface MeetingProgressIndicatorProps {
  status: MeetingProcessingStatus;
  className?: string;
}

interface StepConfig {
  key: MeetingProcessingStatus;
  icon: React.ElementType;
  label: string;
}

const STEPS: StepConfig[] = [
  { key: 'uploading', icon: Upload, label: 'Envoi' },
  { key: 'transcribing', icon: FileAudio, label: 'Transcription' },
  { key: 'analyzing', icon: Brain, label: 'Analyse' },
  { key: 'completed', icon: CheckCircle, label: 'Termine' },
];

export function MeetingProgressIndicator({ status, className = '' }: MeetingProgressIndicatorProps) {
  // Track the last valid step index so we know which step failed
  const lastValidIndexRef = useRef(0);

  const currentIndex = STEPS.findIndex(s => s.key === status);
  const isError = status === 'error';

  // Update last valid index when status is a known step
  useEffect(() => {
    if (currentIndex >= 0) {
      lastValidIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // On error, the failing step is the last valid one
  const errorStepIndex = isError ? lastValidIndexRef.current : -1;

  return (
    <div className={`w-full ${className}`} role="group" aria-label="Progression du traitement">
      {/* Barre de progression */}
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isErrorStep = isError && index === errorStepIndex;
          const isActive = step.key === status;
          const isCompleted = isError
            ? index < errorStepIndex
            : (currentIndex > index || status === 'completed');
          const isPending = isError
            ? index > errorStepIndex
            : (currentIndex < index && status !== 'completed');

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Etape */}
              <div
                className="flex flex-col items-center"
                aria-current={isActive || isErrorStep ? 'step' : undefined}
                aria-label={`${step.label}: ${isErrorStep ? 'erreur' : isCompleted ? 'termine' : isActive ? 'en cours' : 'en attente'}`}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isErrorStep ? 'bg-red-100 text-red-600' : ''}
                    ${isCompleted && !isErrorStep ? 'bg-green-100 text-green-600' : ''}
                    ${isActive && !isError ? 'bg-amber-100 text-amber-600' : ''}
                    ${isPending ? 'bg-stone-100 text-stone-400' : ''}
                  `}
                >
                  {isErrorStep ? (
                    <X className="w-5 h-5" />
                  ) : isActive && !isError && !isCompleted ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`
                    text-xs mt-1.5 font-medium transition-colors
                    ${isErrorStep ? 'text-red-600' : ''}
                    ${isCompleted && !isErrorStep ? 'text-green-600' : ''}
                    ${isActive && !isError ? 'text-amber-600' : ''}
                    ${isPending ? 'text-stone-400' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Ligne de connexion */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-colors duration-300
                    ${isCompleted && !isErrorStep ? 'bg-green-300' : ''}
                    ${isErrorStep ? 'bg-red-300' : ''}
                    ${!isCompleted && !isErrorStep ? 'bg-stone-200' : ''}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Message de statut */}
      <div className="text-center" aria-live="polite">
        <p
          className={`
            text-sm font-medium
            ${isError ? 'text-red-600' : 'text-stone-600'}
          `}
        >
          {isError
            ? `Erreur lors de l'etape : ${STEPS[errorStepIndex]?.label || 'inconnue'}`
            : MEETING_PROCESSING_LABELS[status]
          }
        </p>
      </div>
    </div>
  );
}

export default MeetingProgressIndicator;
