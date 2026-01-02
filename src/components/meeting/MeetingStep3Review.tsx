/**
 * MeetingStep3Review - Phase 7
 * Version: 3.0.0 - Affichage items groupés (décisions, actions, issues)
 * Étape 3 : Affichage du CR généré et actions
 */

import { useState } from 'react';
import { 
  CheckCircle, 
  HelpCircle, 
  FileText, 
  Copy,
  Check,
  User,
  Calendar,
  Users,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { MeetingProgressIndicator } from './MeetingProgressIndicator';
import {
  type ProcessAudioResponse,
  type MeetingPrepareData,
  type MeetingProcessingStatus,
  type MeetingItem,
  groupItemsByType,
  getItemTypeIcon,
  getItemTypeLabel,
  getItemTypeColor,
} from '../../services/meeting.service';

interface MeetingStep3ReviewProps {
  prepareData: MeetingPrepareData;
  processingStatus: MeetingProcessingStatus;
  result: ProcessAudioResponse | null;
  error: string | null;
  onAddToSandbox: () => void;
  onClose: () => void;
}

export function MeetingStep3Review({
  prepareData: _prepareData,
  processingStatus,
  result,
  error,
  onAddToSandbox,
  onClose,
}: MeetingStep3ReviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'transcript'>('summary');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    decisions: true,
    actions: true,
    issues: true,
    infos: false,
  });

  // Grouper les items par type
  const groupedItems = result?.items ? groupItemsByType(result.items) : null;

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Copier le CR dans le presse-papier
  const handleCopy = async () => {
    if (!result) return;

    const itemsText = result.items
      .map(item => `- [${getItemTypeLabel(item.item_type)}] ${item.subject}${item.responsible ? ` (${item.responsible})` : ''}${item.lot_reference ? ` - ${item.lot_reference}` : ''}`)
      .join('\n');

    const participantsText = result.meeting.participants
      .map(p => p.role ? `${p.name} (${p.role})` : p.name)
      .join(', ');

    const crText = `# ${result.meeting.meeting_title}
${result.meeting.meeting_date ? `Date: ${result.meeting.meeting_date}` : ''}
${participantsText ? `Participants: ${participantsText}` : ''}

## Résumé
${result.meeting.summary}

## Points extraits
${itemsText}

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
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Compte-rendu généré avec succès !
          </p>
          <p className="text-xs text-green-600">
            {result.meeting.meeting_title}
          </p>
        </div>
      </div>

      {/* Compteurs */}
      <div className="flex gap-2 flex-wrap">
        {result.meeting.decisions_count > 0 && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            ✅ {result.meeting.decisions_count} décision{result.meeting.decisions_count > 1 ? 's' : ''}
          </span>
        )}
        {result.meeting.actions_count > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            📋 {result.meeting.actions_count} action{result.meeting.actions_count > 1 ? 's' : ''}
          </span>
        )}
        {result.meeting.issues_count > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            ⚠️ {result.meeting.issues_count} problème{result.meeting.issues_count > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Participants */}
      {result.meeting.participants.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Users className="w-4 h-4" />
          <span>
            {result.meeting.participants.map((p, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <span className="font-medium">{p.name}</span>
                {p.role && <span className="text-stone-400"> ({p.role})</span>}
              </span>
            ))}
          </span>
        </div>
      )}

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
          Résumé
          {activeTab === 'summary' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'items' 
              ? 'text-amber-600' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Décisions & Actions
          {activeTab === 'items' && (
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
          Transcript
          {activeTab === 'transcript' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="max-h-[300px] overflow-y-auto">
        {/* Onglet Résumé */}
        {activeTab === 'summary' && (
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Résumé
            </h4>
            <p className="text-sm text-stone-600 whitespace-pre-wrap">
              {result.meeting.summary || 'Aucun résumé disponible'}
            </p>
          </div>
        )}

        {/* Onglet Items (Décisions & Actions) */}
        {activeTab === 'items' && groupedItems && (
          <div className="space-y-4">
            {/* Décisions */}
            {groupedItems.decisions.length > 0 && (
              <ItemSection
                title="Décisions"
                items={groupedItems.decisions}
                type="decision"
                expanded={expandedSections.decisions}
                onToggle={() => toggleSection('decisions')}
              />
            )}

            {/* Actions */}
            {groupedItems.actions.length > 0 && (
              <ItemSection
                title="Actions"
                items={groupedItems.actions}
                type="action"
                expanded={expandedSections.actions}
                onToggle={() => toggleSection('actions')}
              />
            )}

            {/* Problèmes */}
            {groupedItems.issues.length > 0 && (
              <ItemSection
                title="Problèmes"
                items={groupedItems.issues}
                type="issue"
                expanded={expandedSections.issues}
                onToggle={() => toggleSection('issues')}
              />
            )}

            {/* Informations */}
            {groupedItems.infos.length > 0 && (
              <ItemSection
                title="Informations"
                items={groupedItems.infos}
                type="info"
                expanded={expandedSections.infos}
                onToggle={() => toggleSection('infos')}
              />
            )}

            {/* Aucun item */}
            {result.items.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-4">
                Aucun élément extrait de cette réunion
              </p>
            )}
          </div>
        )}

        {/* Onglet Transcript */}
        {activeTab === 'transcript' && (
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
          <CheckCircle className="w-4 h-4" />
          Terminer
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

// ============================================================
// COMPOSANT : Section d'items
// ============================================================

interface ItemSectionProps {
  title: string;
  items: MeetingItem[];
  type: MeetingItem['item_type'];
  expanded: boolean;
  onToggle: () => void;
}

function ItemSection({ title, items, type, expanded, onToggle }: ItemSectionProps) {
  const colors = getItemTypeColor(type);
  const icon = getItemTypeIcon(type);

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 ${colors.bg} flex items-center justify-between`}
      >
        <h4 className={`text-sm font-semibold ${colors.text} flex items-center gap-2`}>
          <span>{icon}</span>
          {title} ({items.length})
        </h4>
        {expanded ? (
          <ChevronDown className={`w-4 h-4 ${colors.text}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 ${colors.text}`} />
        )}
      </button>

      {/* Liste des items */}
      {expanded && (
        <ul className="divide-y divide-stone-100">
          {items.map((item) => (
            <li key={item.id} className="p-3 bg-white">
              <div className="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-stone-300" 
                  defaultChecked={item.status === 'done'}
                />
                <div className="flex-1 min-w-0">
                  {/* Sujet */}
                  <p className="text-sm font-medium text-stone-800">
                    {item.subject}
                  </p>
                  
                  {/* Contenu (si différent du sujet) */}
                  {item.content && item.content !== item.subject && (
                    <p className="text-sm text-stone-600 mt-0.5">
                      {item.content}
                    </p>
                  )}

                  {/* Métadonnées */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-500">
                    {item.responsible && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.responsible}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.due_date}
                      </span>
                    )}
                    {item.lot_reference && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded">
                        <Tag className="w-3 h-3" />
                        {item.lot_reference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MeetingStep3Review;
