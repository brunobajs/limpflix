import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, X, User, LogOut, LayoutDashboard, MessageSquare, Sparkles, Play } from 'lucide-react'
import UserOnboarding from '../UserOnboarding'

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user, profile, signOut, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)

    async function handleSignOut() {
        try {
            await signOut()
            setDropdownOpen(false)
            setMobileOpen(false)
            navigate('/', { replace: true })
            // window.location.reload() - Removido para evitar loop/conflito com o navigate
        } catch (err) {
            console.error("Logout error:", err)
            navigate('/login')
        }
    }

    return (
        <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-md shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group relative">
                        <Sparkles className="w-5 h-5 text-[#39FF14] drop-shadow-[0_0_5px_#39FF14]" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-white tracking-tighter leading-none">
                                Limp<span className="text-green">Flix</span>
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                            Início
                        </Link>
                        <Link to="/servicos" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                            Serviços
                        </Link>
                        <Link to="/profissionais" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                            Profissionais
                        </Link>
                        <Link
                            to="/cadastro-profissional"
                            className="bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 shadow-md"
                        >
                            Seja um Profissional
                        </Link>

                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                                >
                                    <div className="w-8 h-8 bg-green/20 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-green" />
                                    </div>
                                    <span className="text-sm">{profile?.full_name || user.email?.split('@')[0]}</span>
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                                        <Link
                                            to="/dashboard"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            Dashboard
                                        </Link>
                                        {profile?.role === 'admin' && (
                                            <Link
                                                to="/admin"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 font-bold"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                Painel Admin
                                            </Link>
                                        )}
                                        <Link
                                            to="/dashboard?tab=messages"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Mensagens
                                        </Link>
                                        <button
                                            onClick={() => { handleSignOut(); setDropdownOpen(false) }}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sair
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowOnboarding(true)}
                                className="relative overflow-hidden group bg-navy hover:bg-navy-light text-white px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg flex items-center gap-2 border border-white/10"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-green/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
                                <Play className="w-3 h-3 fill-current" />
                                Iniciar
                            </button>
                        )}
                    </nav>

                    {/* Mobile button */}
                    <div className="flex items-center gap-2 md:hidden">
                        {!isAuthenticated && (
                            <button
                                onClick={() => setShowOnboarding(true)}
                                className="bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all active:scale-95 shadow-lg flex items-center gap-1.5"
                            >
                                <Play className="w-3 h-3 fill-current" />
                                Iniciar
                            </button>
                        )}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="text-white p-2"
                        >
                            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden pb-4 space-y-2 animate-fade-in border-t border-white/5 mt-2 pt-4">
                        <Link to="/" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm font-medium">
                            Início
                        </Link>
                        <Link to="/servicos" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm font-medium">
                            Serviços
                        </Link>
                        <Link to="/profissionais" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm font-medium">
                            Profissionais
                        </Link>
                        <Link
                            to="/cadastro-profissional"
                            onClick={() => setMobileOpen(false)}
                            className="block bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium mb-2 border border-white/10"
                        >
                            Seja um Profissional
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <Link 
                                    to="/dashboard" 
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-2 text-white bg-green/10 p-4 rounded-2xl border border-green/20"
                                >
                                    <div className="w-10 h-10 bg-green/20 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-green" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">Meu Painel</span>
                                        <span className="text-[10px] text-green underline">Ver Dashboard</span>
                                    </div>
                                </Link>
                                <button onClick={() => { handleSignOut(); setMobileOpen(false) }} className="flex items-center gap-2 text-red-400 py-3 text-sm w-full text-left px-4">
                                    <LogOut className="w-4 h-4" />
                                    Sair da Conta
                                </button>
                            </>
                        ) : (
                            <Link 
                                to="/login" 
                                onClick={() => setMobileOpen(false)}
                                className="block text-center py-3 text-white/70 hover:text-white text-sm font-medium"
                            >
                                Já tenho conta (Entrar)
                            </Link>
                        )}
                    </div>
                )}
            </div>

            <UserOnboarding 
                isOpen={showOnboarding} 
                onClose={() => setShowOnboarding(false)}
                onStart={() => navigate('/profissionais')}
            />
        </header>
    )
}
