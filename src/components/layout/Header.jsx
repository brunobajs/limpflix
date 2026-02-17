import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, X, User, LogOut, LayoutDashboard, MessageSquare, Sparkles } from 'lucide-react'

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const { user, profile, signOut, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)

    async function handleSignOut() {
        await signOut()
        navigate('/')
    }

    return (
        <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-md shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-1 group relative">
                        <div className="relative flex items-center">
                            <span className="text-3xl font-bold text-white tracking-tighter">
                                L
                            </span>
                            <Sparkles className="w-4 h-4 text-[#39FF14] drop-shadow-[0_0_5px_#39FF14] ml-0.5" />
                        </div>
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
                            <Link
                                to="/login"
                                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                            >
                                Entrar
                            </Link>
                        )}
                    </nav>

                    {/* Mobile button */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden text-white p-2"
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden pb-4 space-y-2 animate-fade-in">
                        <Link to="/" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm">
                            Início
                        </Link>
                        <Link to="/servicos" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm">
                            Serviços
                        </Link>
                        <Link to="/profissionais" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm">
                            Profissionais
                        </Link>
                        <Link
                            to="/cadastro-profissional"
                            onClick={() => setMobileOpen(false)}
                            className="block bg-green hover:bg-green-dark text-white px-4 py-2 rounded-lg text-sm font-semibold text-center"
                        >
                            Seja um Profissional
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm">
                                    Dashboard
                                </Link>
                                <button onClick={() => { handleSignOut(); setMobileOpen(false) }} className="block text-red-400 hover:text-red-300 py-2 text-sm w-full text-left">
                                    Sair
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-white/80 hover:text-white py-2 text-sm">
                                Entrar
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </header>
    )
}
