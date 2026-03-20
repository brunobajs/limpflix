import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, X, User, LogOut, LayoutDashboard, MessageSquare, Sparkles } from 'lucide-react'
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
                                    onClick={() => navigate('/dashboard')}
                                    className="bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-sm font-bold"
                                >
                                    Dashboard
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
                                                to="/dashboard"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                Dashboard
                                            </Link>

                                            <Link
                                                to="/dashboard?tab=messages"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Mensagens
                                            </Link>

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
                    <div className="md:hidden mt-2 space-y-2">
                        <Link to="/" onClick={() => setMobileOpen(false)}>Início</Link>
                        <Link to="/servicos" onClick={() => setMobileOpen(false)}>Serviços</Link>
                        <Link to="/profissionais" onClick={() => setMobileOpen(false)}>Profissionais</Link>

                        {isAuthenticated ? (
                            <>
                                <button onClick={() => navigate('/dashboard')}>Dashboard</button>
                                <button onClick={handleSignOut} className="text-red-500">Sair</button>
                            </>
                        ) : (
                            <button onClick={() => navigate('/login')}>Login</button>
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