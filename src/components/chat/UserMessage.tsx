// ============================================================
// UserMessage Component
// Affiche un message utilisateur
// ============================================================

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex gap-4 justify-end">
      <div className="max-w-2xl">
        <div className="text-sm font-sans text-stone-700 dark:text-stone-200 leading-relaxed bg-stone-100 dark:bg-stone-800 p-4 rounded-l-xl rounded-br-xl">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  )
}
