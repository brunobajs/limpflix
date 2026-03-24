import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MessageSquare, Search, Loader2, Trash2 } from 'lucide-react'

export default function ChatList({ onSelectConversation, selectedId }) {
    const { user } = useAuth()
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [providerId, setProviderId] = useState(null)

    useEffect(() => {
        if (!user) return
        loadConversations()
        const channel = supabase
            .channel('public:chat_conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => loadConversations())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user])

    async function loadConversations() {
        try {
            const { data: providerData } = await supabase
                .from('service_providers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            setProviderId(providerData?.id || null)

            let query = supabase
                .from('chat_conversations')
                .select('*, service_providers (id, trade_name, responsible_name, profile_image, user_id)')
                .order('last_message_at', { ascending: false })

            if (providerData) {
                // Se é um prestador, pode ser prestador em algumas conversas e cliente em outras
                query = query.or(`and(client_id.eq.${user.id},deleted_by_client.eq.false),and(provider_id.eq.${providerData.id},deleted_by_provider.eq.false)`)
            } else {
                // Se é apenas cliente
                query = query
                    .eq('client_id', user.id)
                    .eq('deleted_by_client', false)
            }

            const { data, error } = await query
            if (error) throw error
            setConversations(data || [])
        } catch (err) {
            console.error('Error loading conversations:', err)
        } finally {
            setLoading(false)
        }
    }

    async function deleteConversation(e, convId, isProvider) {
        e.stopPropagation()
        if (!window.confirm('Tem certeza que deseja apagar esta conversa?')) return
        try {
            const field = isProvider ? 'deleted_by_provider' : 'deleted_by_client'
            const { error } = await supabase.from('chat_conversations').update({ [field]: true }).eq('id', convId)
            
            if (error) throw error

            setConversations(prev => prev.filter(c => c.id !== convId))
        } catch (err) {
            console.error('Error deleting conversation:', err.message || err)
            alert('Erro ao apagar conversa. Verifique as permissões de RLS no banco de dados.')
        }
    }

    const getDisplayName = (conv) => {
        const isUserProvider = providerId && conv.provider_id === providerId
        return isUserProvider
            ? (conv.client_name || 'Cliente')
            : (conv.provider_name || conv.service_providers?.trade_name || conv.service_providers?.responsible_name || 'Profissional')
    }

    const filteredConversations = conversations.filter(conv => {
        const name = getDisplayName(conv)
        return name.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Mensagens</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar conversa..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green transition-all"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-green animate-spin" />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma conversa encontrada.</p>
                    </div>
                ) : (
                    filteredConversations.map(conv => {
                        const isUserProvider = providerId && conv.provider_id === providerId
                        const displayName = getDisplayName(conv)
                        const lastReadAt = isUserProvider ? conv.provider_last_read_at : conv.client_last_read_at
                        const hasUnread = conv.last_message_at && (!lastReadAt || new Date(conv.last_message_at) > new Date(lastReadAt))

                        return (
                            <div key={conv.id} 
                                onClick={() => onSelectConversation(conv)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all relative group ${selectedId === conv.id ? 'bg-green/10 border-green' : 'hover:bg-gray-50 border-transparent'} border`}
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-navy relative">
                                    {displayName?.[0]?.toUpperCase() || '?'}
                                    {hasUnread && (<span className="absolute -top-0 -right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className={`text-sm truncate ${hasUnread ? 'text-navy font-bold' : 'text-gray-700 font-medium'}`}>{displayName}</h4>
                                        {conv.last_message_at && (
                                            <span className={`text-[10px] flex-shrink-0 ml-1 ${hasUnread ? 'text-green font-bold' : 'text-gray-400'}`}>
                                                {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                        {conv.last_message || 'Inicie uma conversa...'}
                                    </p>
                                </div>
                                    <button
                                        onClick={(e) => deleteConversation(e, conv.id, isUserProvider)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0 p-1"
                                        title="Apagar conversa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

