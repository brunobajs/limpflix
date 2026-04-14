import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Verificar se estamos em uma sessão de recuperação de senha
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Se não houver sessão, talvez o link expirou ou é inválido
                // O Supabase lida com isso automaticamente ao colocar o token na URL, 
                // mas podemos redirecionar se o usuário tentar acessar a página direto.
            }
        }
        checkSession()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        if (password !== confirmPassword) {
            return setError('As senhas não coincidem.')
        }
        if (password.length < 6) {
            return setError('A senha deve ter pelo menos 6 caracteres.')
        }

        setLoading(true)
        setError('')

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError
            setSuccess(true)
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.message || 'Erro ao atualizar a senha. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
                    <p className="text-gray-500 mb-6">Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes.</p>
                    <Link to="/login" className="text-green font-bold hover:underline">Ir para o login agora</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-green" />
                        <span className="text-3xl font-bold text-white">
                            Limp<span className="text-green">Flix</span>
                        </span>
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Redefinir senha</h2>
                        <p className="text-gray-500 text-sm">Crie uma nova senha para sua conta.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="No mínimo 6 caracteres"
                                    required
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green focus:border-transparent transition-all text-gray-800"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a senha"
                                    required
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green focus:border-transparent transition-all text-gray-800"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-green/25"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
