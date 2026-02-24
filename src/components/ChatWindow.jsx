import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Send, Image, Loader2, User, Clock, DollarSign, X, CheckCircle2 } from 'lucide-react'

export default function ChatWindow({ conversationId, otherPartyName }) {
    const { user } = useAuth()
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [isProvider, setIsProvider] = useState(false)
    const [providerData, setProviderData] = useState(null)
    const [clientData, setClientData] = useState(null)
    const [showQuoteModal, setShowQuoteModal] = useState(false)
    const [quoteAmount, setQuoteAmount] = useState('')
    const [quoteDescription, setQuoteDescription] = useState('')
    const [sendingQuote, setSendingQuote] = useState(false)
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

            // Marcar como lido
            // Primeiro, descobrir se o usuário atual é o cliente ou o prestador nesta conversa
            const { data: conv } = await supabase
                .from('chat_conversations')
                .select('client_id, provider_id, service_providers!inner(user_id)')
                .eq('id', conversationId)
                .single()

            if (conv) {
                const isProv = conv.service_providers.user_id === user.id
                setIsProvider(isProv)
                setProviderData({ id: conv.provider_id })
                setClientData({ id: conv.client_id })

                const updateData = isProv
                    ? { provider_last_read_at: new Date().toISOString() }
                    : { client_last_read_at: new Date().toISOString() }

                await supabase
                    .from('chat_conversations')
                    .update(updateData)
                    .eq('id', conversationId)
            }
        } catch (err) {
            console.error('Error loading messages:', err)
        } finally {
            setLoading(false)
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    async function handleSendQuote() {
        if (!quoteAmount || isNaN(quoteAmount) || parseFloat(quoteAmount) <= 0) {
            alert('Por favor, insira um valor válido.')
            return
        }

        setSendingQuote(true)
        try {
            // 1. Inserir na tabela de orçamentos
            const { data: quote, error: quoteError } = await supabase
                .from('service_quotes')
                .insert({
                    conversation_id: conversationId,
                    provider_id: providerData.id,
                    client_id: clientData.id,
                    amount: parseFloat(quoteAmount),
                    description: quoteDescription
                })
                .select()
                .single()

            if (quoteError) throw quoteError

            // 2. Enviar mensagem automática no chat
            const message = `📄 ORÇAMENTO ENVIADO\nValor: R$ ${parseFloat(quoteAmount).toFixed(2)}\n${quoteDescription ? `Descrição: ${quoteDescription}\n` : ''}\nPara aceitar e agendar, clique no botão que apareceu acima.`

            await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: message
            })

            // 3. Update last message
            await supabase
                .from('chat_conversations')
                .update({
                    last_message: '📄 Orçamento enviado',
                    last_message_at: new Date().toISOString()
                })
                .eq('id', conversationId)

            setShowQuoteModal(false)
            setQuoteAmount('')
            setQuoteDescription('')
            alert('Orçamento enviado com sucesso!')

        } catch (err) {
            console.error('Error sending quote:', err)
            alert('Erro ao enviar orçamento.')
        } finally {
            setSendingQuote(false)
        }
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
                {isProvider && (
                    <button
                        onClick={() => setShowQuoteModal(true)}
                        className="bg-navy hover:bg-navy-light text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <DollarSign className="w-3.5 h-3.5" />
                        Enviar Orçamento
                    </button>
                )}
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

            {/* Quote Modal */}
            {showQuoteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in relative">
                        <button
                            onClick={() => setShowQuoteModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <DollarSign className="w-6 h-6 text-navy" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Enviar Orçamento</h2>
                            <p className="text-xs text-gray-500">Defina o valor do serviço para o cliente:</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Valor do Serviço (R$)</label>
                                <input
                                    type="number"
                                    value={quoteAmount}
                                    onChange={(e) => setQuoteAmount(e.target.value)}
                                    placeholder="Ex: 150.00"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-navy text-lg font-bold"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">* Taxa de 5% da plataforma + 1% de indicação serão descontados do valor líquido.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Descrição Opcional</label>
                                <textarea
                                    value={quoteDescription}
                                    onChange={(e) => setQuoteDescription(e.target.value)}
                                    placeholder="O que está incluso?"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-navy text-sm resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSendQuote}
                                disabled={sendingQuote || !quoteAmount}
                                className="w-full bg-navy hover:bg-navy-light text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {sendingQuote ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Enviar Proposta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
