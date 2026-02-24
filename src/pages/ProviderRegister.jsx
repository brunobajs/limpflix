import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentPosition } from '../lib/geo'
import {
    Building2, User, Wrench, CreditCard, Navigation,
    ChevronRight, ChevronLeft, CheckCircle2, Loader2,
    Phone, Mail, MapPin, ArrowLeft, Camera, Image, Plus, X
} from 'lucide-react'

const SERVICE_OPTIONS = [
    'Limpeza de Sofá', 'Limpeza de Colchão', 'Limpeza de Carpete',
    'Limpeza de Cortinas', 'Limpeza de Pisos', "Limpeza de Caixa d'Água",
    'Limpeza de Vidros', 'Limpeza de Fachada', 'Limpeza Pós-Obra',
    'Impermeabilização', 'Faxina Residencial'
]

const STATES = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

// Gera um código de indicação único baseado no nome + timestamp
function generateReferralCode(name) {
    const prefix = (name || 'LIMP')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4)
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 6)
    return `${prefix}${suffix}`
}

// Aplica máscara de CNPJ: 00.000.000/0000-00
function maskCNPJ(value) {
    return value
        .replace(/\D/g, '')
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.{1}(\d{3})\.(\d{3})(\d)/, '.$1.$2/$3')
        .replace(/(\d{4})(\d)/, '$1-$2')
}

// Valida dígitos verificadores do CNPJ
function isValidCNPJ(cnpj) {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return false
    if (/^(\d)\1+$/.test(digits)) return false // bloqueia CNPJs com todos dígitos iguais

    const calc = (d, n) => {
        let sum = 0
        let pos = n - 7
        for (let i = n; i >= 1; i--) {
            sum += parseInt(d[n - i]) * pos--
            if (pos < 2) pos = 9
        }
        return sum % 11 < 2 ? 0 : 11 - (sum % 11)
    }
    return calc(digits, 12) === parseInt(digits[12]) && calc(digits, 13) === parseInt(digits[13])
}

export default function ProviderRegister() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user, refreshProfile } = useAuth()
    const [registrationStatus, setRegistrationStatus] = useState('')
    const [debugLog, setDebugLog] = useState([]) // Logs de diagnóstico na tela

    const addLog = (msg) => {
        console.log(`[Diagnostic] ${msg}`)
        setDebugLog(prev => [...prev.slice(-3), msg]) // Mostra os últimos 4 logs
    }

    const [form, setForm] = useState({
        // Step 1 - Company
        legal_name: '',
        trade_name: '',
        cnpj: '',
        bio: '',
        // Step 2 - Contact
        responsible_name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: 'SP',
        // Auth
        password: '',
        // Step 3 - Services
        services_offered: [],
        // Step 4 - Media (NEW)
        profile_image: null,
        logo_image: null,
        portfolio_images: [],
        // Step 5 - Payment
        pix_key: '',
        // Referral
        referral_code_input: searchParams.get('ref') || '',
        // Location (NEW)
        latitude: null,
        longitude: null,
    })

    const [uploading, setUploading] = useState({
        profile: false,
        logo: false,
        portfolio: false
    })
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [geoLoading, setGeoLoading] = useState(false)

    async function handleCaptureLocation() {
        console.log("Solicitando permissão de localização...")
        setGeoLoading(true)
        try {
            const pos = await getCurrentPosition()
            console.log("Localização obtida:", pos)
            setForm(prev => ({
                ...prev,
                latitude: pos.latitude,
                longitude: pos.longitude
            }))
            alert('Localização capturada com sucesso! Precisão: ' + (pos.accuracy ? `~${Math.round(pos.accuracy)}m` : 'Alta'))
        } catch (err) {
            console.error('Capture location failed:', err)
            let msg = 'Não foi possível obter sua localização.'
            if (err.code === 1) msg = 'Permissão de localização negada pelo usuário.'
            if (err.code === 3) msg = 'Tempo esgotado ao buscar localização.'
            alert(msg + ' Verifique as permissões do seu navegador.')
        } finally {
            setGeoLoading(false)
        }
    }

    function updateForm(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function toggleService(service) {
        setForm(prev => ({
            ...prev,
            services_offered: prev.services_offered.includes(service)
                ? prev.services_offered.filter(s => s !== service)
                : [...prev.services_offered, service]
        }))
    }

    // Função par comprimir imagem no cliente (Canvas) com escape de 5s
    const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
        return new Promise((resolve) => {
            // Timeout de escape: se demorar demais, manda o original
            const escapeTimer = setTimeout(() => {
                console.warn("Compression escape triggered")
                resolve(file)
            }, 5000)

            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onerror = () => { clearTimeout(escapeTimer); resolve(file) }
            reader.onload = (event) => {
                const img = new Image()
                img.onerror = () => { clearTimeout(escapeTimer); resolve(file) }
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas')
                        let width = img.width
                        let height = img.height

                        if (width > maxWidth) {
                            height = (maxWidth / width) * height
                            width = maxWidth
                        }

                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')
                        if (!ctx) { clearTimeout(escapeTimer); resolve(file); return }
                        ctx.drawImage(img, 0, 0, width, height)

                        canvas.toBlob((blob) => {
                            clearTimeout(escapeTimer)
                            if (!blob) { resolve(file); return }
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(compressedFile)
                        }, 'image/jpeg', quality)
                    } catch (e) { clearTimeout(escapeTimer); resolve(file) }
                }
                img.src = event.target.result
            }
        })
    }

    async function getCoordinates() {
        console.log("Debug - Início getCoordinates")
        // Se já capturou manualmente, retorna elas
        if (form.latitude && form.longitude) {
            return { latitude: form.latitude, longitude: form.longitude }
        }

        const fallback = { latitude: -23.5505, longitude: -46.6333 }

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => {
                console.warn("Geocoding timeout - forcing fallback")
                controller.abort()
            }, 3000) // Reduzido para 3s para evitar demora excessiva

            const address = `${form.address}, ${form.city}, ${form.state}, Brasil`
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
                signal: controller.signal,
                headers: { 'User-Agent': 'LimpFlix-App' } // Nominatim exige User-Agent
            })
            clearTimeout(timeoutId)

            const data = await response.json()
            if (data && data.length > 0) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
            }
        } catch (err) {
            console.warn('Geocoding fail/timeout, using fallback:', err.message)
        }
        return fallback
    }

    async function uploadMedia(file, folder) {
        if (!file) return null

        try {
            // Tenta comprimir com escape de 5s
            const toUpload = (file instanceof File) ? await compressImage(file) : file

            const fileExt = (toUpload.name || 'img.jpg').split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${folder}/${fileName}`

            // Timeout de 20s para o upload no Supabase
            const uploadTask = supabase.storage
                .from('providers-media')
                .upload(filePath, toUpload)

            const timeoutPromise = new Promise((_, rej) =>
                setTimeout(() => rej(new Error('Link de upload expirou (20s)')), 20000)
            )

            const { error: uploadError } = await Promise.race([uploadTask, timeoutPromise])

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('providers-media')
                .getPublicUrl(filePath)

            return data.publicUrl
        } catch (err) {
            console.error('Upload process failed:', err)
            addLog(`Aviso: Falha no envio (${err.message}). Continuando...`)
            return null
        }
    }

    async function handleSubmit() {
        setError('')
        setLoading(true)
        setDebugLog([])
        addLog('Iniciando cadastro (Modo Diagnóstico)...')

        try {
            addLog('MODO ULTRA RAPIDO V4 ATIVO 🚀')

            // 1. Auth/User ID
            let userId = user?.id
            if (userId) addLog(`Usuário logado: ${userId.slice(0, 8)}...`)

            if (!userId) {
                addLog('Criando conta (Auth)...')
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: { data: { full_name: form.responsible_name } }
                })
                if (signUpError) {
                    addLog(`ERRO Auth: ${signUpError.message}`)
                    if (signUpError.message?.toLowerCase().includes('already')) {
                        throw new Error('E-mail em uso. Faça login antes ou use outro.')
                    }
                    throw signUpError
                }
                userId = signUpData?.user?.id
                addLog('Conta criada com sucesso.')
            }

            if (!userId) throw new Error('Falha ao obter ID do usuário.')

            // Pequeno delay para garantir que o Supabase processou o novo usuário
            addLog('Aguardando sincronia interna (1s)...')
            await new Promise(r => setTimeout(r, 1000))

            // 2. Localização (Timeout na função já existe)
            addLog('Buscando coordenadas...')
            const coords = await getCoordinates()
            addLog(`Localização OK (${coords.latitude.toFixed(2)})`)

            // 3. Salvar no Banco (SEM IMAGENS - Foco em Velocidade)
            addLog('Salvando dados no sistema...')
            const newReferralCode = generateReferralCode(form.legal_name || form.responsible_name)

            // Função helper para timeout no DB
            const dbRace = (promise) => Promise.race([
                promise,
                new Promise((_, rej) => setTimeout(() => rej(new Error('Sincronização lenta (Timeout 10s)')), 10000))
            ])

            addLog('Sincronizando perfil...')
            const profilePayload = {
                id: userId,
                full_name: form.responsible_name,
                role: 'provider'
            }
            addLog(`Payload Perfil: ${JSON.stringify(profilePayload).slice(0, 50)}...`)

            try {
                await dbRace(supabase.from('profiles').upsert(profilePayload))
                addLog('✓ Perfil sincronizado')
            } catch (err) {
                addLog(`Aviso Perfil: ${err.message}. Continuando...`)
            }

            addLog('Finalizando dados profissionais...')
            const { error: spErr } = await dbRace(supabase.from('service_providers').upsert({
                user_id: userId,
                legal_name: form.legal_name,
                trade_name: form.trade_name || form.legal_name,
                cnpj: form.cnpj,
                bio: form.bio,
                responsible_name: form.responsible_name,
                phone: form.phone,
                email: form.email,
                address: form.address,
                city: form.city,
                state: form.state,
                latitude: coords.latitude,
                longitude: coords.longitude,
                services_offered: form.services_offered,
                // Imagens removidas do cadastro inicial para evitar travamentos
                profile_image: null,
                logo_image: null,
                portfolio_images: [],
                pix_key: form.pix_key,
                referral_code: newReferralCode,
                status: 'approved'
            }, { onConflict: 'user_id' }))

            if (spErr) {
                addLog(`ERRO BANCO: ${spErr.message}`)
                throw spErr
            }

            addLog('Pronto! Redirecionando para o painel...')
            if (refreshProfile) await refreshProfile()
            navigate('/dashboard?welcome=true')

        } catch (err) {
            addLog(`FALHA: ${err.message}`)
            console.error('Registration failed:', err)
            setError(err.message || 'Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    function validateStep() {
        switch (step) {
            case 1:
                if (!form.legal_name.trim()) return 'Preencha a Razão Social / Nome'
                if (!form.cnpj.trim()) return 'Preencha o CNPJ (Obrigatório)'
                if (!isValidCNPJ(form.cnpj)) return 'CNPJ inválido. Verifique os números digitados.'
                return null
            case 2:
                if (!form.responsible_name.trim()) return 'Preencha o nome do responsável'
                if (!form.phone.trim()) return 'Preencha o telefone'
                if (!form.email.trim()) return 'Preencha o email'
                if (!form.city.trim()) return 'Preencha a cidade'
                if (!user && !form.password) return 'Crie uma senha (mínimo 6 caracteres)'
                if (!user && form.password.length < 6) return 'A senha deve ter pelo menos 6 caracteres'
                return null
            case 3:
                if (form.services_offered.length === 0) return 'Selecione pelo menos um serviço'
                return null
            case 4:
                if (!acceptedTerms) return 'Você precisa aceitar os Termos de Responsabilidade para finalizar o cadastro.'
                return null
            default:
                return null
        }
    }

    function nextStep() {
        const err = validateStep()
        if (err) {
            setError(err)
            return
        }
        setError('')
        if (step < 4) setStep(step + 1)
        else handleSubmit()
    }

    const steps = [
        { num: 1, label: 'Empresa', icon: Building2 },
        { num: 2, label: 'Contato', icon: User },
        { num: 3, label: 'Serviços', icon: Wrench },
        { num: 4, label: 'Finalizar', icon: CreditCard },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-br from-navy to-navy-light py-8">
                <div className="max-w-3xl mx-auto px-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        Cadastre-se como Profissional
                        <span className="text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-mono uppercase tracking-tighter">V4 - Turbo</span>
                    </h1>
                    <p className="text-white/60">
                        Preencha os dados abaixo para fazer parte da plataforma LimpFlix
                    </p>
                </div>
            </div>

            {/* Stepper */}
            <div className="max-w-3xl mx-auto px-4 -mt-4">
                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
                    {steps.map((s, i) => (
                        <div key={s.num} className="flex items-center">
                            <button
                                onClick={() => s.num < step && setStep(s.num)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step === s.num
                                    ? 'bg-green text-white shadow-md'
                                    : step > s.num
                                        ? 'bg-green/10 text-green cursor-pointer hover:bg-green/20'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {step > s.num ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    <s.icon className="w-5 h-5" />
                                )}
                                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                            </button>
                            {i < steps.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Diagnostic Console */}
                    {debugLog.length > 0 && (
                        <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 mb-6 font-mono text-xs">
                            <div className="text-navy/50 mb-2 uppercase text-[10px] tracking-wider font-bold italic">Console de Diagnóstico Vital:</div>
                            {debugLog.map((log, i) => (
                                <div key={i} className="flex gap-2 text-navy/80">
                                    <span className="text-navy/30">[{i + 1}]</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                            {loading && (
                                <div className="mt-2 flex items-center gap-2 text-green">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Processando etapa atual...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1 - Company */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Dados da Empresa</h2>
                            <p className="text-gray-500 text-sm mb-4">Informações sobre sua empresa ou negócio</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social / Nome *</label>
                                <input type="text" value={form.legal_name} onChange={(e) => updateForm('legal_name', e.target.value)}
                                    placeholder="Nome da empresa ou seu nome completo"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                                <input type="text" value={form.trade_name} onChange={(e) => updateForm('trade_name', e.target.value)}
                                    placeholder="Como sua empresa é conhecida"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
                                <input type="text" value={form.cnpj}
                                    onChange={(e) => updateForm('cnpj', maskCNPJ(e.target.value))}
                                    placeholder="00.000.000/0000-00"
                                    maxLength={18}
                                    required
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800 font-mono"
                                />
                                {form.cnpj.replace(/\D/g, '').length === 14 && (
                                    <p className={`text-xs mt-1 font-medium ${isValidCNPJ(form.cnpj) ? 'text-green' : 'text-red-500'}`}>
                                        {isValidCNPJ(form.cnpj) ? '✓ CNPJ válido' : '✗ CNPJ inválido'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do seu negócio</label>
                                <textarea value={form.bio} onChange={(e) => updateForm('bio', e.target.value)}
                                    placeholder="Fale um pouco sobre sua experiência e diferenciais..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2 - Contact */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Dados de Contato</h2>
                            <p className="text-gray-500 text-sm mb-4">Como os clientes vão encontrar você</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Responsável *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" value={form.responsible_name} onChange={(e) => updateForm('responsible_name', e.target.value)}
                                        placeholder="Seu nome completo"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input type="text" value={form.address} onChange={(e) => updateForm('address', e.target.value)}
                                            placeholder="Rua, número, bairro"
                                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCaptureLocation}
                                        disabled={geoLoading}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold transition-all shadow-sm ${form.latitude ? 'bg-green/10 border-green text-green' : 'bg-green hover:bg-green-dark text-white border-green'}`}
                                    >
                                        {geoLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Navigation className="w-5 h-5" />
                                        )}
                                        {form.latitude ? 'Localização Capturada' : 'Detectar meu GPS'}
                                    </button>
                                </div>
                                {form.latitude && (
                                    <p className="text-[10px] text-green mt-1 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="w-3 h-3" /> Coordenadas capturadas via GPS
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                                    <input type="text" value={form.city} onChange={(e) => updateForm('city', e.target.value)}
                                        placeholder="Sua cidade"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                                    <select value={form.state} onChange={(e) => updateForm('state', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                    >
                                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            {!user && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Criar senha de acesso *</label>
                                    <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        minLength={6}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3 - Services */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Serviços Oferecidos</h2>
                            <p className="text-gray-500 text-sm mb-4">Selecione os serviços que você oferece (mínimo 1)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SERVICE_OPTIONS.map(service => (
                                    <button
                                        key={service}
                                        type="button"
                                        onClick={() => toggleService(service)}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.services_offered.includes(service)
                                            ? 'border-green bg-green/5 text-green'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${form.services_offered.includes(service) ? 'bg-green border-green' : 'border-gray-300'
                                            }`}>
                                            {form.services_offered.includes(service) && (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">{service}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-gray-500 text-sm">
                                {form.services_offered.length} serviço(s) selecionado(s)
                            </p>
                        </div>
                    )}

                    {/* Step 4 - Payment */}
                    {step === 4 && (
                        <div className="space-y-5 animate-fade-in">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Dados de Pagamento</h2>
                            <p className="text-gray-500 text-sm mb-4">Informações para receber seus pagamentos</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                                <input type="text" value={form.pix_key} onChange={(e) => updateForm('pix_key', e.target.value)}
                                    placeholder="CPF, CNPJ, email ou chave aleatória"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Indicação (opcional)</label>
                                <input type="text" value={form.referral_code_input}
                                    onChange={(e) => updateForm('referral_code_input', e.target.value.toUpperCase())}
                                    placeholder="Se foi indicado, insira o código aqui"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800 uppercase"
                                />
                                <p className="text-gray-400 text-xs mt-1">Se alguém te indicou, insira o código para que ambos sejam beneficiados.</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 mt-6">
                                <h3 className="font-semibold text-gray-800 mb-3">Resumo do Cadastro</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Empresa:</span><span className="text-gray-800 font-medium">{form.trade_name || form.legal_name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Responsável:</span><span className="text-gray-800 font-medium">{form.responsible_name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Cidade:</span><span className="text-gray-800 font-medium">{form.city}, {form.state}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Serviços:</span><span className="text-gray-800 font-medium">{form.services_offered.length} selecionados</span></div>
                                </div>
                            </div>
                            {/* Termo de Responsabilidade */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                                <p className="text-amber-800 font-semibold text-sm mb-2">⚠️ Termo de Responsabilidade Civil</p>
                                <p className="text-amber-700 text-xs leading-relaxed mb-3">
                                    O prestador de serviço é o <strong>único e exclusivo responsável</strong> por quaisquer <strong>danos materiais, roubo, furto ou danos ao objeto do serviço</strong> ocorridos durante a prestação. A <strong>LimpFlix está expressamente isenta</strong> de qualquer ônus, responsabilidade civil, criminal ou administrativa decorrente dos atos do prestador.
                                </p>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 accent-green cursor-pointer flex-shrink-0"
                                    />
                                    <span className="text-xs text-amber-800 font-medium group-hover:text-amber-900">
                                        Li e aceito os{' '}
                                        <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline text-green hover:text-green-dark">
                                            Termos de Uso
                                        </a>{' '}
                                        e a cláusula de responsabilidade civil do prestador de serviço (Seção 7).
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Voltar
                            </button>
                        ) : (
                            <div />
                        )}
                        <button
                            onClick={nextStep}
                            disabled={loading}
                            className="flex flex-col items-center justify-center gap-1 bg-green hover:bg-green-dark text-white px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-green/25 min-w-[160px]"
                        >
                            {loading ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Processando...</span>
                                    </div>
                                    {registrationStatus && <span className="text-[10px] font-normal opacity-80">{registrationStatus}</span>}
                                </>
                            ) : step === 4 ? (
                                <div className="flex items-center gap-2">
                                    Finalizar Cadastro
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Próximo
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
