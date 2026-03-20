import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard, Users, Building2, MapPin,
    TrendingUp, Calendar, Search, Filter,
    Download, ArrowUpRight, Loader2, PieChart,
    BarChart3, Settings, Star, CheckCircle2,
    MessageSquare, FileText, Wallet
} from 'lucide-react'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const { user, profile: authProfile, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalProviders: 0,
        totalClients: 0,
        totalServices: 0,
        totalRevenue: 0,
        recentBookings: [],
        financials: {
            providerShare: 0,
            platformShare: 0,
            referralShare: 0,
        }
    })
    const [cityData, setCityData] = useState([])
    const [recentBookings, setRecentBookings] = useState([])
    const [activeTab, setActiveTab] = useState('overview')
    const [adminProviders, setAdminProviders] = useState([])
    const [quotes, setQuotes] = useState([])
    const [conversations, setConversations] = useState([])
    const [allClients, setAllClients] = useState([])

    useEffect(() => {
        if (!authLoading) {
            checkAdmin()
            loadAdminData()
        }
    }, [authLoading, user])

    async function checkAdmin() {
        if (!user) {
            navigate('/admin/login')
            return
        }

        if (authProfile?.role !== 'admin') {
            console.warn('Acesso negado: usuário não é admin.')
            navigate('/admin/login')
            return
        }
    }

    async function loadAdminData() {
        setLoading(true)
        try {
            // 1. Basic Stats
            const { count: providersCount } = await supabase.from('service_providers').select('*', { count: 'exact', head: true })
            const { count: clientsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client')
            const { data: bookings } = await supabase.from('service_bookings').select('total_amount, status, amount_provider, amount_platform, amount_referral')

            const completedBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'confirmed') || []
            const totalServices = completedBookings.length
            const totalRevenue = completedBookings.reduce((acc, current) => acc + (Number(current.total_amount) || 0), 0)
            const providerShare = completedBookings.reduce((acc, current) => acc + (Number(current.amount_provider) || 0), 0)
            const platformShare = completedBookings.reduce((acc, current) => acc + (Number(current.amount_platform) || 0), 0)
            const referralShare = completedBookings.reduce((acc, current) => acc + (Number(current.amount_referral) || 0), 0)

            setStats({
                totalProviders: providersCount || 0,
                totalClients: clientsCount || 0,
                totalServices,
                totalRevenue,
                financials: {
                    providerShare,
                    platformShare,
                    referralShare
                }
            })

            // 2. City Distribution & Providers List
            const { data: providers } = await supabase.rpc('get_admin_providers')
            setAdminProviders(providers || [])

            const cityMap = {}
            providers?.forEach(p => {
                const city = p.city || 'Desconhecido'
                if (!cityMap[city]) cityMap[city] = { city, providers: 0, revenue: 0 }
                cityMap[city].providers++
            })

            // 3. Recent Bookings
            const { data: recent } = await supabase
                .from('service_bookings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            setRecentBookings(recent || [])
            setCityData(Object.values(cityMap).sort((a, b) => b.providers - a.providers))

            // 4. Load all clients
            const { data: clientsData } = await supabase.rpc('get_admin_clients')
            setAllClients(clientsData || [])

            // 5. Load all quotes
            const { data: quotesData } = await supabase
                .from('service_quotes')
                .select(`
                    *,
                    service_providers (trade_name, responsible_name),
                    profiles (full_name)
                `)
                .order('created_at', { ascending: false })
            setQuotes(quotesData || [])

            // 6. Load all conversations
            const { data: conversationsData } = await supabase
                .from('chat_conversations')
                .select(`
                    *,
                    service_providers (trade_name, responsible_name),
                    profiles:client_id (full_name)
                `)
                .order('created_at', { ascending: false })
            setConversations(conversationsData || [])

        } catch (err) {
            console.error('Error loading admin data:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-green animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-navy text-white hidden lg:flex flex-col">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-green uppercase tracking-tighter italic">LimpFlix</h2>
                    <p className="text-white/40 text-[10px] mt-1 tracking-widest uppercase font-bold">Admin Console</p>
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-1">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'clients', label: 'Clientes', icon: Users },
                        { id: 'providers', label: 'Prestadores', icon: Building2 },
                        { id: 'quotes', label: 'Orçamentos', icon: FileText },
                        { id: 'conversations', label: 'Conversas', icon: MessageSquare },
                        { id: 'cities', label: 'Cidades', icon: MapPin },
                        { id: 'marketing', label: 'Financeiro', icon: Wallet },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-green text-white shadow-lg shadow-green/20' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2 text-white/40 hover:text-white text-xs transition-colors">
                        Voltar ao Site
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Topbar */}
                <header className="bg-white border-b border-gray-100 py-4 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-gray-800">
                        {activeTab === 'overview' && 'Dashboard Geral'}
                        {activeTab === 'providers' && 'Gestão de Prestadores'}
                        {activeTab === 'clients' && 'Lista de Clientes'}
                        {activeTab === 'quotes' && 'Orçamentos'}
                        {activeTab === 'conversations' && 'Conversas'}
                        {activeTab === 'cities' && 'Distribuição Geográfica'}
                        {activeTab === 'marketing' && 'Financeiro'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                            <Download className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">Administrador</p>
                                <p className="text-[10px] text-gray-500 uppercase font-black opacity-60">Root Access</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-green to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                AD
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8 animate-fade-in">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Prestadores Totais', value: stats.totalProviders, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Clientes Ativos', value: stats.totalClients, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'Serviços Concluídos', value: stats.totalServices, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
                            { label: 'Faturamento Total', value: `R$ ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Main Sections */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* City Stats */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Distribuição por Cidade</h2>
                                        <p className="text-sm text-gray-500">Onde o LimpFlix está crescendo</p>
                                    </div>
                                    <MapPin className="w-5 h-5 text-gray-300" />
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-gray-400 text-xs font-bold border-b border-gray-50">
                                                <th className="pb-4">CIDADE</th>
                                                <th className="pb-4">PRESTADORES</th>
                                                <th className="pb-4">STATUS</th>
                                                <th className="pb-4 text-right">POTENCIAL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {cityData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-gray-400">Sem dados suficientes</td>
                                                </tr>
                                            ) : cityData.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 font-bold text-navy truncate">{item.city}</td>
                                                    <td className="py-4">
                                                        <span className="bg-navy/5 text-navy px-2 py-1 rounded-md text-xs font-bold">{item.providers}</span>
                                                    </td>
                                                    <td className="py-4 text-sm text-gray-500">Operando</td>
                                                    <td className="py-4 text-right">
                                                        <div className="inline-flex items-center text-green text-xs font-bold gap-1 bg-green/10 px-2 py-1 rounded-md">
                                                            <ArrowUpRight className="w-3 h-3" />
                                                            Crescendo
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Recent Bookings */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-green" />
                                    Últimos Serviços
                                </h2>
                                <div className="space-y-6">
                                    {recentBookings.length === 0 ? (
                                        <p className="text-gray-400 text-center py-8">Nenhum agendamento recente</p>
                                    ) : recentBookings.map((b) => (
                                        <div key={b.id} className="flex gap-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <BarChart3 className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-gray-900 truncate">{b.service_name}</p>
                                                <p className="text-xs text-gray-500">{b.client_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-green">R$ {b.total_amount?.toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'providers' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Lista de Prestadores</h2>
                                <span className="text-xs font-bold text-gray-400 uppercase">{adminProviders.length} CADASTRADOS</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                                            <th className="px-6 py-4">Nome Profissional</th>
                                            <th className="px-6 py-4">Cidade</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Avaliação</th>
                                            <th className="px-6 py-4">Saldo Carteira</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {adminProviders.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green font-bold text-xs">
                                                            {p.trade_name?.charAt(0) || p.responsible_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{p.trade_name || p.responsible_name}</p>
                                                            <p className="text-[10px] text-gray-500">{p.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{p.city}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${p.status === 'approved' ? 'bg-green/10 text-green' : 'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {p.status === 'approved' ? 'Ativo' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-amber-500">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        <span className="text-sm font-bold">{p.rating || '5.0'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-navy">
                                                    R$ {p.wallet_balance?.toLocaleString() || '0,00'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'clients' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Lista de Clientes</h2>
                                <span className="text-xs font-bold text-gray-400 uppercase">{allClients.length} CADASTRADOS</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                                            <th className="px-6 py-4">Nome</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Data de Cadastro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {allClients.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhum cliente cadastrado</td>
                                            </tr>
                                        ) : allClients.map(client => (
                                            <tr key={client.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                            {client.full_name?.charAt(0) || 'C'}
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900">{client.full_name || 'Sem nome'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{client.email || 'Email não disponível'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(client.created_at).toLocaleDateString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'quotes' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Todos os Orçamentos</h2>
                                <span className="text-xs font-bold text-gray-400 uppercase">{quotes.length} ORÇAMENTOS</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Prestador</th>
                                            <th className="px-6 py-4">Valor</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {quotes.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhum orçamento encontrado</td>
                                            </tr>
                                        ) : quotes.map(quote => (
                                            <tr key={quote.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                            {quote.profiles?.full_name?.charAt(0) || 'C'}
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900">{quote.profiles?.full_name || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900">{quote.service_providers?.trade_name || quote.service_providers?.responsible_name || 'N/A'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-green">R$ {Number(quote.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                                        quote.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                        quote.status === 'sent' ? 'bg-blue-100 text-blue-600' :
                                                        quote.status === 'accepted' ? 'bg-green-100 text-green' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {quote.status === 'pending' ? 'Pendente' :
                                                         quote.status === 'sent' ? 'Enviado' :
                                                         quote.status === 'accepted' ? 'Aceito' :
                                                         quote.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'conversations' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Todas as Conversas</h2>
                                <span className="text-xs font-bold text-gray-400 uppercase">{conversations.length} CONVERSAS</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Prestador</th>
                                            <th className="px-6 py-4">Última Mensagem</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {conversations.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhuma conversa encontrada</td>
                                            </tr>
                                        ) : conversations.map(conv => (
                                            <tr key={conv.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                            {conv.profiles?.full_name?.charAt(0) || 'C'}
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900">{conv.profiles?.full_name || conv.client_name || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900">{conv.service_providers?.trade_name || conv.provider_name || 'N/A'}</p>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <p className="text-sm text-gray-600 truncate">{conv.last_message || 'Sem mensagens'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                                                        conv.status === 'active' ? 'bg-green-100 text-green' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {conv.status === 'active' ? 'Ativa' : 'Encerrada'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(conv.created_at).toLocaleDateString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cities' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Distribuição Geográfica</h2>
                                    <p className="text-sm text-gray-500">Cidades com prestadores ativos</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cityData.map((c, i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-green" />
                                            <span className="font-bold text-navy">{c.city}</span>
                                        </div>
                                        <span className="bg-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">{c.providers} profissionais</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'marketing' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                                    <TrendingUp className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Lucro Plataforma</h3>
                                <p className="text-3xl font-black text-blue-900">R$ {stats.financials.platformShare.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Referente a 5-6% de taxa</p>
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-8 h-8 text-green" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pago aos Profissionais</h3>
                                <p className="text-3xl font-black text-green-900">R$ {stats.financials.providerShare.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Referente a 94% dos serviços</p>
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
                                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                                    <Users className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Pagas por Indicação</h3>
                                <p className="text-3xl font-black text-purple-900">R$ {stats.financials.referralShare.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Referente a 1% de cashback</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function Clock(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}


