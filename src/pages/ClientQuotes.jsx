import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, FileText, CheckCircle2, XCircle, Clock, DollarSign, MessageCircle } from 'lucide-react'

export default function ClientQuotes() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [quotes, setQuotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        if (!authLoading && user) loadQuotes()
    }, [authLoading, user])

    async function loadQuotes() {
        try {
            const { data, error } = await supabase
                .from('service_quotes')
                .select('*, provider:service_providers(trade_name, responsible_name, profile_image, phone)')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            setQuotes(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function approveQuote(quoteId, conversationId) {
        if (!window.confirm('Deseja aprovar este orcamento?')) return
        await supabase.from('service_quotes').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', quoteId)
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q))
        if (conversationId) navigate(`/cliente/dashboard`)
    }

    async function rejectQuote(quoteId) {
        if (!window.confirm('Deseja recusar este orcamento?')) return
        await supabase.from('service_quotes').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', quoteId)
        setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'rejected' } : q))
    }

    const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

    const statusConfig = {
        pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
        accepted: { label: 'Aprovado', color: 'bg-green/10 text-green', icon: CheckCircle2 },
        rejected: { label: 'Recusado', color: 'bg-red-100 text-red-600', icon: XCircle },
        sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-600', icon: FileText },
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-green animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button onClick={() => navigate('/cliente/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </button>
                <h1 className="text-lg font-bold text-gray-800">Meus Orcamentos</h1>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total', value: quotes.length, color: 'text-gray-700', bg: 'bg-gray-100' },
                        { label: 'Pendentes', value: quotes.filter(q => q.status === 'pending' || q.status === 'sent').length, color: 'text-amber-700', bg: 'bg-amber-100' },
                        { label: 'Aprovados', value: quotes.filter(q => q.status === 'accepted').length, color: 'text-green', bg: 'bg-green/10' },
                        { label: 'Recusados', value: quotes.filter(q => q.status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-100' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {[
                        { value: 'all', label: 'Todos' },
                        { value: 'pending', label: 'Pendentes' },
                        { value: 'accepted', label: 'Aprovados' },
                        { value: 'rejected', label: 'Recusados' },
                    ].map(f => (
                        <button key={f.value} onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === f.value ? 'bg-green text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Quotes List */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <p className="font-bold text-gray-500">Nenhum orcamento encontrado</p>
                        <button onClick={() => navigate('/profissionais')} className="mt-4 bg-green text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-green-dark transition-colors">
                            Solicitar Orcamento
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(quote => {
                            const status = statusConfig[quote.status] || statusConfig.pending
                            const StatusIcon = status.icon
                            return (
                                <div key={quote.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-green/10 rounded-xl flex items-center justify-center">
                                                <span className="font-bold text-green text-lg">
                                                    {(quote.provider?.trade_name || 'P').charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{quote.provider?.trade_name || quote.provider?.responsible_name || 'Profissional'}</p>
                                                <p className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </span>
                                    </div>

                                    {quote.description && (
                                        <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl">{quote.description}</p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-xl">
                                            <DollarSign className="w-4 h-4 text-green" />
                                            <span className="font-bold text-green text-lg">R$ {Number(quote.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {quote.conversation_id && (
                                                <button onClick={() => navigate('/cliente/dashboard')}
                                                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                                                    <MessageCircle className="w-3 h-3" />
                                                    Chat
                                                </button>
                                            )}
                                            {(quote.status === 'pending' || quote.status === 'sent') && (
                                                <>
                                                    <button onClick={() => rejectQuote(quote.id)}
                                                        className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold transition-colors">
                                                        <XCircle className="w-3 h-3" />
                                                        Recusar
                                                    </button>
                                                    <button onClick={() => approveQuote(quote.id, quote.conversation_id)}
                                                        className="flex items-center gap-1 px-3 py-2 bg-green text-white hover:bg-green-dark rounded-xl text-xs font-bold transition-colors">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Aprovar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
