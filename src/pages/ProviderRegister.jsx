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
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${folder}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('providers-media')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('providers-media')
                .getPublicUrl(filePath)

            return data.publicUrl
        } catch (err) {
            console.error('Upload error:', err)
            throw new Error(`Erro ao enviar imagem: ${err.message}`)
        }
    }

    async function handleSubmit() {
        setError('')
        setLoading(true)
        setRegistrationStatus('Iniciando...')
        window.alert('PASSO 1: Início (Survival Mode)')

        try {
            // 1. Identificar Usuário
            let userId = user?.id
            window.alert(`PASSO 1.1: ID Atual: ${userId || 'Nenhum'}`)

            if (!userId) {
                window.alert('PASSO 1.2: Tentando Criar Conta (signUp)...')
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: { data: { full_name: form.responsible_name } }
                })

                if (signUpError) {
                    window.alert(`ERRO no signUp: ${signUpError.message}`)
                    throw signUpError
                }
                userId = signUpData?.user?.id
                window.alert(`PASSO 1.3: Conta Criada ID: ${userId}`)

                if (!userId) {
                    window.alert('PASSO 1.4: Usuário pendente, buscando sessão...')
                    const { data: sData } = await supabase.auth.getSession()
                    userId = sData?.session?.user?.id
                }
            }

            if (!userId) throw new Error('Não foi possível obter um ID de usuário.')

            // 2. Coordenadas (COM TIMEOUT SEVERO)
            window.alert('PASSO 2: Buscando localização (Timeout 3s)...')
            let coords = { latitude: -23.5505, longitude: -46.6333 }
            try {
                coords = await getCoordinates()
                window.alert('PASSO 2.1: Localização OK')
            } catch (gErr) {
                window.alert('PASSO 2.2: Erro no GPS (ignorando): ' + gErr.message)
            }

            // 3. Uploads (UM POR UM COM ALERTA)
            window.alert('PASSO 3: Enviando Imagens...')
            let profileUrl = form.profile_image
            let logoUrl = form.logo_image
            let portfolioUrls = []

            try {
                if (form.profile_image instanceof File) {
                    window.alert('PASSO 3.1: Enviando Foto Perfil...')
                    profileUrl = await uploadMedia(form.profile_image, 'profiles')
                    window.alert('PASSO 3.1: OK')
                }
                if (form.logo_image instanceof File) {
                    window.alert('PASSO 3.2: Enviando Logo...')
                    logoUrl = await uploadMedia(form.logo_image, 'logos')
                    window.alert('PASSO 3.2: OK')
                }
                if (form.portfolio_images.length > 0) {
                    window.alert(`PASSO 3.3: Enviando ${form.portfolio_images.length} fotos portfólio...`)
                    for (const img of form.portfolio_images) {
                        if (img instanceof File) {
                            const url = await uploadMedia(img, 'portfolio')
                            portfolioUrls.push(url)
                        } else {
                            portfolioUrls.push(img)
                        }
                    }
                    window.alert('PASSO 3.3: OK')
                }
            } catch (uErr) {
                window.alert('ERRO no Upload (ignorando para salvar dados): ' + uErr.message)
            }

            // 4. Salvar no Banco (FINAL)
            window.alert('PASSO 4: Salvando no Banco de Dados...')
            const newReferralCode = generateReferralCode(form.legal_name || form.responsible_name)

            // Perfil
            const { error: pErr } = await supabase.from('profiles').upsert({
                id: userId,
                full_name: form.responsible_name,
                role: 'provider'
            })
            if (pErr) window.alert('Erro Perfil: ' + pErr.message)

            // Prestador
            window.alert('PASSO 4.1: Upsert service_providers...')
            const { error: spErr } = await supabase.from('service_providers').upsert({
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
                profile_image: typeof profileUrl === 'string' ? profileUrl : null,
                logo_image: typeof logoUrl === 'string' ? logoUrl : null,
                portfolio_images: portfolioUrls,
                pix_key: form.pix_key,
                referral_code: newReferralCode,
                status: 'approved'
            }, { onConflict: 'user_id' })

            if (spErr) {
                window.alert('ERRO DATABASE: ' + spErr.message)
                throw spErr
            }

            window.alert('PASSO 5: SUCESSO! Finalizando...')
            if (refreshProfile) await refreshProfile()
            navigate('/dashboard?welcome=true')

        } catch (err) {
            let userMessage = 'Falha crítica no cadastro: ' + err.message
            // Erro específico de "Foreign Key" sugere sessão fantasma
            if (err.message?.includes('foreign key constraint') && err.message?.includes('user_id')) {
                userMessage = 'Erro de sincronização de conta. Por favor, saia da conta atual (Logout) e tente novamente em uma janela anônima.'
                // Opcional: Forçar logout técnico para limpar a sessão fantasma
                supabase.auth.signOut().then(() => console.log("Sessão limpa após erro de FK"))
            }

            setError(userMessage)
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
            case 5:
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
        if (step < 5) setStep(step + 1)
        else handleSubmit()
    }

    const steps = [
        { num: 1, label: 'Empresa', icon: Building2 },
        { num: 2, label: 'Contato', icon: User },
        { num: 3, label: 'Serviços', icon: Wrench },
        { num: 4, label: 'Fotos', icon: Camera },
        { num: 5, label: 'Pagamento', icon: CreditCard },
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
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Cadastre-se como Profissional
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

                    {/* Step 4 - Media */}
                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Fotos e Portfólio</h2>
                            <p className="text-gray-500 text-sm mb-6">Destaque seu perfil com imagens reais (Opcional)</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Profile Photo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                                            {form.profile_image ? (
                                                <img src={typeof form.profile_image === 'string' ? form.profile_image : URL.createObjectURL(form.profile_image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-8 h-8 text-gray-400" />
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id="profile-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => updateForm('profile_image', e.target.files[0])}
                                        />
                                        <label htmlFor="profile-upload" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                                            Alterar
                                        </label>
                                    </div>
                                </div>

                                {/* Logo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logotipo da Empresa</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                                            {form.logo_image ? (
                                                <img src={typeof form.logo_image === 'string' ? form.logo_image : URL.createObjectURL(form.logo_image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-gray-400" />
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id="logo-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => updateForm('logo_image', e.target.files[0])}
                                        />
                                        <label htmlFor="logo-upload" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                                            Alterar
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Portfolio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Portfólio (Fotos de outros trabalhos)</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {form.portfolio_images.map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-gray-100 rounded-xl relative group overflow-hidden">
                                            <img src={typeof img === 'string' ? img : URL.createObjectURL(img)} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setForm(prev => ({ ...prev, portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx) }))}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        type="file"
                                        id="portfolio-upload"
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files)
                                            setForm(prev => ({ ...prev, portfolio_images: [...prev.portfolio_images, ...files] }))
                                        }}
                                    />
                                    <label htmlFor="portfolio-upload" className="aspect-square bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1">
                                        <Plus className="w-6 h-6 text-gray-400" />
                                        <span className="text-[10px] text-gray-500 font-medium">Adicionar</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5 - Payment */}
                    {step === 5 && (
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
                            ) : step === 5 ? (
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
