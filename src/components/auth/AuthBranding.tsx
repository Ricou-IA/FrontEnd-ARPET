// src/components/auth/AuthBranding.tsx
import { PlumbBob } from './PlumbBob'

export function AuthBranding() {
  return (
    <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gray-50 md:flex rounded-l-[30px]">
      
      {/* Pattern Quadrillé */}
      <div className="absolute inset-0 bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Titre avec le point d'ancrage */}
        <h1 className="font-serif text-6xl font-bold text-[#0B0F17] tracking-tight mb-24">
          Arpet
          <span className="relative inline-flex flex-col items-center">
            .
            {/* Le Fil à Plomb attaché au point */}
            {/* AJUSTEMENT ICI : top-[80%] pour descendre le départ du fil */}
            <div className="absolute top-[80%] left-[calc(50%-0.5px)] pointer-events-none">
                {/* AJUSTEMENT ICI : h-[4rem] pour raccourcir le fil */}
                <div className="w-px h-[4rem] bg-[#0B0F17] relative flex flex-col items-center">
                  <div className="absolute bottom-0 translate-y-full">
                    <PlumbBob />
                  </div>
                </div>
            </div>
          </span>
        </h1>

        <div className="max-w-xs px-4">
          <p className="font-serif text-2xl font-bold text-[#0B0F17] leading-tight">
            "Il cherche les réponses,
            <br />
            vous prenez les décisions."
          </p>
        </div>
      </div>
    </div>
  )
}
