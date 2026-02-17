import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MessageSquare, Clock, Search, Loader2 } from 'lucide-react'

export default function ChatList({ onSelectConversation, selectedId }) {
    const { user } = useAuth()
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (!user) return
        loadConversations()

        // Real-time update for conversation list (last message)
        const channel = supabase
            .channel('public:chat_conversations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_conversations',
                    filter: `client_id=eq.${user.id}`
                },
                () => loadConversations()
            )
            .subscribe()

        // Also check as provider
        const providerChannel = supabase
            .channel('provider:chat_conversations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_conversations',
                    filter: `provider_id=in.(select id from service_providers where user_id = '${user.id}')`
                },
                () => loadConversations()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(providerChannel)
        }
    }, [user])

    async function loadConversations() {
        try {
            // First get provider profile if exists
            const { data: providerData } = await supabase
                .from('service_providers')
                .select('id')
                .eq('user_id', user.id)
                .single()

            let query = supabase
                .from('chat_conversations')
                .select(`
                    *,
                    service_providers (id, trade_name, responsible_name, profile_image)
                `)
                .order('last_message_at', { ascending: false })

            if (providerData) {
                query = query.or(`client_id.eq.${user.id},provider_id.eq.${providerData.id}`)
            } else {
                query = query.eq('client_id', user.id)
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

    const filteredConversations = conversations.filter(conv => {
        const name = conv.provider_name || conv.client_name || ''
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
                        const isUserProvider = conv.provider_id && conv.service_providers?.id === conv.provider_id && user.id === conv.service_providers?.user_id
                        const displayName = isUserProvider ? conv.client_name : (conv.service_providers?.trade_name || conv.service_providers?.responsible_name || 'Profissional')

                        // Lógica de Notificação: Verifica se a última mensagem é posterior à última leitura do usuário
                        const lastReadAt = isUserProvider ? conv.provider_last_read_at : conv.client_last_read_at
                        const hasUnread = conv.last_message_at && (!lastReadAt || new Date(conv.last_message_at) > new Date(lastReadAt))

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelectConversation(conv)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative ${selectedId === conv.id
                                    ? 'bg-green/10 border-green'
                                    : 'hover:bg-gray-50 border-transparent'
                                    } border`}
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-navy relative">
                                    {displayName?.[0]?.toUpperCase() || '?'}
                                    {hasUnread && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <h4 className={`font-bold text-gray-900 truncate ${hasUnread ? 'text-navy' : 'text-gray-700 font-medium'}`}>{displayName}</h4>
                                        </div>
                                        {conv.last_message_at && (
                                            <span className={`text-[10px] ${hasUnread ? 'text-green font-bold' : 'text-gray-400'}`}>
                                                {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                        {conv.last_message || 'Inicie uma conversa...'}
                                    </p>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
