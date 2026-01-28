// ============================================================
// VoteButtons Component
// Boutons de vote (thumbs up/down) avec compteur
// ============================================================

import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'

interface VoteButtonsProps {
  voteStatus: 'none' | 'up' | 'down'
  isVoting: boolean
  localTrustScore: number
  canVoteDown: boolean
  onVoteUp: () => void
  onVoteDown: () => void
}

export function VoteButtons({
  voteStatus,
  isVoting,
  localTrustScore,
  canVoteDown,
  onVoteUp,
  onVoteDown,
}: VoteButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Vote Up */}
      <button
        onClick={onVoteUp}
        disabled={isVoting || voteStatus !== 'none'}
        className={`p-1.5 rounded-full transition-all ${
          voteStatus === 'up'
            ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
            : voteStatus !== 'none'
            ? 'text-stone-200 dark:text-stone-700 cursor-not-allowed'
            : 'hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 text-stone-400 dark:text-stone-500'
        }`}
        title={
          voteStatus === 'up'
            ? 'Vous avez validé cette réponse'
            : 'Cette réponse est utile'
        }
      >
        {isVoting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ThumbsUp className={`w-4 h-4 ${voteStatus === 'up' ? 'fill-current' : ''}`} />
        )}
      </button>

      {/* Compteur */}
      <span className={`text-xs font-bold min-w-[20px] text-center ${
        localTrustScore > 0 ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'
      }`}>
        {localTrustScore > 0 ? localTrustScore : ''}
      </span>

      {/* Vote Down */}
      <button
        onClick={onVoteDown}
        disabled={isVoting || voteStatus !== 'none' || !canVoteDown}
        className={`p-1.5 rounded-full transition-all ${
          voteStatus === 'down'
            ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
            : !canVoteDown
            ? 'text-stone-200 dark:text-stone-700 cursor-not-allowed opacity-50'
            : voteStatus !== 'none'
            ? 'text-stone-200 dark:text-stone-700 cursor-not-allowed'
            : 'hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 text-stone-400 dark:text-stone-500'
        }`}
        title={
          !canVoteDown
            ? 'Seules les réponses validées peuvent être signalées'
            : voteStatus === 'down'
            ? 'Vous avez signalé cette réponse'
            : 'Signaler une réponse incorrecte'
        }
      >
        <ThumbsDown className={`w-4 h-4 ${voteStatus === 'down' ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}
