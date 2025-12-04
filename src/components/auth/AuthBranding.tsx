// ============================================================
// ARPET - AuthBranding Component (Factorisé)
// Version: 1.0.0 - Logo + Tagline réutilisable
// ============================================================

import { PlumbBob } from './PlumbBob'

export function AuthBranding() {
  return (
    <div className="w-full md:w-5/12 p-12 flex flex-col justify-center items-center relative text-center bg-gray-50 border-r border-gray-100 overflow-hidden">
      {/* Motif subtil de fond */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(#1F2937 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />
      
      {/* Logo + Fil à plomb */}
      <div className="relative z-10 mb-8">
        <h1 className="font-brand-bold text-6xl text-gray-900 tracking-tight relative inline-block">
          Arpet
          <span className="relative inline-block">
            .
            <PlumbBob />
          </span>
        </h1>
      </div>

      {/* Tagline */}
      <blockquote className="max-w-xs mx-auto z-10 relative mt-16">
        <p className="font-brand text-2xl text-gray-800 leading-snug">
          "Il cherche les réponses,
          <br />
          <span className="font-brand-bold text-black">vous prenez les décisions."</span>
        </p>
      </blockquote>
    </div>
  )
}
