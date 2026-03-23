import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Star, CreditCard, MessageCircle, User, CheckCircle2, Clock, Send, ArrowRight, ArrowLeft, Shield, X, Plus, Trash2, FileText } from 'lucide-react'
import React from 'react'
class LocalErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null } }
    static getDerivedStateFromError(error) { return { hasError: true, error } }
    componentDidCatch(error, errorInfo) { console.error("Dashboard crash:", error, errorInfo) }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-800 rounded-2xl m-4">
                    <h2 className="font-bold mb-2">Ops! Algo deu errado.</h2>
                    <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Recarregar</button>
                </div>
            )
        }
        return this.props.children
    }
}
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export default function ClientDashboard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [showWelcome, setShowWelcome] = useState(searchParams.get('welcome') === 'true')
    const [chats, setChats] = useState([])
    const [selectedChat, setSelectedChat] = useState(null)
    const [activeBooking, setActiveBooking] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [activeQuote, setActiveQuote] = useState(null)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewText, setReviewText] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)
    const [pendingQuotes, setPendingQuotes] = useState([])
    const [profileName, setProfileName] = useState('')
    const messagesEndRef = useRef(null)

    useEffect(() => { if (!authLoading) { checkUser() } }, [authLoading, user])

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id)
            const channel = supabase
                .channel(`client-chat:${selectedChat.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedChat.id}` },
                    (payload) => { setMessages(prev => [...prev, payload.new]); scrollToBottom() })
                .subscribe()
            return () => supabase.removeChannel(channel)
        }
    }, [selectedChat])

    async function checkUser() {
        if (!user) { navigate('/login'); return }
        loadChats(user.id)
        loadPendingQuotes(user.id)
        loadProfileName(user.id)
    }

    async function loadProfileName(userId) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
        if (data) setProfileName(data.full_name)
    }

    async function loadPendingQuotes(userId) {
        const { data } = await supabase
            .from('service_quotes')
            .select('*, provider:service_providers(trade_name, responsible_name, profile_image)')
            .eq('client_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        setPendingQuotes(data || [])
    }

    function playNotificationSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, audioCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5)
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            osc.start()
            osc.stop(audioCtx.currentTime + 0.5)
        } catch (e) { console.error('Audio alert failed:', e) }
    }

    useEffect(() => {
        if (!user?.id) return
        const channel = supabase
            .channel(`client-notifs-${user.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages'
            }, (payload) => {
                if (payload.new.sender_id !== user.id) {
                    playNotificationSound()
                }
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [user?.id])

    async function loadChats(userId) {
        try {
            const { data, error } = await supabase
                .from('chat_conversations')
                .select('*, provider:service_providers(id, trade_name, responsible_name, profile_image)')
                .eq('client_id', userId)
                .eq('deleted_by_client', false)
                .order('last_message_at', { ascending: false })
            if (error) throw error
            setChats(data || [])
            setLoading(false)
        } catch (err) { console.error('Error loading chats:', err); setLoading(false) }
    }

    async function loadMessages(chatId) {
        const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', chatId).order('created_at', { ascending: true })
        setMessages(data || [])
        scrollToBottom()
        if (selectedChat) { checkActiveBooking(selectedChat.provider?.id); loadActiveQuote(chatId) }
    }

    async function loadActiveQuote(chatId) {
        const { data } = await supabase.from('service_quotes').select('*').eq('conversation_id', chatId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single()
        setActiveQuote(data)
    }

    async function checkActiveBooking(providerId) {
        if (!providerId) return
        const { data } = await supabase.from('service_bookings').select('*').eq('client_id', user.id).eq('provider_id', providerId).in('status', ['confirmed', 'in_progress', 'waiting_client_confirmation', 'completed']).order('created_at', { ascending: false }).limit(1).single()
        setActiveBooking(data)
    }

    async function confirmCompletion() {
        if (!activeBooking) return
        try {
            await supabase.from('service_bookings').update({ status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() }).eq('id', activeBooking.id)
            await supabase.from('service_providers').update({ is_busy: false }).eq('id', activeBooking.provider_id)
            if (selectedChat) {
                await supabase.from('chat_conversations').update({ status: 'completed' }).eq('id', selectedChat.id)
                loadChats(user.id)
            }
            checkActiveBooking(activeBooking.provider_id)
            setShowReviewModal(true)
        } catch (err) { console.error(err); alert('Erro ao confirmar serviço.') }
    }

    async function submitReview() {
        if (!activeBooking) return
        setSubmittingReview(true)
        try {
            await supabase.from('service_bookings').update({ rating: reviewRating, review: reviewText, updated_at: new Date().toISOString() }).eq('id', activeBooking.id)
            const { data: provider } = await supabase.from('service_providers').select('rating, total_reviews').eq('id', activeBooking.provider_id).single()
            if (provider) {
                const newTotalReviews = (provider.total_reviews || 0) + 1
                const newRating = ((provider.rating * provider.total_reviews) + reviewRating) / newTotalReviews
                await supabase.from('service_providers').update({ rating: newRating, total_reviews: newTotalReviews, total_services: (provider.total_services || 0) + 1 }).eq('id', activeBooking.provider_id)
            }
            alert('Avaliação enviada! Obrigado.')
            setShowReviewModal(false)
            checkActiveBooking(activeBooking.provider_id)
        } catch (err) { console.error(err); alert('Erro ao enviar avaliação.') }
        finally { setSubmittingReview(false) }
    }

    async function deleteChat(chatId) {
        if (!window.confirm('Tem certeza que deseja apagar esta conversa?')) return
        await supabase.from('chat_conversations').update({ deleted_by_client: true }).eq('id', chatId)
        setChats(prev => prev.filter(c => c.id !== chatId))
        if (selectedChat?.id === chatId) setSelectedChat(null)
    }

    function scrollToBottom() { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }

    async function sendMessage() {
        if (!newMessage.trim() || !selectedChat) return
        try {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
            await supabase.from('chat_messages').insert({
                conversation_id: selectedChat.id,
                sender_id: user.id,
                sender_name: profile?.full_name || 'Cliente',
                sender_type: 'client',
                message: newMessage.trim()
            })
            await supabase.from('chat_conversations').update({ last_message: newMessage.trim(), last_message_at: new Date().toISOString() }).eq('id', selectedChat.id)
            setNewMessage('')
            loadMessages(selectedChat.id)
        } catch (err) { console.error('Error sending message:', err) }
    }

    function handleHire() {
        if (!selectedChat) return
        const amount = activeQuote ? activeQuote.amount : 200.00
        const quoteId = activeQuote ? activeQuote.id : ''
        navigate(`/pagamento?quote_id=${selectedChat.quote_request_id || ''}&provider_id=${selectedChat.provider?.id}&chat_id=${selectedChat.id}&amount=${amount}&service_quote_id=${quoteId}`)
    }

    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-green animate-spin" /></div>)
    }

    return (
        <LocalErrorBoundary>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {pendingQuotes.length > 0 && (
                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between overflow-x-auto gap-4">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                            <span className="text-amber-900 font-bold text-sm">Você tem {pendingQuotes.length} orçamento(s) aguardando pagamento:</span>
                        </div>
                        <div className="flex gap-3">
                            {pendingQuotes.map(quote => (
                                <div key={quote.id} onClick={() => { const chat = chats.find(c => c.id === quote.conversation_id); if (chat) setSelectedChat(chat) }}
                                    className="bg-white px-4 py-2 rounded-xl shadow-sm border border-amber-200 flex items-center gap-3 cursor-pointer hover:scale-105 transition-all flex-shrink-0">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold leading-none">{quote.provider?.trade_name || 'Profissional'}</p>
                                        <p className="text-sm font-bold text-green">R$ {Number(quote.amount).toFixed(2)}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-amber-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-green" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Ola, {profileName || 'Cliente'}!</h1>
                            <p className="text-xs text-gray-500">Suas conversas e solicitacoes</p>
                        </div>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm mr-2"><ArrowLeft className="w-4 h-4" />Início</Link><Link to="/cliente/orcamentos" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm mr-2 border border-gray-200 px-3 py-2 rounded-xl"><FileText className="w-4 h-4" />Orçamentos</Link><Link to="/profissionais" className="bg-green text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-dark transition-colors">
                        <Plus className="w-4 h-4" />
                        Nova Solicitacao
                    </Link>
                </div>
                <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-80px)]">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-700">Minhas Conversas</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{chats.length} conversa(s)</p>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {chats.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center gap-4">
                                    <MessageCircle className="w-16 h-16 text-gray-200" />
                                    <div>
                                        <p className="font-bold text-gray-600 mb-1">Nenhuma conversa ainda</p>
                                        <p className="text-sm text-gray-400 mb-4">Solicite um orçamento para começar</p>
                                    </div>
                                    <Link to="/profissionais" className="bg-green text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-dark transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Solicitar Orçamento
                                    </Link>
                                </div>
                            ) : (
                                chats.map(chat => (
                                    <div key={chat.id} onClick={() => setSelectedChat(chat)}
                                        className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-green/5 border-l-4 border-l-green' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {chat.provider?.profile_image ? (
                                                    <img src={chat.provider.profile_image} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-bold text-green text-sm">{(chat.provider?.trade_name || chat.provider_name || 'P').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">
                                                        {chat.provider?.trade_name || chat.provider?.responsible_name || chat.provider_name || 'Profissional'}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                                        {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{chat.last_message || 'Orçamento solicitado'}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${chat.status === 'active' ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'}`}>
                                                    {chat.status === 'active' ? 'Ativo' : 'Encerrado'}
                                                {chat.status !== 'active' && (
                                                    <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }} className="text-red-400 hover:text-red-600 p-1 ml-1">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}

                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        {selectedChat ? (
                            <>
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                            {selectedChat.provider?.profile_image ? (
                                                <img src={selectedChat.provider.profile_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-green">{(selectedChat.provider?.trade_name || selectedChat.provider_name || 'P').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-gray-800">{selectedChat.provider?.trade_name || selectedChat.provider?.responsible_name || selectedChat.provider_name || 'Profissional'}</h2>
                                            <p className="text-xs text-green flex items-center gap-1"><span className="w-2 h-2 bg-green rounded-full animate-pulse"></span>Online agora</p>
                                        </div>
                                    </div>
                                    <div>
                                        {selectedChat.status === 'active' && !activeBooking && (
                                            <div className="flex items-center gap-2">
                                                {activeQuote ? (
                                                    <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-xl border border-green/20">
                                                        <div className="text-left">
                                                            <p className="text-[10px] text-gray-500 uppercase font-bold leading-none">Orçamento</p>
                                                            <p className="text-green font-bold text-sm">R$ {Number(activeQuote.amount).toFixed(2)}</p>
                                                        </div>
                                                        <button onClick={handleHire} className="bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-105 flex items-center gap-2">
                                                            <CreditCard className="w-3.5 h-3.5" />Pagar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={handleHire} className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" />Contratar
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm('Deseja encerrar esta conversa?')) {
                                                            await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', selectedChat.id)
                                                            loadChats(user.id)
                                                            setSelectedChat(prev => ({ ...prev, status: 'closed' }))
                                                        }
                                                    }}
                                                    className="bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 px-3 py-2 rounded-xl text-[10px] font-bold border border-gray-200 transition-all flex items-center gap-1"
                                                    title="Encerrar conversa para poder apagar"
                                                >
                                                    Desistir
                                                </button>
                                            </div>
                                        )}
                                        {activeBooking?.status === 'waiting_client_confirmation' && (
                                            <button onClick={confirmCompletion} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 flex items-center gap-2 animate-pulse">
                                                <CheckCircle2 className="w-4 h-4" />Confirmar Conclusao
                                            </button>
                                        )}
                                        {activeBooking?.status === 'confirmed' && (<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Agendado</span>)}
                                        {activeBooking?.status === 'in_progress' && (<span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3" />Em Execucao</span>)}
                                        {activeBooking?.status === 'completed' && (<span className="bg-green/10 text-green px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Servico Finalizado</span>)}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                            <MessageCircle className="w-12 h-12 opacity-20" />
                                            <p className="text-sm">Nenhuma mensagem ainda. Comece a conversa!</p>
                                        </div>
                                    ) : messages.map(msg => {
                                        const isMe = msg.sender_id === user.id
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${isMe ? 'bg-green text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                                                    {!isMe && msg.sender_name && (<p className="text-[10px] font-bold text-green mb-1">{msg.sender_name}</p>)}
                                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-white">
                                    <div className="flex gap-2">
                                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            disabled={selectedChat.status !== 'active'} placeholder={selectedChat.status === 'active' ? "Digite sua mensagem..." : "Esta conversa foi encerrada."}
                                            className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green disabled:opacity-50" />
                                        <button onClick={sendMessage} disabled={!newMessage.trim() || selectedChat.status !== 'active'}
                                            className="p-3 bg-green text-white rounded-xl hover:bg-green-dark disabled:opacity-50 disabled:bg-gray-300 transition-colors">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 gap-4">
                                <MessageCircle className="w-16 h-16 opacity-20" />
                                <div className="text-center">
                                    <p className="text-lg font-bold text-gray-600 mb-1">Selecione uma conversa</p>
                                    <p className="text-sm text-gray-400">Escolha um prestador ao lado para ver as mensagens</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {showReviewModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Avalie o Servico</h2>
                                <p className="text-sm text-gray-500">Sua opiniao e muito importante.</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none transform transition-transform hover:scale-110">
                                            <Star className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} placeholder="Como foi sua experiencia?" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green resize-none" />
                                <button onClick={submitReview} disabled={submittingReview} className="w-full bg-green hover:bg-green-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Avaliacao'}
                                </button>
                                <button onClick={() => setShowReviewModal(false)} className="w-full text-gray-400 text-sm font-medium hover:text-gray-600">Pular agora</button>
                            </div>
                        </div>
                    </div>
                )}
                {showWelcome && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
                            <div className="bg-navy p-8 text-center relative">
                                <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                                <div className="w-20 h-20 bg-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green/30">
                                    <Shield className="w-10 h-10 text-green" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Bem-vindo a LimpFlix!</h2>
                                <p className="text-green font-medium">Sua seguranca e nossa prioridade</p>
                            </div>
                            <div className="p-8">
                                <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                                    <p>Para sua protecao, realize todos os pagamentos exclusivamente atraves da nossa plataforma.</p>
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                                        <p className="text-blue-900 font-medium">Por que pagar pelo LimpFlix?</p>
                                        <p className="text-blue-800 text-xs mt-1">Isso assegura que voce receba o estorno caso o profissional nao realize o trabalho.</p>
                                    </div>
                                    <p className="text-xs border-t border-gray-100 pt-4 text-gray-400"><span className="font-bold text-red-500 uppercase">Atencao:</span> Pagamentos diretos com prestadores resultam na perda de garantias.</p>
                                </div>
                                <button onClick={() => setShowWelcome(false)} className="w-full mt-8 bg-green hover:bg-green-dark text-white py-4 rounded-2xl font-bold transition-all shadow-lg">Entendi e Aceito</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </LocalErrorBoundary>
    )
}









