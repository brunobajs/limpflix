import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    LayoutDashboard, Users, Building2, MapPin,
    TrendingUp, Calendar, Search, Filter,
    Download, ArrowUpRight, Loader2, PieChart,
    BarChart3, Settings
} from 'lucide-react'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalProviders: 0,
        totalClients: 0,
        totalServices: 0,
        totalRevenue: 0,
    })
    const [cityData, setCityData] = useState([])
    const [recentBookings, setRecentBookings] = useState([])
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        checkAdmin()
        loadAdminData()
    }, [])

    async function checkAdmin() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            navigate('/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            // Em produção reativar: navigate('/')
            console.log('User is not admin, but allowing for dev')
        }
    }

    async function loadAdminData() {
        setLoading(true)
        try {
            // 1. Basic Stats
            const { count: providersCount } = await supabase.from('service_providers').select('*', { count: 'exact', head: true })
            const { count: clientsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client')
            const { data: bookings } = await supabase.from('service_bookings').select('total_amount, status')

            const totalServices = bookings?.filter(b => b.status === 'completed').length || 0
            const totalRevenue = bookings?.reduce((acc, current) => acc + (Number(current.total_amount) || 0), 0) || 0

            setStats({
                totalProviders: providersCount || 0,
                totalClients: clientsCount || 0,
                totalServices,
                totalRevenue
            })

            // 2. City Distribution
            const { data: providers } = await supabase.from('service_providers').select('city')

            const cityMap = {}
            providers?.forEach(p => {
                const city = p.city || 'Desconhecido'
                if (!cityMap[city]) cityMap[city] = { city, providers: 0, services: 0 }
                cityMap[city].providers++
            })

            // 3. Recent Bookings
            const { data: recent } = await supabase
                .from('service_bookings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)

            setRecentBookings(recent || [])
            setCityData(Object.values(cityMap).sort((a, b) => b.providers - a.providers))

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
                        { id: 'overview', label: 'Estatísticas', icon: LayoutDashboard },
                        { id: 'providers', label: 'Prestadores', icon: Building2 },
                        { id: 'cities', label: 'Cidades', icon: MapPin },
                        { id: 'marketing', label: 'Marketing', icon: TrendingUp },
                        { id: 'settings', label: 'Configurações', icon: Settings },
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
                        {activeTab === 'overview' && 'Visão Geral do Sistema'}
                        {activeTab === 'providers' && 'Gestão de Prestadores'}
                        {activeTab === 'cities' && 'Distribuição Geográfica'}
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

                    {/* Middle Section */}
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
                                            <th className="pb-4">VOLUME (EST.)</th>
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
                                                <td className="py-4 text-sm text-gray-500">Média Alta</td>
                                                <td className="py-4 text-right">
                                                    <div className="inline-flex items-center text-green text-xs font-bold gap-1 bg-green/10 px-2 py-1 rounded-md">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        +12%
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
                            <button onClick={() => setActiveTab('marketing')} className="w-full mt-6 py-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                                Ver Relatório Completo
                            </button>
                        </div>
                    </div>
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
