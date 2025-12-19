// src/components/auth/HeroBranding.tsx
// Composant pour la page Landing : Logo "Arpet." + Fil à Plomb en très grande taille
import { PlumbBob } from './PlumbBob'

export function HeroBranding() {
  return (
    <div className="flex flex-col items-center text-center mb-32 -mt-8">
      {/* Titre avec le point d'ancrage - Très grande taille */}
      <h1 className="font-serif text-8xl md:text-9xl font-bold text-[#0B0F17] tracking-tight">
        Arpet
        <span className="relative inline-flex flex-col items-center">
          .
          {/* Le Fil à Plomb attaché au point - Ajusté pour le logo agrandi */}
          <div className="absolute top-[85%] left-[calc(50%-0.5px)] pointer-events-none">
            {/* Fil long et fin pour l'élégance */}
            <div className="w-px h-24 bg-[#0B0F17] relative flex flex-col items-center">
              <div className="absolute bottom-0 translate-y-full">
                <PlumbBob />
              </div>
            </div>
          </div>
        </span>
      </h1>
    </div>
  )
}

