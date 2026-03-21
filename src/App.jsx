import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Services from './pages/Services'
import Professionals from './pages/Professionals'
import ProviderProfile from './pages/ProviderProfile'
import ProviderRegister from './pages/ProviderRegister'
import ProviderDashboard from './pages/ProviderDashboard'
import Login from './pages/Login'
import RequestQuote from './pages/RequestQuote'
import ClientDashboard from './pages/ClientDashboard'
import PaymentPage from './pages/PaymentPage'
import PaymentSuccess from './pages/PaymentSuccess'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import Terms from './pages/Terms'
import ClientQuotes from './pages/ClientQuotes'
import Privacy from './pages/Privacy'
import InstallPrompt from './components/InstallPrompt'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Protected Route Component for Admin
function AdminRoute({ children }) {
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setIsAdmin(profile?.role === 'admin')
            setLoading(false)
        }
        checkAdmin()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 text-green animate-spin border-4 border-green border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!isAdmin) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}

// ScrollToTop component
function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

// Layout wrapper for pages that need Header/Footer
function Layout({ children }) {
    return (
        <>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
        </>
    )
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <ScrollToTop />
                <Routes>
                    {/* Pages with Header/Footer */}
                    <Route path="/" element={<Layout><Home /></Layout>} />
                    <Route path="/servicos" element={<Layout><Services /></Layout>} />
                    <Route path="/profissionais" element={<Layout><Professionals /></Layout>} />
                    <Route path="/profissional/:id" element={<Layout><ProviderProfile /></Layout>} />

                    {/* Full-screen pages (no Header/Footer) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/cadastro-profissional" element={<ProviderRegister />} />
                    <Route path="/solicitar-orcamento" element={<Layout><RequestQuote /></Layout>} />
                    <Route path="/pagamento" element={<PaymentPage />} />
                    <Route path="/pagamento/sucesso" element={<PaymentSuccess />} />
                    <Route path="/cliente/dashboard" element={<ClientDashboard />} />
                    <Route path="/cliente/orcamentos" element={<ClientQuotes />} />
                    <Route path="/dashboard" element={<ProviderDashboard />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    } />
                    <Route path="/termos" element={<Layout><Terms /></Layout>} />
                    <Route path="/privacidade" element={<Layout><Privacy /></Layout>} />

                    {/* Fallback 404 */}
                    <Route path="*" element={
                        <Layout>
                            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                                <h1 className="text-4xl font-bold text-gray-300">404</h1>
                                <p className="text-gray-500">Página não encontrada</p>
                            </div>
                        </Layout>
                    } />
                </Routes>
                <InstallPrompt />
            </Router>
        </AuthProvider>
    )
}

export default App


