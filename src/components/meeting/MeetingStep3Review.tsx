/**
 * MeetingStep3Review - Phase 4/8 Meeting V3
 * Version: 4.0.0 - Ajout onglet Intervenants + transcript colorise
 * Etape 3 : Affichage du CR genere, mapping speakers, transcript enrichi
 */

import { useState, useMemo, useCallback } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import { MeetingProgressIndicator } from './MeetingProgressIndicator';
import { SpeakerMapping } from './SpeakerMapping';
import {
  type ProcessAudioResponse,
  type MeetingPrepareData,
  type MeetingProcessingStatus,
  type MeetingItem,
  type MeetingParticipantEnriched,
  type TranscriptSpeaker,
  type TranscriptSegment,
  groupItemsByType,
  getItemTypeIcon,
  getItemTypeLabel,
  getItemTypeColor,
  parseTranscriptSpeakers,
  buildColorizedTranscript,
  SPEAKER_COLORS,
} from '../../services/meeting.service';

// ============================================================
// TYPES
// ============================================================

type ReviewTab = 'summary' | 'speakers' | 'items' | 'transcript';

interface MeetingStep3ReviewProps {
  prepareData: MeetingPrepareData;
  processingStatus: MeetingProcessingStatus;
  result: ProcessAudioResponse | null;
  error: string | null;
  projectId: string | null;
  onAddToSandbox: () => void;
  onClose: () => void;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function MeetingStep3Review({
  prepareData: _prepareData,
  processingStatus,
  result,
  error,
  projectId,
  onAddToSandbox,
  onClose,
}: MeetingStep3ReviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>('summary');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    decisions: true,
    actions: true,
    issues: true,
    infos: false,
  });
  const [mappedParticipants, setMappedParticipants] = useState<MeetingParticipantEnriched[] | null>(null);
  const [mappingDone, setMappingDone] = useState(false);

  // Grouper les items par type
  const groupedItems = result?.items ? groupItemsByType(result.items) : null;

  // Parser les speakers du transcript
  const speakers: TranscriptSpeaker[] = useMemo(() => {
    if (!result?.transcript) return [];
    return parseTranscriptSpeakers(result.transcript);
  }, [result?.transcript]);

  // Construire la map de noms mappes
  const participantMap = useMemo(() => {
    const map = new Map<number, string>();
    if (mappedParticipants) {
      for (const p of mappedParticipants) {
        if (p.name && p.confidence !== 'unmatched') {
          map.set(p.speaker_id, p.name);
        }
      }
    }
    return map;
  }, [mappedParticipants]);

  // Construire le transcript colorise
  const colorizedSegments: TranscriptSegment[] = useMemo(() => {
    if (!result?.transcript) return [];
    return buildColorizedTranscript(result.transcript, participantMap);
  }, [result?.transcript, participantMap]);

  // Has speakers to map? (pas de mapping pour les memos)
  const hasSpeakers = speakers.length > 1;

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Mapping complete
  const handleMappingComplete = useCallback(
    (participants: MeetingParticipantEnriched[]) => {
      setMappedParticipants(participants);
      setMappingDone(true);
    },
    []
  );

  // Mapping skippe
  const handleMappingSkip = useCallback(() => {
    setMappingDone(true);
  }, []);

  // Copier le CR dans le presse-papier
  const handleCopy = async () => {
    if (!result) return;

    const itemsText = result.items
      .map(
        (item) =>
          `- [${getItemTypeLabel(item.item_type)}] ${item.subject}${
            item.responsible ? ` (${item.responsible})` : ''
          }${item.lot_reference ? ` - ${item.lot_reference}` : ''}`
      )
      .join('\n');

    const participantsText = result.meeting.participants
      .map((p) => (p.role ? `${p.name} (${p.role})` : p.name))
      .join(', ');

    const crText = `# ${result.meeting.meeting_title}
${result.meeting.meeting_date ? `Date: ${result.meeting.meeting_date}` : ''}
${participantsText ? `Participants: ${participantsText}` : ''}

## Resume
${result.meeting.summary}

## Points extraits
${itemsText}

## Transcript complet
${result.transcript}`.trim();

    await navigator.clipboard.writeText(crText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================================
  // ETATS DE CHARGEMENT / ERREUR
  // ============================================================

  // En cours de traitement
  if (processingStatus !== 'completed' && processingStatus !== 'error') {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold text-stone-800 mb-2">
            Traitement en cours...
          </h3>
          <p className="text-sm text-stone-500">
            Veuillez patienter pendant l&apos;analyse de votre reunion
          </p>
        </div>

        <MeetingProgressIndicator status={processingStatus} />

        <div className="text-center pt-4">
          <p className="text-xs text-stone-400">
            Ce processus peut prendre quelques minutes selon la duree de
            l&apos;enregistrement
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
            {error || "Une erreur est survenue lors du traitement de l'audio"}
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

  // Resultat OK
  if (!result) return null;

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  return (
    <div className="space-y-5">
      {/* En-tete succes */}
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Compte-rendu genere avec succes !
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
            {getItemTypeIcon('decision')} {result.meeting.decisions_count} decision
            {result.meeting.decisions_count > 1 ? 's' : ''}
          </span>
        )}
        {result.meeting.actions_count > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            {getItemTypeIcon('action')} {result.meeting.actions_count} action
            {result.meeting.actions_count > 1 ? 's' : ''}
          </span>
        )}
        {result.meeting.issues_count > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {getItemTypeIcon('issue')} {result.meeting.issues_count} probleme
            {result.meeting.issues_count > 1 ? 's' : ''}
          </span>
        )}
        {hasSpeakers && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              mappingDone
                ? 'bg-green-100 text-green-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            {speakers.length} speaker{speakers.length > 1 ? 's' : ''}
            {mappingDone ? ' — identifie(s)' : ''}
          </span>
        )}
      </div>

      {/* Participants (affichage simple si mappes) */}
      {mappedParticipants && mappedParticipants.some((p) => p.confidence === 'confirmed') && (
        <div className="flex items-center gap-2 text-sm text-stone-600 flex-wrap">
          <Users className="w-4 h-4 flex-shrink-0" />
          {mappedParticipants
            .filter((p) => p.confidence === 'confirmed')
            .map((p, i) => (
              <span key={p.speaker_id} className="flex items-center gap-1">
                {i > 0 && <span className="text-stone-300">,</span>}
                <span
                  className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                  style={{
                    backgroundColor:
                      SPEAKER_COLORS[p.speaker_id % SPEAKER_COLORS.length],
                  }}
                />
                <span className="font-medium">{p.name}</span>
                {p.role && (
                  <span className="text-stone-400">({p.role})</span>
                )}
              </span>
            ))}
        </div>
      )}

      {/* Participants non mappes (format legacy) */}
      {!mappedParticipants && result.meeting.participants.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Users className="w-4 h-4" />
          <span>
            {result.meeting.participants.map((p, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <span className="font-medium">{p.name}</span>
                {p.role && (
                  <span className="text-stone-400"> ({p.role})</span>
                )}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-stone-200 overflow-x-auto" role="tablist" aria-label="Sections du compte-rendu">
        {/* Resume */}
        <TabButton
          label="Resume"
          tabId="summary"
          activeTab={activeTab}
          onClick={setActiveTab}
        />
        {/* Intervenants (seulement si multi-speakers) */}
        {hasSpeakers && (
          <TabButton
            label="Intervenants"
            tabId="speakers"
            activeTab={activeTab}
            onClick={setActiveTab}
            badge={mappingDone ? 'done' : undefined}
          />
        )}
        {/* Decisions & Actions */}
        <TabButton
          label="Decisions & Actions"
          tabId="items"
          activeTab={activeTab}
          onClick={setActiveTab}
        />
        {/* Transcript */}
        <TabButton
          label="Transcript"
          tabId="transcript"
          activeTab={activeTab}
          onClick={setActiveTab}
        />
      </div>

      {/* Contenu des onglets */}
      <div
        className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto"
        role="tabpanel"
        id={`review-tabpanel-${activeTab}`}
        aria-labelledby={`review-tab-${activeTab}`}
      >
        {/* Onglet Resume */}
        {activeTab === 'summary' && (
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Resume
            </h4>
            <p className="text-sm text-stone-600 whitespace-pre-wrap">
              {result.meeting.summary || 'Aucun resume disponible'}
            </p>
          </div>
        )}

        {/* Onglet Intervenants (Speaker Mapping) */}
        {activeTab === 'speakers' && hasSpeakers && projectId && (
          <div>
            {mappingDone ? (
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">
                  Mapping des intervenants effectue
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {mappedParticipants
                    ? `${mappedParticipants.filter((p) => p.confidence === 'confirmed').length}/${speakers.length} identifie(s)`
                    : 'Mapping passe'}
                </p>
                <button
                  onClick={() => setMappingDone(false)}
                  className="mt-3 text-xs text-green-700 underline hover:no-underline"
                >
                  Modifier le mapping
                </button>
              </div>
            ) : (
              <SpeakerMapping
                speakers={speakers}
                projectId={projectId}
                meetingId={result.meeting_id}
                existingParticipants={mappedParticipants || undefined}
                onMappingComplete={handleMappingComplete}
                onSkip={handleMappingSkip}
              />
            )}
          </div>
        )}

        {/* Onglet Items (Decisions & Actions) */}
        {activeTab === 'items' && groupedItems && (
          <div className="space-y-4">
            {/* Decisions */}
            {groupedItems.decisions.length > 0 && (
              <ItemSection
                title="Decisions"
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

            {/* Problemes */}
            {groupedItems.issues.length > 0 && (
              <ItemSection
                title="Problemes"
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
                Aucun element extrait de cette reunion
              </p>
            )}
          </div>
        )}

        {/* Onglet Transcript (colorise) */}
        {activeTab === 'transcript' && (
          <div className="bg-stone-50 rounded-lg p-4">
            {colorizedSegments.length > 0 ? (
              <div className="space-y-1 font-mono text-sm leading-relaxed">
                {colorizedSegments.map((segment, idx) => {
                  // Ligne vide
                  if (!segment.text && segment.speaker_id === null) {
                    return <div key={idx} className="h-2" />;
                  }

                  // Ligne avec speaker
                  if (segment.speaker_id !== null && segment.speaker_name) {
                    return (
                      <div key={idx} className="flex gap-2">
                        <span
                          className="font-semibold whitespace-nowrap flex-shrink-0"
                          style={{ color: segment.color || '#78716c' }}
                        >
                          [{segment.speaker_name}]
                        </span>
                        <span className="text-stone-600">{segment.text}</span>
                      </div>
                    );
                  }

                  // Ligne sans speaker (annotation, continuation)
                  return (
                    <div key={idx} className="text-stone-500 pl-4">
                      {segment.text}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-600 whitespace-pre-wrap font-mono leading-relaxed">
                {result.transcript || 'Aucun transcript disponible'}
              </p>
            )}
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
              <span className="text-green-600">Copie !</span>
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
// COMPOSANT : Bouton d'onglet
// ============================================================

interface TabButtonProps {
  label: string;
  tabId: ReviewTab;
  activeTab: ReviewTab;
  onClick: (tab: ReviewTab) => void;
  badge?: 'done';
}

function TabButton({ label, tabId, activeTab, onClick, badge }: TabButtonProps) {
  const isActive = activeTab === tabId;

  return (
    <button
      onClick={() => onClick(tabId)}
      role="tab"
      aria-selected={isActive}
      aria-controls={`review-tabpanel-${tabId}`}
      id={`review-tab-${tabId}`}
      className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
        isActive
          ? 'text-amber-600'
          : 'text-stone-500 hover:text-stone-700'
      }`}
    >
      {label}
      {badge === 'done' && (
        <Check className="w-3 h-3 text-green-500" />
      )}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
      )}
    </button>
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
        <h4
          className={`text-sm font-semibold ${colors.text} flex items-center gap-2`}
        >
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

                  {/* Contenu (si different du sujet) */}
                  {item.content && item.content !== item.subject && (
                    <p className="text-sm text-stone-600 mt-0.5">
                      {item.content}
                    </p>
                  )}

                  {/* Metadonnees */}
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
