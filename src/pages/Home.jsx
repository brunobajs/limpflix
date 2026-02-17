import { Link } from 'react-router-dom'
import {
    Sofa, BedDouble, Brush, Wind, Droplets, Building2,
    Blinds, Warehouse, HardHat, Sparkles, Home as HomeIcon,
    Search, Calendar, Star, ArrowRight, CheckCircle2,
    Users, Shield, MapPin, ChevronRight
} from 'lucide-react'

const SERVICES = [
    { name: 'Limpeza de Sofá', slug: 'limpeza-sofa', icon: Sofa, color: 'from-blue-500 to-blue-600' },
    { name: 'Limpeza de Colchão', slug: 'limpeza-colchao', icon: BedDouble, color: 'from-purple-500 to-purple-600' },
    { name: 'Limpeza de Carpete', slug: 'limpeza-carpete', icon: Brush, color: 'from-orange-500 to-orange-600' },
    { name: 'Limpeza de Cortinas', slug: 'limpeza-cortinas', icon: Blinds, color: 'from-pink-500 to-pink-600' },
    { name: 'Limpeza de Pisos', slug: 'limpeza-pisos', icon: HomeIcon, color: 'from-amber-500 to-amber-600' },
    { name: 'Limpeza de Caixa d\'Água', slug: 'limpeza-caixa-dagua', icon: Droplets, color: 'from-cyan-500 to-cyan-600' },
    { name: 'Limpeza de Vidros', slug: 'limpeza-vidros', icon: Wind, color: 'from-sky-500 to-sky-600' },
    { name: 'Limpeza de Fachada', slug: 'limpeza-fachada', icon: Building2, color: 'from-emerald-500 to-emerald-600' },
    { name: 'Limpeza Pós-Obra', slug: 'limpeza-pos-obra', icon: HardHat, color: 'from-red-500 to-red-600' },
    { name: 'Higienização', slug: 'higienizacao', icon: Sparkles, color: 'from-violet-500 to-violet-600' },
    { name: 'Limpeza Comercial', slug: 'limpeza-comercial', icon: Warehouse, color: 'from-teal-500 to-teal-600' },
]

const STEPS = [
    {
        icon: Search,
        title: 'Busque o Serviço',
        desc: 'Encontre profissionais qualificados na sua região com filtros inteligentes.'
    },
    {
        icon: Calendar,
        title: 'Agende Online',
        desc: 'Escolha o melhor dia e horário. Receba orçamentos de múltiplos profissionais.'
    },
    {
        icon: Star,
        title: 'Avalie o Serviço',
        desc: 'Após a limpeza, avalie o profissional e ajude outros clientes.'
    }
]

const TESTIMONIALS = [
    {
        name: 'Maria Silva',
        city: 'São Paulo, SP',
        rating: 5,
        text: 'Encontrei um profissional incrível para limpar meus sofás. O serviço foi impecável e o preço justo!',
    },
    {
        name: 'Carlos Santos',
        city: 'Rio de Janeiro, RJ',
        rating: 5,
        text: 'Plataforma muito fácil de usar. Agendei a limpeza do meu carpete em menos de 5 minutos.',
    },
    {
        name: 'Ana Oliveira',
        city: 'Belo Horizonte, MG',
        rating: 5,
        text: 'Profissionais verificados e confiáveis. Já usei o serviço 3 vezes e sempre foi excelente!',
    },
]

export default function Home() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy overflow-hidden">
                {/* Background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-green/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green/5 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-green/10 border border-green/20 rounded-full px-4 py-1.5 mb-6">
                            <Sparkles className="w-4 h-4 text-green" />
                            <span className="text-green text-sm font-medium">O Marketplace #1 de Limpeza</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                            Encontre os Melhores{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green to-emerald-400">
                                Profissionais de Limpeza
                            </span>{' '}
                            da Sua Região
                        </h1>
                        <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                            Conectamos você com profissionais verificados para todos os tipos de limpeza.
                            Agende em minutos, pague com segurança.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/profissionais"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-green/25"
                            >
                                <Search className="w-5 h-5" />
                                Buscar Profissionais
                            </Link>
                            <Link
                                to="/cadastro-profissional"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all border border-white/20"
                            >
                                Seja um Profissional
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg mx-auto">
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-green">500+</div>
                                <div className="text-white/50 text-xs mt-1">Profissionais</div>
                            </div>
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-green">11</div>
                                <div className="text-white/50 text-xs mt-1">Serviços</div>
                            </div>
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-green">4.9</div>
                                <div className="text-white/50 text-xs mt-1">Avaliação Média</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Nossos Serviços
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Oferecemos uma ampla gama de serviços de limpeza profissional para atender todas as suas necessidades.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {SERVICES.map((service, i) => (
                            <Link
                                key={service.slug}
                                to={`/servicos?categoria=${service.slug}`}
                                className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green/30 hover:-translate-y-1"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <service.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-800 text-sm group-hover:text-green transition-colors">
                                    {service.name}
                                </h3>
                                <div className="flex items-center gap-1 mt-2 text-green opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-medium">Ver mais</span>
                                    <ChevronRight className="w-3 h-3" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Como Funciona
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Em apenas 3 passos simples, você encontra e contrata o profissional ideal.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        {STEPS.map((step, i) => (
                            <div key={i} className="text-center group">
                                <div className="relative inline-block mb-4">
                                    <div className="w-16 h-16 bg-green/10 rounded-2xl flex items-center justify-center group-hover:bg-green/20 transition-colors">
                                        <step.icon className="w-8 h-8 text-green" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                                        {i + 1}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why LimpFlix */}
            <section className="py-16 md:py-24 bg-gradient-to-br from-navy to-navy-light text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Por que Escolher a LimpFlix?
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Shield, title: 'Profissionais Verificados', desc: 'Todos passam por verificação rigorosa' },
                            { icon: MapPin, title: 'Próximos de Você', desc: 'Encontre profissionais na sua região' },
                            { icon: Star, title: 'Avaliações Reais', desc: 'Opiniões de clientes verdadeiros' },
                            { icon: Users, title: 'Suporte Dedicado', desc: 'Atendimento humanizado e rápido' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-green/30 transition-all hover:-translate-y-1">
                                <item.icon className="w-10 h-10 text-green mb-4" />
                                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                <p className="text-white/60 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            O que Nossos Clientes Dizem
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center">
                                        <span className="text-green font-bold text-sm">{t.name[0]}</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                                        <p className="text-gray-500 text-xs">{t.city}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Pronto para Começar?
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        Junte-se a milhares de clientes satisfeitos e encontre o profissional perfeito para o seu serviço.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/profissionais"
                            className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-green/25"
                        >
                            <Search className="w-5 h-5" />
                            Encontrar Profissional
                        </Link>
                        <Link
                            to="/cadastro-profissional"
                            className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all"
                        >
                            Cadastrar como Profissional
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
