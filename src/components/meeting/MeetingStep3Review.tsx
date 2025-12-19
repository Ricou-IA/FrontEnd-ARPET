/**
 * MeetingStep3Review - Phase 2.2
 * Étape 3 : Affichage du CR généré et actions
 */

import { useState } from 'react';
import { 
  CheckCircle, 
  ListTodo, 
  HelpCircle, 
  FileText, 
  Pin, 
  Copy,
  Check,
  User,
  Calendar
} from 'lucide-react';
import type { 
  ProcessAudioResponse, 
  MeetingPrepareData,
  MeetingActionItem,
  MeetingProcessingStatus
} from '../../types';
import { MeetingProgressIndicator } from './MeetingProgressIndicator';

interface MeetingStep3ReviewProps {
  prepareData: MeetingPrepareData;
  processingStatus: MeetingProcessingStatus;
  result: ProcessAudioResponse | null;
  error: string | null;
  onAddToSandbox: () => void;
  onClose: () => void;
}

export function MeetingStep3Review({
  prepareData,
  processingStatus,
  result,
  error,
  onAddToSandbox,
  onClose,
}: MeetingStep3ReviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  // Copier le CR dans le presse-papier
  const handleCopy = async () => {
    if (!result) return;

    const crText = `# ${prepareData.title}

## Résumé
${result.summary}

## Points d'action
${result.action_items.map(item => `- [ ] ${item.what} (${item.who}${item.when ? ` - ${item.when}` : ''})`).join('\n')}

## Transcript complet
${result.transcript}`.trim();

    await navigator.clipboard.writeText(crText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // En cours de traitement
  if (processingStatus !== 'completed' && processingStatus !== 'error') {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Traitement en cours...
          </h3>
          <p className="text-sm text-stone-500">
            Veuillez patienter pendant l'analyse de votre réunion
          </p>
        </div>

        <MeetingProgressIndicator status={processingStatus} />

        <div className="text-center pt-4">
          <p className="text-xs text-stone-400">
            Ce processus peut prendre quelques minutes selon la durée de l'enregistrement
          </p>
        </div>
      </div>
    );
  }

  // Erreur
  if (error || processingStatus === 'error') {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Erreur de traitement
          </h3>
          <p className="text-sm text-red-600">
            {error || 'Une erreur est survenue lors du traitement de l\'audio'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors"
        >
          Fermer
        </button>
      </div>
    );
  }

  // Résultat OK
  if (!result) return null;

  return (
    <div className="space-y-5">
      {/* En-tête succès */}
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">
            Compte-rendu généré avec succès !
          </p>
          <p className="text-xs text-green-600">
            {prepareData.title}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'summary' 
              ? 'text-amber-600' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Résumé & Actions
          {activeTab === 'summary' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'transcript' 
              ? 'text-amber-600' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Transcript complet
          {activeTab === 'transcript' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="max-h-[300px] overflow-y-auto">
        {activeTab === 'summary' ? (
          <div className="space-y-4">
            {/* Résumé */}
            <div className="bg-stone-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Résumé
              </h4>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {result.summary || 'Aucun résumé disponible'}
              </p>
            </div>

            {/* Actions */}
            {result.action_items && result.action_items.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Points d'action ({result.action_items.length})
                </h4>
                <ul className="space-y-2">
                  {result.action_items.map((item: MeetingActionItem) => (
                    <li 
                      key={item.id} 
                      className="flex items-start gap-2 text-sm bg-white rounded-lg p-2.5 border border-amber-100"
                    >
                      <input type="checkbox" className="mt-0.5 rounded" />
                      <div className="flex-1">
                        <p className="text-stone-700">{item.what}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.who}
                          </span>
                          {item.when && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.when}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-stone-50 rounded-lg p-4">
            <p className="text-sm text-stone-600 whitespace-pre-wrap font-mono leading-relaxed">
              {result.transcript || 'Aucun transcript disponible'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
        <button
          onClick={onAddToSandbox}
          className="flex-1 min-w-[140px] px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Pin className="w-4 h-4" />
          Épingler au Sandbox
        </button>

        <button
          onClick={handleCopy}
          className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copier
            </>
          )}
        </button>

        <button
          onClick={onClose}
          className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default MeetingStep3Review;
