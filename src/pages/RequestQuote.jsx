import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCurrentPosition, sortByDistance } from '../lib/geo'
import {
    MapPin, Camera, FileVideo, AlertCircle, Loader2,
    CheckCircle2, ChevronRight, ChevronLeft, Search
} from 'lucide-react'

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
            // 1. Upload Media (Mock function for now as buckets might not exist)
            const mediaUrls = await mockUploadFiles(mediaFiles)

            // 2. Create Quote Request
            const { data: quoteRequest, error: quoteError } = await supabase
                .from('quote_requests')
                .insert({
                    client_id: (await supabase.auth.getUser()).data.user?.id,
                    service_category_id: serviceId,
                    description,
                    media_urls: mediaUrls,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    address,
                    status: 'open'
                })
                .select()
                .single()

            if (quoteError) throw quoteError

            // 3. Find 3 Nearest Providers
            const { data: providers } = await supabase
                .from('service_providers')
                .select('*')
                .eq('status', 'approved')
                .eq('is_busy', false) // Rule: Must not be busy

            // Filter by service (simplified check, ideal would be DB array contains)
            // For now assuming providers offer all or we check array in code
            const serviceName = services.find(s => s.id === serviceId)?.name
            const eligible = providers.filter(p => !p.services_offered || p.services_offered.includes(serviceName))

            const sorted = sortByDistance(eligible, location.latitude, location.longitude)
            const top3 = sorted.slice(0, 3)

            if (top3.length === 0) {
                throw new Error('Nenhum profissional disponível próximo a você para este serviço.')
            }

            // 4. Create Chats
            const user = (await supabase.auth.getUser()).data.user
            for (const provider of top3) {
                const { data: chat } = await supabase
                    .from('chat_conversations')
                    .insert({
                        client_id: user.id,
                        provider_id: provider.id,
                        quote_request_id: quoteRequest.id,
                        status: 'active'
                    })
                    .select()
                    .single()

                // Insert Initial Message
                await supabase.from('chat_messages').insert({
                    conversation_id: chat.id,
                    sender_id: user.id,
                    content: `Olá! Gostaria de um orçamento.\n\nDescrição: ${description}\n\nMídias: ${mediaUrls.length} arquivo(s) anexado(s).`
                })
            }

            navigate('/cliente/dashboard')

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
                                if (serviceId && location) setStep(2)
                                else alert('Preencha os campos obrigatórios')
                            }}
                            className="bg-green text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-dark transition-colors"
                        >
                            Próximo <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
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
                            <p className="text-sm text-gray-500">Toque para adicionar mídia</p>
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
    )
}
