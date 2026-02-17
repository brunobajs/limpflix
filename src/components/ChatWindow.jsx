import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Send, Image, Loader2, User, Clock } from 'lucide-react'

export default function ChatWindow({ conversationId, otherPartyName }) {
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        if (!conversationId) return

        loadMessages()

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    async function loadMessages() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])
        } catch (err) {
            console.error('Error loading messages:', err)
        } finally {
            setLoading(false)
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    async function handleSendMessage(e) {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: newMessage.trim()
                })

            if (error) throw error
            setNewMessage('')

            // Update last message in conversation
            await supabase
                .from('chat_conversations')
                .update({
                    last_message: newMessage.trim(),
                    last_message_at: new Date().toISOString()
                })
                .eq('id', conversationId)

        } catch (err) {
            console.error('Error sending message:', err)
        } finally {
            setSending(false)
        }
    }

    if (!conversationId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-gray-600">Suas Mensagens</h3>
                <p className="text-sm">Selecione uma conversa para começar a bater papo.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center text-green font-bold">
                        {otherPartyName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{otherPartyName}</h3>
                        <p className="text-xs text-green flex items-center gap-1">
                            <span className="w-2 h-2 bg-green rounded-full animate-pulse"></span>
                            Online agora
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-green animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">Nenhuma mensagem ainda. Comece a conversa!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender_id === user.id
                                        ? 'bg-green text-white rounded-br-none'
                                        : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <div
                                    className={`text-[10px] mt-1 flex items-center gap-1 ${msg.sender_id === user.id ? 'text-white/70' : 'text-gray-400'
                                        }`}
                                >
                                    <Clock className="w-3 h-3" />
                                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <Image className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escreva sua mensagem..."
                        className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-green hover:bg-green-dark text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    )
}
