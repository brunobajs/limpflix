import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { Loader2, FileText, CheckCircle2, XCircle, Clock, DollarSign, MessageCircle, ArrowRight } from "lucide-react"

export default function ClientQuotesTab({ clientId, onOpenChat, onHire }) {
    const [quotes, setQuotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("pending")

    useEffect(() => {
        if (clientId) loadQuotes()
    }, [clientId])

    async function loadQuotes() {
        try {
            const { data, error } = await supabase
                .from("service_quotes")
                .select("*, provider:service_providers(id, trade_name, responsible_name, profile_image)")
                .eq("client_id", clientId)
                .order("created_at", { ascending: false })
            if (error) throw error
            setQuotes(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handleReject(quoteId) {
        if (!window.confirm("Deseja realmente recusar este orçamento?")) return
        try {
            await supabase.from("service_quotes").update({ status: "rejected" }).eq("id", quoteId)
            loadQuotes()
        } catch (err) {
            console.error(err)
            alert("Erro ao recusar orçamento")
        }
    }

    const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter)

    const statusConfig = {
        pending: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
        sent: { label: "Enviado", color: "bg-blue-100 text-blue-600", icon: FileText },
        accepted: { label: "Aprovado", color: "bg-green/10 text-green", icon: CheckCircle2 },
        rejected: { label: "Recusado", color: "bg-red-100 text-red-600", icon: XCircle },
    }

    if (loading) return (<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green animate-spin" /></div>)

    return (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { value: "all", label: "Todos" },
                    { value: "pending", label: "Pendentes" },
                    { value: "accepted", label: "Aprovados" },
                    { value: "rejected", label: "Recusados" },
                ].map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                        className={"px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all " + (filter === f.value ? "bg-green text-white shadow-lg" : "bg-white text-gray-500 border border-gray-200")}>
                        {f.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="font-bold text-gray-400">Nenhum orçamento {filter !== 'all' ? filter : ''} encontrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(quote => {
                        const status = statusConfig[quote.status] || statusConfig.pending
                        const StatusIcon = status.icon
                        return (
                            <div key={quote.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green/5 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                                            {quote.provider?.profile_image ? (
                                                <img src={quote.provider.profile_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-black text-green">{(quote.provider?.trade_name || "P").charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight">{quote.provider?.trade_name || "Profissional"}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(quote.created_at).toLocaleDateString("pt-BR")}</p>
                                        </div>
                                    </div>
                                    <span className={"flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase " + status.color}>
                                        <StatusIcon className="w-3 h-3" />{status.label}
                                    </span>
                                </div>

                                {quote.description && (
                                    <p className="text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 italic">
                                        "{quote.description}"
                                    </p>
                                )}

                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-xs font-bold text-gray-400">R$</span>
                                    <span className="text-3xl font-black text-green">{Number(quote.amount).toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {quote.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => onHire(quote)}
                                                className="bg-green text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green/20 hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />Aceitar
                                            </button>
                                            <button 
                                                onClick={() => handleReject(quote.id)}
                                                className="bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                            >
                                                <XCircle className="w-4 h-4" />Recusar
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => onOpenChat(quote.conversation_id)}
                                        className={"bg-navy text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-navy/20 transition-all " + (quote.status !== 'pending' ? 'col-span-2' : 'col-span-2 mt-2')}
                                    >
                                        <MessageCircle className="w-4 h-4" />Conversar no Chat
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
