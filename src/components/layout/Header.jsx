import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, X, User, LogOut, LayoutDashboard, MessageSquare, Sparkles, Bell } from 'lucide-react'
import UserOnboarding from '../UserOnboarding'
import { useUnreadCount, requestNotificationPermission } from '../../hooks/useNotifications'

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user, profile, signOut, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const { unreadCount } = useUnreadCount(user)

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission()
        if (granted) {
            alert('Notificações ativadas! Você será avisado quando receber mensagens.')
        } else {
            alert('Para receber notificações, permita nas configurações do navegador.')
        }
    }

    async function handleSignOut() {
        try {
            await signOut()
            setDropdownOpen(false)
            setMobileOpen(false)
            navigate('/', { replace: true })
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
                    <Link to="/" className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#39FF14]" />
                        <span className="text-2xl font-black text-white">
                            Limp<span className="text-green">Flix</span>
                        </span>
                    </Link>

                    {/* Desktop */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/" className="text-white/80 hover:text-white text-sm">Início</Link>
                        <Link to="/servicos" className="text-white/80 hover:text-white text-sm">Serviços</Link>
                        <Link to="/profissionais" className="text-white/80 hover:text-white text-sm">Profissionais</Link>
                        <Link to="/perguntas-frequentes" className="text-white/80 hover:text-white text-sm">Perguntas Frequentes</Link>

                        <Link
                            to="/cadastro-profissional"
                            className="bg-green text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            Seja um Profissional
                        </Link>

                        {isAuthenticated ? (
                            <>
                                {/* DASHBOARD VISÍVEL */}
                                <button
                                    onClick={() => navigate(profile?.role === 'provider' ? '/dashboard' : '/cliente/dashboard')}
                                    className="bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
                                >
                                    Meu Painel
                                </button>

                                {/* MENU USUÁRIO */}
                                <div className="relative">
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-2 text-white"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>{profile?.full_name || user.email}</span>
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2">

                                            <Link
                                                to={profile?.role === 'provider' ? '/dashboard' : '/cliente/dashboard'}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                Meu Painel
                                            </Link>

                                            <Link
                                                to={profile?.role === 'provider' ? '/dashboard?tab=messages' : '/cliente/dashboard'}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 relative"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Mensagens
                                                {unreadCount > 0 && (
                                                    <span className="absolute left-6 top-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                )}
                                            </Link>
                                            <button
                                                onClick={handleEnableNotifications}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                                            >
                                                <Bell className="w-4 h-4" />
                                                Ativar Notificações
                                            </button>

                                            {profile?.role === 'admin' && (
                                                <Link
                                                    to="/admin"
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600"
                                                >
                                                    Painel Admin
                                                </Link>
                                            )}

                                            <button
                                                onClick={handleSignOut}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sair
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* LOGIN CORRETO */}
                                <button
                                    onClick={() => navigate('/login')}
                                    className="bg-green text-white px-4 py-2 rounded-lg text-sm font-bold"
                                >
                                    Login
                                </button>

                                {/* ONBOARDING OPCIONAL */}
                                <button
                                    onClick={() => setShowOnboarding(true)}
                                    className="text-white/70 text-sm"
                                >
                                    Como funciona
                                </button>
                            </>
                        )}
                    </nav>

                    {/* Mobile */}
                    <div className="md:hidden flex items-center gap-2">
                        {!isAuthenticated && (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-green text-white px-3 py-1 rounded text-xs"
                            >
                                Login
                            </button>
                        )}

                        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white">
                            {mobileOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="md:hidden mt-4 pb-6 space-y-1 animate-fade-in border-t border-white/10 pt-4">
                        <Link 
                            to="/" 
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Início
                        </Link>
                        <Link 
                            to="/servicos" 
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Serviços
                        </Link>
                        <Link 
                            to="/profissionais" 
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Profissionais
                        </Link>
                        <Link 
                            to="/perguntas-frequentes" 
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
                        >
                            Perguntas Frequentes
                        </Link>

                        {isAuthenticated ? (
                            <div className="mt-4 pt-4 border-t border-white/10 space-y-2 px-4">
                                <button 
                                    onClick={() => {
                                        navigate(profile?.role === 'provider' ? '/dashboard' : '/cliente/dashboard')
                                        setMobileOpen(false)
                                    }}
                                    className="w-full bg-green text-white py-3 rounded-xl font-bold shadow-lg"
                                >
                                    Meu Painel
                                </button>
                                <button 
                                    onClick={handleSignOut} 
                                    className="w-full text-red-400 font-bold py-3 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    Sair
                                </button>
                            </div>
                        ) : (
                            <div className="px-4 mt-6">
                                <button 
                                    onClick={() => {
                                        navigate('/login')
                                        setMobileOpen(false)
                                    }} 
                                    className="w-full bg-green text-white py-3 rounded-xl font-bold shadow-lg"
                                >
                                    Login / Criar Conta
                                </button>
                            </div>
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