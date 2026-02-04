// ============================================================
// ARPET - MessageBubble Component
// Version: 9.0.0 - Refactored into sub-components
// ============================================================

import type { Message } from '../../types'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'

type CrossRefActionItem = NonNullable<Message['cross_ref_actions']>[number]

export interface MessageBubbleProps {
  message: Message
  /** Question posée par l'utilisateur (pour vote_up_new) */
  userQuestion?: string
  /** Project ID courant (pour vote_up_new) */
  projectId?: string | null
  /** Projet actif avec org_id (fallback pour super admin) */
  activeProject?: { id: string; org_id: string } | null
  /** Callback après vote réussi */
  onVoteComplete?: (message: Message, voteType: 'up' | 'down', qaId?: string) => void
  /** Callback quand l'utilisateur clique sur une action cross-ref */
  onCrossRefAction?: (action: CrossRefActionItem, originalMessage: Message) => void
}

export function MessageBubble({
  message,
  userQuestion,
  projectId,
  activeProject,
  onVoteComplete,
  onCrossRefAction,
}: MessageBubbleProps) {
  // Message utilisateur
  if (message.role === 'user') {
    return <UserMessage content={message.content} />
  }

  // Message assistant
  return (
    <AssistantMessage
      message={message}
      userQuestion={userQuestion}
      projectId={projectId}
      activeProject={activeProject}
      onVoteComplete={onVoteComplete}
      onCrossRefAction={onCrossRefAction}
    />
  )
}
