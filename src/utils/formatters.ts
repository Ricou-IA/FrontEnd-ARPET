/**
 * Formate une durée en secondes au format MM:SS
 * @param seconds Durée en secondes
 * @returns Chaîne formatée (ex: "05:30")
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
