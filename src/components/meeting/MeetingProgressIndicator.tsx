/**
 * MeetingProgressIndicator - Phase 2.2
 * Indicateur de progression du traitement audio
 */

import { Upload, FileAudio, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  { key: 'completed', icon: CheckCircle, label: 'Terminé' },
];

export function MeetingProgressIndicator({ status, className = '' }: MeetingProgressIndicatorProps) {
  const currentIndex = STEPS.findIndex(s => s.key === status);
  const isError = status === 'error';

  return (
    <div className={`w-full ${className}`}>
      {/* Barre de progression */}
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === status;
          const isCompleted = currentIndex > index || status === 'completed';
          const isPending = currentIndex < index && status !== 'completed';

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Étape */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isError && isActive ? 'bg-red-100 text-red-600' : ''}
                    ${isCompleted ? 'bg-green-100 text-green-600' : ''}
                    ${isActive && !isError ? 'bg-amber-100 text-amber-600' : ''}
                    ${isPending ? 'bg-stone-100 text-stone-400' : ''}
                  `}
                >
                  {isActive && !isError && !isCompleted ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isError && isActive ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`
                    text-xs mt-1.5 font-medium transition-colors
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isActive ? 'text-amber-600' : ''}
                    ${isPending ? 'text-stone-400' : ''}
                    ${isError && isActive ? 'text-red-600' : ''}
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
                    ${currentIndex > index || status === 'completed' ? 'bg-green-300' : 'bg-stone-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Message de statut */}
      <div className="text-center">
        <p
          className={`
            text-sm font-medium
            ${isError ? 'text-red-600' : 'text-stone-600'}
          `}
        >
          {MEETING_PROCESSING_LABELS[status]}
        </p>
      </div>
    </div>
  );
}

export default MeetingProgressIndicator;
