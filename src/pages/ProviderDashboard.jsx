import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard, Calendar, Wallet, Star,
    MessageCircle, Users, Settings, Copy, CheckCircle2,
    TrendingUp, Clock, DollarSign, Award,
    Loader2, LogOut, ExternalLink, Share2,
    Save, X, MapPin, Phone, Mail, Building2, MessageSquare,
    AlertCircle, GraduationCap, Gift
} from 'lucide-react'
import ChatList from '../components/ChatList'
import ChatWindow from '../components/ChatWindow'
import { sendPayoutPix } from '../lib/payouts'

const SERVICE_OPTIONS = [
    'Limpeza de Sofá', 'Limpeza de Colchão', 'Limpeza de Carpete',
    'Limpeza de Cortinas', 'Limpeza de Pisos', "Limpeza de Caixa d'Água",
    'Limpeza de Vidros', 'Limpeza de Fachada', 'Limpeza Pós-Obra',
    'Impermeabilização', 'Faxina Residencial'
]

const STATES = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

export default function ProviderDashboard() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Data
    const [provider, setProvider] = useState(null)
    const [bookings, setBookings] = useState([])

    // UI State
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [showWelcome, setShowWelcome] = useState(searchParams.get('welcome') === 'true')
    const [copied, setCopied] = useState(false)

    // Form State (Settings)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({})
    const [isSaving, setIsSaving] = useState(false)
    const [selectedChat, setSelectedChat] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [loadingTransactions, setLoadingTransactions] = useState(false)
    const [isWithdrawing, setIsWithdrawing] = useState(false)

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }

        const tab = searchParams.get('tab')
        if (tab && tabs.some(t => t.id === tab)) {
            setActiveTab(tab)
        }

        loadProviderData()
    }, [user, searchParams])

    async function loadProviderData() {
        try {
            const { data: providerData } = await supabase
                .from('service_providers')
                .select('*')
                .eq('user_id', user.id)
                .single()

            setProvider(providerData)
            setEditForm(providerData || {})

            if (providerData) {
                const { data: bookingData } = await supabase
                    .from('service_bookings')
                    .select('*')
                    .eq('provider_id', providerData.id)
                    .order('created_at', { ascending: false })

                setBookings(bookingData || [])
                fetchTransactions(providerData.id)
            }
        } catch (err) {
            console.error('Error loading dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchTransactions(providerId) {
        setLoadingTransactions(true)
        try {
            const { data } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false })
            setTransactions(data || [])
        } catch (err) {
            console.error('Error fetching transactions:', err)
        } finally {
            setLoadingTransactions(false)
        }
    }

    // --- Actions ---

    async function updateBookingStatus(bookingId, newStatus) {
        try {
            const updates = {
                status: newStatus,
                updated_at: new Date().toISOString()
            }

            if (newStatus === 'in_progress') {
                updates.started_at = new Date().toISOString()
            } else if (newStatus === 'waiting_client_confirmation') {
                updates.completed_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('service_bookings')
                .update(updates)
                .eq('id', bookingId)

            if (error) throw error

            // Handle Busy State
            if (newStatus === 'in_progress') {
                await supabase.from('service_providers').update({ is_busy: true }).eq('id', provider.id)
                setProvider(prev => ({ ...prev, is_busy: true }))
            } else if (newStatus === 'completed' || newStatus === 'canceled') {
                await supabase.from('service_providers').update({ is_busy: false }).eq('id', provider.id)
                setProvider(prev => ({ ...prev, is_busy: false }))
            }

            // Refresh local state
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: newStatus } : b
            ))
        } catch (err) {
            console.error('Error updating booking:', err)
            alert('Erro ao atualizar agendamento. Tente novamente.')
        }
    }

    async function handleWithdraw() {
        if (!provider.pix_key) {
            alert('Por favor, cadastre sua chave PIX nas configurações primeiro.')
            return
        }

        const balance = provider.wallet_balance || 0
        if (balance < 20) {
            alert('O saldo mínimo para saque é R$ 20,00')
            return
        }

        if (!confirm(`Deseja sacar R$ ${balance.toFixed(2)} para a chave ${provider.pix_key}?`)) {
            return
        }

        setIsWithdrawing(true)
        try {
            // 1. Chamar utilitário de Payout
            await sendPayoutPix({
                pixKey: provider.pix_key,
                amount: balance,
                description: `Saque LimpFlix - ${provider.trade_name || provider.responsible_name}`
            })

            // 2. Atualizar saldo no Supabase (zera o saldo atual)
            // Em produção, isso seria feito por um webhook ou transaction atômica
            const { error: updateError } = await supabase
                .from('service_providers')
                .update({
                    wallet_balance: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', provider.id)

            if (updateError) throw updateError

            // 3. Registrar a transação de saída
            await supabase.from('financial_transactions').insert({
                provider_id: provider.id,
                amount: balance,
                type: 'outgoing',
                status: 'completed',
                description: 'Saque realizado via PIX'
            })

            alert('Saque solicitado com sucesso! O valor cairá em sua conta em instantes.')
            loadProviderData() // Recarrega os dados
        } catch (err) {
            console.error('Withdraw error:', err)
            alert('Erro ao processar saque: ' + err.message)
        } finally {
            setIsWithdrawing(false)
        }
    }

    async function handleSaveSettings() {
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('service_providers')
                .update({
                    trade_name: editForm.trade_name,
                    bio: editForm.bio,
                    phone: editForm.phone,
                    pix_key: editForm.pix_key,
                    city: editForm.city,
                    state: editForm.state,
                    services_offered: editForm.services_offered,
                    updated_at: new Date().toISOString()
                })
                .eq('id', provider.id)

            if (error) throw error

            setProvider({ ...provider, ...editForm })
            setIsEditing(false)
            alert('Perfil atualizado com sucesso!')
        } catch (err) {
            console.error('Error updating profile:', err)
            alert('Erro ao salvar alterações.')
        } finally {
            setIsSaving(false)
        }
    }

    function toggleService(service) {
        setEditForm(prev => ({
            ...prev,
            services_offered: prev.services_offered.includes(service)
                ? prev.services_offered.filter(s => s !== service)
                : [...prev.services_offered, service]
        }))
    }

    function copyReferralCode() {
        if (provider?.referral_code) {
            navigator.clipboard.writeText(provider.referral_code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    function copyReferralLink(type) {
        const link = type === 'provider'
            ? `${window.location.origin}/cadastro-profissional?ref=${provider?.referral_code}`
            : `${window.location.origin}/profissionais?ref=${provider?.referral_code}`;
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function futureFeatureAlert() {
        alert('Esta funcionalidade está em fase de desenvolvimento e estará disponível em breve!')
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
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
                <h2 className="text-xl font-bold text-gray-700">Nenhum perfil de profissional encontrado</h2>
                <p className="text-gray-500 text-center">Você precisa se cadastrar como profissional primeiro.</p>
                <button
                    onClick={() => navigate('/cadastro-profissional')}
                    className="bg-green hover:bg-green-dark text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                    Cadastrar-se
                </button>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'bookings', label: 'Agendamentos', icon: Calendar },
        { id: 'wallet', label: 'Carteira', icon: Wallet },
        { id: 'reviews', label: 'Avaliações', icon: Star },
        { id: 'referrals', label: 'Indicações', icon: Users },
        { id: 'messages', label: 'Mensagens', icon: MessageSquare },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ]

    const stats = [
        { label: 'Serviços Realizados', value: provider.total_services || 0, icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
        { label: 'Avaliação Média', value: provider.rating?.toFixed(1) || '5.0', icon: Award, color: 'from-yellow-500 to-yellow-600' },
        { label: 'Avaliações', value: provider.total_reviews || 0, icon: Star, color: 'from-purple-500 to-purple-600' },
        { label: 'Lucro Líquido', value: `R$ ${(provider.wallet_balance || 0).toFixed(2)}`, icon: DollarSign, color: 'from-green to-emerald-600' },
    ]

    const BookingCard = ({ booking, showActions = true }) => (
        <div className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <span className="font-bold text-gray-900 block">{booking.client_name}</span>
                    <span className="text-gray-500 text-sm">{booking.service_name}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'completed' ? 'bg-green/10 text-green' :
                            booking.status === 'canceled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-500'
                    }`}>
                    {booking.status === 'pending' ? 'Pendente' :
                        booking.status === 'confirmed' ? 'Confirmado' :
                            booking.status === 'completed' ? 'Concluído' :
                                booking.status === 'canceled' ? 'Cancelado' : booking.status}
                </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                {booking.scheduled_date && (
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(booking.scheduled_date).toLocaleDateString('pt-BR')} {booking.scheduled_time}</span>
                    </div>
                )}
                {booking.total_amount && (
                    <div className="flex items-center gap-1 font-semibold text-green">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {booking.total_amount.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {showActions && (
                <div className="mt-4 flex flex-col gap-2">
                    {booking.status === 'confirmed' && (
                        <button
                            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            Iniciar Serviço (Ficar Ocupado)
                        </button>
                    )}
                    {booking.status === 'in_progress' && (
                        <button
                            onClick={() => updateBookingStatus(booking.id, 'waiting_client_confirmation')}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Solicitar Finalização
                        </button>
                    )}
                    {booking.status === 'waiting_client_confirmation' && (
                        <div className="w-full bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm font-medium text-center">
                            Aguardando confirmação do cliente...
                        </div>
                    )}
                    {/* Fallback actions if needed, e.g. Cancel */}
                </div>
            )}
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Welcome modal */}
            {showWelcome && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center animate-slide-up">
                        <div className="w-16 h-16 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo à LimpFlix! 🎉</h2>
                        <p className="text-gray-600 mb-6">Seu cadastro foi realizado com sucesso. Agora seus clientes podem encontrar você!</p>
                        {provider.referral_code && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-500 mb-2">Seu código de indicação:</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xl font-bold text-navy">{provider.referral_code}</span>
                                    <button onClick={copyReferralCode} className="text-green hover:text-green-dark">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setShowWelcome(false)}
                            className="w-full bg-green hover:bg-green-dark text-white py-3 rounded-xl font-semibold transition-all"
                        >
                            Acessar Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Top bar */}
            <div className="bg-navy">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green rounded-xl flex items-center justify-center text-white font-bold">
                            {(provider.trade_name || provider.responsible_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-white font-bold">{provider.trade_name || provider.responsible_name}</h1>
                            <p className="text-white/50 text-xs">Dashboard do Profissional</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${provider.is_busy ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-green/20 text-green border border-green/30'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${provider.is_busy ? 'bg-red-500' : 'bg-green'}`}></span>
                            {provider.is_busy ? 'Ocupado' : 'Disponível'}
                        </div>
                        <button onClick={() => navigate(`/profissional/${provider.id}`)}
                            className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">Ver Perfil</span>
                        </button>
                        <button onClick={() => { signOut(); navigate('/') }}
                            className="text-white/60 hover:text-red-400 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-navy text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                                        <stat.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent bookings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Últimos Agendamentos</h2>
                                <button onClick={() => setActiveTab('bookings')} className="text-green text-sm font-medium hover:underline">
                                    Ver todos
                                </button>
                            </div>

                            {bookings.length === 0 ? (
                                <div className="text-center py-8">
                                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhum agendamento ainda.</p>
                                    <p className="text-gray-400 text-sm">Quando clientes agendarem, aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bookings.slice(0, 3).map((booking) => (
                                        <BookingCard key={booking.id} booking={booking} showActions={true} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick referral */}
                        {provider.referral_code && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Building2 className="w-6 h-6 text-green" />
                                        <h3 className="font-bold text-lg">Indicar Prestador</h3>
                                    </div>
                                    <p className="text-white/70 text-sm mb-4">
                                        Indique profissionais e ganhe 1% de comissão permanente sobre os serviços deles.
                                    </p>
                                    <button onClick={() => copyReferralLink('provider')}
                                        className="w-full bg-green hover:bg-green-dark py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                                        {copied ? <CheckCircle2 className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                        Copiar Link de Cadastro
                                    </button>
                                </div>

                                <div className="bg-gradient-to-br from-green to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Users className="w-6 h-6 text-navy" />
                                        <h3 className="font-bold text-lg">Indicar Cliente</h3>
                                    </div>
                                    <p className="text-white/90 text-sm mb-4">
                                        Traga seus clientes! Você ganha 1% de comissão e tem <strong>prioridade exclusiva</strong> para atendê-los.
                                    </p>
                                    <button onClick={() => copyReferralLink('client')}
                                        className="w-full bg-navy hover:bg-navy-light text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                                        {copied ? <CheckCircle2 className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                        Copiar Link para Clientes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Future Features (Small placeholders) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={futureFeatureAlert}
                                className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Gift className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900 leading-tight">Clube de Benefícios</h3>
                                        <p className="text-xs text-gray-400">Descontos exclusivos em parceiros</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500" />
                            </button>

                            <button
                                onClick={futureFeatureAlert}
                                className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900 leading-tight">Cursos e Treinamentos</h3>
                                        <p className="text-xs text-gray-400">Capacite-se para ganhar mais</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Bookings Tab */}
                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Gestão de Agendamentos</h2>
                        {bookings.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-700 mb-2">Nenhum agendamento</h3>
                                <p className="text-gray-500">Quando clientes agendarem serviços, eles aparecerão aqui.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bookings.map((booking) => (
                                    <BookingCard key={booking.id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Wallet Tab */}
                {activeTab === 'wallet' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green to-emerald-600 rounded-2xl p-6 text-white">
                                <p className="text-white/70 text-sm mb-1">Saldo Disponível</p>
                                <p className="text-3xl font-bold">R$ {(provider.wallet_balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white">
                                <p className="text-white/70 text-sm mb-1">Saldo Pendente</p>
                                <p className="text-3xl font-bold">R$ {(provider.pending_balance || 0).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Solicitar Saque via PIX</h3>
                            {provider.pix_key ? (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full">
                                        <p className="text-gray-500 text-xs mb-1">Sua Chave PIX cadastrada</p>
                                        <p className="font-bold text-navy">{provider.pix_key}</p>
                                    </div>
                                    <button
                                        onClick={handleWithdraw}
                                        disabled={(provider.wallet_balance || 0) < 20 || isWithdrawing}
                                        className="w-full sm:w-auto bg-green hover:bg-green-dark text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                    >
                                        {isWithdrawing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            (provider.wallet_balance || 0) < 20 ? 'Mínimo R$ 20,00' : 'Sacar Agora'
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <p className="text-yellow-800 font-medium">Chave PIX não configurada</p>
                                        <p className="text-yellow-700 text-sm">Vá em configurações para salvar sua chave e liberar os saques.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Histórico Financeiro</h3>
                            {loadingTransactions ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 text-green animate-spin" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-8">
                                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-500">Nenhuma transação registrada ainda.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="py-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{tx.description || (tx.type === 'incoming' ? 'Pagamento Recebido' : 'Saque Realizado')}</p>
                                                <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString('pt-BR')} às {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <div className={`text-right ${tx.type === 'incoming' ? 'text-green' : 'text-navy'}`}>
                                                <p className="font-bold">{tx.type === 'incoming' ? '+' : '-'} R$ {tx.amount.toFixed(2)}</p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                                                    {tx.status === 'completed' ? 'Concluído' : tx.status === 'pending' ? 'Em processamento' : 'Falhou'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-gray-900">{provider.rating?.toFixed(1) || '5.0'}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-4 h-4 ${i < Math.round(provider.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                                <p className="text-gray-500 text-xs mt-1">{provider.total_reviews || 0} avaliações</p>
                            </div>
                        </div>
                        {(provider.total_reviews || 0) === 0 && (
                            <div className="text-center py-8">
                                <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-500">Nenhuma avaliação recebida ainda.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white">
                            <h2 className="text-xl font-bold mb-2">Programa de Indicações</h2>
                            <p className="text-white/70 text-sm mb-4">
                                Ganhe comissão de 1% sobre cada serviço realizado pelos profissionais que você indicar!
                            </p>
                            <div className="bg-white/10 rounded-xl p-4 mb-4">
                                <p className="text-white/50 text-xs mb-1">Seu código de indicação</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold font-mono">{provider.referral_code}</span>
                                    <button onClick={copyReferralCode}>
                                        {copied ? <CheckCircle2 className="w-5 h-5 text-green" /> : <Copy className="w-5 h-5 text-white/60 hover:text-white" />}
                                    </button>
                                </div>
                            </div>
                            <button onClick={copyReferralLink}
                                className="bg-green hover:bg-green-dark text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
                                <Share2 className="w-5 h-5" />
                                Copiar Link de Indicação
                            </button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-2">Suas Indicações</h3>
                            <p className="text-gray-500 text-sm">Total: {provider.total_referrals || 0} profissional(is) indicado(s)</p>
                        </div>
                    </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in h-[600px]">
                        <div className="md:col-span-1 h-full">
                            <ChatList
                                onSelectConversation={(conv) => setSelectedChat(conv)}
                                selectedId={selectedChat?.id}
                            />
                        </div>
                        <div className="md:col-span-2 h-full">
                            <ChatWindow
                                conversationId={selectedChat?.id}
                                otherPartyName={selectedChat?.client_name}
                            />
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Configurações do Perfil</h2>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 text-green hover:bg-green/10 px-4 py-2 rounded-lg transition-colors font-medium"
                                >
                                    <Settings className="w-4 h-4" />
                                    Editar Dados
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setIsEditing(false); setEditForm(provider) }}
                                        className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Salvar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia / Empresa</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={editForm.trade_name || ''}
                                            onChange={e => setEditForm({ ...editForm, trade_name: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={editForm.phone || ''}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sobre</label>
                                    <textarea
                                        disabled={!isEditing}
                                        value={editForm.bio || ''}
                                        onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX (Para Recebimento Automático)</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={editForm.pix_key || ''}
                                        onChange={e => setEditForm({ ...editForm, pix_key: e.target.value })}
                                        placeholder="CPF, E-mail ou Celular"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">*O valor será transferido para esta chave assim que o pagamento for confirmado.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={editForm.city || ''}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                        <select
                                            disabled={!isEditing}
                                            value={editForm.state || ''}
                                            onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                                        >
                                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Serviços Oferecidos</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SERVICE_OPTIONS.map(service => (
                                        <button
                                            key={service}
                                            type="button"
                                            disabled={!isEditing}
                                            onClick={() => toggleService(service)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${editForm.services_offered?.includes(service)
                                                ? 'border-green bg-green/5 text-green'
                                                : 'border-gray-200 text-gray-700'
                                                } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-green/50'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${editForm.services_offered?.includes(service) ? 'bg-green border-green' : 'border-gray-300'
                                                }`}>
                                                {editForm.services_offered?.includes(service) && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium">{service}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
