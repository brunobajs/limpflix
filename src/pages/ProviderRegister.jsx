import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Building2, User, Wrench, CreditCard,
    ChevronRight, ChevronLeft, CheckCircle2, Loader2,
    Phone, Mail, MapPin, ArrowLeft
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

export default function ProviderRegister() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user, signUp } = useAuth()

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
        // Step 4 - Payment
        pix_key: '',
        // Referral
        referral_code_input: searchParams.get('ref') || '',
    })

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
        try {
            const address = `${form.address}, ${form.city}, ${form.state}, Brasil`
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
            const data = await response.json()
            if (data.length > 0) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
            }
        } catch (err) {
            console.warn('Geocoding failed:', err)
        }
        return { latitude: null, longitude: null }
    }

    function generateReferralCode() {
        const prefix = (form.trade_name || form.responsible_name || 'LP')
            .replace(/\s+/g, '')
            .substring(0, 4)
            .toUpperCase()
        return `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    }

    async function handleSubmit() {
        setError('')
        setLoading(true)
        try {
            // 1. Create auth account if not logged in
            let userId = user?.id
            if (!userId) {
                const { data } = await signUp(form.email, form.password, form.responsible_name)
                userId = data?.user?.id
                if (!userId) {
                    setError('Conta criada! Verifique seu email para confirmar e tente novamente.')
                    setLoading(false)
                    return
                }
            }

            // 2. Get coordinates from address
            const coords = await getCoordinates()

            // 3. Find referrer if code provided
            let referrerId = null
            if (form.referral_code_input) {
                const { data: referrer } = await supabase
                    .from('service_providers')
                    .select('id')
                    .eq('referral_code', form.referral_code_input.toUpperCase())
                    .single()
                referrerId = referrer?.id || null
            }

            // 4. Save provider to Supabase
            const { error: insertError } = await supabase
                .from('service_providers')
                .insert({
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
                    pix_key: form.pix_key,
                    referral_code: generateReferralCode(),
                    referrer_id: referrerId,
                    status: 'approved', // Auto-approve for now
                })

            if (insertError) throw insertError

            // 5. Update referrer's count
            if (referrerId) {
                await supabase.rpc('increment_referrals', { provider_id: referrerId })
            }

            navigate('/dashboard?welcome=true')
        } catch (err) {
            console.error('Registration error:', err)
            setError(err.message || 'Erro ao cadastrar. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    function validateStep() {
        switch (step) {
            case 1:
                if (!form.legal_name.trim()) return 'Preencha a Razão Social / Nome'
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
        { num: 4, label: 'Pagamento', icon: CreditCard },
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ (opcional)</label>
                                <input type="text" value={form.cnpj} onChange={(e) => updateForm('cnpj', e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                />
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
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" value={form.address} onChange={(e) => updateForm('address', e.target.value)}
                                        placeholder="Rua, número, bairro"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green text-gray-800"
                                    />
                                </div>
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
                            className="flex items-center gap-2 bg-green hover:bg-green-dark text-white px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-green/25"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : step === 4 ? (
                                <>
                                    Finalizar Cadastro
                                    <CheckCircle2 className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    Próximo
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
