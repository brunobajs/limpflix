import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { Loader2, FileText, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react"

export default function ProviderQuotesTab({ providerId }) {
    const [quotes, setQuotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all")

    useEffect(() => {
        if (providerId) loadQuotes()
    }, [providerId])

    async function loadQuotes() {
        try {
            const { data, error } = await supabase
                .from("service_quotes")
                .select("*, profiles:client_id(full_name)")
                .eq("provider_id", providerId)
                .order("created_at", { ascending: false })
            if (error) throw error
            setQuotes(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Enviados", value: quotes.length, color: "text-gray-700" },
                    { label: "Em Aberto", value: quotes.filter(q => q.status === "pending" || q.status === "sent").length, color: "text-amber-600" },
                    { label: "Aprovados", value: quotes.filter(q => q.status === "accepted").length, color: "text-green" },
                    { label: "Recusados", value: quotes.filter(q => q.status === "rejected").length, color: "text-red-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                        <div className={"text-3xl font-bold " + stat.color}>{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {[
                    { value: "all", label: "Todos" },
                    { value: "pending", label: "Pendentes" },
                    { value: "sent", label: "Enviados" },
                    { value: "accepted", label: "Aprovados" },
                    { value: "rejected", label: "Recusados" },
                ].map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                        className={"px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all " + (filter === f.value ? "bg-green text-white" : "bg-white text-gray-500 border border-gray-200")}>
                        {f.label}
                    </button>
                ))}
            </div>
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="font-bold text-gray-500">Nenhum orçamento encontrado</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(quote => {
                        const status = statusConfig[quote.status] || statusConfig.pending
                        const StatusIcon = status.icon
                        return (
                            <div key={quote.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                            <span className="font-bold text-purple-600">{(quote.profiles?.full_name || quote.client_name || "C").charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{quote.profiles?.full_name || quote.client_name || "Cliente"}</p>
                                            <p className="text-xs text-gray-500">{new Date(quote.created_at).toLocaleDateString("pt-BR")}</p>
                                        </div>
                                    </div>
                                    <span className={"flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold " + status.color}>
                                        <StatusIcon className="w-3 h-3" />{status.label}
                                    </span>
                                </div>
                                {quote.description && (<p className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-xl">{quote.description}</p>)}
                                <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-xl w-fit">
                                    <DollarSign className="w-4 h-4 text-green" />
                                    <span className="font-bold text-green">R$ {Number(quote.amount).toFixed(2)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
