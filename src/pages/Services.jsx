import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Sofa, BedDouble, Brush, Wind, Droplets, Building2,
    Blinds, Warehouse, HardHat, Sparkles, Home as HomeIcon,
    Search, ArrowRight
} from 'lucide-react'

const SERVICES = [
    {
        name: 'Limpeza de Sofá',
        slug: 'limpeza-sofa',
        icon: Sofa,
        color: 'from-blue-500 to-blue-600',
        description: 'Limpeza profissional de sofás de tecido, couro e sintéticos. Remoção de manchas, odores e ácaros.',
        basePrice: 'A partir de R$ 100',
    },
    {
        name: 'Limpeza de Colchão',
        slug: 'limpeza-colchao',
        icon: BedDouble,
        color: 'from-purple-500 to-purple-600',
        description: 'Higienização completa de colchões com eliminação de ácaros, fungos e bactérias.',
        basePrice: 'A partir de R$ 80',
    },
    {
        name: 'Limpeza de Carpete',
        slug: 'limpeza-carpete',
        icon: Brush,
        color: 'from-orange-500 to-orange-600',
        description: 'Lavagem profunda de carpetes residenciais e comerciais com equipamentos profissionais.',
        basePrice: 'A partir de R$ 120',
    },
    {
        name: 'Limpeza de Cortinas',
        slug: 'limpeza-cortinas',
        icon: Blinds,
        color: 'from-pink-500 to-pink-600',
        description: 'Lavagem de cortinas com retirada e colocação. Tratamento delicado para todos os tecidos.',
        basePrice: 'A partir de R$ 60',
    },
    {
        name: 'Limpeza de Pisos',
        slug: 'limpeza-pisos',
        icon: HomeIcon,
        color: 'from-amber-500 to-amber-600',
        description: 'Limpeza e revitalização de pisos de porcelanato, cerâmica, madeira, vinílico e pedras naturais.',
        basePrice: 'A partir de R$ 150',
    },
    {
        name: 'Limpeza de Caixa d\'Água',
        slug: 'limpeza-caixa-dagua',
        icon: Droplets,
        color: 'from-cyan-500 to-cyan-600',
        description: 'Limpeza, desinfecção e vedação de caixas d\'água e cisternas conforme normas sanitárias.',
        basePrice: 'A partir de R$ 200',
    },
    {
        name: 'Limpeza de Vidros',
        slug: 'limpeza-vidros',
        icon: Wind,
        color: 'from-sky-500 to-sky-600',
        description: 'Limpeza de vidros e esquadrias em residências e edifícios com equipamentos profissionais.',
        basePrice: 'A partir de R$ 100',
    },
    {
        name: 'Limpeza de Fachada',
        slug: 'limpeza-fachada',
        icon: Building2,
        color: 'from-emerald-500 to-emerald-600',
        description: 'Limpeza de fachadas de prédios e estabelecimentos comerciais com hidrojateamento.',
        basePrice: 'A partir de R$ 500',
    },
    {
        name: 'Limpeza Pós-Obra',
        slug: 'limpeza-pos-obra',
        icon: HardHat,
        color: 'from-red-500 to-red-600',
        description: 'Limpeza completa após reforma ou construção. Remoção de resíduos, poeira e cimento.',
        basePrice: 'A partir de R$ 300',
    },
    {
        name: 'Impermeabilização',
        slug: 'impermeabilizacao',
        icon: Sparkles,
        color: 'from-violet-500 to-violet-600',
        description: 'Impermeabilização profissional de estofados para proteção contra líquidos e manchas.',
        basePrice: 'A partir de R$ 200',
    },
    {
        name: 'Faxina Residencial',
        slug: 'faxina-residencial',
        icon: HomeIcon, // Reusing HomeIcon as warehouse/commercial icon might not fit
        color: 'from-teal-500 to-teal-600',
        description: 'Limpeza completa e detalhada para sua casa ou apartamento.',
        basePrice: 'A partir de R$ 180',
    },
]

export default function Services() {
    const [search, setSearch] = useState('')

    const filtered = SERVICES.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <section className="bg-gradient-to-br from-navy to-navy-light py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                        Nossos Serviços
                    </h1>
                    <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
                        Encontre o serviço de limpeza ideal para a sua necessidade
                    </p>
                    {/* Search */}
                    <div className="max-w-md mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar serviço..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green shadow-lg"
                        />
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {filtered.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">Nenhum serviço encontrado para "{search}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((service) => (
                            <div
                                key={service.slug}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                            >
                                <div className={`h-2 bg-gradient-to-r ${service.color}`}></div>
                                <div className="p-6">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <service.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{service.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-green font-bold text-sm">{service.basePrice}</span>
                                        <Link
                                            to={`/profissionais?servico=${service.slug}`}
                                            className="inline-flex items-center gap-1 text-navy hover:text-green font-semibold text-sm transition-colors"
                                        >
                                            Ver profissionais
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
