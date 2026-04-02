import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Star, CreditCard, MessageCircle, User, CheckCircle2, Clock, Send, ArrowRight, ArrowLeft, Shield, X, Plus, Trash2, FileText, ClipboardList, CalendarDays } from 'lucide-react'
import ClientQuotesTab from '../components/ClientQuotesTab'
import { useUnreadCount, showNotification } from '../hooks/useNotifications'
import NotificationBanner from '../components/NotificationBanner'

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
    const [mobileView, setMobileView] = useState('list') // 'list' or 'chat'
    const [activeTab, setActiveTab] = useState('chats') // 'chats', 'quotes', 'bookings'

    useEffect(() => { if (!authLoading) { checkUser() } }, [authLoading, user])

    useEffect(() => {
        if (!authLoading) {
            const timer = setTimeout(() => {
                if (!user) {
                    navigate('/login')
                } else {
                    checkUser()
                }
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [authLoading, user])

    async function checkUser() {
        if (!user) return
        try {
            await Promise.all([
                loadChats(user.id),
                loadPendingQuotes(user.id),
                loadProfileName(user.id)
            ])
        } catch (err) {
            console.error("Erro no checkUser:", err)
        }
    }

    async function loadProfileName(userId) {
        try {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
            if (data) setProfileName(data.full_name)
        } catch (e) {}
    }

    async function loadPendingQuotes(userId) {
        try {
            const { data } = await supabase
                .from('service_quotes')
                .select('*, provider:service_providers(trade_name, responsible_name, profile_image)')
                .eq('client_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
            setPendingQuotes(data || [])
        } catch (e) {}
    }

    function playNotificationSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(880, audioCtx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5)
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
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
                if (payload.new && payload.new.sender_id !== user.id) {
                    playNotificationSound()
                    loadChats(user.id)
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
            
            if (error) {
                console.error('Supabase error loading chats:', error)
                return
            }
            setChats(data || [])
        } catch (err) { 
            console.error('Fatal error loading chats:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadMessages(chatId) {
        try {
            const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', chatId).order('created_at', { ascending: true })
            setMessages(data || [])
            setTimeout(scrollToBottom, 100)
            if (selectedChat) { 
                checkActiveBooking(selectedChat.provider?.id)
                loadActiveQuote(chatId) 
            }
        } catch (e) {}
    }

    async function loadActiveQuote(chatId) {
        try {
            const { data } = await supabase.from('service_quotes')
                .select('*')
                .eq('conversation_id', chatId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            setActiveQuote(data)
        } catch (e) {}
    }

    async function checkActiveBooking(providerId) {
        if (!providerId) return
        try {
            const { data } = await supabase.from('service_bookings')
                .select('*')
                .eq('client_id', user.id)
                .eq('provider_id', providerId)
                .in('status', ['confirmed', 'in_progress', 'waiting_client_confirmation', 'completed'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            setActiveBooking(data)
        } catch (e) {}
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
        try {
            await supabase.from('chat_conversations').update({ deleted_by_client: true }).eq('id', chatId)
            setChats(prev => prev.filter(c => c.id !== chatId))
            if (selectedChat?.id === chatId) {
                setSelectedChat(null)
                setMobileView('list')
            }
        } catch (e) {}
    }

    function scrollToBottom() { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }

    async function sendMessage() {
        if (!newMessage.trim() || !selectedChat) return
        try {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
            const { error: msgError } = await supabase.from('chat_messages').insert({
                conversation_id: selectedChat.id,
                sender_id: user.id,
                sender_name: profile?.full_name || 'Cliente',
                sender_type: 'client',
                message: newMessage.trim()
            })
            if (msgError) {
                console.error('Error inserting message:', msgError)
                alert('Erro ao enviar mensagem: ' + msgError.message)
                return
            }
            await supabase.from('chat_conversations').update({ last_message: newMessage.trim(), last_message_at: new Date().toISOString() }).eq('id', selectedChat.id)
            setNewMessage('')
            loadMessages(selectedChat.id)
            loadChats(user.id)
        } catch (err) { 
            console.error('Error sending message:', err)
            alert('Erro ao enviar mensagem')
        }
    }

    function handleHire(quoteParam) {
        const quote = quoteParam || activeQuote
        if (!quote) return
        
        const amount = quote.amount
        const quoteId = quote.id
        const chatId = quote.conversation_id || selectedChat?.id
        const providerId = quote.provider_id || selectedChat?.provider?.id
        
        // quoteId (from service_quotes) is passed as service_quote_id. 
        // quote_id (request ID) is only used if available from chat context
        const requestId = selectedChat?.quote_request_id || ''

        navigate(`/pagamento?quote_id=${requestId}&provider_id=${providerId}&chat_id=${chatId}&amount=${amount}&service_quote_id=${quoteId}`)
    }

    async function handleRejectQuote(quoteId) {
        if (!window.confirm('Tem certeza que deseja recusar este orçamento?')) return
        try {
            await supabase.from('service_quotes').update({ status: 'rejected' }).eq('id', quoteId)
            alert('Orçamento recusado.')
            if (activeQuote?.id === quoteId) setActiveQuote(null)
            loadPendingQuotes(user.id)
            if (selectedChat) loadMessages(selectedChat.id)
        } catch (err) {
            console.error(err)
            alert('Erro ao recusar orçamento.')
        }
    }

    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-green animate-spin" /></div>)
    }

    return (
        <LocalErrorBoundary>
            <NotificationBanner user={user} />
            <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
                {pendingQuotes.length > 0 && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-2 flex items-center justify-between overflow-x-auto gap-4 flex-shrink-0">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                            <span className="text-amber-900 font-bold text-[10px] md:text-sm">Orçamentos pendentes:</span>
                        </div>
                        <div className="flex gap-2">
                            {pendingQuotes.map(quote => (
                                <div key={quote.id} onClick={() => { 
                                    const chat = chats.find(c => c.id === quote.conversation_id); 
                                    if (chat) { setSelectedChat(chat); setMobileView('chat') } 
                                }}
                                    className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-amber-200 flex items-center gap-2 cursor-pointer hover:scale-105 transition-all flex-shrink-0">
                                    <p className="text-xs font-bold text-green">R$ {Number(quote.amount).toFixed(2)}</p>
                                    <ArrowRight className="w-3 h-3 text-amber-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-green/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 md:w-5 md:h-5 text-green" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm md:text-lg font-bold text-gray-800 truncate">Ola, {profileName.split(' ')[0] || 'Cliente'}!</h1>
                            <p className="text-[10px] md:text-xs text-gray-400">Meu Painel</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/" className="text-gray-400 hover:text-gray-600 p-2"><ArrowLeft className="w-5 h-5" /></Link>
                        <Link to="/profissionais" className="bg-green text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            <span className="hidden sm:inline">Novo</span>
                        </Link>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Barra Lateral com Abas */}
                    <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ${
                        mobileView === 'chat' && activeTab === 'chats' ? '-translate-x-full md:translate-x-0 hidden md:flex' : 'flex'
                    }`}>
                        {/* Seletor de Abas */}
                        <div className="flex border-b border-gray-100 p-1 bg-gray-50/50">
                            <button 
                                onClick={() => setActiveTab('chats')}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-white shadow-sm text-green' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <MessageCircle className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Conversas</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('quotes')}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'quotes' ? 'bg-white shadow-sm text-green' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <ClipboardList className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Orçamentos</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('bookings')}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${activeTab === 'bookings' ? 'bg-white shadow-sm text-green' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <CalendarDays className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Serviços</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'chats' && (
                                <div className="animate-fade-in">
                                    {chats.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center gap-4">
                                            <MessageCircle className="w-12 h-12 text-gray-100" />
                                            <p className="text-xs text-gray-400">Nenhuma conversa ativa.</p>
                                        </div>
                                    ) : (
                                        chats.map(chat => (
                                            <div key={chat.id} onClick={() => { setSelectedChat(chat); loadMessages(chat.id); setMobileView('chat'); setActiveTab('chats') }}
                                                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-green/5 border-l-4 border-l-green' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                                                        {chat.provider?.profile_image ? (
                                                            <img src={chat.provider.profile_image} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-green text-sm">{(chat.provider?.trade_name || chat.provider_name || 'P').charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-900 text-xs truncate">
                                                                {chat.provider?.trade_name || chat.provider?.responsible_name || chat.provider_name || 'Profissional'}
                                                            </h3>
                                                            <span className="text-[10px] text-gray-400 ml-2">
                                                                {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{chat.last_message || 'Orçamento solicitado'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'quotes' && (
                                <div className="p-4 animate-fade-in">
                                    <ClientQuotesTab 
                                        clientId={user.id} 
                                        onOpenChat={(chatId) => {
                                            const chat = chats.find(c => c.id === chatId);
                                            if (chat) setSelectedChat(chat);
                                            setActiveTab('chats');
                                            setMobileView('chat');
                                        }}
                                        onHire={handleHire}
                                    />
                                </div>
                            )}

                            {activeTab === 'bookings' && (
                                <div className="p-8 text-center flex flex-col items-center gap-4 animate-fade-in">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                                        <CalendarDays className="w-8 h-8 text-blue-200" />
                                    </div>
                                    <p className="text-xs text-gray-400">Seus agendamentos confirmados aparecerão aqui após o pagamento.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Janela de Chat */}
                    <div className={`flex-1 flex flex-col bg-white transition-all duration-300 ${
                        mobileView === 'list' ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'flex'
                    }`}>
                        {selectedChat ? (
                            <>
                                <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setMobileView('list')} className="md:hidden p-2 text-gray-400 hover:text-green">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                                            {selectedChat.provider?.profile_image ? (
                                                <img src={selectedChat.provider.profile_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-green text-sm">{(selectedChat.provider?.trade_name || selectedChat.provider_name || 'P').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="font-bold text-gray-800 text-sm truncate max-w-[120px] sm:max-w-none">
                                                {selectedChat.provider?.trade_name || selectedChat.provider_name || 'Profissional'}
                                            </h2>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green rounded-full"></span>
                                                <span className="text-[10px] text-green font-medium">Atendimento</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedChat.status === 'active' && (
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm('Deseja encerrar esta conversa?')) {
                                                        await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', selectedChat.id)
                                                        loadChats(user.id)
                                                        setSelectedChat(prev => ({ ...prev, status: 'closed' }))
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-gray-400 hover:text-red-500 px-2 py-1"
                                            >
                                                Encerrar
                                            </button>
                                        )}
                                        <button onClick={() => deleteChat(selectedChat.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {selectedChat.status === 'active' && (
                                    <div className="bg-gray-50 border-b border-gray-100 p-2 md:p-3">
                                        {!activeBooking ? (
                                            activeQuote ? (
                                                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-green/20 shadow-sm">
                                                    <div className="pl-2">
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase">Orçamento Recebido</p>
                                                        <p className="text-green font-extrabold text-sm">R$ {Number(activeQuote.amount).toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleRejectQuote(activeQuote.id)} 
                                                            className="text-gray-400 hover:text-red-500 px-2 py-1 text-[10px] font-bold"
                                                        >
                                                            Recusar
                                                        </button>
                                                        <button onClick={handleHire} className="bg-green text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md">
                                                            <CreditCard className="w-3.5 h-3.5" />Contratar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-1">
                                                    <p className="text-[10px] text-gray-400 italic">Aguardando orçamento do profissional...</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-xl border border-blue-100">
                                                <div className="flex items-center gap-2 pl-2">
                                                    <Shield className="w-4 h-4 text-blue-500" />
                                                    <span className="text-blue-900 text-xs font-bold">Servico em andamento</span>
                                                </div>
                                                {activeBooking.status === 'waiting_client_confirmation' && (
                                                    <button onClick={confirmCompletion} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                                                        Confirmar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === user.id
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-sm ${
                                                    isMe ? 'bg-green text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                }`}>
                                                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                    <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-3 border-t border-gray-100 bg-white pb-safe">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newMessage} 
                                            onChange={(e) => setNewMessage(e.target.value)} 
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Digite sua mensagem..."
                                            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green" 
                                        />
                                        <button 
                                            onClick={sendMessage} 
                                            disabled={!newMessage.trim() || selectedChat.status !== 'active'}
                                            className="p-2.5 bg-green text-white rounded-xl disabled:opacity-50 transition-transform active:scale-95"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8 gap-4">
                                <MessageCircle className="w-12 h-12 opacity-10" />
                                <p className="text-sm font-medium">Selecione uma conversa para começar</p>
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









