/**
 * SpeakerMapping - Phase 4/8 Meeting V3
 * Version: 1.1.0 — Fix dropdown overflow mobile (popover desktop, modal mobile)
 * Interface de mapping speakers Gladia -> intervenants du projet
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  UserPlus,
  Check,
  SkipForward,
  Loader2,
  ChevronDown,
  Building2,
  X,
  Search,
} from 'lucide-react';
import type { MeetingParticipantEnriched } from '../../types/meeting.types';
import type { IntervenantWithProjectRole } from '../../types/intervenant.types';
import {
  type TranscriptSpeaker,
  SPEAKER_COLORS,
  updateMeetingParticipants,
} from '../../services/meeting.service';
import {
  getProjectIntervenants,
  createAndLinkIntervenant,
} from '../../services/intervenants.service';

// ============================================================
// TYPES
// ============================================================

interface SpeakerMappingProps {
  /** Speakers extraits du transcript */
  speakers: TranscriptSpeaker[];
  /** ID du projet actif */
  projectId: string;
  /** ID du meeting */
  meetingId: string;
  /** Participants deja mappes (pour pre-remplissage) */
  existingParticipants?: MeetingParticipantEnriched[];
  /** Callback quand le mapping est valide */
  onMappingComplete: (participants: MeetingParticipantEnriched[]) => void;
  /** Callback pour passer le mapping */
  onSkip: () => void;
}

interface SpeakerMappingState {
  name: string;
  role: string;
  company: string;
  intervenant_id: string | null;
  isDropdownOpen: boolean;
  isCreating: boolean;
}

// ============================================================
// COMPOSANT DROPDOWN (popover desktop / modal mobile)
// ============================================================

interface IntervenantDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  intervenants: IntervenantWithProjectRole[];
  speakerId: number;
  speakerName: string;
  isCreating: boolean;
  onSelectIntervenant: (speakerId: number, intervenant: IntervenantWithProjectRole) => void;
  onCreateIntervenant: (speakerId: number) => void;
}

function IntervenantDropdown({
  isOpen,
  onClose,
  intervenants,
  speakerId,
  speakerName,
  isCreating,
  onSelectIntervenant,
  onCreateIntervenant,
}: IntervenantDropdownProps) {
  const [localSearch, setLocalSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reset search on open
  useEffect(() => {
    if (isOpen) setLocalSearch('');
  }, [isOpen]);

  // Click outside handler (desktop popover only)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = localSearch.trim()
    ? intervenants.filter(
        (i) =>
          i.name.toLowerCase().includes(localSearch.toLowerCase()) ||
          (i.company && i.company.toLowerCase().includes(localSearch.toLowerCase()))
      )
    : intervenants;

  const listContent = (
    <>
      {/* Recherche */}
      {intervenants.length > 5 && (
        <div className="p-2 border-b border-stone-100">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-7 pr-2 py-1.5 text-sm md:text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="overflow-y-auto max-h-[50vh] md:max-h-48">
        {filtered.length > 0 ? (
          filtered.map((intervenant) => (
            <button
              key={intervenant.id}
              onClick={() => onSelectIntervenant(speakerId, intervenant)}
              className="w-full px-3 py-2.5 md:py-2 text-left hover:bg-amber-50 active:bg-amber-100 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4 md:w-3.5 md:h-3.5 text-stone-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800 truncate">
                  {intervenant.name}
                </p>
                {(intervenant.company || intervenant.lot_reference) && (
                  <p className="text-xs text-stone-400 truncate">
                    {[intervenant.company, intervenant.lot_reference]
                      .filter(Boolean)
                      .join(' — ')}
                  </p>
                )}
              </div>
            </button>
          ))
        ) : (
          <p className="px-3 py-3 text-sm md:text-xs text-stone-400 text-center">
            Aucun intervenant trouve
          </p>
        )}
      </div>

      {/* Creer */}
      <div className="border-t border-stone-100">
        <button
          onClick={() => {
            onClose();
            if (speakerName.trim()) {
              onCreateIntervenant(speakerId);
            }
          }}
          disabled={!speakerName.trim() || isCreating}
          className="w-full px-3 py-2.5 md:py-2 text-left hover:bg-green-50 active:bg-green-100 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 md:w-3.5 md:h-3.5 text-green-500 animate-spin flex-shrink-0" />
          ) : (
            <UserPlus className="w-4 h-4 md:w-3.5 md:h-3.5 text-green-500 flex-shrink-0" />
          )}
          <span className="text-sm text-green-700">
            Creer &laquo; {speakerName.trim() || '...'} &raquo;
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: modal plein ecran */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative mt-auto bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col animate-[slideUp_0.2s_ease-out]">
          {/* Header mobile */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
            <h4 className="text-sm font-semibold text-stone-700">
              Selectionner un intervenant
            </h4>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
          {listContent}
        </div>
      </div>

      {/* Desktop: popover */}
      <div
        ref={popoverRef}
        className="hidden md:block absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg"
      >
        {listContent}
      </div>
    </>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function SpeakerMapping({
  speakers,
  projectId,
  meetingId,
  existingParticipants,
  onMappingComplete,
  onSkip,
}: SpeakerMappingProps) {
  // State
  const [intervenants, setIntervenants] = useState<IntervenantWithProjectRole[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(true);
  const [mappings, setMappings] = useState<Map<number, SpeakerMappingState>>(new Map());
  const [saving, setSaving] = useState(false);

  // Charger les intervenants du projet
  useEffect(() => {
    async function loadIntervenants() {
      setLoadingIntervenants(true);
      const { data } = await getProjectIntervenants(projectId);
      if (data) {
        setIntervenants(data);
      }
      setLoadingIntervenants(false);
    }
    loadIntervenants();
  }, [projectId]);

  // Initialiser les mappings depuis existingParticipants ou speakers
  useEffect(() => {
    const initialMappings = new Map<number, SpeakerMappingState>();

    for (const speaker of speakers) {
      // Chercher un mapping existant
      const existing = existingParticipants?.find(
        (p) => p.speaker_id === speaker.speaker_id
      );

      initialMappings.set(speaker.speaker_id, {
        name: existing?.name || '',
        role: existing?.role || '',
        company: existing?.company || '',
        intervenant_id: existing?.intervenant_id || null,
        isDropdownOpen: false,
        isCreating: false,
      });
    }

    setMappings(initialMappings);
  }, [speakers, existingParticipants]);

  // Mettre a jour un champ de mapping
  const updateMapping = useCallback(
    (speakerId: number, updates: Partial<SpeakerMappingState>) => {
      setMappings((prev) => {
        const next = new Map(prev);
        const current = next.get(speakerId);
        if (current) {
          next.set(speakerId, { ...current, ...updates });
        }
        return next;
      });
    },
    []
  );

  // Ouvrir le dropdown (fermer les autres d'abord)
  const openDropdown = useCallback((speakerId: number) => {
    setMappings((prev) => {
      const next = new Map(prev);
      for (const [id, state] of next) {
        next.set(id, { ...state, isDropdownOpen: id === speakerId ? !state.isDropdownOpen : false });
      }
      return next;
    });
  }, []);

  // Fermer le dropdown d'un speaker
  const closeDropdown = useCallback((speakerId: number) => {
    updateMapping(speakerId, { isDropdownOpen: false });
  }, [updateMapping]);

  // Selectionner un intervenant existant
  const handleSelectIntervenant = useCallback(
    (speakerId: number, intervenant: IntervenantWithProjectRole) => {
      updateMapping(speakerId, {
        name: intervenant.name,
        role: intervenant.role_in_project || intervenant.role || '',
        company: intervenant.company || '',
        intervenant_id: intervenant.id,
        isDropdownOpen: false,
      });
    },
    [updateMapping]
  );

  // Creer un nouvel intervenant inline
  const handleCreateIntervenant = useCallback(
    async (speakerId: number) => {
      const mapping = mappings.get(speakerId);
      if (!mapping || !mapping.name.trim()) return;

      updateMapping(speakerId, { isCreating: true });

      const { data: newIntervenant } = await createAndLinkIntervenant(
        {
          name: mapping.name.trim(),
          company: mapping.company.trim() || undefined,
          role: mapping.role.trim() || undefined,
        },
        projectId,
        undefined,
        mapping.role.trim() || undefined
      );

      if (newIntervenant) {
        setIntervenants((prev) => [...prev, newIntervenant]);
        updateMapping(speakerId, {
          intervenant_id: newIntervenant.id,
          isCreating: false,
          isDropdownOpen: false,
        });
      } else {
        updateMapping(speakerId, { isCreating: false });
      }
    },
    [mappings, projectId, updateMapping]
  );

  // Valider et sauvegarder le mapping
  const handleSave = useCallback(async () => {
    setSaving(true);

    const participants: MeetingParticipantEnriched[] = speakers.map((speaker) => {
      const mapping = mappings.get(speaker.speaker_id);

      if (mapping && mapping.name.trim()) {
        return {
          speaker_id: speaker.speaker_id,
          name: mapping.name.trim(),
          role: mapping.role.trim() || undefined,
          company: mapping.company.trim() || undefined,
          intervenant_id: mapping.intervenant_id || undefined,
          confidence: 'confirmed' as const,
          matched_by: 'user' as const,
        };
      }

      // Speaker non mappe
      return {
        speaker_id: speaker.speaker_id,
        name: speaker.label,
        confidence: 'unmatched' as const,
        matched_by: null,
      };
    });

    // Persister en DB
    const { error } = await updateMeetingParticipants(meetingId, participants);

    setSaving(false);

    if (!error) {
      onMappingComplete(participants);
    }
  }, [speakers, mappings, meetingId, onMappingComplete]);

  // Nombre de speakers mappes
  const mappedCount = Array.from(mappings.values()).filter(
    (m) => m.name.trim().length > 0
  ).length;

  // ============================================================
  // RENDU
  // ============================================================

  if (speakers.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm text-stone-500">
          Aucun speaker detecte dans le transcript
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-stone-700">
            Identification des intervenants
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            {mappedCount}/{speakers.length} identifie{mappedCount > 1 ? 's' : ''}
          </p>
        </div>
        {loadingIntervenants && (
          <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
        )}
      </div>

      {/* Liste des speakers */}
      <div className="space-y-3">
        {speakers.map((speaker) => {
          const mapping = mappings.get(speaker.speaker_id);
          if (!mapping) return null;

          const color =
            SPEAKER_COLORS[speaker.speaker_id % SPEAKER_COLORS.length];
          const isMapped = mapping.name.trim().length > 0;

          return (
            <div
              key={speaker.speaker_id}
              className="border border-stone-200 rounded-lg overflow-visible"
            >
              {/* Header speaker */}
              <div
                className="flex items-center gap-3 px-3 py-2 bg-stone-50 rounded-t-lg"
              >
                {/* Pastille couleur */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm md:text-xs font-medium text-stone-600">
                    {speaker.label}
                  </span>
                  <span className="text-xs text-stone-400 ml-2">
                    ({speaker.utterance_count} intervention{speaker.utterance_count > 1 ? 's' : ''})
                  </span>
                </div>
                {isMapped && (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>

              {/* Extrait du speaker */}
              <div className="px-3 py-2 border-t border-stone-100">
                <p className="text-xs text-stone-400 italic line-clamp-2">
                  &laquo; {speaker.sample_text} &raquo;
                </p>
              </div>

              {/* Champs de mapping */}
              <div className="px-3 py-3 border-t border-stone-100 space-y-2">
                {/* Nom + dropdown intervenant */}
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mapping.name}
                      onChange={(e) =>
                        updateMapping(speaker.speaker_id, { name: e.target.value })
                      }
                      placeholder="Nom de l'intervenant..."
                      className="flex-1 px-3 py-2 md:py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => openDropdown(speaker.speaker_id)}
                      className="px-2.5 md:px-2 py-2 md:py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-colors"
                      title="Selectionner un intervenant du projet"
                      aria-label="Selectionner un intervenant du projet"
                    >
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    </button>
                  </div>

                  {/* Dropdown intervenants */}
                  <IntervenantDropdown
                    isOpen={mapping.isDropdownOpen}
                    onClose={() => closeDropdown(speaker.speaker_id)}
                    intervenants={intervenants}
                    speakerId={speaker.speaker_id}
                    speakerName={mapping.name}
                    isCreating={mapping.isCreating}
                    onSelectIntervenant={handleSelectIntervenant}
                    onCreateIntervenant={handleCreateIntervenant}
                  />
                </div>

                {/* Role + Entreprise (inline, stack on mobile) */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={mapping.role}
                    onChange={(e) =>
                      updateMapping(speaker.speaker_id, { role: e.target.value })
                    }
                    placeholder="Role / Lot"
                    className="flex-1 px-3 py-2 md:py-1.5 text-sm md:text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <div className="relative flex-1">
                    <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 md:w-3 h-3.5 md:h-3 text-stone-400" />
                    <input
                      type="text"
                      value={mapping.company}
                      onChange={(e) =>
                        updateMapping(speaker.speaker_id, {
                          company: e.target.value,
                        })
                      }
                      placeholder="Entreprise"
                      className="w-full pl-8 md:pl-7 pr-3 py-2 md:py-1.5 text-sm md:text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || mappedCount === 0}
          className="flex-1 px-4 py-2.5 md:py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Valider le mapping ({mappedCount}/{speakers.length})
            </>
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="px-4 py-2.5 md:py-2 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50 active:bg-stone-100 transition-colors flex items-center gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Passer
        </button>
      </div>
    </div>
  );
}

export default SpeakerMapping;
