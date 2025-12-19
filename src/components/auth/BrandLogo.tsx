// src/components/auth/BrandLogo.tsx
// Composant simplifié : Logo "Arpet." + Fil à Plomb (sans citation)
import { PlumbBob } from './PlumbBob'

export function BrandLogo() {
  return (
    <div className="flex flex-col items-center text-center mb-8">
      {/* Titre avec le point d'ancrage */}
      <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#0B0F17] tracking-tight">
        Arpet
        <span className="relative inline-flex flex-col items-center">
          .
          {/* Le Fil à Plomb attaché au point */}
          <div className="absolute top-[80%] left-[calc(50%-0.5px)] pointer-events-none">
            <div className="w-px h-[4rem] bg-[#0B0F17] relative flex flex-col items-center">
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

