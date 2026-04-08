import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Star, MapPin, Phone, Mail, Calendar,
    ArrowLeft, User, Loader2, CheckCircle2,
    Clock, MessageCircle, FileText, X
} from 'lucide-react'

export default function ProviderProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [provider, setProvider] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showAuthModal, setShowAuthModal] = useState(false)

    useEffect(() => {
        loadProvider()
    }, [id])

    async function loadProvider() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('service_providers')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            setProvider(data)
        } catch (err) {
            console.error('Error loading provider:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRequestQuote = (e) => {
        if (!user) {
            e.preventDefault()
            setShowAuthModal(true)
            return
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-green animate-spin" />
            </div>
        )
    }

    if (!provider) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <User className="w-16 h-16 text-gray-300" />
                <h2 className="text-xl font-bold text-gray-700">Profissional não encontrado</h2>
                <Link to="/profissionais" className="text-green hover:text-green-dark font-semibold">
                    ← Voltar para lista
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 relative">
            {/* Friendly Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
                        <button 
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <User className="w-10 h-10 text-green" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quase lá!</h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Para solicitar um orçamento e garantir sua segurança, você precisa estar conectado. <br/>
                                <span className="font-bold text-green">É super rápido e gratuito!</span>
                            </p>
                            
                            <div className="grid gap-3">
                                <Link 
                                    to="/login" 
                                    className="w-full bg-green text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-dark transition-all transform hover:scale-105 shadow-xl shadow-green/20"
                                >
                                    Entrar na minha conta
                                </Link>
                                <Link 
                                    to="/login?tab=register" 
                                    className="w-full bg-navy text-white py-4 rounded-2xl font-bold text-lg hover:bg-navy-light transition-all"
                                >
                                    Criar nova conta
                                </Link>
                                <button 
                                    onClick={() => setShowAuthModal(false)}
                                    className="text-gray-400 font-medium hover:text-gray-600 mt-2"
                                >
                                    Voltar depois
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Banner */}
            <div className="bg-gradient-to-br from-navy to-navy-light py-12">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link to="/profissionais" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para lista
                    </Link>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                            {provider.profile_image ? (
                                <img src={provider.profile_image} alt="" className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-white font-bold text-4xl">
                                    {(provider.trade_name || provider.responsible_name || '?')[0].toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-bold text-white">
                                    {provider.trade_name || provider.responsible_name}
                                </h1>
                                <CheckCircle2 className="w-6 h-6 text-green flex-shrink-0" />
                            </div>
                            {provider.trade_name && (
                                <p className="text-white/60 mt-1">Responsável: {provider.responsible_name}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 mt-3">
                                <div className="flex items-center gap-1 text-white/80">
                                    <MapPin className="w-4 h-4 text-green" />
                                    <span className="text-sm">{provider.city}, {provider.state}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <span className="text-white font-semibold">{provider.rating?.toFixed(1) || '5.0'}</span>
                                    <span className="text-white/50 text-sm">({provider.total_reviews || 0} avaliações)</span>
                                </div>
                                <div className="flex items-center gap-1 text-white/60 text-sm">
                                    <Clock className="w-4 h-4" />
                                    {provider.total_services || 0} serviços realizados
                                </div>
                            </div>
                        </div>
                        {/* Contact Buttons */}
                        <div className="flex flex-col gap-2">
                            <a
                                href={`tel:${provider.phone || ''}`}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                            >
                                <Phone className="w-5 h-5" />
                                Ligar
                            </a>
                            <a
                                href={`https://wa.me/${provider.phone?.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(provider.trade_name || provider.responsible_name)}!%20Vi%20seu%20perfil%20na%20LimpFlix%20e%20gostaria%20de%20um%20orçamento.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </a>
                            <Link
                                to={`/solicitar-orcamento?profissional=${provider.id}`}
                                onClick={handleRequestQuote}
                                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all border border-white/20 text-center justify-center"
                            >
                                <FileText className="w-5 h-5" />
                                Solicitar Orçamento
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* About */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between mb-3">
                                <h2 className="text-lg font-bold text-gray-900">Sobre</h2>
                                {provider.logo_image && (
                                    <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                        <img src={provider.logo_image} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {provider.bio || 'Profissional qualificado e comprometido com a excelência nos serviços de limpeza.'}
                            </p>
                        </div>

                        {/* Portfolio Gallery */}
                        {provider.portfolio_images?.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Portfólio / Trabalhos Realizados</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {provider.portfolio_images.map((img, i) => (
                                        <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                                            <img src={img} alt={`Trabalho ${i + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Services */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Serviços Oferecidos</h2>
                            {provider.services_offered?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {provider.services_offered.map((service, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0" />
                                            <span className="text-gray-700 text-sm font-medium">{service}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Nenhum serviço listado.</p>
                            )}
                        </div>

                        {/* Reviews placeholder */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Avaliações ({provider.total_reviews || 0})
                            </h2>
                            {(provider.total_reviews || 0) === 0 ? (
                                <p className="text-gray-500 text-sm">Nenhuma avaliação ainda.</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* We'll load real reviews from Supabase later */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i}
                                                    className={`w-5 h-5 ${i < Math.round(provider.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-2xl font-bold text-gray-900">{provider.rating?.toFixed(1) || '5.0'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Informações</h2>
                            <div className="space-y-3">
                                {provider.phone && (
                                    <div className="flex items-center gap-3 text-gray-600 text-sm">
                                        <Phone className="w-4 h-4 text-green" />
                                        {provider.phone}
                                    </div>
                                )}
                                {provider.email && (
                                    <div className="flex items-center gap-3 text-gray-600 text-sm">
                                        <Mail className="w-4 h-4 text-green" />
                                        {provider.email}
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-gray-600 text-sm">
                                    <MapPin className="w-4 h-4 text-green" />
                                    {provider.address || `${provider.city}, ${provider.state}`}
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 text-sm">
                                    <Calendar className="w-4 h-4 text-green" />
                                    Membro desde {new Date(provider.created_at || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="bg-gradient-to-br from-green to-emerald-600 rounded-2xl p-6 text-white">
                            <h3 className="font-bold text-lg mb-2">Precisa deste serviço?</h3>
                            <p className="text-white/80 text-sm mb-4">
                                Solicite um orçamento diretamente com este profissional.
                            </p>
                            <Link
                                to={`/solicitar-orcamento?profissional=${provider.id}`}
                                onClick={handleRequestQuote}
                                className="block w-full bg-white text-green font-bold py-3 rounded-xl text-center hover:bg-gray-50 transition-colors"
                            >
                                Solicitar Orçamento
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
