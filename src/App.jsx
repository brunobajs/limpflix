import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
import { useEffect } from 'react'

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
                    <Route path="/dashboard" element={<ProviderDashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />

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
            </Router>
        </AuthProvider>
    )
}

export default App
