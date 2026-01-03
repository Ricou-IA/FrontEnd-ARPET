// ============================================================
// ARPET - Connectors Modal
// Version: 1.0.0
// Date: 2026-01-03
// ============================================================

import { X, Mail, HardDrive, Lock, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface ConnectorsModalProps {
    isOpen: boolean
    onClose: () => void
}

type ConnectorStatus = 'connected' | 'disconnected' | 'locked'

interface Connector {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    category: 'personal' | 'enterprise'
    status: ConnectorStatus
    color: string
}

export function ConnectorsModal({ isOpen, onClose }: ConnectorsModalProps) {
    if (!isOpen) return null

    // Mock Data pour l'UI
    const connectors: Connector[] = [
        // Espace Personnel
        {
            id: 'onedrive',
            name: 'OneDrive',
            description: 'Accédez et synchronisez instantanément vos documents personnels.',
            icon: <HardDrive className="w-6 h-6" />,
            category: 'personal',
            status: 'disconnected',
            color: 'bg-blue-500'
        },
        {
            id: 'outlook',
            name: 'Outlook',
            description: 'Enregistrez emails et pièces jointes directement dans vos dossiers.',
            icon: <Mail className="w-6 h-6" />,
            category: 'personal',
            status: 'disconnected',
            color: 'bg-indigo-500'
        },
        {
            id: 'gmail',
            name: 'Gmail',
            description: 'Importez vos correspondances clients et fichiers en un clic.',
            icon: <Mail className="w-6 h-6" />,
            category: 'personal',
            status: 'disconnected',
            color: 'bg-red-500'
        },
        {
            id: 'dropbox',
            name: 'Dropbox',
            description: 'Connectez et organisez vos archives juridiques externes.',
            icon: <HardDrive className="w-6 h-6" />,
            category: 'personal',
            status: 'disconnected',
            color: 'bg-sky-500'
        },
        // Entreprise & Admin
        {
            id: 'sharepoint',
            name: 'SharePoint',
            description: 'Centralisez les documents du cabinet et collaborez en équipe.',
            icon: <HardDrive className="w-6 h-6" />,
            category: 'enterprise',
            status: 'locked',
            color: 'bg-teal-600'
        },
        {
            id: 'tomorro',
            name: 'Tomorro',
            description: 'Automatisez le cycle de vie des contrats et fluidifiez les validations.',
            icon: <div className="w-6 h-6 bg-lime-400 rounded-lg" />, // Placeholder logo
            category: 'enterprise',
            status: 'locked',
            color: 'bg-stone-800'
        }
    ]

    const personalConnectors = connectors.filter(c => c.category === 'personal')
    const enterpriseConnectors = connectors.filter(c => c.category === 'enterprise')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-[#fafaf9] dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-[slideDownFade_0.3s_ease-out]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-2">
                    <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 pl-2">
                        Connecteurs
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-10">

                    {/* Section Personal */}
                    <section>
                        <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-5 px-1">
                            Espace personnel
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {personalConnectors.map(connector => (
                                <ConnectorCard key={connector.id} connector={connector} />
                            ))}
                        </div>
                    </section>

                    {/* Section Enterprise */}
                    <section>
                        <div className="flex items-center justify-between mb-5 px-1">
                            <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                                Entreprise & Admin
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 bg-stone-100 dark:bg-stone-800/50 px-2 py-1 rounded">
                                <Lock className="w-3 h-3" />
                                Accès administrateur requis
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {enterpriseConnectors.map(connector => (
                                <ConnectorCard key={connector.id} connector={connector} />
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    )
}

function ConnectorCard({ connector }: { connector: Connector }) {
    const [isHovered, setIsHovered] = useState(false)
    const isLocked = connector.status === 'locked'

    return (
        <div
            className={`
        relative p-6 rounded-2xl border transition-all duration-300 group
        ${isLocked
                    ? 'bg-stone-50/50 dark:bg-stone-900/30 border-stone-200/50 dark:border-stone-800'
                    : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:shadow-lg hover:border-arpet-accent/20 hover:-translate-y-0.5'
                }
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex justify-between items-start mb-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${connector.color} ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                    {connector.icon}
                </div>

                {/* Action Button */}
                <button
                    disabled={isLocked}
                    className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
            ${isLocked
                            ? 'text-stone-300 dark:text-stone-600'
                            : 'border border-stone-200 hover:border-arpet-accent text-stone-400 hover:text-arpet-accent hover:bg-stone-50'
                        }
          `}
                >
                    {connector.status === 'connected' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                    ) : (
                        <div className="relative">
                            <div className="text-xl font-light leading-none mb-0.5">+</div>
                        </div>
                    )}
                </button>
            </div>

            <h4 className={`text-lg font-bold mb-1 ${isLocked ? 'text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                {connector.name}
            </h4>

            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                {connector.description}
            </p>

            {/* Hover Effect Background */}
            {!isLocked && (
                <div className={`absolute inset-0 bg-arpet-accent/[0.02] rounded-2xl pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            )}
        </div>
    )
}
