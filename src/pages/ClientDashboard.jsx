import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
    Loader2, Star
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function ClientDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const [chats, setChats] = useState([])
    const [selectedChat, setSelectedChat] = useState(null)
    const [activeBooking, setActiveBooking] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewText, setReviewText] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)
    const messagesEndRef = useRef(null)

    // Poll for messages in real-time (simplified)
    useEffect(() => {
        checkUser()
    }, [])

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id)
            const interval = setInterval(() => loadMessages(selectedChat.id), 3000)
            return () => clearInterval(interval)
        }
    }, [selectedChat])

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            navigate('/login')
            return
        }
        setUser(user)
        loadChats(user.id)
    }

    async function loadChats(userId) {
        try {
            const { data, error } = await supabase
                .from('chat_conversations')
                .select(`
                    *,
                    provider:service_providers(id, trade_name, responsible_name, profile_image)
                `)
                .eq('client_id', userId)
                .order('updated_at', { ascending: false })

            if (error) throw error
            setChats(data)
            setLoading(false)
        } catch (err) {
            console.error('Error loading chats:', err)
            setLoading(false)
        }
    }

    async function loadMessages(chatId) {
        const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', chatId)
            .order('created_at', { ascending: true })

        setMessages(data || [])
        scrollToBottom()

        if (selectedChat) {
            checkActiveBooking(selectedChat.provider.id)
        }
    }

    async function checkActiveBooking(providerId) {
        const { data } = await supabase
            .from('service_bookings')
            .select('*')
            .eq('client_id', user.id)
            .eq('provider_id', providerId)
            .in('status', ['confirmed', 'in_progress', 'waiting_client_confirmation', 'completed'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        setActiveBooking(data)
    }

    async function confirmCompletion() {
        if (!activeBooking) return
        try {
            const { error } = await supabase
                .from('service_bookings')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                })
                .eq('id', activeBooking.id)

            if (error) throw error

            await supabase
                .from('service_providers')
                .update({ is_busy: false })
                .eq('id', activeBooking.provider_id)

            checkActiveBooking(activeBooking.provider_id)
            setShowReviewModal(true) // Open review modal
        } catch (err) {
            console.error(err)
            alert('Erro ao confirmar serviço.')
        }
    }

    async function submitReview() {
        if (!activeBooking) return
        setSubmittingReview(true)
        try {
            // 1. Update Booking with rating/review
            const { error: bookingError } = await supabase
                .from('service_bookings')
                .update({
                    rating: reviewRating,
                    review: reviewText,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activeBooking.id)

            if (bookingError) throw bookingError

            // 2. Fetch current provider stats
            const { data: provider } = await supabase
                .from('service_providers')
                .select('rating, total_reviews')
                .eq('id', activeBooking.provider_id)
                .single()

            if (provider) {
                const newTotalReviews = (provider.total_reviews || 0) + 1
                const newRating = ((provider.rating * provider.total_reviews) + reviewRating) / newTotalReviews

                // 3. Update Provider stats
                await supabase
                    .from('service_providers')
                    .update({
                        rating: newRating,
                        total_reviews: newTotalReviews,
                        total_services: (provider.total_services || 0) + 1 // Assuming 1 service = 1 completed booking
                    })
                    .eq('id', activeBooking.provider_id)
            }

            alert('Avaliação enviada com sucesso! Obrigado.')
            setShowReviewModal(false)
            checkActiveBooking(activeBooking.provider_id)
        } catch (err) {
            console.error(err)
            alert('Erro ao enviar avaliação.')
        } finally {
            setSubmittingReview(false)
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    async function sendMessage() {
        if (!newMessage.trim() || !selectedChat) return

        try {
            await supabase.from('chat_messages').insert({
                conversation_id: selectedChat.id,
                sender_id: user.id,
                content: newMessage.trim()
            })
            setNewMessage('')
            loadMessages(selectedChat.id)
        } catch (err) {
            console.error('Error sending message:', err)
        }
    }

    function handleHire() {
        if (!selectedChat) return
        // No futuro, o preço pode ser extraído de uma proposta formal no BD.
        // Por enquanto, usaremos o padrão ou permitiremos que o cliente ajuste se necessário.
        const defaultAmount = 200.00
        navigate(`/pagamento?quote_id=${selectedChat.quote_request_id}&provider_id=${selectedChat.provider.id}&chat_id=${selectedChat.id}&amount=${defaultAmount}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-green animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-gray-400 bg-gray-100 rounded-full p-1.5" />
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">Minhas Solicitações</h1>
                        <p className="text-xs text-gray-500">Logado como client</p>
                    </div>
                </div>
                <Link to="/profissionais" className="text-green text-sm font-semibold hover:underline">
                    Nova Solicitação
                </Link>
            </div>

            <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-80px)]">

                {/* Chat List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-700">Conversas</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {chats.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Nenhuma conversa iniciada.</p>
                            </div>
                        ) : (
                            chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-green/5 border-l-4 border-l-green' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-900 line-clamp-1">
                                            {chat.provider?.trade_name || chat.provider?.responsible_name || 'Profissional'}
                                        </h3>
                                        <span className="text-xs text-gray-400">
                                            {new Date(chat.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className={`px-2 py-0.5 rounded-full ${chat.status === 'active' ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'}`}>
                                            {chat.status === 'active' ? 'Ativo' : chat.status === 'closed' ? 'Fechado' : 'Contratado'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                        {selectedChat.provider?.profile_image ? (
                                            <img src={selectedChat.provider.profile_image} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-800">
                                            {selectedChat.provider?.trade_name || 'Profissional'}
                                        </h2>
                                        <p className="text-xs text-green flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green rounded-full animate-pulse"></span>
                                            Online agora
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {selectedChat.status === 'active' && !activeBooking && (
                                        <button
                                            onClick={handleHire}
                                            className="bg-green hover:bg-green-dark text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Contratar
                                        </button>
                                    )}
                                    {activeBooking?.status === 'waiting_client_confirmation' && (
                                        <button
                                            onClick={confirmCompletion}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 flex items-center gap-2 animate-pulse"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Confirmar Conclusão
                                        </button>
                                    )}
                                    {activeBooking?.status === 'confirmed' && (
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                                            Agendado
                                        </span>
                                    )}
                                    {activeBooking?.status === 'in_progress' && (
                                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Em Execução
                                        </span>
                                    )}
                                    {activeBooking?.status === 'completed' && (
                                        <span className="bg-green/10 text-green px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Serviço Finalizado
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                                {messages.map(msg => {
                                    const isMe = msg.sender_id === user.id
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${isMe
                                                ? 'bg-green text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        disabled={selectedChat.status !== 'active'}
                                        placeholder={selectedChat.status === 'active' ? "Digite sua mensagem..." : "Esta conversa foi encerrada."}
                                        className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green disabled:opacity-50"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim() || selectedChat.status !== 'active'}
                                        className="p-3 bg-green text-white rounded-xl hover:bg-green-dark disabled:opacity-50 disabled:bg-gray-300 transition-colors"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecione uma conversa ao lado</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Avalie o Serviço</h2>
                            <p className="text-sm text-gray-500">Sua opinião é muito importante para nós e para o profissional.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setReviewRating(star)}
                                        className="focus:outline-none transform transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                        />
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Seu comentário (opcional)</label>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    rows={3}
                                    placeholder="Como foi sua experiência?"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green resize-none"
                                />
                            </div>

                            <button
                                onClick={submitReview}
                                disabled={submittingReview}
                                className="w-full bg-green hover:bg-green-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Avaliação'}
                            </button>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="w-full text-gray-400 text-sm font-medium hover:text-gray-600"
                            >
                                Pular agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
