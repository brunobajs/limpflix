import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react'

export default function AdminLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { signIn, profile } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { user } = await signIn(email, password)

            // Verificar se o usuário é admin
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profileError) throw profileError

            if (profileData?.role !== 'admin') {
                await supabase.auth.signOut()
                setError('Acesso negado: você não tem permissão de administrador.')
                setLoading(false)
                return
            }

            navigate('/admin')
        } catch (err) {
            setError(err.message.includes('Invalid login')
                ? 'Email ou senha incorretos.'
                : err.message || 'Ocorreu um erro. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                            <Shield className="w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Console</h1>
                    <p className="text-slate-400 text-sm">Acesso restrito a administradores</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Login Administrativo</h2>
                        <p className="text-gray-500 text-sm">Acesse o painel de controle</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@limpflix.com"
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-gray-800"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Sua senha"
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-gray-800"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="text-right mt-1">
                                <Link 
                                    to="/esqueci-senha" 
                                    className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                >
                                    Esqueci minha senha
                                </Link>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-blue-900/30"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Acessar Painel
                                    <Shield className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">
                            Voltar ao login comum
                        </Link>
                    </div>
                </div>

                {/* Security badge */}
                <div className="mt-6 text-center text-slate-500 text-xs">
                    <p>Ambiente seguro e criptografado</p>
                    <p className="mt-1">Acesso registrado e auditado</p>
                </div>
            </div>
        </div>
    )
}
