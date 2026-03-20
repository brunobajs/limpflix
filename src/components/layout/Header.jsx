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
                        <Link to="/" className="text-white">Início</Link>
                        <Link to="/servicos" className="text-white">Serviços</Link>
                        <Link to="/profissionais" className="text-white">Profissionais</Link>

                        {isAuthenticated ? (
                            <div className="relative">
                                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="text-white">
                                    {profile?.full_name || user?.email}
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow">
                                        <Link to="/dashboard" className="block px-4 py-2">Dashboard</Link>
                                        <Link to="/dashboard?tab=messages" className="block px-4 py-2">Mensagens</Link>
                                        <button onClick={handleSignOut} className="block px-4 py-2 text-red-600 w-full text-left">
                                            Sair
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-green text-white px-4 py-2 rounded"
                            >
                                Login
                            </button>
                        )}
                    </nav>

                    {/* Mobile */}
                    <div className="md:hidden">
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white">
                            {mobileOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="md:hidden">
                        <Link to="/" onClick={() => setMobileOpen(false)}>Início</Link>
                        <Link to="/servicos" onClick={() => setMobileOpen(false)}>Serviços</Link>
                        <Link to="/profissionais" onClick={() => setMobileOpen(false)}>Profissionais</Link>

                        {!isAuthenticated && (
                            <button
                                onClick={() => navigate('/login')}
                                className="block mt-2 bg-green text-white px-4 py-2 rounded"
                            >
                                Login
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    )
}