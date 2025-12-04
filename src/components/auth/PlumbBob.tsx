// ============================================================
// ARPET - PlumbBob Component (Fil à Plomb Animé)
// Version: 1.0.0
// ============================================================

export function PlumbBob() {
    return (
      <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-px h-[4.5rem] bg-gray-900 origin-top plumb-bob-wrapper flex flex-col items-center">
        {/* Le Plomb SVG */}
        <div className="absolute bottom-0 translate-y-full drop-shadow-sm">
          <svg 
            width="20" 
            height="36" 
            viewBox="0 0 24 42" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              {/* Dégradé Laiton/Or pour le corps */}
              <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#b88a4d', stopOpacity: 1 }} />
                <stop offset="30%" style={{ stopColor: '#eec984', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#f9e3a6', stopOpacity: 1 }} />
                <stop offset="70%" style={{ stopColor: '#eec984', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#8c6239', stopOpacity: 1 }} />
              </linearGradient>
              {/* Dégradé Acier pour la pointe */}
              <linearGradient id="steelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#1f2937', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#4b5563', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#111827', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Attache du fil */}
            <circle cx="12" cy="1" r="1" fill="#111827" />
            <line x1="12" y1="1" x2="12" y2="4" stroke="#111827" strokeWidth="0.5" />
            
            {/* Anneau supérieur */}
            <rect 
              x="9" y="4" 
              width="6" height="3" 
              rx="0.5" 
              fill="url(#brassGradient)" 
              stroke="#8c6239" 
              strokeWidth="0.2" 
            />
            
            {/* Corps principal (forme conique) */}
            <path d="M7 7 L17 7 L12 34 Z" fill="url(#brassGradient)" />
            
            {/* Pointe en acier */}
            <path d="M10.8 33 L13.2 33 L12 41 Z" fill="url(#steelGradient)" />
            
            {/* Reflet lumineux */}
            <path d="M7.5 7.5 L12 33 L11 33 L7.5 7.5 Z" fill="white" fillOpacity="0.15" />
          </svg>
        </div>
      </div>
    )
  }
  