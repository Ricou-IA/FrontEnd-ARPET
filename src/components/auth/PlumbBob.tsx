// Remplacez "export function PlumbBobSVG" par "export function PlumbBob"
export function PlumbBob() {
  return (
    <svg width="20" height="36" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      <defs>
        <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b88a4d" />
          <stop offset="30%" stopColor="#eec984" />
          <stop offset="50%" stopColor="#f9e3a6" />
          <stop offset="70%" stopColor="#eec984" />
          <stop offset="100%" stopColor="#8c6239" />
        </linearGradient>
        <linearGradient id="steelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="50%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="1" r="1" fill="#111827" />
      <line x1="12" y1="1" x2="12" y2="4" stroke="#111827" strokeWidth="0.5" />
      <rect x="9" y="4" width="6" height="3" rx="0.5" fill="url(#brassGradient)" stroke="#8c6239" strokeWidth="0.2" />
      <path d="M7 7 L17 7 L12 34 Z" fill="url(#brassGradient)" />
      <path d="M10.8 33 L13.2 33 L12 41 Z" fill="url(#steelGradient)" />
      <path d="M7.5 7.5 L12 33 L11 33 L7.5 7.5 Z" fill="white" fillOpacity="0.15" />
    </svg>
  )
}
