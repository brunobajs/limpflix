import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentPosition, sortByDistance } from '../lib/geo'
import {
    MapPin, Camera, FileVideo, AlertCircle, Loader2,
    CheckCircle2, ChevronRight, ChevronLeft, Search
} from 'lucide-react'
import React from 'react'

class LocalErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null } }
    static getDerivedStateFromError(error) { return { hasError: true, error } }
    componentDidCatch(error, errorInfo) { console.error("RequestQuote crash:", error, errorInfo) }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h2>
                        <p className="text-gray-500 mb-6 font-mono text-xs">{this.state.error?.message}</p>
                        <button onClick={() => window.location.reload()} className="w-full bg-green text-white px-4 py-3 rounded-xl font-bold">Recarregar Página</button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

// Steps:
// 1. Service & Location
// 2. Media & Description
// 3. Matching (Auto)

export default function RequestQuote() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Form Data
    const [serviceId, setServiceId] = useState('')
    const [location, setLocation] = useState(null)
    const [address, setAddress] = useState('')
    const [description, setDescription] = useState('')
    const [mediaFiles, setMediaFiles] = useState([])
    const [previewUrls, setPreviewUrls] = useState([])

    // Data Load
    const [services, setServices] = useState([])

    useEffect(() => {
        loadServices()
        // Try to get location automatically
        handleGeoLocation()
    }, [])

    async function loadServices() {
        const { data } = await supabase.from('service_categories').select('*').eq('is_active', true)
        if (data) setServices(data)

        // Pre-select if param exists
        const preSelectedSlug = searchParams.get('service')
        if (preSelectedSlug && data) {
            const found = data.find(s => s.slug === preSelectedSlug)
            if (found) setServiceId(found.id)
        }
    }

    async function handleGeoLocation() {
        try {
            const pos = await getCurrentPosition()
            setLocation(pos)
            // Reverse geocode would go here to get address string
            setAddress('Localização atual detectada')
        } catch (err) {
            console.log('Geo error', err)
        }
    }

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        if (files.length + mediaFiles.length > 5) {
            alert('Máximo de 5 arquivos permitidos')
            return
        }

        setMediaFiles([...mediaFiles, ...files])

        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setPreviewUrls([...previewUrls, ...newPreviews])
    }

    async function handleSubmit() {
        setLoading(true)
        setError(null)
        try {
            // 0. Verify User and Profile (Resilience)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado. Por favor, faça login novamente.')

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single()

            if (profileError || !profile) {
                console.log('Perfil não encontrado, criando fallback de cliente...')
                const { error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        full_name: user.user_metadata?.full_name || 'Cliente LimpFlix',
                        role: 'client'
                    })
                if (createError) throw new Error('Não foi possível configurar seu perfil de cliente. Por favor, limpe o cache e tente novamente.')
            }

            // 1. Upload Media to Supabase Storage
            const mediaUrls = []
            for (const file of mediaFiles) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `quotes/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('quote-images') 
                    .upload(filePath, file)

                if (!uploadError) {
                    const { data } = supabase.storage
                        .from('quote-images')
                        .getPublicUrl(filePath)
                    mediaUrls.push(data.publicUrl)
                }
            }

            // 2. Create Quote Request
            const { data: quoteRequest, error: quoteError } = await supabase
                .from('quote_requests')
                .insert({
                    client_id: user.id,
                    service_category_id: serviceId,
                    description,
                    media_urls: mediaUrls,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    address,
                    status: 'open',
                })
                .select()
                .single()

            if (quoteError) {
                if (quoteError.code === '23503') {
                    throw new Error('Erro de permissão: Seu perfil ainda não está totalmente ativo. Tente novamente em alguns segundos.')
                }
                throw quoteError
            }

            // 3. Find 3 Nearest Providers via Server-side RPC
            if (!location?.latitude || !location?.longitude) {
                throw new Error('Não foi possível obter sua localização. Por favor, ative o GPS ou digite seu endereço.')
            }

            const serviceName = services.find(s => s.id === serviceId)?.name || ''

            const { data: top3, error: rpcError } = await supabase.rpc('get_nearby_providers_top3', {
                p_lat: location.latitude,
                p_lng: location.longitude,
                p_service_name: serviceName
            })

            if (rpcError) throw rpcError

            if (!top3 || top3.length === 0) {
                throw new Error('Infelizmente não encontramos profissionais disponíveis nesta região para este serviço no momento.')
            }

            // 4. Create Chats with the Top 3
            const user = (await supabase.auth.getUser()).data.user
            const selectedIds = top3.map(p => p.id)
            
            // Link the selected providers to the request
            await supabase.from('quote_requests').update({ selected_provider_ids: selectedIds }).eq('id', quoteRequest.id)

            for (const provider of top3) {
                const { data: chat, error: chatError } = await supabase
                    .from('chat_conversations')
                    .insert({
                        client_id: user.id,
                        provider_id: provider.id,
                        quote_request_id: quoteRequest.id,
                        status: 'active'
                    })
                    .select()
                    .single()

                if (chatError) {
                    console.error('Error creating chat with provider:', provider.id, chatError)
                    continue
                }

                // Insert Initial Message
                await supabase.from('chat_messages').insert({
                    conversation_id: chat.id,
                    sender_id: user.id,
                    sender_type: 'client',
                    message: `Olá! Solicitei um orçamento para "${serviceName}".\n\nDescrição: ${description}\n\nLocalização: ${address}`
                })
            }

            navigate('/cliente/dashboard')
            // Refresh logic might be needed but navigate should trigger it in Dashboard
            console.log('Solicitação enviada e chats criados. Redirecionando...')

        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro ao processar solicitação')
        } finally {
            setLoading(false)
        }
    }

    // Mock upload - in real app, use supabase.storage
    async function mockUploadFiles(files) {
        // Return fake URLs or base64 (omitted for brevity)
        return files.map(f => `https://mock-storage.com/${f.name}`)
    }

    if (step === 1) {
        return (
            <LocalErrorBoundary>
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Solicitar Orçamento 1/2</h1>
                        <p className="text-gray-500 mb-6">O que você precisa hoje?</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                                <select
                                    value={serviceId}
                                    onChange={(e) => setServiceId(e.target.value)}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green focus:ring-green p-3 bg-gray-50"
                                >
                                    <option value="">Selecione...</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Endereço ou CEP"
                                        className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-green focus:ring-green p-3 bg-gray-50"
                                    />
                                    <button
                                        onClick={handleGeoLocation}
                                        className="p-3 bg-green/10 text-green rounded-xl hover:bg-green/20"
                                    >
                                        <MapPin className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => {
                                    if (serviceId && (location || address)) setStep(2)
                                    else alert('Preencha os campos obrigatórios')
                                }}
                                className="bg-green text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-dark transition-colors"
                            >
                                Próximo <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </LocalErrorBoundary>
        )
    }

    return (
        <LocalErrorBoundary>
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalhes 2/2</h1>
                    <p className="text-gray-500 mb-6">Envie fotos ou vídeos para ajudar.</p>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva o que precisa ser feito..."
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-green focus:ring-green p-3 bg-gray-50 h-32"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fotos/Vídeos</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Fotos para Orçamento</p>
                            </div>

                            {/* Previews */}
                            {previewUrls.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto py-2">
                                    {previewUrls.map((url, i) => (
                                        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="text-gray-500 px-6 py-3 font-semibold hover:text-gray-700"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            Solicitar Orçamento
                        </button>
                    </div>
                </div>
            </div>
        </LocalErrorBoundary>
    )
}

